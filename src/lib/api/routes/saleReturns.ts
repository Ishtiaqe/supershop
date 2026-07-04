import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID } from '../utils'
import { RouteHandler } from '../types'

const getSaleReturns: RouteHandler = async ({ tenantId, query }) => {
  const limit = Number(query.get('limit') || '50')
  const offset = Number(query.get('offset') || '0')

  const { data, error } = await supabase
    .from('sale_returns')
    .select('*, items:sale_return_items(*, inventory:inventory_items(*), saleItem:sale_items(*)), sale:sales(*), createdBy:users(*)')
    .eq('tenantId', tenantId)
    .order('returnDate', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return formatResponse(data || [])
}

const getSaleReturnById: RouteHandler = async ({ tenantId, params }) => {
  const { data, error } = await supabase
    .from('sale_returns')
    .select('*, items:sale_return_items(*, inventory:inventory_items(*), saleItem:sale_items(*)), sale:sales(*), createdBy:users(*)')
    .eq('id', params.id)
    .eq('tenantId', tenantId)
    .single()

  if (error) throw error
  return formatResponse(data)
}

const createSaleReturn: RouteHandler = async ({ tenantId, userId, requestData }) => {
  const { saleId, items, reason } = requestData

  if (!saleId || !items || !Array.isArray(items) || items.length === 0) {
    throw new Error('saleId and items are required')
  }

  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .select('id, receiptNumber, totalAmount, amountPaid, dueAmount')
    .eq('id', saleId)
    .eq('tenantId', tenantId)
    .single()

  if (saleErr) throw new Error('Sale not found')

  let totalRefund = 0
  for (const item of items) {
    const { data: saleItem } = await supabase
      .from('sale_items')
      .select('id, quantity, unitPrice, discount, inventoryId')
      .eq('id', item.saleItemId)
      .single()

    if (!saleItem) throw new Error(`Sale item ${item.saleItemId} not found`)
    if (item.quantity > saleItem.quantity) {
      throw new Error(`Return quantity exceeds sold quantity for item ${item.saleItemId}`)
    }

    const effectivePrice = saleItem.unitPrice * (1 - (saleItem.discount || 0) / 100)
    totalRefund += effectivePrice * item.quantity
  }

  if (requestData.totalRefund !== undefined) {
    totalRefund = requestData.totalRefund
  }

  const returnId = generateUUID()
  const { data: saleReturn, error: returnErr } = await supabase
    .from('sale_returns')
    .insert({
      id: returnId,
      tenantId,
      saleId,
      returnDate: new Date().toISOString(),
      totalRefund,
      reason: reason || null,
      createdById: userId,
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single()

  if (returnErr) throw returnErr

  const returnItems = items.map((item: any) => {
    const itemId = generateUUID()
    return {
      id: itemId,
      saleReturnId: returnId,
      saleItemId: item.saleItemId,
      inventoryId: item.inventoryId,
      quantity: item.quantity,
      refundAmount: item.refundAmount || 0,
    }
  })

  const { error: itemsErr } = await supabase.from('sale_return_items').insert(returnItems)
  if (itemsErr) throw itemsErr

  for (const item of items) {
    const { data: invItem } = await supabase
      .from('inventory_items')
      .select('quantity')
      .eq('id', item.inventoryId)
      .single()

    if (invItem) {
      const newQty = invItem.quantity + item.quantity
      await supabase
        .from('inventory_items')
        .update({ quantity: newQty, updatedAt: new Date().toISOString() })
        .eq('id', item.inventoryId)

      await supabase.from('stock_movements').insert({
        id: generateUUID(),
        tenantId,
        inventoryId: item.inventoryId,
        movementType: 'RETURN',
        quantityChange: item.quantity,
        reason: `Sale return #${returnId.slice(0, 8)}`,
        referenceId: returnId,
      })
    }
  }

  await supabase.from('cash_box_entries').insert({
    id: generateUUID(),
    tenantId,
    entryType: 'MANUAL_OUT',
    amount: totalRefund,
    note: `Sale return for #${sale.receiptNumber}`,
    referenceId: returnId,
    referenceType: 'SALE_RETURN',
    createdById: userId,
    entryDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  return formatResponse(saleReturn)
}

export function registerSaleReturnsRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/sale-returns', getSaleReturns)
  router.register('GET', '/sale-returns/:id', getSaleReturnById)
  router.register('POST', '/sale-returns', createSaleReturn)
}
