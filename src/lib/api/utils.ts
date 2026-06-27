export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export const getLocalStorageData = () => {
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

export function formatResponse<T>(data: T, status = 200): any {
  return {
    data,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: {},
    config: {},
  }
}

export function matchPath(path: string, pattern: string): { matched: boolean; params: Record<string, string> } {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = path.split('/').filter(Boolean)
  const params: Record<string, string> = {}

  let pathIndex = 0
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i]

    if (part.startsWith('*')) {
      params[part.slice(1) || 'wildcard'] = pathParts.slice(pathIndex).join('/')
      return { matched: true, params }
    }

    if (pathIndex >= pathParts.length) {
      return { matched: false, params: {} }
    }

    if (part.startsWith(':')) {
      params[part.slice(1)] = pathParts[pathIndex]
      pathIndex++
      continue
    }

    if (part !== pathParts[pathIndex]) {
      return { matched: false, params: {} }
    }
    pathIndex++
  }

  if (pathIndex !== pathParts.length) {
    return { matched: false, params: {} }
  }

  return { matched: true, params }
}

export const sanitizeInventoryItem = (data: any) => ({
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
})

export const sanitizeExpense = (data: any) => ({
  tenantId: data.tenantId,
  employeeId: data.employeeId,
  categoryId: data.categoryId,
  amount: typeof data.amount === 'number' ? data.amount : 0,
  description: data.description || null,
  expenseDate: data.expenseDate || new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

export const sanitizeCashBoxEntry = (data: any) => ({
  tenantId: data.tenantId,
  entryType: data.entryType,
  amount: typeof data.amount === 'number' ? data.amount : 0,
  note: data.note || null,
  referenceId: data.referenceId || null,
  entryDate: data.entryDate || new Date().toISOString(),
  createdById: data.createdById,
  updatedAt: new Date().toISOString()
})

export const sanitizeSale = (data: any) => ({
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
})

export const sanitizeUpdate = (sanitizeFn: (d: any) => any, data: any) => {
  const sanitized = sanitizeFn(data)
  sanitized.updatedAt = new Date().toISOString()
  Object.keys(sanitized).forEach(key => {
    if (key !== 'updatedAt' && data[key] === undefined) {
      delete (sanitized as any)[key]
    }
  })
  return sanitized
}
