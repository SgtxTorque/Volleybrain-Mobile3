/**
 * useMatch — React context + hook that manages game day state.
 *
 * Wraps MatchState persistence, provides methods for lineup setup,
 * live scoring, subs, rotation, and phase viewing.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Formation, MatchState, Phase, PlayerSlot, RallyActionType, RallyEvent } from './match-state';
import * as store from './match-store';
import { autoFillLineup, getCourtPositions, processPoint, validateSubstitution } from './rotation-engine';

// ── Context value ───────────────────────────────────────────────

export interface MatchContextValue {
  // State
  match: MatchState | null;
  loading: boolean;
  availablePlayers: PlayerSlot[];
  currentPage: number;

  // View controls (for court diagram — independent of live state)
  viewPhase: Phase;
  viewRotation: number;
  setViewPhase: (p: Phase) => void;
  setViewRotation: (r: number) => void;
  setCurrentPage: (p: number) => void;

  // Prep methods
  setFormation: (f: Formation) => void;
  assignStarter: (posIndex: number, player: PlayerSlot) => void;
  removeStarter: (posIndex: number) => void;
  swapStarterPositions: (a: number, b: number) => void;
  assignLibero: (player: PlayerSlot | undefined) => void;
  addSubPair: (starterId: string, subId: string) => void;
  removeSubPair: (starterId: string) => void;
  doAutoFill: () => void;
  clearLineup: () => void;
  setFirstServe: (serving: boolean) => void;
  startMatch: () => Promise<void>;
  lineupReady: boolean;

  // Live match methods
  scorePoint: (pointFor: 'home' | 'away') => void;
  undoLastPoint: () => void;
  confirmSub: (playerInId: string, playerOutId: string) => void;
  endSet: () => void;
  startNextSet: () => void;
  endMatch: () => void;

  // Rally stat tracking (Tier 2)
  toggleRallyStats: () => void;
  recordRallyAction: (playerId: string, action: RallyActionType) => void;
  undoLastRallyAction: () => void;
  /** Current rally being assembled (actions since last point) */
  currentRally: RallyEvent | null;
}

const MatchContext = createContext<MatchContextValue | null>(null);

// ── Provider props ──────────────────────────────────────────────

interface MatchProviderProps {
  children: React.ReactNode;
  eventId?: string;
  teamId?: string;
  opponentName?: string;
  matchId?: string;
}

// ── Provider component ──────────────────────────────────────────

export function MatchProvider({
  children,
  eventId,
  teamId,
  opponentName,
  matchId: resumeMatchId,
}: MatchProviderProps) {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerSlot[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [viewPhase, setViewPhase] = useState<Phase>('base');
  const [viewRotation, setViewRotation] = useState(1);

  // ── Load or create match ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        if (resumeMatchId) {
          const loaded = await store.loadMatch(resumeMatchId);
          if (loaded) {
            setMatch(loaded);
            if (!loaded.matchComplete && loaded.starters.length === 6) {
              setCurrentPage(1); // go to live match
            }
          }
        } else if (eventId && teamId) {
          // Check for existing match for this event
          const all = await store.getAllMatches();
          const existing = all.find(m => m.eventId === eventId && !m.matchComplete);
          if (existing) {
            setMatch(existing);
            if (existing.starters.length === 6) setCurrentPage(1);
          } else {
            const created = await store.createMatch(
              eventId,
              teamId,
              opponentName || 'Opponent',
              '5-1',
            );
            setMatch(created);
          }
        }
      } catch (err) {
        if (__DEV__) console.error('[useMatch] init error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [resumeMatchId, eventId, teamId]);

  // ── Load available players from Supabase ────────────────────
  useEffect(() => {
    if (!teamId && !match?.teamId) return;
    const tid = teamId || match?.teamId;
    if (!tid) return;

    (async () => {
      try {
        const { data: teamPlayers } = await supabase
          .from('team_players')
          .select('player_id, jersey_number, players(id, first_name, last_name, jersey_number, position, photo_url)')
          .eq('team_id', tid);

        const players: PlayerSlot[] = (teamPlayers || [])
          .map((tp: any) => {
            const p = tp.players;
            if (!p) return null;
            return {
              playerId: p.id,
              firstName: p.first_name || '',
              lastName: p.last_name || '',
              jerseyNumber: tp.jersey_number ?? p.jersey_number ?? 0,
              position: (p.position || '').toUpperCase(),
              photoUrl: p.photo_url || undefined,
            };
          })
          .filter(Boolean) as PlayerSlot[];

        players.sort((a, b) => (a.jerseyNumber || 999) - (b.jerseyNumber || 999));
        setAvailablePlayers(players);
      } catch (err) {
        if (__DEV__) console.error('[useMatch] roster fetch error:', err);
      }
    })();
  }, [teamId, match?.teamId]);

  // ── Persist helper ──────────────────────────────────────────
  const persist = useCallback(async (updated: MatchState) => {
    setMatch(updated);
    await store.saveMatch(updated);
  }, []);

  // ── Prep methods ────────────────────────────────────────────

  const setFormation = useCallback((f: Formation) => {
    if (!match) return;
    persist({ ...match, formation: f });
  }, [match, persist]);

  const assignStarter = useCallback((posIndex: number, player: PlayerSlot) => {
    if (!match) return;
    const starters = [...match.starters];
    // Ensure array has 6 slots
    while (starters.length < 6) starters.push(undefined as any);

    // If player is already in lineup, swap positions
    const existingIdx = starters.findIndex(s => s?.playerId === player.playerId);
    if (existingIdx >= 0 && existingIdx !== posIndex) {
      starters[existingIdx] = starters[posIndex];
    }
    starters[posIndex] = player;

    // Remove from subs if present
    const subs = match.subs.filter(s => s.playerId !== player.playerId);

    persist({ ...match, starters, subs });
  }, [match, persist]);

  const removeStarter = useCallback((posIndex: number) => {
    if (!match) return;
    const starters = [...match.starters];
    const removed = starters[posIndex];
    starters[posIndex] = undefined as any;

    // Add back to subs
    const subs = removed ? [...match.subs, removed] : [...match.subs];
    persist({ ...match, starters, subs });
  }, [match, persist]);

  const swapStarterPositions = useCallback((a: number, b: number) => {
    if (!match) return;
    const starters = [...match.starters];
    [starters[a], starters[b]] = [starters[b], starters[a]];
    persist({ ...match, starters });
  }, [match, persist]);

  const assignLibero = useCallback((player: PlayerSlot | undefined) => {
    if (!match) return;
    let subs = match.subs;
    // If removing libero, add old libero back to subs
    if (match.libero && !player) {
      subs = [...subs, match.libero];
    }
    // If assigning, remove from subs
    if (player) {
      subs = subs.filter(s => s.playerId !== player.playerId);
    }
    persist({ ...match, libero: player, subs });
  }, [match, persist]);

  const addSubPair = useCallback((starterId: string, subId: string) => {
    if (!match) return;
    const pairs = match.subPairs.filter(p => p.starterId !== starterId);
    pairs.push({ starterId, subId });
    persist({ ...match, subPairs: pairs });
  }, [match, persist]);

  const removeSubPair = useCallback((starterId: string) => {
    if (!match) return;
    persist({ ...match, subPairs: match.subPairs.filter(p => p.starterId !== starterId) });
  }, [match, persist]);

  const doAutoFill = useCallback(() => {
    if (!match) return;
    const alreadyAssigned = new Set(
      match.starters.filter(Boolean).map(s => s.playerId),
    );
    const unassigned = availablePlayers.filter(
      p => !alreadyAssigned.has(p.playerId) && p.playerId !== match.libero?.playerId,
    );
    const filled = autoFillLineup(match.formation, [...match.starters.filter(Boolean), ...unassigned]);
    const starters = filled.map((p, i) => p || match.starters[i]) as PlayerSlot[];

    // Remaining players go to subs
    const starterIds = new Set(starters.filter(Boolean).map(s => s.playerId));
    const subs = availablePlayers.filter(
      p => !starterIds.has(p.playerId) && p.playerId !== match.libero?.playerId,
    );

    persist({ ...match, starters, subs });
  }, [match, availablePlayers, persist]);

  const clearLineup = useCallback(() => {
    if (!match) return;
    persist({ ...match, starters: [], subs: availablePlayers, libero: undefined, subPairs: [] });
  }, [match, availablePlayers, persist]);

  const setFirstServe = useCallback((serving: boolean) => {
    if (!match) return;
    const sets = [...match.sets];
    if (sets[0]) sets[0] = { ...sets[0], isServing: serving };
    persist({ ...match, sets });
  }, [match, persist]);

  const lineupReady = useMemo(() => {
    if (!match) return false;
    return match.starters.filter(Boolean).length === 6;
  }, [match]);

  const startMatch = useCallback(async () => {
    if (!match || !lineupReady) return;
    // Move to live match page
    setCurrentPage(1);
    setViewRotation(1);
    setViewPhase('base');
    await persist(match);
  }, [match, lineupReady, persist]);

  // ── Live match methods ──────────────────────────────────────

  const scorePoint = useCallback((pointFor: 'home' | 'away') => {
    if (!match) return;
    const sets = [...match.sets];
    const setIdx = match.currentSet - 1;
    const cs = { ...sets[setIdx] };

    const result = processPoint(
      pointFor, cs.homeScore, cs.awayScore,
      cs.currentRotation, cs.isServing,
      match.formation, match.starters, match.libero,
    );

    cs.homeScore = result.homeScore;
    cs.awayScore = result.awayScore;
    cs.currentRotation = result.newRotation;
    cs.isServing = result.isServing;
    sets[setIdx] = cs;

    const action = {
      id: store.generateActionId(),
      timestamp: new Date().toISOString(),
      type: 'score' as const,
      data: { pointFor, ...result },
    };

    persist({
      ...match,
      sets,
      pendingActions: [...match.pendingActions, action],
    });
  }, [match, persist]);

  const undoLastPoint = useCallback(() => {
    if (!match) return;
    const actions = [...match.pendingActions];
    const lastScore = [...actions].reverse().find(a => a.type === 'score');
    if (!lastScore) return;

    const sets = [...match.sets];
    const setIdx = match.currentSet - 1;
    const cs = { ...sets[setIdx] };

    const { pointFor, newRotation } = lastScore.data;
    // Reverse the score
    if (pointFor === 'home') cs.homeScore = Math.max(0, cs.homeScore - 1);
    else cs.awayScore = Math.max(0, cs.awayScore - 1);

    // Reverse rotation if one happened
    if (lastScore.data.rotated) {
      cs.currentRotation = cs.currentRotation <= 1 ? 6 : cs.currentRotation - 1;
      cs.isServing = !cs.isServing;
    } else if (pointFor === 'away' && !cs.isServing) {
      // They scored on their serve → we lost serve → restore it
      cs.isServing = true;
    } else if (pointFor === 'away' && cs.isServing) {
      // actually they scored on our serve, we already flipped, undo
    }

    sets[setIdx] = cs;
    // Remove the last score action
    const idx = actions.lastIndexOf(lastScore);
    if (idx >= 0) actions.splice(idx, 1);

    persist({ ...match, sets, pendingActions: actions });
  }, [match, persist]);

  const confirmSub = useCallback((playerInId: string, playerOutId: string) => {
    if (!match) return;
    const sets = [...match.sets];
    const setIdx = match.currentSet - 1;
    const cs = { ...sets[setIdx] };

    const validation = validateSubstitution(
      playerInId, playerOutId, cs.subLog, cs.subsUsed, match.maxSubs, match.libero,
    );
    if (!validation.valid) {
      if (__DEV__) console.warn('[useMatch] sub rejected:', validation.reason);
      return;
    }

    // Swap in starters array
    const starters = [...match.starters];
    const subs = [...match.subs];
    const courtIdx = starters.findIndex(s => s.playerId === playerOutId);
    const benchIdx = subs.findIndex(s => s.playerId === playerInId);

    if (courtIdx < 0 || benchIdx < 0) return;

    const outPlayer = starters[courtIdx];
    const inPlayer = subs[benchIdx];
    starters[courtIdx] = inPlayer;
    subs[benchIdx] = outPlayer;

    cs.subsUsed += 1;
    cs.subLog = [...cs.subLog, {
      id: store.generateActionId(),
      timestamp: new Date().toISOString(),
      setNumber: match.currentSet,
      playerIn: playerInId,
      playerOut: playerOutId,
      isLibero: false,
    }];

    sets[setIdx] = cs;
    persist({ ...match, starters, subs, sets });
  }, [match, persist]);

  const endSet = useCallback(() => {
    if (!match) return;
    const sets = [...match.sets];
    const setIdx = match.currentSet - 1;
    const cs = { ...sets[setIdx] };
    cs.setComplete = true;
    cs.winner = cs.homeScore > cs.awayScore ? 'home' : 'away';
    sets[setIdx] = cs;
    persist({ ...match, sets });
    setCurrentPage(2); // navigate to End Set page
  }, [match, persist]);

  const startNextSet = useCallback(() => {
    if (!match) return;
    const nextSetNum = match.currentSet + 1;
    const newSet: import('./match-state').SetState = {
      setNumber: nextSetNum,
      homeScore: 0,
      awayScore: 0,
      currentRotation: match.resetRotationBetweenSets ? 1 : match.sets[match.sets.length - 1]?.currentRotation || 1,
      isServing: !match.sets[match.sets.length - 1]?.isServing, // alternate serve
      subsUsed: 0,
      subLog: [],
      rallyLog: [],
      serveLog: [],
      setComplete: false,
    };
    persist({ ...match, currentSet: nextSetNum, sets: [...match.sets, newSet] });
  }, [match, persist]);

  const endMatch = useCallback(() => {
    if (!match) return;
    persist({ ...match, matchComplete: true });
    setCurrentPage(3); // go to summary
  }, [match, persist]);

  // ── Rally stat tracking (Tier 2) ─────────────────────────

  const [currentRally, setCurrentRally] = useState<RallyEvent | null>(null);

  const toggleRallyStats = useCallback(() => {
    if (!match) return;
    persist({ ...match, trackRallyStats: !match.trackRallyStats });
  }, [match, persist]);

  const recordRallyAction = useCallback((playerId: string, action: RallyActionType) => {
    if (!match) return;
    const setIdx = match.currentSet - 1;
    const cs = match.sets[setIdx];
    const rallyNumber = (cs?.rallyLog.length ?? 0) + 1;

    setCurrentRally(prev => {
      const rally: RallyEvent = prev ?? {
        id: store.generateActionId(),
        timestamp: new Date().toISOString(),
        setNumber: match.currentSet,
        rallyNumber,
        actions: [],
        pointFor: 'home', // updated when point scored
      };
      return {
        ...rally,
        actions: [...rally.actions, { playerId, action }],
      };
    });
  }, [match]);

  const undoLastRallyAction = useCallback(() => {
    setCurrentRally(prev => {
      if (!prev || prev.actions.length === 0) return null;
      const actions = prev.actions.slice(0, -1);
      if (actions.length === 0) return null;
      return { ...prev, actions };
    });
  }, []);

  // Flush current rally into the set's rallyLog when a point is scored
  useEffect(() => {
    if (!match || !currentRally) return;
    const setIdx = match.currentSet - 1;
    const cs = match.sets[setIdx];
    if (!cs) return;

    // Detect if score just changed (rally is over)
    const totalScore = cs.homeScore + cs.awayScore;
    const lastRally = cs.rallyLog[cs.rallyLog.length - 1];
    const lastRallyNumber = lastRally?.rallyNumber ?? 0;

    // If a point was scored after rally actions were recorded, flush
    if (currentRally.actions.length > 0 && totalScore > 0) {
      // pointFor determined by which score increased — we'll attribute on next score
    }
  }, [match?.sets, currentRally]);

  // Hook into scorePoint to flush rally
  const originalScorePoint = scorePoint;
  const scorePointWithRally = useCallback((pointFor: 'home' | 'away') => {
    if (match?.trackRallyStats && currentRally && currentRally.actions.length > 0) {
      // Flush the current rally into the set log
      const sets = [...match.sets];
      const setIdx = match.currentSet - 1;
      const cs = { ...sets[setIdx] };
      const finalRally: RallyEvent = {
        ...currentRally,
        pointFor,
      };
      cs.rallyLog = [...cs.rallyLog, finalRally];
      sets[setIdx] = cs;
      persist({ ...match, sets }).then(() => {
        setCurrentRally(null);
      });
    } else {
      setCurrentRally(null);
    }
    originalScorePoint(pointFor);
  }, [match, currentRally, originalScorePoint, persist]);

  // ── Context value ───────────────────────────────────────────

  const value: MatchContextValue = {
    match, loading, availablePlayers, currentPage,
    viewPhase, viewRotation,
    setViewPhase, setViewRotation, setCurrentPage,
    setFormation, assignStarter, removeStarter, swapStarterPositions,
    assignLibero, addSubPair, removeSubPair,
    doAutoFill, clearLineup, setFirstServe, startMatch, lineupReady,
    scorePoint: scorePointWithRally, undoLastPoint, confirmSub, endSet, startNextSet, endMatch,
    toggleRallyStats, recordRallyAction, undoLastRallyAction, currentRally,
  };

  return React.createElement(MatchContext.Provider, { value }, children);
}

// ── Hook ────────────────────────────────────────────────────────

export function useMatch(): MatchContextValue {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error('useMatch must be used within MatchProvider');
  return ctx;
}
