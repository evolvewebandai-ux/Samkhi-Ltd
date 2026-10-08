import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface DuplicateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  originalSku?: string;
  onDuplicate: (options: {
    name: string;
    copyImages: boolean;
    copyVariants: boolean;
    copySeo: boolean;
    targetSku: string;
  }) => void;
}

export default function DuplicateProductModal({
  isOpen,
  onClose,
  productName,
  originalSku,
  onDuplicate
}: DuplicateProductModalProps) {
  if (!isOpen) return null;

  const [newName, setNewName] = useState(`${productName} (Copy)`);
  const [targetSku, setTargetSku] = useState(originalSku ? `${originalSku}-COPY` : '');
  const [copyImages, setCopyImages] = useState(true);
  const [copyVariants, setCopyVariants] = useState(true);
  const [copySeo, setCopySeo] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onDuplicate({
      name: newName.trim(),
      copyImages,
      copyVariants,
      copySeo,
      targetSku: targetSku.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs"
      />

      {/* Main Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white rounded-xl shadow-2xl max-w-md w-full border border-[#e3e3e3] p-6 z-10 text-left"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-[#1a1a1a]">
            <Copy size={18} className="text-[#005bd3]" />
            <h3 className="font-bold text-base">Duplicate Product</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-[#f1f1f1] rounded transition-colors text-[#616161]"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-[#616161]">
            Create a duplicate of <span className="font-semibold text-black">"{productName}"</span>. You'll navigate to the new copy to edit details instantly.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1a1a]">New Product Name</label>
            <input
              type="text"
              required
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full border border-[#d1d1d1] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1a1a]">New Base SKU</label>
            <input
              type="text"
              placeholder="e.g. SOL-200W-COPY"
              value={targetSku}
              onChange={e => setTargetSku(e.target.value)}
              className="w-full border border-[#d1d1d1] rounded-lg px-3 py-1.5 text-sm outline-none font-mono"
            />
          </div>

          <div className="bg-[#f9f9f9] border border-[#e3e3e3] rounded-lg p-3 space-y-2.5">
            <span className="text-[10px] font-bold text-[#616161] uppercase tracking-wider block">Duplicate Config</span>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={copyImages}
                onChange={e => setCopyImages(e.target.checked)}
                className="w-4 h-4 rounded text-black focus:ring-black accent-black"
              />
              <span className="text-xs text-[#1a1a1a]">Duplicate Media Gallery images</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={copyVariants}
                onChange={e => setCopyVariants(e.target.checked)}
                className="w-4 h-4 rounded text-black focus:ring-black accent-black"
              />
              <span className="text-xs text-[#1a1a1a]">Duplicate variant attribute matrix</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={copySeo}
                onChange={e => setCopySeo(e.target.checked)}
                className="w-4 h-4 rounded text-black focus:ring-black accent-black"
              />
              <span className="text-xs text-[#1a1a1a]">Duplicate SEO & meta descriptions</span>
            </label>
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
              className="px-4 py-2 bg-black hover:bg-black/90 text-white text-xs font-bold rounded flex items-center gap-1 shadow-sm"
            >
              <Copy size={12} />
              Confirm Duplicate
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
