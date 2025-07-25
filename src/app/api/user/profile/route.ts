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

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
  }
  try {
    const user = await prisma.user.findUnique({ where: { user_id: decoded.userId }, select: { user_id: true, username: true, email: true, created_at: true } });
    if (!user) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }
    const sessionHistory = await prisma.answer.findMany({
        where: { user_id: decoded.userId },
        include: {
            question: {
                include: {
                    quizzes: {
                        include: {
                            quiz: {
                                include: {
                                    map: true
                                }
                            }
                        }
                    }
                }
            }
        },
        orderBy: {
            waktu_pengerjaan: 'desc'
        }
    });

    // A simplified transformation for the frontend
    const simplifiedHistory = sessionHistory.map(h => {
        const quizQuestion = h.question.quizzes[0];
        const mapTitle = quizQuestion?.quiz.map.title || 'Unknown Map';
        return {
            id: h.waktu_pengerjaan.toISOString(),
            mapTitle: mapTitle,
            score: h.is_correct ? 100 : 0, // Placeholder score logic
            date: h.waktu_pengerjaan.toISOString(),
        }
    });


    return NextResponse.json({ user, history: simplifiedHistory });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil data profil", details: error.message }, { status: 500 });
  }
}
