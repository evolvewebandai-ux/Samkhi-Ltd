import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Tag, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  Search, 
  Calendar, 
  Percent, 
  Banknote, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  Trash2, 
  ExternalLink,
  Package,
  Clock,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useDiscounts } from '../../context/DiscountContext';
import { useOrders } from '../../context/OrderContext';
import { OrderItem } from '../../types';

export default function DiscountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { discounts, updateDiscount, removeDiscount } = useDiscounts();
  const { orders } = useOrders();

  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Find target discount coupon by ID or by Code
  const coupon = useMemo(() => {
    if (!id) return null;
    return discounts.find(
      d => d.id === id || (d.code || '').toUpperCase() === (id || '').toUpperCase()
    );
  }, [discounts, id]);

  // Find all orders that applied this discount code
  const matchingOrders = useMemo(() => {
    if (!coupon) return [];
    return orders.filter(order => {
      if (!order.discountCode) return false;
      return (order.discountCode || '').trim().toUpperCase() === (coupon.code || '').trim().toUpperCase();
    });
  }, [orders, coupon]);

  // Calculate metrics
  const totalUsages = useMemo(() => {
    // Return maximum of actual matching orders length or recorded used count
    return Math.max(matchingOrders.length, coupon?.used || 0);
  }, [matchingOrders, coupon]);

  const totalDiscountSavings = useMemo(() => {
    return matchingOrders.reduce((sum, o) => {
      if (o.discountAmount) return sum + o.discountAmount;
      // Estimate if missing
      if (coupon?.type === 'Percentage') {
        const pct = parseFloat(coupon.value) || 0;
        return sum + ((o.subtotal || o.total) * (pct / 100));
      } else if (coupon?.type === 'Fixed Amount') {
        return sum + (parseFloat(coupon.value) || 0);
      }
      return sum;
    }, 0);
  }, [matchingOrders, coupon]);

  const totalRevenueGenerated = useMemo(() => {
    return matchingOrders.reduce((sum, o) => sum + (o.grand_total || o.total || 0), 0);
  }, [matchingOrders]);

  const uniqueCustomersCount = useMemo(() => {
    const emails = new Set(matchingOrders.map(o => o.customerEmail?.toLowerCase().trim()).filter(Boolean));
    return emails.size;
  }, [matchingOrders]);

  // Aggregate product breakdown ("For what product")
  const productBreakdown = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      imageUrl: string;
      sku?: string;
      totalUnits: number;
      totalRevenue: number;
      ordersCount: number;
    }>();

    matchingOrders.forEach(order => {
      if (order.lineItems && order.lineItems.length > 0) {
        order.lineItems.forEach((item: OrderItem) => {
          const key = item.productId || item.productName || item.id;
          const existing = map.get(key) || {
            id: item.productId || item.id,
            name: item.productName || 'Product',
            imageUrl: item.imageUrl || '',
            sku: item.sku,
            totalUnits: 0,
            totalRevenue: 0,
            ordersCount: 0
          };
          existing.totalUnits += item.quantity || 1;
          existing.totalRevenue += (item.price || 0) * (item.quantity || 1);
          existing.ordersCount += 1;
          map.set(key, existing);
        });
      } else {
        // Fallback for orders without structured lineItems
        const key = 'general_order';
        const existing = map.get(key) || {
          id: 'general',
          name: 'General Storefront Purchase',
          imageUrl: '',
          totalUnits: 0,
          totalRevenue: 0,
          ordersCount: 0
        };
        existing.totalUnits += order.items || 1;
        existing.totalRevenue += order.total || 0;
        existing.ordersCount += 1;
        map.set(key, existing);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalUnits - a.totalUnits);
  }, [matchingOrders]);

  // Filtered orders list by search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return matchingOrders;
    const q = searchQuery.toLowerCase().trim();
    return matchingOrders.filter(o => 
      (o.id || '').toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.customerEmail || '').toLowerCase().includes(q) ||
      (o.lineItems && o.lineItems.some(i => (i.productName || '').toLowerCase().includes(q)))
    );
  }, [matchingOrders, searchQuery]);

  const handleCopyCode = () => {
    if (!coupon) return;
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleStatus = async () => {
    if (!coupon) return;
    const nextStatus = coupon.status === 'Active' ? 'Expired' : 'Active';
    await updateDiscount(coupon.id, { status: nextStatus });
  };

  const handleDelete = async () => {
    if (!coupon) return;
    await removeDiscount(coupon.id);
    navigate('/admin/discounts');
  };

  if (!coupon) {
    return (
      <div className="p-8 max-w-5xl mx-auto font-sans text-slate-900">
        <button
          onClick={() => navigate('/admin/discounts')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Discounts
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Tag size={48} className="mx-auto mb-4 text-slate-300" />
          <h2 className="text-lg font-bold text-slate-900">Discount Code Not Found</h2>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            The discount coupon you are looking for does not exist or may have been deleted.
          </p>
          <button
            onClick={() => navigate('/admin/discounts')}
            className="mt-6 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-black transition-colors"
          >
            Return to Discounts Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1450px] mx-auto font-sans text-slate-900 space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/discounts')}
            className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors shadow-sm"
            title="Back to Discounts"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link to="/admin/discounts" className="hover:underline">Discounts</Link>
              <ChevronRight size={12} />
              <span>Coupon Usage Audit</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Tag className="text-blue-600" size={26} />
                <span>{coupon.code}</span>
              </h1>
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                coupon.status === 'Active' 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-slate-100 text-slate-600 border-slate-200"
              )}>
                {coupon.status}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopyCode}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 transition-colors shadow-sm"
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
          </button>

          <button
            onClick={handleToggleStatus}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm border",
              coupon.status === 'Active'
                ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
            )}
          >
            {coupon.status === 'Active' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>Mark as {coupon.status === 'Active' ? 'Expired' : 'Active'}</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors shadow-sm"
            title="Delete Discount Code"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Coupon Information Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Discount Type</span>
            <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5">
              {coupon.type === 'Percentage' && <Percent size={16} className="text-blue-600" />}
              {coupon.type === 'Fixed Amount' && <Banknote size={16} className="text-emerald-600" />}
              {coupon.type === 'Free Shipping' && <Truck size={16} className="text-purple-600" />}
              {coupon.type}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Discount Value</span>
            <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
              {coupon.type === 'Percentage' ? `${coupon.value}% Off` : coupon.type === 'Fixed Amount' ? `$${parseFloat(coupon.value).toLocaleString()} JMD Off` : 'Free Shipping'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Valid Schedule</span>
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
              <Calendar size={14} className="text-blue-600" />
              <span>{coupon.startDate || 'Started'}</span>
            </span>
            <span className="text-[10px] text-purple-600 font-bold block mt-0.5">
              {coupon.endDate ? `Expires: ${coupon.endDate}` : 'No Expiration'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Applies To Scope</span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block">
              {coupon.appliesTo === 'category' 
                ? `Category: ${coupon.targetCategory}` 
                : coupon.appliesTo === 'specific_products' 
                ? `${coupon.targetProductIds?.length || 0} Products` 
                : 'All Products'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Usage Cap</span>
            <span className="text-xs font-extrabold text-slate-900 mt-0.5 block">
              {coupon.usageLimit ? `${coupon.used} / ${coupon.usageLimit} max` : 'Unlimited'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Per-User Cap</span>
            <span className="text-xs font-semibold text-slate-700 mt-0.5 block">
              {coupon.perUserLimit ? `${coupon.perUserLimit} use/customer` : 'Unlimited per user'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Usages */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Times Used</span>
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <ShoppingBag size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">{totalUsages}</p>
          <p className="text-xs text-slate-500 mt-1">Total checkout redemptions</p>
        </div>

        {/* Card 2: Total Savings Granted */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Discount Given</span>
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
            ${totalDiscountSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total customer savings</p>
        </div>

        {/* Card 3: Total Sales Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue Generated</span>
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
            ${totalRevenueGenerated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Gross sales using this code</p>
        </div>

        {/* Card 4: Unique Customers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unique Customers</span>
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Users size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">{uniqueCustomersCount}</p>
          <p className="text-xs text-slate-500 mt-1">Distinct customer emails</p>
        </div>
      </div>

      {/* Product Breakdown Section ("For What Product") */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package size={20} className="text-blue-600" />
              Products Purchased With Code ({productBreakdown.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of specific products bought by customers redeeming this discount code.
            </p>
          </div>
        </div>

        {productBreakdown.length > 0 ? (
          <div className="divide-y divide-slate-100">
            <div className="grid grid-cols-12 px-6 py-2.5 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-6 sm:col-span-6">Product Details</div>
              <div className="col-span-3 sm:col-span-3 text-right">Units Sold</div>
              <div className="col-span-3 sm:col-span-3 text-right">Gross Sales</div>
            </div>

            {productBreakdown.map((item) => (
              <div key={item.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50/70 transition-colors">
                <div className="col-span-6 sm:col-span-6 flex items-center gap-3">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 font-bold text-xs">
                      <Package size={20} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                    {item.sku && (
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">SKU: {item.sku}</p>
                    )}
                    <p className="text-[11px] text-slate-500">In {item.ordersCount} order{item.ordersCount > 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="col-span-3 sm:col-span-3 text-right font-extrabold text-slate-900 text-sm tabular-nums">
                  {item.totalUnits} unit{item.totalUnits > 1 ? 's' : ''}
                </div>

                <div className="col-span-3 sm:col-span-3 text-right font-extrabold text-slate-900 text-sm tabular-nums">
                  ${item.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">
            <Package size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No product breakdown available yet.</p>
            <p className="text-xs text-slate-400">Products will automatically populate here when orders are placed using this code.</p>
          </div>
        )}
      </div>

      {/* Orders Usage Detailed Audit Table ("By Whom & How Many Times") */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users size={20} className="text-blue-600" />
              Order Usage Log ({matchingOrders.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete list of all customers and orders that redeemed code <span className="font-bold text-slate-800">{coupon.code}</span>.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by customer name, email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Order ID & Date</th>
                  <th className="px-6 py-3.5">Used By (Customer)</th>
                  <th className="px-6 py-3.5">Items Purchased</th>
                  <th className="px-6 py-3.5 text-right">Discount Saved</th>
                  <th className="px-6 py-3.5 text-right">Order Total</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Order ID & Date */}
                    <td className="px-6 py-4 align-top">
                      <Link 
                        to={`/admin/orders/${order.id}`}
                        className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5"
                      >
                        #{order.id}
                        <ExternalLink size={12} />
                      </Link>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                        <Clock size={12} className="text-slate-400" />
                        <span>{order.date}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-6 py-4 align-top">
                      <div className="font-bold text-slate-900 text-sm">
                        {order.customerName || 'Guest Customer'}
                      </div>
                      <div className="text-slate-500 font-medium mt-0.5">
                        {order.customerEmail}
                      </div>
                      {order.customerPhone && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {order.customerPhone}
                        </div>
                      )}
                    </td>

                    {/* Purchased Products */}
                    <td className="px-6 py-4 align-top">
                      {order.lineItems && order.lineItems.length > 0 ? (
                        <div className="space-y-1.5 max-w-xs">
                          {order.lineItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              {item.imageUrl && (
                                <img src={item.imageUrl} alt={item.productName} className="w-6 h-6 rounded object-cover border border-slate-200 shrink-0" />
                              )}
                              <span className="font-medium text-slate-800 truncate">{item.productName}</span>
                              <span className="text-slate-400 font-mono font-bold text-[10px]">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">{order.items || 1} item(s)</span>
                      )}
                    </td>

                    {/* Discount Saved */}
                    <td className="px-6 py-4 align-top text-right font-bold text-emerald-600 text-sm tabular-nums">
                      -${(order.discountAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Order Total */}
                    <td className="px-6 py-4 align-top text-right font-extrabold text-slate-900 text-sm tabular-nums">
                      ${(order.grand_total || order.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 align-top text-center space-y-1">
                      <span className={cn(
                        "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        order.paymentStatus === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        order.paymentStatus === 'pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-slate-100 text-slate-700 border-slate-200"
                      )}>
                        {order.paymentStatus || 'paid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <h3 className="font-bold text-slate-800 text-base">No Order Usages Recorded</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {searchQuery ? 'No usages match your search term.' : 'When customers enter code ' + coupon.code + ' at checkout, their usage and purchase records will show here.'}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900"
          >
            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Delete Discount Code?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Are you sure you want to permanently delete discount code <span className="font-bold text-slate-900">{coupon.code}</span>? Customers will no longer be able to redeem this coupon code at checkout.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm"
              >
                Yes, Delete Code
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
