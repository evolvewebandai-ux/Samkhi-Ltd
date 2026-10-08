import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Edit2, 
  GitMerge, 
  Trash2, 
  Tag as TagIcon,
  HelpCircle,
  RefreshCw,
  TrendingUp,
  X
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, cleanUndefined } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useProducts } from '../../context/ProductContext';
import { showToast } from '../../lib/toast';
import { logActivity } from '../../lib/audit';
import { motion, AnimatePresence } from 'motion/react';

interface TagDoc {
  id: string; // slugified
  name: string;
  slug: string;
  products_count?: number;
  created_at?: string;
}

export default function AdminTags() {
  const navigate = useNavigate();
  const { products, updateProduct } = useProducts();
  
  const [tags, setTags] = useState<TagDoc[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [collections, setCollections] = useState<any[]>([]);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  
  const [editTag, setEditTag] = useState<TagDoc | null>(null);
  const [editTagName, setEditTagName] = useState('');
  
  const [mergeSource, setMergeSource] = useState<TagDoc | null>(null);
  const [mergeTargetSlug, setMergeTargetSlug] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TagDoc | null>(null);

  // Load collections to find tags usage in rule sets
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'collections'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setCollections(list);
    }, (error) => {
      console.warn("Error reading collections for tags check:", error);
    });
    return () => unsub();
  }, []);

  // Monitor tags collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tags'), (snapshot) => {
      const list: TagDoc[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() } as TagDoc);
      });
      setTags(list);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tags');
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // Tag normalization helper
  const normalizeTag = (val: string) => {
    return val.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
  };

  // Compile combined system tags (explicit Firestore tags + any tags present on products)
  const unifiedTags = React.useMemo(() => {
    const productTagsMap = new Map<string, { count: number; name: string }>();
    
    // Scan products for real-time counts
    products.forEach(p => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach(t => {
          if (!t) return;
          const clean = t.trim();
          const slug = normalizeTag(clean);
          if (slug) {
            const current = productTagsMap.get(slug) || { count: 0, name: clean };
            productTagsMap.set(slug, { count: current.count + 1, name: current.name });
          }
        });
      }
    });

    // Merge explicitly defined Firestore tags + product tags
    const allUniqueSlugs = new Set([
      ...tags.map(t => t.slug),
      ...Array.from(productTagsMap.keys())
    ]);

    return Array.from(allUniqueSlugs).map(slug => {
      const dbTag = tags.find(t => t.slug === slug);
      const prodTagInfo = productTagsMap.get(slug);

      // Collections count calculation
      const collCount = collections.filter(c => {
        if (c.collection_type === 'automated' && c.rule_set?.conditions) {
          return c.rule_set.conditions.some((rule: any) => 
            rule.field === 'tag' && rule.value?.toLowerCase() === slug
          );
        }
        return false;
      }).length;

      return {
        id: slug,
        slug,
        name: dbTag?.name || prodTagInfo?.name || slug,
        products_count: prodTagInfo?.count || 0,
        collections_count: collCount,
        created_at: dbTag?.created_at || new Date().toISOString()
      };
    });
  }, [tags, products, collections]);

  const filteredTags = unifiedTags.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  // 1. CREATE TAG
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newTagName.trim();
    if (!cleanName) return;
    const slug = normalizeTag(cleanName);
    
    if (unifiedTags.some(t => t.slug === slug)) {
      showToast("A tag with this name already exists.", "warning");
      return;
    }

    try {
      const ref = doc(db, 'tags', slug);
      await setDoc(ref, {
        id: slug,
        name: cleanName,
        slug,
        products_count: 0,
        created_at: new Date().toISOString()
      });
      
      await logActivity(`Created global catalog tag: "${cleanName}"`);
      showToast("🟢 EXECUTED - Tag created successfully.");
      setNewTagName('');
      setCreateOpen(false);
    } catch (err) {
      showToast("🔴 WARNING - Failed to create tag.", "error");
    }
  };

  // 2. RENAME / EDIT TAG
  const handleSaveEditTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTag) return;
    const cleanName = editTagName.trim();
    if (!cleanName) return;
    
    const newSlug = normalizeTag(cleanName);
    const oldSlug = editTag.slug;

    if (newSlug !== oldSlug && unifiedTags.some(t => t.slug === newSlug)) {
      showToast("A tag with this destination name already exists. Consider merging instead.", "warning");
      return;
    }

    try {
      // Create transaction/batch
      const batch = writeBatch(db);

      if (newSlug === oldSlug) {
        // Just title change
        batch.update(doc(db, 'tags', oldSlug), { name: cleanName });
      } else {
        // Slug change: create new doc, delete old one
        batch.set(doc(db, 'tags', newSlug), {
          id: newSlug,
          name: cleanName,
          slug: newSlug,
          created_at: editTag.created_at || new Date().toISOString()
        });
        batch.delete(doc(db, 'tags', oldSlug));
      }

      // Update associated products (replacing old tag with new tag)
      let productsUpdated = 0;
      products.forEach(p => {
        if (p.tags && p.tags.includes(editTag.name)) {
          const updatedTags = p.tags.map(t => t === editTag.name ? cleanName : t);
          batch.update(doc(db, 'products', p.id), { tags: updatedTags });
          productsUpdated++;
        }
      });

      await batch.commit();
      await logActivity(`Renamed tag "${editTag.name}" to "${cleanName}" across ${productsUpdated} products`);
      showToast("🟢 EXECUTED - Tag renamed successfully.");
      setEditTag(null);
    } catch (err) {
      showToast("🔴 WARNING - Failed updating tag.", "error");
    }
  };

  // 3. MERGE TAG
  const handleMergeTags = async () => {
    if (!mergeSource || !mergeTargetSlug) return;
    if (mergeSource.slug === mergeTargetSlug) {
      showToast("Source and target tags cannot be identical.", "warning");
      return;
    }

    const targetTag = unifiedTags.find(t => t.slug === mergeTargetSlug);
    if (!targetTag) return;

    setIsMerging(true);
    try {
      const batch = writeBatch(db);

      // Update associated products
      let productsUpdated = 0;
      products.forEach(p => {
        const hasSource = p.tags && (p.tags.includes(mergeSource.name) || p.tags.includes(mergeSource.slug));
        if (hasSource) {
          // Remove source, ensure target exists without duplication
          const filtered = (p.tags || []).filter(t => t !== mergeSource.name && t !== mergeSource.slug);
          if (!filtered.includes(targetTag.name)) {
            filtered.push(targetTag.name);
          }
          batch.update(doc(db, 'products', p.id), { tags: filtered });
          productsUpdated++;
        }
      });

      // Remove source tag from db
      batch.delete(doc(db, 'tags', mergeSource.slug));

      await batch.commit();
      await logActivity(`Merged tag "${mergeSource.name}" into "${targetTag.name}" across ${productsUpdated} products`);
      showToast(`🟢 EXECUTED - Merged "${mergeSource.name}" into "${targetTag.name}"`);
      setMergeSource(null);
      setMergeTargetSlug('');
    } catch (err) {
      showToast("🔴 WARNING - Failed to merge tags.", "error");
    } finally {
      setIsMerging(false);
    }
  };

  // 4. DELETE TAG
  const handleDeleteTag = async () => {
    if (!deleteTarget) return;

    try {
      const batch = writeBatch(db);
      
      // Remove tag from products
      let productsUpdated = 0;
      products.forEach(p => {
        if (p.tags && p.tags.includes(deleteTarget.name)) {
          const filtered = p.tags.filter(t => t !== deleteTarget.name && t !== deleteTarget.slug);
          batch.update(doc(db, 'products', p.id), { tags: filtered });
          productsUpdated++;
        }
      });

      // Delete tag doc
      batch.delete(doc(db, 'tags', deleteTarget.slug));

      await batch.commit();
      await logActivity(`Deleted tag "${deleteTarget.name}" from ${productsUpdated} products`);
      showToast("🟢 EXECUTED - Tag deleted globally.");
      setDeleteTarget(null);
    } catch (err) {
      showToast("🔴 WARNING - Failed to delete tag.", "error");
    }
  };

  return (
    <div className="p-8 pb-32 max-w-[1400px] mx-auto text-[#1a1a1a]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/collections')}
            className="p-1 hover:bg-[#e3e3e3] rounded-lg transition-colors text-[#616161] border border-slate-200 bg-white"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1a1a1a] flex items-center gap-2">
              <TagIcon size={20} className="text-[#616161]" />
              Global Tags Console
            </h1>
            <p className="text-xs text-[#616161]">Normalize, rename, and batch merge product catalog tags globally.</p>
          </div>
        </div>
        
        <button 
          onClick={() => setCreateOpen(true)}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-black/90 transition-all shadow-sm cursor-pointer"
        >
          <Plus size={16} />
          Create global tag
        </button>
      </div>

      {/* Grid Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Normalized Categories</p>
          <p className="text-2xl font-bold font-mono text-slate-900">{filteredTags.length} Unique Tags</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Most Active Products Pill</p>
          <p className="text-2xl font-bold font-mono text-emerald-600">
            {products.filter(p => p.tags && p.tags.length > 0).length} Tagged Elements
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xs text-white">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Automated Hooks</p>
          <p className="text-2xl font-bold font-mono text-amber-400">
            {collections.filter(c => c.collection_type === 'automated').length} Smart Collections
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#e3e3e3] overflow-hidden">
        {/* Search tool */}
        <div className="p-3 border-b border-[#e3e3e3] bg-[#f9f9f9] flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#616161]" size={16} />
            <input 
              type="text" 
              placeholder="Search tag name or slugs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-[#d1d1d1] rounded-lg py-1.5 pl-8 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        {/* Tags Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
              <RefreshCw className="animate-spin text-slate-500 mx-auto" size={24} />
              <p>Re-indexing active database tag catalogs...</p>
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-500 space-y-1">
              <TagIcon size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700">No tags indexed</p>
              <p>Define new tag names above to expand search filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f9f9f9] border-b border-[#e3e3e3] text-[10px] font-bold text-[#616161] uppercase tracking-wider">
                  <th className="px-6 py-3">Tag Name</th>
                  <th className="px-6 py-3">Database Slug</th>
                  <th className="px-6 py-3 text-center">Products Linked</th>
                  <th className="px-6 py-3 text-center">Auto-Collections Hooks</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTags.map((tag) => (
                  <tr 
                    key={tag.id} 
                    className="border-b border-[#e3e3e3] hover:bg-[#f9f9f9] transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <TagIcon size={12} className="text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors">{tag.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">
                      {tag.slug}
                    </td>
                    <td className="px-6 py-3.5 text-center font-bold">
                      {tag.products_count > 0 ? (
                        <span className="text-emerald-700 font-mono bg-emerald-50 px-2.5 py-0.5 rounded-full">{tag.products_count} elements</span>
                      ) : (
                        <span className="text-slate-400 font-mono italic">0 products</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center font-bold">
                      {tag.collections_count > 0 ? (
                        <span className="text-blue-700 font-mono bg-blue-50 px-2.5 py-0.5 rounded-full">{tag.collections_count} active</span>
                      ) : (
                        <span className="text-slate-400 font-mono italic">0 matched</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditTag(tag);
                            setEditTagName(tag.name);
                          }}
                          className="p-1 hover:bg-slate-100 border border-slate-200 bg-white text-slate-700 rounded-md transition-all flex items-center gap-1 font-bold text-[10px]"
                          title="Rename Tag"
                        >
                          <Edit2 size={12} />
                          Rename
                        </button>
                        <button 
                          onClick={() => {
                            setMergeSource(tag);
                            setMergeTargetSlug('');
                          }}
                          className="p-1 hover:bg-slate-100 border border-slate-200 bg-white text-amber-700 rounded-md transition-all flex items-center gap-1 font-bold text-[10px]"
                          title="Merge Tag into Another"
                        >
                          <GitMerge size={12} />
                          Merge
                        </button>
                        <button 
                          onClick={() => setDeleteTarget(tag)}
                          className="p-1 hover:bg-rose-50 border border-rose-200 bg-white text-rose-600 rounded-md transition-all flex items-center gap-1 font-bold text-[10px]"
                          title="Delete Tag"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CREATE TAG MODAL */}
      <AnimatePresence>
        {createOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200"
            >
              <div className="p-5 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm">Create global catalog tag</h3>
                  <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <form onSubmit={handleCreateTag} className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tag Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. monocrystalline"
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 italic">Normalized to slug auto-saving rules.</p>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="bg-white border border-slate-300 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-black/90"
                  >
                    Create Tag
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENAME MODAL */}
      <AnimatePresence>
        {editTag && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200"
            >
              <div className="p-5 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm">Rename global tag</h3>
                  <button onClick={() => setEditTag(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <form onSubmit={handleSaveEditTag} className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-3">
                    Renaming <span className="font-bold">"{editTag.name}"</span> will automatically update it across <span className="font-bold text-indigo-700">{editTag.products_count} associated products</span>.
                  </p>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">New Tag Name</label>
                  <input 
                    type="text" 
                    required
                    value={editTagName}
                    onChange={e => setEditTagName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button"
                    onClick={() => setEditTag(null)}
                    className="bg-white border border-slate-300 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-black/90"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MERGE MODAL */}
      <AnimatePresence>
        {mergeSource && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200"
            >
              <div className="p-5 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm">Merge tag elements</h3>
                  <button onClick={() => setMergeSource(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Merging <span className="font-bold">"{mergeSource.name}"</span> will remove it, transferring all <span className="font-bold text-emerald-700">{mergeSource.products_count} product linkages</span> into your selected target tag.
                </p>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Target Tag Destination</label>
                  <select 
                    value={mergeTargetSlug}
                    onChange={e => setMergeTargetSlug(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    <option value="">-- Choose destination tag --</option>
                    {unifiedTags.filter(t => t.slug !== mergeSource.slug).map(t => (
                      <option key={t.slug} value={t.slug}>{t.name} ({t.products_count} elements)</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button"
                    onClick={() => setMergeSource(null)}
                    className="bg-white border border-slate-300 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleMergeTags}
                    disabled={!mergeTargetSlug || isMerging}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {isMerging ? "Merging Tag indexes..." : "Merge Tags"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200"
            >
              <div className="p-5 border-b border-rose-100 bg-rose-50/50">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-rose-800">Delete tag globally?</h3>
                  <button onClick={() => setDeleteTarget(null)} className="text-slate-400 hover:text-rose-600">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed col-span-2">
                  Are you sure you want to permanently delete <span className="font-bold text-slate-900">"{deleteTarget.name}"</span>?
                  This will strip this tag from all <span className="font-bold text-rose-700">{deleteTarget.products_count} linked products</span>. This operation is irreversible.
                </p>
                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="bg-white border border-slate-300 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50"
                  >
                    Keep tag
                  </button>
                  <button 
                    onClick={handleDeleteTag}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md"
                  >
                    Delete globally
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
