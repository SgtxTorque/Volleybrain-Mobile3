import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Message = { id: string; message_type: string; subject: string; body: string; target_audience: string; priority: string; requires_acknowledgment: boolean; sent_at: string; };
type Team = { id: string; name: string; };

export default function MessagesScreen() {
  const { profile } = useAuth();
  const { workingSeason } = useSeason();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [sending, setSending] = useState(false);

  const [messageType, setMessageType] = useState('announcement');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [priority, setPriority] = useState('normal');
  const [requireAck, setRequireAck] = useState(false);

  const fetchData = async () => {
    if (!workingSeason) return;
    const { data: m } = await supabase.from('messages').select('*').eq('season_id', workingSeason.id).order('sent_at', { ascending: false });
    const { data: t } = await supabase.from('teams').select('*').eq('season_id', workingSeason.id);
    setMessages(m || []);
    setTeams(t || []);
  };

  useEffect(() => { fetchData(); }, [workingSeason]);

  const resetForm = () => {
    setStep(1); setMessageType('announcement'); setSubject(''); setBody('');
    setAudience('all'); setSelectedTeamId(null); setPriority('normal'); setRequireAck(false);
  };

  const sendMessage = async () => {
    if (!subject.trim() || !body.trim()) { Alert.alert('Error', 'Subject and body are required'); return; }
    if (!workingSeason || !profile) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      season_id: workingSeason.id, sender_id: profile.id, message_type: messageType,
      subject: subject.trim(), body: body.trim(), target_audience: audience,
      target_team_id: audience === 'team' ? selectedTeamId : null, priority, requires_acknowledgment: requireAck,
    });
    setSending(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setShowModal(false); resetForm(); fetchData();
    Alert.alert('Sent!', 'Your message has been sent.');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'announcement': return 'megaphone';
      case 'payment_reminder': return 'cash';
      case 'schedule_change': return 'calendar';
      case 'deadline': return 'alarm';
      default: return 'mail';
    }
  };

  const messageTypes = [
    { value: 'announcement', label: 'Announcement' },
    { value: 'payment_reminder', label: 'Payment Reminder' },
    { value: 'schedule_change', label: 'Schedule Change' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'custom', label: 'Custom' },
  ];

  const audiences = [
    { value: 'all', label: 'Everyone' },
    { value: 'team', label: 'Specific Team' },
    { value: 'parents', label: 'Parents Only' },
    { value: 'coaches', label: 'Coaches Only' },
  ];

  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} />}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Messages</Text>
            {workingSeason && <Text style={s.subtitle}>{workingSeason.name}</Text>}
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
            <Ionicons name="create" size={22} color={colors.background} />
          </TouchableOpacity>
        </View>

        <View style={s.statsRow}>
          <View style={s.statBox}><Text style={s.statNum}>{messages.length}</Text><Text style={s.statLabel}>Sent</Text></View>
          <View style={s.statBox}><Text style={s.statNum}>{messages.filter(m => m.priority === 'urgent').length}</Text><Text style={s.statLabel}>Urgent</Text></View>
        </View>

        {messages.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>No messages sent yet</Text></View>
        ) : (
          messages.map(message => (
            <TouchableOpacity key={message.id} style={s.messageCard}>
              <View style={[s.typeIcon, { backgroundColor: message.priority === 'urgent' ? colors.danger + '20' : colors.info + '20' }]}>
                <Ionicons name={getTypeIcon(message.message_type) as any} size={20} color={message.priority === 'urgent' ? colors.danger : colors.info} />
              </View>
              <View style={s.messageInfo}>
                <View style={s.messageHeader}>
                  <Text style={s.messageSubject}>{message.subject}</Text>
                  {message.priority === 'urgent' && (
                    <View style={s.urgentBadge}><Text style={s.urgentText}>URGENT</Text></View>
                  )}
                </View>
                <Text style={s.messagePreview} numberOfLines={1}>{message.body}</Text>
                <Text style={s.messageDate}>{formatDate(message.sent_at)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>New Message</Text>
            <Text style={s.stepText}>{step}/3</Text>
          </View>

          <View style={s.progressBar}><View style={[s.progressFill, { width: `${(step/3)*100}%` }]} /></View>

          <ScrollView style={s.formContent}>
            {step === 1 && (
              <>
                <Text style={s.stepTitle}>Message Type</Text>
                {messageTypes.map(type => (
                  <TouchableOpacity key={type.value} style={[s.optionBtn, messageType === type.value && s.optionSel]} onPress={() => setMessageType(type.value)}>
                    <Text style={[s.optionTxt, messageType === type.value && s.optionSelTxt]}>{type.label}</Text>
                    {messageType === type.value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {step === 2 && (
              <>
                <Text style={s.stepTitle}>Recipients</Text>
                {audiences.map(aud => (
                  <TouchableOpacity key={aud.value} style={[s.optionBtn, audience === aud.value && s.optionSel]} onPress={() => setAudience(aud.value)}>
                    <Text style={[s.optionTxt, audience === aud.value && s.optionSelTxt]}>{aud.label}</Text>
                    {audience === aud.value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                ))}

                {audience === 'team' && (
                  <>
                    <Text style={s.label}>Select Team</Text>
                    {teams.map(team => (
                      <TouchableOpacity key={team.id} style={[s.teamBtn, selectedTeamId === team.id && s.teamBtnSel]} onPress={() => setSelectedTeamId(team.id)}>
                        <Text style={[s.teamBtnTxt, selectedTeamId === team.id && s.teamBtnTxtSel]}>{team.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                <View style={s.optionRow}>
                  <Text style={s.optionLabel}>Priority</Text>
                  <View style={s.priorityRow}>
                    <TouchableOpacity style={[s.priorityBtn, priority === 'normal' && s.priorityNormal]} onPress={() => setPriority('normal')}>
                      <Text style={[s.priorityTxt, priority === 'normal' && s.priorityTxtSel]}>Normal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.priorityBtn, priority === 'urgent' && s.priorityUrgent]} onPress={() => setPriority('urgent')}>
                      <Text style={[s.priorityTxt, priority === 'urgent' && { color: '#fff' }]}>Urgent</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.switchRow}>
                  <Text style={s.switchLabel}>Require Acknowledgment</Text>
                  <Switch value={requireAck} onValueChange={setRequireAck} trackColor={{ true: colors.primary }} />
                </View>
              </>
            )}

            {step === 3 && (
              <>
                <Text style={s.stepTitle}>Compose Message</Text>
                <TextInput style={s.input} placeholder="Subject" placeholderTextColor={colors.textMuted} value={subject} onChangeText={setSubject} />
                <TextInput style={[s.input, s.textArea]} placeholder="Message body..." placeholderTextColor={colors.textMuted} value={body} onChangeText={setBody} multiline />
              </>
            )}
          </ScrollView>

          <View style={s.navRow}>
            {step > 1 && (
              <TouchableOpacity style={s.backBtn} onPress={() => setStep(step - 1)}>
                <Ionicons name="arrow-back" size={20} color={colors.text} />
                <Text style={s.backTxt}>Back</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            {step < 3 ? (
              <TouchableOpacity style={s.nextBtn} onPress={() => setStep(step + 1)}>
                <Text style={s.nextTxt}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.background} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[s.sendBtn, sending && s.disabled]} onPress={sendMessage} disabled={sending}>
                <Text style={s.sendTxt}>{sending ? 'Sending...' : 'Send'}</Text>
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, padding: spacing.screenPadding },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { ...displayTextStyle, fontSize: 28, color: colors.text },
  subtitle: { fontSize: 14, color: colors.primary, marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  statNum: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { color: colors.textMuted, fontSize: 16 },
  messageCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, flexDirection: 'row', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  typeIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  messageInfo: { flex: 1 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  messageSubject: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  urgentBadge: { backgroundColor: colors.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  urgentText: { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  messagePreview: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
  messageDate: { fontSize: 12, color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  stepText: { fontSize: 16, color: colors.primary, fontWeight: 'bold' },
  progressBar: { height: 3, backgroundColor: colors.border },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  formContent: { flex: 1, padding: 20 },
  stepTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '700', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 1 },
  optionBtn: { backgroundColor: colors.background, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  optionSel: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  optionTxt: { fontSize: 16, color: colors.text },
  optionSelTxt: { color: colors.primary, fontWeight: '600' },
  teamBtn: { backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  teamBtnSel: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  teamBtnTxt: { fontSize: 14, color: colors.text, textAlign: 'center' },
  teamBtnTxtSel: { color: colors.primary, fontWeight: '600' },
  optionRow: { marginTop: 16 },
  optionLabel: { fontSize: 14, color: colors.textMuted, marginBottom: 8 },
  priorityRow: { flexDirection: 'row', gap: 12 },
  priorityBtn: { flex: 1, backgroundColor: colors.background, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  priorityNormal: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  priorityUrgent: { borderColor: colors.danger, backgroundColor: colors.danger },
  priorityTxt: { fontSize: 14, color: colors.text },
  priorityTxtSel: { color: colors.primary, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, backgroundColor: colors.background, padding: 16, borderRadius: 12 },
  switchLabel: { fontSize: 14, color: colors.text },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  textArea: { height: 120, textAlignVertical: 'top' },
  navRow: { flexDirection: 'row', alignItems: 'center', padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backTxt: { color: colors.text, fontSize: 16 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  nextTxt: { color: colors.background, fontSize: 16, fontWeight: 'bold' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.success, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  sendTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disabled: { opacity: 0.5 },
});