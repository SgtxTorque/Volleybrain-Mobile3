/**
 * IncompleteProfileCard — Shows when a child has missing required registration fields.
 * Coral accent, "needs attention" energy. Tap → /complete-profile.
 */
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { checkProfileCompleteness, type CompletenessResult } from '@/lib/profile-completeness';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { radii } from '@/lib/design-tokens';

export default function IncompleteProfileCard() {
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const [incomplete, setIncomplete] = useState<CompletenessResult | null>(null);

  useEffect(() => {
    if (user?.id && workingSeason?.id) {
      checkCompleteness();
    }
  }, [user?.id, workingSeason?.id]);

  const checkCompleteness = async () => {
    if (!user?.id || !workingSeason?.id) return;

    try {
      // Get player IDs linked to this parent
      const { data: links } = await supabase
        .from('player_parents')
        .select('player_id')
        .eq('parent_id', profile?.id);

      if (!links || links.length === 0) return;

      // Check each child
      for (const link of links) {
        const result = await checkProfileCompleteness(link.player_id, workingSeason.id);
        if (!result.complete) {
          setIncomplete(result);
          return; // Show first incomplete child
        }
      }
      setIncomplete(null);
    } catch {
      // Silently fail — this is non-critical
    }
  };

  if (!incomplete) return null;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/complete-profile?playerId=${incomplete.playerId}&seasonId=${workingSeason?.id}` as any)}
    >
      <View style={styles.accentBorder} />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle" size={20} color={BRAND.coral} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Incomplete Registration</Text>
          <Text style={styles.subtitle}>
            {incomplete.missingFields.length} missing field{incomplete.missingFields.length !== 1 ? 's' : ''} for {incomplete.playerName}
          </Text>
        </View>
        <View style={styles.percentBadge}>
          <Text style={styles.percentText}>{incomplete.percentage}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: BRAND.white,
    borderRadius: radii.card,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${BRAND.coral}40`,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  accentBorder: {
    width: 4,
    backgroundColor: BRAND.coral,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${BRAND.coral}14`,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  percentBadge: {
    backgroundColor: `${BRAND.coral}14`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.coral,
  },
});
