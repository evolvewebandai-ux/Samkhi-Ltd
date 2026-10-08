import React, { useState } from 'react';
import { X, Settings, Database } from 'lucide-react';
import { motion } from 'motion/react';

interface Variant {
  id: string;
  title: string;
  price: string | number;
  costPrice?: string | number;
  inventory: string | number;
  sku?: string;
  barcode?: string;
}

interface VariantEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: Variant | null;
  onSave: (updatedVariant: Variant) => void;
}

export default function VariantEditModal({
  isOpen,
  onClose,
  variant,
  onSave
}: VariantEditModalProps) {
  if (!isOpen || !variant) return null;

  const [price, setPrice] = useState(variant.price?.toString() || '');
  const [costPrice, setCostPrice] = useState(variant.costPrice?.toString() || '');
  const [inventory, setInventory] = useState(variant.inventory?.toString() || '0');
  const [sku, setSku] = useState(variant.sku || '');
  const [barcode, setBarcode] = useState(variant.barcode || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...variant,
      price: isNaN(Number(price)) ? 0 : Number(price),
      costPrice: costPrice ? (isNaN(Number(costPrice)) ? undefined : Number(costPrice)) : undefined,
      inventory: isNaN(Number(inventory)) ? 0 : Number(inventory),
      sku: sku.trim() || undefined,
      barcode: barcode.trim() || undefined
    });
  };

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
            <Settings size={18} className="text-black" />
            <h3 className="font-bold text-base text-[#1a1a1a]">
              Edit Variant: <span className="text-emerald-700">{variant.title}</span>
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#f1f1f1] rounded text-[#616161]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-bold text-[#1a1a1a]">Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#616161]">$</span>
                <input
                  type="text"
                  required
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full border border-[#d1d1d1] rounded-lg pl-7 pr-3 py-1.5 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-bold text-[#1a1a1a]">Quantity Available</label>
              <input
                type="number"
                required
                value={inventory}
                onChange={e => setInventory(e.target.value)}
                className="w-full border border-[#d1d1d1] rounded-lg px-3 py-1.5 text-sm outline-none"
              />
            </div>
          </div>

          <hr className="border-[#e3e3e3]" />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1a1a]">SKU (Stock Keeping Unit)</label>
            <input
              type="text"
              placeholder="e.g. VARIANT-XYZ-1"
              value={sku}
              onChange={e => setSku(e.target.value)}
              className="w-full border border-[#d1d1d1] rounded-lg px-3 py-1.5 text-sm outline-none font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1a1a]">Barcode (GTIN, UPC, GTIN-14)</label>
            <input
              type="text"
              placeholder="e.g. 504030101012"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              className="w-full border border-[#d1d1d1] rounded-lg px-3 py-1.5 text-sm outline-none font-mono text-xs"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#d1d1d1] text-xs font-bold text-[#1a1a1a] rounded hover:bg-[#f6f6f6]"
            >
              Discard
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black hover:bg-black/90 text-white text-xs font-bold rounded flex items-center gap-1 shadow-sm"
            >
              Save Variant Changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
