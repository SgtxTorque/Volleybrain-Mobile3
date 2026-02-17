import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserRole = 'league_admin' | 'head_coach' | 'assistant_coach' | 'parent' | 'player';

type UserWithRole = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  pending_approval: boolean;
  created_at: string;
  roles: {
    id: string;
    role: UserRole;
    is_active: boolean;
  }[];
};

type FilterType = 'all' | 'admin' | 'coach' | 'parent' | 'pending';

export default function UsersScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserWithRole[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // User detail modal
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', 'black-hornets')
        .single();

      if (!org) return;

      // Fetch all profiles with their roles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          avatar_url,
          pending_approval,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roles for all users in this org
      const { data: roles } = await supabase
        .from('user_roles')
        .select('id, user_id, role, is_active')
        .eq('organization_id', org.id);

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        ...profile,
        roles: (roles || [])
          .filter(r => r.user_id === profile.id)
          .map(r => ({ id: r.id, role: r.role as UserRole, is_active: r.is_active })),
      }));

      // Separate pending users
      const pending = usersWithRoles.filter(u => u.pending_approval);
      const approved = usersWithRoles.filter(u => !u.pending_approval);

      setPendingUsers(pending);
      setUsers(approved);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const approveUser = async (user: UserWithRole) => {
    Alert.alert(
      'Approve Registration',
      'Approve ' + user.full_name + '? They will get full access to the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              // Update profile
              await supabase
                .from('profiles')
                .update({ pending_approval: false, onboarding_complete: true })
                .eq('id', user.id);

              // Activate their role(s)
              if (user.roles.length > 0) {
                await supabase
                  .from('user_roles')
                  .update({ is_active: true })
                  .eq('user_id', user.id);
              }

              // Update any pending player registrations
              await supabase
                .from('players')
                .update({ registration_status: 'registered' })
                .eq('parent_email', user.email)
                .eq('registration_status', 'pending');

              // Update any pending coach records
              await supabase
                .from('coaches')
                .update({ status: 'active' })
                .eq('user_id', user.id)
                .eq('status', 'pending');

              Alert.alert('Approved!', user.full_name + ' has been approved.');
              fetchUsers();
            } catch (error) {
              console.error('Approve error:', error);
              Alert.alert('Error', 'Failed to approve user');
            }
          },
        },
      ]
    );
  };

  const rejectUser = async (user: UserWithRole) => {
    Alert.alert(
      'Reject Registration',
      'Reject ' + user.full_name + '? This will delete their account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete their roles
              await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', user.id);

              // Delete any player registrations linked to their email
              await supabase
                .from('players')
                .delete()
                .eq('parent_email', user.email)
                .eq('registration_status', 'pending');

              // Delete any coach records
              await supabase
                .from('coaches')
                .delete()
                .eq('user_id', user.id);

              // Delete the profile (this should cascade or the auth user will be orphaned)
              await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);

              Alert.alert('Rejected', 'Registration has been rejected.');
              fetchUsers();
            } catch (error) {
              console.error('Reject error:', error);
              Alert.alert('Error', 'Failed to reject user');
            }
          },
        },
      ]
    );
  };

  const updateUserRole = async (user: UserWithRole, newRole: UserRole) => {
    setUpdatingUser(true);
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', 'black-hornets')
        .single();

      if (!org) throw new Error('Organization not found');

      // Check if user already has this role
      const existingRole = user.roles.find(r => r.role === newRole);
      
      if (existingRole) {
        // Toggle active status
        await supabase
          .from('user_roles')
          .update({ is_active: !existingRole.is_active })
          .eq('id', existingRole.id);
      } else {
        // Add new role
        await supabase.from('user_roles').insert({
          organization_id: org.id,
          user_id: user.id,
          role: newRole,
          is_active: true,
        });
      }

      Alert.alert('Updated', 'User role has been updated.');
      fetchUsers();
      setShowUserModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Update role error:', error);
      Alert.alert('Error', 'Failed to update role');
    } finally {
      setUpdatingUser(false);
    }
  };

  const removeRole = async (user: UserWithRole, roleId: string) => {
    Alert.alert('Remove Role', 'Remove this role from ' + user.full_name + '?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('user_roles').delete().eq('id', roleId);
            Alert.alert('Removed', 'Role has been removed.');
            fetchUsers();
            setShowUserModal(false);
            setSelectedUser(null);
          } catch (error) {
            console.error('Remove role error:', error);
            Alert.alert('Error', 'Failed to remove role');
          }
        },
      },
    ]);
  };

  const getRoleIcon = (role: UserRole): string => {
    switch (role) {
      case 'league_admin': return 'shield';
      case 'head_coach': return 'clipboard';
      case 'assistant_coach': return 'clipboard-outline';
      case 'parent': return 'people';
      case 'player': return 'person';
      default: return 'person';
    }
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case 'league_admin': return colors.danger;
      case 'head_coach': return colors.info;
      case 'assistant_coach': return colors.info;
      case 'parent': return colors.success;
      case 'player': return colors.warning;
      default: return colors.textMuted;
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'league_admin': return 'Admin';
      case 'head_coach': return 'Head Coach';
      case 'assistant_coach': return 'Asst Coach';
      case 'parent': return 'Parent';
      case 'player': return 'Player';
      default: return role;
    }
  };

  const getPrimaryRole = (user: UserWithRole): UserRole | null => {
    const activeRoles = user.roles.filter(r => r.is_active);
    if (activeRoles.length === 0) return null;
    
    // Priority: admin > coach > parent > player
    const priority: UserRole[] = ['league_admin', 'head_coach', 'assistant_coach', 'parent', 'player'];
    for (const role of priority) {
      if (activeRoles.some(r => r.role === role)) return role;
    }
    return activeRoles[0].role;
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return diffMins + 'm ago';
    if (diffHours < 24) return diffHours + 'h ago';
    if (diffDays < 7) return diffDays + 'd ago';
    return date.toLocaleDateString();
  };

  const filteredUsers = users.filter(user => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!user.full_name?.toLowerCase().includes(query) && 
          !user.email?.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Role filter
    if (filter === 'all') return true;
    if (filter === 'pending') return user.pending_approval;
    if (filter === 'admin') return user.roles.some(r => r.role === 'league_admin' && r.is_active);
    if (filter === 'coach') return user.roles.some(r => (r.role === 'head_coach' || r.role === 'assistant_coach') && r.is_active);
    if (filter === 'parent') return user.roles.some(r => r.role === 'parent' && r.is_active);
    
    return true;
  });

  const s = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>User Management</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Pending Approvals Section */}
        {pendingUsers.length > 0 && (
          <View style={s.pendingSection}>
            <View style={s.pendingSectionHeader}>
              <View style={s.pendingBadge}>
                <Ionicons name="time" size={18} color={colors.warning} />
                <Text style={s.pendingSectionTitle}>Pending Approval</Text>
                <View style={s.pendingCount}>
                  <Text style={s.pendingCountText}>{pendingUsers.length}</Text>
                </View>
              </View>
            </View>

            {pendingUsers.map(user => {
              const primaryRole = getPrimaryRole(user);
              return (
                <View key={user.id} style={s.pendingCard}>
                  <View style={s.pendingCardHeader}>
                    <View style={s.userAvatar}>
                      <Text style={s.userAvatarText}>
                        {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={s.userInfo}>
                      <Text style={s.userName}>{user.full_name || 'Unknown'}</Text>
                      <Text style={s.userEmail}>{user.email}</Text>
                      <View style={s.userMeta}>
                        {primaryRole && (
                          <View style={[s.roleBadge, { backgroundColor: getRoleColor(primaryRole) + '20' }]}>
                            <Ionicons name={getRoleIcon(primaryRole) as any} size={12} color={getRoleColor(primaryRole)} />
                            <Text style={[s.roleBadgeText, { color: getRoleColor(primaryRole) }]}>
                              {getRoleLabel(primaryRole)}
                            </Text>
                          </View>
                        )}
                        <Text style={s.userTime}>Registered {getTimeAgo(user.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={s.pendingActions}>
                    <TouchableOpacity
                      style={[s.actionBtn, s.approveBtn]}
                      onPress={() => approveUser(user)}
                    >
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={s.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, s.rejectBtn]}
                      onPress={() => rejectUser(user)}
                    >
                      <Ionicons name="close" size={18} color={colors.danger} />
                      <Text style={s.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Search & Filter */}
        <View style={s.searchSection}>
          <View style={s.searchContainer}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={s.searchInput}
              placeholder="Search users..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
            {(['all', 'admin', 'coach', 'parent'] as FilterType[]).map(f => (
              <TouchableOpacity
                key={f}
                style={[s.filterChip, filter === f && s.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[s.filterChipText, filter === f && s.filterChipTextActive]}>
                  {f === 'all' ? 'All Users' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* All Users Section */}
        <View style={s.usersSection}>
          <Text style={s.sectionTitle}>
            {filter === 'all' ? 'All Users' : filter.charAt(0).toUpperCase() + filter.slice(1) + 's'} ({filteredUsers.length})
          </Text>

          {filteredUsers.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={s.emptyStateText}>No users found</Text>
            </View>
          ) : (
            filteredUsers.map(user => {
              const primaryRole = getPrimaryRole(user);
              return (
                <TouchableOpacity
                  key={user.id}
                  style={s.userCard}
                  onPress={() => {
                    setSelectedUser(user);
                    setShowUserModal(true);
                  }}
                >
                  <View style={s.userAvatar}>
                    <Text style={s.userAvatarText}>
                      {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={s.userInfo}>
                    <Text style={s.userName}>{user.full_name || 'Unknown'}</Text>
                    <Text style={s.userEmail}>{user.email}</Text>
                  </View>
                  {primaryRole && (
                    <View style={[s.roleBadgeSmall, { backgroundColor: getRoleColor(primaryRole) + '20' }]}>
                      <Ionicons name={getRoleIcon(primaryRole) as any} size={14} color={getRoleColor(primaryRole)} />
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* User Detail Modal */}
      <Modal visible={showUserModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => { setShowUserModal(false); setSelectedUser(null); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView style={s.modalScroll}>
                {/* User Info */}
                <View style={s.modalUserHeader}>
                  <View style={s.modalAvatar}>
                    <Text style={s.modalAvatarText}>
                      {selectedUser.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={s.modalUserName}>{selectedUser.full_name || 'Unknown'}</Text>
                  <Text style={s.modalUserEmail}>{selectedUser.email}</Text>
                  {selectedUser.phone && (
                    <Text style={s.modalUserPhone}>{selectedUser.phone}</Text>
                  )}
                </View>

                {/* Current Roles */}
                <Text style={s.modalSectionTitle}>Current Roles</Text>
                {selectedUser.roles.length === 0 ? (
                  <Text style={s.noRolesText}>No roles assigned</Text>
                ) : (
                  selectedUser.roles.map(role => (
                    <View key={role.id} style={s.roleRow}>
                      <View style={[s.roleBadgeLarge, { backgroundColor: getRoleColor(role.role) + '20' }]}>
                        <Ionicons name={getRoleIcon(role.role) as any} size={18} color={getRoleColor(role.role)} />
                        <Text style={[s.roleBadgeLargeText, { color: getRoleColor(role.role) }]}>
                          {getRoleLabel(role.role)}
                        </Text>
                      </View>
                      <View style={s.roleActions}>
                        <View style={[s.activeIndicator, { backgroundColor: role.is_active ? colors.success : colors.textMuted }]}>
                          <Text style={s.activeIndicatorText}>{role.is_active ? 'Active' : 'Inactive'}</Text>
                        </View>
                        {selectedUser.id !== profile?.id && (
                          <TouchableOpacity onPress={() => removeRole(selectedUser, role.id)}>
                            <Ionicons name="trash-outline" size={20} color={colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}

                {/* Add Role */}
                {selectedUser.id !== profile?.id && (
                  <>
                    <Text style={s.modalSectionTitle}>Add Role</Text>
                    <View style={s.addRoleGrid}>
                      {(['parent', 'head_coach', 'assistant_coach', 'league_admin'] as UserRole[]).map(role => {
                        const hasRole = selectedUser.roles.some(r => r.role === role);
                        return (
                          <TouchableOpacity
                            key={role}
                            style={[s.addRoleBtn, hasRole && s.addRoleBtnDisabled]}
                            onPress={() => !hasRole && updateUserRole(selectedUser, role)}
                            disabled={hasRole || updatingUser}
                          >
                            <Ionicons name={getRoleIcon(role) as any} size={20} color={hasRole ? colors.textMuted : getRoleColor(role)} />
                            <Text style={[s.addRoleBtnText, hasRole && { color: colors.textMuted }]}>
                              {getRoleLabel(role)}
                            </Text>
                            {hasRole && (
                              <Ionicons name="checkmark" size={16} color={colors.textMuted} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Metadata */}
                <View style={s.metadataSection}>
                  <View style={s.metadataRow}>
                    <Text style={s.metadataLabel}>Joined</Text>
                    <Text style={s.metadataValue}>{new Date(selectedUser.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={s.metadataRow}>
                    <Text style={s.metadataLabel}>User ID</Text>
                    <Text style={s.metadataValue}>{selectedUser.id.slice(0, 8)}...</Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: colors.textMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },

  // Pending Section
  pendingSection: { margin: 16, marginBottom: 8 },
  pendingSectionHeader: { marginBottom: 12 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingSectionTitle: { fontSize: 16, fontWeight: '600', color: colors.warning },
  pendingCount: { backgroundColor: colors.warning, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  pendingCountText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  pendingCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: colors.warning },
  pendingCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pendingActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  approveBtn: { backgroundColor: colors.success },
  approveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  rejectBtn: { backgroundColor: colors.danger + '20' },
  rejectBtnText: { fontSize: 14, fontWeight: '600', color: colors.danger },

  // User Card Common
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + '30', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userAvatarText: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: colors.text },
  userEmail: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  userTime: { fontSize: 12, color: colors.textMuted },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  roleBadgeSmall: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },

  // Search & Filter
  searchSection: { padding: 16, paddingTop: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.text, marginLeft: 8 },
  filterScroll: { flexGrow: 0 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.card, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  filterChipText: { fontSize: 14, color: colors.textMuted },
  filterChipTextActive: { color: colors.primary, fontWeight: '600' },

  // Users Section
  usersSection: { padding: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 12, letterSpacing: 0.5 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 8 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyStateText: { marginTop: 12, fontSize: 16, color: colors.textMuted },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  modalScroll: { padding: 20 },
  modalUserHeader: { alignItems: 'center', marginBottom: 24 },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '30', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalAvatarText: { fontSize: 32, fontWeight: 'bold', color: colors.primary },
  modalUserName: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  modalUserEmail: { fontSize: 15, color: colors.textMuted, marginTop: 4 },
  modalUserPhone: { fontSize: 15, color: colors.textMuted, marginTop: 2 },
  modalSectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginTop: 16, marginBottom: 12, letterSpacing: 0.5 },
  noRolesText: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  roleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, padding: 12, borderRadius: 10, marginBottom: 8 },
  roleBadgeLarge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  roleBadgeLargeText: { fontSize: 14, fontWeight: '600' },
  roleActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeIndicator: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  activeIndicatorText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  addRoleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addRoleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  addRoleBtnDisabled: { opacity: 0.5 },
  addRoleBtnText: { fontSize: 13, fontWeight: '500', color: colors.text },
  metadataSection: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  metadataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  metadataLabel: { fontSize: 14, color: colors.textMuted },
  metadataValue: { fontSize: 14, color: colors.text },
});
