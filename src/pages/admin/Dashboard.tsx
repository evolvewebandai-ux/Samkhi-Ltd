import React from 'react';
import { BarChart3, TrendingUp, Users, ShoppingCart, DollarSign, Package } from 'lucide-react';
import { PRODUCTS, ORDERS, CUSTOMERS } from '../../data';

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Revenue', value: '$14.2M', growth: '+12%', icon: DollarSign, color: 'text-green-600' },
    { label: 'Orders', value: ORDERS.length.toString(), growth: '+5%', icon: ShoppingCart, color: 'text-blue-600' },
    { label: 'Customers', value: CUSTOMERS.length.toString(), growth: '+18%', icon: Users, color: 'text-purple-600' },
    { label: 'Avg. Order Value', value: '$452K', growth: '-2%', icon: BarChart3, color: 'text-orange-600' },
  ];

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-[#1a1a1a]">Dashboard Overview</h1>
        <p className="text-[#616161] text-sm">Welcome back to your workspace.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-lg border border-[#e3e3e3] shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-md bg-[#f9f9f9] ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${stat.growth.startsWith('+') ? 'bg-[#ccf2e5] text-[#006e52]' : 'bg-[#ffd5d8] text-[#8e1f0b]'}`}>
                {stat.growth}
              </span>
            </div>
            <div className="text-2xl font-bold text-[#1a1a1a] mb-1">{stat.value}</div>
            <div className="text-[#616161] text-sm font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#e3e3e3] shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-[#1a1a1a]">Sales Performance</h2>
            <select className="bg-white border border-[#d1d1d1] rounded-md text-xs py-1 px-2">
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div className="h-64 flex items-end gap-2 px-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div 
                key={i} 
                className="flex-1 bg-black rounded-t-sm" 
                style={{ height: `${20 + Math.random() * 80}%`, opacity: 0.1 + (i / 12) }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] text-[#616161] uppercase font-bold tracking-wider">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
            <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#e3e3e3] shadow-sm p-6">
          <h2 className="font-bold text-[#1a1a1a] mb-6">Inventory Status</h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#616161]">In Stock</span>
                <span className="font-bold">{PRODUCTS.filter(p => p.inStock).length}</span>
              </div>
              <div className="w-full h-2 bg-[#f1f1f1] rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '85%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#616161]">Low Stock</span>
                <span className="font-bold text-orange-600">8</span>
              </div>
              <div className="w-full h-2 bg-[#f1f1f1] rounded-full overflow-hidden">
                <div className="h-full bg-orange-500" style={{ width: '15%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#616161]">Out of Stock</span>
                <span className="font-bold text-red-600">{PRODUCTS.filter(p => !p.inStock).length}</span>
              </div>
              <div className="w-full h-2 bg-[#f1f1f1] rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: '5%' }} />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-[#e3e3e3]">
            <h3 className="text-xs font-bold text-[#616161] uppercase tracking-wider mb-4">Quick Links</h3>
            <div className="space-y-2">
              <button className="w-full text-left p-2 hover:bg-[#f6f6f6] rounded text-sm flex items-center justify-between group">
                <span className="text-[#1a1a1a]">View all packages</span>
                <TrendingUp size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button className="w-full text-left p-2 hover:bg-[#f6f6f6] rounded text-sm flex items-center justify-between group">
                <span className="text-[#1a1a1a]">Recent inquiries</span>
                <Users size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
