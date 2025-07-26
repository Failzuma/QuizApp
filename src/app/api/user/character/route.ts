
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as jose from 'jose';

const prisma = new PrismaClient();

// Function to get the user ID from the token
async function getUserIdFromToken(token: string): Promise<number | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    // CORRECTED: Use 'userId' (camelCase) to match the JWT payload
    return payload.userId as number;
  } catch (error) {
    console.error('Failed to verify token:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const userId = await getUserIdFromToken(token);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
  }

  const { character } = await req.json();

  if (!character) {
    return NextResponse.json({ error: 'Character not provided' }, { status: 400 });
  }

  try {
    const updatedUser = await prisma.user.update({
      // The database schema uses user_id, so this remains correct
      where: { user_id: userId },
      data: { character },
    });
    // Return only the necessary and safe-to-expose user data
    const { password_hash, ...safeUser } = updatedUser;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
