import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order } from '../types';
import { collection, onSnapshot, doc, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanUndefined, auth } from '../firebase';
import { useAdminAuth } from './AdminAuthContext';

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Order) => Promise<void>;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const { isAdmin } = useAdminAuth();

  useEffect(() => {
    if (!isAdmin) {
      setOrders([]);
      return;
    }

    const ordersColl = collection(db, 'orders');
    const unsubscribe = onSnapshot(ordersColl, async (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach(d => {
        list.push({ ...d.data(), id: d.id } as Order);
      });

      // Sort orders by id or date descending
      list.sort((a, b) => b.id.localeCompare(a.id));
      setOrders(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => {
      unsubscribe();
    };
  }, [isAdmin]);

  const addOrder = async (order: Order) => {
    const path = `orders/${order.id}`;
    try {
      const cleanOrd = cleanUndefined(order);
      await runTransaction(db, async (transaction) => {
        // --- 1. Identify references ---
        let discountRef = null;
        let customerRef = null;

        if (order.discountCode) {
          discountRef = doc(db, 'discounts', order.discountCode.toUpperCase());
        }
        if (order.customerEmail) {
          const custId = order.customerEmail.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
          customerRef = doc(db, 'customers', custId);
        }

        // --- 2. Perform all READS first ---
        let discountSnap = null;
        if (discountRef) {
          discountSnap = await transaction.get(discountRef);
        }

        let customerSnap = null;
        if (customerRef) {
          customerSnap = await transaction.get(customerRef);
        }

        // --- 3. Perform all WRITES second ---
        // Save the discount counter increment if coupon exists
        if (discountRef && discountSnap && discountSnap.exists()) {
          const currentUsed = discountSnap.data().used || 0;
          transaction.update(discountRef, { used: currentUsed + 1 });
        }

        // Save the new order
        const orderRef = doc(db, 'orders', order.id);
        transaction.set(orderRef, cleanOrd);

        // Save or update customer profile
        if (customerRef) {
          if (customerSnap && customerSnap.exists()) {
            const currentSpent = customerSnap.data().spent || 0;
            const currentOrders = customerSnap.data().orders || 0;
            transaction.update(customerRef, {
              spent: currentSpent + (order.total || 0),
              orders: currentOrders + 1,
              lastOrder: order.date || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
              location: order.fulfillmentLocation || customerSnap.data().location || 'Jamaica'
            });
          } else {
            transaction.set(customerRef, {
              id: customerRef.id,
              name: order.customerName,
              email: order.customerEmail.toLowerCase().trim(),
              location: order.fulfillmentLocation || 'Jamaica',
              orders: 1,
              spent: order.total || 0,
              lastOrder: order.date || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
            });
          }
        }
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const updateOrder = async (orderId: string, updates: Partial<Order>) => {
    const path = `orders/${orderId}`;
    try {
      const cleanUpdates = cleanUndefined(updates);
      await updateDoc(doc(db, 'orders', orderId), cleanUpdates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrders must be used within an OrderProvider');
  return context;
};
