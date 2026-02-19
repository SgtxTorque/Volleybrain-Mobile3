import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Linking,
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

type PaymentMethod = 'card' | 'cashapp' | 'venmo' | 'zelle';

type Props = {
  hideHeader?: boolean;
};

// =============================================================================
// DEEP LINK HELPERS
// =============================================================================

const buildCashAppDeepLink = (handle: string, amount: number, note: string): string => {
  const cleanHandle = handle.replace(/^\$/, '');
  const encodedNote = encodeURIComponent(note);
  return `cashapp://pay/$${cleanHandle}/${amount}?note=${encodedNote}`;
};

const buildCashAppWebLink = (handle: string, amount: number, note: string): string => {
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
// SKELETON LOADING
// =============================================================================

function SkeletonCard({ colors }: { colors: any }) {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[{
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      marginBottom: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.glassBorder,
    }, { opacity: pulseAnim }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.glassBorder }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border + '40' }} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ width: '60%', height: 14, borderRadius: 4, backgroundColor: colors.border + '40', marginBottom: 6 }} />
          <View style={{ width: '40%', height: 11, borderRadius: 4, backgroundColor: colors.border + '30' }} />
        </View>
      </View>
      {[1, 2].map(i => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: i === 1 ? 1 : 0, borderBottomColor: colors.glassBorder }}>
          <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: colors.border + '30', marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <View style={{ width: '50%', height: 13, borderRadius: 4, backgroundColor: colors.border + '30', marginBottom: 4 }} />
            <View style={{ width: '30%', height: 10, borderRadius: 4, backgroundColor: colors.border + '20' }} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ width: 60, height: 14, borderRadius: 4, backgroundColor: colors.border + '30', marginBottom: 4 }} />
            <View style={{ width: 40, height: 16, borderRadius: 4, backgroundColor: colors.border + '20' }} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ParentPaymentsScreen({ hideHeader = false }: Props) {
  const { colors } = useTheme();
  const { user, profile, organization } = useAuth();
  const router = useRouter();

  const s = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Payment flow state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [payerName, setPayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);

  // Stripe availability
  const stripeEnabled = !!organization?.stripe_enabled;

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchPayments = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const parentEmail = profile?.email || user?.email;

      // Get MY player IDs only
      let myPlayerIds: string[] = [];

      // Method 1: player_guardians
      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);

      if (guardianLinks) {
        myPlayerIds.push(...guardianLinks.map(g => g.player_id));
      }

      // Method 2: parent_account_id
      const { data: directPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id);

      if (directPlayers) {
        myPlayerIds.push(...directPlayers.map(p => p.id));
      }

      // Method 3: parent_email
      if (parentEmail) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', parentEmail);

        if (emailPlayers) {
          myPlayerIds.push(...emailPlayers.map(p => p.id));
        }
      }

      myPlayerIds = [...new Set(myPlayerIds)];

      if (myPlayerIds.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }

      // Fetch MY players with season info
      const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name, season_id')
        .in('id', myPlayerIds);

      if (!players || players.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }

      const seasonIds = [...new Set(players.map(p => p.season_id).filter(Boolean))];

      // Fetch seasons
      const { data: seasons } = await supabase
        .from('seasons')
        .select('id, name, sport_id')
        .in('id', seasonIds);

      // Fetch sports
      const { data: sports } = await supabase
        .from('sports')
        .select('id, name, icon, color_primary');

      const sportsMap = new Map((sports || []).map(sp => [sp.id, sp]));
      const seasonsMap = new Map((seasons || []).map(sn => [sn.id, sn]));

      // Fetch season fees
      const { data: seasonFees } = await supabase
        .from('season_fees')
        .select('*')
        .in('season_id', seasonIds)
        .order('sort_order');

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
        if (!season) return;

        const sport = sportsMap.get(season.sport_id);
        const seasonFeesList = feesBySeasonMap.get(player.season_id);

        if (seasonFeesList && seasonFeesList.length > 0) {
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
        }
      });

      // Sort: unpaid first, then pending, then verified; then by player name
      paymentsList.sort((a, b) => {
        const statusOrder = { unpaid: 0, pending: 1, verified: 2 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        return a.player_name.localeCompare(b.player_name);
      });

      setPayments(paymentsList);

      // Fetch payment settings — merge with organization fallbacks
      const { data: settingsData } = await supabase
        .from('payment_settings')
        .select('*')
        .single();

      const mergedSettings: PaymentSettings = {
        cashapp_handle: settingsData?.cashapp_handle || (organization as any)?.payment_cashapp || null,
        venmo_handle: settingsData?.venmo_handle || (organization as any)?.payment_venmo || null,
        zelle_email: settingsData?.zelle_email || (organization as any)?.payment_zelle || null,
        zelle_phone: settingsData?.zelle_phone || null,
        instructions: settingsData?.instructions || (organization as any)?.payment_instructions || null,
      };

      setSettings(mergedSettings);

    } catch (error) {
      if (__DEV__) console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, profile?.email, organization]);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPaymentModal(true);
  };

  // =============================================================================
  // STRIPE CHECKOUT
  // =============================================================================

  const createMobileCheckoutSession = async () => {
    const selectedPayments = getSelectedPayments();
    const totalAmount = getSelectedTotal();
    const parentEmail = profile?.email || user?.email || '';
    const parentName = profile?.full_name || payerName || 'Parent';

    const itemsList = selectedPayments.map(p =>
      `${p.player_name} - ${p.fee_name}`
    ).join(', ');

    const description = `${organization?.name || 'VolleyBrain'}: ${itemsList}`;

    // Get payment IDs (filter out placeholder new- IDs)
    const paymentIds = selectedPayments
      .filter(p => !p.id.startsWith('new-'))
      .map(p => p.id);

    setCheckoutProcessing(true);

    try {
      // Stripe expects amount in cents, not dollars
      const amountInCents = Math.round(totalAmount * 100);

      const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
        body: {
          payment_ids: paymentIds,
          amount: amountInCents,
          customer_email: parentEmail,
          customer_name: parentName,
          description,
          success_url: 'volleybrain://payment-success',
          cancel_url: 'volleybrain://payment-cancel',
          metadata: {
            source: 'mobile',
            organization_id: organization?.id || '',
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Do NOT mark payments as pending here — Stripe webhook will
        // update status to 'verified' automatically on successful payment.
        // If the user cancels, nothing changes.

        const result = await WebBrowser.openBrowserAsync(data.url, {
          dismissButtonStyle: 'cancel',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });

        setShowPaymentModal(false);

        if (result.type === 'cancel' || result.type === 'dismiss') {
          Alert.alert(
            'Checkout Closed',
            'If you completed payment, it will be verified automatically. Otherwise, no changes were made — you can try again anytime.',
            [{ text: 'OK' }]
          );
        }

        // Refresh to pick up any webhook-driven status changes
        fetchPayments();
        setSelectedIds(new Set());
        setSelectedMethod(null);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      if (__DEV__) console.error('Stripe checkout error:', err);
      Alert.alert(
        'Payment Error',
        err?.message || 'Failed to create checkout session. Please try another payment method.'
      );
    } finally {
      setCheckoutProcessing(false);
    }
  };

  // =============================================================================
  // MARK PAYMENTS PENDING HELPER
  // =============================================================================

  const markPaymentsPending = async (method: PaymentMethod) => {
    const selectedPayments = getSelectedPayments();
    const name = payerName.trim() || profile?.full_name || '';

    for (const payment of selectedPayments) {
      const isNew = payment.id.startsWith('new-');

      if (isNew) {
        await supabase
          .from('payments')
          .insert({
            player_id: payment.player_id,
            season_id: payment.season_id,
            fee_type: payment.fee_type,
            fee_name: payment.fee_name,
            amount: payment.amount,
            status: 'pending',
            payment_method: method,
            payer_name: name,
            reported_at: new Date().toISOString(),
            paid: false,
          });
      } else {
        await supabase
          .from('payments')
          .update({
            status: 'pending',
            payment_method: method,
            payer_name: name,
            reported_at: new Date().toISOString(),
          })
          .eq('id', payment.id);
      }
    }
  };

  // =============================================================================
  // PAYMENT METHOD SELECTION
  // =============================================================================

  const handleMethodSelect = async (method: PaymentMethod) => {
    if (!settings && method !== 'card') return;

    const selectedPayments = getSelectedPayments();
    const totalAmount = getSelectedTotal();

    const itemsList = selectedPayments.map(p =>
      `${p.player_name} - ${p.fee_name}`
    ).join(', ');

    const note = `${organization?.name || 'Payment'}: ${itemsList}`;

    setSelectedMethod(method);

    // --- Stripe Card ---
    if (method === 'card') {
      await createMobileCheckoutSession();
      return;
    }

    // --- CashApp ---
    if (method === 'cashapp' && settings?.cashapp_handle) {
      try {
        const deepLink = buildCashAppDeepLink(settings.cashapp_handle, totalAmount, note);
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
          await Linking.openURL(deepLink);
        } else {
          await Linking.openURL(buildCashAppWebLink(settings.cashapp_handle, totalAmount, note));
        }
        setTimeout(() => {
          setShowPaymentModal(false);
          setShowConfirmModal(true);
        }, 1000);
      } catch (error) {
        if (__DEV__) console.error('Error opening Cash App:', error);
        try {
          await Linking.openURL(buildCashAppWebLink(settings.cashapp_handle, totalAmount, note));
          setTimeout(() => {
            setShowPaymentModal(false);
            setShowConfirmModal(true);
          }, 1000);
        } catch {
          Alert.alert('Error', 'Could not open Cash App. Please install it or try another method.');
        }
      }
      return;
    }

    // --- Venmo ---
    if (method === 'venmo' && settings?.venmo_handle) {
      try {
        const deepLink = buildVenmoLink(settings.venmo_handle, totalAmount, note);
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
          await Linking.openURL(deepLink);
        } else {
          await Linking.openURL(buildVenmoWebLink(settings.venmo_handle, totalAmount, note));
        }
        setTimeout(() => {
          setShowPaymentModal(false);
          setShowConfirmModal(true);
        }, 1000);
      } catch (error) {
        if (__DEV__) console.error('Error opening Venmo:', error);
        try {
          await Linking.openURL(buildVenmoWebLink(settings.venmo_handle, totalAmount, note));
          setTimeout(() => {
            setShowPaymentModal(false);
            setShowConfirmModal(true);
          }, 1000);
        } catch {
          Alert.alert('Error', 'Could not open Venmo. Please install it or try another method.');
        }
      }
      return;
    }

    // --- Zelle ---
    if (method === 'zelle') {
      const zelleRecipient = settings?.zelle_email || settings?.zelle_phone || '';
      Alert.alert(
        'Pay with Zelle',
        `Send $${Number(totalAmount).toFixed(2)} to:\n\n${zelleRecipient}\n\nInclude in memo:\n"${note}"\n\nPlease open your bank app and send the payment manually.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'I Sent Payment',
            onPress: () => {
              setShowPaymentModal(false);
              setShowConfirmModal(true);
            },
          },
        ]
      );
      return;
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod || !payerName.trim()) {
      Alert.alert('Error', 'Please enter the name on your payment account');
      return;
    }

    setSubmitting(true);

    try {
      await markPaymentsPending(selectedMethod);

      setShowConfirmModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPaymentSuccess(true);

    } catch (error) {
      if (__DEV__) console.error('Error reporting payment:', error);
      Alert.alert('Error', 'Failed to report payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismissSuccess = () => {
    setShowPaymentSuccess(false);
    setSelectedIds(new Set());
    setSelectedMethod(null);
    fetchPayments();
  };

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return { label: 'Paid', color: '#34C759', icon: 'checkmark-circle' as const };
      case 'pending':
        return { label: 'Pending', color: '#FF9500', icon: 'time' as const };
      default:
        return { label: 'Due', color: '#FF3B30', icon: 'alert-circle' as const };
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
  const totalVerified = payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);

  // Group payments by player
  const paymentsByPlayer = new Map<string, PaymentItem[]>();
  payments.forEach(p => {
    const key = `${p.player_id}-${p.season_id}`;
    const existing = paymentsByPlayer.get(key) || [];
    existing.push(p);
    paymentsByPlayer.set(key, existing);
  });

  // Check if any payment methods are available
  const hasAnyPaymentMethod = stripeEnabled || settings?.cashapp_handle || settings?.venmo_handle || settings?.zelle_email || settings?.zelle_phone;

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    const LoadingWrapper = hideHeader ? View : SafeAreaView;
    return (
      <LoadingWrapper style={s.container}>
        {!hideHeader && (
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Payments</Text>
            <View style={s.backBtn} />
          </View>
        )}
        <View style={s.scrollContent}>
          {/* Summary skeleton */}
          <Animated.View style={[s.summaryCard, { opacity: 0.5 }]}>
            <View style={{ width: '50%', height: 12, borderRadius: 4, backgroundColor: colors.border + '40', marginBottom: 8 }} />
            <View style={{ width: '40%', height: 28, borderRadius: 4, backgroundColor: colors.border + '40' }} />
          </Animated.View>
          <SkeletonCard colors={colors} />
          <SkeletonCard colors={colors} />
          <SkeletonCard colors={colors} />
        </View>
      </LoadingWrapper>
    );
  }

  const Wrapper = hideHeader ? View : SafeAreaView;

  return (
    <Wrapper style={s.container}>
      {/* Header */}
      {!hideHeader && (
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Payments</Text>
          <View style={s.backBtn} />
        </View>
      )}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>
            {totalDue > 0 ? 'TOTAL BALANCE DUE' : 'ALL CAUGHT UP'}
          </Text>
          <Text style={[s.summaryAmount, { color: totalDue > 0 ? '#FF3B30' : colors.success }]}>
            ${Number(totalDue).toFixed(2)}
          </Text>
          {totalPending > 0 && (
            <View style={s.summaryPendingRow}>
              <Ionicons name="time" size={14} color="#FF9500" />
              <Text style={s.summaryPendingText}>
                ${Number(totalPending).toFixed(2)} pending verification
              </Text>
            </View>
          )}
          {totalVerified > 0 && (
            <View style={s.summaryPaidRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[s.summaryPaidText, { color: colors.success }]}>
                ${Number(totalVerified).toFixed(2)} paid
              </Text>
            </View>
          )}
        </View>

        {/* Payment Instructions */}
        {settings?.instructions && (
          <View style={s.instructionsCard}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={s.instructionsText}>{settings.instructions}</Text>
          </View>
        )}

        {/* Select All (if unpaid items exist) */}
        {unpaidPayments.length > 0 && (
          <View style={s.selectAllRow}>
            <TouchableOpacity onPress={selectAll} style={s.selectAllBtn}>
              <View style={[
                s.checkbox,
                {
                  borderColor: selectedIds.size === unpaidPayments.length ? colors.primary : colors.border,
                  backgroundColor: selectedIds.size === unpaidPayments.length ? colors.primary : 'transparent',
                },
              ]}>
                {selectedIds.size === unpaidPayments.length && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Text style={s.selectAllText}>
                {selectedIds.size === unpaidPayments.length ? 'Deselect All' : 'Pay Full Balance'}
              </Text>
            </TouchableOpacity>

            {selectedIds.size > 0 && (
              <Text style={[s.selectedCount, { color: colors.primary }]}>
                {selectedIds.size} selected (${Number(getSelectedTotal()).toFixed(2)})
              </Text>
            )}
          </View>
        )}

        {/* Payments List */}
        {payments.length === 0 ? (
          <View style={s.emptyState}>
            <View style={[s.emptyIconWrap, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <Text style={s.emptyTitle}>All Caught Up!</Text>
            <Text style={s.emptySubtitle}>No payments due at this time.</Text>
          </View>
        ) : (
          Array.from(paymentsByPlayer.entries()).map(([key, playerPayments]) => {
            const firstPayment = playerPayments[0];

            return (
              <View key={key} style={s.playerCard}>
                {/* Player Header */}
                <View style={s.playerHeader}>
                  <View style={[s.playerAvatar, { backgroundColor: firstPayment.sport_color + '20' }]}>
                    <Text style={s.playerAvatarEmoji}>{firstPayment.sport_icon}</Text>
                  </View>
                  <View style={s.playerInfo}>
                    <Text style={s.playerName}>{firstPayment.player_name}</Text>
                    <Text style={[s.playerSeason, { color: firstPayment.sport_color }]}>
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
                      activeOpacity={isUnpaid ? 0.7 : 1}
                      style={[
                        s.paymentRow,
                        isSelected && { backgroundColor: colors.primary + '10' },
                        index < playerPayments.length - 1 && s.paymentRowBorder,
                      ]}
                    >
                      {/* Checkbox (only for unpaid) */}
                      {isUnpaid ? (
                        <View style={[
                          s.checkbox,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                          },
                        ]}>
                          {isSelected && (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          )}
                        </View>
                      ) : (
                        <View style={s.checkboxSpacer}>
                          <Ionicons
                            name={payment.status === 'verified' ? 'lock-closed' : 'time-outline'}
                            size={14}
                            color={colors.textMuted}
                          />
                        </View>
                      )}

                      {/* Item Info */}
                      <View style={s.paymentItemInfo}>
                        <Text style={s.paymentFeeName}>{payment.fee_name}</Text>
                        {dueInfo && payment.status === 'unpaid' && (
                          <Text style={[s.paymentDueText, { color: dueInfo.color }]}>
                            {dueInfo.text}
                          </Text>
                        )}
                        {payment.status === 'pending' && (
                          <View style={s.statusDetailRow}>
                            <Ionicons name="time-outline" size={11} color="#FF9500" />
                            <Text style={s.statusDetailText}>
                              Reported{payment.reported_at ? ` ${new Date(payment.reported_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''} • Awaiting verification
                            </Text>
                          </View>
                        )}
                        {payment.status === 'verified' && (
                          <View style={s.statusDetailRow}>
                            <Ionicons name="checkmark-circle" size={11} color={colors.success} />
                            <Text style={[s.statusDetailText, { color: colors.success }]}>
                              Verified{payment.payment_method ? ` via ${payment.payment_method}` : ''}
                              {payment.reported_at ? ` on ${new Date(payment.reported_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Amount & Status */}
                      <View style={s.paymentRight}>
                        <Text style={s.paymentAmount}>${Number(payment.amount).toFixed(2)}</Text>
                        <View style={[s.statusBadge, { backgroundColor: status.color + '20' }]}>
                          <Ionicons name={status.icon} size={10} color={status.color} />
                          <Text style={[s.statusBadgeText, { color: status.color }]}>
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

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Pay Button (sticky at bottom) */}
      {selectedIds.size > 0 && (
        <View style={s.stickyPayBar}>
          <TouchableOpacity onPress={handlePaySelected} style={s.payButton} activeOpacity={0.8}>
            <Ionicons name="card" size={20} color="#000" />
            <Text style={s.payButtonText}>
              Pay ${Number(getSelectedTotal()).toFixed(2)} ({selectedIds.size} item{selectedIds.size > 1 ? 's' : ''})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ================================================================= */}
      {/* Payment Method Modal                                              */}
      {/* ================================================================= */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />

            <Text style={s.modalTitle}>
              Pay ${Number(getSelectedTotal()).toFixed(2)}
            </Text>
            <Text style={s.modalSubtitle}>
              {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
            </Text>

            <Text style={s.modalSectionLabel}>Select Payment Method</Text>

            {/* Pay with Card (Stripe) — only if enabled */}
            {stripeEnabled && (
              <TouchableOpacity
                onPress={() => handleMethodSelect('card')}
                disabled={checkoutProcessing}
                style={[s.methodBtn, { backgroundColor: '#635BFF', opacity: checkoutProcessing ? 0.7 : 1 }]}
                activeOpacity={0.8}
              >
                <View style={[s.methodIcon, { backgroundColor: '#fff' }]}>
                  {checkoutProcessing ? (
                    <ActivityIndicator size="small" color="#635BFF" />
                  ) : (
                    <Ionicons name="card" size={22} color="#635BFF" />
                  )}
                </View>
                <View style={s.methodInfo}>
                  <Text style={s.methodName}>
                    {checkoutProcessing ? 'Processing...' : 'Pay with Card'}
                  </Text>
                  <Text style={s.methodDetail}>Credit or debit • Auto-verified</Text>
                </View>
                {!checkoutProcessing && (
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            )}

            {settings?.cashapp_handle && (
              <TouchableOpacity
                onPress={() => handleMethodSelect('cashapp')}
                style={[s.methodBtn, { backgroundColor: '#00D632' }]}
                activeOpacity={0.8}
              >
                <View style={[s.methodIcon, { backgroundColor: '#fff' }]}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#00D632' }}>$</Text>
                </View>
                <View style={s.methodInfo}>
                  <Text style={s.methodName}>Cash App</Text>
                  <Text style={s.methodDetail}>{settings.cashapp_handle} • Admin verifies</Text>
                </View>
                <Ionicons name="open-outline" size={18} color="#fff" />
              </TouchableOpacity>
            )}

            {settings?.venmo_handle && (
              <TouchableOpacity
                onPress={() => handleMethodSelect('venmo')}
                style={[s.methodBtn, { backgroundColor: '#008CFF' }]}
                activeOpacity={0.8}
              >
                <View style={[s.methodIcon, { backgroundColor: '#fff' }]}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#008CFF' }}>V</Text>
                </View>
                <View style={s.methodInfo}>
                  <Text style={s.methodName}>Venmo</Text>
                  <Text style={s.methodDetail}>{settings.venmo_handle} • Admin verifies</Text>
                </View>
                <Ionicons name="open-outline" size={18} color="#fff" />
              </TouchableOpacity>
            )}

            {(settings?.zelle_email || settings?.zelle_phone) && (
              <TouchableOpacity
                onPress={() => handleMethodSelect('zelle')}
                style={[s.methodBtn, { backgroundColor: '#6D1ED4' }]}
                activeOpacity={0.8}
              >
                <View style={[s.methodIcon, { backgroundColor: '#fff' }]}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#6D1ED4' }}>Z</Text>
                </View>
                <View style={s.methodInfo}>
                  <Text style={s.methodName}>Zelle</Text>
                  <Text style={s.methodDetail}>
                    {settings.zelle_email || settings.zelle_phone} • Admin verifies
                  </Text>
                </View>
                <Ionicons name="information-circle-outline" size={18} color="#fff" />
              </TouchableOpacity>
            )}

            {!hasAnyPaymentMethod && (
              <View style={s.noMethodsCard}>
                <Ionicons name="alert-circle-outline" size={24} color={colors.textMuted} />
                <Text style={s.noMethodsText}>
                  No payment methods configured. Please contact your coach.
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setShowPaymentModal(false)}
              style={s.modalCancelBtn}
              activeOpacity={0.7}
            >
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* Confirmation Modal                                                */}
      {/* ================================================================= */}
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />

            <View style={[s.confirmIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark" size={32} color={colors.success} />
            </View>
            <Text style={s.confirmTitle}>Did you complete the payment?</Text>
            <Text style={s.confirmSubtitle}>
              Enter the name on your payment account to help us verify.
            </Text>

            <Text style={s.inputLabel}>Name on Payment Account</Text>
            <TextInput
              value={payerName}
              onChangeText={setPayerName}
              placeholder="e.g. John Smith"
              placeholderTextColor={colors.textSecondary}
              style={s.textInput}
            />

            <TouchableOpacity
              onPress={handleConfirmPayment}
              disabled={submitting || !payerName.trim()}
              style={[s.confirmBtn, { backgroundColor: payerName.trim() ? colors.success : colors.border }]}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.confirmBtnText}>Yes, I Completed Payment</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowConfirmModal(false);
                setSelectedMethod(null);
              }}
              style={s.modalCancelBtn}
              activeOpacity={0.7}
            >
              <Text style={s.modalCancelText}>No, Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* Payment Success Modal                                             */}
      {/* ================================================================= */}
      <Modal
        visible={showPaymentSuccess}
        animationType="fade"
        transparent={true}
        onRequestClose={handleDismissSuccess}
      >
        <View style={s.successOverlay}>
          <View style={s.successCard}>
            <View style={[s.successIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>

            <Text style={s.successTitle}>Payment Reported!</Text>

            <Text style={s.successAmount}>
              ${Number(getSelectedTotal()).toFixed(2)}
            </Text>

            <Text style={s.successMessage}>
              {selectedMethod === 'card'
                ? 'Your payment will be verified automatically.'
                : 'Your payment has been reported and is pending verification by your coach.'}
            </Text>

            {selectedMethod && (
              <View style={[s.successMethodBadge, {
                backgroundColor: (
                  selectedMethod === 'card' ? '#635BFF' :
                  selectedMethod === 'cashapp' ? '#00D632' :
                  selectedMethod === 'venmo' ? '#008CFF' :
                  '#6D1ED4'
                ) + '20',
              }]}>
                <Ionicons
                  name={
                    selectedMethod === 'card' ? 'card' :
                    selectedMethod === 'cashapp' ? 'cash-outline' :
                    selectedMethod === 'venmo' ? 'logo-venmo' :
                    'flash-outline'
                  }
                  size={16}
                  color={
                    selectedMethod === 'card' ? '#635BFF' :
                    selectedMethod === 'cashapp' ? '#00D632' :
                    selectedMethod === 'venmo' ? '#008CFF' :
                    '#6D1ED4'
                  }
                />
                <Text style={s.successMethodText}>
                  via {selectedMethod === 'card' ? 'Credit/Debit Card' :
                       selectedMethod === 'cashapp' ? 'Cash App' :
                       selectedMethod === 'venmo' ? 'Venmo' : 'Zelle'}
                </Text>
              </View>
            )}

            <TouchableOpacity onPress={handleDismissSuccess} style={s.successDoneBtn} activeOpacity={0.8}>
              <Text style={s.successDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Wrapper>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
    },

    // Scroll
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
    },

    // Summary Card
    summaryCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: { elevation: 6 },
      }),
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 4,
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
    },
    summaryAmount: {
      fontSize: 36,
      fontWeight: '800',
    },
    summaryPendingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    summaryPendingText: {
      fontSize: 13,
      color: '#FF9500',
    },
    summaryPaidRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    summaryPaidText: {
      fontSize: 13,
    },

    // Instructions
    instructionsCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.primary + '15',
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
    },
    instructionsText: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      lineHeight: 20,
    },

    // Select All
    selectAllRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    selectAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectAllText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    selectedCount: {
      fontSize: 14,
      fontWeight: '600',
    },

    // Checkbox
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 4,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    checkboxSpacer: {
      width: 22,
      height: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },

    // Empty State
    emptyState: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    emptyIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },

    // Player Card
    playerCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      marginBottom: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.glassBorder,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: { elevation: 6 },
      }),
    },
    playerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
    },
    playerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    playerAvatarEmoji: {
      fontSize: 20,
    },
    playerInfo: {
      flex: 1,
    },
    playerName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    playerSeason: {
      fontSize: 13,
      marginTop: 1,
    },

    // Payment Row
    paymentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
    },
    paymentRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.glassBorder,
    },
    paymentItemInfo: {
      flex: 1,
    },
    paymentFeeName: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    paymentDueText: {
      fontSize: 12,
      marginTop: 2,
    },
    statusDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    statusDetailText: {
      fontSize: 11,
      color: '#FF9500',
    },
    paymentRight: {
      alignItems: 'flex-end',
    },
    paymentAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      marginTop: 4,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '600',
    },

    // Sticky Pay Bar
    stickyPayBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      paddingBottom: Platform.OS === 'ios' ? 32 : 16,
      backgroundColor: colors.bgSecondary,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: { elevation: 12 },
      }),
    },
    payButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    payButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#000',
    },

    // Modal Common
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.bgSecondary,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.glassBorder,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 20,
    },
    modalSectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 12,
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
    },
    modalCancelBtn: {
      backgroundColor: colors.glassCard,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    modalCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },

    // Method Buttons
    methodBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
    },
    methodIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    methodInfo: {
      flex: 1,
    },
    methodName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    methodDetail: {
      fontSize: 13,
      color: '#ffffffcc',
      marginTop: 1,
    },
    noMethodsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.glassCard,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    noMethodsText: {
      flex: 1,
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
    },

    // Confirm Modal
    confirmIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 12,
    },
    confirmTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    confirmSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: colors.glassCard,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    confirmBtn: {
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 10,
    },
    confirmBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },

    // Success Modal
    successOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    successCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 24,
      padding: 32,
      alignItems: 'center',
      width: '100%',
      maxWidth: 360,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    successTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    successAmount: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.success,
      marginBottom: 12,
    },
    successMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 8,
    },
    successMethodBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      marginBottom: 20,
    },
    successMethodText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    successDoneBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      width: '100%',
    },
    successDoneBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
    },
  });
