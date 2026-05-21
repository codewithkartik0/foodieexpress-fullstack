import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cartApi } from '../api/endpoints';
import type { Cart } from '../types';
import { useAuth } from './AuthContext';

interface CartContextValue {
  cart: Cart;
  loading: boolean;
  refresh(): Promise<void>;
  addItem(menuItemId: string, quantity?: number): Promise<void>;
  updateItem(itemId: string, quantity: number): Promise<void>;
  removeItem(itemId: string): Promise<void>;
  clear(): Promise<void>;
}

const emptyCart: Cart = {
  restaurantId: null,
  items: [],
  pricing: { subtotal: 0, tax: 0, deliveryFee: 0, total: 0 },
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || user.role !== 'customer') {
      setCart(emptyCart);
      return;
    }
    setLoading(true);
    try {
      const res = await cartApi.get();
      setCart(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (menuItemId: string, quantity = 1) => {
      const res = await cartApi.addItem(menuItemId, quantity);
      setCart(res.data.data);
    },
    [],
  );

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    const res = await cartApi.updateItem(itemId, quantity);
    setCart(res.data.data);
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const res = await cartApi.removeItem(itemId);
    setCart(res.data.data);
  }, []);

  const clear = useCallback(async () => {
    const res = await cartApi.clear();
    setCart(res.data.data);
  }, []);

  const value: CartContextValue = useMemo(
    () => ({ cart, loading, refresh, addItem, updateItem, removeItem, clear }),
    [cart, loading, refresh, addItem, updateItem, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
