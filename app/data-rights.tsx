import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ChildData = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  grade: string | null;
  jersey_number: string | null;
  position: string | null;
  has_medical_info: boolean;
  games_played: number;
  stats_available: boolean;
  team_names: string[];
};

export default function DataRightsScreen() {
  const { colors } = useTheme();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildData[]>([]);
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
  const [exportingFor, setExportingFor] = useState<string | null>(null);
  const [deletingFor, setDeletingFor] = useState<string | null>(null);
  const [revokingConsent, setRevokingConsent] = useState(false);
  const [consentRevoked, setConsentRevoked] = useState(false);

  useEffect(() => {
    fetchChildrenData();
  }, [user?.id, profile?.email]);

  const fetchChildrenData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Collect player IDs from multiple sources
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

      const parentEmail = profile?.email || user?.email;
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
        setChildren([]);
        setLoading(false);
        return;
      }

      // Fetch player details
      const { data: players } = await supabase
        .from('players')
        .select(`
          id,
          first_name,
          last_name,
          date_of_birth,
          grade,
          jersey_number,
          position,
          medical_notes,
          allergies,
          medications,
          team_players (
            teams (name)
          )
        `)
        .in('id', playerIds);

      // Fetch game stats counts
      const { data: statsCounts } = await supabase
        .from('player_game_stats')
        .select('player_id')
        .in('player_id', playerIds);

      const statsMap = new Map<string, number>();
      (statsCounts || []).forEach(s => {
        statsMap.set(s.player_id, (statsMap.get(s.player_id) || 0) + 1);
      });

      const formattedChildren: ChildData[] = (players || []).map(player => {
        const teamNames: string[] = [];
        const teamPlayers = player.team_players as any[];
        if (teamPlayers) {
          teamPlayers.forEach((tp: any) => {
            if (tp.teams?.name) teamNames.push(tp.teams.name);
          });
        }

        const hasMedical = !!(player.medical_notes || player.allergies || player.medications);
        const gamesCount = statsMap.get(player.id) || 0;

        return {
          id: player.id,
          first_name: player.first_name,
          last_name: player.last_name,
          date_of_birth: player.date_of_birth,
          grade: player.grade || null,
          jersey_number: player.jersey_number || null,
          position: player.position || null,
          has_medical_info: hasMedical,
          games_played: gamesCount,
          stats_available: gamesCount > 0,
          team_names: teamNames,
        };
      });

      setChildren(formattedChildren);

    } catch (error) {
      if (__DEV__) console.error('Error fetching children data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewChildData = (childId: string) => {
    setExpandedChildId(expandedChildId === childId ? null : childId);
  };

  const handleRequestExport = async (childId: string) => {
    setExportingFor(childId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          data_export_requested: true,
          data_export_requested_at: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (error) throw error;

      Alert.alert(
        'Export Requested',
        'Your data export request has been submitted. You will be notified when the export is ready.',
      );
    } catch (error: any) {
      if (__DEV__) console.error('Error requesting export:', error);
      Alert.alert('Error', error.message || 'Failed to request data export.');
    } finally {
      setExportingFor(null);
    }
  };

  const handleRequestDeletion = (child: ChildData) => {
    Alert.alert(
      'Request Data Deletion',
      `This will request deletion of ${child.first_name}'s data. They will be removed from all active rosters and their player profile will be disabled.\n\nThis action cannot be easily undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Deletion',
          style: 'destructive',
          onPress: async () => {
            setDeletingFor(child.id);
            try {
              const { error } = await supabase
                .from('players')
                .update({
                  deletion_requested: true,
                  deletion_requested_at: new Date().toISOString(),
                })
                .eq('id', child.id);

              if (error) throw error;

              Alert.alert(
                'Deletion Requested',
                `A deletion request has been submitted for ${child.first_name}. An administrator will process this request.`,
              );
            } catch (error: any) {
              if (__DEV__) console.error('Error requesting deletion:', error);
              Alert.alert('Error', error.message || 'Failed to request deletion.');
            } finally {
              setDeletingFor(null);
            }
          },
        },
      ],
    );
  };

  const handleRevokeConsent = () => {
    Alert.alert(
      'Revoke Consent',
      'Revoking consent will remove your children from all active rosters and disable their player profiles. You will need to contact your organization to re-enroll.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Consent',
          style: 'destructive',
          onPress: async () => {
            setRevokingConsent(true);
            try {
              // Mark all children as deletion requested
              for (const child of children) {
                await supabase
                  .from('players')
                  .update({
                    deletion_requested: true,
                    deletion_requested_at: new Date().toISOString(),
                  })
                  .eq('id', child.id);
              }

              setConsentRevoked(true);
            } catch (error: any) {
              if (__DEV__) console.error('Error revoking consent:', error);
              Alert.alert('Error', error.message || 'Failed to revoke consent.');
            } finally {
              setRevokingConsent(false);
            }
          },
        },
      ],
    );
  };

  const s = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Data Rights</Text>
          <View style={s.backBtn} />
        </View>
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
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Data Rights</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Info Card */}
        <View style={s.infoCard}>
          <Ionicons name="shield-checkmark" size={28} color={colors.info} />
          <Text style={s.infoText}>
            You have the right to review, modify, and request deletion of your child's personal information.
          </Text>
        </View>

        {/* Consent Revoked Banner */}
        {consentRevoked && (
          <View style={s.revokedBanner}>
            <Ionicons name="alert-circle" size={24} color={colors.danger} />
            <Text style={s.revokedText}>
              Consent revoked. Contact your organization to re-enroll.
            </Text>
          </View>
        )}

        {/* Children Section */}
        {children.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="people-outline" size={40} color={colors.textMuted} />
            <Text style={s.emptyText}>No children found on your account.</Text>
          </View>
        ) : (
          children.map(child => (
            <View key={child.id} style={s.childCard}>
              {/* Child Header */}
              <View style={s.childHeader}>
                <View style={s.childAvatar}>
                  <Text style={s.childAvatarText}>
                    {child.first_name.charAt(0)}{child.last_name.charAt(0)}
                  </Text>
                </View>
                <View style={s.childNameWrap}>
                  <Text style={s.childName}>{child.first_name} {child.last_name}</Text>
                  {child.team_names.length > 0 && (
                    <Text style={s.childTeam}>{child.team_names.join(', ')}</Text>
                  )}
                </View>
              </View>

              {/* View Data Button */}
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => handleViewChildData(child.id)}
              >
                <Ionicons
                  name={expandedChildId === child.id ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.info}
                />
                <Text style={s.actionBtnText}>
                  {expandedChildId === child.id ? 'Hide Data' : "View My Child's Data"}
                </Text>
              </TouchableOpacity>

              {/* Expanded Data View */}
              {expandedChildId === child.id && (
                <View style={s.dataSection}>
                  <View style={s.dataRow}>
                    <Text style={s.dataLabel}>Name</Text>
                    <Text style={s.dataValue}>{child.first_name} {child.last_name}</Text>
                  </View>
                  <View style={s.dataRow}>
                    <Text style={s.dataLabel}>Date of Birth</Text>
                    <Text style={s.dataValue}>{child.date_of_birth || 'Not provided'}</Text>
                  </View>
                  <View style={s.dataRow}>
                    <Text style={s.dataLabel}>Grade</Text>
                    <Text style={s.dataValue}>{child.grade || 'Not provided'}</Text>
                  </View>
                  <View style={s.dataRow}>
                    <Text style={s.dataLabel}>Jersey Number</Text>
                    <Text style={s.dataValue}>{child.jersey_number || 'Not assigned'}</Text>
                  </View>
                  <View style={s.dataRow}>
                    <Text style={s.dataLabel}>Position</Text>
                    <Text style={s.dataValue}>{child.position || 'Not assigned'}</Text>
                  </View>
                  <View style={s.dataRow}>
                    <Text style={s.dataLabel}>Medical Info on File</Text>
                    <Text style={[s.dataValue, child.has_medical_info ? { color: colors.warning } : {}]}>
                      {child.has_medical_info ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  <View style={s.dataRow}>
                    <Text style={s.dataLabel}>Games Played</Text>
                    <Text style={s.dataValue}>{child.games_played}</Text>
                  </View>
                  <View style={s.dataRow}>
                    <Text style={s.dataLabel}>Stats Available</Text>
                    <Text style={s.dataValue}>{child.stats_available ? 'Yes' : 'No'}</Text>
                  </View>
                  <View style={[s.dataRow, { borderBottomWidth: 0 }]}>
                    <Text style={s.dataLabel}>Team Memberships</Text>
                    <Text style={s.dataValue}>
                      {child.team_names.length > 0 ? child.team_names.join(', ') : 'None'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={s.childActions}>
                <TouchableOpacity
                  style={s.exportBtn}
                  onPress={() => handleRequestExport(child.id)}
                  disabled={exportingFor === child.id}
                >
                  {exportingFor === child.id ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={16} color={colors.primary} />
                      <Text style={s.exportBtnText}>Request Data Export</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.deleteDataBtn}
                  onPress={() => handleRequestDeletion(child)}
                  disabled={deletingFor === child.id}
                >
                  {deletingFor === child.id ? (
                    <ActivityIndicator color={colors.danger} size="small" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      <Text style={s.deleteDataBtnText}>Request Data Deletion</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Revoke Consent Section */}
        {!consentRevoked && children.length > 0 && (
          <View style={s.revokeSection}>
            <Text style={s.revokeSectionTitle}>Revoke Consent</Text>
            <Text style={s.revokeWarning}>
              Revoking consent will remove your children from all active rosters and disable their player profiles.
            </Text>
            <TouchableOpacity
              style={s.revokeBtn}
              onPress={handleRevokeConsent}
              disabled={revokingConsent}
            >
              {revokingConsent ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={18} color="#fff" />
                  <Text style={s.revokeBtnText}>Revoke Consent</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    loadingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.info + '40',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    infoText: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    revokedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.danger + '15',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.danger + '40',
    },
    revokedText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.danger,
      lineHeight: 20,
    },
    emptyCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 40,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.glassBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 12,
    },
    childCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
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
      backgroundColor: colors.primary + '30',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    childAvatarText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
    },
    childNameWrap: {
      flex: 1,
    },
    childName: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    childTeam: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.info + '15',
      marginBottom: 8,
    },
    actionBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.info,
    },
    dataSection: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dataLabel: {
      fontSize: 13,
      color: colors.textMuted,
      flex: 1,
    },
    dataValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      textAlign: 'right',
    },
    childActions: {
      flexDirection: 'row',
      gap: 8,
    },
    exportBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.primary + '15',
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    exportBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    deleteDataBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.danger + '10',
      borderWidth: 1,
      borderColor: colors.danger + '30',
    },
    deleteDataBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.danger,
    },
    revokeSection: {
      backgroundColor: colors.danger + '08',
      borderRadius: 16,
      padding: 20,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.danger + '30',
    },
    revokeSectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.danger,
      marginBottom: 8,
    },
    revokeWarning: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
      marginBottom: 16,
    },
    revokeBtn: {
      backgroundColor: colors.danger,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    revokeBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },
  });
