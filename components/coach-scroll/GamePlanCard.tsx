/**
 * GamePlanCard — Tier 1 full card for upcoming game/practice within 48 hours.
 * Dark navy card with quick action buttons and RSVP summary.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING, SHADOWS } from '@/theme/spacing';
import type { CoachEvent, RsvpSummary } from '@/hooks/useCoachHomeData';

type Props = {
  event: CoachEvent | null;
  rsvpSummary: RsvpSummary | null;
};

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

function isWithin48Hours(eventDate: string): boolean {
  const now = new Date();
  const evt = new Date(eventDate + 'T23:59:59');
  const diff = evt.getTime() - now.getTime();
  return diff >= 0 && diff <= 48 * 60 * 60 * 1000;
}

export default function GamePlanCard({ event, rsvpSummary }: Props) {
  const router = useRouter();

  if (!event || !isWithin48Hours(event.event_date)) return null;

  const isGame = event.event_type === 'game';
  const time = formatTime(event.event_time || event.start_time);
  const location = event.venue_name || event.location || null;

  const quickActions = isGame
    ? [
        { label: 'Roster', icon: '\u{1F4CB}', route: '/(tabs)/coach-roster' },
        { label: 'Lineup', icon: '\u{1F4DD}', route: `/lineup-builder?eventId=${event.id}` },
        { label: 'Stats', icon: '\u{1F4CA}', route: `/game-results?eventId=${event.id}` },
        { label: 'Attend.', icon: '\u{2705}', route: `/attendance?eventId=${event.id}` },
      ]
    : [
        { label: 'Roster', icon: '\u{1F4CB}', route: '/(tabs)/coach-roster' },
        { label: 'Attend.', icon: '\u{2705}', route: `/attendance?eventId=${event.id}` },
      ];

  // RSVP summary text
  const rsvpLine = rsvpSummary
    ? `${rsvpSummary.confirmed}/${rsvpSummary.total} confirmed`
    : null;
  const missingLine = rsvpSummary && rsvpSummary.missing.length > 0
    ? rsvpSummary.missing.length <= 2
      ? `${rsvpSummary.missing.join(' and ')} not responded`
      : `${rsvpSummary.missing[0]} and ${rsvpSummary.missing.length - 1} others not responded`
    : null;

  return (
    <View style={styles.card}>
      {/* Header line */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <Text style={styles.headerLabel}>
            {isGame ? 'GAME DAY' : 'PRACTICE'}
            {time ? ` \u00B7 ${time}` : ''}
          </Text>
        </View>
        <Text style={styles.headerIcon}>{'\u{1F3D0}'}</Text>
      </View>

      {/* Team name */}
      <Text style={styles.teamName}>{event.team_name}</Text>

      {/* Opponent (game only) */}
      {isGame && event.opponent_name && (
        <Text style={styles.opponentLine}>vs {event.opponent_name}</Text>
      )}

      {/* Location */}
      {location && (
        <Text style={styles.locationLine}>
          {'\u{1F4CD}'} {location}
        </Text>
      )}

      {/* Quick action pills */}
      <View style={styles.actionsRow}>
        {quickActions.map((action, i) => (
          <TouchableOpacity
            key={i}
            style={styles.actionPill}
            activeOpacity={0.7}
            onPress={() => router.push(action.route as any)}
          >
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* RSVP summary */}
      {rsvpLine && (
        <View style={styles.rsvpRow}>
          <Text style={styles.rsvpText}>{rsvpLine}</Text>
          {missingLine && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                // TODO: Navigate to chat/DM with missing player's parent when built
                router.push('/(tabs)/coach-chat' as any);
              }}
            >
              <Text style={styles.missingText}> · {missingLine}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* START GAME DAY MODE button (game only) */}
      {isGame && (
        <TouchableOpacity
          style={styles.gameDayBtn}
          activeOpacity={0.8}
          onPress={() => {
            router.push(`/game-day-command?eventId=${event.id}&teamId=${event.team_id}&opponent=${encodeURIComponent(event.opponent_name || 'Opponent')}` as any);
          }}
        >
          <Text style={styles.gameDayBtnText}>START GAME DAY MODE</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.pagePadding,
    backgroundColor: '#0D1B3E',
    borderRadius: SPACING.heroCardRadius,
    padding: 20,
    marginBottom: 8,
    ...SHADOWS.hero,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.success,
  },
  headerLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
  },
  headerIcon: {
    fontSize: 24,
  },
  teamName: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: BRAND.white,
    letterSpacing: 0.5,
  },
  opponentLine: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  locationLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  actionPill: {
    backgroundColor: BRAND.offWhite,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textPrimary,
  },
  rsvpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  rsvpText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  missingText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: '#F59E0B',
  },
  gameDayBtn: {
    backgroundColor: BRAND.skyBlue,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  gameDayBtnText: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: BRAND.white,
    letterSpacing: 1,
  },
});
