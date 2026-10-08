import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Tag, 
  CheckCircle, 
  AlertCircle,
  FileText,
  X
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../../firebase';
import { showToast } from '../../lib/toast';
import { logActivity } from '../../lib/audit';

export interface Supplier {
  id: string;
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  categories: string[];
  leadTimeDays: number;
  paymentTerms: string;
  notes?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    categories: 'Solar Panels, Inverters',
    leadTimeDays: 7,
    paymentTerms: 'Net 30',
    notes: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      const items: Supplier[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Supplier);
      });
      setSuppliers(items);
      setLoading(false);
    }, (err) => {
      console.warn("Firestore suppliers fetch warning:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      code: `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      categories: 'Solar Panels, Inverters',
      leadTimeDays: 7,
      paymentTerms: 'Net 30',
      notes: '',
      status: 'Active'
    });
    setShowModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      code: supplier.code,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      categories: (supplier.categories || []).join(', '),
      leadTimeDays: supplier.leadTimeDays || 7,
      paymentTerms: supplier.paymentTerms || 'Net 30',
      notes: supplier.notes || '',
      status: supplier.status || 'Active'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Supplier Name is required', 'warning');
      return;
    }

    const supplierId = editingSupplier ? editingSupplier.id : `sup_${Date.now()}`;
    const categoryArr = formData.categories.split(',').map(c => c.trim()).filter(Boolean);

    const payload = cleanUndefined({
      id: supplierId,
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      contactPerson: formData.contactPerson.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      categories: categoryArr,
      leadTimeDays: Number(formData.leadTimeDays) || 7,
      paymentTerms: formData.paymentTerms.trim(),
      notes: formData.notes.trim(),
      status: formData.status,
      createdAt: editingSupplier ? editingSupplier.createdAt : new Date().toISOString()
    });

    try {
      if (editingSupplier) {
        await updateDoc(doc(db, 'suppliers', supplierId), payload);
        await logActivity(`Updated supplier: ${formData.name}`);
        showToast('Supplier updated successfully', 'success');
      } else {
        await setDoc(doc(db, 'suppliers', supplierId), payload);
        await logActivity(`Created new supplier: ${formData.name}`);
        showToast('Supplier created successfully', 'success');
      }
      setShowModal(false);
    } catch (err: any) {
      console.error("Error saving supplier:", err);
      showToast(err?.message || 'Failed to save supplier', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'suppliers', id));
      await logActivity(`Deleted supplier: ${name}`);
      showToast('Supplier deleted', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete supplier', 'error');
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 space-y-6 bg-surface">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest font-sans flex items-center gap-1.5 mb-1">
            <Building2 size={14} />
            Procurement & Vendor Directory
          </span>
          <h1 className="text-3xl font-display font-black text-secondary tracking-tight">Suppliers & Manufacturers</h1>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm shadow transition-all cursor-pointer"
        >
          <Plus size={16} />
          Add New Supplier
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card flex items-center gap-3">
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search suppliers by name, code, contact person..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full text-sm outline-none bg-transparent"
        />
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading suppliers...</div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <Building2 size={36} className="mx-auto text-slate-300" />
          <p className="font-semibold text-slate-600">No suppliers found</p>
          <p className="text-xs">Add your equipment manufacturers, solar distributors, or local importers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map(supplier => (
            <div key={supplier.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">{supplier.code}</span>
                    <h3 className="text-base font-extrabold text-slate-900">{supplier.name}</h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${supplier.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {supplier.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  {supplier.contactPerson && (
                    <p className="flex items-center gap-2 font-medium text-slate-800">
                      <Building2 size={13} className="text-slate-400 shrink-0" />
                      Contact: {supplier.contactPerson}
                    </p>
                  )}
                  {supplier.email && (
                    <p className="flex items-center gap-2 text-slate-600 font-mono">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      {supplier.email}
                    </p>
                  )}
                  {supplier.phone && (
                    <p className="flex items-center gap-2 text-slate-600 font-mono">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      {supplier.phone}
                    </p>
                  )}
                  {supplier.leadTimeDays && (
                    <p className="flex items-center gap-2 text-slate-500">
                      <Clock size={13} className="text-slate-400 shrink-0" />
                      Lead Time: <span className="font-bold text-slate-800">{supplier.leadTimeDays} Days</span> ({supplier.paymentTerms})
                    </p>
                  )}
                </div>

                {supplier.categories && supplier.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {supplier.categories.map((cat, i) => (
                      <span key={i} className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(supplier)}
                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded cursor-pointer"
                  title="Edit Supplier"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={() => handleDelete(supplier.id, supplier.name)}
                  className="p-1.5 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                  title="Delete Supplier"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs h-[38px] border border-slate-200 rounded px-2.5 outline-none focus:border-blue-500"
                    placeholder="e.g. Sungrow Jamaica Ltd"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Supplier Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full text-xs h-[38px] border border-slate-200 rounded px-2.5 outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full text-xs h-[38px] border border-slate-200 rounded px-2.5 outline-none focus:border-blue-500"
                    placeholder="e.g. Robert Smith"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs h-[38px] border border-slate-200 rounded px-2.5 outline-none focus:border-blue-500"
                    placeholder="sales@vendor.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs h-[38px] border border-slate-200 rounded px-2.5 outline-none focus:border-blue-500 font-mono"
                    placeholder="+1 (876) 555-0199"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full text-xs h-[38px] border border-slate-200 rounded px-2.5 outline-none focus:border-blue-500"
                    placeholder="e.g. Net 30, COD, 50% Deposit"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.leadTimeDays}
                    onChange={e => setFormData({ ...formData, leadTimeDays: Number(e.target.value) })}
                    className="w-full text-xs h-[38px] border border-slate-200 rounded px-2.5 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs h-[38px] border border-slate-200 rounded px-2.5 outline-none focus:border-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Product Categories (comma separated)</label>
                <input
                  type="text"
                  value={formData.categories}
                  onChange={e => setFormData({ ...formData, categories: e.target.value })}
                  className="w-full text-xs h-[38px] border border-slate-200 rounded px-2.5 outline-none focus:border-blue-500"
                  placeholder="Solar Panels, Inverters, LED Floodlights"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Address / Location</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-xs h-[38px] border border-slate-200 rounded px-2.5 outline-none focus:border-blue-500"
                  placeholder="12 Industrial Terrace, Kingston 11, Jamaica"
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
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 cursor-pointer"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
