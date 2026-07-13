import { authStorage } from '@/lib/auth-storage'
import { supabase } from '@/lib/supabase'

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export const getLocalStorageData = () => {
  if (typeof window === 'undefined') {
    return { tenantId: 'default-tenant', userId: 'default-user' }
  }
  try {
    const tenant = authStorage.getTenant() || {}
    const user = authStorage.getUser() || {}
    return {
      tenantId: tenant.id || 'default-tenant',
      userId: user.id || 'default-user'
    }
  } catch {
    return { tenantId: 'default-tenant', userId: 'default-user' }
  }
}

export function formatResponse<T>(data: T, status = 200): any {
  return {
    data,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: {},
    config: {},
  }
}

export function matchPath(path: string, pattern: string): { matched: boolean; params: Record<string, string> } {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = path.split('/').filter(Boolean)
  const params: Record<string, string> = {}

  let pathIndex = 0
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i]

    if (part.startsWith('*')) {
      params[part.slice(1) || 'wildcard'] = pathParts.slice(pathIndex).join('/')
      return { matched: true, params }
    }

    if (pathIndex >= pathParts.length) {
      return { matched: false, params: {} }
    }

    if (part.startsWith(':')) {
      params[part.slice(1)] = pathParts[pathIndex]
      pathIndex++
      continue
    }

    if (part !== pathParts[pathIndex]) {
      return { matched: false, params: {} }
    }
    pathIndex++
  }

  if (pathIndex !== pathParts.length) {
    return { matched: false, params: {} }
  }

  return { matched: true, params }
}

export const sanitizeInventoryItem = (data: any) => ({
  tenantId: data.tenantId,
  variantId: data.variantId || null,
  itemName: data.itemName || null,
  quantity: typeof data.quantity === 'number' ? data.quantity : 0,
  lastRestockQty: typeof data.lastRestockQty === 'number' ? data.lastRestockQty : (typeof data.quantity === 'number' ? data.quantity : null),
  lastRestockDate: data.lastRestockDate || new Date().toISOString(),
  lastMovedDate: data.lastMovedDate || null,
  purchasePrice: typeof data.purchasePrice === 'number' ? data.purchasePrice : 0,
  retailPrice: typeof data.retailPrice === 'number' ? data.retailPrice : 0,
  maxDiscountRate: typeof data.maxDiscountRate === 'number' ? data.maxDiscountRate : (typeof data.maxDiscount === 'number' ? data.maxDiscount : 0),
  expiryDate: data.expiryDate || null,
  mfgDate: data.mfgDate || null,
  batchNo: data.batchNo || null,
  updatedAt: new Date().toISOString()
})

export const sanitizeExpense = (data: any) => ({
  tenantId: data.tenantId,
  employeeId: data.employeeId,
  categoryId: data.categoryId,
  amount: typeof data.amount === 'number' ? data.amount : 0,
  description: data.description || null,
  expenseDate: data.expenseDate || new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

export const sanitizeCashRegisterEntry = (data: any) => ({
  tenantId: data.tenantId,
  entryType: data.entryType,
  amount: typeof data.amount === 'number' ? data.amount : 0,
  note: data.note || null,
  referenceId: data.referenceId || null,
  referenceType: data.referenceType || null,
  entryDate: data.entryDate || new Date().toISOString(),
  createdById: data.createdById,
  updatedAt: new Date().toISOString()
})

export const sanitizeSale = (data: any) => ({
  tenantId: data.tenantId,
  employeeId: data.employeeId,
  receiptNumber: data.receiptNumber,
  saleTime: data.saleTime || new Date().toISOString(),
  totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
  totalProfit: typeof data.totalProfit === 'number' ? data.totalProfit : 0,
  customerName: data.customerName || null,
  customerPhone: data.customerPhone || null,
  customerId: data.customerId || null,
  saleType: data.saleType || 'POS',
  paymentMethod: data.paymentMethod || 'CASH',
  discountType: data.discountType || null,
  discountValue: typeof data.discountValue === 'number' ? data.discountValue : 0,
  amountPaid: typeof data.amountPaid === 'number' ? data.amountPaid : 0,
  dueAmount: typeof data.dueAmount === 'number' ? data.dueAmount : 0,
  updatedAt: new Date().toISOString()
})

export const sanitizeUpdate = (sanitizeFn: (d: any) => any, data: any) => {
  const sanitized = sanitizeFn(data)
  sanitized.updatedAt = new Date().toISOString()
  Object.keys(sanitized).forEach(key => {
    if (key !== 'updatedAt' && data[key] === undefined) {
      delete (sanitized as any)[key]
    }
  })
  return sanitized
}

// ---------------------------------------------------------------------------
// Shortlist helpers — the 50% rule is evaluated per-product (aggregated
// across ALL batches of the same variant), not per-batch.
// ---------------------------------------------------------------------------

/**
 * Fetch all inventory items belonging to the same product (matched by
 * variantId, or by itemName for ad-hoc items without a variant).
 * Returns total stock, the most recent lastRestockQty, and all inventory IDs.
 */
export async function getAggregatedStockForVariant(
  tenantId: string,
  variantId: string | null,
  itemName?: string | null
): Promise<{ totalStock: number; latestRestockQty: number; inventoryIds: string[] }> {
  let query = supabase
    .from('inventory_items')
    .select('id, quantity, lastRestockQty, lastRestockDate')
    .eq('tenantId', tenantId)

  if (variantId) {
    query = query.eq('variantId', variantId)
  } else if (itemName) {
    query = query.eq('itemName', itemName)
  } else {
    return { totalStock: 0, latestRestockQty: 0, inventoryIds: [] }
  }

  const { data, error } = await query
  if (error || !data || data.length === 0) {
    return { totalStock: 0, latestRestockQty: 0, inventoryIds: [] }
  }

  const totalStock = data.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
  // Use the lastRestockQty from the most recent restock across all batches
  const withRestock = data
    .filter((item: any) => item.lastRestockQty != null && item.lastRestockDate)
    .sort((a: any, b: any) => new Date(b.lastRestockDate).getTime() - new Date(a.lastRestockDate).getTime())
  const latestRestockQty = withRestock.length > 0 ? (withRestock[0].lastRestockQty || 0) : 0

  return { totalStock, latestRestockQty, inventoryIds: data.map((item: any) => item.id) }
}

/**
 * Remove ALL shortlist entries for every batch of the given inventory IDs.
 * Used when a product is restocked — any restock removes the product from
 * the shortlist regardless of exact stock level.
 */
export async function removeShortlistForInventoryIds(
  tenantId: string,
  inventoryIds: string[]
): Promise<void> {
  if (inventoryIds.length === 0) return
  await supabase
    .from('short_list')
    .delete()
    .in('inventoryId', inventoryIds)
    .eq('tenantId', tenantId)
}

/**
 * Evaluate the 50% rule for a product (across all batches) and update the
 * shortlist accordingly:
 * - If total stock <= 50% of latestRestockQty → add the sold batch to shortlist
 * - If total stock > 50% of latestRestockQty → remove all batches from shortlist
 *
 * Returns the inventory IDs that were added to the shortlist (if any).
 */
export async function evaluateShortlistForVariant(
  tenantId: string,
  variantId: string | null,
  itemName: string | null,
  soldInventoryId: string,
  userId: string
): Promise<void> {
  const { totalStock, latestRestockQty, inventoryIds } = await getAggregatedStockForVariant(tenantId, variantId, itemName)

  if (latestRestockQty <= 0) return // never had a restock — can't evaluate

  const threshold = latestRestockQty * 0.5

  if (totalStock > 0 && totalStock <= threshold) {
    // Below 50% — add the sold batch to shortlist if not already there
    const { data: existing } = await supabase
      .from('short_list')
      .select('inventoryId')
      .eq('inventoryId', soldInventoryId)
      .eq('tenantId', tenantId)

    if (!existing || existing.length === 0) {
      await supabase.from('short_list').insert({
        id: generateUUID(),
        tenantId,
        inventoryId: soldInventoryId,
        isSlowItem: false,
        reason: '50% rule',
        addedAt: new Date().toISOString(),
        addedBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  } else if (totalStock > threshold) {
    // Above 50% — remove all batches of this product from shortlist
    await removeShortlistForInventoryIds(tenantId, inventoryIds)
  }
}
