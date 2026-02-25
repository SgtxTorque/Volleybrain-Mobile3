import AppHeaderBar from '@/components/ui/AppHeaderBar';
import CarouselDots from '@/components/ui/CarouselDots';
import SectionHeader from '@/components/ui/SectionHeader';
import TeamWall from '@/components/TeamWall';
import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
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

type TeamRecord = {
  wins: number;
  losses: number;
  record: string;
  streak: string | null;
};

// ---------------------------------------------------------------------------
// Quick Access Config
// ---------------------------------------------------------------------------

const QUICK_LINKS: {
  key: string;
  label: string;
  route: string;
  needsTeamId?: boolean;
}[] = [
  { key: 'schedule', label: 'Schedule', route: '/(tabs)/parent-schedule' },
  { key: 'roster', label: 'Roster', route: '/team-roster', needsTeamId: true },
  { key: 'standings', label: 'Standings', route: '/standings' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ParentTeamHubScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const s = createStyles(colors);

  // State
  const [childTeams, setChildTeams] = useState<ChildTeam[]>([]);
  const [teamRecords, setTeamRecords] = useState<Record<string, TeamRecord>>({});
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
  // Data: batch-fetch W-L records for all teams
  // ---------------------------------------------------------------------------

  const fetchAllTeamRecords = useCallback(async (teamIds: string[]) => {
    if (teamIds.length === 0) return;
    try {
      const { data } = await supabase
        .from('v_season_standings')
        .select('team_id, wins, losses, record, current_streak')
        .in('team_id', teamIds);

      const records: Record<string, TeamRecord> = {};
      for (const d of data || []) {
        records[d.team_id] = {
          wins: d.wins ?? 0,
          losses: d.losses ?? 0,
          record: d.record || `${d.wins ?? 0}-${d.losses ?? 0}`,
          streak: d.current_streak || null,
        };
      }
      // Default for teams with no standings row
      for (const id of teamIds) {
        if (!records[id]) {
          records[id] = { wins: 0, losses: 0, record: '0-0', streak: null };
        }
      }
      setTeamRecords(records);
    } catch (err) {
      if (__DEV__) console.error('[ParentTeamHub] fetchAllTeamRecords error:', err);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchChildTeams();
  }, [fetchChildTeams]);

  useEffect(() => {
    if (childTeams.length > 0) {
      fetchAllTeamRecords(childTeams.map((t) => t.teamId));
    }
  }, [childTeams, fetchAllTeamRecords]);

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
  // Handlers
  // ---------------------------------------------------------------------------

  const handleQuickLink = (item: typeof QUICK_LINKS[number], teamId: string) => {
    if (item.needsTeamId) {
      router.push({ pathname: item.route as any, params: { teamId } });
    } else {
      router.push(item.route as any);
    }
  };

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

      {/* Swipe pager — each page is an independent team view */}
      <View
        style={s.feedContainer}
        onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
      >
        {pagerHeight > 0 && (
          <FlatList
            ref={flatListRef}
            horizontal
            pagingEnabled
            scrollEnabled={childTeams.length > 1}
            showsHorizontalScrollIndicator={false}
            data={childTeams}
            keyExtractor={(item) => item.teamId}
            renderItem={({ item }) => {
              const teamColor = item.teamColor || colors.primary;
              const record = teamRecords[item.teamId];
              return (
                <View style={{ width: SCREEN_WIDTH, height: pagerHeight }}>
                  {/* Hero Header Card */}
                  <View style={[s.heroCard, { borderLeftColor: teamColor, borderLeftWidth: 4 }]}>
                    <View style={s.heroContent}>
                      <View style={s.heroLeft}>
                        <Text style={[s.heroTeamName, { color: colors.text }]} numberOfLines={1}>
                          {item.teamName}
                        </Text>
                        {childTeams.length > 1 && (
                          <Text
                            style={[s.heroChildName, { color: colors.textSecondary }]}
                            numberOfLines={1}
                          >
                            {item.childName}
                          </Text>
                        )}
                      </View>
                      <View style={s.heroRight}>
                        <View style={[s.recordBadge, { backgroundColor: teamColor }]}>
                          <Text style={s.recordText}>{record?.record || '0-0'}</Text>
                        </View>
                        {record?.streak ? (
                          <Text style={[s.streakText, { color: colors.textMuted }]}>
                            {record.streak}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* Quick Links Row */}
                  <View style={s.quickLinksRow}>
                    {QUICK_LINKS.map((link, i) => (
                      <React.Fragment key={link.key}>
                        {i > 0 && (
                          <Text style={[s.quickLinkSep, { color: colors.glassBorder }]}>·</Text>
                        )}
                        <TouchableOpacity
                          onPress={() => handleQuickLink(link, item.teamId)}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.quickLinkText, { color: teamColor }]}>{link.label}</Text>
                        </TouchableOpacity>
                      </React.Fragment>
                    ))}
                  </View>

                  {/* Section header */}
                  <SectionHeader title="Team Feed" />

                  {/* TeamWall in feedOnly mode */}
                  <View style={s.wallContainer}>
                    <TeamWall teamId={item.teamId} embedded feedOnly />
                  </View>
                </View>
              );
            }}
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

    // Hero card
    heroCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.card,
      marginHorizontal: spacing.screenPadding,
      marginTop: 8,
      marginBottom: 4,
      paddingHorizontal: spacing.cardPaddingH,
      paddingVertical: spacing.cardPaddingV + 4,
      ...shadows.card,
    },
    heroContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heroLeft: {
      flex: 1,
      marginRight: 12,
    },
    heroTeamName: {
      ...displayTextStyle,
      fontSize: 22,
    },
    heroChildName: {
      fontSize: 12,
      marginTop: 2,
    },
    heroRight: {
      alignItems: 'center',
      gap: 4,
    },
    recordBadge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: radii.badge,
    },
    recordText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    streakText: {
      fontSize: 11,
      fontWeight: '500',
    },

    // Quick links row
    quickLinksRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.screenPadding,
      marginTop: 8,
      marginBottom: 4,
      gap: 12,
    },
    quickLinkText: {
      fontSize: 13,
      fontWeight: '700',
    },
    quickLinkSep: {
      fontSize: 16,
      fontWeight: '300',
    },

    // Feed container
    feedContainer: {
      flex: 1,
    },
    wallContainer: {
      flex: 1,
    },
  });
