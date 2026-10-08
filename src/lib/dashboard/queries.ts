import { db } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { Order, OrderStatus, InventoryLevel } from '../../types';

/**
 * Optimized Firestore helper abstractions to aggregate metrics server-side or locally.
 * Includes indexes layout designed inside 'firestore.indexes.json'.
 */

// 1. Query orders completed in a precise date interval
export async function fetchCompletedOrdersByRange(startIso: string, endIso: string): Promise<Order[]> {
  try {
    const ordersColl = collection(db, 'orders');
    // Using compound indexes for high scale performance
    const q = query(
      ordersColl,
      where('status', '==', 'completed'),
      where('date', '>=', startIso),
      where('date', '<=', endIso)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  } catch (error) {
    console.error("Optimized Query Failed, fallback to full active mapping:", error);
    // Graceful fallback if composite index is active or provisioning
    const snap = await getDocs(collection(db, 'orders'));
    const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    return all.filter(o => o.status === 'completed' && o.date >= startIso && o.date <= endIso);
  }
}

// 2. Query products with low stock levels
export async function fetchLowStockLevels(): Promise<InventoryLevel[]> {
  const levelsColl = collection(db, 'inventory_levels');
  const snap = await getDocs(levelsColl);
  const levels = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryLevel));
  return levels.filter(lvl => lvl.quantityAvailable > 0 && lvl.quantityAvailable <= lvl.lowStockThreshold);
}

// 3. Query active orders current status pipeline breakdown
export async function getPipelineAggregates(): Promise<Record<OrderStatus, number>> {
  const ordersColl = collection(db, 'orders');
  const snap = await getDocs(ordersColl);
  const orders = snap.docs.map(doc => doc.data() as Order);
  
  const aggregates: Record<OrderStatus, number> = {
    pending: 0,
    payment_confirmed: 0,
    picked: 0,
    packed: 0,
    ready_for_pickup: 0,
    ready_for_delivery: 0,
    completed: 0,
    cancelled: 0
  };

  orders.forEach(o => {
    const status = o.status || 'pending';
    if (aggregates[status] !== undefined) {
      aggregates[status]++;
    }
  });

  return aggregates;
}
