import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Tag, Plus, ChevronDown, Calendar, Percent, Banknote, Truck, Trash2, Eye, Layers, Package, UserCheck, ShieldAlert, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useDiscounts } from '../../context/DiscountContext';
import { useProducts } from '../../context/ProductContext';
import { DiscountCoupon } from '../../types';

export default function AdminDiscounts() {
  const { discounts, addDiscount, removeDiscount } = useDiscounts();
  const { products } = useProducts();

  const [isModifying, setIsModifying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [code, setCode] = useState('');
  const [type, setType] = useState<'Percentage' | 'Fixed Amount' | 'Free Shipping'>('Percentage');
  const [value, setValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  
  // Start & End Dates
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');

  // Target Scope
  const [appliesTo, setAppliesTo] = useState<'all' | 'category' | 'specific_products'>('all');
  const [targetCategory, setTargetCategory] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Usage Limits
  const [hasUsageLimit, setHasUsageLimit] = useState(false);
  const [usageLimit, setUsageLimit] = useState<string>('100');

  const [hasPerUserLimit, setHasPerUserLimit] = useState(false);
  const [perUserLimit, setPerUserLimit] = useState<string>('1');

  // Derived Categories from products
  const categories = Array.from(
    new Set([
      'Commercial Kitchen',
      'Refrigeration',
      'Food Prep',
      'Bakery Equipment',
      'Beverage Equipment',
      'Storage & Shelving',
      ...products.map(p => p.category).filter(Boolean)
    ])
  );

  const filteredProductsForSelect = products.filter(p =>
    (p.name || (p as any).title || '').toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const filteredDiscounts = discounts.filter(coupon => 
    (coupon?.code || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
    (coupon?.type || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const coupon: DiscountCoupon = {
      id: Math.random().toString(36).substr(2, 9),
      code: code.trim().toUpperCase(),
      type: type,
      value: type === 'Free Shipping' ? 'Free' : value,
      status: 'Active',
      used: 0,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: hasEndDate && endDate ? endDate : undefined,
      minPurchase: minPurchase ? parseFloat(minPurchase) : undefined,
      appliesTo: appliesTo,
      targetCategory: appliesTo === 'category' ? targetCategory : undefined,
      targetProductIds: appliesTo === 'specific_products' ? selectedProductIds : undefined,
      usageLimit: hasUsageLimit && usageLimit ? parseInt(usageLimit, 10) : undefined,
      perUserLimit: hasPerUserLimit && perUserLimit ? parseInt(perUserLimit, 10) : undefined
    };

    addDiscount(coupon);

    // Reset Form
    setIsModifying(false);
    setCode('');
    setType('Percentage');
    setValue('');
    setMinPurchase('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setHasEndDate(false);
    setEndDate('');
    setAppliesTo('all');
    setTargetCategory('');
    setSelectedProductIds([]);
    setHasUsageLimit(false);
    setUsageLimit('100');
    setHasPerUserLimit(false);
    setPerUserLimit('1');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a]">Discounts Catalog</h1>
          <p className="text-xs text-[#616161] mt-0.5">Manage promotional coupon codes, date schedules, category scopes, and usage caps.</p>
        </div>
        <button 
          onClick={() => setIsModifying(true)}
          className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black/90 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Create Discount
        </button>
      </div>

      <AnimatePresence>
        {isModifying && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl border border-[#e3e3e3] p-6 mb-8 shadow-xl"
          >
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-extrabold text-lg text-[#1a1a1a]">Create Discount Code</h2>
                <p className="text-xs text-slate-500 mt-0.5">Configure code rules, validity timeline, scope targets, and redemption limits.</p>
              </div>
              <button onClick={() => setIsModifying(false)} className="text-[#616161] hover:text-[#1a1a1a] p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-6">
              {/* SECTION 1: CODE & TYPE & VALUE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Discount Code</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. SUMMER25"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full border border-[#d1d1d1] rounded-lg px-3 py-2 text-sm font-bold tracking-wider uppercase focus:ring-2 focus:ring-black/5 outline-none bg-white"
                  />
                  <p className="text-[11px] text-slate-400">Customers enter this exact string at checkout.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Discount Type</label>
                  <div className="flex bg-slate-200/80 p-1 rounded-lg">
                    {[
                      { val: 'Percentage', icon: Percent },
                      { val: 'Fixed Amount', icon: Banknote },
                      { val: 'Free Shipping', icon: Truck }
                    ].map((t) => (
                      <button
                        key={t.val}
                        type="button"
                        onClick={() => setType(t.val as any)}
                        className={cn(
                          "flex-1 flex flex-col items-center py-1.5 rounded-md transition-all",
                          type === t.val ? "bg-white text-[#1a1a1a] shadow-sm font-bold" : "text-[#616161] hover:bg-white/50"
                        )}
                      >
                        <t.icon size={15} className="mb-0.5" />
                        <span className="text-[10px] whitespace-nowrap">{t.val === 'Fixed Amount' ? 'Fixed ($)' : t.val.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {type !== 'Free Shipping' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Discount Value</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#616161] text-sm font-bold">
                        {type === 'Percentage' ? '%' : '$'}
                      </span>
                      <input 
                        required
                        type="number" 
                        step="any"
                        placeholder={type === 'Percentage' ? "15" : "2500"}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        className="w-full border border-[#d1d1d1] rounded-lg pl-8 pr-3 py-2 text-sm font-bold focus:ring-2 focus:ring-black/5 outline-none bg-white"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {type === 'Percentage' ? 'Percentage off eligible items' : 'Flat dollar amount off in JMD'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 flex flex-col justify-center">
                    <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Free Shipping</label>
                    <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg flex items-center gap-2">
                      <Truck size={16} />
                      Waives standard Jamaican delivery fees
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: DATES & MINIMUM PURCHASE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#616161] uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-600" />
                    Start Date
                  </label>
                  <input 
                    required
                    type="date" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full border border-[#d1d1d1] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black/5 outline-none bg-white font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#616161] uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={14} className="text-purple-600" />
                      End Date (Expiration)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600">
                      <input 
                        type="checkbox" 
                        checked={hasEndDate}
                        onChange={e => setHasEndDate(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Set End Date</span>
                    </label>
                  </div>

                  {hasEndDate ? (
                    <input 
                      required={hasEndDate}
                      type="date" 
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full border border-[#d1d1d1] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black/5 outline-none bg-white font-medium"
                    />
                  ) : (
                    <div className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 font-medium italic">
                      No expiration date (Runs indefinitely)
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Minimum Purchase Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                    <input 
                      type="number" 
                      placeholder="Optional (e.g. 10000 JMD)"
                      value={minPurchase}
                      onChange={e => setMinPurchase(e.target.value)}
                      className="w-full border border-[#d1d1d1] rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-black/5 outline-none bg-white"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Cart subtotal required to unlock discount.</p>
                </div>
              </div>

              {/* SECTION 3: APPLIES TO (TARGET SCOPE) */}
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#616161] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-600" />
                    Applies To (Target Catalog Scope)
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">Select whether this coupon applies to the entire store, a specific category, or specific products.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'all', label: 'All Products', desc: 'Applies to any item in store' },
                    { id: 'category', label: 'Specific Category', desc: 'Restricted to selected category' },
                    { id: 'specific_products', label: 'Specific Products', desc: 'Restricted to picked product IDs' }
                  ].map((scope) => (
                    <label 
                      key={scope.id}
                      onClick={() => setAppliesTo(scope.id as any)}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between",
                        appliesTo === scope.id 
                          ? "bg-white border-blue-600 ring-2 ring-blue-500/10 shadow-sm" 
                          : "bg-white/60 border-slate-200 hover:bg-white"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{scope.label}</span>
                        <div className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center",
                          appliesTo === scope.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                        )}>
                          {appliesTo === scope.id && <Check size={10} />}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1">{scope.desc}</span>
                    </label>
                  ))}
                </div>

                {/* Sub-selector for Category */}
                {appliesTo === 'category' && (
                  <div className="pt-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">Select Target Category</label>
                    <select
                      required
                      value={targetCategory}
                      onChange={e => setTargetCategory(e.target.value)}
                      className="w-full sm:w-80 border border-[#d1d1d1] rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">-- Choose a Product Category --</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sub-selector for Specific Products */}
                {appliesTo === 'specific_products' && (
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Selected Products ({selectedProductIds.length})
                      </label>
                      <div className="relative w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                          type="text" 
                          placeholder="Search product catalog..."
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1 pl-8 pr-3 text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white p-1">
                      {filteredProductsForSelect.map(prod => {
                        const isSelected = selectedProductIds.includes(prod.id);
                        return (
                          <div 
                            key={prod.id}
                            onClick={() => toggleProductSelection(prod.id)}
                            className={cn(
                              "p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors text-xs",
                              isSelected ? "bg-blue-50/80 text-blue-900 font-medium" : "hover:bg-slate-50 text-slate-800"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {prod.imageUrl ? (
                                <img src={prod.imageUrl} alt={prod.name || 'Product'} className="w-8 h-8 rounded object-cover border shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                                  <Package size={14} className="text-slate-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold truncate">{prod.name || 'Product'}</p>
                                <p className="text-[10px] text-slate-400">{prod.category || 'General'} • ${prod.price?.toLocaleString()} JMD</p>
                              </div>
                            </div>

                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                            />
                          </div>
                        );
                      })}
                      {filteredProductsForSelect.length === 0 && (
                        <p className="p-4 text-center text-xs text-slate-400">No products found matching "{productSearch}"</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: USAGE LIMITS */}
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#616161] uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck size={14} className="text-emerald-600" />
                    Usage Restrictions & Limits
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">Control how many times this code can be redeemed generally or per customer.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Total Overall Usage Limit */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold text-slate-800">Limit total number of times code can be used</span>
                      <input 
                        type="checkbox" 
                        checked={hasUsageLimit}
                        onChange={e => setHasUsageLimit(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    {hasUsageLimit ? (
                      <input 
                        type="number"
                        min="1"
                        placeholder="e.g. 100"
                        value={usageLimit}
                        onChange={e => setUsageLimit(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    ) : (
                      <p className="text-[11px] text-slate-400">Unlimited total uses</p>
                    )}
                  </div>

                  {/* Per User Limit */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold text-slate-800">Limit usages per specific customer (email)</span>
                      <input 
                        type="checkbox" 
                        checked={hasPerUserLimit}
                        onChange={e => setHasPerUserLimit(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    {hasPerUserLimit ? (
                      <input 
                        type="number"
                        min="1"
                        placeholder="e.g. 1"
                        value={perUserLimit}
                        onChange={e => setPerUserLimit(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    ) : (
                      <p className="text-[11px] text-slate-400">Unlimited uses per customer email</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SAVE BUTTON */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModifying(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#1a1a1a] text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-black transition-colors shadow-md"
                >
                  Save Discount Code
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DISCOUNTS CATALOG TABLE */}
      <div className="bg-white rounded-2xl border border-[#e3e3e3] shadow-sm overflow-hidden text-sm">
        <div className="p-4 border-b border-[#e3e3e3] bg-[#f9f9f9] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#616161]" size={16} />
            <input 
              type="text" 
              placeholder="Search discount codes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#d1d1d1] rounded-xl py-1.5 pl-9 pr-4 text-xs focus:ring-2 focus:ring-black/5 outline-none"
            />
          </div>
          <p className="text-xs text-slate-500 font-medium">Total Coupons: <span className="font-bold text-slate-900">{discounts.length}</span></p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-[#f9f9f9] text-[#616161] text-[11px] font-bold uppercase tracking-wider border-b border-[#e3e3e3]">
              <tr>
                <th className="px-6 py-3.5">Discount Code</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Type & Value</th>
                <th className="px-6 py-3.5">Scope Target</th>
                <th className="px-6 py-3.5 text-center">Usages / Limit</th>
                <th className="px-6 py-3.5 text-right">Validity Schedule</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredDiscounts.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-[#f9f9f9] transition-colors group">
                  {/* Code */}
                  <td className="px-6 py-4 font-bold text-[#1a1a1a]">
                    <Link 
                      to={`/admin/discounts/${coupon.id}`}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors group-hover:underline text-sm font-black"
                    >
                      <Tag size={15} className="text-blue-600 shrink-0" />
                      <span>{coupon.code}</span>
                    </Link>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      coupon.status === 'Active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
                    )}>
                      {coupon.status}
                    </span>
                  </td>

                  {/* Type & Value */}
                  <td className="px-6 py-4 font-semibold text-[#1a1a1a]">
                    <span className="block font-bold">
                      {coupon.type === 'Percentage' ? `${coupon.value}% Off` : coupon.type === 'Fixed Amount' ? `$${coupon.value} JMD Off` : 'Free Shipping'}
                    </span>
                    {coupon.minPurchase && (
                      <span className="text-[10px] text-slate-400 font-normal">Min: ${coupon.minPurchase.toLocaleString()} JMD</span>
                    )}
                  </td>

                  {/* Scope Target */}
                  <td className="px-6 py-4 text-slate-600">
                    {coupon.appliesTo === 'category' ? (
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-bold text-[10px]">
                        <Layers size={12} />
                        {coupon.targetCategory || 'Category'}
                      </span>
                    ) : coupon.appliesTo === 'specific_products' ? (
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-bold text-[10px]">
                        <Package size={12} />
                        {coupon.targetProductIds?.length || 0} Specific Products
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-bold text-[10px]">
                        All Products
                      </span>
                    )}
                  </td>

                  {/* Usages / Limit */}
                  <td className="px-6 py-4 text-center tabular-nums">
                    <Link 
                      to={`/admin/discounts/${coupon.id}`}
                      className="inline-flex items-center gap-1 font-black text-blue-600 hover:underline"
                    >
                      {coupon.used} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : 'uses'}
                      <ChevronDown size={12} className="-rotate-90" />
                    </Link>
                    {coupon.perUserLimit && (
                      <p className="text-[10px] text-slate-400 font-mono">Max {coupon.perUserLimit}/user</p>
                    )}
                  </td>

                  {/* Validity Schedule */}
                  <td className="px-6 py-4 text-right text-slate-500 font-medium">
                    <div className="flex items-center justify-end gap-1 text-[11px]">
                      <Calendar size={12} className="text-slate-400" />
                      <span>{coupon.startDate || 'Started'}</span>
                    </div>
                    {coupon.endDate ? (
                      <p className="text-[10px] text-purple-600 font-bold mt-0.5">Expires: {coupon.endDate}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-0.5">No Expiration</p>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 text-right space-x-1">
                    <Link 
                      to={`/admin/discounts/${coupon.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title="View Usages & Product Breakdown"
                    >
                      <Eye size={14} />
                      <span className="hidden sm:inline">Audit</span>
                    </Link>
                    <button 
                      onClick={() => removeDiscount(coupon.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors inline-block"
                      title="Delete Discount"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredDiscounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-[#616161]">
                    <Tag size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-bold text-slate-800 text-base">No discounts found</p>
                    <p className="text-xs text-slate-500">Create your first custom discount coupon to drive customer sales.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
