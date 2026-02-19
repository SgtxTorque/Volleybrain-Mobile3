import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =============================================================================
// LEAGUE SETUP WIZARD
// Multi-step onboarding for new league admins
// Step 1: Create Account
// Step 2: Organization Info
// Step 3: Add Sports
// Step 4: Create First Season (optional)
// =============================================================================

type Sport = {
  name: string;
  icon: string;
  color: string;
};

const SPORT_OPTIONS: Sport[] = [
  { name: 'Volleyball', icon: '🏐', color: '#FFD700' },
  { name: 'Basketball', icon: '🏀', color: '#FF6B35' },
  { name: 'Soccer', icon: '⚽', color: '#4CAF50' },
  { name: 'Baseball', icon: '⚾', color: '#E53935' },
  { name: 'Softball', icon: '🥎', color: '#FFEB3B' },
  { name: 'Football', icon: '🏈', color: '#795548' },
  { name: 'Tennis', icon: '🎾', color: '#8BC34A' },
  { name: 'Swimming', icon: '🏊', color: '#03A9F4' },
];

export default function LeagueSetupScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Account
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Organization
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');

  // Step 3: Sports
  const [selectedSports, setSelectedSports] = useState<Sport[]>([]);

  // Step 4: Season (optional)
  const [seasonName, setSeasonName] = useState('');
  const [seasonSport, setSeasonSport] = useState<Sport | null>(null);
  const [skipSeason, setSkipSeason] = useState(false);

  // Created IDs for linking
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // =============================================================================
  // STEP HANDLERS
  // =============================================================================

  const handleStep1 = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create account');

      // Update profile to admin role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          role: 'admin',
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.warn('Profile update error:', profileError);
        // Profile might be created by trigger, try insert
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          role: 'admin',
        });
      }

      setUserId(authData.user.id);
      
      // Session is handled automatically by auth context listener

      setStep(2);
    } catch (error: any) {
      if (__DEV__) console.error('Step 1 error:', error);
      Alert.alert('Error', error.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    if (!orgName.trim()) {
      Alert.alert('Missing Name', 'Please enter your organization name.');
      return;
    }

    setLoading(true);
    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName.trim(),
          description: orgDescription.trim() || null,
          created_by: userId,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      setOrgId(org.id);

      // Link user to organization
      if (userId) {
        await supabase
          .from('profiles')
          .update({ current_organization_id: org.id })
          .eq('id', userId);
      }

      setStep(3);
    } catch (error: any) {
      if (__DEV__) console.error('Step 2 error:', error);
      Alert.alert('Error', error.message || 'Failed to create organization.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSport = (sport: Sport) => {
    setSelectedSports(prev => {
      const exists = prev.find(s => s.name === sport.name);
      if (exists) {
        return prev.filter(s => s.name !== sport.name);
      } else {
        return [...prev, sport];
      }
    });
  };

  const handleStep3 = async () => {
    if (selectedSports.length === 0) {
      Alert.alert('Select Sports', 'Please select at least one sport.');
      return;
    }

    setLoading(true);
    try {
      // Create sports
      for (const sport of selectedSports) {
        await supabase.from('sports').insert({
          name: sport.name,
          icon: sport.icon,
          color_primary: sport.color,
          organization_id: orgId,
        });
      }

      // Default to first sport for season
      setSeasonSport(selectedSports[0]);
      setStep(4);
    } catch (error: any) {
      if (__DEV__) console.error('Step 3 error:', error);
      Alert.alert('Error', error.message || 'Failed to add sports.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep4 = async () => {
    setLoading(true);
    try {
      if (!skipSeason && seasonName.trim() && seasonSport) {
        // Get sport ID
        const { data: sportData } = await supabase
          .from('sports')
          .select('id')
          .eq('name', seasonSport.name)
          .eq('organization_id', orgId)
          .single();

        if (sportData) {
          // Create season
          await supabase.from('seasons').insert({
            name: seasonName.trim(),
            sport_id: sportData.id,
            status: 'setup',
            registration_open: false,
          });
        }
      }

      // All done! Navigate to main app
      Alert.alert(
        'Welcome! 🎉',
        `${orgName} is ready to go! You can now add teams, players, and more.`,
        [
          {
            text: "Let's Go",
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error: any) {
      if (__DEV__) console.error('Step 4 error:', error);
      Alert.alert('Error', error.message || 'Failed to create season.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipSeason = () => {
    setSkipSeason(true);
    Alert.alert(
      'All Set! 🎉',
      `${orgName} is ready! You can create seasons later from the dashboard.`,
      [
        {
          text: "Let's Go",
          onPress: () => router.replace('/(tabs)'),
        },
      ]
    );
  };

  // =============================================================================
  // RENDER STEPS
  // =============================================================================

  const renderStep1 = () => (
    <View style={{
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 24,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    }}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={{
          width: 70,
          height: 70,
          borderRadius: 35,
          backgroundColor: '#FF950020',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <Ionicons name="person-add" size={32} color="#FF9500" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
          Create Your Account
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
          You'll be the admin of your league
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{
          backgroundColor: colors.background,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            style={{
              flex: 1,
              padding: 14,
              fontSize: 16,
              color: colors.text,
            }}
          />
        </View>

        <View style={{
          backgroundColor: colors.background,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              flex: 1,
              padding: 14,
              fontSize: 16,
              color: colors.text,
            }}
          />
        </View>

        <View style={{
          backgroundColor: colors.background,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Create password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={!showPassword}
            style={{
              flex: 1,
              padding: 14,
              fontSize: 16,
              color: colors.text,
            }}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleStep1}
        disabled={loading}
        style={{
          backgroundColor: colors.primary,
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
          marginTop: 24,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#000' }}>
            Continue
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={{
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 24,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    }}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={{
          width: 70,
          height: 70,
          borderRadius: 35,
          backgroundColor: colors.primary + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <Ionicons name="business" size={32} color={colors.primary} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
          Your Organization
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
          What's your league or club called?
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{
          backgroundColor: colors.background,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Ionicons name="trophy-outline" size={20} color={colors.textSecondary} />
          <TextInput
            value={orgName}
            onChangeText={setOrgName}
            placeholder="Organization name"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            style={{
              flex: 1,
              padding: 14,
              fontSize: 16,
              color: colors.text,
            }}
          />
        </View>

        <View style={{
          backgroundColor: colors.background,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingTop: 10,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            Description (optional)
          </Text>
          <TextInput
            value={orgDescription}
            onChangeText={setOrgDescription}
            placeholder="Tell us about your league..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            style={{
              padding: 0,
              paddingVertical: 10,
              fontSize: 16,
              color: colors.text,
              minHeight: 60,
            }}
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={handleStep2}
        disabled={loading}
        style={{
          backgroundColor: colors.primary,
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
          marginTop: 24,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#000' }}>
            Continue
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={{
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 24,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    }}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={{
          width: 70,
          height: 70,
          borderRadius: 35,
          backgroundColor: '#34C75920',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 32 }}>🏐</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
          What Sports?
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
          Select all that apply
        </Text>
      </View>

      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
      }}>
        {SPORT_OPTIONS.map(sport => {
          const isSelected = selectedSports.some(s => s.name === sport.name);
          return (
            <TouchableOpacity
              key={sport.name}
              onPress={() => toggleSport(sport)}
              style={{
                backgroundColor: isSelected ? sport.color + '30' : colors.card,
                borderRadius: 12,
                padding: 14,
                paddingHorizontal: 18,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: isSelected ? sport.color : 'transparent',
              }}
            >
              <Text style={{ fontSize: 22, marginRight: 8 }}>{sport.icon}</Text>
              <Text style={{
                fontSize: 15,
                fontWeight: '600',
                color: isSelected ? sport.color : colors.text,
              }}>
                {sport.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={handleStep3}
        disabled={loading || selectedSports.length === 0}
        style={{
          backgroundColor: selectedSports.length > 0 ? colors.primary : colors.border,
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
          marginTop: 24,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: selectedSports.length > 0 ? '#000' : colors.textSecondary,
          }}>
            Continue ({selectedSports.length} selected)
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep4 = () => (
    <View style={{
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 24,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    }}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={{
          width: 70,
          height: 70,
          borderRadius: 35,
          backgroundColor: '#007AFF20',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <Ionicons name="calendar" size={32} color="#007AFF" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
          First Season
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
          Create your first season, or skip for now
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{
          backgroundColor: colors.background,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
          <TextInput
            value={seasonName}
            onChangeText={setSeasonName}
            placeholder='e.g. "Spring 2026"'
            placeholderTextColor={colors.textSecondary}
            style={{
              flex: 1,
              padding: 14,
              fontSize: 16,
              color: colors.text,
            }}
          />
        </View>

        {selectedSports.length > 1 && (
          <>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
              Sport for this season:
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {selectedSports.map(sport => (
                <TouchableOpacity
                  key={sport.name}
                  onPress={() => setSeasonSport(sport)}
                  style={{
                    backgroundColor: seasonSport?.name === sport.name ? sport.color + '30' : colors.card,
                    borderRadius: 8,
                    padding: 10,
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: seasonSport?.name === sport.name ? sport.color : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 16, marginRight: 6 }}>{sport.icon}</Text>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: seasonSport?.name === sport.name ? sport.color : colors.text,
                  }}>
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      <TouchableOpacity
        onPress={handleStep4}
        disabled={loading || !seasonName.trim()}
        style={{
          backgroundColor: seasonName.trim() ? colors.primary : colors.border,
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
          marginTop: 24,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: seasonName.trim() ? '#000' : colors.textSecondary,
          }}>
            Create Season & Finish
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleSkipSeason}
        style={{
          padding: 16,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 15, color: colors.textSecondary }}>
          Skip for now
        </Text>
      </TouchableOpacity>
    </View>
  );

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
        }}>
          <TouchableOpacity
            onPress={() => step > 1 ? setStep(step - 1) : router.back()}
            style={{ padding: 4 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              Step {step} of 4
            </Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* Progress Bar */}
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          gap: 6,
          marginBottom: 20,
        }}>
          {[1, 2, 3, 4].map(s => (
            <View
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: s <= step ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 24,
            paddingTop: 8,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
