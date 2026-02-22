import AdminContextBar from '@/components/AdminContextBar';
import AppHeaderBar from '@/components/ui/AppHeaderBar';
import StatBox from '@/components/ui/StatBox';
import { useAuth } from '@/lib/auth';
import { queuePaymentConfirmation } from '@/lib/email-queue';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =============================================================================
// TYPES
// =============================================================================

type PaymentItem = {
  id: string;
  player_id: string;
  season_id: string;
  fee_type: string;
  fee_name: string;
  amount: number;
  due_date: string | null;
  status: 'unpaid' | 'pending' | 'verified';
  payment_method: string | null;
  payer_name: string | null;
  reported_at: string | null;
  verified_at: string | null;
};

type PlayerGroup = {
  player_id: string;
  player_name: string;
  family_id: string | null;
  season_id: string;
  season_name: string;
  sport_name: string;
  sport_icon: string;
  sport_color: string;
  parent_email: string;
  payments: PaymentItem[];
  totalDue: number;
  pendingCount: number;
  unpaidCount: number;
  paidCount: number;
};

type FamilyGroup = {
  family_id: string | null;
  family_name: string;
  players: PlayerGroup[];
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  collectionRate: number;
};
type ViewMode = 'player' | 'family';

type Tab = 'verification' | 'all';
type RecordMethod = 'cash' | 'check' | 'venmo' | 'zelle' | 'cashapp' | 'other';

type Props = {
  hideHeader?: boolean;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AdminPaymentsScreen({ hideHeader = false }: Props) {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playerGroups, setPlayerGroups] = useState<PlayerGroup[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('verification');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
  const [selectedFees, setSelectedFees] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('player');
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [showOutstandingOnly, setShowOutstandingOnly] = useState(false);
  const [generatingFees, setGeneratingFees] = useState(false);

  // Record Payment Modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordingFee, setRecordingFee] = useState<PaymentItem | null>(null);
  const [recordingPlayer, setRecordingPlayer] = useState<PlayerGroup | null>(null);
  const [recordMethod, setRecordMethod] = useState<RecordMethod>('cash');
  const [recordNote, setRecordNote] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalUnpaid: 0,
    totalPending: 0,
    totalPaid: 0,
    pendingCount: 0,
  });

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchPayments = useCallback(async () => {
    try {
      // Fetch all players (optionally filtered by season)
      let playersQuery = supabase
        .from('players')
        .select(`
          id,
          first_name,
          last_name,
          parent_email,
          family_id,
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

      if (!players || players.length === 0) {
        setPlayerGroups([]);
        setFamilyGroups([]);
        setStats({ totalUnpaid: 0, totalPending: 0, totalPaid: 0, pendingCount: 0 });
        setLoading(false);
        return;
      }

      // Get season IDs
      const seasonIds = [...new Set(players.map(p => p.season_id).filter(Boolean))];
      const playerIds = players.map(p => p.id);

      // Fetch season fees
      const { data: seasonFees } = await supabase
        .from('season_fees')
        .select('*')
        .in('season_id', seasonIds)
        .order('sort_order');

      // Fetch existing payments
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('*')
        .in('player_id', playerIds);

      // Fetch sports
      const { data: sports } = await supabase
        .from('sports')
        .select('id, name, icon, color_primary');

      // Build lookup maps
      const sportsMap = new Map((sports || []).map(s => [s.id, s]));
      const feesBySeasonMap = new Map<string, any[]>();
      (seasonFees || []).forEach(fee => {
        const existing = feesBySeasonMap.get(fee.season_id) || [];
        existing.push(fee);
        feesBySeasonMap.set(fee.season_id, existing);
      });

      // Build payment lookup
      const paymentMap = new Map<string, any>();
      (existingPayments || []).forEach(p => {
        const key = `${p.player_id}-${p.fee_type}`;
        paymentMap.set(key, p);
      });

      // Build player groups
      const groups: PlayerGroup[] = [];
      let totalUnpaid = 0;
      let totalPending = 0;
      let totalPaid = 0;
      let pendingCount = 0;

      players.forEach(player => {
        const season = player.seasons as any;
        if (!season) return;

        const sport = sportsMap.get(season.sport_id);
        const fees = feesBySeasonMap.get(player.season_id) || [];

        const payments: PaymentItem[] = [];
        let groupUnpaid = 0;
        let groupPending = 0;
        let groupPaid = 0;

        fees.forEach(fee => {
          const existingPayment = paymentMap.get(`${player.id}-${fee.fee_type}`);
          const status = existingPayment?.status || 'unpaid';
          const amount = existingPayment?.amount || fee.amount;

          payments.push({
            id: existingPayment?.id || `new-${player.id}-${fee.fee_type}`,
            player_id: player.id,
            season_id: player.season_id,
            fee_type: fee.fee_type,
            fee_name: fee.fee_name,
            amount: amount,
            due_date: fee.due_date,
            status: status,
            payment_method: existingPayment?.payment_method || null,
            payer_name: existingPayment?.payer_name || null,
            reported_at: existingPayment?.reported_at || null,
            verified_at: existingPayment?.verified_at || null,
          });

          if (status === 'unpaid') {
            groupUnpaid += amount;
            totalUnpaid += amount;
          } else if (status === 'pending') {
            groupPending += amount;
            totalPending += amount;
            pendingCount++;
          } else if (status === 'verified') {
            groupPaid += amount;
            totalPaid += amount;
          }
        });

        if (payments.length > 0) {
          groups.push({
            player_id: player.id,
            player_name: `${player.first_name} ${player.last_name}`,
            family_id: (player as any).family_id || null,
            season_id: player.season_id,
            season_name: season.name,
            sport_name: sport?.name || '',
            sport_icon: sport?.icon || '🏆',
            sport_color: sport?.color_primary || '#FFD700',
            parent_email: player.parent_email || '',
            payments: payments,
            totalDue: groupUnpaid + groupPending,
            pendingCount: payments.filter(p => p.status === 'pending').length,
            unpaidCount: payments.filter(p => p.status === 'unpaid').length,
            paidCount: payments.filter(p => p.status === 'verified').length,
          });
        }
      });

      // Sort: groups with pending first, then by player name
      groups.sort((a, b) => {
        if (a.pendingCount > 0 && b.pendingCount === 0) return -1;
        if (a.pendingCount === 0 && b.pendingCount > 0) return 1;
        return a.player_name.localeCompare(b.player_name);
      });

      setPlayerGroups(groups);
      setStats({ totalUnpaid, totalPending, totalPaid, pendingCount });
      buildFamilyGroups(groups);

    } catch (error) {
      if (__DEV__) console.error('Error fetching payments:', error);
      Alert.alert('Error', 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workingSeason?.id]);

  const buildFamilyGroups = async (groups: PlayerGroup[]) => {
    try {
      // Group players by family_id
      const familyMap = new Map<string, PlayerGroup[]>();
      const soloPlayers: PlayerGroup[] = [];

      groups.forEach(group => {
        if (group.family_id) {
          const existing = familyMap.get(group.family_id) || [];
          existing.push(group);
          familyMap.set(group.family_id, existing);
        } else {
          soloPlayers.push(group);
        }
      });

      // Batch query families table for names
      const familyIds = [...familyMap.keys()];
      let familyNamesMap = new Map<string, string>();
      if (familyIds.length > 0) {
        const { data: families } = await supabase
          .from('families')
          .select('id, name')
          .in('id', familyIds);
        (families || []).forEach(f => {
          familyNamesMap.set(f.id, f.name);
        });
      }

      const result: FamilyGroup[] = [];

      // Build family groups from grouped players
      familyMap.forEach((players, familyId) => {
        let totalPaid = 0;
        let outstanding = 0;

        players.forEach(player => {
          player.payments.forEach(payment => {
            if (payment.status === 'verified') {
              totalPaid += payment.amount;
            } else {
              outstanding += payment.amount;
            }
          });
        });

        const collectionRate = (totalPaid + outstanding) > 0
          ? (totalPaid / (totalPaid + outstanding)) * 100
          : 0;

        result.push({
          family_id: familyId,
          family_name: familyNamesMap.get(familyId) || 'Unknown Family',
          players,
          totalDue: outstanding,
          totalPaid,
          outstanding,
          collectionRate,
        });
      });

      // Add solo players as individual family entries
      soloPlayers.forEach(player => {
        let totalPaid = 0;
        let outstanding = 0;

        player.payments.forEach(payment => {
          if (payment.status === 'verified') {
            totalPaid += payment.amount;
          } else {
            outstanding += payment.amount;
          }
        });

        const collectionRate = (totalPaid + outstanding) > 0
          ? (totalPaid / (totalPaid + outstanding)) * 100
          : 0;

        result.push({
          family_id: null,
          family_name: player.player_name,
          players: [player],
          totalDue: outstanding,
          totalPaid,
          outstanding,
          collectionRate,
        });
      });

      // Sort by outstanding desc
      result.sort((a, b) => b.outstanding - a.outstanding);

      setFamilyGroups(result);
    } catch (error) {
      if (__DEV__) console.error('Error building family groups:', error);
    }
  };

  const handleGenerateMissingFees = async () => {
    if (!workingSeason?.id) return;
    setGeneratingFees(true);
    try {
      // 1. Get all players for season
      const { data: allPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('season_id', workingSeason.id);
      if (!allPlayers || allPlayers.length === 0) {
        Alert.alert('No Players', 'No players found for this season.');
        setGeneratingFees(false);
        return;
      }
      // 2. Get existing payment player_ids
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('player_id')
        .eq('season_id', workingSeason.id);
      const paidPlayerIds = new Set((existingPayments || []).map(p => p.player_id));
      // 3. Find missing
      const missingPlayers = allPlayers.filter(p => !paidPlayerIds.has(p.id));
      if (missingPlayers.length === 0) {
        Alert.alert('All Good', 'All players already have fee records.');
        setGeneratingFees(false);
        return;
      }
      // 4. Get fee templates
      const { data: feeTemplates } = await supabase
        .from('season_fees')
        .select('fee_type, fee_name, amount, due_date')
        .eq('season_id', workingSeason.id);
      if (!feeTemplates || feeTemplates.length === 0) {
        Alert.alert('No Fee Templates', 'Set up season fees in Season Settings first.');
        setGeneratingFees(false);
        return;
      }
      // 5. Confirm
      Alert.alert(
        'Generate Missing Fees',
        `${missingPlayers.length} player${missingPlayers.length !== 1 ? 's' : ''} missing fee records. Generate ${missingPlayers.length * feeTemplates.length} payment records?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setGeneratingFees(false) },
          {
            text: 'Generate',
            onPress: async () => {
              try {
                const records = missingPlayers.flatMap(player =>
                  feeTemplates.map(fee => ({
                    season_id: workingSeason.id,
                    player_id: player.id,
                    fee_type: fee.fee_type,
                    fee_name: fee.fee_name,
                    amount: fee.amount,
                    paid: false,
                    due_date: fee.due_date || null,
                    auto_generated: true,
                    status: 'unpaid',
                  }))
                );
                const { error } = await supabase.from('payments').insert(records);
                if (error) throw error;
                Alert.alert('Done', `${records.length} fee records created for ${missingPlayers.length} players.`);
                fetchPayments();
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to generate fees');
              } finally {
                setGeneratingFees(false);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to check missing fees');
      setGeneratingFees(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSelectedFees(new Set());
    setExpandedPlayers(new Set());
    fetchPayments();
  }, [fetchPayments]);

  // =============================================================================
  // FILTERING
  // =============================================================================

  const getFilteredGroups = () => {
    let filtered = playerGroups;

    // Filter by tab
    if (activeTab === 'verification') {
      filtered = filtered.filter(g => g.pendingCount > 0);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.player_name.toLowerCase().includes(query) ||
        g.parent_email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredGroups = getFilteredGroups();

  // =============================================================================
  // EXPANSION
  // =============================================================================

  const toggleExpand = (playerId: string) => {
    setExpandedPlayers(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  // =============================================================================
  // SELECTION
  // =============================================================================

  const toggleFeeSelection = (feeId: string) => {
    setSelectedFees(prev => {
      const next = new Set(prev);
      if (next.has(feeId)) {
        next.delete(feeId);
      } else {
        next.add(feeId);
      }
      return next;
    });
  };

  const togglePlayerSelection = (group: PlayerGroup) => {
    const relevantPayments = activeTab === 'verification'
      ? group.payments.filter(p => p.status === 'pending')
      : group.payments.filter(p => p.status !== 'verified');

    const allSelected = relevantPayments.every(p => selectedFees.has(p.id));

    setSelectedFees(prev => {
      const next = new Set(prev);
      relevantPayments.forEach(p => {
        if (allSelected) {
          next.delete(p.id);
        } else {
          next.add(p.id);
        }
      });
      return next;
    });
  };

  const isPlayerFullySelected = (group: PlayerGroup) => {
    const relevantPayments = activeTab === 'verification'
      ? group.payments.filter(p => p.status === 'pending')
      : group.payments.filter(p => p.status !== 'verified');

    if (relevantPayments.length === 0) return false;
    return relevantPayments.every(p => selectedFees.has(p.id));
  };

  const isPlayerPartiallySelected = (group: PlayerGroup) => {
    const relevantPayments = activeTab === 'verification'
      ? group.payments.filter(p => p.status === 'pending')
      : group.payments.filter(p => p.status !== 'verified');

    const selectedCount = relevantPayments.filter(p => selectedFees.has(p.id)).length;
    return selectedCount > 0 && selectedCount < relevantPayments.length;
  };

  const getSelectedTotal = () => {
    let total = 0;
    playerGroups.forEach(group => {
      group.payments.forEach(p => {
        if (selectedFees.has(p.id)) {
          total += p.amount;
        }
      });
    });
    return total;
  };

  const getSelectedPayments = (): { payment: PaymentItem; group: PlayerGroup }[] => {
    const selected: { payment: PaymentItem; group: PlayerGroup }[] = [];
    playerGroups.forEach(group => {
      group.payments.forEach(payment => {
        if (selectedFees.has(payment.id)) {
          selected.push({ payment, group });
        }
      });
    });
    return selected;
  };

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const handleVerifySelected = async () => {
    const selected = getSelectedPayments().filter(s => s.payment.status === 'pending');
    if (selected.length === 0) return;

    const total = selected.reduce((sum, s) => sum + s.payment.amount, 0);

    Alert.alert(
      'Verify Payments',
      `Verify ${selected.length} payment${selected.length > 1 ? 's' : ''} totaling $${total}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            setSubmitting(true);
            try {
              for (const { payment } of selected) {
                if (payment.id.startsWith('new-')) continue; // Skip unpaid fees

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
              }

              // Queue payment confirmation emails
              try {
                const orgId = profile?.current_organization_id || '';
                for (const { payment, group } of selected) {
                  if (group.parent_email) {
                    queuePaymentConfirmation(orgId, group.parent_email, '', payment.amount, payment.payment_method || 'manual', group.player_name, '');
                  }
                }
              } catch {}

              Alert.alert('Success', `${selected.length} payment${selected.length > 1 ? 's' : ''} verified!`);
              setSelectedFees(new Set());
              fetchPayments();
            } catch (error) {
              if (__DEV__) console.error('Error verifying:', error);
              Alert.alert('Error', 'Failed to verify payments');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectSelected = async () => {
    const selected = getSelectedPayments().filter(s => s.payment.status === 'pending');
    if (selected.length === 0) return;

    Alert.alert(
      'Reject Payments',
      `Reject ${selected.length} payment${selected.length > 1 ? 's' : ''}? They will need to re-submit.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              for (const { payment } of selected) {
                if (payment.id.startsWith('new-')) continue;

                const { error } = await supabase
                  .from('payments')
                  .update({
                    status: 'unpaid',
                    payment_method: null,
                    payer_name: null,
                    reported_at: null,
                  })
                  .eq('id', payment.id);

                if (error) throw error;
              }

              Alert.alert('Done', 'Payments rejected.');
              setSelectedFees(new Set());
              fetchPayments();
            } catch (error) {
              if (__DEV__) console.error('Error rejecting:', error);
              Alert.alert('Error', 'Failed to reject payments');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const openRecordModal = (payment: PaymentItem, group: PlayerGroup) => {
    setRecordingFee(payment);
    setRecordingPlayer(group);
    setRecordMethod('cash');
    setRecordNote('');
    setShowRecordModal(true);
  };

  const handleRecordPayment = async () => {
    if (!recordingFee || !recordingPlayer) return;

    setSubmitting(true);
    try {
      const isNew = recordingFee.id.startsWith('new-');

      if (isNew) {
        const { error } = await supabase
          .from('payments')
          .insert({
            player_id: recordingFee.player_id,
            season_id: recordingFee.season_id,
            fee_type: recordingFee.fee_type,
            fee_name: recordingFee.fee_name,
            amount: recordingFee.amount,
            status: 'verified',
            payment_method: recordMethod,
            payer_name: recordNote || null,
            reported_at: new Date().toISOString(),
            verified_at: new Date().toISOString(),
            verified_by: user?.id,
            paid: true,
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payments')
          .update({
            status: 'verified',
            payment_method: recordMethod,
            payer_name: recordNote || null,
            verified_at: new Date().toISOString(),
            verified_by: user?.id,
            paid: true,
          })
          .eq('id', recordingFee.id);

        if (error) throw error;
      }

      // Queue payment confirmation email
      try {
        const orgId = profile?.current_organization_id || '';
        if (recordingPlayer.parent_email) {
          queuePaymentConfirmation(orgId, recordingPlayer.parent_email, '', recordingFee.amount, recordMethod, recordingPlayer.player_name, '');
        }
      } catch {}

      Alert.alert('Recorded', `$${recordingFee.amount} payment recorded for ${recordingPlayer.player_name}.`);
      setShowRecordModal(false);
      setRecordingFee(null);
      setRecordingPlayer(null);
      fetchPayments();

    } catch (error) {
      if (__DEV__) console.error('Error recording:', error);
      Alert.alert('Error', 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySingle = (payment: PaymentItem) => {
    Alert.alert(
      'Verify Payment',
      `Verify $${payment.amount} ${payment.fee_name}?\n\n${payment.payment_method?.toUpperCase()} from ${payment.payer_name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
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

              // Queue payment confirmation email
              try {
                const orgId = profile?.current_organization_id || '';
                const group = playerGroups.find(g => g.player_id === payment.player_id);
                if (group?.parent_email) {
                  queuePaymentConfirmation(orgId, group.parent_email, '', payment.amount, payment.payment_method || 'manual', group.player_name, '');
                }
              } catch {}

              fetchPayments();
            } catch (error) {
              if (__DEV__) console.error('Error:', error);
              Alert.alert('Error', 'Failed to verify');
            }
          },
        },
      ]
    );
  };

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const getMethodColor = (method: string | null) => {
    switch (method) {
      case 'cashapp': return '#00D632';
      case 'venmo': return '#008CFF';
      case 'zelle': return '#6D1ED4';
      case 'cash': return '#22C55E';
      case 'check': return '#5856D6';
      default: return colors.textSecondary;
    }
  };

  const getMethodLabel = (method: string | null) => {
    switch (method) {
      case 'cashapp': return 'Cash App';
      case 'venmo': return 'Venmo';
      case 'zelle': return 'Zelle';
      case 'cash': return 'Cash';
      case 'check': return 'Check';
      case 'other': return 'Other';
      default: return method || 'Unknown';
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'verified': return { label: 'Paid', color: '#22C55E', icon: 'checkmark-circle' };
      case 'pending': return { label: 'Pending', color: '#E8913A', icon: 'time' };
      default: return { label: 'Due', color: '#D94F4F', icon: 'alert-circle' };
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // =============================================================================
  // RENDER
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
  const selectedCount = selectedFees.size;
  const selectedTotal = getSelectedTotal();
  const selectedPendingCount = getSelectedPayments().filter(s => s.payment.status === 'pending').length;

  const renderFamilyCard = (family: FamilyGroup) => {
    const rateColor = family.collectionRate >= 80 ? '#22C55E' : family.collectionRate >= 50 ? '#E8913A' : '#D94F4F';
    return (
      <View
        key={family.family_id || family.family_name}
        style={{
          backgroundColor: '#FFF',
          borderRadius: 16,
          marginBottom: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: family.outstanding > 0 ? '#D94F4F40' : colors.glassBorder,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                {family.family_name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                {family.players.length} player{family.players.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: rateColor }}>
                {Math.round(family.collectionRate)}%
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>collected</Text>
            </View>
          </View>

          {/* Mini progress bar */}
          <View style={{
            height: 6,
            backgroundColor: colors.border,
            borderRadius: 3,
            marginTop: 10,
            overflow: 'hidden',
          }}>
            <View style={{
              height: '100%',
              width: `${Math.min(family.collectionRate, 100)}%`,
              backgroundColor: rateColor,
              borderRadius: 3,
            }} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Paid: ${family.totalPaid}
            </Text>
            {family.outstanding > 0 && (() => {
              const now = new Date();
              const overdueCount = family.players.reduce((sum, p) =>
                sum + p.payments.filter(f => f.status === 'unpaid' && f.due_date && new Date(f.due_date) < now).length, 0);
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 12, color: '#D94F4F', fontWeight: '600' }}>
                    Outstanding: ${family.outstanding}
                  </Text>
                  {overdueCount > 0 && (
                    <View style={{ backgroundColor: '#D94F4F20', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                      <Text style={{ color: '#D94F4F', fontSize: 9, fontWeight: '700' }}>{overdueCount} OVERDUE</Text>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>

          {/* Per-player breakdown */}
          {family.players.map(player => (
            <View key={player.player_id} style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}>
              <Text style={{ fontSize: 16, marginRight: 6 }}>{player.sport_icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>{player.player_name}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {player.paidCount} paid · {player.unpaidCount + player.pendingCount} outstanding
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: player.totalDue > 0 ? '#D94F4F' : '#22C55E' }}>
                ${player.totalDue > 0 ? player.totalDue : 'Paid'}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Wrapper style={{ flex: 1, backgroundColor: colors.background }} {...wrapperProps}>
      {/* Header */}
      {!hideHeader && (
        <>
          <AdminContextBar />
          <AppHeaderBar
            title="PAYMENTS"
            showLogo={false}
            showAvatar={false}
            showNotificationBell={false}
            rightIcon={
              <TouchableOpacity
                onPress={handleGenerateMissingFees}
                disabled={generatingFees}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, gap: 4 }}
              >
                {generatingFees ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="add-circle-outline" size={14} color="#FFF" />
                )}
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>GENERATE FEES</Text>
              </TouchableOpacity>
            }
          />
        </>
      )}

      {/* Compact header when hideHeader */}
      {hideHeader && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            {workingSeason?.name || 'All Seasons'}
          </Text>
        </View>
      )}

      {/* Stats Row */}
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.screenPadding, paddingVertical: 12, gap: 10 }}>
        <StatBox value={'$' + stats.totalUnpaid} label="Unpaid" accentColor="#D94F4F" />
        <StatBox value={'$' + stats.totalPending} label="Pending" accentColor="#E8913A" />
        <StatBox value={'$' + stats.totalPaid} label="Paid" accentColor="#22C55E" />
      </View>

      {/* Tab Switcher */}
      <View style={{
        flexDirection: 'row',
        marginHorizontal: 16,
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 4,
        marginBottom: 12,
      }}>
        <TouchableOpacity
          onPress={() => { setActiveTab('verification'); setSelectedFees(new Set()); setExpandedPlayers(new Set()); }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: activeTab === 'verification' ? colors.primary : 'transparent',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{
            fontWeight: '600',
            color: activeTab === 'verification' ? '#000' : colors.text,
          }}>
            Needs Verification
          </Text>
          {stats.pendingCount > 0 && (
            <View style={{
              backgroundColor: activeTab === 'verification' ? '#00000030' : '#E8913A',
              borderRadius: 10,
              paddingHorizontal: 6,
              paddingVertical: 2,
              marginLeft: 6,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{stats.pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setActiveTab('all'); setSelectedFees(new Set()); setExpandedPlayers(new Set()); }}
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
            color: activeTab === 'all' ? '#000' : colors.text,
          }}>
            All Payments
          </Text>
        </TouchableOpacity>
      </View>

      {/* View Mode & Filters */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 8,
        gap: 8,
      }}>
        <TouchableOpacity
          onPress={() => setViewMode('player')}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: viewMode === 'player' ? colors.primary + '20' : colors.card,
            borderWidth: 1,
            borderColor: viewMode === 'player' ? colors.primary : colors.border,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: viewMode === 'player' ? colors.primary : colors.textSecondary }}>
            By Player
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('family')}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: viewMode === 'family' ? colors.primary + '20' : colors.card,
            borderWidth: 1,
            borderColor: viewMode === 'family' ? colors.primary : colors.border,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: viewMode === 'family' ? colors.primary : colors.textSecondary }}>
            By Family
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowOutstandingOnly(!showOutstandingOnly)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: showOutstandingOnly ? '#D94F4F20' : colors.card,
            borderWidth: 1,
            borderColor: showOutstandingOnly ? '#D94F4F' : colors.border,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: showOutstandingOnly ? '#D94F4F' : colors.textSecondary }}>
            Outstanding
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderRadius: 12,
          paddingHorizontal: 12,
        }}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search player or family..."
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

      {/* Player Groups List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {viewMode === 'player' ? (
          // Player view
          filteredGroups.filter(g => !showOutstandingOnly || g.totalDue > 0).length === 0 ? (
            <View style={{
              backgroundColor: '#FFF',
              borderRadius: 16,
              padding: 32,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.06)',
            }}>
              <Ionicons
                name={activeTab === 'verification' ? 'checkmark-circle' : 'receipt-outline'}
                size={48}
                color={activeTab === 'verification' ? '#22C55E' : colors.textSecondary}
              />
              <Text style={{ color: colors.text, marginTop: 12, fontSize: 16, fontWeight: '600' }}>
                {activeTab === 'verification' ? 'All Caught Up!' : 'No Payments Found'}
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13, textAlign: 'center' }}>
                {activeTab === 'verification'
                  ? 'No payments pending verification.'
                  : showOutstandingOnly
                    ? 'No players with outstanding payments.'
                    : searchQuery
                      ? 'Try a different search term.'
                      : 'No payment records yet.'}
              </Text>
            </View>
          ) : (
            filteredGroups.filter(g => !showOutstandingOnly || g.totalDue > 0).map(group => {
              const isExpanded = expandedPlayers.has(group.player_id);
              const isFullySelected = isPlayerFullySelected(group);
              const isPartiallySelected = isPlayerPartiallySelected(group);

              const relevantPayments = activeTab === 'verification'
                ? group.payments.filter(p => p.status === 'pending')
                : group.payments;

              const summaryText = activeTab === 'verification'
                ? `${group.pendingCount} pending • $${relevantPayments.reduce((s, p) => s + p.amount, 0)}`
                : `${group.unpaidCount > 0 ? `${group.unpaidCount} due` : ''}${group.unpaidCount > 0 && group.pendingCount > 0 ? ' • ' : ''}${group.pendingCount > 0 ? `${group.pendingCount} pending` : ''}${group.paidCount > 0 ? ` • ${group.paidCount} paid` : ''}`;

              return (
                <View
                  key={group.player_id}
                  style={{
                    backgroundColor: '#FFF',
                    borderRadius: 16,
                    marginBottom: 12,
                    overflow: 'hidden',
                    borderWidth: isFullySelected || isPartiallySelected ? 2 : 1,
                    borderColor: isFullySelected || isPartiallySelected ? colors.primary : colors.glassBorder,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                >
                  {/* Player Header */}
                  <TouchableOpacity
                    onPress={() => toggleExpand(group.player_id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                    }}
                  >
                    {/* Checkbox */}
                    <TouchableOpacity
                      onPress={() => togglePlayerSelection(group)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: isFullySelected ? colors.primary : colors.border,
                        backgroundColor: isFullySelected ? colors.primary : 'transparent',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}
                    >
                      {isFullySelected && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                      {isPartiallySelected && !isFullySelected && (
                        <View style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          backgroundColor: colors.primary,
                        }} />
                      )}
                    </TouchableOpacity>

                    {/* Player Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                        {group.player_name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Text style={{ fontSize: 16, marginRight: 4 }}>{group.sport_icon}</Text>
                        <Text style={{ fontSize: 13, color: group.sport_color }}>
                          {group.sport_name} • {group.season_name}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        {summaryText}
                      </Text>
                    </View>

                    {/* Expand Arrow */}
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Expanded Payment Items */}
                  {isExpanded && (
                    <View style={{
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}>
                      {relevantPayments.map((payment, idx) => {
                        const status = getStatusInfo(payment.status);
                        const isSelected = selectedFees.has(payment.id);
                        const showCheckbox = payment.status !== 'verified';

                        return (
                          <View
                            key={payment.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              padding: 14,
                              paddingLeft: 20,
                              backgroundColor: isSelected ? colors.primary + '10' : 'transparent',
                              borderBottomWidth: idx < relevantPayments.length - 1 ? 1 : 0,
                              borderBottomColor: colors.border,
                            }}
                          >
                            {/* Checkbox */}
                            {showCheckbox ? (
                              <TouchableOpacity
                                onPress={() => toggleFeeSelection(payment.id)}
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 4,
                                  borderWidth: 2,
                                  borderColor: isSelected ? colors.primary : colors.border,
                                  backgroundColor: isSelected ? colors.primary : 'transparent',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  marginRight: 12,
                                }}
                              >
                                {isSelected && (
                                  <Ionicons name="checkmark" size={14} color="#fff" />
                                )}
                              </TouchableOpacity>
                            ) : (
                              <View style={{
                                width: 22,
                                height: 22,
                                borderRadius: 4,
                                backgroundColor: '#22C55E20',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 12,
                              }}>
                                <Ionicons name="checkmark" size={14} color="#22C55E" />
                              </View>
                            )}

                            {/* Fee Info */}
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>
                                  {payment.fee_name}
                                </Text>
                                {payment.status === 'unpaid' && payment.due_date && new Date(payment.due_date) < new Date() && (
                                  <View style={{ backgroundColor: '#D94F4F20', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                    <Text style={{ color: '#D94F4F', fontSize: 9, fontWeight: '700' }}>OVERDUE</Text>
                                  </View>
                                )}
                              </View>

                              {/* Payment Method Badge (for pending) */}
                              {payment.status === 'pending' && payment.payment_method && (
                                <View style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  marginTop: 4,
                                }}>
                                  <View style={{
                                    backgroundColor: getMethodColor(payment.payment_method) + '20',
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 4,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                  }}>
                                    <View style={{
                                      width: 14,
                                      height: 14,
                                      borderRadius: 3,
                                      backgroundColor: getMethodColor(payment.payment_method),
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      marginRight: 4,
                                    }}>
                                      <Text style={{ fontSize: 8, fontWeight: '700', color: '#fff' }}>
                                        {payment.payment_method === 'venmo' ? 'V' : payment.payment_method === 'cashapp' ? '$' : 'Z'}
                                      </Text>
                                    </View>
                                    <Text style={{ fontSize: 11, fontWeight: '600', color: getMethodColor(payment.payment_method) }}>
                                      {payment.payer_name || getMethodLabel(payment.payment_method)}
                                    </Text>
                                  </View>
                                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 8 }}>
                                    {formatTime(payment.reported_at)}
                                  </Text>
                                </View>
                              )}

                              {/* Verified info */}
                              {payment.status === 'verified' && (
                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                                  {payment.payment_method ? getMethodLabel(payment.payment_method) : 'Paid'} • {formatTime(payment.verified_at)}
                                </Text>
                              )}
                            </View>

                            {/* Amount & Status */}
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                                ${payment.amount}
                              </Text>
                              <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: status.color + '20',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                                marginTop: 4,
                              }}>
                                <Ionicons name={status.icon as any} size={10} color={status.color} />
                                <Text style={{ fontSize: 10, fontWeight: '600', color: status.color, marginLeft: 3 }}>
                                  {status.label}
                                </Text>
                              </View>
                            </View>

                            {/* Quick Actions */}
                            {payment.status === 'pending' && (
                              <TouchableOpacity
                                onPress={() => handleVerifySingle(payment)}
                                style={{
                                  marginLeft: 10,
                                  padding: 6,
                                  backgroundColor: '#22C55E20',
                                  borderRadius: 6,
                                }}
                              >
                                <Ionicons name="checkmark" size={18} color="#22C55E" />
                              </TouchableOpacity>
                            )}

                            {payment.status === 'unpaid' && activeTab === 'all' && (
                              <TouchableOpacity
                                onPress={() => openRecordModal(payment, group)}
                                style={{
                                  marginLeft: 10,
                                  padding: 6,
                                  backgroundColor: colors.primary + '20',
                                  borderRadius: 6,
                                }}
                              >
                                <Ionicons name="add" size={18} color={colors.primary} />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )
        ) : (
          // Family view
          (() => {
            const filtered = familyGroups
              .filter(f => !showOutstandingOnly || f.outstanding > 0)
              .filter(f => !searchQuery.trim() || f.family_name.toLowerCase().includes(searchQuery.toLowerCase()) || f.players.some(p => p.player_name.toLowerCase().includes(searchQuery.toLowerCase())));
            return filtered.length === 0 ? (
              <View style={{
                backgroundColor: '#FFF',
                borderRadius: 16,
                padding: 32,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.06)',
              }}>
                <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                <Text style={{ color: colors.text, marginTop: 12, fontSize: 16, fontWeight: '600' }}>No Families Found</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13, textAlign: 'center' }}>
                  {showOutstandingOnly ? 'No families with outstanding payments.' : 'No family payment data.'}
                </Text>
              </View>
            ) : filtered.map(renderFamilyCard);
          })()
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      {selectedCount > 0 && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
              {selectedCount} selected
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              ${selectedTotal} total
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {selectedPendingCount > 0 && (
              <>
                <TouchableOpacity
                  onPress={handleRejectSelected}
                  disabled={submitting}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: '#D94F4F20',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#D94F4F' }}>
                    Reject
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleVerifySelected}
                  disabled={submitting}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: '#22C55E',
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                      Verify
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {/* Record Payment Modal */}
      <Modal
        visible={showRecordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRecordModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: Platform.OS === 'ios' ? 40 : 24,
          }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{
                width: 40,
                height: 4,
                backgroundColor: colors.border,
                borderRadius: 2,
                marginBottom: 16,
              }} />
              <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text }}>
                Record Payment
              </Text>
              {recordingPlayer && recordingFee && (
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                  {recordingPlayer.player_name} • {recordingFee.fee_name} • ${recordingFee.amount}
                </Text>
              )}
            </View>

            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, letterSpacing: 1 }}>
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
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: recordMethod === method ? getMethodColor(method) : colors.background,
                    borderWidth: recordMethod === method ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
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

            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, letterSpacing: 1 }}>
              NOTE (OPTIONAL)
            </Text>
            <TextInput
              value={recordNote}
              onChangeText={setRecordNote}
              placeholder="Check #, payer name, etc."
              placeholderTextColor={colors.textSecondary}
              style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                color: colors.text,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />

            <TouchableOpacity
              onPress={handleRecordPayment}
              disabled={submitting}
              style={{
                backgroundColor: '#22C55E',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                  Record as Paid
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowRecordModal(false)}
              style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Wrapper>
  );
}
