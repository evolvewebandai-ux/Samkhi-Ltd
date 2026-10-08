import { 
  Clock, 
  CreditCard, 
  PackageSearch, 
  Package, 
  Store, 
  Truck, 
  CheckCircle, 
  XCircle,
  LucideIcon
} from 'lucide-react';
import { OrderStatus } from '../types';

export interface OrderStatusConfig {
  key: OrderStatus;
  label: string;
  description: string;
  color: {
    badgeBg: string;
    badgeText: string;
    border: string;
    text: string;
    bg: string;
    fill: string;
  };
  icon: LucideIcon;
  order: number;
}

export const ORDER_STATUSES: OrderStatusConfig[] = [
  {
    key: 'pending',
    label: 'Pending',
    description: 'Order created; awaiting payment confirmation.',
    color: {
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-700',
      border: 'border-slate-200',
      text: 'text-slate-600',
      bg: 'bg-slate-50',
      fill: 'fill-slate-600'
    },
    icon: Clock,
    order: 1
  },
  {
    key: 'payment_confirmed',
    label: 'Payment Confirmed',
    description: 'Payment verified (Online, Bank Transfer, or Manual Override).',
    color: {
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700',
      border: 'border-blue-200',
      text: 'text-blue-600',
      bg: 'bg-blue-50',
      fill: 'fill-blue-600'
    },
    icon: CreditCard,
    order: 2
  },
  {
    key: 'picked',
    label: 'Picked',
    description: 'Items have been retrieved from inventory.',
    color: {
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      border: 'border-amber-200',
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      fill: 'fill-amber-700'
    },
    icon: PackageSearch,
    order: 3
  },
  {
    key: 'packed',
    label: 'Packed',
    description: 'Order is boxed and labeled.',
    color: {
      badgeBg: 'bg-orange-100',
      badgeText: 'text-orange-800',
      border: 'border-orange-200',
      text: 'text-orange-700',
      bg: 'bg-orange-50',
      fill: 'fill-orange-700'
    },
    icon: Package,
    order: 4
  },
  {
    key: 'ready_for_pickup',
    label: 'Ready for Pickup',
    description: 'Awaiting customer arrival.',
    color: {
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-800',
      border: 'border-purple-200',
      text: 'text-purple-700',
      bg: 'bg-purple-50',
      fill: 'fill-purple-700'
    },
    icon: Store,
    order: 5
  },
  {
    key: 'ready_for_delivery',
    label: 'Ready for Delivery',
    description: 'Awaiting courier pickup.',
    color: {
      badgeBg: 'bg-indigo-100',
      badgeText: 'text-indigo-800',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
      bg: 'bg-indigo-50',
      fill: 'fill-indigo-700'
    },
    icon: Truck,
    order: 6
  },
  {
    key: 'completed',
    label: 'Completed',
    description: 'Customer successfully picked up or courier confirmed delivery.',
    color: {
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-800',
      border: 'border-green-200',
      text: 'text-green-700',
      bg: 'bg-green-50',
      fill: 'fill-green-700'
    },
    icon: CheckCircle,
    order: 7
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    description: 'Order aborted.',
    color: {
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-800',
      border: 'border-red-200',
      text: 'text-red-700',
      bg: 'bg-red-50',
      fill: 'fill-red-700'
    },
    icon: XCircle,
    order: 8
  }
];

export function getStatusConfig(status: OrderStatus): OrderStatusConfig {
  const config = ORDER_STATUSES.find(s => s.key === status);
  if (!config) {
    // Default fallback
    return ORDER_STATUSES[0];
  }
  return config;
}

export function canTransition(
  from: OrderStatus, 
  to: OrderStatus, 
  fulfillmentMethod: 'pickup' | 'delivery' = 'pickup',
  isManualOverride: boolean = false
): boolean {
  if (from === to) return true;
  if (from === 'completed') return false; // terminal outcome
  if (from === 'cancelled') return false; // terminal outcome
  if (to === 'cancelled') return true; // everything else can be cancelled

  // Override jump allows transitions if manual jump is chosen, but complete -> cancel is STILL blocked.
  if (isManualOverride) {
    return true; 
  }

  // Normal progressive forward flow validation
  switch (from) {
    case 'pending':
      return to === 'payment_confirmed';
    case 'payment_confirmed':
      return to === 'picked';
    case 'picked':
      return to === 'packed';
    case 'packed':
      if (fulfillmentMethod === 'pickup') {
        return to === 'ready_for_pickup';
      } else {
        return to === 'ready_for_delivery';
      }
    case 'ready_for_pickup':
      return to === 'completed';
    case 'ready_for_delivery':
      return to === 'completed';
    default:
      return false;
  }
}

export function getNextStatus(
  current: OrderStatus, 
  fulfillmentMethod: 'pickup' | 'delivery' = 'pickup'
): OrderStatus | null {
  switch (current) {
    case 'pending':
      return 'payment_confirmed';
    case 'payment_confirmed':
      return 'picked';
    case 'picked':
      return 'packed';
    case 'packed':
      return fulfillmentMethod === 'pickup' ? 'ready_for_pickup' : 'ready_for_delivery';
    case 'ready_for_pickup':
    case 'ready_for_delivery':
      return 'completed';
    default:
      return null;
  }
}
