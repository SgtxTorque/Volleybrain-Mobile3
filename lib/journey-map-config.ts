import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCALE = SCREEN_WIDTH / 390;

export interface SpritePlacement {
  assetKey: string;
  x: number;  // points from left edge (designed for 390px width, will be scaled)
  y: number;  // points from top of map
  width: number;  // display width in points
  zIndex?: number;
  flipX?: boolean;
  animationType?: 'sway' | 'bounce' | 'float' | 'drift' | 'none';
  animationDuration?: number;
  animationDelay?: number;
}

export interface MapConfig {
  // Total map height in points (before scaling)
  mapHeight: number;

  // Number of grass middle tiles to stack between top and bottom
  grassTileCount: number;

  // Sky gradient colors (used above the grass-top image)
  skyGradient: string[];

  // SVG path definition for the winding dirt trail
  pathD: string;
  pathViewBox: string;
  pathFillColor: string;
  pathFillWidth: number;
  pathDashColor: string;
  pathDashWidth: number;
  pathDashArray: string;

  // Sprite placements by layer (back to front rendering order)
  landmarks: SpritePlacement[];
  trees: SpritePlacement[];
  bushes: SpritePlacement[];
  props: SpritePlacement[];
  fences: SpritePlacement[];
  nature: SpritePlacement[];

  // Node positions (one per node, in sort_order)
  // The code will match these to the nodes array from useJourneyPath by index
  nodePositions: { x: number; y: number }[];

  // Boss node position (separate because it may be larger)
  bossPosition: { x: number; y: number };

  // Mascot offset from current node position
  mascotOffset: { x: number; y: number };
}

// ─── CHAPTER 1: BACKYARD ───────────────────────────────

export function getCh1MapConfig(): MapConfig {
  return {
    mapHeight: 2800,
    grassTileCount: 2,
    skyGradient: ['#87CEEB', '#B8E4F9', '#E8F5E9'],

    // SVG path — winding S-curve from top to bottom
    // Designed for viewBox 0 0 390 2800
    pathD: `M 195 280
      C 195 340, 280 380, 280 450
      C 280 520, 110 560, 110 640
      C 110 720, 280 760, 280 840
      C 280 920, 130 960, 130 1050
      C 130 1140, 260 1180, 260 1260
      C 260 1340, 140 1400, 140 1480
      C 140 1560, 250 1620, 250 1700
      C 250 1780, 150 1840, 150 1920
      C 150 2000, 240 2060, 240 2140
      C 240 2220, 170 2280, 170 2360
      C 170 2440, 195 2480, 195 2520`,
    pathViewBox: '0 0 390 2800',
    pathFillColor: 'rgba(180,140,80,0.45)',
    pathFillWidth: 30,
    pathDashColor: 'rgba(210,175,110,0.6)',
    pathDashWidth: 18,
    pathDashArray: '4 12',

    // ─── LANDMARKS ─────────────────
    landmarks: [
      { assetKey: 'landmarkHouse', x: 55, y: 60, width: 280, zIndex: 2 },
      { assetKey: 'landmarkCourt', x: 200, y: 720, width: 170, zIndex: 2 },
      { assetKey: 'landmarkGate', x: 85, y: 2450, width: 220, zIndex: 2 },
    ],

    // ─── TREES (alternate left/right along edges) ─────
    trees: [
      { assetKey: 'treeLarge', x: -15, y: 280, width: 130, zIndex: 3, animationType: 'sway', animationDuration: 4000 },
      { assetKey: 'treeMedium', x: 280, y: 620, width: 110, zIndex: 3, animationType: 'sway', animationDuration: 5000, flipX: true },
      { assetKey: 'treeLarge', x: -20, y: 1100, width: 120, zIndex: 3, animationType: 'sway', animationDuration: 4500 },
      { assetKey: 'treeMedium', x: 285, y: 1550, width: 100, zIndex: 3, animationType: 'sway', animationDuration: 5500, flipX: true },
      { assetKey: 'treeLarge', x: -10, y: 2000, width: 115, zIndex: 3, animationType: 'sway', animationDuration: 4200 },
      { assetKey: 'treeMedium', x: 290, y: 2300, width: 95, zIndex: 3, animationType: 'sway', animationDuration: 4800, flipX: true },
    ],

    // ─── BUSHES ───────────────────
    bushes: [
      { assetKey: 'bushFlower', x: 310, y: 460, width: 65, zIndex: 3 },
      { assetKey: 'bushSmall', x: 15, y: 870, width: 50, zIndex: 3 },
      { assetKey: 'bushCluster', x: 300, y: 1300, width: 75, zIndex: 3 },
      { assetKey: 'bushFlower', x: 20, y: 1750, width: 60, zIndex: 3 },
      { assetKey: 'bushSmall', x: 310, y: 2150, width: 55, zIndex: 3 },
      { assetKey: 'bushLarge', x: 10, y: 2350, width: 80, zIndex: 3 },
    ],

    // ─── PROPS ────────────────────
    props: [
      { assetKey: 'propChair', x: 15, y: 750, width: 50, zIndex: 4 },
      { assetKey: 'propCooler', x: 70, y: 780, width: 40, zIndex: 4 },
      { assetKey: 'propHose', x: 305, y: 1060, width: 50, zIndex: 4 },
      { assetKey: 'propBag', x: 25, y: 1400, width: 55, zIndex: 4 },
      { assetKey: 'propGrill', x: 315, y: 1650, width: 50, zIndex: 4 },
      { assetKey: 'propCone', x: 15, y: 1850, width: 35, zIndex: 4 },
      { assetKey: 'propGnome', x: 30, y: 2060, width: 38, zIndex: 4 },
      { assetKey: 'propStepping', x: 50, y: 2250, width: 65, zIndex: 4 },
      { assetKey: 'propRock', x: 310, y: 2400, width: 50, zIndex: 4 },
    ],

    // ─── FENCES (vertical strips along left/right edges) ──
    fences: [
      { assetKey: 'fenceVertical', x: 0, y: 350, width: 30, zIndex: 1 },
      { assetKey: 'fenceVertical', x: 0, y: 750, width: 30, zIndex: 1 },
      { assetKey: 'fenceVertical', x: 0, y: 1150, width: 30, zIndex: 1 },
      { assetKey: 'fenceVertical', x: 360, y: 350, width: 30, zIndex: 1, flipX: true },
      { assetKey: 'fenceVertical', x: 360, y: 750, width: 30, zIndex: 1, flipX: true },
      { assetKey: 'fenceVertical', x: 360, y: 1150, width: 30, zIndex: 1, flipX: true },
      { assetKey: 'fenceCorner', x: 0, y: 320, width: 35, zIndex: 1 },
      { assetKey: 'fenceCorner', x: 355, y: 320, width: 35, zIndex: 1, flipX: true },
    ],

    // ─── NATURE / AMBIENT ─────────
    nature: [
      { assetKey: 'natureFlowers', x: 35, y: 530, width: 45, zIndex: 4 },
      { assetKey: 'natureButterfly', x: 180, y: 480, width: 30, zIndex: 6, animationType: 'float', animationDuration: 6000 },
      { assetKey: 'natureButterfly', x: 250, y: 1450, width: 25, zIndex: 6, animationType: 'float', animationDuration: 7000, animationDelay: 2000 },
      { assetKey: 'natureFlowers', x: 285, y: 1700, width: 40, zIndex: 4 },
      { assetKey: 'natureClover', x: 50, y: 1950, width: 35, zIndex: 4 },
      { assetKey: 'natureMushroom', x: 310, y: 2080, width: 30, zIndex: 4 },
      { assetKey: 'natureFlowers', x: 175, y: 2200, width: 38, zIndex: 4 },
      { assetKey: 'natureBirdFlying', x: 10, y: 180, width: 30, zIndex: 6, animationType: 'drift', animationDuration: 10000 },
    ],

    // ─── NODE POSITIONS ───────────
    // One entry per non-boss node, in sort_order sequence.
    // These are placed along the SVG path curves.
    // The code will match nodePositions[0] to the first non-boss node, [1] to second, etc.
    nodePositions: [
      { x: 258, y: 420 },   // Node 1 (right curve)
      { x: 88, y: 610 },    // Node 2 (left curve)
      { x: 258, y: 810 },   // Node 3 (right curve)
      { x: 108, y: 1020 },  // Node 4 (left curve)
      { x: 238, y: 1230 },  // Node 5 (right curve)
      { x: 118, y: 1450 },  // Node 6 (left curve)
      { x: 228, y: 1670 },  // Node 7 (right curve)
    ],

    bossPosition: { x: 170, y: 2420 },

    mascotOffset: { x: 55, y: -45 },
  };
}

// Scale helper — call this to get positions adjusted for actual screen width
export function scalePosition(pos: { x: number; y: number }): { x: number; y: number } {
  return {
    x: pos.x * SCALE,
    y: pos.y * SCALE,
  };
}

export function scaleValue(val: number): number {
  return val * SCALE;
}

export { SCALE, SCREEN_WIDTH };
