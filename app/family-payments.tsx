import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { createGlassStyle, useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

type PaymentRecord = {
  id: string;
  player_id: string;
  season_id: string;
  amount: number;
  paid: boolean;
  payment_method: string | null;
  fee_type: string | null;
  fee_name: string | null;
  due_date: string | null;
  created_at: string;
  players: {
    first_name: string;
    last_name: string;
  } | null;
};

type OrgPaymentInfo = {
  payment_venmo: string | null;
  payment_zelle: string | null;
  payment_cashapp: string | null;
  payment_instructions: string | null;
};

type ActiveTab = 'outstanding' | 'history';

// ============================================
// COMPONENT
// ============================================

export default function FamilyPaymentsScreen() {
  const { colors } = useTheme();
  const { user, organization } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('outstanding');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [orgPaymentInfo, setOrgPaymentInfo] = useState<OrgPaymentInfo | null>(null);

  const s = createStyles(colors);

  useEffect(() => {
    if (user?.id) fetchPaymentData();
  }, [user?.id]);

  const fetchPaymentData = async () => {
    if (!user?.id) return;

    try {
      // Fetch children linked to parent
      const { data: children } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id);

      const childIds = (children || []).map(c => c.id);

      if (childIds.length > 0) {
        // Fetch all payments for all children
        const { data: paymentData } = await supabase
          .from('payments')
          .select('*, players(first_name, last_name)')
          .in('player_id', childIds)
          .order('created_at', { ascending: false });

        setPayments(paymentData || []);
      }

      // Fetch organization payment info
      if (organization?.id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('payment_venmo, payment_zelle, payment_cashapp, payment_instructions')
          .eq('id', organization.id)
          .single();

        setOrgPaymentInfo(orgData || null);
      }
    } catch (err) {
      console.error('Error fetching payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPaymentData();
    setRefreshing(false);
  };

  // -----------------------------------------------
  // Helpers
  // -----------------------------------------------

  const outstandingPayments = payments.filter(p => !p.paid);
  const paidPayments = payments.filter(p => p.paid);

  const totalOutstanding = outstandingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaid = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  };

  const getPaymentStatusBadge = (payment: PaymentRecord) => {
    if (payment.paid) {
      return { label: 'Paid', color: colors.success, icon: 'checkmark-circle' };
    }
    if (isOverdue(payment.due_date)) {
      return { label: 'Overdue', color: colors.danger, icon: 'alert-circle' };
    }
    return { label: 'Pending', color: colors.warning, icon: 'time' };
  };

  // Group outstanding payments by child
  const getOutstandingByChild = () => {
    const groups: Record<string, { name: string; payments: PaymentRecord[]; total: number }> = {};
    outstandingPayments.forEach(p => {
      const key = p.player_id;
      if (!groups[key]) {
        groups[key] = {
          name: p.players
            ? `${p.players.first_name} ${p.players.last_name}`
            : 'Unknown',
          payments: [],
          total: 0,
        };
      }
      groups[key].payments.push(p);
      groups[key].total += p.amount || 0;
    });
    return groups;
  };

  const openPaymentApp = (type: 'venmo' | 'zelle' | 'cashapp') => {
    if (!orgPaymentInfo) return;

    let url = '';
    let label = '';

    switch (type) {
      case 'venmo':
        if (!orgPaymentInfo.payment_venmo) return;
        url = `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(orgPaymentInfo.payment_venmo)}&amount=${totalOutstanding}`;
        label = 'Venmo';
        break;
      case 'zelle':
        if (!orgPaymentInfo.payment_zelle) return;
        // Zelle doesn't have a universal deep link, open in browser
        url = `https://www.zellepay.com/`;
        label = 'Zelle';
        break;
      case 'cashapp':
        if (!orgPaymentInfo.payment_cashapp) return;
        url = `cashapp://pay/${encodeURIComponent(orgPaymentInfo.payment_cashapp)}?amount=${totalOutstanding}`;
        label = 'Cash App';
        break;
    }

    Linking.openURL(url).catch(() => {
      Alert.alert(
        `${label} Not Available`,
        `Could not open ${label}. Please make sure the app is installed.`
      );
    });
  };

  // -----------------------------------------------
  // Render
  // -----------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading payments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const outstandingByChild = getOutstandingByChild();
  const hasPaymentMethods =
    orgPaymentInfo?.payment_venmo ||
    orgPaymentInfo?.payment_zelle ||
    orgPaymentInfo?.payment_cashapp;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Payments</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Total Amount Owed Hero */}
        <View style={s.totalCard}>
          <View style={s.totalTop}>
            <View style={[s.totalIconWrap, { backgroundColor: totalOutstanding > 0 ? colors.warning + '20' : colors.success + '20' }]}>
              <Ionicons
                name="wallet"
                size={28}
                color={totalOutstanding > 0 ? colors.warning : colors.success}
              />
            </View>
            <View style={s.totalInfo}>
              <Text style={s.totalLabel}>
                {totalOutstanding > 0 ? 'TOTAL AMOUNT OWED' : 'ALL CAUGHT UP'}
              </Text>
              <Text
                style={[
                  s.totalAmount,
                  { color: totalOutstanding > 0 ? colors.warning : colors.success },
                ]}
              >
                {formatCurrency(totalOutstanding)}
              </Text>
            </View>
          </View>

          <View style={s.totalStatsRow}>
            <View style={s.totalStatItem}>
              <Text style={[s.totalStatNum, { color: colors.warning }]}>
                {outstandingPayments.length}
              </Text>
              <Text style={s.totalStatLabel}>Pending</Text>
            </View>
            <View style={s.totalStatDivider} />
            <View style={s.totalStatItem}>
              <Text style={[s.totalStatNum, { color: colors.success }]}>
                {formatCurrency(totalPaid)}
              </Text>
              <Text style={s.totalStatLabel}>Paid Total</Text>
            </View>
            <View style={s.totalStatDivider} />
            <View style={s.totalStatItem}>
              <Text style={[s.totalStatNum, { color: colors.danger }]}>
                {outstandingPayments.filter(p => isOverdue(p.due_date)).length}
              </Text>
              <Text style={s.totalStatLabel}>Overdue</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        {hasPaymentMethods && totalOutstanding > 0 && (
          <>
            <Text style={s.sectionTitle}>PAY NOW</Text>
            <View style={s.payMethodsRow}>
              {orgPaymentInfo?.payment_venmo && (
                <TouchableOpacity
                  style={[s.payMethodBtn, { backgroundColor: '#008CFF20', borderColor: '#008CFF40' }]}
                  onPress={() => openPaymentApp('venmo')}
                  activeOpacity={0.7}
                >
                  <Text style={[s.payMethodIcon, { color: '#008CFF' }]}>V</Text>
                  <Text style={[s.payMethodLabel, { color: '#008CFF' }]}>Venmo</Text>
                </TouchableOpacity>
              )}
              {orgPaymentInfo?.payment_zelle && (
                <TouchableOpacity
                  style={[s.payMethodBtn, { backgroundColor: '#6C1CD320', borderColor: '#6C1CD340' }]}
                  onPress={() => openPaymentApp('zelle')}
                  activeOpacity={0.7}
                >
                  <Text style={[s.payMethodIcon, { color: '#6C1CD3' }]}>Z</Text>
                  <Text style={[s.payMethodLabel, { color: '#6C1CD3' }]}>Zelle</Text>
                </TouchableOpacity>
              )}
              {orgPaymentInfo?.payment_cashapp && (
                <TouchableOpacity
                  style={[s.payMethodBtn, { backgroundColor: '#00D63220', borderColor: '#00D63240' }]}
                  onPress={() => openPaymentApp('cashapp')}
                  activeOpacity={0.7}
                >
                  <Text style={[s.payMethodIcon, { color: '#00D632' }]}>$</Text>
                  <Text style={[s.payMethodLabel, { color: '#00D632' }]}>Cash App</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Payment Instructions */}
            {orgPaymentInfo?.payment_instructions && (
              <View style={s.instructionsCard}>
                <Ionicons name="information-circle" size={18} color={colors.info} />
                <Text style={s.instructionsText}>{orgPaymentInfo.payment_instructions}</Text>
              </View>
            )}
          </>
        )}

        {/* Tab Bar */}
        <View style={s.tabBar}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'outstanding' && s.tabActive]}
            onPress={() => setActiveTab('outstanding')}
          >
            <Text style={[s.tabText, activeTab === 'outstanding' && s.tabTextActive]}>
              Outstanding ({outstandingPayments.length})
            </Text>
            {activeTab === 'outstanding' && (
              <View style={[s.tabIndicator, { backgroundColor: colors.primary }]} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'history' && s.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[s.tabText, activeTab === 'history' && s.tabTextActive]}>
              History ({paidPayments.length})
            </Text>
            {activeTab === 'history' && (
              <View style={[s.tabIndicator, { backgroundColor: colors.primary }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Outstanding Tab */}
        {activeTab === 'outstanding' && (
          <>
            {outstandingPayments.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="checkmark-done-circle" size={56} color={colors.success} />
                <Text style={s.emptyTitle}>No Outstanding Payments</Text>
                <Text style={s.emptySubtitle}>
                  You are all caught up! There are no pending payments.
                </Text>
              </View>
            ) : (
              Object.entries(outstandingByChild).map(([childId, group]) => (
                <View key={childId} style={s.childGroup}>
                  <View style={s.childGroupHeader}>
                    <View style={[s.childGroupAvatar, { backgroundColor: colors.primary + '25' }]}>
                      <Text style={[s.childGroupAvatarText, { color: colors.primary }]}>
                        {group.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={s.childGroupInfo}>
                      <Text style={s.childGroupName}>{group.name}</Text>
                      <Text style={[s.childGroupAmount, { color: colors.warning }]}>
                        {formatCurrency(group.total)} owed
                      </Text>
                    </View>
                  </View>

                  {group.payments.map(payment => {
                    const badge = getPaymentStatusBadge(payment);
                    return (
                      <View key={payment.id} style={s.paymentRow}>
                        <View style={s.paymentInfo}>
                          <Text style={s.paymentName}>
                            {payment.fee_name || payment.fee_type || 'Payment'}
                          </Text>
                          {payment.due_date && (
                            <Text
                              style={[
                                s.paymentDueDate,
                                isOverdue(payment.due_date) && { color: colors.danger },
                              ]}
                            >
                              Due: {formatDate(payment.due_date)}
                            </Text>
                          )}
                        </View>
                        <View style={s.paymentRight}>
                          <Text style={s.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                          <View style={[s.statusBadge, { backgroundColor: badge.color + '20' }]}>
                            <Ionicons name={badge.icon as any} size={12} color={badge.color} />
                            <Text style={[s.statusBadgeText, { color: badge.color }]}>
                              {badge.label}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <>
            {paidPayments.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="receipt-outline" size={56} color={colors.textMuted} />
                <Text style={s.emptyTitle}>No Payment History</Text>
                <Text style={s.emptySubtitle}>
                  Paid transactions will appear here.
                </Text>
              </View>
            ) : (
              paidPayments.map(payment => {
                const badge = getPaymentStatusBadge(payment);
                return (
                  <View key={payment.id} style={s.historyCard}>
                    <View style={s.historyLeft}>
                      <View style={[s.historyCheckmark, { backgroundColor: colors.success + '20' }]}>
                        <Ionicons name="checkmark" size={16} color={colors.success} />
                      </View>
                      <View style={s.historyInfo}>
                        <Text style={s.historyName}>
                          {payment.fee_name || payment.fee_type || 'Payment'}
                        </Text>
                        <Text style={s.historyChild}>
                          {payment.players
                            ? `${payment.players.first_name} ${payment.players.last_name}`
                            : ''}
                        </Text>
                        {payment.payment_method && (
                          <Text style={s.historyMethod}>via {payment.payment_method}</Text>
                        )}
                      </View>
                    </View>
                    <View style={s.historyRight}>
                      <Text style={[s.historyAmount, { color: colors.success }]}>
                        {formatCurrency(payment.amount)}
                      </Text>
                      <Text style={s.historyDate}>
                        {formatDate(payment.created_at?.split('T')[0] || null)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 12,
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

    // Section Title
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 12,
      marginTop: 8,
      textTransform: 'uppercase' as const,
      letterSpacing: 1.2,
    },

    // Total Card
    totalCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
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
    totalTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 16,
    },
    totalIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    totalInfo: {
      flex: 1,
    },
    totalLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 1.2,
      textTransform: 'uppercase' as const,
    },
    totalAmount: {
      fontSize: 32,
      fontWeight: '900',
      marginTop: 2,
    },
    totalStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
      paddingTop: 14,
    },
    totalStatItem: {
      flex: 1,
      alignItems: 'center',
    },
    totalStatDivider: {
      width: 1,
      height: 28,
      backgroundColor: colors.glassBorder,
    },
    totalStatNum: {
      fontSize: 16,
      fontWeight: '700',
    },
    totalStatLabel: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },

    // Pay Methods
    payMethodsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    payMethodBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    payMethodIcon: {
      fontSize: 24,
      fontWeight: '900',
      marginBottom: 4,
    },
    payMethodLabel: {
      fontSize: 13,
      fontWeight: '600',
    },

    // Instructions
    instructionsCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: colors.info + '10',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.info + '30',
    },
    instructionsText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 18,
    },

    // Tab Bar
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.glassCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      marginBottom: 16,
      marginTop: 4,
      overflow: 'hidden',
    },
    tab: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      position: 'relative',
    },
    tabActive: {},
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    tabIndicator: {
      position: 'absolute',
      bottom: 0,
      left: '20%',
      right: '20%',
      height: 3,
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
    },

    // Empty State
    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },

    // Child Group
    childGroup: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
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
    childGroupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
    },
    childGroupAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    childGroupAvatarText: {
      fontSize: 16,
      fontWeight: '700',
    },
    childGroupInfo: {
      flex: 1,
    },
    childGroupName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    childGroupAmount: {
      fontSize: 13,
      fontWeight: '600',
      marginTop: 1,
    },

    // Payment Row
    paymentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.glassBorder,
    },
    paymentInfo: {
      flex: 1,
    },
    paymentName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    paymentDueDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    paymentRight: {
      alignItems: 'flex-end',
    },
    paymentAmount: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '600',
    },

    // History Card
    historyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 14,
      marginBottom: 8,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
        },
        android: { elevation: 3 },
      }),
    },
    historyLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    historyCheckmark: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    historyInfo: {
      flex: 1,
    },
    historyName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    historyChild: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    historyMethod: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    historyRight: {
      alignItems: 'flex-end',
    },
    historyAmount: {
      fontSize: 16,
      fontWeight: '700',
    },
    historyDate: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
  });
