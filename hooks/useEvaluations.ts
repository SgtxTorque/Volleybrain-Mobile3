/**
 * React hooks for player evaluations.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  EvaluationHistoryEntry,
  EvaluationStatus,
  getPlayerEvaluationHistory,
  getTeamEvaluationStatus,
} from '@/lib/evaluations';

/** Fetch team roster with evaluation status per player. */
export function useTeamEvaluationStatus(teamId: string | null, seasonId: string | null) {
  const [data, setData] = useState<EvaluationStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!teamId || !seasonId) { setLoading(false); return; }
    setLoading(true);
    try {
      const result = await getTeamEvaluationStatus(teamId, seasonId);
      setData(result);
    } catch (err) {
      if (__DEV__) console.error('[useTeamEvaluationStatus]', err);
    } finally {
      setLoading(false);
    }
  }, [teamId, seasonId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, refresh };
}

/** Fetch a single player's evaluation history. */
export function usePlayerEvaluationHistory(playerId: string | null, limit: number = 10) {
  const [data, setData] = useState<EvaluationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!playerId) { setLoading(false); return; }
    setLoading(true);
    try {
      const result = await getPlayerEvaluationHistory(playerId, limit);
      setData(result);
    } catch (err) {
      if (__DEV__) console.error('[usePlayerEvaluationHistory]', err);
    } finally {
      setLoading(false);
    }
  }, [playerId, limit]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, refresh };
}
