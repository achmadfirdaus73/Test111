import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { calculateMaturityDate, fetchHolidays } from '@/lib/helpers';

// PUT update order status (admin only)
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
        { error: 'Hanya admin yang bisa update status pesanan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status wajib diisi' },
        { status: 400 }
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

    let updateData: any = { status };

    // Calculate maturity date when status is 'Terkirim'
    if (status === 'Terkirim' && !order.tanggalLunas) {
      const holidays = await fetchHolidays();
      const maturityDate = calculateMaturityDate(
        order.timestamp,
        order.tenor,
        holidays
      );
      updateData.tanggalLunas = maturityDate;
    }

    const updatedOrder = await db.order.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(
      {
        message: 'Status pesanan berhasil diperbarui',
        order: updatedOrder,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memperbarui status' },
      { status: 500 }
    );
  }
}
