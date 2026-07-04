import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID, sanitizeInventoryItem, sanitizeUpdate } from '../utils'
import { RouteHandler } from '../types'
import { masterDataCache } from '@/lib/cache/masterData'
import { sendShortlistRemovedNotification } from '../services/notificationService'

const getInventory: RouteHandler = async ({ tenantId, query }) => {
  const q = query.get('q') || ''
  const variantId = query.get('variantId') || ''
  const limit = Number(query.get('limit') || '100')
  const offset = Number(query.get('offset') || '0')
  const since = query.get('since')

  // Try to get cached master data first
  const [variantsWithProducts] = await Promise.allSettled([
    masterDataCache.getVariantsWithProducts(tenantId),
    // Only fetch inventory if we have cached master data
    Promise.resolve()
  ])

  const hasCachedData = variantsWithProducts.status === 'fulfilled' && variantsWithProducts.value.length > 0

  let inventoryData: any[] | null = null
  let error: any = null

  if (q) {
    // Always use RPC for search queries — PostgREST's .or() across embedded resources
    // joins product_variants once per referenced column (3x for this search),
    // so this query is pushed into a real SQL function instead.
    // The RPC searches ALL items, not just the first N.
    const rpcResult = await supabase.rpc('search_inventory_items', {
      p_tenant_id: tenantId,
      p_query: q,
      p_limit: limit,
      p_offset: offset
    })
    inventoryData = rpcResult.data
    error = rpcResult.error
  } else {
    let dbQuery: any = supabase.from('inventory_items')

    if (hasCachedData) {
      // Use cached data: fetch inventory without joins
      dbQuery = dbQuery.select('*')
    } else {
      // Fallback: fetch with joins as before
      dbQuery = dbQuery.select('*, variant:product_variants(*, product:products(*))')
    }

    dbQuery = dbQuery
      .eq('tenantId', tenantId)
      .order('createdAt', { ascending: false })

    if (variantId) {
      dbQuery = dbQuery.eq('variantId', variantId)
    }

    if (since) {
      dbQuery = dbQuery.gte('updatedAt', since)
    }

    const result = await dbQuery.range(offset, offset + limit - 1)
    inventoryData = result.data
    error = result.error
  }

  if (error) throw error

  let result = inventoryData || []

  // If we have cached master data and no search query, embed variant data manually
  // (when q is provided, the RPC already returns variant data with product embedded)
  if (hasCachedData && !q) {
    const variantMap = new Map(
      variantsWithProducts.value.map((v: any) => [v.id, v])
    )

    result = result.map((item: any) => ({
      ...item,
      variant: variantMap.get(item.variantId) || null
    }))
  }

  return formatResponse(result)
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

    // Invalidate cache since we created new product/variant
    await masterDataCache.invalidateAll().catch(() => {}) // Fire and forget

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
      const newQuantity = targetItem.quantity + (quantity || 0)
      const { data: updated, error: updErr } = await supabase
        .from('inventory_items')
        .update({
          quantity: newQuantity,
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

      // Log stock movement (restock)
      if (quantity && quantity > 0) {
        await supabase.from('stock_movements').insert({
          id: generateUUID(),
          tenantId,
          inventoryId: targetItem.id,
          movementType: 'RESTOCK',
          quantityChange: quantity,
          reason: `Restock — batch ${batchNo}`,
          referenceId: targetItem.id,
        })
      }

      // Auto-remove from shortlist if quantity is now above 50% of lastRestockQty
      if (quantity && newQuantity > quantity * 0.5) {
        const { data: shortlistItem } = await supabase
          .from('short_list')
          .select('id')
          .eq('inventoryId', targetItem.id)
          .eq('tenantId', tenantId)
          .single()

        if (shortlistItem) {
          await supabase
            .from('short_list')
            .delete()
            .eq('inventoryId', targetItem.id)
            .eq('tenantId', tenantId)

          // Send push notification
          await sendShortlistRemovedNotification(tenantId, derivedItemName || 'Unknown item', newQuantity)
        }
      }
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

    // Log stock movement (new inventory)
    if (quantity && quantity > 0) {
      await supabase.from('stock_movements').insert({
        id: generateUUID(),
        tenantId,
        inventoryId: finalItem.id,
        movementType: 'RESTOCK',
        quantityChange: quantity,
        reason: `Initial stock — batch ${batchNo}`,
        referenceId: finalItem.id,
      })
    }
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
        referenceType: 'INVENTORY',
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
          referenceType: 'INVESTMENT',
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
          referenceType: 'INVENTORY',
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
          referenceType: 'LOAN',
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
          referenceType: 'INVENTORY',
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

const getLowStock: RouteHandler = async ({ tenantId, query }) => {
  const threshold = Number(query.get('threshold') || 20)
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*, variant:product_variants(*, product:products(*))')
    .eq('tenantId', tenantId)
    .lte('quantity', threshold)
  if (error) throw error
  return formatResponse(data || [])
}

const getExpiring: RouteHandler = async ({ tenantId, query }) => {
  const days = Number(query.get('days') || 30)
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)
  const today = new Date().toISOString()
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*, variant:product_variants(*, product:products(*))')
    .eq('tenantId', tenantId)
    .lte('expiryDate', futureDate.toISOString())
    .gte('expiryDate', today)
  if (error) throw error
  return formatResponse(data || [])
}

const getExpired: RouteHandler = async ({ tenantId }) => {
  const today = new Date().toISOString()
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*, variant:product_variants(*, product:products(*))')
    .eq('tenantId', tenantId)
    .lt('expiryDate', today)
  if (error) throw error
  return formatResponse(data || [])
}

export function registerInventoryRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/inventory', getInventory)
  router.register('GET', '/inventory/alerts/low-stock', getLowStock)
  router.register('GET', '/inventory/alerts/expiring', getExpiring)
  router.register('GET', '/inventory/alerts/expired', getExpired)
  router.register('POST', '/inventory', createInventory)
  router.register('PUT', '/inventory', updateInventory)
  router.register('PUT', '/inventory/:id', updateInventory)
  router.register('DELETE', '/inventory/:id', deleteInventory)
}
