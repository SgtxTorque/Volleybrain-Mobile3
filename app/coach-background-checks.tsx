import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ================================================================
// TYPES
// ================================================================

type Coach = {
  id: string;
  first_name: string;
  last_name: string;
  background_check_status: string | null;
  background_check_date: string | null;
  background_check_expiry: string | null;
};

type StatusCategory = 'valid' | 'expiring' | 'expired' | 'not_submitted';

// ================================================================
// HELPERS
// ================================================================

const DAY_MS = 1000 * 60 * 60 * 24;

function categorize(coach: Coach): StatusCategory {
  const status = coach.background_check_status;
  if (!status || status.trim() === '') return 'not_submitted';

  const isApproved = status === 'valid' || status === 'approved' || status === 'passed' || status === 'cleared';
  if (!isApproved) return 'not_submitted';

  const expiry = coach.background_check_expiry;
  if (!expiry) return 'valid';

  const expiryDate = new Date(expiry);
  const now = new Date();

  if (expiryDate < now) return 'expired';

  const daysLeft = (expiryDate.getTime() - now.getTime()) / DAY_MS;
  if (daysLeft < 30) return 'expiring';

  return 'valid';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return Math.ceil((d.getTime() - Date.now()) / DAY_MS);
  } catch {
    return null;
  }
}

// ================================================================
// COMPONENT
// ================================================================

export default function CoachBackgroundChecksScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { organization } = useAuth();
  const { isAdmin } = usePermissions();
  const { workingSeason } = useSeason();

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ================================================================
  // DATA FETCHING
  // ================================================================

  const fetchCoaches = useCallback(async () => {
    if (!workingSeason) return;

    // Get team IDs for this season
    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('season_id', workingSeason.id);

    if (!teams || teams.length === 0) {
      setCoaches([]);
      setLoading(false);
      return;
    }

    const teamIds = teams.map(t => t.id);

    // Get coach IDs linked to those teams
    const { data: teamCoaches } = await supabase
      .from('team_coaches')
      .select('coach_id')
      .in('team_id', teamIds);

    if (!teamCoaches || teamCoaches.length === 0) {
      setCoaches([]);
      setLoading(false);
      return;
    }

    const coachIds = [...new Set(teamCoaches.map(tc => tc.coach_id))];

    // Fetch coach details
    const { data: coachData } = await supabase
      .from('coaches')
      .select('id, first_name, last_name, background_check_status, background_check_date, background_check_expiry')
      .in('id', coachIds);

    setCoaches(coachData || []);
    setLoading(false);
  }, [workingSeason]);

  useEffect(() => {
    fetchCoaches();
  }, [fetchCoaches]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCoaches();
    setRefreshing(false);
  }, [fetchCoaches]);

  // ================================================================
  // COMPUTED
  // ================================================================

  const categorized = useMemo(() => {
    const map: Record<StatusCategory, Coach[]> = {
      valid: [],
      expiring: [],
      expired: [],
      not_submitted: [],
    };
    coaches.forEach(c => {
      map[categorize(c)].push(c);
    });
    return map;
  }, [coaches]);

  const sortedCoaches = useMemo(() => {
    // Show in priority order: expired, expiring, not submitted, valid
    return [
      ...categorized.expired,
      ...categorized.expiring,
      ...categorized.not_submitted,
      ...categorized.valid,
    ];
  }, [categorized]);

  // ================================================================
  // STATUS BADGE CONFIG
  // ================================================================

  const getBadgeConfig = (category: StatusCategory) => {
    switch (category) {
      case 'valid':
        return {
          label: 'Valid',
          color: colors.success,
          icon: 'checkmark-circle' as const,
        };
      case 'expiring':
        return {
          label: 'Expiring Soon',
          color: colors.warning,
          icon: 'warning' as const,
        };
      case 'expired':
        return {
          label: 'Expired',
          color: colors.danger,
          icon: 'alert-circle' as const,
        };
      case 'not_submitted':
        return {
          label: 'Not Submitted',
          color: colors.textMuted,
          icon: 'remove-circle-outline' as const,
        };
    }
  };

  // ================================================================
  // RENDER
  // ================================================================

  const s = createStyles(colors);

  const renderCoachRow = (coach: Coach) => {
    const category = categorize(coach);
    const badge = getBadgeConfig(category);
    const days = daysUntil(coach.background_check_expiry);

    return (
      <TouchableOpacity
        key={coach.id}
        style={s.coachCard}
        onPress={() => {
          setSelectedCoach(coach);
          setShowDetailModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={s.cardRow}>
          {/* Avatar */}
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {coach.first_name?.[0] || '?'}
              {coach.last_name?.[0] || '?'}
            </Text>
          </View>

          {/* Info */}
          <View style={s.cardInfo}>
            <Text style={s.coachName} numberOfLines={1}>
              {coach.first_name} {coach.last_name}
            </Text>

            {/* Expiration line */}
            {category === 'valid' && coach.background_check_expiry && (
              <Text style={s.expiryText}>
                Expires {formatDate(coach.background_check_expiry)}
              </Text>
            )}
            {category === 'expiring' && days !== null && (
              <Text style={[s.expiryText, { color: colors.warning }]}>
                Expires in {days} day{days !== 1 ? 's' : ''}
              </Text>
            )}
            {category === 'expired' && (
              <Text style={[s.expiryText, { color: colors.danger }]}>
                Expired {formatDate(coach.background_check_expiry)}
              </Text>
            )}
            {category === 'not_submitted' && (
              <Text style={s.expiryText}>No check on file</Text>
            )}
          </View>

          {/* Badge */}
          <View style={[s.statusBadge, { backgroundColor: badge.color + '18' }]}>
            <Ionicons name={badge.icon} size={14} color={badge.color} />
            <Text style={[s.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>

          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
        </View>
      </TouchableOpacity>
    );
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#666' }}>Access restricted to administrators.</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={{ fontSize: 14, color: '#4BB9EC', marginTop: 12 }}>Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Background Checks</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Summary Bar */}
          {coaches.length > 0 && (
            <View style={s.summaryBar}>
              <View style={s.summaryInner}>
                <View style={s.summaryItem}>
                  <View style={[s.summaryDot, { backgroundColor: colors.success }]} />
                  <Text style={s.summaryText}>
                    {categorized.valid.length} Valid
                  </Text>
                </View>
                <Text style={s.summarySep}>{'\u00B7'}</Text>
                <View style={s.summaryItem}>
                  <View style={[s.summaryDot, { backgroundColor: colors.warning }]} />
                  <Text style={s.summaryText}>
                    {categorized.expiring.length} Expiring
                  </Text>
                </View>
                <Text style={s.summarySep}>{'\u00B7'}</Text>
                <View style={s.summaryItem}>
                  <View style={[s.summaryDot, { backgroundColor: colors.danger }]} />
                  <Text style={s.summaryText}>
                    {categorized.expired.length} Expired
                  </Text>
                </View>
                <Text style={s.summarySep}>{'\u00B7'}</Text>
                <View style={s.summaryItem}>
                  <View style={[s.summaryDot, { backgroundColor: colors.textMuted }]} />
                  <Text style={s.summaryText}>
                    {categorized.not_submitted.length} None
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Coach List or Empty State */}
          {sortedCoaches.length === 0 ? (
            <View style={s.emptyContainer}>
              <Image
                source={require('@/assets/images/mascot/Meet-Lynx.png')}
                style={s.mascotImage}
                resizeMode="contain"
              />
              <Text style={s.emptyTitle}>No Coaches Found</Text>
              <Text style={s.emptySubtext}>
                There are no coaches assigned to teams this season. Add coaches from the Coach Directory first.
              </Text>
            </View>
          ) : (
            sortedCoaches.map(renderCoachRow)
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ============================================================ */}
      {/* DETAIL BOTTOM SHEET (Modal)                                   */}
      {/* ============================================================ */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.detailSheet}>
            {selectedCoach && (() => {
              const category = categorize(selectedCoach);
              const badge = getBadgeConfig(category);
              const days = daysUntil(selectedCoach.background_check_expiry);

              return (
                <>
                  {/* Sheet Header */}
                  <View style={s.sheetHeader}>
                    <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                      <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={s.sheetTitle}>Check Details</Text>
                    <View style={{ width: 24 }} />
                  </View>

                  <ScrollView style={s.sheetScroll} showsVerticalScrollIndicator={false}>
                    {/* Coach Identity */}
                    <View style={s.sheetProfile}>
                      <View style={s.avatarLg}>
                        <Text style={s.avatarLgText}>
                          {selectedCoach.first_name?.[0] || '?'}
                          {selectedCoach.last_name?.[0] || '?'}
                        </Text>
                      </View>
                      <Text style={s.sheetName}>
                        {selectedCoach.first_name} {selectedCoach.last_name}
                      </Text>
                    </View>

                    {/* Status Card */}
                    <View style={s.detailSection}>
                      <Text style={s.sectionLabel}>STATUS</Text>
                      <View style={s.statusRow}>
                        <Ionicons name={badge.icon} size={22} color={badge.color} />
                        <Text style={[s.statusText, { color: badge.color }]}>
                          {badge.label}
                        </Text>
                      </View>
                      {category === 'expiring' && days !== null && (
                        <Text style={[s.statusNote, { color: colors.warning }]}>
                          Expires in {days} day{days !== 1 ? 's' : ''} -- renewal recommended
                        </Text>
                      )}
                      {category === 'expired' && (
                        <Text style={[s.statusNote, { color: colors.danger }]}>
                          This background check has expired and needs to be renewed.
                        </Text>
                      )}
                      {category === 'not_submitted' && (
                        <Text style={[s.statusNote, { color: colors.textMuted }]}>
                          No background check has been submitted for this coach.
                        </Text>
                      )}
                    </View>

                    {/* Check Type */}
                    <View style={s.detailSection}>
                      <Text style={s.sectionLabel}>CHECK TYPE</Text>
                      <View style={s.detailRow}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                        <Text style={s.detailRowText}>
                          {selectedCoach.background_check_status
                            ? selectedCoach.background_check_status.charAt(0).toUpperCase() +
                              selectedCoach.background_check_status.slice(1)
                            : 'N/A'}
                        </Text>
                      </View>
                    </View>

                    {/* Dates */}
                    <View style={s.detailSection}>
                      <Text style={s.sectionLabel}>DATES</Text>
                      <View style={s.detailRow}>
                        <Ionicons name="calendar-outline" size={18} color={colors.info} />
                        <Text style={s.detailRowLabel}>Check Date</Text>
                        <Text style={s.detailRowValue}>
                          {formatDate(selectedCoach.background_check_date)}
                        </Text>
                      </View>
                      <View style={s.divider} />
                      <View style={s.detailRow}>
                        <Ionicons name="time-outline" size={18} color={category === 'expired' ? colors.danger : colors.info} />
                        <Text style={s.detailRowLabel}>Expiry Date</Text>
                        <Text
                          style={[
                            s.detailRowValue,
                            category === 'expired' && { color: colors.danger },
                            category === 'expiring' && { color: colors.warning },
                          ]}
                        >
                          {formatDate(selectedCoach.background_check_expiry)}
                        </Text>
                      </View>
                    </View>

                    {/* Notes */}
                    <View style={s.detailSection}>
                      <Text style={s.sectionLabel}>NOTES</Text>
                      <Text style={s.notesText}>
                        {category === 'valid'
                          ? 'Background check is current and valid. No action required.'
                          : category === 'expiring'
                          ? 'Background check is approaching expiration. Please arrange for renewal before the expiry date.'
                          : category === 'expired'
                          ? 'Background check has expired. This coach should not participate in team activities until a new check is completed.'
                          : 'No background check on file. Please ensure this coach completes a background check before participating in team activities.'}
                      </Text>
                    </View>
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ================================================================
// STYLES
// ================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.screenPadding, paddingTop: 8 },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: 14,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { ...displayTextStyle, fontSize: 18, color: colors.text },

    // Loading
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Summary Bar
    summaryBar: {
      backgroundColor: colors.glassCard,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 14,
      marginBottom: 16,
      ...shadows.card,
    },
    summaryInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    summaryDot: { width: 8, height: 8, borderRadius: 4 },
    summaryText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: colors.text },
    summarySep: { fontSize: 16, fontFamily: FONTS.bodyBold, color: colors.textMuted, marginHorizontal: 2 },

    // Coach Card
    coachCard: {
      backgroundColor: colors.glassCard,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      marginBottom: 10,
      ...shadows.card,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: { fontSize: 16, fontFamily: FONTS.bodyBold, color: colors.primary },
    cardInfo: { flex: 1 },
    coachName: { fontSize: 15, fontFamily: FONTS.bodyBold, color: colors.text },
    expiryText: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: colors.textMuted, marginTop: 2 },

    // Status Badge
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: radii.badge,
    },
    statusBadgeText: { fontSize: 11, fontFamily: FONTS.bodySemiBold },

    // Empty State
    emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
    mascotImage: { width: 140, height: 140, marginBottom: 20 },
    emptyTitle: { ...displayTextStyle, fontSize: 22, color: colors.text, marginBottom: 8 },
    emptySubtext: {
      fontSize: 14,
      fontFamily: FONTS.bodyMedium,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },

    // Detail Bottom Sheet
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    detailSheet: {
      backgroundColor: colors.glassCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: '75%',
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
    },
    sheetTitle: { ...displayTextStyle, fontSize: 20, color: colors.text },
    sheetScroll: { flex: 1, padding: 16 },

    // Sheet Profile
    sheetProfile: { alignItems: 'center', marginBottom: 24 },
    avatarLg: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    avatarLgText: { fontSize: 28, fontFamily: FONTS.bodyBold, color: colors.primary },
    sheetName: { ...displayTextStyle, fontSize: 26, color: colors.text },

    // Detail Sections
    detailSection: {
      backgroundColor: colors.background,
      borderRadius: radii.card,
      padding: 16,
      marginBottom: 14,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: FONTS.bodyExtraBold,
      color: colors.textMuted,
      marginBottom: 10,
      letterSpacing: 1.5,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusText: { fontSize: 18, fontFamily: FONTS.bodyBold },
    statusNote: { fontSize: 13, fontFamily: FONTS.bodyMedium, marginTop: 8, lineHeight: 18 },

    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    detailRowText: { flex: 1, fontSize: 15, fontFamily: FONTS.bodyMedium, color: colors.text },
    detailRowLabel: { flex: 1, fontSize: 14, fontFamily: FONTS.bodyMedium, color: colors.textSecondary },
    detailRowValue: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: colors.text },
    divider: { height: 1, backgroundColor: colors.glassBorder, marginVertical: 4 },

    notesText: { fontSize: 14, fontFamily: FONTS.bodyMedium, color: colors.textSecondary, lineHeight: 20 },
  });
