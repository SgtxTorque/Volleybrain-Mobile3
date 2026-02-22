import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { usePermissions } from '@/lib/permissions-context';
import { AccentColor, accentColors, useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
    { icon: 'lock-closed', label: 'Privacy & Data', route: '/data-rights', iconColor: '#AF52DE', iconBg: '#AF52DE15' },
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
        { icon: 'stats-chart', label: 'My Stats', route: '/my-stats', iconColor: colors.info, iconBg: colors.info + '15' },
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

  // =========================================================================
  // PLAYER CUSTOMIZATION STATE (only for players)
  // =========================================================================
  const PLAYER_ACCENT_COLORS = ['#F97316', '#3B82F6', '#A855F7', '#10B981', '#F43F5E', '#64748B'];
  const THEME_VARIANT_OPTIONS = [
    { key: 'midnight', label: 'Midnight', desc: 'Dark with glow', colors: ['#0A0F1A', '#111827', '#F97316'] },
    { key: 'clean', label: 'Clean', desc: 'Light & minimal', colors: ['#F8FAFC', '#FFFFFF', '#F97316'] },
    { key: 'fire', label: 'Fire', desc: 'Warm embers', colors: ['#1A0A0A', '#2D1111', '#FF6B35'] },
  ];
  const LAYOUT_OPTIONS = [
    { key: 'default', label: 'Default', desc: 'Stats → Achievements → Games' },
    { key: 'stats_first', label: 'Stats First', desc: 'Stats → Games → Achievements' },
    { key: 'games_first', label: 'Games First', desc: 'Games → Stats → Achievements' },
  ];
  const CALLING_CARDS = [
    { id: 0, name: 'Default', gradient: ['#1A2235', '#0A0F1A'] },
    { id: 1, name: 'Gold Rush', gradient: ['#F59E0B', '#D97706'] },
    { id: 2, name: 'Ocean', gradient: ['#06B6D4', '#0284C7'] },
    { id: 3, name: 'Ember', gradient: ['#EF4444', '#B91C1C'] },
    { id: 4, name: 'Neon', gradient: ['#A855F7', '#7C3AED'] },
    { id: 5, name: 'Forest', gradient: ['#10B981', '#059669'] },
    { id: 6, name: 'Sunset', gradient: ['#F97316', '#EA580C'] },
    { id: 7, name: 'Ice', gradient: ['#38BDF8', '#0EA5E9'] },
  ];

  const [playerTheme, setPlayerTheme] = useState('midnight');
  const [playerAccent, setPlayerAccent] = useState('#F97316');
  const [playerLayout, setPlayerLayout] = useState('default');
  const [playerCard, setPlayerCard] = useState(0);

  useEffect(() => {
    if (isPlayer) {
      AsyncStorage.getItem('vb_player_theme_variant').then(v => { if (v) setPlayerTheme(v); });
      AsyncStorage.getItem('vb_player_accent').then(v => { if (v) setPlayerAccent(v); });
      AsyncStorage.getItem('vb_player_layout').then(v => { if (v) setPlayerLayout(v); });
      AsyncStorage.getItem('vb_player_calling_card').then(v => { if (v) setPlayerCard(Number(v)); });
    }
  }, [isPlayer]);

  const savePlayerPref = (key: string, value: string) => {
    AsyncStorage.setItem(key, value);
  };

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

        {/* ===== MY STUFF SECTION (role-specific shortcuts) ===== */}
        {myStuffItems.length > 0 && (
          <CollapsibleSection title="My Stuff" defaultOpen={true} colors={colors}>
            <View style={s.menuCard}>
              {myStuffItems.map((item, i) => renderMenuItem(item, i))}
            </View>
          </CollapsibleSection>
        )}

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

        {/* ===== PLAYER CUSTOMIZATION (only for players) ===== */}
        {isPlayer && (
          <CollapsibleSection title="Player Dashboard Customization" defaultOpen={false} colors={colors}>
            <View style={s.menuCard}>
              {/* Theme Variant */}
              <View style={s.customSection}>
                <Text style={[s.customLabel, { color: colors.text }]}>Theme Variant</Text>
                <View style={s.customRow}>
                  {THEME_VARIANT_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        s.themeCard,
                        { backgroundColor: opt.colors[0], borderColor: playerTheme === opt.key ? opt.colors[2] : colors.border },
                      ]}
                      onPress={() => { setPlayerTheme(opt.key); savePlayerPref('vb_player_theme_variant', opt.key); }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
                        {opt.colors.map((c, i) => (
                          <View key={i} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c }} />
                        ))}
                      </View>
                      <Text style={[s.themeCardLabel, { color: opt.key === 'clean' ? '#1E293B' : '#FFF' }]}>
                        {opt.label}
                      </Text>
                      <Text style={{ fontSize: 10, color: opt.key === 'clean' ? '#64748B' : '#94A3B8' }}>
                        {opt.desc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Player Accent Color */}
              <View style={s.customSection}>
                <Text style={[s.customLabel, { color: colors.text }]}>Player Accent</Text>
                <View style={s.accentCircles}>
                  {PLAYER_ACCENT_COLORS.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        s.accentCircle,
                        { backgroundColor: c },
                        playerAccent === c && s.accentCircleSelected,
                      ]}
                      onPress={() => { setPlayerAccent(c); savePlayerPref('vb_player_accent', c); }}
                      activeOpacity={0.7}
                    >
                      {playerAccent === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Layout Preference */}
              <View style={s.customSection}>
                <Text style={[s.customLabel, { color: colors.text }]}>Layout</Text>
                {LAYOUT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      s.layoutOption,
                      { borderColor: playerLayout === opt.key ? colors.primary : colors.border },
                      playerLayout === opt.key && { backgroundColor: colors.primary + '10' },
                    ]}
                    onPress={() => { setPlayerLayout(opt.key); savePlayerPref('vb_player_layout', opt.key); }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[s.radioOuter, { borderColor: playerLayout === opt.key ? colors.primary : colors.textMuted }]}>
                        {playerLayout === opt.key && <View style={[s.radioInner, { backgroundColor: colors.primary }]} />}
                      </View>
                      <View>
                        <Text style={[s.layoutLabel, { color: colors.text }]}>{opt.label}</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>{opt.desc}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Calling Card */}
              <View style={s.customSection}>
                <Text style={[s.customLabel, { color: colors.text }]}>Calling Card</Text>
                <View style={s.cardGrid}>
                  {CALLING_CARDS.map(card => (
                    <TouchableOpacity
                      key={card.id}
                      style={[
                        s.callingCard,
                        { backgroundColor: card.gradient[0] },
                        playerCard === card.id && { borderColor: '#FFD700', borderWidth: 2 },
                      ]}
                      onPress={() => { setPlayerCard(card.id); savePlayerPref('vb_player_calling_card', String(card.id)); }}
                      activeOpacity={0.7}
                    >
                      <View style={[s.callingCardInner, { backgroundColor: card.gradient[1], opacity: 0.4 }]} />
                      <Text style={s.callingCardName}>{card.name}</Text>
                      {playerCard === card.id && (
                        <View style={s.callingCardCheck}>
                          <Ionicons name="checkmark-circle" size={16} color="#FFD700" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </CollapsibleSection>
        )}

        {/* ===== ADMIN TOOLS (only for admins) ===== */}
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
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.screenPadding,
      paddingTop: 8,
    },

    // ===== PROFILE HERO =====
    heroCard: {
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.06)',
      borderRadius: radii.card,
      padding: 24,
      alignItems: 'center',
      marginBottom: 8,
      ...shadows.card,
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
      ...displayTextStyle,
      fontSize: 24,
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
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.06)',
      borderRadius: radii.card,
      overflow: 'hidden',
      ...shadows.card,
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

    // ===== PLAYER CUSTOMIZATION =====
    customSection: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    customLabel: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 10,
    },
    customRow: {
      flexDirection: 'row',
      gap: 8,
    },
    themeCard: {
      flex: 1,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1.5,
      alignItems: 'center',
    },
    themeCardLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    layoutOption: {
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      marginBottom: 6,
    },
    layoutLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    radioOuter: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    cardGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    callingCard: {
      width: '23%' as any,
      aspectRatio: 1.4,
      borderRadius: 10,
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      overflow: 'hidden',
      position: 'relative',
    },
    callingCardInner: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    callingCardName: {
      fontSize: 9,
      fontWeight: '700',
      color: '#FFF',
      textAlign: 'center',
    },
    callingCardCheck: {
      position: 'absolute',
      top: 2,
      right: 2,
    },

    // ===== SIGN OUT =====
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.danger + '15',
      borderRadius: radii.card,
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
