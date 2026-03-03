/**
 * ChatPeek — Latest chat message preview or "No team chat yet" ambient text.
 * Phase 4C: Single flat row, navigates to team chat channel.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const PT = {
  textSecondary: 'rgba(255,255,255,0.60)',
  textMuted: 'rgba(255,255,255,0.30)',
  textFaint: 'rgba(255,255,255,0.15)',
};

type Props = {
  teamId?: string | null;
};

export default function ChatPeek({ teamId }: Props) {
  const router = useRouter();
  const [channelId, setChannelId] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    supabase
      .from('chat_channels')
      .select('id')
      .eq('team_id', teamId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setChannelId(data.id);
      });
  }, [teamId]);

  const handlePress = () => {
    if (channelId) {
      router.push(`/chat/${channelId}` as any);
    } else {
      router.push('/(tabs)/chats' as any);
    }
  };

  const label = channelId ? 'Team Chat' : teamId ? 'No team chat yet' : 'Chat';

  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.row} onPress={handlePress}>
      <Text style={styles.icon}>{'\u{1F4AC}'}</Text>
      <Text style={styles.text}>{label}</Text>
      <Text style={styles.arrow}>{'\u203A'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  icon: {
    fontSize: 18,
    opacity: 0.4,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: PT.textMuted,
  },
  arrow: {
    fontSize: 18,
    color: PT.textFaint,
  },
});
