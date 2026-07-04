import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID } from '../utils'
import { RouteHandler } from '../types'

const getActiveShift: RouteHandler = async ({ tenantId, userId }) => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*, user:users(id, fullName)')
    .eq('tenantId', tenantId)
    .eq('status', 'OPEN')
    .order('openedAt', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return formatResponse(data)
}

const getShifts: RouteHandler = async ({ tenantId, query }) => {
  const limit = Number(query.get('limit') || '20')
  const offset = Number(query.get('offset') || '0')
  const status = query.get('status')

  let dbQuery = supabase
    .from('shifts')
    .select('*, user:users(id, fullName)', { count: 'exact' })
    .eq('tenantId', tenantId)

  if (status) {
    dbQuery = dbQuery.eq('status', status)
  }

  const { data, error, count } = await dbQuery
    .order('openedAt', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return formatResponse({ data, total: count || 0, page: Math.floor(offset / limit) + 1, limit })
}

const openShift: RouteHandler = async ({ tenantId, userId, requestData }) => {
  // Check if there's already an open shift for this user
  const { data: existing } = await supabase
    .from('shifts')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('userId', userId)
    .eq('status', 'OPEN')
    .maybeSingle()
  if (existing) {
    return formatResponse({ error: 'You already have an open shift', shiftId: existing.id })
  }

  const shiftId = generateUUID()
  const { data: shift, error } = await supabase
    .from('shifts')
    .insert({
      id: shiftId,
      tenantId,
      userId,
      openingBalance: requestData.openingBalance || 0,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      note: requestData.note || null,
      updatedAt: new Date().toISOString()
    })
    .select('*, user:users(id, fullName)')
    .single()
  if (error) throw error
  return formatResponse(shift)
}

const closeShift: RouteHandler = async ({ tenantId, userId, params, requestData }) => {
  const shiftId = params.id

  // Get the shift
  const { data: shift, error: shiftErr } = await supabase
    .from('shifts')
    .select('*')
    .eq('id', shiftId)
    .eq('tenantId', tenantId)
    .single()
  if (shiftErr) throw shiftErr
  if (shift.status === 'CLOSED') {
    return formatResponse({ error: 'Shift is already closed' })
  }

  // Get cash box balance at shift close time
  const { data: cashSummary } = await supabase
    .rpc('get_cash_box_summary', { p_tenant_id: tenantId })
  const cashBalance = cashSummary?.[0]?.current_balance || 0

  // Calculate expected balance: opening + all entries during shift
  const { data: shiftEntries } = await supabase
    .from('cash_box_entries')
    .select('entryType, amount')
    .eq('tenantId', tenantId)
    .gte('entryDate', shift.openedAt)
  let shiftNet = 0
  const inflowTypes = ['SALE_IN', 'MANUAL_IN', 'NEW_INVESTMENT_IN', 'LOAN_IN', 'CREDIT_PAYMENT_IN']
  for (const e of shiftEntries || []) {
    if (inflowTypes.includes(e.entryType)) {
      shiftNet += e.amount
    } else {
      shiftNet -= e.amount
    }
  }
  const expectedBalance = (shift.openingBalance || 0) + shiftNet
  const closingBalance = requestData.closingBalance ?? 0
  const discrepancy = closingBalance - expectedBalance

  const { data: updated, error: updateErr } = await supabase
    .from('shifts')
    .update({
      status: 'CLOSED',
      closingBalance,
      expectedBalance,
      discrepancy,
      closedAt: new Date().toISOString(),
      note: requestData.note || shift.note,
      updatedAt: new Date().toISOString()
    })
    .eq('id', shiftId)
    .select('*, user:users(id, fullName)')
    .single()
  if (updateErr) throw updateErr
  return formatResponse(updated)
}

const getShiftById: RouteHandler = async ({ tenantId, params }) => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*, user:users(id, fullName)')
    .eq('id', params.id)
    .eq('tenantId', tenantId)
    .single()
  if (error) throw error
  return formatResponse(data)
}

export function registerShiftRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/shifts/active', getActiveShift)
  router.register('GET', '/shifts', getShifts)
  router.register('GET', '/shifts/:id', getShiftById)
  router.register('POST', '/shifts/open', openShift)
  router.register('POST', '/shifts/:id/close', closeShift)
}
