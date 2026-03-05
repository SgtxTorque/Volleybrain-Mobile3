/**
 * Formation Positions — court coordinates for every combination of
 * formation × rotation × phase.
 *
 * Coordinate system (normalised 0-100):
 *   x: 0 = left, 100 = right  (from team's perspective facing net)
 *   y: 0 = back endline, ~50 = net, values >50 shown near/above net
 *
 * Back-row positions use y ≈ 10-30.
 * Front-row positions use y ≈ 55-75.
 *
 * Court positions at moment of serve:
 *   Front row:  P4 (left-front)  P3 (middle-front)  P2 (right-front)
 *   Back row:   P5 (left-back)   P6 (middle-back)   P1 (right-back/server)
 */

import type { Formation, Phase } from './match-state';

export interface PositionXY {
  x: number;
  y: number;
}

// ── Key for the lookup table ────────────────────────────────────
function key(f: Formation, r: number, p: Phase): string {
  return `${f}:${r}:${p}`;
}

// ── Position data ───────────────────────────────────────────────
// Each entry is a 6-element array [P1, P2, P3, P4, P5, P6].

type PosSet = [PositionXY, PositionXY, PositionXY, PositionXY, PositionXY, PositionXY];

const P: Record<string, PosSet> = {};

// Helper – declare positions in P1-P6 order
function def(f: Formation, r: number, p: Phase, positions: PosSet) {
  P[key(f, r, p)] = positions;
}

// ─────────────────────────────────────────────────────────────────
// 5-1 FORMATION
// Starter order: [S, OPP, MB1, OH1, MB2, OH2]
//
// Rotation table (who is at each court position):
//   R1: P1=S   P2=OPP P3=MB1 P4=OH1 P5=MB2 P6=OH2
//   R2: P1=OH2 P2=S   P3=OPP P4=MB1 P5=OH1 P6=MB2
//   R3: P1=MB2 P2=OH2 P3=S   P4=OPP P5=MB1 P6=OH1
//   R4: P1=OH1 P2=MB2 P3=OH2 P4=S   P5=OPP P6=MB1
//   R5: P1=MB1 P2=OH1 P3=MB2 P4=OH2 P5=S   P6=OPP
//   R6: P1=OPP P2=MB1 P3=OH1 P4=MB2 P5=OH2 P6=S
// ─────────────────────────────────────────────────────────────────

// ── 5-1 R1  (S back-row at P1) ──

def('5-1', 1, 'serve', [
  { x: 82, y: 5 },   // P1 S – serving, back-right, behind endline
  { x: 80, y: 58 },  // P2 OPP – right-front
  { x: 50, y: 62 },  // P3 MB1 – middle-front
  { x: 20, y: 58 },  // P4 OH1 – left-front
  { x: 18, y: 25 },  // P5 MB2 – left-back
  { x: 50, y: 20 },  // P6 OH2 – middle-back
]);

def('5-1', 1, 'serve-receive', [
  { x: 82, y: 18 },  // P1 S – back-right, ready to penetrate
  { x: 78, y: 55 },  // P2 OPP – right-front, off the net
  { x: 50, y: 58 },  // P3 MB1 – centre-front, near net
  { x: 22, y: 55 },  // P4 OH1 – left-front, passing position
  { x: 18, y: 30 },  // P5 MB2 – left-back
  { x: 50, y: 15 },  // P6 OH2 – centre-back, primary passer
]);

def('5-1', 1, 'base', [
  { x: 78, y: 62 },  // P1 S – penetrated to right-front target
  { x: 72, y: 72 },  // P2 OPP – right-side hitter
  { x: 50, y: 75 },  // P3 MB1 – centre hitter
  { x: 18, y: 72 },  // P4 OH1 – left-side hitter
  { x: 25, y: 18 },  // P5 MB2 – back-left defence
  { x: 50, y: 15 },  // P6 OH2 – back-centre defence
]);

// ── 5-1 R2  (S front-row at P2) ──

def('5-1', 2, 'serve', [
  { x: 82, y: 5 },   // P1 OH2 – serving
  { x: 78, y: 58 },  // P2 S – right-front (setter at net)
  { x: 50, y: 62 },  // P3 OPP – middle-front
  { x: 20, y: 58 },  // P4 MB1 – left-front
  { x: 18, y: 25 },  // P5 OH1 – left-back
  { x: 50, y: 20 },  // P6 MB2 – middle-back
]);

def('5-1', 2, 'serve-receive', [
  { x: 78, y: 22 },  // P1 OH2 – back-right, passer
  { x: 80, y: 58 },  // P2 S – setter at target (right-front)
  { x: 55, y: 62 },  // P3 OPP – centre-front
  { x: 22, y: 58 },  // P4 MB1 – left-front near net
  { x: 18, y: 28 },  // P5 OH1 – left-back, passer
  { x: 50, y: 15 },  // P6 MB2 – centre-back
]);

def('5-1', 2, 'base', [
  { x: 75, y: 18 },  // P1 OH2 – back-right defence
  { x: 78, y: 65 },  // P2 S – setting position at net
  { x: 55, y: 72 },  // P3 OPP – right-side hitting
  { x: 18, y: 72 },  // P4 MB1 – centre/left hitting
  { x: 22, y: 18 },  // P5 OH1 – back-left defence
  { x: 50, y: 15 },  // P6 MB2 – back-centre defence
]);

// ── 5-1 R3  (S front-row at P3) ──

def('5-1', 3, 'serve', [
  { x: 82, y: 5 },   // P1 MB2 – serving
  { x: 78, y: 58 },  // P2 OH2 – right-front
  { x: 60, y: 62 },  // P3 S – centre-front (shifts right to set)
  { x: 22, y: 58 },  // P4 OPP – left-front
  { x: 18, y: 25 },  // P5 MB1 – left-back
  { x: 50, y: 20 },  // P6 OH1 – middle-back
]);

def('5-1', 3, 'serve-receive', [
  { x: 78, y: 22 },  // P1 MB2 – back-right
  { x: 75, y: 55 },  // P2 OH2 – right-front
  { x: 62, y: 60 },  // P3 S – shifts right (overlap: left of P2)
  { x: 20, y: 55 },  // P4 OPP – left-front
  { x: 18, y: 30 },  // P5 MB1 – left-back
  { x: 50, y: 15 },  // P6 OH1 – centre-back, passer
]);

def('5-1', 3, 'base', [
  { x: 75, y: 18 },  // P1 MB2 – back-right defence
  { x: 22, y: 72 },  // P2 OH2 – left-side hitting
  { x: 78, y: 65 },  // P3 S – setting position (right-front)
  { x: 55, y: 72 },  // P4 OPP – left/centre hitting
  { x: 50, y: 18 },  // P5 MB1 – back-centre defence
  { x: 25, y: 18 },  // P6 OH1 – back-left defence
]);

// ── 5-1 R4  (S front-row at P4) ──

def('5-1', 4, 'serve', [
  { x: 82, y: 5 },   // P1 OH1 – serving
  { x: 78, y: 58 },  // P2 MB2 – right-front
  { x: 50, y: 62 },  // P3 OH2 – middle-front
  { x: 28, y: 58 },  // P4 S – left-front (shifts right to set)
  { x: 18, y: 25 },  // P5 OPP – left-back
  { x: 50, y: 20 },  // P6 MB1 – middle-back
]);

def('5-1', 4, 'serve-receive', [
  { x: 78, y: 22 },  // P1 OH1 – back-right, passer
  { x: 78, y: 58 },  // P2 MB2 – right-front near net
  { x: 50, y: 55 },  // P3 OH2 – centre-front
  { x: 30, y: 58 },  // P4 S – left-front area (overlap: left of P3)
  { x: 20, y: 28 },  // P5 OPP – left-back
  { x: 50, y: 15 },  // P6 MB1 – centre-back
]);

def('5-1', 4, 'base', [
  { x: 75, y: 18 },  // P1 OH1 – back-right defence
  { x: 55, y: 72 },  // P2 MB2 – centre hitter
  { x: 22, y: 72 },  // P3 OH2 – left-side hitter
  { x: 78, y: 65 },  // P4 S – setting position (right-front)
  { x: 25, y: 18 },  // P5 OPP – back-left defence
  { x: 50, y: 15 },  // P6 MB1 – back-centre defence
]);

// ── 5-1 R5  (S back-row at P5) ──

def('5-1', 5, 'serve', [
  { x: 82, y: 5 },   // P1 MB1 – serving
  { x: 78, y: 58 },  // P2 OH1 – right-front
  { x: 50, y: 62 },  // P3 MB2 – middle-front
  { x: 20, y: 58 },  // P4 OH2 – left-front
  { x: 22, y: 25 },  // P5 S – left-back (will penetrate right)
  { x: 50, y: 20 },  // P6 OPP – middle-back
]);

def('5-1', 5, 'serve-receive', [
  { x: 78, y: 22 },  // P1 MB1 – back-right
  { x: 72, y: 55 },  // P2 OH1 – right-front
  { x: 50, y: 58 },  // P3 MB2 – centre-front near net
  { x: 22, y: 55 },  // P4 OH2 – left-front, passer
  { x: 25, y: 28 },  // P5 S – left-back, ready to penetrate
  { x: 50, y: 15 },  // P6 OPP – centre-back
]);

def('5-1', 5, 'base', [
  { x: 75, y: 18 },  // P1 MB1 – back-right defence
  { x: 22, y: 72 },  // P2 OH1 – left-side hitting from RF
  { x: 50, y: 75 },  // P3 MB2 – centre hitter
  { x: 18, y: 68 },  // P4 OH2 – left-side hitter
  { x: 78, y: 62 },  // P5 S – penetrated to right-front target
  { x: 72, y: 18 },  // P6 OPP – back-right defence
]);

// ── 5-1 R6  (S back-row at P6) ──

def('5-1', 6, 'serve', [
  { x: 82, y: 5 },   // P1 OPP – serving
  { x: 78, y: 58 },  // P2 MB1 – right-front
  { x: 50, y: 62 },  // P3 OH1 – middle-front
  { x: 20, y: 58 },  // P4 MB2 – left-front
  { x: 18, y: 25 },  // P5 OH2 – left-back
  { x: 55, y: 20 },  // P6 S – middle-back (shifts right to penetrate)
]);

def('5-1', 6, 'serve-receive', [
  { x: 78, y: 22 },  // P1 OPP – back-right
  { x: 75, y: 58 },  // P2 MB1 – right-front near net
  { x: 50, y: 55 },  // P3 OH1 – centre-front
  { x: 22, y: 58 },  // P4 MB2 – left-front near net
  { x: 20, y: 28 },  // P5 OH2 – left-back, passer
  { x: 58, y: 18 },  // P6 S – middle-back, shifts right to penetrate
]);

def('5-1', 6, 'base', [
  { x: 72, y: 18 },  // P1 OPP – back-right defence
  { x: 55, y: 72 },  // P2 MB1 – centre hitter
  { x: 22, y: 72 },  // P3 OH1 – left-side hitter
  { x: 18, y: 68 },  // P4 MB2 – left-front
  { x: 25, y: 18 },  // P5 OH2 – back-left defence
  { x: 78, y: 62 },  // P6 S – penetrated to right-front target
]);


// ─────────────────────────────────────────────────────────────────
// 6-2 FORMATION
// Starter order: [S1, OH1, MB1, S2, OH2, MB2]
// Two setters opposite each other (S1/S2 are 3 apart).
// Back-row setter always sets; front-row setter hits.
//
//   R1: P1=S1  P2=OH1 P3=MB1 P4=S2  P5=OH2 P6=MB2
//   R2: P1=MB2 P2=S1  P3=OH1 P4=MB1 P5=S2  P6=OH2
//   R3: P1=OH2 P2=MB2 P3=S1  P4=OH1 P5=MB1 P6=S2
//   R4: P1=S2  P2=OH2 P3=MB2 P4=S1  P5=OH1 P6=MB1
//   R5: P1=MB1 P2=S2  P3=OH2 P4=MB2 P5=S1  P6=OH1
//   R6: P1=OH1 P2=MB1 P3=S2  P4=OH2 P5=MB2 P6=S1
// ─────────────────────────────────────────────────────────────────

// ── 6-2 R1  (S1 back-row at P1, S2 front-row at P4) ──

def('6-2', 1, 'serve', [
  { x: 82, y: 5 },   // P1 S1 – serving / setting from back
  { x: 78, y: 58 },  // P2 OH1 – right-front
  { x: 50, y: 62 },  // P3 MB1 – middle-front
  { x: 20, y: 58 },  // P4 S2 – left-front (hitting, not setting)
  { x: 18, y: 25 },  // P5 OH2 – left-back
  { x: 50, y: 20 },  // P6 MB2 – middle-back
]);

def('6-2', 1, 'serve-receive', [
  { x: 82, y: 18 },  // P1 S1 – back-right, ready to penetrate
  { x: 75, y: 55 },  // P2 OH1 – right-front
  { x: 50, y: 58 },  // P3 MB1 – centre-front
  { x: 22, y: 55 },  // P4 S2 – left-front
  { x: 18, y: 28 },  // P5 OH2 – left-back, passer
  { x: 50, y: 15 },  // P6 MB2 – centre-back
]);

def('6-2', 1, 'base', [
  { x: 78, y: 62 },  // P1 S1 – penetrated to right-front target
  { x: 70, y: 72 },  // P2 OH1 – right-side hitter
  { x: 50, y: 75 },  // P3 MB1 – centre hitter
  { x: 18, y: 72 },  // P4 S2 – left-side hitter (front-row setter hits)
  { x: 25, y: 18 },  // P5 OH2 – back-left defence
  { x: 50, y: 15 },  // P6 MB2 – back-centre defence
]);

// ── 6-2 R2  (S1 front-row at P2, S2 back-row at P5) ──

def('6-2', 2, 'serve', [
  { x: 82, y: 5 },   // P1 MB2 – serving
  { x: 78, y: 58 },  // P2 S1 – right-front (hitting)
  { x: 50, y: 62 },  // P3 OH1 – middle-front
  { x: 20, y: 58 },  // P4 MB1 – left-front
  { x: 22, y: 25 },  // P5 S2 – left-back (setting)
  { x: 50, y: 20 },  // P6 OH2 – middle-back
]);

def('6-2', 2, 'serve-receive', [
  { x: 78, y: 22 },  // P1 MB2 – back-right
  { x: 75, y: 58 },  // P2 S1 – right-front
  { x: 50, y: 55 },  // P3 OH1 – centre-front
  { x: 22, y: 58 },  // P4 MB1 – left-front
  { x: 25, y: 28 },  // P5 S2 – left-back, penetrate right
  { x: 50, y: 15 },  // P6 OH2 – centre-back, passer
]);

def('6-2', 2, 'base', [
  { x: 72, y: 18 },  // P1 MB2 – back-right defence
  { x: 70, y: 72 },  // P2 S1 – right-side hitter (front-row)
  { x: 50, y: 75 },  // P3 OH1 – centre/left hitter
  { x: 18, y: 72 },  // P4 MB1 – left hitter
  { x: 78, y: 62 },  // P5 S2 – penetrated to right-front target
  { x: 50, y: 15 },  // P6 OH2 – back-centre defence
]);

// ── 6-2 R3  (S1 front-row at P3, S2 back-row at P6) ──

def('6-2', 3, 'serve', [
  { x: 82, y: 5 },   // P1 OH2 – serving
  { x: 78, y: 58 },  // P2 MB2 – right-front
  { x: 55, y: 62 },  // P3 S1 – centre-front (hitting)
  { x: 20, y: 58 },  // P4 OH1 – left-front
  { x: 18, y: 25 },  // P5 MB1 – left-back
  { x: 55, y: 20 },  // P6 S2 – middle-back (setting)
]);

def('6-2', 3, 'serve-receive', [
  { x: 78, y: 22 },  // P1 OH2 – back-right, passer
  { x: 75, y: 55 },  // P2 MB2 – right-front
  { x: 55, y: 58 },  // P3 S1 – centre-front
  { x: 22, y: 55 },  // P4 OH1 – left-front, passer
  { x: 18, y: 28 },  // P5 MB1 – left-back
  { x: 58, y: 18 },  // P6 S2 – centre-back, penetrate right
]);

def('6-2', 3, 'base', [
  { x: 72, y: 18 },  // P1 OH2 – back-right defence
  { x: 55, y: 72 },  // P2 MB2 – centre hitter
  { x: 22, y: 72 },  // P3 S1 – left-side hitter (front-row)
  { x: 18, y: 68 },  // P4 OH1 – left hitter
  { x: 50, y: 18 },  // P5 MB1 – back-centre defence
  { x: 78, y: 62 },  // P6 S2 – penetrated to right-front target
]);

// ── 6-2 R4  (S2 back-row at P1, S1 front-row at P4) ──

def('6-2', 4, 'serve', [
  { x: 82, y: 5 },   // P1 S2 – serving / setting from back
  { x: 78, y: 58 },  // P2 OH2 – right-front
  { x: 50, y: 62 },  // P3 MB2 – middle-front
  { x: 20, y: 58 },  // P4 S1 – left-front (hitting)
  { x: 18, y: 25 },  // P5 OH1 – left-back
  { x: 50, y: 20 },  // P6 MB1 – middle-back
]);

def('6-2', 4, 'serve-receive', [
  { x: 82, y: 18 },  // P1 S2 – back-right, ready to penetrate
  { x: 75, y: 55 },  // P2 OH2 – right-front
  { x: 50, y: 58 },  // P3 MB2 – centre-front
  { x: 22, y: 55 },  // P4 S1 – left-front
  { x: 18, y: 28 },  // P5 OH1 – left-back, passer
  { x: 50, y: 15 },  // P6 MB1 – centre-back
]);

def('6-2', 4, 'base', [
  { x: 78, y: 62 },  // P1 S2 – penetrated to right-front target
  { x: 70, y: 72 },  // P2 OH2 – right-side hitter
  { x: 50, y: 75 },  // P3 MB2 – centre hitter
  { x: 18, y: 72 },  // P4 S1 – left-side hitter
  { x: 25, y: 18 },  // P5 OH1 – back-left defence
  { x: 50, y: 15 },  // P6 MB1 – back-centre defence
]);

// ── 6-2 R5  (S2 front-row at P2, S1 back-row at P5) ──

def('6-2', 5, 'serve', [
  { x: 82, y: 5 },   // P1 MB1 – serving
  { x: 78, y: 58 },  // P2 S2 – right-front (hitting)
  { x: 50, y: 62 },  // P3 OH2 – middle-front
  { x: 20, y: 58 },  // P4 MB2 – left-front
  { x: 22, y: 25 },  // P5 S1 – left-back (setting)
  { x: 50, y: 20 },  // P6 OH1 – middle-back
]);

def('6-2', 5, 'serve-receive', [
  { x: 78, y: 22 },  // P1 MB1 – back-right
  { x: 75, y: 58 },  // P2 S2 – right-front
  { x: 50, y: 55 },  // P3 OH2 – centre-front
  { x: 22, y: 58 },  // P4 MB2 – left-front
  { x: 25, y: 28 },  // P5 S1 – left-back, penetrate right
  { x: 50, y: 15 },  // P6 OH1 – centre-back, passer
]);

def('6-2', 5, 'base', [
  { x: 72, y: 18 },  // P1 MB1 – back-right defence
  { x: 70, y: 72 },  // P2 S2 – right-side hitter (front-row)
  { x: 50, y: 75 },  // P3 OH2 – centre hitter
  { x: 18, y: 72 },  // P4 MB2 – left hitter
  { x: 78, y: 62 },  // P5 S1 – penetrated to right-front target
  { x: 50, y: 15 },  // P6 OH1 – back-centre defence
]);

// ── 6-2 R6  (S2 front-row at P3, S1 back-row at P6) ──

def('6-2', 6, 'serve', [
  { x: 82, y: 5 },   // P1 OH1 – serving
  { x: 78, y: 58 },  // P2 MB1 – right-front
  { x: 55, y: 62 },  // P3 S2 – centre-front (hitting)
  { x: 20, y: 58 },  // P4 OH2 – left-front
  { x: 18, y: 25 },  // P5 MB2 – left-back
  { x: 55, y: 20 },  // P6 S1 – middle-back (setting)
]);

def('6-2', 6, 'serve-receive', [
  { x: 78, y: 22 },  // P1 OH1 – back-right, passer
  { x: 75, y: 55 },  // P2 MB1 – right-front
  { x: 55, y: 58 },  // P3 S2 – centre-front
  { x: 22, y: 55 },  // P4 OH2 – left-front, passer
  { x: 18, y: 28 },  // P5 MB2 – left-back
  { x: 58, y: 18 },  // P6 S1 – centre-back, penetrate right
]);

def('6-2', 6, 'base', [
  { x: 72, y: 18 },  // P1 OH1 – back-right defence
  { x: 55, y: 72 },  // P2 MB1 – centre hitter
  { x: 22, y: 72 },  // P3 S2 – left-side hitter (front-row)
  { x: 18, y: 68 },  // P4 OH2 – left hitter
  { x: 50, y: 18 },  // P5 MB2 – back-centre defence
  { x: 78, y: 62 },  // P6 S1 – penetrated to right-front target
]);


// ─────────────────────────────────────────────────────────────────
// 6-6 FORMATION (beginner/youth — no specialised setter)
// All 6 players rotate through all positions.
// Positions are the standard court slots; no formation-specific
// adjustments.  All 6 rotations use the same template.
// ─────────────────────────────────────────────────────────────────

const SIX_SIX_SERVE: PosSet = [
  { x: 82, y: 5 },   // P1 – serving
  { x: 78, y: 60 },  // P2 – right-front
  { x: 50, y: 65 },  // P3 – middle-front
  { x: 22, y: 60 },  // P4 – left-front
  { x: 18, y: 25 },  // P5 – left-back
  { x: 50, y: 22 },  // P6 – middle-back
];

const SIX_SIX_RECEIVE: PosSet = [
  { x: 78, y: 22 },  // P1 – back-right
  { x: 75, y: 55 },  // P2 – right-front
  { x: 50, y: 58 },  // P3 – middle-front
  { x: 25, y: 55 },  // P4 – left-front
  { x: 22, y: 22 },  // P5 – left-back
  { x: 50, y: 15 },  // P6 – middle-back
];

const SIX_SIX_BASE: PosSet = [
  { x: 78, y: 18 },  // P1 – back-right
  { x: 72, y: 68 },  // P2 – right-front
  { x: 50, y: 72 },  // P3 – middle-front
  { x: 22, y: 68 },  // P4 – left-front
  { x: 22, y: 18 },  // P5 – left-back
  { x: 50, y: 15 },  // P6 – middle-back
];

for (let r = 1; r <= 6; r++) {
  def('6-6', r, 'serve', SIX_SIX_SERVE);
  def('6-6', r, 'serve-receive', SIX_SIX_RECEIVE);
  def('6-6', r, 'base', SIX_SIX_BASE);
}


// ── Public API ──────────────────────────────────────────────────

/**
 * Look up the 6 court positions for a given formation, rotation, and phase.
 * Returns [P1, P2, P3, P4, P5, P6] each with { x, y }.
 */
export function getFormationPositions(
  formation: Formation,
  rotation: number,
  phase: Phase,
): PosSet {
  const k = key(formation, rotation, phase);
  const result = P[k];
  if (!result) {
    // Fallback: return standard slot positions
    return SIX_SIX_BASE;
  }
  return result;
}

/**
 * Total defined position sets.  Used for verification.
 */
export function getPositionSetCount(): number {
  return Object.keys(P).length;
}
