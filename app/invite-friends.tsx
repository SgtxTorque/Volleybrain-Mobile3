import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// COMPONENT
// ============================================

export default function InviteFriendsScreen() {
  const { colors } = useTheme();
  const { profile, organization } = useAuth();
  const router = useRouter();

  const s = createStyles(colors);

  const orgSlug = (organization as any)?.slug || profile?.current_organization_id || '';
  const orgName = (organization as any)?.name || 'our team';
  const registrationUrl = orgSlug
    ? `https://app.volleybrain.com/register/${orgSlug}`
    : 'https://app.volleybrain.com/register';

  // -----------------------------------------------
  // Actions
  // -----------------------------------------------

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(registrationUrl);
      Alert.alert('Copied!', 'Registration link copied to clipboard.');
    } catch (e) {
      if (__DEV__) console.log('Error copying link:', e);
      Alert.alert('Error', 'Could not copy the link. Please try again.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join ${orgName} on VolleyBrain! Register here: ${registrationUrl}`,
        url: registrationUrl,
      });
    } catch (e) {
      if (__DEV__) console.log('Error sharing:', e);
    }
  };

  const shareMessage = `Join ${orgName} on VolleyBrain! Register here: ${registrationUrl}`;

  const handleShareSMS = () => {
    const url = Platform.OS === 'ios'
      ? `sms:&body=${encodeURIComponent(shareMessage)}`
      : `sms:?body=${encodeURIComponent(shareMessage)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open Messages.')
    );
  };

  const handleShareWhatsApp = () => {
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(shareMessage)}`).catch(() =>
      Alert.alert('WhatsApp Not Found', 'WhatsApp is not installed on this device.')
    );
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Join ${orgName} on VolleyBrain!`);
    const body = encodeURIComponent(shareMessage);
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() =>
      Alert.alert('Error', 'Could not open email client.')
    );
  };

  // -----------------------------------------------
  // Render
  // -----------------------------------------------

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Invite Friends</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={s.heroCard}>
          <View style={[s.heroIconWrap, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="people" size={40} color={colors.primary} />
          </View>
          <Text style={s.heroTitle}>Grow Your Team</Text>
          <Text style={s.heroSubtitle}>
            Share the registration link with other parents to help grow {orgName}!
          </Text>
        </View>

        {/* Registration Link Card */}
        <Text style={s.sectionTitle}>REGISTRATION LINK</Text>
        <View style={s.linkCard}>
          <View style={s.linkRow}>
            <View style={[s.linkIconWrap, { backgroundColor: colors.info + '20' }]}>
              <Ionicons name="link" size={22} color={colors.info} />
            </View>
            <Text style={s.linkText} numberOfLines={2} ellipsizeMode="middle">
              {registrationUrl}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}
              onPress={handleCopyLink}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={20} color={colors.primary} />
              <Text style={[s.actionBtnText, { color: colors.primary }]}>Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-social-outline" size={20} color={colors.success} />
              <Text style={[s.actionBtnText, { color: colors.success }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Share Via Section */}
        <Text style={s.sectionTitle}>SHARE VIA</Text>
        <View style={s.socialRow}>
          <TouchableOpacity style={[s.socialBtn, { backgroundColor: '#25D36620' }]} onPress={handleShareSMS} activeOpacity={0.7}>
            <Ionicons name="chatbubble" size={22} color="#25D366" />
            <Text style={[s.socialBtnText, { color: '#25D366' }]}>SMS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.socialBtn, { backgroundColor: '#25D36620' }]} onPress={handleShareWhatsApp} activeOpacity={0.7}>
            <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            <Text style={[s.socialBtnText, { color: '#25D366' }]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.socialBtn, { backgroundColor: '#007AFF20' }]} onPress={handleShareEmail} activeOpacity={0.7}>
            <Ionicons name="mail" size={22} color="#007AFF" />
            <Text style={[s.socialBtnText, { color: '#007AFF' }]}>Email</Text>
          </TouchableOpacity>
        </View>

        {/* Referral Info Card */}
        <Text style={s.sectionTitle}>HOW IT WORKS</Text>
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={[s.infoStepCircle, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[s.infoStepNum, { color: colors.primary }]}>1</Text>
            </View>
            <View style={s.infoStepContent}>
              <Text style={s.infoStepTitle}>Share the Link</Text>
              <Text style={s.infoStepDesc}>Send the registration link to other parents via text, email, or social media</Text>
            </View>
          </View>

          <View style={s.infoRow}>
            <View style={[s.infoStepCircle, { backgroundColor: colors.info + '20' }]}>
              <Text style={[s.infoStepNum, { color: colors.info }]}>2</Text>
            </View>
            <View style={s.infoStepContent}>
              <Text style={s.infoStepTitle}>They Register</Text>
              <Text style={s.infoStepDesc}>Parents use the link to create an account and register their child</Text>
            </View>
          </View>

          <View style={s.infoRow}>
            <View style={[s.infoStepCircle, { backgroundColor: colors.success + '20' }]}>
              <Text style={[s.infoStepNum, { color: colors.success }]}>3</Text>
            </View>
            <View style={s.infoStepContent}>
              <Text style={s.infoStepTitle}>Team Grows</Text>
              <Text style={s.infoStepDesc}>Help build a stronger team by inviting more families to join</Text>
            </View>
          </View>
        </View>

        {/* Encouragement Card */}
        <View style={s.encourageCard}>
          <Ionicons name="heart" size={24} color={colors.danger} />
          <Text style={s.encourageText}>
            Share with other parents to help grow the team!
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
    },

    // Scroll
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
    },

    // Section Title
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 12,
      marginTop: 8,
      textTransform: 'uppercase' as const,
      letterSpacing: 1.2,
    },

    // Hero Card
    heroCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 28,
      alignItems: 'center',
      marginBottom: 24,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: { elevation: 6 },
      }),
    },
    heroIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
    },
    heroSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },

    // Link Card
    linkCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: { elevation: 6 },
      }),
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    linkIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    linkText: {
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    actionBtnText: {
      fontSize: 15,
      fontWeight: '700',
    },

    // Social Share Row
    socialRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 24,
    },
    socialBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    socialBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },

    // Info Card
    infoCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      gap: 18,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: { elevation: 6 },
      }),
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    infoStepCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoStepNum: {
      fontSize: 16,
      fontWeight: '800',
    },
    infoStepContent: {
      flex: 1,
    },
    infoStepTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    infoStepDesc: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },

    // Encourage Card
    encourageCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.danger + '10',
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.danger + '25',
    },
    encourageText: {
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
  });
