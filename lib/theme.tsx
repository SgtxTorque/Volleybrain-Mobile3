import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, ViewStyle } from 'react-native';

type ThemeMode = 'dark' | 'light';

export type AccentColor = 'steelblue' | 'orange' | 'blue' | 'purple' | 'green' | 'rose' | 'slate';

type AccentColorSet = {
  primary: string;
  light: string;
  dark: string;
  glow: string;
};

export const accentColors: Record<AccentColor, AccentColorSet> = {
  steelblue: { primary: '#2C5F7C', light: '#E8F0F5', dark: '#1B3A52', glow: 'rgba(44, 95, 124, 0.15)' },
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

  // Card surfaces (legacy names kept for compatibility)
  glassCard: string;
  glassBorder: string;

  // Functional
  primary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;

  // V0 design system tokens
  teal: string;
  navy: string;
  secondary: string;
};

// Dark colors — v0 design system
const darkColorsBase: ThemeColors = {
  background: '#1B2838',
  bgSecondary: '#243447',
  bgTertiary: '#1B2838',
  card: '#243447',
  cardAlt: '#2C3E50',
  border: '#2C3E50',
  text: '#E8F0F5',
  textSecondary: '#8899A6',
  textMuted: '#6B7C8A',
  glassCard: '#243447',
  glassBorder: '#2C3E50',
  primary: '#2C5F7C',
  success: '#22C55E',
  warning: '#E8913A',
  danger: '#D94F4F',
  info: '#14B8A6',
  teal: '#14B8A6',
  navy: '#E8F0F5',
  secondary: '#2C3E50',
};

// Light colors — v0 design system
const lightColorsBase: ThemeColors = {
  background: '#FFFFFF',
  bgSecondary: '#E8F0F5',
  bgTertiary: '#D9E2E9',
  card: '#FFFFFF',
  cardAlt: '#F5F7FA',
  border: '#D9E2E9',
  text: '#1B2838',
  textSecondary: '#6B7C8A',
  textMuted: '#8899A6',
  glassCard: '#FFFFFF',
  glassBorder: '#D9E2E9',
  primary: '#2C5F7C',
  success: '#22C55E',
  warning: '#E8913A',
  danger: '#D94F4F',
  info: '#14B8A6',
  teal: '#14B8A6',
  navy: '#1B2838',
  secondary: '#E8F0F5',
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
  mode: 'light',
  colors: lightColorsBase,
  accent: accentColors.steelblue,
  accentColor: 'steelblue',
  changeAccent: () => {},
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [accentColor, setAccentColor] = useState<AccentColor>('steelblue');

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

// Card style helper — use in createStyles functions
export const createGlassStyle = (colors: ThemeColors): ViewStyle => ({
  backgroundColor: colors.glassCard,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  borderRadius: 12,
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: {
      elevation: 3,
    },
  }),
});
