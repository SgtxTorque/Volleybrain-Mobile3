/**
 * PlayerHomeScroll — D+ redesigned scroll-driven player home.
 * Dark mode (#0D1B3E) — game-menu feel, action center not dashboard.
 *
 * Final scroll order (15 sections, engagement-optimized):
 *   1. PlayerIdentityHero (greeting, identity, streak pill, level/XP, mascot)
 *   2. CompetitiveNudge ("3 more aces to take #7" — dynamic action bar)
 *   3. PlayerQuickLinks (My Card, Teammates, My Stats pills)
 *   4. PlayerQuestEntryCard (compact quest summary — navigates to QuestsScreen)
 *   5. PlayerChallengeCard (active challenge with progress — conditional)
 *   6. PlayerLeaderboardPreview (team rankings)
 *   7. PlayerPropsSection — Shoutouts / Props from the Team
 *   8. PlayerTeamHubCard (team hub entry with notification pill)
 *   9. PlayerContinueTraining (Journey Path teaser)
 *  10. NextUpCard (next event with +XP on RSVP)
 *  11. PlayerMomentumRow (streak, kills, level, games — gradient cards)
 *  12. LastGameStats (restyled with stat colors + count-up)
 *  13. PlayerTrophyCase (Fortnite-style badge grid)
 *  14. PlayerTeamActivity (team feed)
 *  15. PlayerAmbientCloser (mascot + data message)
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
import { useQuestEngine } from '@/hooks/useQuestEngine';
import { useWeeklyQuestEngine } from '@/hooks/useWeeklyQuestEngine';
import { useTeamQuests } from '@/hooks/useTeamQuests';

import { useResponsive } from '@/lib/responsive';
import { useNotifications } from '@/hooks/useNotifications';
import { FONTS } from '@/theme/fonts';

import NoOrgState from './empty-states/NoOrgState';
import NoTeamState from './empty-states/NoTeamState';
import PlayerIdentityHero from './player-scroll/PlayerIdentityHero';
import CompetitiveNudge from './player-scroll/CompetitiveNudge';
import PlayerQuestEntryCard from './player-scroll/PlayerQuestEntryCard';
import PlayerChallengeCard from './player-scroll/PlayerChallengeCard';
import PlayerQuickLinks from './player-scroll/PlayerQuickLinks';
import PlayerLeaderboardPreview from './player-scroll/PlayerLeaderboardPreview';
import PlayerPropsSection from './player-scroll/PlayerPropsSection';
import PlayerContinueTraining from './player-scroll/PlayerContinueTraining';
import PlayerTeamHubCard from './player-scroll/PlayerTeamHubCard';
import PlayerMomentumRow from './player-scroll/PlayerMomentumRow';
import PlayerTrophyCase from './player-scroll/PlayerTrophyCase';
import PlayerTeamActivity from './player-scroll/PlayerTeamActivity';
import PlayerAmbientCloser from './player-scroll/PlayerAmbientCloser';
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
import ShoutoutReceivedModal from './ShoutoutReceivedModal';
import { getUnseenShoutouts, markShoutoutsSeen, type UnseenShoutout } from '@/lib/shoutout-service';
import TeamPulse from './TeamPulse';
import TrophyCaseWidget from './TrophyCaseWidget';
import RoleSelector from './RoleSelector';
import { fetchActiveChallenges, optInToChallenge, type ChallengeWithParticipants } from '@/lib/challenge-service';
import { checkMilestoneReached, awardStreakMilestoneXP, type StreakTier } from '@/lib/streak-engine';

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
  const streakCount = data.engagementStreak?.currentStreak ?? data.attendanceStreak ?? 0;

  // Quest hooks — kept active for quest generation on app open, summary data passed to entry card
  // When parent views child, use the child's engagement profile ID instead of auth user
  const questEngine = useQuestEngine(data.engagementProfileId);
  const weeklyEngine = useWeeklyQuestEngine(data.engagementProfileId);
  const teamQuestHook = useTeamQuests(data.primaryTeam?.id ?? null);
  const questXpToday = useMemo(() => {
    const dailyXp = questEngine.quests
      .filter(q => q.is_completed)
      .reduce((sum, q) => sum + q.xp_reward, 0);
    const bonusXp = questEngine.bonusEarned ? 25 : 0;
    return dailyXp + bonusXp;
  }, [questEngine.quests, questEngine.bonusEarned]);
  const { isTabletAny, contentMaxWidth, contentPadding } = useResponsive();
  const { unreadCount } = useNotifications(data.engagementProfileId);

  // Signal to tab bar that this scroll is active
  useEffect(() => {
    parentScroll.setParentScrollActive(true);
    return () => {
      parentScroll.setParentScrollActive(false);
      parentScroll.setScrolling(false);
    };
  }, []);

  // ─── Shoutout modal (give) ──
  const [showShoutoutModal, setShowShoutoutModal] = useState(false);

  // ─── Shoutout received celebration ──
  const [unseenShoutouts, setUnseenShoutouts] = useState<UnseenShoutout[]>([]);
  const [currentShoutoutIndex, setCurrentShoutoutIndex] = useState(0);
  const [showReceivedShoutout, setShowReceivedShoutout] = useState(false);

  useEffect(() => {
    if (data.loading || !data.engagementProfileId) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const unseen = await getUnseenShoutouts(data.engagementProfileId!);
        if (cancelled || unseen.length === 0) return;
        setUnseenShoutouts(unseen);
        setShowReceivedShoutout(true);
      } catch (e) {
        if (__DEV__) console.error('[PlayerHome] unseen shoutout check failed:', e);
      }
    }, 2000); // 2s delay so level-up/streak celebrations go first
    return () => { cancelled = true; clearTimeout(timer); };
  }, [data.loading, data.engagementProfileId]);

  const handleShoutoutDismiss = async () => {
    if (currentShoutoutIndex < unseenShoutouts.length - 1) {
      setCurrentShoutoutIndex(prev => prev + 1);
    } else {
      setShowReceivedShoutout(false);
      await markShoutoutsSeen();
      setUnseenShoutouts([]);
      setCurrentShoutoutIndex(0);
    }
  };

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
    if (data.loading || !playerId || streakCount <= 0) return;
    AsyncStorage.getItem(STREAK_KEY).then((stored) => {
      const prevStreak = stored ? parseInt(stored, 10) : 0;
      const crossed = checkMilestoneReached(prevStreak, streakCount);
      if (crossed) {
        setMilestoneTier(crossed);
        setShowStreakMilestone(true);
        // Award XP (best-effort, fire and forget)
        awardStreakMilestoneXP(playerId, crossed);
      }
      AsyncStorage.setItem(STREAK_KEY, String(streakCount));
    });
  }, [data.loading, streakCount, playerId]);

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
            {streakCount >= 2 && (
              <View style={styles.streakPill}>
                <Text style={styles.streakPillText}>
                  {'\u{1F525}'} {streakCount}
                </Text>
              </View>
            )}
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>LVL {data.level}</Text>
            </View>
            <TouchableOpacity
              style={styles.bellWrap}
              onPress={() => router.push('/notification-inbox' as any)}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
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
          attendanceStreak={streakCount}
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

        {/* ─── 2. COMPETITIVE NUDGE ─────────────────────────────── */}
        <CompetitiveNudge
          bestRank={data.bestRank}
          personalBest={data.personalBest}
          xpToNext={data.xpToNext}
          level={data.level}
          challengesAvailable={data.challengesAvailable}
          scrollY={scrollY}
        />

        {/* ─── 3. QUICK LINKS (My Card, Teammates, My Stats) ───── */}
        <PlayerQuickLinks
          playerId={playerId}
          teamId={data.primaryTeam?.id}
        />

        {/* ─── 4. QUEST ENTRY CARD (replaces Daily + Weekly + Team) ── */}
        <PlayerQuestEntryCard
          dailyComplete={questEngine.quests.filter(q => q.is_completed).length}
          dailyTotal={questEngine.quests.length}
          weeklyComplete={weeklyEngine.quests.filter(q => q.is_completed).length}
          weeklyTotal={weeklyEngine.quests.length}
          teamComplete={teamQuestHook.quests.filter(q => q.is_completed).length}
          teamTotal={teamQuestHook.quests.length}
          xpEarnedToday={questXpToday}
        />

        {/* ─── 5. ACTIVE CHALLENGE (conditional) ────────────────── */}
        <PlayerChallengeCard
          available={data.challengesAvailable}
          teamId={data.primaryTeam?.id}
          scrollY={scrollY}
        />

        {/* ─── 6. LEADERBOARD PREVIEW ─────────────────────────── */}
        <PlayerLeaderboardPreview
          teamId={data.primaryTeam?.id}
          overrideProfileId={data.engagementProfileId}
        />

        {/* ─── 7. PROPS FROM THE TEAM (shoutouts) ────────────── */}
        <PlayerPropsSection
          shoutouts={data.recentShoutouts}
          onGiveShoutout={() => setShowShoutoutModal(true)}
        />

        {/* ─── 8. TEAM HUB ENTRY ──────────────────────────────── */}
        <PlayerTeamHubCard
          teamName={data.primaryTeam?.name || ''}
          teamColor={data.primaryTeam?.color || null}
          teamId={data.primaryTeam?.id}
        />

        {/* ─── 9. CONTINUE TRAINING (teaser) ───────────────────── */}
        <PlayerContinueTraining />

        {/* ─── 10. NEXT UP — event + RSVP ─────────────────────── */}
        <NextUpCard
          event={data.nextEvent}
          rsvpStatus={data.rsvpStatus}
          attendanceStreak={streakCount}
          onRsvp={data.sendRsvp}
        />

        {/* ─── 11. MOMENTUM CARDS ───────────────────────────── */}
        <PlayerMomentumRow
          seasonStats={data.seasonStats}
          attendanceStreak={streakCount}
          level={data.level}
          scrollY={scrollY}
        />

        {/* ─── 12. LAST GAME STATS ────────────────────────────── */}
        <LastGameStats
          lastGame={data.lastGame}
          position={data.position}
          personalBest={data.personalBest}
          scrollY={scrollY}
        />

        {/* ─── 13. TROPHY CASE ─────────────────────────────── */}
        <PlayerTrophyCase
          badges={data.badges}
          level={data.level}
          xpProgress={data.xpProgress}
          xpCurrent={data.xp}
          scrollY={scrollY}
        />

        {/* ─── 14. TEAM ACTIVITY ───────────────────────────── */}
        <PlayerTeamActivity
          recentShoutouts={data.recentShoutouts}
          badges={data.badges}
          lastGame={data.lastGame}
          teamId={data.primaryTeam?.id}
          scrollY={scrollY}
        />

        {/* ─── 15. AMBIENT CLOSER ────────────────────────────── */}
        <PlayerAmbientCloser
          xpToNext={data.xpToNext}
          level={data.level}
          attendanceStreak={streakCount}
          badgeCount={data.badges.length}
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
          streak={streakCount}
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

      {/* ─── SHOUTOUT RECEIVED CELEBRATION ────────────────────────── */}
      {showReceivedShoutout && unseenShoutouts.length > 0 && (() => {
        const s = unseenShoutouts[currentShoutoutIndex];
        return (
          <ShoutoutReceivedModal
            visible={showReceivedShoutout}
            categoryName={s.category_info?.name || s.category || 'Shoutout'}
            categoryEmoji={s.category_info?.emoji || '⭐'}
            giverName={s.giver?.full_name || 'A teammate'}
            giverAvatarUrl={s.giver?.avatar_url}
            message={s.message}
            totalCount={unseenShoutouts.length}
            currentIndex={currentShoutoutIndex}
            onDismiss={handleShoutoutDismiss}
          />
        );
      })()}
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
  bellWrap: {
    position: 'relative',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#E24B4A',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
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
