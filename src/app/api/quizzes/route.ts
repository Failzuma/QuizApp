
import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();

const verifyToken = (token: string): { userId: number; username: string } | null => {
    try {
        if (!process.env.JWT_SECRET) return null;
        return jwt.verify(token, process.env.JWT_SECRET) as { userId: number; username: string };
    } catch (error) {
        return null;
    }
};

const quizCreationSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  mapIdentifier: z.string().min(1, 'A map must be selected.'),
  description: z.string().optional(),
});


// GET all available quizzes to be displayed on the dashboard.
export async function GET(request: Request) {
    try {
        const quizzes = await prisma.quiz.findMany({
            select: {
                quiz_id: true,
                title: true,
                description: true,
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
            description: quiz.description || `A quiz on the map: ${quiz.map.title}.`,
            mapId: quiz.map.map_identifier,
        }));

        return NextResponse.json(formattedQuizzes);

    } catch (error: any) {
        console.error('Failed to fetch quizzes:', error);
        return NextResponse.json({ error: "Gagal mengambil data kuis", details: error.message }, { status: 500 });
    }
}


// POST to create a new Quiz instance (metadata only, no questions)
export async function POST(request: Request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const decodedUser = token ? verifyToken(token) : null;
    if (!decodedUser) {
        return NextResponse.json({ error: 'Tidak terautentikasi atau tidak diizinkan' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const validation = quizCreationSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error.flatten() }, { status: 400 });
        }
        
        const { title, mapIdentifier, description } = validation.data;

        const newQuiz = await prisma.quiz.create({
            data: {
                title,
                map_identifier: mapIdentifier,
                description,
                creator_id: decodedUser.userId,
            }
        });

        return NextResponse.json({ message: 'Kuis berhasil dibuat', quiz: newQuiz }, { status: 201 });

    } catch (error: any) {
        console.error('API /quizzes POST Error:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2003' && (error.meta as any)?.field_name.includes('map_identifier')) { 
                 return NextResponse.json({ error: `Map with identifier '${(body as any).mapIdentifier}' not found.` }, { status: 404 });
            }
        }
        return NextResponse.json({ error: "Gagal memproses permintaan", details: error.message }, { status: 500 });
    }
}
