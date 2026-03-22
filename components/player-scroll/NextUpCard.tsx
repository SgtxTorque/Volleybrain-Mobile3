/**
 * NextUpCard — Next event with inline RSVP button.
 * Phase 4B: Event info + "I'M READY" / "GOING" button.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { NextEvent, RsvpStatus } from '@/hooks/usePlayerHomeData';
import { FONTS } from '@/theme/fonts';

const PT = {
  cardBg: '#10284C',
  accent: '#4BB9EC',
  gold: '#FFD700',
  success: '#22C55E',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.60)',
  textMuted: 'rgba(255,255,255,0.30)',
  textFaint: 'rgba(255,255,255,0.15)',
  border: 'rgba(255,255,255,0.06)',
  borderAccent: 'rgba(75,185,236,0.15)',
};

type Props = {
  event: NextEvent | null;
  rsvpStatus: RsvpStatus;
  attendanceStreak: number;
  onRsvp: (status: 'yes' | 'no') => void;
};

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h, 10);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    return `${hr % 12 || 12}:${m} ${ampm}`;
  } catch {
    return '';
  }
}

function formatEventDate(dateStr: string): string {
  try {
    const eventDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (eventDate.toDateString() === today.toDateString()) return 'Today';
    if (eventDate.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return eventDate.toLocaleDateString('en-US', { weekday: 'long' });
  } catch {
    return '';
  }
}

export default function NextUpCard({ event, rsvpStatus, attendanceStreak, onRsvp }: Props) {
  const dotPulse = useSharedValue(0.4);

  useEffect(() => {
    dotPulse.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      true,
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotPulse.value,
  }));

  if (!event) {
    return (
      <View style={styles.ambientWrap}>
        <Text style={styles.ambientIcon}>{'\u{1F60E}'}</Text>
        <Text style={styles.ambientText}>No events coming up. Enjoy the break! {'\u{1F431}'}</Text>
      </View>
    );
  }

  const eventType = event.event_type === 'game' ? 'Game' : 'Practice';
  const dateLabel = formatEventDate(event.event_date);
  const time = formatTime(event.event_time || event.start_time);
  const dateLine = `${dateLabel}${time ? ` at ${time}` : ''}`;
  const location = event.venue_name || event.location;

  const isConfirmed = rsvpStatus === 'confirmed' || rsvpStatus === 'yes';
  const isDeclined = rsvpStatus === 'no';

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.labelRow}>
          <Animated.View style={[styles.dot, dotStyle]} />
          <Text style={styles.label}>NEXT UP</Text>
        </View>
        {/* RSVP Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onRsvp(isConfirmed ? 'no' : 'yes')}
          style={[
            styles.rsvpBtn,
            isConfirmed && styles.rsvpBtnConfirmed,
            isDeclined && styles.rsvpBtnDeclined,
          ]}
        >
          <Text style={[
            styles.rsvpBtnText,
            isConfirmed && styles.rsvpBtnTextConfirmed,
            isDeclined && styles.rsvpBtnTextDeclined,
          ]}>
            {isConfirmed ? '\u2713 GOING' : isDeclined ? "CAN'T MAKE IT" : "I'M READY"}
          </Text>
          {!isConfirmed && !isDeclined && (
            <View style={styles.xpChip}>
              <Text style={styles.xpChipText}>+20 XP</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Event info */}
      <Text style={styles.eventTitle}>
        {eventType}{event.opponent_name ? ` vs ${event.opponent_name}` : ''}
      </Text>
      <Text style={styles.eventDate}>{dateLine}</Text>

      {location ? (
        <Text style={styles.eventLocation}>{'\u{1F4CD}'} {location}</Text>
      ) : null}

      {/* Streak line */}
      {attendanceStreak >= 2 && (
        <Text style={styles.streakLine}>
          {'\u{1F525}'} {eventType} streak: {attendanceStreak} in a row
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 18,
    backgroundColor: PT.cardBg,
    borderWidth: 1,
    borderColor: PT.borderAccent,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PT.success,
  },
  label: {
    fontFamily: FONTS.display,
    fontSize: 12,
    color: PT.accent,
    letterSpacing: 1.2,
  },
  rsvpBtn: {
    backgroundColor: PT.accent,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rsvpBtnConfirmed: {
    backgroundColor: PT.success,
  },
  rsvpBtnDeclined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: PT.textFaint,
  },
  rsvpBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#0D1B3E',
    letterSpacing: 0.5,
  },
  rsvpBtnTextConfirmed: {
    color: '#0D1B3E',
  },
  rsvpBtnTextDeclined: {
    color: PT.textMuted,
  },
  xpChip: {
    backgroundColor: 'rgba(255,215,0,0.20)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  xpChipText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: PT.gold,
  },
  eventTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 20,
    color: PT.textPrimary,
    marginBottom: 4,
  },
  eventDate: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PT.textMuted,
    marginBottom: 4,
  },
  eventLocation: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: PT.textFaint,
    marginBottom: 4,
  },
  streakLine: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: PT.gold,
    marginTop: 8,
  },
  ambientWrap: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 16,
    marginBottom: 12,
  },
  ambientIcon: {
    fontSize: 28,
    marginBottom: 6,
    opacity: 0.4,
  },
  ambientText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.40)',
    textAlign: 'center',
  },
});
