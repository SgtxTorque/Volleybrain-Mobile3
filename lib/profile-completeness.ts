/**
 * profile-completeness.ts — Compares current registration_config required fields
 * against existing player data. Returns missing fields and completion percentage.
 */
import { supabase } from './supabase';
import {
  DEFAULT_REGISTRATION_CONFIG,
  FIELD_ORDER,
  type FieldConfig,
  type RegistrationConfig,
} from './registration-config';

// ─── Types ───────────────────────────────────────────────────────

export type MissingField = {
  key: string;
  label: string;
  group: 'player' | 'parent' | 'emergency' | 'medical';
  currentValue: string | null;
};

export type CompletenessResult = {
  complete: boolean;
  percentage: number;
  totalRequired: number;
  filledRequired: number;
  missingFields: MissingField[];
  missingWaivers: string[];
  playerId: string;
  playerName: string;
};

// ─── Field → column mapping ─────────────────────────────────────

const FIELD_TO_COLUMN: Record<string, string> = {
  // Player fields
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
  // Parent fields
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
  // Emergency fields
  emergency_name: 'emergency_contact_name',
  emergency_phone: 'emergency_contact_phone',
  emergency_relation: 'emergency_contact_relation',
  // Medical fields
  medical_conditions: 'medical_conditions',
  allergies: 'allergies',
  medications: 'medications',
};

// ─── Checker ─────────────────────────────────────────────────────

export async function checkProfileCompleteness(
  playerId: string,
  seasonId: string,
): Promise<CompletenessResult> {
  // 1. Load player data
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();

  if (!player) {
    return {
      complete: true,
      percentage: 100,
      totalRequired: 0,
      filledRequired: 0,
      missingFields: [],
      missingWaivers: [],
      playerId,
      playerName: 'Unknown',
    };
  }

  // 2. Load registration config for the season
  const { data: season } = await supabase
    .from('seasons')
    .select('registration_config')
    .eq('id', seasonId)
    .single();

  const config: RegistrationConfig = season?.registration_config
    ? mergeWithDefaults(season.registration_config)
    : DEFAULT_REGISTRATION_CONFIG;

  // 3. Check each required field
  const missingFields: MissingField[] = [];

  const checkGroup = (
    fields: Record<string, FieldConfig>,
    group: MissingField['group'],
  ) => {
    for (const [key, fieldCfg] of Object.entries(fields)) {
      if (!fieldCfg.enabled || !fieldCfg.required) continue;
      const column = FIELD_TO_COLUMN[key];
      if (!column) continue;
      const value = player[column];
      const isEmpty = value === null || value === undefined || String(value).trim() === '';
      if (isEmpty) {
        missingFields.push({
          key,
          label: fieldCfg.label,
          group,
          currentValue: null,
        });
      }
    }
  };

  checkGroup(config.player_fields, 'player');
  checkGroup(config.parent_fields, 'parent');
  checkGroup(config.emergency_fields, 'emergency');
  checkGroup(config.medical_fields, 'medical');

  // 4. Check waivers
  const missingWaivers: string[] = [];
  for (const [key, waiver] of Object.entries(config.waivers)) {
    if (!waiver.enabled || !waiver.required) continue;
    const waiverColumn = key === 'liability' ? 'waiver_liability'
      : key === 'photo_release' ? 'waiver_photo'
      : key === 'code_of_conduct' ? 'waiver_conduct'
      : null;
    if (waiverColumn && !player[waiverColumn]) {
      missingWaivers.push(waiver.title);
    }
  }

  // 5. Calculate completion
  const totalRequired = countRequired(config) + countRequiredWaivers(config);
  const missingCount = missingFields.length + missingWaivers.length;
  const filledRequired = totalRequired - missingCount;
  const percentage = totalRequired > 0 ? Math.round((filledRequired / totalRequired) * 100) : 100;

  return {
    complete: missingCount === 0,
    percentage,
    totalRequired,
    filledRequired,
    missingFields,
    missingWaivers,
    playerId,
    playerName: `${player.first_name || ''} ${player.last_name || ''}`.trim(),
  };
}

// ─── Batch check for multiple players ────────────────────────────

export async function checkBatchCompleteness(
  playerIds: string[],
  seasonId: string,
): Promise<CompletenessResult[]> {
  const results: CompletenessResult[] = [];
  // Batch in groups of 10 to avoid too many concurrent queries
  for (let i = 0; i < playerIds.length; i += 10) {
    const batch = playerIds.slice(i, i + 10);
    const batchResults = await Promise.all(
      batch.map(id => checkProfileCompleteness(id, seasonId)),
    );
    results.push(...batchResults);
  }
  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────

function countRequired(config: RegistrationConfig): number {
  let count = 0;
  for (const fields of [config.player_fields, config.parent_fields, config.emergency_fields, config.medical_fields]) {
    for (const f of Object.values(fields)) {
      if (f.enabled && f.required) count++;
    }
  }
  return count;
}

function countRequiredWaivers(config: RegistrationConfig): number {
  let count = 0;
  for (const w of Object.values(config.waivers)) {
    if (w.enabled && w.required) count++;
  }
  return count;
}

function mergeWithDefaults(partial: Partial<RegistrationConfig>): RegistrationConfig {
  return {
    player_fields: { ...DEFAULT_REGISTRATION_CONFIG.player_fields, ...partial.player_fields },
    parent_fields: { ...DEFAULT_REGISTRATION_CONFIG.parent_fields, ...partial.parent_fields },
    emergency_fields: { ...DEFAULT_REGISTRATION_CONFIG.emergency_fields, ...partial.emergency_fields },
    medical_fields: { ...DEFAULT_REGISTRATION_CONFIG.medical_fields, ...partial.medical_fields },
    waivers: { ...DEFAULT_REGISTRATION_CONFIG.waivers, ...partial.waivers },
    custom_questions: partial.custom_questions || DEFAULT_REGISTRATION_CONFIG.custom_questions,
  };
}
