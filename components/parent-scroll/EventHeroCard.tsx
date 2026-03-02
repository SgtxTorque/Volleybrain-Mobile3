/**
 * EventHeroCard — dark navy hero card for the next upcoming event.
 * Features parallax gradient reveal on scroll approach.
 */
import React, { useEffect } from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING, SHADOWS } from '@/theme/spacing';
import { SCROLL_THRESHOLDS } from '@/hooks/useScrollAnimations';

export type HeroEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  event_time: string | null;
  start_time: string | null;
  location: string | null;
  venue_name: string | null;
  venue_address: string | null;
  team_name: string;
  opponent_name: string | null;
};

type Props = {
  event: HeroEvent | null;
  scrollY: SharedValue<number>;
  onPress?: () => void;
  onRsvp?: () => void;
  onDirections?: () => void;
};

function formatEventTime(event: HeroEvent): string {
  if (event.start_time) {
    const d = new Date(event.start_time);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  }
  if (event.event_time) {
    const [h, m] = event.event_time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  }
  return '';
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const eventDate = new Date(dateStr + 'T00:00:00');
  return eventDate.toDateString() === today.toDateString();
}

function getEventLabel(event: HeroEvent): string {
  return isToday(event.event_date) ? 'TODAY' : 'UPCOMING';
}

export default function EventHeroCard({ event, scrollY, onPress, onRsvp, onDirections }: Props) {
  // Pulse animation for "TODAY" green dot (0.4–1.0 on 2s cycle)
  const pulseOpacity = useSharedValue(1);
  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(0.4, { duration: 2000 }),
      -1,
      true,
    );
  }, []);
  const pulseDotAnimStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Parallax gradient reveal
  const gradientAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [SCROLL_THRESHOLDS.EVENT_IMAGE_REVEAL_START, SCROLL_THRESHOLDS.EVENT_IMAGE_REVEAL_END],
      [0.3, 1],
      Extrapolation.CLAMP,
    ),
  }));

  if (!event) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyEmoji}>{'\u{1F3D6}\u{FE0F}'}</Text>
        <Text style={styles.emptyText}>No upcoming events. Enjoy the break!</Text>
      </View>
    );
  }

  const timeStr = formatEventTime(event);
  const todayEvent = isToday(event.event_date);
  const label = getEventLabel(event);
  const eventTypeLabel = (event.event_type || event.title || 'EVENT').toUpperCase();
  const locationDisplay = event.venue_name || event.location || '';

  const handleDirections = () => {
    if (onDirections) {
      onDirections();
      return;
    }
    const address = encodeURIComponent(event.venue_address || event.venue_name || event.location || '');
    const url = Platform.OS === 'ios' ? `maps:?q=${address}` : `geo:0,0?q=${address}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
    });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* Background gradient with parallax reveal */}
      <Animated.View style={[StyleSheet.absoluteFillObject, gradientAnimStyle]}>
        <LinearGradient
          colors={['#0D1B3E', '#1A3560', '#0D1B3E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Inner glow — subtle lighter navy at top 20% */}
      <LinearGradient
        colors={['rgba(26,53,96,0.4)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.25 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Volleyball decoration */}
      <Text style={styles.volleyballDecor}>{'\u{1F3D0}'}</Text>

      {/* Content */}
      <View style={styles.content}>
        {/* Live indicator + time */}
        <View style={styles.tagRow}>
          {todayEvent && <Animated.View style={[styles.pulseDot, pulseDotAnimStyle]} />}
          <Text style={styles.tagText}>
            {label}{timeStr ? ` \u{00B7} ${timeStr}` : ''}
          </Text>
        </View>

        {/* Event type title */}
        <Text style={styles.eventTitle}>{eventTypeLabel}</Text>

        {/* Location */}
        {locationDisplay ? (
          <Text style={styles.location}>
            {'\u{1F4CD}'} {locationDisplay}
          </Text>
        ) : null}

        {/* Team name */}
        <Text style={styles.teamName}>{event.team_name}</Text>

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.rsvpBtn}
            activeOpacity={0.8}
            onPress={onRsvp}
          >
            <Text style={styles.rsvpBtnText}>RSVP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.directionsBtn}
            activeOpacity={0.8}
            onPress={handleDirections}
          >
            <Ionicons name="navigate-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.directionsBtnText}>Directions</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.pagePadding,
    marginBottom: SPACING.cardGap,
    borderRadius: SPACING.heroCardRadius,
    overflow: 'hidden',
    minHeight: 200,
    backgroundColor: BRAND.navyDeep,
    ...SHADOWS.hero,
  },
  emptyCard: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },
  volleyballDecor: {
    position: 'absolute',
    top: 16,
    right: 16,
    fontSize: 40,
    opacity: 0.15,
  },
  content: {
    padding: 20,
    paddingTop: 18,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.success,
  },
  tagText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: BRAND.skyBlue,
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontFamily: FONTS.display,
    fontSize: 32,
    color: BRAND.white,
    letterSpacing: 1,
    marginBottom: 8,
  },
  location: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  teamName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rsvpBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND.skyBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rsvpBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: BRAND.white,
    letterSpacing: 0.5,
  },
  directionsBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  directionsBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
});
