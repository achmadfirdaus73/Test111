'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, X } from 'lucide-react';
import { TENOR_OPTIONS, customRound, calculateInstallment } from '@/lib/helpers';

interface Product {
  id: string;
  name: string;
  description?: string;
  hargaModal: number;
  dp?: number;
  images: string[];
}

interface ProductModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (item: any) => void;
}

export default function ProductModal({ product, open, onClose, onAddToCart }: ProductModalProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [selectedTenor, setSelectedTenor] = useState(60);
  const [paymentFrequency, setPaymentFrequency] = useState<'harian' | 'mingguan'>('harian');

  if (!product) return null;

  const option = TENOR_OPTIONS.find(opt => opt.days === selectedTenor);
  const rawDailyPrice = calculateInstallment(product.hargaModal, product.dp || 0, selectedTenor, option?.multiplier || 1.2);
  const dailyPrice = customRound(rawDailyPrice);
  const weeklyPrice = dailyPrice * 6;

  const handleAddToCart = () => {
    onAddToCart({
      product,
      tenor: selectedTenor,
      paymentFrequency,
      installmentPrice: paymentFrequency === 'mingguan' ? weeklyPrice : dailyPrice,
      cartId: Date.now(),
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-2xl">{product.name}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
              <img
                src={product.images[activeImage] || '/placeholder.png'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      activeImage === idx ? 'border-teal-600' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <p className="text-gray-600 leading-relaxed">
              {product.description || 'Tidak ada deskripsi produk.'}
            </p>

            {product.dp > 0 && (
              <Card>
                <CardContent className="p-4">
                  <Label className="text-sm text-gray-600">Uang Muka (DP)</Label>
                  <p className="text-xl font-semibold text-gray-900">
                    Rp {(product.dp || 0).toLocaleString('id-ID')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Tenor Selection */}
            <div className="space-y-2">
              <Label>Pilih Tenor</Label>
              <RadioGroup value={selectedTenor.toString()} onValueChange={(v) => setSelectedTenor(parseInt(v))}>
                {TENOR_OPTIONS.map((opt) => (
                  <div key={opt.days} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value={opt.days.toString()} id={`tenor-${opt.days}`} />
                    <Label htmlFor={`tenor-${opt.days}`} className="flex-1 cursor-pointer">
                      <span className="font-medium">{opt.text}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        @ Rp {customRound(((product.hargaModal - (product.dp || 0)) * opt.multiplier) / opt.days).toLocaleString('id-ID')}/hari
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Payment Frequency */}
            <div className="space-y-2">
              <Label>Frekuensi Bayar</Label>
              <RadioGroup value={paymentFrequency} onValueChange={(v: any) => setPaymentFrequency(v)}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="harian" id="freq-harian" />
                  <Label htmlFor="freq-harian" className="flex-1 cursor-pointer">
                    <span className="font-medium">Harian</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="mingguan" id="freq-mingguan" />
                  <Label htmlFor="freq-mingguan" className="flex-1 cursor-pointer">
                    <span className="font-medium">Mingguan (6 hari)</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Installment Summary */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6">
                <p className="text-sm text-green-700 font-medium mb-2">Angsuran Anda</p>
                <p className="text-3xl font-bold text-green-900">
                  Rp {(paymentFrequency === 'mingguan' ? weeklyPrice : dailyPrice).toLocaleString('id-ID')}
                  <span className="text-lg font-normal text-green-700">
                    /{paymentFrequency === 'mingguan' ? 'minggu' : 'hari'}
                  </span>
                </p>
              </CardContent>
            </Card>

            <Button
              onClick={handleAddToCart}
              className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white text-lg"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Tambah ke Keranjang
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
