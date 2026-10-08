import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  SlidersHorizontal, 
  Plus, 
  ImageIcon, 
  ChevronRight, 
  ChevronLeft,
  Settings,
  X,
  Check,
  Trash2,
  Tag,
  Globe,
  Share2,
  Download,
  Copy,
  FolderMinus,
  RefreshCw
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, onSnapshot, writeBatch, doc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { useProducts } from '../../context/ProductContext';
import { cn } from '../../lib/utils';
import { showToast } from '../../lib/toast';
import { logActivity } from '../../lib/audit';
import { motion, AnimatePresence } from 'motion/react';
import BulkActionBar from '../../components/admin/BulkActionBar';

// Client-side rule evaluator for automated collections
export function matchProductToRules(product: any, ruleSet: any): boolean {
  if (!ruleSet || !ruleSet.conditions || ruleSet.conditions.length === 0) return false;
  
  const results = ruleSet.conditions.map((cond: any) => {
    let prodValue = "";
    if (cond.field === 'title') prodValue = product.name || "";
    else if (cond.field === 'tag') {
      const tags = product.tags || [];
      const val = cond.value?.toLowerCase() || "";
      if (cond.operator === 'equals') return tags.some((t: string) => t.toLowerCase() === val);
      if (cond.operator === 'not_equals') return !tags.some((t: string) => t.toLowerCase() === val);
      if (cond.operator === 'contains') return tags.some((t: string) => t.toLowerCase().includes(val));
      if (cond.operator === 'not_contains') return !tags.some((t: string) => t.toLowerCase().includes(val));
      return false;
    }
    else if (cond.field === 'type') prodValue = (product.tags && product.tags[0]) || "";
    else if (cond.field === 'vendor') prodValue = product.brand || "";
    else if (cond.field === 'price') {
      const pPrice = Number(product.price) || 0;
      const cValue = Number(cond.value) || 0;
      if (cond.operator === 'equals') return pPrice === cValue;
      if (cond.operator === 'not_equals') return pPrice !== cValue;
      if (cond.operator === 'greater_than') return pPrice > cValue;
      if (cond.operator === 'less_than') return pPrice < cValue;
      return false;
    }

    const testVal = String(prodValue).toLowerCase();
    const condVal = String(cond.value).toLowerCase();

    switch (cond.operator) {
      case 'equals': return testVal === condVal;
      case 'not_equals': return testVal !== condVal;
      case 'contains': return testVal.includes(condVal);
      case 'not_contains': return !testVal.includes(condVal);
      case 'starts_with': return testVal.startsWith(condVal);
      case 'ends_with': return testVal.endsWith(condVal);
      case 'greater_than': return Number(prodValue) > Number(cond.value);
      case 'less_than': return Number(prodValue) < Number(cond.value);
      default: return false;
    }
  });

  if (ruleSet.match === 'any') {
    return results.some(r => r === true);
  } else {
    return results.every(r => r === true);
  }
}

export default function AdminCollections() {
  const navigate = useNavigate();
  const { products } = useProducts();

  // Firestore States
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionProducts, setCollectionProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'alphabetical' | 'count' | 'updated'>('newest');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Sync snapshot collections
  useEffect(() => {
    setIsLoading(true);
    const unsubColl = onSnapshot(collection(db, 'collections'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setCollections(list);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'collections');
      setIsLoading(false);
    });

    const unsubLinks = onSnapshot(collection(db, 'collection_products'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setCollectionProducts(list);
    }, (error) => {
      console.warn("Unable to fetch manual collection products sorting indices:", error);
    });

    return () => {
      unsubColl();
      unsubLinks();
    };
  }, []);

  // Compute live products count for each collection
  const CollectionsWithStats = useMemo(() => {
    return collections.map(col => {
      let matchedCount = 0;
      if (col.collection_type === 'automated') {
        matchedCount = products.filter(p => matchProductToRules(p, col.rule_set)).length;
      } else {
        matchedCount = collectionProducts.filter(link => link.collection_id === col.id).length;
      }
      return {
        ...col,
        liveProductCount: matchedCount
      };
    });
  }, [collections, products, collectionProducts]);

  // Debounced search & sorting sequence
  const searchedCollections = useMemo(() => {
    return CollectionsWithStats.filter(c => 
      (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.handle || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [CollectionsWithStats, search]);

  const sortedCollections = useMemo(() => {
    const list = [...searchedCollections];
    if (sortBy === 'newest') {
      list.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
    } else if (sortBy === 'alphabetical') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'count') {
      list.sort((a, b) => (b.liveProductCount || 0) - (a.liveProductCount || 0));
    } else if (sortBy === 'updated') {
      list.sort((a, b) => {
        const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return timeB - timeA;
      });
    }
    return list;
  }, [searchedCollections, sortBy]);

  // Pagination bounds
  const totalPages = Math.ceil(sortedCollections.length / itemsPerPage) || 1;
  const paginatedCollections = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedCollections.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedCollections, currentPage]);

  const selectedCount = Object.keys(selectedIds).filter(id => selectedIds[id]).length;

  // Handlers for bulk actions
  const toggleSelectAll = (checked: boolean) => {
    const nextSel: Record<string, boolean> = {};
    if (checked) {
      paginatedCollections.forEach(c => {
        nextSel[c.id] = true;
      });
    }
    setSelectedIds(nextSel);
  };

  const handleBulkPublish = async (status: 'active' | 'draft') => {
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id] && id.trim() !== '');
    const batch = writeBatch(db);
    ids.forEach(id => {
      batch.update(doc(db, 'collections', id), { status, updated_at: new Date().toISOString() });
    });
    try {
      await batch.commit();
      await logActivity(`Bulk updated status of ${ids.length} collections to ${status}`);
      showToast(`🟢 EXECUTED - Published ${ids.length} collections.`);
      setSelectedIds({});
    } catch (e) {
      showToast("🔴 WARNING - Bulk publish failed.", "error");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id] && id.trim() !== '');
    if (!window.confirm(`Are you sure you want to delete ${ids.length} checked collections? This does not delete any products.`)) return;
    
    const batch = writeBatch(db);
    ids.forEach(id => {
      batch.delete(doc(db, 'collections', id));
    });

    // Clean collection_products pairing links
    const relevantLinks = collectionProducts.filter(link => ids.includes(link.collection_id));
    relevantLinks.forEach(link => {
      batch.delete(doc(db, 'collection_products', link.id));
    });

    try {
      await batch.commit();
      await logActivity(`Bulk deleted ${ids.length} collections`);
      showToast(`🟢 EXECUTED - Deleted ${ids.length} collections.`);
      setSelectedIds({});
    } catch (e) {
      showToast("🔴 WARNING - Bulk deletion failed.", "error");
    }
  };

  const handleBulkAddChannel = async (channel: 'online_store' | 'pos') => {
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id] && id.trim() !== '');
    const batch = writeBatch(db);

    ids.forEach(id => {
      const col = collections.find(c => c.id === id);
      if (col) {
        const channels = col.published_channels || [];
        if (!channels.includes(channel)) {
          batch.update(doc(db, 'collections', id), {
            published_channels: [...channels, channel],
            updated_at: new Date().toISOString()
          });
        }
      }
    });

    try {
      await batch.commit();
      await logActivity(`Bulk added channel "${channel}" to ${ids.length} collections`);
      showToast(`🟢 EXECUTED - Added "${channel}" channel.`);
      setSelectedIds({});
    } catch (e) {
      showToast("🔴 WARNING - Bulk update failed.", "error");
    }
  };

  // CSV EXPORT ENGINE
  const handleExportCSV = () => {
    const headers = [
      'Collection ID', 'Title', 'Handle', 'Type', 'Products Count', 'Status', 'SEO Title', 'SEO Description', 'Updated At'
    ];
    const rows = sortedCollections.map(c => [
      c.id,
      c.title || '',
      c.handle || '',
      c.collection_type || '',
      c.liveProductCount || 0,
      c.status || '',
      c.seo_title || '',
      c.seo_description || '',
      c.updated_at || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `collections_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("🟢 EXECUTED - Collections catalog CSV downloaded.");
    setShowMoreDropdown(false);
  };

  // DUPLICATE COLLECTION
  const handleBulkDuplicate = async () => {
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    if (ids.length === 0) {
      showToast("Select at least 1 collection to duplicate.", "warning");
      return;
    }

    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        const copyFrom = collections.find(c => c.id === id);
        if (copyFrom) {
          const newId = `col-${Math.random().toString(36).substring(2, 9)}`;
          const duplicated = {
            ...copyFrom,
            id: newId,
            title: `Copy of ${copyFrom.title}`,
            handle: `${copyFrom.handle || 'collection'}-copy-${Math.random().toString(36).substring(2, 5)}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          delete (duplicated as any).id; // delete old reference key to make clean Firestore write
          batch.set(doc(db, 'collections', newId), duplicated);
        }
      });
      await batch.commit();
      await logActivity(`Duplicated ${ids.length} collections`);
      showToast(`🟢 EXECUTED - Duplicated ${ids.length} collections.`);
      setSelectedIds({});
      setShowMoreDropdown(false);
    } catch (err) {
      showToast("🔴 WARNING - Duplications error.", "error");
    }
  };

  return (
    <div className="p-8 pb-32 max-w-[1400px] mx-auto text-[#1a1a1a]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1a1a1a] mb-1">Collections Directory</h1>
          <p className="text-xs text-[#616161]">Organize Jamaica Solar Store products into manual catalogs or dynamic state groupings.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Tags Console Link */}
          <button 
            onClick={() => navigate('/admin/collections/tags')}
            className="bg-white border border-[#d1d1d1] px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-[#f6f6f6] transition-colors flex items-center gap-1.5"
          >
            <Tag size={13} className="text-slate-500" />
            Manage Tags
          </button>

          {/* More actions dropdown container */}
          <div className="relative">
            <button 
              onClick={() => setShowMoreDropdown(!showMoreDropdown)}
              className="bg-white border border-[#d1d1d1] px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-[#f6f6f6] transition-colors"
            >
              More actions
            </button>
            {showMoreDropdown && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-30 p-1 text-xs">
                <button 
                  onClick={handleExportCSV}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors rounded flex items-center gap-2 text-slate-700"
                >
                  <Download size={13} />
                  Export to CSV
                </button>
                <button 
                  onClick={handleBulkDuplicate}
                  disabled={selectedCount === 0}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors rounded flex items-center gap-2 text-slate-705 disabled:opacity-50"
                >
                  <Copy size={13} />
                  Duplicate Selected
                </button>
                <button 
                  onClick={handleBulkDelete}
                  disabled={selectedCount === 0}
                  className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 transition-colors rounded flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  Delete Selected
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => navigate('/admin/collections/new')}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-black/90 transition-all cursor-pointer shadow-sm ml-auto sm:ml-0"
          >
            <Plus size={16} />
            Create collection
          </button>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e3e3e3] overflow-hidden">
        {/* Search Bar / Filter Sliders Toggle */}
        <div className="p-3 border-b border-[#e3e3e3] bg-[#f9f9f9] flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#616161]" size={16} />
            <input 
              type="text" 
              placeholder="Search by title, handle, or vendor rules..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-[#d1d1d1] rounded-lg py-1.5 pl-8 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-black font-semibold text-slate-800"
            />
          </div>
          <button 
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={cn(
              "p-2 rounded-lg border transition-all text-[#616161] flex items-center gap-1 text-xs font-bold",
              showFiltersPanel ? "bg-slate-900 text-white border-slate-900" : "bg-white border-[#d1d1d1] hover:bg-[#f6f6f6]"
            )}
          >
            <SlidersHorizontal size={14} />
            <span>Sorting options</span>
          </button>
        </div>

        {/* Collapsible Filter sequence */}
        <AnimatePresence>
          {showFiltersPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50/50 border-b border-[#e3e3e3] overflow-hidden"
            >
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-600">
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Sort Sequence</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Newest Created', value: 'newest' },
                      { label: 'Title alphabetical A-Z', value: 'alphabetical' },
                      { label: 'Product count size', value: 'count' },
                      { label: 'Last updated stamp', value: 'updated' }
                    ].map(item => (
                      <button
                        key={item.value}
                        onClick={() => setSortBy(item.value as any)}
                        className={cn(
                          "px-3 py-1.5 rounded-md border text-xs font-semibold cursor-pointer",
                          sortBy === item.value 
                            ? "bg-slate-900 text-white border-slate-900" 
                            : "bg-white text-slate-600 border-slate-205 hover:bg-slate-50"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table layout */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
              <RefreshCw className="animate-spin text-slate-500 mx-auto" size={24} />
              <p>Re-indexing Firestore collections catalog...</p>
            </div>
          ) : sortedCollections.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-500 space-y-3">
              <FolderMinus size={36} className="mx-auto text-slate-300" />
              <div>
                <p className="font-extrabold text-sm text-slate-800">No solar collections found</p>
                <p className="text-slate-500 mt-1 max-w-sm mx-auto">Create products manual/automated lists to simplify client shopping discovery paths.</p>
              </div>
              <button 
                onClick={() => navigate('/admin/collections/new')}
                className="mt-2 bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                Create your first collection
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs min-w-[900px]">
              <thead>
                <tr className="bg-[#f9f9f9] border-b border-[#e3e3e3] text-[10px] font-bold text-[#616161] uppercase tracking-wider">
                  <th className="px-5 py-3 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded accent-black h-4 w-4 cursor-pointer"
                      checked={paginatedCollections.length > 0 && paginatedCollections.every(c => selectedIds[c.id])}
                      onChange={e => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="px-5 py-3 w-16">Cover Image</th>
                  <th className="px-5 py-3">Collection Details</th>
                  <th className="px-5 py-3">Catalog Status</th>
                  <th className="px-5 py-3 text-center">Products Count</th>
                  <th className="px-5 py-3">Automatic Match Criteria</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCollections.map((collection) => {
                  const isChecked = !!selectedIds[collection.id];
                  return (
                    <tr 
                      key={collection.id} 
                      onClick={() => navigate(`/admin/collections/${collection.id}`)}
                      className={cn(
                        "border-b border-[#e3e3e3] hover:bg-[#f9f9f9] transition-all group cursor-pointer",
                        isChecked ? "bg-slate-50/70" : ""
                      )}
                    >
                      <td className="px-5 py-4 w-12 text-center" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded accent-black h-4 w-4 cursor-pointer"
                          checked={isChecked}
                          onChange={e => {
                            setSelectedIds(prev => ({
                              ...prev,
                              [collection.id]: e.target.checked
                            }));
                          }}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-10 h-10 rounded-lg border border-[#e3e3e3] bg-[#f8f9fa] flex items-center justify-center overflow-hidden shrink-0">
                          {collection.image_url ? (
                            <img src={collection.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={14} className="text-[#888]" />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#1a1a1a] group-hover:underline text-sm">{collection.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{collection.handle}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                          collection.status === 'active' 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                            : "bg-slate-50 text-slate-600 border border-slate-200"
                        )}>
                          {collection.status || 'draft'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/products?collection=${collection.id}`);
                          }}
                          className="font-bold font-mono text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          {collection.liveProductCount || 0}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-slate-500 max-w-sm">
                        {collection.collection_type === 'automated' && collection.rule_set?.conditions ? (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase text-indigo-700">Automated ({collection.rule_set.match})</span>
                            <div className="truncate text-[10px]">
                              {collection.rule_set.conditions.map((cond: any, idx: number) => (
                                <span key={idx} className="inline-block bg-slate-100 px-1 rounded mr-1">
                                  {cond.field} {cond.operator.replace('_', ' ')} "{cond.value}"
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="italic text-slate-400">Manual assignments</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Dynamic Pagination Controls */}
        {sortedCollections.length > 0 && (
          <div className="p-3 border-t border-[#e3e3e3] bg-[#f9f9f9] flex justify-between items-center text-xs">
            <span className="text-[#616161] font-medium">
              Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold">{Math.min(currentPage * itemsPerPage, sortedCollections.length)}</span> of <span className="font-bold font-mono">{sortedCollections.length}</span> collections
            </span>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded border border-[#d1d1d1] flex items-center justify-center text-[#616161] hover:bg-white bg-white shadow-xs disabled:opacity-50"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="w-12 h-8 rounded border border-slate-200 flex items-center justify-center font-bold bg-white text-slate-850">
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded border border-[#d1d1d1] flex items-center justify-center text-[#616161] hover:bg-white bg-white shadow-xs disabled:opacity-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Unified Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedCount}
        totalCount={collections.length}
        onClearSelection={() => setSelectedIds({})}
        onSelectAllPages={() => {
          const nextSel: Record<string, boolean> = {};
          collections.forEach(c => {
            nextSel[c.id] = true;
          });
          setSelectedIds(nextSel);
          showToast(`Selected all ${collections.length} collections across all pages!`, 'success');
        }}
        isAllPagesSelected={collections.length > 0 && collections.every(c => selectedIds[c.id])}
        actions={[
          {
            id: 'active',
            label: 'Set Active',
            icon: Check,
            variant: 'success' as const,
            onClick: () => handleBulkPublish('active')
          },
          {
            id: 'draft',
            label: 'Set Draft',
            icon: X,
            onClick: () => handleBulkPublish('draft')
          },
          {
            id: 'channel_online',
            label: 'Add Online Store',
            icon: Globe,
            onClick: () => handleBulkAddChannel('online_store')
          },
          {
            id: 'channel_pos',
            label: 'Add POS Channel',
            icon: Share2,
            onClick: () => handleBulkAddChannel('pos')
          },
          {
            id: 'delete',
            label: 'Delete Selected',
            icon: Trash2,
            variant: 'danger' as const,
            requiresConfirm: true,
            confirmTitle: 'Permanently Delete Collections?',
            confirmMessage: `Are you absolutely sure you want to permanently delete these ${selectedCount} selected collections? This action is irreversible.`,
            onClick: handleBulkDelete
          }
        ]}
      />
    </div>
  );
}
