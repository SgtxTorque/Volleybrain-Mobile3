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

import { useAuth } from '@/lib/auth';
import { useScrollAnimations } from '@/hooks/useScrollAnimations';
import { useCoachHomeData } from '@/hooks/useCoachHomeData';
import { BRAND } from '@/theme/colors';
import { SPACING } from '@/theme/spacing';
import { FONTS } from '@/theme/fonts';
import { D_COLORS } from '@/theme/d-system';

import { useResponsive } from '@/lib/responsive';

import NoOrgState from './empty-states/NoOrgState';
import NoTeamState from './empty-states/NoTeamState';

import RoleSelector from './RoleSelector';
import PrepChecklist from './coach-scroll/PrepChecklist';
import GamePlanCard from './coach-scroll/GamePlanCard';
import ScoutingContext from './coach-scroll/ScoutingContext';
import QuickActions from './coach-scroll/QuickActions';
import EngagementSection from './coach-scroll/EngagementSection';
import TeamHealthCard from './coach-scroll/TeamHealthCard';
import SeasonLeaderboardCard from './coach-scroll/SeasonLeaderboardCard';
import ActionItems from './coach-scroll/ActionItems';
import TeamHubPreviewCard from './coach-scroll/TeamHubPreviewCard';
import ActivityFeed from './coach-scroll/ActivityFeed';
import SeasonSetupCard from './coach-scroll/SeasonSetupCard';
import GiveShoutoutModal from './GiveShoutoutModal';
import TeamPulse from './TeamPulse';
import ChallengeQuickCard from './coach-scroll/ChallengeQuickCard';
import TrophyCaseWidget from './TrophyCaseWidget';
import AchievementCelebrationModal from './AchievementCelebrationModal';
import DynamicMessageBar from './coach-scroll/DynamicMessageBar';
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

  return 'Welcome to your coaching hub.';
}

/** Build contextual closing message based on team situation. */
function buildClosingMessage(
  heroEvent: { event_type: string; event_date: string } | null,
  seasonRecord: { wins: number; losses: number } | null,
): string {
  const today = new Date().toISOString().split('T')[0];

  if (heroEvent?.event_date === today && heroEvent.event_type === 'game') {
    return 'Trust the preparation. Your team is ready.';
  }
  if (heroEvent?.event_date === today && heroEvent.event_type === 'practice') {
    return 'Good practice makes good habits. Set the tone today.';
  }
  if (seasonRecord && seasonRecord.wins > seasonRecord.losses) {
    return 'Momentum is on your side. Keep building.';
  }
  if (!heroEvent || heroEvent.event_date !== today) {
    return 'Recovery matters too. Let them rest.';
  }
  return 'Go make them better today.';
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
  const { scrollY, scrollHandler } = useScrollAnimations();
  const data = useCoachHomeData();
  const { isTabletAny, contentMaxWidth, contentPadding } = useResponsive();

  const firstName = profile?.full_name?.split(' ')[0] || 'Coach';
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

  // Mascot float animation
  const mascotFloat = useSharedValue(0);
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

  // Check if roster has issues (for QuickActions badge)
  const hasRosterIssues = useMemo(() => {
    const missing = data.rsvpSummary?.missing ?? [];
    return missing.length > 0;
  }, [data.rsvpSummary]);

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

  // 5A: Welcome parallax — mascot translates up at 0.3x, text fades
  const welcomeAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 100], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, 140], [0, -30], Extrapolation.CLAMP) },
    ],
  }));

  const mascotParallaxStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: mascotFloat.value + interpolate(scrollY.value, [0, 200], [0, -60], Extrapolation.CLAMP) },
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

  // 5G: Quick actions stagger — handled per-row is complex, use simple fade-slide
  const quickActionsAnimStyle = useAnimatedStyle(() => {
    const cardCenter = 450;
    const opacity = interpolate(
      scrollY.value,
      [cardCenter - 350, cardCenter - 150],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateX = interpolate(
      scrollY.value,
      [cardCenter - 350, cardCenter - 150],
      [-20, 0],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateX }] };
  });

  // ─── Empty state detection (rendered INSIDE scroll, never early return) ──
  const emptyState: 'loading' | 'no-org' | 'no-teams' | null =
    data.loading ? 'loading'
    : !organization ? 'no-org'
    : (!data.teams || data.teams.length === 0) ? 'no-teams'
    : null;

  const selectedTeam = data.teams?.find(t => t.id === data.selectedTeamId);
  const teamName = selectedTeam?.name ?? '';

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
          { paddingBottom: 140 },
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
            <View style={styles.mascotAvatar}>
              <Image source={require('../assets/images/mascot/HiLynx.png')} style={styles.mascotAvatarImg} resizeMode="contain" />
            </View>

            {/* Greeting text */}
            <View style={styles.greetingText}>
              <Text style={styles.greetingLine1}>Hey Coach! {'\u{1F525}'}</Text>
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

        {/* ─── 1b. DYNAMIC MESSAGE BAR ─────────────────────── */}
        {messageBarInfo && (
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

        {/* ─── 2. TEAM SELECTOR PILLS (in-scroll) ── ↕ 4px ──── */}
        <View style={{ marginBottom: 12 }}>
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
        </View>

        {/* ─── 3. PREP CHECKLIST (Tier 2 flat — event days only) ── ↕ 8px ── */}
        <View style={{ marginBottom: 8 }}>
          <PrepChecklist
            checklist={data.prepChecklist}
            eventDate={data.heroEvent?.event_date ?? null}
          />
        </View>

        {/* ─── 4. EVENT HERO CARD (Tier 1 — event days only) ── ↕ 20px ── */}
        {data.heroEvent ? (
          <Animated.View style={[{ marginBottom: 20 }, heroCardAnimStyle]}>
            <GamePlanCard event={data.heroEvent} rsvpSummary={data.rsvpSummary} />
          </Animated.View>
        ) : (
          <View style={styles.quietDayCard}>
            <Text style={styles.quietDayIcon}>{'\u{1F3D0}'}</Text>
            <Text style={styles.quietDayTitle}>No upcoming events</Text>
            <Text style={styles.quietDaySubtext}>
              Use the downtime to review stats, prep your roster, or issue a challenge.
            </Text>
          </View>
        )}

        {/* ─── Scouting Context ── */}
        <View style={{ marginBottom: 12 }}>
          <ScoutingContext previousMatchup={data.previousMatchup} />
        </View>

        {/* ─── 5. QUICK ACTIONS (subtle container) ── ↕ 12px ── */}
        <Animated.View style={[{ marginBottom: 12 }, quickActionsAnimStyle]}>
          <QuickActions
            isEventDay={data.heroEvent !== null}
            pendingStatsCount={data.pendingStatsCount}
            hasRosterIssues={hasRosterIssues}
            onGiveShoutout={() => setShowShoutoutModal(true)}
          />
        </Animated.View>

        {/* ─── 6. ENGAGEMENT NUDGE (Tier 3 — 1 line max) ── ↕ 24px ── */}
        <View style={{ marginBottom: 24 }}>
          <EngagementSection
            onGiveShoutout={() => setShowShoutoutModal(true)}
            suggestedPlayer={suggestedPlayer}
          />
        </View>

        {/* ─── 6b. CHALLENGES QUICK CARD ── ↕ 12px ── */}
        <ChallengeQuickCard teamId={data.selectedTeamId} />

        {/* ─── 7b. ROSTER ACCESS (Tier 2 — one-tap to carousel) ── ↕ 16px ── */}
        <TouchableOpacity
          style={styles.rosterCard}
          activeOpacity={0.85}
          onPress={() => router.push(`/roster?teamId=${data.selectedTeamId}` as any)}
        >
          <View style={styles.rosterLeft}>
            <Text style={styles.rosterLabel}>ROSTER</Text>
            <Text style={styles.rosterTeam} numberOfLines={1}>{teamName}</Text>
            <Text style={styles.rosterCount}>
              {selectedTeam?.player_count ?? 0} player{(selectedTeam?.player_count ?? 0) !== 1 ? 's' : ''} {'\u00B7'} View Roster {'\u2192'}
            </Text>
          </View>
          <View style={styles.rosterIcon}>
            <Ionicons name="people" size={24} color={BRAND.skyBlue} />
          </View>
        </TouchableOpacity>

        {/* ─── 8. SEASON & LEADERBOARD CARD (Tier 1.5 — bars + charts) ── ↕ 20px ── */}
        <View style={{ marginBottom: 20 }}>
          <SeasonLeaderboardCard
            record={data.seasonRecord}
            performers={data.topPerformers}
            teamName={teamName}
            lastGameLine={data.lastGameLine}
            scrollY={scrollY}
            cardY={900}
          />
        </View>

        {/* ─── 9. ACTION ITEMS (Tier 2 — compact lines) ── ↕ 16px ── */}
        <View style={{ marginBottom: 16 }}>
          <ActionItems
            teamId={data.selectedTeamId}
            pendingStatsCount={data.pendingStatsCount}
          />
        </View>

        {/* ─── 10. TEAM HUB PREVIEW (Tier 1.5 — social feed) ── ↕ 16px ── */}
        <View style={{ marginBottom: 16 }}>
          <TeamHubPreviewCard
            teamId={data.selectedTeamId}
            scrollY={scrollY}
            cardY={1100}
          />
        </View>

        {/* ─── 11. RECENT ACTIVITY (Tier 2 — 2 items max) ── ↕ 20px ── */}
        <View style={{ marginBottom: 20 }}>
          <ActivityFeed teamId={data.selectedTeamId} />
        </View>

        {/* ─── 11b. TEAM PULSE (Tier 2 — light variant) ── ↕ 20px ── */}
        <View style={{ marginBottom: 20 }}>
          <TeamPulse teamId={data.selectedTeamId} variant="light" limit={4} />
        </View>

        {/* ─── 11c. TROPHY CASE (Tier 2 — badges + XP) ── ↕ 20px ── */}
        {profile?.id && (
          <View style={{ marginBottom: 20 }}>
            <TrophyCaseWidget userId={profile.id} userRole="coach" />
          </View>
        )}

        {/* ─── 12. SEASON SETUP (conditional — early season only) ── ↕ 24px ── */}
        <View style={{ marginBottom: 24 }}>
          <SeasonSetupCard
            teamId={data.selectedTeamId}
            scrollY={scrollY}
            cardY={1300}
          />
        </View>

        {/* ─── 13. CLOSING (Tier 3) ── ↕ 140px bottom ──────── */}
        <View style={styles.endSection}>
          <Image source={require('../assets/images/mascot/HiLynx.png')} style={styles.endMascotImg} resizeMode="contain" />
          <Text style={styles.endText}>
            {buildClosingMessage(data.heroEvent, data.seasonRecord)}
          </Text>
        </View>
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

  // End of scroll
  endSection: {
    alignItems: 'center',
    paddingTop: 24,
  },
  endMascotImg: {
    width: 40,
    height: 40,
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
  // Roster card
  rosterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  rosterLeft: {
    flex: 1,
    gap: 2,
  },
  rosterLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: BRAND.skyBlue,
    letterSpacing: 1.5,
  },
  rosterTeam: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textPrimary,
  },
  rosterCount: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  rosterIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${BRAND.skyBlue}1A`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Quiet day placeholder (when no upcoming events)
  quietDayCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
    alignItems: 'center',
  },
  quietDayIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quietDayTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  quietDaySubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
