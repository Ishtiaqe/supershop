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
  maxDiscount: number
  expiryDate?: Date
  mfgDate?: Date
  batchNo?: string
  variant?: ProductVariant & { product: Product }
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
  employee?: { fullName?: string }
  employeeName?: string
  employeeFullName?: string
}

export interface SaleItem {
  id: string
  saleId: string
  inventoryId: string
  quantity: number
  unitPrice: number
  discount: number
  subtotal: number
}

export interface MedicineGeneric {
  id: string
  genericId?: number
  genericName: string
  slug: string
  monographLink?: string
  indicationDescription?: string
  therapeuticClassDescription?: string
  pharmacologyDescription?: string
  dosageDescription?: string
  administrationDescription?: string
  interactionDescription?: string
  contraindicationsDescription?: string
  sideEffectsDescription?: string
  pregnancyAndLactationDescription?: string
  precautionsDescription?: string
  pediatricUsageDescription?: string
  overdoseEffectsDescription?: string
  durationOfTreatmentDescription?: string
  reconstitutionDescription?: string
  storageConditionsDescription?: string
  descriptionsCount: number
  drugClassId?: string
  indicationId?: string
}

export interface MedicineManufacturer {
  id: string
  manufacturerId?: number
  manufacturerName: string
  slug: string
  genericsCount?: number
  brandNamesCount?: number
}

export interface Medicine {
  id: string
  brandId?: number
  brandName: string
  type: string
  slug: string
  dosageForm?: string
  strength?: string
  packageContainer?: string
  packSizeInfo?: string
  genericId?: string
  manufacturerId?: string
  generic?: MedicineGeneric
  manufacturer?: MedicineManufacturer
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

/**
 * API Error Response (DIP: Depend on abstraction not concrete error objects)
 */
export interface ErrorResponse {
  message: string
  code?: string
  details?: Record<string, unknown>
  statusCode?: number
}

/**
 * Generic API Response wrapper (DRY: Use across all API calls)
 */
export interface ApiResponse<T = unknown> {
  data?: T
  message?: string
  statusCode?: number
  success?: boolean
}

/**
 * Async operation state (DRY: Used by useAsyncData and similar hooks)
 */
export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: ErrorResponse | null
}

/**
 * Backup/Export related types
 */
export interface BackupStatus {
  lastBackupTime?: string
  backupSize?: number
  status: 'success' | 'pending' | 'failed'
}

export interface ExportProgress {
  current: number
  total: number
  percentage: number
  status: 'idle' | 'in-progress' | 'completed' | 'error'
}

/**
 * Form-related types (DRY: Reuse across form components)
 */
export interface FormFieldError {
  field: string
  message: string
}

export interface FormState {
  values: Record<string, unknown>
  errors: FormFieldError[]
  touched: Set<string>
  isSubmitting: boolean
}

/**
 * Modal state (DRY: Used by useModalState hook)
 */
export interface ModalState<T = unknown> {
  isOpen: boolean
  data: T | null
}
