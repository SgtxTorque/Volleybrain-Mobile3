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

type TermsSection = {
  title: string;
  content: string;
  bullets?: string[];
};

const TERMS_SECTIONS: TermsSection[] = [
  {
    title: '1. Acceptance of Terms',
    content: 'By creating an account or using VolleyBrain, you agree to these terms. If you do not agree, do not use the service. Parents/guardians accepting on behalf of minor children are bound by these terms.',
  },
  {
    title: '2. Account Responsibilities',
    content: '',
    bullets: [
      'You are responsible for maintaining the security of your account credentials',
      'You must provide accurate information during registration',
      'Parents are responsible for the accuracy of their child\'s medical information',
      'You must be at least 18 years old to create a parent or coach account',
      'One account per person \u2014 do not share account access',
    ],
  },
  {
    title: '3. Acceptable Use',
    content: '',
    bullets: [
      'Communicate respectfully with coaches, parents, players, and administrators',
      'Do not share inappropriate content in team chats or team walls',
      'Do not harass, bully, or discriminate against any user',
      'Coaches must maintain appropriate boundaries in communications with minor players',
      'Do not attempt to access data outside your organization or role permissions',
    ],
  },
  {
    title: '4. User Content',
    content: '',
    bullets: [
      'You retain ownership of content you upload (photos, messages, etc.)',
      'You grant VolleyBrain a license to display and store your content for app functionality',
      'Organization administrators may moderate or remove inappropriate content',
      'Chat messages may be visible to team members, coaches, and administrators',
    ],
  },
  {
    title: '5. Payment Terms',
    content: '',
    bullets: [
      'Registration fees and payments are set by your organization, not VolleyBrain',
      'Payment processing is handled through the organization\'s chosen method',
      'Refund policies are determined by your organization',
      'VolleyBrain is not responsible for disputes between users and organizations',
    ],
  },
  {
    title: '6. Coach Responsibilities',
    content: '',
    bullets: [
      'Coaches agree to follow their organization\'s code of conduct',
      'Coaches acknowledge that communications with minor players may be monitored',
      'Coaches are responsible for appropriate use of player medical information',
      'Coaching credentials and certifications must be accurate and current',
    ],
  },
  {
    title: '7. Disclaimers',
    content: '',
    bullets: [
      'VolleyBrain is provided "as is" without warranty of any kind',
      'We do not guarantee uninterrupted service availability',
      'We are not responsible for the actions of organizations, coaches, or users',
      'Medical information in the app does not constitute medical advice',
    ],
  },
  {
    title: '8. Limitation of Liability',
    content: '',
    bullets: [
      'VolleyBrain\'s liability is limited to the amount paid for the service',
      'We are not liable for injuries, losses, or damages arising from sports participation',
      'We are not liable for data loss beyond our reasonable control',
    ],
  },
  {
    title: '9. Termination',
    content: '',
    bullets: [
      'You may delete your account at any time through profile settings',
      'Organizations may remove users who violate their policies',
      'VolleyBrain may suspend accounts that violate these terms',
      'Upon termination, your data will be handled per our Privacy Policy',
    ],
  },
  {
    title: '10. Changes to Terms',
    content: '',
    bullets: [
      'We may update these terms from time to time',
      'Material changes will be communicated through the app',
      'Continued use after changes constitutes acceptance',
    ],
  },
];

export default function TermsOfServiceScreen() {
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
        <Text style={s.headerTitle}>Terms of Service</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Last Updated */}
        <View style={s.updatedCard}>
          <Ionicons name="time-outline" size={18} color={colors.textMuted} />
          <Text style={s.updatedText}>Last Updated: February 2026</Text>
        </View>

        {/* Sections */}
        {TERMS_SECTIONS.map((section, index) => (
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
      marginBottom: 4,
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
