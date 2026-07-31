import type { SupabaseClient } from '@supabase/supabase-js'

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const PAGE = 1000

/**
 * Fetch every row matching a query, paging past PostgREST's 1000-row cap.
 */
async function fetchAll<T>(build: () => any): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data || []) as T[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

interface InventoryRow {
  id: string
  variantId: string | null
  itemName: string | null
  quantity: number | null
  lastRestockQty: number | null
  lastRestockDate: string | null
}

export interface ProductGroup {
  key: string
  variantId: string | null
  itemName: string | null
  /** Every inventory batch belonging to this product. */
  inventoryIds: string[]
  /** Stock summed across all batches. */
  totalStock: number
  /** lastRestockQty of the most recently restocked batch (0 when never restocked). */
  latestRestockQty: number
  latestRestockDate: string | null
  /** Batch that best represents the product for a reorder pointer. */
  representativeId: string
}

/**
 * A product is grouped by variantId when it has one, else by itemName. This
 * mirrors how batches of the same product are split across inventory rows.
 */
function groupKeyFor(row: InventoryRow): string {
  return row.variantId || row.itemName || row.id
}

/**
 * Load inventory rows once and fold them into per-product groups. One query
 * (paged) instead of a query per product.
 *
 * Pass `scope` to restrict the read to specific products — used by the list
 * endpoint, which only needs the products already on the shortlist rather than
 * the whole catalogue. The sweep endpoints omit it to scan everything.
 */
export async function loadProductGroups(
  supabase: SupabaseClient,
  tenantId: string,
  scope?: { variantIds: string[]; itemNames: string[] }
): Promise<{ groups: Map<string, ProductGroup>; groupKeyByInventoryId: Map<string, string> }> {
  const base = () =>
    supabase
      .from('inventory_items')
      .select('id, variantId, itemName, quantity, lastRestockQty, lastRestockDate')
      .eq('tenantId', tenantId)

  let rows: InventoryRow[]
  if (scope) {
    if (scope.variantIds.length === 0 && scope.itemNames.length === 0) {
      return { groups: new Map(), groupKeyByInventoryId: new Map() }
    }
    // Two targeted reads — products keyed by variant, and legacy rows keyed by
    // name — then merge. Chunked to keep the IN lists within URL limits.
    const collected: InventoryRow[] = []
    const CHUNK = 200
    for (let i = 0; i < scope.variantIds.length; i += CHUNK) {
      const slice = scope.variantIds.slice(i, i + CHUNK)
      collected.push(...(await fetchAll<InventoryRow>(() => base().in('variantId', slice))))
    }
    for (let i = 0; i < scope.itemNames.length; i += CHUNK) {
      const slice = scope.itemNames.slice(i, i + CHUNK)
      collected.push(...(await fetchAll<InventoryRow>(() => base().in('itemName', slice))))
    }
    const seen = new Set<string>()
    rows = collected.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
  } else {
    rows = await fetchAll<InventoryRow>(base)
  }

  const groups = new Map<string, ProductGroup>()
  const groupKeyByInventoryId = new Map<string, string>()
  // Tracks which batch currently wins the representative slot, so we can
  // compare candidates without a second pass.
  const bestRep = new Map<string, { hasStock: boolean; restockDate: string | null }>()

  for (const row of rows) {
    const key = groupKeyFor(row)
    groupKeyByInventoryId.set(row.id, key)

    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        variantId: row.variantId || null,
        itemName: row.itemName || null,
        inventoryIds: [],
        totalStock: 0,
        latestRestockQty: 0,
        latestRestockDate: null,
        representativeId: row.id,
      }
      groups.set(key, group)
      bestRep.set(key, { hasStock: false, restockDate: null })
    }

    group.inventoryIds.push(row.id)
    group.totalStock += row.quantity || 0

    const restockDate = row.lastRestockDate
    if (row.lastRestockQty != null && restockDate) {
      if (!group.latestRestockDate || new Date(restockDate) > new Date(group.latestRestockDate)) {
        group.latestRestockDate = restockDate
        group.latestRestockQty = row.lastRestockQty || 0
      }
    }

    // Prefer a batch that still has stock; break ties by most recent restock.
    const hasStock = (row.quantity || 0) > 0
    const best = bestRep.get(key)!
    const better =
      (hasStock && !best.hasStock) ||
      (hasStock === best.hasStock &&
        !!restockDate &&
        (!best.restockDate || new Date(restockDate) > new Date(best.restockDate)))
    if (better) {
      group.representativeId = row.id
      bestRep.set(key, { hasStock, restockDate: restockDate || best.restockDate })
    }
  }

  return { groups, groupKeyByInventoryId }
}

/**
 * The shortlist rule: a product belongs on the list when it is out of stock,
 * or when what is left is at or below half of the last restock quantity.
 */
export function evaluateGroup(group: ProductGroup): { qualifies: boolean; reason: string } {
  if (group.totalStock <= 0) return { qualifies: true, reason: 'out of stock' }
  if (group.latestRestockQty > 0 && group.totalStock <= group.latestRestockQty * 0.5) {
    return { qualifies: true, reason: '50% rule' }
  }
  return { qualifies: false, reason: '' }
}

export interface ShortlistUpdateResult {
  checked: number
  added: number
  skipped: number
  details: string[]
}

/**
 * Sweep the whole inventory table and add every product that is out of stock or
 * at/below 50% of its last restock. Products already represented on the
 * shortlist (by any of their batches) are left alone.
 *
 * Cost is fixed: one paged read of inventory_items, one read of short_list, one
 * batch insert — regardless of how many products qualify.
 */
export async function runShortlistUpdate(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<ShortlistUpdateResult> {
  const { groups, groupKeyByInventoryId } = await loadProductGroups(supabase, tenantId)

  const existing = await fetchAll<{ inventoryId: string }>(() =>
    supabase.from('short_list').select('inventoryId').eq('tenantId', tenantId)
  )

  // A product counts as listed if ANY of its batches is on the shortlist.
  const listedGroupKeys = new Set<string>()
  for (const entry of existing) {
    const key = groupKeyByInventoryId.get(entry.inventoryId)
    if (key) listedGroupKeys.add(key)
  }

  const result: ShortlistUpdateResult = {
    checked: groups.size,
    added: 0,
    skipped: 0,
    details: [],
  }

  const newEntries: any[] = []
  const now = new Date().toISOString()

  for (const [, group] of groups) {
    const { qualifies, reason } = evaluateGroup(group)
    if (!qualifies) continue

    if (listedGroupKeys.has(group.key)) {
      result.skipped++
      continue
    }

    newEntries.push({
      id: generateUUID(),
      tenantId,
      inventoryId: group.representativeId,
      isSlowItem: false,
      reason,
      addedAt: now,
      addedBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    result.details.push(
      `${group.itemName || group.key} — stock: ${group.totalStock}, last restock: ${group.latestRestockQty}, reason: ${reason}`
    )
  }

  if (newEntries.length > 0) {
    const { error } = await supabase.from('short_list').insert(newEntries)
    if (error) throw error
    result.added = newEntries.length
  }

  return result
}

export interface ShortlistCleanupResult {
  checked: number
  removed: number
  removedIds: string[]
  details: string[]
}

/**
 * Remove shortlist entries that no longer belong:
 *  - the product was restocked and now holds more than 50% of its last restock
 *  - the entry points at an inventory row that no longer exists
 *  - duplicate entries for the same product (keep one)
 *
 * Out-of-stock products are always kept — they are the reason the list exists.
 */
export async function runShortlistCleanup(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ShortlistCleanupResult> {
  const { groups, groupKeyByInventoryId } = await loadProductGroups(supabase, tenantId)

  const entries = await fetchAll<{ id: string; inventoryId: string }>(() =>
    supabase.from('short_list').select('id, inventoryId').eq('tenantId', tenantId)
  )

  const result: ShortlistCleanupResult = {
    checked: entries.length,
    removed: 0,
    removedIds: [],
    details: [],
  }
  if (entries.length === 0) return result

  const toRemove: string[] = []
  const keptGroupKeys = new Set<string>()

  for (const entry of entries) {
    const key = groupKeyByInventoryId.get(entry.inventoryId)

    // Orphan — the inventory row is gone.
    if (!key) {
      toRemove.push(entry.id)
      result.details.push(`${entry.inventoryId} — inventory item no longer exists`)
      continue
    }

    const group = groups.get(key)!
    const { qualifies } = evaluateGroup(group)

    if (!qualifies) {
      toRemove.push(entry.id)
      result.details.push(
        `${group.itemName || key} — restocked, stock ${group.totalStock} is above half of last restock ${group.latestRestockQty}`
      )
      continue
    }

    // Still qualifies, but keep only one entry per product.
    if (keptGroupKeys.has(key)) {
      toRemove.push(entry.id)
      result.details.push(`${group.itemName || key} — duplicate entry for the same product`)
      continue
    }
    keptGroupKeys.add(key)
  }

  if (toRemove.length > 0) {
    const { error } = await supabase.from('short_list').delete().in('id', toRemove).eq('tenantId', tenantId)
    if (error) throw error
    result.removed = toRemove.length
    result.removedIds = toRemove
  }

  return result
}
