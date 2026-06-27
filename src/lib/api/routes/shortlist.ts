import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID } from '../utils'
import { RouteHandler } from '../types'

const getShortlist: RouteHandler = async ({ tenantId, query }) => {
  const sortBy = query.get('sortBy') || 'addedAt'
  const sortOrder = query.get('sortOrder') || 'asc'
  const filterSlow = query.get('filterSlow')

  const { data, error } = await supabase
    .from('short_list')
    .select('*, inventory:inventory_items(*, variant:product_variants(*, product:products(*)))')
    .eq('tenantId', tenantId)
  if (error) throw error

  let items = data || []
  if (filterSlow !== null) {
    const isSlow = filterSlow === 'true'
    items = items.filter((item: any) => item.isSlowItem === isSlow)
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

  const transformed = items.map((item: any) => ({
    ...item,
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

  return formatResponse({ data: transformed })
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

export function registerShortlistRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/shortlist', getShortlist)
  router.register('POST', '/shortlist/:id/toggle', toggleShortlist)
  router.register('POST', '/shortlist/add/:id', addShortlist)
  router.register('DELETE', '/shortlist/:id', deleteShortlist)
}
