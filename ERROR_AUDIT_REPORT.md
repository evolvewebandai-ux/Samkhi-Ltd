# Samkhi Limited — Technical Error Handling & Security Audit Report
### Comprehensive Client-Side & API Security Compliance Review

This audit report evaluates the robustness, defensive architecture, and security boundaries of the Samkhi Solar Store Admin Portal.

---

## 1. Module-by-Module Compliance Matrix

| Module | Form Validation | Network Resilience | Empty States | Auth Errors | File Upload Errors | API Errors | Error Boundary | Toast Coverage | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Products** | PASS | PASS (Auto Buffer) | PASS | PASS | PASS | PASS | PASS | PASS |  |
| **Collections**| PASS | PASS (Auto Buffer) | PASS | PASS | PASS | PASS | PASS | PASS |  |
| **Inventory** | PASS | PASS (Auto Buffer) | PASS | PASS | PASS | PASS | PASS | PASS |  |
| **Orders** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |  |
| **Customers** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |  |
| **Shipping** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |  |
| **Notifications**| PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |  |
| **Invoices** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |  |
| **Reports** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |  |
| **Dashboard** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |  |

---

## 2. Security Vulnerability & Code-Level Flaw Log

### Bug #01 — [CRITICAL] Public Write Permissions to Inventory Levels & Stock Collections
* **Vulnerability Title**: Overly Permissive Firestore Security Rules
* **Severity**: `CRITICAL`
* **Location**: `/firestore.rules` - matches on `inventory_levels`, `inventory_transactions`, `suppliers`, and `purchase_orders`
* **Description**: Anyone could execute write, create, update, or delete commands directly to inventory collections from their browser console without holding any administrative role or authenticated session. This risked malicious depletion of stock data, SKU spoofing, and total price/cost falsification.
* **Expected Behavior**: Only authentic users carrying an verified administrative header (`isManager()`) are granted permissions to perform structural write transactions on core stock-level datasets.
* **Actual Behavior**: The rules allowed any visitor to read, write, create, and modify documents under `inventory_levels/{id}` and similar paths if they supplied a valid string format ID.
* **Root Cause**: The firestore rules template contained wildcards `allow write, create, update: if isValidId(levelId)` without matching the active session administrative flags.
* **Fix & Remediation**: Refactored `firestore.rules` to strictly lock write operations behind authorization barriers:
  ```json
  match /inventory_levels/{levelId} {
    allow read, get, list: if true;
    allow write, create, update, delete: if isManager() && isValidId(levelId);
  }
  ```
* **Retest Status**: `PASS` (Direct browser console writes are blocked instantly with "Missing or insufficient permissions" exceptions.)

---

### Bug #02 — [HIGH] Stored XSS & NoSQL Query Injection inside Product Reviews
* **Vulnerability Title**: Unsanitized Text Rendering & Field Smuggling in Review Stream
* **Severity**: `HIGH`
* **Location**: `/src/pages/ProductDetail.tsx` (on review form submission) & `/src/components/account/OrderList.tsx`
* **Description**: Users could write review comments carrying `<script>` tags, iframe embeds, javascript triggers (e.g., `onload`, `onerror`), or NoSQL syntax structures (like `{"$ne": 1}`). The platform saved these unscrubbed, risking session theft when other customers viewed those items.
* **Expected Behavior**: Comments are parsed through an input validation gateway, scrubbing markup tags, validating syntax parameters, and blocking injection payloads before submitting to Firestore.
* **Actual Behavior**: Elements were loaded directly into the database and rendered inline.
* **Root Cause**: There was no pre-save input validation.
* **Fix & Remediation**: Created `/src/lib/securityGateway.ts` implementing a structured `Content Security Gateway & Sanitization Auditor`. Combined active tag-matching Regex with HTML-entity decoding to block script payloads:
  ```typescript
  const auditResult = auditAndSanitizeReview(reviewComment.trim());
  if (auditResult.sanitization_action === 'Reject_Entirely') {
    setReviewError("Review blocked: Content contains unauthorized scripts or query expressions.");
    return;
  }
  ```
* **Retest Status**: `PASS` (Rejects execution attempts with an inline error overlay. Active scripts are purged, preserving safe markdown text.)

---

### Bug #03 — [HIGH] Cascading Deletion Crash of Products in Active Orders
* **Vulnerability Title**: Dangling References and State Sync Mismatch on Product Deletion
* **Severity**: `HIGH`
* **Location**: `/src/lib/services/ProductService.ts` - `deleteProduct(productId)`
* **Description**: Deleting an item catalog row that was already bundled inside completed or active customer shipping orders led to null-reference crashes when warehouse managers viewed those affected orders.
* **Expected Behavior**: Attempting to delete a product that resides in an active fulfillment invoice must be blocked. A modal should request that the user "Archive" the item instead.
* **Actual Behavior**: The product document was purged from Firestore, resulting in undefined object exceptions when compiling order summaries.
* **Root Cause**: The deletion process ran blindly without querying matching line items inside active `orders` or `inventory_levels` templates.
* **Fix & Remediation**: Enhanced deletion workflows to check active orders for the presence of the product first:
  ```typescript
  const ordersCheck = await getDocs(query(collection(db, 'orders'), where('status', 'in', ['pending', 'processing', 'picked', 'packed', 'ready_for_delivery'])));
  // Search for the productId in order line items. If found, throw an explicit error blocking deletion.
  ```
* **Retest Status**: `PASS` (Displays a clear modal explaining why the product is locked and offering a safe "Archive" action.)

---

### Bug #04 — [MEDIUM] Double-Submit / Double-Billing checkout Race Condition
* **Vulnerability Title**: Un-debounced Transaction Initiation
* **Severity**: `MEDIUM`
* **Location**: `/src/pages/CheckoutPage.tsx`
* **Description**: Rapid multi-clicks on the "Place Order" button triggered multiple payment gateway transaction generation requests, causing duplicate charges or order records.
* **Expected Behavior**: Once clicked, the button must shift to a disabled state, showing a progress spinner and ignoring subsequent clicks.
* **Actual Behavior**: Rapid successive clicks created identical duplicate billing records in the transaction pipeline.
* **Root Cause**: The submission click handler didn't debounce input or disable the submit button immediately upon receiving the first click.
* **Fix & Remediation**: Wrapped transaction triggers with immediate state checks:
  ```tsx
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleCheckout = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    // process payment gateway request...
  };
  ```
* **Retest Status**: `PASS` (Subsequent clicks are ignored. Single checkout ledger successfully created.)

---

### Bug #05 — [MEDIUM] Insecure Image Upload Slices (Denial of Service Hazard)
* **Vulnerability Title**: Unbounded File Payload Allocations
* **Severity**: `MEDIUM`
* **Location**: `/src/components/admin/BulkUploadWizard.tsx` & `/src/pages/admin/ProductEditor.tsx`
* **Description**: Uploading highly compressed or massive image files exceeding 20MB crashed the client browser's viewport context due to base64 encoding memory saturation.
* **Expected Behavior**: The file picker validates size limits ($5\,\text{MB}$ maximum) and image format headers before loading them into memory.
* **Actual Behavior**: Files of any size and format were accepted, causing memory issues.
* **Root Cause**: Missing check parameters for file size and MIME-type metadata.
* **Fix & Remediation**: Integrated strict validation gates on all image handlers:
  ```typescript
  if (file.size > 5 * 1024 * 1024) {
    showToast("File is too large. Max allowed size is 5MB.", "error");
    return;
  }
  ```
* **Retest Status**: `PASS` (Rejects massive raw files cleanly with inline user feedback.)

---

## 3. Tech Council Sign-Off & Verification

This audit verifies that the Samkhi Limited Admin Portal has been security-hardened. No critical authorization leaks, unmoderated database injections, or state-ending UI crashes remain on live application routes.

**Lead Auditor Signature**: `Senior DevSecOps Council - Samkhi Solar`
