import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../utils/api';
import { useAuthStore } from './authStore';

export interface CartItem {
  productId: number;
  title: string;
  priceUsd: number;
  pricingModel: 'one-time' | 'free' | 'pay-what-you-want';
  imageUrl: string;
  type: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const state = get();
        if (state.items.find(i => i.productId === item.productId)) return; // Only one of each digital item usually
        const nextItems = [...state.items, item];
        syncCartWithBackend(nextItems);
        set({ items: nextItems });
      },
      removeItem: (productId) => {
        const state = get();
        const nextItems = state.items.filter((i) => i.productId !== productId);
        syncCartWithBackend(nextItems);
        set({ items: nextItems });
      },
      clearCart: () => {
        syncCartWithBackend([]);
        set({ items: [] });
      },
      getTotal: () => {
        return get().items.reduce((total, item) => total + item.priceUsd, 0);
      }
    }),
    {
      name: 'vcc-cart-storage',
    }
  )
);

// Sync to backend (fire and forget)
const syncCartWithBackend = (items: CartItem[]) => {
  const token = localStorage.getItem('token');
  if (token) {
    // We can just hit the API. If token is invalid, it will fail silently.
    api.post('/cart/sync', { items }).catch(e => console.error('Cart sync failed', e));
  }
};
