/**
 * resolve-linked-players.ts — Canonical parent→player resolution for beta.
 *
 * The database has four linkage models accumulated over time:
 *   1. player_guardians  (guardian_id → player_id)  — admin/coach-created
 *   2. players.parent_account_id  (= auth user id)  — set during registration & claim
 *   3. player_parents  (parent_id → player_id)      — set during registration & claim
 *   4. players.parent_email  (case-insensitive)      — orphan/unclaimed players
 *
 * This module provides ONE shared resolution order so every screen
 * agrees on "which players belong to this user."
 *
 * Post-beta: consolidate the schema to a single linkage table and
 * remove the compatibility fan-out here.
 */
import { supabase } from './supabase';

/**
 * Returns deduplicated player IDs linked to the given user,
 * checking all four linkage sources in parallel.
 *
 * @param userId   - auth user id (supabase auth.uid)
 * @param userEmail - optional; enables orphan email matching
 */
export async function resolveLinkedPlayerIds(
  userId: string,
  userEmail?: string | null,
  orgSeasonIds?: string[],
): Promise<string[]> {
  const ids = new Set<string>();

  const queries: Array<() => Promise<void>> = [
    // 1. player_guardians
    async () => {
      const { data } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', userId);
      data?.forEach(r => ids.add(r.player_id));
    },

    // 2. players.parent_account_id
    async () => {
      const { data } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', userId);
      data?.forEach(r => ids.add(r.id));
    },

    // 3. player_parents
    async () => {
      const { data } = await supabase
        .from('player_parents')
        .select('player_id')
        .eq('parent_id', userId);
      data?.forEach(r => ids.add(r.player_id));
    },
  ];

  // 4. Orphan email match — only unclaimed players (parent_account_id IS NULL)
  if (userEmail) {
    queries.push(async () => {
      let query = supabase
        .from('players')
        .select('id')
        .ilike('parent_email', userEmail)
        .is('parent_account_id', null);

      // Scope to org's seasons when available
      if (orgSeasonIds && orgSeasonIds.length > 0) {
        query = query.in('season_id', orgSeasonIds);
      }

      const { data } = await query;
      data?.forEach(r => ids.add(r.id));
    });
  }

  await Promise.all(queries.map(fn => fn()));
  return Array.from(ids);
}

/**
 * Boolean convenience — does this user have any linked players?
 */
export async function hasLinkedPlayers(
  userId: string,
  userEmail?: string | null,
): Promise<boolean> {
  const ids = await resolveLinkedPlayerIds(userId, userEmail);
  return ids.length > 0;
}
