import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { collection, onSnapshot, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanUndefined, auth } from '../firebase';
import { useAdminAuth } from './AdminAuthContext';
import { ProductService } from '../lib/services/ProductService';
import { showToast } from '../lib/toast';
import { PRODUCTS } from '../data';

interface ProductContextType {
  products: Product[];
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  removeProduct: (id: string) => Promise<any>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const { isAdmin } = useAdminAuth();

  useEffect(() => {
    const productsColl = collection(db, 'products');
    const unsubscribe = onSnapshot(productsColl, async (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach(d => {
        list.push({ ...d.data(), id: d.id } as Product);
      });

      setProducts(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => {
      unsubscribe();
    };
  }, [isAdmin]);

  const addProduct = async (product: Product) => {
    const path = `products/${product.id}`;
    try {
      const userEmail = auth.currentUser?.email || 'admin@samkhi.com';
      await ProductService.createProduct(product, userEmail);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const path = `products/${id}`;
    try {
      const userEmail = auth.currentUser?.email || 'admin@samkhi.com';
      await ProductService.updateProduct(id, updates, userEmail);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const removeProduct = async (id: string): Promise<any> => {
    const path = `products/${id}`;
    try {
      const userEmail = auth.currentUser?.email || 'admin@samkhi.com';
      const report = await ProductService.deleteProduct(id, userEmail);
      if (report.blocked) {
        showToast(`🔴 BLOCKED - ${report.message}`, 'error');
        throw new Error(report.message);
      } else {
        showToast(`🟢 DELETED - ${report.message}`);
      }
      return report;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  return (
    <ProductContext.Provider value={{ products: products.length > 0 ? products : PRODUCTS, addProduct, updateProduct, removeProduct }}>
      {children}
    </ProductContext.Provider>
  );
}

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
