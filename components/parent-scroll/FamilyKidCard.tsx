/**
 * FamilyKidCard — Rich card for each child showing avatar, sport, team,
 * next event, badges, and level.
 */
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { D_COLORS, D_RADII } from '@/theme/d-system';
import type { FamilyChild, FamilyEvent } from '@/hooks/useParentHomeData';

interface Props {
  child: FamilyChild;
  nextEvent: FamilyEvent | null;
}

function FamilyKidCard({ child, nextEvent }: Props) {
  const router = useRouter();

  const team = child.teams[0];
  const sportColor = team?.sportColor || BRAND.skyBlue;
  const sportEmoji = team?.sportIcon || '\u{1F3D0}';
  const initial = child.firstName?.[0]?.toUpperCase() || '?';

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
      {/* Left: Avatar with sport badge */}
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

      {/* Middle: Name, team, event, badges */}
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

      {/* Right: Level */}
      {child.level > 0 && (
        <View style={styles.levelCol}>
          <Text style={styles.levelNum}>{child.level}</Text>
          <Text style={styles.levelLabel}>LEVEL</Text>
        </View>
      )}
    </TouchableOpacity>
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

const styles = StyleSheet.create({
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
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 20,
    color: BRAND.white,
  },
  sportBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BRAND.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  sportEmoji: {
    fontSize: 11,
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
});
