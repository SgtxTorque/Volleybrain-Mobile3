import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';
import { displayTextStyle, fontSizes, radii, shadows, spacing } from '@/lib/design-tokens';

type MatchCardProps = {
  homeTeam: string;
  awayTeam: string;
  time: string;
  date?: string;
  venue: string;
  accentColor?: string;
  score?: { home: number; away: number };
  onPress?: () => void;
  style?: ViewStyle;
};

export default function MatchCard({
  homeTeam,
  awayTeam,
  time,
  date,
  venue,
  accentColor,
  score,
  onPress,
  style,
}: MatchCardProps) {
  const { colors } = useTheme();
  const accent = accentColor || colors.primary;

  const content = (
    <>
      <View style={styles.row}>
        {/* Home team */}
        <View style={styles.teamCol}>
          <View style={[styles.teamIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="globe-outline" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.teamName, { color: colors.navy }]} numberOfLines={1}>
            {homeTeam}
          </Text>
        </View>

        {/* Center — score or time */}
        <View style={styles.center}>
          {score ? (
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreText, { color: colors.primary }]}>{score.home}</Text>
              <Text style={[styles.atSign, { color: colors.textSecondary }]}>@</Text>
              <Text style={[styles.scoreText, { color: colors.primary }]}>{score.away}</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.timeText, { color: colors.primary }]}>{time}</Text>
              {date ? (
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>{date}</Text>
              ) : null}
            </>
          )}
        </View>

        {/* Away team */}
        <View style={[styles.teamCol, styles.teamColRight]}>
          <Text style={[styles.teamName, { color: colors.navy }]} numberOfLines={1}>
            {awayTeam}
          </Text>
          <View style={[styles.teamIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="globe-outline" size={14} color={colors.primary} />
          </View>
        </View>
      </View>

      {/* Venue */}
      <Text style={[styles.venue, { color: colors.textSecondary }]} numberOfLines={1}>
        {venue}
      </Text>
    </>
  );

  const cardStyle: ViewStyle[] = [
    styles.card,
    shadows.card,
    {
      backgroundColor: colors.glassCard,
      borderLeftColor: accent,
    },
    style,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderLeftWidth: 4,
    paddingHorizontal: spacing.cardPaddingH,
    paddingVertical: spacing.cardPaddingV,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamColRight: {
    justifyContent: 'flex-end',
  },
  teamIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamName: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreText: {
    ...displayTextStyle,
    fontSize: fontSizes.matchTime,
  },
  atSign: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeText: {
    ...displayTextStyle,
    fontSize: fontSizes.matchTime,
  },
  dateText: {
    fontSize: fontSizes.caption,
    marginTop: 1,
  },
  venue: {
    fontSize: fontSizes.caption,
    textAlign: 'center',
    marginTop: 6,
  },
});
