import React, { useState } from 'react';
import { X, Sliders, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  direction: 'add' | 'remove';
  currentStock: number;
  onAdjust: (data: {
    qty: number;
    type: 'add' | 'set';
    reason: string;
    reference: string;
    notes: string;
  }) => void;
}

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  direction,
  currentStock,
  onAdjust
}: StockAdjustmentModalProps) {
  if (!isOpen) return null;

  const [qty, setQty] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'set'>('add');
  const [reason, setReason] = useState(() => direction === 'add' ? 'Restock from supplier' : 'Inventory correction');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const numQty = Number(qty) || 0;
  let computedNewStock = currentStock;
  
  if (adjustmentType === 'add') {
    computedNewStock = direction === 'add' ? currentStock + numQty : Math.max(0, currentStock - numQty);
  } else {
    computedNewStock = numQty;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || numQty < 0) return;
    onAdjust({
      qty: Math.abs(numQty),
      type: adjustmentType,
      reason,
      reference,
      notes
    });
  };

  const reasonsList = direction === 'add' 
    ? ['Restock from supplier', 'Return to inventory', 'Inventory correction', 'Other']
    : ['Inventory correction', 'Damaged item write-off', 'Promotional giveaway', 'Theft/Loss shrinkage', 'Other'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white rounded-xl shadow-2xl max-w-md w-full border border-[#e3e3e3] p-5 z-10 text-left"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {direction === 'add' ? (
              <TrendingUp size={18} className="text-[#00a15f]" />
            ) : (
              <TrendingDown size={18} className="text-red-500" />
            )}
            <h3 className="font-bold text-base text-[#1a1a1a]">
              {direction === 'add' ? 'Increase Stock Inventory' : 'Decrease Stock Inventory'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#f1f1f1] rounded text-[#616161]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Type */}
          <div className="grid grid-cols-2 gap-2 bg-[#f1f1f1] p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setAdjustmentType('add')}
              className={`py-1 text-xs font-bold rounded-md transition-all ${
                adjustmentType === 'add' ? 'bg-white text-black shadow-xs' : 'text-[#616161] hover:text-black'
              }`}
            >
              {direction === 'add' ? 'Add Quantity' : 'Deduct Quantity'}
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentType('set')}
              className={`py-1 text-xs font-bold rounded-md transition-all ${
                adjustmentType === 'set' ? 'bg-white text-black shadow-xs' : 'text-[#616161] hover:text-black'
              }`}
            >
              Set New Absolute Total
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-[#616161]">Current Stock</label>
              <div className="text-sm font-bold p-2 bg-[#f9f9f9] border border-[#e3e3e3] rounded-lg">
                {currentStock} units
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#616161]">Projected Stock</label>
              <div className="text-sm font-black p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                {computedNewStock} units
              </div>
            </div>
          </div>

          {/* Quantity field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1a1a]">
              {adjustmentType === 'add' ? 'Quantity to change' : 'New quantity level'}
            </label>
            <input
              type="number"
              min="0"
              required
              placeholder="e.g. 50"
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="w-full border border-[#d1d1d1] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1a1a]">Reason Category</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full bg-white border border-[#d1d1d1] rounded-lg px-3 py-1.5 text-sm outline-none"
            >
              {reasonsList.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Reference PO# */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1a1a]">Reference ID (e.g., PO #, Return Code)</label>
            <input
              type="text"
              placeholder="e.g. PO-7492A"
              value={reference}
              onChange={e => setReference(e.target.value)}
              className="w-full border border-[#d1d1d1] rounded-lg px-3 py-1.5 text-sm outline-none font-mono text-xs uppercase"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1a1a]">Internal Audit Note</label>
            <textarea
              rows={2}
              placeholder="Provide a quick explanation of this update..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-[#d1d1d1] rounded-lg px-3 py-1.5 text-sm outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#d1d1d1] text-xs font-bold text-[#1a1a1a] rounded hover:bg-[#f6f6f6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white text-xs font-bold rounded flex items-center gap-1 shadow-sm ${
                direction === 'add' ? 'bg-[#00a15f] hover:bg-[#008f54]' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Save Adjustment
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
