import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────
export type BackgroundType = 'solid' | 'gradient' | 'pattern' | 'custom';

export type BackgroundConfig = {
  type: BackgroundType;
  value: string; // color hex for solid, key for gradient/pattern, URI for custom
  opacity: number; // 0.05–0.15
};

export type GradientDef = {
  key: string;
  label: string;
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
};

export type PatternDef = {
  key: string;
  label: string;
  icon: string; // Ionicons name for thumbnail
};

// ── Premade Options ────────────────────────────────────────────────────

export const SOLID_OPTIONS = [
  { key: 'midnight', label: 'Midnight', color: '#0F172A' },
  { key: 'slate', label: 'Slate', color: '#1E293B' },
  { key: 'navy', label: 'Navy', color: '#1E3A5F' },
  { key: 'charcoal', label: 'Charcoal', color: '#374151' },
  { key: 'white', label: 'White', color: '#FFFFFF' },
  { key: 'cream', label: 'Cream', color: '#FFFBEB' },
  { key: 'ice', label: 'Ice', color: '#F0F9FF' },
  { key: 'mist', label: 'Mist', color: '#F1F5F9' },
];

export const GRADIENT_OPTIONS: GradientDef[] = [
  { key: 'ocean', label: 'Ocean', colors: ['#0F172A', '#1E3A5F'] },
  { key: 'sunset', label: 'Sunset', colors: ['#1E293B', '#7C3AED', '#EC4899'] },
  { key: 'aurora', label: 'Aurora', colors: ['#0F172A', '#059669', '#0EA5E9'] },
  { key: 'cotton-candy', label: 'Cotton Candy', colors: ['#F0F9FF', '#FCE7F3'] },
  { key: 'peach', label: 'Peach', colors: ['#FFFBEB', '#FED7AA'] },
  { key: 'sky', label: 'Sky', colors: ['#E0F2FE', '#BFDBFE'] },
  { key: 'lavender', label: 'Lavender', colors: ['#F5F3FF', '#DDD6FE'] },
  { key: 'mint', label: 'Mint', colors: ['#ECFDF5', '#A7F3D0'] },
  { key: 'fire', label: 'Fire', colors: ['#1E293B', '#DC2626', '#F97316'] },
  { key: 'royal', label: 'Royal', colors: ['#1E293B', '#4F46E5', '#7C3AED'] },
];

export const PATTERN_OPTIONS: PatternDef[] = [
  { key: 'volleyball', label: 'Volleyball', icon: 'basketball-outline' },
  { key: 'hexagons', label: 'Hexagons', icon: 'apps-outline' },
  { key: 'court-lines', label: 'Court Lines', icon: 'grid-outline' },
  { key: 'diagonal-stripes', label: 'Stripes', icon: 'reorder-four' },
  { key: 'triangles', label: 'Triangles', icon: 'triangle-outline' },
  { key: 'dots', label: 'Dots', icon: 'ellipse-outline' },
];

// ── Default ────────────────────────────────────────────────────────────

const DEFAULT_BG: BackgroundConfig = {
  type: 'solid',
  value: 'midnight',
  opacity: 0.08,
};

const STORAGE_KEY = 'vb_background';

// ── Context ────────────────────────────────────────────────────────────

type BackgroundContextType = {
  background: BackgroundConfig;
  setBackground: (bg: BackgroundConfig) => void;
  resetToDefault: () => void;
};

const BackgroundContext = createContext<BackgroundContextType>({
  background: DEFAULT_BG,
  setBackground: () => {},
  resetToDefault: () => {},
});

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [background, setBackgroundState] = useState<BackgroundConfig>(DEFAULT_BG);

  useEffect(() => {
    loadBackground();
  }, []);

  const loadBackground = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as BackgroundConfig;
        if (parsed.type && parsed.value) {
          setBackgroundState(parsed);
        }
      }
    } catch {
      // use default
    }
  };

  const setBackground = async (bg: BackgroundConfig) => {
    setBackgroundState(bg);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bg));
    } catch {}
  };

  const resetToDefault = () => {
    setBackground(DEFAULT_BG);
  };

  return (
    <BackgroundContext.Provider value={{ background, setBackground, resetToDefault }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export const useBackground = () => useContext(BackgroundContext);
