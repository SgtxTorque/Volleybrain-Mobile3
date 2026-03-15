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
import { useScrollAnimations } from '@/hooks/useScrollAnimations';
import { useAdminHomeData } from '@/hooks/useAdminHomeData';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

import { useResponsive } from '@/lib/responsive';

import NoOrgState from './empty-states/NoOrgState';
import NoTeamState from './empty-states/NoTeamState';

import RoleSelector from './RoleSelector';
import SeasonSelector from './SeasonSelector';
import WelcomeBriefing from './admin-scroll/WelcomeBriefing';
import SmartQueueCard from './admin-scroll/SmartQueueCard';
import TeamHealthTiles from './admin-scroll/TeamHealthTiles';
import PaymentSnapshot from './admin-scroll/PaymentSnapshot';
import QuickActionsGrid from './admin-scroll/QuickActionsGrid';
import TrophyCaseWidget from './TrophyCaseWidget';
import AchievementCelebrationModal from './AchievementCelebrationModal';
import { getUnseenRoleAchievements, markAchievementsSeen } from '@/lib/achievement-engine';
import type { UnseenAchievement } from '@/lib/achievement-types';
import CoachSection from './admin-scroll/CoachSection';
import UpcomingEvents from './admin-scroll/UpcomingEvents';
import ClosingMotivation from './admin-scroll/ClosingMotivation';
import DayStripCalendar from './parent-scroll/DayStripCalendar';

export default function AdminHomeScroll() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { organization, profile } = useAuth();
  const { scrollY, scrollHandler } = useScrollAnimations();
  const data = useAdminHomeData();
  const { isTabletAny, contentMaxWidth, contentPadding } = useResponsive();

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
          { flexGrow: 1, paddingBottom: 140, minHeight: '110%' },
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

        {/* ─── SEASON + ROLE SELECTORS (in-scroll) ────────────── */}
        <View style={styles.roleRow}>
          <View style={{ flex: 1 }} />
          <View style={styles.roleSelectorWrap}>
            <SeasonSelector />
          </View>
          <View style={styles.roleSelectorWrap}>
            <RoleSelector />
          </View>
        </View>

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
        {/* ─── 1. WELCOME BRIEFING ─────────────────────────── */}
        <WelcomeBriefing
          greeting={data.greeting}
          adminName={data.adminName}
          teamCount={data.teams.length}
          playerCount={data.totalPlayers}
          overdueCount={data.overdueQueueCount}
          thisWeekCount={data.thisWeekQueueCount}
          scrollY={scrollY}
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

        {/* ─── 2b. DAY STRIP CALENDAR ─────────────────────── */}
        <DayStripCalendar scrollY={scrollY} eventDates={data.eventDates} />

        {/* ─── 3. SMART QUEUE ─────────────────────────────── */}
        {data.queueItems.length > 0 ? (
          <View style={styles.queueSection}>
            {data.queueItems.slice(0, 4).map((item, idx) => (
              <SmartQueueCard key={item.id} item={item} index={idx} />
            ))}
            {data.queueItems.length > 4 && (
              <TouchableOpacity
                style={styles.viewMoreRow}
                onPress={() => router.push('/registration-hub' as any)}
              >
                <Text style={styles.viewMoreText}>
                  View {data.queueItems.length - 4} more {'\u203A'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.allClearWrap}>
            <Text style={styles.allClearIcon}>{'\u2705'}</Text>
            <Text style={styles.allClearTitle}>All clear!</Text>
            <Text style={styles.allClearSub}>Nothing needs your attention right now.</Text>
          </View>
        )}

        {/* ─── 4. SEASON + TEAM TILES ─────────────────────── */}
        {data.teams.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>{data.seasonName.toUpperCase() || 'SEASON'}</Text>
              <View style={styles.activePill}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>Active</Text>
              </View>
            </View>
            <TeamHealthTiles teams={data.teams} />
          </View>
        )}

        {/* ─── 4b. UPCOMING SEASON PROMPT ────────────────── */}
        {data.upcomingSeason && (
          <View style={styles.upcomingSeasonCard}>
            <View style={styles.upcomingSeasonHeader}>
              <Text style={styles.upcomingSeasonName}>
                {data.upcomingSeason.name.toUpperCase()}
              </Text>
              <View style={styles.planningPill}>
                <View style={styles.planningDot} />
                <Text style={styles.planningText}>Planning</Text>
              </View>
            </View>
            <Text style={styles.upcomingSeasonSub}>
              Starts {new Date(data.upcomingSeason.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.setupBtn}
              onPress={() => router.push('/season-setup-wizard' as any)}
            >
              <Text style={styles.setupBtnText}>Start Setup {'\u203A'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── 5. PAYMENT SNAPSHOT ────────────────────────── */}
        {showPaymentCard && (
          <PaymentSnapshot
            collected={data.collected}
            expected={data.expected}
            overdueAmount={data.overdueAmount}
            overdueCount={data.overdueCount}
            paymentPct={data.paymentPct}
            seasonName={data.seasonName}
            sportName={data.sportName}
          />
        )}

        {/* ─── 6. QUICK ACTIONS ──────────────────────────── */}
        <QuickActionsGrid />

        {/* ─── 7. COACHES ────────────────────────────────── */}
        {data.coaches.length > 0 && (
          <CoachSection coaches={data.coaches} />
        )}

        {/* ─── 7b. TROPHY CASE ─────────────────────────── */}
        {profile?.id && (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <TrophyCaseWidget userId={profile.id} userRole="admin" />
          </View>
        )}

        {/* ─── 8. UPCOMING EVENTS ────────────────────────── */}
        <UpcomingEvents events={data.upcomingEvents} />

        {/* ─── 9. CLOSING ────────────────────────────────── */}
        <ClosingMotivation
          adminName={data.adminName}
          teamCount={data.teams.length}
          playerCount={data.totalPlayers}
          queueTotal={data.queueItems.length}
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
    backgroundColor: BRAND.offWhite,
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
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: BRAND.warmGray,
    borderRadius: 16,
    height: 44,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 10,
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
  queueSection: {
    marginBottom: 20,
    gap: 10,
  },
  viewMoreRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  viewMoreText: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.skyBlue,
  },
  allClearWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
  },
  allClearIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  allClearTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: BRAND.success,
    marginBottom: 4,
  },
  allClearSub: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textMuted,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1.2,
    color: BRAND.textMuted,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.success,
  },
  activeText: {
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.success,
  },
  upcomingSeasonCard: {
    backgroundColor: BRAND.attentionBannerBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
    marginHorizontal: 20,
    padding: 16,
    marginBottom: 16,
  },
  upcomingSeasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  upcomingSeasonName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: BRAND.textMuted,
  },
  planningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.warning,
  },
  planningText: {
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.warning,
  },
  upcomingSeasonSub: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    marginBottom: 12,
  },
  setupBtn: {
    backgroundColor: BRAND.skyBlue,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  setupBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.white,
  },
});
