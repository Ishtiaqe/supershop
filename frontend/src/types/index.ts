export interface User {
  id: string
  email: string
  fullName: string
  phone?: string
  role: 'SUPER_ADMIN' | 'OWNER' | 'EMPLOYEE'
  tenantId?: string
}

export interface Tenant {
  id: string
  name: string
  registrationNumber?: string
  addressStreet?: string
  addressCity?: string
  addressZone?: string
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  preferences?: Record<string, unknown>
  theme?: Record<string, unknown>
  latitude?: number
  longitude?: number
}

export interface Product {
  id: string
  name: string
  description?: string
  brandId?: string
  categoryId?: string
}

export interface ProductVariant {
  id: string
  productId: string
  variantName: string
  sku: string
  retailPrice: number
}

export interface InventoryItem {
  id: string
  tenantId: string
  variantId?: string
  itemName?: string
  quantity: number
  purchasePrice: number
  retailPrice: number
  maxDiscountRate: number
  expiryDate?: Date
  mfgDate?: Date
  batchNo?: string
}

export interface Sale {
  id: string
  tenantId: string
  employeeId: string
  receiptNumber: string
  saleTime: Date
  totalAmount: number
  totalProfit: number
  customerName?: string
  customerPhone?: string
  saleType: 'POS' | 'ONLINE' | 'WHOLESALE'
  paymentMethod: 'CASH' | 'CARD' | 'MOBILE_PAYMENT' | 'OTHER'
  discountType?: 'PERCENTAGE' | 'FIXED'
  discountValue?: number
}

export interface SaleItem {
  id: string
  saleId: string
  inventoryId: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface DashboardMetrics {
  overview: {
    totalRevenue: number
    totalSales: number
  }
  inventory: {
    totalItems: number
    lowStockItems: number
    expiringItems: number
  }
}
