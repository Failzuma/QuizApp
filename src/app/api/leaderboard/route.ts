import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const leaderboardData = await prisma.answer.groupBy({
            by: ['user_id'],
            where: { is_correct: true },
            _count: {
            is_correct: true,
            },
            orderBy: {
            _count: {
                is_correct: 'desc',
            },
            },
            take: 10,
        });

        if (leaderboardData.length === 0) {
            return NextResponse.json([]);
        }

        const users = await prisma.user.findMany({
            where: {
            user_id: {
                in: leaderboardData.map(i => i.user_id),
            },
            },
            select: {
            user_id: true,
            username: true,
            },
        });

        const userMap = new Map(users.map(u => [u.user_id, u.username]));

        const rankedLeaderboard = leaderboardData.map((item, index) => ({
            rank: index + 1,
            username: userMap.get(item.user_id)!,
            score: item._count.is_correct,
        }));

        return NextResponse.json(rankedLeaderboard);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: "Gagal mengambil data papan peringkat", details: error.message }, { status: 500 });
    }
}
