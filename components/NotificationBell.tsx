import { useAuth } from '@/lib/auth';
import { getUnreadCount } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type Props = {
  size?: number;
  color?: string;
};

export default function NotificationBell({ size = 24, color }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchUnreadCount();
      
      // Subscribe to new notifications
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    const count = await getUnreadCount(user.id);
    setUnreadCount(count);
  };

  const handlePress = () => {
    router.push('/notification' as any);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        padding: 8,
        position: 'relative',
      }}
    >
      <Ionicons 
        name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} 
        size={size} 
        color={color || colors.text} 
      />
      
      {unreadCount > 0 && (
        <View style={{
          position: 'absolute',
          top: 4,
          right: 4,
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: '#FF6B6B',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 4,
        }}>
          <Text style={{
            color: '#fff',
            fontSize: 11,
            fontWeight: 'bold',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
