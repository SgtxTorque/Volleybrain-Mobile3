/**
 * AmbientCloser — quiet contextual closing message at the bottom of the scroll.
 * Mascot emoji + italic text based on team context.
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { FONTS } from '@/theme/fonts';
import { D_COLORS } from '@/theme/d-system';
import type { SeasonRecord, CoachEvent } from '@/hooks/useCoachHomeData';

interface Props {
  seasonRecord: SeasonRecord | null;
  heroEvent: CoachEvent | null;
  teamName: string;
}

function AmbientCloser({ seasonRecord, heroEvent, teamName }: Props) {
  const today = new Date().toISOString().split('T')[0];

  let message = 'Trust the preparation. Your team is ready.';

  // Win streak message
  if (seasonRecord && seasonRecord.wins > 2 && seasonRecord.wins > seasonRecord.losses) {
    message = `${seasonRecord.wins}-${seasonRecord.losses} season. The work is paying off.`;
  }
  // Next event is tomorrow
  else if (heroEvent && heroEvent.event_date > today) {
    const eventType = heroEvent.event_type === 'game' ? 'Game' : 'Practice';
    message = `${eventType} coming up. ${teamName || 'Your team'} is showing up.`;
  }
  // Game day
  else if (heroEvent && heroEvent.event_date === today && heroEvent.event_type === 'game') {
    message = 'Trust the preparation. Your team is ready.';
  }
  // Strong season
  else if (seasonRecord && seasonRecord.wins > seasonRecord.losses) {
    message = `${seasonRecord.wins}-${seasonRecord.losses} season. The work is paying off.`;
  }

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/images/mascot/SleepLynx.png')} style={styles.mascotImg} resizeMode="contain" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export default React.memo(AmbientCloser);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 120,
  },
  mascotImg: {
    width: 44,
    height: 44,
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
