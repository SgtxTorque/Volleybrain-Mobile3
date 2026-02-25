import AppHeaderBar from '@/components/ui/AppHeaderBar';
import SectionHeader from '@/components/ui/SectionHeader';
import { useAuth } from '@/lib/auth';
import { radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { AccentColor, accentColors, useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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

// ===========================================================================
// Types
// ===========================================================================

type SeasonInfo = {
  id: string; name: string; status: string;
  registration_open: boolean; start_date: string | null; end_date: string | null;
};
type PendingInvite = {
  id: string; email: string; invite_type: string;
  invited_at: string; status: string;
};
type WaiverOverview = { total: number; compliant: number; };
type FinancialSummary = { collected: number; outstanding: number; };

// ===========================================================================
// Constants
// ===========================================================================

const ACCENT_KEYS: AccentColor[] = ['orange', 'blue', 'purple', 'green', 'rose', 'slate'];

// ===========================================================================
// Component
// ===========================================================================

export default function AdminMyStuffScreen() {
  const { colors, isDark, toggleTheme, accentColor, changeAccent } = useTheme();
  const { user, profile, organization, signOut } = useAuth();
  const { workingSeason, setWorkingSeason, allSeasons } = useSeason();
  const router = useRouter();
  const s = createStyles(colors);

  // --- State ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [waiverOverview, setWaiverOverview] = useState<WaiverOverview>({ total: 0, compliant: 0 });
  const [financials, setFinancials] = useState<FinancialSummary>({ collected: 0, outstanding: 0 });
  const [regOpen, setRegOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // --- Derived ---
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const userEmail = profile?.email || user?.email || '';

  // =========================================================================
  // Data fetching
  // =========================================================================

  const fetchData = useCallback(async () => {
    if (!profile || !organization) return;
    const orgId = organization.id || profile.current_organization_id;
    const seasonId = workingSeason?.id;

    try {
      // Batch: seasons + invites (always), players + payments (if season)
      const [seasonsRes, invitesRes] = await Promise.all([
        supabase.from('seasons').select('id, name, status, registration_open, start_date, end_date')
          .eq('organization_id', orgId).order('created_at', { ascending: false }),
        supabase.from('invitations').select('id, email, invite_type, invited_at, status')
          .eq('organization_id', orgId).eq('status', 'pending'),
      ]);

      let playersRes: any = { data: [] };
      let paymentsRes: any = { data: [] };
      if (seasonId) {
        [playersRes, paymentsRes] = await Promise.all([
          supabase.from('players').select('id').eq('season_id', seasonId),
          supabase.from('payments').select('amount, paid').eq('season_id', seasonId),
        ]);
      }

      // Seasons
      const seasonsData: SeasonInfo[] = seasonsRes.data || [];
      setSeasons(seasonsData);
      if (workingSeason) {
        const ws = seasonsData.find(s => s.id === workingSeason.id);
        setRegOpen(ws?.registration_open ?? false);
      }

      // Pending invites
      setPendingInvites(invitesRes.data || []);

      // Season-scoped data
      if (seasonId) {
        const playerIds = (playersRes.data || []).map((p: any) => p.id);
        const totalPlayers = playerIds.length;

        // Waiver compliance
        if (orgId && totalPlayers > 0) {
          const { data: requiredWaivers } = await supabase
            .from('waiver_templates')
            .select('id')
            .eq('organization_id', orgId)
            .eq('is_required', true)
            .eq('is_active', true);

          if (requiredWaivers && requiredWaivers.length > 0) {
            const waiverIds = requiredWaivers.map(w => w.id);
            const { data: sigs } = await supabase
              .from('waiver_signatures')
              .select('player_id, waiver_template_id')
              .eq('season_id', seasonId)
              .in('player_id', playerIds)
              .in('waiver_template_id', waiverIds);

            const signedSet = new Set((sigs || []).map(sg => sg.player_id + ':' + sg.waiver_template_id));
            let compliant = 0;
            for (const pid of playerIds) {
              if (waiverIds.every(wid => signedSet.has(pid + ':' + wid))) compliant++;
            }
            setWaiverOverview({ total: totalPlayers, compliant });
          } else {
            setWaiverOverview({ total: totalPlayers, compliant: totalPlayers });
          }
        } else {
          setWaiverOverview({ total: 0, compliant: 0 });
        }

        // Financial summary
        const payments = paymentsRes.data || [];
        let collected = 0;
        let outstanding = 0;
        for (const p of payments) {
          const amt = parseFloat(p.amount) || 0;
          if (p.paid) collected += amt;
          else outstanding += amt;
        }
        setFinancials({ collected, outstanding });
      }
    } catch (err) {
      if (__DEV__) console.error('[AdminMyStuff] fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }, [profile, organization, workingSeason]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // =========================================================================
  // Actions
  // =========================================================================

  const toggleRegistration = async () => {
    if (!workingSeason) return;
    const newValue = !regOpen;
    setRegOpen(newValue);
    const { error } = await supabase
      .from('seasons')
      .update({ registration_open: newValue })
      .eq('id', workingSeason.id);
    if (error) {
      setRegOpen(!newValue); // revert
      Alert.alert('Error', 'Failed to update registration status');
    }
  };

  const resendInvite = async (invite: PendingInvite) => {
    const { error } = await supabase
      .from('invitations')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', invite.id);
    if (error) {
      Alert.alert('Error', 'Failed to resend invite');
    } else {
      Alert.alert('Sent', `Invite resent to ${invite.email}`);
      fetchData();
    }
  };

  const revokeInvite = (invite: PendingInvite) => {
    Alert.alert('Revoke Invite', `Revoke invite for ${invite.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke', style: 'destructive', onPress: async () => {
          await supabase.from('invitations').update({ status: 'revoked' }).eq('id', invite.id);
          fetchData();
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  // =========================================================================
  // Banner upload handler
  // =========================================================================
  const handlePickBanner = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant photo library access to upload a banner.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingBanner(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const validExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg';
      const contentType = `image/${validExt === 'jpg' ? 'jpeg' : validExt}`;
      const orgId = organization?.id || 'unknown';
      const filePath = `org-banners/${orgId}_${Date.now()}.${validExt}`;
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error('Could not read the selected image.');
      const arrayBuffer = await response.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, arrayBuffer, { contentType, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      const existingSettings = (organization as any)?.settings || {};
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ settings: { ...existingSettings, banner_url: publicUrl } })
        .eq('id', orgId);
      if (updateError) throw updateError;
      Alert.alert('Success', 'Banner photo updated! Refresh the home screen to see it.');
    } catch (error: any) {
      if (__DEV__) console.error('Banner upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload banner.');
    } finally {
      setUploadingBanner(false);
    }
  };

  // =========================================================================
  // Render helpers
  // =========================================================================

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

  const formatCurrency = (amt: number) =>
    '$' + amt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const navigateToSeason = (season: SeasonInfo) => {
    // Match against full Season objects from context so setWorkingSeason gets the right shape
    const fullSeason = allSeasons.find(s => s.id === season.id);
    if (fullSeason) setWorkingSeason(fullSeason);
    router.push('/season-settings' as any);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // =========================================================================
  // Loading state
  // =========================================================================

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
        <AppHeaderBar title="MY STUFF" showAvatar={false} showNotificationBell={false} />
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // Main render
  // =========================================================================

  const waiverPct = waiverOverview.total > 0
    ? Math.round((waiverOverview.compliant / waiverOverview.total) * 100)
    : 100;
  const waiverAllClear = waiverPct === 100;

  const totalFinancial = financials.collected + financials.outstanding;
  const collectedPct = totalFinancial > 0
    ? Math.round((financials.collected / totalFinancial) * 100)
    : 100;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeaderBar title="MY STUFF" showAvatar={false} showNotificationBell={false} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
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
            <View style={s.profileMeta}>
              {organization?.name && (
                <Text style={s.profileOrg} numberOfLines={1}>{organization.name}</Text>
              )}
              <View style={[s.roleBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[s.roleBadgeText, { color: colors.primary }]}>Admin</Text>
              </View>
            </View>
          </View>
          <View style={s.editIcon}>
            <Ionicons name="create-outline" size={18} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* ================================================================ */}
        {/* 2. ORGANIZATION */}
        {/* ================================================================ */}
        <SectionHeader title="Organization" />

        {/* Season info + registration toggle */}
        {workingSeason && (
          <View style={s.glassCard}>
            <View style={s.seasonRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.seasonName}>{workingSeason.name}</Text>
                <Text style={s.seasonStatus}>
                  Registration {regOpen ? 'Open' : 'Closed'}
                </Text>
              </View>
              <Switch
                value={regOpen}
                onValueChange={toggleRegistration}
                trackColor={{ false: colors.border, true: colors.success + '60' }}
                thumbColor={regOpen ? colors.success : '#f4f3f4'}
                ios_backgroundColor={colors.border}
              />
            </View>
          </View>
        )}

        {/* Admin Portal */}
        <TouchableOpacity
          style={s.portalCard}
          onPress={() => Linking.openURL('https://volleybrain-admin.vercel.app')}
          activeOpacity={0.8}
        >
          <View style={[s.menuIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="globe-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.portalTitle}>Full Admin Portal</Text>
            <Text style={s.portalSubtitle}>Complex tasks, reports, and org settings</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.primary} />
        </TouchableOpacity>

        <View style={s.menuCard}>
          {renderMenuRow('business', 'Org Directory', '/org-directory', colors.success, colors.success + '15')}
          {renderMenuRow('share-social', 'Invite Friends', '/invite-friends', colors.info, colors.info + '15')}
          <TouchableOpacity style={s.menuRow} onPress={handlePickBanner} disabled={uploadingBanner} activeOpacity={0.7}>
            <View style={[s.menuIcon, { backgroundColor: '#2C536415' }]}>
              {uploadingBanner ? <ActivityIndicator size="small" color="#2C5364" /> : <Ionicons name="image" size={18} color="#2C5364" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>Upload Org Banner</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ================================================================ */}
        {/* REGISTRATION HUB */}
        {/* ================================================================ */}
        <SectionHeader title="Registration" />
        <View style={s.menuCard}>
          {renderMenuRow('document-text', 'Registration Hub', '/registration-hub', '#AF52DE', '#AF52DE15')}
        </View>

        {/* ================================================================ */}
        {/* 3. SEASONS */}
        {/* ================================================================ */}
        <SectionHeader title={`Seasons (${seasons.length})`} />

        <View style={s.menuCard}>
          {seasons.length === 0 ? (
            <View style={s.emptyInline}>
              <Text style={s.emptyText}>No seasons yet</Text>
            </View>
          ) : (
            <>
              {/* Active seasons */}
              {seasons.filter(ss => ss.status === 'active').map(season => (
                <TouchableOpacity key={season.id} style={s.menuRow} onPress={() => navigateToSeason(season)} activeOpacity={0.7}>
                  <View style={[s.menuIcon, { backgroundColor: colors.success + '15' }]}>
                    <Ionicons name="trophy" size={18} color={colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.menuLabel, { fontWeight: '700' }]}>{season.name}</Text>
                  </View>
                  <View style={[s.activeBadge, { backgroundColor: colors.success + '15' }]}>
                    <Text style={[s.activeBadgeText, { color: colors.success }]}>Active</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
              {/* Draft seasons */}
              {seasons.filter(ss => ss.status === 'draft').map(season => (
                <TouchableOpacity key={season.id} style={s.menuRow} onPress={() => navigateToSeason(season)} activeOpacity={0.7}>
                  <View style={[s.menuIcon, { backgroundColor: '#E8913A15' }]}>
                    <Ionicons name="construct" size={18} color="#E8913A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.menuLabel}>{season.name}</Text>
                  </View>
                  <View style={[s.activeBadge, { backgroundColor: '#E8913A15' }]}>
                    <Text style={[s.activeBadgeText, { color: '#E8913A' }]}>Draft</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
              {/* Upcoming seasons */}
              {seasons.filter(ss => ss.status === 'upcoming').map(season => (
                <TouchableOpacity key={season.id} style={s.menuRow} onPress={() => navigateToSeason(season)} activeOpacity={0.7}>
                  <View style={[s.menuIcon, { backgroundColor: colors.info + '15' }]}>
                    <Ionicons name="time" size={18} color={colors.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.menuLabel}>{season.name}</Text>
                  </View>
                  <View style={[s.activeBadge, { backgroundColor: colors.info + '15' }]}>
                    <Text style={[s.activeBadgeText, { color: colors.info }]}>Upcoming</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
              {/* Archived/Completed — collapsible */}
              {seasons.filter(ss => ss.status === 'completed').length > 0 && (
                <>
                  <TouchableOpacity style={s.menuRow} onPress={() => setShowArchived(!showArchived)} activeOpacity={0.7}>
                    <View style={[s.menuIcon, { backgroundColor: colors.textMuted + '10' }]}>
                      <Ionicons name="archive" size={18} color={colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.menuLabel, { color: colors.textMuted }]}>Archived ({seasons.filter(ss => ss.status === 'completed').length})</Text>
                    </View>
                    <Ionicons name={showArchived ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                  {showArchived && seasons.filter(ss => ss.status === 'completed').map(season => (
                    <TouchableOpacity key={season.id} style={[s.menuRow, { paddingLeft: 24 }]} onPress={() => navigateToSeason(season)} activeOpacity={0.7}>
                      <View style={[s.menuIcon, { backgroundColor: colors.textMuted + '10' }]}>
                        <Ionicons name="trophy" size={18} color={colors.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.menuLabel, { color: colors.textMuted }]}>{season.name}</Text>
                      </View>
                      <View style={[s.activeBadge, { backgroundColor: colors.textMuted + '10' }]}>
                        <Text style={[s.activeBadgeText, { color: colors.textMuted }]}>Completed</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}
        </View>

        {/* ================================================================ */}
        {/* 4. WAIVER COMPLIANCE */}
        {/* ================================================================ */}
        <SectionHeader title="Waiver Compliance" />

        <View style={s.glassCard}>
          <View style={s.overviewRow}>
            <Ionicons
              name={waiverAllClear ? 'shield-checkmark' : 'alert-circle'}
              size={28}
              color={waiverAllClear ? colors.success : '#E8913A'}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.overviewTitle}>
                {waiverOverview.compliant}/{waiverOverview.total} players compliant
              </Text>
              <Text style={[s.overviewSubtitle, { color: waiverAllClear ? colors.success : '#E8913A' }]}>
                {waiverPct}% complete
              </Text>
            </View>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, {
              width: `${waiverPct}%` as any,
              backgroundColor: waiverAllClear ? colors.success : '#E8913A',
            }]} />
          </View>
        </View>

        {/* ================================================================ */}
        {/* 5. FINANCIALS */}
        {/* ================================================================ */}
        <SectionHeader title="Financials" />

        <TouchableOpacity
          style={s.glassCard}
          onPress={() => router.push('/(tabs)/payments' as any)}
          activeOpacity={0.7}
        >
          <View style={s.finRow}>
            <View style={s.finItem}>
              <Text style={[s.finAmount, { color: colors.success }]}>{formatCurrency(financials.collected)}</Text>
              <Text style={s.finLabel}>Collected</Text>
            </View>
            <View style={[s.finDivider, { backgroundColor: colors.glassBorder }]} />
            <View style={s.finItem}>
              <Text style={[s.finAmount, { color: financials.outstanding > 0 ? '#E8913A' : colors.textMuted }]}>
                {formatCurrency(financials.outstanding)}
              </Text>
              <Text style={s.finLabel}>Outstanding</Text>
            </View>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, {
              width: `${collectedPct}%` as any,
              backgroundColor: colors.success,
            }]} />
          </View>
          <View style={s.finFooter}>
            <Text style={s.finFooterText}>
              {formatCurrency(totalFinancial)} total expected
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* ================================================================ */}
        {/* 6. PENDING INVITES */}
        {/* ================================================================ */}
        <SectionHeader title={`Pending Invites (${pendingInvites.length})`} />

        <View style={s.menuCard}>
          {pendingInvites.length === 0 ? (
            <View style={s.emptyInline}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[s.emptyText, { marginLeft: 8, color: colors.success }]}>All caught up!</Text>
            </View>
          ) : (
            pendingInvites.map((invite, idx) => (
              <View
                key={invite.id}
                style={[s.inviteRow, idx === pendingInvites.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.inviteEmail} numberOfLines={1}>{invite.email}</Text>
                  <Text style={s.inviteMeta}>
                    {invite.invite_type || 'member'} \u00B7 {formatDate(invite.invited_at)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.inviteActionBtn, { borderColor: colors.info }]}
                  onPress={() => resendInvite(invite)}
                >
                  <Ionicons name="refresh" size={14} color={colors.info} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.inviteActionBtn, { borderColor: colors.danger, marginLeft: 6 }]}
                  onPress={() => revokeInvite(invite)}
                >
                  <Ionicons name="close" size={14} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
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

// ===========================================================================
// Styles
// ===========================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingTop: 8, paddingBottom: 120 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Profile banner
    profileCard: {
      backgroundColor: colors.glassCard, borderWidth: 1, borderColor: colors.glassBorder,
      borderRadius: radii.card, marginHorizontal: spacing.screenPadding,
      padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 4, ...shadows.card,
    },
    avatar: {
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    },
    avatarImage: { width: 60, height: 60, borderRadius: 30 },
    avatarText: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
    profileInfo: { flex: 1, marginLeft: 14, marginRight: 24 },
    profileName: { fontSize: 18, fontWeight: '700', color: colors.text },
    profileEmail: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    profileMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    profileOrg: { fontSize: 13, color: colors.textSecondary },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    roleBadgeText: { fontSize: 11, fontWeight: '700' },
    editIcon: {
      position: 'absolute', right: 16, top: 16,
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: colors.glassCard, borderWidth: 1, borderColor: colors.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },

    // Glass card
    glassCard: {
      backgroundColor: colors.glassCard, borderWidth: 1, borderColor: colors.glassBorder,
      borderRadius: radii.card, marginHorizontal: spacing.screenPadding,
      padding: 16, marginBottom: 8, ...shadows.card,
    },

    // Season info
    seasonRow: { flexDirection: 'row', alignItems: 'center' },
    seasonName: { fontSize: 16, fontWeight: '700', color: colors.text },
    seasonStatus: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

    // Portal card
    portalCard: {
      backgroundColor: colors.glassCard, borderWidth: 1, borderColor: colors.glassBorder,
      borderRadius: radii.card, marginHorizontal: spacing.screenPadding,
      padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
      marginBottom: 8, ...shadows.card,
    },
    portalTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
    portalSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },

    // Menu card
    menuCard: {
      backgroundColor: colors.glassCard, borderWidth: 1, borderColor: colors.glassBorder,
      borderRadius: radii.card, marginHorizontal: spacing.screenPadding,
      overflow: 'hidden', marginBottom: 4, ...shadows.card,
    },
    menuRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.glassBorder,
    },
    menuIcon: {
      width: 36, height: 36, borderRadius: 10,
      justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text },

    // Active badge
    activeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginRight: 6 },
    activeBadgeText: { fontSize: 11, fontWeight: '700' },

    // Overview card (waiver)
    overviewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    overviewTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    overviewSubtitle: { fontSize: 13, fontWeight: '600', marginTop: 2 },

    // Progress bar
    progressTrack: {
      height: 6, borderRadius: 3,
      backgroundColor: colors.glassBorder, overflow: 'hidden',
    },
    progressFill: { height: 6, borderRadius: 3 },

    // Financials
    finRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    finItem: { flex: 1, alignItems: 'center' },
    finAmount: { fontSize: 22, fontWeight: '800' },
    finLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    finDivider: { width: 1, height: 36, marginHorizontal: 12 },
    finFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    finFooterText: { fontSize: 12, color: colors.textMuted },

    // Invites
    inviteRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.glassBorder,
    },
    inviteEmail: { fontSize: 14, fontWeight: '600', color: colors.text },
    inviteMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    inviteActionBtn: {
      width: 30, height: 30, borderRadius: 15,
      borderWidth: 1.5, justifyContent: 'center', alignItems: 'center',
    },

    // Empty inline
    emptyInline: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 20, paddingHorizontal: 14,
    },
    emptyText: { fontSize: 14, color: colors.textMuted },

    // Accent picker
    accentRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.glassBorder,
    },
    accentCircles: { flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'flex-end' },
    accentCircle: {
      width: 28, height: 28, borderRadius: 14,
      justifyContent: 'center', alignItems: 'center',
    },
    accentCircleActive: {
      borderWidth: 2.5, borderColor: '#FFFFFF',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
        android: { elevation: 4 },
      }),
    },

    // Sign out
    signOutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 14, marginTop: 8,
      marginHorizontal: spacing.screenPadding,
    },
    signOutText: { fontSize: 16, fontWeight: '600', color: colors.danger },

    // Version
    versionText: {
      textAlign: 'center', fontSize: 12, color: colors.textMuted,
      marginTop: 12, marginBottom: 8,
    },
  });
