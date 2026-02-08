import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseJsonField, serializeJsonField } from '@/lib/helpers';

// GET all products
export async function GET() {
  try {
    const products = await db.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Parse images JSON
    const productsWithParsedImages = products.map((product) => ({
      ...product,
      images: parseJsonField<string[]>(product.images, []),
    }));

    return NextResponse.json(
      {
        products: productsWithParsedImages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}

// POST create new product (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, hargaModal, dp, images } = body;

    if (!name || !hargaModal) {
      return NextResponse.json(
        { error: 'Nama dan harga modal wajib diisi' },
        { status: 400 }
      );
    }

    // Serialize images array to JSON string
    const imagesJson = serializeJsonField(images || []);

    const product = await db.product.create({
      data: {
        name,
        description,
        hargaModal: parseFloat(hargaModal),
        dp: dp ? parseFloat(dp) : 0,
        images: imagesJson,
      },
    });

    const productWithParsedImages = {
      ...product,
      images: parseJsonField<string[]>(product.images, []),
    };

    return NextResponse.json(
      {
        message: 'Produk berhasil ditambahkan',
        product: productWithParsedImages,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menambah produk' },
      { status: 500 }
    );
  }
}
