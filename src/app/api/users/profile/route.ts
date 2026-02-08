import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// GET user profile
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user-session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = JSON.parse(sessionCookie.value);

    const userData = await db.user.findUnique({
      where: { id: user.id },
    });

    if (!userData) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = userData;

    return NextResponse.json(
      {
        user: userWithoutPassword,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// PUT update user profile
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user-session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = JSON.parse(sessionCookie.value);

    const body = await request.json();
    const {
      namaLengkap,
      jenisUsaha,
      alamatRumah,
      alamatUsaha,
      noHape,
      nomorKtp,
      namaSales,
    } = body;

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        ...(namaLengkap && { namaLengkap }),
        ...(jenisUsaha && { jenisUsaha }),
        ...(alamatRumah && { alamatRumah }),
        ...(alamatUsaha && { alamatUsaha }),
        ...(noHape && { noHape }),
        ...(nomorKtp && { nomorKtp }),
        ...(namaSales !== undefined && { namaSales }),
      },
    });

    // Update session cookie
    const { password: _, ...userWithoutPassword } = updatedUser;
    cookieStore.set('user-session', JSON.stringify(userWithoutPassword), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return NextResponse.json(
      {
        message: 'Profil berhasil diperbarui',
        user: userWithoutPassword,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memperbarui profil' },
      { status: 500 }
    );
  }
}
