/**
 * Team Manager Setup Wizard — 4-step flow to create a team from scratch.
 * Creates: micro-org → season → team → team_staff → invite code.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Constants ──────────────────────────────────────────────────

const SPORTS = ['Volleyball', 'Basketball', 'Soccer', 'Baseball', 'Football', 'Swimming'];

const AGE_GROUPS = ['10U', '11U', '12U', '13U', '14U', '15U', '16U', '17U', '18U', 'Open'];

function getDefaultSeasonName(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  if (month <= 4) return `Spring ${year}`;
  if (month <= 7) return `Summer ${year}`;
  return `Fall ${year}`;
}

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30) +
    '-' +
    Date.now().toString(36)
  );
}

function generateInviteCode(teamName: string): string {
  const prefix = teamName.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase() || 'TM';
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LYNX-${prefix}${random}`;
}

// ─── Team limit check ───────────────────────────────────────────

async function canCreateTeam(userId: string): Promise<{ allowed: boolean; currentCount: number; limit: number }> {
  const { count } = await supabase
    .from('team_staff')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('staff_role', 'team_manager')
    .eq('is_active', true);

  const currentCount = count || 0;
  const limit = 1; // Free tier
  return { allowed: currentCount < limit, currentCount, limit };
}

// ─── DB writes ──────────────────────────────────────────────────

async function createTeamManagerSetup(data: {
  teamName: string;
  sport: string;
  ageGroup: string;
  seasonName: string;
  seasonStart: string;
  seasonEnd: string;
  userId: string;
}): Promise<{ orgId: string; seasonId: string; teamId: string; inviteCode: string }> {
  // 1. Create micro-organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: data.teamName,
      slug: generateSlug(data.teamName),
      is_active: true,
    })
    .select('id')
    .single();

  if (orgError || !org) throw new Error(orgError?.message || 'Failed to create organization');

  // 2. Create user_roles entry (team_manager for their micro-org)
  await supabase.from('user_roles').insert({
    user_id: data.userId,
    organization_id: org.id,
    role: 'team_manager',
    is_active: true,
  });

  // 3. Update profile with org
  await supabase
    .from('profiles')
    .update({ current_organization_id: org.id })
    .eq('id', data.userId);

  // 4. Create season (status = 'active', not is_active; no sport column issue)
  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .insert({
      organization_id: org.id,
      name: data.seasonName,
      start_date: data.seasonStart,
      end_date: data.seasonEnd,
      status: 'active',
      sport: data.sport.toLowerCase(),
    })
    .select('id')
    .single();

  if (seasonError || !season) throw new Error(seasonError?.message || 'Failed to create season');

  // 5. Create team (no organization_id or sport on teams table; linked via season)
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      name: data.teamName,
      season_id: season.id,
      age_group: data.ageGroup,
      max_players: 20,
    })
    .select('id')
    .single();

  if (teamError || !team) throw new Error(teamError?.message || 'Failed to create team');

  // 6. Add TM to team_staff
  await supabase.from('team_staff').insert({
    team_id: team.id,
    user_id: data.userId,
    staff_role: 'team_manager',
    is_active: true,
  });

  // 7. Generate team invite code
  const code = generateInviteCode(data.teamName);
  await supabase.from('team_invite_codes').insert({
    code,
    team_id: team.id,
    is_active: true,
    max_uses: 30,
    current_uses: 0,
    created_by: data.userId,
  });

  return { orgId: org.id, seasonId: season.id, teamId: team.id, inviteCode: code };
}

// ─── Main Component ─────────────────────────────────────────────

export default function TeamManagerSetupScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Team info
  const [teamName, setTeamName] = useState('');
  const [sport, setSport] = useState('Volleyball');
  const [ageGroup, setAgeGroup] = useState('');

  // Step 2: Season info
  const [seasonName, setSeasonName] = useState(getDefaultSeasonName());
  const [seasonStart, setSeasonStart] = useState('');
  const [seasonEnd, setSeasonEnd] = useState('');
  const [yearRound, setYearRound] = useState(false);

  // Step 3-4: Results
  const [inviteCode, setInviteCode] = useState('');
  const [createdTeamName, setCreatedTeamName] = useState('');

  // Default dates
  const defaultStart = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const defaultEnd = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // ─── Navigation ──
  const animateToStep = useCallback(
    (step: number) => {
      setCurrentStep(step);
      Animated.spring(slideAnim, {
        toValue: -(step - 1) * SCREEN_W,
        useNativeDriver: true,
        tension: 68,
        friction: 12,
      }).start();
    },
    [slideAnim],
  );

  // ─── Step 2 → create team + show step 3 ──
  const handleCreateTeam = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      // Check team limit
      const { allowed, limit } = await canCreateTeam(user.id);
      if (!allowed) {
        Alert.alert(
          'Team limit reached',
          `Your current plan allows ${limit} team. Upgrade to Pro to manage more teams.`,
        );
        setSubmitting(false);
        return;
      }

      const startDate = seasonStart || defaultStart;
      const endDate = yearRound
        ? (() => {
            const d = new Date(startDate);
            d.setFullYear(d.getFullYear() + 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          })()
        : seasonEnd || defaultEnd;

      const result = await createTeamManagerSetup({
        teamName: teamName.trim(),
        sport,
        ageGroup: ageGroup || 'Open',
        seasonName: seasonName.trim() || getDefaultSeasonName(),
        seasonStart: startDate,
        seasonEnd: endDate,
        userId: user.id,
      });

      setInviteCode(result.inviteCode);
      setCreatedTeamName(teamName.trim());
      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      animateToStep(3);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create team. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Share helpers ──
  const copyCode = async () => {
    await Clipboard.setStringAsync(inviteCode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Copied!', 'Invite code copied to clipboard.');
  };

  const shareViaText = async () => {
    try {
      await Share.share({
        message: `Join ${createdTeamName} on Lynx! Download the app and use code: ${inviteCode}`,
      });
    } catch {
      // user cancelled
    }
  };

  // ─── Finish ──
  const goHome = async () => {
    await refreshProfile();
    router.replace('/(tabs)' as any);
  };

  // ─── Render ──
  return (
    <SafeAreaView style={s.safe}>
      {/* Progress dots */}
      <View style={s.progressRow}>
        {[1, 2, 3, 4].map((n) => (
          <View
            key={n}
            style={[s.dot, currentStep >= n && s.dotActive]}
          />
        ))}
      </View>

      {/* Sliding steps */}
      <Animated.View
        style={[s.slider, { transform: [{ translateX: slideAnim }] }]}
      >
        {/* ── STEP 1: Name your team ── */}
        <ScrollView
          style={s.step}
          contentContainerStyle={s.stepContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.stepTitle}>Name your team</Text>
          <Text style={s.stepSubtitle}>Let's get the basics set up</Text>

          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder="Team name"
              placeholderTextColor={BRAND.textMuted}
              value={teamName}
              onChangeText={setTeamName}
              autoFocus
              maxLength={50}
            />
          </View>

          {/* Sport pills */}
          <Text style={s.sectionLabel}>Sport</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.pillRow}
          >
            {SPORTS.map((sp) => (
              <TouchableOpacity
                key={sp}
                style={[s.pill, sport === sp && s.pillActive]}
                onPress={() => setSport(sp)}
              >
                <Text style={[s.pillText, sport === sp && s.pillTextActive]}>{sp}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Age group pills */}
          <Text style={s.sectionLabel}>Age Group</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.pillRow}
          >
            {AGE_GROUPS.map((ag) => (
              <TouchableOpacity
                key={ag}
                style={[s.pill, ageGroup === ag && s.pillActive]}
                onPress={() => setAgeGroup(ag)}
              >
                <Text style={[s.pillText, ageGroup === ag && s.pillTextActive]}>{ag}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[s.primaryBtn, !teamName.trim() && s.btnDisabled]}
            onPress={() => animateToStep(2)}
            disabled={!teamName.trim()}
          >
            <Text style={s.primaryBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>

        {/* ── STEP 2: Set your season ── */}
        <ScrollView
          style={s.step}
          contentContainerStyle={s.stepContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.stepTitle}>Set your season</Text>
          <Text style={s.stepSubtitle}>When does your season run?</Text>

          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder="Season name"
              placeholderTextColor={BRAND.textMuted}
              value={seasonName}
              onChangeText={setSeasonName}
            />
          </View>

          {/* Year-round toggle */}
          <TouchableOpacity
            style={s.toggleRow}
            onPress={() => setYearRound(!yearRound)}
          >
            <Ionicons
              name={yearRound ? 'checkbox' : 'square-outline'}
              size={22}
              color={yearRound ? BRAND.teal : BRAND.textMuted}
            />
            <Text style={s.toggleLabel}>Year-round (no end date)</Text>
          </TouchableOpacity>

          {!yearRound && (
            <>
              <Text style={s.sectionLabel}>Start Date</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  placeholder={`YYYY-MM-DD (default: ${defaultStart})`}
                  placeholderTextColor={BRAND.textMuted}
                  value={seasonStart}
                  onChangeText={setSeasonStart}
                  maxLength={10}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <Text style={s.sectionLabel}>End Date</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  placeholder={`YYYY-MM-DD (default: ${defaultEnd})`}
                  placeholderTextColor={BRAND.textMuted}
                  value={seasonEnd}
                  onChangeText={setSeasonEnd}
                  maxLength={10}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </>
          )}

          <View style={s.btnRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => animateToStep(1)}>
              <Ionicons name="arrow-back" size={18} color={BRAND.textPrimary} />
              <Text style={s.backBtnText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.primaryBtn, s.btnFlex, submitting && s.btnDisabled]}
              onPress={handleCreateTeam}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.primaryBtnText}>Create Team</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ── STEP 3: Invite your players ── */}
        <ScrollView
          style={s.step}
          contentContainerStyle={s.stepContent}
        >
          <Text style={s.stepTitle}>Invite your players</Text>
          <Text style={s.stepSubtitle}>Share this code with parents to join your team</Text>

          {/* Invite code display */}
          <View style={s.codeBox}>
            <Text style={s.codeLabel}>TEAM CODE</Text>
            <Text style={s.codeValue}>{inviteCode}</Text>
          </View>

          {/* Copy button */}
          <TouchableOpacity style={s.actionBtn} onPress={copyCode}>
            <Ionicons name="copy-outline" size={20} color={BRAND.skyBlue} />
            <Text style={s.actionBtnText}>Copy code</Text>
          </TouchableOpacity>

          {/* Share button */}
          <TouchableOpacity style={s.actionBtn} onPress={shareViaText}>
            <Ionicons name="share-outline" size={20} color={BRAND.skyBlue} />
            <Text style={s.actionBtnText}>Share via text</Text>
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity
            style={[s.primaryBtn, { marginTop: 20 }]}
            onPress={() => animateToStep(4)}
          >
            <Text style={s.primaryBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity style={s.skipBtn} onPress={() => animateToStep(4)}>
            <Text style={s.skipText}>I'll do this later</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── STEP 4: You're ready! ── */}
        <ScrollView
          style={s.step}
          contentContainerStyle={[s.stepContent, { alignItems: 'center' }]}
        >
          <Image
            source={require('../assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png')}
            style={s.mascot}
            resizeMode="contain"
          />
          <Text style={s.successTitle}>{createdTeamName} is set up!</Text>
          <Text style={s.successSubtitle}>Here's what to do next:</Text>

          {/* Smart nudge cards */}
          <TouchableOpacity
            style={s.nudgeCard}
            onPress={() => {
              goHome();
              setTimeout(() => router.push('/(tabs)/coach-schedule' as any), 300);
            }}
          >
            <Ionicons name="calendar-outline" size={24} color={BRAND.teal} />
            <View style={s.nudgeText}>
              <Text style={s.nudgeTitle}>Add your first practice</Text>
              <Text style={s.nudgeSub}>Set up your schedule</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={BRAND.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.nudgeCard}
            onPress={() => {
              goHome();
              setTimeout(() => router.push('/(tabs)/players' as any), 300);
            }}
          >
            <Ionicons name="people-outline" size={24} color={BRAND.skyBlue} />
            <View style={s.nudgeText}>
              <Text style={s.nudgeTitle}>Review your roster</Text>
              <Text style={s.nudgeSub}>Players will appear as they join</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={BRAND.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.nudgeCard}
            onPress={() => {
              goHome();
              setTimeout(() => router.push('/(tabs)/payments' as any), 300);
            }}
          >
            <Ionicons name="cash-outline" size={24} color="#E76F51" />
            <View style={s.nudgeText}>
              <Text style={s.nudgeTitle}>Set up payment collection</Text>
              <Text style={s.nudgeSub}>Track fees and dues</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={BRAND.textMuted} />
          </TouchableOpacity>

          {/* Go home */}
          <TouchableOpacity
            style={[s.primaryBtn, { marginTop: 24, width: '100%' }]}
            onPress={goHome}
          >
            <Text style={s.primaryBtnText}>Go to my team</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.offWhite },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND.border,
  },
  dotActive: {
    backgroundColor: BRAND.teal,
  },
  slider: {
    flexDirection: 'row',
    flex: 1,
  },
  step: {
    width: SCREEN_W,
  },
  stepContent: {
    padding: 24,
    paddingBottom: 60,
  },
  stepTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 26,
    color: BRAND.textPrimary,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: BRAND.textMuted,
    marginBottom: 24,
  },
  inputWrap: {
    backgroundColor: BRAND.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: BRAND.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
  },
  sectionLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.textMuted,
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pillRow: {
    gap: 8,
    marginBottom: 20,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  pillActive: {
    backgroundColor: BRAND.teal,
    borderColor: BRAND.teal,
  },
  pillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  pillTextActive: {
    color: '#fff',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND.teal,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  primaryBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnFlex: {
    flex: 1,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  backBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  toggleLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: BRAND.textPrimary,
  },
  codeBox: {
    alignItems: 'center',
    backgroundColor: BRAND.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  codeLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: BRAND.textMuted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  codeValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 28,
    color: BRAND.teal,
    letterSpacing: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(75,185,236,0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 10,
  },
  actionBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.skyBlue,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  skipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
  },
  mascot: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  successTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 24,
    color: BRAND.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  successSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  nudgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BRAND.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    marginBottom: 10,
    width: '100%',
  },
  nudgeText: {
    flex: 1,
  },
  nudgeTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.textPrimary,
  },
  nudgeSub: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 2,
  },
});
