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

// Example for getting quizzes for a map. 
// A POST for submitting an answer would look different.
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mapId = searchParams.get('mapId');

    if (!mapId) {
        return NextResponse.json({ error: "Parameter mapId dibutuhkan" }, { status: 400 });
    }

    try {
        const nodes = await prisma.mapNode.findMany({
            where: { map_identifier: mapId },
            include: {
                questions: {
                    select: {
                        question_id: true,
                        question_text: true,
                        options: true,
                        // Do not send correct_answer to the client
                    }
                }
            }
        });

        if (!nodes || nodes.length === 0) {
            return NextResponse.json({ error: "Peta tidak ditemukan atau tidak memiliki node" }, { status: 404 });
        }

        return NextResponse.json(nodes);

    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: "Gagal mengambil data kuis", details: error.message }, { status: 500 });
    }
}

// Example POST to submit an answer
export async function POST(request: Request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
        return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
    }

    try {
        const { question_id, user_answer } = await request.json();
        const question = await prisma.question.findUnique({ where: { question_id } });

        if (!question) {
            return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 });
        }

        const is_correct = question.correct_answer.toLowerCase() === user_answer.toLowerCase();

        const answer = await prisma.answer.create({
            data: {
                user_id: decoded.userId,
                question_id,
                user_answer,
                is_correct,
            }
        });

        // Potentially update room score via WebSocket here

        return NextResponse.json({ is_correct, correctAnswer: question.correct_answer, answer });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: "Gagal menyimpan jawaban", details: error.message }, { status: 500 });
    }
}
