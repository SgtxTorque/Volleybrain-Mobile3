import { useState, useEffect, useCallback } from 'react';
import {
  getOrCreateDailyQuests,
  completeQuest,
  DailyQuest,
} from '@/lib/quest-engine';
import { supabase } from '@/lib/supabase';
import { onRefresh } from '@/lib/refresh-bus';

export function useQuestEngine() {
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null); // quest ID being completed
  const [allComplete, setAllComplete] = useState(false);
  const [bonusEarned, setBonusEarned] = useState(false);

  const loadQuests = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dailyQuests = await getOrCreateDailyQuests(user.id);
      setQuests(dailyQuests);
      setAllComplete(dailyQuests.every(q => q.is_completed));

      // Check if bonus was already earned today
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const { data: bonus } = await supabase
        .from('quest_bonus_tracking')
        .select('id')
        .eq('player_id', user.id)
        .eq('bonus_type', 'daily_all_complete')
        .eq('period_date', todayStr)
        .maybeSingle();

      setBonusEarned(!!bonus);
    } catch (err) {
      console.error('[useQuestEngine] Error loading quests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  // Subscribe to refresh bus
  useEffect(() => {
    const unsub = onRefresh('quests', loadQuests);
    return unsub;
  }, [loadQuests]);

  const handleCompleteQuest = useCallback(async (questId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCompleting(questId);
    try {
      const result = await completeQuest(questId, user.id);

      if (result.success) {
        // Update local state immediately for responsive UI
        setQuests(prev =>
          prev.map(q =>
            q.id === questId
              ? { ...q, is_completed: true, completed_at: new Date().toISOString(), current_value: q.target_value }
              : q
          )
        );
        setAllComplete(result.allComplete);
        if (result.bonusAwarded) {
          setBonusEarned(true);
        }
      }

      return result;
    } finally {
      setCompleting(null);
    }
  }, []);

  return {
    quests,
    loading,
    completing,
    allComplete,
    bonusEarned,
    refreshQuests: loadQuests,
    completeQuest: handleCompleteQuest,
  };
}
