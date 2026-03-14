/**
 * GameDayHeroCard — D System hero card merging event info + readiness pips.
 * Dark navy card with badge row, team name, opponent, location, readiness pips,
 * action buttons, and a bottom strip with RSVP + START GAME DAY.
 * Handles both game day and non-game-day states.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SHADOWS } from '@/theme/spacing';
import { D_RADII } from '@/theme/d-system';
import type { CoachEvent, RsvpSummary, PrepChecklist } from '@/hooks/useCoachHomeData';

interface Props {
  event: CoachEvent | null;
  rsvpSummary: RsvpSummary | null;
  prepChecklist: PrepChecklist | null;
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h, 10);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  } catch {
    return '';
  }
}

/** Pip that pulses opacity when incomplete, stays solid when done */
function PulsingPip({ done, index }: { done: boolean; index: number }) {
  const pipOpacity = useSharedValue(done ? 1 : 0.5);
  useEffect(() => {
    if (done) return;
    pipOpacity.value = withDelay(
      index * 300,
      withRepeat(
        withSequence(
          withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(pipOpacity);
  }, [done]);
  const animStyle = useAnimatedStyle(() => ({ opacity: pipOpacity.value }));
  return (
    <Animated.View style={[styles.readinessPip, done ? styles.pipDone : styles.pipPending, animStyle]} />
  );
}

function GameDayHeroCard({ event, rsvpSummary, prepChecklist }: Props) {
  const router = useRouter();

  // ─── No event: empty state ──
  if (!event) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyIcon}>{'\u{1F3D0}'}</Text>
        <Text style={styles.emptyTitle}>No upcoming events</Text>
        <Text style={styles.emptySubtext}>Create one?</Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/coach-schedule' as any)}
        >
          <Text style={styles.emptyBtnText}>Open Schedule</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Animation 3B: Volleyball slow rotation
  const vballRotation = useSharedValue(0);
  useEffect(() => {
    vballRotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(vballRotation);
  }, []);
  const vballStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${vballRotation.value}deg` }],
  }));

  const isGame = event.event_type === 'game';
  const time = formatTime(event.event_time || event.start_time);
  const location = event.venue_name || event.location || null;

  // Readiness pips (only for games)
  const readinessItems = prepChecklist
    ? [prepChecklist.lineupSet, prepChecklist.rsvpsReviewed, prepChecklist.lastStatsEntered]
    : [];
  const readyCount = readinessItems.filter(Boolean).length;

  // Action buttons
  const actions = isGame
    ? [
        { label: 'Roster', route: '/(tabs)/coach-roster' },
        { label: 'Lineup', route: `/lineup-builder?eventId=${event.id}` },
        { label: 'Stats', route: `/game-results?eventId=${event.id}` },
        { label: 'Attend.', route: `/attendance?eventId=${event.id}` },
      ]
    : [
        { label: 'Roster', route: '/(tabs)/coach-roster' },
        { label: 'Attend.', route: `/attendance?eventId=${event.id}` },
      ];

  const rsvpLine = rsvpSummary
    ? `${rsvpSummary.confirmed}/${rsvpSummary.total} confirmed`
    : null;

  return (
    <View style={styles.card}>
      {/* Volleyball emoji — absolute top right, slow rotation */}
      <Animated.View style={[styles.bgEmojiWrap, vballStyle]}>
        <Text style={styles.bgEmoji}>{'\u{1F3D0}'}</Text>
      </Animated.View>

      {/* Badge row */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, isGame ? styles.badgeGame : styles.badgePractice]}>
          <Text style={[styles.badgeText, isGame ? styles.badgeTextGame : styles.badgeTextPractice]}>
            {isGame ? 'GAME DAY' : event.event_type?.toUpperCase() || 'EVENT'}
          </Text>
        </View>
        {time ? <Text style={styles.timeText}>{time}</Text> : null}
      </View>

      {/* Team name */}
      <Text style={styles.teamName}>{event.team_name}</Text>

      {/* Opponent */}
      {isGame && event.opponent_name && (
        <Text style={styles.opponentLine}>vs {event.opponent_name}</Text>
      )}

      {/* Location */}
      {location && (
        <Text style={styles.locationLine}>{'\u{1F4CD}'} {location}</Text>
      )}

      {/* Readiness pips (games only) — incomplete pips pulse */}
      {isGame && prepChecklist && (
        <View style={styles.readinessRow}>
          {readinessItems.map((done, i) => (
            <PulsingPip key={i} done={done} index={i} />
          ))}
          <Text style={styles.readinessLabel}>{readyCount} of 3 ready</Text>
        </View>
      )}

      {/* Action buttons row */}
      <View style={styles.actionsRow}>
        {actions.map((action, i) => (
          <TouchableOpacity
            key={i}
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => router.push(action.route as any)}
          >
            <Text style={styles.actionBtnText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom strip */}
      <View style={styles.bottomStrip}>
        <Text style={styles.rsvpText}>{rsvpLine || 'No RSVPs yet'}</Text>
        {isGame && (
          <TouchableOpacity
            style={styles.startBtn}
            activeOpacity={0.8}
            onPress={() => {
              router.push(`/game-day-command?eventId=${event.id}&teamId=${event.team_id}&opponent=${encodeURIComponent(event.opponent_name || 'Opponent')}` as any);
            }}
          >
            <Text style={styles.startBtnText}>START GAME DAY</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default React.memo(GameDayHeroCard);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: BRAND.navyDeep,
    borderRadius: D_RADII.hero,
    padding: 20,
    overflow: 'hidden',
    ...SHADOWS.hero,
  },

  // Background volleyball
  bgEmojiWrap: {
    position: 'absolute',
    top: 12,
    right: 14,
  },
  bgEmoji: {
    fontSize: 42,
    opacity: 0.15,
  },

  // Badge row
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeGame: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  badgePractice: {
    backgroundColor: 'rgba(75,185,236,0.15)',
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  badgeTextGame: {
    color: BRAND.success,
  },
  badgeTextPractice: {
    color: BRAND.skyBlue,
  },
  timeText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },

  // Content
  teamName: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 20,
    color: BRAND.white,
  },
  opponentLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  locationLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 6,
  },

  // Readiness pips
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  readinessPip: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  pipDone: {
    backgroundColor: BRAND.success,
  },
  pipPending: {
    backgroundColor: BRAND.coral,
  },
  readinessLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    marginLeft: 4,
  },

  // Action buttons
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  actionBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },

  // Bottom strip
  bottomStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.15)',
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: -20,
    paddingHorizontal: 22,
    paddingBottom: 16,
    marginBottom: -20,
    borderBottomLeftRadius: D_RADII.hero,
    borderBottomRightRadius: D_RADII.hero,
  },
  rsvpText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  startBtn: {
    backgroundColor: BRAND.skyBlue,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  startBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: BRAND.white,
    letterSpacing: 0.5,
  },

  // Empty state
  emptyIcon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  emptyBtn: {
    backgroundColor: BRAND.skyBlue,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'center',
    marginTop: 12,
  },
  emptyBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.white,
  },
});
