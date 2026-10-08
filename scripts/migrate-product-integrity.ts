import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Helper function to slugify names
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           
    .replace(/[^\w\-]+/g, '')       
    .replace(/\-\-+/g, '-');        
}

// Client-side rule evaluator copied for node execution
function matchProductToRules(product: any, ruleSet: any): boolean {
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
    return results.some((r: any) => r === true);
  } else {
    return results.every((r: any) => r === true);
  }
}

async function run() {
  console.log('🏁 Starting Samkhi Product Integrity & Healing Migration...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // 1. Load basic schemas
  console.log('⏳ Retrieving snapshots from Firestore...');
  const productsSnap = await getDocs(collection(db, 'products'));
  const collectionsSnap = await getDocs(collection(db, 'collections'));
  const linksSnap = await getDocs(collection(db, 'collection_products'));
  const levelsSnap = await getDocs(collection(db, 'inventory_levels'));

  const activeProducts: any[] = [];
  productsSnap.forEach(snap => {
    activeProducts.push({ id: snap.id, ...snap.data() });
  });

  const activeCollections: any[] = [];
  collectionsSnap.forEach(snap => {
    activeCollections.push({ id: snap.id, ...snap.data() });
  });

  const existingLinks: any[] = [];
  linksSnap.forEach(snap => {
    existingLinks.push({ id: snap.id, ...snap.data() });
  });

  const existingLevels: any[] = [];
  levelsSnap.forEach(snap => {
    existingLevels.push({ id: snap.id, ...snap.data() });
  });

  console.log(`📊 System status loaded:`);
  console.log(`   - Products: ${activeProducts.length}`);
  console.log(`   - Collections: ${activeCollections.length}`);
  console.log(`   - Manual collection links: ${existingLinks.length}`);
  console.log(`   - Existing inventory levels: ${existingLevels.length}`);

  const productIds = new Set(activeProducts.map(p => p.id));
  const batch = writeBatch(db);

  // 2. Remove orphan collection links (where product_id is not in productIds)
  console.log('🧹 Auditing collection_products for orphans...');
  let orphanLinksRemoved = 0;
  for (const link of existingLinks) {
    if (!link.product_id || !productIds.has(link.product_id)) {
      batch.delete(doc(db, 'collection_products', link.id));
      orphanLinksRemoved++;
    }
  }

  // 3. Auto-align and heal Inventory Levels for every Product
  console.log('🛡️ Auditing and Healing Inventory Levels indices...');
  let inventoryHealedCount = 0;
  let inventoryCreatedCount = 0;

  for (const prod of activeProducts) {
    let level = existingLevels.find(lvl => lvl.productId === prod.id || lvl.id === prod.id);
    
    if (!level) {
      // Create missing level
      const initialQty = prod.inventory ?? 0;
      const refId = prod.id;
      const newLevel = {
        id: refId,
        productId: prod.id,
        quantityOnHand: Math.max(0, initialQty),
        quantityReserved: 0,
        quantityAvailable: Math.max(0, initialQty),
        quantityIncoming: 0,
        reorderPoint: 10,
        reorderQuantity: 25,
        lowStockThreshold: 5,
        isTracked: true,
        sku: prod.sku || prod.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      batch.set(doc(db, 'inventory_levels', refId), newLevel);
      inventoryCreatedCount++;
    } else {
      // Audit existing level
      let needsUpdate = false;
      let onHand = level.quantityOnHand ?? 0;
      let reserved = level.quantityReserved ?? 0;

      // Rule: Negative stock healed to 0
      if (onHand < 0) {
        onHand = 0;
        needsUpdate = true;
      }
      if (reserved < 0) {
        reserved = 0;
        needsUpdate = true;
      }

      // Recompute available
      const computedAvailable = onHand - reserved;
      if (level.quantityAvailable !== computedAvailable || needsUpdate) {
        batch.update(doc(db, 'inventory_levels', level.id), {
          quantityOnHand: onHand,
          quantityReserved: reserved,
          quantityAvailable: computedAvailable,
          updatedAt: new Date().toISOString()
        });
        inventoryHealedCount++;
      }
    }
  }

  await batch.commit();

  // 4. Recompute collections product Counts
  console.log('🔄 Recomputing collection products_count and productCount aggregates...');
  const remainingLinksSnap = await getDocs(collection(db, 'collection_products'));
  const remainingLinks: any[] = [];
  remainingLinksSnap.forEach(snap => {
    remainingLinks.push(snap.data());
  });

  const recountBatch = writeBatch(db);
  for (const col of activeCollections) {
    let matchedCount = 0;
    if (col.collection_type === 'automated' || col.type === 'automated') {
      matchedCount = activeProducts.filter(p => matchProductToRules(p, col.rule_set || { conditions: col.conditions || [], match: col.conditionOperator || 'all' })).length;
    } else {
      matchedCount = remainingLinks.filter(link => link.collection_id === col.id).length;
    }

    recountBatch.update(doc(db, 'collections', col.id), {
      productCount: matchedCount,
      products_count: matchedCount
    });
  }
  await recountBatch.commit();

  console.log('\n======================================================');
  console.log('🎉 SAMKHI PRODUCT INTEGRITY MIGRATION COMPLETED');
  console.log('======================================================');
  console.log(`   ✅ Orphan links removed: ${orphanLinksRemoved}`);
  console.log(`   ✅ Missing inventory levels created: ${inventoryCreatedCount}`);
  console.log(`   ✅ Invalid stock variables healed: ${inventoryHealedCount}`);
  console.log(`   ✅ Recalculated counts of: ${activeCollections.length} collections`);
  console.log('======================================================\n');
}

run().catch(err => {
  console.error('❌ Migration failed with error:', err);
  process.exit(1);
});
