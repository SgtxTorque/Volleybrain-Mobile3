import EmojiPicker from '@/components/EmojiPicker';
import GifPicker from '@/components/GifPicker';
import { useAuth } from '@/lib/auth';
import { pickImage, pickVideo, takePhoto, uploadMedia } from '@/lib/media-utils';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Animated, FlatList, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Message = {
  id: string;
  channel_id: string;
  sender_id: string;
  message_type: string;
  content: string;
  reply_to_id: string | null;
  is_pinned: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  sender?: { id: string; full_name: string; avatar_url?: string | null };
  reactions?: { reaction_type: string; count: number; user_reacted: boolean }[];
  reply_to?: { content: string; sender: { full_name: string } };
  attachments?: { file_url: string; attachment_type: string; width?: number; height?: number }[];
};

type Channel = { id: string; name: string; channel_type: string; avatar_url: string };
type Member = { user_id: string; display_name: string; member_role: string; can_post: boolean; can_moderate: boolean };

const REACTION_TYPES = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAtBottomRef = useRef(true);

  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const fetchChannel = async () => {
    if (!id) return;
    const { data } = await supabase.from('chat_channels').select('*').eq('id', id).single();
    setChannel(data);
  };

  const fetchMembers = async () => {
    if (!id || !profile) return;
    const { data } = await supabase
      .from('channel_members')
      .select('user_id, display_name, member_role, can_post, can_moderate')
      .eq('channel_id', id)
      .is('left_at', null);
    setMembers(data || []);
    setCurrentMember(data?.find(m => m.user_id === profile.id) || null);
  };

  const fetchMessages = useCallback(async () => {
    if (!id || !profile) return;

    // Query 1: All messages with sender (including avatar_url)
    const { data } = await supabase
      .from('chat_messages')
      .select(`*, sender:profiles!sender_id (id, full_name, avatar_url)`)
      .eq('channel_id', id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (!data || data.length === 0) { setMessages([]); return; }

    const messageIds = data.map(m => m.id);

    // Query 2 + 3: Batch fetch reactions and attachments in parallel
    const [reactionsResult, attachmentsResult] = await Promise.all([
      supabase.from('message_reactions').select('message_id, reaction_type, user_id').in('message_id', messageIds),
      supabase.from('message_attachments').select('message_id, file_url, attachment_type, width, height').in('message_id', messageIds),
    ]);

    // Build reaction lookup: messageId -> aggregated reactions
    const reactionMap: Record<string, { reaction_type: string; count: number; user_reacted: boolean }[]> = {};
    for (const r of reactionsResult.data || []) {
      if (!reactionMap[r.message_id]) reactionMap[r.message_id] = [];
      const existing = reactionMap[r.message_id].find(x => x.reaction_type === r.reaction_type);
      if (existing) {
        existing.count++;
        if (r.user_id === profile.id) existing.user_reacted = true;
      } else {
        reactionMap[r.message_id].push({ reaction_type: r.reaction_type, count: 1, user_reacted: r.user_id === profile.id });
      }
    }

    // Build attachment lookup: messageId -> attachments
    const attachmentMap: Record<string, { file_url: string; attachment_type: string; width?: number; height?: number }[]> = {};
    for (const a of attachmentsResult.data || []) {
      if (!attachmentMap[a.message_id]) attachmentMap[a.message_id] = [];
      attachmentMap[a.message_id].push({ file_url: a.file_url, attachment_type: a.attachment_type, width: a.width, height: a.height });
    }

    // Build message lookup for reply resolution (same channel, no extra query)
    const msgLookup = new Map(data.map(m => [m.id, m]));

    // Assemble final messages
    const assembled: Message[] = data.map(msg => {
      let replyTo = null;
      if (msg.reply_to_id) {
        const replyMsg = msgLookup.get(msg.reply_to_id);
        if (replyMsg) replyTo = { content: replyMsg.content, sender: replyMsg.sender };
      }
      return {
        ...msg,
        reactions: reactionMap[msg.id] || [],
        attachments: attachmentMap[msg.id] || [],
        reply_to: replyTo,
      };
    });

    setMessages(assembled);

    // If user scrolled up, increment new message count instead of auto-scrolling
    if (!isAtBottomRef.current) {
      setNewMessageCount(prev => prev + Math.max(0, assembled.length - messages.length));
    }

    await supabase.from('channel_members').update({ last_read_at: new Date().toISOString() }).eq('channel_id', id).eq('user_id', profile.id);
  }, [id, profile]);

  useEffect(() => { fetchChannel(); fetchMembers(); fetchMessages(); }, [id, profile]);

  // Debounced refetch — prevents rapid refetches from real-time bursts
  const debouncedFetch = useCallback(() => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(() => fetchMessages(), 300);
  }, [fetchMessages]);

  useEffect(() => {
    if (!id || !profile) return;
    const subscription = supabase
      .channel(`chat-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${id}` }, () => debouncedFetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => debouncedFetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'typing_indicators', filter: `channel_id=eq.${id}` }, (payload) => {
        // Refresh typing users on any typing indicator change
        fetchTypingUsers();
      })
      .subscribe();
    return () => {
      subscription.unsubscribe();
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [id, profile, debouncedFetch]);

  // =========================================================================
  // TYPING INDICATOR
  // =========================================================================
  const fetchTypingUsers = useCallback(async () => {
    if (!id || !profile) return;
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data } = await supabase
      .from('typing_indicators')
      .select('user_id')
      .eq('channel_id', id)
      .neq('user_id', profile.id)
      .gte('started_at', fiveSecondsAgo);
    if (data) {
      const names = data.map(t => {
        const member = members.find(m => m.user_id === t.user_id);
        return member?.display_name?.split(' ')[0] || 'Someone';
      });
      setTypingUsers(names);
    }
  }, [id, profile, members]);

  const sendTypingPresence = useCallback(async () => {
    if (!id || !profile) return;
    // Upsert is tricky without unique constraint — delete then insert
    await supabase.from('typing_indicators').delete().eq('channel_id', id).eq('user_id', profile.id);
    await supabase.from('typing_indicators').insert({ channel_id: id, user_id: profile.id, started_at: new Date().toISOString() });
    // Auto-clear after 3 seconds
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      await supabase.from('typing_indicators').delete().eq('channel_id', id).eq('user_id', profile.id);
    }, 3000);
  }, [id, profile]);

  const clearTypingPresence = useCallback(async () => {
    if (!id || !profile) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    await supabase.from('typing_indicators').delete().eq('channel_id', id).eq('user_id', profile.id);
  }, [id, profile]);

  // Clean up typing on unmount
  useEffect(() => {
    return () => { clearTypingPresence(); };
  }, [clearTypingPresence]);

  // Poll typing indicators every 3s as backup to real-time
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(fetchTypingUsers, 3000);
    return () => clearInterval(interval);
  }, [fetchTypingUsers]);

  // =========================================================================
  // MESSAGE GROUPING HELPERS
  // =========================================================================
  const shouldShowSenderInfo = (message: Message, index: number): boolean => {
    if (index === 0) return true;
    const prev = messages[index - 1];
    if (prev.sender_id !== message.sender_id) return true;
    // Different day
    if (new Date(message.created_at).toDateString() !== new Date(prev.created_at).toDateString()) return true;
    // More than 2 minutes apart
    if (new Date(message.created_at).getTime() - new Date(prev.created_at).getTime() > 2 * 60 * 1000) return true;
    return false;
  };

  const isLastInGroup = (message: Message, index: number): boolean => {
    if (index === messages.length - 1) return true;
    const next = messages[index + 1];
    if (next.sender_id !== message.sender_id) return true;
    if (new Date(next.created_at).toDateString() !== new Date(message.created_at).toDateString()) return true;
    if (new Date(next.created_at).getTime() - new Date(message.created_at).getTime() > 2 * 60 * 1000) return true;
    return false;
  };

  // =========================================================================
  // SCROLL TRACKING
  // =========================================================================
  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    const atBottom = distanceFromBottom < 150;
    isAtBottomRef.current = atBottom;
    setShowScrollToBottom(!atBottom);
    if (atBottom) setNewMessageCount(0);
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setNewMessageCount(0);
  };

  const sendMessage = async (type: string = 'text', content: string = inputText.trim(), attachmentUrl?: string) => {
    if ((!content && !attachmentUrl) || !profile || !id || sending) return;
    if (!currentMember?.can_post) { Alert.alert('Cannot Post', 'You do not have permission to post in this chat.'); return; }

    setSending(true);
    const { data: newMessage, error } = await supabase.from('chat_messages').insert({
      channel_id: id,
      sender_id: profile.id,
      message_type: type,
      content: content || null,
      reply_to_id: replyingTo?.id || null,
    }).select().single();

    if (error) { Alert.alert('Error', error.message); setSending(false); return; }

    // Add attachment if present
    if (attachmentUrl && newMessage) {
      await supabase.from('message_attachments').insert({
        message_id: newMessage.id,
        attachment_type: type,
        file_url: attachmentUrl,
      });
    }

    setInputText('');
    setReplyingTo(null);
    setSending(false);
    clearTypingPresence();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const sendGif = async (gifUrl: string) => {
    await sendMessage('gif', '', gifUrl);
  };

  const handleMediaPick = async (type: 'camera' | 'library' | 'video') => {
    setShowMediaOptions(false);
    setUploading(true);

    let media;
    if (type === 'camera') media = await takePhoto();
    else if (type === 'video') media = await pickVideo();
    else media = await pickImage();

    if (!media) { setUploading(false); return; }

    const url = await uploadMedia(media, id!);
    if (url) {
      await sendMessage(media.type, '', url);
    } else {
      Alert.alert('Error', 'Failed to upload media');
    }
    setUploading(false);
  };

  const showMediaActionSheet = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose Image', 'Choose Video'], cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex === 1) handleMediaPick('camera');
          else if (buttonIndex === 2) handleMediaPick('library');
          else if (buttonIndex === 3) handleMediaPick('video');
        }
      );
    } else {
      setShowMediaOptions(true);
    }
  };

  const toggleReaction = async (messageId: string, reactionType: string) => {
    if (!profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', profile.id)
      .eq('reaction_type', reactionType)
      .single();

    if (existing) await supabase.from('message_reactions').delete().eq('id', existing.id);
    else await supabase.from('message_reactions').insert({ message_id: messageId, user_id: profile.id, reaction_type: reactionType });
    setShowReactions(null);
  };

  const deleteMessage = async (message: Message) => {
    const canDelete = currentMember?.can_moderate || message.sender_id === profile?.id;
    if (!canDelete) return;
    Alert.alert('Delete Message', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('chat_messages').update({ is_deleted: true, deleted_by: profile?.id, deleted_at: new Date().toISOString() }).eq('id', message.id);
      }},
    ]);
  };

  const formatMessageTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const shouldShowDateHeader = (message: Message, index: number) => {
    if (index === 0) return true;
    return new Date(message.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();
  };

  const renderMessage = ({ item: message, index }: { item: Message; index: number }) => {
    const isMe = message.sender_id === profile?.id;
    const showDate = shouldShowDateHeader(message, index);
    const showSender = shouldShowSenderInfo(message, index);
    const lastInGroup = isLastInGroup(message, index);
    const hasAvatar = !isMe && message.sender?.avatar_url;
    const initials = message.sender?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';

    return (
      <View>
        {showDate && <View style={s.dateHeader}><Text style={s.dateHeaderText}>{formatDateHeader(message.created_at)}</Text></View>}

        <TouchableOpacity
          style={[
            s.messageRow,
            isMe && s.messageRowMe,
            { marginBottom: lastInGroup ? 6 : 2 },
          ]}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowReactions(message.id);
          }}
          activeOpacity={0.7}
        >
          {/* Avatar — show on first message in group, spacer on subsequent */}
          {!isMe && (
            showSender ? (
              hasAvatar ? (
                <Image source={{ uri: message.sender!.avatar_url! }} style={s.avatarSmall} />
              ) : (
                <View style={s.avatarSmallBg}>
                  <Text style={s.avatarSmallText}>{initials}</Text>
                </View>
              )
            ) : (
              <View style={s.avatarSpacer} />
            )
          )}

          <View style={[
            s.messageBubble,
            isMe ? s.bubbleMe : s.bubbleOther,
            // iMessage-style connected corners within groups
            !isMe && !showSender && { borderTopLeftRadius: 4 },
            !isMe && !lastInGroup && { borderBottomLeftRadius: 4 },
            isMe && !showSender && { borderTopRightRadius: 4 },
            isMe && !lastInGroup && { borderBottomRightRadius: 4 },
          ]}>
            {!isMe && showSender && <Text style={s.senderName}>{message.sender?.full_name}</Text>}

            {message.reply_to && (
              <View style={s.replyPreview}>
                <Text style={s.replyName}>{(message.reply_to.sender as any)?.full_name}</Text>
                <Text style={s.replyContent} numberOfLines={1}>{message.reply_to.content}</Text>
              </View>
            )}

            {/* Attachments (images/videos only, not GIFs) */}
            {message.message_type !== 'gif' && message.attachments && message.attachments.length > 0 && message.attachments.map((att, i) => (
              <TouchableOpacity key={i} onPress={() => setSelectedImage(att.file_url)}>
                <Image source={{ uri: att.file_url }} style={s.attachmentImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}

            {/* GIF */}
            {message.message_type === 'gif' && message.attachments?.[0] && (
              <Image source={{ uri: message.attachments[0].file_url }} style={s.gifImage} resizeMode="contain" />
            )}

            {/* Text content */}
            {message.content && <Text style={[s.messageText, isMe && s.messageTextMe]}>{message.content}</Text>}

            <View style={s.messageFooter}>
              <Text style={[s.messageTime, isMe && s.messageTimeMe]}>{formatMessageTime(message.created_at)}</Text>
              {message.is_edited && <Text style={s.editedLabel}>(edited)</Text>}
            </View>

            {message.reactions && message.reactions.length > 0 && (
              <View style={s.reactionsRow}>
                {message.reactions.map(r => (
                  <TouchableOpacity key={r.reaction_type} style={[s.reactionBubble, r.user_reacted && s.reactionBubbleActive]} onPress={() => toggleReaction(message.id, r.reaction_type)}>
                    <Text style={s.reactionEmoji}>{r.reaction_type}</Text>
                    <Text style={s.reactionCount}>{r.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>

        {showReactions === message.id && (
          <View style={[s.reactionPicker, isMe ? s.reactionPickerMe : s.reactionPickerOther]}>
            {REACTION_TYPES.map(emoji => (
              <TouchableOpacity key={emoji} style={s.reactionOption} onPress={() => toggleReaction(message.id, emoji)}>
                <Text style={s.reactionOptionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.reactionOption} onPress={() => { setReplyingTo(message); setShowReactions(null); }}>
              <Ionicons name="arrow-undo" size={20} color={colors.text} />
            </TouchableOpacity>
            {(currentMember?.can_moderate || isMe) && (
              <TouchableOpacity style={s.reactionOption} onPress={() => deleteMessage(message)}>
                <Ionicons name="trash" size={20} color={colors.danger} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.reactionOption} onPress={() => setShowReactions(null)}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={s.headerInfo} onPress={() => setShowInfo(true)}>
          <Text style={s.headerTitle} numberOfLines={1}>{channel?.name || 'Chat'}</Text>
          <Text style={s.headerSubtitle}>{members.length} members</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowInfo(true)}>
          <Ionicons name="information-circle-outline" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
      >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={s.messageList}
        onContentSizeChange={() => { if (isAtBottomRef.current) flatListRef.current?.scrollToEnd(); }}
        onLayout={() => flatListRef.current?.scrollToEnd()}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      />

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <TouchableOpacity style={s.scrollToBottomBtn} onPress={scrollToBottom} activeOpacity={0.8}>
          <Ionicons name="chevron-down" size={20} color="#fff" />
          {newMessageCount > 0 && (
            <View style={s.newMsgBadge}>
              <Text style={s.newMsgBadgeText}>{newMessageCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Uploading indicator */}
      {uploading && (
        <View style={s.uploadingBar}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={s.uploadingText}>Uploading...</Text>
        </View>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <View style={s.replyBar}>
          <View style={s.replyInfo}>
            <Text style={s.replyLabel}>Replying to {replyingTo.sender?.full_name}</Text>
            <Text style={s.replyContent} numberOfLines={1}>{replyingTo.content}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <View style={s.typingBar}>
          <Text style={s.typingText}>
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing...`
              : typingUsers.length === 2
                ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`
            }
          </Text>
        </View>
      )}

      {/* Input */}
        <View style={s.inputContainer}>
          {currentMember?.can_post !== false ? (
            <>
              <TouchableOpacity style={s.inputBtn} onPress={showMediaActionSheet}>
                <Ionicons name="add-circle" size={28} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity style={s.inputBtn} onPress={() => setShowGifPicker(true)}>
                <Text style={s.gifBtn}>GIF</Text>
              </TouchableOpacity>

              <TextInput
                style={s.input}
                placeholder="Type a message..."
                placeholderTextColor={colors.textMuted}
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  if (text.trim()) sendTypingPresence();
                }}
                multiline
                maxLength={2000}
              />

              <TouchableOpacity style={s.inputBtn} onPress={() => setShowEmojiPicker(true)}>
                <Ionicons name="happy-outline" size={26} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={[s.sendBtn, !inputText.trim() && s.sendBtnDisabled]} onPress={() => sendMessage()} disabled={!inputText.trim() || sending}>
                <Ionicons name="send" size={22} color={inputText.trim() ? colors.background : colors.textMuted} />
              </TouchableOpacity>
            </>
          ) : (
            <View style={s.viewOnlyBar}>
              <Ionicons name="eye" size={18} color={colors.textMuted} />
              <Text style={s.viewOnlyText}>View only - you cannot send messages here</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Emoji Picker */}
      <EmojiPicker
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={(emoji) => setInputText(prev => prev + emoji)}
      />

      {/* GIF Picker */}
      <GifPicker
        visible={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelect={sendGif}
      />

      {/* Media Options Modal (Android) */}
      <Modal visible={showMediaOptions} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.mediaModal}>
            <Text style={s.mediaModalTitle}>Add Media</Text>
            <TouchableOpacity style={s.mediaOption} onPress={() => handleMediaPick('camera')}>
              <Ionicons name="camera" size={24} color={colors.primary} />
              <Text style={s.mediaOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.mediaOption} onPress={() => handleMediaPick('library')}>
              <Ionicons name="image" size={24} color={colors.success} />
              <Text style={s.mediaOptionText}>Choose Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.mediaOption} onPress={() => handleMediaPick('video')}>
              <Ionicons name="videocam" size={24} color={colors.info} />
              <Text style={s.mediaOptionText}>Choose Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.mediaCancelBtn} onPress={() => setShowMediaOptions(false)}>
              <Text style={s.mediaCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal visible={!!selectedImage} animationType="fade" transparent>
        <View style={s.imageViewerOverlay}>
          <TouchableOpacity style={s.imageViewerClose} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedImage && <Image source={{ uri: selectedImage }} style={s.fullImage} resizeMode="contain" />}
        </View>
      </Modal>

      {/* Channel Info Modal */}
      <Modal visible={showInfo} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.infoModal}>
            <View style={s.infoHeader}>
              <Text style={s.infoTitle}>{channel?.name}</Text>
              <TouchableOpacity onPress={() => setShowInfo(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={s.infoSection}>Members ({members.length})</Text>
            {members.map(member => (
              <View key={member.user_id} style={s.memberRow}>
                <View style={s.memberAvatar}>
                  <Text style={s.memberInitials}>{member.display_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</Text>
                </View>
                <View style={s.memberInfo}>
                  <Text style={s.memberName}>{member.display_name}</Text>
                  <Text style={s.memberRole}>{member.member_role}</Text>
                </View>
                {!member.can_post && <View style={s.viewOnlyBadge}><Text style={s.viewOnlyBadgeText}>View only</Text></View>}
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textMuted },
  messageList: { padding: 12, paddingBottom: 8 },
  dateHeader: { alignItems: 'center', marginVertical: 16 },
  dateHeaderText: { fontSize: 12, color: colors.textMuted, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  messageRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-end' },
  messageRowMe: { justifyContent: 'flex-end' },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  avatarSmallBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarSmallText: { color: colors.primary, fontSize: 12, fontWeight: 'bold' },
  avatarSpacer: { width: 32, marginRight: 8 },
  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.glassCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.glassBorder },
  senderName: { fontSize: 12, fontWeight: '600', color: colors.primary, marginBottom: 4 },
  replyPreview: { backgroundColor: colors.background + '40', padding: 8, borderRadius: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: colors.primary },
  replyName: { fontSize: 11, fontWeight: '600', color: colors.primary },
  replyContent: { fontSize: 12, color: colors.textMuted },
  attachmentImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 8 },
  gifImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 8 },
  messageText: { fontSize: 16, color: colors.text, lineHeight: 22 },
  messageTextMe: { color: colors.background },
  messageFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  messageTime: { fontSize: 11, color: colors.textMuted },
  messageTimeMe: { color: colors.background + 'aa' },
  editedLabel: { fontSize: 10, color: colors.textMuted, fontStyle: 'italic' },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 },
  reactionBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, gap: 2 },
  reactionBubbleActive: { backgroundColor: colors.primary + '30' },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, color: colors.text },
  reactionPicker: { flexDirection: 'row', backgroundColor: colors.card, padding: 8, borderRadius: 24, marginBottom: 8, alignSelf: 'flex-start', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  reactionPickerMe: { alignSelf: 'flex-end' },
  reactionPickerOther: { marginLeft: 40 },
  reactionOption: { padding: 8 },
  reactionOptionEmoji: { fontSize: 22 },
  uploadingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, backgroundColor: colors.card },
  uploadingText: { fontSize: 14, color: colors.textMuted },
  replyBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  replyInfo: { flex: 1 },
  replyLabel: { fontSize: 12, fontWeight: '600', color: colors.primary },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.glassBorder, backgroundColor: colors.glassCard },
  inputBtn: { padding: 6 },
  gifBtn: { fontSize: 12, fontWeight: 'bold', color: colors.primary, backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  input: { flex: 1, backgroundColor: colors.card, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, color: colors.text, maxHeight: 100, marginHorizontal: 4 },
  sendBtn: { backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: colors.card },
  viewOnlyBar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  viewOnlyText: { fontSize: 14, color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  mediaModal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  mediaModalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 20 },
  mediaOption: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  mediaOptionText: { fontSize: 16, color: colors.text },
  mediaCancelBtn: { marginTop: 16, padding: 16, alignItems: 'center' },
  mediaCancelText: { fontSize: 16, color: colors.danger, fontWeight: '600' },
  imageViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  imageViewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
  fullImage: { width: '100%', height: '80%' },
  infoModal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  infoTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  infoSection: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 12, marginTop: 8, textTransform: 'uppercase' as const, letterSpacing: 1 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberInitials: { color: colors.primary, fontSize: 14, fontWeight: 'bold' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '500', color: colors.text },
  memberRole: { fontSize: 13, color: colors.textMuted, textTransform: 'capitalize' },
  viewOnlyBadge: { backgroundColor: colors.warning + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  viewOnlyBadgeText: { fontSize: 11, color: colors.warning },
  scrollToBottomBtn: { position: 'absolute', right: 16, bottom: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
  newMsgBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: colors.danger, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  newMsgBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  typingBar: { paddingHorizontal: 16, paddingVertical: 4 },
  typingText: { fontSize: 13, color: colors.primary, fontStyle: 'italic' },
});