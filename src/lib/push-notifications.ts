// Push notification utilities
import { supabase } from './supabase';

// VAPID public key - this should be generated and stored securely
// For now, using a placeholder - in production, this should come from environment variables
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLrUjHLOCUxVLLyDaaA3JrfhPECE2m_NrsSPwHqKdOAhqbsVNSfJQkk';

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
  try {
    // Check if service worker and push manager are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported');
      return false;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Already subscribed to push notifications');
      await savePushSubscription(userId, existingSubscription);
      return true;
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Save subscription to database
    await savePushSubscription(userId, subscription);
    
    console.log('Successfully subscribed to push notifications');
    return true;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(userId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      await removePushSubscription(userId);
      console.log('Successfully unsubscribed from push notifications');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

/**
 * Save push subscription to database
 */
async function savePushSubscription(userId: string, subscription: PushSubscription): Promise<void> {
  try {
    const subscriptionData = {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh_key: subscription.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))) : null,
      auth_key: subscription.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // First try to update existing subscription
    const { error: updateError } = await supabase
      .from('push_subscriptions')
      .update(subscriptionData as never)
      .eq('user_id', userId);

    // If no rows were updated, insert new subscription
    if (updateError || updateError?.code === 'PGRST116') {
      const { error: insertError } = await supabase
        .from('push_subscriptions')
        .insert(subscriptionData as never);
        
      if (insertError) {
        console.error('Failed to save push subscription:', insertError);
      }
    }
  } catch (error) {
    console.error('Error saving push subscription:', error);
  }
}

/**
 * Remove push subscription from database
 */
async function removePushSubscription(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);
      
    if (error) {
      console.error('Failed to remove push subscription:', error);
    }
  } catch (error) {
    console.error('Error removing push subscription:', error);
  }
}

/**
 * Check if push notifications are supported and enabled
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Get current push notification permission status
 */
export function getPushNotificationPermission(): NotificationPermission {
  return Notification.permission;
}

/**
 * Request push notification permission
 */
export async function requestPushNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    return 'denied';
  }
  
  return await Notification.requestPermission();
}