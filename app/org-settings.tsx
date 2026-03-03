import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrgSettingsScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [description, setDescription] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const s = createStyles(colors);

  useEffect(() => {
    fetchOrg();
  }, [profile?.current_organization_id]);

  const fetchOrg = async () => {
    if (!profile?.current_organization_id) { setLoading(false); return; }

    const { data } = await supabase
      .from('organizations')
      .select('name, contact_email, contact_phone, description')
      .eq('id', profile.current_organization_id)
      .single();

    if (data) {
      setOrgName(data.name || '');
      setContactEmail(data.contact_email || '');
      setContactPhone(data.contact_phone || '');
      setDescription(data.description || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile?.current_organization_id) return;
    setSaving(true);

    const { error } = await supabase
      .from('organizations')
      .update({
        name: orgName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        description: description.trim(),
      })
      .eq('id', profile.current_organization_id);

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setHasChanges(false);
    Alert.alert('Saved', 'Organization settings updated.');
  };

  const updateField = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Org Settings</Text>
        <View style={s.backBtn} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          <Text style={s.formLabel}>ORGANIZATION NAME</Text>
          <TextInput style={s.formInput} value={orgName} onChangeText={updateField(setOrgName)} placeholder="Organization name" placeholderTextColor={colors.textMuted} />

          <Text style={s.formLabel}>CONTACT EMAIL</Text>
          <TextInput style={s.formInput} value={contactEmail} onChangeText={updateField(setContactEmail)} placeholder="contact@example.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" />

          <Text style={s.formLabel}>PHONE</Text>
          <TextInput style={s.formInput} value={contactPhone} onChangeText={updateField(setContactPhone)} placeholder="(555) 123-4567" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />

          <Text style={s.formLabel}>DESCRIPTION</Text>
          <TextInput style={[s.formInput, s.textArea]} value={description} onChangeText={updateField(setDescription)} placeholder="About your organization..." placeholderTextColor={colors.textMuted} multiline />

          <TouchableOpacity
            style={[s.saveBtn, !hasChanges && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!hasChanges || saving}
          >
            <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>

          {/* Web redirect */}
          <View style={s.webCard}>
            <Image
              source={require('@/assets/images/mascot/laptoplynx.png')}
              style={s.webMascot}
              resizeMode="contain"
            />
            <View style={s.webInfo}>
              <Text style={s.webTitle}>Need full org management?</Text>
              <Text style={s.webSubtext}>Payments, branding, and more are available on the web.</Text>
            </View>
            <TouchableOpacity
              style={s.webBtn}
              onPress={() => Linking.openURL('https://thelynxapp.com')}
            >
              <Ionicons name="open-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { ...displayTextStyle, fontSize: 18, color: colors.text },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.screenPadding },
    formLabel: {
      fontSize: 12, fontFamily: FONTS.bodySemiBold, color: colors.textMuted,
      marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    formInput: {
      backgroundColor: colors.glassCard, borderRadius: radii.card, borderWidth: 1,
      borderColor: colors.glassBorder, paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 16, color: colors.text,
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    saveBtn: {
      backgroundColor: colors.primary, borderRadius: radii.card, paddingVertical: 16,
      alignItems: 'center', marginTop: 24,
    },
    saveBtnText: { fontSize: 16, fontFamily: FONTS.bodyBold, color: colors.background },
    webCard: {
      flexDirection: 'row', alignItems: 'center', marginTop: 32,
      backgroundColor: colors.glassCard, borderRadius: radii.card, padding: 16,
      borderWidth: 1, borderColor: colors.glassBorder, ...shadows.card,
    },
    webMascot: { width: 48, height: 48, marginRight: 12 },
    webInfo: { flex: 1 },
    webTitle: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: colors.text },
    webSubtext: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    webBtn: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '15',
      justifyContent: 'center', alignItems: 'center',
    },
  });
