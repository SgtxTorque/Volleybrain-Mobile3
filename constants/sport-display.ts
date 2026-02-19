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
  ionicon: string;
  color: string;
  dbColumn: string;      // column in game_player_stats
  seasonColumn: string;  // column in player_season_stats
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
      { key: 'kills', label: 'Kills', short: 'K', icon: '⚡', ionicon: 'flash', color: '#F59E0B', dbColumn: 'kills', seasonColumn: 'total_kills' },
      { key: 'digs', label: 'Digs', short: 'D', icon: '💎', ionicon: 'shield', color: '#06B6D4', dbColumn: 'digs', seasonColumn: 'total_digs' },
      { key: 'aces', label: 'Aces', short: 'A', icon: '🎯', ionicon: 'star', color: '#EC4899', dbColumn: 'aces', seasonColumn: 'total_aces' },
      { key: 'blocks', label: 'Blocks', short: 'B', icon: '🛡️', ionicon: 'stop', color: '#6366F1', dbColumn: 'blocks', seasonColumn: 'total_blocks' },
      { key: 'assists', label: 'Assists', short: 'AST', icon: '🤝', ionicon: 'people', color: '#10B981', dbColumn: 'assists', seasonColumn: 'total_assists' },
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
      { key: 'basketball_points', label: 'Points', short: 'PTS', icon: '🏀', ionicon: 'basketball', color: '#F59E0B', dbColumn: 'basketball_points', seasonColumn: 'total_basketball_points' },
      { key: 'rebounds', label: 'Rebounds', short: 'REB', icon: '📊', ionicon: 'stats-chart', color: '#06B6D4', dbColumn: 'rebounds', seasonColumn: 'total_rebounds' },
      { key: 'basketball_assists', label: 'Assists', short: 'AST', icon: '🤝', ionicon: 'people', color: '#10B981', dbColumn: 'basketball_assists', seasonColumn: 'total_basketball_assists' },
      { key: 'steals', label: 'Steals', short: 'STL', icon: '🖐️', ionicon: 'hand-left', color: '#8B5CF6', dbColumn: 'steals', seasonColumn: 'total_steals' },
      { key: 'fouls', label: 'Fouls', short: 'PF', icon: '🛡️', ionicon: 'stop', color: '#6366F1', dbColumn: 'fouls', seasonColumn: 'total_fouls' },
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
      { key: 'goals', label: 'Goals', short: 'G', icon: '⚽', ionicon: 'football', color: '#F59E0B', dbColumn: 'goals', seasonColumn: 'total_goals' },
      { key: 'soccer_assists', label: 'Assists', short: 'A', icon: '🤝', ionicon: 'people', color: '#10B981', dbColumn: 'soccer_assists', seasonColumn: 'total_soccer_assists' },
      { key: 'shots', label: 'Shots', short: 'SH', icon: '🎯', ionicon: 'locate', color: '#06B6D4', dbColumn: 'shots_on_goal', seasonColumn: 'total_shots_on_goal' },
      { key: 'saves', label: 'Saves', short: 'SV', icon: '🧤', ionicon: 'hand-left', color: '#8B5CF6', dbColumn: 'saves', seasonColumn: 'total_saves' },
      { key: 'fouls', label: 'Fouls', short: 'F', icon: '🟡', ionicon: 'warning', color: '#EF4444', dbColumn: 'soccer_fouls', seasonColumn: 'total_soccer_fouls' },
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
      { key: 'hits', label: 'Hits', short: 'H', icon: '⚾', ionicon: 'baseball', color: '#F59E0B', dbColumn: 'hits', seasonColumn: 'total_hits' },
      { key: 'runs', label: 'Runs', short: 'R', icon: '🏃', ionicon: 'walk', color: '#10B981', dbColumn: 'runs', seasonColumn: 'total_runs' },
      { key: 'rbis', label: 'RBIs', short: 'RBI', icon: '📊', ionicon: 'stats-chart', color: '#06B6D4', dbColumn: 'rbis', seasonColumn: 'total_rbis' },
      { key: 'home_runs', label: 'HRs', short: 'HR', icon: '💪', ionicon: 'fitness', color: '#EF4444', dbColumn: 'home_runs', seasonColumn: 'total_home_runs' },
      { key: 'stolen_bases', label: 'SBs', short: 'SB', icon: '⚡', ionicon: 'flash', color: '#8B5CF6', dbColumn: 'stolen_bases', seasonColumn: 'total_stolen_bases' },
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
      { key: 'passing_yards', label: 'Pass Yds', short: 'PY', icon: '🏈', ionicon: 'american-football', color: '#F59E0B', dbColumn: 'passing_yards', seasonColumn: 'total_passing_yards' },
      { key: 'rushing_yards', label: 'Rush Yds', short: 'RY', icon: '🏃', ionicon: 'walk', color: '#06B6D4', dbColumn: 'rushing_yards', seasonColumn: 'total_rushing_yards' },
      { key: 'receiving_yards', label: 'Rec Yds', short: 'RCY', icon: '🙌', ionicon: 'hand-left', color: '#10B981', dbColumn: 'receiving_yards', seasonColumn: 'total_receiving_yards' },
      { key: 'passing_tds', label: 'Pass TDs', short: 'PTD', icon: '⚡', ionicon: 'flash', color: '#EF4444', dbColumn: 'passing_tds', seasonColumn: 'total_passing_tds' },
      { key: 'tackles', label: 'Tackles', short: 'TKL', icon: '🛡️', ionicon: 'shield', color: '#8B5CF6', dbColumn: 'tackles', seasonColumn: 'total_tackles' },
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
      { key: 'goals', label: 'Goals', short: 'G', icon: '🏒', ionicon: 'disc', color: '#F59E0B', dbColumn: 'hockey_goals', seasonColumn: 'total_hockey_goals' },
      { key: 'assists', label: 'Assists', short: 'A', icon: '🤝', ionicon: 'people', color: '#10B981', dbColumn: 'hockey_assists', seasonColumn: 'total_hockey_assists' },
      { key: 'shots', label: 'Shots', short: 'SH', icon: '🎯', ionicon: 'locate', color: '#06B6D4', dbColumn: 'hockey_shots', seasonColumn: 'total_hockey_shots' },
      { key: 'saves', label: 'Saves', short: 'SV', icon: '🧤', ionicon: 'hand-left', color: '#8B5CF6', dbColumn: 'hockey_saves', seasonColumn: 'total_hockey_saves' },
      { key: 'plus_minus', label: '+/-', short: '+/-', icon: '📊', ionicon: 'trending-up', color: '#EF4444', dbColumn: 'plus_minus', seasonColumn: 'total_plus_minus' },
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
