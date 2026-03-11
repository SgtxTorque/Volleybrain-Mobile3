import { useSeason } from '@/lib/season';
import { displayTextStyle, radii } from '@/lib/design-tokens';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  upcoming: '#0EA5E9',
  archived: '#6B7280',
  completed: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  upcoming: 'Upcoming',
  archived: 'Archived',
  completed: 'Completed',
};

export default function SeasonSelector() {
  const { allSeasons, workingSeason, setWorkingSeason } = useSeason();
  const [showPicker, setShowPicker] = useState(false);

  type SeasonItem = (typeof allSeasons)[number];

  // Filter to active/upcoming for main selector; archived/completed accessible via Season Management
  const selectableSeasons = useMemo(() =>
    allSeasons.filter(s => {
      const st = s.status || '';
      return st !== 'archived' && st !== 'completed';
    }),
  [allSeasons]);

  const groupedSeasons = useMemo(() => {
    const groups: Record<string, SeasonItem[]> = {};
    for (const season of selectableSeasons) {
      const key = season.status || 'active';
      if (!groups[key]) groups[key] = [];
      groups[key].push(season);
    }
    return groups;
  }, [selectableSeasons]);

  const statusOrder = ['active', 'upcoming', 'archived', 'completed'];

  // Don't render if there's only one selectable season
  if (selectableSeasons.length <= 1) return null;

  const handleSelect = (season: SeasonItem) => {
    setWorkingSeason(season);
    setShowPicker(false);
  };

  // Abbreviate season name for the pill
  const pillLabel = workingSeason?.name
    ? workingSeason.name.length > 14
      ? workingSeason.name.slice(0, 13) + '\u2026'
      : workingSeason.name
    : 'Season';

  return (
    <>
      <TouchableOpacity style={s.pill} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
        <Ionicons name="calendar" size={12} color="#FFF" />
        <Text style={s.pillText}>{pillLabel}</Text>
        <Ionicons name="chevron-down" size={10} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={showPicker} animationType="slide" transparent>
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Select Season</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {statusOrder.map((status) => {
                const seasons = groupedSeasons[status];
                if (!seasons || seasons.length === 0) return null;
                const isArchived = status === 'archived' || status === 'completed';
                return (
                  <View key={status}>
                    <Text style={s.sectionHeader}>{STATUS_LABELS[status] || status}</Text>
                    {seasons.map((season) => {
                      const isSelected = season.id === workingSeason?.id;
                      return (
                        <TouchableOpacity
                          key={season.id}
                          style={[s.seasonRow, isSelected && s.seasonRowSelected]}
                          onPress={() => handleSelect(season)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              s.statusDot,
                              { backgroundColor: STATUS_COLORS[status] || '#6B7280' },
                            ]}
                          />
                          <Text
                            style={[
                              s.seasonRowText,
                              isArchived && { opacity: 0.5 },
                            ]}
                            numberOfLines={1}
                          >
                            {season.name}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={22} color={BRAND.skyBlue} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  // Pill — matches RoleSelector navy style
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },

  // Bottom sheet overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    ...displayTextStyle,
    fontSize: 18,
    color: '#1B2838',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Grouped sections
  sectionHeader: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  seasonRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.card,
    gap: 10,
  },
  seasonRowSelected: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },
  seasonRowText: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: '#1B2838',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
