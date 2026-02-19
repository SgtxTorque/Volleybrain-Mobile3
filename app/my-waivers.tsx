import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
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

type ChildInfo = {
  id: string;
  first_name: string;
  last_name: string;
};

type WaiverRecord = {
  id: string;
  waiver_name: string;
  status: string;
  signed_by: string;
  signed_at: string;
  content: string | null;
  type: string | null;
  source: 'waiver_signatures' | 'registrations';
};

type ChildWaivers = {
  child: ChildInfo;
  waivers: WaiverRecord[];
};

// ============================================
// COMPONENT
// ============================================

export default function MyWaiversScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [childWaivers, setChildWaivers] = useState<ChildWaivers[]>([]);
  const [expandedWaivers, setExpandedWaivers] = useState<Set<string>>(new Set());

  const s = createStyles(colors);

  useEffect(() => {
    if (user?.id) fetchWaivers();
  }, [user?.id]);

  const fetchWaivers = async () => {
    if (!user?.id) return;

    try {
      // Step 1: Get parent's children from multiple sources
      let children: ChildInfo[] = [];

      // Try players with parent_account_id
      const { data: directPlayers } = await supabase
        .from('players')
        .select('id, first_name, last_name')
        .eq('parent_account_id', user.id);

      if (directPlayers && directPlayers.length > 0) {
        children = directPlayers;
      }

      // Also try player_guardians table
      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id, players(id, first_name, last_name)')
        .eq('guardian_id', user.id);

      if (guardianLinks && guardianLinks.length > 0) {
        const guardianChildren = guardianLinks
          .filter((g: any) => g.players)
          .map((g: any) => ({
            id: g.players.id,
            first_name: g.players.first_name,
            last_name: g.players.last_name,
          }));

        // Merge without duplicates
        const existingIds = new Set(children.map(c => c.id));
        guardianChildren.forEach((gc: ChildInfo) => {
          if (!existingIds.has(gc.id)) {
            children.push(gc);
          }
        });
      }

      // Also try by parent email
      if (profile?.email) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id, first_name, last_name')
          .ilike('parent_email', profile.email);

        if (emailPlayers && emailPlayers.length > 0) {
          const existingIds = new Set(children.map(c => c.id));
          emailPlayers.forEach((ep: ChildInfo) => {
            if (!existingIds.has(ep.id)) {
              children.push(ep);
            }
          });
        }
      }

      if (children.length === 0) {
        setChildWaivers([]);
        setLoading(false);
        return;
      }

      // Step 2: For each child, fetch waivers
      const allChildWaivers: ChildWaivers[] = [];

      for (const child of children) {
        const waivers: WaiverRecord[] = [];

        // Try waiver_signatures first (joined with waiver_templates)
        const { data: signatures } = await supabase
          .from('waiver_signatures')
          .select('*, waiver_template:waiver_template_id(name, content, type)')
          .eq('player_id', child.id);

        if (signatures && signatures.length > 0) {
          signatures.forEach((sig: any) => {
            const template = sig.waiver_template;
            waivers.push({
              id: sig.id,
              waiver_name: template?.name || 'Waiver',
              status: sig.status || 'signed',
              signed_by: sig.signed_by_name || profile?.full_name || '',
              signed_at: sig.signed_at || sig.created_at || '',
              content: template?.content || null,
              type: template?.type || null,
              source: 'waiver_signatures',
            });
          });
        }

        // If no signatures found, try registrations table
        if (waivers.length === 0) {
          const { data: reg } = await supabase
            .from('registrations')
            .select('waivers_accepted, signature_name, signature_date, registration_data')
            .eq('player_id', child.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (reg) {
            // Parse waivers_accepted JSONB
            const waiversAccepted = reg.waivers_accepted;
            if (waiversAccepted && typeof waiversAccepted === 'object') {
              // waivers_accepted could be an array or an object with waiver names
              if (Array.isArray(waiversAccepted)) {
                waiversAccepted.forEach((w: any, index: number) => {
                  const waiverName = typeof w === 'string' ? w : (w?.name || w?.title || `Waiver ${index + 1}`);
                  waivers.push({
                    id: `reg-${child.id}-${index}`,
                    waiver_name: waiverName,
                    status: 'signed',
                    signed_by: reg.signature_name || profile?.full_name || '',
                    signed_at: reg.signature_date || '',
                    content: typeof w === 'object' ? (w?.content || null) : null,
                    type: typeof w === 'object' ? (w?.type || null) : null,
                    source: 'registrations',
                  });
                });
              } else {
                // Object form: { "Liability Waiver": true, "Medical Release": true }
                Object.entries(waiversAccepted).forEach(([name, accepted], index) => {
                  if (accepted) {
                    waivers.push({
                      id: `reg-${child.id}-${index}`,
                      waiver_name: name,
                      status: 'signed',
                      signed_by: reg.signature_name || profile?.full_name || '',
                      signed_at: reg.signature_date || '',
                      content: null,
                      type: null,
                      source: 'registrations',
                    });
                  }
                });
              }
            }

            // If waiversAccepted was empty but there is a signature, show generic entry
            if (waivers.length === 0 && reg.signature_name) {
              waivers.push({
                id: `reg-${child.id}-generic`,
                waiver_name: 'Registration Waiver',
                status: 'signed',
                signed_by: reg.signature_name,
                signed_at: reg.signature_date || '',
                content: null,
                type: null,
                source: 'registrations',
              });
            }
          }
        }

        allChildWaivers.push({ child, waivers });
      }

      setChildWaivers(allChildWaivers);
    } catch (err) {
      if (__DEV__) console.error('Error fetching waivers:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWaivers();
    setRefreshing(false);
  };

  // -----------------------------------------------
  // Helpers
  // -----------------------------------------------

  const toggleExpand = (waiverId: string) => {
    setExpandedWaivers(prev => {
      const next = new Set(prev);
      if (next.has(waiverId)) {
        next.delete(waiverId);
      } else {
        next.add(waiverId);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const dateOnly = dateStr.split('T')[0];
      const date = new Date(dateOnly + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const hasAnyWaivers = childWaivers.some(cw => cw.waivers.length > 0);

  // -----------------------------------------------
  // Render
  // -----------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading waivers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Waivers</Text>
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
        {/* Empty State */}
        {!hasAnyWaivers ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="document-text-outline" size={56} color={colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No Waivers on File</Text>
            <Text style={s.emptySubtitle}>
              Signed waivers will appear here after registration is completed.
            </Text>
          </View>
        ) : (
          childWaivers.map(({ child, waivers }) => {
            if (waivers.length === 0) return null;

            return (
              <View key={child.id} style={s.childSection}>
                {/* Child Name Header */}
                <View style={s.childHeader}>
                  <View style={[s.childAvatar, { backgroundColor: colors.primary + '25' }]}>
                    <Text style={[s.childAvatarText, { color: colors.primary }]}>
                      {child.first_name.charAt(0)}{child.last_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={s.childHeaderInfo}>
                    <Text style={s.childName}>{child.first_name} {child.last_name}</Text>
                    <Text style={s.childWaiverCount}>
                      {waivers.length} {waivers.length === 1 ? 'waiver' : 'waivers'} signed
                    </Text>
                  </View>
                </View>

                {/* Waiver Cards */}
                {waivers.map(waiver => {
                  const isExpanded = expandedWaivers.has(waiver.id);
                  const hasContent = !!waiver.content;

                  return (
                    <TouchableOpacity
                      key={waiver.id}
                      style={s.waiverCard}
                      onPress={() => hasContent && toggleExpand(waiver.id)}
                      activeOpacity={hasContent ? 0.7 : 1}
                    >
                      {/* Waiver Header Row */}
                      <View style={s.waiverHeader}>
                        <View style={[s.waiverIconWrap, { backgroundColor: colors.success + '15' }]}>
                          <Ionicons name="document-text" size={20} color={colors.success} />
                        </View>

                        <View style={s.waiverInfo}>
                          <Text style={s.waiverName}>{waiver.waiver_name}</Text>

                          {/* Status Badge */}
                          <View style={s.waiverMeta}>
                            <View style={[s.statusBadge, { backgroundColor: colors.success + '20' }]}>
                              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                              <Text style={[s.statusBadgeText, { color: colors.success }]}>Signed</Text>
                            </View>

                            {waiver.type && (
                              <View style={[s.typeBadge, { backgroundColor: colors.info + '15' }]}>
                                <Text style={[s.typeBadgeText, { color: colors.info }]}>{waiver.type}</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Expand indicator */}
                        {hasContent && (
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={colors.textMuted}
                          />
                        )}
                      </View>

                      {/* Signed By / Date */}
                      <View style={s.waiverDetails}>
                        {waiver.signed_by ? (
                          <View style={s.waiverDetailRow}>
                            <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                            <Text style={s.waiverDetailText}>Signed by: {waiver.signed_by}</Text>
                          </View>
                        ) : null}
                        {waiver.signed_at ? (
                          <View style={s.waiverDetailRow}>
                            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                            <Text style={s.waiverDetailText}>Date: {formatDate(waiver.signed_at)}</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Expandable Content */}
                      {isExpanded && waiver.content && (
                        <View style={s.waiverContent}>
                          <Text style={s.waiverContentText}>{waiver.content}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })
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

    // Child Section
    childSection: {
      marginBottom: 24,
    },
    childHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    childAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    childAvatarText: {
      fontSize: 16,
      fontWeight: '700',
    },
    childHeaderInfo: {
      flex: 1,
    },
    childName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    childWaiverCount: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },

    // Waiver Card
    waiverCard: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
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
    waiverHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    waiverIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    waiverInfo: {
      flex: 1,
    },
    waiverName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
    },
    waiverMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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
      fontSize: 11,
      fontWeight: '600',
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },

    // Waiver Details
    waiverDetails: {
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.glassBorder,
      gap: 6,
    },
    waiverDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    waiverDetailText: {
      fontSize: 13,
      color: colors.textMuted,
    },

    // Waiver Content (expandable)
    waiverContent: {
      marginTop: 12,
      backgroundColor: colors.bgSecondary,
      borderRadius: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    waiverContentText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },
  });
