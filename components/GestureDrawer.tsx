import { useAuth } from '@/lib/auth';
import { useDrawer } from '@/lib/drawer-context';
import { usePermissions } from '@/lib/permissions-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Alert, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { UserRole } from '@/lib/permissions';
import { useDrawerBadges } from '@/hooks/useDrawerBadges';
import type { DrawerBadges } from '@/hooks/useDrawerBadges';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

const ROLE_COLORS: Record<UserRole, string> = {
  league_admin: BRAND.coral,
  head_coach: BRAND.teal,
  assistant_coach: BRAND.teal,
  parent: BRAND.skyBlue,
  player: BRAND.goldBrand,
};

const EDGE_SWIPE_ZONE = 25;
const VELOCITY_THRESHOLD = 500;
const SPRING_CONFIG = { damping: 22, stiffness: 200, mass: 0.8 };

const ROLE_DISPLAY: Record<UserRole, string> = {
  league_admin: 'Admin',
  head_coach: 'Head Coach',
  assistant_coach: 'Asst. Coach',
  parent: 'Parent',
  player: 'Player',
};

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  webOnly?: boolean;
  badgeKey?: keyof DrawerBadges;
};

type MenuSection = {
  id: string;
  title: string;
  items: MenuItem[];
  collapsible: boolean;
  defaultOpen: boolean;
  roleGate?: 'admin' | 'coach' | 'admin_coach' | 'parent' | 'player';
};

const MENU_SECTIONS: MenuSection[] = [
  // ── Quick Access (all roles) ──────────────────────────────────
  {
    id: 'quick',
    title: 'Quick Access',
    collapsible: false,
    defaultOpen: true,
    items: [
      { icon: 'home', label: 'Home', route: '/(tabs)' },
      { icon: 'calendar', label: 'Schedule', route: '/(tabs)/schedule' },
      { icon: 'chatbubble-ellipses', label: 'Chats', route: '/(tabs)/chats', badgeKey: 'unreadChats' },
      { icon: 'megaphone-outline', label: 'Announcements', route: '/(tabs)/messages' },
      { icon: 'people', label: 'Team Wall', route: '/(tabs)/connect' },
    ],
  },
  // ── Admin Tools (admin only) ──────────────────────────────────
  {
    id: 'admin',
    title: 'Admin Tools',
    collapsible: true,
    defaultOpen: true,
    roleGate: 'admin',
    items: [
      { icon: 'person-add', label: 'Registration Hub', route: '/registration-hub', badgeKey: 'pendingRegistrations' },
      { icon: 'people-circle', label: 'User Management', route: '/users', badgeKey: 'pendingApprovals' },
      { icon: 'card', label: 'Payment Admin', route: '/(tabs)/payments', badgeKey: 'unpaidPaymentsAdmin' },
      { icon: 'notifications', label: 'Payment Reminders', route: '/payment-reminders' },
      { icon: 'shirt', label: 'Team Management', route: '/team-management', badgeKey: 'unrosteredPlayers' },
      { icon: 'shirt-outline', label: 'Jersey Management', route: '/(tabs)/jersey-management' },
      { icon: 'school', label: 'Coach Directory', route: '/coach-directory' },
      { icon: 'calendar-outline', label: 'Season Management', route: '/season-settings' },
      { icon: 'rocket-outline', label: 'Season Setup Wizard', route: '/season-setup-wizard' },
      { icon: 'bar-chart', label: 'Reports & Analytics', route: '/(tabs)/reports-tab' },
      { icon: 'search', label: 'Admin Search', route: '/admin-search' },
      { icon: 'business', label: 'Org Directory', route: '/org-directory' },
      { icon: 'archive', label: 'Season Archives', route: '/season-archives' },
      { icon: 'megaphone', label: 'Blast Composer', route: '/blast-composer' },
      { icon: 'time', label: 'Blast History', route: '/blast-history' },
      { icon: 'location-outline', label: 'Venue Manager', route: '/venue-manager' },
      { icon: 'finger-print', label: 'Background Checks', route: '/coach-background-checks' },
      { icon: 'hand-left-outline', label: 'Volunteer Assignment', route: '/volunteer-assignment' },
      { icon: 'document-text', label: 'Form Builder', route: '/web-features', webOnly: true },
      { icon: 'shield-checkmark', label: 'Waiver Editor', route: '/web-features', webOnly: true },
      { icon: 'card-outline', label: 'Payment Gateway', route: '/web-features', webOnly: true },
      { icon: 'add-circle-outline', label: 'Bulk Event Create', route: '/bulk-event-create' },
      { icon: 'settings-outline', label: 'Org Settings', route: '/org-settings' },
    ],
  },
  // ── Game Day (admin + coach) ──────────────────────────────────
  {
    id: 'gameday',
    title: 'Game Day',
    collapsible: true,
    defaultOpen: false,
    roleGate: 'admin_coach',
    items: [
      { icon: 'flash-outline', label: 'Game Day Command', route: '/game-day-command' },
      { icon: 'analytics', label: 'Game Prep', route: '/game-prep' },
      { icon: 'grid', label: 'Lineup Builder', route: '/lineup-builder' },
      { icon: 'checkmark-circle', label: 'Attendance', route: '/attendance' },
      { icon: 'stats-chart', label: 'Game Results', route: '/game-results' },
      { icon: 'newspaper-outline', label: 'Game Recap', route: '/game-recap' },
    ],
  },
  // ── Coaching Tools (admin + coach) ────────────────────────────
  {
    id: 'coaching',
    title: 'Coaching Tools',
    collapsible: true,
    defaultOpen: false,
    roleGate: 'admin_coach',
    items: [
      { icon: 'clipboard', label: 'Player Evaluations', route: '/evaluation-session' },
      { icon: 'trophy', label: 'Challenges', route: '/coach-challenge-dashboard' },
      { icon: 'library-outline', label: 'Challenge Library', route: '/challenge-library' },
      { icon: 'flag-outline', label: 'Player Goals', route: '/player-goals' },
      { icon: 'megaphone', label: 'Blast Composer', route: '/blast-composer' },
      { icon: 'time', label: 'Blast History', route: '/blast-history' },
      { icon: 'calendar-outline', label: 'Coach Availability', route: '/coach-availability' },
      { icon: 'person-circle', label: 'Coach Profile', route: '/coach-profile' },
      { icon: 'shirt', label: 'My Teams', route: '/(tabs)/my-teams' },
      { icon: 'people', label: 'Roster', route: '/(tabs)/players' },
    ],
  },
  // ── My Family (parent only) ───────────────────────────────────
  {
    id: 'family',
    title: 'My Family',
    collapsible: true,
    defaultOpen: true,
    roleGate: 'parent',
    items: [
      { icon: 'people', label: 'My Children', route: '/my-kids' },
      { icon: 'clipboard', label: 'Registration', route: '/parent-registration-hub' },
      { icon: 'wallet', label: 'Payments', route: '/family-payments', badgeKey: 'unpaidPaymentsParent' },
      { icon: 'document-text', label: 'Waivers', route: '/my-waivers', badgeKey: 'unsignedWaivers' },
      { icon: 'trophy', label: 'Standings', route: '/standings' },
      { icon: 'ribbon', label: 'Achievements', route: '/achievements' },
      { icon: 'share-social', label: 'Invite Friends', route: '/invite-friends' },
    ],
  },
  // ── My Stuff (player only) ────────────────────────────────────
  {
    id: 'player',
    title: 'My Stuff',
    collapsible: true,
    defaultOpen: true,
    roleGate: 'player',
    items: [
      { icon: 'shirt', label: 'My Teams', route: '/(tabs)/my-teams' },
      { icon: 'stats-chart', label: 'My Stats', route: '/my-stats' },
      { icon: 'id-card-outline', label: 'My Player Card', route: '/player-card' },
      { icon: 'trophy', label: 'Challenges', route: '/challenges' },
      { icon: 'ribbon', label: 'Achievements', route: '/achievements' },
      { icon: 'trending-up-outline', label: 'Season Progress', route: '/season-progress' },
      { icon: 'podium-outline', label: 'Standings', route: '/standings' },
      { icon: 'calendar', label: 'Schedule', route: '/(tabs)/schedule' },
    ],
  },
  // ── League & Community (all roles) ────────────────────────────
  {
    id: 'community',
    title: 'League & Community',
    collapsible: true,
    defaultOpen: false,
    items: [
      { icon: 'people', label: 'Team Wall', route: '/(tabs)/connect' },
      { icon: 'trophy', label: 'Standings', route: '/standings' },
      { icon: 'ribbon', label: 'Achievements', route: '/achievements' },
      { icon: 'school', label: 'Coach Directory', route: '/coach-directory' },
      { icon: 'business', label: 'Find Organizations', route: '/org-directory' },
    ],
  },
  // ── Settings & Privacy (all roles) ────────────────────────────
  {
    id: 'settings',
    title: 'Settings & Privacy',
    collapsible: true,
    defaultOpen: false,
    items: [
      { icon: 'person-circle', label: 'My Profile', route: '/profile' },
      { icon: 'settings', label: 'Settings', route: '/(tabs)/settings' },
      { icon: 'notifications-outline', label: 'Notifications', route: '/notification-preferences' },
      { icon: 'archive', label: 'Season History', route: '/season-archives' },
      { icon: 'shield-checkmark', label: 'Privacy Policy', route: '/privacy-policy' },
      { icon: 'document', label: 'Terms of Service', route: '/terms-of-service' },
    ],
  },
  // ── Help & Support (all roles) ────────────────────────────────
  {
    id: 'help',
    title: 'Help & Support',
    collapsible: true,
    defaultOpen: false,
    items: [
      { icon: 'help-circle', label: 'Help Center', route: '/help' },
      { icon: 'globe', label: 'Web Features', route: '/web-features' },
      { icon: 'lock-closed', label: 'Data Rights', route: '/data-rights' },
    ],
  },
];

export default function GestureDrawer() {
  const { isOpen, closeDrawer, openDrawer } = useDrawer();
  const insets = useSafeAreaInsets();
  const { user, profile, organization, signOut } = useAuth();
  const { actualRoles, isAdmin, isCoach, isParent, isPlayer } = usePermissions();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 744;
  const drawerWidth = Math.min(screenWidth * 0.82, isTablet ? 400 : 340);
  const snapThreshold = drawerWidth * 0.35;

  // Profile header data
  const avatarUrl = profile?.avatar_url || null;
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const firstInitial = displayName.charAt(0).toUpperCase();
  const roleLabels = actualRoles.map((r) => ROLE_DISPLAY[r] || r).join(' · ');
  const orgName = organization?.name || 'Lynx Sports';

  const handleViewProfile = () => {
    closeDrawer();
    setTimeout(() => router.push('/profile'), 150);
  };

  // ====== SHORTCUT ROW ======
  type Shortcut = {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    route: string;
  };

  const shortcuts: Shortcut[] = (() => {
    const items: Shortcut[] = [
      { key: 'home', icon: 'home', label: 'Home', route: '/(tabs)' },
      { key: 'schedule', icon: 'calendar', label: 'Schedule', route: '/(tabs)/schedule' },
      { key: 'chats', icon: 'chatbubble-ellipses', label: 'Chats', route: '/(tabs)/chats' },
      { key: 'blasts', icon: 'megaphone', label: 'Blasts', route: '/(tabs)/messages' },
    ];

    if (isAdmin) {
      items.push(
        { key: 'registration', icon: 'person-add', label: 'Registration', route: '/registration-hub' },
        { key: 'reports', icon: 'bar-chart', label: 'Reports', route: '/(tabs)/reports-tab' },
      );
    }
    if (isCoach) {
      items.push(
        { key: 'gameprep', icon: 'clipboard', label: 'Game Prep', route: '/game-prep' },
        { key: 'lineup', icon: 'list', label: 'Lineup', route: '/lineup-builder' },
      );
    }
    if (isParent) {
      items.push(
        { key: 'mykids', icon: 'people-circle', label: 'My Kids', route: '/my-kids' },
        { key: 'payments', icon: 'card', label: 'Payments', route: '/family-payments' },
      );
    }
    if (isPlayer) {
      items.push(
        { key: 'mystats', icon: 'stats-chart', label: 'My Stats', route: '/my-stats' },
        { key: 'achievements', icon: 'trophy', label: 'Achieve', route: '/achievements' },
      );
    }
    return items;
  })();

  // Centralized badge counts (fetched via hook when drawer opens)
  const { badges, loading: badgesLoading } = useDrawerBadges(isOpen);

  // Map shortcut keys → badge keys for dot rendering
  const shortcutBadgeMap: Record<string, keyof DrawerBadges> = {
    registration: 'pendingRegistrations',
    payments: 'unpaidPaymentsParent',
    chats: 'unreadChats',
  };

  const handleShortcutPress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeDrawer();
    setTimeout(() => router.push(route as never), 150);
  };

  // ====== MENU SECTIONS ======
  // Filter sections by role
  const visibleSections = MENU_SECTIONS.filter((s) => {
    if (!s.roleGate) return true;
    if (s.roleGate === 'admin') return isAdmin;
    if (s.roleGate === 'coach') return isCoach;
    if (s.roleGate === 'admin_coach') return isAdmin || isCoach;
    if (s.roleGate === 'parent') return isParent;
    if (s.roleGate === 'player') return isPlayer;
    return true;
  });

  // Track collapsed state per section
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    MENU_SECTIONS.forEach((s) => {
      if (s.collapsible) {
        initial[s.id] = !s.defaultOpen;
      }
    });
    return initial;
  });

  const toggleSection = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMenuItemPress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeDrawer();
    setTimeout(() => router.push(route as never), 150);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            closeDrawer();
            setTimeout(() => signOut(), 200);
          },
        },
      ],
    );
  };

  // 0 = closed, 1 = open
  const progress = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // Sync isOpen state → animation + haptic on open
  useEffect(() => {
    if (isOpen) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    progress.value = withSpring(isOpen ? 1 : 0, SPRING_CONFIG);
  }, [isOpen]);

  // Edge swipe gesture to open
  const edgePan = Gesture.Pan()
    .activeOffsetX(10)
    .failOffsetY([-20, 20])
    .onBegin((e) => {
      // Only activate from left edge
      if (e.x > EDGE_SWIPE_ZONE) return;
      isDragging.value = true;
      dragStartX.value = progress.value * drawerWidth;
    })
    .onUpdate((e) => {
      if (!isDragging.value) return;
      const newX = Math.max(0, Math.min(drawerWidth, dragStartX.value + e.translationX));
      progress.value = newX / drawerWidth;
    })
    .onEnd((e) => {
      if (!isDragging.value) return;
      isDragging.value = false;

      const currentX = progress.value * drawerWidth;
      const shouldOpen = e.velocityX > VELOCITY_THRESHOLD || currentX > snapThreshold;

      if (shouldOpen) {
        progress.value = withSpring(1, SPRING_CONFIG);
        runOnJS(openDrawer)();
      } else {
        progress.value = withSpring(0, SPRING_CONFIG);
        runOnJS(closeDrawer)();
      }
    });

  // Drawer drag gesture to close
  const drawerPan = Gesture.Pan()
    .activeOffsetX(-10)
    .failOffsetY([-20, 20])
    .onBegin(() => {
      isDragging.value = true;
      dragStartX.value = progress.value * drawerWidth;
    })
    .onUpdate((e) => {
      if (!isDragging.value) return;
      const newX = Math.max(0, Math.min(drawerWidth, dragStartX.value + e.translationX));
      progress.value = newX / drawerWidth;
    })
    .onEnd((e) => {
      if (!isDragging.value) return;
      isDragging.value = false;

      const currentX = progress.value * drawerWidth;
      const shouldClose = e.velocityX < -VELOCITY_THRESHOLD || currentX < drawerWidth - snapThreshold;

      if (shouldClose) {
        progress.value = withSpring(0, SPRING_CONFIG);
        runOnJS(closeDrawer)();
      } else {
        progress.value = withSpring(1, SPRING_CONFIG);
        runOnJS(openDrawer)();
      }
    });

  // Animated styles
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-drawerWidth, 0]) }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.55]),
    pointerEvents: progress.value > 0.01 ? 'auto' as const : 'none' as const,
  }));

  return (
    <>
      {/* Edge swipe detector — always active, covers left edge */}
      <GestureDetector gesture={edgePan}>
        <Animated.View style={styles.edgeZone} />
      </GestureDetector>

      {/* Scrim overlay */}
      <Animated.View style={[styles.scrim, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer panel */}
      <GestureDetector gesture={drawerPan}>
        <Animated.View
          style={[
            styles.drawer,
            drawerStyle,
            {
              width: drawerWidth,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 4, height: 0 },
                  shadowOpacity: 0.35,
                  shadowRadius: 20,
                },
                android: {
                  elevation: 16,
                },
              }),
            },
          ]}
        >
          {/* ====== PROFILE HEADER ====== */}
          <LinearGradient
            colors={[BRAND.navy, BRAND.navyDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.profileHeader}
          >
            {/* Close button */}
            <Pressable
              style={styles.closeButton}
              onPress={closeDrawer}
              hitSlop={12}
            >
              <Ionicons name="close" size={22} color={BRAND.textSecondary} />
            </Pressable>

            {/* Avatar + Info row */}
            <View style={styles.profileRow}>
              {/* Avatar */}
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <LinearGradient
                  colors={[BRAND.skyBlue, BRAND.teal]}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarInitial}>{firstInitial}</Text>
                </LinearGradient>
              )}

              {/* Name / Roles / Org */}
              <View style={styles.profileInfo}>
                <Text
                  style={[styles.profileName, { color: BRAND.textLight }]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                {actualRoles.length > 0 && (
                  <View style={styles.roleBadgeRow}>
                    {actualRoles.map((r) => (
                      <View key={r} style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[r] + '25', borderColor: ROLE_COLORS[r] + '40' }]}>
                        <Text style={[styles.roleBadgeText, { color: ROLE_COLORS[r] }]}>
                          {ROLE_DISPLAY[r]}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text
                  style={[styles.profileOrg, { color: BRAND.textTertiary }]}
                  numberOfLines={1}
                >
                  {orgName}
                </Text>
              </View>
            </View>

            {/* View Profile link */}
            <TouchableOpacity
              style={[styles.viewProfileButton, { borderColor: BRAND.cardBorder }]}
              onPress={handleViewProfile}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewProfileText, { color: BRAND.skyBlue }]}>
                View Profile
              </Text>
              <Ionicons name="chevron-forward" size={14} color={BRAND.skyBlue} />
            </TouchableOpacity>
          </LinearGradient>

          {/* ====== SHORTCUT ROW ====== */}
          <View style={[styles.shortcutSection, { borderBottomColor: BRAND.cardBorder }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shortcutScroll}
              bounces
            >
              {shortcuts.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.shortcutPill, { backgroundColor: BRAND.surfaceCard }]}
                  onPress={() => handleShortcutPress(s.route)}
                  activeOpacity={0.7}
                >
                  <View style={styles.shortcutIconWrap}>
                    <Ionicons name={s.icon} size={22} color={BRAND.skyBlue} />
                    {(badges[shortcutBadgeMap[s.key]] ?? 0) > 0 && (
                      <View style={[styles.badgeDot, { backgroundColor: BRAND.coral }]} />
                    )}
                  </View>
                  <Text
                    style={[styles.shortcutLabel, { color: BRAND.textSecondary }]}
                    numberOfLines={1}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ====== MENU SECTIONS ====== */}
          <ScrollView
            style={styles.menuBody}
            contentContainerStyle={styles.menuContent}
            showsVerticalScrollIndicator={false}
            bounces
          >
            {visibleSections.map((section, sectionIdx) => {
              const isCollapsed = collapsedSections[section.id];
              return (
                <View key={section.id}>
                  {/* Section divider */}
                  {sectionIdx > 0 && (
                    <View style={[styles.sectionDivider, { backgroundColor: BRAND.cardBorder }]} />
                  )}

                  {/* Section header */}
                  {section.collapsible ? (
                    <TouchableOpacity
                      style={styles.sectionHeader}
                      onPress={() => toggleSection(section.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.sectionTitle}>
                        {section.title}
                      </Text>
                      <Ionicons
                        name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                        size={16}
                        color={BRAND.textTertiary}
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>
                        {section.title}
                      </Text>
                    </View>
                  )}

                  {/* Section items */}
                  {!isCollapsed && section.items.map((item) => (
                    <TouchableOpacity
                      key={item.label + item.route}
                      style={styles.menuItem}
                      onPress={() => handleMenuItemPress(item.route)}
                      activeOpacity={0.65}
                    >
                      <View style={[styles.menuItemIcon, { backgroundColor: BRAND.surfaceCard }]}>
                        <Ionicons name={item.icon} size={18} color={BRAND.skyBlue} />
                      </View>
                      <Text
                        style={styles.menuItemLabel}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      {item.badgeKey && badges[item.badgeKey] > 0 && (
                        <View style={[styles.menuBadge, { backgroundColor: BRAND.coral }]}>
                          <Text style={styles.menuBadgeText}>
                            {badges[item.badgeKey] > 99 ? '99+' : badges[item.badgeKey]}
                          </Text>
                        </View>
                      )}
                      {item.badgeKey && badgesLoading && !badges[item.badgeKey] && (
                        <View style={[styles.menuBadgeSkeleton, { backgroundColor: BRAND.surfaceCard }]} />
                      )}
                      {item.webOnly && (
                        <View style={[styles.webBadge, { backgroundColor: BRAND.skyBlue + '20' }]}>
                          <Text style={[styles.webBadgeText, { color: BRAND.skyBlue }]}>Web</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={14} color={BRAND.textTertiary} style={styles.menuItemChevron} />
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
          </ScrollView>

          {/* ====== FOOTER ====== */}
          <View style={styles.footer}>
            <View style={[styles.footerDivider, { backgroundColor: BRAND.cardBorder }]} />
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color={BRAND.coral} />
              <Text style={[styles.signOutText, { color: BRAND.coral }]}>Sign Out</Text>
            </TouchableOpacity>
            <Text style={styles.versionText}>
              Lynx v1.0.0
            </Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  edgeZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE_SWIPE_ZONE,
    zIndex: 998,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 999,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: BRAND.surfaceDark,
  },
  // Profile header
  profileHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopRightRadius: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: BRAND.skyBlue + '40',
  },
  avatarInitial: {
    fontFamily: FONTS.bodyBold,
    fontSize: 22,
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 36,
  },
  profileName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    lineHeight: 22,
    color: BRAND.textLight,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  profileOrg: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
    color: BRAND.textTertiary,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  viewProfileText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    marginRight: 4,
  },
  // Shortcut row
  shortcutSection: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shortcutScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  shortcutPill: {
    width: 66,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutIconWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shortcutLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
    color: BRAND.textSecondary,
  },
  // Menu sections
  menuBody: {
    flex: 1,
  },
  menuContent: {
    paddingBottom: 24,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: BRAND.textTertiary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
  },
  menuItemLabel: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    marginLeft: 12,
    color: BRAND.textLight,
  },
  webBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  webBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  menuBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  menuBadgeSkeleton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
    opacity: 0.3,
  },
  menuItemChevron: {
    marginLeft: 4,
  },
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  signOutText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    marginLeft: 10,
  },
  versionText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    textAlign: 'center',
    paddingTop: 4,
    paddingBottom: 4,
    color: BRAND.textTertiary,
  },
});
