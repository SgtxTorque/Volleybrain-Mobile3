import { useDrawer } from '@/lib/drawer-context';
import { useTheme } from '@/lib/theme';
import React, { useEffect } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);
const EDGE_SWIPE_ZONE = 25;
const VELOCITY_THRESHOLD = 500;
const SNAP_THRESHOLD = DRAWER_WIDTH * 0.35;
const SPRING_CONFIG = { damping: 22, stiffness: 200, mass: 0.8 };

export default function GestureDrawer() {
  const { isOpen, closeDrawer, openDrawer } = useDrawer();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

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
          {/* Placeholder content — will be replaced in Phase 1-5 */}
          <View style={styles.placeholder}>
            <Text style={[styles.placeholderText, { color: colors.text }]}>
              Drawer Ready
            </Text>
            <Text style={[styles.placeholderSubtext, { color: colors.textMuted }]}>
              Content coming in Phase 1
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
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '700',
  },
  placeholderSubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});
