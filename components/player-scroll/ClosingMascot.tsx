/**
 * ClosingMascot — Lynx mascot + XP callback at the bottom of the scroll.
 * Phase 6B: Mirrors the opening XP bar — scroll starts and ends with aspiration.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NextEvent } from '@/hooks/usePlayerHomeData';

const PT = {
  textMuted: 'rgba(255,255,255,0.30)',
  textFaint: 'rgba(255,255,255,0.15)',
};

type Props = {
  xpToNext: number;
  level: number;
  nextEvent: NextEvent | null;
};

function getContextLine(nextEvent: NextEvent | null): string {
  if (nextEvent) {
    if (nextEvent.event_type === 'game') {
      return 'A win on game day is worth 100 XP.';
    }
    return 'One great practice and you\'re there.';
  }
  return 'Keep showing up. The grind pays off.';
}

export default function ClosingMascot({ xpToNext, level, nextEvent }: Props) {
  const contextLine = getContextLine(nextEvent);

  return (
    <View style={styles.wrap}>
      <Text style={styles.mascot}>{'\u{1F431}'}</Text>
      <Text style={styles.xpLine}>
        {xpToNext} XP to Level {level + 1}.
      </Text>
      <Text style={styles.contextLine}>{contextLine}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 8,
    paddingBottom: 24,
  },
  mascot: {
    fontSize: 36,
    marginBottom: 10,
    opacity: 0.5,
  },
  xpLine: {
    fontSize: 13,
    fontWeight: '700',
    color: PT.textMuted,
    textAlign: 'center',
    marginBottom: 4,
  },
  contextLine: {
    fontSize: 12,
    fontWeight: '500',
    color: PT.textFaint,
    textAlign: 'center',
  },
});
