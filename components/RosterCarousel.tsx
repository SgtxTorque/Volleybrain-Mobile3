/**
 * RosterCarousel — swipeable horizontal card carousel for browsing team roster.
 * Translated from v0 mockup: m1-roster-carousel.tsx
 *
 * Each card shows player photo, jersey watermark, position badge, name,
 * and mini stat power bars. Tap a card → full PlayerTradingCard screen.
 */
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { getPlayerPlaceholder } from '@/lib/default-images';
import { getPositionInfo } from '@/constants/sport-display';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from './PlayerHomeScroll';
import type { PlayerTradingCardPlayer } from './PlayerTradingCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.78;
const CARD_SPACING = 12;

// ─── Types ──────────────────────────────────────────────────────
export interface RosterCarouselProps {
  teamId: string;
  teamName: string;
  teamColor?: string | null;
  seasonName?: string | null;
  players: PlayerTradingCardPlayer[];
  onPlayerTap?: (playerId: string) => void;
  /** Show the header with team info + level bar */
  showHeader?: boolean;
}

// ─── Mini Power Bar ─────────────────────────────────────────────
function MiniBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.round(value));
  const color =
    pct >= 80 ? '#FFD700' :
    pct >= 60 ? '#4BB9EC' :
    pct >= 40 ? 'rgba(106,196,238,0.6)' :
    '#64748B';
  return (
    <View style={s.miniBarRow}>
      <Text style={s.miniBarLabel}>{label}</Text>
      <View style={s.miniBarTrack}>
        <View style={[s.miniBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[s.miniBarValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── Player Carousel Card ───────────────────────────────────────
function CarouselCard({
  player,
  onTap,
}: {
  player: PlayerTradingCardPlayer;
  onTap: () => void;
}) {
  const posInfo = getPositionInfo(player.position, player.sportName);
  const posColor = posInfo?.color || '#4BB9EC';
  const teamColor = player.teamColor || '#C41E3A';
  const hasPhoto = player.photoUrl && player.photoUrl.length > 0;
  const initials = ((player.firstName?.[0] || '') + (player.lastName?.[0] || '')).toUpperCase();
  const jerseyNum = player.jerseyNumber ? String(player.jerseyNumber) : '';

  // Top 3 stats
  const topStats = (player.stats || []).slice(0, 3);

  return (
    <TouchableOpacity
      style={s.carouselCard}
      onPress={onTap}
      activeOpacity={0.92}
    >
      {/* Photo area */}
      <LinearGradient
        colors={[teamColor, darken(teamColor, 0.4), darken(teamColor, 0.7)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.cardPhotoArea}
      >
        {/* Jersey watermark */}
        {jerseyNum !== '' && (
          <View style={s.cardWatermarkWrap}>
            <Text style={s.cardWatermark}>{jerseyNum}</Text>
          </View>
        )}

        {/* Lynx badge */}
        <View style={s.cardLynxBadge}>
          <Text style={s.cardLynxText}>L</Text>
        </View>

        {/* Avatar */}
        {hasPhoto ? (
          <Image source={{ uri: player.photoUrl! }} style={s.cardHeroPhoto} resizeMode="cover" />
        ) : (
          <View style={s.cardAvatarWrap}>
            <Image source={getPlayerPlaceholder()} style={s.cardPlaceholder} resizeMode="contain" />
          </View>
        )}

        {/* Mini avatar top-right */}
        <View style={s.cardMiniAvatar}>
          <Text style={s.cardMiniAvatarText}>{initials}</Text>
        </View>

        {/* Team color bar */}
        <LinearGradient
          colors={[teamColor, '#FFD700', teamColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.cardTeamBar}
        />
      </LinearGradient>

      {/* Name plate */}
      <View style={s.cardNamePlate}>
        {/* Position badge */}
        {player.position && (
          <View style={[s.cardPosBadge, { backgroundColor: posColor }]}>
            <Text style={s.cardPosText}>{player.position}</Text>
          </View>
        )}

        <Text style={s.cardFirstName}>{player.firstName?.toUpperCase()}</Text>
        <Text style={s.cardLastName}>{player.lastName?.toUpperCase()}</Text>

        <View style={s.cardMetaRow}>
          {jerseyNum !== '' && <Text style={s.cardMetaText}>#{jerseyNum}</Text>}
          {jerseyNum !== '' && player.teamName && <View style={s.cardDot} />}
          <Text style={[s.cardTeamName, { color: teamColor }]} numberOfLines={1}>{player.teamName}</Text>
        </View>

        {/* Mini stat bars */}
        {topStats.length > 0 && (
          <View style={s.cardStatsWrap}>
            {topStats.map((st, i) => (
              <MiniBar key={`${st.label}-${i}`} label={st.label} value={st.value} />
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function RosterCarousel({
  teamId,
  teamName,
  teamColor,
  seasonName,
  players,
  onPlayerTap,
  showHeader = true,
}: RosterCarouselProps) {
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const isTablet = screenW >= 744;
  const cardWidth = isTablet ? Math.min(screenW * 0.4, 350) : screenW * 0.78;
  const cardSpacing = isTablet ? 16 : CARD_SPACING;
  const [activeIndex, setActiveIndex] = useState(0);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const handleTap = (playerId: string) => {
    if (onPlayerTap) {
      onPlayerTap(playerId);
    } else {
      router.push(`/player-card?playerId=${playerId}` as any);
    }
  };

  if (players.length === 0) return null;

  return (
    <View>
      {/* Header */}
      {showHeader && (
        <View style={s.header}>
          <Text style={s.headerLabel}>MY TEAM</Text>
          <Text style={s.headerTeamName}>{teamName.toUpperCase()}</Text>
          <Text style={s.headerMeta}>
            {seasonName || ''}{seasonName ? ' \u00B7 ' : ''}{players.length} player{players.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Carousel */}
      <FlatList
        data={players}
        keyExtractor={p => p.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + cardSpacing}
        decelerationRate="fast"
        contentContainerStyle={s.listContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={{ width: cardWidth, marginRight: cardSpacing }}>
            <CarouselCard
              player={item}
              onTap={() => handleTap(item.id)}
            />
          </View>
        )}
      />

      {/* Dot indicators */}
      <View style={s.dotsRow}>
        {players.map((_, i) => (
          <View
            key={i}
            style={[
              s.dot,
              i === activeIndex
                ? { width: 24, backgroundColor: '#4BB9EC' }
                : { width: 8, backgroundColor: 'rgba(255,255,255,0.10)' },
            ]}
          />
        ))}
      </View>

      {/* Swipe hint */}
      <Text style={s.swipeHint}>Swipe to browse roster</Text>
    </View>
  );
}

// ─── Utility ────────────────────────────────────────────────────
function darken(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  if (c.length < 6) return hex;
  const r = Math.max(0, Math.round(parseInt(c.substring(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(c.substring(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(c.substring(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: 'rgba(75,185,236,0.60)',
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerTeamName: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: 1,
    lineHeight: 30,
  },
  headerMeta: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: 'rgba(255,255,255,0.30)',
    marginTop: 2,
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },

  // Carousel card
  carouselCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(75,185,236,0.15)',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 60 }
      : { elevation: 10 }),
  },
  cardPhotoArea: {
    height: 260,
    position: 'relative',
    overflow: 'hidden',
  },
  cardWatermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWatermark: {
    fontFamily: FONTS.display,
    fontSize: 200,
    color: 'rgba(255,255,255,0.06)',
    lineHeight: 200,
  },
  cardLynxBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.30)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    zIndex: 5,
  },
  cardLynxText: {
    fontSize: 16,
    fontFamily: FONTS.bodyExtraBold,
    color: '#4BB9EC',
  },
  cardHeroPhoto: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    height: 200,
    resizeMode: 'contain',
  },
  cardAvatarWrap: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPlaceholder: {
    width: 120,
    height: 120,
    opacity: 0.25,
  },
  cardMiniAvatar: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  cardMiniAvatarText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: 'rgba(255,255,255,0.80)',
  },
  cardTeamBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },

  // Name plate
  cardNamePlate: {
    backgroundColor: '#0D1B3E',
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'relative',
  },
  cardPosBadge: {
    position: 'absolute',
    top: -14,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardPosText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: '#0D1B3E',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardFirstName: {
    fontFamily: FONTS.display,
    fontSize: 36,
    lineHeight: 36,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cardLastName: {
    fontFamily: FONTS.display,
    fontSize: 36,
    lineHeight: 36,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  cardMetaText: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: 'rgba(255,255,255,0.30)',
  },
  cardDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  cardTeamName: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    flex: 1,
  },
  cardStatsWrap: {
    marginTop: 12,
    gap: 6,
  },

  // Mini bar
  miniBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniBarLabel: {
    fontSize: 9,
    fontFamily: FONTS.bodySemiBold,
    color: 'rgba(255,255,255,0.40)',
    width: 32,
  },
  miniBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(75,185,236,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: 6,
    borderRadius: 3,
  },
  miniBarValue: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    width: 24,
    textAlign: 'right',
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Swipe hint
  swipeHint: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: 'rgba(255,255,255,0.15)',
    textAlign: 'center',
    marginTop: 8,
  },
});
