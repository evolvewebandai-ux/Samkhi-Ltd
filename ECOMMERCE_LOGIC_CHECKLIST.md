# Ecommerce Resilient Business Logic Checklist
**Samkhi Limited — Admin Operations System**

The following checklist reviews the core operational business rules hardened for the Samkhi Limited Admin Operations:

## 1. Inventory & Overselling Protections
- [x] **Strict Non-Negative On-hand Qty:** Physical counts on-hand can never drop below 0. 
- [x] **Calculated Quantity Available:** Enforces `quantityAvailable = quantityOnHand - quantityReserved`. Available quantity is recalculated on order entry, reservations, or inventory counts.
- [x] **No Core Overselling:** Inventory checks are handled atomically on the server side prior to order placement, ensuring reservations correspond to actual physical on-hand stocks.
- [x] **Reservation Release:** When orders change status to `cancelled`, reserved quantities are atomically returned to available status, updating logs.

## 2. Jamaican GCT Tax Alignment
- [x] **Tax Rate Enforced:** General Consumption Tax (GCT) of **15%** is calculated correctly for taxable items.
- [x] **Granular Taxability Property:** Added `taxable` or `gctTaxable` property flag at the individual catalog level to allow tax-exempt parameters for special agricultural or educational products.
- [x] **Accurate Calculations:** Formulas are calculated on the server side:
  - `tax_amount = round(taxable_subtotal * 0.15, 2)`
  - `grand_total = subtotal + tax_amount + shipping_fees - discount`

## 3. Order & Shipping Validations
- [x] **No Orphaned Transactions:** Transactions have a direct `productId` relation mapping.
- [x] **Shipping Fees Rule:** Server-side checks validate parish codes against actual shipping cost profiles.
- [x] **Pickup Shipping Fee Enforced:** Pickup orders explicitly set and enforce shipping fee to exactly `$0` JMD.
- [x] **Status Integrity Audits:** Order transitions automatically output an audit log in `/activityLogs` with full details of the actor, order, and old/new statuses.

## 4. Secure Payment Logic (Fygaro Integrations)
- [x] **Server-side Signature Verifications:** Fygaro payment gateway webhooks verify SHA256 digital payload signatures before updating payment statuses.
- [x] **Idempotency Safeguard:** Webhooks verify if dynamic payment tracking status has been previously handled to prevent duplicate order increments.
