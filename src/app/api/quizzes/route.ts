
import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const verifyToken = (token: string): { userId: number } | null => {
    try {
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET not defined');
            return null;
        }
        return jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    } catch (error) {
        return null;
    }
};

// GET all available quizzes to be displayed on the dashboard.
export async function GET(request: Request) {
    try {
        const quizzes = await prisma.quiz.findMany({
            select: {
                quiz_id: true,
                title: true,
                map: {
                    select: {
                        map_identifier: true,
                        title: true, // Also get map title
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        // Format the data for the frontend
        const formattedQuizzes = quizzes.map(quiz => ({
            id: quiz.quiz_id,
            title: quiz.title,
            description: `A quiz session on the map: ${quiz.map.title}.`,
            mapId: quiz.map.map_identifier,
        }));

        return NextResponse.json(formattedQuizzes);

    } catch (error: any) {
        console.error('Failed to fetch quizzes:', error);
        return NextResponse.json({ error: "Gagal mengambil data kuis", details: error.message }, { status: 500 });
    }
}


// POST to create a new Quiz with all its questions
export async function POST(request: Request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ error: 'Tidak terautentikasi atau tidak diizinkan' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { title, mapId, questions } = body;

        if (!title || !mapId || !Array.isArray(questions) || questions.length === 0) {
            return NextResponse.json({ error: 'Title, mapId, and a non-empty array of questions are required.' }, { status: 400 });
        }

        // --- Transactional Creation ---
        const newQuiz = await prisma.$transaction(async (tx) => {
            // 1. Create the Quiz instance
            const createdQuiz = await tx.quiz.create({
                data: {
                    title: title,
                    map_identifier: mapId,
                }
            });

            // 2. Get the nodes for the selected map to associate questions with
            const mapNodes = await tx.mapNode.findMany({
                where: { map_identifier: mapId },
                orderBy: { node_id: 'asc' }, // Ensure consistent ordering
            });

            if (mapNodes.length < questions.length) {
                throw new Error("The number of questions exceeds the number of nodes available on the selected map.");
            }

            // 3. Create all Questions and their Options, then create the QuizQuestion association
            for (let i = 0; i < questions.length; i++) {
                const qData = questions[i];
                const nodeId = mapNodes[i].node_id;

                if (!qData.question_text || !qData.correct_answer || !qData.options || qData.options.length < 2) {
                   console.warn(`Skipping question for node ${nodeId} due to incomplete data.`);
                   continue;
                }
                
                // Validate that the correct answer is one of the options provided
                if (!qData.options.some((opt: { text: string }) => opt.text === qData.correct_answer)) {
                     throw new Error(`Correct answer for question ${i+1} ("${qData.question_text}") is not listed in its options.`);
                }

                // Create the question first
                const createdQuestion = await tx.question.create({
                    data: {
                        question_text: qData.question_text,
                        correct_answer: qData.correct_answer,
                        // This question is created for a specific quiz, so it's not global
                    }
                });

                // Create options for this question
                await tx.option.createMany({
                    data: qData.options.map((opt: { text: string }) => ({
                        question_id: createdQuestion.question_id,
                        option_text: opt.text,
                    }))
                });

                // Associate the newly created question with the quiz and a node
                await tx.quizQuestion.create({
                    data: {
                        quiz_id: createdQuiz.quiz_id,
                        node_id: nodeId,
                        question_id: createdQuestion.question_id,
                    }
                });
            }

            return createdQuiz;
        });

        return NextResponse.json({ message: 'Kuis berhasil dibuat', quiz: newQuiz }, { status: 201 });

    } catch (error: any) {
        console.error('API /quizzes POST Error:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // e.g., if mapId doesn't exist
            if (error.code === 'P2003') { 
                 const fieldName = (error.meta as any)?.field_name;
                 if (typeof fieldName === 'string' && fieldName.includes('map_identifier')) {
                    return NextResponse.json({ error: `Map with identifier '${mapId}' not found.` }, { status: 404 });
                 }
            }
        }
        return NextResponse.json({ error: "Gagal memproses permintaan", details: error.message }, { status: 500 });
    }
}

    