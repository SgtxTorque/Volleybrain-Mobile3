import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const { signIn } = useAuth();
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const emailRef = useRef<TextInput>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) {
      triggerShake();
      Alert.alert('Sign In Failed', error.message || 'Please check your credentials.');
    }
  };

  const handleForgotPassword = async () => {
    const target = resetEmail.trim() || email.trim();
    if (!target) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(target.toLowerCase());
      if (error) throw error;
      Alert.alert(
        'Check Your Email',
        'If an account exists with that email, you will receive a password reset link.',
        [{ text: 'OK', onPress: () => { setShowForgotModal(false); setResetEmail(''); } }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reset email.');
    } finally {
      setResettingPassword(false);
    }
  };

  // Dev quick-login helper
  const devLogin = async (role: string) => {
    const devEmail = process.env.EXPO_PUBLIC_DEV_USER_EMAIL;
    const devPassword = process.env.EXPO_PUBLIC_DEV_USER_PASSWORD;
    if (!devEmail || !devPassword) {
      Alert.alert('Dev Error', 'Set EXPO_PUBLIC_DEV_USER_EMAIL and EXPO_PUBLIC_DEV_USER_PASSWORD in .env');
      return;
    }
    setEmail(devEmail);
    setPassword(devPassword);
    setLoading(true);
    if (__DEV__) console.log(`[DEV] Quick login as ${role} → ${devEmail}`);
    const { error } = await signIn(devEmail, devPassword);
    setLoading(false);
    if (error) {
      triggerShake();
      Alert.alert('Dev Login Failed', error.message);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.flex}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Logo */}
          <View style={s.logoWrap}>
            <Image
              source={require('@/assets/images/lynx-logo.png')}
              style={s.logo}
              resizeMode="contain"
            />
          </View>

          {/* Form card */}
          <Animated.View style={[s.card, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={s.heading}>Welcome Back</Text>

            {/* Email */}
            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={BRAND.textMuted} style={s.inputIcon} />
              <TextInput
                ref={emailRef}
                style={s.input}
                placeholder="Email address"
                placeholderTextColor={BRAND.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={BRAND.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Password"
                placeholderTextColor={BRAND.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={BRAND.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Sign In */}
            <TouchableOpacity
              style={[s.signInBtn, !canSubmit && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading || !canSubmit}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.signInText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity
              style={s.forgotBtn}
              onPress={() => { setResetEmail(email); setShowForgotModal(true); }}
            >
              <Text style={s.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Sign Up link */}
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity style={s.signUpLink}>
              <Text style={s.signUpText}>
                Don't have an account?{' '}
                <Text style={s.signUpBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </Link>

          {/* Dev Tools */}
          {__DEV__ && (
            <View style={s.devTools}>
              <Text style={s.devLabel}>── DEV TOOLS ──</Text>
              <View style={s.devRow}>
                {(['Admin', 'Coach', 'Parent', 'Player'] as const).map((role) => (
                  <TouchableOpacity key={role} style={s.devBtn} onPress={() => devLogin(role.toLowerCase())}>
                    <Text style={s.devBtnText}>{role}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal visible={showForgotModal} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={() => setShowForgotModal(false)}>
                <Ionicons name="close" size={22} color={BRAND.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={s.modalDesc}>
              Enter your email address and we'll send you a reset link.
            </Text>
            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={BRAND.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Email address"
                placeholderTextColor={BRAND.textMuted}
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[s.signInBtn, resettingPassword && s.btnDisabled]}
              onPress={handleForgotPassword}
              disabled={resettingPassword}
            >
              {resettingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.signInText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowForgotModal(false)} style={{ alignItems: 'center', padding: 8 }}>
              <Text style={s.forgotText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 140,
    height: 48,
  },
  card: {
    backgroundColor: BRAND.white,
    borderRadius: 20,
    padding: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  heading: {
    fontFamily: FONTS.bodyBold,
    fontSize: 22,
    color: BRAND.navy,
    textAlign: 'center',
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.warmGray,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: BRAND.textPrimary,
    paddingVertical: 14,
  },
  signInBtn: {
    backgroundColor: BRAND.teal,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  signInText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#fff',
  },
  forgotBtn: {
    alignItems: 'center',
    padding: 4,
  },
  forgotText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.teal,
  },
  signUpLink: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  signUpText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
  },
  signUpBold: {
    fontFamily: FONTS.bodyBold,
    color: BRAND.teal,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: BRAND.white,
    borderRadius: 20,
    padding: 24,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: BRAND.navy,
  },
  modalDesc: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
    lineHeight: 20,
  },
  // Dev
  devTools: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    alignItems: 'center',
  },
  devLabel: {
    fontSize: 10,
    color: BRAND.textMuted,
    fontFamily: 'monospace',
    marginBottom: 8,
    letterSpacing: 1,
  },
  devRow: {
    flexDirection: 'row',
    gap: 8,
  },
  devBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: BRAND.warmGray,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  devBtnText: {
    fontSize: 11,
    color: BRAND.textMuted,
    fontFamily: FONTS.bodySemiBold,
  },
});
