import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../../context/OrderContext';
import { Search, SlidersHorizontal, ChevronDown, Download, Printer, Filter, Check, X, Zap, XCircle, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import OrderStatusBadge from '../../components/admin/OrderStatusBadge';
import { OrderStatus, Order } from '../../types';
import { ORDER_STATUSES, getStatusConfig } from '../../lib/orderStatus';
import BulkActionBar from '../../components/admin/BulkActionBar';
import { showToast } from '../../lib/toast';
import OrderMetricsDashboard, { DatePreset } from '../../components/admin/orders/OrderMetricsDashboard';

export default function AdminOrders() {
  const navigate = useNavigate();
  const { orders, updateOrder } = useOrders();
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const selectedCount = Object.keys(selectedIds).filter(id => selectedIds[id]).length;

  const handleBulkStatusUpdate = async (status: OrderStatus) => {
    setBulkLoading(true);
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    try {
      await Promise.all(ids.map(id => updateOrder(id, { status })));
      showToast(`Successfully updated ${ids.length} orders to ${status}!`, 'success');
      setSelectedIds({});
    } catch (e) {
      showToast('Logistics error batch updating orders.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkPaymentUpdate = async (paymentStatus: 'paid' | 'pending' | 'refunded') => {
    setBulkLoading(true);
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    try {
      await Promise.all(ids.map(id => updateOrder(id, { paymentStatus })));
      showToast(`Successfully marked ${ids.length} orders as ${paymentStatus}!`, 'success');
      setSelectedIds({});
    } catch (e) {
      showToast('Payment audit batch operation failed.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkCancelRefund = async () => {
    setBulkLoading(true);
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    try {
      await Promise.all(ids.map(id => updateOrder(id, { status: 'cancelled', paymentStatus: 'refunded' })));
      showToast(`Cancelled & Refunded ${ids.length} orders!`, 'success');
      setSelectedIds({});
    } catch (e) {
      showToast('Error aborting selected orders.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };
  
  // Tab states: All, Pending, In Progress (payment_confirmed, picked, packed), Ready (ready_for_pickup, ready_for_delivery), Completed, Cancelled
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'In Progress' | 'Ready' | 'Completed' | 'Cancelled'>('All');
  const [search, setSearch] = useState('');
  
  // Date filter state (controls both the dashboard report and the table)
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Extensible status checks (the 8 status keys)
  const [selectedStatuses, setSelectedStatuses] = useState<OrderStatus[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const tabs = ['All', 'Pending', 'In Progress', 'Ready', 'Completed', 'Cancelled'] as const;

  // Parish Extractor from Location
  const getParish = (location?: string) => {
    if (!location) return 'Westmoreland';
    const parts = location.split(',');
    const rawParish = parts[parts.length - 1]?.trim() || 'Westmoreland';
    return rawParish === 'Jamaica' ? 'St. James' : rawParish;
  };

  // Date Filtering evaluator
  const isOrderInDateRange = (o: Order, preset: DatePreset, start: string, end: string): boolean => {
    if (preset === 'all') return true;
    if (!o.date) return false;

    const orderDate = new Date(o.date);
    if (isNaN(orderDate.getTime())) return false;

    const now = new Date();

    if (preset === 'today') {
      return (
        orderDate.getFullYear() === now.getFullYear() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getDate() === now.getDate()
      );
    }

    if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return (
        orderDate.getFullYear() === yesterday.getFullYear() &&
        orderDate.getMonth() === yesterday.getMonth() &&
        orderDate.getDate() === yesterday.getDate()
      );
    }

    if (preset === '7d') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return orderDate >= sevenDaysAgo;
    }

    if (preset === '30d') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      return orderDate >= thirtyDaysAgo;
    }

    if (preset === 'this_month') {
      return (
        orderDate.getFullYear() === now.getFullYear() &&
        orderDate.getMonth() === now.getMonth()
      );
    }

    if (preset === 'custom') {
      if (start) {
        const s = new Date(start);
        s.setHours(0, 0, 0, 0);
        if (orderDate < s) return false;
      }
      if (end) {
        const e = new Date(end);
        e.setHours(23, 59, 59, 999);
        if (orderDate > e) return false;
      }
      return true;
    }

    return true;
  };

  // Orders filtered by the active date range (shared by dashboard metrics and table)
  const dateFilteredOrders = orders.filter(o => isOrderInDateRange(o, datePreset, startDate, endDate));

  const filteredOrders = dateFilteredOrders.filter(o => {
    // Search
    const matchesSearch = 
      o.customerName.toLowerCase().includes(search.toLowerCase()) || 
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      (o.fulfillmentLocation && o.fulfillmentLocation.toLowerCase().includes(search.toLowerCase()));
    
    // Tabs filtering
    let matchesTab = true;
    const status = o.status || 'pending';
    if (activeTab === 'Pending') {
      matchesTab = status === 'pending';
    } else if (activeTab === 'In Progress') {
      matchesTab = status === 'payment_confirmed' || status === 'picked' || status === 'packed';
    } else if (activeTab === 'Ready') {
      matchesTab = status === 'ready_for_pickup' || status === 'ready_for_delivery';
    } else if (activeTab === 'Completed') {
      matchesTab = status === 'completed';
    } else if (activeTab === 'Cancelled') {
      matchesTab = status === 'cancelled';
    }

    // Advanced filters
    const matchesExactStatus = selectedStatuses.length === 0 || selectedStatuses.includes(status);
    const matchesPayment = paymentStatuses.length === 0 || paymentStatuses.includes(o.paymentStatus);

    return matchesSearch && matchesTab && matchesExactStatus && matchesPayment;
  });

  const getPaymentStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-50 text-emerald-800 border-emerald-200/50';
      case 'pending': return 'bg-amber-50 text-amber-800 border-amber-200/50';
      case 'refunded': return 'bg-rose-50 text-rose-800 border-rose-200/50';
      default: return 'bg-slate-50 text-slate-600 border-slate-200/50';
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto font-sans">
      
      {/* Page Header (Gentelella style) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 mb-5 border-b border-[#E6E9ED]">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-[#2A3F54] uppercase">Order Operations</h1>
          <p className="text-[#73879C] text-xs mt-0.5">Enterprise logistics panel for full order status workflow, payment audits, and overrides.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-[#CCCCCC] hover:border-[#2A3F54] h-9 px-3 rounded-[3px] hover:bg-slate-50 text-[#2A3F54] transition-colors cursor-pointer shadow-2xs" title="Print Orders">
            <Printer size={15} />
          </button>
          <button className="bg-white border border-[#CCCCCC] hover:border-[#2A3F54] text-[#2A3F54] h-9 px-3.5 rounded-[3px] text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs">
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Metrics Dashboard & Date Filter (top dashboard below order operations and subheadline) */}
      <OrderMetricsDashboard
        orders={orders}
        dateFilteredOrders={dateFilteredOrders}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        activeTab={activeTab}
        onTabSelect={setActiveTab}
      />

      {/* Main Table Card */}
      <div className="bg-white rounded-[3px] border border-[#E6E9ED] shadow-xs overflow-hidden">
        
        {/* Tab Headers */}
        <div className="flex border-b border-[#E6E9ED] px-2 overflow-x-auto no-scrollbar bg-[#F9F9F9]">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap uppercase tracking-wider cursor-pointer",
                activeTab === tab 
                  ? "border-[#1ABB9C] text-[#1ABB9C] bg-white" 
                  : "border-transparent text-[#73879C] hover:text-[#2A3F54] hover:bg-slate-100/50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-slate-50/40 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450" size={15} />
            <input 
              type="text" 
              placeholder="Search via Order #ID, Customer Name, or Address Parish..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl h-11 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-black placeholder:text-slate-400 transition-all"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "bg-white border text-slate-700 h-11 px-4 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer select-none border-slate-200",
                showFilters && "bg-slate-100 border-slate-350"
              )}
            >
              <SlidersHorizontal size={15} className="text-slate-500" />
              Advanced Filters
              {(selectedStatuses.length > 0 || paymentStatuses.length > 0) && (
                <span className="bg-black text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">
                  {selectedStatuses.length + paymentStatuses.length}
                </span>
              )}
            </button>

            {(selectedStatuses.length > 0 || paymentStatuses.length > 0 || search || activeTab !== 'All' || datePreset !== 'all') && (
              <button 
                onClick={() => {
                  setSelectedStatuses([]);
                  setPaymentStatuses([]);
                  setSearch('');
                  setActiveTab('All');
                  setDatePreset('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-slate-500 hover:text-slate-800 text-xs font-bold px-3 py-1 cursor-pointer"
              >
                Reset All
              </button>
            )}
          </div>
        </div>

        {/* Filters Drawer Dropdown */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-200 bg-slate-50/20"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
                
                {/* 1. Precise 8 status check filters */}
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Filter by Pipeline Stage (8 stages)</h3>
                  <div className="flex flex-wrap gap-2">
                    {ORDER_STATUSES.map(config => {
                      const isChecked = selectedStatuses.includes(config.key);
                      return (
                        <label 
                          key={config.key}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold cursor-pointer transition-all select-none hover:shadow-sm",
                            isChecked 
                              ? "bg-black text-white border-black" 
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                          )}
                        >
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedStatuses(selectedStatuses.filter(s => s !== config.key));
                              } else {
                                setSelectedStatuses([...selectedStatuses, config.key]);
                              }
                            }}
                          />
                          <config.icon size={11} className={isChecked ? "text-white" : "text-slate-500"} />
                          <span>{config.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Legacy Payment status filter */}
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Filter by Payment Audit</h3>
                  <div className="flex flex-wrap gap-2">
                    {['pending', 'paid', 'refunded'].map(status => {
                      const isChecked = paymentStatuses.includes(status);
                      return (
                        <label 
                          key={status}
                          className={cn(
                            "flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] font-bold cursor-pointer transition-all select-none hover:shadow-sm",
                            isChecked 
                              ? "bg-black text-white border-black" 
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                          )}
                        >
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setPaymentStatuses(paymentStatuses.filter(s => s !== status));
                              } else {
                                setPaymentStatuses([...paymentStatuses, status]);
                              }
                            }}
                          />
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            status === 'paid' ? 'bg-emerald-505' : status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'
                          )} />
                          <span className="capitalize">{status}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ENTERPRISE REAL-TIME SYNCD ORDER TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-widest border-b border-slate-200/60 select-none">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 accent-black cursor-pointer"
                    checked={filteredOrders.length > 0 && filteredOrders.every(o => !!selectedIds[o.id])}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const nextSel = { ...selectedIds };
                      filteredOrders.forEach(o => {
                        nextSel[o.id] = checked;
                      });
                      setSelectedIds(nextSel);
                    }}
                  />
                </th>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Order Date</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Parish</th>
                <th className="px-6 py-4 text-right">Total Cost</th>
                <th className="px-6 py-4">Process State</th>
                <th className="px-6 py-4 md:w-32">Billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const parish = getParish(order.fulfillmentLocation);
                
                return (
                  <tr 
                    key={order.id} 
                    onClick={() => navigate(`/admin/orders/${order.id.replace('#', '')}`)}
                    className="hover:bg-slate-50/50 transition-all duration-150 group cursor-pointer text-xs font-medium border-b border-slate-100"
                  >
                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 accent-black cursor-pointer"
                        checked={!!selectedIds[order.id]}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedIds(prev => ({ ...prev, [order.id]: checked }));
                        }}
                      />
                    </td>
                    <td className="px-6 py-5 font-black font-mono text-slate-900 group-hover:text-amber-600 transition-colors">
                      {order.id}
                    </td>
                    <td className="px-6 py-5 text-slate-450 font-bold">
                      {order.date}
                    </td>
                    <td className="px-6 py-5 text-slate-800 font-extrabold">
                      {order.customerName}
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-bold text-slate-650 tracking-tight">{parish}</span>
                    </td>
                    <td className="px-6 py-5 text-right tabular-nums font-black font-mono text-slate-900 text-sm">
                      ${(order.total || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-black font-sans tracking-wide">JMD</span>
                    </td>
                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                      <OrderStatusBadge 
                        status={order.status || 'pending'} 
                        orderId={order.id} 
                        fulfillmentMethod={order.fulfillment_method || 'pickup'}
                        interactive={true} 
                        size="sm" 
                      />
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                        getPaymentStatusStyle(order.paymentStatus)
                      )}>
                        {order.paymentStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="p-20 text-center text-slate-400 bg-white text-xs font-bold leading-normal">
              No real-time synchronization orders matched active queries.
            </div>
          )}
        </div>
      </div>

      {/* Unified Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedCount}
        totalCount={orders.length}
        onClearSelection={() => setSelectedIds({})}
        onSelectAllPages={() => {
          const nextSel: Record<string, boolean> = {};
          orders.forEach(o => {
            nextSel[o.id] = true;
          });
          setSelectedIds(nextSel);
          showToast(`Selected all ${orders.length} orders across all pages!`, 'success');
        }}
        isAllPagesSelected={orders.length > 0 && orders.every(o => !!selectedIds[o.id])}
        loading={bulkLoading}
        loadingMessage="Routing logistics..."
        actions={[
          {
            id: 'mark_paid',
            label: 'Mark Paid',
            icon: CheckCircle2,
            variant: 'success' as const,
            onClick: () => handleBulkPaymentUpdate('paid')
          },
          {
            id: 'mark_pending',
            label: 'Pending Audit',
            icon: Zap,
            onClick: () => handleBulkPaymentUpdate('pending')
          },
          {
            id: 'mark_refunded',
            label: 'Mark Refunded',
            icon: XCircle,
            onClick: () => handleBulkPaymentUpdate('refunded')
          },
          {
            id: 'state_payment_confirmed',
            label: 'Confirm Payment',
            icon: Check,
            onClick: () => handleBulkStatusUpdate('payment_confirmed')
          },
          {
            id: 'state_packed',
            label: 'Mark Packed',
            icon: Zap,
            onClick: () => handleBulkStatusUpdate('packed')
          },
          {
            id: 'state_ready_pickup',
            label: 'Ready Pickup',
            icon: CheckCircle2,
            onClick: () => handleBulkStatusUpdate('ready_for_pickup')
          },
          {
            id: 'state_ready_delivery',
            label: 'Ready Delivery',
            icon: CheckCircle2,
            onClick: () => handleBulkStatusUpdate('ready_for_delivery')
          },
          {
            id: 'state_completed',
            label: 'Complete Status',
            icon: CheckCircle2,
            onClick: () => handleBulkStatusUpdate('completed')
          },
          {
            id: 'cancel',
            label: 'Cancel & Refund',
            icon: Trash2,
            variant: 'danger' as const,
            requiresConfirm: true,
            confirmTitle: 'Cancel Selected Orders?',
            confirmMessage: `Are you absolutely sure you want to cancel and refund these ${selectedCount} checked orders? This action overrides active logistics pipelines and releases inventory.`,
            onClick: handleBulkCancelRefund
          }
        ]}
      />
    </div>
  );
}
