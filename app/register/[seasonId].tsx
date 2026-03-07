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
import { displayTextStyle, spacing, radii, shadows } from '@/lib/design-tokens';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import SignaturePad from '@/components/SignaturePad';

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

/** Phone number fields */
const PHONE_FIELDS = new Set(['parent1_phone', 'parent2_phone', 'emergency_phone']);

/** Format phone number as (XXX) XXX-XXXX */
function formatPhone(text: string): string {
  const cleaned = text.replace(/\D/g, '').slice(0, 10);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
}

/** Strip formatted phone to raw digits */
function stripPhone(text: string): string {
  return text.replace(/\D/g, '');
}

/** Email validation regex */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate a single field — returns error message or null */
function validateField(key: string, value: string, fieldCfg?: FieldConfig): string | null {
  if (fieldCfg?.required && !value?.trim()) return `${fieldCfg.label} is required`;
  if (!value?.trim()) return null;
  if (key.includes('email') && !EMAIL_RE.test(value)) return 'Invalid email address';
  if (PHONE_FIELDS.has(key) && stripPhone(value).length < 10) return 'Phone must be 10 digits';
  if (key === 'birth_date') {
    const age = Math.floor((Date.now() - new Date(value).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 4 || age > 19) return 'Age must be between 4 and 19';
  }
  return null;
}

/** textContentType map for iOS autofill */
const TEXT_CONTENT_TYPES: Record<string, string> = {
  first_name: 'givenName',
  last_name: 'familyName',
  parent1_name: 'name',
  parent1_email: 'emailAddress',
  parent1_phone: 'telephoneNumber',
  parent2_name: 'name',
  parent2_email: 'emailAddress',
  parent2_phone: 'telephoneNumber',
  address: 'streetAddressLine1',
  city: 'addressCity',
  state: 'addressState',
  zip: 'postalCode',
  emergency_name: 'name',
  emergency_phone: 'telephoneNumber',
};

/** autoComplete map for Android autofill */
const AUTO_COMPLETE: Record<string, string> = {
  first_name: 'given-name',
  last_name: 'family-name',
  parent1_name: 'name',
  parent1_email: 'email',
  parent1_phone: 'tel',
  parent2_name: 'name',
  parent2_email: 'email',
  parent2_phone: 'tel',
  address: 'street-address',
  city: 'address-level2',
  state: 'address-level1',
  zip: 'postal-code',
  emergency_name: 'name',
  emergency_phone: 'tel',
};

// ============================================
// COMPONENT
// ============================================

export default function RegistrationWizardScreen() {
  const { seasonId } = useLocalSearchParams<{ seasonId: string }>();
  const { user, profile } = useAuth();
  const router = useRouter();

  // Data loading
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LoadedRegistrationData | null>(null);

  // Inline validation — tracks which fields have been touched (blurred)
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  // Refs for auto-advance between fields
  const fieldRefs = useRef<Record<string, TextInput | null>>({});

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [children, setChildren] = useState<ChildData[]>([]);
  const [sharedInfo, setSharedInfo] = useState<Record<string, string>>({});
  const [waiverState, setWaiverState] = useState<Record<string, boolean>>({});
  const [waiverScrolled, setWaiverScrolled] = useState<Record<string, boolean>>({});
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

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
  const accentColor = data?.sport?.color_primary || data?.organization?.primary_color || BRAND.teal;

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

  // Update shared info field (parent, emergency, medical) — with phone auto-formatting
  const updateSharedField = useCallback((field: string, value: string) => {
    const formatted = PHONE_FIELDS.has(field) ? formatPhone(value) : value;
    setSharedInfo(prev => ({ ...prev, [field]: formatted }));
  }, []);

  // Handle field blur — mark as touched and validate
  const handleFieldBlur = useCallback((fieldKey: string, value: string, fieldCfg?: FieldConfig) => {
    setTouchedFields(prev => ({ ...prev, [fieldKey]: true }));
    const err = validateField(fieldKey, value, fieldCfg);
    setFieldErrors(prev => ({ ...prev, [fieldKey]: err }));
  }, []);

  // Focus the next field via ref
  const focusNextField = useCallback((nextKey: string) => {
    const ref = fieldRefs.current[nextKey];
    if (ref) ref.focus();
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
    const createdWaiverSigIds: string[] = [];
    const signatureName = signatureData?.startsWith('typed:')
      ? signatureData.slice(6)
      : (sharedInfo.parent1_name || 'Parent');

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
            waiver_signed_by: signatureName,
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
            signature_name: signatureName,
            signature_date: signatureDate,
            registration_data: {
              player: child,
              shared: sharedInfo,
              waivers: waiverState,
              custom_questions: customAnswers,
              signature: { name: signatureName, date: signatureDate, hasCanvas: !!signatureData && !signatureData.startsWith('typed:') },
              fees: feeBreakdown ? { lines: feeBreakdown.lines, total: feeBreakdown.total } : null,
              source: 'mobile_native',
              app_version: '1.0.0',
              submitted_at: signatureDate,
              submitted_by_user_id: user!.id,
            },
          }).select().single();

        if (regError && regError.code !== '23505') {
          throw new Error(`Failed to create registration for ${child.first_name}`);
        }
        if (registration) createdRegistrationIds.push(registration.id);

        // Insert waiver_signatures for each accepted waiver
        const waiverEntries = Object.entries(waiverState).filter(([_, accepted]) => accepted);
        if (waiverEntries.length > 0) {
          const waiverRows = waiverEntries.map(([waiverType]) => ({
            player_id: player.id,
            organization_id: data!.season.organization_id,
            season_id: seasonId,
            signed_by_name: signatureName,
            signed_by_email: sharedInfo.parent1_email || null,
            signed_by_user_id: user!.id,
            signed_by_relation: 'parent',
            signature_data: signatureData || null,
            status: 'signed',
            signed_at: signatureDate,
          }));
          const { data: sigs, error: sigError } = await supabase
            .from('waiver_signatures')
            .insert(waiverRows)
            .select('id');
          if (!sigError && sigs) {
            sigs.forEach(s => createdWaiverSigIds.push(s.id));
          }
        }

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
      if (createdWaiverSigIds.length > 0) {
        await supabase.from('waiver_signatures').delete().in('id', createdWaiverSigIds);
      }
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
    Keyboard.dismiss();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleNext = () => {
    Keyboard.dismiss();
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
      if (!signatureData) {
        Alert.alert('Signature Required', 'Please provide your signature to continue.');
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const s = createStyles(accentColor);

  // ---- Loading state ----
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={BRAND.teal} />
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
          <Ionicons name="alert-circle-outline" size={48} color={BRAND.error} />
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
            source={require('@/assets/images/mascot/celebrate.png')}
            style={s.successMascot}
            resizeMode="contain"
          />
          <Text style={s.successTitle}>You're Registered!</Text>
          <Text style={s.successSubtitle}>
            {children.length === 1
              ? `${children[0].first_name} is signed up for`
              : `${children.map(c => c.first_name).join(' & ')} are signed up for`}
            {'\n'}{season.name}{sport?.name ? ` ${sport.name}` : ''}
          </Text>

          {/* What's next */}
          <View style={s.whatsNextBox}>
            <Text style={s.whatsNextTitle}>What's next?</Text>
            <View style={s.whatsNextItem}>
              <Ionicons name="mail-outline" size={16} color={BRAND.teal} />
              <Text style={s.whatsNextText}>You'll receive a confirmation email</Text>
            </View>
            <View style={s.whatsNextItem}>
              <Ionicons name="people-outline" size={16} color={BRAND.teal} />
              <Text style={s.whatsNextText}>Team assignments coming soon</Text>
            </View>
            {feeBreakdown && feeBreakdown.total > 0 && (
              <View style={s.whatsNextItem}>
                <Ionicons name="wallet-outline" size={16} color={BRAND.teal} />
                <Text style={s.whatsNextText}>Complete any outstanding payments</Text>
              </View>
            )}
          </View>

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
          <Ionicons name="arrow-back" size={24} color={BRAND.textPrimary} />
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
            <View style={[s.orgLogoFallback, { backgroundColor: organization?.primary_color || BRAND.teal }]}>
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

        {/* Step dots + progress bar */}
        <View style={s.stepDotsRow}>
          {steps.map((step, idx) => (
            <View
              key={step.key}
              style={[
                s.stepDot,
                idx < currentStep && { backgroundColor: accentColor },
                idx === currentStep && { backgroundColor: accentColor, transform: [{ scale: 1.3 }] },
              ]}
            />
          ))}
        </View>
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
      <KeyboardAwareScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
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
                    <Text style={s.sectionSubtitle}>Select children to re-register for this season</Text>
                    {returningPlayers.map(player => {
                      const selected = selectedReturningIds.includes(player.id);
                      const initials = `${(player.first_name || '?')[0]}${(player.last_name || '?')[0]}`.toUpperCase();
                      const age = player.birth_date
                        ? Math.floor((Date.now() - new Date(player.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                        : null;
                      return (
                        <TouchableOpacity
                          key={player.id}
                          style={[s.returningCard, selected && { borderColor: accentColor, borderWidth: 2 }]}
                          onPress={() => toggleReturning(player.id)}
                          activeOpacity={0.7}
                        >
                          <View style={s.returningCardLeft}>
                            <View style={[s.returningAvatar, selected && { backgroundColor: accentColor }]}>
                              <Text style={[s.returningAvatarText, selected && { color: BRAND.white }]}>
                                {initials}
                              </Text>
                            </View>
                            <View style={s.returningInfo}>
                              <Text style={s.returningName}>{player.first_name} {player.last_name}</Text>
                              <Text style={s.returningDetail}>
                                {age ? `Age ${age}` : ''}
                                {player.grade != null ? `${age ? ' · ' : ''}Grade ${player.grade === 0 ? 'K' : player.grade}` : ''}
                                {player.school ? ` · ${player.school}` : ''}
                              </Text>
                            </View>
                          </View>
                          <View style={[s.checkbox, selected && { backgroundColor: accentColor, borderColor: accentColor }]}>
                            {selected && <Ionicons name="checkmark" size={14} color={BRAND.white} />}
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
                              <Ionicons name="close-circle" size={22} color={BRAND.error} />
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
                                placeholderTextColor={BRAND.textMuted}
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
                                placeholderTextColor={BRAND.textMuted}
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
            {/* Multi-child tab bar — scrollable with add button */}
            {children.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.childTabsScroll}
                contentContainerStyle={s.childTabsContent}
              >
                {children.map((child, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[s.childTab, activeChildIndex === idx && { backgroundColor: accentColor }]}
                    onPress={() => setActiveChildIndex(idx)}
                  >
                    <View style={[s.childTabAvatar, activeChildIndex === idx && { backgroundColor: BRAND.white + '30' }]}>
                      <Text style={[s.childTabInitial, activeChildIndex === idx && { color: BRAND.white }]}>
                        {(child.first_name || `${idx + 1}`)[0].toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[s.childTabText, activeChildIndex === idx && { color: BRAND.white }]}>
                      {child.first_name || `Child ${idx + 1}`}
                    </Text>
                    {child._isReturning === 'true' && (
                      <Ionicons name="refresh-circle" size={14} color={activeChildIndex === idx ? BRAND.white : BRAND.teal} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
                            <Text style={[s.pickerButtonText, !value && { color: BRAND.textMuted }]}>
                              {value ? formatDate(value) : 'Select date'}
                            </Text>
                            <Ionicons name="calendar-outline" size={18} color={BRAND.textMuted} />
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
                            <Text style={[s.pickerButtonText, !value && { color: BRAND.textMuted }]}>
                              {value ? getPickerDisplay(key, value) : `Select ${fieldCfg.label.toLowerCase()}`}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color={BRAND.textMuted} />
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
                            placeholderTextColor={BRAND.textMuted}
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
                          placeholderTextColor={BRAND.textMuted}
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
              {(() => {
                const enabledFields = FIELD_ORDER.parent_fields.filter(key => data.config.parent_fields[key]?.enabled);
                return enabledFields.map((key, idx) => {
                  const fieldCfg = data.config.parent_fields[key];
                  const value = sharedInfo[key] || '';
                  const isTouched = touchedFields[`parent_${key}`];
                  const fieldError = isTouched ? fieldErrors[`parent_${key}`] : null;
                  const isValid = isTouched && !fieldError && value.trim().length > 0;
                  const nextField = enabledFields[idx + 1];
                  const isLast = idx === enabledFields.length - 1;

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
                          ref={r => { fieldRefs.current[`parent_${key}`] = r; }}
                          style={[
                            s.input,
                            fieldError && s.inputError,
                            isValid && s.inputValid,
                          ]}
                          value={value}
                          onChangeText={v => updateSharedField(key, v)}
                          onBlur={() => handleFieldBlur(`parent_${key}`, value, fieldCfg)}
                          placeholder={fieldCfg.label}
                          placeholderTextColor={BRAND.textMuted}
                          keyboardType={key.includes('email') ? 'email-address' : PHONE_FIELDS.has(key) ? 'phone-pad' : key === 'zip' ? 'number-pad' : 'default'}
                          autoCapitalize={key.includes('email') ? 'none' : key.includes('name') ? 'words' : key === 'state' ? 'characters' : 'sentences'}
                          autoComplete={(AUTO_COMPLETE[key] as any) || undefined}
                          textContentType={(TEXT_CONTENT_TYPES[key] as any) || undefined}
                          returnKeyType={isLast ? 'done' : 'next'}
                          blurOnSubmit={isLast}
                          onSubmitEditing={() => {
                            if (nextField) focusNextField(`parent_${nextField}`);
                          }}
                          maxLength={key === 'zip' ? 5 : PHONE_FIELDS.has(key) ? 14 : undefined}
                        />
                        {fieldError && <Text style={s.fieldErrorText}>{fieldError}</Text>}
                      </View>
                    </View>
                  );
                });
              })()}
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
                  {(() => {
                    const enabledFields = FIELD_ORDER.emergency_fields.filter(key => data.config.emergency_fields[key]?.enabled);
                    return enabledFields.map((key, idx) => {
                      const fieldCfg = data.config.emergency_fields[key];
                      const value = sharedInfo[key] || '';
                      const isTouched = touchedFields[`emerg_${key}`];
                      const fieldError = isTouched ? fieldErrors[`emerg_${key}`] : null;
                      const isValid = isTouched && !fieldError && value.trim().length > 0;
                      const nextField = enabledFields[idx + 1];
                      const isLast = idx === enabledFields.length - 1;
                      return (
                        <View key={key} style={s.fieldBlock}>
                          <Text style={s.fieldLabel}>
                            {fieldCfg.label}
                            {fieldCfg.required && <Text style={s.required}> *</Text>}
                          </Text>
                          <TextInput
                            ref={r => { fieldRefs.current[`emerg_${key}`] = r; }}
                            style={[s.input, fieldError && s.inputError, isValid && s.inputValid]}
                            value={value}
                            onChangeText={v => updateSharedField(key, v)}
                            onBlur={() => handleFieldBlur(`emerg_${key}`, value, fieldCfg)}
                            placeholder={fieldCfg.label}
                            placeholderTextColor={BRAND.textMuted}
                            keyboardType={PHONE_FIELDS.has(key) ? 'phone-pad' : 'default'}
                            autoCapitalize={key.includes('name') ? 'words' : 'sentences'}
                            autoComplete={(AUTO_COMPLETE[key] as any) || undefined}
                            textContentType={(TEXT_CONTENT_TYPES[key] as any) || undefined}
                            returnKeyType={isLast ? 'done' : 'next'}
                            blurOnSubmit={isLast}
                            onSubmitEditing={() => { if (nextField) focusNextField(`emerg_${nextField}`); }}
                            maxLength={PHONE_FIELDS.has(key) ? 14 : undefined}
                          />
                          {fieldError && <Text style={s.fieldErrorText}>{fieldError}</Text>}
                        </View>
                      );
                    });
                  })()}
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
                      style={[s.toggleBtn, !showMedicalFields && { backgroundColor: BRAND.border }]}
                      onPress={() => setShowMedicalFields(false)}
                    >
                      <Text style={[s.toggleBtnText, !showMedicalFields && { fontFamily: FONTS.bodyBold }]}>No</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.toggleBtn, showMedicalFields && { backgroundColor: accentColor }]}
                      onPress={() => setShowMedicalFields(true)}
                    >
                      <Text style={[s.toggleBtnText, showMedicalFields && { color: BRAND.white, fontFamily: FONTS.bodyBold }]}>Yes</Text>
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
                              placeholderTextColor={BRAND.textMuted}
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
                        placeholderTextColor={BRAND.textMuted}
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
            <Text style={s.waiverSubtitle}>
              Please read and accept each waiver below, then sign at the bottom.
            </Text>

            {Object.entries(data.config.waivers)
              .filter(([_, w]) => w.enabled)
              .map(([key, waiver]) => {
                const accepted = waiverState[key] || false;
                const hasScrolled = waiverScrolled[key] || false;
                const canAccept = hasScrolled || !waiver.text || waiver.text.length < 200;

                return (
                  <View key={key} style={[s.waiverCard, accepted && s.waiverCardAccepted]}>
                    <Text style={s.waiverTitle}>
                      {waiver.title}
                      {waiver.required && <Text style={s.required}> *</Text>}
                    </Text>

                    {/* Scrollable waiver text */}
                    {waiver.text && waiver.text.length > 0 && (
                      <View style={s.waiverTextWrap}>
                        <ScrollView
                          style={s.waiverScroll}
                          nestedScrollEnabled
                          showsVerticalScrollIndicator
                          onScroll={({ nativeEvent }) => {
                            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                            const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
                            if (nearBottom && !waiverScrolled[key]) {
                              setWaiverScrolled(prev => ({ ...prev, [key]: true }));
                            }
                          }}
                          scrollEventThrottle={100}
                        >
                          <Text style={s.waiverText}>{waiver.text}</Text>
                        </ScrollView>
                        {!hasScrolled && waiver.text.length >= 200 && (
                          <View style={s.scrollHint}>
                            <Ionicons name="chevron-down" size={14} color={BRAND.textMuted} />
                            <Text style={s.scrollHintText}>Scroll to read full waiver</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Accept checkbox — only active after scrolling */}
                    <TouchableOpacity
                      style={[s.waiverAcceptRow, !canAccept && s.waiverAcceptDisabled]}
                      onPress={() => {
                        if (canAccept) {
                          setWaiverState(prev => ({ ...prev, [key]: !prev[key] }));
                        }
                      }}
                      activeOpacity={canAccept ? 0.7 : 1}
                    >
                      <View style={[
                        s.checkbox,
                        accepted && { backgroundColor: accentColor, borderColor: accentColor },
                        !canAccept && { opacity: 0.4 },
                      ]}>
                        {accepted && <Ionicons name="checkmark" size={14} color={BRAND.white} />}
                      </View>
                      <Text style={[s.waiverAcceptLabel, !canAccept && { color: BRAND.textMuted }]}>
                        I have read and agree to this waiver
                      </Text>
                      {accepted && (
                        <View style={s.signedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={BRAND.teal} />
                          <Text style={s.signedBadgeText}>Accepted</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}

            {/* Signature Pad */}
            <View style={s.signatureSection}>
              <Text style={s.sectionTitle}>Your Signature</Text>
              <SignaturePad
                onSave={(base64) => setSignatureData(base64)}
                onClear={() => setSignatureData(null)}
                hasSigned={!!signatureData}
                parentName={sharedInfo.parent1_name}
                accentColor={accentColor}
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
                      <View key={key} style={s.waiverSummaryItem}>
                        <Ionicons
                          name={waiverState[key] ? 'checkmark-circle' : 'close-circle'}
                          size={16}
                          color={waiverState[key] ? BRAND.teal : BRAND.error}
                        />
                        <Text style={s.reviewDetail}>{w.title}</Text>
                      </View>
                    ))}
                </View>
                {signatureData && (
                  <View style={s.waiverSummaryItem}>
                    <Ionicons name="create-outline" size={14} color={BRAND.teal} />
                    <Text style={s.reviewDetail}>
                      Signed by: {signatureData.startsWith('typed:') ? signatureData.slice(6) : sharedInfo.parent1_name || 'Parent'}
                      {signatureData.startsWith('typed:') ? ' (typed)' : ' (drawn)'}
                    </Text>
                  </View>
                )}
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
      </KeyboardAwareScrollView>

      {/* ============ FOOTER ============ */}
      <View style={s.footer}>
        <View style={s.footerButtons}>
          {currentStep > 0 && !submitted && (
            <TouchableOpacity style={s.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={18} color={BRAND.textPrimary} />
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
                <ActivityIndicator size="small" color={BRAND.white} />
              ) : (
                <>
                  <Text style={s.nextButtonText}>{isLastStep ? 'Submit Registration' : 'Next'}</Text>
                  <Ionicons name={isLastStep ? 'checkmark-circle' : 'arrow-forward'} size={18} color={BRAND.white} />
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
                <Ionicons name="close" size={24} color={BRAND.textPrimary} />
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
                    <Text style={[s.modalOptionText, isSelected && { color: accentColor, fontFamily: FONTS.bodyBold }]}>
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

const createStyles = (accentColor: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.white,
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
    color: BRAND.textMuted,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textPrimary,
  },
  errorText: {
    fontSize: 14,
    color: BRAND.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: BRAND.teal,
    borderRadius: 12,
  },
  retryBtnText: {
    fontSize: 16,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.white,
  },

  // Header
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    backgroundColor: BRAND.white,
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
    fontFamily: FONTS.bodyExtraBold,
    color: BRAND.white,
  },
  orgTextCol: {
    flex: 1,
  },
  orgName: {
    fontSize: 17,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textPrimary,
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
    color: BRAND.textMuted,
    fontFamily: FONTS.bodySemiBold,
  },
  stepDotsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.border,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: BRAND.border,
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepLabel: {
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 6,
    textAlign: 'center',
    fontFamily: FONTS.bodySemiBold,
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
    fontFamily: FONTS.bodyBold,
    color: BRAND.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: BRAND.textMuted,
    marginTop: -4,
  },

  // Returning player cards
  returningCard: {
    backgroundColor: BRAND.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: BRAND.border,
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
  returningAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.warmGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  returningAvatarText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textPrimary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BRAND.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  returningInfo: {
    flex: 1,
  },
  returningName: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textPrimary,
  },
  returningDetail: {
    fontSize: 13,
    color: BRAND.textMuted,
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
    fontFamily: FONTS.bodyBold,
  },

  // New child cards
  newChildCard: {
    backgroundColor: BRAND.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: BRAND.border,
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
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textPrimary,
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
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textMuted,
  },
  required: {
    color: BRAND.error,
  },
  input: {
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: radii.card,
    padding: 12,
    fontSize: 15,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textPrimary,
  },
  inputError: {
    borderColor: BRAND.error,
    borderWidth: 1.5,
  },
  inputValid: {
    borderColor: BRAND.teal,
    borderWidth: 1.5,
  },
  fieldErrorText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.error,
    marginTop: 4,
    marginLeft: 4,
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
    fontFamily: FONTS.bodySemiBold,
  },

  // Fee preview
  feeCard: {
    backgroundColor: BRAND.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 16,
    gap: 8,
    ...shadows.card,
  },
  feeTitle: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  feeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 14,
    color: BRAND.textMuted,
  },
  feeAmount: {
    fontSize: 14,
    color: BRAND.textPrimary,
    fontFamily: FONTS.bodySemiBold,
  },
  feeDivider: {
    height: 1,
    backgroundColor: BRAND.border,
    marginVertical: 4,
  },
  feeTotalLabel: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textPrimary,
  },
  feeTotalAmount: {
    fontSize: 16,
    fontFamily: FONTS.bodyExtraBold,
    color: BRAND.textPrimary,
  },
  feeDisclaimer: {
    fontSize: 12,
    color: BRAND.textMuted,
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
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textMuted,
  },

  // Review step
  reviewSection: {
    backgroundColor: BRAND.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: BRAND.border,
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
    fontFamily: FONTS.bodyBold,
    color: BRAND.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editLink: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
  },
  reviewItem: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textPrimary,
  },
  reviewDetail: {
    fontSize: 13,
    color: BRAND.textMuted,
    lineHeight: 18,
  },
  waiverSummaryRow: {
    gap: 6,
  },
  waiverSummaryItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
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
    ...displayTextStyle,
    fontSize: 24,
    color: BRAND.textPrimary,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: BRAND.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
  },
  whatsNextBox: {
    backgroundColor: `${BRAND.teal}08`,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: `${BRAND.teal}20`,
    padding: 16,
    gap: 10,
    width: '100%',
  },
  whatsNextTitle: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textPrimary,
    marginBottom: 2,
  },
  whatsNextItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  whatsNextText: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textMuted,
    flex: 1,
  },
  successButtons: {
    gap: 12,
    alignItems: 'center',
    width: '100%',
  },

  // Waiver cards
  waiverSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textMuted,
    lineHeight: 20,
    marginBottom: 4,
  },
  waiverCard: {
    backgroundColor: BRAND.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 16,
    gap: 12,
    ...shadows.card,
  },
  waiverCardAccepted: {
    borderColor: BRAND.teal,
    backgroundColor: `${BRAND.teal}06`,
  },
  waiverTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textPrimary,
  },
  waiverTextWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.warmGray,
    overflow: 'hidden' as const,
  },
  waiverScroll: {
    maxHeight: 160,
    padding: 12,
  },
  waiverText: {
    fontSize: 13,
    color: BRAND.textMuted,
    lineHeight: 19,
  },
  scrollHint: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 4,
    paddingVertical: 6,
    backgroundColor: `${BRAND.textMuted}0A`,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
  },
  scrollHintText: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textMuted,
  },
  waiverAcceptRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingTop: 4,
  },
  waiverAcceptDisabled: {
    opacity: 0.5,
  },
  waiverAcceptLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textPrimary,
  },
  signedBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  signedBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.teal,
  },

  // Digital signature
  signatureSection: {
    gap: 10,
    marginTop: 12,
  },

  // Medical toggle
  medicalToggle: {
    backgroundColor: BRAND.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 14,
    gap: 10,
  },
  medicalToggleText: {
    fontSize: 14,
    color: BRAND.textPrimary,
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
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  toggleBtnText: {
    fontSize: 15,
    color: BRAND.textPrimary,
  },

  // Player info — child tabs
  childTabsScroll: {
    marginBottom: 16,
  },
  childTabsContent: {
    gap: 8,
    paddingRight: 16,
  },
  childTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  childTabAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND.warmGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childTabInitial: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textPrimary,
  },
  childTabText: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textPrimary,
  },

  // Player info — fields
  fieldsContainer: {
    gap: 14,
  },
  fieldBlock: {
    gap: 4,
  },
  pickerButton: {
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: radii.card,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontSize: 15,
    color: BRAND.textPrimary,
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
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.white,
  },

  // Picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: BRAND.white,
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
    borderBottomColor: BRAND.border,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textPrimary,
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
    color: BRAND.textPrimary,
  },

  // Placeholder (for remaining steps)
  stepPlaceholder: {
    backgroundColor: BRAND.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    ...shadows.card,
  },
  placeholderTitle: {
    fontSize: 18,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textPrimary,
  },
  placeholderText: {
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    backgroundColor: BRAND.white,
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
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textPrimary,
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
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.white,
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
    color: BRAND.textMuted,
  },
});
