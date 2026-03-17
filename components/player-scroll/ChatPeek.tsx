/**
 * ChatPeek — Latest chat message preview for player home scroll.
 * Shows real last message from team chat channel. Tap → team chat.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { FONTS } from '@/theme/fonts';

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
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [senderName, setSenderName] = useState<string | null>(null);
  const [timeAgo, setTimeAgo] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;

    (async () => {
      // Find team's chat channel
      const { data: channel } = await supabase
        .from('chat_channels')
        .select('id')
        .eq('team_id', teamId)
        .limit(1)
        .maybeSingle();

      if (!channel) return;
      setChannelId(channel.id);

      // Fetch last message
      const { data: msg } = await supabase
        .from('chat_messages')
        .select('content, created_at, sender_id')
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (msg) {
        setLastMessage(msg.content || 'Sent a message');

        // Get sender name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', msg.sender_id)
          .maybeSingle();
        setSenderName(profile?.full_name?.split(' ')[0] || null);

        // Time ago
        const diff = Date.now() - new Date(msg.created_at).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) setTimeAgo(`${mins}m`);
        else if (mins < 1440) setTimeAgo(`${Math.floor(mins / 60)}h`);
        else setTimeAgo(`${Math.floor(mins / 1440)}d`);
      }
    })();
  }, [teamId]);

  const handlePress = () => {
    if (channelId) {
      router.push(`/chat/${channelId}` as any);
    } else {
      router.push('/(tabs)/chats' as any);
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.row} onPress={handlePress}>
      <Text style={styles.icon}>{'\u{1F4AC}'}</Text>
      <View style={styles.content}>
        {lastMessage ? (
          <>
            <Text style={styles.messageText} numberOfLines={1}>
              {senderName ? `${senderName}: ` : ''}{lastMessage}
            </Text>
            {timeAgo && <Text style={styles.timeText}>{timeAgo}</Text>}
          </>
        ) : (
          <Text style={styles.emptyText}>
            {channelId ? 'Team Chat' : teamId ? 'No team chat yet' : 'Chat'}
          </Text>
        )}
      </View>
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
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageText: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PT.textSecondary,
  },
  timeText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: PT.textFaint,
  },
  emptyText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PT.textMuted,
  },
  arrow: {
    fontSize: 18,
    color: PT.textFaint,
  },
});
