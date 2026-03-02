/**
 * ParentHomeScroll — scroll-driven parent home dashboard.
 * Phase 2: Welcome section + compact header morphing.
 * Later phases build on this with calendar, event hero, athlete cards, etc.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Linking,
  Platform,
  RefreshControl,
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
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useScrollAnimations, SCROLL_THRESHOLDS } from '@/hooks/useScrollAnimations';
import { BRAND } from '@/theme/colors';
import { SPACING, SHADOWS } from '@/theme/spacing';
import { FONTS } from '@/theme/fonts';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Mascot messages with animation types
type MascotMessage = {
  text: string;
  animation: 'wiggle' | 'bounce' | 'float';
};

const PLACEHOLDER_MESSAGES: MascotMessage[] = [
  { text: 'Coach needs a headcount. Is your athlete playing Saturday?', animation: 'wiggle' },
  { text: 'Registration fees are due soon. Secure your spot!', animation: 'bounce' },
  { text: 'Your athlete earned a new badge yesterday! On a roll \u{1F525}', animation: 'float' },
  { text: 'Looking good! All set for the week. \u{1F4AA}', animation: 'float' },
];

export default function ParentHomeScroll() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const { scrollY, scrollHandler } = useScrollAnimations();

  // Message cycling state
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const [messages] = useState<MascotMessage[]>(PLACEHOLDER_MESSAGES);
  const messageFade = useSharedValue(1);

  // Mascot floating animation
  const mascotFloat = useSharedValue(0);

  // Refreshing state
  const [refreshing, setRefreshing] = useState(false);

  // Alert count (placeholder — will be wired in Phase 7)
  const [alertCount] = useState(3);

  // User display name
  const firstName = profile?.full_name?.split(' ')[0] || 'Parent';
  const userInitials = (() => {
    const name = profile?.full_name || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return '?';
  })();

  // ─── Mascot floating animation ─────────────────────────────────
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

  // ─── Message cycling (every 5s) ────────────────────────────────
  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      // Fade out
      messageFade.value = withTiming(0, { duration: 300 }, () => {
        // After fade-out, the JS side updates the index
      });
      // Switch index after fade-out
      setTimeout(() => {
        setActiveMessageIndex((prev) => (prev + 1) % messages.length);
        messageFade.value = withTiming(1, { duration: 300 });
      }, 320);
    }, 5000);
    return () => clearInterval(interval);
  }, [messages.length]);

  // ─── Refresh handler ───────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    // Will be wired to real data refresh in Phase 7
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  // ─── Animated styles ──────────────────────────────────────────

  // Welcome section: fades out and slides up as user scrolls
  const welcomeAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [SCROLL_THRESHOLDS.WELCOME_COLLAPSE_START, 100],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [SCROLL_THRESHOLDS.WELCOME_COLLAPSE_START, SCROLL_THRESHOLDS.WELCOME_COLLAPSE_END],
          [0, -30],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Compact header: fades in
  const compactHeaderAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [60, SCROLL_THRESHOLDS.WELCOME_COLLAPSE_END],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    pointerEvents: scrollY.value > 80 ? 'auto' as const : 'none' as const,
  }));

  // Mascot float
  const mascotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotFloat.value }],
  }));

  // Message fade
  const messageAnimStyle = useAnimatedStyle(() => ({
    opacity: messageFade.value,
  }));

  const currentMessage = messages[activeMessageIndex];

  return (
    <View style={[styles.root, { backgroundColor: BRAND.offWhite }]}>
      {/* ─── COMPACT HEADER (sticky, fades in on scroll) ────────── */}
      <Animated.View
        style={[
          styles.compactHeader,
          { paddingTop: insets.top, height: 56 + insets.top },
          compactHeaderAnimStyle,
        ]}
      >
        <View style={styles.compactHeaderInner}>
          {/* Left: Lynx icon + text */}
          <View style={styles.compactLeft}>
            <Text style={styles.compactMascot}>{'\u{1F431}'}</Text>
            <Text style={styles.compactBrand}>LYNX</Text>
          </View>
          {/* Right: Bell + Avatar */}
          <View style={styles.compactRight}>
            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={20} color={BRAND.navy} />
              {alertCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{alertCount > 9 ? '9+' : alertCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.compactAvatar}>
              <Text style={styles.compactAvatarText}>{userInitials}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* ─── SCROLLABLE CONTENT ─────────────────────────────────── */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND.skyBlue}
          />
        }
      >
        {/* ─── WELCOME SECTION ──────────────────────────────────── */}
        <Animated.View style={[styles.welcomeSection, { paddingTop: insets.top + 16 }, welcomeAnimStyle]}>
          {/* Top row: spacer + bell */}
          <View style={styles.welcomeTopRow}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={22} color={BRAND.navy} />
              {alertCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{alertCount > 9 ? '9+' : alertCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Mascot + Greeting */}
          <View style={styles.welcomeContent}>
            <Animated.Text style={[styles.mascotEmoji, mascotAnimStyle]}>
              {'\u{1F431}'}
            </Animated.Text>
            <Text style={styles.welcomeGreeting}>
              Welcome back, {firstName}
            </Text>
          </View>

          {/* Speech bubble with cycling messages */}
          <View style={styles.speechBubble}>
            <Animated.Text style={[styles.speechText, messageAnimStyle]}>
              {currentMessage?.text}
            </Animated.Text>
          </View>

          {/* Dot indicators */}
          <View style={styles.dotRow}>
            {messages.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === activeMessageIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* ─── PLACEHOLDER SECTIONS (Phases 3-5 will replace these) */}
        <PlaceholderSection label="CALENDAR" color={BRAND.skyLight} height={80} />
        <PlaceholderSection label="EVENT HERO" color={BRAND.navyDeep} height={200} light />
        <PlaceholderSection label="ATTENTION BANNER" color={BRAND.attentionBannerBg} height={60} />
        <PlaceholderSection label="MY ATHLETE" color={BRAND.offWhite} height={160} />
        <PlaceholderSection label="METRIC GRID" color={BRAND.warmGray} height={200} />
        <PlaceholderSection label="TEAM HUB" color={BRAND.white} height={140} />
        <PlaceholderSection label="SEASON SNAPSHOT" color={BRAND.offWhite} height={120} />
        <PlaceholderSection label="BADGES" color={BRAND.warmGray} height={80} />
        <PlaceholderSection label="END" color={BRAND.offWhite} height={100} />
      </Animated.ScrollView>
    </View>
  );
}

// ─── Placeholder component for unbuilt sections ─────────────────
function PlaceholderSection({
  label,
  color,
  height,
  light,
}: {
  label: string;
  color: string;
  height: number;
  light?: boolean;
}) {
  return (
    <View
      style={[
        styles.sectionBlock,
        { backgroundColor: color, height },
      ]}
    >
      <Text
        style={[
          styles.sectionLabel,
          { color: light ? BRAND.white : BRAND.textPrimary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Compact header ──
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
  compactMascot: {
    fontSize: 24,
  },
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

  // ── Welcome section ──
  welcomeSection: {
    paddingHorizontal: SPACING.pagePadding,
    paddingBottom: 20,
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
    marginBottom: 16,
  },
  mascotEmoji: {
    fontSize: 60,
    marginBottom: 8,
  },
  welcomeGreeting: {
    fontFamily: FONTS.bodyBold,
    fontSize: 22,
    color: BRAND.navy,
    textAlign: 'center',
  },

  // ── Speech bubble ──
  speechBubble: {
    backgroundColor: BRAND.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 56,
    justifyContent: 'center',
    ...SHADOWS.light,
  },
  speechText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
    lineHeight: 20,
    textAlign: 'center',
  },

  // ── Dot indicators ──
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.border,
  },
  dotActive: {
    backgroundColor: BRAND.skyBlue,
    width: 18,
    borderRadius: 3,
  },

  // ── Placeholder sections ──
  sectionBlock: {
    marginHorizontal: SPACING.pagePadding,
    marginBottom: SPACING.cardGap,
    borderRadius: SPACING.cardRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
