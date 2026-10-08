import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, X, Phone, Mail, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const { totalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  // Close search on escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    if (isSearchOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(navSearchQuery.trim())}`);
      setIsSearchOpen(false);
      setNavSearchQuery('');
    }
  };

  const handleQuickSearch = (term: string) => {
    navigate(`/shop?q=${encodeURIComponent(term)}`);
    setIsSearchOpen(false);
    setNavSearchQuery('');
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Shop', href: '/shop' },
    { name: 'Solar Solutions', href: '/solar' },
    { name: 'Commercial', href: '/commercial' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <>
      {/* Top Bar */}
      <div className="bg-secondary text-white py-2 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs font-medium uppercase tracking-wider">
          <div className="flex gap-6">
            <span className="flex items-center gap-1.5"><Phone size={14} className="text-cta" /> (876) 630-3350</span>
            <span className="flex items-center gap-1.5"><Mail size={14} className="text-cta" /> samkhi.ochorios@gmail.com</span>
            <span className="flex items-center gap-1.5"><MapPin size={14} className="text-cta" /> Ocho Rios, Jamaica</span>
          </div>
          <div className="flex gap-4">
            <Link to="/faq" className="hover:text-cta transition-colors">FAQ</Link>
            <Link to="/warranty" className="hover:text-cta transition-colors">Warranty</Link>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className={cn(
        "sticky top-0 z-50 transition-all duration-500",
        isScrolled 
          ? "bg-white/80 backdrop-blur-xl shadow-enterprise py-3" 
          : "bg-white py-6"
      )}>
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group transition-transform hover:scale-[1.02] active:scale-95">
            <img 
              src="https://lh3.googleusercontent.com/d/1y5j5nsQpvc5Rgdo2OP_ZN6K9sAqMg3Uw" 
              alt="Samkhi Ltd." 
              className={cn(
                "w-auto object-contain transition-all duration-500",
                isScrolled ? "h-[40px] md:h-[48px]" : "h-[48px] md:h-[68px]"
              )} 
              referrerPolicy="no-referrer"
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                to={link.href}
                className={cn(
                  "font-bold text-xs uppercase tracking-[0.15em] transition-all relative py-2 group/nav",
                  location.pathname === link.href ? "text-primary" : "text-secondary hover:text-primary"
                )}
              >
                {link.name}
                <span className={cn(
                  "absolute bottom-0 left-0 h-0.5 bg-cta transition-all duration-300",
                  location.pathname === link.href ? "w-full" : "w-0 group-hover/nav:w-full"
                )} />
              </Link>
            ))}
            <Link 
              to="/solar" 
              className="px-5 py-2.5 bg-[#10B571] hover:bg-[#0da264] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] shadow-sm flex items-center justify-center gap-1.5 ml-2 cursor-pointer select-none"
            >
              Get a Quote
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 lg:gap-4">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="text-secondary hover:text-primary transition-all p-3 rounded-xl hover:bg-slate-50 cursor-pointer"
              aria-label="Open Search"
            >
              <Search size={20} className="stroke-[2.5]" />
            </button>
            <Link to="/account" className="text-secondary hover:text-primary transition-all p-3 rounded-xl hover:bg-slate-50 hidden sm:block">
              <User size={20} className="stroke-[2.5]" />
            </Link>
            <Link to="/cart" className="relative group p-3 rounded-xl hover:bg-slate-50 transition-all">
              <ShoppingCart size={20} className="text-secondary group-hover:text-primary transition-all stroke-[2.5]" />
              {totalItems > 0 && (
                <span className="absolute top-1 right-1 bg-cta text-secondary text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {totalItems}
                </span>
              )}
            </Link>
            <button 
              className="lg:hidden w-10 h-10 flex items-center justify-center text-secondary bg-slate-50 rounded-xl ml-2" 
              onClick={() => setIsOpen(true)}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-white flex flex-col"
          >
            <div className="p-4 flex justify-between items-center border-bottom border-slate-100">
              <span className="font-display font-bold text-xl text-secondary">MENU</span>
              <button onClick={() => setIsOpen(false)} className="p-2 text-secondary">
                <X size={28} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-8 px-6 flex flex-col gap-6">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  to={link.href} 
                  onClick={() => setIsOpen(false)}
                  className="text-2xl font-bold text-secondary active:text-primary"
                >
                  {link.name}
                </Link>
              ))}
              <div className="mt-auto pt-8 border-t border-slate-100 flex flex-col gap-3">
                <Link to="/account" onClick={() => setIsOpen(false)} className="btn-secondary w-full text-center py-2.5">My Account & Orders</Link>
                <Link to="/cart" onClick={() => setIsOpen(false)} className="btn-primary w-full text-center py-2.5">Cart ({totalItems})</Link>
                <Link to="/solar" onClick={() => setIsOpen(false)} className="btn-cta w-full text-center py-2.5">Get A Quote</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Search Modal Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-secondary/80 backdrop-blur-md z-[100] flex items-start justify-center pt-24 px-4"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -50, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -50, scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSearchSubmit} className="p-6 border-b border-slate-100 flex items-center gap-4">
                <Search size={22} className="text-slate-400 stroke-[2.5]" />
                <input
                  type="text"
                  placeholder="Search by name, SKU, or keyword..."
                  value={navSearchQuery}
                  onChange={(e) => setNavSearchQuery(e.target.value)}
                  className="flex-1 text-slate-800 text-lg outline-none placeholder-slate-400 font-medium bg-transparent"
                  autoFocus
                />
                {navSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setNavSearchQuery('')}
                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-secondary transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!navSearchQuery.trim()}
                  className="px-5 py-2.5 bg-[#10B571] hover:bg-[#0da264] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Search
                </button>
              </form>

              <div className="p-6 bg-slate-50/50">
                <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-3 font-mono">Popular Searches</h4>
                <div className="flex flex-wrap gap-2">
                  {['Solar Panel', 'Inverter', 'LED Bulb', 'Battery', 'Street Light', 'Flood Light'].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleQuickSearch(term)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#10B571] hover:text-[#10B571] rounded-lg text-xs font-bold text-slate-600 transition-all shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
