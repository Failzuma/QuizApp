
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

// This endpoint is no longer used for the public dashboard. 
// It can be repurposed for admin-specific map data fetching if needed.
export async function GET() {
    try {
        const mapsData = await prisma.map.findMany({
            select: {
                map_identifier: true,
                title: true,
            },
            orderBy: {
                created_at: 'desc'
            }
        });
        return NextResponse.json(mapsData);

    } catch (error: any) {
        console.error('Failed to fetch maps:', error);
        return NextResponse.json({ error: "Gagal mengambil data peta", details: error.message }, { status: 500 });
    }
}


// POST to create a new map blueprint with nodes and obstacles
export async function POST(request: Request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ error: 'Tidak terautentikasi atau tidak diizinkan' }, { status: 403 });
    }

    try {
        const { mapIdentifier, title, nodes } = await request.json();

        if (!mapIdentifier || !title || !Array.isArray(nodes)) {
            return NextResponse.json({ error: 'Map identifier, title, and a nodes array are required' }, { status: 400 });
        }
        
        if (!/^[a-z0-9_]+$/.test(mapIdentifier)) {
            return NextResponse.json({ error: 'Map Identifier can only contain lowercase letters, numbers, and underscores.' }, { status: 400 });
        }
        
        if (nodes.length === 0 || nodes.length > 10) {
            return NextResponse.json({ error: 'A map must have between 1 and 10 nodes.' }, { status: 400 });
        }

        const existingMap = await prisma.map.findUnique({
            where: { map_identifier: mapIdentifier }
        });

        if (existingMap) {
            return NextResponse.json({ error: `Map with identifier "${mapIdentifier}" already exists.` }, { status: 409 });
        }

        const newMap = await prisma.$transaction(async (tx) => {
            const createdMap = await tx.map.create({
                data: {
                    map_identifier: mapIdentifier,
                    title: title,
                }
            });

            if (nodes && nodes.length > 0) {
                await tx.mapNode.createMany({
                    data: nodes.map(node => ({
                        map_identifier: mapIdentifier,
                        title: 'Interactive Node', 
                        content: 'Quiz awaits here.',
                        posX: node.posX,
                        posY: node.posY,
                    }))
                });
            }

            return createdMap;
        });

        const finalNodes = await prisma.mapNode.findMany({
            where: { map_identifier: mapIdentifier }
        });

        return NextResponse.json({ 
            message: `Map '${title}' created successfully.`,
            map: {
                ...newMap,
                nodes: finalNodes
            } 
        }, { status: 201 });

    } catch (error: any) {
        console.error('API /maps POST Error:', error);
        return NextResponse.json({ error: "Gagal memproses permintaan", details: error.message }, { status: 500 });
    }
}
