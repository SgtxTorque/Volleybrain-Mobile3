/**
 * FamilyKidCard — Single-child full card or multi-child compact circle avatars.
 * Single child: rich card with avatar, team, event pill, level.
 * Multi-child: overlapping circle avatars with staggered pop-in (squad treatment).
 */
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { D_RADII } from '@/theme/d-system';
import type { FamilyChild, FamilyEvent } from '@/hooks/useParentHomeData';

const AVATAR_COLORS = [
  '#E76F51', '#4BB9EC', '#22C55E', '#8B5CF6', '#F59E0B', '#2A9D8F',
];

interface Props {
  kids: FamilyChild[];
  nextEvents: FamilyEvent[];
  onOpenFamilyPanel: () => void;
}

// ─── Sub-component: Animated circle avatar with stagger pop-in ──
function PopAvatar({
  child,
  index,
  onPress,
}: {
  child: FamilyChild;
  index: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 50, withSpring(1.0, { damping: 8, stiffness: 150 }));
    opacity.value = withDelay(index * 50, withTiming(1, { duration: 200 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const initial = child.firstName?.[0]?.toUpperCase() || '?';
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <Animated.View
      style={[
        styles.multiAvatarCol,
        { marginLeft: index === 0 ? 0 : -8, zIndex: 10 - index },
        animStyle,
      ]}
    >
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.multiAvatarTouch}>
        {child.photoUrl ? (
          <Image source={{ uri: child.photoUrl }} style={styles.multiAvatarPhoto} />
        ) : (
          <View style={[styles.multiAvatarFallback, { backgroundColor: color }]}>
            <Text style={styles.multiAvatarInitial}>{initial}</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.multiAvatarName} numberOfLines={1}>
        {child.firstName}
      </Text>
    </Animated.View>
  );
}

// ─── Main component ─────────────────────────────────────────────
function FamilyKidCard({ kids, nextEvents, onOpenFamilyPanel }: Props) {
  const router = useRouter();

  // Deduplicate children by playerId
  const uniqueKids = kids.filter(
    (child, i, arr) => arr.findIndex(c => c.playerId === child.playerId) === i,
  );

  if (uniqueKids.length === 0) return null;

  // ─── Single Child: Full Card ──────────────────────────────
  if (uniqueKids.length === 1) {
    const child = uniqueKids[0];
    const team = child.teams[0];
    const sportColor = team?.sportColor || BRAND.skyBlue;
    const sportEmoji = team?.sportIcon || '\u{1F3D0}';
    const initial = child.firstName?.[0]?.toUpperCase() || '?';
    const nextEvent = nextEvents.find(e => e.childId === child.playerId) || null;

    const eventLabel = nextEvent
      ? `${nextEvent.eventType?.toUpperCase() || 'EVENT'}`
      : null;
    const eventDesc = nextEvent
      ? `${nextEvent.opponentName ? `vs ${nextEvent.opponentName}` : nextEvent.title || ''}${nextEvent.date ? ` \u00B7 ${formatShortDate(nextEvent.date)}` : ''}`
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push('/family-gallery' as any)}
      >
        {/* Avatar with sport badge */}
        <View style={styles.avatarWrap}>
          {child.photoUrl ? (
            <Image source={{ uri: child.photoUrl }} style={[styles.avatar, { borderColor: sportColor }]} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: sportColor }]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={styles.sportBadge}>
            <Text style={styles.sportEmoji}>{sportEmoji}</Text>
          </View>
        </View>

        {/* Name, team, event */}
        <View style={styles.infoCol}>
          <Text style={styles.childName} numberOfLines={1}>
            {child.firstName} {child.lastName}
          </Text>
          {team && (
            <Text style={styles.teamName} numberOfLines={1}>
              {[team.jerseyNumber ? `#${team.jerseyNumber}` : null, team.teamName].filter(Boolean).join(' \u00B7 ')}
            </Text>
          )}
          {eventLabel && eventDesc && (
            <View style={styles.eventRow}>
              <View style={[styles.eventPill, { backgroundColor: nextEvent?.eventType === 'game' ? 'rgba(255,107,107,0.1)' : 'rgba(75,185,236,0.1)' }]}>
                <Text style={[styles.eventPillText, { color: nextEvent?.eventType === 'game' ? BRAND.coral : BRAND.skyBlue }]}>
                  {eventLabel}
                </Text>
              </View>
              <Text style={styles.eventDesc} numberOfLines={1}>{eventDesc}</Text>
            </View>
          )}
        </View>

        {/* Level */}
        {child.level > 0 && (
          <View style={styles.levelCol}>
            <Text style={styles.levelNum}>{child.level}</Text>
            <Text style={styles.levelLabel}>LEVEL</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // ─── Multi-Child: Compact Circle Avatars ──────────────────
  return (
    <View style={styles.multiContainer}>
      <View style={styles.multiRow}>
        {uniqueKids.map((child, index) => (
          <PopAvatar
            key={child.playerId}
            child={child}
            index={index}
            onPress={onOpenFamilyPanel}
          />
        ))}
      </View>
      <TouchableOpacity activeOpacity={0.7} onPress={onOpenFamilyPanel}>
        <Text style={styles.multiHint}>Tap to see your family {'\u2192'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default React.memo(FamilyKidCard);

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Single child: full card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: BRAND.white,
    borderRadius: D_RADII.card,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    padding: 14,
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 22,
    color: BRAND.white,
  },
  sportBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BRAND.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  sportEmoji: {
    fontSize: 12,
  },
  infoCol: {
    flex: 1,
  },
  childName: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 15,
    color: BRAND.textPrimary,
  },
  teamName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  eventPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  eventPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  eventDesc: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    flex: 1,
  },
  levelCol: {
    alignItems: 'center',
    paddingLeft: 8,
  },
  levelNum: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 24,
    color: BRAND.textPrimary,
  },
  levelLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: BRAND.textMuted,
    letterSpacing: 0.5,
  },

  // Multi-child: compact circles
  multiContainer: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: BRAND.white,
    borderRadius: D_RADII.card,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  multiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  multiAvatarCol: {
    alignItems: 'center',
    width: 56,
  },
  multiAvatarTouch: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: BRAND.white,
    overflow: 'hidden',
  },
  multiAvatarPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  multiAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiAvatarInitial: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 20,
    color: BRAND.white,
  },
  multiAvatarName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: BRAND.textPrimary,
    marginTop: 4,
    textAlign: 'center',
    width: 56,
  },
  multiHint: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
});
