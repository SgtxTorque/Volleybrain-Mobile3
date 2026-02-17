import { useAuth } from '@/lib/auth';
import { UserRole } from '@/lib/permissions';
import { usePermissions } from '@/lib/permissions-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserWithRoles = {
  id: string;
  email: string;
  full_name: string | null;
  roles: string[];
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  allow_self_registration: boolean;
  registration_open: boolean;
};

export default function SettingsScreen() {
  const { profile, signOut } = useAuth();
  const { colors, mode, setTheme } = useTheme();
  const router = useRouter();
  const { 
    isAdmin, 
    context, 
    refresh: refreshPermissions,
    devMode,
    devViewAs,
    setDevViewAs,
    actualRoles,
  } = usePermissions();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrganization = async () => {
    if (!context?.organizationId) return;
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', context.organizationId)
      .single();
    setOrganization(data);
  };

  const fetchUsers = async () => {
    if (!context?.organizationId) return;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('current_organization_id', context.organizationId);

    if (!profiles) return;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('organization_id', context.organizationId)
      .eq('is_active', true);

    const usersWithRoles: UserWithRoles[] = profiles.map(p => ({
      ...p,
      roles: roles?.filter(r => r.user_id === p.id).map(r => r.role) || [],
    }));

    setUsers(usersWithRoles);
  };

  useEffect(() => {
    fetchOrganization();
    fetchUsers();
  }, [context?.organizationId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrganization();
    await fetchUsers();
    await refreshPermissions();
    setRefreshing(false);
  };

  const toggleRole = async (userId: string, role: string, currentlyHas: boolean) => {
    if (!context?.organizationId || !profile) return;

    if (currentlyHas) {
      await supabase
        .from('user_roles')
        .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_by: profile.id })
        .eq('user_id', userId)
        .eq('organization_id', context.organizationId)
        .eq('role', role);
    } else {
      await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          organization_id: context.organizationId,
          role: role,
          granted_by: profile.id,
          granted_at: new Date().toISOString(),
          is_active: true,
          revoked_at: null,
          revoked_by: null,
        }, { onConflict: 'organization_id,user_id,role' });
    }

    await fetchUsers();
    await refreshPermissions();
    setSelectedUser(prev => {
      if (!prev) return null;
      const updated = users.find(u => u.id === prev.id);
      return updated || prev;
    });
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleLabels: Record<string, string> = {
    league_admin: 'League Admin',
    head_coach: 'Head Coach',
    assistant_coach: 'Assistant Coach',
    parent: 'Parent',
    player: 'Player',
  };

  const roleColors: Record<string, string> = {
    league_admin: colors.danger,
    head_coach: colors.primary,
    assistant_coach: colors.info,
    parent: colors.success,
    player: colors.warning,
  };

  const devRoleOptions: { role: UserRole | null; label: string; icon: string }[] = [
    { role: null, label: 'Actual Roles', icon: 'person' },
    { role: 'league_admin', label: 'View as Admin', icon: 'shield' },
    { role: 'head_coach', label: 'View as Coach', icon: 'clipboard' },
    { role: 'assistant_coach', label: 'View as Assistant', icon: 'people' },
    { role: 'parent', label: 'View as Parent', icon: 'heart' },
    { role: 'player', label: 'View as Player', icon: 'basketball' },
  ];

  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={s.title}>Settings</Text>

        {/* Dev Mode Banner */}
        {devMode && devViewAs && (
          <View style={s.devBanner}>
            <Ionicons name="code-slash" size={18} color="#fff" />
            <Text style={s.devBannerText}>
              Viewing as: {roleLabels[devViewAs]}
            </Text>
            <TouchableOpacity onPress={() => setDevViewAs(null)}>
              <Text style={s.devBannerReset}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="person-circle" size={50} color={colors.primary} />
            <View style={s.profileInfo}>
              <Text style={s.profileName}>{profile?.full_name || 'User'}</Text>
              <Text style={s.profileEmail}>{profile?.email}</Text>
            </View>
          </View>
        </View>

        {/* Theme Selection */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Appearance</Text>
          <View style={s.themeOptions}>
            <TouchableOpacity
              style={[s.themeOption, mode === 'light' && s.themeOptionActive]}
              onPress={() => setTheme('light')}
            >
              <Ionicons name="sunny" size={24} color={mode === 'light' ? colors.primary : colors.textMuted} />
              <Text style={[s.themeOptionText, mode === 'light' && s.themeOptionTextActive]}>Light</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.themeOption, mode === 'dark' && s.themeOptionActive]}
              onPress={() => setTheme('dark')}
            >
              <Ionicons name="moon" size={24} color={mode === 'dark' ? colors.primary : colors.textMuted} />
              <Text style={[s.themeOptionText, mode === 'dark' && s.themeOptionTextActive]}>Dark</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dev Mode - Role Switcher */}
        {devMode && (
          <View style={[s.card, s.devCard]}>
            <View style={s.devHeader}>
              <Ionicons name="code-slash" size={20} color={colors.warning} />
              <Text style={s.devTitle}>Developer Mode</Text>
            </View>
            <Text style={s.devSubtitle}>
              Switch views to test different user experiences. Your actual roles: {actualRoles.length > 0 ? actualRoles.map(r => roleLabels[r]).join(', ') : 'None'}
            </Text>
            <View style={s.devRoleGrid}>
              {devRoleOptions.map(option => (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    s.devRoleBtn,
                    devViewAs === option.role && s.devRoleBtnActive,
                    option.role === null && devViewAs === null && s.devRoleBtnActive,
                  ]}
                  onPress={() => setDevViewAs(option.role)}
                >
                  <Ionicons 
                    name={option.icon as any} 
                    size={20} 
                    color={
                      (devViewAs === option.role || (option.role === null && devViewAs === null))
                        ? colors.warning 
                        : colors.textMuted
                    } 
                  />
                  <Text style={[
                    s.devRoleBtnText,
                    (devViewAs === option.role || (option.role === null && devViewAs === null)) && s.devRoleBtnTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Organization Info - Admin Only */}
        {isAdmin && organization && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Organization</Text>
            <View style={s.orgRow}>
              <View style={[s.orgColor, { backgroundColor: organization.primary_color }]} />
              <View>
                <Text style={s.orgName}>{organization.name}</Text>
                <Text style={s.orgSlug}>@{organization.slug}</Text>
              </View>
            </View>
            <View style={s.orgSettings}>
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Self-registration</Text>
                <Text style={[s.settingValue, { color: organization.allow_self_registration ? colors.success : colors.textMuted }]}>
                  {organization.allow_self_registration ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Registration open</Text>
                <Text style={[s.settingValue, { color: organization.registration_open ? colors.success : colors.textMuted }]}>
                  {organization.registration_open ? 'Open' : 'Closed'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* User Management - Admin Only */}
        {isAdmin && (
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <Text style={s.cardTitle}>User Management</Text>
              <Text style={s.userCount}>{users.length} users</Text>
            </View>

            <View style={s.searchBox}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={s.searchInput}
                placeholder="Search users..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {filteredUsers.slice(0, 10).map(user => (
              <TouchableOpacity
                key={user.id}
                style={s.userRow}
                onPress={() => { setSelectedUser(user); setShowUserModal(true); }}
              >
                <View style={s.userAvatar}>
                  <Text style={s.userInitials}>
                    {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                  </Text>
                </View>
                <View style={s.userInfo}>
                  <Text style={s.userName}>{user.full_name || 'No name'}</Text>
                  <Text style={s.userEmail}>{user.email}</Text>
                </View>
                <View style={s.userRoles}>
                  {user.roles.slice(0, 2).map(role => (
                    <View key={role} style={[s.roleBadge, { backgroundColor: roleColors[role] + '20' }]}>
                      <Text style={[s.roleBadgeText, { color: roleColors[role] }]}>
                        {role === 'league_admin' ? 'Admin' : role === 'head_coach' ? 'Coach' : role}
                      </Text>
                    </View>
                  ))}
                  {user.roles.length > 2 && (
                    <Text style={s.moreRoles}>+{user.roles.length - 2}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}

            {filteredUsers.length > 10 && (
              <Text style={s.moreUsers}>And {filteredUsers.length - 10} more users...</Text>
            )}
          </View>
        )}

        {/* Your Roles */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Your Roles</Text>
          {context?.roles.length === 0 ? (
            <Text style={s.noRoles}>No roles assigned</Text>
          ) : (
            <View style={s.rolesGrid}>
              {context?.roles.map(role => (
                <View key={role} style={[s.roleChip, { backgroundColor: roleColors[role] + '20' }]}>
                  <Text style={[s.roleChipText, { color: roleColors[role] }]}>{roleLabels[role]}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Legal */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Legal</Text>
          <TouchableOpacity style={s.legalRow} onPress={() => router.push('/privacy-policy')}>
            <View style={s.legalIconWrap}>
              <Ionicons name="shield-checkmark" size={20} color={colors.text} />
            </View>
            <Text style={s.legalRowText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.legalRow} onPress={() => router.push('/terms-of-service')}>
            <View style={s.legalIconWrap}>
              <Ionicons name="document" size={20} color={colors.text} />
            </View>
            <Text style={s.legalRowText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* User Role Modal */}
      <Modal visible={showUserModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Manage Roles</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <>
                <View style={s.modalUserInfo}>
                  <View style={s.modalAvatar}>
                    <Text style={s.modalInitials}>
                      {selectedUser.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                    </Text>
                  </View>
                  <View>
                    <Text style={s.modalUserName}>{selectedUser.full_name || 'No name'}</Text>
                    <Text style={s.modalUserEmail}>{selectedUser.email}</Text>
                  </View>
                </View>

                <Text style={s.rolesLabel}>Roles</Text>
                {Object.entries(roleLabels).map(([role, label]) => {
                  const hasRole = selectedUser.roles.includes(role);
                  const isSelf = selectedUser.id === profile?.id && role === 'league_admin';

                  return (
                    <TouchableOpacity
                      key={role}
                      style={[s.roleOption, hasRole && s.roleOptionActive]}
                      onPress={() => !isSelf && toggleRole(selectedUser.id, role, hasRole)}
                      disabled={isSelf}
                    >
                      <View style={[s.roleIndicator, { backgroundColor: roleColors[role] }]} />
                      <Text style={s.roleOptionLabel}>{label}</Text>
                      {hasRole ? (
                        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={24} color={colors.textMuted} />
                      )}
                      {isSelf && <Text style={s.selfNote}>(You)</Text>}
                    </TouchableOpacity>
                  );
                })}

                <Text style={s.roleHint}>
                  Tap a role to toggle it on or off. Users can have multiple roles.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 20 },

  devBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f59e0b', padding: 12, borderRadius: 12, marginBottom: 16, gap: 8 },
  devBannerText: { flex: 1, color: '#fff', fontWeight: '600' },
  devBannerReset: { color: '#fff', fontWeight: 'bold', textDecorationLine: 'underline' },

  card: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },

  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  profileEmail: { fontSize: 14, color: colors.textMuted, marginTop: 2 },

  themeOptions: { flexDirection: 'row', gap: 12 },
  themeOption: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: colors.background },
  themeOptionActive: { backgroundColor: colors.primary + '20', borderWidth: 2, borderColor: colors.primary },
  themeOptionText: { marginTop: 8, fontSize: 14, color: colors.textMuted },
  themeOptionTextActive: { color: colors.primary, fontWeight: '600' },

  devCard: { borderWidth: 2, borderColor: colors.warning, borderStyle: 'dashed', backgroundColor: colors.glassCard },
  devHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  devTitle: { fontSize: 16, fontWeight: 'bold', color: colors.warning },
  devSubtitle: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
  devRoleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  devRoleBtn: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: colors.background },
  devRoleBtnActive: { backgroundColor: colors.warning + '20', borderWidth: 1, borderColor: colors.warning },
  devRoleBtnText: { fontSize: 12, color: colors.textMuted },
  devRoleBtnTextActive: { color: colors.warning, fontWeight: '600' },

  orgRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  orgColor: { width: 40, height: 40, borderRadius: 8 },
  orgName: { fontSize: 16, fontWeight: '600', color: colors.text },
  orgSlug: { fontSize: 13, color: colors.textMuted },
  orgSettings: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 4 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  settingLabel: { fontSize: 14, color: colors.textMuted },
  settingValue: { fontSize: 14, fontWeight: '500' },

  userCount: { fontSize: 14, color: colors.textMuted },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 16, color: colors.text },

  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userInitials: { fontSize: 14, fontWeight: 'bold', color: colors.primary },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '500', color: colors.text },
  userEmail: { fontSize: 12, color: colors.textMuted },
  userRoles: { flexDirection: 'row', gap: 4, marginRight: 8 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleBadgeText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  moreRoles: { fontSize: 11, color: colors.textMuted, alignSelf: 'center' },
  moreUsers: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: 12 },

  noRoles: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  roleChipText: { fontSize: 13, fontWeight: '600' },

  legalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  legalIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.glassCard, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  legalRowText: { flex: 1, fontSize: 15, color: colors.text },

  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: colors.glassBorder },
  signOutText: { fontSize: 16, color: colors.danger, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },

  modalUserInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  modalInitials: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  modalUserName: { fontSize: 18, fontWeight: '600', color: colors.text },
  modalUserEmail: { fontSize: 14, color: colors.textMuted },

  rolesLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 12 },
  roleOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 8, backgroundColor: colors.background },
  roleOptionActive: { backgroundColor: colors.success + '10' },
  roleIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  roleOptionLabel: { flex: 1, fontSize: 16, color: colors.text },
  selfNote: { fontSize: 12, color: colors.textMuted, marginLeft: 8 },
  roleHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 16 },
});