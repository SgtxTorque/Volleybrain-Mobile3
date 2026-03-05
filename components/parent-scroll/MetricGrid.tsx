/**
 * MetricGrid — 2x2 lightweight card grid (Tier 1.5) for the parent home scroll.
 * Cards: Record, Balance, Progress (XP), Chat.
 * Static — no velocity expansion.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import type { SeasonRecord, PaymentStatus, LastChatPreview } from '@/hooks/useParentHomeData';

type Props = {
  record: SeasonRecord | null;
  payment: PaymentStatus;
  xp: { totalXp: number; level: number; progress: number } | null;
  chat: LastChatPreview | null;
  childPlayerId?: string;
};

export default function MetricGrid({ record, payment, xp, chat, childPlayerId }: Props) {
  const router = useRouter();

  const showBalance = payment.balance > 0;

  // Balance amount color by urgency (simplified — we don't have due dates in current data)
  const balanceColor = showBalance ? BRAND.error : BRAND.success;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>QUICK GLANCE</Text>
      <View style={styles.grid}>
        {/* Record card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => router.push('/standings' as any)}
        >
          <Text style={styles.emoji}>{'\u{1F3C6}'}</Text>
          <Text style={styles.bigNumber}>
            {record ? `${record.wins}\u{2013}${record.losses}` : '\u{2014}'}
          </Text>
          <Text style={styles.subtitle}>
            {record && record.games_played > 0 ? `${record.games_played} games played` : 'No games yet'}
          </Text>
        </TouchableOpacity>

        {/* Balance card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => router.push('/family-payments' as any)}
        >
          {showBalance ? (
            <>
              <Text style={styles.emoji}>{'\u{1F4B3}'}</Text>
              <Text style={[styles.bigNumber, { color: balanceColor }]}>
                ${payment.balance.toFixed(0)}
              </Text>
              <Text style={styles.subtitle}>Balance due</Text>
            </>
          ) : (
            <>
              <Text style={styles.emoji}>{'\u{2713}'}</Text>
              <Text style={[styles.bigNumber, { color: balanceColor, fontSize: 22 }]}>
                Paid up
              </Text>
              <Text style={styles.subtitle}>All current</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Progress card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => router.push(childPlayerId ? `/achievements?playerId=${childPlayerId}` as any : '/achievements' as any)}
        >
          <Text style={styles.emoji}>{'\u{2B50}'}</Text>
          <Text style={styles.bigNumber}>
            {xp ? `Level ${xp.level}` : '\u{2014}'}
          </Text>
          <Text style={styles.subtitle}>
            {xp ? `${xp.totalXp} XP` : 'No XP yet'}
          </Text>
          {xp && (
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(xp.progress * 100, 100)}%` },
                ]}
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Chat card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/parent-chat' as any)}
        >
          <Text style={styles.emoji}>{'\u{1F4AC}'}</Text>
          <Text style={styles.chatTitle}>Team Chat</Text>
          <Text style={[
            styles.subtitle,
            chat && chat.unread_count > 0 ? { color: BRAND.skyBlue } : null,
          ]}>
            {chat
              ? chat.unread_count > 0
                ? `${chat.unread_count} unread`
                : chat.last_message.slice(0, 30)
              : 'No messages'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.pagePadding,
    marginBottom: 24,
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
    backgroundColor: BRAND.offWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F2F5',
    padding: 14,
    minHeight: 110,
  },
  emoji: {
    fontSize: 20,
    marginBottom: 8,
  },
  bigNumber: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: BRAND.textPrimary,
  },
  chatTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: BRAND.textPrimary,
  },
  subtitle: {
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
