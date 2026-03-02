/**
 * ParentHomeScroll — scroll-driven parent home dashboard.
 * Phase 7: Dynamic data wiring + contextual messages.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/lib/auth';
import { useParentScroll } from '@/lib/parent-scroll-context';
import { useScrollAnimations, SCROLL_THRESHOLDS } from '@/hooks/useScrollAnimations';
import { useParentHomeData } from '@/hooks/useParentHomeData';
import { BRAND } from '@/theme/colors';
import { SPACING, SHADOWS } from '@/theme/spacing';
import { FONTS } from '@/theme/fonts';

import RoleSelector from './RoleSelector';
import DayStripCalendar from './parent-scroll/DayStripCalendar';
import EventHeroCard from './parent-scroll/EventHeroCard';
import AttentionBanner from './parent-scroll/AttentionBanner';
import AthleteCard from './parent-scroll/AthleteCard';
import MetricGrid from './parent-scroll/MetricGrid';
import TeamHubPreview from './parent-scroll/TeamHubPreview';
import SeasonSnapshot from './parent-scroll/SeasonSnapshot';
import RecentBadges from './parent-scroll/RecentBadges';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// ─── Mascot messages ─────────────────────────────────────────────
type MascotMessage = {
  text: string;
  animation: 'wiggle' | 'bounce' | 'float';
  type: 'rsvp' | 'payment' | 'celebration' | 'chat' | 'clear';
  textColor: string;
  hint: string;
  route: string | null;
};

/** Build contextual messages based on the parent's actual state */
function buildDynamicMessages(
  childName: string,
  attentionCount: number,
  balance: number,
  heroEvent: any | null,
  unreadChat: number,
): MascotMessage[] {
  const msgs: MascotMessage[] = [];

  // Unconfirmed RSVP / attention items
  if (attentionCount > 0 && heroEvent) {
    const dayStr = (() => {
      try {
        const d = new Date(heroEvent.event_date + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'long' });
      } catch {
        return 'this weekend';
      }
    })();
    const rsvpMessages = [
      `Coach is building the roster for ${dayStr}. Is ${childName} in?`,
      `${childName} hasn't been marked for ${dayStr}'s event yet.`,
      `Quick RSVP check \u{2014} ${childName} playing ${dayStr}?`,
    ];
    msgs.push({
      text: rsvpMessages[Math.floor(Date.now() / 86400000) % rsvpMessages.length],
      animation: 'wiggle',
      type: 'rsvp',
      textColor: BRAND.navy,
      hint: 'Tap to RSVP \u{2192}',
      route: '/(tabs)/parent-schedule',
    });
  }

  // Unpaid balance
  if (balance > 0) {
    const payMessages = [
      `$${balance.toFixed(0)} is due. Tap to handle it.`,
      `Heads up \u{2014} $${balance.toFixed(0)} balance for ${childName}.`,
      `${childName}'s spot isn't locked in. $${balance.toFixed(0)} outstanding.`,
    ];
    msgs.push({
      text: payMessages[Math.floor(Date.now() / 86400000) % payMessages.length],
      animation: 'bounce',
      type: 'payment',
      textColor: '#F59E0B', // amberWarm
      hint: 'Tap to pay \u{2192}',
      route: '/family-payments',
    });
  }

  // Unread chat messages
  if (unreadChat > 0) {
    msgs.push({
      text: `${unreadChat} unread message${unreadChat > 1 ? 's' : ''} from the team.`,
      animation: 'wiggle',
      type: 'chat',
      textColor: BRAND.navy,
      hint: 'Tap to read \u{2192}',
      route: '/(tabs)/parent-chat',
    });
  }

  // If no pending items, show encouraging messages
  if (msgs.length === 0) {
    const clearMessages = [
      `Everyone's set for the week. You're on top of it.`,
      `No action items right now. Enjoy the calm before game day.`,
      `All RSVPs confirmed, payments current. Coach's dream parent.`,
    ];
    msgs.push({
      text: clearMessages[Math.floor(Date.now() / 86400000) % clearMessages.length],
      animation: 'float',
      type: 'clear',
      textColor: BRAND.textPrimary,
      hint: '',
      route: null,
    });
  }

  return msgs;
}

// ─── Main Component ──────────────────────────────────────────────

export default function ParentHomeScroll() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const parentScroll = useParentScroll();
  const { scrollY, isSlowScroll, scrollHandler } = useScrollAnimations({
    onScrollJS: parentScroll.notifyScroll,
  });
  const data = useParentHomeData();

  // Signal to tab bar that parent scroll is active
  useEffect(() => {
    parentScroll.setParentScrollActive(true);
    return () => {
      parentScroll.setParentScrollActive(false);
      parentScroll.setScrolling(false);
    };
  }, []);

  // Dynamic contextual messages
  const childName = data.children.length > 0
    ? data.children[0].first_name
    : 'your athlete';
  const unreadChatCount = data.lastChat?.unread_count ?? 0;
  const messages = useMemo(
    () => buildDynamicMessages(childName, data.attentionCount, data.paymentStatus.balance, data.heroEvent, unreadChatCount),
    [childName, data.attentionCount, data.paymentStatus.balance, data.heroEvent, unreadChatCount],
  );
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const messageFade = useSharedValue(1);
  const mascotFloat = useSharedValue(0);

  const firstName = profile?.full_name?.split(' ')[0] || 'Parent';
  const userInitials = (() => {
    const name = profile?.full_name || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return '?';
  })();

  // ─── Mascot float animation ──
  useEffect(() => {
    mascotFloat.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1500 }),
        withTiming(4, { duration: 1500 }),
      ),
      -1,
      true,
    );
  }, []);

  // ─── Message cycling ──
  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      messageFade.value = withTiming(0, { duration: 300 });
      setTimeout(() => {
        setActiveMessageIndex((prev) => (prev + 1) % messages.length);
        messageFade.value = withTiming(1, { duration: 300 });
      }, 320);
    }, 5000);
    return () => clearInterval(interval);
  }, [messages.length]);

  // ─── Refresh ──
  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await data.refresh();
  }, [data.refresh]);

  // ─── Animated styles ──

  const welcomeAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 100], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, 140], [0, -30], Extrapolation.CLAMP) },
    ],
  }));

  const compactHeaderAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [60, 140], [0, 1], Extrapolation.CLAMP),
    pointerEvents: scrollY.value > 80 ? ('auto' as const) : ('none' as const),
  }));

  const mascotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotFloat.value }],
  }));

  const messageAnimStyle = useAnimatedStyle(() => ({
    opacity: messageFade.value,
  }));

  const calendarStickyAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 110], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [30, 110], [-50, 0], Extrapolation.CLAMP) },
    ],
  }));

  const currentMessage = messages[activeMessageIndex];

  // ─── Loading state ──
  if (data.loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={BRAND.skyBlue} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: BRAND.offWhite }]}>
      {/* ─── COMPACT HEADER ──────────────────────────────────── */}
      <Animated.View
        style={[
          styles.compactHeader,
          { paddingTop: insets.top, height: 56 + insets.top },
          compactHeaderAnimStyle,
        ]}
      >
        <View style={styles.compactHeaderInner}>
          <View style={styles.compactLeft}>
            <Text style={styles.compactMascot}>{'\u{1F431}'}</Text>
            <Text style={styles.compactBrand}>LYNX</Text>
          </View>
          <View style={styles.compactRight}>
            <TouchableOpacity
              style={styles.bellBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/notification' as any)}
            >
              <Ionicons name="notifications-outline" size={20} color={BRAND.navy} />
              {data.attentionCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {data.attentionCount > 9 ? '9+' : data.attentionCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.roleSelectorWrap}>
              <RoleSelector />
            </View>
            <View style={styles.compactAvatar}>
              <Text style={styles.compactAvatarText}>{userInitials}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* ─── DAY-STRIP CALENDAR (sticky below header) ────────── */}
      <Animated.View
        style={[
          styles.calendarSticky,
          { top: 56 + insets.top },
          calendarStickyAnimStyle,
        ]}
      >
        <DayStripCalendar scrollY={scrollY} eventDates={data.eventDates} />
      </Animated.View>

      {/* ─── SCROLLABLE CONTENT ──────────────────────────────── */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={data.refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND.skyBlue}
          />
        }
      >
        {/* ─── WELCOME SECTION ────────────────────────────────── */}
        <Animated.View
          style={[styles.welcomeSection, { paddingTop: insets.top + 16 }, welcomeAnimStyle]}
        >
          <View style={styles.welcomeTopRow}>
            <View style={{ flex: 1 }} />
            <View style={styles.roleSelectorWrap}>
              <RoleSelector />
            </View>
            <TouchableOpacity
              style={styles.bellBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/notification' as any)}
            >
              <Ionicons name="notifications-outline" size={22} color={BRAND.navy} />
              {data.attentionCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {data.attentionCount > 9 ? '9+' : data.attentionCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.welcomeContent}>
            <Animated.Text style={[styles.mascotEmoji, mascotAnimStyle]}>
              {'\u{1F431}'}
            </Animated.Text>
            <Text style={styles.welcomeGreeting}>Welcome back, {firstName}</Text>
          </View>

          {currentMessage?.route ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(currentMessage.route as any)}
            >
              <Animated.Text
                style={[
                  styles.flatMessageText,
                  { color: currentMessage.textColor },
                  messageAnimStyle,
                ]}
              >
                {currentMessage.text}
              </Animated.Text>
              {currentMessage.hint ? (
                <Text style={styles.flatMessageHint}>{currentMessage.hint}</Text>
              ) : null}
            </TouchableOpacity>
          ) : (
            <View>
              <Animated.Text
                style={[
                  styles.flatMessageText,
                  { color: currentMessage?.textColor ?? BRAND.textPrimary },
                  messageAnimStyle,
                ]}
              >
                {currentMessage?.text}
              </Animated.Text>
            </View>
          )}

          {messages.length > 1 && (
            <View style={styles.dotRow}>
              {messages.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeMessageIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </Animated.View>

        {/* ─── EVENT HERO CARD ────────────────────────────────── */}
        <EventHeroCard
          event={data.heroEvent}
          scrollY={scrollY}
          onPress={() => {
            if (data.heroEvent) {
              router.push('/(tabs)/parent-schedule' as any);
            }
          }}
          onRsvp={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            data.rsvpHeroEvent('yes');
          }}
        />

        {/* ─── ATTENTION BANNER ───────────────────────────────── */}
        <AttentionBanner
          count={data.attentionCount}
          onPress={() => router.push('/(tabs)/parent-schedule' as any)}
        />

        {/* ─── MY ATHLETE SECTION ─────────────────────────────── */}
        {data.children.length > 0 && (
          <View style={styles.athleteSection}>
            <Text style={styles.sectionHeader}>MY ATHLETE</Text>
            {data.children.map((child, i) => (
              <View key={child.id + '-' + (child.team_id || i)} style={{ marginBottom: 10 }}>
                <AthleteCard
                  child={child}
                  stats={i === 0 ? data.childStats : null}
                  xp={i === 0 ? data.childXp : null}
                  scrollY={scrollY}
                  isSlowScroll={isSlowScroll}
                  screenHeight={SCREEN_HEIGHT}
                />
              </View>
            ))}
          </View>
        )}

        {/* ─── METRIC GRID ─────────────────────────────────────── */}
        <MetricGrid
          record={data.seasonRecord}
          payment={data.paymentStatus}
          xp={data.childXp}
          chat={data.lastChat}
          scrollY={scrollY}
          isSlowScroll={isSlowScroll}
        />

        {/* ─── TEAM HUB PREVIEW ──────────────────────────────── */}
        <TeamHubPreview post={data.latestPost} />

        {/* ─── SEASON SNAPSHOT ───────────────────────────────── */}
        <SeasonSnapshot record={data.seasonRecord} />

        {/* ─── RECENT BADGES ─────────────────────────────────── */}
        <RecentBadges playerIds={data.children.map((c) => c.id)} />

        {/* ─── END OF SCROLL ──────────────────────────────────── */}
        <View style={styles.endSection}>
          <Text style={styles.endEmoji}>{'\u{1F431}'}</Text>
          <Text style={styles.endText}>That's everything for now!</Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Compact header
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: BRAND.white,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  compactHeaderInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.pagePadding,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactMascot: { fontSize: 24 },
  compactBrand: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: BRAND.navy,
    letterSpacing: 1,
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleSelectorWrap: {
    backgroundColor: BRAND.navy,
    borderRadius: 20,
  },
  compactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.skyBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactAvatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: BRAND.white,
  },

  // Calendar sticky
  calendarSticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99,
  },

  // Welcome section
  welcomeSection: {
    paddingHorizontal: SPACING.pagePadding,
    paddingBottom: 12,
  },
  welcomeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bellBtn: {
    position: 'relative',
    padding: 4,
  },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: BRAND.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: BRAND.white,
  },
  welcomeContent: {
    alignItems: 'center',
    marginBottom: 12,
  },
  mascotEmoji: { fontSize: 48, marginBottom: 6 },
  welcomeGreeting: {
    fontFamily: FONTS.bodyBold,
    fontSize: 22,
    color: BRAND.navy,
    textAlign: 'center',
  },
  flatMessageText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 17,
    color: BRAND.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  flatMessageHint: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textFaint,
    textAlign: 'center',
    marginTop: 6,
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.textFaint,
  },
  dotActive: {
    backgroundColor: BRAND.skyBlue,
    width: 18,
    borderRadius: 3,
  },

  // Athlete section
  athleteSection: {
    marginHorizontal: SPACING.pagePadding,
    marginBottom: SPACING.sectionGap,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // End of scroll
  endSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingBottom: 120,
  },
  endEmoji: {
    fontSize: 35,
    opacity: 0.35,
    marginBottom: 8,
  },
  endText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
  },
});
