/**
 * ParentHomeScroll — scroll-driven parent home dashboard.
 * This replaces ParentDashboard's render for the parent role.
 * Data fetching is lifted from the original ParentDashboard and passed as props.
 */
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollAnimations, SCROLL_THRESHOLDS } from '@/hooks/useScrollAnimations';
import { BRAND } from '@/theme/colors';
import { SPACING } from '@/theme/spacing';
import { FONTS } from '@/theme/fonts';

const SECTIONS = [
  { label: 'WELCOME', color: BRAND.skyBlue, height: 220 },
  { label: 'CALENDAR', color: BRAND.skyLight, height: 80 },
  { label: 'EVENT HERO', color: BRAND.navyDeep, height: 200 },
  { label: 'ATTENTION BANNER', color: BRAND.attentionBannerBg, height: 60 },
  { label: 'MY ATHLETE', color: BRAND.offWhite, height: 160 },
  { label: 'METRIC GRID', color: BRAND.warmGray, height: 200 },
  { label: 'TEAM HUB', color: BRAND.white, height: 140 },
  { label: 'SEASON SNAPSHOT', color: BRAND.offWhite, height: 120 },
  { label: 'BADGES', color: BRAND.warmGray, height: 80 },
  { label: 'END', color: BRAND.offWhite, height: 100 },
];

export default function ParentHomeScroll() {
  const insets = useSafeAreaInsets();
  const { scrollY, scrollVelocity, scrollHandler } = useScrollAnimations();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {SECTIONS.map((section) => (
          <View
            key={section.label}
            style={[
              styles.sectionBlock,
              {
                backgroundColor: section.color,
                height: section.height,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionLabel,
                {
                  color:
                    section.color === BRAND.navyDeep ||
                    section.color === BRAND.skyBlue
                      ? BRAND.white
                      : BRAND.textPrimary,
                },
              ]}
            >
              {section.label}
            </Text>
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },
  sectionBlock: {
    marginHorizontal: SPACING.pagePadding,
    marginBottom: SPACING.cardGap,
    borderRadius: SPACING.cardRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
