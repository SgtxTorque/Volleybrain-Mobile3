/**
 * Responsive utilities — single source of truth for breakpoints,
 * scaling factors, and layout helpers used across the entire app.
 *
 * Every screen imports `useResponsive()` to adapt its layout to
 * phone / tablet-portrait / tablet-landscape in real time.
 */
import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isPhone = width < 744;
  const isTablet = width >= 744 && width < 960;
  const isTabletXL = width >= 960;
  const isTabletAny = width >= 744;

  // Scaling factor: 1.0 on phone, scales up on tablet
  const scale = isPhone ? 1 : isTablet ? 1.3 : 1.5;

  // Content max-width: on large tablets, content shouldn't stretch
  // edge-to-edge — center it like a web page
  const contentMaxWidth = isTabletXL ? 1200 : isTablet ? 900 : width;
  const contentPadding = isTabletAny ? 32 : 16;

  // Grid columns: how many cards fit side by side
  const gridColumns = isPhone ? 1 : isTablet ? 2 : 3;
  const cardGridColumns = isPhone ? 2 : isTablet ? 3 : 4;

  // Font scaling
  const fontScale = isPhone ? 1 : isTablet ? 1.15 : 1.25;

  // Touch target minimum
  const minTouchTarget = isPhone ? 44 : 48;

  return {
    width, height, isLandscape, isPhone, isTablet, isTabletXL, isTabletAny,
    scale, contentMaxWidth, contentPadding, gridColumns, cardGridColumns,
    fontScale, minTouchTarget,
  };
}

/**
 * Helper: returns a style object that centers content within
 * `contentMaxWidth` on tablets. No-op on phones.
 */
export function tabletContainer(isTabletAny: boolean, contentMaxWidth: number) {
  if (!isTabletAny) return {};
  return {
    maxWidth: contentMaxWidth,
    alignSelf: 'center' as const,
    width: '100%' as const,
    paddingHorizontal: 32,
  };
}
