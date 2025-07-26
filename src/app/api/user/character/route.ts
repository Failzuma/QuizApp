
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { character } = await req.json();

  if (!character) {
    return NextResponse.json({ error: 'Character not provided' }, { status: 400 });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { user_id: session.user.user_id },
      data: { character },
    });
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
