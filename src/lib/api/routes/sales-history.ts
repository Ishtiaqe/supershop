import { supabase } from '@/lib/supabase'
import { formatResponse } from '../utils'
import { RouteHandler } from '../types'
import { createSale } from '../services/salesService'

const getSales: RouteHandler = async ({ tenantId, query }) => {
  const limit = Number(query.get('limit') || '50')
  const offset = Number(query.get('offset') || '0')
  const { data, error } = await supabase
    .from('sales')
    .select('*, items:sale_items(*, inventory:inventory_items(*)), employee:users(*)')
    .eq('tenantId', tenantId)
    .order('saleTime', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return formatResponse(data)
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

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  cutoffDate.setHours(0, 0, 0, 0)
  const cutoffString = cutoffDate.toISOString()

  const { data: sales, error: salesErr } = await supabase
    .from('sales')
    .select('totalAmount, totalProfit, saleTime')
    .eq('tenantId', tenantId)
    .gte('saleTime', cutoffString)
  if (salesErr) throw salesErr

  const { data: inventory, error: invErr } = await supabase
    .from('inventory_items')
    .select('purchasePrice, retailPrice, quantity')
    .eq('tenantId', tenantId)
  if (invErr) throw invErr

  let ordersCount = 0
  let totalRevenue = 0
  let totalProfit = 0
  if (sales) {
    ordersCount = sales.length
    sales.forEach(s => {
      totalRevenue += s.totalAmount || 0
      totalProfit += s.totalProfit || 0
    })
  }

  let totalAssetValue = 0
  let totalInventorySellingValue = 0
  if (inventory) {
    inventory.forEach(item => {
      totalAssetValue += (item.purchasePrice || 0) * (item.quantity || 0)
      totalInventorySellingValue += (item.retailPrice || 0) * (item.quantity || 0)
    })
  }

  return formatResponse({
    ordersCount,
    totalRevenue,
    totalProfit,
    totalAssetValue,
    totalInventorySellingValue
  })
}

const getSalesAnalyticsGraphs: RouteHandler = async ({ tenantId, query }) => {
  const period = query.get('period') || '30d'
  let days = 30
  if (period === '7d') days = 7
  else if (period === '90d') days = 90

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  cutoffDate.setHours(0, 0, 0, 0)
  const cutoffString = cutoffDate.toISOString()

  const { data: sales, error: salesErr } = await supabase
    .from('sales')
    .select('totalAmount, totalProfit, saleTime')
    .eq('tenantId', tenantId)
    .gte('saleTime', cutoffString)
  if (salesErr) throw salesErr

  const graphMap = new Map<string, { date: string; sales: number; profit: number }>()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    graphMap.set(dateStr, { date: dateStr, sales: 0, profit: 0 })
  }

  if (sales) {
    sales.forEach(s => {
      if (s.saleTime) {
        const dateStr = s.saleTime.split('T')[0]
        const existing = graphMap.get(dateStr)
        if (existing) {
          existing.sales += s.totalAmount || 0
          existing.profit += s.totalProfit || 0
        }
      }
    })
  }

  const graphData = Array.from(graphMap.values())
  return formatResponse(graphData)
}

const createSaleHandler: RouteHandler = async ({ tenantId, userId, requestData }) => {
  return createSale(requestData, tenantId, userId)
}

export function registerSalesRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/sales-history/analytics/summary', getSalesAnalyticsSummary)
  router.register('GET', '/sales-history/analytics/graphs', getSalesAnalyticsGraphs)
  router.register('GET', '/sales-history', getSales)
  router.register('GET', '/sales-history/:id', getSaleById)
  router.register('POST', '/sales-history', createSaleHandler)
}
