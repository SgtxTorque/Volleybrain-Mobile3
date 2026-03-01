import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { spacing, radii, shadows } from '@/lib/design-tokens';
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

export default function ClaimAccountScreen() {
  const { colors } = useTheme();
  const { user, profile, orphanPlayers, clearOrphanFlag } = useAuth();
  const router = useRouter();
  const [linking, setLinking] = useState(false);

  const handleLink = async () => {
    if (!user || !profile || linking) return;
    setLinking(true);

    try {
      const playerIds = orphanPlayers.map(p => p.id);
      const familyIds = [...new Set(orphanPlayers.map(p => p.family_id).filter(Boolean))] as string[];

      // Update players: set parent_account_id
      await supabase
        .from('players')
        .update({ parent_account_id: user.id })
        .in('id', playerIds);

      // Update families: set account_id
      if (familyIds.length > 0) {
        await supabase
          .from('families')
          .update({ account_id: user.id })
          .in('id', familyIds);
      }

      // Create player_parents links
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
      Alert.alert('Error', err.message || 'Failed to link records. Please try again.');
    } finally {
      setLinking(false);
    }
  };

  const handleSkip = () => {
    clearOrphanFlag();
    router.replace('/(tabs)' as any);
  };

  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
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
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={s.playerName}>
                {player.first_name} {player.last_name}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.buttons}>
          <TouchableOpacity
            style={[s.linkBtn, linking && { opacity: 0.6 }]}
            onPress={handleLink}
            disabled={linking}
          >
            {linking ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Ionicons name="link" size={20} color="#000" />
                <Text style={s.linkBtnText}>Link to My Account</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
            <Text style={s.skipBtnText}>This isn't me</Text>
          </TouchableOpacity>
        </View>

        <View style={s.poweredByRow}>
          <Image
            source={require('@/assets/images/lynx-icon.png')}
            style={s.poweredByIcon}
            resizeMode="contain"
          />
          <Text style={s.poweredByText}>Powered by Lynx</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  mascot: {
    width: 100,
    height: 144,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  playerList: {
    width: '100%',
    gap: 8,
    marginVertical: 8,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadows.card,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  buttons: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  linkBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipBtnText: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: '500',
  },
  poweredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 16,
  },
  poweredByIcon: {
    width: 12,
    height: 12,
  },
  poweredByText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
