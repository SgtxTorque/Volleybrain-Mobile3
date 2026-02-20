import React, { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { useSport, type Sport } from '@/lib/sport';
import { useTheme } from '@/lib/theme';

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

export default function AdminContextBar() {
  const { isAdmin } = usePermissions();
  const { allSeasons, workingSeason, setWorkingSeason } = useSeason();
  const { sports, activeSport, setActiveSport } = useSport();
  const { colors } = useTheme();

  const [seasonModalVisible, setSeasonModalVisible] = useState(false);
  const [sportModalVisible, setSportModalVisible] = useState(false);

  const s = createStyles(colors);

  type SeasonItem = (typeof allSeasons)[number];

  const groupedSeasons = useMemo(() => {
    const groups: Record<string, SeasonItem[]> = {};
    for (const season of allSeasons) {
      const key = season.status || 'archived';
      if (!groups[key]) groups[key] = [];
      groups[key].push(season);
    }
    return groups;
  }, [allSeasons]);

  const statusOrder = ['active', 'upcoming', 'archived', 'completed'];

  if (!isAdmin) return null;

  const handleSelectSeason = (season: SeasonItem) => {
    setWorkingSeason(season);
    setSeasonModalVisible(false);
  };

  const handleSelectSport = (sport: Sport) => {
    setActiveSport(sport);
    setSportModalVisible(false);
  };

  return (
    <View style={s.bar}>
      {/* Season Pill */}
      <TouchableOpacity style={s.pill} onPress={() => setSeasonModalVisible(true)}>
        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
        <Text style={s.pillText} numberOfLines={1}>
          {workingSeason?.name || 'No Season'}
        </Text>
        <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Sport Pill — hidden if only one sport */}
      {sports.length > 1 && (
        <TouchableOpacity style={s.pill} onPress={() => setSportModalVisible(true)}>
          <Text style={{ fontSize: 14 }}>{activeSport?.icon || '\uD83C\uDFD0'}</Text>
          <Text style={s.pillText} numberOfLines={1}>
            {activeSport?.name || 'Sport'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Season Picker Modal */}
      <Modal
        visible={seasonModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSeasonModalVisible(false)}
      >
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setSeasonModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Season</Text>
              <TouchableOpacity onPress={() => setSeasonModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
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
                          onPress={() => handleSelectSeason(season)}
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
                            <Ionicons name="checkmark" size={18} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Sport Picker Modal */}
      <Modal
        visible={sportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSportModalVisible(false)}
      >
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setSportModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Sport</Text>
              <TouchableOpacity onPress={() => setSportModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {sports.map((sport) => {
                const isSelected = sport.id === activeSport?.id;
                return (
                  <TouchableOpacity
                    key={sport.id}
                    style={[s.seasonRow, isSelected && s.seasonRowSelected]}
                    onPress={() => handleSelectSport(sport)}
                  >
                    <Text style={{ fontSize: 18 }}>{sport.icon || '\uD83C\uDFD0'}</Text>
                    <Text style={s.seasonRowText} numberOfLines={1}>
                      {sport.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    bar: {
      backgroundColor: colors.bgSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 8,
    },
    pill: {
      backgroundColor: colors.glassCard,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      maxWidth: 180,
    },
    pillText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      width: '100%',
      maxHeight: '70%',
      padding: 20,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
        },
        android: {
          elevation: 10,
        },
      }),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    sectionHeader: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 16,
      marginBottom: 8,
    },
    seasonRow: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      gap: 10,
    },
    seasonRowSelected: {
      backgroundColor: colors.primary + '15',
    },
    seasonRowText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
  });
