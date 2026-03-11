/**
 * useCoachTeam — shared hook for resolving the current coach's team.
 * Encapsulates the working 3-path fallback from useCoachHomeData:
 *   1. team_staff (user_id = auth user id) — NO is_active filter
 *   2. coaches.profile_id → team_coaches
 *   3. Fallback: all teams in current season if coach record exists
 *
 * Returns: { teamId, orgId, teams, loading }
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';

type ResolvedTeam = {
  id: string;
  name: string;
  seasonId: string | null;
  organizationId: string | null;
};

export function useCoachTeam() {
  const { user } = useAuth();
  const { workingSeason } = useSeason();

  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [teams, setTeams] = useState<ResolvedTeam[]>([]);

  const resolve = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }

    try {
      // Path 1: team_staff (user_id = auth user id) — NO is_active filter
      const { data: staffTeams } = await supabase
        .from('team_staff')
        .select('team_id, teams ( id, name, season_id, seasons ( organization_id ) )')
        .eq('user_id', user.id);

      // Path 2: coaches.profile_id → team_coaches
      const { data: coachRecord } = await supabase
        .from('coaches')
        .select('id, team_coaches ( team_id, role, teams ( id, name, season_id, seasons ( organization_id ) ) )')
        .eq('profile_id', user.id)
        .maybeSingle();

      // Merge and dedup
      const merged: any[] = [...(staffTeams || [])];
      const existingIds = new Set(merged.map(t => (t.teams as any)?.id).filter(Boolean));

      if (coachRecord?.team_coaches) {
        const tcList = Array.isArray(coachRecord.team_coaches)
          ? coachRecord.team_coaches
          : [coachRecord.team_coaches];
        for (const ct of tcList) {
          const tid = (ct.teams as any)?.id;
          if (tid && !existingIds.has(tid)) {
            merged.push({ teams: ct.teams });
            existingIds.add(tid);
          }
        }
      }

      // Path 3: fallback — all teams in current season if coach record exists but no teams found
      if (merged.length === 0 && coachRecord && workingSeason?.id) {
        const { data: allTeams } = await supabase
          .from('teams')
          .select('id, name, season_id, seasons ( organization_id )')
          .eq('season_id', workingSeason.id)
          .order('name');
        for (const team of (allTeams || [])) {
          merged.push({ teams: team });
        }
      }

      const results: ResolvedTeam[] = merged
        .filter(t => (t.teams as any)?.id)
        .map(t => {
          const team = t.teams as any;
          return {
            id: team.id,
            name: team.name || '',
            seasonId: team.season_id || null,
            organizationId: team.seasons?.organization_id || null,
          };
        });

      // Prefer current season team
      const currentSeasonTeam = workingSeason?.id
        ? results.find(t => t.seasonId === workingSeason.id)
        : null;
      const best = currentSeasonTeam || results[0] || null;

      setTeams(results);
      setTeamId(best?.id || null);
      setOrgId(best?.organizationId || null);
    } catch (err) {
      if (__DEV__) console.error('[useCoachTeam] resolve error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, workingSeason?.id]);

  useEffect(() => { resolve(); }, [resolve]);

  return { teamId, orgId, teams, loading };
}
