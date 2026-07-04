# SuperShop — Improvement Roadmap

## Current Operations & Features

### 1. Dashboard (`/dashboard`)
- Summary cards: Revenue, Profit, Profit Margin, Current Capital (asset value), Inventory Selling Value, Orders count
- Period selector: 7d / 30d / 90d
- Sales trend area chart (daily revenue)
- Profit margin trend area chart (daily profit %)

### 2. POS / Sales Portal (`/pos`)
- Search inventory by name/SKU/generic/manufacturer
- Aggregate items by variant, show batch-level stock
- Add to cart with quantity + per-item discount
- Discount validation against minimum profit margin (4% floor)
- Cart persisted in `localStorage` (survives reload)
- Credit sales: customer name + phone + partial payment
- Batch-level stock deduction (FIFO from oldest restock)
- Sale success dialog with summary
- Cash box entry auto-created on sale

### 3. Sales History (`/sales-history`)
- List all sales with items, inventory, employee info
- Search by receipt number, customer name, phone
- Date range filter, payment method filter
- Sale detail modal with full item breakdown
- Delete sale (with cascade to sale_items)
- Pagination (10 per page, client-side)

### 4. Inventory (`/inventory`)
- Add inventory item (with catalog autocomplete)
- Fields: itemName, quantity, purchasePrice, retailPrice, batchNo, expiryDate, fundSource
- Fund source: Cash Box / New Investment / Loan → auto cash box entry
- Group items by variant, show total stock + batch count
- Edit item (quantity, prices)
- Delete item
- Search by name, SKU, generic, manufacturer
- Max discount % display (based on purchase vs retail price)
- Low stock, expiring, expired alert endpoints

### 5. Catalog (`/catalog`)
- Product + variant management (productName, variantName, SKU, retailPrice)
- Product types: GENERAL / MEDICINE
- Medicine fields: genericName, manufacturerName
- Search + pagination (20 per page)
- CRUD: create, update, delete products

### 6. Medicine Database (`/medicine-database`)
- Read-only browse of medicine reference data
- Search by brand/generic/manufacturer
- Expandable rows showing details (strength, dosage form)
- Pagination (10 per page)

### 7. Brands (`/brands`) & Categories (`/categories`)
- Simple CRUD for brand and category names
- Shows product count per brand/category

### 8. Short List (`/shortlist`)
- Auto-populated when item drops to ≤50% of last restock qty
- Manual add/remove
- Sort by quantity / added date / name
- Filter slow-moving items
- Export PDF (shortlist, inventory, analytics)
- Export backup

### 9. Credits (`/credits`)
- Summary: total outstanding, customers with dues
- Customer list grouped by phone (totalDue, salesCount, oldestDueDate, lastPaymentDate)
- Per-customer detail: all credit sales + payment history
- Record payment: amount, paymentMethod, note
- Payment updates sale's amountPaid/dueAmount + creates CREDIT_PAYMENT_IN cash box entry

### 10. Customers (`/customers`) — *newly added*
- CRUD: create, list, search, update, delete
- Fields: name, phone, email, address, creditLimit
- Outstanding balance endpoint

### 11. Expenses (`/expenses`)
- Category management (create, update, delete)
- Expense CRUD with category, amount, date, description
- Summary: total amount, top category
- Date range + category filter
- Auto cash box entry (EXPENSE_OUT) on expense creation

### 12. Cash Box (`/cash-box`)
- Summary: cashIn, cashOut, currentBalance
- Entry types: SALE_IN, MANUAL_IN, NEW_INVESTMENT_IN, LOAN_IN, CREDIT_PAYMENT_IN, EXPENSE_OUT, INVENTORY_OUT
- Manual entry creation
- Delete entry
- Shows createdBy user

### 13. Data Management (`/data-management`)
- Export full backup (SQL dump)
- Import backup (restore)
- Delete all data (danger zone)

### 14. Profile (`/profile`)
- Update full name + email
- Change password
- Uses Supabase Auth for password changes

### 15. Admin Tenants (`/admin/tenants`) — *SUPER_ADMIN only*
- List all tenants
- Create new tenant + owner account
- Edit tenant details (name, address)

### 16. Tenant Setup (`/tenant`)
- Initial tenant creation for new owners

### 17. Cross-cutting Features
- Multi-tenancy: tenantId on all tables, RLS policies, tenant isolation
- Offline support: PWA with service worker, offline queue, IndexedDB caching
- Push notifications: shortlist alerts via Firebase
- Mobile responsive: separate mobile table card layouts
- Role-based access: OWNER, EMPLOYEE, SUPER_ADMIN
- Master data cache: products + variants cached to reduce DB joins
- React Query: client-side caching, prefetching, optimistic updates
- Capacitor: Android + iOS build support

---

## Improvement Roadmap

### A. High-Impact New Features

1. **Barcode / QR Code Scanning**
   - Add barcode field to `product_variants` table
   - Use device camera in POS to scan → auto-add to cart
   - Generate printable barcode labels for products
   - Every competitor in BD market has this — it's table stakes

2. **Purchase Orders / Supplier Management**
   - `Supplier` model (name, phone, address, paymentTerms)
   - `PurchaseOrder` model (supplier, items, total, status: DRAFT/ORDERED/RECEIVED)
   - Link POs to restock receipts
   - Track supplier-wise pricing history
   - Reorder suggestions based on sales velocity + current stock

3. **Receipt / Invoice Printing**
   - Thermal printer support (58mm/80mm)
   - PDF receipt with shop name, address, item list, totals
   - SMS/WhatsApp receipt to customer
   - Currently no printable receipt — critical for BD retail

4. **Customer Loyalty / Points System**
   - Points earned per purchase (configurable rate)
   - Points redeemable as discount
   - Tier system (Bronze/Silver/Gold) with different discounts
   - Customer purchase history dashboard

5. **Stock Transfer Between Batches/Locations**
   - `StockTransfer` model for moving stock
   - Multi-warehouse/location support
   - Transfer logs with stock movements

6. **Daily Cash Box Reconciliation / Shift Management**
   - `Shift` model: opening balance, closing balance, expected vs actual
   - Employee login/logout at shift start/end
   - Discrepancy reporting
   - Currently cash box is a running total — no shift-level accountability

7. **Automated Reorder Points**
   - Per-item `reorderLevel` and `reorderQty` fields
   - Auto-add to shortlist when below reorder level (not just 50% rule)
   - Supplier auto-notification for reorder
   - Restock forecast based on sales velocity

8. **Expiry Management with Batch Tracking**
   - Near-expiry alerts (30/60/90 days configurable)
   - Auto-discount suggestions for near-expiry items
   - Expired stock write-off with stock movement + expense entry
   - Currently you have alerts but no write-off workflow

### B. Optimize Existing Operations

9. **Server-side Pagination on Sales History**
   - Currently fetches all 4,282 sales then paginates client-side
   - Add `limit`/`offset` to the API query (the endpoint supports it but the frontend doesn't use it)

10. **Batch N+1 in `createSale`**
    - 50 DB calls per 10-item sale → reduce to ~6 with batch queries
    - Batch-fetch all inventory items in a single `.in('id', itemIds)` call
    - Batch-insert all stock_movements in one call
    - Batch-check short_list existence with `.in('inventoryId', itemIds)`

11. **SQL Aggregates for Analytics**
    - Replace fetch-all + JS sum with SQL `GROUP BY` + `SUM()`
    - Cash box summary: `SELECT "entryType", SUM(amount) GROUP BY`
    - Sales analytics: `GROUP BY DATE(saleTime)` instead of JS grouping
    - Credits summary: SQL `SUM(dueAmount), COUNT(DISTINCT customerPhone)`

12. **POS: Customer Selector from Customers Table**
    - Currently credit sales use free-text name/phone
    - Replace with searchable dropdown from `customers` table
    - Auto-fill phone, show outstanding balance during sale
    - Warn if credit sale exceeds customer's `creditLimit`

13. **Sales History: Server-side Filtering**
    - Move search/date-range/payment-filter to API params
    - Add `GET /sales-history?search=...&startDate=...&endDate=...&paymentMethod=...`

14. **Inventory: Bulk Import/Export**
    - CSV/Excel import for bulk inventory additions
    - Export current inventory to CSV
    - Useful for initial setup and stock takes

15. **Dashboard: More Metrics**
    - Today's sales vs yesterday comparison
    - Top-selling products (by quantity and revenue)
    - Low stock count badge
    - Credit outstanding as a dashboard card
    - Cash box balance as a dashboard card
    - Dead stock value (items not sold in 90 days)

### C. UX / UI Improvements

16. **Quick Keys / Favorites in POS**
    - Pin frequently sold items as quick-tap buttons
    - Category-based browsing in POS (tabbed interface)

17. **Hold / Park Sale**
    - Park a sale to resume later (separate from cart persistence)
    - Multiple parked sales with recall

18. **Keyboard Shortcuts in POS**
    - Enter to add to cart, Esc to clear, F2 for credit mode
    - Numpad-friendly quantity entry

19. **Dark Mode Toggle**
    - CSS variables already defined for dark mode (`dark:` classes exist)
    - Add a theme toggle in the shell/header

20. **Sales Receipt Modal with Print Button**
    - After successful sale, show itemized receipt preview
    - Print button → thermal printer or PDF

### D. Architecture / Infrastructure

21. **Database Constraints & Integrity**
    - Add `CHECK` constraint: `dueAmount >= 0` and `amountPaid >= 0` on sales
    - Add `CHECK` constraint: `quantity >= 0` on inventory_items
    - Add unique constraint on `sales.receiptNumber` per tenant (already exists)
    - Add FK enforcement on `cash_box_entries.referenceId` (polymorphic — use partial indexes)

22. **Audit Log / Activity Feed**
    - `ActivityLog` model: who did what, when, on what entity
    - Track: sales, returns, stock adjustments, expense edits, cash box entries
    - Useful for owner oversight and dispute resolution

23. **Role-based Feature Gating for Employees**
    - Currently EMPLOYEE can see everything OWNER sees except Cash Box and Data Management
    - Consider restricting: expense creation, inventory deletion, sale deletion
    - Configurable permissions per tenant

24. **Automated Database Backups**
    - Schedule daily Supabase backups
    - Retention policy (7 daily, 4 weekly)
    - One-click restore from admin panel

25. **API Rate Limiting / Error Boundaries**
    - Add request throttling on expensive endpoints
    - Global error boundary with retry button
    - Network status indicator (already partially exists)

### E. Business Intelligence

26. **Profit Analysis by Product/Category/Brand**
    - Which products generate the most profit?
    - Which categories have the best margins?
    - Brand-wise sales breakdown

27. **Sales by Employee**
    - Per-employee sales summary
    - Commission calculation support

28. **Inventory Turnover Report**
    - Days of stock remaining per item
    - Slow-moving / dead stock identification
    - Stock aging report

29. **Tax / VAT Support**
    - Bangladesh has VAT (usually 15% on some items)
    - Add `vatRate` to products, `vatAmount` to sales
    - VAT report for tax filing

30. **Daily/Monthly Closing Report**
    - End-of-day summary: total sales, cash in, expenses, credit given
    - Monthly P&L statement
    - Printable / exportable

---

## Priority Matrix

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Receipt printing (thermal + PDF) | Medium | Critical for BD retail |
| **P0** | POS customer selector from `customers` table | Small | High — connects Customer model to daily flow |
| **P0** | Server-side pagination on sales history | Small | Fixes scaling issue |
| **P1** | Barcode scanning in POS | Medium | Table-stakes feature |
| **P1** | Batch N+1 in `createSale` | Medium | Performance — 10x fewer DB calls |
| **P1** | SQL aggregates for analytics | Medium | Performance — replaces fetch-all |
| **P1** | Shift / cash reconciliation | Medium | Operational accountability |
| **P1** | Dashboard: more metrics (today's sales, top products, credit outstanding) | Small | Better decision-making |
| **P2** | Supplier + Purchase Order management | Large | Restock workflow |
| **P2** | Automated reorder points | Medium | Inventory automation |
| **P2** | Expiry write-off workflow | Small | Loss tracking |
| **P2** | Bulk CSV import/export for inventory | Medium | Onboarding + stock takes |
| **P3** | Loyalty / points system | Large | Customer retention |
| **P3** | Tax/VAT support | Medium | Compliance |
| **P3** | Audit log | Medium | Oversight |
| **P3** | Profit analysis reports | Medium | Business intelligence |
