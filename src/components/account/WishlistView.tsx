import { useState } from 'react';
import { Heart, ShoppingBag, Eye, Trash2, Share2, Sparkles, AlertCircle } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { PRODUCTS } from '../../data';

interface WishlistViewProps {
  wishlistIds: string[];
  onRemoveItem: (productId: string) => void;
  onViewProduct: (productId: string) => void;
}

export default function WishlistView({ wishlistIds, onRemoveItem, onViewProduct }: WishlistViewProps) {
  const { addToCart } = useCart();
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Filter full products list
  const savedProducts = PRODUCTS.filter(p => wishlistIds?.includes(p.id));

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    
    // Toast notification
    const toastDiv = document.createElement('div');
    toastDiv.className = "fixed bottom-5 left-5 z-[200] bg-primary text-white py-3 px-5 rounded-xl shadow-2xl border border-primary-accent flex items-center gap-2 text-xs font-bold font-sans animate-bounce";
    toastDiv.innerHTML = `🛒 Added ${product.name} to Cart!`;
    document.body.appendChild(toastDiv);
    setTimeout(() => {
      document.body.removeChild(toastDiv);
    }, 2500);
  };

  const handleShareWishlist = () => {
    const url = `${window.location.origin}/account?wishlist=${wishlistIds.join(',')}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2000);
    }).catch(() => {
      alert(`Shareable Link: ${url}`);
    });
  };

  if (!wishlistIds || wishlistIds.length === 0) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center">
        <div className="w-16 h-16 bg-slate-150 text-slate-400 mx-auto rounded-full flex items-center justify-center mb-4 leading-none">
          <Heart size={28} className="text-slate-300" />
        </div>
        <h3 className="font-display font-bold text-xl text-secondary">Your wishlist is currently empty</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
          Explore our extensive enterprise-grade LED catalogs and premium solar solutions to bookmark items for later purchase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header and top sharing bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 pb-2 border-b border-slate-100">
        <div>
          <h3 className="font-display font-black text-xl text-secondary flex items-center gap-2">
            <Heart className="fill-red-500 text-red-500" size={22} /> Wishlist / Saved Items
          </h3>
          <p className="text-xs text-slate-400 mt-1">Bookmarked items you can checkout anytime</p>
        </div>

        <button
          onClick={handleShareWishlist}
          className="bg-white border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 transition-all active:scale-95 hover:bg-slate-50 cursor-pointer"
        >
          <Share2 size={14} className="text-primary-accent" />
          {copiedShareLink ? "✨ Copied to Clipboard!" : "Share Wishlist Link"}
        </button>
      </div>

      {/* Grid of wishlisted items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedProducts.map((product) => (
          <div 
            key={product.id} 
            className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-enterprise flex flex-col justify-between group transition-all duration-300 hover:scale-[1.01] hover:border-slate-200"
          >
            {/* Image box */}
            <div className="bg-slate-50 p-6 flex justify-center items-center relative h-48 overflow-hidden">
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => onRemoveItem(product.id)}
                className="absolute top-4 right-4 p-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl shadow-sm border border-slate-100 transition-colors cursor-pointer"
                title="Remove Item"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Meta details */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">{product.brand || 'Samkhi'}</span>
                <h4 className="text-xs font-black text-secondary line-clamp-2 mt-0.5" title={product.name}>
                  {product.name}
                </h4>
                <p className="text-sm font-black text-primary mt-2">
                  JMD ${product.price?.toLocaleString()}
                </p>
              </div>

              {/* Lower action buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                <button
                  onClick={() => onViewProduct(product.id)}
                  className="bg-slate-50 hover:bg-slate-100 text-secondary font-bold py-2 px-3 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <Eye size={13} /> View details
                </button>
                <button
                  onClick={() => handleAddToCart(product)}
                  className="bg-primary hover:bg-primary-accent text-white font-bold py-2 px-3 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <ShoppingBag size={13} /> Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
