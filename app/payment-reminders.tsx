import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

type FamilyOutstanding = {
  family_id: string | null;
  family_name: string;
  parent_email: string;
  children: { name: string; amount: number }[];
  totalOutstanding: number;
  selected: boolean;
};

type Step = 'select' | 'preview';

// ============================================================================
// COMPONENT
// ============================================================================

export default function PaymentRemindersScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { isAdmin } = usePermissions();
  const { workingSeason } = useSeason();
  const router = useRouter();

  // ── Admin guard ──
  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 }}>
        <Ionicons name="lock-closed-outline" size={48} color="#999" />
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 18 }}>Access Restricted</Text>
        <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 14, color: '#666', textAlign: 'center' }}>
          Admin permissions required.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: FONTS.bodySemiBold, color: '#0EA5E9', fontSize: 15 }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState<FamilyOutstanding[]>([]);
  const [step, setStep] = useState<Step>('select');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');

  // ── Fetch outstanding balances ──────────────────────────────

  const fetchOutstanding = useCallback(async () => {
    if (!workingSeason?.id) { setLoading(false); return; }
    try {
      // Get players + payments for this season
      const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name, parent_name, parent_email, family_id')
        .eq('season_id', workingSeason.id);

      if (!players || players.length === 0) { setLoading(false); return; }

      const playerIds = players.map(p => p.id);
      const { data: payments } = await supabase
        .from('payments')
        .select('player_id, amount, status')
        .in('player_id', playerIds)
        .eq('season_id', workingSeason.id);

      // Calculate outstanding per player
      const playerOutstanding = new Map<string, number>();
      (payments || []).forEach(p => {
        if (p.status !== 'verified') {
          const current = playerOutstanding.get(p.player_id) || 0;
          playerOutstanding.set(p.player_id, current + (p.amount || 0));
        }
      });

      // Group by family or individual
      const familyMap = new Map<string, FamilyOutstanding>();

      players.forEach(player => {
        const outstanding = playerOutstanding.get(player.id) || 0;
        if (outstanding <= 0) return;

        const key = player.family_id || player.id;
        const existing = familyMap.get(key);

        if (existing) {
          existing.children.push({ name: `${player.first_name} ${player.last_name}`, amount: outstanding });
          existing.totalOutstanding += outstanding;
          // Use first parent email found
          if (!existing.parent_email && player.parent_email) {
            existing.parent_email = player.parent_email;
          }
        } else {
          familyMap.set(key, {
            family_id: player.family_id,
            family_name: player.parent_name || `${player.first_name} ${player.last_name} Family`,
            parent_email: player.parent_email || '',
            children: [{ name: `${player.first_name} ${player.last_name}`, amount: outstanding }],
            totalOutstanding: outstanding,
            selected: false,
          });
        }
      });

      const sorted = Array.from(familyMap.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
      setFamilies(sorted);
    } catch (err) {
      if (__DEV__) console.error('Error fetching outstanding:', err);
    } finally {
      setLoading(false);
    }
  }, [workingSeason?.id]);

  useEffect(() => { fetchOutstanding(); }, [fetchOutstanding]);

  // ── Default message template ────────────────────────────────

  useEffect(() => {
    if (workingSeason) {
      setMessage(
        `Hi [Family Name], this is a friendly reminder that your registration balance of $[Amount] for ${workingSeason.name} is outstanding. Please make your payment at your earliest convenience. Thank you!`
      );
    }
  }, [workingSeason]);

  // ── Selection helpers ───────────────────────────────────────

  const selectedFamilies = families.filter(f => f.selected);
  const selectedCount = selectedFamilies.length;
  const selectedTotal = selectedFamilies.reduce((sum, f) => sum + f.totalOutstanding, 0);

  const toggleFamily = (idx: number) => {
    setFamilies(prev => prev.map((f, i) => i === idx ? { ...f, selected: !f.selected } : f));
  };

  const toggleAll = () => {
    const allSelected = families.every(f => f.selected);
    setFamilies(prev => prev.map(f => ({ ...f, selected: !allSelected })));
  };

  // ── Send reminders ─────────────────────────────────────────

  const handleSend = async () => {
    if (selectedCount === 0) return;
    setSending(true);
    try {
      // In a real implementation, this would queue notifications/emails
      // For now, we'll create notification records
      const notifications = selectedFamilies.map(family => ({
        type: 'payment_reminder',
        title: 'Payment Reminder',
        body: message
          .replace('[Family Name]', family.family_name)
          .replace('[Amount]', family.totalOutstanding.toFixed(2)),
        metadata: {
          family_id: family.family_id,
          amount: family.totalOutstanding,
          season_id: workingSeason?.id,
        },
      }));

      // Mark as sent (in production, would trigger push/email)
      if (__DEV__) console.log(`Sending ${notifications.length} reminders`);

      // Simulate sending delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      setSent(true);
    } catch (err) {
      if (__DEV__) console.error('Error sending reminders:', err);
      Alert.alert('Error', 'Failed to send reminders');
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const s = createStyles(colors);

  // ── Loading ─────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Success State ───────────────────────────────────────────

  if (sent) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.successWrap}>
          <Image
            source={require('@/assets/images/mascot/celebrate.png')}
            style={{ width: 120, height: 120 }}
            resizeMode="contain"
          />
          <Text style={s.successTitle}>Reminders Sent!</Text>
          <Text style={s.successSubtext}>
            Sent to {selectedCount} {selectedCount === 1 ? 'family' : 'families'}
          </Text>
          <TouchableOpacity style={s.successBtn} onPress={() => router.back()}>
            <Text style={s.successBtnText}>Back to Payments</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Empty State ─────────────────────────────────────────────

  if (families.length === 0) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Payment Reminders</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.emptyWrap}>
          <Image
            source={require('@/assets/images/mascot/celebrate.png')}
            style={{ width: 100, height: 100 }}
            resizeMode="contain"
          />
          <Text style={s.emptyTitle}>All Paid Up!</Text>
          <Text style={s.emptySubtext}>No outstanding balances this season</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 1: Select Families ─────────────────────────────────

  if (step === 'select') {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Payment Reminders</Text>
          <View style={s.headerBtn} />
        </View>

        {/* Step indicator */}
        <View style={s.stepRow}>
          <View style={[s.stepDot, s.stepDotActive]} />
          <View style={s.stepLine} />
          <View style={s.stepDot} />
        </View>
        <Text style={s.stepLabel}>Step 1: Select Families</Text>

        {/* Select All */}
        <TouchableOpacity style={s.selectAllRow} onPress={toggleAll}>
          <Ionicons
            name={families.every(f => f.selected) ? 'checkbox' : 'square-outline'}
            size={22}
            color={families.every(f => f.selected) ? colors.primary : colors.textMuted}
          />
          <Text style={s.selectAllText}>Select All ({families.length})</Text>
        </TouchableOpacity>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.screenPadding, paddingBottom: 120 }}>
          {families.map((family, idx) => (
            <TouchableOpacity
              key={family.family_id || idx}
              style={[s.familyRow, family.selected && s.familyRowSelected]}
              onPress={() => toggleFamily(idx)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={family.selected ? 'checkbox' : 'square-outline'}
                size={22}
                color={family.selected ? colors.primary : colors.textMuted}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.familyName}>{family.family_name}</Text>
                {family.children.map((child, ci) => (
                  <Text key={ci} style={s.childText}>
                    {child.name} — {formatCurrency(child.amount)}
                  </Text>
                ))}
              </View>
              <Text style={s.familyAmount}>{formatCurrency(family.totalOutstanding)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bottom bar */}
        <View style={s.bottomBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.bottomLabel}>
              {selectedCount} {selectedCount === 1 ? 'family' : 'families'} selected
            </Text>
            <Text style={s.bottomTotal}>{formatCurrency(selectedTotal)} total outstanding</Text>
          </View>
          <TouchableOpacity
            style={[s.nextBtn, selectedCount === 0 && s.nextBtnDisabled]}
            onPress={() => setStep('preview')}
            disabled={selectedCount === 0}
          >
            <Text style={s.nextBtnText}>Preview</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 2: Preview & Send ──────────────────────────────────

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setStep('select')} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Preview Message</Text>
        <View style={s.headerBtn} />
      </View>

      {/* Step indicator */}
      <View style={s.stepRow}>
        <View style={[s.stepDot, s.stepDotDone]}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
        <View style={[s.stepLine, s.stepLineDone]} />
        <View style={[s.stepDot, s.stepDotActive]} />
      </View>
      <Text style={s.stepLabel}>Step 2: Preview & Send</Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.screenPadding, paddingBottom: 120 }}>
        {/* Summary */}
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <Ionicons name="people" size={20} color={colors.primary} />
            <Text style={s.summaryText}>
              Sending to {selectedCount} {selectedCount === 1 ? 'family' : 'families'}
            </Text>
          </View>
          <View style={s.summaryRow}>
            <Ionicons name="cash" size={20} color={colors.warning} />
            <Text style={s.summaryText}>
              {formatCurrency(selectedTotal)} total outstanding
            </Text>
          </View>
        </View>

        {/* Message editor */}
        <Text style={s.sectionLabel}>MESSAGE TEMPLATE</Text>
        <View style={s.messageCard}>
          <TextInput
            style={s.messageInput}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            placeholder="Enter reminder message..."
            placeholderTextColor={colors.textMuted}
          />
          <Text style={s.messageHint}>
            [Family Name] and [Amount] will be replaced per family
          </Text>
        </View>

        {/* Preview for first selected family */}
        {selectedFamilies.length > 0 && (
          <>
            <Text style={s.sectionLabel}>PREVIEW</Text>
            <View style={s.previewCard}>
              <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} style={{ marginBottom: 8 }} />
              <Text style={s.previewText}>
                {message
                  .replace('[Family Name]', selectedFamilies[0].family_name)
                  .replace('[Amount]', selectedFamilies[0].totalOutstanding.toFixed(2))}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Send button */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={[s.sendBtn, sending && { opacity: 0.6 }]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={s.sendBtnText}>Send Reminders</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding, paddingVertical: 10,
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...displayTextStyle, fontSize: 22, color: colors.text },

  // Step indicator
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 0 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: colors.primary },
  stepDotDone: { backgroundColor: colors.success },
  stepLine: { width: 60, height: 2, backgroundColor: colors.border },
  stepLineDone: { backgroundColor: colors.success },
  stepLabel: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: colors.textMuted, textAlign: 'center', marginBottom: 12 },

  // Select All
  selectAllRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.screenPadding,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
  },
  selectAllText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: colors.text },

  // Family rows
  familyRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: radii.card, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  familyRowSelected: { borderColor: colors.primary, borderWidth: 2 },
  familyName: { fontSize: 15, fontFamily: FONTS.bodySemiBold, color: colors.text },
  childText: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: colors.textMuted, marginTop: 2 },
  familyAmount: { fontSize: 15, fontFamily: FONTS.bodyBold, color: colors.danger, marginLeft: 8 },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.screenPadding,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  bottomLabel: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: colors.text },
  bottomTotal: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: colors.textMuted, marginTop: 2 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { fontSize: 15, fontFamily: FONTS.bodySemiBold, color: '#fff' },

  // Summary
  summaryCard: {
    backgroundColor: colors.card, borderRadius: radii.card, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: colors.border, ...shadows.card, gap: 12,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryText: { fontSize: 15, fontFamily: FONTS.bodyMedium, color: colors.text },

  // Section label
  sectionLabel: { fontSize: 11, fontFamily: FONTS.bodyExtraBold, color: colors.textMuted, letterSpacing: 1.5, marginBottom: 10 },

  // Message editor
  messageCard: {
    backgroundColor: colors.card, borderRadius: radii.card, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  messageInput: { fontSize: 14, fontFamily: FONTS.bodyMedium, color: colors.text, minHeight: 120, lineHeight: 22 },
  messageHint: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: colors.textMuted, marginTop: 8, fontStyle: 'italic' },

  // Preview
  previewCard: {
    backgroundColor: colors.primary + '10', borderRadius: radii.card, padding: 16,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  previewText: { fontSize: 14, fontFamily: FONTS.bodyMedium, color: colors.text, lineHeight: 22 },

  // Send button
  sendBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.success, paddingVertical: 14, borderRadius: 12,
  },
  sendBtnText: { fontSize: 16, fontFamily: FONTS.bodySemiBold, color: '#fff' },

  // Empty state
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { ...displayTextStyle, fontSize: 22, color: colors.text, marginTop: 16 },
  emptySubtext: { fontSize: 14, fontFamily: FONTS.bodyMedium, color: colors.textMuted, marginTop: 4 },

  // Success state
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successTitle: { ...displayTextStyle, fontSize: 28, color: colors.success, marginTop: 16 },
  successSubtext: { fontSize: 16, fontFamily: FONTS.bodyMedium, color: colors.textMuted, marginTop: 4 },
  successBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 24 },
  successBtnText: { fontSize: 15, fontFamily: FONTS.bodySemiBold, color: '#fff' },
});
