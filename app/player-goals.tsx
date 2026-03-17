import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
// Types
// =============================================================================

type Goal = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  target_value: number | null;
  current_value: number | null;
  target_date: string | null;
  status: string;
  progress_notes: string | null;
  created_at: string;
};

type Note = {
  id: string;
  note_type: string | null;
  content: string;
  is_private: boolean;
  created_at: string;
};

type PlayerInfo = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: number | null;
  position: string | null;
  photo_url: string | null;
  team_name: string | null;
};

const GOAL_CATEGORIES = ['Serving', 'Passing', 'Setting', 'Hitting', 'Defense', 'Leadership', 'Fitness', 'Other'];
const NOTE_TAGS = ['Serving', 'Passing', 'Setting', 'Hitting', 'Defense', 'Game', 'Practice', 'General'];

// =============================================================================
// Component
// =============================================================================

export default function PlayerGoalsScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const { playerId } = useLocalSearchParams<{ playerId: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // Modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Goal form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalCategory, setGoalCategory] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');

  // Note form
  const [noteContent, setNoteContent] = useState('');
  const [noteTag, setNoteTag] = useState('General');

  const s = createStyles(colors);

  // =============================================================================
  // Data fetching
  // =============================================================================

  const fetchData = useCallback(async () => {
    if (!playerId || !workingSeason) return;

    try {
      // Fetch player info
      const { data: playerData } = await supabase
        .from('players')
        .select('id, first_name, last_name, jersey_number, position, photo_url')
        .eq('id', playerId)
        .single();

      if (playerData) {
        // Get team name
        const { data: tp } = await supabase
          .from('team_players')
          .select('teams(name)')
          .eq('player_id', playerId)
          .limit(1)
          .maybeSingle();

        setPlayer({
          ...playerData,
          team_name: (tp?.teams as any)?.name || null,
        });
      }

      // Fetch goals
      const { data: goalsData } = await supabase
        .from('player_goals')
        .select('*')
        .eq('player_id', playerId)
        .eq('season_id', workingSeason.id)
        .order('created_at', { ascending: false });

      setGoals(goalsData || []);

      // Fetch notes
      const { data: notesData } = await supabase
        .from('player_coach_notes')
        .select('*')
        .eq('player_id', playerId)
        .eq('season_id', workingSeason.id)
        .order('created_at', { ascending: false });

      setNotes(notesData || []);
    } catch (error) {
      if (__DEV__) console.error('Error fetching player goals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [playerId, workingSeason]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // =============================================================================
  // Actions
  // =============================================================================

  const saveGoal = async () => {
    if (!goalTitle.trim() || !playerId || !workingSeason || !profile) return;
    setSaving(true);

    const { error } = await supabase.from('player_goals').insert({
      player_id: playerId,
      season_id: workingSeason.id,
      created_by: profile.id,
      title: goalTitle.trim(),
      description: goalDesc.trim() || null,
      category: goalCategory || null,
      target_value: goalTarget ? parseInt(goalTarget) : null,
      current_value: 0,
      status: 'active',
    });

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }

    setShowGoalModal(false);
    setGoalTitle(''); setGoalDesc(''); setGoalCategory(''); setGoalTarget(''); setGoalTargetDate('');
    fetchData();
  };

  const saveNote = async () => {
    if (!noteContent.trim() || !playerId || !workingSeason || !profile) return;
    setSaving(true);

    const { error } = await supabase.from('player_coach_notes').insert({
      player_id: playerId,
      coach_id: profile.id,
      season_id: workingSeason.id,
      note_type: noteTag,
      content: noteContent.trim(),
      is_private: false,
    });

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }

    setShowNoteModal(false);
    setNoteContent(''); setNoteTag('General');
    fetchData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'at_risk': return colors.danger;
      case 'behind': return colors.warning;
      default: return colors.primary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'at_risk': return 'At Risk';
      case 'behind': return 'Behind';
      default: return 'On Track';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // =============================================================================
  // Render
  // =============================================================================

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Development</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Player Compact Header */}
        {player && (
          <View style={s.playerBar}>
            <View style={s.playerAvatar}>
              <Text style={s.playerInitials}>
                {player.first_name.charAt(0)}{player.last_name.charAt(0)}
              </Text>
            </View>
            <View style={s.playerInfo}>
              <Text style={s.playerName}>{player.first_name} {player.last_name}</Text>
              <Text style={s.playerMeta}>
                {player.jersey_number ? `#${player.jersey_number}` : ''}
                {player.position ? ` \u00B7 ${player.position}` : ''}
                {player.team_name ? ` \u00B7 ${player.team_name}` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Goals Section */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>GOALS</Text>
          <TouchableOpacity style={s.addBtnSmall} onPress={() => setShowGoalModal(true)}>
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={s.addBtnText}>Add Goal</Text>
          </TouchableOpacity>
        </View>

        {goals.length === 0 ? (
          <View style={s.emptyCard}>
            <Image
              source={require('@/assets/images/mascot/Meet-Lynx.png')}
              style={s.emptyMascot}
              resizeMode="contain"
            />
            <Text style={s.emptyTitle}>
              Start tracking {player?.first_name || 'this player'}'s development!
            </Text>
            <Text style={s.emptySubtext}>Add goals to track progress over the season.</Text>
          </View>
        ) : (
          goals.map(goal => {
            const progress = goal.target_value && goal.current_value
              ? Math.min((goal.current_value / goal.target_value) * 100, 100)
              : 0;
            const statusColor = getStatusColor(goal.status);

            return (
              <View key={goal.id} style={s.goalCard}>
                <View style={s.goalTop}>
                  <View style={s.goalTitleRow}>
                    <Text style={s.goalTitle}>{goal.title}</Text>
                    <View style={[s.statusBadge, { backgroundColor: statusColor + '20' }]}>
                      <Text style={[s.statusText, { color: statusColor }]}>
                        {getStatusLabel(goal.status)}
                      </Text>
                    </View>
                  </View>
                  {goal.category && (
                    <View style={s.categoryPill}>
                      <Text style={s.categoryText}>{goal.category}</Text>
                    </View>
                  )}
                  {goal.description && (
                    <Text style={s.goalDesc}>{goal.description}</Text>
                  )}
                </View>

                {goal.target_value != null && (
                  <View style={s.progressWrap}>
                    <View style={s.progressBar}>
                      <View style={[s.progressFill, { width: `${progress}%`, backgroundColor: statusColor }]} />
                    </View>
                    <Text style={s.progressLabel}>
                      {goal.current_value || 0} / {goal.target_value}
                    </Text>
                  </View>
                )}

                {goal.target_date && (
                  <Text style={s.goalDate}>
                    Target: {formatDate(goal.target_date)}
                  </Text>
                )}
              </View>
            );
          })
        )}

        {/* Notes Section */}
        <View style={[s.sectionHeader, { marginTop: 24 }]}>
          <Text style={s.sectionTitle}>SESSION NOTES</Text>
          <TouchableOpacity style={s.addBtnSmall} onPress={() => setShowNoteModal(true)}>
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={s.addBtnText}>Add Note</Text>
          </TouchableOpacity>
        </View>

        {notes.length === 0 ? (
          <View style={s.emptyNotes}>
            <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
            <Text style={s.emptyNotesText}>No session notes yet</Text>
          </View>
        ) : (
          notes.map(note => (
            <View key={note.id} style={s.noteCard}>
              <View style={s.noteHeader}>
                <Text style={s.noteDate}>{formatDate(note.created_at)}</Text>
                {note.note_type && (
                  <View style={s.noteTagPill}>
                    <Text style={s.noteTagText}>{note.note_type}</Text>
                  </View>
                )}
              </View>
              <Text style={s.noteContent}>{note.content}</Text>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showGoalModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalWrap}>
            <View style={s.modal}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Add Goal</Text>
                <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.formLabel}>GOAL TITLE *</Text>
                <TextInput
                  style={s.formInput}
                  placeholder="e.g., Improve serve accuracy"
                  placeholderTextColor={colors.textMuted}
                  value={goalTitle}
                  onChangeText={setGoalTitle}
                />

                <Text style={s.formLabel}>DESCRIPTION</Text>
                <TextInput
                  style={[s.formInput, s.textArea]}
                  placeholder="Details about this goal..."
                  placeholderTextColor={colors.textMuted}
                  value={goalDesc}
                  onChangeText={setGoalDesc}
                  multiline
                />

                <Text style={s.formLabel}>CATEGORY</Text>
                <View style={s.pillRow}>
                  {GOAL_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[s.pillBtn, goalCategory === cat && s.pillBtnActive]}
                      onPress={() => setGoalCategory(goalCategory === cat ? '' : cat)}
                    >
                      <Text style={[s.pillBtnText, goalCategory === cat && s.pillBtnTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.formLabel}>TARGET VALUE (OPTIONAL)</Text>
                <TextInput
                  style={s.formInput}
                  placeholder="e.g., 85"
                  placeholderTextColor={colors.textMuted}
                  value={goalTarget}
                  onChangeText={setGoalTarget}
                  keyboardType="number-pad"
                />

                <TouchableOpacity
                  style={[s.saveBtn, saving && { opacity: 0.5 }]}
                  onPress={saveGoal}
                  disabled={saving || !goalTitle.trim()}
                >
                  <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save Goal'}</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Add Note Modal */}
      <Modal visible={showNoteModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalWrap}>
            <View style={s.modal}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Add Session Note</Text>
                <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.formLabel}>TAG</Text>
                <View style={s.pillRow}>
                  {NOTE_TAGS.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={[s.pillBtn, noteTag === tag && s.pillBtnActive]}
                      onPress={() => setNoteTag(tag)}
                    >
                      <Text style={[s.pillBtnText, noteTag === tag && s.pillBtnTextActive]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.formLabel}>NOTE</Text>
                <TextInput
                  style={[s.formInput, s.textArea]}
                  placeholder="Write your session notes..."
                  placeholderTextColor={colors.textMuted}
                  value={noteContent}
                  onChangeText={setNoteContent}
                  multiline
                />

                <TouchableOpacity
                  style={[s.saveBtn, saving && { opacity: 0.5 }]}
                  onPress={saveNote}
                  disabled={saving || !noteContent.trim()}
                >
                  <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save Note'}</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { ...displayTextStyle, fontSize: 18, color: colors.text },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.screenPadding },

    // Player bar
    playerBar: {
      flexDirection: 'row', alignItems: 'center', marginBottom: 20,
      backgroundColor: colors.glassCard, borderRadius: radii.card, padding: 14,
      borderWidth: 1, borderColor: colors.glassBorder, ...shadows.card,
    },
    playerAvatar: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + '30',
      justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    playerInitials: { fontSize: 16, fontFamily: FONTS.bodyBold, color: colors.primary },
    playerInfo: { flex: 1 },
    playerName: { fontSize: 17, fontFamily: FONTS.bodyBold, color: colors.text },
    playerMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

    // Section headers
    sectionHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 13, fontFamily: FONTS.bodyBold, color: colors.textMuted,
      textTransform: 'uppercase', letterSpacing: 1.2,
    },
    addBtnSmall: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
      backgroundColor: colors.primary + '15',
    },
    addBtnText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: colors.primary },

    // Empty state
    emptyCard: {
      backgroundColor: colors.glassCard, borderRadius: radii.card, padding: 32,
      alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder, ...shadows.card,
    },
    emptyMascot: { width: 100, height: 100, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontFamily: FONTS.bodySemiBold, color: colors.text, textAlign: 'center' },
    emptySubtext: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 4 },

    // Goal cards
    goalCard: {
      backgroundColor: colors.glassCard, borderRadius: radii.card, padding: 16,
      marginBottom: 10, borderWidth: 1, borderColor: colors.glassBorder, ...shadows.card,
    },
    goalTop: { marginBottom: 8 },
    goalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    goalTitle: { fontSize: 16, fontFamily: FONTS.bodyBold, color: colors.text, flex: 1, marginRight: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    statusText: { fontSize: 11, fontFamily: FONTS.bodySemiBold },
    categoryPill: {
      alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3,
      borderRadius: 10, backgroundColor: colors.info + '15', marginTop: 6,
    },
    categoryText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: colors.info },
    goalDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginTop: 6 },
    progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    progressBar: {
      flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 4 },
    progressLabel: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: colors.textMuted, minWidth: 50, textAlign: 'right' },
    goalDate: { fontSize: 12, color: colors.textMuted, marginTop: 8 },

    // Notes
    emptyNotes: {
      alignItems: 'center', padding: 32,
      backgroundColor: colors.glassCard, borderRadius: radii.card,
      borderWidth: 1, borderColor: colors.glassBorder,
    },
    emptyNotesText: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
    noteCard: {
      backgroundColor: colors.glassCard, borderRadius: radii.card, padding: 14,
      marginBottom: 8, borderWidth: 1, borderColor: colors.glassBorder,
    },
    noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    noteDate: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: colors.textMuted },
    noteTagPill: {
      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
      backgroundColor: colors.primary + '15',
    },
    noteTagText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: colors.primary },
    noteContent: { fontSize: 14, color: colors.text, lineHeight: 20 },

    // Modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalWrap: { flex: 1, justifyContent: 'flex-end' },
    modal: {
      backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, maxHeight: '85%',
    },
    modalHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: colors.textMuted + '40', alignSelf: 'center', marginBottom: 12,
    },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
    },
    modalTitle: { ...displayTextStyle, fontSize: 18, color: colors.text },
    formLabel: {
      fontSize: 12, fontFamily: FONTS.bodySemiBold, color: colors.textMuted,
      marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    formInput: {
      backgroundColor: colors.glassCard, borderRadius: radii.card, borderWidth: 1,
      borderColor: colors.glassBorder, paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 15, color: colors.text,
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pillBtn: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
      borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glassCard,
    },
    pillBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    pillBtnText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: colors.textSecondary },
    pillBtnTextActive: { color: colors.background },
    saveBtn: {
      backgroundColor: colors.primary, borderRadius: radii.card, paddingVertical: 14,
      alignItems: 'center', marginTop: 20,
    },
    saveBtnText: { fontSize: 16, fontFamily: FONTS.bodyBold, color: colors.background },
  });
