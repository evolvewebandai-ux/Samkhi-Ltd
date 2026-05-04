import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { QuoteFormState } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const PARISHES = [
  'St. Ann', 'St. James', 'Kingston & St. Andrew', 'St. Catherine', 'Clarendon', 
  'Manchester', 'St. Elizabeth', 'Westmoreland', 'Hanover', 'Trelawny', 
  'St. Mary', 'Portland', 'St. Thomas'
];

export default function SolarQuoteForm({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState<QuoteFormState>({
    name: '',
    phone: '',
    email: '',
    parish: 'St. Ann',
    monthlyBill: '',
    propertyType: 'Residential',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    // Simulate API call
    setTimeout(() => {
      setStatus('success');
      setFormData({
        name: '',
        phone: '',
        email: '',
        parish: 'St. Ann',
        monthlyBill: '',
        propertyType: 'Residential',
        message: ''
      });
    }, 1500);
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-medium placeholder:text-slate-400";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2";

  return (
    <div className={cn("bg-white rounded-[2.5rem] shadow-enterprise overflow-hidden border border-slate-100", compact ? "" : "p-8 md:p-20 flex flex-col items-center")}>
      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-12 md:py-20"
          >
            <div className="w-24 h-24 bg-green-50 text-green-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner shadow-green-200/50 transform rotate-3">
              <CheckCircle2 size={48} className="stroke-[2.5]" />
            </div>
            <h3 className="text-3xl font-display font-black text-secondary mb-4 leading-tight">Quote Request Received!</h3>
            <p className="text-slate-500 max-w-sm mb-10 text-lg leading-relaxed">
              Thank you for choosing Samkhi Limited. Our energy specialists will review your details and contact you within 24 hours.
            </p>
            <button 
              onClick={() => setStatus('idle')}
              className="px-10 py-4 bg-secondary text-white font-black uppercase tracking-widest rounded-2xl hover:bg-primary transition-all shadow-lg active:scale-95"
            >
              Start New Request
            </button>
          </motion.div>
        ) : (
          <motion.form 
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleSubmit} 
            className={cn("w-full", compact ? "space-y-6" : "space-y-8 max-w-3xl")}
          >
            {!compact && (
              <div className="mb-14 text-center">
                <span className="inline-block px-4 py-1.5 bg-cta/10 text-secondary font-black text-[10px] uppercase tracking-[0.2em] rounded-full mb-4">Personalized Analysis</span>
                <h3 className="text-4xl md:text-5xl font-display font-black text-secondary mb-6 tracking-tight">Request Your Solar Assessment</h3>
                <p className="text-slate-500 text-lg md:text-xl max-w-xl mx-auto leading-relaxed">Professional engineering tailored to your specific energy profile and consumption patterns.</p>
              </div>
            )}

            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8", compact ? "space-y-0" : "space-y-0")}>
              <div className="space-y-1">
                <label className={labelClass}>Full Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className={inputClass} 
                  required 
                  placeholder="Michael Chen"
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Phone Number</label>
                <input 
                  type="tel" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className={inputClass} 
                  required 
                  placeholder="+1 (876) 000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-1">
                <label className={labelClass}>Email Address</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className={inputClass} 
                  required 
                  placeholder="m.chen@company.com"
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Parish</label>
                <div className="relative">
                  <select 
                    value={formData.parish} 
                    onChange={e => setFormData({...formData, parish: e.target.value})}
                    className={cn(inputClass, "appearance-none cursor-pointer")}
                  >
                    {PARISHES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-1">
                <label className={labelClass}>Avg. Monthly Bill (J$)</label>
                <input 
                  type="text" 
                  value={formData.monthlyBill} 
                  onChange={e => setFormData({...formData, monthlyBill: e.target.value})}
                  className={inputClass} 
                  placeholder="25,000"
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Property Type</label>
                <div className="flex bg-slate-50 p-1.5 rounded-[1.5rem] border border-slate-200">
                  {(['Residential', 'Commercial'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({...formData, propertyType: type})}
                      className={cn(
                        "flex-1 py-3 md:py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                        formData.propertyType === type 
                          ? "bg-white text-secondary shadow-sm ring-1 ring-slate-100" 
                          : "text-slate-400 hover:text-secondary"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Project Details</label>
              <textarea 
                rows={compact ? 3 : 5}
                value={formData.message} 
                onChange={e => setFormData({...formData, message: e.target.value})}
                className={cn(inputClass, "resize-none")} 
                placeholder="Tell us about your energy goals and any specific requirements..."
              ></textarea>
            </div>

            <button 
              type="submit" 
              disabled={status === 'submitting'}
              className="btn-cta w-full py-5 md:py-6 text-lg md:text-xl tracking-[0.2em] group"
            >
              {status === 'submitting' ? (
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  Request Solar Quote
                  <Send size={24} className="group-hover:translate-x-2 transition-transform stroke-[2.5]" />
                </div>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
