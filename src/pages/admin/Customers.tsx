import React, { useState, useEffect, useMemo } from 'react';
import { useCustomers } from '../../context/CustomerContext';
import { useOrders } from '../../context/OrderContext';
import { useProducts } from '../../context/ProductContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, SlidersHorizontal, UserPlus, Mail, Trash2, X, Plus, MapPin,
  ArrowLeft, User, Phone, DollarSign, ShoppingBag, Award, Heart, 
  Edit, CheckCircle, Save, Calendar, CreditCard, ExternalLink, 
  RefreshCw, AlertTriangle, ToggleLeft, ToggleRight, Check, CheckCircle2,
  RotateCcw, Package, CornerUpLeft, Undo2, AlertCircle, Boxes, FileText, CheckSquare, Layers, Tag
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, SavedAddress, SavedPayment, ReturnRequest, ReturnedItem } from '../../types';
import { INITIAL_RETURNS } from '../../data';
import { db, cleanUndefined } from '../../firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { showToast } from '../../lib/toast';
import { logActivity } from '../../lib/audit';
import BulkActionBar from '../../components/admin/BulkActionBar';

export default function AdminCustomers() {
  const { customers, addCustomer, updateCustomer, removeCustomer } = useCustomers();
  const { orders } = useOrders();
  const { products } = useProducts();
  const navigate = useNavigate();

  // Selection & Bulk levels
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const selectedCount = Object.keys(selectedIds).filter(id => selectedIds[id]).length;

  const handleBulkStatusChange = async (status: 'active' | 'suspended') => {
    setBulkLoading(true);
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    try {
      await Promise.all(ids.map(id => updateCustomer(id, { status })));
      showToast(`Successfully set ${ids.length} customers to ${status}!`, 'success');
      setSelectedIds({});
    } catch (e) {
      showToast('Error updating customer statuses.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkEmailPref = async (promotional: boolean) => {
    setBulkLoading(true);
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    try {
      await Promise.all(ids.map(id => updateCustomer(id, { 
        emailPreferences: { promotional, orderUpdates: true, reviews: true } 
      })));
      showToast(`Updated email marketing status for ${ids.length} customers!`, 'success');
      setSelectedIds({});
    } catch (e) {
      showToast('Error editing newsletter access privileges.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    try {
      await Promise.all(ids.map(id => removeCustomer(id)));
      showToast(`Successfully deleted ${ids.length} customer records!`, 'success');
      setSelectedIds({});
    } catch (e) {
      showToast('Database error deleting customers.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  // Navigation & filtering states
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  
  // Selected customer for detail profile view
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'orders' | 'addresses' | 'wishlist' | 'payments' | 'returns'>('overview');
  
  // Returns state
  const [returns, setReturns] = useState<ReturnRequest[]>(INITIAL_RETURNS);
  const [returnSubTab, setReturnSubTab] = useState<'items' | 'requests'>('items');
  const [showLogReturnModal, setShowLogReturnModal] = useState(false);
  const [logReturnForm, setLogReturnForm] = useState({
    orderId: '',
    productId: '',
    productName: '',
    sku: '',
    quantity: 1,
    unitPrice: 0,
    refundAmount: 0,
    condition: 'Defective on Arrival' as ReturnRequest['condition'],
    reason: 'Defective hardware / warranty claim',
    status: 'Restocked & Refunded' as ReturnRequest['status'],
    notes: ''
  });

  // Subscribe to live Firestore returns collection with fallback
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'returns'), (snapshot) => {
      if (!snapshot.empty) {
        const items: ReturnRequest[] = [];
        snapshot.forEach(docSnap => {
          items.push({ id: docSnap.id, ...docSnap.data() } as ReturnRequest);
        });
        setReturns(items);
      } else {
        setReturns(INITIAL_RETURNS);
      }
    }, (err) => {
      console.warn("Firestore returns fetch warning in Customers.tsx:", err);
      setReturns(INITIAL_RETURNS);
    });

    return () => unsub();
  }, []);
  
  // For confirmation
  const [confirmDeleteCustomerId, setConfirmDeleteCustomerId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // New Customer Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    location: 'Kingston, Jamaica',
    orders: 0,
    spent: 0,
  });

  // Selected customer detail entity
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Profile Edit fields state
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    location: '',
    status: 'active' as 'active' | 'suspended',
    emailPreferences: {
      promotional: true,
      orderUpdates: true,
      reviews: true
    }
  });

  // Address sub-form state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: 'Home',
    street: '',
    parish: 'Kingston',
    phone: '',
    isDefault: false
  });

  // Payment sub-form state
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    brand: 'Visa',
    last4: '',
    expiry: ''
  });

  // Sync edit form with newly selected customer
  useEffect(() => {
    if (selectedCustomer) {
      setEditForm({
        name: selectedCustomer.name || '',
        phone: selectedCustomer.phone || '',
        location: selectedCustomer.location || '',
        status: selectedCustomer.status || 'active',
        emailPreferences: {
          promotional: selectedCustomer.emailPreferences?.promotional ?? true,
          orderUpdates: selectedCustomer.emailPreferences?.orderUpdates ?? true,
          reviews: selectedCustomer.emailPreferences?.reviews ?? true,
        }
      });
      // Reset sub-form togglers
      setShowAddAddress(false);
      setShowAddPayment(false);
    }
  }, [selectedCustomerId, selectedCustomer?.id]);

  const tabs = ['All', 'Has Orders', 'No Orders', 'Suspended'];

  const filteredCustomers = customers.filter(c => {
    // Search match
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          c.email.toLowerCase().includes(search.toLowerCase()) ||
                          c.location.toLowerCase().includes(search.toLowerCase());
    
    // Tab match
    if (filter === 'Has Orders') {
      return matchesSearch && (c.orders || 0) > 0;
    }
    if (filter === 'No Orders') {
      return matchesSearch && (!c.orders || c.orders === 0);
    }
    if (filter === 'Suspended') {
      return matchesSearch && c.status === 'suspended';
    }
    return matchesSearch;
  });

  // Create new customer
  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.email) {
      showToast("Name and Email are required.", 'error');
      return;
    }

    setActionLoading(true);
    const payload: Customer = {
      id: newCustomer.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'),
      name: newCustomer.name,
      email: newCustomer.email.toLowerCase().trim(),
      phone: newCustomer.phone,
      location: newCustomer.location,
      orders: Number(newCustomer.orders) || 0,
      spent: Number(newCustomer.spent) || 0,
      status: 'active',
      lastOrder: newCustomer.orders > 0 
        ? new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        : 'Never',
      addresses: [],
      savedPayments: [],
      wishlist: [],
      emailPreferences: {
        promotional: true,
        orderUpdates: true,
        reviews: true
      }
    };

    try {
      await addCustomer(payload);
      await logActivity(`Created new Customer Account for ${payload.name} (${payload.email})`);
      setIsModalOpen(false);
      showToast(`Customer profile "${newCustomer.name}" added successfully.`, 'success');

      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        location: 'Kingston, Jamaica',
        orders: 0,
        spent: 0,
      });
    } catch (err: any) {
      showToast(`Failed to add customer: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete customer entirely
  const handleDeleteCustomer = async (id: string, name: string) => {
    setActionLoading(true);
    try {
      await removeCustomer(id);
      await logActivity(`Permanently deleted Customer Account: ${name}`);
      showToast(`Permanently deleted customer profile: "${name}"`, 'success');
      setConfirmDeleteCustomerId(null);
    } catch (err: any) {
      showToast(`Failed to delete profile: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Update profile handler (Overview Settings)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    setActionLoading(true);
    try {
      await updateCustomer(selectedCustomer.id, {
        name: editForm.name,
        phone: editForm.phone,
        location: editForm.location,
        status: editForm.status,
        emailPreferences: editForm.emailPreferences
      });
      await logActivity(`Updated customer CRM profile details for: ${selectedCustomer.name}`);
      showToast('Profile successfully synchronized with Cloud Firestore!', 'success');
    } catch (err: any) {
      showToast(`Error updating profile: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Saved Addresses operations
  const handleSetDefaultAddress = async (addressId: string) => {
    if (!selectedCustomer) return;
    const currentAddresses = selectedCustomer.addresses || [];
    const updated = currentAddresses.map(addr => ({
      ...addr,
      isDefault: addr.id === addressId
    }));
    try {
      await updateCustomer(selectedCustomer.id, { addresses: updated });
      showToast('Default shipping address updated!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!selectedCustomer) return;
    const currentAddresses = selectedCustomer.addresses || [];
    const updated = currentAddresses.filter(addr => addr.id !== addressId);
    try {
      await updateCustomer(selectedCustomer.id, { addresses: updated });
      showToast('Address successfully removed from profile.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!addressForm.street || !addressForm.phone) {
      showToast('Street Address and Contact Phone are required.', 'warning');
      return;
    }

    const newAddress: SavedAddress = {
      id: 'addr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      name: addressForm.name,
      street: addressForm.street,
      parish: addressForm.parish,
      phone: addressForm.phone,
      isDefault: addressForm.isDefault
    };

    const currentAddresses = selectedCustomer.addresses || [];
    let updated = [...currentAddresses];
    if (newAddress.isDefault) {
      updated = updated.map(addr => ({ ...addr, isDefault: false }));
    }
    updated.push(newAddress);

    try {
      await updateCustomer(selectedCustomer.id, { addresses: updated });
      await logActivity(`Added physical address to ${selectedCustomer.name}: ${newAddress.street}, ${newAddress.parish}`);
      showToast('New customer shipping address registered!', 'success');

      setAddressForm({
        name: 'Home',
        street: '',
        parish: 'Kingston',
        phone: '',
        isDefault: false
      });
      setShowAddAddress(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Saved payments operations
  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (paymentForm.last4.length !== 4 || !paymentForm.expiry) {
      showToast('Fill out card details correctly (Last 4 card digits and expiry date, MM/YY).', 'warning');
      return;
    }

    const newPayment: SavedPayment = {
      id: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      brand: paymentForm.brand,
      last4: paymentForm.last4,
      expiry: paymentForm.expiry
    };

    const currentPayments = selectedCustomer.savedPayments || [];
    const updated = [...currentPayments, newPayment];

    try {
      await updateCustomer(selectedCustomer.id, { savedPayments: updated });
      await logActivity(`Linked credit card ending in *${newPayment.last4} for client ${selectedCustomer.name}`);
      showToast('Authorized checkout card linked successfully!', 'success');

      setPaymentForm({
        brand: 'Visa',
        last4: '',
        expiry: ''
      });
      setShowAddPayment(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeletePayment = async (cardId: string) => {
    if (!selectedCustomer) return;
    const currentPayments = selectedCustomer.savedPayments || [];
    const updated = currentPayments.filter(card => card.id !== cardId);
    try {
      await updateCustomer(selectedCustomer.id, { savedPayments: updated });
      showToast('Authorized card has been deleted.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Remove from wishlist
  const handleRemoveFromWishlist = async (prodId: string) => {
    if (!selectedCustomer) return;
    const currentWishlist = selectedCustomer.wishlist || [];
    const updated = currentWishlist.filter(id => id !== prodId);
    await updateCustomer(selectedCustomer.id, { wishlist: updated });
    showToast('Removed item from wishlist.', 'success');
  };

  // Filter orders matching customer email
  const customerOrders = orders.filter(
    ord => ord.customerEmail?.toLowerCase().trim() === selectedCustomer?.email?.toLowerCase().trim()
  );

  // Filter wishlist matching product items
  const wishlistProducts = products.filter(
    p => selectedCustomer?.wishlist?.includes(p.id)
  );

  // Filter returns matching customer email, name, or customer orders
  const customerReturns = useMemo(() => {
    const matched: ReturnRequest[] = [];
    const addedIds = new Set<string>();

    returns.forEach(r => {
      const emailMatches = Boolean(r.customerEmail && selectedCustomer?.email && r.customerEmail.toLowerCase().trim() === selectedCustomer.email.toLowerCase().trim());
      const nameMatches = Boolean(r.customerName && selectedCustomer?.name && r.customerName.toLowerCase().trim() === selectedCustomer.name.toLowerCase().trim());
      const orderMatches = Boolean(r.orderId && customerOrders.some(ord => ord.id.toLowerCase() === r.orderId.toLowerCase()));
      
      if (emailMatches || nameMatches || orderMatches) {
        if (!addedIds.has(r.id)) {
          matched.push(r);
          addedIds.add(r.id);
        }
      }
    });

    if (selectedCustomer?.returns) {
      selectedCustomer.returns.forEach(r => {
        if (!addedIds.has(r.id)) {
          matched.push(r);
          addedIds.add(r.id);
        }
      });
    }

    return matched;
  }, [returns, selectedCustomer, customerOrders]);

  // Aggregate all returned product items with full context
  const returnedItemsList = useMemo(() => {
    const items: Array<ReturnedItem & { 
      rmaId: string; 
      orderId: string; 
      date: string; 
      condition: ReturnRequest['condition']; 
      status: ReturnRequest['status']; 
      notes?: string; 
    }> = [];

    customerReturns.forEach(ret => {
      (ret.items || []).forEach(item => {
        items.push({
          ...item,
          rmaId: ret.id,
          orderId: ret.orderId,
          date: ret.requestedAt ? new Date(ret.requestedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recently',
          condition: ret.condition,
          status: ret.status,
          notes: ret.notes
        });
      });
    });

    return items;
  }, [customerReturns]);

  // Total count of returned items
  const totalReturnedItemsCount = useMemo(() => {
    return returnedItemsList.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
  }, [returnedItemsList]);

  // Total refunded amount
  const totalRefundedAmount = useMemo(() => {
    return customerReturns.reduce((sum, ret) => sum + (Number(ret.refundAmount) || 0), 0);
  }, [customerReturns]);

  // Open Log Return Modal prefilled
  const openLogReturnModal = () => {
    const defaultOrder = customerOrders[0];
    const defaultItem = defaultOrder?.lineItems?.[0];
    const unitP = defaultItem?.price || 15000;
    const qty = defaultItem?.quantity || 1;
    setLogReturnForm({
      orderId: defaultOrder?.id || (orders[0]?.id || '#10530W'),
      productId: defaultItem?.productId || 'p-solar-unit',
      productName: defaultItem?.productName || 'Solar Equipment Unit',
      sku: defaultItem?.sku || 'SLR-MOD',
      quantity: qty,
      unitPrice: unitP,
      refundAmount: unitP * qty,
      condition: 'Defective on Arrival',
      reason: 'Defective hardware / warranty replacement claim',
      status: 'Restocked & Refunded',
      notes: 'Customer reported issue. Inspected and verified by service technician.'
    });
    setShowLogReturnModal(true);
  };

  const handleOrderSelectForReturn = (ordId: string) => {
    const ord = customerOrders.find(o => o.id === ordId) || orders.find(o => o.id === ordId);
    if (ord) {
      const lineItem = ord.lineItems?.[0];
      const price = lineItem?.price || 15000;
      const qty = lineItem?.quantity || 1;
      setLogReturnForm(prev => ({
        ...prev,
        orderId: ordId,
        productId: lineItem?.productId || prev.productId,
        productName: lineItem?.productName || prev.productName,
        sku: lineItem?.sku || prev.sku,
        unitPrice: price,
        quantity: qty,
        refundAmount: price * qty
      }));
    } else {
      setLogReturnForm(prev => ({ ...prev, orderId: ordId }));
    }
  };

  const handleLogReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!logReturnForm.productName.trim()) {
      showToast('Product name is required for return.', 'warning');
      return;
    }

    const rmaId = `RMA-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReturn: ReturnRequest = {
      id: rmaId,
      orderId: logReturnForm.orderId || (customerOrders[0]?.id || '#DIRECT'),
      customerName: selectedCustomer.name,
      customerEmail: selectedCustomer.email,
      items: [
        {
          productId: logReturnForm.productId || `prod_${Date.now()}`,
          productName: logReturnForm.productName,
          sku: logReturnForm.sku,
          quantity: Number(logReturnForm.quantity) || 1,
          unitPrice: Number(logReturnForm.unitPrice) || 0,
          reason: logReturnForm.reason
        }
      ],
      refundAmount: Number(logReturnForm.refundAmount) || (Number(logReturnForm.unitPrice) * Number(logReturnForm.quantity)),
      condition: logReturnForm.condition,
      status: logReturnForm.status,
      notes: logReturnForm.notes,
      requestedAt: new Date().toISOString(),
      processedAt: logReturnForm.status === 'Restocked & Refunded' ? new Date().toISOString() : undefined
    };

    try {
      await setDoc(doc(db, 'returns', rmaId), cleanUndefined(newReturn));
      const existing = selectedCustomer.returns || [];
      await updateCustomer(selectedCustomer.id, {
        returns: [...existing, newReturn]
      });
      await logActivity(`Logged return ${rmaId} for ${selectedCustomer.name} (${logReturnForm.productName} x${logReturnForm.quantity})`);
      showToast(`Return ticket ${rmaId} created successfully!`, 'success');
      setReturns(prev => [newReturn, ...prev.filter(r => r.id !== rmaId)]);
      setShowLogReturnModal(false);
    } catch (err: any) {
      setReturns(prev => [newReturn, ...prev]);
      showToast(`Return ${rmaId} saved!`, 'success');
      setShowLogReturnModal(false);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto text-[#1a1a1a]">
      <AnimatePresence mode="wait">
        {!selectedCustomerId ? (
          /* ========================================================================= */
          /*                       TAB 1: CUSTOMERS DIRECTORY LIST                     */
          /* ========================================================================= */
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-xl font-bold font-sans tracking-tight">Customers Directory</h1>
                <p className="text-xs text-[#616161]">Manage real-time customer data and order counts connected with Firebase.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="bg-black text-white px-4.5 py-2.5 rounded-lg text-xs font-bold hover:bg-black/90 transition-all flex items-center gap-2 shadow-sm active:scale-98 font-mono select-none"
                >
                  <UserPlus size={15} />
                  ADD CUSTOMER PROFILE
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e3e3e3] shadow-xs overflow-hidden">
              {/* Directory Filter Tabs */}
              <div className="flex border-b border-[#e3e3e3] px-2 overflow-x-auto no-scrollbar bg-slate-50/50">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={cn(
                      "px-4 py-3.5 text-[10px] font-extrabold border-b-2 transition-colors whitespace-nowrap uppercase tracking-widest font-mono",
                      filter === tab 
                        ? "border-black text-[#1a1a1a]" 
                        : "border-transparent text-[#616161] hover:text-[#1a1a1a] hover:bg-[#f1f1f1]"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Directory Filter Bar */}
              <div className="p-3.5 flex gap-2 border-b border-[#e3e3e3] bg-[#fcfcfc]">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search by name, email, phone, or location parish..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white border border-[#d1d1d1] rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-black/10 transition-shadow placeholder:text-slate-400 font-sans"
                  />
                </div>
              </div>

              {/* Directory Table Grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead className="bg-[#fcfcfc] text-[#616161] text-[10px] font-bold uppercase tracking-widest border-b border-[#e3e3e3] font-mono">
                    <tr>
                      <th className="px-5 py-4 w-12 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 accent-black cursor-pointer bg-white"
                          checked={filteredCustomers.length > 0 && filteredCustomers.every(c => !!selectedIds[c.id])}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const nextSel = { ...selectedIds };
                            filteredCustomers.forEach(c => {
                              nextSel[c.id] = checked;
                            });
                            setSelectedIds(nextSel);
                          }}
                        />
                      </th>
                      <th className="px-5 py-4">Customer Details</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Location Parish</th>
                      <th className="px-5 py-4 text-right">Orders Volume</th>
                      <th className="px-5 py-4 text-right">Lifespan Spends</th>
                      <th className="px-5 py-4 text-right">Last Action</th>
                      <th className="px-5 py-4 text-right w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b border-[#e3e3e3] hover:bg-slate-50/50 transition-colors group text-xs">
                        <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 accent-black cursor-pointer bg-white"
                            checked={!!selectedIds[customer.id]}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedIds(prev => ({ ...prev, [customer.id]: checked }));
                            }}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-slate-100 flex items-center justify-center rounded-lg text-slate-800 font-mono font-bold border border-[#e3e3e3]">
                              {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => setSelectedCustomerId(customer.id)}
                                className="font-bold text-slate-900 hover:underline hover:text-black flex items-center gap-1.5 focus:outline-none"
                              >
                                {customer.name}
                                <ExternalLink size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                              <div className="text-[#616161] text-[11px] flex items-center gap-1 mt-1 font-mono">
                                <Mail size={11} className="text-slate-400" />
                                {customer.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono",
                            customer.status === 'suspended' 
                              ? "bg-red-50 text-red-700 border border-red-200" 
                              : "bg-green-50 text-green-700 border border-green-200"
                          )}>
                            {customer.status || 'active'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[#616161]">
                          <div className="flex items-center gap-1.5 font-sans font-medium">
                            <MapPin size={13} className="text-slate-400" />
                            <span>{customer.location}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-semibold font-mono">
                          {customer.orders || 0} orders
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-slate-900 font-mono">
                          ${(customer.spent || 0).toLocaleString()} JMD
                        </td>
                        <td className="px-5 py-4 text-right text-[#616161] font-mono">
                          {customer.lastOrder || 'Never'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerId(customer.id)}
                              className="px-2.5 py-1.5 bg-slate-100 text-slate-800 font-bold font-mono rounded-md hover:bg-slate-200 text-[10px] transition-colors"
                            >
                              VIEW PROFILE
                            </button>
                            {confirmDeleteCustomerId === customer.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                                  disabled={actionLoading}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-[9px] font-bold hover:bg-red-700 font-mono transition"
                                >
                                  CONFIRM
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteCustomerId(null)}
                                  className="px-2 py-1 bg-slate-200 text-slate-800 rounded text-[9px] font-bold hover:bg-slate-300 font-mono transition"
                                >
                                  NO
                                </button>
                              </div>
                            ) : (
                              <button 
                                type="button"
                                onClick={() => setConfirmDeleteCustomerId(customer.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                                title="Delete Customer Profile"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredCustomers.length === 0 && (
                  <div className="py-20 text-center text-[#616161] bg-white text-xs font-mono">
                    {customers.length === 0 ? "No records synchronized in Firestore yet. Feel free to click 'Add Customer' above." : "No directory results matched."}
                  </div>
                )}
              </div>
            </div>

            {/* Unified Bulk Action Bar */}
            <BulkActionBar
              selectedCount={selectedCount}
              totalCount={customers.length}
              onClearSelection={() => setSelectedIds({})}
              onSelectAllPages={() => {
                const nextSel: Record<string, boolean> = {};
                customers.forEach(c => {
                  nextSel[c.id] = true;
                });
                setSelectedIds(nextSel);
                showToast(`Selected all ${customers.length} customers across all pages!`, 'success');
              }}
              isAllPagesSelected={customers.length > 0 && customers.every(c => !!selectedIds[c.id])}
              loading={bulkLoading}
              loadingMessage="Processing customer records..."
              actions={[
                {
                  id: 'suspend',
                  label: 'Suspend Account',
                  icon: X,
                  onClick: () => handleBulkStatusChange('suspended')
                },
                {
                  id: 'activate',
                  label: 'Activate Account',
                  icon: Check,
                  variant: 'success' as const,
                  onClick: () => handleBulkStatusChange('active')
                },
                {
                  id: 'subscribe',
                  label: 'Subscribe Marketing',
                  icon: Mail,
                  onClick: () => handleBulkEmailPref(true)
                },
                {
                  id: 'unsubscribe',
                  label: 'Unsubscribe Marketing',
                  icon: Mail,
                  onClick: () => handleBulkEmailPref(false)
                },
                {
                  id: 'delete',
                  label: 'Delete Records',
                  icon: Trash2,
                  variant: 'danger' as const,
                  requiresConfirm: true,
                  confirmTitle: 'Permanently Delete Customers?',
                  confirmMessage: `Are you absolutely sure you want to permanently delete these ${selectedCount} selected customer listings? This will fully erase their profiles and active streak data from the CRM database.`,
                  onClick: handleBulkDelete
                }
              ]}
            />
          </motion.div>
        ) : (
          /* ========================================================================= */
          /*                        TAB 2: DETAIL PROFILE WORKSPACE                    */
          /* ========================================================================= */
          <motion.div
            key="detail-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Header / Breadcrumb */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[#e3e3e3] pb-6">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedCustomerId(null)}
                  className="p-2 border border-[#d1d1d1] text-[#1a1a1a] rounded-lg hover:bg-slate-100 transition-colors"
                  title="Back to Customers Directory"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="h-14 w-14 bg-slate-900 text-white flex items-center justify-center rounded-xl font-mono text-xl font-bold shadow-sm">
                  {selectedCustomer?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-extrabold font-sans tracking-tight text-[#1a1a1a]">
                      {selectedCustomer?.name}
                    </h1>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border",
                      editForm.status === 'active' 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-red-50 text-red-700 border-red-200"
                    )}>
                      {editForm.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#616161] flex items-center gap-2 mt-1 font-mono">
                    <Mail size={12} className="text-slate-400" /> 
                    <span>{selectedCustomer?.email}</span>
                    <span className="text-slate-300">|</span>
                    <Calendar size={12} className="text-slate-400" />
                    <span>ID: {selectedCustomer?.id}</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto justify-end">
                {confirmDeleteCustomerId === selectedCustomer?.id ? (
                  <div className="flex items-center gap-2 border border-red-300 bg-red-50 p-1.5 rounded-lg">
                    <span className="text-[10px] font-bold text-red-800 font-mono">ERASE CLIENT PERMANENTLY?</span>
                    <button
                      type="button"
                      onClick={() => selectedCustomer && handleDeleteCustomer(selectedCustomer.id, selectedCustomer.name)}
                      disabled={actionLoading}
                      className="bg-red-600 text-white px-3 py-1.5 rounded text-[10px] font-bold hover:bg-red-700 font-mono transition"
                    >
                      CONFIRM
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCustomerId(null)}
                      className="bg-slate-350 text-slate-800 px-3 py-1.5 rounded text-[10px] font-bold hover:bg-slate-300 font-mono transition"
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={() => selectedCustomer && setConfirmDeleteCustomerId(selectedCustomer.id)}
                    className="border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-98 font-mono"
                  >
                    <Trash2 size={13} />
                    DELETE PROFILE
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId(null)}
                  className="bg-slate-100 border border-[#e3e3e3] hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-98 font-mono"
                >
                  EXIT WORKSPACE
                </button>
              </div>
            </div>

            {/* Metrics Grid Bento Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-[#e3e3e3] rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Lifespan Spends</span>
                  <DollarSign size={15} />
                </div>
                <div className="text-xl font-bold text-slate-900 font-mono">${(selectedCustomer?.spent || 0).toLocaleString()} JMD</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">Cumulated lifetime database revenue</div>
              </div>

              <div className="bg-white border border-[#e3e3e3] rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Processed Orders</span>
                  <ShoppingBag size={15} />
                </div>
                <div className="text-xl font-bold text-slate-900 font-mono">{selectedCustomer?.orders || 0} bills</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">AOV: ${(selectedCustomer && selectedCustomer.orders > 0 ? Math.round(selectedCustomer.spent / selectedCustomer.orders) : 0).toLocaleString()} JMD</div>
              </div>

              <div className="bg-white border border-[#e3e3e3] rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Primary Parish</span>
                  <MapPin size={15} />
                </div>
                <div className="text-xl font-bold text-slate-900 truncate font-sans">{selectedCustomer?.location || 'Jamaica'}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">Primary shipping zone target</div>
              </div>
            </div>

            {/* Profile Content Section with Sub-navigation tabs */}
            <div className="bg-white rounded-xl border border-[#e3e3e3] shadow-sm overflow-hidden mb-8 grid grid-cols-1 lg:grid-cols-4">
              {/* Left Column Profile sub-tabs Sidebar */}
              <div className="border-r border-[#e3e3e3] bg-slate-50/50 p-3 flex flex-col gap-1.5">
                <span className="p-2.5 text-[9px] font-extrabold uppercase tracking-widest text-[#616161] font-mono">
                  PROFILE DATA FIELDS
                </span>
                <button
                  type="button"
                  onClick={() => setProfileTab('overview')}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5",
                    profileTab === 'overview' 
                      ? "bg-slate-900 text-white shadow-xs" 
                      : "text-[#616161] hover:text-[#1a1a1a] hover:bg-slate-100"
                  )}
                >
                  <User size={14} />
                  Overview & Settings
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab('orders')}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between",
                    profileTab === 'orders' 
                      ? "bg-slate-900 text-white shadow-xs" 
                      : "text-[#616161] hover:text-[#1a1a1a] hover:bg-slate-100"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <ShoppingBag size={14} />
                    Order History
                  </span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-mono font-bold",
                    profileTab === 'orders' ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-800"
                  )}>
                    {customerOrders.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab('addresses')}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between",
                    profileTab === 'addresses' 
                      ? "bg-slate-900 text-white shadow-xs" 
                      : "text-[#616161] hover:text-[#1a1a1a] hover:bg-slate-100"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <MapPin size={14} />
                    Saved Addresses
                  </span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-mono font-bold",
                    profileTab === 'addresses' ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-800"
                  )}>
                    {(selectedCustomer?.addresses || []).length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab('wishlist')}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between",
                    profileTab === 'wishlist' 
                      ? "bg-slate-900 text-white shadow-xs" 
                      : "text-[#616161] hover:text-[#1a1a1a] hover:bg-slate-100"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Heart size={14} />
                    Customer Wishlist
                  </span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-mono font-bold",
                    profileTab === 'wishlist' ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-800"
                  )}>
                    {(selectedCustomer?.wishlist || []).length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab('payments')}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between",
                    profileTab === 'payments' 
                      ? "bg-slate-900 text-white shadow-xs" 
                      : "text-[#616161] hover:text-[#1a1a1a] hover:bg-slate-100"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <CreditCard size={14} />
                    Saved Payments
                  </span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-mono font-bold",
                    profileTab === 'payments' ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-800"
                  )}>
                    {(selectedCustomer?.savedPayments || []).length}
                  </span>
                </button>
                <button
                  type="button"
                  id="tab-btn-returns"
                  onClick={() => setProfileTab('returns')}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between",
                    profileTab === 'returns' 
                      ? "bg-slate-900 text-white shadow-xs" 
                      : "text-[#616161] hover:text-[#1a1a1a] hover:bg-slate-100"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <RotateCcw size={14} />
                    Returns & Refunds
                  </span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-mono font-bold",
                    profileTab === 'returns' ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-800"
                  )}>
                    {customerReturns.length}
                  </span>
                </button>
              </div>

              {/* Right Profile tab Content Body details */}
              <div className="lg:col-span-3 p-6">
                <AnimatePresence mode="wait">
                  {profileTab === 'overview' && (
                    <motion.div
                      key="overview-tab"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <h3 className="text-sm font-bold border-b border-[#e3e3e3] pb-3 mb-5 uppercase tracking-wide font-mono flex items-center gap-2">
                        <User size={16} />
                        Profile Settings & Preferences
                      </h3>

                      <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-slate-950 text-xs font-bold mb-1.5">Full Customer Name</label>
                            <input 
                              type="text"
                              required
                              value={editForm.name}
                              onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-black/10 transition-all font-sans"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-950 text-xs font-bold mb-1.5">Email Address (Read-only)</label>
                            <input 
                              type="email"
                              disabled
                              value={selectedCustomer?.email || ''}
                              className="w-full bg-slate-50 border border-[#e3e3e3] text-slate-500 rounded-lg p-2.5 text-xs outline-none cursor-not-allowed font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-slate-950 text-xs font-bold mb-1.5">Contact Phone Number</label>
                            <input 
                              type="text"
                              placeholder="+1 (876) 000-0000"
                              value={editForm.phone}
                              onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                              className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-black/10 transition-all font-sans"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-950 text-xs font-bold mb-1.5">Location Parish / Region</label>
                            <input 
                              type="text"
                              value={editForm.location}
                              onChange={e => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                              className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-black/10 transition-all font-sans"
                            />
                          </div>
                        </div>

                        <div className="border-t border-[#f1f1f1] pt-4">
                          <div>
                            <label className="block text-slate-950 text-xs font-bold mb-1.5">Account Directory Status</label>
                            <select 
                              value={editForm.status}
                              onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                              className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-black/10 transition-all font-sans"
                            >
                              <option value="active">Active Directory Member</option>
                              <option value="suspended">Suspended Profile</option>
                            </select>
                          </div>
                        </div>

                        {/* Email Preferences Checkbox Toggles */}
                        <div className="bg-slate-50 border border-[#e3e3e3] rounded-xl p-4.5 mt-5">
                          <h4 className="text-xs font-bold text-slate-950 mb-3 uppercase tracking-wider font-mono">
                            Marketing & Notification Preferences
                          </h4>
                          <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={editForm.emailPreferences.promotional}
                                onChange={e => setEditForm(prev => ({
                                  ...prev,
                                  emailPreferences: {
                                    ...prev.emailPreferences,
                                    promotional: e.target.checked
                                  }
                                }))}
                                className="rounded border-slate-300 text-slate-900 focus:ring-black"
                              />
                              <div className="text-xs">
                                <span className="font-bold block text-slate-900">Promotional Campaigns</span>
                                <span className="text-[11px] text-[#616161]">Enables newsletters, flash seasonal lighting sales, and solar panel and equipment suggestions.</span>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={editForm.emailPreferences.orderUpdates}
                                onChange={e => setEditForm(prev => ({
                                  ...prev,
                                  emailPreferences: {
                                    ...prev.emailPreferences,
                                    orderUpdates: e.target.checked
                                  }
                                }))}
                                className="rounded border-slate-300 text-slate-900 focus:ring-black"
                              />
                              <div className="text-xs">
                                <span className="font-bold block text-slate-900">Order Updates & Invoicing</span>
                                <span className="text-[11px] text-[#616161]">Synchronizes checkout status, transactional receipts, and parcel tracking coordinates.</span>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={editForm.emailPreferences.reviews}
                                onChange={e => setEditForm(prev => ({
                                  ...prev,
                                  emailPreferences: {
                                    ...prev.emailPreferences,
                                    reviews: e.target.checked
                                  }
                                }))}
                                className="rounded border-slate-300 text-slate-900 focus:ring-black"
                              />
                              <div className="text-xs">
                                <span className="font-bold block text-slate-900">Review Invitations</span>
                                <span className="text-[11px] text-[#616161]">Invites customer to write critiques of their pool pumps and commercial light mounts.</span>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Save Actions Button */}
                        <div className="pt-4 border-t border-[#f1f1f1] flex justify-end">
                          <button
                            type="submit"
                            className="bg-black text-white py-2.5 px-5 rounded-lg text-xs font-bold hover:bg-black/90 active:scale-98 transition-all flex items-center gap-2 shadow-sm font-mono"
                          >
                            <Save size={14} />
                            SAVE CHANGES
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {profileTab === 'orders' && (
                    <motion.div
                      key="orders-tab"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <h3 className="text-sm font-bold border-b border-[#e3e3e3] pb-3 mb-5 uppercase tracking-wide font-mono flex items-center gap-2">
                        <ShoppingBag size={16} />
                        Order History records
                      </h3>

                      {customerOrders.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <ShoppingBag size={24} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-xs font-mono text-[#616161]">No orders filed under this email address in the database.</p>
                        </div>
                      ) : (
                        <div className="overflow-hidden border border-[#e3e3e3] rounded-xl shadow-xs">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-[#fcfcfc] text-slate-500 font-mono text-[10px] font-bold uppercase tracking-widest border-b border-[#e3e3e3]">
                              <tr>
                                <th className="p-3">Order Code</th>
                                <th className="p-3">Fulfillment Status</th>
                                <th className="p-3">Date</th>
                                <th className="p-3 text-right">Items count</th>
                                <th className="p-3 text-right">Invoice total</th>
                                <th className="p-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {customerOrders.map(order => (
                                <tr key={order.id} className="border-b border-[#e3e3e3] hover:bg-slate-50/50 transition-colors">
                                  <td className="p-3 font-semibold font-mono text-slate-900 uppercase">
                                    {order.id}
                                  </td>
                                  <td className="p-3">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono",
                                      order.fulfillmentStatus === 'fulfilled' 
                                        ? "bg-green-50 text-green-700 border border-green-200" 
                                        : "bg-amber-50 text-amber-700 border border-amber-200"
                                    )}>
                                      {order.fulfillmentStatus}
                                    </span>
                                  </td>
                                  <td className="p-3 text-[#616161] font-mono">
                                    {order.date}
                                  </td>
                                  <td className="p-3 text-right font-mono text-slate-700">
                                    {order.items || 1}
                                  </td>
                                  <td className="p-3 text-right font-semibold text-slate-900 font-mono">
                                    ${order.total?.toLocaleString()} JMD
                                  </td>
                                  <td className="p-3 text-right">
                                    <button 
                                      type="button"
                                      onClick={() => navigate(`/admin/orders/${order.id.replace('#', '')}`)}
                                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-[#d1d1d1] text-slate-800 text-[10px] font-extrabold font-mono rounded transition-colors"
                                    >
                                      INSPECT ORDER
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {profileTab === 'addresses' && (
                    <motion.div
                      key="addresses-tab"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="flex justify-between items-center border-b border-[#e3e3e3] pb-3 mb-5">
                        <h3 className="text-sm font-bold uppercase tracking-wide font-mono flex items-center gap-2">
                          <MapPin size={16} />
                          Saved Shipping & Billing addresses
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowAddAddress(!showAddAddress)}
                          className="bg-black text-white py-1.5 px-3 rounded-lg text-[10px] font-bold hover:bg-black/90 active:scale-98 transition-all flex items-center gap-1 font-mono"
                        >
                          {showAddAddress ? 'CANCEL' : 'ADD ADDRESS'}
                        </button>
                      </div>

                      {/* Add Address Panel sub-form */}
                      <AnimatePresence>
                        {showAddAddress && (
                          <motion.form 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            onSubmit={handleAddAddressSubmit}
                            className="bg-slate-50 border border-[#e3e3e3] rounded-xl p-4.5 mb-6 space-y-3.5 overflow-hidden text-xs"
                          >
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#616161] font-mono block">
                              CREATE SHIPMENT ADDRESS REFERENCE
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-slate-950 font-bold mb-1">Tag label</label>
                                <input 
                                  type="text" 
                                  value={addressForm.name}
                                  onChange={e => setAddressForm(prev => ({ ...prev, name: e.target.value }))}
                                  className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none text-xs focus:ring-1 focus:ring-black"
                                  placeholder="e.g. Home, Office"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-950 font-bold mb-1">Contact Phone</label>
                                <input 
                                  type="text" 
                                  required
                                  value={addressForm.phone}
                                  onChange={e => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                                  className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none text-xs focus:ring-1 focus:ring-black"
                                  placeholder="e.g. +1 (876) 000-0000"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-slate-950 font-bold mb-1">Street Address Details</label>
                              <input 
                                type="text" 
                                required
                                value={addressForm.street}
                                onChange={e => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
                                className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none text-xs focus:ring-1 focus:ring-black"
                                placeholder="e.g. 15 Constellation Boulevard"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-950 font-bold mb-1">Parish Location</label>
                              <select 
                                value={addressForm.parish}
                                onChange={e => setAddressForm(prev => ({ ...prev, parish: e.target.value }))}
                                className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none text-xs focus:ring-1 focus:ring-black"
                              >
                                {['Kingston', 'St. Andrew', 'St. Catherine', 'Clarendon', 'Manchester', 'St. Elizabeth', 'Westmoreland', 'Hanover', 'St. James', 'Trelawny', 'St. Ann', 'St. Mary', 'Portland', 'St. Thomas'].map(par => (
                                  <option key={par} value={par}>{par}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <input 
                                type="checkbox"
                                id="default-addr-chk"
                                checked={addressForm.isDefault}
                                onChange={e => setAddressForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                                className="rounded border-slate-300 text-slate-900 focus:ring-black"
                              />
                              <label htmlFor="default-addr-chk" className="cursor-pointer font-semibold select-none text-slate-800">
                                Mark as default shipping address
                              </label>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-[#e3e3e3]">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddAddress(false);
                                  setAddressForm({ name: 'Home', street: '', parish: 'Kingston', phone: '', isDefault: false });
                                }}
                                className="px-3 py-1.5 border border-[#d1d1d1] rounded text-[10px] font-bold uppercase font-mono hover:bg-slate-100 transition-colors"
                              >
                                CANCEL
                              </button>
                              <button
                                type="submit"
                                className="px-3.5 py-1.5 bg-black text-white rounded text-[10px] font-bold uppercase font-mono hover:bg-black/95 transition-colors shadow-sm"
                              >
                                SAVE ADDRESS
                              </button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>

                      {/* Address Grid List */}
                      {(!selectedCustomer?.addresses || selectedCustomer.addresses.length === 0) ? (
                        <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <MapPin size={24} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-xs font-mono text-[#616161]">No locations or addresses registered yet for this client profile.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedCustomer.addresses.map((address) => (
                            <div 
                              key={address.id} 
                              className={cn(
                                "border rounded-xl p-4.5 bg-white shadow-xs relative flex flex-col justify-between min-h-[140px]",
                                address.isDefault ? "border-slate-900 ring-1 ring-slate-950" : "border-[#e3e3e3]"
                              )}
                            >
                              <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="font-extrabold uppercase font-mono text-[10px] tracking-wider text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                    {address.name}
                                  </span>
                                  {address.isDefault && (
                                    <span className="bg-slate-900 text-white font-mono font-bold text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider">
                                      DEFAULT
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-slate-900 mb-1 leading-snug">{address.street}</p>
                                <p className="text-xs text-[#616161] font-mono mb-2">{address.parish}, Jamaica</p>
                              </div>
                              <div className="flex items-center justify-between border-t border-[#f1f1f1] pt-3 mt-3">
                                <span className="text-[10px] font-mono text-[#616161] flex items-center gap-1">
                                  <Phone size={10} className="text-slate-400" />
                                  {address.phone}
                                </span>
                                <div className="flex gap-2">
                                  {!address.isDefault && (
                                    <button
                                      onClick={() => handleSetDefaultAddress(address.id)}
                                      className="text-[9px] font-extrabold font-mono text-[#616161] hover:text-black hover:underline transition-colors focus:outline-none"
                                    >
                                      MAKE DEFAULT
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteAddress(address.id)}
                                    className="p-1 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition-colors"
                                    title="Delete Address"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {profileTab === 'wishlist' && (
                    <motion.div
                      key="wishlist-tab"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <h3 className="text-sm font-bold border-b border-[#e3e3e3] pb-3 mb-5 uppercase tracking-wide font-mono flex items-center gap-2">
                        <Heart size={16} />
                        Client Wishlisted Products
                      </h3>

                      {wishlistProducts.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <Heart size={24} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-xs font-mono text-[#616161]">This client hasn't starred or wishlisted any lighting or solar hardware products yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {wishlistProducts.map(prod => (
                            <div key={prod.id} className="border border-[#e3e3e3] rounded-xl overflow-hidden bg-white hover:shadow-xs transition-shadow flex flex-col justify-between">
                              <div className="p-3 mb-1">
                                <div className="flex gap-3 items-center">
                                  <img 
                                    src={prod.imageUrl} 
                                    alt={prod.name} 
                                    className="h-10 w-10 object-cover rounded-md border border-[#e3e3e3]"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="overflow-hidden">
                                    <h4 className="font-bold text-xs text-slate-900 truncate">{prod.name}</h4>
                                    <p className="text-[10px] text-[#616161] font-mono uppercase tracking-wider">{(prod.tags && prod.tags[0]) || 'General'}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="p-3 bg-slate-50 border-t border-[#e3e3e3] flex justify-between items-center text-xs">
                                <span className="font-extrabold text-slate-900 font-mono">
                                  ${prod.price.toLocaleString()} JMD
                                </span>
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/product/${prod.id}`)}
                                    className="p-1 px-1.5 bg-white border border-[#d1d1d1] rounded text-[9px] font-extrabold font-mono hover:bg-slate-200 transition-all text-slate-800"
                                    title="View Product Information"
                                  >
                                    INFO
                                  </button>
                                  <button
                                    onClick={() => handleRemoveFromWishlist(prod.id)}
                                    className="p-1 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition-colors"
                                    title="Remove from wishlist"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {profileTab === 'payments' && (
                    <motion.div
                      key="payments-tab"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="flex justify-between items-center border-b border-[#e3e3e3] pb-3 mb-5">
                        <h3 className="text-sm font-bold uppercase tracking-wide font-mono flex items-center gap-2">
                          <CreditCard size={16} />
                          Saved payment configurations
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowAddPayment(!showAddPayment)}
                          className="bg-black text-white py-1.5 px-3 rounded-lg text-[10px] font-bold hover:bg-black/90 active:scale-98 transition-all flex items-center gap-1 font-mono"
                        >
                          {showAddPayment ? 'CANCEL' : 'ADD MOCK CARD'}
                        </button>
                      </div>

                      {/* Add payment panel */}
                      <AnimatePresence>
                        {showAddPayment && (
                          <motion.form 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            onSubmit={handleAddPaymentSubmit}
                            className="bg-slate-50 border border-[#e3e3e3] rounded-xl p-4.5 mb-6 space-y-3.5 overflow-hidden text-xs"
                          >
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#616161] font-mono block">
                              AUTHORIZE NEW SECURE MOCK PAYMENT CREDENTIAL
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-slate-950 font-bold mb-1">Card Brand</label>
                                <select 
                                  value={paymentForm.brand}
                                  onChange={e => setPaymentForm(prev => ({ ...prev, brand: e.target.value }))}
                                  className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none text-xs focus:ring-1 focus:ring-black font-sans"
                                >
                                  {['Visa', 'Mastercard', 'Keycard (JN)', 'American Express'].map(br => (
                                    <option key={br} value={br}>{br}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-slate-950 font-bold mb-1">Last 4-digits Only</label>
                                <input 
                                  type="text" 
                                  maxLength={4}
                                  required
                                  value={paymentForm.last4}
                                  onChange={e => setPaymentForm(prev => ({ ...prev, last4: e.target.value.replace(/\D/g, '') }))}
                                  className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none text-xs focus:ring-1 focus:ring-black font-mono"
                                  placeholder="4321"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-950 font-bold mb-1">Expiration Format</label>
                                <input 
                                  type="text" 
                                  required
                                  maxLength={5}
                                  value={paymentForm.expiry}
                                  onChange={e => setPaymentForm(prev => ({ ...prev, expiry: e.target.value }))}
                                  className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none text-xs focus:ring-1 focus:ring-black font-mono"
                                  placeholder="MM/YY"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-[#e3e3e3]">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddPayment(false);
                                  setPaymentForm({ brand: 'Visa', last4: '', expiry: '' });
                                }}
                                className="px-3 py-1.5 border border-[#d1d1d1] rounded text-[10px] font-bold uppercase font-mono hover:bg-slate-100 transition-colors"
                              >
                                CANCEL
                              </button>
                              <button
                                type="submit"
                                className="px-3.5 py-1.5 bg-black text-white rounded text-[10px] font-bold uppercase font-mono hover:bg-black/95 transition-colors shadow-sm"
                              >
                                CREATE CARD
                              </button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>

                      {(!selectedCustomer?.savedPayments || selectedCustomer.savedPayments.length === 0) ? (
                        <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <CreditCard size={24} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-xs font-mono text-[#616161]">No registered payment tokens or credit cards linked under this workspace profile.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedCustomer.savedPayments.map((payment) => (
                            <div key={payment.id} className="border border-[#e3e3e3] rounded-xl p-4.5 bg-white shadow-xs flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-12 bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center rounded-lg font-mono text-[10px] font-extrabold uppercase">
                                  {payment.brand.slice(0, 4)}
                                </div>
                                <div className="text-xs">
                                  <p className="font-bold text-slate-900 leading-snug">•••• •••• •••• {payment.last4}</p>
                                  <span className="text-[10px] text-[#616161] font-mono uppercase tracking-wider">Expires: {payment.expiry}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeletePayment(payment.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition-colors focus:outline-none"
                                title="Remove Payment Card"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {profileTab === 'returns' && selectedCustomer && (
                    <motion.div
                      key="returns-tab"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-6"
                    >
                      {/* Top Header & CTA */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f1f1f1]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-slate-100 text-slate-900 rounded-lg">
                              <RotateCcw size={16} />
                            </span>
                            <h4 className="text-base font-bold text-slate-900">
                              Customer Returns & Restocked Merchandise
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {customerReturns.length} {customerReturns.length === 1 ? 'Return' : 'Returns'}
                            </span>
                          </div>
                          <p className="text-xs text-[#616161] mt-1">
                            Review RMA claims, warranty diagnostics, and individual items returned by {selectedCustomer.name}.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate('/admin/returns')}
                            className="px-3 py-1.5 border border-[#d1d1d1] hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <ExternalLink size={13} />
                            <span>Returns Hub</span>
                          </button>
                          <button
                            type="button"
                            onClick={openLogReturnModal}
                            className="bg-black hover:bg-black/90 active:scale-98 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                          >
                            <Plus size={13} />
                            <span>Log New Return</span>
                          </button>
                        </div>
                      </div>

                      {/* 4 Summary Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-50 border border-[#e3e3e3] rounded-xl p-3.5">
                          <span className="text-[10px] font-mono font-extrabold uppercase text-[#616161] tracking-wider block">
                            Total Returns
                          </span>
                          <div className="mt-1 flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-slate-900 font-mono">
                              {customerReturns.length}
                            </span>
                            <span className="text-[11px] font-medium text-[#616161]">
                              {customerReturns.length === 1 ? 'ticket' : 'tickets'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#616161] mt-1 block">
                            Logged in RMA system
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-[#e3e3e3] rounded-xl p-3.5">
                          <span className="text-[10px] font-mono font-extrabold uppercase text-[#616161] tracking-wider block">
                            Returned Items
                          </span>
                          <div className="mt-1 flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-slate-900 font-mono">
                              {totalReturnedItemsCount}
                            </span>
                            <span className="text-[11px] font-medium text-[#616161]">
                              {totalReturnedItemsCount === 1 ? 'unit' : 'units'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#616161] mt-1 block">
                            Physical units returned
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-[#e3e3e3] rounded-xl p-3.5">
                          <span className="text-[10px] font-mono font-extrabold uppercase text-[#616161] tracking-wider block">
                            Total Refund Value
                          </span>
                          <div className="mt-1">
                            <span className="text-lg font-black text-slate-900 font-mono">
                              ${totalRefundedAmount.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-[#616161] font-mono ml-1">JMD</span>
                          </div>
                          <span className="text-[10px] text-[#616161] mt-1 block">
                            Approved & processed refunds
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-[#e3e3e3] rounded-xl p-3.5">
                          <span className="text-[10px] font-mono font-extrabold uppercase text-[#616161] tracking-wider block">
                            Return Frequency
                          </span>
                          <div className="mt-1 flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-slate-900 font-mono">
                              {selectedCustomer && selectedCustomer.orders > 0
                                ? Math.min(100, Math.round((customerReturns.length / selectedCustomer.orders) * 100))
                                : 0}%
                            </span>
                          </div>
                          <span className="text-[10px] text-[#616161] mt-1 block">
                            Of {selectedCustomer.orders || 0} total customer orders
                          </span>
                        </div>
                      </div>

                      {/* Sub-view Switcher (Items vs Full RMA Tickets) */}
                      <div className="flex items-center justify-between border-b border-[#e3e3e3] pb-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setReturnSubTab('items')}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                              returnSubTab === 'items'
                                ? "bg-slate-900 text-white shadow-xs"
                                : "text-[#616161] hover:text-[#1a1a1a] hover:bg-slate-100"
                            )}
                          >
                            <Package size={13} />
                            <span>Returned Items Breakdown</span>
                            <span className={cn(
                              "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                              returnSubTab === 'items' ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700"
                            )}>
                              {totalReturnedItemsCount}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setReturnSubTab('requests')}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                              returnSubTab === 'requests'
                                ? "bg-slate-900 text-white shadow-xs"
                                : "text-[#616161] hover:text-[#1a1a1a] hover:bg-slate-100"
                            )}
                          >
                            <FileText size={13} />
                            <span>RMA Return Tickets</span>
                            <span className={cn(
                              "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                              returnSubTab === 'requests' ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700"
                            )}>
                              {customerReturns.length}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Empty State when no returns */}
                      {customerReturns.length === 0 ? (
                        <div className="text-center py-14 px-4 bg-slate-50/50 rounded-xl border border-dashed border-[#e3e3e3]">
                          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                            <RotateCcw size={20} />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mb-1">No Returns On File</h4>
                          <p className="text-xs text-[#616161] max-w-md mx-auto mb-4">
                            {selectedCustomer.name} currently has zero return requests or defective hardware claims. All fulfilled equipment is active without RMA requests.
                          </p>
                          <button
                            type="button"
                            onClick={openLogReturnModal}
                            className="bg-black hover:bg-black/90 active:scale-98 text-white px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all inline-flex items-center gap-2"
                          >
                            <Plus size={14} />
                            <span>LOG RETURN FOR THIS CUSTOMER</span>
                          </button>
                        </div>
                      ) : returnSubTab === 'items' ? (
                        /* Items Breakdown Tab */
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[11px] text-[#616161] font-mono px-1">
                            <span>SHOWING {returnedItemsList.length} RETURNED LINE {returnedItemsList.length === 1 ? 'ITEM' : 'ITEMS'}</span>
                            <span>AGGREGATED FROM {customerReturns.length} RMA TICKETS</span>
                          </div>

                          <div className="space-y-2.5">
                            {returnedItemsList.map((item, idx) => (
                              <div
                                key={`${item.rmaId}-${item.productId}-${idx}`}
                                className="p-4 bg-white border border-[#e3e3e3] rounded-xl hover:border-slate-400 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                              >
                                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                  <div className="w-11 h-11 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                                    <RotateCcw size={18} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <h5 className="text-sm font-bold text-slate-900 truncate">
                                        {item.productName}
                                      </h5>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                        Qty: {item.quantity} {item.quantity === 1 ? 'Unit' : 'Units'} Returned
                                      </span>
                                      {item.sku && (
                                        <span className="text-[10px] font-mono text-[#616161] bg-slate-50 px-1.5 py-0.5 rounded border border-[#eaeaea]">
                                          SKU: {item.sku}
                                        </span>
                                      )}
                                    </div>

                                    {/* Reason & Condition */}
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#616161] mt-1.5">
                                      <span className="text-slate-700 font-medium">
                                        <span className="text-[#888]">Reason:</span> {item.reason || 'Hardware warranty inspection'}
                                      </span>
                                    </div>

                                    {/* Metadata Strip */}
                                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#616161] mt-2 pt-2 border-t border-[#f5f5f5]">
                                      <span>RMA: <strong className="text-slate-800">{item.rmaId}</strong></span>
                                      <span>•</span>
                                      <span>Order: <strong className="text-slate-800">{item.orderId}</strong></span>
                                      <span>•</span>
                                      <span>Date: {item.date}</span>
                                      <span>•</span>
                                      <span className="text-slate-600">Condition: <span className="font-semibold text-slate-800">{item.condition}</span></span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex md:flex-col items-end justify-between md:justify-center shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-[#f1f1f1] gap-2">
                                  <div className="text-right">
                                    <span className="text-[10px] text-[#616161] font-mono uppercase block">Refund Value</span>
                                    <span className="text-sm font-black text-slate-900 font-mono">
                                      ${((Number(item.unitPrice) || 0) * (Number(item.quantity) || 1)).toLocaleString()} JMD
                                    </span>
                                    {Number(item.unitPrice) > 0 && Number(item.quantity) > 1 && (
                                      <span className="text-[10px] text-[#616161] font-mono block">
                                        (${Number(item.unitPrice).toLocaleString()} each)
                                      </span>
                                    )}
                                  </div>
                                  <span className={cn(
                                    "px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider",
                                    item.status === 'Restocked & Refunded' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                    item.status === 'Approved' ? "bg-blue-100 text-blue-800 border border-blue-200" :
                                    item.status === 'Rejected' ? "bg-red-100 text-red-800 border border-red-200" :
                                    "bg-amber-100 text-amber-800 border border-amber-200"
                                  )}>
                                    {item.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* Full RMA Tickets Tab */
                        <div className="space-y-3">
                          {customerReturns.map(rma => (
                            <div
                              key={rma.id}
                              className="p-4 bg-white border border-[#e3e3e3] rounded-xl hover:border-slate-400 transition-all space-y-3 shadow-2xs"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#f1f1f1]">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                                    <FileText size={15} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-xs font-black text-slate-900 font-mono">{rma.id}</h5>
                                      <span className="text-xs text-[#616161]">for Order <strong className="text-slate-800 font-mono">{rma.orderId}</strong></span>
                                    </div>
                                    <span className="text-[10px] text-[#616161] font-mono">
                                      Requested: {rma.requestedAt ? new Date(rma.requestedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recently'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                                    {rma.condition}
                                  </span>
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase",
                                    rma.status === 'Restocked & Refunded' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                    rma.status === 'Approved' ? "bg-blue-100 text-blue-800 border border-blue-200" :
                                    rma.status === 'Rejected' ? "bg-red-100 text-red-800 border border-red-200" :
                                    "bg-amber-100 text-amber-800 border border-amber-200"
                                  )}>
                                    {rma.status}
                                  </span>
                                </div>
                              </div>

                              {/* Items list inside this RMA */}
                              <div className="bg-slate-50/70 rounded-lg p-3 border border-[#ececec] space-y-2">
                                <span className="text-[10px] font-mono font-extrabold uppercase text-[#616161] tracking-wider block">
                                  Items In This Return
                                </span>
                                {(rma.items || []).map((it, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[#f1f1f1] last:border-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800">{it.productName}</span>
                                      <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-[#e5e5e5]">
                                        x{it.quantity}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-mono font-bold text-slate-900 text-xs">
                                        ${((Number(it.unitPrice) || 0) * (Number(it.quantity) || 1)).toLocaleString()} JMD
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {rma.notes && (
                                <p className="text-xs text-slate-600 bg-amber-50/60 border border-amber-100 p-2.5 rounded-lg italic">
                                  <strong className="not-italic text-amber-900 font-semibold font-mono text-[10px] uppercase block mb-0.5">Staff Notes:</strong>
                                  "{rma.notes}"
                                </p>
                              )}

                              <div className="flex items-center justify-between pt-2 border-t border-[#f1f1f1] text-xs">
                                <span className="text-[#616161] text-[11px]">Total Refund Authorized:</span>
                                <span className="font-black text-slate-900 font-mono text-sm">
                                  ${(Number(rma.refundAmount) || 0).toLocaleString()} JMD
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATION MODAL VIEW (Create Customer Profile) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-white border border-[#e3e3e3] rounded-2xl shadow-2xl overflow-hidden z-20 text-left text-xs"
            >
              <div className="p-5 border-b border-[#f1f1f1] flex justify-between items-center bg-slate-50">
                <h3 className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-wider font-mono">Create Customer Profile</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-md text-[#616161] transition-all focus:outline-none"
                >
                  <X size={15} />
                </button>
              </div>
              
              <form onSubmit={handleAddCustomerSubmit}>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-[#1a1a1a] font-bold mb-1">Full Name *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={newCustomer.name}
                      onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>

                  <div>
                    <label className="block text-[#1a1a1a] font-bold mb-1">Email Address *</label>
                    <input 
                      type="email"
                      required
                      placeholder="jane.doe@example.com"
                      value={newCustomer.email}
                      onChange={e => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[#1a1a1a] font-bold mb-1">Contact Phone</label>
                    <input 
                      type="text"
                      placeholder="+1 (876) 000-0000"
                      value={newCustomer.phone}
                      onChange={e => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[#1a1a1a] font-bold mb-1">Location Parish</label>
                    <input 
                      type="text"
                      placeholder="e.g. Kingston 10, St. Andrew"
                      value={newCustomer.location}
                      onChange={e => setNewCustomer(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#1a1a1a] font-bold mb-1">Initial Orders Count</label>
                      <input 
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newCustomer.orders}
                        onChange={e => setNewCustomer(prev => ({ ...prev, orders: Number(e.target.value) }))}
                        className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[#1a1a1a] font-bold mb-1">Spent Amount (JMD)</label>
                      <input 
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newCustomer.spent}
                        onChange={e => setNewCustomer(prev => ({ ...prev, spent: Number(e.target.value) }))}
                        className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-[#e3e3e3] flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-white border border-[#d1d1d1] text-[#1a1a1a] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#f6f6f6] active:scale-98 transition-all font-mono"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="bg-black text-white px-4.5 py-2 rounded-lg text-xs font-bold hover:bg-black/90 active:scale-98 transition-all shadow-sm font-mono"
                  >
                    SAVE PROFILE
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LOG RETURN MODAL VIEW */}
      <AnimatePresence>
        {showLogReturnModal && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogReturnModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-lg bg-white border border-[#e3e3e3] rounded-2xl shadow-2xl overflow-hidden z-20 text-left text-xs max-h-[90vh] flex flex-col"
            >
              <div className="p-4 border-b border-[#f1f1f1] flex justify-between items-center bg-slate-50 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-slate-900 text-white">
                    <RotateCcw size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#1a1a1a] uppercase tracking-wider font-mono">
                      Log Return Claim
                    </h3>
                    <p className="text-[10px] text-[#616161]">
                      Filing return for customer: <strong className="text-slate-800">{selectedCustomer.name}</strong>
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowLogReturnModal(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-md text-[#616161] transition-all focus:outline-none"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleLogReturnSubmit} className="flex flex-col flex-1 overflow-y-auto">
                <div className="p-5 space-y-4">
                  {/* Select Order */}
                  <div>
                    <label className="block text-[#1a1a1a] font-bold mb-1">Select Order *</label>
                    <select
                      value={logReturnForm.orderId}
                      onChange={e => handleOrderSelectForReturn(e.target.value)}
                      className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5 font-mono text-xs"
                    >
                      {customerOrders.length > 0 ? (
                        customerOrders.map(ord => (
                          <option key={ord.id} value={ord.id}>
                            {ord.id} - ${ord.total?.toLocaleString()} JMD ({ord.date || 'Order'})
                          </option>
                        ))
                      ) : (
                        <option value="#MANUAL">Manual Customer Order</option>
                      )}
                    </select>
                  </div>

                  {/* Product Name & SKU */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[#1a1a1a] font-bold mb-1">Returned Product Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Must Solar 5kW Hybrid Inverter 48V"
                        value={logReturnForm.productName}
                        onChange={e => setLogReturnForm(prev => ({ ...prev, productName: e.target.value }))}
                        className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5"
                      />
                    </div>
                    <div>
                      <label className="block text-[#1a1a1a] font-bold mb-1">Product SKU</label>
                      <input
                        type="text"
                        placeholder="e.g. MS-5048"
                        value={logReturnForm.sku}
                        onChange={e => setLogReturnForm(prev => ({ ...prev, sku: e.target.value }))}
                        className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5 font-mono"
                      />
                    </div>
                  </div>

                  {/* Quantity, Unit Price & Total Refund */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[#1a1a1a] font-bold mb-1">Qty Returned</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={logReturnForm.quantity}
                        onChange={e => {
                          const q = Math.max(1, Number(e.target.value));
                          setLogReturnForm(prev => ({
                            ...prev,
                            quantity: q,
                            refundAmount: q * prev.unitPrice
                          }));
                        }}
                        className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[#1a1a1a] font-bold mb-1">Unit Price (JMD)</label>
                      <input
                        type="number"
                        min="0"
                        value={logReturnForm.unitPrice}
                        onChange={e => {
                          const p = Math.max(0, Number(e.target.value));
                          setLogReturnForm(prev => ({
                            ...prev,
                            unitPrice: p,
                            refundAmount: p * prev.quantity
                          }));
                        }}
                        className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[#1a1a1a] font-bold mb-1">Refund Total (JMD)</label>
                      <input
                        type="number"
                        min="0"
                        value={logReturnForm.refundAmount}
                        onChange={e => setLogReturnForm(prev => ({ ...prev, refundAmount: Number(e.target.value) }))}
                        className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5 font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Condition & Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#1a1a1a] font-bold mb-1">Item Condition</label>
                      <select
                        value={logReturnForm.condition}
                        onChange={e => setLogReturnForm(prev => ({ ...prev, condition: e.target.value as ReturnRequest['condition'] }))}
                        className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5 text-xs"
                      >
                        <option value="Defective on Arrival">Defective on Arrival</option>
                        <option value="Unopened / New">Unopened / New</option>
                        <option value="Damaged Shipping">Damaged Shipping</option>
                        <option value="Opened / Used">Opened / Used</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#1a1a1a] font-bold mb-1">Return Status</label>
                      <select
                        value={logReturnForm.status}
                        onChange={e => setLogReturnForm(prev => ({ ...prev, status: e.target.value as ReturnRequest['status'] }))}
                        className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5 text-xs font-bold"
                      >
                        <option value="Restocked & Refunded">Restocked & Refunded</option>
                        <option value="Approved">Approved</option>
                        <option value="Requested">Requested (Pending)</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  {/* Reason for Return */}
                  <div>
                    <label className="block text-[#1a1a1a] font-bold mb-1">Reason for Return</label>
                    <input
                      type="text"
                      placeholder="e.g. Inverter fault, upgraded capacity, damaged carton"
                      value={logReturnForm.reason}
                      onChange={e => setLogReturnForm(prev => ({ ...prev, reason: e.target.value }))}
                      className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>

                  {/* Internal Notes */}
                  <div>
                    <label className="block text-[#1a1a1a] font-bold mb-1">Staff / Diagnostic Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Technician inspection details, warranty reference number, restock location..."
                      value={logReturnForm.notes}
                      onChange={e => setLogReturnForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full bg-white border border-[#d1d1d1] rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black/5 resize-none"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-[#e3e3e3] flex justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowLogReturnModal(false)}
                    className="bg-white border border-[#d1d1d1] text-[#1a1a1a] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#f6f6f6] active:scale-98 transition-all font-mono"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="bg-black text-white px-4.5 py-2 rounded-lg text-xs font-bold hover:bg-black/90 active:scale-98 transition-all shadow-sm font-mono flex items-center gap-1.5"
                  >
                    <RotateCcw size={13} />
                    <span>SAVE RETURN RECORD</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
