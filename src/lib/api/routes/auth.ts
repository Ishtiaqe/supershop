import { supabase } from '@/lib/supabase'
import { formatResponse } from '../utils'
import { RouteHandler } from '../types'

const register: RouteHandler = async ({ requestData }) => {
  const { email, password, fullName, role, tenantId } = requestData

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()
  if (existing) throw new Error('User already exists')

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { fullName, role, tenantId }
    }
  })
  if (authError) throw authError

  const userId = authData.user?.id
  if (!userId) throw new Error('User registration failed')

  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      password: '',
      fullName: fullName || email,
      role: role || 'EMPLOYEE',
      tenantId: tenantId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select()
    .single()
  if (error) throw error
  return formatResponse(data)
}

export function registerAuthRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('POST', '/auth/register', register)
}
