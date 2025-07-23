
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

    if (!user) {
        return NextResponse.json({ error: 'Kredensial tidak valid' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
        return NextResponse.json({ error: 'Kredensial tidak valid' }, { status: 401 });
    }

    // Explicit check for JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in the environment variables.');
      return NextResponse.json(
        { error: 'Konfigurasi server tidak lengkap. Gagal memproses login.' },
        { status: 500 }
      );
    }
    
    // Create token
    const token = jwt.sign({ userId: user.user_id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Remove password hash from the returned user object
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({ message: 'Login berhasil', token, user: userWithoutPassword });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal pada server.', details: error.message },
      { status: 500 }
    );
  }
}
