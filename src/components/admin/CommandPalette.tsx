import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Sparkles, 
  FileText, 
  ShoppingCart, 
  Package, 
  Users, 
  Tag, 
  Settings as SettingsIcon, 
  Plus, 
  ChevronRight, 
  Command,
  X,
  CreditCard,
  Truck,
  BarChart3,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useOrders } from '../../context/OrderContext';
import { useProducts } from '../../context/ProductContext';
import { cn } from '../../lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  category: 'Actions' | 'Navigation' | 'Products' | 'Orders';
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  action: () => void;
  shortcut?: string;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { orders } = useOrders();
  const { products } = useProducts();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Handle global keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Build command list based on contexts and query
  const getFilteredCommands = (): CommandItem[] => {
    const defaultCommands: CommandItem[] = [
      // 1. Actions
      {
        id: 'act-add-product',
        category: 'Actions',
        title: 'Add New Product',
        subtitle: 'Inventory Catalog',
        icon: Plus,
        action: () => { navigate('/admin/products/new'); onClose(); },
        shortcut: 'P N'
      },
      {
        id: 'act-create-discount',
        category: 'Actions',
        title: 'Create Discount Code',
        subtitle: 'E-Commerce coupon codes',
        icon: Tag,
        action: () => { navigate('/admin/discounts'); onClose(); },
        shortcut: 'D C'
      },
      {
        id: 'act-add-team-member',
        category: 'Actions',
        title: 'Authorize Team Member',
        subtitle: 'RBAC controls',
        icon: Users,
        action: () => { navigate('/admin/settings'); onClose(); },
        shortcut: 'T M'
      },
      // 2. Navigation
      {
        id: 'nav-dashboard',
        category: 'Navigation',
        title: 'Dashboard Overview',
        subtitle: 'Main metrics ticker & widgets',
        icon: Sparkles,
        action: () => { navigate('/admin'); onClose(); }
      },
      {
        id: 'nav-reports',
        category: 'Navigation',
        title: 'Interactive Reports',
        subtitle: 'Sales & Traffic analytics data',
        icon: FileText,
        action: () => { navigate('/admin/reports'); onClose(); }
      },
      {
        id: 'nav-orders',
        category: 'Navigation',
        title: 'Orders Hub',
        subtitle: 'Manage client transactions & status',
        icon: ShoppingCart,
        action: () => { navigate('/admin/orders'); onClose(); }
      },
      {
        id: 'nav-products',
        category: 'Navigation',
        title: 'Products Center',
        subtitle: 'Manage listings, details & stock',
        icon: Package,
        action: () => { navigate('/admin/products'); onClose(); }
      },
      {
        id: 'nav-inventory',
        category: 'Navigation',
        title: 'Warehouse Inventory',
        subtitle: 'Supplier POs & Stock adjustments',
        icon: Package,
        action: () => { navigate('/admin/inventory'); onClose(); }
      },
      {
        id: 'nav-marketing',
        category: 'Navigation',
        title: 'Marketing Workspace',
        subtitle: 'Vouchers, campaigns & banners',
        icon: Tag,
        action: () => { navigate('/admin/marketing'); onClose(); }
      },
      {
        id: 'nav-shipping',
        category: 'Navigation',
        title: 'Shipping & Fulfillment',
        subtitle: 'Logistics, zones & parishes postage',
        icon: Truck,
        action: () => { navigate('/admin/shipping'); onClose(); }
      },
      {
        id: 'nav-analytics',
        category: 'Navigation',
        title: 'Analytics Insights',
        subtitle: 'In-depth performance reporting',
        icon: BarChart3,
        action: () => { navigate('/admin/reports'); onClose(); }
      },
      {
        id: 'nav-invoices',
        category: 'Navigation',
        title: 'Invoices Listing',
        subtitle: 'GCT Tax invoices & manual generation',
        icon: CreditCard,
        action: () => { navigate('/admin/invoices'); onClose(); }
      },
      {
        id: 'nav-media',
        category: 'Navigation',
        title: 'Media Assets Library',
        subtitle: 'Store images directory management',
        icon: ImageIcon,
        action: () => { navigate('/admin/media'); onClose(); }
      },
      {
        id: 'nav-settings',
        category: 'Navigation',
        title: 'Store Settings',
        subtitle: 'Configure backend preferences',
        icon: SettingsIcon,
        action: () => { navigate('/admin/settings'); onClose(); }
      },
    ];

    // Append dynamic products
    const matchedProducts: CommandItem[] = (products || [])
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.brand?.toLowerCase().includes(query.toLowerCase()) || p.tags?.some(t => t.toLowerCase().includes(query.toLowerCase())))
      .slice(0, 5)
      .map(p => ({
        id: `prod-${p.id}`,
        category: 'Products',
        title: p.name,
        subtitle: `${p.brand || 'Samkhi'} • $${(p.price || 0).toLocaleString()} JMD`,
        icon: Package,
        action: () => { navigate(`/admin/products/${p.id}`); onClose(); }
      }));

    // Append dynamic orders
    const matchedOrders: CommandItem[] = (orders || [])
      .filter(o => o.id.toLowerCase().includes(query.toLowerCase()) || o.customerName.toLowerCase().includes(query.toLowerCase()) || o.customerEmail.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map(o => ({
        id: `ord-${o.id}`,
        category: 'Orders',
        title: `Order #${o.id}`,
        subtitle: `${o.customerName} • $${(o.total || 0).toLocaleString()} JMD • Status: ${o.status}`,
        icon: ShoppingCart,
        action: () => { navigate(`/admin/orders/${o.id.replace('#', '')}`); onClose(); }
      }));

    const all = [...defaultCommands, ...matchedProducts, ...matchedOrders];

    if (!query) {
      // Just show default commands (Actions & Navigation)
      return defaultCommands;
    }

    return all.filter(c => 
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase()) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(query.toLowerCase()))
    );
  };

  const filtered = getFilteredCommands();

  // Reset active row if it goes out of bounds
  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, activeIndex]);

  const handleArrowNavigation = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) {
        filtered[activeIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4">
        {/* Backdrop handler */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Console Container */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: -15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: -15 }}
          className="relative w-full max-w-2xl bg-white border border-[#e3e3e3] rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans max-h-[60vh]"
          ref={containerRef}
        >
          {/* Key Listener search header */}
          <div className="h-14 border-b border-[#f1f1f1] flex items-center px-4 gap-3">
            <Search className="text-[#616161] shrink-0" size={18} />
            <input 
              ref={inputRef}
              type="text"
              placeholder="Search sections, products, orders or type actions (e.g. 'new product')..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleArrowNavigation}
              className="flex-1 bg-transparent border-none text-[#1a1a1a] text-sm focus:outline-none placeholder-slate-400 font-medium"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            )}
            <div className="shrink-0 flex items-center gap-1 text-[10px] font-mono font-bold bg-[#f1f1f1] text-[#616161] px-1.5 py-0.5 rounded border border-slate-205">
              <Command size={10} />
              <span>ESC</span>
            </div>
          </div>

          {/* Results list */}
          <div className="flex-1 overflow-y-auto py-2 divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Search className="mx-auto text-slate-300" size={32} />
                <p className="text-xs font-bold text-[#1a1a1a]">No administrative results match "{query}"</p>
                <p className="text-[11px] text-[#616161]">Try query alternatives or browse the navbar directory.</p>
              </div>
            ) : (
              // Group items by category for cleaner display
              ['Actions', 'Navigation', 'Products', 'Orders'].map(cat => {
                const itemsInGroup = filtered.filter(f => f.category === cat);
                if (itemsInGroup.length === 0) return null;

                return (
                  <div key={cat} className="p-1.5 space-y-0.5">
                    <span className="block text-[9px] font-bold text-[#919191] uppercase tracking-wider px-3.5 py-1.5 font-mono">
                      {cat}
                    </span>
                    {itemsInGroup.map((item) => {
                      // Find direct global index inside overall 'filtered' array
                      const overallIndex = filtered.findIndex(f => f.id === item.id);
                      const isRowActive = overallIndex === activeIndex;

                      return (
                        <div
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setActiveIndex(overallIndex)}
                          className={cn(
                            "flex items-center gap-3 px-3.5 py-2.5 rounded-lg cursor-pointer transition-all text-xs font-medium",
                            isRowActive 
                              ? "bg-slate-100/90 text-black border-l-4 border-[#2563EB]" 
                              : "text-[#414141] hover:bg-slate-50"
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded-md shrink-0 border border-slate-100",
                            isRowActive ? "bg-white text-blue-600" : "bg-slate-50 text-[#616161]"
                          )}>
                            <item.icon size={16} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={cn("text-xs tracking-tight", isRowActive ? "font-bold text-black" : "font-medium text-slate-800")}>
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-[10px] text-slate-400 mt-0.5 font-normal truncate">
                                {item.subtitle}
                              </p>
                            )}
                          </div>

                          {item.shortcut && (
                            <div className="hidden md:flex gap-1">
                              {item.shortcut.split(' ').map((keyChar, index) => (
                                <span key={index} className="text-[9px] px-1.5 py-0.5 font-sans font-extrabold bg-white border rounded text-slate-400 font-mono shadow-sm">
                                  {keyChar}
                                </span>
                              ))}
                            </div>
                          )}

                          <ChevronRight 
                            size={14} 
                            className={cn(
                              "transition-transform shrink-0",
                              isRowActive ? "translate-x-0.5 text-black" : "text-slate-300"
                            )} 
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
