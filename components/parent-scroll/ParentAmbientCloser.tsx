/**
 * ParentAmbientCloser — Contextual closing message with mascot.
 * References children and real event data.
 * Mascot gentle sway: -2deg to 2deg, 4-second loop.
 */
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { FONTS } from '@/theme/fonts';
import { D_COLORS } from '@/theme/d-system';
import type { FamilyChild, FamilyEvent, SeasonRecord } from '@/hooks/useParentHomeData';

interface Props {
  children: FamilyChild[];
  heroEvent: FamilyEvent | null;
  seasonRecord: SeasonRecord | null;
  lastName: string;
}

function ParentAmbientCloser({ children, heroEvent, seasonRecord, lastName }: Props) {
  // ALL hooks above early return
  const swayRotation = useSharedValue(0);

  useEffect(() => {
    swayRotation.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(swayRotation);
  }, []);

  const swayStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swayRotation.value}deg` }],
  }));

  const today = new Date().toISOString().split('T')[0];

  let message = "That's everything for now. Go be great.";

  // Win streak message
  if (seasonRecord && seasonRecord.wins >= 3 && children.length > 0) {
    const name = children[0].firstName;
    const extra = children.length > 1
      ? ` ${children[1].firstName} has ${heroEvent ? 'an event coming up' : 'a strong season too'}.`
      : '';
    message = `${name}'s on a ${seasonRecord.wins}-game streak.${extra}`;
  }
  // Event tomorrow
  else if (heroEvent && heroEvent.date > today) {
    const isTomorrow = (() => {
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      return tmrw.toISOString().split('T')[0] === heroEvent.date;
    })();
    if (isTomorrow) {
      message = `${heroEvent.eventType || 'Event'} tomorrow. The ${lastName || 'family'} family is ready.`;
    } else {
      const dayName = new Date(heroEvent.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
      message = `Next up: ${dayName}'s ${(heroEvent.eventType || 'event').toLowerCase()}. You've got this.`;
    }
  }
  // Game day
  else if (heroEvent && heroEvent.date === today) {
    message = 'Game day. Trust the preparation.';
  }
  // Winning season
  else if (seasonRecord && seasonRecord.wins > seasonRecord.losses) {
    message = `${seasonRecord.wins}-${seasonRecord.losses} season. The work is paying off.`;
  }

  return (
    <View style={styles.container}>
      <Animated.View style={swayStyle}>
        <Image
          source={require('@/assets/images/mascot/SleepLynx.png')}
          style={styles.mascotImg}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export default React.memo(ParentAmbientCloser);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 12,
    paddingBottom: 16,
  },
  mascotImg: {
    width: 40,
    height: 40,
    marginBottom: 10,
    opacity: 0.8,
  },
  message: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: 'rgba(11,22,40,0.35)',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
});
