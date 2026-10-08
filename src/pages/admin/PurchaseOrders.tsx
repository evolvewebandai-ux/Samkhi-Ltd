import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Building2, 
  Package, 
  DollarSign, 
  X,
  Truck
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../../firebase';
import { useProducts } from '../../context/ProductContext';
import { showToast } from '../../lib/toast';
import { logActivity } from '../../lib/audit';
import { Supplier } from './Suppliers';

export interface POLineItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Received' | 'Cancelled';
  items: POLineItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  totalCost: number;
  expectedDeliveryDate: string;
  notes?: string;
  createdAt: string;
}

export default function AdminPurchaseOrders() {
  const { products, updateProduct } = useProducts();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poNumber, setPoNumber] = useState(`PO-${Math.floor(100000 + Math.random() * 900000)}`);
  const [expectedDate, setExpectedDate] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [poItems, setPoItems] = useState<POLineItem[]>([]);

  // Item selector helpers
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState(10);
  const [itemUnitCost, setItemUnitCost] = useState(0);

  useEffect(() => {
    const unsubPO = onSnapshot(collection(db, 'purchase_orders'), (snapshot) => {
      const items: PurchaseOrder[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        items.push({ id: docSnap.id, ...data, items: data.items || [] } as PurchaseOrder);
      });
      setPurchaseOrders(items);
      setLoading(false);
    }, (err) => {
      console.warn("Firestore PO fetch warning:", err);
      setLoading(false);
    });

    const unsubSup = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      const sups: Supplier[] = [];
      snapshot.forEach(docSnap => {
        sups.push({ id: docSnap.id, ...docSnap.data() } as Supplier);
      });
      setSuppliers(sups);
    });

    return () => {
      unsubPO();
      unsubSup();
    };
  }, []);

  const openCreateModal = () => {
    setPoNumber(`PO-${Math.floor(100000 + Math.random() * 900000)}`);
    setSelectedSupplierId(suppliers[0]?.id || '');
    const date = new Date();
    date.setDate(date.getDate() + 14);
    setExpectedDate(date.toISOString().slice(0, 10));
    setShippingCost(0);
    setNotes('');
    setPoItems([]);
    setShowModal(true);
  };

  const addItemToPO = () => {
    if (!selectedProductId) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    // Check if already in list
    if (poItems.some(i => i.productId === prod.id)) {
      showToast("Product is already added to PO list", "warning");
      return;
    }

    setPoItems([...poItems, {
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku || prod.id,
      quantity: Number(itemQty) || 1,
      unitCost: Number(itemUnitCost) || Math.round(prod.price * 0.6) // default ~60% cost margin
    }]);

    setSelectedProductId('');
    setItemQty(10);
    setItemUnitCost(0);
  };

  const removeItemFromPO = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      showToast("Please select a supplier", "warning");
      return;
    }
    if (poItems.length === 0) {
      showToast("Add at least one line item to the PO", "warning");
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    const subtotal = poItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const tax = Math.round(subtotal * 0.15); // 15% GCT
    const totalCost = subtotal + tax + (Number(shippingCost) || 0);

    const poId = `po_${Date.now()}`;
    const payload: PurchaseOrder = cleanUndefined({
      id: poId,
      poNumber,
      supplierId: selectedSupplierId,
      supplierName: supplier ? supplier.name : 'Unknown Supplier',
      status: 'Sent',
      items: poItems,
      subtotal,
      tax,
      shippingCost: Number(shippingCost) || 0,
      totalCost,
      expectedDeliveryDate: expectedDate,
      notes,
      createdAt: new Date().toISOString()
    });

    try {
      await setDoc(doc(db, 'purchase_orders', poId), payload);
      await logActivity(`Created Purchase Order #${poNumber} for ${supplier?.name}`);
      showToast(`Purchase Order #${poNumber} created and saved!`, "success");
      setShowModal(false);
    } catch (err: any) {
      console.error("Error creating PO:", err);
      showToast(err?.message || "Failed to create Purchase Order", "error");
    }
  };

  const updatePOStatus = async (po: PurchaseOrder, newStatus: PurchaseOrder['status']) => {
    try {
      await updateDoc(doc(db, 'purchase_orders', po.id), { status: newStatus });
      await logActivity(`Updated PO #${po.poNumber} status to ${newStatus}`);

      // If status changed to Received, offer to restock product quantities
      if (newStatus === 'Received') {
        let restockedCount = 0;
        for (const item of (po.items || [])) {
          const prod = products.find(p => p.id === item.productId);
          if (prod) {
            const newStock = (prod.inventory || 0) + item.quantity;
            await updateProduct(prod.id, { inventory: newStock, inStock: newStock > 0 });
            restockedCount += item.quantity;
          }
        }
        showToast(`PO #${po.poNumber} received! Restocked ${restockedCount} units across catalog.`, "success");
      } else {
        showToast(`PO #${po.poNumber} status set to ${newStatus}`, "info");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to update PO status", "error");
    }
  };

  const filteredPOs = purchaseOrders.filter(po =>
    (po.poNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (po.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 space-y-6 bg-surface">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest font-sans flex items-center gap-1.5 mb-1">
            <FileText size={14} />
            Procurement & Purchase Orders
          </span>
          <h1 className="text-3xl font-display font-black text-secondary tracking-tight">Purchase Orders</h1>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm shadow transition-all cursor-pointer"
        >
          <Plus size={16} />
          Create Purchase Order
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card flex items-center gap-3">
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search POs by PO number or supplier name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full text-sm outline-none bg-transparent"
        />
      </div>

      {/* PO Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading purchase orders...</div>
      ) : filteredPOs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <FileText size={36} className="mx-auto text-slate-300" />
          <p className="font-semibold text-slate-600">No purchase orders found</p>
          <p className="text-xs">Create POs to track equipment restocks and vendor fulfillments.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">PO Number</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Line Items</th>
                  <th className="p-4">Expected Delivery</th>
                  <th className="p-4">Total Cost (JMD)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPOs.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900">{po.poNumber}</td>
                    <td className="p-4 font-bold text-slate-800">{po.supplierName}</td>
                    <td className="p-4 text-slate-600 font-medium">
                      {(po.items || []).length} items ({(po.items || []).reduce((s, i) => s + i.quantity, 0)} units)
                    </td>
                    <td className="p-4 font-mono text-slate-600">{po.expectedDeliveryDate || 'N/A'}</td>
                    <td className="p-4 font-mono font-bold text-slate-900">${po.totalCost?.toLocaleString()} JMD</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        po.status === 'Received' ? 'bg-emerald-100 text-emerald-800' :
                        po.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                        po.status === 'Sent' ? 'bg-purple-100 text-purple-800' :
                        po.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setViewingPO(po)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded cursor-pointer"
                      >
                        View
                      </button>
                      {po.status !== 'Received' && (
                        <button
                          onClick={() => updatePOStatus(po, 'Received')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded cursor-pointer"
                        >
                          Mark Received
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Create New Purchase Order</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">PO Number</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={e => setPoNumber(e.target.value)}
                    className="w-full text-xs h-[38px] border rounded px-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Select Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className="w-full text-xs h-[38px] border rounded px-2.5 font-semibold"
                  >
                    <option value="">-- Choose Vendor --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={e => setExpectedDate(e.target.value)}
                    className="w-full text-xs h-[38px] border rounded px-2.5"
                  />
                </div>
              </div>

              {/* Add Items Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Add Equipment Line Items</h4>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <select
                      value={selectedProductId}
                      onChange={e => {
                        setSelectedProductId(e.target.value);
                        const p = products.find(prod => prod.id === e.target.value);
                        if (p) setItemUnitCost(Math.round(p.price * 0.6));
                      }}
                      className="w-full text-xs h-[36px] border rounded px-2 bg-white"
                    >
                      <option value="">-- Select Catalog Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (${p.price.toLocaleString()} JMD)</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Qty"
                      min={1}
                      value={itemQty}
                      onChange={e => setItemQty(Number(e.target.value))}
                      className="w-full text-xs h-[36px] border rounded px-2 bg-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Unit Cost (JMD)"
                      value={itemUnitCost}
                      onChange={e => setItemUnitCost(Number(e.target.value))}
                      className="w-full text-xs h-[36px] border rounded px-2 bg-white font-mono"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={addItemToPO}
                      className="w-full h-[36px] bg-blue-600 text-white font-bold rounded flex items-center justify-center cursor-pointer"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {poItems.length > 0 && (
                  <div className="space-y-1.5 pt-2 divide-y divide-slate-200">
                    {poItems.map((item, idx) => (
                      <div key={idx} className="pt-1.5 flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800">{item.productName} × {item.quantity} units</span>
                        <div className="flex items-center gap-3 font-mono">
                          <span>${(item.quantity * item.unitCost).toLocaleString()} JMD</span>
                          <button type="button" onClick={() => removeItemFromPO(idx)} className="text-red-500 hover:text-red-700 cursor-pointer">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Estimated Shipping / Customs Freight (JMD)</label>
                <input
                  type="number"
                  value={shippingCost}
                  onChange={e => setShippingCost(Number(e.target.value))}
                  className="w-full text-xs h-[38px] border rounded px-2.5 font-mono"
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
                  Submit Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View PO Detail Modal */}
      {viewingPO && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 block">{viewingPO.poNumber}</span>
                <h3 className="text-lg font-bold text-slate-900">{viewingPO.supplierName}</h3>
              </div>
              <button onClick={() => setViewingPO(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p>Status: <span className="font-bold uppercase text-blue-600">{viewingPO.status}</span></p>
              <p>Expected Delivery: <span className="font-mono">{viewingPO.expectedDeliveryDate || 'N/A'}</span></p>

              <div className="border-t pt-2 space-y-1">
                <h4 className="font-bold text-slate-900 mb-1">Items Included:</h4>
                {(viewingPO.items || []).map((it, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-slate-100">
                    <span>{it.productName} (×{it.quantity})</span>
                    <span className="font-mono">${(it.quantity * it.unitCost).toLocaleString()} JMD</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 space-y-1 font-mono text-slate-800">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${viewingPO.subtotal?.toLocaleString()} JMD</span>
                </div>
                <div className="flex justify-between">
                  <span>GCT (15%):</span>
                  <span>${viewingPO.tax?.toLocaleString()} JMD</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>${viewingPO.shippingCost?.toLocaleString()} JMD</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t">
                  <span>Total Cost:</span>
                  <span>${viewingPO.totalCost?.toLocaleString()} JMD</span>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t">
              <button
                onClick={() => setViewingPO(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
