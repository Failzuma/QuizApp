
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET details for a specific quiz instance
export async function GET(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  try {
    const quizId = parseInt(params.quizId, 10);

    if (isNaN(quizId)) {
        return NextResponse.json({ error: 'Invalid Quiz ID format' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: {
        quiz_id: quizId,
      },
      select: {
        quiz_id: true,
        title: true,
        map: { // Include the related map details
            select: {
                map_identifier: true,
                title: true
            }
        }
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    
    return NextResponse.json(quiz);

  } catch (error: any) {
    console.error(`Error fetching quiz ${params.quizId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch quiz details', details: error.message }, { status: 500 });
  }
}
