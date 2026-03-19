/**
 * TeamManagerHomeScroll — Dedicated home dashboard for Team Managers.
 * Compact greeting → attention strip → manager cards → quick actions → upcoming events.
 * Simpler than CoachHomeScroll — focused on operations, not coaching.
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
  withSpring,
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
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { SPACING, SHADOWS } from '@/theme/spacing';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';
import { useResponsive } from '@/lib/responsive';

import NoOrgState from './empty-states/NoOrgState';
import NoTeamState from './empty-states/NoTeamState';
import RoleSelector from './RoleSelector';
import InviteCodeModal from './InviteCodeModal';

import ManagerPaymentCard from './coach-scroll/ManagerPaymentCard';
import ManagerAvailabilityCard from './coach-scroll/ManagerAvailabilityCard';
import ManagerRosterCard from './coach-scroll/ManagerRosterCard';

// ─── Quick Actions ────────────────────────────────────────────────

const TM_ACTIONS = [
  { emoji: '\u{1F4CB}', label: 'Attendance', bg: D_COLORS.statsBg, iconBg: D_COLORS.statsIcon, route: '/attendance' },
  { emoji: '\u{1F4E3}', label: 'Send Blast', bg: D_COLORS.blastBg, iconBg: D_COLORS.blastIcon, route: '/blast-composer' },
  { emoji: '\u{1F91D}', label: 'Volunteers', bg: D_COLORS.shoutBg, iconBg: D_COLORS.shoutIcon, route: '/volunteer-assignment' },
  { emoji: '\u{1F4C5}', label: 'Schedule', bg: D_COLORS.challengeBg, iconBg: D_COLORS.challengeIcon, route: '/(tabs)/coach-schedule' },
  { emoji: '\u{1F4B3}', label: 'Payments', bg: '#F0EDFF', iconBg: '#DDD6FE', route: '/(tabs)/payments' },
  { emoji: '\u{1F465}', label: 'Invite', bg: '#E8F4FD', iconBg: '#B3DFFC', route: '__invite__' },
];

function SpringCell({ action, onPress }: { action: typeof TM_ACTIONS[number]; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={[{ width: '47%', flexGrow: 1 }, animStyle]}>
      <TouchableOpacity
        style={[styles.actionCell, { backgroundColor: action.bg }]}
        activeOpacity={1}
        onPressIn={() => { scale.value = withTiming(0.95, { duration: 100 }); }}
        onPressOut={() => { scale.value = withSpring(1.0, { damping: 10, stiffness: 200 }); }}
        onPress={onPress}
      >
        <View style={[styles.actionIcon, { backgroundColor: action.iconBg }]}>
          <Text style={styles.actionEmoji}>{action.emoji}</Text>
        </View>
        <Text style={styles.actionLabel}>{action.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

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

function formatEventDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ─── Main Component ──────────────────────────────────────────────

export default function TeamManagerHomeScroll() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, organization } = useAuth();
  const parentScroll = useParentScroll();
  const { scrollY, scrollHandler } = useScrollAnimations({
    onScrollJS: parentScroll.notifyScroll,
  });
  const data = useCoachHomeData();
  const tmData = useTeamManagerData(data.selectedTeamId);
  const { isTabletAny, contentMaxWidth, contentPadding } = useResponsive();

  const firstName = useMemo(() => {
    return profile?.full_name?.split(' ')[0] || 'Manager';
  }, [profile?.full_name]);

  const userInitials = useMemo(() => {
    const name = profile?.full_name || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return '?';
  }, [profile?.full_name]);

  // Invite code + modal state
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (!data.selectedTeamId) return;
    supabase
      .from('team_invite_codes')
      .select('code')
      .eq('team_id', data.selectedTeamId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row?.code) setInviteCode(row.code);
      })
      .catch((e) => {
        if (__DEV__) console.log('Failed to fetch invite code:', e);
      });
  }, [data.selectedTeamId]);

  // Signal to tab bar that this scroll is active
  useEffect(() => {
    parentScroll.setParentScrollActive(true);
    return () => {
      parentScroll.setParentScrollActive(false);
      parentScroll.setScrolling(false);
    };
  }, []);

  // Header interactivity
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

  // Dynamic briefing message
  const briefingMessage = useMemo(() => {
    if (tmData.overduePayments > 0) {
      return `You have ${tmData.overduePayments} overdue payment${tmData.overduePayments > 1 ? 's' : ''} to follow up on.`;
    }
    const today = new Date().toISOString().split('T')[0];
    if (tmData.nextEventDate === today && tmData.nextEventTitle) {
      return `${tmData.nextEventTitle} is today \u2014 ${tmData.rsvpConfirmed} confirmed.`;
    }
    return 'Your team is in good shape. Here\u2019s what\u2019s happening.';
  }, [tmData.overduePayments, tmData.nextEventDate, tmData.nextEventTitle, tmData.rsvpConfirmed]);

  // Refresh
  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await data.refresh();
  }, [data.refresh]);

  // ─── Animations ──
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

  const welcomeAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 100], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, 140], [0, -30], Extrapolation.CLAMP) },
    ],
  }));

  const compactHeaderAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [60, 140], [0, 1], Extrapolation.CLAMP),
  }));

  // Empty state detection
  const emptyState: 'loading' | 'no-org' | 'no-teams' | null =
    data.loading ? 'loading'
    : !organization ? 'no-org'
    : (!data.teams || data.teams.length === 0) ? 'no-teams'
    : null;

  const selectedTeam = data.teams?.find(t => t.id === data.selectedTeamId);
  const teamName = selectedTeam?.name ?? 'My Team';

  // Upcoming events (next 3)
  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return data.upcomingEvents
      .filter(e => e.event_date >= today)
      .slice(0, 3);
  }, [data.upcomingEvents]);

  // Attention items
  const attentionItems = useMemo(() => {
    const items: { icon: string; text: string; color: string }[] = [];
    if (tmData.overduePayments > 0) {
      items.push({
        icon: 'alert-circle',
        text: `${tmData.overduePayments} overdue payment${tmData.overduePayments > 1 ? 's' : ''} ($${tmData.overdueAmount.toFixed(0)})`,
        color: BRAND.warning,
      });
    }
    if (tmData.rsvpTotal > 0 && tmData.rsvpNoResponse > tmData.rsvpTotal * 0.5) {
      items.push({
        icon: 'time-outline',
        text: `${tmData.rsvpNoResponse} of ${tmData.rsvpTotal} haven't RSVPed`,
        color: BRAND.coral,
      });
    }
    return items;
  }, [tmData.overduePayments, tmData.overdueAmount, tmData.rsvpNoResponse, tmData.rsvpTotal]);

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
          <View style={{ paddingTop: 120 }}><NoTeamState role="team_manager" /></View>
        ) : (
        <>
        {/* ─── 1. COMPACT MASCOT GREETING ──────────────────── */}
        <Animated.View
          style={[styles.compactGreeting, { paddingTop: insets.top + 16 }, welcomeAnimStyle]}
        >
          <View style={styles.greetingRow}>
            <Animated.View style={[styles.mascotAvatar, mascotBreathStyle]}>
              <Image source={require('../assets/images/mascot/HiLynx.png')} style={styles.mascotAvatarImg} resizeMode="contain" />
            </Animated.View>
            <View style={styles.greetingText}>
              <Text style={styles.greetingLine1}>Hey {firstName}! {'\u{1F525}'}</Text>
              <Text style={styles.greetingLine2} numberOfLines={2}>{briefingMessage}</Text>
            </View>
            <View style={styles.teamPill}>
              <Text style={styles.teamPillText} numberOfLines={1}>{teamName}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── 2. ATTENTION STRIP (conditional) ───────────── */}
        {attentionItems.length > 0 && (
          <View style={styles.attentionStrip}>
            {attentionItems.map((item, i) => (
              <View key={i} style={[styles.attentionItem, { borderLeftColor: item.color }]}>
                <Ionicons name={item.icon as any} size={16} color={item.color} />
                <Text style={styles.attentionText}>{item.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ─── 3. MANAGER CARDS ───────────────────────────── */}
        {!tmData.loading && data.selectedTeamId && (
          <>
            <View style={{ marginBottom: 14, paddingHorizontal: 16 }}>
              <ManagerPaymentCard
                overduePayments={tmData.overduePayments}
                overdueAmount={tmData.overdueAmount}
                pendingPayments={tmData.pendingPayments}
                totalCollected={tmData.totalCollected}
                teamId={data.selectedTeamId}
              />
            </View>
            <View style={{ marginBottom: 14, paddingHorizontal: 16 }}>
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
            <View style={{ marginBottom: 14, paddingHorizontal: 16 }}>
              <ManagerRosterCard
                rosterCount={tmData.rosterCount}
                pendingApproval={0}
                teamId={data.selectedTeamId}
              />
            </View>
          </>
        )}

        {/* ─── 4. QUICK ACTIONS GRID ──────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.actionGrid}>
          {TM_ACTIONS.map((action, i) => (
            <SpringCell
              key={i}
              action={action}
              onPress={() => {
                if (action.route === '__invite__') {
                  setShowInviteModal(true);
                } else {
                  router.push(action.route as any);
                }
              }}
            />
          ))}
        </View>

        {/* ─── 5. UPCOMING EVENTS ─────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 6 }]}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
        </View>
        {upcomingEvents.length === 0 ? (
          <View style={styles.emptyEventCard}>
            <Ionicons name="calendar-outline" size={24} color={BRAND.textMuted} />
            <Text style={styles.emptyEventText}>No upcoming events. Tap Schedule to create one.</Text>
          </View>
        ) : (
          upcomingEvents.map((event, i) => (
            <TouchableOpacity
              key={event.id || i}
              style={styles.eventCard}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/coach-schedule' as any)}
            >
              <View style={styles.eventLeft}>
                <Text style={styles.eventName} numberOfLines={1}>{event.title || event.opponent_name || 'Event'}</Text>
                <Text style={styles.eventDate}>{formatEventDate(event.event_date)}{event.event_time || event.start_time ? ` \u00B7 ${formatTime(event.event_time || event.start_time)}` : ''}</Text>
              </View>
              <View style={[styles.eventBadge, {
                backgroundColor: event.event_type === 'game' ? D_COLORS.blastBg
                  : event.event_type === 'practice' ? D_COLORS.statsBg
                  : D_COLORS.challengeBg,
              }]}>
                <Text style={[styles.eventBadgeText, {
                  color: event.event_type === 'game' ? BRAND.coral
                    : event.event_type === 'practice' ? BRAND.teal
                    : BRAND.skyBlue,
                }]}>
                  {event.event_type === 'game' ? 'Game' : event.event_type === 'practice' ? 'Practice' : 'Event'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* ─── 6. BOTTOM SPACER ───────────────────────────── */}
        <View style={{ height: 100 }} />
        </>
        )}
      </Animated.ScrollView>

      {/* ─── INVITE CODE MODAL ──────────────────────────────── */}
      <InviteCodeModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        teamName={teamName}
        inviteCode={inviteCode}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Compact header (same as CoachHomeScroll)
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
  compactLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compactMascotImg: { width: 24, height: 24 },
  compactBrand: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: BRAND.navy,
    letterSpacing: 1,
  },
  compactRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleSelectorWrap: { backgroundColor: BRAND.navy, borderRadius: 20 },
  compactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.skyBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactAvatarText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: BRAND.white },

  // Bell
  bellBtn: { position: 'relative', padding: 4 },
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
  bellBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 9, color: BRAND.white },

  // Greeting
  compactGreeting: { paddingHorizontal: 16, paddingBottom: 14 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mascotAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotAvatarImg: { width: 40, height: 40 },
  greetingText: { flex: 1, gap: 1 },
  greetingLine1: { fontFamily: FONTS.bodyExtraBold, fontSize: 17, color: BRAND.textPrimary },
  greetingLine2: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: BRAND.textMuted },
  teamPill: {
    backgroundColor: BRAND.navyDeep,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 100,
  },
  teamPillText: { fontFamily: FONTS.bodySemiBold, fontSize: 10, color: BRAND.white },

  // Attention strip
  attentionStrip: { paddingHorizontal: 16, marginBottom: 14, gap: 8 },
  attentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND.attentionBannerBg,
    borderRadius: D_RADII.cardSmall,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderLeftWidth: 3,
  },
  attentionText: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: BRAND.textPrimary, flex: 1 },

  // Quick actions
  sectionHeader: { paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: BRAND.textPrimary },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  actionCell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: D_RADII.actionCell,
    padding: 16,
    gap: 10,
  },
  actionIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionEmoji: { fontSize: 18 },
  actionLabel: { fontFamily: FONTS.bodyBold, fontSize: 12, color: '#1a1a2e', flexShrink: 1 },

  // Events
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BRAND.white,
    borderRadius: D_RADII.cardSmall,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
    ...SHADOWS.light,
  },
  eventLeft: { flex: 1, gap: 2 },
  eventName: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: BRAND.textPrimary },
  eventDate: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: BRAND.textMuted },
  eventBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 10 },
  eventBadgeText: { fontFamily: FONTS.bodySemiBold, fontSize: 11 },
  emptyEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: BRAND.offWhite,
    borderRadius: D_RADII.cardSmall,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  emptyEventText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: BRAND.textMuted, flex: 1 },
});
