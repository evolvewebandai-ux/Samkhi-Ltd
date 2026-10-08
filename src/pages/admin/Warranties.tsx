import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Edit3, 
  Trash2, 
  X,
  User,
  Package,
  AlertTriangle
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../../firebase';
import { useOrders } from '../../context/OrderContext';
import { useProducts } from '../../context/ProductContext';
import { showToast } from '../../lib/toast';
import { logActivity } from '../../lib/audit';

export interface WarrantyClaim {
  id: string;
  claimDate: string;
  issueDescription: string;
  resolutionStatus: 'Pending' | 'Approved Repair' | 'Replacement Issued' | 'Rejected';
  resolutionNotes?: string;
}

export interface WarrantyRecord {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail?: string;
  productId: string;
  productName: string;
  serialNumber?: string;
  durationMonths: number;
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  status: 'Active' | 'Expired' | 'Claimed' | 'Under Review';
  claims: WarrantyClaim[];
  notes?: string;
  createdAt: string;
}

export default function AdminWarranties() {
  const { orders } = useOrders();
  const { products } = useProducts();
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedWarrantyForClaim, setSelectedWarrantyForClaim] = useState<WarrantyRecord | null>(null);

  // Warranty Registration Form
  const [formData, setFormData] = useState({
    orderId: '',
    customerName: '',
    customerEmail: '',
    productId: '',
    productName: '',
    serialNumber: '',
    durationMonths: 24, // default 2 years
    startDate: new Date().toISOString().slice(0, 10),
    status: 'Active' as WarrantyRecord['status'],
    notes: ''
  });

  // Claim Intake Form
  const [claimData, setClaimData] = useState({
    issueDescription: '',
    resolutionStatus: 'Pending' as WarrantyClaim['resolutionStatus'],
    resolutionNotes: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'warranties'), (snapshot) => {
      const items: WarrantyRecord[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        // Check auto-expiry
        const expDate = new Date(data.expiryDate);
        let status = data.status;
        if (status === 'Active' && expDate < new Date()) {
          status = 'Expired';
        }
        items.push({ id: docSnap.id, ...data, status } as WarrantyRecord);
      });
      setWarranties(items);
      setLoading(false);
    }, (err) => {
      console.warn("Firestore warranties fetch warning:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const openCreateModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    setFormData({
      orderId: orders[0]?.id || '',
      customerName: orders[0]?.customerName || '',
      customerEmail: orders[0]?.customerEmail || '',
      productId: products[0]?.id || '',
      productName: products[0]?.name || '',
      serialNumber: `SN-SLR-${Math.floor(100000 + Math.random() * 900000)}`,
      durationMonths: 24,
      startDate: today,
      status: 'Active',
      notes: ''
    });
    setShowModal(true);
  };

  const handleOrderSelect = (ordId: string) => {
    const ord = orders.find(o => o.id === ordId);
    if (ord) {
      const lineItem = ord.lineItems?.[0];
      setFormData(prev => ({
        ...prev,
        orderId: ordId,
        customerName: ord.customerName,
        customerEmail: ord.customerEmail || '',
        productId: lineItem?.productId || prev.productId,
        productName: lineItem?.productName || prev.productName
      }));
    } else {
      setFormData(prev => ({ ...prev, orderId: ordId }));
    }
  };

  const handleProductSelect = (prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setFormData(prev => ({
        ...prev,
        productId: prodId,
        productName: prod.name
      }));
    } else {
      setFormData(prev => ({ ...prev, productId: prodId }));
    }
  };

  const handleSubmitWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName) {
      showToast('Product name is required', 'warning');
      return;
    }

    const start = new Date(formData.startDate);
    const exp = new Date(start);
    exp.setMonth(exp.getMonth() + Number(formData.durationMonths));
    const expiryDateStr = exp.toISOString().slice(0, 10);

    const id = `war_${Date.now()}`;
    const payload: WarrantyRecord = cleanUndefined({
      id,
      orderId: formData.orderId,
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      productId: formData.productId,
      productName: formData.productName,
      serialNumber: formData.serialNumber,
      durationMonths: Number(formData.durationMonths),
      startDate: formData.startDate,
      expiryDate: expiryDateStr,
      status: formData.status,
      claims: [],
      notes: formData.notes,
      createdAt: new Date().toISOString()
    });

    try {
      await setDoc(doc(db, 'warranties', id), payload as any);
      await logActivity(`Registered Warranty for product "${formData.productName}" (Order #${formData.orderId})`);
      showToast(`Warranty registered for ${formData.customerName}!`, 'success');
      setShowModal(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to register warranty', 'error');
    }
  };

  const openClaimModal = (warranty: WarrantyRecord) => {
    setSelectedWarrantyForClaim(warranty);
    setClaimData({
      issueDescription: '',
      resolutionStatus: 'Pending',
      resolutionNotes: ''
    });
    setShowClaimModal(true);
  };

  const handleAddClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarrantyForClaim) return;
    if (!claimData.issueDescription.trim()) {
      showToast('Please describe the issue for the claim', 'warning');
      return;
    }

    const newClaim: WarrantyClaim = {
      id: `clm_${Date.now()}`,
      claimDate: new Date().toISOString().slice(0, 10),
      issueDescription: claimData.issueDescription.trim(),
      resolutionStatus: claimData.resolutionStatus,
      resolutionNotes: claimData.resolutionNotes.trim()
    };

    const updatedClaims = [...(selectedWarrantyForClaim.claims || []), newClaim];
    const newStatus = claimData.resolutionStatus === 'Approved Repair' || claimData.resolutionStatus === 'Replacement Issued' ? 'Claimed' : 'Under Review';

    try {
      await updateDoc(doc(db, 'warranties', selectedWarrantyForClaim.id), {
        claims: updatedClaims,
        status: newStatus
      });
      await logActivity(`Logged warranty claim for ${selectedWarrantyForClaim.productName} (Serial: ${selectedWarrantyForClaim.serialNumber})`);
      showToast('Warranty claim logged successfully!', 'success');
      setShowClaimModal(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to log claim', 'error');
    }
  };

  const handleDelete = async (id: string, prodName: string) => {
    if (!window.confirm(`Delete warranty record for ${prodName}?`)) return;
    try {
      await deleteDoc(doc(db, 'warranties', id));
      showToast('Warranty record deleted', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete warranty', 'error');
    }
  };

  const filtered = warranties.filter(w => {
    const matchesQuery =
      (w.orderId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.serialNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || w.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 bg-surface">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest font-sans flex items-center gap-1.5 mb-1">
            <ShieldCheck size={14} />
            Customer Protection & Guarantee
          </span>
          <h1 className="text-3xl font-display font-black text-secondary tracking-tight">Warranty Ledger & RMA Claims</h1>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm shadow transition-all cursor-pointer"
        >
          <Plus size={16} />
          Register New Warranty
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2 flex-1 w-full">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order ID, customer, product, serial number..."
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
            <option value="all">All Warranty Statuses</option>
            <option value="Active">Active</option>
            <option value="Under Review">Under Review</option>
            <option value="Claimed">Claimed / Replaced</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading warranty ledger...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <ShieldCheck size={36} className="mx-auto text-slate-300" />
          <p className="font-semibold text-slate-600">No warranty records found</p>
          <p className="text-xs">Register warranties for inverters, lithium batteries, and solar panels to manage RMA claims.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-600 uppercase block">Order #{item.orderId}</span>
                    <h3 className="text-base font-extrabold text-slate-900 line-clamp-1">{item.productName}</h3>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                    item.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                    item.status === 'Under Review' ? 'bg-amber-100 text-amber-800' :
                    item.status === 'Claimed' ? 'bg-purple-100 text-purple-800' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">Customer: {item.customerName}</p>
                  {item.serialNumber && (
                    <p className="font-mono text-slate-600 text-[11px]">S/N: <span className="font-bold text-slate-800">{item.serialNumber}</span></p>
                  )}
                  <p className="flex items-center gap-1.5 text-slate-500">
                    <Clock size={13} className="text-slate-400" />
                    Coverage: <span className="font-bold text-slate-800">{item.durationMonths} Months</span> ({item.startDate} to {item.expiryDate})
                  </p>

                  {item.claims && item.claims.length > 0 && (
                    <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100 text-[11px] space-y-1 mt-2">
                      <p className="font-bold text-purple-900 flex items-center gap-1">
                        <AlertCircle size={12} /> Claims Logged ({item.claims.length}):
                      </p>
                      {item.claims.map(clm => (
                        <div key={clm.id} className="text-purple-800 border-t border-purple-100 pt-1">
                          <span className="font-semibold">{clm.claimDate}:</span> {clm.issueDescription} ({clm.resolutionStatus})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => openClaimModal(item)}
                  className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded border border-purple-200 cursor-pointer"
                >
                  + Log Claim
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.productName)}
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

      {/* Register Warranty Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Register Warranty Coverage</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitWarranty} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Select Order</label>
                <select
                  value={formData.orderId}
                  onChange={e => handleOrderSelect(e.target.value)}
                  className="w-full text-xs h-[38px] border rounded px-2.5 font-semibold"
                >
                  <option value="">-- Choose Order --</option>
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
                <label className="text-xs font-bold text-slate-600 block mb-1">Equipment Product *</label>
                <select
                  value={formData.productId}
                  onChange={e => handleProductSelect(e.target.value)}
                  className="w-full text-xs h-[38px] border rounded px-2.5 font-semibold"
                >
                  <option value="">-- Select Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Serial Number / Unique ID</label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full text-xs h-[38px] border rounded px-2.5 font-mono"
                    placeholder="e.g. SN-INV-99201"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Coverage (Months)</label>
                  <select
                    value={formData.durationMonths}
                    onChange={e => setFormData({ ...formData, durationMonths: Number(e.target.value) })}
                    className="w-full text-xs h-[38px] border rounded px-2.5 font-semibold"
                  >
                    <option value={12}>12 Months (1 Year)</option>
                    <option value={24}>24 Months (2 Years)</option>
                    <option value={36}>36 Months (3 Years)</option>
                    <option value={60}>60 Months (5 Years)</option>
                    <option value={120}>120 Months (10 Years)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Start Date (Install/Delivery)</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full text-xs h-[38px] border rounded px-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs h-[38px] border rounded px-2.5"
                  >
                    <option value="Active">Active</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Claimed">Claimed</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
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
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 cursor-pointer"
                >
                  Save Warranty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Claim Intake Modal */}
      {showClaimModal && selectedWarrantyForClaim && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Log Warranty Claim</h3>
                <p className="text-xs text-slate-500">{selectedWarrantyForClaim.productName} (S/N: {selectedWarrantyForClaim.serialNumber || 'N/A'})</p>
              </div>
              <button onClick={() => setShowClaimModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddClaim} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Reported Issue / Defect *</label>
                <textarea
                  rows={3}
                  required
                  value={claimData.issueDescription}
                  onChange={e => setClaimData({ ...claimData, issueDescription: e.target.value })}
                  className="w-full text-xs border rounded p-2.5 outline-none focus:border-blue-500"
                  placeholder="e.g. Inverter error code E-04 during surge peak, customer reported tripped breaker."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Resolution Decision</label>
                <select
                  value={claimData.resolutionStatus}
                  onChange={e => setClaimData({ ...claimData, resolutionStatus: e.target.value as any })}
                  className="w-full text-xs h-[38px] border rounded px-2.5 font-semibold"
                >
                  <option value="Pending">Pending Technical Inspection</option>
                  <option value="Approved Repair">Approved On-Site Repair</option>
                  <option value="Replacement Issued">Replacement Unit Issued</option>
                  <option value="Rejected">Claim Rejected (Out of Terms)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Technical Notes</label>
                <input
                  type="text"
                  value={claimData.resolutionNotes}
                  onChange={e => setClaimData({ ...claimData, resolutionNotes: e.target.value })}
                  className="w-full text-xs h-[38px] border rounded px-2.5"
                  placeholder="e.g. Dispatched replacement unit from Kingston warehouse."
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2 border text-xs font-semibold rounded text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white text-xs font-bold rounded hover:bg-purple-700 cursor-pointer"
                >
                  Log Claim Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
