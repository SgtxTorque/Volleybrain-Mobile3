/**
 * RegistrationStart — Season selector for parent registration.
 * Shows open seasons with cards. Single season skips straight to form.
 * No seasons shows empty state with SleepLynx mascot.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING, SHADOWS } from '@/theme/spacing';
import { radii, shadows } from '@/lib/design-tokens';

// ─── Types ───────────────────────────────────────────────────────

type OpenSeason = {
  id: string;
  name: string;
  organization_id: string;
  org_name: string;
  sport_name: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_closes: string | null;
  fee_registration: number | null;
  age_groups: { id: string; name: string }[];
};

// ─── Helpers ─────────────────────────────────────────────────────

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

// ─── Component ───────────────────────────────────────────────────

export default function RegistrationStartScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<OpenSeason[]>([]);

  useEffect(() => {
    fetchOpenSeasons();
  }, [user?.id]);

  const fetchOpenSeasons = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Get all org IDs the parent belongs to
      const { data: roles } = await supabase
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const orgIds = [...new Set((roles || []).map(r => r.organization_id))];
      if (orgIds.length === 0) {
        setSeasons([]);
        return;
      }

      // Fetch open seasons
      const { data: rawSeasons } = await supabase
        .from('seasons')
        .select('id, name, organization_id, sport, start_date, end_date, registration_closes, fee_registration')
        .in('organization_id', orgIds)
        .eq('registration_open', true);

      if (!rawSeasons || rawSeasons.length === 0) {
        setSeasons([]);
        return;
      }

      // If single season, skip this screen entirely
      if (rawSeasons.length === 1) {
        router.replace(`/register/${rawSeasons[0].id}` as any);
        return;
      }

      // Fetch org names
      const seasonOrgIds = [...new Set(rawSeasons.map(s => s.organization_id))];
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', seasonOrgIds);
      const orgMap = new Map((orgs || []).map(o => [o.id, o.name]));

      // Fetch age groups per season
      const seasonIds = rawSeasons.map(s => s.id);
      const { data: ageGroups } = await supabase
        .from('age_groups')
        .select('id, name, season_id')
        .in('season_id', seasonIds);
      const agMap = new Map<string, { id: string; name: string }[]>();
      (ageGroups || []).forEach(ag => {
        const list = agMap.get(ag.season_id) || [];
        list.push({ id: ag.id, name: ag.name });
        agMap.set(ag.season_id, list);
      });

      const formatted: OpenSeason[] = rawSeasons.map(s => ({
        id: s.id,
        name: s.name,
        organization_id: s.organization_id,
        org_name: orgMap.get(s.organization_id) || 'Organization',
        sport_name: s.sport || null,
        start_date: s.start_date,
        end_date: s.end_date,
        registration_closes: s.registration_closes,
        fee_registration: s.fee_registration,
        age_groups: agMap.get(s.id) || [],
      }));

      setSeasons(formatted);
    } catch (err) {
      if (__DEV__) console.error('Error fetching open seasons:', err);
      setSeasons([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Loading ─────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND.teal} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── No open seasons ─────────────────────────────

  if (seasons.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={BRAND.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Image
            source={require('../assets/images/mascot/SleepLynx.png')}
            style={styles.emptyMascot}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>No Open Registrations</Text>
          <Text style={styles.emptySubtitle}>
            Check back soon! Your organization will open registration when a new season is ready.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Season cards ─────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={BRAND.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require('../assets/images/mascot/Meet-Lynx.png')}
          style={styles.mascot}
          resizeMode="contain"
        />
        <Text style={styles.title}>Register Your Child</Text>
        <Text style={styles.subtitle}>Choose a season to get started</Text>

        {seasons.map(season => {
          const daysLeft = daysUntil(season.registration_closes);
          const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft < 7;

          return (
            <TouchableOpacity
              key={season.id}
              style={styles.seasonCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/register/${season.id}` as any)}
            >
              <View style={styles.seasonCardHeader}>
                {season.sport_name && (
                  <View style={styles.sportBadge}>
                    <Ionicons name="tennisball-outline" size={14} color={BRAND.teal} />
                    <Text style={styles.sportText}>{season.sport_name}</Text>
                  </View>
                )}
                <Text style={styles.orgName}>{season.org_name}</Text>
              </View>

              <Text style={styles.seasonName}>{season.name}</Text>

              {(season.start_date || season.end_date) && (
                <Text style={styles.dateRange}>
                  {formatDateShort(season.start_date)}
                  {season.end_date ? ` \u2013 ${formatDateShort(season.end_date)}` : ''}
                </Text>
              )}

              <View style={styles.seasonMeta}>
                {season.registration_closes && (
                  <View style={[styles.metaChip, isUrgent && styles.metaChipUrgent]}>
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={isUrgent ? BRAND.coral : BRAND.textMuted}
                    />
                    <Text style={[styles.metaChipText, isUrgent && styles.metaChipTextUrgent]}>
                      {isUrgent
                        ? `Closes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                        : `Closes ${formatDateShort(season.registration_closes)}`}
                    </Text>
                  </View>
                )}

                {season.fee_registration !== null && season.fee_registration > 0 && (
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>
                      Starting at ${season.fee_registration}
                    </Text>
                  </View>
                )}
              </View>

              {season.age_groups.length > 0 && (
                <View style={styles.ageGroupRow}>
                  {season.age_groups.map(ag => (
                    <View key={ag.id} style={styles.ageGroupPill}>
                      <Text style={styles.ageGroupPillText}>{ag.name}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.ctaRow}>
                <Text style={styles.ctaText}>Register</Text>
                <Ionicons name="arrow-forward" size={16} color={BRAND.white} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Mascot + header
  mascot: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 24,
    color: BRAND.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Empty state
  emptyMascot: {
    width: 120,
    height: 120,
    marginBottom: 20,
    opacity: 0.7,
  },
  emptyTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    color: BRAND.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Season card
  seasonCard: {
    backgroundColor: BRAND.white,
    borderRadius: radii.card,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  seasonCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${BRAND.teal}12`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sportText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.teal,
  },
  orgName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  seasonName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  dateRange: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    marginBottom: 12,
  },

  // Meta chips
  seasonMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND.warmGray,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  metaChipUrgent: {
    backgroundColor: `${BRAND.coral}12`,
  },
  metaChipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  metaChipTextUrgent: {
    color: BRAND.coral,
    fontFamily: FONTS.bodySemiBold,
  },

  // Age group pills
  ageGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  ageGroupPill: {
    backgroundColor: `${BRAND.skyBlue}14`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ageGroupPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },

  // CTA button
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND.teal,
    paddingVertical: 12,
    borderRadius: radii.card,
  },
  ctaText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.white,
  },
});
