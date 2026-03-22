/**
 * Evaluations data layer — skills, scale helpers, CRUD, OVR calculation.
 * Uses existing tables: player_skill_ratings (9 cols, 1-10 int)
 *                       player_evaluations (history + jsonb skills)
 */
import { supabase } from '@/lib/supabase';

// ─── Skill Definitions (match player_skill_ratings columns) ────────
export type SkillCategory = 'technical' | 'mental' | 'physical';

export type EvalSkill = {
  key: string;       // DB column name in player_skill_ratings
  label: string;     // UI display name
  icon: string;      // Emoji icon
  category: SkillCategory;
};

export const EVAL_SKILLS: EvalSkill[] = [
  // Technical
  { key: 'serving_rating', label: 'Serving', icon: '\u{1F3D0}', category: 'technical' },
  { key: 'passing_rating', label: 'Passing', icon: '\u{1F91D}', category: 'technical' },
  { key: 'setting_rating', label: 'Setting', icon: '\u{1F91A}', category: 'technical' },
  { key: 'attacking_rating', label: 'Hitting', icon: '\u26A1', category: 'technical' },
  { key: 'blocking_rating', label: 'Blocking', icon: '\u{1F6E1}', category: 'technical' },
  { key: 'defense_rating', label: 'Defense', icon: '\u{1F3AF}', category: 'technical' },
  // Mental
  { key: 'coachability_rating', label: 'Coachability', icon: '\u{1F4DA}', category: 'mental' },
  { key: 'teamwork_rating', label: 'Teamwork', icon: '\u{1F91D}', category: 'mental' },
  // Physical
  { key: 'hustle_rating', label: 'Hustle', icon: '\u{1F525}', category: 'physical' },
];

export const SKILL_KEYS = EVAL_SKILLS.map(s => s.key);

// ─── Scale helpers ─────────────────────────────────────────────────
/** UI 1-5 → DB 1-10 */
export function uiToDb(rating: number): number {
  return Math.min(10, Math.max(1, rating * 2));
}

/** DB 1-10 → UI 1-5 */
export function dbToUi(rating: number): number {
  return Math.round(rating / 2);
}

/**
 * Calculate OVR (0-99) from DB-scale ratings (1-10).
 * 10 avg → 99, 5 avg → 44, 1 avg → 0
 */
export function calculateOVR(ratings: Record<string, number>): number {
  const values = SKILL_KEYS.map(k => ratings[k] || 0).filter(v => v > 0);
  if (values.length === 0) return 0;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  // Scale 1-10 to 0-99:  (avg - 1) / 9 * 99
  return Math.round(((avg - 1) / 9) * 99);
}

// ─── Rating block color by UI value (1-5) ──────────────────────────
export function getRatingBlockColor(uiValue: number): string {
  switch (uiValue) {
    case 1: return '#EF4444'; // coral / needs work
    case 2: return '#F59E0B'; // gold / developing
    case 3: return '#2A9D8F'; // teal / solid
    case 4: return '#4BB9EC'; // sky / strong
    case 5: return '#D4A843'; // gold glow / elite
    default: return '#333';
  }
}

// ─── OVR tier color (same as PlayerTradingCard) ────────────────────
export function getOvrTierColor(ovr: number): string {
  if (ovr >= 80) return '#D4A843'; // gold
  if (ovr >= 60) return '#2A9D8F'; // teal
  if (ovr >= 40) return '#4BB9EC'; // sky
  return '#666';                    // gray
}

// ─── Types ─────────────────────────────────────────────────────────
export type EvaluationStatus = {
  playerId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: string | null;
  position: string | null;
  photoUrl: string | null;
  lastEvaluatedAt: string | null;
  overallRating: number | null;
  isDue: boolean; // > 30 days since last eval
};

export type EvaluationHistoryEntry = {
  id: string;
  evaluationType: string;
  evaluationDate: string;
  overallScore: number;
  skills: Record<string, number>;
  notes: string | null;
  evaluatedBy: string;
  isInitial: boolean;
};

// ─── Queries ───────────────────────────────────────────────────────

/** Get roster with last evaluation status per player. */
export async function getTeamEvaluationStatus(
  teamId: string,
  seasonId: string,
): Promise<EvaluationStatus[]> {
  // 1) Get roster via team_players junction table (players has no team_id column)
  const { data: teamPlayerRows } = await supabase
    .from('team_players')
    .select('player_id')
    .eq('team_id', teamId);

  if (!teamPlayerRows || teamPlayerRows.length === 0) return [];

  const rosterPlayerIds = teamPlayerRows.map(tp => tp.player_id);

  const { data: players } = await supabase
    .from('players')
    .select('id, first_name, last_name, jersey_number, position, photo_url')
    .in('id', rosterPlayerIds)
    .eq('season_id', seasonId)
    .order('last_name');

  if (!players || players.length === 0) return [];

  const playerIds = players.map(p => p.id);

  // 2) Batch fetch latest skill ratings
  const { data: ratings } = await supabase
    .from('player_skill_ratings')
    .select('player_id, overall_rating, rated_at')
    .in('player_id', playerIds)
    .eq('team_id', teamId);

  const ratingsMap = new Map<string, { overall_rating: number; rated_at: string }>();
  (ratings || []).forEach(r => {
    ratingsMap.set(r.player_id, r);
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return players.map(p => {
    const r = ratingsMap.get(p.id);
    const lastDate = r?.rated_at || null;
    return {
      playerId: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      jerseyNumber: p.jersey_number,
      position: p.position,
      photoUrl: p.photo_url || null,
      lastEvaluatedAt: lastDate,
      overallRating: r?.overall_rating ?? null,
      isDue: !lastDate || new Date(lastDate) < thirtyDaysAgo,
    };
  });
}

/** Save a single player's evaluation (upsert ratings + insert history). */
export async function savePlayerEvaluation(
  playerId: string,
  teamId: string,
  seasonId: string,
  evaluatorId: string,
  ratings: Record<string, number>, // DB-scale (1-10)
  notes: string,
  evaluationType: string = 'regular',
): Promise<{ success: boolean; error?: string }> {
  try {
    const overallRating = Math.round(
      SKILL_KEYS.reduce((sum, k) => sum + (ratings[k] || 0), 0) / SKILL_KEYS.length
    );

    // 1) Upsert player_skill_ratings
    const payload: any = {
      player_id: playerId,
      team_id: teamId,
      season_id: seasonId,
      rated_by: evaluatorId,
      rated_at: new Date().toISOString(),
      coach_notes: notes || null,
      overall_rating: overallRating,
    };
    SKILL_KEYS.forEach(k => {
      payload[k] = ratings[k] || 0;
    });

    const { error: upsertErr } = await supabase.from('player_skill_ratings').upsert(payload, {
      onConflict: 'player_id,team_id,season_id',
    });
    if (upsertErr) {
      if (__DEV__) console.error('[evaluations] upsert skill_ratings failed:', upsertErr.message);
      return { success: false, error: upsertErr.message };
    }

    // 2) Insert player_evaluations history row
    const { error: historyErr } = await supabase.from('player_evaluations').insert({
      player_id: playerId,
      season_id: seasonId,
      evaluated_by: evaluatorId,
      evaluation_type: evaluationType,
      evaluation_date: new Date().toISOString().split('T')[0],
      overall_score: overallRating,
      skills: ratings,
      notes: notes || null,
      is_initial: false,
    });
    if (historyErr) {
      if (__DEV__) console.error('[evaluations] insert evaluation history failed:', historyErr.message);
      return { success: false, error: historyErr.message };
    }

    // 3) Sync player_skills table (scale 1-10 → 0-100)
    const skillsPayload: any = {
      player_id: playerId,
      season_id: seasonId,
      sport: 'volleyball',
      serving: (ratings.serving_rating || 0) * 10,
      passing: (ratings.passing_rating || 0) * 10,
      setting: (ratings.setting_rating || 0) * 10,
      hitting: (ratings.attacking_rating || 0) * 10,
      blocking: (ratings.blocking_rating || 0) * 10,
      defense: (ratings.defense_rating || 0) * 10,
      updated_at: new Date().toISOString(),
    };

    // Try upsert; if no conflict key, use update then insert
    const { error: updateErr } = await supabase
      .from('player_skills')
      .update(skillsPayload)
      .eq('player_id', playerId)
      .eq('season_id', seasonId);

    if (updateErr) {
      const { error: insertErr } = await supabase.from('player_skills').insert(skillsPayload);
      if (insertErr) {
        if (__DEV__) console.error('[evaluations] sync player_skills failed:', insertErr.message);
      }
    }

    return { success: true };
  } catch (err) {
    if (__DEV__) console.error('[evaluations] savePlayerEvaluation crashed:', err);
    return { success: false, error: 'Unexpected error saving evaluation' };
  }
}

/** Get a player's evaluation history (newest first). */
export async function getPlayerEvaluationHistory(
  playerId: string,
  limit: number = 10,
): Promise<EvaluationHistoryEntry[]> {
  const { data } = await supabase
    .from('player_evaluations')
    .select('id, evaluation_type, evaluation_date, overall_score, skills, notes, evaluated_by, is_initial')
    .eq('player_id', playerId)
    .order('evaluation_date', { ascending: false })
    .limit(limit);

  return (data || []).map(d => ({
    id: d.id,
    evaluationType: d.evaluation_type || 'regular',
    evaluationDate: d.evaluation_date,
    overallScore: d.overall_score || 0,
    skills: (d.skills as Record<string, number>) || {},
    notes: d.notes,
    evaluatedBy: d.evaluated_by,
    isInitial: d.is_initial || false,
  }));
}

/** Get players that haven't been evaluated in `daysSinceLast` days. */
export async function getPlayersNeedingEvaluation(
  teamId: string,
  seasonId: string,
  daysSinceLast: number = 30,
): Promise<EvaluationStatus[]> {
  const all = await getTeamEvaluationStatus(teamId, seasonId);
  return all.filter(p => p.isDue);
}

/** Get a single player's current skill ratings (DB scale 1-10). */
export async function getPlayerRatings(
  playerId: string,
  teamId: string,
): Promise<Record<string, number> | null> {
  const { data } = await supabase
    .from('player_skill_ratings')
    .select('*')
    .eq('player_id', playerId)
    .eq('team_id', teamId)
    .order('rated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const ratings: Record<string, number> = {};
  SKILL_KEYS.forEach(k => {
    ratings[k] = data[k] || 0;
  });
  return ratings;
}
