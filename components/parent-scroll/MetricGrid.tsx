/**
 * MetricGrid — 2x2 grid of metric cards for the parent home scroll.
 * Cards: Record, Balance, Progress (XP), Chat.
 * Velocity-sensitive expansion on slow scroll.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING, SHADOWS } from '@/theme/spacing';
import type { SeasonRecord, PaymentStatus, LastChatPreview } from '@/hooks/useParentHomeData';

type Props = {
  record: SeasonRecord | null;
  payment: PaymentStatus;
  xp: { totalXp: number; level: number; progress: number } | null;
  chat: LastChatPreview | null;
  scrollY: SharedValue<number>;
  isSlowScroll: SharedValue<boolean>;
};

export default function MetricGrid({ record, payment, xp, chat }: Props) {
  const router = useRouter();

  const showBalance = payment.balance > 0;

  const cards = [
    // Top-left: Record
    {
      key: 'record',
      emoji: '\u{1F3C6}',
      title: record ? `${record.wins}-${record.losses}` : '\u{2014}',
      subtitle: record && record.games_played > 0
        ? `${record.games_played} games played`
        : 'No games yet',
      onPress: () => router.push('/(tabs)/parent-schedule' as any),
    },
    // Top-right: Balance
    ...(showBalance
      ? [
          {
            key: 'balance',
            emoji: '\u{1F4B3}',
            title: `$${payment.balance.toFixed(0)}`,
            subtitle: 'Balance due',
            titleColor: BRAND.error,
            onPress: () => router.push('/family-payments' as any),
          },
        ]
      : [
          {
            key: 'balance-ok',
            emoji: '\u{2705}',
            title: 'All caught up!',
            subtitle: 'No balance due',
            titleColor: BRAND.success,
            onPress: () => router.push('/family-payments' as any),
          },
        ]),
    // Bottom-left: Progress
    {
      key: 'progress',
      emoji: '\u{2B50}',
      title: xp ? `${xp.totalXp} XP` : '\u{2014}',
      subtitle: xp ? `Level ${xp.level}` : 'No XP yet',
      progress: xp?.progress ?? 0,
      onPress: () => {},
    },
    // Bottom-right: Chat
    {
      key: 'chat',
      emoji: '\u{1F4AC}',
      title: 'Team Chat',
      subtitle: chat
        ? chat.unread_count > 0
          ? `${chat.unread_count} unread`
          : chat.last_message.slice(0, 30)
        : 'No messages',
      onPress: () => router.push('/(tabs)/parent-chat' as any),
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>QUICK GLANCE</Text>
      <View style={styles.grid}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.key}
            style={styles.card}
            activeOpacity={0.8}
            onPress={card.onPress}
          >
            <Text style={styles.emoji}>{card.emoji}</Text>
            <Text
              style={[
                styles.cardTitle,
                (card as any).titleColor ? { color: (card as any).titleColor } : null,
              ]}
              numberOfLines={1}
            >
              {card.title}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {card.subtitle}
            </Text>
            {/* Progress bar for XP card */}
            {(card as any).progress !== undefined && (
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min((card as any).progress * 100, 100)}%` },
                  ]}
                />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.pagePadding,
    marginBottom: SPACING.sectionGap,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '48%' as any,
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: BRAND.white,
    borderRadius: SPACING.cardRadius,
    padding: 14,
    ...SHADOWS.light,
  },
  emoji: {
    fontSize: 22,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: BRAND.textPrimary,
  },
  cardSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: BRAND.warmGray,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: BRAND.skyBlue,
  },
});
