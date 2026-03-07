/**
 * TeamHealthCard — Visual card with player dots, attendance/RSVP bars, attention summary.
 * Replaces TeamPulse + RosterAlerts.
 * Phase 10.1: Team Health visual card.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import type { RsvpSummary } from '@/hooks/useCoachHomeData';

// ─── Design tokens ──────────────────────────────────────────
const PLAYER_DOT = {
  good: BRAND.success,
  warning: BRAND.warning,
  critical: BRAND.error,
};

const CARD_STYLE = {
  backgroundColor: BRAND.offWhite,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: BRAND.border,
  padding: 18,
  marginHorizontal: 20,
  shadowColor: BRAND.navy,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 2,
} as const;

// ─── Helpers ────────────────────────────────────────────────
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type DotColor = 'good' | 'warning' | 'critical';

type AlertPlayer = {
  id: string;
  name: string;
  dotColor: DotColor;
};

// ─── Props ──────────────────────────────────────────────────
type Props = {
  teamId: string | null;
  attendanceRate: number | null;
  rsvpSummary: RsvpSummary | null;
  rosterSize: number;
  scrollY: SharedValue<number>;
  cardY?: number; // Y position for scroll breathing
};

export default function TeamHealthCard({
  teamId,
  attendanceRate,
  rsvpSummary,
  rosterSize,
  scrollY,
  cardY = 600,
}: Props) {
  const router = useRouter();
  const [alertPlayers, setAlertPlayers] = useState<AlertPlayer[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Fetch roster alert data
  useEffect(() => {
    if (!teamId) return;

    (async () => {
      try {
        const alerts: AlertPlayer[] = [];
        const missingNames = rsvpSummary?.missing ?? [];
        const missingSet = new Set(missingNames);

        // Get roster
        const { data: roster } = await supabase
          .from('team_players')
          .select('player_id, players(id, first_name, last_name)')
          .eq('team_id', teamId);

        if (!roster || roster.length === 0) {
          setLoaded(true);
          return;
        }

        const playerIds = roster.map((r: any) => r.player_id);
        const nameMap = new Map<string, string>();
        for (const r of roster) {
          const p = (r as any).players;
          if (p) nameMap.set(r.player_id, `${p.first_name} ${p.last_name}`);
        }

        // Check attendance for last 5 events
        const today = localToday();
        const { data: recentEvents } = await supabase
          .from('schedule_events')
          .select('id')
          .eq('team_id', teamId)
          .lt('event_date', today)
          .order('event_date', { ascending: false })
          .limit(5);

        const missedMap = new Map<string, number>();
        if (recentEvents && recentEvents.length >= 2) {
          const eventIds = recentEvents.map(e => e.id);
          const { data: rsvps } = await supabase
            .from('event_rsvps')
            .select('player_id, event_id, status')
            .in('event_id', eventIds)
            .in('player_id', playerIds);

          for (const pid of playerIds) {
            let missed = 0;
            for (const eid of eventIds) {
              const rsvp = (rsvps || []).find(r => r.player_id === pid && r.event_id === eid);
              if (!rsvp || rsvp.status === 'no' || rsvp.status === 'absent') {
                missed++;
              }
            }
            if (missed >= 2) missedMap.set(pid, missed);
          }
        }

        // Build alert list with dot colors
        for (const pid of playerIds) {
          const name = nameMap.get(pid) || 'Unknown';
          const hasMissed = missedMap.has(pid);
          const hasNoRsvp = missingSet.has(name);

          if (hasMissed && hasNoRsvp) {
            alerts.push({ id: pid, name, dotColor: 'critical' });
          } else if (hasMissed) {
            alerts.push({ id: pid, name, dotColor: 'critical' });
          } else if (hasNoRsvp) {
            alerts.push({ id: pid, name, dotColor: 'warning' });
          } else {
            alerts.push({ id: pid, name, dotColor: 'good' });
          }
        }

        // Sort: critical first, then warning, then good
        alerts.sort((a, b) => {
          const order: Record<DotColor, number> = { critical: 0, warning: 1, good: 2 };
          return order[a.dotColor] - order[b.dotColor];
        });

        setAlertPlayers(alerts);
      } catch (err) {
        if (__DEV__) console.error('[TeamHealthCard] Error:', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, [teamId, rsvpSummary?.missing?.join(',')]);

  // Scroll breathing animation
  const breathingStyle = useAnimatedStyle(() => {
    const center = cardY + 100;
    const scale = interpolate(
      scrollY.value,
      [center - 300, center - 100, center, center + 100, center + 300],
      [0.97, 1.0, 1.0, 1.0, 0.97],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollY.value,
      [center - 300, center - 100, center, center + 100, center + 300],
      [0.85, 1.0, 1.0, 1.0, 0.85],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }], opacity };
  });

  if (!teamId || !loaded) return null;

  const goToRoster = () => router.push('/(tabs)/coach-roster' as any);

  // Compute bar values
  const attRate = attendanceRate ?? 0;
  const attBarColor = attRate >= 90 ? BRAND.success : attRate >= 70 ? BRAND.warning : BRAND.error;

  const rsvpConfirmed = rsvpSummary?.confirmed ?? 0;
  const rsvpTotal = rsvpSummary?.total ?? rosterSize;
  const rsvpPercent = rsvpTotal > 0 ? (rsvpConfirmed / rsvpTotal) * 100 : 0;
  const rsvpBarColor = rsvpConfirmed === 0 && rsvpTotal > 0 ? BRAND.error : BRAND.skyBlue;
  const rsvpTextColor = rsvpConfirmed === 0 && rsvpTotal > 0 ? BRAND.error : BRAND.skyBlue;

  // Attention players (warning + critical)
  const attentionPlayers = alertPlayers.filter(p => p.dotColor !== 'good');

  return (
    <Animated.View style={breathingStyle}>
      <TouchableOpacity style={CARD_STYLE} activeOpacity={0.8} onPress={goToRoster}>
        {/* Card header */}
        <Text style={styles.cardHeader}>TEAM HEALTH</Text>

        {/* Player dots row */}
        <View style={styles.dotsRow}>
          <View style={styles.dotsWrap}>
            {alertPlayers.map((p, i) => (
              <View
                key={p.id + i}
                style={[styles.dot, { backgroundColor: PLAYER_DOT[p.dotColor] }]}
              />
            ))}
          </View>
          <Text style={styles.playerCount}>{alertPlayers.length || rosterSize} Players</Text>
        </View>

        {/* Attendance + RSVP bars side by side */}
        <View style={styles.barsRow}>
          {/* Attendance */}
          <View style={styles.barCol}>
            <Text style={styles.barLabel}>ATTENDANCE</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${attRate}%`, backgroundColor: attBarColor }]} />
            </View>
            <Text style={[styles.barValue, { color: attBarColor }]}>
              {attendanceRate !== null ? `${attRate}%` : '--'}
            </Text>
          </View>

          {/* RSVP */}
          <View style={styles.barCol}>
            <Text style={styles.barLabel}>
              RSVP{rsvpSummary ? '' : ''}
            </Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${rsvpPercent}%`, backgroundColor: rsvpBarColor }]} />
            </View>
            <Text style={[styles.barValue, { color: rsvpTextColor }]}>
              {rsvpSummary ? `${rsvpConfirmed}/${rsvpTotal}` : '--'}
            </Text>
          </View>
        </View>

        {/* Attention row */}
        {attentionPlayers.length > 0 ? (
          <TouchableOpacity style={styles.attentionRow} activeOpacity={0.7} onPress={goToRoster}>
            <Text style={styles.attentionText}>
              {'\u{1F534}'} {attentionPlayers.length} need attention {'\u2192'}
            </Text>
            <Text style={styles.attentionNames} numberOfLines={1}>
              {attentionPlayers.slice(0, 3).map(p => p.name).join(', ')}
              {attentionPlayers.length > 3 ? ` and ${attentionPlayers.length - 3} others` : ''}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.allClear}>{'\u2713'} All clear</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  cardHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: BRAND.textMuted,
    marginBottom: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dotsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  playerCount: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginLeft: 12,
  },
  barsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  barCol: {
    flex: 1,
  },
  barLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: BRAND.textFaint,
    marginBottom: 6,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.warmGray,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  barValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
  },
  attentionRow: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
  },
  attentionText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
    marginBottom: 2,
  },
  attentionNames: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  allClear: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.success,
    marginTop: 4,
  },
});
