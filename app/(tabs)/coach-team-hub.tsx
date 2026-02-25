import AppHeaderBar from '@/components/ui/AppHeaderBar';
import CarouselDots from '@/components/ui/CarouselDots';
import TeamWall from '@/components/TeamWall';
import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
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

type CoachTeam = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  staffRole: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CoachTeamHubScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const s = createStyles(colors);

  // State
  const [coachTeams, setCoachTeams] = useState<CoachTeam[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // ---------------------------------------------------------------------------
  // Data: resolve coach → teams via team_staff + team_coaches + coaches fallback
  // ---------------------------------------------------------------------------

  const fetchCoachTeams = useCallback(async () => {
    if (!user?.id || !workingSeason?.id) {
      setLoading(false);
      return;
    }

    try {
      // Source 1: team_staff
      const { data: staffLinks } = await supabase
        .from('team_staff')
        .select('team_id, staff_role, teams(id, name, color, season_id)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Source 2: team_coaches
      const { data: coachLinks } = await supabase
        .from('team_coaches')
        .select('team_id, role, teams(id, name, color, season_id)')
        .eq('coach_id', user.id);

      // Merge + deduplicate by team_id
      const merged: any[] = [...(staffLinks || [])];
      const existingIds = new Set(merged.map(s => (s.teams as any)?.id).filter(Boolean));
      for (const cl of (coachLinks || [])) {
        const tid = (cl.teams as any)?.id;
        if (tid && !existingIds.has(tid)) {
          merged.push({ ...cl, staff_role: cl.role });
          existingIds.add(tid);
        }
      }

      // Source 3: coaches → all season teams (last resort)
      if (merged.length === 0) {
        const { data: coachRecord } = await supabase
          .from('coaches')
          .select('id')
          .eq('profile_id', user.id)
          .limit(1);
        if (coachRecord && coachRecord.length > 0) {
          const { data: allTeams } = await supabase
            .from('teams')
            .select('id, name, color, season_id')
            .eq('season_id', workingSeason.id)
            .order('name');
          for (const t of (allTeams || [])) {
            merged.push({ teams: t, staff_role: 'head_coach' });
          }
        }
      }

      // Filter to working season
      const teams: CoachTeam[] = merged
        .map((sl: any) => {
          const t = sl.teams as any;
          if (!t?.id || t.season_id !== workingSeason.id) return null;
          return {
            teamId: t.id,
            teamName: t.name || 'Team',
            teamColor: t.color || null,
            staffRole: sl.staff_role || 'coach',
          };
        })
        .filter(Boolean) as CoachTeam[];

      setCoachTeams(teams);
    } catch (err) {
      if (__DEV__) console.error('[CoachTeamHub] fetchCoachTeams error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, workingSeason?.id]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchCoachTeams();
  }, [fetchCoachTeams]);

  // ---------------------------------------------------------------------------
  // Swipe pager — track current page
  // ---------------------------------------------------------------------------

  const handleScroll = useCallback(
    (e: any) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / SCREEN_WIDTH);
      if (idx >= 0 && idx < coachTeams.length) {
        setPageIndex(idx);
      }
    },
    [coachTeams.length],
  );

  // ---------------------------------------------------------------------------
  // Loading
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

  if (coachTeams.length === 0) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <AppHeaderBar title="MY TEAM" showAvatar={false} showNotificationBell={false} />
        <View style={s.centered}>
          <Ionicons name="people-outline" size={64} color={colors.textMuted} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>No Teams Assigned</Text>
          <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
            Once you are assigned to a team, your team hub will appear here.
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
      {coachTeams.length > 1 && (
        <CarouselDots
          total={coachTeams.length}
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
            scrollEnabled={coachTeams.length > 1}
            showsHorizontalScrollIndicator={false}
            data={coachTeams}
            keyExtractor={(item) => item.teamId}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH, height: pagerHeight }}>
                <TeamWall
                  teamId={item.teamId}
                  embedded
                />
              </View>
            )}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            initialNumToRender={coachTeams.length}
            maxToRenderPerBatch={coachTeams.length}
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
