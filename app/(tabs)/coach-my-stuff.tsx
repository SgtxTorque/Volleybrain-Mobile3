import AppHeaderBar from '@/components/ui/AppHeaderBar';
import SectionHeader from '@/components/ui/SectionHeader';
import { useAuth } from '@/lib/auth';
import { radii, shadows, spacing } from '@/lib/design-tokens';
import { supabase } from '@/lib/supabase';
import { AccentColor, accentColors, useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CoachTeamInfo = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  staffRole: string;
  playerCount: number;
};

type CoachCertInfo = {
  backgroundCheckStatus: string | null;
  backgroundCheckExpiry: string | null;
  coachingLicense: string | null;
  coachingLevel: string | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT_KEYS: AccentColor[] = ['orange', 'blue', 'purple', 'green', 'rose', 'slate'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CoachMyStuffScreen() {
  const { colors, isDark, toggleTheme, accentColor, changeAccent } = useTheme();
  const { user, profile, organization, signOut } = useAuth();
  const router = useRouter();
  const s = createStyles(colors);

  // State
  const [coachTeams, setCoachTeams] = useState<CoachTeamInfo[]>([]);
  const [certInfo, setCertInfo] = useState<CoachCertInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Derived
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const userEmail = profile?.email || user?.email || '';

  // ---------------------------------------------------------------------------
  // Data Layer
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch coach's teams via team_staff
      const { data: staffLinks } = await supabase
        .from('team_staff')
        .select('team_id, staff_role, teams(id, name, color)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const teamIds = (staffLinks || [])
        .map((sl: any) => (sl.teams as any)?.id)
        .filter(Boolean) as string[];

      // 2. Batch-fetch player counts for all teams
      let playerCountMap = new Map<string, number>();
      if (teamIds.length > 0) {
        const { data: playerLinks } = await supabase
          .from('team_players')
          .select('team_id')
          .in('team_id', teamIds);

        (playerLinks || []).forEach((tp: any) => {
          playerCountMap.set(tp.team_id, (playerCountMap.get(tp.team_id) || 0) + 1);
        });
      }

      const teams: CoachTeamInfo[] = (staffLinks || [])
        .map((sl: any) => {
          const t = sl.teams as any;
          if (!t?.id) return null;
          return {
            teamId: t.id,
            teamName: t.name || 'Team',
            teamColor: t.color || null,
            staffRole: sl.staff_role || 'coach',
            playerCount: playerCountMap.get(t.id) || 0,
          };
        })
        .filter(Boolean) as CoachTeamInfo[];

      setCoachTeams(teams);

      // 3. Fetch coach certifications
      const { data: coachRecord } = await supabase
        .from('coaches')
        .select('background_check_status, background_check_expiry, coaching_license, coaching_level')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (coachRecord) {
        setCertInfo({
          backgroundCheckStatus: coachRecord.background_check_status,
          backgroundCheckExpiry: coachRecord.background_check_expiry,
          coachingLicense: coachRecord.coaching_license,
          coachingLevel: coachRecord.coaching_level,
        });
      }
    } catch (err) {
      if (__DEV__) console.error('[CoachMyStuff] fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderMenuRow = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    route: string,
    iconColor: string,
    iconBg: string,
  ) => (
    <TouchableOpacity
      key={`${route}-${label}`}
      style={s.menuRow}
      onPress={() => router.push(route as any)}
      activeOpacity={0.7}
    >
      <View style={[s.menuIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={s.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <AppHeaderBar title="MY STUFF" showAvatar={false} showNotificationBell={false} />
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const bgCheckColor = certInfo?.backgroundCheckStatus === 'cleared'
    ? colors.success
    : certInfo?.backgroundCheckStatus === 'pending'
      ? colors.warning
      : colors.textMuted;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeaderBar title="MY STUFF" showAvatar={false} showNotificationBell={false} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* ================================================================ */}
        {/* 1. PROFILE BANNER */}
        {/* ================================================================ */}
        <TouchableOpacity
          style={s.profileCard}
          onPress={() => router.push('/profile' as any)}
          activeOpacity={0.8}
        >
          <View style={s.avatar}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatarImage} />
            ) : (
              <Text style={s.avatarText}>{userInitials}</Text>
            )}
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName} numberOfLines={1}>{userName}</Text>
            <Text style={s.profileEmail} numberOfLines={1}>{userEmail}</Text>
            {organization?.name && (
              <Text style={s.profileOrg} numberOfLines={1}>{organization.name}</Text>
            )}
          </View>
          <View style={s.editIcon}>
            <Ionicons name="create-outline" size={18} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* ================================================================ */}
        {/* 2. MY TEAMS */}
        {/* ================================================================ */}
        <SectionHeader title="My Teams" />

        {coachTeams.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="people-outline" size={32} color={colors.textMuted} />
            <Text style={s.emptyText}>No teams assigned yet</Text>
          </View>
        ) : (
          <View style={s.teamsContainer}>
            {coachTeams.map((team) => (
              <TouchableOpacity
                key={team.teamId}
                style={[s.teamCard, { borderLeftColor: team.teamColor || colors.primary }]}
                onPress={() => router.push({ pathname: '/team-roster', params: { teamId: team.teamId } } as any)}
                activeOpacity={0.7}
              >
                <View style={s.teamCardContent}>
                  <Text style={s.teamCardName} numberOfLines={1}>{team.teamName}</Text>
                  <View style={s.teamCardMeta}>
                    <View style={[s.roleBadge, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[s.roleBadgeText, { color: colors.primary }]}>
                        {team.staffRole === 'head_coach' ? 'Head Coach' : 'Assistant'}
                      </Text>
                    </View>
                    <Text style={s.teamPlayerCount}>{team.playerCount} players</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ================================================================ */}
        {/* 3. COACH TOOLS */}
        {/* ================================================================ */}
        <SectionHeader title="Coach Tools" />

        <View style={s.menuCard}>
          {renderMenuRow('megaphone', 'Blast History', '/blast-history', colors.warning, colors.warning + '15')}
          {renderMenuRow('calendar-outline', 'My Availability', '/coach-availability', colors.info, colors.info + '15')}
        </View>

        {/* Certifications & Documents (inline card) */}
        {certInfo && (
          <View style={s.certsCard}>
            <View style={s.certsHeader}>
              <View style={[s.menuIcon, { backgroundColor: '#AF52DE15' }]}>
                <Ionicons name="ribbon" size={20} color="#AF52DE" />
              </View>
              <Text style={s.certsTitle}>Certifications & Documents</Text>
            </View>

            {/* Background Check */}
            <View style={s.certRow}>
              <Ionicons
                name={certInfo.backgroundCheckStatus === 'cleared' ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={bgCheckColor}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.certItemLabel}>Background Check</Text>
                <Text style={s.certItemValue}>
                  {certInfo.backgroundCheckStatus
                    ? certInfo.backgroundCheckStatus.charAt(0).toUpperCase() + certInfo.backgroundCheckStatus.slice(1)
                    : 'Not submitted'}
                  {certInfo.backgroundCheckExpiry ? ` · Exp: ${new Date(certInfo.backgroundCheckExpiry).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                </Text>
              </View>
            </View>

            {/* Coaching License */}
            {certInfo.coachingLicense ? (
              <View style={s.certRow}>
                <Ionicons name="document-text" size={18} color={colors.info} />
                <View style={{ flex: 1 }}>
                  <Text style={s.certItemLabel}>Coaching License</Text>
                  <Text style={s.certItemValue}>{certInfo.coachingLicense}</Text>
                </View>
              </View>
            ) : null}

            {/* Coaching Level */}
            {certInfo.coachingLevel ? (
              <View style={s.certRow}>
                <Ionicons name="school" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={s.certItemLabel}>Coaching Level</Text>
                  <Text style={s.certItemValue}>{certInfo.coachingLevel}</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* ================================================================ */}
        {/* 4. ORGANIZATION */}
        {/* ================================================================ */}
        <SectionHeader title="Organization" />

        <View style={s.menuCard}>
          {renderMenuRow('business', 'Org Directory', '/org-directory', colors.success, colors.success + '15')}
          {renderMenuRow('share-social', 'Invite Friends', '/invite-friends', colors.info, colors.info + '15')}
        </View>

        {/* ================================================================ */}
        {/* 5. SETTINGS */}
        {/* ================================================================ */}
        <SectionHeader title="Settings" />

        <View style={s.menuCard}>
          {/* Dark mode toggle */}
          <View style={s.menuRow}>
            <View style={[s.menuIcon, { backgroundColor: colors.warning + '15' }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.warning} />
            </View>
            <Text style={s.menuLabel}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={isDark ? colors.primary : '#f4f3f4'}
              ios_backgroundColor={colors.border}
            />
          </View>

          {/* Accent color picker */}
          <View style={s.accentRow}>
            <View style={[s.menuIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="color-fill" size={20} color={colors.primary} />
            </View>
            <Text style={[s.menuLabel, { flex: 0, marginRight: 12 }]}>Accent</Text>
            <View style={s.accentCircles}>
              {ACCENT_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    s.accentCircle,
                    { backgroundColor: accentColors[key].primary },
                    accentColor === key && s.accentCircleActive,
                  ]}
                  onPress={() => changeAccent(key)}
                  activeOpacity={0.7}
                >
                  {accentColor === key && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Settings menu items */}
          {renderMenuRow('notifications', 'Notification Preferences', '/notification-preferences', colors.success, colors.success + '15')}
          {renderMenuRow('lock-closed', 'Privacy & Data', '/data-rights', '#AF52DE', '#AF52DE15')}
          {renderMenuRow('shield-checkmark', 'Privacy Policy', '/privacy-policy', colors.textSecondary, colors.textMuted + '15')}
          {renderMenuRow('document', 'Terms of Service', '/terms-of-service', colors.textSecondary, colors.textMuted + '15')}
          {renderMenuRow('help-circle', 'Help & Support', '/help', colors.warning, colors.warning + '15')}
        </View>

        {/* ================================================================ */}
        {/* 6. SIGN OUT */}
        {/* ================================================================ */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.versionText}>VolleyBrain v1.0.0</Text>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 8,
      paddingBottom: 120,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Profile banner
    profileCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.card,
      marginHorizontal: spacing.screenPadding,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      ...shadows.card,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    avatarText: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    profileInfo: {
      flex: 1,
      marginLeft: 14,
      marginRight: 24,
    },
    profileName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    profileEmail: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    profileOrg: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    editIcon: {
      position: 'absolute' as const,
      top: 14,
      right: 14,
    },

    // My Teams
    teamsContainer: {
      marginHorizontal: spacing.screenPadding,
      gap: 8,
      marginBottom: 4,
    },
    teamCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.card,
      borderLeftWidth: 3,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      ...shadows.card,
    },
    teamCardContent: {
      flex: 1,
    },
    teamCardName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    teamCardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
    },
    roleBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    roleBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    teamPlayerCount: {
      fontSize: 12,
      color: colors.textMuted,
    },

    // Empty states
    emptyCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.card,
      marginHorizontal: spacing.screenPadding,
      padding: 24,
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
    },

    // Menu card & rows
    menuCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.card,
      marginHorizontal: spacing.screenPadding,
      overflow: 'hidden',
      marginBottom: 4,
      ...shadows.card,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    menuIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    menuLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },

    // Certifications card
    certsCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.card,
      marginHorizontal: spacing.screenPadding,
      padding: 16,
      marginBottom: 4,
      ...shadows.card,
    },
    certsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    certsTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    certRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    certItemLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    certItemValue: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },

    // Settings: accent picker
    accentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    accentCircles: {
      flexDirection: 'row',
      gap: 8,
      flex: 1,
      justifyContent: 'flex-end',
    },
    accentCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    accentCircleActive: {
      borderWidth: 2,
      borderColor: '#FFFFFF',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        android: { elevation: 4 },
      }),
    },

    // Sign out
    signOutBtn: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 16,
      marginTop: 16,
      marginHorizontal: spacing.screenPadding,
    },
    signOutText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.danger,
    },

    // Version
    versionText: {
      textAlign: 'center',
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 8,
    },
  });
