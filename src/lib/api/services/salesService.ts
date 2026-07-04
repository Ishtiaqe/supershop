import { supabase } from '@/lib/supabase'
import { generateUUID, formatResponse } from '../utils'

export async function createSale(requestData: any, tenantId: string, userId: string) {
  const inventoryIds = requestData.items.map((item: any) => item.inventoryId)

  // Batch 1: Fetch all inventory items in one query
  const { data: inventoryItems, error: invFetchErr } = await supabase
    .from('inventory_items')
    .select('id, purchasePrice, retailPrice, quantity, lastRestockQty, itemName')
    .in('id', inventoryIds)
  if (invFetchErr) throw invFetchErr

  const inventoryMap = new Map<string, any>()
  for (const inv of inventoryItems || []) {
    inventoryMap.set(inv.id, inv)
  }

  // Calculate totals using the batch-fetched data
  let calculatedTotalAmount = 0
  let calculatedTotalProfit = 0
  for (const item of requestData.items) {
    const inventory = inventoryMap.get(item.inventoryId)
    if (inventory) {
      const discountPercent = item.discount || 0
      const effectivePrice = item.unitPrice * (1 - discountPercent / 100)
      const profit = effectivePrice - inventory.purchasePrice
      calculatedTotalAmount += effectivePrice * item.quantity
      calculatedTotalProfit += profit * item.quantity
    }
  }

  let totalAmount = requestData.totalAmount || calculatedTotalAmount
  if (requestData.discountType === 'percentage' || requestData.discountType === 'PERCENTAGE') {
    totalAmount -= (totalAmount * (requestData.discountValue || 0)) / 100
  } else if (requestData.discountType === 'fixed' || requestData.discountType === 'FIXED') {
    totalAmount -= (requestData.discountValue || 0)
  }

  const totalProfit = requestData.totalProfit || calculatedTotalProfit
  const amountPaid = requestData.paymentMethod === 'CREDIT' ? requestData.amountPaid ?? 0 : totalAmount
  const dueAmount = requestData.paymentMethod === 'CREDIT' ? Math.max(0, totalAmount - amountPaid) : 0

  const saleId = requestData.id || generateUUID()
  const sanitizedSale = {
    id: saleId,
    tenantId,
    employeeId: userId,
    receiptNumber: requestData.receiptNumber || `${Date.now()}`,
    saleTime: requestData.saleTime || new Date().toISOString(),
    totalAmount,
    totalProfit,
    customerName: requestData.customerName || null,
    customerPhone: requestData.customerPhone || null,
    customerId: requestData.customerId || null,
    saleType: requestData.saleType || 'POS',
    paymentMethod: requestData.paymentMethod || 'CASH',
    discountType: requestData.discountType || null,
    discountValue: requestData.discountValue || 0,
    amountPaid,
    dueAmount,
    updatedAt: new Date().toISOString()
  }

  // Insert sale
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .insert(sanitizedSale)
    .select()
    .single()
  if (saleErr) throw saleErr

  // Batch 2: Insert all sale_items in one call
  const saleItems = requestData.items.map((item: any) => ({
    id: item.id || generateUUID(),
    saleId: sale.id,
    inventoryId: item.inventoryId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.unitPrice * (1 - (item.discount || 0) / 100) * item.quantity,
    discount: item.discount || 0
  }))
  const { error: itemsErr } = await supabase.from('sale_items').insert(saleItems)
  if (itemsErr) throw itemsErr

  // Batch 3: Prepare inventory updates + stock movements
  const stockMovements: any[] = []
  const shortlistCandidates: { inventoryId: string; itemName: string; newQty: number }[] = []

  const updatePromises = requestData.items.map(async (item: any) => {
    const invItem = inventoryMap.get(item.inventoryId)
    if (!invItem) return

    const newQty = Math.max(0, invItem.quantity - item.quantity)
    await supabase
      .from('inventory_items')
      .update({ quantity: newQty, updatedAt: new Date().toISOString() })
      .eq('id', item.inventoryId)

    stockMovements.push({
      id: generateUUID(),
      tenantId,
      inventoryId: item.inventoryId,
      movementType: 'SALE',
      quantityChange: -item.quantity,
      reason: `Sale #${sale.receiptNumber}`,
      referenceId: sale.id,
    })

    // Check 50% rule
    if (invItem.lastRestockQty && newQty > 0 && newQty <= invItem.lastRestockQty * 0.5) {
      shortlistCandidates.push({ inventoryId: item.inventoryId, itemName: invItem.itemName || 'Unknown item', newQty })
    }
  })
  await Promise.all(updatePromises)

  // Batch 4: Insert all stock movements in one call
  if (stockMovements.length > 0) {
    const { error: smErr } = await supabase.from('stock_movements').insert(stockMovements)
    if (smErr) throw smErr
  }

  // Batch 5: Check existing shortlist entries for all candidates at once
  if (shortlistCandidates.length > 0) {
    const candidateIds = shortlistCandidates.map(c => c.inventoryId)
    const { data: existingShortlist } = await supabase
      .from('short_list')
      .select('inventoryId')
      .in('inventoryId', candidateIds)
      .eq('tenantId', tenantId)

    const existingIds = new Set((existingShortlist || []).map((s: any) => s.inventoryId))
    const newShortlistEntries = shortlistCandidates
      .filter(c => !existingIds.has(c.inventoryId))
      .map(c => ({
        id: generateUUID(),
        tenantId,
        inventoryId: c.inventoryId,
        isSlowItem: false,
        reason: '50% rule',
        addedAt: new Date().toISOString(),
        addedBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

    if (newShortlistEntries.length > 0) {
      const { error: slErr } = await supabase.from('short_list').insert(newShortlistEntries)
      if (slErr) throw slErr
    }
  }

  // Insert cash register entry
  const cashReceivedNow = requestData.paymentMethod === 'CREDIT' ? amountPaid : totalAmount
  if (cashReceivedNow > 0) {
    await supabase.from('cash_box_entries').insert({
      id: generateUUID(),
      tenantId,
      entryType: 'SALE_IN',
      amount: cashReceivedNow,
      note: `Sale #${sale.receiptNumber} — ${requestData.paymentMethod || 'CASH'}`,
      referenceId: sale.id,
      referenceType: 'SALE',
      createdById: userId,
      entryDate: sale.saleTime,
      updatedAt: new Date().toISOString()
    })
  }

  return formatResponse(sale)
}
