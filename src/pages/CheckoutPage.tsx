import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { ShieldCheck, Lock, CreditCard, Landmark, Truck, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export default function CheckoutPage() {
  const { totalPrice, clearCart } = useCart();
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');

  const gct = totalPrice * 0.15;
  const delivery = 2500;
  const total = totalPrice + gct + delivery;

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
    setTimeout(() => clearCart(), 100);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white p-12 rounded-[2.5rem] shadow-2xl text-center border border-slate-100"
        >
          <div className="w-24 h-24 bg-green-100 text-primary rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="text-3xl font-display font-black text-secondary mb-4">Order Confirmed!</h1>
          <p className="text-slate-500 mb-8">Your order #SK-8294 has been placed successfully. We've sent a confirmation email to your inbox.</p>
          <div className="bg-surface p-6 rounded-2xl mb-10 text-left">
             <div className="flex justify-between text-sm font-bold mb-2">
               <span className="text-slate-400">Status</span>
               <span className="text-primary uppercase tracking-widest">Processing</span>
             </div>
             <div className="flex justify-between text-sm font-bold">
               <span className="text-slate-400">Est. Delivery</span>
               <span className="text-secondary">2-3 Business Days</span>
             </div>
          </div>
          <Link to="/" className="btn-primary w-full py-4 text-lg">Return to Home</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-12">
           <Lock size={24} className="text-primary" />
           <h1 className="text-4xl font-display font-black text-secondary">Secure Checkout</h1>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Form */}
          <div className="lg:col-span-7 space-y-8">
            <section className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h2 className="text-2xl font-display font-black text-secondary mb-8 flex items-center gap-4">
                <span className="w-10 h-10 bg-secondary text-white rounded-2xl flex items-center justify-center text-sm font-bold">1</span>
                Contact Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-2 flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Email Address</label>
                  <input type="email" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium placeholder:text-slate-400" placeholder="customer@email.com" />
                </div>
                <div className="space-y-2 flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Phone Number</label>
                  <input type="tel" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium placeholder:text-slate-400" placeholder="(876) 000-0000" />
                </div>
              </div>
            </section>

            <section className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h2 className="text-2xl font-display font-black text-secondary mb-8 flex items-center gap-4">
                <span className="w-10 h-10 bg-secondary text-white rounded-2xl flex items-center justify-center text-sm font-bold">2</span>
                Shipping Address
              </h2>
              <div className="space-y-6 md:space-y-8">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Full Name</label>
                  <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium placeholder:text-slate-400" placeholder="John Doe" />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Street Address</label>
                  <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium placeholder:text-slate-400" placeholder="123 Main Street, Ocho Rios" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">City / Town</label>
                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium placeholder:text-slate-400" placeholder="Ocho Rios" />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Parish</label>
                    <div className="relative">
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium appearance-none cursor-pointer">
                        <option>St. Ann</option>
                        <option>Kingston</option>
                        <option>St. Catherine</option>
                        <option>St. James</option>
                        <option>Manchester</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h2 className="text-2xl font-display font-black text-secondary mb-8 flex items-center gap-4">
                <span className="w-10 h-10 bg-secondary text-white rounded-2xl flex items-center justify-center text-sm font-bold">3</span>
                Payment Method
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <button 
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left",
                    paymentMethod === 'card' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                  )}
                 >
                    <div className={cn("p-3 rounded-xl", paymentMethod === 'card' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-secondary">Credit / Debit Card</p>
                      <p className="text-xs text-slate-400">Visa, Mastercard, KeyCard</p>
                    </div>
                 </button>
                 <button 
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left",
                    paymentMethod === 'transfer' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                  )}
                 >
                    <div className={cn("p-3 rounded-xl", paymentMethod === 'transfer' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                      <Landmark size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-secondary">Bank Transfer</p>
                      <p className="text-xs text-slate-400">NCB, Scotiabank, Sagicor</p>
                    </div>
                 </button>
              </div>
            </section>
          </div>

          {/* Checkout Breakdown */}
          <div className="lg:col-span-5">
             <div className="bg-secondary rounded-[2.5rem] p-10 text-white sticky top-24 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                <h3 className="text-2xl font-display font-bold mb-8 flex items-center justify-between">
                  Order Summary
                  <span className="text-xs font-black uppercase text-cta tracking-widest px-3 py-1 bg-white/10 rounded-full">Secure</span>
                </h3>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-slate-400 font-medium">
                    <span>Subtotal</span>
                    <span>J${totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 font-medium">
                    <span>GCT (15%)</span>
                    <span>J${gct.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 font-medium">
                    <span>Shipping</span>
                    <span>J${delivery.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6 mb-10">
                   <div className="flex justify-between items-end">
                     <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Total Charged</span>
                     <span className="text-4xl font-display font-black text-white">J${total.toLocaleString()}</span>
                   </div>
                </div>

                <button type="submit" className="btn-cta w-full py-5 text-xl mb-8 group">
                   Complete Order
                   <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                    <ShieldCheck size={18} className="text-primary-accent" />
                    256-BIT ENCRYPTION ACTIVE
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                    <Truck size={18} className="text-primary-accent" />
                    DELIVERS IN 48-72 HOURS
                  </div>
                </div>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
