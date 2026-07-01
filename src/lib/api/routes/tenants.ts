import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID } from '../utils'
import { RouteHandler } from '../types'

const getTenants: RouteHandler = async () => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return formatResponse(data || [])
}

const createTenant: RouteHandler = async ({ requestData }) => {
  const { name, ownerId } = requestData
  const { data: owner, error: ownerErr } = await supabase
    .from('users')
    .select('id, tenantId')
    .eq('id', ownerId)
    .single()
  if (ownerErr || !owner) throw new Error('Owner not found')
  if (owner.tenantId) throw new Error('Owner already has a tenant')

  const id = generateUUID()
  const { data: tenant, error } = await supabase
    .from('tenants')
    .insert({
      id,
      name,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select()
    .single()
  if (error) throw error

  await supabase.from('users').update({ tenantId: id }).eq('id', ownerId)
  return formatResponse(tenant)
}

const updateTenant: RouteHandler = async ({ userId, params, requestData }) => {
  const tenantId = params.id
  const { data: currentUser } = await supabase.from('users').select('role, tenantId').eq('id', userId).single()
  if (!currentUser) throw new Error('Unauthorized')
  if (currentUser.role !== 'SUPER_ADMIN' && currentUser.tenantId !== tenantId) {
    throw new Error('Insufficient permissions')
  }

  const updateData: any = { updatedAt: new Date().toISOString() }
  if (requestData.name !== undefined) updateData.name = requestData.name
  if (requestData.addressStreet !== undefined) updateData.addressStreet = requestData.addressStreet
  if (requestData.addressCity !== undefined) updateData.addressCity = requestData.addressCity
  if (requestData.addressZone !== undefined) updateData.addressZone = requestData.addressZone
  if (requestData.status !== undefined) updateData.status = requestData.status

  const { data, error } = await supabase
    .from('tenants')
    .update(updateData)
    .eq('id', tenantId)
    .select()
    .single()
  if (error) throw error
  return formatResponse(data)
}

const setupTenant: RouteHandler = async ({ userId, requestData }) => {
  const { data: user } = await supabase.from('users').select('role, tenantId').eq('id', userId).single()
  if (!user) throw new Error('User not found')
  if (user.role !== 'OWNER') throw new Error('Only owners can setup a tenant')
  if (user.tenantId) throw new Error('User already belongs to a tenant')

  const id = generateUUID()
  const { data: tenant, error } = await supabase
    .from('tenants')
    .insert({
      id,
      name: requestData.name,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select()
    .single()
  if (error) throw error

  const { data: updatedUser, error: userErr } = await supabase
    .from('users')
    .update({ tenantId: id })
    .eq('id', userId)
    .select()
    .single()
  if (userErr) throw userErr

  return formatResponse({
    tenant,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      tenantId: updatedUser.tenantId
    }
  })
}

export function registerTenantRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/tenants', getTenants)
  router.register('POST', '/tenants', createTenant)
  router.register('PATCH', '/tenants/:id', updateTenant)
  router.register('POST', '/tenants/setup', setupTenant)
}
