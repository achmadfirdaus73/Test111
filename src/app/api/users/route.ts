import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// GET users by role (admin/kolektor only)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user-session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = JSON.parse(sessionCookie.value);

    if (user.role !== 'admin' && user.role !== 'kolektor') {
      return NextResponse.json(
        { error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let users;
    if (role) {
      users = await db.user.findMany({
        where: { role },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      users = await db.user.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    // Remove passwords from response
    const usersWithoutPasswords = users.map((u) => {
      const { password: _, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });

    return NextResponse.json(
      {
        users: usersWithoutPasswords,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
