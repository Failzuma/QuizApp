
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

// This endpoint fetches all unique map identifiers to be displayed on the dashboard.
export async function GET() {
    try {
        // We group by the map_identifier to get a list of unique maps.
        const mapsData = await prisma.mapNode.findMany({
            distinct: ['map_identifier'],
            select: {
                map_identifier: true,
                title: true, // Also fetch the title of one of the nodes as the map title
            },
            orderBy: {
                map_identifier: 'asc'
            }
        });


        if (!mapsData) {
            return NextResponse.json([]);
        }

        const maps = mapsData.map(map => ({
            id: map.map_identifier,
            title: map.title || map.map_identifier.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: `An interactive quiz map about ${map.title || map.map_identifier.replace(/_/g, ' ')}.`,
            subject: 'General Knowledge',
            difficulty: 'Medium'
        }));


        return NextResponse.json(maps);

    } catch (error: any) {
        console.error('Failed to fetch maps:', error);
        return NextResponse.json({ error: "Gagal mengambil data peta", details: error.message }, { status: 500 });
    }
}


// POST to create a new map (blueprint) with multiple custom nodes
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

        const existingMap = await prisma.mapNode.findFirst({
            where: { map_identifier: mapIdentifier }
        });

        if (existingMap) {
            return NextResponse.json({ error: `Map with identifier "${mapIdentifier}" already exists.` }, { status: 409 });
        }

        // Use a transaction to create all nodes for the map at once
        const createdNodes = await prisma.$transaction(
            nodes.map(node => 
                prisma.mapNode.create({
                    data: {
                        map_identifier: mapIdentifier,
                        title: node.title || 'Untitled Node',
                        content: node.content || 'Node content.',
                        posX: node.posX ?? 100,
                        posY: node.posY ?? 100,
                    }
                })
            )
        );

        return NextResponse.json({ 
            message: `Map '${title}' created successfully with ${createdNodes.length} nodes.`,
            map: {
                map_identifier: mapIdentifier,
                title: title,
                nodes: createdNodes
            } 
        }, { status: 201 });

    } catch (error: any) {
        console.error('API /maps POST Error:', error);
        if (error.code === 'P2002') { // Handle potential race condition for unique identifier
             return NextResponse.json({ error: `Map with identifier "${request.json().then(d => d.mapIdentifier)}" already exists.` }, { status: 409 });
        }
        return NextResponse.json({ error: "Gagal memproses permintaan", details: error.message }, { status: 500 });
    }
}
