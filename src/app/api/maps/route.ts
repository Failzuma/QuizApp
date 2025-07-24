
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
