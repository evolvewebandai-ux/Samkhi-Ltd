import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { getStatusConfig, ORDER_STATUSES, canTransition } from '../../lib/orderStatus';
import { useOrderStatus } from '../../hooks/useOrderStatus';
import { Check, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { showToast } from '../../lib/toast';

interface OrderStatusPipelineProps {
  order: Order;
  onUpdateSuccess?: () => void;
}

export default function OrderStatusPipeline({ order, onUpdateSuccess }: OrderStatusPipelineProps) {
  const [selectedNextStatus, setSelectedNextStatus] = useState<OrderStatus | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const { updateOrderStatus } = useOrderStatus(order.id);

  const currentStatus = order.status || 'pending';
  const fulfillmentMethod = order.fulfillment_method || 'pickup';

  // Build the pipeline steps
  const defaultSteps: OrderStatus[] = [
    'pending',
    'payment_confirmed',
    'picked',
    'packed',
    fulfillmentMethod === 'pickup' ? 'ready_for_pickup' : 'ready_for_delivery',
    'completed'
  ];

  // If order is cancelled, we append cancelled to the list of steps to highlight it
  const isCancelled = currentStatus === 'cancelled';
  const pipelineSteps = isCancelled ? [...defaultSteps, 'cancelled'] as OrderStatus[] : defaultSteps;

  const currentStepIndex = defaultSteps.indexOf(currentStatus as any);

  // Check if a stage is completed, active, or future
  const getStepState = (step: OrderStatus, index: number) => {
    if (isCancelled) {
      if (step === 'cancelled') return 'cancelled';
      // In a cancelled order, show steps completed up to when it was aborted, and the rest gray or dark
      const stepConfigIndex = defaultSteps.indexOf(step as any);
      const isPastStep = order.status_history?.some(h => h.status === step);
      return isPastStep ? 'completed_cancelled' : 'future';
    }

    if (step === currentStatus) return 'active';
    
    // Check if the step lies in the completed past list
    const stepConfigIndex = defaultSteps.indexOf(step as any);
    if (stepConfigIndex !== -1 && stepConfigIndex < currentStepIndex) {
      return 'completed';
    }
    
    return 'future';
  };

  const handleStepClick = (step: OrderStatus) => {
    if (isCancelled || currentStatus === 'completed') return;
    
    // Can only advance to a valid future stage in progressive flow
    const allowed = canTransition(currentStatus, step, fulfillmentMethod, false);
    if (allowed && step !== currentStatus) {
      setSelectedNextStatus(step);
    } else if (step !== currentStatus) {
      showToast(`Invalid advancement: You cannot skip steps directly to ${getStatusConfig(step).label}. Direct transitions must follow the sequence pipeline. Use "Jump to Status" in actions for special cases.`, 'warning');
    }
  };

  const handleConfirmAdvance = async () => {
    if (!selectedNextStatus) return;
    setAdvancing(true);
    try {
      let paymentMethod: any = undefined;
      if (selectedNextStatus === 'payment_confirmed') {
        const method = window.prompt(`Confirm payment method for Order ${order.id}:\nType online, bank_transfer, manual_override, or cod`, 'bank_transfer');
        if (method === null) {
          setAdvancing(false);
          return;
        }
        const val = method.toLowerCase().trim();
        if (val === 'online' || val === 'bank_transfer' || val === 'manual_override' || val === 'cod') {
          paymentMethod = val;
        } else {
          paymentMethod = 'manual_override';
        }
      }

      await updateOrderStatus(selectedNextStatus, `Advanced via pipeline stepper`, paymentMethod, false);
      setSelectedNextStatus(null);
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      // Errors handled in hook
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 w-full font-sans">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Order Status Pipeline</h3>
        <span className="text-[10px] bg-slate-100 text-slate-600 px-3.5 py-1 rounded-full font-bold">
          Fulfillment: <span className="uppercase text-slate-800 font-extrabold">{fulfillmentMethod}</span>
        </span>
      </div>

      {/* Progress Line and Stepper Container */}
      <div className="relative flex items-center justify-between w-full select-none px-4">
        {pipelineSteps.map((step, index) => {
          const config = getStatusConfig(step);
          const StepIcon = config.icon;
          const state = getStepState(step, index);
          const allowedToClick = !isCancelled && currentStatus !== 'completed' && canTransition(currentStatus, step, fulfillmentMethod, false) && step !== currentStatus;

          return (
            <React.Fragment key={step}>
              {/* Stepper Node */}
              <div 
                onClick={() => handleStepClick(step)}
                className={cn(
                  "flex flex-col items-center group relative z-10",
                  allowedToClick ? "cursor-pointer" : "cursor-default"
                )}
              >
                {/* Node Ring & Core */}
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                    state === 'active' && "bg-blue-50 border-blue-600 text-blue-600 ring-4 ring-blue-100 animate-pulse-slow",
                    state === 'completed' && "bg-green-600 border-green-600 text-white shadow-md shadow-green-100",
                    state === 'completed_cancelled' && "bg-slate-500 border-slate-500 text-white",
                    state === 'future' && "bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600",
                    state === 'cancelled' && "bg-red-600 border-red-600 text-white shadow-md shadow-red-100 animate-bounce-short"
                  )}
                >
                  {state === 'completed' ? (
                    <Check size={16} strokeWidth={3} />
                  ) : (
                    <StepIcon size={16} />
                  )}
                </div>

                {/* Step Metadata Labels */}
                <span className={cn(
                  "text-[11px] font-extrabold uppercase tracking-wide mt-3 text-center",
                  state === 'active' && "text-blue-600",
                  state === 'completed' && "text-slate-800",
                  state === 'future' && "text-slate-400 group-hover:text-slate-600",
                  state === 'cancelled' && "text-red-600"
                )}>
                  {config.label}
                </span>

                {/* Tooltip for allowed jump advancements */}
                {allowedToClick && (
                  <div className="absolute top-full mt-2 w-36 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-center pointer-events-none z-20">
                    Click to Advance Stage
                  </div>
                )}
              </div>

              {/* Connecting Line between steps */}
              {index < pipelineSteps.length - 1 && (
                <div className="flex-1 h-1 bg-slate-100 rounded-full mx-2 -mt-7 relative overflow-hidden">
                  <div 
                    className={cn(
                      "absolute inset-0 transition-all duration-500",
                      // Highlight line if target is reached
                      isCancelled 
                        ? "bg-slate-300"
                        : index < currentStepIndex 
                          ? "bg-green-500" 
                          : "bg-slate-100"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Confirmation Advancement Modal */}
      {selectedNextStatus && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-100 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4 mb-5">
              <div className={cn(
                "p-3 rounded-full shrink-0",
                selectedNextStatus === 'completed' ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
              )}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Advance Order {order.id} to {getStatusConfig(selectedNextStatus).label}?
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  You are about to advance this order from <span className="font-bold text-slate-800">{getStatusConfig(currentStatus).label}</span> to <span className="font-bold text-slate-800">{getStatusConfig(selectedNextStatus).label}</span>. This will execute corresponding business log events.
                </p>
              </div>
            </div>

            {/* Business action breakdown warnings */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mb-6">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Automated Operations Log</h4>
              
              {selectedNextStatus === 'payment_confirmed' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    Fulfillment inventory items will be reserved:
                  </p>
                  <ul className="pl-4 text-[11px] text-slate-500 font-bold space-y-1 font-mono">
                    {order.lineItems?.map(item => (
                      <li key={item.id}>• {item.productName} ({item.sku || 'No SKU'}) x{item.quantity}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic mt-1.5">
                    Reserved inventory counter will increment. Handheld stock remains unchanged. Email verification sent.
                  </p>
                </div>
              )}

              {selectedNextStatus === 'completed' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                    Items will be deducted from inventory:
                  </p>
                  <ul className="pl-4 text-[11px] text-slate-500 font-bold space-y-1 font-mono">
                    {order.lineItems?.map(item => (
                      <li key={item.id}>• {item.productName} x{item.quantity}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic mt-1.5">
                    Physical stock is decremented. Reserved counter is released. Email dispatched. Audit transaction recorded.
                  </p>
                </div>
              )}

              {selectedNextStatus !== 'completed' && selectedNextStatus !== 'payment_confirmed' && (
                <div>
                  <p className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    Standard Pipeline progression:
                  </p>
                  <p className="text-[11px] text-slate-500 font-bold pl-3 mt-1">
                    Status advancing to: {getStatusConfig(selectedNextStatus).label}. System timeline audit log added.
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={advancing}
                onClick={() => setSelectedNextStatus(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={advancing}
                onClick={handleConfirmAdvance}
                className="px-5 py-2.5 rounded-xl bg-black text-white hover:bg-slate-800 text-xs font-semibold shadow-sm cursor-pointer flex items-center gap-2"
              >
                {advancing && <Loader2 size={14} className="animate-spin" />}
                Confirm Advance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
