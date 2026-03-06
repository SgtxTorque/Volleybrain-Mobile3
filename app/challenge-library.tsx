// =============================================================================
// Challenge Library — Browse & pick a template to customize
// =============================================================================
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  StyleSheet,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  CHALLENGE_TEMPLATES,
  CHALLENGE_CATEGORIES,
  DIFFICULTY_CONFIG,
  type ChallengeCategory,
} from '@/lib/challenge-templates';
import type { ChallengeTemplate } from '@/lib/challenge-templates';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MASCOT_CLIPBOARD = require('@/assets/images/coach-mascot/coachlynxmalewhistle.png');

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_GAP = SPACING.cardGap;
const GRID_PADDING = SPACING.pagePadding;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - COLUMN_GAP) / 2;

type FilterKey = 'all' | ChallengeCategory;

const FILTER_PILLS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'game', label: 'Game' },
  { key: 'development', label: 'Development' },
  { key: 'fun', label: 'Fun' },
  { key: 'team_building', label: 'Team Building' },
  { key: 'mental', label: 'Mental' },
  { key: 'fitness', label: 'Fitness' },
];

// Sentinel item for "Create Your Own" card at the end
const CREATE_OWN_SENTINEL = '__create_own__';

type GridItem = ChallengeTemplate | typeof CREATE_OWN_SENTINEL;

// =============================================================================
// Component
// =============================================================================
export default function ChallengeLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  // ── Filtered data ────────────────────────────────────────────────────────
  const filtered: GridItem[] = [
    ...(activeFilter === 'all'
      ? CHALLENGE_TEMPLATES
      : CHALLENGE_TEMPLATES.filter((t) => t.category === activeFilter)),
    CREATE_OWN_SENTINEL,
  ];

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleTemplatePress = useCallback(
    (template: ChallengeTemplate) => {
      router.push({
        pathname: '/create-challenge',
        params: { templateId: template.id },
      });
    },
    [router],
  );

  const handleCreateOwn = useCallback(() => {
    router.push('/create-challenge' as any);
  }, [router]);

  // ── Render helpers ───────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<GridItem>) => {
      if (item === CREATE_OWN_SENTINEL) {
        return (
          <Pressable
            style={({ pressed }) => [
              s.card,
              s.createOwnCard,
              pressed && s.cardPressed,
            ]}
            onPress={handleCreateOwn}
          >
            <View style={s.createOwnIconWrap}>
              <Ionicons name="add-circle-outline" size={36} color={BRAND.teal} />
            </View>
            <Text style={s.createOwnTitle}>Create Your Own</Text>
            <Text style={s.createOwnSubtitle}>Build a custom challenge</Text>
          </Pressable>
        );
      }

      const template = item as ChallengeTemplate;
      const diff = DIFFICULTY_CONFIG[template.difficulty];
      const cat = CHALLENGE_CATEGORIES[template.category];

      return (
        <Pressable
          style={({ pressed }) => [s.card, pressed && s.cardPressed]}
          onPress={() => handleTemplatePress(template)}
        >
          {/* Icon */}
          <Text style={s.cardIcon}>{template.icon}</Text>

          {/* Title */}
          <Text style={s.cardTitle} numberOfLines={2}>
            {template.title}
          </Text>

          {/* Difficulty badge */}
          <View style={[s.diffBadge, { backgroundColor: diff.bgColor }]}>
            <Text style={[s.diffBadgeText, { color: diff.color }]}>
              {diff.label}
            </Text>
          </View>

          {/* Meta row */}
          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Ionicons name="star" size={12} color={BRAND.gold} />
              <Text style={s.metaText}>{template.defaultXp} XP</Text>
            </View>
            <View style={s.metaItem}>
              <Ionicons name="time-outline" size={12} color={BRAND.textMuted} />
              <Text style={s.metaText}>{template.defaultDurationDays}d</Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [handleTemplatePress, handleCreateOwn],
  );

  const keyExtractor = useCallback(
    (item: GridItem, index: number) =>
      item === CREATE_OWN_SENTINEL ? 'create-own' : (item as ChallengeTemplate).id,
    [],
  );

  // ── Header component for FlatList ────────────────────────────────────────
  const ListHeader = useCallback(
    () => (
      <View style={s.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterScroll}
        >
          {FILTER_PILLS.map((pill) => {
            const isActive = activeFilter === pill.key;
            return (
              <Pressable
                key={pill.key}
                style={[s.pill, isActive && s.pillActive]}
                onPress={() => setActiveFilter(pill.key)}
              >
                <Text style={[s.pillText, isActive && s.pillTextActive]}>
                  {pill.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    ),
    [activeFilter],
  );

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          style={s.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={BRAND.textPrimary} />
        </Pressable>

        <Text style={s.headerTitle}>Challenge Library</Text>

        <Image
          source={MASCOT_CLIPBOARD}
          style={s.mascot}
          contentFit="contain"
        />
      </View>

      {/* Grid */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        ListHeaderComponent={ListHeader}
        columnWrapperStyle={s.columnWrapper}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.pagePadding,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    color: BRAND.textPrimary,
    marginLeft: 12,
  },
  mascot: {
    width: 50,
    height: 50,
  },

  // ── Filter pills ─────────────────────────────────────────────────────────
  filterRow: {
    marginBottom: 16,
  },
  filterScroll: {
    paddingHorizontal: SPACING.pagePadding,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  pillActive: {
    backgroundColor: BRAND.navy,
    borderColor: BRAND.navy,
  },
  pillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  pillTextActive: {
    color: BRAND.white,
  },

  // ── Grid ──────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: SPACING.pagePadding,
    paddingBottom: 40,
  },
  columnWrapper: {
    gap: COLUMN_GAP,
    marginBottom: COLUMN_GAP,
  },

  // ── Template card ─────────────────────────────────────────────────────────
  card: {
    width: CARD_WIDTH,
    backgroundColor: BRAND.white,
    borderRadius: SPACING.cardRadius,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: SPACING.cardPadding,
    shadowColor: '#10284C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
    marginBottom: 8,
    lineHeight: 18,
  },
  diffBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  diffBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
  },

  // ── Create Your Own card ──────────────────────────────────────────────────
  createOwnCard: {
    borderColor: BRAND.teal,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.white,
  },
  createOwnIconWrap: {
    marginBottom: 8,
  },
  createOwnTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.teal,
    marginBottom: 4,
    textAlign: 'center',
  },
  createOwnSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    textAlign: 'center',
  },
});
