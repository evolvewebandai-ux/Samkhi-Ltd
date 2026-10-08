# Samkhi Limited — Admin Command Center Redesign Report
**Role**: Senior Product Designer + Full-Stack Engineer  
**Status**: APPROVED & PROVISIONED  
**Date**: June 15, 2026  

---

## 🏛️ 1. ARCHITECTURAL & STRATEGIC RATIONALE

The previous Admin Dashboard at `/admin` relied entirely on mocked data, isolated charts, and had no interactive bridges to administrative routines. It was a static display rather than an operational cockpit. 

The redesigned **Admin Command Center** operates as a high-fidelity fully-functional dashboard. Designed around the specific logistics of **Jamaica's solar energy market** (highly dependent on Parish-level courier shipping, batch inventory reorders, and 15% GCT VAT audits), it operates on a structured **3-Tier Information Hierarchy** that maximizes decision-making speed.

---

## 🎨 2. THE DESIGN SYSTEM: SWISS-MODERNISM
Every component has been custom styled to align with the **Swiss-Modern** design philosophy:

*   **Color Palette**: Hard-contrast deep charcoals (`text-slate-900`), technical border boundaries (`border-slate-200`), sleek white cards, and high-visibility status cues (emerald, amber, and rose accents).
*   **Typography**: Clean sans-serif headings (**Inter**) paired with high-density technical monospaced statistics (**JetBrains Mono**) to display numbers with high tabular legibility and precise character alignment.
*   **Grid Hierarchy**: Clean negative space, dense but breathable bento-box panels, and elegant micro-interactions (staggered hover offsets and pulsing live-feed indicators).

---

## 📊 3. THE 3-TIER OPERATIONAL SYSTEM

### Tier 1: Actionable Command Grid (Top)
Consolidates **9 unified tool modules** matching Samkhi's app feature map. Individual tiles show live counts linked to real Firestore streams, plus instant creators for products, collections, and sample alerts:
1.  **Orders Hub**: Active pending indicators.
2.  **Products Catalog**: Live listings size.
3.  **Collections**: Aggregated public custom groups.
4.  **Warehouse Stock**: Connected low-stock and supplier counts.
5.  **Customers**: B2B customer leads.
6.  **Shipping Rates**: Dynamic active parishes.
7.  **System Notifications**: Sent/failed SendGrid mailer logs.
8.  **Invoices**: Automated 15% GCT VAT receipting ledger.
9.  **Reporting Engines**: Metric sales analytics.

### Tier 2: Real-time Live KPI Monitors (Middle)
Eight responsive cards showing vital business details with integrated sparklines and target progress bars:
1.  **Revenue Today**: Computed dynamically from completed orders on June 15, 2026.
2.  **Revenue MTD**: Tracks progress against the $15M JMD Monthly Sales target.
3.  **Orders Pipeline**: Active transactions divided by stages.
4.  **AOV (Average Order Value)**: Real-time sum over completed orders.
5.  **Low Stock Alerts**: Displays combined critical out-of-stock and low-stock SKUs.
6.  **Fulfillment Queue**: Segmented into Courier Deliveries vs Store Pickups.
7.  **Total Customers**: Active B2B enterprise leads.
8.  **Email Deliverability**: SendGrid webhook statistics.

### Tier 3: Operational Tables & Deep Tools (Bottom)
Split into 2 flexible layout grids:
*   **Interactive Logistics pipeline**: Users click stage widgets to drill down into order entries. It highlights "stuck" orders (pending/paid >24h) with red warnings.
*   **Physical Inventory Check-in**: Restock alerts with dynamic inline forms. Users adjust stock quantities and update Firestore databases with one click.
*   **Parish Logistics distribution**: Visualizes distributions across Jamaica's 14 parishes to coordinate delivery routes.
*   **System Integrations Health**: Displays status indicators for SendGrid, Fygaro Webhooks, and active administrator socket listeners.

---

## 📈 4. COMPARISON MATRIX: DESTRUCTIVE RECONSTRUCTION

| Aspect | Old Dashboard (Replaced) | New Command Center (Active) | Status |
| :--- | :--- | :--- | :--- |
| **Data Authenticity** | 100% Mocked. Hardcoded metrics. | 100% Dynamic Firestore collection mapping. | **PASS** |
| **Fulfillment Visibility**| No pipeline representation. | Grouped 8-stage interactive funnel. | **PASS** |
| **Logistics Optimizations**| Generic global delivery view. | Jamaican Parish distributions widget. | **PASS** |
| **Stock Management** | Standard static percentage text. | Inline, transactionalrestock override controls. | **PASS** |
| **Integration Audits** | No indicator of mailers/webhooks. | Live SendGrid & Fygaro status boards. | **PASS** |
| **User Experience (UX)** | Crowded, static and non-interactive.| Highly actionable, Swiss-Modern layout. | **PASS** |

---

## 🗄️ 5. PERFORMANCE BACKEND SPECS (SCALABILITY DESIGN)
To support scale without high reads cost:
1.  **`firestore.indexes.json`**: Configures multi-field composite indexes for fast execution.
2.  **`/src/lib/dashboard/queries.ts`**: Implements query utilities with built-in fallback modes.
3.  **`/functions/aggregateDashboardMetrics.ts`**: Pre-aggregates daily metrics into cached documents under `/dashboard_metrics/{day}` using a secure timer.
