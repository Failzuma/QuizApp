
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


// GET endpoint for fetching nodes (can be public or protected)
export async function GET(
  request: Request,
  { params }: { params: { mapId: string } }
) {
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
    return NextResponse.json(nodes);
  } catch (error: any) {
    console.error(`Failed to fetch nodes for map ${params.mapId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch node data', details: error.message }, { status: 500 });
  }
}

// Validation schema for a single node in the payload
const nodeSchema = z.object({
    node_id: z.number().optional(),
    posX: z.number(),
    posY: z.number(),
    title: z.string().nullable().optional(),
});

const nodePayloadSchema = z.array(nodeSchema);

// POST endpoint for bulk creating/updating nodes
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
    const validation = nodePayloadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid payload format', details: validation.error.flatten() }, { status: 400 });
    }

    const nodesToProcess = validation.data;
    
    // Get existing nodes for this map to determine which to delete
    const existingNodes = await prisma.mapNode.findMany({
        where: { map_identifier: mapIdentifier },
        select: { node_id: true }
    });
    const existingNodeIds = new Set(existingNodes.map(n => n.node_id));
    const incomingNodeIds = new Set(nodesToProcess.map(n => n.node_id).filter(id => id !== undefined));

    const nodesToDelete = Array.from(existingNodeIds).filter(id => !incomingNodeIds.has(id));

    const transactionOps = [];

    // Operation: Delete nodes that are no longer in the draft
    if (nodesToDelete.length > 0) {
        transactionOps.push(
            prisma.mapNode.deleteMany({
                where: {
                    node_id: { in: nodesToDelete }
                }
            })
        );
    }

    // Operations: Update existing nodes and create new ones
    for (const node of nodesToProcess) {
        if (node.node_id && existingNodeIds.has(node.node_id)) {
            // Update existing node
            transactionOps.push(
                prisma.mapNode.update({
                    where: { node_id: node.node_id },
                    data: {
                        posX: node.posX,
                        posY: node.posY,
                        title: node.title,
                    }
                })
            );
        } else {
            // Create new node
            transactionOps.push(
                prisma.mapNode.create({
                    data: {
                        map_identifier: mapIdentifier,
                        posX: node.posX,
                        posY: node.posY,
                        title: node.title,
                    }
                })
            );
        }
    }
    
    // Execute all operations in a single transaction
    await prisma.$transaction(transactionOps);
    
    // Fetch the final state of the nodes to return to the client
    const finalNodes = await prisma.mapNode.findMany({
        where: { map_identifier: mapIdentifier },
        orderBy: { node_id: 'asc' }
    });

    return NextResponse.json({ message: 'Nodes saved successfully', nodes: finalNodes });

  } catch (error: any) {
    console.error(`Failed to save nodes for map ${params.mapId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') { // Foreign key constraint on map_identifier
             return NextResponse.json({ error: `Map with identifier '${mapIdentifier}' does not exist.` }, { status: 404 });
        }
    }
    return NextResponse.json({ error: 'Failed to save nodes', details: error.message }, { status: 500 });
  }
}
