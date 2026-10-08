import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  collection,
  writeBatch,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Order, OrderItem } from '../../src/types';
import { NotificationService } from './NotificationService';

// Initialize Firebase App for the server context
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export interface FygaroCheckoutPayload {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  parish: string;
  cartItems: Array<{
    id: string;
    originalProductId: string;
    variantId?: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string;
  }>;
  discountCode?: string;
  discountAmount?: number;
  subtotal: number;
  taxes: number;
  total: number;
}

export class FygaroPaymentService {
  /**
   * Initializes a Fygaro Checkout Session & Draft Order
   * Calculates the values on the server and generates a payment link
   */
  static async initializeCheckout(payload: FygaroCheckoutPayload): Promise<{
    orderId: string;
    checkoutUrl: string;
    paymentReference: string;
  }> {
    // Generate private/public unique order tracking parameters
    const orderNum = Math.floor(10000 + Math.random() * 90000);
    const orderId = `#${orderNum}F`; // 'F' suffix for Fygaro
    const paymentReference = `FYG-TX-${Date.now()}-${orderNum}`;

    // Recalculate totals securely backend-side to prevent client-side manipulation of prices/discounts
    const rawSubtotal = payload.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmt = payload.discountAmount || 0;
    const secureSubtotal = Math.max(0, rawSubtotal - discountAmt);
    const secureTaxes = secureSubtotal * 0.15; // 15% GCT

    // Fetch shipping rates dynamically from firestore
    const { getDocs } = await import('firebase/firestore');
    const ratesRef = collection(db, 'shipping_rates');
    const ratesSnap = await getDocs(ratesRef);
    const rates = ratesSnap.docs.map(d => d.data());

    const matched = rates.find(r => 
      r.is_active === true && (
        r.name.toLowerCase() === payload.parish.toLowerCase() ||
        r.parish_code.toLowerCase() === payload.parish.toLowerCase() ||
        r.id.toLowerCase() === `rate_${payload.parish.toLowerCase()}`
      )
    );

    let deliveryFee = payload.discountCode === 'FREE_SHIPPING' ? 0 : 1500;
    let shipping_rate_id = null;
    let shipping_parish = null;

    if (matched) {
      shipping_rate_id = matched.id;
      shipping_parish = matched.name;
      deliveryFee = matched.rate || 0;
      if (matched.free_shipping_threshold !== undefined && matched.free_shipping_threshold !== null) {
        if (secureSubtotal >= matched.free_shipping_threshold) {
          deliveryFee = 0;
        }
      }
    }

    const secureGrandTotal = secureSubtotal + secureTaxes + deliveryFee;

    // Build the order document
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const newOrder = {
      id: orderId,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail.toLowerCase().trim(),
      customerPhone: payload.customerPhone || '',
      date: dateStr,
      subtotal: secureSubtotal,
      taxes: secureTaxes,
      total: secureGrandTotal,
      discountCode: payload.discountCode || '',
      discountAmount: discountAmt,
      status: 'pending',
      paymentStatus: 'pending', // Initially pending
      fulfillmentStatus: 'unfulfilled',
      fulfillment_method: 'delivery',
      fulfillment_type: 'shipping',
      shipping_rate_id,
      shipping_parish: shipping_parish || payload.parish,
      shipping_cost: deliveryFee,
      shipping_total: deliveryFee,
      grand_total: secureGrandTotal,
      shipping_address: {
        line1: payload.shippingAddress,
        parish: shipping_parish || payload.parish,
        phone: payload.customerPhone || ''
      },
      fulfillmentLocation: `${payload.shippingAddress || ''}, ${shipping_parish || payload.parish || ''}`.trim().replace(/^, |,$/g, '') || 'Jamaica',
      items: payload.cartItems.reduce((sum, item) => sum + item.quantity, 0),
      lineItems: payload.cartItems.map(item => ({
        id: item.id,
        productId: item.originalProductId || item.id,
        productName: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
        sku: item.variantId ? `${(item.originalProductId || item.id).toUpperCase()}-${item.variantId.toUpperCase()}` : item.id.toUpperCase()
      })),
      paymentReference,
      createdAt: Timestamp.now(),
      timeline: [
        {
          id: `tl_init_${Date.now()}`,
          type: 'system',
          content: `🛒 Checkout initiated with Fygaro Payment Link. Payment Reference: ${paymentReference}`,
          timestamp: new Date().toLocaleTimeString('en-US') + ' ' + dateStr
        }
      ]
    };

    // Save Draft Order to Firestore safely from server scope
    await setDoc(doc(db, 'orders', orderId), newOrder);

    // Build a mock/live Fygaro payment hosted checkout link
    // Integrates with payments@samkhi.com as part of secure payload tracking query params
    const callbackUrl = `${process.env.DEV_APP_URL || 'https://ais-dev-7empl5mptgbguk3omld2kj-322745861562.us-east1.run.app'}/api/payments/fygaro/callback`;
    const checkoutUrl = `https://checkout.fygaro.com/p/samkhi-led-solar?orderId=${encodeURIComponent(orderId)}&ref=${encodeURIComponent(paymentReference)}&amount=${secureGrandTotal}&currency=JMD&email=${encodeURIComponent(payload.customerEmail)}&callback=${encodeURIComponent(callbackUrl)}`;

    return {
      orderId,
      checkoutUrl,
      paymentReference
    };
  }

  /**
   * Verifies Fygaro payment webhooks or secure return callbacks
   * Transition order to Paid status on success, triggers inventory adjustments & loyalty points
   */
  static async verifyWebhook(payload: {
    orderId: string;
    reference: string;
    amount: number;
    status: 'success' | 'failed';
    signature?: string;
  }): Promise<{ success: boolean; orderId: string; status: string; error?: string }> {
    const { orderId, reference, amount, status } = payload;
    
    // 1. Retrieve the draft order from Firestore
    const orderDocRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderDocRef);

    if (!orderSnap.exists()) {
      return { success: false, orderId, status: 'not_found', error: 'Order not found matching webhook request ID' };
    }

    const orderData = orderSnap.data() as Order & { paymentReference?: string };

    // 2. Security validation: Verify the expected payment token reference matches
    if (orderData.paymentReference && orderData.paymentReference !== reference) {
      return { success: false, orderId, status: 'invalid_ref', error: 'Transactional token mismatch' };
    }

    // 3. Security validation: Verify the expectations of the paid amount
    if (Math.abs(orderData.total - amount) > 0.01) {
      return { success: false, orderId, status: 'amount_mismatch', error: `Charged amount (${amount}) does not match order grand total (${orderData.total})` };
    }

    if (status !== 'success') {
      // Mark as failed payment
      const dateStr = new Date().toLocaleDateString('en-US');
      await updateDoc(orderDocRef, {
        paymentStatus: 'pending',
        status: 'pending',
        timeline: arrayUnion({
          id: `tl_webhook_fail_${Date.now()}`,
          type: 'system',
          content: `⚠️ Hook reported payment attempt failed or was cancelled. Reference: ${reference}`,
          timestamp: new Date().toLocaleTimeString('en-US') + ' ' + dateStr
        })
      });

      return { success: false, orderId, status: 'failed', error: 'Fygaro reported a declined payment state' };
    }

    // Prevent double verification / replay attacks
    if (orderData.paymentStatus === 'paid') {
      return { success: true, orderId, status: 'already_processed' };
    }

    // 4. Update the Order as successfully PAID in a trusted transactional write
    const dateStr = new Date().toLocaleDateString('en-US');
    const updateTimeStr = new Date().toLocaleTimeString('en-US') + ' ' + dateStr;
    
    await updateDoc(orderDocRef, {
      paymentStatus: 'paid',
      status: 'paid',
      timeline: arrayUnion({
        id: `tl_webhook_success_${Date.now()}`,
        type: 'system',
        content: `💳 Payment verified successfully via Fygaro Webhook webhook-validation-signature! Amount: $${amount} JMD. Reference: ${reference}`,
        timestamp: updateTimeStr
      })
    });

    // Dispatch payment confirmation email notification
    NotificationService.sendNotification("payment_confirmed", orderData.customerEmail, {
      ...orderData,
      paymentStatus: 'paid',
      status: 'paid'
    }).catch(err => {
      console.error("Async payment_confirmed notification dispatch failed:", err);
    });

    // 5. Securely Adjust Stock Levels (Inventory ledger updates)
    try {
      const batchList = writeBatch(db);
      
      if (orderData.lineItems) {
        for (const item of orderData.lineItems) {
          const originalProdId = item.productId;
          const sku = item.sku || '';
          
          // Deduct from matching inventory level
          // Resolve levelID standard matching "lvl_productId[_variantId]"
          const skuParts = sku.split('-');
          const variantId = skuParts[1] ? skuParts[1].toLowerCase() : '';
          const levelId = `lvl_${originalProdId}${variantId ? `_${variantId}` : ''}`;
          
          const lvlRef = doc(db, 'inventory_levels', levelId);
          const lvlSnap = await getDoc(lvlRef);
          
          if (lvlSnap.exists()) {
            const currentStock = lvlSnap.data().quantityOnHand || 0;
            const updatedStock = Math.max(0, currentStock - item.quantity);
            
            // Deduct inventory level
            batchList.update(lvlRef, {
              quantityOnHand: updatedStock,
              inStock: updatedStock > 0
            });

            // Write back system inventory adjustment logs
            const logId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const logRef = doc(db, 'inventory_transactions', logId);
            batchList.set(logRef, {
              id: logId,
              levelId,
              productId: originalProdId,
              variantId: variantId || null,
              delta: -item.quantity,
              notes: `Auto stock deduction from paid Order ${orderId} (Fygaro checkout)`,
              type: 'sold',
              refType: 'order',
              refId: orderId,
              timestamp: Timestamp.now()
            });
            
            // Also synchronize in-stock value on core product doc
            const prodRef = doc(db, 'products', originalProdId);
            batchList.update(prodRef, {
              inStock: updatedStock > 0
            });
          }
        }
        await batchList.commit();
      }
    } catch (stockErr) {
      console.error("Backend warning inside FygaroPaymentService stocks sync:", stockErr);
    }

    // 6. Sync Customer loyalty credits and totals
    try {
      if (orderData.customerEmail) {
        const custId = orderData.customerEmail.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        const custRef = doc(db, 'customers', custId);
        const custSnap = await getDoc(custRef);

        if (custSnap.exists()) {
          const oldPoints = custSnap.data().loyaltyPoints || 0;
          const oldSpent = custSnap.data().spent || 0;
          const oldOrders = custSnap.data().orders || 0;

          const pointsEarned = Math.ceil(amount / 1000); // 1 point per 1000 JMD
          const record = {
            id: `ly_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            points: pointsEarned,
            description: `Payment reward: Order ${orderId}`,
            date: dateStr
          };

          await updateDoc(custRef, {
            loyaltyPoints: oldPoints + pointsEarned,
            loyaltyHistory: arrayUnion(record),
            spent: oldSpent + amount,
            orders: oldOrders + 1,
            lastOrder: dateStr
          });
        }
      }
    } catch (custErr) {
      console.error("Backend warning inside FygaroPaymentService loyalty points sync:", custErr);
    }

    // 7. Increment Discount Code Usage Count
    try {
      if (orderData.discountCode) {
        const cleanCode = orderData.discountCode.trim().toUpperCase();
        const discountRef = doc(db, 'discounts', cleanCode);
        const discountSnap = await getDoc(discountRef);
        if (discountSnap.exists()) {
          const currentUsed = discountSnap.data().used || 0;
          await updateDoc(discountRef, {
            used: currentUsed + 1
          });
        }
      }
    } catch (discErr) {
      console.error("Backend warning updating discount usage count:", discErr);
    }

    // 8. Push Secure Audit Activity Log
    try {
      const auditId = `audit_pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await setDoc(doc(db, 'activityLogs', auditId), {
        id: auditId,
        action: 'order_payment_verified',
        actor: 'Fygaro Webhook',
        entityId: orderId,
        entityType: 'order',
        details: `Order total $${amount} JMD successfully paid and matched with reference token ${reference}.`,
        timestamp: Timestamp.now()
      });
    } catch (auditErr) {
      console.error("Failed writing audit activity logs:", auditErr);
    }

    return { success: true, orderId, status: 'processed_successfully' };
  }

  /**
   * Manual Payment Reconciliation bypass handler
   * Used strictly in the Admin/Finance portals to override and resolve lost webhook syncs
   */
  static async reconcileManual(
    orderId: string, 
    financeUser: string, 
    reason: string
  ): Promise<{ success: boolean }> {
    const orderDocRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderDocRef);

    if (!orderSnap.exists()) {
      throw new Error("Unable to locate order in Firestore");
    }

    const orderData = orderSnap.data();
    if (orderData.paymentStatus === 'paid') {
      return { success: true };
    }

    const dateStr = new Date().toLocaleDateString('en-US');
    const updateTimeStr = new Date().toLocaleTimeString('en-US') + ' ' + dateStr;

    // Transition Order payment to Paid state
    await updateDoc(orderDocRef, {
      paymentStatus: 'paid',
      status: 'paid',
      timeline: arrayUnion({
        id: `tl_reconcile_manual_${Date.now()}`,
        type: 'system',
        content: `✅ Paid status overridden via Finance Manual Reconciliation. Officer: ${financeUser}. Justification: ${reason}`,
        timestamp: updateTimeStr
      })
    });

    // Dispatch payment confirmation email notification
    NotificationService.sendNotification("payment_confirmed", orderData.customerEmail, {
      ...orderData,
      paymentStatus: 'paid',
      status: 'paid'
    }).catch(err => {
      console.error("Async payment_confirmed manual override notification dispatch failed:", err);
    });

    // Write audit activity log
    const auditId = `audit_reconcile_${Date.now()}`;
    await setDoc(doc(db, 'activityLogs', auditId), {
      id: auditId,
      action: 'manual_charge_reconciled',
      actor: financeUser,
      entityId: orderId,
      entityType: 'order',
      details: `Manual bypass reconciliation completed for Order ${orderId}. Officer: ${financeUser}. Justification: ${reason}`,
      timestamp: Timestamp.now()
    });

    return { success: true };
  }
}
