/**
 * CoachHomeScroll — D System redesign.
 * Compact greeting → dynamic message bar → hero card → momentum → squad → nudge → actions → pulse → trophies → closer.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
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

import { useAuth } from '@/lib/auth';
import { useParentScroll } from '@/lib/parent-scroll-context';
import { useScrollAnimations } from '@/hooks/useScrollAnimations';
import { useCoachHomeData } from '@/hooks/useCoachHomeData';
import { useTeamManagerData } from '@/hooks/useTeamManagerData';
import { usePermissions } from '@/lib/permissions-context';
import { BRAND } from '@/theme/colors';
import { SPACING } from '@/theme/spacing';
import { FONTS } from '@/theme/fonts';
import { D_COLORS } from '@/theme/d-system';

import { useResponsive } from '@/lib/responsive';

import NoOrgState from './empty-states/NoOrgState';
import NoTeamState from './empty-states/NoTeamState';

import RoleSelector from './RoleSelector';
import GiveShoutoutModal from './GiveShoutoutModal';
import AchievementCelebrationModal from './AchievementCelebrationModal';

// D System components (Phases 1-6)
import DynamicMessageBar from './coach-scroll/DynamicMessageBar';
import GameDayHeroCard from './coach-scroll/GameDayHeroCard';
import MomentumCardsRow from './coach-scroll/MomentumCardsRow';
import SquadFacesRow from './coach-scroll/SquadFacesRow';
import SmartNudgeCard from './coach-scroll/SmartNudgeCard';
import ActionGrid2x2 from './coach-scroll/ActionGrid2x2';
import CoachPulseFeed from './coach-scroll/CoachPulseFeed';
import CoachTrophyCase from './coach-scroll/CoachTrophyCase';
import TeamStatsChart from './coach-scroll/TeamStatsChart';
import AmbientCloser from './coach-scroll/AmbientCloser';
import CoachEngagementCard from './coach-scroll/CoachEngagementCard';
import ManagerPaymentCard from './coach-scroll/ManagerPaymentCard';
import ManagerAvailabilityCard from './coach-scroll/ManagerAvailabilityCard';
import ManagerRosterCard from './coach-scroll/ManagerRosterCard';

import { getUnseenRoleAchievements, markAchievementsSeen } from '@/lib/achievement-engine';
import type { UnseenAchievement } from '@/lib/achievement-types';

// ─── Welcome briefing logic ─────────────────────────────────────

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Build a cross-team briefing message (shown ABOVE team filter). */
function buildBriefingMessage(
  teams: { id: string; name: string; wins: number; losses: number }[],
  allEvents: { event_type: string; event_date: string; event_time: string | null; start_time: string | null; opponent_name: string | null; team_name: string }[],
): string {
  const today = new Date().toISOString().split('T')[0];

  const todayEvents = allEvents.filter(e => e.event_date === today);

  if (todayEvents.length > 1) {
    const lines = todayEvents.slice(0, 2).map(e => {
      const time = formatTime(e.event_time || e.start_time);
      const type = e.event_type === 'game' ? 'game' : e.event_type === 'practice' ? 'practice' : 'event';
      return `${e.team_name} ${type}${time ? ` at ${time}` : ''}`;
    });
    return lines.join('. ') + '.';
  }

  if (todayEvents.length === 1) {
    const e = todayEvents[0];
    const time = formatTime(e.event_time || e.start_time);
    if (e.event_type === 'game' && e.opponent_name) {
      return `Game day. ${e.team_name} vs ${e.opponent_name}${time ? ` at ${time}` : ''}.`;
    }
    if (e.event_type === 'practice') {
      return `Practice${time ? ` at ${time}` : ''} for ${e.team_name}.`;
    }
    return `${e.team_name} has an event${time ? ` at ${time}` : ''} today.`;
  }

  if (teams.length > 0) {
    const team = teams[0];
    const nextEvent = allEvents.find(e => e.event_date > today);
    if (nextEvent) {
      const dayName = (() => {
        try {
          return new Date(nextEvent.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
        } catch {
          return 'upcoming';
        }
      })();
      const type = nextEvent.event_type === 'game' ? 'game' : nextEvent.event_type === 'practice' ? 'practice' : 'event';
      return `${team.name} is ${team.wins}-${team.losses} this season. Next up: ${dayName}'s ${type}.`;
    }
    return `${team.name} is ${team.wins}-${team.losses} this season.`;
  }

  return 'Welcome to your team hub.';
}

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

// ─── Main Component ─────────────────────────────────────────────

export default function CoachHomeScroll() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, organization } = useAuth();
  const parentScroll = useParentScroll();
  const { scrollY, scrollHandler } = useScrollAnimations({
    onScrollJS: parentScroll.notifyScroll,
  });
  const data = useCoachHomeData();
  const { isTeamManager } = usePermissions();
  const tmData = useTeamManagerData(isTeamManager ? data.selectedTeamId : null);
  const { isTabletAny, contentMaxWidth, contentPadding } = useResponsive();

  const userInitials = useMemo(() => {
    const name = profile?.full_name || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return '?';
  }, [profile?.full_name]);

  // Shoutout modal state
  const [showShoutoutModal, setShowShoutoutModal] = useState(false);
  const [shoutoutRecipient, setShoutoutRecipient] = useState<{ id: string; full_name: string; avatar_url: string | null; role: string } | null>(null);

  // Signal to tab bar that this scroll is active
  useEffect(() => {
    parentScroll.setParentScrollActive(true);
    return () => {
      parentScroll.setParentScrollActive(false);
      parentScroll.setScrolling(false);
    };
  }, []);

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

  // Briefing message across all teams
  const briefingMessage = useMemo(() => {
    return buildBriefingMessage(data.teams, data.upcomingEvents);
  }, [data.teams, data.upcomingEvents]);

  // Dynamic message bar — contextual message + variant + route
  const messageBarInfo = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = data.upcomingEvents.filter(e => e.event_date === today);
    const todayGame = todayEvents.find(e => e.event_type === 'game');

    if (todayGame) {
      const time = formatTime(todayGame.event_time || todayGame.start_time);
      return {
        message: `Game day — ${todayGame.team_name} vs ${todayGame.opponent_name || 'TBD'}${time ? ` at ${time}` : ''}`,
        icon: '\u{1F525}',
        variant: 'urgent' as const,
        route: `/game-day-command`,
        eventId: todayGame.id,
      };
    }

    const todayPractice = todayEvents.find(e => e.event_type === 'practice');
    if (todayPractice) {
      const time = formatTime(todayPractice.event_time || todayPractice.start_time);
      return {
        message: `Practice today${time ? ` at ${time}` : ''} for ${todayPractice.team_name}`,
        icon: '\u{1F3D0}',
        variant: 'info' as const,
        route: '/(tabs)/coach-schedule',
      };
    }

    if (data.pendingStatsCount > 0) {
      return {
        message: `${data.pendingStatsCount} game${data.pendingStatsCount > 1 ? 's' : ''} need stats entered`,
        icon: '\u{1F4CB}',
        variant: 'payment' as const,
        route: '/game-results',
      };
    }

    // Show next upcoming event if exists
    const nextEvent = data.upcomingEvents.find(e => e.event_date > today);
    if (nextEvent) {
      const dayName = (() => {
        try {
          return new Date(nextEvent.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
        } catch { return 'upcoming'; }
      })();
      const type = nextEvent.event_type === 'game' ? 'game' : nextEvent.event_type === 'practice' ? 'practice' : 'event';
      return {
        message: `Next up: ${dayName}'s ${type} — ${nextEvent.team_name}`,
        icon: '\u{1F4C5}',
        variant: 'info' as const,
        route: '/(tabs)/coach-schedule',
      };
    }

    return null;
  }, [data.upcomingEvents, data.pendingStatsCount]);

  // Suggested player for shoutout nudge
  const suggestedPlayer = useMemo(() => {
    if (!data.topPerformers || data.topPerformers.length === 0) return null;
    // Find the player with the highest kills, aces, or digs
    const best = [...data.topPerformers].sort((a, b) => {
      const aMax = Math.max(a.total_kills, a.total_aces, a.total_digs);
      const bMax = Math.max(b.total_kills, b.total_aces, b.total_digs);
      return bMax - aMax;
    })[0];
    if (!best) return null;
    const stats = [
      { stat: 'kills', value: best.total_kills },
      { stat: 'aces', value: best.total_aces },
      { stat: 'digs', value: best.total_digs },
    ].sort((a, b) => b.value - a.value);
    if (stats[0].value <= 0) return null;
    return { name: best.player_name, stat: stats[0].stat, value: stats[0].value };
  }, [data.topPerformers]);

  // ─── Refresh ──
  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await data.refresh();
  }, [data.refresh]);

  // ─── Animated styles ──

  // Animation 1: Mascot breathing — gentle scale loop
  const mascotScale = useSharedValue(1);
  useEffect(() => {
    mascotScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(mascotScale);
  }, []);
  const mascotBreathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }],
  }));

  // 5A: Welcome parallax — mascot translates up at 0.3x, text fades
  const welcomeAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 100], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, 140], [0, -30], Extrapolation.CLAMP) },
    ],
  }));

  const compactHeaderAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [60, 140], [0, 1], Extrapolation.CLAMP),
  }));

  const teamPillsStickyAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 110], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [30, 110], [-40, 0], Extrapolation.CLAMP) },
    ],
  }));

  // 5B: Event hero card emphasis — scale + shadow when centered
  const heroCardAnimStyle = useAnimatedStyle(() => {
    const cardCenter = 350; // approximate Y of hero card
    const scale = interpolate(
      scrollY.value,
      [cardCenter - 200, cardCenter - 50, cardCenter, cardCenter + 50, cardCenter + 200],
      [1.0, 1.02, 1.02, 1.02, 1.0],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }] };
  });

  // ─── Empty state detection (rendered INSIDE scroll, never early return) ──
  const emptyState: 'loading' | 'no-org' | 'no-teams' | null =
    data.loading ? 'loading'
    : !organization ? 'no-org'
    : (!data.teams || data.teams.length === 0) ? 'no-teams'
    : null;

  const selectedTeam = data.teams?.find(t => t.id === data.selectedTeamId);
  const teamName = selectedTeam?.name ?? '';

  // Hide message bar when hero card is already showing game-day info (avoids redundancy)
  const today = new Date().toISOString().split('T')[0];
  const isGameDayHeroVisible = data.heroEvent?.event_type === 'game' && data.heroEvent?.event_date === today;

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
            <Image source={require('../assets/images/mascot/HiLynx.png')} style={styles.compactMascotImg} resizeMode="contain" />
            <Text style={styles.compactBrand}>LYNX</Text>
          </View>
          <View style={styles.compactRight}>
            <TouchableOpacity
              style={styles.bellBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/notification' as any)}
            >
              <Ionicons name="notifications-outline" size={20} color={BRAND.navy} />
              {data.unreadMessages > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {data.unreadMessages > 9 ? '9+' : data.unreadMessages}
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

      {/* ─── TEAM PILLS (sticky below compact header) ─────────── */}
      <Animated.View
        pointerEvents={headerInteractive ? 'auto' : 'none'}
        style={[
          styles.teamPillsSticky,
          { top: 56 + insets.top },
          teamPillsStickyAnimStyle,
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.teamPillsScroll}
        >
          {(data.teams || []).map(team => {
            const isActive = team.id === data.selectedTeamId;
            return (
              <TouchableOpacity
                key={team.id}
                style={[styles.teamPill, isActive && styles.teamPillActive]}
                activeOpacity={0.7}
                onPress={() => data.selectTeam(team.id)}
              >
                <Text style={[styles.teamPillText, isActive && styles.teamPillTextActive]}>
                  {team.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* ─── SCROLLABLE CONTENT ──────────────────────────────── */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          { paddingBottom: 24, minHeight: '110%' },
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
        {emptyState === 'loading' ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 200 }}>
            <ActivityIndicator size="large" color={BRAND.skyBlue} />
          </View>
        ) : emptyState === 'no-org' ? (
          <View style={{ paddingTop: 120 }}><NoOrgState /></View>
        ) : emptyState === 'no-teams' ? (
          <View style={{ paddingTop: 120 }}><NoTeamState role="coach" /></View>
        ) : (
        <>
        {/* ─── 1. COMPACT MASCOT GREETING (D System) ──────── */}
        <Animated.View
          style={[styles.compactGreeting, { paddingTop: insets.top + 16 }, welcomeAnimStyle]}
        >
          <View style={styles.greetingRow}>
            {/* Mascot avatar */}
            <Animated.View style={[styles.mascotAvatar, mascotBreathStyle]}>
              <Image source={require('../assets/images/mascot/HiLynx.png')} style={styles.mascotAvatarImg} resizeMode="contain" />
            </Animated.View>

            {/* Greeting text */}
            <View style={styles.greetingText}>
              <Text style={styles.greetingLine1}>{isTeamManager ? `Hey Team Manager! ${'\u{1F525}'}` : `Hey Coach! ${'\u{1F525}'}`}</Text>
              <Text style={styles.greetingLine2} numberOfLines={1}>{briefingMessage}</Text>
            </View>

            {/* Team selector pill (compact) */}
            {data.teams && data.teams.length > 1 && selectedTeam && (
              <TouchableOpacity
                style={styles.dTeamPill}
                activeOpacity={0.7}
                onPress={() => {
                  // Cycle to next team
                  const idx = data.teams.findIndex(t => t.id === data.selectedTeamId);
                  const next = data.teams[(idx + 1) % data.teams.length];
                  if (next) data.selectTeam(next.id);
                }}
              >
                <Text style={styles.dTeamPillText} numberOfLines={1}>{selectedTeam.name}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ─── 1b. DYNAMIC MESSAGE BAR (hidden on game day — hero card covers it) ── */}
        {messageBarInfo && !isGameDayHeroVisible && (
          <View style={{ marginBottom: 14 }}>
            <DynamicMessageBar
              message={messageBarInfo.message}
              icon={messageBarInfo.icon}
              variant={messageBarInfo.variant}
              route={messageBarInfo.route}
              eventId={messageBarInfo.eventId}
            />
          </View>
        )}

        {/* ─── 3. GAME DAY HERO (D System — integrated readiness) ── ↕ 18px ── */}
        <Animated.View style={[{ marginBottom: 18 }, heroCardAnimStyle]}>
          <GameDayHeroCard
            event={data.heroEvent}
            rsvpSummary={data.rsvpSummary}
            prepChecklist={data.prepChecklist}
          />
        </Animated.View>

        {/* ─── 3b. TEAM MANAGER CARDS (only visible for TMs) ── ↕ 14px each ── */}
        {isTeamManager && !tmData.loading && data.selectedTeamId && (
          <>
            <View style={{ marginBottom: 14 }}>
              <ManagerPaymentCard
                overduePayments={tmData.overduePayments}
                overdueAmount={tmData.overdueAmount}
                pendingPayments={tmData.pendingPayments}
                totalCollected={tmData.totalCollected}
                teamId={data.selectedTeamId}
              />
            </View>
            <View style={{ marginBottom: 14 }}>
              <ManagerAvailabilityCard
                nextEventTitle={tmData.nextEventTitle}
                nextEventDate={tmData.nextEventDate}
                nextEventType={tmData.nextEventType}
                nextEventId={tmData.nextEventId}
                rsvpConfirmed={tmData.rsvpConfirmed}
                rsvpMaybe={tmData.rsvpMaybe}
                rsvpNoResponse={tmData.rsvpNoResponse}
                rsvpTotal={tmData.rsvpTotal}
                teamId={data.selectedTeamId}
              />
            </View>
            <View style={{ marginBottom: 14 }}>
              <ManagerRosterCard
                rosterCount={tmData.rosterCount}
                pendingApproval={0}
                teamId={data.selectedTeamId}
              />
            </View>
          </>
        )}

        {/* ─── 4. MOMENTUM CARDS (D System — horizontal gradient scroll) ── ↕ 16px ── */}
        <View style={{ marginBottom: 16 }}>
          <MomentumCardsRow
            seasonRecord={data.seasonRecord}
            attendanceRate={data.attendanceRate}
            topPerformers={data.topPerformers}
          />
        </View>

        {/* ─── 5. SQUAD FACES (D System — overlapping avatars) ── ↕ 16px ── */}
        <View style={{ marginBottom: 16 }}>
          <SquadFacesRow
            teamId={data.selectedTeamId}
            teamName={teamName}
            playerCount={selectedTeam?.player_count ?? 0}
            topPerformers={data.topPerformers}
          />
        </View>

        {/* ─── 6. SMART NUDGE (D System — contextual suggestion) ── ↕ 14px ── */}
        <View style={{ marginBottom: 14 }}>
          <SmartNudgeCard
            suggestedPlayer={suggestedPlayer}
            previousMatchup={data.previousMatchup}
            isGameDay={data.heroEvent?.event_type === 'game'}
            attendanceRate={data.attendanceRate}
            onGiveShoutout={() => setShowShoutoutModal(true)}
          />
        </View>

        {/* ─── 6b. TEAM ENGAGEMENT (compact engagement summary) ── ↕ 14px ── */}
        <View style={{ marginBottom: 14 }}>
          <CoachEngagementCard teamId={data.selectedTeamId ?? null} />
        </View>

        {/* ─── 7. ACTION GRID 2x2 (D System — pastel cells) ── ↕ 16px ── */}
        <View style={{ marginBottom: 16 }}>
          <ActionGrid2x2
            onGiveShoutout={() => setShowShoutoutModal(true)}
          />
        </View>

        {/* ─── 8. TEAM PULSE FEED (D System — flat activity feed) ── ↕ 18px ── */}
        <View style={{ marginBottom: 18 }}>
          <CoachPulseFeed teamId={data.selectedTeamId} limit={4} />
        </View>

        {/* ─── 9. FORTNITE TROPHY CASE (D System — dark navy badge grid) ── ↕ 18px ── */}
        {profile?.id && (
          <View style={{ marginBottom: 18 }}>
            <CoachTrophyCase userId={profile.id} />
          </View>
        )}

        {/* ─── 10. TEAM STATS BAR CHART ── ↕ 18px ── */}
        <View style={{ marginBottom: 18 }}>
          <TeamStatsChart topPerformers={data.topPerformers} />
        </View>

        {/* ─── 11. AMBIENT CLOSER (D System — quiet contextual message) ── */}
        <AmbientCloser
          seasonRecord={data.seasonRecord}
          heroEvent={data.heroEvent}
          teamName={teamName}
        />
        </>
        )}
      </Animated.ScrollView>

      {/* ─── SHOUTOUT MODAL ──────────────────────────────────────── */}
      <GiveShoutoutModal
        visible={showShoutoutModal}
        teamId={data.selectedTeamId ?? ''}
        onClose={() => {
          setShowShoutoutModal(false);
          setShoutoutRecipient(null);
        }}
        onSuccess={() => {
          setShowShoutoutModal(false);
          setShoutoutRecipient(null);
        }}
        preselectedRecipient={shoutoutRecipient}
      />

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

// ─── Styles ─────────────────────────────────────────────────────
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

  // Team pills — sticky bar
  teamPillsSticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99,
    backgroundColor: BRAND.white,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    paddingVertical: 8,
  },
  teamPillsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  teamPill: {
    backgroundColor: BRAND.offWhite,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  teamPillActive: {
    backgroundColor: BRAND.skyBlue,
    borderColor: BRAND.skyBlue,
  },
  teamPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  teamPillTextActive: {
    color: BRAND.white,
  },

  // D System compact greeting
  compactGreeting: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mascotAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotAvatarImg: {
    width: 40,
    height: 40,
  },
  greetingText: {
    flex: 1,
    gap: 1,
  },
  greetingLine1: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 17,
    color: BRAND.textPrimary,
  },
  greetingLine2: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  dTeamPill: {
    backgroundColor: BRAND.navyDeep,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 100,
  },
  dTeamPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: BRAND.white,
  },

  // Bell (shared)
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

});
