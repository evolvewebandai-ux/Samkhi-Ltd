import React, { useState, useRef, useEffect } from 'react';
import { getStatusConfig, ORDER_STATUSES, canTransition } from '../../lib/orderStatus';
import { OrderStatus } from '../../types';
import { useOrderStatus } from '../../hooks/useOrderStatus';
import { ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { showToast } from '../../lib/toast';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  orderId?: string;
  fulfillmentMethod?: 'pickup' | 'delivery';
  onUpdateSuccess?: (newStatus: OrderStatus) => void;
}

export default function OrderStatusBadge({
  status,
  size = 'sm',
  interactive = false,
  orderId,
  fulfillmentMethod = 'pickup',
  onUpdateSuccess
}: OrderStatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const config = getStatusConfig(status);
  const Icon = config.icon;

  // We only pull the hook if we are interactive and have an order ID
  const { updateOrderStatus } = useOrderStatus(interactive ? orderId : undefined);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-[10px] gap-1.5',
    md: 'px-3.5 py-1.5 text-xs gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2.5 font-bold'
  };

  const badgeBaseStyle = "inline-flex items-center font-extrabold uppercase tracking-widest rounded-full border transition-all select-none whitespace-nowrap";

  // Handle status clicks
  const handleSelectStatus = async (targetKey: OrderStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetKey === status) {
      setIsOpen(false);
      return;
    }

    if (!orderId) {
      showToast('Cannot run updates: No Order ID provided to the Badge component.', 'error');
      setIsOpen(false);
      return;
    }

    // Cancellation needs modal or prompt
    let note = '';
    if (targetKey === 'cancelled') {
      const reason = window.prompt(`Confirm cancelling Order ${orderId}.\nPlease enter a cancellation reason:`);
      if (reason === null) return; // user cancelled prompt
      if (!reason.trim()) {
        showToast('Cancellation reason is strictly required.', 'warning');
        return;
      }
      note = reason;
    }

    setUpdating(true);
    setIsOpen(false);

    try {
      let paymentMethod: any = undefined;
      if (targetKey === 'payment_confirmed') {
        const method = window.prompt(`Confirm payment for ${orderId}.\nEnter payment method (online / bank_transfer / manual_override / cod):`, 'bank_transfer');
        if (method === null) {
          setUpdating(false);
          return;
        }
        const val = method.toLowerCase().trim();
        if (val === 'online' || val === 'bank_transfer' || val === 'manual_override' || val === 'cod') {
          paymentMethod = val;
        } else {
          paymentMethod = 'manual_override';
        }
      }

      await updateOrderStatus(targetKey, note, paymentMethod);
      if (onUpdateSuccess) {
        onUpdateSuccess(targetKey);
      }
    } catch (err: any) {
      // Toast error is fired inside useOrderStatus
    } finally {
      setUpdating(false);
    }
  };

  const getDisabledReason = (targetKey: OrderStatus) => {
    if (status === 'completed') return 'Order is in finalized terminal Completed state.';
    if (status === 'cancelled') return 'Order is in aborted terminal Cancelled state.';
    if (targetKey === 'cancelled') return ''; // cancel allowed from anywhere except completed

    if (targetKey === 'ready_for_pickup' && fulfillmentMethod !== 'pickup') {
      return 'Disallowed: Fulfillment method is delivery (Courier).';
    }
    if (targetKey === 'ready_for_delivery' && fulfillmentMethod !== 'delivery') {
      return 'Disallowed: Fulfillment method is customer pickup (Store).';
    }

    // Explanations for sequential breaks
    const sourceIndex = ORDER_STATUSES.findIndex(s => s.key === status);
    const targetIndex = ORDER_STATUSES.findIndex(s => s.key === targetKey);
    
    if (targetIndex < sourceIndex) {
      return `Rollback transition: Click "Jump to Status" in details panel to execute rollback.`;
    }

    return `Invalid transition. Must follow flow stage sequence.`;
  };

  return (
    <div className="relative inline-block" ref={dropdownRef} id={`badge-container-${orderId}`}>
      <button
        disabled={!interactive || updating}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          badgeBaseStyle,
          sizeClasses[size],
          config.color.badgeBg,
          config.color.badgeText,
          config.color.border,
          interactive && "hover:-translate-y-0.5 active:translate-y-0 hover:shadow-sm cursor-pointer",
          updating && "opacity-70 cursor-not-allowed"
        )}
      >
        {updating ? (
          <Loader2 size={size === 'sm' ? 10 : size === 'md' ? 14 : 16} className="animate-spin" />
        ) : (
          <Icon size={size === 'sm' ? 10 : size === 'md' ? 14 : 16} className="shrink-0" />
        )}
        <span>{config.label}</span>
        {interactive && (
          <ChevronDown 
            size={size === 'sm' ? 10 : size === 'md' ? 14 : 16} 
            className={cn("opacity-60 transition-transform duration-200 shrink-0", isOpen && "rotate-180")} 
          />
        )}
      </button>

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Quick-Update Status</h4>
            <span className="text-[10px] text-slate-500 font-medium">Order {orderId}</span>
          </div>
          <div className="max-h-[350px] overflow-y-auto no-scrollbar">
            {ORDER_STATUSES.map((target) => {
              const allowed = canTransition(status, target.key, fulfillmentMethod, false);
              const disabledReason = !allowed ? getDisabledReason(target.key) : '';
              const TargetIcon = target.icon;
              const isCurrent = target.key === status;

              return (
                <div key={target.key} className="relative group/item">
                  <button
                    disabled={!allowed}
                    onClick={(e) => handleSelectStatus(target.key, e)}
                    className={cn(
                      "w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition-colors",
                      allowed 
                        ? "hover:bg-slate-50 cursor-pointer text-slate-700" 
                        : "opacity-40 bg-slate-50/20 cursor-not-allowed text-slate-400",
                      isCurrent && "bg-neutral-50/80 border-l-[3px] border-black pl-[11px]"
                    )}
                  >
                    <div className={cn(
                      "p-1 rounded-md shrink-0 mt-0.5",
                      isCurrent ? "bg-black text-white" : target.color.badgeBg,
                      !isCurrent && target.color.badgeText
                    )}>
                      <TargetIcon size={13} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-xs font-bold",
                          isCurrent ? "text-slate-900 font-extrabold" : "text-slate-800"
                        )}>
                          {target.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] bg-black text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest leading-none">Active</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5">{target.description}</p>
                    </div>
                  </button>

                  {/* HTML Native Tooltip on Disabled Items */}
                  {!allowed && disabledReason && (
                    <div className="absolute inset-0 bg-transparent opacity-0 group-hover/item:opacity-100 pointer-events-none transition-opacity">
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-900/95 text-white text-[9px] font-bold px-2 rounded-md shadow-md z-50 text-center w-[90%] leading-normal py-1 py-1.5 flex items-center gap-1.5">
                        <AlertCircle size={9} className="shrink-0 text-amber-400" />
                        <span>{disabledReason}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
