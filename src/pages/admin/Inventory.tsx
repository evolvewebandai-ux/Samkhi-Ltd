import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../../context/ProductContext';
import { useInventory } from '../../context/InventoryContext';
import { showToast } from '../../lib/toast';
import { logActivity } from '../../lib/audit';
import { 
  Search, 
  Plus, 
  Minus, 
  AlertTriangle, 
  Check, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Package, 
  Boxes, 
  Layers,
  Sparkles,
  Info,
  Calendar,
  Users,
  Building,
  FileDown,
  X,
  ArrowUpDown,
  ClipboardList,
  ChevronRight,
  Filter,
  CheckCircle,
  Truck,
  Edit2,
  Trash2,
  PlusCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Product, 
  ProductVariant, 
  InventoryLevel, 
  InventoryTransaction, 
  Supplier, 
  PurchaseOrder, 
  PurchaseOrderItem, 
  InventoryTransactionType, 
  InventoryReferenceType 
} from '../../types';

// Pagination component helper
function Pagination({ 
  totalItems, 
  itemsPerPage, 
  currentPage, 
  onChangePage 
}: { 
  totalItems: number; 
  itemsPerPage: number; 
  currentPage: number; 
  onChangePage: (page: number) => void; 
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-between items-center px-4 py-3 border-t border-slate-200 bg-white">
      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold">{Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}</span> to{" "}
        <span className="font-semibold">{Math.min(totalItems, currentPage * itemsPerPage)}</span> of{" "}
        <span className="font-semibold">{totalItems}</span> items
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onChangePage(currentPage - 1)}
          className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Previous
        </button>
        {Array.from({ length: totalPages }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onChangePage(idx + 1)}
            className={cn(
              "px-3 py-1 rounded text-xs font-semibold font-mono",
              currentPage === idx + 1
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-55"
            )}
          >
            {idx + 1}
          </button>
        ))}
        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onChangePage(currentPage + 1)}
          className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function AdminInventory() {
  const { products, removeProduct } = useProducts();
  const {
    inventoryLevels,
    transactions,
    suppliers,
    purchaseOrders,
    purchaseOrderItems,
    bulkAdjustLevels,
    performPhysicalCount,
    addSupplier,
    updateSupplier,
    createPurchaseOrder,
    updatePurchaseOrder,
    receivePurchaseOrder,
    deleteInventoryLevel
  } = useInventory();

  // Active Workspace Tab System
  const [activeTab, setActiveTab] = useState<'levels' | 'purchase_orders' | 'suppliers'>('levels');

  // Interactive controls
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out' | 'in' | 'incoming'>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortField, setSortField] = useState<keyof InventoryLevel>('quantityOnHand');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected row tracking for Bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Modals / forms visible trigger
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showBulkCountModal, setShowBulkCountModal] = useState(false);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showReceivePOModal, setShowReceivePOModal] = useState<string | null>(null);

  // Quick feedback saving helper status keyed by item level IDs
  const [savingStates, setSavingStates] = useState<Record<string, 'saving' | 'saved' | null>>({});

  // Single Adjust Form Temp State
  const [adjustForm, setAdjustForm] = useState({
    lvlId: '',
    delta: 1,
    type: 'adjusted' as InventoryTransactionType,
    notes: ''
  });

  // Bulk stock count temporary counts state (mapped levelId -> count)
  const [bCountDrafts, setBCountDrafts] = useState<Record<string, number>>({});
  const [bCountNotes, setBCountNotes] = useState('');

  // Create Supplier Temp State
  const [supForm, setSupForm] = useState<Partial<Supplier>>({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    leadTimeDays: 7,
    notes: '',
    isActive: true
  });
  const [editingSupId, setEditingSupId] = useState<string | null>(null);

  // Create PO Temp State
  const [poForm, setPoForm] = useState({
    supplierId: '',
    expectedDays: 7,
    notes: ''
  });
  const [poLinesDraft, setPoLinesDraft] = useState<{ productId: string; variantId?: string; quantityOrdered: number; unitCost: number }[]>([]);

  // Receive PO Dynamic Receipt temp count State (lineItemId -> incremental count)
  const [receivePoDraft, setReceivePoDraft] = useState<Record<string, number>>({});

  // Sorting Handler
  const handleSort = (field: keyof InventoryLevel) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Inline Quick adjuster (immediate firestore saves)
  const handleInlineAdjust = async (level: InventoryLevel, delta: number) => {
    setSavingStates(prev => ({ ...prev, [level.id]: 'saving' }));
    try {
      await bulkAdjustLevels([{
        id: level.id,
        delta,
        notes: 'Quick manual slider adjustment.',
        type: delta >= 0 ? 'adjusted' : 'adjusted',
        refType: 'adjustment'
      }]);
      setSavingStates(prev => ({ ...prev, [level.id]: 'saved' }));
      setTimeout(() => {
        setSavingStates(prev => ({ ...prev, [level.id]: null }));
      }, 1500);
    } catch (err) {
      console.error(err);
      setSavingStates(prev => ({ ...prev, [level.id]: null }));
    }
  };

  // CSV Export implementation
  const handleCSVExport = () => {
    const headers = ['Product Title', 'Brand', 'Tag/Collection', 'SKU/Code', 'On Hand', 'Reserved', 'Available', 'Incoming', 'Reorder Point', 'Status'];
    const rows = filteredLevels.map(lvl => {
      const prod = products.find(p => p.id === lvl.productId);
      const variant = prod?.variants?.find(v => v.id === lvl.variantId);
      
      const sku = lvl.variantId ? (variant?.sku || `${prod?.id}_${variant?.id}`) : (prod?.id || '');
      const prodName = lvl.variantId ? `${prod?.name || ''} (${variant?.title || ''})` : (prod?.name || '');
      
      let statusStr = 'Healthy';
      if (lvl.quantityAvailable <= 0) statusStr = 'Out of Stock';
      else if (lvl.quantityAvailable <= lvl.lowStockThreshold) statusStr = 'Low Stock';
      else if (lvl.quantityIncoming > 0) statusStr = 'Incoming';

      return [
        prodName,
        prod?.brand || 'Samkhi',
        prod?.tags?.join(', ') || 'General',
        sku,
        lvl.quantityOnHand,
        lvl.quantityReserved,
        lvl.quantityAvailable,
        lvl.quantityIncoming,
        lvl.reorderPoint,
        statusStr
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("id", "inventory_csv_downloader");
    link.setAttribute("download", `samkhi_warehouse_levels_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper resolvers
  const getProductDetails = (productId: string, variantId?: string) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return { name: 'Unknown Item', brand: 'Samkhi', imageUrl: '', sku: productId };
    
    if (variantId && p.variants) {
      const v = p.variants.find(varnt => varnt.id === variantId);
      return {
        name: `${p.name} - ${v?.title || 'Variant'}`,
        brand: p.brand || 'Samkhi',
        imageUrl: p.imageUrl,
        sku: v?.sku || `${p.id}-${v?.id}`
      };
    }
    
    return {
      name: p.name,
      brand: p.brand || 'Samkhi',
      imageUrl: p.imageUrl,
      sku: p.id
    };
  };

  const getCostPrice = (productId: string, variantId?: string) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return 0;
    if (variantId && p.variants) {
      const v = p.variants.find(varnt => varnt.id === variantId);
      return v?.costPrice || Math.round(v?.price || p.price * 0.65);
    }
    return p.costPrice || Math.round(p.price * 0.65);
  };

  // STATS CARD CALCULATIONS
  const totalSKUs = inventoryLevels.length;
  const totalUnits = inventoryLevels.reduce((sum, lvl) => sum + (lvl.quantityOnHand || 0), 0);
  
  const totalAssetValuation = inventoryLevels.reduce((sum, lvl) => {
    const cost = getCostPrice(lvl.productId, lvl.variantId);
    return sum + (lvl.quantityOnHand * cost);
  }, 0);

  const lowStockCount = inventoryLevels.filter(lvl => lvl.quantityAvailable > 0 && lvl.quantityAvailable <= lvl.lowStockThreshold).length;
  const outOfStockCount = inventoryLevels.filter(lvl => lvl.quantityAvailable <= 0).length;
  const totalIncomingUnits = inventoryLevels.reduce((sum, lvl) => sum + (lvl.quantityIncoming || 0), 0);

  // FILTERING LOGIC
  const categoriesList = ['All', ...Array.from(new Set(products.flatMap(p => p.tags || [])))];

  const filteredLevels = inventoryLevels.filter(lvl => {
    const prod = products.find(p => p.id === lvl.productId);
    const varnt = prod?.variants?.find(v => v.id === lvl.variantId);
    const skuCode = (lvl.variantId ? varnt?.sku : prod?.id) || '';
    const details = getProductDetails(lvl.productId, lvl.variantId);

    const matchesSearch = details.name.toLowerCase().includes(search.toLowerCase()) || 
                          skuCode.toLowerCase().includes(search.toLowerCase()) ||
                          details.brand.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || prod?.tags?.includes(categoryFilter);

    let matchesStatus = true;
    if (filter === 'low') {
      matchesStatus = lvl.quantityAvailable > 0 && lvl.quantityAvailable <= lvl.lowStockThreshold;
    } else if (filter === 'out') {
      matchesStatus = lvl.quantityAvailable <= 0;
    } else if (filter === 'in') {
      matchesStatus = lvl.quantityAvailable > lvl.lowStockThreshold;
    } else if (filter === 'incoming') {
      matchesStatus = (lvl.quantityIncoming || 0) > 0;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // SORTING LOGIC
  const sortedLevels = [...filteredLevels].sort((a, b) => {
    let valA: any = a[sortField] ?? 0;
    let valB: any = b[sortField] ?? 0;

    // String sorting helper
    if (typeof valA === 'string') {
      return sortAsc 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    }

    return sortAsc ? valA - valB : valB - valA;
  });

  // PAGINATION WINDOW
  const paginatedLevels = sortedLevels.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // SINGLE ADJUST SUBMIT
  const handleSingleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.lvlId) return;

    try {
      await bulkAdjustLevels([{
        id: adjustForm.lvlId,
        delta: adjustForm.delta,
        notes: adjustForm.notes || 'Manual custom stock adjustments tab input.',
        type: adjustForm.type,
        refType: 'adjustment'
      }]);
      await logActivity(`Adjusted stock level for identifier "${adjustForm.lvlId}" (Change delta: ${adjustForm.delta}, Type: ${adjustForm.type})`);
      showToast(`Stock level successfully adjusted!`, 'success');
      setShowAdjustModal(false);
      setAdjustForm({ lvlId: '', delta: 1, type: 'adjusted', notes: '' });
    } catch (err: any) {
      showToast(`Error logging changes to database: ${err.message}`, 'error');
    }
  };

  // BULK STOCK PHYSICAL CORRECTION SAVE
  const handleBulkCountSubmit = async () => {
    const list = Object.entries(bCountDrafts).map(([id, count]) => ({
      id,
      count,
      notes: bCountNotes || 'Periodic physical floor inventory stock count update.'
    }));

    if (list.length === 0) return;

    try {
      await performPhysicalCount(list);
      await logActivity(`Logged bulk physical floor stock inventory update for key IDs: [${list.map(l => l.id).join(', ')}]`);
      showToast("Physical inventory count has been applied to warehouse shelves!", "success");
      setShowBulkCountModal(false);
      setBCountDrafts({});
      setBCountNotes('');
      setSelectedIds([]);
    } catch (er: any) {
      showToast(`Verification count write failure: ${er.message}`, 'error');
    }
  };

  // CREATE SUPPLIER SUBMIT
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supForm.name) return;

    const targetId = editingSupId || 'sup_' + Date.now();
    const newSupplier = {
      ...supForm,
      id: targetId,
    } as Supplier;

    try {
      await addSupplier(newSupplier);
      await logActivity(`${editingSupId ? 'Updated' : 'Registered new'} supplier partner: ${newSupplier.name}`);
      showToast(`Supplier ${newSupplier.name} saved successfully!`, 'success');
      setShowSupplierModal(false);
      setSupForm({ name: '', contactName: '', email: '', phone: '', address: '', leadTimeDays: 7, notes: '', isActive: true });
      setEditingSupId(null);
    } catch (er: any) {
      showToast(`Error saving supplier information: ${er.message}`, 'error');
    }
  };

  // CREATE PURCHASE ORDER FORM SUBMIT
  const handleCreatePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.supplierId || poLinesDraft.length === 0) {
      showToast("Please supply a vendor and include at least one product intake spec line.", 'warning');
      return;
    }

    const orderDate = new Date().toISOString().split('T')[0];
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + parseInt(poForm.expectedDays.toString() || '7'));

    const poHeader = {
      supplierId: poForm.supplierId,
      status: 'sent' as const, // Automatically transitions to Sent upon release for clean processing
      orderDate,
      expectedDeliveryDate: expDate.toISOString().split('T')[0],
      notes: poForm.notes,
      createdBy: 'System Warehouse'
    };

    try {
      const newPoId = await createPurchaseOrder(poHeader, poLinesDraft);
      await logActivity(`Created Purchase Order PO-${newPoId} to supplier ${poForm.supplierId}`);
      showToast(`Purchase order PO-${newPoId} successfully registered and dispatched!`, 'success');
      setShowCreatePOModal(false);
      setPoForm({ supplierId: '', expectedDays: 7, notes: '' });
      setPoLinesDraft([]);
    } catch (er: any) {
      console.error(er);
      showToast(`Error registering purchase order: ${er.message}`, 'error');
    }
  };

  // INTAKE MODAL SUBMIT
  const handleReceivePOSubmit = async (poId: string) => {
    const receipts = Object.entries(receivePoDraft).map(([itemId, quantityReceived]) => ({
      itemId,
      quantityReceived
    }));

    if (receipts.length === 0) {
      showToast("Specify received quantities.", 'warning');
      return;
    }

    try {
      await receivePurchaseOrder(poId, receipts);
      await logActivity(`Received intake products for Purchase Order ${poId}`);
      showToast(`Intake quantities successfully logged and loaded to active inventory!`, 'success');
      setShowReceivePOModal(null);
      setReceivePoDraft({});
    } catch (er: any) {
      console.error(er);
      showToast(`Intake receipt registration failed: ${er.message}`, 'error');
    }
  };

  const handleDeleteLevel = async (lvl: InventoryLevel) => {
    const hasProduct = products.some(p => p.id === lvl.productId);
    const details = getProductDetails(lvl.productId, lvl.variantId);
    
    if (hasProduct) {
      if (!window.confirm(`Are you absolutely sure you want to delete "${details.name}"? This is linked to a live product and will permanently remove the product and its associated stock level across the board, subject to order constraints.`)) {
        return;
      }
      try {
        await removeProduct(lvl.productId);
      } catch (err: any) {
        console.error("Failed to delete product from inventory view:", err);
      }
    } else {
      if (!window.confirm(`This inventory level for ID "${lvl.productId}" is orphaned (no matching product exists). Would you like to clean it up?`)) {
        return;
      }
      try {
        await deleteInventoryLevel(lvl.id);
        await logActivity(`Cleaned up orphaned inventory level ${lvl.id} for missing product ${lvl.productId}`);
        showToast("Orphaned inventory level cleaned up successfully.", "success");
      } catch (err: any) {
        showToast(`Failure deleting level: ${err.message}`, "error");
      }
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto space-y-8" id="warehouse_workspace">
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes size={26} className="text-slate-900" />
            Kingston Central Warehouse
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Core Real-time Inventory Controller — Unified single placement log, automated SKU trackers, and intake purchase systems.
          </p>
        </div>

        {/* Global Tab Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('levels')}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5",
              activeTab === 'levels'
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Package size={14} />
            Stock Levels
          </button>
          <button
            onClick={() => setActiveTab('purchase_orders')}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5",
              activeTab === 'purchase_orders'
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <ClipboardList size={14} />
            Purchase Orders
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5",
              activeTab === 'suppliers'
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Building size={14} />
            Suppliers
          </button>
        </div>
      </div>

      {/* DASHBOARD INDICATOR SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Tracked SKUs */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Tracked SKUs</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1.5 flex items-baseline gap-1">
            {totalSKUs} <span className="text-[10px] text-slate-400 font-normal">items</span>
          </div>
        </div>

        {/* Total Stock Volume */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Stock Volume</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1.5 flex items-baseline gap-1">
            {totalUnits.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">units</span>
          </div>
        </div>

        {/* Valuation (JMD) */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Asset Value (JMD)</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1.5 flex items-baseline gap-1">
            ${totalAssetValuation.toLocaleString()}
          </div>
        </div>

        {/* Low Stock count (Yellow) */}
        <div className={cn(
          "rounded-xl p-4 border shadow-xs transition-colors",
          lowStockCount > 0 ? "bg-amber-50/50 border-amber-200 text-amber-900" : "bg-white border-slate-200/80"
        )}>
          <div className="text-[9px] font-bold uppercase tracking-widest font-mono text-slate-500">Low Stock SKUs</div>
          <div className="text-xl font-extrabold mt-1.5 flex items-baseline gap-1">
            {lowStockCount} <span className="text-[10px] font-normal text-slate-400">warn</span>
          </div>
        </div>

        {/* Out of stock count (Red) */}
        <div className={cn(
          "rounded-xl p-4 border shadow-xs transition-colors",
          outOfStockCount > 0 ? "bg-red-50/50 border-red-200 text-red-900" : "bg-white border-slate-200/80"
        )}>
          <div className="text-[9px] font-bold uppercase tracking-widest font-mono text-slate-500">Out of Stock</div>
          <div className="text-xl font-extrabold mt-1.5 flex items-baseline gap-1">
            {outOfStockCount} <span className="text-[10px] font-normal text-slate-400">zero</span>
          </div>
        </div>

        {/* Incoming count (Blue) */}
        <div className={cn(
          "rounded-xl p-4 border shadow-xs transition-colors",
          totalIncomingUnits > 0 ? "bg-blue-50/50 border-blue-200 text-blue-900" : "bg-white border-slate-200/80"
        )}>
          <div className="text-[9px] font-bold uppercase tracking-widest font-mono text-slate-500">Inbound (POs)</div>
          <div className="text-xl font-extrabold mt-1.5 flex items-baseline gap-1">
            +{totalIncomingUnits.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">shipt</span>
          </div>
        </div>
      </div>

      {/* QUICK WORKSPACE ACTIONS */}
      <div className="flex gap-2 flex-wrap bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setShowAdjustModal(true)}
          className="h-[42px] px-5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <Plus size={14} />
          Adjust Single stock
        </button>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={() => {
              // Preload select codes to bCount draft levels
              const drafts: Record<string, number> = {};
              selectedIds.forEach(id => {
                const lvl = inventoryLevels.find(l => l.id === id);
                if (lvl) drafts[id] = lvl.quantityOnHand;
              });
              setBCountDrafts(drafts);
              setShowBulkCountModal(true);
            }}
            className="h-[42px] px-5 bg-warning hover:bg-warning-hover text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <Check size={14} />
            Bulk Stocktake Count ({selectedIds.length})
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowCreatePOModal(true)}
          className="h-[42px] px-5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <ClipboardList size={14} className="text-slate-400" />
          Create Purchase Order
        </button>
        <button
          type="button"
          onClick={() => {
            setEditingSupId(null);
            setSupForm({ name: '', contactName: '', email: '', phone: '', address: '', leadTimeDays: 7, notes: '', isActive: true });
            setShowSupplierModal(true);
          }}
          className="h-[42px] px-5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <Building size={14} className="text-slate-400" />
          Register Supplier
        </button>
      </div>

      {/* VIEWPORT AREA CONTROLS */}
      {activeTab === 'levels' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Identify by Product title, brand, variant or SKU..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-white border border-slate-350 rounded-lg py-2 pl-9 pr-4 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category Dropdown */}
              <select
                value={categoryFilter}
                onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-slate-350 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900/10 outline-none text-slate-800 font-semibold"
              >
                <option value="All">All Tags</option>
                {categoriesList.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Actions and Stats */}
            <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
              <button
                type="button"
                onClick={handleCSVExport}
                className="px-3 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Export list coordinates to CSV spreadsheet"
              >
                <FileDown size={14} />
                Export CSV
              </button>
            </div>
          </div>

          {/* Level Filter Tags */}
          <div className="flex border-b border-slate-200 px-4 py-2 gap-1 overflow-x-auto no-scrollbar bg-slate-50/20">
            {([
              { key: 'all', label: 'All Tracked Items', count: inventoryLevels.length },
              { key: 'low', label: 'Low Stock warnings', count: lowStockCount },
              { key: 'out', label: 'Out of Stock (Zero-level)', count: outOfStockCount },
              { key: 'incoming', label: 'Pending PO intakes', count: inventoryLevels.filter(l => (l.quantityIncoming || 0) > 0).length }
            ] as const).map(tag => (
              <button
                key={tag.key}
                onClick={() => { setFilter(tag.key); setCurrentPage(1); }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border",
                  filter === tag.key
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200"
                )}
              >
                {tag.label}
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold",
                  filter === tag.key ? "bg-white/20 text-white" : "bg-slate-105 text-slate-800"
                )}>
                  {tag.count}
                </span>
              </button>
            ))}
          </div>

          {/* Main Levels Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 font-mono">
                <tr>
                  <th className="px-4 py-3 w-[45px] text-center">
                    <input
                      type="checkbox"
                      checked={paginatedLevels.length > 0 && paginatedLevels.every(item => selectedIds.includes(item.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const toAdd = paginatedLevels.map(i => i.id);
                          setSelectedIds(prev => Array.from(new Set([...prev, ...toAdd])));
                        } else {
                          const toRemove = paginatedLevels.map(i => i.id);
                          setSelectedIds(prev => prev.filter(id => !toRemove.includes(id)));
                        }
                      }}
                      className="rounded border-slate-350 text-slate-900 focus:ring-slate-900"
                    />
                  </th>
                  <th className="px-4 py-3">Product Name & Title</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-right cursor-pointer group" onClick={() => handleSort('quantityOnHand')}>
                    <span className="flex items-center justify-end gap-1 select-none">
                      On Hand
                      <ArrowUpDown size={11} className="text-slate-400 group-hover:text-slate-600" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer group" onClick={() => handleSort('quantityReserved')}>
                    <span className="flex items-center justify-end gap-1 select-none">
                      Reserved
                      <ArrowUpDown size={11} className="text-slate-400 group-hover:text-slate-600" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer group" onClick={() => handleSort('quantityAvailable')}>
                    <span className="flex items-center justify-end gap-1 select-none">
                      Available
                      <ArrowUpDown size={11} className="text-slate-400 group-hover:text-slate-600" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer group" onClick={() => handleSort('quantityIncoming')}>
                    <span className="flex items-center justify-end gap-1 select-none">
                      Incoming
                      <ArrowUpDown size={11} className="text-slate-400 group-hover:text-slate-600" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer group animate-pulse" onClick={() => handleSort('reorderPoint')}>
                    <span className="flex items-center justify-end gap-1 select-none">
                      Reorder Point
                      <ArrowUpDown size={11} className="text-slate-400 group-hover:text-slate-600" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Quick adjustments</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLevels.map((lvl) => {
                  const details = getProductDetails(lvl.productId, lvl.variantId);
                  const isSelected = selectedIds.includes(lvl.id);
                  const isExpanded = expandedRowId === lvl.id;
                  const rowCost = getCostPrice(lvl.productId, lvl.variantId);

                  // Color Code Indicator resolver
                  let badgeColors = "bg-emerald-50 text-emerald-800 border-emerald-100";
                  let indicatorStyle = "bg-emerald-500";
                  let statusLabel = "In Stock";

                  if (lvl.quantityAvailable <= 0) {
                    badgeColors = "bg-red-50 text-red-800 border-red-100";
                    indicatorStyle = "bg-red-500";
                    statusLabel = "Out of Stock";
                  } else if (lvl.quantityAvailable <= lvl.lowStockThreshold) {
                    badgeColors = "bg-amber-50 text-amber-800 border-amber-150";
                    indicatorStyle = "bg-amber-500";
                    statusLabel = "Low Stock";
                  } else if (lvl.quantityIncoming > 0) {
                    badgeColors = "bg-blue-50 text-blue-800 border-blue-100";
                    indicatorStyle = "bg-blue-500";
                    statusLabel = "Inbound";
                  }

                  // Transactions matching
                  const matchingTxs = transactions.filter(tx => tx.productId === lvl.productId && tx.variantId === lvl.variantId);

                  return (
                    <React.Fragment key={lvl.id}>
                      <tr className={cn(
                        "border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs items-center",
                        isSelected && "bg-slate-101/60"
                      )}>
                        {/* Selector checkbox */}
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, lvl.id]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== lvl.id));
                              }
                            }}
                            className="rounded border-slate-350 text-slate-900 focus:ring-slate-900"
                          />
                        </td>

                        {/* Image + Title Column */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {details.imageUrl ? (
                              <img src={details.imageUrl} alt="" className="w-9 h-9 object-cover rounded border border-slate-200 bg-slate-50 shrink-0" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-9 h-9 bg-slate-100 rounded border border-slate-200 flex items-center justify-center shrink-0">
                                <Package className="text-slate-400" size={16} />
                              </div>
                            )}
                             <div>
                              <Link 
                                to={`/admin/products/${lvl.productId}`}
                                className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline line-clamp-1 block transition-all"
                              >
                                {details.name}
                              </Link>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono tracking-wide">{details.brand}</span>
                                <span>•</span>
                                <span className="text-slate-400 font-mono font-medium">Cost: ${rowCost}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="px-4 py-3 font-mono text-slate-650 text-[11px] font-semibold">
                          {details.sku}
                        </td>

                        {/* On Hand qty */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-850 tabular-nums">
                          {lvl.quantityOnHand}
                        </td>

                        {/* Reserved qty */}
                        <td className="px-4 py-3 text-right font-mono text-slate-500 tabular-nums">
                          {lvl.quantityReserved}
                        </td>

                        {/* Available qty */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {lvl.quantityAvailable}
                        </td>

                        {/* Incoming qty */}
                        <td className="px-4 py-3 text-right font-mono text-blue-600 font-semibold tabular-nums">
                          {lvl.quantityIncoming > 0 ? `+${lvl.quantityIncoming}` : '0'}
                        </td>

                        {/* Reorder point */}
                        <td className="px-4 py-3 text-right font-mono text-slate-500 font-semibold tabular-nums">
                          {lvl.reorderPoint}
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            badgeColors
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", indicatorStyle)} />
                            {statusLabel}
                          </span>
                        </td>

                        {/* Quick adjustments button clickers */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleInlineAdjust(lvl, -1)}
                              className="p-1 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-all font-mono"
                              title="Decrement -1"
                            >
                              <Minus size={11} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInlineAdjust(lvl, 1)}
                              className="p-1 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-all font-mono"
                              title="Increment +1"
                            >
                              <Plus size={11} strokeWidth={2.5} />
                            </button>
                            <span className="w-1.5" />
                            <button
                              type="button"
                              onClick={() => setExpandedRowId(isExpanded ? null : lvl.id)}
                              className="p-1 border border-slate-300 rounded hover:bg-slate-50 flex items-center justify-center transition-colors text-slate-600"
                              title="Audit stock logs"
                            >
                              {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLevel(lvl)}
                              className="p-1 border border-red-200 text-red-500 hover:text-red-750 hover:bg-red-50 rounded flex items-center justify-center transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Accordion Audit Transaction details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={10} className="px-6 py-4 border-b border-slate-200">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="border border-slate-200 rounded-lg bg-white shadow-xs p-4 space-y-3">
                                  <div className="flex items-center justify-between border-b pb-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-mono uppercase tracking-wider">
                                      <ClipboardList size={13} className="text-slate-500" />
                                      Stock Movement & Audit Logs ({matchingTxs.length})
                                    </div>
                                    <span className="text-[10px] text-slate-550 italic">
                                      Last counted: {lvl.lastCountedAt || 'Never'}
                                    </span>
                                  </div>

                                  {matchingTxs.length === 0 ? (
                                    <div className="text-center py-6 text-xs text-slate-450 italic">
                                      No local stock transformations logged yet for this SKU.
                                    </div>
                                  ) : (
                                    <div className="max-h-52 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                      {matchingTxs.map((tx) => (
                                        <div key={tx.id} className="p-2.5 rounded border border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] hover:bg-slate-105 transition-colors">
                                          <div className="flex items-center gap-3">
                                            {/* Quantity change display */}
                                            <span className={cn(
                                              "px-1.5 py-0.5 rounded font-bold font-mono tracking-tighter text-[10px] text-center w-12 shrink-0",
                                              tx.quantityChange >= 0
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "bg-red-100 text-red-800"
                                            )}>
                                              {tx.quantityChange >= 0 ? `+${tx.quantityChange}` : tx.quantityChange}
                                            </span>

                                            <div>
                                              <span className="font-bold text-slate-800 capitalize font-mono text-[10px] mr-1.5">
                                                [{tx.transactionType}]
                                              </span>
                                              <span className="text-slate-600 font-medium">{tx.notes || 'Warehouse adjustment.'}</span>
                                              {tx.referenceId && (
                                                <span className="ml-1.5 bg-slate-200/90 text-slate-700 px-1 py-0.2 rounded font-semibold text-[9px] font-mono">
                                                  Ref: {tx.referenceId}
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="text-right text-[10px] text-slate-450 font-medium">
                                            <div className="font-mono">{tx.quantityBefore} → {tx.quantityAfter} units</div>
                                            <div className="mt-0.5 font-sans font-normal text-slate-400">
                                              {new Date(tx.performedAt).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}

                {filteredLevels.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-24 text-center text-slate-400 text-xs italic font-mono bg-white">
                      No stock matches for &quot;{search}&quot; under the requested status tags.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={sortedLevels.length}
            onChangePage={(p) => setCurrentPage(p)}
          />
        </div>
      )}

      {/* PURCHASE ORDERS HUB VIEW */}
      {activeTab === 'purchase_orders' && (
        <div className="space-y-6">
          {/* Active Orders List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-800">
                  Active Intake Purchase Orders
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Track vendor requests, confirm receipts, and increment available stock levels.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePOModal(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-xs"
              >
                <Plus size={12} />
                New Purchase Order
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#f9f9f9] text-[#616161] text-[9px] font-bold uppercase tracking-widest border-b font-mono">
                  <tr>
                    <th className="px-5 py-3">PO Number</th>
                    <th className="px-5 py-3">Supplier</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3">Order Date</th>
                    <th className="px-5 py-3">Exp. Delivery</th>
                    <th className="px-5 py-3 text-right">Cost Value</th>
                    <th className="px-5 py-3 text-center w-[160px]">Receipt Action</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => {
                    const sup = suppliers.find(s => s.id === po.supplierId);
                    const lines = purchaseOrderItems.filter(poi => poi.poId === po.id);
                    const totalCost = lines.reduce((sum, item) => sum + (item.quantityOrdered * item.unitCost), 0);
                    
                    let statusColor = "bg-slate-100 text-slate-800 border-slate-200";
                    if (po.status === 'sent') statusColor = "bg-blue-100 text-blue-800 border-blue-200 animate-pulse";
                    else if (po.status === 'confirmed') statusColor = "bg-amber-100 text-amber-800 border-amber-201";
                    else if (po.status === 'received') statusColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                    else if (po.status === 'cancelled') statusColor = "bg-red-100 text-red-800 border-red-200";

                    return (
                      <tr key={po.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                          {po.poNumber}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-700">
                          {sup?.name || 'Unknown Vendor'}
                          <span className="text-[10px] text-slate-400 block font-normal">Id: {po.supplierId}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide", statusColor)}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-500">
                          {po.orderDate}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-500">
                          {po.expectedDeliveryDate || 'N/A'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-800">
                          ${totalCost.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {po.status !== 'received' && po.status !== 'cancelled' ? (
                            <button
                              type="button"
                              onClick={() => {
                                // Initialize receive draft quantities
                                const draft: Record<string, number> = {};
                                lines.forEach(l => {
                                  draft[l.id] = l.quantityOrdered - (l.quantityReceived || 0);
                                });
                                setReceivePoDraft(draft);
                                setShowReceivePOModal(po.id);
                              }}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 mx-auto transition-all transition-colors shadow-xs"
                            >
                              <Truck size={12} />
                              Intake PO
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-sans italic">
                              {po.status === 'cancelled' ? 'Aborted' : 'Fulfilled'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {purchaseOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400 text-xs italic bg-white font-mono">
                        No purchase orders registered. Run the New Purchase Order wizard below!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUPPLIERS DIRECTORY TAB VIEW */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-800">
                Supplier & Manufacturer Registry
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Register vendor email, shipping details, and default Lead Times to suggest deliveries.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingSupId(null);
                setSupForm({ name: '', contactName: '', email: '', phone: '', address: '', leadTimeDays: 7, notes: '', isActive: true });
                setShowSupplierModal(true);
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <Building size={12} />
              Register Supplier
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#f9f9f9] text-[#616161] text-[9px] font-bold uppercase tracking-widest border-b font-mono">
                <tr>
                  <th className="px-5 py-3">Supplier Name</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Contacts Coordinates</th>
                  <th className="px-5 py-3 text-center">Lead Time</th>
                  <th className="px-5 py-3">Full Address</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((sup) => (
                  <tr key={sup.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {sup.name}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-750">
                      {sup.contactName || 'N/A'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-550 font-mono text-[11px]">
                      <div>{sup.email || 'N/A'}</div>
                      <div className="mt-0.5">{sup.phone || 'N/A'}</div>
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-800">
                      {sup.leadTimeDays} days
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-sans max-w-xs truncate">
                      {sup.address || 'N/A'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={cn(
                        "inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border",
                        sup.isActive 
                          ? "bg-emerald-50 text-emerald-800 border-emerald-110" 
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      )}>
                        {sup.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSupId(sup.id);
                            setSupForm(sup);
                            setShowSupplierModal(true);
                          }}
                          className="p-1 px-2 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded border border-slate-300 text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <Edit2 size={11} />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 italic bg-white font-mono text-xs">
                      No suppliers registered in central databases.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
                                📝 MODALS LAYOUT
         ========================================================================= */}

      {/* 1. SINGLE ADUSTER LEVEL MODAL */}
      <AnimatePresence>
        {showAdjustModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
              id="single_adjust_drawer"
            >
              <div className="p-4 bg-slate-950 text-white flex justify-between items-center">
                <div className="flex items-center gap-1.5 font-bold font-mono text-xs uppercase tracking-wider">
                  <Boxes size={16} />
                  Adjust Stock QuantityOnHand
                </div>
                <button type="button" onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSingleAdjustSubmit} className="p-4 space-y-4 text-xs">
                {/* Level selector */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Target Product Stock Level</label>
                  <select
                    value={adjustForm.lvlId}
                    onChange={e => setAdjustForm(p => ({ ...p, lvlId: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900 outline-none font-medium text-slate-750"
                    required
                  >
                    <option value="">-- Choose target tracked item --</option>
                    {inventoryLevels.map(lvl => {
                      const details = getProductDetails(lvl.productId, lvl.variantId);
                      return (
                        <option key={lvl.id} value={lvl.id}>
                          {details.name} (On Hand: {lvl.quantityOnHand})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Adjust Type */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Adjustment classification</label>
                  <select
                    value={adjustForm.type}
                    onChange={e => setAdjustForm(p => ({ ...p, type: e.target.value as InventoryTransactionType }))}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900 outline-none font-bold"
                  >
                    <option value="adjusted">Manual Count Adjustment</option>
                    <option value="received">Inbound Purchase Receipt</option>
                    <option value="returned">Customer Return</option>
                    <option value="damaged">Damage / Loss Write-Off</option>
                    <option value="lost">Lost Stock / Shrinkage</option>
                  </select>
                </div>

                {/* Delta Level change */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Quantity To Alter (+/- values allowed)</label>
                  <input
                    type="number"
                    value={adjustForm.delta}
                    onChange={e => setAdjustForm(p => ({ ...p, delta: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold font-mono focus:ring-1 focus:ring-slate-900 outline-none"
                    required
                  />
                  <p className="text-[10px] text-slate-400 italic">Example: input -5 representing damage / discarded elements; input +20 representing extra stock take found.</p>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Adjustment Narrative Notes</label>
                  <textarea
                    rows={2}
                    value={adjustForm.notes}
                    onChange={e => setAdjustForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Enter context, e.g. 'Found extra box in back shelf section C'..."
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900 outline-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-2 justify-end pt-2 border-t text-right">
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold"
                  >
                    Post stock change
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. BULK COUNT STOCKTAKE MODAL */}
      <AnimatePresence>
        {showBulkCountModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden"
              id="bulk_count_dialog"
            >
              <div className="p-4 bg-slate-950 text-white flex justify-between items-center">
                <div className="flex items-center gap-1.5 font-bold font-mono text-xs uppercase tracking-wider">
                  <Boxes size={16} />
                  Bulk Floor Stocktake Take Count ({selectedIds.length} Products)
                </div>
                <button type="button" onClick={() => setShowBulkCountModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-4 text-xs">
                <p className="text-[11px] text-slate-550">
                  Input actual counted floor stock values. The engine will calculate difference adjustments, update available levels, and log corrections.
                </p>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 pr-1">
                  {selectedIds.map(id => {
                    const lvl = inventoryLevels.find(l => l.id === id);
                    if (!lvl) return null;
                    const details = getProductDetails(lvl.productId, lvl.variantId);
                    const draftVal = bCountDrafts[id] !== undefined ? bCountDrafts[id] : lvl.quantityOnHand;

                    return (
                      <div key={id} className="p-3 bg-slate-50/50 flex justify-between items-center hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="font-bold text-slate-800 line-clamp-1">{details.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            SKU Code: {details.sku} | Booked count: {lvl.quantityOnHand} units
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-slate-450 mr-1.5 font-semibold">Counted:</span>
                          <input
                            type="number"
                            min="0"
                            value={draftVal}
                            onChange={(e) => {
                              const newCount = Math.max(0, parseInt(e.target.value) || 0);
                              setBCountDrafts(prev => ({ ...prev, [id]: newCount }));
                            }}
                            className="w-20 bg-white border border-slate-350 rounded text-center py-1 font-bold font-mono outline-none focus:ring-1 focus:ring-black"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Correction Narrative notes */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider">Stocktake audit comments</label>
                  <textarea
                    rows={2}
                    value={bCountNotes}
                    onChange={e => setBCountNotes(e.target.value)}
                    placeholder="Provide audit context. E.g. 'End of Q2 Central Warehouse floor stock check'..."
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                {/* CTAs */}
                <div className="flex gap-2 justify-end pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowBulkCountModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-705 font-bold hover:bg-slate-50 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkCountSubmit}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Check size={14} />
                    Commit stocktake adjustments
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. SUPPLIER REGISTRY MODAL */}
      <AnimatePresence>
        {showSupplierModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
              id="supplier_registration_form"
            >
              <div className="p-4 bg-slate-950 text-white flex justify-between items-center">
                <div className="flex items-center gap-1.5 font-bold font-mono text-xs uppercase tracking-wider">
                  <Building size={16} />
                  {editingSupId ? 'Edit Supplier coordinates' : 'Register manufacturing supplier'}
                </div>
                <button type="button" onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSupplierSubmit} className="p-4 space-y-3.5 text-xs">
                {/* Name */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-650 uppercase">Supplier Company Name</label>
                  <input
                    type="text"
                    value={supForm.name || ''}
                    onChange={e => setSupForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="E.g. Kingston Power Distributors"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900 outline-none font-semibold text-slate-800"
                    required
                  />
                </div>

                {/* Contact Name */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-650 uppercase">Account Manager Contact Name</label>
                  <input
                    type="text"
                    value={supForm.contactName || ''}
                    onChange={e => setSupForm(p => ({ ...p, contactName: e.target.value }))}
                    placeholder="E.g. Richard Bailey"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900 outline-none"
                  />
                </div>

                {/* Email / Phone */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-650 uppercase">Contact Email</label>
                    <input
                      type="email"
                      value={supForm.email || ''}
                      onChange={e => setSupForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="e.g. rep@distributor.com"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-650 uppercase">Contact Phone</label>
                    <input
                      type="text"
                      value={supForm.phone || ''}
                      onChange={e => setSupForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="876-555-4422"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Lead time & isActive */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-650 uppercase">Lead times (days)</label>
                    <input
                      type="number"
                      min="1"
                      value={supForm.leadTimeDays || 7}
                      onChange={e => setSupForm(p => ({ ...p, leadTimeDays: parseInt(e.target.value) || 7 }))}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900 outline-none font-semibold font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-650 uppercase">Supplier Status</label>
                    <select
                      value={supForm.isActive ? 'active' : 'inactive'}
                      onChange={e => setSupForm(p => ({ ...p, isActive: e.target.value === 'active' }))}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold focus:ring-1 focus:ring-slate-900 outline-none"
                    >
                      <option value="active">Active Intake</option>
                      <option value="inactive">Inactive / Frozen</option>
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-650 uppercase">Warehouse Headquarters address</label>
                  <input
                    type="text"
                    value={supForm.address || ''}
                    onChange={e => setSupForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="15 Industrial Way, Kingston 11"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900 outline-none"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-650 uppercase">Additional comments</label>
                  <textarea
                    rows={2}
                    value={supForm.notes || ''}
                    onChange={e => setSupForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 outline-none focus:ring-1"
                  />
                </div>

                {/* CTAs */}
                <div className="flex gap-2 justify-end pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowSupplierModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 font-bold hover:bg-slate-55 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold"
                  >
                    Save Supplier Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. CREATE SIMPLIFIED PURCHASE ORDER WIZARD */}
      <AnimatePresence>
        {showCreatePOModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden"
              id="purchase_order_builder"
            >
              <div className="p-4 bg-slate-950 text-white flex justify-between items-center">
                <div className="flex items-center gap-1.5 font-bold font-mono text-xs uppercase tracking-wider">
                  <ClipboardList size={16} />
                  Purchase Order Constructor Wizard
                </div>
                <button type="button" onClick={() => setShowCreatePOModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePOSubmit} className="p-4 space-y-4 text-xs">
                
                {/* Header coordinates chooser */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wide">Target Manufacturing Supplier</label>
                    <select
                      value={poForm.supplierId}
                      onChange={e => {
                        const s = suppliers.find(v => v.id === e.target.value);
                        setPoForm(p => ({ ...p, supplierId: e.target.value, expectedDays: s?.leadTimeDays || 7 }));
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:ring-1 focus:ring-slate-900 outline-none font-semibold"
                      required
                    >
                      <option value="">-- Choose registered supplier --</option>
                      {suppliers.filter(s => s.isActive).map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.leadTimeDays}d lead)</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wide">Est. Delivery Lead Days</label>
                    <input
                      type="number"
                      min="1"
                      value={poForm.expectedDays}
                      onChange={e => setPoForm(p => ({ ...p, expectedDays: parseInt(e.target.value) || 7 }))}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold font-mono focus:ring-1 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Line Items Adder Board */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wide">Add PO Procurement SKU Line Items</label>
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3">
                    
                    <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                      {/* Product drop chooser */}
                      <select
                        id="po_item_selector"
                        className="bg-white border rounded px-2.5 py-1.5 focus:ring-1 outline-none text-[11px] font-medium flex-1"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          
                          // Decode value productId|variantId
                          const [productId, variantId] = val.split('|');
                          
                          // If already in lines, skip
                          const exists = poLinesDraft.some(l => l.productId === productId && l.variantId === (variantId || undefined));
                          if (exists) return;

                          const cost = getCostPrice(productId, variantId || undefined);
                          
                          setPoLinesDraft(prev => [
                            ...prev,
                            {
                              productId,
                              variantId: variantId || undefined,
                              quantityOrdered: 50,
                              unitCost: cost
                            }
                          ]);

                          // Reset dropdown selection
                          e.target.value = "";
                        }}
                      >
                        <option value="">-- Search and select tracked warehouse SKU --</option>
                        {inventoryLevels.map(lvl => {
                          const details = getProductDetails(lvl.productId, lvl.variantId);
                          return (
                            <option key={lvl.id} value={`${lvl.productId}|${lvl.variantId || ''}`}>
                              {details.name} (SKU: {details.sku})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Show Drafted line items list */}
                    {poLinesDraft.length === 0 ? (
                      <div className="text-center py-4 bg-white/70 border border-dashed rounded text-slate-450 italic font-medium">
                        No lines added. Select a product using the dropdown above to define PO quantities.
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5">
                        {poLinesDraft.map((item, index) => {
                          const details = getProductDetails(item.productId, item.variantId);
                          return (
                            <div key={index} className="p-2 border rounded bg-white flex items-center justify-between gap-3 text-[11px]">
                              <div className="flex-1 min-w-0">
                                <span className="font-bold text-slate-800 line-clamp-1">{details.name}</span>
                                <span className="text-[10px] text-slate-450 font-mono">Suggested cost: ${getCostPrice(item.productId, item.variantId)} JMD</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[9px] font-bold text-slate-400">Qty Ordered</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantityOrdered}
                                    onChange={(e) => {
                                      const val = Math.max(1, parseInt(e.target.value) || 1);
                                      setPoLinesDraft(prev => prev.map((l, i) => i === index ? { ...l, quantityOrdered: val } : l));
                                    }}
                                    className="w-16 border rounded text-center py-0.5 font-bold font-mono text-[11px]"
                                  />
                                </div>

                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[9px] font-bold text-slate-400">Unit Cost (JMD)</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.unitCost}
                                    onChange={(e) => {
                                      const val = Math.max(1, parseInt(e.target.value) || 1);
                                      setPoLinesDraft(prev => prev.map((l, i) => i === index ? { ...l, unitCost: val } : l));
                                    }}
                                    className="w-20 border rounded text-right pr-1 py-0.5 font-bold font-mono text-[11px]"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setPoLinesDraft(prev => prev.filter((_, i) => i !== index))}
                                  className="text-red-500 hover:text-red-700 p-1.5 border border-red-200 hover:bg-red-50 rounded mt-3"
                                  title="Delete item row"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional PO Notes */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wide">Procurement/Delivery details comments</label>
                  <textarea
                    rows={2}
                    value={poForm.notes}
                    onChange={e => setPoForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Enter instructions, e.g. 'Standard delivery via Constant Spring branch'..."
                    className="w-full bg-white border border-slate-350 rounded px-2.5 py-1.5 focus:ring-1 outline-none"
                  />
                </div>

                {/* PO CTAs */}
                <div className="flex gap-2 justify-end pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCreatePOModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 rounded-lg"
                  >
                    Cancel / Discard
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow-sm"
                  >
                    Commit & Issue Purchase Order (Sent)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. RECEIVE / INTAKE PO DRAWER MODAL */}
      <AnimatePresence>
        {showReceivePOModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden"
            >
              <div className="p-4 bg-slate-950 text-white flex justify-between items-center">
                <div className="flex items-center gap-1.5 font-bold font-mono text-xs uppercase tracking-wider">
                  <Truck size={16} />
                  Goods Intake & Inventory Landing Desk
                </div>
                <button type="button" onClick={() => setShowReceivePOModal(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              {(() => {
                const activePO = purchaseOrders.find(po => po.id === showReceivePOModal);
                if (!activePO) return null;
                const activeLines = purchaseOrderItems.filter(poi => poi.poId === activePO.id);
                const activeSupplier = suppliers.find(s => s.id === activePO.supplierId);

                return (
                  <div className="p-4 space-y-4 text-xs">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">PO Intake Register: {activePO.poNumber}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Shipped from <span className="font-semibold">{activeSupplier?.name}</span> | Issued Date: {activePO.orderDate}
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden shrink-0">
                      <table className="w-full text-left text-slate-650 min-w-full text-xs">
                        <thead className="bg-[#f9f9f9] text-[#616161] text-[9px] font-bold uppercase tracking-widest font-mono border-b">
                          <tr>
                            <th className="px-3 py-2.5">Procured product name</th>
                            <th className="px-3 py-2.5 text-center">Ordered</th>
                            <th className="px-3 py-2.5 text-center">Prev. Recvd</th>
                            <th className="px-3 py-2.5 text-center w-[120px]">Intake qty count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeLines.map((line) => {
                            const details = getProductDetails(line.productId, line.variantId);
                            const prevReceived = line.quantityReceived || 0;
                            const remainingToReceive = line.quantityOrdered - prevReceived;
                            const draftQty = receivePoDraft[line.id] !== undefined ? receivePoDraft[line.id] : remainingToReceive;

                            return (
                              <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50/20">
                                <td className="px-3 py-2 font-bold text-slate-800">
                                  {details.name}
                                </td>
                                <td className="px-3 py-2 text-center font-mono font-semibold">
                                  {line.quantityOrdered}
                                </td>
                                <td className="px-3 py-2 text-center font-mono text-slate-500">
                                  {prevReceived}
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max={remainingToReceive}
                                    value={draftQty}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value) || 0);
                                      setReceivePoDraft(prev => ({ ...prev, [line.id]: val }));
                                    }}
                                    className="w-20 border border-slate-350 rounded text-center py-1 font-bold font-mono outline-none text-[11px] focus:ring-1 focus:ring-black"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3 bg-blue-50/50 text-blue-800 text-[11px] font-medium border border-blue-100 rounded-lg flex items-start gap-2 leading-relaxed">
                      <Info size={15} className="mt-0.5 shrink-0" />
                      <div>
                        Goods verification landing: Quantities identified in column &quot;Intake qty count&quot; will be physical added toOnHand and available levels of Kingston Warehouse instantly and logged.
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 justify-end pt-2 border-t">
                      <button
                        type="button"
                        onClick={() => setShowReceivePOModal(null)}
                        className="px-4 py-2 border border-slate-350 text-slate-700 font-bold hover:bg-slate-50 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReceivePOSubmit(activePO.id)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1 shadow-sm"
                      >
                        <CheckCircle size={14} />
                        Confirm Intake load
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER NOTICE */}
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl flex items-start gap-3 text-slate-600 text-[11px] leading-relaxed">
        <Info size={16} className="text-slate-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Operational Integrity Note: </span>
          Adjustments made within this workspace synchronously compile with Cloud Firestore registers, updating variant attributes globally. Active PO draft release automatically increments inbound tracking markers. Always run Q/A physical counts before recording manual corrections.
        </div>
      </div>
    </div>
  );
}
