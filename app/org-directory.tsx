import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Organization = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  settings: {
    city?: string;
    state?: string;
    contact_email?: string;
    description?: string;
    [key: string]: any;
  } | null;
};

export default function OrgDirectoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [filtered, setFiltered] = useState<Organization[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(orgs);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      orgs.filter(
        o =>
          o.name.toLowerCase().includes(q) ||
          o.settings?.city?.toLowerCase().includes(q) ||
          o.settings?.state?.toLowerCase().includes(q)
      )
    );
  }, [search, orgs]);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, is_active, settings')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setOrgs(data || []);
      setFiltered(data || []);
    } catch (error) {
      if (__DEV__) console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const s = createStyles(colors);

  // Detail View
  if (selectedOrg) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setSelectedOrg(null)} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{selectedOrg.name}</Text>
          <View style={s.backBtn} />
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          <View style={s.orgDetailHeader}>
            {selectedOrg.logo_url ? (
              <Image source={{ uri: selectedOrg.logo_url }} style={s.orgDetailLogo} />
            ) : (
              <View style={s.orgDetailLogoPlaceholder}>
                <Text style={s.orgDetailInitials}>
                  {selectedOrg.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={s.orgDetailName}>{selectedOrg.name}</Text>
            {selectedOrg.settings?.city && selectedOrg.settings?.state && (
              <Text style={s.orgDetailLocation}>
                {selectedOrg.settings.city}, {selectedOrg.settings.state}
              </Text>
            )}
          </View>

          <View style={s.infoCard}>
            {selectedOrg.settings?.description && (
              <View style={s.infoRow}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                <Text style={s.infoText}>{selectedOrg.settings.description}</Text>
              </View>
            )}
            {selectedOrg.settings?.contact_email && (
              <View style={s.infoRow}>
                <Ionicons name="mail-outline" size={20} color={colors.primary} />
                <Text style={s.infoText}>{selectedOrg.settings.contact_email}</Text>
              </View>
            )}
            {selectedOrg.settings?.city && (
              <View style={s.infoRow}>
                <Ionicons name="location-outline" size={20} color={colors.primary} />
                <Text style={s.infoText}>
                  {[selectedOrg.settings.city, selectedOrg.settings.state].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}
            <View style={s.infoRow}>
              <Ionicons name="link-outline" size={20} color={colors.primary} />
              <Text style={s.infoText}>{selectedOrg.slug}</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // List View
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Find Organizations</Text>
        <View style={s.backBtn} />
      </View>

      <View style={s.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, city, or state..."
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.emptyContainer}>
          <Ionicons name="business-outline" size={64} color={colors.textMuted} />
          <Text style={s.emptyTitle}>
            {search ? 'No Results' : 'No Organizations'}
          </Text>
          <Text style={s.emptySubtitle}>
            {search ? 'Try a different search term' : 'No organizations found'}
          </Text>
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          <Text style={s.resultCount}>{filtered.length} organization{filtered.length !== 1 ? 's' : ''}</Text>
          {filtered.map(org => (
            <TouchableOpacity
              key={org.id}
              style={s.orgCard}
              onPress={() => setSelectedOrg(org)}
              activeOpacity={0.7}
            >
              {org.logo_url ? (
                <Image source={{ uri: org.logo_url }} style={s.orgLogo} />
              ) : (
                <View style={s.orgLogoPlaceholder}>
                  <Text style={s.orgInitials}>
                    {org.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.orgName}>{org.name}</Text>
                {org.settings?.city && org.settings?.state && (
                  <Text style={s.orgLocation}>
                    {org.settings.city}, {org.settings.state}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, margin: 16, paddingHorizontal: 16, gap: 10, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  resultCount: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  orgCard: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  orgLogo: { width: 48, height: 48, borderRadius: 12 },
  orgLogoPlaceholder: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  orgInitials: { fontSize: 16, fontWeight: '700', color: colors.primary },
  orgName: { fontSize: 16, fontWeight: '600', color: colors.text },
  orgLocation: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  orgDetailHeader: { alignItems: 'center', paddingVertical: 24 },
  orgDetailLogo: { width: 80, height: 80, borderRadius: 20 },
  orgDetailLogoPlaceholder: { width: 80, height: 80, borderRadius: 20, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  orgDetailInitials: { fontSize: 28, fontWeight: '700', color: colors.primary },
  orgDetailName: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 12, textAlign: 'center' },
  orgDetailLocation: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  infoCard: { backgroundColor: colors.glassCard, borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
});
