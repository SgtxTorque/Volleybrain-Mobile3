import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'dark' | 'light';

type ThemeColors = {
  background: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  textSecondary: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
};

type ThemeContextType = {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
};

const darkColors: ThemeColors = {
  background: '#0a0a0a',
  card: '#1a1a1a',
  border: '#333',
  text: '#ffffff',
  textMuted: '#666',
  textSecondary: '#888888',
  primary: '#FFD700',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  info: '#007AFF',
};

const lightColors: ThemeColors = {
  background: '#f5f5f5',
  card: '#ffffff',
  border: '#e0e0e0',
  text: '#1a1a1a',
  textMuted: '#666',
  textSecondary: '#888888',
  primary: '#D4A900',
  success: '#28a745',
  warning: '#ff8c00',
  danger: '#dc3545',
  info: '#0066cc',
};

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  colors: darkColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setMode(savedTheme);
      }
    } catch (e) {
      console.log('Error loading theme:', e);
    }
  };

  const saveTheme = async (newMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('theme', newMode);
    } catch (e) {
      console.log('Error saving theme:', e);
    }
  };

  const toggleTheme = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
    saveTheme(newMode);
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    saveTheme(newMode);
  };

  const colors = mode === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
