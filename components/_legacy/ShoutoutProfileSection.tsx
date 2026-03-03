// =============================================================================
// ShoutoutProfileSection — Shows shoutout stats on player/coach profiles
// =============================================================================

import { fetchShoutoutStats } from '@/lib/shoutout-service';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// =============================================================================
// Types
// =============================================================================

type Props = {
  profileId: string;
};

type ShoutoutStats = {
  received: number;
  given: number;
  categoryBreakdown: Array<{ category: string; emoji: string; color: string; count: number }>;
};

// =============================================================================
// Component
// =============================================================================

export default function ShoutoutProfileSection({ profileId }: Props) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<ShoutoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'received' | 'given'>('received');
  const s = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadStats();
  }, [profileId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await fetchShoutoutStats(profileId);
      setStats(data);
    } catch (err) {
      if (__DEV__) console.error('[ShoutoutProfile] error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={s.container}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!stats || (stats.received === 0 && stats.given === 0)) {
    return null; // Don't show section if no shoutouts
  }

  return (
    <View style={s.container}>
      {/* Section header */}
      <View style={s.headerRow}>
        <Ionicons name="heart" size={18} color="#A855F7" />
        <Text style={[s.headerTitle, { color: colors.text }]}>Shoutouts</Text>
      </View>

      {/* Summary counts */}
      <View style={s.countRow}>
        <TouchableTab
          label={`${stats.received} Received`}
          isActive={tab === 'received'}
          color="#A855F7"
          onPress={() => setTab('received')}
          textColor={colors.text}
          mutedColor={colors.textMuted}
        />
        <TouchableTab
          label={`${stats.given} Given`}
          isActive={tab === 'given'}
          color="#A855F7"
          onPress={() => setTab('given')}
          textColor={colors.text}
          mutedColor={colors.textMuted}
        />
      </View>

      {/* Category breakdown (received tab) */}
      {tab === 'received' && stats.categoryBreakdown.length > 0 && (
        <View style={s.categoryList}>
          {stats.categoryBreakdown.map((cat) => (
            <View key={cat.category} style={[s.categoryChip, { borderColor: cat.color + '40' }]}>
              <Text style={s.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[s.categoryName, { color: colors.text }]}>{cat.category}</Text>
              <View style={[s.categoryCount, { backgroundColor: cat.color + '20' }]}>
                <Text style={[s.categoryCountText, { color: cat.color }]}>x{cat.count}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {tab === 'received' && stats.categoryBreakdown.length === 0 && (
        <Text style={[s.emptyText, { color: colors.textMuted }]}>No shoutouts received yet</Text>
      )}

      {tab === 'given' && (
        <Text style={[s.givenText, { color: colors.textSecondary }]}>
          Has given {stats.given} shoutout{stats.given !== 1 ? 's' : ''} to teammates
        </Text>
      )}
    </View>
  );
}

// =============================================================================
// TouchableTab helper
// =============================================================================

function TouchableTab({ label, isActive, color, onPress, textColor, mutedColor }: {
  label: string;
  isActive: boolean;
  color: string;
  onPress: () => void;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        onPress={onPress}
        style={{
          fontSize: 14,
          fontWeight: isActive ? '700' : '500',
          color: isActive ? color : mutedColor,
          paddingVertical: 6,
          paddingHorizontal: 12,
        }}
      >
        {label}
      </Text>
      {isActive && (
        <View style={{ height: 2, width: '80%', backgroundColor: color, borderRadius: 1 }} />
      )}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      padding: 16,
      gap: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    countRow: {
      flexDirection: 'row',
      gap: 16,
    },
    categoryList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 20,
      borderWidth: 1,
    },
    categoryEmoji: {
      fontSize: 16,
    },
    categoryName: {
      fontSize: 13,
      fontWeight: '500',
    },
    categoryCount: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    categoryCountText: {
      fontSize: 12,
      fontWeight: '700',
    },
    emptyText: {
      fontSize: 13,
      fontStyle: 'italic',
    },
    givenText: {
      fontSize: 14,
    },
  });
