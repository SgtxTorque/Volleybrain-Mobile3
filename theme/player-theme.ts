// ─── Player Dark Theme ──────────────────────────────────────────
// Extracted from PlayerHomeScroll to break circular dependency with TeamPulse.
export const PLAYER_THEME = {
  bg: '#0D1B3E',
  cardBg: '#10284C',
  cardBgHover: '#162848',
  cardBgSubtle: 'rgba(255,255,255,0.03)',
  accent: '#4BB9EC',
  gold: '#FFD700',
  goldGlow: 'rgba(255,215,0,0.3)',
  success: '#22C55E',
  error: '#EF4444',
  purple: '#A855F7',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.60)',
  textMuted: 'rgba(255,255,255,0.30)',
  textFaint: 'rgba(255,255,255,0.15)',
  border: 'rgba(255,255,255,0.06)',
  borderAccent: 'rgba(75,185,236,0.15)',
  borderGold: 'rgba(255,215,0,0.20)',

  // Player D+ additions
  questCard: 'rgba(75,185,236,0.06)',
  questDone: 'rgba(34,197,94,0.06)',
  streakFire: '#FF6B6B',
  xpGold: '#FFD700',
} as const;
