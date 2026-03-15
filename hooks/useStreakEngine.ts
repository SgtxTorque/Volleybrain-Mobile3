import { useState, useEffect, useCallback } from 'react';
import { checkStreakState, StreakState } from '@/lib/streak-engine';
import { supabase } from '@/lib/supabase';

export function useStreakEngine() {
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStreak = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const state = await checkStreakState(user.id);
      setStreak(state);
    } catch (err) {
      console.error('[useStreakEngine] Error loading streak:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStreak();
  }, [loadStreak]);

  return {
    streak,
    loading,
    refreshStreak: loadStreak,
  };
}
