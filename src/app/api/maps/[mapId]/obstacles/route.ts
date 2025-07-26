
import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

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

// Schema for validating the payload
const obstacleSchema = z.object({
    obstacle_id: z.number().optional(),
    posX: z.number(),
    posY: z.number(),
    width: z.number().min(1),
    height: z.number().min(1),
});
const obstaclePayloadSchema = z.array(obstacleSchema);


// POST for bulk create/update/delete obstacles
export async function POST(
  request: Request,
  { params }: { params: { mapId: string } }
) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  const mapIdentifier = params.mapId;

  try {
    const body = await request.json();
    const validation = obstaclePayloadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid payload format', details: validation.error.flatten() }, { status: 400 });
    }
    
    const obstaclesToProcess = validation.data;

    const existingObstacles = await prisma.mapObstacle.findMany({
        where: { map_identifier: mapIdentifier },
        select: { obstacle_id: true }
    });
    const existingIds = new Set(existingObstacles.map(o => o.obstacle_id));
    const incomingIds = new Set(obstaclesToProcess.map(o => o.obstacle_id).filter(id => id !== undefined));

    const toDelete = Array.from(existingIds).filter(id => !incomingIds.has(id));

    const transactionOps = [];

    // 1. Delete old obstacles
    if (toDelete.length > 0) {
        transactionOps.push(
            prisma.mapObstacle.deleteMany({
                where: { obstacle_id: { in: toDelete } }
            })
        );
    }

    // 2. Upsert (update or create) incoming obstacles
    for (const obstacle of obstaclesToProcess) {
        const data = {
            map_identifier: mapIdentifier,
            posX: obstacle.posX,
            posY: obstacle.posY,
            width: obstacle.width,
            height: obstacle.height,
        };
        if (obstacle.obstacle_id && existingIds.has(obstacle.obstacle_id)) {
            // Update
            transactionOps.push(
                prisma.mapObstacle.update({ where: { obstacle_id: obstacle.obstacle_id }, data })
            );
        } else {
            // Create
             transactionOps.push(
                prisma.mapObstacle.create({ data })
            );
        }
    }
    
    await prisma.$transaction(transactionOps);
    
    const finalObstacles = await prisma.mapObstacle.findMany({
        where: { map_identifier: mapIdentifier }
    });

    return NextResponse.json({ message: 'Obstacles saved successfully', obstacles: finalObstacles });

  } catch (error: any) {
    console.error(`Failed to save obstacles for map ${mapIdentifier}:`, error);
    return NextResponse.json({ error: 'Failed to save obstacles', details: error.message }, { status: 500 });
  }
}
