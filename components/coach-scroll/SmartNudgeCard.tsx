/**
 * SmartNudgeCard — warm-toned contextual suggestion card.
 * Priority: standout player → game day scouting → challenge progress → generic.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';

interface Props {
  suggestedPlayer: { name: string; stat: string; value: number } | null;
  previousMatchup: string | null;
  isGameDay: boolean;
  attendanceRate: number | null;
  onGiveShoutout?: () => void;
}

function SmartNudgeCard({ suggestedPlayer, previousMatchup, isGameDay, attendanceRate, onGiveShoutout }: Props) {
  let emoji = '\u{1F4A1}';
  let message = 'Trust the preparation. Your team is ready.';
  let highlight = '';
  let action: (() => void) | undefined;

  // Priority 1: Standout player
  if (suggestedPlayer && suggestedPlayer.value > 0) {
    emoji = '\u{2B50}';
    highlight = suggestedPlayer.name;
    message = ` had ${suggestedPlayer.value} ${suggestedPlayer.stat} — give her a shoutout?`;
    action = onGiveShoutout;
  }
  // Priority 2: Game day scouting
  else if (isGameDay && previousMatchup) {
    emoji = '\u{1F50D}';
    message = previousMatchup;
  }
  // Priority 3: Attendance trending
  else if (attendanceRate !== null && attendanceRate >= 80) {
    emoji = '\u{1F4C8}';
    message = `Attendance is at ${Math.round(attendanceRate)}%. Your team is showing up.`;
  }
  // Priority 4: Default
  else {
    emoji = '\u{1F4A1}';
    message = 'Who\'s been putting in work lately? Give a shoutout.';
    action = onGiveShoutout;
  }

  return (
    <TouchableOpacity
      activeOpacity={action ? 0.7 : 1}
      onPress={action}
      disabled={!action}
    >
      <LinearGradient
        colors={[D_COLORS.nudgeBgStart, D_COLORS.nudgeBgEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.textWrap}>
          <Text style={styles.message}>
            {highlight ? <Text style={styles.highlight}>{highlight}</Text> : null}
            {message}
          </Text>
        </View>
        {action && <Text style={styles.arrow}>{'\u203A'}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default React.memo(SmartNudgeCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: D_RADII.cardSmall,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  emoji: {
    fontSize: 24,
  },
  textWrap: {
    flex: 1,
  },
  message: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12.5,
    color: BRAND.textPrimary,
    lineHeight: 18,
  },
  highlight: {
    fontFamily: FONTS.bodyBold,
    color: BRAND.skyBlue,
  },
  arrow: {
    fontSize: 20,
    color: BRAND.textMuted,
    fontWeight: '600',
  },
});
