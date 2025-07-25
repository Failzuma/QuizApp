
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const verifyToken = (token: string): { userId: number; username: string } | null => {
    try {
        if (!process.env.JWT_SECRET) return null;
        return jwt.verify(token, process.env.JWT_SECRET) as { userId: number; username: string };
    } catch (error) {
        return null;
    }
};

// This is a protected endpoint for admin use only
export async function GET(request: Request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }
    
    const decodedToken = verifyToken(token);
    if (!decodedToken || decodedToken.username !== 'admin') {
         return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    try {
        const maps = await prisma.map.findMany({
            include: {
                _count: {
                    select: { nodes: true },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        const summary = maps.map(map => ({
            id: map.map_identifier,
            title: map.title,
            nodes: map._count.nodes,
        }));

        return NextResponse.json(summary);

    } catch (error: any) {
        console.error('Failed to fetch admin map summary:', error);
        return NextResponse.json({ error: "Failed to fetch map summary data", details: error.message }, { status: 500 });
    }
}
