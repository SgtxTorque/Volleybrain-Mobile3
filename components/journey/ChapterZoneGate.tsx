/**
 * ChapterZoneGate — Visual transition between chapter zones.
 * Shows completion badge for finished chapters and locked gate for upcoming ones.
 * Blends sky/ground colors between adjacent chapter themes.
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import type { JourneyTheme } from '@/lib/journey-themes';

type Props = {
  /** Theme of the chapter that was just completed/is above */
  fromTheme: JourneyTheme;
  /** Theme of the next chapter below */
  toTheme: JourneyTheme;
  /** Whether the chapter above is completed */
  isCompleted: boolean;
  /** Whether the chapter below is unlocked */
  isNextUnlocked: boolean;
  /** Required level for the next chapter */
  requiredLevel: number;
  /** Player's current level */
  playerLevel: number;
};

const GATE_HEIGHT = 100;

export default function ChapterZoneGate({
  fromTheme,
  toTheme,
  isCompleted,
  isNextUnlocked,
  requiredLevel,
  playerLevel,
}: Props) {
  // Blend the sky gradients between chapters
  const fromBottom = fromTheme.skyGradient[fromTheme.skyGradient.length - 1];
  const toTop = toTheme.skyGradient[0];

  return (
    <View style={styles.container}>
      {/* Sky blend transition */}
      <LinearGradient
        colors={[fromTheme.groundColor, toTheme.groundColor]}
        style={styles.blend}
      />

      {/* Gate visual */}
      <View style={styles.gateWrap}>
        {isCompleted ? (
          // ─── Completed gate ─────────────────────────────────
          <View style={styles.completedGate}>
            {/* Archway */}
            <View style={[styles.archLeft, { backgroundColor: fromTheme.pathDoneColor }]} />
            <View style={[styles.archRight, { backgroundColor: fromTheme.pathDoneColor }]} />
            <View style={[styles.archTop, { backgroundColor: fromTheme.pathDoneColor }]} />

            {/* Content */}
            <View style={styles.gateContent}>
              <Image
                source={fromTheme.gateMascot}
                style={styles.gateMascot}
                resizeMode="contain"
              />
              <View style={styles.gateTextWrap}>
                <View style={styles.completeBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={PLAYER_THEME.success} />
                  <Text style={styles.completeText}>
                    Chapter {fromTheme.chapterNumber} complete!
                  </Text>
                </View>
                <Text style={styles.nextLabel}>{fromTheme.nextZoneLabel}</Text>
              </View>
            </View>
          </View>
        ) : (
          // ─── Locked gate ────────────────────────────────────
          <View style={styles.lockedGate}>
            {/* Lock pillars */}
            <View style={styles.pillarLeft} />
            <View style={styles.pillarRight} />

            {/* Gate bars */}
            <View style={styles.gateBars}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={styles.gateBar} />
              ))}
            </View>

            {/* Lock icon */}
            <View style={styles.lockCircle}>
              <Ionicons name="lock-closed" size={18} color="rgba(255,215,0,0.4)" />
            </View>

            <Text style={styles.lockText}>
              Reach Level {requiredLevel} to unlock
            </Text>
            <Text style={styles.lockSubtext}>
              {toTheme.name}
            </Text>
          </View>
        )}
      </View>

      {/* Dimmed preview for locked next zone */}
      {!isNextUnlocked && (
        <View style={styles.dimOverlay} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: GATE_HEIGHT,
    overflow: 'hidden',
  },
  blend: {
    ...StyleSheet.absoluteFillObject,
  },

  gateWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Completed gate
  completedGate: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  archLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 1.5,
    opacity: 0.4,
  },
  archRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 1.5,
    opacity: 0.4,
  },
  archTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.3,
  },
  gateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  gateMascot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.8,
  },
  gateTextWrap: {
    flex: 1,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  completeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PLAYER_THEME.success,
  },
  nextLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
  },

  // Locked gate
  lockedGate: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  pillarLeft: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: 3,
  },
  pillarRight: {
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: 3,
  },
  gateBars: {
    position: 'absolute',
    left: 26,
    right: 26,
    top: '30%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  gateBar: {
    width: 2,
    height: 30,
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderRadius: 1,
  },
  lockCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  lockText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: 'rgba(255,215,0,0.25)',
  },
  lockSubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: 'rgba(255,215,0,0.15)',
    marginTop: 2,
  },

  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});
