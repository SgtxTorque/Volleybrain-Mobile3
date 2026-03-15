/**
 * ParentTeamHubCard — Premium Team Hub preview section.
 * Single team: one prominent card. Multiple teams: horizontal snap-scroll.
 * Animations: entrance slide-up, notification pulse, shimmer sweep.
 */
import React, { useEffect, useMemo } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { D_RADII } from '@/theme/d-system';
import type { FamilyChild, LatestPost, TeamAffiliation } from '@/hooks/useParentHomeData';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = 280;
const CARD_SNAP = CARD_WIDTH + 12;

interface Props {
  kids: FamilyChild[];
  latestPost: LatestPost | null;
}

// ─── Sub-component: Individual Team Hub card ────────────────────
function HubCard({
  team,
  hasNewPosts,
  isSingle,
  index,
}: {
  team: TeamAffiliation;
  hasNewPosts: boolean;
  isSingle: boolean;
  index: number;
}) {
  const router = useRouter();

  // Entrance: slide up 20px + fade in
  const translateY = useSharedValue(20);
  const cardOpacity = useSharedValue(0);
  // Notification pill pulse
  const pillScale = useSharedValue(1.0);
  // Shimmer sweep
  const shimmerX = useSharedValue(-100);

  useEffect(() => {
    translateY.value = withDelay(
      index * 80,
      withSpring(0, { damping: 12, stiffness: 100 }),
    );
    cardOpacity.value = withDelay(
      index * 80,
      withTiming(1, { duration: 400 }),
    );

    if (hasNewPosts) {
      pillScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      shimmerX.value = withRepeat(
        withSequence(
          withTiming(isSingle ? SCREEN_WIDTH : CARD_WIDTH + 40, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          }),
          withDelay(2500, withTiming(-100, { duration: 0 })),
        ),
        -1,
        false,
      );
    }

    return () => {
      cancelAnimation(translateY);
      cancelAnimation(cardOpacity);
      cancelAnimation(pillScale);
      cancelAnimation(shimmerX);
    };
  }, []);

  const entranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: cardOpacity.value,
  }));

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pillScale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const sportColor = team.sportColor || BRAND.skyBlue;
  const sportEmoji = team.sportIcon || '\u{1F3D0}';

  return (
    <Animated.View
      style={[
        styles.card,
        isSingle ? styles.cardSingle : styles.cardMulti,
        { borderColor: `${sportColor}22` },
        entranceStyle,
      ]}
    >
      <TouchableOpacity
        style={styles.cardInner}
        activeOpacity={0.7}
        onPress={() => router.push('/(tabs)/parent-team-hub' as any)}
      >
        {/* Team logo circle */}
        <View style={styles.logoWrap}>
          <View style={[styles.logoCircle, { backgroundColor: `${sportColor}18` }]}>
            <Text style={styles.logoEmoji}>{sportEmoji}</Text>
          </View>
          {/* Notification pill */}
          {hasNewPosts && (
            <Animated.View style={[styles.notifPill, pillStyle]}>
              <Text style={styles.notifText}>New</Text>
            </Animated.View>
          )}
        </View>

        {/* Text */}
        <View style={styles.textCol}>
          <Text style={styles.hubTitle}>Team Hub</Text>
          <Text style={styles.teamName} numberOfLines={1}>
            {team.teamName}
          </Text>
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={18} color={BRAND.textFaint} />
      </TouchableOpacity>

      {/* Shimmer overlay */}
      {hasNewPosts && (
        <View style={styles.shimmerClip} pointerEvents="none">
          <Animated.View style={[styles.shimmerBar, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', `${sportColor}12`, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Main component ─────────────────────────────────────────────
function ParentTeamHubCard({ kids, latestPost }: Props) {
  // Deduplicate teams by team ID
  const teams = useMemo(() => {
    const seen = new Set<string>();
    const result: TeamAffiliation[] = [];
    kids.forEach(child => {
      child.teams.forEach(team => {
        if (!seen.has(team.teamId)) {
          seen.add(team.teamId);
          result.push(team);
        }
      });
    });
    return result;
  }, [kids]);

  if (teams.length === 0) return null;

  // Check if there are recent posts (within 7 days)
  const hasNewPosts = !!latestPost?.created_at &&
    (Date.now() - new Date(latestPost.created_at).getTime()) < 7 * 86400000;

  // Single team
  if (teams.length === 1) {
    return (
      <View style={styles.section}>
        <HubCard
          team={teams[0]}
          hasNewPosts={hasNewPosts}
          isSingle={true}
          index={0}
        />
      </View>
    );
  }

  // Multiple teams
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>TEAM HUBS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_SNAP}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {teams.map((team, index) => (
          <HubCard
            key={team.teamId}
            team={team}
            hasNewPosts={hasNewPosts}
            isSingle={false}
            index={index}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default React.memo(ParentTeamHubCard);

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 13,
    color: BRAND.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },

  // Card
  card: {
    backgroundColor: BRAND.white,
    borderRadius: D_RADII.card,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardSingle: {
    marginHorizontal: 16,
  },
  cardMulti: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },

  // Logo
  logoWrap: {
    position: 'relative',
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 22,
  },

  // Notification pill
  notifPill: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: BRAND.coral,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 28,
    alignItems: 'center',
  },
  notifText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: BRAND.white,
    letterSpacing: 0.3,
  },

  // Text
  textCol: {
    flex: 1,
  },
  hubTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    color: BRAND.textPrimary,
  },
  teamName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 2,
  },

  // Shimmer
  shimmerClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: D_RADII.card,
  },
  shimmerBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
  },
});
