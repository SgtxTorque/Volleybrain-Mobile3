import { useState, useEffect, useCallback } from 'react';
import { getOrCreateTeamQuests, TeamQuest } from '@/lib/team-quest-engine';

export function useTeamQuests(teamId: string | null) {
  const [quests, setQuests] = useState<TeamQuest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQuests = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const teamQuests = await getOrCreateTeamQuests(teamId);
      setQuests(teamQuests);
    } catch (err) {
      if (__DEV__) console.error('[useTeamQuests] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  return { quests, loading, refreshQuests: loadQuests };
}
