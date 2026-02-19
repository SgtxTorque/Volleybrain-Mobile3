import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
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
    { icon: 'person-add', label: 'Invite Management', route: '/registration-hub', iconColor: colors.primary, iconBg: colors.primary + '15' },
    { icon: 'calendar', label: 'Season Management', route: '/season-settings', iconColor: colors.info, iconBg: colors.info + '15' },
    { icon: 'bar-chart', label: 'Reports', route: '/(tabs)/reports-tab', iconColor: colors.success, iconBg: colors.success + '15' },
    { icon: 'people-circle', label: 'User Management', route: '/users', iconColor: colors.warning, iconBg: colors.warning + '15' },
    { icon: 'card', label: 'Payment Admin', route: '/(tabs)/payments', iconColor: colors.danger, iconBg: colors.danger + '15' },
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
  });
