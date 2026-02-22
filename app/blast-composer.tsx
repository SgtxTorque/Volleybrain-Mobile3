import { useAuth } from '@/lib/auth';
import { queueBlastEmail } from '@/lib/email-queue';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================================================
// TYPES
// ============================================================================

type Team = {
  id: string;
  name: string;
};

type MessageType = 'announcement' | 'schedule_change' | 'payment_reminder' | 'custom';
type Priority = 'normal' | 'urgent';
type TargetType = 'all' | 'team';

const MESSAGE_TYPES: { key: MessageType; label: string; icon: string }[] = [
  { key: 'announcement', label: 'Announcement', icon: 'megaphone' },
  { key: 'schedule_change', label: 'Schedule', icon: 'calendar' },
  { key: 'payment_reminder', label: 'Payment', icon: 'card' },
  { key: 'custom', label: 'Custom', icon: 'create' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BlastComposerScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('announcement');
  const [priority, setPriority] = useState<Priority>('normal');
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Data state
  const [teams, setTeams] = useState<Team[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingCount, setLoadingCount] = useState(false);
  const [sending, setSending] = useState(false);
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (workingSeason?.id) {
      loadTeams();
    }
  }, [workingSeason?.id]);

  useEffect(() => {
    if (workingSeason?.id) {
      calculateRecipientCount();
    }
  }, [targetType, selectedTeamId, workingSeason?.id]);

  const loadTeams = async () => {
    if (!workingSeason?.id) return;
    setLoadingTeams(true);

    const { data, error } = await supabase
      .from('teams')
      .select('id, name')
      .eq('season_id', workingSeason.id)
      .order('name');

    if (data) {
      setTeams(data);
      if (data.length > 0) {
        setSelectedTeamId(data[0].id);
      }
    }
    setLoadingTeams(false);
  };

  const calculateRecipientCount = async () => {
    if (!workingSeason?.id) return;
    setLoadingCount(true);

    try {
      if (targetType === 'all') {
        const { count, error } = await supabase
          .from('players')
          .select('id', { count: 'exact', head: true })
          .eq('season_id', workingSeason.id);

        setRecipientCount(count || 0);
      } else if (targetType === 'team' && selectedTeamId) {
        const { count, error } = await supabase
          .from('team_players')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', selectedTeamId);

        setRecipientCount(count || 0);
      } else {
        setRecipientCount(0);
      }
    } catch {
      setRecipientCount(0);
    } finally {
      setLoadingCount(false);
    }
  };

  // ============================================================================
  // SEND BLAST
  // ============================================================================

  const handleSend = async () => {
    // Validate
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your announcement.');
      return;
    }
    if (!body.trim()) {
      Alert.alert('Missing Message', 'Please enter the message body.');
      return;
    }
    if (!workingSeason?.id || !profile?.id) {
      Alert.alert('Error', 'Missing season or profile information. Please try again.');
      return;
    }
    if (targetType === 'team' && !selectedTeamId) {
      Alert.alert('No Team Selected', 'Please select a target team.');
      return;
    }

    // Confirm send
    const targetLabel = targetType === 'all'
      ? 'all parents'
      : `${teams.find(t => t.id === selectedTeamId)?.name || 'selected team'} parents`;

    Alert.alert(
      'Send Announcement?',
      `This will be sent to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''} (${targetLabel}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', style: 'default', onPress: executeSend },
      ]
    );
  };

  const executeSend = async () => {
    if (!workingSeason?.id || !profile?.id) return;
    setSending(true);

    try {
      // 1. Insert message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          title: title.trim(),
          body: body.trim(),
          message_type: messageType,
          priority,
          target_type: targetType,
          target_team_id: targetType === 'team' ? selectedTeamId : null,
          season_id: workingSeason.id,
          sender_id: profile.id,
        })
        .select('id')
        .single();

      if (messageError) throw messageError;
      if (!messageData) throw new Error('No message returned after insert.');

      const messageId = messageData.id;

      // 2. Fetch recipients (players with parent info)
      let recipientQuery = supabase
        .from('players')
        .select('id, first_name, last_name, parent_name, parent_email, parent_account_id');

      if (targetType === 'all') {
        recipientQuery = recipientQuery.eq('season_id', workingSeason.id);
      } else if (targetType === 'team' && selectedTeamId) {
        // Get player IDs from team_players, then fetch those players
        const { data: teamPlayerData } = await supabase
          .from('team_players')
          .select('player_id')
          .eq('team_id', selectedTeamId);

        const playerIds = teamPlayerData?.map(tp => tp.player_id) || [];
        if (playerIds.length === 0) {
          // No players in team, still mark message as sent
          Alert.alert('Sent!', 'Announcement created, but no recipients found in the selected team.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
        recipientQuery = recipientQuery.in('id', playerIds);
      }

      const { data: players, error: playersError } = await recipientQuery;
      if (playersError) throw playersError;

      // 3. Insert recipients
      if (players && players.length > 0) {
        const recipients = players.map((p: any) => ({
          message_id: messageId,
          recipient_type: 'parent',
          player_id: p.id,
          profile_id: p.parent_account_id || null,
          recipient_name: p.parent_name,
          recipient_email: p.parent_email,
        }));

        const { error: recipientsError } = await supabase
          .from('message_recipients')
          .insert(recipients);

        if (recipientsError) throw recipientsError;

        // Queue blast emails for each recipient
        try {
          const orgId = profile?.current_organization_id || '';
          for (const p of players) {
            if (p.parent_email) {
              queueBlastEmail(orgId, p.parent_email, p.parent_name || '', p.parent_account_id || null, title.trim(), body.trim(), '');
            }
          }
        } catch {}
      }

      // 4. Success
      Alert.alert(
        'Announcement Sent!',
        `"${title.trim()}" was sent to ${players?.length || 0} recipient${(players?.length || 0) !== 1 ? 's' : ''}.`,
        [
          { text: 'View Sent', onPress: () => router.push('/blast-history' as any) },
          { text: 'Done', onPress: () => router.back() },
        ]
      );
    } catch (error: any) {
      Alert.alert('Send Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const selectedTeamName = teams.find(t => t.id === selectedTeamId)?.name || 'Select Team';

  const isFormValid = title.trim().length > 0 && body.trim().length > 0 &&
    (targetType === 'all' || (targetType === 'team' && selectedTeamId));

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.bgSecondary, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>New Announcement</Text>
          <View style={styles.headerBtn} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Input */}
          <View style={[styles.card, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>TITLE</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
              placeholder="Announcement title..."
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Message Body */}
          <View style={[styles.card, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>MESSAGE</Text>
            <TextInput
              style={[styles.textAreaInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
              placeholder="Write your message here..."
              placeholderTextColor={colors.textMuted}
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={[styles.charCount, { color: colors.textMuted }]}>
              {body.length}/2000
            </Text>
          </View>

          {/* Message Type */}
          <View style={[styles.card, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>TYPE</Text>
            <View style={styles.chipRow}>
              {MESSAGE_TYPES.map(mt => {
                const isSelected = messageType === mt.key;
                return (
                  <TouchableOpacity
                    key={mt.key}
                    style={[
                      styles.chip,
                      { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary + '20' : colors.bgSecondary },
                    ]}
                    onPress={() => setMessageType(mt.key)}
                  >
                    <Ionicons
                      name={mt.icon as any}
                      size={16}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.chipText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                      {mt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Priority Toggle */}
          <View style={[styles.card, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>PRIORITY</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  {
                    borderColor: priority === 'normal' ? colors.success : colors.border,
                    backgroundColor: priority === 'normal' ? colors.success + '20' : colors.bgSecondary,
                  },
                ]}
                onPress={() => setPriority('normal')}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={priority === 'normal' ? colors.success : colors.textMuted}
                />
                <Text style={[styles.toggleText, { color: priority === 'normal' ? colors.success : colors.textSecondary }]}>
                  Normal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  {
                    borderColor: priority === 'urgent' ? colors.danger : colors.border,
                    backgroundColor: priority === 'urgent' ? colors.danger + '20' : colors.bgSecondary,
                  },
                ]}
                onPress={() => setPriority('urgent')}
              >
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={priority === 'urgent' ? colors.danger : colors.textMuted}
                />
                <Text style={[styles.toggleText, { color: priority === 'urgent' ? colors.danger : colors.textSecondary }]}>
                  Urgent
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Target Audience */}
          <View style={[styles.card, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>TARGET AUDIENCE</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  {
                    borderColor: targetType === 'all' ? colors.primary : colors.border,
                    backgroundColor: targetType === 'all' ? colors.primary + '20' : colors.bgSecondary,
                    flex: 1,
                  },
                ]}
                onPress={() => { setTargetType('all'); setShowTeamPicker(false); }}
              >
                <Ionicons
                  name="people"
                  size={18}
                  color={targetType === 'all' ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.toggleText, { color: targetType === 'all' ? colors.primary : colors.textSecondary }]}>
                  All Parents
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  {
                    borderColor: targetType === 'team' ? colors.primary : colors.border,
                    backgroundColor: targetType === 'team' ? colors.primary + '20' : colors.bgSecondary,
                    flex: 1,
                  },
                ]}
                onPress={() => { setTargetType('team'); setShowTeamPicker(true); }}
              >
                <Ionicons
                  name="shirt"
                  size={18}
                  color={targetType === 'team' ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.toggleText, { color: targetType === 'team' ? colors.primary : colors.textSecondary }]}>
                  Specific Team
                </Text>
              </TouchableOpacity>
            </View>

            {/* Team Picker */}
            {targetType === 'team' && (
              <View style={styles.teamPickerSection}>
                {loadingTeams ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
                ) : teams.length === 0 ? (
                  <Text style={[styles.noTeamsText, { color: colors.textMuted }]}>
                    No teams found for this season.
                  </Text>
                ) : (
                  <View style={styles.teamList}>
                    {teams.map(team => {
                      const isSelected = selectedTeamId === team.id;
                      return (
                        <TouchableOpacity
                          key={team.id}
                          style={[
                            styles.teamItem,
                            {
                              borderColor: isSelected ? colors.primary : colors.border,
                              backgroundColor: isSelected ? colors.primary + '15' : colors.bgSecondary,
                            },
                          ]}
                          onPress={() => setSelectedTeamId(team.id)}
                        >
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color={isSelected ? colors.primary : colors.textMuted}
                          />
                          <Text style={[styles.teamItemText, { color: isSelected ? colors.primary : colors.text }]}>
                            {team.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Recipient Count Preview */}
          <View style={[styles.recipientPreview, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <Ionicons name="mail" size={20} color={colors.primary} />
            <Text style={[styles.recipientText, { color: colors.textSecondary }]}>
              {loadingCount ? (
                'Counting recipients...'
              ) : (
                `This will be sent to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}`
              )}
            </Text>
            {loadingCount && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {/* Urgent Warning */}
          {priority === 'urgent' && (
            <View style={[styles.urgentWarning, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}>
              <Ionicons name="warning" size={18} color={colors.danger} />
              <Text style={[styles.urgentWarningText, { color: colors.danger }]}>
                Urgent messages may trigger push notifications and email alerts.
              </Text>
            </View>
          )}

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: isFormValid ? colors.primary : colors.bgSecondary,
                borderColor: isFormValid ? colors.primary : colors.border,
              },
            ]}
            onPress={handleSend}
            disabled={!isFormValid || sending}
          >
            {sending ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Ionicons
                  name="send"
                  size={20}
                  color={isFormValid ? '#000' : colors.textMuted}
                />
                <Text style={[styles.sendButtonText, { color: isFormValid ? '#000' : colors.textMuted }]}>
                  Send Announcement
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },

  // Glass Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  // Field Label
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Text Input
  textInput: {
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },

  // Text Area
  textAreaInput: {
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 130,
  },

  // Char count
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Team Picker
  teamPickerSection: {
    marginTop: 14,
  },
  noTeamsText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  teamList: {
    gap: 8,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  teamItemText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Recipient Preview
  recipientPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  recipientText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },

  // Urgent Warning
  urgentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  urgentWarningText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // Send Button
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
