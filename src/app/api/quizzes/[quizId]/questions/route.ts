
import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// This is a protected endpoint, likely for admin use
const verifyToken = (token: string): { userId: number } | null => {
    try {
        if (!process.env.JWT_SECRET) return null;
        return jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
    } catch (error) {
        return null;
    }
};

// GET all assigned questions for a specific quiz
export async function GET(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  try {
    const quizId = parseInt(params.quizId, 10);
    if (isNaN(quizId)) {
      return NextResponse.json({ error: 'Invalid Quiz ID' }, { status: 400 });
    }

    const assignedQuestions = await prisma.quizQuestion.findMany({
      where: { quiz_id: quizId },
      include: {
        node: {
          select: {
            node_id: true,
            title: true,
          }
        },
        question: {
          select: {
            question_id: true,
            question_text: true,
            options: {
              select: {
                option_id: true,
                option_text: true,
              }
            }
          }
        }
      }
    });
    
    // Format the data for the client
    const formattedData = assignedQuestions.map(aq => ({
      node_id: aq.node.node_id,
      node_title: aq.node.title,
      question_id: aq.question.question_id,
      question_text: aq.question.question_text,
      options: aq.question.options,
    }));


    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error(`Failed to fetch assigned questions for quiz ${params.quizId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch assigned questions', details: error.message }, { status: 500 });
  }
}

// POST to assign a question to a node in a quiz
export async function POST(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const quizId = parseInt(params.quizId, 10);
    if (isNaN(quizId)) {
        return NextResponse.json({ error: 'Invalid Quiz ID' }, { status: 400 });
    }

    const { nodeId, questionId } = await request.json();
    if (!nodeId || !questionId) {
      return NextResponse.json({ error: 'nodeId and questionId are required' }, { status: 400 });
    }
    
    // Use upsert to handle both creation and replacement
    const quizQuestion = await prisma.quizQuestion.upsert({
        where: {
            quiz_id_node_id: {
                quiz_id: quizId,
                node_id: nodeId,
            }
        },
        update: {
            question_id: questionId
        },
        create: {
            quiz_id: quizId,
            node_id: nodeId,
            question_id: questionId
        },
        include: {
            question: true, // Include the question to return its text
        }
    });

    return NextResponse.json({ message: 'Question assigned successfully', quizQuestion }, { status: 201 });
  } catch (error: any) {
    console.error(`Failed to assign question for quiz ${params.quizId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle potential foreign key errors, e.g., if quiz, node, or question doesn't exist
        if (error.code === 'P2003') { 
             return NextResponse.json({ error: `Invalid reference: The provided quiz, node, or question ID does not exist.` }, { status: 404 });
        }
    }
    return NextResponse.json({ error: 'Failed to assign question', details: error.message }, { status: 500 });
  }
}

    