
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

    // 1. Fetch the quiz details including its map relation
    const quiz = await prisma.quiz.findUnique({
      where: { quiz_id: quizId },
      include: {
        map: true, // Include the full map data
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
        question: { 
          include: {
            options: true, 
          }
        },
      },
    });

    // 3. Format the response for the game client
    const formattedResponse = {
        quiz_id: quiz.quiz_id,
        title: quiz.title,
        description: quiz.description,
        map: { // Send a dedicated map object
            map_identifier: quiz.map.map_identifier,
            title: quiz.map.title,
        },
        questions: linkedQuestions.map(link => ({
            node_id: link.node_id,
            question_id: link.question.question_id,
            question_text: link.question.question_text,
            options: link.question.options.map(opt => ({
                option_id: opt.option_id,
                option_text: opt.option_text,
            })),
        })),
    };
    
    return NextResponse.json(formattedResponse);

  } catch (error: any) {
    console.error(`Error fetching game data for quiz ${params.quizId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch quiz game data', details: error.message }, { status: 500 });
  }
}
