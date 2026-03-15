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
import { useSeason } from '@/lib/season';
import { useParentScroll } from '@/lib/parent-scroll-context';
import { useScrollAnimations, SCROLL_THRESHOLDS } from '@/hooks/useScrollAnimations';
import { useParentHomeData } from '@/hooks/useParentHomeData';

import { useResponsive } from '@/lib/responsive';

import NoOrgState from './empty-states/NoOrgState';
import NoTeamState from './empty-states/NoTeamState';
import { BRAND } from '@/theme/colors';
import { SPACING } from '@/theme/spacing';
import { FONTS } from '@/theme/fonts';
import { D_COLORS } from '@/theme/d-system';

import RoleSelector from './RoleSelector';
import DayStripCalendar from './parent-scroll/DayStripCalendar';
import BillboardHero from './parent-scroll/BillboardHero';
import AttentionBanner from './parent-scroll/AttentionBanner';
import MetricGrid from './parent-scroll/MetricGrid';
import ContextBar from './parent-scroll/ContextBar';
import TeamHubPreview from './parent-scroll/TeamHubPreview';
import SeasonSnapshot from './parent-scroll/SeasonSnapshot';
import RecentBadges from './parent-scroll/RecentBadges';
import AlsoStrip from './parent-scroll/AlsoStrip';
import AmbientCelebration from './parent-scroll/AmbientCelebration';
import FlatChatPreview from './parent-scroll/FlatChatPreview';
import ChallengeVerifyCard from './parent-scroll/ChallengeVerifyCard';
import ParentEvaluationCard from './parent-scroll/EvaluationCard';
import LevelUpCelebrationModal from './LevelUpCelebrationModal';
import FamilyPanel from './FamilyPanel';
import RegistrationCard from './parent-scroll/RegistrationCard';
import RegistrationStatusCard from './parent-scroll/RegistrationStatusCard';
import IncompleteProfileCard from './parent-scroll/IncompleteProfileCard';
import FamilyHeroCard from './parent-scroll/FamilyHeroCard';
import ParentPaymentNudge from './parent-scroll/ParentPaymentNudge';
import ParentAttentionStrip from './parent-scroll/ParentAttentionStrip';
import FamilyKidCard from './parent-scroll/FamilyKidCard';
import ParentXPBar from './parent-scroll/ParentXPBar';
import ParentEventHero from './parent-scroll/ParentEventHero';
import ParentMomentumRow from './parent-scroll/ParentMomentumRow';
import FamilyPulseFeed from './parent-scroll/FamilyPulseFeed';
import ParentTeamHubCard from './parent-scroll/ParentTeamHubCard';
import ParentTrophyBar from './parent-scroll/ParentTrophyBar';
import ParentAmbientCloser from './parent-scroll/ParentAmbientCloser';
import TrophyCaseWidget from './TrophyCaseWidget';
import AchievementCelebrationModal from './AchievementCelebrationModal';
import { getUnseenRoleAchievements, markAchievementsSeen } from '@/lib/achievement-engine';
import type { UnseenAchievement } from '@/lib/achievement-types';

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
      route: '/(tabs)/chats',
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
  const { workingSeason } = useSeason();
  const parentScroll = useParentScroll();
  const { scrollY, isSlowScroll, scrollHandler } = useScrollAnimations({
    onScrollJS: parentScroll.notifyScroll,
  });
  const data = useParentHomeData();
  const { isTabletAny, contentMaxWidth, contentPadding } = useResponsive();

  // ─── Family Panel ──
  const [familyPanelOpen, setFamilyPanelOpen] = useState(false);

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

  // Unseen achievement celebration (parent's own badges)
  const [unseenBadges, setUnseenBadges] = useState<UnseenAchievement[]>([]);
  const [showBadgeCelebration, setShowBadgeCelebration] = useState(false);
  useEffect(() => {
    if (!profile?.id) return;
    getUnseenRoleAchievements(profile.id).then((unseen) => {
      if (unseen.length > 0) {
        setUnseenBadges(unseen);
        setShowBadgeCelebration(true);
      }
    }).catch(() => {});
  }, [profile?.id]);

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
  const lastName = (() => {
    const parts = (profile?.full_name || '').split(' ').filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 1] : '';
  })();
  const userInitials = (() => {
    const name = profile?.full_name || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return '?';
  })();

  // ─── Derive greeting context from real data ──
  const heroContext = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const todayEvents = data.allUpcomingEvents.filter(e => e.date === todayStr);
    const isGameDay = todayEvents.some(e => e.eventType === 'game');
    const isPracticeDay = !isGameDay && todayEvents.some(e => e.eventType === 'practice');

    // winStreak: use season wins as proxy (exact streak not available)
    const winStreak = data.seasonRecord?.wins ?? 0;

    // justWon/justLost: not available from current hook data
    const justWon = false;
    const justLost = false;

    return { isGameDay, isPracticeDay, winStreak, justWon, justLost };
  }, [data.allUpcomingEvents, data.seasonRecord]);

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

  // Empty state detection (rendered INSIDE scroll, never early return)
  const emptyState: 'no-org' | 'no-children' | null =
    !data.loading && !organization ? 'no-org'
    : !data.loading && (!data.children || data.children.length === 0) ? 'no-children'
    : null;

  return (
    <View style={[styles.root, { backgroundColor: D_COLORS.pageBg }]}>
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

      {/* ─── SCROLLABLE CONTENT ──────────────────────────────── */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          { paddingBottom: 90 },
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
        {data.loading ? (
          /* Loading: keep ScrollView mounted so its gesture handler stays registered */
          <View style={{ justifyContent: 'center', alignItems: 'center', height: SCREEN_HEIGHT - 150 }}>
            <ActivityIndicator size="large" color={BRAND.skyBlue} />
          </View>
        ) : emptyState === 'no-org' ? (
          <View style={{ paddingTop: 120 }}><NoOrgState /></View>
        ) : emptyState === 'no-children' ? (
          <View style={{ paddingTop: 120 }}><NoTeamState role="parent" /></View>
        ) : (
        <>
        {/* ─── FAMILY HERO CARD ───────────────────────────────── */}
        <View style={{ paddingTop: insets.top + 16 }}>
          <FamilyHeroCard
            lastName={lastName}
            firstName={firstName}
            children={data.allChildren}
            seasonName={workingSeason?.name || ''}
            isGameDay={heroContext.isGameDay}
            isPracticeDay={heroContext.isPracticeDay}
            winStreak={heroContext.winStreak}
            hasPaymentDue={data.paymentStatus.balance > 0}
            justWon={heroContext.justWon}
            justLost={heroContext.justLost}
            parentXp={data.childXp}
          />
        </View>

        {/* ─── PAYMENT NUDGE ────────────────────────────────────── */}
        <ParentPaymentNudge balance={data.paymentStatus.balance} />

        {/* ─── ATTENTION STRIP (expandable) ─────────────────────── */}
        <ParentAttentionStrip
          count={data.attentionCount}
          items={data.familyAttentionItems}
        />

        {/* ─── FAMILY KID CARDS ──────────────────────────────── */}
        <FamilyKidCard
          kids={data.allChildren}
          nextEvents={data.allUpcomingEvents}
          onOpenFamilyPanel={() => setFamilyPanelOpen(true)}
        />

        {/* ─── EVENT HERO (dark navy, +XP on RSVP) ──────────── */}
        <ParentEventHero
          event={data.allUpcomingEvents[0] || null}
          child={data.allChildren.find(c => c.playerId === data.allUpcomingEvents[0]?.childId) || data.allChildren[0] || null}
          onRsvp={(eventId, childId, status) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            data.rsvpEvent(eventId, childId, status);
          }}
          isMultiChild={data.isMultiChild}
        />

        {/* ─── MOMENTUM CARDS ────────────────────────────────── */}
        <ParentMomentumRow
          seasonRecord={data.seasonRecord}
          paymentStatus={data.paymentStatus}
          childXp={data.childXp}
        />

        {/* ─── FAMILY PULSE FEED ─────────────────────────────── */}
        <FamilyPulseFeed
          latestPost={data.latestPost}
          lastChat={data.lastChat}
          seasonRecord={data.seasonRecord}
          childName={childName}
        />

        {/* ─── TEAM HUB PREVIEW ──────────────────────────────── */}
        <ParentTeamHubCard
          kids={data.allChildren}
          latestPost={data.latestPost}
        />

        {/* ─── PARENT TROPHY BAR ─────────────────────────────── */}
        {profile?.id && (
          <ParentTrophyBar userId={profile.id} />
        )}

        {/* ─── UPCOMING SEASON REGISTRATION (bottom variant) ── */}
        <RegistrationCard
          childName={data.children.length > 0 ? data.children[0].first_name : null}
          variant="bottom"
        />

        {/* ─── AMBIENT CLOSER ────────────────────────────────── */}
        <ParentAmbientCloser
          children={data.allChildren}
          heroEvent={data.allUpcomingEvents[0] || null}
          seasonRecord={data.seasonRecord}
          lastName={lastName}
        />
        </>
        )}
      </Animated.ScrollView>

      {/* ─── LEVEL-UP CELEBRATION (child) ──────────────────────── */}
      <LevelUpCelebrationModal
        visible={showLevelUp}
        newLevel={levelUpLevel}
        totalXp={levelUpXp}
        onDismiss={() => setShowLevelUp(false)}
      />

      {/* ─── ACHIEVEMENT CELEBRATION (parent badges) ─────────────── */}
      {showBadgeCelebration && unseenBadges.length > 0 && (
        <AchievementCelebrationModal
          unseen={unseenBadges}
          onDismiss={() => {
            setShowBadgeCelebration(false);
            setUnseenBadges([]);
            if (profile?.id) markAchievementsSeen(profile.id).catch(() => {});
          }}
          onViewAllTrophies={() => {
            setShowBadgeCelebration(false);
            setUnseenBadges([]);
            if (profile?.id) markAchievementsSeen(profile.id).catch(() => {});
            router.push('/achievements' as any);
          }}
          themeColors={{
            bg: '#0A0F1A',
            card: '#111827',
            cardAlt: '#1A2235',
            border: 'rgba(255,255,255,0.08)',
            text: '#FFFFFF',
            textSecondary: '#CBD5E1',
            textMuted: '#64748B',
            gold: '#FFD700',
          }}
        />
      )}

      {/* ─── FAMILY PANEL (right-side drawer — always available) ── */}
      <FamilyPanel
        visible={familyPanelOpen}
        onClose={() => setFamilyPanelOpen(false)}
        allChildren={data.allChildren}
        allEvents={data.allUpcomingEvents}
        payment={data.paymentStatus}
        onSelectContext={(ctx) => {
          data.setSelectedContext(ctx);
        }}
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

  // Single child compact card
  singleChildCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.pagePadding,
    marginBottom: 12,
    backgroundColor: BRAND.cardBg || BRAND.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 12,
  },
  singleChildPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  singleChildInitial: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleChildInitialText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: BRAND.white,
  },
  singleChildInfo: {
    flex: 1,
  },
  singleChildName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: BRAND.textPrimary,
  },
  singleChildMeta: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 2,
  },

  // Multi-child avatar row
  multiChildRow: {
    marginHorizontal: SPACING.pagePadding,
    marginBottom: 12,
    backgroundColor: BRAND.cardBg || BRAND.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarCircleFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircleText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.white,
  },
  avatarOverflow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.warmGray || '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverflowText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  multiChildLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  multiChildText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textMuted,
  },

});
