import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const PARISHES = [
  { name: 'Kingston', code: 'KGN', rate: 0, estimated_days: '1-2 business days', sort_order: 1 },
  { name: 'St. Andrew', code: 'AND', rate: 0, estimated_days: '1-2 business days', sort_order: 2 },
  { name: 'St. Thomas', code: 'THM', rate: 0, estimated_days: '2-3 business days', sort_order: 3 },
  { name: 'Portland', code: 'POR', rate: 0, estimated_days: '2-3 business days', sort_order: 4 },
  { name: 'St. Mary', code: 'MRY', rate: 0, estimated_days: '2-3 business days', sort_order: 5 },
  { name: 'St. Ann', code: 'ANN', rate: 0, estimated_days: '2-3 business days', sort_order: 6 },
  { name: 'Trelawny', code: 'TRE', rate: 0, estimated_days: '2-3 business days', sort_order: 7 },
  { name: 'St. James', code: 'JAM', rate: 0, estimated_days: '2-3 business days', sort_order: 8 },
  { name: 'Hanover', code: 'HAN', rate: 0, estimated_days: '2-3 business days', sort_order: 9 },
  { name: 'Westmoreland', code: 'WES', rate: 0, estimated_days: '2-3 business days', sort_order: 10 },
  { name: 'St. Elizabeth', code: 'ELI', rate: 0, estimated_days: '2-3 business days', sort_order: 11 },
  { name: 'Manchester', code: 'MAN', rate: 0, estimated_days: '2-3 business days', sort_order: 12 },
  { name: 'Clarendon', code: 'CLA', rate: 0, estimated_days: '2-3 business days', sort_order: 13 },
  { name: 'St. Catherine', code: 'CAT', rate: 0, estimated_days: '1-2 business days', sort_order: 14 }
];

async function run() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const isRollback = process.argv.includes('--rollback');

  if (isRollback) {
    console.log('🔄 Rolling back shipping rates and pickup locations migration...');
    // Delete shipping rates
    for (const p of PARISHES) {
      const id = `rate_${p.code.toLowerCase()}`;
      await deleteDoc(doc(db, 'shipping_rates', id));
      console.log(`Deleted rate: ${id}`);
    }

    // Delete pickup locations
    await deleteDoc(doc(db, 'pickup_locations', 'pickup_kgn_main'));
    console.log(`Deleted pickup location: pickup_kgn_main`);

    console.log('Rollback completed.');
  } else {
    console.log('🚀 Starting shipping rates database migration...');

    // 1. Create shipping_rates
    for (const p of PARISHES) {
      const id = `rate_${p.code.toLowerCase()}`;
      await setDoc(doc(db, 'shipping_rates', id), {
        id,
        name: p.name,
        parish_code: p.code,
        type: 'parish',
        rate: p.rate,
        estimated_days: p.estimated_days,
        is_active: true,
        sort_order: p.sort_order,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { merge: true });
    }
    console.log('✅ 14 Jamaican parishes initialized in shipping_rates collection.');

    // 2. Create default pickup_location
    await setDoc(doc(db, 'pickup_locations', 'pickup_kgn_main'), {
      id: 'pickup_kgn_main',
      name: 'Kingston Main Store',
      address: '123 Ocean Blvd, Kingston',
      parish: 'Kingston',
      phone: '876-555-0100',
      hours: 'Mon-Fri 9am-5pm',
      is_active: true,
      is_default: true
    }, { merge: true });
    console.log('✅ Default pickup location initialized.');

    // 3. Migrate existing orders
    const ordersSnap = await getDocs(collection(db, 'orders'));
    let count = 0;
    for (const orderDoc of ordersSnap.docs) {
      const orderData = orderDoc.data();
      const subtotal = orderData.subtotal !== undefined ? orderData.subtotal : (orderData.total || 0);
      const shipping_cost = orderData.shipping_cost !== undefined ? orderData.shipping_cost : 0;
      const shipping_total = orderData.shipping_total !== undefined ? orderData.shipping_total : shipping_cost;
      const grand_total = orderData.grand_total !== undefined ? orderData.grand_total : (orderData.total || 0);
      const fulfillment_type = orderData.fulfillment_type || (orderData.fulfillment_method === 'pickup' ? 'pickup' : 'shipping');
      const shipping_parish = orderData.shipping_parish || orderData.parish || '';

      await setDoc(doc(db, 'orders', orderDoc.id), {
        fulfillment_type,
        shipping_parish,
        shipping_cost,
        shipping_total,
        subtotal,
        grand_total,
        ...((fulfillment_type === 'shipping' && !orderData.shipping_address) ? {
          shipping_address: {
            line1: 'Migrated historical address',
            parish: shipping_parish || 'Kingston',
            phone: orderData.customerPhone || '876-000-0000'
          }
        } : {})
      }, { merge: true });
      count++;
    }
    console.log(`✅ Successfully migrated ${count} existing orders.`);
    console.log('🎉 Migration completed successfully!');
  }
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
