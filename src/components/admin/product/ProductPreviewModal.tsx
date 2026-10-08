import React, { useState } from 'react';
import { X, ShoppingCart, Shield, ArrowRight, Star } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    name: string;
    description: string;
    price: number;
    compareAtPrice?: number;
    brand?: string;
    imageUrl: string;
    images?: { id: string; url: string; altText: string }[];
    options?: { name: string; values: string[] }[];
  };
}

export default function ProductPreviewModal({ isOpen, onClose, product }: ProductPreviewModalProps) {
  if (!isOpen) return null;

  const imagesList = product.images && product.images.length > 0 
    ? product.images 
    : [{ id: 'main', url: product.imageUrl, altText: product.name }];

  const [activeImage, setActiveImage] = useState(imagesList[0]?.url || product.imageUrl);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    product.options?.forEach(opt => {
      if (opt.values.length > 0) {
        initial[opt.name] = opt.values[0];
      }
    });
    return initial;
  });
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* Main Container */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto z-10 flex flex-col md:flex-row border border-[#e3e3e3]"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-white/80 p-2 rounded-full border border-[#e3e3e3] hover:bg-[#f1f1f1] transition-colors"
        >
          <X size={18} className="text-[#1a1a1a]" />
        </button>

        {/* Left Column: Image Area */}
        <div className="md:w-1/2 p-6 bg-[#f9f9f9] border-r border-[#e3e3e3] flex flex-col justify-between">
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <img 
              src={activeImage} 
              alt={product.name} 
              className="max-h-[350px] w-auto object-contain rounded-lg shadow-sm bg-white p-2" 
            />
          </div>

          {/* Thumbnails */}
          {imagesList.length > 1 && (
            <div className="flex gap-2 justify-center mt-6 overflow-x-auto py-1">
              {imagesList.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(img.url)}
                  className={`w-14 h-14 rounded-md overflow-hidden border-2 bg-white ${
                    activeImage === img.url ? 'border-black' : 'border-transparent'
                  } transition-all p-0.5`}
                >
                  <img src={img.url} alt={img.altText} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Customer Details */}
        <div className="md:w-1/2 p-8 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest block mb-1">
              {product.brand || 'Samkhi Limited'}
            </span>
            <h2 className="text-2xl font-extrabold text-[#1a1a1a] tracking-tight mb-2">
              {product.name}
            </h2>

            {/* Simulated Reviews */}
            <div className="flex items-center gap-1.5 mb-4">
              <div className="flex text-amber-500">
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" className="opacity-40" />
              </div>
              <span className="text-xs text-[#616161] font-semibold">(4.2 out of 5 &middot; 18 reviews)</span>
            </div>

            {/* Price section */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-black text-[#1a1a1a]">
                ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-sm text-[#616161] line-through">
                  ${product.compareAtPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>

            <hr className="border-[#e3e3e3] mb-6" />

            {/* Options selectors */}
            <div className="space-y-4">
              {product.options?.map((opt) => (
                <div key={opt.name} className="space-y-1.5">
                  <span className="text-xs font-bold text-[#616161] uppercase tracking-wider block">
                    {opt.name}: <span className="text-black normal-case font-medium">{selectedOptions[opt.name]}</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map((val) => (
                      <button
                        key={val}
                        onClick={() => setSelectedOptions(prev => ({ ...prev, [opt.name]: val }))}
                        className={`text-xs font-bold px-3 py-1.5 rounded-md border transition-all ${
                          selectedOptions[opt.name] === val
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-[#1a1a1a] border-[#d1d1d1] hover:bg-[#f9f9f9]'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Quantity */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-[#616161] uppercase tracking-wider block">
                  Quantity
                </span>
                <div className="flex items-center gap-1.5 border border-[#d1d1d1] rounded-md w-28 overflow-hidden bg-white">
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-8 py-1 hover:bg-[#f1f1f1] text-center font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center text-xs font-bold text-[#1a1a1a]">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-8 py-1 hover:bg-[#f1f1f1] text-center font-bold text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-[#f9f9f9] border border-[#e3e3e3]">
              <p className="text-xs text-[#616161] leading-relaxed italic line-clamp-4">
                {product.description || 'No description provided.'}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={() => triggerCustNotification()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
            >
              <ShoppingCart size={14} />
              Add to Cart - ${(product.price * quantity).toFixed(2)}
            </button>
            <div className="flex items-center gap-2 justify-center text-[10px] text-amber-800 font-medium">
              <Shield size={12} />
              <span>Full 2-Year Direct Warranty Covered by Samkhi Limited</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  function triggerCustNotification() {
    alert("This is a live preview. In the actual store, this item will be added to the customer's cart!");
  }
}
