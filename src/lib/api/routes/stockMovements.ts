import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID } from '../utils'
import { RouteHandler } from '../types'

const getStockMovements: RouteHandler = async ({ tenantId, query }) => {
  const inventoryId = query.get('inventoryId') || ''
  const movementType = query.get('movementType') || ''
  const limit = Number(query.get('limit') || '100')
  const offset = Number(query.get('offset') || '0')

  let dbQuery = supabase
    .from('stock_movements')
    .select('*, inventory:inventory_items(id, itemName, batchNo)')
    .eq('tenantId', tenantId)

  if (inventoryId) {
    dbQuery = dbQuery.eq('inventoryId', inventoryId)
  }
  if (movementType) {
    dbQuery = dbQuery.eq('movementType', movementType)
  }

  const { data, error } = await dbQuery
    .order('createdAt', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return formatResponse(data || [])
}

const createStockAdjustment: RouteHandler = async ({ tenantId, userId, requestData }) => {
  const { inventoryId, quantityChange, reason } = requestData

  if (!inventoryId || typeof quantityChange !== 'number') {
    throw new Error('inventoryId and quantityChange are required')
  }

  const { data: invItem, error: invErr } = await supabase
    .from('inventory_items')
    .select('quantity, itemName')
    .eq('id', inventoryId)
    .eq('tenantId', tenantId)
    .single()

  if (invErr) throw new Error('Inventory item not found')

  const newQty = Math.max(0, invItem.quantity + quantityChange)
  const { error: updateErr } = await supabase
    .from('inventory_items')
    .update({ quantity: newQty, updatedAt: new Date().toISOString() })
    .eq('id', inventoryId)

  if (updateErr) throw updateErr

  const { data: movement, error: moveErr } = await supabase
    .from('stock_movements')
    .insert({
      id: generateUUID(),
      tenantId,
      inventoryId,
      movementType: 'ADJUSTMENT',
      quantityChange,
      reason: reason || `Manual adjustment by user`,
      referenceId: null,
    })
    .select()
    .single()

  if (moveErr) throw moveErr
  return formatResponse(movement)
}

export function registerStockMovementsRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/stock-movements', getStockMovements)
  router.register('POST', '/stock-movements/adjustment', createStockAdjustment)
}
