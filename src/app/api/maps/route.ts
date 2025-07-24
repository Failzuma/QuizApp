
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

// This endpoint fetches all unique maps to be displayed on the dashboard.
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

        if (!mapsData) {
            return NextResponse.json([]);
        }

        const maps = mapsData.map(map => ({
            id: map.map_identifier,
            title: map.title,
            description: `An interactive quiz map about ${map.title}.`,
            subject: 'General Knowledge', // This can be dynamic in the future
            difficulty: 'Medium' // This can be dynamic in the future
        }));

        return NextResponse.json(maps);

    } catch (error: any) {
        console.error('Failed to fetch maps:', error);
        return NextResponse.json({ error: "Gagal mengambil data peta", details: error.message }, { status: 500 });
    }
}


// POST to create a new map (blueprint) with multiple custom nodes and obstacles
export async function POST(request: Request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ error: 'Tidak terautentikasi atau tidak diizinkan' }, { status: 403 });
    }

    try {
        const { mapIdentifier, title, nodes, obstacles } = await request.json();

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

        // Use a transaction to create the map, its nodes, and obstacles atomically
        const newMap = await prisma.$transaction(async (tx) => {
            // 1. Create the Map record
            const createdMap = await tx.map.create({
                data: {
                    map_identifier: mapIdentifier,
                    title: title,
                }
            });

            // 2. Create MapNodes linked to the new map
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

            // 3. Create MapObstacles linked to the new map
            if (obstacles && obstacles.length > 0) {
                await tx.mapObstacle.createMany({
                    data: obstacles.map((obstacle: any) => ({
                        map_identifier: mapIdentifier,
                        posX: obstacle.posX,
                        posY: obstacle.posY,
                        width: obstacle.width,
                        height: obstacle.height,
                    }))
                });
            }

            return createdMap;
        });

        // Fetch the created nodes to return them in the response for confirmation
        const finalNodes = await prisma.mapNode.findMany({
            where: { map_identifier: mapIdentifier }
        });

        return NextResponse.json({ 
            message: `Map '${title}' created successfully with ${finalNodes.length} nodes and ${obstacles?.length || 0} obstacles.`,
            map: {
                ...newMap,
                nodes: finalNodes
            } 
        }, { status: 201 });

    } catch (error: any) {
        console.error('API /maps POST Error:', error);
        if (error.code === 'P2002') { 
             const failedIdentifier = (await request.json()).mapIdentifier;
             return NextResponse.json({ error: `Map with identifier "${failedIdentifier}" already exists.` }, { status: 409 });
        }
        return NextResponse.json({ error: "Gagal memproses permintaan", details: error.message }, { status: 500 });
    }
}
