import { getFormationsForSport, getCourtRows, type FormationConfig } from '@/constants/formations';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { useSport } from '@/lib/sport';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

type Team = {
  id: string;
  name: string;
  color: string | null;
};

type Game = {
  id: string;
  title: string;
  opponent_name: string | null;
  event_date: string;
  start_time: string | null;
  location: string | null;
  location_type: string | null;
  game_status: string | null;
  team_id: string;
};

type RosterPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: string | null;
  position: string | null;
  photo_url: string | null;
};

type LineupSlot = {
  position: number;
  label: string;
  color: string;
  player: RosterPlayer | null;
  isLibero: boolean;
};

type GameLineupRecord = {
  id?: string;
  event_id: string;
  player_id: string;
  rotation_order: number;
  is_starter: boolean;
  is_libero: boolean;
  position: string;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COURT_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);
const COURT_HEIGHT = COURT_WIDTH * 0.7;
const SLOT_SIZE = 64;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LineupBuilderScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const { activeSport } = useSport();
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string; teamId?: string }>();

  // Sport-aware formations
  const sportName = activeSport?.name || 'volleyball';
  const formations = useMemo(() => getFormationsForSport(sportName), [sportName]);
  const isVolleyball = sportName.toLowerCase() === 'volleyball';

  // State: team selection
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(true);

  // State: game selection (when no eventId passed)
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [loadingGames, setLoadingGames] = useState(false);
  const [showGameSelector, setShowGameSelector] = useState(!params.eventId);

  // State: formation & lineup
  const [formation, setFormation] = useState<string>(formations[0]?.id || '5-1');
  const [lineup, setLineup] = useState<LineupSlot[]>([]);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // State: modals
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningPosition, setAssigningPosition] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingLineup, setLoadingLineup] = useState(false);

  // State: rotation preview
  const [showRotationPreview, setShowRotationPreview] = useState(false);
  const [previewRotation, setPreviewRotation] = useState(0);

  // State: substitutions (positionNumber -> benchPlayerId)
  const [subs, setSubs] = useState<Record<number, string>>({});
  const [showSubModal, setShowSubModal] = useState(false);
  const [subForPosition, setSubForPosition] = useState<number | null>(null);

  // State: RSVP auto-fill
  const [rsvpPlayerIds, setRsvpPlayerIds] = useState<Set<string>>(new Set());
  const [loadingRsvps, setLoadingRsvps] = useState(false);

  // State: per-set lineup management (volleyball best-of-5, others single set)
  const maxSets = isVolleyball ? 5 : 1;
  const [currentSetNum, setCurrentSetNum] = useState(1);
  const [perSetLineups, setPerSetLineups] = useState<Record<number, LineupSlot[]>>({});
  const [perSetSubs, setPerSetSubs] = useState<Record<number, Record<number, string>>>({});
  const perSetLineupsRef = useRef(perSetLineups);
  perSetLineupsRef.current = perSetLineups;
  const perSetSubsRef = useRef(perSetSubs);
  perSetSubsRef.current = perSetSubs;

  // Resolved event ID
  const eventId = params.eventId || selectedGame?.id || null;

  // Active formation config
  const activeFormation = useMemo(
    () => formations.find(f => f.id === formation) || formations[0],
    [formations, formation]
  );

  // Court row layout from formation config
  const courtRows = useMemo(
    () => activeFormation ? getCourtRows(activeFormation) : [[4, 3, 2], [5, 6, 1]],
    [activeFormation]
  );

  // Dynamic slot width based on max positions per row (prevents overflow for soccer 5-wide rows)
  const maxRowSize = useMemo(() => Math.max(...courtRows.map(r => r.length), 3), [courtRows]);
  const dynamicSlotWidth = useMemo(() => {
    const courtInnerWidth = Math.min(SCREEN_WIDTH - 32, 400) - 32; // court padding
    const gapTotal = (maxRowSize - 1) * 8;
    return Math.min(SLOT_SIZE + 36, Math.floor((courtInnerWidth - gapTotal) / maxRowSize));
  }, [maxRowSize]);

  // ============================================================================
  // INITIALIZATION — build empty lineup from formation
  // ============================================================================

  const buildEmptyLineup = useCallback((formationId: string): LineupSlot[] => {
    const config = formations.find(f => f.id === formationId) || formations[0];
    if (!config) return [];
    return config.positions.map((slot) => ({
      position: slot.position,
      label: slot.label,
      color: slot.color,
      player: null,
      isLibero: false,
    }));
  }, [formations]);

  // When sport changes, reset to first formation for that sport
  useEffect(() => {
    if (formations.length > 0 && !formations.some(f => f.id === formation)) {
      setFormation(formations[0].id);
    }
  }, [formations]);

  // When formation changes, rebuild lineup preserving assigned players
  useEffect(() => {
    setLineup((prev) => {
      const newSlots = buildEmptyLineup(formation);
      // Preserve players from previous lineup if they fit
      for (const slot of newSlots) {
        const existing = prev.find((p) => p.position === slot.position);
        if (existing?.player) {
          slot.player = existing.player;
          slot.isLibero = existing.isLibero;
        }
      }
      return newSlots;
    });
  }, [formation, buildEmptyLineup]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (user?.id) loadTeams();
  }, [user?.id, workingSeason?.id]);

  useEffect(() => {
    if (selectedTeam) {
      loadRoster(selectedTeam.id);
      if (!params.eventId) loadGames(selectedTeam.id);
    }
  }, [selectedTeam?.id]);

  // Load existing lineup when eventId is available
  useEffect(() => {
    if (eventId && roster.length > 0) {
      loadExistingLineup(eventId);
    }
  }, [eventId, roster.length]);

  const loadTeams = async () => {
    if (!user?.id) return;
    setLoadingTeams(true);

    try {
      // Get teams user coaches via team_staff
      const { data: staffData } = await supabase
        .from('team_staff')
        .select('team_id, teams(id, name, color)')
        .eq('user_id', user.id);

      let teamList: Team[] = [];

      if (staffData && staffData.length > 0) {
        teamList = staffData
          .map((s) => s.teams as any)
          .filter(Boolean)
          .map((t: any) => ({ id: t.id, name: t.name, color: t.color }));
      }

      // Fallback: if coach record exists but no team_staff, load all season teams
      if (teamList.length === 0 && workingSeason?.id) {
        const { data: coachData } = await supabase
          .from('coaches')
          .select('id')
          .eq('profile_id', user.id)
          .limit(1);

        if (coachData && coachData.length > 0) {
          const { data: allTeams } = await supabase
            .from('teams')
            .select('id, name, color')
            .eq('season_id', workingSeason.id)
            .order('name');
          if (allTeams) teamList = allTeams;
        }
      }

      setTeams(teamList);
      // If teamId param passed, select that team; otherwise first team
      if (params.teamId) {
        const match = teamList.find((t) => t.id === params.teamId);
        if (match) setSelectedTeam(match);
        else if (teamList.length > 0) setSelectedTeam(teamList[0]);
      } else if (teamList.length > 0) {
        setSelectedTeam(teamList[0]);
      }
    } catch (err) {
      if (__DEV__) console.error('Error loading teams:', err);
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadGames = async (teamId: string) => {
    setLoadingGames(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('schedule_events')
        .select('id, title, opponent_name, event_date, start_time, location, location_type, game_status, team_id')
        .eq('team_id', teamId)
        .eq('event_type', 'game')
        .neq('game_status', 'completed')
        .gte('event_date', today)
        .order('event_date')
        .order('start_time')
        .limit(20);

      setGames(data || []);
    } catch (err) {
      if (__DEV__) console.error('Error loading games:', err);
    } finally {
      setLoadingGames(false);
    }
  };

  const loadRoster = async (teamId: string) => {
    setLoadingRoster(true);
    try {
      const { data } = await supabase
        .from('team_players')
        .select('*, players(id, first_name, last_name, jersey_number, position, photo_url)')
        .eq('team_id', teamId);

      if (data) {
        const players = data
          .map((tp) => {
            const p = tp.players as any;
            if (!p) return null;
            return {
              id: p.id,
              first_name: p.first_name,
              last_name: p.last_name,
              jersey_number: (tp as any).team_jersey || p.jersey_number,
              position: (tp as any).team_position || p.position,
              photo_url: p.photo_url,
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
    } catch (err) {
      if (__DEV__) console.error('Error loading roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  const loadExistingLineup = async (evtId: string) => {
    setLoadingLineup(true);
    try {
      const { data } = await supabase
        .from('game_lineups')
        .select('*')
        .eq('event_id', evtId)
        .order('rotation_order');

      if (data && data.length > 0) {
        // Group records by set: rotation_type null = set 1, 'set_2' = set 2, etc.
        const setGroups: Record<number, GameLineupRecord[]> = {};
        for (const record of data as (GameLineupRecord & { rotation_type?: string | null })[]) {
          let setNum = 1;
          if (record.rotation_type && record.rotation_type.startsWith('set_')) {
            setNum = parseInt(record.rotation_type.replace('set_', '')) || 1;
          }
          if (!setGroups[setNum]) setGroups[setNum] = [];
          setGroups[setNum].push(record);
        }

        // Build lineup + subs for each set
        const loadedSetLineups: Record<number, LineupSlot[]> = {};
        const loadedSetSubs: Record<number, Record<number, string>> = {};
        for (const [setNumStr, records] of Object.entries(setGroups)) {
          const setNum = parseInt(setNumStr);
          const setLineup = buildEmptyLineup(formation);
          const setSubsMap: Record<number, string> = {};
          for (const record of records) {
            const slotIndex = setLineup.findIndex(s => s.position === record.rotation_order);
            if (slotIndex >= 0) {
              const player = roster.find(r => r.id === record.player_id);
              if (player) {
                setLineup[slotIndex] = {
                  ...setLineup[slotIndex],
                  player,
                  isLibero: record.is_libero,
                };
              }
            }
            // Load sub metadata
            const meta = (record as any).metadata;
            if (meta?.sub_player_id && record.rotation_order) {
              setSubsMap[record.rotation_order] = meta.sub_player_id;
            }
          }
          loadedSetLineups[setNum] = setLineup;
          loadedSetSubs[setNum] = setSubsMap;
        }

        setPerSetLineups(loadedSetLineups);
        setPerSetSubs(loadedSetSubs);

        // Load set 1 into active state
        if (loadedSetLineups[1]) {
          setLineup(loadedSetLineups[1]);
        }
        if (loadedSetSubs[1]) {
          setSubs(loadedSetSubs[1]);
        }
        setCurrentSetNum(1);
      }
    } catch (err) {
      if (__DEV__) console.error('Error loading existing lineup:', err);
    } finally {
      setLoadingLineup(false);
    }
  };

  // Load RSVP data for auto-fill
  const loadRsvpPlayers = useCallback(async (evtId: string) => {
    setLoadingRsvps(true);
    try {
      const { data } = await supabase
        .from('event_rsvps')
        .select('player_id')
        .eq('event_id', evtId)
        .eq('status', 'yes');

      if (data) {
        setRsvpPlayerIds(new Set(data.map((r: { player_id: string }) => r.player_id)));
      }
    } catch (err) {
      if (__DEV__) console.error('Error loading RSVPs:', err);
    } finally {
      setLoadingRsvps(false);
    }
  }, []);

  // Load RSVPs when eventId is available
  useEffect(() => {
    if (eventId) {
      loadRsvpPlayers(eventId);
    }
  }, [eventId, loadRsvpPlayers]);

  // Note: sub metadata is now loaded as part of loadExistingLineup (per-set)

  // ============================================================================
  // PER-SET SWITCHING
  // ============================================================================

  const switchToSet = useCallback((targetSet: number) => {
    if (targetSet === currentSetNum) return;
    // Save current set state
    setPerSetLineups(prev => ({ ...prev, [currentSetNum]: lineup.map(s => ({ ...s })) }));
    setPerSetSubs(prev => ({ ...prev, [currentSetNum]: { ...subs } }));
    // Load target set
    const targetLineup = perSetLineupsRef.current[targetSet];
    const targetSubs = perSetSubsRef.current[targetSet];
    if (targetLineup && targetLineup.length > 0) {
      setLineup(targetLineup.map(s => ({ ...s })));
    } else {
      setLineup(buildEmptyLineup(formation));
    }
    setSubs(targetSubs ? { ...targetSubs } : {});
    setCurrentSetNum(targetSet);
  }, [currentSetNum, lineup, subs, formation, buildEmptyLineup]);

  const copyToAllSets = useCallback(() => {
    Alert.alert('Copy Lineup', `Copy Set ${currentSetNum} lineup to all other sets?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Copy',
        onPress: () => {
          const currentLineup = lineup.map(s => ({ ...s }));
          const currentSubs = { ...subs };
          const newSetLineups: Record<number, LineupSlot[]> = {};
          const newSetSubs: Record<number, Record<number, string>> = {};
          for (let i = 1; i <= maxSets; i++) {
            newSetLineups[i] = currentLineup.map(s => ({ ...s }));
            newSetSubs[i] = { ...currentSubs };
          }
          setPerSetLineups(newSetLineups);
          setPerSetSubs(newSetSubs);
        },
      },
    ]);
  }, [currentSetNum, lineup, subs, maxSets]);

  // ============================================================================
  // ROTATION PREVIEW HELPERS
  // ============================================================================

  // Volleyball rotation: clockwise shift. After 1 rotation, player at P2 goes to P1, P3->P2, etc.
  // Rotation order: 1->6->5->4->3->2->1
  const getRotatedLineup = useCallback(
    (rotationCount: number): LineupSlot[] => {
      const rotationOrder = [1, 2, 3, 4, 5, 6];
      return lineup.map((slot) => {
        const posIndex = rotationOrder.indexOf(slot.position);
        // After N rotations clockwise, position X shows the player who was originally at position (X + N) % 6
        const sourceIndex = (posIndex + rotationCount) % 6;
        const sourcePosition = rotationOrder[sourceIndex];
        const sourceSlot = lineup.find((s) => s.position === sourcePosition);
        return {
          ...slot,
          player: sourceSlot?.player || null,
          isLibero: sourceSlot?.isLibero || false,
        };
      });
    },
    [lineup]
  );

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const assignedPlayerIds = useMemo(() => {
    return new Set(lineup.filter((s) => s.player).map((s) => s.player!.id));
  }, [lineup]);

  const benchPlayers = useMemo(() => {
    return roster.filter((p) => !assignedPlayerIds.has(p.id));
  }, [roster, assignedPlayerIds]);

  const availablePlayersForAssign = useMemo(() => {
    // Players not already in lineup (except the player currently in the slot being assigned)
    const currentSlotPlayer = assigningPosition
      ? lineup.find((s) => s.position === assigningPosition)?.player
      : null;

    return roster.filter((p) => {
      if (currentSlotPlayer && p.id === currentSlotPlayer.id) return true;
      return !assignedPlayerIds.has(p.id);
    });
  }, [roster, assignedPlayerIds, assigningPosition, lineup]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handlePositionTap = (position: number) => {
    setAssigningPosition(position);
    setAssignModalVisible(true);
  };

  const handleAssignPlayer = (player: RosterPlayer) => {
    if (assigningPosition === null) return;

    setLineup((prev) =>
      prev.map((slot) => {
        if (slot.position === assigningPosition) {
          return { ...slot, player, isLibero: false };
        }
        // If this player was in another slot, remove them from it
        if (slot.player?.id === player.id) {
          return { ...slot, player: null, isLibero: false };
        }
        return slot;
      })
    );

    setAssignModalVisible(false);
    setAssigningPosition(null);
  };

  const handleRemoveFromSlot = () => {
    if (assigningPosition === null) return;
    setLineup((prev) =>
      prev.map((slot) =>
        slot.position === assigningPosition
          ? { ...slot, player: null, isLibero: false }
          : slot
      )
    );
    setAssignModalVisible(false);
    setAssigningPosition(null);
  };

  const handleToggleLibero = (position: number) => {
    setLineup((prev) =>
      prev.map((slot) => {
        if (slot.position === position && slot.player) {
          return { ...slot, isLibero: !slot.isLibero };
        }
        return slot;
      })
    );
  };

  const handleClearLineup = () => {
    Alert.alert('Clear Lineup', 'Remove all players from the court?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => setLineup(buildEmptyLineup(formation)),
      },
    ]);
  };

  const handleAutoFill = () => {
    // Prioritize RSVP 'going' players if available, then remaining bench players
    const rsvpGoingBench = benchPlayers.filter((p) => rsvpPlayerIds.has(p.id));
    const otherBench = benchPlayers.filter((p) => !rsvpPlayerIds.has(p.id));
    const unassignedPlayers = rsvpPlayerIds.size > 0 ? [...rsvpGoingBench, ...otherBench] : [...benchPlayers];

    setLineup((prev) => {
      const newLineup = [...prev];
      for (let i = 0; i < newLineup.length; i++) {
        if (!newLineup[i].player && unassignedPlayers.length > 0) {
          // Try to match by position label
          const matchIdx = unassignedPlayers.findIndex((p) => {
            const playerPos = (p.position || '').toUpperCase();
            const slotLabel = newLineup[i].label.toUpperCase();
            // Match common position abbreviations
            if (slotLabel === 'S' && (playerPos.includes('SET') || playerPos === 'S')) return true;
            if (slotLabel === 'OH' && (playerPos.includes('OUTSIDE') || playerPos === 'OH')) return true;
            if (slotLabel === 'MB' && (playerPos.includes('MIDDLE') || playerPos === 'MB')) return true;
            if (slotLabel === 'OPP' && (playerPos.includes('OPP') || playerPos.includes('RIGHT') || playerPos === 'RS')) return true;
            if (slotLabel === 'H' && (playerPos.includes('HITTER') || playerPos === 'H' || playerPos === 'OH')) return true;
            return false;
          });

          if (matchIdx >= 0) {
            newLineup[i] = { ...newLineup[i], player: unassignedPlayers[matchIdx], isLibero: false };
            unassignedPlayers.splice(matchIdx, 1);
          }
        }
      }
      // Fill remaining empty with any available
      for (let i = 0; i < newLineup.length; i++) {
        if (!newLineup[i].player && unassignedPlayers.length > 0) {
          newLineup[i] = { ...newLineup[i], player: unassignedPlayers.shift()!, isLibero: false };
        }
      }
      return newLineup;
    });

    if (rsvpPlayerIds.size > 0) {
      Alert.alert('Auto-Fill', `Prioritized ${rsvpGoingBench.length} players who RSVP'd "Going".`);
    }
  };

  const handleSaveLineup = async () => {
    if (!eventId) {
      Alert.alert('No Game Selected', 'Please select a game before saving the lineup.');
      return;
    }

    const filledSlots = lineup.filter((s) => s.player);
    if (filledSlots.length === 0) {
      Alert.alert('Empty Lineup', 'Please assign at least one player to the lineup.');
      return;
    }

    setSaving(true);
    try {
      // Snapshot current set into state maps
      const allSetLineups = { ...perSetLineupsRef.current, [currentSetNum]: lineup.map(s => ({ ...s })) };
      const allSetSubs = { ...perSetSubsRef.current, [currentSetNum]: { ...subs } };

      // Delete existing lineup for this event
      await supabase.from('game_lineups').delete().eq('event_id', eventId);

      const allRecords: Record<string, any>[] = [];
      let totalStarters = 0;
      let totalSubs = 0;
      const setsWithData: number[] = [];

      for (let setNum = 1; setNum <= maxSets; setNum++) {
        const setLineup = allSetLineups[setNum];
        const setSub = allSetSubs[setNum] || {};
        if (!setLineup) continue;

        const filled = setLineup.filter(s => s.player);
        if (filled.length === 0) continue;

        setsWithData.push(setNum);
        totalStarters += filled.length;

        const rotationType = setNum === 1 ? null : `set_${setNum}`;

        for (const slot of filled) {
          const record: Record<string, any> = {
            event_id: eventId,
            player_id: slot.player!.id,
            rotation_order: slot.position,
            is_starter: true,
            is_libero: slot.isLibero,
            position: slot.label,
            rotation_type: rotationType,
          };
          if (setSub[slot.position]) {
            record.metadata = { sub_player_id: setSub[slot.position] };
            totalSubs++;
          }
          allRecords.push(record);
        }

        // Bench subs without a starter
        for (const [posNum, subPlayerId] of Object.entries(setSub)) {
          if (!filled.some(s => s.position === parseInt(posNum))) {
            allRecords.push({
              event_id: eventId,
              player_id: subPlayerId,
              rotation_order: parseInt(posNum),
              is_starter: false,
              is_libero: false,
              position: 'SUB',
              rotation_type: rotationType,
              metadata: { is_sub_for_position: parseInt(posNum) },
            });
          }
        }
      }

      if (allRecords.length > 0) {
        const { error } = await supabase.from('game_lineups').insert(allRecords);
        if (error) throw error;
      }

      const setInfo = setsWithData.length > 1 ? ` across ${setsWithData.length} sets` : '';
      Alert.alert('Lineup Saved', `${totalStarters} starters${totalSubs > 0 ? ` + ${totalSubs} subs` : ''}${setInfo} saved.`);
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectGame = (game: Game) => {
    setSelectedGame(game);
    setShowGameSelector(false);
  };

  const handleOpenSubModal = (position: number) => {
    setSubForPosition(position);
    setShowSubModal(true);
  };

  const handleAssignSub = (playerId: string) => {
    if (subForPosition === null) return;
    setSubs((prev) => ({ ...prev, [subForPosition]: playerId }));
    setShowSubModal(false);
    setSubForPosition(null);
  };

  const handleRemoveSub = (position: number) => {
    setSubs((prev) => {
      const next = { ...prev };
      delete next[position];
      return next;
    });
  };

  const handleAutoFillFromRsvp = async () => {
    if (!eventId) {
      Alert.alert('No Game Selected', 'Please select a game first.');
      return;
    }
    if (rsvpPlayerIds.size === 0) {
      Alert.alert('No RSVPs', 'No players have RSVP\'d "Going" for this event yet.');
      return;
    }

    // Filter roster to only RSVP 'going' players who are not yet assigned
    const goingPlayers = roster.filter(
      (p) => rsvpPlayerIds.has(p.id) && !assignedPlayerIds.has(p.id)
    );

    if (goingPlayers.length === 0) {
      Alert.alert('All Set', 'All RSVP\'d players are already in the lineup.');
      return;
    }

    const unassigned = [...goingPlayers];
    setLineup((prev) => {
      const newLineup = [...prev];
      for (let i = 0; i < newLineup.length; i++) {
        if (!newLineup[i].player && unassigned.length > 0) {
          // Position-match first
          const matchIdx = unassigned.findIndex((p) => {
            const playerPos = (p.position || '').toUpperCase();
            const slotLabel = newLineup[i].label.toUpperCase();
            if (slotLabel === 'S' && (playerPos.includes('SET') || playerPos === 'S')) return true;
            if (slotLabel === 'OH' && (playerPos.includes('OUTSIDE') || playerPos === 'OH')) return true;
            if (slotLabel === 'MB' && (playerPos.includes('MIDDLE') || playerPos === 'MB')) return true;
            if (slotLabel === 'OPP' && (playerPos.includes('OPP') || playerPos.includes('RIGHT') || playerPos === 'RS')) return true;
            return false;
          });
          if (matchIdx >= 0) {
            newLineup[i] = { ...newLineup[i], player: unassigned[matchIdx], isLibero: false };
            unassigned.splice(matchIdx, 1);
          }
        }
      }
      for (let i = 0; i < newLineup.length; i++) {
        if (!newLineup[i].player && unassigned.length > 0) {
          newLineup[i] = { ...newLineup[i], player: unassigned.shift()!, isLibero: false };
        }
      }
      return newLineup;
    });

    Alert.alert('RSVP Auto-Fill', `Filled ${goingPlayers.length - unassigned.length} positions from RSVP "Going" players.`);
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
    return date
      .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      .toUpperCase();
  };

  const formatTime = (t: string | null) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const getPositionInitials = (player: RosterPlayer): string => {
    return `${player.first_name.charAt(0)}${player.last_name.charAt(0)}`;
  };

  // ============================================================================
  // RENDER — GAME SELECTOR (when no eventId provided)
  // ============================================================================

  if (showGameSelector && !params.eventId) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>LINEUP BUILDER</Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Team Tabs */}
        {teams.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.teamTabs, { borderBottomColor: colors.border }]}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {teams.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={[
                  styles.teamTab,
                  selectedTeam?.id === team.id && [
                    styles.teamTabActive,
                    { backgroundColor: colors.primary + '25', borderBottomColor: colors.primary },
                  ],
                ]}
                onPress={() => setSelectedTeam(team)}
              >
                <Text
                  style={[
                    styles.teamTabText,
                    { color: colors.textMuted },
                    selectedTeam?.id === team.id && { color: colors.primary },
                  ]}
                >
                  {team.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Instruction */}
        <View style={styles.selectorHeader}>
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={[styles.selectorHeaderText, { color: colors.textSecondary }]}>
            Select a game to build lineup for
          </Text>
        </View>

        {/* Game List */}
        <ScrollView style={styles.gamesList} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {loadingTeams || loadingGames ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : games.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No Upcoming Games</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Schedule games first, then build lineups
              </Text>
            </View>
          ) : (
            games.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[
                  styles.gameCard,
                  {
                    backgroundColor: colors.glassCard,
                    borderColor: colors.glassBorder,
                  },
                ]}
                onPress={() => handleSelectGame(game)}
                activeOpacity={0.7}
              >
                <View style={styles.gameCardTop}>
                  <Text style={[styles.gameDateText, { color: colors.primary }]}>
                    {formatDate(game.event_date)}
                  </Text>
                  {game.start_time && (
                    <Text style={[styles.gameTimeText, { color: colors.textMuted }]}>
                      {formatTime(game.start_time)}
                    </Text>
                  )}
                </View>
                <Text style={[styles.gameOpponent, { color: colors.text }]}>
                  vs {game.opponent_name || 'TBD'}
                </Text>
                {game.location && (
                  <View style={styles.gameLocation}>
                    <Ionicons name="location" size={13} color={colors.textMuted} />
                    <Text style={[styles.gameLocationText, { color: colors.textMuted }]}>
                      {game.location}
                    </Text>
                  </View>
                )}
                <View style={styles.selectGameHint}>
                  <Text style={[styles.selectGameHintText, { color: colors.primary }]}>
                    TAP TO BUILD LINEUP
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // ============================================================================
  // RENDER — MAIN LINEUP BUILDER
  // ============================================================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgSecondary }]}>
        <TouchableOpacity
          onPress={() => {
            if (!params.eventId && selectedGame) {
              setShowGameSelector(true);
              setSelectedGame(null);
            } else {
              router.back();
            }
          }}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>LINEUP BUILDER</Text>
          {(selectedGame || params.eventId) && (
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {selectedGame
                ? `vs ${selectedGame.opponent_name || 'TBD'} - ${formatDate(selectedGame.event_date)}`
                : 'Game Lineup'}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleSaveLineup} style={styles.saveBtn} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>SAVE</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Team Selector */}
        {teams.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.teamTabsInline, { borderBottomColor: colors.border }]}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {teams.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={[
                  styles.teamTab,
                  selectedTeam?.id === team.id && styles.teamTabActiveInline,
                ]}
                onPress={() => setSelectedTeam(team)}
              >
                <Text
                  style={[
                    styles.teamTabText,
                    { color: colors.textMuted },
                    selectedTeam?.id === team.id && { color: '#F97316' },
                  ]}
                >
                  {team.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Formation Selector */}
        <View style={styles.formationBar}>
          <Text style={[styles.formationLabel, { color: colors.textMuted }]}>FORMATION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formationBtns}>
            {formations.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.formationBtn,
                  formation === f.id && styles.formationBtnActive,
                ]}
                onPress={() => setFormation(f.id)}
              >
                <Text
                  style={[
                    styles.formationBtnText,
                    formation === f.id && styles.formationBtnTextActive,
                  ]}
                >
                  {f.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Set Tabs (volleyball best-of-5) */}
        {maxSets > 1 && (
          <View style={styles.setTabBar}>
            {Array.from({ length: maxSets }, (_, i) => i + 1).map((setNum) => (
              <TouchableOpacity
                key={setNum}
                style={[
                  styles.setTab,
                  currentSetNum === setNum && styles.setTabActive,
                ]}
                onPress={() => switchToSet(setNum)}
              >
                <Text
                  style={[
                    styles.setTabText,
                    currentSetNum === setNum && styles.setTabTextActive,
                  ]}
                >
                  S{setNum}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.copyAllBtn} onPress={copyToAllSets}>
              <Ionicons name="copy-outline" size={14} color="#6366F1" />
              <Text style={styles.copyAllBtnText}>COPY ALL</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Court Visualization */}
        <View style={styles.courtContainer}>
          <View style={styles.courtCard}>
            {/* Net indicator (volleyball/basketball) or field header (soccer) */}
            {activeFormation?.courtType !== 'soccer' && (
              <View style={styles.netLine}>
                <View style={styles.netDash} />
                <Text style={styles.netLabel}>
                  {activeFormation?.courtType === 'basketball' ? 'BASKET' : 'NET'}
                </Text>
                <View style={styles.netDash} />
              </View>
            )}

            {/* Dynamic court rows from formation config */}
            {courtRows.map((rowPositions, rowIdx) => (
              <React.Fragment key={rowIdx}>
                {rowIdx > 0 && <View style={styles.midCourtLine} />}
                <View style={styles.courtRow}>
                  {rowPositions.map((pos) => {
                    const slot = lineup.find((s) => s.position === pos);
                    if (!slot) return null;
                    return (
                      <TouchableOpacity
                        key={pos}
                        style={[
                          styles.positionSlot,
                          {
                            width: dynamicSlotWidth,
                            borderColor: slot.color + '80',
                            backgroundColor: slot.player ? slot.color + '20' : colors.bgSecondary,
                          },
                          slot.isLibero && styles.positionSlotLibero,
                        ]}
                        onPress={() => handlePositionTap(pos)}
                        onLongPress={() => slot.player && handleToggleLibero(pos)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.positionLabel, { color: slot.color }]}>
                          P{pos} - {slot.label}
                        </Text>
                        {slot.player ? (
                          <View style={styles.assignedPlayerInfo}>
                            <View style={[styles.playerDot, { backgroundColor: slot.color }]}>
                              <Text style={styles.playerDotText}>
                                {slot.player.jersey_number || getPositionInitials(slot.player)}
                              </Text>
                            </View>
                            <Text style={styles.assignedName} numberOfLines={1}>
                              {slot.player.first_name.charAt(0)}. {slot.player.last_name}
                            </Text>
                            {slot.isLibero && (
                              <View style={styles.liberoBadge}>
                                <Text style={styles.liberoBadgeText}>L</Text>
                              </View>
                            )}
                          </View>
                        ) : (
                          <Text style={styles.tapToAssign}>TAP TO{'\n'}ASSIGN</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </React.Fragment>
            ))}

            {/* Serving area indicator (volleyball only) */}
            {isVolleyball && (
              <View style={styles.serveArea}>
                <Ionicons name="arrow-up-circle" size={14} color="#64748B" />
                <Text style={styles.serveAreaText}>SERVICE ZONE (P1)</Text>
              </View>
            )}
          </View>

          {/* Long-press hint (volleyball only — libero is volleyball concept) */}
          {isVolleyball && (
            <Text style={styles.longPressHint}>
              Long-press a player to toggle Libero
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleAutoFill}>
            <Ionicons name="flash" size={18} color="#F59E0B" />
            <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>AUTO-FILL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleClearLineup}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>CLEAR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSave]}
            onPress={handleSaveLineup}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#000" />
                <Text style={[styles.actionBtnText, { color: '#000' }]}>SAVE</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* RSVP Auto-Fill Button */}
        {eventId && rsvpPlayerIds.size > 0 && (
          <View style={styles.rsvpAutoFillWrap}>
            <TouchableOpacity
              style={styles.rsvpAutoFillBtn}
              onPress={handleAutoFillFromRsvp}
              disabled={loadingRsvps}
            >
              <Ionicons name="people" size={18} color="#10B981" />
              <Text style={styles.rsvpAutoFillText}>
                AUTO-FILL FROM RSVP ({rsvpPlayerIds.size} going)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rotation Preview (volleyball only — rotations are a volleyball concept) */}
        {isVolleyball && (
          <View style={styles.rotationSection}>
            <TouchableOpacity
              style={styles.rotationToggle}
              onPress={() => setShowRotationPreview(!showRotationPreview)}
            >
              <Ionicons name="sync" size={18} color="#6366F1" />
              <Text style={styles.rotationToggleText}>
                {showRotationPreview ? 'HIDE ROTATION PREVIEW' : 'ROTATION PREVIEW'}
              </Text>
              <Ionicons
                name={showRotationPreview ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#6366F1"
              />
            </TouchableOpacity>

            {showRotationPreview && (
              <View style={styles.rotationPreviewContainer}>
                {/* Rotation Navigation */}
                <View style={styles.rotationNav}>
                  <TouchableOpacity
                    style={styles.rotationNavBtn}
                    onPress={() => setPreviewRotation((prev) => (prev - 1 + 6) % 6)}
                  >
                    <Ionicons name="chevron-back" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                  <View style={styles.rotationNavCenter}>
                    <Text style={styles.rotationNavLabel}>
                      ROTATION {previewRotation + 1} / 6
                    </Text>
                    {previewRotation > 0 && (
                      <TouchableOpacity onPress={() => setPreviewRotation(0)}>
                        <Text style={styles.rotationResetText}>Reset</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.rotationNavBtn}
                    onPress={() => setPreviewRotation((prev) => (prev + 1) % 6)}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* All 6 Rotations Mini-View */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rotationScrollContent}
                >
                  {[0, 1, 2, 3, 4, 5].map((rotIdx) => {
                    const rotatedLineup = getRotatedLineup(rotIdx);
                    const isActive = rotIdx === previewRotation;
                    return (
                      <TouchableOpacity
                        key={rotIdx}
                        style={[
                          styles.rotationMiniCard,
                          isActive && styles.rotationMiniCardActive,
                        ]}
                        onPress={() => setPreviewRotation(rotIdx)}
                      >
                        <Text
                          style={[
                            styles.rotationMiniTitle,
                            isActive && styles.rotationMiniTitleActive,
                          ]}
                        >
                          R{rotIdx + 1}
                        </Text>
                        {/* Mini court: front row */}
                        <View style={styles.rotationMiniRow}>
                          {courtRows[0]?.map((pos) => {
                            const slot = rotatedLineup.find((s) => s.position === pos);
                            return (
                              <View key={pos} style={[styles.rotationMiniSlot, { borderColor: slot?.color || '#334155' }]}>
                                <Text style={styles.rotationMiniSlotText}>
                                  {slot?.player
                                    ? slot.player.jersey_number || slot.player.first_name.charAt(0)
                                    : '-'}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                        {/* Mini court: back row */}
                        <View style={styles.rotationMiniRow}>
                          {courtRows[1]?.map((pos) => {
                            const slot = rotatedLineup.find((s) => s.position === pos);
                            return (
                              <View key={pos} style={[styles.rotationMiniSlot, { borderColor: slot?.color || '#334155' }]}>
                                <Text style={styles.rotationMiniSlotText}>
                                  {slot?.player
                                    ? slot.player.jersey_number || slot.player.first_name.charAt(0)
                                    : '-'}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                        {/* Serve indicator */}
                        {rotIdx === 0 && (
                          <Text style={styles.rotationServeLabel}>SERVE</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Substitution Management */}
        {lineup.some((s) => s.player) && (
          <View style={styles.subsSection}>
            <View style={styles.subsHeader}>
              <Ionicons name="swap-horizontal" size={18} color="#F59E0B" />
              <Text style={styles.subsTitle}>SUBSTITUTIONS</Text>
            </View>
            <Text style={styles.subsDescription}>
              Designate a bench player to sub in for each starter
            </Text>
            {lineup
              .filter((slot) => slot.player)
              .map((slot) => {
                const subPlayerId = subs[slot.position];
                const subPlayer = subPlayerId ? roster.find((p) => p.id === subPlayerId) : null;
                return (
                  <View key={slot.position} style={styles.subRow}>
                    <View style={[styles.subPositionBadge, { backgroundColor: slot.color }]}>
                      <Text style={styles.subPositionText}>P{slot.position}</Text>
                    </View>
                    <View style={styles.subStarterInfo}>
                      <Text style={styles.subStarterName} numberOfLines={1}>
                        #{slot.player!.jersey_number || '?'} {slot.player!.first_name}
                      </Text>
                      <Text style={styles.subStarterLabel}>{slot.label}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#475569" />
                    {subPlayer ? (
                      <TouchableOpacity
                        style={styles.subAssignedWrap}
                        onPress={() => handleRemoveSub(slot.position)}
                      >
                        <Text style={styles.subAssignedName} numberOfLines={1}>
                          #{subPlayer.jersey_number || '?'} {subPlayer.first_name}
                        </Text>
                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.subAssignBtn}
                        onPress={() => handleOpenSubModal(slot.position)}
                      >
                        <Text style={styles.subAssignBtnText}>Set Sub</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
          </View>
        )}

        {/* Bench Section */}
        <View style={styles.benchSection}>
          <View style={styles.benchHeader}>
            <Ionicons name="people" size={18} color="#64748B" />
            <Text style={styles.benchTitle}>BENCH</Text>
            <Text style={styles.benchCount}>{benchPlayers.length} players</Text>
          </View>

          {loadingRoster ? (
            <ActivityIndicator color="#F97316" style={{ marginTop: 20 }} />
          ) : benchPlayers.length === 0 ? (
            <View style={styles.benchEmpty}>
              <Text style={styles.benchEmptyText}>
                {roster.length === 0 ? 'No players on roster' : 'All players assigned'}
              </Text>
            </View>
          ) : (
            <View style={styles.benchGrid}>
              {benchPlayers.map((player) => (
                <View key={player.id} style={styles.benchPlayer}>
                  {player.photo_url ? (
                    <Image source={{ uri: player.photo_url }} style={styles.benchPhoto} />
                  ) : (
                    <View style={styles.benchJersey}>
                      <Text style={styles.benchJerseyText}>
                        {player.jersey_number || '--'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.benchPlayerName} numberOfLines={1}>
                    {player.first_name.charAt(0)}. {player.last_name}
                  </Text>
                  {player.position && (
                    <Text style={styles.benchPlayerPos}>{player.position}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Loading overlay */}
      {loadingLineup && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading lineup...</Text>
        </View>
      )}

      {/* Player Assignment Modal */}
      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.assignModal}>
            {/* Modal Header */}
            <View style={styles.assignModalHeader}>
              <View>
                <Text style={styles.assignModalTitle}>
                  ASSIGN TO P{assigningPosition}
                </Text>
                {assigningPosition && (
                  <Text style={styles.assignModalSubtitle}>
                    {lineup.find((s) => s.position === assigningPosition)?.label || ''} Position
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setAssignModalVisible(false);
                  setAssigningPosition(null);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Remove from slot button */}
            {assigningPosition &&
              lineup.find((s) => s.position === assigningPosition)?.player && (
                <TouchableOpacity style={styles.removeSlotBtn} onPress={handleRemoveFromSlot}>
                  <Ionicons name="remove-circle" size={20} color="#EF4444" />
                  <Text style={styles.removeSlotBtnText}>REMOVE FROM POSITION</Text>
                </TouchableOpacity>
              )}

            {/* Player List */}
            <FlatList
              data={availablePlayersForAssign}
              keyExtractor={(item) => item.id}
              style={styles.assignList}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={styles.assignEmpty}>
                  <Text style={styles.assignEmptyText}>No available players</Text>
                </View>
              }
              renderItem={({ item: player }) => {
                const isCurrentlyInSlot =
                  assigningPosition != null &&
                  lineup.find((s) => s.position === assigningPosition)?.player?.id === player.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.assignPlayerRow,
                      isCurrentlyInSlot && styles.assignPlayerRowCurrent,
                    ]}
                    onPress={() => handleAssignPlayer(player)}
                    activeOpacity={0.7}
                  >
                    {player.photo_url ? (
                      <Image source={{ uri: player.photo_url }} style={styles.assignPhoto} />
                    ) : (
                      <View style={styles.assignJersey}>
                        <Text style={styles.assignJerseyText}>
                          {player.jersey_number || '--'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.assignPlayerInfo}>
                      <Text style={styles.assignPlayerName}>
                        {player.first_name} {player.last_name}
                      </Text>
                      {player.position && (
                        <Text style={styles.assignPlayerPos}>{player.position}</Text>
                      )}
                    </View>
                    {isCurrentlyInSlot ? (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>CURRENT</Text>
                      </View>
                    ) : (
                      <Ionicons name="add-circle" size={24} color="#F97316" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Substitution Assignment Modal */}
      <Modal visible={showSubModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.assignModal}>
            <View style={styles.assignModalHeader}>
              <View>
                <Text style={styles.assignModalTitle}>
                  SET SUB FOR P{subForPosition}
                </Text>
                <Text style={styles.assignModalSubtitle}>
                  Choose a bench player to substitute in
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowSubModal(false);
                  setSubForPosition(null);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={benchPlayers.filter(
                (p) => !Object.values(subs).includes(p.id) || subs[subForPosition || 0] === p.id
              )}
              keyExtractor={(item) => item.id}
              style={styles.assignList}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={styles.assignEmpty}>
                  <Text style={styles.assignEmptyText}>No bench players available</Text>
                </View>
              }
              renderItem={({ item: player }) => (
                <TouchableOpacity
                  style={styles.assignPlayerRow}
                  onPress={() => handleAssignSub(player.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.assignJersey}>
                    <Text style={styles.assignJerseyText}>
                      {player.jersey_number || '--'}
                    </Text>
                  </View>
                  <View style={styles.assignPlayerInfo}>
                    <Text style={styles.assignPlayerName}>
                      {player.first_name} {player.last_name}
                    </Text>
                    {player.position && (
                      <Text style={styles.assignPlayerPos}>{player.position}</Text>
                    )}
                  </View>
                  <Ionicons name="swap-horizontal" size={24} color="#F59E0B" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // ── Container & Header ──
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#0D1117',
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  saveBtn: {
    backgroundColor: '#F97316',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 1,
  },

  // ── Team Tabs ──
  teamTabs: {
    maxHeight: 50,
    backgroundColor: '#0D1117',
    borderBottomWidth: 1,
  },
  teamTabsInline: {
    maxHeight: 48,
    borderBottomWidth: 1,
  },
  teamTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
  },
  teamTabActive: {
    borderBottomWidth: 2,
  },
  teamTabActiveInline: {
    backgroundColor: '#F9731625',
    borderBottomWidth: 2,
    borderBottomColor: '#F97316',
  },
  teamTabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Game Selector ──
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  selectorHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  gamesList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  gameCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  gameCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  gameDateText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  gameTimeText: {
    fontSize: 13,
  },
  gameOpponent: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  gameLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  gameLocationText: {
    fontSize: 12,
  },
  selectGameHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  selectGameHintText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // ── Main Scroll ──
  mainScroll: {
    flex: 1,
  },

  // ── Formation Bar ──
  formationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  formationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  formationBtns: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  formationBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  formationBtnActive: {
    backgroundColor: '#F9731625',
    borderColor: '#F97316',
  },
  formationBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  formationBtnTextActive: {
    color: '#F97316',
  },

  // ── Set Tab Bar ──
  setTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  setTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#131924',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  setTabActive: {
    backgroundColor: '#F9731625',
    borderColor: '#F97316',
  },
  setTabText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  setTabTextActive: {
    color: '#F97316',
  },
  copyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#6366F115',
    borderWidth: 1,
    borderColor: '#6366F140',
  },
  copyAllBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 0.5,
  },

  // ── Court Visualization ──
  courtContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    alignItems: 'center',
  },
  courtCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  netLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  netDash: {
    flex: 1,
    height: 2,
    backgroundColor: '#F97316',
    borderRadius: 1,
    opacity: 0.6,
  },
  netLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: 2,
    opacity: 0.8,
  },
  courtRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  midCourtLine: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 6,
    opacity: 0.4,
  },
  positionSlot: {
    width: SLOT_SIZE + 36,
    minHeight: SLOT_SIZE + 30,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
  },
  positionSlotLibero: {
    borderStyle: 'dashed',
    borderWidth: 2,
  },
  positionLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  assignedPlayerInfo: {
    alignItems: 'center',
    gap: 3,
  },
  playerDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerDotText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
  },
  assignedName: {
    fontSize: 9,
    fontWeight: '600',
    color: '#CBD5E1',
    textAlign: 'center',
    maxWidth: SLOT_SIZE + 28,
  },
  tapToAssign: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 12,
  },
  liberoBadge: {
    backgroundColor: '#A855F7',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -4,
    right: -4,
  },
  liberoBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
  },
  serveArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 8,
    opacity: 0.5,
  },
  serveAreaText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  longPressHint: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // ── Action Bar ──
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#131924',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  actionBtnSave: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Bench Section ──
  benchSection: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  benchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  benchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  benchCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  benchEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  benchEmptyText: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
  },
  benchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  benchPlayer: {
    width: '30%',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  benchPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 6,
  },
  benchJersey: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  benchJerseyText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#94A3B8',
  },
  benchPlayerName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#CBD5E1',
    textAlign: 'center',
  },
  benchPlayerPos: {
    fontSize: 9,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },

  // ── Loading Overlay ──
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 14, 26, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },

  // ── Assignment Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  assignModal: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 0,
  },
  assignModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  assignModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  assignModalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginHorizontal: 24,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444440',
  },
  removeSlotBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  assignList: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  assignEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  assignEmptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  assignPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B20',
    borderRadius: 10,
    marginBottom: 4,
  },
  assignPlayerRowCurrent: {
    backgroundColor: '#F9731615',
    borderWidth: 1,
    borderColor: '#F9731640',
  },
  assignPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
  },
  assignJersey: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  assignJerseyText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#94A3B8',
  },
  assignPlayerInfo: {
    flex: 1,
  },
  assignPlayerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  assignPlayerPos: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  currentBadge: {
    backgroundColor: '#F9731625',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F97316',
    letterSpacing: 0.5,
  },

  // ── RSVP Auto-Fill ──
  rsvpAutoFillWrap: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  rsvpAutoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#10B98115',
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  rsvpAutoFillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },

  // ── Rotation Preview ──
  rotationSection: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  rotationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  rotationToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 0.5,
  },
  rotationPreviewContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
  },
  rotationNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  rotationNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotationNavCenter: {
    alignItems: 'center',
  },
  rotationNavLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 1,
  },
  rotationResetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  rotationScrollContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  rotationMiniCard: {
    width: 100,
    backgroundColor: '#131924',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  rotationMiniCardActive: {
    borderColor: '#6366F1',
    backgroundColor: '#6366F115',
  },
  rotationMiniTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 6,
  },
  rotationMiniTitleActive: {
    color: '#6366F1',
  },
  rotationMiniRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  rotationMiniSlot: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D1117',
  },
  rotationMiniSlotText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  rotationServeLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // ── Substitution Management ──
  subsSection: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  subsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  subsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 1.5,
  },
  subsDescription: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  subPositionBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subPositionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  subStarterInfo: {
    flex: 1,
    minWidth: 0,
  },
  subStarterName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  subStarterLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  subAssignedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F59E0B15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  subAssignedName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    maxWidth: 80,
  },
  subAssignBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  subAssignBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
});
