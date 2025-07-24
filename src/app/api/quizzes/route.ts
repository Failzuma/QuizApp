
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

// GET quizzes for a specific map (unchanged)
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


// POST to create a new question (for admins)
export async function POST(request: Request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    // In a production app, you should also validate the user's role (e.g., only admins can create)
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ error: 'Tidak terautentikasi atau tidak diizinkan' }, { status: 403 });
    }

    try {
        const body = await request.json();
        console.log("Received data for new quiz:", body);

        // Check if the request is to create a quiz or submit an answer based on payload
        if (body.nodeId && body.question && body.correctAnswer) {
            // This is a request to CREATE a new question
            const { mapId, nodeId, question, type, options, correctAnswer } = body;

            // First, find the mapNode numeric ID from the string nodeId and mapId
            // For simplicity, we're assuming nodeId is unique for now.
            // A more robust solution would be to find mapNode based on a composite key of mapId and string nodeId.
            // This part of the logic needs to be adapted based on how string Node IDs are mapped to integer node_id in the DB.
            // For now, let's assume we can find a node to associate with.
            // We'll create a placeholder node if one doesn't exist. This is NOT production-ready logic.
            
            let mapNode = await prisma.mapNode.findFirst({
                where: {
                    map_identifier: mapId,
                    // We need a way to link the string `nodeId` from the form to an actual `MapNode` record.
                    // For now, let's assume the form gives us a numeric ID.
                }
            });

            // THIS IS A MAJOR SIMPLIFICATION FOR THE PROTOTYPE
            // In a real app, you would create/manage MapNodes separately.
            // Here we just create one if it doesn't exist to avoid crashing.
            if (!mapNode) {
                console.warn(`Node with identifier for map ${mapId} not found. Creating a placeholder node.`);
                // This logic is flawed because we don't have enough info to create a new node properly (title, posX, posY, etc.)
                // Let's assume for now the admin provides a valid NUMERIC node ID from the database.
            }
            
            const node_id_int = parseInt(nodeId, 10);
            if(isNaN(node_id_int)) {
                 return NextResponse.json({ error: 'Node ID harus berupa angka.' }, { status: 400 });
            }

            const newQuestion = await prisma.question.create({
                data: {
                    node_id: node_id_int, // Use the numeric node_id
                    question_text: question,
                    correct_answer: correctAnswer,
                    options: options || [], // Ensure options is a JSON array
                },
            });

            return NextResponse.json({ message: 'Kuis berhasil dibuat', question: newQuestion }, { status: 201 });

        } else if (body.question_id && body.user_answer) {
            // This is a request to SUBMIT an answer
             const decoded = verifyToken(token);
             if (!decoded) {
                 return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
             }

            const { question_id, user_answer } = body;
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

            return NextResponse.json({ is_correct, correctAnswer: question.correct_answer, answer });
        } else {
            return NextResponse.json({ error: 'Payload permintaan tidak valid' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('API /quizzes POST Error:', error);
        return NextResponse.json({ error: "Gagal memproses permintaan", details: error.message }, { status: 500 });
    }
}
