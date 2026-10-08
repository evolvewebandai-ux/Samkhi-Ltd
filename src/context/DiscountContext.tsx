import React, { createContext, useContext, useState, useEffect } from 'react';
import { DiscountCoupon } from '../types';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanUndefined } from '../firebase';
import { useAdminAuth } from './AdminAuthContext';

interface DiscountContextType {
  discounts: DiscountCoupon[];
  addDiscount: (discount: DiscountCoupon) => Promise<void>;
  updateDiscount: (id: string, updates: Partial<DiscountCoupon>) => Promise<void>;
  removeDiscount: (id: string) => Promise<void>;
  validateDiscount: (code: string, customerEmail?: string) => Promise<DiscountCoupon | null>;
}

const INITIAL_DISCOUNTS: DiscountCoupon[] = [
  { id: '1', code: 'SOLAR2026', type: 'Percentage', value: '10', status: 'Active', used: 124, startDate: 'Jan 01, 2026' },
  { id: '2', code: 'FREESHIP', type: 'Free Shipping', value: '0', status: 'Active', used: 45, startDate: 'Feb 15, 2026' },
  { id: '3', code: 'WELCOME50', type: 'Fixed Amount', value: '50', status: 'Active', used: 89, startDate: 'Mar 10, 2026' },
];

const DiscountContext = createContext<DiscountContextType | undefined>(undefined);

export function DiscountProvider({ children }: { children: React.ReactNode }) {
  const [discounts, setDiscounts] = useState<DiscountCoupon[]>([]);
  const { isAdmin } = useAdminAuth();

  useEffect(() => {
    if (!isAdmin) {
      setDiscounts([]);
      return;
    }

    const discountsColl = collection(db, 'discounts');
    const unsubscribe = onSnapshot(discountsColl, async (snapshot) => {
      const list: DiscountCoupon[] = [];
      snapshot.forEach(d => {
        list.push({ ...d.data(), id: d.id } as DiscountCoupon);
      });

      setDiscounts(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'discounts');
    });

    return () => {
      unsubscribe();
    };
  }, [isAdmin]);

  const addDiscount = async (discount: DiscountCoupon) => {
    const path = `discounts/${discount.id}`;
    try {
      const cleanDisc = cleanUndefined(discount);
      await setDoc(doc(db, 'discounts', discount.id), cleanDisc);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const updateDiscount = async (id: string, updates: Partial<DiscountCoupon>) => {
    const path = `discounts/${id}`;
    try {
      const cleanUpdates = cleanUndefined(updates);
      await updateDoc(doc(db, 'discounts', id), cleanUpdates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const removeDiscount = async (id: string) => {
    const path = `discounts/${id}`;
    try {
      await deleteDoc(doc(db, 'discounts', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  const validateDiscount = async (code: string, customerEmail?: string): Promise<DiscountCoupon | null> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return null;

    let targetCoupon: DiscountCoupon | null = null;

    // 1. Check local cache first
    const localMatch = discounts.find(
      d => d.code.toUpperCase() === cleanCode
    );
    if (localMatch) {
      targetCoupon = localMatch;
    } else {
      // 2. Query direct from Firestore
      try {
        const snap = await getDoc(doc(db, 'discounts', cleanCode));
        if (snap.exists()) {
          targetCoupon = { ...snap.data(), id: snap.id } as DiscountCoupon;
        }
      } catch (err) {
        console.warn("Failed to validate discount coupon from Firestore:", err);
      }
    }

    if (!targetCoupon) {
      throw new Error("Invalid discount code.");
    }

    if (targetCoupon.status !== 'Active') {
      throw new Error(`Discount code is currently ${targetCoupon.status.toLowerCase()}.`);
    }

    // Check Start Date
    if (targetCoupon.startDate) {
      const start = new Date(targetCoupon.startDate);
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (now < start) {
          throw new Error(`Discount code is scheduled to start on ${targetCoupon.startDate}.`);
        }
      }
    }

    // Check End Date (Expiration)
    if (targetCoupon.endDate) {
      const end = new Date(targetCoupon.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        const now = new Date();
        if (now > end) {
          throw new Error(`Discount code expired on ${targetCoupon.endDate}.`);
        }
      }
    }

    // Check Total Usage Limit
    if (targetCoupon.usageLimit && targetCoupon.usageLimit > 0) {
      if (targetCoupon.used >= targetCoupon.usageLimit) {
        throw new Error("Discount code has reached its maximum usage limit.");
      }
    }

    // Check Per-User Limit
    if (targetCoupon.perUserLimit && targetCoupon.perUserLimit > 0 && customerEmail) {
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(
          ordersRef, 
          where('customerEmail', '==', customerEmail.toLowerCase().trim()),
          where('discountCode', '==', cleanCode)
        );
        const snap = await getDocs(q);
        if (snap.size >= targetCoupon.perUserLimit) {
          throw new Error(`You have reached the maximum allowed uses (${targetCoupon.perUserLimit}) for this discount code.`);
        }
      } catch (e) {
        console.warn("Error checking per-user discount limit:", e);
      }
    }

    return targetCoupon;
  };

  return (
    <DiscountContext.Provider value={{ discounts, addDiscount, updateDiscount, removeDiscount, validateDiscount }}>
      {children}
    </DiscountContext.Provider>
  );
}

export const useDiscounts = () => {
  const context = useContext(DiscountContext);
  if (!context) throw new Error('useDiscounts must be used within a DiscountProvider');
  return context;
};
