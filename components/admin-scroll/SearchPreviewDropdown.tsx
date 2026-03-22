/**
 * SearchPreviewDropdown — instant search results overlay below the search bar.
 * Shows up to 5 results with entity type icons, labels, and "See all results" link.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { D_RADII } from '@/theme/d-system';
import type { SearchResult, SearchEntityType } from '@/hooks/useGlobalSearch';

interface Props {
  results: SearchResult[];
  query: string;
  visible: boolean;
  onResultTap: (result: SearchResult) => void;
  onSeeAll: () => void;
  onDismiss: () => void;
}

// ─── Entity icon config ──────────────────────────────────────────────────────

const ENTITY_CONFIG: Record<SearchEntityType, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  player: { icon: 'person', color: BRAND.skyBlue, label: 'Player' },
  parent: { icon: 'people', color: BRAND.teal, label: 'Parent' },
  team: { icon: 'shield', color: '#8B5CF6', label: 'Team' },
  staff: { icon: 'clipboard', color: BRAND.warning, label: 'Staff' },
  event: { icon: 'calendar', color: BRAND.coral, label: 'Event' },
  payment: { icon: 'cash', color: BRAND.success, label: 'Payment' },
};

export default function SearchPreviewDropdown({
  results,
  query,
  visible,
  onResultTap,
  onSeeAll,
  onDismiss,
}: Props) {
  if (!visible || results.length === 0 || query.length < 2) return null;

  return (
    <>
      {/* Backdrop for dismissal */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
      />
      <View style={styles.dropdown}>
        {results.map((result) => {
          const config = ENTITY_CONFIG[result.entityType];
          return (
            <TouchableOpacity
              key={`${result.entityType}-${result.id}`}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => onResultTap(result)}
            >
              <View style={[styles.iconWrap, { backgroundColor: config.color + '15' }]}>
                <Ionicons name={config.icon} size={16} color={config.color} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.title} numberOfLines={1}>{result.title}</Text>
                {result.subtitle ? (
                  <Text style={styles.subtitle} numberOfLines={1}>{result.subtitle}</Text>
                ) : null}
              </View>
              <View style={[styles.pill, { backgroundColor: config.color + '12' }]}>
                <Text style={[styles.pillText, { color: config.color }]}>{config.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {/* See all results */}
        <TouchableOpacity style={styles.seeAllRow} activeOpacity={0.7} onPress={onSeeAll}>
          <Text style={styles.seeAllText}>See all results</Text>
          <Ionicons name="arrow-forward" size={14} color={BRAND.skyBlue} />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  dropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: BRAND.white,
    borderRadius: D_RADII.cardSmall,
    borderWidth: 1,
    borderColor: BRAND.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 999,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  pill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  seeAllText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.skyBlue,
  },
});
