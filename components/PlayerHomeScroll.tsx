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

import { useScrollAnimations } from '@/hooks/useScrollAnimations';
import { usePlayerHomeData } from '@/hooks/usePlayerHomeData';

import HeroIdentityCard from './player-scroll/HeroIdentityCard';
import StreakBanner from './player-scroll/StreakBanner';
import TheDrop from './player-scroll/TheDrop';
import PhotoStrip from './player-scroll/PhotoStrip';
import NextUpCard from './player-scroll/NextUpCard';
import ChatPeek from './player-scroll/ChatPeek';
import QuickPropsRow from './player-scroll/QuickPropsRow';
import ActiveChallengeCard from './player-scroll/ActiveChallengeCard';
import LastGameStats from './player-scroll/LastGameStats';
import ClosingMascot from './player-scroll/ClosingMascot';
import LevelUpCelebrationModal from './LevelUpCelebrationModal';
import GiveShoutoutModal from './GiveShoutoutModal';

// ─── Player Dark Theme ──────────────────────────────────────────
export const PLAYER_THEME = {
  bg: '#0D1B3E',
  cardBg: '#10284C',
  cardBgHover: '#162848',
  cardBgSubtle: 'rgba(255,255,255,0.03)',
  accent: '#4BB9EC',
  gold: '#FFD700',
  goldGlow: 'rgba(255,215,0,0.3)',
  success: '#22C55E',
  error: '#EF4444',
  purple: '#A855F7',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.60)',
  textMuted: 'rgba(255,255,255,0.30)',
  textFaint: 'rgba(255,255,255,0.15)',
  border: 'rgba(255,255,255,0.06)',
  borderAccent: 'rgba(75,185,236,0.15)',
  borderGold: 'rgba(255,215,0,0.20)',
} as const;

// ─── Props ──────────────────────────────────────────────────────
type Props = {
  playerId: string | null;
  playerName?: string | null;
  onSwitchChild?: () => void;
};

export default function PlayerHomeScroll({ playerId, playerName: externalName, onSwitchChild }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { scrollY, scrollHandler } = useScrollAnimations();
  const data = usePlayerHomeData(playerId);

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

  if (data.loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0D1B3E" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PLAYER_THEME.accent} />
          <Text style={styles.loadingText}>Loading player data...</Text>
        </View>
      </View>
    );
  }

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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 140 }}
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

        {/* ─── 1. HERO IDENTITY CARD ─────────────────────────── */}
        <HeroIdentityCard
          firstName={data.firstName}
          lastName={data.lastName}
          teamName={data.primaryTeam?.name || ''}
          position={data.position}
          jerseyNumber={data.jerseyNumber}
          ovr={data.ovr}
          level={data.level}
          xpProgress={data.xpProgress}
          xpCurrent={data.xp}
          xpMax={(data.level) * 1000}
          scrollY={scrollY}
        />

        {/* ─── 2. STREAK BANNER (if streak ≥ 2) ──────────────── */}
        <StreakBanner streak={data.attendanceStreak} />

        {/* ─── 3. THE DROP ─────────────────────────────────────── */}
        <TheDrop
          badges={data.badges}
          lastGame={data.lastGame}
          nextEvent={data.nextEvent}
          attendanceStreak={data.attendanceStreak}
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
        <ActiveChallengeCard available={data.challengesAvailable} />

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

        {/* ─── 10. CLOSING MASCOT + XP CALLBACK ──────────────── */}
        <ClosingMascot
          xpToNext={data.xpToNext}
          level={data.level}
          nextEvent={data.nextEvent}
        />
      </Animated.ScrollView>

      {/* ─── LEVEL-UP CELEBRATION ──────────────────────────────── */}
      <LevelUpCelebrationModal
        visible={showLevelUp}
        newLevel={data.level}
        totalXp={data.xp}
        onDismiss={() => setShowLevelUp(false)}
      />

      {/* ─── SHOUTOUT MODAL ──────────────────────────────────────── */}
      <GiveShoutoutModal
        visible={showShoutoutModal}
        teamId={data.primaryTeam?.id ?? ''}
        onClose={() => setShowShoutoutModal(false)}
        onSuccess={() => setShowShoutoutModal(false)}
      />
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
    fontSize: 20,
    fontWeight: '800',
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
    fontSize: 10,
    fontWeight: '700',
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
    fontSize: 10,
    fontWeight: '700',
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
    fontSize: 11,
    fontWeight: '700',
    color: PLAYER_THEME.textPrimary,
  },
  leaderboardLink: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  leaderboardLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: PLAYER_THEME.accent,
    letterSpacing: 0.3,
  },
});
