import { useAuth } from '@/lib/auth';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { createGlassStyle, useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type CoachRecord = {
  id: string;
  profile_id: string;
  season_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  specialties: string | null;
  experience_level: string | null;
  status: string | null;
  background_check_status: string | null;
  waiver_signed: boolean | null;
  code_of_conduct_signed: boolean | null;
  team_coaches: {
    team_id: string;
    role: string;
    teams: { name: string; color: string | null } | null;
  }[];
};

export default function CoachProfileScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();

  const [coach, setCoach] = useState<CoachRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');

  const s = createStyles(colors);

  useEffect(() => {
    if (user?.id && workingSeason?.id) fetchCoachProfile();
  }, [user?.id, workingSeason?.id]);

  const fetchCoachProfile = async () => {
    if (!user?.id || !workingSeason?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('coaches')
        .select('*, team_coaches(team_id, role, teams(name, color))')
        .eq('profile_id', user.id)
        .eq('season_id', workingSeason.id)
        .maybeSingle();

      if (error) {
        if (__DEV__) console.error('Error fetching coach profile:', error);
      }

      if (data) {
        setCoach(data as CoachRecord);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setSpecialties(data.specialties || '');
        setExperienceLevel(data.experience_level || '');
      }
    } catch (err) {
      if (__DEV__) console.error('Error loading coach profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!coach?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('coaches')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          specialties: specialties.trim() || null,
          experience_level: experienceLevel.trim() || null,
        })
        .eq('id', coach.id);

      if (error) throw error;

      Alert.alert('Saved', 'Your profile has been updated.');
      fetchCoachProfile();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'approved':
      case 'completed':
      case 'cleared':
        return colors.success;
      case 'pending':
      case 'in_progress':
        return colors.warning;
      case 'rejected':
      case 'failed':
        return colors.danger;
      default:
        return colors.textMuted;
    }
  };

  const getStatusLabel = (status: string | null) => {
    if (!status) return 'Not Set';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!coach) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]}>
        <View style={s.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.pageTitle}>My Profile</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.emptyWrap}>
          <Ionicons name="person-circle-outline" size={64} color={colors.textMuted} />
          <Text style={s.emptyTitle}>No Coach Profile</Text>
          <Text style={s.emptySubtext}>
            No coach record found for the current season.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]}>
      {/* Header */}
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.pageTitle}>My Profile</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={s.avatarSection}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Ionicons name="person" size={48} color={colors.textMuted} />
            </View>
          )}
          <Text style={s.coachName}>{firstName} {lastName}</Text>
          {coach.status && (
            <View style={[s.statusBadge, { backgroundColor: getStatusColor(coach.status) + '20' }]}>
              <Text style={[s.statusBadgeText, { color: getStatusColor(coach.status) }]}>
                {getStatusLabel(coach.status)}
              </Text>
            </View>
          )}
        </View>

        {/* Editable Fields */}
        <Text style={s.sectionTitle}>PERSONAL INFORMATION</Text>
        <View style={s.glassCard}>
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>First Name</Text>
            <TextInput
              style={s.fieldInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={s.fieldDivider} />
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>Last Name</Text>
            <TextInput
              style={s.fieldInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={s.fieldDivider} />
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>Email</Text>
            <TextInput
              style={s.fieldInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={s.fieldDivider} />
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>Phone</Text>
            <TextInput
              style={s.fieldInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Coaching Info */}
        <Text style={s.sectionTitle}>COACHING DETAILS</Text>
        <View style={s.glassCard}>
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>Specialties</Text>
            <TextInput
              style={s.fieldInput}
              value={specialties}
              onChangeText={setSpecialties}
              placeholder="e.g. Hitting, Defense"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={s.fieldDivider} />
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>Experience</Text>
            <TextInput
              style={s.fieldInput}
              value={experienceLevel}
              onChangeText={setExperienceLevel}
              placeholder="e.g. 5 years, Varsity"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Read-Only Status Fields */}
        <Text style={s.sectionTitle}>COMPLIANCE STATUS</Text>
        <View style={s.glassCard}>
          <View style={s.statusRow}>
            <View style={s.statusInfo}>
              <Ionicons name="shield-checkmark" size={20} color={getStatusColor(coach.background_check_status)} />
              <Text style={s.statusLabel}>Background Check</Text>
            </View>
            <View style={[s.statusPill, { backgroundColor: getStatusColor(coach.background_check_status) + '20' }]}>
              <Text style={[s.statusPillText, { color: getStatusColor(coach.background_check_status) }]}>
                {getStatusLabel(coach.background_check_status)}
              </Text>
            </View>
          </View>
          <View style={s.fieldDivider} />
          <View style={s.statusRow}>
            <View style={s.statusInfo}>
              <Ionicons
                name={coach.waiver_signed ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={coach.waiver_signed ? colors.success : colors.textMuted}
              />
              <Text style={s.statusLabel}>Waiver Signed</Text>
            </View>
            <Text style={[s.statusValue, { color: coach.waiver_signed ? colors.success : colors.textMuted }]}>
              {coach.waiver_signed ? 'Yes' : 'No'}
            </Text>
          </View>
          <View style={s.fieldDivider} />
          <View style={s.statusRow}>
            <View style={s.statusInfo}>
              <Ionicons
                name={coach.code_of_conduct_signed ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={coach.code_of_conduct_signed ? colors.success : colors.textMuted}
              />
              <Text style={s.statusLabel}>Code of Conduct</Text>
            </View>
            <Text style={[s.statusValue, { color: coach.code_of_conduct_signed ? colors.success : colors.textMuted }]}>
              {coach.code_of_conduct_signed ? 'Signed' : 'Not Signed'}
            </Text>
          </View>
        </View>

        {/* Assigned Teams */}
        {coach.team_coaches && coach.team_coaches.length > 0 && (
          <>
            <Text style={s.sectionTitle}>ASSIGNED TEAMS</Text>
            <View style={s.glassCard}>
              {coach.team_coaches.map((tc, index) => (
                <React.Fragment key={tc.team_id}>
                  {index > 0 && <View style={s.fieldDivider} />}
                  <View style={s.teamRow}>
                    <View style={[s.teamColorDot, { backgroundColor: tc.teams?.color || colors.primary }]} />
                    <Text style={s.teamName}>{tc.teams?.name || 'Unknown Team'}</Text>
                    <View style={[s.roleBadge, tc.role === 'head' ? s.roleBadgeHead : s.roleBadgeAssistant]}>
                      <Text style={s.roleBadgeText}>
                        {tc.role === 'head' ? 'Head Coach' : 'Assistant'}
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        {/* Save Button */}
        <TouchableOpacity style={s.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#000" />
              <Text style={s.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  scrollContent: {
    padding: 16,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary + '40',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.glassCard,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  coachName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Section Titles
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },

  // Glass Card
  glassCard: {
    backgroundColor: colors.glassCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  // Field Rows
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    padding: 0,
    textAlign: 'right',
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.border + '40',
    marginHorizontal: 16,
  },

  // Status Rows
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Team Rows
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  teamColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  teamName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeHead: {
    backgroundColor: colors.success + '20',
  },
  roleBadgeAssistant: {
    backgroundColor: colors.info + '20',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },

  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
});
