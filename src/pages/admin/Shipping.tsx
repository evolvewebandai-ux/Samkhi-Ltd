import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Printer, 
  Barcode, 
  Eye, 
  AlertCircle, 
  Edit3,
  Check,
  X,
  Loader2,
  Building,
  Clock,
  Phone,
  ShieldAlert
} from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { Order, ShippingRate, PickupLocation } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../../lib/toast';
import { logActivity } from '../../lib/audit';
import BulkActionBar from '../../components/admin/BulkActionBar';
import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  query, 
  orderBy,
  runTransaction
} from 'firebase/firestore';
import { db } from '../../firebase';

export default function AdminShipping() {
  const { orders, updateOrder } = useOrders();
  const [activeTab, setActiveTab] = useState<'rates' | 'pickups' | 'unfulfilled'>('rates');

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const selectedCount = Object.keys(selectedIds).filter(id => selectedIds[id]).length;

  // Clear selections on tab switch
  useEffect(() => {
    setSelectedIds({});
  }, [activeTab]);

  const handleBulkRatesStatus = async (is_active: boolean) => {
    setBulkLoading(true);
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    try {
      await Promise.all(ids.map(id => updateDoc(doc(db, 'shipping_rates', id), { is_active })));
      showToast(`Successfully set ${ids.length} shipping zones to ${is_active ? 'ACTIVE' : 'INACTIVE'}!`, 'success');
      setSelectedIds({});
    } catch (e) {
      showToast('Error editing shipping zones active state.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkRatesDelete = async () => {
    setBulkLoading(true);
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    try {
      await Promise.all(ids.map(id => deleteDoc(doc(db, 'shipping_rates', id))));
      showToast(`Successfully deleted ${ids.length} shipping zones!`, 'success');
      setSelectedIds({});
    } catch (e) {
      showToast('Error removing designated zones.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkFulfill = async () => {
    setBulkLoading(true);
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    try {
      await Promise.all(ids.map(id => updateOrder(id, {
        fulfillmentStatus: 'fulfilled',
        status: 'completed'
      })));
      await logActivity(`Bulk Dispatched and marked Orders ${ids.join(', ')} as Fulfilled.`);
      showToast(`Successfully bulk dispatched ${ids.length} orders!`, 'success');
      setSelectedIds({});
    } catch (err: any) {
      showToast(`Bulk fulfillment dispatch failed: ${err.message}`, 'error');
    } finally {
      setBulkLoading(false);
    }
  };
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Edit state
  const [showRateModal, setShowRateModal] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [editingPickup, setEditingPickup] = useState<PickupLocation | null>(null);
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Two-step dispatch confirmation states
  const [dispatchConfirmOrder, setDispatchConfirmOrder] = useState<Order | null>(null);
  const [dispatchStep1, setDispatchStep1] = useState(false);
  const [dispatchStep2, setDispatchStep2] = useState(false);

  // New Rate Form state
  const [rateForm, setRateForm] = useState({
    name: '',
    parish_code: '',
    type: 'parish' as 'parish' | 'custom_zone',
    rate: 0,
    estimated_days: '2-3 business days',
    is_active: true,
    free_shipping_threshold: undefined as number | undefined,
    sort_order: 50
  });

  // New Pickup Location Form state
  const [pickupForm, setPickupForm] = useState({
    name: '',
    address: '',
    parish: 'Kingston',
    phone: '',
    hours: 'Mon-Fri 9am-5pm, Sat 9am-1pm',
    is_active: true,
    is_default: false
  });

  // 1. Subscribe to Firestore databases
  useEffect(() => {
    setLoading(true);
    
    // Rates Subscription
    const ratesQuery = query(collection(db, 'shipping_rates'), orderBy('sort_order', 'asc'));
    const unsubRates = onSnapshot(ratesQuery, (snap) => {
      const parsed: ShippingRate[] = [];
      snap.forEach((d) => {
        parsed.push({ id: d.id, ...d.data() } as ShippingRate);
      });
      setRates(parsed);
    }, (err) => {
      console.error("Rates fetch error", err);
      showToast("Failed to sync shipping rates real-time", "error");
    });

    // Pickups Subscription
    const pickupsQuery = collection(db, 'pickup_locations');
    const unsubPickups = onSnapshot(pickupsQuery, (snap) => {
      const parsed: PickupLocation[] = [];
      snap.forEach((d) => {
        parsed.push({ id: d.id, ...d.data() } as PickupLocation);
      });
      setPickupLocations(parsed);
      setLoading(false);
    }, (err) => {
      console.error("Pickups fetch error", err);
      showToast("Failed to sync pickup locations real-time", "error");
      setLoading(false);
    });

    return () => {
      unsubRates();
      unsubPickups();
    };
  }, []);

  // Filter unfulfilled, pending or historical orders
  const unfulfilledOrders = orders.filter(
    o => o.fulfillmentStatus === 'unfulfilled' || o.status === 'pending'
  );

  // 2. Shipping Rate Actions
  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateForm.name || !rateForm.parish_code) {
      showToast("Please provide parish name and code parameters.", "error");
      return;
    }
    if (rateForm.rate < 0 || (rateForm.free_shipping_threshold !== undefined && rateForm.free_shipping_threshold < 0)) {
      showToast("Rates and thresholds cannot be negative fields.", "error");
      return;
    }

    try {
      setActionLoading(true);
      const isEdit = !!editingRate;
      const rateId = isEdit ? editingRate!.id : `rate_${rateForm.parish_code.toLowerCase().trim()}`;
      
      const payload = {
        id: rateId,
        name: rateForm.name,
        parish_code: rateForm.parish_code.toUpperCase().trim(),
        type: rateForm.type,
        rate: Number(rateForm.rate),
        estimated_days: rateForm.estimated_days,
        is_active: rateForm.is_active,
        sort_order: Number(rateForm.sort_order),
        free_shipping_threshold: rateForm.free_shipping_threshold ? Number(rateForm.free_shipping_threshold) : null,
        updated_at: new Date().toISOString()
      };

      await setDoc(doc(db, 'shipping_rates', rateId), payload, { merge: true });
      await logActivity(`${isEdit ? 'Updated' : 'Created'} shipping rate parameter for parish: ${rateForm.name} (Cost: $${rateForm.rate} JMD)`);
      
      showToast(`Shipping rate for '${rateForm.name}' successfully saved to Firestore.`, 'success');
      resetRateForm();
    } catch (err: any) {
      showToast(`Failed to update shipping rates: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const resetRateForm = () => {
    setRateForm({
      name: '',
      parish_code: '',
      type: 'parish',
      rate: 0,
      estimated_days: '2-3 business days',
      is_active: true,
      free_shipping_threshold: undefined,
      sort_order: 50
    });
    setEditingRate(null);
    setShowRateModal(false);
  };

  const startEditRate = (rate: ShippingRate) => {
    setEditingRate(rate);
    setRateForm({
      name: rate.name,
      parish_code: rate.parish_code,
      type: rate.type,
      rate: rate.rate,
      estimated_days: rate.estimated_days,
      is_active: rate.is_active,
      free_shipping_threshold: rate.free_shipping_threshold || undefined,
      sort_order: rate.sort_order || 50
    });
    setShowRateModal(true);
  };

  const toggleRateStatus = async (rate: ShippingRate) => {
    try {
      await updateDoc(doc(db, 'shipping_rates', rate.id), {
        is_active: !rate.is_active
      });
      showToast(`Status toggled for ${rate.name}.`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteRate = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete the shipping rate for ${name}?`)) return;
    try {
      await deleteDoc(doc(db, 'shipping_rates', id));
      await logActivity(`Deleted shipping rate registry for parish: ${name}`);
      showToast(`Shipping rate for '${name}' deleted successfully.`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // 3. Pickup Location Actions
  const handleSavePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupForm.name || !pickupForm.address || !pickupForm.phone) {
      showToast("Please fulfill Name, Address, and Contact numbers.", "error");
      return;
    }

    try {
      setActionLoading(true);
      const isEdit = !!editingPickup;
      const pickupId = isEdit ? editingPickup!.id : `pickup_${Date.now()}`;

      // Database transaction ensures only 1 location is marked is_default === true
      await runTransaction(db, async (txn) => {
        if (pickupForm.is_default) {
          // Clear default flags for on all locations first
          pickupLocations.forEach(loc => {
            if (loc.id !== pickupId) {
              txn.update(doc(db, 'pickup_locations', loc.id), { is_default: false });
            }
          });
        }

        const payload = {
          id: pickupId,
          name: pickupForm.name,
          address: pickupForm.address,
          parish: pickupForm.parish,
          phone: pickupForm.phone,
          hours: pickupForm.hours,
          is_active: pickupForm.is_active,
          is_default: pickupForm.is_default
        };

        txn.set(doc(db, 'pickup_locations', pickupId), payload, { merge: true });
      });

      await logActivity(`${isEdit ? 'Modified' : 'Created'} physical pickup center: ${pickupForm.name}`);
      showToast(`Pickup location '${pickupForm.name}' configured successfully.`, 'success');
      resetPickupForm();
    } catch (err: any) {
      showToast(`Failed to configure pickup location: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const resetPickupForm = () => {
    setPickupForm({
      name: '',
      address: '',
      parish: 'Kingston',
      phone: '',
      hours: 'Mon-Fri 9am-5pm, Sat 9am-1pm',
      is_active: true,
      is_default: false
    });
    setEditingPickup(null);
    setShowPickupModal(false);
  };

  const startEditPickup = (loc: PickupLocation) => {
    setEditingPickup(loc);
    setPickupForm({
      name: loc.name,
      address: loc.address,
      parish: loc.parish,
      phone: loc.phone,
      hours: loc.hours,
      is_active: loc.is_active,
      is_default: loc.is_default
    });
    setShowPickupModal(true);
  };

  const togglePickupStatus = async (loc: PickupLocation) => {
    try {
      await updateDoc(doc(db, 'pickup_locations', loc.id), {
        is_active: !loc.is_active
      });
      showToast(`Status toggled for ${loc.name}.`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeletePickup = async (id: string, name: string) => {
    if (!window.confirm(`Delete pickup location '${name}'? This is permanent.`)) return;
    try {
      await deleteDoc(doc(db, 'pickup_locations', id));
      await logActivity(`Deleted physical pickup location registry: ${name}`);
      showToast(`Location '${name}' deleted successfully.`, "success");
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // 4. Order fulfillment dispatch
  const fulfillOrder = async (orderId: string) => {
    setActionLoading(true);
    try {
      await updateOrder(orderId, {
        fulfillmentStatus: 'fulfilled',
        status: 'completed'
      });
      await logActivity(`Dispatched and marked Order ${orderId} as Fulfilled via Shipping Admin Dashboard.`);
      showToast(`Order ${orderId} has been successfully dispatch-logged!`, 'success');
      if (selectedOrderForLabel?.id === orderId) {
        setSelectedOrderForLabel(prev => prev ? { ...prev, fulfillmentStatus: 'fulfilled', status: 'completed' } : null);
      }
    } catch (err: any) {
      showToast(`Fulfillment dispatch failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const printLabel = () => {
    window.print();
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 font-sans" id="shipping-workspace">
      {/* Header section banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-5 gap-4 text-left">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            <Truck className="text-blue-600" size={26} />
            E-Commerce Shipping & Fulfillment Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1 uppercase font-mono tracking-wider font-semibold">
            Jamaica Solar Store Logistics Manager
          </p>
        </div>

        {/* Tab Selector Controls */}
        <div className="flex bg-[#ededed] p-1 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('rates')}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'rates' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <MapPin size={13} />
            Parish Delivery Fees
          </button>
          <button
            onClick={() => setActiveTab('pickups')}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'pickups' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Building size={13} />
            Pickup Storefronts
          </button>
          <button
            onClick={() => setActiveTab('unfulfilled')}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'unfulfilled' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Truck size={13} />
            Dispatch Queue
            {unfulfilledOrders.length > 0 && (
              <span className="bg-red-500 text-white rounded-full px-1.5 py-0.2 font-mono text-[9px] font-bold">
                {unfulfilledOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-xs text-slate-500 font-mono">Synchronizing logistics databases in real-time...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          
          {/* TAB 1: PARISH DELIVERY RATES */}
          {activeTab === 'rates' && (
            <motion.div 
              key="rates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-xs text-left"
            >
              <div className="p-4 bg-slate-50 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <AlertCircle className="text-blue-500 shrink-0" size={18} />
                  <span>
                    Fulfillment delivery zones bind standard consumption taxes and courier costs to the customer receipt automatically at checkout.
                  </span>
                </div>
                <button
                  onClick={() => { resetRateForm(); setShowRateModal(true); }}
                  className="bg-black text-white hover:bg-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 text-xs select-none self-start md:self-auto cursor-pointer"
                >
                  <Plus size={14} />
                  Configure New Zone
                </button>
              </div>

              {/* Rates Data Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#f8fafc] text-slate-500 text-[10px] uppercase font-bold tracking-widest font-mono border-b">
                    <tr>
                      <th className="px-6 py-4 w-12 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 accent-black cursor-pointer"
                          checked={rates.length > 0 && rates.every(r => !!selectedIds[r.id])}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const nextSel = { ...selectedIds };
                            rates.forEach(r => {
                              nextSel[r.id] = checked;
                            });
                            setSelectedIds(nextSel);
                          }}
                        />
                      </th>
                      <th className="px-6 py-4">Parish / Target Zone</th>
                      <th className="px-6 py-4 font-mono">Zone Code</th>
                      <th className="px-6 py-4">Delivery Timeline</th>
                      <th className="px-6 py-4 text-right">Standard Fee</th>
                      <th className="px-6 py-4 text-right">Free Threshold</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-850">
                    {rates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 accent-black cursor-pointer animate-none"
                            checked={!!selectedIds[rate.id]}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedIds(prev => ({ ...prev, [rate.id]: checked }));
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                          <MapPin size={14} className={rate.is_active ? "text-blue-500" : "text-slate-400"} />
                          {rate.name}
                          {rate.type === 'custom_zone' && (
                            <span className="bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded text-[8px] font-bold uppercase font-mono">Custom Zone</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono uppercase font-bold text-slate-500">{rate.parish_code}</td>
                        <td className="px-6 py-4 text-slate-600 font-semibold">{rate.estimated_days}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                          {rate.rate === 0 ? (
                            <span className="text-emerald-600">FREE</span>
                          ) : (
                            `$${rate.rate.toLocaleString()} JMD`
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-500">
                          {rate.free_shipping_threshold ? (
                            <span className="text-emerald-700 font-bold">${rate.free_shipping_threshold.toLocaleString()} JMD</span>
                          ) : (
                            <span className="text-slate-405 italic text-[11px]">No threshold</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleRateStatus(rate)}
                            className={cn(
                              "px-2.5 py-0.5 rounded text-[10px] font-bold border font-mono tracking-wider cursor-pointer",
                              rate.is_active 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                : "bg-slate-50 text-slate-400 border-slate-100"
                            )}
                          >
                            {rate.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right pr-6 space-x-3">
                          <button
                            onClick={() => startEditRate(rate)}
                            className="text-indigo-600 hover:text-indigo-900 font-bold hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          {rate.type === 'custom_zone' && (
                            <button
                              onClick={() => handleDeleteRate(rate.id, rate.name)}
                              className="text-red-600 hover:text-red-900 font-bold hover:underline cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {rates.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400 italic">
                          No delivery rates configured in database. Run migration or set up your zones.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 2: PICKUP LOCATIONS */}
          {activeTab === 'pickups' && (
            <motion.div 
              key="pickups"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-xs text-left"
            >
              <div className="p-4 bg-slate-50 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <AlertCircle className="text-blue-500 shrink-0" size={18} />
                  <span>
                    Manage brick-and-mortar storefronts or distribution centers where customers can drive to pick up solar controllers or lithium modules.
                  </span>
                </div>
                <button
                  onClick={() => { resetPickupForm(); setShowPickupModal(true); }}
                  className="bg-black text-white hover:bg-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 text-xs select-none self-start md:self-auto cursor-pointer"
                >
                  <Plus size={14} />
                  Create Pickup Location
                </button>
              </div>

              {/* Pickup Locations Bento list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pickupLocations.map((loc) => (
                  <div 
                    key={loc.id} 
                    className={cn(
                      "bg-white rounded-xl border p-5 space-y-4 shadow-xs relative flex flex-col justify-between",
                      loc.is_default ? "border-indigo-600 ring-2 ring-indigo-50" : "border-slate-200"
                    )}
                  >
                    <div>
                      {loc.is_default && (
                        <span className="absolute top-4 right-4 bg-indigo-650 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-mono tracking-wider font-extrabold uppercase">
                          Default Store
                        </span>
                      )}

                      <div className="space-y-2">
                        <h3 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2 pr-20">
                          <Building className={loc.is_active ? "text-indigo-600" : "text-slate-400"} size={16} />
                          {loc.name}
                        </h3>
                        <p className="text-slate-450 flex items-start gap-1 font-semibold leading-normal">
                          <MapPin size={12} className="mt-0.5 text-slate-350 shrink-0" />
                          <span>{loc.address}, {loc.parish}</span>
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 font-semibold text-slate-650">
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-400" />
                          <span>Phone: {loc.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-400" />
                          <span>Hours: {loc.hours}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t flex justify-between items-center bg-slate-50 -mx-5 -mb-5 px-5 py-2.5 rounded-b-xl border-dashed">
                      <button
                        onClick={() => togglePickupStatus(loc)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold font-mono border cursor-pointer",
                          loc.is_active 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : "bg-slate-50 text-slate-400 border-slate-100"
                        )}
                      >
                        {loc.is_active ? 'STORE ACTIVE' : 'STORE INACTIVE'}
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => startEditPickup(loc)}
                          className="text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          Modify
                        </button>
                        <button
                          onClick={() => handleDeletePickup(loc.id, loc.name)}
                          className="text-red-500 font-bold hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {pickupLocations.length === 0 && (
                  <div className="col-span-full bg-slate-50 border border-dashed text-slate-450 italic p-16 text-center rounded-xl">
                    No pickup spots configured. Add a physical outlet point above.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: DISPATCH & UNFULFILLED QUEUE */}
          {activeTab === 'unfulfilled' && (
            <motion.div 
              key="unfulfilled"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-left">
                
                {/* Orders table list */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 accent-black cursor-pointer bg-white"
                        checked={unfulfilledOrders.length > 0 && unfulfilledOrders.every(o => !!selectedIds[o.id])}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const nextSel = { ...selectedIds };
                          unfulfilledOrders.forEach(o => {
                            nextSel[o.id] = checked;
                          });
                          setSelectedIds(nextSel);
                        }}
                      />
                      <span className="font-bold text-slate-900 flex items-center gap-1.5 font-mono uppercase tracking-wider text-[10px]">
                        Awaiting fulfillment queues ({unfulfilledOrders.length} records)
                      </span>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
                    {unfulfilledOrders.map((ord) => (
                      <div key={ord.id} className="p-4.5 hover:bg-slate-50/50 transition-colors flex justify-between items-start gap-4">
                        <div className="flex gap-3 items-start flex-1">
                          <div className="pt-1.5">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 accent-black cursor-pointer bg-white"
                              checked={!!selectedIds[ord.id]}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedIds(prev => ({ ...prev, [ord.id]: checked }));
                              }}
                            />
                          </div>
                          <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-950 font-mono text-xs">Order {ord.id}</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-100 font-mono">
                              {ord.fulfillmentStatus}
                            </span>
                            <span className={cn(
                              "px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase",
                              ord.fulfillment_type === 'pickup' ? "bg-indigo-100 text-indigo-700" : "bg-blue-105 bg-blue-100 text-blue-700"
                            )}>
                              {ord.fulfillment_type === 'pickup' ? 'Store Pickup' : 'Delivery Post'}
                            </span>
                          </div>
                          
                          <div className="text-slate-500 font-semibold flex flex-wrap gap-x-2 gap-y-1">
                            <span>Recipient: <strong className="text-slate-800">{ord.customerName}</strong></span>
                            <span>• Email: <span className="font-mono">{ord.customerEmail}</span></span>
                          </div>

                          <div className="text-slate-500 font-semibold">
                            {ord.fulfillment_type === 'pickup' ? (
                              <span>Pickup Spot ID: <strong className="text-indigo-800">{ord.pickup_location_id || 'Kingston Main'}</strong></span>
                            ) : (
                              <span>Parish Dest: <strong className="text-blue-800">{ord.shipping_parish || ord.parish || 'Kingston'}</strong></span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-400 font-bold font-mono">
                            Items: {ord.items} • Subtotal: ${ord.subtotal?.toLocaleString()} JMD {ord.fulfillment_type !== 'pickup' && ord.shipping_cost > 0 && `• Shipping: $${ord.shipping_cost?.toLocaleString()} JMD`} • Grand Total: <span className="font-bold text-slate-900 font-mono">${(ord.grand_total || ord.total || 0).toLocaleString()} JMD</span>
                          </div>
                        </div>
                        </div>

                        <div className="flex items-center gap-2 whitespace-nowrap pt-1">
                          <button
                            onClick={() => setSelectedOrderForLabel(ord)}
                            className="px-3 py-1.5 border hover:bg-slate-50 rounded-lg font-bold flex items-center gap-1 transition-all text-xs cursor-pointer select-none"
                          >
                            <Eye size={12} />
                            Label View
                          </button>
                          {ord.fulfillmentStatus !== 'fulfilled' && (
                            <button
                              onClick={() => {
                                setDispatchConfirmOrder(ord);
                                setDispatchStep1(false);
                                setDispatchStep2(false);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 duration-150 shadow-md ring-2 ring-emerald-500/20 text-xs cursor-pointer select-none"
                            >
                              <CheckCircle size={12} />
                              Dispatch
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {unfulfilledOrders.length === 0 && (
                      <div className="p-16 text-center text-slate-400 italic">
                        All orders are fully packed and fulfilled! Zero unfulfilled.
                      </div>
                    )}
                  </div>
                </div>

                {/* Dispatch Label Preview */}
                <div className="lg:col-span-1">
                  {selectedOrderForLabel ? (
                    <div className="bg-white rounded-xl border border-slate-300 p-6 space-y-5 shadow-sm flex flex-col justify-between h-fit printable-label text-left">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                          <span className="text-xs font-bold text-slate-900 uppercase font-mono tracking-widest">Fulfillment Dispatch Label</span>
                          <button 
                            onClick={printLabel}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Print label"
                          >
                            <Printer size={16} />
                          </button>
                        </div>

                        {/* From/Exporter Address */}
                        <div className="space-y-1">
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Shipper (From)</div>
                          <p className="font-bold text-slate-900">SAMKHI LIMITED</p>
                          <p className="text-slate-600 font-semibold">12 Constant Spring Road, Kingston 10</p>
                          <p className="text-slate-500 font-mono text-[10px] font-bold">Contact: sales@samkhi.com • 876-555-0199</p>
                        </div>

                        <div className="border-t border-dashed my-3" />

                        {/* To/Recipient Details */}
                        {selectedOrderForLabel.fulfillment_type === 'pickup' ? (
                          <div className="space-y-1 bg-indigo-50/50 p-3.5 rounded-lg border border-indigo-100">
                            <div className="text-[9px] font-extrabold text-indigo-700 uppercase tracking-widest font-mono">Customer Storefront Pickup</div>
                            <p className="font-extrabold text-slate-900 text-sm">{selectedOrderForLabel.customerName}</p>
                            <p className="text-slate-700 font-semibold font-mono">Location ID: {selectedOrderForLabel.pickup_location_id || 'pickup_kgn_main'}</p>
                            <p className="text-slate-500 text-[10px] font-semibold">Contact: {selectedOrderForLabel.customerPhone || 'N/A'}</p>
                            <p className="text-slate-400 text-[9px] font-mono italic mt-1 font-bold">Client will pick up items in outlet store.</p>
                          </div>
                        ) : (
                          <div className="space-y-1 bg-blue-50/40 p-3.5 rounded-lg border border-blue-100">
                            <div className="text-[9px] font-extrabold text-blue-700 uppercase tracking-widest font-mono">Recipient (Ship To)</div>
                            <p className="font-extrabold text-slate-900 text-sm uppercase">{selectedOrderForLabel.customerName}</p>
                            <p className="text-slate-750 font-bold text-slate-800">
                              Addr: {selectedOrderForLabel.shipping_address?.line1 || "No street address listed"}
                              {selectedOrderForLabel.shipping_address?.line2 ? `, ${selectedOrderForLabel.shipping_address.line2}` : ""}
                            </p>
                            <p className="text-blue-900 font-extrabold underline text-[11px] font-mono uppercase">
                              Parish: {selectedOrderForLabel.shipping_parish || selectedOrderForLabel.parish || 'Kingston'}, Jamaica
                            </p>
                            <p className="text-slate-600 font-semibold font-mono text-[10px]">Phone: {selectedOrderForLabel.shipping_address?.phone || selectedOrderForLabel.customerPhone || 'N/A'}</p>
                          </div>
                        )}

                        <div className="border-t border-dashed my-3" />

                        {/* Financial Audit */}
                        <div className="space-y-1 font-semibold text-slate-700">
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Transaction Ledger</div>
                          <div className="flex justify-between text-[11px]">
                            <span>Cargo Subtotal:</span>
                            <span className="font-mono text-slate-900">${selectedOrderForLabel.subtotal?.toLocaleString()} JMD</span>
                          </div>
                          {selectedOrderForLabel.fulfillment_type !== 'pickup' && selectedOrderForLabel.shipping_cost > 0 && (
                            <div className="flex justify-between text-[11px]">
                              <span>Delivery Costs:</span>
                              <span className="font-mono text-slate-900">${selectedOrderForLabel.shipping_cost?.toLocaleString()} JMD</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs font-black text-slate-900 border-t pt-1.5 mt-1">
                            <span>Balance Collected:</span>
                            <span className="font-mono text-emerald-700">${(selectedOrderForLabel.grand_total || selectedOrderForLabel.total || 0).toLocaleString()} JMD</span>
                          </div>
                        </div>

                        <div className="border-t border-dashed my-3" />

                        {/* Barcode details */}
                        <div className="bg-slate-50 border p-3.5 rounded-lg flex flex-col items-center justify-center space-y-1">
                          <Barcode size={32} className="text-black" />
                          <span className="text-[9px] font-mono font-black tracking-wider text-slate-600">REF_ORD_SHP_{selectedOrderForLabel.id}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t text-center text-slate-400 italic font-medium text-[9px] leading-relaxed">
                        Authorized by Jamaica Solar Store Control Center. Printed on {new Date().toLocaleDateString()}.
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400 italic flex flex-col items-center justify-center py-20">
                      <Printer size={32} className="text-slate-300 mb-2" />
                      <p className="font-bold text-slate-800">Dispatch preview empty</p>
                      <p className="text-[10px] text-slate-500 mt-1">Click "Label View" on any order list ticket to configure shipping dispatch cards.</p>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      )}

      {/* ==================== CREATE/EDIT SHIPPING RATE MODAL ==================== */}
      <AnimatePresence>
        {showRateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto text-left">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border max-w-md w-full p-6 space-y-5 text-xs shadow-xl"
            >
              <div className="flex justify-between items-center border-b pb-3 shrink-0">
                <h3 className="text-sm font-black text-slate-950 flex items-center gap-1.5">
                  <MapPin size={16} className="text-blue-600" />
                  {editingRate ? "Modify Shipping Rate" : "Add Parish Delivery Zone"}
                </h3>
                <button onClick={resetRateForm} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveRate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="font-bold text-slate-600 uppercase tracking-widest font-mono">Parish / Zone Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. St. Elizabeth, Portland"
                      value={rateForm.name}
                      onChange={e => setRateForm({...rateForm, name: e.target.value})}
                      required
                      className="w-full border border-slate-250 bg-white rounded-lg px-3 py-2 outline-none font-semibold text-slate-850"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 uppercase tracking-widest font-mono">Zone Code</label>
                    <input 
                      type="text"
                      placeholder="e.g. ELI, POR"
                      maxLength={5}
                      value={rateForm.parish_code}
                      onChange={e => setRateForm({...rateForm, parish_code: e.target.value})}
                      required
                      className="w-full border border-slate-250 bg-white rounded-lg px-3 py-2 outline-none font-bold uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 uppercase tracking-widest font-mono">Zone Classification</label>
                    <select 
                      value={rateForm.type}
                      onChange={e => setRateForm({...rateForm, type: e.target.value as 'parish' | 'custom_zone'})}
                      className="w-full border border-slate-250 bg-white rounded-lg px-3 py-2 outline-none font-bold text-slate-800"
                    >
                      <option value="parish">Standard Parish</option>
                      <option value="custom_zone">Custom Logistic Zone</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 uppercase tracking-widest font-mono">Standard JMD Fee</label>
                    <input 
                      type="number"
                      min={0}
                      value={rateForm.rate}
                      onChange={e => setRateForm({...rateForm, rate: Math.max(0, Number(e.target.value))})}
                      required
                      className="w-full border border-slate-250 bg-white rounded-lg px-3 py-2 outline-none font-bold font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 uppercase tracking-widest font-mono">Free Threshold (JMD)</label>
                    <input 
                      type="number"
                      min={0}
                      placeholder="e.g. 50000 (Set empty for none)"
                      value={rateForm.free_shipping_threshold || ''}
                      onChange={e => setRateForm({...rateForm, free_shipping_threshold: e.target.value ? Math.max(0, Number(e.target.value)) : undefined})}
                      className="w-full border border-slate-250 bg-white rounded-lg px-3 py-2 outline-none font-bold font-mono text-emerald-700"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="font-bold text-slate-600 uppercase tracking-widest font-mono">Estimated delivery days</label>
                    <input 
                      type="text"
                      placeholder="e.g. 1-2 business days"
                      value={rateForm.estimated_days}
                      onChange={e => setRateForm({...rateForm, estimated_days: e.target.value})}
                      required
                      className="w-full border border-slate-250 bg-white rounded-lg px-3 py-2 outline-none font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 uppercase tracking-widest font-mono">Sort Weight</label>
                    <input 
                      type="number"
                      min={1}
                      value={rateForm.sort_order}
                      onChange={e => setRateForm({...rateForm, sort_order: Math.max(1, Number(e.target.value))})}
                      required
                      className="w-full border border-slate-250 bg-white rounded-lg px-3 py-2 outline-none font-mono"
                    />
                  </div>

                  <div className="flex flex-col justify-end pb-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 select-none">
                      <input 
                        type="checkbox"
                        checked={rateForm.is_active}
                        onChange={e => setRateForm({...rateForm, is_active: e.target.checked})}
                        className="accent-black h-4 w-4"
                      />
                      <span>Mark Active</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end gap-2.5">
                  <button 
                    type="button" 
                    onClick={resetRateForm}
                    className="border px-4 py-2 rounded-lg font-bold hover:bg-slate-50 cursor-pointer text-slate-700"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit" 
                    disabled={actionLoading}
                    className="bg-black text-white hover:bg-slate-900 px-5 py-2 rounded-lg font-bold flex items-center gap-1.5 min-w-[100px] justify-center cursor-pointer"
                  >
                    {actionLoading && <Loader2 className="animate-spin" size={13} />}
                    <span>Save Rate</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== CREATE/EDIT PICKUP LOCATION MODAL ==================== */}
      <AnimatePresence>
        {showPickupModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto text-left">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border max-w-md w-full p-6 space-y-5 text-xs shadow-xl"
            >
              <div className="flex justify-between items-center border-b pb-3 shrink-0">
                <h3 className="text-sm font-black text-slate-950 flex items-center gap-1.5">
                  <Building size={16} className="text-indigo-650 text-indigo-600" />
                  {editingPickup ? "Modify Pickup Location" : "Configure Pickup Storefront"}
                </h3>
                <button onClick={resetPickupForm} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePickup} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 uppercase tracking-widest font-mono">Location Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Kingston Outlet Store, Montego Bay Hub"
                      value={pickupForm.name}
                      onChange={e => setPickupForm({...pickupForm, name: e.target.value})}
                      required
                      className="w-full border border-slate-250 bg-white rounded-lg px-3 py-2 outline-none font-semibold text-slate-850"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 uppercase tracking-widest font-mono">Street Address</label>
                    <input 
                      type="text"
                      placeholder="e.g. 10 Constant Spring Road, Plaza"
                      value={pickupForm.address}
                      onChange={e => setPickupForm({...pickupForm, address: e.target.value})}
                      required
                      className="w-full border border-slate-250 bg-white rounded-lg px-3 py-2 outline-none font-semibold text-slate-850"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600 uppercase tracking-widest font-mono">Base Parish</label>
                      <input 
                        type="text"
                        placeholder="e.g. Kingston, St. James"
                        value={pickupForm.parish}
                        onChange={e => setPickupForm({...pickupForm, parish: e.target.value})}
                        required
                        className="w-full border border-slate-250 bg-white rounded-lg px-3 py-2 outline-none font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600 uppercase tracking-widest font-mono">Contact Phone</label>
                      <input 
                        type="text"
                        placeholder="e.g. 876-555-0100"
                        value={pickupForm.phone}
                        onChange={e => setPickupForm({...pickupForm, phone: e.target.value})}
                        required
                        className="w-full border border-slate-250 bg-white rounded-lg px-3 py-2 outline-none font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 uppercase tracking-widest font-mono">Operating Hours</label>
                    <input 
                      type="text"
                      placeholder="e.g. Mon-Fri 9am-5pm"
                      value={pickupForm.hours}
                      onChange={e => setPickupForm({...pickupForm, hours: e.target.value})}
                      required
                      className="w-full border border-slate-250 bg-white rounded-lg px-3 py-2 outline-none font-semibold"
                    />
                  </div>

                  <div className="flex border-t pt-4 gap-6 items-center">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 select-none">
                      <input 
                        type="checkbox"
                        checked={pickupForm.is_active}
                        onChange={e => setPickupForm({...pickupForm, is_active: e.target.checked})}
                        className="accent-black h-4 w-4"
                      />
                      <span>Mark Active</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 select-none">
                      <input 
                        type="checkbox"
                        checked={pickupForm.is_default}
                        onChange={e => setPickupForm({...pickupForm, is_default: e.target.checked})}
                        className="accent-indigo-650 h-4 w-4"
                      />
                      <span>Mark Default Outlet</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end gap-2.5">
                  <button 
                    type="button" 
                    onClick={resetPickupForm}
                    className="border px-4 py-2 rounded-lg font-bold hover:bg-slate-50 cursor-pointer text-slate-700"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit" 
                    disabled={actionLoading}
                    className="bg-black text-white hover:bg-slate-900 px-5 py-2 rounded-lg font-bold flex items-center gap-1.5 min-w-[100px] justify-center cursor-pointer"
                  >
                    {actionLoading && <Loader2 className="animate-spin" size={13} />}
                    <span>Save Outlet</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== 2-STEP DISPATCH CONFIRMATION MODAL ==================== */}
      <AnimatePresence>
        {dispatchConfirmOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto text-left">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border max-w-lg w-full p-6 space-y-6 text-xs shadow-2xl relative overflow-hidden"
            >
              {/* Top status indicator accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-600" />
              
              <div className="flex justify-between items-start pt-2">
                <div className="space-y-1">
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full text-[9px] uppercase tracking-widest font-black font-mono">
                    Security Dispatch Check
                  </span>
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
                    <Truck size={18} className="text-emerald-600" />
                    Double-Check Dispatch: Order {dispatchConfirmOrder.id}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Verify the physical inventory and logistics preparations prior to concluding and sending out the parcel.
                  </p>
                </div>
                <button 
                  onClick={() => setDispatchConfirmOrder(null)} 
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Order Information Container */}
              <div className="bg-slate-55 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-slate-700">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  <span>Recipient Details</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[8px] font-mono",
                    dispatchConfirmOrder.fulfillment_type === 'pickup' ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {dispatchConfirmOrder.fulfillment_type === 'pickup' ? 'Store Pickup' : 'Delivery Post'}
                  </span>
                </div>
                <div className="font-semibold text-xs space-y-1">
                  <p className="font-bold text-slate-900">{dispatchConfirmOrder.customerName}</p>
                  {dispatchConfirmOrder.fulfillment_type === 'pickup' ? (
                    <p className="text-slate-600">Pickup Location: <span className="font-mono">{dispatchConfirmOrder.pickup_location_id || 'Kingston Main'}</span></p>
                  ) : (
                    <p className="text-slate-600">
                      Shipping to: {dispatchConfirmOrder.shipping_address?.line1 || "No street address"} (Parish: {dispatchConfirmOrder.shipping_parish || dispatchConfirmOrder.parish || 'Kingston'})
                    </p>
                  )}
                  {dispatchConfirmOrder.customerPhone && (
                    <p className="text-slate-500 font-mono text-[10px] font-bold">Phone: {dispatchConfirmOrder.customerPhone}</p>
                  )}
                </div>
              </div>

              {/* Robust 2-Step Checklist Interactive Panels */}
              <div className="space-y-4">
                {/* STEP 1 Check Panel */}
                <div 
                  onClick={() => setDispatchStep1(!dispatchStep1)}
                  className={cn(
                    "border rounded-xl p-4 flex gap-4 items-start cursor-pointer transition-all select-none",
                    dispatchStep1 ? "border-emerald-500 bg-emerald-50/20 shadow-sm" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  )}
                >
                  <div className="pt-0.5">
                    <div className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                      dispatchStep1 ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                    )}>
                      {dispatchStep1 && <Check size={12} className="stroke-[3]" />}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-slate-950 font-sans text-xs">
                      Step 1: Visual Assessment & Package Packing
                    </p>
                    <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                      I have confirmed that all ordered items have been securely packed in shock-absorbent packaging, checked correct quantity/weight, and included the sales receipt.
                    </p>
                  </div>
                </div>

                {/* STEP 2 Check Panel */}
                <div 
                  onClick={() => setDispatchStep2(!dispatchStep2)}
                  className={cn(
                    "border rounded-xl p-4 flex gap-4 items-start cursor-pointer transition-all select-none",
                    dispatchStep2 ? "border-emerald-500 bg-emerald-50/20 shadow-sm" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  )}
                >
                  <div className="pt-0.5">
                    <div className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                      dispatchStep2 ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                    )}>
                      {dispatchStep2 && <Check size={12} className="stroke-[3]" />}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-slate-950 font-sans text-xs">
                      Step 2: Shipping Label & Courier Handoff Log
                    </p>
                    <p className="text-[11px] text-slate-500 leading-normal font-semibold font-sans">
                      I have compiled custom recipient labels, printed out shipping barcodes, and logged accurate carrier routing parameters on the parcel container.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                  {dispatchStep1 && dispatchStep2 ? "✅ Ready for Dispatch" : "⚠️ Checklist incomplete"}
                </span>

                <div className="flex gap-2 text-xs">
                  <button 
                    type="button" 
                    onClick={() => setDispatchConfirmOrder(null)}
                    className="border px-4 py-2 rounded-lg font-bold hover:bg-slate-50 cursor-pointer text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    disabled={!(dispatchStep1 && dispatchStep2) || actionLoading}
                    onClick={async () => {
                      if (dispatchStep1 && dispatchStep2) {
                        const orderId = dispatchConfirmOrder.id;
                        await fulfillOrder(orderId);
                        setDispatchConfirmOrder(null);
                      }
                    }}
                    className={cn(
                      "px-5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all text-white shadow-sm min-w-[130px] justify-center cursor-pointer",
                      dispatchStep1 && dispatchStep2 
                        ? "bg-emerald-600 hover:bg-emerald-700" 
                        : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200"
                    )}
                  >
                    {actionLoading ? <Loader2 className="animate-spin" size={13} /> : <CheckCircle size={13} />}
                    <span>Mark Dispatched</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Tab-wise Bulk Action Bar */}
      {activeTab === 'rates' && (
        <BulkActionBar
          selectedCount={selectedCount}
          totalCount={rates.length}
          onClearSelection={() => setSelectedIds({})}
          onSelectAllPages={() => {
            const nextSel: Record<string, boolean> = {};
            rates.forEach(r => {
              nextSel[r.id] = true;
            });
            setSelectedIds(nextSel);
            showToast(`Selected all ${rates.length} zones across all categories!`, 'success');
          }}
          isAllPagesSelected={rates.length > 0 && rates.every(r => !!selectedIds[r.id])}
          loading={bulkLoading}
          loadingMessage="Updating zones database..."
          actions={[
            {
              id: 'activate-rates',
              label: 'Set Active',
              icon: Check,
              variant: 'success' as const,
              onClick: () => handleBulkRatesStatus(true)
            },
            {
              id: 'deactivate-rates',
              label: 'Set Inactive',
              icon: X,
              onClick: () => handleBulkRatesStatus(false)
            },
            {
              id: 'delete-rates',
              label: 'Delete Zones',
              icon: Trash2,
              variant: 'danger' as const,
              requiresConfirm: true,
              confirmTitle: 'Permanently Delete Selected Zones?',
              confirmMessage: `Are you sure you want to permanently delete these ${selectedCount} shipping configurations? This action will immediately remove the custom delivery options and default postal charges.`,
              onClick: handleBulkRatesDelete
            }
          ]}
        />
      )}

      {activeTab === 'unfulfilled' && (
        <BulkActionBar
          selectedCount={selectedCount}
          totalCount={unfulfilledOrders.length}
          onClearSelection={() => setSelectedIds({})}
          onSelectAllPages={() => {
            const nextSel: Record<string, boolean> = {};
            unfulfilledOrders.forEach(o => {
              nextSel[o.id] = true;
            });
            setSelectedIds(nextSel);
            showToast(`Selected all unfulfilled orders!`, 'success');
          }}
          isAllPagesSelected={unfulfilledOrders.length > 0 && unfulfilledOrders.every(o => !!selectedIds[o.id])}
          loading={bulkLoading}
          loadingMessage="Dispatching packages in bulk..."
          actions={[
            {
              id: 'dispatch-orders',
              label: 'Bulk Dispatch',
              icon: Truck,
              variant: 'success' as const,
              requiresConfirm: true,
              confirmTitle: 'Log and Dispatch Selected Packages?',
              confirmMessage: `Are you sure you want to log and record ${selectedCount} orders as fully packages and dispatched? This automatically notifies courier partners and flags active progress streaks.`,
              onClick: handleBulkFulfill
            }
          ]}
        />
      )}
    </div>
  );
}
