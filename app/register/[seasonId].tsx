import { useAuth } from '@/lib/auth';
import {
  loadRegistrationConfig,
  type LoadedRegistrationData,
  type RegistrationConfig,
  type SeasonFee,
} from '@/lib/registration-config';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { spacing, radii, shadows } from '@/lib/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

type StepDef = { key: string; label: string };

type ChildData = Record<string, string>;

type ReturningPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  grade: number | null;
  birth_date: string | null;
  gender: string | null;
  school: string | null;
  family_id: string | null;
  uniform_size_jersey: string | null;
  uniform_size_shorts: string | null;
  jersey_pref_1: number | null;
  sport_id: string | null;
  position: string | null;
  experience_level: string | null;
};

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

  // Child management (Phase 2)
  const [returningPlayers, setReturningPlayers] = useState<ReturningPlayer[]>([]);
  const [selectedReturningIds, setSelectedReturningIds] = useState<string[]>([]);
  const [newChildren, setNewChildren] = useState<ChildData[]>([]);
  const [existingFamilyId, setExistingFamilyId] = useState<string | null>(null);
  const [familyLoading, setFamilyLoading] = useState(false);

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

      // Detect returning family
      await detectReturningFamily(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load registration form.');
    } finally {
      setLoading(false);
    }
  };

  const detectReturningFamily = async (result: LoadedRegistrationData) => {
    setFamilyLoading(true);
    try {
      // 1. Check player_parents for existing children
      if (profile?.id) {
        const { data: linkedPlayers } = await supabase
          .from('player_parents')
          .select('player_id, players(id, first_name, last_name, grade, birth_date, gender, school, family_id, uniform_size_jersey, uniform_size_shorts, jersey_pref_1, sport_id, position, experience_level)')
          .eq('parent_id', profile.id);

        if (linkedPlayers && linkedPlayers.length > 0) {
          // Deduplicate by player id (a child may have multiple parent links)
          const seen = new Set<string>();
          const unique: ReturningPlayer[] = [];
          for (const lp of linkedPlayers) {
            const p = lp.players as any;
            if (p && !seen.has(p.id)) {
              seen.add(p.id);
              unique.push({
                id: p.id,
                first_name: p.first_name,
                last_name: p.last_name,
                grade: p.grade,
                birth_date: p.birth_date,
                gender: p.gender,
                school: p.school,
                family_id: p.family_id,
                uniform_size_jersey: p.uniform_size_jersey,
                uniform_size_shorts: p.uniform_size_shorts,
                jersey_pref_1: p.jersey_pref_1,
                sport_id: p.sport_id,
                position: p.position,
                experience_level: p.experience_level,
              });
            }
          }
          setReturningPlayers(unique);
        }
      }

      // 2. Check families table by account_id
      if (user?.id) {
        const { data: family } = await supabase
          .from('families')
          .select('*')
          .eq('account_id', user.id)
          .limit(1)
          .maybeSingle();

        if (family) {
          setExistingFamilyId(family.id);
          // Pre-fill shared info from family record
          setSharedInfo({
            parent1_name: family.primary_contact_name || profile?.full_name || '',
            parent1_email: family.primary_contact_email || user?.email || '',
            parent1_phone: family.primary_contact_phone || (profile as any)?.phone || '',
            parent2_name: family.secondary_contact_name || '',
            parent2_email: family.secondary_contact_email || '',
            parent2_phone: family.secondary_contact_phone || '',
            address: family.address || '',
            emergency_name: family.emergency_contact_name || '',
            emergency_phone: family.emergency_contact_phone || '',
            emergency_relation: family.emergency_contact_relation || '',
          });
        } else {
          // No family — pre-fill from profile only
          setSharedInfo({
            parent1_name: profile?.full_name || '',
            parent1_email: user?.email || '',
            parent1_phone: (profile as any)?.phone || '',
          });
        }
      }
    } catch {
      // Non-critical — just skip pre-fill
      setSharedInfo({
        parent1_name: profile?.full_name || '',
        parent1_email: user?.email || '',
        parent1_phone: (profile as any)?.phone || '',
      });
    } finally {
      setFamilyLoading(false);
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

  // All children to register (returning selected + new)
  const allChildren = useMemo((): ChildData[] => {
    const returning = returningPlayers
      .filter(p => selectedReturningIds.includes(p.id))
      .map(p => ({
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        birth_date: p.birth_date || '',
        grade: p.grade != null ? String(p.grade) : '',
        gender: p.gender || '',
        school: p.school || '',
        uniform_size_jersey: p.uniform_size_jersey || '',
        uniform_size_shorts: p.uniform_size_shorts || '',
        jersey_pref_1: p.jersey_pref_1 != null ? String(p.jersey_pref_1) : '',
        position_preference: p.position || '',
        experience_level: p.experience_level || '',
        _isReturning: 'true',
        _returningPlayerId: p.id,
      }));
    return [...returning, ...newChildren];
  }, [returningPlayers, selectedReturningIds, newChildren]);

  // Fee calculation
  const feeBreakdown = useMemo(() => {
    if (!data?.fees || allChildren.length === 0) return null;
    const childCount = allChildren.length;
    const lines: { label: string; amount: number; detail: string }[] = [];
    let total = 0;

    for (const fee of data.fees) {
      const lineAmount = fee.amount * childCount;
      lines.push({
        label: fee.fee_name,
        amount: lineAmount,
        detail: childCount > 1 ? `$${fee.amount} x ${childCount}` : `$${fee.amount}`,
      });
      total += lineAmount;
    }
    return { lines, total, childCount };
  }, [data?.fees, allChildren.length]);

  // Toggle returning player selection
  const toggleReturning = useCallback((playerId: string) => {
    setSelectedReturningIds(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  }, []);

  // Add a new blank child
  const addNewChild = useCallback(() => {
    setNewChildren(prev => [...prev, { first_name: '', last_name: '' }]);
  }, []);

  // Remove a new child by index
  const removeNewChild = useCallback((index: number) => {
    setNewChildren(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Update a new child field
  const updateNewChild = useCallback((index: number, field: string, value: string) => {
    setNewChildren(prev => prev.map((child, i) =>
      i === index ? { ...child, [field]: value } : child
    ));
  }, []);

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleNext = () => {
    const stepKey = steps[currentStep]?.key;

    // Validate children step
    if (stepKey === 'children') {
      if (allChildren.length === 0) {
        Alert.alert('No Children Selected', 'Please select at least one returning child or add a new child to continue.');
        return;
      }
      // Validate new children have names
      for (let i = 0; i < newChildren.length; i++) {
        if (!newChildren[i].first_name?.trim() || !newChildren[i].last_name?.trim()) {
          Alert.alert('Missing Info', `Please enter the first and last name for new child #${i + 1}.`);
          return;
        }
      }
      // Sync allChildren into the children state for later phases
      setChildren(allChildren);
    }

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
        {currentStepDef?.key === 'children' ? (
          /* ============ CHILDREN STEP ============ */
          <View style={s.stepContainer}>
            {familyLoading ? (
              <View style={s.centerContent}>
                <ActivityIndicator size="small" color={accentColor} />
                <Text style={s.loadingText}>Checking for existing family...</Text>
              </View>
            ) : (
              <>
                {/* Returning Players */}
                {returningPlayers.length > 0 && (
                  <View style={s.sectionBlock}>
                    <Text style={s.sectionTitle}>Returning Players</Text>
                    <Text style={s.sectionSubtitle}>Select children to re-register</Text>
                    {returningPlayers.map(player => {
                      const selected = selectedReturningIds.includes(player.id);
                      return (
                        <TouchableOpacity
                          key={player.id}
                          style={[s.returningCard, selected && { borderColor: accentColor, borderWidth: 2 }]}
                          onPress={() => toggleReturning(player.id)}
                          activeOpacity={0.7}
                        >
                          <View style={s.returningCardLeft}>
                            <View style={[s.checkbox, selected && { backgroundColor: accentColor, borderColor: accentColor }]}>
                              {selected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                            </View>
                            <View style={s.returningInfo}>
                              <Text style={s.returningName}>{player.first_name} {player.last_name}</Text>
                              <Text style={s.returningDetail}>
                                {player.grade != null ? `Grade ${player.grade === 0 ? 'K' : player.grade}` : ''}
                                {player.school ? ` · ${player.school}` : ''}
                              </Text>
                            </View>
                          </View>
                          <View style={[s.returningBadge, { backgroundColor: accentColor + '20' }]}>
                            <Text style={[s.returningBadgeText, { color: accentColor }]}>Returning</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* New Children */}
                <View style={s.sectionBlock}>
                  {newChildren.length > 0 && (
                    <>
                      <Text style={s.sectionTitle}>New Children</Text>
                      {newChildren.map((child, idx) => (
                        <View key={`new-${idx}`} style={s.newChildCard}>
                          <View style={s.newChildHeader}>
                            <Text style={s.newChildLabel}>New Child #{idx + 1}</Text>
                            <TouchableOpacity onPress={() => removeNewChild(idx)} hitSlop={8}>
                              <Ionicons name="close-circle" size={22} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                          <View style={s.newChildFields}>
                            <View style={s.fieldHalf}>
                              <Text style={s.fieldLabel}>First Name <Text style={s.required}>*</Text></Text>
                              <TextInput
                                style={s.input}
                                value={child.first_name}
                                onChangeText={v => updateNewChild(idx, 'first_name', v)}
                                placeholder="First name"
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="words"
                              />
                            </View>
                            <View style={s.fieldHalf}>
                              <Text style={s.fieldLabel}>Last Name <Text style={s.required}>*</Text></Text>
                              <TextInput
                                style={s.input}
                                value={child.last_name}
                                onChangeText={v => updateNewChild(idx, 'last_name', v)}
                                placeholder="Last name"
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="words"
                              />
                            </View>
                          </View>
                        </View>
                      ))}
                    </>
                  )}

                  <TouchableOpacity style={[s.addChildBtn, { borderColor: accentColor }]} onPress={addNewChild}>
                    <Ionicons name="add-circle-outline" size={22} color={accentColor} />
                    <Text style={[s.addChildBtnText, { color: accentColor }]}>Register a New Child</Text>
                  </TouchableOpacity>
                </View>

                {/* Fee Preview */}
                {feeBreakdown && feeBreakdown.lines.length > 0 && (
                  <View style={s.feeCard}>
                    <Text style={s.feeTitle}>Estimated Fees</Text>
                    {feeBreakdown.lines.map((line, idx) => (
                      <View key={idx} style={s.feeLine}>
                        <Text style={s.feeLabel}>{line.label}</Text>
                        <Text style={s.feeAmount}>{line.detail} = ${line.amount}</Text>
                      </View>
                    ))}
                    <View style={s.feeDivider} />
                    <View style={s.feeLine}>
                      <Text style={s.feeTotalLabel}>Total Due</Text>
                      <Text style={s.feeTotalAmount}>${feeBreakdown.total}</Text>
                    </View>
                    <Text style={s.feeDisclaimer}>
                      {feeBreakdown.childCount} child{feeBreakdown.childCount !== 1 ? 'ren' : ''} selected
                    </Text>
                  </View>
                )}

                {/* Selection summary */}
                {allChildren.length > 0 && (
                  <View style={s.selectionSummary}>
                    <Ionicons name="people-outline" size={18} color={accentColor} />
                    <Text style={s.selectionText}>
                      {allChildren.length} child{allChildren.length !== 1 ? 'ren' : ''} selected for registration
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        ) : (
          /* ============ PLACEHOLDER FOR OTHER STEPS ============ */
          <View style={s.stepPlaceholder}>
            <Ionicons name="construct-outline" size={36} color={colors.textMuted} />
            <Text style={s.placeholderTitle}>{currentStepDef?.label}</Text>
            <Text style={s.placeholderText}>This step will be built in Phase {
              currentStepDef?.key === 'player' ? '3' :
              currentStepDef?.key === 'parent' ? '4' :
              currentStepDef?.key === 'emergency' ? '4' :
              currentStepDef?.key === 'waivers' ? '5' :
              '6'
            }.</Text>
          </View>
        )}
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

  // Step container
  stepContainer: {
    gap: 16,
  },

  // Sections
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: -4,
  },

  // Returning player cards
  returningCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.card,
  },
  returningCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  returningInfo: {
    flex: 1,
  },
  returningName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  returningDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  returningBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  returningBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // New child cards
  newChildCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
    ...shadows.card,
  },
  newChildHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newChildLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  newChildFields: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldHalf: {
    flex: 1,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  required: {
    color: colors.danger,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 12,
    fontSize: 15,
    color: colors.text,
  },

  // Add child button
  addChildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radii.card,
    paddingVertical: 16,
    marginTop: 4,
  },
  addChildBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Fee preview
  feeCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
    ...shadows.card,
  },
  feeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  feeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  feeAmount: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  feeDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  feeTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  feeTotalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  feeDisclaimer: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },

  // Selection summary
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Placeholder (for remaining steps)
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
