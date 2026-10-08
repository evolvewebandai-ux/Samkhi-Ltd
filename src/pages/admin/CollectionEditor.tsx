import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  HelpCircle, 
  Trash2, 
  Plus, 
  X,
  Search,
  ImageIcon,
  Save,
  Copy,
  Activity,
  AlertTriangle,
  Bold,
  Italic,
  Globe,
  Share2,
  Calendar,
  Grid,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Check,
  CheckCircle,
  FileCode2,
  Trash,
  RefreshCw
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, cleanUndefined } from '../../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { useProducts } from '../../context/ProductContext';
import { cn } from '../../lib/utils';
import { showToast } from '../../lib/toast';
import { logActivity } from '../../lib/audit';
import { motion, AnimatePresence } from 'motion/react';
import { matchProductToRules } from './Collections';

interface CollectionCondition {
  id: string;
  field: 'title' | 'tag' | 'type' | 'vendor' | 'price';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
  value: string;
}

export default function CollectionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new' || !id;
  const { products } = useProducts();

  // Core Editor States
  const [title, setTitle] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [collectionType, setCollectionType] = useState<'manual' | 'automated'>('manual');
  
  // Automated Conditions
  const [conditions, setConditions] = useState<CollectionCondition[]>([
    { id: '1', field: 'tag', operator: 'equals', value: '' }
  ]);
  const [conditionOperator, setConditionOperator] = useState<'all' | 'any'>('all');

  // Metadata & Rules
  const [status, setStatus] = useState<'active' | 'draft'>('draft');
  const [publishedChannels, setPublishedChannels] = useState<string[]>(['online_store']);
  const [publishDate, setPublishDate] = useState('');
  const [collectionTemplate, setCollectionTemplate] = useState('default');
  
  // Custom SEO Meta fields
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  // Cover Image
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Manual Products selections & orderings
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [manualSortOrder, setManualSortOrder] = useState<string>('manual'); // 'manual' | 'price_asc' etc.

  // State guards
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [directionToGo, setDirectionToGo] = useState<string | null>(null);

  // Modals state
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Activity & audits trail log
  const [logs, setLogs] = useState<any[]>([]);
  const [lastAutosave, setLastAutosave] = useState<string | null>(null);

  // Generate unique URL handle from input
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setIsDirty(true);
    if (isNew) {
      const slug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setHandle(slug);
      
      // Auto fill SEO suggestion
      if (val.length <= 60) setSeoTitle(val);
    }
  };

  // Load existing collection
  useEffect(() => {
    if (isNew || !id || id === 'new') {
      setIsLoading(false);
      return;
    }

    const docRef = doc(db, 'collections', id);
    const unsub = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTitle(data.title || '');
        setHandle(data.handle || '');
        setDescription(data.description_html || '');
        setCollectionType(data.collection_type || 'manual');
        if (data.rule_set?.conditions) {
          setConditions(data.rule_set.conditions);
        }
        setConditionOperator(data.rule_set?.match || 'all');
        setStatus(data.status || 'draft');
        setPublishedChannels(data.published_channels || ['online_store']);
        setPublishDate(data.publish_date || '');
        setCollectionTemplate(data.collection_template || 'default');
        setSeoTitle(data.seo_title || '');
        setSeoDescription(data.seo_description || '');
        setImageUrl(data.image_url || '');

        // Fetch associated manual product links
        if (data.collection_type === 'manual') {
          const linksQuery = query(
            collection(db, 'collection_products'), 
            where('collection_id', '==', id)
          );
          const linksSnap = await getDocs(linksQuery);
          const links: { product_id: string; position: number }[] = [];
          linksSnap.forEach(d => {
            links.push(d.data() as any);
          });
          // Sort based on saved position field
          links.sort((a, b) => a.position - b.position);
          setSelectedProductIds(links.map(l => l.product_id));
        }
        setIsLoading(false);
      } else {
        showToast("🔴 WARNING - Collection not found in system index.", "error");
        navigate('/admin/collections');
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `collections/${id}`);
      setIsLoading(false);
    });

    return () => unsub();
  }, [id, isNew]);

  // Read associated Audit Log events
  useEffect(() => {
    if (isNew) return;
    const q = query(
      collection(db, 'activityLogs'), 
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const allLogs: any[] = [];
      snapshot.forEach(d => {
        allLogs.push({ id: d.id, ...d.data() });
      });
      // Filter related to this collection
      const filtered = allLogs.filter(log => 
        log.details?.includes(title) || 
        log.details?.includes(id) ||
        log.details?.toLowerCase().includes((title || '').toLowerCase())
      );
      setLogs(filtered.slice(0, 10)); // keep last 10 entries
    });
    return () => unsub();
  }, [id, isNew, title]);

  // Auto-Save background engine: execution interval of 30 seconds
  useEffect(() => {
    if (isNew || !isDirty || status !== 'draft') return;

    const interval = setInterval(() => {
      triggerBackgroundSave();
    }, 30000);

    return () => clearInterval(interval);
  }, [isNew, isDirty, status, title, handle, description, collectionType, conditions, conditionOperator, imageUrl, publishedChannels, publishDate, collectionTemplate, seoTitle, seoDescription, selectedProductIds]);

  const triggerBackgroundSave = async () => {
    if (isNew || !id || id === 'new') return;
    try {
      const docRef = doc(db, 'collections', id);
      const collPayload = cleanUndefined({
        title,
        handle,
        description_html: description,
        collection_type: collectionType,
        rule_set: collectionType === 'automated' ? {
          match: conditionOperator,
          conditions: conditions.map(c => ({ field: c.field, operator: c.operator, value: c.value }))
        } : null,
        status,
        published_channels: publishedChannels,
        publish_date: publishDate,
        collection_template: collectionTemplate,
        seo_title: seoTitle,
        seo_description: seoDescription,
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      });

      await updateDoc(docRef, collPayload);
      
      // Update manual products listing position indices
      if (collectionType === 'manual') {
        const batch = writeBatch(db);
        
        // Remove existing links
        const existingLinksQuery = query(collection(db, 'collection_products'), where('collection_id', '==', id));
        const linksSnap = await getDocs(existingLinksQuery);
        linksSnap.forEach(d => {
          batch.delete(doc(db, 'collection_products', d.id));
        });

        // Insert fresh links
        selectedProductIds.forEach((prodId, idx) => {
          const key = `${id}_${prodId}`;
          batch.set(doc(db, 'collection_products', key), {
            id: key,
            collection_id: id,
            product_id: prodId,
            position: idx
          });
        });
        await batch.commit();
      }

      setLastAutosave(new Date().toLocaleTimeString());
      setIsDirty(false);
    } catch (e) {
      console.warn("Autosave draft background save failed:", e);
    }
  };

  // Automated Criteria Live Match Checklist evaluations
  const EvaluatedMatches = useMemo(() => {
    if (collectionType !== 'automated') return [];
    return products.filter(p => matchProductToRules(p, {
      match: conditionOperator,
      conditions
    }));
  }, [products, collectionType, conditionOperator, conditions]);

  // Image base64 mock upload loader helper
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    const files = 'dataTransfer' in e ? e.dataTransfer.files : e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      showToast("Only image catalog items are accepted.", "warning");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    
    const interval = setInterval(() => {
      setUploadProgress(p => {
        if (p >= 90) {
          clearInterval(interval);
          return 90;
        }
        return p + 20;
      });
    }, 150);

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Str = e.target?.result as string;
      setTimeout(() => {
        clearInterval(interval);
        setImageUrl(base64Str);
        setIsUploading(false);
        setUploadProgress(100);
        setIsDirty(true);
        showToast("🟢 EXECUTED - Cover photo loaded in sandbox.");
      }, 600);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleCoverUpload(e);
  };

  // Conditions modification rules
  const addCondition = () => {
    setConditions([...conditions, { 
      id: Math.random().toString(36).substring(2, 9), 
      field: 'tag', 
      operator: 'equals', 
      value: '' 
    }]);
    setIsDirty(true);
  };

  const removeCondition = (cId: string) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter(c => c.id !== cId));
      setIsDirty(true);
    }
  };

  const updateCondition = (cId: string, updates: Partial<CollectionCondition>) => {
    setConditions(conditions.map(c => c.id === cId ? { ...c, ...updates } as CollectionCondition : c));
    setIsDirty(true);
  };

  // Description format helpers
  const applyToolbarFormat = (styleType: 'bold' | 'italic') => {
    const el = document.getElementById('description-area') as HTMLTextAreaElement;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.slice(start, end);
    let wrapperText = '';
    if (styleType === 'bold') {
      wrapperText = `<strong>${selected || "bold text"}</strong>`;
    } else {
      wrapperText = `<em>${selected || "italic text"}</em>`;
    }
    const result = text.slice(0, start) + wrapperText + text.slice(end);
    setDescription(result);
    setIsDirty(true);
    el.focus();
  };

  // MANUAL PRODUCTS SELECTION & ORDERING FUNCTIONS
  const handleRemoveManualProduct = (pId: string) => {
    setSelectedProductIds(selectedProductIds.filter(id => id !== pId));
    setIsDirty(true);
    showToast("Product unlinked from collection draft.");
  };

  const handleMoveProductPosition = (index: number, direction: 'up' | 'down') => {
    const updated = [...selectedProductIds];
    if (direction === 'up' && index > 0) {
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
    } else if (direction === 'down' && index < updated.length - 1) {
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
    }
    setSelectedProductIds(updated);
    setIsDirty(true);
  };

  // Sorting of selected manual products based on sorting list choice
  const sortedManualProducts = useMemo(() => {
    const selectedProductsObjs = selectedProductIds.map(pId => products.find(p => p.id === pId)).filter(Boolean) as any[];
    if (manualSortOrder === 'price_asc') {
      return [...selectedProductsObjs].sort((a, b) => a.price - b.price);
    } else if (manualSortOrder === 'price_desc') {
      return [...selectedProductsObjs].sort((a, b) => b.price - a.price);
    } else if (manualSortOrder === 'name_asc') {
      return [...selectedProductsObjs].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (manualSortOrder === 'newest') {
      return [...selectedProductsObjs].reverse(); // newly picked has higher list index
    }
    // Default manual index mapping
    return selectedProductIds.map(pId => products.find(p => p.id === pId)).filter(Boolean) as any[];
  }, [selectedProductIds, products, manualSortOrder]);

  const filteredPickerProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(productSearchQuery.toLowerCase())))
    );
  }, [products, productSearchQuery]);

  // SAVE SUBMISSION TRANSACTION
  const handleSaveCollection = async () => {
    if (!title.trim()) {
      showToast("Collection Title is required.", "warning");
      return;
    }
    if (!handle.trim()) {
      showToast("URL handle alias is required.", "warning");
      return;
    }

    try {
      const finalId = (isNew || !id || id === 'new') ? `col-${Math.random().toString(36).substring(2, 9)}` : id;
      const docRef = doc(db, 'collections', finalId);

      // Verify URL handle uniqueness
      const handleQuery = query(collection(db, 'collections'), where('handle', '==', handle));
      const handleSnap = await getDocs(handleQuery);
      let handleConflict = false;
      handleSnap.forEach(snap => {
        if (snap.id !== finalId) {
          handleConflict = true;
        }
      });

      if (handleConflict) {
        showToast("This URL handle is already taken. Please input a unique slug.", "warning");
        return;
      }

      const collPayload = cleanUndefined({
        id: finalId,
        title,
        handle,
        description_html: description,
        collection_type: collectionType,
        rule_set: collectionType === 'automated' ? {
          match: conditionOperator,
          conditions: conditions.map(c => ({ field: c.field, operator: c.operator, value: c.value }))
        } : null,
        status,
        published_channels: publishedChannels,
        publish_date: publishDate,
        collection_template: collectionTemplate,
        seo_title: seoTitle || title,
        seo_description: seoDescription || description.replace(/<[^>]*>/g, '').substring(0, 160),
        image_url: imageUrl,
        created_at: isNew ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString()
      });

      const batch = writeBatch(db);
      
      // Update/Set collection details
      if (isNew) {
        batch.set(docRef, collPayload);
      } else {
        batch.update(docRef, collPayload);
      }

      // Handle manual products pairing links table transactional indices writes
      if (collectionType === 'manual') {
        const existingLinksQuery = query(collection(db, 'collection_products'), where('collection_id', '==', finalId));
        const linksSnap = await getDocs(existingLinksQuery);
        linksSnap.forEach(d => {
          batch.delete(doc(db, 'collection_products', d.id));
        });

        selectedProductIds.forEach((prodId, idx) => {
          const key = `${finalId}_${prodId}`;
          batch.set(doc(db, 'collection_products', key), {
            id: key,
            collection_id: finalId,
            product_id: prodId,
            position: idx
          });
        });
      }

      await batch.commit();

      await logActivity(`${isNew ? 'Created' : 'Updated'} collection "${title}" (${collectionType})`);
      showToast(`🟢 EXECUTED - Collection ${isNew ? 'created' : 'updated'} successfully.`);
      setIsDirty(false);
      navigate('/admin/collections');
    } catch (err) {
      showToast("🔴 WARNING - Transaction write failed.", "error");
    }
  };

  // DUPLICATE HANDLER FOR EDIT MODE
  const handleDuplicateCollection = async () => {
    if (isNew) return;
    try {
      const newId = `col-${Math.random().toString(36).substring(2, 9)}`;
      const newRef = doc(db, 'collections', newId);
      
      const payload = cleanUndefined({
        id: newId,
        title: `Copy of ${title}`,
        handle: `${handle}-copy-${Math.random().toString(36).substring(2, 4)}`,
        description_html: description,
        collection_type: collectionType,
        rule_set: collectionType === 'automated' ? {
          match: conditionOperator,
          conditions
        } : null,
        status: 'draft',
        published_channels: publishedChannels,
        publish_date: publishDate,
        collection_template: collectionTemplate,
        seo_title: `Copy of ${seoTitle || title}`,
        seo_description: seoDescription,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      await setDoc(newRef, payload);
      await logActivity(`Duplicated collection "${title}" to create "Copy of ${title}"`);
      showToast("🟢 EXECUTED - Collection duplicated successfully. Loading workspace...");
      navigate(`/admin/collections/${newId}`);
    } catch (err) {
      showToast("🔴 WARNING - Duplications error.", "error");
    }
  };

  // DELETION HANDLER WITH ACCURATE TITLE CHECK
  const handleDeleteCollection = async () => {
    if (isNew || !id || id === 'new') return;
    if (deleteConfirmText !== title && deleteConfirmText !== 'DELETE') {
      showToast("Confirmation keyword mismatch.", "warning");
      return;
    }

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'collections', id));

      // Remove relational product assignments links
      const qLinks = query(collection(db, 'collection_products'), where('collection_id', '==', id));
      const activeSnaps = await getDocs(qLinks);
      activeSnaps.forEach(d => {
        batch.delete(doc(db, 'collection_products', d.id));
      });

      await batch.commit();
      await logActivity(`Deleted collection "${title}" and associated mappings`);
      showToast(`🟢 EXECUTED - Collection ${title} deleted.`);
      setShowDeleteModal(false);
      setIsDirty(false);
      navigate('/admin/collections');
    } catch (err) {
      showToast("🔴 WARNING - Deletion error occurred.", "error");
    }
  };

  // Back arrow with safe dirty modal dialog state switcher
  const handleBackNavigation = () => {
    if (isDirty) {
      setDirectionToGo('/admin/collections');
      setShowUnsavedModal(true);
    } else {
      navigate('/admin/collections');
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f1f1] pb-32 text-slate-900">
      {/* Dynamic Saving Indicator Top Bar banner */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#e3e3e3] px-6 py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBackNavigation}
              className="p-1.5 hover:bg-[#e3e3e3] rounded-lg transition-colors border border-slate-205 bg-white shrink-0 text-slate-600 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <h1 className="text-sm font-black tracking-tight flex items-center gap-2">
                {isNew ? (
                  <>
                    <Sparkles size={16} className="text-indigo-500 animate-pulse" />
                    Create solar collection
                  </>
                ) : (
                  <>
                    <Grid size={16} className="text-slate-600" />
                    {title || "Untitled collection draft"}
                  </>
                )}
              </h1>
              {lastAutosave && (
                <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Autosaved: {lastAutosave}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isNew && (
              <button 
                onClick={handleDuplicateCollection}
                className="bg-white border border-slate-300 hover:bg-slate-55 text-slate-700 px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Copy size={13} />
                Duplicate
              </button>
            )}

            <button 
              onClick={handleBackNavigation}
              className="bg-white border border-slate-300 hover:bg-slate-55 text-slate-705 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Discard
            </button>
            <button 
              onClick={handleSaveCollection}
              className="bg-black hover:bg-slate-90 w-full sm:w-auto text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Save size={13} />
              Save Catalog
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-32 text-center text-xs text-slate-500 space-y-4">
          <RefreshCw className="animate-spin text-slate-600 mx-auto" size={32} />
          <p className="font-bold">Syncing Collection Parameters with Firestore Database...</p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Editing Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Title & Description workspace */}
            <section className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#1a1a1a] mb-1">Collection Title <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. Inverters & Chargers, High Efficiency Panels"
                    required
                    value={title}
                    onChange={e => handleTitleChange(e.target.value)}
                    className="w-full bg-white border border-[#d1d1d1] rounded-lg py-2 px-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-[#1a1a1a]">Description Story (HTML support)</label>
                    <div className="flex gap-1.5">
                      <button 
                        type="button"
                        onClick={() => applyToolbarFormat('bold')}
                        className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded text-xs leading-none shrink-0"
                        title="Bold selection HTML snippet"
                      >
                        <Bold size={11} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => applyToolbarFormat('italic')}
                        className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded text-xs leading-none shrink-0"
                        title="Italic selection HTML snippet"
                      >
                        <Italic size={11} />
                      </button>
                    </div>
                  </div>
                  <div className="border border-[#d1d1d1] rounded-lg overflow-hidden file-upload bg-white">
                    <textarea 
                      id="description-area"
                      rows={6}
                      placeholder="Input beautiful Jamaican solar context story writeup, catalogs guide or guidelines details..."
                      value={description}
                      onChange={e => {
                        setDescription(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full p-3 text-xs outline-none resize-none font-medium leading-relaxed bg-white"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Collection Type Selector */}
            <section className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1a1a1a] mb-4">Collection structure type</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={cn(
                  "p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all hover:bg-slate-50/50",
                  collectionType === 'manual' ? "border-slate-900 bg-slate-50/30 font-bold" : "border-[#e3e3e3]"
                )}>
                  <input 
                    type="radio" 
                    name="structure" 
                    checked={collectionType === 'manual'}
                    onChange={() => {
                      setCollectionType('manual');
                      setIsDirty(true);
                    }}
                    className="mt-0.5 accent-black" 
                  />
                  <div>
                    <p className="text-xs font-bold text-[#1a1a1a]">Manual Listing</p>
                    <p className="text-[10px] text-[#616161] mt-1 font-medium leading-normal">Manually draft individual panels, lithium batteries or charge controllers. Reorder them using sorting controls.</p>
                  </div>
                </label>

                <label className={cn(
                  "p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all hover:bg-slate-50/50",
                  collectionType === 'automated' ? "border-slate-900 bg-slate-50/30 font-bold" : "border-[#e3e3e3]"
                )}>
                  <input 
                    type="radio" 
                    name="structure" 
                    checked={collectionType === 'automated'}
                    onChange={() => {
                      setCollectionType('automated');
                      setIsDirty(true);
                    }}
                    className="mt-0.5 accent-black" 
                  />
                  <div>
                    <p className="text-xs font-bold text-[#1a1a1a]">Automated / Smart Filters</p>
                    <p className="text-[10px] text-[#616161] mt-1 font-medium leading-normal">Define dynamic conditions matching pricing threshold, manufacturing brands or specific catalog tags.</p>
                  </div>
                </label>
              </div>
            </section>

            {/* MANUAL PRODUCTS SELECTION WORKSPACE */}
            {collectionType === 'manual' && (
              <section className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1a1a1a] flex items-center gap-1.5">
                      Manual Products Layout
                      <span className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                        {selectedProductIds.length} Linked
                      </span>
                    </h3>
                    <p className="text-[10px] text-[#616161] mt-0.5">Control items sequencing manually using up/down arrow buttons.</p>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => setProductPickerOpen(true)}
                    className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-black/80 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    Browse Products
                  </button>
                </div>

                {sortedManualProducts.length === 0 ? (
                  <div className="border border-dashed border-slate-200 py-12 rounded-lg text-center text-slate-400 space-y-2">
                    <ImageIcon className="mx-auto" size={28} />
                    <p className="text-xs font-medium">No products linked inside this manual solar list.</p>
                    <button 
                      type="button"
                      onClick={() => setProductPickerOpen(true)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Connect your first product
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Manual sequencing sorter */}
                    <div className="flex justify-between items-center bg-[#f9f9f9] p-2 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>Linked Product</span>
                      <div className="flex items-center gap-4 pr-2">
                        <span>List Ordering Sequence</span>
                        <select 
                          value={manualSortOrder}
                          onChange={e => setManualSortOrder(e.target.value)}
                          className="bg-white border border-slate-350 p-1 text-[10px] rounded"
                        >
                          <option value="manual">Manual Sequence Ordering</option>
                          <option value="price_asc">Price: Low to High (JMD)</option>
                          <option value="price_desc">Price: High to Low (JMD)</option>
                          <option value="name_asc">Alphabetical A-Z</option>
                          <option value="newest">Newest Selected First</option>
                        </select>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden bg-white">
                      {sortedManualProducts.map((p, index) => (
                        <div key={p.id} className="flex justify-between items-center p-3 hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <img src={p.imageUrl} className="w-9 h-9 object-cover rounded border border-slate-200" alt="" />
                            <div>
                              <p className="text-xs font-bold text-slate-900 line-clamp-1">{p.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-500 font-medium">
                                <span>${p.price.toLocaleString()} JMD</span>
                                <span className="bg-slate-100 px-1 rounded uppercase tracking-wider text-[9px]">Stock: {p.inventory || 0}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Seq Adjusters */}
                            {manualSortOrder === 'manual' && (
                              <div className="flex gap-1">
                                <button 
                                  type="button"
                                  onClick={() => handleMoveProductPosition(index, 'up')}
                                  disabled={index === 0}
                                  className="p-1 hover:bg-slate-100 border border-slate-200 rounded text-slate-600 disabled:opacity-30"
                                >
                                  <ArrowUp size={11} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleMoveProductPosition(index, 'down')}
                                  disabled={index === sortedManualProducts.length - 1}
                                  className="p-1 hover:bg-slate-100 border border-slate-200 rounded text-slate-600 disabled:opacity-30"
                                >
                                  <ArrowDown size={11} />
                                </button>
                              </div>
                            )}

                            <button 
                              type="button"
                              onClick={() => handleRemoveManualProduct(p.id)}
                              className="p-1 hover:bg-rose-50 text-rose-600 border border-rose-100 rounded"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* AUTOMATED CONDITIONS RULES WORKSPACE */}
            {collectionType === 'automated' && (
              <section className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1a1a1a]">Automated Smart Checklist Filters</h3>
                    <p className="text-[10px] text-[#616161] mt-0.5">Control filters logic matching rules for products matching below conditions.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-slate-600 bg-[#f9f9f9] p-3 rounded-lg border border-slate-205">
                  <span className="text-[10px] uppercase text-slate-400">Match conditions:</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="cond-operator" 
                        checked={conditionOperator === 'all'}
                        onChange={() => {
                          setConditionOperator('all');
                          setIsDirty(true);
                        }}
                        className="accent-black" 
                      />
                      All conditions (AND)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="cond-operator" 
                        checked={conditionOperator === 'any'}
                        onChange={() => {
                          setConditionOperator('any');
                          setIsDirty(true);
                        }}
                        className="accent-black" 
                      />
                      Any condition (OR)
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  {conditions.map((item, index) => (
                    <div key={item.id} className="flex flex-col sm:flex-row gap-2 bg-slate-50/50 p-2.5 rounded-lg border border-slate-105">
                      {/* Field selectors */}
                      <select 
                        value={item.field}
                        onChange={e => updateCondition(item.id, { field: e.target.value as any })}
                        className="flex-1 bg-white border border-[#d1d1d1] rounded-lg py-1.5 px-3 text-xs font-bold outline-none"
                      >
                        <option value="title">Product title</option>
                        <option value="tag">Product tag/collection</option>
                        <option value="type font-mono">Primary Tag</option>
                        <option value="vendor">Product Vendor/Brand</option>
                        <option value="price">Product price</option>
                      </select>

                      {/* Operator selector */}
                      <select 
                        value={item.operator}
                        onChange={e => updateCondition(item.id, { operator: e.target.value as any })}
                        className="flex-1 bg-white border border-[#d1d1d1] rounded-lg py-1.5 px-3 text-xs font-bold outline-none"
                      >
                        <option value="equals">is equal to</option>
                        <option value="not_equals">is not equal to</option>
                        <option value="contains">contains pattern</option>
                        <option value="not_contains">does not contain</option>
                        {item.field !== 'tag' && (
                          <>
                            <option value="starts_with">starts with</option>
                            <option value="ends_with">ends with</option>
                          </>
                        )}
                        {(item.field === 'price') && (
                          <>
                            <option value="greater_than">is greater than</option>
                            <option value="less_than">is less than</option>
                          </>
                        )}
                      </select>

                      {/* Value comparator */}
                      <input 
                        type={item.field === 'price' ? 'number' : 'text'}
                        placeholder="Value input comparison..."
                        value={item.value}
                        onChange={e => updateCondition(item.id, { value: e.target.value })}
                        className="flex-[1.5] bg-white border border-[#d1d1d1] rounded-lg py-1.5 px-3 text-xs font-bold outline-none"
                      />

                      {/* Trash action button */}
                      <button 
                        type="button"
                        onClick={() => removeCondition(item.id)}
                        disabled={conditions.length === 1}
                        className="p-1.5 text-[#616161] hover:text-[#1a1a1a] hover:bg-[#e3e3e3] rounded-lg transition-colors border border-slate-200 bg-white disabled:opacity-30 self-end sm:self-center shrink-0 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button 
                  type="button"
                  onClick={addCondition}
                  className="border border-[#d1d1d1] bg-white text-xs font-extrabold text-[#1a1a1a] px-3.5 py-1.5 rounded-lg hover:bg-[#f6f6f6] transition-colors cursor-pointer"
                >
                  Add another condition
                </button>

                {/* AUTOMATED COLLECTION MATCH PREVIEW LIST */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Dynamic Matching Logs ({EvaluatedMatches.length} Products)</span>
                    {EvaluatedMatches.length > 0 && (
                      <span className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer">View first 20 products</span>
                    )}
                  </div>
                  
                  {EvaluatedMatches.length === 0 ? (
                    <div className="bg-[#fcf8e3]/45 border border-[#f0ecb9] rounded-lg p-3 text-[10px] text-amber-800 font-medium">
                      ⚠️ No current products in solar inventory catalog match definitions draft. Adjust filters parameters above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-slate-100 p-2 rounded-lg bg-slate-50/50">
                      {EvaluatedMatches.slice(0, 20).map(p => (
                        <div key={p.id} className="flex items-center gap-2 text-[10px] p-1 border border-slate-102 bg-white rounded truncate">
                          <img src={p.imageUrl} className="w-6 h-6 object-cover rounded" alt="" />
                          <div className="truncate flex-1">
                            <span className="font-extrabold block text-slate-800 truncate">{p.name}</span>
                            <span className="font-mono text-[9px] text-[#2e7d32]">${p.price.toLocaleString()} JMD</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Custom SEO engine & listing panel preview */}
            <section className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1a1a1a]">Google Search Engine Preview</h3>
                <span className="text-[10px] text-slate-400 font-mono italic">SEO customization</span>
              </div>

              <div className="bg-white border border-slate-200/60 p-4 rounded-xl shadow-xs space-y-1">
                <span className="text-[10px] text-emerald-700 font-mono">https://jamaicasolarstore.com/collections/{handle || "url-slug"}</span>
                <h4 className="text-base text-blue-800 font-medium hover:underline tracking-tight cursor-pointer leading-tight line-clamp-1">
                  {seoTitle || title || "Collection display catalog title - Solar Jamaica"}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {seoDescription || description.replace(/<[^>]*>/g, '').substring(0, 160) || "Explore Jamaica high quality solar arrays, inverters and charge controllers from Samkhi partners."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#1a1a1a]">SEO Custom Title</label>
                    <span className={cn(
                      "text-[9px] font-mono",
                      seoTitle.length > 60 ? "text-rose-600 font-bold" : "text-slate-400"
                    )}>{seoTitle.length}/60 chars</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Provide optimized display title..."
                    value={seoTitle}
                    onChange={e => {
                      setSeoTitle(e.target.value);
                      setIsDirty(true);
                    }}
                    maxLength={80}
                    className="w-full bg-white border border-[#d1d1d1] rounded-lg py-1.5 px-3 text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#1a1a1a]">URL Handle Slug</label>
                    <span className="text-[9px] text-slate-400">Must be unique</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="URL slug path suffix..."
                    value={handle}
                    onChange={e => {
                      setHandle(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                      setIsDirty(true);
                    }}
                    className="w-full bg-white border border-[#d1d1d1] rounded-lg py-1.5 px-3 text-xs font-mono font-bold outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#1a1a1a]">SEO Custom Description</label>
                    <span className={cn(
                      "text-[9px] font-mono",
                      seoDescription.length > 160 ? "text-rose-600 font-bold" : "text-slate-400"
                    )}>{seoDescription.length}/160 chars</span>
                  </div>
                  <textarea 
                    rows={2}
                    placeholder="Short summary preview shown in search results catalog snippets..."
                    value={seoDescription}
                    onChange={e => {
                      setSeoDescription(e.target.value);
                      setIsDirty(true);
                    }}
                    maxLength={220}
                    className="w-full bg-white border border-[#d1d1d1] rounded-lg py-1.5 px-3 text-xs outline-none resize-none font-medium text-slate-700"
                  />
                </div>
              </div>
            </section>

            {/* DYNAMIC ACTIVITY LOG PANEL */}
            {!isNew && logs.length > 0 && (
              <section className="bg-slate-900 text-white rounded-xl shadow-xs border border-slate-800 p-5 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Activity size={14} />
                  Operational Audits history list
                </h4>
                <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto pr-2">
                  {logs.map(log => (
                    <div key={log.id} className="py-2.5 text-[11px] font-medium flex justify-between gap-4">
                      <span className="text-slate-300 leading-normal">{log.details}</span>
                      <span className="text-slate-500 font-mono text-[10px] shrink-0">
                        {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* DANGEROUS DELETION MODULE (only in edit mode) */}
            {!isNew && (
              <section className="bg-rose-50/40 border border-rose-250 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle size={15} />
                    Danger zone operations
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">Permanently purge collection elements. This action does not delete child solar pieces or inv levels from the warehouse catalog databases.</p>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    setDeleteConfirmText('');
                    setShowDeleteModal(true);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 py-2 rounded-lg transition-all shadow-md shrink-0 cursor-pointer"
                >
                  Delete collection
                </button>
              </section>
            )}
          </div>

          {/* Sidebar parameters selection */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Catalog Status & Schedule */}
            <section className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Collection Visibility Status</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setStatus('active');
                      setIsDirty(true);
                    }}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer",
                      status === 'active' 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-350 shadow-xs" 
                        : "bg-white text-slate-500 border-slate-205 hover:bg-slate-50"
                    )}
                  >
                    Active
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setStatus('draft');
                      setIsDirty(true);
                    }}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer",
                      status === 'draft' 
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs" 
                        : "bg-white text-slate-500 border-slate-205 hover:bg-slate-50"
                    )}
                  >
                    Draft
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar size={12} />
                  Scheduled Publish Date
                </label>
                <input 
                  type="datetime-local" 
                  value={publishDate}
                  onChange={e => {
                    setPublishDate(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-705 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1 italic">Leave blank to publish instantly on status check.</p>
              </div>
            </section>

            {/* Channels configuration */}
            <section className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5 space-y-3">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Sales channels access</h3>
              
              <div className="space-y-2">
                <label className="flex items-center justify-between cursor-pointer p-1">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-blue-500" />
                    <span className="text-xs font-bold">Online storefront catalog</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={publishedChannels.includes('online_store')}
                    onChange={e => {
                      const next = e.target.checked 
                        ? [...publishedChannels, 'online_store'] 
                        : publishedChannels.filter(c => c !== 'online_store');
                      setPublishedChannels(next);
                      setIsDirty(true);
                    }}
                    className="accent-black h-4 w-4 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <div className="flex items-center gap-2">
                    <Share2 size={13} className="text-indigo-505" />
                    <span className="text-xs font-bold">POS / Retail cashier access</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={publishedChannels.includes('pos')}
                    onChange={e => {
                      const next = e.target.checked 
                        ? [...publishedChannels, 'pos'] 
                        : publishedChannels.filter(c => c !== 'pos');
                      setPublishedChannels(next);
                      setIsDirty(true);
                    }}
                    className="accent-black h-4 w-4 rounded"
                  />
                </label>
              </div>
            </section>

            {/* Theme / Template selectors */}
            <section className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5 space-y-3">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Roster Template selection</h3>
              <div>
                <select 
                  value={collectionTemplate}
                  onChange={e => {
                    setCollectionTemplate(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full bg-white border border-slate-350 rounded-lg p-2 text-xs font-bold outline-none"
                >
                  <option value="default">Default roster grid list</option>
                  <option value="subgrid">Sub-grid split layout</option>
                  <option value="hero-banner">Immersive hero showcase</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1 italic">Determines storefront listing grid size density and layout rules.</p>
              </div>
            </section>

            {/* Drag Drop Cover Image photo */}
            <section className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Collection Cover Photo</span>
                {imageUrl && (
                  <button 
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      setIsDirty(true);
                    }}
                    className="text-[10px] font-bold text-rose-600 hover:underline"
                  >
                    Clear photo
                  </button>
                )}
              </div>

              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={cn(
                  "aspect-square rounded-xl border-2 border-dashed border-[#d1d1d1] flex flex-col items-center justify-center gap-2 text-center text-slate-500 bg-[#fafafa]/50 hover:bg-[#fafafa] hover:border-slate-400 transition-all cursor-pointer relative overflow-hidden group",
                  imageUrl ? "p-0" : "p-4"
                )}
              >
                {isUploading ? (
                  <div className="space-y-2 p-4 text-center">
                    <RefreshCw className="animate-spin text-slate-500 mx-auto" size={24} />
                    <span className="text-[10px] font-bold text-slate-600">Uploading cover: {uploadProgress}%</span>
                    <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden mx-auto">
                      <div className="bg-black h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                ) : imageUrl ? (
                  <img src={imageUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <>
                    <ImageIcon size={28} className="text-slate-300 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-slate-700">Drag file here or click</p>
                    <p className="text-[9px] text-slate-400">Recommendation: PNG, JPEG (under 2MB)</p>
                  </>
                )}
                {!imageUrl && !isUploading && (
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* MULTI_SELECT PRODUCT PICKER MODAL */}
      <AnimatePresence>
        {productPickerOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-205"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-extrabold text-sm text-slate-800">Select Solar Products</h3>
                <button onClick={() => setProductPickerOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              {/* Search picker input */}
              <div className="p-3 bg-slate-50 border-b border-slate-100 relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Filter elements name or type..."
                  value={productSearchQuery}
                  onChange={e => setProductSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg py-1 pl-8 pr-4 text-xs font-semibold outline-none"
                />
              </div>

              {/* Products checklists */}
              <div className="p-4 max-h-80 overflow-y-auto space-y-2">
                {filteredPickerProducts.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">No matching solar elements found.</p>
                ) : (
                  filteredPickerProducts.map(p => {
                    const isChecked = selectedProductIds.includes(p.id);
                    return (
                      <label 
                        key={p.id} 
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors",
                          isChecked ? "bg-slate-50 border-slate-900" : "bg-white border-slate-200 hover:bg-slate-50/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <img src={p.imageUrl} className="w-8 h-8 rounded object-cover" alt="" />
                          <div>
                            <span className="font-extrabold block text-slate-800">{p.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">${p.price.toLocaleString()} JMD</span>
                          </div>
                        </div>
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedProductIds([...selectedProductIds, p.id]);
                            } else {
                              setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                            }
                            setIsDirty(true);
                          }}
                          className="accent-black h-4 w-4"
                        />
                      </label>
                    );
                  })
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-600">{selectedProductIds.length} elements mapped</span>
                <button 
                  onClick={() => setProductPickerOpen(false)}
                  className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold"
                >
                  Confirm Mapping
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UNSAVED CHANGES GUARD MODAL */}
      <AnimatePresence>
        {showUnsavedModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-205 p-6 space-y-4"
            >
              <div className="flex gap-3 text-amber-500 items-start">
                <AlertTriangle size={32} className="shrink-0" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Unsaved collection changes</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    You have modification drafts left unsaved. Navigating away will lose recent edits.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => setShowUnsavedModal(false)}
                  className="bg-white border border-slate-300 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50"
                >
                  Keep Editing
                </button>
                <button 
                  onClick={() => {
                    setIsDirty(false);
                    setShowUnsavedModal(false);
                    if (directionToGo) {
                      navigate(directionToGo);
                    }
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold"
                >
                  Discard Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETION CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-205"
            >
              <div className="p-5 border-b border-rose-100 bg-rose-50/50">
                <h3 className="font-extrabold text-sm text-rose-800">Confirm Global Collection Destruction</h3>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-500 leading-normal">
                  Are you absolutely sure you want to permanently destory <span className="font-bold text-slate-900">"{title || 'collection'}"</span>? 
                  This will erase all sorting metadata details and database linkages indexes catalog items. This operation is irreversible.
                </p>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Type collection name: <span className="font-bold text-slate-900 font-mono select-none">"{title}"</span> or <span className="font-mono text-slate-905">"DELETE"</span> to confirm
                  </label>
                  <input 
                    type="text"
                    placeholder="Input exact matching string..."
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold outline-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="bg-white border border-slate-300 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteCollection}
                    disabled={deleteConfirmText !== title && deleteConfirmText !== 'DELETE'}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30"
                  >
                    Confirm Destruction
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
