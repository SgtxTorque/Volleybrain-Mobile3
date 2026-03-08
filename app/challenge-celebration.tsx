/**
 * ChallengeCelebrationScreen -- Full-screen celebration UI shown when a
 * player completes a challenge. Supports winner (gold) and standard
 * (green) completion variants with animated XP count-up.
 *
 * Route params:
 *   challengeId     (string)
 *   challengeTitle  (string)
 *   xpEarned        (string, numeric)
 *   isWinner        (optional "true"/"false")
 *
 * Stack options: headerShown: false, presentation: 'modal', animation: 'fade'
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Share as RNShare,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

// =============================================================================
// Constants
// =============================================================================

const MASCOT_CHEER = require('@/assets/images/coachlynxmalecheer.png');

/** Dark player-theme palette — aliased from BRAND tokens */
const PT = {
  bg: BRAND.navyDeep,
  cardBg: BRAND.navy,
  gold: BRAND.gold,
  teal: BRAND.skyBlue,
  textPrimary: BRAND.white,
  textMuted: 'rgba(255,255,255,0.50)',
  textFaint: 'rgba(255,255,255,0.20)',
  success: BRAND.success,
};

/** Confetti-style dot colors used for winner animation. */
const CONFETTI_COLORS = [BRAND.gold, BRAND.skyBlue, BRAND.success, '#A855F7', BRAND.coral, BRAND.white];

// =============================================================================
// Confetti Dot (static decorative dots rendered around the header area)
// =============================================================================

interface ConfettiDotProps {
  color: string;
  size: number;
  top: number;
  left: string;
  delay: number;
}

function ConfettiDot({ color, size, top, left, delay }: ConfettiDotProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  return (
    <View
      style={[
        s.confettiDot,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          left: left as any,
        },
      ]}
    />
  );
}

// =============================================================================
// Confetti dots layout (positioned around the mascot / title area)
// =============================================================================

const DOTS: Omit<ConfettiDotProps, 'color'>[] = [
  { size: 8, top: 20, left: '15%', delay: 200 },
  { size: 6, top: 50, left: '80%', delay: 350 },
  { size: 10, top: 100, left: '10%', delay: 100 },
  { size: 7, top: 80, left: '88%', delay: 450 },
  { size: 5, top: 140, left: '25%', delay: 300 },
  { size: 9, top: 130, left: '72%', delay: 150 },
  { size: 6, top: 30, left: '55%', delay: 500 },
  { size: 8, top: 160, left: '40%', delay: 250 },
  { size: 5, top: 10, left: '68%', delay: 400 },
  { size: 7, top: 170, left: '85%', delay: 100 },
  { size: 6, top: 60, left: '35%', delay: 550 },
  { size: 9, top: 110, left: '50%', delay: 200 },
];

// =============================================================================
// Main Component
// =============================================================================

export default function ChallengeCelebrationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    challengeId: string;
    challengeTitle: string;
    xpEarned: string;
    isWinner: string;
  }>();

  const challengeTitle = params.challengeTitle ?? 'Challenge';
  const xpTarget = parseInt(params.xpEarned ?? '0', 10) || 0;
  const isWinner = params.isWinner === 'true';

  // ---- Animated XP count-up ----
  const [displayXp, setDisplayXp] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Fire haptic feedback on mount
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  useEffect(() => {
    if (xpTarget <= 0) {
      setDisplayXp(0);
      return;
    }

    // Count up over ~1.2 seconds
    const totalDuration = 1200;
    const steps = Math.min(xpTarget, 60); // cap at 60 steps for smoothness
    const stepMs = totalDuration / steps;
    const increment = xpTarget / steps;
    let current = 0;

    intervalRef.current = setInterval(() => {
      current += increment;
      if (current >= xpTarget) {
        setDisplayXp(xpTarget);
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        setDisplayXp(Math.round(current));
      }
    }, stepMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [xpTarget]);

  // ---- Handlers ----

  function handleBackToChallenges() {
    router.replace('/challenges');
  }

  async function handleShare() {
    try {
      const message = isWinner
        ? `I won the "${challengeTitle}" challenge and earned ${xpTarget} XP on Lynx!`
        : `I completed the "${challengeTitle}" challenge and earned ${xpTarget} XP on Lynx!`;

      await RNShare.share({
        message,
        title: 'Challenge Complete!',
      });
    } catch {
      // User cancelled or share failed -- no-op
    }
  }

  // ---- Render ----

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'fade',
        }}
      />

      <SafeAreaView style={s.root}>
        <View style={s.container}>
          {/* ---- Confetti dots (winner only) ---- */}
          {isWinner && (
            <View style={s.confettiContainer}>
              {DOTS.map((dot, i) => (
                <ConfettiDot
                  key={i}
                  color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
                  size={dot.size}
                  top={dot.top}
                  left={dot.left}
                  delay={dot.delay}
                />
              ))}
            </View>
          )}

          {/* ---- Coach Mascot ---- */}
          <Image
            source={MASCOT_CHEER}
            style={s.mascot}
            resizeMode="contain"
          />

          {/* ---- Headline ---- */}
          {isWinner ? (
            <Text style={s.winnerHeadline}>YOU WON!</Text>
          ) : (
            <Text style={s.completeHeadline}>CHALLENGE COMPLETE!</Text>
          )}

          {/* ---- Challenge title ---- */}
          <Text style={s.challengeTitle}>{challengeTitle}</Text>

          {/* ---- XP earned ---- */}
          <View style={s.xpSection}>
            <Text style={[s.xpCount, isWinner && s.xpCountWinner]}>
              {displayXp}
            </Text>
            <View style={s.xpRow}>
              <Ionicons name="star" size={22} color={PT.gold} />
              <Text style={s.xpLabel}>+{xpTarget} XP EARNED</Text>
            </View>
          </View>

          {/* ---- Spacer ---- */}
          <View style={s.spacer} />

          {/* ---- Buttons ---- */}
          <TouchableOpacity
            style={s.primaryBtn}
            activeOpacity={0.8}
            onPress={handleBackToChallenges}
          >
            <Ionicons name="trophy-outline" size={20} color={PT.bg} />
            <Text style={s.primaryBtnText}>Back to Challenges</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.secondaryBtn}
            activeOpacity={0.7}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={18} color={PT.gold} />
            <Text style={s.secondaryBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

// =============================================================================
// Styles
// =============================================================================

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PT.bg,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },

  // ---- Confetti ----
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  confettiDot: {
    position: 'absolute',
  },

  // ---- Mascot ----
  mascot: {
    width: 160,
    height: 160,
    marginBottom: 24,
    zIndex: 1,
  },

  // ---- Headlines ----
  winnerHeadline: {
    fontFamily: FONTS.display,
    fontSize: 42,
    color: PT.gold,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: 'rgba(255, 215, 0, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    zIndex: 1,
  },
  completeHeadline: {
    fontFamily: FONTS.display,
    fontSize: 32,
    color: PT.success,
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: 8,
    zIndex: 1,
  },

  // ---- Challenge title ----
  challengeTitle: {
    fontFamily: FONTS.display,
    fontSize: 26,
    color: PT.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 32,
    paddingHorizontal: 8,
    zIndex: 1,
  },

  // ---- XP section ----
  xpSection: {
    alignItems: 'center',
    zIndex: 1,
  },
  xpCount: {
    fontFamily: FONTS.display,
    fontSize: 72,
    color: PT.teal,
    textAlign: 'center',
    letterSpacing: 2,
    lineHeight: 80,
  },
  xpCountWinner: {
    color: PT.gold,
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  xpLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: PT.gold,
    letterSpacing: 1,
  },

  // ---- Spacer ----
  spacer: {
    flex: 1,
  },

  // ---- Primary button ----
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: PT.gold,
    height: 56,
    borderRadius: 28,
    width: '100%',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: PT.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: PT.bg,
  },

  // ---- Secondary button ----
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PT.cardBg,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  secondaryBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: PT.gold,
  },
});
