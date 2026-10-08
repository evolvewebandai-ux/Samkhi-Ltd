import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Search, 
  User, 
  MapPin, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Edit3, 
  Trash2, 
  X,
  Phone,
  Wrench
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../../firebase';
import { useOrders } from '../../context/OrderContext';
import { showToast } from '../../lib/toast';
import { logActivity } from '../../lib/audit';

export interface InstallationJob {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress: string;
  parish: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime?: string;
  assignedInstaller: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Rescheduled' | 'Cancelled';
  notes?: string;
  createdAt: string;
}

export default function AdminInstallations() {
  const { orders } = useOrders();
  const [installations, setInstallations] = useState<InstallationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<InstallationJob | null>(null);

  const [formData, setFormData] = useState({
    orderId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    parish: 'Kingston',
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledTime: '09:00 AM',
    assignedInstaller: 'Lead Engineer Marcus Campbell',
    status: 'Scheduled' as InstallationJob['status'],
    notes: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'installations'), (snapshot) => {
      const items: InstallationJob[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as InstallationJob);
      });
      setInstallations(items);
      setLoading(false);
    }, (err) => {
      console.warn("Firestore installations fetch warning:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const openCreateModal = (prefilledOrderId?: string) => {
    setEditingJob(null);
    let name = '';
    let phone = '';
    let addr = '';
    let parish = 'Kingston';

    if (prefilledOrderId) {
      const ord = orders.find(o => o.id === prefilledOrderId);
      if (ord) {
        name = ord.customerName;
        phone = ord.customerPhone || '';
        addr = (ord as any).shippingAddress?.address || ord.shipping_address?.line1 || ord.fulfillmentLocation || '';
        parish = (ord as any).shippingAddress?.parish || ord.shipping_parish || 'Kingston';
      }
    }

    setFormData({
      orderId: prefilledOrderId || (orders[0]?.id || ''),
      customerName: name,
      customerPhone: phone,
      customerAddress: addr,
      parish: parish,
      scheduledDate: new Date().toISOString().slice(0, 10),
      scheduledTime: '09:00 AM',
      assignedInstaller: 'Lead Engineer Marcus Campbell',
      status: 'Scheduled',
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (job: InstallationJob) => {
    setEditingJob(job);
    setFormData({
      orderId: job.orderId,
      customerName: job.customerName,
      customerPhone: job.customerPhone || '',
      customerAddress: job.customerAddress || '',
      parish: job.parish || 'Kingston',
      scheduledDate: job.scheduledDate,
      scheduledTime: job.scheduledTime || '09:00 AM',
      assignedInstaller: job.assignedInstaller || '',
      status: job.status,
      notes: job.notes || ''
    });
    setShowModal(true);
  };

  const handleOrderSelect = (orderId: string) => {
    const ord = orders.find(o => o.id === orderId);
    if (ord) {
      setFormData(prev => ({
        ...prev,
        orderId,
        customerName: ord.customerName,
        customerPhone: ord.customerPhone || '',
        customerAddress: (ord as any).shippingAddress?.address || ord.shipping_address?.line1 || ord.fulfillmentLocation || '',
        parish: (ord as any).shippingAddress?.parish || ord.shipping_parish || 'Kingston'
      }));
    } else {
      setFormData(prev => ({ ...prev, orderId }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderId) {
      showToast('Order ID is required', 'warning');
      return;
    }

    const jobId = editingJob ? editingJob.id : `inst_${Date.now()}`;
    const payload: InstallationJob = cleanUndefined({
      id: jobId,
      orderId: formData.orderId,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerAddress: formData.customerAddress,
      parish: formData.parish,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      assignedInstaller: formData.assignedInstaller,
      status: formData.status,
      notes: formData.notes,
      createdAt: editingJob ? editingJob.createdAt : new Date().toISOString()
    });

    try {
      if (editingJob) {
        await updateDoc(doc(db, 'installations', jobId), payload as any);
        await logActivity(`Updated installation job #${jobId} for Order ${formData.orderId}`);
        showToast('Installation updated successfully', 'success');
      } else {
        await setDoc(doc(db, 'installations', jobId), payload as any);
        await logActivity(`Scheduled installation job for Order ${formData.orderId}`);
        showToast('Installation scheduled successfully', 'success');
      }
      setShowModal(false);
    } catch (err: any) {
      console.error("Error saving installation job:", err);
      showToast(err?.message || 'Failed to save installation job', 'error');
    }
  };

  const handleDelete = async (id: string, orderId: string) => {
    if (!window.confirm(`Are you sure you want to delete installation appointment for Order #${orderId}?`)) return;
    try {
      await deleteDoc(doc(db, 'installations', id));
      await logActivity(`Deleted installation job for Order ${orderId}`);
      showToast('Installation appointment deleted', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete installation', 'error');
    }
  };

  const filteredJobs = installations.filter(job => {
    const matchesSearch =
      (job.orderId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.assignedInstaller || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.parish || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || job.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 bg-surface">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest font-sans flex items-center gap-1.5 mb-1">
            <Wrench size={14} />
            Field Operations & Technical Services
          </span>
          <h1 className="text-3xl font-display font-black text-secondary tracking-tight">Solar & Equipment Installations</h1>
        </div>

        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm shadow transition-all cursor-pointer"
        >
          <Plus size={16} />
          Schedule Installation
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2 flex-1 w-full">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order ID, customer name, installer, parish..."
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
            <option value="all">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Rescheduled">Rescheduled</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading installation jobs...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <Wrench size={36} className="mx-auto text-slate-300" />
          <p className="font-semibold text-slate-600">No installation appointments found</p>
          <p className="text-xs">Schedule field technicians for solar panel setups, battery connections, or commercial installations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map(job => (
            <div key={job.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-600 uppercase block">Order #{job.orderId}</span>
                    <h3 className="text-base font-extrabold text-slate-900">{job.customerName}</h3>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                    job.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                    job.status === 'In Progress' ? 'bg-purple-100 text-purple-800' :
                    job.status === 'Rescheduled' ? 'bg-amber-100 text-amber-800' :
                    job.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {job.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <p className="flex items-center gap-2 font-mono font-bold text-slate-900">
                    <Calendar size={14} className="text-blue-600" />
                    {job.scheduledDate} ({job.scheduledTime || '09:00 AM'})
                  </p>
                  <p className="flex items-center gap-2 text-slate-700">
                    <User size={14} className="text-slate-400" />
                    Installer: <span className="font-bold">{job.assignedInstaller}</span>
                  </p>
                  <p className="flex items-start gap-2 text-slate-600">
                    <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>{job.customerAddress || job.parish} ({job.parish})</span>
                  </p>
                  {job.customerPhone && (
                    <p className="flex items-center gap-2 text-slate-600 font-mono">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      {job.customerPhone}
                    </p>
                  )}
                  {job.notes && (
                    <p className="text-[11px] bg-slate-50 p-2 rounded text-slate-500 italic">
                      "{job.notes}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(job)}
                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded cursor-pointer"
                  title="Edit Appointment"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={() => handleDelete(job.id, job.orderId)}
                  className="p-1.5 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                  title="Delete Appointment"
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
              <h2 className="text-lg font-bold text-slate-900">{editingJob ? 'Edit Installation Appointment' : 'Schedule New Installation'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Select Order *</label>
                <select
                  value={formData.orderId}
                  onChange={e => handleOrderSelect(e.target.value)}
                  className="w-full text-xs h-[38px] border rounded px-2.5 font-semibold"
                >
                  <option value="">-- Choose Order --</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>Order #{o.id} - {o.customerName} (${o.total?.toLocaleString()} JMD)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full text-xs h-[38px] border rounded px-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.customerPhone}
                    onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full text-xs h-[38px] border rounded px-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.scheduledDate}
                    onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full text-xs h-[38px] border rounded px-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Scheduled Time Window</label>
                  <input
                    type="text"
                    value={formData.scheduledTime}
                    onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="w-full text-xs h-[38px] border rounded px-2.5"
                    placeholder="e.g. 09:00 AM - 12:00 PM"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Assigned Installer / Crew</label>
                  <input
                    type="text"
                    value={formData.assignedInstaller}
                    onChange={e => setFormData({ ...formData, assignedInstaller: e.target.value })}
                    className="w-full text-xs h-[38px] border rounded px-2.5"
                    placeholder="e.g. Lead Technician Marcus Campbell"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs h-[38px] border rounded px-2.5"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Rescheduled">Rescheduled</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Site Location / Address</label>
                <input
                  type="text"
                  value={formData.customerAddress}
                  onChange={e => setFormData({ ...formData, customerAddress: e.target.value })}
                  className="w-full text-xs h-[38px] border rounded px-2.5"
                  placeholder="e.g. 15 Hope Road, Kingston 10"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Special Site Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full text-xs border rounded p-2"
                  placeholder="e.g. High roof access required, customer requested morning visit."
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
                  Save Installation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
