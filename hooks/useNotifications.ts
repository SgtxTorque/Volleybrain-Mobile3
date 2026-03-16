import { useState, useEffect, useCallback } from 'react';
import {
  getPlayerNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  PlayerNotification,
} from '@/lib/notification-engine';
import { supabase } from '@/lib/supabase';

export function useNotifications(overrideProfileId?: string) {
  const [notifications, setNotifications] = useState<PlayerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const profileId = overrideProfileId || user?.id;
      if (!profileId) return;

      const [notifs, count] = await Promise.all([
        getPlayerNotifications(profileId),
        getUnreadNotificationCount(profileId),
      ]);

      setNotifications(notifs);
      setUnreadCount(count);
    } catch (err) {
      if (__DEV__) console.error('[useNotifications] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [overrideProfileId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const profileId = overrideProfileId || user?.id;
    if (!profileId) return;
    await markAllNotificationsRead(profileId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [overrideProfileId]);

  return { notifications, unreadCount, loading, refreshNotifications: loadNotifications, markRead, markAllRead };
}
