/**
 * PlayerHomeScroll — scroll-driven player home dashboard.
 * Dark mode (#0D1B3E) — game-menu feel, not admin tool.
 * Phase 1: Scaffold with loading state and sections placeholders.
 */
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  const { scrollY, scrollHandler } = useScrollAnimations();
  const data = usePlayerHomeData(playerId);

  const displayName = data.playerName || externalName || 'Player';
  const initials = useMemo(() => {
    const parts = displayName.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return '?';
  }, [displayName]);

  // Header interactivity
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

  // Compact header fade
  const compactHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [100, 180], [0, 1], Extrapolation.CLAMP),
  }));

  if (data.loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PLAYER_THEME.accent} />
          <Text style={styles.loadingText}>Loading player data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ─── COMPACT HEADER ────────────────────────────────── */}
      <Animated.View
        pointerEvents={headerVisible ? 'auto' : 'none'}
        style={[
          styles.compactHeader,
          { paddingTop: insets.top, height: 52 + insets.top },
          compactHeaderStyle,
        ]}
      >
        <View style={styles.compactInner}>
          <Text style={styles.compactBrand}>lynx</Text>
          <View style={styles.compactRight}>
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
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={data.refreshing}
            onRefresh={onRefresh}
            tintColor={PLAYER_THEME.accent}
            progressBackgroundColor={PLAYER_THEME.cardBg}
          />
        }
      >
        {/* Sections will be added in subsequent phases */}
        <View style={{ height: insets.top + 16 }} />

        {/* Placeholder — will be replaced by hero card */}
        <View style={styles.placeholderSection}>
          <Text style={styles.placeholderText}>
            {data.firstName || 'Player'}'s Home
          </Text>
          <Text style={styles.placeholderSub}>
            LVL {data.level} {'\u00B7'} {data.xp} XP {'\u00B7'} OVR {data.ovr}
          </Text>
        </View>
      </Animated.ScrollView>
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
  placeholderSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  placeholderText: {
    fontSize: 28,
    fontWeight: '800',
    color: PLAYER_THEME.textPrimary,
    marginBottom: 8,
  },
  placeholderSub: {
    fontSize: 14,
    color: PLAYER_THEME.textMuted,
  },
});
