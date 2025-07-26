
import { NextResponse } from 'next/server';
import { PrismaClient, QuestionType } from '@prisma/client';
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

const optionSchema = z.object({
  text: z.string().min(1, 'Option text cannot be empty.'),
  image_url: z.string().url().nullable().optional(),
});

const questionFormSchema = z.object({
  question_type: z.nativeEnum(QuestionType),
  question_text: z.string().min(10, 'Question text must be at least 10 characters.'),
  image_url: z.string().url().nullable().optional(),
  options: z.array(optionSchema).optional(),
  correct_answer: z.string().min(1, 'You must specify the correct answer.'),
}).refine(data => {
    if (data.question_type === 'MULTIPLE_CHOICE' || data.question_type === 'IMAGE_MATCH') {
        return data.options && data.options.length >= 2;
    }
    return true;
}, {
    message: "This question type requires at least 2 options.",
    path: ["options"],
}).refine(data => {
    if (data.question_type === 'MULTIPLE_CHOICE') {
        return data.options?.some(opt => opt.text === data.correct_answer);
    }
    return true;
}, {
    message: "The correct answer must exactly match one of the options.",
    path: ["correct_answer"],
});

const questionsArraySchema = z.array(questionFormSchema);

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
                question_type: true
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
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await request.json();

        if (Array.isArray(body)) {
            // Handle bulk creation from JSON array
            const validation = questionsArraySchema.safeParse(body);
            if (!validation.success) {
                return NextResponse.json({ error: 'Invalid data in questions array', details: validation.error.flatten() }, { status: 400 });
            }

            const createdQuestions = await prisma.$transaction(
                validation.data.map(q =>
                    prisma.question.create({
                        data: {
                            question_text: q.question_text,
                            question_type: q.question_type,
                            correct_answer: q.correct_answer,
                            image_url: q.image_url,
                            options: (q.question_type === 'MULTIPLE_CHOICE' || q.question_type === 'IMAGE_MATCH') && q.options ? {
                                create: q.options.map(opt => ({
                                    option_text: opt.text,
                                    image_url: opt.image_url,
                                }))
                            } : undefined,
                        },
                        select: {
                            question_id: true,
                            question_text: true,
                        }
                    })
                )
            );

            return NextResponse.json({ message: `Successfully created ${createdQuestions.length} questions`, questions: createdQuestions }, { status: 201 });

        } else {
            // Handle single question creation
            const validation = questionFormSchema.safeParse(body);

            if (!validation.success) {
                return NextResponse.json({ error: 'Invalid data', details: validation.error.flatten() }, { status: 400 });
            }

            const { question_type, question_text, image_url, options, correct_answer } = validation.data;

            const newQuestion = await prisma.question.create({
                data: {
                    question_text,
                    question_type,
                    correct_answer,
                    image_url: image_url,
                    options: (question_type === 'MULTIPLE_CHOICE' || question_type === 'IMAGE_MATCH') && options ? {
                        create: options.map(opt => ({
                            option_text: opt.text,
                            image_url: opt.image_url,
                        }))
                    } : undefined,
                },
                select: {
                    question_id: true,
                    question_text: true,
                }
            });

            return NextResponse.json({ message: 'Question created successfully', question: newQuestion }, { status: 201 });
        }
    } catch (error: any) {
        console.error(`Failed to create question(s):`, error);
        return NextResponse.json({ error: 'Failed to create question(s)', details: error.message }, { status: 500 });
    }
}
