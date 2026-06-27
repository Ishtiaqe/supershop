import { supabase } from '@/lib/supabase'
import { formatResponse } from '../utils'
import { RouteHandler } from '../types'

async function createBackup(tenantId: string) {
  const getAll = async (table: any) => {
    try {
      const query = (supabase as any).from(table).select('*').eq('tenantId', tenantId)
      const { data, error } = await query
      if (error) {
        console.error(`Backup error for ${table}:`, error)
        return []
      }
      return data || []
    } catch (e) {
      console.error(`Backup error for ${table}:`, e)
      return []
    }
  }

  const [brands, categories, suppliers, products, product_variants, inventory_items, users, sales, sale_items, expense_categories, expenses, cash_box_entries, short_list, credit_payments] = await Promise.all([
    getAll('brands'), getAll('categories'), getAll('suppliers'), getAll('products'),
    getAll('product_variants'), getAll('inventory_items'), getAll('users'), getAll('sales'),
    getAll('sale_items'), getAll('expense_categories'), getAll('expenses'), getAll('cash_box_entries'),
    getAll('short_list'), getAll('credit_payments')
  ])

  return {
    exportedAt: new Date().toISOString(),
    tenantId,
    brands, categories, suppliers, products, product_variants,
    inventory_items, users, sales, sale_items, expense_categories,
    expenses, cash_box_entries, short_list, credit_payments
  }
}

async function createUserBackup(userId: string, tenantId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .eq('tenantId', tenantId)
    .single()

  const getByUser = async (table: any, column: any) => {
    try {
      const query = (supabase as any).from(table).select('*').eq('tenantId', tenantId).eq(column, userId)
      const { data, error } = await query
      if (error) {
        console.error(`User backup error for ${table}:`, error)
        return []
      }
      return data || []
    } catch (e) {
      console.error(`User backup error for ${table}:`, e)
      return []
    }
  }

  const [sales, expenses, cash_box_entries, credit_payments, short_list] = await Promise.all([
    getByUser('sales', 'employeeId'),
    getByUser('expenses', 'employeeId'),
    getByUser('cash_box_entries', 'createdById'),
    getByUser('credit_payments', 'createdById'),
    getByUser('short_list', 'addedBy')
  ])

  let sale_items: any[] = []
  if (sales.length > 0) {
    const saleIds = sales.map((s: any) => s.id)
    const { data } = await supabase.from('sale_items').select('*, inventory:inventory_items(*)').in('saleId', saleIds)
    sale_items = data || []
  }

  return {
    userId,
    tenantId,
    exportedAt: new Date().toISOString(),
    user: user ? [user] : [],
    sales, expenses, cash_box_entries, credit_payments, short_list, sale_items
  }
}

async function restoreBackup(backup: any, tenantId: string) {
  if (!backup || typeof backup !== 'object') throw new Error('Invalid backup')

  const sanitizeRows = (rows: any) => (Array.isArray(rows) ? rows : []).map((row: any) => ({
    ...row,
    tenantId,
    updatedAt: new Date().toISOString()
  }))

  const upsert = async (table: any, rows: any) => {
    const sanitized = sanitizeRows(rows)
    if (sanitized.length === 0) return
    const { error } = await supabase.from(table as any).upsert(sanitized, { onConflict: 'id' })
    if (error) throw error
  }

  await upsert('brands', backup.brands)
  await upsert('categories', backup.categories)
  await upsert('suppliers', backup.suppliers)
  await upsert('products', backup.products)
  await upsert('product_variants', backup.product_variants)
  await upsert('users', backup.users)
  await upsert('inventory_items', backup.inventory_items)
  await upsert('sales', backup.sales)
  await upsert('sale_items', backup.sale_items)
  await upsert('expense_categories', backup.expense_categories)
  await upsert('expenses', backup.expenses)
  await upsert('cash_box_entries', backup.cash_box_entries)
  await upsert('short_list', backup.short_list)
  await upsert('credit_payments', backup.credit_payments)

  if (typeof window !== 'undefined') {
    localStorage.setItem('supershop_backup_status', JSON.stringify({
      status: 'success',
      lastBackupTime: new Date().toISOString(),
      backupSize: JSON.stringify(backup).length
    }))
  }
}

const getBackupStatus: RouteHandler = async () => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('supershop_backup_status') : null
  if (stored) {
    return formatResponse(JSON.parse(stored))
  }
  return formatResponse({ status: 'success', lastBackupTime: null, backupSize: null })
}

const exportBackup: RouteHandler = async ({ tenantId }) => {
  const backup = await createBackup(tenantId)
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  if (typeof window !== 'undefined') {
    localStorage.setItem('supershop_backup_status', JSON.stringify({
      status: 'success',
      lastBackupTime: new Date().toISOString(),
      backupSize: blob.size
    }))
  }
  return blob
}

const exportUserBackup: RouteHandler = async ({ tenantId, params }) => {
  const targetUserId = params.userId
  const backup = await createUserBackup(targetUserId, tenantId)
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  return blob
}

const importBackup: RouteHandler = async ({ tenantId, requestData }) => {
  if (typeof FormData === 'undefined' || !(requestData instanceof FormData)) throw new Error('Expected FormData')
  const file = requestData.get('file') as File
  if (!file) throw new Error('No backup file provided')
  const text = await file.text()
  const backup = JSON.parse(text)
  await restoreBackup(backup, tenantId)
  return formatResponse({ success: true })
}

export function registerBackupRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/backup/status', getBackupStatus)
  router.register('GET', '/backup/export', exportBackup)
  router.register('GET', '/backup/export-user/:userId', exportUserBackup)
  router.register('POST', '/backup/import', importBackup)
}
