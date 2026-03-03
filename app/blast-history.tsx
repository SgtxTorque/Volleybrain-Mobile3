import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================================================
// TYPES
// ============================================================================

type BlastMessage = {
  id: string;
  title: string;
  body: string;
  message_type: string;
  priority: string;
  target_type: string;
  target_team_id: string | null;
  created_at: string;
  total_recipients: number;
  acknowledged_count: number;
};

type Recipient = {
  id: string;
  recipient_name: string;
  recipient_email: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  player_id: string | null;
};

type BlastFilter = 'all' | 'urgent' | 'low_read';

// ============================================================================
// HELPERS
// ============================================================================

const MESSAGE_TYPE_CONFIG: Record<string, { icon: string; label: string; bg: string; fg: string }> = {
  announcement: { icon: 'megaphone', label: 'Announcement', bg: '#0EA5E920', fg: '#0EA5E9' },
  schedule_change: { icon: 'calendar', label: 'Schedule', bg: '#8B5CF620', fg: '#8B5CF6' },
  payment_reminder: { icon: 'card', label: 'Payment', bg: '#F59E0B20', fg: '#F59E0B' },
  custom: { icon: 'create', label: 'Custom', bg: '#10B98120', fg: '#10B981' },
};

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
};

const formatTimestamp = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' at ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const getReadRateColor = (rate: number): string => {
  if (rate >= 80) return '#34C759';
  if (rate >= 50) return '#FF9500';
  return '#FF3B30';
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BlastHistoryScreen() {
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [blasts, setBlasts] = useState<BlastMessage[]>([]);
  const [filter, setFilter] = useState<BlastFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedRecipients, setExpandedRecipients] = useState<Record<string, Recipient[]>>({});
  const [loadingRecipients, setLoadingRecipients] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [teamNames, setTeamNames] = useState<Map<string, string>>(new Map());

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchBlasts = useCallback(async () => {
    if (!workingSeason?.id) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, title, body, message_type, priority, target_type, target_team_id, created_at, total_recipients, acknowledged_count')
        .eq('season_id', workingSeason.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        if (__DEV__) console.log('fetchBlasts error:', error);
        return;
      }

      const messages: BlastMessage[] = data || [];
      setBlasts(messages);

      // Batch-fetch team names for all unique target_team_ids
      const teamIds = [...new Set(
        messages.map(m => m.target_team_id).filter((id): id is string => id !== null)
      )];

      if (teamIds.length > 0) {
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', teamIds);

        if (!teamsError && teamsData) {
          const map = new Map<string, string>();
          teamsData.forEach((t: { id: string; name: string }) => map.set(t.id, t.name));
          setTeamNames(map);
        }
      } else {
        setTeamNames(new Map());
      }
    } catch (err) {
      if (__DEV__) console.log('fetchBlasts catch:', err);
    }
  }, [workingSeason?.id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchBlasts();
      setLoading(false);
    };
    load();
  }, [fetchBlasts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBlasts();
    setRefreshing(false);
  }, [fetchBlasts]);

  // ============================================================================
  // EXPAND / FETCH RECIPIENTS
  // ============================================================================

  const toggleExpand = async (messageId: string) => {
    if (expandedId === messageId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(messageId);

    if (!expandedRecipients[messageId]) {
      setLoadingRecipients(messageId);
      try {
        const { data, error } = await supabase
          .from('message_recipients')
          .select('id, recipient_name, recipient_email, acknowledged, acknowledged_at, player_id')
          .eq('message_id', messageId)
          .order('acknowledged', { ascending: false });

        if (error) {
          if (__DEV__) console.log('fetchRecipients error:', error);
        } else {
          setExpandedRecipients(prev => ({ ...prev, [messageId]: data || [] }));
        }
      } catch (err) {
        if (__DEV__) console.log('fetchRecipients catch:', err);
      } finally {
        setLoadingRecipients(null);
      }
    }
  };

  // ============================================================================
  // RESEND TO UNREAD
  // ============================================================================

  const handleResend = (blast: BlastMessage) => {
    const recipients = expandedRecipients[blast.id] || [];
    const unread = recipients.filter(r => !r.acknowledged);

    if (unread.length === 0) return;

    Alert.alert(
      'Resend to Unread',
      `Resend to ${unread.length} unread recipient${unread.length !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resend',
          style: 'default',
          onPress: () => executeResend(blast, unread),
        },
      ]
    );
  };

  const executeResend = async (blast: BlastMessage, unread: Recipient[]) => {
    if (!workingSeason?.id || !profile?.id) return;
    setResending(blast.id);

    try {
      // 1. Insert new message row
      const { data: newMessage, error: msgError } = await supabase
        .from('messages')
        .insert({
          title: 'Re: ' + blast.title,
          body: blast.body,
          message_type: blast.message_type,
          priority: blast.priority,
          target_type: blast.target_type,
          target_team_id: blast.target_team_id,
          season_id: workingSeason.id,
          sender_id: profile.id,
          total_recipients: unread.length,
          acknowledged_count: 0,
        })
        .select('id')
        .single();

      if (msgError) throw msgError;
      if (!newMessage) throw new Error('No message returned after insert.');

      // 2. Insert recipients for unacknowledged only
      const recipientRows = unread.map(r => ({
        message_id: newMessage.id,
        recipient_name: r.recipient_name,
        recipient_email: r.recipient_email,
        player_id: r.player_id,
        recipient_type: 'parent',
      }));

      const { error: recipError } = await supabase
        .from('message_recipients')
        .insert(recipientRows);

      if (recipError) throw recipError;

      Alert.alert('Sent', `Resent to ${unread.length} recipient${unread.length !== 1 ? 's' : ''}.`);

      // Refresh the list
      await fetchBlasts();
    } catch (err: any) {
      if (__DEV__) console.log('executeResend error:', err);
      Alert.alert('Error', err.message || 'Failed to resend. Please try again.');
    } finally {
      setResending(null);
    }
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const filteredBlasts = blasts.filter(b => {
    if (filter === 'urgent') return b.priority === 'urgent';
    if (filter === 'low_read') {
      if (b.total_recipients === 0) return true;
      return (b.acknowledged_count / b.total_recipients) < 0.5;
    }
    return true;
  });

  const avgReadRate = blasts.length > 0
    ? blasts.reduce((sum, b) => {
        if (b.total_recipients === 0) return sum;
        return sum + (b.acknowledged_count / b.total_recipients);
      }, 0) / blasts.filter(b => b.total_recipients > 0).length
    : 0;

  const avgReadPct = isNaN(avgReadRate) ? 0 : Math.round(avgReadRate * 100);

  const lastSentDate = blasts.length > 0 ? formatDate(blasts[0].created_at) : '\u2014';

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderTypeBadge = (messageType: string) => {
    const config = MESSAGE_TYPE_CONFIG[messageType] || MESSAGE_TYPE_CONFIG.custom;
    return (
      <View style={[s.typeBadge, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon as any} size={12} color={config.fg} />
        <Text style={[s.typeBadgeText, { color: config.fg }]}>{config.label}</Text>
      </View>
    );
  };

  const renderReadBar = (acknowledged: number, total: number) => {
    const rate = total > 0 ? acknowledged / total : 0;
    const pct = Math.round(rate * 100);
    const barColor = getReadRateColor(pct);

    return (
      <View style={s.readBarContainer}>
        <Text style={s.readBarLabel}>
          {acknowledged}/{total} read ({pct}%)
        </Text>
        <View style={s.readBarTrack}>
          <View style={[s.readBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>
      </View>
    );
  };

  const renderRecipientList = (messageId: string) => {
    if (loadingRecipients === messageId) {
      return (
        <View style={s.recipientLoadingWrap}>
          <ActivityIndicator size="small" color={BRAND.teal} />
          <Text style={s.recipientLoadingText}>Loading recipients...</Text>
        </View>
      );
    }

    const recipients = expandedRecipients[messageId];
    if (!recipients) return null;

    if (recipients.length === 0) {
      return (
        <Text style={s.noRecipientsText}>No recipients found.</Text>
      );
    }

    return (
      <View style={s.recipientList}>
        {recipients.map(r => (
          <View key={r.id} style={s.recipientRow}>
            <Ionicons
              name={r.acknowledged ? 'shield-checkmark' : 'time-outline'}
              size={18}
              color={r.acknowledged ? '#34C759' : BRAND.textMuted}
            />
            <View style={s.recipientInfo}>
              <Text style={s.recipientName}>{r.recipient_name || 'Unknown'}</Text>
              {r.recipient_email ? (
                <Text style={s.recipientEmail}>{r.recipient_email}</Text>
              ) : null}
            </View>
            {r.acknowledged ? (
              <View style={s.recipientStatus}>
                <Text style={[s.recipientStatusText, { color: '#34C759' }]}>Read</Text>
                {r.acknowledged_at && (
                  <Text style={s.recipientTimestamp}>
                    {formatTimestamp(r.acknowledged_at)}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={[s.recipientStatusText, { color: BRAND.textMuted }]}>Unread</Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderBlastCard = (blast: BlastMessage) => {
    const isExpanded = expandedId === blast.id;
    const recipients = expandedRecipients[blast.id] || [];
    const unreadCount = recipients.filter(r => !r.acknowledged).length;
    const targetLabel = blast.target_type === 'all'
      ? 'All Parents'
      : (blast.target_team_id ? teamNames.get(blast.target_team_id) || 'Team' : 'Team');

    return (
      <TouchableOpacity
        key={blast.id}
        style={s.blastCard}
        onPress={() => toggleExpand(blast.id)}
        activeOpacity={0.7}
      >
        {/* Card Header */}
        <View style={s.blastCardHeader}>
          <View style={s.blastTitleRow}>
            <Text style={s.blastTitle} numberOfLines={isExpanded ? undefined : 1}>
              {blast.title}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={BRAND.textMuted}
            />
          </View>

          <Text style={s.blastDate}>{formatDate(blast.created_at)}</Text>

          {/* Badges Row */}
          <View style={s.blastBadgesRow}>
            {renderTypeBadge(blast.message_type)}
            {blast.priority === 'urgent' && (
              <View style={[s.urgentBadge, { backgroundColor: '#FF3B3020' }]}>
                <Ionicons name="alert-circle" size={12} color="#FF3B30" />
                <Text style={s.urgentBadgeText}>URGENT</Text>
              </View>
            )}
            <View style={s.targetBadge}>
              <Ionicons name="people" size={12} color={BRAND.teal} />
              <Text style={s.targetBadgeText}>{targetLabel}</Text>
            </View>
          </View>

          {/* Read Rate */}
          {renderReadBar(blast.acknowledged_count, blast.total_recipients)}
        </View>

        {/* Expanded Detail */}
        {isExpanded && (
          <View style={s.expandedSection}>
            {/* Full Message Body */}
            <View style={s.bodySection}>
              <Text style={s.bodySectionLabel}>MESSAGE</Text>
              <Text style={s.bodyText}>{blast.body}</Text>
            </View>

            {/* Recipients Section */}
            <View style={s.recipientSection}>
              <Text style={s.bodySectionLabel}>RECIPIENTS</Text>
              {renderRecipientList(blast.id)}
            </View>

            {/* Resend to Unread Button */}
            {recipients.length > 0 && unreadCount > 0 && (
              <TouchableOpacity
                style={s.resendButton}
                onPress={() => handleResend(blast)}
                disabled={resending === blast.id}
              >
                {resending === blast.id ? (
                  <ActivityIndicator size="small" color={BRAND.teal} />
                ) : (
                  <>
                    <Ionicons name="refresh" size={18} color={BRAND.teal} />
                    <Text style={s.resendButtonText}>
                      Resend to {unreadCount} Unread
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={BRAND.teal} />
          <Text style={s.loadingText}>Loading announcements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.teal} />}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={BRAND.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Blast History</Text>
            {workingSeason && <Text style={s.subtitle}>{workingSeason.name}</Text>}
          </View>
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{blasts.length}</Text>
            <Text style={s.statLabel}>Total Sent</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: getReadRateColor(avgReadPct) }]}>{avgReadPct}%</Text>
            <Text style={s.statLabel}>Avg Read Rate</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statNum, { fontSize: 14 }]}>{lastSentDate}</Text>
            <Text style={s.statLabel}>Last Sent</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {([
            { key: 'all' as BlastFilter, label: 'All' },
            { key: 'urgent' as BlastFilter, label: 'Urgent' },
            { key: 'low_read' as BlastFilter, label: 'Low Read (<50%)' },
          ]).map(f => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterPill, filter === f.key && s.filterPillActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[s.filterPillText, filter === f.key && s.filterPillTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Blast Cards or Empty State */}
        {filteredBlasts.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="megaphone-outline" size={56} color={BRAND.textMuted} />
            <Text style={s.emptyTitle}>
              {blasts.length === 0 ? 'No sent announcements yet' : 'No matches for this filter'}
            </Text>
            <Text style={s.emptySubtext}>
              {blasts.length === 0
                ? 'Compose your first blast!'
                : 'Try selecting a different filter'}
            </Text>
          </View>
        ) : (
          filteredBlasts.map(blast => renderBlastCard(blast))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Loading
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: BRAND.offWhite },
  loadingText: { fontSize: 15, fontFamily: FONTS.bodySemiBold, color: BRAND.textMuted },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontFamily: FONTS.bodyExtraBold, color: BRAND.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: BRAND.teal, marginTop: 2 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: BRAND.white,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  statNum: { fontSize: 22, fontFamily: FONTS.bodyExtraBold, color: BRAND.textPrimary },
  statLabel: {
    fontSize: 10,
    color: BRAND.textMuted,
    marginTop: 2,
    fontFamily: FONTS.bodyBold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },

  // Filter Pills
  filterRow: { flexGrow: 0, marginBottom: 16 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
    marginRight: 8,
  },
  filterPillActive: { backgroundColor: BRAND.teal + '20', borderColor: BRAND.teal },
  filterPillText: { fontSize: 13, color: BRAND.textMuted, fontFamily: FONTS.bodySemiBold },
  filterPillTextActive: { color: BRAND.teal },

  // Blast Card
  blastCard: {
    backgroundColor: BRAND.white,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  blastCardHeader: { padding: 14 },
  blastTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  blastTitle: { fontSize: 16, fontFamily: FONTS.bodyBold, flex: 1, color: BRAND.textPrimary },
  blastDate: { fontSize: 12, marginTop: 2, marginBottom: 8, color: BRAND.textMuted },

  // Badges Row
  blastBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 11, fontFamily: FONTS.bodyBold },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgentBadgeText: { fontSize: 11, fontFamily: FONTS.bodyExtraBold, color: '#FF3B30' },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: BRAND.teal + '15',
  },
  targetBadgeText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: BRAND.teal },

  // Read Bar
  readBarContainer: { marginTop: 2 },
  readBarLabel: { fontSize: 12, fontFamily: FONTS.bodySemiBold, marginBottom: 4, color: BRAND.textSecondary },
  readBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: BRAND.border },
  readBarFill: { height: 6, borderRadius: 3 },

  // Expanded Section
  expandedSection: { borderTopWidth: 1, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, borderTopColor: BRAND.border },
  bodySection: { marginBottom: 14 },
  bodySectionLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
    color: BRAND.textMuted,
  },
  bodyText: { fontSize: 14, lineHeight: 20, color: BRAND.textSecondary },

  // Recipient Section
  recipientSection: { marginBottom: 12 },
  recipientLoadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  recipientLoadingText: { fontSize: 13, color: BRAND.textMuted },
  noRecipientsText: { fontSize: 13, fontStyle: 'italic', paddingVertical: 8, color: BRAND.textMuted },
  recipientList: { gap: 0 },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND.border,
  },
  recipientInfo: { flex: 1 },
  recipientName: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: BRAND.textPrimary },
  recipientEmail: { fontSize: 11, marginTop: 1, color: BRAND.textMuted },
  recipientStatus: { alignItems: 'flex-end' },
  recipientStatusText: { fontSize: 12, fontFamily: FONTS.bodyBold },
  recipientTimestamp: { fontSize: 10, marginTop: 1, color: BRAND.textMuted },

  // Resend Button
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    backgroundColor: BRAND.teal + '15',
    borderColor: BRAND.teal,
  },
  resendButtonText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: BRAND.teal },

  // Empty State
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bodyBold, color: BRAND.textPrimary, marginTop: 12, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: BRAND.textMuted, marginTop: 4, textAlign: 'center' },
});
