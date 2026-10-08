import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Search, 
  Printer, 
  Receipt, 
  Eye, 
  X, 
  CheckCircle, 
  AlertCircle,
  SlidersHorizontal,
  RotateCcw,
  Calendar,
  DollarSign,
  Truck,
  ArrowUpDown,
  FileSpreadsheet,
  ChevronDown,
  Filter
} from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { Order } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import InvoiceMetricsDashboard, { InvoiceDatePreset } from '../../components/admin/invoices/InvoiceMetricsDashboard';

export default function AdminInvoices() {
  const { orders } = useOrders();
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Date filter state (controls both table and dashboard)
  const [datePreset, setDatePreset] = useState<InvoiceDatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState<'all' | 'delivered' | 'pending'>('all');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'total_desc' | 'total_asc' | 'id_asc'>('date_desc');

  // Date Filtering evaluator (shared by dashboard & table)
  const isOrderInDateRange = (o: Order, preset: InvoiceDatePreset, start: string, end: string): boolean => {
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

  // Orders filtered by active date range (for dashboard metrics)
  const dateFilteredOrders = useMemo(() => {
    return orders.filter(o => isOrderInDateRange(o, datePreset, startDate, endDate));
  }, [orders, datePreset, startDate, endDate]);

  // Extract unique payment gateways for advanced filter dropdown
  const uniqueGateways = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      const method = (o as any).paymentMethod || 'Fygaro Gateway';
      set.add(method);
    });
    return Array.from(set);
  }, [orders]);

  // Final filtered & sorted orders for the table
  const tableOrders = useMemo(() => {
    let result = dateFilteredOrders.filter(o => {
      // Search
      const matchesSearch = 
        !searchQuery ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.lineItems && o.lineItems.some(item => item.productName?.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        String(o.items || '').includes(searchQuery);

      if (!matchesSearch) return false;

      // Payment Status
      if (paymentStatusFilter === 'paid' && o.paymentStatus !== 'paid') return false;
      if (paymentStatusFilter === 'unpaid' && o.paymentStatus === 'paid') return false;

      // Fulfillment Status
      if (fulfillmentStatusFilter === 'delivered' && o.fulfillmentStatus !== 'fulfilled') return false;
      if (fulfillmentStatusFilter === 'pending' && o.fulfillmentStatus === 'fulfilled') return false;

      // Payment Gateway
      if (gatewayFilter !== 'all') {
        const method = (o as any).paymentMethod || 'Fygaro Gateway';
        if (method !== gatewayFilter) return false;
      }

      // Amount Range
      const total = o.total || 0;
      if (minAmount && total < parseFloat(minAmount)) return false;
      if (maxAmount && total > parseFloat(maxAmount)) return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date_desc') {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === 'date_asc') {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateA - dateB;
      }
      if (sortBy === 'total_desc') {
        return (b.total || 0) - (a.total || 0);
      }
      if (sortBy === 'total_asc') {
        return (a.total || 0) - (b.total || 0);
      }
      if (sortBy === 'id_asc') {
        return a.id.localeCompare(b.id);
      }
      return 0;
    });

    return result;
  }, [
    dateFilteredOrders, 
    searchQuery, 
    paymentStatusFilter, 
    fulfillmentStatusFilter, 
    gatewayFilter, 
    minAmount, 
    maxAmount, 
    sortBy
  ]);

  // Active filter count calculation
  const activeFiltersCount = [
    paymentStatusFilter !== 'all',
    fulfillmentStatusFilter !== 'all',
    gatewayFilter !== 'all',
    !!minAmount,
    !!maxAmount,
    datePreset !== 'all',
    sortBy !== 'date_desc',
    !!searchQuery
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSearchQuery('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setPaymentStatusFilter('all');
    setFulfillmentStatusFilter('all');
    setGatewayFilter('all');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('date_desc');
  };

  const triggerSystemPrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto font-sans" id="invoices-hub">
      
      {/* Page Header (Gentelella style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E6E9ED] pb-3 mb-5 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-[#2A3F54] uppercase flex items-center gap-2">
            <Receipt className="text-[#1ABB9C]" size={22} />
            Invoices
          </h1>
          <p className="text-xs text-[#73879C] mt-0.5">
            This page displays a list of all current orders with GCT 15% breakdown, payment audit status, and printable invoice sheets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2A3F54] bg-white border border-[#E6E9ED] hover:bg-[#F7F7F7] rounded-[3px] shadow-2xs transition-colors cursor-pointer"
            title="Print Invoices Report"
          >
            <Printer size={14} className="text-[#73879C]" />
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {/* Top Dashboard: Paid vs Unpaid, Delivery vs Pending, 4 Processing Metrics & Date Filter */}
      <InvoiceMetricsDashboard
        orders={orders}
        dateFilteredOrders={dateFilteredOrders}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        paymentStatusFilter={paymentStatusFilter}
        onPaymentStatusFilterChange={setPaymentStatusFilter}
        fulfillmentStatusFilter={fulfillmentStatusFilter}
        onFulfillmentStatusFilterChange={setFulfillmentStatusFilter}
      />

      {/* Main Invoices Table Card */}
      <div className="bg-white rounded-[3px] border border-[#E6E9ED] shadow-2xs overflow-hidden">
        
        {/* Table Top Toolbar */}
        <div className="p-3.5 sm:p-4 bg-[#F7F7F7] border-b border-[#E6E9ED] flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#73879C]" size={15} />
            <input
              type="text"
              placeholder="Search by Invoice #, customer name, email, items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#D9DEE4] rounded-[3px] py-1.5 pl-9 pr-3 text-xs focus:ring-1 focus:ring-[#1ABB9C] focus:border-[#1ABB9C] text-[#2A3F54] placeholder-[#73879C]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#73879C] hover:text-[#2A3F54]"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {/* Advanced Filters Toggle Button */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[3px] border transition-colors cursor-pointer shadow-2xs",
                showAdvancedFilters || activeFiltersCount > 0
                  ? "bg-[#2A3F54] text-white border-[#2A3F54]"
                  : "bg-white text-[#2A3F54] border-[#D9DEE4] hover:bg-[#F7F7F7]"
              )}
            >
              <SlidersHorizontal size={13} />
              <span>Advanced Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#1ABB9C] text-white font-mono leading-tight">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown size={12} className={cn("transition-transform duration-200", showAdvancedFilters && "rotate-180")} />
            </button>

            {/* Reset Filters */}
            {activeFiltersCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#E74C3C] hover:text-[#c0392b] bg-white border border-[#E6E9ED] hover:border-[#E74C3C] rounded-[3px] transition-colors cursor-pointer"
                title="Reset all search and filters"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}

            {/* Quick Count Info */}
            <div className="text-[11px] font-semibold text-[#73879C] px-2 hidden sm:block">
              Showing <span className="font-bold text-[#2A3F54]">{tableOrders.length}</span> of {orders.length}
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Filter Drawer Panel */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-b border-[#E6E9ED] bg-[#FCFCFD] overflow-hidden"
            >
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
                
                {/* 1. Payment Status Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#73879C] uppercase tracking-wider mb-1.5">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatusFilter}
                    onChange={e => setPaymentStatusFilter(e.target.value as any)}
                    className="w-full bg-white border border-[#D9DEE4] rounded-[3px] py-1.5 px-2.5 text-xs text-[#2A3F54] focus:ring-1 focus:ring-[#1ABB9C] focus:border-[#1ABB9C]"
                  >
                    <option value="all">All Payment Statuses</option>
                    <option value="paid">Paid (Settled)</option>
                    <option value="unpaid">Unpaid / Pending</option>
                  </select>
                </div>

                {/* 2. Fulfillment Status Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#73879C] uppercase tracking-wider mb-1.5">
                    Fulfillment Status
                  </label>
                  <select
                    value={fulfillmentStatusFilter}
                    onChange={e => setFulfillmentStatusFilter(e.target.value as any)}
                    className="w-full bg-white border border-[#D9DEE4] rounded-[3px] py-1.5 px-2.5 text-xs text-[#2A3F54] focus:ring-1 focus:ring-[#1ABB9C] focus:border-[#1ABB9C]"
                  >
                    <option value="all">All Fulfillment Statuses</option>
                    <option value="delivered">Delivered / Fulfilled</option>
                    <option value="pending">Pending Delivery / Pickup</option>
                  </select>
                </div>

                {/* 3. Payment Gateway Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#73879C] uppercase tracking-wider mb-1.5">
                    Payment Gateway
                  </label>
                  <select
                    value={gatewayFilter}
                    onChange={e => setGatewayFilter(e.target.value)}
                    className="w-full bg-white border border-[#D9DEE4] rounded-[3px] py-1.5 px-2.5 text-xs text-[#2A3F54] focus:ring-1 focus:ring-[#1ABB9C] focus:border-[#1ABB9C]"
                  >
                    <option value="all">All Gateways</option>
                    {uniqueGateways.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Min - Max Amount Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#73879C] uppercase tracking-wider mb-1.5">
                    Amount Range (JMD)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      placeholder="Min $"
                      value={minAmount}
                      onChange={e => setMinAmount(e.target.value)}
                      className="w-1/2 bg-white border border-[#D9DEE4] rounded-[3px] py-1.5 px-2 text-xs text-[#2A3F54] focus:ring-1 focus:ring-[#1ABB9C]"
                    />
                    <span className="text-[#73879C] font-mono">—</span>
                    <input
                      type="number"
                      placeholder="Max $"
                      value={maxAmount}
                      onChange={e => setMaxAmount(e.target.value)}
                      className="w-1/2 bg-white border border-[#D9DEE4] rounded-[3px] py-1.5 px-2 text-xs text-[#2A3F54] focus:ring-1 focus:ring-[#1ABB9C]"
                    />
                  </div>
                </div>

                {/* 5. Sort By */}
                <div>
                  <label className="block text-[11px] font-bold text-[#73879C] uppercase tracking-wider mb-1.5">
                    Sort Invoices By
                  </label>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="w-full bg-white border border-[#D9DEE4] rounded-[3px] py-1.5 px-2.5 text-xs text-[#2A3F54] focus:ring-1 focus:ring-[#1ABB9C] focus:border-[#1ABB9C]"
                  >
                    <option value="date_desc">Date: Newest First</option>
                    <option value="date_asc">Date: Oldest First</option>
                    <option value="total_desc">Grand Total: Highest First</option>
                    <option value="total_asc">Grand Total: Lowest First</option>
                    <option value="id_asc">Invoice Reference (A-Z)</option>
                  </select>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Directory Table Listing */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F7F7F7] text-[#73879C] text-[10px] uppercase font-bold tracking-wider font-mono border-b border-[#E6E9ED]">
              <tr>
                <th className="px-5 py-3.5">Invoice Reference</th>
                <th className="px-5 py-3.5">Date Issued</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5">Customer Designation</th>
                <th className="px-5 py-3.5 text-right">Pre-Tax Base</th>
                <th className="px-5 py-3.5 text-right">GCT Tax (15%)</th>
                <th className="px-5 py-3.5 text-right">Grand Total (JMD)</th>
                <th className="px-5 py-3.5 text-center">Gateway</th>
                <th className="px-5 py-3.5 text-center">Fulfillment</th>
                <th className="px-4 py-3.5 w-14 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E9ED] text-xs font-medium text-[#2A3F54]">
              {tableOrders.map((ord) => {
                // GCT Tax (15%) calculation splits
                const grandVal = ord.total || 0;
                const preTax = grandVal / 1.15;
                const gctVal = grandVal - preTax;
                const formattedDate = ord.date 
                  ? new Date(ord.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'N/A';

                return (
                  <tr key={ord.id} className="hover:bg-[#F9F9F9] transition-colors">
                    
                    {/* Invoice Reference */}
                    <td className="px-5 py-3.5 font-bold text-[#2A3F54] font-mono">
                      INV-{ord.id}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5 text-[11px] text-[#73879C] font-mono whitespace-nowrap">
                      {formattedDate}
                    </td>

                    {/* Payment Status */}
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[3px] text-[9px] font-bold uppercase font-mono tracking-wider border",
                        ord.paymentStatus === 'paid' 
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      )}>
                        {ord.paymentStatus === 'paid' ? (
                          <CheckCircle size={10} className="stroke-[2.5]" />
                        ) : (
                          <AlertCircle size={10} className="stroke-[2.5]" />
                        )}
                        {ord.paymentStatus}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-[#2A3F54] text-xs">{ord.customerName}</p>
                      <p className="text-[10px] text-[#73879C]">{ord.customerEmail}</p>
                    </td>

                    {/* Pre-Tax Base */}
                    <td className="px-5 py-3.5 text-right font-mono text-[#73879C] whitespace-nowrap">
                      ${preTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* GCT Tax (15%) */}
                    <td className="px-5 py-3.5 text-right font-mono text-[#D97706] font-semibold whitespace-nowrap">
                      ${gctVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Grand Total */}
                    <td className="px-5 py-3.5 text-right font-mono font-black text-[#2A3F54] whitespace-nowrap">
                      ${grandVal.toLocaleString()} JMD
                    </td>

                    {/* Payment Gateway */}
                    <td className="px-5 py-3.5 text-center font-mono uppercase text-[10px] text-[#73879C]">
                      {(ord as any).paymentMethod || 'Fygaro Gateway'}
                    </td>

                    {/* Fulfillment Status */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[9px] font-bold uppercase border",
                        ord.fulfillmentStatus === 'fulfilled' 
                          ? "bg-blue-50 text-blue-700 border-blue-200" 
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      )}>
                        {ord.fulfillmentStatus === 'fulfilled' ? 'Delivered' : 'Pending'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedInvoiceOrder(ord)}
                        className="p-1.5 border border-[#E6E9ED] bg-white hover:bg-[#1ABB9C] hover:text-white hover:border-[#1ABB9C] rounded-[3px] text-[#2A3F54] transition-colors shadow-2xs cursor-pointer"
                        title="Open full printable tax audit sheet"
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {tableOrders.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-14 text-center text-[#73879C]">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Receipt size={32} className="mx-auto text-slate-300 stroke-[1.5]" />
                      <p className="text-xs font-semibold text-[#2A3F54]">No matching invoices found</p>
                      <p className="text-[11px] text-[#73879C]">
                        Try adjusting your search query, date filter, or advanced filter criteria.
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={resetAllFilters}
                          className="mt-2 inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-[#1ABB9C] bg-emerald-50 border border-emerald-200 rounded-[3px] hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <RotateCcw size={11} />
                          Reset all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-[#F7F7F7] border-t border-[#E6E9ED] flex flex-col sm:flex-row items-center justify-between text-xs text-[#73879C] gap-2">
          <div className="font-mono text-[11px]">
            Displaying <span className="font-bold text-[#2A3F54]">{tableOrders.length}</span> invoices
            {datePreset !== 'all' && <span> for selected period</span>}
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>
              Total Displayed Base: <strong className="text-[#2A3F54]">${(tableOrders.reduce((s, o) => s + ((o.total || 0) / 1.15), 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })} JMD</strong>
            </span>
            <span>
              Total Displayed GCT: <strong className="text-[#D97706]">${(tableOrders.reduce((s, o) => s + ((o.total || 0) - (o.total || 0) / 1.15), 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })} JMD</strong>
            </span>
          </div>
        </div>

      </div>

      {/* DETAILED TAX INVOICE OVERLAY MODAL */}
      <AnimatePresence>
        {selectedInvoiceOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInvoiceOrder(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            {/* Modal Sheet Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-2xl bg-white border border-[#E6E9ED] rounded-[4px] shadow-2xl overflow-hidden z-20 flex flex-col justify-between max-h-[90vh]"
            >
              <div className="p-4 border-b border-[#E6E9ED] flex justify-between items-center bg-[#F7F7F7]">
                <div className="flex items-center gap-2">
                  <Receipt className="text-[#1ABB9C]" size={16} />
                  <span className="font-bold text-xs uppercase font-mono tracking-widest text-[#2A3F54]">
                    Official GCT Tax Invoice Preview
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={triggerSystemPrint}
                    className="p-1.5 border border-[#D9DEE4] bg-white hover:bg-[#F7F7F7] rounded-[3px] text-[#2A3F54] transition shadow-2xs cursor-pointer flex items-center gap-1 text-xs font-semibold"
                    title="Print corporate tax invoice"
                  >
                    <Printer size={13} />
                    <span>Print</span>
                  </button>
                  <button 
                    onClick={() => setSelectedInvoiceOrder(null)}
                    className="p-1.5 hover:bg-[#E6E9ED] rounded-[3px] text-[#73879C] hover:text-[#2A3F54] transition cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Renderable Body Sheet Compatible with window.print() */}
              <div className="p-8 text-left text-xs space-y-6 overflow-y-auto flex-1 font-sans print:p-0 print:border-none">
                {/* Invoice Letterhead */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-[#2A3F54] flex items-center gap-1.5 leading-none">
                      <Receipt className="text-[#1ABB9C] shrink-0" size={18} />
                      SAMKHI LIMITED
                    </h2>
                    <p className="font-semibold text-[#73879C]">Enterprise LED & Solar Solutions</p>
                    <p className="text-[#73879C]">12 Constant Spring Road, Kingston 10, Jamaica</p>
                    <p className="text-[#2A3F54] font-mono font-bold mt-1">GCT REGISTRATION: #121-507G</p>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="font-bold font-mono tracking-wider uppercase block text-[9px] text-[#73879C]">Tax Invoice Sheet</span>
                    <h3 className="font-black font-mono text-[#2A3F54] text-sm">INV-{selectedInvoiceOrder.id}</h3>
                    <p className="font-semibold text-[#73879C]">Order Ref: {selectedInvoiceOrder.id}</p>
                    <p className="text-[#73879C]">Date: {selectedInvoiceOrder.date || new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="border-t border-[#E6E9ED] my-4" />

                {/* Recipient Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="font-bold text-[9px] text-[#73879C] uppercase tracking-widest font-mono">Billed & Shipped To</span>
                    <p className="font-extrabold text-[#2A3F54] uppercase text-xs">{selectedInvoiceOrder.customerName}</p>
                    <p className="text-[#73879C] font-semibold">{selectedInvoiceOrder.customerEmail}</p>
                    <p className="text-[#73879C]">Delivery Parish: Kingston & St. Andrew, Jamaica</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="font-bold text-[9px] text-[#73879C] uppercase tracking-widest font-mono block">Payment Status</span>
                    <span className={cn(
                      "inline-flex items-center px-3 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider font-mono border",
                      selectedInvoiceOrder.paymentStatus === 'paid' 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                        : "bg-rose-50 text-rose-800 border-rose-200"
                    )}>
                      {selectedInvoiceOrder.paymentStatus}
                    </span>
                    <p className="text-[11px] text-[#73879C] font-mono font-semibold mt-1.5 uppercase">
                      Gateway: {(selectedInvoiceOrder as any).paymentMethod || 'Fygaro Gateway'}
                    </p>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-[#E6E9ED] rounded-[3px] overflow-hidden mt-6">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#F7F7F7] text-[10px] text-[#73879C] font-bold uppercase tracking-widest border-b border-[#E6E9ED]">
                      <tr>
                        <th className="px-4 py-2.5">Item Scope Description</th>
                        <th className="px-4 py-2.5 text-right w-24">QTY Units</th>
                        <th className="px-4 py-2.5 text-right w-36">Total (Tax Incl.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9ED]">
                      {selectedInvoiceOrder.lineItems && selectedInvoiceOrder.lineItems.length > 0 ? (
                        selectedInvoiceOrder.lineItems.map((item, idx) => (
                          <tr key={item.id || idx} className="font-medium text-[#2A3F54]">
                            <td className="px-4 py-3">
                              <p className="font-bold text-[#2A3F54]">{item.productName}</p>
                              {item.sku && <p className="text-[10px] text-[#73879C] font-mono">SKU: {item.sku}</p>}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold">{item.quantity}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold">
                              ${((item.price || 0) * (item.quantity || 1)).toLocaleString()} JMD
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="font-medium text-[#2A3F54]">
                          <td className="px-4 py-3">
                            <p className="font-bold text-[#2A3F54]">Commercial Solar / LED Hardware Package</p>
                            <p className="text-[10px] text-[#73879C]">Samkhi Renewable Power Hardware Specs Delivery ({selectedInvoiceOrder.items || 1} unit(s))</p>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold">{selectedInvoiceOrder.items || 1}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">${(selectedInvoiceOrder.total || 0).toLocaleString()} JMD</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* GCT 15% Breakdown Totals */}
                <div className="flex justify-end pt-3">
                  <div className="w-72 space-y-2 border-t border-[#E6E9ED] pt-3 font-semibold text-xs">
                    <div className="flex justify-between text-[#73879C]">
                      <span>Subtotal (Pre-Tax Base):</span>
                      <span className="font-mono text-[#2A3F54] font-bold">
                        ${((selectedInvoiceOrder.total || 0) / 1.15).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#73879C]">
                      <span>General Consumption Tax (15% GCT):</span>
                      <span className="font-mono text-[#D97706] font-bold">
                        ${((selectedInvoiceOrder.total || 0) - (selectedInvoiceOrder.total || 0) / 1.15).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-[#E6E9ED] pt-2 font-bold text-sm text-[#2A3F54]">
                      <span>Grand Total (JMD):</span>
                      <span className="font-mono text-[#1ABB9C] font-black text-base">
                        ${(selectedInvoiceOrder.total || 0).toLocaleString()} JMD
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="pt-6 text-center text-[10px] text-[#73879C] bg-[#F7F7F7] p-3 -mx-8 -mb-8 rounded-b-[3px] border-t border-[#E6E9ED]">
                  <p className="font-bold text-[#2A3F54]">OFFICIAL GENERAL CONSUMPTION TAX (GCT) RECEIPT</p>
                  <p className="mt-0.5">Please retain this receipt for corporate tax audit purposes. Subject to Jamaican revenue stamp and consumer warranty laws.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
