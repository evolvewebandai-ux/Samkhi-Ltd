import { useParams, Link, useNavigate } from 'react-router-dom';
import { PRODUCTS } from '../data';
import { useCart } from '../context/CartContext';
import { ShoppingCart, ArrowLeft, ShieldCheck, Truck, RefreshCw, Star, Info, MessageSquare, ChevronRight } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'warranty'>('desc');

  const product = useMemo(() => PRODUCTS.find(p => p.id === id), [id]);

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-display font-bold mb-4">Product Not Found</h2>
        <Link to="/shop" className="btn-primary">Return to Shop</Link>
      </div>
    );
  }

  const relatedProducts = PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

  return (
    <div className="bg-surface min-h-screen pb-24">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight size={14} />
          <Link to="/shop" className="hover:text-primary transition-colors">Shop</Link>
          <ChevronRight size={14} />
          <Link to={`/shop?category=${product.category}`} className="hover:text-primary transition-colors uppercase tracking-widest">{product.category.replace('-', ' ')}</Link>
          <ChevronRight size={14} />
          <span className="text-secondary truncate">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Gallery */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-square bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl"
            >
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden border-2 border-slate-100 hover:border-primary transition-all cursor-pointer">
                   <img src={`https://picsum.photos/seed/prod${id}${i}/200/200`} alt="Thumb" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="mb-6">
              <span className="text-primary font-black uppercase text-xs tracking-[0.3em]">{product.category.replace('-', ' ')}</span>
              <h1 className="text-4xl md:text-5xl font-display font-black text-secondary mt-2 mb-4 leading-tight">{product.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                 <div className="flex text-cta">
                   {[...Array(5)].map((_, i) => <Star key={i} size={18} className="fill-current" />)}
                 </div>
                 <span className="text-slate-400 font-bold ml-2">(48 Customer Reviews)</span>
              </div>
              <p className="text-3xl font-display font-black text-secondary">
                J${product.price.toLocaleString()}
              </p>
            </div>

            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              {product.description}
            </p>

            {/* Config & Add to Cart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex items-center bg-slate-100 rounded-xl overflow-hidden self-stretch sm:self-auto">
                   <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-6 py-4 hover:bg-slate-200 transition-colors text-xl font-bold"
                   >
                     -
                   </button>
                   <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                   <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-6 py-4 hover:bg-slate-200 transition-colors text-xl font-bold"
                   >
                     +
                   </button>
                </div>
                <button 
                  onClick={() => addToCart(product, quantity)}
                  className="btn-primary flex-1 py-4 text-lg self-stretch sm:self-auto whitespace-nowrap"
                >
                  <ShoppingCart size={24} />
                  Add to Cart
                </button>
              </div>
              
              <button 
                onClick={() => window.open(`https://wa.me/18766303350?text=Interested in ${product.name}`, '_blank')}
                className="w-full mt-4 flex items-center justify-center gap-2 text-green-600 font-bold py-3 rounded-xl border-2 border-green-50 hover:bg-green-50 transition-all font-display uppercase tracking-widest text-xs"
              >
                <MessageSquare size={18} />
                WhatsApp Inquiry
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
               <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-50">
                  <ShieldCheck className="text-primary" size={24} />
                  <span className="text-sm font-bold text-secondary">2-Year Warranty</span>
               </div>
               <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-50">
                  <Truck className="text-primary" size={24} />
                  <span className="text-sm font-bold text-secondary">Islandwide Delivery</span>
               </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-6 flex gap-8">
              {(['desc', 'specs', 'warranty'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
                    activeTab === tab ? "text-primary" : "text-slate-400 hover:text-secondary"
                  )}
                >
                  {tab === 'desc' ? 'Description' : tab === 'specs' ? 'Specifications' : 'Warranty'}
                  {activeTab === tab && (
                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="min-h-[150px]">
              {activeTab === 'desc' && (
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-500 leading-relaxed">
                    This premium {product.name} is engineered for maximum durability and efficiency. Tested rigorously in the Jamaican climate, it offers superior performance compared to standard residential grade alternatives.
                  </p>
                  <ul className="mt-4 space-y-2 text-slate-600 text-sm">
                    <li>• Tropicalized design for coastal heat resistance</li>
                    <li>• High efficiency ratings for optimal cost savings</li>
                    <li>• Easy installation and low maintenance requirements</li>
                  </ul>
                </div>
              )}
              {activeTab === 'specs' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3">
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-slate-100 text-sm">
                      <span className="font-bold text-slate-400 uppercase tracking-tighter">{key}</span>
                      <span className="font-bold text-secondary">{val}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'warranty' && (
                <p className="text-slate-500 text-sm leading-relaxed">
                  Samkhi Limited provides a standard 2-year manufacturer warranty on all electrical components. Solar panels carry a 25-year performance warranty. Our local support team is available for any technical troubleshooting needs.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Related Products */}
        <section className="mt-24">
           <h2 className="text-3xl font-display font-black text-secondary mb-10">Frequently Bought Together</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
             {relatedProducts.map(p => (
               <RelatedProductCard key={p.id} product={p} />
             ))}
           </div>
        </section>
      </div>
    </div>
  );
}

const RelatedProductCard: React.FC<{ product: any }> = ({ product }) => {
  return (
    <Link to={`/product/${product.id}`} className="group block bg-white p-4 rounded-2xl border border-slate-100 hover:shadow-xl transition-all">
       <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-slate-50">
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
       </div>
       <h3 className="font-bold text-secondary group-hover:text-primary transition-colors truncate">{product.name}</h3>
       <p className="text-primary font-black text-sm mt-1">J${product.price.toLocaleString()}</p>
    </Link>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
