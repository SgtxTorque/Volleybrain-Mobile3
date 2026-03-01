import { useAuth } from '@/lib/auth';
import { useDrawer } from '@/lib/drawer-context';
import { usePermissions } from '@/lib/permissions-context';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);
const EDGE_SWIPE_ZONE = 25;
const VELOCITY_THRESHOLD = 500;
const SNAP_THRESHOLD = DRAWER_WIDTH * 0.35;
const SPRING_CONFIG = { damping: 22, stiffness: 200, mass: 0.8 };

const ROLE_DISPLAY: Record<UserRole, string> = {
  league_admin: 'Admin',
  head_coach: 'Head Coach',
  assistant_coach: 'Asst. Coach',
  parent: 'Parent',
  player: 'Player',
};

export default function GestureDrawer() {
  const { isOpen, closeDrawer, openDrawer } = useDrawer();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile, organization } = useAuth();
  const { actualRoles } = usePermissions();
  const router = useRouter();

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

  // 0 = closed, 1 = open
  const progress = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // Sync isOpen state → animation
  useEffect(() => {
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
      dragStartX.value = progress.value * DRAWER_WIDTH;
    })
    .onUpdate((e) => {
      if (!isDragging.value) return;
      const newX = Math.max(0, Math.min(DRAWER_WIDTH, dragStartX.value + e.translationX));
      progress.value = newX / DRAWER_WIDTH;
    })
    .onEnd((e) => {
      if (!isDragging.value) return;
      isDragging.value = false;

      const currentX = progress.value * DRAWER_WIDTH;
      const shouldOpen = e.velocityX > VELOCITY_THRESHOLD || currentX > SNAP_THRESHOLD;

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
      dragStartX.value = progress.value * DRAWER_WIDTH;
    })
    .onUpdate((e) => {
      if (!isDragging.value) return;
      const newX = Math.max(0, Math.min(DRAWER_WIDTH, dragStartX.value + e.translationX));
      progress.value = newX / DRAWER_WIDTH;
    })
    .onEnd((e) => {
      if (!isDragging.value) return;
      isDragging.value = false;

      const currentX = progress.value * DRAWER_WIDTH;
      const shouldClose = e.velocityX < -VELOCITY_THRESHOLD || currentX < DRAWER_WIDTH - SNAP_THRESHOLD;

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
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-DRAWER_WIDTH, 0]) }],
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
              width: DRAWER_WIDTH,
              backgroundColor: colors.card,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 4, height: 0 },
                  shadowOpacity: 0.25,
                  shadowRadius: 16,
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
            colors={
              isDark
                ? [colors.primary + '30', colors.card, colors.card]
                : [colors.primary + '18', colors.card, colors.card]
            }
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
              <Ionicons name="close" size={22} color={colors.textMuted} />
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
                  colors={[colors.primary, colors.primary + 'CC']}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarInitial}>{firstInitial}</Text>
                </LinearGradient>
              )}

              {/* Name / Roles / Org */}
              <View style={styles.profileInfo}>
                <Text
                  style={[styles.profileName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                {roleLabels.length > 0 && (
                  <Text
                    style={[styles.profileRoles, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {roleLabels}
                  </Text>
                )}
                <Text
                  style={[styles.profileOrg, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {orgName}
                </Text>
              </View>
            </View>

            {/* View Profile link */}
            <TouchableOpacity
              style={[styles.viewProfileButton, { borderColor: colors.border }]}
              onPress={handleViewProfile}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewProfileText, { color: colors.primary }]}>
                View Profile
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </LinearGradient>

          {/* ====== MENU BODY (Phase 2-3) ====== */}
          <View style={styles.menuBody}>
            <Text style={[styles.menuPlaceholder, { color: colors.textMuted }]}>
              Menu items coming in Phase 2-3
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
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 36,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  profileRoles: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 18,
  },
  profileOrg: {
    fontSize: 12,
    marginTop: 1,
    lineHeight: 16,
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
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },
  // Menu body
  menuBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  menuPlaceholder: {
    fontSize: 14,
  },
});
