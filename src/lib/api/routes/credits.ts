import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID } from '../utils'
import { RouteHandler } from '../types'

const getCreditsSummary: RouteHandler = async ({ tenantId }) => {
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

const getCredits: RouteHandler = async ({ tenantId }) => {
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

const getCreditByPhone: RouteHandler = async ({ tenantId, params }) => {
  const phone = params.phone
  const { data: sales, error } = await supabase
    .from('sales')
    .select('*, creditPayments:credit_payments(*)')
    .eq('tenantId', tenantId)
    .eq('customerPhone', phone)
    .order('saleTime', { ascending: false })
  if (error) throw error
  return formatResponse(sales)
}

const createCreditPayment: RouteHandler = async ({ tenantId, userId, params, requestData }) => {
  const saleId = params.saleId
  const paymentId = requestData.id || generateUUID()
  const { data: payment, error } = await supabase
    .from('credit_payments')
    .insert({
      id: paymentId,
      saleId,
      amount: requestData.amount,
      note: requestData.note,
      tenantId,
      createdById: userId,
      paymentDate: new Date().toISOString()
    })
    .select()
    .single()
  if (error) throw error

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

export function registerCreditsRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/credits/summary', getCreditsSummary)
  router.register('GET', '/credits', getCredits)
  router.register('GET', '/credits/:phone', getCreditByPhone)
  router.register('POST', '/credits/:saleId/payments', createCreditPayment)
}
