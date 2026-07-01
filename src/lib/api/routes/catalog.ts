import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID } from '../utils'
import { RouteHandler } from '../types'

const searchCatalog: RouteHandler = async ({ tenantId, query }) => {
  const q = query.get('q') || ''
  const lowerQ = q.toLowerCase()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, productType, genericName, manufacturerName')
    .or(`name.ilike.%${q}%,genericName.ilike.%${q}%`)
    .eq('tenantId', tenantId)
    .limit(50)

  const productIds = products?.map((p: any) => p.id) || []

  let queryBuilder = supabase
    .from('product_variants')
    .select('id, productId, variantName, sku, retailPrice, product:products(name, productType, genericName, manufacturerName)')
    .eq('tenantId', tenantId)

  if (productIds.length > 0) {
    const uuidList = productIds.map((id: string) => `"${id}"`).join(',')
    queryBuilder = queryBuilder.or(`productId.in.(${uuidList}),sku.ilike.%${q}%,variantName.ilike.%${q}%`)
  } else {
    queryBuilder = queryBuilder.or(`sku.ilike.%${q}%,variantName.ilike.%${q}%`)
  }

  const { data: variants, error } = await queryBuilder.limit(50)
  if (error) throw error

  const variantIdSet = new Set((variants || []).map((v: any) => v.id).filter(Boolean))
  const latestInventoryByVariant: Record<string, { purchasePrice: number; retailPrice: number }> = {}
  if (variantIdSet.size > 0) {
    const { data: inventoryItems } = await supabase
      .from('inventory_items')
      .select('variantId, purchasePrice, retailPrice, createdAt')
      .eq('tenantId', tenantId)
      .order('createdAt', { ascending: false })
      .limit(1000)

    for (const item of (inventoryItems || [])) {
      const key = item.variantId
      if (key && variantIdSet.has(key) && !latestInventoryByVariant[key]) {
        latestInventoryByVariant[key] = {
          purchasePrice: item.purchasePrice || 0,
          retailPrice: item.retailPrice || 0
        }
      }
    }
  }

  const catalogItems = (variants || []).map((v: any) => {
    const latest = latestInventoryByVariant[v.id]
    return {
      variantId: v.id,
      productName: v.product?.name || 'Unnamed Product',
      variantName: v.variantName,
      sku: v.sku,
      retailPrice: latest?.retailPrice ?? v.retailPrice,
      productType: v.product?.productType || 'GENERAL',
      genericName: v.product?.genericName || '',
      manufacturerName: v.product?.manufacturerName || '',
      purchasePrice: latest?.purchasePrice ?? v.retailPrice * 0.7
    }
  })

  const getScore = (item: any): number => {
    const name = (item.productName || '').toLowerCase()
    const sku = (item.sku || '').toLowerCase()
    const generic = (item.genericName || '').toLowerCase()
    const mfr = (item.manufacturerName || '').toLowerCase()
    const variant = (item.variantName || '').toLowerCase()

    if (name === lowerQ) return 100
    if (sku === lowerQ) return 95
    if (generic === lowerQ) return 90
    if (name.startsWith(lowerQ) || variant.startsWith(lowerQ)) return 80
    if (sku.startsWith(lowerQ)) return 75
    if (generic.startsWith(lowerQ)) return 70
    if (name.includes(lowerQ) || variant.includes(lowerQ)) return 60
    if (sku.includes(lowerQ)) return 55
    if (generic.includes(lowerQ)) return 50
    if (mfr.includes(lowerQ)) return 40
    return 0
  }

  catalogItems.sort((a: any, b: any) => getScore(b) - getScore(a))
  return formatResponse(catalogItems)
}

const getProducts: RouteHandler = async ({ tenantId }) => {
  const { data, error } = await supabase
    .from('products')
    .select('*, brand:brands(*), category:categories(*)')
    .eq('tenantId', tenantId)
  if (error) throw error
  return formatResponse(data)
}

const getCatalog: RouteHandler = async ({ tenantId }) => {
  const { data: variants, error } = await supabase
    .from('product_variants')
    .select('id, productId, variantName, sku, retailPrice, product:products(id, name, description, productType, genericName, manufacturerName, brand:brands(*), category:categories(*))')
    .eq('tenantId', tenantId)
  if (error) throw error

  const variantIdSet = new Set((variants || []).map((v: any) => v.id).filter(Boolean))
  const latestInventoryByVariant: Record<string, { purchasePrice: number; retailPrice: number }> = {}
  const stockByVariant: Record<string, number> = {}
  if (variantIdSet.size > 0) {
    const { data: inventoryItems } = await supabase
      .from('inventory_items')
      .select('variantId, purchasePrice, retailPrice, quantity, createdAt')
      .eq('tenantId', tenantId)
      .order('createdAt', { ascending: false })
      .limit(1000)

    for (const item of (inventoryItems || [])) {
      const key = item.variantId
      if (key && variantIdSet.has(key)) {
        stockByVariant[key] = (stockByVariant[key] || 0) + (item.quantity || 0)
        if (!latestInventoryByVariant[key]) {
          latestInventoryByVariant[key] = {
            purchasePrice: item.purchasePrice || 0,
            retailPrice: item.retailPrice || 0
          }
        }
      }
    }
  }

  const catalogItems = (variants || []).map((v: any) => {
    const latest = latestInventoryByVariant[v.id]
    return {
      variantId: v.id,
      productId: v.productId,
      productName: v.product?.name || 'Unnamed Product',
      variantName: v.variantName,
      sku: v.sku,
      retailPrice: latest?.retailPrice ?? v.retailPrice,
      purchasePrice: latest?.purchasePrice ?? v.retailPrice * 0.7,
      description: v.product?.description || '',
      productType: v.product?.productType || 'GENERAL',
      genericName: v.product?.genericName || '',
      manufacturerName: v.product?.manufacturerName || '',
      brand: v.product?.brand?.name || '',
      category: v.product?.category?.name || '',
      currentStock: stockByVariant[v.id] || 0
    }
  })

  return formatResponse(catalogItems)
}

const getCatalogById: RouteHandler = async ({ tenantId, params }) => {
  const variantId = params.id
  const { data, error } = await supabase
    .from('product_variants')
    .select('id, productId, variantName, sku, retailPrice, product:products(id, name, description, productType, genericName, manufacturerName, brand:brands(*), category:categories(*))')
    .eq('id', variantId)
    .eq('tenantId', tenantId)
    .single()
  if (error) throw error
  return formatResponse(data)
}

const createCatalog: RouteHandler = async ({ tenantId, requestData }) => {
  const productId = generateUUID()
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .insert({
      id: productId,
      tenantId,
      name: requestData.productName,
      productType: requestData.productType || 'GENERAL',
      genericName: requestData.genericName || null,
      manufacturerName: requestData.manufacturerName || null,
      description: requestData.description || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select()
    .single()
  if (prodErr) throw prodErr

  const variantId = generateUUID()
  const { data: variant, error: varErr } = await supabase
    .from('product_variants')
    .insert({
      id: variantId,
      tenantId,
      productId: product.id,
      variantName: requestData.variantName,
      sku: requestData.sku,
      retailPrice: requestData.retailPrice || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select()
    .single()
  if (varErr) throw varErr

  return formatResponse({ ...product, ...variant, productName: product.name, variantName: variant.variantName, currentStock: 0 })
}

const updateCatalog: RouteHandler = async ({ tenantId, params, requestData }) => {
  const variantId = params.id
  const { data: variant } = await supabase
    .from('product_variants')
    .select('productId')
    .eq('id', variantId)
    .eq('tenantId', tenantId)
    .single()
  if (!variant) throw new Error('Variant not found')

  const { data: product, error: prodErr } = await supabase
    .from('products')
    .update({
      name: requestData.productName,
      productType: requestData.productType || 'GENERAL',
      genericName: requestData.genericName || null,
      manufacturerName: requestData.manufacturerName || null,
      description: requestData.description || null,
      updatedAt: new Date().toISOString()
    })
    .eq('id', variant.productId)
    .eq('tenantId', tenantId)
    .select()
    .single()
  if (prodErr) throw prodErr

  const { data: updatedVariant, error: varErr } = await supabase
    .from('product_variants')
    .update({
      variantName: requestData.variantName,
      sku: requestData.sku,
      retailPrice: requestData.retailPrice || 0,
      updatedAt: new Date().toISOString()
    })
    .eq('id', variantId)
    .eq('tenantId', tenantId)
    .select()
    .single()
  if (varErr) throw varErr

  return formatResponse({ ...product, ...updatedVariant, productName: product.name, variantName: updatedVariant.variantName })
}

const deleteCatalog: RouteHandler = async ({ tenantId, params }) => {
  const variantId = params.id
  const { data: variant } = await supabase
    .from('product_variants')
    .select('productId')
    .eq('id', variantId)
    .eq('tenantId', tenantId)
    .single()
  if (!variant) throw new Error('Variant not found')

  const { error: delErr } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', variantId)
  if (delErr) throw delErr

  const { data: remaining } = await supabase
    .from('product_variants')
    .select('id')
    .eq('productId', variant.productId)
    .limit(1)
  if (!remaining || remaining.length === 0) {
    await supabase.from('products').delete().eq('id', variant.productId)
  }

  return formatResponse({ success: true })
}

const getCategories: RouteHandler = async ({ tenantId }) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*, _count:products(count)')
    .eq('tenantId', tenantId)
    .order('name', { ascending: true })
  if (error) throw error
  return formatResponse(data || [])
}

const createCategory: RouteHandler = async ({ tenantId, requestData }) => {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      id: generateUUID(),
      tenantId,
      name: requestData.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select()
    .single()
  if (error) throw error
  return formatResponse(data)
}

const updateCategory: RouteHandler = async ({ params, requestData }) => {
  const { data, error } = await supabase
    .from('categories')
    .update({ name: requestData.name, updatedAt: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return formatResponse(data)
}

const deleteCategory: RouteHandler = async ({ tenantId, params }) => {
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('categoryId', params.id)
    .eq('tenantId', tenantId)
  if (count && count > 0) throw new Error(`Cannot delete category with ${count} products. Reassign products first.`)
  const { error } = await supabase.from('categories').delete().eq('id', params.id)
  if (error) throw error
  return formatResponse({ success: true })
}

const getBrands: RouteHandler = async ({ tenantId }) => {
  const { data, error } = await supabase
    .from('brands')
    .select('*, _count:products(count)')
    .eq('tenantId', tenantId)
    .order('name', { ascending: true })
  if (error) throw error
  return formatResponse(data || [])
}

const createBrand: RouteHandler = async ({ tenantId, requestData }) => {
  const { data, error } = await supabase
    .from('brands')
    .insert({
      id: generateUUID(),
      tenantId,
      name: requestData.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select()
    .single()
  if (error) throw error
  return formatResponse(data)
}

const updateBrand: RouteHandler = async ({ params, requestData }) => {
  const { data, error } = await supabase
    .from('brands')
    .update({ name: requestData.name, updatedAt: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return formatResponse(data)
}

const deleteBrand: RouteHandler = async ({ tenantId, params }) => {
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('brandId', params.id)
    .eq('tenantId', tenantId)
  if (count && count > 0) throw new Error(`Cannot delete brand with ${count} products. Reassign products first.`)
  const { error } = await supabase.from('brands').delete().eq('id', params.id)
  if (error) throw error
  return formatResponse({ success: true })
}

export function registerCatalogRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/catalog/search', searchCatalog)
  router.register('GET', '/catalog/products', getProducts)
  router.register('GET', '/catalog', getCatalog)
  router.register('GET', '/catalog/:id', getCatalogById)
  router.register('POST', '/catalog', createCatalog)
  router.register('PUT', '/catalog/:id', updateCatalog)
  router.register('DELETE', '/catalog/:id', deleteCatalog)
  router.register('GET', '/catalog/categories', getCategories)
  router.register('POST', '/catalog/categories', createCategory)
  router.register('PUT', '/catalog/categories/:id', updateCategory)
  router.register('DELETE', '/catalog/categories/:id', deleteCategory)
  router.register('GET', '/catalog/brands', getBrands)
  router.register('POST', '/catalog/brands', createBrand)
  router.register('PUT', '/catalog/brands/:id', updateBrand)
  router.register('DELETE', '/catalog/brands/:id', deleteBrand)
}
