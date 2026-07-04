import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID } from '../utils'
import { RouteHandler } from '../types'

const getCustomers: RouteHandler = async ({ tenantId, query }) => {
  const q = query.get('q') || ''
  const limit = Number(query.get('limit') || '100')
  const offset = Number(query.get('offset') || '0')

  let dbQuery = supabase
    .from('customers')
    .select('*')
    .eq('tenantId', tenantId)

  if (q) {
    dbQuery = dbQuery.or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
  }

  const { data, error } = await dbQuery
    .order('createdAt', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return formatResponse(data || [])
}

const getCustomerById: RouteHandler = async ({ tenantId, params }) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .eq('tenantId', tenantId)
    .single()

  if (error) throw error
  return formatResponse(data)
}

const getCustomerBalance: RouteHandler = async ({ tenantId, params }) => {
  const { data: sales, error } = await supabase
    .from('sales')
    .select('id, dueAmount, amountPaid, totalAmount, saleTime')
    .eq('tenantId', tenantId)
    .eq('customerId', params.id)
    .gt('dueAmount', 0)
    .order('saleTime', { ascending: false })

  if (error) throw error

  const totalOutstanding = (sales || []).reduce((sum, s) => sum + (s.dueAmount || 0), 0)
  return formatResponse({
    totalOutstanding,
    outstandingSales: sales || [],
    outstandingCount: sales?.length || 0,
  })
}

const createCustomer: RouteHandler = async ({ tenantId, requestData }) => {
  const id = requestData.id || generateUUID()
  const { data, error } = await supabase
    .from('customers')
    .insert({
      id,
      tenantId,
      name: requestData.name,
      phone: requestData.phone || null,
      email: requestData.email || null,
      address: requestData.address || null,
      creditLimit: requestData.creditLimit ?? null,
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return formatResponse(data)
}

const updateCustomer: RouteHandler = async ({ params, requestData }) => {
  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() }
  if (requestData.name !== undefined) updateData.name = requestData.name
  if (requestData.phone !== undefined) updateData.phone = requestData.phone
  if (requestData.email !== undefined) updateData.email = requestData.email
  if (requestData.address !== undefined) updateData.address = requestData.address
  if (requestData.creditLimit !== undefined) updateData.creditLimit = requestData.creditLimit

  const { data, error } = await supabase
    .from('customers')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) throw error
  return formatResponse(data)
}

const deleteCustomer: RouteHandler = async ({ params }) => {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', params.id)

  if (error) throw error
  return formatResponse({ success: true })
}

export function registerCustomersRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/customers', getCustomers)
  router.register('GET', '/customers/:id', getCustomerById)
  router.register('GET', '/customers/:id/balance', getCustomerBalance)
  router.register('POST', '/customers', createCustomer)
  router.register('PUT', '/customers/:id', updateCustomer)
  router.register('DELETE', '/customers/:id', deleteCustomer)
}
