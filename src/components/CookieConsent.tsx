import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Info, X, Check, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // always enabled
    analytics: true,
    marketing: false
  });

  useEffect(() => {
    // Check if user has already made a preference selection
    const consent = localStorage.getItem('samkhi_cookie_consent');
    if (!consent) {
      // Show consent banner after a short aesthetic delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const consentVal = {
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('samkhi_cookie_consent', JSON.stringify(consentVal));
    setIsVisible(false);
  };

  const handleDeclineAll = () => {
    const consentVal = {
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('samkhi_cookie_consent', JSON.stringify(consentVal));
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    const consentVal = {
      ...preferences,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('samkhi_cookie_consent', JSON.stringify(consentVal));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-0 left-0 right-0 z-[1000] p-4 md:p-6 bg-transparent pointer-events-none">
        <motion.div
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="max-w-4xl mx-auto bg-[#1a1a1a] text-white border border-white/10 rounded-2xl md:rounded-[2rem] p-6 md:p-8 shadow-2xl pointer-events-auto flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative overflow-hidden"
        >
          {/* Blur background ornament */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none" />
          
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck size={18} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Cookie & Content Compliance</span>
            </div>
            
            <h3 className="text-base font-bold text-white tracking-tight">Protecting Your Privacy in Jamaica</h3>
            
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl font-medium">
              We use secure cookies to optimize storefront speeds, validate promotional discount coupons, analyze server loads, and tailor clean marketing profiles. By click <span className="text-white font-bold">"Accept All"</span>, you consent to our secure telemetry as specified in our{' '}
              <Link to="/privacy" className="text-emerald-400 underline hover:text-emerald-300 font-bold">Privacy Policy</Link> and{' '}
              <Link to="/terms" className="text-emerald-400 underline hover:text-emerald-300 font-bold">Terms of Service</Link>.
            </p>

            {/* Collapsible Cookie Preferences Panel */}
            {showPreferences && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="pt-4 border-t border-white/10 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                {/* Essential option */}
                <div className="bg-white/5 border border-white/5 p-3.5 rounded-xl flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-white">Essential Cookies</span>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded uppercase">Enabled</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Required for secure order sessions, basket caching, and user logins.</p>
                </div>

                {/* Analytical option */}
                <div 
                  onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                  className="bg-white/5 border border-white/5 hover:bg-white/10 p-3.5 rounded-xl flex flex-col justify-between cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-white">Metrics / Telemetry</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${preferences.analytics ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-405 bg-white/10'}`}>
                      {preferences.analytics ? 'On' : 'Off'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium font-medium">Gathers anonymous diagnostic page telemetry, error monitoring, and session metrics.</p>
                </div>

                {/* Marketing option */}
                <div 
                  onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                  className="bg-white/5 border border-white/5 hover:bg-white/10 p-3.5 rounded-xl flex flex-col justify-between cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-white">Marketing Tracking</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${preferences.marketing ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-405 bg-white/10'}`}>
                      {preferences.marketing ? 'On' : 'Off'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium font-medium">Allows personalized advertisement profiles, smart lookup features, and live assistance loops.</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-2 shrink-0 w-full md:w-auto mt-4 md:mt-0 justify-end">
            {!showPreferences ? (
              <>
                <button
                  onClick={() => setShowPreferences(true)}
                  className="px-4 py-2 text-xs bg-white/10 hover:bg-white/15 text-white font-bold rounded-lg transition-all active:scale-95 text-center cursor-pointer"
                >
                  Configure
                </button>
                <button
                  onClick={handleDeclineAll}
                  className="px-4 py-2 text-xs border border-white/10 hover:bg-white/5 text-slate-300 font-bold rounded-lg transition-all active:scale-95 text-center cursor-pointer"
                >
                  Decline Non-Essential
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-5 py-2 text-xs bg-emerald-500 hover:bg-emerald-400 text-[#1a1a1a] font-black rounded-lg transition-all active:scale-95 text-center flex items-center justify-center gap-1 cursor-pointer shadow-lg shadow-emerald-500/20 animate-pulse hover:animate-none"
                >
                  <Check size={14} strokeWidth={3} />
                  Accept All
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="px-4 py-2 text-xs border border-white/10 hover:bg-white/5 text-slate-300 font-bold rounded-lg transition-all active:scale-95 text-center cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="px-5 py-2 text-xs bg-emerald-500 hover:bg-[#34d399] text-[#1a1a1a] font-black rounded-lg transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                >
                  Save Choices
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
