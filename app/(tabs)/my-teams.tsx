import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
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

      const sportsMap = new Map((sports || []).map(s => [s.id, s]));

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
          sport_icon: sport?.icon || '🏆',
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
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* Header */}
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
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>My Teams</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {teams.length === 0 ? (
          <View style={{
            backgroundColor: colors.glassCard,
            borderRadius: 16,
            padding: 32,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.glassBorder,
          }}>
            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 16, textAlign: 'center' }}>
              No team assignments yet
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13, textAlign: 'center' }}>
              Once your child is assigned to a team, you'll see the roster here.
            </Text>
          </View>
        ) : (
          teams.map(team => {
            const isExpanded = expandedTeams.has(team.id);
            
            return (
              <View
                key={team.id}
                style={{
                  backgroundColor: colors.glassCard,
                  borderRadius: 16,
                  marginBottom: 12,
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
                {/* Team Header */}
                <TouchableOpacity
                  onPress={() => toggleTeam(team.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderBottomWidth: isExpanded ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: team.sport_color + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <Text style={{ fontSize: 24 }}>{team.sport_icon}</Text>
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                      {team.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: team.sport_color, marginTop: 2 }}>
                      {team.sport_name} • {team.season_name}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
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
                  <View style={{ padding: 16 }}>
                    {/* Coaches Section */}
                    {team.coaches.length > 0 && (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: colors.textSecondary,
                          marginBottom: 8,
                          textTransform: 'uppercase',
                          letterSpacing: 1.5,
                        }}>
                          Coaches
                        </Text>
                        {team.coaches.map(coach => (
                          <TouchableOpacity
                            key={coach.id}
                            onPress={() => handleContact(coach.full_name, coach.phone || '', coach.email)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: colors.background,
                              borderRadius: 8,
                              padding: 12,
                              marginBottom: 8,
                            }}
                          >
                            <View style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              backgroundColor: colors.primary + '20',
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginRight: 12,
                            }}>
                              <Ionicons name="person" size={20} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                                {coach.full_name}
                              </Text>
                              <Text style={{ fontSize: 12, color: colors.primary, marginTop: 1 }}>
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
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: colors.textSecondary,
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: 1.5,
                    }}>
                      Roster ({team.teammates.length})
                    </Text>
                    
                    {team.teammates.map((player, index) => (
                      <TouchableOpacity
                        key={player.id}
                        onPress={() => !player.is_my_child && handleContact(
                          `${player.first_name}'s Parent`,
                          player.parent_phone,
                          player.parent_email
                        )}
                        disabled={player.is_my_child}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          borderBottomWidth: index < team.teammates.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                        }}
                      >
                        {/* Jersey Number */}
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: player.is_my_child ? team.sport_color + '30' : colors.background,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 12,
                          borderWidth: player.is_my_child ? 2 : 0,
                          borderColor: team.sport_color,
                        }}>
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: player.is_my_child ? team.sport_color : colors.text,
                          }}>
                            {player.jersey_number || '—'}
                          </Text>
                        </View>
                        
                        {/* Player Info */}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{
                              fontSize: 15,
                              fontWeight: player.is_my_child ? '600' : '500',
                              color: colors.text,
                            }}>
                              {player.first_name} {player.last_name}
                            </Text>
                            {player.is_my_child && (
                              <View style={{
                                backgroundColor: team.sport_color,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                                marginLeft: 8,
                              }}>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>
                                  MY CHILD
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
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
            paddingBottom: 40,
          }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{
                width: 40,
                height: 4,
                backgroundColor: colors.border,
                borderRadius: 2,
                marginBottom: 16,
              }} />
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                Contact {selectedContact?.name}
              </Text>
            </View>

            {selectedContact?.phone && (
              <>
                <TouchableOpacity
                  onPress={() => handleCall(selectedContact.phone)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.background,
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 10,
                  }}
                >
                  <Ionicons name="call" size={22} color="#34C759" />
                  <Text style={{ flex: 1, marginLeft: 12, fontSize: 16, color: colors.text }}>
                    Call
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                    {selectedContact.phone}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleText(selectedContact.phone)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.background,
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 10,
                  }}
                >
                  <Ionicons name="chatbubble" size={22} color="#5AC8FA" />
                  <Text style={{ flex: 1, marginLeft: 12, fontSize: 16, color: colors.text }}>
                    Text Message
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {selectedContact?.email && (
              <TouchableOpacity
                onPress={() => handleEmail(selectedContact.email)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.background,
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 10,
                }}
              >
                <Ionicons name="mail" size={22} color="#FF9500" />
                <Text style={{ flex: 1, marginLeft: 12, fontSize: 16, color: colors.text }}>
                  Email
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
                  {selectedContact.email}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setContactModalVisible(false)}
              style={{
                backgroundColor: colors.border,
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                marginTop: 10,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
