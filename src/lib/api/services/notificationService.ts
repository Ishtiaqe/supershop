import { supabase } from '@/lib/supabase'

interface PushNotificationPayload {
  title: string
  body: string
  data?: Record<string, any>
}

export async function sendPushNotificationToTenant(
  tenantId: string,
  payload: PushNotificationPayload
) {
  try {
    // Get all push subscriptions for the tenant
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('tenant_id', tenantId)

    if (error) throw error
    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for tenant:', tenantId)
      return { sent: 0, failed: 0 }
    }

    // For now, we'll log the notifications. In production, this would call
    // a Supabase Edge Function or external service (FCM/APNs) to send actual push notifications
    console.log('Sending push notification to', subscriptions.length, 'devices:', payload)

    // TODO: Integrate with actual push notification service
    // For native apps using Capacitor, you would typically:
    // 1. Use Firebase Cloud Messaging (FCM) for Android
    // 2. Use Apple Push Notification Service (APNs) for iOS
    // 3. Use web push for web browsers
    // This would be done via a Supabase Edge Function

    return { sent: subscriptions.length, failed: 0 }
  } catch (error) {
    console.error('Failed to send push notification:', error)
    return { sent: 0, failed: 1 }
  }
}

export async function sendShortlistAddedNotification(
  tenantId: string,
  itemName: string,
  currentQty: number
) {
  return sendPushNotificationToTenant(tenantId, {
    title: 'Item Added to Shortlist',
    body: `${itemName} has been added to shortlist. Current stock: ${currentQty}`,
    data: {
      type: 'shortlist_added',
      itemName,
      currentQty
    }
  })
}

export async function sendShortlistRemovedNotification(
  tenantId: string,
  itemName: string,
  currentQty: number
) {
  return sendPushNotificationToTenant(tenantId, {
    title: 'Item Removed from Shortlist',
    body: `${itemName} has been removed from shortlist. Current stock: ${currentQty}`,
    data: {
      type: 'shortlist_removed',
      itemName,
      currentQty
    }
  })
}
