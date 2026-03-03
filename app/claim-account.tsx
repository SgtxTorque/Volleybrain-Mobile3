import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { radii, shadows } from '@/lib/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

export default function ClaimAccountScreen() {
  const { user, profile, orphanPlayers, clearOrphanFlag } = useAuth();
  const router = useRouter();
  const [linking, setLinking] = useState(false);

  const handleLink = async () => {
    if (!user || !profile || linking) return;
    setLinking(true);

    try {
      const playerIds = orphanPlayers.map(p => p.id);
      const familyIds = [...new Set(orphanPlayers.map(p => p.family_id).filter(Boolean))] as string[];

      await supabase
        .from('players')
        .update({ parent_account_id: user.id })
        .in('id', playerIds);

      if (familyIds.length > 0) {
        await supabase
          .from('families')
          .update({ account_id: user.id })
          .in('id', familyIds);
      }

      for (const playerId of playerIds) {
        await supabase.from('player_parents').upsert({
          player_id: playerId,
          parent_id: profile.id,
          relationship: 'parent',
          is_primary: true,
          can_pickup: true,
          receives_notifications: true,
        }, { onConflict: 'player_id,parent_id' });
      }

      clearOrphanFlag();
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to link records.');
    } finally {
      setLinking(false);
    }
  };

  const handleSkip = () => {
    clearOrphanFlag();
    router.replace('/(tabs)' as any);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <Image
          source={require('@/assets/images/lynx-mascot.png')}
          style={s.mascot}
          resizeMode="contain"
        />

        <Text style={s.title}>We found your family!</Text>
        <Text style={s.subtitle}>
          It looks like you previously registered these children:
        </Text>

        <View style={s.playerList}>
          {orphanPlayers.map(player => (
            <View key={player.id} style={s.playerCard}>
              <Ionicons name="checkmark-circle" size={20} color={BRAND.teal} />
              <Text style={s.playerName}>
                {player.first_name} {player.last_name}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.buttons}>
          <TouchableOpacity
            style={[s.linkBtn, linking && s.linkBtnDisabled]}
            onPress={handleLink}
            disabled={linking}
          >
            {linking ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="link" size={20} color="#fff" />
                <Text style={s.linkBtnText}>Link to My Account</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
            <Text style={s.skipBtnText}>This isn't me</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.offWhite },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, gap: 16,
  },
  mascot: { width: 100, height: 144, marginBottom: 8 },
  title: {
    fontFamily: FONTS.bodyBold, fontSize: 24, color: BRAND.navy, textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium, fontSize: 15, color: BRAND.textMuted,
    textAlign: 'center', lineHeight: 22,
  },
  playerList: { width: '100%', gap: 8, marginVertical: 8 },
  playerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: BRAND.white, borderRadius: radii.card,
    borderWidth: 1, borderColor: BRAND.border, padding: 14,
    ...shadows.card,
  },
  playerName: {
    fontFamily: FONTS.bodySemiBold, fontSize: 16, color: BRAND.navy,
  },
  buttons: { width: '100%', gap: 12, marginTop: 8 },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BRAND.teal, paddingVertical: 16, borderRadius: 12,
  },
  linkBtnDisabled: { opacity: 0.6 },
  linkBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#fff' },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipBtnText: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: BRAND.textMuted },
});
