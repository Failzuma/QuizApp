
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
  image_url: z.string().url('Must be a valid URL.').nullable().optional(),
});

// Update the enum to include all valid types from your Prisma schema
const questionTypeEnum = z.nativeEnum(QuestionType, {
    errorMap: () => ({ message: `Invalid question_type. Must be one of: ${Object.values(QuestionType).join(', ')}`})
});

const questionFormSchema = z.object({
  question_type: questionTypeEnum,
  question_text: z.string().min(10, 'Question text must be at least 10 characters.'),
  image_url: z.string().url('Must be a valid URL.').nullable().optional(),
  options: z.array(optionSchema).optional(),
  correct_answer: z.string().min(1, 'You must specify the correct answer.'),
}).refine(data => {
    if (data.question_type === 'MULTIPLE_CHOICE' || data.question_type === 'IMAGE_MATCH') {
        return data.options && data.options.length >= 2;
    }
    return true;
}, {
    message: "For MULTIPLE_CHOICE or IMAGE_MATCH, at least 2 options are required.",
    path: ["options"],
}).refine(data => {
    if (data.question_type === 'MULTIPLE_CHOICE') {
        return data.options?.some(opt => opt.text === data.correct_answer);
    }
    return true;
}, {
    message: "For MULTIPLE_CHOICE, the correct_answer must exactly match the text of one of the options.",
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
        return NextResponse.json({ error: 'Unauthorized. A valid token is required.' }, { status: 403 });
    }

    let body;
    try {
        body = await request.json();
    } catch (error) {
        return NextResponse.json({ error: 'Invalid JSON', details: 'The request body is not a valid JSON format.' }, { status: 400 });
    }

    try {
        const isBulk = Array.isArray(body);
        const schema = isBulk ? questionsArraySchema : questionFormSchema;
        const validation = schema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ 
                error: 'Invalid data provided.', 
                details: validation.error.flatten() 
            }, { status: 400 });
        }

        if (isBulk) {
            const createdQuestions = await prisma.$transaction(
                (validation.data as z.infer<typeof questionsArraySchema>).map(q =>
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
                        select: { question_id: true, question_text: true }
                    })
                )
            );
            return NextResponse.json({ message: `Successfully created ${createdQuestions.length} questions.`, questions: createdQuestions }, { status: 201 });
        } else {
            const { question_type, question_text, image_url, options, correct_answer } = validation.data as z.infer<typeof questionFormSchema>;
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
                select: { question_id: true, question_text: true }
            });
            return NextResponse.json({ message: 'Question created successfully.', question: newQuestion }, { status: 201 });
        }
    } catch (error: any) {
        console.error(`Failed to create question(s):`, error);
        return NextResponse.json({ error: 'Failed to create question(s) in the database.', details: error.message }, { status: 500 });
    }
}
