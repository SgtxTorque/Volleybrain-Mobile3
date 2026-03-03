/**
 * Lynx brand color tokens for the Parent Home Scroll redesign.
 * Source: LynxBrandBook.html + CC-PARENT-HOME-SCROLL-REDESIGN.md
 */
export const BRAND = {
  // Core palette
  navyDeep: '#0D1B3E',
  navy: '#10284C',
  skyBlue: '#4BB9EC',
  skyLight: '#6AC4EE',
  gold: '#FFD700',
  goldWarm: '#D9994A',
  white: '#FFFFFF',
  offWhite: '#F6F8FB',
  warmGray: '#F0F2F5',
  border: '#E8ECF2',

  // Text
  textPrimary: '#10284C',
  textMuted: 'rgba(16,40,76,0.4)',
  textFaint: 'rgba(16,40,76,0.25)',

  // Extended palette
  teal: '#2A9D8F',
  coral: '#E76F51',
  goldBrand: '#E9C46A',

  // Semantic
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',

  // Dark surfaces (for dark-themed screens like game day, drawer)
  surfaceDark: '#0A1628',
  surfaceCard: '#1A2744',
  cardBorder: 'rgba(75, 185, 236, 0.12)',

  // Dark-theme text
  textLight: '#E8EDF4',
  textSecondary: '#8A9AB5',
  textTertiary: '#556B8A',

  // Light surfaces
  attentionBannerBg: '#FFF8E1',
  cardBg: '#FFFFFF',
} as const;
