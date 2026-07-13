import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID, evaluateShortlistForVariant } from '../utils'
import { RouteHandler } from '../types'
import { createSale } from '../services/salesService'

const getSales: RouteHandler = async ({ tenantId, query }) => {
  const limit = Number(query.get('limit') || '50')
  const offset = Number(query.get('offset') || '0')
  const since = query.get('since')
  const search = query.get('search') || ''
  const startDate = query.get('startDate')
  const endDate = query.get('endDate')
  const paymentMethod = query.get('paymentMethod')

  let dbQuery = supabase
    .from('sales')
    .select('*, items:sale_items(*, inventory:inventory_items(*)), employee:users(*)', { count: 'exact' })
    .eq('tenantId', tenantId)

  if (since) {
    dbQuery = dbQuery.gte('updatedAt', since)
  }
  if (search) {
    dbQuery = dbQuery.or(`receiptNumber.ilike.%${search}%,customerName.ilike.%${search}%,customerPhone.ilike.%${search}%`)
  }
  if (startDate) {
    dbQuery = dbQuery.gte('saleTime', new Date(startDate + 'T00:00:00').toISOString())
  }
  if (endDate) {
    dbQuery = dbQuery.lte('saleTime', new Date(endDate + 'T23:59:59').toISOString())
  }
  if (paymentMethod) {
    if (paymentMethod === 'CREDIT') {
      // "Credit (Due)" filter: show all sales with an outstanding balance,
      // regardless of the actual payment method used (Cash, Nagad, bKash, etc.)
      dbQuery = dbQuery.gt('dueAmount', 0)
    } else {
      dbQuery = dbQuery.eq('paymentMethod', paymentMethod)
    }
  }

  const { data, error, count } = await dbQuery
    .order('saleTime', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return formatResponse({ data, total: count || 0, page: Math.floor(offset / limit) + 1, limit })
}

const getSaleById: RouteHandler = async ({ tenantId, params }) => {
  const saleId = params.id
  const { data: sale, error } = await supabase
    .from('sales')
    .select('*, items:sale_items(*, inventory:inventory_items(*, variant:product_variants(*, product:products(*)))), employee:users(*)')
    .eq('id', saleId)
    .eq('tenantId', tenantId)
    .single()
  if (error) throw error
  return formatResponse(sale)
}

const getSalesAnalyticsSummary: RouteHandler = async ({ tenantId, query }) => {
  const period = query.get('period') || '30d'
  let days = 30
  if (period === '7d') days = 7
  else if (period === '90d') days = 90

  const [salesResult, inventoryResult] = await Promise.all([
    supabase.rpc('get_sales_analytics_summary', { p_tenant_id: tenantId, p_days: days }),
    supabase.rpc('get_inventory_summary', { p_tenant_id: tenantId })
  ])

  if (salesResult.error) throw salesResult.error
  if (inventoryResult.error) throw inventoryResult.error

  const row = salesResult.data?.[0] || { orders_count: 0, total_revenue: 0, total_profit: 0, total_asset_value: 0, total_inventory_selling_value: 0 }
  const inventoryRow = inventoryResult.data?.[0] || { total_inventory_sku_count: 0, total_inventory_items: 0 }
  return formatResponse({
    ordersCount: Number(row.orders_count) || 0,
    totalRevenue: Number(row.total_revenue) || 0,
    totalProfit: Number(row.total_profit) || 0,
    totalAssetValue: Number(row.total_asset_value) || 0,
    totalInventorySellingValue: Number(row.total_inventory_selling_value) || 0,
    totalInventorySkuCount: Number(inventoryRow.total_inventory_sku_count) || 0
  })
}

const getSalesAnalyticsGraphs: RouteHandler = async ({ tenantId, query }) => {
  const period = query.get('period') || '30d'
  let days = 30
  if (period === '7d') days = 7
  else if (period === '90d') days = 90

  const { data, error } = await supabase
    .rpc('get_sales_analytics_graphs', { p_tenant_id: tenantId, p_days: days })
  if (error) throw error

  // Fill in missing dates with zeros to maintain continuous graph
  const graphMap = new Map<string, { date: string; sales: number; profit: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    graphMap.set(dateStr, { date: dateStr, sales: 0, profit: 0 })
  }

  if (data) {
    for (const row of data) {
      const dateStr = row.sale_date ? new Date(row.sale_date).toISOString().split('T')[0] : null
      if (dateStr) {
        const existing = graphMap.get(dateStr)
        if (existing) {
          existing.sales = Number(row.sales) || 0
          existing.profit = Number(row.profit) || 0
        }
      }
    }
  }

  const graphData = Array.from(graphMap.values())
  return formatResponse(graphData)
}

const createSaleHandler: RouteHandler = async ({ tenantId, userId, requestData }) => {
  return createSale(requestData, tenantId, userId)
}

const getDashboardExtraMetrics: RouteHandler = async ({ tenantId }) => {
  const { data, error } = await supabase
    .rpc('get_dashboard_extra_metrics', { p_tenant_id: tenantId })
  if (error) throw error
  return formatResponse(data)
}

const getTopProducts: RouteHandler = async ({ tenantId, query }) => {
  const period = query.get('period') || '30d'
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const { data, error } = await supabase
    .rpc('get_top_products', { p_tenant_id: tenantId, p_days: days, p_limit: 100 })
  if (error) throw error
  return formatResponse(data)
}

const voidSale: RouteHandler = async ({ tenantId, userId, params }) => {
  const saleId = params.id

  // 1. Fetch the sale with its items
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .select('id, receiptNumber, totalAmount, amountPaid, dueAmount, paymentMethod')
    .eq('id', saleId)
    .eq('tenantId', tenantId)
    .single()
  if (saleErr) throw new Error('Sale not found')

  // 2. Check if this sale already has a return (prevent double-voiding)
  const { data: existingReturn } = await supabase
    .from('sale_returns')
    .select('id')
    .eq('saleId', saleId)
    .eq('tenantId', tenantId)
    .limit(1)
  if (existingReturn && existingReturn.length > 0) {
    throw new Error('This sale has already been refunded/voided')
  }

  // 3. Fetch all sale items
  const { data: saleItems, error: itemsErr } = await supabase
    .from('sale_items')
    .select('id, quantity, unitPrice, discount, inventoryId')
    .eq('saleId', saleId)
  if (itemsErr) throw itemsErr
  if (!saleItems || saleItems.length === 0) {
    throw new Error('Sale has no items to return')
  }

  // 4. Create the sale return record
  const returnId = generateUUID()
  const totalRefund = sale.totalAmount
  const { error: returnErr } = await supabase
    .from('sale_returns')
    .insert({
      id: returnId,
      tenantId,
      saleId,
      returnDate: new Date().toISOString(),
      totalRefund,
      reason: 'Voided sale (full refund)',
      createdById: userId,
      updatedAt: new Date().toISOString(),
    })
  if (returnErr) throw returnErr

  // 5. Create return items + restore inventory stock
  const returnItems = saleItems.map((item: any) => ({
    id: generateUUID(),
    saleReturnId: returnId,
    saleItemId: item.id,
    inventoryId: item.inventoryId,
    quantity: item.quantity,
    refundAmount: item.unitPrice * (1 - (item.discount || 0) / 100) * item.quantity,
  }))
  const { error: riErr } = await supabase.from('sale_return_items').insert(returnItems)
  if (riErr) throw riErr

  // 6. Restore stock for each item + log stock movements + evaluate shortlist
  for (const item of saleItems) {
    const { data: invItem } = await supabase
      .from('inventory_items')
      .select('quantity, itemName, variantId')
      .eq('id', item.inventoryId)
      .single()

    if (invItem) {
      const newQty = invItem.quantity + item.quantity
      await supabase
        .from('inventory_items')
        .update({ quantity: newQty, lastMovedDate: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .eq('id', item.inventoryId)

      await supabase.from('stock_movements').insert({
        id: generateUUID(),
        tenantId,
        inventoryId: item.inventoryId,
        movementType: 'RETURN',
        quantityChange: item.quantity,
        reason: `Void sale #${sale.receiptNumber}`,
        referenceId: returnId,
      })

      // Evaluate shortlist — stock went up, may need to remove from shortlist
      await evaluateShortlistForVariant(
        tenantId,
        invItem.variantId || null,
        invItem.itemName || null,
        item.inventoryId,
        userId
      )
    }
  }

  // 7. Record cash box refund entry
  const refundAmount = sale.amountPaid || 0
  if (refundAmount > 0) {
    await supabase.from('cash_box_entries').insert({
      id: generateUUID(),
      tenantId,
      entryType: 'MANUAL_OUT',
      amount: refundAmount,
      note: `Void/refund for sale #${sale.receiptNumber}`,
      referenceId: returnId,
      referenceType: 'SALE_RETURN',
      createdById: userId,
      entryDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  // 8. Reset the sale's due amount to 0 (the sale record is NOT deleted —
  //    it stays as historical data with an associated return)
  await supabase
    .from('sales')
    .update({
      amountPaid: 0,
      dueAmount: 0,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', saleId)

  return formatResponse({ success: true, saleReturnId: returnId, totalRefund })
}

export function registerSalesRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/sales-history/analytics/summary', getSalesAnalyticsSummary)
  router.register('GET', '/sales-history/analytics/graphs', getSalesAnalyticsGraphs)
  router.register('GET', '/dashboard/extra-metrics', getDashboardExtraMetrics)
  router.register('GET', '/dashboard/top-products', getTopProducts)
  router.register('GET', '/sales-history', getSales)
  router.register('GET', '/sales-history/:id', getSaleById)
  router.register('POST', '/sales-history', createSaleHandler)
  router.register('POST', '/sales-history/:id/void', voidSale)
}
