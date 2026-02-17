import { useAuth } from '@/lib/auth';
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
  player_name: string;
  season_id: string;
  season_name: string;
  sport_name: string;
  sport_icon: string;
  sport_color: string;
  fee_type: string;
  fee_name: string;
  amount: number;
  due_date: string | null;
  status: 'unpaid' | 'pending' | 'verified';
  payment_method: string | null;
  payer_name: string | null;
  reported_at: string | null;
};

type PaymentSettings = {
  cashapp_handle: string | null;
  venmo_handle: string | null;
  zelle_email: string | null;
  zelle_phone: string | null;
  instructions: string | null;
};

type PaymentMethod = 'cashapp' | 'venmo' | 'zelle';

type Props = {
  hideHeader?: boolean;
};

// =============================================================================
// DEEP LINK HELPERS
// =============================================================================

const buildCashAppLink = (handle: string, amount: number, note: string): string => {
  const cleanHandle = handle.replace(/^\$/, '');
  const encodedNote = encodeURIComponent(note);
  return `https://cash.app/$${cleanHandle}/${amount}?note=${encodedNote}`;
};

const buildVenmoLink = (handle: string, amount: number, note: string): string => {
  const cleanHandle = handle.replace(/^@/, '');
  const encodedNote = encodeURIComponent(note);
  return `venmo://paycharge?txn=pay&recipients=${cleanHandle}&amount=${amount}&note=${encodedNote}`;
};

const buildVenmoWebLink = (handle: string, amount: number, note: string): string => {
  const cleanHandle = handle.replace(/^@/, '');
  const encodedNote = encodeURIComponent(note);
  return `https://venmo.com/${cleanHandle}?txn=pay&amount=${amount}&note=${encodedNote}`;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ParentPaymentsScreen({ hideHeader = false }: Props) {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Payment flow state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [payerName, setPayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchPayments = useCallback(async () => {
    if (!user?.id) {
      console.log('DEBUG: No user ID');
      setDebugInfo('No user ID');
      setLoading(false);
      return;
    }

    try {
      const parentEmail = profile?.email || user?.email;
      console.log('DEBUG: User ID:', user.id);
      console.log('DEBUG: Parent Email:', parentEmail);
      
      let debug = `User: ${user.id}\nEmail: ${parentEmail}\n`;
      
      // Get MY player IDs only
      let myPlayerIds: string[] = [];

      // Method 1: player_guardians
      const { data: guardianLinks, error: guardianError } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);
      
      console.log('DEBUG: Guardian links:', guardianLinks, guardianError);
      debug += `Guardians: ${guardianLinks?.length || 0}\n`;
      if (guardianLinks) {
        myPlayerIds.push(...guardianLinks.map(g => g.player_id));
      }

      // Method 2: parent_account_id
      const { data: directPlayers, error: directError } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id);
      
      console.log('DEBUG: Direct players (parent_account_id):', directPlayers, directError);
      debug += `Direct (account_id): ${directPlayers?.length || 0}\n`;
      if (directPlayers) {
        myPlayerIds.push(...directPlayers.map(p => p.id));
      }

      // Method 3: parent_email
      if (parentEmail) {
        const { data: emailPlayers, error: emailError } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', parentEmail);
        
        console.log('DEBUG: Email players:', emailPlayers, emailError);
        debug += `Email match: ${emailPlayers?.length || 0}\n`;
        if (emailPlayers) {
          myPlayerIds.push(...emailPlayers.map(p => p.id));
        }
      }

      myPlayerIds = [...new Set(myPlayerIds)];
      console.log('DEBUG: All player IDs:', myPlayerIds);
      debug += `Total Players: ${myPlayerIds.length}\n`;

      if (myPlayerIds.length === 0) {
        console.log('DEBUG: No players found');
        setDebugInfo(debug + 'NO PLAYERS FOUND');
        setPayments([]);
        setLoading(false);
        return;
      }

      // Fetch MY players with season info (ALL seasons)
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, first_name, last_name, season_id')
        .in('id', myPlayerIds);

      console.log('DEBUG: Players:', players, playersError);
      debug += `Players fetched: ${players?.length || 0}\n`;

      if (!players || players.length === 0) {
        setDebugInfo(debug + 'No player data returned');
        setPayments([]);
        setLoading(false);
        return;
      }

      const seasonIds = [...new Set(players.map(p => p.season_id).filter(Boolean))];
      console.log('DEBUG: Season IDs:', seasonIds);
      debug += `Season IDs: ${seasonIds.join(', ')}\n`;

      // Fetch seasons
      const { data: seasons } = await supabase
        .from('seasons')
        .select('id, name, sport_id')
        .in('id', seasonIds);

      console.log('DEBUG: Seasons:', seasons);

      // Fetch sports
      const { data: sports } = await supabase
        .from('sports')
        .select('id, name, icon, color_primary');

      const sportsMap = new Map((sports || []).map(s => [s.id, s]));
      const seasonsMap = new Map((seasons || []).map(s => [s.id, s]));

      // Fetch season fees
      const { data: seasonFees, error: feesError } = await supabase
        .from('season_fees')
        .select('*')
        .in('season_id', seasonIds)
        .order('sort_order');

      console.log('DEBUG: Season fees:', seasonFees, feesError);
      debug += `Season fees: ${seasonFees?.length || 0}\n`;

      // Group fees by season
      const feesBySeasonMap = new Map<string, any[]>();
      (seasonFees || []).forEach(fee => {
        const existing = feesBySeasonMap.get(fee.season_id) || [];
        existing.push(fee);
        feesBySeasonMap.set(fee.season_id, existing);
      });

      // Fetch existing payment records for MY players only
      const { data: paymentRecords } = await supabase
        .from('payments')
        .select('*')
        .in('player_id', myPlayerIds);

      console.log('DEBUG: Payment records:', paymentRecords);

      // Build payment key map
      const paymentMap = new Map<string, any>();
      (paymentRecords || []).forEach(p => {
        const key = `${p.player_id}-${p.fee_type || 'registration'}`;
        paymentMap.set(key, p);
      });

      // Build payment list
      const paymentsList: PaymentItem[] = [];

      players.forEach(player => {
        const season = seasonsMap.get(player.season_id);
        if (!season) {
          console.log('DEBUG: No season for player:', player.id, player.season_id);
          return;
        }

        const sport = sportsMap.get(season.sport_id);
        const seasonFeesList = feesBySeasonMap.get(player.season_id);

        console.log('DEBUG: Processing player:', player.first_name, 'Season:', season.name, 'Fees:', seasonFeesList?.length);

        if (seasonFeesList && seasonFeesList.length > 0) {
          // Use defined season fees
          seasonFeesList.forEach(fee => {
            const existingPayment = paymentMap.get(`${player.id}-${fee.fee_type}`);
            
            paymentsList.push({
              id: existingPayment?.id || `new-${player.id}-${fee.fee_type}`,
              player_id: player.id,
              player_name: `${player.first_name} ${player.last_name}`,
              season_id: player.season_id,
              season_name: season.name,
              sport_name: sport?.name || '',
              sport_icon: sport?.icon || '🏆',
              sport_color: sport?.color_primary || '#FFD700',
              fee_type: fee.fee_type,
              fee_name: fee.fee_name,
              amount: existingPayment?.amount || fee.amount,
              due_date: fee.due_date,
              status: existingPayment?.status || 'unpaid',
              payment_method: existingPayment?.payment_method || null,
              payer_name: existingPayment?.payer_name || null,
              reported_at: existingPayment?.reported_at || null,
            });
          });
        } else {
          // No fees defined for this season
          debug += `No fees for: ${season.name}\n`;
          console.log('DEBUG: No fees for season:', player.season_id);
        }
      });

      console.log('DEBUG: Final payments list:', paymentsList.length);
      debug += `Payments built: ${paymentsList.length}`;
      setDebugInfo(debug);

      // Sort: unpaid first, then pending, then verified; then by player name
      paymentsList.sort((a, b) => {
        const statusOrder = { unpaid: 0, pending: 1, verified: 2 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        return a.player_name.localeCompare(b.player_name);
      });

      setPayments(paymentsList);

      // Fetch payment settings
      const { data: settingsData } = await supabase
        .from('payment_settings')
        .select('*')
        .single();

      setSettings(settingsData);

    } catch (error) {
      console.error('Error fetching payments:', error);
      setDebugInfo('Error: ' + JSON.stringify(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, profile?.email]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    if (profile?.full_name) {
      setPayerName(profile.full_name);
    }
  }, [profile?.full_name]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPayments();
  }, [fetchPayments]);

  // =============================================================================
  // SELECTION
  // =============================================================================

  const unpaidPayments = payments.filter(p => p.status === 'unpaid');

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
    if (selectedIds.size === unpaidPayments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unpaidPayments.map(p => p.id)));
    }
  };

  const getSelectedTotal = () => {
    return Array.from(selectedIds)
      .map(id => payments.find(p => p.id === id)?.amount || 0)
      .reduce((a, b) => a + b, 0);
  };

  const getSelectedPayments = () => {
    return payments.filter(p => selectedIds.has(p.id));
  };

  // =============================================================================
  // PAYMENT FLOW
  // =============================================================================

  const handlePaySelected = () => {
    if (selectedIds.size === 0) {
      Alert.alert('No Selection', 'Please select items to pay.');
      return;
    }
    setShowPaymentModal(true);
  };

  const handleMethodSelect = async (method: PaymentMethod) => {
    if (!settings) return;

    const selectedPayments = getSelectedPayments();
    const totalAmount = getSelectedTotal();
    
    // Build note with all selected items
    const itemsList = selectedPayments.map(p => 
      `${p.player_name} - ${p.fee_name}`
    ).join(', ');
    
    const note = `Black Hornets: ${itemsList}`;

    setSelectedMethod(method);

    let url = '';

    if (method === 'cashapp' && settings.cashapp_handle) {
      url = buildCashAppLink(settings.cashapp_handle, totalAmount, note);
    } else if (method === 'venmo' && settings.venmo_handle) {
      url = buildVenmoLink(settings.venmo_handle, totalAmount, note);
    } else if (method === 'zelle') {
      Alert.alert(
        'Pay with Zelle',
        `Send $${totalAmount} to:\n\n${settings.zelle_email || settings.zelle_phone}\n\nInclude in memo:\n"${note}"`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Zelle', 
            onPress: () => {
              Linking.openURL('zelle://').catch(() => {
                Alert.alert('Open your bank app to send via Zelle');
              });
              setTimeout(() => {
                setShowPaymentModal(false);
                setShowConfirmModal(true);
              }, 1000);
            }
          },
        ]
      );
      return;
    }

    if (url) {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else if (method === 'venmo' && settings.venmo_handle) {
          await Linking.openURL(buildVenmoWebLink(settings.venmo_handle, totalAmount, note));
        } else {
          Alert.alert('App Not Found', `Please install ${method === 'cashapp' ? 'Cash App' : 'Venmo'} to use this payment method.`);
          return;
        }
        
        setTimeout(() => {
          setShowPaymentModal(false);
          setShowConfirmModal(true);
        }, 1000);
      } catch (error) {
        console.error('Error opening payment app:', error);
        Alert.alert('Error', 'Could not open payment app');
      }
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod || !payerName.trim()) {
      Alert.alert('Error', 'Please enter the name on your payment account');
      return;
    }

    setSubmitting(true);

    try {
      const selectedPayments = getSelectedPayments();
      
      for (const payment of selectedPayments) {
        const isNew = payment.id.startsWith('new-');

        if (isNew) {
          const { error } = await supabase
            .from('payments')
            .insert({
              player_id: payment.player_id,
              season_id: payment.season_id,
              fee_type: payment.fee_type,
              fee_name: payment.fee_name,
              amount: payment.amount,
              status: 'pending',
              payment_method: selectedMethod,
              payer_name: payerName.trim(),
              reported_at: new Date().toISOString(),
              paid: false,
            });

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('payments')
            .update({
              status: 'pending',
              payment_method: selectedMethod,
              payer_name: payerName.trim(),
              reported_at: new Date().toISOString(),
            })
            .eq('id', payment.id);

          if (error) throw error;
        }
      }

      Alert.alert(
        'Payment Reported! 🎉',
        `Your payment of $${getSelectedTotal()} has been reported and is pending verification.`,
        [{ text: 'OK' }]
      );

      setShowConfirmModal(false);
      setSelectedIds(new Set());
      setSelectedMethod(null);
      fetchPayments();

    } catch (error) {
      console.error('Error reporting payment:', error);
      Alert.alert('Error', 'Failed to report payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return { label: 'Paid', color: '#34C759', icon: 'checkmark-circle' };
      case 'pending':
        return { label: 'Pending', color: '#FF9500', icon: 'time' };
      default:
        return { label: 'Due', color: '#FF3B30', icon: 'alert-circle' };
    }
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'Overdue', color: '#FF3B30' };
    if (diffDays === 0) return { text: 'Due today', color: '#FF9500' };
    if (diffDays <= 7) return { text: `Due in ${diffDays}d`, color: '#FF9500' };
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: colors.textSecondary };
  };

  const totalDue = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  // Group payments by player
  const paymentsByPlayer = new Map<string, PaymentItem[]>();
  payments.forEach(p => {
    const key = `${p.player_id}-${p.season_id}`;
    const existing = paymentsByPlayer.get(key) || [];
    existing.push(p);
    paymentsByPlayer.set(key, existing);
  });

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    const LoadingWrapper = hideHeader ? View : SafeAreaView;
    return (
      <LoadingWrapper style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </LoadingWrapper>
    );
  }

  const Wrapper = hideHeader ? View : SafeAreaView;

  return (
    <Wrapper style={{ flex: 1, backgroundColor: colors.background }}>
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
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
            Payments
          </Text>
          <View style={{ width: 24 }} />
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Debug removed */}

        {/* Summary Card */}
        <View style={{
          backgroundColor: colors.glassCard,
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 6,
        }}>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
            Total Balance Due
          </Text>
          <Text style={{ fontSize: 36, fontWeight: '800', color: totalDue > 0 ? '#FF3B30' : colors.success }}>
            ${totalDue}
          </Text>
          {totalPending > 0 && (
            <Text style={{ fontSize: 13, color: '#FF9500', marginTop: 8 }}>
              ${totalPending} pending verification
            </Text>
          )}
          {payments.filter(p => p.status === 'verified').length > 0 && (
            <Text style={{ fontSize: 13, color: colors.success, marginTop: 4 }}>
              ${payments.filter(p => p.status === 'verified').reduce((s, p) => s + p.amount, 0)} paid
            </Text>
          )}
        </View>

        {/* Instructions */}
        {settings?.instructions && (
          <View style={{
            backgroundColor: colors.primary + '15',
            borderRadius: 12,
            padding: 14,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}>
            <Ionicons name="information-circle" size={20} color={colors.primary} style={{ marginRight: 10, marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 13, color: colors.text, lineHeight: 20 }}>
              {settings.instructions}
            </Text>
          </View>
        )}

        {/* Select All (if unpaid items exist) */}
        {unpaidPayments.length > 0 && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
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
                borderColor: selectedIds.size === unpaidPayments.length ? colors.primary : colors.border,
                backgroundColor: selectedIds.size === unpaidPayments.length ? colors.primary : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}>
                {selectedIds.size === unpaidPayments.length && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>
                {selectedIds.size === unpaidPayments.length ? 'Deselect All' : 'Pay Full Balance'}
              </Text>
            </TouchableOpacity>
            
            {selectedIds.size > 0 && (
              <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>
                {selectedIds.size} selected (${getSelectedTotal()})
              </Text>
            )}
          </View>
        )}

        {/* Payments List */}
        {payments.length === 0 ? (
          <View style={{
            backgroundColor: colors.glassCard,
            borderRadius: 16,
            padding: 32,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.glassBorder,
          }}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={{ color: colors.text, marginTop: 12, fontSize: 16, fontWeight: '600' }}>
              All Caught Up!
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>
              No payments due at this time.
            </Text>
          </View>
        ) : (
          Array.from(paymentsByPlayer.entries()).map(([key, playerPayments]) => {
            const firstPayment = playerPayments[0];
            
            return (
              <View
                key={key}
                style={{
                  backgroundColor: colors.glassCard,
                  borderRadius: 16,
                  marginBottom: 16,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: colors.glassBorder,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                {/* Player Header */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: firstPayment.sport_color + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <Text style={{ fontSize: 20 }}>{firstPayment.sport_icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                      {firstPayment.player_name}
                    </Text>
                    <Text style={{ fontSize: 13, color: firstPayment.sport_color }}>
                      {firstPayment.sport_name} • {firstPayment.season_name}
                    </Text>
                  </View>
                </View>

                {/* Payment Items */}
                {playerPayments.map((payment, index) => {
                  const status = getStatusBadge(payment.status);
                  const dueInfo = formatDueDate(payment.due_date);
                  const isSelected = selectedIds.has(payment.id);
                  const isUnpaid = payment.status === 'unpaid';

                  return (
                    <TouchableOpacity
                      key={payment.id}
                      onPress={() => isUnpaid && toggleSelection(payment.id)}
                      disabled={!isUnpaid}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 14,
                        backgroundColor: isSelected ? colors.primary + '10' : 'transparent',
                        borderBottomWidth: index < playerPayments.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      }}
                    >
                      {/* Checkbox (only for unpaid) */}
                      {isUnpaid ? (
                        <View style={{
                          width: 22,
                          height: 22,
                          borderRadius: 4,
                          borderWidth: 2,
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 12,
                        }}>
                          {isSelected && (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          )}
                        </View>
                      ) : (
                        <View style={{ width: 34 }} />
                      )}

                      {/* Item Info */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>
                          {payment.fee_name}
                        </Text>
                        {dueInfo && payment.status === 'unpaid' && (
                          <Text style={{ fontSize: 12, color: dueInfo.color, marginTop: 2 }}>
                            {dueInfo.text}
                          </Text>
                        )}
                        {payment.status === 'pending' && (
                          <Text style={{ fontSize: 12, color: '#FF9500', marginTop: 2 }}>
                            Awaiting verification
                          </Text>
                        )}
                        {payment.status === 'verified' && (
                          <View style={{ marginTop: 2 }}>
                            <Text style={{ fontSize: 12, color: colors.success }}>
                              Paid{payment.payment_method ? ` via ${payment.payment_method}` : ''}
                              {payment.reported_at ? ` on ${new Date(payment.reported_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                            </Text>
                            {payment.payer_name && (
                              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                By: {payment.payer_name}
                              </Text>
                            )}
                          </View>
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
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 4,
                          marginTop: 4,
                        }}>
                          <Ionicons name={status.icon as any} size={10} color={status.color} />
                          <Text style={{ fontSize: 10, fontWeight: '600', color: status.color, marginLeft: 4 }}>
                            {status.label}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Pay Button (sticky at bottom) */}
      {selectedIds.size > 0 && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
          <TouchableOpacity
            onPress={handlePaySelected}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="card" size={20} color="#000" />
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#000', marginLeft: 8 }}>
              Pay ${getSelectedTotal()} ({selectedIds.size} item{selectedIds.size > 1 ? 's' : ''})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Payment Method Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: colors.bgSecondary,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: Platform.OS === 'ios' ? 40 : 24,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: colors.glassBorder,
          }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{
                width: 40,
                height: 4,
                backgroundColor: colors.border,
                borderRadius: 2,
                marginBottom: 16,
              }} />
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
                Pay ${getSelectedTotal()}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
                {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
              </Text>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              Select Payment Method
            </Text>

            {settings?.cashapp_handle && (
              <TouchableOpacity
                onPress={() => handleMethodSelect('cashapp')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#00D632',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 10,
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: '#fff',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 14,
                }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#00D632' }}>$</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Cash App</Text>
                  <Text style={{ fontSize: 13, color: '#ffffffcc' }}>{settings.cashapp_handle}</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            )}

            {settings?.venmo_handle && (
              <TouchableOpacity
                onPress={() => handleMethodSelect('venmo')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#008CFF',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 10,
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: '#fff',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 14,
                }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#008CFF' }}>V</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Venmo</Text>
                  <Text style={{ fontSize: 13, color: '#ffffffcc' }}>{settings.venmo_handle}</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            )}

            {(settings?.zelle_email || settings?.zelle_phone) && (
              <TouchableOpacity
                onPress={() => handleMethodSelect('zelle')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#6D1ED4',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 10,
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: '#fff',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 14,
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#6D1ED4' }}>Z</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Zelle</Text>
                  <Text style={{ fontSize: 13, color: '#ffffffcc' }}>{settings.zelle_email || settings.zelle_phone}</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setShowPaymentModal(false)}
              style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                marginTop: 10,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
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
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: colors.success + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <Ionicons name="checkmark" size={32} color={colors.success} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text }}>
                Did you complete the payment?
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                Enter the name on your payment account to help us verify.
              </Text>
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
              Name on Payment Account
            </Text>
            <TextInput
              value={payerName}
              onChangeText={setPayerName}
              placeholder="e.g. John Smith"
              placeholderTextColor={colors.textSecondary}
              style={{
                backgroundColor: colors.background,
                borderRadius: 10,
                padding: 14,
                fontSize: 16,
                color: colors.text,
                marginBottom: 20,
              }}
            />

            <TouchableOpacity
              onPress={handleConfirmPayment}
              disabled={submitting || !payerName.trim()}
              style={{
                backgroundColor: payerName.trim() ? colors.success : colors.border,
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
                  Yes, I Completed Payment
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowConfirmModal(false);
                setSelectedMethod(null);
              }}
              style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                No, Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Wrapper>
  );
}
