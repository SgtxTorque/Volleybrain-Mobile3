import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, ViewStyle } from 'react-native';

type ThemeMode = 'dark' | 'light';

export type AccentColor = 'orange' | 'blue' | 'purple' | 'green' | 'rose' | 'slate';

type AccentColorSet = {
  primary: string;
  light: string;
  dark: string;
  glow: string;
};

export const accentColors: Record<AccentColor, AccentColorSet> = {
  orange: { primary: '#F97316', light: '#FFEDD5', dark: '#C2410C', glow: 'rgba(249, 115, 22, 0.15)' },
  blue:   { primary: '#0EA5E9', light: '#E0F2FE', dark: '#0369A1', glow: 'rgba(14, 165, 233, 0.15)' },
  purple: { primary: '#8B5CF6', light: '#EDE9FE', dark: '#6D28D9', glow: 'rgba(139, 92, 246, 0.15)' },
  green:  { primary: '#10B981', light: '#D1FAE5', dark: '#047857', glow: 'rgba(16, 185, 129, 0.15)' },
  rose:   { primary: '#F43F5E', light: '#FFE4E6', dark: '#BE123C', glow: 'rgba(244, 63, 94, 0.15)' },
  slate:  { primary: '#64748B', light: '#F1F5F9', dark: '#475569', glow: 'rgba(100, 116, 139, 0.15)' },
};

export type ThemeColors = {
  // Base surfaces
  background: string;
  bgSecondary: string;
  bgTertiary: string;
  card: string;
  cardAlt: string;
  border: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;

  // Glass (RN-adapted: solid semi-transparent, no backdrop-blur)
  glassCard: string;
  glassBorder: string;

  // Functional
  primary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
};

// Dark colors aligned with web (constants/theme.js)
const darkColorsBase: ThemeColors = {
  background: '#0A0F1A',
  bgSecondary: '#111827',
  bgTertiary: '#0A0F1A',
  card: 'rgba(30, 41, 59, 0.95)',
  cardAlt: 'rgba(30, 41, 59, 0.85)',
  border: 'rgba(255, 255, 255, 0.1)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  glassCard: 'rgba(30, 41, 59, 0.9)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  primary: '#F97316',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#0EA5E9',
};

// Light colors aligned with web (Apple-inspired off-white)
const lightColorsBase: ThemeColors = {
  background: '#F5F7FA',
  bgSecondary: '#FFFFFF',
  bgTertiary: '#EEF2F7',
  card: 'rgba(255, 255, 255, 0.85)',
  cardAlt: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(0, 0, 0, 0.06)',
  text: '#0F172A',
  textSecondary: 'rgba(15, 23, 42, 0.7)',
  textMuted: 'rgba(15, 23, 42, 0.4)',
  glassCard: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(0, 0, 0, 0.06)',
  primary: '#F97316',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#0EA5E9',
};

type ThemeContextType = {
  mode: ThemeMode;
  colors: ThemeColors;
  accent: AccentColorSet;
  accentColor: AccentColor;
  changeAccent: (color: AccentColor) => void;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  colors: darkColorsBase,
  accent: accentColors.orange,
  accentColor: 'orange',
  changeAccent: () => {},
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [accentColor, setAccentColor] = useState<AccentColor>('orange');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const [savedTheme, savedAccent] = await Promise.all([
        AsyncStorage.getItem('theme'),
        AsyncStorage.getItem('vb_accent'),
      ]);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setMode(savedTheme);
      }
      if (savedAccent && accentColors[savedAccent as AccentColor]) {
        setAccentColor(savedAccent as AccentColor);
      }
    } catch (e) {
      if (__DEV__) console.log('Error loading theme prefs:', e);
    }
  };

  const saveTheme = async (newMode: ThemeMode) => {
    try { await AsyncStorage.setItem('theme', newMode); } catch {}
  };

  const saveAccent = async (color: AccentColor) => {
    try { await AsyncStorage.setItem('vb_accent', color); } catch {}
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

  const changeAccent = (color: AccentColor) => {
    if (accentColors[color]) {
      setAccentColor(color);
      saveAccent(color);
    }
  };

  const currentAccent = accentColors[accentColor];
  const baseColors = mode === 'dark' ? darkColorsBase : lightColorsBase;
  const colors: ThemeColors = {
    ...baseColors,
    primary: currentAccent.primary,
  };

  return (
    <ThemeContext.Provider value={{
      mode,
      colors,
      accent: currentAccent,
      accentColor,
      changeAccent,
      toggleTheme,
      setTheme,
      isDark: mode === 'dark',
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// Glass card style helper — use in createStyles functions
export const createGlassStyle = (colors: ThemeColors): ViewStyle => ({
  backgroundColor: colors.glassCard,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  borderRadius: 20,
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    android: {
      elevation: 6,
    },
  }),
});
