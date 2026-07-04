import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID, sanitizeCashRegisterEntry } from '../utils'
import { RouteHandler } from '../types'

const getCashRegisterSummary: RouteHandler = async ({ tenantId }) => {
  const { data, error } = await supabase
    .rpc('get_cash_box_summary', { p_tenant_id: tenantId })
  if (error) throw error

  const row = data?.[0] || { cash_in: 0, cash_out: 0, current_balance: 0 }
  return formatResponse({
    cashIn: Number(row.cash_in) || 0,
    cashOut: Number(row.cash_out) || 0,
    currentBalance: Number(row.current_balance) || 0
  })
}

const getCashRegisterEntries: RouteHandler = async ({ tenantId }) => {
  const { data, error } = await supabase
    .from('cash_box_entries')
    .select('*, createdBy:users(id, fullName)')
    .eq('tenantId', tenantId)
    .order('entryDate', { ascending: false })
  if (error) throw error
  return formatResponse({ data, total: data.length, page: 1, limit: 100 })
}

const createCashRegisterEntry: RouteHandler = async ({ tenantId, userId, requestData }) => {
  const entryId = requestData.id || generateUUID()
  const sanitized = {
    id: entryId,
    ...sanitizeCashRegisterEntry({
      ...requestData,
      tenantId,
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

const deleteCashRegisterEntry: RouteHandler = async ({ params }) => {
  const entryId = params.id
  const { error } = await supabase
    .from('cash_box_entries')
    .delete()
    .eq('id', entryId)
  if (error) throw error
  return formatResponse({ success: true })
}

export function registerCashRegisterRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/cash-register/summary', getCashRegisterSummary)
  router.register('GET', '/cash-register/entries', getCashRegisterEntries)
  router.register('POST', '/cash-register/entries', createCashRegisterEntry)
  router.register('DELETE', '/cash-register/entries/:id', deleteCashRegisterEntry)
}
