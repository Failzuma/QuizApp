import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password dibutuhkan' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return NextResponse.json({ error: 'Kredensial tidak valid' }, { status: 401 });
    }
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET not defined');
    }
    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET!, { expiresIn: '1d' });
    const { password_hash, ...userWithoutPassword } = user;
    return NextResponse.json({ message: 'Login berhasil', token, user: userWithoutPassword });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat login', details: error.message }, { status: 500 });
  }
}
