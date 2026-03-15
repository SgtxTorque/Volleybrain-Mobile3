/**
 * AdminHomeScroll — scroll-driven admin home dashboard.
 * Smart Queue design: see what's urgent, act on it, watch the counter drop.
 * Light theme, three-tier visual system.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/lib/auth';
import { useParentScroll } from '@/lib/parent-scroll-context';
import { useScrollAnimations } from '@/hooks/useScrollAnimations';
import { useAdminHomeData } from '@/hooks/useAdminHomeData';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { D_COLORS } from '@/theme/d-system';

import { useResponsive } from '@/lib/responsive';

import NoOrgState from './empty-states/NoOrgState';
import NoTeamState from './empty-states/NoTeamState';

import RoleSelector from './RoleSelector';
import SeasonSelector from './SeasonSelector';
import MissionControlHero from './admin-scroll/MissionControlHero';
import AdminAttentionStrip from './admin-scroll/AdminAttentionStrip';
import AdminTeamHealthCards from './admin-scroll/AdminTeamHealthCards';
import AdminFinancialChart from './admin-scroll/AdminFinancialChart';
import AdminActionPills from './admin-scroll/AdminActionPills';
import OrgPulseFeed from './admin-scroll/OrgPulseFeed';
import OrgHealthChart from './admin-scroll/OrgHealthChart';
import AdminTrophyBar from './admin-scroll/AdminTrophyBar';
import AdminAmbientCloser from './admin-scroll/AdminAmbientCloser';
// TrophyCaseWidget removed from render (shared, file preserved)
import AchievementCelebrationModal from './AchievementCelebrationModal';
import { getUnseenRoleAchievements, markAchievementsSeen } from '@/lib/achievement-engine';
import type { UnseenAchievement } from '@/lib/achievement-types';
// CoachSection, UpcomingEvents, ClosingMotivation, DayStripCalendar removed from render (files preserved)

export default function AdminHomeScroll() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { organization, profile } = useAuth();
  const parentScroll = useParentScroll();
  const { scrollY, scrollHandler } = useScrollAnimations({
    onScrollJS: parentScroll.notifyScroll,
  });
  const data = useAdminHomeData();
  const { isTabletAny, contentMaxWidth, contentPadding } = useResponsive();

  // Signal to tab bar that this scroll is active
  useEffect(() => {
    parentScroll.setParentScrollActive(true);
    return () => {
      parentScroll.setParentScrollActive(false);
      parentScroll.setScrolling(false);
    };
  }, []);

  // Header interactivity
  const [headerVisible, setHeaderVisible] = React.useState(false);
  const prevState = useSharedValue(false);
  useDerivedValue(() => {
    const show = scrollY.value > 120;
    if (show !== prevState.value) {
      prevState.value = show;
      runOnJS(setHeaderVisible)(show);
    }
    return show;
  });

  // Unseen achievement celebration
  const [unseenBadges, setUnseenBadges] = useState<UnseenAchievement[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  useEffect(() => {
    if (!profile?.id) return;
    getUnseenRoleAchievements(profile.id).then((unseen) => {
      if (unseen.length > 0) {
        setUnseenBadges(unseen);
        setShowCelebration(true);
      }
    }).catch(() => {});
  }, [profile?.id]);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await data.refresh();
  }, [data.refresh]);

  // Compact header fade + slide
  const compactHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [80, 140], [0, 1], Extrapolation.CLAMP),
    transform: [{
      translateY: interpolate(scrollY.value, [80, 140], [-8, 0], Extrapolation.CLAMP),
    }],
  }));

  const showPaymentCard = data.expected > 0;

  // Determine which empty state to show INSIDE the scroll (never early return)
  const emptyState: 'loading' | 'no-org' | 'no-teams' | null =
    data.loading ? 'loading'
    : !organization ? 'no-org'
    : (!data.teams || data.teams.length === 0) ? 'no-teams'
    : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ─── COMPACT HEADER ────────────────────────────────── */}
      <Animated.View
        pointerEvents={headerVisible ? 'auto' : 'none'}
        style={[
          styles.compactHeader,
          { paddingTop: insets.top, height: 44 + insets.top },
          compactHeaderStyle,
        ]}
      >
        <View style={styles.compactInner}>
          <Text style={styles.compactBrand}>lynx</Text>
          <View style={styles.compactRight}>
            {data.overdueQueueCount > 0 && (
              <View style={styles.urgencyBadge}>
                <Text style={styles.urgencyBadgeText}>{data.overdueQueueCount}</Text>
              </View>
            )}
            <View style={styles.roleSelectorWrap}>
              <SeasonSelector />
            </View>
            <View style={styles.roleSelectorWrap}>
              <RoleSelector />
            </View>
          </View>
        </View>
      </Animated.View>

      {/* ─── SCROLLABLE CONTENT ────────────────────────────── */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          { flexGrow: 1, paddingBottom: 24, minHeight: '110%' },
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
        <View style={{ height: insets.top + 16 }} />

        {/* ─── EMPTY STATES (inside scroll, never early return) ── */}
        {emptyState === 'loading' ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={BRAND.skyBlue} />
          </View>
        ) : emptyState === 'no-org' ? (
          <NoOrgState />
        ) : emptyState === 'no-teams' ? (
          <NoTeamState role="admin" />
        ) : (
        <>
        {/* ─── 1. MISSION CONTROL HERO ─────────────────────── */}
        <MissionControlHero
          adminName={data.adminName}
          orgName={data.orgName}
          teamCount={data.teams.length}
          playerCount={data.totalPlayers}
          coachCount={data.coaches.length}
          overdueCount={data.overdueCount}
          collected={data.collected}
          pendingRegs={data.pendingRegs}
          paymentPct={data.paymentPct}
          queueLength={data.queueItems.length}
          hasGameToday={data.upcomingEvents.some(e => {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            return e.event_date === todayStr && e.event_type === 'game';
          })}
        />

        {/* ─── 2. SEARCH BAR ──────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/players' as any)}
          style={styles.searchBar}
        >
          <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
          <Text style={styles.searchPlaceholder}>Search players, families, teams...</Text>
        </TouchableOpacity>

        {/* ─── 3. ATTENTION STRIP ───────────────────────────── */}
        <AdminAttentionStrip items={data.queueItems} />

        {/* ─── 4. FINANCIAL CHART ───────────────────────────── */}
        {showPaymentCard && (
          <AdminFinancialChart
            collected={data.collected}
            expected={data.expected}
            overdueAmount={data.overdueAmount}
            overdueCount={data.overdueCount}
            paymentPct={data.paymentPct}
            seasonName={data.seasonName}
          />
        )}

        {/* ─── 5. TEAM HEALTH CARDS ─────────────────────────── */}
        <AdminTeamHealthCards teams={data.teams} />

        {/* ─── 6. ORG HEALTH CHART ─────────────────────────── */}
        <OrgHealthChart
          teams={data.teams}
          totalPlayers={data.totalPlayers}
          collected={data.collected}
          expected={data.expected}
          overdueCount={data.overdueCount}
          pendingRegs={data.pendingRegs}
        />

        {/* ─── 7. ACTION PILLS ──────────────────────────────── */}
        <AdminActionPills />

        {/* ─── 8. ORG PULSE FEED ──────────────────────────── */}
        <OrgPulseFeed
          collected={data.collected}
          pendingRegs={data.pendingRegs}
          overdueCount={data.overdueCount}
          upcomingEvents={data.upcomingEvents}
        />

        {/* ─── 9. ADMIN TROPHY BAR ─────────────────────────── */}
        {profile?.id && <AdminTrophyBar userId={profile.id} />}

        {/* ─── 10. AMBIENT CLOSER ─────────────────────────── */}
        <AdminAmbientCloser
          adminName={data.adminName}
          teamCount={data.teams.length}
          playerCount={data.totalPlayers}
          queueCount={data.queueItems.length}
        />
        </>
        )}
      </Animated.ScrollView>

      {/* ─── ACHIEVEMENT CELEBRATION ──────────────────────────── */}
      {showCelebration && unseenBadges.length > 0 && (
        <AchievementCelebrationModal
          unseen={unseenBadges}
          onDismiss={() => {
            setShowCelebration(false);
            setUnseenBadges([]);
            if (profile?.id) markAchievementsSeen(profile.id).catch(() => {});
          }}
          onViewAllTrophies={() => {
            setShowCelebration(false);
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: D_COLORS.pageBg,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(246,248,251,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  compactInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  compactBrand: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 20,
    color: BRAND.skyBlue,
    letterSpacing: -0.5,
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgencyBadge: {
    backgroundColor: BRAND.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  urgencyBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: BRAND.white,
  },
  roleSelectorWrap: {
    backgroundColor: BRAND.navy,
    borderRadius: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: BRAND.white,
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 16,
    opacity: 0.4,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: BRAND.textFaint,
    fontFamily: FONTS.bodyMedium,
  },
});
