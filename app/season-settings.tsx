import AdminContextBar from '@/components/AdminContextBar';
import SeasonFeesManager from '@/components/SeasonFeesManager';
import AppHeaderBar from '@/components/ui/AppHeaderBar';
import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
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

// =====================================================
// TYPES
// =====================================================
type Season = {
  id: string;
  name: string;
  sport_id: string;
  status: string;
  registration_open: boolean;
  start_date: string | null;
  end_date: string | null;
  fee_registration: number;
  fee_uniform: number;
  fee_monthly: number;
  monthly_fee_count: number;
  max_players_per_team: number;
  min_players_per_team: number;
};

type AgeGroup = {
  id: string;
  name: string;
  min_grade?: number;
  max_grade?: number;
  min_age?: number;
  max_age?: number;
  skill_level?: string;
  gender?: string;
  display_order: number;
};

type Team = {
  id: string;
  name: string;
  age_group_id: string;
  player_count: number;
};

type Sport = {
  id: string;
  name: string;
  code: string;
  icon: string;
  color_primary: string;
};

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function SeasonSettingsScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { workingSeason, refreshSeasons } = useSeason();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [season, setSeason] = useState<Season | null>(null);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sport, setSport] = useState<Sport | null>(null);

  // Edit modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');
  const [editLabel, setEditLabel] = useState<string>('');

  // Date picker states
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'start_date' | 'end_date'>('start_date');
  const [tempDate, setTempDate] = useState(new Date());

  // Age group modal states
  const [ageGroupModalVisible, setAgeGroupModalVisible] = useState(false);
  const [groupType, setGroupType] = useState<'grade' | 'age'>('grade');
  const [minGrade, setMinGrade] = useState('');
  const [maxGrade, setMaxGrade] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [gender, setGender] = useState('coed');
  const [skillLevel, setSkillLevel] = useState('');

  // =====================================================
  // DATA FETCHING
  // =====================================================
  const fetchData = async () => {
    if (!workingSeason?.id) { setLoading(false); return; }

    try {
      const { data: seasonData } = await supabase.from('seasons').select('*').eq('id', workingSeason.id).single();
      if (seasonData) {
        setSeason(seasonData);
        if (seasonData.sport_id) {
          const { data: sportData } = await supabase.from('sports').select('*').eq('id', seasonData.sport_id).single();
          setSport(sportData);
        }
      }

      const { data: ageGroupData } = await supabase.from('age_groups').select('*').eq('season_id', workingSeason.id).order('display_order');
      setAgeGroups(ageGroupData || []);

      const { data: teamsData } = await supabase.from('teams').select('id, name, age_group_id').eq('season_id', workingSeason.id);
      const teamIds = (teamsData || []).map(t => t.id);

      // Batch player counts for all teams at once
      let playerCountMap = new Map<string, number>();
      if (teamIds.length > 0) {
        const { data: allTeamPlayers } = await supabase
          .from('team_players')
          .select('team_id')
          .in('team_id', teamIds);
        for (const tp of (allTeamPlayers || [])) {
          playerCountMap.set(tp.team_id, (playerCountMap.get(tp.team_id) || 0) + 1);
        }
      }

      const teamsWithCounts = (teamsData || []).map(team => ({
        ...team,
        player_count: playerCountMap.get(team.id) || 0,
      }));
      setTeams(teamsWithCounts);
    } catch (error) {
      if (__DEV__) console.error('Error fetching season data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [workingSeason?.id]);

  // =====================================================
  // UPDATE HANDLERS
  // =====================================================
  const updateSeason = async (field: string, value: any) => {
    if (!season?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase.from('seasons').update({ [field]: value }).eq('id', season.id);
      if (error) throw error;
      setSeason({ ...season, [field]: value });
      await refreshSeasons();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
      setEditModalVisible(false);
    }
  };

  const toggleRegistration = () => {
    if (!season) return;
    const newValue = !season.registration_open;
    Alert.alert(
      newValue ? 'Open Registration' : 'Close Registration',
      newValue ? 'Allow new registrations?' : 'Stop new registrations?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: newValue ? 'Open' : 'Close', onPress: () => updateSeason('registration_open', newValue) },
      ]
    );
  };

  const openEditModal = (field: string, currentValue: any, label: string) => {
    setEditField(field);
    setEditValue(String(currentValue || ''));
    setEditLabel(label);
    setEditModalVisible(true);
  };

  const saveEdit = () => {
    let value: any = editValue;
    if (['fee_registration', 'fee_uniform', 'fee_monthly', 'monthly_fee_count', 'max_players_per_team', 'min_players_per_team'].includes(editField)) {
      value = parseFloat(editValue) || 0;
    }
    updateSeason(editField, value);
  };

  // =====================================================
  // DATE PICKER HANDLERS
  // =====================================================
  const openDatePicker = (field: 'start_date' | 'end_date') => {
    const currentDate = season?.[field] ? new Date(season[field] + 'T00:00:00') : new Date();
    setTempDate(currentDate);
    setDatePickerField(field);
    setDatePickerVisible(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setDatePickerVisible(false);
      if (selectedDate && event.type === 'set') {
        const dateString = selectedDate.toISOString().split('T')[0];
        updateSeason(datePickerField, dateString);
      }
    } else if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const confirmDate = () => {
    const dateString = tempDate.toISOString().split('T')[0];
    updateSeason(datePickerField, dateString);
    setDatePickerVisible(false);
  };

  // =====================================================
  // AGE GROUP HANDLERS
  // =====================================================
  const resetAgeGroupForm = () => {
    setGroupType('grade');
    setMinGrade('');
    setMaxGrade('');
    setMaxAge('');
    setGender('coed');
    setSkillLevel('');
  };

  const generateAgeGroupName = () => {
    let parts = [];
    
    // Gender prefix
    if (gender === 'boys') parts.push('Boys');
    else if (gender === 'girls') parts.push('Girls');
    
    // Grade or age
    if (groupType === 'grade') {
      const min = parseInt(minGrade);
      const max = parseInt(maxGrade) || min;
      if (min && max && min !== max) {
        parts.push(`${min}th/${max}th Grade`);
      } else if (min) {
        const suffix = min === 1 ? 'st' : min === 2 ? 'nd' : min === 3 ? 'rd' : 'th';
        parts.push(`${min}${suffix} Grade`);
      }
    } else {
      if (maxAge) parts.push(`${maxAge}U`);
    }
    
    // Skill level
    if (skillLevel) parts.push(skillLevel);
    
    return parts.join(' ');
  };

  const createAgeGroup = async () => {
    if (!workingSeason?.id) return;
    
    const name = generateAgeGroupName();
    if (!name) {
      Alert.alert('Error', 'Please fill in the required fields');
      return;
    }

    try {
      const insertData: any = {
        season_id: workingSeason.id,
        name: name,
        display_order: ageGroups.length,
      };

      if (groupType === 'grade') {
        insertData.min_grade = parseInt(minGrade) || null;
        insertData.max_grade = parseInt(maxGrade) || parseInt(minGrade) || null;
      } else {
        insertData.max_age = parseInt(maxAge) || null;
      }

      if (skillLevel) insertData.skill_level = skillLevel;
      if (gender !== 'coed') insertData.gender = gender;

      const { error } = await supabase.from('age_groups').insert(insertData);
      if (error) throw error;

      setAgeGroupModalVisible(false);
      resetAgeGroupForm();
      fetchData();
      Alert.alert('Success', `Created: ${name}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const deleteAgeGroup = (ageGroup: AgeGroup) => {
    const teamsInGroup = teams.filter(t => t.age_group_id === ageGroup.id);
    if (teamsInGroup.length > 0) {
      Alert.alert('Cannot Delete', `This age group has ${teamsInGroup.length} team(s). Remove teams first.`);
      return;
    }

    Alert.alert('Delete Age Group', `Delete "${ageGroup.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('age_groups').delete().eq('id', ageGroup.id);
        fetchData();
      }},
    ]);
  };

  // =====================================================
  // HELPERS
  // =====================================================
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTeamsForAgeGroup = (ageGroupId: string) => teams.filter(t => t.age_group_id === ageGroupId);
  const getTotalPlayers = () => teams.reduce((sum, t) => sum + t.player_count, 0);
  const getTeamsWithLowRoster = () => {
    const minPlayers = season?.min_players_per_team || 9;
    return teams.filter(t => t.player_count < minPlayers && t.player_count > 0);
  };

  const getAgeGroupSubtitle = (ag: AgeGroup) => {
    const parts = [];
    if (ag.min_grade) {
      if (ag.max_grade && ag.max_grade !== ag.min_grade) {
        parts.push(`Grades ${ag.min_grade}-${ag.max_grade}`);
      } else {
        parts.push(`Grade ${ag.min_grade}`);
      }
    } else if (ag.max_age) {
      parts.push(`Ages ≤${ag.max_age}`);
    }
    if (ag.skill_level) parts.push(ag.skill_level);
    
    const groupTeams = getTeamsForAgeGroup(ag.id);
    const groupPlayers = groupTeams.reduce((sum, t) => sum + t.player_count, 0);
    parts.push(`${groupTeams.length} teams • ${groupPlayers} players`);
    
    return parts.join(' • ');
  };

  const s = createStyles(colors);

  // =====================================================
  // RENDER
  // =====================================================
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <AdminContextBar />
        <AppHeaderBar
          title="SEASON SETTINGS"
          showLogo={false}
          showAvatar={false}
          showNotificationBell={false}
          leftIcon={
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
          }
        />
        <View style={s.loadingContainer}>
          {/* Skeleton */}
          <View style={{ width: '100%', paddingHorizontal: spacing.screenPadding }}>
            <View style={{ height: 80, backgroundColor: colors.border, borderRadius: radii.card, marginBottom: 16, opacity: 0.3 }} />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <View style={{ flex: 1, height: 70, backgroundColor: colors.border, borderRadius: radii.card, opacity: 0.3 }} />
              <View style={{ flex: 1, height: 70, backgroundColor: colors.border, borderRadius: radii.card, opacity: 0.3 }} />
              <View style={{ flex: 1, height: 70, backgroundColor: colors.border, borderRadius: radii.card, opacity: 0.3 }} />
            </View>
            <View style={{ height: 60, backgroundColor: colors.border, borderRadius: radii.card, marginBottom: 16, opacity: 0.3 }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!season) {
    return (
      <SafeAreaView style={s.container}>
        <AdminContextBar />
        <AppHeaderBar
          title="SEASON SETTINGS"
          showLogo={false}
          showAvatar={false}
          showNotificationBell={false}
          leftIcon={
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
          }
        />
        <View style={s.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
          <Text style={s.emptyText}>No season selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  const lowRosterTeams = getTeamsWithLowRoster();

  return (
    <SafeAreaView style={s.container}>
      <AdminContextBar />
      <AppHeaderBar
        title="SEASON SETTINGS"
        showLogo={false}
        showAvatar={false}
        showNotificationBell={false}
        leftIcon={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}>
        {/* Season Header */}
        <View style={s.seasonHeader}>
          {sport && (
            <View style={[s.sportBadge, { backgroundColor: sport.color_primary + '20' }]}>
              <Text style={{ fontSize: 18 }}>{sport.icon}</Text>
              <Text style={[s.sportBadgeText, { color: sport.color_primary }]}>{sport.name}</Text>
            </View>
          )}
          <Text style={s.seasonName}>{season.name}</Text>
          <View style={[s.statusBadge, { backgroundColor: season.registration_open ? '#22C55E20' : colors.border }]}>
            <View style={[s.statusDot, { backgroundColor: season.registration_open ? '#22C55E' : colors.textSecondary }]} />
            <Text style={[s.statusText, { color: season.registration_open ? '#22C55E' : colors.textSecondary }]}>
              {season.registration_open ? 'Registration Open' : 'Registration Closed'}
            </Text>
          </View>
        </View>

        {/* Low Roster Alert */}
        {lowRosterTeams.length > 0 && (
          <View style={s.alertCard}>
            <View style={s.alertHeader}>
              <Ionicons name="warning" size={20} color="#E8913A" />
              <Text style={s.alertTitle}>Teams Need Players</Text>
            </View>
            <Text style={s.alertDescription}>{lowRosterTeams.length} team(s) have fewer than {season.min_players_per_team || 9} players</Text>
            {lowRosterTeams.slice(0, 3).map(team => (
              <View key={team.id} style={s.alertItem}>
                <Text style={s.alertItemText}>{team.name}</Text>
                <Text style={s.alertItemCount}>{team.player_count} players</Text>
              </View>
            ))}
            {lowRosterTeams.length > 3 && <Text style={s.alertMore}>+{lowRosterTeams.length - 3} more</Text>}
          </View>
        )}

        {/* Quick Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}><Text style={s.statNumber}>{teams.length}</Text><Text style={s.statLabel}>Teams</Text></View>
          <View style={s.statCard}><Text style={s.statNumber}>{getTotalPlayers()}</Text><Text style={s.statLabel}>Players</Text></View>
          <View style={s.statCard}><Text style={s.statNumber}>{ageGroups.length}</Text><Text style={s.statLabel}>Age Groups</Text></View>
        </View>

        {/* Registration Toggle */}
        <TouchableOpacity style={s.toggleCard} onPress={toggleRegistration}>
          <View style={s.toggleInfo}>
            <Ionicons name={season.registration_open ? 'lock-open' : 'lock-closed'} size={24} color={season.registration_open ? '#22C55E' : colors.textSecondary} />
            <View style={s.toggleText}>
              <Text style={s.toggleTitle}>Registration</Text>
              <Text style={s.toggleSubtitle}>{season.registration_open ? 'Accepting new players' : 'Not accepting players'}</Text>
            </View>
          </View>
          <View style={[s.toggleSwitch, season.registration_open && s.toggleSwitchOn]}>
            <View style={[s.toggleKnob, season.registration_open && s.toggleKnobOn]} />
          </View>
        </TouchableOpacity>

        {/* Season Dates */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Season Dates</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.settingRow} onPress={() => openDatePicker('start_date')}>
              <View style={s.settingInfo}>
                <Text style={s.settingLabel}>Season Start</Text>
                <Text style={s.settingValue}>{formatDate(season.start_date)}</Text>
              </View>
              <Ionicons name="calendar" size={20} color={colors.primary} />
            </TouchableOpacity>
            <View style={s.divider} />
            <TouchableOpacity style={s.settingRow} onPress={() => openDatePicker('end_date')}>
              <View style={s.settingInfo}>
                <Text style={s.settingLabel}>Season End</Text>
                <Text style={s.settingValue}>{formatDate(season.end_date)}</Text>
              </View>
              <Ionicons name="calendar" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Season Fees - NEW COMPONENT */}
        <View style={s.section}>
          <SeasonFeesManager seasonId={season.id} seasonName={season.name} />
        </View>

        {/* Team Settings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Team Roster Limits</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.settingRow} onPress={() => openEditModal('min_players_per_team', season.min_players_per_team || 9, 'Minimum Players')}>
              <View style={s.settingInfo}><Text style={s.settingLabel}>Minimum Players</Text><Text style={s.settingDesc}>Alert when below</Text></View>
              <Text style={s.settingAmount}>{season.min_players_per_team || 9}</Text>
            </TouchableOpacity>
            <View style={s.divider} />
            <TouchableOpacity style={s.settingRow} onPress={() => openEditModal('max_players_per_team', season.max_players_per_team || 12, 'Maximum Players')}>
              <View style={s.settingInfo}><Text style={s.settingLabel}>Maximum Players</Text><Text style={s.settingDesc}>Roster cap</Text></View>
              <Text style={s.settingAmount}>{season.max_players_per_team || 12}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Age Groups */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Age Groups</Text>
            <TouchableOpacity style={s.addButton} onPress={() => setAgeGroupModalVisible(true)}>
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={s.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          {ageGroups.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyCardText}>No age groups created</Text>
              <TouchableOpacity style={s.emptyCardButton} onPress={() => setAgeGroupModalVisible(true)}>
                <Text style={s.emptyCardButtonText}>Create Age Group</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.card}>
              {ageGroups.map((ag, index) => (
                <React.Fragment key={ag.id}>
                  {index > 0 && <View style={s.divider} />}
                  <View style={s.ageGroupRow}>
                    <View style={s.ageGroupInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={s.ageGroupName}>{ag.name}</Text>
                        {ag.gender && ag.gender !== 'coed' && (
                          <View style={[s.genderTag, { backgroundColor: ag.gender === 'boys' ? '#0EA5E920' : '#FF6B9520' }]}>
                            <Text style={{ fontSize: 10, color: ag.gender === 'boys' ? '#0EA5E9' : '#FF6B95' }}>
                              {ag.gender === 'boys' ? '♂' : '♀'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.ageGroupMeta}>{getAgeGroupSubtitle(ag)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteAgeGroup(ag)}>
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </React.Fragment>
              ))}
            </View>
          )}
        </View>

        {/* Teams Overview */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Teams</Text>
            <TouchableOpacity style={s.addButton} onPress={() => router.push('/(tabs)/teams')}>
              <Text style={s.addButtonText}>Manage</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          {teams.length === 0 ? (
            <View style={s.emptyCard}><Text style={s.emptyCardText}>No teams created</Text></View>
          ) : (
            <View style={s.card}>
              {teams.slice(0, 5).map((team, index) => {
                const minPlayers = season.min_players_per_team || 9;
                const maxPlayers = season.max_players_per_team || 12;
                const isLow = team.player_count < minPlayers && team.player_count > 0;
                const isFull = team.player_count >= maxPlayers;
                const isGood = team.player_count >= minPlayers && team.player_count < maxPlayers;
                
                return (
                  <React.Fragment key={team.id}>
                    {index > 0 && <View style={s.divider} />}
                    <View style={s.teamRow}>
                      <View style={s.teamInfo}>
                        <Text style={s.teamName}>{team.name}</Text>
                        {(isLow || isFull || isGood) && (
                          <View style={[s.teamBadge, { backgroundColor: isLow ? '#E8913A20' : isFull ? '#0EA5E920' : '#22C55E20' }]}>
                            <Ionicons name={isLow ? 'warning' : 'checkmark-circle'} size={12} color={isLow ? '#E8913A' : isFull ? '#0EA5E9' : '#22C55E'} />
                            <Text style={[s.teamBadgeText, { color: isLow ? '#E8913A' : isFull ? '#0EA5E9' : '#22C55E' }]}>{isLow ? 'Low' : isFull ? 'Full' : 'Good'}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[s.teamCount, { color: isLow ? '#E8913A' : isFull ? '#0EA5E9' : isGood ? '#22C55E' : colors.textSecondary }]}>{team.player_count}/{maxPlayers}</Text>
                    </View>
                  </React.Fragment>
                );
              })}
              {teams.length > 5 && (
                <TouchableOpacity style={s.viewAllBtn} onPress={() => router.push('/(tabs)/teams')}>
                  <Text style={s.viewAllText}>View all {teams.length} teams</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Picker Modal (iOS) */}
      {Platform.OS === 'ios' && (
        <Modal visible={datePickerVisible} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.datePickerModal}>
              <Text style={s.datePickerTitle}>
                {datePickerField === 'start_date' ? 'Season Start Date' : 'Season End Date'}
              </Text>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={{ height: 150 }}
              />
              <View style={s.datePickerButtons}>
                <TouchableOpacity style={s.datePickerCancel} onPress={() => setDatePickerVisible(false)}>
                  <Text style={s.datePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.datePickerConfirm} onPress={confirmDate}>
                  <Text style={s.datePickerConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker (Android) */}
      {Platform.OS === 'android' && datePickerVisible && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.editModal}>
            <Text style={s.editModalTitle}>{editLabel}</Text>
            <TextInput
              style={s.editInput}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
            />
            <View style={s.editModalButtons}>
              <TouchableOpacity style={s.editModalCancel} onPress={() => setEditModalVisible(false)}>
                <Text style={s.editModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.editModalSave} onPress={saveEdit} disabled={saving}>
                <Text style={s.editModalSaveText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Age Group Modal */}
      <Modal visible={ageGroupModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.ageGroupModal}>
            <View style={s.ageGroupModalHeader}>
              <Text style={s.ageGroupModalTitle}>Create Age Group</Text>
              <TouchableOpacity onPress={() => { setAgeGroupModalVisible(false); resetAgeGroupForm(); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Group Type */}
              <Text style={s.inputLabel}>Group By</Text>
              <View style={s.typeRow}>
                <TouchableOpacity style={[s.typeBtn, groupType === 'grade' && s.typeBtnSelected]} onPress={() => setGroupType('grade')}>
                  <Ionicons name="school" size={18} color={groupType === 'grade' ? colors.primary : colors.textSecondary} />
                  <Text style={[s.typeBtnText, groupType === 'grade' && s.typeBtnTextSelected]}>Grade</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.typeBtn, groupType === 'age' && s.typeBtnSelected]} onPress={() => setGroupType('age')}>
                  <Ionicons name="calendar" size={18} color={groupType === 'age' ? colors.primary : colors.textSecondary} />
                  <Text style={[s.typeBtnText, groupType === 'age' && s.typeBtnTextSelected]}>Age (12U)</Text>
                </TouchableOpacity>
              </View>

              {/* Grade or Age inputs */}
              {groupType === 'grade' ? (
                <View style={s.rangeRow}>
                  <View style={s.rangeInput}>
                    <Text style={s.inputLabel}>Grade</Text>
                    <TextInput style={s.textInput} value={minGrade} onChangeText={setMinGrade} placeholder="4" placeholderTextColor={colors.textSecondary} keyboardType="numeric" />
                  </View>
                  <View style={s.rangeInput}>
                    <Text style={s.inputLabel}>To Grade (optional)</Text>
                    <TextInput style={s.textInput} value={maxGrade} onChangeText={setMaxGrade} placeholder="Same" placeholderTextColor={colors.textSecondary} keyboardType="numeric" />
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={s.inputLabel}>Max Age (e.g., 12 for 12U)</Text>
                  <TextInput style={s.textInput} value={maxAge} onChangeText={setMaxAge} placeholder="12" placeholderTextColor={colors.textSecondary} keyboardType="numeric" />
                </View>
              )}

              {/* Gender */}
              <Text style={s.inputLabel}>Gender</Text>
              <View style={s.genderRow}>
                {[{ key: 'coed', label: 'Coed' }, { key: 'boys', label: 'Boys' }, { key: 'girls', label: 'Girls' }].map((g) => (
                  <TouchableOpacity key={g.key} style={[s.genderBtn, gender === g.key && s.genderBtnSelected]} onPress={() => setGender(g.key)}>
                    <Text style={[s.genderBtnText, gender === g.key && s.genderBtnTextSelected]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Skill Level */}
              <Text style={s.inputLabel}>Skill Level (optional)</Text>
              <View style={s.skillRow}>
                {[{ key: '', label: 'None' }, { key: 'Recreational', label: 'Rec' }, { key: 'Competitive', label: 'Competitive' }].map((sk) => (
                  <TouchableOpacity key={sk.key} style={[s.skillBtn, skillLevel === sk.key && s.skillBtnSelected]} onPress={() => setSkillLevel(sk.key)}>
                    <Text style={[s.skillBtnText, skillLevel === sk.key && s.skillBtnTextSelected]}>{sk.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Preview */}
              {generateAgeGroupName() && (
                <View style={s.previewBox}>
                  <Text style={s.previewLabel}>Preview:</Text>
                  <Text style={s.previewName}>{generateAgeGroupName()}</Text>
                </View>
              )}

              {/* Create Button */}
              <TouchableOpacity style={s.createBtn} onPress={createAgeGroup}>
                <Text style={s.createBtnText}>Create Age Group</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================
const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.screenPadding },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: 16, marginTop: 12 },

  seasonHeader: { alignItems: 'center', marginBottom: 20 },
  sportBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 8 },
  sportBadgeText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  seasonName: { ...displayTextStyle, fontSize: 24, color: colors.text, marginBottom: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 13, fontWeight: '600' },

  alertCard: { backgroundColor: '#E8913A15', borderRadius: radii.card, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E8913A' },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  alertTitle: { color: '#E8913A', fontWeight: '700', fontSize: 14, marginLeft: 8 },
  alertDescription: { color: colors.text, fontSize: 13, marginBottom: 8 },
  alertItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.card, padding: 10, borderRadius: 8, marginTop: 6 },
  alertItemText: { color: colors.text, fontSize: 13 },
  alertItemCount: { color: '#E8913A', fontSize: 13, fontWeight: '600' },
  alertMore: { color: colors.textSecondary, fontSize: 12, marginTop: 8, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: radii.card, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card },
  statNumber: { ...displayTextStyle, fontSize: 28, color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },

  toggleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: radii.card, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  toggleText: { marginLeft: 12 },
  toggleTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  toggleSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  toggleSwitch: { width: 50, height: 30, borderRadius: 15, backgroundColor: colors.border, padding: 2 },
  toggleSwitchOn: { backgroundColor: '#22C55E' },
  toggleKnob: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff' },
  toggleKnobOn: { marginLeft: 'auto' },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.2 },
  sectionSubtitle: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  card: { backgroundColor: '#FFF', borderRadius: radii.card, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },

  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, color: colors.text, fontWeight: '500' },
  settingDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  settingValue: { fontSize: 14, color: colors.textSecondary },
  settingAmount: { fontSize: 16, color: colors.primary, fontWeight: '600' },

  ageGroupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  ageGroupInfo: { flex: 1 },
  ageGroupName: { fontSize: 15, color: colors.text, fontWeight: '600' },
  ageGroupMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  genderTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  teamRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  teamInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamName: { fontSize: 15, color: colors.text, fontWeight: '500' },
  teamBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  teamBadgeText: { fontSize: 11, fontWeight: '600', marginLeft: 4 },
  teamCount: { fontSize: 16, fontWeight: '600' },
  viewAllBtn: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  viewAllText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  addButton: { flexDirection: 'row', alignItems: 'center' },
  addButtonText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  emptyCard: { backgroundColor: '#FFF', borderRadius: radii.card, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card },
  emptyCardText: { color: colors.textSecondary, fontSize: 14 },
  emptyCardButton: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primary + '20', borderRadius: 8 },
  emptyCardButtonText: { color: colors.primary, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  
  datePickerModal: { backgroundColor: colors.card || '#FFF', borderRadius: radii.card, padding: 24, width: '100%', maxWidth: 350 },
  datePickerTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 16, textAlign: 'center' },
  datePickerButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  datePickerCancel: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center' },
  datePickerCancelText: { color: colors.text, fontWeight: '600' },
  datePickerConfirm: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  datePickerConfirmText: { color: colors.background, fontWeight: '600' },

  editModal: { backgroundColor: colors.card || '#FFF', borderRadius: radii.card, padding: 24, width: '100%', maxWidth: 350 },
  editModalTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 16, textAlign: 'center' },
  editInput: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 18, color: colors.text, borderWidth: 1, borderColor: colors.border, textAlign: 'center' },
  editModalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  editModalCancel: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center' },
  editModalCancelText: { color: colors.text, fontWeight: '600' },
  editModalSave: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  editModalSaveText: { color: colors.background, fontWeight: '600' },

  ageGroupModal: { backgroundColor: colors.card || '#FFF', borderRadius: radii.card, padding: 24, width: '100%', maxWidth: 400, maxHeight: '80%' },
  ageGroupModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  ageGroupModalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },

  inputLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 8, marginTop: 16 },
  textInput: { backgroundColor: colors.background, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },

  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  typeBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  typeBtnText: { fontSize: 14, color: colors.textSecondary },
  typeBtnTextSelected: { color: colors.primary, fontWeight: '600' },

  rangeRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  rangeInput: { flex: 1 },

  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  genderBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  genderBtnText: { fontSize: 14, color: colors.textSecondary },
  genderBtnTextSelected: { color: colors.primary, fontWeight: '600' },

  skillRow: { flexDirection: 'row', gap: 8 },
  skillBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  skillBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  skillBtnText: { fontSize: 13, color: colors.textSecondary },
  skillBtnTextSelected: { color: colors.primary, fontWeight: '600' },

  previewBox: { marginTop: 20, padding: 16, backgroundColor: colors.background, borderRadius: 12, alignItems: 'center' },
  previewLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  previewName: { fontSize: 18, fontWeight: 'bold', color: colors.primary },

  createBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 24, marginBottom: 20 },
  createBtnText: { color: colors.background, fontSize: 16, fontWeight: 'bold' },
});
