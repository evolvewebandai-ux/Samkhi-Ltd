import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Printer, MoreHorizontal, ChevronUp, ChevronDown, Mail, 
  ExternalLink, Smile, AtSign, Hash, Paperclip, Send, Edit2, MapPin, 
  Package, CreditCard, History, ShieldCheck, Tag as TagIcon, X, FileText,
  Plus, Trash2, Check, AlertTriangle, Info, Calendar, Clock, User
} from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { useProducts } from '../../context/ProductContext';
import { useCustomers } from '../../context/CustomerContext';
import { useDiscounts } from '../../context/DiscountContext';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { TimelineEntry, OrderItem, Order, PickupLocation } from '../../types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import OrderStatusBadge from '../../components/admin/OrderStatusBadge';
import OrderStatusPipeline from '../../components/admin/OrderStatusPipeline';
import OrderStatusUpdater from '../../components/admin/OrderStatusUpdater';
import OrderStatusHistory from '../../components/admin/OrderStatusHistory';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Contexts
  const { orders, updateOrder, addOrder } = useOrders();
  const { products } = useProducts();
  const { customers } = useCustomers();
  const { discounts } = useDiscounts();

  // Selected Order
  const order = useMemo(() => {
    return orders.find(o => o.id === id || o.id === `#${id}`);
  }, [orders, id]);

  const currentIndex = orders.findIndex(o => o.id === order?.id);
  const prevOrder = currentIndex > 0 ? orders[currentIndex - 1] : null;
  const nextOrder = currentIndex >= 0 && currentIndex < orders.length - 1 ? orders[currentIndex + 1] : null;

  const handlePrevOrder = () => {
    if (prevOrder) {
      navigate(`/admin/orders/${prevOrder.id.replace('#', '')}`);
    }
  };

  const handleNextOrder = () => {
    if (nextOrder) {
      navigate(`/admin/orders/${nextOrder.id.replace('#', '')}`);
    }
  };

  // Active Tab State
  const [activeTab, setActiveTab ] = useState<'details' | 'items' | 'notes'>('details');

  // Logistics & Storefront pickup points
  const [pickups, setPickups ] = useState<PickupLocation[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pickup_locations'), (snap) => {
      const parsed: PickupLocation[] = [];
      snap.forEach(d => parsed.push({ id: d.id, ...d.data() } as PickupLocation));
      setPickups(parsed);
    }, (err) => console.warn("Failed fetching pickups storefront list:", err));
    return () => unsub();
  }, []);

  // Unified Modal / Dropdown state
  const [activeModalId, setActiveModalId] = useState<string | null>(null);
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Editable fields mapping to order properties
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<string>('unfulfilled');

  // Notes tab fields
  const [notesText, setNotesText] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Address edit fields
  const [addrForm, setAddrForm] = useState({ name: '', phone: '', street: '', city: '', parish: 'Jamaica' });
  
  // Tag creation
  const [newTagVal, setNewTagVal] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Catalog item adding fields
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [customPriceOverride, setCustomPriceOverride] = useState('');

  // Shipping & Tracking fields
  const [trackingCarrier, setTrackingCarrier] = useState('DHL');
  const [trackingNo, setTrackingNo] = useState('');
  const [trackingEstDate, setTrackingEstDate] = useState('');
  const [shippingSpeed, setShippingSpeed] = useState<number>(0); // 0 = standard, 15 = express, 25 = overnight
  const [deliveryProofType, setDeliveryProofType] = useState<'photo' | 'signature' | 'none'>('none');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Email form fields
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  // Timeline entry adding
  const [timelineComment, setTimelineComment] = useState('');
  const [manualActivityType, setManualActivityType] = useState<'comment' | 'system' | 'email'>('comment');

  // Error/Success visual feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync state with modified order details
  useEffect(() => {
    if (order) {
      setTimeline(order.timeline || []);
      setTags(order.tags || []);
      setFulfillmentStatus(order.fulfillmentStatus || 'unfulfilled');
      setNotesText(order.notes || '');
      setTrackingNo(order.receiptNumber && order.receiptNumber.startsWith('TRACK-') ? order.receiptNumber.replace('TRACK-', '') : '');
    }
  }, [order]);

  // Fetch associated installation job for this order
  const [orderInstallation, setOrderInstallation] = useState<any | null>(null);
  useEffect(() => {
    if (!order) return;
    const cleanId = order.id.replace('#', '');
    const unsub = onSnapshot(collection(db, 'installations'), (snap) => {
      let matched: any = null;
      snap.forEach(d => {
        const data = d.data();
        if (data.orderId === order.id || data.orderId === cleanId) {
          matched = { id: d.id, ...data };
        }
      });
      setOrderInstallation(matched);
    });
    return () => unsub();
  }, [order]);

  if (!order) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm mt-16">
        <AlertTriangle className="mx-auto text-amber-500 mb-4" size={40} />
        <h2 className="text-xl font-bold font-sans text-slate-800">Order not loaded</h2>
        <p className="text-sm text-slate-500 mt-2">The requested order ID may have been removed or does not exist.</p>
        <button onClick={() => navigate('/admin/orders')} className="mt-5 btn-primary px-4 py-2 text-xs font-bold rounded-lg mx-auto">
          <ChevronLeft size={16} /> Back to orders
        </button>
      </div>
    );
  }

  // Derived calculations helper
  const financialSummary = useMemo(() => {
    const subtotal = order.subtotal || (order.lineItems || []).reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const discCode = order.discountCode || '';
    const discountAmount = order.discountAmount || 0;
    
    // Retrieve dynamic shipping cost recorded during checkout or fallback nicely
    const recordShippingVal = typeof order.shipping_cost === 'number'
      ? order.shipping_cost
      : (typeof (order as any).shippingCost === 'number' ? (order as any).shippingCost : 0);

    const shipping = order.discountCode === 'FREESHIP' || order.fulfillment_type === 'pickup'
      ? 0 
      : (recordShippingVal || shippingSpeed || 0);

    const taxes = order.taxes || parseFloat(((subtotal - discountAmount) * 0.15).toFixed(2));
    const total = parseFloat((subtotal - discountAmount + shipping + taxes).toFixed(2));
    return { subtotal, discCode, discountAmount, shipping, taxes, total };
  }, [order, shippingSpeed]);

  // Handle Master DB updates cleanly
  const saveRecalculatedOrder = async (newLineItems: OrderItem[], newDiscCode: string, trackingNumberText = '') => {
    try {
      const sub = newLineItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      let discAmt = 0;
      if (newDiscCode) {
        const coupon = discounts.find(d => d.code.toUpperCase() === newDiscCode.toUpperCase());
        if (coupon) {
          if (coupon.type === 'Percentage') discAmt = parseFloat((sub * (parseFloat(coupon.value) / 100)).toFixed(2));
          else if (coupon.type === 'Fixed Amount') discAmt = Math.min(parseFloat(coupon.value), sub);
        }
      }
      const actualShipSpeed = newDiscCode === 'FREESHIP' ? 0 : shippingSpeed;
      const basis = Math.max(0, sub - discAmt);
      const tax = parseFloat((basis * 0.15).toFixed(2));
      const tot = parseFloat((basis + actualShipSpeed + tax).toFixed(2));
      const totItems = newLineItems.reduce((acc, item) => acc + item.quantity, 0);

      const log: TimelineEntry = {
        id: `tl_recalc_${Date.now()}`,
        type: 'system',
        content: `🔄 Order items recalculation updated totals: JMD $${tot.toLocaleString()}`,
        timestamp: new Date().toLocaleTimeString('en-US') + ' ' + new Date().toLocaleDateString('en-US')
      };

      await updateOrder(order.id, {
        lineItems: newLineItems,
        subtotal: sub,
        discountCode: newDiscCode,
        discountAmount: discAmt,
        taxes: tax,
        total: tot,
        items: totItems,
        timeline: [log, ...timeline],
        ...(trackingNumberText ? { receiptNumber: `TRACK-${trackingNumberText}` } : {})
      });
      setSuccessMsg('Order financials updated successfully!');
    } catch (e: any) {
      setErrorMessage(`Recalculation error: ${e.message}`);
    }
  };

  // Status transitions validation
  const handleStatusChange = async (newStatus: any) => {
    const validTransitions: any = {
      'pending': ['processing', 'cancelled'],
      'processing': ['ready', 'shipped', 'cancelled'],
      'ready': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': []
    };

    const currentSt = order.status || 'pending';
    if (currentSt !== newStatus && !validTransitions[currentSt]?.includes(newStatus)) {
      setErrorMessage(`Cannot transition order status directly from ${currentSt.toUpperCase()} to ${newStatus.toUpperCase()}`);
      return;
    }

    setErrorMessage('');
    try {
      const log: TimelineEntry = {
        id: `tl_status_${Date.now()}`,
        type: 'system',
        content: `📈 Status changed from ${currentSt} to ${newStatus.toUpperCase()}`,
        timestamp: new Date().toLocaleTimeString('en-US') + ' ' + new Date().toLocaleDateString('en-US')
      };

      const baseUpdates: any = {
        status: newStatus,
        timeline: [log, ...timeline]
      };

      if (newStatus === 'processing') {
        baseUpdates.fulfillmentStatus = 'partial';
      } else if (newStatus === 'shipped') {
        baseUpdates.fulfillmentStatus = 'fulfilled';
      }

      await updateOrder(order.id, baseUpdates);
      setSuccessMsg(`Order status advanced to ${newStatus.toUpperCase()}`);
      setActiveModalId(null);
    } catch (e: any) {
      setErrorMessage(e.message);
    }
  };

  // General helper functions
  const handlePrint = (docType: string) => {
    setShowPrintDropdown(false);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = (order.lineItems || [])
      .map(item => `<tr>
        <td style="font-size:12px;padding:6px 0;border-bottom:1px solid #eee;">${item.productName} (x${item.quantity})</td>
        <td style="font-size:12px;padding:6px 0;text-align:right;border-bottom:1px solid #eee;">$${(item.price * item.quantity).toLocaleString()}.00</td>
      </tr>`)
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${docType.toUpperCase()} - ${order.id}</title>
          <style>
            body { font-family: 'Poppins', sans-serif; padding: 30px; color: #1e293b; max-width: 500px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 12px; margin-bottom: 15px; }
            .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .totals { text-align: right; font-weight: bold; font-size: 13px; line-height: 1.6; }
            .footer { text-align: center; font-size: 10px; color: #64748b; margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>SAMKHI LIMITED ADMIN PORTAL</h3>
            <p style="font-size:11px; margin: 3px 0;">DOCUMENT: ${docType.toUpperCase()}</p>
            <p style="font-size:10px; color:#94a3b8; margin: 2px 0;">Order Ref: ${order.id} | Date: ${order.date}</p>
          </div>
          <table class="table">${itemsHtml}</table>
          <div class="totals">
            <p>Subtotal: $${financialSummary.subtotal.toLocaleString()}.00</p>
            <p>GCT (15%): $${financialSummary.taxes.toLocaleString()}.00</p>
            <p style="font-size:14px; margin-top:5px;">Grand Total: $${financialSummary.total.toLocaleString()}.00 JMD</p>
          </div>
          <div class="footer">
            <p>Billing location: pos_hub_ocho_rios_jamaica</p>
            <p>Administrative Print System Verifier Code: SECURE_ENTERPRISE_${Date.now()}</p>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDuplicateOrder = async () => {
    try {
      const dupId = `ORD-DUP-${Math.floor(1000 + Math.random() * 9000)}`;
      const duplicatedOrder = {
        ...order,
        id: dupId,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        paymentStatus: 'pending' as any,
        status: 'pending' as any,
        fulfillmentStatus: 'unfulfilled' as any,
        timeline: [{
          id: `dup_${Date.now()}`,
          type: 'system' as const,
          content: `📝 Order cloned from original #${order.id}`,
          timestamp: new Date().toLocaleTimeString()
        }]
      };

      await addOrder(duplicatedOrder);
      setSuccessMsg(`Cloned Successfully! New clone is ${duplicatedOrder.id}`);
      navigate(`/admin/orders/${duplicatedOrder.id.replace('#', '')}`);
    } catch (e: any) {
      setErrorMessage(e.message);
    }
  };

  const applyDiscountCoupon = async () => {
    setErrorMessage('');
    const matched = discounts.find(d => d.code.toUpperCase() === textDiscountCode.trim().toUpperCase());
    if (!matched) {
      setErrorMessage('Invalid discount coupon code.');
      return;
    }
    await saveRecalculatedOrder(order.lineItems || [], matched.code);
    setActiveModalId(null);
  };

  const removeDiscountCoupon = async () => {
    await saveRecalculatedOrder(order.lineItems || [], '');
  };

  const addProductRow = async () => {
    const originalProd = products.find(p => p.id === selectedProductId);
    if (!originalProd) return;

    const price = customPriceOverride.trim() !== '' ? parseFloat(customPriceOverride) : originalProd.price;
    const currentLineItems = order.lineItems || [];
    const matchedIdx = currentLineItems.findIndex(item => item.productId === originalProd.id);

    let updatedRows = [...currentLineItems];
    if (matchedIdx !== -1) {
      updatedRows[matchedIdx] = {
        ...updatedRows[matchedIdx],
        quantity: updatedRows[matchedIdx].quantity + addQty
      };
    } else {
      updatedRows.push({
        id: Math.random().toString(36).substring(2, 9),
        productId: originalProd.id,
        productName: originalProd.name,
        price,
        quantity: addQty,
        imageUrl: originalProd.imageUrl || 'https://via.placeholder.com/150',
        sku: originalProd.sku || `SKU-${originalProd.id.substring(0, 4).toUpperCase()}`
      });
    }

    await saveRecalculatedOrder(updatedRows, order.discountCode || '');
    setActiveModalId(null);
    setSelectedProductId('');
    setAddQty(1);
    setCustomPriceOverride('');
  };

  const deleteProductRow = async (prodId: string) => {
    const filteredRows = (order.lineItems || []).filter(item => item.id !== prodId);
    await saveRecalculatedOrder(filteredRows, order.discountCode || '');
  };

  const postTimelineManualEntry = async () => {
    if (!timelineComment.trim()) return;
    const log: TimelineEntry = {
      id: `add_${Date.now()}`,
      type: manualActivityType,
      content: timelineComment,
      timestamp: new Date().toLocaleTimeString('en-US') + ' ' + new Date().toLocaleDateString('en-US')
    };

    const updatedTimeline = [log, ...timeline];
    await updateOrder(order.id, { timeline: updatedTimeline });
    setTimelineComment('');
    setActiveModalId(null);
    setSuccessMsg('Manual timeline event posted successfully.');
  };

  const handleEditAddress = (type: 'billing' | 'shipping') => {
    setAddrForm({
      name: order.customerName || '',
      phone: order.customerPhone || '',
      street: type === 'shipping' ? '12 Palm Avenue' : '45 Industrial Way',
      city: type === 'shipping' ? 'Ocho Rios' : 'Kingston 5',
      parish: 'Jamaica'
    });
    setActiveModalId(`edit_address_${type}`);
  };

  const saveEditedAddress = async (type: 'billing' | 'shipping') => {
    const updatedLine = `📝 ${type.toUpperCase()} Address revised: ${addrForm.street}, ${addrForm.city}, ${addrForm.parish}`;
    const log: TimelineEntry = {
      id: `addr_${Date.now()}`,
      type: 'system',
      content: updatedLine,
      timestamp: new Date().toLocaleTimeString()
    };
    await updateOrder(order.id, {
      fulfillmentLocation: type === 'shipping' ? `${addrForm.street}, ${addrForm.city}` : order.fulfillmentLocation,
      customerName: addrForm.name,
      customerPhone: addrForm.phone,
      timeline: [log, ...timeline]
    });
    setActiveModalId(null);
    setSuccessMsg('Address updated live.');
  };

  const addTagInline = async () => {
    if (newTagVal.trim() && !tags.includes(newTagVal.trim())) {
      const updatedTags = [...tags, newTagVal.trim()];
      setTags(updatedTags);
      await updateOrder(order.id, { tags: updatedTags });
      setNewTagVal('');
      setShowTagInput(false);
    }
  };

  const deleteTagInline = async (tg: string) => {
    const updatedTags = tags.filter(t => t !== tg);
    setTags(updatedTags);
    await updateOrder(order.id, { tags: updatedTags });
  };

  const saveNotesText = async () => {
    await updateOrder(order.id, { notes: notesText });
    setIsEditingNotes(false);
    setSuccessMsg('Administrative notes updated.');
  };

  const issueRefundProcess = async () => {
    try {
      const log: TimelineEntry = {
        id: `ref_${Date.now()}`,
        type: 'system',
        content: `💸 Full financial refund processed for settlement sum JMD $${financialSummary.total.toLocaleString()}`,
        timestamp: new Date().toLocaleTimeString()
      };
      await updateOrder(order.id, {
        paymentStatus: 'refunded',
        timeline: [log, ...timeline]
      });
      setSuccessMsg('Gateway refund logged.');
      setActiveModalId(null);
    } catch {
      setErrorMessage('Refund failed.');
    }
  };

  const handleBypassPayment = async () => {
    try {
      const timestampStr = new Date().toLocaleTimeString('en-US') + ' ' + new Date().toLocaleDateString('en-US');

      const logPay: TimelineEntry = {
        id: `tl_bypass_pay_${Date.now()}`,
        type: 'system',
        content: `💳 Payment manually approved via testing bypass (Bypass Fygaro Gateway). Payment Status synchronized to PAID.`,
        timestamp: timestampStr
      };

      const baseUpdates: Partial<Order> = {
        paymentStatus: 'paid',
        payment_method: 'manual_override',
        timeline: [logPay, ...timeline]
      };

      // If the order status is pending, also advance it to payment_confirmed and handle stock reservation
      if (order.status === 'pending') {
        baseUpdates.status = 'payment_confirmed';
        
        const logStatus: TimelineEntry = {
          id: `tl_bypass_status_${Date.now()}`,
          type: 'system',
          content: `🔄 Status changed: **Pending Review** ➔ **Payment Confirmed** by testing bypass.`,
          timestamp: timestampStr
        };
        baseUpdates.timeline = [logStatus, logPay, ...timeline];

        const currentHistory = order.status_history || [];
        baseUpdates.status_history = [
          ...currentHistory,
          {
            status: 'payment_confirmed',
            timestamp: new Date().toISOString(),
            changed_by: 'admin@samkhi.com',
            note: 'Payment approved manually via testing bypass'
          }
        ];

        // Also trigger stock reservation side effects!
        if (order.lineItems) {
          const { runTransaction, doc } = await import('firebase/firestore');
          const { db } = await import('../../firebase');
          await runTransaction(db, async (transaction) => {
            for (const item of order.lineItems || []) {
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
                  referenceId: order.id,
                  notes: `Reserved via manual payment bypass for order ${order.id}`,
                  performedBy: 'admin@samkhi.com',
                  performedAt: new Date().toISOString()
                });
              }
            }
          });
        }
      }

      await updateOrder(order.id, baseUpdates);
      setSuccessMsg('Payment successfully bypassed and approved!');
    } catch (e: any) {
      setErrorMessage(`Billing Override Error: ${e.message}`);
    }
  };

  // Filter timeline items in tab view
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'comment' | 'system' | 'email'>('all');
  const filteredTimelineLog = useMemo(() => {
    if (timelineFilter === 'all') return timeline;
    return timeline.filter(item => item.type === timelineFilter);
  }, [timeline, timelineFilter]);

  // Comments extract for Notes tab
  const notesLogList = useMemo(() => {
    return timeline.filter(item => item.type === 'comment');
  }, [timeline]);

  const [textDiscountCode, setTextDiscountCode] = useState('');

  return (
    <div className="min-h-screen bg-[#f4f5f6] pb-24 text-slate-800 text-left">
      {/* Dynamic Feedback notifications */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-50 border border-emerald-300 text-emerald-800 px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-medium text-xs tracking-wide"
          >
            <Check size={16} /> <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="ml-2 font-bold hover:text-emerald-950">×</button>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-300 text-red-800 px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-medium text-xs tracking-wide"
          >
            <AlertTriangle size={16} /> <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="ml-2 font-bold hover:text-red-950">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Sticky Rail to match ProductEditor style */}
      <div className="bg-white border-b border-[#e3e3e3] px-8 py-3 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={() => navigate('/admin/orders')}
            className="p-1.5 hover:bg-[#f1f1f1] rounded-lg transition-colors border border-[#e3e3e3]"
            id="back-to-orders-btn"
          >
            <ChevronLeft size={16} className="text-[#616161]" />
          </button>
          
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-[#1a1a1a] tracking-tight text-sm">
                Order Details: {order.id}
              </h1>
              <div className="flex gap-1.5 items-center">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                  order.paymentStatus === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  {order.paymentStatus}
                </span>
                <OrderStatusBadge 
                  status={order.status || 'pending'} 
                  orderId={order.id} 
                  fulfillmentMethod={order.fulfillment_method || 'pickup'}
                  interactive={false} 
                  size="sm" 
                />
              </div>
            </div>
            <span className="text-[10px] text-[#616161] font-medium leading-none mt-1">Placed on: {order.date} • Location: {order.fulfillmentLocation || 'Ocho Rios Central POS Hub'}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Print dropdown selector */}
          <div className="relative">
            <button 
              onClick={() => { setShowPrintDropdown(!showPrintDropdown); setShowMoreActions(false); }} 
              className="px-3 py-1.5 border border-[#d1d1d1] rounded-lg text-xs font-bold text-[#1a1a1a] hover:bg-[#f6f6f6] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Printer size={12} className="text-[#616161]" />
              Print <ChevronDown size={10} />
            </button>
            {showPrintDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#e3e3e3] rounded-lg shadow-md py-1 z-50 text-left">
                {['Invoice', 'Packing Slip', 'Shipping Label', 'All Documents'].map((docType) => (
                  <button key={docType} onClick={() => handlePrint(docType)} className="w-full text-left px-4 py-2 hover:bg-[#f6f6f6] text-xs font-bold text-[#1a1a1a]">
                    📄 Print {docType}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* More Actions Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setShowMoreActions(!showMoreActions); setShowPrintDropdown(false); }} 
              className="p-1.5 border border-[#d1d1d1] rounded-lg hover:bg-[#f6f6f6] transition-colors"
            >
              <MoreHorizontal size={14} className="text-[#616161]" />
            </button>
            {showMoreActions && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[#e3e3e3] rounded-lg shadow-lg py-1.5 z-50 text-left">
                <button onClick={() => { setShowMoreActions(false); setEmailSubject(`Update for order ${order.id}`); setActiveModalId('send_email'); }} className="w-full text-left px-4 py-2 hover:bg-[#f6f6f6] text-xs text-[#1a1a1a] font-semibold flex items-center gap-2">
                  <Mail size={12} /> Send Email
                </button>
                <button onClick={() => { setShowMoreActions(false); setActiveModalId('apply_discount'); }} className="w-full text-left px-4 py-2 hover:bg-[#f6f6f6] text-xs text-[#1a1a1a] font-semibold flex items-center gap-2">
                  <TagIcon size={12} /> Apply Discount Code
                </button>
                <button onClick={() => { setShowMoreActions(false); handleDuplicateOrder(); }} className="w-full text-left px-4 py-2 hover:bg-[#f6f6f6] text-xs text-[#1a1a1a] font-semibold flex items-center gap-2">
                  <Package size={12} /> Cloned Duplicate Order
                </button>
                <button onClick={() => { setShowMoreActions(false); setShowTagInput(true); }} className="w-full text-left px-4 py-2 hover:bg-[#f6f6f6] text-xs text-[#1a1a1a] font-semibold flex items-center gap-2">
                  <TagIcon size={12} /> Edit Order tags
                </button>
                <div className="border-t border-[#e3e3e3] my-1"></div>
                <button onClick={() => { setShowMoreActions(false); handleStatusChange('cancelled'); }} className="w-full text-left px-4 py-2 hover:bg-rose-50 text-xs text-rose-600 font-extrabold flex items-center gap-2">
                  <X size={12} /> Cancel & Void Order
                </button>
              </div>
            )}
          </div>

          {/* Prev/Next Navigation Controls */}
          <div className="flex border border-[#d1d1d1] rounded-lg overflow-hidden bg-white">
            <button onClick={handlePrevOrder} disabled={!prevOrder} className="p-1.5 hover:bg-[#f1f1f1] text-[#616161] disabled:opacity-30 border-r border-[#e3e3e3]">
              <ChevronUp size={14} />
            </button>
            <button onClick={handleNextOrder} disabled={!nextOrder} className="p-1.5 hover:bg-[#f1f1f1] text-[#616161] disabled:opacity-30">
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Body */}
      <main className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Workspace Columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Visual Progress card in elegant matched style */}
          <OrderStatusPipeline order={order} />

          {/* Core Configuration Tabs Section to match ProductEditor style */}
          <div className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] overflow-hidden text-left">
            {/* Header tab controller */}
            <div className="flex border-b border-[#e3e3e3] bg-[#f9f9f9] overflow-x-auto">
              {[
                { id: 'details', label: 'Order Details', icon: FileText },
                { id: 'items', label: `Items (${(order.lineItems || []).length})`, icon: Package },
                { id: 'notes', label: `Staff Notes (${notesLogList.length})`, icon: Edit2 }
              ].map((tb) => {
                const Icon = tb.icon;
                return (
                  <button
                    key={tb.id}
                    type="button"
                    onClick={() => setActiveTab(tb.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-5 py-3 text-xs font-black transition-colors border-b-2 tracking-wide whitespace-nowrap",
                      activeTab === tb.id 
                        ? "border-black text-black bg-white" 
                        : "border-transparent text-[#616161] hover:text-black"
                    )}
                  >
                    <Icon size={14} />
                    {tb.label}
                  </button>
                );
              })}
            </div>

            {/* Content body inside active tab */}
            <div className="p-6">
              
              {/* DETAILS TAB */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  
                  {/* 1. Customer Profiler */}
                  <div className="border border-[#e3e3e3] rounded-xl p-6 flex flex-col md:flex-row gap-6 justify-between bg-zinc-50/40">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-white border border-[#e3e3e3] flex items-center justify-center font-extrabold text-[#1a1a1a] text-sm shadow-xs">
                        {order.customerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#1a1a1a]">{order.customerName}</h3>
                        <p className="text-xs text-zinc-500 mt-1">{order.customerEmail}</p>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">{order.customerPhone || 'No contact phone specified'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col text-left md:text-right text-xs justify-between">
                      <div>
                        <p className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">Order Settle Value</p>
                        <p className="font-extrabold text-[#1a1a1a] mt-0.5 text-sm">JMD ${financialSummary.total.toLocaleString()}</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => { setEmailSubject(`Shipping Notification: Order ${order.id}`); setActiveModalId('send_email'); }} 
                        className="mt-2 text-[#005bd3] font-bold hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <Mail size={12} /> Contact Customer via Mail
                      </button>
                    </div>
                  </div>

                  {/* 3. Addresses Block */}
                  <div className="border border-[#e3e3e3] rounded-xl p-6 bg-white space-y-4">
                    <div className="border-b border-zinc-100 pb-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#1a1a1a]">Physical Address Verification</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-zinc-50 border border-[#e3e3e3] p-4 rounded-lg relative">
                        <button type="button" onClick={() => handleEditAddress('billing')} className="absolute top-3 right-3 text-zinc-400 hover:text-[#1a1a1a]">
                          <Edit2 size={12} />
                        </button>
                        <h5 className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider mb-2">Billing Address</h5>
                        <p className="text-xs font-bold text-[#1a1a1a]">{order.customerName}</p>
                        <p className="text-xs text-zinc-600 mt-1">45 Industrial Way, Kingston 5</p>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1">Jamaica • POS-Verified</p>
                      </div>
                      <div className="bg-zinc-50 border border-[#e3e3e3] p-4 rounded-lg relative">
                        <button type="button" onClick={() => handleEditAddress('shipping')} className="absolute top-3 right-3 text-zinc-400 hover:text-[#1a1a1a]">
                          <Edit2 size={12} />
                        </button>
                        <h5 className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider mb-2">
                          {order.fulfillment_type === 'pickup' ? 'Store Pickup Details' : 'Courier Shipping Destination'}
                        </h5>
                        <p className="text-xs font-bold text-[#1a1a1a]">{order.customerName}</p>
                        {order.fulfillment_type === 'pickup' ? (
                          <>
                            <p className="text-xs text-zinc-600 mt-1 font-bold">
                              🏢 {pickups.find(p => p.id === order.pickup_location_id)?.name || 'Central Head Office Showroom'}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {pickups.find(p => p.id === order.pickup_location_id)?.address || '12 Palm Avenue, Ocho Rios'}
                            </p>
                            <p className="text-[10px] text-indigo-600 font-mono mt-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                              Self-Collection Store Selection
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-zinc-650 mt-1">
                              📍 {order.fulfillmentLocation || (order as any).address || (order as any).shippingAddress || 'No Street Address Supplied'}
                            </p>
                            <p className="text-xs text-zinc-500 font-bold mt-0.5">
                              Parish: {order.shipping_parish || order.parish || 'St. Ann'}
                            </p>
                            <p className="text-[10px] text-amber-600 font-mono mt-0.5 font-bold uppercase tracking-wider">
                              Home/Business Courier Delivery
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. Applied Coupons List */}
                  <div className="border border-[#e3e3e3] rounded-xl p-6 bg-white">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#1a1a1a] mb-4">Coupons & Campaigns</h4>
                    {financialSummary.discCode ? (
                      <div className="flex justify-between items-center bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-lg">
                        <div className="flex items-center gap-2">
                          <TagIcon className="text-[#006e52]" size={14} />
                          <div>
                            <p className="text-xs font-black uppercase text-slate-800">{financialSummary.discCode}</p>
                            <p className="text-[10px] text-[#006e52] font-semibold">Active - JMD ${financialSummary.discountAmount.toLocaleString()} Savings Applied</p>
                          </div>
                        </div>
                        <button type="button" onClick={removeDiscountCoupon} className="text-xs text-red-600 hover:underline hover:font-bold">
                          Remove Code
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed border-[#e3e3e3] rounded-lg">
                        <p className="text-xs text-zinc-400">No vouchers applied to this transaction.</p>
                        <button type="button" onClick={() => setActiveModalId('apply_discount')} className="mt-2 text-xs font-bold text-[#005bd3] hover:underline">
                          + Link Voucher Code
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ITEMS TAB */}
              {activeTab === 'items' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Order Manifest Items</h3>
                    <button 
                      type="button" 
                      onClick={() => { setErrorMessage(''); setActiveModalId('add_item'); }} 
                      className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 border border-[#d1d1d1] rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      <Plus size={12} /> Add Item from Catalog
                    </button>
                  </div>

                  {/* Items list table */}
                  <div className="overflow-x-auto border border-[#e3e3e3] rounded-xl bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#e3e3e3] bg-zinc-50 text-zinc-500 font-extrabold text-[9px] tracking-wider uppercase">
                          <th className="px-5 py-3">Product Info / SKU</th>
                          <th className="px-5 py-3 text-right">Quantity</th>
                          <th className="px-5 py-3 text-right">Unit Price</th>
                          <th className="px-5 py-3 text-right">Line Total</th>
                          <th className="px-5 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e3e3e3]">
                        {(order.lineItems || []).map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-50/50">
                            <td className="px-5 py-3.5">
                              <span className="font-extrabold text-[#1a1a1a] block text-xs">{item.productName}</span>
                              <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">{item.sku || 'N/A_CODE'}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right font-bold text-zinc-800">{item.quantity}</td>
                            <td className="px-5 py-3.5 text-right text-zinc-600">JMD ${item.price.toLocaleString()}.00</td>
                            <td className="px-5 py-3.5 text-right font-black text-[#1a1a1a]">JMD ${(item.price * item.quantity).toLocaleString()}.00</td>
                            <td className="px-5 py-3.5 text-center">
                              <button 
                                type="button" 
                                onClick={() => deleteProductRow(item.id)} 
                                className="p-1 px-2 hover:bg-red-50 text-[#616161] hover:text-red-600 rounded-md transition-all active:scale-95 border border-transparent hover:border-red-100"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pricing Overview */}
                  <div className="border-t border-[#e3e3e3] pt-6 flex flex-col items-end text-xs text-zinc-600 space-y-1.5 font-medium">
                    <p>Subtotal: <span className="font-bold text-[#1a1a1a]">JMD ${financialSummary.subtotal.toLocaleString()}</span></p>
                    {financialSummary.discountAmount > 0 && (
                      <p className="text-[#006e52]">Voucher Discount: <span className="font-bold">-J${financialSummary.discountAmount.toLocaleString()}</span></p>
                    )}
                    <p>Fulfillment Delivery/Pickup Fee: <span className="font-bold text-[#1a1a1a]">
                      {financialSummary.shipping === 0 ? 'FREE' : `J$${financialSummary.shipping.toLocaleString()}`}
                    </span></p>
                    <p>Taxes (GCT 15%): <span className="font-bold text-[#1a1a1a]">JMD ${financialSummary.taxes.toLocaleString()}</span></p>
                    <div className="border-t border-[#e3e3e3] pt-3 mt-1.5 w-64 text-right">
                      <p className="text-sm font-black text-[#1a1a1a]">Total Settlement: <span className="text-base text-[#1a1a1a] font-black font-mono">JMD ${financialSummary.total.toLocaleString()}</span></p>
                    </div>
                  </div>
                </div>
              )}


              {/* NOTES TAB */}
              {activeTab === 'notes' && (
                <div className="space-y-6">
                  <div className="pb-3 border-b border-[#e3e3e3] flex justify-between items-center">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#1a1a1a]">Internal Memo Records</h3>
                    <button type="button" onClick={() => setIsEditingNotes(!isEditingNotes)} className="text-[#005bd3] hover:underline flex items-center gap-1 text-[11px] font-bold">
                      <Edit2 size={12} /> Edit Notes Info
                    </button>
                  </div>

                  {isEditingNotes ? (
                    <div className="space-y-2">
                      <textarea 
                        value={notesText} 
                        onChange={(e) => setNotesText(e.target.value)} 
                        rows={3} 
                        className="w-full p-3 border border-[#d1d1d1] rounded-lg text-xs outline-none focus:ring-1 focus:ring-black focus:bg-white bg-zinc-50 text-zinc-805" 
                        placeholder="Write order memo records here..." 
                      />
                      <div className="flex justify-end gap-1.5 text-xs">
                        <button type="button" onClick={() => setIsEditingNotes(false)} className="px-3.5 py-1.5 bg-zinc-50 border border-[#d1d1d1] text-zinc-500 rounded-lg hover:bg-zinc-100 transition-colors">Cancel</button>
                        <button type="button" onClick={saveNotesText} className="px-3.5 py-1.5 bg-black text-white rounded-lg font-bold hover:bg-zinc-800 transition-colors">Apply Notes</button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/40 border border-amber-200 text-zinc-700 p-4 rounded-xl text-xs leading-relaxed relative">
                      <p className="text-zinc-500 block font-bold mb-1 uppercase tracking-wider text-[9px]">Administrative internal note:</p>
                      <p className="text-zinc-700 font-medium italic">{notesText || 'No custom administrative notes documented on this transaction.'}</p>
                    </div>
                  )}

                  {/* Notes Timeline comments feed */}
                  <div className="space-y-3 pt-4">
                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Timeline Comments Feed</h4>
                    {notesLogList.length === 0 ? (
                      <p className="text-xs text-zinc-400 py-3 italic text-center border border-[#e3e3e3] rounded-lg bg-zinc-50/20">No comments logged in history.</p>
                    ) : (
                      notesLogList.map((note) => (
                        <div key={note.id} className="bg-zinc-50 border border-zinc-150 p-3.5 rounded-lg text-xs block">
                          <div className="flex justify-between text-[10px] font-extrabold text-zinc-400 mb-1">
                            <span>Staff Comment:</span>
                            <span className="font-mono">{note.timestamp}</span>
                          </div>
                          <p className="text-zinc-700 leading-relaxed font-semibold">{note.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Chronological Audit Trail Timeline */}
          <OrderStatusHistory order={order} />
        </div>

        {/* Right Status Actions Sidebar */}
        <div className="space-y-6">
          
          {/* Status pipeline advanced operations panel */}
          <OrderStatusUpdater order={order} />

          {/* Secure Payment details card */}
          <div className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5 space-y-4 text-left">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1a1a1a]">Financial Settlement Gateway</h3>
            <div className="bg-zinc-50 border border-zinc-100 p-3.5 rounded-lg space-y-2 text-xs">
              <p className="text-zinc-500">Method: <span className="font-extrabold text-[#1a1a1a]">Visa ending in 4242 (Fygaro API)</span></p>
              <p className="text-zinc-500">Auth Token: <span className="font-extrabold text-[#1a1a1a] font-mono">fyg_live_abc123</span></p>
              <p className="text-zinc-500">Gross Settle: <span className="font-extrabold text-[#1a1a1a]">JMD ${financialSummary.total.toLocaleString()}</span></p>
            </div>

            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => {
                  window.open('https://fygaro.secure.mockgateway.checkout/payment', '_blank');
                }} 
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-[#d1d1d1] text-xs font-bold text-[#1a1a1a] hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors"
              >
                Launch Gateway <ExternalLink size={11} />
              </button>
              <button 
                type="button"
                onClick={() => setActiveModalId('issue_refund')} 
                className="flex-1 bg-black hover:bg-zinc-800 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                Issue Refund
              </button>
            </div>

            {/* Manual Override audit reconciliation block */}
            {order.paymentStatus !== 'paid' && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2 leading-relaxed">
                <div className="flex items-center gap-1 text-amber-800 font-extrabold text-[10px] uppercase">
                  <ShieldCheck size={14} /> Unreconciled transaction status
                </div>
                <p className="text-[10px] text-zinc-500">Gateway Webhook callback pending. Settle manually: </p>
                <button 
                  type="button"
                  onClick={handleBypassPayment} 
                  className="w-full mt-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] py-2 rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                >
                  Bypass payment check & Settle Paid
                </button>
              </div>
            )}
          </div>

          {/* Installation Appointment Card */}
          <div className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5 space-y-3 leading-relaxed text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1a1a1a] flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-600" />
                Equipment Installation
              </h3>
              <button
                type="button"
                onClick={() => navigate('/admin/installations')}
                className="text-[10px] font-bold text-blue-600 hover:underline"
              >
                Manage All
              </button>
            </div>

            {orderInstallation ? (
              <div className="space-y-2 text-xs text-slate-700 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-900">{orderInstallation.scheduledDate} ({orderInstallation.scheduledTime || '09:00 AM'})</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-800">
                    {orderInstallation.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Crew: <span className="font-semibold text-slate-800">{orderInstallation.assignedInstaller}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Location: {orderInstallation.customerAddress || orderInstallation.parish}
                </p>
                {orderInstallation.notes && (
                  <p className="text-[10px] text-slate-500 italic border-t border-blue-100 pt-1">
                    "{orderInstallation.notes}"
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed border-[#e3e3e3] rounded-lg">
                <p className="text-xs text-zinc-400">No installation scheduled yet.</p>
                <button
                  type="button"
                  onClick={() => navigate('/admin/installations')}
                  className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                >
                  + Schedule Field Installation
                </button>
              </div>
            )}
          </div>

          {/* Tags list card */}
          <div className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5 space-y-3 leading-relaxed text-left">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1a1a1a]">Order Tags & Badges</h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tg) => (
                <span key={tg} className="bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-bold text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 border border-[#e3e3e3]">
                  {tg}
                  <button type="button" onClick={() => deleteTagInline(tg)} className="text-zinc-400 hover:text-red-500 font-extrabold">×</button>
                </span>
              ))}
              {showTagInput ? (
                <div className="flex bg-zinc-50 border border-[#d1d1d1] rounded-lg px-1 py-0.5">
                  <input 
                    type="text" 
                    value={newTagVal} 
                    onChange={e => setNewTagVal(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && addTagInline()} 
                    className="p-0.5 text-[10px] bg-transparent outline-none w-20 text-zinc-800 font-semibold"
                    placeholder="tag..."
                    autoFocus
                  />
                  <button type="button" onClick={addTagInline} className="p-0.5 text-[#006e52] font-black hover:scale-105 transition-transform">✓</button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowTagInput(true)} className="border border-dashed border-[#d1d1d1] text-zinc-400 hover:text-black font-semibold px-2 py-1 text-[10px] rounded-lg transition-colors cursor-pointer text-left">
                  + Add Tag
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODALS RENDER CENTER */}
      <AnimatePresence>
        
        {/* Modal 1: Apply Manual discount */}
        {activeModalId === 'apply_discount' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[99]" onClick={() => setActiveModalId(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white border border-[#e3e3e3] shadow-2xl rounded-xl p-6 w-full max-w-sm text-left"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1a1a1a] border-b border-[#e3e3e3] pb-3.5 mb-4">Link Campaigns Coupon Code</h3>
              <input 
                type="text" 
                value={textDiscountCode} 
                onChange={(e) => setTextDiscountCode(e.target.value)} 
                placeholder="e.g. Percentage SOLAR2026 or Welcome Offer" 
                className="w-full p-2.5 bg-zinc-50 border border-[#d1d1d1] rounded-lg text-xs outline-none focus:bg-white text-zinc-800 font-bold mb-4"
              />
              <div className="flex justify-end gap-1.5 text-xs">
                <button type="button" onClick={() => setActiveModalId(null)} className="px-3.5 py-2 hover:bg-zinc-50 text-zinc-500 rounded-lg">Cancel</button>
                <button type="button" onClick={applyDiscountCoupon} className="px-3.5 py-2 bg-black hover:bg-zinc-800 text-white rounded-lg font-bold">Apply Code</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 2: Add item to order */}
        {activeModalId === 'add_item' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[99]" onClick={() => setActiveModalId(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white border border-[#e3e3e3] shadow-2xl rounded-xl p-6 w-full max-w-md text-left"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1a1a1a] border-b border-[#e3e3e3] pb-3.5 mb-4">Add Item from Catalog</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Search or Select Product</label>
                  <select 
                    value={selectedProductId} 
                    onChange={e => setSelectedProductId(e.target.value)} 
                    className="w-full p-2.5 bg-zinc-50 border border-[#d1d1d1] rounded-lg text-xs outline-none focus:bg-white"
                  >
                    <option value="">-- Choose target catalog item --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - ${p.price.toLocaleString()} JMD (Stock: {p.inventory ?? 10})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Quantity</label>
                    <input 
                      type="number" 
                      min={1} 
                      value={addQty} 
                      onChange={e => setAddQty(Math.max(1, Number(e.target.value)))} 
                      className="w-full p-2.5 bg-zinc-50 border border-[#d1d1d1] rounded-lg text-xs outline-none focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Custom Price Override</label>
                    <input 
                      type="number" 
                      placeholder="Leave blank for regular price" 
                      value={customPriceOverride} 
                      onChange={e => setCustomPriceOverride(e.target.value)} 
                      className="w-full p-2.5 bg-zinc-50 border border-[#d1d1d1] rounded-lg text-xs outline-none focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-1.5 text-xs mt-6">
                <button type="button" onClick={() => setActiveModalId(null)} className="px-3.5 py-2 hover:bg-zinc-50 text-zinc-500 rounded-lg">Cancel</button>
                <button type="button" onClick={addProductRow} className="px-3.5 py-2 bg-black hover:bg-zinc-800 text-white rounded-lg font-bold">Add to Order</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 3: Address edit modal */}
        {(activeModalId === 'edit_address_billing' || activeModalId === 'edit_address_shipping') && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[99]" onClick={() => setActiveModalId(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white border border-[#e3e3e3] shadow-2xl rounded-xl p-6 w-full max-w-sm text-left"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1a1a1a] border-b border-[#e3e3e3] pb-3.5 mb-4 font-extrabold">Edit Address Specifications</h3>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Recipient Name</label>
                  <input type="text" value={addrForm.name} onChange={e => setAddrForm({...addrForm, name: e.target.value})} className="w-full p-2.5 bg-zinc-50 border border-[#d1d1d1] rounded-lg text-xs outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Contact Phone</label>
                  <input type="text" value={addrForm.phone} onChange={e => setAddrForm({...addrForm, phone: e.target.value})} className="w-full p-2.5 bg-zinc-50 border border-[#d1d1d1] rounded-lg text-xs outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Street Address</label>
                  <input type="text" value={addrForm.street} onChange={e => setAddrForm({...addrForm, street: e.target.value})} className="w-full p-2.5 bg-zinc-50 border border-[#d1d1d1] rounded-lg text-xs outline-none focus:bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">City / Hub</label>
                    <input type="text" value={addrForm.city} onChange={e => setAddrForm({...addrForm, city: e.target.value})} className="w-full p-2.5 bg-zinc-50 border border-[#d1d1d1] rounded-lg text-xs outline-none focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Parish</label>
                    <input type="text" value={addrForm.parish} onChange={e => setAddrForm({...addrForm, parish: e.target.value})} className="w-full p-2.5 bg-zinc-50 border border-[#d1d1d1] rounded-lg text-xs outline-none focus:bg-white" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-1.5 text-xs mt-6">
                <button type="button" onClick={() => setActiveModalId(null)} className="px-3.5 py-2 hover:bg-zinc-50 text-zinc-500 rounded-lg">Cancel</button>
                <button type="button" onClick={() => saveEditedAddress((activeModalId === 'edit_address_shipping' ? 'shipping' : 'billing'))} className="px-3.5 py-2 bg-black hover:bg-zinc-800 text-white rounded-lg font-bold">Apply Updates</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 4: Send Customer Email */}
        {activeModalId === 'send_email' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[99]" onClick={() => setActiveModalId(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white border border-[#e3e3e3] shadow-2xl rounded-xl p-6 w-full max-w-md text-left"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1a1a1a] border-b border-[#e3e3e3] pb-3.5 mb-4">Send Link Notification Email</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Target Recipient Address</label>
                  <input type="text" value={order.customerEmail} readOnly className="w-full p-2.5 bg-zinc-100 border border-[#d1d1d1] rounded-lg text-xs outline-none text-zinc-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Email Subject Header</label>
                  <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email Subject Header..." className="w-full p-2.5 bg-zinc-50 border border-[#d1d1d1] rounded-lg text-xs outline-none focus:bg-white text-zinc-800" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Email Notice Content (Body)</label>
                  <textarea rows={5} value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Type notification details to the client here..." className="w-full p-2.5 bg-zinc-50 border border-[#d1d1d1] rounded-lg text-xs outline-none focus:bg-white text-[#1a1a1a] resize-none" />
                </div>
              </div>

              <div className="flex justify-end gap-1.5 text-xs mt-6">
                <button type="button" onClick={() => setActiveModalId(null)} className="px-3.5 py-2 hover:bg-zinc-50 text-zinc-500 rounded-lg">Cancel</button>
                <button 
                  type="button"
                  onClick={async () => {
                    const log: TimelineEntry = {
                      id: `em_${Date.now()}`,
                      type: 'email',
                      content: `📧 Notice Sent: "${emailSubject}" to recipient ${order.customerEmail}`,
                      timestamp: new Date().toLocaleTimeString()
                    };
                    await updateOrder(order.id, { timeline: [log, ...timeline] });
                    setActiveModalId(null);
                    setEmailBody('');
                    setSuccessMsg('Log: Customer notification email sent.');
                  }} 
                  className="px-3.5 py-2 bg-black hover:bg-zinc-800 text-white rounded-lg font-bold"
                >
                  Dispatch Notice Email
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 6: Refund confirmation */}
        {activeModalId === 'issue_refund' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[99]" onClick={() => setActiveModalId(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white border border-[#e3e3e3] shadow-2xl rounded-xl p-6 w-full max-w-sm text-left"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1a1a1a] border-b border-[#e3e3e3] pb-3.5 mb-4 flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={16} /> Confirm Settlement Refund
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed mb-6 font-medium">
                Are you sure you want to return the full amount description of <span className="font-extrabold text-[#1a1a1a]">${financialSummary.total.toLocaleString()} JMD</span> to card Visa ending in 4242? This transaction is irreversible on Fygaro settlement engine.
              </p>
              <div className="flex justify-end gap-1.5 text-xs">
                <button type="button" onClick={() => setActiveModalId(null)} className="px-3.5 py-2 hover:bg-zinc-50 text-zinc-500 rounded-lg">Abort</button>
                <button type="button" onClick={issueRefundProcess} className="px-3.5 py-2 bg-red-600 hover:bg-red-750 text-white rounded-lg font-bold">Process Refund</button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

    </div>
  );
}
