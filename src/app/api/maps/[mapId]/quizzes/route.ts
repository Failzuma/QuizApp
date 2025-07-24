
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

    // Find all nodes that belong to the given mapId, and include their related questions
    const mapNodesWithQuizzes = await prisma.mapNode.findMany({
      where: {
        map_identifier: mapIdentifier,
      },
      include: {
        questions: { // Include the questions related to each node
          select: {
            question_id: true,
            question_text: true,
            options: true,
            // DO NOT send correct_answer to the client
          }
        },
      },
    });

    if (mapNodesWithQuizzes.length === 0) {
      // It's not an error if a map has no nodes yet, return empty array
      return NextResponse.json([]);
    }
    
    // The structure is already what the client needs: an array of nodes,
    // each with its position, ID, and a list of associated questions.
    return NextResponse.json(mapNodesWithQuizzes);

  } catch (error: any) {
    console.error(`Error fetching quizzes and nodes for map ${params.mapId}:`, error);
    return NextResponse.json({ error: 'Gagal mengambil data kuis dan node', details: error.message }, { status: 500 });
  }
}
