import { Platform, TextStyle, ViewStyle } from 'react-native';

// ============================================
// TYPOGRAPHY
// ============================================

export const fonts = {
  display: 'Oswald-Bold',
  body: undefined as string | undefined, // system default
} as const;

export const fontSizes = {
  heroTitle: 22,
  sectionHeader: 15,
  cardTitle: 18,
  cardSubtitle: 13,
  matchTime: 18,
  statNumber: 26,
  statLabel: 9,
  body: 12,
  bodySmall: 11,
  caption: 10,
  micro: 9,
  badge: 10,
} as const;

/** Condensed bold uppercase style for display headings */
export const displayTextStyle: TextStyle = {
  fontFamily: 'Oswald-Bold',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
};

// ============================================
// SPACING
// ============================================

export const spacing = {
  screenPadding: 16,
  cardMarginH: 16,
  cardMarginB: 10,
  cardPaddingH: 14,
  cardPaddingV: 12,
  sectionHeaderPaddingT: 14,
  sectionHeaderPaddingB: 6,
  statGap: 8,
} as const;

// ============================================
// RADII
// ============================================

export const radii = {
  card: 12,
  badge: 20,
  pillTab: 24,
  avatar: 999,
  statBox: 10,
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2.2 },
      shadowOpacity: 0.088,
      shadowRadius: 13.2,
    },
    android: {
      elevation: 3.3,
    },
  })!,
  cardHover: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4.4 },
      shadowOpacity: 0.132,
      shadowRadius: 17.6,
    },
    android: {
      elevation: 5.5,
    },
  })!,
  nav: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
  })!,
} as const;
