
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
        const mapsData = await prisma.mapNode.groupBy({
            by: ['map_identifier'],
            orderBy: {
                map_identifier: 'asc'
            }
        });

        if (!mapsData) {
            return NextResponse.json([]);
        }

        // We can fetch one node for each map to get more details if needed,
        // but for the dashboard, the identifier is enough to build the links.
        // We'll add dummy descriptions for now.
        const maps = mapsData.map(map => ({
            id: map.map_identifier,
            title: map.map_identifier.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: `An interactive quiz map about ${map.map_identifier.replace(/_/g, ' ')}.`,
            subject: 'General Knowledge',
            difficulty: 'Medium'
        }));


        return NextResponse.json(maps);

    } catch (error: any) {
        console.error('Failed to fetch maps:', error);
        return NextResponse.json({ error: "Gagal mengambil data peta", details: error.message }, { status: 500 });
    }
}


// POST to create a new map (blueprint)
export async function POST(request: Request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    // In a production app, you should also validate the user's role (e.g., only admins can create)
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ error: 'Tidak terautentikasi atau tidak diizinkan' }, { status: 403 });
    }

    try {
        const { mapIdentifier, title } = await request.json();

        if (!mapIdentifier || !title) {
            return NextResponse.json({ error: 'Map identifier and title are required' }, { status: 400 });
        }
        
        // Validate mapIdentifier format (e.g., lowercase, no spaces)
        if (!/^[a-z0-9_]+$/.test(mapIdentifier)) {
            return NextResponse.json({ error: 'Map Identifier can only contain lowercase letters, numbers, and underscores.' }, { status: 400 });
        }


        // Check if a map with this identifier already exists
        const existingMap = await prisma.mapNode.findFirst({
            where: { map_identifier: mapIdentifier }
        });

        if (existingMap) {
            return NextResponse.json({ error: `Map with identifier "${mapIdentifier}" already exists.` }, { status: 409 });
        }

        // Create the first placeholder node to establish the map
        const newMapNode = await prisma.mapNode.create({
            data: {
                map_identifier: mapIdentifier,
                title: title, // Store the human-readable title
                content: 'This is the starting node for your new map.', // Placeholder content
                posX: 100, // Default position
                posY: 100, // Default position
            },
        });

        return NextResponse.json({ 
            message: 'Map blueprint created successfully. Add the background image to public/assets/images/backgrounds/',
            map: {
                map_identifier: newMapNode.map_identifier,
                title: newMapNode.title
            } 
        }, { status: 201 });

    } catch (error: any) {
        console.error('API /maps POST Error:', error);
        return NextResponse.json({ error: "Gagal memproses permintaan", details: error.message }, { status: 500 });
    }
}
