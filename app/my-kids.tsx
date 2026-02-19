import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { createGlassStyle, useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

type ChildPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  jersey_number: string | null;
  medical_conditions: string | null;
  allergies: string | null;
  teams: {
    id: string;
    name: string;
    color: string | null;
    jersey_number: string | null;
    position: string | null;
  }[];
};

type OutstandingPayment = {
  id: string;
  player_id: string;
  amount: number;
  fee_type: string | null;
  fee_name: string | null;
  due_date: string | null;
};

type UpcomingEvent = {
  id: string;
  team_id: string;
  event_type: string;
  title: string;
  event_date: string;
  event_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
  opponent_name: string | null;
};

// ============================================
// COMPONENT
// ============================================

export default function MyKidsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<ChildPlayer[]>([]);
  const [outstandingPayments, setOutstandingPayments] = useState<OutstandingPayment[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);

  const s = createStyles(colors);

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;

    try {
      // Fetch children linked to this parent
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*, team_players(team_id, jersey_number, teams(id, name, color))')
        .eq('parent_account_id', user.id);

      if (playersError) {
        if (__DEV__) console.error('Error fetching children:', playersError);
        setLoading(false);
        return;
      }

      // Format children data
      const formattedChildren: ChildPlayer[] = (players || []).map((p: any) => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        photo_url: p.photo_url,
        jersey_number: p.jersey_number,
        medical_conditions: p.medical_conditions,
        allergies: p.allergies,
        teams: (p.team_players || []).map((tp: any) => ({
          id: tp.teams?.id || '',
          name: tp.teams?.name || '',
          color: tp.teams?.color || null,
          jersey_number: tp.jersey_number,
          position: p.position || null,
        })),
      }));

      setChildren(formattedChildren);

      const childIds = formattedChildren.map(c => c.id);
      const teamIds = formattedChildren.flatMap(c => c.teams.map(t => t.id)).filter(Boolean);

      // Fetch outstanding payments
      if (childIds.length > 0) {
        const { data: payments } = await supabase
          .from('payments')
          .select('*')
          .in('player_id', childIds)
          .eq('paid', false);

        setOutstandingPayments(payments || []);
      }

      // Fetch upcoming events
      if (teamIds.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const { data: events } = await supabase
          .from('schedule_events')
          .select('*')
          .in('team_id', teamIds)
          .gte('event_date', today)
          .order('event_date')
          .limit(5);

        setUpcomingEvents(events || []);
      }
    } catch (err) {
      if (__DEV__) console.error('Error in MyKids fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // -----------------------------------------------
  // Helpers
  // -----------------------------------------------

  const getOutstandingForChild = (childId: string) => {
    return outstandingPayments.filter(p => p.player_id === childId);
  };

  const getTotalOutstanding = () => {
    return outstandingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  const getNextEventForChild = (child: ChildPlayer) => {
    const childTeamIds = child.teams.map(t => t.id);
    return upcomingEvents.find(e => childTeamIds.includes(e.team_id));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  // -----------------------------------------------
  // Render
  // -----------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading your family...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalOwed = getTotalOutstanding();

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Kids</Text>
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
        {/* Total Outstanding Balance */}
        {totalOwed > 0 && (
          <TouchableOpacity
            style={s.balanceCard}
            onPress={() => router.push('/family-payments' as any)}
            activeOpacity={0.8}
          >
            <View style={s.balanceLeft}>
              <View style={[s.balanceIconWrap, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="wallet" size={24} color={colors.warning} />
              </View>
              <View>
                <Text style={s.balanceLabel}>TOTAL OUTSTANDING</Text>
                <Text style={s.balanceAmount}>{formatCurrency(totalOwed)}</Text>
              </View>
            </View>
            <View style={s.payNowBtn}>
              <Text style={s.payNowText}>Pay Now</Text>
              <Ionicons name="arrow-forward" size={16} color="#000" />
            </View>
          </TouchableOpacity>
        )}

        {/* Empty State */}
        {children.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="people-outline" size={56} color={colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No Children Registered</Text>
            <Text style={s.emptySubtitle}>
              Your children will appear here once they are registered and linked to your account.
            </Text>
          </View>
        ) : (
          <>
            {/* Section Title */}
            <Text style={s.sectionTitle}>
              {children.length} {children.length === 1 ? 'CHILD' : 'CHILDREN'}
            </Text>

            {/* Children Cards */}
            {children.map(child => {
              const nextEvent = getNextEventForChild(child);
              const childPayments = getOutstandingForChild(child.id);
              const childOwed = childPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

              return (
                <View key={child.id} style={s.childCard}>
                  {/* Child Header */}
                  <View style={s.childHeader}>
                    <View style={s.childAvatar}>
                      <Text style={s.childAvatarText}>
                        {child.first_name.charAt(0)}{child.last_name.charAt(0)}
                      </Text>
                    </View>
                    <View style={s.childHeaderInfo}>
                      <Text style={s.childName}>
                        {child.first_name} {child.last_name}
                      </Text>
                      {child.jersey_number && (
                        <Text style={s.childJersey}>#{child.jersey_number}</Text>
                      )}
                    </View>

                    {/* Payment Badge */}
                    {childOwed > 0 ? (
                      <View style={[s.paymentBadge, { backgroundColor: colors.warning + '20' }]}>
                        <Ionicons name="alert-circle" size={14} color={colors.warning} />
                        <Text style={[s.paymentBadgeText, { color: colors.warning }]}>
                          {formatCurrency(childOwed)}
                        </Text>
                      </View>
                    ) : (
                      <View style={[s.paymentBadge, { backgroundColor: colors.success + '20' }]}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                        <Text style={[s.paymentBadgeText, { color: colors.success }]}>Paid</Text>
                      </View>
                    )}
                  </View>

                  {/* Teams */}
                  {child.teams.length > 0 && (
                    <View style={s.teamsRow}>
                      {child.teams.map(team => (
                        <View key={team.id} style={s.teamBadge}>
                          <View
                            style={[s.teamDot, { backgroundColor: team.color || colors.primary }]}
                          />
                          <Text style={s.teamBadgeText}>{team.name}</Text>
                          {team.jersey_number && (
                            <Text style={s.teamJersey}>#{team.jersey_number}</Text>
                          )}
                          {team.position && (
                            <Text style={s.teamPosition}>{team.position}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Next Event */}
                  {nextEvent && (
                    <View style={s.nextEventRow}>
                      <Ionicons
                        name={nextEvent.event_type === 'game' ? 'trophy' : 'fitness'}
                        size={16}
                        color={nextEvent.event_type === 'game' ? colors.danger : colors.info}
                      />
                      <Text style={s.nextEventText}>
                        {nextEvent.event_type === 'game' && nextEvent.opponent_name
                          ? `vs ${nextEvent.opponent_name}`
                          : nextEvent.title}
                        {' -- '}
                        {formatDate(nextEvent.event_date)}
                        {nextEvent.event_time ? ` at ${formatTime(nextEvent.event_time)}` : ''}
                      </Text>
                    </View>
                  )}

                  {/* Quick Actions */}
                  <View style={s.childActions}>
                    <TouchableOpacity
                      style={s.childActionBtn}
                      onPress={() => router.push('/schedule' as any)}
                    >
                      <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                      <Text style={s.childActionText}>Schedule</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={s.childActionBtn}
                      onPress={() => router.push('/chats' as any)}
                    >
                      <Ionicons name="chatbubbles-outline" size={18} color={colors.success} />
                      <Text style={s.childActionText}>Team Chat</Text>
                    </TouchableOpacity>

                    {childOwed > 0 && (
                      <TouchableOpacity
                        style={s.childActionBtn}
                        onPress={() => router.push('/family-payments' as any)}
                      >
                        <Ionicons name="wallet-outline" size={18} color={colors.warning} />
                        <Text style={s.childActionText}>Pay Now</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Upcoming Events Preview */}
            {upcomingEvents.length > 0 && (
              <>
                <Text style={s.sectionTitle}>UPCOMING EVENTS</Text>
                {upcomingEvents.slice(0, 3).map(event => (
                  <View key={event.id} style={s.eventCard}>
                    <View
                      style={[
                        s.eventIndicator,
                        {
                          backgroundColor:
                            event.event_type === 'game' ? colors.danger : colors.info,
                        },
                      ]}
                    />
                    <View style={s.eventContent}>
                      <Text style={s.eventTitle}>
                        {event.event_type === 'game' && event.opponent_name
                          ? `vs ${event.opponent_name}`
                          : event.title}
                      </Text>
                      <View style={s.eventMeta}>
                        <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                        <Text style={s.eventMetaText}>{formatDate(event.event_date)}</Text>
                        {event.event_time && (
                          <>
                            <Ionicons
                              name="time-outline"
                              size={13}
                              color={colors.textMuted}
                              style={{ marginLeft: 10 }}
                            />
                            <Text style={s.eventMetaText}>{formatTime(event.event_time)}</Text>
                          </>
                        )}
                      </View>
                      {event.venue_name && (
                        <View style={s.eventMeta}>
                          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                          <Text style={s.eventMetaText}>{event.venue_name}</Text>
                        </View>
                      )}
                    </View>
                    <View
                      style={[
                        s.eventTypeBadge,
                        {
                          backgroundColor:
                            event.event_type === 'game'
                              ? colors.danger + '20'
                              : colors.info + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.eventTypeText,
                          {
                            color:
                              event.event_type === 'game' ? colors.danger : colors.info,
                          },
                        ]}
                      >
                        {event.event_type === 'game' ? 'Game' : 'Practice'}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
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

    // Balance Card
    balanceCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.warning + '40',
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    balanceLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    balanceIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    balanceLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase' as const,
    },
    balanceAmount: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.warning,
      marginTop: 2,
    },
    payNowBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },
    payNowText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#000',
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

    // Empty State
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    emptyIconWrap: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.glassCard,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },

    // Child Card
    childCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
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
    childHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    childAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary + '25',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    childAvatarText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
    },
    childHeaderInfo: {
      flex: 1,
    },
    childName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    childJersey: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },

    // Payment Badge
    paymentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    paymentBadgeText: {
      fontSize: 12,
      fontWeight: '600',
    },

    // Teams Row
    teamsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    teamBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.bgSecondary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    teamDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    teamBadgeText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    teamJersey: {
      fontSize: 12,
      color: colors.textMuted,
    },
    teamPosition: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '600',
      textTransform: 'uppercase' as const,
    },

    // Next Event
    nextEventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      backgroundColor: colors.bgSecondary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    nextEventText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },

    // Child Actions
    childActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
      paddingTop: 14,
    },
    childActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    childActionText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },

    // Event Card
    eventCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      marginBottom: 8,
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
    eventIndicator: {
      width: 4,
      alignSelf: 'stretch',
    },
    eventContent: {
      flex: 1,
      padding: 12,
    },
    eventTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    eventMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 3,
    },
    eventMetaText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    eventTypeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      marginRight: 12,
    },
    eventTypeText: {
      fontSize: 11,
      fontWeight: '600',
    },
  });
