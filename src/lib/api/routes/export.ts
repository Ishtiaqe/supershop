import { supabase } from '@/lib/supabase'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatResponse } from '../utils'
import { RouteHandler } from '../types'
import { formatDate } from '@/lib/ui-helpers'

const generateShortListPdf = async (tenantId: string, query: URLSearchParams) => {
  const sortBy = query.get('sortBy') || 'addedAt'
  const sortOrder = query.get('sortOrder') || 'asc'
  const filterSlow = query.get('filterSlow')
  const search = query.get('search') || ''

  const { data: items } = await supabase
    .from('short_list')
    .select('*, inventory:inventory_items(*, variant:product_variants(*, product:products(*)))')
    .eq('tenantId', tenantId)

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

  let filtered = items || []
  if (filterSlow !== null) {
    const isSlow = filterSlow === 'true'
    filtered = filtered.filter((item: any) => item.isSlowItem === isSlow)
  }

  if (search) {
    const searchLower = search.toLowerCase()
    filtered = filtered.filter((item: any) => {
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
  filtered.sort((a: any, b: any) => {
    const invA = a.inventory || {}
    const invB = b.inventory || {}
    let comparison = 0
    if (sortBy === 'quantity') {
      comparison = (invA.quantity || 0) - (invB.quantity || 0)
    } else if (sortBy === 'name') {
      const nameA = invA.itemName || ''
      const nameB = invB.itemName || ''
      comparison = nameA.localeCompare(nameB)
    } else if (sortBy === 'sales30Days') {
      comparison = (salesByInventory[b.inventoryId] || 0) - (salesByInventory[a.inventoryId] || 0)
    } else {
      comparison = new Date(a.addedAt || 0).getTime() - new Date(b.addedAt || 0).getTime()
    }
    return sortAsc ? comparison : -comparison
  })

  const limited = filtered.slice(0, 50)

  const rows = limited.map((item: any) => [
    item.inventory?.itemName || item.inventory?.variant?.product?.name || 'N/A',
    String(item.inventory?.quantity || 0),
    String(salesByInventory[item.inventoryId] || 0),
    String(item.inventory?.purchasePrice?.toFixed(2) || 'N/A'),
    item.addedAt ? formatDate(item.addedAt) : '—'
  ])

  const doc = new jsPDF()
  doc.text('SHORT LIST REPORT', 14, 15)
  doc.text(`Generated on: ${formatDate(new Date())}`, 14, 23)
  autoTable(doc, {
    head: [['Item Name', 'Current Qty', '30 day sales', 'Purchase Price', 'Added Date']],
    body: rows,
    startY: 30
  })
  return doc.output('blob')
}

const generateInventoryPdf = async (tenantId: string) => {
  const { data: inventoryItems } = await supabase
    .from('inventory_items')
    .select('*, variant:product_variants(*, product:products(*))')
    .eq('tenantId', tenantId)

  const rows = (inventoryItems || []).map((item: any) => [
    item.itemName || item.variant?.product?.name || 'N/A',
    String(item.quantity || 0),
    String(item.purchasePrice?.toFixed(2) || '0.00'),
    String(item.retailPrice?.toFixed(2) || '0.00')
  ])

  const doc = new jsPDF()
  doc.text('INVENTORY REPORT', 14, 15)
  doc.text(`Generated on: ${formatDate(new Date())}`, 14, 23)
  autoTable(doc, {
    head: [['Item Name', 'Qty', 'Cost Price', 'Retail Price']],
    body: rows,
    startY: 30
  })
  return doc.output('blob')
}

const generateAnalyticsPdf = async (tenantId: string) => {
  const { data: items } = await supabase
    .from('short_list')
    .select('reason, isSlowItem')
    .eq('tenantId', tenantId)

  const reasons: Record<string, number> = {}
  let slowItems = 0
  for (const item of (items || [])) {
    const key = item.reason || 'manual'
    reasons[key] = (reasons[key] || 0) + 1
    if (item.isSlowItem) slowItems++
  }

  const rows = Object.entries(reasons).map(([reason, count]) => [reason, String(count)])

  const doc = new jsPDF()
  doc.text('SHORT LIST ANALYTICS', 14, 15)
  doc.text(`Generated on: ${formatDate(new Date())}`, 14, 23)
  doc.text(`Total Items: ${(items || []).length}`, 14, 33)
  doc.text(`Slow Items: ${slowItems}`, 14, 41)
  autoTable(doc, {
    head: [['Reason', 'Count']],
    body: rows,
    startY: 50
  })
  return doc.output('blob')
}

const exportPdf: RouteHandler = async ({ tenantId, params, query }) => {
  const type = params.type
  let blob: Blob
  if (type === 'shortlist') {
    blob = await generateShortListPdf(tenantId, query)
  } else if (type === 'inventory') {
    blob = await generateInventoryPdf(tenantId)
  } else if (type === 'analytics') {
    blob = await generateAnalyticsPdf(tenantId)
  } else {
    throw new Error(`Unsupported PDF export type: ${type}`)
  }
  return formatResponse(blob)
}

export function registerExportRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/export/pdf/:type', exportPdf)
}
