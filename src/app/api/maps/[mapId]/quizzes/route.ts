
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { mapId: string } }
) {
  try {
    const mapIdentifier = params.mapId;

    if (!mapIdentifier) {
        return NextResponse.json({ error: 'Map ID is required' }, { status: 400 });
    }

    // Find all nodes that belong to the given mapId
    const mapNodes = await prisma.mapNode.findMany({
      where: {
        map_identifier: mapIdentifier,
      },
      select: {
        node_id: true, // Select only the IDs
        title: true, // We might need this for context
      },
    });

    if (mapNodes.length === 0) {
      // It's not an error if a map has no nodes yet, return empty array
      return NextResponse.json([]);
    }

    const nodeIds = mapNodes.map(node => node.node_id);

    // Get all questions linked to these nodes
    const questions = await prisma.question.findMany({
      where: {
        node_id: {
          in: nodeIds,
        },
      },
       select: {
            question_id: true,
            node_id: true,
            question_text: true,
            options: true,
            // DO NOT send correct_answer to the client
        }
    });

    // We need a way to link the string nodeId from the game (e.g., 'node_intro')
    // back to the questions. The client needs the original string nodeId.
    // The current schema doesn't store the string nodeId, only the integer ID.
    // This is a schema design issue.
    // For now, we will assume the client can work with the numeric `node_id`.

    return NextResponse.json(questions);
  } catch (error: any) {
    console.error(`Error fetching quizzes for map ${params.mapId}:`, error);
    return NextResponse.json({ error: 'Gagal mengambil data kuis', details: error.message }, { status: 500 });
  }
}
