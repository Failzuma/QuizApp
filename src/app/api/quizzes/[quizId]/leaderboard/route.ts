
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  try {
    const quizId = parseInt(params.quizId, 10);

    if (isNaN(quizId)) {
      return NextResponse.json({ error: 'Invalid Quiz ID' }, { status: 400 });
    }

    // Find all questions associated with this quiz
    const quizQuestions = await prisma.quizQuestion.findMany({
      where: { quiz_id: quizId },
      select: { question_id: true }
    });

    if (!quizQuestions.length) {
      // No questions in the quiz, return an empty leaderboard
      return NextResponse.json([]);
    }

    const questionIds = quizQuestions.map(qq => qq.question_id);

    // Find all correct answers for these questions
    const correctAnswers = await prisma.answer.findMany({
      where: {
        question_id: { in: questionIds },
        is_correct: true,
      },
      include: {
        user: { // Include user data to get username and character
            select: {
                user_id: true,
                username: true,
                character: true,
            }
        }
      }
    });

    // Process the data to build the leaderboard
    const scores = correctAnswers.reduce((acc, answer) => {
      const userId = answer.user.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          username: answer.user.username,
          character: answer.user.character,
          score: 0
        };
      }
      acc[userId].score += 1; // 1 point for each correct answer
      return acc;
    }, {} as Record<number, { user_id: number, username: string, character: string, score: number }>);

    // Convert to array, sort by score, and take top 10
    const leaderboard = Object.values(scores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
      
    return NextResponse.json(leaderboard);

  } catch (error) {
    console.error(`Failed to fetch leaderboard for quiz ${params.quizId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
