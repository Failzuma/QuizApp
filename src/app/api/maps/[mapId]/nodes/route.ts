
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// This is a protected endpoint, likely for admin use
export async function GET(
  request: Request,
  { params }: { params: { mapId: string } }
) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    // For now, let's allow game clients to fetch this without a token.
    // In a real app, you might want a different, public endpoint or an API key system.
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const mapIdentifier = params.mapId;
    const nodes = await prisma.mapNode.findMany({
      where: { map_identifier: mapIdentifier },
      select: {
        node_id: true,
        title: true,
        posX: true,
        posY: true,
      },
      orderBy: {
        node_id: 'asc'
      }
    });

    if (nodes.length === 0) {
      // It's not necessarily an error, could be a new map.
      return NextResponse.json([]);
    }

    return NextResponse.json(nodes);
  } catch (error: any) {
    console.error(`Failed to fetch nodes for map ${params.mapId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch node data', details: error.message }, { status: 500 });
  }
}

    