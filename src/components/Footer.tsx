import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, Phone, MapPin, Send, ShieldCheck, Truck, Clock, CheckCircle2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);

    try {
      const id = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const leadData = {
        id,
        name: email.split('@')[0],
        email: email.trim(),
        phone: '',
        subject: 'Newsletter Subscription',
        message: 'Subscribed to energy tips and special offers via website footer.',
        source: 'newsletter-subscription',
        stage: 'new',
        createdAt: new Date().toISOString(),
        notes: ''
      };

      await setDoc(doc(db, 'leads', id), leadData);
      setSubscribed(true);
      setEmail('');
    } catch (err) {
      console.error("Error subscribing newsletter lead:", err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'leads');
      } catch (e) {
        // Fallback
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-secondary text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Newsletter Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pb-16 border-b border-white/10 mb-16">
          <div>
            <h2 className="text-3xl font-display font-bold mb-2">Join our Energy-Saving Community</h2>
            <p className="text-slate-300">Subscribe to get special offers, energy saving tips, and solar technology updates.</p>
          </div>
          {subscribed ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3 text-emerald-400">
              <CheckCircle2 size={24} className="shrink-0" />
              <div>
                <p className="font-bold text-sm text-white">Subscribed Successfully!</p>
                <p className="text-xs text-emerald-300">Thank you for joining our energy community.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-black" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email address" 
                  className="w-full bg-white text-black placeholder:text-slate-500 border border-slate-200 rounded-lg py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-cta transition-colors font-medium"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={submitting}
                className="btn-cta px-6 flex items-center gap-2 shrink-0 disabled:opacity-75"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="hidden sm:inline">Subscribe</span>
                    <Send size={18} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="lg:pr-8">
            <Link to="/" className="flex items-center gap-2 mb-8 group transition-transform hover:scale-[1.02]">
              <img 
                src="https://lh3.googleusercontent.com/d/1y5j5nsQpvc5Rgdo2OP_ZN6K9sAqMg3Uw" 
                alt="Samkhi Ltd." 
                className="h-16 w-auto object-contain brightness-0 invert" 
                referrerPolicy="no-referrer"
              />
            </Link>
            <p className="text-slate-400 mb-8 leading-relaxed text-sm">
              Jamaica's premier provider of LED lighting and solar energy solutions. We empower homes and businesses with sustainable, cost-effective energy.
            </p>
            <div className="flex gap-4">
              <a href="https://facebook.com/samkhiltd" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-primary hover:border-primary hover:scale-110 transition-all duration-300">
                <Facebook size={18} />
              </a>
              <a href="https://instagram.com/samkhiltd" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-primary hover:border-primary hover:scale-110 transition-all duration-300" aria-label="Instagram">
                <Instagram size={18} />
              </a>
              <a href="https://www.tiktok.com/@samkhiltd" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-primary hover:border-primary hover:scale-110 transition-all duration-300" aria-label="TikTok">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68 6.34 6.34 0 0 0 9.34 22a6.34 6.34 0 0 0 6.34-6.34V9.05a8.16 8.16 0 0 0 4.77 1.52A8.34 8.34 0 0 0 21 10.46V7.01a4.85 4.85 0 0 1-1.41-.32z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-lg mb-6 border-l-4 border-cta pl-3">Quick Links</h4>
            <ul className="flex flex-col gap-4 text-slate-400">
              <li><Link to="/shop" className="hover:text-cta transition-colors">Shop All Products</Link></li>
              <li><Link to="/solar" className="hover:text-cta transition-colors">Solar Solutions</Link></li>
              <li><Link to="/commercial" className="hover:text-cta transition-colors">Commercial Services</Link></li>
              <li><Link to="/about" className="hover:text-cta transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-cta transition-colors">Contact Support</Link></li>
              <li className="pt-2 mt-2 border-t border-white/10">
                <Link to="/admin" className="text-slate-500 hover:text-white text-xs uppercase tracking-widest font-bold transition-colors flex items-center gap-2">
                  <ShieldCheck size={14} />
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="font-bold text-lg mb-6 border-l-4 border-cta pl-3">Support & Info</h4>
            <ul className="flex flex-col gap-4 text-slate-400">
              <li><Link to="/warranty" className="hover:text-cta transition-colors">Warranty Information</Link></li>
              <li><Link to="/delivery" className="hover:text-cta transition-colors">Delivery & Pickup</Link></li>
              <li><Link to="/returns" className="hover:text-cta transition-colors">Returns & Exchanges</Link></li>
              <li><Link to="/faq" className="hover:text-cta transition-colors">Frequently Asked Questions</Link></li>
              <li><Link to="/privacy" className="hover:text-cta transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-cta transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-lg mb-6 border-l-4 border-cta pl-3">Contact Us</h4>
            <ul className="flex flex-col gap-4 text-slate-400">
              <li className="flex gap-3">
                <MapPin className="text-cta shrink-0" size={20} />
                <div className="text-xs">
                  <p className="font-bold text-white mb-0.5">Ocho Rios Showroom</p>
                  <p>Shop C1, New Pineapple Shopping Centre</p>
                  <p className="mt-2 font-bold text-white mb-0.5">Drax Hall Branch</p>
                  <p>Unit 8, 14 Drax Business Center</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Phone className="text-cta shrink-0" size={20} />
                <div className="text-xs">
                  <p>(876) 630-3350 / (876) 972-1952</p>
                  <p>(876) 630-3231 (Drax Hall)</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Mail className="text-cta shrink-0" size={20} />
                <div className="text-xs">
                  <p>samkhi.ochorios@gmail.com</p>
                  <p>orders.samkhi@gmail.com</p>
                </div>
              </li>
              <li className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs font-bold uppercase text-slate-500 mb-2">Opening Hours</p>
                <div className="text-sm">
                  <p>Mon - Fri: 8:30 AM - 5:00 PM</p>
                  <p>Sat: 9:00 AM - 3:00 PM</p>
                  <p>Sun: Closed</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Samkhi Limited. All rights reserved. | Designed by{' '}
            <a 
              href="https://evolvemarketingandmedia.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors underline decoration-slate-600 underline-offset-2 font-medium"
            >
              Evolve Marketing &amp; Media
            </a>
          </p>
          <div className="flex gap-6 items-center">
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest">
              <ShieldCheck size={16} className="text-primary" />
              Secure Checkout
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest">
              <Truck size={16} className="text-primary" />
              Islandwide Delivery
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest">
              <Clock size={16} className="text-primary" />
              Trusted Service
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
