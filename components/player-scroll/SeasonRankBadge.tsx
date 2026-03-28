import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '@/theme/fonts';

type SeasonRankBadgeProps = {
  rankTier: string;
  rankLabel: string;
  rankColor: string;
  rankBgColor: string;
  xpMultiplier: number;
  size?: 'small' | 'medium';
};

export default function SeasonRankBadge({
  rankTier,
  rankLabel,
  rankColor,
  rankBgColor,
  xpMultiplier,
  size = 'small',
}: SeasonRankBadgeProps) {
  const isUnranked = rankTier === 'unranked';
  const isSmall = size === 'small';

  const pillColor = isUnranked ? '#6B7280' : rankColor;
  const pillBg = isUnranked ? '#6B728020' : rankBgColor;

  return (
    <View style={[
      styles.pill,
      {
        backgroundColor: pillBg,
        borderColor: pillColor,
        paddingHorizontal: isSmall ? 8 : 10,
        paddingVertical: isSmall ? 3 : 5,
      },
    ]}>
      <Ionicons
        name="shield"
        size={isSmall ? 10 : 12}
        color={pillColor}
        style={styles.icon}
      />
      <Text style={[
        styles.label,
        {
          color: pillColor,
          fontSize: isSmall ? 11 : 12,
        },
      ]}>
        {rankLabel}
      </Text>
      {xpMultiplier > 1.0 && (
        <Text style={[
          styles.multiplier,
          {
            color: pillColor,
            fontSize: isSmall ? 9 : 10,
          },
        ]}>
          {xpMultiplier}x
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  icon: {
    marginRight: 3,
  },
  label: {
    fontFamily: FONTS.bodyBold,
  },
  multiplier: {
    fontFamily: FONTS.bodySemiBold,
    marginLeft: 4,
    opacity: 0.75,
  },
});
