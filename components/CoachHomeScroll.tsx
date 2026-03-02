/**
 * CoachHomeScroll — scroll-driven coach home dashboard.
 * Phase 6: Closing, animations, spacing rhythm.
 * Three-tier visual system mirroring the Parent Home Scroll.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import RoleSelector from './RoleSelector';
import PrepChecklist from './coach-scroll/PrepChecklist';
import GamePlanCard from './coach-scroll/GamePlanCard';
import ScoutingContext from './coach-scroll/ScoutingContext';
import QuickActions from './coach-scroll/QuickActions';
import EngagementSection from './coach-scroll/EngagementSection';
import TeamPulse from './coach-scroll/TeamPulse';
import RosterAlerts from './coach-scroll/RosterAlerts';
import ActionItems from './coach-scroll/ActionItems';
import ActivityFeed from './coach-scroll/ActivityFeed';
import SeasonScoreboard from './coach-scroll/SeasonScoreboard';
import TopPerformers from './coach-scroll/TopPerformers';

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

  // Events today across ALL teams
  const todayEvents = allEvents.filter(e => e.event_date === today);

  if (todayEvents.length > 1) {
    // Multiple events today
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

  // No events today — show record + next event
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
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();

  // 1. Game today
  if (heroEvent?.event_date === today && heroEvent.event_type === 'game') {
    return 'Trust the preparation. Your team is ready.';
  }
  // 2. Practice today
  if (heroEvent?.event_date === today && heroEvent.event_type === 'practice') {
    return 'Good practice makes good habits. Set the tone today.';
  }
  // 3-4. Recent result (simplified — check if we have record context)
  if (seasonRecord && seasonRecord.wins > seasonRecord.losses) {
    return 'Momentum is on your side. Keep building.';
  }
  // 5. Off day
  if (!heroEvent || heroEvent.event_date !== today) {
    return 'Recovery matters too. Let them rest.';
  }
  // 7. Fallback
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
  const { profile } = useAuth();
  const { scrollY, scrollHandler } = useScrollAnimations();
  const data = useCoachHomeData();

  const firstName = profile?.full_name?.split(' ')[0] || 'Coach';
  const userInitials = useMemo(() => {
    const name = profile?.full_name || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return '?';
  }, [profile?.full_name]);

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
    // Gather events from all teams (upcomingEvents is filtered by selected team)
    // For the global briefing we use the data available
    return buildBriefingMessage(data.teams, data.upcomingEvents);
  }, [data.teams, data.upcomingEvents]);

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

  const teamPillsStickyAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 110], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [30, 110], [-40, 0], Extrapolation.CLAMP) },
    ],
  }));

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
        pointerEvents={headerInteractive ? 'auto' : 'none'}
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
          {data.teams.map(team => {
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
              {data.unreadMessages > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {data.unreadMessages > 9 ? '9+' : data.unreadMessages}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.welcomeContent}>
            <Animated.Text style={[styles.mascotEmoji, mascotAnimStyle]}>
              {'\u{1F431}'}
            </Animated.Text>
            <Text style={styles.welcomeGreeting}>
              {getTimeGreeting()}, Coach
            </Text>
          </View>

          <Text style={styles.briefingText}>{briefingMessage}</Text>
        </Animated.View>

        {/* ─── TEAM SELECTOR PILLS (in-scroll) ────────────────── */}
        {/* ↕ 4px gap from welcome briefing (via welcomeSection paddingBottom: 4) */}
        <View style={{ marginBottom: 16 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.teamPillsScroll}
          >
            {data.teams.map(team => {
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

        {/* ─── PREP CHECKLIST (Tier 2) ── ↕ 8px below ─────────── */}
        <View style={{ marginBottom: 8 }}>
          <PrepChecklist
            checklist={data.prepChecklist}
            eventDate={data.heroEvent?.event_date ?? null}
          />
        </View>

        {/* ─── GAME PLAN CARD (Tier 1) ── ↕ 20px below ──────── */}
        <View style={{ marginBottom: 20 }}>
          <GamePlanCard event={data.heroEvent} rsvpSummary={data.rsvpSummary} />
        </View>

        {/* ─── SCOUTING CONTEXT (Tier 2) ── ↕ 16px below ─────── */}
        <View style={{ marginBottom: 16 }}>
          <ScoutingContext previousMatchup={data.previousMatchup} />
        </View>

        {/* ─── QUICK ACTIONS (Tier 2 panel) ── ↕ 16px below ───── */}
        <View style={{ marginBottom: 16 }}>
          <QuickActions isEventDay={data.heroEvent !== null} />
        </View>

        {/* ─── ENGAGEMENT (Tier 3 single nudge) ── ↕ 28px below ── */}
        <View style={{ marginBottom: 28 }}>
          <EngagementSection />
        </View>

        {/* ─── TEAM PULSE (Tier 2) ── ↕ 24px below ──────────────── */}
        <View style={{ marginBottom: 24 }}>
          <TeamPulse
            attendanceRate={data.attendanceRate}
            rsvpSummary={data.rsvpSummary}
            unreadMessages={data.unreadMessages}
            heroEventDate={data.heroEvent?.event_date ?? null}
          />
        </View>

        {/* ─── ROSTER ALERTS ── ↕ 24px below ───────────────────── */}
        <View style={{ marginBottom: 24 }}>
          <RosterAlerts
            teamId={data.selectedTeamId}
            rosterSize={data.teams.find(t => t.id === data.selectedTeamId)?.player_count ?? 0}
            missingRsvpNames={data.rsvpSummary?.missing ?? []}
          />
        </View>

        {/* ─── ACTION ITEMS (merged eval + stats) ── ↕ 24px below ─ */}
        <View style={{ marginBottom: 24 }}>
          <ActionItems
            teamId={data.selectedTeamId}
            pendingStatsCount={data.pendingStatsCount}
          />
        </View>

        {/* ─── ACTIVITY FEED (Tier 2) ── ↕ 28px below ──────────── */}
        <View style={{ marginBottom: 28 }}>
          <ActivityFeed teamId={data.selectedTeamId} />
        </View>

        {/* ─── SEASON SCOREBOARD (Tier 2) ── ↕ 16px below ──────── */}
        <SeasonScoreboard
          record={data.seasonRecord}
          nextEvent={data.heroEvent}
          previousMatchup={data.previousMatchup}
          lastGameLine={data.lastGameLine}
        />

        {/* ─── TOP PERFORMERS (Tier 2) ─────────────────────────── */}
        <TopPerformers performers={data.topPerformers} />

        {/* ─── CONTEXTUAL CLOSING (Tier 3) ── ↕ 140px bottom ──── */}
        <View style={styles.endSection}>
          <Text style={styles.endEmoji}>{'\u{1F431}'}</Text>
          <Text style={styles.endText}>
            {buildClosingMessage(data.heroEvent, data.seasonRecord)}
          </Text>
        </View>
      </Animated.ScrollView>
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

  // Welcome section
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
  welcomeGreeting: {
    fontFamily: FONTS.bodyBold,
    fontSize: 22,
    color: BRAND.navy,
    textAlign: 'center',
  },
  briefingText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 17,
    color: BRAND.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 32,
    marginTop: 8,
  },

  // Section header (reusable)
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
  },

  // End of scroll
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
  endText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textFaint,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
