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

export function registerUserRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/users/me', getCurrentUser)
  router.register('GET', '/users/search', searchUsers)
}
