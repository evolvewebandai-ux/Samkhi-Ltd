import React, { useState } from 'react';
import { History, Calendar, User, Tag, ArrowRight } from 'lucide-react';

interface LogEntry {
  id: string;
  change?: number; // Stock adjustment count
  reason?: string; // Reason
  reference?: string; // Reference PO
  note?: string; // Log note
  timestamp: string;
  userId?: string; // User email
  action?: string; // Action types like: "price_changed", "created", "seo_changed", "archived"
  details?: string; // Text details
}

interface HistoryTabProps {
  logs: LogEntry[];
  priceLogs?: { timestamp: string; oldPrice: number; newPrice: number; actor: string }[];
}

export default function HistoryTab({ logs, priceLogs = [] }: HistoryTabProps) {
  const [filter, setFilter] = useState<'all' | 'stock' | 'price' | 'meta'>('all');

  // Convert/Consolidate inputs into uniform history objects
  const combinedHistory: {
    id: string;
    type: 'stock' | 'price' | 'meta';
    title: string;
    description: string;
    timestamp: string;
    actor: string;
    tagClassName: string;
  }[] = [];

  // Parse inventory entries
  logs.forEach((log) => {
    const isStockAdjustment = log.change !== undefined || log.reason;
    if (isStockAdjustment) {
      const type = 'stock';
      const changeNum = log.change || 0;
      const title = changeNum >= 0 ? `Stock Added (+${changeNum})` : `Stock Deducted (${changeNum})`;
      const desc = `${log.reason || 'Manual Correction'}. ${log.reference ? `Ref: ${log.reference}` : ''} ${log.note ? `[Notes: ${log.note}]` : ''}`;
      combinedHistory.push({
        id: log.id,
        type,
        title,
        description: desc,
        timestamp: log.timestamp,
        actor: log.userId || 'System Admin',
        tagClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      });
    } else {
      // General meta logs
      combinedHistory.push({
        id: log.id,
        type: 'meta',
        title: log.action || 'Product Event',
        description: log.details || 'Product properties modified.',
        timestamp: log.timestamp,
        actor: log.userId || 'System Admin',
        tagClassName: 'bg-blue-50 text-blue-700 border-blue-200'
      });
    }
  });

  // Parse custom price logs
  priceLogs.forEach((p, idx) => {
    combinedHistory.push({
      id: `price-change-${idx}`,
      type: 'price',
      title: 'Price Adjustment',
      description: `Price changed from $${p.oldPrice.toFixed(2)} to $${p.newPrice.toFixed(2)}`,
      timestamp: p.timestamp,
      actor: p.actor || 'System Admin',
      tagClassName: 'bg-amber-50 text-amber-700 border-amber-200'
    });
  });

  // Sort chronologically (newest first)
  const sortedHistory = combinedHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply filters
  const filteredHistory = sortedHistory.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex gap-1.5 border-b border-[#e3e3e3] pb-3">
        {(['all', 'stock', 'price', 'meta'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize border transition-all ${
              filter === t
                ? 'bg-black text-white border-black shadow-xs'
                : 'bg-white text-[#616161] border-[#d1d1d1] hover:bg-[#f9f9f9]'
            }`}
          >
            {t === 'all' ? 'All Activities' : `${t} Logs`}
          </button>
        ))}
      </div>

      {/* Timeline View */}
      {filteredHistory.length > 0 ? (
        <div className="relative border-l-2 border-[#e3e3e3] ml-2.5 pl-6 space-y-6 py-2">
          {filteredHistory.map((item) => (
            <div key={item.id} className="relative text-left">
              {/* Dot Icon marker */}
              <span className="absolute -left-[31px] top-0.5 bg-white border-2 border-black w-3.5 h-3.5 rounded-full z-10 block" />

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${item.tagClassName}`}>
                    {item.type}
                  </span>
                  <h4 className="text-xs font-black text-[#1a1a1a]">{item.title}</h4>
                  <span className="text-[10px] text-[#616161] flex items-center gap-1">
                    <Calendar size={10} />
                    {item.timestamp}
                  </span>
                </div>

                <p className="text-xs text-[#1a1a1a] leading-relaxed">{item.description}</p>

                <div className="flex items-center gap-1.5 text-[10px] text-[#616161] font-semibold">
                  <User size={10} />
                  <span>By: <span className="text-[#1a1a1a] font-normal">{item.actor}</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border border-dashed border-[#e3e3e3] rounded-xl bg-[#f9f9f9]">
          <History size={24} className="text-[#616161] mx-auto mb-2 opacity-50 animate-pulse" />
          <p className="text-xs text-[#1a1a1a] font-bold">No history logs found</p>
          <p className="text-[11px] text-[#616161] mt-0.5">Activities appear as inventory changes or details edits are saved.</p>
        </div>
      )}
    </div>
  );
}
