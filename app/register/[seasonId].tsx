import { useAuth } from '@/lib/auth';
import {
  loadRegistrationConfig,
  type LoadedRegistrationData,
  type RegistrationConfig,
} from '@/lib/registration-config';
import { useTheme } from '@/lib/theme';
import { spacing, radii, shadows } from '@/lib/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

type StepDef = { key: string; label: string };

type ChildData = Record<string, string>;

// ============================================
// COMPONENT
// ============================================

export default function RegistrationWizardScreen() {
  const { seasonId } = useLocalSearchParams<{ seasonId: string }>();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const router = useRouter();

  // Data loading
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LoadedRegistrationData | null>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [children, setChildren] = useState<ChildData[]>([]);
  const [sharedInfo, setSharedInfo] = useState<Record<string, string>>({});
  const [waiverState, setWaiverState] = useState<Record<string, boolean>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState('');

  // Load config on mount
  useEffect(() => {
    if (!seasonId) return;
    loadConfig();
  }, [seasonId]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadRegistrationConfig(seasonId!);

      if (!result.season.registration_open) {
        setError('Registration is not currently open for this season.');
        return;
      }

      setData(result);

      // Pre-fill parent info from profile
      setSharedInfo(prev => ({
        ...prev,
        parent1_name: profile?.full_name || '',
        parent1_email: user?.email || '',
        parent1_phone: profile?.phone || '',
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to load registration form.');
    } finally {
      setLoading(false);
    }
  };

  // Build dynamic steps — skip steps with no enabled fields
  const steps = useMemo((): StepDef[] => {
    if (!data) return [];
    const cfg = data.config;

    return [
      { key: 'children', label: 'Your Children' },
      { key: 'player', label: 'Player Info' },
      { key: 'parent', label: 'Parent/Guardian' },
      { key: 'emergency', label: 'Emergency & Medical' },
      { key: 'waivers', label: 'Waivers' },
      { key: 'review', label: 'Review & Submit' },
    ].filter(step => {
      if (step.key === 'waivers') return Object.values(cfg.waivers).some(w => w.enabled);
      if (step.key === 'emergency') {
        return Object.values(cfg.emergency_fields).some(f => f.enabled) ||
               Object.values(cfg.medical_fields).some(f => f.enabled);
      }
      return true;
    });
  }, [data]);

  // Accent color: sport color → org color → theme primary
  const accentColor = data?.sport?.color_primary || data?.organization?.primary_color || colors.primary;

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const s = createStyles(colors, accentColor);

  // ---- Loading state ----
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading registration form...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Error state ----
  if (error || !data) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={s.errorTitle}>Unable to Load</Text>
          <Text style={s.errorText}>{error || 'Something went wrong.'}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => router.back()}>
            <Text style={s.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { organization, sport, season } = data;
  const currentStepDef = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* ============ HEADER ============ */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Org branding */}
        <View style={s.orgRow}>
          {organization?.logo_url ? (
            <Image
              source={{ uri: organization.logo_url }}
              style={s.orgLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={[s.orgLogoFallback, { backgroundColor: organization?.primary_color || colors.primary }]}>
              <Text style={s.orgLogoFallbackText}>
                {(organization?.name || 'O')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={s.orgTextCol}>
            <Text style={s.orgName} numberOfLines={1}>{organization?.name || 'Organization'}</Text>
            <View style={s.sportRow}>
              {sport?.icon ? <Text style={s.sportIcon}>{sport.icon}</Text> : null}
              <Text style={s.seasonLabel} numberOfLines={1}>
                {season.name}{sport?.name ? ` ${sport.name}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={s.progressBarBg}>
          <View
            style={[
              s.progressBarFill,
              { width: `${((currentStep + 1) / steps.length) * 100}%`, backgroundColor: accentColor },
            ]}
          />
        </View>
        <Text style={s.stepLabel}>
          Step {currentStep + 1} of {steps.length}: {currentStepDef?.label}
        </Text>
      </View>

      {/* ============ STEP CONTENT ============ */}
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Placeholder per step — replaced in later phases */}
        <View style={s.stepPlaceholder}>
          <Ionicons name="construct-outline" size={36} color={colors.textMuted} />
          <Text style={s.placeholderTitle}>{currentStepDef?.label}</Text>
          <Text style={s.placeholderText}>This step will be built in Phase {
            currentStepDef?.key === 'children' ? '2' :
            currentStepDef?.key === 'player' ? '3' :
            currentStepDef?.key === 'parent' ? '4' :
            currentStepDef?.key === 'emergency' ? '4' :
            currentStepDef?.key === 'waivers' ? '5' :
            '6'
          }.</Text>
        </View>
      </ScrollView>

      {/* ============ FOOTER ============ */}
      <View style={s.footer}>
        <View style={s.footerButtons}>
          {currentStep > 0 && (
            <TouchableOpacity style={s.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={s.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[s.nextButton, { backgroundColor: accentColor }]}
            onPress={handleNext}
          >
            <Text style={s.nextButtonText}>{isLastStep ? 'Submit' : 'Next'}</Text>
            <Ionicons name={isLastStep ? 'checkmark-circle' : 'arrow-forward'} size={18} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Powered by Lynx */}
        <View style={s.poweredByRow}>
          <Image
            source={require('@/assets/images/lynx-icon.png')}
            style={s.poweredByIcon}
            resizeMode="contain"
          />
          <Text style={s.poweredByText}>Powered by Lynx</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (colors: any, accentColor: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  errorText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  retryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },

  // Header
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  orgLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  orgLogoFallback: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orgLogoFallbackText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  orgTextCol: {
    flex: 1,
  },
  orgName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  sportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  sportIcon: {
    fontSize: 14,
  },
  seasonLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Scroll content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: 24,
  },

  // Placeholder
  stepPlaceholder: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    ...shadows.card,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  placeholderText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  poweredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingBottom: 4,
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
