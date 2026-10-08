import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { cn } from '../../../lib/utils';

interface KPICardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
  sparklineData?: { value: number }[];
  progress?: {
    current: number;
    target: number;
  };
  funnelStages?: { label: string; count: number }[];
  onClick?: () => void;
  className?: string;
}

/**
 * Gentelella Tile Stats component (tile_count / tile_stats_count)
 * Signature Gentelella metric tile:
 * - count_top: gray uppercase label with icon
 * - count: large bold text in #2A3F54
 * - count_bottom: green/red indicator with subtitle
 */
export default function KPICard({
  icon: Icon,
  value,
  label,
  trend,
  subtitle,
  sparklineData,
  progress,
  funnelStages,
  onClick,
  className
}: KPICardProps) {
  return (
    <div 
      onClick={onClick}
      role={onClick ? "button" : "presentation"}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={cn(
        "bg-white border border-[#E6E9ED] rounded-[3px] p-4 sm:p-5 transition-all duration-150 flex flex-col justify-between shadow-2xs relative",
        onClick ? "cursor-pointer hover:border-[#B2B9C0] hover:shadow-sm" : "",
        className
      )}
    >
      {/* count_top */}
      <div className="flex justify-between items-center mb-1">
        <span className="count_top text-[11px] font-bold text-[#73879C] uppercase tracking-wider flex items-center gap-1.5 truncate">
          <Icon size={14} className="text-[#73879C] shrink-0" />
          {label}
        </span>
        {trend && (
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] font-mono shrink-0 flex items-center gap-0.5",
            trend.isPositive 
              ? "text-[#1ABB9C] bg-[#1ABB9C]/10 border border-[#1ABB9C]/30" 
              : "text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30"
          )}>
            {trend.isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend.value}
          </span>
        )}
      </div>

      {/* count */}
      <div className="count text-2xl lg:text-[28px] font-bold text-[#2A3F54] my-1 tabular-nums tracking-tight">
        {value}
      </div>

      {/* count_bottom */}
      {subtitle && (
        <span className="count_bottom text-[11px] text-[#73879C] truncate block leading-normal mt-0.5">
          {subtitle}
        </span>
      )}

      {/* Sparkline chart */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="h-6 w-full mt-2 overflow-hidden opacity-90">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id="colorValGentelella" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={trend?.isPositive !== false ? "#1ABB9C" : "#E74C3C"} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={trend?.isPositive !== false ? "#1ABB9C" : "#E74C3C"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={trend?.isPositive !== false ? "#1ABB9C" : "#E74C3C"} 
                strokeWidth={1.5} 
                fillOpacity={1} 
                fill="url(#colorValGentelella)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Progress bar */}
      {progress && (
        <div className="w-full mt-2.5">
          <div className="flex justify-between text-[10px] font-semibold text-[#73879C] mb-1">
            <span>Target Progress</span>
            <span className="font-mono font-bold text-[#2A3F54]">{Math.round((progress.current / progress.target) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#EDEDED] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#1ABB9C] rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, (progress.current / progress.target) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Mini funnel bars */}
      {funnelStages && (
        <div className="flex gap-1.5 h-3 justify-between items-end mt-2">
          {funnelStages.map((stage, idx) => {
            const max = Math.max(...funnelStages.map(f => f.count), 1);
            const size = (stage.count / max) * 100;
            return (
              <div 
                key={idx} 
                title={`${stage.label}: ${stage.count}`}
                className="flex-1 bg-[#EDEDED] hover:bg-[#D9DEE4] transition-colors h-full relative group rounded-[2px]"
                style={{ height: `${Math.max(20, size)}%` }}
              >
                <div 
                  className="absolute inset-x-0 bottom-0 bg-[#2A3F54] rounded-[2px]" 
                  style={{ height: '100%', opacity: 0.2 + (idx * 0.15) }} 
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
