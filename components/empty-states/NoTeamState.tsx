import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Props = {
  role: 'admin' | 'coach' | 'parent' | 'player';
};

const MESSAGES: Record<Props['role'], { icon: string; body: string }> = {
  admin: {
    icon: 'people',
    body: 'No teams have been created yet. Head to the web dashboard to set up your first season and teams.',
  },
  coach: {
    icon: 'clipboard',
    body: "You haven't been assigned to a team yet. Your admin will set this up.",
  },
  parent: {
    icon: 'person-add',
    body: "Your child hasn't been assigned to a team yet. Your coach or admin will add them soon.",
  },
  player: {
    icon: 'hand-left',
    body: 'Waiting for your coach to add you to a team. Hang tight!',
  },
};

export default function NoTeamState({ role }: Props) {
  const msg = MESSAGES[role] || MESSAGES.parent;

  return (
    <View style={s.container}>
      <View style={s.iconCircle}>
        <Ionicons name={msg.icon as any} size={56} color={BRAND.goldBrand} />
      </View>

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
  iconCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: BRAND.goldBrand + '12', justifyContent: 'center', alignItems: 'center',
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
