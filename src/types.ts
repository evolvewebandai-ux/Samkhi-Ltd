import { LucideIcon } from 'lucide-react';

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl: string;
    specifications: Record<string, string>;
    brand?: string;
    rating?: number;
    reviews?: number;
    inStock: boolean;
    isFeatured?: boolean;
}

export interface Category {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    icon?: LucideIcon;
}

export interface SolarPackage {
    id: string;
    name: string;
    price: number;
    description: string;
    includes: string[];
    badge?: string;
}

export interface QuoteFormState {
    name: string;
    phone: string;
    email: string;
    parish: string;
    monthlyBill: string;
    propertyType: 'Residential' | 'Commercial';
    message: string;
}

export interface CartItem extends Product {
    quantity: number;
}

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled' | 'shipped';

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  date: string;
  total: number;
  status: OrderStatus;
  paymentStatus: 'authorized' | 'paid' | 'pending' | 'refunded';
  fulfillmentStatus: 'unfulfilled' | 'fulfilled' | 'partial' | 'restocked';
  items: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  location: string;
  orders: number;
  spent: number;
  lastOrder: string;
}
