import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth';
import { useSport } from './sport';
import { supabase } from './supabase';

const VB_LAST_SEASON_KEY = 'vb_admin_last_season_id';

type Season = {
  id: string;
  name: string;
  status: string;
  registration_open: boolean;
  registration_closes_at: string | null;
  fee_registration: number;
  fee_uniform: number;
  fee_monthly: number;
  months_in_season: number;
  sport_id: string | null;
};

type SeasonContextType = {
  allSeasons: Season[];
  workingSeason: Season | null;
  setWorkingSeason: (season: Season | null) => void;
  refreshSeasons: () => Promise<void>;
  loading: boolean;
};

const SeasonContext = createContext<SeasonContextType>({
  allSeasons: [],
  workingSeason: null,
  setWorkingSeason: () => {},
  refreshSeasons: async () => {},
  loading: true,
});

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const { activeSport } = useSport();
  const { organization } = useAuth();
  const [allSeasons, setAllSeasons] = useState<Season[]>([]);
  const [workingSeason, setWorkingSeasonInternal] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);

  const setWorkingSeason = (season: Season | null) => {
    setWorkingSeasonInternal(season);
    if (season?.id) {
      AsyncStorage.setItem(VB_LAST_SEASON_KEY, season.id).catch(() => {});
    }
  };

  const refreshSeasons = async () => {
    let query = supabase
      .from('seasons')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by organization (critical data scoping — matches web)
    if (organization?.id) {
      query = query.eq('organization_id', organization.id);
    }

    // Filter by active sport if one is selected
    if (activeSport?.id) {
      query = query.eq('sport_id', activeSport.id);
    }

    const { data: seasons } = await query;

    if (seasons && seasons.length > 0) {
      setAllSeasons(seasons);

      // Check if current working season belongs to this sport
      const currentStillValid = workingSeason && seasons.find(s => s.id === workingSeason.id);
      
      if (!currentStillValid) {
        // Try to restore persisted season first
        const savedId = await AsyncStorage.getItem(VB_LAST_SEASON_KEY).catch(() => null);
        const savedSeason = savedId ? seasons.find(s => s.id === savedId) : null;
        if (savedSeason) {
          setWorkingSeasonInternal(savedSeason);
        } else {
          const activeSeason = seasons.find(s => s.status === 'active');
          setWorkingSeason(activeSeason || seasons[0]);
        }
      } else {
        // Refresh working season data (no need to re-persist)
        const updated = seasons.find(s => s.id === workingSeason.id);
        if (updated) setWorkingSeasonInternal(updated);
      }
    } else {
      setAllSeasons([]);
      setWorkingSeason(null);
    }
    setLoading(false);
  };

  // Refresh when active sport or organization changes
  useEffect(() => {
    refreshSeasons();
  }, [activeSport?.id, organization?.id]);

  return (
    <SeasonContext.Provider value={{ allSeasons, workingSeason, setWorkingSeason, refreshSeasons, loading }}>
      {children}
    </SeasonContext.Provider>
  );
}

export const useSeason = () => useContext(SeasonContext);