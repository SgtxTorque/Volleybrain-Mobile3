/**
 * AdminSearchResultsScreen — full search results with categorized sections.
 * Receives query via route param, runs full search across 6 entity types.
 */
import React, { useEffect, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGlobalSearch, type SearchResult, type SearchEntityType } from '@/hooks/useGlobalSearch';
import { MASCOT } from '@/lib/mascot-images';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { D_COLORS, D_RADII } from '@/theme/d-system';

// ─── Entity icon config ──────────────────────────────────────────────────────

const ENTITY_CONFIG: Record<SearchEntityType, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  player: { icon: 'person', color: BRAND.skyBlue, label: 'Players' },
  parent: { icon: 'people', color: BRAND.teal, label: 'Parents' },
  team: { icon: 'shield', color: '#8B5CF6', label: 'Teams' },
  staff: { icon: 'clipboard', color: BRAND.warning, label: 'Staff' },
  event: { icon: 'calendar', color: BRAND.coral, label: 'Events' },
  payment: { icon: 'cash', color: BRAND.success, label: 'Payments' },
};

// ─── Section order ───────────────────────────────────────────────────────────

const SECTION_ORDER: SearchEntityType[] = ['player', 'parent', 'team', 'staff', 'event', 'payment'];

// ─── Result Row ──────────────────────────────────────────────────────────────

function ResultRow({ result, onPress }: { result: SearchResult; onPress: () => void }) {
  const config = ENTITY_CONFIG[result.entityType];
  const hasNav = !!result.navigateTo;

  return (
    <TouchableOpacity
      style={styles.resultRow}
      activeOpacity={hasNav ? 0.7 : 1}
      onPress={hasNav ? onPress : undefined}
      disabled={!hasNav}
    >
      <View style={[styles.iconWrap, { backgroundColor: config.color + '15' }]}>
        <Ionicons name={config.icon} size={16} color={config.color} />
      </View>
      <View style={styles.resultText}>
        <Text style={styles.resultTitle} numberOfLines={1}>{result.title}</Text>
        {result.subtitle ? (
          <Text style={styles.resultSubtitle} numberOfLines={1}>{result.subtitle}</Text>
        ) : null}
      </View>
      {result.meta ? (
        <Text style={styles.resultMeta} numberOfLines={1}>{result.meta}</Text>
      ) : null}
      {hasNav && <Ionicons name="chevron-forward" size={14} color={BRAND.textFaint} />}
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AdminSearchResultsScreen() {
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q: string }>();
  const {
    query,
    results,
    loading,
    hasSearched,
    handleQueryChange,
    executeFullSearch,
  } = useGlobalSearch();

  const didInit = useRef(false);

  // Initialize with query param on mount
  useEffect(() => {
    if (q && !didInit.current) {
      didInit.current = true;
      handleQueryChange(q);
      executeFullSearch(q);
    }
  }, [q]);

  const handleNav = (result: SearchResult) => {
    if (!result.navigateTo) return;
    const params = result.navigateParams || {};
    const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    router.push(`${result.navigateTo}${qs ? '?' + qs : ''}` as any);
  };

  const handleSubmit = () => {
    executeFullSearch();
  };

  // Build sections with data
  const sections = SECTION_ORDER
    .map(type => ({
      type,
      config: ENTITY_CONFIG[type],
      items: results[type === 'player' ? 'players' : type === 'parent' ? 'parents' : type === 'team' ? 'teams' : type === 'staff' ? 'staff' : type === 'event' ? 'events' : 'payments'],
    }))
    .filter(s => s.items.length > 0);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Search header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
          </TouchableOpacity>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={16} color={BRAND.textFaint} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={handleQueryChange}
              onSubmitEditing={handleSubmit}
              placeholder="Search players, families, teams..."
              placeholderTextColor={BRAND.textFaint}
              returnKeyType="search"
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => handleQueryChange('')}>
                <Ionicons name="close-circle" size={18} color={BRAND.textFaint} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingBar}>
            <ActivityIndicator size="small" color={BRAND.skyBlue} />
          </View>
        )}

        {/* Results */}
        {hasSearched && !loading && results.totalCount === 0 ? (
          <View style={styles.emptyWrap}>
            <Image source={MASCOT.CONFUSED} style={styles.emptyMascot} resizeMode="contain" />
            <Text style={styles.emptyTitle}>No results for '{query}'</Text>
            <Text style={styles.emptySubtitle}>Try a different search term</Text>
          </View>
        ) : hasSearched ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Total count */}
            <Text style={styles.totalCount}>
              {results.totalCount} result{results.totalCount !== 1 ? 's' : ''} for '{query}'
            </Text>

            {/* Categorized sections */}
            {sections.map(({ type, config, items }) => (
              <View key={type} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name={config.icon} size={16} color={config.color} />
                  <Text style={styles.sectionTitle}>{config.label} ({items.length})</Text>
                </View>
                {items.map(item => (
                  <ResultRow key={item.id} result={item} onPress={() => handleNav(item)} />
                ))}
              </View>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: D_COLORS.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.white,
    borderRadius: 12,
    height: 40,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textPrimary,
    padding: 0,
  },
  loadingBar: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  totalCount: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginBottom: 16,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },

  // Result row
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.white,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 4,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultText: {
    flex: 1,
    gap: 1,
  },
  resultTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  resultSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  resultMeta: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textMuted,
    maxWidth: 100,
    textAlign: 'right',
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyMascot: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    color: BRAND.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
