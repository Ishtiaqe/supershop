-- Dashboard summary RPC: returns a count of distinct inventory groups
-- (product variant or ad-hoc item name) currently held in inventory and the
-- total number of inventory item rows.
CREATE OR REPLACE FUNCTION get_inventory_summary(
  p_tenant_id TEXT
)
RETURNS TABLE (
  total_inventory_sku_count BIGINT,
  total_inventory_items BIGINT
)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT
    COUNT(DISTINCT COALESCE("variantId", "itemName", 'unknown')) AS total_inventory_sku_count,
    COUNT(*) AS total_inventory_items
  FROM "inventory_items"
  WHERE "tenantId" = p_tenant_id
    AND quantity > 0;
$$;

GRANT EXECUTE ON FUNCTION get_inventory_summary(TEXT) TO authenticated;

-- Supabase's PostgREST instance caches the schema; ask it to reload so the
-- new function is callable via supabase.rpc(...) without a manual restart.
NOTIFY pgrst, 'reload schema';
