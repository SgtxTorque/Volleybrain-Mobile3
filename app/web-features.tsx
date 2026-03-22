import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { usePermissions } from '@/lib/permissions-context';
import { useTheme } from '@/lib/theme';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WEB_FEATURES = [
  { icon: 'bar-chart-outline' as const, label: 'Advanced reporting & data export' },
  { icon: 'settings-outline' as const, label: 'Organization settings' },
  { icon: 'layers-outline' as const, label: 'Bulk data management' },
  { icon: 'card-outline' as const, label: 'Stripe payment configuration' },
];

export default function WebFeaturesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { featureName, description, webUrl } = useLocalSearchParams<{
    featureName?: string;
    description?: string;
    webUrl?: string;
  }>();
  // ─── Role Guard ────────────────────────────────
  const { isAdmin, loading } = usePermissions();

  if (loading) return null;

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors?.background || '#F6F8FB', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 }}>
        <Ionicons name="lock-closed-outline" size={48} color={colors?.textMuted || '#999'} />
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 18, color: colors?.text || '#10284C' }}>Access Restricted</Text>
        <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 14, color: colors?.textMuted || '#999', textAlign: 'center' }}>
          Admin permissions required.
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: FONTS.bodySemiBold, color: '#4BB9EC', fontSize: 15 }}>Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  // ─── End Role Guard ────────────────────────────

  const s = createStyles(colors);
  const title = featureName || 'Web Feature';

  const handleOpenWeb = () => {
    const url = webUrl || 'https://thelynxapp.com';
    Linking.openURL(url).catch(() => {
      Alert.alert('Web Portal', 'Open your web browser to access this feature.');
    });
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Mascot */}
        <View style={s.mascotWrap}>
          <Image
            source={require('@/assets/images/mascot/laptoplynx.png')}
            style={s.mascot}
            resizeMode="contain"
          />
        </View>

        <Text style={s.headline}>Some features work best on the big screen!</Text>

        {description ? (
          <Text style={s.description}>{description}</Text>
        ) : (
          <Text style={s.description}>
            This feature is available on the web portal for the best experience.
          </Text>
        )}

        {/* Web-only features list */}
        <View style={s.featureCard}>
          {WEB_FEATURES.map((feature, index) => (
            <View key={index} style={[s.featureRow, index < WEB_FEATURES.length - 1 && s.featureRowBorder]}>
              <View style={s.featureIconWrap}>
                <Ionicons name={feature.icon} size={20} color={colors.primary} />
              </View>
              <Text style={s.featureLabel}>{feature.label}</Text>
            </View>
          ))}
        </View>

        {/* CTA buttons */}
        <TouchableOpacity style={s.primaryBtn} onPress={handleOpenWeb}>
          <Ionicons name="open-outline" size={20} color={colors.background} />
          <Text style={s.primaryBtnText}>Open Web Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.secondaryBtn} onPress={() => router.back()}>
          <Text style={s.secondaryBtnText}>Go Back</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      ...displayTextStyle,
      fontSize: 18,
      color: colors.text,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.screenPadding,
      alignItems: 'center',
    },
    mascotWrap: {
      marginTop: 16,
      marginBottom: 20,
    },
    mascot: {
      width: 160,
      height: 160,
    },
    headline: {
      ...displayTextStyle,
      fontSize: 22,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    featureCard: {
      width: '100%',
      backgroundColor: colors.glassCard,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      marginBottom: 28,
      ...shadows.card,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    featureRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    featureIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    featureLabel: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 24,
      gap: 8,
      width: '100%',
      marginBottom: 12,
      ...shadows.cardHover,
    },
    primaryBtnText: {
      fontSize: 16,
      fontFamily: FONTS.bodyBold,
      color: colors.background,
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.glassCard,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 24,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    secondaryBtnText: {
      fontSize: 16,
      fontFamily: FONTS.bodyBold,
      color: colors.text,
    },
  });
