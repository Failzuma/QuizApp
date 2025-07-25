
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();

const verifyToken = (token: string): { userId: number } | null => {
    try {
        if (!process.env.JWT_SECRET) return null;
        return jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
    } catch (error) {
        return null;
    }
};

// Zod schema for validation
const optionSchema = z.object({
  text: z.string().min(1, 'Option text cannot be empty.'),
});

const questionFormSchema = z.object({
  question_text: z.string().min(10, 'Question text must be at least 10 characters.'),
  options: z.array(optionSchema).min(2, 'Must have at least 2 options.').max(5, 'Cannot have more than 5 options.'),
  correct_answer: z.string().min(1, 'You must specify the correct answer.'),
}).refine(data => data.options.some(opt => opt.text === data.correct_answer), {
    message: "The correct answer must exactly match one of the options.",
    path: ["correct_answer"],
});

// GET all questions from the global question bank
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

// POST a new question to the global question bank
export async function POST(request: Request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const validation = questionFormSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error.flatten() }, { status: 400 });
        }

        const { question_text, options, correct_answer } = validation.data;

        const newQuestion = await prisma.question.create({
            data: {
                question_text,
                correct_answer,
                options: {
                    create: options.map(opt => ({
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
