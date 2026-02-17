import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FAQItem = {
  question: string;
  answer: string;
};

const FAQ_DATA: FAQItem[] = [
  {
    question: 'How do I register my child?',
    answer: 'Navigate to the Registration Hub from the menu. You can browse available seasons, select an age group, and complete the registration form for your child.',
  },
  {
    question: 'How do I pay fees?',
    answer: 'Go to Payments from the menu to view and manage fees. You can see outstanding balances, payment history, and make payments for registration, uniforms, and monthly fees.',
  },
  {
    question: 'How do I contact a coach?',
    answer: 'Use the Chat feature to send messages to your team\'s coaches. You can find the chat option in the main menu or from your team\'s page.',
  },
  {
    question: 'How do I view my child\'s stats?',
    answer: 'Check the My Kids section to see stats, schedule, and achievements. Each child\'s profile shows their performance data, upcoming events, and milestones.',
  },
  {
    question: 'How do I change my notification settings?',
    answer: 'Go to Settings from the menu to manage notifications. You can toggle notifications for messages, schedule changes, payment reminders, and more.',
  },
  {
    question: 'How do I switch between roles?',
    answer: 'If you have multiple roles, use the role switcher in Settings. This allows you to switch between parent, coach, or admin views depending on your assigned roles.',
  },
];

export default function HelpScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@volleybrain.com');
  };

  const s = createStyles(colors);
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Help & Support</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* FAQ Section */}
        <View style={s.sectionContainer}>
          <Text style={s.sectionTitle}>Frequently Asked Questions</Text>

          {FAQ_DATA.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={s.faqCard}
              onPress={() => toggleExpanded(index)}
              activeOpacity={0.7}
            >
              <View style={s.faqHeader}>
                <Text style={s.faqQuestion}>{item.question}</Text>
                <Ionicons
                  name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textMuted}
                />
              </View>
              {expandedIndex === index && (
                <Text style={s.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Support Section */}
        <View style={s.sectionContainer}>
          <Text style={s.sectionTitle}>Contact Support</Text>

          <View style={s.contactCard}>
            <Ionicons name="people-outline" size={32} color={colors.textMuted} />
            <Text style={s.contactText}>
              Contact your organization admin for support
            </Text>
            <TouchableOpacity style={s.emailRow} onPress={handleContactSupport}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <Text style={s.emailText}>support@volleybrain.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Version */}
        <View style={s.versionContainer}>
          <Text style={s.versionText}>VolleyBrain v{appVersion}</Text>
        </View>

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
    sectionContainer: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 16,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    faqCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    faqHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    faqQuestion: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      marginRight: 12,
    },
    faqAnswer: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
    },
    contactCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.glassBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    contactText: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 16,
      lineHeight: 22,
    },
    emailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.primary + '15',
    },
    emailText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    versionContainer: {
      alignItems: 'center',
      marginTop: 8,
    },
    versionText: {
      fontSize: 13,
      color: colors.textMuted,
    },
  });
