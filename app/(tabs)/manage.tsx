import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  iconColor?: string;
  iconBg?: string;
  badge?: number;
};

// =============================================================================
// COLLAPSIBLE SECTION
// =============================================================================

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  colors: any;
}) {
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

export default function ManageScreen() {
  const { colors } = useTheme();
  const { isAdmin, isCoach, isParent } = usePermissions();
  const { profile } = useAuth();
  const router = useRouter();

  const { workingSeason } = useSeason();
  const [refreshing, setRefreshing] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState({ pendingRegs: 0, pendingPay: 0, pendingApprovals: 0, unrostered: 0 });

  const fetchBadgeCounts = useCallback(async () => {
    if (!isAdmin) return;
    const orgId = profile?.current_organization_id;
    const seasonId = workingSeason?.id;
    const [regsRes, payRes, appRes, unrosteredRes] = await Promise.all([
      seasonId
        ? supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('season_id', seasonId).eq('status', 'new')
        : Promise.resolve({ count: 0 }),
      seasonId
        ? supabase.from('payments').select('*', { count: 'exact', head: true }).eq('season_id', seasonId).eq('status', 'pending')
        : Promise.resolve({ count: 0 }),
      orgId
        ? supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('pending_approval', true).eq('current_organization_id', orgId)
        : Promise.resolve({ count: 0 }),
      seasonId
        ? supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('season_id', seasonId).eq('status', 'active')
        : Promise.resolve({ count: 0 }),
    ]);
    setBadgeCounts({
      pendingRegs: (regsRes as any).count || 0,
      pendingPay: (payRes as any).count || 0,
      pendingApprovals: (appRes as any).count || 0,
      unrostered: (unrosteredRes as any).count || 0,
    });
  }, [isAdmin, workingSeason?.id, profile?.current_organization_id]);

  useEffect(() => { fetchBadgeCounts(); }, [fetchBadgeCounts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBadgeCounts();
    setRefreshing(false);
  }, [fetchBadgeCounts]);

  const s = createStyles(colors);

  // =========================================================================
  // PARENT SECTION
  // =========================================================================
  const parentItems: MenuItem[] = [
    { icon: 'people', label: 'My Children', route: '/my-kids', iconColor: colors.primary, iconBg: colors.primary + '15' },
    { icon: 'clipboard', label: 'Registration Hub', route: '/parent-registration-hub', iconColor: '#AF52DE', iconBg: '#AF52DE15' },
    { icon: 'wallet', label: 'Payments', route: '/family-payments', iconColor: colors.warning, iconBg: colors.warning + '15' },
    { icon: 'document-text', label: 'Waivers', route: '/my-waivers', iconColor: colors.success, iconBg: colors.success + '15' },
    { icon: 'share-social', label: 'Invite / Share', route: '/invite', iconColor: colors.info, iconBg: colors.info + '15' },
  ];

  // =========================================================================
  // COACH SECTION
  // =========================================================================
  const coachItems: MenuItem[] = [
    { icon: 'people', label: 'Roster', route: '/(tabs)/players', iconColor: colors.info, iconBg: colors.info + '15' },
    { icon: 'checkmark-circle', label: 'Attendance', route: '/attendance', iconColor: colors.success, iconBg: colors.success + '15' },
    { icon: 'megaphone', label: 'Blast Composer', route: '/blast-composer', iconColor: colors.warning, iconBg: colors.warning + '15' },
    { icon: 'calendar-outline', label: 'Coach Availability', route: '/coach-availability', iconColor: colors.primary, iconBg: colors.primary + '15' },
    { icon: 'person-circle', label: 'Coach Profile', route: '/coach-profile', iconColor: colors.textSecondary, iconBg: colors.textMuted + '15' },
    { icon: 'analytics', label: 'Game Prep', route: '/game-prep', iconColor: '#FF6B6B', iconBg: '#FF6B6B15' },
  ];

  // =========================================================================
  // ADMIN SECTION
  // =========================================================================
  const adminItems: MenuItem[] = [
    { icon: 'person-add', label: 'Registration Hub', route: '/registration-hub', iconColor: colors.primary, iconBg: colors.primary + '15', badge: badgeCounts.pendingRegs },
    { icon: 'people-circle', label: 'User Management', route: '/users', iconColor: colors.warning, iconBg: colors.warning + '15', badge: badgeCounts.pendingApprovals },
    { icon: 'card', label: 'Payment Admin', route: '/(tabs)/payments', iconColor: colors.danger, iconBg: colors.danger + '15', badge: badgeCounts.pendingPay },
    { icon: 'shirt', label: 'Team Management', route: '/team-management', iconColor: '#FF6B6B', iconBg: '#FF6B6B15', badge: badgeCounts.unrostered },
    { icon: 'clipboard', label: 'Coach Directory', route: '/coach-directory', iconColor: colors.info, iconBg: colors.info + '15' },
    { icon: 'calendar', label: 'Season Management', route: '/season-settings', iconColor: colors.success, iconBg: colors.success + '15' },
    { icon: 'bar-chart', label: 'Reports', route: '/(tabs)/reports-tab', iconColor: '#AF52DE', iconBg: '#AF52DE15' },
    { icon: 'business', label: 'Org Directory', route: '/org-directory', iconColor: colors.textSecondary, iconBg: colors.textMuted + '15' },
  ];

  const handleNavigate = (route: string) => {
    router.push(route as any);
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
      {item.badge != null && item.badge > 0 && (
        <View style={s.menuBadge}>
          <Text style={s.menuBadgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const showParent = isParent || isAdmin;
  const showCoach = isCoach || isAdmin;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Manage</Text>
        </View>

        {/* Parent Section */}
        {showParent && (
          <CollapsibleSection title="Parent" defaultOpen={true} colors={colors}>
            <View style={s.menuCard}>
              {parentItems.map((item, i) => renderMenuItem(item, i))}
            </View>
          </CollapsibleSection>
        )}

        {/* Coach Section */}
        {showCoach && (
          <CollapsibleSection title="Coach" defaultOpen={true} colors={colors}>
            <View style={s.menuCard}>
              {coachItems.map((item, i) => renderMenuItem(item, i))}
            </View>
          </CollapsibleSection>
        )}

        {/* Admin Section */}
        {isAdmin && (
          <CollapsibleSection title="Admin Tools" defaultOpen={false} colors={colors}>
            <View style={s.menuCard}>
              {adminItems.map((item, i) => renderMenuItem(item, i))}
            </View>
          </CollapsibleSection>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any) =>
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
    header: {
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    title: {
      fontSize: 28,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -0.5,
    },
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
    menuBadge: {
      backgroundColor: '#FF3B30',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 6,
      marginRight: 8,
    },
    menuBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: 'bold' as const,
    },
  });
