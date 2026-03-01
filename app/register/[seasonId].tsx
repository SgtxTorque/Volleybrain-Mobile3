import { useAuth } from '@/lib/auth';
import {
  FIELD_ORDER,
  loadRegistrationConfig,
  type FieldConfig,
  type LoadedRegistrationData,
  type RegistrationConfig,
  type SeasonFee,
} from '@/lib/registration-config';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { spacing, radii, shadows } from '@/lib/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
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
// PICKER OPTIONS
// ============================================

const SIZE_OPTIONS = [
  { label: 'Youth Small (YS)', value: 'YS' },
  { label: 'Youth Medium (YM)', value: 'YM' },
  { label: 'Youth Large (YL)', value: 'YL' },
  { label: 'Adult Small (AS)', value: 'AS' },
  { label: 'Adult Medium (AM)', value: 'AM' },
  { label: 'Adult Large (AL)', value: 'AL' },
  { label: 'Adult XL (AXL)', value: 'AXL' },
  { label: 'Adult XXL (AXXL)', value: 'AXXL' },
];

const PICKER_OPTIONS: Record<string, { label: string; value: string }[]> = {
  grade: [
    { label: 'Kindergarten', value: '0' },
    ...Array.from({ length: 12 }, (_, i) => ({ label: `Grade ${i + 1}`, value: String(i + 1) })),
  ],
  gender: [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
  ],
  shirt_size: SIZE_OPTIONS,
  jersey_size: SIZE_OPTIONS,
  shorts_size: SIZE_OPTIONS,
  experience_level: [
    { label: 'Beginner', value: 'Beginner' },
    { label: 'Intermediate', value: 'Intermediate' },
    { label: 'Advanced', value: 'Advanced' },
    { label: 'Elite', value: 'Elite' },
  ],
};

/** Fields that use a picker modal */
const PICKER_FIELDS = new Set(Object.keys(PICKER_OPTIONS));

/** Fields that use numeric keyboard */
const NUMERIC_FIELDS = new Set(['preferred_number', 'height', 'weight']);

/** Format date for display */
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** Get display value for picker fields */
function getPickerDisplay(field: string, value: string): string {
  if (!value) return '';
  const options = PICKER_OPTIONS[field];
  if (!options) return value;
  const found = options.find(o => o.value === value);
  return found?.label || value;
}

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

  // Player info step (Phase 3)
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    field: string;
    title: string;
    options: { label: string; value: string }[];
  }>({ visible: false, field: '', title: '', options: [] });

  // Emergency/Medical (Phase 4)
  const [showMedicalFields, setShowMedicalFields] = useState(false);

  // Submit (Phase 6)
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  // Update a child field (used in player info step)
  const updateChild = useCallback((index: number, field: string, value: string) => {
    setChildren(prev => prev.map((child, i) =>
      i === index ? { ...child, [field]: value } : child
    ));
  }, []);

  // Open picker modal for a field
  const openPicker = useCallback((field: string, label: string) => {
    const options = PICKER_OPTIONS[field];
    if (options) {
      setPickerModal({ visible: true, field, title: label, options });
    }
  }, []);

  // Update shared info field (parent, emergency, medical)
  const updateSharedField = useCallback((field: string, value: string) => {
    setSharedInfo(prev => ({ ...prev, [field]: value }));
  }, []);

  // Update custom answer
  const updateCustomAnswer = useCallback((index: number, value: string) => {
    setCustomAnswers(prev => ({ ...prev, [String(index)]: value }));
  }, []);

  // Jump to a specific step (for review "Edit" links)
  const jumpToStep = useCallback((stepKey: string) => {
    const idx = steps.findIndex(s => s.key === stepKey);
    if (idx >= 0) setCurrentStep(idx);
  }, [steps]);

  // SUBMIT — write to database with rollback on failure
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const signatureDate = new Date().toISOString();
    const createdPlayerIds: string[] = [];
    const createdRegistrationIds: string[] = [];

    try {
      // 1. Get or create family
      let familyId = existingFamilyId;
      if (!familyId) {
        const { data: newFamily } = await supabase.from('families').insert({
          primary_contact_name: sharedInfo.parent1_name,
          primary_contact_email: sharedInfo.parent1_email,
          primary_contact_phone: sharedInfo.parent1_phone,
          primary_email: sharedInfo.parent1_email,
          primary_phone: sharedInfo.parent1_phone,
          secondary_contact_name: sharedInfo.parent2_name || null,
          secondary_contact_email: sharedInfo.parent2_email || null,
          secondary_contact_phone: sharedInfo.parent2_phone || null,
          emergency_contact_name: sharedInfo.emergency_name || null,
          emergency_contact_phone: sharedInfo.emergency_phone || null,
          emergency_contact_relation: sharedInfo.emergency_relation || null,
          address: [sharedInfo.address, sharedInfo.city, sharedInfo.state, sharedInfo.zip].filter(Boolean).join(', ') || null,
          account_id: user!.id,
        }).select().single();
        familyId = newFamily?.id || null;
      } else {
        await supabase.from('families').update({
          primary_contact_name: sharedInfo.parent1_name,
          primary_contact_email: sharedInfo.parent1_email,
          primary_contact_phone: sharedInfo.parent1_phone,
          secondary_contact_name: sharedInfo.parent2_name || null,
          secondary_contact_email: sharedInfo.parent2_email || null,
          secondary_contact_phone: sharedInfo.parent2_phone || null,
          emergency_contact_name: sharedInfo.emergency_name || null,
          emergency_contact_phone: sharedInfo.emergency_phone || null,
          emergency_contact_relation: sharedInfo.emergency_relation || null,
          address: [sharedInfo.address, sharedInfo.city, sharedInfo.state, sharedInfo.zip].filter(Boolean).join(', ') || null,
          updated_at: new Date().toISOString(),
        }).eq('id', familyId);
      }

      // 2. For each child, create player + registration + player_parents
      for (const child of children) {
        const gradeValue = child.grade ? (child.grade === '0' || child.grade === 'K' ? 0 : parseInt(child.grade)) : null;

        const { data: player, error: playerError } = await supabase
          .from('players')
          .insert({
            first_name: child.first_name,
            last_name: child.last_name,
            birth_date: child.birth_date || null,
            grade: gradeValue,
            gender: child.gender || null,
            school: child.school || null,
            position: child.position_preference || null,
            experience_level: child.experience_level || null,
            experience_details: child.previous_teams || null,
            uniform_size_jersey: child.jersey_size || child.shirt_size || child.uniform_size_jersey || null,
            uniform_size_shorts: child.shorts_size || child.uniform_size_shorts || null,
            jersey_pref_1: child.preferred_number ? parseInt(child.preferred_number) : (child.jersey_pref_1 ? parseInt(child.jersey_pref_1) : null),
            parent_name: sharedInfo.parent1_name || null,
            parent_email: sharedInfo.parent1_email || null,
            parent_phone: sharedInfo.parent1_phone || null,
            parent_2_name: sharedInfo.parent2_name || null,
            parent_2_email: sharedInfo.parent2_email || null,
            parent_2_phone: sharedInfo.parent2_phone || null,
            emergency_contact_name: sharedInfo.emergency_name || null,
            emergency_contact_phone: sharedInfo.emergency_phone || null,
            emergency_contact_relation: sharedInfo.emergency_relation || null,
            medical_conditions: sharedInfo.medical_conditions || null,
            allergies: sharedInfo.allergies || null,
            medications: sharedInfo.medications || null,
            address: sharedInfo.address || null,
            city: sharedInfo.city || null,
            state: sharedInfo.state || null,
            zip: sharedInfo.zip || null,
            waiver_liability: waiverState.liability || false,
            waiver_photo: waiverState.photo_release || false,
            waiver_conduct: waiverState.code_of_conduct || false,
            waiver_signed_by: signature || null,
            waiver_signed_date: signatureDate,
            family_id: familyId || null,
            season_id: seasonId,
            sport_id: data!.season.sport_id || null,
            status: 'new',
            registration_source: 'mobile',
            registration_date: new Date().toISOString(),
            returning_player: child._isReturning === 'true',
            prefilled_from_player_id: child._returningPlayerId || null,
            parent_account_id: user!.id,
          }).select().single();

        if (playerError) {
          if (playerError.code === '23505') {
            throw new Error(`${child.first_name} ${child.last_name} may already be registered.`);
          }
          throw new Error(`Failed to register ${child.first_name}: ${playerError.message}`);
        }
        createdPlayerIds.push(player.id);

        // Create registration record
        const { data: registration, error: regError } = await supabase
          .from('registrations')
          .insert({
            player_id: player.id,
            season_id: seasonId,
            family_id: familyId || null,
            status: 'new',
            submitted_at: new Date().toISOString(),
            registration_source: 'mobile',
            waivers_accepted: waiverState,
            custom_answers: Object.keys(customAnswers).length > 0 ? customAnswers : null,
            signature_name: signature || null,
            signature_date: signatureDate,
            registration_data: {
              player: child,
              shared: sharedInfo,
              waivers: waiverState,
              custom_questions: customAnswers,
              signature: { name: signature, date: signatureDate },
              source: 'mobile_app',
              app_version: '1.0.0',
              submitted_by_user_id: user!.id,
            },
          }).select().single();

        if (regError && regError.code !== '23505') {
          throw new Error(`Failed to create registration for ${child.first_name}`);
        }
        if (registration) createdRegistrationIds.push(registration.id);

        // Link player to parent
        await supabase.from('player_parents').upsert({
          player_id: player.id,
          parent_id: profile!.id,
          relationship: 'parent',
          is_primary: true,
          can_pickup: true,
          receives_notifications: true,
        }, { onConflict: 'player_id,parent_id' });
      }

      setSubmitted(true);
    } catch (err: any) {
      // ROLLBACK
      if (createdRegistrationIds.length > 0) {
        await supabase.from('registrations').delete().in('id', createdRegistrationIds);
      }
      if (createdPlayerIds.length > 0) {
        await supabase.from('players').delete().in('id', createdPlayerIds);
      }
      Alert.alert('Registration Failed', err.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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

    // Validate player info step
    if (stepKey === 'player' && data) {
      const cfg = data.config;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        for (const key of FIELD_ORDER.player_fields) {
          const fieldCfg = cfg.player_fields[key];
          if (fieldCfg?.enabled && fieldCfg.required && !child[key]?.trim()) {
            setActiveChildIndex(i);
            Alert.alert('Required Field', `Please fill in "${fieldCfg.label}" for ${child.first_name || `Child #${i + 1}`}.`);
            return;
          }
        }
      }
    }

    // Validate parent step
    if (stepKey === 'parent' && data) {
      for (const key of FIELD_ORDER.parent_fields) {
        const fieldCfg = data.config.parent_fields[key];
        if (fieldCfg?.enabled && fieldCfg.required && !sharedInfo[key]?.trim()) {
          Alert.alert('Required Field', `Please fill in "${fieldCfg.label}".`);
          return;
        }
      }
    }

    // Validate emergency step
    if (stepKey === 'emergency' && data) {
      for (const key of FIELD_ORDER.emergency_fields) {
        const fieldCfg = data.config.emergency_fields[key];
        if (fieldCfg?.enabled && fieldCfg.required && !sharedInfo[key]?.trim()) {
          Alert.alert('Required Field', `Please fill in "${fieldCfg.label}".`);
          return;
        }
      }
      // Validate required custom questions
      if (data.config.custom_questions?.length) {
        for (let i = 0; i < data.config.custom_questions.length; i++) {
          const q = data.config.custom_questions[i];
          if (q.required && !customAnswers[String(i)]?.trim()) {
            Alert.alert('Required Question', `Please answer: "${q.question}"`);
            return;
          }
        }
      }
    }

    // Validate waivers step
    if (stepKey === 'waivers' && data) {
      for (const [key, waiver] of Object.entries(data.config.waivers)) {
        if (waiver.enabled && waiver.required && !waiverState[key]) {
          Alert.alert('Required Waiver', `You must accept the "${waiver.title}" to continue.`);
          return;
        }
      }
      if (!signature.trim()) {
        Alert.alert('Signature Required', 'Please type your full name as a digital signature.');
        return;
      }
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

  // ---- Success screen ----
  if (submitted) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.successContainer}>
          <Image
            source={require('@/assets/images/lynx-mascot.png')}
            style={s.successMascot}
            resizeMode="contain"
          />
          <Text style={s.successTitle}>Registration Submitted!</Text>
          <Text style={s.successSubtitle}>
            {children.length} child{children.length !== 1 ? 'ren' : ''} registered for{'\n'}
            {season.name}{sport?.name ? ` ${sport.name}` : ''}{'\n'}
            at {organization?.name || 'your organization'}
          </Text>
          <Text style={s.successHint}>
            The admin will review your registration shortly.
          </Text>

          <View style={s.successButtons}>
            <TouchableOpacity
              style={[s.nextButton, { backgroundColor: accentColor }]}
              onPress={() => router.replace('/parent-registration-hub' as any)}
            >
              <Text style={s.nextButtonText}>View My Registrations</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.backButton}
              onPress={() => router.replace('/(tabs)' as any)}
            >
              <Text style={s.backButtonText}>Back to Home</Text>
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
        ) : currentStepDef?.key === 'player' && data ? (
          /* ============ PLAYER INFO STEP ============ */
          <View style={s.stepContainer}>
            {/* Multi-child tab bar */}
            {children.length > 1 && (
              <View style={s.childTabs}>
                {children.map((child, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[s.childTab, activeChildIndex === idx && { backgroundColor: accentColor }]}
                    onPress={() => setActiveChildIndex(idx)}
                  >
                    <Text style={[s.childTabText, activeChildIndex === idx && { color: '#FFF' }]}>
                      {child.first_name || `Child ${idx + 1}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Dynamic fields for active child */}
            {children[activeChildIndex] && (
              <View style={s.fieldsContainer}>
                {FIELD_ORDER.player_fields
                  .filter(key => data.config.player_fields[key]?.enabled)
                  .map(key => {
                    const fieldCfg = data.config.player_fields[key];
                    const child = children[activeChildIndex];
                    const value = child[key] || '';

                    // Date field
                    if (key === 'birth_date') {
                      return (
                        <View key={key} style={s.fieldBlock}>
                          <Text style={s.fieldLabel}>
                            {fieldCfg.label}
                            {fieldCfg.required && <Text style={s.required}> *</Text>}
                          </Text>
                          <TouchableOpacity
                            style={s.pickerButton}
                            onPress={() => setShowDatePicker(true)}
                          >
                            <Text style={[s.pickerButtonText, !value && { color: colors.textMuted }]}>
                              {value ? formatDate(value) : 'Select date'}
                            </Text>
                            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                          </TouchableOpacity>
                          {showDatePicker && (
                            <View>
                              <DateTimePicker
                                value={value ? new Date(value) : new Date(2012, 0, 1)}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                maximumDate={new Date()}
                                minimumDate={new Date(2000, 0, 1)}
                                onChange={(_, selectedDate) => {
                                  if (Platform.OS === 'android') setShowDatePicker(false);
                                  if (selectedDate) {
                                    updateChild(activeChildIndex, 'birth_date', selectedDate.toISOString().split('T')[0]);
                                  }
                                }}
                              />
                              {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                  style={[s.datePickerDone, { backgroundColor: accentColor }]}
                                  onPress={() => setShowDatePicker(false)}
                                >
                                  <Text style={s.datePickerDoneText}>Done</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    }

                    // Picker fields (grade, gender, sizes, experience)
                    if (PICKER_FIELDS.has(key)) {
                      return (
                        <View key={key} style={s.fieldBlock}>
                          <Text style={s.fieldLabel}>
                            {fieldCfg.label}
                            {fieldCfg.required && <Text style={s.required}> *</Text>}
                          </Text>
                          <TouchableOpacity
                            style={s.pickerButton}
                            onPress={() => openPicker(key, fieldCfg.label)}
                          >
                            <Text style={[s.pickerButtonText, !value && { color: colors.textMuted }]}>
                              {value ? getPickerDisplay(key, value) : `Select ${fieldCfg.label.toLowerCase()}`}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      );
                    }

                    // Numeric fields
                    if (NUMERIC_FIELDS.has(key)) {
                      return (
                        <View key={key} style={s.fieldBlock}>
                          <Text style={s.fieldLabel}>
                            {fieldCfg.label}
                            {fieldCfg.required && <Text style={s.required}> *</Text>}
                          </Text>
                          <TextInput
                            style={s.input}
                            value={value}
                            onChangeText={v => updateChild(activeChildIndex, key, v)}
                            placeholder={fieldCfg.label}
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            maxLength={key === 'preferred_number' ? 2 : 4}
                          />
                        </View>
                      );
                    }

                    // Default text field
                    return (
                      <View key={key} style={s.fieldBlock}>
                        <Text style={s.fieldLabel}>
                          {fieldCfg.label}
                          {fieldCfg.required && <Text style={s.required}> *</Text>}
                        </Text>
                        <TextInput
                          style={s.input}
                          value={value}
                          onChangeText={v => updateChild(activeChildIndex, key, v)}
                          placeholder={fieldCfg.label}
                          placeholderTextColor={colors.textMuted}
                          autoCapitalize={key.includes('name') ? 'words' : 'sentences'}
                          multiline={key === 'previous_teams'}
                        />
                      </View>
                    );
                  })}
              </View>
            )}
          </View>
        ) : currentStepDef?.key === 'parent' && data ? (
          /* ============ PARENT/GUARDIAN STEP ============ */
          <View style={s.stepContainer}>
            <Text style={s.sectionTitle}>Parent / Guardian Information</Text>
            <Text style={s.sectionSubtitle}>This info is shared across all children</Text>

            <View style={s.fieldsContainer}>
              {FIELD_ORDER.parent_fields
                .filter(key => data.config.parent_fields[key]?.enabled)
                .map(key => {
                  const fieldCfg = data.config.parent_fields[key];
                  const value = sharedInfo[key] || '';

                  // Group dividers
                  const showParent2Header = key === 'parent2_name';
                  const showAddressHeader = key === 'address';

                  return (
                    <View key={key}>
                      {showParent2Header && (
                        <Text style={[s.sectionTitle, { marginTop: 8 }]}>Second Parent/Guardian</Text>
                      )}
                      {showAddressHeader && (
                        <Text style={[s.sectionTitle, { marginTop: 8 }]}>Address</Text>
                      )}
                      <View style={s.fieldBlock}>
                        <Text style={s.fieldLabel}>
                          {fieldCfg.label}
                          {fieldCfg.required && <Text style={s.required}> *</Text>}
                        </Text>
                        <TextInput
                          style={s.input}
                          value={value}
                          onChangeText={v => updateSharedField(key, v)}
                          placeholder={fieldCfg.label}
                          placeholderTextColor={colors.textMuted}
                          keyboardType={key.includes('email') ? 'email-address' : key.includes('phone') ? 'phone-pad' : 'default'}
                          autoCapitalize={key.includes('email') ? 'none' : key.includes('name') ? 'words' : 'sentences'}
                          autoComplete={key.includes('email') ? 'email' : key.includes('phone') ? 'tel' : undefined}
                        />
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        ) : currentStepDef?.key === 'emergency' && data ? (
          /* ============ EMERGENCY & MEDICAL STEP ============ */
          <View style={s.stepContainer}>
            {/* Emergency Contact */}
            {Object.values(data.config.emergency_fields).some(f => f.enabled) && (
              <View style={s.sectionBlock}>
                <Text style={s.sectionTitle}>Emergency Contact</Text>
                <View style={s.fieldsContainer}>
                  {FIELD_ORDER.emergency_fields
                    .filter(key => data.config.emergency_fields[key]?.enabled)
                    .map(key => {
                      const fieldCfg = data.config.emergency_fields[key];
                      return (
                        <View key={key} style={s.fieldBlock}>
                          <Text style={s.fieldLabel}>
                            {fieldCfg.label}
                            {fieldCfg.required && <Text style={s.required}> *</Text>}
                          </Text>
                          <TextInput
                            style={s.input}
                            value={sharedInfo[key] || ''}
                            onChangeText={v => updateSharedField(key, v)}
                            placeholder={fieldCfg.label}
                            placeholderTextColor={colors.textMuted}
                            keyboardType={key.includes('phone') ? 'phone-pad' : 'default'}
                            autoCapitalize={key.includes('name') ? 'words' : 'sentences'}
                          />
                        </View>
                      );
                    })}
                </View>
              </View>
            )}

            {/* Medical Info */}
            {Object.values(data.config.medical_fields).some(f => f.enabled) && (
              <View style={s.sectionBlock}>
                <Text style={s.sectionTitle}>Medical Information</Text>
                <View style={s.medicalToggle}>
                  <Text style={s.medicalToggleText}>
                    Does your child have any medical conditions, allergies, or take medications?
                  </Text>
                  <View style={s.toggleRow}>
                    <TouchableOpacity
                      style={[s.toggleBtn, !showMedicalFields && { backgroundColor: colors.border }]}
                      onPress={() => setShowMedicalFields(false)}
                    >
                      <Text style={[s.toggleBtnText, !showMedicalFields && { fontWeight: '700' }]}>No</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.toggleBtn, showMedicalFields && { backgroundColor: accentColor }]}
                      onPress={() => setShowMedicalFields(true)}
                    >
                      <Text style={[s.toggleBtnText, showMedicalFields && { color: '#FFF', fontWeight: '700' }]}>Yes</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showMedicalFields && (
                  <View style={s.fieldsContainer}>
                    {FIELD_ORDER.medical_fields
                      .filter(key => data.config.medical_fields[key]?.enabled)
                      .map(key => {
                        const fieldCfg = data.config.medical_fields[key];
                        return (
                          <View key={key} style={s.fieldBlock}>
                            <Text style={s.fieldLabel}>
                              {fieldCfg.label}
                              {fieldCfg.required && <Text style={s.required}> *</Text>}
                            </Text>
                            <TextInput
                              style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
                              value={sharedInfo[key] || ''}
                              onChangeText={v => updateSharedField(key, v)}
                              placeholder={fieldCfg.label}
                              placeholderTextColor={colors.textMuted}
                              multiline
                              keyboardType={key.includes('phone') ? 'phone-pad' : 'default'}
                            />
                          </View>
                        );
                      })}
                  </View>
                )}
              </View>
            )}

            {/* Custom Questions */}
            {data.config.custom_questions?.length > 0 && (
              <View style={s.sectionBlock}>
                <Text style={s.sectionTitle}>Additional Questions</Text>
                <View style={s.fieldsContainer}>
                  {data.config.custom_questions.map((q, idx) => (
                    <View key={`cq-${idx}`} style={s.fieldBlock}>
                      <Text style={s.fieldLabel}>
                        {q.question}
                        {q.required && <Text style={s.required}> *</Text>}
                      </Text>
                      <TextInput
                        style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
                        value={customAnswers[String(idx)] || ''}
                        onChangeText={v => updateCustomAnswer(idx, v)}
                        placeholder="Your answer"
                        placeholderTextColor={colors.textMuted}
                        multiline
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : currentStepDef?.key === 'waivers' && data ? (
          /* ============ WAIVERS & SIGNATURE STEP ============ */
          <View style={s.stepContainer}>
            <Text style={s.sectionTitle}>Waivers & Agreements</Text>

            {Object.entries(data.config.waivers)
              .filter(([_, w]) => w.enabled)
              .map(([key, waiver]) => {
                const accepted = waiverState[key] || false;
                return (
                  <View key={key} style={s.waiverCard}>
                    <TouchableOpacity
                      style={s.waiverHeader}
                      onPress={() => setWaiverState(prev => ({ ...prev, [key]: !prev[key] }))}
                      activeOpacity={0.7}
                    >
                      <View style={[s.checkbox, accepted && { backgroundColor: accentColor, borderColor: accentColor }]}>
                        {accepted && <Ionicons name="checkmark" size={14} color="#FFF" />}
                      </View>
                      <Text style={s.waiverTitle}>
                        {waiver.title}
                        {waiver.required && <Text style={s.required}> *</Text>}
                      </Text>
                    </TouchableOpacity>
                    <Text style={s.waiverText}>{waiver.text}</Text>
                  </View>
                );
              })}

            {/* Digital Signature */}
            <View style={s.signatureSection}>
              <Text style={s.sectionTitle}>Digital Signature</Text>
              <Text style={s.signatureHint}>
                By typing your full name below, you agree to the terms above.
              </Text>
              <TextInput
                style={s.signatureInput}
                value={signature}
                onChangeText={setSignature}
                placeholder={sharedInfo.parent1_name || 'Full legal name'}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>
          </View>
        ) : currentStepDef?.key === 'review' && data ? (
          /* ============ REVIEW & SUBMIT STEP ============ */
          <View style={s.stepContainer}>
            {/* Children summary */}
            <View style={s.reviewSection}>
              <View style={s.reviewSectionHeader}>
                <Text style={s.reviewSectionTitle}>Children ({children.length})</Text>
                <TouchableOpacity onPress={() => jumpToStep('children')}>
                  <Text style={[s.editLink, { color: accentColor }]}>Edit</Text>
                </TouchableOpacity>
              </View>
              {children.map((child, idx) => (
                <Text key={idx} style={s.reviewItem}>
                  {child.first_name} {child.last_name}
                  {child.grade ? ` — Grade ${child.grade === '0' ? 'K' : child.grade}` : ''}
                  {child._isReturning === 'true' ? ' (Returning)' : ''}
                </Text>
              ))}
            </View>

            {/* Parent summary */}
            <View style={s.reviewSection}>
              <View style={s.reviewSectionHeader}>
                <Text style={s.reviewSectionTitle}>Parent/Guardian</Text>
                <TouchableOpacity onPress={() => jumpToStep('parent')}>
                  <Text style={[s.editLink, { color: accentColor }]}>Edit</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.reviewItem}>{sharedInfo.parent1_name}</Text>
              <Text style={s.reviewDetail}>
                {[sharedInfo.parent1_email, sharedInfo.parent1_phone].filter(Boolean).join(' · ')}
              </Text>
              {sharedInfo.parent2_name ? (
                <>
                  <Text style={[s.reviewItem, { marginTop: 4 }]}>{sharedInfo.parent2_name}</Text>
                  <Text style={s.reviewDetail}>
                    {[sharedInfo.parent2_email, sharedInfo.parent2_phone].filter(Boolean).join(' · ')}
                  </Text>
                </>
              ) : null}
            </View>

            {/* Emergency summary */}
            {(sharedInfo.emergency_name || sharedInfo.emergency_phone) && (
              <View style={s.reviewSection}>
                <View style={s.reviewSectionHeader}>
                  <Text style={s.reviewSectionTitle}>Emergency Contact</Text>
                  <TouchableOpacity onPress={() => jumpToStep('emergency')}>
                    <Text style={[s.editLink, { color: accentColor }]}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.reviewItem}>
                  {[sharedInfo.emergency_name, sharedInfo.emergency_phone, sharedInfo.emergency_relation].filter(Boolean).join(' · ')}
                </Text>
              </View>
            )}

            {/* Medical summary */}
            {showMedicalFields && (
              <View style={s.reviewSection}>
                <Text style={s.reviewSectionTitle}>Medical</Text>
                {sharedInfo.medical_conditions && <Text style={s.reviewDetail}>Conditions: {sharedInfo.medical_conditions}</Text>}
                {sharedInfo.allergies && <Text style={s.reviewDetail}>Allergies: {sharedInfo.allergies}</Text>}
                {sharedInfo.medications && <Text style={s.reviewDetail}>Medications: {sharedInfo.medications}</Text>}
                {!sharedInfo.medical_conditions && !sharedInfo.allergies && !sharedInfo.medications && (
                  <Text style={s.reviewDetail}>No medical conditions reported</Text>
                )}
              </View>
            )}

            {/* Waivers summary */}
            {Object.values(data.config.waivers).some(w => w.enabled) && (
              <View style={s.reviewSection}>
                <View style={s.reviewSectionHeader}>
                  <Text style={s.reviewSectionTitle}>Waivers</Text>
                  <TouchableOpacity onPress={() => jumpToStep('waivers')}>
                    <Text style={[s.editLink, { color: accentColor }]}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.waiverSummaryRow}>
                  {Object.entries(data.config.waivers)
                    .filter(([_, w]) => w.enabled)
                    .map(([key, w]) => (
                      <Text key={key} style={s.reviewDetail}>
                        {waiverState[key] ? '\u2713' : '\u2717'} {w.title}
                      </Text>
                    ))}
                </View>
                <Text style={s.reviewDetail}>Signed by: {signature}</Text>
              </View>
            )}

            {/* Fee summary */}
            {feeBreakdown && feeBreakdown.lines.length > 0 && (
              <View style={s.feeCard}>
                <Text style={s.feeTitle}>Fees</Text>
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
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* ============ FOOTER ============ */}
      <View style={s.footer}>
        <View style={s.footerButtons}>
          {currentStep > 0 && !submitted && (
            <TouchableOpacity style={s.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={s.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {!submitted && (
            <TouchableOpacity
              style={[s.nextButton, { backgroundColor: accentColor }, submitting && { opacity: 0.6 }]}
              onPress={isLastStep ? handleSubmit : handleNext}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Text style={s.nextButtonText}>{isLastStep ? 'Submit Registration' : 'Next'}</Text>
                  <Ionicons name={isLastStep ? 'checkmark-circle' : 'arrow-forward'} size={18} color="#000" />
                </>
              )}
            </TouchableOpacity>
          )}
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

      {/* ============ PICKER MODAL ============ */}
      <Modal
        visible={pickerModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerModal(prev => ({ ...prev, visible: false }))}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerModal(prev => ({ ...prev, visible: false }))}
        >
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{pickerModal.title}</Text>
              <TouchableOpacity onPress={() => setPickerModal(prev => ({ ...prev, visible: false }))}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={pickerModal.options}
              keyExtractor={item => item.value}
              style={s.modalList}
              renderItem={({ item }) => {
                const isSelected = children[activeChildIndex]?.[pickerModal.field] === item.value;
                return (
                  <TouchableOpacity
                    style={[s.modalOption, isSelected && { backgroundColor: accentColor + '15' }]}
                    onPress={() => {
                      updateChild(activeChildIndex, pickerModal.field, item.value);
                      setPickerModal(prev => ({ ...prev, visible: false }));
                    }}
                  >
                    <Text style={[s.modalOptionText, isSelected && { color: accentColor, fontWeight: '700' }]}>
                      {item.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={accentColor} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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

  // Review step
  reviewSection: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
    ...shadows.card,
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewItem: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  reviewDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  waiverSummaryRow: {
    gap: 2,
  },

  // Success screen
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  successMascot: {
    width: 120,
    height: 172,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  successHint: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  successButtons: {
    gap: 12,
    alignItems: 'center',
    width: '100%',
  },

  // Waiver cards
  waiverCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
    ...shadows.card,
  },
  waiverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waiverTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  waiverText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginLeft: 36,
  },

  // Digital signature
  signatureSection: {
    gap: 8,
    marginTop: 8,
  },
  signatureHint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  signatureInput: {
    backgroundColor: colors.background,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    padding: 14,
    fontSize: 18,
    color: colors.text,
    fontStyle: 'italic',
  },

  // Medical toggle
  medicalToggle: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  medicalToggleText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtnText: {
    fontSize: 15,
    color: colors.text,
  },

  // Player info — child tabs
  childTabs: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  childTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // Player info — fields
  fieldsContainer: {
    gap: 14,
  },
  fieldBlock: {
    gap: 4,
  },
  pickerButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  datePickerDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  datePickerDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },

  // Picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  modalList: {
    paddingHorizontal: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
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
