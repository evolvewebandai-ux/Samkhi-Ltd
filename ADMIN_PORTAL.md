# 📘 Samkhi Limited Admin Portal: Comprehensive System & Data Flow Manual

This documentation explains how products, stock, checkout sessions, fulfillment options, and reports are tracked and interfaced within the Samkhi Limited Admin Portal.

---

## 🗺️ 1. Architecture Overview & Core Modules Interface

The portal utilizes a robust full-stack design built on **React 18+ with TypeScript (Vite)** on the frontend and an **Express (Node.js)** API gateway on the backend, persisting state dynamically to **Firebase Realtime Firestore Database**.

```
                           +------------------------------+
                           |     React SPA Client UI     |
                           +--------------+---------------+
                                          |
                +-------------------------+-------------------------+
                |                         |                         |
                v                         v                         v
       [Context Engines]          [REST API Endpoints]      [SendGrid Email Engine]
    - Product / Collection Context  - /api/checkout/create-  - order_placed
    - Inventory Context               order                  - shipment_dispatched
    - Customer Context              - /api/payments/fygaro/  - pickup_ready
    - Order & Discount Context        checkout
                |                         |                         |
                +-------------------------+-------------------------+
                                          |
                                          v
                           +--------------+---------------+
                           |      Cloud Firestore DB      |
                           +------------------------------+
```

Each modular subsystem connects through standard interface references, ensuring high structural integrity and real-time synchronization.

---

## 📦 2. How Products are Tracked through Core Modules

The administrative model tracks the lifecycle of items using structural relationships spanning **Products**, **Inventory LEVELS**, **Collections**, **Customers**, and **Orders**.

### A. Products Collection (`products`)
Stores the master product catalog. Each document contains essential descriptors:
*   **Unique SKU & Brand**: Human-readable descriptors for tracking and logistics.
*   **Variants System**: Supports multi-option variant groups (e.g., Solar Mounting Clamps with size or material options), mapping directly to their own individual SKU, price, and dedicated stock quantities.
*   **Pricing Mechanics**: Tracks base price, comparative market price (`compareAtPrice`), and COGS (`costPrice`) to isolate profit margin calculations.

### B. Inventory Management Engine (`inventory_levels` & `inventory_transactions`)
Stock level stability is maintained through physical separation of raw stock:
*   **Quantity Handled (OnHand)**: Physical items counted in warehouses.
*   **Quantity Committed (Reserved)**: Items allocated to completed but unfulfilled checkouts (prevents double selling).
*   **Quantity Available**: `OnHand - Reserved` — The actual quantities exposed to checking-out customers.
*   **Low Stock Alerts**: Configurable thresholds (`lowStockThreshold` / `reorderPoint`) that flag items as "Critical Stock" in the dashboard.
*   **Audit Trail**: Every inventory edit or customer purchase creates a signed transaction document (`inventory_transactions`) recording delta change, operator credentials, and references to order IDs.

### C. Collections Manager (`collections`)
Collections bundle products together using two distinct paradigms:
1.  **Manual**: Fixed arrays of explicit product references manually attached by managers.
2.  **Automated**: Dynamic collections powered by conditional rule blocks (`CollectionCondition[]`). When a product draft changes or gets saved, the system evaluates matches against field filters (e.g., `brand equals 'EcoLite'`, `price > 5000`, or `tags contains 'Solar Panel'`) to auto-assign categorizations without code intervention.

### D. Customer Profiles (`customers`)
High-fidelity statistics aggregated over transaction cycles:
*   **Total Spent**: Cumulative total value of processed invoices.
*   **Lifespan Frequency**: Number of distinct completed orders.
*   **Retention Logistics**: Saved shipping locations, last active orders, and calculated loyalty values (adds reward points per dollar spent).

### E. Fulfillment Orders (`orders`)
The transactional bridge recording the state of the product from cart to customer hands. Contains item quantities, total subtotal, taxes (15% GCT in Jamaica), fulfillment selection, and detailed action timelines.

---

## 🔀 3. The Seamless Interface Flows

Below is the breakdown of how the different modules interface in practical scenarios:

```
                  +-----------------------------------+
                  |   Customer Checks Out (Fygaro)    |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |  Orders Module Draft Generated    |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |  Inventory Level (Reserved +Qty)  |
                  +-----------------+-----------------+
                                    |
                                    v
     +------------------------------+------------------------------+
     | (Fulfillment Standard)                                      | (Cancellation / Recall)
     v                                                             v
+----+------------------------------+          +-------------------+--------------------+
| Order Completed                    |          | Order Cancelled                       |
+----+------------------------------+          +-------------------+--------------------+
     |                                                             |
     v                                                             v
+----+------------------------------+          +-------------------+--------------------+
| Inventory Handled (OnHand -Qty)   |          | Inventory Level (Unreserved -Qty)      |
| Inventory Reserved (Reserved -Qty)|          | Stock returned to Available pool       |
| Customer Spent (Spent +Total)     |          +----------------------------------------+
| Customer orders (Orders +1)       |
+-----------------------------------+
```

### Flow 1: Order Checkout & Commitment (Cart -> Draft)
1.  Customer adds a product with matching variants to checkout.
2.  Payment session is authenticated on the backup gateway.
3.  The **Orders** module logs a `pending` draft status.
4.  The system calls the **Inventory** engine to lock items, moving the quantity from `Available` to `Reserved`. This guarantees the inventory is not oversold while payment clears.

### Flow 2: Payment Approval & Fulfillment Verification (Active Processing)
1.  Payment registers successfully. Order status shifts to `payment_confirmed` or `paid`.
2.  The product continues to live under `Reserved`.
3.  Staff processes fulfillment. Once the item is marked `completed` / `fulfilled`:
    *   `Reserved` drops back by the shipped quantity.
    *   `OnHand` is officially decremented in the warehouse.
    *   An **Inventory Audit Transaction** is parsed with type `'sold'`, reference ID `'order_#'`, and logs the physical movement.

### Flow 3: Post-Transaction Loyalty & Retention (Customer Value Updates)
1.  The Order Context runs transactions querying `/customers/{customer_email_id}`.
2.  If the customer document does not exist, a new profile is spawned.
3.  The billing engine updates `spent` stats, bumps `orders` counts, parses the latest fulfillment address as their primary shipping target, and credits applicable loyalty points.

---

## 🚚 4. Shipping & Rates Allocation

Logistics operations are completely configurable under the **Shipping Rates Manager** module:

*   **Parish Zoning (Jamaica)**: Multi-parish shipping rates (Kingston & St. Andrew, St. Catherine, St. James, etc.) map distinct costs based on regional distances from the central hub.
*   **Threshold-Based Free Shipping**: Each zone supports an optional minimum cart value threshold (`free_shipping_threshold`). Crucial for large equipment (e.g., complete solar kits over $500,000 JMD), where shipping costs are waived automatically dynamically in checkout.
*   **Pickup Mechanics**: When customers select Store Pickup, shipping is instantly formatted to $0, activating the branch allocation logic to prepare pickup queues at the selected warehouse location (`pickup_locations`).

---

## 🧾 5. Invoices & Secure Audited Receipts

Transactions require robust financial safeguards:
1.  **Secure FYGARO API Handshakes**: Payment configurations, hashes, and invoice details are executed solely on the backend (`/api/payments/fygaro/*`) utilizing a hidden server-side key. Clear signatures protect against browser-level tampering.
2.  **Audit Logs (Timeline)**: Orders maintain a structured, immutable chronologically sorted activity timeline. Status alterations (e.g. from `picked` to `packed`), SendGrid email delivery reports, and manual reconciliations are permanently printed with staff names and timestamps to prevent internal loss.
3.  **PDF Receipts**: Fully formatted, print-friendly receipts are rendered with customized item breakdowns, tax rates (15% GCT), and delivery fees, serving as physical invoices during parcel delivery.

---

## 📊 6. Reports & Intelligent Performance Dashboards

The portal features an integrated business intelligence screen parsing real-time analytics to visualize shop performance:

*   **Key Sales Performance (KPIs)**: Calculates gross sales revenue, conversion rates, order counts, and Average Order Value (AOV) across user-chosen timeframes (7 days, 30 days, or custom spans).
*   **COGS & Profit Margins**: Resolves product cost metrics (`costPrice`) against sales records to map real profit margins rather than simple turnover volumes.
*   **Low Stock & Out-of-Stock Risk Graphs**: Isolates items where available quantities are at or below reorder minimums, offering automated suggestions for issuing standard purchase orders.
*   **Historical Trends (Recharts Charts)**: Interactive line charts tracking gross revenues, bar graphs mapping popular parishes for logistics optimization, and demographic lists sorting top-spending buyers.
