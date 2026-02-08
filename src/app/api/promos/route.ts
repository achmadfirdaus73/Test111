import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// GET all promos
export async function GET() {
  try {
    const promos = await db.promo.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      {
        promos,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get promos error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// POST create new promo (admin only)
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
        { error: 'Hanya admin yang bisa menambah promo' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, url } = body;

    if (!type || !url) {
      return NextResponse.json(
        { error: 'Tipe dan URL wajib diisi' },
        { status: 400 }
      );
    }

    if (!['image', 'video'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipe harus image atau video' },
        { status: 400 }
      );
    }

    const promo = await db.promo.create({
      data: { type, url },
    });

    return NextResponse.json(
      {
        message: 'Promo berhasil ditambahkan',
        promo,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create promo error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menambah promo' },
      { status: 500 }
    );
  }
}
