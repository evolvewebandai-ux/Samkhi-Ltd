import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  BarChart3, 
  Tag, 
  Search,
  Bell,
  Menu,
  X,
  Store,
  ChevronDown,
  ChevronRight,
  Layers,
  LogIn,
  LogOut,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Loader2,
  Boxes,
  Database,
  User as UserIcon,
  DollarSign,
  Zap,
  Award,
  Target,
  Sliders,
  Truck,
  Receipt,
  Image as ImageIcon,
  MessageSquare,
  ArrowLeft,
  Globe,
  Building2,
  FileText,
  Calendar,
  RotateCcw,
  CreditCard,
  ShoppingBag,
  Maximize2,
  Minimize2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useOrders } from '../../context/OrderContext';
import { useInventory } from '../../context/InventoryContext';
import { useProducts } from '../../context/ProductContext';
import CommandPalette from './CommandPalette';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface AdminNotification {
  id: string;
  type: 'order' | 'inventory' | 'security' | 'system';
  title: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'success' | 'error';
  link?: string;
}

export interface SubNavItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  path: string;
  badge?: string;
}

export interface NavGroupItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  path?: string;
  badge?: string;
  children?: SubNavItem[];
}

export interface NavSection {
  title: string;
  items: NavGroupItem[];
}

// Gentelella categorized menu structure
const navSections: NavSection[] = [
  {
    title: 'GENERAL',
    items: [
      { 
        icon: Home, 
        label: 'Dashboard', 
        path: '/admin' 
      },
      { 
        icon: ShoppingCart, 
        label: 'Sales & Orders',
        badge: '5',
        children: [
          { icon: ShoppingCart, label: 'All Orders', path: '/admin/orders', badge: '5' },
          { icon: Receipt, label: 'Invoices', path: '/admin/invoices' },
          { icon: ShoppingBag, label: 'Abandoned Carts', path: '/admin/abandoned-carts' },
          { icon: RotateCcw, label: 'Returns & RMA', path: '/admin/returns' },
          { icon: CreditCard, label: 'Financing', path: '/admin/financing' },
        ]
      },
      {
        icon: Package,
        label: 'Products & Catalog',
        children: [
          { icon: Package, label: 'Products', path: '/admin/products' },
          { icon: Layers, label: 'Collections', path: '/admin/collections' },
          { icon: Tag, label: 'Discounts & Coupons', path: '/admin/discounts' },
        ]
      },
      { 
        icon: Boxes, 
        label: 'Inventory & Logistics',
        badge: 'New',
        children: [
          { icon: Boxes, label: 'Stock Levels', path: '/admin/inventory' },
          { icon: FileText, label: 'Purchase Orders', path: '/admin/purchase-orders' },
          { icon: Building2, label: 'Suppliers', path: '/admin/suppliers' },
          { icon: Truck, label: 'Shipping & Rates', path: '/admin/shipping', badge: 'New' },
        ]
      },
    ]
  },
  {
    title: 'LIVE OPERATIONS',
    items: [
      {
        icon: ShieldCheck,
        label: 'Services & Support',
        children: [
          { icon: Calendar, label: 'Installations', path: '/admin/installations' },
          { icon: ShieldCheck, label: 'Warranties', path: '/admin/warranties' },
        ]
      },
      { 
        icon: Users, 
        label: 'Customers & Leads',
        children: [
          { icon: Users, label: 'Customer Directory', path: '/admin/customers' },
          { icon: Target, label: 'Website Leads', path: '/admin/leads' },
          { icon: MessageSquare, label: 'Product Reviews', path: '/admin/reviews' },
        ]
      }
    ]
  },
  {
    title: 'ANALYTICS & SYSTEM',
    items: [
      { 
        icon: BarChart3, 
        label: 'Reports & GCT', 
        path: '/admin/reports' 
      },
      {
        icon: ImageIcon,
        label: 'Media & System',
        children: [
          { icon: ImageIcon, label: 'Media Library', path: '/admin/media' },
          { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
        ]
      }
    ]
  }
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, role, loading, login, logout, isAdmin, isSuperAdmin } = useAdminAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Submenu expansion state tracking
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  // Auto-expand group containing active route
  useEffect(() => {
    const currentPath = location.pathname;
    navSections.forEach(sec => {
      sec.items.forEach(item => {
        if (item.children) {
          const hasActiveChild = item.children.some(child => child.path === currentPath);
          if (hasActiveChild) {
            setOpenSubmenus(prev => ({ ...prev, [item.label]: true }));
          }
        }
      });
    });
  }, [location.pathname]);

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Watch for command palette triggers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Load notification contexts
  const { orders } = useOrders();
  const { inventoryLevels } = useInventory();
  const { products } = useProducts();

  // Manage read state via local storage
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('samkhi_read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveReadIds = (ids: string[]) => {
    setReadNotificationIds(ids);
    try {
      localStorage.setItem('samkhi_read_notifications', JSON.stringify(ids));
    } catch (e) {
      console.warn("Could not save notification read status", e);
    }
  };

  // Dynamic notifications
  const orderNotifications: AdminNotification[] = (orders || [])
    .filter(order => order.status === 'pending')
    .slice(0, 5)
    .map(order => ({
      id: `order-pending-${order.id}`,
      type: 'order',
      title: 'Pending Fulfillment Order',
      message: `Order #${order.id} received from ${order.customerName} is awaiting action. Total: JMD $${(order.total || 0).toLocaleString()}`,
      timestamp: order.date || 'Today',
      severity: 'warning',
      link: `/admin/orders/${order.id.replace('#', '')}`
    }));

  const lowStockNotifications: AdminNotification[] = (inventoryLevels || [])
    .filter(level => level.isTracked && level.quantityOnHand <= level.lowStockThreshold)
    .slice(0, 5)
    .map(level => {
      const product = (products || []).find(p => p.id === level.productId);
      const productName = product ? product.name : `Product ID: ${level.productId}`;
      return {
        id: `low-stock-${level.id}`,
        type: 'inventory',
        title: 'Low Stock Alert',
        message: `"${productName}" is down to ${level.quantityOnHand} units. (Reorder threshold: ${level.lowStockThreshold})`,
        timestamp: 'Just now',
        severity: 'error',
        link: '/admin/inventory'
      };
    });

  const systemNotifications: AdminNotification[] = [
    {
      id: 'sys-backup-june8',
      type: 'system',
      title: 'Database Backup Completed',
      message: 'Full backup of Firebase Firestore completed. 0 file integrity errors detected.',
      timestamp: 'Today, 3:00 AM',
      severity: 'success'
    },
    {
      id: 'sys-rbac-shield',
      type: 'security',
      title: 'Database Security Lock',
      message: 'Zero-trust Firestore validation engine is online. Global access rules compiled & hardened.',
      timestamp: 'Yesterday',
      severity: 'success'
    },
    {
      id: 'sys-customs',
      type: 'system',
      title: 'Customs Tax Rules Engaged',
      message: 'Jamaican flat rate parishes postage logs updated in Settings dashboard.',
      timestamp: '2 days ago',
      severity: 'info',
      link: '/admin/settings'
    }
  ];

  const allNotifications = [
    ...orderNotifications,
    ...lowStockNotifications,
    ...systemNotifications
  ];

  const unreadNotifications = allNotifications.filter(n => !readNotificationIds.includes(n.id));
  const hasUnread = unreadNotifications.length > 0;

  const markAsRead = (id: string) => {
    if (!readNotificationIds.includes(id)) {
      saveReadIds([...readNotificationIds, id]);
    }
  };

  const markAllAsRead = () => {
    const allIds = allNotifications.map(n => n.id);
    saveReadIds(allIds);
  };

  // 1. Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-[3px] border border-[#E6E9ED] shadow-sm text-center">
          <Loader2 className="animate-spin text-[#1ABB9C]" size={36} />
          <p className="text-xs font-bold text-[#2A3F54] tracking-wider uppercase font-mono">Gentelella Portal Initializing...</p>
          <p className="text-[11px] text-[#73879C]">Verifying Credentials & Permissions</p>
        </div>
      </div>
    );
  }

  // 2. Authentication Gate: If not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white border border-[#E6E9ED] rounded-[3px] shadow-lg overflow-hidden"
        >
          <div className="p-8 bg-[#2A3F54] text-white text-center space-y-3">
            <div className="inline-flex w-12 h-12 bg-[#1ABB9C] text-white rounded-full items-center justify-center mx-auto shadow-md">
              <Zap size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide">Samkhi Admin</h1>
              <p className="text-xs text-[#BAB8B8] mt-1">Gentelella Management Console</p>
            </div>
          </div>
          
          <div className="p-8 space-y-6 text-center">
            <div className="flex items-center gap-2 p-3.5 bg-[#F7F7F7] border border-[#E6E9ED] rounded-[3px] text-left">
              <Lock size={16} className="text-[#73879C] shrink-0" />
              <p className="text-[11px] text-[#73879C] leading-relaxed">
                This workspace is strictly restricted to authorized staff. Please sign in with your Google account to initiate authorization.
              </p>
            </div>

            <button 
              onClick={login}
              className="w-full flex items-center justify-center gap-3 bg-[#1ABB9C] hover:bg-[#20967D] active:scale-98 text-white text-xs font-bold py-3 px-4 rounded-[3px] shadow-sm transition-all duration-150 cursor-pointer"
            >
              <LogIn size={16} />
              Sign In with Google
            </button>
            
            <Link to="/" className="inline-block text-xs font-medium text-[#73879C] hover:text-[#2A3F54] hover:underline">
              Return to Public Storefront
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // 3. Authorization Gate: If logged in but lacks admin role
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white border border-[#E6E9ED] rounded-[3px] shadow-lg overflow-hidden"
        >
          <div className="p-8 bg-[#2A3F54] text-white text-center space-y-3">
            <div className="inline-flex w-12 h-12 bg-[#F39C12] text-white rounded-full items-center justify-center mx-auto shadow-md">
              <ShieldAlert size={26} />
            </div>
            <div>
              <h1 className="text-lg font-bold">Access Area Restricted</h1>
              <p className="text-xs text-[#BAB8B8] mt-1">Unauthorized Account Profile</p>
            </div>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="text-xs text-[#2A3F54] space-y-2.5">
              <p className="text-[#73879C]">Your authenticated Google Account is not configured with administrator roles:</p>
              <div className="bg-[#F7F7F7] p-3 rounded-[3px] border border-[#E6E9ED] font-mono text-[10.5px] text-[#73879C] space-y-1">
                <p><span className="font-bold text-[#2A3F54]">Email:</span> {user.email}</p>
                <p><span className="font-bold text-[#2A3F54]">Assigned Role:</span> Unauthorized Guest</p>
              </div>
              <p className="text-[#73879C] leading-relaxed mt-2 text-[11px]">
                Please request an administrator to list your email on the team directory with clearance permissions.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 border border-[#CCCCCC] text-[#2A3F54] hover:bg-slate-50 text-xs font-bold py-2.5 px-4 rounded-[3px] transition-all cursor-pointer"
              >
                <LogOut size={14} />
                Sign In with a Different Account
              </button>
              
              <Link to="/" className="w-full text-center bg-[#2A3F54] hover:bg-[#34495E] text-white text-xs font-bold py-2.5 px-4 rounded-[3px] transition-all inline-block">
                Return to Storefront
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // 4. Authorized Gentelella Workspace
  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col md:flex-row font-sans text-slate-800 antialiased">
      
      {/* Mobile Drawer Backdrop & Sheet */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[270px] bg-[#2A3F54] text-[#E7E7E7] z-[101] shadow-2xl flex flex-col md:hidden border-r border-[#172D44]"
            >
              {/* Brand Header */}
              <div className="h-14 flex items-center justify-between px-4 bg-[#2A3F54] border-b border-[#35495D] shrink-0">
                <Link to="/admin" className="flex items-center gap-2.5" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="w-8 h-8 rounded-full bg-[#1ABB9C] flex items-center justify-center text-white shadow-xs">
                    <Zap size={18} />
                  </div>
                  <span className="font-bold text-white text-base tracking-wide">Samkhi Admin</span>
                </Link>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-[#BAB8B8] hover:text-white hover:bg-[#35495D] rounded transition-colors"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Profile Quick Info (Gentelella style) */}
              <div className="p-4 border-b border-[#35495D] bg-[#223547] flex items-center gap-3">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || "User"} 
                    referrerPolicy="no-referrer" 
                    className="w-11 h-11 rounded-full object-cover border border-white/20 p-0.5" 
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#1ABB9C] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase() || "A"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-[#BAB8B8] block">Welcome,</span>
                  <p className="text-xs font-bold text-white truncate">{user.displayName || "Admin User"}</p>
                  <span className="inline-block mt-0.5 text-[9px] font-bold text-[#1ABB9C] bg-[#1ABB9C]/15 px-2 py-0.2 rounded border border-[#1ABB9C]/30 uppercase font-mono">
                    {role}
                  </span>
                </div>
              </div>

              {/* View Live Store link */}
              <div className="px-3 py-2 border-b border-[#35495D]">
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-[3px] bg-[#334A5E] hover:bg-[#3d566e] text-white text-xs font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Store size={15} className="text-[#1ABB9C]" />
                    View Live Storefront
                  </span>
                  <ExternalLink size={13} className="text-[#BAB8B8]" />
                </Link>
              </div>

              {/* Navigation Sections */}
              <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
                {navSections.map((sec) => (
                  <div key={sec.title} className="space-y-1">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#BAB8B8]/60 px-3 pt-1">
                      {sec.title}
                    </h3>
                    {sec.items.map((item) => {
                      const hasChildren = item.children && item.children.length > 0;
                      const isParentActive = hasChildren
                        ? item.children!.some(child => location.pathname === child.path)
                        : location.pathname === item.path;
                      const isExpanded = !!openSubmenus[item.label];

                      if (hasChildren) {
                        return (
                          <div key={item.label} className="space-y-0.5">
                            <button
                              onClick={() => toggleSubmenu(item.label)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-[3px] transition-colors text-xs font-semibold text-left cursor-pointer",
                                isParentActive
                                  ? "bg-[#334A5E] text-white border-r-4 border-[#1ABB9C]"
                                  : "text-[#E7E7E7] hover:bg-[#35495D] hover:text-white"
                              )}
                            >
                              <item.icon size={16} className={cn("shrink-0", isParentActive ? "text-[#1ABB9C]" : "text-[#73879C]")} />
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.badge && (
                                <span className="bg-[#1ABB9C] text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold mr-1">
                                  {item.badge}
                                </span>
                              )}
                              {isExpanded ? <ChevronDown size={14} className="text-[#BAB8B8] shrink-0" /> : <ChevronRight size={14} className="text-[#BAB8B8] shrink-0" />}
                            </button>

                            {isExpanded && (
                              <div className="bg-[#203344] rounded-[3px] py-1 pl-4 pr-1 space-y-0.5 my-1">
                                {item.children!.map((child) => {
                                  const isChildActive = location.pathname === child.path;
                                  return (
                                    <Link
                                      key={child.path}
                                      to={child.path}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className={cn(
                                        "flex items-center gap-2.5 px-3 py-1.5 rounded-[3px] transition-colors text-xs font-medium",
                                        isChildActive
                                          ? "text-[#1ABB9C] font-bold bg-[#2A3F54]"
                                          : "text-[#E7E7E7] hover:text-white hover:bg-[#2A3F54]"
                                      )}
                                    >
                                      <child.icon size={14} className={cn("shrink-0", isChildActive ? "text-[#1ABB9C]" : "text-[#73879C]")} />
                                      <span className="flex-1 truncate">{child.label}</span>
                                      {child.badge && (
                                        <span className="bg-[#1ABB9C] text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                                          {child.badge}
                                        </span>
                                      )}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.label}
                          to={item.path || '/admin'}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-[3px] transition-colors text-xs font-semibold",
                            isActive 
                              ? "bg-[#334A5E] text-white border-r-4 border-[#1ABB9C]" 
                              : "text-[#E7E7E7] hover:bg-[#35495D] hover:text-white"
                          )}
                        >
                          <item.icon size={16} className={cn("shrink-0", isActive ? "text-[#1ABB9C]" : "text-[#73879C]")} />
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span className="bg-[#1ABB9C] text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>

              {/* Sidebar Footer Buttons (Gentelella style) */}
              <div className="h-11 bg-[#172D44] flex items-center justify-around border-t border-[#35495D] shrink-0 text-[#73879C]">
                <Link to="/admin/settings" onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:text-white hover:bg-[#2A3F54] rounded transition-colors" title="Settings">
                  <Settings size={16} />
                </Link>
                <button onClick={toggleFullscreen} className="p-2 hover:text-white hover:bg-[#2A3F54] rounded transition-colors" title="Fullscreen">
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button onClick={() => { setIsMobileMenuOpen(false); setIsCommandPaletteOpen(true); }} className="p-2 hover:text-white hover:bg-[#2A3F54] rounded transition-colors" title="Quick Search">
                  <Search size={16} />
                </button>
                <button onClick={logout} className="p-2 hover:text-[#E74C3C] hover:bg-[#2A3F54] rounded transition-colors" title="Sign Out">
                  <LogOut size={16} />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Persistent Sidebar (Gentelella #2A3F54 Palette) */}
      <aside 
        className={cn(
          "hidden md:flex bg-[#2A3F54] text-[#E7E7E7] transition-all duration-300 flex-col fixed inset-y-0 z-50 border-r border-[#172D44]",
          isSidebarOpen ? "w-[230px]" : "w-[70px]"
        )}
      >
        {/* Brand Logo Header */}
        <Link 
          to="/admin" 
          className="h-14 flex items-center px-4 gap-3 bg-[#2A3F54] border-b border-[#35495D] shrink-0 hover:bg-[#35495D] transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-[#1ABB9C] flex items-center justify-center shrink-0 shadow-xs text-white">
            <Zap size={18} />
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-white tracking-wide truncate text-sm">Samkhi Admin</span>
          )}
        </Link>

        {/* Profile Quick Info (Gentelella Style) */}
        {isSidebarOpen ? (
          <div className="p-4 border-b border-[#35495D] bg-[#223547] flex items-center gap-3 shrink-0">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || "User"} 
                referrerPolicy="no-referrer" 
                className="w-11 h-11 rounded-full object-cover border border-white/20 p-0.5 shrink-0" 
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#1ABB9C] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase() || "A"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-[#BAB8B8] block">Welcome,</span>
              <h2 className="text-xs font-bold text-white truncate leading-tight">{user.displayName || "Admin"}</h2>
              <span className="inline-block mt-0.5 text-[8.5px] font-bold text-[#1ABB9C] bg-[#1ABB9C]/15 px-1.5 py-0.2 rounded border border-[#1ABB9C]/30 uppercase font-mono">
                {role}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-3 flex justify-center border-b border-[#35495D] bg-[#223547] shrink-0">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="User" 
                referrerPolicy="no-referrer" 
                className="w-9 h-9 rounded-full object-cover border border-white/20" 
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#1ABB9C] text-white flex items-center justify-center font-bold text-xs">
                {user.displayName?.charAt(0) || "A"}
              </div>
            )}
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-3">
          {navSections.map((sec) => (
            <div key={sec.title} className="space-y-0.5">
              {isSidebarOpen && (
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#BAB8B8]/60 px-3 pt-2 pb-0.5">
                  {sec.title}
                </h3>
              )}
              {sec.items.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isParentActive = hasChildren 
                  ? item.children!.some(child => location.pathname === child.path) 
                  : location.pathname === item.path;
                const isExpanded = !!openSubmenus[item.label];

                if (hasChildren) {
                  return (
                    <div key={item.label} className="space-y-0.5 group relative">
                      <button
                        onClick={() => {
                          if (!isSidebarOpen) {
                            setIsSidebarOpen(true);
                            setOpenSubmenus(prev => ({ ...prev, [item.label]: true }));
                          } else {
                            toggleSubmenu(item.label);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-[3px] transition-colors text-left cursor-pointer select-none",
                          isParentActive
                            ? "bg-[#334A5E] text-white font-semibold border-r-4 border-[#1ABB9C]"
                            : "hover:bg-[#35495D] hover:text-white text-[#E7E7E7]"
                        )}
                        title={!isSidebarOpen ? item.label : undefined}
                      >
                        <item.icon size={16} className={cn("shrink-0", isParentActive ? "text-[#1ABB9C]" : "text-[#73879C] group-hover:text-white")} />
                        {isSidebarOpen && (
                          <>
                            <span className="flex-1 text-xs font-semibold truncate">{item.label}</span>
                            {item.badge && (
                              <span className="bg-[#1ABB9C] text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono mr-1">
                                {item.badge}
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronDown size={14} className="text-[#BAB8B8] shrink-0" />
                            ) : (
                              <ChevronRight size={14} className="text-[#BAB8B8] shrink-0" />
                            )}
                          </>
                        )}
                      </button>

                      {/* Expanded Submenu list */}
                      {isSidebarOpen && isExpanded && (
                        <div className="bg-[#203344] rounded-[3px] py-1 pl-3 pr-1 space-y-0.5 my-0.5">
                          {item.children!.map((child) => {
                            const isChildActive = location.pathname === child.path;
                            return (
                              <Link
                                key={child.path}
                                to={child.path}
                                className={cn(
                                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-[3px] transition-colors text-xs",
                                  isChildActive
                                    ? "text-[#1ABB9C] font-bold bg-[#2A3F54]"
                                    : "text-[#E7E7E7] hover:bg-[#2A3F54] hover:text-white font-medium"
                                )}
                              >
                                <child.icon size={14} className={cn("shrink-0", isChildActive ? "text-[#1ABB9C]" : "text-[#73879C]")} />
                                <span className="flex-1 truncate">{child.label}</span>
                                {child.badge && (
                                  <span className="bg-[#1ABB9C] text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                                    {child.badge}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}

                      {/* Collapsed Sidebar Hover Flyout Menu */}
                      {!isSidebarOpen && (
                        <div className="absolute left-full top-0 ml-1.5 w-52 bg-[#2A3F54] text-[#E7E7E7] rounded-[3px] shadow-2xl border border-[#35495D] p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-[120]">
                          <div className="px-2.5 py-1.5 text-[11px] font-bold text-white uppercase tracking-wider border-b border-[#35495D] mb-1 flex justify-between items-center">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="bg-[#1ABB9C] text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            {item.children!.map((child) => {
                              const isChildActive = location.pathname === child.path;
                              return (
                                <Link
                                  key={child.path}
                                  to={child.path}
                                  className={cn(
                                    "flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] text-xs transition-colors",
                                    isChildActive
                                      ? "bg-[#1ABB9C] text-white font-semibold"
                                      : "text-[#E7E7E7] hover:bg-[#35495D] hover:text-white"
                                  )}
                                >
                                  <child.icon size={14} className="shrink-0 text-[#73879C]" />
                                  <span className="truncate">{child.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = location.pathname === item.path;
                return (
                  <div key={item.label} className="space-y-0.5 group relative">
                    <Link
                      to={item.path || '/admin'}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-[3px] transition-colors",
                        isActive 
                          ? "bg-[#334A5E] text-white font-semibold border-r-4 border-[#1ABB9C]" 
                          : "hover:bg-[#35495D] hover:text-white text-[#E7E7E7]"
                      )}
                      title={!isSidebarOpen ? item.label : undefined}
                    >
                      <item.icon size={16} className={cn("shrink-0", isActive ? "text-[#1ABB9C]" : "text-[#73879C] group-hover:text-white")} />
                      {isSidebarOpen && (
                        <span className="flex-1 text-xs font-semibold truncate">{item.label}</span>
                      )}
                      {isSidebarOpen && item.badge && (
                        <span className="bg-[#1ABB9C] text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono">
                          {item.badge}
                        </span>
                      )}
                      {!isSidebarOpen && (
                        <div className="absolute left-full ml-1.5 px-2.5 py-1.5 bg-[#2A3F54] text-white text-[11px] font-semibold rounded-[3px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[100] border border-[#35495D] shadow-xl">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer (Gentelella signature 4 action buttons: Settings, Fullscreen, Search, Logout) */}
        <div className="h-11 bg-[#172D44] flex items-center justify-around border-t border-[#35495D] shrink-0 text-[#73879C]">
          <Link 
            to="/admin/settings" 
            className="p-2 hover:text-white hover:bg-[#2A3F54] rounded transition-colors" 
            title="Settings"
          >
            <Settings size={15} />
          </Link>
          <button 
            onClick={toggleFullscreen} 
            className="p-2 hover:text-white hover:bg-[#2A3F54] rounded transition-colors cursor-pointer" 
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button 
            onClick={() => setIsCommandPaletteOpen(true)} 
            className="p-2 hover:text-white hover:bg-[#2A3F54] rounded transition-colors cursor-pointer" 
            title="Quick Command Palette (⌘K)"
          >
            <Search size={15} />
          </button>
          <button 
            onClick={logout} 
            className="p-2 hover:text-[#E74C3C] hover:bg-[#2A3F54] rounded transition-colors cursor-pointer" 
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main Content Area (Gentelella right_col) */}
      <div 
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0",
          isSidebarOpen ? "md:ml-[230px]" : "md:ml-[70px]"
        )}
      >
        {/* Top Navigation Bar (Gentelella top_nav in light mode #EDEDED) */}
        <header className="h-14 bg-[#EDEDED] border-b border-[#D9DEE4] flex items-center justify-between px-3 sm:px-6 sticky top-0 z-40">
          
          {/* Left: Hamburger Toggle & Search */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            {/* Desktop & Mobile Hamburger Toggle */}
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsMobileMenuOpen(true);
                } else {
                  setIsSidebarOpen(!isSidebarOpen);
                }
              }}
              className="p-1.5 text-[#5A738E] hover:text-[#2A3F54] hover:bg-slate-200 rounded transition-colors cursor-pointer"
              aria-label="Toggle Sidebar Menu"
              title="Toggle Sidebar Menu"
            >
              <Menu size={20} />
            </button>

            {/* Mobile Store Logo */}
            <Link to="/admin" className="flex items-center gap-2 md:hidden shrink-0">
              <div className="w-7 h-7 bg-[#1ABB9C] rounded-full flex items-center justify-center text-white shadow-xs">
                <Zap size={15} />
              </div>
              <span className="font-bold text-xs text-[#2A3F54] tracking-tight hidden sm:inline">Samkhi Admin</span>
            </Link>

            {/* Gentelella Search & Command Palette Bar */}
            <div 
              onClick={() => setIsCommandPaletteOpen(true)}
              className="relative flex-1 max-w-md cursor-pointer group"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#73879C]" size={15} />
              <input 
                type="text" 
                readOnly
                placeholder="Search for... (⌘K)"
                className="w-full bg-white border border-[#CCCCCC] rounded-[3px] py-1.5 pl-8 pr-12 text-xs text-[#2A3F54] placeholder-[#73879C] focus:outline-none focus:border-[#1ABB9C] shadow-2xs cursor-pointer transition-colors"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[9px] font-mono font-bold bg-[#EDEDED] text-[#73879C] px-1.5 py-0.5 rounded border border-[#CCCCCC]">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>
          </div>

          {/* Right Navigation Actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            
            {/* View Live Store link */}
            <Link
              to="/"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#5A738E] hover:text-[#2A3F54] hover:bg-slate-200 rounded transition-colors"
              title="Return to Public Storefront"
            >
              <Store size={14} className="text-[#1ABB9C]" />
              <span>Live Store</span>
            </Link>

            {/* Environment Role Pill */}
            <div className="hidden sm:flex items-center">
              {role === 'super-admin' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#1ABB9C] px-2.5 py-0.5 rounded-full shadow-xs">
                  <ShieldCheck size={12} />
                  Super Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#337AB7] px-2.5 py-0.5 rounded-full shadow-xs">
                  <Shield size={12} />
                  Manager
                </span>
              )}
            </div>

            {/* Notification / Alert Dropdown (Gentelella msg_list style) */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                className="p-2 text-[#5A738E] hover:text-[#2A3F54] hover:bg-slate-200 rounded relative transition-colors cursor-pointer"
                title="System Notifications & Alerts"
              >
                <Bell size={18} />
                {hasUnread && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E74C3C] rounded-full border border-[#EDEDED] animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showNotificationPanel && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotificationPanel(false)} />
                    
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-[#D9DEE4] rounded-[3px] shadow-xl py-2 z-50 text-left font-sans"
                    >
                      <div className="px-4 py-2 border-b border-[#E6E9ED] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#2A3F54] uppercase tracking-wider">
                          Alerts ({allNotifications.length})
                        </span>
                        {hasUnread && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-[10px] text-[#1ABB9C] hover:underline font-bold tracking-wide cursor-pointer"
                          >
                            Mark All Read
                          </button>
                        )}
                      </div>
                      
                      <div className="overflow-y-auto max-h-[350px] divide-y divide-[#F1F1F1]">
                        {allNotifications.length === 0 ? (
                          <div className="p-6 text-center text-[#73879C] text-xs">
                            No notifications available
                          </div>
                        ) : (
                          allNotifications.map((notif) => {
                            const isUnread = !readNotificationIds.includes(notif.id);
                            return (
                              <div 
                                key={notif.id}
                                onClick={() => {
                                  markAsRead(notif.id);
                                  setShowNotificationPanel(false);
                                  if (notif.link) {
                                    navigate(notif.link);
                                  }
                                }}
                                className={cn(
                                  "p-3 text-xs transition-colors flex gap-2.5 items-start cursor-pointer",
                                  isUnread ? "bg-[#FAFBFD] hover:bg-[#F2F5F8]" : "hover:bg-[#F7F7F7]"
                                )}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {notif.type === 'order' && <ShoppingCart className="text-[#337AB7]" size={15} />}
                                  {notif.type === 'inventory' && <Boxes className="text-[#E74C3C]" size={15} />}
                                  {notif.type === 'security' && <ShieldCheck className="text-[#1ABB9C]" size={15} />}
                                  {notif.type === 'system' && <Database className="text-[#5A738E]" size={15} />}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={cn("truncate text-xs", isUnread ? "font-bold text-[#2A3F54]" : "text-[#73879C]")}>
                                      {notif.title}
                                    </span>
                                    {isUnread && (
                                      <span className="w-1.5 h-1.5 bg-[#1ABB9C] rounded-full shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-[#73879C] text-[11px] mt-0.5 leading-snug">
                                    {notif.message}
                                  </p>
                                  <span className="text-[9px] text-[#9EA7AF] mt-1 block font-mono">
                                    {notif.timestamp}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="px-4 py-2 border-t border-[#E6E9ED] text-center bg-[#FAFBFD]">
                        <Link 
                          to="/admin/notifications" 
                          onClick={() => setShowNotificationPanel(false)}
                          className="text-xs font-bold text-[#337AB7] hover:underline block"
                        >
                          See All Notifications &rarr;
                        </Link>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* User Profile Dropdown (Gentelella style) */}
            <div className="relative border-l border-[#D9DEE4] pl-2 sm:pl-3">
              <div 
                className="flex items-center gap-2 cursor-pointer select-none p-1 hover:bg-slate-200 rounded transition-colors" 
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || "User"} 
                    referrerPolicy="no-referrer" 
                    className="w-7 h-7 rounded-full object-cover border border-[#CCCCCC]" 
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#2A3F54] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase() || "A"}
                  </div>
                )}
                <span className="text-xs font-semibold text-[#2A3F54] hidden sm:inline max-w-[110px] truncate">
                  {user.displayName || "Admin User"}
                </span>
                <ChevronDown size={14} className="text-[#5A738E] hidden sm:inline" />
              </div>

              {/* User Menu Dropdown */}
              <AnimatePresence>
                {showUserDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 bg-white border border-[#D9DEE4] rounded-[3px] shadow-xl py-2 z-50 text-left font-sans"
                    >
                      <div className="px-4 py-2 border-b border-[#E6E9ED] mb-1">
                        <p className="text-xs font-bold text-[#2A3F54] truncate">{user.displayName || "Samkhi Admin"}</p>
                        <p className="text-[10px] text-[#73879C] truncate">{user.email}</p>
                        <span className="inline-block mt-1 text-[9px] font-bold text-[#1ABB9C] uppercase font-mono">
                          Role: {role}
                        </span>
                      </div>

                      <Link
                        to="/admin/settings"
                        onClick={() => setShowUserDropdown(false)}
                        className="w-full text-left px-4 py-2 text-xs text-[#2A3F54] hover:bg-[#F7F7F7] flex items-center gap-2 transition-colors font-medium"
                      >
                        <Settings size={14} className="text-[#73879C]" />
                        Settings
                      </Link>

                      <Link
                        to="/"
                        onClick={() => setShowUserDropdown(false)}
                        className="w-full text-left px-4 py-2 text-xs text-[#2A3F54] hover:bg-[#F7F7F7] flex items-center gap-2 transition-colors font-medium"
                      >
                        <Store size={14} className="text-[#73879C]" />
                        Live Storefront
                      </Link>

                      <div className="border-t border-[#E6E9ED] my-1" />

                      <button 
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-xs text-[#E74C3C] hover:bg-rose-50 flex items-center gap-2 transition-colors font-semibold cursor-pointer"
                      >
                        <LogOut size={14} />
                        Log Out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        {/* Page Content (Strict Light Mode Canvas) */}
        <main className="flex-1 overflow-x-hidden pb-16 md:pb-6 bg-[#F7F7F7]">
          {children}
        </main>
      </div>

      {/* Mobile App Bottom Dock */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E6E9ED] z-40 md:hidden flex justify-around items-center px-2 py-1 shadow-md">
        <Link
          to="/admin"
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition-colors",
            location.pathname === '/admin' ? "text-[#1ABB9C]" : "text-[#73879C]"
          )}
        >
          <Home size={18} />
          <span>Home</span>
        </Link>

        <Link
          to="/admin/orders"
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition-colors relative",
            location.pathname === '/admin/orders' ? "text-[#1ABB9C]" : "text-[#73879C]"
          )}
        >
          <ShoppingCart size={18} />
          <span>Orders</span>
        </Link>

        <Link
          to="/admin/products"
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition-colors",
            location.pathname === '/admin/products' ? "text-[#1ABB9C]" : "text-[#73879C]"
          )}
        >
          <Package size={18} />
          <span>Products</span>
        </Link>

        <Link
          to="/admin/leads"
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition-colors",
            location.pathname === '/admin/leads' ? "text-[#1ABB9C]" : "text-[#73879C]"
          )}
        >
          <Target size={18} />
          <span>Leads</span>
        </Link>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold text-[#73879C] cursor-pointer"
        >
          <Menu size={18} />
          <span>Menu</span>
        </button>
      </nav>

      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
    </div>
  );
}
