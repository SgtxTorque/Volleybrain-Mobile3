import { useAuth } from '@/lib/auth';
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

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { signInWithGoogle, signInWithApple } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) throw error;
    } catch (error: any) {
      if (__DEV__) console.error('Sign in error:', error);
      Alert.alert(
        'Sign In Failed',
        error.message || 'Please check your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setOauthLoading('google');
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (error: any) {
      if (__DEV__) console.error('Google sign in error:', error);
      Alert.alert('Sign In Failed', error.message || 'Google sign-in failed. Please try again.');
    } finally {
      setOauthLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setOauthLoading('apple');
    try {
      const { error } = await signInWithApple();
      if (error) throw error;
    } catch (error: any) {
      if (__DEV__) console.error('Apple sign in error:', error);
      Alert.alert('Sign In Failed', error.message || 'Apple sign-in failed. Please try again.');
    } finally {
      setOauthLoading(null);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter Email', 'Please enter your email address first.');
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send password reset link to ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
              if (error) throw error;
              Alert.alert('Check Your Email', 'We sent you a password reset link.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send reset email.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Branding */}
          <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 24 }}>
            <View style={{
              width: 90,
              height: 90,
              borderRadius: 45,
              backgroundColor: colors.primary + '20',
              borderWidth: 3,
              borderColor: colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 14,
            }}>
              <Text style={{ fontSize: 44 }}>🏐</Text>
            </View>
            <Text style={{
              fontSize: 32,
              fontWeight: '800',
              color: colors.text,
            }}>
              VolleyBrain
            </Text>
            <Text style={{
              fontSize: 15,
              color: colors.primary,
              fontWeight: '600',
              marginTop: 4,
            }}>
              Youth Volleyball Management
            </Text>
          </View>

          {/* OAuth Buttons */}
          <View style={{ gap: 10, marginBottom: 16 }}>
            {/* Continue with Google */}
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={oauthLoading !== null}
              style={{
                backgroundColor: colors.glassCard,
                borderRadius: 12,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.glassBorder,
                opacity: oauthLoading !== null ? 0.7 : 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              {oauthLoading === 'google' ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.text,
                    marginLeft: 10,
                  }}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Continue with Apple */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={handleAppleSignIn}
                disabled={oauthLoading !== null}
                style={{
                  backgroundColor: colors.text,
                  borderRadius: 12,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: oauthLoading !== null ? 0.7 : 1,
                }}
              >
                {oauthLoading === 'apple' ? (
                  <ActivityIndicator color={colors.background} size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={20} color={colors.background} />
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.background,
                      marginLeft: 10,
                    }}>
                      Continue with Apple
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Divider - "or" */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{
              fontSize: 13,
              color: colors.textSecondary,
              marginHorizontal: 14,
              fontWeight: '500',
            }}>
              or sign in with email
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          {/* Email Sign In Section */}
          <View style={{ marginBottom: 20 }}>
            {/* Email Input */}
            <View style={{
              backgroundColor: colors.glassCard,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: colors.glassBorder,
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

            {/* Password Input */}
            <View style={{
              backgroundColor: colors.glassCard,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: colors.glassBorder,
            }}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
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

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              style={{ alignSelf: 'flex-end', marginBottom: 14 }}
            >
              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={loading}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#000" />
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#000',
                    marginLeft: 8,
                  }}>
                    Sign In
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: 20,
          }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{
              fontSize: 13,
              color: colors.textSecondary,
              marginHorizontal: 14,
              fontWeight: '500',
            }}>
              Get Started
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          {/* Get Started Options */}
          <View style={{ gap: 10 }}>
            {/* I have an invite code */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/redeem-code')}
              style={{
                backgroundColor: colors.primary + '10',
                borderRadius: 16,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.primary + '40',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: colors.primary + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="ticket" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: colors.text,
                }}>
                  I have an invite code
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 1,
                }}>
                  Redeem a code from your coach or admin
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>

            {/* Start a League */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/league-setup')}
              style={{
                backgroundColor: colors.glassCard,
                borderRadius: 16,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.glassBorder,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#FF950020',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="trophy" size={22} color="#FF9500" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: colors.text,
                }}>
                  I'm starting a league
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 1,
                }}>
                  Set up your organization
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Register a Player */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/parent-register')}
              style={{
                backgroundColor: colors.glassCard,
                borderRadius: 16,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.glassBorder,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#34C75920',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="people" size={22} color="#34C759" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: colors.text,
                }}>
                  Register a player
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 1,
                }}>
                  Sign up your player for a season
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Join as Coach */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/coach-register')}
              style={{
                backgroundColor: colors.glassCard,
                borderRadius: 16,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.glassBorder,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#007AFF20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="clipboard" size={22} color="#007AFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: colors.text,
                }}>
                  Join as a coach
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 1,
                }}>
                  Request to coach a team
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Legal Links */}
          <Text style={{
            fontSize: 12,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: 16,
          }}>
            By signing up, you agree to our{' '}
            <Text
              style={{ color: colors.primary, textDecorationLine: 'underline' }}
              onPress={() => router.push('/privacy-policy')}
            >
              Privacy Policy
            </Text>{' '}
            and{' '}
            <Text
              style={{ color: colors.primary, textDecorationLine: 'underline' }}
              onPress={() => router.push('/terms-of-service')}
            >
              Terms of Service
            </Text>
          </Text>

          {/* Footer Spacer */}
          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
