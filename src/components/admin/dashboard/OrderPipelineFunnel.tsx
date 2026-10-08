import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, AlertCircle, ShoppingBag } from 'lucide-react';
import { Order, OrderStatus } from '../../../types';

interface OrderPipelineFunnelProps {
  orders: Order[];
  onStageClick?: (status: OrderStatus) => void;
}

/**
 * OrderPipelineFunnel in Gentelella styling
 * Active stages styled with #2A3F54 and #1ABB9C accents,
 * clean striped stage orders table in strict light mode.
 */
export default function OrderPipelineFunnel({ orders, onStageClick }: OrderPipelineFunnelProps) {
  const navigate = useNavigate();
  const [selectedStage, setSelectedStage] = useState<OrderStatus>('pending');

  const stages: { status: OrderStatus; label: string; bg: string; text: string }[] = [
    { status: 'pending', label: 'Pending', bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'text-amber-900' },
    { status: 'payment_confirmed', label: 'Paid', bg: 'bg-blue-50 text-blue-800 border-blue-200', text: 'text-blue-900' },
    { status: 'picked', label: 'Picked', bg: 'bg-slate-100 text-slate-800 border-slate-200', text: 'text-slate-900' },
    { status: 'packed', label: 'Packed', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', text: 'text-indigo-900' },
    { status: 'ready_for_pickup', label: 'Ready (Pickup)', bg: 'bg-purple-50 text-purple-800 border-purple-200', text: 'text-purple-900' },
    { status: 'ready_for_delivery', label: 'Ready (Courier)', bg: 'bg-cyan-50 text-cyan-800 border-cyan-200', text: 'text-cyan-900' },
    { status: 'completed', label: 'Completed', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'text-emerald-900' },
    { status: 'cancelled', label: 'Cancelled', bg: 'bg-rose-50 text-rose-800 border-rose-200', text: 'text-rose-900' }
  ];

  const stageCounts = stages.reduce((acc, stage) => {
    acc[stage.status] = orders.filter(o => (o.status || 'pending') === stage.status).length;
    return acc;
  }, {} as Record<OrderStatus, number>);

  const activeStageOrders = orders.filter(o => (o.status || 'pending') === selectedStage)
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const isUrgent = (orderDateStr: string, status: OrderStatus) => {
    if (status !== 'pending' && status !== 'payment_confirmed') return false;
    const diffMs = Date.now() - new Date(orderDateStr).getTime();
    return diffMs > 24 * 60 * 60 * 1000; // 24 hours
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Funnel Stage Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
        {stages.map((stage) => {
          const count = stageCounts[stage.status];
          const isActive = selectedStage === stage.status;
          return (
            <button
              key={stage.status}
              type="button"
              onClick={() => {
                setSelectedStage(stage.status);
                if (onStageClick) onStageClick(stage.status);
              }}
              className={`p-3 rounded-[3px] border text-left transition-all relative cursor-pointer ${
                isActive 
                  ? 'bg-[#2A3F54] border-[#2A3F54] text-white shadow-xs' 
                  : 'bg-white border-[#E6E9ED] hover:border-[#1ABB9C] text-[#2A3F54]'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[9px] font-bold uppercase tracking-wider truncate ${isActive ? 'text-[#EDEDED]' : 'text-[#73879C]'}`}>
                  {stage.label}
                </span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[3px] shrink-0 ${
                  isActive 
                    ? 'bg-[#1ABB9C] text-white' 
                    : stage.bg
                }`}>
                  {count}
                </span>
              </div>
              <div className="h-1 w-full rounded-full overflow-hidden mt-1.5 bg-[#EDEDED]">
                <div 
                  className={`h-full rounded-full transition-all ${isActive ? 'bg-[#1ABB9C]' : 'bg-[#2A3F54]'}`}
                  style={{ width: `${Math.min(100, (count / (orders.length || 1)) * 100)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail of selected stage */}
      <div className="bg-[#FDFDFD] border border-[#E6E9ED] rounded-[3px] p-3.5">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#E6E9ED]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#2A3F54] flex items-center gap-1.5">
            <ShoppingBag size={14} className="text-[#1ABB9C]" />
            Orders in Stage: <span className="text-[#1ABB9C] font-bold">{stages.find(s => s.status === selectedStage)?.label}</span>
            <span className="text-[10px] text-[#73879C] font-normal normal-case">({stageCounts[selectedStage]} total)</span>
          </h4>
          <button 
            type="button"
            onClick={() => navigate(`/admin/orders?status=${selectedStage}`)}
            className="text-xs font-bold text-[#337AB7] hover:underline flex items-center gap-1 cursor-pointer"
          >
            Manage Stage
            <ArrowRight size={12} />
          </button>
        </div>

        {activeStageOrders.length === 0 ? (
          <div className="text-center py-6 text-[#73879C] text-xs">
            No orders currently waiting in this stage.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E6E9ED] font-bold text-[#73879C] text-[10px] uppercase tracking-wider bg-[#F9F9F9]">
                  <th className="py-2 pl-2">Order ID</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Parish / Hub</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2 text-center">Age</th>
                  <th className="py-2 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeStageOrders.map((order, idx) => {
                  const urgent = isUrgent(order.date, selectedStage);
                  const parsedDate = new Date(order.date);
                  let ageLabel = 'Just now';
                  const hrs = Math.abs(Date.now() - parsedDate.getTime()) / 36e5;
                  if (hrs >= 24) {
                    ageLabel = `${Math.floor(hrs / 24)}d ago`;
                  } else if (hrs >= 1) {
                    ageLabel = `${Math.floor(hrs)}h ago`;
                  } else {
                    ageLabel = `${Math.floor(hrs * 60)}m ago`;
                  }

                  return (
                    <tr 
                      key={order.id} 
                      className={`border-b border-[#E6E9ED] last:border-none hover:bg-[#F2F5F8] transition-colors ${
                        urgent ? 'bg-rose-50/70 text-rose-950' : (idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white')
                      }`}
                    >
                      <td className="py-2 pl-2 font-bold font-mono text-[#2A3F54]">
                        <span className="flex items-center gap-1">
                          {urgent && <AlertCircle size={13} className="text-[#E74C3C] animate-pulse shrink-0" />}
                          {order.id.startsWith('#') ? order.id : `#${order.id}`}
                        </span>
                      </td>
                      <td className="py-2 font-semibold text-[#2A3F54]">{order.customerName}</td>
                      <td className="py-2 text-[#73879C]">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-[#73879C]" />
                          {order.shipping_parish || order.shipping_address?.parish || 'Kingston (Pickup)'}
                        </span>
                      </td>
                      <td className="py-2 text-right font-bold font-mono text-[#2A3F54]">
                        ${(order.total || 0).toLocaleString()} <span className="text-[9px] text-[#73879C] font-normal">JMD</span>
                      </td>
                      <td className="py-2 text-center font-mono text-[11px] text-[#73879C]">
                        <span className="flex items-center justify-center gap-1">
                          <Clock size={11} className="text-[#73879C]" />
                          {ageLabel}
                        </span>
                      </td>
                      <td className="py-2 text-right pr-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/orders/${order.id.replace('#', '')}`)}
                          className="px-2 py-0.5 bg-white border border-[#CCCCCC] hover:border-[#1ABB9C] hover:text-[#1ABB9C] text-[#2A3F54] rounded-[3px] text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
