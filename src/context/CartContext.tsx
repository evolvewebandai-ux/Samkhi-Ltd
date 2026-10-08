import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product } from '../types';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../firebase';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('samkhi-cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [cartSessionId] = useState<string>(() => {
    let existing = localStorage.getItem('samkhi-cart-id');
    if (!existing) {
      existing = `cart_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem('samkhi-cart-id', existing);
    }
    return existing;
  });

  // Local storage & Firestore Abandoned Cart sync
  useEffect(() => {
    localStorage.setItem('samkhi-cart', JSON.stringify(cart));

    // Sync to Firestore 'carts' collection for Abandoned Cart recovery
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const userEmail = localStorage.getItem('samkhi_customer_email') || localStorage.getItem('customer_email') || undefined;

    if (cart.length > 0) {
      const payload = cleanUndefined({
        id: cartSessionId,
        items: cart.map(i => ({
          productId: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.images?.[0] || (i as any).image || ''
        })),
        totalItems,
        totalPrice,
        customerEmail: userEmail,
        status: 'active',
        lastUpdated: new Date().toISOString()
      });

      setDoc(doc(db, 'carts', cartSessionId), payload as any, { merge: true })
        .catch(err => console.warn("Abandoned cart sync warning:", err));
    } else {
      updateDoc(doc(db, 'carts', cartSessionId), {
        status: 'cleared',
        lastUpdated: new Date().toISOString()
      }).catch(() => {});
    }
  }, [cart, cartSessionId]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      totalItems, 
      totalPrice 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
