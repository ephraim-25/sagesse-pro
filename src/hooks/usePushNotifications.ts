import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function usePushNotifications() {
  const { profile } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'denied';
    
    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted' && 'serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (err) {
        console.error('SW registration failed:', err);
      }
    }
    
    return result;
  }, [isSupported]);

  return {
    permission,
    isSupported,
    requestPermission,
  };
}
