-- Row Level Security: until now, every table was queryable in full by any
-- authenticated Supabase client (the app only filtered by tenantId in its own
-- JS — nothing stopped a browser console call to
-- supabase.from('tenants').select('*') from reading every tenant's data).
-- This migration makes Postgres itself enforce tenant isolation.
--
-- Identity resolution: the app's own AuthProvider resolves the caller's
-- `users` row primarily by id (auth.uid() = users.id — true for every account
-- created via the current registration flow, which inserts users.id as the
-- Supabase Auth user id) and falls back to matching by email otherwise. These
-- helper functions mirror that same two-step resolution so policies stay
-- correct even for any legacy row where the ids happen to differ.
--
-- Helper functions live in a `private` schema (not exposed via PostgREST) and
-- have EXECUTE revoked from PUBLIC/anon/authenticated per Supabase's RLS
-- guidance — they're only callable from inside a policy's SECURITY DEFINER
-- context, never directly by a client. SECURITY DEFINER lets them read
-- `users` while evaluating a policy on `users` itself, without recursing
-- into RLS on that same read.

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.current_app_user()
RETURNS "users"
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT u.*
  FROM public."users" u
  WHERE u.id = (SELECT auth.uid())::text
     OR u.email = (SELECT auth.jwt() ->> 'email')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.current_app_tenant_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT "tenantId" FROM private.current_app_user();
$$;

CREATE OR REPLACE FUNCTION private.current_app_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE((SELECT role = 'SUPER_ADMIN' FROM private.current_app_user()), false);
$$;

-- authenticated needs EXECUTE here: PostgREST runs the caller's query as the
-- `authenticated` role, and RLS policies invoke these functions inline as
-- part of that same query — SECURITY DEFINER controls what the function can
-- *read* once running, not whether the calling role may invoke it at all.
-- Revoking from authenticated (as generic "wrap internal helpers" guidance
-- suggests) breaks every policy that references them with "permission denied
-- for function current_app_tenant_id". Only anon is revoked, since the app
-- never queries unauthenticated.
REVOKE EXECUTE ON FUNCTION private.current_app_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.current_app_tenant_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.current_app_is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_app_user() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_app_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_app_is_super_admin() TO authenticated;

-- Tables with a direct tenantId column: standard "own tenant, or SUPER_ADMIN" policy.
-- Function calls are wrapped in (select ...) so Postgres evaluates them once
-- per query instead of once per row (see Supabase RLS performance guidance).
DO $$
DECLARE
  t TEXT;
  tenant_scoped_tables TEXT[] := ARRAY[
    'categories', 'brands', 'suppliers', 'products', 'product_variants',
    'inventory_items', 'short_list', 'restock_receipts', 'sales',
    'expense_categories', 'expenses', 'cash_box_entries', 'credit_payments'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_scoped_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL TO authenticated USING ("tenantId" = (SELECT private.current_app_tenant_id()) OR (SELECT private.current_app_is_super_admin())) WITH CHECK ("tenantId" = (SELECT private.current_app_tenant_id()) OR (SELECT private.current_app_is_super_admin()))',
      t
    );
  END LOOP;
END $$;

-- users: everyone can see users within their own tenant (needed for
-- employee lists, sale/expense "employee" embeds); SUPER_ADMIN sees all.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "users"
  FOR ALL TO authenticated
  USING (
    "tenantId" = (SELECT private.current_app_tenant_id())
    OR (SELECT private.current_app_is_super_admin())
    OR id = (SELECT auth.uid())::text
  )
  WITH CHECK (
    "tenantId" = (SELECT private.current_app_tenant_id())
    OR (SELECT private.current_app_is_super_admin())
    OR id = (SELECT auth.uid())::text
  );

-- tenants: any authenticated user can read their own tenant row; only
-- SUPER_ADMIN can list/see all tenants. This is the policy that fixes the
-- getTenants() (list-all-tenants) exposure.
--
-- INSERT is also allowed for any OWNER-role user who doesn't yet have a
-- tenantId — this is the new-shop signup path (src/app/tenant/setup,
-- setupTenant() in tenants.ts) where a fresh owner creates their own tenant
-- row before they're attached to one. Without this, new tenant onboarding
-- breaks entirely.
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_own_tenant ON "tenants"
  FOR SELECT TO authenticated
  USING (id = (SELECT private.current_app_tenant_id()) OR (SELECT private.current_app_is_super_admin()));
CREATE POLICY new_owner_or_super_admin_write ON "tenants"
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.current_app_is_super_admin())
    OR (
      (SELECT role FROM private.current_app_user()) = 'OWNER'
      AND (SELECT "tenantId" FROM private.current_app_user()) IS NULL
    )
  );
CREATE POLICY own_tenant_or_super_admin_update ON "tenants"
  FOR UPDATE TO authenticated
  USING (id = (SELECT private.current_app_tenant_id()) OR (SELECT private.current_app_is_super_admin()));
CREATE POLICY super_admin_delete ON "tenants"
  FOR DELETE TO authenticated
  USING ((SELECT private.current_app_is_super_admin()));

-- sale_items: no direct tenantId column — scoped via the parent sale's tenant.
ALTER TABLE "sale_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "sale_items"
  FOR ALL TO authenticated
  USING (
    (SELECT private.current_app_is_super_admin())
    OR EXISTS (
      SELECT 1 FROM "sales" s
      WHERE s.id = "sale_items"."saleId" AND s."tenantId" = (SELECT private.current_app_tenant_id())
    )
  )
  WITH CHECK (
    (SELECT private.current_app_is_super_admin())
    OR EXISTS (
      SELECT 1 FROM "sales" s
      WHERE s.id = "sale_items"."saleId" AND s."tenantId" = (SELECT private.current_app_tenant_id())
    )
  );

-- push_subscriptions / refresh_tokens: scoped via userId, not tenantId.
-- refresh_tokens is unused dead weight (Supabase Auth handles refresh now)
-- but is locked down defensively rather than left wide open.
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows_only ON "push_subscriptions"
  FOR ALL TO authenticated
  USING ("userId" = (SELECT auth.uid())::text OR (SELECT private.current_app_is_super_admin()))
  WITH CHECK ("userId" = (SELECT auth.uid())::text OR (SELECT private.current_app_is_super_admin()));

ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows_only ON "refresh_tokens"
  FOR ALL TO authenticated
  USING ("userId" = (SELECT auth.uid())::text OR (SELECT private.current_app_is_super_admin()))
  WITH CHECK ("userId" = (SELECT auth.uid())::text OR (SELECT private.current_app_is_super_admin()));

-- Medicine reference tables: shared public drug database, not tenant data.
-- Readable by any authenticated user; writes restricted to SUPER_ADMIN
-- (this data is maintained via bulk import, not end-user edits).
DO $$
DECLARE
  t TEXT;
  medicine_tables TEXT[] := ARRAY[
    'medicine_generics', 'medicines', 'medicine_manufacturers',
    'medicine_drug_classes', 'medicine_indications', 'medicine_dosage_forms'
  ];
BEGIN
  FOREACH t IN ARRAY medicine_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY read_all ON %I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY super_admin_write ON %I FOR INSERT TO authenticated WITH CHECK ((SELECT private.current_app_is_super_admin()))', t);
    EXECUTE format('CREATE POLICY super_admin_update ON %I FOR UPDATE TO authenticated USING ((SELECT private.current_app_is_super_admin()))', t);
    EXECUTE format('CREATE POLICY super_admin_delete ON %I FOR DELETE TO authenticated USING ((SELECT private.current_app_is_super_admin()))', t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
