import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications, 
  isPushNotificationSupported,
  requestPushNotificationPermission 
} from '../lib/push-notifications';

interface NotificationLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export default function TestNotifications() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [subscription, setSubscription] = useState<unknown>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [pushSupported, setPushSupported] = useState<boolean>(false);
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const newLog: NotificationLog = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [newLog, ...prev.slice(0, 19)]); // Keep last 20 logs
  };

  const setupRealtimeTest = () => {
    if (!user?.auth_id) {
      addLog('❌ No user authenticated', 'error');
      return;
    }

    addLog('🔄 Setting up realtime subscription...', 'info');
    
    const channel = supabase
      .channel('test-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.auth_id}`,
        },
        (payload) => {
          addLog(`✅ Realtime notification received: ${JSON.stringify(payload.new)}`, 'success');
        }
      )
      .subscribe((status) => {
        setConnectionStatus(status);
        addLog(`📡 Subscription status: ${status}`, status === 'SUBSCRIBED' ? 'success' : 'info');
      });

    setSubscription(channel);
  };

  const createTestNotification = async () => {
    if (!user?.auth_id) {
      addLog('❌ No user authenticated', 'error');
      return;
    }

    addLog('Creating test notification...', 'info');
    
    try {
      // Simple approach - just try to insert and handle any errors
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.auth_id,
          title: 'Test Notification',
          message: `Test message created at ${new Date().toLocaleTimeString()}`,
          type: 'vessel_transaction',
          related_id: 'test-id',
          is_read: false
        } as never);

      if (error) {
        addLog(`❌ Error creating notification: ${error.message}`, 'error');
      } else {
        addLog(`✅ Test notification created successfully`, 'success');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`❌ Exception: ${errorMessage}`, 'error');
    }
  };

  const checkNotificationPermission = async () => {
    if (!('Notification' in window)) {
      addLog('❌ Browser notifications not supported', 'error');
      return;
    }

    const permission = Notification.permission;
    addLog(`🔔 Current notification permission: ${permission}`, 'info');

    if (permission === 'default') {
      const result = await Notification.requestPermission();
      addLog(`🔔 Permission request result: ${result}`, result === 'granted' ? 'success' : 'error');
    }
  };

  const testBrowserNotification = () => {
    if (!('Notification' in window)) {
      addLog('❌ Browser notifications not supported', 'error');
      return;
    }

    if (Notification.permission !== 'granted') {
      addLog('❌ Notification permission not granted', 'error');
      return;
    }

    const notification = new Notification('Test Notification', {
      body: 'This is a test browser notification',
      icon: '/favicon.ico'
    });

    notification.onclick = () => {
      addLog('🖱️ Browser notification clicked', 'info');
      notification.close();
    };

    addLog('✅ Browser notification sent', 'success');
  };

  const cleanup = () => {
    if (subscription && typeof subscription === 'object' && subscription !== null && 'unsubscribe' in subscription) {
      (subscription as { unsubscribe: () => void }).unsubscribe();
      setSubscription(null);
      setConnectionStatus('Disconnected');
      addLog('Cleaned up realtime subscription', 'info');
    }
  };

  const handlePushSubscription = async () => {
    if (!user?.auth_id) {
      addLog('❌ User not authenticated', 'error');
      return;
    }

    try {
      if (pushSubscribed) {
        // Unsubscribe
        addLog('🔄 Unsubscribing from push notifications...', 'info');
        const success = await unsubscribeFromPushNotifications(user.auth_id);
        if (success) {
          setPushSubscribed(false);
          addLog('✅ Successfully unsubscribed from push notifications', 'success');
        } else {
          addLog('❌ Failed to unsubscribe from push notifications', 'error');
        }
      } else {
        // Subscribe
        addLog('🔄 Requesting push notification permission...', 'info');
        const permission = await requestPushNotificationPermission();
        if (permission === 'granted') {
          addLog('🔄 Subscribing to push notifications...', 'info');
          const success = await subscribeToPushNotifications(user.auth_id);
          if (success) {
            setPushSubscribed(true);
            addLog('✅ Successfully subscribed to push notifications', 'success');
          } else {
            addLog('❌ Failed to subscribe to push notifications', 'error');
          }
        } else {
          addLog(`❌ Push notification permission ${permission}`, 'error');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Push subscription error: ${errorMessage}`, 'error');
    }
  };

  useEffect(() => {
    // Check push notification support
    const supported = isPushNotificationSupported();
    setPushSupported(supported);
    
    // Check if already subscribed
    if (supported && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setPushSubscribed(!!subscription);
      });
    }

    return () => {
      cleanup();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔔 Notification Testing Dashboard
          </h1>

          {/* Status Section */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">📊 Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium">User:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user ? `${user.email} (${user.auth_id})` : 'Not authenticated'}
                </span>
              </div>
              <div>
                <span className="font-medium">Realtime:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  connectionStatus === 'SUBSCRIBED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {connectionStatus}
                </span>
              </div>
              <div>
                <span className="font-medium">Browser Notifications:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  Notification?.permission === 'granted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {Notification?.permission || 'Not supported'}
                </span>
              </div>
              <div>
                <span className="font-medium">Push Notifications:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  pushSupported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {pushSupported ? (pushSubscribed ? 'Subscribed' : 'Not subscribed') : 'Not supported'}
                </span>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">🎮 Controls</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={setupRealtimeTest}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                disabled={!user}
              >
                🔄 Setup Realtime Test
              </button>
              
              <button
                onClick={createTestNotification}
                className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                disabled={!user}
              >
                ➕ Create Test Notification
              </button>
              
              <button
                onClick={checkNotificationPermission}
                className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
              >
                🔔 Check Browser Permission
              </button>
              
              <button
                onClick={testBrowserNotification}
                className="w-full bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
              >
                🚀 Test Browser Notification
              </button>
              
              <button
                onClick={handlePushSubscription}
                className={`w-full px-4 py-2 rounded text-white ${
                  pushSubscribed ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
                }`}
                disabled={!pushSupported || !user}
              >
                {pushSubscribed ? '🔕 Unsubscribe from Push' : '🔔 Subscribe to Push'}
              </button>
              
              <button
                onClick={cleanup}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                🧹 Cleanup
              </button>
              
              <button
                onClick={() => setLogs([])}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                🗑️ Clear Logs
              </button>
            </div>
          </div>

          {/* Logs Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4">📝 Logs</h2>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Start testing to see activity...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={`mb-1 ${
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'success' ? 'text-green-400' : 
                    'text-blue-400'
                  }`}>
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  }