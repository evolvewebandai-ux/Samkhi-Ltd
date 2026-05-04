import React, { useState } from 'react';
import { Search, Tag, Plus, ChevronDown, Calendar, Percent, Banknote, Truck, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface DiscountCoupon {
  id: string;
  code: string;
  type: 'Percentage' | 'Fixed Amount' | 'Free Shipping';
  value: string;
  status: 'Active' | 'Scheduled' | 'Expired';
  used: number;
  startDate: string;
  endDate?: string;
}

const INITIAL_COUPONS: DiscountCoupon[] = [
  { id: '1', code: 'SOLAR2026', type: 'Percentage', value: '10%', status: 'Active', used: 124, startDate: 'Jan 01, 2026' },
  { id: '2', code: 'FREESHIP', type: 'Free Shipping', value: 'Free', status: 'Active', used: 45, startDate: 'Feb 15, 2026' },
  { id: '3', code: 'WELCOME50', type: 'Fixed Amount', value: '$50.00', status: 'Active', used: 89, startDate: 'Mar 10, 2026' },
];

export default function AdminDiscounts() {
  const [coupons, setCoupons] = useState<DiscountCoupon[]>(INITIAL_COUPONS);
  const [isModifying, setIsModifying] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'Percentage' as const,
    value: '',
    minPurchase: ''
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const coupon: DiscountCoupon = {
      id: Math.random().toString(36).substr(2, 9),
      code: newCoupon.code.toUpperCase(),
      type: newCoupon.type,
      value: newCoupon.type === 'Free Shipping' ? 'Free' : newCoupon.value,
      status: 'Active',
      used: 0,
      startDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    };
    setCoupons([coupon, ...coupons]);
    setIsModifying(false);
    setNewCoupon({ code: '', type: 'Percentage', value: '', minPurchase: '' });
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-[#1a1a1a]">Discounts</h1>
        <button 
          onClick={() => setIsModifying(true)}
          className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-black/90 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Create discount
        </button>
      </div>

      <AnimatePresence>
        {isModifying && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg border border-[#e3e3e3] p-6 mb-8 shadow-sm"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-[#1a1a1a]">Create Discount Code</h2>
              <button onClick={() => setIsModifying(false)} className="text-[#616161] hover:text-[#1a1a1a]">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Discount Code</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. SUMMER25"
                  value={newCoupon.code}
                  onChange={e => setNewCoupon({...newCoupon, code: e.target.value})}
                  className="w-full border border-[#d1d1d1] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black/5 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Type</label>
                <div className="flex bg-[#f1f1f1] p-1 rounded-md">
                  {[
                    { val: 'Percentage', icon: Percent },
                    { val: 'Fixed Amount', icon: Banknote },
                    { val: 'Free Shipping', icon: Truck }
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setNewCoupon({...newCoupon, type: t.val as any})}
                      className={cn(
                        "flex-1 flex flex-col items-center py-2 rounded transition-all",
                        newCoupon.type === t.val ? "bg-white text-[#1a1a1a] shadow-sm" : "text-[#616161] hover:bg-white/50"
                      )}
                    >
                      <t.icon size={16} className="mb-1" />
                      <span className="text-[10px] font-bold whitespace-nowrap">{t.val === 'Fixed Amount' ? 'Fixed' : t.val.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {newCoupon.type !== 'Free Shipping' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Value</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#616161] text-sm">
                      {newCoupon.type === 'Percentage' ? '%' : '$'}
                    </span>
                    <input 
                      required
                      type="text" 
                      placeholder="10"
                      value={newCoupon.value}
                      onChange={e => setNewCoupon({...newCoupon, value: e.target.value})}
                      className="w-full border border-[#d1d1d1] rounded-md pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-black/5 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-end">
                <button 
                  type="submit"
                  className="w-full bg-[#1a1a1a] text-white py-2 rounded-md font-bold text-sm hover:bg-black transition-colors"
                >
                  Save Discount
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-lg border border-[#e3e3e3] shadow-sm overflow-hidden text-sm">
        <div className="p-3 border-b border-[#e3e3e3] bg-[#f9f9f9] flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#616161]" size={16} />
            <input 
              type="text" 
              placeholder="Search discounts"
              className="w-full bg-white border border-[#d1d1d1] rounded-md py-1 pl-8 pr-4 text-sm focus:ring-2 focus:ring-black/5 outline-none"
            />
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead className="bg-[#f9f9f9] text-[#616161] text-xs font-bold uppercase tracking-wider border-b border-[#e3e3e3]">
            <tr>
              <th className="px-6 py-3">Discount code</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3 text-right">Used</th>
              <th className="px-6 py-3 text-right">Start date</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="border-b border-[#e3e3e3] hover:bg-[#f9f9f9] transition-colors group">
                <td className="px-6 py-4 font-bold text-[#1a1a1a] flex items-center gap-2">
                  <Tag size={14} className="text-[#616161]" />
                  {coupon.code}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    coupon.status === 'Active' ? "bg-[#ccf2e5] text-[#006e52]" : "bg-[#e4e5e7] text-[#616161]"
                  )}>
                    {coupon.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#616161]">
                  {coupon.type} ({coupon.value})
                </td>
                <td className="px-6 py-4 text-right tabular-nums font-medium text-[#1a1a1a]">
                  {coupon.used}
                </td>
                <td className="px-6 py-4 text-right text-[#616161]">
                  {coupon.startDate}
                </td>
                <td className="px-4 py-4 text-right">
                  <button 
                    onClick={() => setCoupons(coupons.filter(c => c.id !== coupon.id))}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-[#616161]">
                  <Tag size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="font-medium">No discounts found</p>
                  <p className="text-xs">Create your first discount to attract more customers.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
