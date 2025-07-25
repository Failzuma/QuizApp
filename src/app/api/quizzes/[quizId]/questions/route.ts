
import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const verifyToken = (token: string): { userId: number } | null => {
    try {
        if (!process.env.JWT_SECRET) return null;
        return jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
    } catch (error) {
        return null;
    }
};

// POST to link a question from the bank to a node within a quiz
export async function POST(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const quizId = parseInt(params.quizId, 10);
  if (isNaN(quizId)) {
    return NextResponse.json({ error: 'Invalid Quiz ID' }, { status: 400 });
  }

  try {
    const { node_id, question_id } = await request.json();

    if (!node_id || !question_id) {
      return NextResponse.json({ error: 'node_id and question_id are required' }, { status: 400 });
    }

    // Check if the node is already linked in this quiz to prevent duplicates
    const existingLink = await prisma.quizQuestion.findFirst({
        where: {
            quiz_id: quizId,
            node_id: node_id,
        }
    });

    if (existingLink) {
        return NextResponse.json({ error: `Node ${node_id} is already linked to a question in this quiz.`}, { status: 409 });
    }

    // Check if the question is already used in this quiz
    const questionUsed = await prisma.quizQuestion.findFirst({
        where: {
            quiz_id: quizId,
            question_id: question_id,
        }
    });

    if (questionUsed) {
        return NextResponse.json({ error: 'This question is already used on another node in this quiz.'}, { status: 409 });
    }


    const newQuizQuestion = await prisma.quizQuestion.create({
      data: {
        quiz_id: quizId,
        node_id: node_id,
        question_id: question_id,
      },
    });

    return NextResponse.json({ message: 'Question linked successfully', link: newQuizQuestion }, { status: 201 });
  } catch (error: any) {
    console.error(`Failed to link question for quiz ${params.quizId}:`, error);
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') { // Foreign key constraint failed
             return NextResponse.json({ error: `Invalid data provided. Ensure Quiz ID, Node ID, and Question ID are correct.` }, { status: 404 });
        }
    }
    return NextResponse.json({ error: 'Failed to link question', details: error.message }, { status: 500 });
  }
}
