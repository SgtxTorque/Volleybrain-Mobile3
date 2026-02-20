import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ================================================================
// COMPONENT
// ================================================================

export default function WebFeaturesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { featureName, description, webUrl } = useLocalSearchParams<{
    featureName?: string;
    description?: string;
    webUrl?: string;
  }>();

  const styles = createStyles(colors);
  const title = featureName || 'Web Feature';

  const handleOpenWeb = () => {
    if (webUrl) {
      Linking.openURL(webUrl);
    } else {
      Alert.alert(
        'Web Portal',
        'Open your web browser to access this feature.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Centered content */}
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="globe-outline" size={40} color={colors.primary} />
        </View>

        <Text style={styles.featureName}>{title}</Text>

        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : (
          <Text style={styles.description}>
            This feature is available on the web portal.
          </Text>
        )}

        <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenWeb}>
          <Ionicons name="open-outline" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Open Web Portal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ================================================================
// STYLES
// ================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    backBtn: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingBottom: 60,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary + '33',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    featureName: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
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
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: { elevation: 6 },
      }),
    },
    primaryBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 24,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    secondaryBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
  });
