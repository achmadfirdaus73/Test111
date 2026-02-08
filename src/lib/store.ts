import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// User types
export type UserRole = 'konsumen' | 'admin' | 'kolektor';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  namaLengkap?: string;
  jenisUsaha?: string;
  alamatRumah?: string;
  alamatUsaha?: string;
  noHape?: string;
  nomorKtp?: string;
  namaSales?: string;
}

export interface CartItem {
  cartId: number;
  product: any;
  tenor: number;
  paymentFrequency: 'harian' | 'mingguan';
  installmentPrice: number;
}

// App Store
interface AppState {
  // User & Auth
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;

  // Cart
  cartItems: CartItem[];

  // UI State
  activeTab: string;

  // Notifications
  snackbar: {
    show: boolean;
    text: string;
    color: 'success' | 'error' | 'info' | 'warning';
  };

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  addToCart: (item: Omit<CartItem, 'cartId'>) => void;
  removeFromCart: (cartId: number) => void;
  clearCart: () => void;
  setActiveTab: (tab: string) => void;
  showSnackbar: (text: string, color?: 'success' | 'error' | 'info' | 'warning') => void;
  hideSnackbar: () => void;
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,
      authError: null,
      cartItems: [],
      activeTab: 'dashboard',
      snackbar: {
        show: false,
        text: '',
        color: 'info',
      },

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setAuthError: (authError) => set({ authError }),

      addToCart: (item) =>
        set((state) => ({
          cartItems: [
            ...state.cartItems,
            { ...item, cartId: Date.now() },
          ],
        })),

      removeFromCart: (cartId) =>
        set((state) => ({
          cartItems: state.cartItems.filter((item) => item.cartId !== cartId),
        })),

      clearCart: () => set({ cartItems: [] }),

      setActiveTab: (activeTab) => set({ activeTab }),

      showSnackbar: (text, color = 'success') =>
        set({
          snackbar: { show: true, text, color },
        }),

      hideSnackbar: () =>
        set({
          snackbar: { show: false, text: '', color: 'info' },
        }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          authError: null,
          cartItems: [],
          activeTab: 'dashboard',
        }),
    }),
    {
      name: 'kredit-umkm-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        cartItems: state.cartItems,
        activeTab: state.activeTab,
      }),
    }
  )
);

// Helper: Check if profile is complete
export const isProfileComplete = (user: User | null): boolean => {
  if (!user || user.role !== 'konsumen') return true;
  return !!(
    user.namaLengkap &&
    user.noHape &&
    user.alamatRumah &&
    user.alamatUsaha &&
    user.nomorKtp
  );
};
