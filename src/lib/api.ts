import { supabase } from './supabase'
import { offlineApi } from './api-offline'
import { NetworkDetector } from './offline-utils'

const networkDetector = NetworkDetector.getInstance()

// Helper to generate UUIDs client-side for insertions
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Helper to get active tenant/user IDs from localStorage
const getLocalStorageData = () => {
  if (typeof window === 'undefined') {
    return { tenantId: 'default-tenant', userId: 'default-user' }
  }
  try {
    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return {
      tenantId: tenant.id || 'default-tenant',
      userId: user.id || 'default-user'
    }
  } catch {
    return { tenantId: 'default-tenant', userId: 'default-user' }
  }
}

// Helper to format response like AxiosResponse
function formatResponse<T>(data: T, status = 200): any {
  return {
    data,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: {},
    config: {},
  }
}

// Database Schema Sanitizers to prevent passing invalid fields to Supabase
const sanitizeInventoryItem = (data: any) => {
  return {
    tenantId: data.tenantId,
    variantId: data.variantId || null,
    itemName: data.itemName || null,
    quantity: typeof data.quantity === 'number' ? data.quantity : 0,
    lastRestockQty: typeof data.lastRestockQty === 'number' ? data.lastRestockQty : (typeof data.quantity === 'number' ? data.quantity : null),
    lastRestockDate: data.lastRestockDate || new Date().toISOString(),
    lastMovedDate: data.lastMovedDate || null,
    purchasePrice: typeof data.purchasePrice === 'number' ? data.purchasePrice : 0,
    retailPrice: typeof data.retailPrice === 'number' ? data.retailPrice : 0,
    maxDiscountRate: typeof data.maxDiscountRate === 'number' ? data.maxDiscountRate : (typeof data.maxDiscount === 'number' ? data.maxDiscount : 0),
    expiryDate: data.expiryDate || null,
    mfgDate: data.mfgDate || null,
    batchNo: data.batchNo || null,
    updatedAt: new Date().toISOString()
  }
}

const sanitizeExpense = (data: any) => {
  return {
    tenantId: data.tenantId,
    employeeId: data.employeeId,
    categoryId: data.categoryId,
    amount: typeof data.amount === 'number' ? data.amount : 0,
    description: data.description || null,
    expenseDate: data.expenseDate || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

const sanitizeCashBoxEntry = (data: any) => {
  return {
    tenantId: data.tenantId,
    entryType: data.entryType,
    amount: typeof data.amount === 'number' ? data.amount : 0,
    note: data.note || null,
    referenceId: data.referenceId || null,
    entryDate: data.entryDate || new Date().toISOString(),
    createdById: data.createdById,
    updatedAt: new Date().toISOString()
  }
}

const sanitizeSale = (data: any) => {
  return {
    tenantId: data.tenantId,
    employeeId: data.employeeId,
    receiptNumber: data.receiptNumber,
    saleTime: data.saleTime || new Date().toISOString(),
    totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
    totalProfit: typeof data.totalProfit === 'number' ? data.totalProfit : 0,
    customerName: data.customerName || null,
    customerPhone: data.customerPhone || null,
    saleType: data.saleType || 'POS',
    paymentMethod: data.paymentMethod || 'CASH',
    discountType: data.discountType || null,
    discountValue: typeof data.discountValue === 'number' ? data.discountValue : 0,
    amountPaid: typeof data.amountPaid === 'number' ? data.amountPaid : 0,
    dueAmount: typeof data.dueAmount === 'number' ? data.dueAmount : 0,
    updatedAt: new Date().toISOString()
  }
}

const sanitizeUpdate = (sanitizeFn: (d: any) => any, data: any) => {
  const sanitized = sanitizeFn(data)
  // Ensure updatedAt is always set to now on update
  sanitized.updatedAt = new Date().toISOString()
  // Remove fields that are undefined or not explicitly set in the original request data
  Object.keys(sanitized).forEach(key => {
    if (key !== 'updatedAt' && data[key] === undefined) {
      delete (sanitized as any)[key]
    }
  })
  return sanitized
}

// Global request handler routing to Supabase or offline client
async function handleRequest(method: string, url: string, requestData?: any): Promise<any> {
  const isOnline = networkDetector.isOnline()
  
  // If offline, delegate entirely to offlineApi (IndexedDB)
  if (!isOnline) {
    console.warn(`[Offline] Routing ${method} ${url} to IndexedDB`)
    return offlineApi.request({ method, url, data: requestData })
  }

  const cleanUrl = url.split('?')[0]
  const parts = cleanUrl.split('/').filter(Boolean)
  const { tenantId, userId } = getLocalStorageData()

  console.log(`[Serverless-API] ${method} ${cleanUrl}`, { parts, requestData })

  try {
    // --- GET REQUESTS ---
    if (method === 'GET') {
      // 1. /users/me
      if (cleanUrl === '/users/me') {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')
        const { data, error } = await supabase
          .from('users')
          .select('*, tenant:tenants(*)')
          .eq('id', user.id)
          .single()
        if (error) throw error
        return formatResponse(data)
      }

      // 2. /catalog/search
      if (cleanUrl === '/catalog/search') {
        const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '')
        const q = urlParams.get('q') || ''
        const lowerQ = q.toLowerCase()

        // Search products first — match on product name OR generic name
        const { data: products } = await supabase
          .from('products')
          .select('id, name, productType, genericName, manufacturerName')
          .or(`name.ilike.%${q}%,genericName.ilike.%${q}%`)
          .eq('tenantId', tenantId)
          .limit(50)

        const productIds = products?.map(p => p.id) || []

        let queryBuilder = supabase
          .from('product_variants')
          .select('id, productId, variantName, sku, retailPrice, product:products(name, productType, genericName, manufacturerName)')
          .eq('tenantId', tenantId)

        if (productIds.length > 0) {
          const uuidList = productIds.map(id => `"${id}"`).join(',')
          queryBuilder = queryBuilder.or(`productId.in.(${uuidList}),sku.ilike.%${q}%,variantName.ilike.%${q}%`)
        } else {
          queryBuilder = queryBuilder.or(`sku.ilike.%${q}%,variantName.ilike.%${q}%`)
        }

        const { data: variants, error } = await queryBuilder.limit(50)
        if (error) throw error

        const catalogItems = (variants || []).map((v: any) => ({
          variantId: v.id,
          productName: v.product?.name || 'Unnamed Product',
          variantName: v.variantName,
          sku: v.sku,
          retailPrice: v.retailPrice,
          productType: v.product?.productType || 'GENERAL',
          genericName: v.product?.genericName || '',
          manufacturerName: v.product?.manufacturerName || '',
          purchasePrice: v.retailPrice * 0.7
        }))

        // Sort by relevance:
        //   100 — exact product name match
        //    95 — exact SKU match
        //    90 — exact generic name match
        //    80 — product name starts with query
        //    75 — SKU starts with query
        //    70 — generic name starts with query
        //    60 — product name contains query
        //    55 — SKU contains query
        //    50 — generic name contains query
        //    40 — manufacturer name contains query
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

      // 3. /catalog/products
      if (cleanUrl === '/catalog/products') {
        const { data, error } = await supabase
          .from('products')
          .select('*, brand:brands(*), category:categories(*)')
          .eq('tenantId', tenantId)
        if (error) throw error
        return formatResponse(data)
      }

      // 4. /inventory
      if (cleanUrl === '/inventory') {
        const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '')
        const q = urlParams.get('q') || ''

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

                // Exact match gets highest score
                if (productName === lowerQ || itemName === lowerQ) return 100
                if (sku === lowerQ) return 95
                if (genericName === lowerQ) return 90

                // Starts with match
                if (productName.startsWith(lowerQ) || itemName.startsWith(lowerQ)) return 80
                if (sku.startsWith(lowerQ)) return 75
                if (genericName.startsWith(lowerQ)) return 70

                // Includes/substring match
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

      // 5. /sales
      if (cleanUrl === '/sales') {
        const { data, error } = await supabase
          .from('sales')
          .select('*, items:sale_items(*, inventory:inventory_items(*)), employee:users(*)')
          .eq('tenantId', tenantId)
          .order('saleTime', { ascending: false })
        if (error) throw error
        return formatResponse(data)
      }

      // 6. /expenses/categories
      if (cleanUrl === '/expenses/categories') {
        const { data, error } = await supabase
          .from('expense_categories')
          .select('*')
          .eq('tenantId', tenantId)
        if (error) throw error
        return formatResponse(data)
      }

      // 7. /expenses
      if (cleanUrl === '/expenses') {
        const { data, error } = await supabase
          .from('expenses')
          .select('*, category:expense_categories(*), employee:users(*)')
          .eq('tenantId', tenantId)
          .order('expenseDate', { ascending: false })
        if (error) throw error
        return formatResponse({ data, meta: { total: data.length } })
      }

      // 8. /expenses/summary
      if (cleanUrl === '/expenses/summary') {
        const { data: expenses, error } = await supabase
          .from('expenses')
          .select('*, category:expense_categories(*)')
          .eq('tenantId', tenantId)
        if (error) throw error

        const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
        const categorySummaryMap = new Map<string, { amount: number; count: number }>()
        expenses.forEach(e => {
          const catName = e.category?.name || 'Other'
          const cur = categorySummaryMap.get(catName) || { amount: 0, count: 0 }
          categorySummaryMap.set(catName, { amount: cur.amount + e.amount, count: cur.count + 1 })
        })
        const categorySummary = Array.from(categorySummaryMap.entries()).map(([name, val]) => ({
          name,
          amount: val.amount,
          count: val.count
        }))
        return formatResponse({ totalAmount, totalCount: expenses.length, categorySummary })
      }

      // 9. /cash-box/summary
      if (cleanUrl === '/cash-box/summary') {
        const { data: entries, error } = await supabase
          .from('cash_box_entries')
          .select('*')
          .eq('tenantId', tenantId)
        if (error) throw error

        let cashIn = 0
        let cashOut = 0
        entries.forEach(e => {
          const amount = e.amount
          if (['SALE_IN', 'MANUAL_IN', 'NEW_INVESTMENT_IN', 'LOAN_IN'].includes(e.entryType)) {
            cashIn += amount
          } else {
            cashOut += amount
          }
        })
        return formatResponse({ cashIn, cashOut, currentBalance: cashIn - cashOut })
      }

      // 10. /cash-box/entries
      if (cleanUrl === '/cash-box/entries') {
        const { data, error } = await supabase
          .from('cash_box_entries')
          .select('*, createdBy:users(id, fullName)')
          .eq('tenantId', tenantId)
          .order('entryDate', { ascending: false })
        if (error) throw error
        return formatResponse({ data, total: data.length, page: 1, limit: 100 })
      }

      // 11. /credits/summary
      if (cleanUrl === '/credits/summary') {
        const { data: sales, error } = await supabase
          .from('sales')
          .select('dueAmount, customerPhone')
          .eq('tenantId', tenantId)
          .gt('dueAmount', 0)
        if (error) throw error

        const totalOutstanding = sales.reduce((sum, s) => sum + (s.dueAmount || 0), 0)
        const uniquePhones = new Set(sales.map(s => s.customerPhone).filter(Boolean))
        return formatResponse({ totalOutstanding, customersWithDues: uniquePhones.size })
      }

      // 12. /credits
      if (cleanUrl === '/credits') {
        const { data: sales, error } = await supabase
          .from('sales')
          .select('customerName, customerPhone, dueAmount, saleTime, credit_payments:credit_payments(*)')
          .eq('tenantId', tenantId)
          .gt('dueAmount', 0)
        if (error) throw error

        const customerMap = new Map<string, any>()
        sales.forEach(s => {
          const key = s.customerPhone || s.customerName || 'Unknown'
          const cur = customerMap.get(key) || {
            customerName: s.customerName || 'Unknown',
            customerPhone: s.customerPhone || '',
            totalDue: 0,
            salesCount: 0,
            oldestDueDate: s.saleTime,
            lastPaymentDate: null
          }
          cur.totalDue += s.dueAmount
          cur.salesCount += 1
          if (new Date(s.saleTime) < new Date(cur.oldestDueDate)) {
            cur.oldestDueDate = s.saleTime
          }
          s.credit_payments?.forEach((p: any) => {
            if (!cur.lastPaymentDate || new Date(p.paymentDate) > new Date(cur.lastPaymentDate)) {
              cur.lastPaymentDate = p.paymentDate
            }
          })
          customerMap.set(key, cur)
        })
        return formatResponse(Array.from(customerMap.values()))
      }

      // 13. /credits/:phone
      if (parts[0] === 'credits' && parts[1] && parts[1] !== 'summary') {
        const phone = parts[1]
        const { data: sales, error } = await supabase
          .from('sales')
          .select('*, creditPayments:credit_payments(*)')
          .eq('tenantId', tenantId)
          .eq('customerPhone', phone)
          .order('saleTime', { ascending: false })
        if (error) throw error
        return formatResponse(sales)
      }

      // 14. /sales/analytics/summary
      if (cleanUrl === '/sales/analytics/summary') {
        const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '')
        const period = urlParams.get('period') || '30d'
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

      // 15. /sales/analytics/graphs
      if (cleanUrl === '/sales/analytics/graphs') {
        const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '')
        const period = urlParams.get('period') || '30d'
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

        // Populate map with all dates in the range with 0 values
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const dateStr = d.toISOString().split('T')[0] // YYYY-MM-DD
          graphMap.set(dateStr, { date: dateStr, sales: 0, profit: 0 })
        }

        // Add sales data to the corresponding date
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
    }

    // --- POST REQUESTS ---
    if (method === 'POST') {
      // 1. /sales
      if (cleanUrl === '/sales') {
        // Replicate calculations of SalesService.create
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

        // Apply overall discount if any
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
          saleType: requestData.saleType || 'POS',
          paymentMethod: requestData.paymentMethod || 'CASH',
          discountType: requestData.discountType || null,
          discountValue: requestData.discountValue || 0,
          amountPaid: requestData.paymentMethod === 'CREDIT' ? amountPaid : null,
          dueAmount: requestData.paymentMethod === 'CREDIT' ? dueAmount : null,
          updatedAt: new Date().toISOString()
        }

        // Insert sale
        const { data: sale, error: saleErr } = await supabase
          .from('sales')
          .insert(sanitizedSale)
          .select()
          .single()
        if (saleErr) throw saleErr

        // Insert items
        const saleItems = requestData.items.map((item: any) => ({
          id: item.id || generateUUID(),
          saleId: sale.id,
          inventoryId: item.inventoryId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.unitPrice * (1 - (item.discount || 0) / 100) * item.quantity,
          discount: item.discount || 0
        }))
        const { error: itemsErr } = await supabase
          .from('sale_items')
          .insert(saleItems)
        if (itemsErr) throw itemsErr

        // Update inventory items
        for (const item of requestData.items) {
          const { data: invItem } = await supabase
            .from('inventory_items')
            .select('quantity')
            .eq('id', item.inventoryId)
            .single()
          if (invItem) {
            const newQty = Math.max(0, invItem.quantity - item.quantity)
            await supabase
              .from('inventory_items')
              .update({ quantity: newQty, updatedAt: new Date().toISOString() })
              .eq('id', item.inventoryId)
          }
        }

        // Add cash box entry if cash sale
        const cashReceivedNow = requestData.paymentMethod === 'CREDIT' ? amountPaid : totalAmount
        if (cashReceivedNow > 0) {
          await supabase.from('cash_box_entries').insert({
            id: generateUUID(),
            tenantId,
            entryType: 'SALE_IN',
            amount: cashReceivedNow,
            note: `Sale #${sale.receiptNumber} — ${requestData.paymentMethod || 'CASH'}`,
            referenceId: sale.id,
            createdById: userId,
            entryDate: sale.saleTime,
            updatedAt: new Date().toISOString()
          })
        }

        return formatResponse(sale)
      }

      // 2. /inventory
      if (cleanUrl === '/inventory') {
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

        // Auto-cataloging
        if (!variantId && itemName) {
          // 1. Create Product
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

          // 2. Create Variant
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

        // Derived itemName
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

        // Generate batch number
        let batchNo = providedBatchNo
        if (!batchNo) {
          const now = new Date()
          const dd = String(now.getDate()).padStart(2, '0')
          const mm = String(now.getMonth() + 1).padStart(2, '0')
          const yyyy = String(now.getFullYear())
          const dateKey = `${dd}-${mm}-${yyyy}`
          const prefix = `BATCH-${dateKey}-`

          // Search existing batches on this date
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

        // Try to merge if variantId is present
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

        // Cash box entries
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

      // 3. /expenses/categories
      if (cleanUrl === '/expenses/categories') {
        const catId = requestData.id || generateUUID()
        const { data: cat, error } = await supabase
          .from('expense_categories')
          .insert({
            id: catId,
            name: requestData.name,
            description: requestData.description,
            tenantId: tenantId,
            updatedAt: new Date().toISOString()
          })
          .select()
          .single()
        if (error) throw error
        return formatResponse(cat)
      }

      // 4. /expenses
      if (cleanUrl === '/expenses') {
        const expenseId = requestData.id || generateUUID()
        const sanitized = {
          id: expenseId,
          ...sanitizeExpense({
            ...requestData,
            tenantId: tenantId,
            employeeId: userId
          })
        }

        const { data: expense, error: expErr } = await supabase
          .from('expenses')
          .insert(sanitized)
          .select()
          .single()
        if (expErr) throw expErr

        // Add cashbox entry
        await supabase.from('cash_box_entries').insert({
          id: generateUUID(),
          tenantId: tenantId,
          entryType: 'EXPENSE_OUT',
          amount: sanitized.amount,
          note: `Expense: ${sanitized.description || 'No description'}`,
          referenceId: expense.id,
          createdById: userId,
          entryDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })

        return formatResponse(expense)
      }

      // 5. /cash-box/entries
      if (cleanUrl === '/cash-box/entries') {
        const entryId = requestData.id || generateUUID()
        const sanitized = {
          id: entryId,
          ...sanitizeCashBoxEntry({
            ...requestData,
            tenantId: tenantId,
            createdById: userId
          })
        }

        const { data: entry, error } = await supabase
          .from('cash_box_entries')
          .insert(sanitized)
          .select()
          .single()
        if (error) throw error
        return formatResponse(entry)
      }

      // 6. /credits/:saleId/payments
      if (parts[0] === 'credits' && parts[2] === 'payments') {
        const saleId = parts[1]
        const paymentId = requestData.id || generateUUID()
        const { data: payment, error } = await supabase
          .from('credit_payments')
          .insert({
            id: paymentId,
            saleId,
            amount: requestData.amount,
            note: requestData.note,
            tenantId: tenantId,
            createdById: userId,
            paymentDate: new Date().toISOString()
          })
          .select()
          .single()
        if (error) throw error

        // Update sale due amount
        const { data: sale } = await supabase
          .from('sales')
          .select('amountPaid, dueAmount')
          .eq('id', saleId)
          .single()
        if (sale) {
          const newPaid = (sale.amountPaid || 0) + requestData.amount
          const newDue = Math.max(0, (sale.dueAmount || 0) - requestData.amount)
          await supabase
            .from('sales')
            .update({ amountPaid: newPaid, dueAmount: newDue, updatedAt: new Date().toISOString() })
            .eq('id', saleId)
        }

        return formatResponse(payment)
      }
    }

    // --- PUT / PATCH REQUESTS ---
    if (method === 'PUT' || method === 'PATCH') {
      // 1. /inventory/:id or /inventory
      const isInventoryPath = parts[0] === 'inventory'
      if (isInventoryPath) {
        const invId = parts[1] || requestData.id
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

      // 2. /expenses/categories/:id
      if (parts[0] === 'expenses' && parts[1] === 'categories' && parts[2]) {
        const catId = parts[2]
        const { data: cat, error } = await supabase
          .from('expense_categories')
          .update({
            name: requestData.name,
            description: requestData.description,
            updatedAt: new Date().toISOString()
          })
          .eq('id', catId)
          .select()
          .single()
        if (error) throw error
        return formatResponse(cat)
      }

      // 3. /expenses/:id
      if (parts[0] === 'expenses' && parts[1] && parts[1] !== 'categories' && parts[1] !== 'summary') {
        const expId = parts[1]
        const sanitized = sanitizeUpdate(sanitizeExpense, requestData)
        const { data: expense, error } = await supabase
          .from('expenses')
          .update(sanitized)
          .eq('id', expId)
          .select()
          .single()
        if (error) throw error
        return formatResponse(expense)
      }
    }

    // --- DELETE REQUESTS ---
    if (method === 'DELETE') {
      // 1. /inventory/:id
      if (parts[0] === 'inventory' && parts[1]) {
        const invId = parts[1]
        const { error } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', invId)
        if (error) throw error
        return formatResponse({ success: true })
      }

      // 2. /expenses/categories/:id
      if (parts[0] === 'expenses' && parts[1] === 'categories' && parts[2]) {
        const catId = parts[2]
        const { error } = await supabase
          .from('expense_categories')
          .delete()
          .eq('id', catId)
        if (error) throw error
        return formatResponse({ success: true })
      }

      // 3. /expenses/:id
      if (parts[0] === 'expenses' && parts[1]) {
        const expId = parts[1]
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', expId)
        if (error) throw error
        return formatResponse({ success: true })
      }

      // 4. /cash-box/entries/:id
      if (parts[0] === 'cash-box' && parts[1] === 'entries' && parts[2]) {
        const entryId = parts[2]
        const { error } = await supabase
          .from('cash_box_entries')
          .delete()
          .eq('id', entryId)
        if (error) throw error
        return formatResponse({ success: true })
      }
    }

    throw new Error(`Unsupported API route: ${method} ${cleanUrl}`)
  } catch (error: any) {
    console.error(`[Serverless-API Error] ${method} ${url}:`, error)
    // Map to AxiosError-like structure
    const status = error.status || 500
    const errObj: any = new Error(error.message || 'API request failed')
    errObj.response = {
      status,
      data: { message: error.message || 'Internal API Error' }
    }
    throw errObj
  }
}

// Custom Axios-like API client implementation
const api = {
  get: <T = any>(url: string, config?: any): Promise<{ data: T }> => {
    return handleRequest('GET', url + (config?.params ? '?' + new URLSearchParams(config.params).toString() : ''))
  },
  post: <T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> => {
    return handleRequest('POST', url, data)
  },
  put: <T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> => {
    return handleRequest('PUT', url, data)
  },
  patch: <T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> => {
    return handleRequest('PATCH', url, data)
  },
  delete: <T = any>(url: string, config?: any): Promise<{ data: T }> => {
    return handleRequest('DELETE', url)
  },
  interceptors: {
    request: { use: () => {} },
    response: { use: () => {} }
  }
}

if (typeof window !== 'undefined') {
  (window as any).api = api
}

export default api
