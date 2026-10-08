import React, { useState, useEffect } from 'react';
import { Search, MapPin, Truck, ShieldAlert, Calendar, ArrowRight, CornerDownRight } from 'lucide-react';
import { Order } from '../../types';
import OrderTrackingTimeline from './OrderTrackingTimeline';

interface OrderTrackingTabProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

export default function OrderTrackingTab({ orders, onSelectOrder }: OrderTrackingTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Automatically select the latest order as default to provide an instant premium experience
  useEffect(() => {
    if (orders && orders.length > 0 && !selectedTrackingOrder) {
      setSelectedTrackingOrder(orders[0]);
    }
  }, [orders, selectedTrackingOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!searchTerm.trim()) {
      setErrorMessage('Please enter an order reference number.');
      return;
    }

    const cleanTerm = searchTerm.toLowerCase().trim().replace('#', '');
    const matched = orders.find(o => o.id.toLowerCase().replace('#', '') === cleanTerm);

    if (matched) {
      setSelectedTrackingOrder(matched);
    } else {
      setErrorMessage(`Order reference "${searchTerm}" was not found in your associated archive.`);
    }
  };

  // Helper to calculate mock delivery date
  const getEstimatedArrival = (orderDateStr: string) => {
    try {
      const parts = orderDateStr.split('/');
      let dateObj: Date;
      if (parts.length === 3) {
        // MM/DD/YYYY format often returned by toLocaleDateString
        dateObj = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      } else {
        dateObj = new Date(orderDateStr);
      }
      
      if (isNaN(dateObj.getTime())) {
        return 'Standard delivery en-route (3-5 days)';
      }

      // Add 3 days for standard delivery estimate
      dateObj.setDate(dateObj.getDate() + 3);
      return dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'Within 3 delivery business days';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Informative Header card */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-primary/5 border border-emerald-500/15 p-5 rounded-3xl flex items-start gap-4">
        <span className="text-2xl pt-0.5">📍</span>
        <div>
          <h4 className="font-display font-extrabold text-sm text-secondary">Jamaica Courier Tracking Portal</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Verify shipment milestones, courier dispatches, and expected parish drop-offs. If an order consists of heavy duty solar mounts or high capacity active batteries, transit requires custom-tailored freight delivery route coordination.
          </p>
        </div>
      </div>

      {/* Tracker search and selection bar */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Order reference Search Form */}
          <div className="space-y-2">
            <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider">
              Search by Order Number
            </label>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g. #REC-17805..."
                className="w-full pl-10 pr-24 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-2xl text-xs font-semibold text-secondary transition-all"
              />
              <div className="absolute left-3.5 top-3.5 text-slate-400">
                <Search size={14} />
              </div>
              <button
                type="submit"
                className="absolute right-2 top-2 bg-secondary hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-1.5 rounded-xl cursor-pointer transition-colors"
              >
                Find
              </button>
            </form>
            {errorMessage && (
              <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                <ShieldAlert size={12} /> {errorMessage}
              </p>
            )}
          </div>

          {/* Quick Dropdown select */}
          <div className="space-y-2">
            <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider">
              Quick Select Active Order
            </label>
            <select
              value={selectedTrackingOrder?.id || ''}
              onChange={(e) => {
                const found = orders.find(o => o.id === e.target.value);
                if (found) {
                  setSelectedTrackingOrder(found);
                  setErrorMessage('');
                }
              }}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none text-xs text-slate-800 font-semibold cursor-pointer"
            >
              <option value="" disabled>-- Select a transaction --</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} · {o.date} (JMD ${o.total?.toLocaleString()}) - {o.status}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Listing related quick suggestions */}
        {orders.length > 0 && !selectedTrackingOrder && (
          <div className="border-t border-slate-150 pt-4 flex flex-wrap gap-2 items-center text-xs text-slate-450 font-semibold">
            <span>Suggestions:</span>
            {orders.slice(0, 3).map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedTrackingOrder(o)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl cursor-pointer text-[10px] text-secondary font-mono"
              >
                {o.id} ({o.status})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Render selected timeline */}
      {selectedTrackingOrder ? (
        <div className="space-y-6">
          
          {/* Estimated summary box */}
          {selectedTrackingOrder.status !== 'cancelled' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Estimated Delivery Date */}
              <div className="bg-white border border-slate-105 rounded-3xl p-5 shadow-xs flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Calendar size={18} />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Estimated Dropoff</span>
                  <p className="text-xs font-extrabold text-secondary mt-1">
                    {getEstimatedArrival(selectedTrackingOrder.date)}
                  </p>
                </div>
              </div>

              {/* Card 2: Fulfillment Dispatch Parish */}
              <div className="bg-white border border-[#eaeaea] rounded-3xl p-5 shadow-xs flex items-center gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                  <MapPin size={18} />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Destination Location</span>
                  <p className="text-xs font-extrabold text-secondary mt-1">
                    {selectedTrackingOrder.fulfillmentLocation || 'Designated Parish Outlet, Jamaica'}
                  </p>
                </div>
              </div>

              {/* Card 3: Active Carrier services */}
              <div className="bg-white border border-[#eaeaea] rounded-3xl p-5 shadow-xs flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <Truck size={18} />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Assigned Transport Carrier</span>
                  <p className="text-xs font-extrabold text-secondary mt-1">
                    DHL Express Jamaica (Ref: JM-89743-DH)
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* Core Timeline Component */}
          <OrderTrackingTimeline order={selectedTrackingOrder} />

          {/* Quick link button to go back to detail view */}
          <div className="flex justify-start">
            <button
              onClick={() => onSelectOrder(selectedTrackingOrder)}
              className="text-xs font-black text-primary hover:text-primary-accent flex items-center gap-1.5 border-b border-primary/20 hover:border-primary pb-0.5 transition-all cursor-pointer"
            >
              <CornerDownRight size={13} /> View full receipt invoice details for {selectedTrackingOrder.id}
            </button>
          </div>

        </div>
      ) : (
        <div className="bg-slate-50 text-center py-16 rounded-3xl border border-slate-100">
          <span className="text-4xl">🔍</span>
          <h4 className="font-display font-black text-md text-secondary mt-3">Select transaction or enter tracking ID</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
            Retrieve active tracking information above from your logged order account archives.
          </p>
        </div>
      )}

    </div>
  );
}
