import { ViewStyle } from 'react-native';

/**
 * Lynx brand spacing, radius, and shadow tokens.
 */
export const SPACING = {
  pagePadding: 20,
  cardPadding: 16,
  cardRadius: 16,
  heroCardRadius: 22,
  cardGap: 12,
  sectionGap: 16,
} as const;

export const SHADOWS: Record<string, ViewStyle> = {
  light: {
    shadowColor: '#10284C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  hero: {
    shadowColor: '#10284C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;
