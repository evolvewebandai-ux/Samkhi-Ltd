import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  InventoryLevel, 
  InventoryTransaction, 
  Supplier, 
  PurchaseOrder, 
  PurchaseOrderItem, 
  Product, 
  ProductVariant,
  InventoryTransactionType,
  InventoryReferenceType
} from '../types';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanUndefined } from '../firebase';
import { useProducts } from './ProductContext';
import { useAdminAuth } from './AdminAuthContext';

interface InventoryContextType {
  inventoryLevels: InventoryLevel[];
  transactions: InventoryTransaction[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  purchaseOrderItems: PurchaseOrderItem[];
  
  // Levels Core actions
  addInventoryLevel: (level: InventoryLevel) => Promise<void>;
  updateInventoryLevel: (id: string, updates: Partial<InventoryLevel>) => Promise<void>;
  deleteInventoryLevel: (id: string) => Promise<void>;
  bulkAdjustLevels: (adjustments: { id: string; delta: number; notes: string; type: InventoryTransactionType; refType: InventoryReferenceType; refId?: string }[]) => Promise<void>;
  performPhysicalCount: (levelsToCount: { id: string; count: number; notes: string }[]) => Promise<void>;
  
  // Suppliers Actions
  addSupplier: (supplier: Supplier) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  removeSupplier: (id: string) => Promise<void>;
  
  // Purchase Order Actions
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt' | 'updatedAt'>, items: Omit<PurchaseOrderItem, 'id' | 'poId' | 'createdAt'>[]) => Promise<string>;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => Promise<void>;
  receivePurchaseOrder: (poId: string, itemReceipts: { itemId: string; quantityReceived: number }[]) => Promise<void>;
  cancelPurchaseOrder: (poId: string) => Promise<void>;
  
  // Sync Status Helper
  isSynced: boolean;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup_kingston_solar',
    name: 'Kingston Solar Supplies Ltd',
    contactName: 'Ricardo Johnson',
    email: 'sales@kingstonsolar.com',
    phone: '876-555-0192',
    address: '12 Constant Spring Road, Kingston 10, Jamaica',
    leadTimeDays: 7,
    notes: 'Handles heavy-duty commercial solar panels, structural rails, and hybrid controllers.',
    isActive: true
  },
  {
    id: 'sup_carib_lighting',
    name: 'Caribbean Lighting Distributors',
    contactName: 'Nesta Patterson',
    email: 'nesta@cariblighting.com',
    phone: '876-908-4122',
    address: '45 Barnett Street, Montego Bay, St. James, Jamaica',
    leadTimeDays: 5,
    notes: 'A range of lighting, landscape bulbs, solar floodlights, and decorative pathway fixtures.',
    isActive: true
  },
  {
    id: 'sup_tropical_volt',
    name: 'Tropical Volt Storage Solutions',
    contactName: 'Donna Chung',
    email: 'dchung@tropicalvolt.com',
    phone: '876-630-1144',
    address: '8 Ward Avenue, Mandeville, Manchester, Jamaica',
    leadTimeDays: 4,
    notes: 'Specialist for high-efficiency lithium battery enclosures and smart charge monitors.',
    isActive: true
  }
];

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const { products, updateProduct } = useProducts();
  const { isManager, loading: authLoading } = useAdminAuth();
  const [inventoryLevels, setInventoryLevels] = useState<InventoryLevel[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseOrderItems, setPurchaseOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [isSynced, setIsSynced] = useState(false);

  // Synthesize complete coverage of levels for UI consumption even before cloud bootstrap
  const effectiveInventoryLevels = React.useMemo(() => {
    const levelsMap = new Map<string, InventoryLevel>();
    inventoryLevels.forEach(lvl => {
      const key = lvl.variantId ? `${lvl.productId}_${lvl.variantId}` : lvl.productId;
      levelsMap.set(key, lvl);
    });

    const list: InventoryLevel[] = [...inventoryLevels];
    if (products.length > 0) {
      for (const prod of products) {
        const hasVariants = prod.variants && prod.variants.length > 0;
        if (hasVariants) {
          for (const variant of prod.variants!) {
            const key = `${prod.id}_${variant.id}`;
            if (!levelsMap.has(key)) {
              const onHand = variant.inventory ?? 0;
              const lvlId = `lvl_${prod.id}_${variant.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
              const synth: InventoryLevel = {
                id: lvlId,
                productId: prod.id,
                variantId: variant.id,
                quantityOnHand: onHand,
                quantityReserved: 0,
                quantityAvailable: onHand,
                quantityIncoming: 0,
                reorderPoint: 10,
                reorderQuantity: 30,
                lowStockThreshold: 5,
                isTracked: true,
                lastCountedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              list.push(synth);
              levelsMap.set(key, synth);
            }
          }
        } else {
          const key = prod.id;
          if (!levelsMap.has(key)) {
            const onHand = prod.inventory ?? (prod.inStock ? 50 : 0);
            const lvlId = `lvl_${prod.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
            const synth: InventoryLevel = {
              id: lvlId,
              productId: prod.id,
              quantityOnHand: onHand,
              quantityReserved: 0,
              quantityAvailable: onHand,
              quantityIncoming: 0,
              reorderPoint: 10,
              reorderQuantity: 50,
              lowStockThreshold: 5,
              isTracked: true,
              lastCountedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            list.push(synth);
            levelsMap.set(key, synth);
          }
        }
      }
    }
    return list;
  }, [inventoryLevels, products]);

  // Load Real-time Data
  useEffect(() => {
    let unsubLevels = () => {};
    let unsubTransactions = () => {};
    let unsubSuppliers = () => {};
    let unsubOrders = () => {};
    let unsubOrderItems = () => {};

    try {
      // 1. Inventory Levels
      const levelsColl = collection(db, 'inventory_levels');
      unsubLevels = onSnapshot(levelsColl, (snapshot) => {
        const list: InventoryLevel[] = [];
        snapshot.forEach(d => {
          list.push({ ...d.data(), id: d.id } as InventoryLevel);
        });
        setInventoryLevels(list);
      }, (error) => {
        console.error("Levels fetch failed. Falling back.", error);
      });

      // 2. Transactions
      const transactionsColl = collection(db, 'inventory_transactions');
      unsubTransactions = onSnapshot(transactionsColl, (snapshot) => {
        const list: InventoryTransaction[] = [];
        snapshot.forEach(d => {
          list.push({ ...d.data(), id: d.id } as InventoryTransaction);
        });
        // Sort transactions newest first
        list.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
        setTransactions(list);
      }, (error) => {
        console.error("Transactions fetch failed. Falling back.", error);
      });

      // 3. Suppliers
      const suppliersColl = collection(db, 'suppliers');
      unsubSuppliers = onSnapshot(suppliersColl, (snapshot) => {
        const list: Supplier[] = [];
        snapshot.forEach(d => {
          list.push({ ...d.data(), id: d.id } as Supplier);
        });
        setSuppliers(list);
      }, (error) => {
        console.error("Suppliers fetch failed. Falling back.", error);
      });

      // 4. Purchase Orders
      const poColl = collection(db, 'purchase_orders');
      unsubOrders = onSnapshot(poColl, (snapshot) => {
        const list: PurchaseOrder[] = [];
        snapshot.forEach(d => {
          list.push({ ...d.data(), id: d.id } as PurchaseOrder);
        });
        // Sort purchase orders newest first
        list.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
        setPurchaseOrders(list);
      }, (error) => {
        console.error("Purchase orders fetch failed. Falling back.", error);
      });

      // 5. Purchase Order Items
      const poItemColl = collection(db, 'purchase_order_items');
      unsubOrderItems = onSnapshot(poItemColl, (snapshot) => {
        const list: PurchaseOrderItem[] = [];
        snapshot.forEach(d => {
          list.push({ ...d.data(), id: d.id } as PurchaseOrderItem);
        });
        setPurchaseOrderItems(list);
      }, (error) => {
        console.error("PO Items fetch failed. Falling back.", error);
      });

      setIsSynced(true);
    } catch (err) {
      console.error("Failed to connect live listeners, check rules:", err);
    }

    return () => {
      unsubLevels();
      unsubTransactions();
      unsubSuppliers();
      unsubOrders();
      unsubOrderItems();
    };
  }, []);

  // Lazy Bootstrap: Check inventory catalog and sync with currently loaded products
  useEffect(() => {
    const runBootstrap = async () => {
      // Only authenticated managers/admins should commit mutations or cleanup to Firestore.
      // Guests, customers, or pending auth states should never attempt unauthorized batch writes.
      if (!isSynced || authLoading || !isManager) return;

      const levelsMap = new Map<string, InventoryLevel>();
      inventoryLevels.forEach(lvl => {
        const key = lvl.variantId ? `${lvl.productId}_${lvl.variantId}` : lvl.productId;
        levelsMap.set(key, lvl);
      });

      const batch = writeBatch(db);
      let writesCount = 0;

      // Only build missing levels if there are active products
      if (products.length > 0) {
        for (const prod of products) {
          const hasVariants = prod.variants && prod.variants.length > 0;

          if (hasVariants) {
            for (const variant of prod.variants!) {
              const key = `${prod.id}_${variant.id}`;
              if (!levelsMap.has(key)) {
                const onHand = variant.inventory ?? 0;
                const lvlId = `lvl_${prod.id}_${variant.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
                const newLvl: InventoryLevel = {
                  id: lvlId,
                  productId: prod.id,
                  variantId: variant.id,
                  quantityOnHand: onHand,
                  quantityReserved: 0,
                  quantityAvailable: onHand,
                  quantityIncoming: 0,
                  reorderPoint: 10,
                  reorderQuantity: 30,
                  lowStockThreshold: 5,
                  isTracked: true,
                  lastCountedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };

                const ref = doc(db, 'inventory_levels', lvlId);
                batch.set(ref, cleanUndefined(newLvl));
                writesCount++;
              }
            }
          } else {
            const key = prod.id;
            if (!levelsMap.has(key)) {
              const onHand = prod.inventory ?? (prod.inStock ? 50 : 0);
              const lvlId = `lvl_${prod.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
              const newLvl: InventoryLevel = {
                id: lvlId,
                productId: prod.id,
                quantityOnHand: onHand,
                quantityReserved: 0,
                quantityAvailable: onHand,
                quantityIncoming: 0,
                reorderPoint: 10,
                reorderQuantity: 50,
                lowStockThreshold: 5,
                isTracked: true,
                lastCountedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              const ref = doc(db, 'inventory_levels', lvlId);
              batch.set(ref, cleanUndefined(newLvl));
              writesCount++;
            }
          }
        }
      }

      // Automatically purge orphaned levels where the associated product no longer exists
      if (inventoryLevels.length > 0) {
        const productIds = new Set(products.map(p => p.id));
        for (const lvl of inventoryLevels) {
          if (!productIds.has(lvl.productId)) {
            const ref = doc(db, 'inventory_levels', lvl.id);
            batch.delete(ref);
            writesCount++;
          }
        }
      }

      if (writesCount > 0) {
        try {
          await batch.commit();
          console.log(`Successfully bootstrapped / cleaned up ${writesCount} inventory levels in Cloud Firestore.`);
        } catch (e) {
          console.warn("Bootstrapping/cleaning inventory deferred or operating locally:", e);
        }
      }
    };

    runBootstrap();
  }, [products, inventoryLevels, isSynced, isManager, authLoading]);

  // LEVEL OPERATIONS
  const addInventoryLevel = async (level: InventoryLevel) => {
    const path = `inventory_levels/${level.id}`;
    try {
      const cleanData = cleanUndefined(level);
      await setDoc(doc(db, 'inventory_levels', level.id), cleanData);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const updateInventoryLevel = async (id: string, updates: Partial<InventoryLevel>) => {
    const path = `inventory_levels/${id}`;
    try {
      const cleanData = cleanUndefined(updates);
      await updateDoc(doc(db, 'inventory_levels', id), cleanData);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const deleteInventoryLevel = async (id: string) => {
    const path = `inventory_levels/${id}`;
    try {
      await deleteDoc(doc(db, 'inventory_levels', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  // Adjust stock levels (received, sold, returned, adjusted, damaged, lost, reserved, unreserved)
  const bulkAdjustLevels = async (
    adjustments: { 
      id: string; 
      delta: number; 
      notes: string; 
      type: InventoryTransactionType; 
      refType: InventoryReferenceType; 
      refId?: string 
    }[]
  ) => {
    const batch = writeBatch(db);
    const dateStr = new Date().toISOString();

    for (const adj of adjustments) {
      const current = inventoryLevels.find(l => l.id === adj.id);
      if (!current) continue;

      const qtyBefore = current.quantityOnHand;
      let qtyChange = adj.delta;
      
      // Compute new values
      let newOnHand = current.quantityOnHand;
      let newReserved = current.quantityReserved;
      let newIncoming = current.quantityIncoming;

      switch (adj.type) {
        case 'reserved':
          newReserved = Math.max(0, current.quantityReserved + adj.delta);
          qtyChange = adj.delta; // change in RESERVED state
          break;
        case 'unreserved':
          newReserved = Math.max(0, current.quantityReserved - adj.delta);
          qtyChange = -adj.delta;
          break;
        case 'received':
          newOnHand = Math.max(0, current.quantityOnHand + adj.delta);
          newIncoming = Math.max(0, current.quantityIncoming - adj.delta);
          break;
        default:
          // physically changing hand levels (damaged, lost, adjusted, sold, returned, etc)
          newOnHand = Math.max(0, current.quantityOnHand + adj.delta);
          break;
      }

      const newAvailable = Math.max(0, newOnHand - newReserved);

      // Create update payload
      const syncUpdate: Partial<InventoryLevel> = {
        quantityOnHand: newOnHand,
        quantityReserved: newReserved,
        quantityAvailable: newAvailable,
        quantityIncoming: newIncoming,
        updatedAt: dateStr
      };

      const lvlRef = doc(db, 'inventory_levels', current.id);
      batch.update(lvlRef, cleanUndefined(syncUpdate));

      // Append Transaction
      const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const transactionRecord: InventoryTransaction = {
        id: txId,
        productId: current.productId,
        variantId: current.variantId,
        transactionType: adj.type,
        quantityChange: qtyChange,
        quantityBefore: qtyBefore,
        quantityAfter: newOnHand,
        referenceType: adj.refType,
        referenceId: adj.refId,
        notes: adj.notes,
        performedBy: 'System Admin',
        performedAt: dateStr
      };

      const txRef = doc(db, 'inventory_transactions', txId);
      batch.set(txRef, cleanUndefined(transactionRecord));

      // Also trigger updating the core catalogue product quantity for client visibility!
      const matchingProduct = products.find(p => p.id === current.productId);
      if (matchingProduct) {
        if (current.variantId && matchingProduct.variants) {
          const updatedVars = matchingProduct.variants.map(v => {
            if (v.id === current.variantId) {
              return { ...v, inventory: newOnHand };
            }
            return v;
          });
          const totalStock = updatedVars.reduce((sum, v) => sum + (v.inventory || 0), 0);
          
          const prodRef = doc(db, 'products', matchingProduct.id);
          batch.update(prodRef, {
            variants: updatedVars,
            inStock: totalStock > 0
          });
        } else {
          const prodRef = doc(db, 'products', matchingProduct.id);
          batch.update(prodRef, {
            inventory: newOnHand,
            inStock: newOnHand > 0
          });
        }
      }
    }

    try {
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'batch_adjust_levels');
    }
  };

  // Physical Stocktake Count corrections
  const performPhysicalCount = async (levelsToCount: { id: string; count: number; notes: string }[]) => {
    const batch = writeBatch(db);
    const dateStr = new Date().toISOString();
    const countDate = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    for (const take of levelsToCount) {
      const current = inventoryLevels.find(l => l.id === take.id);
      if (!current) continue;

      const qtyBefore = current.quantityOnHand;
      const countDiff = take.count - qtyBefore;
      
      const newOnHand = take.count;
      const newAvailable = Math.max(0, newOnHand - current.quantityReserved);

      const syncUpdate: Partial<InventoryLevel> = {
        quantityOnHand: newOnHand,
        quantityAvailable: newAvailable,
        lastCountedAt: countDate,
        updatedAt: dateStr
      };

      const lvlRef = doc(db, 'inventory_levels', current.id);
      batch.update(lvlRef, cleanUndefined(syncUpdate));

      // Append Transaction
      const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const transactionRecord: InventoryTransaction = {
        id: txId,
        productId: current.productId,
        variantId: current.variantId,
        transactionType: 'adjusted', // counted adjustment
        quantityChange: countDiff,
        quantityBefore: qtyBefore,
        quantityAfter: newOnHand,
        referenceType: 'inventory_count',
        notes: take.notes || 'Physical inventory take count correction.',
        performedBy: 'System Admin',
        performedAt: dateStr
      };

      const txRef = doc(db, 'inventory_transactions', txId);
      batch.set(txRef, cleanUndefined(transactionRecord));

      // Update product list too
      const matchingProduct = products.find(p => p.id === current.productId);
      if (matchingProduct) {
        if (current.variantId && matchingProduct.variants) {
          const updatedVars = matchingProduct.variants.map(v => {
            if (v.id === current.variantId) {
              return { ...v, inventory: newOnHand };
            }
            return v;
          });
          const totalStock = updatedVars.reduce((sum, v) => sum + (v.inventory || 0), 0);
          
          const prodRef = doc(db, 'products', matchingProduct.id);
          batch.update(prodRef, {
            variants: updatedVars,
            inStock: totalStock > 0
          });
        } else {
          const prodRef = doc(db, 'products', matchingProduct.id);
          batch.update(prodRef, {
            inventory: newOnHand,
            inStock: newOnHand > 0
          });
        }
      }
    }

    try {
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'batch_physical_count');
    }
  };

  // SUPPLIERS
  const addSupplier = async (supplier: Supplier) => {
    const path = `suppliers/${supplier.id}`;
    try {
      const cleanData = cleanUndefined(supplier);
      await setDoc(doc(db, 'suppliers', supplier.id), cleanData);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    const path = `suppliers/${id}`;
    try {
      const cleanData = cleanUndefined(updates);
      await updateDoc(doc(db, 'suppliers', id), cleanData);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const removeSupplier = async (id: string) => {
    const path = `suppliers/${id}`;
    try {
      await deleteDoc(doc(db, 'suppliers', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  // PURCHASE ORDERS
  const createPurchaseOrder = async (
    po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt' | 'updatedAt'>,
    items: Omit<PurchaseOrderItem, 'id' | 'poId' | 'createdAt'>[]
  ): Promise<string> => {
    const dateStr = new Date().toISOString();
    const poId = 'po_' + Date.now();
    
    // Generate sequential PO number
    const count = purchaseOrders.length + 1;
    const poNumber = `PO-${String(count).padStart(5, '0')}`;

    const newPO: PurchaseOrder = {
      ...po,
      id: poId,
      poNumber,
      createdAt: dateStr,
      updatedAt: dateStr
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'purchase_orders', poId), cleanUndefined(newPO));

    // Save PO Line Items & Update quantityIncoming inside inventory levels
    for (const item of items) {
      const itemId = 'poi_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const lineItem: PurchaseOrderItem = {
        ...item,
        id: itemId,
        poId,
        createdAt: dateStr
      };

      batch.set(doc(db, 'purchase_order_items', itemId), cleanUndefined(lineItem));

      // Find matching inventory level
      const matchingLvl = inventoryLevels.find(
        lvl => lvl.productId === item.productId && lvl.variantId === item.variantId
      );

      if (matchingLvl && po.status !== 'draft' && po.status !== 'cancelled') {
        // Increment quantityIncoming in inventory levels
        const currentIncoming = matchingLvl.quantityIncoming || 0;
        const newIncoming = currentIncoming + item.quantityOrdered;
        batch.update(doc(db, 'inventory_levels', matchingLvl.id), {
          quantityIncoming: newIncoming,
          updatedAt: dateStr
        });
      }
    }

    try {
      await batch.commit();
      return poId;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `create_po_${poId}`);
      return poId;
    }
  };

  const updatePurchaseOrder = async (id: string, updates: Partial<PurchaseOrder>) => {
    const path = `purchase_orders/${id}`;
    const dateStr = new Date().toISOString();

    const currentPO = purchaseOrders.find(po => po.id === id);
    if (!currentPO) return;

    try {
      const batch = writeBatch(db);
      
      // If PO is transitioning to 'cancelled' and it was previously 'sent' or 'confirmed'
      // we must subtract items count from quantityIncoming inside inventory levels!
      if (updates.status === 'cancelled' && (currentPO.status === 'sent' || currentPO.status === 'confirmed')) {
        const poLines = purchaseOrderItems.filter(poi => poi.poId === id);
        for (const line of poLines) {
          const lvl = inventoryLevels.find(l => l.productId === line.productId && l.variantId === line.variantId);
          if (lvl) {
            const nextIncoming = Math.max(0, (lvl.quantityIncoming || 0) - line.quantityOrdered);
            batch.update(doc(db, 'inventory_levels', lvl.id), {
              quantityIncoming: nextIncoming,
              updatedAt: dateStr
            });
          }
        }
      }

      // If PO is moving from 'draft' to 'sent' or 'confirmed', we must ADD items quantity to quantityIncoming
      if ((updates.status === 'sent' || updates.status === 'confirmed') && currentPO.status === 'draft') {
        const poLines = purchaseOrderItems.filter(poi => poi.poId === id);
        for (const line of poLines) {
          const lvl = inventoryLevels.find(l => l.productId === line.productId && l.variantId === line.variantId);
          if (lvl) {
            const nextIncoming = (lvl.quantityIncoming || 0) + line.quantityOrdered;
            batch.update(doc(db, 'inventory_levels', lvl.id), {
              quantityIncoming: nextIncoming,
              updatedAt: dateStr
            });
          }
        }
      }

      batch.update(doc(db, 'purchase_orders', id), cleanUndefined({ ...updates, updatedAt: dateStr }));
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  // Receive Purchase Order (either partially or fully)
  const receivePurchaseOrder = async (
    poId: string, 
    itemReceipts: { itemId: string; quantityReceived: number }[]
  ) => {
    const dateStr = new Date().toISOString();
    const batch = writeBatch(db);

    const currentPO = purchaseOrders.find(po => po.id === poId);
    if (!currentPO) return;

    let allFullyReceived = true;
    const poLines = purchaseOrderItems.filter(poi => poi.poId === poId);

    for (const line of poLines) {
      const receipt = itemReceipts.find(r => r.itemId === line.id);
      const newlyReceivedQty = receipt ? receipt.quantityReceived : 0;
      
      const totalReceivedSoFar = (line.quantityReceived || 0) + newlyReceivedQty;
      
      if (totalReceivedSoFar < line.quantityOrdered) {
        allFullyReceived = false;
      }

      // 1. Update line item quantityReceived structure
      batch.update(doc(db, 'purchase_order_items', line.id), {
        quantityReceived: totalReceivedSoFar
      });

      // 2. Perform inventory bulk transaction if newlyReceiveQty > 0
      if (newlyReceivedQty > 0) {
        const lvl = inventoryLevels.find(l => l.productId === line.productId && l.variantId === line.variantId);
        if (lvl) {
          const qtyBefore = lvl.quantityOnHand;
          const newOnHand = qtyBefore + newlyReceivedQty;
          
          // Decrement incoming queue
          const prevIncoming = lvl.quantityIncoming || 0;
          const newIncoming = Math.max(0, prevIncoming - newlyReceivedQty);
          const newAvailable = Math.max(0, newOnHand - lvl.quantityReserved);

          // Update lvl document
          batch.update(doc(db, 'inventory_levels', lvl.id), {
            quantityOnHand: newOnHand,
            quantityIncoming: newIncoming,
            quantityAvailable: newAvailable,
            updatedAt: dateStr
          });

          // Create transaction doc
          const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
          const transactionRecord: InventoryTransaction = {
            id: txId,
            productId: lvl.productId,
            variantId: lvl.variantId,
            transactionType: 'received',
            quantityChange: newlyReceivedQty,
            quantityBefore: qtyBefore,
            quantityAfter: newOnHand,
            referenceType: 'purchase_order',
            referenceId: currentPO.poNumber,
            notes: `Received stock from PO intake.`,
            performedBy: 'System Admin',
            performedAt: dateStr
          };
          batch.set(doc(db, 'inventory_transactions', txId), cleanUndefined(transactionRecord));

          // Sync core catalog values
          const matchingProduct = products.find(p => p.id === lvl.productId);
          if (matchingProduct) {
            if (lvl.variantId && matchingProduct.variants) {
              const updatedVars = matchingProduct.variants.map(v => {
                if (v.id === lvl.variantId) {
                  return { ...v, inventory: newOnHand };
                }
                return v;
              });
              const totalStock = updatedVars.reduce((sum, v) => sum + (v.inventory || 0), 0);
              
              batch.update(doc(db, 'products', matchingProduct.id), {
                variants: updatedVars,
                inStock: totalStock > 0
              });
            } else {
              batch.update(doc(db, 'products', matchingProduct.id), {
                inventory: newOnHand,
                inStock: newOnHand > 0
              });
            }
          }
        }
      }
    }

    // Determine finalized status
    const finalStatus = allFullyReceived ? 'received' : 'confirmed'; // partially received keeps confirmed state representing active intake

    batch.update(doc(db, 'purchase_orders', poId), {
      status: finalStatus,
      actualDeliveryDate: finalStatus === 'received' ? dateStr : undefined,
      updatedAt: dateStr
    });

    try {
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `receive_po_${poId}`);
    }
  };

  const cancelPurchaseOrder = async (poId: string) => {
    await updatePurchaseOrder(poId, { status: 'cancelled' });
  };

  return (
    <InventoryContext.Provider value={{
      inventoryLevels: effectiveInventoryLevels,
      transactions,
      suppliers,
      purchaseOrders,
      purchaseOrderItems,
      
      addInventoryLevel,
      updateInventoryLevel,
      deleteInventoryLevel,
      bulkAdjustLevels,
      performPhysicalCount,
      
      addSupplier,
      updateSupplier,
      removeSupplier,
      
      createPurchaseOrder,
      updatePurchaseOrder,
      receivePurchaseOrder,
      cancelPurchaseOrder,
      
      isSynced
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
