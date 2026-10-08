import React from 'react';
import { Product } from '../types';
import { ShoppingCart, Eye, Heart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useCustomerAuth } from '../context/CustomerAuthContext';

interface ProductCardProps {
  product: Product;
  key?: React.Key;
}

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart } = useCart();
  const { customerProfile, addWishlistItem, removeWishlistItem } = useCustomerAuth();
  const navigate = useNavigate();

  const isWishlisted = customerProfile?.wishlist?.includes(product.id) || false;

  const isOutOfStock = React.useMemo(() => {
    // If the product has positive inventory, it is definitely NOT out of stock!
    if (product.productType === 'variable' && product.variants && product.variants.length > 0) {
      const positiveVariantStock = product.variants.some((v: any) => (v.inventory || 0) > 0);
      if (positiveVariantStock) return false;
    } else if (product.inventory !== undefined && product.inventory > 0) {
      return false;
    }
    // Otherwise, fallback to checking raw database inStock status
    return !product.inStock;
  }, [product]);

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!customerProfile) {
      navigate(`/account?wishlist_add_redirect=${product.id}`);
      return;
    }

    try {
      if (isWishlisted) {
        await removeWishlistItem(product.id);
        const toastDiv = document.createElement('div');
        toastDiv.className = "fixed bottom-5 left-5 z-[200] bg-slate-900/95 backdrop-blur-md text-white py-3 px-5 rounded-xl shadow-2xl border border-slate-800 flex items-center gap-2 text-xs font-bold font-sans animate-bounce";
        toastDiv.innerHTML = `💔 Removed ${product.name} from Wishlist`;
        document.body.appendChild(toastDiv);
        setTimeout(() => {
          document.body.removeChild(toastDiv);
        }, 2500);
      } else {
        await addWishlistItem(product.id);
        const toastDiv = document.createElement('div');
        toastDiv.className = "fixed bottom-5 left-5 z-[200] bg-primary text-white py-3 px-5 rounded-xl shadow-2xl border border-primary-accent flex items-center gap-2 text-xs font-bold font-sans animate-bounce";
        toastDiv.innerHTML = `❤️ Added ${product.name} to Wishlist!`;
        document.body.appendChild(toastDiv);
        setTimeout(() => {
          document.body.removeChild(toastDiv);
        }, 2500);
      }
    } catch (err) {
      console.error("Failed to update wishlist:", err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-enterprise hover:shadow-2xl transition-all duration-500 flex flex-col h-full card-hover"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50 p-4">
        <Link to={`/product/${product.id}`} className="block w-full h-full">
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
        </Link>
        {product.isFeatured && (
          <span className="absolute top-4 left-4 bg-cta/90 backdrop-blur-sm text-slate-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.1em] shadow-lg">
            Best Seller
          </span>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-secondary text-white font-bold px-4 py-2 rounded-xl text-sm shadow-xl">Out of Stock</span>
          </div>
        )}
        
        {/* Overlay Actions */}
        <div className={cn(
          "absolute top-4 right-4 flex flex-col gap-2 transition-all duration-300",
          isWishlisted 
            ? "opacity-100 translate-x-0" 
            : "opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0"
        )}>
          <Link 
            to={`/product/${product.id}`}
            className="w-10 h-10 bg-white text-secondary rounded-xl flex items-center justify-center shadow-enterprise hover:bg-primary hover:text-white transition-all transform hover:scale-105"
          >
            <Eye size={18} />
          </Link>
          <button 
            type="button"
            onClick={handleWishlistClick}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-enterprise transition-all transform hover:scale-105 cursor-pointer",
              isWishlisted 
                ? "bg-red-50 text-red-500 hover:bg-red-100 border border-red-200" 
                : "bg-white text-secondary hover:bg-red-500 hover:text-white"
            )}
            title={isWishlisted ? "Remove from bookmarked items" : "Add to Saved list"}
          >
            <Heart size={18} className={cn(isWishlisted && "fill-red-500 text-red-500")} />
          </button>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{(product.tags && product.tags[0]) || product.brand || 'General'}</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          <Link to={`/product/${product.id}`} className="block">
            <h3 className="text-lg font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors leading-tight">{product.name}</h3>
          </Link>
        </div>
        
        <div className="flex items-center gap-1.5 mb-4">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={12} className={cn("fill-current", i < (product.rating || 4) ? "text-cta" : "text-slate-200")} />
            ))}
          </div>
          <span className="text-[11px] text-slate-400 font-bold ml-1">({product.reviews || 0} REVIEWS)</span>
        </div>



        <div className="flex items-center justify-between mt-auto pt-5 border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Price</span>
            <span className="text-2xl font-display font-black text-secondary">
              <span className="text-sm font-bold text-slate-400 mr-0.5">J$</span>
              {product.price.toLocaleString()}
            </span>
          </div>
          <button 
            disabled={isOutOfStock}
            onClick={() => addToCart(product)}
            className={cn(
              "w-14 h-14 rounded-2xl transition-all duration-300 shadow-enterprise group/cart flex items-center justify-center",
              !isOutOfStock 
                ? "bg-primary text-white hover:bg-primary-accent hover:shadow-2xl active:scale-90" 
                : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
            )}
            title="Add to Cart"
          >
            <ShoppingCart size={24} className="group-hover/cart:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default ProductCard;
