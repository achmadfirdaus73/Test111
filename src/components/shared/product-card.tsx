'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { TENOR_OPTIONS, customRound } from '@/lib/helpers';

interface Product {
  id: string;
  name: string;
  description?: string;
  hargaModal: number;
  dp?: number;
  images: string[];
}

interface ProductCardProps {
  product: Product;
  onView: (product: Product) => void;
}

export default function ProductCard({ product, onView }: ProductCardProps) {
  const calculateMinInstallment = (product: Product): number => {
    const option = TENOR_OPTIONS[0];
    const rawDailyPrice = ((product.hargaModal - (product.dp || 0)) * option.multiplier) / option.days;
    return customRound(rawDailyPrice);
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
      onClick={() => onView(product)}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {product.images && product.images.length > 0 && product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <svg className="w-full h-full" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="300" fill="#f3f4f6"/>
            <text x="200" y="150" fontFamily="Arial, sans-serif" fontSize="24" fill="#9ca3af" textAnchor="middle" dominantBaseline="middle">
              Gambar Tidak Tersedia
            </text>
          </svg>
        )}
        <Badge className="absolute top-3 right-3 bg-orange-500 text-white">
          PROMO
        </Badge>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2 min-h-[2.5rem]">
          {product.description || 'Tidak ada deskripsi'}
        </p>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-teal-600">
            Rp {calculateMinInstallment(product).toLocaleString('id-ID')}
            <span className="text-sm font-normal text-gray-500">/hari</span>
          </p>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Lihat Opsi Angsuran
        </Button>
      </CardFooter>
    </Card>
  );
}
