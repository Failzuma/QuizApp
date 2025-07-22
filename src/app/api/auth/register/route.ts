import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json();
    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { username, email, password_hash: hashedPassword },
    });
    return NextResponse.json({ message: 'Registrasi berhasil', user: { id: newUser.user_id, username: newUser.username } }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Username atau email sudah ada' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat registrasi', details: error.message }, { status: 500 });
  }
}
