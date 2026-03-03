import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
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
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const shakeAnim = useRef(new Animated.Value(0)).current;

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
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      triggerShake();
      Alert.alert('Error', error.message);
    }
  };

  // Dev quick-login helper
  const devLogin = async (targetRole: string) => {
    const devEmail = process.env.EXPO_PUBLIC_DEV_USER_EMAIL;
    const devPassword = process.env.EXPO_PUBLIC_DEV_USER_PASSWORD;
    if (!devEmail || !devPassword) {
      Alert.alert('Dev Error', 'Set EXPO_PUBLIC_DEV_USER_EMAIL and EXPO_PUBLIC_DEV_USER_PASSWORD in .env');
      return;
    }
    setEmail(devEmail);
    setPassword(devPassword);
    setLoading(true);
    console.log(`[DEV] Quick login as ${targetRole} → ${devEmail}`);
    const { error } = await signIn(devEmail, devPassword);
    setLoading(false);
    if (error) {
      triggerShake();
      Alert.alert('Dev Login Failed', error.message);
    }
  };

  const handleForgotPassword = async () => {
    const emailToReset = resetEmail.trim() || email.trim();
    if (!emailToReset) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailToReset);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Check Your Email',
          'If an account exists with that email, you will receive a password reset link shortly.',
          [{ text: 'OK', onPress: () => { setShowForgotPassword(false); setResetEmail(''); } }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reset email.');
    } finally {
      setResettingPassword(false);
    }
  };

  const s = createStyles(colors);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.container}
    >
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Logo */}
        <View style={s.logoContainer}>
          <Image
            source={require('@/assets/images/lynx-logo.png')}
            style={s.logoImage}
            resizeMode="contain"
          />
          <Text style={s.tagline}>Youth Sports Management</Text>
        </View>

        {/* Form */}
        <Animated.View style={[s.form, { transform: [{ translateX: shakeAnim }] }]}>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.button, loading && s.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={s.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.forgotButton}
            onPress={() => {
              setResetEmail(email);
              setShowForgotPassword(true);
            }}
          >
            <Text style={s.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity style={s.linkButton}>
              <Text style={s.linkText}>
                Don't have an account? <Text style={s.linkTextBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </Animated.View>

        {/* Dev Tools — only in development */}
        {__DEV__ && (
          <View style={s.devTools}>
            <Text style={s.devLabel}>── DEV TOOLS ──</Text>
            <View style={s.devRow}>
              {(['Admin', 'Coach', 'Parent', 'Player'] as const).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={s.devBtn}
                  onPress={() => devLogin(role.toLowerCase())}
                >
                  <Text style={s.devBtnText}>{role}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal visible={showForgotPassword} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={() => setShowForgotPassword(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalDescription}>
              Enter your email address and we will send you a link to reset your password.
            </Text>

            <TextInput
              style={s.input}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              value={resetEmail}
              onChangeText={setResetEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
            />

            <TouchableOpacity
              style={[s.button, resettingPassword && s.buttonDisabled]}
              onPress={handleForgotPassword}
              disabled={resettingPassword}
            >
              {resettingPassword ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={s.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.modalCancelBtn}
              onPress={() => setShowForgotPassword(false)}
            >
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoImage: {
    width: 200,
    height: 82,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 8,
  },
  form: {
    gap: 16,
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
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  forgotButton: {
    alignItems: 'center',
    padding: 8,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    padding: 16,
  },
  linkText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  linkTextBold: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  // Forgot Password Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  modalCancelBtn: {
    alignItems: 'center',
    padding: 8,
  },
  modalCancelText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  // Dev Tools
  devTools: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  devLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  devBtnText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
});
