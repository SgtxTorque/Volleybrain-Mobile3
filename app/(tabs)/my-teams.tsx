import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =============================================================================
// TYPES
// =============================================================================

type Teammate = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: number | null;
  position: string | null;
  grade: number;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  is_my_child: boolean;
};

type Coach = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
};

type Team = {
  id: string;
  name: string;
  season_id: string;
  season_name: string;
  sport_id: string;
  sport_name: string;
  sport_icon: string;
  sport_color: string;
  my_children: string[];
  teammates: Teammate[];
  coaches: Coach[];
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ParentMyTeamsScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const [selectedContact, setSelectedContact] = useState<{ name: string; phone: string; email: string } | null>(null);
  const [contactModalVisible, setContactModalVisible] = useState(false);

  const s = createStyles(colors);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchTeams = useCallback(async () => {
    if (!user?.id) return;

    try {
      const parentEmail = profile?.email || user?.email;

      let playerIds: string[] = [];

      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);

      if (guardianLinks) {
        playerIds.push(...guardianLinks.map(g => g.player_id));
      }

      const { data: directPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id);

      if (directPlayers) {
        playerIds.push(...directPlayers.map(p => p.id));
      }

      if (parentEmail) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', parentEmail);

        if (emailPlayers) {
          playerIds.push(...emailPlayers.map(p => p.id));
        }
      }

      playerIds = [...new Set(playerIds)];

      if (playerIds.length === 0) {
        setTeams([]);
        setLoading(false);
        return;
      }

      const { data: myChildren } = await supabase
        .from('players')
        .select('id, first_name, last_name')
        .in('id', playerIds);

      const myChildrenIds = new Set(playerIds);

      const { data: teamAssignments } = await supabase
        .from('team_players')
        .select(`
          team_id,
          player_id,
          teams (
            id,
            name,
            season_id,
            seasons (id, name, sport_id)
          )
        `)
        .in('player_id', playerIds);

      if (!teamAssignments || teamAssignments.length === 0) {
        setTeams([]);
        setLoading(false);
        return;
      }

      const teamIds = [...new Set(teamAssignments.map(ta => ta.team_id))];

      const { data: sports } = await supabase
        .from('sports')
        .select('id, name, icon, color_primary');

      const sportsMap = new Map((sports || []).map(sp => [sp.id, sp]));

      const teamsData: Team[] = [];

      for (const teamId of teamIds) {
        const teamAssignment = teamAssignments.find(ta => ta.team_id === teamId);
        const team = teamAssignment?.teams as any;
        const season = team?.seasons as any;

        if (!team || !season) continue;

        const sport = sportsMap.get(season.sport_id);

        const { data: teamPlayers } = await supabase
          .from('team_players')
          .select(`
            player_id,
            players (
              id,
              first_name,
              last_name,
              jersey_number,
              position,
              grade,
              parent_name,
              parent_phone,
              parent_email
            )
          `)
          .eq('team_id', teamId);

        const teammates: Teammate[] = (teamPlayers || []).map(tp => {
          const player = tp.players as any;
          return {
            id: player.id,
            first_name: player.first_name,
            last_name: player.last_name,
            jersey_number: player.jersey_number,
            position: player.position,
            grade: player.grade,
            parent_name: player.parent_name || '',
            parent_phone: player.parent_phone || '',
            parent_email: player.parent_email || '',
            is_my_child: myChildrenIds.has(player.id),
          };
        });

        // Sort: my children first, then alphabetically
        teammates.sort((a, b) => {
          if (a.is_my_child && !b.is_my_child) return -1;
          if (!a.is_my_child && b.is_my_child) return 1;
          return a.first_name.localeCompare(b.first_name);
        });

        const { data: teamCoaches } = await supabase
          .from('team_coaches')
          .select(`
            role,
            profiles (
              id,
              full_name,
              email,
              phone
            )
          `)
          .eq('team_id', teamId);

        const coaches: Coach[] = (teamCoaches || []).map(tc => {
          const p = tc.profiles as any;
          return {
            id: p.id,
            full_name: p.full_name || 'Coach',
            email: p.email || '',
            phone: p.phone || '',
            role: tc.role || 'coach',
          };
        });

        const myChildrenOnTeam = teammates
          .filter(t => t.is_my_child)
          .map(t => t.first_name);

        teamsData.push({
          id: teamId,
          name: team.name,
          season_id: season.id,
          season_name: season.name,
          sport_id: season.sport_id,
          sport_name: sport?.name || '',
          sport_icon: sport?.icon || '\uD83C\uDFC6',
          sport_color: sport?.color_primary || '#FFD700',
          my_children: myChildrenOnTeam,
          teammates,
          coaches,
        });
      }

      if (teamsData.length > 0) {
        setExpandedTeams(new Set([teamsData[0].id]));
      }

      setTeams(teamsData);
    } catch (error) {
      if (__DEV__) console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, profile?.email]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTeams();
  }, [fetchTeams]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const handleContact = (name: string, phone: string, email: string) => {
    setSelectedContact({ name, phone, email });
    setContactModalVisible(true);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
    setContactModalVisible(false);
  };

  const handleText = (phone: string) => {
    Linking.openURL(`sms:${phone}`);
    setContactModalVisible(false);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
    setContactModalVisible(false);
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Teams</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {teams.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={s.emptyTitle}>No team assignments yet</Text>
            <Text style={s.emptySubtext}>
              Once your child is assigned to a team, you'll see the roster here.
            </Text>
          </View>
        ) : (
          teams.map(team => {
            const isExpanded = expandedTeams.has(team.id);

            return (
              <View key={team.id} style={s.teamCard}>
                {/* Team Header */}
                <TouchableOpacity
                  onPress={() => toggleTeam(team.id)}
                  style={[s.teamHeader, isExpanded && s.teamHeaderExpanded]}
                >
                  <View style={[s.sportBadge, { backgroundColor: team.sport_color + '20' }]}>
                    <Text style={s.sportIcon}>{team.sport_icon}</Text>
                  </View>

                  <View style={s.teamInfo}>
                    <Text style={s.teamName}>{team.name}</Text>
                    <Text style={[s.teamSport, { color: team.sport_color }]}>
                      {team.sport_name} • {team.season_name}
                    </Text>
                    <Text style={s.teamDetail}>
                      {team.my_children.join(', ')}'s team • {team.teammates.length} players
                    </Text>
                  </View>

                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Expanded Content */}
                {isExpanded && (
                  <View style={s.expandedContent}>
                    {/* Coaches Section */}
                    {team.coaches.length > 0 && (
                      <View style={s.sectionWrap}>
                        <Text style={s.sectionLabel}>Coaches</Text>
                        {team.coaches.map(coach => (
                          <TouchableOpacity
                            key={coach.id}
                            onPress={() => handleContact(coach.full_name, coach.phone || '', coach.email)}
                            style={s.coachRow}
                          >
                            <View style={s.coachAvatar}>
                              <Ionicons name="person" size={20} color={colors.primary} />
                            </View>
                            <View style={s.coachInfo}>
                              <Text style={s.coachName}>{coach.full_name}</Text>
                              <Text style={s.coachRole}>
                                {coach.role === 'head_coach' ? 'Head Coach' :
                                 coach.role === 'assistant_coach' ? 'Assistant Coach' : 'Coach'}
                              </Text>
                            </View>
                            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Roster Section */}
                    <Text style={s.sectionLabel}>Roster ({team.teammates.length})</Text>

                    {team.teammates.map((player, index) => (
                      <TouchableOpacity
                        key={player.id}
                        onPress={() => !player.is_my_child && handleContact(
                          `${player.first_name}'s Parent`,
                          player.parent_phone,
                          player.parent_email
                        )}
                        disabled={player.is_my_child}
                        style={[
                          s.playerRow,
                          index < team.teammates.length - 1 && s.playerRowBorder,
                        ]}
                      >
                        {/* Jersey Number */}
                        <View style={[
                          s.jerseyBadge,
                          player.is_my_child
                            ? { backgroundColor: team.sport_color + '30', borderWidth: 2, borderColor: team.sport_color }
                            : {},
                        ]}>
                          <Text style={[
                            s.jerseyText,
                            player.is_my_child && { color: team.sport_color },
                          ]}>
                            {player.jersey_number || '—'}
                          </Text>
                        </View>

                        {/* Player Info */}
                        <View style={s.playerInfo}>
                          <View style={s.playerNameRow}>
                            <Text style={s.playerName}>
                              {player.first_name} {player.last_name}
                            </Text>
                            {player.is_my_child && (
                              <View style={[s.myChildBadge, { backgroundColor: team.sport_color }]}>
                                <Text style={s.myChildText}>MY CHILD</Text>
                              </View>
                            )}
                          </View>
                          <Text style={s.playerMeta}>
                            Grade {player.grade}
                            {player.position ? ` • ${player.position}` : ''}
                          </Text>
                        </View>

                        {/* Contact Icon (for other players) */}
                        {!player.is_my_child && player.parent_phone && (
                          <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Contact Modal */}
      <Modal
        visible={contactModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalTop}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>
                Contact {selectedContact?.name}
              </Text>
            </View>

            {selectedContact?.phone && (
              <>
                <TouchableOpacity
                  onPress={() => handleCall(selectedContact.phone)}
                  style={s.contactAction}
                >
                  <Ionicons name="call" size={22} color={colors.success} />
                  <Text style={s.contactActionLabel}>Call</Text>
                  <Text style={s.contactActionDetail}>{selectedContact.phone}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleText(selectedContact.phone)}
                  style={s.contactAction}
                >
                  <Ionicons name="chatbubble" size={22} color={colors.info} />
                  <Text style={s.contactActionLabel}>Text Message</Text>
                </TouchableOpacity>
              </>
            )}

            {selectedContact?.email && (
              <TouchableOpacity
                onPress={() => handleEmail(selectedContact.email)}
                style={s.contactAction}
              >
                <Ionicons name="mail" size={22} color={colors.warning} />
                <Text style={s.contactActionLabel}>Email</Text>
                <Text style={s.contactActionDetailSmall} numberOfLines={1}>
                  {selectedContact.email}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setContactModalVisible(false)}
              style={s.cancelBtn}
            >
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    loadingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.screenPadding,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      ...displayTextStyle,
      fontSize: 18,
      color: colors.text,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.screenPadding,
    },

    // Empty state
    emptyCard: {
      backgroundColor: colors.glassCard,
      borderRadius: radii.card,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    emptyTitle: {
      color: colors.textSecondary,
      marginTop: 12,
      fontSize: 16,
      textAlign: 'center',
      fontFamily: FONTS.bodySemiBold,
    },
    emptySubtext: {
      color: colors.textSecondary,
      marginTop: 4,
      fontSize: 13,
      textAlign: 'center',
    },

    // Team card
    teamCard: {
      backgroundColor: colors.glassCard,
      borderRadius: radii.card,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.glassBorder,
      ...shadows.card,
    },
    teamHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.screenPadding,
    },
    teamHeaderExpanded: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sportBadge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    sportIcon: {
      fontSize: 24,
    },
    teamInfo: {
      flex: 1,
    },
    teamName: {
      fontSize: 16,
      fontFamily: FONTS.bodySemiBold,
      color: colors.text,
    },
    teamSport: {
      fontSize: 13,
      marginTop: 2,
    },
    teamDetail: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },

    // Expanded content
    expandedContent: {
      padding: spacing.screenPadding,
    },
    sectionWrap: {
      marginBottom: 16,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: FONTS.bodyBold,
      color: colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },

    // Coach rows
    coachRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    coachAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    coachInfo: {
      flex: 1,
    },
    coachName: {
      fontSize: 15,
      fontFamily: FONTS.bodySemiBold,
      color: colors.text,
    },
    coachRole: {
      fontSize: 12,
      color: colors.primary,
      marginTop: 1,
    },

    // Player rows
    playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
    playerRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    jerseyBadge: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    jerseyText: {
      fontSize: 14,
      fontFamily: FONTS.bodyBold,
      color: colors.text,
    },
    playerInfo: {
      flex: 1,
    },
    playerNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    playerName: {
      fontSize: 15,
      fontFamily: FONTS.bodySemiBold,
      color: colors.text,
    },
    myChildBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    },
    myChildText: {
      fontSize: 9,
      fontFamily: FONTS.bodyBold,
      color: colors.background,
    },
    playerMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },

    // Contact modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    modalTop: {
      alignItems: 'center',
      marginBottom: 20,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.textMuted + '40',
      borderRadius: 2,
      marginBottom: 16,
    },
    modalTitle: {
      ...displayTextStyle,
      fontSize: 18,
      color: colors.text,
    },
    contactAction: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: 16,
      borderRadius: 12,
      marginBottom: 10,
    },
    contactActionLabel: {
      flex: 1,
      marginLeft: 12,
      fontSize: 16,
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
    },
    contactActionDetail: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    contactActionDetailSmall: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    cancelBtn: {
      backgroundColor: colors.glassCard,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    cancelBtnText: {
      fontSize: 16,
      fontFamily: FONTS.bodySemiBold,
      color: colors.text,
    },
  });
