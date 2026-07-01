-- Composite indexes: tenant-scoped list queries filter by tenantId then sort by
-- createdAt/saleTime. A single-column tenantId index still requires a separate
-- sort step; these cover both in one index scan.
CREATE INDEX IF NOT EXISTS "inventory_items_tenantId_createdAt_idx"
  ON "inventory_items" ("tenantId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "sales_tenantId_saleTime_idx"
  ON "sales" ("tenantId", "saleTime" DESC);

-- Trigram indexes so ILIKE '%q%' searches (leading wildcard, unusable by btree)
-- can use an index scan instead of a sequential scan.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- inventory_items.itemName, product_variants.sku, product_variants.variantName,
-- and products.name already have equivalent trigram indexes (idx_inventory_items_itemname_trgm,
-- idx_product_variants_sku_trgm, idx_product_variants_variantname_trgm, idx_products_name_trgm)
-- created outside this migration history. This migration originally recreated
-- them under a different naming convention, which Supabase's linter flagged as
-- duplicate indexes (same definition, doubled write cost for no read benefit)
-- — those duplicates were dropped in drop_duplicate_trgm_indexes. Only add the
-- two genuinely new ones here.
CREATE INDEX IF NOT EXISTS "products_genericName_trgm_idx"
  ON "products" USING gin ("genericName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "products_manufacturerName_trgm_idx"
  ON "products" USING gin ("manufacturerName" gin_trgm_ops);

-- Inventory search RPC: replaces the PostgREST `.or()` filter across embedded
-- resources, which forces a separate join per referenced column on the same
-- relation (product_variants was being joined 3x for one search). One real
-- join here, callable via supabase.rpc('search_inventory_items', {...}).
-- Returns the variant/product embed as JSON to match the shape the UI expects
-- from the equivalent `.select('*, variant:product_variants(*, product:products(*))')`.
CREATE OR REPLACE FUNCTION search_inventory_items(
  p_tenant_id TEXT,
  p_query TEXT,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id TEXT,
  "tenantId" TEXT,
  "variantId" TEXT,
  "itemName" TEXT,
  quantity INT,
  "purchasePrice" DOUBLE PRECISION,
  "retailPrice" DOUBLE PRECISION,
  "maxDiscountRate" DOUBLE PRECISION,
  "expiryDate" TIMESTAMP,
  "mfgDate" TIMESTAMP,
  "batchNo" TEXT,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP,
  "lastMovedDate" TIMESTAMP,
  "lastRestockDate" TIMESTAMP,
  "lastRestockQty" INT,
  variant JSONB
)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT
    i.*,
    CASE WHEN v.id IS NULL THEN NULL ELSE
      to_jsonb(v) || jsonb_build_object('product', to_jsonb(p))
    END AS variant
  FROM "inventory_items" i
  LEFT JOIN "product_variants" v ON v.id = i."variantId"
  LEFT JOIN "products" p ON p.id = v."productId"
  WHERE i."tenantId" = p_tenant_id
    AND (
      i."itemName" ILIKE '%' || p_query || '%'
      OR v.sku ILIKE '%' || p_query || '%'
      OR v."variantName" ILIKE '%' || p_query || '%'
      OR p.name ILIKE '%' || p_query || '%'
      OR p."genericName" ILIKE '%' || p_query || '%'
      OR p."manufacturerName" ILIKE '%' || p_query || '%'
    )
  ORDER BY i."createdAt" DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION search_inventory_items(TEXT, TEXT, INT, INT) TO authenticated;

-- Supabase's PostgREST instance caches the schema; ask it to reload so the
-- new function is callable via supabase.rpc(...) without a manual restart.
NOTIFY pgrst, 'reload schema';
