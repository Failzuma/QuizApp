
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET all necessary data for a specific quiz instance to run the game.
export async function GET(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  try {
    const quizId = parseInt(params.quizId, 10);

    if (isNaN(quizId)) {
        return NextResponse.json({ error: 'Invalid Quiz ID format' }, { status: 400 });
    }

    // 1. Fetch the quiz details including its map identifier
    const quiz = await prisma.quiz.findUnique({
      where: { quiz_id: quizId },
      select: {
        quiz_id: true,
        title: true,
        description: true,
        map_identifier: true,
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // 2. Fetch all the questions linked to this quiz
    const linkedQuestions = await prisma.quizQuestion.findMany({
      where: {
        quiz_id: quizId,
      },
      include: {
        question: { // Include the full question data
          include: {
            options: true, // And its options
          }
        },
      },
    });

    // 3. Format the response for the game client
    const formattedResponse = {
        ...quiz,
        questions: linkedQuestions.map(link => ({
            node_id: link.node_id, // The node this question is on
            question_id: link.question.question_id,
            question_text: link.question.question_text,
            options: link.question.options.map(opt => ({
                option_id: opt.option_id,
                option_text: opt.option_text,
            })),
            // IMPORTANT: Do NOT send the correct_answer to the client
        })),
    };
    
    return NextResponse.json(formattedResponse);

  } catch (error: any) {
    console.error(`Error fetching game data for quiz ${params.quizId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch quiz game data', details: error.message }, { status: 500 });
  }
}
