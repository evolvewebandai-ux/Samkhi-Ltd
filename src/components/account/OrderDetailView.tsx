import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  CreditCard, 
  ChevronRight, 
  HelpCircle, 
  FileText, 
  Share2, 
  Printer, 
  CheckCircle2, 
  MessageSquare,
  Building,
  Truck
} from 'lucide-react';
import { Order, OrderItem, PickupLocation } from '../../types';
import OrderTrackingTimeline from './OrderTrackingTimeline';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

interface OrderDetailViewProps {
  order: Order;
  onBack: () => void;
}

export default function OrderDetailView({ order, onBack }: OrderDetailViewProps) {
  const [pickups, setPickups] = useState<PickupLocation[]>([]);

  // Load available pickup storefront maps to resolve location properties
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pickup_locations'), (snap) => {
      const parsed: PickupLocation[] = [];
      snap.forEach(d => parsed.push({ id: d.id, ...d.data() } as PickupLocation));
      setPickups(parsed);
    }, (err) => console.warn("Failed fetching storefronts for user:", err));
    return () => unsub();
  }, []);

  // Fallback items if none are supplied in order
  const lineItems: OrderItem[] = order.lineItems || [
    {
      id: `li-${order.id}-0`,
      productId: 'ne-0241',
      productName: 'Samkhi High-Efficiency Eco Component Kit',
      price: order.total / (order.items || 1),
      quantity: order.items || 1,
      imageUrl: 'https://fygaro-subscribers.s3.amazonaws.com/9669b088-1765-4e05-962b-abd27a3236ec/products/171704/c9d5763f-f3b3-44d7-b516-a8d1e8e7ad45.png'
    }
  ];

  const subtotalValue = order.subtotal || order.total * 0.85;
  const taxesValue = order.taxes || order.total * 0.15;

  const handleDownloadInvoice = () => {
    // Generate a beautiful, print-friendly browser print overlay
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - Samkhi Limited ${order.id}</title>
          <style>
            body { font-family: 'Poppins', sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0B2E59; padding-bottom: 20px; }
            .logo { height: 60px; }
            .title { color: #0B2E59; font-size: 28px; font-weight: bold; }
            .meta { margin-top: 30px; display: flex; justify-content: space-between; font-size: 14px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            .table th { background: #0B2E59; color: #fff; text-align: left; padding: 12px; font-size: 14px; }
            .table td { padding: 12px; border-bottom: 1px solid #ddd; font-size: 14px; }
            .totals { float: right; margin-top: 20px; text-align: right; font-size: 14px; }
            .totals table { border-collapse: collapse; }
            .totals td { padding: 6px 12px; }
            .footer { margin-top: 150px; text-align: center; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; color: #777; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <img src="https://lh3.googleusercontent.com/d/1y5j5nsQpvc5Rgdo2OP_ZN6K9sAqMg3Uw" class="logo" />
              <p style="margin-top: 8px; font-size: 12px;">Ocho Rios, St. Ann, Jamaica</p>
            </div>
            <div>
              <p class="title">OFFICIAL INVOICE</p>
              <p style="text-align: right; font-size: 14px; font-weight: bold;">Order Reference: ${order.id}</p>
            </div>
          </div>
          <div class="meta">
            <div>
              <h3>BILL TO:</h3>
              <p><strong>${order.customerName}</strong></p>
              <p>${order.customerEmail}</p>
              <p>${order.fulfillment_type === 'pickup' ? 'Store Location Selection' : 'Jamaica Parish Delivery'}</p>
            </div>
            <div style="text-align: right">
              <h3>INVOICE INFO:</h3>
              <p>Date: ${order.date}</p>
              <p>Payment Mode: Credit Card (Verified Gateway)</p>
              <p>Invoice Status: <span style="color: #2E7D32; font-weight: bold;">PAID</span></p>
            </div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Product Description</th>
                <th>Price</th>
                <th style="text-align: center">Quantity</th>
                <th style="text-align: right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItems.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>$${item.price?.toLocaleString()} JMD</td>
                  <td style="text-align: center">${item.quantity}</td>
                  <td style="text-align: right">$${(item.price * item.quantity)?.toLocaleString()} JMD</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td>$${(order.subtotal || subtotalValue)?.toLocaleString()} JMD</td>
              </tr>
              <tr>
                <td>Fulfillment (${order.fulfillment_type === 'pickup' ? 'Pickup' : 'Courier'}):</td>
                <td>$${(order.shipping_cost || 0)?.toLocaleString()} JMD</td>
              </tr>
              <tr>
                <td>GCT Tax (15%):</td>
                <td>$${(order.taxes || taxesValue)?.toLocaleString()} JMD</td>
              </tr>
              <tr style="font-weight: bold; font-size: 16px; border-top: 2px solid #000;">
                <td>Total paid:</td>
                <td>$${order.total?.toLocaleString()} JMD</td>
              </tr>
            </table>
          </div>
          <div class="footer">
            <p>Thank you for purchasing energy smart solution from Samkhi Limited!</p>
            <p>© 2026 Samkhi Limited. All rights reserved.</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleOpenLiveChat = () => {
    // Fill customer properties into WhatsApp hook url directly
    const msg = `Hi Samkhi Support! I need technical support regarding order reference: ${order.id}. Customer Name: ${order.customerName} (${order.customerEmail}).`;
    window.open(`https://wa.me/18766303350?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-8 font-sans text-left">
      
      {/* Header breadcrumb */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <button 
          onClick={onBack}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer p-2 hover:bg-slate-50 rounded-xl"
        >
          <ArrowLeft size={16} /> Returns to Archive
        </button>
        <span className="text-xs text-primary font-bold">Secure Order Lookup Details</span>
      </div>

      {/* Main grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main detail col (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Timeline tracking nodes card */}
          <OrderTrackingTimeline order={order} />

          {/* Line items list container */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-enterprise overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h4 className="font-display font-bold text-sm text-secondary">Cart Line Items</h4>
            </div>
            
            <div className="p-6 divide-y divide-slate-100">
              {lineItems.map((item) => (
                <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0 items-center">
                  <img 
                    src={item.imageUrl} 
                    alt={item.productName} 
                    className="w-16 h-16 object-contain rounded-xl bg-slate-50 border border-slate-100 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-secondary line-clamp-1">{item.productName}</h5>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5 font-mono">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-secondary font-mono">JMD ${(item.price * item.quantity)?.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 font-mono">Each: JMD ${item.price?.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations breakdown block */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-xs text-right">
              <div className="space-y-2.5 max-w-sm ml-auto font-semibold">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal Amount:</span>
                  <span className="font-mono">JMD ${order.subtotal?.toLocaleString() || subtotalValue?.toLocaleString()}</span>
                </div>
                {order.discountCode && (
                  <div className="flex justify-between text-primary font-bold">
                    <span>Discount Code Applied ({order.discountCode}):</span>
                    <span className="font-mono">-JMD ${(order.discountAmount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Fulfillment Cost ({order.fulfillment_type === 'pickup' ? 'Store Pickup' : 'Courier Service'}):</span>
                  <span className="font-mono">
                    {order.fulfillment_type === 'pickup' || (order.shipping_cost || 0) === 0 ? 'FREE' : `JMD $${order.shipping_cost?.toLocaleString()}`}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GCT Sales Tax (15%):</span>
                  <span className="font-mono">JMD ${order.taxes?.toLocaleString() || taxesValue?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-black text-secondary border-t border-slate-200 pt-2.5">
                  <span>Total Settled Amount:</span>
                  <span className="text-primary font-mono">JMD ${order.total?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Info panel sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Printable Invoice & WhatsApp Chat quick launches */}
          <div className="space-y-3">
            <button
              onClick={handleDownloadInvoice}
              className="w-full btn-secondary py-3 flex items-center justify-center gap-2 cursor-pointer text-xs uppercase font-bold text-white tracking-wider"
            >
              <Printer size={16} /> Printable Sales Invoice
            </button>
            <button
              onClick={handleOpenLiveChat}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 cursor-pointer bg-green-500 hover:bg-green-600 text-xs uppercase font-bold text-white tracking-wider"
            >
              <MessageSquare size={16} /> Contact Live chat Support
            </button>
          </div>

          {/* Delivery & Billing Address Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-enterprise space-y-6">
            
            {/* Fulfillment and address details */}
            <div>
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-3">
                <span className="text-primary font-bold text-lg">
                  {order.fulfillment_type === 'pickup' ? '🏢' : '🚚'}
                </span>
                <h5 className="font-display font-extrabold text-sm text-secondary">
                  {order.fulfillment_type === 'pickup' ? 'Store Pickup Point' : 'Courier Delivery Info'}
                </h5>
              </div>
              <p className="text-xs font-bold text-secondary mb-1">{order.customerName}</p>
              <p className="text-xs text-slate-500 font-semibold font-mono">{order.customerPhone || 'Ocho Rios Central Hub'}</p>
              
              {order.fulfillment_type === 'pickup' ? (
                <div className="text-xs text-slate-500 mt-2 leading-relaxed space-y-1">
                  <p className="font-bold text-slate-700">Outpost Selected Outlet:</p>
                  <p className="font-extrabold text-indigo-650">
                    🏢 {pickups.find(p => p.id === order.pickup_location_id)?.name || 'Central Head Office Showroom'}
                  </p>
                  <p>{pickups.find(p => p.id === order.pickup_location_id)?.address || '12 Palm Avenue, Ocho Rios'}</p>
                  <p className="text-[10px] text-indigo-650 font-mono mt-1 font-bold uppercase tracking-wider">
                    Store Self-Collection Option
                  </p>
                </div>
              ) : (
                <div className="text-xs text-slate-500 mt-2 leading-relaxed space-y-1">
                  <p className="font-bold text-slate-700">Home/Business Courier Destination:</p>
                  <p className="font-semibold text-secondary">
                    📍 {order.fulfillmentLocation || (order as any).address || (order as any).shippingAddress || 'Ocho Rios Hub central depot'}
                  </p>
                  <p className="font-bold text-slate-800">
                    Parish: {order.shipping_parish || order.parish || 'St. Ann'}
                  </p>
                  <p className="text-[10px] text-amber-600 font-mono mt-1 font-bold uppercase tracking-wider">
                    Courier Route dispatch active
                  </p>
                </div>
              )}
            </div>

            {/* Billing settlement method (Card tokenization verification) */}
            <div>
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-3">
                <span className="text-primary font-bold text-lg">💳</span>
                <h5 className="font-display font-extrabold text-sm text-secondary">Settlement Details</h5>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CreditCard className="text-slate-400 shrink-0" size={16} />
                <div>
                  <p className="font-bold text-secondary">Visa Gold Card ending in 4392</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 font-mono">Authorization code: #AUT-82946</p>
                </div>
              </div>
            </div>

          </div>

          {/* Info Banner */}
          <div className="p-5 bg-secondary text-white rounded-3xl text-xs space-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-xl pointer-events-none" />
            <h5 className="font-display font-bold text-cta">Jamaica Solar Logistics</h5>
            <p className="text-slate-300 leading-relaxed font-semibold">
              Orders requiring deep heavy solar energy system installation undergo rigorous structural engineering checks before on-site dispatch.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
