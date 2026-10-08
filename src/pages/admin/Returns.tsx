import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Package, 
  DollarSign, 
  User, 
  Edit3, 
  Trash2, 
  X,
  ArrowRight,
  Boxes
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db, cleanUndefined } from '../../firebase';
import { useOrders } from '../../context/OrderContext';
import { useProducts } from '../../context/ProductContext';
import { showToast } from '../../lib/toast';
import { logActivity } from '../../lib/audit';

export interface ReturnedItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  reason: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail?: string;
  items: ReturnedItem[];
  refundAmount: number;
  condition: 'Unopened / New' | 'Defective on Arrival' | 'Damaged Shipping' | 'Opened / Used';
  status: 'Requested' | 'Approved' | 'Restocked & Refunded' | 'Rejected';
  notes?: string;
  requestedAt: string;
  processedAt?: string;
}

export default function AdminReturns() {
  const { orders } = useOrders();
  const { products } = useProducts();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    orderId: '',
    customerName: '',
    customerEmail: '',
    productId: '',
    productName: '',
    quantity: 1,
    unitPrice: 0,
    reason: 'Defective inverter output stage',
    condition: 'Defective on Arrival' as ReturnRequest['condition'],
    refundAmount: 0,
    notes: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'returns'), (snapshot) => {
      const items: ReturnRequest[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as ReturnRequest);
      });
      setReturns(items);
      setLoading(false);
    }, (err) => {
      console.warn("Firestore returns fetch warning:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const openCreateModal = () => {
    const ord = orders[0];
    const lineItem = ord?.lineItems?.[0];

    setFormData({
      orderId: ord?.id || '',
      customerName: ord?.customerName || '',
      customerEmail: ord?.customerEmail || '',
      productId: lineItem?.productId || products[0]?.id || '',
      productName: lineItem?.productName || products[0]?.name || '',
      quantity: lineItem?.quantity || 1,
      unitPrice: lineItem?.price || products[0]?.price || 0,
      reason: 'Defective unit / warranty replacement request',
      condition: 'Defective on Arrival',
      refundAmount: (lineItem?.price || 0) * (lineItem?.quantity || 1),
      notes: ''
    });
    setShowModal(true);
  };

  const handleOrderSelect = (ordId: string) => {
    const ord = orders.find(o => o.id === ordId);
    if (ord) {
      const lineItem = ord.lineItems?.[0];
      const price = lineItem?.price || 0;
      const qty = lineItem?.quantity || 1;
      setFormData(prev => ({
        ...prev,
        orderId: ordId,
        customerName: ord.customerName,
        customerEmail: ord.customerEmail || '',
        productId: lineItem?.productId || prev.productId,
        productName: lineItem?.productName || prev.productName,
        unitPrice: price,
        quantity: qty,
        refundAmount: price * qty
      }));
    } else {
      setFormData(prev => ({ ...prev, orderId: ordId }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName) {
      showToast('Product name is required', 'warning');
      return;
    }

    const returnId = `rma_${Date.now()}`;
    const payload: ReturnRequest = cleanUndefined({
      id: returnId,
      orderId: formData.orderId,
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      items: [
        {
          productId: formData.productId,
          productName: formData.productName,
          quantity: Number(formData.quantity),
          unitPrice: Number(formData.unitPrice),
          reason: formData.reason
        }
      ],
      refundAmount: Number(formData.refundAmount),
      condition: formData.condition,
      status: 'Requested',
      notes: formData.notes,
      requestedAt: new Date().toISOString()
    });

    try {
      await setDoc(doc(db, 'returns', returnId), payload as any);
      await logActivity(`Submitted RMA return request #${returnId} for Order #${formData.orderId}`);
      showToast('RMA return request created!', 'success');
      setShowModal(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to create RMA return', 'error');
    }
  };

  const handleApproveAndRestock = async (rma: ReturnRequest) => {
    if (!window.confirm(`Approve RMA #${rma.id} and restock items back into inventory?`)) return;

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Restock each returned item in inventory_levels
        for (const item of rma.items) {
          const lvlId = `lvl_${item.productId}`;
          const lvlRef = doc(db, 'inventory_levels', lvlId);
          const lvlSnap = await transaction.get(lvlRef);

          if (lvlSnap.exists()) {
            const onHand = lvlSnap.data().quantityOnHand || 0;
            const avail = lvlSnap.data().quantityAvailable || 0;
            const newOnHand = onHand + item.quantity;
            const newAvail = avail + item.quantity;

            transaction.update(lvlRef, {
              quantityOnHand: newOnHand,
              quantityAvailable: newAvail,
              updatedAt: new Date().toISOString()
            });

            // Log inventory transaction
            const txId = `tx_rma_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const txRef = doc(db, 'inventory_transactions', txId);
            transaction.set(txRef, {
              id: txId,
              productId: item.productId,
              transactionType: 'return_restock',
              quantityChange: item.quantity,
              quantityBefore: onHand,
              quantityAfter: newOnHand,
              referenceType: 'rma_return',
              referenceId: rma.id,
              notes: `Restocked ${item.quantity}x ${item.productName} via approved RMA #${rma.id}`,
              performedBy: 'admin@samkhi.com',
              performedAt: new Date().toISOString()
            });
          }
        }

        // 2. Update return status
        const rmaRef = doc(db, 'returns', rma.id);
        transaction.update(rmaRef, {
          status: 'Restocked & Refunded',
          processedAt: new Date().toISOString()
        });
      });

      await logActivity(`Approved & restocked RMA #${rma.id} (Order #${rma.orderId})`);
      showToast('RMA approved and inventory restocked successfully!', 'success');
    } catch (err: any) {
      console.error("RMA Restock Error:", err);
      showToast(err?.message || 'Failed to process RMA restock', 'error');
    }
  };

  const handleReject = async (rma: ReturnRequest) => {
    if (!window.confirm(`Reject RMA #${rma.id}?`)) return;
    try {
      await updateDoc(doc(db, 'returns', rma.id), {
        status: 'Rejected',
        processedAt: new Date().toISOString()
      });
      await logActivity(`Rejected RMA return #${rma.id}`);
      showToast('RMA request rejected', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to reject RMA', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Delete RMA record #${id}?`)) return;
    try {
      await deleteDoc(doc(db, 'returns', id));
      showToast('RMA record deleted', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete record', 'error');
    }
  };

  const filtered = returns.filter(r => {
    const matchesQuery =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.items.some(i => i.productName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || r.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 bg-surface">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-widest font-sans flex items-center gap-1.5 mb-1">
            <RotateCcw size={14} />
            Reverse Logistics & Quality Assurance
          </span>
          <h1 className="text-3xl font-display font-black text-secondary tracking-tight">Returns & RMA Management</h1>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm shadow transition-all cursor-pointer"
        >
          <Plus size={16} />
          Create RMA Ticket
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2 flex-1 w-full">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search by RMA ID, Order ID, customer, product..."
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
            <option value="all">All RMA Statuses</option>
            <option value="Requested">Requested</option>
            <option value="Approved">Approved</option>
            <option value="Restocked & Refunded">Restocked & Refunded</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading RMA return tickets...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <RotateCcw size={36} className="mx-auto text-slate-300" />
          <p className="font-semibold text-slate-600">No RMA return requests found</p>
          <p className="text-xs">Process returned products, restock inventory automatically, and handle customer replacements.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(rma => (
            <div key={rma.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-600 uppercase block">RMA #{rma.id} • Order #{rma.orderId}</span>
                    <h3 className="text-base font-extrabold text-slate-900">{rma.customerName}</h3>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                    rma.status === 'Restocked & Refunded' ? 'bg-emerald-100 text-emerald-800' :
                    rma.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                    rma.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {rma.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">Condition: <span className="text-slate-700">{rma.condition}</span></p>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Returned Line Items:</p>
                    {rma.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-700 font-mono text-[11px]">
                        <span>{item.quantity}x {item.productName}</span>
                        <span className="font-bold">JMD ${(item.quantity * item.unitPrice).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-slate-500">
                    Reason: <span className="italic text-slate-700">"{rma.items[0]?.reason}"</span>
                  </p>

                  <p className="text-xs font-bold text-slate-900">
                    Refund Amount: <span className="text-emerald-600 font-extrabold">JMD ${rma.refundAmount.toLocaleString()}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                {rma.status === 'Requested' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveAndRestock(rma)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <Boxes size={13} /> Approve & Restock
                    </button>
                    <button
                      onClick={() => handleReject(rma)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded border border-red-200 cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">
                    Processed {rma.processedAt?.slice(0, 10)}
                  </span>
                )}

                <button
                  onClick={() => handleDelete(rma.id)}
                  className="p-1.5 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                  title="Delete Record"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create RMA Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Create RMA Return Request</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Select Order</label>
                <select
                  value={formData.orderId}
                  onChange={e => handleOrderSelect(e.target.value)}
                  className="w-full text-xs h-[38px] border rounded px-2.5 font-semibold"
                >
                  <option value="">-- Select Order --</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>Order #{o.id} - {o.customerName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full text-xs h-[38px] border rounded px-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Customer Email</label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full text-xs h-[38px] border rounded px-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Returned Product *</label>
                <input
                  type="text"
                  required
                  value={formData.productName}
                  onChange={e => setFormData({ ...formData, productName: e.target.value })}
                  className="w-full text-xs h-[38px] border rounded px-2.5 font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={e => {
                      const qty = Number(e.target.value);
                      setFormData({ ...formData, quantity: qty, refundAmount: qty * formData.unitPrice });
                    }}
                    className="w-full text-xs h-[38px] border rounded px-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Unit Price (JMD)</label>
                  <input
                    type="number"
                    required
                    value={formData.unitPrice}
                    onChange={e => {
                      const price = Number(e.target.value);
                      setFormData({ ...formData, unitPrice: price, refundAmount: formData.quantity * price });
                    }}
                    className="w-full text-xs h-[38px] border rounded px-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Refund Total</label>
                  <input
                    type="number"
                    required
                    value={formData.refundAmount}
                    onChange={e => setFormData({ ...formData, refundAmount: Number(e.target.value) })}
                    className="w-full text-xs h-[38px] border rounded px-2.5 font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Item Condition</label>
                <select
                  value={formData.condition}
                  onChange={e => setFormData({ ...formData, condition: e.target.value as any })}
                  className="w-full text-xs h-[38px] border rounded px-2.5 font-semibold"
                >
                  <option value="Unopened / New">Unopened / New Box</option>
                  <option value="Defective on Arrival">Defective on Arrival</option>
                  <option value="Damaged Shipping">Damaged Shipping Container</option>
                  <option value="Opened / Used">Opened / Used</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Reason for Return</label>
                <textarea
                  rows={2}
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full text-xs border rounded p-2"
                  placeholder="e.g. Inverter thermal sensor warning active out of the box."
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border text-xs font-semibold rounded text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700 cursor-pointer"
                >
                  Save RMA Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
