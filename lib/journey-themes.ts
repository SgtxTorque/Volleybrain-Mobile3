/**
 * Journey Themes — Visual configuration for each chapter environment.
 * Defines sky gradients, ground colors, environment objects, ambient animations,
 * and path styling for the Super Mario World-style journey map.
 */
import { MASCOT } from '@/lib/mascot-images';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JourneyTheme {
  id: string;
  chapterNumber: number;
  name: string;
  // Sky / Background
  skyGradient: string[];
  // Ground
  groundColor: string;
  groundTexture: 'grass' | 'wood' | 'sand' | 'concrete' | 'polish' | 'turf';
  // Court
  courtColor: string;
  courtLineColor: string;
  hasNet: boolean;
  // Environment objects (positioned absolutely)
  envObjects: EnvObject[];
  // Path connector
  pathColor: string;
  pathDoneColor: string;
  pathLockedColor: string;
  // Ambient animations
  ambientElements: AmbientElement[];
  // Node glow color for current node
  currentNodeGlow: string;
  // Transition to next chapter text
  nextZoneLabel: string;
  // Mascot for chapter gate completion
  gateMascot: any;
}

export interface EnvObject {
  type:
    | 'tree'
    | 'palm'
    | 'car'
    | 'bleacher'
    | 'fence'
    | 'building'
    | 'light_pole'
    | 'banner'
    | 'trophy'
    | 'scoreboard'
    | 'crowd_person'
    | 'spotlight';
  x: number; // Percentage from left (0-100)
  y: number; // Percentage from top of the chapter zone (0-100)
  width: number;
  height: number;
  color: string;
  secondaryColor?: string;
  flipX?: boolean;
  zIndex?: number;
}

export interface AmbientElement {
  type:
    | 'cloud'
    | 'butterfly'
    | 'wave'
    | 'seagull'
    | 'flash'
    | 'confetti'
    | 'light_flicker'
    | 'crowd_bob'
    | 'banner_sway'
    | 'spotlight_sweep'
    | 'grass_sway'
    | 'palm_sway';
  count: number;
  speed: 'slow' | 'medium' | 'fast';
  color?: string;
  opacity?: number;
}

// ─── Theme Definitions ───────────────────────────────────────────────────────

const THEMES: Record<number, JourneyTheme> = {
  1: {
    id: 'backyard',
    chapterNumber: 1,
    name: 'Backyard court',
    skyGradient: ['#87CEEB', '#B0E0FF', '#E8F4FF'],
    groundColor: '#4a7c3f',
    groundTexture: 'grass',
    courtColor: '#5a8a4f',
    courtLineColor: 'rgba(255,255,255,0.3)',
    hasNet: true,
    envObjects: [
      { type: 'tree', x: 5, y: 10, width: 40, height: 80, color: '#2d5a27', secondaryColor: '#5a3a1a' },
      { type: 'tree', x: 88, y: 15, width: 35, height: 70, color: '#3a6b30', secondaryColor: '#4a2a10' },
      { type: 'tree', x: 92, y: 50, width: 30, height: 60, color: '#2d5a27', secondaryColor: '#5a3a1a', flipX: true },
      { type: 'fence', x: 0, y: 5, width: 100, height: 15, color: '#8B7355' },
    ],
    pathColor: 'rgba(139,115,85,0.6)',
    pathDoneColor: '#22C55E',
    pathLockedColor: 'rgba(139,115,85,0.2)',
    ambientElements: [
      { type: 'cloud', count: 3, speed: 'slow', opacity: 0.4 },
      { type: 'butterfly', count: 2, speed: 'medium', color: '#FFD700' },
      { type: 'grass_sway', count: 8, speed: 'slow', color: '#5a9a4f' },
    ],
    currentNodeGlow: '#22C55E',
    nextZoneLabel: 'Chapter 2: School gym',
    gateMascot: MASCOT.BACKYARD_PRACTICE,
  },

  2: {
    id: 'gym',
    chapterNumber: 2,
    name: 'School gym',
    skyGradient: ['#1a1510', '#2a2015', '#3a2a1a'],
    groundColor: '#8B6914',
    groundTexture: 'wood',
    courtColor: '#9a7520',
    courtLineColor: 'rgba(255,255,255,0.25)',
    hasNet: true,
    envObjects: [
      { type: 'bleacher', x: 0, y: 0, width: 15, height: 100, color: '#5a4530' },
      { type: 'bleacher', x: 85, y: 0, width: 15, height: 100, color: '#5a4530' },
      { type: 'banner', x: 20, y: 5, width: 25, height: 12, color: '#1a3a6a' },
      { type: 'banner', x: 55, y: 5, width: 25, height: 12, color: '#8B0000' },
      { type: 'scoreboard', x: 40, y: 2, width: 20, height: 8, color: '#222' },
    ],
    pathColor: 'rgba(255,255,255,0.15)',
    pathDoneColor: '#4BB9EC',
    pathLockedColor: 'rgba(255,255,255,0.05)',
    ambientElements: [
      { type: 'light_flicker', count: 4, speed: 'slow', opacity: 0.1 },
    ],
    currentNodeGlow: '#4BB9EC',
    nextZoneLabel: 'Chapter 3: Beach court',
    gateMascot: MASCOT.LYNX_READY,
  },

  3: {
    id: 'beach',
    chapterNumber: 3,
    name: 'Beach court',
    skyGradient: ['#FF6B35', '#FF8C5A', '#FFB88C', '#87CEEB'],
    groundColor: '#D4A76A',
    groundTexture: 'sand',
    courtColor: '#C49A5A',
    courtLineColor: 'rgba(255,255,255,0.2)',
    hasNet: true,
    envObjects: [
      { type: 'palm', x: 3, y: 5, width: 30, height: 90, color: '#2d6a1a', secondaryColor: '#6a4a2a' },
      { type: 'palm', x: 90, y: 10, width: 25, height: 80, color: '#3a7a25', secondaryColor: '#7a5a3a', flipX: true },
    ],
    pathColor: 'rgba(255,255,255,0.2)',
    pathDoneColor: '#FF6B35',
    pathLockedColor: 'rgba(255,255,255,0.06)',
    ambientElements: [
      { type: 'wave', count: 3, speed: 'medium', color: '#4BB9EC', opacity: 0.3 },
      { type: 'seagull', count: 2, speed: 'slow' },
      { type: 'palm_sway', count: 2, speed: 'slow' },
    ],
    currentNodeGlow: '#FF6B35',
    nextZoneLabel: 'Chapter 4: Indoor arena',
    gateMascot: MASCOT.ARE_YOU_READY,
  },

  4: {
    id: 'arena',
    chapterNumber: 4,
    name: 'Indoor arena',
    skyGradient: ['#0a0a1a', '#0f1025', '#1a1535'],
    groundColor: '#1a3050',
    groundTexture: 'polish',
    courtColor: '#1a4070',
    courtLineColor: 'rgba(255,255,255,0.2)',
    hasNet: true,
    envObjects: [
      { type: 'bleacher', x: 0, y: 0, width: 12, height: 100, color: '#1a1a30' },
      { type: 'bleacher', x: 88, y: 0, width: 12, height: 100, color: '#1a1a30' },
      { type: 'spotlight', x: 20, y: 0, width: 10, height: 40, color: '#FFD700' },
      { type: 'spotlight', x: 70, y: 0, width: 10, height: 40, color: '#FFD700' },
      { type: 'banner', x: 15, y: 3, width: 20, height: 10, color: '#4BB9EC' },
      { type: 'banner', x: 65, y: 3, width: 20, height: 10, color: '#FFD700' },
    ],
    pathColor: 'rgba(75,185,236,0.2)',
    pathDoneColor: '#4BB9EC',
    pathLockedColor: 'rgba(75,185,236,0.05)',
    ambientElements: [
      { type: 'flash', count: 3, speed: 'fast', opacity: 0.15 },
      { type: 'crowd_bob', count: 6, speed: 'medium' },
      { type: 'spotlight_sweep', count: 2, speed: 'slow', color: '#FFD700', opacity: 0.08 },
    ],
    currentNodeGlow: '#FFD700',
    nextZoneLabel: 'Chapter 5: Pro gym',
    gateMascot: MASCOT.DEFENSE_READY,
  },

  5: {
    id: 'gym_pro',
    chapterNumber: 5,
    name: 'Pro gym',
    skyGradient: ['#12100a', '#1a1510', '#25201a'],
    groundColor: '#7a5a10',
    groundTexture: 'wood',
    courtColor: '#8a6a1a',
    courtLineColor: 'rgba(255,255,255,0.3)',
    hasNet: true,
    envObjects: [
      { type: 'bleacher', x: 0, y: 0, width: 10, height: 100, color: '#3a2a15' },
      { type: 'bleacher', x: 90, y: 0, width: 10, height: 100, color: '#3a2a15' },
      { type: 'scoreboard', x: 30, y: 2, width: 40, height: 10, color: '#111', secondaryColor: '#22C55E' },
      { type: 'banner', x: 12, y: 4, width: 16, height: 8, color: '#4BB9EC' },
      { type: 'banner', x: 72, y: 4, width: 16, height: 8, color: '#FF6B6B' },
    ],
    pathColor: 'rgba(255,255,255,0.12)',
    pathDoneColor: '#4BB9EC',
    pathLockedColor: 'rgba(255,255,255,0.04)',
    ambientElements: [
      { type: 'light_flicker', count: 6, speed: 'slow', opacity: 0.08 },
      { type: 'crowd_bob', count: 4, speed: 'slow' },
    ],
    currentNodeGlow: '#4BB9EC',
    nextZoneLabel: 'Chapter 6: Street court',
    gateMascot: MASCOT.VISUALIZE,
  },

  6: {
    id: 'street',
    chapterNumber: 6,
    name: 'Street court',
    skyGradient: ['#1a1520', '#2d1f3a', '#4a2d5c', '#e8875c', '#f4a66a'],
    groundColor: '#2a2a2a',
    groundTexture: 'concrete',
    courtColor: '#333',
    courtLineColor: 'rgba(255,255,255,0.15)',
    hasNet: true,
    envObjects: [
      { type: 'fence', x: 0, y: 0, width: 100, height: 8, color: '#555' },
      { type: 'building', x: 2, y: -20, width: 8, height: 25, color: '#1a1225' },
      { type: 'building', x: 12, y: -25, width: 6, height: 30, color: '#151020' },
      { type: 'building', x: 20, y: -18, width: 10, height: 22, color: '#1a1225' },
      { type: 'building', x: 70, y: -22, width: 7, height: 27, color: '#151020' },
      { type: 'building', x: 80, y: -20, width: 12, height: 24, color: '#1a1225' },
      { type: 'building', x: 93, y: -28, width: 7, height: 33, color: '#151020' },
      { type: 'car', x: 2, y: 30, width: 14, height: 7, color: '#8B0000' },
      { type: 'car', x: 85, y: 25, width: 13, height: 6, color: '#1a3a5c' },
      { type: 'car', x: 1, y: 65, width: 15, height: 7, color: '#2d2d2d' },
      { type: 'car', x: 86, y: 70, width: 12, height: 6, color: '#c4a030' },
      { type: 'light_pole', x: 8, y: 5, width: 2, height: 20, color: '#555' },
      { type: 'light_pole', x: 90, y: 5, width: 2, height: 20, color: '#555' },
      { type: 'crowd_person', x: 18, y: 28, width: 2, height: 4, color: '#d4537e' },
      { type: 'crowd_person', x: 21, y: 29, width: 2, height: 4, color: '#378ADD' },
      { type: 'crowd_person', x: 24, y: 27, width: 2, height: 4, color: '#22c55e' },
      { type: 'crowd_person', x: 75, y: 26, width: 2, height: 4, color: '#EF9F27' },
      { type: 'crowd_person', x: 78, y: 28, width: 2, height: 4, color: '#7F77DD' },
      { type: 'crowd_person', x: 81, y: 27, width: 2, height: 4, color: '#E24B4A' },
    ],
    pathColor: 'rgba(255,200,150,0.15)',
    pathDoneColor: '#f4a66a',
    pathLockedColor: 'rgba(255,200,150,0.04)',
    ambientElements: [
      { type: 'light_flicker', count: 2, speed: 'medium', color: '#FFD88C', opacity: 0.12 },
      { type: 'crowd_bob', count: 6, speed: 'medium' },
    ],
    currentNodeGlow: '#f4a66a',
    nextZoneLabel: 'Chapter 7: Tournament arena',
    gateMascot: MASCOT.ADVANCE_JUMP_SERVE,
  },

  7: {
    id: 'tournament',
    chapterNumber: 7,
    name: 'Tournament arena',
    skyGradient: ['#0a0520', '#15103a', '#201550'],
    groundColor: '#1a2050',
    groundTexture: 'turf',
    courtColor: '#1a3060',
    courtLineColor: 'rgba(255,255,255,0.25)',
    hasNet: true,
    envObjects: [
      { type: 'bleacher', x: 0, y: 0, width: 10, height: 100, color: '#15102a' },
      { type: 'bleacher', x: 90, y: 0, width: 10, height: 100, color: '#15102a' },
      { type: 'banner', x: 15, y: 2, width: 18, height: 10, color: '#7F77DD' },
      { type: 'banner', x: 37, y: 2, width: 26, height: 12, color: '#FFD700' },
      { type: 'banner', x: 67, y: 2, width: 18, height: 10, color: '#4BB9EC' },
      { type: 'spotlight', x: 10, y: 0, width: 8, height: 35, color: '#7F77DD' },
      { type: 'spotlight', x: 82, y: 0, width: 8, height: 35, color: '#7F77DD' },
    ],
    pathColor: 'rgba(127,119,221,0.2)',
    pathDoneColor: '#7F77DD',
    pathLockedColor: 'rgba(127,119,221,0.05)',
    ambientElements: [
      { type: 'spotlight_sweep', count: 2, speed: 'medium', color: '#7F77DD', opacity: 0.06 },
      { type: 'banner_sway', count: 3, speed: 'slow' },
      { type: 'crowd_bob', count: 8, speed: 'slow' },
    ],
    currentNodeGlow: '#7F77DD',
    nextZoneLabel: 'Chapter 8: Championship stadium',
    gateMascot: MASCOT.TEAM_HUDDLE,
  },

  8: {
    id: 'stadium',
    chapterNumber: 8,
    name: 'Championship stadium',
    skyGradient: ['#000', '#0a0a15', '#111125'],
    groundColor: '#0a1530',
    groundTexture: 'polish',
    courtColor: '#0f2040',
    courtLineColor: 'rgba(255,215,0,0.2)',
    hasNet: true,
    envObjects: [
      { type: 'bleacher', x: 0, y: 0, width: 8, height: 100, color: '#0a0a1a' },
      { type: 'bleacher', x: 92, y: 0, width: 8, height: 100, color: '#0a0a1a' },
      { type: 'trophy', x: 42, y: 2, width: 16, height: 15, color: '#FFD700' },
      { type: 'spotlight', x: 5, y: 0, width: 12, height: 50, color: '#FFD700' },
      { type: 'spotlight', x: 30, y: 0, width: 12, height: 50, color: '#fff' },
      { type: 'spotlight', x: 58, y: 0, width: 12, height: 50, color: '#fff' },
      { type: 'spotlight', x: 83, y: 0, width: 12, height: 50, color: '#FFD700' },
      { type: 'banner', x: 10, y: 3, width: 14, height: 8, color: '#FFD700' },
      { type: 'banner', x: 76, y: 3, width: 14, height: 8, color: '#FFD700' },
    ],
    pathColor: 'rgba(255,215,0,0.15)',
    pathDoneColor: '#FFD700',
    pathLockedColor: 'rgba(255,215,0,0.04)',
    ambientElements: [
      { type: 'spotlight_sweep', count: 4, speed: 'medium', color: '#FFD700', opacity: 0.1 },
      { type: 'confetti', count: 20, speed: 'slow', opacity: 0.3 },
      { type: 'flash', count: 5, speed: 'fast', opacity: 0.08 },
      { type: 'crowd_bob', count: 10, speed: 'medium' },
    ],
    currentNodeGlow: '#FFD700',
    nextZoneLabel: 'Journey complete',
    gateMascot: MASCOT.LEGENDARY_STREAK,
  },
};

// ─── Public API ──────────────────────────────────────────────────────────────

export function getChapterTheme(chapterNumber: number): JourneyTheme {
  return THEMES[chapterNumber] || THEMES[1];
}

export function getAllThemes(): JourneyTheme[] {
  return Object.values(THEMES);
}
