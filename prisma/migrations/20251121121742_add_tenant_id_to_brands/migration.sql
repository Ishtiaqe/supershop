/*
  Warnings:

  - A unique constraint covering the columns `[name,tenantId]` on the table `brands` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `brands` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "brands_name_key";

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "brands_tenantId_idx" ON "brands"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_tenantId_key" ON "brands"("name", "tenantId");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
