# Firebase Security Specification

## Data Invariants
1. **Products**: Anyone can read (`get` and `list`) active products. Create, update, and delete are strictly reserved for administrative users.
2. **Orders**: Anyone can create an order during checkout. Registered customers or visitors who own an order can read it. Admin can read, list, update (change status), and delete any order.
3. **Discounts**: Anyone can read (specifically `get`) active coupons to validate them at checkout. Only admins can list, create, edit, or delete coupon codes.

## The "Dirty Dozen" Payloads (Expected to fail)
1. **Payload 1**: Creating a product without `price` (Schema type error).
2. **Payload 2**: Attempting to create a product from a guest profile (Unauthorized client write).
3. **Payload 3**: Updating a product's price from a standard/guest user (Unauthorized client update).
4. **Payload 4**: Deleting a product as a standard customer (Privilege lockout).
5. **Payload 5**: Placing an order with total as a string (Schema type error).
6. **Payload 6**: Admin-spoofing in `orders/` by updating an order status directly from standard user.
7. **Payload 7**: Modifying the `createdAt` or `id` fields of an existing completed order (Immutability violation).
8. **Payload 8**: Injecting arbitrary "Ghost Fields" (e.g., `{ isSuperAdmin: true }`) into a profile or object (Shadow write).
9. **Payload 9**: Attempting to look up or scrape all discount documents (`list` query) as a general guest user.
10. **Payload 10**: Attempting to delete someone else's order as a general user.
11. **Payload 11**: Creating a discount coupon with an invalid type (not "Percentage", "Fixed Amount", or "Free Shipping").
12. **Payload 12**: Self-assigning `used: 99999` to a coupon on checkout.

## Rules Verification Strategy
We will implement robust matching blocks in `firestore.rules` containing schema validations, helper rules, and role lookup conditions.
