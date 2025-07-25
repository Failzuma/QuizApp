
import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

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

const nodePositionSchema = z.object({
  title: z.string().optional(),
  posX: z.coerce.number().min(0),
  posY: z.coerce.number().min(0),
});

const mapBlueprintSchema = z.object({
  title: z.string().min(3),
  mapIdentifier: z.string().min(3).regex(/^[a-z0-9_]+$/),
  nodes: z.array(nodePositionSchema).min(1).max(20),
});

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
        return NextResponse.json(mapsData);

    } catch (error: any) {
        console.error('Failed to fetch maps:', error);
        return NextResponse.json({ error: "Gagal mengambil data peta", details: error.message }, { status: 500 });
    }
}


export async function POST(request: Request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ error: 'Tidak terautentikasi atau tidak diizinkan' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const validation = mapBlueprintSchema.safeParse(body);
        
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data provided', details: validation.error.flatten() }, { status: 400 });
        }

        const { mapIdentifier, title, nodes } = validation.data;

        const existingMap = await prisma.map.findUnique({
            where: { map_identifier: mapIdentifier }
        });

        if (existingMap) {
            return NextResponse.json({ error: `Map with identifier "${mapIdentifier}" already exists.` }, { status: 409 });
        }

        const newMap = await prisma.map.create({
            data: {
                map_identifier: mapIdentifier,
                title: title,
                nodes: {
                    create: nodes.map(node => ({
                        title: node.title,
                        posX: node.posX,
                        posY: node.posY,
                    }))
                }
            },
            include: {
                nodes: true // Include the created nodes in the response
            }
        });

        return NextResponse.json({ 
            message: `Map '${title}' created successfully.`,
            map: newMap
        }, { status: 201 });

    } catch (error: any) {
        console.error('API /maps POST Error:', error);
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2002') { // Unique constraint failed
                return NextResponse.json({ error: `Map with identifier "${(body as any).mapIdentifier}" already exists.` }, { status: 409 });
             }
         }
        return NextResponse.json({ error: "Gagal memproses permintaan", details: error.message }, { status: 500 });
    }
}
