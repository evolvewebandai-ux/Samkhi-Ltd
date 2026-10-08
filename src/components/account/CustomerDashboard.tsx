import { useState, useEffect } from 'react';
import { 
  User, Package, Heart, Settings, LogOut, Flame, Sparkles, MailOpen, 
  MapPin, Clock, CreditCard, ChevronRight, Share2, HelpCircle, X, ShieldCheck 
} from 'lucide-react';
import { useCustomerAuth, SimulatedEmail } from '../../context/CustomerAuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order } from '../../types';
import OrderList from './OrderList';
import OrderDetailView from './OrderDetailView';
import WishlistView from './WishlistView';
import AccountSettingsView from './AccountSettingsView';
import OrderTrackingTab from './OrderTrackingTab';

interface CustomerDashboardProps {
  onLogoutSuccess: () => void;
  initialProductIdForWishlistRedirect?: string | null;
  onViewProductLanding: (productId: string) => void;
}

export default function CustomerDashboard({ 
  onLogoutSuccess, 
  initialProductIdForWishlistRedirect,
  onViewProductLanding
}: CustomerDashboardProps) {
  const { 
    customerUser, 
    customerProfile, 
    logoutCustomer, 
    updateProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    deleteCustomerAccount,
    addWishlistItem,
    removeWishlistItem,
    triggerEmailNotification,
    emails,
    clearEmailLogs
  } = useCustomerAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wishlist' | 'settings'>('overview');
  const [ordersSubTab, setOrdersSubTab] = useState<'history' | 'tracking'>('history');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Email outbox slider state
  const [showEmailOutbox, setShowEmailOutbox] = useState(false);
  const [activeOutboxMail, setActiveOutboxMail] = useState<SimulatedEmail | null>(null);



  // Initialize active tab redirection if wishlist requested specifically
  useEffect(() => {
    if (initialProductIdForWishlistRedirect) {
      setActiveTab('wishlist');

      // Auto-add product to wishlist if logged in and not already added
      if (customerProfile && !customerProfile.wishlist?.includes(initialProductIdForWishlistRedirect)) {
        addWishlistItem(initialProductIdForWishlistRedirect).then(() => {
          // Remove query param beautifully
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete('wishlist_add_redirect');
          window.history.replaceState(null, '', currentUrl.pathname + currentUrl.search);
        }).catch((err) => {
          console.error("Failed auto-adding redirected item:", err);
        });
      }
    }
  }, [initialProductIdForWishlistRedirect, customerProfile, addWishlistItem]);

  // Real-time or snapshot fetch of orders matching email
  useEffect(() => {
    if (!customerProfile?.email) return;

    async function fetchCustomerOrders() {
      setOrdersLoading(true);
      try {
        const q = query(
          collection(db, 'orders'),
          where('customerEmail', '==', customerProfile.email.toLowerCase().trim())
        );
        const snap = await getDocs(q);
        const list: Order[] = [];
        snap.forEach((doc) => {
          list.push({ ...doc.data(), id: doc.id } as Order);
        });

        // Sort descending by placement or date
        list.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setOrders(list);

        // Sync spent totals and orders count with active profile securely
        const spentVal = list.reduce((acc, o) => acc + (o.status !== 'cancelled' ? o.total : 0), 0);
        const latestOrderDate = list[0]?.date || 'None';
        
        if (customerProfile.spent !== spentVal || customerProfile.orders !== list.length) {
          updateProfile({
            orders: list.length,
            spent: spentVal,
            lastOrder: latestOrderDate
          });
        }
      } catch (err) {
        console.error("Error retrieving client order history logs:", err);
      } finally {
        setOrdersLoading(false);
      }
    }

    fetchCustomerOrders();
  }, [customerProfile?.email, activeTab]);

  const handleSignOut = async () => {
    await logoutCustomer();
    onLogoutSuccess();
  };



  // Safe checks
  if (!customerProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-bold mt-4 font-sans">Connecting to your secure Customer Portal...</p>
      </div>
    );
  }



  // Streak tracker
  const streakDays = 3; // Guaranteed streak counter for returning customers

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:py-10 font-sans relative min-h-[700px]">
      
      {/* Overall grid layout (sidebar + dashboard workspace) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* SIDEBAR NAVIGATION PANEL (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 p-6 shadow-enterprise space-y-6">
          
          {/* Avatar and Welcome Card */}
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-50">
            <div className="w-12 h-12 bg-secondary text-cta font-display font-black text-lg flex items-center justify-center rounded-2xl relative shadow-md uppercase">
              {customerProfile.firstName?.charAt(0) || customerProfile.name.charAt(0)}
              <span className="absolute bottom-[-2px] right-[-2px] w-4 h-4 bg-primary text-white text-[10px] flex items-center justify-center rounded-full leading-none">
                ✓
              </span>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jamaica Customer</p>
              <h3 className="font-display font-black text-secondary text-md line-clamp-1">
                {customerProfile.firstName} {customerProfile.lastName}
              </h3>
            </div>
          </div>

          {/* Navigation Items list */}
          <nav className="space-y-1">
            {[
              { key: 'overview', label: 'Dashboard Hub', icon: Sparkles },
              { key: 'orders', label: 'My Order Archive', icon: Package, badge: orders.length },
              { key: 'wishlist', label: 'My Saved Items', icon: Heart, badge: customerProfile.wishlist?.length || 0 },
              { key: 'settings', label: 'Portal Settings', icon: Settings }
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key as any);
                    setSelectedOrder(null);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-secondary text-white shadow-enterprise' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComp size={15} className={isActive ? 'text-cta' : 'text-slate-400'} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge != null && tab.badge > 0 && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-normal ${
                      isActive ? 'bg-cta text-secondary' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all mt-4 cursor-pointer"
            >
              <LogOut size={15} />
              <span>Log out</span>
            </button>
          </nav>

          {/* SIMULATED EMAIL floating launcher on sidebar */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowEmailOutbox(true)}
              className="w-full bg-slate-50 hover:bg-slate-100 text-secondary border border-slate-200 text-xs font-bold uppercase py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <MailOpen size={14} className="text-cta" />
              <span>Open Email Box ({emails.length})</span>
            </button>
          </div>

        </div>

        {/* WORKSPACE AREA (9 cols) */}
        <div className="lg:col-span-9">
          
          {/* TAB: OVERVIEW HUB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Top welcome promotional banner */}
              <div className="bg-gradient-to-r from-secondary to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-enterprise flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="absolute top-0 right-0 w-44 h-44 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
                <div className="relative z-10 max-w-lg space-y-2">
                  <h2 className="font-display font-black text-2xl tracking-tight leading-tight pt-1">
                    Harness Jamaica Solar. Track your carbon efficiency!
                  </h2>
                  <p className="text-xs text-slate-300 font-medium">
                    Welcome back, {customerProfile.firstName}! Log in to verify shipping parcel timelines and update address preferences.
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-3.5 bg-white/5 border border-white/10 p-4 rounded-2xl relative z-10">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">User Streak</span>
                    <p className="font-display font-black text-xl text-cta flex items-center gap-1 justify-center mt-1">
                      <Flame className="fill-cta animate-bounce" size={18} /> {streakDays} Day
                    </p>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Metric 1: Orders Count */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-enterprise relative overflow-hidden">
                  <span className="text-2xl absolute top-4 right-4">📦</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Completed Orders</span>
                  <p className="font-display font-black text-3xl text-secondary mt-2 tracking-tight">
                    {ordersLoading ? "..." : orders.length}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1.5 italic font-medium">
                    Last dispatch: {customerProfile.lastOrder || 'None'}
                  </p>
                  <button 
                    onClick={() => setActiveTab('orders')}
                    className="text-[10px] font-bold text-secondary hover:text-primary mt-3 border-t border-slate-50 pt-2.5 w-full text-left uppercase tracking-wider flex items-center justify-between"
                  >
                    <span>View Archive</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Metric 2: Total Spent */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-enterprise relative overflow-hidden">
                  <span className="text-2xl absolute top-4 right-4">💵</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Net Investments</span>
                  <p className="font-display font-black text-xl md:text-2xl text-primary mt-2 tracking-tight">
                    JMD ${customerProfile.spent?.toLocaleString() || 0}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1.5 font-medium leading-relaxed">
                    Total solar savings active
                  </p>
                  <div className="text-[10px] text-slate-400 font-bold tracking-wide mt-3.5 border-t border-slate-50 pt-2.5 flex items-center gap-1">
                    <ShieldCheck size={12} className="text-primary-accent" /> Verified Member
                  </div>
                </div>

              </div>

              {/* Recent Orders Overview drawer */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-display font-black text-secondary text-md flex items-center gap-2">Recent dispatches</h3>
                  <button 
                    onClick={() => setActiveTab('orders')} 
                    className="text-xs font-bold text-primary hover:text-primary-accent"
                  >
                    View All Orders Archive
                  </button>
                </div>

                {ordersLoading ? (
                  <div className="grid grid-cols-1 gap-2.5 py-4 text-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-6 text-center border">
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">No matching transactional history logs. Start solar shopping!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 1).map(order => (
                      <div key={order.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-enterprise flex justify-between items-center flex-wrap gap-4">
                        <div>
                          <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Ref ID</p>
                          <h4 className="text-xs font-bold text-secondary">{order.id}</h4>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Dated</p>
                          <h4 className="text-xs text-slate-600 font-semibold">{order.date}</h4>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Packaging Status</p>
                          <span className={`text-[10px] font-bold px-2 rounded-full border border-primary/20 text-primary bg-primary/10`}>
                            {order.status}
                          </span>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Settle Amount</p>
                          <h4 className="text-xs font-black text-primary">JMD ${order.total?.toLocaleString()}</h4>
                        </div>
                        <button
                          onClick={() => { setSelectedOrder(order); setActiveTab('orders'); }}
                          className="text-xs font-bold text-secondary hover:text-primary border-b border-secondary/10 hover:border-primary transition-all cursor-pointer"
                        >
                          Details
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB: ORDERS ARCHIVE LIST */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {/* Internal Sub-Tabs inside the Orders section */}
              {!selectedOrder && (
                <div className="flex border-b border-slate-100 pb-px gap-6">
                  <button
                    onClick={() => setOrdersSubTab('history')}
                    className={`pb-3 text-xs font-black uppercase tracking-wider relative transition-all cursor-pointer ${
                      ordersSubTab === 'history' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    📝 Order History
                    {ordersSubTab === 'history' && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full animate-fade-in" />
                    )}
                  </button>
                  <button
                    onClick={() => setOrdersSubTab('tracking')}
                    className={`pb-3 text-xs font-black uppercase tracking-wider relative transition-all cursor-pointer ${
                      ordersSubTab === 'tracking' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    📍 Live Shipment Tracker
                    {ordersSubTab === 'tracking' && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full animate-fade-in" />
                    )}
                  </button>
                </div>
              )}

              {selectedOrder ? (
                <OrderDetailView 
                  order={selectedOrder} 
                  onBack={() => setSelectedOrder(null)} 
                />
              ) : ordersSubTab === 'history' ? (
                <OrderList 
                  orders={orders} 
                  onSelectOrder={(order) => setSelectedOrder(order)} 
                />
              ) : (
                <OrderTrackingTab 
                  orders={orders} 
                  onSelectOrder={(order) => {
                    setSelectedOrder(order);
                    setOrdersSubTab('history');
                  }} 
                />
              )}
            </div>
          )}

          {/* TAB: WISHLIST BOOKMARKS */}
          {activeTab === 'wishlist' && (
            <WishlistView 
              wishlistIds={customerProfile.wishlist || []} 
              onRemoveItem={(productId) => removeWishlistItem(productId)} 
              onViewProduct={(productId) => onViewProductLanding(productId)}
            />
          )}

          {/* TAB: ACC PORTAL SETTINGS */}
          {activeTab === 'settings' && (
            <AccountSettingsView 
              profile={customerProfile} 
              onUpdateProfile={updateProfile}
              onAddAddress={addAddress}
              onUpdateAddress={updateAddress}
              onDeleteAddress={deleteAddress}
              onDeleteAccount={deleteCustomerAccount}
            />
          )}

        </div>

      </div>

      {/* REVERSIBLE OUTBOX EMAIL PREVIEW DRAWER SLIDER POPUP (Right Edge) */}
      {showEmailOutbox && (
        <div className="fixed inset-0 z-[180] flex justify-end font-sans">
          
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEmailOutbox(false)} />
          
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-slate-100 animate-slide-in">
            
            {/* Header portion */}
            <div className="bg-secondary text-white p-5 flex justify-between items-center relative overflow-hidden shrink-0">
              <div className="absolute inset-0 grid-bg opacity-10" />
              <div className="relative z-10">
                <h3 className="font-display font-black text-base flex items-center gap-1.5">
                  <MailOpen className="text-cta animate-pulse" size={18} /> Simulated Mail Server Hub
                </h3>
                <p className="text-[10px] text-slate-300 mt-1 uppercase tracking-widest font-bold">Inspect triggered system notices</p>
              </div>
              <button 
                onClick={() => setShowEmailOutbox(false)}
                className="p-1 text-white hover:text-slate-200 relative z-10 bg-white/10 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Email ledger block */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Ledger history ({emails.length})</span>
                {emails.length > 0 && (
                  <button onClick={clearEmailLogs} className="text-[10px] font-bold text-red-500 hover:text-red-700">
                    Clear Logs
                  </button>
                )}
              </div>

              {emails.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-3xl">📭</span>
                  <p className="text-xs text-slate-400 mt-2 font-semibold">No emails dispatched in this session logs.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {emails.map((m) => (
                    <div 
                      key={m.id} 
                      onClick={() => setActiveOutboxMail(m)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        activeOutboxMail?.id === m.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex justify-between text-[9px] font-bold tracking-wide uppercase text-slate-400 mb-1">
                        <span>{m.type} notice</span>
                        <span>{m.timestamp}</span>
                      </div>
                      <h4 className="text-xs font-black text-secondary line-clamp-1">{m.subject}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium line-clamp-1">To: {m.to}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Email HTML Mock view area */}
            {activeOutboxMail && (
              <div className="h-[45%] bg-slate-50 border-t border-slate-200 p-4 overflow-y-auto flex flex-col shrink-0">
                <div className="flex justify-between items-start border-b border-slate-200 pb-2 mb-3">
                  <div>
                    <h5 className="text-xs font-black text-secondary">{activeOutboxMail.subject}</h5>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">To: {activeOutboxMail.to}</p>
                  </div>
                  <button onClick={() => setActiveOutboxMail(null)} className="text-[9px] font-bold text-slate-400 hover:text-slate-600">
                    Minimize
                  </button>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-slate-150 flex-1 whitespace-pre-wrap font-mono text-[10px] text-slate-600 leading-relaxed shadow-sm">
                  {activeOutboxMail.body}
                </div>
              </div>
            )}

            {/* Footer warning info */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 text-[10px] text-slate-450 text-center font-medium">
              We never spam. Outbox items represent mock developer preview envelopes.
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
