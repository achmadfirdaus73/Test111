import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { parseJsonField, serializeJsonField, toIndonesianDate, formatTime } from '@/lib/helpers';

// POST log collection note (kolektor only)
export async function POST(
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

    if (user.role !== 'kolektor') {
      return NextResponse.json(
        { error: 'Hanya kolektor yang bisa mencatat kunjungan' },
        { status: 403 }
      );
    }

    const order = await db.order.findUnique({
      where: { id: params.id },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    if (order.assignedCollectorUid !== user.id) {
      return NextResponse.json(
        { error: 'Pesanan ini tidak ditugaskan ke anda' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Alasan wajib diisi' },
        { status: 400 }
      );
    }

    const collectionNotes = parseJsonField(order.collectionNotes, []);

    const newNote = {
      date: toIndonesianDate(new Date()),
      time: formatTime(new Date()),
      reason,
      collectedBy: user.namaLengkap || user.email,
    };

    const updatedNotes = [...collectionNotes, newNote];

    const updatedOrder = await db.order.update({
      where: { id: params.id },
      data: {
        collectionNotes: serializeJsonField(updatedNotes),
      },
    });

    return NextResponse.json(
      {
        message: 'Catatan kunjungan disimpan',
        order: {
          ...updatedOrder,
          payments: parseJsonField(updatedOrder.payments, []),
          collectionNotes: parseJsonField(updatedOrder.collectionNotes, []),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Log collection note error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mencatat kunjungan' },
      { status: 500 }
    );
  }
}
