/**
 * LeaderboardScreen — standalone component rendered inside standings.tsx.
 *
 * Two views toggled by segmented pills:
 *   1. Grid Overview (default) — mini cards with top 3 per category + Season MVPs
 *   2. Full List — single-category ranked list with team filter + per-game toggle
 *
 * Role-aware highlights:
 *   - Player → highlight self
 *   - Coach  → highlight own team
 *   - Parent → highlight children
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ACHIEVEMENT_IMAGES } from '@/constants/mascot-images';
import { useTheme } from '@/lib/theme';
import {
  LeaderboardEntry,
  LeaderboardCategory,
  useLeaderboardData,
} from '@/hooks/useLeaderboardData';

// ─── Props ──────────────────────────────────────────────────────

export interface LeaderboardScreenProps {
  seasonId: string;
  sport?: string | null;
  highlightPlayerId?: string;
  highlightTeamId?: string;
  highlightPlayerIds?: string[];
  onPlayerTap?: (playerId: string, teamId: string) => void;
  /** Increment to trigger a data refresh from parent */
  refreshTrigger?: number;
  /** Called when an externally-triggered refresh completes */
  onRefreshDone?: () => void;
}

// ─── Constants ──────────────────────────────────────────────────

type ViewMode = 'grid' | 'list';
const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: 'grid', label: 'Overview' },
  { key: 'list', label: 'Full List' },
];

const MEDAL_ICONS = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

// ─── Component ──────────────────────────────────────────────────

export default function LeaderboardScreen({
  seasonId,
  sport,
  highlightPlayerId,
  highlightTeamId,
  highlightPlayerIds,
  onPlayerTap,
  refreshTrigger,
  onRefreshDone,
}: LeaderboardScreenProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const {
    categories,
    leaderboardData,
    teams,
    loading,
    isEmpty,
    mvps,
    getFilteredLeaders,
    getPerGameValue,
    refresh,
  } = useLeaderboardData(seasonId, sport);

  // Handle external refresh triggers
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      refresh().then(() => onRefreshDone?.());
    }
  }, [refreshTrigger]);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showPerGame, setShowPerGame] = useState(false);

  // Default to first category for full list
  const effectiveCategory = activeCategory || categories[0]?.id || '';
  const currentCat = categories.find((c) => c.id === effectiveCategory);

  // ── Highlight helpers ───────────────────────────────────────
  const isHighlighted = useCallback(
    (entry: LeaderboardEntry): boolean => {
      if (highlightPlayerId && entry.playerId === highlightPlayerId) return true;
      if (highlightTeamId && entry.teamId === highlightTeamId) return true;
      if (highlightPlayerIds && highlightPlayerIds.includes(entry.playerId)) return true;
      return false;
    },
    [highlightPlayerId, highlightTeamId, highlightPlayerIds],
  );

  // ── Skeleton pulse animation ─────────────────────────────────
  const pulseAnim = useRef(new RNAnimated.Value(0.3)).current;
  useEffect(() => {
    if (!loading) return;
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [loading]);

  // ── Loading state ───────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.skeletonWrap}>
        {[...Array(4)].map((_, i) => (
          <RNAnimated.View key={i} style={[s.skeletonCard, { opacity: pulseAnim }]}>
            <View style={s.skeletonBar} />
            <View style={[s.skeletonBar, { width: '60%', marginTop: 8 }]} />
            <View style={[s.skeletonBar, { width: '80%', marginTop: 8 }]} />
          </RNAnimated.View>
        ))}
      </View>
    );
  }

  // ── Empty state ─────────────────────────────────────────────
  if (isEmpty) {
    return (
      <View style={s.emptyWrap}>
        <Image source={ACHIEVEMENT_IMAGES.KING_QUEEN_STATS} style={{ width: 120, height: 120, marginBottom: 12 }} resizeMode="contain" accessibilityLabel="No rankings yet" />
        <Text style={[s.emptyTitle, { color: colors.text }]}>No Rankings Yet</Text>
        <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
          Leaderboards will appear once game stats are recorded.{'\n'}Play some games and check back!
        </Text>
      </View>
    );
  }

  // ── Rank badge ──────────────────────────────────────────────
  const RankBadge = ({ rank }: { rank: number }) => {
    if (rank <= 3) {
      return (
        <View style={[s.rankBadge, { backgroundColor: MEDAL_COLORS[rank - 1] + '20', borderColor: MEDAL_COLORS[rank - 1] }]}>
          <Text style={s.rankMedal}>{MEDAL_ICONS[rank - 1]}</Text>
        </View>
      );
    }
    return (
      <View style={[s.rankBadge, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
        <Text style={[s.rankNumber, { color: colors.textMuted }]}>{rank}</Text>
      </View>
    );
  };

  // ── Player avatar ───────────────────────────────────────────
  const PlayerAvatar = ({ entry, size = 32 }: { entry: LeaderboardEntry; size?: number }) => {
    const initials = `${entry.firstName?.[0] || ''}${entry.lastName?.[0] || ''}`.toUpperCase();
    if (entry.photoUrl) {
      return <Image source={{ uri: entry.photoUrl }} style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]} />;
    }
    return (
      <View style={[s.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
        <Text style={[s.avatarInitials, { fontSize: size * 0.38, color: colors.textSecondary }]}>{initials || '?'}</Text>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // GRID VIEW — mini cards for each category
  // ═══════════════════════════════════════════════════════════
  const renderGridView = () => (
    <View>
      {/* Season MVPs Banner */}
      {mvps.length > 0 && (
        <View style={s.mvpBanner}>
          <LinearGradient
            colors={['#F59E0B', '#EF4444', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.mvpGradient}
          >
            <Text style={s.mvpTitle}>Season MVPs</Text>
            <View style={s.mvpRow}>
              {mvps.map((mvp) => (
                <TouchableOpacity
                  key={mvp.category.id}
                  style={s.mvpItem}
                  onPress={() => onPlayerTap?.(mvp.player.playerId, mvp.player.teamId || '')}
                  activeOpacity={0.7}
                >
                  <Text style={s.mvpCatLabel}>{mvp.category.icon} {mvp.category.label}</Text>
                  <PlayerAvatar entry={mvp.player} size={36} />
                  <Text style={s.mvpPlayerName} numberOfLines={1}>
                    {mvp.player.firstName} {mvp.player.lastName?.[0]}.
                  </Text>
                  <Text style={s.mvpStatValue}>{formatStat(mvp.player.statValue, mvp.category)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Mini Leaderboard Cards */}
      <View style={s.cardGrid}>
        {categories.map((cat) => {
          const entries = leaderboardData[cat.id] || [];
          const top3 = entries.slice(0, 3);
          if (top3.length === 0) return null;

          return (
            <View key={cat.id} style={[s.miniCard, { borderColor: colors.glassBorder, backgroundColor: colors.glassCard }]}>
              {/* Card Header */}
              <View style={s.miniCardHeader}>
                <Text style={s.miniCardIcon}>{cat.icon}</Text>
                <Text style={[s.miniCardLabel, { color: cat.color }]}>{cat.label}</Text>
                <Text style={[s.miniCardCount, { color: colors.textMuted }]}>{entries.length} players</Text>
              </View>

              {/* Top 3 */}
              {top3.map((entry, idx) => {
                const highlighted = isHighlighted(entry);
                return (
                  <TouchableOpacity
                    key={entry.playerId}
                    style={[
                      s.miniRow,
                      highlighted && { backgroundColor: cat.color + '12', borderLeftWidth: 2, borderLeftColor: cat.color },
                    ]}
                    onPress={() => onPlayerTap?.(entry.playerId, entry.teamId || '')}
                    activeOpacity={0.7}
                  >
                    <Text style={s.miniRank}>{MEDAL_ICONS[idx]}</Text>
                    <PlayerAvatar entry={entry} size={24} />
                    <View style={s.miniPlayerInfo}>
                      <Text style={[s.miniPlayerName, { color: colors.text }]} numberOfLines={1}>
                        {entry.firstName} {entry.lastName}
                      </Text>
                      {entry.jerseyNumber && (
                        <Text style={[s.miniJersey, { color: colors.textMuted }]}>#{entry.jerseyNumber}</Text>
                      )}
                    </View>
                    <View style={s.miniStatWrap}>
                      <Text style={[s.miniStatValue, { color: cat.color }]}>
                        {formatStat(entry.statValue, cat)}
                      </Text>
                      {!cat.isPercentage && entry.gamesPlayed > 0 && (
                        <Text style={[s.miniPerGame, { color: colors.textMuted }]}>
                          {(entry.statValue / entry.gamesPlayed).toFixed(1)}/g
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* View All */}
              {entries.length > 3 && (
                <TouchableOpacity
                  style={s.viewAllBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveCategory(cat.id);
                    setViewMode('list');
                  }}
                >
                  <Text style={[s.viewAllText, { color: cat.color }]}>View All →</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  // ═══════════════════════════════════════════════════════════
  // FULL LIST VIEW — single category, all players
  // ═══════════════════════════════════════════════════════════
  const renderListView = () => {
    const entries = getFilteredLeaders(effectiveCategory, selectedTeamId);
    const maxVal = entries.length > 0 ? Math.max(...entries.map((e) => e.statValue), 1) : 1;

    return (
      <View>
        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryPillsContainer}
        >
          {categories.map((cat) => {
            const isActive = effectiveCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  s.categoryPill,
                  { borderColor: colors.border, backgroundColor: colors.glassCard },
                  isActive && { backgroundColor: cat.color + '25', borderColor: cat.color },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCategory(cat.id);
                }}
              >
                <Text
                  style={[
                    s.categoryPillText,
                    { color: colors.textMuted },
                    isActive && { color: cat.color, fontWeight: '700' },
                  ]}
                >
                  {cat.icon} {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Team Filter */}
        {teams.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[s.categoryPillsContainer, { paddingBottom: 8 }]}
          >
            <TouchableOpacity
              style={[
                s.teamPill,
                { borderColor: colors.border, backgroundColor: colors.glassCard },
                !selectedTeamId && { backgroundColor: colors.primary + '25', borderColor: colors.primary },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedTeamId(null);
              }}
            >
              <Text style={[s.teamPillText, { color: colors.textMuted }, !selectedTeamId && { color: colors.primary, fontWeight: '700' }]}>
                All Teams
              </Text>
            </TouchableOpacity>
            {teams.map((t) => {
              const isActive = selectedTeamId === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    s.teamPill,
                    { borderColor: colors.border, backgroundColor: colors.glassCard },
                    isActive && { backgroundColor: colors.primary + '25', borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedTeamId(t.id);
                  }}
                >
                  <Text style={[s.teamPillText, { color: colors.textMuted }, isActive && { color: colors.primary, fontWeight: '700' }]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Per-Game Toggle */}
        {currentCat && !currentCat.isPercentage && (
          <View style={s.perGameRow}>
            <Text style={[s.perGameLabel, { color: colors.textSecondary }]}>Sort by Per-Game Average</Text>
            <TouchableOpacity
              style={[s.perGameToggle, showPerGame && { backgroundColor: (currentCat.color || colors.primary) + '25' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowPerGame(!showPerGame);
              }}
            >
              <Text style={[s.perGameToggleText, { color: showPerGame ? currentCat.color : colors.textMuted }]}>
                {showPerGame ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Ranked List */}
        {entries.length === 0 ? (
          <View style={s.emptyCategory}>
            <Ionicons name="stats-chart-outline" size={32} color={colors.textMuted} />
            <Text style={[s.emptyCategoryText, { color: colors.textMuted }]}>
              No {currentCat?.label.toLowerCase() || 'stats'} recorded yet
            </Text>
          </View>
        ) : (
          <View style={[s.listCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            {entries.map((entry, idx) => {
              const rank = idx + 1;
              const highlighted = isHighlighted(entry);
              const barWidth = (entry.statValue / maxVal) * 100;
              const perGame = getPerGameValue(entry);
              const displayValue = showPerGame && !currentCat?.isPercentage && perGame !== null ? perGame : entry.statValue;

              return (
                <TouchableOpacity
                  key={entry.playerId}
                  style={[
                    s.listRow,
                    idx % 2 !== 0 && { backgroundColor: colors.glassBorder },
                    highlighted && { borderLeftWidth: 3, borderLeftColor: currentCat?.color || colors.primary },
                  ]}
                  onPress={() => onPlayerTap?.(entry.playerId, entry.teamId || '')}
                  activeOpacity={0.7}
                >
                  {/* Stat bar */}
                  <View style={[s.statBar, { width: `${barWidth}%`, backgroundColor: (currentCat?.color || '#888') + '12' }]} />

                  {/* Rank */}
                  <View style={s.listRankCol}>
                    <RankBadge rank={rank} />
                  </View>

                  {/* Player */}
                  <View style={s.listPlayerCol}>
                    <PlayerAvatar entry={entry} size={36} />
                    <View style={s.listPlayerInfo}>
                      <View style={s.listPlayerNameRow}>
                        <Text style={[s.listPlayerName, { color: colors.text }]} numberOfLines={1}>
                          {entry.firstName} {entry.lastName}
                        </Text>
                        {highlighted && highlightPlayerId === entry.playerId && (
                          <View style={[s.youBadge, { backgroundColor: currentCat?.color || colors.primary }]}>
                            <Text style={s.youBadgeText}>YOU</Text>
                          </View>
                        )}
                      </View>
                      <View style={s.listPlayerMeta}>
                        {entry.jerseyNumber && (
                          <Text style={[s.listJersey, { color: colors.textMuted }]}>#{entry.jerseyNumber}</Text>
                        )}
                        {entry.teamName && (
                          <Text style={[s.listTeamName, { color: colors.textMuted }]} numberOfLines={1}>
                            {entry.jerseyNumber ? ' · ' : ''}{entry.teamName}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Stat */}
                  <View style={s.listStatCol}>
                    <Text style={[s.listStatValue, { color: currentCat?.color || '#888' }, rank <= 3 && { fontWeight: '800', fontSize: 20 }]}>
                      {currentCat?.isPercentage
                        ? formatPercentage(showPerGame ? displayValue : entry.statValue)
                        : (showPerGame ? displayValue.toFixed(1) : entry.statValue)}
                    </Text>
                    {!currentCat?.isPercentage && perGame !== null ? (
                      <Text style={[s.listGamesPlayed, { color: colors.textMuted }]}>
                        {showPerGame
                          ? `${entry.gamesPlayed} gm${entry.gamesPlayed !== 1 ? 's' : ''}`
                          : `${perGame}/game`}
                      </Text>
                    ) : (
                      <Text style={[s.listGamesPlayed, { color: colors.textMuted }]}>
                        {entry.gamesPlayed} gm{entry.gamesPlayed !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <View>
      {/* View Mode Toggle */}
      <View style={s.viewToggleRow}>
        {VIEW_TABS.map((tab) => {
          const isActive = viewMode === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                s.viewToggle,
                { borderColor: colors.border, backgroundColor: colors.glassCard },
                isActive && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setViewMode(tab.key);
              }}
            >
              <Ionicons
                name={tab.key === 'grid' ? 'grid-outline' : 'list-outline'}
                size={16}
                color={isActive ? colors.primary : colors.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text style={[s.viewToggleText, { color: colors.textMuted }, isActive && { color: colors.primary, fontWeight: '700' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {viewMode === 'grid' ? renderGridView() : renderListView()}
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

function formatStat(value: number, cat: LeaderboardCategory): string {
  if (cat.isPercentage) return formatPercentage(value);
  return String(value);
}

function formatPercentage(value: number): string {
  if (value > 1) return `${value.toFixed(1)}%`;
  return `${(value * 100).toFixed(1)}%`;
}

// ─── Styles ─────────────────────────────────────────────────────

const createStyles = (colors: any) =>
  StyleSheet.create({
    // ── Loading skeleton ──
    skeletonWrap: {
      padding: 16,
      gap: 12,
    },
    skeletonCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    skeletonBar: {
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.bgSecondary,
      width: '100%',
    },

    // ── Empty state ──
    emptyWrap: {
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    emptyIcon: {
      fontSize: 48,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },

    // ── View toggle ──
    viewToggleRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    viewToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    viewToggleText: {
      fontSize: 13,
      fontWeight: '500',
    },

    // ═══════════════════════════════════════
    // GRID VIEW
    // ═══════════════════════════════════════

    // ── MVP Banner ──
    mvpBanner: {
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 16,
      overflow: 'hidden',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
        android: { elevation: 8 },
      }),
    },
    mvpGradient: {
      padding: 16,
    },
    mvpTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 12,
      textAlign: 'center',
    },
    mvpRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    mvpItem: {
      alignItems: 'center',
      gap: 4,
      flex: 1,
    },
    mvpCatLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.85)',
      marginBottom: 4,
    },
    mvpPlayerName: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
      marginTop: 4,
    },
    mvpStatValue: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },

    // ── Card Grid ──
    cardGrid: {
      paddingHorizontal: 16,
      gap: 12,
    },
    miniCard: {
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
        android: { elevation: 3 },
      }),
    },
    miniCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 6,
    },
    miniCardIcon: {
      fontSize: 16,
    },
    miniCardLabel: {
      fontSize: 15,
      fontWeight: '700',
      flex: 1,
    },
    miniCardCount: {
      fontSize: 11,
    },
    miniRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      gap: 8,
    },
    miniRank: {
      fontSize: 14,
      width: 24,
      textAlign: 'center',
    },
    miniPlayerInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    miniPlayerName: {
      fontSize: 13,
      fontWeight: '600',
    },
    miniJersey: {
      fontSize: 11,
    },
    miniStatWrap: {
      alignItems: 'flex-end',
    },
    miniStatValue: {
      fontSize: 15,
      fontWeight: '700',
    },
    miniPerGame: {
      fontSize: 9,
      marginTop: 1,
    },
    viewAllBtn: {
      paddingVertical: 10,
      alignItems: 'center',
    },
    viewAllText: {
      fontSize: 13,
      fontWeight: '600',
    },

    // ═══════════════════════════════════════
    // FULL LIST VIEW
    // ═══════════════════════════════════════

    // ── Category pills ──
    categoryPillsContainer: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    categoryPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    categoryPillText: {
      fontSize: 13,
      fontWeight: '500',
    },

    // ── Team pills ──
    teamPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
    },
    teamPillText: {
      fontSize: 12,
      fontWeight: '500',
    },

    // ── Per-game toggle ──
    perGameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    perGameLabel: {
      fontSize: 13,
      fontWeight: '500',
    },
    perGameToggle: {
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
    },
    perGameToggleText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
    },

    // ── Empty category ──
    emptyCategory: {
      alignItems: 'center',
      paddingVertical: 40,
      gap: 8,
    },
    emptyCategoryText: {
      fontSize: 14,
    },

    // ── List card ──
    listCard: {
      marginHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 6 },
      }),
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      position: 'relative',
      overflow: 'hidden',
    },
    statBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
    },
    listRankCol: {
      width: 36,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    rankBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankMedal: {
      fontSize: 14,
    },
    rankNumber: {
      fontSize: 12,
      fontWeight: '700',
    },
    listPlayerCol: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 8,
      zIndex: 1,
    },
    avatar: {
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
      marginRight: 10,
    },
    avatarPlaceholder: {
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    avatarInitials: {
      fontWeight: '700',
    },
    listPlayerInfo: {
      flex: 1,
    },
    listPlayerNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    listPlayerName: {
      fontSize: 14,
      fontWeight: '600',
      flexShrink: 1,
    },
    youBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    youBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    listPlayerMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 1,
    },
    listJersey: {
      fontSize: 11,
    },
    listTeamName: {
      fontSize: 11,
      flexShrink: 1,
    },
    listStatCol: {
      width: 60,
      alignItems: 'flex-end',
      justifyContent: 'center',
      zIndex: 1,
    },
    listStatValue: {
      fontSize: 18,
      fontWeight: '700',
    },
    listGamesPlayed: {
      fontSize: 9,
      marginTop: 1,
    },
  });
