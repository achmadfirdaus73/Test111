'use client';

import { useState, useEffect } from 'react';
import { Package, Inbox, MessageSquare, Users, BarChart3, Plus, Edit, Trash2, Send, LogOut, FileDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import BottomNav, { getNavItems } from '@/components/navigation/bottom-nav';
import { useStore } from '@/lib/store';
import { collection, getDocs, query, where, orderBy, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toIndonesianDate, getStatusColor } from '@/lib/helpers';

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState('produk');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [consumers, setConsumers] = useState<any[]>([]);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCollector, setSelectedCollector] = useState<string>('all');
  
  // Product form
  const [productForm, setProductForm] = useState({ name: '', description: '', hargaModal: '', dp: '', images: '' });
  const [promoForm, setPromoForm] = useState({ type: 'image', url: '' });
  const [broadcastMessage, setBroadcastMessage] = useState('');
  
  // Edit dialog
  const [editProduct, setEditProduct] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Stats
  const stats = [
    { title: 'Pesanan', value: orders.length },
    { title: 'Produk', value: products.length },
    { title: 'Konsumen', value: consumers.length },
  ];

  // Load data
  useEffect(() => {
    const loadProducts = async () => {
      const snapshot = await getDocs(collection(db, 'products'));
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
    };

    const loadOrders = async () => {
      const snapshot = await getDocs(collection(db, 'orders'));
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, firebaseDocId: doc.id, ...doc.data() }));
      console.log('Loaded orders:', ordersData.length, ordersData);
      if (ordersData.length > 0) {
        console.log('Sample order structure:', ordersData[0]);
        console.log('Sample order fields:', Object.keys(ordersData[0]));
        console.log('Sample assignedCollectorUid:', ordersData[0].assignedCollectorUid);
        console.log('Sample assignedCollector:', ordersData[0].assignedCollector);
      }
      console.log('Sample payment date:', ordersData[0]?.payments?.[0]?.date);
      setOrders(ordersData);
    };

    const loadBroadcasts = async () => {
      const snapshot = await getDocs(collection(db, 'broadcasts'));
      const broadcastsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBroadcasts(broadcastsData);
    };

    const loadConsumers = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'konsumen'));
      const snapshot = await getDocs(q);
      const consumersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('=== Admin Data Konsumen Debug ===');
      console.log('Total consumers loaded:', consumersData.length);
      console.log('Sample consumer:', consumersData[0]);
      setConsumers(consumersData);
    };

    const loadCollectors = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'kolektor'));
      const snapshot = await getDocs(q);
      const collectorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('Loaded collectors:', collectorsData.length, collectorsData);
      if (collectorsData.length > 0) {
        console.log('Sample collector:', collectorsData[0]);
        console.log('Sample collector fields:', Object.keys(collectorsData[0]));
        console.log('Sample collector UID:', collectorsData[0].uid);
        console.log('Sample collector id:', collectorsData[0].id);
      }
      setCollectors(collectorsData);
    };

    loadProducts();
    loadOrders();
    loadBroadcasts();
    loadConsumers();
    loadCollectors();
  }, []);

  const handleAddProduct = async () => {
    try {
      await addDoc(collection(db, 'products'), {
        ...productForm,
        hargaModal: parseFloat(productForm.hargaModal),
        dp: parseFloat(productForm.dp) || 0,
        images: productForm.images.split(',').map(s => s.trim()),
      });
      toast.success('Produk berhasil ditambahkan!');
      setProductForm({ name: '', description: '', hargaModal: '', dp: '', images: '' });
    } catch (error) {
      toast.error('Gagal menambah produk.');
    }
  };

  const handleEditProductSave = async () => {
    if (!editProduct) return;
    try {
      await updateDoc(doc(db, 'products', editProduct.id), {
        ...editProduct,
        hargaModal: parseFloat(editProduct.hargaModal),
        dp: parseFloat(editProduct.dp) || 0,
        images: editProduct.images.split(',').map(s => s.trim()),
      });
      toast.success('Produk berhasil diperbarui!');
      setEditModalOpen(false);
      setEditProduct(null);
    } catch (error) {
      toast.error('Gagal memperbarui produk.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      toast.success('Status berhasil diperbarui!');
      // Reload orders
      const snapshot = await getDocs(query(collection(db, 'orders'), orderBy('timestamp', 'desc')));
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, firebaseDocId: doc.id, ...doc.data() })));
    } catch (error) {
      toast.error('Gagal memperbarui status.');
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    try {
      await addDoc(collection(db, 'broadcasts'), {
        message: broadcastMessage,
        timestamp: new Date(),
      });
      toast.success('Broadcast terkirim!');
      setBroadcastMessage('');
    } catch (error) {
      toast.error('Gagal mengirim broadcast.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Yakin ingin menghapus produk ini?')) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      toast.success('Produk berhasil dihapus!');
      setProducts(products.filter(p => p.id !== productId));
    } catch (error) {
      toast.error('Gagal menghapus produk.');
    }
  };

  return (
    <div className="pb-20">
      {/* Header with Logout */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Selamat datang, {user?.namaLengkap || user?.email}</p>
        </div>
        <Button
          variant="outline"
          onClick={onLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6 text-center">
                <p className="text-4xl font-bold text-teal-600">{stat.value}</p>
                <p className="text-sm text-gray-600 mt-1">{stat.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === 'produk' && (
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-6 h-6" />
            Produk & Data
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add Product Form */}
            <Card>
              <CardHeader>
                <CardTitle>Tambah Produk Baru</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nama Barang</Label>
                  <Input
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Harga Modal</Label>
                  <Input
                    type="number"
                    value={productForm.hargaModal}
                    onChange={(e) => setProductForm({ ...productForm, hargaModal: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Uang Muka (DP)</Label>
                  <Input
                    type="number"
                    value={productForm.dp}
                    onChange={(e) => setProductForm({ ...productForm, dp: e.target.value })}
                  />
                </div>
                <div>
                  <Label>URL Foto (pisahkan dengan koma)</Label>
                  <Textarea
                    value={productForm.images}
                    onChange={(e) => setProductForm({ ...productForm, images: e.target.value })}
                    rows={2}
                  />
                </div>
                <Button onClick={handleAddProduct} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Produk
                </Button>
              </CardContent>
            </Card>

            {/* Add Promo Form */}
            <Card>
              <CardHeader>
                <CardTitle>Tambah Konten Carousel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tipe Konten</Label>
                  <Select value={promoForm.type} onValueChange={(v) => setPromoForm({ ...promoForm, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Gambar</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>URL Konten</Label>
                  <Input
                    value={promoForm.url}
                    onChange={(e) => setPromoForm({ ...promoForm, url: e.target.value })}
                  />
                </div>
                <Button onClick={() => {
                  addDoc(collection(db, 'promos'), promoForm);
                  toast.success('Promo ditambahkan!');
                  setPromoForm({ type: 'image', url: '' });
                }} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Konten
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Product List */}
          <h3 className="font-semibold text-gray-900">Daftar Semua Produk</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card key={product.id}>
                {product.images && product.images.length > 0 && product.images[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-32 object-cover"
                  />
                )}
                <CardContent className="p-4">
                  <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                  <p className="text-sm text-gray-500">
                    Rp {(product.hargaModal || 0).toLocaleString('id-ID')}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditProduct(product);
                        setEditModalOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'order' && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Inbox className="w-6 h-6" />
            Semua Pesanan
          </h2>

          <div className="space-y-3">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{order.productName} ({order.orderId})</h3>
                      <p className="text-sm text-gray-500">
                        Pemesan: <span className="font-medium">{order.consumerName}</span> | Sales: <span className="font-medium">{order.namaSales || '-'}</span>
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {order.tanggalLunas && (
                          <span className="text-blue-700">Estimasi Lunas: {order.tanggalLunas}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Badge style={{ backgroundColor: getStatusColor(order.status) }}>
                        {order.status}
                      </Badge>
                      <div className="flex gap-2">
                        {order.status === 'Proses' && (
                          <Button size="sm" onClick={() => handleUpdateOrderStatus(order.firebaseDocId, 'Pengiriman')}>
                            Kirim
                          </Button>
                        )}
                        {order.status === 'Pengiriman' && (
                          <Button size="sm" onClick={() => handleUpdateOrderStatus(order.firebaseDocId, 'Terkirim')}>
                            Terkirim
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Broadcast Tab */}
      {activeTab === 'broadcast' && (
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Kirim Pesan Broadcast
          </h2>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>Pesan untuk Semua Konsumen</Label>
                <Textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={4}
                  placeholder="Masukkan pesan broadcast..."
                />
              </div>
              <Button onClick={handleSendBroadcast} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                Kirim Pesan
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Consumers Tab */}
      {activeTab === 'data_konsumen' && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Data Konsumen ({consumers.length})
          </h2>

          <div className="overflow-x-auto">
            <Card>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Nama Lengkap</th>
                    <th className="text-left p-4 font-semibold">Email</th>
                    <th className="text-left p-4 font-semibold">Jenis Usaha</th>
                    <th className="text-left p-4 font-semibold">No. HP</th>
                    <th className="text-left p-4 font-semibold">Alamat Usaha</th>
                    <th className="text-left p-4 font-semibold">Alamat Rumah</th>
                    <th className="text-left p-4 font-semibold">No. KTP</th>
                    <th className="text-left p-4 font-semibold">Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {consumers.length > 0 ? (
                    consumers.map((consumer) => (
                      <tr key={consumer.id} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="p-4">{consumer.namaLengkap || '-'}</td>
                        <td className="p-4 text-sm">{consumer.email || '-'}</td>
                        <td className="p-4">{consumer.jenisUsaha || '-'}</td>
                        <td className="p-4">{consumer.noHape || '-'}</td>
                        <td className="p-4 text-sm max-w-xs truncate" title={consumer.alamatUsaha}>
                          {consumer.alamatUsaha || '-'}
                        </td>
                        <td className="p-4 text-sm max-w-xs truncate" title={consumer.alamatRumah}>
                          {consumer.alamatRumah || '-'}
                        </td>
                        <td className="p-4">{consumer.nomorKtp || '-'}</td>
                        <td className="p-4">{consumer.namaSales || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-gray-500">
                        Belum ada data konsumen
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'laporan' && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Laporan Kolektor
          </h2>

          {/* Date and Collector Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Pilih Tanggal</Label>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="h-12"
              />
            </div>
            <div>
              <Label>Filter Kolektor</Label>
              <select
                value={selectedCollector}
                onChange={(e) => setSelectedCollector(e.target.value)}
                className="w-full h-12 px-3 border border-gray-300 rounded-md bg-white"
              >
                <option value="all">Semua Kolektor</option>
                {collectors.map((collector) => (
                  <option key={collector.id} value={collector.uid}>
                    {collector.namaLengkap || collector.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Overall Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Ringkasan Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {(() => {
                      let total = 0;
                      const reportDateStr = toIndonesianDate(new Date(reportDate));
                      console.log('=== Admin Report Debug (Money) ===');
                      console.log('Selected date:', reportDate);
                      console.log('Date string for comparison:', reportDateStr);
                      orders.forEach(order => {
                        if (selectedCollector !== 'all') {
                          const collector = collectors.find((c: any) => c.uid === selectedCollector);
                          const matchesUid = order.assignedCollectorUid === selectedCollector;
                          const matchesName = order.assignedCollector === (collector?.namaLengkap || collector?.email);
                          if (!matchesUid && !matchesName) return;
                        }
                        const payment = (order.payments || []).find((p: any) =>
                          p.date === reportDateStr &&
                          (selectedCollector === 'all' || p.collectedBy === (collectors.find((c: any) => c.uid === selectedCollector)?.namaLengkap || collectors.find((c: any) => c.uid === selectedCollector)?.email))
                        );
                        console.log(`  Order: ${order.orderId}`, 'HasPayment:', !!payment);
                        if (payment) total += order.installmentPrice || 0;
                      });
                      console.log('Total money collected:', total);
                      return total.toLocaleString('id-ID');
                    })()}
                  </p>
                  <p className="text-sm text-gray-600">Uang Tertagih</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {(() => {
                      let total = 0;
                      const reportDateStr = toIndonesianDate(new Date(reportDate));
                      console.log('=== Admin Report Debug (Visits) ===');
                      console.log('Selected date:', reportDate);
                      console.log('Date string for comparison:', reportDateStr);
                      orders.forEach(order => {
                        if (selectedCollector !== 'all') {
                          const collector = collectors.find((c: any) => c.uid === selectedCollector);
                          const matchesUid = order.assignedCollectorUid === selectedCollector;
                          const matchesName = order.assignedCollector === (collector?.namaLengkap || collector?.email);
                          if (!matchesUid && !matchesName) return;
                        }
                        const hasPayment = (order.payments || []).some((p: any) => p.date === reportDateStr);
                        const hasNote = (order.collectionNotes || []).some((n: any) => n.date === reportDateStr);
                        console.log(`  Order: ${order.orderId}`, 'HasPayment:', hasPayment, 'HasNote:', hasNote, 'ShouldCount:', hasPayment || hasNote);
                        if (hasPayment || hasNote) total++;
                      });
                      console.log('Total visits counted:', total);
                      return total;
                    })()}
                  </p>
                  <p className="text-sm text-gray-600">Kunjungan</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-teal-600">
                    {(() => {
                      let paid = 0, unpaid = 0;
                      const reportDateStr = toIndonesianDate(new Date(reportDate));
                      console.log('=== Admin Report Debug (Success Rate) ===');
                      console.log('Selected date:', reportDate);
                      console.log('Date string for comparison:', reportDateStr);
                      orders.forEach(order => {
                        if (selectedCollector !== 'all') {
                          const collector = collectors.find((c: any) => c.uid === selectedCollector);
                          const matchesUid = order.assignedCollectorUid === selectedCollector;
                          const matchesName = order.assignedCollector === (collector?.namaLengkap || collector?.email);
                          if (!matchesUid && !matchesName) return;
                        }
                        const hasPayment = (order.payments || []).some((p: any) => p.date === reportDateStr);
                        const hasNote = (order.collectionNotes || []).some((n: any) => n.date === reportDateStr);
                        console.log(`  Order: ${order.orderId}`, 'HasPayment:', hasPayment, 'HasNote:', hasNote, 'ShouldCount:', hasPayment || hasNote);
                        if (hasPayment) paid++;
                        if (hasNote) unpaid++;
                      });
                      const successRate = paid + unpaid > 0 ? Math.round((paid / (paid + unpaid)) * 100) : 0;
                      console.log('Total paid:', paid, 'Total unpaid:', unpaid, 'Success rate:', successRate);
                      return successRate;
                    })()}%
                  </p>
                  <p className="text-sm text-gray-600">Berhasil Tertagih</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {(() => {
                      let total = 0;
                      const reportDateStr = toIndonesianDate(new Date(reportDate));
                      console.log('=== Admin Report Debug (Active Bills) ===');
                      console.log('Selected date:', reportDate);
                      console.log('Date string for comparison:', reportDateStr);
                      orders.forEach(order => {
                        if (selectedCollector !== 'all') {
                          const collector = collectors.find((c: any) => c.uid === selectedCollector);
                          const matchesUid = order.assignedCollectorUid === selectedCollector;
                          const matchesName = order.assignedCollector === (collector?.namaLengkap || collector?.email);
                          if (!matchesUid && !matchesName) return;
                        }
                        if (order.status === 'Terkirim') {
                          total++;
                        }
                      });
                      console.log('Total active bills:', total);
                      return total;
                    })()}
                  </p>
                  <p className="text-sm text-gray-600">Tagihan Aktif</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collector Performance Table */}
          {selectedCollector === 'all' && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Performa per Kolektor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-semibold">Nama Kolektor</th>
                        <th className="text-left p-4 font-semibold">Tagihan Aktif</th>
                        <th className="text-left p-4 font-semibold">Kunjungan</th>
                        <th className="text-left p-4 font-semibold">Uang Tertagih</th>
                        <th className="text-left p-4 font-semibold">Berhasil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collectors.map((collector) => {
                        let activeBills = 0;
                        let visits = 0;
                        let totalCollected = 0;
                        let paid = 0, unpaid = 0;
                        // Gunakan format tanggal yang konsisten dengan toIndonesianDate
                        const reportDateStr = toIndonesianDate(new Date(reportDate));

                        orders.forEach(order => {
                          // Coba cocokkan dengan assignedCollectorUid atau assignedCollector
                          const matchesUid = order.assignedCollectorUid === collector.uid;
                          const matchesName = order.assignedCollector === (collector.namaLengkap || collector.email);
                          if (!matchesUid && !matchesName) return;

                          if (order.status === 'Terkirim') {
                            activeBills++;
                          }

                          const payment = (order.payments || []).find((p: any) => p.date === reportDateStr);
                          const note = (order.collectionNotes || []).find((n: any) => n.date === reportDateStr);

                          if (payment || note) visits++;

                          if (payment) {
                            totalCollected += order.installmentPrice || 0;
                            paid++;
                          }
                          if (note) unpaid++;
                        });

                        const successRate = paid + unpaid > 0 ? Math.round((paid / (paid + unpaid)) * 100) : 0;

                        return (
                          <tr key={collector.id} className="border-b last:border-b-0 hover:bg-gray-50">
                            <td className="p-4">{collector.namaLengkap || collector.email}</td>
                            <td className="p-4">{activeBills}</td>
                            <td className="p-4">{visits}</td>
                            <td className="p-4">Rp {totalCollected.toLocaleString('id-ID')}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-sm ${
                                successRate >= 80 ? 'bg-green-100 text-green-800' :
                                successRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {successRate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Daftar Konsumen Per Kolektor
                {selectedCollector !== 'all' && (
                  <> - {collectors.find((c: any) => c.uid === selectedCollector)?.namaLengkap || collectors.find((c: any) => c.uid === selectedCollector)?.email}</>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCollector === 'all' ? (
                // Tampilkan semua kolektor dengan daftar konsumennya
                <div className="space-y-4">
                  {collectors.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">Belum ada data kolektor</p>
                  ) : (
                    collectors.map((collector) => {
                      // Hitung konsumen untuk kolektor ini - tampilkan semua tagihan aktif
                      console.log(`=== Debug: Processing collector ${collector.namaLengkap || collector.email} ===`);
                      console.log('Collector UID:', collector.uid);
                      console.log('Collector ID:', collector.id);
                      console.log('Collector namaLengkap:', collector.namaLengkap);

                      const collectorConsumers = orders.filter(o => {
                        // Coba cocokkan dengan assignedCollectorUid
                        const matchesUid = o.assignedCollectorUid === collector.uid;
                        // Fallback: coba cocokkan dengan nama di assignedCollector
                        const matchesName = o.assignedCollector === (collector.namaLengkap || collector.email);
                        const isActive = o.status === 'Terkirim';

                        console.log(`Order ${o.orderId}: assignedUid=${o.assignedCollectorUid}, assignedName=${o.assignedCollector}, matchesUid=${matchesUid}, matchesName=${matchesName}, status=${o.status}, isActive=${isActive}`);

                        return (matchesUid || matchesName) && isActive;
                      });
                      console.log(`Found ${collectorConsumers.length} active bills for this collector`);

                      return (
                        <Card key={collector.id} className="mb-4">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">
                                {collector.namaLengkap || collector.email}
                              </CardTitle>
                              <Badge variant="outline">
                                {collectorConsumers.length} Tagihan Aktif
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Tagihan Aktif:</span>
                                <span className="font-semibold">{collectorConsumers.length}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Status:</span>
                                <span className={`font-semibold ${collectorConsumers.length > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                  {collectorConsumers.length > 0 ? 'Aktif (Memiliki Tagihan)' : 'Belum ada Riwayat'}
                                </span>
                              </div>
                            </div>
                            {collectorConsumers.length > 0 && (
                              <div className="pt-3 border-t">
                                <p className="text-sm text-gray-700 mb-2">
                                  Tekan tombol di bawah untuk melihat detail riwayat tagihan dan konsumen:
                                </p>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => setSelectedCollector(collector.uid)} >Filter ke Kolektor</Button>
                                  <Button size="sm" onClick={() => console.log('=== Opening profile for collector:', collector.namaLengkap || collector.email)}>Lihat Profil</Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              ) : (
                    // Tampilkan konsumen untuk kolektor tertentu
                    (() => {
                      const collector = collectors.find((c: any) => c.uid === selectedCollector);
                      if (!collector) {
                        return <p className="text-center text-gray-500 py-4">Kolektor tidak ditemukan</p>;
                      }

                      // Filter semua tagihan aktif untuk kolektor ini
                      console.log('=== Debug: Filtering orders for selected collector ===');
                      console.log('Selected collector UID:', selectedCollector);
                      console.log('Collector object:', collector);
                      console.log('Collector namaLengkap:', collector.namaLengkap);
                      console.log('Total orders:', orders.length);

                      const collectorConsumers = orders.filter(o => {
                        // Coba cocokkan dengan assignedCollectorUid
                        const matchesUid = o.assignedCollectorUid === collector.uid;
                        // Fallback: coba cocokkan dengan nama di assignedCollector
                        const matchesName = o.assignedCollector === (collector.namaLengkap || collector.email);
                        const isActive = o.status === 'Terkirim';

                        console.log(`Order ${o.orderId}: assignedUid=${o.assignedCollectorUid}, assignedName=${o.assignedCollector}, matchesUid=${matchesUid}, matchesName=${matchesName}, status=${o.status}, isActive=${isActive}`);

                        return (matchesUid || matchesName) && isActive;
                      });
                      console.log('Filtered collector orders:', collectorConsumers.length);

                      if (collectorConsumers.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <p className="text-gray-500 mb-4">Belum ada tagihan aktif untuk kolektor ini</p>
                            <Button variant="outline" size="sm" onClick={() => setSelectedCollector('all')}>
                              ← Kembali ke Semua Kolektor
                            </Button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">{collector.namaLengkap || collector.email}</h3>
                              <p className="text-sm text-gray-600">{collectorConsumers.length} Tagihan Aktif</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setSelectedCollector('all')}>
                              × Tutup Filter
                            </Button>
                          </div>
                          {collectorConsumers.map(order => (
                            <Card key={order.firebaseDocId || order.id || order.orderId} className="mb-3">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-semibold">{order.consumerName || 'Konsumen'}</p>
                                    <p className="text-sm text-gray-600">ID: {order.orderId}</p>
                                  </div>
                                  <Badge variant={order.status === 'Terkirim' ? 'default' : 'secondary'}>
                                    {order.status}
                                  </Badge>
                                </div>
                                <div className="text-sm space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Barang:</span>
                                    <span className="font-medium">{order.productName || '-'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Cicilan:</span>
                                    <span className="font-medium">Rp {(order.installmentPrice || 0).toLocaleString('id-ID')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Jatuh Tempo:</span>
                                    <span className="font-medium">{order.nextPaymentDate || '-'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Pembayaran:</span>
                                    <span className="font-medium">{(order.payments || []).length} / {order.totalInstallments}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </CardContent>
              </Card>

          {/* Unpaid List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Daftar Konsumen Tidak Bayar
                {selectedCollector !== 'all' && (
                  <> - {collectors.find((c: any) => c.uid === selectedCollector)?.namaLengkap || collectors.find((c: any) => c.uid === selectedCollector)?.email}</>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const reportDateStr = toIndonesianDate(new Date(reportDate));
                console.log('=== Admin Report Debug (Unpaid List) ===');
                console.log('Selected date:', reportDate);
                console.log('Date string for comparison:', reportDateStr);
                const unpaidList: any[] = [];

                orders.forEach(order => {
                  if (selectedCollector !== 'all') {
                    const collector = collectors.find((c: any) => c.uid === selectedCollector);
                    const matchesUid = order.assignedCollectorUid === selectedCollector;
                    const matchesName = order.assignedCollector === (collector?.namaLengkap || collector?.email);
                    if (!matchesUid && !matchesName) return;
                  }
                  console.log(`Order: ${order.orderId}`, 'Notes:', order.collectionNotes);
                  const note = (order.collectionNotes || []).find((n: any) => n.date === reportDateStr);
                  if (note) {
                    console.log(`  ✓ Found: ${note.reason}`);
                    unpaidList.push({
                      consumerName: order.consumerName || 'Konsumen',
                      reason: note.reason,
                      collector: order.assignedCollector || 'Unknown'
                    });
                  }
                });

                console.log(`Total unpaid: ${unpaidList.length}`);
                return unpaidList.length > 0 ? (
                  <div className="space-y-2">
                    {unpaidList.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <span className="font-medium">{item.consumerName}</span>
                          {selectedCollector === 'all' && (
                            <span className="text-sm text-gray-500 ml-2">({item.collector})</span>
                          )}
                        </div>
                        <span className="text-sm text-red-600">Alasan: {item.reason || '-'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    Tidak ada kunjungan tanpa pembayaran pada tanggal ini.
                  </p>
                );
              })()}
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

      {/* Edit Product Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Produk: {editProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Barang</Label>
              <Input
                value={editProduct?.name || ''}
                onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                value={editProduct?.description || ''}
                onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Harga Modal</Label>
              <Input
                type="number"
                value={editProduct?.hargaModal || ''}
                onChange={(e) => setEditProduct({ ...editProduct, hargaModal: e.target.value })}
              />
            </div>
            <div>
              <Label>Uang Muka (DP)</Label>
              <Input
                type="number"
                value={editProduct?.dp || ''}
                onChange={(e) => setEditProduct({ ...editProduct, dp: e.target.value })}
              />
            </div>
            <div>
              <Label>URL Gambar (pisahkan koma)</Label>
              <Textarea
                value={editProduct?.images || ''}
                onChange={(e) => setEditProduct({ ...editProduct, images: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleEditProductSave}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
