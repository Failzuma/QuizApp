
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
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


// POST to create a new Quiz Instance (for admins)
export async function POST(request: Request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ error: 'Tidak terautentikasi atau tidak diizinkan' }, { status: 403 });
    }

    try {
        const body = await request.json();
        console.log("Received data for new quiz instance:", body);
        
        // This endpoint now creates a QUIZ INSTANCE, not a question
        const { title, mapId } = body;

        if (!title || !mapId) {
            return NextResponse.json({ error: 'Title and mapId are required to create a quiz.' }, { status: 400 });
        }

        // Check if the map exists
        const mapExists = await prisma.map.findUnique({
            where: { map_identifier: mapId }
        });
        if (!mapExists) {
            return NextResponse.json({ error: `Map with identifier '${mapId}' not found.` }, { status: 404 });
        }

        const newQuiz = await prisma.quiz.create({
            data: {
                title: title,
                map_identifier: mapId,
            }
        });

        return NextResponse.json({ message: 'Kuis berhasil dibuat', quiz: newQuiz }, { status: 201 });

    } catch (error: any) {
        console.error('API /quizzes POST Error:', error);
        return NextResponse.json({ error: "Gagal memproses permintaan", details: error.message }, { status: 500 });
    }
}
