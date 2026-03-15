/**
 * PlayerHomeScroll — scroll-driven player home dashboard.
 * Dark mode (#0D1B3E) — game-menu feel, not admin tool.
 *
 * Section order:
 *   1. Hero Identity Card (always)
 *   2. Streak Banner (if streak ≥ 2)
 *   3. The Drop (1-3 items or contextual message)
 *   4. Photo Strip (if photos exist)
 *   5. Next Up — event + RSVP (if event exists, otherwise ambient text)
 *   6. Chat Peek (flat row)
 *   7. Quick Props row
 *   8. Active Challenge (if exists)
 *   9. Last Game Stats (if game stats exist)
 *  10. Closing Mascot + XP callback
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/lib/auth';
import { useParentScroll } from '@/lib/parent-scroll-context';
import { useScrollAnimations } from '@/hooks/useScrollAnimations';
import { usePlayerHomeData } from '@/hooks/usePlayerHomeData';

import { useResponsive } from '@/lib/responsive';
import { FONTS } from '@/theme/fonts';

import NoOrgState from './empty-states/NoOrgState';
import NoTeamState from './empty-states/NoTeamState';
import PlayerIdentityHero from './player-scroll/PlayerIdentityHero';
import PlayerDailyQuests from './player-scroll/PlayerDailyQuests';
import HeroIdentityCard from './player-scroll/HeroIdentityCard';
import StreakBanner from './player-scroll/StreakBanner';
import TheDrop from './player-scroll/TheDrop';
import PhotoStrip from './player-scroll/PhotoStrip';
import NextUpCard from './player-scroll/NextUpCard';
import ChatPeek from './player-scroll/ChatPeek';
import QuickPropsRow from './player-scroll/QuickPropsRow';
import ActiveChallengeCard from './player-scroll/ActiveChallengeCard';
import EvaluationCard from './player-scroll/EvaluationCard';
import LastGameStats from './player-scroll/LastGameStats';
import ClosingMascot from './player-scroll/ClosingMascot';
import ChallengeArrivalModal from './ChallengeArrivalModal';
import LevelUpCelebrationModal from './LevelUpCelebrationModal';
import StreakMilestoneCelebrationModal from './StreakMilestoneCelebrationModal';
import GiveShoutoutModal from './GiveShoutoutModal';
import TeamPulse from './TeamPulse';
import TrophyCaseWidget from './TrophyCaseWidget';
import RoleSelector from './RoleSelector';
import { fetchActiveChallenges, optInToChallenge, type ChallengeWithParticipants } from '@/lib/challenge-service';
import { checkMilestoneReached, awardStreakMilestoneXP } from '@/lib/streak-engine';
import type { StreakTier } from '@/lib/streak-engine';

// ─── Player Dark Theme ──────────────────────────────────────────
import { PLAYER_THEME } from '@/theme/player-theme';
export { PLAYER_THEME } from '@/theme/player-theme';

// ─── Props ──────────────────────────────────────────────────────
type Props = {
  playerId: string | null;
  playerName?: string | null;
  onSwitchChild?: () => void;
};

export default function PlayerHomeScroll({ playerId, playerName: externalName, onSwitchChild }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, organization } = useAuth();
  const parentScroll = useParentScroll();
  const { scrollY, scrollHandler } = useScrollAnimations({
    onScrollJS: parentScroll.notifyScroll,
  });
  const data = usePlayerHomeData(playerId);
  const { isTabletAny, contentMaxWidth, contentPadding } = useResponsive();

  // Signal to tab bar that this scroll is active
  useEffect(() => {
    parentScroll.setParentScrollActive(true);
    return () => {
      parentScroll.setParentScrollActive(false);
      parentScroll.setScrolling(false);
    };
  }, []);

  // ─── Shoutout modal ──
  const [showShoutoutModal, setShowShoutoutModal] = useState(false);

  // ─── Level-up celebration ──
  const LEVEL_KEY = `lynx_player_level_${playerId}`;
  const [showLevelUp, setShowLevelUp] = useState(false);
  useEffect(() => {
    if (data.loading || !playerId || data.level <= 0) return;
    AsyncStorage.getItem(LEVEL_KEY).then((stored) => {
      const prev = stored ? parseInt(stored, 10) : 0;
      if (prev > 0 && data.level > prev) {
        setShowLevelUp(true);
      }
      // Always persist current level
      AsyncStorage.setItem(LEVEL_KEY, String(data.level));
    });
  }, [data.loading, data.level, playerId]);

  // ─── Streak milestone celebration ──
  const STREAK_KEY = `lynx_player_streak_${playerId}`;
  const [showStreakMilestone, setShowStreakMilestone] = useState(false);
  const [milestoneTier, setMilestoneTier] = useState<StreakTier | null>(null);
  useEffect(() => {
    if (data.loading || !playerId || data.attendanceStreak <= 0) return;
    AsyncStorage.getItem(STREAK_KEY).then((stored) => {
      const prevStreak = stored ? parseInt(stored, 10) : 0;
      const crossed = checkMilestoneReached(prevStreak, data.attendanceStreak);
      if (crossed) {
        setMilestoneTier(crossed);
        setShowStreakMilestone(true);
        // Award XP (best-effort, fire and forget)
        awardStreakMilestoneXP(playerId, crossed);
      }
      AsyncStorage.setItem(STREAK_KEY, String(data.attendanceStreak));
    });
  }, [data.loading, data.attendanceStreak, playerId]);

  // ─── Challenge arrival modal ──
  const [showChallengeArrival, setShowChallengeArrival] = useState(false);
  const [arrivalChallenge, setArrivalChallenge] = useState<ChallengeWithParticipants | null>(null);
  useEffect(() => {
    if (data.loading || !data.primaryTeam?.id || !user?.id) return;
    (async () => {
      const all = await fetchActiveChallenges(data.primaryTeam!.id);
      // Find challenges the player hasn't joined yet
      for (const ch of all) {
        if (ch.challenge_type === 'team') continue; // team challenges auto-include everyone
        const isIn = ch.participants.some(p => p.player_id === user!.id);
        if (isIn) continue;
        const seenKey = `lynx_challenge_seen_${ch.id}`;
        const seen = await AsyncStorage.getItem(seenKey);
        if (!seen) {
          setArrivalChallenge(ch);
          setShowChallengeArrival(true);
          break;
        }
      }
    })();
  }, [data.loading, data.primaryTeam?.id, user?.id]);

  const handleAcceptChallenge = async () => {
    if (!arrivalChallenge || !user?.id) return;
    await optInToChallenge(arrivalChallenge.id, user.id);
    await AsyncStorage.setItem(`lynx_challenge_seen_${arrivalChallenge.id}`, 'true');
    setShowChallengeArrival(false);
    data.refresh();
  };

  const handleDismissChallenge = async () => {
    if (!arrivalChallenge) return;
    await AsyncStorage.setItem(`lynx_challenge_seen_${arrivalChallenge.id}`, 'true');
    setShowChallengeArrival(false);
  };

  const displayName = data.playerName || externalName || 'Player';
  const initials = useMemo(() => {
    const parts = displayName.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return '?';
  }, [displayName]);

  // Header interactivity — toggle pointer events when hero scrolls offscreen
  const [headerVisible, setHeaderVisible] = React.useState(false);
  const prevState = useSharedValue(false);
  useDerivedValue(() => {
    const show = scrollY.value > 140;
    if (show !== prevState.value) {
      prevState.value = show;
      runOnJS(setHeaderVisible)(show);
    }
    return show;
  });

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await data.refresh();
  }, [data.refresh]);

  // ─── Scroll Animations ────────────────────────────────────────

  // Compact header: fade + slide down
  const compactHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [100, 180], [0, 1], Extrapolation.CLAMP),
    transform: [{
      translateY: interpolate(scrollY.value, [100, 180], [-8, 0], Extrapolation.CLAMP),
    }],
  }));

  // ─── Empty state detection (rendered INSIDE scroll, never early return) ──
  const emptyState: 'loading' | 'no-org' | 'no-team' | null =
    data.loading ? 'loading'
    : !organization ? 'no-org'
    : !data.primaryTeam ? 'no-team'
    : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B3E" />

      {/* ─── COMPACT HEADER ────────────────────────────────── */}
      <Animated.View
        pointerEvents={headerVisible ? 'auto' : 'none'}
        style={[
          styles.compactHeader,
          { paddingTop: insets.top, height: 32 + insets.top },
          compactHeaderStyle,
        ]}
      >
        <View style={styles.compactInner}>
          <Text style={styles.compactBrand}>lynx</Text>
          <View style={styles.compactRight}>
            {data.attendanceStreak >= 2 && (
              <View style={styles.streakPill}>
                <Text style={styles.streakPillText}>
                  {'\u{1F525}'} {data.attendanceStreak}
                </Text>
              </View>
            )}
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>LVL {data.level}</Text>
            </View>
            <View style={styles.roleSelectorWrap}>
              <RoleSelector />
            </View>
            <View style={styles.compactAvatar}>
              <Text style={styles.compactAvatarText}>{initials}</Text>
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
            tintColor={PLAYER_THEME.accent}
            progressBackgroundColor={PLAYER_THEME.cardBg}
          />
        }
      >
        <View style={{ height: insets.top + 16 }} />

        {/* ─── ROLE SELECTOR (in-scroll) ────────────────────── */}
        <View style={styles.roleRow}>
          <View style={{ flex: 1 }} />
          <View style={styles.roleSelectorWrap}>
            <RoleSelector />
          </View>
        </View>

        {emptyState === 'loading' ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={PLAYER_THEME.accent} />
            <Text style={styles.loadingText}>Loading player data...</Text>
          </View>
        ) : emptyState === 'no-org' ? (
          <View style={{ paddingTop: 80 }}><NoOrgState /></View>
        ) : emptyState === 'no-team' ? (
          <View style={{ paddingTop: 80 }}><NoTeamState role="player" /></View>
        ) : (
        <>
        {/* ─── 1. PLAYER IDENTITY HERO ─────────────────────────── */}
        <PlayerIdentityHero
          firstName={data.firstName}
          lastName={data.lastName}
          photoUrl={data.photoUrl}
          teamName={data.primaryTeam?.name || ''}
          teamColor={data.primaryTeam?.color || null}
          position={data.position}
          jerseyNumber={data.jerseyNumber}
          level={data.level}
          xpProgress={data.xpProgress}
          xpCurrent={data.xp}
          xpToNext={data.xpToNext}
          attendanceStreak={data.attendanceStreak}
          lastGame={data.lastGame}
          nextEvent={data.nextEvent}
          badges={data.badges}
          challengesAvailable={data.challengesAvailable}
          recentShoutouts={data.recentShoutouts}
          scrollY={scrollY}
        />

        {/* ─── CHILD SWITCHER (multi-child parents only) ─── */}
        {onSwitchChild && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'center',
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 16,
              backgroundColor: 'rgba(75,185,236,0.12)',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(75,185,236,0.25)',
              marginBottom: 12,
            }}
            activeOpacity={0.7}
            onPress={onSwitchChild}
          >
            <Ionicons name="swap-horizontal-outline" size={14} color={PLAYER_THEME.accent} />
            <Text style={{
              fontSize: 13,
              fontWeight: '600',
              color: PLAYER_THEME.accent,
              fontFamily: FONTS?.bodySemiBold || undefined,
            }}>
              {displayName}
            </Text>
            <Ionicons name="chevron-down" size={12} color={PLAYER_THEME.accent} />
          </TouchableOpacity>
        )}

        {/* ─── 2. DAILY QUESTS ─────────────────────────────────── */}
        <PlayerDailyQuests
          nextEvent={data.nextEvent}
          rsvpStatus={data.rsvpStatus}
          challengesAvailable={data.challengesAvailable}
          recentShoutouts={data.recentShoutouts}
          badges={data.badges}
          onOpenShoutout={() => setShowShoutoutModal(true)}
        />

        {/* ─── 1b. MY TEAM (one-tap to roster) ─────────────────── */}
        {data.primaryTeam && (
          <TouchableOpacity
            style={styles.myTeamCard}
            activeOpacity={0.85}
            onPress={() => router.push(`/roster?teamId=${data.primaryTeam!.id}` as any)}
          >
            <View style={styles.myTeamLeft}>
              <Text style={styles.myTeamLabel}>MY TEAM</Text>
              <Text style={styles.myTeamName}>{data.primaryTeam.name}</Text>
              <Text style={styles.myTeamCta}>See your teammates {'\u2192'}</Text>
            </View>
            <View style={styles.myTeamAvatars}>
              <Text style={{ fontSize: 22 }}>{'\u{1F465}'}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ─── 2. STREAK BANNER (if streak ≥ 2) ──────────────── */}
        <StreakBanner streak={data.attendanceStreak} freezeUsed={data.streakFreezeUsed} />

        {/* ─── 3. THE DROP ─────────────────────────────────────── */}
        <TheDrop
          badges={data.badges}
          lastGame={data.lastGame}
          nextEvent={data.nextEvent}
          attendanceStreak={data.attendanceStreak}
          recentShoutouts={data.recentShoutouts}
        />

        {/* ─── 4. PHOTO STRIP (if photos exist) ───────────────── */}
        <PhotoStrip photos={data.recentPhotos} teamId={data.primaryTeam?.id} />

        {/* ─── 5. NEXT UP — event + RSVP ──────────────────────── */}
        <NextUpCard
          event={data.nextEvent}
          rsvpStatus={data.rsvpStatus}
          attendanceStreak={data.attendanceStreak}
          onRsvp={data.sendRsvp}
        />

        {/* ─── 6. CHAT PEEK ───────────────────────────────────── */}
        <ChatPeek teamId={data.primaryTeam?.id} />

        {/* ─── 7. QUICK PROPS ─────────────────────────────────── */}
        <QuickPropsRow teamId={data.primaryTeam?.id} onGiveShoutout={() => setShowShoutoutModal(true)} />

        {/* ─── 8. ACTIVE CHALLENGE (if exists) ────────────────── */}
        <ActiveChallengeCard available={data.challengesAvailable} teamId={data.primaryTeam?.id} />

        {/* ─── 8c. NEW EVALUATION CARD ──────────────────────────── */}
        <EvaluationCard playerId={playerId} teamId={data.primaryTeam?.id || null} />

        {/* ─── 8b. TEAM PULSE (social feed) ─────────────────────── */}
        <View style={{ marginBottom: 12 }}>
          <TeamPulse teamId={data.primaryTeam?.id} variant="dark" limit={3} />
        </View>

        {/* ─── 9. LAST GAME STATS ─────────────────────────────── */}
        <LastGameStats
          lastGame={data.lastGame}
          position={data.position}
          personalBest={data.personalBest}
        />

        {/* ─── 9b. LEADERBOARD LINK ──────────────────────────── */}
        <TouchableOpacity
          style={styles.leaderboardLink}
          onPress={() => router.push('/standings' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.leaderboardLinkText}>
            {'\u{1F3C6}'} See where you rank
          </Text>
        </TouchableOpacity>

        {/* ─── 9c. TROPHY CASE / ACHIEVEMENTS ──────────────── */}
        {playerId && (
          <View style={{ marginBottom: 12 }}>
            <TrophyCaseWidget userId={playerId} userRole="player" />
          </View>
        )}
        <TouchableOpacity
          style={styles.leaderboardLink}
          onPress={() => router.push('/achievements' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.leaderboardLinkText}>
            {'\u{1F3C5}'} View Trophy Case
          </Text>
        </TouchableOpacity>

        {/* ─── 10. CLOSING MASCOT + XP CALLBACK ──────────────── */}
        <ClosingMascot
          xpToNext={data.xpToNext}
          level={data.level}
          nextEvent={data.nextEvent}
        />
        </>
        )}
      </Animated.ScrollView>

      {/* ─── LEVEL-UP CELEBRATION ──────────────────────────────── */}
      <LevelUpCelebrationModal
        visible={showLevelUp}
        newLevel={data.level}
        totalXp={data.xp}
        onDismiss={() => setShowLevelUp(false)}
      />

      {/* ─── STREAK MILESTONE CELEBRATION ──────────────────────── */}
      {milestoneTier && (
        <StreakMilestoneCelebrationModal
          visible={showStreakMilestone}
          tier={milestoneTier}
          streak={data.attendanceStreak}
          onDismiss={() => setShowStreakMilestone(false)}
        />
      )}

      {/* ─── SHOUTOUT MODAL ──────────────────────────────────────── */}
      <GiveShoutoutModal
        visible={showShoutoutModal}
        teamId={data.primaryTeam?.id ?? ''}
        onClose={() => setShowShoutoutModal(false)}
        onSuccess={() => setShowShoutoutModal(false)}
      />

      {/* ─── CHALLENGE ARRIVAL MODAL ────────────────────────────── */}
      {arrivalChallenge && (
        <ChallengeArrivalModal
          visible={showChallengeArrival}
          challengeTitle={arrivalChallenge.title}
          challengeDescription={arrivalChallenge.description}
          targetValue={arrivalChallenge.target_value}
          xpReward={arrivalChallenge.xp_reward}
          daysLeft={
            Math.max(0, Math.ceil(
              (new Date(arrivalChallenge.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            ))
          }
          onAccept={handleAcceptChallenge}
          onDismiss={handleDismissChallenge}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PLAYER_THEME.bg,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: PLAYER_THEME.textMuted,
    fontSize: 12,
    marginTop: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(13,27,62,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: PLAYER_THEME.border,
  },
  compactInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -25,
  },
  compactBrand: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: PLAYER_THEME.accent,
    letterSpacing: -0.5,
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakPill: {
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.20)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  streakPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: PLAYER_THEME.gold,
  },
  levelPill: {
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: PLAYER_THEME.gold,
  },
  compactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(75,185,236,0.30)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactAvatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: PLAYER_THEME.textPrimary,
  },
  roleSelectorWrap: {
    backgroundColor: PLAYER_THEME.cardBg,
    borderRadius: 20,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  leaderboardLink: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  leaderboardLinkText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PLAYER_THEME.accent,
    letterSpacing: 0.3,
  },
  // My Team card
  myTeamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: PLAYER_THEME.cardBg,
    borderWidth: 1,
    borderColor: PLAYER_THEME.borderAccent,
  },
  myTeamLeft: {
    flex: 1,
    gap: 2,
  },
  myTeamLabel: {
    fontFamily: FONTS.display,
    fontSize: 12,
    color: PLAYER_THEME.accent,
    letterSpacing: 1.5,
    opacity: 1.0,
  },
  myTeamName: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    color: PLAYER_THEME.textPrimary,
  },
  myTeamCta: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: PLAYER_THEME.textMuted,
    marginTop: 2,
  },
  myTeamAvatars: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(75,185,236,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
