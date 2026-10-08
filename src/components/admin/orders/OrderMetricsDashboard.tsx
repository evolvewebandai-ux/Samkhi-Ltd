import React from 'react';
import { 
  Calendar, 
  Layers, 
  Clock, 
  Package, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  RotateCcw,
  Filter
} from 'lucide-react';
import { Order } from '../../../types';
import { cn } from '../../../lib/utils';

export type DatePreset = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'custom';

export interface OrderMetricsDashboardProps {
  orders: Order[];
  dateFilteredOrders: Order[];
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  activeTab: 'All' | 'Pending' | 'In Progress' | 'Ready' | 'Completed' | 'Cancelled';
  onTabSelect: (tab: 'All' | 'Pending' | 'In Progress' | 'Ready' | 'Completed' | 'Cancelled') => void;
}

export default function OrderMetricsDashboard({
  orders,
  dateFilteredOrders,
  datePreset,
  onDatePresetChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  activeTab,
  onTabSelect
}: OrderMetricsDashboardProps) {
  // Calculate counts based on date-filtered orders
  const allCount = dateFilteredOrders.length;
  const pendingCount = dateFilteredOrders.filter(o => o.status === 'pending').length;
  const inProgressCount = dateFilteredOrders.filter(o => 
    o.status === 'payment_confirmed' || o.status === 'picked' || o.status === 'packed'
  ).length;
  const readyCount = dateFilteredOrders.filter(o => 
    o.status === 'ready_for_pickup' || o.status === 'ready_for_delivery'
  ).length;
  const completedCount = dateFilteredOrders.filter(o => o.status === 'completed').length;
  const cancelledCount = dateFilteredOrders.filter(o => o.status === 'cancelled').length;

  const presetLabels: Record<DatePreset, string> = {
    all: 'All Time',
    today: 'Today',
    yesterday: 'Yesterday',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    this_month: 'This Month',
    custom: 'Custom Range'
  };

  const metrics = [
    {
      id: 'All' as const,
      label: 'All Orders',
      subtitle: 'Total in date range',
      count: allCount,
      icon: Layers,
      color: '#2A3F54',
      bgLight: 'bg-slate-50',
      borderColor: 'border-slate-300',
      activeRing: 'ring-2 ring-[#2A3F54] border-[#2A3F54]'
    },
    {
      id: 'Pending' as const,
      label: 'Pending Orders',
      subtitle: 'Awaiting review/action',
      count: pendingCount,
      icon: Clock,
      color: '#F39C12',
      bgLight: 'bg-amber-50/50',
      borderColor: 'border-amber-200',
      activeRing: 'ring-2 ring-[#F39C12] border-[#F39C12]'
    },
    {
      id: 'In Progress' as const,
      label: 'In Progress',
      subtitle: 'Confirmed, picked, packed',
      count: inProgressCount,
      icon: Package,
      color: '#3498DB',
      bgLight: 'bg-blue-50/50',
      borderColor: 'border-blue-200',
      activeRing: 'ring-2 ring-[#3498DB] border-[#3498DB]'
    },
    {
      id: 'Ready' as const,
      label: 'Ready Orders',
      subtitle: 'Pickup & delivery queue',
      count: readyCount,
      icon: Truck,
      color: '#1ABB9C',
      bgLight: 'bg-emerald-50/50',
      borderColor: 'border-emerald-200',
      activeRing: 'ring-2 ring-[#1ABB9C] border-[#1ABB9C]'
    },
    {
      id: 'Completed' as const,
      label: 'Completed Orders',
      subtitle: 'Fulfilled & closed',
      count: completedCount,
      icon: CheckCircle2,
      color: '#26B99A',
      bgLight: 'bg-teal-50/50',
      borderColor: 'border-teal-200',
      activeRing: 'ring-2 ring-[#26B99A] border-[#26B99A]'
    },
    {
      id: 'Cancelled' as const,
      label: 'Canceled Orders',
      subtitle: 'Voided & refunded',
      count: cancelledCount,
      icon: XCircle,
      color: '#E74C3C',
      bgLight: 'bg-rose-50/50',
      borderColor: 'border-rose-200',
      activeRing: 'ring-2 ring-[#E74C3C] border-[#E74C3C]'
    }
  ];

  return (
    <div className="bg-white rounded-[3px] border border-[#E6E9ED] shadow-2xs mb-6 overflow-hidden">
      {/* Header Bar with Date Range Filter */}
      <div className="p-3.5 sm:p-4 bg-[#F7F7F7] border-b border-[#E6E9ED] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[3px] bg-[#2A3F54] text-white flex items-center justify-center shrink-0">
            <Filter size={14} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#2A3F54] uppercase tracking-wider">
              Order Operations Dashboard
            </h3>
            <p className="text-[11px] text-[#73879C]">
              {datePreset === 'all' ? (
                <>Showing all {orders.length} historical orders</>
              ) : (
                <>Showing {dateFilteredOrders.length} of {orders.length} orders for <span className="font-semibold text-[#2A3F54]">{presetLabels[datePreset]}</span></>
              )}
            </p>
          </div>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-[#D9DEE4] rounded-[3px] px-2 py-1 shadow-2xs">
            <Calendar size={13} className="text-[#73879C]" />
            <span className="text-[11px] font-bold text-[#73879C] uppercase tracking-wider">Date Filter:</span>
            <select
              value={datePreset}
              onChange={(e) => onDatePresetChange(e.target.value as DatePreset)}
              aria-label="Filter orders by date range"
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

          {/* Reset button if filter is active */}
          {datePreset !== 'all' && (
            <button
              onClick={() => {
                onDatePresetChange('all');
                onStartDateChange('');
                onEndDateChange('');
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E74C3C] hover:text-[#c0392b] bg-white border border-[#E6E9ED] hover:border-[#E74C3C] px-2 py-1 rounded-[3px] transition-colors cursor-pointer"
              title="Reset date filter to All Time"
            >
              <RotateCcw size={11} />
              Reset Date
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row (6 cards) */}
      <div className="p-3 sm:p-4 bg-white">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {metrics.map((m) => {
            const Icon = m.icon;
            const isSelected = activeTab === m.id;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onTabSelect(m.id)}
                className={cn(
                  "text-left p-3.5 rounded-[3px] border transition-all duration-150 cursor-pointer flex flex-col justify-between relative group hover:shadow-xs",
                  isSelected
                    ? `${m.activeRing} ${m.bgLight}`
                    : "border-[#E6E9ED] bg-white hover:border-[#CCCCCC]"
                )}
              >
                {/* Top: Icon and Active Dot */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div 
                    className="w-7 h-7 rounded-[3px] flex items-center justify-center"
                    style={{ backgroundColor: `${m.color}15`, color: m.color }}
                  >
                    <Icon size={15} className="stroke-[2.2]" />
                  </div>

                  {isSelected && (
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: m.color }}
                      title="Active table filter"
                    />
                  )}
                </div>

                {/* Number / Metric Total */}
                <div className="mb-1">
                  <div className="text-2xl sm:text-[28px] font-black font-mono tracking-tight text-[#2A3F54] tabular-nums leading-none">
                    {m.count}
                  </div>
                </div>

                {/* Label & Description */}
                <div>
                  <div className="text-[11px] font-bold text-[#2A3F54] uppercase tracking-wider truncate">
                    {m.label}
                  </div>
                  <div className="text-[10px] text-[#73879C] truncate">
                    {m.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
