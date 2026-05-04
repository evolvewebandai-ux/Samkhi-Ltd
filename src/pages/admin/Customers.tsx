import React, { useState } from 'react';
import { CUSTOMERS } from '../../data';
import { Search, SlidersHorizontal, ChevronDown, UserPlus, Mail } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AdminCustomers() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const tabs = ['All', 'New', 'Returning', 'Abandoned checkouts', 'Email subscribers'];

  const filteredCustomers = CUSTOMERS.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-[#1a1a1a]">Customers</h1>
        <div className="flex gap-2">
          <button className="bg-white border border-[#d1d1d1] text-[#1a1a1a] px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[#f6f6f6] transition-colors">
            Import
          </button>
          <button className="bg-white border border-[#d1d1d1] text-[#1a1a1a] px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[#f6f6f6] transition-colors">
            Export
          </button>
          <button className="bg-black text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-black/90 transition-colors flex items-center gap-1.5 shadow-sm">
            <UserPlus size={16} />
            Add customer
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
              placeholder="Search customers"
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
                <th className="px-4 py-2">Customer name</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2 text-right">Orders</th>
                <th className="px-4 py-2 text-right">Amount spent</th>
                <th className="px-4 py-2 text-right">Last order</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b border-[#e3e3e3] hover:bg-[#f9f9f9] transition-colors group cursor-pointer text-sm">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded" onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#1a1a1a] group-hover:underline">{customer.name}</div>
                    <div className="text-[#616161] text-xs flex items-center gap-1 group/email">
                      <Mail size={12} />
                      {customer.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#616161]">
                    {customer.location}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {customer.orders} orders
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    ${customer.spent.toLocaleString()} JMD
                  </td>
                  <td className="px-4 py-3 text-right text-[#616161]">
                    {customer.lastOrder}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && (
            <div className="p-20 text-center text-[#616161] bg-white">
              No customers found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
