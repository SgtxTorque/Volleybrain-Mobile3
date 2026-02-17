import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Sport = {
  id: string;
  name: string;
  code: string;
  icon: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  is_active: boolean;
  sort_order: number;
};

type SportContextType = {
  sports: Sport[];
  activeSport: Sport | null;
  setActiveSport: (sport: Sport) => void;
  loading: boolean;
  sportColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
};

const SportContext = createContext<SportContextType>({
  sports: [],
  activeSport: null,
  setActiveSport: () => {},
  loading: true,
  sportColors: {
    primary: '#FFD700',
    secondary: '#1a1a1a',
    accent: '#FFA500',
  },
});

export function SportProvider({ children }: { children: React.ReactNode }) {
  const [sports, setSports] = useState<Sport[]>([]);
  const [activeSport, setActiveSportState] = useState<Sport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSports();
  }, []);

  const fetchSports = async () => {
    try {
      const { data, error } = await supabase
        .from('sports')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      setSports(data || []);

      // Load saved sport preference
      const savedSportId = await AsyncStorage.getItem('activeSportId');
      
      if (savedSportId && data) {
        const saved = data.find(s => s.id === savedSportId);
        if (saved) {
          setActiveSportState(saved);
        } else if (data.length > 0) {
          setActiveSportState(data[0]);
        }
      } else if (data && data.length > 0) {
        setActiveSportState(data[0]);
      }
    } catch (error) {
      console.error('Error fetching sports:', error);
    } finally {
      setLoading(false);
    }
  };

  const setActiveSport = async (sport: Sport) => {
    setActiveSportState(sport);
    await AsyncStorage.setItem('activeSportId', sport.id);
  };

  const sportColors = {
    primary: activeSport?.color_primary || '#FFD700',
    secondary: activeSport?.color_secondary || '#1a1a1a',
    accent: activeSport?.color_accent || '#FFA500',
  };

  return (
    <SportContext.Provider value={{ 
      sports, 
      activeSport, 
      setActiveSport, 
      loading,
      sportColors 
    }}>
      {children}
    </SportContext.Provider>
  );
}

export const useSport = () => useContext(SportContext);