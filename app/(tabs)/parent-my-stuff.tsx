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

type ChildInfo = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  teamName: string | null;
  teamColor: string | null;
  jerseyNumber: string | null;
};

type RegStatus = {
  playerId: string;
  playerName: string;
  status: string;
  seasonName: string;
};

type WaiverInfo = {
  name: string;
  signed: boolean;
  signedDate: string | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT_KEYS: AccentColor[] = ['orange', 'blue', 'purple', 'green', 'rose', 'slate'];

const REG_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: '#10B981' },
  active: { label: 'Active', color: '#10B981' },
  rostered: { label: 'On Team', color: '#10B981' },
  submitted: { label: 'Pending', color: '#F59E0B' },
  new: { label: 'Pending', color: '#F59E0B' },
  waitlisted: { label: 'Waitlisted', color: '#EF4444' },
  denied: { label: 'Not Approved', color: '#EF4444' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ParentMyStuffScreen() {
  const { colors, isDark, toggleTheme, accentColor, changeAccent } = useTheme();
  const { user, profile, organization, signOut } = useAuth();
  const router = useRouter();
  const s = createStyles(colors);

  // State
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [registrations, setRegistrations] = useState<RegStatus[]>([]);
  const [waivers, setWaivers] = useState<WaiverInfo[]>([]);
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
      const parentEmail = profile?.email || user?.email;

      // 3-source parent-child resolution
      let playerIds: string[] = [];

      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);
      if (guardianLinks) playerIds.push(...guardianLinks.map((g) => g.player_id));

      const { data: directPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id);
      if (directPlayers) playerIds.push(...directPlayers.map((p) => p.id));

      if (parentEmail) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', parentEmail);
        if (emailPlayers) playerIds.push(...emailPlayers.map((p) => p.id));
      }

      playerIds = [...new Set(playerIds)];

      if (playerIds.length === 0) {
        setChildren([]);
        setTotalOwed(0);
        setRegistrations([]);
        setWaivers([]);
        setLoading(false);
        return;
      }

      // Fetch children with teams
      const { data: players } = await supabase
        .from('players')
        .select(`
          id, first_name, last_name, photo_url, jersey_number,
          team_players ( team_id, jersey_number, teams (id, name, color) )
        `)
        .in('id', playerIds);

      const childList: ChildInfo[] = [];
      (players || []).forEach((p) => {
        const teamEntries = (p.team_players as any) || [];
        const teamEntry = teamEntries[0];
        const team = teamEntry?.teams as any;
        childList.push({
          id: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          photoUrl: (p as any).photo_url || null,
          teamName: team?.name || null,
          teamColor: team?.color || null,
          jerseyNumber: teamEntry?.jersey_number || (p as any).jersey_number || null,
        });
      });
      setChildren(childList);

      // Fetch unpaid payments
      const { data: unpaid } = await supabase
        .from('payments')
        .select('amount')
        .in('player_id', playerIds)
        .eq('paid', false);

      const owed = (unpaid || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      setTotalOwed(owed);

      // Fetch registrations with season
      const { data: regs } = await supabase
        .from('registrations')
        .select('id, player_id, status, seasons ( name )')
        .in('player_id', playerIds)
        .order('created_at', { ascending: false });

      const playerNameMap = new Map<string, string>();
      childList.forEach((c) => playerNameMap.set(c.id, `${c.firstName} ${c.lastName}`));

      const regList: RegStatus[] = (regs || []).map((r) => ({
        playerId: r.player_id,
        playerName: playerNameMap.get(r.player_id) || 'Player',
        status: r.status || 'new',
        seasonName: ((r as any).seasons as any)?.name || 'Season',
      }));
      setRegistrations(regList);

      // Fetch waiver info
      const orgId = profile?.current_organization_id || organization?.id;
      const waiverList: WaiverInfo[] = [];

      // Signed waivers
      const { data: signatures } = await supabase
        .from('waiver_signatures')
        .select('signed_at, waiver_templates ( name )')
        .in('player_id', playerIds);

      (signatures || []).forEach((sig) => {
        const tmpl = (sig as any).waiver_templates as any;
        if (tmpl?.name) {
          waiverList.push({
            name: tmpl.name,
            signed: true,
            signedDate: sig.signed_at
              ? new Date(sig.signed_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
              : null,
          });
        }
      });

      // Required but unsigned waivers
      if (orgId) {
        const { data: required } = await supabase
          .from('waiver_templates')
          .select('name')
          .eq('organization_id', orgId)
          .eq('is_required', true)
          .eq('is_active', true);

        const signedNames = new Set(waiverList.map((w) => w.name));
        (required || []).forEach((tmpl) => {
          if (!signedNames.has(tmpl.name)) {
            waiverList.push({ name: tmpl.name, signed: false, signedDate: null });
          }
        });
      }

      setWaivers(waiverList);
    } catch (err) {
      if (__DEV__) console.error('[ParentMyStuff] fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.email, organization?.id]);

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

  const getInitials = (first: string, last: string) =>
    `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();

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
        {/* 2. MY PLAYERS */}
        {/* ================================================================ */}
        <SectionHeader title="My Players" action="Register" onAction={() => router.push('/parent-registration-hub' as any)} />

        {children.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="people-outline" size={32} color={colors.textMuted} />
            <Text style={s.emptyText}>No players registered yet</Text>
            <TouchableOpacity onPress={() => router.push('/parent-registration-hub' as any)}>
              <Text style={[s.emptyLink, { color: colors.primary }]}>Register a Player</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            horizontal={children.length > 1}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={children.length > 1 ? s.childScrollContent : undefined}
            style={children.length > 1 ? s.childScroll : undefined}
          >
            {children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={[
                  s.childCard,
                  children.length === 1 && s.childCardFull,
                  { borderLeftColor: child.teamColor || colors.primary },
                ]}
                onPress={() => router.push({ pathname: '/child-detail', params: { playerId: child.id } } as any)}
                activeOpacity={0.7}
              >
                <View style={[s.childPhoto, { backgroundColor: (child.teamColor || colors.primary) + '20' }]}>
                  {child.photoUrl ? (
                    <Image source={{ uri: child.photoUrl }} style={s.childPhotoImage} />
                  ) : (
                    <Text style={[s.childPhotoText, { color: child.teamColor || colors.primary }]}>
                      {getInitials(child.firstName, child.lastName)}
                    </Text>
                  )}
                </View>
                <View style={s.childInfo}>
                  <Text style={s.childName} numberOfLines={1}>{child.firstName}</Text>
                  {child.teamName && (
                    <Text style={s.childTeam} numberOfLines={1}>{child.teamName}</Text>
                  )}
                </View>
                {child.jerseyNumber && (
                  <View style={[s.jerseyBadge, { backgroundColor: (child.teamColor || colors.primary) + '15' }]}>
                    <Text style={[s.jerseyText, { color: child.teamColor || colors.primary }]}>#{child.jerseyNumber}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ================================================================ */}
        {/* 3. PAYMENTS */}
        {/* ================================================================ */}
        <SectionHeader title="Payments" />

        <View style={[s.paymentCard, totalOwed > 0 ? s.paymentOwed : s.paymentClear]}>
          <View style={s.paymentContent}>
            <View style={{ flex: 1 }}>
              <Text style={s.paymentLabel}>
                {totalOwed > 0 ? 'Balance Due' : 'All Caught Up!'}
              </Text>
              {totalOwed > 0 ? (
                <Text style={[s.paymentAmount, { color: colors.warning }]}>
                  ${totalOwed.toFixed(2)}
                </Text>
              ) : (
                <Text style={[s.paymentSubtext, { color: colors.success }]}>
                  No outstanding payments
                </Text>
              )}
            </View>
            {totalOwed > 0 && (
              <TouchableOpacity
                style={s.payNowBtn}
                onPress={() => router.push('/family-payments' as any)}
                activeOpacity={0.7}
              >
                <Text style={s.payNowText}>Pay Now</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={s.menuCard}>
          {renderMenuRow('receipt-outline', 'View Payment History', '/family-payments', colors.warning, colors.warning + '15')}
        </View>

        {/* ================================================================ */}
        {/* 4. REGISTRATION */}
        {/* ================================================================ */}
        <SectionHeader title="Registration" />

        {registrations.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="clipboard-outline" size={32} color={colors.textMuted} />
            <Text style={s.emptyText}>No active registrations</Text>
            <TouchableOpacity onPress={() => router.push('/parent-registration-hub' as any)}>
              <Text style={[s.emptyLink, { color: colors.primary }]}>Browse Open Registrations</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.menuCard}>
            {registrations.map((reg, i) => {
              const config = REG_STATUS_CONFIG[reg.status] || REG_STATUS_CONFIG.new;
              return (
                <TouchableOpacity
                  key={`reg-${reg.playerId}-${i}`}
                  style={s.menuRow}
                  onPress={() => router.push('/parent-registration-hub' as any)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.menuLabel}>{reg.playerName}</Text>
                    <Text style={s.regSeason}>{reg.seasonName}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: config.color + '18' }]}>
                    <Text style={[s.statusBadgeText, { color: config.color }]}>{config.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ================================================================ */}
        {/* 5. DOCUMENTS & WAIVERS */}
        {/* ================================================================ */}
        <SectionHeader title="Documents & Waivers" />

        <View style={s.menuCard}>
          {waivers.length > 0 ? (
            waivers.map((w, i) => (
              <TouchableOpacity
                key={`waiver-${i}`}
                style={s.menuRow}
                onPress={() => router.push('/my-waivers' as any)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={w.signed ? 'checkmark-circle' : 'alert-circle'}
                  size={22}
                  color={w.signed ? colors.success : colors.warning}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.menuLabel}>{w.name}</Text>
                  <Text style={s.waiverStatus}>
                    {w.signed ? `Signed ${w.signedDate || ''}` : 'Not Signed'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))
          ) : (
            renderMenuRow('document-text', 'View Waivers', '/my-waivers', colors.success, colors.success + '15')
          )}
        </View>

        {/* ================================================================ */}
        {/* 6. ORGANIZATION */}
        {/* ================================================================ */}
        <SectionHeader title="Organization" />

        <View style={s.menuCard}>
          {renderMenuRow('business', 'Org Directory', '/org-directory', colors.success, colors.success + '15')}
          {renderMenuRow('share-social', 'Invite Friends', '/invite-friends', colors.info, colors.info + '15')}
        </View>

        {/* ================================================================ */}
        {/* 7. SETTINGS */}
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
        {/* 8. SIGN OUT */}
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

    // Children
    childScroll: {
      marginBottom: 4,
    },
    childScrollContent: {
      paddingHorizontal: spacing.screenPadding,
      gap: 10,
    },
    childCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.card,
      borderLeftWidth: 3,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      width: 200,
      ...shadows.card,
    },
    childCardFull: {
      width: undefined,
      marginHorizontal: spacing.screenPadding,
    },
    childPhoto: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    childPhotoImage: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    childPhotoText: {
      fontSize: 16,
      fontWeight: '700',
    },
    childInfo: {
      flex: 1,
      marginLeft: 10,
    },
    childName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    childTeam: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    jerseyBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginLeft: 8,
    },
    jerseyText: {
      fontSize: 13,
      fontWeight: '700',
    },

    // Payments
    paymentCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.card,
      marginHorizontal: spacing.screenPadding,
      padding: 16,
      borderLeftWidth: 3,
      marginBottom: 8,
      ...shadows.card,
    },
    paymentOwed: {
      borderLeftColor: colors.warning,
    },
    paymentClear: {
      borderLeftColor: colors.success,
    },
    paymentContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    paymentLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    paymentAmount: {
      fontSize: 24,
      fontWeight: '800',
      marginTop: 2,
    },
    paymentSubtext: {
      fontSize: 13,
      fontWeight: '500',
      marginTop: 2,
    },
    payNowBtn: {
      backgroundColor: colors.warning,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: radii.badge,
    },
    payNowText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },

    // Registration
    regSeason: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },

    // Waivers
    waiverStatus: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
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
    emptyLink: {
      fontSize: 14,
      fontWeight: '600',
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
