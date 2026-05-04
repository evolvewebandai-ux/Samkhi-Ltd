import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  BarChart3, 
  Tag, 
  Megaphone, 
  Search,
  Bell,
  Menu,
  X,
  Store,
  ChevronDown,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { icon: Home, label: 'Home', path: '/admin' },
  { icon: ShoppingCart, label: 'Orders', path: '/admin/orders', badge: '5' },
  { icon: Package, label: 'Products', path: '/admin/products' },
  { icon: Users, label: 'Customers', path: '/admin/customers' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: Tag, label: 'Discounts', path: '/admin/discounts' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#f1f1f1] flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-[#1a1a1a] text-[#b5b5b5] transition-all duration-300 flex flex-col fixed inset-y-0 z-50",
          isSidebarOpen ? "w-[240px]" : "w-[64px]"
        )}
      >
        <Link to="/" className="h-16 flex items-center px-4 gap-3 border-b border-white/10 shrink-0 hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center shrink-0">
            <Store size={20} className="text-[#1a1a1a]" />
          </div>
          {isSidebarOpen && (
            <span className="font-semibold text-white truncate">Samkhi Admin</span>
          )}
        </Link>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors group relative",
                  isActive 
                    ? "bg-[#2b2b2b] text-white" 
                    : "hover:bg-[#2b2b2b] hover:text-white"
                )}
              >
                <item.icon size={20} className={cn("shrink-0", isActive ? "text-white" : "text-[#b5b5b5] group-hover:text-white")} />
                {isSidebarOpen && (
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                )}
                {isSidebarOpen && item.badge && (
                  <span className="bg-[#5c5f62] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                {!isSidebarOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1a] text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[100]">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-white/10 space-y-1">
          <Link
            to="/admin/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors group",
              location.pathname === '/admin/settings' ? "bg-[#2b2b2b] text-white" : "hover:bg-[#2b2b2b] hover:text-white"
            )}
          >
            <Settings size={20} />
            {isSidebarOpen && <span className="text-sm font-medium">Settings</span>}
          </Link>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#2b2b2b] transition-colors text-left"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            {isSidebarOpen && <span className="text-sm font-medium">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div 
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          isSidebarOpen ? "ml-[240px]" : "ml-[64px]"
        )}
      >
        {/* Header */}
        <header className="h-14 bg-white border-b border-[#e3e3e3] flex items-center px-6 gap-4 sticky top-0 z-40">
          <div className="flex-1 max-w-2xl relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#616161]" size={18} />
            <input 
              type="text" 
              placeholder="Search or type a command"
              className="w-full bg-[#f1f1f1] border-none rounded-md py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-black/5 transition-all text-[#1a1a1a]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-[#f1f1f1] rounded-md relative text-[#616161]">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-2 pl-2 ml-2 border-l border-[#e3e3e3]">
              <div className="w-8 h-8 rounded bg-black text-white flex items-center justify-center text-xs font-bold">
                S
              </div>
              <span className="text-sm font-medium text-[#1a1a1a] hidden sm:block">Samkhi Limited</span>
              <ChevronDown size={14} className="text-[#616161]" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
