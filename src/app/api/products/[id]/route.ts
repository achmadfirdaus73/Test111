import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseJsonField, serializeJsonField } from '@/lib/helpers';

// GET single product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await db.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    const productWithParsedImages = {
      ...product,
      images: parseJsonField<string[]>(product.images, []),
    };

    return NextResponse.json(
      {
        product: productWithParsedImages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}

// PUT update product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, hargaModal, dp, images } = body;

    // Serialize images array to JSON string
    const imagesJson = serializeJsonField(images || []);

    const product = await db.product.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(hargaModal && { hargaModal: parseFloat(hargaModal) }),
        ...(dp !== undefined && { dp: dp ? parseFloat(dp) : 0 }),
        ...(images && { images: imagesJson }),
      },
    });

    const productWithParsedImages = {
      ...product,
      images: parseJsonField<string[]>(product.images, []),
    };

    return NextResponse.json(
      {
        message: 'Produk berhasil diperbarui',
        product: productWithParsedImages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memperbarui produk' },
      { status: 500 }
    );
  }
}

// DELETE product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json(
      {
        message: 'Produk berhasil dihapus',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus produk' },
      { status: 500 }
    );
  }
}
