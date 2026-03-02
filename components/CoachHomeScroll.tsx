/**
 * CoachHomeScroll — scroll-driven coach home dashboard.
 * Phase 2: Game plan card, prep checklist, scouting context.
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
import { useScrollAnimations, SCROLL_THRESHOLDS } from '@/hooks/useScrollAnimations';
import { useCoachHomeData } from '@/hooks/useCoachHomeData';
import { BRAND } from '@/theme/colors';
import { SPACING } from '@/theme/spacing';
import { FONTS } from '@/theme/fonts';

import RoleSelector from './RoleSelector';
import PrepChecklist from './coach-scroll/PrepChecklist';
import GamePlanCard from './coach-scroll/GamePlanCard';
import ScoutingContext from './coach-scroll/ScoutingContext';

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
    pointerEvents: scrollY.value > 80 ? ('auto' as const) : ('none' as const),
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

        {/* ─── TEAM SELECTOR PILLS (in-scroll, visible before compact sticky appears) */}
        <View style={styles.teamPillsInline}>
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

        {/* ─── PREP CHECKLIST (Tier 2 — conditional) ────────── */}
        <PrepChecklist
          checklist={data.prepChecklist}
          eventDate={data.heroEvent?.event_date ?? null}
        />

        {/* ─── GAME PLAN CARD (Tier 1 — conditional) ─────────── */}
        <GamePlanCard event={data.heroEvent} rsvpSummary={data.rsvpSummary} />

        {/* ─── SCOUTING CONTEXT (Tier 2 — conditional) ────────── */}
        <ScoutingContext previousMatchup={data.previousMatchup} />

        {/* ──────────────────────────────────────────────────────
            Sections below will be added in Phases 3-6:
            - Phase 3: Quick Actions, Challenge, Shoutout Nudge
            - Phase 4: Team Pulse, Roster Alerts, Development Hint
            - Phase 5: Pending Stats, Activity Feed, Season Scoreboard, Top Performers
            - Phase 6: Closing, Animations, Spacing
        ────────────────────────────────────────────────────── */}

        {/* ─── END OF SCROLL (placeholder, replaced in Phase 6) ── */}
        <View style={styles.endSection}>
          <Text style={styles.endEmoji}>{'\u{1F431}'}</Text>
          <Text style={styles.endText}>Go make them better today.</Text>
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

  // In-scroll team pills (before compact header appears)
  teamPillsInline: {
    marginBottom: 16,
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
