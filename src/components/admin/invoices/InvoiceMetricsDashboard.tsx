import React from 'react';
import { 
  Calendar, 
  RotateCcw, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  Clock, 
  DollarSign, 
  Receipt, 
  Coins, 
  TrendingUp,
  Percent
} from 'lucide-react';
import { Order } from '../../../types';
import { cn } from '../../../lib/utils';

export type InvoiceDatePreset = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'custom';

export interface InvoiceMetricsDashboardProps {
  orders: Order[];
  dateFilteredOrders: Order[];
  datePreset: InvoiceDatePreset;
  onDatePresetChange: (preset: InvoiceDatePreset) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  paymentStatusFilter: 'all' | 'paid' | 'unpaid';
  onPaymentStatusFilterChange: (status: 'all' | 'paid' | 'unpaid') => void;
  fulfillmentStatusFilter: 'all' | 'delivered' | 'pending';
  onFulfillmentStatusFilterChange: (status: 'all' | 'delivered' | 'pending') => void;
}

export default function InvoiceMetricsDashboard({
  orders,
  dateFilteredOrders,
  datePreset,
  onDatePresetChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  paymentStatusFilter,
  onPaymentStatusFilterChange,
  fulfillmentStatusFilter,
  onFulfillmentStatusFilterChange,
}: InvoiceMetricsDashboardProps) {
  // 1. Paid vs Unpaid Invoices
  const paidOrders = dateFilteredOrders.filter(o => o.paymentStatus === 'paid');
  const unpaidOrders = dateFilteredOrders.filter(o => o.paymentStatus !== 'paid');
  const paidCount = paidOrders.length;
  const unpaidCount = unpaidOrders.length;
  const paidPercentage = dateFilteredOrders.length > 0 
    ? Math.round((paidCount / dateFilteredOrders.length) * 100) 
    : 0;

  // 2. Delivery vs Pending
  const deliveredOrders = dateFilteredOrders.filter(o => o.fulfillmentStatus === 'fulfilled');
  const pendingDeliveryOrders = dateFilteredOrders.filter(o => o.fulfillmentStatus !== 'fulfilled');
  const deliveredCount = deliveredOrders.length;
  const pendingDeliveryCount = pendingDeliveryOrders.length;
  const deliveredPercentage = dateFilteredOrders.length > 0 
    ? Math.round((deliveredCount / dateFilteredOrders.length) * 100) 
    : 0;

  // 3-6. Four Key Processing Metrics
  const grossInvoicedTotal = dateFilteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const preTaxBaseTotal = grossInvoicedTotal / 1.15;
  const gctTaxTotal = grossInvoicedTotal - preTaxBaseTotal;
  const averageInvoiceValue = dateFilteredOrders.length > 0 
    ? Math.round(grossInvoicedTotal / dateFilteredOrders.length) 
    : 0;

  const presetLabels: Record<InvoiceDatePreset, string> = {
    all: 'All Time',
    today: 'Today',
    yesterday: 'Yesterday',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    this_month: 'This Month',
    custom: 'Custom Range'
  };

  return (
    <div className="bg-white rounded-[3px] border border-[#E6E9ED] shadow-2xs mb-6 overflow-hidden">
      {/* Header Bar with Date Range Filter */}
      <div className="p-3.5 sm:p-4 bg-[#F7F7F7] border-b border-[#E6E9ED] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[3px] bg-[#2A3F54] text-white flex items-center justify-center shrink-0">
            <Receipt size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#2A3F54] uppercase tracking-wider">
              Invoices & GCT Tax Processing Dashboard
            </h3>
            <p className="text-[11px] text-[#73879C]">
              {datePreset === 'all' ? (
                <>Auditing all {orders.length} historical invoices</>
              ) : (
                <>Auditing {dateFilteredOrders.length} of {orders.length} invoices for <span className="font-semibold text-[#2A3F54]">{presetLabels[datePreset]}</span></>
              )}
            </p>
          </div>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-[#D9DEE4] rounded-[3px] px-2.5 py-1.5 shadow-2xs">
            <Calendar size={13} className="text-[#73879C]" />
            <span className="text-[11px] font-bold text-[#73879C] uppercase tracking-wider">Period:</span>
            <select
              value={datePreset}
              onChange={(e) => onDatePresetChange(e.target.value as InvoiceDatePreset)}
              aria-label="Filter invoices by date range"
              className="text-xs font-semibold text-[#2A3F54] bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer pr-1"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range...</option>
            </select>
          </div>

          {/* Custom Date Inputs if Custom is selected */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 bg-white border border-[#D9DEE4] rounded-[3px] px-2 py-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                placeholder="From"
                className="text-xs text-[#2A3F54] border-0 focus:outline-none focus:ring-0"
              />
              <span className="text-xs text-[#73879C]">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                placeholder="To"
                className="text-xs text-[#2A3F54] border-0 focus:outline-none focus:ring-0"
              />
            </div>
          )}

          {/* Reset button if date filter is active */}
          {datePreset !== 'all' && (
            <button
              onClick={() => {
                onDatePresetChange('all');
                onStartDateChange('');
                onEndDateChange('');
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E74C3C] hover:text-[#c0392b] bg-white border border-[#E6E9ED] hover:border-[#E74C3C] px-2.5 py-1.5 rounded-[3px] transition-colors cursor-pointer"
              title="Reset date filter to All Time"
            >
              <RotateCcw size={11} />
              Reset Date
            </button>
          )}
        </div>
      </div>

      {/* 6 Key Metrics Grid */}
      <div className="p-3.5 sm:p-4 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          
          {/* Metric 1: Paid vs Unpaid Invoices */}
          <div 
            onClick={() => {
              // Cycle through filters: all -> paid -> unpaid -> all
              if (paymentStatusFilter === 'all') onPaymentStatusFilterChange('paid');
              else if (paymentStatusFilter === 'paid') onPaymentStatusFilterChange('unpaid');
              else onPaymentStatusFilterChange('all');
            }}
            className={cn(
              "p-3.5 rounded-[3px] border transition-all duration-150 flex flex-col justify-between cursor-pointer group hover:shadow-xs",
              paymentStatusFilter !== 'all'
                ? "ring-2 ring-[#1ABB9C] border-[#1ABB9C] bg-emerald-50/20"
                : "border-[#E6E9ED] bg-white hover:border-[#CCCCCC]"
            )}
            title="Click to filter table by Paid / Unpaid"
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="w-7 h-7 rounded-[3px] bg-emerald-50 text-[#1ABB9C] border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 size={15} className="stroke-[2.2]" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[3px] bg-emerald-100/70 text-emerald-800 border border-emerald-200 font-mono">
                {paidPercentage}% Paid
              </span>
            </div>

            <div className="my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-[26px] font-black font-mono text-[#2A3F54] tabular-nums">
                  {paidCount}
                </span>
                <span className="text-xs font-bold text-emerald-700 font-mono">Paid</span>
                <span className="text-slate-300 mx-0.5 font-light">/</span>
                <span className="text-lg font-black font-mono text-[#E74C3C] tabular-nums">
                  {unpaidCount}
                </span>
                <span className="text-xs font-bold text-rose-600 font-mono">Unpaid</span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-[#F2F2F2]">
              <div className="text-[11px] font-bold text-[#2A3F54] uppercase tracking-wider flex items-center justify-between">
                <span>Payment Status</span>
                {paymentStatusFilter !== 'all' && (
                  <span className="text-[9px] font-bold uppercase text-[#1ABB9C] font-mono">
                    Filter: {paymentStatusFilter}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#73879C]">
                {unpaidCount > 0 ? `${unpaidCount} pending settlement` : 'All invoices settled'}
              </div>
            </div>
          </div>

          {/* Metric 2: Delivery Status vs Pending */}
          <div 
            onClick={() => {
              if (fulfillmentStatusFilter === 'all') onFulfillmentStatusFilterChange('delivered');
              else if (fulfillmentStatusFilter === 'delivered') onFulfillmentStatusFilterChange('pending');
              else onFulfillmentStatusFilterChange('all');
            }}
            className={cn(
              "p-3.5 rounded-[3px] border transition-all duration-150 flex flex-col justify-between cursor-pointer group hover:shadow-xs",
              fulfillmentStatusFilter !== 'all'
                ? "ring-2 ring-[#337AB7] border-[#337AB7] bg-blue-50/20"
                : "border-[#E6E9ED] bg-white hover:border-[#CCCCCC]"
            )}
            title="Click to filter table by Delivered / Pending"
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="w-7 h-7 rounded-[3px] bg-blue-50 text-[#337AB7] border border-blue-200 flex items-center justify-center">
                <Truck size={15} className="stroke-[2.2]" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[3px] bg-blue-100/70 text-blue-800 border border-blue-200 font-mono">
                {deliveredPercentage}% Fulfilled
              </span>
            </div>

            <div className="my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-[26px] font-black font-mono text-[#2A3F54] tabular-nums">
                  {deliveredCount}
                </span>
                <span className="text-xs font-bold text-blue-700 font-mono">Delivered</span>
                <span className="text-slate-300 mx-0.5 font-light">/</span>
                <span className="text-lg font-black font-mono text-[#F39C12] tabular-nums">
                  {pendingDeliveryCount}
                </span>
                <span className="text-xs font-bold text-amber-600 font-mono">Pending</span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-[#F2F2F2]">
              <div className="text-[11px] font-bold text-[#2A3F54] uppercase tracking-wider flex items-center justify-between">
                <span>Fulfillment Status</span>
                {fulfillmentStatusFilter !== 'all' && (
                  <span className="text-[9px] font-bold uppercase text-[#337AB7] font-mono">
                    Filter: {fulfillmentStatusFilter}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#73879C]">
                {pendingDeliveryCount > 0 ? `${pendingDeliveryCount} in dispatch queue` : 'All deliveries complete'}
              </div>
            </div>
          </div>

          {/* Metric 3 (Processing): Total Invoiced / Gross Revenue */}
          <div className="p-3.5 rounded-[3px] border border-[#E6E9ED] bg-white hover:border-[#CCCCCC] transition-all duration-150 flex flex-col justify-between group hover:shadow-xs">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="w-7 h-7 rounded-[3px] bg-slate-100 text-[#2A3F54] border border-slate-200 flex items-center justify-center">
                <DollarSign size={15} className="stroke-[2.2]" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[3px] bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                Gross JMD
              </span>
            </div>

            <div className="my-1">
              <div className="text-xl sm:text-2xl font-black font-mono text-[#2A3F54] tabular-nums leading-tight truncate">
                ${grossInvoicedTotal.toLocaleString()}
              </div>
            </div>

            <div className="pt-1.5 border-t border-[#F2F2F2]">
              <div className="text-[11px] font-bold text-[#2A3F54] uppercase tracking-wider truncate">
                Total Invoiced
              </div>
              <div className="text-[10px] text-[#73879C] truncate">
                Gross billed sales value
              </div>
            </div>
          </div>

          {/* Metric 4 (Processing): Pre-Tax Base Revenue */}
          <div className="p-3.5 rounded-[3px] border border-[#E6E9ED] bg-white hover:border-[#CCCCCC] transition-all duration-150 flex flex-col justify-between group hover:shadow-xs">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="w-7 h-7 rounded-[3px] bg-sky-50 text-[#0284C7] border border-sky-200 flex items-center justify-center">
                <Coins size={15} className="stroke-[2.2]" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[3px] bg-sky-100 text-sky-800 border border-sky-200 font-mono">
                Taxable Base
              </span>
            </div>

            <div className="my-1">
              <div className="text-xl sm:text-2xl font-black font-mono text-[#0284C7] tabular-nums leading-tight truncate">
                ${preTaxBaseTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="pt-1.5 border-t border-[#F2F2F2]">
              <div className="text-[11px] font-bold text-[#2A3F54] uppercase tracking-wider truncate">
                Pre-Tax Base
              </div>
              <div className="text-[10px] text-[#73879C] truncate">
                Net taxable commercial sales
              </div>
            </div>
          </div>

          {/* Metric 5 (Processing): GCT Tax Accrual (15%) */}
          <div className="p-3.5 rounded-[3px] border border-[#E6E9ED] bg-white hover:border-[#CCCCCC] transition-all duration-150 flex flex-col justify-between group hover:shadow-xs">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="w-7 h-7 rounded-[3px] bg-amber-50 text-[#D97706] border border-amber-200 flex items-center justify-center">
                <Percent size={15} className="stroke-[2.2]" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[3px] bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                15% GCT
              </span>
            </div>

            <div className="my-1">
              <div className="text-xl sm:text-2xl font-black font-mono text-[#D97706] tabular-nums leading-tight truncate">
                ${gctTaxTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="pt-1.5 border-t border-[#F2F2F2]">
              <div className="text-[11px] font-bold text-[#2A3F54] uppercase tracking-wider truncate">
                GCT Tax (15%)
              </div>
              <div className="text-[10px] text-[#73879C] truncate">
                General Consumption Tax
              </div>
            </div>
          </div>

          {/* Metric 6 (Processing): Average Invoice Value */}
          <div className="p-3.5 rounded-[3px] border border-[#E6E9ED] bg-white hover:border-[#CCCCCC] transition-all duration-150 flex flex-col justify-between group hover:shadow-xs">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="w-7 h-7 rounded-[3px] bg-purple-50 text-[#7C3AED] border border-purple-200 flex items-center justify-center">
                <TrendingUp size={15} className="stroke-[2.2]" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[3px] bg-purple-100 text-purple-800 border border-purple-200 font-mono">
                Per Order
              </span>
            </div>

            <div className="my-1">
              <div className="text-xl sm:text-2xl font-black font-mono text-[#7C3AED] tabular-nums leading-tight truncate">
                ${averageInvoiceValue.toLocaleString()}
              </div>
            </div>

            <div className="pt-1.5 border-t border-[#F2F2F2]">
              <div className="text-[11px] font-bold text-[#2A3F54] uppercase tracking-wider truncate">
                Average Invoice
              </div>
              <div className="text-[10px] text-[#73879C] truncate">
                Mean transaction ticket size
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
