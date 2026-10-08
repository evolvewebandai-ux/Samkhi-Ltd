import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  Upload, 
  Image as ImageIcon, 
  X, 
  Settings, 
  Bold, 
  Italic, 
  Underline, 
  Link as LinkIcon, 
  List, 
  MoreHorizontal,
  ChevronDown,
  Info,
  Search,
  Zap,
  Globe,
  Tag,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldAlert,
  Eye,
  Archive,
  AlertTriangle,
  History,
  FileText,
  Sliders,
  Package,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Percent,
  CheckCircle2,
  ArrowLeftRight,
  PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useProducts } from '../../context/ProductContext';
import { useInventory } from '../../context/InventoryContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { collection, addDoc, onSnapshot, writeBatch, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { matchProductToRules } from './Collections';
import { showToast } from '../../lib/toast';
import { logActivity } from '../../lib/audit';

// Import subcomponents
import ProductPreviewModal from '../../components/admin/product/ProductPreviewModal';
import DuplicateProductModal from '../../components/admin/product/DuplicateProductModal';
import StockAdjustmentModal from '../../components/admin/product/StockAdjustmentModal';
import VariantEditModal from '../../components/admin/product/VariantEditModal';
import SEOTab from '../../components/admin/product/SEOTab';
import HistoryTab from '../../components/admin/product/HistoryTab';

interface GalleryImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  altText: string;
  isPrimary: boolean;
  order: number;
}

export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, addProduct, updateProduct, removeProduct } = useProducts();
  const { inventoryLevels, addInventoryLevel, updateInventoryLevel, isSynced } = useInventory();
  const { user: adminUser } = useAdminAuth();

  const isEditing = !!id && id !== 'new';
  const product = isEditing ? products.find(p => p.id === id) : null;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'details' | 'variants' | 'inventory' | 'seo' | 'history'>('details');

  // Initialization flag
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(false);
  }, [id]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [descPreviewMode, setDescPreviewMode] = useState(false);
  const [shortDescription, setShortDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Draft' | 'Archived'>('Active');
  
  // Pricing
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [costPerItem, setCostPerItem] = useState('');

  // Sku & Barcodes
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [inventoryTracked, setInventoryTracked] = useState(true);
  const [quantity, setQuantity] = useState('0');
  const [lowInventoryThreshold, setLowInventoryThreshold] = useState('10');
  
  // Organization
  const [category, setCategory] = useState('led-lighting');
  const [vendor, setVendor] = useState('Samkhi Limited');
  const [tags, setTags] = useState<string[]>([]);
  const [specificationsList, setSpecificationsList] = useState<{ key: string; value: string }[]>([]);

  // Product Type Customizations (Simple, Variable, Grouped)
  const [productType, setProductType] = useState<'simple' | 'variable' | 'grouped'>('simple');
  const [groupedProductIds, setGroupedProductIds] = useState<string[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  // Gallery Images State
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);
  
  // Zoom magnifier states
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);

  // Lightbox view state
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Alt Text Modal settings
  const [showAltTextModal, setShowAltTextModal] = useState(false);
  const [altTextImageId, setAltTextImageId] = useState<string | null>(null);
  const [tempAltText, setTempAltText] = useState('');

  // Add image from URL states
  const [showAddUrlModal, setShowAddUrlModal] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');
  const [isImagePreviewLoading, setIsImagePreviewLoading] = useState(false);
  const [imagePreviewHasError, setImagePreviewHasError] = useState(false);
  const [imagePreviewLoaded, setImagePreviewLoaded] = useState(false);

  // Debounce URL changes to verify the link
  useEffect(() => {
    if (!newImageUrl.trim()) {
      setIsImagePreviewLoading(false);
      setImagePreviewHasError(false);
      setImagePreviewLoaded(false);
      return;
    }

    setIsImagePreviewLoading(true);
    setImagePreviewHasError(false);
    setImagePreviewLoaded(false);

    const timer = setTimeout(() => {
      if (newImageUrl.trim()) {
        const tempImg = new Image();
        tempImg.onload = () => {
          setIsImagePreviewLoading(false);
          setImagePreviewHasError(false);
          setImagePreviewLoaded(true);
        };
        tempImg.onerror = () => {
          setIsImagePreviewLoading(false);
          setImagePreviewHasError(true);
          setImagePreviewLoaded(false);
        };
        tempImg.src = newImageUrl.trim();
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [newImageUrl]);

  // Variants State
  const [options, setOptions] = useState<{ id: string; name: string; values: string[] }[]>(
    [{ id: '1', name: 'Size', values: [] }]
  );
  const [variants, setVariants] = useState<any[]>([]);
  const [editingVariant, setEditingVariant] = useState<any | null>(null);

  // SEO States
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoSlug, setSeoSlug] = useState('');

  // Intermediary stock updates
  const [stockHistoryList, setStockHistoryList] = useState<any[]>([]);

  // Dynamic Collections state
  const [dbCollections, setDbCollections] = useState<any[]>([]);
  const [dbCollectionProducts, setDbCollectionProducts] = useState<any[]>([]);
  const [selectedManualCollectionIds, setSelectedManualCollectionIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubColl = onSnapshot(collection(db, 'collections'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      if (list.length === 0) {
        import('../../data').then(m => {
          setDbCollections(m.COLLECTIONS);
        });
      } else {
        setDbCollections(list);
      }
    }, (error) => {
      console.warn("Unable to fetch collections, falling back to static", error);
      import('../../data').then(m => {
        setDbCollections(m.COLLECTIONS);
      });
    });

    const unsubLinks = onSnapshot(collection(db, 'collection_products'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setDbCollectionProducts(list);
    }, (error) => {
      console.warn("Unable to fetch collection links", error);
    });

    return () => {
      unsubColl();
      unsubLinks();
    };
  }, []);

  // Update selectedManualCollectionIds when links are loaded
  useEffect(() => {
    if (isEditing && product) {
      const mapped = dbCollectionProducts
        .filter(link => link.product_id === product.id)
        .map(link => link.collection_id);
      setSelectedManualCollectionIds(mapped);
    }
  }, [dbCollectionProducts, product, isEditing]);

  // Modals state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalDir, setStockModalDir] = useState<'add' | 'remove'>('add');

  // Rules modals support
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [copiedRule, setCopiedRule] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast confirmation
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Log in ActivityLogs collection helper
  const logAuditInFirestore = async (action: string, details: string) => {
    try {
      const email = adminUser?.email || 'System Admin';
      await addDoc(collection(db, 'activityLogs'), {
        timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        action,
        actor: email,
        details,
        productId: isEditing ? id : 'new'
      });
    } catch (e) {
      console.warn("Trouble logging activity in Firestore: ", e);
    }
  };

  // Initialize/sync data
  useEffect(() => {
    if (product && isSynced && !isInitialized) {
      setTitle(product.name || '');
      setDescription(product.description || '');
      setShortDescription(product.shortDescription || '');
      setStatus(product.status || (product.inStock ? 'Active' : 'Draft'));
      setPrice(product.price?.toString() || '');
      setCompareAtPrice(product.compareAtPrice?.toString() || '');
      setCostPerItem(product.costPrice?.toString() || '');
      setCategory((product as any).category || (product.tags && product.tags[0]) || 'led-lighting');
      setVendor(product.brand || 'Samkhi Limited');
      setTags(product.tags || []);
      setProductType(product.productType || 'simple');
      setGroupedProductIds(product.groupedProductIds || []);

      // Specifications list conversion
      if (product.specifications) {
         setSpecificationsList(Object.entries(product.specifications).map(([key, value]) => ({ key, value })));
      } else {
         setSpecificationsList([]);
      }

      // Sync subcomponent states
      setSeoTitle(product.seo?.pageTitle || product.name || '');
      setSeoDescription(product.seo?.metaDescription || '');
      setSeoSlug(product.seo?.urlSlug || '');
      setStockHistoryList(product.stockHistory || []);

      // Images sync
      if (product.images && product.images.length > 0) {
        setGalleryImages(product.images);
      } else if (product.imageUrl) {
        setGalleryImages([{
          id: 'img-main',
          url: product.imageUrl,
          thumbnailUrl: product.imageUrl,
          altText: product.name || 'Product Photo',
          isPrimary: true,
          order: 0
        }]);
      } else {
        setGalleryImages([]);
      }

      // Options & Variants sync
      if (product.variants && product.variants.length > 0) {
        setVariants(product.variants);
        setProductType('variable');
      } else {
        setVariants([]);
      }
      if (product.options && product.options.length > 0) {
        setOptions(
          product.options.map((o, idx) => ({ id: (o as any).id || String(idx + 1), name: o.name, values: o.values }))
        );
      }

      // Load inventory
      const matchingLvl = inventoryLevels.find(l => l.productId === product.id && !l.variantId);
      if (matchingLvl) {
        setInventoryTracked(matchingLvl.isTracked ?? true);
        setQuantity(matchingLvl.quantityOnHand?.toString() || '0');
        setLowInventoryThreshold(matchingLvl.lowStockThreshold?.toString() || '5');
        setSku(matchingLvl.sku || product.sku || '');
        setBarcode(matchingLvl.barcode || product.barcode || '');
      } else {
        setSku(product.sku || '');
        setBarcode(product.barcode || '');
      }
      setIsInitialized(true);
    } else if (!isEditing && !isInitialized) {
      // Clear for new additions
      setTitle('');
      setDescription('');
      setShortDescription('');
      setStatus('Active');
      setPrice('');
      setCompareAtPrice('');
      setCostPerItem('');
      setCategory('led-lighting');
      setVendor('Samkhi Limited');
      setTags([]);
      setSpecificationsList([]);
      setGalleryImages([]);
      setVariants([]);
      setOptions([{ id: '1', name: 'Size', values: [] }]);
      setSeoTitle('');
      setSeoDescription('');
      setSeoSlug('');
      setStockHistoryList([]);
      setGroupedProductIds([]);
      setIsInitialized(true);
    }
  }, [product, isEditing, inventoryLevels, isSynced, isInitialized]);

  // Dirty detection for Discard checking
  const isFormDirty = () => {
    const loadedTitle = product?.name || '';
    const loadedDesc = product?.description || '';
    const loadedPrice = product?.price?.toString() || '';
    const loadedSku = product?.sku || '';

    return (
      title !== loadedTitle ||
      description !== loadedDesc ||
      price !== loadedPrice ||
      sku !== loadedSku
    );
  };

  const handleBackNavigation = () => {
    if (isFormDirty()) {
      setShowDiscardModal(true);
    } else {
      navigate('/admin/products');
    }
  };

  // Image actions
  const primaryImage = galleryImages.find(i => i.isPrimary) || galleryImages[0] || null;

  const handleSetPrimary = (id: string) => {
    const updated = galleryImages.map(img => ({
      ...img,
      isPrimary: img.id === id
    }));
    setGalleryImages(updated);
    triggerToast("Highlight thumbnail selected as Primary cover!");
  };

  const handleRemoveImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = galleryImages.filter(img => img.id !== id);
    // Re-assign primary if removed one was primary
    if (galleryImages.find(img => img.id === id)?.isPrimary && remaining.length > 0) {
      remaining[0].isPrimary = true;
    }
    setGalleryImages(remaining);
    triggerToast("Media image removed from gallery.", "success");
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    const newIdx = direction === 'left' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= galleryImages.length) return;

    const list = [...galleryImages];
    const temp = list[index];
    list[index] = list[newIdx];
    list[newIdx] = temp;

    // Refresh orders
    const finalized = list.map((img, i) => ({ ...img, order: i }));
    setGalleryImages(finalized);
  };

  const openAltTextModal = (img: GalleryImage, e: React.MouseEvent) => {
    e.stopPropagation();
    setAltTextImageId(img.id);
    setTempAltText(img.altText || '');
    setShowAltTextModal(true);
  };

  const saveAltText = () => {
    if (altTextImageId) {
      setGalleryImages(galleryImages.map(img => 
        img.id === altTextImageId ? { ...img, altText: tempAltText } : img
      ));
      setShowAltTextModal(false);
      triggerToast("Alt tag text cached!");
    }
  };

  // Zoom position calculators
  const handleMouseMoveMagnify = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  // Base64 storage rules fallback
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleBase64Fallback = async () => {
    if (!pendingFile) return;
    setIsUploading(true);
    try {
      const b64 = await convertToBase64(pendingFile);
      const newImg: GalleryImage = {
        id: `img-${Date.now()}`,
        url: b64,
        thumbnailUrl: b64,
        altText: title || 'Product Gallery Photo',
        isPrimary: galleryImages.length === 0,
        order: galleryImages.length
      };
      setGalleryImages([...galleryImages, newImg]);
      setShowRuleModal(false);
      triggerToast("Offline local source loaded successfully!");
    } catch (err) {
      triggerToast("Failed to compile image binary.", "error");
    } finally {
      setIsUploading(false);
      setPendingFile(null);
    }
  };

  const uploadProductImage = async (file: File) => {
    setIsUploading(true);
    try {
      const fileRef = ref(storage, `product_images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      const newImg: GalleryImage = {
        id: `img-${Date.now()}`,
        url,
        thumbnailUrl: url,
        altText: title || 'Product Photo',
        isPrimary: galleryImages.length === 0,
        order: galleryImages.length
      };
      setGalleryImages([...galleryImages, newImg]);
      triggerToast("Cloud storage upload completed!");
    } catch (error: any) {
      const isPermissionErr = error?.code === 'storage/unauthorized' || 
                             error?.message?.toLowerCase().includes('permission') ||
                             error?.message?.toLowerCase().includes('unauthorized');
      if (isPermissionErr) {
        setPendingFile(file);
        setShowRuleModal(true);
      } else {
        triggerToast(`Failed to upload: ${error?.message || "Check network configurations."}`, "error");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadProductImage(file);
  };

  // Status warnings
  const handleStatusChange = (newStatus: 'Active' | 'Draft' | 'Archived') => {
    setStatus(newStatus);
    if (newStatus === 'Archived') {
      triggerToast("Product status set to Archived.", "success");
    } else {
      triggerToast(`Product status updated to ${newStatus}.`, "success");
    }
  };

  // Grouped Product helpers
  const otherProducts = products.filter(p => p.id !== id);
  const handleToggleGroupProduct = (pId: string) => {
    if (groupedProductIds.includes(pId)) {
      setGroupedProductIds(groupedProductIds.filter(i => i !== pId));
    } else {
      setGroupedProductIds([...groupedProductIds, pId]);
    }
  };

  // Rich-Text markdown appending utilities
  const appendRichText = (tag: string) => {
    const textarea = document.getElementById('desc-text-area') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    let replacement = '';
    if (tag === 'bold') replacement = `**${selected}**`;
    else if (tag === 'italic') replacement = `*${selected}*`;
    else if (tag === 'underline') replacement = `<u>${selected}</u>`;
    else if (tag === 'link') replacement = `[${selected}](https://example.com)`;
    else if (tag === 'list') replacement = `\n- ${selected}`;

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setDescription(newText);
    textarea.focus();
  };

  // Variant builders
  const addOption = () => {
    setOptions([...options, { id: Math.random().toString(36).substr(2, 9), name: '', values: [] }]);
  };

  const removeOption = (oId: string) => {
    setOptions(options.filter(o => o.id !== oId));
  };

  const updateOption = (oId: string, name: string, values: string[]) => {
    setOptions(options.map(o => o.id === oId ? { ...o, name, values } : o));
  };

  const generateVariants = () => {
    const validOpts = options.filter(o => o.name.trim() && o.values.length > 0);
    if (validOpts.length === 0) {
      triggerToast("Add at least one option name with values first!", "error");
      return;
    }

    const combos = validOpts.reduce((acc, curr) => {
      if (acc.length === 0) return curr.values.map(v => ({ [curr.name]: v }));
      const temp: any[] = [];
      acc.forEach(a => {
        curr.values.forEach(v => {
          temp.push({ ...a, [curr.name]: v });
        });
      });
      return temp;
    }, [] as any[]);

    setVariants(combos.map((combo, index) => ({
      id: `var-${Date.now()}-${index}`,
      title: Object.values(combo).join(' / '),
      options: combo,
      price: price || '0.00',
      inventory: '0'
    })));
    triggerToast("Generated variant options list successfully!");
  };

  // Inventory adjustment triggers
  const handleStockAdjust = (adjustment: { qty: number; type: 'add' | 'set'; reason: string; reference: string; notes: string }) => {
    const curVal = Number(quantity) || 0;
    let finalVal = curVal;

    if (adjustment.type === 'add') {
      finalVal = stockModalDir === 'add' ? curVal + adjustment.qty : Math.max(0, curVal - adjustment.qty);
    } else {
      finalVal = adjustment.qty;
    }

    const delta = finalVal - curVal;

    const logItem = {
      id: `log-${Date.now()}`,
      change: delta,
      reason: adjustment.reason,
      reference: adjustment.reference || undefined,
      note: adjustment.notes || undefined,
      timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      userId: adminUser?.email || 'System Admin'
    };

    setQuantity(finalVal.toString());
    setStockHistoryList([logItem, ...stockHistoryList]);
    setShowStockModal(false);
    triggerToast("Inventory levels adjusted successfully!");
  };

  // Bulk Variant modifiers
  const handleBulkVariantPrice = () => {
    const ask = prompt("Enter target price for ALL variant matrix entries:", price);
    if (ask && !isNaN(Number(ask))) {
      setVariants(variants.map(v => ({ ...v, price: Number(ask) })));
      triggerToast("Bulk variants price applied!");
    }
  };

  const handleBulkVariantStock = () => {
    const ask = prompt("Enter target stock quantity for ALL variants:", "10");
    if (ask && !isNaN(Number(ask))) {
      setVariants(variants.map(v => ({ ...v, inventory: Number(ask) })));
      triggerToast("Bulk variants stock applied!");
    }
  };

  // Save changes callback
  const handleSaveProduct = async () => {
    if (!title.trim()) {
      triggerToast("Product title is required!", "error");
      return;
    }
    if (!price || isNaN(Number(price))) {
      triggerToast("Provide a valid base numeric price!", "error");
      return;
    }

    const cleanId = isEditing ? (product?.id || id!) : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || Math.random().toString(36).substr(2, 9);
    
    // Construct specs object
    const specObj: Record<string, string> = {};
    specificationsList.forEach(item => {
      if (item.key.trim()) specObj[item.key.trim()] = item.value.trim();
    });

    const primaryImgUrl = primaryImage?.url || 'https://picsum.photos/seed/placeholder/800/600';

    const savedProduct = {
      id: cleanId,
      name: title.trim(),
      description: description.trim(),
      shortDescription: shortDescription.trim(),
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
      costPrice: costPerItem ? Number(costPerItem) : undefined,
      category: tags[0] || 'solar-panels',
      tags,
      brand: vendor.trim() || 'Samkhi',
      imageUrl: primaryImgUrl,
      images: galleryImages,
      inStock: status === 'Active' && (productType === 'variable' 
        ? (variants && variants.some(v => (v.inventory || 0) > 0))
        : (Number(quantity) > 0 || !inventoryTracked)
      ),
      status,
      specifications: specObj,
      productType,
      groupedProductIds: productType === 'grouped' ? groupedProductIds : undefined,
      variants: productType === 'variable' ? variants : undefined,
      options: productType === 'variable' ? options.filter(o => o.name.trim() && o.values.length > 0) : undefined,
      inventory: Number(quantity) || 0,
      seo: {
        pageTitle: seoTitle,
        metaDescription: seoDescription,
        urlSlug: seoSlug
      },
      stockHistory: stockHistoryList,
      sku,
      barcode
    };

    try {
      if (isEditing) {
        // Price tracking audit
        const listPriceLogs = product.price !== Number(price) 
          ? [{ timestamp: new Date().toLocaleDateString(), oldPrice: product.price, newPrice: Number(price), actor: adminUser?.email || 'Admin' }]
          : [];
        await updateProduct(id!, savedProduct);
        await logAuditInFirestore('Product Details Updated', `Updated fields for catalog item "${title}"`);
      } else {
        await addProduct(savedProduct);
        await logAuditInFirestore('Product Created', `Added new catalog product listing: "${title}"`);
      }

      // Sync and batch update collection_products manual links
      try {
        const batch = writeBatch(db);
        // First delete all historical manual collection links for this product ID
        const existingLinksQuery = query(collection(db, 'collection_products'), where('product_id', '==', cleanId));
        const linksSnap = await getDocs(existingLinksQuery);
        linksSnap.forEach(d => {
          batch.delete(doc(db, 'collection_products', d.id));
        });

        // Then set current selected manual collection links
        selectedManualCollectionIds.forEach((collId, idx) => {
          const key = `${collId}_${cleanId}`;
          batch.set(doc(db, 'collection_products', key), {
            id: key,
            collection_id: collId,
            product_id: cleanId,
            position: idx
          });
        });
        
        await batch.commit();
      } catch (eLinkError) {
        console.warn("Unable to fully sync collection product links: ", eLinkError);
      }

      // Sync inventory level inside context
      const matchingLvl = inventoryLevels.find(l => l.productId === cleanId && !l.variantId);
      if (matchingLvl) {
        await updateInventoryLevel(matchingLvl.id, {
          isTracked: inventoryTracked,
          quantityOnHand: Number(quantity) || 0,
          quantityAvailable: Number(quantity) || 0,
          lowStockThreshold: Number(lowInventoryThreshold) || 5,
          sku,
          barcode
        });
      } else {
        await addInventoryLevel({
          id: `lvl_${cleanId}`,
          productId: cleanId,
          quantityOnHand: Number(quantity) || 0,
          quantityReserved: 0,
          quantityAvailable: Number(quantity) || 0,
          quantityIncoming: 0,
          reorderPoint: 10,
          reorderQuantity: 50,
          lowStockThreshold: Number(lowInventoryThreshold) || 5,
          isTracked: inventoryTracked,
          sku,
          barcode,
          lastCountedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        });
      }

      triggerToast("Catalog product updates saved successfully!");
      setTimeout(() => navigate('/admin/products'), 800);
    } catch (e: any) {
      triggerToast(`Database save failed: ${e?.message || e}`, "error");
    }
  };

  // Duplication trigger
  const handleDuplicate = async (configs: { name: string; copyImages: boolean; copyVariants: boolean; copySeo: boolean; targetSku: string }) => {
    const newId = configs.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `dup-${Date.now()}`;
    const duplicatedObj = {
      id: newId,
      name: configs.name,
      description: product?.description || '',
      shortDescription: product?.shortDescription || '',
      price: product?.price || 0,
      compareAtPrice: product?.compareAtPrice,
      costPrice: product?.costPrice,
      category: (product as any)?.category || (product?.tags && product?.tags[0]) || 'led-lighting',
      tags: product?.tags || [],
      brand: product?.brand || 'Samkhi Limited',
      imageUrl: configs.copyImages ? (product?.imageUrl || '') : '',
      images: configs.copyImages ? (product?.images || []) : [],
      inStock: true,
      status: 'Active' as const,
      specifications: product?.specifications || {},
      productType: configs.copyVariants ? (product?.productType || 'simple') : 'simple',
      variants: configs.copyVariants ? (product?.variants || []) : undefined,
      options: configs.copyVariants ? (product?.options || []) : undefined,
      seo: configs.copySeo ? (product?.seo ? { ...product.seo } : {}) : {},
      sku: configs.targetSku || undefined
    };

    try {
      await addProduct(duplicatedObj);
      await logAuditInFirestore('Product Duplicated', `Duplicated from "${product?.name}" as newer record "${configs.name}"`);
      setShowDuplicateModal(false);
      triggerToast("Product duplication successful!");
      navigate(`/admin/products/${newId}`);
    } catch (err: any) {
      triggerToast("Failed to duplicate product record.", "error");
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async () => {
    try {
      await removeProduct(id!);
      await logAuditInFirestore("Product Deleted", `Permanently removed product "${title}" from databases.`);
      triggerToast("Product removed successfully.", "success");
      navigate('/admin/products');
    } catch (err) {
      triggerToast("Database deletion failed.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f6] pb-24 text-slate-800">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 border font-medium text-xs tracking-wide",
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Sticky Rail */}
      <div className="bg-white border-b border-[#e3e3e3] px-8 py-3 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={handleBackNavigation}
            className="p-1.5 hover:bg-[#f1f1f1] rounded-lg transition-colors border border-[#e3e3e3]"
            id="back-to-products-btn"
          >
            <ChevronLeft size={16} className="text-[#616161]" />
          </button>
          
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-[#1a1a1a] tracking-tight text-sm">
                {isEditing ? `Edit: ${product?.name}` : 'Create New Product'}
              </h1>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                status === 'Active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                status === 'Draft' ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-red-100 text-red-800 border-red-200"
              )}>
                {status}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Catalog ID: {isEditing ? id : 'unassigned'}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isEditing && (
            <>
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="px-3 py-1.5 border border-[#d1d1d1] rounded-lg text-xs font-bold text-[#1a1a1a] hover:bg-[#f6f6f6] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Eye size={12} />
                Preview Storefront
              </button>
              <button
                type="button"
                onClick={() => setShowDuplicateModal(true)}
                className="px-3 py-1.5 border border-[#d1d1d1] rounded-lg text-xs font-bold text-[#1a1a1a] hover:bg-[#f6f6f6] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Copy size={12} />
                Duplicate
              </button>
              {status !== 'Archived' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('Archived')}
                  className="px-3 py-1.5 border border-[#d1d1d1] rounded-lg text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Archive size={12} />
                  Archive
                </button>
              )}
              {status === 'Archived' && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-1.5 border border-red-300 bg-red-50 p-1 rounded-lg">
                    <span className="text-[10px] font-bold text-red-800 font-mono pl-1">DELETE ENTIRELY?</span>
                    <button
                      type="button"
                      onClick={handlePermanentDelete}
                      className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700 font-mono"
                    >
                      CONFIRM
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-1 bg-slate-200 text-slate-800 rounded text-[10px] font-medium hover:bg-slate-300 font-mono"
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-xs font-bold hover:bg-red-50 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 size={12} />
                    Delete Listing
                  </button>
                )
              )}
            </>
          )}
          
          <div className="w-px h-6 bg-[#e3e3e3] mx-2" />

          <button 
            type="button"
            onClick={handleBackNavigation}
            className="px-3 py-1.5 text-xs font-bold hover:bg-[#f1f1f1] rounded-lg text-zinc-600 transition-colors"
          >
            Discard
          </button>
          <button 
            type="button"
            onClick={handleSaveProduct}
            className="bg-black hover:bg-black/90 text-white px-4 py-1.5 rounded-lg text-xs font-black shadow-sm flex items-center gap-1 cursor-pointer"
          >
            Save Listing
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="max-w-[1200px] mx-auto px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column Areas */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Product Media Gallery */}
          <section className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="text-left">
                <label className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider block">Media Image Gallery</label>
                <span className="text-[10px] text-[#616161]">Upload photos. Toggle primary status, insert alternative tags or reorder.</span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setNewImageUrl('');
                  setNewImageAlt(title || '');
                  setIsImagePreviewLoading(false);
                  setImagePreviewHasError(false);
                  setImagePreviewLoaded(false);
                  setShowAddUrlModal(true);
                }}
                className="text-xs text-[#005bd3] font-bold hover:underline"
              >
                Add from URL
              </button>
            </div>

            {/* Gallery interactive playground */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Primary Image View Area */}
              <div className="md:col-span-4 border border-[#e3e3e3] rounded-xl overflow-hidden aspect-video bg-[#f9f9f9] relative group flex items-center justify-center">
                {primaryImage ? (
                  <div 
                    className="relative w-full h-full cursor-zoom-in"
                    onMouseMove={handleMouseMoveMagnify}
                    onMouseEnter={() => setIsZooming(true)}
                    onMouseLeave={() => setIsZooming(false)}
                    onClick={() => {
                      const idx = galleryImages.findIndex(img => img.id === primaryImage.id);
                      setLightboxIndex(idx >= 0 ? idx : 0);
                      setShowLightbox(true);
                    }}
                  >
                    <img 
                      src={primaryImage.url} 
                      alt={primaryImage.altText || title} 
                      style={{
                        transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                        transform: isZooming ? 'scale(2.2)' : 'scale(1)'
                      }}
                      className="w-full h-full object-contain p-4 transition-transform duration-75"
                    />

                    {/* Image metadata badge overlay */}
                    <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded-md text-[10px] font-mono select-none">
                      Alt: {primaryImage.altText || 'Not specified'}
                    </div>

                    <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">
                      Primary Cover
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-10 cursor-pointer w-full text-center hover:bg-zinc-50"
                  >
                    <Upload size={32} className="text-[#616161] opacity-60" />
                    <p className="text-xs font-bold">Upload main product photo</p>
                    <p className="text-[10px] text-[#616161]">Drag files here or search directories</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {/* Miniature Thumbnail Strips */}
              {galleryImages.length > 0 && (
                <div className="md:col-span-4 grid grid-cols-4 md:grid-cols-6 gap-2">
                  {galleryImages.map((img, idx) => (
                    <div 
                      key={img.id}
                      onMouseEnter={() => setHoveredImageId(img.id)}
                      onMouseLeave={() => setHoveredImageId(null)}
                      className={cn(
                        "aspect-square rounded-lg border overflow-hidden p-1 bg-white relative transition-all group",
                        img.isPrimary ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-[#d1d1d1] hover:border-black'
                      )}
                    >
                      <img 
                        src={img.url} 
                        alt={img.altText} 
                        onClick={() => handleSetPrimary(img.id)}
                        className="w-full h-full object-contain cursor-pointer"
                      />

                      {/* Manual movement controls */}
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 opacity-0 group-hover:opacity-100 flex justify-between px-1 py-0.5 transition-opacity">
                        <button 
                          disabled={idx === 0}
                          onClick={(e) => handleMoveImage(idx, 'left', e)}
                          className="text-white hover:text-emerald-400 disabled:opacity-30"
                        >
                          <ArrowLeft size={10} />
                        </button>
                        <button 
                          onClick={(e) => openAltTextModal(img, e)}
                          className="text-white hover:text-emerald-400 text-[8px] font-bold"
                        >
                          ALT
                        </button>
                        <button 
                          onClick={(e) => handleRemoveImage(img.id, e)}
                          className="text-white hover:text-red-400"
                        >
                          <Trash2 size={10} />
                        </button>
                        <button 
                          disabled={idx === galleryImages.length - 1}
                          onClick={(e) => handleMoveImage(idx, 'right', e)}
                          className="text-white hover:text-emerald-400 disabled:opacity-30"
                        >
                          <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add miniature uploader inline */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-[#d1d1d1] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 text-[10px] font-bold text-zinc-500"
                  >
                    <Plus size={16} />
                    <span>Add</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Core Configuration Tabs Section */}
          <div className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] overflow-hidden">
            {/* Header tab controller */}
            <div className="flex border-b border-[#e3e3e3] bg-[#f9f9f9] overflow-x-auto">
              {[
                { id: 'details', label: 'Details', icon: FileText },
                { id: 'variants', label: 'Variants & Matrix', icon: Sliders },
                { id: 'inventory', label: 'Inventory & Alerts', icon: Package },
                { id: 'seo', label: 'SEO Config', icon: Globe },
                { id: 'history', label: 'Audit Logs', icon: History }
              ].map((tb) => {
                const Icon = tb.icon;
                return (
                  <button
                    key={tb.id}
                    type="button"
                    onClick={() => setActiveTab(tb.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-5 py-3 text-xs font-black transition-colors border-b-2 tracking-wide whitespace-nowrap",
                      activeTab === tb.id 
                        ? "border-black text-black bg-white" 
                        : "border-transparent text-[#616161] hover:text-black"
                    )}
                  >
                    <Icon size={14} />
                    {tb.label}
                  </button>
                );
              })}
            </div>

            {/* Content body inside active index */}
            <div className="p-6 text-left">
              
              {/* TAB 1: DETAILS */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  
                  {/* Title field */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-[#616161]">
                      <label className="font-bold text-[#1a1a1a]">Product Display Title</label>
                      <span className={title.length > 250 ? 'text-red-500' : 'text-slate-500'}>
                        {title.length} / 300 chars
                      </span>
                    </div>
                    <input 
                      type="text" 
                      maxLength={300}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. 200W Monocrystalline Smart Solar Kit"
                      className="w-full border border-[#d1d1d1] rounded-lg px-3 py-1.5 text-sm outline-none"
                    />
                  </div>

                  {/* Character Limits & Description shortcuts */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs text-[#616161]">
                      <label className="font-bold text-[#1a1a1a]">Description Story (Markdown supported)</label>
                      <button 
                        type="button" 
                        onClick={() => setDescPreviewMode(!descPreviewMode)}
                        className="text-[#005bd3] font-bold hover:underline"
                      >
                        {descPreviewMode ? 'Return to Editor' : 'Toggle Real Preview'}
                      </button>
                    </div>

                    {descPreviewMode ? (
                      <div className="border border-[#e3e3e3] rounded-lg p-4 min-h-[160px] text-xs leading-relaxed bg-[#f9f9f9] text-left">
                        {description ? (
                          <div className="whitespace-pre-wrap font-medium">{description}</div>
                        ) : (
                          <p className="italic text-zinc-400">Blank descriptions show nothing to customers.</p>
                        )}
                      </div>
                    ) : (
                      <div className="border border-[#d1d1d1] rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black/5 transition-all">
                        <div className="bg-[#f9f9f9] border-b border-[#e3e3e3] px-3 py-1.5 flex items-center gap-1">
                          <button type="button" onClick={() => appendRichText('bold')} className="p-1.5 hover:bg-white rounded text-[#616161]"><Bold size={14} /></button>
                          <button type="button" onClick={() => appendRichText('italic')} className="p-1.5 hover:bg-white rounded text-[#616161]"><Italic size={14} /></button>
                          <button type="button" onClick={() => appendRichText('underline')} className="p-1.5 hover:bg-white rounded text-[#616161]"><Underline size={14} /></button>
                          <div className="w-px h-4 bg-[#e3e3e3] mx-1" />
                          <button type="button" onClick={() => appendRichText('link')} className="p-1.5 hover:bg-white rounded text-[#616161]"><LinkIcon size={14} /></button>
                          <button type="button" onClick={() => appendRichText('list')} className="p-1.5 hover:bg-white rounded text-[#616161]"><List size={14} /></button>
                        </div>
                        <textarea 
                          id="desc-text-area"
                          rows={6}
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          className="w-full p-3 text-xs outline-none resize-none font-medium text-slate-800"
                          placeholder="Flesh out complete specifications details..."
                        />
                      </div>
                    )}
                  </div>

                  {/* Short description field */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-[#616161]">
                      <label className="font-bold text-[#1a1a1a]">Brief Summary (Max 160 Characters)</label>
                      <span className={shortDescription.length > 160 ? 'text-red-500' : 'text-slate-500'}>
                        {shortDescription.length} / 160 chars
                      </span>
                    </div>
                    <textarea 
                      rows={2}
                      maxLength={160}
                      value={shortDescription}
                      onChange={e => setShortDescription(e.target.value)}
                      placeholder="Display summary seen under the title in card previews..."
                      className="w-full border border-zinc-300 rounded-lg p-2.5 text-xs outline-none resize-none font-medium"
                    />
                  </div>

                  {/* Product Grouping Type Dropdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#f1f1f1]">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#1a1a1a]">Catalog Product Structure</label>
                      <select
                        value={productType}
                        onChange={e => setProductType(e.target.value as any)}
                        className="w-full bg-white border border-[#d1d1d1] rounded-lg px-3 py-1.5 text-xs font-semibold outline-none"
                      >
                        <option value="simple">Simple Catalog Product</option>
                        <option value="variable">Variable Product (Options Matrix)</option>
                        <option value="grouped">Grouped Product / Package Group</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 flex flex-col justify-end">
                      {productType === 'grouped' && (
                        <p className="text-[10px] text-[#616161]">
                          Cluster multiple catalog listings together so customers can check prices or buy in bulk packages.
                        </p>
                      )}
                      {productType === 'variable' && (
                        <p className="text-[10px] text-[#616161]">
                          Customize the Attributes and Variants matrix tab to assign distinct SKU prices or quantities.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Grouped Product Subfield Options */}
                  {productType === 'grouped' && (
                    <div className="p-4 bg-[#f9f9f9] border border-[#e3e3e3] rounded-lg space-y-3">
                      <h4 className="text-xs font-bold text-[#1a1a1a]">Select Products inside this Group Block</h4>
                      
                      {/* Search field */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={12} />
                        <input
                          type="text"
                          placeholder="Filter other products to bundle..."
                          value={groupSearchQuery}
                          onChange={e => setGroupSearchQuery(e.target.value)}
                          className="w-full bg-white border border-zinc-300 rounded-md pl-8 pr-3 py-1 text-xs outline-none"
                        />
                      </div>

                      <div className="max-h-40 overflow-y-auto space-y-2.5 pr-2">
                        {otherProducts
                          .filter(p => p.name.toLowerCase().includes(groupSearchQuery.toLowerCase()))
                          .map(p => {
                            const isAdded = groupedProductIds.includes(p.id);
                            return (
                              <div key={p.id} className="flex justify-between items-center bg-white p-2 border border-zinc-200 rounded-md text-xs">
                                <span className="font-semibold text-zinc-800">{p.name} (ID: {p.id})</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleGroupProduct(p.id)}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold border",
                                    isAdded ? "bg-red-50 border-red-200 text-red-700" : "bg-black border-black text-white"
                                  )}
                                >
                                  {isAdded ? 'Exclude' : 'Add to Group'}
                                </button>
                              </div>
                            );
                        })}
                      </div>

                      {groupedProductIds.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-zinc-200">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase">Bundled Products ({groupedProductIds.length}):</span>
                          <div className="flex flex-wrap gap-1">
                            {groupedProductIds.map(pId => (
                              <span key={pId} className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-mono">
                                {pId}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Technical Specifications Addition */}
                  <div className="pt-4 border-t border-[#f1f1f1]">
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider block">Specifications Matrix</label>
                      <button
                        type="button"
                        onClick={() => setSpecificationsList([...specificationsList, { key: '', value: '' }])}
                        className="text-xs text-[#005bd3] font-bold flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Row
                      </button>
                    </div>

                    <div className="space-y-2">
                      {specificationsList.map((spec, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={spec.key}
                            onChange={e => {
                              const list = [...specificationsList];
                              list[index].key = e.target.value;
                              setSpecificationsList(list);
                            }}
                            placeholder="e.g. Warranty"
                            className="flex-1 border text-xs px-2.5 py-1 rounded"
                          />
                          <input
                            type="text"
                            value={spec.value}
                            onChange={e => {
                              const list = [...specificationsList];
                              list[index].value = e.target.value;
                              setSpecificationsList(list);
                            }}
                            placeholder="e.g. 5 Years"
                            className="flex-1 border text-xs px-2.5 py-1 rounded"
                          />
                          <button
                            type="button"
                            onClick={() => setSpecificationsList(specificationsList.filter((_, idx) => idx !== index))}
                            className="text-zinc-500 hover:text-red-600 p-1 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: VARIANTS */}
              {activeTab === 'variants' && (
                <div className="space-y-4">
                  {productType !== 'variable' ? (
                    <div className="p-6 text-center border-2 border-dashed rounded-lg bg-[#f9f9f9]">
                      <AlertTriangle size={20} className="mx-auto text-[#616161] mb-2" />
                      <p className="text-xs font-bold text-[#1a1a1a]">This tab is locked.</p>
                      <p className="text-[10px] text-[#616161] mt-1">
                        Select "Variable Product" under Details tab configuration first.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Options Setup Block */}
                      <div className="space-y-3 bg-[#f9f9f9] border border-zinc-200 p-4 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-black uppercase">Variant Option Attributes</span>
                          {options.length < 3 && (
                            <button
                              type="button"
                              onClick={addOption}
                              className="text-xs text-[#005bd3] font-bold flex items-center gap-1"
                            >
                              <Plus size={12} /> Add option field
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {options.map((opt) => (
                            <div key={opt.id} className="p-3 bg-white border border-zinc-200 rounded-lg space-y-2 relative">
                              <button
                                type="button"
                                onClick={() => removeOption(opt.id)}
                                className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-red-500 transition-colors"
                              >
                                <X size={12} />
                              </button>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold">Attribute Key Name</label>
                                  <input
                                    type="text"
                                    value={opt.name}
                                    placeholder="e.g. Color, Size, material"
                                    onChange={e => updateOption(opt.id, e.target.value, opt.values)}
                                    className="w-full border p-1 rounded text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold">Option Tags</label>
                                  <div className="flex flex-wrap gap-1 mb-1">
                                    {opt.values.map(v => (
                                      <span key={v} className="bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 text-zinc-700">
                                        {v}
                                        <button 
                                          type="button" 
                                          onClick={() => updateOption(opt.id, opt.name, opt.values.filter(it => it !== v))}
                                        >
                                          <X size={8} />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Type value and press enter..."
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const v = e.currentTarget.value.trim();
                                        if (v && !opt.values.includes(v)) {
                                          updateOption(opt.id, opt.name, [...opt.values, v]);
                                          e.currentTarget.value = '';
                                        }
                                      }
                                    }}
                                    className="w-full border p-1 rounded text-xs bg-zinc-50"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={generateVariants}
                          className="w-full py-2 bg-black hover:bg-black/90 text-white text-xs font-bold rounded-lg shadow-sm"
                        >
                          Regenerate Attribute Options Matrix
                        </button>
                      </div>

                      {/* Display active list */}
                      {variants.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold">Variant Matrix ({variants.length} items)</span>
                            <div className="flex gap-2">
                              <button type="button" onClick={handleBulkVariantPrice} className="text-xs text-[#005bd3] font-semibold hover:underline">Bulk Price</button>
                              <span className="text-[#e3e3e3]">|</span>
                              <button type="button" onClick={handleBulkVariantStock} className="text-xs text-[#005bd3] font-semibold hover:underline">Bulk Stock</button>
                            </div>
                          </div>

                          <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-[#f9f9f9] border-b text-[#616161] font-bold">
                                  <th className="p-3">Variant Option</th>
                                  <th className="p-3">Price</th>
                                  <th className="p-3 text-right">Qty</th>
                                  <th className="p-3">SKU</th>
                                  <th className="p-3 w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {variants.map((v, index) => (
                                  <tr key={v.id} className="border-b last:border-0 hover:bg-zinc-50">
                                    <td className="p-3 font-semibold text-black">{v.title}</td>
                                    <td className="p-3">${Number(v.price).toFixed(2)}</td>
                                    <td className="p-3 text-right font-mono">{v.inventory}</td>
                                    <td className="p-3 text-zinc-500 font-mono text-[11px]">{v.sku || 'unassigned'}</td>
                                    <td className="p-3">
                                      <button 
                                        type="button" 
                                        onClick={() => setEditingVariant(v)}
                                        className="text-zinc-500 hover:text-[#005bd3] p-1 font-bold"
                                      >
                                        Edit
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: INVENTORY */}
              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  
                  {/* Tracking Control toggle */}
                  <div className="flex items-center justify-between p-4 bg-[#f9f9f9] border rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-[#1a1a1a]">Stock Levels Management</h4>
                      <p className="text-[10px] text-[#616161] mt-0.5">Automate and decrement quantities on purchase store checkout events.</p>
                    </div>

                    <button 
                      type="button"
                      onClick={() => setInventoryTracked(!inventoryTracked)}
                      className={cn(
                        "w-10 h-5 rounded-full transition-colors relative flex items-center px-1 border",
                        inventoryTracked ? "bg-[#00a15f] border-emerald-600 justify-end" : "bg-[#616161] border-zinc-700 justify-start"
                      )}
                    >
                      <span className="w-3.5 h-3.5 bg-white rounded-full block shadow-md" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-[#1a1a1a]">SKU (Inventory Identifier Code)</label>
                      <input
                        type="text"
                        value={sku}
                        onChange={e => setSku(e.target.value)}
                        placeholder="e.g. SOL-PANEL-200"
                        className="w-full border border-zinc-300 rounded-lg p-2.5 text-xs font-mono font-medium outline-none"
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-[#1a1a1a]">Barcode Identifier (UPC, GTIN)</label>
                      <input
                        type="text"
                        value={barcode}
                        onChange={e => setBarcode(e.target.value)}
                        placeholder="e.g. 7040102003"
                        className="w-full border border-zinc-300 rounded-lg p-2.5 text-xs font-mono font-medium outline-none"
                      />
                    </div>
                  </div>

                  {/* Quantity adjustments */}
                  <div className="p-4 border rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-[#616161] uppercase font-bold block">Current Stock Available</span>
                        <span className="text-2xl font-black text-[#1a1a1a]">{quantity} units</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStockModalDir('add');
                            setShowStockModal(true);
                          }}
                          className="px-3 py-1.5 bg-[#00a15f] hover:bg-[#008f54] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          Add stock
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStockModalDir('remove');
                            setShowStockModal(true);
                          }}
                          className="px-3 py-1.5 border border-[#d1d1d1] text-xs font-bold text-[#1a1a1a] rounded-lg hover:bg-[#f6f6f6] cursor-pointer flex items-center gap-1"
                        >
                          Deduct stock
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 bg-[#fffbe6] border border-amber-200 p-3 rounded-lg text-xs leading-normal">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-amber-800 flex items-center gap-1">
                          <AlertTriangle size={12} /> Low Stock Alert Threshold
                        </span>
                        <input
                          type="number"
                          value={lowInventoryThreshold}
                          onChange={e => setLowInventoryThreshold(e.target.value)}
                          className="w-16 border border-amber-300 text-right bg-white p-1 rounded font-bold"
                        />
                      </div>
                      <p className="text-[10px] text-amber-700/80 mt-1 leading-normal">
                        Receive real-time critical dashboard alarms when the stock dips below {lowInventoryThreshold} units.
                      </p>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: SEO */}
              {activeTab === 'seo' && (
                <SEOTab
                  productName={title}
                  productDescription={description}
                  productImage={primaryImage?.url || ''}
                  seoTitle={seoTitle}
                  setSeoTitle={setSeoTitle}
                  seoDescription={seoDescription}
                  setSeoDescription={setSeoDescription}
                  seoSlug={seoSlug}
                  setSeoSlug={setSeoSlug}
                />
              )}

              {/* TAB 5: HISTORY (AUDIT LOGS) */}
              {activeTab === 'history' && (
                <HistoryTab logs={stockHistoryList} />
              )}

            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1 space-y-6 text-left">
          
          {/* Status Panel widget */}
          <section className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5 space-y-4">
            <h3 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Status</h3>
            
            <div className="relative">
              <select
                value={status}
                onChange={e => handleStatusChange(e.target.value as any)}
                className="w-full appearance-none bg-white border border-[#d1d1d1] rounded-lg px-3 py-2 text-xs font-bold outline-none"
              >
                <option value="Active">🟢 Active / Story Visible</option>
                <option value="Draft">⚪ Draft / hidden</option>
                <option value="Archived">🔴 Archived / discontinued</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={12} />
            </div>

            <p className="text-[10px] text-zinc-500 leading-normal">
              {status === 'Active' ? '🟢 Visible in the public catalog and search filters.' :
               status === 'Draft' ? '⚪ Only administrators can view or access this item.' :
               '🔴 Complete archive. This cannot be purchased or shown.'}
            </p>
          </section>

          {/* Pricing Config Panel */}
          <section className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5 space-y-4">
            <h3 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Pricing Configuration</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase">Public Price</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-bold">$</span>
                  <input
                    type="text"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full border p-2 pl-6 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase">Compare At</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-bold">$</span>
                  <input
                    type="text"
                    value={compareAtPrice}
                    onChange={e => setCompareAtPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full border p-2 pl-6 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Catalog Organization & Collections widget directly linked to Collections Directory */}
          <section className="bg-white rounded-xl shadow-xs border border-[#e3e3e3] p-5 space-y-4">
            <h3 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Product Collections & Tags</h3>
            
            <div className="space-y-4">
              {/* Brand Vendor input */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase">Brand / Vendor</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={e => setVendor(e.target.value)}
                  className="w-full border p-1.5 rounded-lg text-xs text-zinc-800 font-semibold focus:ring-1 focus:ring-primary/20 outline-none"
                />
              </div>

              {/* Dynamic Collections Directory sync */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">Collections Directory</label>
                  <Link to="/admin/collections" className="text-[9px] text-primary font-bold hover:underline">Manage Directory →</Link>
                </div>
                
                <div className="max-h-60 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin border border-zinc-100 rounded-lg p-2 bg-zinc-50/20">
                  {dbCollections.length === 0 ? (
                    <div className="text-center py-4 text-[10px] text-zinc-400 font-medium">
                      Fetching collections directory...
                    </div>
                  ) : (
                    dbCollections.map(col => {
                      const isAutomated = (col.collection_type || col.type) === 'automated';
                      if (isAutomated) {
                        const currentProdMock = {
                          name: title || '',
                          description: description || '',
                          price: Number(price) || 0,
                          brand: vendor || '',
                          tags: tags || []
                        };
                        const isMatched = matchProductToRules(currentProdMock, col.rule_set || { conditions: col.conditions || [], match: col.conditionOperator || 'all' });
                        
                        // Handler helper to auto-satisfy the automated rule tags
                        const handleSatisfyRules = () => {
                          const rules = col.rule_set || { conditions: col.conditions || [] };
                          const tagCond = rules.conditions?.find((c: any) => c.field === 'tag' && c.operator === 'equals');
                          const valueToAdd = tagCond?.value || col.title;
                          if (!tags.includes(valueToAdd)) {
                            setTags([...tags, valueToAdd]);
                            triggerToast(`Tag "${valueToAdd}" added to auto-match "${col.title}"!`);
                          }
                        };

                        return (
                          <div key={col.id} className="flex items-center justify-between p-2 rounded-lg border border-zinc-100 bg-white">
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="font-bold text-zinc-800 text-[11px] truncate">{col.title}</span>
                              <span className="text-[8px] text-[#006e52] font-bold uppercase tracking-wider">Dynamic / Rule</span>
                            </div>
                            {isMatched ? (
                              <span className="bg-[#ccf2e5] text-[#006e52] text-[9px] px-1.5 py-0.5 rounded font-bold border border-[#006e52]/10 select-none">
                                ✓ Bound
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleSatisfyRules}
                                className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 hover:text-zinc-900 text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer transition-all active:scale-95"
                                title="Click to auto-apply tag satisfying the automated collection rules"
                              >
                                + Match
                              </button>
                            )}
                          </div>
                        );
                      } else {
                        // Manual Collection List with toggle checkboxes
                        const isChecked = selectedManualCollectionIds.includes(col.id);
                        
                        const handleToggleManual = () => {
                          if (isChecked) {
                            setSelectedManualCollectionIds(selectedManualCollectionIds.filter(id => id !== col.id));
                            triggerToast(`Unlinked from "${col.title}" (save to commit)`);
                          } else {
                            setSelectedManualCollectionIds([...selectedManualCollectionIds, col.id]);
                            triggerToast(`Grouped into "${col.title}" (save to commit)`);
                          }
                        };

                        return (
                          <button
                            type="button"
                            key={col.id}
                            onClick={handleToggleManual}
                            className={cn(
                              "w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left cursor-pointer",
                              isChecked 
                                ? "bg-[#ccf2e5]/30 border-[#006e52] text-[#006e52]" 
                                : "bg-white border-zinc-100 hover:border-zinc-200 text-zinc-700"
                            )}
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="font-bold text-[11px] truncate text-inherit">{col.title}</span>
                              <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">Manual Store</span>
                            </div>
                            <div className={cn(
                              "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all",
                              isChecked 
                                ? "bg-[#006e52] border-[#006e52] text-white" 
                                : "border-zinc-350 bg-white"
                            )}>
                              {isChecked && <Check size={8} className="stroke-[3]" />}
                            </div>
                          </button>
                        );
                      }
                    })
                  )}
                </div>
              </div>

              {/* Custom SEO / tagging metadata search index list */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase">Product Tags & Keywords</label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {tags.map(t => (
                    <span key={t} className="bg-zinc-100 border border-zinc-200 text-zinc-800 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                      {t}
                      <button type="button" onClick={() => setTags(tags.filter(it => it !== t))} className="hover:text-red-500"><X size={8} /></button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Type new Tag and press Enter..."
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val && !tags.includes(val)) {
                        setTags([...tags, val]);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                  className="w-full border p-1.5 rounded-lg text-xs bg-zinc-50 text-zinc-800 focus:bg-white outline-none"
                />
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* MODAL 1: STOREFRONT PREVIEW */}
      <AnimatePresence>
        {showPreviewModal && (
          <ProductPreviewModal
            isOpen={showPreviewModal}
            onClose={() => setShowPreviewModal(false)}
            product={{
              name: title || 'Product Name Preview',
              description: description || 'Primary description content...',
              price: Number(price) || 0.00,
              compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
              brand: vendor || 'Samkhi Limited',
              imageUrl: primaryImage?.url || 'https://picsum.photos/seed/placeholder/800/600',
              images: galleryImages,
              options: productType === 'variable' ? options.filter(o => o.name.trim() && o.values.length > 0) : undefined
            }}
          />
        )}
      </AnimatePresence>

      {/* MODAL 2: DUPLICATE CONFIRMATION */}
      <AnimatePresence>
        {showDuplicateModal && (
          <DuplicateProductModal
            isOpen={showDuplicateModal}
            onClose={() => setShowDuplicateModal(false)}
            productName={title}
            originalSku={sku}
            onDuplicate={handleDuplicate}
          />
        )}
      </AnimatePresence>

      {/* MODAL 3: INVENTORY ADJUSTMENT */}
      <AnimatePresence>
        {showStockModal && (
          <StockAdjustmentModal
            isOpen={showStockModal}
            onClose={() => setShowStockModal(false)}
            direction={stockModalDir}
            currentStock={Number(quantity) || 0}
            onAdjust={handleStockAdjust}
          />
        )}
      </AnimatePresence>

      {/* MODAL 4: VARIANT INDIVIDUAL EDITOR */}
      <AnimatePresence>
        {editingVariant && (
          <VariantEditModal
            isOpen={!!editingVariant}
            onClose={() => setEditingVariant(null)}
            variant={editingVariant}
            onSave={(updated) => {
              setVariants(variants.map(v => v.id === updated.id ? updated : v));
              setEditingVariant(null);
              triggerToast("Individual variant data updated!");
            }}
          />
        )}
      </AnimatePresence>

      {/* MODAL 5: ALT TEXT INPUT */}
      <AnimatePresence>
        {showAltTextModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowAltTextModal(false)} />
            <div className="bg-white rounded-lg p-5 max-w-sm w-full z-10 text-left border shadow-xl">
              <span className="text-xs font-bold text-zinc-500 uppercase block mb-1">Image Metadata Attribute</span>
              <h4 className="font-bold text-sm mb-3">Edit Alternative Alt Tag Description</h4>
              <textarea
                rows={3}
                value={tempAltText}
                onChange={e => setTempAltText(e.target.value)}
                placeholder="Describe what is in this product picture to assist screen readers..."
                className="w-full border rounded p-2 text-xs outline-none focus:ring-1 focus:ring-black mb-4"
              />
              <div className="flex justify-end gap-2 text-xs font-bold">
                <button type="button" onClick={() => setShowAltTextModal(false)} className="px-3 py-1.5 border hover:bg-zinc-50 rounded">Cancel</button>
                <button type="button" onClick={saveAltText} className="px-3 py-1.5 bg-black text-white rounded">Save Attribute</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: DISCARD UNCHANGED WARNINGS */}
      <AnimatePresence>
        {showDiscardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowDiscardModal(false)} />
            <div className="bg-white rounded-lg p-5 max-w-sm w-full z-10 text-left border shadow-xl space-y-3">
              <h4 className="font-extrabold text-sm flex items-center gap-1.5 text-zinc-800">
                <AlertTriangle size={16} className="text-amber-500" />
                Unsaved edits detected!
              </h4>
              <p className="text-xs text-zinc-600 leading-normal">
                You modified this product catalog card. Exiting now will lose all pending unsaved additions.
              </p>
              <div className="flex justify-end gap-2 text-xs font-bold pt-2">
                <button type="button" onClick={() => setShowDiscardModal(false)} className="px-3 py-1.5 border hover:bg-zinc-50 rounded">Cancel</button>
                <button type="button" onClick={() => {
                  setShowDiscardModal(false);
                  navigate('/admin/products');
                }} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded">Lose Changes</button>
                <button type="button" onClick={() => {
                  setShowDiscardModal(false);
                  handleSaveProduct();
                }} className="px-3 py-1.5 bg-black text-white rounded">Save First</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* STORAGE RULES RESOLUTION FALLBACK MODAL */}
      <AnimatePresence>
        {showRuleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowRuleModal(false)} />
            <div className="bg-white rounded-xl border max-w-lg w-full z-10 text-left shadow-2xl overflow-hidden">
              <div className="bg-amber-50 p-4 border-b flex justify-between items-center text-amber-800 font-bold text-xs uppercase font-mono">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} />
                  <span>Firebase Storage Permissions Locked</span>
                </div>
                <button onClick={() => setShowRuleModal(false)}><X size={14} /></button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-zinc-600 leading-normal">
                  Firebase rules are currently blocking this secure write operation. Upload those permissive rules, or click "Use Base64 Fallback" to bypass online storage constraints.
                </p>

                <div className="p-3 bg-[#f9f9f9] border border-[#e3e3e3] rounded-md space-y-1">
                  <h4 className="text-xs font-bold text-[#1a1a1a]">💡 Permissive Code Fallback</h4>
                  <p className="text-[11px] text-[#616161] leading-relaxed">
                    By choosing <span className="font-bold text-black">"Use Base64 Fallback"</span> we compile the file binary raw so you can proceed edit tasks instantly!
                  </p>
                </div>
              </div>

              <div className="p-4 bg-zinc-50 border-t flex justify-between gap-2.5">
                <button
                  type="button"
                  onClick={handleBase64Fallback}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-xs font-bold shadow-sm"
                >
                  Use Base64 Fallback
                </button>
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="bg-white border border-zinc-300 text-zinc-800 px-4 py-2 rounded-md text-xs font-bold hover:bg-zinc-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 7: ADD IMAGE FROM URL WITH LIVE VISUAL PREVIEW & VERIFICATION */}
      <AnimatePresence>
        {showAddUrlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setShowAddUrlModal(false)} />
            <div className="bg-white rounded-xl border max-w-md w-full z-10 text-left shadow-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b flex justify-between items-center text-zinc-800 font-bold text-sm bg-zinc-50">
                <div className="flex items-center gap-2">
                  <ImageIcon size={18} className="text-blue-600" />
                  <span>Add Product Image from URL</span>
                </div>
                <button onClick={() => setShowAddUrlModal(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4 flex-1">
                {/* Image URL Input */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Image Link URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full border p-2.5 pr-8 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-zinc-700 bg-white"
                      autoFocus
                    />
                    {newImageUrl && (
                      <button 
                        type="button"
                        onClick={() => setNewImageUrl('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Thumbnail Verification Area */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Live Thumbnail Verification
                  </label>
                  <div className="border border-zinc-200 rounded-lg aspect-video bg-zinc-50 relative flex items-center justify-center overflow-hidden">
                    {/* Empty State */}
                    {!newImageUrl.trim() && (
                      <div className="flex flex-col items-center justify-center p-6 text-center space-y-1 text-zinc-400">
                        <LinkIcon size={24} className="opacity-70 animate-pulse text-zinc-300" />
                        <span className="text-xs font-semibold text-zinc-500">Awaiting URL Link</span>
                        <span className="text-[10px] text-zinc-400 leading-normal max-w-[240px]">
                          Paste a valid public image link above to inspect the loaded thumbnail.
                        </span>
                      </div>
                    )}

                    {/* Loading State */}
                    {newImageUrl.trim() && isImagePreviewLoading && (
                      <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-medium text-zinc-500">Verifying image link...</span>
                      </div>
                    )}

                    {/* Error State */}
                    {newImageUrl.trim() && !isImagePreviewLoading && imagePreviewHasError && (
                      <div className="flex flex-col items-center justify-center p-4 text-center space-y-1.5 text-zinc-500">
                        <AlertTriangle size={24} className="text-amber-500" />
                        <span className="text-xs font-bold text-red-600">Verification Failure</span>
                        <span className="text-[10px] text-zinc-500 leading-normal max-w-[300px]">
                          Could not download image. Verify the URL is a direct web image link (CORS or secure configurations may also affect preview rendering).
                        </span>
                      </div>
                    )}

                    {/* Loaded / Success State */}
                    {newImageUrl.trim() && !isImagePreviewLoading && imagePreviewLoaded && (
                      <div className="w-full h-full relative group">
                        <img
                          src={newImageUrl.trim()}
                          alt="Pre-verification preview"
                          className="w-full h-full object-contain p-2"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-sm flex items-center gap-1 px-2 text-[8px] font-mono font-bold tracking-wider uppercase">
                          <Check size={10} strokeWidth={3} />
                          <span>Link Active</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Alt Tag Description Input */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-[#1a1a1a] uppercase tracking-wider block">
                      Alternative Text (Alt Tag)
                    </label>
                    <span className="text-[9px] text-[#616161] font-mono">(Optional but recommended)</span>
                  </div>
                  <input
                    type="text"
                    value={newImageAlt}
                    onChange={(e) => setNewImageAlt(e.target.value)}
                    placeholder="Describe this product picture element..."
                    className="w-full border p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-black text-zinc-800"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-zinc-50 border-t flex justify-end gap-2.5 font-bold text-xs select-none">
                <button
                  type="button"
                  onClick={() => setShowAddUrlModal(false)}
                  className="bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newImageUrl.trim()) return;
                    const cleanUrl = newImageUrl.trim();
                    const newImg: GalleryImage = {
                      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                      url: cleanUrl,
                      thumbnailUrl: cleanUrl,
                      altText: newImageAlt.trim() || title || 'Product Photo',
                      isPrimary: galleryImages.length === 0,
                      order: galleryImages.length
                    };
                    setGalleryImages([...galleryImages, newImg]);
                    setShowAddUrlModal(false);
                    triggerToast("Photo link appended successfully!");
                  }}
                  disabled={!newImageUrl.trim()}
                  className={cn(
                    "px-4 py-2 rounded-lg shadow-xs text-white flex items-center gap-1.5 cursor-pointer",
                    newImageUrl.trim() 
                      ? (imagePreviewLoaded ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700") 
                      : "bg-zinc-300 cursor-not-allowed text-zinc-400"
                  )}
                >
                  {imagePreviewHasError ? "Add URL Anyway" : "Add Image Link"}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX SLIDESHOW MODAL */}
      <AnimatePresence>
        {showLightbox && galleryImages.length > 0 && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            
            {/* Top counter */}
            <div className="absolute top-4 left-6 text-white text-xs font-bold select-none tracking-widest">
              SLIDE PREVIEW: {lightboxIndex + 1} OF {galleryImages.length}
            </div>

            {/* Top Close icon */}
            <button 
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-6 text-zinc-400 hover:text-white transition-colors p-2"
            >
              <X size={20} />
            </button>

            {/* Left shift Arrow */}
            <button
              disabled={lightboxIndex === 0}
              onClick={() => setLightboxIndex(prev => Math.max(0, prev - 1))}
              className="absolute left-6 text-zinc-400 hover:text-white disabled:opacity-20 transition-all p-3 border border-zinc-800 hover:bg-white/5 rounded-full"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Image Centered display */}
            <div className="max-w-3xl w-full max-h-[80vh] flex flex-col items-center justify-center">
              <img 
                src={galleryImages[lightboxIndex]?.url} 
                alt={galleryImages[lightboxIndex]?.altText || title} 
                className="max-h-[70vh] max-w-full object-contain rounded bg-zinc-950 p-2 border border-zinc-800"
              />
              <span className="text-zinc-400 text-xs mt-3 font-semibold text-center italic">
                {galleryImages[lightboxIndex]?.altText || 'No Alt Tag Description.'}
              </span>
            </div>

            {/* Right shift Arrow */}
            <button
              disabled={lightboxIndex === galleryImages.length - 1}
              onClick={() => setLightboxIndex(prev => Math.min(galleryImages.length - 1, prev + 1))}
              className="absolute right-6 text-zinc-400 hover:text-white disabled:opacity-20 transition-all p-3 border border-zinc-800 hover:bg-white/5 rounded-full"
            >
              <ArrowRight size={20} />
            </button>

          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
