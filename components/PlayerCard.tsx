import { getPlayerPlaceholder } from '@/lib/default-images';
import { getPositionInfo } from '@/constants/sport-display';
import { BRAND } from '@/theme/colors';
import { D_COLORS } from '@/theme/d-system';
import { FONTS } from '@/theme/fonts';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
  Dimensions,
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
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PlayerCardProps = {
  player: {
    id: string;
    first_name: string;
    last_name: string;
    jersey_number?: number | null;
    position?: string | null;
    sport_name?: string | null;
    photo_url?: string | null;
    grade?: number | null;
    team_name?: string | null;
    team_color?: string | null;
    [key: string]: any;
  };
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  teamLogoUrl?: string | null;
  overallRating?: number | null;
  registrationStatus?: 'pending' | 'payment_due' | 'complete' | null;
  /** Stagger index for entrance animation (50ms per card) */
  staggerIndex?: number;
};

export default function PlayerCard({
  player,
  onPress,
  size = 'medium',
  staggerIndex = 0,
}: PlayerCardProps) {
  const pressScale = useSharedValue(1);
  const entryOpacity = useSharedValue(0);
  const entryScale = useSharedValue(0.95);

  useEffect(() => {
    const delay = staggerIndex * 50;
    entryOpacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    entryScale.value = withDelay(delay, withSpring(1, { damping: 18, stiffness: 200 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * entryScale.value }],
    opacity: entryOpacity.value,
  }));

  const posInfo = getPositionInfo(player.position, player.sport_name);
  const teamColor = player.team_color || D_COLORS.skyBlue;
  const hasPhoto = player.photo_url && player.photo_url.length > 0;
  const jerseyNumber = player.jersey_number;
  const displayName = `${player.first_name} ${player.last_name.charAt(0)}.`;
  const initial = player.first_name.charAt(0).toUpperCase();

  const dimensions = {
    small: { width: 105, height: 145 },
    medium: { width: (SCREEN_WIDTH - 48) / 3, height: 170 },
    large: { width: 180, height: 230 },
  }[size];

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { pressScale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { pressScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      style={[
        styles.card,
        {
          width: dimensions.width,
          height: dimensions.height,
          borderColor: teamColor + '33',
        },
        animatedStyle,
      ]}
    >
      {/* Card background: photo or team-color gradient */}
      {hasPhoto ? (
        <Image
          source={{ uri: player.photo_url! }}
          style={styles.bgPhoto}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={[teamColor, BRAND.navyDeep]}
          style={styles.bgGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.initialLetter}>{initial}</Text>
        </LinearGradient>
      )}

      {/* Position pill — top-left (ONE indicator only) */}
      {player.position && (
        <View style={[styles.positionPill, { backgroundColor: teamColor }]}>
          <Text style={styles.positionText}>{player.position}</Text>
        </View>
      )}

      {/* Jersey number — top-right */}
      {jerseyNumber != null && (
        <Text style={styles.jerseyNumber}>{jerseyNumber}</Text>
      )}

      {/* Dark gradient overlay at bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.bottomGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Name bar on gradient */}
      <View style={styles.nameBar}>
        <Text style={styles.playerName} numberOfLines={1}>
          {displayName}
        </Text>
        {player.grade != null && (
          <Text style={styles.gradeText}>Gr {player.grade}</Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: BRAND.white,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: BRAND.navyDeep,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  bgPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  bgGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialLetter: {
    fontFamily: FONTS.display,
    fontSize: 48,
    color: 'rgba(255,255,255,0.25)',
    marginTop: -12,
  },
  positionPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 10,
  },
  positionText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 8,
    color: BRAND.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  jerseyNumber: {
    position: 'absolute',
    top: 6,
    right: 8,
    fontSize: 20,
    fontFamily: FONTS.display,
    color: BRAND.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    zIndex: 10,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  nameBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.white,
    flex: 1,
  },
  gradeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 4,
  },
});
