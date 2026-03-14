/**
 * TeamPulse — social activity feed for a team.
 * Shows game results, shoutouts, badge unlocks, posts, practice attendance.
 * Translated from v0 mockup: s5-team-pulse.tsx
 *
 * Embeddable in home scrolls or as standalone section.
 */
import React, { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';

// ─── Types ──────────────────────────────────────────────────────
type ActivityItem = {
  id: string;
  type: 'game' | 'shoutout' | 'badge' | 'post' | 'practice' | 'challenge';
  icon: string;
  text: string;
  detail?: string;
  timestamp: string;
  color: string;
};

interface TeamPulseProps {
  teamId: string | null | undefined;
  /** Max items to show (default 5) */
  limit?: number;
  /** Use dark theme (player screens) or light theme (coach screens) */
  variant?: 'dark' | 'light';
}

// ─── Helpers ────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// ─── Component ──────────────────────────────────────────────────
export default function TeamPulse({ teamId, limit = 5, variant = 'dark' }: TeamPulseProps) {
  const router = useRouter();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isDark = variant === 'dark';

  useEffect(() => {
    if (!teamId) { setLoading(false); return; }
    fetchActivity(teamId);
  }, [teamId]);

  const fetchActivity = async (tid: string) => {
    try {
      const activities: ActivityItem[] = [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoff = sevenDaysAgo.toISOString();

      // 1. Recent games with scores
      const { data: games } = await supabase
        .from('schedule_events')
        .select('id, event_date, event_type, opponent_name, our_score, opponent_score')
        .eq('team_id', tid)
        .eq('event_type', 'game')
        .not('our_score', 'is', null)
        .gte('event_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('event_date', { ascending: false })
        .limit(3);

      for (const g of (games || [])) {
        const won = (g.our_score ?? 0) > (g.opponent_score ?? 0);
        activities.push({
          id: `game-${g.id}`,
          type: 'game',
          icon: won ? '\u{1F3C6}' : '\u{1F3D0}',
          text: `${won ? 'Won' : 'Lost'} vs ${g.opponent_name || 'Opponent'}`,
          detail: `${g.our_score}-${g.opponent_score}`,
          timestamp: g.event_date + 'T12:00:00',
          color: won ? '#22C55E' : '#EF4444',
        });
      }

      // 2. Recent shoutouts
      try {
        const { data: shoutouts } = await supabase
          .from('shoutouts')
          .select('id, category, message, created_at, giver_name')
          .eq('team_id', tid)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(3);

        for (const sh of (shoutouts || [])) {
          activities.push({
            id: `shout-${sh.id}`,
            type: 'shoutout',
            icon: '\u{1F31F}',
            text: sh.giver_name
              ? `${sh.giver_name} gave a ${sh.category || 'Shoutout'}`
              : `${sh.category || 'Shoutout'} given`,
            detail: sh.message || undefined,
            timestamp: sh.created_at,
            color: '#4BB9EC',
          });
        }
      } catch { /* shoutouts table may not exist */ }

      // 3. Recent team posts
      try {
        const { data: posts } = await supabase
          .from('team_posts')
          .select('id, body, created_at, author_name')
          .eq('team_id', tid)
          .eq('is_published', true)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(2);

        for (const p of (posts || [])) {
          activities.push({
            id: `post-${p.id}`,
            type: 'post',
            icon: '\u{1F4AC}',
            text: p.author_name ? `${p.author_name} posted` : 'New post',
            detail: (p.body || '').slice(0, 80) + ((p.body || '').length > 80 ? '...' : ''),
            timestamp: p.created_at,
            color: '#A855F7',
          });
        }
      } catch { /* team_posts may not exist */ }

      // Sort by timestamp descending
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setItems(activities.slice(0, limit));
    } catch (err) {
      if (__DEV__) console.error('[TeamPulse] error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !teamId) return null;

  if (items.length === 0) {
    return (
      <View style={[s.emptyWrap, isDark ? s.darkCard : s.lightCard]}>
        <Image
          source={require('@/assets/images/mascot/Meet-Lynx.png')}
          style={{ width: 48, height: 48, opacity: 0.4 }}
          resizeMode="contain"
        />
        <Text style={[s.emptyText, isDark ? s.darkMuted : s.lightMuted]}>
          Your team's pulse will show up here as the season unfolds!
        </Text>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <Text style={[s.header, isDark ? s.darkAccent : s.lightAccent]}>TEAM PULSE</Text>
      {items.map((item) => (
        <View
          key={item.id}
          style={[s.card, isDark ? s.darkCard : s.lightCard]}
        >
          <View style={[s.iconWrap, { backgroundColor: item.color + '15' }]}>
            <Text style={s.icon}>{item.icon}</Text>
          </View>
          <View style={s.content}>
            <View style={s.topRow}>
              <Text style={[s.mainText, isDark ? s.darkText : s.lightText]} numberOfLines={1}>
                {item.text}
              </Text>
              <Text style={[s.time, isDark ? s.darkMuted : s.lightMuted]}>
                {timeAgo(item.timestamp)}
              </Text>
            </View>
            {item.detail && (
              <Text style={[s.detail, isDark ? s.darkSecondary : s.lightSecondary]} numberOfLines={2}>
                {item.detail}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    gap: 8,
  },
  header: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  mainText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    flex: 1,
  },
  time: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
  },
  detail: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    lineHeight: 17,
  },

  // Empty
  emptyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    flex: 1,
    lineHeight: 17,
  },

  // Dark theme
  darkCard: {
    backgroundColor: PLAYER_THEME.cardBg,
    borderColor: PLAYER_THEME.border,
  },
  darkText: {
    color: 'rgba(255,255,255,0.80)',
  },
  darkSecondary: {
    color: 'rgba(255,255,255,0.40)',
  },
  darkMuted: {
    color: 'rgba(255,255,255,0.20)',
  },
  darkAccent: {
    color: 'rgba(75,185,236,0.60)',
  },

  // Light theme
  lightCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8ECF2',
  },
  lightText: {
    color: '#10284C',
  },
  lightSecondary: {
    color: 'rgba(16,40,76,0.50)',
  },
  lightMuted: {
    color: 'rgba(16,40,76,0.25)',
  },
  lightAccent: {
    color: '#4BB9EC',
  },
});
