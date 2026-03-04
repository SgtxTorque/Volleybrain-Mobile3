import { useAuth } from '@/lib/auth';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

// ============================================================================
// TYPES
// ============================================================================

type SearchResult = {
  type: 'player' | 'team' | 'event' | 'user';
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
};

const RECENT_SEARCHES_KEY = 'admin_recent_searches';

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminSearchScreen() {
  const { user } = useAuth();
  const { workingSeason } = useSeason();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Auto-focus on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
    loadRecentSearches();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => performSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Recent Searches ───────────────────────────────────────

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch { /* ignore */ }
  };

  const saveRecentSearch = async (term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  // ── Search Logic ──────────────────────────────────────────

  const performSearch = useCallback(async (term: string) => {
    if (!term || !user?.id) return;
    setSearching(true);
    const allResults: SearchResult[] = [];
    const q = `%${term}%`;

    try {
      // Players
      const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name, jersey_number')
        .or(`first_name.ilike.${q},last_name.ilike.${q}`)
        .limit(5);

      if (players) {
        for (const p of players) {
          allResults.push({
            type: 'player',
            id: p.id,
            title: `${p.first_name} ${p.last_name}`,
            subtitle: p.jersey_number ? `#${p.jersey_number}` : 'Player',
            icon: 'person',
            color: BRAND.skyBlue,
            route: `/child-detail?playerId=${p.id}`,
          });
        }
      }

      // Teams
      if (workingSeason?.id) {
        const { data: teams } = await supabase
          .from('teams')
          .select('id, name, color')
          .eq('season_id', workingSeason.id)
          .ilike('name', q)
          .limit(5);

        if (teams) {
          for (const t of teams) {
            allResults.push({
              type: 'team',
              id: t.id,
              title: t.name,
              subtitle: 'Team',
              icon: 'people',
              color: t.color || BRAND.teal,
              route: `/team-management`,
            });
          }
        }

        // Events
        const { data: events } = await supabase
          .from('schedule_events')
          .select('id, title, event_type, event_date')
          .eq('season_id', workingSeason.id)
          .ilike('title', q)
          .limit(5);

        if (events) {
          for (const e of events) {
            allResults.push({
              type: 'event',
              id: e.id,
              title: e.title,
              subtitle: `${e.event_type} · ${e.event_date}`,
              icon: e.event_type === 'game' ? 'trophy' : 'calendar',
              color: e.event_type === 'game' ? BRAND.coral : BRAND.skyBlue,
              route: `/(tabs)/schedule`,
            });
          }
        }
      }

      // Users (profiles)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .or(`full_name.ilike.${q},email.ilike.${q}`)
        .limit(5);

      if (profiles) {
        for (const u of profiles) {
          allResults.push({
            type: 'user',
            id: u.id,
            title: u.full_name || u.email || 'Unknown',
            subtitle: `${u.role || 'User'} · ${u.email || ''}`,
            icon: 'person-circle',
            color: BRAND.skyBlue,
            route: `/users`,
          });
        }
      }
    } catch (err) {
      if (__DEV__) console.error('Search error:', err);
    }

    setResults(allResults);
    setSearching(false);
  }, [user?.id, workingSeason?.id]);

  // ── Handlers ──────────────────────────────────────────────

  const handleResultPress = (result: SearchResult) => {
    saveRecentSearch(query.trim());
    router.push(result.route as any);
  };

  const handleRecentPress = (term: string) => {
    setQuery(term);
  };

  // ── Group results by type ─────────────────────────────────

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  const typeLabels: Record<string, string> = {
    player: 'Players',
    team: 'Teams',
    event: 'Events',
    user: 'Users',
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Search</Text>
        <View style={s.headerBtn} />
      </View>

      {/* Search Bar */}
      <View style={s.searchBarWrap}>
        <Ionicons name="search" size={18} color={BRAND.textMuted} style={{ marginLeft: 14 }} />
        <TextInput
          ref={inputRef}
          style={s.searchInput}
          placeholder="Search players, teams, events, users..."
          placeholderTextColor={BRAND.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={{ paddingHorizontal: 12 }}>
            <Ionicons name="close-circle" size={18} color={BRAND.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Searching indicator */}
        {searching && (
          <View style={s.centered}>
            <ActivityIndicator size="small" color={BRAND.skyBlue} />
          </View>
        )}

        {/* Recent searches (when input is empty) */}
        {!query.trim() && recentSearches.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>RECENT SEARCHES</Text>
            {recentSearches.map((term, i) => (
              <TouchableOpacity
                key={i}
                style={s.recentRow}
                onPress={() => handleRecentPress(term)}
              >
                <Ionicons name="time-outline" size={16} color={BRAND.textMuted} />
                <Text style={s.recentText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No results */}
        {query.trim() && !searching && results.length === 0 && (
          <View style={s.emptyWrap}>
            <Image
              source={require('@/assets/images/mascot/SleepLynx.png')}
              style={{ width: 100, height: 100 }}
              resizeMode="contain"
            />
            <Text style={s.emptyTitle}>No Results</Text>
            <Text style={s.emptySubtext}>Try a different search term</Text>
          </View>
        )}

        {/* Grouped results */}
        {Object.entries(grouped).map(([type, items]) => (
          <View key={type} style={s.section}>
            <Text style={s.sectionLabel}>{typeLabels[type] || type.toUpperCase()}</Text>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={s.resultRow}
                onPress={() => handleResultPress(item)}
                activeOpacity={0.7}
              >
                <View style={[s.resultIcon, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.resultTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.resultSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={BRAND.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...displayTextStyle,
    fontSize: 22,
    color: BRAND.textPrimary,
  },

  // Search Bar
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.screenPadding,
    marginBottom: 12,
    backgroundColor: BRAND.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: BRAND.border,
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },

  // Sections
  section: {
    paddingHorizontal: spacing.screenPadding,
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
    color: BRAND.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  // Recent searches
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  recentText: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textPrimary,
  },

  // Results
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.white,
    borderRadius: radii.card,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    ...shadows.card,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textPrimary,
  },
  resultSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textMuted,
    marginTop: 2,
  },

  // Empty / Loading
  centered: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    ...displayTextStyle,
    fontSize: 20,
    color: BRAND.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textMuted,
    marginTop: 4,
  },
});
