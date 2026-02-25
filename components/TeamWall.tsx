import EmojiPicker from '@/components/EmojiPicker';
import { getPositionInfo } from '@/constants/sport-display';
import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { pickImage, takePhoto, uploadMedia } from '@/lib/media-utils';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTeamContext } from '@/lib/team-context';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
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
  banner_url: string | null;
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
  media_urls?: string[] | null;
  is_pinned: boolean;
  is_published: boolean;
  reaction_count: number;
  comment_count?: number;
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

type PostType = 'text' | 'announcement' | 'game_recap' | 'shoutout' | 'milestone' | 'photo';

type ReactionType = 'like' | 'heart' | 'fire' | 'clap' | 'muscle' | 'volleyball' | (string & {});

type TabKey = 'feed' | 'roster' | 'schedule' | (string & {});

// =============================================================================
// PROPS
// =============================================================================

type AdditionalTab = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  render: () => React.ReactNode;
};

type TeamWallProps = {
  teamId?: string | null;
  embedded?: boolean;
  feedOnly?: boolean;
  additionalTabs?: AdditionalTab[];
};

// =============================================================================
// CONSTANTS
// =============================================================================

const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  text: { label: 'Post', color: '#64748B', icon: 'chatbubble' },
  announcement: { label: 'Announcement', color: '#F97316', icon: 'megaphone' },
  game_recap: { label: 'Game Recap', color: '#10B981', icon: 'trophy' },
  shoutout: { label: 'Shoutout', color: '#A855F7', icon: 'heart' },
  milestone: { label: 'Milestone', color: '#F59E0B', icon: 'ribbon' },
  photo: { label: 'Photo', color: '#3B82F6', icon: 'camera' },
};

const POST_TYPES: PostType[] = ['text', 'announcement', 'game_recap', 'shoutout', 'milestone', 'photo'];

const REACTION_CONFIG: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'heart', emoji: '❤️', label: 'Heart' },
  { type: 'clap', emoji: '👏', label: 'Clap' },
  { type: 'muscle', emoji: '💪', label: 'Muscle' },
  { type: 'volleyball', emoji: '🏐', label: 'Volleyball' },
];

const AVATAR_COLORS = [
  '#F97316', '#10B981', '#3B82F6', '#A855F7', '#EF4444',
  '#F59E0B', '#0EA5E9', '#EC4899', '#14B8A6', '#8B5CF6',
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.round(SCREEN_HEIGHT * 0.37);
const COMPACT_HEADER_HEIGHT = 56;
const TAB_BAR_HEIGHT = 48;

// =============================================================================
// HELPERS
// =============================================================================

const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name: string | null): string => {
  if (!name) return '?';
  return name
    .trim()
    .split(' ')
    .map((w) => w.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
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
// ANIMATED REACTION BUTTON
// =============================================================================

const ReactionButton = ({
  emoji,
  isActive,
  activeBg,
  borderColor,
  onPress,
}: {
  emoji: string;
  isActive: boolean;
  activeBg: string;
  borderColor: string;
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: isActive ? activeBg : borderColor,
          backgroundColor: isActive ? activeBg + '15' : 'transparent',
        },
      ]}
    >
      <Animated.Text style={[{ fontSize: 18 }, { transform: [{ scale: scaleAnim }] }]}>
        {emoji}
      </Animated.Text>
    </TouchableOpacity>
  );
};

// =============================================================================
// SKELETON LOADING
// =============================================================================

const SkeletonPostCard = ({ colors }: { colors: any }) => (
  <View
    style={{
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.06)',
      borderRadius: 16,
      marginBottom: 14,
      padding: 16,
      overflow: 'hidden',
    }}
  >
    {/* Header skeleton */}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary }} />
      <View style={{ marginLeft: 10, flex: 1 }}>
        <View style={{ width: 120, height: 14, borderRadius: 4, backgroundColor: colors.bgSecondary, marginBottom: 6 }} />
        <View style={{ width: 60, height: 10, borderRadius: 4, backgroundColor: colors.bgSecondary }} />
      </View>
      <View style={{ width: 70, height: 22, borderRadius: 8, backgroundColor: colors.bgSecondary }} />
    </View>
    {/* Content skeleton */}
    <View style={{ width: '100%', height: 14, borderRadius: 4, backgroundColor: colors.bgSecondary, marginBottom: 8 }} />
    <View style={{ width: '80%', height: 14, borderRadius: 4, backgroundColor: colors.bgSecondary, marginBottom: 8 }} />
    <View style={{ width: '60%', height: 14, borderRadius: 4, backgroundColor: colors.bgSecondary, marginBottom: 16 }} />
    {/* Reaction bar skeleton */}
    <View style={{ flexDirection: 'row', gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 10 }}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={{ width: 36, height: 30, borderRadius: 15, backgroundColor: colors.bgSecondary }} />
      ))}
    </View>
  </View>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TeamWall({ teamId: propTeamId, embedded = false, feedOnly = false, additionalTabs = [] }: TeamWallProps) {
  const { colors } = useTheme();
  const { user, profile, isAdmin } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const { selectedTeamId: contextTeamId } = useTeamContext();

  // Resolve team ID: prop > context (embedded) > null (show picker)
  const resolvedTeamId = propTeamId || (embedded ? contextTeamId : null);

  // Team state
  const [teamId, setTeamId] = useState<string | null>(resolvedTeamId);
  const [team, setTeam] = useState<Team | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [coachCount, setCoachCount] = useState(0);
  const [isCoachOrAdmin, setIsCoachOrAdmin] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(!resolvedTeamId);
  const [teamSportName, setTeamSportName] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('feed');

  // Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshingFeed, setRefreshingFeed] = useState(false);
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionPickerPostId, setReactionPickerPostId] = useState<string | null>(null);

  // New post modal
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<PostType>('text');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [postMediaUrls, setPostMediaUrls] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Roster state
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Schedule state
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Fullscreen image viewer
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Post actions menu (admin/coach moderation)
  const [showPostActions, setShowPostActions] = useState<string | null>(null);

  // New posts pill
  const [newPostsCount, setNewPostsCount] = useState(0);
  const feedListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Force feed tab when feedOnly mode
  useEffect(() => {
    if (feedOnly) setActiveTab('feed');
  }, [feedOnly]);

  // Sync resolved team ID when context changes (embedded mode)
  useEffect(() => {
    if (embedded && contextTeamId && contextTeamId !== teamId) {
      setTeamId(contextTeamId);
      setTeam(null);
      setPosts([]);
      setRoster([]);
      setEvents([]);
      setNewPostsCount(0);
    }
  }, [contextTeamId, embedded]);

  // =============================================================================
  // TEAM PICKER - Load user's teams if no teamId provided
  // =============================================================================

  useEffect(() => {
    if (!teamId && user?.id) {
      loadUserTeams();
    }
  }, [user?.id, teamId]);

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

  // =============================================================================
  // REAL-TIME SUBSCRIPTION
  // =============================================================================

  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel(`team-wall-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_posts',
          filter: `team_id=eq.${teamId}`,
        },
        async (payload) => {
          const newPost = payload.new as any;
          if (newPost && newPost.is_published && newPost.author_id !== user?.id) {
            // Show "new posts" pill instead of auto-inserting
            setNewPostsCount((prev) => prev + 1);
          } else if (newPost && newPost.is_published && newPost.author_id === user?.id) {
            // Own post — add directly
            if (!posts.find((p) => p.id === newPost.id)) {
              const { data: authorProfile } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', newPost.author_id)
                .single();
              const postWithProfile: Post = {
                ...newPost,
                profiles: authorProfile || null,
                reaction_count: 0,
                comment_count: 0,
              };
              setPosts((prev) => [postWithProfile, ...prev]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, user?.id]);

  const loadUserTeams = async () => {
    if (!user?.id) return;
    setLoadingTeams(true);
    try {
      const { data: staffTeams } = await supabase
        .from('team_staff')
        .select('team_id, teams(id, name, color, season_id, banner_url)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const { data: playerTeams } = await supabase
        .from('team_players')
        .select('team_id, teams(id, name, color, season_id, banner_url)')
        .eq('player_id', user.id);

      const teamsMap = new Map<string, Team>();

      if (staffTeams) {
        for (const row of staffTeams) {
          const t = row.teams as any;
          if (t) teamsMap.set(t.id, { id: t.id, name: t.name, color: t.color, season_id: t.season_id, banner_url: t.banner_url || null });
        }
      }

      if (playerTeams) {
        for (const row of playerTeams) {
          const t = row.teams as any;
          if (t && !teamsMap.has(t.id)) {
            teamsMap.set(t.id, { id: t.id, name: t.name, color: t.color, season_id: t.season_id, banner_url: t.banner_url || null });
          }
        }
      }

      if (isAdmin && workingSeason?.id && teamsMap.size === 0) {
        const { data: allTeams } = await supabase
          .from('teams')
          .select('id, name, color, season_id, banner_url')
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

      if (teamList.length === 1) {
        setTeamId(teamList[0].id);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading user teams:', error);
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
        .select('id, name, color, season_id, banner_url')
        .eq('id', teamId)
        .single();

      if (teamData) {
        setTeam(teamData);
        // Detect sport via season
        if ((teamData as any).season_id) {
          const { data: seasonData } = await supabase
            .from('seasons')
            .select('sport')
            .eq('id', (teamData as any).season_id)
            .single();
          setTeamSportName((seasonData as any)?.sport || null);
        }
      }

      const { count: pCount } = await supabase
        .from('team_players')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);
      setPlayerCount(pCount || 0);

      const { count: cCount } = await supabase
        .from('team_staff')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('is_active', true);
      setCoachCount(cCount || 0);
    } catch (error) {
      if (__DEV__) console.error('Error loading team details:', error);
    }
  };

  const checkUserPermissions = async () => {
    if (!user?.id || !teamId) return;
    try {
      const { data: staffRecord } = await supabase
        .from('team_staff')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'league_admin')
        .eq('is_active', true)
        .maybeSingle();

      setIsCoachOrAdmin(!!staffRecord || !!adminRole || isAdmin);
    } catch (error) {
      if (__DEV__) console.error('Error checking permissions:', error);
    }
  };

  // =============================================================================
  // FEED TAB
  // =============================================================================

  const loadPosts = async () => {
    if (!teamId) return;
    setLoadingPosts(true);
    try {
      const { data } = await supabase
        .from('team_posts')
        .select('*, profiles:author_id(id, full_name, avatar_url)')
        .eq('team_id', teamId)
        .eq('is_published', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30);

      const postsData = (data as Post[]) || [];
      setPosts(postsData);

      // Load user's reactions for these posts
      if (user?.id && postsData.length > 0) {
        const postIds = postsData.map((p) => p.id);
        const { data: reactions } = await supabase
          .from('team_post_reactions')
          .select('post_id, reaction_type')
          .eq('user_id', user.id)
          .in('post_id', postIds);

        if (reactions) {
          const reactionsMap: Record<string, string> = {};
          for (const r of reactions) {
            reactionsMap[r.post_id] = r.reaction_type;
          }
          setUserReactions(reactionsMap);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleRefreshFeed = useCallback(async () => {
    setRefreshingFeed(true);
    setNewPostsCount(0);
    await loadPosts();
    setRefreshingFeed(false);
  }, [teamId]);

  const handleNewPostsTap = useCallback(() => {
    setNewPostsCount(0);
    loadPosts();
    feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [teamId]);

  const handleReaction = async (postId: string, reactionType: ReactionType) => {
    if (!user?.id) return;

    const currentReaction = userReactions[postId];
    const isRemoving = currentReaction === reactionType;

    // Optimistic update
    const prevReactions = { ...userReactions };
    const prevPosts = [...posts];
    const newReactions = { ...userReactions };
    const updatedPosts = posts.map((p) => {
      if (p.id === postId) {
        let delta = 0;
        if (isRemoving) {
          delta = -1;
        } else if (currentReaction) {
          delta = 0;
        } else {
          delta = 1;
        }
        return { ...p, reaction_count: Math.max(0, (p.reaction_count || 0) + delta) };
      }
      return p;
    });

    if (isRemoving) {
      delete newReactions[postId];
    } else {
      newReactions[postId] = reactionType;
    }
    setUserReactions(newReactions);
    setPosts(updatedPosts);

    try {
      if (isRemoving) {
        await supabase
          .from('team_post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else if (currentReaction) {
        await supabase
          .from('team_post_reactions')
          .update({ reaction_type: reactionType })
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('team_post_reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType,
          });
      }
    } catch (error) {
      if (__DEV__) console.error('Error toggling reaction:', error);
      setUserReactions(prevReactions);
      setPosts(prevPosts);
    }
  };

  const handleUploadCoverPhoto = async () => {
    const media = await pickImage();
    if (!media || !teamId) return;
    const url = await uploadMedia(media, `team-banners/${teamId}`, 'media');
    if (url) {
      const { error } = await supabase
        .from('teams')
        .update({ banner_url: url })
        .eq('id', teamId);
      if (!error) {
        setTeam(prev => prev ? { ...prev, banner_url: url } : prev);
      } else {
        Alert.alert('Error', 'Failed to update cover photo.');
      }
    } else {
      Alert.alert('Error', 'Failed to upload cover photo.');
    }
  };

  const handleAddPostPhoto = async (source: 'library' | 'camera') => {
    setUploadingMedia(true);
    const media = source === 'library' ? await pickImage() : await takePhoto();
    if (!media || !teamId) { setUploadingMedia(false); return; }
    const url = await uploadMedia(media, `team-wall/${teamId}`, 'media');
    if (url) {
      setPostMediaUrls(prev => [...prev, url]);
    } else {
      Alert.alert('Error', 'Failed to upload photo.');
    }
    setUploadingMedia(false);
  };

  const handleSubmitPost = async () => {
    if (!teamId || !user?.id || (!newPostContent.trim() && postMediaUrls.length === 0)) {
      Alert.alert('Error', 'Please enter post content or add a photo.');
      return;
    }

    setSubmittingPost(true);
    try {
      const effectiveType = postMediaUrls.length > 0 && newPostType === 'text' ? 'photo' : newPostType;
      const insertPayload: any = {
        team_id: teamId,
        author_id: user.id,
        title: null,
        content: newPostContent.trim() || null,
        post_type: effectiveType,
        media_urls: postMediaUrls.length > 0 ? postMediaUrls : null,
        is_pinned: false,
        is_published: true,
      };

      const { data, error } = await supabase
        .from('team_posts')
        .insert(insertPayload)
        .select('*, profiles:author_id(id, full_name, avatar_url)')
        .single();

      if (error) throw error;

      if (data) {
        setPosts((prev) => [{ ...data, reaction_count: 0, comment_count: 0 } as Post, ...prev]);
      }

      setNewPostContent('');
      setNewPostType('text');
      setPostMediaUrls([]);
      setShowNewPostModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post.');
    } finally {
      setSubmittingPost(false);
    }
  };

  // =============================================================================
  // POST MODERATION (Admin/Coach)
  // =============================================================================

  const handleDeletePost = (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('team_posts')
                .delete()
                .eq('id', postId);
              if (error) throw error;
              // Optimistic remove
              setPosts(prev => prev.filter(p => p.id !== postId));
              setShowPostActions(null);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const handleTogglePin = async (post: any) => {
    try {
      const { error } = await supabase
        .from('team_posts')
        .update({ is_pinned: !post.is_pinned })
        .eq('id', post.id);
      if (error) throw error;
      // Optimistic update
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: !p.is_pinned } : p));
      setShowPostActions(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update pin status');
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
          if (a.jersey_number !== null && b.jersey_number !== null) {
            return a.jersey_number - b.jersey_number;
          }
          if (a.jersey_number !== null) return -1;
          if (b.jersey_number !== null) return 1;
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        });

      setRoster(players);
    } catch (error) {
      if (__DEV__) console.error('Error loading roster:', error);
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
      if (__DEV__) console.error('Error loading schedule:', error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // =============================================================================
  // STYLES + DERIVED
  // =============================================================================

  const s = createStyles(colors);
  const teamColor = team?.color || colors.primary;
  const teamSport = teamSportName;

  // =============================================================================
  // TEAM PICKER VIEW (no team selected)
  // =============================================================================

  if (!teamId) {
    const Wrapper = embedded ? View : SafeAreaView;
    return (
      <Wrapper style={s.container}>
        {/* Header */}
        {!embedded && (
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Team Wall</Text>
            <View style={s.backBtn} />
          </View>
        )}

        {loadingTeams ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s.loadingText}>Loading teams...</Text>
          </View>
        ) : userTeams.length === 0 ? (
          <View style={s.centered}>
            <Ionicons name="people-outline" size={64} color={colors.primary + '40'} />
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
      </Wrapper>
    );
  }

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderPostCard = ({ item: post }: { item: Post }) => {
    const authorName = post.profiles?.full_name || 'Unknown';
    const initials = getInitials(authorName);
    const avatarColor = getAvatarColor(authorName);
    const typeConfig = POST_TYPE_CONFIG[post.post_type as PostType] || POST_TYPE_CONFIG.text;
    const currentUserReaction = userReactions[post.id];
    const isAnnouncement = post.post_type === 'announcement';
    const isCoachPost = isAnnouncement;

    return (
      <View
        style={[
          s.postCard,
          isAnnouncement && { borderLeftWidth: 4, borderLeftColor: '#F97316' },
        ]}
      >
        {/* Pinned indicator */}
        {post.is_pinned && (
          <View style={s.pinnedBanner}>
            <Ionicons name="pin" size={14} color="#F59E0B" />
            <Text style={s.pinnedText}>Pinned Post</Text>
          </View>
        )}

        {/* Post header: avatar + name + COACH badge + time ago + type badge */}
        <View style={s.postHeader}>
          {post.profiles?.avatar_url ? (
            <Image source={{ uri: post.profiles.avatar_url }} style={s.postAvatar} />
          ) : (
            <View style={[s.postAvatar, { backgroundColor: avatarColor }]}>
              <Text style={s.postAvatarText}>{initials}</Text>
            </View>
          )}
          <View style={s.postHeaderInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.postAuthor}>{authorName}</Text>
              {isCoachPost && (
                <View style={s.coachBadge}>
                  <Ionicons name="shield-checkmark" size={10} color="#F97316" />
                  <Text style={s.coachBadgeText}>COACH</Text>
                </View>
              )}
            </View>
            <Text style={s.postTimestamp}>{formatTimestamp(post.created_at)}</Text>
          </View>
          <View style={[s.postTypeBadge, { backgroundColor: typeConfig.color + '20' }]}>
            <Ionicons name={typeConfig.icon} size={12} color={typeConfig.color} />
            <Text style={[s.postTypeBadgeText, { color: typeConfig.color }]}>
              {typeConfig.label}
            </Text>
          </View>
          {isCoachOrAdmin && (
            <TouchableOpacity
              onPress={() => setShowPostActions(showPostActions === post.id ? null : post.id)}
              style={{ padding: 6, marginLeft: 4 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Post actions dropdown (admin/coach moderation) */}
        {isCoachOrAdmin && showPostActions === post.id && (
          <View style={{
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}>
            <TouchableOpacity
              onPress={() => handleTogglePin(post)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.primary + '15',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Ionicons name={post.is_pinned ? 'pin-outline' : 'pin'} size={16} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                {post.is_pinned ? 'Unpin' : 'Pin'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeletePost(post.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#FF3B3015',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Ionicons name="trash-outline" size={16} color="#FF3B30" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#FF3B30' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Post content */}
        {post.title && <Text style={s.postTitle}>{post.title}</Text>}
        <Text style={s.postContent}>{post.content}</Text>

        {/* Photo(s) - full width, tappable for fullscreen */}
        {post.media_urls && post.media_urls.length > 0 && (
          <TouchableOpacity
            style={s.postImageContainer}
            onPress={() => setFullscreenImage(post.media_urls![0])}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: post.media_urls[0] }}
              style={s.postImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {/* Animated reaction bar */}
        <View style={s.postFooter}>
          <View style={s.reactionBar}>
            {REACTION_CONFIG.map((reaction) => (
              <ReactionButton
                key={reaction.type}
                emoji={reaction.emoji}
                isActive={currentUserReaction === reaction.type}
                activeBg={teamColor}
                borderColor={colors.border}
                onPress={() => handleReaction(post.id, reaction.type)}
              />
            ))}
            <ReactionButton
              emoji="➕"
              isActive={false}
              activeBg={teamColor}
              borderColor={colors.border}
              onPress={() => { setReactionPickerPostId(post.id); setShowReactionPicker(true); }}
            />
          </View>

          <View style={s.postStats}>
            {(post.reaction_count || 0) > 0 && (
              <Text style={s.postStatText}>
                {post.reaction_count} {post.reaction_count === 1 ? 'reaction' : 'reactions'}
              </Text>
            )}
            {(post.comment_count || 0) > 0 && (
              <TouchableOpacity style={s.commentLink}>
                <Ionicons name="chatbubble-outline" size={13} color={colors.textMuted} />
                <Text style={s.postStatText}>
                  {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderRosterPlayer = ({ item: player }: { item: RosterPlayer }) => {
    const fullName = `${player.first_name} ${player.last_name}`;
    const initials = getInitials(player.first_name);
    const avatarColor = getAvatarColor(fullName);

    return (
      <TouchableOpacity
        style={s.rosterCard}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/child-detail', params: { playerId: player.id } } as any)}
      >
        {player.photo_url ? (
          <Image source={{ uri: player.photo_url }} style={{ width: 44, height: 44, borderRadius: 22 }} />
        ) : (
          <View style={[s.rosterAvatar, { backgroundColor: avatarColor }]}>
            {player.jersey_number !== null ? (
              <Text style={s.rosterJerseyNumber}>#{player.jersey_number}</Text>
            ) : (
              <Text style={s.postAvatarText}>{initials}</Text>
            )}
          </View>
        )}
        <View style={s.rosterInfo}>
          <Text style={s.rosterName}>{fullName}</Text>
          {player.position && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <View style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: getPositionInfo(player.position, teamSport)?.color || colors.textMuted,
              }} />
              <Text style={s.rosterPosition}>{player.position}</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const renderScheduleEvent = ({ item: event }: { item: ScheduleEvent }) => {
    const { dayOfWeek, month, day } = formatEventDate(event.event_date);
    const eventType = event.event_type || 'event';
    const isGame = eventType.toLowerCase().includes('game') || eventType.toLowerCase().includes('match');

    return (
      <View style={s.eventCard}>
        <View style={[s.eventDateBlock, { backgroundColor: teamColor + '10' }]}>
          <Text style={[s.eventDayOfWeek, { color: teamColor }]}>{dayOfWeek}</Text>
          <Text style={[s.eventDay, { color: teamColor }]}>{day}</Text>
          <Text style={[s.eventMonth, { color: teamColor }]}>{month}</Text>
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
            <Text style={[s.eventOpponent, { color: teamColor }]}>vs {event.opponent_name}</Text>
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
  // RENDER HELPER: Hero Section
  // =============================================================================

  const renderHeroSection = () => {
    if (feedOnly) return null;
    return (
      <View style={s.heroContainer}>
        {team?.banner_url ? (
          <Image source={{ uri: team.banner_url }} style={s.heroCoverImage} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[teamColor, teamColor + 'B0', teamColor + '40']}
            style={s.heroCoverImage}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={s.heroFallbackInitials}>
              {team?.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.65)']}
          style={s.heroGradientOverlay}
        />
        {!embedded && (
          <TouchableOpacity
            style={s.heroBackBtn}
            onPress={() => {
              if (propTeamId) {
                router.back();
              } else {
                setTeamId(null);
                setTeam(null);
                setPosts([]);
                setRoster([]);
                setEvents([]);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        {isCoachOrAdmin && (
          <TouchableOpacity
            style={s.heroCameraBtn}
            onPress={handleUploadCoverPhoto}
            activeOpacity={0.7}
          >
            <Ionicons name="camera" size={18} color="#fff" />
          </TouchableOpacity>
        )}
        <View style={s.heroInfoOverlay}>
          <Text style={s.heroTeamName}>{team?.name || 'Loading...'}</Text>
          <Text style={s.heroTeamMeta}>
            {playerCount} Players {'\u00B7'} {coachCount} Coaches
          </Text>
          <View style={s.heroPillRow}>
            <TouchableOpacity style={s.heroPill} activeOpacity={0.7}>
              <Ionicons name="images-outline" size={14} color="#fff" />
              <Text style={s.heroPillText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.heroPill}
              activeOpacity={0.7}
              onPress={() => {
                if (isCoachOrAdmin) {
                  router.push('/standings' as any);
                } else {
                  setActiveTab('schedule');
                }
              }}
            >
              <Ionicons
                name={isCoachOrAdmin ? 'stats-chart-outline' : 'calendar-outline'}
                size={14}
                color="#fff"
              />
              <Text style={s.heroPillText}>
                {isCoachOrAdmin ? 'Stats' : 'Schedule'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // =============================================================================
  // RENDER HELPER: Tab Bar
  // =============================================================================

  const renderTabBar = () => {
    if (feedOnly) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBarScroll} contentContainerStyle={s.tabBar}>
        {([
          { key: 'feed', label: 'Feed', icon: 'newspaper' as keyof typeof Ionicons.glyphMap },
          { key: 'roster', label: 'Roster', icon: 'people' as keyof typeof Ionicons.glyphMap },
          { key: 'schedule', label: 'Schedule', icon: 'calendar' as keyof typeof Ionicons.glyphMap },
          ...additionalTabs.map(t => ({ key: t.key, label: t.label, icon: t.icon })),
        ]).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, isActive && [s.tabActive, { borderBottomColor: teamColor }]]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={isActive ? teamColor : colors.textMuted}
              />
              <Text style={[s.tabLabel, isActive && { color: teamColor, fontWeight: '600' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  // =============================================================================
  // RENDER HELPER: Feed Composer
  // =============================================================================

  const renderFeedHeader = () => (
    <View>
      {isCoachOrAdmin && (
        <TouchableOpacity
          style={s.composeCard}
          onPress={() => setShowNewPostModal(true)}
          activeOpacity={0.7}
        >
          <View style={[s.composeAvatar, { backgroundColor: teamColor }]}>
            <Text style={s.composeAvatarText}>
              {getInitials(profile?.full_name || user?.email || null)}
            </Text>
          </View>
          <View style={s.composeInputMock}>
            <Text style={s.composeInputText}>What's on your mind?</Text>
          </View>
          <Ionicons name="create-outline" size={22} color={teamColor} />
        </TouchableOpacity>
      )}
    </View>
  );

  // Combines hero + tabs + optional feed composer into one list header
  const renderListHeaderFeed = () => (
    <View>
      {renderHeroSection()}
      {renderTabBar()}
      {renderFeedHeader()}
    </View>
  );

  const renderListHeaderOther = () => (
    <View>
      {renderHeroSection()}
      {renderTabBar()}
    </View>
  );

  // =============================================================================
  // Animated interpolations for sticky behavior
  // =============================================================================

  const stickyTabOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - TAB_BAR_HEIGHT, HERO_HEIGHT],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT, HERO_HEIGHT + 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // =============================================================================
  // Scroll handler
  // =============================================================================

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  const Wrapper = (embedded || feedOnly) ? View : SafeAreaView;

  return (
    <Wrapper style={s.container}>
      {/* Tab Content */}
      {(feedOnly || activeTab === 'feed') && (
        <View style={s.tabContent}>
          {loadingPosts && posts.length === 0 ? (
            <ScrollView
              style={s.tabContent}
              contentContainerStyle={s.listContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {renderListHeaderFeed()}
              <SkeletonPostCard colors={colors} />
              <SkeletonPostCard colors={colors} />
              <SkeletonPostCard colors={colors} />
            </ScrollView>
          ) : posts.length === 0 ? (
            <ScrollView
              style={s.tabContent}
              contentContainerStyle={s.emptyFeedScroll}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingFeed}
                  onRefresh={handleRefreshFeed}
                  tintColor={teamColor}
                  colors={[teamColor]}
                />
              }
            >
              {renderListHeaderFeed()}

              <View style={s.emptyStateContainer}>
                <Ionicons name="megaphone-outline" size={56} color={teamColor + '50'} />
                <Text style={s.emptyTitle}>
                  {isCoachOrAdmin
                    ? 'Your Team Wall Is Ready!'
                    : 'Stay Tuned!'}
                </Text>
                <Text style={s.emptySubtitle}>
                  {isCoachOrAdmin
                    ? 'Share updates, shoutouts, and game recaps to fire up your squad.'
                    : 'Coaches will post highlights, updates, and news here.'}
                </Text>
                {isCoachOrAdmin && (
                  <TouchableOpacity
                    style={[s.emptyCtaBtn, { backgroundColor: teamColor }]}
                    onPress={() => setShowNewPostModal(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create" size={18} color="#fff" />
                    <Text style={s.emptyCtaBtnText}>Create First Post</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              <FlatList
                ref={feedListRef}
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={renderPostCard}
                ListHeaderComponent={renderListHeaderFeed}
                contentContainerStyle={s.listContent}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshingFeed}
                    onRefresh={handleRefreshFeed}
                    tintColor={teamColor}
                    colors={[teamColor]}
                  />
                }
                showsVerticalScrollIndicator={false}
              />

              {/* "New Posts" floating pill */}
              {newPostsCount > 0 && (
                <TouchableOpacity
                  style={[s.newPostsPill, { backgroundColor: teamColor }]}
                  onPress={handleNewPostsTap}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-up" size={14} color="#fff" />
                  <Text style={s.newPostsPillText}>
                    {newPostsCount} new {newPostsCount === 1 ? 'post' : 'posts'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {!feedOnly && activeTab === 'roster' && (
        <View style={s.tabContent}>
          {loadingRoster ? (
            <ScrollView contentContainerStyle={s.listContent}>
              {renderListHeaderOther()}
              <View style={s.centered}>
                <ActivityIndicator size="large" color={teamColor} />
              </View>
            </ScrollView>
          ) : roster.length === 0 ? (
            <ScrollView contentContainerStyle={s.listContent}>
              {renderListHeaderOther()}
              <View style={s.centered}>
                <Ionicons name="people-outline" size={56} color={teamColor + '50'} />
                <Text style={s.emptyTitle}>Roster Loading</Text>
                <Text style={s.emptySubtitle}>Players will show up once the coach builds the roster.</Text>
              </View>
            </ScrollView>
          ) : (
            <FlatList
              data={roster}
              keyExtractor={(item) => item.id}
              renderItem={renderRosterPlayer}
              ListHeaderComponent={renderListHeaderOther}
              contentContainerStyle={s.listContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {!feedOnly && activeTab === 'schedule' && (
        <View style={s.tabContent}>
          {loadingSchedule ? (
            <ScrollView contentContainerStyle={s.listContent}>
              {renderListHeaderOther()}
              <View style={s.centered}>
                <ActivityIndicator size="large" color={teamColor} />
              </View>
            </ScrollView>
          ) : events.length === 0 ? (
            <ScrollView contentContainerStyle={s.listContent}>
              {renderListHeaderOther()}
              <View style={s.centered}>
                <Ionicons name="calendar-outline" size={56} color={teamColor + '50'} />
                <Text style={s.emptyTitle}>Schedule TBD</Text>
                <Text style={s.emptySubtitle}>Events will appear here once they're on the calendar.</Text>
              </View>
            </ScrollView>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              renderItem={renderScheduleEvent}
              ListHeaderComponent={renderListHeaderOther}
              contentContainerStyle={s.listContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* Additional tabs (e.g., Achievements, Stats for coaches) */}
      {!feedOnly && additionalTabs.map(tab => (
        activeTab === tab.key ? (
          <View key={tab.key} style={s.tabContent}>
            <ScrollView contentContainerStyle={s.listContent} onScroll={handleScroll} scrollEventThrottle={16}>
              {renderListHeaderOther()}
              {tab.render()}
            </ScrollView>
          </View>
        ) : null
      ))}

      {/* Compact sticky header — fades in when hero scrolled off */}
      {!feedOnly && (
        <Animated.View style={[s.compactHeader, { opacity: compactHeaderOpacity }]} pointerEvents="box-none">
          {team?.banner_url ? (
            <Image source={{ uri: team.banner_url }} style={s.compactHeaderThumb} />
          ) : (
            <View style={[s.compactHeaderThumb, { backgroundColor: teamColor }]}>
              <Text style={s.compactHeaderThumbText}>{team?.name?.charAt(0) || '?'}</Text>
            </View>
          )}
          <Text style={s.compactHeaderTitle} numberOfLines={1}>{team?.name}</Text>
        </Animated.View>
      )}

      {/* Sticky tab bar — fades in when original tabs scroll off */}
      {!feedOnly && (
        <Animated.View style={[s.stickyTabBar, { opacity: stickyTabOpacity }]}>
          {renderTabBar()}
        </Animated.View>
      )}

      {/* New Post Modal */}
      <Modal visible={showNewPostModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Create Post</Text>
              <TouchableOpacity onPress={() => { setShowNewPostModal(false); setPostMediaUrls([]); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalScroll} keyboardShouldPersistTaps="handled">
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
                        s.postTypeChip,
                        isSelected && { backgroundColor: config.color + '20', borderColor: config.color },
                      ]}
                      onPress={() => setNewPostType(pt)}
                    >
                      <Ionicons name={config.icon} size={14} color={isSelected ? config.color : colors.textMuted} />
                      <Text style={[s.postTypeChipText, isSelected && { color: config.color, fontWeight: '600' }]}>
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={s.modalLabel}>What's on your mind?</Text>
              <TextInput
                style={[s.modalInput, s.modalTextArea]}
                value={newPostContent}
                onChangeText={setNewPostContent}
                placeholder="Share something with your team..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={2000}
                autoFocus
              />
              <Text style={s.charCount}>
                {newPostContent.length}/2000
              </Text>

              {/* Photo upload section */}
              <Text style={s.modalLabel}>Photos (optional)</Text>
              {postMediaUrls.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {postMediaUrls.map((url, i) => (
                    <View key={i} style={s.photoPreviewWrap}>
                      <Image source={{ uri: url }} style={s.photoPreview} />
                      <TouchableOpacity
                        style={s.photoRemoveBtn}
                        onPress={() => setPostMediaUrls(prev => prev.filter((_, idx) => idx !== i))}
                      >
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  style={[s.postTypeChip, { flex: 1 }]}
                  onPress={() => handleAddPostPhoto('library')}
                  disabled={uploadingMedia}
                >
                  <Ionicons name="images" size={16} color={colors.primary} />
                  <Text style={[s.postTypeChipText, { color: colors.primary }]}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.postTypeChip, { flex: 1 }]}
                  onPress={() => handleAddPostPhoto('camera')}
                  disabled={uploadingMedia}
                >
                  <Ionicons name="camera" size={16} color={colors.primary} />
                  <Text style={[s.postTypeChipText, { color: colors.primary }]}>Camera</Text>
                </TouchableOpacity>
              </View>
              {uploadingMedia && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>Uploading photo...</Text>
                </View>
              )}
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setShowNewPostModal(false); setPostMediaUrls([]); }}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.submitBtn, { backgroundColor: teamColor }, submittingPost && { opacity: 0.5 }]}
                onPress={handleSubmitPost}
                disabled={submittingPost || (!newPostContent.trim() && postMediaUrls.length === 0)}
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

      {/* Fullscreen Image Viewer */}
      <Modal visible={!!fullscreenImage} animationType="fade" transparent>
        <View style={s.fullscreenOverlay}>
          <TouchableOpacity
            style={s.fullscreenCloseBtn}
            onPress={() => setFullscreenImage(null)}
          >
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={s.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
      {/* Emoji Picker for custom reactions */}
      <EmojiPicker
        visible={showReactionPicker}
        onClose={() => { setShowReactionPicker(false); setReactionPickerPostId(null); }}
        onSelect={(emoji) => {
          if (reactionPickerPostId) {
            handleReaction(reactionPickerPostId, emoji);
            setShowReactionPicker(false);
            setReactionPickerPostId(null);
          }
        }}
      />
    </Wrapper>
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
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textMuted,
    },

    // Hero Cover Photo
    heroContainer: {
      width: SCREEN_WIDTH,
      height: HERO_HEIGHT,
      position: 'relative',
    },
    heroCoverImage: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroGradientOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: HERO_HEIGHT * 0.6,
    },
    heroBackBtn: {
      position: 'absolute',
      top: 12,
      left: 12,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroCameraBtn: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroInfoOverlay: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
    },
    heroTeamName: {
      fontSize: 26,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    heroTeamMeta: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '500',
      marginBottom: 12,
    },
    heroPillRow: {
      flexDirection: 'row',
      gap: 10,
    },
    heroPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    heroPillText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    heroFallbackInitials: {
      fontSize: 64,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.25)',
      textAlign: 'center',
      lineHeight: HERO_HEIGHT,
    },

    // Compact sticky header (fades in on scroll)
    compactHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: COMPACT_HEADER_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      gap: 10,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      zIndex: 100,
    },
    compactHeaderThumb: {
      width: 30,
      height: 30,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    compactHeaderThumbText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#fff',
    },
    compactHeaderTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },

    // Sticky tab bar overlay
    stickyTabBar: {
      position: 'absolute',
      top: COMPACT_HEADER_HEIGHT,
      left: 0,
      right: 0,
      backgroundColor: colors.background,
      zIndex: 99,
    },

    // Team Picker header (back button + title)
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
      ...displayTextStyle,
      fontSize: 28,
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
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.06)',
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

    // (old teamBanner styles removed — replaced by hero styles above)

    // Tab Bar
    tabBarScroll: {
      flexGrow: 0,
      marginTop: 12,
    },
    tabBar: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      minWidth: 80,
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
    emptyFeedScroll: {
      flexGrow: 1,
      padding: 16,
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 20,
      paddingHorizontal: 20,
    },
    emptyCtaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 20,
    },
    emptyCtaBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },

    // Compose Card
    composeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.06)',
      borderRadius: 16,
      padding: 14,
      marginBottom: 16,
      gap: 12,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
        android: { elevation: 3 },
      }),
    },
    composeAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      justifyContent: 'center',
      alignItems: 'center',
    },
    composeAvatarText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
    composeInputMock: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    composeInputText: {
      fontSize: 14,
      color: colors.textMuted,
    },

    // Post Cards
    postCard: {
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.06)',
      borderRadius: 16,
      marginBottom: 14,
      overflow: 'hidden',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
        android: { elevation: 6 },
      }),
    },
    pinnedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: '#F59E0B10',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    pinnedText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#F59E0B',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
    },
    postAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    postAvatarText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },
    postHeaderInfo: {
      flex: 1,
      marginLeft: 10,
    },
    postAuthor: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    coachBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: '#F9731615',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#F9731630',
    },
    coachBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#F97316',
      letterSpacing: 0.5,
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
      paddingHorizontal: 16,
      marginBottom: 4,
    },
    postContent: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 21,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },

    // Post image (full width, tappable)
    postImageContainer: {
      width: '100%',
      marginBottom: 4,
    },
    postImage: {
      width: '100%',
      height: 280,
      backgroundColor: colors.bgSecondary,
      borderRadius: 0,
    },

    // Post footer
    postFooter: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.06)',
    },
    reactionBar: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 6,
    },
    postStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    postStatText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
    },
    commentLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

    // New Posts Pill
    newPostsPill: {
      position: 'absolute',
      top: 12,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 24,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
        android: { elevation: 8 },
      }),
    },
    newPostsPillText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },

    // Roster Cards
    rosterCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.06)',
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
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.06)',
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

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: '#FFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.06)',
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
    postTypeChip: {
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
    postTypeChipText: {
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
      minHeight: 140,
    },
    charCount: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'right',
      marginTop: 4,
      marginBottom: 12,
    },
    photoPreviewWrap: {
      marginRight: 8,
      position: 'relative',
    },
    photoPreview: {
      width: 100,
      height: 100,
      borderRadius: 12,
      backgroundColor: colors.border,
    },
    photoRemoveBtn: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: colors.card,
      borderRadius: 11,
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

    // Fullscreen Image Viewer
    fullscreenOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullscreenCloseBtn: {
      position: 'absolute',
      top: 60,
      right: 20,
      zIndex: 10,
    },
    fullscreenImage: {
      width: '100%',
      height: '80%',
    },
  });
