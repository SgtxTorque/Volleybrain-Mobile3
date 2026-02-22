import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AppHeaderBar from './ui/AppHeaderBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CoachTeam = {
  id: string;
  name: string;
  role: 'head_coach' | 'assistant_coach';
  player_count: number;
  age_group_name: string | null;
};

type ChildPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  team_name: string | null;
  team_id: string | null;
  age_group_name: string | null;
  jersey_number?: string | null;
  position?: string | null;
};

type UpcomingEvent = {
  id: string;
  title: string;
  type: 'game' | 'practice';
  date: string;
  time: string;
  location: string | null;
  opponent: string | null;
  team_name: string;
};

type PlayerStats = {
  games_played: number;
  total_kills: number;
  total_aces: number;
};

type ActiveMode = 'coach' | 'parent';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CoachParentDashboard() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<ActiveMode>('coach');

  // Coach data
  const [coachTeams, setCoachTeams] = useState<CoachTeam[]>([]);
  const [coachUpcomingEvents, setCoachUpcomingEvents] = useState<UpcomingEvent[]>([]);

  // Parent data
  const [children, setChildren] = useState<ChildPlayer[]>([]);
  const [parentUpcomingEvents, setParentUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const [childStats, setChildStats] = useState<PlayerStats | null>(null);

  const activeChild = children[activeChildIndex] || null;

  useEffect(() => {
    fetchData();
  }, [user?.id, workingSeason?.id]);

  // Fetch child stats when active child changes
  useEffect(() => {
    if (activeChild && workingSeason?.id) {
      fetchChildStats(activeChild.id);
    }
  }, [activeChild?.id, workingSeason?.id]);

  // -------------------------------------------------------------------------
  // Data fetching (preserved from original)
  // -------------------------------------------------------------------------

  const fetchData = async () => {
    if (!user?.id || !workingSeason?.id) return;

    try {
      // COACHING DATA — single query for both head_coach and assistant_coach
      const { data: allStaffTeams } = await supabase
        .from('team_staff')
        .select(`
          team_id,
          role,
          teams (id, name, season_id, age_groups (name))
        `)
        .eq('user_id', user.id)
        .in('role', ['head_coach', 'assistant_coach']);

      const allTeamData = allStaffTeams || [];
      const seasonTeams = allTeamData.filter(t => {
        const team = t.teams as any;
        return team?.season_id === workingSeason.id;
      });

      const allCoachTeamIds: string[] = seasonTeams.map(t => (t.teams as any)?.id).filter(Boolean);

      // Batch player counts for all teams at once
      let playerCountMap = new Map<string, number>();
      if (allCoachTeamIds.length > 0) {
        const { data: allTeamPlayers } = await supabase
          .from('team_players')
          .select('team_id')
          .in('team_id', allCoachTeamIds);

        for (const tp of (allTeamPlayers || [])) {
          playerCountMap.set(tp.team_id, (playerCountMap.get(tp.team_id) || 0) + 1);
        }
      }

      const teamsWithCounts: CoachTeam[] = seasonTeams.map(t => {
        const team = t.teams as any;
        return {
          id: team.id,
          name: team.name,
          role: t.role as 'head_coach' | 'assistant_coach',
          player_count: playerCountMap.get(team.id) || 0,
          age_group_name: team.age_groups?.name || null,
        };
      });

      teamsWithCounts.sort((a, b) => {
        if (a.role === 'head_coach' && b.role !== 'head_coach') return -1;
        if (a.role !== 'head_coach' && b.role === 'head_coach') return 1;
        return a.name.localeCompare(b.name);
      });

      setCoachTeams(teamsWithCounts);

      // PARENT DATA
      const allParentTeamIds: string[] = [];

      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);

      if (guardianLinks && guardianLinks.length > 0) {
        const playerIds = guardianLinks.map(g => g.player_id);

        const { data: players } = await supabase
          .from('players')
          .select(`
            id, first_name, last_name, season_id, jersey_number, position,
            age_groups (name),
            team_players (team_id, teams (id, name))
          `)
          .in('id', playerIds);

        const currentSeasonChildren: ChildPlayer[] = [];

        (players || []).forEach(player => {
          if (player.season_id === workingSeason.id) {
            const teamPlayer = (player.team_players as any)?.[0];
            const team = teamPlayer?.teams as any;
            const ageGroup = player.age_groups as any;

            if (team?.id) allParentTeamIds.push(team.id);

            currentSeasonChildren.push({
              id: player.id,
              first_name: player.first_name,
              last_name: player.last_name,
              team_name: team?.name || null,
              team_id: team?.id || null,
              age_group_name: ageGroup?.name || null,
              jersey_number: (player as any).jersey_number || null,
              position: (player as any).position || null,
            });
          }
        });

        setChildren(currentSeasonChildren);
      }

      // COACH UPCOMING EVENTS
      if (allCoachTeamIds.length > 0) {
        const today = new Date().toISOString().split('T')[0];

        const { data: coachEvents } = await supabase
          .from('schedule_events')
          .select(`
            id, title, event_type, event_date, start_time,
            location, opponent, team_id, teams (name)
          `)
          .in('team_id', allCoachTeamIds)
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(5);

        setCoachUpcomingEvents((coachEvents || []).map(e => ({
          id: e.id,
          title: e.title,
          type: e.event_type as 'game' | 'practice',
          date: e.event_date,
          time: e.start_time || '',
          location: e.location,
          opponent: e.opponent,
          team_name: (e.teams as any)?.name || '',
        })));
      }

      // PARENT UPCOMING EVENTS
      if (allParentTeamIds.length > 0) {
        const today = new Date().toISOString().split('T')[0];

        const { data: parentEvents } = await supabase
          .from('schedule_events')
          .select(`
            id, title, event_type, event_date, start_time,
            location, opponent, team_id, teams (name)
          `)
          .in('team_id', allParentTeamIds)
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(5);

        setParentUpcomingEvents((parentEvents || []).map(e => ({
          id: e.id,
          title: e.title,
          type: e.event_type as 'game' | 'practice',
          date: e.event_date,
          time: e.start_time || '',
          location: e.location,
          opponent: e.opponent,
          team_name: (e.teams as any)?.name || '',
        })));
      }

    } catch (error) {
      if (__DEV__) console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildStats = async (playerId: string) => {
    if (!workingSeason?.id) return;
    try {
      const { data } = await supabase
        .from('player_season_stats')
        .select('*')
        .eq('player_id', playerId)
        .eq('season_id', workingSeason.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        setChildStats({
          games_played: data.games_played || 0,
          total_kills: data.total_kills || 0,
          total_aces: data.total_aces || 0,
        });
      } else {
        setChildStats(null);
      }
    } catch (err) {
      if (__DEV__) console.error('Error fetching child stats:', err);
      setChildStats(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const getCountdownText = (dateStr: string) => {
    const eventDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'TOMORROW';
    return `IN ${diffDays} DAYS`;
  };

  const navigateToTeamChat = (teamId: string) => {
    router.push({ pathname: '/chat/[id]', params: { id: teamId } });
  };

  const s = createStyles(colors);
  const firstName = profile?.full_name?.split(' ')[0] || 'Coach';
  const userInitials = (profile?.full_name || '')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const currentEvents = activeMode === 'coach' ? coachUpcomingEvents : parentUpcomingEvents;
  const nextEvent = currentEvents[0] || null;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View style={{ flex: 1 }}>
      <AppHeaderBar initials={userInitials} />
    <ScrollView
      style={s.container}
      contentContainerStyle={s.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Welcome back,</Text>
          <Text style={s.heroName}>{firstName}</Text>
        </View>
      </View>

      {/* ================================================================ */}
      {/* MODE SWITCHER                                                     */}
      {/* ================================================================ */}
      <View style={s.modeSwitcher}>
        <TouchableOpacity
          style={[s.modeBtn, activeMode === 'coach' && s.modeBtnActive]}
          onPress={() => setActiveMode('coach')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="clipboard"
            size={16}
            color={activeMode === 'coach' ? '#000' : colors.textMuted}
          />
          <Text style={[s.modeBtnText, activeMode === 'coach' && s.modeBtnTextActive]}>
            Coach Mode
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeBtn, activeMode === 'parent' && s.modeBtnActive]}
          onPress={() => setActiveMode('parent')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeMode === 'parent' ? '#000' : colors.textMuted}
          />
          <Text style={[s.modeBtnText, activeMode === 'parent' && s.modeBtnTextActive]}>
            Parent Mode
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================================================================ */}
      {/* COACH MODE CONTENT                                                */}
      {/* ================================================================ */}
      {activeMode === 'coach' && (
        <View>
          {/* Team Cards */}
          {coachTeams.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="clipboard-outline" size={36} color={colors.textMuted} />
              <Text style={s.emptyText}>No teams assigned this season</Text>
            </View>
          ) : (
            <>
              <Text style={s.sectionLabel}>YOUR TEAMS</Text>
              {coachTeams.map(team => (
                <View key={team.id} style={s.teamCard}>
                  <View style={s.teamCardTop}>
                    <View style={s.teamCardLeft}>
                      <View style={[s.teamIconWrap, team.role === 'head_coach' ? { backgroundColor: colors.primary + '15' } : { backgroundColor: colors.info + '15' }]}>
                        <Ionicons
                          name={team.role === 'head_coach' ? 'shield' : 'shield-half'}
                          size={22}
                          color={team.role === 'head_coach' ? colors.primary : colors.info}
                        />
                      </View>
                      <View style={s.teamCardInfo}>
                        <Text style={s.teamCardName}>{team.name}</Text>
                        <View style={s.teamCardMeta}>
                          <View style={[s.roleBadge, team.role === 'head_coach' ? s.roleBadgeHC : s.roleBadgeAC]}>
                            <Text style={[s.roleBadgeText, { color: team.role === 'head_coach' ? colors.success : colors.info }]}>
                              {team.role === 'head_coach' ? 'Head Coach' : 'Assistant'}
                            </Text>
                          </View>
                          <Text style={s.playerCountText}>{team.player_count} players</Text>
                          {team.age_group_name && (
                            <View style={s.ageGroupBadge}>
                              <Text style={s.ageGroupText}>{team.age_group_name}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Team quick actions */}
                  <View style={s.teamActions}>
                    <TouchableOpacity style={s.teamAction} onPress={() => router.push('/(tabs)/players' as any)}>
                      <Ionicons name="people" size={16} color={colors.primary} />
                      <Text style={s.teamActionText}>Roster</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.teamAction} onPress={() => router.push('/(tabs)/schedule' as any)}>
                      <Ionicons name="calendar" size={16} color={colors.info} />
                      <Text style={s.teamActionText}>Schedule</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.teamAction} onPress={() => navigateToTeamChat(team.id)}>
                      <Ionicons name="chatbubbles" size={16} color={colors.success} />
                      <Text style={s.teamActionText}>Chat</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Next Coach Event */}
          {nextEvent && (
            <View style={s.sectionBlock}>
              <Text style={s.sectionLabel}>NEXT UP</Text>
              <View style={s.nextEventCard}>
                <View style={s.nextEventTop}>
                  <View style={[
                    s.nextEventTypeBadge,
                    nextEvent.type === 'game'
                      ? { backgroundColor: colors.danger + '20' }
                      : { backgroundColor: colors.info + '20' },
                  ]}>
                    <Text style={[
                      s.nextEventTypeText,
                      { color: nextEvent.type === 'game' ? colors.danger : colors.info },
                    ]}>
                      {nextEvent.type === 'game' ? 'GAME' : 'PRACTICE'}
                    </Text>
                  </View>
                  <Text style={s.nextEventTeamName}>{nextEvent.team_name}</Text>
                </View>
                <Text style={s.nextEventCountdown}>{getCountdownText(nextEvent.date)}</Text>
                <Text style={s.nextEventTitle}>
                  {nextEvent.type === 'game' && nextEvent.opponent
                    ? `vs ${nextEvent.opponent}`
                    : nextEvent.title}
                </Text>
                <View style={s.nextEventDetails}>
                  <View style={s.nextEventDetailRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                    <Text style={s.nextEventDetailText}>{formatDate(nextEvent.date)}</Text>
                  </View>
                  {nextEvent.time ? (
                    <View style={s.nextEventDetailRow}>
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                      <Text style={s.nextEventDetailText}>{formatTime(nextEvent.time)}</Text>
                    </View>
                  ) : null}
                  {nextEvent.location ? (
                    <View style={s.nextEventDetailRow}>
                      <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                      <Text style={s.nextEventDetailText}>{nextEvent.location}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          )}

          {/* Coach Quick Actions */}
          <View style={s.sectionBlock}>
            <Text style={s.sectionLabel}>QUICK ACTIONS</Text>
            <View style={s.quickActionsRow}>
              <TouchableOpacity style={s.quickActionCard} onPress={() => router.push('/lineup-builder' as any)}>
                <View style={[s.quickActionIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="list" size={20} color={colors.primary} />
                </View>
                <Text style={s.quickActionText}>Lineup</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.quickActionCard} onPress={() => router.push('/game-prep' as any)}>
                <View style={[s.quickActionIcon, { backgroundColor: colors.info + '15' }]}>
                  <Ionicons name="clipboard" size={20} color={colors.info} />
                </View>
                <Text style={s.quickActionText}>Game Prep</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.quickActionCard} onPress={() => router.push('/blast-composer' as any)}>
                <View style={[s.quickActionIcon, { backgroundColor: colors.success + '15' }]}>
                  <Ionicons name="megaphone" size={20} color={colors.success} />
                </View>
                <Text style={s.quickActionText}>Announce</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ================================================================ */}
      {/* PARENT MODE CONTENT                                               */}
      {/* ================================================================ */}
      {activeMode === 'parent' && (
        <View>
          {/* Child Hero */}
          {children.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="people-outline" size={36} color={colors.textMuted} />
              <Text style={s.emptyText}>No children registered this season</Text>
            </View>
          ) : children.length === 1 ? (
            <View style={s.childHeroCard}>
              <View style={s.childHeroTop}>
                <View style={s.childHeroAvatar}>
                  <Text style={s.childHeroAvatarText}>
                    {activeChild?.first_name?.charAt(0)}{activeChild?.last_name?.charAt(0)}
                  </Text>
                </View>
                <View style={s.childHeroInfo}>
                  <Text style={s.childHeroName}>{activeChild?.first_name} {activeChild?.last_name}</Text>
                  {activeChild?.team_name && (
                    <Text style={s.childHeroTeam}>{activeChild.team_name}</Text>
                  )}
                  <View style={s.childHeroBadges}>
                    {activeChild?.jersey_number && (
                      <View style={s.childBadge}>
                        <Text style={s.childBadgeText}>#{activeChild.jersey_number}</Text>
                      </View>
                    )}
                    {activeChild?.position && (
                      <View style={[s.childBadge, { backgroundColor: colors.info + '20' }]}>
                        <Text style={[s.childBadgeText, { color: colors.info }]}>{activeChild.position}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          ) : (
            /* Multiple children: horizontal scroll */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.multiChildScroll}
            >
              {children.map((child, index) => {
                const isActive = index === activeChildIndex;
                return (
                  <TouchableOpacity
                    key={child.id}
                    style={[s.multiChildCard, isActive && { borderColor: colors.primary, borderWidth: 2 }]}
                    onPress={() => setActiveChildIndex(index)}
                    activeOpacity={0.8}
                  >
                    <View style={s.multiChildAvatar}>
                      <Text style={s.multiChildAvatarText}>
                        {child.first_name.charAt(0)}{child.last_name.charAt(0)}
                      </Text>
                    </View>
                    <Text style={s.multiChildName} numberOfLines={1}>{child.first_name}</Text>
                    {child.team_name && (
                      <Text style={s.multiChildTeam} numberOfLines={1}>{child.team_name}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Next Parent Event */}
          {nextEvent && (
            <View style={s.sectionBlock}>
              <Text style={s.sectionLabel}>NEXT UP</Text>
              <View style={s.nextEventCard}>
                <View style={s.nextEventTop}>
                  <View style={[
                    s.nextEventTypeBadge,
                    nextEvent.type === 'game'
                      ? { backgroundColor: colors.danger + '20' }
                      : { backgroundColor: colors.info + '20' },
                  ]}>
                    <Text style={[
                      s.nextEventTypeText,
                      { color: nextEvent.type === 'game' ? colors.danger : colors.info },
                    ]}>
                      {nextEvent.type === 'game' ? 'GAME' : 'PRACTICE'}
                    </Text>
                  </View>
                  <Text style={s.nextEventTeamName}>{nextEvent.team_name}</Text>
                </View>
                <Text style={s.nextEventCountdown}>{getCountdownText(nextEvent.date)}</Text>
                <Text style={s.nextEventTitle}>
                  {nextEvent.type === 'game' && nextEvent.opponent
                    ? `vs ${nextEvent.opponent}`
                    : nextEvent.title}
                </Text>
                <View style={s.nextEventDetails}>
                  <View style={s.nextEventDetailRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                    <Text style={s.nextEventDetailText}>{formatDate(nextEvent.date)}</Text>
                  </View>
                  {nextEvent.time ? (
                    <View style={s.nextEventDetailRow}>
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                      <Text style={s.nextEventDetailText}>{formatTime(nextEvent.time)}</Text>
                    </View>
                  ) : null}
                  {nextEvent.location ? (
                    <View style={s.nextEventDetailRow}>
                      <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                      <Text style={s.nextEventDetailText}>{nextEvent.location}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          )}

          {/* Quick Pulse for child */}
          {activeChild && (
            <View style={s.sectionBlock}>
              <Text style={s.sectionLabel}>AT A GLANCE</Text>
              <View style={s.pulseRow}>
                <View style={s.pulseCard}>
                  <Ionicons name="trophy-outline" size={22} color={colors.primary} />
                  <Text style={s.pulseNumber}>{childStats?.games_played ?? 0}</Text>
                  <Text style={s.pulseLabel}>Games</Text>
                </View>
                <View style={s.pulseCard}>
                  <Ionicons name="flash-outline" size={22} color={colors.warning} />
                  <Text style={s.pulseNumber}>{childStats?.total_kills ?? 0}</Text>
                  <Text style={s.pulseLabel}>Kills</Text>
                </View>
                <View style={s.pulseCard}>
                  <Ionicons name="star-outline" size={22} color={colors.success} />
                  <Text style={s.pulseNumber}>{childStats?.total_aces ?? 0}</Text>
                  <Text style={s.pulseLabel}>Aces</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ================================================================ */}
      {/* SHARED SECTION -- Quick Links (always visible)                     */}
      {/* ================================================================ */}
      <View style={s.sectionBlock}>
        <Text style={s.sectionLabel}>QUICK LINKS</Text>
        <View style={s.quickLinksRow}>
          <TouchableOpacity style={s.quickLinkItem} onPress={() => router.push('/(tabs)/schedule' as any)} activeOpacity={0.7}>
            <View style={[s.quickLinkIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="calendar" size={22} color={colors.primary} />
            </View>
            <Text style={s.quickLinkText}>Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.quickLinkItem} onPress={() => router.push('/(tabs)/chats' as any)} activeOpacity={0.7}>
            <View style={[s.quickLinkIcon, { backgroundColor: colors.success + '15' }]}>
              <Ionicons name="chatbubbles" size={22} color={colors.success} />
            </View>
            <Text style={s.quickLinkText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.quickLinkItem} onPress={() => router.push('/blast-composer' as any)} activeOpacity={0.7}>
            <View style={[s.quickLinkIcon, { backgroundColor: colors.info + '15' }]}>
              <Ionicons name="megaphone" size={22} color={colors.info} />
            </View>
            <Text style={s.quickLinkText}>Announce</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.quickLinkItem} onPress={() => router.push('/profile' as any)} activeOpacity={0.7}>
            <View style={[s.quickLinkIcon, { backgroundColor: colors.warning + '15' }]}>
              <Ionicons name="person" size={22} color={colors.warning} />
            </View>
            <Text style={s.quickLinkText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom padding */}
      <View style={{ height: 120 }} />
    </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textMuted,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
  },
  heroName: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 2,
  },

  // Section
  sectionBlock: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
    color: colors.textMuted,
    marginBottom: 12,
  },

  // ========== MODE SWITCHER ==========
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 4,
    marginBottom: 28,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  modeBtnTextActive: {
    color: '#000',
  },

  // ========== EMPTY STATE ==========
  emptyCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 36,
    alignItems: 'center',
    marginBottom: 28,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
  },

  // ========== TEAM CARD (Coach Mode) ==========
  teamCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  teamCardTop: {
    padding: 16,
  },
  teamCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  teamCardInfo: {
    flex: 1,
  },
  teamCardName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  teamCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeHC: {
    backgroundColor: colors.success + '20',
  },
  roleBadgeAC: {
    backgroundColor: colors.info + '20',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  playerCountText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  ageGroupBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ageGroupText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  teamActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  teamAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  teamActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },

  // ========== NEXT EVENT (shared between modes) ==========
  nextEventCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  nextEventTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  nextEventTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nextEventTypeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  nextEventTeamName: {
    fontSize: 13,
    color: colors.textMuted,
  },
  nextEventCountdown: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  nextEventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  nextEventDetails: {
    gap: 6,
  },
  nextEventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextEventDetailText: {
    fontSize: 14,
    color: colors.textMuted,
  },

  // ========== QUICK ACTIONS (Coach Mode) ==========
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },

  // ========== CHILD HERO (Parent Mode) ==========
  childHeroCard: {
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 20,
    marginBottom: 28,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  childHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childHeroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success + '15',
    borderWidth: 2,
    borderColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  childHeroAvatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.success,
  },
  childHeroInfo: {
    flex: 1,
  },
  childHeroName: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  childHeroTeam: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  childHeroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  childBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  childBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  // Multi-child horizontal scroll
  multiChildScroll: {
    gap: 12,
    paddingRight: 20,
    marginBottom: 28,
  },
  multiChildCard: {
    width: 160,
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  multiChildAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success + '15',
    borderWidth: 2,
    borderColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  multiChildAvatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.success,
  },
  multiChildName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  multiChildTeam: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  // Pulse cards (Parent mode stats)
  pulseRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pulseCard: {
    flex: 1,
    backgroundColor: colors.glassCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  pulseNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  pulseLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },

  // ========== QUICK LINKS (Shared section) ==========
  quickLinksRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickLinkItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.glassCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingVertical: 14,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  quickLinkIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
