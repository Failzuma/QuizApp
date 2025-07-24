
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
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

// GET details for a specific quiz instance
export async function GET(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  // This can be a public or protected route depending on needs
  // For now, let's assume it's public for players to fetch quiz info.
  // const token = request.headers.get('authorization')?.split(' ')[1];
  // if (!token || !verifyToken(token)) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  // }

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
