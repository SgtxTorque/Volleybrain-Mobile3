import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { AccentColor, accentColors, useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  iconColor?: string;
  iconBg?: string;
};

// =============================================================================
// COLLAPSIBLE SECTION COMPONENT
// =============================================================================

type CollapsibleSectionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  colors: any;
};

function CollapsibleSection({ title, children, defaultOpen = true, colors }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const rotateAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      toValue: isOpen ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  }, [isOpen, rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={{ marginTop: 28 }}>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          marginLeft: 4,
          marginRight: 4,
        }}
        onPress={toggle}
        activeOpacity={0.7}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {title}
        </Text>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Animated.View>
      </TouchableOpacity>
      {isOpen && children}
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

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

  // =========================================================================
  // SECTION 1: PERSONAL (always visible for all roles)
  // =========================================================================
  const personalItems: MenuItem[] = [
    { icon: 'person-circle', label: 'Profile', route: '/profile', iconColor: colors.info, iconBg: colors.info + '15' },
    { icon: 'notifications', label: 'Notification Preferences', route: '/notification-preferences', iconColor: colors.success, iconBg: colors.success + '15' },
    { icon: 'color-palette', label: 'Wallpaper', route: '/background-picker', iconColor: colors.primary, iconBg: colors.primary + '15' },
    { icon: 'shield-checkmark', label: 'Privacy Policy', route: '/privacy-policy', iconColor: colors.textSecondary, iconBg: colors.textMuted + '15' },
    { icon: 'document', label: 'Terms of Service', route: '/terms-of-service', iconColor: colors.textSecondary, iconBg: colors.textMuted + '15' },
    { icon: 'help-circle', label: 'Help & Support', route: '/help', iconColor: colors.warning, iconBg: colors.warning + '15' },
  ];

  // =========================================================================
  // SECTION 2: MY STUFF (role-specific shortcuts)
  // =========================================================================
  const getMyStuffItems = (): MenuItem[] => {
    if (isAdmin) {
      // Admin: Season Management, Reports, User Management
      return [
        { icon: 'calendar', label: 'Season Management', route: '/season-settings', iconColor: colors.primary, iconBg: colors.primary + '15' },
        { icon: 'bar-chart', label: 'Reports', route: '/(tabs)/reports-tab', iconColor: colors.info, iconBg: colors.info + '15' },
        { icon: 'people-circle', label: 'User Management', route: '/users', iconColor: colors.success, iconBg: colors.success + '15' },
      ];
    }
    if (isCoach) {
      // Coach: My Teams, Roster, Schedule, Availability
      return [
        { icon: 'shirt', label: 'My Teams', route: '/(tabs)/my-teams', iconColor: colors.success, iconBg: colors.success + '15' },
        { icon: 'people', label: 'Roster', route: '/(tabs)/players', iconColor: colors.info, iconBg: colors.info + '15' },
        { icon: 'calendar', label: 'Schedule', route: '/(tabs)/gameday', iconColor: colors.primary, iconBg: colors.primary + '15' },
        { icon: 'calendar-outline', label: 'Availability', route: '/coach-availability', iconColor: colors.warning, iconBg: colors.warning + '15' },
      ];
    }
    if (isParent) {
      // Parent: My Children, Registration, Payments, Schedule, Waivers
      return [
        { icon: 'people', label: 'My Children', route: '/my-kids', iconColor: colors.primary, iconBg: colors.primary + '15' },
        { icon: 'clipboard', label: 'Registration Hub', route: '/parent-registration-hub', iconColor: '#AF52DE', iconBg: '#AF52DE15' },
        { icon: 'wallet', label: 'Payments', route: '/family-payments', iconColor: colors.warning, iconBg: colors.warning + '15' },
        { icon: 'calendar', label: 'Schedule', route: '/(tabs)/gameday', iconColor: colors.info, iconBg: colors.info + '15' },
        { icon: 'document-text', label: 'Waivers', route: '/my-waivers', iconColor: colors.success, iconBg: colors.success + '15' },
      ];
    }
    if (isPlayer) {
      // Player: My Stats, My Teams, My Achievements, Schedule
      return [
        { icon: 'stats-chart', label: 'My Stats', route: '/standings', iconColor: colors.info, iconBg: colors.info + '15' },
        { icon: 'shirt', label: 'My Teams', route: '/(tabs)/my-teams', iconColor: colors.success, iconBg: colors.success + '15' },
        { icon: 'ribbon', label: 'My Achievements', route: '/achievements', iconColor: colors.warning, iconBg: colors.warning + '15' },
        { icon: 'calendar', label: 'Schedule', route: '/(tabs)/gameday', iconColor: colors.primary, iconBg: colors.primary + '15' },
      ];
    }
    return [];
  };

  const myStuffItems = getMyStuffItems();

  // =========================================================================
  // SECTION 3: ADMIN TOOLS (only for admins, collapsible - default closed)
  // =========================================================================
  const adminToolsItems: MenuItem[] = [
    { icon: 'person-add', label: 'Invite Management', route: '/registration-hub', iconColor: colors.primary, iconBg: colors.primary + '15' },
    { icon: 'clipboard', label: 'Registration Hub', route: '/registration-hub', iconColor: colors.info, iconBg: colors.info + '15' },
    { icon: 'megaphone', label: 'Blast Composer', route: '/blast-composer', iconColor: colors.warning, iconBg: colors.warning + '15' },
    { icon: 'card', label: 'Payment Admin', route: '/(tabs)/payments', iconColor: colors.danger, iconBg: colors.danger + '15' },
    { icon: 'business', label: 'Org Directory', route: '/org-directory', iconColor: colors.success, iconBg: colors.success + '15' },
    { icon: 'archive', label: 'Season Archives', route: '/season-archives', iconColor: colors.textSecondary, iconBg: colors.textMuted + '15' },
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
      key={`${item.route}-${item.label}-${index}`}
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

          {/* Organization */}
          {organization?.name && (
            <Text style={s.heroOrg}>{organization.name}</Text>
          )}
        </View>

        {/* ===== PERSONAL SECTION (always visible) ===== */}
        <CollapsibleSection title="Personal" defaultOpen={true} colors={colors}>
          <View style={s.menuCard}>
            {/* Theme toggle inline */}
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

            {/* Accent color picker inline */}
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

            {/* Personal menu items */}
            {personalItems.map((item, i) => renderMenuItem(item, i))}
          </View>
        </CollapsibleSection>

        {/* ===== MY STUFF SECTION (role-specific) ===== */}
        {myStuffItems.length > 0 && (
          <CollapsibleSection title="My Stuff" defaultOpen={true} colors={colors}>
            <View style={s.menuCard}>
              {myStuffItems.map((item, i) => renderMenuItem(item, i))}
            </View>
          </CollapsibleSection>
        )}

        {/* ===== ADMIN TOOLS SECTION (only for admins, default collapsed) ===== */}
        {isAdmin && (
          <CollapsibleSection title="Admin Tools" defaultOpen={false} colors={colors}>
            <View style={s.menuCard}>
              {adminToolsItems.map((item, i) => renderMenuItem(item, i))}
            </View>
          </CollapsibleSection>
        )}

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

// =============================================================================
// STYLES
// =============================================================================

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
    heroOrg: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
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
