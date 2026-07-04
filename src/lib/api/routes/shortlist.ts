import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID } from '../utils'
import { RouteHandler } from '../types'

const getShortlist: RouteHandler = async ({ tenantId, query }) => {
  const sortBy = query.get('sortBy') || 'addedAt'
  const sortOrder = query.get('sortOrder') || 'asc'
  const filterSlow = query.get('filterSlow')
  const search = query.get('search') || ''
  const limit = Number(query.get('limit') || '50')
  const offset = Number(query.get('offset') || '0')

  const { data, error } = await supabase
    .from('short_list')
    .select('*, inventory:inventory_items(*, variant:product_variants(*, product:products(*)))')
    .eq('tenantId', tenantId)
  if (error) throw error

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const { data: sales } = await supabase
    .from('sales')
    .select('id, items:sale_items(inventoryId, quantity)')
    .eq('tenantId', tenantId)
    .gte('saleTime', thirtyDaysAgo.toISOString())

  const salesByInventory: Record<string, number> = {}
  for (const sale of (sales || [])) {
    for (const saleItem of (sale.items || [])) {
      if (saleItem.inventoryId) {
        salesByInventory[saleItem.inventoryId] = (salesByInventory[saleItem.inventoryId] || 0) + (saleItem.quantity || 0)
      }
    }
  }

  let items = data || []
  if (filterSlow !== null) {
    const isSlow = filterSlow === 'true'
    items = items.filter((item: any) => item.isSlowItem === isSlow)
  }

  if (search) {
    const searchLower = search.toLowerCase()
    items = items.filter((item: any) => {
      const inventory = item.inventory || {}
      const variant = inventory.variant || {}
      const product = variant.product || {}
      return (
        (inventory.itemName || '').toLowerCase().includes(searchLower) ||
        (variant.sku || '').toLowerCase().includes(searchLower) ||
        (product.name || '').toLowerCase().includes(searchLower)
      )
    })
  }

  const sortAsc = sortOrder === 'asc'
  items.sort((a: any, b: any) => {
    const invA = a.inventory || {}
    const invB = b.inventory || {}
    let comparison = 0
    if (sortBy === 'quantity') {
      comparison = (invA.quantity || 0) - (invB.quantity || 0)
    } else if (sortBy === 'name') {
      const nameA = invA.itemName || ''
      const nameB = invB.itemName || ''
      comparison = nameA.localeCompare(nameB)
    } else {
      comparison = new Date(a.addedAt || 0).getTime() - new Date(b.addedAt || 0).getTime()
    }
    return sortAsc ? comparison : -comparison
  })

  const total = items.length
  const paginated = items.slice(offset, offset + limit)

  const transformed = paginated.map((item: any) => ({
    ...item,
    sales30Days: salesByInventory[item.inventoryId] || 0,
    inventory: item.inventory ? {
      ...item.inventory,
      variant: item.inventory.variant ? {
        ...item.inventory.variant,
        product: item.inventory.variant.product ? {
          productName: item.inventory.variant.product.name
        } : null
      } : null
    } : null
  }))

  return formatResponse({ data: transformed, total })
}

async function toggleShortlistItem(tenantId: string, userId: string, inventoryId: string) {
  const { data: existing } = await supabase
    .from('short_list')
    .select('id')
    .eq('inventoryId', inventoryId)
    .eq('tenantId', tenantId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('short_list')
      .delete()
      .eq('id', existing.id)
    if (error) throw error
    return formatResponse({ success: true, removed: true })
  }

  const { data: added, error } = await supabase
    .from('short_list')
    .insert({
      id: generateUUID(),
      tenantId,
      inventoryId,
      isSlowItem: false,
      addedAt: new Date().toISOString(),
      addedBy: userId,
      reason: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select()
    .single()
  if (error) throw error
  return formatResponse({ success: true, removed: false, data: added })
}

const toggleShortlist: RouteHandler = async ({ tenantId, userId, params }) => {
  const inventoryId = params.id
  if (!inventoryId) throw new Error('Missing inventoryId')
  return toggleShortlistItem(tenantId, userId, inventoryId)
}

const addShortlist: RouteHandler = async ({ tenantId, userId, params }) => {
  const inventoryId = params.id
  if (!inventoryId) throw new Error('Missing inventoryId')
  return toggleShortlistItem(tenantId, userId, inventoryId)
}

const deleteShortlist: RouteHandler = async ({ tenantId, params }) => {
  const inventoryId = params.id
  const { error } = await supabase
    .from('short_list')
    .delete()
    .eq('inventoryId', inventoryId)
    .eq('tenantId', tenantId)
  if (error) throw error
  return formatResponse({ success: true })
}

const getShortlistStats: RouteHandler = async ({ tenantId }) => {
  const { data: allItems, error } = await supabase
    .from('short_list')
    .select('id, inventoryId, isSlowItem, reason')
    .eq('tenantId', tenantId)
  if (error) throw error

  const items = allItems || []
  const total = items.length
  const slowItems = items.filter((item) => item.isSlowItem).length
  const manualItems = items.filter((item) => item.reason === 'manual').length
  const autoRuleItems = items.filter((item) => item.reason === '50% rule').length

  const inventoryIds = items.map((item) => item.inventoryId).filter(Boolean)
  let totalQuantity = 0
  if (inventoryIds.length > 0) {
    const { data: inventoryItems } = await supabase
      .from('inventory_items')
      .select('id, quantity')
      .in('id', inventoryIds)
    totalQuantity = (inventoryItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0)
  }

  return formatResponse({ total, slowItems, manualItems, autoRuleItems, totalQuantity })
}

const batchAddShortlist: RouteHandler = async ({ tenantId, userId, requestData }) => {
  const inventoryIds = requestData?.inventoryIds || []
  if (!Array.isArray(inventoryIds) || inventoryIds.length === 0) {
    throw new Error('inventoryIds array is required')
  }

  const { data: existing } = await supabase
    .from('short_list')
    .select('inventoryId')
    .eq('tenantId', tenantId)
    .in('inventoryId', inventoryIds)

  const existingIds = new Set((existing || []).map((item) => item.inventoryId))
  const newIds = inventoryIds.filter((id: string) => !existingIds.has(id))

  if (newIds.length === 0) return formatResponse({ added: 0, skipped: inventoryIds.length })

  const rows = newIds.map((inventoryId: string) => ({
    id: generateUUID(),
    tenantId,
    inventoryId,
    isSlowItem: false,
    reason: 'manual',
    addedBy: userId,
    addedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }))

  const { data, error } = await supabase.from('short_list').insert(rows).select()
  if (error) throw error
  return formatResponse({ added: data?.length || 0, skipped: existingIds.size, data })
}

export function registerShortlistRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/shortlist', getShortlist)
  router.register('GET', '/shortlist/stats', getShortlistStats)
  router.register('POST', '/shortlist/:id/toggle', toggleShortlist)
  router.register('POST', '/shortlist/add/:id', addShortlist)
  router.register('POST', '/shortlist/batch-add', batchAddShortlist)
  router.register('DELETE', '/shortlist/:id', deleteShortlist)
}
