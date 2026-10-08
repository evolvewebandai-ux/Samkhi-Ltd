import { LucideIcon } from 'lucide-react';

export interface ProductVariant {
  id: string;
  title: string;
  options: { [key: string]: string };
  price: number;
  costPrice?: number;
  inventory: number;
  sku?: string;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    costPrice?: number;
    imageUrl: string;
    specifications: Record<string, string>;
    brand?: string;
    category?: string;
    rating?: number;
    reviews?: number;
    inStock: boolean;
    isFeatured?: boolean;
    variants?: ProductVariant[];
    options?: { name: string; values: string[] }[];
    inventory?: number;
    sku?: string;
    barcode?: string;
    compareAtPrice?: number;
    tags?: string[];
    status?: 'Active' | 'Draft' | 'Archived';
    images?: {
        id: string;
        url: string;
        thumbnailUrl: string;
        altText: string;
        isPrimary: boolean;
        order: number;
    }[];
    shortDescription?: string;
    productType?: 'simple' | 'variable' | 'grouped';
    groupedProductIds?: string[];
    seo?: {
        pageTitle?: string;
        metaDescription?: string;
        urlSlug?: string;
        ogImage?: string;
    };
    stockHistory?: {
        id: string;
        change: number;
        reason: string;
        timestamp: string;
        userId?: string;
    }[];
    views?: number;
    orders?: number;
    revenue?: number;
    updatedAt?: string;
    collections?: string[];
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

export type OrderStatus = 
  | 'pending'
  | 'payment_confirmed'
  | 'picked'
  | 'packed'
  | 'ready_for_pickup'
  | 'ready_for_delivery'
  | 'completed'
  | 'cancelled';

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: any; // Can be Timestamp or string/Date ISO string
  changed_by: string; // uid / email
  note?: string;
}

export interface TimelineEntry {
  id: string;
  type: 'comment' | 'system' | 'email';
  content: string;
  timestamp: string;
  author?: string;
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  sku?: string;
}

export interface ShippingRate {
  id: string;
  name: string;               // e.g. "Kingston", "St. James", "St. Ann"
  parish_code: string;        // e.g. "KGN", "JA", unique, slug
  type: 'parish' | 'custom_zone';
  rate: number;               // JMD, >= 0, e.g. 2500
  estimated_days: string;     // e.g. "1-2 business days"
  is_active: boolean;
  free_shipping_threshold?: number; // optional, e.g. 500000 = free shipping over $500k JMD
  sort_order: number;
  created_at?: any;
  updated_at?: any;
}

export interface PickupLocation {
  id: string;
  name: string;              // e.g. "Kingston Main Store"
  address: string;
  parish: string;
  phone: string;
  hours: string;             // e.g. "Mon-Fri 9am-5pm"
  is_active: boolean;
  is_default: boolean;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  date: string;
  total: number;
  subtotal: number; // products total (required now)
  taxes?: number;
  status: OrderStatus;
  status_history?: StatusHistoryEntry[];
  payment_method?: 'online' | 'bank_transfer' | 'manual_override' | 'cod';
  fulfillment_method: 'pickup' | 'delivery';
  fulfillment_type?: 'shipping' | 'pickup'; // target state shipping or pickup
  shipping_rate_id?: string;       // ref to shipping_rates.id
  shipping_parish?: string;        // e.g. "Kingston"
  shipping_cost: number;           // JMD, 0 if pickup
  shipping_address?: {
    line1: string;
    line2?: string;
    parish: string;
    phone: string;
  };
  pickup_location_id?: string;     // ref to pickup_locations.id
  shipping_total: number;          // = shipping_cost
  grand_total: number;             // subtotal + shipping_total
  paymentStatus: 'authorized' | 'paid' | 'pending' | 'refunded';
  fulfillmentStatus: 'unfulfilled' | 'fulfilled' | 'partial' | 'restocked';
  items: number;
  lineItems?: OrderItem[];
  timeline?: TimelineEntry[];
  fulfillmentLocation?: string;
  receiptNumber?: string;
  notes?: string;
  tags?: string[];
  discountCode?: string;
  discountAmount?: number;
  parish?: string; // KEEP existing parish field to prevent breaking changes
  financingPlan?: any;
  shippingAddress?: any;
  tax?: number;
  paymentMethod?: string;
}

export interface CollectionCondition {
  id: string;
  field: 'tag' | 'title' | 'type' | 'vendor' | 'price' | 'weight' | 'inventory';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
  value: string;
}

export interface Collection {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  productCount: number;
  type: 'manual' | 'automated';
  handle?: string;
  collection_type?: 'manual' | 'automated';
  conditions?: CollectionCondition[];
  conditionOperator?: 'all' | 'any';
  status: 'active' | 'archived';
  updatedAt: string;
}

export interface SavedAddress {
  id: string;
  name: string; // E.g. "Home", "Office"
  street: string;
  parish: string; // Parish in Jamaica
  phone: string;
  isDefault: boolean;
}

export interface SavedPayment {
  id: string;
  brand: string; // E.g. "Visa", "Mastercard"
  expiry: string; // E.g. "12/28"
  last4: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  location: string;
  orders: number;
  spent: number;
  lastOrder: string;
  status?: 'active' | 'suspended';
  firstName?: string;
  lastName?: string;
  phone?: string;
  addresses?: SavedAddress[];
  wishlist?: string[];
  savedPayments?: SavedPayment[];
  emailPreferences?: {
    promotional: boolean;
    orderUpdates: boolean;
    reviews: boolean;
  };
  returns?: ReturnRequest[];
}

export interface ReturnedItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  reason: string;
  sku?: string;
  imageUrl?: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail?: string;
  items: ReturnedItem[];
  refundAmount: number;
  condition: 'Unopened / New' | 'Defective on Arrival' | 'Damaged Shipping' | 'Opened / Used';
  status: 'Requested' | 'Approved' | 'Restocked & Refunded' | 'Rejected';
  notes?: string;
  requestedAt: string;
  processedAt?: string;
}

export interface DiscountCoupon {
  id: string;
  code: string;
  type: 'Percentage' | 'Fixed Amount' | 'Free Shipping';
  value: string;
  status: 'Active' | 'Scheduled' | 'Expired';
  used: number;
  startDate: string;
  endDate?: string;
  minPurchase?: number;
  // Scope / Eligibility Target
  appliesTo?: 'all' | 'category' | 'specific_products';
  targetCategory?: string;
  targetProductIds?: string[];
  // Usage Restrictions & Limits
  usageLimit?: number; // Overall max usage limit across all users
  perUserLimit?: number; // Max usages permitted per customer email
}

export interface UserRole {
  id: string;
  email: string;
  role: 'super-admin' | 'manager';
  name?: string;
  createdAt?: string;
}

// =========================================================================
//            🗳️ SECTION 1: CORE INVENTORY DATA STRUCTURES
// =========================================================================

export interface InventoryLevel {
  id: string;
  productId: string;
  variantId?: string; // empty if the product has no variants
  quantityOnHand: number; // actual physical stock right now
  quantityReserved: number; // committed to open orders
  quantityAvailable: number; // quantityOnHand - quantityReserved
  quantityIncoming: number; // expected from purchase orders
  reorderPoint: number; // when to reorder (alert threshold)
  reorderQuantity: number; // suggested size of PO
  lowStockThreshold: number; // visual marker threshold
  isTracked: boolean; // default true
  lastCountedAt?: string; // date of physical inventory take
  sku?: string;
  barcode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type InventoryTransactionType = 
  | 'received' 
  | 'sold' 
  | 'returned' 
  | 'adjusted' 
  | 'damaged' 
  | 'lost' 
  | 'reserved' 
  | 'unreserved';

export type InventoryReferenceType = 
  | 'order' 
  | 'purchase_order' 
  | 'adjustment' 
  | 'return' 
  | 'inventory_count';

export interface InventoryTransaction {
  id: string;
  productId: string;
  variantId?: string;
  transactionType: InventoryTransactionType;
  quantityChange: number; // signed quantity change (can be + or -)
  quantityBefore: number;
  quantityAfter: number;
  referenceType: InventoryReferenceType;
  referenceId?: string; // e.g. PO-001 or Order ID
  notes?: string;
  performedBy?: string; // staff/admin name or email
  performedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  leadTimeDays: number;
  notes?: string;
  isActive: boolean;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  poNumber: string; // auto-generated e.g. PO-00001
  supplierId: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  productId: string;
  variantId?: string; // empty if no variants
  quantityOrdered: number;
  quantityReceived?: number;
  unitCost: number;
  createdAt?: string;
}

