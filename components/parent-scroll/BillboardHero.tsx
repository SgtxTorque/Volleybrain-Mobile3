/**
 * BillboardHero — auto-cycling hero card showing ALL upcoming events
 * across all children, sports, and organizations.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING, SHADOWS } from '@/theme/spacing';
import type { FamilyEvent } from '@/hooks/useParentHomeData';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - SPACING.pagePadding * 2;
const CARD_HEIGHT = 190;
const AUTO_CYCLE_MS = 5000;
const PAUSE_AFTER_INTERACT_MS = 10000;

type Props = {
  events: FamilyEvent[];
  onRsvp: (eventId: string, childId: string, status: 'yes' | 'no' | 'maybe') => void;
  isMultiChild: boolean;
};

// ─── Helpers ────────────────────────────────────────────────────

function getSportGradient(sport: string): [string, string] {
  const s = sport.toLowerCase();
  if (s.includes('volleyball')) return [BRAND.navyDeep, '#0891B2'];
  if (s.includes('basketball')) return ['#5D3A1A', BRAND.coral];
  if (s.includes('soccer') || s.includes('football')) return ['#1B5E20', '#0891B2'];
  return [BRAND.navyDeep, BRAND.navy];
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

function isToday(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00').toDateString() === new Date().toDateString();
}

function isTomorrow(dateStr: string): boolean {
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  return new Date(dateStr + 'T00:00:00').toDateString() === tmrw.toDateString();
}

function getDateLabel(dateStr: string): string {
  if (isToday(dateStr)) return 'TODAY';
  if (isTomorrow(dateStr)) return 'TOMORROW';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
  } catch {
    return dateStr;
  }
}

function getRsvpDisplay(status: 'yes' | 'no' | 'maybe' | null): { label: string; bg: string } {
  switch (status) {
    case 'yes': return { label: 'GOING \u2713', bg: BRAND.success };
    case 'maybe': return { label: 'NOT SURE', bg: '#F59E0B' };
    case 'no': return { label: 'NOT GOING', bg: BRAND.error };
    default: return { label: 'RSVP', bg: BRAND.skyBlue };
  }
}

function openDirections(event: FamilyEvent) {
  const address = encodeURIComponent(event.venueAddress || event.venueName || event.location || '');
  const url = Platform.OS === 'ios' ? `maps:?q=${address}` : `geo:0,0?q=${address}`;
  Linking.openURL(url).catch(() => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
  });
}

// ─── Card Component ─────────────────────────────────────────────

function HeroCard({ event, onRsvp, isMultiChild }: { event: FamilyEvent; onRsvp: Props['onRsvp']; isMultiChild: boolean }) {
  const gradient = getSportGradient(event.sport);
  const timeStr = formatTime(event);
  const dateLabel = getDateLabel(event.date);
  const today = isToday(event.date);
  const eventTypeLabel = (event.eventType || event.title || 'EVENT').toUpperCase();
  const rsvp = getRsvpDisplay(event.rsvpStatus);

  const handleRsvp = () => {
    const cycle: Array<'yes' | 'maybe' | 'no'> = ['yes', 'maybe', 'no'];
    const idx = event.rsvpStatus ? cycle.indexOf(event.rsvpStatus) : -1;
    onRsvp(event.eventId, event.childId, cycle[(idx + 1) % cycle.length]);
  };

  const detailLine = event.opponentName
    ? `vs ${event.opponentName}${event.venueName ? ` \u00B7 ${event.venueName}` : ''}`
    : event.venueName || event.location || '';

  return (
    <View style={styles.cardOuter}>
      <View style={styles.card}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />

        <View style={styles.content}>
          {/* Top row: sport pill + child/team label */}
          <View style={styles.topRow}>
            <View style={styles.sportPill}>
              <Text style={styles.sportPillText}>{event.sportIcon}</Text>
            </View>
            <Text style={styles.childTeamLabel} numberOfLines={1}>
              {isMultiChild ? `${event.childName} \u00B7 ` : ''}{event.teamName}
            </Text>
          </View>

          {/* Date/time indicator */}
          <View style={styles.timeRow}>
            {today && <View style={styles.liveDot} />}
            <Text style={[styles.timeText, today && { color: BRAND.teal }]}>
              {dateLabel}{timeStr ? ` \u00B7 ${timeStr}` : ''}
            </Text>
          </View>

          {/* Event type */}
          <Text style={styles.eventType}>{eventTypeLabel}</Text>

          {/* Detail line */}
          {detailLine ? <Text style={styles.detailLine} numberOfLines={1}>{detailLine}</Text> : null}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.rsvpBtn, { backgroundColor: rsvp.bg }]} activeOpacity={0.8} onPress={handleRsvp}>
              <Text style={styles.rsvpBtnText}>{rsvp.label}</Text>
            </TouchableOpacity>
            {(event.venueAddress || event.venueName || event.location) ? (
              <TouchableOpacity style={styles.directionsBtn} activeOpacity={0.8} onPress={() => openDirections(event)}>
                <Ionicons name="navigate-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.directionsBtnText}>Directions</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Empty State ────────────────────────────────────────────────

function EmptyHero() {
  return (
    <View style={[styles.cardOuter]}>
      <View style={[styles.card, styles.emptyCard]}>
        <LinearGradient colors={[BRAND.navyDeep, BRAND.navy]} style={StyleSheet.absoluteFillObject} />
        <Image source={require('@/assets/images/mascot/SleepLynx.png')} style={styles.emptyMascot} resizeMode="contain" />
        <Text style={styles.emptyText}>No upcoming events.{'\n'}Enjoy the downtime!</Text>
      </View>
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function BillboardHero({ events, onRsvp, isMultiChild }: Props) {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const cycleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPaused = useRef(false);

  const startCycling = useCallback(() => {
    if (events.length <= 1) return;
    if (cycleTimer.current) clearInterval(cycleTimer.current);
    isPaused.current = false;

    cycleTimer.current = setInterval(() => {
      if (isPaused.current) return;
      setActiveIndex(prev => {
        const next = (prev + 1) % events.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_CYCLE_MS);
  }, [events.length]);

  const pauseCycling = useCallback(() => {
    isPaused.current = true;
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => {
      isPaused.current = false;
    }, PAUSE_AFTER_INTERACT_MS);
  }, []);

  useEffect(() => {
    startCycling();
    return () => {
      if (cycleTimer.current) clearInterval(cycleTimer.current);
      if (pauseTimer.current) clearTimeout(pauseTimer.current);
    };
  }, [startCycling]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const handleScrollBeginDrag = useCallback(() => {
    pauseCycling();
  }, [pauseCycling]);

  const handleRsvp = useCallback((eventId: string, childId: string, status: 'yes' | 'no' | 'maybe') => {
    pauseCycling();
    onRsvp(eventId, childId, status);
  }, [onRsvp, pauseCycling]);

  if (events.length === 0) {
    return <EmptyHero />;
  }

  if (events.length === 1) {
    return <HeroCard event={events[0]} onRsvp={handleRsvp} isMultiChild={isMultiChild} />;
  }

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={events.slice(0, 6)}
        keyExtractor={(item) => item.eventId}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + SPACING.pagePadding}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: SPACING.pagePadding }}
        onScrollBeginDrag={handleScrollBeginDrag}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH + SPACING.pagePadding,
          offset: (CARD_WIDTH + SPACING.pagePadding) * index,
          index,
        })}
        renderItem={({ item }) => (
          <HeroCard event={item} onRsvp={handleRsvp} isMultiChild={isMultiChild} />
        )}
      />
      {/* Dot indicators */}
      <View style={styles.dotRow}>
        {events.slice(0, 6).map((evt, i) => (
          <View key={evt.eventId} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardOuter: {
    width: CARD_WIDTH,
    paddingRight: SPACING.pagePadding,
  },
  card: {
    width: CARD_WIDTH - SPACING.pagePadding,
    height: CARD_HEIGHT,
    borderRadius: SPACING.heroCardRadius,
    overflow: 'hidden',
    ...SHADOWS.hero,
  },
  emptyCard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMascot: {
    width: 56,
    height: 56,
    opacity: 0.5,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sportPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sportPillText: {
    fontSize: 14,
  },
  childTeamLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.success,
  },
  timeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: BRAND.white,
    textTransform: 'uppercase',
  },
  eventType: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: BRAND.white,
    letterSpacing: 1,
  },
  detailLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rsvpBtn: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rsvpBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.white,
    letterSpacing: 0.5,
  },
  directionsBtn: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  directionsBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  dotActive: {
    backgroundColor: BRAND.skyBlue,
    width: 18,
    borderRadius: 3,
  },
});
