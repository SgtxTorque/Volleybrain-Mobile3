import EmergencyContactModal from '@/components/EmergencyContactModal';
import GameCompletionWizard, { type GameCompletionResult } from '@/components/GameCompletionWizard';
import VolleyballCourt, { type CourtSlot } from '@/components/VolleyballCourt';
import { checkAndUnlockAchievements } from '@/lib/achievement-engine';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { useSport } from '@/lib/sport';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

type Team = { id: string; name: string; color: string | null };

type Game = {
  id: string;
  title: string;
  opponent_name: string | null;
  event_date: string;
  start_time: string | null;
  location: string | null;
  location_type: string | null;
  game_status: string | null;
  our_score: number | null;
  opponent_score: number | null;
  set_scores: { our: number; their: number }[] | null;
  team_id: string;
  stats_entered?: boolean | null;
  scoring_format?: string | null;
};

type RosterPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: string | null;
  position: string | null;
  photo_url: string | null;
  medical_conditions: string | null;
  allergies: string | null;
  medications: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
};

type PlayerStats = {
  kills: number;
  aces: number;
  blocks: number;
  digs: number;
  assists: number;
  errors: number;
};

type DetailedPlayerStats = {
  kills: number;
  aces: number;
  digs: number;
  blocks: number;
  assists: number;
  serves: number;
  errors: number;
};

type SetScore = { our: number; their: number };

type GameMode = 'list' | 'live' | 'stats-entry';

type StatKey = 'kills' | 'aces' | 'blocks' | 'digs' | 'assists' | 'errors';

type DetailedStatKey = 'kills' | 'aces' | 'digs' | 'blocks' | 'assists' | 'serves' | 'errors';

type UndoAction =
  | { type: 'stat'; playerId: string; statKey: StatKey; setIndex: number }
  | { type: 'opp_error'; setIndex: number }
  | { type: 'sub'; inId: string; outId: string; courtPos: number }
  | { type: 'rally_won'; wasServing: boolean; setIndex: number }
  | { type: 'rally_lost'; wasServing: boolean; setIndex: number }
  | { type: 'serve_error'; setIndex: number }
  | { type: 'serve_ace'; playerId: string; setIndex: number };

// ============================================================================
// STAT CONFIG
// ============================================================================

const STAT_BUTTONS: { key: StatKey; label: string; icon: string; color: string; points: number }[] = [
  { key: 'kills', label: 'KILL', icon: 'flash', color: '#FF3B3B', points: 1 },
  { key: 'aces', label: 'ACE', icon: 'star', color: '#A855F7', points: 1 },
  { key: 'blocks', label: 'BLK', icon: 'hand-left', color: '#F59E0B', points: 1 },
  { key: 'digs', label: 'DIG', icon: 'shield', color: '#3B82F6', points: 0 },
  { key: 'assists', label: 'AST', icon: 'people', color: '#10B981', points: 0 },
  { key: 'errors', label: 'ERR', icon: 'close-circle', color: '#6B7280', points: -1 },
];

const DETAILED_STAT_FIELDS: { key: DetailedStatKey; label: string; color: string }[] = [
  { key: 'kills', label: 'Kills', color: '#FF3B3B' },
  { key: 'aces', label: 'Aces', color: '#A855F7' },
  { key: 'digs', label: 'Digs', color: '#3B82F6' },
  { key: 'blocks', label: 'Blocks', color: '#F59E0B' },
  { key: 'assists', label: 'Assists', color: '#10B981' },
  { key: 'serves', label: 'Serves', color: '#06B6D4' },
  { key: 'errors', label: 'Errors', color: '#6B7280' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GamePrepScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const { activeSport } = useSport();
  const router = useRouter();
  const { startLive } = useLocalSearchParams<{ startLive?: string }>();

  // List mode state
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  // Lineup status for each game (eventId -> count of lineup entries)
  const [lineupCounts, setLineupCounts] = useState<Record<string, number>>({});

  // Game day state
  const [mode, setMode] = useState<GameMode>('list');
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStats>>({});
  const [setScores, setSetScores] = useState<SetScore[]>([{ our: 0, their: 0 }]);
  const [currentSet, setCurrentSet] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Mission Control state
  const [currentRotation, setCurrentRotation] = useState(0);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [courtLineup, setCourtLineup] = useState<CourtSlot[]>([]);
  const [selectedCourtPosition, setSelectedCourtPosition] = useState<number | null>(null);
  const [benchPlayers, setBenchPlayers] = useState<RosterPlayer[]>([]);
  const [subHistory, setSubHistory] = useState<{ inId: string; outId: string; set: number }[]>([]);
  const [weAreServing, setWeAreServing] = useState(true);
  const [viewingSet, setViewingSet] = useState<number | null>(null);

  // Emergency contact modal state
  const [emergencyPlayer, setEmergencyPlayer] = useState<RosterPlayer | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Stats entry state (post-game)
  const [statsEntryIndex, setStatsEntryIndex] = useState(0);
  const [detailedStats, setDetailedStats] = useState<Record<string, DetailedPlayerStats>>({});
  const [savingStats, setSavingStats] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (user?.id && workingSeason?.id) loadTeams();
  }, [user?.id, workingSeason?.id]);

  useEffect(() => {
    if (selectedTeam) loadGames();
  }, [selectedTeam?.id]);

  // Auto-start live mode when startLive param is provided (from CoachDashboard Game Day button)
  useEffect(() => {
    if (startLive && games.length > 0 && mode === 'list') {
      const game = games.find(g => g.id === startLive);
      if (game) startGameDay(game);
    }
  }, [startLive, games]);

  const loadTeams = async () => {
    if (!user?.id || !workingSeason?.id) return;

    // Get teams user coaches
    const { data: staffData } = await supabase
      .from('team_staff')
      .select('team_id, teams(id, name, color)')
      .eq('user_id', user.id);

    // Fallback: check coaches table
    const { data: coachData } = await supabase
      .from('coaches')
      .select('id')
      .eq('profile_id', user.id)
      .limit(1);

    let teamList: Team[] = [];

    if (staffData && staffData.length > 0) {
      teamList = staffData
        .map(s => s.teams as any)
        .filter(Boolean)
        .map((t: any) => ({ id: t.id, name: t.name, color: t.color }));
    }

    // If coach record exists but no team_staff, load all season teams
    if (teamList.length === 0 && coachData && coachData.length > 0) {
      const { data: allTeams } = await supabase
        .from('teams')
        .select('id, name, color')
        .eq('season_id', workingSeason!.id)
        .order('name');
      if (allTeams) teamList = allTeams;
    }

    setTeams(teamList);
    if (teamList.length > 0) setSelectedTeam(teamList[0]);
    if (teamList.length === 0) setLoadingGames(false);
  };

  const loadGames = async () => {
    if (!selectedTeam) return;
    setLoadingGames(true);

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('schedule_events')
      .select('*')
      .eq('team_id', selectedTeam.id)
      .eq('event_type', 'game')
      .gte('event_date', today)
      .order('event_date')
      .order('start_time')
      .limit(20);

    const gameList = data || [];
    setGames(gameList);
    setLoadingGames(false);

    // Load lineup counts for all games
    if (gameList.length > 0) {
      loadLineupCounts(gameList.map((g: Game) => g.id));
    }
  };

  const loadLineupCounts = async (eventIds: string[]) => {
    try {
      const counts: Record<string, number> = {};
      // Query lineup counts per event
      for (const eid of eventIds) {
        const { count } = await supabase
          .from('game_lineups')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eid)
          .eq('is_starter', true);
        counts[eid] = count || 0;
      }
      setLineupCounts(counts);
    } catch (err) {
      if (__DEV__) console.error('Error loading lineup counts:', err);
    }
  };

  const loadRoster = async (teamId: string): Promise<RosterPlayer[]> => {
    const { data } = await supabase
      .from('team_players')
      .select('*, players(id, first_name, last_name, jersey_number, position, photo_url, medical_conditions, allergies, medications, emergency_contact_name, emergency_contact_phone, emergency_contact_relation)')
      .eq('team_id', teamId);

    if (data) {
      const players = data
        .map(tp => {
          const p = tp.players as any;
          if (!p) return null;
          return {
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            jersey_number: (tp as any).team_jersey || p.jersey_number,
            position: (tp as any).team_position || p.position,
            photo_url: p.photo_url,
            medical_conditions: p.medical_conditions || null,
            allergies: p.allergies || null,
            medications: p.medications || null,
            emergency_contact_name: p.emergency_contact_name || null,
            emergency_contact_phone: p.emergency_contact_phone || null,
            emergency_contact_relation: p.emergency_contact_relation || null,
          };
        })
        .filter(Boolean) as RosterPlayer[];
      players.sort((a, b) => {
        const aNum = parseInt(a.jersey_number || '99');
        const bNum = parseInt(b.jersey_number || '99');
        return aNum - bNum;
      });
      setRoster(players);
      return players;
    }
    return [];
  };

  // ============================================================================
  // GAME DAY ACTIONS
  // ============================================================================

  const startGameDay = async (game: Game) => {
    setActiveGame(game);
    setMode('live');
    setSetScores([{ our: 0, their: 0 }]);
    setCurrentSet(0);
    setPlayerStats({});
    setSelectedPlayerId(null);
    setCurrentRotation(0);
    setUndoStack([]);
    setSelectedCourtPosition(null);
    setBenchPlayers([]);
    setSubHistory([]);
    setWeAreServing(true);
    setViewingSet(null);
    const loadedRoster = await loadRoster(game.team_id);
    await loadCourtLineup(game.id, loadedRoster);
  };

  const loadCourtLineup = async (eventId: string, rosterPlayers: RosterPlayer[]) => {
    const { data } = await supabase
      .from('game_lineups')
      .select('player_id, position, rotation_order, is_starter, is_libero')
      .eq('event_id', eventId)
      .eq('is_starter', true)
      .order('rotation_order');

    if (data && data.length > 0) {
      const POSITIONS = [
        { position: 1, label: 'P1', color: '#3B82F6' },
        { position: 2, label: 'P2', color: '#10B981' },
        { position: 3, label: 'P3', color: '#F59E0B' },
        { position: 4, label: 'P4', color: '#EF4444' },
        { position: 5, label: 'P5', color: '#8B5CF6' },
        { position: 6, label: 'P6', color: '#A855F7' },
      ];
      const starterIds = new Set<string>();
      const slots: CourtSlot[] = POSITIONS.map(pos => {
        const record = data.find(r => r.rotation_order === pos.position);
        const player = record ? rosterPlayers.find(r => r.id === record.player_id) : null;
        if (player) starterIds.add(player.id);
        return {
          position: pos.position,
          label: record?.position || pos.label,
          color: pos.color,
          player: player ? {
            id: player.id,
            first_name: player.first_name,
            last_name: player.last_name,
            jersey_number: player.jersey_number,
            photo_url: player.photo_url,
          } : null,
          isLibero: record?.is_libero || false,
        };
      });
      setCourtLineup(slots);
      // Set bench players (roster members not in starting lineup)
      setBenchPlayers(rosterPlayers.filter(p => !starterIds.has(p.id)));
    } else {
      setCourtLineup([]);
      setBenchPlayers([]);
    }
  };

  const handleOurPoint = () => {
    setSetScores(prev => {
      const next = [...prev];
      next[currentSet] = { ...next[currentSet], our: next[currentSet].our + 1 };
      return next;
    });
  };

  const handleTheirPoint = () => {
    setSetScores(prev => {
      const next = [...prev];
      next[currentSet] = { ...next[currentSet], their: next[currentSet].their + 1 };
      return next;
    });
  };

  const undoOurPoint = () => {
    setSetScores(prev => {
      const next = [...prev];
      if (next[currentSet].our > 0) {
        next[currentSet] = { ...next[currentSet], our: next[currentSet].our - 1 };
      }
      return next;
    });
  };

  const undoTheirPoint = () => {
    setSetScores(prev => {
      const next = [...prev];
      if (next[currentSet].their > 0) {
        next[currentSet] = { ...next[currentSet], their: next[currentSet].their - 1 };
      }
      return next;
    });
  };

  const recordStat = (statKey: StatKey) => {
    const pid = selectedPlayerId;
    if (!pid) {
      Alert.alert('Select Player', 'Tap a player on the court or roster first.');
      return;
    }
    // Push onto undo stack
    setUndoStack(prev => [...prev, { type: 'stat', playerId: pid, statKey, setIndex: currentSet }]);

    setPlayerStats(prev => {
      const existing = prev[pid] || { kills: 0, aces: 0, blocks: 0, digs: 0, assists: 0, errors: 0 };
      return {
        ...prev,
        [pid]: { ...existing, [statKey]: existing[statKey] + 1 },
      };
    });

    // Auto-score points
    const statConfig = STAT_BUTTONS.find(s => s.key === statKey);
    if (statConfig && statConfig.points > 0) {
      handleOurPoint();
    } else if (statConfig && statConfig.points < 0) {
      handleTheirPoint();
    }

    // Deselect court position after stat
    setSelectedCourtPosition(null);
  };

  const recordOppError = () => {
    setUndoStack(prev => [...prev, { type: 'opp_error', setIndex: currentSet }]);
    handleOurPoint();
  };

  // Derived: Position 1 is always the server
  const currentServer = courtLineup.find(s => s.position === 1)?.player || null;

  const reverseRotation = () => {
    setCurrentRotation(prev => (prev - 1 + 6) % 6);
    setCourtLineup(prev => {
      if (prev.length === 0) return prev;
      return prev.map(slot => ({
        ...slot,
        position: slot.position === 6 ? 1 : slot.position + 1,
      }));
    });
  };

  const handleWonRally = () => {
    const wasServing = weAreServing;
    setUndoStack(prev => [...prev, { type: 'rally_won', wasServing, setIndex: currentSet }]);
    handleOurPoint();
    if (!wasServing) {
      // Side-out: we gain serve, rotate
      advanceRotation();
      setWeAreServing(true);
    }
  };

  const handleLostRally = () => {
    const wasServing = weAreServing;
    setUndoStack(prev => [...prev, { type: 'rally_lost', wasServing, setIndex: currentSet }]);
    handleTheirPoint();
    if (wasServing) {
      setWeAreServing(false);
    }
  };

  const handleServeError = () => {
    setUndoStack(prev => [...prev, { type: 'serve_error', setIndex: currentSet }]);
    handleTheirPoint();
    setWeAreServing(false);
  };

  const handleServeAce = () => {
    const serverId = currentServer?.id;
    setUndoStack(prev => [...prev, { type: 'serve_ace', playerId: serverId || '', setIndex: currentSet }]);
    handleOurPoint();
    if (serverId) {
      setPlayerStats(prev => {
        const existing = prev[serverId] || { kills: 0, aces: 0, blocks: 0, digs: 0, assists: 0, errors: 0 };
        return { ...prev, [serverId]: { ...existing, aces: existing.aces + 1 } };
      });
    }
  };

  const performSubstitution = (courtPos: number, benchPlayer: RosterPlayer) => {
    const courtSlot = courtLineup.find(s => s.position === courtPos);
    if (!courtSlot?.player) return;

    const outPlayer = courtSlot.player;

    // Push onto undo stack
    setUndoStack(prev => [...prev, { type: 'sub', inId: benchPlayer.id, outId: outPlayer.id, courtPos }]);
    setSubHistory(prev => [...prev, { inId: benchPlayer.id, outId: outPlayer.id, set: currentSet }]);

    // Swap court and bench
    setCourtLineup(prev => prev.map(slot => {
      if (slot.position !== courtPos) return slot;
      return {
        ...slot,
        player: {
          id: benchPlayer.id,
          first_name: benchPlayer.first_name,
          last_name: benchPlayer.last_name,
          jersey_number: benchPlayer.jersey_number,
          photo_url: benchPlayer.photo_url,
        },
      };
    }));

    // Move court player to bench, remove bench player from bench
    setBenchPlayers(prev => {
      const withoutIncoming = prev.filter(p => p.id !== benchPlayer.id);
      const outRosterPlayer = roster.find(r => r.id === outPlayer.id);
      return outRosterPlayer ? [...withoutIncoming, outRosterPlayer] : withoutIncoming;
    });

    setSelectedCourtPosition(null);
    setSelectedPlayerId(benchPlayer.id);
  };

  const handleBenchTap = (player: RosterPlayer) => {
    if (selectedCourtPosition !== null) {
      // Sub mode: court position selected, now tapping bench player completes the swap
      performSubstitution(selectedCourtPosition, player);
    } else {
      // Just select the bench player for stat recording
      setSelectedPlayerId(selectedPlayerId === player.id ? null : player.id);
    }
  };

  const getUndoDescription = (action: UndoAction): string => {
    if (action.type === 'stat') {
      const player = roster.find(r => r.id === action.playerId);
      const statLabel = STAT_BUTTONS.find(s => s.key === action.statKey)?.label || action.statKey;
      return `${statLabel} #${player?.jersey_number || '?'}`;
    }
    if (action.type === 'opp_error') return 'OPP ERR';
    if (action.type === 'sub') return 'SUB';
    if (action.type === 'rally_won') return 'WON RALLY';
    if (action.type === 'rally_lost') return 'LOST RALLY';
    if (action.type === 'serve_error') return 'SRV ERR';
    if (action.type === 'serve_ace') return 'ACE';
    return '';
  };

  const undoLast = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    if (last.type === 'stat') {
      // Reverse the stat
      setPlayerStats(prev => {
        const existing = prev[last.playerId];
        if (!existing) return prev;
        return {
          ...prev,
          [last.playerId]: { ...existing, [last.statKey]: Math.max(0, existing[last.statKey] - 1) },
        };
      });

      // Reverse the auto-score
      const statConfig = STAT_BUTTONS.find(s => s.key === last.statKey);
      if (statConfig && statConfig.points > 0) {
        undoOurPoint();
      } else if (statConfig && statConfig.points < 0) {
        undoTheirPoint();
      }
    } else if (last.type === 'opp_error') {
      undoOurPoint();
    } else if (last.type === 'sub') {
      // Reverse substitution
      const outPlayer = roster.find(r => r.id === last.outId);
      setCourtLineup(prev => prev.map(slot => {
        if (slot.position !== last.courtPos) return slot;
        return {
          ...slot,
          player: outPlayer ? {
            id: outPlayer.id,
            first_name: outPlayer.first_name,
            last_name: outPlayer.last_name,
            jersey_number: outPlayer.jersey_number,
            photo_url: outPlayer.photo_url,
          } : null,
        };
      }));
      setBenchPlayers(prev => {
        const withoutOut = prev.filter(p => p.id !== last.outId);
        const inPlayer = roster.find(r => r.id === last.inId);
        return inPlayer ? [...withoutOut, inPlayer] : withoutOut;
      });
      setSubHistory(prev => prev.slice(0, -1));
    } else if (last.type === 'rally_won') {
      undoOurPoint();
      if (!last.wasServing) {
        reverseRotation();
        setWeAreServing(false);
      }
    } else if (last.type === 'rally_lost') {
      undoTheirPoint();
      if (last.wasServing) {
        setWeAreServing(true);
      }
    } else if (last.type === 'serve_error') {
      undoTheirPoint();
      setWeAreServing(true);
    } else if (last.type === 'serve_ace') {
      undoOurPoint();
      if (last.playerId) {
        setPlayerStats(prev => {
          const existing = prev[last.playerId];
          if (!existing) return prev;
          return { ...prev, [last.playerId]: { ...existing, aces: Math.max(0, existing.aces - 1) } };
        });
      }
    }
  };

  const advanceRotation = () => {
    setCurrentRotation(prev => (prev + 1) % 6);
    // Actually rotate court positions: P2→P1, P3→P2, P4→P3, P5→P4, P6→P5, P1→P6
    setCourtLineup(prev => {
      if (prev.length === 0) return prev;
      return prev.map(slot => ({
        ...slot,
        position: slot.position === 1 ? 6 : slot.position - 1,
      }));
    });
  };

  const endSet = () => {
    const score = setScores[currentSet];
    Alert.alert(
      'End Set?',
      `Set ${currentSet + 1}: ${score.our} - ${score.their}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Set',
          onPress: () => {
            setSetScores(prev => [...prev, { our: 0, their: 0 }]);
            setCurrentSet(prev => prev + 1);
            advanceRotation();
          },
        },
      ]
    );
  };

  const endGame = () => setShowWizard(true);

  const startStatsEntry = async (game: Game) => {
    setActiveGame(game);
    await loadRoster(game.team_id);
    // Pre-load existing stats if any
    const { data: existingStats } = await supabase
      .from('game_player_stats')
      .select('*')
      .eq('event_id', game.id);
    const preloaded: Record<string, DetailedPlayerStats> = {};
    if (existingStats) {
      for (const s of existingStats) {
        preloaded[s.player_id] = {
          kills: s.kills || 0,
          aces: s.aces || 0,
          digs: s.digs || 0,
          blocks: s.blocks || 0,
          assists: s.assists || 0,
          serves: s.serves || 0,
          errors: s.service_errors || 0,
        };
      }
    }
    setDetailedStats(preloaded);
    setStatsEntryIndex(0);
    setMode('stats-entry');
  };

  const postGameRecapToWall = async (result: GameCompletionResult, game: Game) => {
    try {
      const won = result.ourScore > result.opponentScore;
      const title = won ? 'Victory!' : 'Game Complete';
      const setLine = result.setScores
        .map((s, i) => `Set ${i + 1}: ${s.our}-${s.their}`)
        .join(' | ');
      const content = `${won ? 'W' : 'L'} vs ${game.opponent_name || 'TBD'}\nFinal: ${result.ourScore}-${result.opponentScore}\n${setLine}`;

      await supabase.from('team_posts').insert({
        team_id: game.team_id,
        author_id: user?.id,
        post_type: 'game_recap',
        title,
        content,
        is_published: true,
      });
    } catch (err) {
      if (__DEV__) console.error('Failed to post game recap:', err);
    }
  };

  const handleGameComplete = async (result: GameCompletionResult) => {
    if (!activeGame || !user?.id) return;

    try {
      // Format set_scores with set_number for structured storage
      const setScoresJson = result.setScores.map((s, i) => ({
        set_number: i + 1,
        our_score: s.our,
        opponent_score: s.their,
        our: s.our,
        their: s.their,
      }));

      // Update schedule_events with wizard result
      const { error: updateError } = await supabase
        .from('schedule_events')
        .update({
          game_status: 'completed',
          our_score: result.ourScore,
          opponent_score: result.opponentScore,
          game_result: result.gameResult,
          set_scores: setScoresJson.length > 0 ? setScoresJson : null,
          period_scores: result.periodScores.length > 0 ? result.periodScores : null,
          scoring_format: result.scoringFormat,
          our_sets_won: result.ourSetsWon,
          opponent_sets_won: result.opponentSetsWon,
          point_differential: result.pointDifferential,
          stats_entered: false,
          completed_at: new Date().toISOString(),
          completed_by: user.id,
        })
        .eq('id', activeGame.id);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to save game results.');
      }

      // Save player stats from live tracking
      const statRecords = Object.entries(playerStats)
        .filter(([_, stats]) => stats.kills + stats.aces + stats.blocks + stats.digs + stats.assists + stats.errors > 0)
        .map(([playerId, stats]) => ({
          event_id: activeGame.id,
          player_id: playerId,
          team_id: activeGame.team_id,
          kills: stats.kills,
          aces: stats.aces,
          blocks: stats.blocks,
          digs: stats.digs,
          assists: stats.assists,
          service_errors: stats.errors,
          points: stats.kills + stats.aces + stats.blocks,
          created_by: user.id,
        }));

      if (statRecords.length > 0) {
        await supabase.from('game_player_stats').delete().eq('event_id', activeGame.id);
        const { error: statsError } = await supabase.from('game_player_stats').insert(statRecords);
        if (statsError) {
          if (__DEV__) console.error('Failed to save live stats:', statsError);
        }

        // Fire-and-forget achievement check for participating players
        const participatingPlayerIds = statRecords.map((r) => r.player_id);
        if (participatingPlayerIds.length > 0 && workingSeason?.id) {
          checkAndUnlockAchievements({
            playerIds: participatingPlayerIds,
            teamId: activeGame.team_id,
            gameId: activeGame.id,
            seasonId: workingSeason.id,
          }).catch((err) => { if (__DEV__) console.error('Achievement check:', err); });
        }
      }

      setShowWizard(false);
      loadGames();

      const showStatsPrompt = () => {
        const resultEmoji = result.gameResult === 'win' ? 'Victory!' : result.gameResult === 'loss' ? 'Tough loss.' : 'Tie game.';
        Alert.alert(
          `Game Saved! ${resultEmoji}`,
          `Final: ${result.ourScore} - ${result.opponentScore} (${result.gameResult.toUpperCase()})\n\nWould you like to enter detailed player stats?`,
          [
            {
              text: 'View Recap',
              onPress: () => {
                setMode('list');
                router.push(`/game-results?eventId=${activeGame.id}&teamId=${activeGame.team_id}` as any);
              },
            },
            {
              text: 'Skip',
              style: 'cancel',
              onPress: () => { setMode('list'); },
            },
            {
              text: 'Enter Stats',
              onPress: () => {
                const initial: Record<string, DetailedPlayerStats> = {};
                for (const p of roster) {
                  const live = playerStats[p.id];
                  initial[p.id] = {
                    kills: live?.kills || 0,
                    aces: live?.aces || 0,
                    digs: live?.digs || 0,
                    blocks: live?.blocks || 0,
                    assists: live?.assists || 0,
                    serves: 0,
                    errors: live?.errors || 0,
                  };
                }
                setDetailedStats(initial);
                setStatsEntryIndex(0);
                setMode('stats-entry');
              },
            },
          ]
        );
      };

      // Prompt to share game recap to team wall
      Alert.alert(
        'Share Game Recap?',
        'Post the game result to the team wall for parents and players to see.',
        [
          { text: 'Skip', style: 'cancel', onPress: showStatsPrompt },
          {
            text: 'Share',
            onPress: () => {
              postGameRecapToWall(result, activeGame);
              showStatsPrompt();
            },
          },
        ]
      );
    } catch (error: any) {
      if (__DEV__) console.error('Save game error:', error);
      Alert.alert('Save Failed', error.message || 'Could not save game results.');
    }
  };

  // ============================================================================
  // STATS ENTRY ACTIONS
  // ============================================================================

  const currentStatsPlayer = roster[statsEntryIndex] || null;

  const updateDetailedStat = (playerId: string, key: DetailedStatKey, value: string) => {
    const num = parseInt(value) || 0;
    setDetailedStats(prev => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || { kills: 0, aces: 0, digs: 0, blocks: 0, assists: 0, serves: 0, errors: 0 }),
        [key]: num,
      },
    }));
  };

  const incrementDetailedStat = (playerId: string, key: DetailedStatKey) => {
    setDetailedStats(prev => {
      const existing = prev[playerId] || { kills: 0, aces: 0, digs: 0, blocks: 0, assists: 0, serves: 0, errors: 0 };
      return {
        ...prev,
        [playerId]: { ...existing, [key]: existing[key] + 1 },
      };
    });
  };

  const decrementDetailedStat = (playerId: string, key: DetailedStatKey) => {
    setDetailedStats(prev => {
      const existing = prev[playerId] || { kills: 0, aces: 0, digs: 0, blocks: 0, assists: 0, serves: 0, errors: 0 };
      return {
        ...prev,
        [playerId]: { ...existing, [key]: Math.max(0, existing[key] - 1) },
      };
    });
  };

  const goToNextPlayer = () => {
    if (statsEntryIndex < roster.length - 1) {
      setStatsEntryIndex(prev => prev + 1);
    }
  };

  const goToPrevPlayer = () => {
    if (statsEntryIndex > 0) {
      setStatsEntryIndex(prev => prev - 1);
    }
  };

  const skipPlayer = () => {
    if (statsEntryIndex < roster.length - 1) {
      setStatsEntryIndex(prev => prev + 1);
    } else {
      // Last player, prompt to save
      saveAllDetailedStats();
    }
  };

  const saveAllDetailedStats = async () => {
    if (!activeGame || !user?.id || !workingSeason?.id) return;
    setSavingStats(true);

    try {
      const statsArray = Object.entries(detailedStats)
        .filter(([_, s]) => s.kills + s.aces + s.digs + s.blocks + s.assists + s.serves + s.errors > 0)
        .map(([playerId, s]) => ({
          event_id: activeGame.id,
          player_id: playerId,
          season_id: workingSeason!.id,
          team_id: activeGame.team_id,
          kills: s.kills,
          aces: s.aces,
          serves: s.serves,
          service_errors: s.errors,
          digs: s.digs,
          blocks: s.blocks,
          assists: s.assists,
          attacks: s.kills + s.errors,
          attack_errors: s.errors,
          receptions: 0,
          reception_errors: 0,
          block_assists: 0,
          points: s.kills + s.aces + s.blocks,
        }));

      if (statsArray.length > 0) {
        // Delete any existing stats for this game
        await supabase.from('game_player_stats').delete().eq('event_id', activeGame.id);
        await supabase.from('game_player_stats').insert(statsArray);
      }

      // Mark stats as entered
      await supabase.from('schedule_events').update({
        stats_entered: true,
        stats_entered_at: new Date().toISOString(),
        stats_entered_by: user.id,
      }).eq('id', activeGame.id);

      // Fire-and-forget achievement check for players with detailed stats
      const detailedPlayerIds = statsArray.map((r) => r.player_id);
      if (detailedPlayerIds.length > 0) {
        checkAndUnlockAchievements({
          playerIds: detailedPlayerIds,
          teamId: activeGame.team_id,
          gameId: activeGame.id,
          seasonId: workingSeason!.id,
        }).catch((err) => { if (__DEV__) console.error('Achievement check:', err); });
      }

      Alert.alert('Stats Saved!', `Saved stats for ${statsArray.length} players.`, [
        { text: 'OK', onPress: () => { setMode('list'); loadGames(); } },
      ]);
    } catch (error: any) {
      Alert.alert('Save Failed', error.message || 'Please try again.');
    } finally {
      setSavingStats(false);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  // Quick Stats Panel computed values
  const quickStats = useMemo(() => {
    let totalKills = 0, totalAces = 0, totalBlocks = 0;
    let hotPlayer = { jersey: '—', lastName: '—', total: 0 };
    Object.entries(playerStats).forEach(([pid, stats]) => {
      totalKills += stats.kills;
      totalAces += stats.aces;
      totalBlocks += stats.blocks;
      const total = stats.kills + stats.aces + stats.blocks;
      if (total > hotPlayer.total) {
        const p = roster.find(r => r.id === pid);
        hotPlayer = { jersey: p?.jersey_number || '?', lastName: p?.last_name || '?', total };
      }
    });
    return { totalKills, totalAces, totalBlocks, hotPlayer };
  }, [playerStats, roster]);

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === now.toDateString()) return 'TODAY';
    if (date.toDateString() === tomorrow.toDateString()) return 'TOMORROW';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
  };

  const formatTime = (t: string | null) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const getPlayerStatTotal = (playerId: string): number => {
    const s = playerStats[playerId];
    if (!s) return 0;
    return s.kills + s.aces + s.blocks + s.digs + s.assists;
  };

  const hasMedicalAlert = (player: RosterPlayer): boolean => {
    return !!(player.medical_conditions || player.allergies);
  };

  const ourSetScore = setScores[currentSet]?.our || 0;
  const theirSetScore = setScores[currentSet]?.their || 0;
  const totalOur = setScores.reduce((s, set) => s + set.our, 0);
  const totalTheir = setScores.reduce((s, set) => s + set.their, 0);
  const ourSetsWon = setScores.filter(s => s.our > s.their).length;
  const theirSetsWon = setScores.filter(s => s.their > s.our).length;

  // ============================================================================
  // RENDER -- STATS ENTRY MODE
  // ============================================================================

  if (mode === 'stats-entry') {
    const player = currentStatsPlayer;
    const pStats = player ? (detailedStats[player.id] || { kills: 0, aces: 0, digs: 0, blocks: 0, assists: 0, serves: 0, errors: 0 }) : null;
    const isLastPlayer = statsEntryIndex === roster.length - 1;

    return (
      <View style={[gs.container, { backgroundColor: '#0A0E1A' }]}>
        {/* Header */}
        <View style={gs.header}>
          <TouchableOpacity onPress={() => {
            Alert.alert('Exit Stats Entry?', 'Unsaved stats will be lost.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Exit', style: 'destructive', onPress: () => { setMode('list'); loadGames(); } },
            ]);
          }} style={gs.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={gs.headerTitle}>PLAYER STATS</Text>
          <View style={gs.headerBtn} />
        </View>

        {/* Progress bar */}
        <View style={gs.seProgressBar}>
          <View style={[gs.seProgressFill, { width: `${((statsEntryIndex + 1) / roster.length) * 100}%` }]} />
        </View>
        <Text style={gs.seProgressText}>
          Player {statsEntryIndex + 1} of {roster.length}
        </Text>

        {player && pStats && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {/* Player Identity */}
            <View style={gs.sePlayerHeader}>
              <View style={gs.seJersey}>
                <Text style={gs.seJerseyText}>{player.jersey_number || '—'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={gs.sePlayerName}>
                  {player.first_name} {player.last_name}
                </Text>
                {player.position && (
                  <Text style={gs.sePlayerPos}>{player.position}</Text>
                )}
              </View>
            </View>

            {/* Stat Input Grid */}
            <View style={gs.seStatGrid}>
              {DETAILED_STAT_FIELDS.map(field => (
                <View key={field.key} style={gs.seStatRow}>
                  <Text style={[gs.seStatLabel, { color: field.color }]}>{field.label}</Text>
                  <View style={gs.seStatControls}>
                    <TouchableOpacity
                      style={gs.seStatDecBtn}
                      onPress={() => decrementDetailedStat(player.id, field.key)}
                    >
                      <Ionicons name="remove" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                    <TextInput
                      style={[gs.seStatInput, { color: field.color }]}
                      value={String(pStats[field.key])}
                      onChangeText={(v) => updateDetailedStat(player.id, field.key, v)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      style={[gs.seStatIncBtn, { borderColor: field.color + '60' }]}
                      onPress={() => incrementDetailedStat(player.id, field.key)}
                    >
                      <Ionicons name="add" size={20} color={field.color} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Navigation Buttons */}
            <View style={gs.seNavButtons}>
              <TouchableOpacity
                style={[gs.seNavBtn, gs.seNavBtnSecondary, statsEntryIndex === 0 && { opacity: 0.3 }]}
                onPress={goToPrevPlayer}
                disabled={statsEntryIndex === 0}
              >
                <Ionicons name="arrow-back" size={18} color="#94A3B8" />
                <Text style={gs.seNavBtnSecondaryText}>Previous</Text>
              </TouchableOpacity>

              <TouchableOpacity style={gs.seSkipBtn} onPress={skipPlayer}>
                <Text style={gs.seSkipBtnText}>Skip</Text>
              </TouchableOpacity>

              {!isLastPlayer ? (
                <TouchableOpacity style={[gs.seNavBtn, gs.seNavBtnPrimary]} onPress={goToNextPlayer}>
                  <Text style={gs.seNavBtnPrimaryText}>Next</Text>
                  <Ionicons name="arrow-forward" size={18} color="#000" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[gs.seNavBtn, gs.seNavBtnSave]}
                  onPress={saveAllDetailedStats}
                  disabled={savingStats}
                >
                  {savingStats ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#000" />
                      <Text style={gs.seNavBtnPrimaryText}>Save All</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    );
  }

  // ============================================================================
  // RENDER -- GAME LIST
  // ============================================================================

  if (mode === 'list') {
    return (
      <View style={[gs.container, { backgroundColor: '#0A0E1A' }]}>
        {/* Header */}
        <View style={gs.header}>
          <TouchableOpacity onPress={() => router.back()} style={gs.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={gs.headerTitle}>GAME PREP</Text>
          <View style={gs.headerBtn} />
        </View>

        {/* Team Tabs */}
        {teams.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={gs.teamTabs} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {teams.map(team => (
              <TouchableOpacity
                key={team.id}
                style={[gs.teamTab, selectedTeam?.id === team.id && gs.teamTabActive]}
                onPress={() => setSelectedTeam(team)}
              >
                <Text style={[gs.teamTabText, selectedTeam?.id === team.id && gs.teamTabTextActive]}>
                  {team.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Games */}
        <ScrollView style={gs.gamesList} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {loadingGames ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : games.length === 0 ? (
            <View style={gs.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#334155" />
              <Text style={gs.emptyTitle}>No Upcoming Games</Text>
              <Text style={gs.emptySubtext}>Scheduled games will appear here</Text>
            </View>
          ) : (
            games.map(game => {
              const isCompleted = game.game_status === 'completed';
              const isToday = game.event_date === new Date().toISOString().split('T')[0];
              const lineupCount = lineupCounts[game.id] || 0;
              const hasLineup = lineupCount > 0;
              return (
                <View key={game.id}>
                  <TouchableOpacity
                    style={[gs.gameCard, isToday && gs.gameCardToday]}
                    onPress={() => {
                      if (isCompleted) {
                        router.push(`/game-results?eventId=${game.id}&teamId=${game.team_id}` as any);
                      } else {
                        startGameDay(game);
                      }
                    }}
                  >
                    <View style={gs.gameCardTop}>
                      <View style={gs.gameCardDate}>
                        <Text style={[gs.gameDateText, isToday && { color: '#FF3B3B' }]}>
                          {formatDate(game.event_date)}
                        </Text>
                        {game.start_time && (
                          <Text style={gs.gameTimeText}>{formatTime(game.start_time)}</Text>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {/* Lineup Status Badge */}
                        {hasLineup && (
                          <View style={gs.lineupBadge}>
                            <Ionicons name="people" size={10} color="#10B981" />
                            <Text style={gs.lineupBadgeText}>LINEUP SET</Text>
                          </View>
                        )}
                        {isCompleted ? (
                          <>
                            <View style={gs.completedBadge}>
                              <Text style={gs.completedBadgeText}>COMPLETED</Text>
                            </View>
                            {!game.stats_entered && (
                              <View style={gs.pendingStatsBadge}>
                                <Text style={gs.pendingStatsBadgeText}>STATS PENDING</Text>
                              </View>
                            )}
                          </>

                        ) : isToday ? (
                          <View style={gs.liveBadge}>
                            <View style={gs.liveDot} />
                            <Text style={gs.liveBadgeText}>GAME DAY</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    <Text style={gs.gameOpponent}>
                      vs {game.opponent_name || 'TBD'}
                    </Text>

                    <View style={gs.gameCardBottom}>
                      {game.location && (
                        <View style={gs.gameLocation}>
                          <Ionicons name="location" size={14} color="#64748B" />
                          <Text style={gs.gameLocationText}>{game.location}</Text>
                        </View>
                      )}
                      {game.location_type && (
                        <View style={[gs.homeBadge, game.location_type === 'home' ? gs.homeBadgeHome : gs.homeBadgeAway]}>
                          <Text style={gs.homeBadgeText}>
                            {game.location_type === 'home' ? 'HOME' : 'AWAY'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Set Lineup Button */}
                    {!isCompleted && (
                      <TouchableOpacity
                        style={gs.setLineupBtnWrap}
                        onPress={() => {
                          router.push(`/lineup-builder?eventId=${game.id}&teamId=${game.team_id}` as any);
                        }}
                      >
                        <Ionicons name="grid" size={16} color="#6366F1" />
                        <Text style={gs.setLineupBtnText}>
                          {hasLineup ? `EDIT LINEUP (${lineupCount})` : 'SET LINEUP'}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color="#6366F1" />
                      </TouchableOpacity>
                    )}

                    {!isCompleted && (
                      <View style={gs.startBtnWrap}>
                        <Text style={gs.startBtnText}>
                          {isToday ? 'START GAME DAY' : 'ENTER GAME DAY'}
                        </Text>
                        <Ionicons name="play" size={16} color={colors.primary} />
                      </View>
                    )}

                    {isCompleted && game.our_score != null && (
                      <View style={gs.scoreDisplay}>
                        <Text style={gs.finalScore}>{game.our_score} - {game.opponent_score}</Text>
                        <View style={gs.viewRecapWrap}>
                          <Ionicons name="bar-chart" size={14} color="#6366F1" />
                          <Text style={gs.viewRecapText}>VIEW RECAP</Text>
                          <Ionicons name="chevron-forward" size={14} color="#6366F1" />
                        </View>
                      </View>
                    )}

                    {isCompleted && !game.stats_entered && (
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); startStatsEntry(game); }}
                        style={gs.enterStatsBtnWrap}
                      >
                        <Ionicons name="create" size={14} color="#F59E0B" />
                        <Text style={gs.enterStatsBtnText}>ENTER STATS</Text>
                        <Ionicons name="chevron-forward" size={14} color="#F59E0B" />
                      </TouchableOpacity>
                    )}

                    {isCompleted && game.stats_entered && (
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); startStatsEntry(game); }}
                        style={gs.enterStatsBtnWrap}
                      >
                        <Ionicons name="create" size={14} color="#6366F1" />
                        <Text style={[gs.enterStatsBtnText, { color: '#6366F1' }]}>EDIT STATS</Text>
                        <Ionicons name="chevron-forward" size={14} color="#6366F1" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  }

  // ============================================================================
  // RENDER -- GAME DAY LIVE MODE
  // ============================================================================

  return (
    <View style={gs.container}>
      {/* Top Bar */}
      <View style={gs.liveHeader}>
        <TouchableOpacity onPress={() => setMode('list')} style={gs.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={gs.liveHeaderCenter}>
          <Text style={gs.liveHeaderTitle}>
            vs {activeGame?.opponent_name || 'TBD'}
          </Text>
          <Text style={gs.liveSetIndicator}>SET {currentSet + 1}</Text>
        </View>
        <View style={gs.headerRight}>
          {undoStack.length > 0 && (
            <Text style={gs.undoHint} numberOfLines={1}>
              {getUndoDescription(undoStack[undoStack.length - 1])}
            </Text>
          )}
          <TouchableOpacity onPress={undoLast} style={gs.undoLastBtn} disabled={undoStack.length === 0}>
            <Ionicons name="arrow-undo" size={18} color={undoStack.length > 0 ? '#F97316' : '#334155'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={endGame} style={gs.endGameBtn}>
            <Text style={gs.endGameBtnText}>END</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Set Navigation Tabs */}
      {setScores.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={gs.setTabsRow} contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}>
          {setScores.map((s, i) => {
            const isCompleted = i < currentSet;
            const isCurrent = i === currentSet;
            const isViewing = viewingSet === i;
            const weWon = s.our > s.their;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  gs.setTab,
                  isCompleted && (weWon ? gs.setTabWon : gs.setTabLost),
                  isCurrent && gs.setTabCurrent,
                  isViewing && gs.setTabViewing,
                ]}
                onPress={() => setViewingSet(isCompleted ? (viewingSet === i ? null : i) : null)}
              >
                <Text style={[
                  gs.setTabText,
                  isCompleted && { color: '#fff' },
                  isCurrent && { color: '#F97316' },
                ]}>
                  S{i + 1}{isCompleted ? `: ${s.our}-${s.their}` : isCurrent ? ' \u25CF' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Scoreboard */}
      <View style={gs.scoreboard}>
        {/* Our Score */}
        <View style={gs.scoreColumn}>
          <Text style={gs.teamLabel}>US</Text>
          <TouchableOpacity onPress={handleOurPoint} style={gs.scoreTouchZone}>
            <Text style={gs.bigScore}>{ourSetScore}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={undoOurPoint} style={gs.undoBtn}>
            <Ionicons name="remove-circle-outline" size={28} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Center Info */}
        <View style={gs.scoreCenter}>
          <Text style={gs.setLabel}>SET {currentSet + 1}</Text>
          <View style={gs.setHistory}>
            {setScores.slice(0, currentSet).map((s, i) => (
              <View key={i} style={gs.setHistoryItem}>
                <Text style={gs.setHistoryText}>S{i + 1}: {s.our}-{s.their}</Text>
              </View>
            ))}
          </View>
          <Text style={gs.setsWon}>{ourSetsWon} - {theirSetsWon}</Text>
          <Text style={gs.setsWonLabel}>SETS</Text>
          <TouchableOpacity onPress={endSet} style={gs.endSetBtn}>
            <Text style={gs.endSetBtnText}>END SET</Text>
          </TouchableOpacity>
        </View>

        {/* Their Score */}
        <View style={gs.scoreColumn}>
          <Text style={gs.teamLabel}>THEM</Text>
          <TouchableOpacity onPress={handleTheirPoint} style={gs.scoreTouchZone}>
            <Text style={gs.bigScore}>{theirSetScore}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={undoTheirPoint} style={gs.undoBtn}>
            <Ionicons name="remove-circle-outline" size={28} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Volleyball Court */}
      {courtLineup.length > 0 && (
        <VolleyballCourt
          lineup={courtLineup}
          selectedPosition={selectedCourtPosition}
          onPositionTap={(pos) => {
            const slot = courtLineup.find(s => s.position === pos);
            if (slot?.player) {
              setSelectedPlayerId(slot.player.id);
              setSelectedCourtPosition(pos);
            }
          }}
          rotation={currentRotation}
          onRotate={advanceRotation}
          compact
        />
      )}

      {/* Bench Players */}
      {benchPlayers.length > 0 && (
        <View style={gs.benchRow}>
          <Text style={gs.benchLabel}>
            BENCH{selectedCourtPosition !== null ? ' — TAP TO SUB IN' : ''}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, gap: 8 }}>
            {benchPlayers.map(player => {
              const isBenchSelected = selectedPlayerId === player.id;
              return (
                <TouchableOpacity
                  key={player.id}
                  onPress={() => handleBenchTap(player)}
                  style={[gs.benchSlot, isBenchSelected && gs.benchSlotActive]}
                >
                  {player.photo_url ? (
                    <Image source={{ uri: player.photo_url }} style={gs.benchPhoto} />
                  ) : (
                    <View style={gs.benchJersey}>
                      <Text style={gs.benchJerseyText}>{player.jersey_number || '—'}</Text>
                    </View>
                  )}
                  <Text style={gs.benchName} numberOfLines={1}>{player.last_name?.slice(0, 5)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Serving Indicator + Rally Buttons */}
      <View style={[gs.servingCard, weAreServing ? gs.servingCardUs : gs.servingCardThem]}>
        <View style={gs.servingHeader}>
          <Ionicons name="football" size={16} color={weAreServing ? '#10B981' : '#EF4444'} />
          <Text style={[gs.servingLabel, { color: weAreServing ? '#10B981' : '#EF4444' }]}>
            {weAreServing ? 'SERVING' : 'RECEIVING'}
          </Text>
          {weAreServing && currentServer && (
            <View style={gs.serverInfo}>
              {currentServer.photo_url ? (
                <Image source={{ uri: currentServer.photo_url }} style={gs.serverPhoto} />
              ) : (
                <View style={gs.serverJersey}>
                  <Text style={gs.serverJerseyText}>{currentServer.jersey_number || '—'}</Text>
                </View>
              )}
              <Text style={gs.serverName} numberOfLines={1}>
                #{currentServer.jersey_number} {currentServer.last_name}
              </Text>
            </View>
          )}
        </View>
        <View style={gs.rallyRow}>
          {weAreServing && (
            <>
              <TouchableOpacity style={gs.serveErrBtn} onPress={handleServeError}>
                <Ionicons name="close-circle" size={16} color="#EF4444" />
                <Text style={gs.serveErrText}>SRV ERR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={gs.aceBtn} onPress={handleServeAce}>
                <Ionicons name="star" size={16} color="#A855F7" />
                <Text style={gs.aceBtnText}>ACE</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={gs.wonRallyBtn} onPress={handleWonRally}>
            <Ionicons name="trophy" size={16} color="#000" />
            <Text style={gs.wonRallyText}>WON RALLY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={gs.lostRallyBtn} onPress={handleLostRally}>
            <Ionicons name="arrow-down" size={16} color="#fff" />
            <Text style={gs.lostRallyText}>LOST RALLY</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stat Buttons */}
      <View style={gs.statButtonsRow}>
        {STAT_BUTTONS.map(stat => (
          <TouchableOpacity
            key={stat.key}
            style={[gs.statBtn, { borderColor: stat.color + '60' }, selectedPlayerId ? {} : gs.statBtnDisabled]}
            onPress={() => recordStat(stat.key)}
          >
            <Ionicons name={stat.icon as any} size={20} color={stat.color} />
            <Text style={[gs.statBtnLabel, { color: stat.color }]}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
        {/* OPP ERR — no player selection needed */}
        <TouchableOpacity
          style={[gs.statBtn, { borderColor: '#10B98160' }]}
          onPress={recordOppError}
        >
          <Ionicons name="add-circle" size={20} color="#10B981" />
          <Text style={[gs.statBtnLabel, { color: '#10B981' }]}>OPP</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats Panel */}
      {Object.keys(playerStats).length > 0 && (
        <View style={gs.quickStatsBar}>
          <View style={gs.quickStatsTeam}>
            <Text style={gs.quickStatsLabel}>TEAM</Text>
            <View style={gs.quickStatsMini}>
              <Text style={[gs.qsMini, { color: '#FF3B3B' }]}>K:{quickStats.totalKills}</Text>
              <Text style={[gs.qsMini, { color: '#A855F7' }]}>A:{quickStats.totalAces}</Text>
              <Text style={[gs.qsMini, { color: '#F59E0B' }]}>B:{quickStats.totalBlocks}</Text>
            </View>
          </View>
          {quickStats.hotPlayer.total > 0 && (
            <View style={gs.quickStatsHot}>
              <Text style={gs.quickStatsLabel}>HOT</Text>
              <Text style={gs.quickStatsHotName}>#{quickStats.hotPlayer.jersey} {quickStats.hotPlayer.lastName}</Text>
            </View>
          )}
        </View>
      )}

      {/* Player Roster */}
      <ScrollView ref={scrollRef} style={gs.rosterScroll} contentContainerStyle={{ paddingBottom: 20 }}>
        <Text style={gs.rosterTitle}>TAP PLAYER → RECORD STAT</Text>
        {roster.map(player => {
          const isActive = selectedPlayerId === player.id;
          const pStats = playerStats[player.id];
          const statTotal = getPlayerStatTotal(player.id);
          const hasMedical = hasMedicalAlert(player);
          return (
            <TouchableOpacity
              key={player.id}
              style={[gs.playerRow, isActive && gs.playerRowActive]}
              onPress={() => setSelectedPlayerId(isActive ? null : player.id)}
            >
              {player.photo_url ? (
                <Image source={{ uri: player.photo_url }} style={gs.playerPhoto} />
              ) : (
                <View style={gs.playerJersey}>
                  <Text style={gs.playerJerseyText}>
                    {player.jersey_number || '—'}
                  </Text>
                </View>
              )}
              <View style={gs.playerInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[gs.playerName, isActive && gs.playerNameActive]}>
                    {player.first_name} {player.last_name}
                  </Text>
                  {hasMedical && (
                    <TouchableOpacity
                      onPress={() => {
                        setEmergencyPlayer(player);
                        setShowEmergencyModal(true);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
                    </TouchableOpacity>
                  )}
                </View>
                {player.position && (
                  <Text style={gs.playerPos}>{player.position}</Text>
                )}
              </View>

              {/* Mini stat counts */}
              {pStats && statTotal > 0 && (
                <View style={gs.miniStats}>
                  {pStats.kills > 0 && <Text style={[gs.miniStat, { color: '#FF3B3B' }]}>K:{pStats.kills}</Text>}
                  {pStats.aces > 0 && <Text style={[gs.miniStat, { color: '#A855F7' }]}>A:{pStats.aces}</Text>}
                  {pStats.blocks > 0 && <Text style={[gs.miniStat, { color: '#F59E0B' }]}>B:{pStats.blocks}</Text>}
                  {pStats.digs > 0 && <Text style={[gs.miniStat, { color: '#3B82F6' }]}>D:{pStats.digs}</Text>}
                  {pStats.assists > 0 && <Text style={[gs.miniStat, { color: '#10B981' }]}>As:{pStats.assists}</Text>}
                  {pStats.errors > 0 && <Text style={[gs.miniStat, { color: '#6B7280' }]}>E:{pStats.errors}</Text>}
                </View>
              )}

              {isActive && (
                <Ionicons name="radio-button-on" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Emergency Contact Modal */}
      <EmergencyContactModal
        visible={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        player={emergencyPlayer}
      />

      {/* Game Completion Wizard */}
      <GameCompletionWizard
        visible={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handleGameComplete}
        game={activeGame!}
        roster={roster}
        liveSetScores={setScores}
        livePlayerStats={playerStats}
        sportName={activeSport?.name || 'volleyball'}
      />
    </View>
  );
}

// ============================================================================
// STYLES -- Dark courtside theme, BIG touch targets, neon accents
// ============================================================================

const gs = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: '#0D1117' },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 2 },

  // Team Tabs
  teamTabs: { maxHeight: 50, backgroundColor: '#0D1117', borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  teamTab: { paddingHorizontal: 20, paddingVertical: 12, marginRight: 8, borderRadius: 8 },
  teamTabActive: { backgroundColor: '#F97316' + '25', borderBottomWidth: 2, borderBottomColor: '#F97316' },
  teamTabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  teamTabTextActive: { color: '#F97316' },

  // Game List
  gamesList: { flex: 1 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#94A3B8', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#64748B', marginTop: 4 },

  // Game Card
  gameCard: { backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  gameCardToday: { borderColor: '#FF3B3B40', backgroundColor: '#1A0D0D' },
  gameCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  gameCardDate: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gameDateText: { fontSize: 13, fontWeight: '700', color: '#94A3B8', letterSpacing: 1 },
  gameTimeText: { fontSize: 13, color: '#64748B' },
  gameOpponent: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 10 },
  gameCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gameLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  gameLocationText: { fontSize: 12, color: '#64748B' },
  homeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  homeBadgeHome: { backgroundColor: '#10B98120' },
  homeBadgeAway: { backgroundColor: '#F5660020' },
  homeBadgeText: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  completedBadge: { backgroundColor: '#10B98120', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  completedBadgeText: { fontSize: 10, fontWeight: '700', color: '#10B981', letterSpacing: 0.5 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF3B3B20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B3B' },
  liveBadgeText: { fontSize: 10, fontWeight: '700', color: '#FF3B3B', letterSpacing: 0.5 },
  // Lineup Badge & Set Lineup Button
  lineupBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  lineupBadgeText: { fontSize: 9, fontWeight: '700', color: '#10B981', letterSpacing: 0.5 },
  setLineupBtnWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, paddingVertical: 10, borderRadius: 10, backgroundColor: '#6366F115', borderWidth: 1, borderColor: '#6366F140' },
  setLineupBtnText: { fontSize: 12, fontWeight: '800', color: '#6366F1', letterSpacing: 0.5 },

  startBtnWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1E293B' },
  startBtnText: { fontSize: 14, fontWeight: '800', color: '#F97316', letterSpacing: 1 },
  scoreDisplay: { marginTop: 10, alignItems: 'center' },
  finalScore: { fontSize: 18, fontWeight: '800', color: '#64748B' },
  viewRecapWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1E293B' },
  viewRecapText: { fontSize: 12, fontWeight: '800', color: '#6366F1', letterSpacing: 0.5 },
  enterStatsBtnWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F59E0B15', borderWidth: 1, borderColor: '#F59E0B40' },
  enterStatsBtnText: { fontSize: 12, fontWeight: '800', color: '#F59E0B', letterSpacing: 0.5 },

  // ====== LIVE MODE ======
  liveHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 56, paddingBottom: 8, backgroundColor: '#0D1117' },
  liveHeaderCenter: { alignItems: 'center' },
  liveHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  liveSetIndicator: { fontSize: 12, fontWeight: '700', color: '#F97316', letterSpacing: 1, marginTop: 2 },
  endGameBtn: { backgroundColor: '#EF444430', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#EF444460' },
  endGameBtnText: { fontSize: 14, fontWeight: '800', color: '#EF4444', letterSpacing: 1 },

  // Scoreboard
  scoreboard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0D1117', borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  scoreColumn: { flex: 1, alignItems: 'center' },
  teamLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 2, marginBottom: 4 },
  scoreTouchZone: { width: 110, height: 110, borderRadius: 20, backgroundColor: 'rgba(30, 41, 59, 0.7)', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.08)', justifyContent: 'center', alignItems: 'center' },
  bigScore: { fontSize: 56, fontWeight: '900', color: '#fff' },
  undoBtn: { marginTop: 8, padding: 8 },
  scoreCenter: { width: 100, alignItems: 'center' },
  setLabel: { fontSize: 14, fontWeight: '800', color: '#F97316', letterSpacing: 1, marginBottom: 8 },
  setHistory: { gap: 2, marginBottom: 8 },
  setHistoryItem: { backgroundColor: '#1E293B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  setHistoryText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  setsWon: { fontSize: 24, fontWeight: '900', color: '#fff' },
  setsWonLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 1, marginBottom: 8 },
  endSetBtn: { backgroundColor: '#F9731620', borderWidth: 1, borderColor: '#F9731640', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  endSetBtnText: { fontSize: 11, fontWeight: '800', color: '#F97316', letterSpacing: 0.5 },

  // Stat Buttons
  statButtonsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingVertical: 6, gap: 6, backgroundColor: '#0D1117' },
  statBtn: { minWidth: 46, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12, backgroundColor: 'rgba(30, 41, 59, 0.7)', borderWidth: 1, flexGrow: 1 },
  statBtnDisabled: { opacity: 0.4 },
  statBtnLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },

  // Roster
  rosterScroll: { flex: 1, backgroundColor: '#0A0E1A' },
  rosterTitle: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', paddingVertical: 10 },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1E293B10' },
  playerRowActive: { backgroundColor: '#F9731615' },
  playerPhoto: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  playerJersey: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  playerJerseyText: { fontSize: 18, fontWeight: '900', color: '#94A3B8', textAlign: 'center' },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 16, fontWeight: '700', color: '#CBD5E1' },
  playerNameActive: { color: '#F97316' },
  playerPos: { fontSize: 12, color: '#64748B', marginTop: 2 },
  miniStats: { flexDirection: 'row', gap: 6, marginRight: 8 },
  miniStat: { fontSize: 10, fontWeight: '700' },

  // Pending Stats Badge
  pendingStatsBadge: { backgroundColor: '#F59E0B20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  pendingStatsBadgeText: { fontSize: 10, fontWeight: '700', color: '#F59E0B', letterSpacing: 0.5 },

  // Header right group
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  undoLastBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  undoHint: { fontSize: 9, fontWeight: '700', color: '#F97316', maxWidth: 60 },

  // Bench
  benchRow: { backgroundColor: '#0D1117', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  benchLabel: { fontSize: 9, fontWeight: '700', color: '#475569', letterSpacing: 1.5, textAlign: 'center', marginBottom: 4 },
  benchSlot: { alignItems: 'center', width: 52, gap: 2 },
  benchSlotActive: { opacity: 1, backgroundColor: '#F9731615', borderRadius: 8, padding: 2 },
  benchPhoto: { width: 36, height: 36, borderRadius: 18 },
  benchJersey: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  benchJerseyText: { fontSize: 14, fontWeight: '900', color: '#94A3B8' },
  benchName: { fontSize: 8, fontWeight: '700', color: '#64748B', textAlign: 'center', width: 48 },

  // Quick Stats Panel
  quickStatsBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0D1117', borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  quickStatsTeam: { flex: 1 },
  quickStatsLabel: { fontSize: 9, fontWeight: '700', color: '#475569', letterSpacing: 1, marginBottom: 2 },
  quickStatsMini: { flexDirection: 'row', gap: 8 },
  qsMini: { fontSize: 12, fontWeight: '800' },
  quickStatsHot: { alignItems: 'flex-end' },
  quickStatsHotName: { fontSize: 13, fontWeight: '800', color: '#F97316' },

  // Set Navigation Tabs
  setTabsRow: { backgroundColor: '#0D1117', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  setTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1E293B' },
  setTabWon: { backgroundColor: '#10B981' },
  setTabLost: { backgroundColor: '#EF4444' },
  setTabCurrent: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#F97316' },
  setTabViewing: { borderWidth: 2, borderColor: '#fff' },
  setTabText: { fontSize: 12, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },

  // Serving Indicator + Rally Buttons
  servingCard: { marginHorizontal: 8, marginVertical: 4, borderRadius: 12, padding: 10, backgroundColor: 'rgba(30, 41, 59, 0.7)', borderWidth: 1 },
  servingCardUs: { borderColor: '#10B98160' },
  servingCardThem: { borderColor: '#EF444460' },
  servingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  servingLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  serverInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  serverPhoto: { width: 24, height: 24, borderRadius: 12 },
  serverJersey: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  serverJerseyText: { fontSize: 10, fontWeight: '900', color: '#F97316' },
  serverName: { fontSize: 12, fontWeight: '700', color: '#CBD5E1' },
  rallyRow: { flexDirection: 'row', gap: 6 },
  serveErrBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF444440' },
  serveErrText: { fontSize: 10, fontWeight: '800', color: '#EF4444' },
  aceBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#A855F720', borderWidth: 1, borderColor: '#A855F740' },
  aceBtnText: { fontSize: 10, fontWeight: '800', color: '#A855F7' },
  wonRallyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: '#10B981' },
  wonRallyText: { fontSize: 11, fontWeight: '800', color: '#000' },
  lostRallyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: '#EF4444' },
  lostRallyText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  // ====== STATS ENTRY MODE ======
  seProgressBar: { height: 4, backgroundColor: '#1E293B', marginHorizontal: 16, borderRadius: 2, marginTop: 8 },
  seProgressFill: { height: '100%', backgroundColor: '#F97316', borderRadius: 2 },
  seProgressText: { fontSize: 12, fontWeight: '600', color: '#64748B', textAlign: 'center', marginTop: 6, marginBottom: 4 },

  sePlayerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  seJersey: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  seJerseyText: { fontSize: 26, fontWeight: '900', color: '#F97316' },
  sePlayerName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  sePlayerPos: { fontSize: 14, color: '#64748B', marginTop: 2 },

  seStatGrid: { gap: 8 },
  seStatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  seStatLabel: { fontSize: 16, fontWeight: '700', width: 80 },
  seStatControls: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  seStatDecBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  seStatInput: { width: 60, height: 44, fontSize: 28, fontWeight: '900', textAlign: 'center', backgroundColor: '#0D1117', borderRadius: 10, borderWidth: 1, borderColor: '#1E293B' },
  seStatIncBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(30, 41, 59, 0.7)', justifyContent: 'center', alignItems: 'center', borderWidth: 1 },

  seNavButtons: { flexDirection: 'row', gap: 10, marginTop: 24 },
  seNavBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, borderRadius: 14 },
  seNavBtnSecondary: { backgroundColor: '#1E293B' },
  seNavBtnSecondaryText: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },
  seNavBtnPrimary: { backgroundColor: '#F97316' },
  seNavBtnPrimaryText: { fontSize: 15, fontWeight: '800', color: '#000' },
  seNavBtnSave: { backgroundColor: '#10B981' },
  seSkipBtn: { paddingHorizontal: 16, paddingVertical: 16, justifyContent: 'center', alignItems: 'center' },
  seSkipBtnText: { fontSize: 14, fontWeight: '600', color: '#64748B', textDecorationLine: 'underline' },
});
