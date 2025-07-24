
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

// GET all questions for a specific node in a map
export async function GET(
  request: Request,
  { params }: { params: { mapId: string } }
) {
  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get('nodeId');

  if (!nodeId) {
    return NextResponse.json({ error: 'nodeId query parameter is required' }, { status: 400 });
  }

  try {
    const questions = await prisma.question.findMany({
      where: {
        node_id: parseInt(nodeId, 10),
      },
      select: {
          question_id: true,
          question_text: true,
      }
    });
    return NextResponse.json(questions);
  } catch (error: any) {
    console.error(`Failed to fetch questions for node ${nodeId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch questions', details: error.message }, { status: 500 });
  }
}

// POST a new question to a specific node
export async function POST(
  request: Request,
  { params }: { params: { mapId: string } }
) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { node_id, question_text, options, correct_answer } = await request.json();

    if (!node_id || !question_text || !options || !correct_answer) {
      return NextResponse.json({ error: 'node_id, question_text, options, and correct_answer are required' }, { status: 400 });
    }
    
    if (!Array.isArray(options) || options.length < 2) {
        return NextResponse.json({ error: 'options must be an array with at least 2 items' }, { status: 400 });
    }
    
    // Verify that the correct_answer is one of the options
    if (!options.some((opt: { text: string }) => opt.text === correct_answer)) {
        return NextResponse.json({ error: 'The correct_answer must exactly match one of the provided options.'}, { status: 400 });
    }

    const newQuestion = await prisma.question.create({
      data: {
        node_id: node_id,
        question_text: question_text,
        correct_answer: correct_answer,
        options: {
            create: options.map((opt: {text: string}) => ({
                option_text: opt.text
            }))
        }
      },
      select: { // Select only what we need to return
          question_id: true,
          question_text: true,
      }
    });

    return NextResponse.json({ message: 'Question created successfully', question: newQuestion }, { status: 201 });
  } catch (error: any) {
    console.error(`Failed to create question for map ${params.mapId}:`, error);
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') { // Foreign key constraint failed
             return NextResponse.json({ error: `Node with ID '${(error.meta as any)?.field_name}' not found.` }, { status: 404 });
        }
    }
    return NextResponse.json({ error: 'Failed to create question', details: error.message }, { status: 500 });
  }
}

    