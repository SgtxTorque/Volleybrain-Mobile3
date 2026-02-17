import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { AccentColor, accentColors, useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  iconColor?: string;
  iconBg?: string;
};

export default function MeScreen() {
  const { colors, mode, toggleTheme, accentColor, changeAccent, isDark } = useTheme();
  const { isAdmin, isCoach, isParent, isPlayer, actualRoles, primaryRole } = usePermissions();
  const { user, profile, organization, signOut } = useAuth();
  const router = useRouter();

  const s = createStyles(colors, isDark);

  // User display info
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Role labels and colors
  const roleLabels: Record<string, string> = {
    league_admin: 'Admin',
    head_coach: 'Head Coach',
    assistant_coach: 'Asst Coach',
    parent: 'Parent',
    player: 'Player',
  };

  const roleBadgeColors: Record<string, string> = {
    league_admin: colors.danger,
    head_coach: colors.primary,
    assistant_coach: colors.info,
    parent: colors.success,
    player: colors.warning,
  };

  // Role-specific subtitle
  const getRoleSubtitle = (): string | null => {
    return null;
  };

  // Quick actions
  const quickActions: { icon: keyof typeof Ionicons.glyphMap; label: string; route: string; color: string }[] = [
    { icon: 'person-circle', label: 'My Profile', route: '/profile', color: colors.info },
    { icon: 'ribbon', label: 'Achievements', route: '/achievements', color: colors.warning },
    { icon: 'notifications', label: 'Notifications', route: '/notification-preferences', color: colors.success },
    { icon: 'color-palette', label: 'Wallpaper', route: '/background-picker', color: colors.primary },
  ];

  // Admin menu items
  const adminItems: MenuItem[] = [
    { icon: 'person-add', label: 'Registration Hub', route: '/registration-hub', iconColor: colors.primary, iconBg: colors.primary + '15' },
    { icon: 'people', label: 'Players', route: '/(tabs)/players', iconColor: colors.info, iconBg: colors.info + '15' },
    { icon: 'shirt', label: 'Teams', route: '/(tabs)/teams', iconColor: colors.success, iconBg: colors.success + '15' },
    { icon: 'clipboard', label: 'Coaches', route: '/(tabs)/coaches', iconColor: colors.warning, iconBg: colors.warning + '15' },
    { icon: 'card', label: 'Payments', route: '/(tabs)/payments', iconColor: colors.danger, iconBg: colors.danger + '15' },
    { icon: 'bar-chart', label: 'Reports', route: '/(tabs)/reports-tab', iconColor: colors.info, iconBg: colors.info + '15' },
    { icon: 'people-circle', label: 'Users', route: '/users', iconColor: colors.primary, iconBg: colors.primary + '15' },
    { icon: 'shirt-outline', label: 'Jersey Management', route: '/(tabs)/jersey-management', iconColor: colors.success, iconBg: colors.success + '15' },
    { icon: 'megaphone', label: 'Send Announcement', route: '/blast-composer', iconColor: colors.warning, iconBg: colors.warning + '15' },
    { icon: 'checkmark-circle', label: 'Attendance', route: '/attendance', iconColor: colors.info, iconBg: colors.info + '15' },
    { icon: 'analytics', label: 'Game Prep', route: '/game-prep', iconColor: colors.primary, iconBg: colors.primary + '15' },
    { icon: 'grid', label: 'Lineup Builder', route: '/lineup-builder', iconColor: colors.success, iconBg: colors.success + '15' },
    { icon: 'calendar-outline', label: 'Coach Availability', route: '/coach-availability', iconColor: colors.warning, iconBg: colors.warning + '15' },
  ];

  // Coach (non-admin) menu items
  const coachItems: MenuItem[] = [
    { icon: 'person-circle', label: 'My Coach Profile', route: '/coach-profile', iconColor: colors.primary, iconBg: colors.primary + '15' },
    { icon: 'people', label: 'Roster', route: '/(tabs)/players', iconColor: colors.info, iconBg: colors.info + '15' },
    { icon: 'shirt', label: 'My Teams', route: '/(tabs)/my-teams', iconColor: colors.success, iconBg: colors.success + '15' },
    { icon: 'calendar-outline', label: 'My Availability', route: '/coach-availability', iconColor: colors.warning, iconBg: colors.warning + '15' },
    { icon: 'checkmark-circle', label: 'Attendance', route: '/attendance', iconColor: colors.info, iconBg: colors.info + '15' },
    { icon: 'analytics', label: 'Game Prep', route: '/game-prep', iconColor: colors.primary, iconBg: colors.primary + '15' },
    { icon: 'grid', label: 'Lineup Builder', route: '/lineup-builder', iconColor: colors.success, iconBg: colors.success + '15' },
    { icon: 'megaphone', label: 'Send Announcement', route: '/blast-composer', iconColor: colors.warning, iconBg: colors.warning + '15' },
  ];

  // Parent menu items
  const parentItems: MenuItem[] = [
    { icon: 'people', label: 'My Kids', route: '/my-kids', iconColor: colors.primary, iconBg: colors.primary + '15' },
    { icon: 'shirt', label: 'My Teams', route: '/(tabs)/my-teams', iconColor: colors.success, iconBg: colors.success + '15' },
    { icon: 'wallet', label: 'Payments', route: '/family-payments', iconColor: colors.warning, iconBg: colors.warning + '15' },
    { icon: 'document-text', label: 'Waivers', route: '/my-waivers', iconColor: colors.info, iconBg: colors.info + '15' },
    { icon: 'share-social', label: 'Invite Friends', route: '/invite-friends', iconColor: colors.primary, iconBg: colors.primary + '15' },
    { icon: 'lock-closed', label: 'Data Rights', route: '/data-rights', iconColor: colors.danger, iconBg: colors.danger + '15' },
  ];

  // Player-only menu items
  const playerItems: MenuItem[] = [
    { icon: 'calendar', label: 'Schedule', route: '/(tabs)/gameday', iconColor: colors.primary, iconBg: colors.primary + '15' },
    { icon: 'shirt', label: 'My Teams', route: '/(tabs)/my-teams', iconColor: colors.success, iconBg: colors.success + '15' },
    { icon: 'ribbon', label: 'Achievements', route: '/achievements', iconColor: colors.warning, iconBg: colors.warning + '15' },
    { icon: 'trophy', label: 'Standings', route: '/standings', iconColor: colors.info, iconBg: colors.info + '15' },
  ];

  // Settings items
  const settingsItems: MenuItem[] = [
    { icon: 'settings', label: 'Settings', route: '/(tabs)/settings', iconColor: colors.textSecondary, iconBg: colors.textMuted + '15' },
    { icon: 'calendar', label: 'Season Settings', route: '/season-settings', iconColor: colors.primary, iconBg: colors.primary + '15' },
    { icon: 'archive', label: 'Season History', route: '/season-archives', iconColor: colors.info, iconBg: colors.info + '15' },
    { icon: 'business', label: 'Find Organizations', route: '/org-directory', iconColor: colors.success, iconBg: colors.success + '15' },
    { icon: 'help-circle', label: 'Help & Support', route: '/help', iconColor: colors.warning, iconBg: colors.warning + '15' },
  ];

  // Legal items
  const legalItems: MenuItem[] = [
    { icon: 'shield-checkmark', label: 'Privacy Policy', route: '/privacy-policy', iconColor: colors.textSecondary, iconBg: colors.textMuted + '15' },
    { icon: 'document', label: 'Terms of Service', route: '/terms-of-service', iconColor: colors.textSecondary, iconBg: colors.textMuted + '15' },
    { icon: 'lock-closed', label: 'Data Rights', route: '/data-rights', iconColor: colors.textSecondary, iconBg: colors.textMuted + '15' },
  ];

  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const renderMenuItem = (item: MenuItem, index: number) => (
    <TouchableOpacity
      key={`${item.route}-${index}`}
      style={s.menuItem}
      onPress={() => handleNavigate(item.route)}
      activeOpacity={0.7}
    >
      <View style={[s.menuItemIcon, { backgroundColor: item.iconBg || colors.glassCard }]}>
        <Ionicons name={item.icon} size={20} color={item.iconColor || colors.text} />
      </View>
      <Text style={s.menuItemLabel}>{item.label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const accentColorKeys: AccentColor[] = ['orange', 'blue', 'purple', 'green', 'rose', 'slate'];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== PROFILE HERO SECTION ===== */}
        <View style={s.heroCard}>
          <View style={s.avatarContainer}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{userInitials}</Text>
            </View>
          </View>

          <Text style={s.heroName}>{userName}</Text>

          {/* Role badges */}
          <View style={s.roleBadgesRow}>
            {actualRoles.map((role) => (
              <View
                key={role}
                style={[
                  s.roleBadge,
                  { backgroundColor: (roleBadgeColors[role] || colors.textMuted) + '20' },
                ]}
              >
                <Text
                  style={[
                    s.roleBadgeText,
                    { color: roleBadgeColors[role] || colors.textMuted },
                  ]}
                >
                  {roleLabels[role] || role}
                </Text>
              </View>
            ))}
          </View>

          {/* Role-specific subtitle */}
          {getRoleSubtitle() && (
            <Text style={s.heroSubtitle}>{getRoleSubtitle()}</Text>
          )}

          {/* Organization */}
          {organization?.name && (
            <Text style={s.heroOrg}>{organization.name}</Text>
          )}
        </View>

        {/* ===== QUICK ACTIONS ===== */}
        <Text style={s.sectionHeader}>QUICK ACTIONS</Text>
        <View style={s.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={action.route}
              style={s.quickActionCard}
              onPress={() => handleNavigate(action.route)}
              activeOpacity={0.7}
            >
              <View style={[s.quickActionIconWrap, { backgroundColor: action.color + '15' }]}>
                <Ionicons name={action.icon} size={28} color={action.color} />
              </View>
              <Text style={s.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ===== ROLE-SPECIFIC SECTION ===== */}
        {isAdmin && (
          <>
            <Text style={s.sectionHeader}>ORGANIZATION TOOLS</Text>
            <View style={s.menuCard}>
              {adminItems.map((item, i) => renderMenuItem(item, i))}
            </View>
          </>
        )}

        {isCoach && !isAdmin && (
          <>
            <Text style={s.sectionHeader}>MY COACHING</Text>
            <View style={s.menuCard}>
              {coachItems.map((item, i) => renderMenuItem(item, i))}
            </View>
          </>
        )}

        {isParent && (
          <>
            <Text style={s.sectionHeader}>MY FAMILY</Text>
            <View style={s.menuCard}>
              {parentItems.map((item, i) => renderMenuItem(item, i))}
            </View>
          </>
        )}

        {isPlayer && !isAdmin && !isCoach && !isParent && (
          <>
            <Text style={s.sectionHeader}>MY STUFF</Text>
            <View style={s.menuCard}>
              {playerItems.map((item, i) => renderMenuItem(item, i))}
            </View>
          </>
        )}

        {/* ===== LEAGUE SECTION ===== */}
        <Text style={s.sectionHeader}>LEAGUE</Text>
        <View style={s.menuCard}>
          {[
            { icon: 'chatbubbles' as keyof typeof Ionicons.glyphMap, label: 'Team Wall', route: '/team-wall', iconColor: colors.primary, iconBg: colors.primary + '15' },
            { icon: 'trophy' as keyof typeof Ionicons.glyphMap, label: 'Standings', route: '/standings', iconColor: colors.warning, iconBg: colors.warning + '15' },
          ].map((item, i) => renderMenuItem(item, i))}
        </View>

        {/* ===== SETTINGS SECTION ===== */}
        <Text style={s.sectionHeader}>SETTINGS</Text>
        <View style={s.menuCard}>
          {/* Theme toggle */}
          <View style={s.themeRow}>
            <View style={[s.menuItemIcon, { backgroundColor: colors.warning + '15' }]}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={20}
                color={colors.warning}
              />
            </View>
            <Text style={s.menuItemLabel}>Dark Mode</Text>
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
            <View style={[s.menuItemIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="color-fill" size={20} color={colors.primary} />
            </View>
            <Text style={[s.menuItemLabel, { flex: 0, marginRight: 12 }]}>Accent Color</Text>
            <View style={s.accentCircles}>
              {accentColorKeys.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    s.accentCircle,
                    { backgroundColor: accentColors[key].primary },
                    accentColor === key && s.accentCircleSelected,
                  ]}
                  onPress={() => changeAccent(key)}
                  activeOpacity={0.7}
                >
                  {accentColor === key && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Other settings items */}
          {settingsItems.map((item, i) => renderMenuItem(item, i))}
        </View>

        {/* ===== LEGAL SECTION ===== */}
        <Text style={s.sectionHeader}>LEGAL</Text>
        <View style={s.menuCard}>
          {legalItems.map((item, i) => renderMenuItem(item, i))}
        </View>

        {/* ===== SIGN OUT ===== */}
        <TouchableOpacity
          style={s.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version footer */}
        <Text style={s.versionText}>VolleyBrain v1.0.0</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },

    // ===== PROFILE HERO =====
    heroCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      marginBottom: 8,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    avatarContainer: {
      marginBottom: 16,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    avatarText: {
      fontSize: 28,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    heroName: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
    },
    roleBadgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 6,
      marginBottom: 8,
    },
    roleBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    roleBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    heroSubtitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 4,
    },
    heroOrg: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
    },

    // ===== SECTION HEADERS =====
    sectionHeader: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginTop: 28,
      marginBottom: 12,
      marginLeft: 4,
    },

    // ===== QUICK ACTIONS =====
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    quickActionCard: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 20,
      padding: 16,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    quickActionIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    quickActionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },

    // ===== MENU CARD =====
    menuCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 20,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    menuItemLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },

    // ===== THEME TOGGLE =====
    themeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    // ===== ACCENT COLOR PICKER =====
    accentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
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
    accentCircleSelected: {
      borderWidth: 2,
      borderColor: '#fff',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        android: {
          elevation: 4,
        },
      }),
    },

    // ===== SIGN OUT =====
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.danger + '15',
      borderRadius: 16,
      padding: 16,
      marginTop: 28,
    },
    signOutText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.danger,
    },

    // ===== VERSION =====
    versionText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 16,
    },
  });
