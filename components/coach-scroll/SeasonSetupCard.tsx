/**
 * SeasonSetupCard — Conditional card for early-season setup progress.
 * Only appears when the season is new and setup items are incomplete.
 * Phase 10.4: Season setup progress card.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  SharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSeason } from '@/lib/season';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

// ─── Design tokens ──────────────────────────────────────────
const CARD_STYLE = {
  backgroundColor: '#FFFBF0',
  borderRadius: 18,
  borderWidth: 1,
  borderColor: '#F5E6C8',
  padding: 18,
  marginHorizontal: 20,
  shadowColor: '#D9994A',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
} as const;

// ─── Types ──────────────────────────────────────────────────
type ChecklistItem = {
  label: string;
  done: boolean;
};

type Props = {
  teamId: string | null;
  scrollY: SharedValue<number>;
  cardY?: number;
};

export default function SeasonSetupCard({ teamId, scrollY, cardY = 1300 }: Props) {
  const router = useRouter();
  const { workingSeason } = useSeason();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Item stagger animations
  const itemAnims = Array.from({ length: 7 }, () => useSharedValue(0));

  useEffect(() => {
    if (!teamId || !workingSeason?.id) {
      setLoaded(true);
      return;
    }

    (async () => {
      try {
        // Check if season is new (started less than 30 days ago)
        const { data: season } = await supabase
          .from('seasons')
          .select('start_date')
          .eq('id', workingSeason.id)
          .maybeSingle();

        if (season?.start_date) {
          const startDate = new Date(season.start_date + 'T00:00:00');
          const now = new Date();
          const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceStart > 30) {
            // Season is established — check if games have been played
            const { count: gamesPlayed } = await supabase
              .from('schedule_events')
              .select('*', { count: 'exact', head: true })
              .eq('team_id', teamId)
              .eq('event_type', 'game')
              .eq('game_status', 'completed');

            if ((gamesPlayed || 0) > 0) {
              setVisible(false);
              setLoaded(true);
              return;
            }
          }
        }

        // Build checklist
        const checklist: ChecklistItem[] = [];

        // 1. Roster created
        const { count: rosterCount } = await supabase
          .from('team_players')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId);
        checklist.push({ label: 'Roster created', done: (rosterCount || 0) > 0 });

        // 2. Schedule set
        const { count: scheduleCount } = await supabase
          .from('schedule_events')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId);
        checklist.push({ label: 'Schedule set', done: (scheduleCount || 0) > 0 });

        // 3. Jerseys assigned (80%+ of roster)
        if ((rosterCount || 0) > 0) {
          const { data: players } = await supabase
            .from('team_players')
            .select('player_id, players(jersey_number)')
            .eq('team_id', teamId);

          const withJersey = (players || []).filter((p: any) => {
            const jn = p.players?.jersey_number;
            return jn !== null && jn !== undefined && jn !== '';
          }).length;
          const rate = (players || []).length > 0 ? withJersey / (players || []).length : 0;
          checklist.push({ label: 'Jerseys assigned', done: rate >= 0.8 });
        } else {
          checklist.push({ label: 'Jerseys assigned', done: false });
        }

        // 4. First practice scheduled
        const { count: practiceCount } = await supabase
          .from('schedule_events')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId)
          .eq('event_type', 'practice');
        checklist.push({ label: 'First practice scheduled', done: (practiceCount || 0) > 0 });

        // 5. Registration open (check season-level)
        try {
          const { data: regData } = await supabase
            .from('seasons')
            .select('registration_open')
            .eq('id', workingSeason.id)
            .maybeSingle();
          checklist.push({ label: 'Registration open', done: regData?.registration_open === true });
        } catch {
          // Table might not exist — skip
        }

        // 6. Payment setup (check if season fees exist)
        try {
          const { count: feeCount } = await supabase
            .from('season_fees')
            .select('*', { count: 'exact', head: true })
            .eq('season_id', workingSeason.id);
          checklist.push({ label: 'Payment setup', done: (feeCount || 0) > 0 });
        } catch {
          // Table might not exist — skip
        }

        const doneCount = checklist.filter(i => i.done).length;
        const allDone = doneCount === checklist.length;

        setItems(checklist);
        setVisible(!allDone);

        // Trigger item stagger animations
        if (!allDone) {
          checklist.forEach((_, i) => {
            if (i < itemAnims.length) {
              itemAnims[i].value = withDelay(i * 100, withTiming(1, { duration: 300 }));
            }
          });
        }
      } catch (err) {
        if (__DEV__) console.error('[SeasonSetupCard] Error:', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, [teamId, workingSeason?.id]);

  // Progress bar animation
  const progressAnim = useSharedValue(0);
  useEffect(() => {
    if (items.length > 0) {
      const target = items.filter(i => i.done).length / items.length;
      progressAnim.value = withDelay(300, withTiming(target, { duration: 600 }));
    }
  }, [items]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));

  // Card entrance animation
  const cardStyle = useAnimatedStyle(() => {
    const center = cardY;
    const opacity = interpolate(
      scrollY.value,
      [center - 400, center - 200],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [center - 400, center - 200],
      [15, 0],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY }] };
  });

  if (!loaded || !visible || !teamId || items.length === 0) return null;

  const doneCount = items.filter(i => i.done).length;

  return (
    <Animated.View style={cardStyle}>
      <View style={CARD_STYLE}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerLeft}>
            {'\u{1F3D7}\uFE0F'}  SEASON SETUP
          </Text>
          <Text style={styles.headerRight}>{doneCount} of {items.length} done</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressBarStyle]} />
          </View>
          <Text style={styles.progressPercent}>
            {items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0}%
          </Text>
        </View>

        {/* Checklist items */}
        <View style={styles.checklist}>
          {items.map((item, i) => (
            <Animated.View
              key={item.label}
              style={[
                styles.checkRow,
                { opacity: i < itemAnims.length ? itemAnims[i] : 1 },
              ]}
            >
              <Text style={[styles.checkIcon, { color: item.done ? BRAND.success : BRAND.error }]}>
                {item.done ? '\u2713' : '\u2717'}
              </Text>
              <Text
                style={[
                  styles.checkLabel,
                  item.done && styles.checkLabelDone,
                ]}
              >
                {item.label}
              </Text>
            </Animated.View>
          ))}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/coach-schedule' as any)}
        >
          <Text style={styles.ctaText}>Continue Setup {'\u2192'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: BRAND.textPrimary,
  },
  headerRight: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#D9994A',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  progressTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F0E6D2',
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND.gold,
  },
  progressPercent: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#D9994A',
    width: 36,
    textAlign: 'right',
  },
  checklist: {
    gap: 8,
    marginBottom: 16,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIcon: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    width: 18,
    textAlign: 'center',
  },
  checkLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  checkLabelDone: {
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textMuted,
    textDecorationLine: 'line-through',
  },
  ctaButton: {
    backgroundColor: BRAND.gold,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: '#0D1B3E',
    letterSpacing: 0.5,
  },
});
