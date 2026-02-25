import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import AppHeaderBar from '@/components/ui/AppHeaderBar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Channel = {
  id: string;
  name: string;
  description: string;
  channel_type: string;
  avatar_url: string;
  team_id: string;
  created_at: string;
  last_message?: {
    content: string;
    sender_name: string;
    created_at: string;
    message_type?: string;
  };
  unread_count?: number;
};

type User = {
  id: string;
  full_name: string;
  email: string;
  account_type: string;
  avatar_url?: string;
};

type ListItem =
  | { type: 'header'; title: string }
  | { type: 'channel'; data: Channel };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SEARCH_DEBOUNCE_MS = 300;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getChannelIcon(type: string): string {
  switch (type) {
    case 'team_chat': return 'people';
    case 'player_chat': return 'basketball';
    case 'dm': return 'person';
    case 'group_dm': return 'people-circle';
    case 'league_announcement': return 'megaphone';
    default: return 'chatbubble';
  }
}

function getMessagePreview(msg?: Channel['last_message']): string {
  if (!msg) return '';
  switch (msg.message_type) {
    case 'image': return '📷 Photo';
    case 'voice': return '🎤 Voice Message';
    case 'gif': return 'GIF';
    case 'video': return '🎬 Video';
    case 'system': return msg.content || 'System message';
    default: return msg.content || '(media)';
  }
}

// ===========================================================================
// Component
// ===========================================================================
export default function CoachChatScreen() {
  const { profile } = useAuth();
  const { workingSeason } = useSeason();
  const { colors } = useTheme();
  const { isAdmin } = usePermissions();
  const router = useRouter();
  const s = useMemo(() => createStyles(colors), [colors]);

  // --- Channels ---
  const [channels, setChannels] = useState<Channel[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [adminMemberIds, setAdminMemberIds] = useState<Set<string>>(new Set());

  // --- Search ---
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Pinning ---
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  // --- Typing ---
  const [typingMap, setTypingMap] = useState<Record<string, string[]>>({});

  // --- FAB ---
  const [fabExpanded, setFabExpanded] = useState(false);

  // --- DM modal ---
  const [showDmModal, setShowDmModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [orgMembers, setOrgMembers] = useState<User[]>([]);

  // --- Channel creation modal ---
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('custom');
  const [creating, setCreating] = useState(false);
  const [channelMembers, setChannelMembers] = useState<User[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<User[]>([]);

  // =========================================================================
  // Data: fetch channels (batched — no N+1)
  // =========================================================================
  const fetchChannels = useCallback(async () => {
    if (!profile || !workingSeason) return;

    // Admin: see ALL channels in the season
    if (isAdmin) {
      const { data: allChannels } = await supabase
        .from('chat_channels')
        .select('id, name, description, channel_type, avatar_url, team_id, created_at')
        .eq('season_id', workingSeason.id);

      if (!allChannels || allChannels.length === 0) { setChannels([]); return; }

      // Check which channels admin is already a member of
      const { data: myMemberships } = await supabase
        .from('channel_members')
        .select('channel_id, last_read_at')
        .eq('user_id', profile.id)
        .is('left_at', null);

      const memberMap = new Map((myMemberships || []).map(m => [m.channel_id, m.last_read_at]));
      setAdminMemberIds(new Set(memberMap.keys()));

      const channelIds = allChannels.map(c => c.id);

      // BATCH: recent messages
      const { data: recentMessages } = await supabase
        .from('chat_messages')
        .select('id, channel_id, content, message_type, created_at, profiles:sender_id(full_name)')
        .in('channel_id', channelIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(channelIds.length * 2);

      const lastMessageMap = new Map<string, any>();
      for (const msg of (recentMessages || [])) {
        if (!lastMessageMap.has(msg.channel_id)) {
          lastMessageMap.set(msg.channel_id, msg);
        }
      }

      // Unread counts (only for channels admin is a member of)
      const unreadMap = new Map<string, number>();
      const memberChannelIds = allChannels.filter(c => memberMap.has(c.id)).map(c => c.id);
      if (memberChannelIds.length > 0) {
        const unreadPromises = memberChannelIds.map(async (cId) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', cId)
            .eq('is_deleted', false)
            .gt('created_at', memberMap.get(cId) || '1970-01-01');
          return { channelId: cId, count: count || 0 };
        });
        const results = await Promise.all(unreadPromises);
        for (const r of results) unreadMap.set(r.channelId, r.count);
      }

      // Assemble
      const assembled: Channel[] = allChannels.map(c => {
        const lastMsg = lastMessageMap.get(c.id);
        return {
          ...c,
          last_message: lastMsg ? {
            content: lastMsg.content,
            sender_name: (lastMsg.profiles as any)?.full_name || 'Unknown',
            created_at: lastMsg.created_at,
            message_type: lastMsg.message_type,
          } : undefined,
          unread_count: unreadMap.get(c.id) || 0,
        };
      });

      assembled.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.created_at;
        const bTime = b.last_message?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setChannels(assembled);
      return;
    }

    // Coach: only channels user is a member of
    const { data: memberChannels } = await supabase
      .from('channel_members')
      .select(`
        channel_id, display_name, last_read_at,
        chat_channels (id, name, description, channel_type, avatar_url, team_id, created_at)
      `)
      .eq('user_id', profile.id)
      .is('left_at', null);

    if (!memberChannels) { setChannels([]); return; }

    const validChannels = memberChannels.filter(mc => mc.chat_channels);
    const channelIds = validChannels.map(mc => mc.channel_id);
    if (channelIds.length === 0) { setChannels([]); return; }

    // BATCH: fetch recent messages for all channels at once
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('id, channel_id, content, message_type, created_at, profiles:sender_id(full_name)')
      .in('channel_id', channelIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(channelIds.length * 2);

    const lastMessageMap = new Map<string, any>();
    for (const msg of (recentMessages || [])) {
      if (!lastMessageMap.has(msg.channel_id)) {
        lastMessageMap.set(msg.channel_id, msg);
      }
    }

    // PARALLEL: unread counts
    const unreadPromises = validChannels.map(async (mc) => {
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', mc.channel_id)
        .eq('is_deleted', false)
        .gt('created_at', mc.last_read_at || '1970-01-01');
      return { channelId: mc.channel_id, count: count || 0 };
    });
    const unreadResults = await Promise.all(unreadPromises);
    const unreadMap = new Map(unreadResults.map(r => [r.channelId, r.count]));

    // Assemble
    const assembled: Channel[] = validChannels.map(mc => {
      const channel = mc.chat_channels as any;
      const lastMsg = lastMessageMap.get(channel.id);
      return {
        ...channel,
        last_message: lastMsg ? {
          content: lastMsg.content,
          sender_name: (lastMsg.profiles as any)?.full_name || 'Unknown',
          created_at: lastMsg.created_at,
          message_type: lastMsg.message_type,
        } : undefined,
        unread_count: unreadMap.get(channel.id) || 0,
      };
    });

    assembled.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setChannels(assembled);
  }, [profile, workingSeason, isAdmin]);

  // =========================================================================
  // Pinning
  // =========================================================================
  const loadPinnedChats = useCallback(async () => {
    if (!profile) return;
    const stored = await AsyncStorage.getItem(`pinned_chats_${profile.id}`);
    if (stored) setPinnedIds(new Set(JSON.parse(stored)));
  }, [profile]);

  const togglePin = useCallback(
    async (channelId: string) => {
      if (!profile) return;
      setPinnedIds(prev => {
        const next = new Set(prev);
        if (next.has(channelId)) {
          next.delete(channelId);
        } else {
          if (next.size >= 5) {
            Alert.alert('Limit', 'You can pin up to 5 chats.');
            return prev;
          }
          next.add(channelId);
        }
        AsyncStorage.setItem(`pinned_chats_${profile.id}`, JSON.stringify([...next]));
        return next;
      });
    },
    [profile],
  );

  // =========================================================================
  // DM creation
  // =========================================================================
  const fetchOrgMembers = useCallback(async () => {
    const orgId = profile?.current_organization_id;
    if (!orgId) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, account_type, avatar_url')
      .eq('current_organization_id', orgId)
      .in('account_type', ['parent', 'coach', 'admin'])
      .neq('id', profile?.id)
      .order('account_type')
      .order('full_name');
    setOrgMembers(data || []);
  }, [profile?.id, profile?.current_organization_id]);

  const searchUsers = useCallback(
    async (query: string) => {
      if (query.length < 2) { setSearchResults([]); return; }
      setSearching(true);
      const orgId = profile?.current_organization_id;
      let q = supabase
        .from('profiles')
        .select('id, full_name, email, account_type, avatar_url')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .in('account_type', ['parent', 'coach', 'admin'])
        .neq('id', profile?.id)
        .limit(20);
      if (orgId) q = q.eq('current_organization_id', orgId);
      const { data } = await q;
      setSearchResults(data || []);
      setSearching(false);
    },
    [profile?.id, profile?.current_organization_id],
  );

  const startDM = useCallback(
    async (user: User) => {
      if (!profile || !workingSeason) return;

      const { data: existingDMs } = await supabase
        .from('chat_channels')
        .select('id, channel_members!inner (user_id)')
        .eq('channel_type', 'dm')
        .eq('season_id', workingSeason.id);

      let existingDM = null;
      if (existingDMs) {
        for (const dm of existingDMs) {
          const members = (dm.channel_members as any[]).map((m: any) => m.user_id);
          if (members.includes(profile.id) && members.includes(user.id) && members.length === 2) {
            existingDM = dm;
            break;
          }
        }
      }

      if (existingDM) {
        setShowDmModal(false);
        router.push({ pathname: '/chat/[id]', params: { id: existingDM.id } } as any);
        return;
      }

      const dmName = `${profile.full_name}, ${user.full_name}`;
      const { data: newChannel, error } = await supabase
        .from('chat_channels')
        .insert({ season_id: workingSeason.id, name: dmName, channel_type: 'dm', created_by: profile.id })
        .select()
        .single();

      if (error || !newChannel) {
        if (__DEV__) console.error('[CoachChat] Error creating DM:', error);
        return;
      }

      await supabase.from('channel_members').insert([
        { channel_id: newChannel.id, user_id: profile.id, display_name: profile.full_name, member_role: isAdmin ? 'admin' : 'coach', can_post: true, can_moderate: true },
        { channel_id: newChannel.id, user_id: user.id, display_name: user.full_name, member_role: user.account_type || 'parent', can_post: true, can_moderate: user.account_type === 'admin' },
      ]);

      setShowDmModal(false);
      setUserSearchQuery('');
      setSearchResults([]);
      fetchChannels();
      router.push({ pathname: '/chat/[id]', params: { id: newChannel.id } } as any);
    },
    [profile, workingSeason, router, fetchChannels],
  );

  // =========================================================================
  // Channel creation
  // =========================================================================
  const searchMembersForChannel = useCallback(
    async (query: string) => {
      if (query.length < 2) { setMemberSearchResults([]); return; }
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, account_type')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .in('account_type', ['parent', 'coach', 'admin'])
        .neq('id', profile?.id)
        .limit(20);
      const existingIds = new Set(channelMembers.map(m => m.id));
      setMemberSearchResults((data || []).filter(u => !existingIds.has(u.id)));
    },
    [profile?.id, channelMembers],
  );

  const createChannel = useCallback(async () => {
    if (!newChannelName.trim() || !profile || !workingSeason) return;

    setCreating(true);
    const { data: newChannel, error } = await supabase
      .from('chat_channels')
      .insert({ season_id: workingSeason.id, name: newChannelName.trim(), channel_type: newChannelType, created_by: profile.id })
      .select()
      .single();

    if (error || !newChannel) {
      setCreating(false);
      if (__DEV__) console.error('[CoachChat] Error creating channel:', error);
      return;
    }

    const memberInserts = [
      { channel_id: newChannel.id, user_id: profile.id, display_name: profile.full_name, member_role: 'admin', can_post: true, can_moderate: true },
      ...channelMembers.map(m => ({
        channel_id: newChannel.id, user_id: m.id, display_name: m.full_name,
        member_role: m.account_type || 'parent', can_post: true, can_moderate: false,
      })),
    ];
    await supabase.from('channel_members').insert(memberInserts);

    setCreating(false);
    setShowNewChannel(false);
    setNewChannelName('');
    setChannelMembers([]);
    setMemberSearchQuery('');
    setMemberSearchResults([]);
    fetchChannels();
    router.push({ pathname: '/chat/[id]', params: { id: newChannel.id } } as any);
  }, [newChannelName, newChannelType, channelMembers, profile, workingSeason, fetchChannels, router]);

  // =========================================================================
  // Admin: auto-join channel on press
  // =========================================================================
  const handleChannelPress = useCallback(async (channelId: string) => {
    if (isAdmin && !adminMemberIds.has(channelId)) {
      await supabase.from('channel_members').insert({
        channel_id: channelId,
        user_id: profile!.id,
        display_name: profile!.full_name,
        member_role: 'admin',
        can_post: true,
        can_moderate: true,
      });
      setAdminMemberIds(prev => new Set([...prev, channelId]));
    }
    router.push({ pathname: '/chat/[id]', params: { id: channelId } } as any);
  }, [isAdmin, adminMemberIds, profile, router]);

  // =========================================================================
  // Effects
  // =========================================================================
  useEffect(() => {
    fetchChannels();
    loadPinnedChats();
  }, [fetchChannels, loadPinnedChats]);

  // Real-time subscription
  useEffect(() => {
    if (!profile) return;
    const subscription = supabase
      .channel('coach-chat-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        fetchChannels();
      })
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, [profile, fetchChannels]);

  // Typing indicator polling
  useEffect(() => {
    if (!profile || channels.length === 0) return;
    const fetchAllTyping = async () => {
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      const channelIds = channels.map(c => c.id);
      const { data } = await supabase
        .from('typing_indicators')
        .select('channel_id, user_id')
        .in('channel_id', channelIds)
        .neq('user_id', profile.id)
        .gte('started_at', fiveSecondsAgo);
      if (data) {
        const map: Record<string, string[]> = {};
        for (const t of data) {
          if (!map[t.channel_id]) map[t.channel_id] = [];
          map[t.channel_id].push(t.user_id);
        }
        setTypingMap(map);
      } else {
        setTypingMap({});
      }
    };
    fetchAllTyping();
    const interval = setInterval(fetchAllTyping, 3000);
    return () => clearInterval(interval);
  }, [profile, channels.length]);

  // =========================================================================
  // Debounced search
  // =========================================================================
  const onSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedQuery(text); }, SEARCH_DEBOUNCE_MS);
  }, []);

  // =========================================================================
  // Filtered & sectioned data
  // =========================================================================
  const listData = useMemo((): ListItem[] => {
    const q = debouncedQuery.toLowerCase();
    const filtered = channels.filter(c => {
      if (!q) return true;
      if (c.name.toLowerCase().includes(q)) return true;
      if (c.last_message?.content?.toLowerCase().includes(q)) return true;
      if (c.last_message?.sender_name?.toLowerCase().includes(q)) return true;
      return false;
    });
    const pinned = filtered.filter(c => pinnedIds.has(c.id));
    const recent = filtered.filter(c => !pinnedIds.has(c.id));
    const items: ListItem[] = [];
    if (pinned.length > 0) {
      items.push({ type: 'header', title: 'Pinned' });
      pinned.forEach(c => items.push({ type: 'channel', data: c }));
    }
    if (recent.length > 0) {
      items.push({ type: 'header', title: 'Recent' });
      recent.forEach(c => items.push({ type: 'channel', data: c }));
    }
    return items;
  }, [channels, debouncedQuery, pinnedIds]);

  // =========================================================================
  // Refresh
  // =========================================================================
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChannels();
    setRefreshing(false);
  }, [fetchChannels]);

  // =========================================================================
  // Channel color helper
  // =========================================================================
  const getChannelColor = useCallback(
    (type: string) => {
      switch (type) {
        case 'team_chat': return colors.info || colors.primary;
        case 'player_chat': return colors.success;
        case 'dm': return colors.primary;
        case 'league_announcement': return colors.warning;
        default: return colors.textMuted;
      }
    },
    [colors],
  );

  // =========================================================================
  // Render: list item
  // =========================================================================
  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'header') {
        return (
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
            {item.title.toUpperCase()}
          </Text>
        );
      }

      const channel = item.data;
      const isPinned = pinnedIds.has(channel.id);
      const isTyping = (typingMap[channel.id]?.length ?? 0) > 0;
      const chColor = getChannelColor(channel.channel_type);

      return (
        <TouchableOpacity
          style={[s.channelCard, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}
          activeOpacity={0.7}
          onPress={() => handleChannelPress(channel.id)}
          onLongPress={() =>
            Alert.alert(
              isPinned ? 'Unpin Chat' : 'Pin Chat',
              isPinned ? 'Remove this chat from pinned?' : 'Pin this chat to the top?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: isPinned ? 'Unpin' : 'Pin', onPress: () => togglePin(channel.id) },
              ],
            )
          }
        >
          <View style={[s.channelAvatar, { backgroundColor: chColor + '20' }]}>
            {channel.avatar_url ? (
              <Image source={{ uri: channel.avatar_url }} style={s.avatarImage} />
            ) : (
              <Ionicons name={getChannelIcon(channel.channel_type) as any} size={24} color={chColor} />
            )}
          </View>

          <View style={s.channelInfo}>
            <View style={s.channelHeader}>
              <View style={s.nameRow}>
                {isPinned && <Ionicons name="pin" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />}
                <Text style={[s.channelName, { color: colors.text }]} numberOfLines={1}>
                  {channel.name}
                </Text>
              </View>
              {channel.last_message && (
                <Text style={[s.messageTime, { color: colors.textMuted }]}>
                  {formatTime(channel.last_message.created_at)}
                </Text>
              )}
            </View>

            {isTyping ? (
              <Text style={[s.typingText, { color: colors.primary }]}>typing...</Text>
            ) : channel.last_message ? (
              <Text style={[s.lastMessage, { color: colors.textMuted }]} numberOfLines={1}>
                <Text style={s.senderName}>{channel.last_message.sender_name}: </Text>
                {getMessagePreview(channel.last_message)}
              </Text>
            ) : (
              <Text style={[s.noMessages, { color: colors.textMuted }]}>No messages yet</Text>
            )}
          </View>

          {(channel.unread_count ?? 0) > 0 && (
            <View style={[s.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={s.unreadText}>{channel.unread_count}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [colors, pinnedIds, typingMap, getChannelColor, handleChannelPress, togglePin, s],
  );

  // =========================================================================
  // Render: empty state
  // =========================================================================
  const EmptyState = () => (
    <View style={s.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
      <Text style={[s.emptyTitle, { color: colors.text }]}>No conversations yet</Text>
      <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
        Start a conversation or send a blast to your team.
      </Text>
    </View>
  );

  // =========================================================================
  // Main render
  // =========================================================================
  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeaderBar title="CHAT" showAvatar={false} showNotificationBell={false} />

      {/* Search bar */}
      <View style={[s.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search conversations..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setDebouncedQuery(''); }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Channel list */}
      <FlatList
        data={listData}
        keyExtractor={(item, idx) => (item.type === 'header' ? `hdr-${item.title}` : item.data.id)}
        renderItem={renderItem}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={[s.listContent, listData.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB scrim */}
      {fabExpanded && (
        <TouchableOpacity style={s.fabScrim} activeOpacity={1} onPress={() => setFabExpanded(false)} />
      )}

      {/* FAB menu — label LEFT, icon RIGHT, dark pill labels */}
      {fabExpanded && (
        <View style={s.fabMenu}>
          <TouchableOpacity
            style={s.fabMenuItem}
            onPress={() => { setFabExpanded(false); router.push('/blast-composer' as any); }}
          >
            <Text style={s.fabMenuLabel}>Blast</Text>
            <View style={[s.fabMenuIcon, { backgroundColor: '#FFB347' }]}>
              <Ionicons name="megaphone" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.fabMenuItem}
            onPress={() => { setFabExpanded(false); setShowNewChannel(true); }}
          >
            <Text style={s.fabMenuLabel}>New Channel</Text>
            <View style={[s.fabMenuIcon, { backgroundColor: colors.info || colors.primary }]}>
              <Ionicons name="people" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.fabMenuItem}
            onPress={() => { setFabExpanded(false); setShowDmModal(true); fetchOrgMembers(); }}
          >
            <Text style={s.fabMenuLabel}>New Message</Text>
            <View style={[s.fabMenuIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="chatbubble" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB button */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={() => setFabExpanded(!fabExpanded)}
        activeOpacity={0.8}
      >
        <Ionicons name={fabExpanded ? 'close' : 'add'} size={26} color="#FFFFFF" />
      </TouchableOpacity>

      {/* DM Modal */}
      <Modal visible={showDmModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: colors.card }]}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>New Message</Text>
              <TouchableOpacity onPress={() => { setShowDmModal(false); setUserSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[s.searchContainer, { backgroundColor: colors.background }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Search by name or email..."
                placeholderTextColor={colors.textMuted}
                value={userSearchQuery}
                onChangeText={text => { setUserSearchQuery(text); searchUsers(text); }}
                autoFocus
              />
            </View>

            <ScrollView style={s.dmResults} keyboardShouldPersistTaps="handled">
              {searching && (
                <Text style={[s.searchingText, { color: colors.textMuted }]}>Searching...</Text>
              )}
              {/* Show search results when searching, otherwise show all org members */}
              {(userSearchQuery.length >= 2 ? searchResults : orgMembers).map(u => {
                const roleColors: Record<string, string> = { admin: '#AF52DE', coach: '#0EA5E9', parent: '#22C55E' };
                const roleColor = roleColors[u.account_type] || colors.textMuted;
                return (
                  <TouchableOpacity key={u.id} style={[s.userRow, { borderBottomColor: colors.border }]} onPress={() => startDM(u)}>
                    <View style={[s.userAvatar, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[s.userInitials, { color: colors.primary }]}>
                        {(u.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </Text>
                    </View>
                    <View style={s.userInfo}>
                      <Text style={[s.userName, { color: colors.text }]}>{u.full_name || 'Unknown'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                        <View style={{ backgroundColor: roleColor + '20', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: roleColor, textTransform: 'capitalize' }}>{u.account_type}</Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chatbubble" size={20} color={colors.primary} />
                  </TouchableOpacity>
                );
              })}
              {!searching && userSearchQuery.length >= 2 && searchResults.length === 0 && (
                <Text style={[s.noResults, { color: colors.textMuted }]}>No users found</Text>
              )}
              {userSearchQuery.length < 2 && orgMembers.length === 0 && (
                <Text style={[s.searchingText, { color: colors.textMuted }]}>Loading members...</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Channel Creation Modal */}
      <Modal visible={showNewChannel} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: colors.card }]}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Create Channel</Text>
              <TouchableOpacity onPress={() => { setShowNewChannel(false); setNewChannelName(''); setChannelMembers([]); setMemberSearchQuery(''); setMemberSearchResults([]); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[s.formLabel, { color: colors.textMuted }]}>Channel Name</Text>
            <TextInput
              style={[s.formInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              placeholder="e.g., Coaches Corner"
              placeholderTextColor={colors.textMuted}
              value={newChannelName}
              onChangeText={setNewChannelName}
            />

            <Text style={[s.formLabel, { color: colors.textMuted }]}>Channel Type</Text>
            <View style={s.typeRow}>
              {[
                { value: 'custom', label: 'Custom', icon: 'chatbubble' },
                { value: 'group_dm', label: 'Group', icon: 'people-circle' },
              ].map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[s.typeBtn, { borderColor: colors.border }, newChannelType === type.value && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                  onPress={() => setNewChannelType(type.value)}
                >
                  <Ionicons name={type.icon as any} size={20} color={newChannelType === type.value ? colors.primary : colors.textMuted} />
                  <Text style={{ color: newChannelType === type.value ? colors.primary : colors.textMuted, fontWeight: '600', fontSize: 14, marginLeft: 6 }}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.formLabel, { color: colors.textMuted }]}>Add Members</Text>
            <View style={[s.searchContainer, { backgroundColor: colors.background }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Search by name or email..."
                placeholderTextColor={colors.textMuted}
                value={memberSearchQuery}
                onChangeText={q => { setMemberSearchQuery(q); searchMembersForChannel(q); }}
              />
              {memberSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setMemberSearchQuery(''); setMemberSearchResults([]); }}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {channelMembers.length > 0 && (
              <View style={s.memberChips}>
                {channelMembers.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.memberChip, { backgroundColor: colors.primary + '20' }]}
                    onPress={() => setChannelMembers(prev => prev.filter(p => p.id !== m.id))}
                  >
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{m.full_name}</Text>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {memberSearchResults.length > 0 && (
              <ScrollView style={{ maxHeight: 150, marginBottom: 12 }}>
                {memberSearchResults.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={[s.userRow, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setChannelMembers(prev => [...prev, u]);
                      setMemberSearchResults(prev => prev.filter(r => r.id !== u.id));
                      setMemberSearchQuery('');
                    }}
                  >
                    <View style={[s.userAvatar, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="person" size={18} color={colors.primary} />
                    </View>
                    <View style={s.userInfo}>
                      <Text style={[s.userName, { color: colors.text }]}>{u.full_name}</Text>
                      <Text style={[s.userRole, { color: colors.textMuted }]}>{u.email}</Text>
                    </View>
                    <Ionicons name="add-circle" size={22} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[s.createBtn, { backgroundColor: colors.primary }, creating && { opacity: 0.5 }]}
              onPress={createChannel}
              disabled={creating}
            >
              <Text style={s.createBtnText}>{creating ? 'Creating...' : 'Create Channel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ===========================================================================
// Styles
// ===========================================================================
function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },

    // Search
    searchContainer: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: spacing.screenPadding, marginBottom: 12,
      paddingHorizontal: 12, paddingVertical: 10,
      borderRadius: radii.card, gap: 8,
    },
    searchInput: { flex: 1, fontSize: 16 },

    // List
    listContent: { paddingBottom: 100 },
    sectionLabel: {
      fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase',
      paddingHorizontal: spacing.screenPadding, paddingTop: 14, paddingBottom: 6,
    },

    // Channel card
    channelCard: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 12,
      marginHorizontal: spacing.screenPadding, marginBottom: 8,
      borderRadius: radii.card, borderWidth: 1, ...shadows.card,
    },
    channelAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarImage: { width: 52, height: 52, borderRadius: 26 },
    channelInfo: { flex: 1 },
    channelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    channelName: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
    messageTime: { fontSize: 12 },
    lastMessage: { fontSize: 14 },
    senderName: { fontWeight: '500' },
    noMessages: { fontSize: 14, fontStyle: 'italic' },
    typingText: { fontSize: 14, fontStyle: 'italic' },
    unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginLeft: 8 },
    unreadText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

    // Empty state
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 6 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

    // FAB
    fab: {
      position: 'absolute', bottom: 24, right: 24,
      width: 56, height: 56, borderRadius: 28,
      justifyContent: 'center', alignItems: 'center',
      ...shadows.cardHover, zIndex: 20,
    },
    fabScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      zIndex: 10,
    },
    fabMenu: {
      position: 'absolute', bottom: 90, right: 24,
      gap: 12, zIndex: 15,
    },
    fabMenuItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
    },
    fabMenuIcon: {
      width: 44, height: 44, borderRadius: 22,
      justifyContent: 'center', alignItems: 'center',
      ...shadows.card,
    },
    fabMenuLabel: {
      fontSize: 14, fontWeight: '600', color: '#FFFFFF',
      backgroundColor: 'rgba(0,0,0,0.75)',
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
      overflow: 'hidden',
    },

    // Modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 24, paddingTop: 12, minHeight: '60%', maxHeight: '70%' },
    modalHandle: {
      width: 40, height: 4, borderRadius: 2, backgroundColor: colors.textMuted,
      alignSelf: 'center', marginBottom: 16, opacity: 0.4,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    dmResults: { maxHeight: 400 },
    searchingText: { textAlign: 'center', padding: 20 },
    userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    userAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    userInitials: { fontSize: 16, fontWeight: 'bold' },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '600' },
    userRole: { fontSize: 13, textTransform: 'capitalize' },
    noResults: { textAlign: 'center', padding: 20 },

    // Channel creation form
    formLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 12, textTransform: 'uppercase' as const, letterSpacing: 1 },
    formInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, marginBottom: 8 },
    typeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    typeBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 12, borderRadius: 10, borderWidth: 2,
    },
    memberChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    memberChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
    createBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
    createBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  });
}
