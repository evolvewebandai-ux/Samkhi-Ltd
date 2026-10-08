import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../../context/ProductContext';
import { 
  Search, 
  SlidersHorizontal, 
  ChevronDown, 
  ChevronUp,
  Check, 
  X, 
  MoreHorizontal, 
  ExternalLink, 
  Plus, 
  Upload, 
  Image as ImageIcon, 
  Trash2,
  Filter,
  ArrowUpDown,
  Star,
  CheckSquare,
  Square,
  Zap,
  Tag,
  DollarSign,
  Layers,
  Sparkles,
  RefreshCw,
  Archive,
  Download
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import BulkUploadWizard from '../../components/admin/BulkUploadWizard';
import { showToast } from '../../lib/toast';
import { useInventory } from '../../context/InventoryContext';
import BulkActionBar from '../../components/admin/BulkActionBar';

export default function AdminProducts() {
  const navigate = useNavigate();
  const { products, updateProduct, removeProduct } = useProducts();
  const { inventoryLevels } = useInventory();

  // Create a memoized sum of available inventory for each product
  const productInventoryMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const lvl of inventoryLevels) {
      const prodId = lvl.productId;
      const current = map.get(prodId) || 0;
      map.set(prodId, current + (lvl.quantityAvailable ?? 0));
    }
    return map;
  }, [inventoryLevels]);

  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('All');
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [stockStatus, setStockStatus] = useState<'all' | 'instock' | 'lowstock' | 'outofstock'>('all');
  const [featuredStatus, setFeaturedStatus] = useState<'all' | 'featured' | 'nonfeatured'>('all');
  const [brandFilter, setBrandFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('default');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkCatOpen, setBulkCatOpen] = useState(false);
  const [bulkStockOpen, setBulkStockOpen] = useState(false);
  const [bulkStockQty, setBulkStockQty] = useState('');
  const [bulkBrandOpen, setBulkBrandOpen] = useState(false);
  const [bulkBrandVal, setBulkBrandVal] = useState('');

  const [bulkAddTagsOpen, setBulkAddTagsOpen] = useState(false);
  const [bulkAddTagsVal, setBulkAddTagsVal] = useState('');
  const [bulkRemoveTagsOpen, setBulkRemoveTagsOpen] = useState(false);
  const [bulkRemoveTagsVal, setBulkRemoveTagsVal] = useState('');

  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);

  const tabs = ['All', 'Inverters', 'Batteries', 'LED Lighting', 'Solar Panels'];

  const toggleDropdown = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    setActiveDropdownId(activeDropdownId === productId ? null : productId);
  };

  // Extract unique brands dynamically
  const brands = ['All', ...Array.from(new Set(products.map(p => p.brand).filter(Boolean)))];

  // Extract unique tags dynamically
  const availableTags = ['All', ...Array.from(new Set(products.flatMap(p => p.tags || []).filter(Boolean)))];

  // Filtering Logic
  const filteredProducts = products.filter(p => {
    // 1. Search Query
    const nameStr = p.name || (p as any).title || '';
    const idStr = String(p.id || '');
    const matchesSearch = nameStr.toLowerCase().includes(search.toLowerCase()) ||
                          idStr.toLowerCase().includes(search.toLowerCase()) ||
                          (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()));

    // 2. Main Tab filter matching tags
    const matchesTab = filter === 'All' || p.tags?.some(t => t.toLowerCase() === filter.toLowerCase() || t.toLowerCase().replace('-', ' ') === filter.toLowerCase());

    // 3. Min Price
    const matchesMin = minPrice === '' || p.price >= parseFloat(minPrice);

    // 4. Max Price
    const matchesMax = maxPrice === '' || p.price <= parseFloat(maxPrice);

    // 5. Stock Level status using real live inventory level
    const defaultFallback = p.inventory !== undefined ? p.inventory : (p.inStock ? 50 : 0);
    const stockCount = productInventoryMap.has(p.id) ? productInventoryMap.get(p.id)! : defaultFallback;
    let matchesStockStatus = true;
    if (stockStatus === 'instock') {
      matchesStockStatus = stockCount > 0 && p.inStock;
    } else if (stockStatus === 'lowstock') {
      matchesStockStatus = stockCount > 0 && stockCount <= 10;
    } else if (stockStatus === 'outofstock') {
      matchesStockStatus = stockCount === 0 || !p.inStock;
    }

    // 6. Featured Status
    let matchesFeatured = true;
    if (featuredStatus === 'featured') {
      matchesFeatured = !!p.isFeatured;
    } else if (featuredStatus === 'nonfeatured') {
      matchesFeatured = !p.isFeatured;
    }

    // 7. Brand
    const matchesBrand = brandFilter === 'All' || p.brand === brandFilter;

    // 8. Dynamic Tag Search
    const matchesTag = tagFilter === 'All' || (p.tags && p.tags.includes(tagFilter));

    return matchesSearch && matchesTab && matchesMin && matchesMax && matchesStockStatus && matchesFeatured && matchesBrand && matchesTag;
  });

  // Sorting Logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
    if (sortBy === 'status-asc') {
      return (a.inStock === b.inStock) ? 0 : (a.inStock ? 1 : -1);
    }
    if (sortBy === 'status-desc') {
      return (a.inStock === b.inStock) ? 0 : (a.inStock ? -1 : 1);
    }
    if (sortBy === 'tag-asc') {
      const tagA = (a.tags && a.tags[0]) || 'General';
      const tagB = (b.tags && b.tags[0]) || 'General';
      return tagA.localeCompare(tagB);
    }
    if (sortBy === 'tag-desc') {
      const tagA = (a.tags && a.tags[0]) || 'General';
      const tagB = (b.tags && b.tags[0]) || 'General';
      return tagB.localeCompare(tagA);
    }
    if (sortBy === 'tags-count-asc') {
      return (a.tags?.length || 0) - (b.tags?.length || 0);
    }
    if (sortBy === 'tags-count-desc') {
      return (b.tags?.length || 0) - (a.tags?.length || 0);
    }
    if (sortBy === 'stock-asc') {
      const fallbackA = a.inventory !== undefined ? a.inventory : (a.inStock ? 50 : 0);
      const fallbackB = b.inventory !== undefined ? b.inventory : (b.inStock ? 50 : 0);
      const stockA = productInventoryMap.has(a.id) ? productInventoryMap.get(a.id)! : fallbackA;
      const stockB = productInventoryMap.has(b.id) ? productInventoryMap.get(b.id)! : fallbackB;
      return stockA - stockB;
    }
    if (sortBy === 'stock-desc') {
      const fallbackA = a.inventory !== undefined ? a.inventory : (a.inStock ? 50 : 0);
      const fallbackB = b.inventory !== undefined ? b.inventory : (b.inStock ? 50 : 0);
      const stockA = productInventoryMap.has(a.id) ? productInventoryMap.get(a.id)! : fallbackA;
      const stockB = productInventoryMap.has(b.id) ? productInventoryMap.get(b.id)! : fallbackB;
      return stockB - stockA;
    }
    return 0; // default code order
  });

  // Active filter bubble count
  const activeFiltersCount = [
    minPrice !== '',
    maxPrice !== '',
    stockStatus !== 'all',
    featuredStatus !== 'all',
    brandFilter !== 'All',
    tagFilter !== 'All',
    sortBy !== 'default'
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setStockStatus('all');
    setFeaturedStatus('all');
    setBrandFilter('All');
    setTagFilter('All');
    setSortBy('default');
    setSearch('');
    setFilter('All');
  };

  // Bulk Executions
  const selectedCount = Object.keys(selectedIds).filter(id => selectedIds[id]).length;

  const handleBulkActivate = async () => {
    const idsToUpdate = Object.keys(selectedIds).filter(id => selectedIds[id]);
    setBulkLoading(true);
    try {
      await Promise.all(idsToUpdate.map(id => updateProduct(id, { inStock: true, status: 'Active' })));
      setSelectedIds({});
      showToast(`Modified ${idsToUpdate.length} products to Active status!`, 'success');
    } catch (e) {
      console.error("Failed to bulk activate:", e);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDraft = async () => {
    const idsToUpdate = Object.keys(selectedIds).filter(id => selectedIds[id]);
    setBulkLoading(true);
    try {
      await Promise.all(idsToUpdate.map(id => updateProduct(id, { inStock: false, status: 'Draft' })));
      setSelectedIds({});
      showToast(`Modified ${idsToUpdate.length} products to Draft status!`, 'success');
    } catch (e) {
      console.error("Failed to bulk draft:", e);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkArchive = async () => {
    const idsToUpdate = Object.keys(selectedIds).filter(id => selectedIds[id]);
    setBulkLoading(true);
    try {
      await Promise.all(idsToUpdate.map(id => updateProduct(id, { inStock: false, status: 'Archived' })));
      setSelectedIds({});
      showToast(`Modified ${idsToUpdate.length} products to Archived status!`, 'success');
    } catch (e) {
      console.error("Failed to bulk archive:", e);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkSetCategory = async (tagVal: string) => {
    const idsToUpdate = Object.keys(selectedIds).filter(id => selectedIds[id]);
    setBulkLoading(true);
    try {
      await Promise.all(idsToUpdate.map(id => {
        const prodItem = products.find(prod => prod.id === id);
        const currentTags = prodItem?.tags || [];
        const nextTags = Array.from(new Set([...currentTags, tagVal]));
        return updateProduct(id, { tags: nextTags });
      }));
      setSelectedIds({});
      setBulkCatOpen(false);
      showToast("Selected products updated with tag: " + tagVal, "success");
    } catch (e) {
      console.error("Failed to bulk set tags:", e);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkSetFeatured = async (boolVal: boolean) => {
    const idsToUpdate = Object.keys(selectedIds).filter(id => selectedIds[id]);
    setBulkLoading(true);
    try {
      await Promise.all(idsToUpdate.map(id => updateProduct(id, { isFeatured: boolVal })));
      setSelectedIds({});
    } catch (e) {
      console.error("Failed to bulk featured status:", e);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkUpdateStock = async (stockQty: number) => {
    const idsToUpdate = Object.keys(selectedIds).filter(id => selectedIds[id]);
    setBulkLoading(true);
    try {
      await Promise.all(idsToUpdate.map(id => updateProduct(id, { 
        inventory: stockQty,
        inStock: stockQty > 0
      })));
      setSelectedIds({});
      setBulkStockOpen(false);
      setBulkStockQty('');
    } catch (e) {
      console.error("Failed bulk update stock:", e);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkSetBrand = async (brandName: string) => {
    const idsToUpdate = Object.keys(selectedIds).filter(id => selectedIds[id]);
    setBulkLoading(true);
    try {
      await Promise.all(idsToUpdate.map(id => updateProduct(id, { brand: brandName })));
      setSelectedIds({});
      setBulkBrandOpen(false);
      setBulkBrandVal('');
    } catch (e) {
      console.error("Failed bulk set brand:", e);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkAddTags = async (tagsString: string) => {
    const idsToUpdate = Object.keys(selectedIds).filter(id => selectedIds[id]);
    const tagsToAdd = tagsString.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    if (tagsToAdd.length === 0) return;

    setBulkLoading(true);
    try {
      await Promise.all(idsToUpdate.map(async id => {
        const prod = products.find(p => p.id === id);
        if (prod) {
          const currentTags = prod.tags || [];
          const updatedTags = Array.from(new Set([...currentTags, ...tagsToAdd]));
          await updateProduct(id, { tags: updatedTags });
        }
      }));
      setSelectedIds({});
      setBulkAddTagsOpen(false);
      setBulkAddTagsVal('');
      showToast("🟢 EXECUTED - Bulk tags added successfully.");
    } catch (e) {
      console.error("Failed to bulk add tags:", e);
      showToast("🔴 WARNING - Bulk tags addition failed.", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkRemoveTags = async (tagsString: string) => {
    const idsToUpdate = Object.keys(selectedIds).filter(id => selectedIds[id]);
    const tagsToRemove = tagsString.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    if (tagsToRemove.length === 0) return;

    setBulkLoading(true);
    try {
      await Promise.all(idsToUpdate.map(async id => {
        const prod = products.find(p => p.id === id);
        if (prod) {
          const currentTags = prod.tags || [];
          const updatedTags = currentTags.filter(t => !tagsToRemove.includes(t.toLowerCase()));
          await updateProduct(id, { tags: updatedTags });
        }
      }));
      setSelectedIds({});
      setBulkRemoveTagsOpen(false);
      setBulkRemoveTagsVal('');
      showToast("🟢 EXECUTED - Bulk tags removed successfully.");
    } catch (e) {
      console.error("Failed to bulk remove tags:", e);
      showToast("🔴 WARNING - Bulk tags removal failed.", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const idsToDelete = Object.keys(selectedIds).filter(id => selectedIds[id]);
    setBulkLoading(true);
    try {
      await Promise.all(idsToDelete.map(id => removeProduct(id)));
      setSelectedIds({});
      setShowBulkDeleteConfirm(false);
    } catch (e) {
      console.error("Failed bulk delete products:", e);
    } finally {
      setBulkLoading(false);
    }
  };

  const exportProductsToCSV = () => {
    if (products.length === 0) {
      showToast('No products in catalog to export', 'warning');
      return;
    }

    const headers = [
      'ID', 'Name', 'SKU', 'Brand', 'Price', 'CompareAtPrice', 'Category', 'Tags', 'InStock', 'Inventory', 'Status', 'Description'
    ];

    const rows = products.map(p => [
      `"${p.id || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.sku || ''}"`,
      `"${(p.brand || '').replace(/"/g, '""')}"`,
      p.price || 0,
      p.compareAtPrice || 0,
      `"${p.category || ''}"`,
      `"${(p.tags || []).join(';')}"`,
      p.inStock ? 'true' : 'false',
      p.inventory ?? 0,
      `"${p.status || 'Active'}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `samkhi_products_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported product catalog CSV!', 'success');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto pb-32">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a]">Products</h1>
          <p className="text-xs text-[#616161] mt-0.5">Manage catalog records, batch status controls, and granular search parameters.</p>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={handleResetFilters}
            className="bg-white border border-[#d1d1d1] text-[#616161] px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            title="Reset active query and filters"
          >
            <RefreshCw size={14} />
            Reset Filters
          </button>
          <button 
            type="button"
            onClick={exportProductsToCSV}
            className="bg-white border border-[#d1d1d1] text-[#1a1a1a] px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Export catalog as CSV"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button 
            onClick={() => setShowBulkUpload(true)}
            className="bg-white border border-[#d1d1d1] text-[#1a1a1a] px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Upload size={16} />
            Bulk Import
          </button>
          <button 
            onClick={() => navigate('/admin/products/new')}
            className="bg-black text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-black/90 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} />
            Add product
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#e3e3e3] shadow-sm overflow-hidden">
        {/* Main tabs for fast Category swapping */}
        <div className="flex border-b border-[#e3e3e3] px-2 overflow-x-auto no-scrollbar justify-between items-center bg-white">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  filter === tab 
                    ? "border-black text-[#1a1a1a]" 
                    : "border-transparent text-[#616161] hover:text-[#1a1a1a] hover:bg-[#f6f6f6]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          {activeFiltersCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full mr-3 font-medium animate-pulse">
              <Sparkles size={12} />
              {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied
            </span>
          )}
        </div>

        {/* Dynamic Toolbar */}
        <div className="p-3 flex flex-wrap gap-2 items-center justify-between border-b border-[#e3e3e3] bg-[#f9f9f9]">
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#616161]" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, brand, key or catalog index..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-[#d1d1d1] rounded-md py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-bold transition-all shadow-xs",
                showAdvancedFilters 
                  ? "bg-slate-900 border-slate-900 text-white" 
                  : "bg-white border-[#d1d1d1] text-[#1a1a1a] hover:bg-slate-50"
              )}
            >
              <SlidersHorizontal size={14} />
              <span>Advanced Search Filters</span>
              {activeFiltersCount > 0 && (
                <span className={cn(
                  "font-bold font-mono text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                  showAdvancedFilters ? "bg-amber-400 text-slate-950" : "bg-black text-white"
                )}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters Panel */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-[#e3e3e3] bg-slate-55 border-l-4 border-l-slate-800"
            >
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-700 bg-slate-50/70">
                {/* Pricing bounds input */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <DollarSign size={12} />
                    Price range (JMD)
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min $"
                      value={minPrice}
                      onChange={e => setMinPrice(e.target.value)}
                      className="w-full bg-white border border-[#d1d1d1] rounded px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-black text-slate-800"
                    />
                    <span className="text-slate-400 font-normal">—</span>
                    <input
                      type="number"
                      placeholder="Max $"
                      value={maxPrice}
                      onChange={e => setMaxPrice(e.target.value)}
                      className="w-full bg-white border border-[#d1d1d1] rounded px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-black text-slate-800"
                    />
                  </div>
                </div>

                {/* Stock Level selection */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Layers size={12} />
                    Stocking Status
                  </span>
                  <select
                    value={stockStatus}
                    onChange={e => setStockStatus(e.target.value as any)}
                    className="w-full bg-white border border-[#d1d1d1] rounded px-2.5 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-black font-medium"
                  >
                    <option value="all">All Inventory Options</option>
                    <option value="instock">In Stock Only</option>
                    <option value="lowstock">Low Stock (≤ 10 items)</option>
                    <option value="outofstock">Out of stock / Drafts</option>
                  </select>
                </div>

                {/* Brand selection */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Tag size={12} />
                    Manufacturer Brand
                  </span>
                  <select
                    value={brandFilter}
                    onChange={e => setBrandFilter(e.target.value)}
                    className="w-full bg-white border border-[#d1d1d1] rounded px-2.5 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-black font-medium"
                  >
                    {brands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                {/* Tag selection */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Tag size={12} />
                    Product Tag
                  </span>
                  <select
                    value={tagFilter}
                    onChange={e => setTagFilter(e.target.value)}
                    className="w-full bg-white border border-[#d1d1d1] rounded px-2.5 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-black font-medium"
                  >
                    {availableTags.map(tg => (
                      <option key={tg} value={tg}>{tg === 'All' ? 'All Metadata Tags' : tg}</option>
                    ))}
                  </select>
                </div>

                {/* Sorting options & highlights */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <ArrowUpDown size={12} />
                    Sorting Order
                  </span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="w-full bg-white border border-[#d1d1d1] rounded px-2.5 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-black font-medium"
                  >
                    <option value="default">Default Catalog Order</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Alphabetical: A to Z</option>
                    <option value="name-desc">Alphabetical: Z to A</option>
                    <option value="stock-asc">Inventory: Low to High</option>
                    <option value="stock-desc">Inventory: High to Low</option>
                  </select>
                </div>

                {/* Row 2 extra filters: Featured status & action reset */}
                <div className="sm:col-span-2 flex items-center gap-5 pt-1">
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Show:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-black">
                      <input 
                        type="radio" 
                        name="featuredRadio" 
                        checked={featuredStatus === 'all'} 
                        onChange={() => setFeaturedStatus('all')}
                        className="accent-black" 
                      />
                      <span>All Products</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-black">
                      <input 
                        type="radio" 
                        name="featuredRadio" 
                        checked={featuredStatus === 'featured'} 
                        onChange={() => setFeaturedStatus('featured')}
                        className="accent-black" 
                      />
                      <span className="flex items-center gap-0.5 font-bold text-amber-600">
                        <Star size={12} className="fill-amber-500 text-amber-500" />
                        Featured
                      </span>
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2 flex justify-end items-center pt-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-slate-500 hover:text-slate-800 text-xs font-bold underline transition-colors mr-2"
                  >
                    Reset parameters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#f9f9f9] text-[#616161] text-xs font-semibold uppercase tracking-wider border-b border-[#e3e3e3]">
              <tr>
                <th className="px-4 py-3 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    className="rounded h-4 w-4 text-black border-[#d1d1d1] focus:ring-black accent-black cursor-pointer"
                    checked={sortedProducts.length > 0 && sortedProducts.every(p => selectedIds[p.id])}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const nextSel: Record<string, boolean> = {};
                      if (checked) {
                        sortedProducts.forEach(p => {
                           nextSel[p.id] = true;
                        });
                      }
                      setSelectedIds(nextSel);
                    }}
                  />
                </th>
                <th className="px-4 py-2 select-none">
                  <div className="flex items-center gap-1">
                    <span>Product Details</span>
                    <span className="flex flex-col ml-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSortBy(sortBy === 'name-asc' ? 'default' : 'name-asc')}
                        className={cn(
                          "p-0.5 hover:text-black transition-colors rounded",
                          sortBy === 'name-asc' ? "text-slate-900 font-extrabold" : "text-slate-350"
                        )}
                        title="Sort Name A to Z"
                      >
                        <ChevronUp size={10} className="stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortBy(sortBy === 'name-desc' ? 'default' : 'name-desc')}
                        className={cn(
                          "p-0.5 hover:text-black transition-colors rounded -mt-0.5",
                          sortBy === 'name-desc' ? "text-slate-900 font-extrabold" : "text-slate-350"
                        )}
                        title="Sort Name Z to A"
                      >
                        <ChevronDown size={10} className="stroke-[3]" />
                      </button>
                    </span>
                    <span className="text-slate-300 mx-1">|</span>
                    <span className="text-[10px] text-slate-500 font-mono normal-case tracking-normal">Price:</span>
                    <span className="flex flex-col ml-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSortBy(sortBy === 'price-asc' ? 'default' : 'price-asc')}
                        className={cn(
                          "p-0.5 hover:text-black transition-colors rounded",
                          sortBy === 'price-asc' ? "text-slate-900 font-extrabold" : "text-slate-350"
                        )}
                        title="Price Low to High"
                      >
                        <ChevronUp size={10} className="stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortBy(sortBy === 'price-desc' ? 'default' : 'price-desc')}
                        className={cn(
                          "p-0.5 hover:text-black transition-colors rounded -mt-0.5",
                          sortBy === 'price-desc' ? "text-slate-900 font-extrabold" : "text-slate-350"
                        )}
                        title="Price High to Low"
                      >
                        <ChevronDown size={10} className="stroke-[3]" />
                      </button>
                    </span>
                  </div>
                </th>
                <th className="px-4 py-2 select-none">
                  <div className="flex items-center gap-1">
                    <span>Catalog Status</span>
                    <span className="flex flex-col ml-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSortBy(sortBy === 'status-asc' ? 'default' : 'status-asc')}
                        className={cn(
                          "p-0.5 hover:text-black transition-colors rounded",
                          sortBy === 'status-asc' ? "text-slate-900 font-extrabold" : "text-slate-350"
                        )}
                        title="Sort Status Active first"
                      >
                        <ChevronUp size={10} className="stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortBy(sortBy === 'status-desc' ? 'default' : 'status-desc')}
                        className={cn(
                          "p-0.5 hover:text-black transition-colors rounded -mt-0.5",
                          sortBy === 'status-desc' ? "text-slate-900 font-extrabold" : "text-slate-350"
                        )}
                        title="Sort Status Draft first"
                      >
                        <ChevronDown size={10} className="stroke-[3]" />
                      </button>
                    </span>
                  </div>
                </th>
                <th id="th-available-inventory" className="px-4 py-2 text-right select-none">
                  <div className="flex items-center justify-end gap-1">
                    <span>Available Inventory</span>
                    <span className="flex flex-col ml-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSortBy(sortBy === 'stock-asc' ? 'default' : 'stock-asc')}
                        className={cn(
                          "p-0.5 hover:text-black transition-colors rounded",
                          sortBy === 'stock-asc' ? "text-slate-900 font-extrabold" : "text-slate-350"
                        )}
                        title="Inventory Low to High"
                      >
                        <ChevronUp size={10} className="stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortBy(sortBy === 'stock-desc' ? 'default' : 'stock-desc')}
                        className={cn(
                          "p-0.5 hover:text-black transition-colors rounded -mt-0.5",
                          sortBy === 'stock-desc' ? "text-slate-900 font-extrabold" : "text-slate-350"
                        )}
                        title="Inventory High to Low"
                      >
                        <ChevronDown size={10} className="stroke-[3]" />
                      </button>
                    </span>
                  </div>
                </th>
                <th className="px-4 py-2 select-none">
                  <div className="flex items-center gap-1">
                    <span>Primary Tag</span>
                    <span className="flex flex-col ml-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSortBy(sortBy === 'tag-asc' ? 'default' : 'tag-asc')}
                        className={cn(
                          "p-0.5 hover:text-black transition-colors rounded",
                          sortBy === 'tag-asc' ? "text-slate-900 font-extrabold" : "text-slate-350"
                        )}
                        title="Sort Tag A to Z"
                      >
                        <ChevronUp size={10} className="stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortBy(sortBy === 'tag-desc' ? 'default' : 'tag-desc')}
                        className={cn(
                          "p-0.5 hover:text-black transition-colors rounded shadow-xs -mt-0.5",
                          sortBy === 'tag-desc' ? "text-slate-900 font-extrabold" : "text-slate-350"
                        )}
                        title="Sort Tag Z to A"
                      >
                        <ChevronDown size={10} className="stroke-[3]" />
                      </button>
                    </span>
                  </div>
                </th>
                <th className="px-4 py-2 select-none">
                  <div className="flex items-center gap-1">
                    <span>Tags</span>
                    <span className="flex flex-col ml-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSortBy(sortBy === 'tags-count-asc' ? 'default' : 'tags-count-asc')}
                        className={cn(
                          "p-0.5 hover:text-black transition-colors rounded",
                          sortBy === 'tags-count-asc' ? "text-slate-900 font-extrabold" : "text-slate-350"
                        )}
                        title="Tags Count low to high"
                      >
                        <ChevronUp size={10} className="stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortBy(sortBy === 'tags-count-desc' ? 'default' : 'tags-count-desc')}
                        className={cn(
                          "p-0.5 hover:text-black transition-colors rounded shadow-xs -mt-0.5",
                          sortBy === 'tags-count-desc' ? "text-slate-900 font-extrabold" : "text-slate-350"
                        )}
                        title="Tags Count high to low"
                      >
                        <ChevronDown size={10} className="stroke-[3]" />
                      </button>
                    </span>
                  </div>
                </th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((product) => {
                const isChecked = !!selectedIds[product.id];
                const fallback = product.inventory !== undefined ? product.inventory : (product.inStock ? 50 : 0);
                const realInventory = productInventoryMap.has(product.id) ? productInventoryMap.get(product.id)! : fallback;
                
                return (
                  <tr 
                    key={product.id} 
                    onClick={() => navigate(`/admin/products/${product.id}`)}
                    className={cn(
                      "border-b border-[#e3e3e3] hover:bg-[#f9f9f9] transition-all group cursor-pointer text-sm",
                      isChecked ? "bg-slate-50/70" : ""
                    )}
                  >
                    {/* Checkbox column */}
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="rounded h-4 w-4 text-black border-[#d1d1d1] focus:ring-black accent-black cursor-pointer"
                        checked={isChecked}
                        onChange={(e) => {
                          setSelectedIds(prev => ({
                            ...prev,
                            [product.id]: e.target.checked
                          }));
                        }}
                      />
                    </td>

                    {/* Product visual & pricing */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded border border-[#e3e3e3] bg-white overflow-hidden shrink-0 relative">
                          <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                          {product.isFeatured && (
                            <span className="absolute top-0 right-0 bg-amber-400 text-slate-950 p-0.5 rounded-bl shadow-xs">
                              <Star size={8} className="fill-slate-950 text-slate-950" />
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-[#1a1a1a] group-hover:underline line-clamp-1">{product.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[#616161] text-xs font-mono font-medium">${product.price.toLocaleString()} JMD</span>
                            {product.brand && (
                              <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 uppercase tracking-wider font-mono">
                                {product.brand}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      {(() => {
                        const isProductActive = product.status ? product.status === 'Active' : product.inStock;
                        return (
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            isProductActive 
                              ? "bg-[#ccf2e5] text-[#006e52]" 
                              : "bg-[#ffd5d8] text-[#8e1f0b]"
                          )}>
                            {isProductActive ? 'Active' : 'Draft'}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Inventory level */}
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={cn(
                        product.inStock && realInventory > 10 ? "text-[#1a1a1a]" : (realInventory > 0 ? "text-amber-700 font-bold" : "text-[#8e1f0b] font-bold")
                      )}>
                        {realInventory} in stock
                      </span>
                    </td>

                    {/* Category Label */}
                    <td className="px-4 py-3 text-[#616161] font-medium font-mono text-xs uppercase">
                      {(product.tags && product.tags[0]) || 'General'}
                    </td>

                    {/* Product Tags Column */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        {product.tags && product.tags.length > 0 ? (
                          product.tags.map(tg => (
                            <span 
                              key={tg} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setTagFilter(tg);
                                setShowAdvancedFilters(true);
                              }}
                              className="inline-flex bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-900 border border-slate-200/50 text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-colors font-bold uppercase tracking-wider"
                            >
                              {tg}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-450 text-[10px] italic">-</span>
                        )}
                      </div>
                    </td>

                    {/* Custom Actions column */}
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 relative">
                        {/* Direct Delete icon link action */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductToDelete(product);
                          }}
                          className="p-1.5 text-[#616161] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 size={16} />
                        </button>

                        {/* Dropdown triggers */}
                        <button 
                          onClick={(e) => toggleDropdown(e, product.id)}
                          className={cn(
                            "p-1.5 rounded text-[#616161] hover:text-[#1a1a1a] transition-all",
                            activeDropdownId === product.id ? "bg-[#e3e3e3] text-black" : "hover:bg-[#e3e3e3]"
                          )}
                          title="More Actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        <AnimatePresence>
                          {activeDropdownId === product.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(null);
                                }} 
                              />
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.1 }}
                                className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-[#e3e3e3] rounded-md shadow-lg py-1 z-20 text-left"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(null);
                                    navigate(`/admin/products/${product.id}`);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-[#1a1a1a] hover:bg-[#f6f6f6] flex items-center gap-2 font-medium"
                                >
                                  Edit Product Detail
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(null);
                                    
                                    const isCurrentlyActive = product.status ? product.status === 'Active' : product.inStock;
                                    const nextStatus = isCurrentlyActive ? 'Draft' : 'Active';
                                    
                                    // Check if item has positive inventory
                                    const hasInventory = product.productType === 'variable'
                                      ? (product.variants && product.variants.some((v: any) => (v.inventory || 0) > 0))
                                      : ((product.inventory || 0) > 0);
                                      
                                    updateProduct(product.id, { 
                                      status: nextStatus,
                                      inStock: nextStatus === 'Active' && (product.inventory === undefined || hasInventory)
                                    });
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-[#1a1a1a] hover:bg-[#f6f6f6] flex items-center gap-2 font-medium"
                                >
                                  Mark as {product.status ? (product.status === 'Active' ? 'Draft' : 'Active') : (product.inStock ? 'Draft' : 'Active')}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(null);
                                    const nextFeat = !product.isFeatured;
                                    updateProduct(product.id, { isFeatured: nextFeat });
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-[#1a1a1a] hover:bg-[#f6f6f6] flex items-center gap-2 font-medium"
                                >
                                  {product.isFeatured ? 'Unmark Featured' : 'Mark as Featured'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(null);
                                    navigate(`/product/${product.id}`);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-[#1a1a1a] hover:bg-[#f6f6f6] flex items-center gap-2 font-medium"
                                >
                                  View Live product
                                </button>
                                <div className="border-t border-[#f1f1f1] my-1" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(null);
                                    setProductToDelete(product);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold"
                                >
                                  Delete Product
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedProducts.length === 0 && (
                <tr>
                   <td colSpan={6} className="px-4 py-20 text-center text-[#616161]">
                     <div className="flex flex-col items-center justify-center gap-2">
                       <Filter className="text-slate-350" size={36} />
                       <p className="text-sm font-semibold text-slate-800">No matching catalog records found</p>
                       <p className="text-xs text-slate-500">Try loosening your price bounds, brand choices, or search filter.</p>
                       <button
                         onClick={handleResetFilters}
                         className="mt-2 bg-slate-900 text-white rounded px-4 py-1.5 text-xs font-bold hover:bg-black"
                       >
                         Clear All Filters
                       </button>
                     </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info counts */}
        <div className="p-4 bg-[#f9f9f9] flex justify-between items-center text-sm border-t border-[#e3e3e3]">
          <div className="flex gap-1.5 text-[#616161] font-medium">
            Showing <span className="font-bold text-[#1a1a1a]">{sortedProducts.length}</span> of <span className="font-bold text-[#1a1a1a]">{products.length}</span> total items listed
          </div>
          {selectedCount > 0 && (
            <div className="text-xs text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded border border-slate-200">
              {selectedCount} item{selectedCount > 1 ? 's' : ''} currently checked
            </div>
          )}
        </div>
      </div>

      {/* Unified Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedCount}
        totalCount={products.length}
        onClearSelection={() => setSelectedIds({})}
        onSelectAllPages={() => {
          const nextSel: Record<string, boolean> = {};
          products.forEach(p => {
            nextSel[p.id] = true;
          });
          setSelectedIds(nextSel);
          showToast(`Selected all ${products.length} products across all pages!`, 'success');
        }}
        isAllPagesSelected={products.length > 0 && products.every(p => selectedIds[p.id])}
        loading={bulkLoading}
        loadingMessage="Processing products..."
        actions={[
          {
            id: 'active',
            label: 'Set Active',
            icon: Check,
            variant: 'success' as const,
            onClick: handleBulkActivate
          },
          {
            id: 'draft',
            label: 'Set Draft',
            icon: X,
            onClick: handleBulkDraft
          },
          {
            id: 'archive',
            label: 'Set Archive',
            icon: Archive,
            variant: 'warning' as const,
            onClick: handleBulkArchive
          },
          {
            id: 'restock',
            label: 'Re-Stock',
            icon: Zap,
            onClick: () => {
              const qtyStr = window.prompt("Enter new inventory quantity count for ALL selected products:");
              if (qtyStr !== null) {
                const qty = parseInt(qtyStr, 10);
                if (!isNaN(qty) && qty >= 0) {
                  handleBulkUpdateStock(qty);
                } else {
                  showToast("Please enter a valid non-negative integer for stock count.", "warning");
                }
              }
            }
          },
          {
            id: 'brand',
            label: 'Set Brand',
            icon: Sparkles,
            onClick: () => {
              const brand = window.prompt("Enter brand name for selected products:");
              if (brand && brand.trim()) {
                handleBulkSetBrand(brand.trim());
              }
            }
          },
          {
            id: 'add_tags',
            label: 'Add Tags',
            icon: Tag,
            onClick: () => {
              const tags = window.prompt("Enter tags to add (comma-separated):");
              if (tags && tags.trim()) {
                handleBulkAddTags(tags);
              }
            }
          },
          {
            id: 'remove_tags',
            label: 'Remove Tags',
            icon: Tag,
            onClick: () => {
              const tags = window.prompt("Enter tags to remove (comma-separated):");
              if (tags && tags.trim()) {
                handleBulkRemoveTags(tags);
              }
            }
          },
          {
            id: 'feature',
            label: 'Feature',
            icon: Star,
            onClick: () => handleBulkSetFeatured(true)
          },
          {
            id: 'unfeature',
            label: 'Unfeature',
            icon: Star,
            onClick: () => handleBulkSetFeatured(false)
          },
          {
            id: 'delete',
            label: 'Delete Selected',
            icon: Trash2,
            variant: 'danger' as const,
            requiresConfirm: true,
            confirmTitle: 'Permanently Delete Products?',
            confirmMessage: `Are you absolutely sure you want to permanently delete these ${selectedCount} selected products? This action cannot be undone and will immediately delete all listings from the catalog.`,
            onClick: handleBulkDelete
          }
        ]}
      />

      {/* Confirmation Modal for Single Delete */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProductToDelete(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-white border border-[#e3e3e3] rounded-lg shadow-2xl overflow-hidden z-20"
            >
              <div className="p-6 border-b border-[#f1f1f1] flex justify-between items-center">
                <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider font-mono">Delete Product</h3>
                <button 
                  onClick={() => setProductToDelete(null)}
                  className="p-1 hover:bg-[#f1f1f1] rounded text-[#616161] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4 text-left">
                <p className="text-xs text-[#1a1a1a] leading-relaxed">
                  Are you sure you want to permanently remove <span className="font-bold">"{productToDelete.name}"</span>? This action cannot be undone. Associated inventory counts and catalog details will be erased from Firestore.
                </p>
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded text-red-700 text-[11px] leading-normal">
                  <Trash2 size={16} className="shrink-0" />
                  <span>Deleting will instantly refresh the client-facing store pages and clear cached data.</span>
                </div>
              </div>
              <div className="p-4 bg-[#f9f9f9] border-t border-[#e3e3e3] flex justify-end gap-2.5">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="bg-white border border-[#d1d1d1] text-[#1a1a1a] px-4.5 py-2 rounded-md text-xs font-bold hover:bg-[#f6f6f6] active:scale-98 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const id = productToDelete.id;
                    setProductToDelete(null);
                    await removeProduct(id);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4.5 py-2 rounded-md text-xs font-bold active:scale-98 transition-all shadow-sm animate-flash"
                >
                  Delete Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Bulk Delete */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulkDeleteConfirm(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-white border border-[#e3e3e3] rounded-lg shadow-2xl overflow-hidden z-20"
            >
              <div className="p-6 border-b border-[#f1f1f1] flex justify-between items-center">
                <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider font-mono">Bulk Delete Products</h3>
                <button 
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="p-1 hover:bg-[#f1f1f1] rounded text-[#616161] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4 text-left">
                <p className="text-xs text-[#1a1a1a] leading-relaxed">
                  Are you sure you want to permanently remove all <span className="font-bold">{selectedCount} selected products</span>?
                  This will erase them from your catalog system, delete active images, and disrupt ongoing carts referencing these IDs.
                </p>
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded text-red-700 text-[11px] leading-normal">
                  <Trash2 size={16} className="shrink-0" />
                  <span>This bulk erase is permanent and updates the store listings in real-time.</span>
                </div>
              </div>
              <div className="p-4 bg-[#f9f9f9] border-t border-[#e3e3e3] flex justify-end gap-2.5">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="bg-white border border-[#d1d1d1] text-[#1a1a1a] px-4.5 py-2 rounded-md text-xs font-bold hover:bg-[#f6f6f6] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-4.5 py-2 rounded-md text-xs font-bold transition-all shadow-sm"
                >
                  Confirm Delete Selected
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Upload Wizard Overlay */}
      <AnimatePresence>
        {showBulkUpload && (
          <BulkUploadWizard onClose={() => setShowBulkUpload(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
