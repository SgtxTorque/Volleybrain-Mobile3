/**
 * ParentEventHero — Dark navy event hero card with +XP on RSVP button.
 * Replaces BillboardHero with a single-event focused card.
 */
import React, { useEffect } from 'react';
import { Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { D_COLORS, D_RADII } from '@/theme/d-system';
import type { FamilyChild, FamilyEvent } from '@/hooks/useParentHomeData';

interface Props {
  event: FamilyEvent | null;
  child: FamilyChild | null;
  onRsvp: (eventId: string, childId: string, status: 'yes' | 'no' | 'maybe') => void;
  isMultiChild: boolean;
}

function formatTime(event: FamilyEvent): string {
  if (event.startTime) {
    const d = new Date(event.startTime);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  }
  if (event.time) {
    const [h, m] = event.time.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  }
  return '';
}

function getDateLabel(dateStr: string): string {
  const today = new Date().toDateString();
  const evtDate = new Date(dateStr + 'T00:00:00').toDateString();
  if (today === evtDate) return 'TODAY';
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  if (tmrw.toDateString() === evtDate) return 'TOMORROW';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
  } catch {
    return dateStr;
  }
}

function openDirections(event: FamilyEvent) {
  const address = encodeURIComponent(event.venueAddress || event.venueName || event.location || '');
  const url = Platform.OS === 'ios' ? `maps:?q=${address}` : `geo:0,0?q=${address}`;
  Linking.openURL(url).catch(() => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
  });
}

function ParentEventHero({ event, child, onRsvp, isMultiChild }: Props) {
  // ALL hooks ABOVE early return
  const cardTranslateY = useSharedValue(15);
  const cardOpacity = useSharedValue(0);
  const xpChipScale = useSharedValue(1.0);

  useEffect(() => {
    // Card entrance: fade in + slide up 15px
    cardTranslateY.value = withSpring(0, { damping: 12, stiffness: 100 });
    cardOpacity.value = withTiming(1, { duration: 400 });
    // XP chip pulse: scale 1.0 → 1.1 → 1.0, 3-second loop
    xpChipScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(xpChipScale);
    };
  }, []);

  const cardEntranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardTranslateY.value }],
    opacity: cardOpacity.value,
  }));

  const xpPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpChipScale.value }],
  }));

  if (!event) {
    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={[D_COLORS.eventHeroBgStart, D_COLORS.eventHeroBgEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <Image source={require('@/assets/images/mascot/SleepLynx.png')} style={styles.emptyMascot} resizeMode="contain" />
          <Text style={styles.emptyText}>No upcoming events.{'\n'}Enjoy the downtime!</Text>
        </LinearGradient>
      </View>
    );
  }

  const timeStr = formatTime(event);
  const dateLabel = getDateLabel(event.date);
  const eventTypeLabel = (event.eventType || 'EVENT').toUpperCase();
  const detailLine = event.opponentName
    ? `vs ${event.opponentName}${event.venueName ? ` \u00B7 ${event.venueName}` : ''}`
    : event.venueName || event.location || '';
  const hasLocation = !!(event.venueAddress || event.venueName || event.location);

  const isRsvpd = event.rsvpStatus === 'yes';
  const rsvpLabel = isRsvpd ? 'GOING \u2713' : event.rsvpStatus === 'maybe' ? 'MAYBE' : event.rsvpStatus === 'no' ? 'NOT GOING' : 'RSVP';
  const rsvpBg = isRsvpd ? BRAND.success : event.rsvpStatus === 'maybe' ? '#F59E0B' : event.rsvpStatus === 'no' ? BRAND.error : D_COLORS.rsvpButtonBg;

  const handleRsvp = () => {
    const cycle: Array<'yes' | 'maybe' | 'no'> = ['yes', 'maybe', 'no'];
    const idx = event.rsvpStatus ? cycle.indexOf(event.rsvpStatus) : -1;
    onRsvp(event.eventId, event.childId, cycle[(idx + 1) % cycle.length]);
  };

  const childInitial = child?.firstName?.[0]?.toUpperCase() || event.childName?.[0]?.toUpperCase() || '?';

  return (
    <Animated.View style={[styles.outerContainer, cardEntranceStyle]}>
      <LinearGradient
        colors={[D_COLORS.eventHeroBgStart, D_COLORS.eventHeroBgEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Top row: child avatar + team info + event type pill */}
        <View style={styles.topRow}>
          <View style={styles.childInfo}>
            {child?.photoUrl ? (
              <Image source={{ uri: child.photoUrl }} style={styles.childAvatar} />
            ) : (
              <View style={[styles.childAvatarFallback, { backgroundColor: event.sportColor || BRAND.skyBlue }]}>
                <Text style={styles.childAvatarText}>{childInitial}</Text>
              </View>
            )}
            <Text style={styles.childTeamText} numberOfLines={1}>
              {isMultiChild ? `${event.childName} \u00B7 ` : ''}{event.teamName}
            </Text>
          </View>
          <View style={[styles.typePill, { backgroundColor: eventTypeLabel === 'GAME' ? 'rgba(255,107,107,0.2)' : 'rgba(75,185,236,0.2)' }]}>
            <Text style={[styles.typePillText, { color: eventTypeLabel === 'GAME' ? '#FF6B6B' : BRAND.skyBlue }]}>{eventTypeLabel}</Text>
          </View>
        </View>

        {/* Date line */}
        <Text style={styles.dateLine}>
          {dateLabel}{timeStr ? ` \u00B7 ${timeStr}` : ''}
        </Text>

        {/* Event type big text */}
        <Text style={styles.eventTypeBig}>{eventTypeLabel}</Text>

        {/* Detail line */}
        {detailLine ? <Text style={styles.detailLine} numberOfLines={1}>{detailLine}</Text> : null}

        {/* Buttons row */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.rsvpBtn, { backgroundColor: rsvpBg }]}
            activeOpacity={0.8}
            onPress={handleRsvp}
          >
            <Text style={styles.rsvpBtnText}>{rsvpLabel}</Text>
            {!event.rsvpStatus && (
              <Animated.View style={[styles.xpChip, xpPulseStyle]}>
                <Text style={styles.xpChipText}>+20 XP</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
          {hasLocation && (
            <TouchableOpacity
              style={styles.directionsBtn}
              activeOpacity={0.8}
              onPress={() => openDirections(event)}
            >
              <Ionicons name="navigate-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.directionsBtnText}>Directions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Subtle radial glow */}
        <View style={styles.glowCorner} />
      </LinearGradient>
    </Animated.View>
  );
}

export default React.memo(ParentEventHero);

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  emptyContainer: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  card: {
    borderRadius: D_RADII.hero,
    padding: 20,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  childInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  childAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  childAvatarFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childAvatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: BRAND.white,
  },
  childTeamText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    flex: 1,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typePillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  dateLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  eventTypeBig: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  detailLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rsvpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  rsvpBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.white,
  },
  xpChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  xpChipText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: BRAND.white,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  directionsBtnText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  glowCorner: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(75,185,236,0.08)',
  },
  emptyMascot: {
    width: 48,
    height: 48,
    alignSelf: 'center',
    opacity: 0.5,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 22,
  },
});
