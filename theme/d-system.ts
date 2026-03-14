/**
 * D System design tokens — extends existing BRAND tokens.
 * Used by the Coach Home Scroll D redesign.
 */
import { BRAND } from './colors';

export const D_COLORS = {
  // Re-export existing brand colors for convenience
  ...BRAND,

  // D System surfaces
  pageBg: '#FAFBFE',

  // D System text variants
  textAmbient: 'rgba(11,22,40,0.2)',

  // Accent backgrounds for action grid
  blastBg: '#FFF0F0',
  blastIcon: '#FFD4D4',
  shoutBg: '#FFF8E1',
  shoutIcon: '#FFE8A0',
  statsBg: '#E8F8F5',
  statsIcon: '#B2F5EA',
  challengeBg: '#F0EDFF',
  challengeIcon: '#DDD6FE',

  // Nudge card
  nudgeBgStart: '#FFF8E1',
  nudgeBgEnd: '#FFF0DB',

  // Momentum card gradients
  streakStart: '#FF6B6B',
  streakEnd: '#e55039',
  recordStart: '#22C55E',
  recordEnd: '#0ea371',
  attendStart: '#8B5CF6',
  attendEnd: '#6c2bd9',
  killsStart: '#4BB9EC',
  killsEnd: '#2980b9',

  // Mascot greeting gradient
  mascotBgStart: '#FFF3D6',
  mascotBgEnd: '#FFE8A0',

  // Message bar border colors
  barInfo: '#4BB9EC',
  barUrgent: '#E76F51',
  barPayment: '#F59E0B',
} as const;

export const D_RADII = {
  hero: 22,
  card: 18,
  cardSmall: 14,
  actionCell: 16,
  pill: 20,
  badge: 14,
  momentum: 16,
} as const;
