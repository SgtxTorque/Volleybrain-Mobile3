// =============================================================================
// CoachAwardModal — 4-step flow for coaches to award badges to players
// Pattern cloned from GiveShoutoutModal with badge selection replacing categories
// =============================================================================

import { useAuth } from '@/lib/auth';
import { fetchCoachAwardableBadges, awardBadgeToPlayer } from '@/lib/coach-award-service';
import { XP_BY_RARITY } from '@/lib/engagement-constants';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import RarityGlow from '@/components/RarityGlow';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
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
  id: string;           // players table ID
  profileId: string;    // profiles table ID (for XP)
  full_name: string;
  avatar_url: string | null;
};

type AwardableBadge = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  icon_url: string | null;
  rarity: string;
  xp_reward: number | null;
  color_primary: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  teamId: string;
  seasonId: string;
  organizationId: string;
  coachProfileId: string;
  preselectedPlayer?: Recipient | null;
  onSuccess?: () => void;
};

type Step = 'player' | 'badge' | 'note' | 'preview';

// =============================================================================
// Component
// =============================================================================

export default function CoachAwardModal({
  visible,
  onClose,
  teamId,
  seasonId,
  organizationId,
  coachProfileId,
  preselectedPlayer,
  onSuccess,
}: Props) {
  const { colors } = useTheme();
  const { profile } = useAuth();

  const [step, setStep] = useState<Step>(preselectedPlayer ? 'badge' : 'player');
  const [players, setPlayers] = useState<Recipient[]>([]);
  const [badges, setBadges] = useState<AwardableBadge[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Recipient | null>(preselectedPlayer || null);
  const [selectedBadge, setSelectedBadge] = useState<AwardableBadge | null>(null);
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [awarding, setAwarding] = useState(false);

  const s = useMemo(() => createStyles(colors), [colors]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (visible) {
      setStep(preselectedPlayer ? 'badge' : 'player');
      setSelectedPlayer(preselectedPlayer || null);
      setSelectedBadge(null);
      setNote('');
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
      // Fetch team players with their profile IDs
      const { data: teamPlayers } = await supabase
        .from('team_players')
        .select('player_id, players(id, first_name, last_name, photo_url, profile_id)')
        .eq('team_id', teamId);

      const playerList: Recipient[] = [];
      for (const tp of teamPlayers || []) {
        const player = tp.players as any;
        if (!player?.id) continue;
        playerList.push({
          id: player.id,
          profileId: player.profile_id || '',
          full_name: `${player.first_name} ${player.last_name}`,
          avatar_url: player.photo_url || null,
        });
      }

      setPlayers(playerList.sort((a, b) => a.full_name.localeCompare(b.full_name)));

      // Fetch awardable badges
      const awardable = await fetchCoachAwardableBadges(organizationId);
      setBadges(awardable);
    } catch (err) {
      if (__DEV__) console.error('[CoachAwardModal] loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId, organizationId]);

  // ---------------------------------------------------------------------------
  // Filtered players
  // ---------------------------------------------------------------------------

  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return players;
    const q = search.toLowerCase();
    return players.filter((p) => p.full_name.toLowerCase().includes(q));
  }, [players, search]);

  // ---------------------------------------------------------------------------
  // Award badge
  // ---------------------------------------------------------------------------

  const handleAward = async () => {
    if (!selectedPlayer || !selectedBadge || !coachProfileId) return;

    setAwarding(true);
    try {
      const result = await awardBadgeToPlayer({
        coachProfileId,
        playerProfileId: selectedPlayer.profileId,
        playerId: selectedPlayer.id,
        achievementId: selectedBadge.id,
        teamId,
        seasonId,
        organizationId,
        note: note.trim() || undefined,
      });

      if (result.success) {
        Alert.alert(
          'Badge Awarded!',
          `${selectedBadge.name} awarded to ${selectedPlayer.full_name} (+${result.xpAwarded} XP)`,
        );
        onSuccess?.();
        onClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to award badge');
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setAwarding(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  const goBack = () => {
    if (step === 'badge') setStep(preselectedPlayer ? 'badge' : 'player');
    else if (step === 'note') setStep('badge');
    else if (step === 'preview') setStep('note');
    else onClose();

    if (step === 'badge' && preselectedPlayer) onClose();
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const getBadgeXP = (badge: AwardableBadge) =>
    badge.xp_reward || XP_BY_RARITY[badge.rarity?.toLowerCase()] || 25;

  // ---------------------------------------------------------------------------
  // Step 1: Select Player
  // ---------------------------------------------------------------------------

  const renderPlayerStep = () => (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: colors.text }]}>Who deserves a badge?</Text>

      {/* Search */}
      <View style={[s.searchBox, { backgroundColor: colors.secondary, borderColor: colors.glassBorder }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search players..."
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
          data={filteredPlayers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.recipientRow, { borderBottomColor: colors.glassBorder }]}
              onPress={() => {
                setSelectedPlayer(item);
                setStep('badge');
              }}
              activeOpacity={0.7}
            >
              <View style={[s.avatar, { backgroundColor: colors.primary + '30' }]}>
                <Text style={[s.avatarText, { color: colors.primary }]}>{getInitials(item.full_name)}</Text>
              </View>
              <View style={s.recipientInfo}>
                <Text style={[s.recipientName, { color: colors.text }]}>{item.full_name}</Text>
                <Text style={[s.recipientRole, { color: colors.textMuted }]}>Player</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={[s.emptyText, { color: colors.textMuted }]}>No players found</Text>
            </View>
          }
        />
      )}
    </View>
  );

  // ---------------------------------------------------------------------------
  // Step 2: Select Badge
  // ---------------------------------------------------------------------------

  const renderBadgeStep = () => (
    <View style={s.stepContainer}>
      <Text style={[s.stepTitle, { color: colors.text }]}>Choose a badge to award</Text>
      <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>
        For {selectedPlayer?.full_name}
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.badgeGrid}>
          {badges.length === 0 && (
            <Text style={[s.emptyText, { color: colors.textMuted, paddingVertical: 20, textAlign: 'center', width: '100%' }]}>
              No awardable badges available yet.
            </Text>
          )}
          {badges.map((badge) => {
            const isSelected = selectedBadge?.id === badge.id;
            const xp = getBadgeXP(badge);
            return (
              <TouchableOpacity
                key={badge.id}
                style={[
                  s.badgeCard,
                  {
                    borderColor: isSelected ? badge.color_primary || colors.primary : colors.glassBorder,
                    backgroundColor: isSelected ? (badge.color_primary || colors.primary) + '15' : colors.secondary,
                  },
                ]}
                onPress={() => {
                  setSelectedBadge(badge);
                  setStep('note');
                }}
                activeOpacity={0.7}
              >
                <RarityGlow rarity={badge.rarity} size={40} earned>
                  <View style={[s.badgeCircle, { backgroundColor: (badge.color_primary || '#FFD700') + '30' }]}>
                    <Text style={s.badgeEmoji}>{badge.icon || '\uD83C\uDFC6'}</Text>
                  </View>
                </RarityGlow>
                <Text
                  style={[s.badgeName, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {badge.name}
                </Text>
                <View style={s.badgeMeta}>
                  <Text style={[s.badgeRarity, { color: colors.textMuted }]}>
                    {badge.rarity}
                  </Text>
                  <Text style={[s.badgeXp, { color: '#FFD700' }]}>+{xp} XP</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  // ---------------------------------------------------------------------------
  // Step 3: Add Note
  // ---------------------------------------------------------------------------

  const renderNoteStep = () => (
    <KeyboardAvoidingView
      style={s.stepContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[s.stepTitle, { color: colors.text }]}>Add a note (optional)</Text>
      <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>
        {selectedBadge?.icon || '\uD83C\uDFC6'} {selectedBadge?.name} for {selectedPlayer?.full_name}
      </Text>

      <TextInput
        style={[s.messageInput, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: colors.secondary }]}
        placeholder="Great performance today! You really earned this..."
        placeholderTextColor={colors.textMuted}
        value={note}
        onChangeText={(t) => setNote(t.slice(0, 200))}
        multiline
        maxLength={200}
        autoFocus
      />
      <Text style={[s.charCount, { color: colors.textMuted }]}>{note.length}/200</Text>

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
  // Step 4: Preview & Confirm
  // ---------------------------------------------------------------------------

  const renderPreviewStep = () => {
    const xp = selectedBadge ? getBadgeXP(selectedBadge) : 0;

    return (
      <View style={s.stepContainer}>
        <Text style={[s.stepTitle, { color: colors.text }]}>Confirm award</Text>

        {/* Preview Card */}
        <View
          style={[
            s.previewCard,
            {
              borderColor: selectedBadge?.color_primary || colors.primary,
              backgroundColor: (selectedBadge?.color_primary || colors.primary) + '10',
            },
          ]}
        >
          {selectedBadge && (
            <RarityGlow rarity={selectedBadge.rarity} size={64} earned>
              <View style={[s.previewBadgeCircle, { backgroundColor: (selectedBadge.color_primary || '#FFD700') + '30' }]}>
                <Text style={s.previewBadgeEmoji}>{selectedBadge.icon || '\uD83C\uDFC6'}</Text>
              </View>
            </RarityGlow>
          )}
          <Text style={[s.previewTitle, { color: colors.text }]}>
            {selectedBadge?.name}
          </Text>
          <Text style={[s.previewRecipient, { color: colors.textSecondary }]}>
            For {selectedPlayer?.full_name}
          </Text>
          {note.trim() ? (
            <Text style={[s.previewMessage, { color: colors.text }]}>
              &ldquo;{note.trim()}&rdquo;
            </Text>
          ) : null}
          <Text style={[s.previewFrom, { color: colors.textMuted }]}>
            Awarded by {profile?.full_name || 'Coach'}
          </Text>
        </View>

        {/* XP info */}
        <View style={[s.xpInfo, { backgroundColor: colors.secondary }]}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={[s.xpText, { color: colors.textSecondary }]}>
            +{xp} XP for {selectedPlayer?.full_name?.split(' ')[0]}
          </Text>
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={[s.sendBtn, { backgroundColor: selectedBadge?.color_primary || colors.primary }]}
          onPress={handleAward}
          disabled={awarding}
          activeOpacity={0.7}
        >
          {awarding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="ribbon" size={18} color="#fff" />
              <Text style={s.sendBtnText}>Award Badge</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

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
            <Ionicons name={step === 'player' || (step === 'badge' && preselectedPlayer) ? 'close' : 'arrow-back'} size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Award Badge</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Steps */}
        {step === 'player' && renderPlayerStep()}
        {step === 'badge' && renderBadgeStep()}
        {step === 'note' && renderNoteStep()}
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

    // Player step
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

    // Badge step — grid
    badgeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingBottom: 24,
    },
    badgeCard: {
      width: '47%' as any,
      alignItems: 'center',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      gap: 6,
    },
    badgeCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeEmoji: {
      fontSize: 22,
    },
    badgeName: {
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
    badgeMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    badgeRarity: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    badgeXp: {
      fontSize: 10,
      fontWeight: '700',
    },

    // Note step
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
    previewBadgeCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewBadgeEmoji: {
      fontSize: 36,
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
