import { supabase } from '@/lib/supabase'
import { formatResponse } from '../utils'
import { RouteHandler } from '../types'

const getCurrentUser: RouteHandler = async () => {
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

const searchUsers: RouteHandler = async ({ tenantId, query }) => {
  const q = query.get('q') || ''
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('tenantId', tenantId)
    .or(`email.ilike.%${q}%,fullName.ilike.%${q}%`)
    .limit(20)
  if (error) throw error
  return formatResponse(data || [])
}

const updateMe: RouteHandler = async ({ userId, requestData }) => {
  const updateData: any = { updatedAt: new Date().toISOString() }
  if (requestData.fullName !== undefined) updateData.fullName = requestData.fullName
  if (requestData.phone !== undefined) updateData.phone = requestData.phone

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return formatResponse(data)
}

const updateUser: RouteHandler = async ({ userId, params, requestData }) => {
  const targetId = params.id
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', userId).single()
  if (!currentUser) throw new Error('Unauthorized')
  if (targetId !== userId && currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'OWNER') {
    throw new Error('Insufficient permissions')
  }

  const updateData: any = { updatedAt: new Date().toISOString() }
  if (requestData.fullName !== undefined) updateData.fullName = requestData.fullName
  if (requestData.phone !== undefined) updateData.phone = requestData.phone
  if (requestData.email !== undefined && requestData.email !== '') updateData.email = requestData.email

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', targetId)
    .select()
    .single()
  if (error) throw error
  return formatResponse(data)
}

const deleteUser: RouteHandler = async ({ userId, params }) => {
  const targetId = params.id
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', userId).single()
  if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'OWNER')) {
    throw new Error('Insufficient permissions')
  }
  const { error } = await supabase.from('users').delete().eq('id', targetId)
  if (error) throw error
  return formatResponse({ success: true })
}

const changeMyPassword: RouteHandler = async ({ userId, requestData }) => {
  const { newPassword } = requestData
  if (!newPassword) throw new Error('New password is required')
  const { error: authError } = await supabase.auth.updateUser({ password: newPassword })
  if (authError) throw authError
  await supabase.from('users').update({ password: newPassword }).eq('id', userId)
  return formatResponse({ message: 'Password changed successfully' })
}

const changeUserPassword: RouteHandler = async ({ userId, params, requestData }) => {
  const targetId = params.id
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', userId).single()
  if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
    throw new Error('Only super admin can change other user passwords')
  }
  const { newPassword } = requestData
  if (!newPassword) throw new Error('New password is required')
  const { error } = await supabase.from('users').update({ password: newPassword }).eq('id', targetId)
  if (error) throw error
  return formatResponse({ message: 'Password changed successfully' })
}

export function registerUserRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/users/me', getCurrentUser)
  router.register('GET', '/users/search', searchUsers)
  router.register('PUT', '/users/me', updateMe)
  router.register('PUT', '/users/:id', updateUser)
  router.register('DELETE', '/users/:id', deleteUser)
  router.register('POST', '/users/me/change-password', changeMyPassword)
  router.register('POST', '/users/:id/change-password', changeUserPassword)
}
