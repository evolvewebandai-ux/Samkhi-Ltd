import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface QuickActionTileProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  count?: string | number;
  badge?: string;
  badgeColor?: string;
  href: string;
}

/**
 * QuickActionTile styled in Gentelella widget style
 * 1:1 Square aspect ratio with prominent hero number/total,
 * top icon and status badge bar, and clean divider footer.
 */
export default function QuickActionTile({
  icon: Icon,
  title,
  subtitle,
  count,
  badge,
  badgeColor = 'bg-[#EDEDED] text-[#73879C] border-[#D9DEE4]',
  href
}: QuickActionTileProps) {
  return (
    <Link 
      to={href}
      className="group relative bg-white p-4 sm:p-4.5 rounded-[4px] border border-[#E6E9ED] hover:border-[#1ABB9C] shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between aspect-square w-full focus:outline-none focus:ring-1 focus:ring-[#1ABB9C] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-transparent hover:before:bg-[#1ABB9C] before:transition-colors"
    >
      {/* Top Row: Action Icon & Status Badge */}
      <div className="flex justify-between items-center gap-2">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[3px] bg-[#F7F7F7] border border-[#E6E9ED] flex items-center justify-center text-[#2A3F54] group-hover:bg-[#1ABB9C] group-hover:text-white group-hover:border-[#1ABB9C] transition-all duration-200 shrink-0 shadow-2xs">
          <Icon size={19} className="stroke-[2]" />
        </div>

        {badge && (
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border shadow-2xs shrink-0 whitespace-nowrap ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Center Hero: Prominent Large Number / Stat Total */}
      <div className="my-auto py-1">
        {count !== undefined ? (
          <div className={typeof count === 'string' && count.length > 5 
            ? "text-xl sm:text-2xl lg:text-3xl font-black font-mono text-[#2A3F54] group-hover:text-[#1ABB9C] transition-colors tracking-tight tabular-nums truncate"
            : "text-2xl sm:text-3xl lg:text-[34px] font-black font-mono text-[#2A3F54] group-hover:text-[#1ABB9C] transition-colors tracking-tight tabular-nums truncate"
          }>
            {count}
          </div>
        ) : (
          <div className="text-lg sm:text-xl font-black font-mono text-[#2A3F54] group-hover:text-[#1ABB9C] transition-colors tracking-tight uppercase">
            View
          </div>
        )}
      </div>

      {/* Bottom Row: Section Title & Context Subtitle */}
      <div className="pt-2 border-t border-[#F2F2F2]">
        <h4 className="text-xs sm:text-sm font-bold text-[#2A3F54] group-hover:text-[#1ABB9C] transition-colors truncate">
          {title}
        </h4>
        <p className="text-[10px] sm:text-[11px] text-[#73879C] font-normal truncate mt-0.5">
          {subtitle}
        </p>
      </div>
    </Link>
  );
}
