import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  RotateCcw, 
  Loader2, 
  Check, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'primary' | 'danger' | 'ghost' | 'success' | 'warning';
  disabled?: boolean;
  requiresConfirm?: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
}

interface BulkActionBarProps {
  selectedCount: number;
  totalCount?: number;
  onClearSelection: () => void;
  onSelectAllPages?: () => void;
  isAllPagesSelected?: boolean;
  actions: BulkAction[];
  loading?: boolean;
  loadingMessage?: string;
  progress?: number; // 0 to 100 for batch progress
  undoAction?: {
    label: string;
    onUndo: () => void | Promise<void>;
  } | null;
}

export default function BulkActionBar({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAllPages,
  isAllPagesSelected = false,
  actions,
  loading = false,
  loadingMessage = "Executing batch operations...",
  progress,
  undoAction,
}: BulkActionBarProps) {
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<number | null>(null);
  const [undoCountdown, setUndoCountdown] = useState<number>(5);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (selectedCount === 0) {
      setShowConfirm(null);
    }
  }, [selectedCount]);

  // Undo countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (undoAction) {
      setUndoCountdown(6);
      interval = setInterval(() => {
        setUndoCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [undoAction]);

  if (selectedCount === 0 && !undoAction) return null;

  const activeConfirmAction = actions.find(a => a.id === showConfirm);

  return (
    <>
      <AnimatePresence>
        {/* UNDO NOTIFICATION TOAST OVERLAY */}
        {undoAction && undoCountdown > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700/80 text-white rounded-xl shadow-2xl py-3 px-5 flex items-center justify-between gap-4 z-40 max-w-md w-[92%] font-sans"
            id="bulk-undo-toast"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Check size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">Action performed successfully</p>
                <p className="text-[10px] text-slate-400 font-medium">Revert change in next {undoCountdown - 1} seconds.</p>
              </div>
            </div>
            <button
              onClick={async () => {
                await undoAction.onUndo();
                setUndoCountdown(0);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
              id="bulk-undo-button"
            >
              <RotateCcw size={12} />
              Undo Action
            </button>
          </motion.div>
        )}

        {/* MAIN DOCKED FLOATING BULK BAR */}
        {selectedCount > 0 && (
          <motion.div
            initial={{ y: -50, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: -50, x: '-50%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white shadow-xl rounded-xl py-2 px-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 z-45 max-w-7xl w-[94%] transition-all"
            id="unified-bulk-action-bar"
          >
            {/* ZONE 1: SELECTION INFO & COUNT (LEFT) */}
            <div className="flex items-center justify-between md:justify-start gap-4">
              <div className="flex items-center gap-2 pr-4 border-r border-slate-800">
                <span className="font-mono text-emerald-400 font-black bg-slate-955 px-2.5 py-1 rounded-lg text-sm tracking-tight border border-slate-800 select-none tabular-nums">
                  {selectedCount}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-350">Selected</span>
              </div>

              {/* Page-level select-all helpers */}
              <div className="flex items-center gap-3">
                {totalCount && totalCount > selectedCount && onSelectAllPages && (
                  <button
                    onClick={onSelectAllPages}
                    className={cn(
                      "text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded transition-all cursor-pointer",
                      isAllPagesSelected 
                        ? "bg-slate-800 text-slate-100 border border-slate-700" 
                        : "bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-350 hover:text-white"
                    )}
                    id="bulk-select-all-pages"
                  >
                    {isAllPagesSelected ? "Selected active workspace" : `Select all ${totalCount} records`}
                  </button>
                )}

                <button
                  onClick={onClearSelection}
                  className="p-1 px-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 hover:text-slate-100 rounded-lg text-slate-400 hover:border-slate-750 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase cursor-pointer"
                  title="Deselect all rows"
                  id="bulk-clear-selection"
                >
                  <X size={11} />
                  Clear Selection
                </button>
              </div>
            </div>

            {/* ZONE 2 & 3: CONSOLIDATED ACTIONS DROPDOWN & STATUS (RIGHT) */}
            <div className="flex items-center gap-3 justify-end relative">
              {loading ? (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-350" id="bulk-loading-container">
                  <Loader2 size={13} className="animate-spin text-amber-500 shrink-0" />
                  <div className="text-left font-mono text-[9px]">
                    <span className="block font-black uppercase text-slate-400 leading-tight">{loadingMessage}</span>
                    {progress !== undefined && (
                      <div className="w-20 bg-slate-950 h-1 rounded-full mt-1 overflow-hidden border border-slate-850">
                        <div 
                          className="bg-amber-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="hidden lg:flex items-center gap-1.5 text-slate-500 font-mono text-[9px] font-bold animate-pulse mr-2" id="bulk-system-status">
                  <span className="w-2 h-2 bg-[#2ed573] rounded-full mr-0.5" />
                  BATCH ENGINE ACTIVE
                </div>
              )}

              {/* Click outside target to close */}
              {isDropdownOpen && (
                <div 
                  className="fixed inset-0 z-10 bg-transparent cursor-default" 
                  onClick={() => setIsDropdownOpen(false)} 
                />
              )}

              {/* Bulk Action Dropdown Menu Trigger */}
              <div className="relative z-20">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={loading}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-55 text-white rounded-lg text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                  id="bulk-dropdown-toggle"
                >
                  <span>Bulk Actions Menu</span>
                  <ChevronDown size={12} className={cn("transition-transform duration-200", isDropdownOpen ? "rotate-180" : "")} />
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 mt-1.5 w-52 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden py-1 z-30 font-sans"
                      id="bulk-dropdown-menu"
                    >
                      {actions.map((act) => {
                        const Icon = act.icon;
                        const isDanger = act.variant === 'danger';
                        
                        return (
                          <button
                            key={act.id}
                            onClick={() => {
                              setIsDropdownOpen(false);
                              if (act.requiresConfirm) {
                                setShowConfirm(act.id);
                              } else {
                                act.onClick();
                              }
                            }}
                            disabled={act.disabled || loading}
                            className={cn(
                              "w-full text-left px-3.5 py-2 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                              isDanger 
                                ? "text-red-400 hover:bg-red-950/40 hover:text-red-300 font-extrabold uppercase border-t border-slate-900 mt-1 pt-2"
                                : act.variant === 'primary' || act.variant === 'warning'
                                ? "text-amber-400 hover:bg-slate-900"
                                : act.variant === 'success'
                                ? "text-emerald-400 hover:bg-slate-900"
                                : "text-slate-300 hover:bg-slate-900 hover:text-white"
                            )}
                            id={`bulk-action-${act.id}`}
                          >
                            <Icon size={12} className="shrink-0 text-current" />
                            <span>{act.label}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION OVERLAY FOR DESTRUCTIVE / SENSITIVE ACTIONS */}
      <AnimatePresence>
        {showConfirm && activeConfirmAction && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
              id="bulk-confirm-backdrop"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl z-[60] overflow-hidden p-6 text-center font-sans text-slate-800"
              id="bulk-confirm-modal"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight" id="bulk-confirm-title">
                {activeConfirmAction.confirmTitle || 'Confirm Bulk Action?'}
              </h3>
              <p className="text-xs text-slate-500 mt-2.5 leading-relaxed font-semibold font-sans" id="bulk-confirm-message">
                {activeConfirmAction.confirmMessage || 'Are you absolutely sure you want to trigger this action across all checked records?'}
              </p>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 py-3 px-4 border border-slate-200 hover:border-slate-350 bg-white rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                  id="bulk-confirm-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowConfirm(null);
                    await activeConfirmAction.onClick();
                  }}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all shadow-md cursor-pointer"
                  id="bulk-confirm-execute"
                >
                  Yes, Execute Action
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
