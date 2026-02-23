import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  };
  unread_count?: number;
};

type User = {
  id: string;
  full_name: string;
  email: string;
  account_type: string;
};

export default function ChatsScreen() {
  const { profile } = useAuth();
  const { workingSeason } = useSeason();
  const { colors } = useTheme();
  const router = useRouter();
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  
  // New channel form
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('custom');
  const [creating, setCreating] = useState(false);
  const [channelMembers, setChannelMembers] = useState<User[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<User[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);

  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  // Typing indicators: channelId -> array of display names
  const [typingMap, setTypingMap] = useState<Record<string, string[]>>({});

  const fetchChannels = async () => {
    if (!profile || !workingSeason) return;
    
    // Get all channels user is a member of
    const { data: memberChannels } = await supabase
      .from('channel_members')
      .select(`
        channel_id,
        display_name,
        last_read_at,
        chat_channels (
          id, name, description, channel_type, avatar_url, team_id, created_at
        )
      `)
      .eq('user_id', profile.id)
      .is('left_at', null);

    if (!memberChannels) {
      setChannels([]);
      return;
    }

    // Get last message for each channel
    const channelIds = memberChannels.map(mc => mc.channel_id);
    const channelsWithMessages: Channel[] = [];

    for (const mc of memberChannels) {
      const channel = mc.chat_channels as any;
      if (!channel) continue;

      // Get last message
      const { data: lastMsg } = await supabase
        .from('chat_messages')
        .select(`
          content, created_at,
          profiles:sender_id (full_name)
        `)
        .eq('channel_id', channel.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get unread count
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channel.id)
        .eq('is_deleted', false)
        .gt('created_at', mc.last_read_at || '1970-01-01');

      channelsWithMessages.push({
        ...channel,
        last_message: lastMsg ? {
          content: lastMsg.content,
          sender_name: (lastMsg.profiles as any)?.full_name || 'Unknown',
          created_at: lastMsg.created_at,
        } : undefined,
        unread_count: count || 0,
      });
    }

    // Sort by last message time
    channelsWithMessages.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setChannels(channelsWithMessages);
  };

  const loadPinnedChats = async () => {
    if (!profile) return;
    const stored = await AsyncStorage.getItem(`pinned_chats_${profile.id}`);
    if (stored) setPinnedIds(new Set(JSON.parse(stored)));
  };

  const togglePin = async (channelId: string) => {
    if (!profile) return;
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        if (next.size >= 5) { Alert.alert('Limit', 'You can pin up to 5 chats.'); return prev; }
        next.add(channelId);
      }
      AsyncStorage.setItem(`pinned_chats_${profile.id}`, JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => {
    fetchChannels();
    loadPinnedChats();
  }, [profile, workingSeason]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!profile) return;

    const subscription = supabase
      .channel('chat-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, () => {
        fetchChannels(); // Refresh to get new messages
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile]);

  // Typing indicator polling for all channels
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
          // We don't have member names here easily, so just show "typing..."
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

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, account_type')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .in('account_type', ['parent', 'coach', 'admin'])
      .neq('id', profile?.id)
      .limit(20);
    
    setSearchResults(data || []);
    setSearching(false);
  };

  const searchMembersForChannel = async (query: string) => {
    if (query.length < 2) {
      setMemberSearchResults([]);
      return;
    }
    setSearchingMembers(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, account_type')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .neq('id', profile?.id)
      .limit(20);
    // Filter out already-added members
    const addedIds = new Set(channelMembers.map(m => m.id));
    setMemberSearchResults((data || []).filter((u: User) => !addedIds.has(u.id)));
    setSearchingMembers(false);
  };

  const startDM = async (user: User) => {
    if (!profile || !workingSeason) return;

    // Check if DM already exists
    const { data: existingDMs } = await supabase
      .from('chat_channels')
      .select(`
        id,
        channel_members!inner (user_id)
      `)
      .eq('channel_type', 'dm')
      .eq('season_id', workingSeason.id);

    // Find existing DM with this user
    let existingDM = null;
    if (existingDMs) {
      for (const dm of existingDMs) {
        const members = (dm.channel_members as any[]).map(m => m.user_id);
        if (members.includes(profile.id) && members.includes(user.id) && members.length === 2) {
          existingDM = dm;
          break;
        }
      }
    }

    if (existingDM) {
      setShowUserSearch(false);
      router.push({ pathname: '/chat/[id]', params: { id: existingDM.id } });
      return;
    }

    // Create new DM
    const dmName = `${profile.full_name}, ${user.full_name}`;
    const { data: newChannel, error } = await supabase
      .from('chat_channels')
      .insert({
        season_id: workingSeason.id,
        name: dmName,
        channel_type: 'dm',
        created_by: profile.id,
      })
      .select()
      .single();

    if (error || !newChannel) {
      if (__DEV__) console.error('Error creating DM:', error);
      return;
    }

    // Add both members
    await supabase.from('channel_members').insert([
      {
        channel_id: newChannel.id,
        user_id: profile.id,
        display_name: profile.full_name,
        member_role: profile.role || 'parent',
        can_post: true,
        can_moderate: profile.role === 'admin',
      },
      {
        channel_id: newChannel.id,
        user_id: user.id,
        display_name: user.full_name,
        member_role: user.account_type || 'parent',
        can_post: true,
        can_moderate: user.account_type === 'admin',
      },
    ]);

    setShowUserSearch(false);
    setUserSearchQuery('');
    setSearchResults([]);
    fetchChannels();
    router.push({ pathname: '/chat/[id]', params: { id: newChannel.id } });
  };

  const createChannel = async () => {
    if (!newChannelName.trim() || !profile || !workingSeason) return;
    
    setCreating(true);
    const { data: newChannel, error } = await supabase
      .from('chat_channels')
      .insert({
        season_id: workingSeason.id,
        name: newChannelName.trim(),
        channel_type: newChannelType,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error || !newChannel) {
      setCreating(false);
      return;
    }

    // Add creator as admin member + selected members
    const memberInserts = [
      {
        channel_id: newChannel.id,
        user_id: profile.id,
        display_name: profile.full_name,
        member_role: 'admin',
        can_post: true,
        can_moderate: true,
      },
      ...channelMembers.map((m) => ({
        channel_id: newChannel.id,
        user_id: m.id,
        display_name: m.full_name,
        member_role: m.account_type || 'parent',
        can_post: true,
        can_moderate: false,
      })),
    ];
    await supabase.from('channel_members').insert(memberInserts);

    setCreating(false);
    setShowNewChat(false);
    setNewChannelName('');
    setChannelMembers([]);
    setMemberSearchQuery('');
    setMemberSearchResults([]);
    fetchChannels();
    router.push({ pathname: '/chat/[id]', params: { id: newChannel.id } });
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'team_chat': return 'people';
      case 'player_chat': return 'basketball';
      case 'dm': return 'person';
      case 'group_dm': return 'people-circle';
      case 'league_announcement': return 'megaphone';
      default: return 'chatbubble';
    }
  };

  const getChannelColor = (type: string) => {
    switch (type) {
      case 'team_chat': return colors.info;
      case 'player_chat': return colors.success;
      case 'dm': return colors.primary;
      case 'league_announcement': return colors.warning;
      default: return colors.textMuted;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const filteredChannels = channels
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aPinned = pinnedIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedIds.has(b.id) ? 0 : 1;
      return aPinned - bPinned;
    });

  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Chats</Text>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerBtn} onPress={() => setShowUserSearch(true)}>
            <Ionicons name="person-add" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtn} onPress={() => setShowNewChat(true)}>
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search chats..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={s.scroll} 
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={async () => { 
              setRefreshing(true); 
              await fetchChannels(); 
              setRefreshing(false); 
            }} 
          />
        }
      >
        {filteredChannels.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
            <Text style={s.emptyText}>No chats yet</Text>
            <Text style={s.emptySubtext}>Start a conversation or create a channel</Text>
          </View>
        ) : (
          filteredChannels.map(channel => (
            <TouchableOpacity
              key={channel.id}
              style={s.channelCard}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: channel.id } })}
              onLongPress={() => Alert.alert(
                pinnedIds.has(channel.id) ? 'Unpin Chat' : 'Pin Chat',
                pinnedIds.has(channel.id) ? 'Remove this chat from pinned?' : 'Pin this chat to the top?',
                [{ text: 'Cancel', style: 'cancel' }, { text: pinnedIds.has(channel.id) ? 'Unpin' : 'Pin', onPress: () => togglePin(channel.id) }]
              )}
            >
              <View style={[s.channelAvatar, { backgroundColor: getChannelColor(channel.channel_type) + '20' }]}>
                {channel.avatar_url ? (
                  <Image source={{ uri: channel.avatar_url }} style={s.avatarImage} />
                ) : (
                  <Ionicons 
                    name={getChannelIcon(channel.channel_type) as any} 
                    size={24} 
                    color={getChannelColor(channel.channel_type)} 
                  />
                )}
              </View>
              
              <View style={s.channelInfo}>
                <View style={s.channelHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                    {pinnedIds.has(channel.id) && <Text style={{ fontSize: 14, marginRight: 4 }}>📌</Text>}
                    <Text style={s.channelName} numberOfLines={1}>{channel.name}</Text>
                  </View>
                  {channel.last_message && (
                    <Text style={s.messageTime}>{formatTime(channel.last_message.created_at)}</Text>
                  )}
                </View>
                
                {typingMap[channel.id]?.length > 0 ? (
                  <Text style={s.typingPreview}>typing...</Text>
                ) : channel.last_message ? (
                  <Text style={s.lastMessage} numberOfLines={1}>
                    <Text style={s.senderName}>{channel.last_message.sender_name}: </Text>
                    {channel.last_message.content || '(media)'}
                  </Text>
                ) : (
                  <Text style={s.noMessages}>No messages yet</Text>
                )}
              </View>

              {(channel.unread_count ?? 0) > 0 && (
                <View style={s.unreadBadge}>
                  <Text style={s.unreadText}>{channel.unread_count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* New Channel Modal */}
      <Modal visible={showNewChat} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Create Channel</Text>
              <TouchableOpacity onPress={() => setShowNewChat(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Channel Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g., Coaches Corner"
              placeholderTextColor={colors.textMuted}
              value={newChannelName}
              onChangeText={setNewChannelName}
            />

            <Text style={s.label}>Channel Type</Text>
            <View style={s.typeRow}>
              {[
                { value: 'custom', label: 'Custom', icon: 'chatbubble' },
                { value: 'group_dm', label: 'Group', icon: 'people-circle' },
              ].map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[s.typeBtn, newChannelType === type.value && s.typeBtnSel]}
                  onPress={() => setNewChannelType(type.value)}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={20} 
                    color={newChannelType === type.value ? colors.primary : colors.textMuted} 
                  />
                  <Text style={[s.typeBtnTxt, newChannelType === type.value && s.typeBtnTxtSel]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Add Members</Text>
            <View style={s.searchContainer}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={s.searchInput}
                placeholder="Search by name or email..."
                placeholderTextColor={colors.textMuted}
                value={memberSearchQuery}
                onChangeText={(q) => { setMemberSearchQuery(q); searchMembersForChannel(q); }}
              />
              {memberSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setMemberSearchQuery(''); setMemberSearchResults([]); }}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Selected members chips */}
            {channelMembers.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {channelMembers.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}
                    onPress={() => setChannelMembers(prev => prev.filter(p => p.id !== m.id))}
                  >
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{m.full_name}</Text>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Member search results */}
            {memberSearchResults.length > 0 && (
              <ScrollView style={{ maxHeight: 150, marginBottom: 12 }}>
                {memberSearchResults.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}
                    onPress={() => {
                      setChannelMembers(prev => [...prev, u]);
                      setMemberSearchResults(prev => prev.filter(r => r.id !== u.id));
                      setMemberSearchQuery('');
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                      <Ionicons name="person" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{u.full_name}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{u.email}</Text>
                    </View>
                    <Ionicons name="add-circle" size={22} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[s.createBtn, creating && s.disabled]}
              onPress={createChannel}
              disabled={creating}
            >
              <Text style={s.createBtnTxt}>{creating ? 'Creating...' : 'Create Channel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* User Search Modal (for DMs) */}
      <Modal visible={showUserSearch} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Message</Text>
              <TouchableOpacity onPress={() => { setShowUserSearch(false); setUserSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={s.searchContainer}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={s.searchInput}
                placeholder="Search by name or email..."
                placeholderTextColor={colors.textMuted}
                value={userSearchQuery}
                onChangeText={(text) => {
                  setUserSearchQuery(text);
                  searchUsers(text);
                }}
                autoFocus
              />
            </View>

            <ScrollView style={s.searchResults}>
              {searching && (
                <Text style={s.searchingText}>Searching...</Text>
              )}
              {searchResults.map(user => (
                <TouchableOpacity 
                  key={user.id} 
                  style={s.userResult}
                  onPress={() => startDM(user)}
                >
                  <View style={s.userAvatar}>
                    <Text style={s.userInitials}>
                      {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <View style={s.userInfo}>
                    <Text style={s.userName}>{user.full_name}</Text>
                    <Text style={s.userType}>{user.account_type}</Text>
                  </View>
                  <Ionicons name="chatbubble" size={20} color={colors.primary} />
                </TouchableOpacity>
              ))}
              {!searching && userSearchQuery.length >= 2 && searchResults.length === 0 && (
                <Text style={s.noResults}>No users found</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.screenPadding, paddingVertical: 12 },
  title: { ...displayTextStyle, fontSize: 28, color: colors.text },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { padding: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 16, color: colors.text },
  scroll: { flex: 1 },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  channelCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  channelAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  channelInfo: { flex: 1 },
  channelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  channelName: { fontSize: 16, fontWeight: '600', color: colors.text, flexShrink: 1 },
  messageTime: { fontSize: 12, color: colors.textMuted },
  lastMessage: { fontSize: 14, color: colors.textMuted },
  senderName: { fontWeight: '500' },
  noMessages: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  typingPreview: { fontSize: 14, color: colors.primary, fontStyle: 'italic' },
  unreadBadge: { backgroundColor: colors.primary, minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: colors.background, fontSize: 12, fontWeight: 'bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '700', marginBottom: 8, marginTop: 12, textTransform: 'uppercase' as const, letterSpacing: 1 },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.background, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  typeBtnSel: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  typeBtnTxt: { fontSize: 14, color: colors.textMuted },
  typeBtnTxtSel: { color: colors.primary, fontWeight: '600' },
  createBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  createBtnTxt: { color: colors.background, fontSize: 18, fontWeight: 'bold' },
  disabled: { opacity: 0.5 },
  searchResults: { maxHeight: 400 },
  searchingText: { color: colors.textMuted, textAlign: 'center', padding: 20 },
  userResult: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userInitials: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: colors.text },
  userType: { fontSize: 13, color: colors.textMuted, textTransform: 'capitalize' },
  noResults: { color: colors.textMuted, textAlign: 'center', padding: 20 },
});