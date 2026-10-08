import { db } from '../../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  writeBatch, 
  deleteDoc, 
  updateDoc, 
  getDoc 
} from 'firebase/firestore';
import { Product, Order, Collection, Customer, InventoryLevel } from '../../types';
import { logActivity } from '../audit';
import { cleanUndefined } from '../../firebase';
import { matchProductToRules } from '../../pages/admin/Collections';

export interface CascadeReport {
  success: boolean;
  blocked: boolean;
  message: string;
  activeOrders?: string[];
  inventoryDeleted?: number;
  collectionsRemoved?: number;
}

export class ProductService {
  /**
   * Universal product creation - creates the product and initializes inventory level(s) synchronously.
   */
  static async createProduct(product: Product, userEmail: string = 'system@samkhi.com'): Promise<void> {
    try {
      const cleanProd = cleanUndefined(product);
      cleanProd.updatedAt = new Date().toISOString();
      const batch = writeBatch(db);

      const prodRef = doc(db, 'products', product.id);
      batch.set(prodRef, cleanProd);

      // Initialize inventory levels instantly
      const hasVariants = product.variants && product.variants.length > 0;
      if (hasVariants) {
        for (const variant of product.variants!) {
          const lvlId = `lvl_${product.id}_${variant.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
          const onHand = variant.inventory ?? 0;
          const newLvl: InventoryLevel = {
            id: lvlId,
            productId: product.id,
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
          batch.set(doc(db, 'inventory_levels', lvlId), cleanUndefined(newLvl));
        }
      } else {
        const lvlId = `lvl_${product.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
        const onHand = product.inventory ?? (product.inStock ? 50 : 0);
        const newLvl: InventoryLevel = {
          id: lvlId,
          productId: product.id,
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
        batch.set(doc(db, 'inventory_levels', lvlId), cleanUndefined(newLvl));
      }

      await batch.commit();

      // Write activity audit log
      await logActivity(`Product "${product.name}" created by ${userEmail}. Registered default inventory levels layout.`);
    } catch (error) {
      console.error("Failed to create product and inventory config:", error);
      throw error;
    }
  }

  /**
   * Safe-deletes a product by cascading related references and checking active orders.
   */
  static async deleteProduct(productId: string, userEmail: string = 'system@samkhi.com'): Promise<CascadeReport> {
    try {
      // 1. Check if the product is in any active order (status is not completed and not cancelled)
      const activeStatuses = ['pending', 'payment_confirmed', 'picked', 'packed', 'ready_for_pickup', 'ready_for_delivery'];
      const ordersColl = collection(db, 'orders');
      const activeOrdersQuery = query(ordersColl, where('status', 'in', activeStatuses));
      const ordersSnap = await getDocs(activeOrdersQuery);
      
      const activeOrdersContainingProduct: string[] = [];
      ordersSnap.forEach(docSnap => {
        const orderData = docSnap.data() as Order;
        const hasProduct = orderData.lineItems?.some(item => item.productId === productId);
        if (hasProduct) {
          activeOrdersContainingProduct.push(orderData.id);
        }
      });

      if (activeOrdersContainingProduct.length > 0) {
        return {
          success: false,
          blocked: true,
          message: `Cannot delete - Product is in ${activeOrdersContainingProduct.length} active orders: ${activeOrdersContainingProduct.map(id => '#' + id).join(', ')}`,
          activeOrders: activeOrdersContainingProduct
        };
      }

      // 2. Cascade delete elements
      const batch = writeBatch(db);

      // delete /products/{productId}
      const productRef = doc(db, 'products', productId);
      batch.delete(productRef);

      // delete /inventory_levels where productId = productId
      let inventoryDeletedCount = 0;
      const levelsQuery = query(collection(db, 'inventory_levels'), where('productId', '==', productId));
      const levelsSnap = await getDocs(levelsQuery);
      levelsSnap.forEach(docSnap => {
        batch.delete(doc(db, 'inventory_levels', docSnap.id));
        inventoryDeletedCount++;
      });

      // delete /collection_products where product_id = productId
      let collectionsRemovedCount = 0;
      const linksQuery = query(collection(db, 'collection_products'), where('product_id', '==', productId));
      const linksSnap = await getDocs(linksQuery);
      linksSnap.forEach(docSnap => {
        batch.delete(doc(db, 'collection_products', docSnap.id));
        collectionsRemovedCount++;
      });

      // 3. Remove product from any customer's wishlist
      const customersSnap = await getDocs(collection(db, 'customers'));
      customersSnap.forEach(docSnap => {
        const customer = docSnap.data() as Customer;
        if (customer.wishlist && customer.wishlist.includes(productId)) {
          const updatedWishlist = customer.wishlist.filter(id => id !== productId);
          batch.update(doc(db, 'customers', docSnap.id), { wishlist: updatedWishlist });
        }
      });

      // Commit early cascade changes
      await batch.commit();

      // 4. Re-calculate collection counts
      // Let's pull all products & collections and refresh counts
      const productsSnap = await getDocs(collection(db, 'products'));
      const activeProducts: Product[] = [];
      productsSnap.forEach(d => {
        activeProducts.push({ id: d.id, ...d.data() } as Product);
      });

      const collectionsSnap = await getDocs(collection(db, 'collections'));
      const linksAfterSnap = await getDocs(collection(db, 'collection_products'));
      const remainingLinks: any[] = [];
      linksAfterSnap.forEach(d => {
        remainingLinks.push(d.data());
      });

      const refreshBatch = writeBatch(db);
      collectionsSnap.forEach(docSnap => {
        const col = docSnap.data() as Collection;
        let matchedCount = 0;
        if (col.type === 'automated') {
          matchedCount = activeProducts.filter(p => matchProductToRules(p, col.conditions ? { conditions: col.conditions, match: col.conditionOperator || 'all' } : null)).length;
        } else {
          matchedCount = remainingLinks.filter(link => link.collection_id === docSnap.id).length;
        }
        refreshBatch.update(doc(db, 'collections', docSnap.id), { productCount: matchedCount });
      });
      await refreshBatch.commit();

      // Write activity audit log
      await logActivity(`Product with ID ${productId} deleted by ${userEmail} - cascaded ${inventoryDeletedCount} inventory records, ${collectionsRemovedCount} collection links.`);

      return {
        success: true,
        blocked: false,
        message: `Product successfully deleted. Cascaded ${inventoryDeletedCount} inventory records and ${collectionsRemovedCount} collection linkages.`,
        inventoryDeleted: inventoryDeletedCount,
        collectionsRemoved: collectionsRemovedCount
      };
    } catch (error) {
      console.error("Failed to safely delete product cascade:", error);
      throw error;
    }
  }

  /**
   * Updates a product and universally propagates fields to inventory indices, collections links and recounts.
   */
  static async updateProduct(productId: string, patches: Partial<Product>, userEmail: string = 'system@samkhi.com'): Promise<void> {
    try {
      const cleanPatches = cleanUndefined(patches);
      cleanPatches.updatedAt = new Date().toISOString();

      // 1. Check existing product
      const productDocRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productDocRef);
      if (!productSnap.exists()) {
        throw new Error("Product not found in system.");
      }
      const existingProduct = productSnap.data() as Product;

      // 2. Update core product
      await updateDoc(productDocRef, cleanPatches);

      const batch = writeBatch(db);

      // 3. Fetch current inventory levels for this product to synchronize variants & simple setups
      const levelsQuery = query(collection(db, 'inventory_levels'), where('productId', '==', productId));
      const levelsSnap = await getDocs(levelsQuery);
      
      const currentLevels = new Map<string, { id: string; data: InventoryLevel }>();
      levelsSnap.forEach(d => {
        const lvl = d.data() as InventoryLevel;
        currentLevels.set(lvl.variantId || 'simple', { id: d.id, data: lvl });
      });

      const updatedHasVariants = patches.variants !== undefined
        ? (patches.variants && patches.variants.length > 0)
        : (existingProduct.variants && existingProduct.variants.length > 0);

      const finalVariants = patches.variants !== undefined
        ? (patches.variants || [])
        : (existingProduct.variants || []);

      if (updatedHasVariants) {
        // If there is a "simple" level remaining, delete it
        if (currentLevels.has('simple')) {
          batch.delete(doc(db, 'inventory_levels', currentLevels.get('simple')!.id));
        }

        const activeVariantIds = new Set(finalVariants.map(v => v.id));

        // Delete levels for variants that were removed
        currentLevels.forEach((lvlObj, variantId) => {
          if (variantId !== 'simple' && !activeVariantIds.has(variantId)) {
            batch.delete(doc(db, 'inventory_levels', lvlObj.id));
          }
        });

        // Add levels for new variants, or update existing matching ones
        finalVariants.forEach(variant => {
          const key = variant.id;
          if (!currentLevels.has(key)) {
            const lvlId = `lvl_${productId}_${variant.id}`;
            const onHand = variant.inventory ?? 0;
            const newLvl: InventoryLevel = {
              id: lvlId,
              productId: productId,
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
            batch.set(doc(db, 'inventory_levels', lvlId), cleanUndefined(newLvl));
          } else {
            const lvlObj = currentLevels.get(key)!;
            const lvlData = lvlObj.data;
            const updates: Partial<InventoryLevel> = {};
            
            if (variant.sku && variant.sku !== lvlData.sku) {
              updates.sku = variant.sku;
            }
            if (variant.inventory !== undefined && variant.inventory !== lvlData.quantityOnHand) {
              updates.quantityOnHand = variant.inventory;
              updates.quantityAvailable = Math.max(0, variant.inventory - (lvlData.quantityReserved || 0));
            }
            if (Object.keys(updates).length > 0) {
              updates.updatedAt = new Date().toISOString();
              batch.update(doc(db, 'inventory_levels', lvlObj.id), cleanUndefined(updates));
            }
          }
        });
      } else {
        // Simple product
        // Delete any variant levels
        currentLevels.forEach((lvlObj, variantId) => {
          if (variantId !== 'simple') {
            batch.delete(doc(db, 'inventory_levels', lvlObj.id));
          }
        });

        // Ensure "simple" level exists
        if (!currentLevels.has('simple')) {
          const lvlId = `lvl_${productId}`;
          const onHand = patches.inventory !== undefined ? patches.inventory : (existingProduct.inventory ?? 50);
          const newLvl: InventoryLevel = {
            id: lvlId,
            productId: productId,
            quantityOnHand: onHand,
            quantityReserved: 0,
            quantityAvailable: onHand,
            quantityIncoming: 0,
            reorderPoint: 10,
            reorderQuantity: 55,
            lowStockThreshold: 5,
            isTracked: true,
            lastCountedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          batch.set(doc(db, 'inventory_levels', lvlId), cleanUndefined(newLvl));
        } else {
          const lvlObj = currentLevels.get('simple')!;
          const lvlData = lvlObj.data;
          const updates: Partial<InventoryLevel> = {};
          
          if (patches.sku && patches.sku !== existingProduct.sku) {
            updates.sku = patches.sku;
          }
          if (patches.inventory !== undefined && patches.inventory !== lvlData.quantityOnHand) {
            updates.quantityOnHand = patches.inventory;
            updates.quantityAvailable = Math.max(0, patches.inventory - (lvlData.quantityReserved || 0));
          }
          if (Object.keys(updates).length > 0) {
            updates.updatedAt = new Date().toISOString();
            batch.update(doc(db, 'inventory_levels', lvlObj.id), cleanUndefined(updates));
          }
        }
      }

      // 4. Update manual collections products links if collections list is specified in patches
      if (patches.collections !== undefined) {
        // Delete all old links
        const oldLinksQuery = query(collection(db, 'collection_products'), where('product_id', '==', productId));
        const linksSnap = await getDocs(oldLinksQuery);
        linksSnap.forEach(docSnap => {
          batch.delete(doc(db, 'collection_products', docSnap.id));
        });

        // Write new ones
        const selectedCollections = patches.collections || [];
        selectedCollections.forEach((collId, idx) => {
          const linkId = `${collId}_${productId}`;
          batch.set(doc(db, 'collection_products', linkId), {
            id: linkId,
            collection_id: collId,
            product_id: productId,
            position: idx
          });
        });
      }

      await batch.commit();

      // 5. Instantly trigger a refresh recount for all manual/automated collections to guarantee actual count values match database state
      const productsSnap = await getDocs(collection(db, 'products'));
      const activeProducts: Product[] = [];
      productsSnap.forEach(d => {
        activeProducts.push({ id: d.id, ...d.data() } as Product);
      });

      const collectionsSnap = await getDocs(collection(db, 'collections'));
      const linksAfterSnap = await getDocs(collection(db, 'collection_products'));
      const remainingLinks: any[] = [];
      linksAfterSnap.forEach(d => {
        remainingLinks.push(d.data());
      });

      const recountBatch = writeBatch(db);
      collectionsSnap.forEach(docSnap => {
        const col = docSnap.data() as Collection;
        let matchedCount = 0;
        if (col.type === 'automated') {
          matchedCount = activeProducts.filter(p => matchProductToRules(p, col.conditions ? { conditions: col.conditions, match: col.conditionOperator || 'all' } : null)).length;
        } else {
          matchedCount = remainingLinks.filter(link => link.collection_id === docSnap.id).length;
        }
        recountBatch.update(doc(db, 'collections', docSnap.id), { productCount: matchedCount });
      });
      await recountBatch.commit();

      // 6. Write custom audit message
      await logActivity(`Product details for "${patches.name || existingProduct.name}" updated by ${userEmail}. Universal propagation complete.`);
    } catch (error) {
      console.error("Failed to propagate universal update:", error);
      throw error;
    }
  }
}
