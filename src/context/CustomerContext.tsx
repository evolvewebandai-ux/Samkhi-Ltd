import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer } from '../types';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanUndefined, auth } from '../firebase';
import { useAdminAuth } from './AdminAuthContext';

interface CustomerContextType {
  customers: Customer[];
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { isAdmin } = useAdminAuth();

  useEffect(() => {
    if (!isAdmin) {
      setCustomers([]);
      return;
    }

    const customersColl = collection(db, 'customers');
    const unsubscribe = onSnapshot(customersColl, async (snapshot) => {
      const list: Customer[] = [];
      snapshot.forEach(d => {
        list.push({ ...d.data(), id: d.id } as Customer);
      });

      setCustomers(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'customers');
    });

    return () => {
      unsubscribe();
    };
  }, [isAdmin]);

  const addCustomer = async (customer: Customer) => {
    const id = customer.id || customer.email.replace(/[^a-zA-Z0-9]/g, '_');
    const path = `customers/${id}`;
    const cleanCust = cleanUndefined({ ...customer, id });
    try {
      await setDoc(doc(db, 'customers', id), cleanCust);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    const path = `customers/${id}`;
    const cleanUpdates = cleanUndefined(updates);
    try {
      await updateDoc(doc(db, 'customers', id), cleanUpdates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const removeCustomer = async (id: string) => {
    const path = `customers/${id}`;
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  return (
    <CustomerContext.Provider value={{ customers, addCustomer, updateCustomer, removeCustomer }}>
      {children}
    </CustomerContext.Provider>
  );
}

export const useCustomers = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
};
