'use client';

import { useState, useEffect } from 'react';
import { Search, ShoppingCart, ReceiptText, Bell, UserCircle, Trash2, Package, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import ProductCard from '@/components/shared/product-card';
import ProductModal from '@/components/shared/product-modal';
import BillModal from '@/components/shared/bill-modal';
import BottomNav, { getNavItems } from '@/components/navigation/bottom-nav';
import { useStore } from '@/lib/store';
import { collection, getDocs, query, where, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toIndonesianDate, getStatusColor } from '@/lib/helpers';

interface KonsumenDashboardProps {
  onLogout: () => void;
}

export default function KonsumenDashboard({ onLogout }: KonsumenDashboardProps) {
  const { user, cartItems, addToCart, removeFromCart, clearCart } = useStore();
  const [activeTab, setActiveTab] = useState('produk');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<'rumah' | 'usaha'>('rumah');
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [billModalOpen, setBillModalOpen] = useState(false);

  // Load data from Firestore
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        // Load products
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData);

        // Load orders (without orderBy first to avoid index error)
        const ordersSnapshot = await getDocs(query(
          collection(db, 'orders'),
          where('userId', '==', user.uid)
        ));
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          firebaseDocId: doc.id,
          ...doc.data()
        }));
        // Sort manually
        ordersData.sort((a, b) => {
          const dateA = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const dateB = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        });
        setOrders(ordersData);

        // Load promos
        const promosSnapshot = await getDocs(collection(db, 'promos'));
        const promosData = promosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPromos(promosData);

        // Load broadcasts
        const broadcastsSnapshot = await getDocs(query(collection(db, 'broadcasts')));
        const broadcastsData = broadcastsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort manually
        broadcastsData.sort((a, b) => {
          const dateA = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const dateB = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        });
        setBroadcasts(broadcastsData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Gagal memuat data. Silakan refresh halaman.');
      }
    };

    loadData();
  }, [user]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeBills = orders.filter(o => 
    o.status === 'Terkirim' && o.payments.length < o.tenor
  );

  const handleCheckout = async () => {
    if (!user || cartItems.length === 0) return;

    try {
      const shippingAddress = selectedAddress === 'rumah' ? user.alamatRumah : user.alamatUsaha;
      
      for (const item of cartItems) {
        await addDoc(collection(db, 'orders'), {
          orderId: `#${Date.now().toString().slice(-5)}${Math.random().toString().slice(-2)}`,
          date: toIndonesianDate(new Date()),
          timestamp: new Date(),
          productName: item.product.name,
          tenor: item.tenor,
          installmentPrice: item.installmentPrice,
          paymentFrequency: item.paymentFrequency,
          status: 'Proses',
          payments: [],
          assignedCollector: null,
          assignedCollectorUid: null,
          userId: user.uid,
          consumerName: user.namaLengkap,
          consumerEmail: user.email,
          shippingAddress,
          jenisUsaha: user.jenisUsaha,
          alamatUsaha: user.alamatUsaha,
          alamatRumah: user.alamatRumah,
          nomorKtp: user.nomorKtp,
          namaSales: user.namaSales,
        });
      }

      clearCart();
      setCheckoutModalOpen(false);
      setActiveTab('pesanan');
      toast.success('Pesanan berhasil dibuat!');
    } catch (error) {
      toast.error('Gagal membuat pesanan.');
    }
  };

  return (
    <div className="pb-20">
      {/* Header with Logout */}
      <div className="sticky top-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kredit UMKM</h1>
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

      {/* Products Tab */}
      {activeTab === 'produk' && (
        <div className="space-y-4">
          <div className="sticky top-16 z-40 bg-white pb-4 pt-4 px-4 shadow-sm">
            <div className="max-w-7xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Cari produk..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>
          </div>

          {/* Promo Carousel */}
          {promos.length > 0 && (
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex gap-4 overflow-x-auto pb-2">
                {promos.map((promo) => (
                  <div key={promo.id} className="flex-shrink-0 w-full md:w-1/2 lg:w-1/3 rounded-xl overflow-hidden">
                    {promo.type === 'video' ? (
                      <div className="aspect-video">
                        <iframe
                          src={promo.url}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    ) : promo.type === 'image' && promo.url ? (
                      <img src={promo.url} alt="Promo" className="w-full h-48 object-cover" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-6 h-6" />
              Etalase Produk
            </h2>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onView={(p) => {
                      setSelectedProduct(p);
                      setProductModalOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Tidak ada produk yang cocok.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Cart Tab */}
      {activeTab === 'keranjang' && (
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            Keranjang Saya
          </h2>

          {cartItems.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {cartItems.map((item) => (
                    <div key={item.cartId} className="flex items-center gap-4 p-4">
                      {item.product.images && item.product.images[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                            <rect width="60" height="60" fill="#f3f4f6"/>
                            <text x="30" y="35" fontSize="10" fill="#9ca3af" textAnchor="middle">No IMG</text>
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {item.product.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Tenor {item.tenor} hari @ Rp {item.installmentPrice.toLocaleString('id-ID')}/{item.paymentFrequency}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.cartId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Keranjang Anda masih kosong.</p>
              </CardContent>
            </Card>
          )}

          {cartItems.length > 0 && (
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => setCheckoutModalOpen(true)}
                className="h-12 bg-teal-600 hover:bg-teal-700 text-white"
                size="lg"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Checkout ({cartItems.length})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'pesanan' && (
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ReceiptText className="w-6 h-6" />
            Riwayat Pesanan
          </h2>

          {orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{order.productName}</h3>
                        <p className="text-sm text-gray-500">{order.date}</p>
                      </div>
                      <Badge style={{ backgroundColor: getStatusColor(order.status) }}>
                        {order.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <ReceiptText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Anda belum memiliki riwayat pesanan.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'pemberitahuan' && (
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Pemberitahuan
          </h2>

          {broadcasts.length > 0 ? (
            <div className="space-y-3">
              {broadcasts.map((broadcast) => (
                <Card key={broadcast.id}>
                  <CardContent className="p-4">
                    <p className="text-gray-900">{broadcast.message}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {broadcast.timestamp?.toDate?.() 
                        ? new Date(broadcast.timestamp.toDate()).toLocaleString('id-ID')
                        : 'Baru saja'
                      }
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Tidak ada pemberitahuan baru.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profil' && (
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <UserCircle className="w-6 h-6" />
            Profil & Tagihan
          </h2>

          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Nama</p>
                  <p className="font-medium text-gray-900">{user?.namaLengkap}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-600">Jenis Usaha</p>
                  <p className="font-medium text-gray-900">{user?.jenisUsaha}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-600">Alamat Rumah</p>
                  <p className="font-medium text-gray-900 text-sm">{user?.alamatRumah}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-600">No. HP</p>
                  <p className="font-medium text-gray-900">{user?.noHape}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <h3 className="font-semibold text-gray-900 mb-4">Tagihan Aktif</h3>

          {activeBills.length > 0 ? (
            <div className="space-y-3">
              {activeBills.map((bill) => (
                <Card
                  key={bill.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedBill(bill);
                    setBillModalOpen(true);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{bill.productName}</h3>
                        <p className="text-sm text-gray-500">
                          Angsuran Rp {bill.installmentPrice.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <Badge style={{ backgroundColor: getStatusColor(bill.status) }}>
                        {bill.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <ReceiptText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Tidak ada tagihan aktif.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Bottom Navigation */}
      {user && (
        <BottomNav
          items={getNavItems(user.role)}
          activeItem={activeTab}
          onItemClick={(item) => setActiveTab(item.value)}
          cartCount={cartItems.length}
        />
      )}

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        open={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setSelectedProduct(null);
        }}
        onAddToCart={(item) => {
          addToCart(item);
          toast.success('Ditambahkan ke keranjang');
        }}
      />

      {/* Checkout Modal */}
      <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Alamat Pengiriman</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={selectedAddress} onValueChange={(v: any) => setSelectedAddress(v)}>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="rumah" id="addr-rumah" />
                  <Label htmlFor="addr-rumah" className="flex-1 cursor-pointer">
                    <span className="font-medium">Alamat Rumah</span>
                    <p className="text-sm text-gray-500">{user?.alamatRumah}</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="usaha" id="addr-usaha" />
                  <Label htmlFor="addr-usaha" className="flex-1 cursor-pointer">
                    <span className="font-medium">Alamat Usaha</span>
                    <p className="text-sm text-gray-500">{user?.alamatUsaha}</p>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCheckoutModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCheckout} className="bg-teal-600 hover:bg-teal-700 text-white">
              Konfirmasi Pesanan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill Modal */}
      <BillModal
        bill={selectedBill}
        open={billModalOpen}
        onClose={() => {
          setBillModalOpen(false);
          setSelectedBill(null);
        }}
      />
    </div>
  );
}
