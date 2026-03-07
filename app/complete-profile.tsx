/**
 * CompleteProfile — Mini-form for missing registration fields.
 * Route: /complete-profile?playerId=X&seasonId=Y
 * Shows ONLY missing fields, pre-populated with existing data.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { useAuth } from '@/lib/auth';
import { checkProfileCompleteness, type MissingField } from '@/lib/profile-completeness';
import { supabase } from '@/lib/supabase';
import { radii, shadows } from '@/lib/design-tokens';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

// ─── Field → column mapping (same as profile-completeness) ──────

const FIELD_TO_COLUMN: Record<string, string> = {
  first_name: 'first_name',
  last_name: 'last_name',
  birth_date: 'date_of_birth',
  gender: 'gender',
  grade: 'grade',
  school: 'school',
  shirt_size: 'uniform_size_jersey',
  jersey_size: 'uniform_size_jersey',
  shorts_size: 'uniform_size_shorts',
  preferred_number: 'jersey_number',
  position_preference: 'position',
  experience_level: 'experience_level',
  height: 'height',
  weight: 'weight',
  parent1_name: 'parent_name',
  parent1_email: 'parent_email',
  parent1_phone: 'parent_phone',
  parent2_name: 'parent_2_name',
  parent2_email: 'parent_2_email',
  parent2_phone: 'parent_2_phone',
  address: 'address',
  city: 'city',
  state: 'state',
  zip: 'zip',
  emergency_name: 'emergency_contact_name',
  emergency_phone: 'emergency_contact_phone',
  emergency_relation: 'emergency_contact_relation',
  medical_conditions: 'medical_conditions',
  allergies: 'allergies',
  medications: 'medications',
};

const PHONE_FIELDS = new Set(['parent1_phone', 'parent2_phone', 'emergency_phone']);

function formatPhone(text: string): string {
  const cleaned = text.replace(/\D/g, '').slice(0, 10);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
}

const GROUP_LABELS: Record<string, string> = {
  player: 'Player Information',
  parent: 'Parent/Guardian',
  emergency: 'Emergency Contact',
  medical: 'Medical Information',
};

// ─── Component ───────────────────────────────────────────────────

export default function CompleteProfileScreen() {
  const { playerId, seasonId } = useLocalSearchParams<{ playerId: string; seasonId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (playerId && seasonId) loadMissing();
  }, [playerId, seasonId]);

  const loadMissing = async () => {
    setLoading(true);
    try {
      const result = await checkProfileCompleteness(playerId!, seasonId!);
      setMissingFields(result.missingFields);
      setPlayerName(result.playerName);

      // Initialize values from current data
      const init: Record<string, string> = {};
      result.missingFields.forEach(f => {
        init[f.key] = f.currentValue || '';
      });
      setValues(init);
    } catch {
      Alert.alert('Error', 'Could not load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const updateValue = useCallback((key: string, val: string) => {
    const formatted = PHONE_FIELDS.has(key) ? formatPhone(val) : val;
    setValues(prev => ({ ...prev, [key]: formatted }));
  }, []);

  const handleSave = async () => {
    // Validate required fields are filled
    const empty = missingFields.filter(f => !values[f.key]?.trim());
    if (empty.length > 0) {
      Alert.alert('Missing Fields', `Please fill in: ${empty.map(f => f.label).join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      // Build update object mapping field keys to DB columns
      const update: Record<string, any> = {};
      for (const field of missingFields) {
        const column = FIELD_TO_COLUMN[field.key];
        if (!column) continue;
        let val: any = values[field.key]?.trim() || null;
        // Strip phone formatting for storage
        if (PHONE_FIELDS.has(field.key) && val) {
          val = val.replace(/\D/g, '');
        }
        // Convert grade to number
        if (field.key === 'grade' && val) {
          val = parseInt(val, 10) || null;
        }
        update[column] = val;
      }

      const { error } = await supabase
        .from('players')
        .update(update)
        .eq('id', playerId!);

      if (error) throw error;

      Alert.alert('Updated!', `${playerName}'s profile is now complete.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading ───────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND.teal} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Already complete ──────────────────────────

  if (missingFields.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={BRAND.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={64} color={BRAND.teal} />
          <Text style={styles.completeTitle}>All Set!</Text>
          <Text style={styles.completeSubtitle}>
            {playerName}'s profile is complete. No missing information.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Group fields by category ──────────────────

  const grouped: Record<string, MissingField[]> = {};
  missingFields.forEach(f => {
    if (!grouped[f.group]) grouped[f.group] = [];
    grouped[f.group].push(f);
  });

  // ─── Form ──────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        {/* Banner */}
        <View style={styles.banner}>
          <Ionicons name="alert-circle" size={20} color={BRAND.coral} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>
              {missingFields.length} missing field{missingFields.length !== 1 ? 's' : ''} for {playerName}
            </Text>
            <Text style={styles.bannerSubtitle}>
              Please fill in the information below to complete registration.
            </Text>
          </View>
        </View>

        {/* Grouped fields */}
        {Object.entries(grouped).map(([group, fields]) => (
          <View key={group} style={styles.section}>
            <Text style={styles.sectionTitle}>{GROUP_LABELS[group] || group}</Text>
            {fields.map(field => (
              <View key={field.key} style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>
                  {field.label} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={values[field.key] || ''}
                  onChangeText={(v) => updateValue(field.key, v)}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  placeholderTextColor={BRAND.textMuted}
                  keyboardType={PHONE_FIELDS.has(field.key) ? 'phone-pad' : field.key.includes('email') ? 'email-address' : 'default'}
                  autoCapitalize={field.key.includes('email') ? 'none' : 'words'}
                />
              </View>
            ))}
          </View>
        ))}
      </KeyboardAwareScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={BRAND.white} />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color={BRAND.white} />
              <Text style={styles.saveButtonText}>Update Profile</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    backgroundColor: BRAND.white,
  },
  headerTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
    color: BRAND.textPrimary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  completeTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 22,
    color: BRAND.textPrimary,
  },
  completeSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: BRAND.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: `${BRAND.coral}10`,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: `${BRAND.coral}30`,
    padding: 16,
    marginBottom: 20,
  },
  bannerTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.textPrimary,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    lineHeight: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
    marginBottom: 6,
  },
  required: {
    color: BRAND.coral,
  },
  input: {
    backgroundColor: BRAND.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 14,
    fontSize: 16,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textPrimary,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    backgroundColor: BRAND.white,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND.teal,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: BRAND.white,
  },
});
