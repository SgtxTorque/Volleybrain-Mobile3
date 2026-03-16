import { useState, useEffect, useCallback } from 'react';
import {
  getOrCreateWeeklyQuests,
  WeeklyQuest,
} from '@/lib/quest-engine';
import { supabase } from '@/lib/supabase';
import { onRefresh } from '@/lib/refresh-bus';

export function useWeeklyQuestEngine(overrideProfileId?: string) {
  const [quests, setQuests] = useState<WeeklyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [allComplete, setAllComplete] = useState(false);
  const [bonusEarned, setBonusEarned] = useState(false);

  const loadQuests = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const profileId = overrideProfileId || user?.id;
      if (!profileId) return;

      const weeklyQuests = await getOrCreateWeeklyQuests(profileId);
      setQuests(weeklyQuests);
      setAllComplete(weeklyQuests.length > 0 && weeklyQuests.every(q => q.is_completed));

      // Check if weekly bonus was already earned
      const monday = getMondayStr();
      const { data: bonus } = await supabase
        .from('quest_bonus_tracking')
        .select('id')
        .eq('player_id', profileId)
        .eq('bonus_type', 'weekly_all_complete')
        .eq('period_date', monday)
        .maybeSingle();

      setBonusEarned(!!bonus);
    } catch (err) {
      console.error('[useWeeklyQuestEngine] Error loading weekly quests:', err);
    } finally {
      setLoading(false);
    }
  }, [overrideProfileId]);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  // Subscribe to refresh bus
  useEffect(() => {
    const unsub = onRefresh('quests', loadQuests);
    return unsub;
  }, [loadQuests]);

  return {
    quests,
    loading,
    allComplete,
    bonusEarned,
    refreshQuests: loadQuests,
  };
}

function getMondayStr(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}
