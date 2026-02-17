import EmergencyContactModal from '@/components/EmergencyContactModal';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  const router = useRouter();

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
  const [showEndModal, setShowEndModal] = useState(false);

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
      console.error('Error loading lineup counts:', err);
    }
  };

  const loadRoster = async (teamId: string) => {
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
    }
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
    await loadRoster(game.team_id);
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
    if (!selectedPlayerId) {
      Alert.alert('Select Player', 'Tap a player name first, then record a stat.');
      return;
    }
    setPlayerStats(prev => {
      const existing = prev[selectedPlayerId] || { kills: 0, aces: 0, blocks: 0, digs: 0, assists: 0, errors: 0 };
      return {
        ...prev,
        [selectedPlayerId]: { ...existing, [statKey]: existing[statKey] + 1 },
      };
    });

    // Auto-score points
    const statConfig = STAT_BUTTONS.find(s => s.key === statKey);
    if (statConfig && statConfig.points > 0) {
      handleOurPoint();
    } else if (statConfig && statConfig.points < 0) {
      handleTheirPoint();
    }
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
          },
        },
      ]
    );
  };

  const endGame = () => setShowEndModal(true);

  const saveGameResults = async () => {
    if (!activeGame || !user?.id) return;
    setSaving(true);

    try {
      // Filter out empty last set (e.g., new set started but no points scored)
      const finalSets = setScores.filter(s => s.our > 0 || s.their > 0);

      // Calculate totals from played sets only
      const ourTotal = finalSets.reduce((s, set) => s + set.our, 0);
      const theirTotal = finalSets.reduce((s, set) => s + set.their, 0);
      const ourSetsWonCount = finalSets.filter(s => s.our > s.their).length;
      const theirSetsWonCount = finalSets.filter(s => s.their > s.our).length;

      // Determine game result: for volleyball, based on sets won
      const gameResult: 'win' | 'loss' | 'tie' =
        ourSetsWonCount > theirSetsWonCount ? 'win' :
        ourSetsWonCount < theirSetsWonCount ? 'loss' : 'tie';

      // Format set_scores with set_number for structured storage
      const setScoresJson = finalSets.map((s, i) => ({
        set_number: i + 1,
        our_score: s.our,
        opponent_score: s.their,
        our: s.our,
        their: s.their,
      }));

      // Update schedule_events with all required fields
      const { error: updateError } = await supabase
        .from('schedule_events')
        .update({
          game_status: 'completed',
          our_score: ourTotal,
          opponent_score: theirTotal,
          game_result: gameResult,
          set_scores: setScoresJson,
          our_sets_won: ourSetsWonCount,
          opponent_sets_won: theirSetsWonCount,
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
          console.error('Failed to save live stats:', statsError);
          // Don't throw - game completion is the priority, stats can be re-entered
        }
      }

      setShowEndModal(false);

      // Refresh game list immediately so list view reflects completion
      loadGames();

      // Show success feedback and prompt for detailed stats entry
      const resultEmoji = gameResult === 'win' ? 'Victory!' : gameResult === 'loss' ? 'Tough loss.' : 'Tie game.';
      Alert.alert(
        `Game Saved! ${resultEmoji}`,
        `Final: ${ourTotal} - ${theirTotal} (${gameResult.toUpperCase()})\nSets: ${ourSetsWonCount} - ${theirSetsWonCount}\n\nWould you like to enter detailed player stats?`,
        [
          {
            text: 'Skip',
            style: 'cancel',
            onPress: () => { setMode('list'); },
          },
          {
            text: 'Enter Stats',
            onPress: () => {
              // Initialize detailed stats from live stats or empty
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
    } catch (error: any) {
      console.error('Save game error:', error);
      Alert.alert('Save Failed', error.message || 'Could not save game results. Please check your connection and try again.');
    } finally {
      setSaving(false);
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
          schedule_event_id: activeGame.id,
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
        await supabase.from('game_player_stats').delete().eq('schedule_event_id', activeGame.id);
        await supabase.from('game_player_stats').insert(statsArray);
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
                    onPress={() => !isCompleted && startGameDay(game)}
                    disabled={isCompleted}
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
                          <View style={gs.completedBadge}>
                            <Text style={gs.completedBadgeText}>COMPLETED</Text>
                          </View>
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
                      </View>
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
        <TouchableOpacity onPress={endGame} style={gs.endGameBtn}>
          <Text style={gs.endGameBtnText}>END</Text>
        </TouchableOpacity>
      </View>

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
      </View>

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
              <View style={gs.playerJersey}>
                <Text style={gs.playerJerseyText}>
                  {player.jersey_number || '—'}
                </Text>
              </View>
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

      {/* End Game Modal */}
      <Modal visible={showEndModal} transparent animationType="fade">
        <View style={gs.modalOverlay}>
          <View style={gs.endModal}>
            <Text style={gs.endModalTitle}>END GAME</Text>

            {/* Final score summary */}
            <View style={gs.endScoreWrap}>
              <Text style={gs.endScoreUs}>{totalOur}</Text>
              <Text style={gs.endScoreDash}>—</Text>
              <Text style={gs.endScoreThem}>{totalTheir}</Text>
            </View>
            <Text style={gs.endSetsText}>Sets: {ourSetsWon} - {theirSetsWon}</Text>

            {/* Set breakdown */}
            {setScores.filter(s => s.our > 0 || s.their > 0).map((s, i) => (
              <Text key={i} style={gs.endSetLine}>
                Set {i + 1}: {s.our} - {s.their} {s.our > s.their ? '✓' : ''}
              </Text>
            ))}

            {/* Top performers */}
            {Object.keys(playerStats).length > 0 && (
              <View style={gs.topPerformers}>
                <Text style={gs.topPerfTitle}>TOP PERFORMERS</Text>
                {Object.entries(playerStats)
                  .sort(([, a], [, b]) => (b.kills + b.aces + b.blocks) - (a.kills + a.aces + a.blocks))
                  .slice(0, 3)
                  .map(([pid, stats]) => {
                    const p = roster.find(r => r.id === pid);
                    if (!p) return null;
                    return (
                      <View key={pid} style={gs.topPerfRow}>
                        <Text style={gs.topPerfName}>#{p.jersey_number || '?'} {p.last_name}</Text>
                        <Text style={gs.topPerfStats}>
                          {stats.kills}K {stats.aces}A {stats.blocks}B {stats.digs}D
                        </Text>
                      </View>
                    );
                  })}
              </View>
            )}

            <View style={gs.endModalButtons}>
              <TouchableOpacity style={gs.endModalCancel} onPress={() => setShowEndModal(false)}>
                <Text style={gs.endModalCancelText}>Continue Playing</Text>
              </TouchableOpacity>
              <TouchableOpacity style={gs.endModalSave} onPress={saveGameResults} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={gs.endModalSaveText}>SAVE & FINISH</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  statButtonsRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 10, gap: 6, backgroundColor: '#0D1117' },
  statBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(30, 41, 59, 0.7)', borderWidth: 1 },
  statBtnDisabled: { opacity: 0.4 },
  statBtnLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },

  // Roster
  rosterScroll: { flex: 1, backgroundColor: '#0A0E1A' },
  rosterTitle: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', paddingVertical: 10 },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1E293B10' },
  playerRowActive: { backgroundColor: '#F9731615' },
  playerJersey: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  playerJerseyText: { fontSize: 18, fontWeight: '900', color: '#94A3B8' },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 16, fontWeight: '700', color: '#CBD5E1' },
  playerNameActive: { color: '#F97316' },
  playerPos: { fontSize: 12, color: '#64748B', marginTop: 2 },
  miniStats: { flexDirection: 'row', gap: 6, marginRight: 8 },
  miniStat: { fontSize: 10, fontWeight: '700' },

  // End Game Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  endModal: { backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 24, padding: 24, width: '100%', maxWidth: 380, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  endModalTitle: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 2, marginBottom: 16 },
  endScoreWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 },
  endScoreUs: { fontSize: 48, fontWeight: '900', color: '#10B981' },
  endScoreDash: { fontSize: 36, fontWeight: '300', color: '#64748B' },
  endScoreThem: { fontSize: 48, fontWeight: '900', color: '#EF4444' },
  endSetsText: { fontSize: 14, fontWeight: '700', color: '#94A3B8', textAlign: 'center', marginBottom: 16 },
  endSetLine: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 4 },
  topPerformers: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1E293B' },
  topPerfTitle: { fontSize: 12, fontWeight: '700', color: '#F97316', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  topPerfRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  topPerfName: { fontSize: 14, fontWeight: '700', color: '#CBD5E1' },
  topPerfStats: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  endModalButtons: { marginTop: 20, gap: 10 },
  endModalCancel: { padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#1E293B' },
  endModalCancelText: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },
  endModalSave: { padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: '#F97316' },
  endModalSaveText: { fontSize: 16, fontWeight: '800', color: '#000', letterSpacing: 1 },

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
