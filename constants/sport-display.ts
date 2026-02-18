/**
 * Multi-sport display configuration for player cards
 * Position colors, stat displays, and sport-specific layouts
 */

export interface PositionConfig {
  full: string;
  color: string;
}

export interface StatConfig {
  key: string;
  label: string;
  short: string;
  icon: string;
  color: string;
}

export interface SportDisplayConfig {
  positions: Record<string, PositionConfig>;
  primaryStats: StatConfig[];
  icon: string;
}

const SPORT_DISPLAY: Record<string, SportDisplayConfig> = {
  volleyball: {
    positions: {
      'OH': { full: 'Outside Hitter', color: '#FF6B6B' },
      'S': { full: 'Setter', color: '#4ECDC4' },
      'MB': { full: 'Middle Blocker', color: '#45B7D1' },
      'OPP': { full: 'Opposite', color: '#96CEB4' },
      'L': { full: 'Libero', color: '#FFEAA7' },
      'DS': { full: 'Defensive Specialist', color: '#DDA0DD' },
      'RS': { full: 'Right Side', color: '#FF9F43' },
    },
    primaryStats: [
      { key: 'kills', label: 'Kills', short: 'K', icon: '⚡', color: '#F59E0B' },
      { key: 'digs', label: 'Digs', short: 'D', icon: '💎', color: '#06B6D4' },
      { key: 'aces', label: 'Aces', short: 'A', icon: '🎯', color: '#EC4899' },
      { key: 'blocks', label: 'Blocks', short: 'B', icon: '🛡️', color: '#6366F1' },
      { key: 'assists', label: 'Assists', short: 'AST', icon: '🤝', color: '#10B981' },
    ],
    icon: '🏐',
  },
  basketball: {
    positions: {
      'PG': { full: 'Point Guard', color: '#FF6B6B' },
      'SG': { full: 'Shooting Guard', color: '#4ECDC4' },
      'SF': { full: 'Small Forward', color: '#45B7D1' },
      'PF': { full: 'Power Forward', color: '#96CEB4' },
      'C': { full: 'Center', color: '#FF9F43' },
    },
    primaryStats: [
      { key: 'points', label: 'Points', short: 'PTS', icon: '🏀', color: '#F59E0B' },
      { key: 'rebounds', label: 'Rebounds', short: 'REB', icon: '📊', color: '#06B6D4' },
      { key: 'assists', label: 'Assists', short: 'AST', icon: '🤝', color: '#10B981' },
      { key: 'steals', label: 'Steals', short: 'STL', icon: '🖐️', color: '#8B5CF6' },
      { key: 'blocks', label: 'Blocks', short: 'BLK', icon: '🛡️', color: '#6366F1' },
    ],
    icon: '🏀',
  },
  soccer: {
    positions: {
      'GK': { full: 'Goalkeeper', color: '#FFEAA7' },
      'Defender': { full: 'Defender', color: '#4ECDC4' },
      'Midfielder': { full: 'Midfielder', color: '#FF6B6B' },
      'Forward': { full: 'Forward', color: '#EF4444' },
    },
    primaryStats: [
      { key: 'goals', label: 'Goals', short: 'G', icon: '⚽', color: '#F59E0B' },
      { key: 'assists', label: 'Assists', short: 'A', icon: '🤝', color: '#10B981' },
      { key: 'shots', label: 'Shots', short: 'SH', icon: '🎯', color: '#06B6D4' },
      { key: 'saves', label: 'Saves', short: 'SV', icon: '🧤', color: '#8B5CF6' },
      { key: 'fouls', label: 'Fouls', short: 'F', icon: '🟡', color: '#EF4444' },
    ],
    icon: '⚽',
  },
  baseball: {
    positions: {
      'Pitcher': { full: 'Pitcher', color: '#FF6B6B' },
      'Catcher': { full: 'Catcher', color: '#4ECDC4' },
      'Infield': { full: 'Infield', color: '#45B7D1' },
      'Outfield': { full: 'Outfield', color: '#10B981' },
    },
    primaryStats: [
      { key: 'hits', label: 'Hits', short: 'H', icon: '⚾', color: '#F59E0B' },
      { key: 'runs', label: 'Runs', short: 'R', icon: '🏃', color: '#10B981' },
      { key: 'rbis', label: 'RBIs', short: 'RBI', icon: '📊', color: '#06B6D4' },
      { key: 'home_runs', label: 'HRs', short: 'HR', icon: '💪', color: '#EF4444' },
      { key: 'stolen_bases', label: 'SBs', short: 'SB', icon: '⚡', color: '#8B5CF6' },
    ],
    icon: '⚾',
  },
  football: {
    positions: {
      'Quarterback': { full: 'Quarterback', color: '#FF6B6B' },
      'Running Back': { full: 'Running Back', color: '#4ECDC4' },
      'Wide Receiver': { full: 'Wide Receiver', color: '#45B7D1' },
      'Tight End': { full: 'Tight End', color: '#96CEB4' },
      'Defensive Line': { full: 'Defensive Line', color: '#DDA0DD' },
      'Linebacker': { full: 'Linebacker', color: '#FFEAA7' },
      'Defensive Back': { full: 'Defensive Back', color: '#8B5CF6' },
    },
    primaryStats: [
      { key: 'passing_yards', label: 'Pass Yds', short: 'PY', icon: '🏈', color: '#F59E0B' },
      { key: 'rushing_yards', label: 'Rush Yds', short: 'RY', icon: '🏃', color: '#06B6D4' },
      { key: 'receiving_yards', label: 'Rec Yds', short: 'RCY', icon: '🙌', color: '#10B981' },
      { key: 'total_tds', label: 'TDs', short: 'TD', icon: '⚡', color: '#EF4444' },
      { key: 'tackles', label: 'Tackles', short: 'TKL', icon: '🛡️', color: '#8B5CF6' },
    ],
    icon: '🏈',
  },
  hockey: {
    positions: {
      'Goalie': { full: 'Goalie', color: '#FFEAA7' },
      'Defense': { full: 'Defense', color: '#4ECDC4' },
      'Center': { full: 'Center', color: '#96CEB4' },
      'Wing': { full: 'Wing', color: '#FF6B6B' },
    },
    primaryStats: [
      { key: 'goals', label: 'Goals', short: 'G', icon: '🏒', color: '#F59E0B' },
      { key: 'assists', label: 'Assists', short: 'A', icon: '🤝', color: '#10B981' },
      { key: 'shots', label: 'Shots', short: 'SH', icon: '🎯', color: '#06B6D4' },
      { key: 'saves', label: 'Saves', short: 'SV', icon: '🧤', color: '#8B5CF6' },
      { key: 'plus_minus', label: '+/-', short: '+/-', icon: '📊', color: '#EF4444' },
    ],
    icon: '🏒',
  },
};

// Aliases
SPORT_DISPLAY['flag football'] = SPORT_DISPLAY.football;
SPORT_DISPLAY['flagfootball'] = SPORT_DISPLAY.football;
SPORT_DISPLAY['softball'] = { ...SPORT_DISPLAY.baseball, icon: '🥎' };

/**
 * Get sport-specific display config
 * Defaults to volleyball if sport not found
 */
export function getSportDisplay(sportName?: string | null): SportDisplayConfig {
  if (!sportName) return SPORT_DISPLAY.volleyball;
  
  const key = sportName.toLowerCase().trim();
  return (
    SPORT_DISPLAY[key] ||
    SPORT_DISPLAY[key.replace(/\s+/g, '')] ||
    SPORT_DISPLAY.volleyball
  );
}

/**
 * Get position info with color
 */
export function getPositionInfo(position: string | null | undefined, sport?: string | null) {
  if (!position) return null;
  const config = getSportDisplay(sport);
  const posInfo = config.positions[position];
  if (posInfo) return posInfo;
  
  // Try to find it case-insensitively
  for (const [key, val] of Object.entries(config.positions)) {
    if (key.toLowerCase() === position.toLowerCase()) {
      return val;
    }
  }
  return null;
}

export default SPORT_DISPLAY;
