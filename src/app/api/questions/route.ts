
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

// GET all questions in the global bank
export async function GET(request: Request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    try {
        const questions = await prisma.question.findMany({
            select: {
                question_id: true,
                question_text: true,
            },
            orderBy: {
                created_at: 'desc'
            }
        });
        return NextResponse.json(questions);
    } catch (error: any) {
        console.error('Failed to fetch questions from bank:', error);
        return NextResponse.json({ error: "Failed to fetch questions", details: error.message }, { status: 500 });
    }
}


export async function POST(request: Request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { question_text, options, correct_answer } = await request.json();

        if (!question_text || !options || !correct_answer) {
        return NextResponse.json({ error: 'question_text, options, and correct_answer are required' }, { status: 400 });
        }
        
        if (!Array.isArray(options) || options.length < 2) {
            return NextResponse.json({ error: 'options must be an array with at least 2 items' }, { status: 400 });
        }
        
        if (!options.some((opt: { text: string }) => opt.text === correct_answer)) {
            return NextResponse.json({ error: 'The correct_answer must exactly match one of the provided options.'}, { status: 400 });
        }

        const newQuestion = await prisma.question.create({
        data: {
            question_text: question_text,
            correct_answer: correct_answer,
            options: {
                create: options.map((opt: {text: string}) => ({
                    option_text: opt.text
                }))
            }
        },
        select: {
            question_id: true,
            question_text: true,
        }
        });

        return NextResponse.json({ message: 'Question created successfully', question: newQuestion }, { status: 201 });

    } catch (error: any) {
        console.error(`Failed to create question:`, error);
        return NextResponse.json({ error: 'Failed to create question', details: error.message }, { status: 500 });
    }
}
