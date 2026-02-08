import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { parseJsonField, serializeJsonField, toIndonesianDate, formatTime } from '@/lib/helpers';

// POST log payment (kolektor only)
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
        { error: 'Hanya kolektor yang bisa mencatat pembayaran' },
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

    const payments = parseJsonField(order.payments, []);

    // Check if already paid in full
    if (payments.length >= order.tenor) {
      return NextResponse.json(
        { error: 'Tagihan ini sudah lunas' },
        { status: 400 }
      );
    }

    const paymentInfo = {
      date: toIndonesianDate(new Date()),
      time: formatTime(new Date()),
      collectedBy: user.namaLengkap || user.email,
    };

    // Add payment(s) based on frequency
    const newPayments = [];
    const paymentsToAdd = order.paymentFrequency === 'mingguan' ? 6 : 1;

    for (let i = 0; i < paymentsToAdd; i++) {
      if (payments.length + newPayments.length < order.tenor) {
        newPayments.push(paymentInfo);
      }
    }

    const updatedPayments = [...payments, ...newPayments];

    // Update order status if fully paid
    const newStatus =
      updatedPayments.length >= order.tenor ? 'Lunas' : 'Terkirim';

    const updatedOrder = await db.order.update({
      where: { id: params.id },
      data: {
        payments: serializeJsonField(updatedPayments),
        status: newStatus,
      },
    });

    return NextResponse.json(
      {
        message: `Pembayaran ${order.paymentFrequency} dicatat. Status: ${newStatus}`,
        order: {
          ...updatedOrder,
          payments: parseJsonField(updatedOrder.payments, []),
          collectionNotes: parseJsonField(updatedOrder.collectionNotes, []),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Log payment error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mencatat pembayaran' },
      { status: 500 }
    );
  }
}
