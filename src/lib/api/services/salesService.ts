import { supabase } from '@/lib/supabase'
import { generateUUID, formatResponse } from '../utils'
import { sendShortlistAddedNotification } from './notificationService'

export async function createSale(requestData: any, tenantId: string, userId: string) {
  let calculatedTotalAmount = 0
  let calculatedTotalProfit = 0

  for (const item of requestData.items) {
    const { data: inventory } = await supabase
      .from('inventory_items')
      .select('purchasePrice, retailPrice')
      .eq('id', item.inventoryId)
      .single()

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

  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .insert(sanitizedSale)
    .select()
    .single()
  if (saleErr) throw saleErr

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

  for (const item of requestData.items) {
    const { data: invItem } = await supabase
      .from('inventory_items')
      .select('quantity, lastRestockQty, itemName')
      .eq('id', item.inventoryId)
      .single()
    if (invItem) {
      const newQty = Math.max(0, invItem.quantity - item.quantity)
      await supabase
        .from('inventory_items')
        .update({ quantity: newQty, updatedAt: new Date().toISOString() })
        .eq('id', item.inventoryId)

      // Log stock movement
      await supabase.from('stock_movements').insert({
        id: generateUUID(),
        tenantId,
        inventoryId: item.inventoryId,
        movementType: 'SALE',
        quantityChange: -item.quantity,
        reason: `Sale #${sale.receiptNumber}`,
        referenceId: sale.id,
      })

      // Check 50% rule: if quantity drops to 50% or less of lastRestockQty, add to shortlist
      if (invItem.lastRestockQty && newQty > 0 && newQty <= invItem.lastRestockQty * 0.5) {
        const { data: existing } = await supabase
          .from('short_list')
          .select('id')
          .eq('inventoryId', item.inventoryId)
          .eq('tenantId', tenantId)
          .single()

        if (!existing) {
          await supabase.from('short_list').insert({
            id: generateUUID(),
            tenantId,
            inventoryId: item.inventoryId,
            isSlowItem: false,
            reason: '50% rule',
            addedAt: new Date().toISOString(),
            addedBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })

          // Send push notification
          await sendShortlistAddedNotification(tenantId, invItem.itemName || 'Unknown item', newQty)
        }
      }
    }
  }

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
