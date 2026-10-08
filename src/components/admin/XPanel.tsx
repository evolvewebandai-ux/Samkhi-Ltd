import React, { useState } from 'react';
import { ChevronUp, ChevronDown, RefreshCw, Settings, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface XPanelProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  onRefresh?: () => void;
  onSettings?: () => void;
  collapsible?: boolean;
  closable?: boolean;
}

/**
 * Gentelella x_panel component
 * Features the signature x_title with bottom border, toolbox actions (collapse, settings, refresh),
 * and clean x_content body in light mode.
 */
export default function XPanel({
  title,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'bg-[#1ABB9C] text-white',
  children,
  className,
  headerAction,
  onRefresh,
  onSettings,
  collapsible = true,
  closable = false
}: XPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (isClosed) return null;

  const handleRefresh = () => {
    if (onRefresh) {
      setIsRefreshing(true);
      onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className={cn("bg-white border border-[#E6E9ED] rounded-[3px] p-4 sm:p-5 shadow-xs transition-all duration-200", className)}>
      {/* x_title */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-[#E6E9ED]">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon size={16} className="text-[#73879C] shrink-0" />}
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#2A3F54] truncate">
            {title}
            {subtitle && (
              <small className="text-[#73879C] text-[11px] font-normal normal-case ml-2 hidden sm:inline">
                {subtitle}
              </small>
            )}
          </h2>
          {badge && (
            <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 font-mono", badgeColor)}>
              {badge}
            </span>
          )}
        </div>

        {/* Panel Toolbox */}
        <div className="flex items-center gap-2 shrink-0">
          {headerAction}
          
          <ul className="flex items-center gap-1.5 text-[#73879C]">
            {onRefresh && (
              <li>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="p-1 hover:text-[#1ABB9C] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  title="Refresh Panel"
                >
                  <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
                </button>
              </li>
            )}
            {onSettings && (
              <li>
                <button
                  type="button"
                  onClick={onSettings}
                  className="p-1 hover:text-[#1ABB9C] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  title="Panel Settings"
                >
                  <Settings size={13} />
                </button>
              </li>
            )}
            {collapsible && (
              <li>
                <button
                  type="button"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="p-1 hover:text-[#1ABB9C] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  title={isCollapsed ? "Expand Panel" : "Collapse Panel"}
                >
                  {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </li>
            )}
            {closable && (
              <li>
                <button
                  type="button"
                  onClick={() => setIsClosed(true)}
                  className="p-1 hover:text-[#E74C3C] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  title="Close Panel"
                >
                  <X size={14} />
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* x_content */}
      {!isCollapsed && (
        <div className="x_content animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
}
