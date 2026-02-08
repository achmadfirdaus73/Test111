import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// PUT assign collector to order (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user-session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = JSON.parse(sessionCookie.value);

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang bisa assign kolektor' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { collectorUid, collectorName } = body;

    if (!collectorUid || !collectorName) {
      return NextResponse.json(
        { error: 'Collector UID dan nama wajib diisi' },
        { status: 400 }
      );
    }

    const updatedOrder = await db.order.update({
      where: { id: params.id },
      data: {
        assignedCollector: collectorName,
        assignedCollectorUid: collectorUid,
      },
    });

    return NextResponse.json(
      {
        message: 'Kolektor berhasil ditugaskan',
        order: updatedOrder,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Assign collector error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menugaskan kolektor' },
      { status: 500 }
    );
  }
}
