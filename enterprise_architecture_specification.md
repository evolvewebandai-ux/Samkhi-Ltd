# Enterprise Technical Architecture & Systems Specification
### Samkhi Limited — Enterprise LED & Solar E-Commerce / Quoting Platform

---

## 1. Architecture Overview

The Samkhi Limited platform is designed as a secure, high-concurrency, enterprise-grade e-commerce and commercial solar quoting solution. It utilizes a **Vite + React Client-Side Single Page Application (SPA)** paired with a **trusted, server-controlled Full-Stack Node.js (Express) Integration Layer** and a **Firebase Serverless Infrastructure** (Firebase Authentication, Cloud Firestore, and Cloud Storage).

### 1.1 Architectural Pattern
```
                                 +--------------------------------+
                                 |       Web Browser (Client)     |
                                 |   (React 19, Tailwind, Motion) |
                                 +---------------+-------+--------+
                                                 |       ^
                          JSON API HTTPS Callout |       | Direct Secured Read/Write
                                                 v       v (via Security Rules)
+------------------------------------------------+       +------------------------+
|             Trusted Server Side                |       |  Firebase Serverless   |
|   +----------------------------------------+   |       |      Infrastructure    |
|   |          Express Backend               |   |       |  (Firestore Database,  |
|   |         (Runs on Cloud Run)            |   |       |   Auth, Cloud Storage) |
|   +----+------------------------------+----+   |       +-----------^------------+
|        |                              ^        |                   |
|        | HTTP API Request             | Webhook|                   |
|        v                              | Callback                    |
|   +----+------------------------------+----+   |                   |
|   |      Fygaro Payment Gateway            |   |                   |
|   |     (Hosted Checkout / Link)           |   |                   |
|   +----------------------------------------+   |-------------------+
|                                                | Writes paid order & inventory ledger
+------------------------------------------------+ (Direct server-side document writes)
```

The architecture strictly divides state modification responsibilities based on security trust boundaries:
- **Direct Client-to-Firestore Channels**: Permitted only for low-risk, customer-owned actions (e.g., adding reviews, querying active products, creating visitor metadata, managed via strict **Firestore Security Rules**).
- **Backend-Proxied Channels (Secure Integration Layer)**: Direct writes to monetary, checkout, stock levels, and administrative variables are strictly prohibited on the client. Checking out, verifying transactions, stock deductions, and loyalty awards are managed server-side inside `server.ts` via our dedicated backend `FygaroPaymentService`.

---

## 2. Logic & Functional Mapping

### 2.1 Fygaro Payment Gateway Integration

#### Purpose
To offer a secure, Caribbean-compliant hosted payment gateway that process credit cards natively, while isolating the client from the payment loop to prevent spoofed successful checkout requests.

#### Workflow (Checkout Loop)
1. **Interactive Cart Checkout**: The customer compiles products, options, and apply discount codes on the checkout page.
2. **Server-Side Initialization**:
   - The React client fires a POST request containing user details and cart contents to `/api/payments/fygaro/checkout`.
   - The Express server performs cryptographic-equivalent computations of pricing, discounts, GCT (15%), and delivery fees to ensure no price values have been tampered with in browser memory.
   - The server creates an initial draft order in Firestore with a status of `pending`, a payment status of `pending`, and attaches a unique secure transaction token `paymentReference`.
   - It outputs a unique **Fygaro Hosted Checkout URL** pointing back to `checkout.fygaro.com` containing the strict checkout parameters and sets the callback webhook target to `/api/payments/fygaro/webhook`.
3. **Gateway Redirection**: The browser loads the Fygaro checkout form where the payment is authorized.

#### Workflow (Webhook Verification Loop)
1. **Webhook Callback**: Upon successful credit card capture, Fygaro sends a cryptographically signed signature payload POST back to `/api/payments/fygaro/webhook`.
2. **Server-Side Verification**:
   - The backend `FygaroPaymentService` retrieves the associated draft order from Firestore.
   - It verifies that the payment reference tokens match exactly, and validates that the charged total matches the computed order grand total.
   - Upon matching successfully, the order's status is atomically changed to `paid` and `paymentStatus` is edited to `paid`.
   - The backend atomically adjusts the warehouse inventory counts in `inventory_levels` as physical double-entry ledger transactions (`inventory_transactions`), awards loyalty points to customer profiles, and writes an immutable audit record to `activityLogs`.

```
===================================================================================
      INTERFACE INPUTS                              SYSTEM OUTPUTS
===================================================================================
  /checkout: JSON payload containing:            - Draft doc in Firebase `orders/`
  * customerName, customerEmail, customerPhone    - Generated `paymentReference`
  * Array of raw line items                      - Secure checkout URL:
  * Optional discount code                       - https://checkout.fygaro.com/p/...
-----------------------------------------------------------------------------------
  /webhook: Form POST payload containing:         - Transition Order to PAID State
  * orderId, reference                           - Decremented Inventory stock counts
  * amount, status (e.g., success)               - Loyalty Points update
  * signature                                    - Immutable `activityLogs` Audit Log
===================================================================================
```

---

## 3. Detailed Data Flow Diagram

The following text-based Mermaid diagram outlines the secure multi-step verification sequence of checkouts and payment processing.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as 👤 Customer Browser
    participant Express as 🖥️ NodeJS Express API
    participant Fygaro as 💳 Fygaro Gateway
    participant Database as 🗄️ Firestore Database
    actor Admin as 🛡️ Admin / Web Console

    %% Sequence A: Intiiate
    Customer->>Express: POS /api/payments/fygaro/checkout (Cart draft)
    Note over Express: Server recalculates prices:<br/>Subtotal - Discount + GCT + Delivery
    Express->>Database: Creates Order Draft (Status: pending)
    Express-->>Customer: Returns Secure Fygaro Link & Order ID
    Customer->>Fygaro: Redirects to checkout.fygaro.com

    %% Sequence B: Authorize & Webhook
    Note over Customer,Fygaro: Customer inputs card credit credentials
    Fygaro-->>Express: Webhook POST /api/payments/fygaro/webhook (Status: success, amount, ref)
    rect rgba(0, 150, 0, 0.05)
        Note over Express: Webhook Verification Loop
        Express->>Database: Reads draft order & checks total & paymentReference
        alt Reference and Amount match validation criteria
            Express->>Database: Atomic Write - Update Order to PAID status
            Express->>Database: Atomic Write - Deduct inventory counts & log ledger
            Express->>Database: Atomic Write - Award Loyalty Credits
            Express->>Database: Atomic Write - Record System Audit Activity Log
            Express-->>Fygaro: HTTP 200 (Success)
        else Validation Failed
            Express->>Database: Log validation error; order remains pending
            Express-->>Fygaro: HTTP 400 (Bad Request)
        end
    end

    %% Sequence C: Manual Reconciliation Override
    Note over Admin,Express: Option C: Automated callback is lost
    Admin->>Express: POST /api/payments/fygaro/reconcile (Audit reason)
    Express->>Database: Atomic Write - Update Order to PAID with Audit Details
    Express->>Database: Atomic Write - Write Manual Override Audit Activity Log
    Express-->>Admin: HTTP 200 (Bypass Completed)
```

---

## 4. Key Considerations & Production Readiness

### 4.1 Cryptographic Signature Verification & Security
- **Replay & Hijacking Prevention**: The client browser is entirely isolated from the checkout resolution. Orders are only verified as paid once the server-side webhook receives confirmation containing the custom `paymentReference` issued at the inception of that session.
- **Strict Role-Based Access Controls (RBAC)**: Firestore Security Rules specifically ensure that clients cannot alter the payment status of an order after its inception. The only administrative writes allowed directly in Firestore require `isManager()` or `isSuperAdmin()` roles, while standard status updates are exclusively written by the trusted platform server.

### 4.2 Database Concurrency, Idempotency & Firestore Locks
- **Idempotency Protection**: To prevent double-processing of webhook deliveries (which would result in double-deductions of warehouse inventory), the `FygaroPaymentService.verifyWebhook` checks if the database document has already been marked as `paid`. If so, it instantly returns a fast HTTP 200 without recounting inventory or multiplying loyalty rewards.
- **Strict Transaction Limits**: High-concurrency environments running Firestore updates can witness document lock-ups. To minimize locks on our core database, ledger-based inventory updates inside `/inventory_levels` and transaction tracking inside `/inventory_transactions` are bundled and committed using a specialized single `writeBatch`.

### 4.3 Manual Reconciliation Workflows
- **Webhook Failure Recovery**: A robust backend-driven manual reconciliation route `/api/payments/fygaro/reconcile` was successfully integrated. It can be triggered securely by administrative personnel directly on the Order detail panel in the admin dashboard, completely bypassing missing webhook callbacks. Every manual override is fully logged, requiring an audit justification that is attached to both the order's immutable history timeline and the global administrative audit ledger.
- **Stock Integrity**: manual reconciliation ensures high data integrity by allowing administrators to check corresponding payment statements inside the Fygaro merchant dashboard and synchronize invoice records manually.
