import React, { useState } from 'react';
import { ORDERS } from '../../data';
import { Search, SlidersHorizontal, ChevronDown, Download, Printer } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AdminOrders() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const tabs = ['All', 'Unfulfilled', 'Unpaid', 'Open', 'Archived'];

  const filteredOrders = ORDERS.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase());
    const matchesTab = filter === 'All' || 
                      (filter === 'Unfulfilled' && o.fulfillmentStatus === 'unfulfilled') ||
                      (filter === 'Unpaid' && o.paymentStatus === 'pending');
    return matchesSearch && matchesTab;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-[#ccf2e5] text-[#006e52]';
      case 'pending': return 'bg-[#fff4d6] text-[#8a6116]';
      case 'fulfilled': return 'bg-[#e4e5e7] text-[#1a1a1a]';
      case 'cancelled': return 'bg-[#ffd5d8] text-[#8e1f0b]';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-[#1a1a1a]">Orders</h1>
        <div className="flex gap-2">
          <button className="bg-white border border-[#d1d1d1] p-1.5 rounded-md hover:bg-[#f6f6f6] text-[#616161]">
            <Printer size={18} />
          </button>
          <button className="bg-white border border-[#d1d1d1] text-[#1a1a1a] px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[#f6f6f6] transition-colors flex items-center gap-2">
            <Download size={16} />
            Export
          </button>
          <button className="bg-black text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-black/90 transition-colors shadow-sm">
            Create order
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#e3e3e3] shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-[#e3e3e3] px-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                filter === tab 
                  ? "border-black text-[#1a1a1a]" 
                  : "border-transparent text-[#616161] hover:text-[#1a1a1a] hover:bg-[#f6f6f6]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="p-2 flex gap-2 border-b border-[#e3e3e3] bg-[#f9f9f9]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#616161]" size={16} />
            <input 
              type="text" 
              placeholder="Search orders"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-[#d1d1d1] rounded-md py-1 pl-8 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
          <button className="bg-white border border-[#d1d1d1] text-[#616161] p-1.5 rounded-md hover:bg-[#f6f6f6]">
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#f9f9f9] text-[#616161] text-xs font-semibold uppercase tracking-wider border-b border-[#e3e3e3]">
              <tr>
                <th className="px-4 py-2 w-10">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="px-4 py-2">Order</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2">Payment Status</th>
                <th className="px-4 py-2">Fulfillment Status</th>
                <th className="px-4 py-2">Items</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-[#e3e3e3] hover:bg-[#f9f9f9] transition-colors group cursor-pointer text-sm">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded" onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#1a1a1a] group-hover:underline">
                    {order.id}
                  </td>
                  <td className="px-4 py-3 text-[#616161]">
                    {order.date}
                  </td>
                  <td className="px-4 py-3 text-[#1a1a1a]">
                    {order.customerName}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium">
                    ${order.total.toLocaleString()} JMD
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      getStatusStyle(order.paymentStatus)
                    )}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                     <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      getStatusStyle(order.fulfillmentStatus === 'unfulfilled' ? 'pending' : order.fulfillmentStatus)
                    )}>
                      {order.fulfillmentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#616161]">
                    {order.items} items
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="p-20 text-center text-[#616161] bg-white">
              No orders found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
