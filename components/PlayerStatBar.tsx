import { getPositionInfo } from '@/constants/sport-display';
import { BRAND } from '@/theme/colors';
import { D_COLORS } from '@/theme/d-system';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PlayerStatBarProps = {
  player: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    jersey_number?: number | null;
    position?: string | null;
    grade?: number | null;
    team_name?: string | null;
    team_color?: string | null;
  };
  onPress?: () => void;
  compact?: boolean;
  /** Stagger index for entrance animation */
  staggerIndex?: number;
};

export default function PlayerStatBar({
  player,
  onPress,
  compact = false,
  staggerIndex = 0,
}: PlayerStatBarProps) {
  const pressScale = useSharedValue(1);
  const entryOpacity = useSharedValue(0);
  const entryTranslateX = useSharedValue(20);

  useEffect(() => {
    const delay = staggerIndex * 40;
    entryOpacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    entryTranslateX.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 200 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pressScale.value },
      { translateX: entryTranslateX.value },
    ],
    opacity: entryOpacity.value,
  }));

  const teamColor = player.team_color || D_COLORS.skyBlue;
  const posInfo = getPositionInfo(player.position);
  const positionColor = posInfo?.color || teamColor;
  const hasPhoto = !!player.photo_url;
  const initial = player.first_name.charAt(0).toUpperCase();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { pressScale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { pressScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      disabled={!onPress}
      style={[styles.container, animatedStyle]}
    >
      {/* Player Photo — circular with team-color border */}
      <View style={[styles.photoBorder, { borderColor: teamColor }]}>
        {hasPhoto ? (
          <Image
            source={{ uri: player.photo_url! }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: teamColor }]}>
            <Text style={styles.photoInitial}>{initial}</Text>
          </View>
        )}
      </View>

      {/* Name + team */}
      <View style={styles.nameSection}>
        <Text style={styles.playerName} numberOfLines={1}>
          {player.first_name} {player.last_name}
        </Text>
        {player.team_name && (
          <Text style={styles.teamName} numberOfLines={1}>{player.team_name}</Text>
        )}
      </View>

      {/* Info pills */}
      <View style={styles.pillsRow}>
        {player.position && (
          <View style={[styles.pill, { backgroundColor: positionColor + '18' }]}>
            <Text style={[styles.pillText, { color: positionColor }]}>{player.position}</Text>
          </View>
        )}
        {player.jersey_number != null && (
          <View style={styles.pill}>
            <Text style={styles.pillText}>#{player.jersey_number}</Text>
          </View>
        )}
        {player.grade != null && (
          <View style={styles.pill}>
            <Text style={styles.pillText}>Gr {player.grade}</Text>
          </View>
        )}
      </View>

      {/* Arrow */}
      <Ionicons
        name="chevron-forward"
        size={16}
        color={D_COLORS.textMuted}
        style={styles.arrow}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    backgroundColor: BRAND.white,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: BRAND.navyDeep,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  photoBorder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: BRAND.white,
  },
  nameSection: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  playerName: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: D_COLORS.textPrimary,
  },
  teamName: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: D_COLORS.textMuted,
    marginTop: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 4,
  },
  pill: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pillText: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: D_COLORS.textMuted,
  },
  arrow: {
    marginLeft: 2,
  },
});
