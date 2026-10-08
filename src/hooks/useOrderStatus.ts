import { useState, useEffect } from 'react';
import { doc, onSnapshot, runTransaction, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanUndefined } from '../firebase';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Order, OrderStatus, StatusHistoryEntry, TimelineEntry } from '../types';
import { canTransition, getStatusConfig } from '../lib/orderStatus';
import { showToast } from '../lib/toast';

export function useOrderStatus(orderId?: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAdminAuth();

  const changedByEmail = user?.email || 'admin@samkhi.com';

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const docRef = doc(db, 'orders', orderId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setOrder({ ...docSnap.data(), id: docSnap.id } as Order);
        } else {
          setOrder(null);
          setError(`Order ${orderId} not found`);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`Error loading order ${orderId}:`, err);
        setError(err.message);
        setLoading(false);
        handleFirestoreError(err, OperationType.GET, `orders/${orderId}`);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  const updateOrderStatus = async (
    targetStatus: OrderStatus,
    note?: string,
    paymentMethodOverride?: 'online' | 'bank_transfer' | 'manual_override' | 'cod',
    isManualJump: boolean = false
  ) => {
    if (!orderId) throw new Error('No active order ID');

    // Load active order snapshot first
    const cleanId = orderId.replace('#', '');
    const orderDocRef = doc(db, 'orders', orderId);

    try {
      await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderDocRef);
        if (!orderSnap.exists()) {
          throw new Error(`Order ${orderId} not found in Firestore`);
        }

        const currentOrder = orderSnap.data() as Order;
        const currentStatus = currentOrder.status || 'pending';
        const fulfillmentMethod = currentOrder.fulfillment_method || 'pickup';

        // 1. Check validity of transition
        if (!canTransition(currentStatus, targetStatus, fulfillmentMethod, isManualJump)) {
          throw new Error(`Transition from ${currentStatus} to ${targetStatus} is disallowed.`);
        }

        // Keep track of what we are modifying
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('en-US');
        const timestampStr = `${timeStr} ${dateStr}`;

        // Ensure status history exists
        const currentHistory = currentOrder.status_history || [];
        const newHistoryEntry: StatusHistoryEntry = {
          status: targetStatus,
          timestamp: new Date().toISOString(),
          changed_by: changedByEmail,
          note: note || `Order advanced to ${getStatusConfig(targetStatus).label}`
        };

        const newHistoryList = [...currentHistory, newHistoryEntry];

        // Prepare new timeline entries
        const currentTimeline = currentOrder.timeline || [];
        const newTimelineEntries: TimelineEntry[] = [];

        // Build base status change timeline entry
        const timelineId = `tl_sc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        newTimelineEntries.push({
          id: timelineId,
          type: 'system',
          content: `🔄 Status changed: **${getStatusConfig(currentStatus).label}** ➔ **${getStatusConfig(targetStatus).label}** by _${changedByEmail}_.${note ? ` Note: "${note}"` : ''}`,
          timestamp: timestampStr
        });

        // 2. Perform side effects
        const orderUpdates: Partial<Order> = {
          status: targetStatus,
          status_history: newHistoryList,
        };

        // Side-effect: payment_confirmed
        if (targetStatus === 'payment_confirmed') {
          orderUpdates.paymentStatus = 'paid';
          if (paymentMethodOverride) {
            orderUpdates.payment_method = paymentMethodOverride;
          }
          
          newTimelineEntries.push({
            id: `tl_pc_${Date.now()}`,
            type: 'system',
            content: `💳 Payment confirmed via ${paymentMethodOverride || 'Manual Override'}. Reserved stock and queued for picking.`,
            timestamp: timestampStr
          });

          // Reserve stock
          if (currentOrder.lineItems) {
            for (const item of currentOrder.lineItems) {
              const cleanedVariantPart = item.sku && item.sku.includes('-') ? item.sku.split('-')[1].toLowerCase() : '';
              const lvlId = `lvl_${item.productId}${cleanedVariantPart ? `_${cleanedVariantPart}` : ''}`;
              const lvlRef = doc(db, 'inventory_levels', lvlId);
              const lvlSnap = await transaction.get(lvlRef);

              if (lvlSnap.exists()) {
                const onHand = lvlSnap.data().quantityOnHand || 0;
                const prevReserved = lvlSnap.data().quantityReserved || 0;
                const newReserved = prevReserved + item.quantity;
                const newAvailable = Math.max(0, onHand - newReserved);

                transaction.update(lvlRef, {
                  quantityReserved: newReserved,
                  quantityAvailable: newAvailable,
                  updatedAt: new Date().toISOString()
                });

                // Write inventory transaction
                const txId = `tx_res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                const txRef = doc(db, 'inventory_transactions', txId);
                transaction.set(txRef, {
                  id: txId,
                  productId: item.productId,
                  variantId: cleanedVariantPart || null,
                  transactionType: 'reserved',
                  quantityChange: item.quantity,
                  quantityBefore: onHand,
                  quantityAfter: onHand,
                  referenceType: 'order',
                  referenceId: orderId,
                  notes: `Reserved for order ${orderId}`,
                  performedBy: changedByEmail,
                  performedAt: new Date().toISOString()
                });
              }
            }
          }
        }

        // Side-effect: picked
        if (targetStatus === 'picked') {
          newTimelineEntries.push({
            id: `tl_picked_${Date.now()}`,
            type: 'system',
            content: `📋 Pick list compiled and items retrieved from physical shelves. ready to package.`,
            timestamp: timestampStr
          });
        }

        // Side-effect: packed
        if (targetStatus === 'packed') {
          newTimelineEntries.push({
            id: `tl_packed_${Date.now()}`,
            type: 'system',
            content: `📦 Order packaged securely. Packing slip printed.`,
            timestamp: timestampStr
          });
        }

        // Side-effect: ready_for_pickup or ready_for_delivery
        if (targetStatus === 'ready_for_pickup') {
          newTimelineEntries.push({
            id: `tl_rfp_${Date.now()}`,
            type: 'system',
            content: `🔔 SMS & Email notification dispatched to customer: "Your order is ready for pickup! Awaiting customer arrival."`,
            timestamp: timestampStr
          });
        }
        if (targetStatus === 'ready_for_delivery') {
          newTimelineEntries.push({
            id: `tl_rfd_${Date.now()}`,
            type: 'system',
            content: `🚚 SMS & Email notification dispatched to customer: "Your order is ready for delivery! Assigned to courier backlog."`,
            timestamp: timestampStr
          });
        }

        // Side-effect: completed
        if (targetStatus === 'completed') {
          orderUpdates.fulfillmentStatus = 'fulfilled';
          newTimelineEntries.push({
            id: `tl_comp_${Date.now()}`,
            type: 'system',
            content: `🟢 Order fulfilled successfully. ${fulfillmentMethod === 'pickup' ? 'Picked up by client.' : 'Courier confirmed safe dropoff.'} Thank you.`,
            timestamp: timestampStr
          });

          // Deduct from PhysicalOnHand, and release Reserved
          if (currentOrder.lineItems) {
            for (const item of currentOrder.lineItems) {
              const cleanedVariantPart = item.sku && item.sku.includes('-') ? item.sku.split('-')[1].toLowerCase() : '';
              const lvlId = `lvl_${item.productId}${cleanedVariantPart ? `_${cleanedVariantPart}` : ''}`;
              const lvlRef = doc(db, 'inventory_levels', lvlId);
              const lvlSnap = await transaction.get(lvlRef);

              if (lvlSnap.exists()) {
                const prevOnHand = lvlSnap.data().quantityOnHand || 0;
                const prevReserved = lvlSnap.data().quantityReserved || 0;

                // Release reserved, subtract physical hand count
                const newOnHand = Math.max(0, prevOnHand - item.quantity);
                const newReserved = Math.max(0, prevReserved - item.quantity);
                const newAvailable = Math.max(0, newOnHand - newReserved);

                transaction.update(lvlRef, {
                  quantityOnHand: newOnHand,
                  quantityReserved: newReserved,
                  quantityAvailable: newAvailable,
                  updatedAt: new Date().toISOString()
                });

                // Write inventory transaction
                const txId = `tx_complete_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                const txRef = doc(db, 'inventory_transactions', txId);
                transaction.set(txRef, {
                  id: txId,
                  productId: item.productId,
                  variantId: cleanedVariantPart || null,
                  transactionType: 'sold',
                  quantityChange: -item.quantity,
                  quantityBefore: prevOnHand,
                  quantityAfter: newOnHand,
                  referenceType: 'order',
                  referenceId: orderId,
                  notes: `Stock deducted on order ${orderId} completion`,
                  performedBy: changedByEmail,
                  performedAt: new Date().toISOString()
                });

                // Synchronize product catalogue stock
                const prodRef = doc(db, 'products', item.productId);
                const prodSnap = await transaction.get(prodRef);
                if (prodSnap.exists()) {
                  const prodData = prodSnap.data();
                  if (cleanedVariantPart && prodData.variants) {
                    const updatedVars = prodData.variants.map((v: any) => {
                      if (v.id === cleanedVariantPart) {
                        return { ...v, inventory: newOnHand };
                      }
                      return v;
                    });
                    const totalStock = updatedVars.reduce((sum: number, v: any) => sum + (v.inventory || 0), 0);
                    transaction.update(prodRef, {
                      variants: updatedVars,
                      inStock: totalStock > 0
                    });
                  } else {
                    transaction.update(prodRef, {
                      inventory: newOnHand,
                      inStock: newOnHand > 0
                    });
                  }
                }
              }
            }
          }

          // Register in Firestore activity logs
          const auditId = `audit_order_completed_${Date.now()}`;
          const auditRef = doc(db, 'activityLogs', auditId);
          transaction.set(auditRef, {
            id: auditId,
            action: 'order_completed',
            actor: changedByEmail,
            entityId: orderId,
            entityType: 'order',
            details: `Order ${orderId} grand total $${currentOrder.total} JMD marked Completed and fulfilled successfully.`,
            timestamp: Timestamp.now()
          });
        }

        // Side-effect: cancelled
        if (targetStatus === 'cancelled') {
          newTimelineEntries.push({
            id: `tl_cancel_${Date.now()}`,
            type: 'system',
            content: `❌ Order Cancelled. Reason: "${note || 'Not specified'}". SMS/Email cancellation dispatch triggered.`,
            timestamp: timestampStr
          });

          // Only release reserved if order was previously payment_confirmed or higher, but not completed yet.
          const wasReserved = currentHistory.some((h: any) => h.status === 'payment_confirmed') && currentStatus !== 'completed';
          
          if (wasReserved && currentOrder.lineItems) {
            for (const item of currentOrder.lineItems) {
              const cleanedVariantPart = item.sku && item.sku.includes('-') ? item.sku.split('-')[1].toLowerCase() : '';
              const lvlId = `lvl_${item.productId}${cleanedVariantPart ? `_${cleanedVariantPart}` : ''}`;
              const lvlRef = doc(db, 'inventory_levels', lvlId);
              const lvlSnap = await transaction.get(lvlRef);

              if (lvlSnap.exists()) {
                const onHand = lvlSnap.data().quantityOnHand || 0;
                const prevReserved = lvlSnap.data().quantityReserved || 0;
                const newReserved = Math.max(0, prevReserved - item.quantity);
                const newAvailable = Math.max(0, onHand - newReserved);

                transaction.update(lvlRef, {
                  quantityReserved: newReserved,
                  quantityAvailable: newAvailable,
                  updatedAt: new Date().toISOString()
                });

                // Write inventory transaction
                const txId = `tx_unres_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                const txRef = doc(db, 'inventory_transactions', txId);
                transaction.set(txRef, {
                  id: txId,
                  productId: item.productId,
                  variantId: cleanedVariantPart || null,
                  transactionType: 'unreserved',
                  quantityChange: -item.quantity,
                  quantityBefore: onHand,
                  quantityAfter: onHand,
                  referenceType: 'order',
                  referenceId: orderId,
                  notes: `Released reserved stock on order cancellation`,
                  performedBy: changedByEmail,
                  performedAt: new Date().toISOString()
                });
              }
            }
          }

          // If payment was already verified, flag for refund
          const wasPaid = currentOrder.paymentStatus === 'paid' || currentStatus === 'payment_confirmed';
          if (wasPaid) {
            newTimelineEntries.push({
              id: `tl_refund_flag_${Date.now()}`,
              type: 'system',
              content: `💰 [Refund Flagged] Order # ${orderId} cancelled after payment verification. Queued in finance refund backlog.`,
              timestamp: timestampStr
            });
          }

          // Audit Log
          const auditId = `audit_order_cancelled_${Date.now()}`;
          const auditRef = doc(db, 'activityLogs', auditId);
          transaction.set(auditRef, {
            id: auditId,
            action: 'order_cancelled',
            actor: changedByEmail,
            entityId: orderId,
            entityType: 'order',
            details: `Order ${orderId} cancelled by ${changedByEmail}. Reason: ${note || 'None given'}.`,
            timestamp: Timestamp.now()
          });
        }

        // Commit all changes to the order
        orderUpdates.timeline = [...currentTimeline, ...newTimelineEntries];
        transaction.update(orderDocRef, cleanUndefined(orderUpdates));
      });

      showToast(`Order ${orderId} successfully advanced to ${getStatusConfig(targetStatus).label}`, 'success');

      // Trigger automatic background SMTP notification dispatch
      if (order) {
        let triggerName = '';
        if (targetStatus === 'payment_confirmed') triggerName = 'payment_confirmed';
        else if (targetStatus === 'picked') triggerName = 'order_picked';
        else if (targetStatus === 'packed') triggerName = 'order_packed';
        else if (targetStatus === 'ready_for_pickup') triggerName = 'ready_for_pickup';
        else if (targetStatus === 'ready_for_delivery') triggerName = 'ready_for_delivery';
        else if (targetStatus === 'completed') triggerName = 'order_completed';
        else if (targetStatus === 'cancelled') triggerName = 'order_cancelled';

        if (triggerName && order.customerEmail) {
          fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_trigger: triggerName,
              to: order.customerEmail,
              data: {
                ...order,
                status: targetStatus,
                cancellation_reason: note || ''
              }
            })
          }).catch(err => {
            console.error("Failed shooting automatic status email dispatch backdrop:", err);
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to change order status in transaction:', err);
      showToast(err.message || 'Error updating order status', 'error');
      throw err;
    }
  };

  return {
    order,
    loading,
    error,
    updateOrderStatus
  };
}
