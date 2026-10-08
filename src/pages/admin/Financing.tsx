import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Send, 
  User, 
  Calendar, 
  X,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useOrders } from '../../context/OrderContext';
import { showToast } from '../../lib/toast';
import { logActivity } from '../../lib/audit';

export interface FinancingInstallment {
  id: string;
  title: string;
  dueDate: string;
  amount: number;
  paid: boolean;
  paidAt?: string;
  notes?: string;
}

export interface FinancingPlan {
  provider: 'In-House Samkhi Credit' | 'National Commercial Bank' | 'Lynk Financing' | 'Sagicor Credit';
  totalFinanced: number;
  depositAmount: number;
  remainingBalance: number;
  status: 'Deposit Paid' | 'Installments Active' | 'Overdue' | 'Fully Settled';
  installments: FinancingInstallment[];
  notes?: string;
}

export default function AdminFinancing() {
  const { orders } = useOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showAttachModal, setShowAttachModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');

  // Attach Plan Form State
  const [planForm, setPlanForm] = useState({
    provider: 'In-House Samkhi Credit' as FinancingPlan['provider'],
    depositPercent: 50,
    installmentsCount: 3,
    notes: ''
  });

  // Pay Installment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [targetOrder, setTargetOrder] = useState<any | null>(null);
  const [targetInstallment, setTargetInstallment] = useState<FinancingInstallment | null>(null);

  // Orders that have financing plans
  const financedOrders = orders.filter(o => o.financingPlan || (o as any).financingPlan);

  const calculateFinancingMetrics = () => {
    let totalFinanced = 0;
    let totalOutstanding = 0;
    let totalCollected = 0;
    let overdueCount = 0;

    financedOrders.forEach(o => {
      const plan: FinancingPlan = (o as any).financingPlan;
      if (!plan) return;
      totalFinanced += plan.totalFinanced || 0;
      totalOutstanding += plan.remainingBalance || 0;
      totalCollected += (plan.depositAmount || 0) + ((plan.totalFinanced || 0) - (plan.depositAmount || 0) - (plan.remainingBalance || 0));

      const today = new Date().toISOString().slice(0, 10);
      plan.installments?.forEach(inst => {
        if (!inst.paid && inst.dueDate < today) {
          overdueCount++;
        }
      });
    });

    return { totalFinanced, totalOutstanding, totalCollected, overdueCount };
  };

  const metrics = calculateFinancingMetrics();

  const handleOpenAttachModal = () => {
    const candidate = orders.find(o => !o.financingPlan);
    setSelectedOrderId(candidate?.id || orders[0]?.id || '');
    setShowAttachModal(true);
  };

  const handleAttachPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ord = orders.find(o => o.id === selectedOrderId);
    if (!ord) {
      showToast('Please select a valid order', 'warning');
      return;
    }

    const total = ord.total || 0;
    const deposit = Math.round((total * planForm.depositPercent) / 100);
    const balance = total - deposit;
    const numInst = Math.max(1, planForm.installmentsCount);
    const instAmount = Math.round(balance / numInst);

    const installments: FinancingInstallment[] = [];
    const today = new Date();

    for (let i = 1; i <= numInst; i++) {
      const d = new Date(today);
      d.setMonth(d.getMonth() + i);
      installments.push({
        id: `inst_${i}_${Date.now()}`,
        title: `Installment #${i} of ${numInst}`,
        dueDate: d.toISOString().slice(0, 10),
        amount: i === numInst ? balance - (instAmount * (numInst - 1)) : instAmount,
        paid: false
      });
    }

    const newPlan: FinancingPlan = {
      provider: planForm.provider,
      totalFinanced: total,
      depositAmount: deposit,
      remainingBalance: balance,
      status: deposit > 0 ? 'Deposit Paid' : 'Installments Active',
      installments,
      notes: planForm.notes
    };

    try {
      await updateDoc(doc(db, 'orders', ord.id), {
        financingPlan: newPlan
      });
      await logActivity(`Created financing payment plan for Order #${ord.id} (${planForm.provider})`);
      showToast('Financing plan attached to order!', 'success');
      setShowAttachModal(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to attach financing plan', 'error');
    }
  };

  const openPayModal = (order: any, inst: FinancingInstallment) => {
    setTargetOrder(order);
    setTargetInstallment(inst);
    setShowPayModal(true);
  };

  const handleConfirmInstallmentPayment = async () => {
    if (!targetOrder || !targetInstallment) return;

    const currentPlan: FinancingPlan = targetOrder.financingPlan;
    if (!currentPlan) return;

    const updatedInstallments = currentPlan.installments.map(inst => {
      if (inst.id === targetInstallment.id) {
        return {
          ...inst,
          paid: true,
          paidAt: new Date().toISOString()
        };
      }
      return inst;
    });

    const newRemainingBalance = Math.max(0, currentPlan.remainingBalance - targetInstallment.amount);
    const allPaid = updatedInstallments.every(inst => inst.paid);
    const newStatus = allPaid ? 'Fully Settled' : 'Installments Active';

    try {
      await updateDoc(doc(db, 'orders', targetOrder.id), {
        'financingPlan.installments': updatedInstallments,
        'financingPlan.remainingBalance': newRemainingBalance,
        'financingPlan.status': newStatus,
        paymentStatus: allPaid ? 'paid' : 'partially_paid'
      });

      await logActivity(`Recorded JMD $${targetInstallment.amount.toLocaleString()} installment payment for Order #${targetOrder.id}`);
      showToast('Installment payment recorded!', 'success');
      setShowPayModal(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to record payment', 'error');
    }
  };

  const filteredOrders = financedOrders.filter(ord => {
    const plan: FinancingPlan = ord.financingPlan;
    const matchesSearch =
      ord.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan?.provider.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || plan?.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 bg-surface">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest font-sans flex items-center gap-1.5 mb-1">
            <CreditCard size={14} />
            Structured Credit & Deferred Payments
          </span>
          <h1 className="text-3xl font-display font-black text-secondary tracking-tight">Financing & Installment Ledger</h1>
        </div>

        <button
          onClick={handleOpenAttachModal}
          className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm shadow transition-all cursor-pointer"
        >
          <Plus size={16} />
          Attach Financing Plan
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Financed Capital</p>
          <p className="text-2xl font-black text-slate-900 mt-1">JMD ${metrics.totalFinanced.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">{financedOrders.length} Active Credit Plans</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected Deposits & Payments</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">JMD ${metrics.totalCollected.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">Cash Inflow Verified</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Balance Due</p>
          <p className="text-2xl font-black text-blue-600 mt-1">JMD ${metrics.totalOutstanding.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">Scheduled for future collection</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Installments</p>
          <p className={`text-2xl font-black mt-1 ${metrics.overdueCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {metrics.overdueCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Requires follow-up</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2 flex-1 w-full">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order ID, customer, provider..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-sm outline-none bg-transparent"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs h-[38px] border border-slate-200 rounded-lg px-3 bg-slate-50 font-semibold"
          >
            <option value="all">All Plan Statuses</option>
            <option value="Deposit Paid">Deposit Paid</option>
            <option value="Installments Active">Installments Active</option>
            <option value="Fully Settled">Fully Settled</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <CreditCard size={36} className="mx-auto text-slate-300" />
          <p className="font-semibold text-slate-600">No financing plans found</p>
          <p className="text-xs">Attach structured payment terms (50% down + 3 installments) to high-value commercial orders.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(ord => {
            const plan: FinancingPlan = ord.financingPlan;
            return (
              <div key={ord.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-card space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-600 uppercase block">Order #{ord.id}</span>
                    <h3 className="text-lg font-black text-slate-900">{ord.customerName}</h3>
                    <p className="text-xs text-slate-500">Provider: <span className="font-bold text-slate-700">{plan.provider}</span></p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Financed Total</p>
                      <p className="text-base font-black text-slate-900">JMD ${plan.totalFinanced.toLocaleString()}</p>
                    </div>
                    <div className="text-right pl-3 border-l">
                      <p className="text-xs text-slate-500">Remaining Due</p>
                      <p className={`text-base font-black ${plan.remainingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        JMD ${plan.remainingBalance.toLocaleString()}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      plan.status === 'Fully Settled' ? 'bg-emerald-100 text-emerald-800' :
                      plan.status === 'Deposit Paid' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                </div>

                {/* Installments Schedule */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Installments Schedule</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Deposit Box */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-800">Initial Deposit (Down Payment)</p>
                        <p className="text-[10px] text-slate-500">JMD ${plan.depositAmount.toLocaleString()}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Paid / Verified
                      </span>
                    </div>

                    {/* Installments */}
                    {plan.installments?.map(inst => {
                      const isOverdue = !inst.paid && inst.dueDate < new Date().toISOString().slice(0, 10);
                      return (
                        <div key={inst.id} className={`p-3 rounded-lg border flex justify-between items-center text-xs ${
                          inst.paid ? 'bg-emerald-50/50 border-emerald-200' :
                          isOverdue ? 'bg-red-50 border-red-200' :
                          'bg-white border-slate-200'
                        }`}>
                          <div>
                            <p className="font-bold text-slate-900">{inst.title}</p>
                            <p className="text-[11px] font-mono text-slate-600">
                              JMD ${inst.amount.toLocaleString()} • Due: <span className="font-bold">{inst.dueDate}</span>
                            </p>
                          </div>

                          {inst.paid ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <CheckCircle size={10} /> Paid
                            </span>
                          ) : (
                            <button
                              onClick={() => openPayModal(ord, inst)}
                              className={`px-3 py-1 text-[11px] font-bold rounded shadow-xs cursor-pointer ${
                                isOverdue ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              Record Payment
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attach Financing Modal */}
      {showAttachModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Attach Structured Financing Plan</h2>
              <button onClick={() => setShowAttachModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAttachPlanSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Select Customer Order *</label>
                <select
                  value={selectedOrderId}
                  onChange={e => setSelectedOrderId(e.target.value)}
                  className="w-full text-xs h-[38px] border rounded px-2.5 font-semibold"
                >
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>Order #{o.id} - {o.customerName} (${o.total?.toLocaleString()} JMD)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Financing Partner / Provider</label>
                <select
                  value={planForm.provider}
                  onChange={e => setPlanForm({ ...planForm, provider: e.target.value as any })}
                  className="w-full text-xs h-[38px] border rounded px-2.5 font-semibold"
                >
                  <option value="In-House Samkhi Credit">In-House Samkhi Credit</option>
                  <option value="National Commercial Bank">National Commercial Bank (NCB Credit)</option>
                  <option value="Lynk Financing">Lynk Digital Financing</option>
                  <option value="Sagicor Credit">Sagicor Commercial Credit</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Deposit Down (% Total)</label>
                  <select
                    value={planForm.depositPercent}
                    onChange={e => setPlanForm({ ...planForm, depositPercent: Number(e.target.value) })}
                    className="w-full text-xs h-[38px] border rounded px-2.5 font-semibold"
                  >
                    <option value={20}>20% Deposit</option>
                    <option value={30}>30% Deposit</option>
                    <option value={50}>50% Deposit (Standard)</option>
                    <option value={70}>70% Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Monthly Installments</label>
                  <select
                    value={planForm.installmentsCount}
                    onChange={e => setPlanForm({ ...planForm, installmentsCount: Number(e.target.value) })}
                    className="w-full text-xs h-[38px] border rounded px-2.5 font-semibold"
                  >
                    <option value={2}>2 Monthly Payments</option>
                    <option value={3}>3 Monthly Payments</option>
                    <option value={6}>6 Monthly Payments</option>
                    <option value={12}>12 Monthly Payments</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Credit Notes / Guarantee Details</label>
                <textarea
                  rows={2}
                  value={planForm.notes}
                  onChange={e => setPlanForm({ ...planForm, notes: e.target.value })}
                  className="w-full text-xs border rounded p-2"
                  placeholder="e.g. Approved under corporate commercial agreement."
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAttachModal(false)}
                  className="px-4 py-2 border text-xs font-semibold rounded text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 cursor-pointer"
                >
                  Attach Financing Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Installment Modal */}
      {showPayModal && targetOrder && targetInstallment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Record Installment Payment</h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-lg border space-y-1">
                <p>Order: <span className="font-bold">#{targetOrder.id} - {targetOrder.customerName}</span></p>
                <p>Installment: <span className="font-bold">{targetInstallment.title}</span></p>
                <p className="text-sm font-black text-emerald-600 mt-1">Amount: JMD ${targetInstallment.amount.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500">Due Date: {targetInstallment.dueDate}</p>
              </div>

              <p className="text-slate-500">
                Confirming this action will mark the installment as paid and deduct JMD ${targetInstallment.amount.toLocaleString()} from the outstanding balance.
              </p>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border text-xs font-semibold rounded text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmInstallmentPayment}
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 cursor-pointer"
                >
                  Confirm Received
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
