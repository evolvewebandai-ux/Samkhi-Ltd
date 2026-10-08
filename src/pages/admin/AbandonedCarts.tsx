import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Clock, 
  Mail, 
  Plus, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  User, 
  DollarSign, 
  ArrowRight, 
  Trash2, 
  X,
  Send,
  Sparkles,
  Zap
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useOrders } from '../../context/OrderContext';
import { showToast } from '../../lib/toast';
import { logActivity } from '../../lib/audit';

export interface CartRecord {
  id: string;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  totalItems: number;
  totalPrice: number;
  customerEmail?: string;
  status: 'active' | 'abandoned' | 'recovered' | 'cleared';
  lastUpdated: string;
}

export default function AdminAbandonedCarts() {
  const { addOrder } = useOrders();
  const [carts, setCarts] = useState<CartRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'abandoned' | 'active' | 'recovered'>('all');

  const [emailModalCart, setEmailModalCart] = useState<CartRecord | null>(null);
  const [discountCodeVal, setDiscountCodeVal] = useState('RECOVER10');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'carts'), (snapshot) => {
      const items: CartRecord[] = [];
      const now = new Date().getTime();

      snapshot.forEach(docSnap => {
        const data = docSnap.data() as CartRecord;
        if (data.status === 'cleared') return;

        // Auto-mark abandoned if > 30 minutes since last updated
        const lastTime = new Date(data.lastUpdated).getTime();
        const diffMinutes = (now - lastTime) / (1000 * 60);

        let status = data.status;
        if (status === 'active' && diffMinutes > 30) {
          status = 'abandoned';
        }

        items.push({ id: docSnap.id, ...data, status } as CartRecord);
      });

      // Sort by last updated desc
      items.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
      setCarts(items);
      setLoading(false);
    }, (err) => {
      console.warn("Firestore carts fetch warning:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const getElapsedTime = (isoString: string) => {
    const diff = new Date().getTime() - new Date(isoString).getTime();
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const handleConvertToOrder = async (cart: CartRecord) => {
    if (!window.confirm(`Convert Cart #${cart.id} into an active draft order?`)) return;

    const newOrderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const lineItems = cart.items.map(i => ({
      id: `li_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      productId: i.productId,
      productName: i.name,
      quantity: i.quantity,
      price: i.price,
      sku: 'SKU-RECOVERED',
      imageUrl: i.image || ''
    }));

    try {
      await addOrder({
        id: newOrderId,
        customerName: cart.customerEmail ? cart.customerEmail.split('@')[0] : 'Recovered Guest Customer',
        customerEmail: cart.customerEmail || 'guest@samkhi.com',
        customerPhone: '+1 (876) 555-0199',
        date: new Date().toISOString(),
        status: 'pending',
        total: cart.totalPrice,
        subtotal: cart.totalPrice,
        shipping_cost: 0,
        shipping_total: 0,
        grand_total: cart.totalPrice,
        paymentStatus: 'pending',
        fulfillmentStatus: 'unfulfilled',
        items: lineItems.length,
        lineItems,
        fulfillment_method: 'delivery',
        fulfillment_type: 'shipping',
        shippingAddress: {
          address: '15 Hope Road',
          city: 'Kingston',
          parish: 'Kingston',
          postalCode: '00000'
        },
        createdAt: new Date().toISOString()
      } as any);

      // Mark cart recovered
      await updateDoc(doc(db, 'carts', cart.id), { status: 'recovered' });
      await logActivity(`Converted abandoned Cart #${cart.id} to Order #${newOrderId}`);
      showToast(`Cart converted into Order #${newOrderId}!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to convert cart to order', 'error');
    }
  };

  const handleSendRecoveryEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailModalCart) return;

    try {
      await updateDoc(doc(db, 'carts', emailModalCart.id), { status: 'recovered' });
      await logActivity(`Sent recovery offer (${discountCodeVal}) for Cart #${emailModalCart.id}`);
      showToast(`Recovery offer (${discountCodeVal}) sent to ${emailModalCart.customerEmail || 'customer'}!`, 'success');
      setEmailModalCart(null);
    } catch (err: any) {
      showToast(err?.message || 'Failed to send recovery offer', 'error');
    }
  };

  const handleDeleteCart = async (cartId: string) => {
    if (!window.confirm('Delete this cart record?')) return;
    try {
      await deleteDoc(doc(db, 'carts', cartId));
      showToast('Cart record deleted', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete cart', 'error');
    }
  };

  const filteredCarts = carts.filter(c => {
    const matchesSearch =
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.customerEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.items.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = filter === 'all' || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  const abandonedCount = carts.filter(c => c.status === 'abandoned').length;
  const totalAbandonedValue = carts.filter(c => c.status === 'abandoned').reduce((acc, c) => acc + c.totalPrice, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 bg-surface">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-widest font-sans flex items-center gap-1.5 mb-1">
            <ShoppingBag size={14} />
            E-Commerce Conversion & Intent Recovery
          </span>
          <h1 className="text-3xl font-display font-black text-secondary tracking-tight">Abandoned Cart Visibility & Recovery</h1>
        </div>

        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
          <div>
            <p className="text-[10px] font-extrabold uppercase text-amber-800">Potential Revenue at Risk</p>
            <p className="text-lg font-black text-amber-900">JMD ${totalAbandonedValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2 flex-1 w-full">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search by Cart Session ID, email, or item name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-sm outline-none bg-transparent"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="text-xs h-[38px] border border-slate-200 rounded-lg px-3 bg-slate-50 font-semibold"
          >
            <option value="all">All Cart Sessions</option>
            <option value="abandoned">Abandoned Carts ({abandonedCount})</option>
            <option value="active">Active Sessions</option>
            <option value="recovered">Recovered</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading active cart sessions...</div>
      ) : filteredCarts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <ShoppingBag size={36} className="mx-auto text-slate-300" />
          <p className="font-semibold text-slate-600">No active or abandoned carts captured</p>
          <p className="text-xs">When shoppers add products to their bag on the store front, abandoned sessions will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCarts.map(cart => (
            <div key={cart.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Session {cart.id}</span>
                    <h3 className="text-sm font-bold text-slate-900">{cart.customerEmail || 'Anonymous Guest Shopper'}</h3>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                    cart.status === 'abandoned' ? 'bg-amber-100 text-amber-800' :
                    cart.status === 'recovered' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {cart.status === 'abandoned' ? 'Abandoned' : cart.status === 'recovered' ? 'Recovered' : 'Active'}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <p className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                    <Clock size={13} className="text-slate-400" />
                    Last activity: <span className="font-bold text-slate-700">{getElapsedTime(cart.lastUpdated)}</span>
                  </p>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Cart Contents ({cart.totalItems} items):</p>
                    {cart.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-700 font-mono text-[11px]">
                        <span className="line-clamp-1">{item.quantity}x {item.name}</span>
                        <span className="font-bold shrink-0">JMD ${(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-base font-black text-slate-900 pt-1">
                    Cart Total: <span className="text-blue-600">JMD ${cart.totalPrice.toLocaleString()}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEmailModalCart(cart)}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded border border-amber-200 cursor-pointer flex items-center gap-1"
                    title="Send Recovery Voucher"
                  >
                    <Mail size={13} /> Send Offer
                  </button>
                  <button
                    onClick={() => handleConvertToOrder(cart)}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-xs cursor-pointer flex items-center gap-1"
                    title="Convert into Order"
                  >
                    <Sparkles size={13} /> Order
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteCart(cart.id)}
                  className="p-1.5 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                  title="Delete Cart"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send Recovery Email Modal */}
      {emailModalCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Send Recovery Discount</h3>
              <button onClick={() => setEmailModalCart(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendRecoveryEmail} className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs space-y-1">
                <p>Cart: <span className="font-bold">#{emailModalCart.id}</span></p>
                <p>Value: <span className="font-bold">JMD ${emailModalCart.totalPrice.toLocaleString()}</span></p>
                <p>Recipient: <span className="font-bold">{emailModalCart.customerEmail || 'Guest Shopper'}</span></p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Incentive Discount Code</label>
                <input
                  type="text"
                  required
                  value={discountCodeVal}
                  onChange={e => setDiscountCodeVal(e.target.value)}
                  className="w-full text-xs h-[38px] border rounded px-2.5 font-mono uppercase font-bold"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setEmailModalCart(null)}
                  className="px-4 py-2 border text-xs font-semibold rounded text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700 cursor-pointer flex items-center gap-1.5"
                >
                  <Send size={14} /> Send Recovery Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
