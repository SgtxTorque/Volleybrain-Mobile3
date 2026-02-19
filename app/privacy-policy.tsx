import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PolicySection = {
  title: string;
  content: string;
  bullets?: string[];
};

const POLICY_SECTIONS: PolicySection[] = [
  {
    title: '1. Information We Collect',
    content: 'We collect the following information to manage youth sports league participation:',
    bullets: [
      'Player Information: names, dates of birth, school grade, jersey sizes, positions, photos',
      'Parent/Guardian Information: names, email addresses, phone numbers, emergency contacts',
      'Medical Information: allergies, medical conditions, medications (shared with coaches for player safety)',
      'Financial Information: payment records, fee statuses, transaction history',
      'Communication Data: chat messages between team members, coaches, and parents',
      'Usage Data: app interactions, notification preferences',
      'Game Data: statistics, attendance records, game results',
    ],
  },
  {
    title: '2. How We Use Your Information',
    content: '',
    bullets: [
      'Managing league registrations and team rosters',
      'Facilitating communication between coaches, parents, and players',
      'Tracking player statistics and achievements',
      'Processing registration fees and payments',
      'Sending important notifications about schedules, games, and events',
      'Ensuring player safety through medical information access for coaches',
      'Generating reports for league administration',
    ],
  },
  {
    title: '3. Who Can See Your Data',
    content: '',
    bullets: [
      'Coaches and team staff: Player names, positions, medical info, stats, attendance',
      'Other parents on the same team: Player first name, jersey number only',
      'Organization administrators: All data for their organization',
      'Your child\'s data: Players see their own stats and achievements',
      'We do NOT share data with third-party advertisers or data brokers',
    ],
  },
  {
    title: '4. Children\'s Privacy',
    content: '',
    bullets: [
      'VolleyBrain collects information about children under 13 only with verified parental consent',
      'Parents must provide consent during registration before any child data is collected',
      'Parents can review, modify, or request deletion of their child\'s data at any time',
      'Parents can revoke consent, which will remove their child from active rosters',
      'We use email verification as our parental consent method',
    ],
  },
  {
    title: '5. Data Storage & Security',
    content: '',
    bullets: [
      'Data is stored securely using Supabase (cloud-hosted PostgreSQL database)',
      'All data transmission is encrypted using HTTPS/TLS',
      'Access to data is role-based and restricted to authorized users within your organization',
      'We do not store payment card numbers — payment processing is handled by third-party providers',
    ],
  },
  {
    title: '6. Data Retention',
    content: '',
    bullets: [
      'Active player data is retained while the player is enrolled in any season',
      'Historical statistics and achievements are retained for the player\'s career history',
      'Upon request, we will delete all personal data within 30 days',
      'Chat messages are retained for the duration of the season',
    ],
  },
  {
    title: '7. Your Rights',
    content: '',
    bullets: [
      'Access: Request a copy of all data we store about you or your child',
      'Correction: Update inaccurate information through your profile settings',
      'Deletion: Request complete deletion of your account and associated data',
      'Portability: Request your data in a machine-readable format',
      'Consent Withdrawal: Revoke consent for data collection at any time',
    ],
  },
  {
    title: '8. Contact Us',
    content: 'For privacy-related questions or requests:',
    bullets: [
      'Email: privacy@volleybrain.com',
      'Through the app: Settings \u2192 Help & Support',
      'Your organization administrator can also assist with data requests',
    ],
  },
];

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ fromSignup?: string }>();
  const fromSignup = params.fromSignup === 'true';

  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Last Updated */}
        <View style={s.updatedCard}>
          <Ionicons name="time-outline" size={18} color={colors.textMuted} />
          <Text style={s.updatedText}>Last Updated: February 2026</Text>
        </View>

        {/* Sections */}
        {POLICY_SECTIONS.map((section, index) => (
          <View key={index} style={s.sectionCard}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            {section.content !== '' && (
              <Text style={s.sectionContent}>{section.content}</Text>
            )}
            {section.bullets && section.bullets.map((bullet, bIndex) => (
              <View key={bIndex} style={s.bulletRow}>
                <Text style={s.bulletDot}>{'\u2022'}</Text>
                <Text style={s.bulletText}>{bullet}</Text>
              </View>
            ))}
            {section.title === '7. Your Rights' && (
              <Text style={s.rightsNote}>
                To exercise these rights, use the Data Rights section in your profile or contact your organization administrator.
              </Text>
            )}
          </View>
        ))}

        {/* From Signup Button */}
        {fromSignup && (
          <TouchableOpacity style={s.understandBtn} onPress={() => router.back()}>
            <Text style={s.understandBtnText}>I Understand</Text>
          </TouchableOpacity>
        )}

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
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    updatedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.glassCard,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    updatedText: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '500',
    },
    sectionCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
    },
    sectionContent: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 10,
    },
    bulletRow: {
      flexDirection: 'row',
      paddingRight: 8,
      marginBottom: 6,
    },
    bulletDot: {
      fontSize: 14,
      color: colors.primary,
      marginRight: 8,
      lineHeight: 22,
    },
    bulletText: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    rightsNote: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 20,
      marginTop: 10,
      fontStyle: 'italic',
    },
    understandBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    understandBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
    },
  });
