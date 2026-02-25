// =============================================================================
// GiveShoutoutModal — Full shoutout creation flow
// =============================================================================

import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { fetchShoutoutCategories, giveShoutout } from '@/lib/shoutout-service';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { ShoutoutCategory } from '@/lib/engagement-types';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =============================================================================
// Types
// =============================================================================

type Recipient = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
};

type Props = {
  visible: boolean;
  teamId: string;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedRecipient?: Recipient | null;
};

type Step = 'recipient' | 'category' | 'message' | 'preview';

// =============================================================================
// Component
// =============================================================================

export default function GiveShoutoutModal({ visible, teamId, onClose, onSuccess, preselectedRecipient }: Props) {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { isCoach, isAdmin, isParent, isPlayer } = usePermissions();

  const [step, setStep] = useState<Step>(preselectedRecipient ? 'category' : 'recipient');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [categories, setCategories] = useState<ShoutoutCategory[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(preselectedRecipient || null);
  const [selectedCategory, setSelectedCategory] = useState<ShoutoutCategory | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const s = useMemo(() => createStyles(colors), [colors]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (visible) {
      setStep(preselectedRecipient ? 'category' : 'recipient');
      setSelectedRecipient(preselectedRecipient || null);
      setSelectedCategory(null);
      setMessage('');
      setSearch('');
      loadData();
    }
  }, [visible]);

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch team members (players + staff)
      const { data: teamPlayers } = await supabase
        .from('team_players')
        .select('player_id, players(id, first_name, last_name, photo_url)')
        .eq('team_id', teamId);

      const { data: teamStaff } = await supabase
        .from('team_staff')
        .select('user_id, profiles(id, full_name, avatar_url)')
        .eq('team_id', teamId)
        .eq('is_active', true);

      const memberMap = new Map<string, Recipient>();

      // Add players
      for (const tp of teamPlayers || []) {
        const player = tp.players as any;
        if (!player?.id || player.id === user?.id) continue;
        memberMap.set(player.id, {
          id: player.id,
          full_name: `${player.first_name} ${player.last_name}`,
          avatar_url: player.photo_url || null,
          role: 'player',
        });
      }

      // Add staff/coaches
      for (const ts of teamStaff || []) {
        const prof = ts.profiles as any;
        if (!prof?.id || prof.id === user?.id) continue;
        if (memberMap.has(prof.id)) continue;
        memberMap.set(prof.id, {
          id: prof.id,
          full_name: prof.full_name || 'Unknown',
          avatar_url: prof.avatar_url || null,
          role: 'coach',
        });
      }

      setRecipients(Array.from(memberMap.values()).sort((a, b) => a.full_name.localeCompare(b.full_name)));

      // Fetch shoutout categories
      const orgId = profile?.current_organization_id || undefined;
      const cats = await fetchShoutoutCategories(orgId);
      setCategories(cats);
    } catch (err) {
      if (__DEV__) console.error('[GiveShoutout] loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId, user?.id, profile?.current_organization_id]);

  // ---------------------------------------------------------------------------
  // Filtered recipients
  // ---------------------------------------------------------------------------

  const filteredRecipients = useMemo(() => {
    if (!search.trim()) return recipients;
    const q = search.toLowerCase();
    return recipients.filter((r) => r.full_name.toLowerCase().includes(q));
  }, [recipients, search]);

  // ---------------------------------------------------------------------------
  // Determine giver role
  // ---------------------------------------------------------------------------

  const giverRole = isAdmin ? 'admin' : isCoach ? 'coach' : isParent ? 'parent' : 'player';

  // ---------------------------------------------------------------------------
  // Send shoutout
  // ---------------------------------------------------------------------------

  const handleSend = async () => {
    if (!selectedRecipient || !selectedCategory || !user?.id || !profile) return;

    setSending(true);
    try {
      const result = await giveShoutout({
        giverId: user.id,
        giverRole,
        giverName: profile.full_name || 'Someone',
        receiverId: selectedRecipient.id,
        receiverRole: selectedRecipient.role,
        receiverName: selectedRecipient.full_name,
        receiverAvatar: selectedRecipient.avatar_url,
        teamId,
        organizationId: profile.current_organization_id || '',
        category: selectedCategory,
        message: message.trim() || undefined,
      });

      if (result.success) {
        onSuccess?.();
        onClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to send shoutout');
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  const goBack = () => {
    if (step === 'category') setStep(preselectedRecipient ? 'recipient' : 'recipient');
    else if (step === 'message') setStep('category');
    else if (step === 'preview') setStep('message');
    else onClose();
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  // ---------------------------------------------------------------------------
  // Step: Select Recipient
  // ---------------------------------------------------------------------------

  const renderRecipientStep = () => (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: colors.text }]}>Who deserves a shoutout?</Text>

      {/* Search */}
      <View style={[s.searchBox, { backgroundColor: colors.secondary, borderColor: colors.glassBorder }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search teammates..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={filteredRecipients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.recipientRow, { borderBottomColor: colors.glassBorder }]}
              onPress={() => {
                setSelectedRecipient(item);
                setStep('category');
              }}
              activeOpacity={0.7}
            >
              <View style={[s.avatar, { backgroundColor: colors.primary + '30' }]}>
                <Text style={[s.avatarText, { color: colors.primary }]}>{getInitials(item.full_name)}</Text>
              </View>
              <View style={s.recipientInfo}>
                <Text style={[s.recipientName, { color: colors.text }]}>{item.full_name}</Text>
                <Text style={[s.recipientRole, { color: colors.textMuted }]}>
                  {item.role === 'coach' ? 'Coach' : 'Player'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={[s.emptyText, { color: colors.textMuted }]}>No teammates found</Text>
            </View>
          }
        />
      )}
    </View>
  );

  // ---------------------------------------------------------------------------
  // Step: Select Category
  // ---------------------------------------------------------------------------

  const renderCategoryStep = () => (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: colors.text }]}>What's the shoutout for?</Text>
      <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>
        For {selectedRecipient?.full_name}
      </Text>

      <View style={s.categoryGrid}>
        {categories.map((cat) => {
          const isSelected = selectedCategory?.id === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                s.categoryChip,
                { borderColor: isSelected ? cat.color || colors.primary : colors.glassBorder },
                isSelected && { backgroundColor: (cat.color || colors.primary) + '20' },
              ]}
              onPress={() => {
                setSelectedCategory(cat);
                setStep('message');
              }}
              activeOpacity={0.7}
            >
              <Text style={s.categoryEmoji}>{cat.emoji}</Text>
              <Text
                style={[
                  s.categoryName,
                  { color: isSelected ? cat.color || colors.primary : colors.text },
                ]}
                numberOfLines={1}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Step: Optional Message
  // ---------------------------------------------------------------------------

  const renderMessageStep = () => (
    <KeyboardAvoidingView
      style={s.stepContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[s.stepTitle, { color: colors.text }]}>Add a message (optional)</Text>
      <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>
        {selectedCategory?.emoji} {selectedCategory?.name} for {selectedRecipient?.full_name}
      </Text>

      <TextInput
        style={[s.messageInput, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.secondary }]}
        placeholder="Great job today! You really showed up when it counted..."
        placeholderTextColor={colors.textMuted}
        value={message}
        onChangeText={(t) => setMessage(t.slice(0, 200))}
        multiline
        maxLength={200}
        autoFocus
      />
      <Text style={[s.charCount, { color: colors.textMuted }]}>{message.length}/200</Text>

      <TouchableOpacity
        style={[s.nextBtn, { backgroundColor: colors.primary }]}
        onPress={() => setStep('preview')}
        activeOpacity={0.7}
      >
        <Text style={s.nextBtnText}>Preview</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.skipBtn}
        onPress={() => setStep('preview')}
        activeOpacity={0.7}
      >
        <Text style={[s.skipBtnText, { color: colors.textSecondary }]}>Skip</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );

  // ---------------------------------------------------------------------------
  // Step: Preview & Send
  // ---------------------------------------------------------------------------

  const renderPreviewStep = () => (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: colors.text }]}>Preview your shoutout</Text>

      {/* Preview Card */}
      <View
        style={[
          s.previewCard,
          {
            borderColor: selectedCategory?.color || colors.primary,
            backgroundColor: (selectedCategory?.color || colors.primary) + '10',
          },
        ]}
      >
        <Text style={s.previewEmoji}>{selectedCategory?.emoji}</Text>
        <Text style={[s.previewTitle, { color: colors.text }]}>
          {selectedCategory?.name}
        </Text>
        <Text style={[s.previewRecipient, { color: colors.textSecondary }]}>
          For {selectedRecipient?.full_name}
        </Text>
        {message.trim() ? (
          <Text style={[s.previewMessage, { color: colors.text }]}>
            "{message.trim()}"
          </Text>
        ) : null}
        <Text style={[s.previewFrom, { color: colors.textMuted }]}>
          From {profile?.full_name || 'You'}
        </Text>
      </View>

      {/* XP info */}
      <View style={[s.xpInfo, { backgroundColor: colors.secondary }]}>
        <Ionicons name="star" size={16} color="#FFD700" />
        <Text style={[s.xpText, { color: colors.textSecondary }]}>
          +10 XP for you, +15 XP for {selectedRecipient?.full_name?.split(' ')[0]}
        </Text>
      </View>

      {/* Send button */}
      <TouchableOpacity
        style={[s.sendBtn, { backgroundColor: selectedCategory?.color || colors.primary }]}
        onPress={handleSend}
        disabled={sending}
        activeOpacity={0.7}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="send" size={18} color="#fff" />
            <Text style={s.sendBtnText}>Send Shoutout</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: colors.glassBorder }]}>
          <TouchableOpacity onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name={step === 'recipient' ? 'close' : 'arrow-back'} size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Give Shoutout</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Steps */}
        {step === 'recipient' && renderRecipientStep()}
        {step === 'category' && renderCategoryStep()}
        {step === 'message' && renderMessageStep()}
        {step === 'preview' && renderPreviewStep()}
      </SafeAreaView>
    </Modal>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    stepContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    stepTitle: {
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 4,
    },
    stepSubtitle: {
      fontSize: 14,
      marginBottom: 20,
    },

    // Recipient step
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      padding: 0,
    },
    recipientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      gap: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '700',
    },
    recipientInfo: {
      flex: 1,
    },
    recipientName: {
      fontSize: 16,
      fontWeight: '600',
    },
    recipientRole: {
      fontSize: 13,
      marginTop: 2,
    },
    emptyState: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 15,
    },

    // Category step
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    categoryChip: {
      width: '47%' as any,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 16,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    categoryEmoji: {
      fontSize: 28,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
    },

    // Message step
    messageInput: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      fontSize: 16,
      minHeight: 120,
      textAlignVertical: 'top',
    },
    charCount: {
      fontSize: 12,
      textAlign: 'right',
      marginTop: 6,
    },
    nextBtn: {
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 20,
    },
    nextBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    skipBtn: {
      paddingVertical: 14,
      alignItems: 'center',
    },
    skipBtnText: {
      fontSize: 15,
      fontWeight: '600',
    },

    // Preview step
    previewCard: {
      borderWidth: 2,
      borderRadius: 18,
      padding: 28,
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    previewEmoji: {
      fontSize: 56,
    },
    previewTitle: {
      fontSize: 22,
      fontWeight: '800',
    },
    previewRecipient: {
      fontSize: 16,
    },
    previewMessage: {
      fontSize: 15,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 16,
    },
    previewFrom: {
      fontSize: 13,
      marginTop: 8,
    },
    xpInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      marginBottom: 20,
    },
    xpText: {
      fontSize: 13,
      fontWeight: '500',
    },
    sendBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 16,
      borderRadius: 14,
    },
    sendBtnText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '700',
    },
  });
