/**
 * ParentHomeScroll — scroll-driven parent home dashboard.
 * Phase 7: Dynamic data wiring + contextual messages.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/lib/auth';
import { useParentScroll } from '@/lib/parent-scroll-context';
import { useScrollAnimations, SCROLL_THRESHOLDS } from '@/hooks/useScrollAnimations';
import { useParentHomeData } from '@/hooks/useParentHomeData';

import { useResponsive } from '@/lib/responsive';

import NoOrgState from './empty-states/NoOrgState';
import NoTeamState from './empty-states/NoTeamState';
import EmptySeasonState from './empty-states/EmptySeasonState';
import { BRAND } from '@/theme/colors';
import { SPACING } from '@/theme/spacing';
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
import SecondaryEvents from './parent-scroll/SecondaryEvents';
import AmbientCelebration from './parent-scroll/AmbientCelebration';
import FlatChatPreview from './parent-scroll/FlatChatPreview';
import ChallengeVerifyCard from './parent-scroll/ChallengeVerifyCard';
import ParentEvaluationCard from './parent-scroll/EvaluationCard';
import LevelUpCelebrationModal from './LevelUpCelebrationModal';
import RegistrationCard from './parent-scroll/RegistrationCard';
import RegistrationStatusCard from './parent-scroll/RegistrationStatusCard';
import IncompleteProfileCard from './parent-scroll/IncompleteProfileCard';

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
      textColor: BRAND.warning,
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
  const { profile, organization } = useAuth();
  const parentScroll = useParentScroll();
  const { scrollY, isSlowScroll, scrollHandler } = useScrollAnimations({
    onScrollJS: parentScroll.notifyScroll,
  });
  const data = useParentHomeData();
  const { isTabletAny, contentMaxWidth, contentPadding } = useResponsive();

  // ─── Level-up celebration for child ──
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(0);
  const [levelUpXp, setLevelUpXp] = useState(0);
  useEffect(() => {
    if (data.loading || !data.childXp || data.children.length === 0) return;
    const childId = data.children[0].id;
    const key = `lynx_parent_child_level_${childId}`;
    AsyncStorage.getItem(key).then((stored) => {
      const prev = stored ? parseInt(stored, 10) : 0;
      if (prev > 0 && data.childXp!.level > prev) {
        setLevelUpLevel(data.childXp!.level);
        setLevelUpXp(data.childXp!.totalXp);
        setShowLevelUp(true);
      }
      AsyncStorage.setItem(key, String(data.childXp!.level));
    });
  }, [data.loading, data.childXp?.level, data.children]);

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

  // Header interactivity — pointerEvents must be a View prop, not animated style
  const [headerInteractive, setHeaderInteractive] = useState(false);
  const prevHeaderState = useSharedValue(false);
  useDerivedValue(() => {
    const interactive = scrollY.value > 80;
    if (interactive !== prevHeaderState.value) {
      prevHeaderState.value = interactive;
      runOnJS(setHeaderInteractive)(interactive);
    }
    return interactive;
  });

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

  // Smart empty states
  if (!organization) return <NoOrgState />;
  if (!data.children || data.children.length === 0) return <NoTeamState role="parent" />;
  if (!data.upcomingEvents || data.upcomingEvents.length === 0) return <EmptySeasonState role="parent" />;

  return (
    <View style={[styles.root, { backgroundColor: BRAND.offWhite }]}>
      {/* ─── COMPACT HEADER ──────────────────────────────────── */}
      <Animated.View
        pointerEvents={headerInteractive ? 'auto' : 'none'}
        style={[
          styles.compactHeader,
          { paddingTop: insets.top, height: 56 + insets.top },
          compactHeaderAnimStyle,
        ]}
      >
        <View style={styles.compactHeaderInner}>
          <View style={styles.compactLeft}>
            <Image source={require('@/assets/images/mascot/HiLynx.png')} style={styles.compactMascotImg} resizeMode="contain" />
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
        pointerEvents={headerInteractive ? 'auto' : 'none'}
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
        contentContainerStyle={[
          { paddingBottom: 120 },
          isTabletAny && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: contentPadding },
        ]}
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
            <Animated.View style={[styles.mascotImageWrap, mascotAnimStyle]}><Image source={require('@/assets/images/mascot/HiLynx.png')} style={[styles.mascotImage, isTabletAny && { width: 80, height: 80 }]} resizeMode="contain" /></Animated.View>
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

        {/* ─── REGISTRATION STATUS + OPEN REGISTRATION ─────── */}
        <View style={{ paddingHorizontal: SPACING.pagePadding }}>
          <RegistrationStatusCard />
          <RegistrationCard childName={data.children.length > 0 ? data.children[0].first_name : null} />
          <IncompleteProfileCard />
        </View>

        {/* ─── EVENT HERO CARD ────────────────────────────────── */}
        <EventHeroCard
          event={data.heroEvent}
          scrollY={scrollY}
          rsvpStatus={data.heroRsvpStatus}
          onPress={() => {
            if (data.heroEvent) {
              router.push('/(tabs)/parent-schedule' as any);
            }
          }}
          onRsvp={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // Cycle: null → yes → no → maybe → null → ...
            const cycle: Array<'yes' | 'no' | 'maybe'> = ['yes', 'no', 'maybe'];
            const currentIdx = data.heroRsvpStatus ? cycle.indexOf(data.heroRsvpStatus) : -1;
            const nextStatus = cycle[(currentIdx + 1) % cycle.length];
            data.rsvpHeroEvent(nextStatus);
          }}
        />

        {/* ─── SECONDARY EVENTS (flat lines) ───────────────────── */}
        <SecondaryEvents events={data.upcomingEvents} />

        {/* ─── ATTENTION NUDGE ──────────────────────────────────── */}
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

        {/* ─── AMBIENT CELEBRATION (Tier 3) ─────────────────────── */}
        {data.children.length > 0 && (
          <AmbientCelebration
            playerIds={data.children.map((c) => c.id)}
            childNames={Object.fromEntries(data.children.map((c) => [c.id, c.first_name]))}
          />
        )}

        {/* ─── CHALLENGES ─────────────────────────────────────── */}
        {data.children.length > 0 && (
          <ChallengeVerifyCard
            children={data.children.map((c) => ({
              id: c.id,
              first_name: c.first_name,
              teamId: c.team_id,
            }))}
          />
        )}

        {/* ─── EVALUATIONS ─────────────────────────────────────── */}
        {data.children.length > 0 && (
          <ParentEvaluationCard
            children={data.children.map((c) => ({
              id: c.id,
              first_name: c.first_name,
            }))}
          />
        )}

        {/* ─── METRIC GRID ─────────────────────────────────────── */}
        <MetricGrid
          record={data.seasonRecord}
          payment={data.paymentStatus}
          xp={data.childXp}
          chat={data.lastChat}
          childPlayerId={data.children[0]?.id}
        />

        {/* ─── TEAM HUB PREVIEW (flat) ──────────────────────── */}
        <TeamHubPreview post={data.latestPost} />

        {/* ─── CHAT PREVIEW (flat) ─────────────────────────── */}
        <FlatChatPreview chat={data.lastChat} />

        {/* ─── SEASON SCOREBOARD (flat) ────────────────────── */}
        <SeasonSnapshot record={data.seasonRecord} />

        {/* ─── RECENT BADGES ─────────────────────────────────── */}
        <RecentBadges playerIds={data.children.map((c) => c.id)} childPlayerId={data.children[0]?.id} />

        {/* ─── UPCOMING SEASON REGISTRATION (below current content) ─── */}
        <RegistrationCard
          childName={data.children.length > 0 ? data.children[0].first_name : null}
          variant="bottom"
        />

        {/* ─── END OF SCROLL (contextual closing) ────────────── */}
        <View style={styles.endSection}>
          <Image source={require('@/assets/images/mascot/SleepLynx.png')} style={styles.endMascot} resizeMode="contain" />
          <Text style={styles.endText}>
            {(() => {
              const he = data.heroEvent;
              if (he) {
                const isToday = (() => {
                  const today = new Date().toDateString();
                  const evtDate = new Date(he.event_date + 'T00:00:00').toDateString();
                  return today === evtDate;
                })();
                if (isToday) {
                  const timeStr = he.event_time
                    ? (() => { const [h,m] = he.event_time.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; })()
                    : '';
                  return `See you at ${(he.event_type || 'the event').toLowerCase()}${timeStr ? ` at ${timeStr}` : ''}. \u{1F3D0}`;
                }
                const isTomorrow = (() => {
                  const tmrw = new Date();
                  tmrw.setDate(tmrw.getDate() + 1);
                  return tmrw.toDateString() === new Date(he.event_date + 'T00:00:00').toDateString();
                })();
                if (isTomorrow) {
                  return `${(he.event_type || 'Event')} tomorrow. Get some rest.`;
                }
                const dayName = new Date(he.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
                return `Next up: ${dayName}'s ${(he.event_type || 'event').toLowerCase()}. ${childName} is ready.`;
              }
              return 'That\'s everything for now. Go be great.';
            })()}
          </Text>
        </View>
      </Animated.ScrollView>

      {/* ─── LEVEL-UP CELEBRATION (child) ──────────────────────── */}
      <LevelUpCelebrationModal
        visible={showLevelUp}
        newLevel={levelUpLevel}
        totalXp={levelUpXp}
        onDismiss={() => setShowLevelUp(false)}
      />
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
  compactMascotImg: { width: 24, height: 24 },
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

  // Welcome section (Tier 3 greeting — tight gap to nudge below)
  welcomeSection: {
    paddingHorizontal: SPACING.pagePadding,
    paddingBottom: 4,
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
  mascotImageWrap: { marginBottom: 6 },
  mascotImage: { width: 64, height: 64 },
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
    marginBottom: 12,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: BRAND.textMuted,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // End of scroll (contextual closing)
  endSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 140,
  },
  endEmoji: {
    fontSize: 40,
    opacity: 0.3,
    marginBottom: 8,
  },
  endMascot: {
    width: 48,
    height: 48,
    opacity: 0.3,
    marginBottom: 8,
  },
  endText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textFaint,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
