import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PendingApprovalScreen() {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  };

  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <View style={s.iconContainer}>
          <Ionicons name="hourglass" size={80} color={colors.primary} />
        </View>

        <Text style={s.title}>Registration Pending</Text>
        
        <Text style={s.message}>
          Your registration has been submitted and is awaiting approval from a league administrator.
        </Text>

        <Text style={s.message}>
          You'll receive a notification once your registration is approved. This usually takes 1-2 business days.
        </Text>

        <View style={s.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.info} />
          <Text style={s.infoText}>
            If you have any questions, please contact your league administrator.
          </Text>
        </View>

        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', },
  iconContainer: { 
    width: 160, 
    height: 160, 
    borderRadius: 80, 
    backgroundColor: colors.primary + '20', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 32,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 16, textAlign: 'center' },
  message: { fontSize: 16, color: colors.textMuted, textAlign: 'center', marginBottom: 16, lineHeight: 24 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.glassCard,
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  infoText: { flex: 1, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: colors.glassCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
  },
  signOutText: { fontSize: 16, color: colors.danger },
});