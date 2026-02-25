import AppHeaderBar from '@/components/ui/AppHeaderBar';
import CarouselDots from '@/components/ui/CarouselDots';
import TeamWall from '@/components/TeamWall';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChildTeam = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  childName: string;
  seasonId: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ParentTeamHubScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const s = createStyles(colors);

  // State
  const [childTeams, setChildTeams] = useState<ChildTeam[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // ---------------------------------------------------------------------------
  // Data: resolve parent → children → teams
  // ---------------------------------------------------------------------------

  const fetchChildTeams = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const parentEmail = profile?.email || user?.email;

      // 3-source parent-child resolution (same as ParentDashboard)
      let playerIds: string[] = [];

      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);
      if (guardianLinks) playerIds.push(...guardianLinks.map((g) => g.player_id));

      const { data: directPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id);
      if (directPlayers) playerIds.push(...directPlayers.map((p) => p.id));

      if (parentEmail) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', parentEmail);
        if (emailPlayers) playerIds.push(...emailPlayers.map((p) => p.id));
      }

      playerIds = [...new Set(playerIds)];

      if (playerIds.length === 0) {
        setChildTeams([]);
        setLoading(false);
        return;
      }

      // Fetch players with team info
      const { data: players } = await supabase
        .from('players')
        .select(`
          id, first_name, last_name, season_id,
          team_players ( team_id, teams (id, name, color) )
        `)
        .in('id', playerIds);

      // Deduplicate by team_id
      const teamsMap = new Map<string, ChildTeam>();
      (players || []).forEach((player) => {
        const teamEntries = (player.team_players as any) || [];
        teamEntries.forEach((tp: any) => {
          const team = tp.teams as any;
          if (team?.id && !teamsMap.has(team.id)) {
            teamsMap.set(team.id, {
              teamId: team.id,
              teamName: team.name || 'Team',
              teamColor: team.color || null,
              childName: `${player.first_name} ${player.last_name}`,
              seasonId: player.season_id,
            });
          }
        });
      });

      const teams = Array.from(teamsMap.values());
      setChildTeams(teams);
    } catch (err) {
      if (__DEV__) console.error('[ParentTeamHub] fetchChildTeams error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.email]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchChildTeams();
  }, [fetchChildTeams]);

  // ---------------------------------------------------------------------------
  // Swipe pager — track current page
  // ---------------------------------------------------------------------------

  const handleScroll = useCallback(
    (e: any) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / SCREEN_WIDTH);
      if (idx >= 0 && idx < childTeams.length) {
        setPageIndex(idx);
      }
    },
    [childTeams.length],
  );

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <AppHeaderBar title="MY TEAM" showAvatar={false} showNotificationBell={false} />
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (childTeams.length === 0) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <AppHeaderBar title="MY TEAM" showAvatar={false} showNotificationBell={false} />
        <View style={s.centered}>
          <Ionicons name="people-outline" size={64} color={colors.textMuted} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>No Teams Yet</Text>
          <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
            Once your child is registered and assigned to a team, their team hub will appear here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render — swipe pager
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeaderBar title="MY TEAM" showAvatar={false} showNotificationBell={false} />

      {/* Carousel indicator dots — above hero, below header */}
      {childTeams.length > 1 && (
        <CarouselDots
          total={childTeams.length}
          activeIndex={pageIndex}
          activeColor={colors.primary}
          inactiveColor={colors.textMuted}
        />
      )}

      {/* Swipe pager — each page is an independent TeamWall instance */}
      <View
        style={s.feedContainer}
        onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
      >
        {pagerHeight > 0 && (
          <FlatList
            ref={flatListRef}
            horizontal
            snapToInterval={SCREEN_WIDTH}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            scrollEnabled={childTeams.length > 1}
            showsHorizontalScrollIndicator={false}
            data={childTeams}
            keyExtractor={(item) => item.teamId}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH, height: pagerHeight }}>
                <TeamWall teamId={item.teamId} embedded />
              </View>
            )}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            initialNumToRender={childTeams.length}
            maxToRenderPerBatch={childTeams.length}
            windowSize={21}
            removeClippedSubviews={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    feedContainer: {
      flex: 1,
    },
  });
