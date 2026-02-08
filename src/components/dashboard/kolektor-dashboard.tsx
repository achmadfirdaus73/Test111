'use client';

import { useState, useEffect } from 'react';
import { ListTodo, History, UserCircle, Search, Calendar, CheckCircle2, XCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import BottomNav, { getNavItems } from '@/components/navigation/bottom-nav';
import { useStore } from '@/lib/store';
import { collection, getDocs, query, where, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toIndonesianDate, formatTime, getStatusColor } from '@/lib/helpers';

interface KolektorDashboardProps {
  onLogout: () => void;
}

export default function KolektorDashboard({ onLogout }: KolektorDashboardProps) {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState('tagihan');
  const [searchTerm, setSearchTerm] = useState('');
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  
  // Modal states
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [unpaidReasonModalOpen, setUnpaidReasonModalOpen] = useState(false);
  const [unpaidReason, setUnpaidReason] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Load assigned orders
  useEffect(() => {
    if (!user) return;

    const loadOrders = async () => {
      const q = query(
        collection(db, 'orders'),
        where('assignedCollectorUid', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      const ordersData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        firebaseDocId: doc.id, 
        ...doc.data(),
        payments: doc.data().payments || [],
        collectionNotes: doc.data().collectionNotes || []
      }));
      setAllOrders(ordersData);
    };

    loadOrders();
  }, [user]);

  const activeBills = allOrders.filter(o => o.status === 'Terkirim' && o.payments.length < o.tenor);
  
  const filteredBills = activeBills.filter(bill => {
    const consumerName = bill.consumerName || '';
    return consumerName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Daily report
  const todayString = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const dailyReport = {
    subtotal: 0,
    unpaidList: [] as any[],
  };

  const selectedDateString = new Date(historyDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  allOrders.forEach(order => {
    const paymentToday = (order.payments || []).find((p: any) => 
      p.date === selectedDateString && p.collectedBy === (user?.namaLengkap || user?.email)
    );
    if (paymentToday) {
      dailyReport.subtotal += order.installmentPrice || 0;
    }

    const noteToday = (order.collectionNotes || []).find((n: any) => 
      n.date === selectedDateString && n.collectedBy === (user?.namaLengkap || user?.email)
    );
    if (noteToday) {
      dailyReport.unpaidList.push({ 
        consumerName: order.consumerName || 'Konsumen', 
        reason: noteToday.reason 
      });
    }
  });

  // Stats
  const dailyStats = {
    total: activeBills.length,
    paid: activeBills.filter(bill => 
      (bill.payments || []).some((p: any) => p.date === todayString)
    ).length,
    unpaid: activeBills.filter(bill => 
      (bill.collectionNotes || []).some((n: any) => n.date === todayString)
    ).length,
  };

  const performance = dailyStats.paid + dailyStats.unpaid > 0 
    ? Math.round((dailyStats.paid / (dailyStats.paid + dailyStats.unpaid)) * 100) 
    : 0;

  const failureRate = dailyStats.total > 0 
    ? Math.round((dailyStats.unpaid / dailyStats.total) * 100) 
    : 0;

  const handlePayment = async (bill: any) => {
    if (!bill || !user) return;

    const payments = bill.payments || [];
    if (payments.length >= bill.tenor) {
      toast.error('Tagihan ini sudah lunas!');
      return;
    }

    setPaymentProcessing(true);

    try {
      const paymentInfo = {
        date: toIndonesianDate(new Date()),
        time: formatTime(new Date()),
        collectedBy: user.namaLengkap || user.email,
      };

      const paymentsToAdd = bill.paymentFrequency === 'mingguan' ? 6 : 1;
      const newPayments = [];
      for (let i = 0; i < paymentsToAdd; i++) {
        if (payments.length + newPayments.length < bill.tenor) {
          newPayments.push(paymentInfo);
        }
      }

      const updatedPayments = [...payments, ...newPayments];
      const newStatus = updatedPayments.length >= bill.tenor ? 'Lunas' : 'Terkirim';

      await updateDoc(doc(db, 'orders', bill.firebaseDocId), {
        payments: updatedPayments,
        status: newStatus,
      });

      setPaymentProcessing(false);
      setBillModalOpen(false);
      toast.success(`Pembayaran ${bill.paymentFrequency} dicatat. Status: ${newStatus}`);

      // Reload orders
      const snapshot = await getDocs(query(
        collection(db, 'orders'),
        where('assignedCollectorUid', '==', user.uid),
        orderBy('timestamp', 'desc')
      ));
      setAllOrders(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        firebaseDocId: doc.id, 
        ...doc.data(),
        payments: doc.data().payments || [],
        collectionNotes: doc.data().collectionNotes || []
      })));
    } catch (error) {
      setPaymentProcessing(false);
      toast.error('Gagal mencatat pembayaran.');
    }
  };

  const handleUnpaidVisit = async () => {
    if (!selectedBill || !user || !unpaidReason) return;

    try {
      const collectionNotes = selectedBill.collectionNotes || [];
      const newNote = {
        date: toIndonesianDate(new Date()),
        time: formatTime(new Date()),
        reason: unpaidReason,
        collectedBy: user.namaLengkap || user.email,
      };

      await updateDoc(doc(db, 'orders', selectedBill.firebaseDocId), {
        collectionNotes: [...collectionNotes, newNote],
      });

      setUnpaidReasonModalOpen(false);
      setBillModalOpen(false);
      setUnpaidReason('');
      toast.success('Catatan kunjungan disimpan.');

      // Reload orders
      const snapshot = await getDocs(query(
        collection(db, 'orders'),
        where('assignedCollectorUid', '==', user.uid),
        orderBy('timestamp', 'desc')
      ));
      setAllOrders(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        firebaseDocId: doc.id, 
        ...doc.data(),
        payments: doc.data().payments || [],
        collectionNotes: doc.data().collectionNotes || []
      })));
    } catch (error) {
      toast.error('Gagal menyimpan catatan.');
    }
  };

  return (
    <div className="pb-20">
      {/* Header with Logout */}
      <div className="sticky top-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard Kolektor</h1>
          <p className="text-xs text-gray-600">Selamat datang, {user?.namaLengkap || user?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>

      {/* Bills Tab */}
      {activeTab === 'tagihan' && (
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ListTodo className="w-6 h-6" />
            Daftar Tagihan Anda
          </h2>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Cari nama konsumen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </div>

          {filteredBills.length > 0 ? (
            <div className="space-y-3">
              {filteredBills.map((bill) => (
                <Card key={bill.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                  setSelectedBill(bill);
                  setBillModalOpen(true);
                }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {bill.consumerName || 'Konsumen'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {bill.productName || 'Produk'} - {bill.jenisUsaha || 'N/A'} ({bill.paymentFrequency || 'harian'})
                        </p>
                      </div>
                      <Button size="sm">Lihat Detail</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <ListTodo className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Tidak ada tagihan yang cocok.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'riwayat' && (
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <History className="w-6 h-6" />
            Laporan Harian
          </h2>

          <div className="mb-4">
            <Label>Pilih Tanggal</Label>
            <Input
              type="date"
              value={historyDate}
              onChange={(e) => setHistoryDate(e.target.value)}
              className="h-12"
            />
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Ringkasan {selectedDateString}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    Rp {dailyReport.subtotal.toLocaleString('id-ID')}
                  </p>
                  <p className="text-sm text-gray-600">Uang Tertagih</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {dailyStats.paid + dailyStats.unpaid}
                  </p>
                  <p className="text-sm text-gray-600">Kunjungan</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-teal-600">{performance}%</p>
                  <p className="text-sm text-gray-600">Berhasil Tertagih</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daftar Konsumen Tidak Bayar</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyReport.unpaidList.length > 0 ? (
                <div className="space-y-2">
                  {dailyReport.unpaidList.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{item.consumerName}</span>
                      <span className="text-sm text-red-600">Alasan: {item.reason || '-'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  Tidak ada kunjungan tanpa pembayaran pada tanggal ini.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profil' && (
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <UserCircle className="w-6 h-6" />
            Profil & Statistik Harian
          </h2>

          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-4xl font-bold text-teal-600">{dailyStats.total}</p>
                  <p className="text-sm text-gray-600">Total Aktif</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-green-600">{performance}%</p>
                  <p className="text-sm text-gray-600">Berhasil Tertagih</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-red-600">{failureRate}%</p>
                  <p className="text-sm text-gray-600">Gagal Tertagih</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <UserCircle className="w-12 h-12 text-gray-400" />
                <div>
                  <p className="font-semibold text-gray-900">
                    {user?.namaLengkap || user?.email || 'Kolektor'}
                  </p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">
                    {dailyStats.total}
                  </p>
                  <p className="text-sm text-gray-600">Tagihan Aktif</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">
                    {performance}%
                  </p>
                  <p className="text-sm text-gray-600">Performance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom Navigation */}
      {user && (
        <BottomNav
          items={getNavItems(user.role)}
          activeItem={activeTab}
          onItemClick={(item) => setActiveTab(item.value)}
        />
      )}

      {/* Bill Modal */}
      <Dialog open={billModalOpen} onOpenChange={setBillModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Tagihan</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Produk</p>
                <p className="font-semibold text-gray-900">{selectedBill.productName || 'Produk'}</p>
                <p className="text-sm text-gray-500">ID: {selectedBill.orderId || '-'}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-gray-600">Info Konsumen</p>
                <p className="font-medium">{selectedBill.consumerName || 'N/A'} ({selectedBill.jenisUsaha || 'N/A'})</p>
                <p className="text-sm text-gray-500">{selectedBill.alamatUsaha || 'Alamat tidak tersedia'}</p>
                <p className="text-sm text-gray-500">{selectedBill.noHape || 'No HP tidak tersedia'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {selectedBill.paymentFrequency === 'mingguan' 
                      ? `Minggu Ke-${Math.floor((selectedBill.payments || []).length / 6) + 1} dari ${Math.ceil((selectedBill.tenor || 0) / 6)}`
                      : `Angsuran Ke-${(selectedBill.payments || []).length + 1} dari ${selectedBill.tenor || 0}`
                    }
                  </p>
                  <p className="text-2xl font-bold text-teal-600">
                    Rp {(selectedBill.installmentPrice || 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Progress</p>
                <Progress value={((selectedBill.payments || []).length / (selectedBill.tenor || 1)) * 100} className="h-3" />
                <p className="text-sm text-gray-500 mt-1">
                  {(selectedBill.payments || []).length} / {selectedBill.tenor || 0} angsuran
                </p>
              </div>

              {!paymentProcessing && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => handlePayment(selectedBill)}
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Bayar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setUnpaidReasonModalOpen(true)}
                    className="flex-1 h-12 text-red-600 hover:text-red-700"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Tidak Bayar
                  </Button>
                </div>
              )}

              {paymentProcessing && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Memproses pembayaran...</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unpaid Reason Modal */}
      <Dialog open={unpaidReasonModalOpen} onOpenChange={setUnpaidReasonModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alasan Tidak Bayar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={unpaidReason} onValueChange={setUnpaidReason}>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="Konsumen tidak di tempat" />
                  <Label className="flex-1 cursor-pointer">Konsumen tidak di tempat</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="Minta tunda pembayaran" />
                  <Label className="flex-1 cursor-pointer">Minta tunda pembayaran</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="Tidak ada uang" />
                  <Label className="flex-1 cursor-pointer">Tidak ada uang</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="Lainnya" />
                  <Label className="flex-1 cursor-pointer">Lainnya</Label>
                </div>
              </div>
            </RadioGroup>

            {unpaidReason === 'Lainnya' && (
              <Textarea
                placeholder="Sebutkan alasan lain"
                rows={2}
              />
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setUnpaidReasonModalOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleUnpaidVisit}>
                Simpan Alasan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
