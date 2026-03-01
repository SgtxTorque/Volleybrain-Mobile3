import { supabase } from './supabase';

// ============================================
// TYPES
// ============================================

export type FieldConfig = {
  enabled: boolean;
  required: boolean;
  label: string;
};

export type WaiverConfig = {
  enabled: boolean;
  required: boolean;
  title: string;
  text: string;
};

export type CustomQuestion = {
  question: string;
  required: boolean;
};

export type RegistrationConfig = {
  player_fields: Record<string, FieldConfig>;
  parent_fields: Record<string, FieldConfig>;
  emergency_fields: Record<string, FieldConfig>;
  medical_fields: Record<string, FieldConfig>;
  waivers: Record<string, WaiverConfig>;
  custom_questions: CustomQuestion[];
};

export type SeasonFee = {
  id: string;
  fee_type: string;
  fee_name: string;
  amount: number;
  due_date: string | null;
  required: boolean;
  sort_order: number;
};

export type LoadedRegistrationData = {
  season: any;
  organization: any;
  sport: any;
  config: RegistrationConfig;
  fees: SeasonFee[];
};

// ============================================
// DEFAULT CONFIG
// ============================================

export const DEFAULT_REGISTRATION_CONFIG: RegistrationConfig = {
  player_fields: {
    first_name: { enabled: true, required: true, label: 'First Name' },
    last_name: { enabled: true, required: true, label: 'Last Name' },
    birth_date: { enabled: true, required: true, label: 'Date of Birth' },
    gender: { enabled: true, required: false, label: 'Gender' },
    grade: { enabled: true, required: false, label: 'Grade' },
    school: { enabled: true, required: false, label: 'School' },
  },
  parent_fields: {
    parent1_name: { enabled: true, required: true, label: 'Parent/Guardian Name' },
    parent1_email: { enabled: true, required: true, label: 'Email' },
    parent1_phone: { enabled: true, required: true, label: 'Phone' },
  },
  emergency_fields: {
    emergency_name: { enabled: true, required: true, label: 'Emergency Contact Name' },
    emergency_phone: { enabled: true, required: true, label: 'Emergency Phone' },
    emergency_relation: { enabled: true, required: false, label: 'Relationship' },
  },
  medical_fields: {
    medical_conditions: { enabled: true, required: false, label: 'Medical Conditions/Allergies' },
  },
  waivers: {
    liability: { enabled: true, required: true, title: 'Liability Waiver', text: 'I understand and accept the risks associated with participation in athletic activities.' },
    photo_release: { enabled: true, required: false, title: 'Photo/Video Release', text: 'I consent to photos and videos being taken and used for promotional purposes.' },
    code_of_conduct: { enabled: true, required: false, title: 'Code of Conduct', text: 'I agree to follow the organization\'s code of conduct and sportsmanship guidelines.' },
  },
  custom_questions: [],
};

// ============================================
// FIELD ORDER
// ============================================

export const FIELD_ORDER = {
  player_fields: [
    'first_name', 'last_name', 'birth_date', 'gender', 'grade', 'school',
    'shirt_size', 'jersey_size', 'shorts_size', 'preferred_number',
    'position_preference', 'experience_level', 'previous_teams', 'height', 'weight',
  ],
  parent_fields: [
    'parent1_name', 'parent1_email', 'parent1_phone',
    'parent2_name', 'parent2_email', 'parent2_phone',
    'address', 'city', 'state', 'zip',
  ],
  emergency_fields: [
    'emergency_name', 'emergency_phone', 'emergency_relation',
    'emergency2_name', 'emergency2_phone',
  ],
  medical_fields: [
    'medical_conditions', 'allergies', 'medications',
    'doctor_name', 'doctor_phone', 'insurance_provider', 'insurance_policy',
  ],
};

// ============================================
// CONFIG LOADER
// ============================================

export async function loadRegistrationConfig(seasonId: string): Promise<LoadedRegistrationData> {
  // Fetch season with org, sport, and fees
  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select(`
      *,
      organizations (id, name, slug, logo_url, primary_color),
      sports (id, name, code, icon, color_primary)
    `)
    .eq('id', seasonId)
    .single();

  if (seasonError || !season) {
    throw new Error('Season not found');
  }

  // Load fees
  const { data: fees } = await supabase
    .from('season_fees')
    .select('id, fee_type, fee_name, amount, due_date, required, sort_order')
    .eq('season_id', seasonId)
    .order('sort_order');

  // Resolve config: season.registration_config → template → default
  let config: RegistrationConfig;

  if (season.registration_config) {
    config = mergeWithDefaults(season.registration_config);
  } else if (season.registration_template_id) {
    const { data: template } = await supabase
      .from('registration_templates')
      .select('player_fields, parent_fields, emergency_fields, medical_fields, waivers, custom_questions')
      .eq('id', season.registration_template_id)
      .single();

    if (template) {
      config = mergeWithDefaults({
        player_fields: template.player_fields,
        parent_fields: template.parent_fields,
        emergency_fields: template.emergency_fields,
        medical_fields: template.medical_fields,
        waivers: template.waivers,
        custom_questions: template.custom_questions,
      });
    } else {
      config = DEFAULT_REGISTRATION_CONFIG;
    }
  } else {
    config = DEFAULT_REGISTRATION_CONFIG;
  }

  return {
    season,
    organization: season.organizations,
    sport: season.sports,
    config,
    fees: fees || [],
  };
}

/** Merge partial config with defaults so every section exists */
function mergeWithDefaults(partial: any): RegistrationConfig {
  return {
    player_fields: { ...DEFAULT_REGISTRATION_CONFIG.player_fields, ...(partial?.player_fields || {}) },
    parent_fields: { ...DEFAULT_REGISTRATION_CONFIG.parent_fields, ...(partial?.parent_fields || {}) },
    emergency_fields: { ...DEFAULT_REGISTRATION_CONFIG.emergency_fields, ...(partial?.emergency_fields || {}) },
    medical_fields: { ...DEFAULT_REGISTRATION_CONFIG.medical_fields, ...(partial?.medical_fields || {}) },
    waivers: { ...DEFAULT_REGISTRATION_CONFIG.waivers, ...(partial?.waivers || {}) },
    custom_questions: partial?.custom_questions || DEFAULT_REGISTRATION_CONFIG.custom_questions,
  };
}
