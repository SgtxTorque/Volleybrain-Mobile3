import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const { signIn } = useAuth();
  const { colors } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
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
      <View style={s.content}>
        {/* Logo */}
        <View style={s.logoContainer}>
          <Text style={s.logoEmoji}>🏐</Text>
          <Text style={s.logoText}>VolleyBrain</Text>
          <Text style={s.tagline}>Youth Volleyball Management</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
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
        </View>
      </View>

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
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
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
});
