import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const router = useRouter();

  // Profile info
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [savingEmergency, setSavingEmergency] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
    if (user?.id) {
      fetchExtendedProfile();
    }
  }, [profile, user?.id]);

  const fetchExtendedProfile = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url, emergency_contact_name, emergency_contact_phone, emergency_contact_relation')
      .eq('id', user.id)
      .single();

    if (data) {
      setAvatarUrl(data.avatar_url);
      setEmergencyName(data.emergency_contact_name || '');
      setEmergencyPhone(data.emergency_contact_phone || '');
      setEmergencyRelation(data.emergency_contact_relation || '');
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant photo library access to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const validExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg';
      const contentType = `image/${validExt === 'jpg' ? 'jpeg' : validExt}`;
      const filePath = `profile-photos/${user!.id}_${Date.now()}.${validExt}`;

      // React Native: use arraybuffer for reliable binary upload
      const response = await fetch(asset.uri);
      if (!response.ok) {
        throw new Error('Could not read the selected image. Please try a different photo.');
      }
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, arrayBuffer, { contentType, upsert: true });

      if (uploadError) {
        if (uploadError.message?.includes('network') || uploadError.message?.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
        if (uploadError.message?.includes('size') || uploadError.message?.includes('too large')) {
          throw new Error('Photo is too large. Please select a smaller image.');
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, photo_url: publicUrl })
        .eq('id', user!.id);

      if (updateError) {
        throw new Error('Photo uploaded but failed to update your profile. Please try again.');
      }

      setAvatarUrl(publicUrl);
      await refreshProfile();
      Alert.alert('Success', 'Profile photo updated!');
    } catch (error: any) {
      if (__DEV__) console.error('Avatar upload error:', error);
      const message = error.message || 'Failed to upload photo. Please try again later.';
      Alert.alert('Upload Failed', message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Full name is required.');
      return;
    }
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq('id', user!.id);

      if (error) throw error;
      await refreshProfile();
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveEmergency = async () => {
    setSavingEmergency(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          emergency_contact_name: emergencyName.trim() || null,
          emergency_contact_phone: emergencyPhone.trim() || null,
          emergency_contact_relation: emergencyRelation.trim() || null,
        })
        .eq('id', user!.id);

      if (error) throw error;
      Alert.alert('Saved', 'Emergency contact updated.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save emergency contact.');
    } finally {
      setSavingEmergency(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      Alert.alert('Confirmation Required', 'Please type DELETE to confirm.');
      return;
    }
    Alert.alert(
      'Delete Account',
      'This action is irreversible. Your account will be flagged for deletion.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ deletion_requested: true })
                .eq('id', user!.id);

              if (error) throw error;
              Alert.alert(
                'Account Deletion Requested',
                'Your account has been flagged for deletion. You will be signed out.',
                [{ text: 'OK', onPress: () => signOut() }]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to request deletion.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const s = createStyles(colors);
  const initials = (fullName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Profile</Text>
          <View style={s.backBtn} />
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          {/* Avatar Section */}
          <View style={s.avatarSection}>
            <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingPhoto}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.avatar} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={s.cameraBadge}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Profile Info Section */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Profile Information</Text>

            <Text style={s.label}>Full Name *</Text>
            <TextInput
              style={s.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />

            <Text style={s.label}>Email</Text>
            <View style={[s.input, s.inputDisabled]}>
              <Text style={s.disabledText}>{profile?.email || user?.email}</Text>
            </View>

            <Text style={s.label}>Phone</Text>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 123-4567"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[s.saveBtn, savingProfile && s.saveBtnDisabled]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={s.saveBtnText}>Save Profile</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Emergency Contact Section */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Emergency Contact</Text>

            <Text style={s.label}>Contact Name</Text>
            <TextInput
              style={s.input}
              value={emergencyName}
              onChangeText={setEmergencyName}
              placeholder="Emergency contact name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />

            <Text style={s.label}>Contact Phone</Text>
            <TextInput
              style={s.input}
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              placeholder="Emergency phone number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={s.label}>Relationship</Text>
            <TextInput
              style={s.input}
              value={emergencyRelation}
              onChangeText={setEmergencyRelation}
              placeholder="e.g., Spouse, Parent, Sibling"
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[s.saveBtn, savingEmergency && s.saveBtnDisabled]}
              onPress={handleSaveEmergency}
              disabled={savingEmergency}
            >
              {savingEmergency ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={s.saveBtnText}>Save Emergency Contact</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Change Password Section */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Change Password</Text>

            <Text style={s.label}>New Password</Text>
            <TextInput
              style={s.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />

            <Text style={s.label}>Confirm Password</Text>
            <TextInput
              style={s.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />

            <TouchableOpacity
              style={[s.saveBtn, savingPassword && s.saveBtnDisabled]}
              onPress={handleChangePassword}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={s.saveBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Data Rights */}
          <TouchableOpacity
            style={s.dataRightsCard}
            onPress={() => router.push('/data-rights' as any)}
            activeOpacity={0.7}
          >
            <View style={s.dataRightsIcon}>
              <Ionicons name="lock-closed" size={22} color={colors.info} />
            </View>
            <View style={s.dataRightsContent}>
              <Text style={s.dataRightsTitle}>Data Rights</Text>
              <Text style={s.dataRightsDesc}>Review, export, or request deletion of your child's data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Danger Zone */}
          <View style={[s.section, s.dangerSection]}>
            <Text style={[s.sectionTitle, { color: colors.danger }]}>Danger Zone</Text>
            <Text style={s.dangerText}>
              Deleting your account is permanent and cannot be undone. All your data will be removed.
            </Text>

            <Text style={s.label}>Type DELETE to confirm</Text>
            <TextInput
              style={[s.input, { borderColor: colors.danger + '50' }]}
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
              placeholder="DELETE"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[s.deleteBtn, (deleteConfirm !== 'DELETE' || deleting) && s.saveBtnDisabled]}
              onPress={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleting}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={s.deleteBtnText}>Delete My Account</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: colors.primary },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary + '30', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.primary },
  avatarInitials: { fontSize: 36, fontWeight: 'bold', color: colors.primary },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.background },
  section: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.2 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  inputDisabled: { opacity: 0.6 },
  disabledText: { fontSize: 16, color: colors.textMuted },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  dataRightsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.info + '30', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  dataRightsIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.info + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dataRightsContent: { flex: 1 },
  dataRightsTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  dataRightsDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  dangerSection: { borderColor: colors.danger + '40', backgroundColor: colors.danger + '08' },
  dangerText: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 8 },
  deleteBtn: { backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  deleteBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
