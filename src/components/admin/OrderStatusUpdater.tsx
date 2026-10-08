import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { getStatusConfig, ORDER_STATUSES, canTransition, getNextStatus } from '../../lib/orderStatus';
import { useOrderStatus } from '../../hooks/useOrderStatus';
import { 
  ChevronRight, 
  HelpCircle, 
  AlertTriangle, 
  X, 
  Check, 
  ShieldAlert, 
  ChevronDown, 
  FileText, 
  Loader2 
} from 'lucide-react';
import { showToast } from '../../lib/toast';
import { cn } from '../../lib/utils';

interface OrderStatusUpdaterProps {
  order: Order;
  onUpdateSuccess?: () => void;
}

export default function OrderStatusUpdater({ order, onUpdateSuccess }: OrderStatusUpdaterProps) {
  const currentStatus = order.status || 'pending';
  const fulfillmentMethod = order.fulfillment_method || 'pickup';
  const config = getStatusConfig(currentStatus);
  const Icon = config.icon;

  const { updateOrderStatus } = useOrderStatus(order.id);

  // Component states
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  
  // Jump/Rollback states
  const [showJumpDropdown, setShowJumpDropdown] = useState(false);
  const [selectedJumpStatus, setSelectedJumpStatus] = useState<OrderStatus | null>(null);
  const [jumpNote, setJumpNote] = useState('');
  
  // Cancellation states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelConfirmationText, setCancelConfirmationText] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'bank_transfer' | 'manual_override' | 'cod'>('bank_transfer');

  // Find latest state update timestamp & actor
  const latestHistory = order.status_history?.[order.status_history.length - 1];
  const lastUpdatedRaw = latestHistory?.timestamp || new Date().toISOString();
  const lastUpdatedStr = new Date(lastUpdatedRaw).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const updatedByActor = latestHistory?.changed_by || 'admin@samkhi.com';

  // Get next logical status
  const nextLogicalStatus = getNextStatus(currentStatus, fulfillmentMethod);

  // Trigger progressive advance
  const handleProgressiveAdvance = async () => {
    if (!nextLogicalStatus) return;
    setLoadingAction('advance');
    try {
      await updateOrderStatus(nextLogicalStatus, `Advanced progressively via sidebar next action`);
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      // Handled in hook
    } finally {
      setLoadingAction(null);
    }
  };

  // Trigger payment confirmation
  const handleVerifyPayment = async () => {
    setLoadingAction('payment');
    try {
      await updateOrderStatus('payment_confirmed', `Verified payment via ${paymentMethod}`, paymentMethod);
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      // Handled in hook
    } finally {
      setLoadingAction(null);
    }
  };

  // Trigger manual override jump
  const handleJumpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJumpStatus) return;
    if (!jumpNote.trim()) {
      showToast('A reason / note is required to execute an official status override.', 'warning');
      return;
    }

    setLoadingAction('jump');
    try {
      await updateOrderStatus(selectedJumpStatus, jumpNote, undefined, true);
      setSelectedJumpStatus(null);
      setJumpNote('');
      setShowJumpDropdown(false);
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      // Handled in hook
    } finally {
      setLoadingAction(null);
    }
  };

  // Trigger cancellation submit
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const expectedConfirmText = `CANCEL ${order.id}`;
    if (cancelConfirmationText !== expectedConfirmText) {
      showToast(`Verification code mismatch. Please type exactly "${expectedConfirmText}"`, 'warning');
      return;
    }
    if (!cancelReason.trim()) {
      showToast('A cancellation reason is required.', 'warning');
      return;
    }

    setLoadingAction('cancel');
    try {
      await updateOrderStatus('cancelled', cancelReason);
      setShowCancelModal(false);
      setCancelConfirmationText('');
      setCancelReason('');
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      // Handled in hook
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6 lg:max-w-xs xl:max-w-sm w-full font-sans">
      
      {/* 1. CURRENT STATUS CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-4">Current Fulfillment Status</h4>
        
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className={cn(
            "p-3 rounded-2xl border shrink-0",
            config.color.badgeBg,
            config.color.border,
            config.color.badgeText
          )}>
            <Icon size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">{config.label}</h3>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">{config.description}</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Activity Logged</p>
          <p className="text-xs text-slate-700 font-semibold">{lastUpdatedStr}</p>
          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">by {updatedByActor}</p>
        </div>
      </div>

      {/* 2. PAYMENT VERIFICATION PANEL (shown if pending) */}
      {currentStatus === 'pending' && (
        <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
            <Check size={12} strokeWidth={3} />
            Payment Verification Required
          </h4>
          <p className="text-[11px] text-amber-800 font-medium leading-relaxed leading-relaxed">
            Verify payment from bank statement, portal transaction matches, or physical checkout checks before advancing order to payment_confirmed.
          </p>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Payment Method Choice</label>
            <select
              value={paymentMethod}
              onChange={(e: any) => setPaymentMethod(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl h-10 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="bank_transfer">🏛️ Bank Transfer / Direct Wire</option>
              <option value="online">💳 Online Gateway Bypass</option>
              <option value="manual_override">📝 Manual Override</option>
              <option value="cod">💵 Cash On Delivery (COD)</option>
            </select>
          </div>

          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={handleVerifyPayment}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold h-11 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm shadow-amber-100 cursor-pointer"
          >
            {loadingAction === 'payment' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} strokeWidth={3} />
            )}
            Confirm Payment Verification
          </button>
        </div>
      )}

      {/* 3. CORE LOGISTICAL PROGRESSION ACTIONS */}
      {currentStatus !== 'completed' && currentStatus !== 'cancelled' && currentStatus !== 'pending' && nextLogicalStatus && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3.5">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Next Logical Pipeline Phase</h4>
          
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={handleProgressiveAdvance}
            className="w-full bg-black hover:bg-slate-800 text-white font-bold h-11 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 group cursor-pointer shadow-sm disabled:opacity-50"
          >
            {loadingAction === 'advance' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            )}
            <span>Mark as {getStatusConfig(nextLogicalStatus).label} →</span>
          </button>
        </div>
      )}

      {/* 4. SECONDARY AUDIT OPERATIONS (Jump Status Override & Safety Cancellation) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Logistics Audit Tools</h4>
        
        {/* Dropdown Toggle for JUMP */}
        {currentStatus !== 'completed' && currentStatus !== 'cancelled' && (
          <div className="space-y-4">
            <button
              onClick={() => {
                setShowJumpDropdown(!showJumpDropdown);
                setSelectedJumpStatus(null);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100/80 text-slate-700 border border-slate-200 h-10 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors select-none cursor-pointer"
            >
              <span>Jump to Status...</span>
              <ChevronDown size={14} className={cn("text-slate-400 transition-transform", showJumpDropdown && "rotate-180")} />
            </button>

            {/* Jump Action Area */}
            {showJumpDropdown && (
              <form onSubmit={handleJumpSubmit} className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Target Status Override</label>
                  <select
                    value={selectedJumpStatus || ''}
                    onChange={(e: any) => setSelectedJumpStatus(e.target.value as OrderStatus)}
                    className="w-full bg-white border border-slate-200 rounded-lg h-9 px-2 text-xs font-semibold focus:outline-none"
                    required
                  >
                    <option value="" disabled>Select Target Status override...</option>
                    {ORDER_STATUSES.filter(s => s.key !== currentStatus && s.key !== 'cancelled').map(s => (
                      <option key={s.key} value={s.key}>🎯 {s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Override Reason / Audit Note</label>
                  <textarea
                    placeholder="Provide mandatory operational or financial justification for jumping status..."
                    value={jumpNote}
                    onChange={(e) => setJumpNote(e.target.value)}
                    rows={3}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-black placeholder:text-slate-400"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingAction !== null || !selectedJumpStatus || !jumpNote.trim()}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-bold h-9 rounded-lg text-xs hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {loadingAction === 'jump' && <Loader2 size={12} className="animate-spin" />}
                  Confirm Status Jump
                </button>
              </form>
            )}
          </div>
        )}

        {/* CANCEL ORDER TRACE ACTION */}
        {currentStatus !== 'completed' && currentStatus !== 'cancelled' ? (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/40 font-bold h-10 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert size={14} className="shrink-0" />
            Cancel Order
          </button>
        ) : (
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              {currentStatus === 'completed' ? '🔒 Fulfilled Order' : '🔒 Terminated Order'}
            </span>
          </div>
        )}
      </div>

      {/* DETAILED TYPE-TO-CONFIRM CANCELLATION DIALOG MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2.5 text-red-600">
                <ShieldAlert size={22} />
                <h3 className="text-base font-extrabold text-slate-900">Critical Order Cancellation</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
              Cancelling Order <span className="font-mono font-bold text-slate-800">{order.id}</span> will release reserved inventory back to available pools. If online payments were processed, a refund must be handled through the dashboard database backlog.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                  Mandatory Cancellation Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer requested cancel, out of stock, wire bounce..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl h-10 px-3.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5 bg-slate-50 border border-slate-200/50 p-3.5 rounded-xl">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Type Verification Code to Confirm
                </label>
                <p className="text-[10px] text-slate-500 font-bold select-all font-mono bg-white p-2 border border-slate-200 rounded text-center">
                  CANCEL {order.id}
                </p>
                <input
                  type="text"
                  placeholder={`Type "CANCEL ${order.id}" exactly`}
                  value={cancelConfirmationText}
                  onChange={(e) => setCancelConfirmationText(e.target.value)}
                  className="w-full bg-white border border-[#e2e2e2] rounded-xl h-10 px-3.5 mt-2.5 text-xs font-mono font-bold text-center focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={loadingAction !== null}
                  onClick={() => setShowCancelModal(false)}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 h-10 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  disabled={loadingAction !== null || cancelConfirmationText !== `CANCEL ${order.id}` || !cancelReason.trim()}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold h-10 rounded-xl text-xs shadow-md shadow-red-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loadingAction === 'cancel' && <Loader2 size={12} className="animate-spin" />}
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
