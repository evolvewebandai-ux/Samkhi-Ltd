import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import { Order } from '../../../types';

interface ParishOrdersMapProps {
  orders: Order[];
}

/**
 * ParishOrdersMap in Gentelella styling
 * Displays parish regional distribution with Gentelella #1ABB9C progress fills
 * and #2A3F54 typography.
 */
export default function ParishOrdersMap({ orders }: ParishOrdersMapProps) {
  const navigate = useNavigate();

  const parishStats = useMemo(() => {
    const counts: Record<string, number> = {};

    orders.forEach(o => {
      const parish = o.shipping_parish || o.shipping_address?.parish || 'Kingston & St. Andrew (Hub)';
      counts[parish] = (counts[parish] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([parish, count]) => ({ parish, count }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  const maxCount = useMemo(() => {
    return Math.max(...parishStats.map(p => p.count), 1);
  }, [parishStats]);

  return (
    <div className="space-y-2.5 font-sans">
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
        {parishStats.map((item, idx) => {
          const pct = (item.count / maxCount) * 100;
          return (
            <div 
              key={item.parish}
              onClick={() => navigate(`/admin/orders?parish=${encodeURIComponent(item.parish)}`)}
              className="group p-2.5 rounded-[3px] border border-[#E6E9ED] hover:border-[#1ABB9C] bg-white cursor-pointer hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-[#2A3F54] group-hover:text-[#1ABB9C] transition-colors">
                  <MapPin size={12} className="text-[#73879C]" />
                  {item.parish}
                </span>
                <span className="font-mono text-[#2A3F54] font-bold">
                  {item.count} <span className="text-[9px] text-[#73879C] font-normal">orders</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#EDEDED] rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-[#1ABB9C] rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, opacity: 0.4 + (0.6 * (item.count / maxCount)) }}
                />
              </div>
            </div>
          );
        })}
        {parishStats.length === 0 && (
          <div className="text-center py-8 text-[#73879C] text-xs">
            No orders with parish info.
          </div>
        )}
      </div>

      <div className="pt-1 flex justify-end">
        <button 
          type="button"
          onClick={() => navigate('/admin/shipping')}
          className="text-xs font-bold text-[#337AB7] hover:underline flex items-center gap-1 cursor-pointer"
        >
          View Parish Delivery Rates
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
