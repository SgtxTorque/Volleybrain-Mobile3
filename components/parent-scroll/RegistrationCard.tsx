/**
 * RegistrationCard — Branded registration entry point for parent home scroll.
 * Shows when open registrations exist. Replaces the old RegistrationBanner + ReenrollmentBanner.
 * variant='top' (default): shown at the top of the scroll with the standard card style.
 * variant='bottom': shown below current season content with a subtle section divider.
 */
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { radii, spacing } from '@/lib/design-tokens';

type Props = {
  childName: string | null;
  variant?: 'top' | 'bottom';
};

type OpenSeasonInfo = {
  id: string;
  name: string;
};

export default function RegistrationCard({ childName, variant = 'top' }: Props) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [seasons, setSeasons] = useState<OpenSeasonInfo[]>([]);

  useEffect(() => {
    fetchOpenSeasons();
  }, [user?.id, profile?.current_organization_id]);

  const fetchOpenSeasons = async () => {
    if (!user?.id) return;

    // Get org IDs for this parent
    const { data: roles } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const orgIds = [...new Set((roles || []).map(r => r.organization_id))];
    if (orgIds.length === 0) return;

    const { data: openSeasons } = await supabase
      .from('seasons')
      .select('id, name')
      .in('organization_id', orgIds)
      .eq('registration_open', true);

    setSeasons(openSeasons || []);
  };

  if (seasons.length === 0) return null;

  const singleSeason = seasons.length === 1;
  const seasonLabel = singleSeason ? seasons[0].name : `${seasons.length} open seasons`;

  const handlePress = () => {
    if (singleSeason) {
      router.push(`/register/${seasons[0].id}` as any);
    } else {
      router.push('/registration-start' as any);
    }
  };

  // Bottom variant: subtle link below current season content
  if (variant === 'bottom') {
    return (
      <View style={styles.bottomWrapper}>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>UPCOMING</Text>
          <View style={styles.dividerLine} />
        </View>
        <TouchableOpacity style={styles.bottomCard} activeOpacity={0.7} onPress={handlePress}>
          <Ionicons name="calendar-outline" size={18} color={BRAND.teal} />
          <Text style={styles.bottomText}>
            Register for {seasonLabel} {'\u2192'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Top variant: standard card
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={handlePress}>
      <View style={styles.accentBorder} />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="clipboard-outline" size={20} color={BRAND.teal} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.seasonLabel}>{seasonLabel}</Text>
          <Text style={styles.ctaLabel}>
            {childName ? `Register ${childName}` : 'Register your child'} {'\u2192'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={BRAND.teal} />
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  accentBorder: {
    width: 4,
    backgroundColor: BRAND.teal,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${BRAND.teal}14`,
  },
  textWrap: {
    flex: 1,
  },
  seasonLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginBottom: 2,
  },
  ctaLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.textPrimary,
  },
  // Bottom variant styles
  bottomWrapper: {
    paddingHorizontal: spacing.screenPadding,
    marginTop: 8,
    marginBottom: 16,
    gap: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BRAND.border,
  },
  dividerLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: BRAND.textMuted,
    letterSpacing: 1,
  },
  bottomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: `${BRAND.teal}30`,
    backgroundColor: `${BRAND.teal}08`,
  },
  bottomText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.teal,
  },
});
