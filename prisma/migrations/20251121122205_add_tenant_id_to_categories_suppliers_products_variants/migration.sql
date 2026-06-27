/*
  Warnings:

  - A unique constraint covering the columns `[name,tenantId]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sku,tenantId]` on the table `product_variants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `product_variants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `suppliers` table without a default value. This is not possible if the table is not empty.

*/
-- Get the first tenant ID to use as default
-- This is a simplified approach - in production you'd want more sophisticated logic

-- DropIndex
DROP INDEX "categories_name_key";

-- DropIndex
DROP INDEX "product_variants_sku_idx";

-- DropIndex
DROP INDEX "product_variants_sku_key";

-- AlterTable - Add nullable columns first
ALTER TABLE "categories" ADD COLUMN     "tenantId" TEXT;
ALTER TABLE "product_variants" ADD COLUMN     "tenantId" TEXT;
ALTER TABLE "products" ADD COLUMN     "tenantId" TEXT;
ALTER TABLE "suppliers" ADD COLUMN     "tenantId" TEXT;

-- Populate with default tenant ID (first tenant)
UPDATE "categories" SET "tenantId" = (SELECT id FROM "tenants" LIMIT 1) WHERE "tenantId" IS NULL;
UPDATE "suppliers" SET "tenantId" = (SELECT id FROM "tenants" LIMIT 1) WHERE "tenantId" IS NULL;

-- For products, assign based on inventory tenant
UPDATE "products" SET "tenantId" = subquery.tenant_id
FROM (
  SELECT p.id as product_id,
         COALESCE(
           (SELECT ii."tenantId"
            FROM "inventory_items" ii
            JOIN "product_variants" pv ON ii."variantId" = pv.id
            WHERE pv."productId" = p.id
            GROUP BY ii."tenantId"
            ORDER BY SUM(ii.quantity) DESC
            LIMIT 1),
           (SELECT id FROM "tenants" LIMIT 1)
         ) as tenant_id
  FROM "products" p
) subquery
WHERE "products".id = subquery.product_id;

-- For product variants, use the product's tenantId
UPDATE "product_variants" SET "tenantId" = p."tenantId"
FROM "products" p
WHERE "product_variants"."productId" = p.id;

-- Now make columns NOT NULL
ALTER TABLE "categories" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "product_variants" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "suppliers" ALTER COLUMN "tenantId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "categories_tenantId_idx" ON "categories"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_tenantId_key" ON "categories"("name", "tenantId");

-- CreateIndex
CREATE INDEX "product_variants_tenantId_idx" ON "product_variants"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_tenantId_key" ON "product_variants"("sku", "tenantId");

-- CreateIndex
CREATE INDEX "products_tenantId_idx" ON "products"("tenantId");

-- CreateIndex
CREATE INDEX "suppliers_tenantId_idx" ON "suppliers"("tenantId");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
