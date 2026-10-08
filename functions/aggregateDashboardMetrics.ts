import { 
  getFirestore, 
  Timestamp 
} from 'firebase-admin/firestore';

/**
 * Cloud Function scheduler designed to pre-aggregate and cache
 * metrics daily under /dashboard_metrics/{day} to prevent expensive reads.
 * Configured as a Pub/Sub trigger running every 5 minutes.
 */
export async function aggregateDashboardMetrics(event: any) {
  const db = getFirestore();
  const today = new Date().toISOString().split('T')[0]; // e.g. "2026-06-15"

  try {
    console.log(`Starting scheduled metrics pre-aggregation for day: ${today}`);

    // 1. Calculate Revenue Sums
    const ordersSnap = await db.collection('orders')
      .where('status', '==', 'completed')
      .get();
    
    let totalRevenueToday = 0;
    let totalRevenueMonth = 0;
    let totalOrdersMonthCount = 0;
    
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    ordersSnap.forEach(doc => {
      const data = doc.data();
      const orderDate = data.date ? new Date(data.date) : null;
      const total = Number(data.total) || 0;

      if (orderDate && orderDate >= startOfToday) {
        totalRevenueToday += total;
      }
      if (orderDate && orderDate >= startOfMonth) {
        totalRevenueMonth += total;
        totalOrdersMonthCount++;
      }
    });

    const averageOrderValueMonth = totalOrdersMonthCount > 0 
      ? Math.round(totalRevenueMonth / totalOrdersMonthCount) 
      : 0;

    // 2. Fetch Stock Counts
    const levelsSnap = await db.collection('inventoryLevels').get();
    let lowStockCount = 0;
    let outOfStockCount = 0;

    levelsSnap.forEach(doc => {
      const data = doc.data();
      const qtyAvailable = Number(data.quantityAvailable) || 0;
      const threshold = Number(data.lowStockThreshold) || 5;

      if (qtyAvailable <= 0) {
        outOfStockCount++;
      } else if (qtyAvailable <= threshold) {
        lowStockCount++;
      }
    });

    // 3. System Deliverability Logs Check
    const yesterdayTimestamp = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const logsSnap = await db.collection('notification_logs')
      .where('sent_at', '>=', yesterdayTimestamp)
      .get();

    let totalNotifications = 0;
    let failedNotifications = 0;

    logsSnap.forEach(doc => {
      totalNotifications++;
      if (doc.data().status === 'failed') {
        failedNotifications++;
      }
    });

    const deliverabilityRate = totalNotifications > 0
      ? Number(((totalNotifications - failedNotifications) / totalNotifications * 100).toFixed(2))
      : 100;

    // 4. Update the metrics cache document
    await db.collection('dashboard_metrics').doc(today).set({
      day: today,
      revenueToday: totalRevenueToday,
      revenueMTD: totalRevenueMonth,
      averageOrderValue: averageOrderValueMonth,
      lowStockCount,
      outOfStockCount,
      emailDeliverability: deliverabilityRate,
      notificationLogsFailed: failedNotifications,
      lastUpdatedAt: new Date().toISOString(),
      status: "operational"
    }, { merge: true });

    console.log(`Successfully compiled pre-aggregates for: ${today}`);
  } catch (error) {
    console.error("Critical error during scheduled pre-aggregation routine:", error);
    throw error;
  }
}
