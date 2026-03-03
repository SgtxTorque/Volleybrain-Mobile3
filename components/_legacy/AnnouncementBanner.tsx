import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Alert = {
  id: string;
  title: string;
  body: string;
  priority: string;
};

type Props = {
  alerts: Alert[];
  userId: string;
  onDismiss: (id: string) => void;
};

export default function AnnouncementBanner({ alerts, userId, onDismiss }: Props) {
  const { colors } = useTheme();

  if (alerts.length === 0) return null;

  const top = alerts[0];
  const isUrgent = top.priority === 'urgent';
  const accentColor = isUrgent ? colors.danger : colors.info;

  const handleDismiss = async () => {
    try {
      await supabase.from('announcement_reads').insert({
        announcement_id: top.id,
        user_id: userId,
        read_at: new Date().toISOString(),
      });
    } catch (e) {
      // Dismiss locally even if write fails
    }
    onDismiss(top.id);
  };

  const s = createStyles(colors, accentColor);

  return (
    <View style={s.container}>
      <View style={s.banner}>
        <View style={s.iconWrap}>
          <Ionicons
            name={isUrgent ? 'warning' : 'megaphone'}
            size={20}
            color={accentColor}
          />
        </View>
        <View style={s.content}>
          <Text style={s.title} numberOfLines={1}>{top.title}</Text>
          <Text style={s.body} numberOfLines={2}>{top.body}</Text>
        </View>
        <TouchableOpacity style={s.dismissBtn} onPress={handleDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      {alerts.length > 1 && (
        <Text style={s.moreText}>+{alerts.length - 1} more alert{alerts.length - 1 !== 1 ? 's' : ''}</Text>
      )}
    </View>
  );
}

const createStyles = (colors: any, accentColor: string) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: accentColor + '10',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: accentColor + '30',
      padding: 14,
      gap: 12,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
        android: { elevation: 3 },
      }),
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: accentColor + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    body: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    dismissBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    moreText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 6,
    },
  });
