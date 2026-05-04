import { useCart } from '../context/CartContext';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ArrowLeft, ShieldCheck, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, totalPrice, totalItems } = useCart();

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-8">
          <ShoppingCart size={48} />
        </div>
        <h2 className="text-3xl font-display font-bold text-secondary mb-4 text-center">Your cart is currently empty</h2>
        <p className="text-slate-500 mb-10 max-w-sm text-center">Looks like you haven't added anything to your cart yet. Browse our professional energy solutions to get started.</p>
        <Link to="/shop" className="btn-primary px-10 py-4">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-display font-black text-secondary mb-12">Shopping Basket <span className="text-primary text-xl">({totalItems} items)</span></h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6"
                >
                  <Link to={`/product/${item.id}`} className="w-32 h-32 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </Link>

                  <div className="flex-1 text-center md:text-left">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{item.category.replace('-', ' ')}</span>
                    <Link to={`/product/${item.id}`} className="block mt-1">
                      <h3 className="text-xl font-bold text-secondary hover:text-primary transition-colors">{item.name}</h3>
                    </Link>
                    <p className="text-slate-400 text-sm mt-1">Ref: {item.id.toUpperCase()}</p>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center bg-slate-50 rounded-lg border border-slate-100">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2 hover:text-primary transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2 hover:text-primary transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors mt-1"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-400 uppercase mb-1">Subtotal</p>
                    <p className="text-xl font-display font-black text-secondary">
                      J${(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <Link to="/shop" className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all mt-6 p-4">
               <ArrowLeft size={20} />
               Continue Shopping
            </Link>
          </div>

          {/* Summary */}
          <aside className="sticky top-24">
            <div className="bg-secondary rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
               <h3 className="text-2xl font-display font-bold mb-8 border-b border-white/10 pb-4">Order Summary</h3>
               
               <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>Subtotal</span>
                    <span>J${totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>Delivery Estimate</span>
                    <span className="text-primary-accent">J$2,500</span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>Tax (GCT 15%)</span>
                    <span>J${(totalPrice * 0.15).toLocaleString()}</span>
                  </div>
               </div>

               <div className="border-t border-white/10 pt-6 mb-10">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold uppercase tracking-widest">Total Pay</span>
                    <span className="text-4xl font-display font-black text-cta">J${(totalPrice * 1.15 + 2500).toLocaleString()}</span>
                  </div>
               </div>

               <Link to="/checkout" className="btn-cta w-full py-5 text-xl">
                  Checkout Now
                  <ArrowRight size={24} />
               </Link>

               <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-400 px-2">
                    <ShieldCheck size={18} className="text-cta" />
                    SECURE SSL TRANSACTION
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-400 px-2 text-primary-accent">
                    <Truck size={18} />
                    ISLANDWIDE SHIPPING AVAILABLE
                  </div>
               </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
