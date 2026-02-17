import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =============================================================================
// TYPES
// =============================================================================

type Team = {
  id: string;
  name: string;
  color: string | null;
  season_id: string | null;
};

type PostProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type Post = {
  id: string;
  team_id: string;
  author_id: string;
  title: string | null;
  content: string;
  post_type: string;
  is_pinned: boolean;
  is_published: boolean;
  reaction_count: number;
  created_at: string;
  profiles: PostProfile | null;
};

type RosterPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: number | null;
  position: string | null;
  photo_url: string | null;
};

type ScheduleEvent = {
  id: string;
  team_id: string;
  title: string | null;
  event_type: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  opponent_name: string | null;
  location: string | null;
  notes: string | null;
};

type PostType = 'announcement' | 'game_recap' | 'shoutout' | 'milestone' | 'photo';

type TabKey = 'feed' | 'roster' | 'schedule';

// =============================================================================
// CONSTANTS
// =============================================================================

const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  announcement: { label: 'Announcement', color: '#F97316', icon: 'megaphone' },
  game_recap: { label: 'Game Recap', color: '#10B981', icon: 'trophy' },
  shoutout: { label: 'Shoutout', color: '#A855F7', icon: 'heart' },
  milestone: { label: 'Milestone', color: '#F59E0B', icon: 'ribbon' },
  photo: { label: 'Photo', color: '#3B82F6', icon: 'camera' },
};

const POST_TYPES: PostType[] = ['announcement', 'game_recap', 'shoutout', 'milestone', 'photo'];

const AVATAR_COLORS = [
  '#F97316', '#10B981', '#3B82F6', '#A855F7', '#EF4444',
  '#F59E0B', '#0EA5E9', '#EC4899', '#14B8A6', '#8B5CF6',
];

const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitial = (name: string | null): string => {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
};

const formatTimestamp = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatEventDate = (dateStr: string): { dayOfWeek: string; month: string; day: string } => {
  const date = new Date(dateStr + 'T00:00:00');
  return {
    dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    day: String(date.getDate()),
  };
};

const formatTime = (time: string | null): string => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TeamWallScreen() {
  const { colors } = useTheme();
  const { user, profile, isAdmin } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const params = useLocalSearchParams<{ teamId?: string }>();

  // Team state
  const [teamId, setTeamId] = useState<string | null>(params.teamId || null);
  const [team, setTeam] = useState<Team | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [coachCount, setCoachCount] = useState(0);
  const [isCoachOrAdmin, setIsCoachOrAdmin] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(!params.teamId);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('feed');

  // Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshingFeed, setRefreshingFeed] = useState(false);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());

  // New post modal
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<PostType>('announcement');
  const [submittingPost, setSubmittingPost] = useState(false);

  // Roster state
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Schedule state
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // =============================================================================
  // TEAM PICKER - Load user's teams if no teamId provided
  // =============================================================================

  useEffect(() => {
    if (!teamId && user?.id) {
      loadUserTeams();
    }
  }, [user?.id]);

  useEffect(() => {
    if (teamId) {
      loadTeamDetails();
      checkUserPermissions();
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId && activeTab === 'feed') {
      loadPosts();
    } else if (teamId && activeTab === 'roster') {
      loadRoster();
    } else if (teamId && activeTab === 'schedule') {
      loadSchedule();
    }
  }, [teamId, activeTab]);

  const loadUserTeams = async () => {
    if (!user?.id) return;
    setLoadingTeams(true);
    try {
      // Check team_staff for coach/admin teams
      const { data: staffTeams } = await supabase
        .from('team_staff')
        .select('team_id, teams(id, name, color, season_id)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Check team_players for player teams
      const { data: playerTeams } = await supabase
        .from('team_players')
        .select('team_id, teams(id, name, color, season_id)')
        .eq('player_id', user.id);

      const teamsMap = new Map<string, Team>();

      if (staffTeams) {
        for (const row of staffTeams) {
          const t = row.teams as any;
          if (t) teamsMap.set(t.id, { id: t.id, name: t.name, color: t.color, season_id: t.season_id });
        }
      }

      if (playerTeams) {
        for (const row of playerTeams) {
          const t = row.teams as any;
          if (t && !teamsMap.has(t.id)) {
            teamsMap.set(t.id, { id: t.id, name: t.name, color: t.color, season_id: t.season_id });
          }
        }
      }

      // If admin/platform admin, also load all teams for the working season
      if (isAdmin && workingSeason?.id && teamsMap.size === 0) {
        const { data: allTeams } = await supabase
          .from('teams')
          .select('id, name, color, season_id')
          .eq('season_id', workingSeason.id)
          .order('name');
        if (allTeams) {
          for (const t of allTeams) {
            if (!teamsMap.has(t.id)) teamsMap.set(t.id, t);
          }
        }
      }

      const teamList = Array.from(teamsMap.values());
      setUserTeams(teamList);

      // Auto-select if only one team
      if (teamList.length === 1) {
        setTeamId(teamList[0].id);
      }
    } catch (error) {
      console.error('Error loading user teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  // =============================================================================
  // TEAM DETAILS
  // =============================================================================

  const loadTeamDetails = async () => {
    if (!teamId) return;
    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name, color, season_id')
        .eq('id', teamId)
        .single();

      if (teamData) setTeam(teamData);

      // Get player count
      const { count: pCount } = await supabase
        .from('team_players')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);
      setPlayerCount(pCount || 0);

      // Get coach count
      const { count: cCount } = await supabase
        .from('team_staff')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('is_active', true);
      setCoachCount(cCount || 0);
    } catch (error) {
      console.error('Error loading team details:', error);
    }
  };

  const checkUserPermissions = async () => {
    if (!user?.id || !teamId) return;
    try {
      // Check if user is a coach/staff for this team
      const { data: staffRecord } = await supabase
        .from('team_staff')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      // Also check user_roles for league_admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'league_admin')
        .eq('is_active', true)
        .maybeSingle();

      setIsCoachOrAdmin(!!staffRecord || !!adminRole || isAdmin);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  // =============================================================================
  // FEED TAB
  // =============================================================================

  const loadPosts = async () => {
    if (!teamId) return;
    setLoadingPosts(true);
    try {
      const { data, count } = await supabase
        .from('team_posts')
        .select('*, profiles:author_id(id, full_name, avatar_url)', { count: 'exact' })
        .eq('team_id', teamId)
        .eq('is_published', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      setPosts((data as Post[]) || []);

      // Load user's reactions
      if (user?.id && data && data.length > 0) {
        const postIds = data.map((p: any) => p.id);
        const { data: reactions } = await supabase
          .from('post_reactions')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);

        if (reactions) {
          setLikedPostIds(new Set(reactions.map(r => r.post_id)));
        }
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleRefreshFeed = useCallback(async () => {
    setRefreshingFeed(true);
    await loadPosts();
    setRefreshingFeed(false);
  }, [teamId]);

  const handleToggleLike = async (postId: string) => {
    if (!user?.id) return;

    const isLiked = likedPostIds.has(postId);

    // Optimistic update
    const newLiked = new Set(likedPostIds);
    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        return { ...p, reaction_count: p.reaction_count + (isLiked ? -1 : 1) };
      }
      return p;
    });
    if (isLiked) {
      newLiked.delete(postId);
    } else {
      newLiked.add(postId);
    }
    setLikedPostIds(newLiked);
    setPosts(updatedPosts);

    try {
      if (isLiked) {
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: 'like',
          });
      }
    } catch (error) {
      // Revert on error
      console.error('Error toggling like:', error);
      setLikedPostIds(likedPostIds);
      setPosts(posts);
    }
  };

  const handleSubmitPost = async () => {
    if (!teamId || !user?.id || !newPostContent.trim()) {
      Alert.alert('Error', 'Please enter post content.');
      return;
    }

    setSubmittingPost(true);
    try {
      const { data, error } = await supabase
        .from('team_posts')
        .insert({
          team_id: teamId,
          author_id: user.id,
          title: newPostTitle.trim() || null,
          content: newPostContent.trim(),
          post_type: newPostType,
          is_pinned: false,
          is_published: true,
        })
        .select('*, profiles:author_id(id, full_name, avatar_url)')
        .single();

      if (error) throw error;

      if (data) {
        setPosts(prev => [{ ...data, reaction_count: 0 } as Post, ...prev]);
      }

      setNewPostTitle('');
      setNewPostContent('');
      setNewPostType('announcement');
      setShowNewPostModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post.');
    } finally {
      setSubmittingPost(false);
    }
  };

  // =============================================================================
  // ROSTER TAB
  // =============================================================================

  const loadRoster = async () => {
    if (!teamId) return;
    setLoadingRoster(true);
    try {
      const { data } = await supabase
        .from('team_players')
        .select(`
          player_id,
          players (
            id,
            first_name,
            last_name,
            jersey_number,
            position,
            photo_url
          )
        `)
        .eq('team_id', teamId);

      const players: RosterPlayer[] = (data || [])
        .map((tp: any) => tp.players)
        .filter(Boolean)
        .map((p: any) => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          jersey_number: p.jersey_number,
          position: p.position,
          photo_url: p.photo_url,
        }))
        .sort((a: RosterPlayer, b: RosterPlayer) => {
          // Sort by jersey number first, then name
          if (a.jersey_number !== null && b.jersey_number !== null) {
            return a.jersey_number - b.jersey_number;
          }
          if (a.jersey_number !== null) return -1;
          if (b.jersey_number !== null) return 1;
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        });

      setRoster(players);
    } catch (error) {
      console.error('Error loading roster:', error);
    } finally {
      setLoadingRoster(false);
    }
  };

  // =============================================================================
  // SCHEDULE TAB
  // =============================================================================

  const loadSchedule = async () => {
    if (!teamId) return;
    setLoadingSchedule(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data } = await supabase
        .from('schedule_events')
        .select('*')
        .eq('team_id', teamId)
        .gte('event_date', today)
        .order('event_date')
        .order('start_time')
        .limit(10);

      setEvents((data as ScheduleEvent[]) || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // =============================================================================
  // STYLES
  // =============================================================================

  const s = createStyles(colors);
  const teamColor = team?.color || colors.primary;

  // =============================================================================
  // TEAM PICKER VIEW
  // =============================================================================

  if (!teamId) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Team Wall</Text>
          <View style={s.backBtn} />
        </View>

        {loadingTeams ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s.loadingText}>Loading teams...</Text>
          </View>
        ) : userTeams.length === 0 ? (
          <View style={s.centered}>
            <Ionicons name="people-outline" size={64} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No Teams Found</Text>
            <Text style={s.emptySubtitle}>
              You are not assigned to any teams yet.
            </Text>
          </View>
        ) : (
          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
            <Text style={s.pickerLabel}>Select a team</Text>
            {userTeams.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={s.teamPickerCard}
                onPress={() => setTeamId(t.id)}
                activeOpacity={0.7}
              >
                <View style={[s.teamPickerStripe, { backgroundColor: t.color || colors.primary }]} />
                <View style={s.teamPickerInfo}>
                  <Text style={s.teamPickerName}>{t.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderPostCard = ({ item: post }: { item: Post }) => {
    const authorName = post.profiles?.full_name || 'Unknown';
    const initial = getInitial(authorName);
    const avatarColor = getAvatarColor(authorName);
    const typeConfig = POST_TYPE_CONFIG[post.post_type as PostType] || POST_TYPE_CONFIG.announcement;
    const isLiked = likedPostIds.has(post.id);

    return (
      <View style={s.postCard}>
        {/* Pinned indicator */}
        {post.is_pinned && (
          <View style={s.pinnedBanner}>
            <Ionicons name="pin" size={12} color={colors.warning} />
            <Text style={s.pinnedText}>Pinned</Text>
          </View>
        )}

        {/* Post header */}
        <View style={s.postHeader}>
          <View style={[s.avatar, { backgroundColor: avatarColor }]}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <View style={s.postHeaderInfo}>
            <Text style={s.postAuthor}>{authorName}</Text>
            <Text style={s.postTimestamp}>{formatTimestamp(post.created_at)}</Text>
          </View>
          <View style={[s.postTypeBadge, { backgroundColor: typeConfig.color + '20' }]}>
            <Ionicons name={typeConfig.icon} size={12} color={typeConfig.color} />
            <Text style={[s.postTypeBadgeText, { color: typeConfig.color }]}>
              {typeConfig.label}
            </Text>
          </View>
        </View>

        {/* Post content */}
        {post.title && <Text style={s.postTitle}>{post.title}</Text>}
        <Text style={s.postContent}>{post.content}</Text>

        {/* Post footer */}
        <View style={s.postFooter}>
          <TouchableOpacity
            style={[s.likeButton, isLiked && s.likeButtonActive]}
            onPress={() => handleToggleLike(post.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={18}
              color={isLiked ? colors.danger : colors.textMuted}
            />
            <Text style={[s.likeCount, isLiked && { color: colors.danger }]}>
              {post.reaction_count || 0}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRosterPlayer = ({ item: player }: { item: RosterPlayer }) => {
    const fullName = `${player.first_name} ${player.last_name}`;
    const initial = getInitial(player.first_name);
    const avatarColor = getAvatarColor(fullName);

    return (
      <View style={s.rosterCard}>
        <View style={[s.rosterAvatar, { backgroundColor: avatarColor }]}>
          {player.jersey_number !== null ? (
            <Text style={s.rosterJerseyNumber}>#{player.jersey_number}</Text>
          ) : (
            <Text style={s.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={s.rosterInfo}>
          <Text style={s.rosterName}>{fullName}</Text>
          {player.position && (
            <Text style={s.rosterPosition}>{player.position}</Text>
          )}
        </View>
        {player.jersey_number !== null && (
          <View style={s.rosterJerseyBadge}>
            <Text style={s.rosterJerseyBadgeText}>#{player.jersey_number}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderScheduleEvent = ({ item: event }: { item: ScheduleEvent }) => {
    const { dayOfWeek, month, day } = formatEventDate(event.event_date);
    const eventType = event.event_type || 'event';
    const isGame = eventType.toLowerCase().includes('game') || eventType.toLowerCase().includes('match');

    return (
      <View style={s.eventCard}>
        <View style={s.eventDateBlock}>
          <Text style={s.eventDayOfWeek}>{dayOfWeek}</Text>
          <Text style={s.eventDay}>{day}</Text>
          <Text style={s.eventMonth}>{month}</Text>
        </View>
        <View style={s.eventInfo}>
          <View style={s.eventTypeRow}>
            <View style={[s.eventTypeBadge, { backgroundColor: isGame ? colors.danger + '20' : colors.info + '20' }]}>
              <Ionicons
                name={isGame ? 'trophy' : 'fitness'}
                size={12}
                color={isGame ? colors.danger : colors.info}
              />
              <Text style={[s.eventTypeText, { color: isGame ? colors.danger : colors.info }]}>
                {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
              </Text>
            </View>
          </View>
          {event.title && <Text style={s.eventTitle}>{event.title}</Text>}
          {event.opponent_name && (
            <Text style={s.eventOpponent}>vs {event.opponent_name}</Text>
          )}
          <View style={s.eventMetaRow}>
            {event.start_time && (
              <View style={s.eventMetaItem}>
                <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                <Text style={s.eventMetaText}>
                  {formatTime(event.start_time)}
                  {event.end_time ? ` - ${formatTime(event.end_time)}` : ''}
                </Text>
              </View>
            )}
            {event.location && (
              <View style={s.eventMetaItem}>
                <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                <Text style={s.eventMetaText} numberOfLines={1}>{event.location}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => {
            if (params.teamId) {
              router.back();
            } else {
              setTeamId(null);
              setTeam(null);
              setPosts([]);
              setRoster([]);
              setEvents([]);
            }
          }}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Team Wall</Text>
        <View style={s.backBtn} />
      </View>

      {/* Team Banner */}
      <View style={[s.teamBanner, { borderLeftColor: teamColor }]}>
        <View style={[s.teamBannerStripe, { backgroundColor: teamColor }]} />
        <View style={s.teamBannerContent}>
          <Text style={s.teamBannerName}>{team?.name || 'Loading...'}</Text>
          <View style={s.teamBannerStats}>
            <View style={s.teamBannerStat}>
              <Ionicons name="people" size={14} color={colors.textSecondary} />
              <Text style={s.teamBannerStatText}>{playerCount} Players</Text>
            </View>
            <View style={s.teamBannerStatDivider} />
            <View style={s.teamBannerStat}>
              <Ionicons name="school" size={14} color={colors.textSecondary} />
              <Text style={s.teamBannerStatText}>{coachCount} Coaches</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={s.tabBar}>
        {(['feed', 'roster', 'schedule'] as TabKey[]).map((tab) => {
          const isActive = activeTab === tab;
          const tabIcons: Record<TabKey, keyof typeof Ionicons.glyphMap> = {
            feed: 'newspaper',
            roster: 'people',
            schedule: 'calendar',
          };
          const tabLabels: Record<TabKey, string> = {
            feed: 'Feed',
            roster: 'Roster',
            schedule: 'Schedule',
          };
          return (
            <TouchableOpacity
              key={tab}
              style={[s.tab, isActive && [s.tabActive, { borderBottomColor: teamColor }]]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tabIcons[tab]}
                size={18}
                color={isActive ? teamColor : colors.textMuted}
              />
              <Text style={[s.tabLabel, isActive && { color: teamColor, fontWeight: '600' }]}>
                {tabLabels[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      {activeTab === 'feed' && (
        <View style={s.tabContent}>
          {loadingPosts && posts.length === 0 ? (
            <View style={s.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : posts.length === 0 ? (
            <ScrollView
              style={s.tabContent}
              contentContainerStyle={s.centeredScroll}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingFeed}
                  onRefresh={handleRefreshFeed}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
            >
              <Ionicons name="newspaper-outline" size={56} color={colors.textMuted} />
              <Text style={s.emptyTitle}>No Posts Yet</Text>
              <Text style={s.emptySubtitle}>
                {isCoachOrAdmin
                  ? 'Be the first to post an update for your team!'
                  : 'Check back later for team updates.'}
              </Text>
            </ScrollView>
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={renderPostCard}
              contentContainerStyle={s.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingFeed}
                  onRefresh={handleRefreshFeed}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Floating Action Button for New Post (coaches/admins only) */}
          {isCoachOrAdmin && (
            <TouchableOpacity
              style={[s.fab, { backgroundColor: teamColor }]}
              onPress={() => setShowNewPostModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {activeTab === 'roster' && (
        <View style={s.tabContent}>
          {loadingRoster ? (
            <View style={s.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : roster.length === 0 ? (
            <View style={s.centered}>
              <Ionicons name="people-outline" size={56} color={colors.textMuted} />
              <Text style={s.emptyTitle}>No Players</Text>
              <Text style={s.emptySubtitle}>No players have been added to this team yet.</Text>
            </View>
          ) : (
            <FlatList
              data={roster}
              keyExtractor={(item) => item.id}
              renderItem={renderRosterPlayer}
              contentContainerStyle={s.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {activeTab === 'schedule' && (
        <View style={s.tabContent}>
          {loadingSchedule ? (
            <View style={s.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : events.length === 0 ? (
            <View style={s.centered}>
              <Ionicons name="calendar-outline" size={56} color={colors.textMuted} />
              <Text style={s.emptyTitle}>No Upcoming Events</Text>
              <Text style={s.emptySubtitle}>No scheduled events found for this team.</Text>
            </View>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              renderItem={renderScheduleEvent}
              contentContainerStyle={s.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* New Post Modal */}
      <Modal visible={showNewPostModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Post</Text>
              <TouchableOpacity onPress={() => setShowNewPostModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalScroll} keyboardShouldPersistTaps="handled">
              {/* Post Type Selector */}
              <Text style={s.modalLabel}>Post Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.postTypeScroller}
                contentContainerStyle={s.postTypeScrollContent}
              >
                {POST_TYPES.map((pt) => {
                  const config = POST_TYPE_CONFIG[pt];
                  const isSelected = newPostType === pt;
                  return (
                    <TouchableOpacity
                      key={pt}
                      style={[
                        s.postTypeOption,
                        isSelected && { backgroundColor: config.color + '20', borderColor: config.color },
                      ]}
                      onPress={() => setNewPostType(pt)}
                    >
                      <Ionicons name={config.icon} size={16} color={isSelected ? config.color : colors.textMuted} />
                      <Text style={[s.postTypeOptionText, isSelected && { color: config.color }]}>
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Title */}
              <Text style={s.modalLabel}>Title (optional)</Text>
              <TextInput
                style={s.modalInput}
                value={newPostTitle}
                onChangeText={setNewPostTitle}
                placeholder="Post title..."
                placeholderTextColor={colors.textMuted}
                maxLength={200}
              />

              {/* Content */}
              <Text style={s.modalLabel}>Content</Text>
              <TextInput
                style={[s.modalInput, s.modalTextArea]}
                value={newPostContent}
                onChangeText={setNewPostContent}
                placeholder="What's happening with the team?"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={s.charCount}>
                {newPostContent.length}/2000
              </Text>
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity
                style={[s.cancelBtn]}
                onPress={() => setShowNewPostModal(false)}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.submitBtn, { backgroundColor: teamColor }, submittingPost && { opacity: 0.5 }]}
                onPress={handleSubmitPost}
                disabled={submittingPost || !newPostContent.trim()}
              >
                {submittingPost ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={s.submitBtnText}>Post</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    // Layout
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    centeredScroll: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textMuted,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
    },

    // Team Picker
    pickerLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: 16,
    },
    teamPickerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      marginBottom: 10,
      overflow: 'hidden',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 6 },
      }),
    },
    teamPickerStripe: {
      width: 5,
      alignSelf: 'stretch',
    },
    teamPickerInfo: {
      flex: 1,
      paddingVertical: 18,
      paddingHorizontal: 16,
    },
    teamPickerName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },

    // Team Banner
    teamBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderLeftWidth: 4,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 16,
      overflow: 'hidden',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 6 },
      }),
    },
    teamBannerStripe: {
      width: 0,
    },
    teamBannerContent: {
      flex: 1,
      padding: 16,
    },
    teamBannerName: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    teamBannerStats: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    teamBannerStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    teamBannerStatText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    teamBannerStatDivider: {
      width: 1,
      height: 14,
      backgroundColor: colors.border,
      marginHorizontal: 12,
    },

    // Tab Bar
    tabBar: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomWidth: 2,
    },
    tabLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
    tabContent: {
      flex: 1,
    },
    listContent: {
      padding: 16,
      paddingBottom: 100,
    },

    // Empty states
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 20,
    },

    // Post Cards
    postCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 6 },
      }),
    },
    pinnedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 10,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
    },
    pinnedText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.warning,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
    postHeaderInfo: {
      flex: 1,
      marginLeft: 10,
    },
    postAuthor: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    postTimestamp: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },
    postTypeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    postTypeBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    postTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    postContent: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    postFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
    },
    likeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
    },
    likeButtonActive: {
      backgroundColor: colors.danger + '15',
    },
    likeCount: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
    },

    // Roster Cards
    rosterCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 6 },
      }),
    },
    rosterAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rosterJerseyNumber: {
      fontSize: 14,
      fontWeight: '800',
      color: '#fff',
    },
    rosterInfo: {
      flex: 1,
      marginLeft: 12,
    },
    rosterName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rosterPosition: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    rosterJerseyBadge: {
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    rosterJerseyBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },

    // Schedule Event Cards
    eventCard: {
      flexDirection: 'row',
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 10,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 6 },
      }),
    },
    eventDateBlock: {
      width: 64,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      backgroundColor: colors.bgSecondary,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    eventDayOfWeek: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    eventDay: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      marginVertical: 1,
    },
    eventMonth: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    eventInfo: {
      flex: 1,
      padding: 12,
    },
    eventTypeRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    eventTypeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    eventTypeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    eventTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    eventOpponent: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 4,
    },
    eventMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 4,
    },
    eventMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    eventMetaText: {
      fontSize: 12,
      color: colors.textMuted,
    },

    // FAB
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
        android: { elevation: 8 },
      }),
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.glassCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderBottomWidth: 0,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    modalScroll: {
      padding: 24,
    },
    modalLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
      marginTop: 12,
    },
    postTypeScroller: {
      marginBottom: 4,
    },
    postTypeScrollContent: {
      gap: 8,
    },
    postTypeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    postTypeOptionText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
    },
    modalInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTextArea: {
      minHeight: 120,
    },
    charCount: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'right',
      marginTop: 4,
    },
    modalFooter: {
      flexDirection: 'row',
      padding: 24,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelBtn: {
      flex: 1,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    submitBtn: {
      flex: 1,
      flexDirection: 'row',
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    submitBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
  });
