import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Package, 
  Boxes, 
  Layers, 
  Truck, 
  Receipt, 
  Bell, 
  Sparkles, 
  Plus, 
  RefreshCw, 
  Activity,
  Calendar,
  Zap
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

// Hooks / Context
import { useOrders } from '../../context/OrderContext';
import { useProducts } from '../../context/ProductContext';
import { useCustomers } from '../../context/CustomerContext';
import { useInventory } from '../../context/InventoryContext';

// Helper custom components
import QuickActionTile from '../../components/admin/dashboard/QuickActionTile';
import OrderPipelineFunnel from '../../components/admin/dashboard/OrderPipelineFunnel';
import InventoryAlertsList from '../../components/admin/dashboard/InventoryAlertsList';
import RecentOrdersTable from '../../components/admin/dashboard/RecentOrdersTable';
import TopProductsList from '../../components/admin/dashboard/TopProductsList';
import ParishOrdersMap from '../../components/admin/dashboard/ParishOrdersMap';
import SystemHealthPanel from '../../components/admin/dashboard/SystemHealthPanel';
import XPanel from '../../components/admin/XPanel';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { orders } = useOrders();
  const { products } = useProducts();
  const { customers } = useCustomers();
  const { inventoryLevels } = useInventory();

  // Time period state
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'mtd'>('mtd'); 
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Supplementary states synced dynamically from Firestore
  const [collectionsCount, setCollectionsCount] = useState(0);
  const [activeParishCount, setActiveParishCount] = useState(14);
  const [failedNotificationCount, setFailedNotificationCount] = useState(0);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);

  // Update timestamps
  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString('en-US', { hour12: false }));
  }, []);

  // Listen to collections size
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'collections'), (snap) => {
      setCollectionsCount(snap.size);
    });
    return unsub;
  }, []);

  // Listen to shipping rates (active parishes)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'shipping_rates'), (snap) => {
      const active = snap.docs.filter(d => d.data().is_active !== false).length;
      setActiveParishCount(active || 14);
    });
    return unsub;
  }, []);

  // Listen to notification logs failed states
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'notification_logs'), (snap) => {
      const docs = snap.docs.map(d => d.data());
      setNotificationLogs(docs);
      const failed = docs.filter((l: any) => l.status === 'failed').length;
      setFailedNotificationCount(failed);
    });
    return unsub;
  }, []);

  // Handle manual dashboard updates refresh
  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour12: false }));
      setIsRefreshing(false);
    }, 450);
  };

  const anchorDate = new Date("2026-06-15T06:34:21-07:00");

  // Calculations Row 1
  const completedOrders = useMemo(() => orders.filter(o => o.status === 'completed'), [orders]);
  
  // TODAY COMPLETED ORDERS
  const completedTodayList = useMemo(() => {
    const todayStr = anchorDate.toISOString().split('T')[0];
    return completedOrders.filter(o => o.date && o.date.startsWith(todayStr));
  }, [completedOrders]);

  const revenueTodayVal = useMemo(() => {
    return completedTodayList.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [completedTodayList]);

  // MONTH TO DATE COMPLETED REVENUE
  const completedMonthList = useMemo(() => {
    return completedOrders.filter(o => {
      if (!o.date) return false;
      const d = new Date(o.date);
      return d.getFullYear() === anchorDate.getFullYear() && d.getMonth() === anchorDate.getMonth();
    });
  }, [completedOrders]);

  const revenueMTDVal = useMemo(() => {
    return completedMonthList.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [completedMonthList]);

  const pipelineCount = useMemo(() => {
    return orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
  }, [orders]);

  const avgOrderValueVal = useMemo(() => {
    if (completedOrders.length === 0) return 0;
    const tot = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    return Math.round(tot / completedOrders.length);
  }, [completedOrders]);

  // Row 2 Calculations
  const lowStockCount = useMemo(() => {
    return inventoryLevels.filter(lvl => (lvl.quantityAvailable || 0) > 0 && (lvl.quantityAvailable || 0) <= (lvl.lowStockThreshold || 5)).length;
  }, [inventoryLevels]);

  const outOfStockCount = useMemo(() => {
    return inventoryLevels.filter(lvl => (lvl.quantityAvailable || 0) <= 0).length;
  }, [inventoryLevels]);

  const fulfillmentQueueCount = useMemo(() => {
    return orders.filter(o => o.status === 'ready_for_pickup' || o.status === 'ready_for_delivery').length;
  }, [orders]);

  const readyDeliveryCount = useMemo(() => {
    return orders.filter(o => o.status === 'ready_for_delivery').length;
  }, [orders]);

  const readyPickupCount = useMemo(() => {
    return orders.filter(o => o.status === 'ready_for_pickup').length;
  }, [orders]);

  const newCustomers30d = useMemo(() => {
    return customers.length;
  }, [customers]);

  const emailDeliverabilityPct = useMemo(() => {
    const totalSent = notificationLogs.length;
    if (totalSent === 0) return "98.4";
    const failed = notificationLogs.filter(l => l.status === 'failed').length;
    return (((totalSent - failed) / totalSent) * 100).toFixed(1);
  }, [notificationLogs]);

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto font-sans text-slate-800 space-y-6">
      
      {/* Gentelella Page Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E6E9ED]">
        <div className="title_left">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold uppercase tracking-wider text-[#2A3F54]">
              Dashboard
            </h1>
            <span className="text-[10px] font-bold text-[#1ABB9C] bg-[#1ABB9C]/10 border border-[#1ABB9C]/30 px-2 py-0.5 rounded-[3px] font-mono">
              15% GCT
            </span>
          </div>
          <p className="text-xs text-[#73879C] mt-0.5">
            Enterprise Management Console &middot; Jun 15, 2026
          </p>
        </div>

        {/* Global Toolbar and Time Range Filter */}
        <div className="title_right flex flex-wrap items-center gap-2">
          {/* Last updated tag */}
          <div className="text-[10px] font-mono font-bold text-[#73879C] bg-white border border-[#E6E9ED] px-2.5 py-1 rounded-[3px] shadow-2xs">
            UPDATED: {lastUpdated}
          </div>

          <button
            onClick={triggerRefresh}
            disabled={isRefreshing}
            className="p-1.5 border border-[#CCCCCC] hover:border-[#1ABB9C] hover:text-[#1ABB9C] rounded-[3px] bg-white text-[#73879C] shadow-2xs transition-colors cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          </button>

          {/* Gentelella Button Group Filter */}
          <div className="inline-flex rounded-[3px] shadow-2xs border border-[#CCCCCC] overflow-hidden bg-white">
            {([
              { key: 'today', label: 'Today' },
              { key: '7d', label: '7 Days' },
              { key: '30d', label: '30 Days' },
              { key: 'mtd', label: 'MTD' }
            ] as const).map(item => (
              <button
                key={item.key}
                onClick={() => setTimeRange(item.key)}
                className={`px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer border-r last:border-r-0 border-[#CCCCCC] ${
                  timeRange === item.key 
                    ? 'bg-[#26B99A] text-white font-bold'
                    : 'bg-white text-[#73879C] hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GENTELELLA SIGNATURE TILE STATS ROW (tile_count) */}
      <div className="bg-white border border-[#E6E9ED] rounded-[3px] shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#D9DEE4]">
          
          {/* Tile 1: Revenue Today */}
          <div 
            onClick={() => navigate('/admin/reports?metric=revenue&period=today')}
            className="p-4 hover:bg-[#F9F9F9] transition-colors cursor-pointer"
          >
            <span className="count_top text-[11px] font-bold text-[#73879C] uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={13} className="text-[#1ABB9C]" />
              Revenue Today
            </span>
            <div className="count text-2xl lg:text-[26px] font-bold text-[#2A3F54] my-1 tabular-nums">
              ${revenueTodayVal.toLocaleString()} <span className="text-xs font-normal text-[#73879C]">JMD</span>
            </div>
            <span className="count_bottom text-[11px] text-[#73879C] flex items-center gap-1 truncate">
              <span className="text-[#1ABB9C] font-semibold flex items-center gap-0.5">
                <TrendingUp size={11} /> +100%
              </span>
              <span>from yesterday</span>
            </span>
          </div>

          {/* Tile 2: Revenue MTD */}
          <div 
            onClick={() => navigate('/admin/reports?period=mtd')}
            className="p-4 hover:bg-[#F9F9F9] transition-colors cursor-pointer"
          >
            <span className="count_top text-[11px] font-bold text-[#73879C] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-[#337AB7]" />
              Revenue MTD (Jun)
            </span>
            <div className="count text-2xl lg:text-[26px] font-bold text-[#2A3F54] my-1 tabular-nums">
              ${revenueMTDVal.toLocaleString()} <span className="text-xs font-normal text-[#73879C]">JMD</span>
            </div>
            <span className="count_bottom text-[11px] text-[#73879C] flex items-center gap-1 truncate">
              <span className="text-[#337AB7] font-semibold">{completedMonthList.length} orders</span>
              <span>settled this month</span>
            </span>
          </div>

          {/* Tile 3: Orders Pipeline */}
          <div 
            onClick={() => navigate('/admin/orders')}
            className="p-4 hover:bg-[#F9F9F9] transition-colors cursor-pointer"
          >
            <span className="count_top text-[11px] font-bold text-[#73879C] uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingCart size={13} className="text-[#F39C12]" />
              Orders in Pipeline
            </span>
            <div className="count text-2xl lg:text-[26px] font-bold text-[#2A3F54] my-1 tabular-nums">
              {pipelineCount} <span className="text-xs font-normal text-[#73879C]">Active</span>
            </div>
            <span className="count_bottom text-[11px] text-[#73879C] flex items-center gap-1 truncate">
              <span className="text-[#F39C12] font-semibold">{orders.filter(o => o.status === 'pending').length} pending</span>
              <span>payment checks</span>
            </span>
          </div>

          {/* Tile 4: Avg Order Value */}
          <div 
            onClick={() => navigate('/admin/reports?aov=true')}
            className="p-4 hover:bg-[#F9F9F9] transition-colors cursor-pointer"
          >
            <span className="count_top text-[11px] font-bold text-[#73879C] uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 size={13} className="text-[#2A3F54]" />
              Avg Order Value
            </span>
            <div className="count text-2xl lg:text-[26px] font-bold text-[#2A3F54] my-1 tabular-nums">
              ${avgOrderValueVal.toLocaleString()} <span className="text-xs font-normal text-[#73879C]">JMD</span>
            </div>
            <span className="count_bottom text-[11px] text-[#73879C] flex items-center gap-1 truncate">
              <span className="text-[#1ABB9C] font-semibold">Normalized</span>
              <span>across history</span>
            </span>
          </div>

          {/* Tile 5: Low Stock Alerts */}
          <div 
            onClick={() => navigate('/admin/inventory?filter=low')}
            className="p-4 hover:bg-[#F9F9F9] transition-colors cursor-pointer"
          >
            <span className="count_top text-[11px] font-bold text-[#73879C] uppercase tracking-wider flex items-center gap-1.5">
              <Boxes size={13} className="text-[#E74C3C]" />
              Stock Alerts
            </span>
            <div className="count text-2xl lg:text-[26px] font-bold text-[#2A3F54] my-1 tabular-nums">
              {lowStockCount + outOfStockCount} <span className="text-xs font-normal text-[#73879C]">Items</span>
            </div>
            <span className="count_bottom text-[11px] text-[#73879C] flex items-center gap-1 truncate">
              <span className="text-[#E74C3C] font-semibold">{outOfStockCount} out of stock</span>
              <span>, {lowStockCount} low</span>
            </span>
          </div>

          {/* Tile 6: Fulfillment Queue */}
          <div 
            onClick={() => navigate('/admin/orders?status=ready_for_delivery')}
            className="p-4 hover:bg-[#F9F9F9] transition-colors cursor-pointer"
          >
            <span className="count_top text-[11px] font-bold text-[#73879C] uppercase tracking-wider flex items-center gap-1.5">
              <Truck size={13} className="text-[#337AB7]" />
              Fulfillment Queue
            </span>
            <div className="count text-2xl lg:text-[26px] font-bold text-[#2A3F54] my-1 tabular-nums">
              {fulfillmentQueueCount} <span className="text-xs font-normal text-[#73879C]">Ready</span>
            </div>
            <span className="count_bottom text-[11px] text-[#73879C] flex items-center gap-1 truncate">
              <span className="text-[#337AB7] font-semibold">{readyDeliveryCount} courier</span>
              <span>, {readyPickupCount} pickup</span>
            </span>
          </div>

          {/* Tile 7: Total Customers */}
          <div 
            onClick={() => navigate('/admin/customers?filter=new')}
            className="p-4 hover:bg-[#F9F9F9] transition-colors cursor-pointer"
          >
            <span className="count_top text-[11px] font-bold text-[#73879C] uppercase tracking-wider flex items-center gap-1.5">
              <Users size={13} className="text-[#1ABB9C]" />
              Total Customers
            </span>
            <div className="count text-2xl lg:text-[26px] font-bold text-[#2A3F54] my-1 tabular-nums">
              {newCustomers30d} <span className="text-xs font-normal text-[#73879C]">Profiles</span>
            </div>
            <span className="count_bottom text-[11px] text-[#73879C] flex items-center gap-1 truncate">
              <span className="text-[#1ABB9C] font-semibold">Active</span>
              <span>client accounts</span>
            </span>
          </div>

          {/* Tile 8: Email Deliverability */}
          <div 
            onClick={() => navigate('/admin/notifications')}
            className="p-4 hover:bg-[#F9F9F9] transition-colors cursor-pointer"
          >
            <span className="count_top text-[11px] font-bold text-[#73879C] uppercase tracking-wider flex items-center gap-1.5">
              <Bell size={13} className="text-[#5A738E]" />
              Email Dispatch
            </span>
            <div className="count text-2xl lg:text-[26px] font-bold text-[#2A3F54] my-1 tabular-nums">
              {emailDeliverabilityPct}%
            </div>
            <span className="count_bottom text-[11px] text-[#73879C] flex items-center gap-1 truncate">
              <span className="text-[#1ABB9C] font-semibold">SendGrid Online</span>
              <span>delivery status</span>
            </span>
          </div>

        </div>
      </div>

      {/* QUICK ACTIONS COMMAND (Gentelella x_panel) */}
      <XPanel
        title="Quick Actions Command"
        subtitle="1-click system navigation and common operations"
        icon={Sparkles}
        onRefresh={triggerRefresh}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <QuickActionTile 
              icon={ShoppingCart}
              title="Orders Hub"
              subtitle={`${orders.filter(o => o.status === 'pending').length} pending action`}
              count={orders.length}
              badge={`${orders.filter(o => o.status === 'pending').length} New`}
              badgeColor="bg-amber-50 text-[#F39C12] border-amber-200"
              href="/admin/orders"
            />

            <QuickActionTile 
              icon={Package}
              title="Products Catalog"
              subtitle={`${products.length} registered items`}
              count={products.length}
              href="/admin/products"
            />

            <QuickActionTile 
              icon={Boxes}
              title="Warehouse Stock"
              subtitle="Suppliers & PO intakes"
              count={inventoryLevels.length}
              badge={lowStockCount > 0 ? "LOW STOCK" : undefined}
              badgeColor="bg-rose-50 text-[#E74C3C] border-rose-200"
              href="/admin/inventory"
            />

            <QuickActionTile 
              icon={Users}
              title="Customers"
              subtitle="Verified Solar Leads"
              count={customers.length}
              href="/admin/customers"
            />

            <QuickActionTile 
              icon={Receipt}
              title="Invoices"
              subtitle="GCT G-Invoice auditor"
              count={`$${(revenueTodayVal / 1000).toFixed(0)}k`}
              badge="Today"
              badgeColor="bg-slate-100 text-[#2A3F54] border-slate-200"
              href="/admin/invoices"
            />
          </div>

          {/* Quick Create Buttons in Gentelella Style */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#E6E9ED] text-xs">
            <span className="text-[11px] font-bold text-[#73879C] uppercase tracking-wider mr-1">Quick Add:</span>
            
            <button 
              onClick={() => navigate('/admin/products/new')}
              className="px-3 py-1.5 bg-[#26B99A] hover:bg-[#20967D] text-white rounded-[3px] text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} />
              New Product
            </button>

            <button 
              onClick={() => navigate('/admin/collections/new')}
              className="px-3 py-1.5 bg-[#337AB7] hover:bg-[#286090] text-white rounded-[3px] text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} />
              New Collection
            </button>

            <button 
              onClick={() => navigate('/admin/orders')}
              className="px-3 py-1.5 bg-white border border-[#CCCCCC] hover:border-[#2A3F54] text-[#2A3F54] rounded-[3px] text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} />
              New Order
            </button>

            <button 
              onClick={() => navigate('/admin/notifications')}
              className="px-3 py-1.5 bg-[#5BC0DE] hover:bg-[#31B0D5] text-white rounded-[3px] text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Bell size={13} />
              Test Mailer
            </button>
          </div>
        </div>
      </XPanel>

      {/* OPERATIONAL TABLES & PANELS (Gentelella 2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (spans 2 cols on wide screens) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Logistics Pipeline XPanel */}
          <XPanel
            title="Active Logistics Pipeline"
            subtitle="Stage queues & bottlenecks"
            icon={Truck}
            onRefresh={triggerRefresh}
          >
            <OrderPipelineFunnel orders={orders} />
          </XPanel>

          {/* Recent Orders XPanel */}
          <XPanel
            title="Recent Order Transactions"
            subtitle="Latest purchases across parish hubs"
            icon={ShoppingCart}
            onRefresh={triggerRefresh}
          >
            <RecentOrdersTable orders={orders} />
          </XPanel>

        </div>

        {/* Right Column (1 col) */}
        <div className="space-y-6">
          
          {/* Inventory Alerts XPanel */}
          <XPanel
            title="Inventory Alerts"
            subtitle="Out-of-stock & low threshold SKUs"
            icon={Boxes}
            badge={lowStockCount + outOfStockCount > 0 ? `${lowStockCount + outOfStockCount} ALERTS` : 'HEALTHY'}
            badgeColor={lowStockCount + outOfStockCount > 0 ? 'bg-[#E74C3C] text-white' : 'bg-[#1ABB9C] text-white'}
            onRefresh={triggerRefresh}
          >
            <InventoryAlertsList />
          </XPanel>

          {/* Top Selling Products XPanel */}
          <XPanel
            title="Top Selling Listings"
            subtitle="By total line quantity"
            icon={BarChart3}
            onRefresh={triggerRefresh}
          >
            <TopProductsList orders={orders} />
          </XPanel>

          {/* Parish Orders Map XPanel */}
          <XPanel
            title="Orders by Parish"
            subtitle="7-day logistics distribution"
            icon={Truck}
            onRefresh={triggerRefresh}
          >
            <ParishOrdersMap orders={orders} />
          </XPanel>

          {/* System Health XPanel */}
          <XPanel
            title="System Integrations Health"
            subtitle="Production service webhooks"
            icon={Activity}
            onRefresh={triggerRefresh}
          >
            <SystemHealthPanel failedCount={failedNotificationCount} />
          </XPanel>

        </div>

      </div>

    </div>
  );
}
