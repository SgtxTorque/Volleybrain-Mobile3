import { useAuth } from '@/lib/auth';
import { queueBlastEmail } from '@/lib/email-queue';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
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
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const { colors } = useTheme();
  // ─── Role Guard ────────────────────────────────
  const { isAdmin, isCoach, isTeamManager, loading } = usePermissions();

  if (loading) return null;

  if (!isAdmin && !isCoach && !isTeamManager) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors?.background || '#F6F8FB', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 }}>
        <Ionicons name="lock-closed-outline" size={48} color={colors?.textMuted || '#999'} />
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 18, color: colors?.text || '#10284C' }}>Access Restricted</Text>
        <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 14, color: colors?.textMuted || '#999', textAlign: 'center' }}>
          Staff permissions required.
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: FONTS.bodySemiBold, color: '#4BB9EC', fontSize: 15 }}>Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  // ─── End Role Guard ────────────────────────────

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
    <SafeAreaView style={[s.safeArea, { backgroundColor: 'transparent' }]}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={BRAND.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>New Announcement</Text>
          <View style={s.headerBtn} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Input */}
          <View style={s.card}>
            <Text style={s.fieldLabel}>TITLE</Text>
            <TextInput
              style={s.textInput}
              placeholder="Announcement title..."
              placeholderTextColor={BRAND.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Message Body */}
          <View style={s.card}>
            <Text style={s.fieldLabel}>MESSAGE</Text>
            <TextInput
              style={s.textAreaInput}
              placeholder="Write your message here..."
              placeholderTextColor={BRAND.textMuted}
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={s.charCount}>
              {body.length}/2000
            </Text>
          </View>

          {/* Message Type */}
          <View style={s.card}>
            <Text style={s.fieldLabel}>TYPE</Text>
            <View style={s.chipRow}>
              {MESSAGE_TYPES.map(mt => {
                const isSelected = messageType === mt.key;
                return (
                  <TouchableOpacity
                    key={mt.key}
                    style={[
                      s.chip,
                      { borderColor: isSelected ? BRAND.teal : BRAND.border, backgroundColor: isSelected ? BRAND.teal + '20' : BRAND.warmGray },
                    ]}
                    onPress={() => setMessageType(mt.key)}
                  >
                    <Ionicons
                      name={mt.icon as any}
                      size={16}
                      color={isSelected ? BRAND.teal : BRAND.textMuted}
                    />
                    <Text style={[s.chipText, { color: isSelected ? BRAND.teal : BRAND.textSecondary }]}>
                      {mt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Priority Toggle */}
          <View style={s.card}>
            <Text style={s.fieldLabel}>PRIORITY</Text>
            <View style={s.toggleRow}>
              <TouchableOpacity
                style={[
                  s.toggleBtn,
                  {
                    borderColor: priority === 'normal' ? BRAND.success : BRAND.border,
                    backgroundColor: priority === 'normal' ? BRAND.success + '20' : BRAND.warmGray,
                  },
                ]}
                onPress={() => setPriority('normal')}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={priority === 'normal' ? BRAND.success : BRAND.textMuted}
                />
                <Text style={[s.toggleText, { color: priority === 'normal' ? BRAND.success : BRAND.textSecondary }]}>
                  Normal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.toggleBtn,
                  {
                    borderColor: priority === 'urgent' ? BRAND.coral : BRAND.border,
                    backgroundColor: priority === 'urgent' ? BRAND.coral + '20' : BRAND.warmGray,
                  },
                ]}
                onPress={() => setPriority('urgent')}
              >
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={priority === 'urgent' ? BRAND.coral : BRAND.textMuted}
                />
                <Text style={[s.toggleText, { color: priority === 'urgent' ? BRAND.coral : BRAND.textSecondary }]}>
                  Urgent
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Target Audience */}
          <View style={s.card}>
            <Text style={s.fieldLabel}>TARGET AUDIENCE</Text>
            <View style={s.toggleRow}>
              <TouchableOpacity
                style={[
                  s.toggleBtn,
                  {
                    borderColor: targetType === 'all' ? BRAND.teal : BRAND.border,
                    backgroundColor: targetType === 'all' ? BRAND.teal + '20' : BRAND.warmGray,
                    flex: 1,
                  },
                ]}
                onPress={() => { setTargetType('all'); setShowTeamPicker(false); }}
              >
                <Ionicons
                  name="people"
                  size={18}
                  color={targetType === 'all' ? BRAND.teal : BRAND.textMuted}
                />
                <Text style={[s.toggleText, { color: targetType === 'all' ? BRAND.teal : BRAND.textSecondary }]}>
                  All Parents
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.toggleBtn,
                  {
                    borderColor: targetType === 'team' ? BRAND.teal : BRAND.border,
                    backgroundColor: targetType === 'team' ? BRAND.teal + '20' : BRAND.warmGray,
                    flex: 1,
                  },
                ]}
                onPress={() => { setTargetType('team'); setShowTeamPicker(true); }}
              >
                <Ionicons
                  name="shirt"
                  size={18}
                  color={targetType === 'team' ? BRAND.teal : BRAND.textMuted}
                />
                <Text style={[s.toggleText, { color: targetType === 'team' ? BRAND.teal : BRAND.textSecondary }]}>
                  Specific Team
                </Text>
              </TouchableOpacity>
            </View>

            {/* Team Picker */}
            {targetType === 'team' && (
              <View style={s.teamPickerSection}>
                {loadingTeams ? (
                  <ActivityIndicator size="small" color={BRAND.teal} style={{ marginTop: 12 }} />
                ) : teams.length === 0 ? (
                  <Text style={s.noTeamsText}>
                    No teams found for this season.
                  </Text>
                ) : (
                  <View style={s.teamList}>
                    {teams.map(team => {
                      const isSelected = selectedTeamId === team.id;
                      return (
                        <TouchableOpacity
                          key={team.id}
                          style={[
                            s.teamItem,
                            {
                              borderColor: isSelected ? BRAND.teal : BRAND.border,
                              backgroundColor: isSelected ? BRAND.teal + '15' : BRAND.warmGray,
                            },
                          ]}
                          onPress={() => setSelectedTeamId(team.id)}
                        >
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color={isSelected ? BRAND.teal : BRAND.textMuted}
                          />
                          <Text style={[s.teamItemText, { color: isSelected ? BRAND.teal : BRAND.textPrimary }]}>
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
          <View style={s.recipientPreview}>
            <Ionicons name="mail" size={20} color={BRAND.teal} />
            <Text style={s.recipientText}>
              {loadingCount ? (
                'Counting recipients...'
              ) : (
                `This will be sent to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}`
              )}
            </Text>
            {loadingCount && <ActivityIndicator size="small" color={BRAND.teal} />}
          </View>

          {/* Urgent Warning */}
          {priority === 'urgent' && (
            <View style={s.urgentWarning}>
              <Ionicons name="warning" size={18} color={BRAND.coral} />
              <Text style={s.urgentWarningText}>
                Urgent messages may trigger push notifications and email alerts.
              </Text>
            </View>
          )}

          {/* Send Button */}
          <TouchableOpacity
            style={[
              s.sendButton,
              {
                backgroundColor: isFormValid ? BRAND.teal : BRAND.warmGray,
                borderColor: isFormValid ? BRAND.teal : BRAND.border,
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
                  color={isFormValid ? '#000' : BRAND.textMuted}
                />
                <Text style={[s.sendButtonText, { color: isFormValid ? '#000' : BRAND.textMuted }]}>
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

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    backgroundColor: BRAND.warmGray,
    borderBottomColor: BRAND.border,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.5,
    color: BRAND.textPrimary,
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
    backgroundColor: BRAND.white,
    borderColor: BRAND.border,
  },

  // Field Label
  fieldLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    color: BRAND.textMuted,
  },

  // Text Input
  textInput: {
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    color: BRAND.textPrimary,
    borderColor: BRAND.border,
    backgroundColor: BRAND.warmGray,
  },

  // Text Area
  textAreaInput: {
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 130,
    color: BRAND.textPrimary,
    borderColor: BRAND.border,
    backgroundColor: BRAND.warmGray,
  },

  // Char count
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
    color: BRAND.textMuted,
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
    fontFamily: FONTS.bodySemiBold,
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
    fontFamily: FONTS.bodySemiBold,
  },

  // Team Picker
  teamPickerSection: {
    marginTop: 14,
  },
  noTeamsText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
    color: BRAND.textMuted,
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
    fontFamily: FONTS.bodySemiBold,
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
    backgroundColor: BRAND.white,
    borderColor: BRAND.border,
  },
  recipientText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    flex: 1,
    color: BRAND.textSecondary,
  },

  // Urgent Warning
  urgentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    backgroundColor: BRAND.coral + '15',
    borderColor: BRAND.coral + '40',
  },
  urgentWarningText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    flex: 1,
    color: BRAND.coral,
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
    fontFamily: FONTS.bodyExtraBold,
    letterSpacing: 0.5,
  },
});
