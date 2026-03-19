import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { resolveLinkedPlayerIds, hasLinkedPlayers } from '@/lib/resolve-linked-players';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

// Import dashboard components
import AdminHomeScroll from './AdminHomeScroll';
import ChildPickerScreen, { type ChildPlayer } from './ChildPickerScreen';
import CoachHomeScroll from './CoachHomeScroll';
import TeamManagerHomeScroll from './TeamManagerHomeScroll';
import TeamManagerSetupPrompt from './empty-states/TeamManagerSetupPrompt';
import ParentHomeScroll from './ParentHomeScroll';
import PlayerHomeScroll from './PlayerHomeScroll';

const LAST_CHILD_KEY = 'vb_player_last_child_id';

type DashboardType = 'admin' | 'coach' | 'team_manager' | 'team_manager_setup' | 'parent' | 'coach_parent' | 'player' | 'loading';

export default function DashboardRouter() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const permissions = usePermissions();
  const { workingSeason } = useSeason();

  // Extract what we need, with fallbacks
  const isAdmin = permissions.isAdmin ?? false;
  const isCoach = permissions.isCoach ?? false;
  const isTeamManager = permissions.isTeamManager ?? false;
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

    // Canonical resolution → then fetch season-filtered details
    const allIds = await resolveLinkedPlayerIds(user.id);
    if (allIds.length === 0) {
      setPlayerChildren([]);
      setPlayerChildrenLoaded(true);
      return;
    }

    const { data: players } = await supabase
      .from('players')
      .select('id, first_name, last_name')
      .in('id', allIds)
      .eq('season_id', workingSeason.id);

    const kids = (players || []).map(p => ({ id: p.id, name: `${p.first_name} ${p.last_name}` }));
    setPlayerChildren(kids);
    setPlayerChildrenLoaded(true);

    if (kids.length === 1) {
      setSelectedChildId(kids[0].id);
      setSelectedChildName(kids[0].name);
    } else if (kids.length > 1) {
      const lastId = await AsyncStorage.getItem(LAST_CHILD_KEY);
      const match = lastId ? kids.find(k => k.id === lastId) : null;
      if (match) {
        setSelectedChildId(match.id);
        setSelectedChildName(match.name);
      } else {
        setSelectedChildId(null);
        setSelectedChildName(null);
      }
    }
  }, [user?.id, workingSeason?.id]);

  useEffect(() => {
    determineDashboard();
  }, [user?.id, workingSeason?.id, isAdmin, isCoach, isTeamManager, isParent, isPlayer, devModeRole]);

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
        const hasKids = await hasLinkedPlayers(user.id);
        setDashboardType(hasKids ? 'coach_parent' : 'coach');
        return;
      }
      if (devModeRole === 'team_manager') {
        setDashboardType('team_manager');
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

    // Team Manager (not also a coach) gets team_manager dashboard
    if (isTeamManager && !isCoach) {
      const { data: tmTeams } = await supabase
        .from('team_staff')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('staff_role', 'team_manager')
        .eq('is_active', true)
        .limit(1);

      if (tmTeams && tmTeams.length > 0) {
        setDashboardType('team_manager');
      } else {
        setDashboardType('team_manager_setup');
      }
      return;
    }

    // Check actual coaching status and parent status (canonical resolver)
    const [hasTeams, hasKids] = await Promise.all([
      checkIfCoachHasTeams(),
      hasLinkedPlayers(user.id),
    ]);

    // Determine dashboard type based on roles
    if (hasTeams && hasKids) {
      setDashboardType('coach_parent');
    } else if (hasTeams) {
      setDashboardType('coach');
    } else if (hasKids || isParent) {
      setDashboardType('parent');
    } else if (isPlayer) {
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

  if (dashboardType === 'loading') {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  switch (dashboardType) {
    case 'admin':
      return <AdminHomeScroll />;
    case 'coach':
      return <CoachHomeScroll />;
    case 'team_manager':
      return <TeamManagerHomeScroll />;
    case 'team_manager_setup':
      return <TeamManagerSetupPrompt />;
    case 'parent':
      return <ParentHomeScroll />;
    case 'coach_parent':
      return <CoachHomeScroll />;
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
        <PlayerHomeScroll
          playerId={selectedChildId}
          playerName={selectedChildName}
          onSwitchChild={handleSwitchChild}
        />
      );
    }
    default:
      return <ParentHomeScroll />;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
