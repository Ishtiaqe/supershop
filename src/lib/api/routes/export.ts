import { supabase } from '@/lib/supabase'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatResponse } from '../utils'
import { RouteHandler } from '../types'

const generateShortListPdf = async (tenantId: string) => {
  const { data: items } = await supabase
    .from('short_list')
    .select('*, inventory:inventory_items(*, variant:product_variants(*, product:products(*)))')
    .eq('tenantId', tenantId)

  const rows = (items || []).map((item: any) => [
    item.inventory?.itemName || item.inventory?.variant?.product?.name || 'N/A',
    String(item.inventory?.quantity || 0),
    String(item.inventory?.purchasePrice?.toFixed(2) || 'N/A'),
    item.reason || 'manual',
    item.addedAt ? new Date(item.addedAt).toLocaleDateString() : '—'
  ])

  const doc = new jsPDF()
  doc.text('SHORT LIST REPORT', 14, 15)
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 23)
  autoTable(doc, {
    head: [['Item Name', 'Current Qty', 'Purchase Price', 'Reason', 'Added Date']],
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
    item.variant?.sku || 'N/A',
    String(item.quantity || 0),
    String(item.purchasePrice?.toFixed(2) || '0.00'),
    String(item.retailPrice?.toFixed(2) || '0.00'),
    item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'
  ])

  const doc = new jsPDF()
  doc.text('INVENTORY REPORT', 14, 15)
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 23)
  autoTable(doc, {
    head: [['Item Name', 'SKU', 'Qty', 'Cost Price', 'Retail Price', 'Expiry']],
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
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 23)
  doc.text(`Total Items: ${(items || []).length}`, 14, 33)
  doc.text(`Slow Items: ${slowItems}`, 14, 41)
  autoTable(doc, {
    head: [['Reason', 'Count']],
    body: rows,
    startY: 50
  })
  return doc.output('blob')
}

const exportPdf: RouteHandler = async ({ tenantId, params }) => {
  const type = params.type
  let blob: Blob
  if (type === 'shortlist') {
    blob = await generateShortListPdf(tenantId)
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
