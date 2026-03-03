import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

const { width: SCREEN_W } = Dimensions.get('window');
type SelectedRole = 'coach' | 'parent' | 'player' | null;

// ─── Password strength helper ──────────────────────────
function getPasswordStrength(pw: string): { level: 'weak' | 'medium' | 'strong'; color: string; width: string } {
  if (pw.length < 6) return { level: 'weak', color: BRAND.coral, width: '33%' };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [pw.length >= 8, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score >= 3) return { level: 'strong', color: BRAND.teal, width: '100%' };
  if (score >= 2) return { level: 'medium', color: BRAND.goldBrand, width: '66%' };
  return { level: 'weak', color: BRAND.coral, width: '33%' };
}

// ─── Role card config ──────────────────────────────────
const ROLE_CARDS: { role: SelectedRole; icon: string; title: string; subtitle: string; color: string }[] = [
  { role: 'coach', icon: 'clipboard', title: 'Coach', subtitle: 'I coach a team', color: BRAND.teal },
  { role: 'parent', icon: 'people', title: 'Parent', subtitle: 'My child plays', color: BRAND.skyBlue },
  { role: 'player', icon: 'football', title: 'Player', subtitle: "I'm a player", color: BRAND.goldBrand },
];

export default function SignupScreen() {
  const router = useRouter();
  const { signUp, refreshProfile } = useAuth();

  // Step tracking
  const [step, setStep] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Step 1 fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2
  const [selectedRole, setSelectedRole] = useState<SelectedRole>(null);

  // Step 3
  const [orgCode, setOrgCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgSport, setOrgSport] = useState('Volleyball');
  const [createdOrgCode, setCreatedOrgCode] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // ── Navigation ───────────────────────────────────────
  const animateToStep = (target: number) => {
    Animated.spring(slideAnim, {
      toValue: -(target - 1) * SCREEN_W,
      friction: 10,
      tension: 60,
      useNativeDriver: true,
    }).start();
    setStep(target);
  };

  const goNext = () => {
    if (step < 3) animateToStep(step + 1);
  };

  const goBack = () => {
    if (step > 1) animateToStep(step - 1);
    else router.back();
  };

  // ── Step 1 validation ────────────────────────────────
  const step1Valid = firstName.trim().length > 0 && lastName.trim().length > 0 &&
    email.trim().length > 0 && password.length >= 6;

  const pwStrength = getPasswordStrength(password);

  // ── Step 2: role select ──────────────────────────────
  const handleRoleSelect = (role: SelectedRole) => {
    setSelectedRole(role);
    setTimeout(() => animateToStep(3), 500);
  };

  // ── Step 3: validate code ────────────────────────────
  const handleValidateCode = async () => {
    if (!orgCode.trim()) return;
    setCodeLoading(true);
    setCodeError('');
    try {
      // Check invitations table
      const { data: invite } = await supabase
        .from('invitations')
        .select('id, organization_id, organizations(name)')
        .ilike('code', orgCode.trim())
        .eq('status', 'active')
        .maybeSingle();

      if (invite) {
        await createAccount((invite as any).organizations?.name || 'Organization', invite.organization_id);
        return;
      }

      // Check team_invite_codes
      const { data: teamCode } = await supabase
        .from('team_invite_codes')
        .select('id, team_id, teams(name, organization_id, organizations(name))')
        .ilike('code', orgCode.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (teamCode) {
        const team = (teamCode as any).teams;
        const orgId = team?.organization_id;
        const orgDisplayName = team?.organizations?.name || 'Organization';
        await createAccount(orgDisplayName, orgId);
        return;
      }

      setCodeError('Code not found. Check for typos and try again.');
    } catch {
      setCodeError('Something went wrong. Please try again.');
    } finally {
      setCodeLoading(false);
    }
  };

  // ── Step 3: create org ───────────────────────────────
  const handleCreateOrg = async () => {
    if (!orgName.trim()) {
      Alert.alert('Error', 'Please enter an organization name.');
      return;
    }
    setSubmitting(true);
    try {
      // Create account first
      const { error: signUpError } = await signUp(email.trim().toLowerCase(), password, `${firstName.trim()} ${lastName.trim()}`);
      if (signUpError) {
        Alert.alert('Signup Failed', signUpError.message);
        setSubmitting(false);
        return;
      }

      // Get new user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Account created but user not found');

      // Create organization
      const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const code = slug.substring(0, 4).toUpperCase() + Math.floor(1000 + Math.random() * 9000);

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName.trim(),
          slug,
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Set user as admin
      await supabase.from('user_roles').insert({
        user_id: user.id,
        organization_id: org.id,
        role: 'league_admin',
        is_active: true,
      });

      // Update profile
      await supabase.from('profiles').update({
        current_organization_id: org.id,
        onboarding_completed: true,
      }).eq('id', user.id);

      // Create sport entry
      // Create sport entry (ignore if table doesn't exist)
      try {
        await supabase.from('organization_sports').insert({
          organization_id: org.id,
          sport_name: orgSport,
        });
      } catch {
        // noop
      }

      setCreatedOrgCode(code);
      await refreshProfile();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create organization.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Account creation (with or without org) ───────────
  const createAccount = async (orgDisplayName?: string, organizationId?: string) => {
    setSubmitting(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const { error } = await signUp(email.trim().toLowerCase(), password, fullName);
      if (error) {
        Alert.alert('Signup Failed', error.message);
        setSubmitting(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Account created but user not found');

      // Map role
      const roleMap: Record<string, string> = {
        coach: 'head_coach',
        parent: 'parent',
        player: 'player',
      };
      const dbRole = roleMap[selectedRole || 'parent'];

      if (organizationId) {
        // Join org
        await supabase.from('user_roles').insert({
          user_id: user.id,
          organization_id: organizationId,
          role: dbRole,
          is_active: true,
        });

        await supabase.from('profiles').update({
          current_organization_id: organizationId,
          onboarding_completed: true,
        }).eq('id', user.id);
      } else {
        // No org — mark onboarding complete, empty states will guide
        await supabase.from('profiles').update({
          onboarding_completed: true,
        }).eq('id', user.id);
      }

      await refreshProfile();
      // Auth state change will trigger navigation to /(tabs)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Account creation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => createAccount();

  // ── Step Indicator ───────────────────────────────────
  const StepIndicator = () => (
    <View style={s.stepRow}>
      {[1, 2, 3].map((n) => (
        <React.Fragment key={n}>
          <View style={[
            s.stepDot,
            n < step && s.stepDotDone,
            n === step && s.stepDotActive,
          ]}>
            {n < step ? (
              <Ionicons name="checkmark" size={12} color="#fff" />
            ) : (
              <Text style={[s.stepNum, n === step && s.stepNumActive]}>{n}</Text>
            )}
          </View>
          {n < 3 && <View style={[s.stepLine, n < step && s.stepLineDone]} />}
        </React.Fragment>
      ))}
    </View>
  );

  // ── RENDER ───────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={BRAND.navy} />
        </TouchableOpacity>
        <StepIndicator />
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Sliding container */}
        <Animated.View
          style={[s.slider, { transform: [{ translateX: slideAnim }] }]}
        >
          {/* ── STEP 1: Your Info ── */}
          <ScrollView
            style={s.stepPane}
            contentContainerStyle={s.stepContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={s.stepTitle}>Your Info</Text>
            <Text style={s.stepSubtitle}>Let's set up your account</Text>

            <View style={s.fieldRow}>
              <View style={[s.inputWrap, { flex: 1 }]}>
                <TextInput
                  style={s.input}
                  placeholder="First Name"
                  placeholderTextColor={BRAND.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoFocus
                />
              </View>
              <View style={[s.inputWrap, { flex: 1 }]}>
                <TextInput
                  style={s.input}
                  placeholder="Last Name"
                  placeholderTextColor={BRAND.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                placeholder="Email"
                placeholderTextColor={BRAND.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={s.inputWrap}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor={BRAND.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={BRAND.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <View style={s.strengthWrap}>
                <View style={s.strengthTrack}>
                  <View style={[s.strengthFill, { width: pwStrength.width as any, backgroundColor: pwStrength.color }]} />
                </View>
                <Text style={[s.strengthLabel, { color: pwStrength.color }]}>
                  {pwStrength.level}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.primaryBtn, !step1Valid && s.btnDisabled]}
              onPress={goNext}
              disabled={!step1Valid}
              activeOpacity={0.85}
            >
              <Text style={s.primaryBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </ScrollView>

          {/* ── STEP 2: I Am A... ── */}
          <ScrollView
            style={s.stepPane}
            contentContainerStyle={s.stepContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={s.stepTitle}>I Am A...</Text>
            <Text style={s.stepSubtitle}>Choose your role</Text>

            <View style={s.roleCards}>
              {ROLE_CARDS.map(({ role, icon, title, subtitle, color }) => {
                const isSelected = selectedRole === role;
                return (
                  <TouchableOpacity
                    key={role}
                    style={[
                      s.roleCard,
                      isSelected && { borderColor: color, borderWidth: 2.5 },
                    ]}
                    onPress={() => handleRoleSelect(role)}
                    activeOpacity={0.85}
                  >
                    <View style={[s.roleIconWrap, { backgroundColor: color + '15' }]}>
                      <Ionicons name={icon as any} size={28} color={color} />
                    </View>
                    <View style={s.roleTextWrap}>
                      <Text style={s.roleTitle}>{title}</Text>
                      <Text style={s.roleSubtitle}>{subtitle}</Text>
                    </View>
                    {isSelected && (
                      <View style={[s.roleCheck, { backgroundColor: color }]}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* ── STEP 3: Connect ── */}
          <ScrollView
            style={s.stepPane}
            contentContainerStyle={s.stepContent}
            keyboardShouldPersistTaps="handled"
          >
            {createdOrgCode ? (
              /* ── Org Created Confirmation ── */
              <View style={s.confirmCard}>
                <Ionicons name="checkmark-circle" size={48} color={BRAND.teal} />
                <Text style={s.confirmTitle}>{orgName} created!</Text>
                <View style={s.codeBox}>
                  <Text style={s.codeLabel}>Your org code</Text>
                  <Text style={s.codeValue}>{createdOrgCode}</Text>
                </View>
                <Text style={s.confirmHint}>
                  Share this code with your coaches and parents.{'\n'}
                  For full setup (seasons, teams, fees), visit thelynxapp.com
                </Text>
                <TouchableOpacity style={s.primaryBtn} onPress={() => refreshProfile()}>
                  <Text style={s.primaryBtnText}>Continue to Home</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : showCreateOrg ? (
              /* ── Create Org Inline Form ── */
              <View>
                <Text style={s.stepTitle}>Create Organization</Text>
                <Text style={s.stepSubtitle}>Set up your new org</Text>

                <View style={s.inputWrap}>
                  <TextInput
                    style={s.input}
                    placeholder="Organization Name"
                    placeholderTextColor={BRAND.textMuted}
                    value={orgName}
                    onChangeText={setOrgName}
                    autoFocus
                  />
                </View>

                <View style={s.inputWrap}>
                  <TextInput
                    style={s.input}
                    placeholder="Sport"
                    placeholderTextColor={BRAND.textMuted}
                    value={orgSport}
                    onChangeText={setOrgSport}
                  />
                </View>

                <TouchableOpacity
                  style={[s.primaryBtn, submitting && s.btnDisabled]}
                  onPress={handleCreateOrg}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={s.primaryBtnText}>Create Organization</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowCreateOrg(false)} style={s.textBtn}>
                  <Text style={s.textBtnLabel}>← Back to code entry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── Code Entry / Skip ── */
              <View>
                <Text style={s.stepTitle}>Connect</Text>
                <Text style={s.stepSubtitle}>
                  {selectedRole === 'player'
                    ? 'Your coach may have given you a code'
                    : 'Have an invite code?'}
                </Text>

                <View style={[s.inputWrap, codeError ? { borderColor: BRAND.coral } : {}]}>
                  <TextInput
                    style={[s.input, s.codeInput]}
                    placeholder="Enter code"
                    placeholderTextColor={BRAND.textMuted}
                    value={orgCode}
                    onChangeText={(t) => { setOrgCode(t.toUpperCase()); setCodeError(''); }}
                    autoCapitalize="characters"
                  />
                </View>
                {codeError ? <Text style={s.errorText}>{codeError}</Text> : null}

                <TouchableOpacity
                  style={[s.primaryBtn, (codeLoading || !orgCode.trim()) && s.btnDisabled]}
                  onPress={handleValidateCode}
                  disabled={codeLoading || !orgCode.trim()}
                >
                  {codeLoading || submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.primaryBtnText}>Enter Code</Text>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={s.divider}>
                  <View style={s.divLine} />
                  <Text style={s.divText}>or</Text>
                  <View style={s.divLine} />
                </View>

                {/* Skip */}
                <TouchableOpacity
                  style={s.skipBtn}
                  onPress={handleSkip}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={BRAND.textMuted} />
                  ) : (
                    <Text style={s.skipText}>Skip for now — I'll connect later</Text>
                  )}
                </TouchableOpacity>

                {/* Create org (coaches only) */}
                {selectedRole === 'coach' && (
                  <TouchableOpacity
                    onPress={() => setShowCreateOrg(true)}
                    style={s.textBtn}
                  >
                    <Text style={s.textBtnLabel}>
                      Or, <Text style={{ fontFamily: FONTS.bodyBold }}>create a new organization</Text>
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.offWhite },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  // Step indicator
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: BRAND.border,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: BRAND.white,
  },
  stepDotActive: { borderColor: BRAND.teal, backgroundColor: BRAND.teal },
  stepDotDone: { borderColor: BRAND.teal, backgroundColor: BRAND.teal },
  stepNum: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: BRAND.textMuted },
  stepNumActive: { color: '#fff' },
  stepLine: { width: 32, height: 2, backgroundColor: BRAND.border },
  stepLineDone: { backgroundColor: BRAND.teal },
  // Slider
  slider: {
    flexDirection: 'row',
    width: SCREEN_W * 3,
  },
  stepPane: { width: SCREEN_W },
  stepContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  stepTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 24,
    color: BRAND.navy,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
    marginBottom: 24,
  },
  // Inputs
  fieldRow: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: BRAND.textPrimary,
    paddingVertical: 14,
  },
  codeInput: {
    fontFamily: FONTS.bodyBold,
    letterSpacing: 3,
    fontSize: 18,
    textAlign: 'center',
  },
  // Password strength
  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  strengthTrack: {
    flex: 1, height: 4, backgroundColor: BRAND.border,
    borderRadius: 2, overflow: 'hidden',
  },
  strengthFill: { height: 4, borderRadius: 2 },
  strengthLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  // Buttons
  primaryBtn: {
    backgroundColor: BRAND.teal,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#fff',
  },
  btnDisabled: { opacity: 0.5 },
  skipBtn: {
    alignItems: 'center',
    padding: 12,
  },
  skipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
  },
  textBtn: { alignItems: 'center', paddingVertical: 16 },
  textBtnLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.teal,
  },
  // Role cards
  roleCards: { gap: 12 },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: BRAND.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  roleIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  roleTextWrap: { flex: 1 },
  roleTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: BRAND.navy,
  },
  roleSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  roleCheck: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divLine: { flex: 1, height: 1, backgroundColor: BRAND.border },
  divText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    marginHorizontal: 12,
  },
  // Error
  errorText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.coral,
    marginBottom: 8,
    marginTop: -4,
  },
  // Org confirmation
  confirmCard: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  confirmTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 22,
    color: BRAND.navy,
  },
  codeBox: {
    backgroundColor: BRAND.navy,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  codeLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  codeValue: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 24,
    color: '#fff',
    letterSpacing: 3,
  },
  confirmHint: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
