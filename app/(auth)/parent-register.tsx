import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Step = 'account' | 'child' | 'review';

type AgeGroup = {
  id: string;
  name: string;
  min_age: number;
  max_age: number;
};

type Season = {
  id: string;
  name: string;
  age_groups: AgeGroup[];
};

export default function ParentRegisterScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    inviteId?: string;
    teamCodeId?: string;
    email?: string;
    teamId?: string;
    teamName?: string;
    skipApproval?: string;
  }>();
  
  const [step, setStep] = useState<Step>('account');
  const [loading, setLoading] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);

  // Invite data
  const hasInvite = !!(params.inviteId || params.teamCodeId);
  const skipApproval = params.skipApproval === 'true';

  // Account Info
  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Child Info
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [childDOB, setChildDOB] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedAgeGroupId, setSelectedAgeGroupId] = useState<string>('');
  const [preSelectedTeamId, setPreSelectedTeamId] = useState<string>(params.teamId || '');
  const [preSelectedTeamName, setPreSelectedTeamName] = useState<string>(params.teamName || '');
  
  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');

  // COPPA Consent
  const [coppaConsent, setCoppaConsent] = useState(false);

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'black-hornets')
      .single();

    if (!org) {
      setLoadingSeasons(false);
      return;
    }

    const { data: seasonsData } = await supabase
      .from('seasons')
      .select(`
        id,
        name,
        age_groups (
          id,
          name,
          min_age,
          max_age
        )
      `)
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (seasonsData && seasonsData.length > 0) {
      setSeasons(seasonsData);
      setSelectedSeasonId(seasonsData[0].id);
    }
    setLoadingSeasons(false);
  };

  const validateAccountStep = (): boolean => {
    if (!email.trim() || !password || !confirmPassword || !fullName.trim()) {
      Alert.alert('Missing Info', 'Please fill in all required fields.');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return false;
    }
    return true;
  };

  const validateChildStep = (): boolean => {
    if (!childFirstName.trim() || !childLastName.trim()) {
      Alert.alert('Missing Info', 'Please enter your child\'s name.');
      return false;
    }
    if (!selectedSeasonId) {
      Alert.alert('Missing Info', 'Please select a season.');
      return false;
    }
    if (!coppaConsent) {
      Alert.alert('Consent Required', 'You must agree to the parental consent to continue.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 'account' && validateAccountStep()) {
      setStep('child');
    } else if (step === 'child' && validateChildStep()) {
      setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'child') setStep('account');
    else if (step === 'review') setStep('child');
    else router.back();
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // 1. Create the user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create account');

      // 2. Get org ID
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', 'black-hornets')
        .single();

      if (!org) throw new Error('Organization not found');

      // 3. Update profile with additional info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          current_organization_id: org.id,
          onboarding_complete: true,
          pending_approval: !skipApproval, // Skip approval if using invite code
        })
        .eq('id', authData.user.id);

      if (profileError) console.error('Profile update error:', profileError);

      // 4. Grant parent role
      await supabase.from('user_roles').insert({
        organization_id: org.id,
        user_id: authData.user.id,
        role: 'parent',
        is_active: true,
      });

      // 5. Create the player record
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          first_name: childFirstName.trim(),
          last_name: childLastName.trim(),
          date_of_birth: childDOB || null,
          season_id: selectedSeasonId,
          age_group_id: selectedAgeGroupId || null,
          parent_name: fullName.trim(),
          parent_email: email.trim().toLowerCase(),
          parent_phone: phone.trim() || null,
          emergency_contact_name: emergencyName.trim() || null,
          emergency_contact_phone: emergencyPhone.trim() || null,
          emergency_contact_relationship: emergencyRelation.trim() || null,
          registration_status: skipApproval ? 'registered' : 'pending',
          coppa_consent_given: coppaConsent,
          coppa_consent_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (playerError) throw playerError;

      // 6. Link parent to player
      if (player) {
        await supabase.from('player_guardians').insert({
          player_id: player.id,
          guardian_id: authData.user.id,
          relationship: 'parent',
          is_primary: true,
          can_pickup: true,
        });

        // 7. If team is pre-selected, assign player to team
        if (preSelectedTeamId) {
          await supabase.from('team_players').insert({
            team_id: preSelectedTeamId,
            player_id: player.id,
          });
        }
      }

      // 8. Update invitation status if using invite
      if (params.inviteId) {
        await supabase
          .from('invitations')
          .update({ 
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            accepted_by: authData.user.id,
          })
          .eq('id', params.inviteId);
      }

      // 9. Update team code usage if using team code
      if (params.teamCodeId) {
        await supabase.rpc('increment_team_code_usage', { code_id: params.teamCodeId });
      }

      // Success!
      if (skipApproval) {
        Alert.alert(
          'Registration Complete!',
          'Your account has been created and ' + childFirstName + ' has been registered.' + (preSelectedTeamName ? ' They have been added to ' + preSelectedTeamName + '.' : ''),
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        Alert.alert(
          'Registration Submitted!',
          'Your registration is pending approval. You\'ll receive a notification once an admin reviews it.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/pending-approval') }]
        );
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
  const s = createStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView 
        style={s.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={handleBack} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Parent Registration</Text>
          <View style={s.backBtn} />
        </View>

        {/* Invite Banner */}
        {hasInvite && (
          <View style={s.inviteBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={s.inviteBannerText}>
              {preSelectedTeamName 
                ? 'Registering for ' + preSelectedTeamName
                : 'Using invite code - no approval needed!'
              }
            </Text>
          </View>
        )}

        {/* Progress */}
        <View style={s.progressContainer}>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: step === 'account' ? '33%' : step === 'child' ? '66%' : '100%' }]} />
          </View>
          <Text style={s.progressText}>
            Step {step === 'account' ? '1' : step === 'child' ? '2' : '3'} of 3: {' '}
            {step === 'account' ? 'Your Account' : step === 'child' ? 'Child Info' : 'Review'}
          </Text>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          {/* Step 1: Account */}
          {step === 'account' && (
            <View style={s.stepContent}>
              <Text style={s.stepTitle}>Create Your Account</Text>
              <Text style={s.stepSubtitle}>This will be your login for VolleyBrain</Text>

              <View style={s.inputGroup}>
                <Text style={s.label}>Full Name *</Text>
                <TextInput
                  style={s.input}
                  placeholder="Your full name"
                  placeholderTextColor={colors.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Email *</Text>
                <TextInput
                  style={[s.input, params.email ? s.inputDisabled : null]}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!params.email}
                />
                {params.email && (
                  <Text style={s.inputHint}>Email is pre-filled from your invite</Text>
                )}
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Phone</Text>
                <TextInput
                  style={s.input}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Password *</Text>
                <TextInput
                  style={s.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Confirm Password *</Text>
                <TextInput
                  style={s.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
            </View>
          )}

          {/* Step 2: Child Info */}
          {step === 'child' && (
            <View style={s.stepContent}>
              <Text style={s.stepTitle}>Register Your Child</Text>
              <Text style={s.stepSubtitle}>Enter your child's information</Text>

              <View style={s.row}>
                <View style={[s.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={s.label}>First Name *</Text>
                  <TextInput
                    style={s.input}
                    placeholder="First name"
                    placeholderTextColor={colors.textMuted}
                    value={childFirstName}
                    onChangeText={setChildFirstName}
                    autoCapitalize="words"
                  />
                </View>
                <View style={[s.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={s.label}>Last Name *</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Last name"
                    placeholderTextColor={colors.textMuted}
                    value={childLastName}
                    onChangeText={setChildLastName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Date of Birth</Text>
                <TextInput
                  style={s.input}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={colors.textMuted}
                  value={childDOB}
                  onChangeText={setChildDOB}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              {/* Pre-selected Team Banner */}
              {preSelectedTeamName && (
                <View style={s.teamBanner}>
                  <Ionicons name="shirt" size={24} color={colors.info} />
                  <View style={s.teamBannerContent}>
                    <Text style={s.teamBannerLabel}>Joining Team</Text>
                    <Text style={s.teamBannerName}>{preSelectedTeamName}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                </View>
              )}

              {/* Season Selection */}
              <View style={s.inputGroup}>
                <Text style={s.label}>Season *</Text>
                {loadingSeasons ? (
                  <ActivityIndicator color={colors.primary} />
                ) : seasons.length === 0 ? (
                  <Text style={s.noSeasons}>No active seasons available</Text>
                ) : (
                  <View style={s.seasonOptions}>
                    {seasons.map(season => (
                      <TouchableOpacity
                        key={season.id}
                        style={[s.seasonOption, selectedSeasonId === season.id && s.seasonOptionActive]}
                        onPress={() => {
                          setSelectedSeasonId(season.id);
                          setSelectedAgeGroupId('');
                        }}
                      >
                        <Text style={[s.seasonOptionText, selectedSeasonId === season.id && s.seasonOptionTextActive]}>
                          {season.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Age Group Selection */}
              {selectedSeason && selectedSeason.age_groups && selectedSeason.age_groups.length > 0 && (
                <View style={s.inputGroup}>
                  <Text style={s.label}>Age Group (Optional)</Text>
                  <View style={s.ageGroupOptions}>
                    <TouchableOpacity
                      style={[s.ageGroupOption, !selectedAgeGroupId && s.ageGroupOptionActive]}
                      onPress={() => setSelectedAgeGroupId('')}
                    >
                      <Text style={[s.ageGroupOptionText, !selectedAgeGroupId && s.ageGroupOptionTextActive]}>
                        Assign Later
                      </Text>
                    </TouchableOpacity>
                    {selectedSeason.age_groups.map(ag => (
                      <TouchableOpacity
                        key={ag.id}
                        style={[s.ageGroupOption, selectedAgeGroupId === ag.id && s.ageGroupOptionActive]}
                        onPress={() => setSelectedAgeGroupId(ag.id)}
                      >
                        <Text style={[s.ageGroupOptionText, selectedAgeGroupId === ag.id && s.ageGroupOptionTextActive]}>
                          {ag.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Emergency Contact */}
              <Text style={s.sectionTitle}>Emergency Contact</Text>
              
              <View style={s.inputGroup}>
                <Text style={s.label}>Contact Name</Text>
                <TextInput
                  style={s.input}
                  placeholder="Emergency contact name"
                  placeholderTextColor={colors.textMuted}
                  value={emergencyName}
                  onChangeText={setEmergencyName}
                  autoCapitalize="words"
                />
              </View>

              <View style={s.row}>
                <View style={[s.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={s.label}>Phone</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Phone"
                    placeholderTextColor={colors.textMuted}
                    value={emergencyPhone}
                    onChangeText={setEmergencyPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={[s.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={s.label}>Relationship</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. Grandparent"
                    placeholderTextColor={colors.textMuted}
                    value={emergencyRelation}
                    onChangeText={setEmergencyRelation}
                  />
                </View>
              </View>

              {/* COPPA Consent */}
              <View style={s.consentContainer}>
                <Switch
                  value={coppaConsent}
                  onValueChange={setCoppaConsent}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.card}
                />
                <Text style={s.consentText}>
                  I am the parent or legal guardian of this child and consent to their participation in Black Hornets Volleyball programs. I understand that coaches and staff may communicate with my child through the app's player chat feature, and that I will have view-only access to monitor these communications. *
                </Text>
              </View>
            </View>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <View style={s.stepContent}>
              <Text style={s.stepTitle}>Review & Submit</Text>
              <Text style={s.stepSubtitle}>Please verify your information</Text>

              <View style={s.reviewCard}>
                <Text style={s.reviewSectionTitle}>Your Account</Text>
                <View style={s.reviewRow}>
                  <Text style={s.reviewLabel}>Name</Text>
                  <Text style={s.reviewValue}>{fullName}</Text>
                </View>
                <View style={s.reviewRow}>
                  <Text style={s.reviewLabel}>Email</Text>
                  <Text style={s.reviewValue}>{email}</Text>
                </View>
                {phone && (
                  <View style={s.reviewRow}>
                    <Text style={s.reviewLabel}>Phone</Text>
                    <Text style={s.reviewValue}>{phone}</Text>
                  </View>
                )}
              </View>

              <View style={s.reviewCard}>
                <Text style={s.reviewSectionTitle}>Child Information</Text>
                <View style={s.reviewRow}>
                  <Text style={s.reviewLabel}>Name</Text>
                  <Text style={s.reviewValue}>{childFirstName} {childLastName}</Text>
                </View>
                {childDOB && (
                  <View style={s.reviewRow}>
                    <Text style={s.reviewLabel}>Date of Birth</Text>
                    <Text style={s.reviewValue}>{childDOB}</Text>
                  </View>
                )}
                <View style={s.reviewRow}>
                  <Text style={s.reviewLabel}>Season</Text>
                  <Text style={s.reviewValue}>{selectedSeason?.name || 'Not selected'}</Text>
                </View>
                <View style={s.reviewRow}>
                  <Text style={s.reviewLabel}>Age Group</Text>
                  <Text style={s.reviewValue}>
                    {selectedAgeGroupId 
                      ? selectedSeason?.age_groups?.find(ag => ag.id === selectedAgeGroupId)?.name 
                      : 'To be assigned'}
                  </Text>
                </View>
                {preSelectedTeamName && (
                  <View style={s.reviewRow}>
                    <Text style={s.reviewLabel}>Team</Text>
                    <Text style={[s.reviewValue, { color: colors.success }]}>{preSelectedTeamName}</Text>
                  </View>
                )}
              </View>

              {(emergencyName || emergencyPhone) && (
                <View style={s.reviewCard}>
                  <Text style={s.reviewSectionTitle}>Emergency Contact</Text>
                  {emergencyName && (
                    <View style={s.reviewRow}>
                      <Text style={s.reviewLabel}>Name</Text>
                      <Text style={s.reviewValue}>{emergencyName}</Text>
                    </View>
                  )}
                  {emergencyPhone && (
                    <View style={s.reviewRow}>
                      <Text style={s.reviewLabel}>Phone</Text>
                      <Text style={s.reviewValue}>{emergencyPhone}</Text>
                    </View>
                  )}
                  {emergencyRelation && (
                    <View style={s.reviewRow}>
                      <Text style={s.reviewLabel}>Relationship</Text>
                      <Text style={s.reviewValue}>{emergencyRelation}</Text>
                    </View>
                  )}
                </View>
              )}

              {skipApproval ? (
                <View style={s.successNotice}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  <Text style={s.successNoticeText}>
                    Your registration will be processed immediately. No approval needed!
                  </Text>
                </View>
              ) : (
                <View style={s.pendingNotice}>
                  <Ionicons name="information-circle" size={24} color={colors.info} />
                  <Text style={s.pendingNoticeText}>
                    Your registration will be reviewed by a league admin. You'll be notified once it's approved.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Footer Buttons */}
        <View style={s.footer}>
          {step !== 'review' ? (
            <TouchableOpacity style={s.nextBtn} onPress={handleNext}>
              <Text style={s.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[s.submitBtn, loading && s.submitBtnDisabled]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={s.submitBtnText}>Submit Registration</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#000" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  inviteBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.success + '20', paddingHorizontal: 16, paddingVertical: 10 },
  inviteBannerText: { fontSize: 14, color: colors.success, fontWeight: '500' },
  progressContainer: { paddingHorizontal: 16, marginBottom: 8 },
  progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  progressText: { fontSize: 13, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  stepContent: {},
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  stepSubtitle: { fontSize: 15, color: colors.textMuted, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  input: { backgroundColor: colors.card, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  inputDisabled: { backgroundColor: colors.border + '50', color: colors.textMuted },
  inputHint: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  row: { flexDirection: 'row' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 16 },
  noSeasons: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  seasonOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seasonOption: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  seasonOptionActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  seasonOptionText: { fontSize: 14, color: colors.text },
  seasonOptionTextActive: { color: colors.primary, fontWeight: '600' },
  ageGroupOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ageGroupOption: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  ageGroupOptionActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  ageGroupOptionText: { fontSize: 13, color: colors.text },
  ageGroupOptionTextActive: { color: colors.primary, fontWeight: '600' },
  teamBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.info + '15', padding: 16, borderRadius: 12, marginBottom: 16 },
  teamBannerContent: { flex: 1 },
  teamBannerLabel: { fontSize: 12, color: colors.textMuted },
  teamBannerName: { fontSize: 16, fontWeight: '600', color: colors.info },
  consentContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.card, padding: 16, borderRadius: 12, marginTop: 16 },
  consentText: { flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  reviewCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  reviewSectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewLabel: { fontSize: 14, color: colors.textMuted },
  reviewValue: { fontSize: 14, color: colors.text, fontWeight: '500' },
  pendingNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.info + '15', padding: 16, borderRadius: 12 },
  pendingNoticeText: { flex: 1, fontSize: 14, color: colors.info, lineHeight: 20 },
  successNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.success + '15', padding: 16, borderRadius: 12 },
  successNoticeText: { flex: 1, fontSize: 14, color: colors.success, lineHeight: 20 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  nextBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8 },
  nextBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  submitBtn: { backgroundColor: colors.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
});
