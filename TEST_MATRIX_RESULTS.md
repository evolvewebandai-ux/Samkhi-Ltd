# Test Matrix & Integrity Validation Results
**Project:** Samkhi Limited Admin Operations  
**Date:** June 15, 2026  
**Status:** Verification Successful (ALL TESTS GREEN)

The following test suites verify the behavior of our hardened modules:

---

## 1. Referential Delete Cascade Tests

| Test Case ID | Scenario | Input / Action | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-DEL-01** | Block delete for active orders | Delete product `solar-inverter-3kw` which has an unfulfilled pending order. | Aborts delete. Returns report listing active orders. Shows `🔴 BLOCKED` toast. | **GREEN** |
| **TC-DEL-02** | Deleting unreferenced item | Delete product with 0 references in any orders. | Cascade deletes product, `/inventory_levels`, `/collection_products`, and wishlists. Returns success report. | **GREEN** |
| **TC-DEL-03** | Collection Count Auto-Trigger | Deleting an item in collection. | Recalculates `productCount` of collection in real time. | **GREEN** |

---

## 2. Bulk Upload Validation Tests

| Test Case ID | Scenario | Input / Action | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-CSV-01** | Missing critical SKU column | Upload row with name and price but empty SKU. | Captures row error. Skips row. Includes SKU error row detailed in CSV download. | **GREEN** |
| **TC-CSV-02** | Invalid negative stock criteria | Upload row with `QuantityAvailable = -5`. | Rejects row with invalid stock error details. | **GREEN** |
| **TC-CSV-03** | Auto-Collection Creation | Upload row with clean collection `Off-Grid Systems` which does not exist in DB. | Detects missing collection. Auto-creates `Off-Grid Systems` with `manual` type, links product, and triggers recounting. | **GREEN** |

---

## 3. Stock Level Integrity & Healing Checks

| Test Case ID | Scenario | Input / Action | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-HL-01** | Missing Level document | Run migration script where product lacks Level document. | Auto-creates `inventory_levels` document mapped to the product with current stock totals. | **GREEN** |
| **TC-HL-02** | Negative quantity correction | Run migration with `quantityOnHand = -12`. | Heals negative stock to `0` and recalculates available total. | **GREEN** |
