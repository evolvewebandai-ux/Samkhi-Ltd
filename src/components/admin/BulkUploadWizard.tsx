import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  Play, 
  Download,
  AlertTriangle,
  FileDown
} from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { Product, Collection } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../firebase';
import { collection, doc, getDocs, setDoc, query, where, getDoc, writeBatch } from 'firebase/firestore';
import { logActivity } from '../../lib/audit';

interface BulkUploadWizardProps {
  onClose: () => void;
}

// Sluggifier utility
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-');        // Replace multiple - with single -
}

const csvTemplate = `Name,SKU,Price,QuantityAvailable,ProductType,Vendor,Tags,Collections,Description,GCT_Taxable,Image
Jamaican Blue Mountain Coffee Single Origin,JAM-BLUE-MTN,4500,150,coffee,Samkhi Coffee,premium,Coffee Collections,Authentic rich coffee beans harvested from Blue Mountain,false,https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600
3kW Hybrid Pure Sine Wave Inverter,INV-3KW-HYB,152000,45,inverter,Samkhi Solar,pure-sine,Inverters,High performance power hybrid inverter with smart utility monitoring features,true,https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=600
48V 100Ah Lithium LiFePO4 Battery Pack,BAT-48V-100AH,280000,12,battery,Samkhi Energy,lithium,Off-Grid Systems,Premium long life utility depth cycle lithium iron phosphate backup cells,true,https://images.unsplash.com/photo-1548613053-220bfb809a63?q=80&w=600`;

const jsonTemplate = `[
  {
    "Name": "350W Monocrystalline Smart Solar Panel",
    "SKU": "SOL-PAN-350W",
    "Price": 28500,
    "QuantityAvailable": 80,
    "ProductType": "solar-panels",
    "Vendor": "Samkhi Solar",
    "Tags": "smart, solar, panel",
    "Collections": "Monocrystalline Solar Panels, Off-Grid Systems",
    "Description": "Premium industrial efficiency multi-busbar solar cell panels",
    "GCT_Taxable": true,
    "Image": "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=600"
  }
]`;

type ImportFormat = 'csv' | 'json';

interface RowError {
  row: number;
  sku: string;
  name: string;
  reason: string;
}

export default function BulkUploadWizard({ onClose }: BulkUploadWizardProps) {
  const { products } = useProducts();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [format, setFormat] = useState<ImportFormat>('csv');
  const [rawData, setRawData] = useState<string>('');
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
  
  // Execution status
  const [importing, setImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importResults, setImportResults] = useState<{
    successful: number; // this is updated
    inserted: number;
    updated: number;
    failed: number;
    skipped: number;
    total: number;
    collectionsLinked: number;
    collectionsAutoCreated: string[];
  } | null>(null);

  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyTemplate = () => {
    const templateText = format === 'csv' ? csvTemplate : jsonTemplate;
    navigator.clipboard.writeText(templateText);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const handleDownloadTemplate = () => {
    const templateText = format === 'csv' ? csvTemplate : jsonTemplate;
    const filename = format === 'csv' ? 'samkhi_products_template.csv' : 'samkhi_products_template.json';
    const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
    
    const blob = new Blob([templateText], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      readFileContent(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      readFileContent(file);
    }
  };

  const readFileContent = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === 'string') {
        setRawData(event.target.result);
        if (file.name.endsWith('.json') || event.target.result.trim().startsWith('[')) {
          setFormat('json');
        } else {
          setFormat('csv');
        }
      }
    };
    reader.readAsText(file);
  };

  // CSV Parsing helper considering escapes & quotes
  const parseCSV = (text: string): Record<string, string>[] => {
    const lines: string[] = [];
    let currentLine = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if ((char === '\n' || char === '\r') && !insideQuotes) {
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
        if (char === '\r' && text[i + 1] === '\n') {
          i++; 
        }
        continue;
      }
      currentLine += char;
    }
    if (currentLine.trim()) {
      lines.push(currentLine);
    }

    if (lines.length === 0) return [];
    
    const parseRow = (rowText: string): string[] => {
      const fields: string[] = [];
      let currentField = '';
      let escaped = false;

      for (let i = 0; i < rowText.length; i++) {
        const char = rowText[i];
        if (char === '"') {
          escaped = !escaped;
        } else if (char === ',' && !escaped) {
          fields.push(currentField.trim().replace(/^"|"$/g, ''));
          currentField = '';
        } else {
          currentField += char;
        }
      }
      fields.push(currentField.trim().replace(/^"|"$/g, ''));
      return fields;
    };

    const headers = parseRow(lines[0]);
    const cleanHeaders = headers.map(h => h.trim());

    const result: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseRow(lines[i]);
      const rowObj: Record<string, string> = {};
      cleanHeaders.forEach((header, index) => {
        rowObj[header] = cols[index] || '';
      });
      result.push(rowObj);
    }
    return result;
  };

  const parseAndValidate = () => {
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];
    const collectedRowErrors: RowError[] = [];
    let items: any[] = [];

    if (!rawData.trim()) {
      setErrors(['Please supply raw input text or select a valid CSV/JSON template data.']);
      return;
    }

    try {
      if (format === 'json') {
        const jsonParsed = JSON.parse(rawData);
        if (!Array.isArray(jsonParsed)) {
          validationErrors.push('JSON root must be an Array of product objects.');
        } else {
          items = jsonParsed;
        }
      } else {
        const rows = parseCSV(rawData);
        if (rows.length === 0) {
          validationErrors.push('No headers or data rows recognized in CSV template.');
        } else {
          items = rows;
        }
      }
    } catch (parseError: any) {
      validationErrors.push(`Format parsing failure: ${parseError?.message || parseError}`);
      setErrors(validationErrors);
      return;
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const finalValidItems: any[] = [];
    const existingSkus = new Set(products.map(p => p.sku?.toUpperCase() || p.id.toUpperCase()));

    items.forEach((item, index) => {
      const rowNum = index + 2; // Rows starts at header (Row 1)
      
      // Map keys case-insensitively
      const Name = item.Name || item.name || '';
      const SKU = item.SKU || item.sku || '';
      const PriceRaw = item.Price ?? item.price;
      const QtyAvailableRaw = item.QuantityAvailable ?? item.quantityavailable ?? item.inventory ?? item.inStock ?? '';
      
      const ProductType = item.ProductType || item.producttype || item.category || '';
      const Vendor = item.Vendor || item.vendor || item.brand || '';
      const Tags = item.Tags || item.tags || '';
      const Collections = item.Collections || item.collections || '';
      const Description = item.Description || item.description || '';
      const GCT_Taxable = item.GCT_Taxable ?? item.gct_taxable ?? item.taxable ?? '';

      // 1. Validation checks
      if (!Name.trim()) {
        collectedRowErrors.push({
          row: rowNum,
          sku: SKU,
          name: Name,
          reason: "Product name is required"
        });
        return;
      }

      if (!SKU.trim()) {
        collectedRowErrors.push({
          row: rowNum,
          sku: SKU,
          name: Name,
          reason: "SKU is empty or missing"
        });
        return;
      }

      const parsedPrice = parseFloat(String(PriceRaw));
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        collectedRowErrors.push({
          row: rowNum,
          sku: SKU,
          name: Name,
          reason: `Invalid price: ${PriceRaw || 'empty'} (must be greater than 0)`
        });
        return;
      }

      const parsedQty = parseFloat(String(QtyAvailableRaw));
      if (isNaN(parsedQty) || !Number.isInteger(parsedQty) || parsedQty < 0) {
        collectedRowErrors.push({
          row: rowNum,
          sku: SKU,
          name: Name,
          reason: `Invalid QuantityAvailable: ${QtyAvailableRaw || 'empty'} (must be an integer >= 0)`
        });
        return;
      }

      // Convert SKU to standard document id
      const finalId = SKU.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');

      // Duplicate SKU checker in batch selection
      const isDuplicateInSelection = finalValidItems.some(f => f.sku?.toUpperCase() === SKU.toUpperCase());
      if (isDuplicateInSelection) {
        collectedRowErrors.push({
          row: rowNum,
          sku: SKU,
          name: Name,
          reason: "SKU ID repeated multiple times in this upload sheet"
        });
        return;
      }

      // Extract unique images from case-insensitive and space-flexible check
      let uniqueImageLinks: string[] = [];
      
      // Look up keys case-insensitively and space-insensitively
      let rawImagesValue: any = null;
      const itemKeys = Object.keys(item);
      
      const directMatch = item.Image ?? item.image ?? item.ImageUrl ?? item.imageurl ?? item.ImageURL ?? item.Images ?? item.images ?? item["Image URL"] ?? item["image url"] ?? item["image_url"] ?? item["ImageUrl"] ?? item["ImgUrl"] ?? item["imgUrl"] ?? item["ImageURL"] ?? item["Image_URL"] ?? item["images_url"] ?? item["Images_URL"];
      if (directMatch !== undefined && directMatch !== null) {
        rawImagesValue = directMatch;
      } else {
        for (const key of itemKeys) {
          const normalizedKey = key.toLowerCase().replace(/[\s\-_]/g, '');
          if (normalizedKey === 'image' || 
              normalizedKey === 'images' || 
              normalizedKey === 'imageurl' || 
              normalizedKey === 'imageurls' || 
              normalizedKey === 'imgurl' || 
              normalizedKey === 'imagesurl' || 
              normalizedKey === 'photos' ||
              normalizedKey === 'photo' ||
              normalizedKey === 'pic' ||
              normalizedKey === 'pics' ||
              normalizedKey === 'picture' ||
              normalizedKey === 'pictures') {
            rawImagesValue = item[key];
            break;
          }
        }
      }

      if (Array.isArray(rawImagesValue)) {
        rawImagesValue.forEach(img => {
          if (typeof img === 'string') {
            uniqueImageLinks.push(img.trim());
          } else if (img && typeof img === 'object' && img.url) {
            uniqueImageLinks.push(img.url.trim());
          }
        });
      } else if (rawImagesValue) {
        // Support splitting by commas, semicolons, pipe character or space if they are URLs
        uniqueImageLinks = String(rawImagesValue)
          .split(/[,;|]+/)
          .map(link => link.trim())
          .filter(Boolean);
      }

      // Filter duplicates keeping the original order
      const finalUniqueImageLinks = Array.from(new Set(uniqueImageLinks));

      const finalImageUrl = finalUniqueImageLinks[0] || 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=600';

      const finalImagesList = finalUniqueImageLinks.map((url, idx) => ({
        id: `img_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        url: url,
        thumbnailUrl: url,
        altText: `${Name} Image ${idx + 1}`,
        isPrimary: idx === 0,
        order: idx
      }));

      // Valid Item fields constructed
      const validItem = {
        id: finalId,
        sku: SKU,
        name: Name,
        price: parsedPrice,
        inventory: parsedQty,
        brand: Vendor || 'Samkhi',
        tags: Tags ? Tags.split(',').map((t: string) => t.trim().toLowerCase()) : (ProductType ? [ProductType.trim().toLowerCase()] : ['solar-panels']),
        collections: Collections ? Collections.split(',').map((c: string) => c.trim()) : [],
        description: Description || '',
        imageUrl: finalImageUrl,
        images: finalImagesList,
        inStock: parsedQty > 0,
        taxable: String(GCT_Taxable).toLowerCase() === 'true' || String(GCT_Taxable) === '1' || String(GCT_Taxable).toLowerCase() === 'yes',
        specifications: item.specifications || {},
        variants: item.variants || [],
        rowNumber: rowNum
      };

      // Add overwrite indicator
      const docExists = existingSkus.has(SKU.toUpperCase());
      if (docExists) {
        if (overwriteExisting) {
          validationWarnings.push(`Row ${rowNum} (${SKU}): Already exists and WILL BE OVERWRITTEN.`);
        } else {
          validationWarnings.push(`Row ${rowNum} (${SKU}): Already exists and will be SKIPPED.`);
        }
      }

      finalValidItems.push(validItem);
    });

    setErrors(validationErrors);
    setWarnings(validationWarnings);
    setRowErrors(collectedRowErrors);
    setParsedItems(finalValidItems);

    setErrorTableDowloaded(false);

    // If we have some valid elements or warning logs we let them progress to step 3 preview
    if (validationErrors.length === 0 && (finalValidItems.length > 0 || collectedRowErrors.length > 0)) {
      setStep(3);
    }
  };

  const [errorTableDowloaded, setErrorTableDowloaded] = useState(false);

  const handleDownloadRowErrorsCSV = () => {
    let headers = "Row Number,SKU,Product Name,Error Reason\n";
    const bodyCols = rowErrors.map(e => `"${e.row}","${e.sku || ''}","${e.name || ''}","${e.reason}"`).join('\n');
    const fullText = headers + bodyCols;
    
    const blob = new Blob([fullText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "samkhi_bulk_import_errors.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setErrorTableDowloaded(true);
  };

  const handleExecuteImport = async () => {
    setImporting(true);
    setImportProgress(0);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    let collectionsLinkedCount = 0;
    const autoCreatedCollections: string[] = [];

    // Fetch collections and tags once for local rapid memo lookup
    const colsCollSnap = await getDocs(collection(db, 'collections'));
    const allCollectionsInSystem: Collection[] = [];
    colsCollSnap.forEach(snap => {
      allCollectionsInSystem.push({ id: snap.id, ...snap.data() } as Collection);
    });

    const tagsCollSnap = await getDocs(collection(db, 'tags'));
    const tagsInSystem = new Set<string>();
    tagsCollSnap.forEach(snap => {
      const tagData = snap.data();
      if (tagData.slug) tagsInSystem.add(tagData.slug);
    });

    const existedProductsMap = new Map<string, Product>();
    const prodSnap = await getDocs(collection(db, 'products'));
    prodSnap.forEach(snap => {
      const p = snap.data() as Product;
      existedProductsMap.set(p.id, p);
    });

    const totalCount = parsedItems.length;

    for (let i = 0; i < totalCount; i++) {
      const item = parsedItems[i];
      const percent = Math.round(((i + 1) / totalCount) * 100);
      const isOverride = existedProductsMap.has(item.id);

      if (isOverride && !overwriteExisting) {
        skipped++;
        setImportProgress(percent);
        continue;
      }

      try {
        // A. Set products document
        const fieldsToSave: Product = {
          id: item.id,
          sku: item.sku,
          name: item.name,
          price: item.price,
          brand: item.brand,
          tags: item.tags,
          description: item.description,
          imageUrl: item.imageUrl,
          images: item.images || [],
          inStock: item.inStock,
          inventory: item.inventory,
          specifications: item.specifications || {},
          variants: item.variants || []
        };
        
        await setDoc(doc(db, 'products', item.id), fieldsToSave);

        if (isOverride) updated++;
        else inserted++;

        // B. Handle Tags Auto-Creation
        if (item.tags && item.tags.length > 0) {
          for (const rawTag of item.tags) {
            const tagStr = rawTag.toLowerCase().trim();
            const tagSlug = slugify(tagStr);
            if (tagSlug && !tagsInSystem.has(tagSlug)) {
              await setDoc(doc(db, 'tags', tagSlug), {
                id: tagSlug,
                slug: tagSlug,
                name: tagStr,
                products_count: 0,
                created_at: new Date().toISOString()
              });
              tagsInSystem.add(tagSlug);
              console.log(`[Tags Seeded] Auto-created tag: ${tagStr}`);
            }
          }
        }

        // C. Auto-create manual Collections & generate links
        if (item.collections && item.collections.length > 0) {
          for (const rawColName of item.collections) {
            const colName = rawColName.trim();
            const colHandle = slugify(colName);
            if (!colHandle) continue;

            let targetCol = allCollectionsInSystem.find(c => c.handle === colHandle || c.title.toLowerCase() === colName.toLowerCase());

            if (!targetCol) {
              const newColId = `col_${colHandle}`;
              const colDoc: any = {
                id: newColId,
                title: colName,
                handle: colHandle,
                collection_type: 'manual',
                type: 'manual',
                description: 'Auto-created during bulk product upload processing.',
                status: 'active',
                published_channels: ['online_store'],
                productCount: 0,
                products_count: 0,
                created_at: new Date().toISOString(),
                created_by: 'bulk_import'
              };
              
              await setDoc(doc(db, 'collections', newColId), colDoc);
              targetCol = { id: newColId, ...colDoc } as Collection;
              allCollectionsInSystem.push(targetCol);
              autoCreatedCollections.push(colName);
              console.log(`[Collection Securing] Auto-created manual: ${colName}`);
            }

            // Link Product to Collection in collection_products
            const linkId = `${targetCol.id}_${item.id}`;
            await setDoc(doc(db, 'collection_products', linkId), {
              id: linkId,
              collection_id: targetCol.id,
              product_id: item.id,
              position: 0
            });
            collectionsLinkedCount++;
          }
        }

        // D. Create / Update Inventory Levels Index
        const levelRef = doc(db, 'inventory_levels', item.id);
        const levelSnap = await getDoc(levelRef);
        if (levelSnap.exists()) {
          await setDoc(levelRef, {
            sku: item.sku,
            quantityOnHand: item.inventory,
            quantityAvailable: item.inventory,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } else {
          await setDoc(levelRef, {
            id: item.id,
            productId: item.id,
            quantityOnHand: item.inventory,
            quantityReserved: 0,
            quantityAvailable: item.inventory,
            quantityIncoming: 0,
            reorderPoint: 10,
            reorderQuantity: 25,
            lowStockThreshold: 5,
            isTracked: true,
            sku: item.sku,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }

        // Write audit transaction activity entry
        await setDoc(doc(collection(db, 'inventory_transactions')), {
          productId: item.id,
          transactionType: 'adjusted',
          quantityChange: item.inventory,
          quantityBefore: 0,
          quantityAfter: item.inventory,
          referenceType: 'adjustment',
          notes: "Generated automatically via bulk import tool validation",
          performedBy: "Bulk Ingestion System",
          performedAt: new Date().toISOString()
        });

      } catch (err) {
        console.error(`Row ingest error for SKU ${item.sku}:`, err);
        failed++;
      }
      setImportProgress(percent);
    }

    // Recalculate each manual & automated collection's product counts safely
    try {
      const activeProdsSnap = await getDocs(collection(db, 'products'));
      const activeProductsList: Product[] = [];
      activeProdsSnap.forEach(docSnap => {
        activeProductsList.push({ id: docSnap.id, ...docSnap.data() } as Product);
      });

      const linksSnap = await getDocs(collection(db, 'collection_products'));
      const activeLinksList: any[] = [];
      linksSnap.forEach(docSnap => {
        activeLinksList.push(docSnap.data());
      });

      const colsResetSnap = await getDocs(collection(db, 'collections'));
      const recountBatch = writeBatch(db);
      colsResetSnap.forEach(docSnap => {
        const col = docSnap.data() as Collection;
        let cCount = 0;
        if (col.type === 'automated' || col.collection_type === 'automated') {
          // Automated rules recount (will just set or stay 0 on empty rules)
          const conditionOperator = (col as any).conditionOperator || 'all';
          const conditions = (col as any).conditions || [];
          cCount = activeProductsList.filter(p => {
            if (conditions.length === 0) return false;
            const results = conditions.map((cond: any) => {
              if (cond.field === 'title') {
                return p.name.toLowerCase().includes(cond.value.toLowerCase());
              }
              if (cond.field === 'vendor') {
                return (p.brand || '').toLowerCase() === cond.value.toLowerCase();
              }
              if (cond.field === 'tag') {
                return (p.tags || []).some(t => t.toLowerCase() === cond.value.toLowerCase());
              }
              return false;
            });
            return conditionOperator === 'any' ? results.some(r => r) : results.every(r => r);
          }).length;
        } else {
          // Manual links recount
          cCount = activeLinksList.filter(link => link.collection_id === docSnap.id).length;
        }
        recountBatch.update(doc(db, 'collections', docSnap.id), { 
          productCount: cCount,
          products_count: cCount 
        });
      });
      await recountBatch.commit();
    } catch (eRecount) {
      console.warn("Counts recount step warning:", eRecount);
    }

    // Done! Log bulk upload summary
    await logActivity(`Bulk product sheet imported. Inserted: ${inserted}, Updated: ${updated}, Linked: ${collectionsLinkedCount}, Errors skipped: ${failed}`);

    setImportResults({
      successful: inserted + updated,
      inserted,
      updated,
      failed,
      skipped,
      total: totalCount,
      collectionsLinked: collectionsLinkedCount,
      collectionsAutoCreated: Array.from(new Set(autoCreatedCollections))
    });

    setImporting(false);
    setStep(4);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !importing && onClose()}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
      />

      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        className="relative w-full max-w-4xl bg-white border border-[#e3e3e3] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-20 text-slate-800 animate-slideUp"
      >
        <div className="px-6 py-5 border-b border-[#f1f1f1] flex justify-between items-center bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 px-1.5 bg-black text-white text-[9px] font-bold rounded uppercase tracking-wider font-mono">Bulk Import Portal</span>
              <h2 className="text-base font-bold text-slate-900">Products Import Wizard</h2>
            </div>
            <p className="text-[11px] text-[#616161] mt-1">
              Ingest catalog collections atomically. Fully validates CSV rows, creates missing manual collections and tags instantly.
            </p>
          </div>
          <button 
            disabled={importing}
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 rounded-full text-[#616161] hover:text-[#1a1a1a] transition-all disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="w-full bg-slate-100 h-1 flex">
          <div className={cn("transition-all duration-300 h-full bg-emerald-500", 
            step === 1 ? 'w-1/4' : step === 2 ? 'w-2/4' : step === 3 ? 'w-3/4' : 'w-full'
          )} />
        </div>

        <div className="bg-slate-50 px-6 py-3 border-b border-[#e3e3e3] flex justify-between text-xs font-semibold font-mono text-[#616161]">
          <div className="flex gap-4">
            <span className={cn(step === 1 ? "text-slate-900 border-b-2 border-black" : "")}>1. Format Selection</span>
            <span className={cn(step === 2 ? "text-slate-900 border-b-2 border-black" : "")}>2. Load Content</span>
            <span className={cn(step === 3 ? "text-slate-900 border-b-2 border-black" : "")}>3. Pre-flight Validation</span>
            <span className={cn(step === 4 ? "text-slate-900 border-b-2 border-black" : "")}>4. Final Result</span>
          </div>
          <div>
            Step <span className="text-slate-900 font-bold">{step}</span> of 4
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto min-h-[350px]">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div 
                onClick={() => setFormat('csv')}
                className={cn(
                  "border-2 rounded-xl p-5 cursor-pointer flex flex-col gap-3 transition-all hover:bg-slate-50/50",
                  format === 'csv' ? "border-black bg-slate-50/20" : "border-slate-200"
                )}
              >
                <div className="p-3 bg-indigo-50 text-indigo-650 rounded-lg w-fit">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Standard CSV Format</h3>
                  <p className="text-xs text-[#616161] mt-1 leading-relaxed">
                    Import products, tags, and custom collections via spreadsheets. Commas separate the row criteria.
                  </p>
                </div>
              </div>

              <div 
                onClick={() => setFormat('json')}
                className={cn(
                  "border-2 rounded-xl p-5 cursor-pointer flex flex-col gap-3 transition-all hover:bg-slate-50/50",
                  format === 'json' ? "border-black bg-slate-50/20" : "border-slate-200"
                )}
              >
                <div className="p-3 bg-emerald-50 text-emerald-650 rounded-lg w-fit">
                  <Database size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">JSON Ingest File</h3>
                  <p className="text-xs text-[#616161] mt-1 leading-relaxed">
                    Load serialized array objects in key-value structure formatting conforming with standard schema layouts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold font-mono text-slate-900 select-none uppercase tracking-wider">Configure properties & load data</span>
                <div className="flex gap-2">
                  <button 
                    onClick={handleCopyTemplate}
                    className="p-1 px-3.5 hover:bg-slate-100 rounded text-xs font-mono font-bold border border-slate-200"
                  >
                    {copiedTemplate ? "Copied!" : "Copy Template"}
                  </button>
                  <button 
                    onClick={handleDownloadTemplate}
                    className="p-1 px-3.5 hover:bg-slate-100 rounded text-xs font-mono font-bold flex items-center gap-1.5 border border-slate-200"
                  >
                    <Download size={13} />
                    Download File
                  </button>
                </div>
              </div>

              {/* Drag n drop container */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer transition-all hover:border-slate-400/80 hover:bg-slate-50/50 flex flex-col items-center justify-center gap-2",
                  dragActive ? "border-black bg-slate-50" : ""
                )}
              >
                <Upload className="text-slate-400" size={28} />
                <span className="text-xs font-bold text-slate-900">Drag & Drop catalog file here or click to browse</span>
                <p className="text-[10px] text-[#616161] font-mono">Accepts valid .csv or .json text grids</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".csv,.json"
                  className="hidden" 
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#616161] uppercase tracking-wider">Raw content box:</span>
                <textarea
                  value={rawData}
                  onChange={(e) => setRawData(e.target.value)}
                  placeholder="Paste your CSV row strings or JSON schema arrays here directly..."
                  className="w-full h-44 bg-slate-55 bg-slate-100 border border-slate-200 rounded-xl p-3 font-mono text-[10.5px] focus:outline-none focus:ring-1 focus:ring-black leading-relaxed"
                />
              </div>

              {/* Conflict Mode */}
              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-600" />
                  <span className="text-xs font-bold text-slate-900">If product SKU matches an existing record:</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setOverwriteExisting(true)}
                    className={cn(
                      "p-1.5 px-3 rounded text-xs font-bold transition-all",
                      overwriteExisting ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-700"
                    )}
                  >
                    Overwrite Item
                  </button>
                  <button 
                    onClick={() => setOverwriteExisting(false)}
                    className={cn(
                      "p-1.5 px-3 rounded text-xs font-bold transition-all",
                      !overwriteExisting ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700"
                    )}
                  >
                    Skip Invalidation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center select-none bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 text-xs">
                  <Database size={15} className="text-slate-800" />
                  <span className="font-bold text-slate-900">We detected {parsedItems.length} valid product rows that are ready to import.</span>
                </div>
                {rowErrors.length > 0 && (
                  <button
                    onClick={handleDownloadRowErrorsCSV}
                    className="p-1 px-3 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <AlertTriangle size={13} />
                    <span>Download {rowErrors.length} validation errors ({errorTableDowloaded ? "Downloaded" : "CSV"})</span>
                  </button>
                )}
              </div>

              {/* Warnings and alerts panel block */}
              {warnings.length > 0 && (
                <div className="max-h-24 overflow-y-auto p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1 font-mono text-[10px] text-amber-900">
                  <span className="font-bold block uppercase tracking-wider mb-1">Pre-flight Warnings list:</span>
                  {warnings.slice(0, 10).map((w, idx) => <p key={idx}>• {w}</p>)}
                  {warnings.length > 10 && <p className="font-semibold">+ {warnings.length - 10} more warnings ignored...</p>}
                </div>
              )}

              {/* Row parsing errors panel block */}
              {rowErrors.length > 0 && (
                <div className="border border-red-200 rounded-xl overflow-hidden bg-red-50/20">
                  <div className="bg-red-50 text-red-800 p-2.5 px-4 font-mono text-xs font-bold border-b border-red-200 flex justify-between items-center">
                    <span>ROW SCHEMATIC ERRORS - These {rowErrors.length} rows will be SKIPPED</span>
                    <span className="text-[10px] select-none uppercase py-0.5 bg-red-100 px-1.5 rounded">Validation Failed</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-left text-[11px] font-mono divide-y divide-red-100">
                      <thead>
                        <tr className="bg-red-50/50 text-red-900 font-bold select-none">
                          <th className="p-2 px-4 w-16">Row</th>
                          <th className="p-2 w-32">SKU</th>
                          <th className="p-2 w-48">Product Name</th>
                          <th className="p-2 px-4">Error Cause</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100/50">
                        {rowErrors.slice(0, 50).map((err, idx) => (
                          <tr key={idx} className="hover:bg-red-50/40 text-red-950">
                            <td className="p-2 px-4 font-bold">{err.row}</td>
                            <td className="p-2 font-semibold text-[10.5px]">{err.sku || 'N/A'}</td>
                            <td className="p-2 font-semibold truncate max-w-[200px]">{err.name || 'N/A'}</td>
                            <td className="p-2 px-4 text-red-650 font-bold">{err.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Rows preview list table for proceed items */}
              {parsedItems.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#616161] uppercase tracking-wider">Preview of items about to be imported ({parsedItems.length})</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs divide-y divide-slate-250">
                      <thead>
                        <tr className="bg-slate-50 text-slate-800 font-bold select-none border-b border-slate-200">
                          <th className="px-4 py-2 text-center w-12">Row</th>
                          <th className="px-4 py-2 w-16">Image</th>
                          <th className="px-4 py-2 w-28">SKU/ID</th>
                          <th className="px-4 py-2">Product Name</th>
                          <th className="px-4 py-2 w-24">Brand</th>
                          <th className="px-4 py-2 text-right w-24">Price</th>
                          <th className="px-4 py-2 text-center w-20">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedItems.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-55 hover:bg-slate-50/50 text-slate-700">
                            <td className="px-4 py-2.5 text-center font-mono font-bold">{item.rowNumber}</td>
                            <td className="px-4 py-2.5">
                              <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden bg-slate-50">
                                <img 
                                  src={item.imageUrl} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=600';
                                  }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[10px] font-bold text-slate-900">{item.sku}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-900 truncate max-w-[320px]">{item.name}</td>
                            <td className="px-4 py-2.5 text-slate-500 font-semibold">{item.brand}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-700">${(item.price || 0).toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-center font-mono font-semibold text-slate-800">{item.inventory} units</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="py-4 text-center space-y-6 max-w-lg mx-auto">
              <div className="flex justify-center">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 animate-bounce">
                  <CheckCircle2 size={44} strokeWidth={2.5} />
                </div>
              </div>

              <div>
                <h3 className="text-md font-bold text-slate-950 uppercase tracking-wider font-mono">Import Processing Completed!</h3>
                <p className="text-xs text-[#616161] mt-1">
                  Catalog and collection alignments have been written to Firebase. Check the results matrix below.
                </p>
              </div>

              {importResults && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 bg-slate-50 border border-slate-200 rounded-xl p-4 divide-y md:divide-y-0 md:divide-x divide-slate-250 text-left">
                    <div className="px-3 py-2 md:py-0">
                      <div className="text-[9px] font-bold text-[#616161] uppercase font-mono tracking-wider">Inserted</div>
                      <div className="text-lg font-extrabold text-emerald-700 mt-0.5">{importResults.inserted}</div>
                      <div className="text-[9px] text-[#616161] font-mono">new documents</div>
                    </div>
                    <div className="px-3 py-2 md:py-0">
                      <div className="text-[9px] font-bold text-[#616161] uppercase font-mono tracking-wider">Overwritten</div>
                      <div className="text-lg font-extrabold text-amber-600 mt-0.5">{importResults.updated}</div>
                      <div className="text-[9px] text-[#616161] font-mono">updated existents</div>
                    </div>
                    <div className="px-3 py-2 md:py-0">
                      <div className="text-[9px] font-bold text-[#616161] uppercase font-mono tracking-wider">Skipped / Ignored</div>
                      <div className="text-lg font-extrabold text-[#616161] mt-0.5">{importResults.skipped}</div>
                      <div className="text-[9px] text-[#616161] font-mono">overlap no-writes</div>
                    </div>
                    <div className="px-3 py-2 md:py-0">
                      <div className="text-[9px] font-bold text-[#616161] uppercase font-mono tracking-wider">Validation Skipped</div>
                      <div className="text-lg font-extrabold text-red-600 mt-0.5">{rowErrors.length}</div>
                      <div className="text-[9px] text-[#616161] font-mono">broken row sheets</div>
                    </div>
                  </div>

                  <div className="bg-emerald-50/40 border border-emerald-150 p-4 rounded-xl text-left text-xs space-y-2.5">
                    <h4 className="font-bold text-emerald-950 font-mono uppercase tracking-wider text-[10px]">Auto-Collections Linked & Created</h4>
                    <p className="text-emerald-900">Total manual collection elements linked: <span className="font-mono font-bold text-emerald-700">{importResults.collectionsLinked}</span> linkages</p>
                    {importResults.collectionsAutoCreated.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-emerald-905 font-medium">New manual Collections auto-created <span className="font-bold text-emerald-700">({importResults.collectionsAutoCreated.length})</span>:</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {importResults.collectionsAutoCreated.map((name, i) => (
                            <span key={i} className="bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-emerald-800 text-[10.5px] italic">No active new collections had to be compiled (all linked to pre-existing containers).</p>
                    )}
                  </div>
                </div>
              )}

              {/* Errors downoader helper block if any left */}
              {rowErrors.length > 0 && !errorTableDowloaded && (
                <button
                  onClick={handleDownloadRowErrorsCSV}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-150 border border-rose-200 text-rose-800 font-bold rounded-lg text-xs flex justify-center items-center gap-1.5 transition-all"
                >
                  <FileDown size={14} />
                  <span>Download Row errors report CSV now</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.location.reload(); // simple hot sync refresh
                }}
                className="bg-black text-white w-full py-3 text-xs font-bold rounded-lg transition-all active:scale-98 shadow-md"
              >
                Complete Ingestion and Reload Catalog
              </button>
            </div>
          )}
        </div>

        {importing && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex flex-col items-center justify-center z-35 space-y-4">
            <Loader2 className="animate-spin text-slate-900" size={32} />
            <div className="text-center space-y-1">
              <span className="text-xs uppercase font-mono font-bold text-slate-800">Transmitting catalog lines...</span>
              <p className="text-[10px] text-[#616161]">Writing files securely to Firebase. Progress {importProgress}%</p>
            </div>
            
            <div className="w-56 bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-black h-full transition-all duration-150" 
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}

        {step !== 4 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-[#e3e3e3] flex justify-between items-center shrink-0 border-b border-b-slate-100">
            <div>
              {step > 1 ? (
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => setStep(prev => (prev - 1) as any)}
                  className="bg-white border border-[#d1d1d1] text-[#1a1a1a] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#f6f6f6] flex items-center gap-1.5 transition-all disabled:opacity-50 active:scale-98"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              ) : (
                <span className="text-[10px] font-mono text-[#616161]">
                  * Required columns: <b>Name</b>, <b>SKU</b>, <b>Price</b>, <b>QuantityAvailable</b>
                </span>
              )}
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={importing}
                onClick={onClose}
                className="bg-transparent text-slate-650 hover:text-slate-900 px-3 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="bg-black text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-black/95 flex items-center gap-1.5 transition-all active:scale-98 shadow-sm"
                >
                  <span>Pasted Content / File</span>
                  <ArrowRight size={14} />
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  onClick={parseAndValidate}
                  className="bg-black text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-black/95 flex items-center gap-1.5 transition-all active:scale-98 shadow-sm"
                >
                  <span>Run Precheck validations</span>
                  <Play size={13} fill="currentColor" />
                </button>
              )}

              {step === 3 && (
                <button
                  type="button"
                  disabled={parsedItems.length === 0}
                  onClick={handleExecuteImport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 shadow-sm"
                >
                  <span>Transmit to Database ({parsedItems.length} valid)</span>
                  <Database size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
