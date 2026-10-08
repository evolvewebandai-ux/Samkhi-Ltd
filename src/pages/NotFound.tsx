import React from 'react';
import { motion } from 'motion/react';
import { Sun, ArrowLeft, Lightbulb, HelpCircle, PhoneCall } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="bg-slate-900 text-white min-h-screen pt-32 pb-24 flex items-center justify-center relative overflow-hidden font-sans">
      {/* Decorative sun-glow elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-xl w-full mx-auto px-6 text-center relative z-10 space-y-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="inline-flex relative"
        >
          {/* Main icon layout */}
          <div className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Sun size={48} className="animate-spin-slow" />
          </div>
          {/* Absolute decorative lightbulb */}
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Lightbulb size={14} />
          </div>
        </motion.div>

        <div className="space-y-3">
          <p className="text-xs font-black tracking-widest text-amber-400 uppercase">Error Code: 404</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Off-Grid Location
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto font-medium">
            The page you are looking for does not exist on our map. Let's redirect your connection and power up your navigation.
          </p>
        </div>

        {/* Dynamic navigational links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto pt-4">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-5 py-3 border border-white/10 hover:bg-white/5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>
          <Link
            to="/shop"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-[#34d399] text-[#121212] text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            Browse Products
          </Link>
        </div>

        {/* Bottom micro-support channels */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-center items-center gap-6 text-xs text-slate-500 font-bold">
          <Link to="/faq" className="hover:text-white transition-colors flex items-center gap-1.5">
            <HelpCircle size={14} />
            Search FAQs
          </Link>
          <span className="hidden sm:inline text-slate-700">|</span>
          <Link to="/contact" className="hover:text-white transition-colors flex items-center gap-1.5">
            <PhoneCall size={14} />
            Contact Support Office
          </Link>
        </div>
      </div>
    </div>
  );
}
