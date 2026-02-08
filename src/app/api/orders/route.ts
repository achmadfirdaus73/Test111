import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import {
  parseJsonField,
  serializeJsonField,
  generateOrderId,
  toIndonesianDate,
} from '@/lib/helpers';

// GET orders (admin/kolektor get all, konsumen get their own)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user-session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = JSON.parse(sessionCookie.value);

    let orders;

    if (user.role === 'konsumen') {
      // Konsumen hanya bisa melihat orders mereka sendiri
      orders = await db.order.findMany({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
      });
    } else if (user.role === 'kolektor') {
      // Kolektor hanya bisa melihat orders yang diassign ke mereka
      orders = await db.order.findMany({
        where: { assignedCollectorUid: user.id },
        orderBy: { timestamp: 'desc' },
      });
    } else {
      // Admin bisa melihat semua orders
      orders = await db.order.findMany({
        orderBy: { timestamp: 'desc' },
      });
    }

    // Parse JSON fields
    const ordersWithParsedFields = orders.map((order) => ({
      ...order,
      payments: parseJsonField(order.payments, []),
      collectionNotes: parseJsonField(order.collectionNotes, []),
    }));

    return NextResponse.json(
      {
        orders: ordersWithParsedFields,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// POST create new order (checkout)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user-session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = JSON.parse(sessionCookie.value);

    if (user.role !== 'konsumen') {
      return NextResponse.json(
        { error: 'Hanya konsumen yang bisa membuat pesanan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { cartItems, shippingAddress } = body;

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Keranjang kosong' },
        { status: 400 }
      );
    }

    // Get full user data from database
    const userData = await db.user.findUnique({
      where: { id: user.id },
    });

    if (!userData) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    const createdOrders = [];

    for (const item of cartItems) {
      const order = await db.order.create({
        data: {
          orderId: generateOrderId(),
          date: toIndonesianDate(new Date()),
          productName: item.product.name,
          tenor: item.tenor,
          installmentPrice: item.installmentPrice,
          paymentFrequency: item.paymentFrequency,
          status: 'Proses',
          payments: serializeJsonField([]),
          collectionNotes: serializeJsonField([]),
          userId: user.id,
          consumerName: userData.namaLengkap || user.email,
          consumerEmail: user.email,
          shippingAddress: shippingAddress,
          jenisUsaha: userData.jenisUsaha || '',
          alamatUsaha: userData.alamatUsaha || '',
          alamatRumah: userData.alamatRumah || '',
          nomorKtp: userData.nomorKtp || '',
          namaSales: userData.namaSales,
        },
      });

      createdOrders.push({
        ...order,
        payments: parseJsonField(order.payments, []),
        collectionNotes: parseJsonField(order.collectionNotes, []),
      });
    }

    return NextResponse.json(
      {
        message: 'Pesanan berhasil dibuat',
        orders: createdOrders,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat pesanan' },
      { status: 500 }
    );
  }
}
