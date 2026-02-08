'use client';

import { ShoppingCart, Store, ReceiptText, Bell, UserCircle, Package, Inbox, MessageSquare, Users, BarChart3, ListTodo, History, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type NavItem = {
  value: string;
  text: string;
  icon: any;
};

interface BottomNavProps {
  items: NavItem[];
  activeItem: string;
  onItemClick: (item: NavItem) => void;
  cartCount?: number;
}

export default function BottomNav({ items, activeItem, onItemClick, cartCount = 0 }: BottomNavProps) {
  const getIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      Store,
      ShoppingCart,
      ReceiptText,
      Bell,
      UserCircle,
      Package,
      Inbox,
      MessageSquare,
      Users,
      BarChart3,
      ListTodo,
      History,
      FileText,
    };
    return icons[iconName] || Store;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
      <div className="flex justify-around pb-safe">
        {items.map((item) => (
          <button
            key={item.value}
            onClick={() => onItemClick(item)}
            className={`flex flex-col items-center justify-center py-3 px-4 flex-1 max-w-[80px] relative transition-all duration-200 ${
              activeItem === item.value
                ? 'text-teal-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {item.value === 'keranjang' && cartCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                {cartCount}
              </Badge>
            )}

            <item.icon className={`w-6 h-6 mb-1 transition-transform ${
              activeItem === item.value ? 'scale-110' : ''
            }`} />

            <span className="text-xs font-medium">
              {item.text}
            </span>

            {activeItem === item.value && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-teal-600 rounded-b-md" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

// Navigation items per role
export const getNavItems = (role: string): NavItem[] => {
  const konsumenItems: NavItem[] = [
    { value: 'produk', text: 'Produk', icon: Store },
    { value: 'keranjang', text: 'Keranjang', icon: ShoppingCart },
    { value: 'pesanan', text: 'Pesanan', icon: ReceiptText },
    { value: 'pemberitahuan', text: 'Notif', icon: Bell },
    { value: 'profil', text: 'Profil', icon: UserCircle },
  ];

  const adminItems: NavItem[] = [
    { value: 'produk', text: 'Produk', icon: Package },
    { value: 'order', text: 'Order', icon: Inbox },
    { value: 'broadcast', text: 'Broadcast', icon: MessageSquare },
    { value: 'data_konsumen', text: 'Konsumen', icon: Users },
    { value: 'laporan', text: 'Laporan', icon: BarChart3 },
  ];

  const kolektorItems: NavItem[] = [
    { value: 'tagihan', text: 'Tagihan', icon: ListTodo },
    { value: 'riwayat', text: 'Riwayat', icon: History },
    { value: 'profil', text: 'Profil', icon: UserCircle },
  ];

  switch (role) {
    case 'konsumen':
      return konsumenItems;
    case 'admin':
      return adminItems;
    case 'kolektor':
      return kolektorItems;
    default:
      return [];
  }
};
