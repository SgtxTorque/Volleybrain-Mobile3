// =============================================================================
// SquadComms — Squad Activity Feed for Player Dashboard
// =============================================================================
//
// Shows: teammate achievement unlocks, recent game results,
// upcoming game reminders, coach announcements. Max 10 items.

import { RARITY_CONFIG } from '@/lib/achievement-types';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// =============================================================================
// TYPES
// =============================================================================

type FeedItemAchievement = {
  type: 'achievement';
  playerName: string;
  achievementName: string;
  achievementIcon: string;
  rarity: string;
  timestamp: string;
  description: string | null;
  threshold: number | null;
  stat_key: string | null;
};

type FeedItemGameResult = {
  type: 'game_result';
  opponentName: string;
  result: string;
  ourScore: number;
  theirScore: number;
  timestamp: string;
  eventId: string;
};

type FeedItemUpcoming = {
  type: 'upcoming_game';
  opponentName: string;
  eventDate: string;
  startTime: string | null;
  location: string | null;
  timestamp: string;
};

type FeedItemAnnouncement = {
  type: 'announcement';
  title: string | null;
  content: string;
  authorName: string;
  timestamp: string;
};

type FeedItem = FeedItemAchievement | FeedItemGameResult | FeedItemUpcoming | FeedItemAnnouncement;

// =============================================================================
// COMPONENT
// =============================================================================

type Props = {
  teamId: string | null | undefined;
  playerId: string | null | undefined;
  themeColors: {
    bg: string;
    card: string;
    cardAlt: string;
    border: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    gold: string;
    neonGreen: string;
    neonBlue: string;
    neonPurple: string;
    neonRed: string;
  };
};

export default function SquadComms({ teamId, playerId, themeColors: P }: Props) {
  const router = useRouter();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teamId) {
      loadFeed();
    } else {
      setLoading(false);
    }
  }, [teamId]);

  const loadFeed = async () => {
    if (!teamId) return;
    setLoading(true);
    const items: FeedItem[] = [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
      await Promise.all([
        // 1. Teammate achievements (same team, last 30 days)
        (async () => {
          try {
            const { data: teammates } = await supabase
              .from('team_players')
              .select('player_id, players(first_name, last_name)')
              .eq('team_id', teamId);

            if (!teammates || teammates.length === 0) return;

            const teammatePlayerIds = teammates
              .map((t) => t.player_id)
              .filter((id) => id !== playerId); // Exclude self

            if (teammatePlayerIds.length === 0) return;

            const { data: achData } = await supabase
              .from('player_achievements')
              .select('player_id, earned_at, achievement_id, achievements(name, icon, rarity, description, threshold, stat_key)')
              .in('player_id', teammatePlayerIds)
              .gt('earned_at', thirtyDaysAgo)
              .order('earned_at', { ascending: false })
              .limit(5);

            if (achData) {
              const nameMap: Record<string, string> = {};
              for (const t of teammates) {
                const p = (t as any).players;
                if (p) nameMap[t.player_id] = `${p.first_name} ${p.last_name?.[0] || ''}.`;
              }

              for (const a of achData) {
                const ach = (a as any).achievements;
                if (!ach) continue;
                items.push({
                  type: 'achievement',
                  playerName: nameMap[a.player_id] || 'Teammate',
                  achievementName: ach.name || 'Achievement',
                  achievementIcon: ach.icon || '\uD83C\uDFC6',
                  rarity: ach.rarity || 'common',
                  timestamp: a.earned_at || '',
                  description: ach.description || null,
                  threshold: ach.threshold || null,
                  stat_key: ach.stat_key || null,
                });
              }
            }
          } catch {
            // Silently fail — feed item type just won't appear
          }
        })(),

        // 2. Recent game results + upcoming games
        (async () => {
          try {
            const today = new Date().toISOString().split('T')[0];

            // Recent completed
            const { data: recentGames } = await supabase
              .from('schedule_events')
              .select('id, opponent_name, game_result, our_score, opponent_score, event_date')
              .eq('team_id', teamId)
              .eq('event_type', 'game')
              .not('game_result', 'is', null)
              .order('event_date', { ascending: false })
              .limit(3);

            if (recentGames) {
              for (const g of recentGames) {
                items.push({
                  type: 'game_result',
                  opponentName: g.opponent_name || 'Opponent',
                  result: g.game_result || '',
                  ourScore: g.our_score ?? 0,
                  theirScore: g.opponent_score ?? 0,
                  timestamp: g.event_date + 'T12:00:00Z',
                  eventId: g.id,
                });
              }
            }

            // Upcoming
            const { data: upcoming } = await supabase
              .from('schedule_events')
              .select('id, opponent_name, event_date, start_time, location')
              .eq('team_id', teamId)
              .eq('event_type', 'game')
              .gte('event_date', today)
              .is('game_result', null)
              .order('event_date')
              .limit(2);

            if (upcoming) {
              for (const u of upcoming) {
                items.push({
                  type: 'upcoming_game',
                  opponentName: u.opponent_name || 'TBD',
                  eventDate: u.event_date,
                  startTime: u.start_time,
                  location: u.location,
                  timestamp: u.event_date + 'T00:00:00Z',
                });
              }
            }
          } catch {
            // Silently fail
          }
        })(),

        // 3. Coach announcements
        (async () => {
          try {
            const { data: posts } = await supabase
              .from('team_posts')
              .select('id, title, content, created_at, profiles:author_id(full_name)')
              .eq('team_id', teamId)
              .eq('is_published', true)
              .eq('post_type', 'announcement')
              .order('created_at', { ascending: false })
              .limit(3);

            if (posts) {
              for (const p of posts) {
                items.push({
                  type: 'announcement',
                  title: p.title,
                  content: p.content || '',
                  authorName: (p.profiles as any)?.full_name || 'Coach',
                  timestamp: p.created_at,
                });
              }
            }
          } catch {
            // Silently fail
          }
        })(),
      ]);

      // Sort by timestamp desc, take top 10
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setFeedItems(items.slice(0, 10));
    } catch {
      // Overall fail
    } finally {
      setLoading(false);
    }
  };

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  const formatTimeAgo = (timestamp: string): string => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleAchievementTap = (item: FeedItemAchievement) => {
    const statLabel = item.stat_key?.replace('total_', '').replace(/_/g, ' ') || 'stat';
    Alert.alert(
      `${item.achievementIcon} ${item.achievementName}`,
      item.description
        ? `${item.description}${item.threshold ? `\n\nRequires: ${item.threshold} ${statLabel}` : ''}`
        : 'Complete the required objective to earn this badge.',
    );
  };

  const handleGameTap = (eventId: string) => {
    router.push(`/game-results?eventId=${eventId}` as any);
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  if (loading) {
    return (
      <View style={s.section}>
        <Text style={[s.sectionHeader, { color: P.neonBlue }]}>SQUAD COMMS</Text>
        <ActivityIndicator size="small" color={P.textMuted} style={{ marginTop: 12 }} />
      </View>
    );
  }

  if (feedItems.length === 0) return null;

  const renderFeedItem = (item: FeedItem, index: number) => {
    switch (item.type) {
      case 'achievement': {
        const rc = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
        return (
          <TouchableOpacity
            key={`ach-${index}`}
            style={[s.feedCard, { backgroundColor: P.card, borderColor: P.border }]}
            onPress={() => handleAchievementTap(item)}
            activeOpacity={0.7}
          >
            <View style={[s.feedAccent, { backgroundColor: rc.glowColor }]} />
            <View style={s.feedContent}>
              <View style={s.feedTopRow}>
                <Text style={[s.feedEmoji]}>{item.achievementIcon}</Text>
                <Text style={[s.feedText, { color: P.text }]} numberOfLines={2}>
                  <Text style={{ fontWeight: '700' }}>{item.playerName}</Text>
                  {' earned '}
                  <Text style={{ fontWeight: '700', color: rc.glowColor }}>{item.achievementName}</Text>
                </Text>
              </View>
              <Text style={[s.feedTime, { color: P.textMuted }]}>{formatTimeAgo(item.timestamp)}</Text>
            </View>
          </TouchableOpacity>
        );
      }

      case 'game_result': {
        const isWin = item.result === 'win';
        const accentColor = isWin ? P.neonGreen : P.neonRed;
        return (
          <TouchableOpacity
            key={`game-${index}`}
            style={[s.feedCard, { backgroundColor: P.card, borderColor: P.border }]}
            onPress={() => handleGameTap(item.eventId)}
            activeOpacity={0.7}
          >
            <View style={[s.feedAccent, { backgroundColor: accentColor }]} />
            <View style={s.feedContent}>
              <View style={s.feedTopRow}>
                <View style={[s.resultBadge, { backgroundColor: accentColor + '25' }]}>
                  <Text style={[s.resultBadgeText, { color: accentColor }]}>
                    {item.result === 'win' ? 'W' : item.result === 'loss' ? 'L' : 'T'}
                  </Text>
                </View>
                <Text style={[s.feedText, { color: P.text }]} numberOfLines={1}>
                  vs {item.opponentName}{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {item.ourScore}-{item.theirScore}
                  </Text>
                </Text>
              </View>
              <Text style={[s.feedTime, { color: P.textMuted }]}>{formatTimeAgo(item.timestamp)}</Text>
            </View>
          </TouchableOpacity>
        );
      }

      case 'upcoming_game': {
        const gameDate = new Date(item.eventDate + 'T00:00:00');
        const daysUntil = Math.ceil((gameDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const urgency = daysUntil <= 2 ? '\u26A1' : '\uD83D\uDCC5';
        return (
          <View
            key={`upcoming-${index}`}
            style={[s.feedCard, { backgroundColor: P.card, borderColor: P.border }]}
          >
            <View style={[s.feedAccent, { backgroundColor: P.neonBlue }]} />
            <View style={s.feedContent}>
              <View style={s.feedTopRow}>
                <Text style={s.feedEmoji}>{urgency}</Text>
                <Text style={[s.feedText, { color: P.text }]} numberOfLines={1}>
                  vs <Text style={{ fontWeight: '700' }}>{item.opponentName}</Text>
                  {daysUntil <= 0 ? ' — Today!' : daysUntil === 1 ? ' — Tomorrow' : ` in ${daysUntil} days`}
                </Text>
              </View>
              {(item.startTime || item.location) && (
                <Text style={[s.feedSubtext, { color: P.textMuted }]} numberOfLines={1}>
                  {item.startTime ? item.startTime : ''}{item.startTime && item.location ? ' \u00B7 ' : ''}{item.location || ''}
                </Text>
              )}
            </View>
          </View>
        );
      }

      case 'announcement':
        return (
          <View
            key={`ann-${index}`}
            style={[s.feedCard, { backgroundColor: P.card, borderColor: P.border }]}
          >
            <View style={[s.feedAccent, { backgroundColor: P.neonPurple }]} />
            <View style={s.feedContent}>
              <View style={s.feedTopRow}>
                <Ionicons name="megaphone" size={14} color={P.neonPurple} />
                <Text style={[s.feedText, { color: P.text }]} numberOfLines={2}>
                  {item.title ? <Text style={{ fontWeight: '700' }}>{item.title}: </Text> : null}
                  {item.content}
                </Text>
              </View>
              <Text style={[s.feedTime, { color: P.textMuted }]}>
                {item.authorName} \u00B7 {formatTimeAgo(item.timestamp)}
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={s.section}>
      <View style={s.sectionHeaderRow}>
        <Text style={[s.sectionHeader, { color: P.neonBlue }]}>SQUAD COMMS</Text>
        <Ionicons name="radio" size={14} color={P.neonBlue} />
      </View>
      {feedItems.map((item, i) => renderFeedItem(item, i))}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const s = StyleSheet.create({
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  feedCard: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 48,
  },
  feedAccent: {
    width: 4,
  },
  feedContent: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  feedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedEmoji: {
    fontSize: 16,
  },
  feedText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  feedSubtext: {
    fontSize: 11,
    marginLeft: 24,
  },
  feedTime: {
    fontSize: 10,
    marginLeft: 24,
  },
  resultBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
});
