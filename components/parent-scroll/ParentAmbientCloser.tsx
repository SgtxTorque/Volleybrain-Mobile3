/**
 * ParentAmbientCloser — Contextual closing message with mascot.
 * References children and real event data.
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
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
      <Image
        source={require('@/assets/images/mascot/SleepLynx.png')}
        style={styles.mascotImg}
        resizeMode="contain"
      />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export default React.memo(ParentAmbientCloser);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 24,
    paddingBottom: 120,
  },
  mascotImg: {
    width: 40,
    height: 40,
    marginBottom: 10,
    opacity: 0.5,
  },
  message: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: D_COLORS.textAmbient,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
});
