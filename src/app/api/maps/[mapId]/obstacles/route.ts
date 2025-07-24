
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const verifyToken = (token: string): { userId: number } | null => {
    try {
        if (!process.env.JWT_SECRET) return null;
        return jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
    } catch (error) {
        return null;
    }
};

// GET all obstacles for a specific map
export async function GET(
  request: Request,
  { params }: { params: { mapId: string } }
) {
  try {
    const obstacles = await prisma.mapObstacle.findMany({
      where: { map_identifier: params.mapId },
    });
    return NextResponse.json(obstacles);
  } catch (error: any) {
    console.error(`Failed to fetch obstacles for map ${params.mapId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch obstacles', details: error.message }, { status: 500 });
  }
}

// POST a new obstacle for a specific map
export async function POST(
  request: Request,
  { params }: { params: { mapId: string } }
) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { posX, posY, width, height } = await request.json();

    if (posX === undefined || posY === undefined || width === undefined || height === undefined) {
      return NextResponse.json({ error: 'posX, posY, width, and height are required' }, { status: 400 });
    }
    
    // Check if the map itself exists by finding a node for it
    const mapExists = await prisma.mapNode.findFirst({
        where: { map_identifier: params.mapId }
    });
    if (!mapExists) {
        return NextResponse.json({ error: `Map with identifier '${params.mapId}' not found.`}, { status: 404 });
    }

    const newObstacle = await prisma.mapObstacle.create({
      data: {
        map_identifier: params.mapId,
        posX,
        posY,
        width,
        height,
      },
    });

    return NextResponse.json({ message: 'Obstacle created successfully', obstacle: newObstacle }, { status: 201 });
  } catch (error: any) {
    console.error(`Failed to create obstacle for map ${params.mapId}:`, error);
    return NextResponse.json({ error: 'Failed to create obstacle', details: error.message }, { status: 500 });
  }
}
