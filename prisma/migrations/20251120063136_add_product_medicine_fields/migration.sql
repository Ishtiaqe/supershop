-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('GENERAL', 'MEDICINE');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "genericName" TEXT,
ADD COLUMN     "manufacturerName" TEXT,
ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "products_productType_idx" ON "products"("productType");
