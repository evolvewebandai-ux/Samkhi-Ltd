import React from 'react';
import { BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight, Target, Zap } from 'lucide-react';

export default function AdminAnalytics() {
  const metrics = [
    { label: 'Total Sales', value: '$14.2M', change: '+12.5%', isPositive: true },
    { label: 'Conversion Rate', value: '3.2%', change: '+0.4%', isPositive: true },
    { label: 'Sessions', value: '45,231', change: '-2.1%', isPositive: false },
    { label: 'Avg. Order Value', value: '$452K', change: '+5.2%', isPositive: true },
  ];

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-[#1a1a1a]">Analytics</h1>
        <p className="text-[#616161] text-sm">Detailed insights into your business performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white p-5 rounded-lg border border-[#e3e3e3] shadow-sm">
            <p className="text-[#616161] text-sm mb-1">{m.label}</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-[#1a1a1a]">{m.value}</span>
              <span className={cn(
                "text-xs font-bold flex items-center mb-1",
                m.isPositive ? "text-[#006e52]" : "text-[#8e1f0b]"
              )}>
                {m.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {m.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg border border-[#e3e3e3] p-6 shadow-sm">
          <h2 className="font-bold text-[#1a1a1a] mb-6">Sales over time</h2>
          <div className="h-64 bg-[#f9f9f9] rounded-md flex items-center justify-center border border-dashed border-[#e3e3e3]">
            <BarChart3 className="text-[#d1d1d1]" size={48} />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#e3e3e3] p-6 shadow-sm">
          <h2 className="font-bold text-[#1a1a1a] mb-6">Top Products</h2>
          <div className="space-y-4">
             {[1,2,3,4].map(i => (
               <div key={i} className="flex items-center justify-between py-2 border-b border-[#f1f1f1] last:border-0">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-[#f1f1f1] rounded flex items-center justify-center">
                     <Zap size={14} className="text-[#1a1a1a]" />
                   </div>
                   <span className="text-sm font-medium">SRNE 6.5kW Hybrid Inverter</span>
                 </div>
                 <span className="text-sm font-bold">$1.2M</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
