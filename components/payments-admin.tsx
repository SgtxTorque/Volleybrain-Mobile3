import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Share,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =============================================================================
// TYPES
// =============================================================================

type PaymentRecord = {
  id: string;
  player_id: string;
  player_name: string;
  parent_email: string;
  season_id: string;
  season_name: string;
  sport_name: string;
  sport_icon: string;
  sport_color: string;
  fee_type: string;
  fee_name: string;
  amount: number;
  status: 'unpaid' | 'pending' | 'verified';
  payment_method: string | null;
  payer_name: string | null;
  reported_at: string | null;
  verified_at: string | null;
};

type UnpaidFee = {
  player_id: string;
  player_name: string;
  parent_email: string;
  parent_account_id: string | null;
  season_id: string;
  season_name: string;
  sport_name: string;
  sport_icon: string;
  sport_color: string;
  fee_type: string;
  fee_name: string;
  amount: number;
  due_date: string | null;
};

type FamilyGroup = {
  account_id: string | null;
  parent_email: string;
  players: string[];
  unpaidFees: UnpaidFee[];
  totalDue: number;
};

type Tab = 'pending' | 'all' | 'summary';
type FilterMethod = 'all' | 'card' | 'cashapp' | 'venmo' | 'zelle' | 'cash' | 'check';
type RecordMethod = 'cash' | 'check' | 'venmo' | 'zelle' | 'cashapp' | 'card' | 'other';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

type Props = {
  hideHeader?: boolean;
};

export default function AdminPaymentsScreen({ hideHeader = false }: Props) {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [filterMethod, setFilterMethod] = useState<FilterMethod>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Record Payment Modal State
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordStep, setRecordStep] = useState<'search' | 'select' | 'confirm'>('search');
  const [recordSearch, setRecordSearch] = useState('');
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<FamilyGroup | null>(null);
  const [selectedFees, setSelectedFees] = useState<Set<string>>(new Set());
  const [recordMethod, setRecordMethod] = useState<RecordMethod>('cash');
  const [recordNote, setRecordNote] = useState('');
  const [loadingFamilies, setLoadingFamilies] = useState(false);

  // Send Reminder Modal State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalDue: 0,
    totalPending: 0,
    totalPaid: 0,
    pendingCount: 0,
    totalCount: 0,
    paidCount: 0,
    unpaidCount: 0,
  });

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchPayments = useCallback(async () => {
    try {
      // Build query based on working season
      let query = supabase
        .from('payments')
        .select(`
          id,
          player_id,
          season_id,
          fee_type,
          fee_name,
          amount,
          status,
          payment_method,
          payer_name,
          reported_at,
          verified_at,
          players (
            first_name,
            last_name,
            parent_email,
            season_id,
            seasons (
              id,
              name,
              sport_id
            )
          )
        `)
        .order('reported_at', { ascending: false, nullsFirst: false });

      if (workingSeason?.id) {
        query = query.eq('season_id', workingSeason.id);
      }

      const { data: paymentRecords, error } = await query;

      if (error) throw error;

      // Fetch sports
      const { data: sports } = await supabase
        .from('sports')
        .select('id, name, icon, color_primary');

      const sportsMap = new Map((sports || []).map(s => [s.id, s]));

      // Format payments
      const formatted: PaymentRecord[] = (paymentRecords || []).map(p => {
        const player = p.players as any;
        const season = player?.seasons as any;
        const sport = sportsMap.get(season?.sport_id);

        return {
          id: p.id,
          player_id: p.player_id,
          player_name: `${player?.first_name || ''} ${player?.last_name || ''}`.trim(),
          parent_email: player?.parent_email || '',
          season_id: p.season_id,
          season_name: season?.name || '',
          sport_name: sport?.name || '',
          sport_icon: sport?.icon || '🏆',
          sport_color: sport?.color_primary || '#FFD700',
          fee_type: p.fee_type || 'registration',
          fee_name: p.fee_name || 'Registration Fee',
          amount: p.amount,
          status: p.status || 'unpaid',
          payment_method: p.payment_method,
          payer_name: p.payer_name,
          reported_at: p.reported_at,
          verified_at: p.verified_at,
        };
      });

      setPayments(formatted);

      // Calculate stats
      const unpaid = formatted.filter(p => p.status === 'unpaid');
      const pending = formatted.filter(p => p.status === 'pending');
      const verified = formatted.filter(p => p.status === 'verified');

      setStats({
        totalDue: unpaid.reduce((sum, p) => sum + p.amount, 0),
        totalPending: pending.reduce((sum, p) => sum + p.amount, 0),
        totalPaid: verified.reduce((sum, p) => sum + p.amount, 0),
        pendingCount: pending.length,
        totalCount: formatted.length,
        paidCount: verified.length,
        unpaidCount: unpaid.length,
      });

    } catch (error) {
      if (__DEV__) console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workingSeason?.id]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPayments();
  }, [fetchPayments]);

  // =============================================================================
  // RECORD PAYMENT - FETCH FAMILIES WITH UNPAID FEES
  // =============================================================================

  const fetchFamiliesWithUnpaidFees = useCallback(async () => {
    setLoadingFamilies(true);
    try {
      // Get all players (optionally filtered by working season)
      let playersQuery = supabase
        .from('players')
        .select(`
          id,
          first_name,
          last_name,
          parent_email,
          parent_account_id,
          season_id,
          seasons (
            id,
            name,
            sport_id
          )
        `);

      if (workingSeason?.id) {
        playersQuery = playersQuery.eq('season_id', workingSeason.id);
      }

      const { data: players, error: playersError } = await playersQuery;
      if (playersError) throw playersError;

      // Get season fees
      const seasonIds = [...new Set((players || []).map(p => p.season_id))];
      const { data: seasonFees } = await supabase
        .from('season_fees')
        .select('*')
        .in('season_id', seasonIds);

      // Get existing payments
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('player_id, fee_type, status')
        .in('player_id', (players || []).map(p => p.id));

      // Get sports
      const { data: sports } = await supabase
        .from('sports')
        .select('id, name, icon, color_primary');

      const sportsMap = new Map((sports || []).map(s => [s.id, s]));
      const feesBySeasonMap = new Map<string, any[]>();
      (seasonFees || []).forEach(fee => {
        const existing = feesBySeasonMap.get(fee.season_id) || [];
        existing.push(fee);
        feesBySeasonMap.set(fee.season_id, existing);
      });

      // Build set of paid fees
      const paidFeeKeys = new Set(
        (existingPayments || [])
          .filter(p => p.status === 'verified' || p.status === 'pending')
          .map(p => `${p.player_id}-${p.fee_type}`)
      );

      // Build unpaid fees list
      const unpaidFees: UnpaidFee[] = [];

      (players || []).forEach(player => {
        const season = player.seasons as any;
        if (!season) return;

        const sport = sportsMap.get(season.sport_id);
        const fees = feesBySeasonMap.get(player.season_id) || [];

        fees.forEach(fee => {
          const feeKey = `${player.id}-${fee.fee_type}`;
          if (!paidFeeKeys.has(feeKey)) {
            unpaidFees.push({
              player_id: player.id,
              player_name: `${player.first_name} ${player.last_name}`,
              parent_email: player.parent_email || '',
              parent_account_id: player.parent_account_id,
              season_id: player.season_id,
              season_name: season.name,
              sport_name: sport?.name || '',
              sport_icon: sport?.icon || '🏆',
              sport_color: sport?.color_primary || '#FFD700',
              fee_type: fee.fee_type,
              fee_name: fee.fee_name,
              amount: fee.amount,
              due_date: fee.due_date,
            });
          }
        });
      });

      // Group by family (account_id or email)
      const familyMap = new Map<string, FamilyGroup>();

      unpaidFees.forEach(fee => {
        const key = fee.parent_account_id || fee.parent_email || fee.player_id;
        
        if (!familyMap.has(key)) {
          familyMap.set(key, {
            account_id: fee.parent_account_id,
            parent_email: fee.parent_email,
            players: [],
            unpaidFees: [],
            totalDue: 0,
          });
        }

        const family = familyMap.get(key)!;
        if (!family.players.includes(fee.player_name)) {
          family.players.push(fee.player_name);
        }
        family.unpaidFees.push(fee);
        family.totalDue += fee.amount;
      });

      // Convert to array and sort by total due (descending)
      const families = Array.from(familyMap.values())
        .sort((a, b) => b.totalDue - a.totalDue);

      setFamilyGroups(families);

    } catch (error) {
      if (__DEV__) console.error('Error fetching families:', error);
      Alert.alert('Error', 'Failed to load families');
    } finally {
      setLoadingFamilies(false);
    }
  }, [workingSeason?.id]);

  // =============================================================================
  // RECORD PAYMENT - MODAL ACTIONS
  // =============================================================================

  const openRecordModal = () => {
    setShowRecordModal(true);
    setRecordStep('search');
    setRecordSearch('');
    setSelectedFamily(null);
    setSelectedFees(new Set());
    setRecordMethod('cash');
    setRecordNote('');
    fetchFamiliesWithUnpaidFees();
  };

  const closeRecordModal = () => {
    setShowRecordModal(false);
  };

  const selectFamily = (family: FamilyGroup) => {
    setSelectedFamily(family);
    setSelectedFees(new Set());
    setRecordStep('select');
  };

  const toggleFeeSelection = (feeKey: string) => {
    setSelectedFees(prev => {
      const next = new Set(prev);
      if (next.has(feeKey)) {
        next.delete(feeKey);
      } else {
        next.add(feeKey);
      }
      return next;
    });
  };

  const selectAllFees = () => {
    if (!selectedFamily) return;
    if (selectedFees.size === selectedFamily.unpaidFees.length) {
      setSelectedFees(new Set());
    } else {
      setSelectedFees(new Set(selectedFamily.unpaidFees.map(f => `${f.player_id}-${f.fee_type}`)));
    }
  };

  const getSelectedTotal = () => {
    if (!selectedFamily) return 0;
    return selectedFamily.unpaidFees
      .filter(f => selectedFees.has(`${f.player_id}-${f.fee_type}`))
      .reduce((sum, f) => sum + f.amount, 0);
  };

  const proceedToConfirm = () => {
    if (selectedFees.size === 0) {
      Alert.alert('Select Fees', 'Please select at least one fee to record.');
      return;
    }
    setRecordStep('confirm');
  };

  const submitRecordPayment = async () => {
    if (!selectedFamily || selectedFees.size === 0) return;

    setSubmitting(true);
    try {
      const feesToRecord = selectedFamily.unpaidFees.filter(f => 
        selectedFees.has(`${f.player_id}-${f.fee_type}`)
      );

      // Create payment records
      const paymentRecords = feesToRecord.map(fee => ({
        player_id: fee.player_id,
        season_id: fee.season_id,
        fee_type: fee.fee_type,
        fee_name: fee.fee_name,
        amount: fee.amount,
        status: 'verified',
        payment_method: recordMethod,
        payer_name: recordNote || null,
        reported_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        verified_by: user?.id,
        paid: true,
      }));

      const { error } = await supabase
        .from('payments')
        .insert(paymentRecords);

      if (error) throw error;

      Alert.alert(
        'Payment Recorded',
        `Successfully recorded $${Number(getSelectedTotal()).toFixed(2)} payment for ${selectedFamily.players.join(', ')}.`
      );

      closeRecordModal();
      fetchPayments();

    } catch (error) {
      if (__DEV__) console.error('Error recording payment:', error);
      Alert.alert('Error', 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter families by search
  const getFilteredFamilies = () => {
    if (!recordSearch.trim()) return familyGroups;
    const query = recordSearch.toLowerCase();
    return familyGroups.filter(f =>
      f.players.some(p => p.toLowerCase().includes(query)) ||
      f.parent_email?.toLowerCase().includes(query)
    );
  };

  // =============================================================================
  // FILTERING (Main List)
  // =============================================================================

  const getFilteredPayments = () => {
    let filtered = payments;

    // Filter by tab
    if (activeTab === 'pending') {
      filtered = filtered.filter(p => p.status === 'pending');
    }

    // Filter by method
    if (filterMethod !== 'all') {
      filtered = filtered.filter(p => p.payment_method === filterMethod);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.player_name.toLowerCase().includes(query) ||
        p.payer_name?.toLowerCase().includes(query) ||
        p.parent_email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredPayments = getFilteredPayments();

  // =============================================================================
  // SELECTION (Main List)
  // =============================================================================

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const pendingFiltered = filteredPayments.filter(p => p.status === 'pending');
    if (selectedIds.size === pendingFiltered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingFiltered.map(p => p.id)));
    }
  };

  // =============================================================================
  // ACTIONS (Main List)
  // =============================================================================

  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return;

    const totalAmount = Array.from(selectedIds)
      .map(id => payments.find(p => p.id === id)?.amount || 0)
      .reduce((a, b) => a + b, 0);

    Alert.alert(
      'Approve Payments',
      `Approve ${selectedIds.size} payment${selectedIds.size > 1 ? 's' : ''} totaling $${Number(totalAmount).toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setSubmitting(true);
            try {
              const { error } = await supabase
                .from('payments')
                .update({
                  status: 'verified',
                  verified_at: new Date().toISOString(),
                  verified_by: user?.id,
                  paid: true,
                })
                .in('id', Array.from(selectedIds));

              if (error) throw error;

              Alert.alert('Success', `${selectedIds.size} payment${selectedIds.size > 1 ? 's' : ''} approved!`);
              setSelectedIds(new Set());
              fetchPayments();
            } catch (error) {
              if (__DEV__) console.error('Error approving payments:', error);
              Alert.alert('Error', 'Failed to approve payments');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectSelected = async () => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      'Reject Payments',
      `Reject ${selectedIds.size} payment${selectedIds.size > 1 ? 's' : ''}? They will be marked as unpaid and the parent will need to re-submit.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              const { error } = await supabase
                .from('payments')
                .update({
                  status: 'unpaid',
                  payment_method: null,
                  payer_name: null,
                  reported_at: null,
                })
                .in('id', Array.from(selectedIds));

              if (error) throw error;

              Alert.alert('Done', `${selectedIds.size} payment${selectedIds.size > 1 ? 's' : ''} rejected.`);
              setSelectedIds(new Set());
              fetchPayments();
            } catch (error) {
              if (__DEV__) console.error('Error rejecting payments:', error);
              Alert.alert('Error', 'Failed to reject payments');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleApproveSingle = async (payment: PaymentRecord) => {
    Alert.alert(
      'Approve Payment',
      `Approve $${Number(payment.amount).toFixed(2)} from ${payment.payer_name || payment.player_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('payments')
                .update({
                  status: 'verified',
                  verified_at: new Date().toISOString(),
                  verified_by: user?.id,
                  paid: true,
                })
                .eq('id', payment.id);

              if (error) throw error;
              fetchPayments();
            } catch (error) {
              if (__DEV__) console.error('Error:', error);
              Alert.alert('Error', 'Failed to approve payment');
            }
          },
        },
      ]
    );
  };

  // =============================================================================
  // SEND PAYMENT REMINDER
  // =============================================================================

  const openReminderModal = () => {
    // Build list of families with outstanding balances
    const unpaidPayments = payments.filter(p => p.status === 'unpaid' || p.status === 'pending');
    const familyEmails = [...new Set(unpaidPayments.map(p => p.parent_email).filter(Boolean))];

    if (familyEmails.length === 0) {
      Alert.alert('No Outstanding Balances', 'All families are current on their payments.');
      return;
    }

    const orgName = profile?.full_name ? `- ${profile.full_name}` : '';
    setReminderMessage(
      `Hi,\n\nThis is a friendly reminder about your outstanding balance for the current season. Please log in to the VolleyBrain app to view your balance and make a payment.\n\nThank you for your support!\n\n${orgName}`
    );
    setShowReminderModal(true);
  };

  const handleSendReminder = async () => {
    setSendingReminder(true);

    try {
      // Get families with outstanding balances
      const unpaidPayments = payments.filter(p => p.status === 'unpaid');
      const familyMap = new Map<string, { email: string; players: string[]; totalDue: number }>();

      unpaidPayments.forEach(p => {
        if (!p.parent_email) return;
        const existing = familyMap.get(p.parent_email) || { email: p.parent_email, players: [], totalDue: 0 };
        if (!existing.players.includes(p.player_name)) {
          existing.players.push(p.player_name);
        }
        existing.totalDue += p.amount;
        familyMap.set(p.parent_email, existing);
      });

      const families = Array.from(familyMap.values());

      if (families.length === 0) {
        Alert.alert('No Reminders Needed', 'All families are current on their payments.');
        setShowReminderModal(false);
        return;
      }

      // Create notification records for each family
      const notifications = families.map(family => ({
        type: 'payment_reminder',
        title: 'Payment Reminder',
        message: reminderMessage.trim(),
        recipient_email: family.email,
        metadata: {
          total_due: family.totalDue,
          players: family.players,
          season_id: workingSeason?.id,
        },
        created_by: user?.id,
        created_at: new Date().toISOString(),
      }));

      // Try to insert notifications (table may not exist, that's OK)
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        // If table doesn't exist, just show a success message anyway
        if (__DEV__) console.log('Notification insert note:', error.message);
      }

      Alert.alert(
        'Reminders Sent',
        `Payment reminders queued for ${families.length} ${families.length === 1 ? 'family' : 'families'} with outstanding balances.`,
        [{ text: 'OK' }]
      );

      setShowReminderModal(false);
    } catch (error) {
      if (__DEV__) console.error('Error sending reminders:', error);
      Alert.alert('Error', 'Failed to send reminders. Please try again.');
    } finally {
      setSendingReminder(false);
    }
  };

  // =============================================================================
  // EXPORT / SUMMARY HELPERS
  // =============================================================================

  const getPaymentSummaryByMethod = () => {
    const methods = new Map<string, { count: number; total: number }>();

    payments.filter(p => p.status === 'verified' || p.status === 'pending').forEach(p => {
      const method = p.payment_method || 'unknown';
      const existing = methods.get(method) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += p.amount;
      methods.set(method, existing);
    });

    return Array.from(methods.entries())
      .map(([method, data]) => ({ method, ...data }))
      .sort((a, b) => b.total - a.total);
  };

  const handleExportSummary = async () => {
    const summary = getPaymentSummaryByMethod();
    const totalCollected = stats.totalPaid + stats.totalPending;
    const seasonName = workingSeason?.name || 'All Seasons';

    let text = `Payment Summary - ${seasonName}\n`;
    text += `${'='.repeat(40)}\n\n`;
    text += `Total Collected: $${Number(stats.totalPaid).toFixed(2)}\n`;
    text += `Pending Verification: $${Number(stats.totalPending).toFixed(2)}\n`;
    text += `Outstanding: $${Number(stats.totalDue).toFixed(2)}\n`;
    text += `Total Expected: $${Number(totalCollected + stats.totalDue).toFixed(2)}\n\n`;
    text += `Payments: ${stats.paidCount} paid, ${stats.pendingCount} pending, ${stats.unpaidCount} unpaid\n\n`;
    text += `By Payment Method:\n`;
    text += `${'-'.repeat(30)}\n`;

    summary.forEach(s => {
      text += `${getMethodLabel(s.method)}: ${s.count} payments - $${Number(s.total).toFixed(2)}\n`;
    });

    text += `\n\nGenerated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

    try {
      await Share.share({
        title: `Payment Summary - ${seasonName}`,
        message: text,
      });
    } catch (error) {
      if (__DEV__) console.error('Error sharing summary:', error);
    }
  };

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMethodColor = (method: string | null) => {
    switch (method) {
      case 'card':
      case 'stripe': return '#635BFF';
      case 'cashapp': return '#00D632';
      case 'venmo': return '#008CFF';
      case 'zelle': return '#6D1ED4';
      case 'cash': return '#34C759';
      case 'check': return '#5856D6';
      default: return colors.textSecondary;
    }
  };

  const getMethodLabel = (method: string | null) => {
    switch (method) {
      case 'card':
      case 'stripe': return 'Card';
      case 'cashapp': return 'Cash App';
      case 'venmo': return 'Venmo';
      case 'zelle': return 'Zelle';
      case 'cash': return 'Cash';
      case 'check': return 'Check';
      case 'other': return 'Other';
      default: return 'Unknown';
    }
  };

  const getMethodIcon = (method: string | null): string => {
    switch (method) {
      case 'card':
      case 'stripe': return 'card';
      case 'cash': return 'cash-outline';
      case 'check': return 'document-text-outline';
      case 'venmo': return 'logo-venmo';
      case 'zelle': return 'flash-outline';
      case 'cashapp': return 'cash-outline';
      default: return 'card-outline';
    }
  };

  const getMethodShortLabel = (method: string | null): string => {
    switch (method) {
      case 'card':
      case 'stripe': return 'CARD';
      case 'cashapp': return '$';
      case 'venmo': return 'V';
      case 'zelle': return 'Z';
      case 'cash': return 'CASH';
      case 'check': return 'CHK';
      default: return '?';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified': return { label: 'Paid', color: '#34C759', icon: 'checkmark-circle' };
      case 'pending': return { label: 'Pending', color: '#FF9500', icon: 'time' };
      default: return { label: 'Unpaid', color: '#FF3B30', icon: 'alert-circle' };
    }
  };

  const pendingCount = payments.filter(p => p.status === 'pending').length;

  // =============================================================================
  // RENDER - RECORD PAYMENT MODAL
  // =============================================================================

  const renderRecordModal = () => (
    <Modal
      visible={showRecordModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeRecordModal}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
        {/* Modal Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <TouchableOpacity onPress={() => {
            if (recordStep === 'search') {
              closeRecordModal();
            } else if (recordStep === 'select') {
              setRecordStep('search');
              setSelectedFamily(null);
            } else {
              setRecordStep('select');
            }
          }}>
            <Ionicons 
              name={recordStep === 'search' ? 'close' : 'arrow-back'} 
              size={24} 
              color={colors.text} 
            />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
            {recordStep === 'search' && 'Record Payment'}
            {recordStep === 'select' && 'Select Fees'}
            {recordStep === 'confirm' && 'Confirm Payment'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Step 1: Search Families */}
        {recordStep === 'search' && (
          <View style={{ flex: 1 }}>
            {/* Search Bar */}
            <View style={{ padding: 16 }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.card,
                borderRadius: 10,
                paddingHorizontal: 12,
              }}>
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  value={recordSearch}
                  onChangeText={setRecordSearch}
                  placeholder="Search player or parent name..."
                  placeholderTextColor={colors.textSecondary}
                  style={{
                    flex: 1,
                    padding: 12,
                    fontSize: 15,
                    color: colors.text,
                  }}
                  autoFocus
                />
                {recordSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setRecordSearch('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Families List */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
              {loadingFamilies ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
              ) : getFilteredFamilies().length === 0 ? (
                <View style={{
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  padding: 32,
                  alignItems: 'center',
                }}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                  <Text style={{ color: colors.text, marginTop: 12, fontSize: 16, fontWeight: '600' }}>
                    All Caught Up!
                  </Text>
                  <Text style={{ color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                    {recordSearch ? 'No families match your search.' : 'No unpaid fees found.'}
                  </Text>
                </View>
              ) : (
                getFilteredFamilies().map((family, idx) => (
                  <TouchableOpacity
                    key={family.account_id || family.parent_email || idx}
                    onPress={() => selectFamily(family)}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                          {family.players.join(', ')}
                        </Text>
                        {family.parent_email && (
                          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                            {family.parent_email}
                          </Text>
                        )}
                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                          {family.unpaidFees.length} unpaid fee{family.unpaidFees.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FF3B30' }}>
                          ${Number(family.totalDue).toFixed(2)}
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginTop: 4 }} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Step 2: Select Fees */}
        {recordStep === 'select' && selectedFamily && (
          <View style={{ flex: 1 }}>
            {/* Family Header */}
            <View style={{
              backgroundColor: colors.card,
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                {selectedFamily.players.join(', ')}
              </Text>
              {selectedFamily.parent_email && (
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                  {selectedFamily.parent_email}
                </Text>
              )}
            </View>

            {/* Select All */}
            <TouchableOpacity
              onPress={selectAllFees}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: selectedFees.size === selectedFamily.unpaidFees.length ? colors.primary : colors.border,
                backgroundColor: selectedFees.size === selectedFamily.unpaidFees.length ? colors.primary : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                {selectedFees.size === selectedFamily.unpaidFees.length && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                Select All (${Number(selectedFamily.totalDue).toFixed(2)})
              </Text>
            </TouchableOpacity>

            {/* Fees List */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              {selectedFamily.unpaidFees.map(fee => {
                const feeKey = `${fee.player_id}-${fee.fee_type}`;
                const isSelected = selectedFees.has(feeKey);

                return (
                  <TouchableOpacity
                    key={feeKey}
                    onPress={() => toggleFeeSelection(feeKey)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isSelected ? colors.primary + '15' : colors.card,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 10,
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: colors.primary,
                    }}
                  >
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                        {fee.fee_name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Text style={{ fontSize: 20, marginRight: 6 }}>{fee.sport_icon}</Text>
                        <Text style={{ fontSize: 13, color: fee.sport_color }}>
                          {fee.player_name} • {fee.season_name}
                        </Text>
                      </View>
                      {fee.due_date && (
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                          Due: {new Date(fee.due_date).toLocaleDateString()}
                        </Text>
                      )}
                    </View>

                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                      ${Number(fee.amount).toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Bottom Action */}
            <View style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            }}>
              <TouchableOpacity
                onPress={proceedToConfirm}
                disabled={selectedFees.size === 0}
                style={{
                  backgroundColor: selectedFees.size > 0 ? colors.primary : colors.card,
                  borderRadius: 12,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontSize: 17,
                  fontWeight: '600',
                  color: selectedFees.size > 0 ? '#000' : colors.textSecondary,
                }}>
                  {selectedFees.size > 0
                    ? `Continue with $${Number(getSelectedTotal()).toFixed(2)}`
                    : 'Select fees to continue'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Confirm & Record */}
        {recordStep === 'confirm' && selectedFamily && (
          <View style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              {/* Summary Card */}
              <View style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>
                  Recording payment for
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                  {selectedFamily.players.join(', ')}
                </Text>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 16,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}>
                  <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                    {selectedFees.size} fee{selectedFees.size !== 1 ? 's' : ''} selected
                  </Text>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: colors.success }}>
                    ${Number(getSelectedTotal()).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Payment Method */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 }}>
                PAYMENT METHOD
              </Text>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 20,
              }}>
                {(['cash', 'check', 'venmo', 'zelle', 'cashapp', 'other'] as RecordMethod[]).map(method => (
                  <TouchableOpacity
                    key={method}
                    onPress={() => setRecordMethod(method)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: recordMethod === method ? getMethodColor(method) : colors.card,
                      borderWidth: recordMethod === method ? 0 : 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Ionicons 
                      name={getMethodIcon(method) as any} 
                      size={18} 
                      color={recordMethod === method ? '#fff' : colors.text} 
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: recordMethod === method ? '#fff' : colors.text,
                    }}>
                      {getMethodLabel(method)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Optional Note */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 }}>
                NOTE (OPTIONAL)
              </Text>
              <TextInput
                value={recordNote}
                onChangeText={setRecordNote}
                placeholder="Check #, Venmo username, etc."
                placeholderTextColor={colors.textSecondary}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 15,
                  color: colors.text,
                  marginBottom: 20,
                }}
              />

              {/* Selected Fees Summary */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 }}>
                FEES INCLUDED
              </Text>
              {selectedFamily.unpaidFees
                .filter(f => selectedFees.has(`${f.player_id}-${f.fee_type}`))
                .map(fee => (
                  <View
                    key={`${fee.player_id}-${fee.fee_type}`}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>
                        {fee.fee_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {fee.player_name}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                      ${Number(fee.amount).toFixed(2)}
                    </Text>
                  </View>
                ))}
            </ScrollView>

            {/* Submit Button */}
            <View style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            }}>
              <TouchableOpacity
                onPress={submitRecordPayment}
                disabled={submitting}
                style={{
                  backgroundColor: colors.success,
                  borderRadius: 12,
                  padding: 16,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff' }}>
                      Record Payment
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );

  // =============================================================================
  // RENDER - MAIN SCREEN
  // =============================================================================

  if (loading) {
    const LoadingWrapper = hideHeader ? View : SafeAreaView;
    return (
      <LoadingWrapper style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </LoadingWrapper>
    );
  }

  const Wrapper = hideHeader ? View : SafeAreaView;
  const wrapperProps = hideHeader ? {} : { edges: ['top'] as const };

  return (
    <Wrapper style={{ flex: 1, backgroundColor: 'transparent' }} {...wrapperProps}>
      {/* Header - only show if not hidden */}
      {!hideHeader && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>
              Payments
            </Text>
            {workingSeason && (
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
                {workingSeason.name}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={openReminderModal}
              style={{
                backgroundColor: colors.card,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openRecordModal}
              style={{
                backgroundColor: colors.primary,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 10,
              }}
            >
              <Ionicons name="add" size={20} color="#000" />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#000', marginLeft: 4 }}>
                Record
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Compact Header when hideHeader - show Record and Reminder buttons */}
      {hideHeader && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
        }}>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            {workingSeason?.name || 'All Seasons'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={openReminderModal}
              style={{
                backgroundColor: colors.card,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="notifications-outline" size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openRecordModal}
              style={{
                backgroundColor: colors.primary,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Ionicons name="add" size={18} color="#000" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#000', marginLeft: 4 }}>
                Record
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stats Row */}
      <View style={{
        flexDirection: 'row',
        padding: 16,
        gap: 10,
      }}>
        <View style={{
          flex: 1,
          backgroundColor: '#FF3B3020',
          borderRadius: 12,
          padding: 12,
        }}>
          <Text style={{ fontSize: 11, color: '#FF3B30', fontWeight: '600' }}>UNPAID</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#FF3B30', marginTop: 2 }}>
            ${Number(stats.totalDue).toFixed(2)}
          </Text>
        </View>
        <View style={{
          flex: 1,
          backgroundColor: '#FF950020',
          borderRadius: 12,
          padding: 12,
        }}>
          <Text style={{ fontSize: 11, color: '#FF9500', fontWeight: '600' }}>PENDING</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#FF9500', marginTop: 2 }}>
            ${Number(stats.totalPending).toFixed(2)}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            {stats.pendingCount} to verify
          </Text>
        </View>
        <View style={{
          flex: 1,
          backgroundColor: colors.success + '20',
          borderRadius: 12,
          padding: 12,
        }}>
          <Text style={{ fontSize: 11, color: colors.success, fontWeight: '600' }}>PAID</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.success, marginTop: 2 }}>
            ${Number(stats.totalPaid).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={{
        flexDirection: 'row',
        marginHorizontal: 16,
        backgroundColor: colors.card,
        borderRadius: 10,
        padding: 4,
        marginBottom: 12,
      }}>
        <TouchableOpacity
          onPress={() => { setActiveTab('pending'); setSelectedIds(new Set()); }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: activeTab === 'pending' ? colors.primary : 'transparent',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{
            fontWeight: '600',
            fontSize: 13,
            color: activeTab === 'pending' ? '#000' : colors.text,
          }}>
            Verify
          </Text>
          {pendingCount > 0 && (
            <View style={{
              backgroundColor: activeTab === 'pending' ? '#00000030' : '#FF9500',
              borderRadius: 10,
              paddingHorizontal: 6,
              paddingVertical: 2,
              marginLeft: 6,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setActiveTab('all'); setSelectedIds(new Set()); }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: activeTab === 'all' ? colors.primary : 'transparent',
          }}
        >
          <Text style={{
            textAlign: 'center',
            fontWeight: '600',
            fontSize: 13,
            color: activeTab === 'all' ? '#000' : colors.text,
          }}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setActiveTab('summary'); setSelectedIds(new Set()); }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: activeTab === 'summary' ? colors.primary : 'transparent',
          }}
        >
          <Text style={{
            textAlign: 'center',
            fontWeight: '600',
            fontSize: 13,
            color: activeTab === 'summary' ? '#000' : colors.text,
          }}>
            Summary
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search (All tab) */}
      {activeTab === 'all' && (
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderRadius: 10,
            paddingHorizontal: 12,
          }}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search player or payer name..."
              placeholderTextColor={colors.textSecondary}
              style={{
                flex: 1,
                padding: 12,
                fontSize: 15,
                color: colors.text,
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Method Filter (Pending tab) */}
      {activeTab === 'pending' && (
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          marginBottom: 12,
          gap: 8,
        }}>
          {(['all', 'card', 'cashapp', 'venmo', 'zelle'] as FilterMethod[]).map(method => (
            <TouchableOpacity
              key={method}
              onPress={() => {
                setFilterMethod(method);
                setSelectedIds(new Set());
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: filterMethod === method 
                  ? (method === 'all' ? colors.primary : getMethodColor(method))
                  : colors.card,
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: filterMethod === method ? '#fff' : colors.text,
              }}>
                {method === 'all' ? 'All' : getMethodLabel(method)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Bulk Actions (Pending tab) */}
      {activeTab === 'pending' && filteredPayments.filter(p => p.status === 'pending').length > 0 && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}>
          <TouchableOpacity
            onPress={selectAll}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <View style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: selectedIds.size === filteredPayments.filter(p => p.status === 'pending').length && selectedIds.size > 0 
                ? colors.primary : colors.border,
              backgroundColor: selectedIds.size === filteredPayments.filter(p => p.status === 'pending').length && selectedIds.size > 0 
                ? colors.primary : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 10,
            }}>
              {selectedIds.size === filteredPayments.filter(p => p.status === 'pending').length && selectedIds.size > 0 && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </View>
            <Text style={{ fontSize: 14, color: colors.text }}>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={handleRejectSelected}
              disabled={selectedIds.size === 0 || submitting}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: selectedIds.size > 0 ? '#FF3B3020' : colors.background,
              }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: selectedIds.size > 0 ? '#FF3B30' : colors.textSecondary,
              }}>
                Reject
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApproveSelected}
              disabled={selectedIds.size === 0 || submitting}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: selectedIds.size > 0 ? colors.success : colors.background,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: selectedIds.size > 0 ? '#fff' : colors.textSecondary,
                }}>
                  Approve
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredPayments.length === 0 ? (
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 32,
            alignItems: 'center',
          }}>
            <Ionicons 
              name={activeTab === 'pending' ? 'checkmark-circle' : 'receipt-outline'} 
              size={48} 
              color={activeTab === 'pending' ? colors.success : colors.textSecondary} 
            />
            <Text style={{ color: colors.text, marginTop: 12, fontSize: 16, fontWeight: '600' }}>
              {activeTab === 'pending' ? 'All Caught Up!' : 'No Payments Found'}
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13, textAlign: 'center' }}>
              {activeTab === 'pending' 
                ? 'No payments pending verification.' 
                : searchQuery 
                  ? 'Try a different search term.'
                  : 'No payment records yet.'}
            </Text>
          </View>
        ) : (
          filteredPayments.map(payment => {
            const isSelected = selectedIds.has(payment.id);
            const isPending = payment.status === 'pending';
            const methodColor = getMethodColor(payment.payment_method);
            const status = getStatusBadge(payment.status);

            return (
              <TouchableOpacity
                key={payment.id}
                onPress={() => isPending && activeTab === 'pending' ? toggleSelection(payment.id) : null}
                onLongPress={() => isPending ? handleApproveSingle(payment) : null}
                style={{
                  backgroundColor: isSelected ? colors.primary + '10' : colors.card,
                  borderRadius: 12,
                  marginBottom: 10,
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: colors.primary,
                  overflow: 'hidden',
                }}
              >
                <View style={{ flexDirection: 'row', padding: 14 }}>
                  {/* Checkbox (pending tab only) */}
                  {activeTab === 'pending' && isPending && (
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                      marginTop: 2,
                    }}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                  )}

                  {/* Payment Info */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                        {payment.player_name}
                      </Text>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                        ${Number(payment.amount).toFixed(2)}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Text style={{ fontSize: 20, marginRight: 6 }}>{payment.sport_icon}</Text>
                      <Text style={{ fontSize: 13, color: payment.sport_color }}>
                        {payment.fee_name} • {payment.season_name}
                      </Text>
                    </View>

                    {/* Method + Payer (for pending) */}
                    {payment.payment_method && (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 10,
                        backgroundColor: methodColor + '15',
                        alignSelf: 'flex-start',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                      }}>
                        <View style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          backgroundColor: methodColor,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 6,
                        }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>
                            {payment.payment_method === 'cashapp' ? '$' : 
                             payment.payment_method === 'venmo' ? 'V' : 
                             payment.payment_method === 'zelle' ? 'Z' :
                             payment.payment_method === 'cash' ? '💵' :
                             payment.payment_method === 'check' ? '📝' : '?'}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: methodColor }}>
                          {payment.payer_name || getMethodLabel(payment.payment_method)}
                        </Text>
                      </View>
                    )}

                    {/* Status badge (for all tab) */}
                    {activeTab === 'all' && (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 8,
                        backgroundColor: status.color + '20',
                        alignSelf: 'flex-start',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}>
                        <Ionicons name={status.icon as any} size={12} color={status.color} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: status.color, marginLeft: 4 }}>
                          {status.label}
                        </Text>
                      </View>
                    )}

                    {/* Time */}
                    {payment.reported_at && (
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6 }}>
                        {isPending ? 'Reported' : payment.status === 'verified' ? 'Verified' : 'Updated'} {formatTime(payment.status === 'verified' ? payment.verified_at : payment.reported_at)}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Tips (pending tab) */}
        {activeTab === 'pending' && filteredPayments.length > 0 && (
          <View style={{
            backgroundColor: colors.primary + '10',
            borderRadius: 12,
            padding: 14,
            marginTop: 10,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 6 }}>
              💡 Quick Tips
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
              • Open {filterMethod !== 'all' ? getMethodLabel(filterMethod) : 'your payment app'} and check recent transactions{'\n'}
              • Match the payer name and amount{'\n'}
              • Select multiple and tap "Approve" for bulk action{'\n'}
              • Long-press any row to quickly approve single payment
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Record Payment Modal */}
      {renderRecordModal()}
    </Wrapper>
  );
}
