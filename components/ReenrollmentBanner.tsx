import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type ExistingChild = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  age_group_name: string | null;
  season_id: string;
  season_name: string;
  parent_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
};

type OpenSeason = {
  id: string;
  name: string;
  age_groups: { id: string; name: string }[];
};

type ChildToEnroll = ExistingChild & {
  selected: boolean;
  targetSeasonId: string;
  targetAgeGroupId: string;
};

export default function ReenrollmentBanner() {
  const { colors } = useTheme();
  const { profile, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [openSeasons, setOpenSeasons] = useState<OpenSeason[]>([]);
  const [existingChildren, setExistingChildren] = useState<ExistingChild[]>([]);
  const [childrenToEnroll, setChildrenToEnroll] = useState<ChildToEnroll[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');

  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildFirstName, setNewChildFirstName] = useState('');
  const [newChildLastName, setNewChildLastName] = useState('');
  const [newChildDOB, setNewChildDOB] = useState('');
  const [newChildAgeGroup, setNewChildAgeGroup] = useState('');

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;

    try {
      const orgId = profile?.current_organization_id;
      if (!orgId) return;

      const { data: seasons } = await supabase
        .from('seasons')
        .select('id, name, age_groups (id, name)')
        .eq('organization_id', orgId)
        .eq('registration_open', true);

      if (!seasons || seasons.length === 0) {
        setLoading(false);
        return;
      }

      setOpenSeasons(seasons);
      setSelectedSeasonId(seasons[0].id);

      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);

      if (!guardianLinks || guardianLinks.length === 0) {
        setLoading(false);
        return;
      }

      const playerIds = guardianLinks.map(g => g.player_id);

      const { data: players } = await supabase
        .from('players')
        .select(`
          id, first_name, last_name, date_of_birth, season_id,
          parent_phone, emergency_contact_name, emergency_contact_phone,
          emergency_contact_relationship,
          seasons (id, name),
          age_groups (id, name)
        `)
        .in('id', playerIds);

      if (!players) {
        setLoading(false);
        return;
      }

      const openSeasonIds = seasons.map(s => s.id);
      const childrenMap = new Map<string, ExistingChild>();

      players.forEach(player => {
        const key = (player.first_name + '-' + player.last_name).toLowerCase();
        const season = player.seasons as any;
        const ageGroup = player.age_groups as any;
        const alreadyInOpenSeason = openSeasonIds.includes(player.season_id);

        if (!alreadyInOpenSeason && !childrenMap.has(key)) {
          childrenMap.set(key, {
            id: player.id,
            first_name: player.first_name,
            last_name: player.last_name,
            date_of_birth: player.date_of_birth,
            age_group_name: ageGroup?.name || null,
            season_id: player.season_id,
            season_name: season?.name || 'Unknown',
            parent_phone: player.parent_phone,
            emergency_contact_name: player.emergency_contact_name,
            emergency_contact_phone: player.emergency_contact_phone,
            emergency_contact_relationship: player.emergency_contact_relationship,
          });
        }
      });

      const uniqueChildren = Array.from(childrenMap.values());
      setExistingChildren(uniqueChildren);

      setChildrenToEnroll(uniqueChildren.map(child => ({
        ...child,
        selected: true,
        targetSeasonId: seasons[0].id,
        targetAgeGroupId: '',
      })));

    } catch (error) {
      if (__DEV__) console.error('Error fetching re-enrollment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleChildSelection = (childId: string) => {
    setChildrenToEnroll(prev =>
      prev.map(child =>
        child.id === childId ? { ...child, selected: !child.selected } : child
      )
    );
  };

  const updateChildAgeGroup = (childId: string, ageGroupId: string) => {
    setChildrenToEnroll(prev =>
      prev.map(child =>
        child.id === childId ? { ...child, targetAgeGroupId: ageGroupId } : child
      )
    );
  };

  const handleReenroll = async () => {
    const selectedChildren = childrenToEnroll.filter(c => c.selected);
    
    if (selectedChildren.length === 0) {
      Alert.alert('Select Children', 'Please select at least one child to re-enroll.');
      return;
    }

    setEnrolling(true);

    try {
      const targetSeason = openSeasons.find(s => s.id === selectedSeasonId);

      for (const child of selectedChildren) {
        const { data: newPlayer, error: playerError } = await supabase
          .from('players')
          .insert({
            first_name: child.first_name,
            last_name: child.last_name,
            date_of_birth: child.date_of_birth,
            season_id: selectedSeasonId,
            age_group_id: child.targetAgeGroupId || null,
            parent_name: profile?.full_name,
            parent_email: profile?.email,
            parent_phone: child.parent_phone,
            emergency_contact_name: child.emergency_contact_name,
            emergency_contact_phone: child.emergency_contact_phone,
            emergency_contact_relationship: child.emergency_contact_relationship,
            status: 'registered',
          })
          .select()
          .single();

        if (playerError) {
          if (__DEV__) console.error('Error creating player:', playerError);
          continue;
        }

        if (newPlayer && user?.id) {
          await supabase.from('player_guardians').insert({
            player_id: newPlayer.id,
            guardian_id: user.id,
            relationship: 'parent',
            is_primary: true,
            can_pickup: true,
          });
        }
      }

      Alert.alert(
        'Re-enrollment Complete!',
        selectedChildren.length + ' ' + (selectedChildren.length === 1 ? 'child has' : 'children have') + ' been registered for ' + targetSeason?.name + '.',
        [{ text: 'OK', onPress: () => { setShowModal(false); fetchData(); } }]
      );

    } catch (error: any) {
      if (__DEV__) console.error('Re-enrollment error:', error);
      Alert.alert('Error', 'Failed to complete re-enrollment. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleAddNewChild = async () => {
    if (!newChildFirstName.trim() || !newChildLastName.trim()) {
      Alert.alert('Missing Info', 'Please enter the child\'s first and last name.');
      return;
    }

    setEnrolling(true);

    try {
      const { data: newPlayer, error } = await supabase
        .from('players')
        .insert({
          first_name: newChildFirstName.trim(),
          last_name: newChildLastName.trim(),
          date_of_birth: newChildDOB || null,
          season_id: selectedSeasonId,
          age_group_id: newChildAgeGroup || null,
          parent_name: profile?.full_name,
          parent_email: profile?.email,
          status: 'registered',
        })
        .select()
        .single();

      if (error) throw error;

      if (newPlayer && user?.id) {
        await supabase.from('player_guardians').insert({
          player_id: newPlayer.id,
          guardian_id: user.id,
          relationship: 'parent',
          is_primary: true,
          can_pickup: true,
        });
      }

      const targetSeason = openSeasons.find(s => s.id === selectedSeasonId);
      Alert.alert(
        'Child Registered!',
        newChildFirstName + ' has been registered for ' + targetSeason?.name + '.',
        [{ 
          text: 'OK', 
          onPress: () => { 
            setShowAddChild(false);
            setNewChildFirstName('');
            setNewChildLastName('');
            setNewChildDOB('');
            setNewChildAgeGroup('');
            fetchData();
          } 
        }]
      );

    } catch (error: any) {
      if (__DEV__) console.error('Add child error:', error);
      Alert.alert('Error', 'Failed to register child. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const s = createStyles(colors);

  if (loading || openSeasons.length === 0) {
    return null;
  }

  const selectedSeason = openSeasons.find(s => s.id === selectedSeasonId);
  const selectedCount = childrenToEnroll.filter(c => c.selected).length;

  if (existingChildren.length === 0) {
    return (
      <TouchableOpacity style={s.banner} onPress={() => setShowModal(true)}>
        <View style={s.bannerIcon}>
          <Ionicons name="add-circle" size={32} color={colors.primary} />
        </View>
        <View style={s.bannerContent}>
          <Text style={s.bannerTitle}>{openSeasons[0].name} Registration Open!</Text>
          <Text style={s.bannerSubtitle}>Tap to register your child</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.primary} />

        <Modal visible={showModal} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Register Your Child</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={s.modalScroll}>
                {openSeasons.length > 1 && (
                  <View style={s.seasonSelector}>
                    <Text style={s.sectionLabel}>Select Season</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {openSeasons.map(season => (
                        <TouchableOpacity
                          key={season.id}
                          style={[s.seasonChip, selectedSeasonId === season.id && s.seasonChipActive]}
                          onPress={() => setSelectedSeasonId(season.id)}
                        >
                          <Text style={[s.seasonChipText, selectedSeasonId === season.id && s.seasonChipTextActive]}>
                            {season.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>First Name *</Text>
                  <TextInput
                    style={s.input}
                    placeholder="First name"
                    placeholderTextColor={colors.textMuted}
                    value={newChildFirstName}
                    onChangeText={setNewChildFirstName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Last Name *</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Last name"
                    placeholderTextColor={colors.textMuted}
                    value={newChildLastName}
                    onChangeText={setNewChildLastName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Date of Birth</Text>
                  <TextInput
                    style={s.input}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor={colors.textMuted}
                    value={newChildDOB}
                    onChangeText={setNewChildDOB}
                  />
                </View>

                {selectedSeason?.age_groups && selectedSeason.age_groups.length > 0 && (
                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Age Group</Text>
                    <View style={s.ageGroupOptions}>
                      <TouchableOpacity
                        style={[s.ageGroupChip, !newChildAgeGroup && s.ageGroupChipActive]}
                        onPress={() => setNewChildAgeGroup('')}
                      >
                        <Text style={[s.ageGroupChipText, !newChildAgeGroup && s.ageGroupChipTextActive]}>
                          Assign Later
                        </Text>
                      </TouchableOpacity>
                      {selectedSeason.age_groups.map(ag => (
                        <TouchableOpacity
                          key={ag.id}
                          style={[s.ageGroupChip, newChildAgeGroup === ag.id && s.ageGroupChipActive]}
                          onPress={() => setNewChildAgeGroup(ag.id)}
                        >
                          <Text style={[s.ageGroupChipText, newChildAgeGroup === ag.id && s.ageGroupChipTextActive]}>
                            {ag.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={s.modalFooter}>
                <TouchableOpacity
                  style={[s.enrollBtn, enrolling && s.enrollBtnDisabled]}
                  onPress={handleAddNewChild}
                  disabled={enrolling}
                >
                  {enrolling ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#000" />
                      <Text style={s.enrollBtnText}>Register Child</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity style={s.banner} onPress={() => setShowModal(true)}>
        <View style={s.bannerIcon}>
          <Ionicons name="refresh-circle" size={32} color={colors.success} />
        </View>
        <View style={s.bannerContent}>
          <Text style={s.bannerTitle}>{openSeasons[0].name} Registration Open!</Text>
          <Text style={s.bannerSubtitle}>
            Re-enroll {existingChildren.length} {existingChildren.length === 1 ? 'child' : 'children'} for the new season
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.success} />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Re-enroll for {selectedSeason?.name}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setShowAddChild(false); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {!showAddChild ? (
              <>
                <ScrollView style={s.modalScroll}>
                  {openSeasons.length > 1 && (
                    <View style={s.seasonSelector}>
                      <Text style={s.sectionLabel}>Select Season</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {openSeasons.map(season => (
                          <TouchableOpacity
                            key={season.id}
                            style={[s.seasonChip, selectedSeasonId === season.id && s.seasonChipActive]}
                            onPress={() => setSelectedSeasonId(season.id)}
                          >
                            <Text style={[s.seasonChipText, selectedSeasonId === season.id && s.seasonChipTextActive]}>
                              {season.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <Text style={s.sectionLabel}>Select Children to Re-enroll</Text>

                  {childrenToEnroll.map(child => (
                    <TouchableOpacity
                      key={child.id}
                      style={[s.childCard, child.selected && s.childCardSelected]}
                      onPress={() => toggleChildSelection(child.id)}
                    >
                      <View style={s.childCheckbox}>
                        <Ionicons
                          name={child.selected ? 'checkbox' : 'square-outline'}
                          size={24}
                          color={child.selected ? colors.success : colors.textMuted}
                        />
                      </View>
                      <View style={s.childInfo}>
                        <Text style={s.childName}>{child.first_name} {child.last_name}</Text>
                        <Text style={s.childMeta}>
                          Previously: {child.season_name}
                          {child.age_group_name ? ' - ' + child.age_group_name : ''}
                        </Text>

                        {child.selected && selectedSeason?.age_groups && selectedSeason.age_groups.length > 0 && (
                          <View style={s.childAgeGroupSelector}>
                            <Text style={s.childAgeGroupLabel}>Age Group:</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              <TouchableOpacity
                                style={[s.ageGroupChipSmall, !child.targetAgeGroupId && s.ageGroupChipSmallActive]}
                                onPress={() => updateChildAgeGroup(child.id, '')}
                              >
                                <Text style={[s.ageGroupChipSmallText, !child.targetAgeGroupId && s.ageGroupChipSmallTextActive]}>
                                  Auto
                                </Text>
                              </TouchableOpacity>
                              {selectedSeason.age_groups.map(ag => (
                                <TouchableOpacity
                                  key={ag.id}
                                  style={[s.ageGroupChipSmall, child.targetAgeGroupId === ag.id && s.ageGroupChipSmallActive]}
                                  onPress={() => updateChildAgeGroup(child.id, ag.id)}
                                >
                                  <Text style={[s.ageGroupChipSmallText, child.targetAgeGroupId === ag.id && s.ageGroupChipSmallTextActive]}>
                                    {ag.name}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity style={s.addChildBtn} onPress={() => setShowAddChild(true)}>
                    <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                    <Text style={s.addChildBtnText}>Add Another Child</Text>
                  </TouchableOpacity>
                </ScrollView>

                <View style={s.modalFooter}>
                  <TouchableOpacity
                    style={[s.enrollBtn, (selectedCount === 0 || enrolling) && s.enrollBtnDisabled]}
                    onPress={handleReenroll}
                    disabled={selectedCount === 0 || enrolling}
                  >
                    {enrolling ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#000" />
                        <Text style={s.enrollBtnText}>
                          Re-enroll {selectedCount} {selectedCount === 1 ? 'Child' : 'Children'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <ScrollView style={s.modalScroll}>
                  <TouchableOpacity style={s.backBtn} onPress={() => setShowAddChild(false)}>
                    <Ionicons name="arrow-back" size={20} color={colors.text} />
                    <Text style={s.backBtnText}>Back to selection</Text>
                  </TouchableOpacity>

                  <Text style={s.sectionLabel}>Add New Child</Text>

                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>First Name *</Text>
                    <TextInput
                      style={s.input}
                      placeholder="First name"
                      placeholderTextColor={colors.textMuted}
                      value={newChildFirstName}
                      onChangeText={setNewChildFirstName}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Last Name *</Text>
                    <TextInput
                      style={s.input}
                      placeholder="Last name"
                      placeholderTextColor={colors.textMuted}
                      value={newChildLastName}
                      onChangeText={setNewChildLastName}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Date of Birth</Text>
                    <TextInput
                      style={s.input}
                      placeholder="MM/DD/YYYY"
                      placeholderTextColor={colors.textMuted}
                      value={newChildDOB}
                      onChangeText={setNewChildDOB}
                    />
                  </View>

                  {selectedSeason?.age_groups && selectedSeason.age_groups.length > 0 && (
                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>Age Group</Text>
                      <View style={s.ageGroupOptions}>
                        <TouchableOpacity
                          style={[s.ageGroupChip, !newChildAgeGroup && s.ageGroupChipActive]}
                          onPress={() => setNewChildAgeGroup('')}
                        >
                          <Text style={[s.ageGroupChipText, !newChildAgeGroup && s.ageGroupChipTextActive]}>
                            Assign Later
                          </Text>
                        </TouchableOpacity>
                        {selectedSeason.age_groups.map(ag => (
                          <TouchableOpacity
                            key={ag.id}
                            style={[s.ageGroupChip, newChildAgeGroup === ag.id && s.ageGroupChipActive]}
                            onPress={() => setNewChildAgeGroup(ag.id)}
                          >
                            <Text style={[s.ageGroupChipText, newChildAgeGroup === ag.id && s.ageGroupChipTextActive]}>
                              {ag.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </ScrollView>

                <View style={s.modalFooter}>
                  <TouchableOpacity
                    style={[s.enrollBtn, enrolling && s.enrollBtnDisabled]}
                    onPress={handleAddNewChild}
                    disabled={enrolling}
                  >
                    {enrolling ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <>
                        <Ionicons name="add-circle" size={20} color="#000" />
                        <Text style={s.enrollBtnText}>Add Child</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  bannerIcon: { marginRight: 12 },
  bannerContent: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 },
  bannerSubtitle: { fontSize: 13, color: colors.textMuted },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  modalScroll: { padding: 16 },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },

  seasonSelector: { marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 12, letterSpacing: 0.5 },
  seasonChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.background, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  seasonChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  seasonChipText: { fontSize: 14, color: colors.text },
  seasonChipTextActive: { color: colors.primary, fontWeight: '600' },

  childCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.background, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  childCardSelected: { borderColor: colors.success, backgroundColor: colors.success + '10' },
  childCheckbox: { marginRight: 12, marginTop: 2 },
  childInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  childMeta: { fontSize: 13, color: colors.textMuted },
  childAgeGroupSelector: { marginTop: 12 },
  childAgeGroupLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },

  ageGroupOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ageGroupChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  ageGroupChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  ageGroupChipText: { fontSize: 13, color: colors.text },
  ageGroupChipTextActive: { color: colors.primary, fontWeight: '600' },
  ageGroupChipSmall: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.card, marginRight: 6, borderWidth: 1, borderColor: colors.border },
  ageGroupChipSmallActive: { backgroundColor: colors.success + '20', borderColor: colors.success },
  ageGroupChipSmallText: { fontSize: 12, color: colors.textMuted },
  ageGroupChipSmallTextActive: { color: colors.success, fontWeight: '600' },

  addChildBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 8 },
  addChildBtnText: { fontSize: 15, color: colors.primary, fontWeight: '500' },

  enrollBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.success, paddingVertical: 16, borderRadius: 12 },
  enrollBtnDisabled: { opacity: 0.6 },
  enrollBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  backBtnText: { fontSize: 15, color: colors.text },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
});
