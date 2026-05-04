import React from 'react';
import { Product } from '../types';
import { ShoppingCart, Eye, Heart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ProductCardProps {
  product: Product;
  key?: React.Key;
}

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart } = useCart();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-enterprise hover:shadow-2xl transition-all duration-500 flex flex-col h-full card-hover"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50 p-4">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        {product.isFeatured && (
          <span className="absolute top-4 left-4 bg-cta/90 backdrop-blur-sm text-slate-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.1em] shadow-lg">
            Best Seller
          </span>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-secondary text-white font-bold px-4 py-2 rounded-xl text-sm shadow-xl">Out of Stock</span>
          </div>
        )}
        
        {/* Overlay Actions */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
          <Link 
            to={`/product/${product.id}`}
            className="w-10 h-10 bg-white text-secondary rounded-xl flex items-center justify-center shadow-enterprise hover:bg-primary hover:text-white transition-all transform hover:scale-105"
          >
            <Eye size={18} />
          </Link>
          <button className="w-10 h-10 bg-white text-secondary rounded-xl flex items-center justify-center shadow-enterprise hover:bg-red-500 hover:text-white transition-all transform hover:scale-105">
            <Heart size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{product.category.replace('-', ' ')}</span>
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

        <p className="text-slate-500 text-sm line-clamp-2 mb-6 leading-relaxed flex-1">
          {product.description}
        </p>

        <div className="flex items-center justify-between mt-auto pt-5 border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Price</span>
            <span className="text-2xl font-display font-black text-secondary">
              <span className="text-sm font-bold text-slate-400 mr-0.5">J$</span>
              {product.price.toLocaleString()}
            </span>
          </div>
          <button 
            disabled={!product.inStock}
            onClick={() => addToCart(product)}
            className={cn(
              "w-14 h-14 rounded-2xl transition-all duration-300 shadow-enterprise group/cart flex items-center justify-center",
              product.inStock 
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
