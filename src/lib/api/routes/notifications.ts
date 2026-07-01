import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID } from '../utils'
import { RouteHandler } from '../types'

const subscribe: RouteHandler = async ({ userId, requestData }) => {
  const { endpoint, keys } = requestData
  if (!endpoint) throw new Error('Subscription endpoint is required')

  const { data, error } = await supabase
    .from('push_subscriptions')
    .insert({
      id: generateUUID(),
      userId,
      endpoint,
      keys: keys || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select()
    .single()
  if (error) throw error
  return formatResponse(data)
}

export function registerNotificationRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('POST', '/notifications/subscribe', subscribe)
}
