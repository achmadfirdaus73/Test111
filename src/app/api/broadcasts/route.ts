import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// GET all broadcasts
export async function GET() {
  try {
    const broadcasts = await db.broadcast.findMany({
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json(
      {
        broadcasts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get broadcasts error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// POST create new broadcast (admin only)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user-session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = JSON.parse(sessionCookie.value);

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang bisa mengirim broadcast' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Pesan wajib diisi' },
        { status: 400 }
      );
    }

    const broadcast = await db.broadcast.create({
      data: { message },
    });

    return NextResponse.json(
      {
        message: 'Broadcast terkirim',
        broadcast,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create broadcast error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengirim broadcast' },
      { status: 500 }
    );
  }
}
