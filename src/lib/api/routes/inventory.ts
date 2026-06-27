import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID, sanitizeInventoryItem, sanitizeUpdate } from '../utils'
import { RouteHandler } from '../types'

const getInventory: RouteHandler = async ({ tenantId, query }) => {
  const q = query.get('q') || ''
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*, variant:product_variants(*, product:products(*))')
    .eq('tenantId', tenantId)
  if (error) throw error

  let filtered = data || []
  if (q) {
    const lowerQ = q.toLowerCase()
    filtered = filtered
      .filter((item: any) => {
        const itemName = (item.itemName || '').toLowerCase()
        const sku = (item.variant?.sku || '').toLowerCase()
        const productName = (item.variant?.product?.name || '').toLowerCase()
        const genericName = (item.variant?.product?.genericName || '').toLowerCase()
        const manufacturerName = (item.variant?.product?.manufacturerName || '').toLowerCase()
        return itemName.includes(lowerQ) ||
          sku.includes(lowerQ) ||
          productName.includes(lowerQ) ||
          genericName.includes(lowerQ) ||
          manufacturerName.includes(lowerQ)
      })
      .sort((a: any, b: any) => {
        const getScore = (item: any) => {
          const itemName = (item.itemName || '').toLowerCase()
          const sku = (item.variant?.sku || '').toLowerCase()
          const productName = (item.variant?.product?.name || '').toLowerCase()
          const genericName = (item.variant?.product?.genericName || '').toLowerCase()
          const manufacturerName = (item.variant?.product?.manufacturerName || '').toLowerCase()
          if (productName === lowerQ || itemName === lowerQ) return 100
          if (sku === lowerQ) return 95
          if (genericName === lowerQ) return 90
          if (productName.startsWith(lowerQ) || itemName.startsWith(lowerQ)) return 80
          if (sku.startsWith(lowerQ)) return 75
          if (genericName.startsWith(lowerQ)) return 70
          if (productName.includes(lowerQ) || itemName.includes(lowerQ)) return 60
          if (sku.includes(lowerQ)) return 55
          if (genericName.includes(lowerQ)) return 50
          if (manufacturerName.includes(lowerQ)) return 40
          return 0
        }
        return getScore(b) - getScore(a)
      })
  }
  return formatResponse(filtered)
}

const createInventory: RouteHandler = async ({ tenantId, userId, requestData }) => {
  const {
    maxDiscount,
    variantId: providedVariantId,
    expiryDate,
    mfgDate,
    productType,
    genericName,
    manufacturerName,
    itemName,
    batchNo: providedBatchNo,
    fundSource,
    quantity,
    purchasePrice,
    retailPrice
  } = requestData

  let variantId = providedVariantId

  if (!variantId && itemName) {
    const productId = generateUUID()
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .insert({
        id: productId,
        tenantId,
        name: itemName,
        productType: productType || 'GENERAL',
        genericName: genericName || null,
        manufacturerName: manufacturerName || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single()
    if (prodErr) throw prodErr

    const varId = generateUUID()
    const { data: variant, error: varErr } = await supabase
      .from('product_variants')
      .insert({
        id: varId,
        tenantId,
        productId: product.id,
        variantName: 'Standard',
        sku: `SKU-${Date.now()}`,
        retailPrice: retailPrice || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single()
    if (varErr) throw varErr

    variantId = variant.id
  }

  let derivedItemName = itemName
  if (variantId) {
    const { data: variant } = await supabase
      .from('product_variants')
      .select('variantName, product:products(name)')
      .eq('id', variantId)
      .single()
    if (variant) {
      const prodName = (variant.product as any)?.name || 'Unnamed Product'
      derivedItemName = `${prodName}${variant.variantName ? ' - ' + variant.variantName : ''}`
    }
  }

  let batchNo = providedBatchNo
  if (!batchNo) {
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = String(now.getFullYear())
    const dateKey = `${dd}-${mm}-${yyyy}`
    const prefix = `BATCH-${dateKey}-`

    let query = supabase
      .from('inventory_items')
      .select('batchNo')
      .eq('tenantId', tenantId)
      .like('batchNo', `${prefix}%`)
    if (variantId) {
      query = query.eq('variantId', variantId)
    } else {
      query = query.eq('itemName', derivedItemName)
    }
    const { data: existing } = await query

    let maxSeq = 0
    for (const item of (existing || [])) {
      const parts = (item.batchNo || '').split('-')
      const seqNum = Number(parts[parts.length - 1])
      if (Number.isFinite(seqNum) && seqNum > maxSeq) maxSeq = seqNum
    }
    batchNo = `${prefix}${maxSeq + 1}`
  }

  let mergedItem = null
  if (variantId) {
    const { data: existingItems } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('tenantId', tenantId)
      .eq('variantId', variantId)
      .eq('batchNo', batchNo)

    const targetItem = (existingItems || []).find((item: any) => {
      const itemExpiry = item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : null
      const newExpiry = expiryDate ? new Date(expiryDate).toISOString().split('T')[0] : null
      return itemExpiry === newExpiry
    })

    if (targetItem) {
      const { data: updated, error: updErr } = await supabase
        .from('inventory_items')
        .update({
          quantity: targetItem.quantity + (quantity || 0),
          purchasePrice: purchasePrice,
          retailPrice: retailPrice,
          maxDiscountRate: maxDiscount || 0,
          mfgDate: mfgDate || null,
          itemName: derivedItemName,
          lastRestockQty: quantity || 0,
          lastRestockDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', targetItem.id)
        .select()
        .single()
      if (updErr) throw updErr
      mergedItem = updated
    }
  }

  let finalItem = mergedItem
  if (!finalItem) {
    const itemId = requestData.id || generateUUID()
    const { data: inserted, error: insErr } = await supabase
      .from('inventory_items')
      .insert({
        id: itemId,
        tenantId,
        variantId: variantId || null,
        itemName: derivedItemName || null,
        quantity: quantity || 0,
        purchasePrice: purchasePrice || 0,
        retailPrice: retailPrice || 0,
        batchNo: batchNo,
        expiryDate: expiryDate || null,
        mfgDate: mfgDate || null,
        maxDiscountRate: maxDiscount || 0,
        lastRestockQty: quantity || 0,
        lastRestockDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single()
    if (insErr) throw insErr
    finalItem = inserted
  }

  if (fundSource && purchasePrice && quantity) {
    const totalCost = purchasePrice * quantity
    if (fundSource === 'CASH_BOX') {
      await supabase.from('cash_box_entries').insert({
        id: generateUUID(),
        tenantId,
        entryType: 'INVENTORY_OUT',
        amount: totalCost,
        note: `Stock purchase: ${derivedItemName}`,
        referenceId: finalItem.id,
        createdById: userId,
        entryDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    } else if (fundSource === 'NEW_INVESTMENT') {
      await supabase.from('cash_box_entries').insert([
        {
          id: generateUUID(),
          tenantId,
          entryType: 'NEW_INVESTMENT_IN',
          amount: totalCost,
          note: `New investment for: ${derivedItemName}`,
          referenceId: finalItem.id,
          createdById: userId,
          entryDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: generateUUID(),
          tenantId,
          entryType: 'INVENTORY_OUT',
          amount: totalCost,
          note: `Stock purchase (new investment): ${derivedItemName}`,
          referenceId: finalItem.id,
          createdById: userId,
          entryDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ])
    } else if (fundSource === 'LOAN') {
      await supabase.from('cash_box_entries').insert([
        {
          id: generateUUID(),
          tenantId,
          entryType: 'LOAN_IN',
          amount: totalCost,
          note: `Loan for stock: ${derivedItemName}`,
          referenceId: finalItem.id,
          createdById: userId,
          entryDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: generateUUID(),
          tenantId,
          entryType: 'INVENTORY_OUT',
          amount: totalCost,
          note: `Stock purchase (loan): ${derivedItemName}`,
          referenceId: finalItem.id,
          createdById: userId,
          entryDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ])
    }
  }

  return formatResponse(finalItem)
}

const updateInventory: RouteHandler = async ({ params, requestData }) => {
  const invId = params.id || requestData.id
  const sanitized = sanitizeUpdate(sanitizeInventoryItem, requestData)
  const { data: item, error } = await supabase
    .from('inventory_items')
    .update(sanitized)
    .eq('id', invId)
    .select()
    .single()
  if (error) throw error
  return formatResponse(item)
}

const deleteInventory: RouteHandler = async ({ params }) => {
  const invId = params.id
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', invId)
  if (error) throw error
  return formatResponse({ success: true })
}

export function registerInventoryRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/inventory', getInventory)
  router.register('POST', '/inventory', createInventory)
  router.register('PUT', '/inventory', updateInventory)
  router.register('PUT', '/inventory/:id', updateInventory)
  router.register('DELETE', '/inventory/:id', deleteInventory)
}
