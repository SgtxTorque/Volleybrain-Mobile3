import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  role: 'admin' | 'coach' | 'parent' | 'player';
};

const MESSAGES: Record<Props['role'], { body: string }> = {
  admin: {
    body: 'No teams have been created yet. Head to the web dashboard to set up your first season and teams.',
  },
  coach: {
    body: "You haven't been assigned to a team yet. Your admin will set this up.",
  },
  parent: {
    body: "Your child hasn't been assigned to a team yet. Your coach or admin will add them soon.",
  },
  player: {
    body: 'Waiting for your coach to add you to a team. Hang tight!',
  },
};

export default function NoTeamState({ role }: Props) {
  const msg = MESSAGES[role] || MESSAGES.parent;

  return (
    <View style={s.container}>
      <Image
        source={require('@/assets/images/mascot/SleepLynx.png')}
        style={s.mascot}
        resizeMode="contain"
      />

      <Text style={s.title}>No Team Yet</Text>
      <Text style={s.subtitle}>{msg.body}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: BRAND.offWhite,
  },
  mascot: {
    width: 120, height: 120, alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: FONTS.bodyBold, fontSize: 24, color: BRAND.navy,
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium, fontSize: 15, color: BRAND.textMuted,
    textAlign: 'center', lineHeight: 22,
  },
});
