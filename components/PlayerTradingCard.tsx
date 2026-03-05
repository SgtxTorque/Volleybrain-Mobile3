/**
 * PlayerTradingCard — FIFA-style full trading card with hero photo,
 * OVR badge, stat power bars, share/view buttons.
 *
 * Translated from v0 mockup: m2-player-card.tsx
 * Dark PLAYER_THEME. Screenshot-worthy.
 */
import React from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getPlayerPlaceholder } from '@/lib/default-images';
import { getPositionInfo, getSportDisplay, StatConfig } from '@/constants/sport-display';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from './PlayerHomeScroll';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 40, 320);

// ─── Types ──────────────────────────────────────────────────────
export interface PlayerTradingCardPlayer {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  jerseyNumber?: number | string | null;
  position?: string | null;
  sportName?: string | null;
  teamName: string;
  teamColor?: string | null;
  seasonName?: string | null;
  level?: number;
  xp?: number;
  xpToNextLevel?: number;
  overallRating?: number; // 0-99 OVR
  stats?: { label: string; value: number; color?: string }[];
  badges?: { id: string; name: string; icon: string; rarity: string }[];
}

export interface PlayerTradingCardProps {
  player: PlayerTradingCardPlayer;
  onShare?: () => void;
  onViewStats?: () => void;
  onClose?: () => void;
  variant?: 'full' | 'compact';
}

// ─── Helpers ────────────────────────────────────────────────────

function getOvrTier(ovr: number): { color: string; glow: string } {
  if (ovr >= 80) return { color: '#FFD700', glow: 'rgba(255,215,0,0.40)' };
  if (ovr >= 60) return { color: '#4BB9EC', glow: 'rgba(75,185,236,0.30)' };
  if (ovr >= 40) return { color: '#6AC4EE', glow: 'rgba(106,196,238,0.20)' };
  return { color: '#64748B', glow: 'rgba(100,116,139,0.15)' };
}

function getCardTag(level?: number): string {
  if (!level || level <= 2) return 'ROOKIE CARD';
  if (level <= 5) return 'RISING STAR';
  if (level <= 8) return 'VETERAN';
  return 'ALL-STAR';
}

function barColor(pct: number): string {
  if (pct >= 80) return '#FFD700';
  if (pct >= 60) return '#4BB9EC';
  if (pct >= 40) return 'rgba(106,196,238,0.6)';
  return '#64748B';
}

function barGradient(pct: number): [string, string] {
  if (pct >= 80) return ['#4BB9EC', '#FFD700'];
  if (pct >= 60) return ['#4BB9EC', '#4BB9EC'];
  if (pct >= 40) return ['rgba(106,196,238,0.6)', 'rgba(106,196,238,0.6)'];
  return ['#64748B', '#64748B'];
}

// ─── Power Bar ──────────────────────────────────────────────────

function PowerBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colors = barGradient(pct);
  return (
    <View style={s.powerBarRow}>
      <Text style={s.powerBarLabel}>{label}</Text>
      <View style={s.powerBarTrack}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[s.powerBarFill, { width: `${pct}%` as any }]}
        />
      </View>
      <Text style={[s.powerBarValue, { color: barColor(pct) }]}>{value}</Text>
    </View>
  );
}

// ─── Compact Variant ────────────────────────────────────────────

function CompactCard({ player }: { player: PlayerTradingCardPlayer }) {
  const posInfo = getPositionInfo(player.position, player.sportName);
  const posColor = posInfo?.color || PLAYER_THEME.accent;
  const ovr = player.overallRating || 0;
  const tier = getOvrTier(ovr);
  const hasPhoto = player.photoUrl && player.photoUrl.length > 0;
  const initials = (player.firstName[0] + player.lastName[0]).toUpperCase();

  return (
    <View style={s.compactCard}>
      {/* Photo */}
      <View style={s.compactPhotoWrap}>
        {hasPhoto ? (
          <Image source={{ uri: player.photoUrl! }} style={s.compactPhoto} />
        ) : (
          <View style={[s.compactPhotoPlaceholder, { backgroundColor: posColor + '20' }]}>
            <Text style={[s.compactInitials, { color: posColor }]}>{initials}</Text>
          </View>
        )}
        {player.position && (
          <View style={[s.compactPosBadge, { backgroundColor: posColor }]}>
            <Text style={s.compactPosText}>{player.position}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={s.compactInfo}>
        <Text style={s.compactName} numberOfLines={1}>
          {player.firstName} {player.lastName}
        </Text>
        <View style={s.compactMeta}>
          {player.jerseyNumber != null && (
            <Text style={s.compactMetaText}>#{player.jerseyNumber}</Text>
          )}
          {player.teamName && (
            <>
              <View style={s.dot} />
              <Text style={s.compactTeam} numberOfLines={1}>{player.teamName}</Text>
            </>
          )}
        </View>
      </View>

      {/* OVR Badge */}
      {ovr > 0 && (
        <View style={[s.compactOvr, { borderColor: tier.color + '50' }]}>
          <Text style={[s.compactOvrNum, { color: tier.color }]}>{ovr}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Full Variant ───────────────────────────────────────────────

function FullCard({ player, onShare, onViewStats }: PlayerTradingCardProps) {
  const { width: screenW } = useWindowDimensions();
  const isTablet = screenW >= 744;
  const cardWidth = isTablet
    ? Math.min(screenW * 0.5, 500)
    : Math.min(screenW - 40, 320);

  const posInfo = getPositionInfo(player.position, player.sportName);
  const posColor = posInfo?.color || PLAYER_THEME.accent;
  const posLabel = posInfo?.full || player.position || '';
  const teamColor = player.teamColor || '#C41E3A';
  const ovr = player.overallRating || 0;
  const tier = getOvrTier(ovr);
  const tag = getCardTag(player.level);
  const hasPhoto = player.photoUrl && player.photoUrl.length > 0;
  const initials = (player.firstName[0] + player.lastName[0]).toUpperCase();
  const jerseyNum = player.jerseyNumber ? String(player.jerseyNumber) : '';

  // Build stat bars from player.stats or sport defaults
  const sportConfig = getSportDisplay(player.sportName);
  const statBars = player.stats && player.stats.length > 0
    ? player.stats.slice(0, 6)
    : sportConfig.primaryStats.slice(0, 5).map((sc: StatConfig) => ({
        label: sc.short,
        value: 0,
        color: sc.color,
      }));

  return (
    <View style={s.fullWrap}>
      {/* Glow behind card */}
      <View style={[s.glowBg, { backgroundColor: PLAYER_THEME.accent + '08', width: cardWidth - 40 }]} />

      <View style={[s.card, { width: cardWidth }]}>
        {/* ── PHOTO AREA ─────────────────────────────────────── */}
        <LinearGradient
          colors={[teamColor, darken(teamColor, 0.4), darken(teamColor, 0.7)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.photoArea}
        >
          {/* Jersey number watermark */}
          {jerseyNum !== '' && (
            <View style={s.watermarkWrap}>
              <Text style={s.watermark}>{jerseyNum}</Text>
            </View>
          )}

          {/* Diagonal accent lines */}
          <View style={s.accentLine1} />
          <View style={s.accentLine2} />

          {/* Lynx badge top-left */}
          <View style={s.lynxBadge}>
            <Text style={s.lynxBadgeText}>L</Text>
          </View>

          {/* Player avatar / photo */}
          {hasPhoto ? (
            <Image source={{ uri: player.photoUrl! }} style={s.heroPhoto} resizeMode="cover" />
          ) : (
            <View style={s.heroAvatarWrap}>
              <Image source={getPlayerPlaceholder()} style={s.heroPlaceholder} resizeMode="contain" />
            </View>
          )}

          {/* Small avatar top-right */}
          <View style={s.miniAvatar}>
            <Text style={s.miniAvatarText}>{initials}</Text>
          </View>

          {/* Season badge top-center */}
          {player.seasonName && (
            <View style={s.seasonBadge}>
              <Text style={s.seasonBadgeText}>{player.seasonName.toUpperCase()}</Text>
            </View>
          )}

          {/* Team color bar at bottom */}
          <LinearGradient
            colors={[teamColor, '#FFD700', teamColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.teamBar}
          />
        </LinearGradient>

        {/* ── INFO PANEL ─────────────────────────────────────── */}
        <View style={s.infoPanel}>
          {/* OVR Badge — floating between sections */}
          {ovr > 0 && (
            <View style={[s.ovrBadge, { borderColor: tier.color + '60' }]}>
              <Text style={[s.ovrNum, { color: tier.color }]}>{ovr}</Text>
              <Text style={[s.ovrLabel, { color: tier.color + '80' }]}>OVR</Text>
            </View>
          )}

          {/* Card tag */}
          <View style={s.tagWrap}>
            <Text style={s.tagText}>{tag}</Text>
          </View>

          {/* Player name */}
          <Text style={s.playerFirst}>{player.firstName.toUpperCase()}</Text>
          <Text style={s.playerLast}>{player.lastName.toUpperCase()}</Text>

          {/* Position + team */}
          <View style={s.posTeamRow}>
            {posLabel !== '' && (
              <View style={s.posRow}>
                <View style={[s.posIcon, { backgroundColor: posColor + '20' }]}>
                  <View style={[s.posCircle, { backgroundColor: posColor }]} />
                </View>
                <Text style={s.posText}>{posLabel.toUpperCase()}</Text>
              </View>
            )}
            {posLabel !== '' && player.teamName !== '' && <View style={s.dot} />}
            <Text style={[s.teamText, { color: teamColor }]} numberOfLines={1}>
              {player.teamName}
            </Text>
          </View>

          {/* Stat Power Bars */}
          <View style={s.statsGrid}>
            {statBars.map((stat, i) => (
              <PowerBar key={`${stat.label}-${i}`} label={stat.label} value={stat.value} />
            ))}
          </View>
        </View>
      </View>

      {/* ── ACTION BUTTONS ─────────────────────────────────── */}
      <View style={[s.actions, { width: cardWidth }]}>
        <TouchableOpacity style={s.shareBtn} onPress={onShare} activeOpacity={0.8}>
          <Ionicons name="share-outline" size={16} color="#0D1B3E" />
          <Text style={s.shareBtnText}>Share Card</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.statsBtn} onPress={onViewStats} activeOpacity={0.8}>
          <Ionicons name="bar-chart-outline" size={16} color={PLAYER_THEME.accent} />
          <Text style={s.statsBtnText}>View Stats</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Export ─────────────────────────────────────────────────

export default function PlayerTradingCard(props: PlayerTradingCardProps) {
  if (props.variant === 'compact') {
    return <CompactCard player={props.player} />;
  }
  return <FullCard {...props} />;
}

// ─── Utility ────────────────────────────────────────────────────

function darken(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(c.substring(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(c.substring(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(c.substring(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─── Styles ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Full card wrapper
  fullWrap: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  glowBg: {
    position: 'absolute',
    top: 8,
    width: CARD_WIDTH - 40,
    height: 420,
    borderRadius: 20,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#4BB9EC', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.08, shadowRadius: 40 }
      : { elevation: 4 }),
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(75,185,236,0.20)',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 25 }, shadowOpacity: 0.6, shadowRadius: 80 }
      : { elevation: 12 }),
  },

  // Photo area
  photoArea: {
    height: 280,
    position: 'relative',
    overflow: 'hidden',
  },
  watermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermark: {
    fontFamily: FONTS.display,
    fontSize: 260,
    color: 'rgba(255,255,255,0.05)',
    lineHeight: 260,
  },
  accentLine1: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 200,
    height: 600,
    backgroundColor: 'rgba(255,215,0,0.04)',
    transform: [{ rotate: '20deg' }],
  },
  accentLine2: {
    position: 'absolute',
    top: -80,
    right: 10,
    width: 120,
    height: 600,
    backgroundColor: 'rgba(255,255,255,0.02)',
    transform: [{ rotate: '20deg' }],
  },
  lynxBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.40)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    zIndex: 5,
  },
  lynxBadgeText: {
    fontSize: 16,
    fontFamily: FONTS.bodyExtraBold,
    color: '#4BB9EC',
  },
  heroPhoto: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    height: 220,
    resizeMode: 'contain',
  },
  heroAvatarWrap: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlaceholder: {
    width: 140,
    height: 140,
    opacity: 0.3,
  },
  miniAvatar: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  miniAvatarText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: 'rgba(255,255,255,0.80)',
  },
  seasonBadge: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.30)',
    zIndex: 5,
  },
  seasonBadgeText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: '#FFD700',
    letterSpacing: 1.5,
  },
  teamBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },

  // Info panel
  infoPanel: {
    backgroundColor: '#0A1528',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    position: 'relative',
  },
  ovrBadge: {
    position: 'absolute',
    top: -28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#0A1528',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    transform: [{ rotate: '45deg' }],
  },
  ovrNum: {
    fontFamily: FONTS.display,
    fontSize: 22,
    lineHeight: 24,
    transform: [{ rotate: '-45deg' }],
  },
  ovrLabel: {
    fontSize: 6,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1.5,
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  tagWrap: {
    position: 'absolute',
    top: -12,
    left: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  tagText: {
    fontSize: 8,
    fontFamily: FONTS.bodyBold,
    color: '#0A1528',
    letterSpacing: 1.2,
  },
  playerFirst: {
    fontFamily: FONTS.display,
    fontSize: 44,
    lineHeight: 42,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  playerLast: {
    fontFamily: FONTS.display,
    fontSize: 44,
    lineHeight: 42,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  posTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 16,
  },
  posRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  posIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  posText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: 'rgba(255,255,255,0.60)',
    letterSpacing: 0.8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  teamText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.5,
    flex: 1,
  },

  // Stats grid (2 columns)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  powerBarRow: {
    width: (CARD_WIDTH - 40 - 8) / 2 - 1, // half width minus gap
    flexDirection: 'column',
    gap: 2,
  },
  powerBarLabel: {
    fontSize: 7,
    fontFamily: FONTS.bodyBold,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  powerBarTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  powerBarFill: {
    height: 5,
    borderRadius: 3,
  },
  powerBarValue: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    alignSelf: 'flex-end',
    marginTop: -1,
  },

  // Action buttons
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: CARD_WIDTH,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4BB9EC',
  },
  shareBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: '#0D1B3E',
  },
  statsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10284C',
    borderWidth: 1,
    borderColor: 'rgba(75,185,236,0.15)',
  },
  statsBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: '#FFFFFF',
  },

  // Compact card
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10284C',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(75,185,236,0.10)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
    height: 76,
  },
  compactPhotoWrap: {
    position: 'relative',
  },
  compactPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  compactPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  compactInitials: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
  },
  compactPosBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  compactPosText: {
    fontSize: 8,
    fontFamily: FONTS.bodyExtraBold,
    color: '#000',
    letterSpacing: 0.3,
  },
  compactInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  compactName: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: '#FFFFFF',
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactMetaText: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: 'rgba(255,255,255,0.35)',
  },
  compactTeam: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: 'rgba(255,255,255,0.35)',
    flex: 1,
  },
  compactOvr: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  compactOvrNum: {
    fontFamily: FONTS.display,
    fontSize: 18,
    lineHeight: 20,
  },
});
