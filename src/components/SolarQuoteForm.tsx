import React, { useState } from 'react';
import { Send, CheckCircle2, ArrowRight, ArrowLeft, Home, Building2, Shield, Sparkles, Check } from 'lucide-react';
import { QuoteFormState } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const PARISHES = [
  'St. Ann', 'St. James', 'Kingston & St. Andrew', 'St. Catherine', 'Clarendon', 
  'Manchester', 'St. Elizabeth', 'Westmoreland', 'Hanover', 'Trelawny', 
  'St. Mary', 'Portland', 'St. Thomas'
];

const BILL_PRESETS = [
  'Under J$25,000',
  'J$25,000 - J$60,000',
  'J$60,000 - J$120,000',
  'Over J$120,000'
];

export default function SolarQuoteForm({ compact = false, source }: { compact?: boolean; source?: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);

  const [formData, setFormData] = useState<QuoteFormState>({
    name: '',
    phone: '',
    email: '',
    parish: 'St. Ann',
    monthlyBill: '',
    propertyType: 'Residential',
    message: ''
  });

  const handleNextStep = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);

    if (!formData.monthlyBill.trim()) {
      setValidationError('Please select or enter your estimated monthly electricity bill.');
      return;
    }

    setStep(2);
  };

  const handlePrevStep = () => {
    setValidationError(null);
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim()) {
      setValidationError('Please complete all contact details to request your free assessment.');
      return;
    }

    setStatus('submitting');
    
    try {
      const id = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const leadSource = source || (compact ? 'scaler-savings-today' : 'solar-solutions');
      const leadData = {
        id,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        parish: formData.parish,
        monthlyBill: formData.monthlyBill.trim(),
        propertyType: formData.propertyType,
        message: 'Details to be discussed during discovery call.',
        source: leadSource,
        stage: 'new',
        createdAt: new Date().toISOString(),
        notes: ''
      };

      await setDoc(doc(db, 'leads', id), leadData);
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
      setStep(1);
    } catch (err) {
      console.error("Error saving solar quote lead:", err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'leads');
      } catch (wrapperErr) {
        setStatus('error');
      }
    }
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-4.5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium placeholder:text-slate-400 text-secondary text-sm md:text-base";
  const labelClass = "text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1 block mb-2";

  return (
    <div className={cn("bg-white rounded-[2.5rem] shadow-enterprise overflow-hidden border border-slate-100", compact ? "p-6 md:p-8" : "p-6 sm:p-10 md:p-14 flex flex-col items-center")}>
      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center text-center py-10 md:py-16"
          >
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner shadow-emerald-200/50 transform rotate-3">
              <CheckCircle2 size={44} className="stroke-[2.5]" />
            </div>
            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase tracking-[0.2em] rounded-full mb-3">
              Assessment Requested
            </span>
            <h3 className="text-3xl font-display font-black text-secondary mb-3 leading-tight">You're All Set!</h3>
            <p className="text-slate-500 max-w-md mb-8 text-base leading-relaxed">
              Thank you for requesting a solar assessment. A Samkhi Limited energy consultant will review your energy profile and reach out within 24 hours for your free discovery call.
            </p>
            <button 
              onClick={() => { setStatus('idle'); setStep(1); }}
              className="px-8 py-3.5 bg-secondary text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-primary transition-all shadow-md active:scale-95"
            >
              Submit Another Request
            </button>
          </motion.div>
        ) : (
          <div className={cn("w-full", compact ? "" : "max-w-2xl")}>
            {/* Header & Step Indicator */}
            <div className="mb-8">
              {!compact && (
                <div className="text-center mb-6">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-cta/15 text-secondary font-black text-[10px] uppercase tracking-[0.2em] rounded-full mb-3">
                    <Sparkles size={12} className="text-cta" /> Free System Sizing
                  </span>
                  <h3 className="text-3xl md:text-4xl font-display font-black text-secondary tracking-tight">
                    Get Your Solar Assessment
                  </h3>
                </div>
              )}

              {/* Progress Bar Container */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className={cn("flex items-center gap-2", step === 1 ? "text-primary font-extrabold" : "text-slate-400")}>
                    <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black", step === 1 ? "bg-primary text-white" : "bg-emerald-100 text-emerald-700")}>
                      {step > 1 ? <Check size={12} className="stroke-[3]" /> : '1'}
                    </span>
                    1. System Needs
                  </span>
                  <span className={cn("flex items-center gap-2", step === 2 ? "text-primary font-extrabold" : "text-slate-400")}>
                    <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black", step === 2 ? "bg-primary text-white" : "bg-slate-200 text-slate-500")}>
                      2
                    </span>
                    2. Contact Details
                  </span>
                </div>

                {/* Animated Line Bar */}
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    initial={{ width: step === 1 ? '50%' : '100%' }}
                    animate={{ width: step === 1 ? '50%' : '100%' }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  />
                </div>
              </div>
            </div>

            {/* Form Validation Banner */}
            {validationError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                {validationError}
              </div>
            )}

            {/* STEP 1: Energy & Property Profile */}
            {step === 1 && (
              <motion.form 
                key="step1"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                onSubmit={handleNextStep}
                className="space-y-6"
              >
                {/* Property Type Selection */}
                <div className="space-y-2">
                  <label className={labelClass}>Select Property Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { type: 'Residential', label: 'Residential', desc: 'Homes & Villas', icon: Home },
                      { type: 'Commercial', label: 'Commercial', desc: 'Businesses & Offices', icon: Building2 }
                    ].map(item => {
                      const IconComp = item.icon;
                      const isSelected = formData.propertyType === item.type;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setFormData({...formData, propertyType: item.type as any})}
                          className={cn(
                            "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between relative group",
                            isSelected 
                              ? "bg-primary/5 border-primary ring-2 ring-primary/20 text-secondary" 
                              : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className={cn("p-2 rounded-xl transition-colors", isSelected ? "bg-primary text-white" : "bg-white text-slate-400 group-hover:text-secondary")}>
                              <IconComp size={20} />
                            </div>
                            <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-all", isSelected ? "border-primary bg-primary" : "border-slate-300")}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          <div>
                            <span className="font-extrabold text-sm block">{item.label}</span>
                            <span className="text-[11px] text-slate-400 font-medium">{item.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Estimated Monthly Bill */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Estimated Monthly Electricity Bill (J$)</label>
                    <span className="text-[10px] text-slate-400 font-semibold">Select range or enter amount</span>
                  </div>
                  
                  {/* Preset Quick Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    {BILL_PRESETS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormData({...formData, monthlyBill: preset})}
                        className={cn(
                          "py-2 px-3 rounded-xl text-xs font-bold transition-all border",
                          formData.monthlyBill === preset
                            ? "bg-secondary text-white border-secondary shadow-sm"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <input 
                    type="text" 
                    value={formData.monthlyBill} 
                    onChange={e => setFormData({...formData, monthlyBill: e.target.value})}
                    className={inputClass} 
                    placeholder="Or type exact bill e.g. J$ 45,000"
                    required
                  />
                </div>

                {/* Parish Selector */}
                <div className="space-y-1">
                  <label className={labelClass}>Parish / Location</label>
                  <div className="relative">
                    <select 
                      value={formData.parish} 
                      onChange={e => setFormData({...formData, parish: e.target.value})}
                      className={cn(inputClass, "appearance-none cursor-pointer pr-10")}
                    >
                      {PARISHES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                        <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Next Button */}
                <button 
                  type="submit" 
                  className="btn-cta w-full py-4.5 md:py-5 text-base md:text-lg tracking-wider group rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-cta/20"
                >
                  Continue to Final Step
                  <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform stroke-[2.5]" />
                </button>
              </motion.form>
            )}

            {/* STEP 2: Contact Details */}
            {step === 2 && (
              <motion.form 
                key="step2"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                onSubmit={handleSubmit} 
                className="space-y-6"
              >
                <div className="space-y-1">
                  <label className={labelClass}>Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className={inputClass} 
                    required 
                    placeholder="e.g. Michael Chen"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="space-y-1">
                    <label className={labelClass}>Email Address</label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className={inputClass} 
                      required 
                      placeholder="m.chen@example.com"
                    />
                  </div>
                </div>

                {/* Privacy & Fast Discovery Call Notice */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex items-start gap-3">
                  <Shield size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    <strong className="text-secondary font-bold">Fast & Direct Process:</strong> We'll discuss all rooftop, battery, and layout details during your free 15-minute discovery call with our local engineers.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={handlePrevStep}
                    className="px-5 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>

                  <button 
                    type="submit" 
                    disabled={status === 'submitting'}
                    className="btn-cta flex-1 py-4.5 md:py-5 text-base md:text-lg tracking-wider group rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-cta/20"
                  >
                    {status === 'submitting' ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        Submit Request for Free Assessment
                        <Send size={18} className="group-hover:translate-x-1.5 transition-transform stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
