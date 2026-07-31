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

interface ProductGroup {
  variantId: string | null
  itemName: string | null
  soldInventoryIds: Set<string>
  latestSaleTime: string
  latestUserId: string | null
}

export interface ShortlistScanResult {
  checked: number
  added: number
  skipped: number
  details: string[]
}

/**
 * Scans products sold in the last 30 days and adds their representative sold
 * batch to the shortlist when the product is out of stock OR its total stock
 * is <= 50% of the latest restock quantity. Products already on the shortlist
 * are skipped.
 */
export async function runShortlistBackfill(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<ShortlistScanResult> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const { data: recentSales, error: salesErr } = await supabase
    .from('sales')
    .select('id, saleTime, employeeId, items:sale_items(inventoryId, inventory:inventory_items(id, variantId, itemName))')
    .eq('tenantId', tenantId)
    .gte('saleTime', thirtyDaysAgo.toISOString())
  if (salesErr) throw salesErr

  const productGroups = new Map<string, ProductGroup>()

  for (const sale of recentSales || []) {
    for (const saleItem of sale.items || []) {
      const inv = saleItem.inventory as any
      if (!inv) continue

      const key = inv.variantId || inv.itemName || inv.id
      const existing = productGroups.get(key)

      if (existing) {
        existing.soldInventoryIds.add(inv.id)
        if (sale.saleTime > existing.latestSaleTime) {
          existing.latestSaleTime = sale.saleTime
          existing.latestUserId = sale.employeeId
        }
      } else {
        productGroups.set(key, {
          variantId: inv.variantId || null,
          itemName: inv.itemName || null,
          soldInventoryIds: new Set([inv.id]),
          latestSaleTime: sale.saleTime,
          latestUserId: sale.employeeId,
        })
      }
    }
  }

  const toAdd: { inventoryId: string; reason: string }[] = []

  for (const [, group] of productGroups) {
    let query = supabase
      .from('inventory_items')
      .select('id, quantity, lastRestockQty, lastRestockDate')
      .eq('tenantId', tenantId)

    if (group.variantId) {
      query = query.eq('variantId', group.variantId)
    } else if (group.itemName) {
      query = query.eq('itemName', group.itemName)
    } else {
      continue
    }

    const { data: inventoryItems, error: invErr } = await query
    if (invErr) throw invErr
    if (!inventoryItems || inventoryItems.length === 0) continue

    const totalStock = inventoryItems.reduce((sum, item) => sum + (item.quantity || 0), 0)

    const withRestock = inventoryItems
      .filter((item: any) => item.lastRestockQty != null && item.lastRestockDate)
      .sort((a: any, b: any) => new Date(b.lastRestockDate).getTime() - new Date(a.lastRestockDate).getTime())

    const latestRestockQty = withRestock.length > 0 ? (withRestock[0].lastRestockQty || 0) : 0
    const threshold = latestRestockQty * 0.5

    let shouldAdd = false
    let reason = ''

    if (totalStock <= 0) {
      shouldAdd = true
      reason = 'out of stock'
    } else if (latestRestockQty > 0 && totalStock <= threshold) {
      shouldAdd = true
      reason = '50% rule'
    }

    if (!shouldAdd) continue

    const representativeId = Array.from(group.soldInventoryIds)[0]
    toAdd.push({ inventoryId: representativeId, reason })
  }

  const result: ShortlistScanResult = {
    checked: productGroups.size,
    added: 0,
    skipped: 0,
    details: [],
  }

  if (toAdd.length === 0) {
    return result
  }

  const { data: existingEntries, error: existingErr } = await supabase
    .from('short_list')
    .select('inventoryId')
    .eq('tenantId', tenantId)
    .in(
      'inventoryId',
      toAdd.map((item) => item.inventoryId)
    )
  if (existingErr) throw existingErr

  const existingIds = new Set((existingEntries || []).map((item: any) => item.inventoryId))

  const newEntries = toAdd
    .filter((item) => !existingIds.has(item.inventoryId))
    .map((item) => ({
      id: generateUUID(),
      tenantId,
      inventoryId: item.inventoryId,
      isSlowItem: false,
      reason: item.reason,
      addedAt: new Date().toISOString(),
      addedBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

  result.skipped = toAdd.length - newEntries.length

  if (newEntries.length > 0) {
    const { data: inserted, error: insertErr } = await supabase.from('short_list').insert(newEntries).select()
    if (insertErr) throw insertErr

    for (const entry of inserted || []) {
      const { data: inv } = await supabase
        .from('inventory_items')
        .select('itemName, quantity')
        .eq('id', entry.inventoryId)
        .single()
      const label = inv?.itemName || entry.inventoryId
      const detail = `${label} — qty: ${inv?.quantity ?? 'N/A'}, reason: ${entry.reason}`
      result.details.push(detail)
    }

    result.added = newEntries.length
  }

  return result
}
