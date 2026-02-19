import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

// Import dashboard components
import AdminDashboard from './AdminDashboard';
import ChildPickerScreen, { type ChildPlayer } from './ChildPickerScreen';
import CoachDashboard from './CoachDashboard';
import CoachParentDashboard from './CoachParentDashboard';
import ParentDashboard from './ParentDashboard';
import PlayerDashboard from './PlayerDashboard';

const LAST_CHILD_KEY = 'vb_player_last_child_id';

type DashboardType = 'admin' | 'coach' | 'parent' | 'coach_parent' | 'player' | 'loading';

export default function DashboardRouter() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const permissions = usePermissions();
  const { workingSeason } = useSeason();

  // Extract what we need, with fallbacks
  const isAdmin = permissions.isAdmin ?? false;
  const isCoach = permissions.isCoach ?? false;
  const isParent = permissions.isParent ?? false;
  const isPlayer = permissions.isPlayer ?? false;
  // Check if devModeRole exists in your context (it might be named differently)
  const devModeRole = permissions.viewAs ?? permissions.devViewAs ?? null;

  const [dashboardType, setDashboardType] = useState<DashboardType>('loading');

  // Player child selection state
  const [playerChildren, setPlayerChildren] = useState<{ id: string; name: string }[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedChildName, setSelectedChildName] = useState<string | null>(null);
  const [playerChildrenLoaded, setPlayerChildrenLoaded] = useState(false);

  // Load player children when switching to player mode
  const loadPlayerChildren = useCallback(async () => {
    if (!user?.id || !workingSeason?.id) return;
    const playerIds = new Set<string>();

    // parent_account_id
    const { data: parentPlayers } = await supabase
      .from('players')
      .select('id, first_name, last_name')
      .eq('parent_account_id', user.id)
      .eq('season_id', workingSeason.id);
    parentPlayers?.forEach(p => playerIds.add(p.id));

    // player_guardians
    const { data: guardianLinks } = await supabase
      .from('player_guardians')
      .select('player_id')
      .eq('guardian_id', user.id);
    if (guardianLinks && guardianLinks.length > 0) {
      const gIds = guardianLinks.map(g => g.player_id);
      const { data: gPlayers } = await supabase
        .from('players')
        .select('id, first_name, last_name')
        .in('id', gIds)
        .eq('season_id', workingSeason.id);
      gPlayers?.forEach(p => playerIds.add(p.id));
    }

    // Deduplicate and build list
    const allPlayers = [...(parentPlayers || [])];
    if (guardianLinks && guardianLinks.length > 0) {
      const gIds = guardianLinks.map(g => g.player_id);
      const { data: gPlayers } = await supabase
        .from('players')
        .select('id, first_name, last_name')
        .in('id', gIds)
        .eq('season_id', workingSeason.id);
      gPlayers?.forEach(p => {
        if (!allPlayers.find(ap => ap.id === p.id)) allPlayers.push(p);
      });
    }

    const kids = allPlayers.map(p => ({ id: p.id, name: `${p.first_name} ${p.last_name}` }));
    setPlayerChildren(kids);
    setPlayerChildrenLoaded(true);

    if (kids.length === 1) {
      // Single child — auto-select
      setSelectedChildId(kids[0].id);
      setSelectedChildName(kids[0].name);
    } else if (kids.length > 1) {
      // Check if we have a saved last-selected child
      const lastId = await AsyncStorage.getItem(LAST_CHILD_KEY);
      const match = lastId ? kids.find(k => k.id === lastId) : null;
      if (match) {
        setSelectedChildId(match.id);
        setSelectedChildName(match.name);
      } else {
        // No saved selection — show picker
        setSelectedChildId(null);
        setSelectedChildName(null);
      }
    }
  }, [user?.id, workingSeason?.id]);

  useEffect(() => {
    determineDashboard();
  }, [user?.id, workingSeason?.id, isAdmin, isCoach, isParent, isPlayer, devModeRole]);

  // Load children when entering player mode
  useEffect(() => {
    if (dashboardType === 'player') {
      loadPlayerChildren();
    } else {
      // Reset when leaving player mode
      setPlayerChildrenLoaded(false);
      setSelectedChildId(null);
      setSelectedChildName(null);
    }
  }, [dashboardType, loadPlayerChildren]);

  const determineDashboard = async () => {
    if (!user?.id) {
      setDashboardType('loading');
      return;
    }

    // If dev mode is active, show the corresponding dashboard
    if (devModeRole) {
      if (devModeRole === 'league_admin') {
        setDashboardType('admin');
        return;
      }
      if (devModeRole === 'head_coach' || devModeRole === 'assistant_coach') {
        const hasKids = await checkIfParentHasKids();
        setDashboardType(hasKids ? 'coach_parent' : 'coach');
        return;
      }
      if (devModeRole === 'parent') {
        setDashboardType('parent');
        return;
      }
      if (devModeRole === 'player') {
        setDashboardType('player');
        return;
      }
    }

    // Admin gets admin dashboard always
    if (isAdmin) {
      setDashboardType('admin');
      return;
    }

    // Check actual coaching status and parent status
    const [hasTeams, hasKids] = await Promise.all([
      checkIfCoachHasTeams(),
      checkIfParentHasKids(),
    ]);

    // Also check if user is a player directly (via user_account_id or parent_account_id)
    const isPlayerSelf = await checkIfPlayerSelf();

    // Determine dashboard type based on roles
    if (hasTeams && hasKids) {
      setDashboardType('coach_parent');
    } else if (hasTeams) {
      setDashboardType('coach');
    } else if (hasKids || isParent) {
      setDashboardType('parent');
    } else if (isPlayer || isPlayerSelf) {
      setDashboardType('player');
    } else {
      // Default to parent dashboard for new users
      setDashboardType('parent');
    }
  };

  const checkIfCoachHasTeams = async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Primary: check team_staff
      const { data: staffData } = await supabase
        .from('team_staff')
        .select('team_id')
        .eq('user_id', user.id)
        .limit(1);
      if (staffData && staffData.length > 0) return true;

      // Fallback: check coaches table (web parity)
      const { data: coachData } = await supabase
        .from('coaches')
        .select('id')
        .eq('profile_id', user.id)
        .limit(1);
      if (coachData && coachData.length > 0) return true;

      return false;
    } catch {
      return false;
    }
  };

  const checkIfPlayerSelf = async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Check parent_account_id (player linked to this user)
      const { data: selfPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id)
        .limit(1);
      if (selfPlayers && selfPlayers.length > 0) return true;

      return false;
    } catch {
      return false;
    }
  };

  const checkIfParentHasKids = async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id)
        .limit(1);

      return Boolean(data && data.length > 0);
    } catch {
      return false;
    }
  };

  if (dashboardType === 'loading') {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  switch (dashboardType) {
    case 'admin':
      return <AdminDashboard />;
    case 'coach':
      return <CoachDashboard />;
    case 'parent':
      return <ParentDashboard />;
    case 'coach_parent':
      return <CoachParentDashboard />;
    case 'player': {
      // Still loading children
      if (!playerChildrenLoaded) {
        return (
          <View style={[styles.loadingContainer, { backgroundColor: 'transparent' }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        );
      }

      // Multiple children, none selected — show picker
      if (playerChildren.length > 1 && !selectedChildId) {
        return (
          <ChildPickerScreen
            onSelectChild={(child: ChildPlayer) => {
              setSelectedChildId(child.id);
              setSelectedChildName(`${child.first_name} ${child.last_name}`);
              AsyncStorage.setItem(LAST_CHILD_KEY, child.id);
            }}
          />
        );
      }

      // Single child or child selected — show dashboard
      const handleSwitchChild = playerChildren.length > 1
        ? () => {
            setSelectedChildId(null);
            setSelectedChildName(null);
          }
        : undefined;

      return (
        <PlayerDashboard
          playerId={selectedChildId}
          playerName={selectedChildName}
          onSwitchChild={handleSwitchChild}
        />
      );
    }
    default:
      return <ParentDashboard />;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
