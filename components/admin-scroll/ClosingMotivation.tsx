/**
 * ClosingMotivation — Tier 3 ambient closing section.
 * Scope summary + motivational sign-off.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  adminName: string;
  teamCount: number;
  playerCount: number;
  queueTotal: number;
};

export default function ClosingMotivation({
  adminName,
  teamCount,
  playerCount,
  queueTotal,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.mascot}>{'\u{1F431}'}</Text>
      <Text style={styles.scopeLine}>
        You're managing {teamCount} team{teamCount !== 1 ? 's' : ''},{' '}
        {playerCount} player{playerCount !== 1 ? 's' : ''}
        {'\n'}this season.
      </Text>
      {queueTotal > 0 ? (
        <Text style={styles.progressLine}>
          {queueTotal} item{queueTotal !== 1 ? 's' : ''} left in your queue.
        </Text>
      ) : (
        <Text style={styles.progressLine}>Queue is clear — great work!</Text>
      )}
      <Text style={styles.signOff}>You've got this, {adminName}.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  mascot: {
    fontSize: 36,
    marginBottom: 12,
  },
  scopeLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  progressLine: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  signOff: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.skyBlue,
    textAlign: 'center',
  },
});
