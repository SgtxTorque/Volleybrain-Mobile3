import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const TEAM_CONTEXT_KEY = 'vb_selected_team_id';

/**
 * Hook to manage selected team context for parent filtering
 * Persists selection to AsyncStorage so it survives app restarts
 */
export const useTeamContext = () => {
  const [selectedTeamId, setSelectedTeamIdState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load persisted selection on mount
  useEffect(() => {
    AsyncStorage.getItem(TEAM_CONTEXT_KEY)
      .then(id => {
        if (id) {
          setSelectedTeamIdState(id);
          if (__DEV__) console.log('[TeamContext] Restored selected team:', id);
        }
        setLoaded(true);
      })
      .catch(err => {
        console.error('[TeamContext] Error loading team selection:', err);
        setLoaded(true);
      });
  }, []);

  const setSelectedTeamId = async (id: string | null) => {
    setSelectedTeamIdState(id);
    try {
      if (id) {
        await AsyncStorage.setItem(TEAM_CONTEXT_KEY, id);
        if (__DEV__) console.log('[TeamContext] Selected team:', id);
      } else {
        await AsyncStorage.removeItem(TEAM_CONTEXT_KEY);
        if (__DEV__) console.log('[TeamContext] Cleared team selection');
      }
    } catch (err) {
      console.error('[TeamContext] Error saving team selection:', err);
    }
  };

  return { selectedTeamId, setSelectedTeamId, loaded };
};
