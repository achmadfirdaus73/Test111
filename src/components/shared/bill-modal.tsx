'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarCheck, AlertCircle, CheckCircle, Info, Calendar } from 'lucide-react';
import { parseIndonesianDate, getStatusColor } from '@/lib/helpers';

interface Order {
  id: string;
  orderId: string;
  productName: string;
  tenor: number;
  installmentPrice: number;
  paymentFrequency: 'harian' | 'mingguan';
  status: string;
  tanggalLunas?: string;
  payments: any[];
  collectionNotes: any[];
  consumerName: string;
  consumerEmail: string;
  jenisUsaha: string;
  alamatUsaha: string;
  noHape: string;
}

interface BillModalProps {
  bill: Order | null;
  open: boolean;
  onClose: () => void;
}

export default function BillModal({ bill, open, onClose }: BillModalProps) {
  if (!bill) return null;

  const progress = ((bill.payments || []).length / bill.tenor) * 100;

  // Get order start date from timestamp
  const orderDate = bill.timestamp?.toDate?.() || new Date(bill.timestamp);
  const today = new Date();

  // Calculate working days elapsed from order start to today (excluding Sunday)
  let workingDaysElapsed = 0;
  const tempDate = new Date(orderDate);

  while (tempDate <= today) {
    const dayOfWeek = tempDate.getDay();
    // Exclude Sunday (dayOfWeek === 0)
    if (dayOfWeek !== 0) {
      workingDaysElapsed++;
    }
    tempDate.setDate(tempDate.getDate() + 1);
  }

  const paymentsMade = (bill.payments || []).length;
  const remainingPayments = bill.tenor - paymentsMade;
  const estimatedRemainingWorkingDays = remainingPayments * 5 / 7; // Approximate: 5 working days per week

  const combinedHistory = [
    ...(bill.payments || []).map((p: any) => ({ ...p, status: 'paid' })),
    ...(bill.collectionNotes || []).map((n: any) => ({ ...n, status: 'unpaid' })),
  ].sort((a, b) => {
    const dateA = parseIndonesianDate(a.date);
    const dateB = parseIndonesianDate(b.date);
    return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Tagihan: {bill.productName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order Info */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">ID Pesanan</p>
              <p className="font-semibold text-gray-900">{bill.orderId}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <Badge style={{ backgroundColor: getStatusColor(bill.status) }}>
                {bill.status}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Angsuran</p>
              <p className="text-lg font-semibold text-gray-900">
                Rp {bill.installmentPrice.toLocaleString('id-ID')} / {bill.paymentFrequency}
              </p>
              <p className="text-sm text-gray-500">Tenor: {bill.tenor} hari kerja</p>
            </div>
          </div>

          {/* Consumer Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Info Konsumen</h3>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Nama</p>
              <p className="font-medium">{bill.consumerName}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Jenis Usaha</p>
              <p className="font-medium">{bill.jenisUsaha}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Alamat Usaha</p>
              <p className="font-medium text-sm">{bill.alamatUsaha}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">No. HP</p>
              <p className="font-medium">{bill.noHape}</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progress Pembayaran</span>
            <span className="font-semibold">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />

          {/* Working Days Info */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">Hari Kerja (Tanpa Minggu)</p>
                <p className="text-sm text-gray-700 mb-2">
                  Hari Minggu <strong>tidak</strong> dihitung sebagai hari kerja untuk penagihan.
                </p>
                <p className="text-sm text-gray-700">
                  <span className="inline-flex items-center gap-1">
                    <span>Pembayaran:</span>
                    <Badge variant="outline" className="ml-2">
                      {paymentsMade} dari {bill.tenor} ({Math.round((paymentsMade / bill.tenor) * 100)}%)
                    </Badge>
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span>Total Tenor: <strong>{bill.tenor} hari kalender</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarCheck className="w-4 h-4 text-blue-600" />
                    <span>Hari Kerja Berlalu: <strong>{workingDaysElapsed} hari</strong></span>
                  </div>
                </div>
                {remainingPayments > 0 && (
                  <p className="text-sm text-orange-700 mt-2">
                    Sisa: ~{Math.round(estimatedRemainingWorkingDays)} hari kerja untuk lunas
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Riwayat Kunjungan & Pembayaran</h3>
          
          {combinedHistory.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {combinedHistory.map((item: any, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`mt-1 ${
                    item.status === 'paid' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.status === 'paid' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{item.date}</p>
                      <p className="text-sm text-gray-500">{item.time}</p>
                    </div>
                    <p className={`text-sm ${
                      item.status === 'paid' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {item.status === 'paid' 
                        ? `Pembayaran diterima oleh ${item.collectedBy}`
                        : `Kunjungan Penagihan - ${item.reason}`
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Belum ada riwayat kunjungan.
            </p>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
