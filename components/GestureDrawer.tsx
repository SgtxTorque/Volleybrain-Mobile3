import { useAuth } from '@/lib/auth';
import { useDrawer } from '@/lib/drawer-context';
import { usePermissions } from '@/lib/permissions-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, useWindowDimensions, View } from 'react-native';
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
import { resolveLinkedPlayerIds } from '@/lib/resolve-linked-players';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

const ROLE_COLORS: Record<UserRole, string> = {
  league_admin: BRAND.coral,
  head_coach: BRAND.teal,
  assistant_coach: BRAND.teal,
  team_manager: '#E76F51',
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
  team_manager: 'Team Mgr',
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
      { icon: 'add-circle-outline', label: 'Create Event', route: '/(tabs)/coach-schedule' },
      { icon: 'flash-outline', label: 'Game Day Command', route: '/game-day-command' },
      { icon: 'analytics', label: 'Game Prep', route: '/game-prep' },
      { icon: 'grid', label: 'Lineup Builder', route: '/lineup-builder' },
      { icon: 'checkmark-circle', label: 'Attendance', route: '/attendance' },
      { icon: 'stats-chart', label: 'Game Results', route: '/game-results' },
      { icon: 'newspaper-outline', label: 'Game Recap', route: '/game-results?view=recap' },
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
      { icon: 'school-outline', label: 'Evaluations', route: '/my-stats' },
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
      { icon: 'school-outline', label: 'My Evaluations', route: '/my-stats?scrollToEvals=true' },
      { icon: 'id-card-outline', label: 'My Player Card', route: '/player-card' },
      { icon: 'trophy', label: 'Challenges', route: '/challenges' },
      { icon: 'ribbon', label: 'Achievements', route: '/achievements' },
      { icon: 'trending-up-outline', label: 'Season Progress', route: '/season-progress' },
      { icon: 'share-social', label: 'Invite Friends', route: '/invite-friends' },
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
      { icon: 'notifications-outline', label: 'Notification Inbox', route: '/notification' },
      { icon: 'options-outline', label: 'Notification Settings', route: '/notification-preferences' },
      { icon: 'archive', label: 'Season History', route: '/season-archives' },
      { icon: 'business', label: 'Find Organizations', route: '/org-directory' },
      { icon: 'shield-checkmark', label: 'Privacy Policy', route: '/privacy-policy' },
      { icon: 'document', label: 'Terms of Service', route: '/terms-of-service' },
      { icon: 'help-circle', label: 'Help Center', route: '/help' },
      { icon: 'lock-closed', label: 'Data Rights', route: '/data-rights' },
    ],
  },
];

export default function GestureDrawer() {
  const { isOpen, closeDrawer, openDrawer } = useDrawer();
  const insets = useSafeAreaInsets();
  const { user, profile, organization, signOut } = useAuth();
  const { actualRoles, isAdmin, isCoach, isParent, isPlayer, devViewAs, setDevViewAs } = usePermissions();
  const { allSeasons, workingSeason, setWorkingSeason } = useSeason();
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 744;
  const drawerWidth = Math.min(screenWidth * 0.82, isTablet ? 400 : 340);
  const snapThreshold = drawerWidth * 0.35;

  // Profile header data
  const avatarUrl = profile?.avatar_url || null;
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const firstInitial = displayName.charAt(0).toUpperCase();
  const orgName = organization?.name || 'Lynx Sports';

  // ====== ROLE SWITCHER DATA ======
  const rolePills = [
    { key: 'league_admin', label: 'Admin' },
    { key: 'head_coach', label: 'Coach' },
    { key: 'assistant_coach', label: 'Asst Coach' },
    { key: 'parent', label: 'Parent' },
    { key: 'player', label: 'Player' },
  ].filter(r => actualRoles.includes(r.key as any));

  const currentRoleKey = devViewAs || (() => {
    const order = ['league_admin', 'head_coach', 'assistant_coach', 'parent', 'player'];
    for (const r of order) {
      if (actualRoles.includes(r as any)) return r;
    }
    return actualRoles[0];
  })();

  const handleRoleSwitch = (roleKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDevViewAs(roleKey as any);
    // Clear stale context from previous role
    setActiveContextId(null);
    setContextItems([]);
    closeDrawer();
    setTimeout(() => router.push('/(tabs)' as never), 150);
  };

  // ====== SEASON DATA ======
  const [seasonExpanded, setSeasonExpanded] = useState(false);

  const handleSeasonSwitch = (season: (typeof allSeasons)[number]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWorkingSeason(season);
    setSeasonExpanded(false);
  };

  const handleViewProfile = () => {
    closeDrawer();
    setTimeout(() => router.push('/profile'), 150);
  };

  // ====== CONTEXTUAL SELECTOR DATA ======

  type ContextItem = {
    id: string;
    label: string;
    imageUrl: string | null;
    initials: string;
    color: string;
    emoji?: string;
  };

  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [activeContextId, setActiveContextId] = useState<string | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  // Fetch contextual items when drawer opens based on role
  const fetchContextItems = useCallback(async () => {
    if (!user?.id) return;
    setContextLoading(true);

    try {
      if (isParent) {
        // Canonical resolver for parent's linked players
        const linkedIds = await resolveLinkedPlayerIds(user.id);

        if (linkedIds.length > 0) {
          const { data: players } = await supabase
            .from('players')
            .select('id, first_name, last_name, photo_url')
            .in('id', linkedIds);

          const items: ContextItem[] = (players || []).map(p => ({
            id: p.id,
            label: p.first_name || 'Player',
            imageUrl: p.photo_url || null,
            initials: ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase(),
            color: BRAND.skyBlue,
          }));
          setContextItems(items);
          if (items.length > 0) setActiveContextId(items[0].id);
        }
      } else if (isCoach) {
        // Fetch teams via team_staff
        const { data: staffTeams } = await supabase
          .from('team_staff')
          .select('team_id, teams ( id, name, color, logo_url )')
          .eq('user_id', user.id)
          .eq('is_active', true);

        const items: ContextItem[] = (staffTeams || [])
          .filter((st: any) => st.teams)
          .map((st: any) => {
            const t = st.teams;
            return {
              id: t.id,
              label: t.name || 'Team',
              imageUrl: t.logo_url || null,
              initials: (t.name || 'T').substring(0, 2).toUpperCase(),
              color: t.color || BRAND.teal,
              emoji: '🏐',
            };
          });
        setContextItems(items);
        if (items.length > 0) setActiveContextId(items[0].id);
      } else if (isPlayer) {
        // Fetch teams via team_players
        // First find the player record for this user
        const { data: playerRecord } = await supabase
          .from('players')
          .select('id')
          .eq('profile_id', user.id)
          .limit(1)
          .maybeSingle();

        if (playerRecord) {
          const { data: teamData } = await supabase
            .from('team_players')
            .select('team_id, teams ( id, name, color, logo_url )')
            .eq('player_id', playerRecord.id);

          const items: ContextItem[] = (teamData || [])
            .filter((tp: any) => tp.teams)
            .map((tp: any) => {
              const t = tp.teams;
              return {
                id: t.id,
                label: t.name || 'Team',
                imageUrl: t.logo_url || null,
                initials: (t.name || 'T').substring(0, 2).toUpperCase(),
                color: t.color || BRAND.goldBrand,
                emoji: '🏐',
              };
            });
          setContextItems(items);
          if (items.length > 0) setActiveContextId(items[0].id);
        }
      }
    } catch (err) {
      // Silently fail — contextual selector is non-critical
    } finally {
      setContextLoading(false);
    }
  }, [user?.id, isParent, isCoach, isPlayer]);

  useEffect(() => {
    if (isOpen) {
      fetchContextItems();
    }
  }, [isOpen, fetchContextItems]);

  // Clear stale context when role changes from ANY source (drawer pills, home RoleSelector, etc.)
  useEffect(() => {
    setActiveContextId(null);
    setContextItems([]);
  }, [currentRoleKey]);

  const handleContextSelect = (item: ContextItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveContextId(item.id);
  };

  // Centralized badge counts (fetched via hook when drawer opens)
  const { badges, loading: badgesLoading } = useDrawerBadges(isOpen);

  // ====== MENU SECTIONS ======
  // Filter sections by the role the user is currently "viewing as" (not all roles)
  const visibleSections = MENU_SECTIONS.filter((s) => {
    if (!s.roleGate) return true; // "League & Community", "Settings", etc. — always visible

    const viewingAsAdmin = currentRoleKey === 'league_admin';
    const viewingAsCoach = currentRoleKey === 'head_coach' || currentRoleKey === 'assistant_coach';
    const viewingAsParent = currentRoleKey === 'parent';
    const viewingAsPlayer = currentRoleKey === 'player';

    if (s.roleGate === 'admin') return viewingAsAdmin;
    if (s.roleGate === 'coach') return viewingAsCoach;
    if (s.roleGate === 'admin_coach') return viewingAsAdmin || viewingAsCoach;
    if (s.roleGate === 'parent') return viewingAsParent;
    if (s.roleGate === 'player') return viewingAsPlayer;
    return false;
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

  const resolveRoute = (route: string, label: string): string => {
    if (label === 'Schedule' && route === '/(tabs)/schedule') {
      if (isParent && !isCoach && !isAdmin) return '/(tabs)/parent-schedule';
      if (isCoach || isAdmin) return '/(tabs)/coach-schedule';
      return '/(tabs)/schedule';
    }
    return route;
  };

  const handleMenuItemPress = (item: MenuItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeDrawer();
    let finalRoute = resolveRoute(item.route, item.label);

    // Fix 2: Pass active player context to my-stats routes
    if (finalRoute.startsWith('/my-stats') && activeContextId && isPlayer) {
      const separator = finalRoute.includes('?') ? '&' : '?';
      finalRoute = `${finalRoute}${separator}playerId=${activeContextId}`;
    }
    // Also pass context for parent evaluations
    if (finalRoute === '/my-stats' && activeContextId && isParent) {
      finalRoute = `/my-stats?playerId=${activeContextId}`;
    }

    // Fix 3: Pass team context to Game Day routes
    const gameDayRoutes = ['/game-day-command', '/game-prep', '/lineup-builder', '/attendance', '/game-results'];
    if (gameDayRoutes.some(r => finalRoute.startsWith(r)) && activeContextId && (isCoach || isAdmin)) {
      const separator = finalRoute.includes('?') ? '&' : '?';
      finalRoute = `${finalRoute}${separator}teamId=${activeContextId}`;
    }

    setTimeout(() => router.push(finalRoute as never), 150);
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
  }));

  return (
    <>
      {/* Edge swipe detector — always active, covers left edge */}
      <GestureDetector gesture={edgePan}>
        <Animated.View style={styles.edgeZone} />
      </GestureDetector>

      {/* Scrim overlay — pointerEvents must be a View prop, not animated style */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[styles.scrim, scrimStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer panel — pointerEvents guard prevents touch interception when closed */}
      <GestureDetector gesture={drawerPan}>
        <Animated.View
          pointerEvents={isOpen ? 'auto' : 'none'}
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
          {/* ====== COMPACT PROFILE HEADER ====== */}
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

            {/* Photo + Info row */}
            <View style={styles.profileRow}>
              {/* Rounded rectangle photo */}
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

              {/* Name, Org, Role pills, View Profile + Toggle */}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.profileOrg} numberOfLines={1}>
                  {orgName}
                </Text>

                {/* Role pills — these ARE the role switcher */}
                {rolePills.length > 0 && (
                  <View style={styles.roleBadgeRow}>
                    {rolePills.map((rp) => {
                      const isActive = currentRoleKey === rp.key;
                      return (
                        <TouchableOpacity
                          key={rp.key}
                          style={[
                            styles.roleBadge,
                            isActive
                              ? { backgroundColor: BRAND.teal, borderColor: BRAND.teal }
                              : { backgroundColor: ROLE_COLORS[rp.key as UserRole] + '15', borderColor: ROLE_COLORS[rp.key as UserRole] + '30' },
                          ]}
                          onPress={() => handleRoleSwitch(rp.key)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.roleBadgeText,
                            { color: isActive ? '#FFF' : ROLE_COLORS[rp.key as UserRole] },
                          ]}>
                            {rp.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* View Profile + Dark mode toggle */}
                <View style={styles.profileActions}>
                  <TouchableOpacity
                    style={styles.viewProfileButton}
                    onPress={handleViewProfile}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewProfileText}>View Profile</Text>
                    <Ionicons name="chevron-forward" size={12} color={BRAND.skyBlue} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={toggleTheme}
                    activeOpacity={0.7}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={isDark ? 'moon' : 'sunny'}
                      size={18}
                      color={isDark ? BRAND.goldBrand : BRAND.skyBlue}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* ====== COLLAPSIBLE SEASON SELECTOR ====== */}
          {allSeasons.length > 1 && (() => {
            const activeSeason = workingSeason || allSeasons.find(s => s.status === 'active') || allSeasons[0];
            const activeStatusColor = activeSeason?.status === 'active' ? BRAND.teal
              : activeSeason?.status === 'upcoming' ? BRAND.skyBlue
              : BRAND.textTertiary;
            const activeStatusLabel = activeSeason?.status === 'active' ? 'Active'
              : activeSeason?.status === 'upcoming' ? 'Upcoming'
              : activeSeason?.status === 'completed' ? 'Completed'
              : 'Archived';
            return (
              <View style={styles.drawerSelectorSection}>
                {/* Collapsed: single row showing active season */}
                <TouchableOpacity
                  style={styles.drawerSeasonRow}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSeasonExpanded(prev => !prev);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.drawerSeasonDot, { backgroundColor: activeStatusColor }]} />
                  <Text
                    style={[styles.drawerSeasonName, { color: BRAND.textLight, fontFamily: FONTS.bodyBold }]}
                    numberOfLines={1}
                  >
                    {activeSeason?.name || 'Season'}
                  </Text>
                  <View style={[styles.drawerSeasonBadge, { backgroundColor: activeStatusColor + '20' }]}>
                    <Text style={[styles.drawerSeasonBadgeText, { color: activeStatusColor }]}>
                      {activeStatusLabel}
                    </Text>
                  </View>
                  <Ionicons
                    name={seasonExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={BRAND.textTertiary}
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>

                {/* Expanded: all seasons list */}
                {seasonExpanded && allSeasons.filter(s => s.id !== activeSeason?.id).map(season => {
                  const statusColor = season.status === 'active' ? BRAND.teal
                    : season.status === 'upcoming' ? BRAND.skyBlue
                    : BRAND.textTertiary;
                  const statusLabel = season.status === 'active' ? 'Active'
                    : season.status === 'upcoming' ? 'Upcoming'
                    : season.status === 'completed' ? 'Completed'
                    : 'Archived';
                  return (
                    <TouchableOpacity
                      key={season.id}
                      style={styles.drawerSeasonRow}
                      onPress={() => handleSeasonSwitch(season)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.drawerSeasonDot, { backgroundColor: statusColor }]} />
                      <Text
                        style={[
                          styles.drawerSeasonName,
                          season.status !== 'active' && season.status !== 'upcoming' && { opacity: 0.5 },
                        ]}
                        numberOfLines={1}
                      >
                        {season.name}
                      </Text>
                      <View style={[styles.drawerSeasonBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.drawerSeasonBadgeText, { color: statusColor }]}>
                          {statusLabel}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })()}

          {/* ====== CONTEXTUAL SELECTOR ====== */}
          {contextItems.length > 0 && (
            <View
              style={[styles.contextSection, { borderBottomColor: BRAND.cardBorder }]}
              onStartShouldSetResponder={() => true}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.contextScroll}
                nestedScrollEnabled
                bounces
              >
                {contextItems.map((item) => {
                  const isActive = activeContextId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.contextItem}
                      onPress={() => handleContextSelect(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.contextCircle,
                        isActive && styles.contextCircleActive,
                      ]}>
                        {item.imageUrl ? (
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.contextImage}
                            contentFit="cover"
                            transition={200}
                          />
                        ) : item.emoji ? (
                          <View style={[styles.contextEmojiCircle, { backgroundColor: item.color + '25' }]}>
                            <Text style={styles.contextEmoji}>{item.emoji}</Text>
                          </View>
                        ) : (
                          <LinearGradient
                            colors={[item.color, item.color + 'AA']}
                            style={styles.contextInitialsCircle}
                          >
                            <Text style={styles.contextInitials}>{item.initials}</Text>
                          </LinearGradient>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.contextLabel,
                          isActive && styles.contextLabelActive,
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
          {contextLoading && contextItems.length === 0 && (
            <View style={[styles.contextSection, { borderBottomColor: BRAND.cardBorder, alignItems: 'center' }]}>
              <ActivityIndicator size="small" color={BRAND.teal} />
            </View>
          )}

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
                      onPress={() => handleMenuItemPress(item)}
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
  // Profile header — compact
  profileHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopRightRadius: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 64,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: BRAND.skyBlue + '40',
  },
  avatarInitial: {
    fontFamily: FONTS.bodyBold,
    fontSize: 24,
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 28,
  },
  profileName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    lineHeight: 20,
    color: BRAND.textLight,
  },
  profileOrg: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
    color: BRAND.textTertiary,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 5,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewProfileText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    marginRight: 2,
    color: BRAND.skyBlue,
  },
  // Contextual selector (children / teams)
  contextSection: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contextScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  contextItem: {
    alignItems: 'center',
    width: 68,
  },
  contextCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  contextCircleActive: {
    borderColor: BRAND.teal,
  },
  contextImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  contextEmojiCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextEmoji: {
    fontSize: 26,
  },
  contextInitialsCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextInitials: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: '#fff',
  },
  contextLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
    color: BRAND.textSecondary,
    marginTop: 4,
  },
  contextLabelActive: {
    color: BRAND.teal,
    fontFamily: FONTS.bodyBold,
  },
  // Season selector section
  drawerSelectorSection: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND.cardBorder,
  },
  drawerSeasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginBottom: 2,
  },
  drawerSeasonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  drawerSeasonName: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textSecondary,
  },
  drawerSeasonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  drawerSeasonBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.3,
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
