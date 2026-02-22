import AdminContextBar from '@/components/AdminContextBar';
import { displayTextStyle, radii, shadows, spacing } from '@/lib/design-tokens';
import { REPORTS, REPORT_CATEGORIES, ReportCategory, ReportDefinition, getReportsByCategory } from '@/lib/reports';
import { useSeason } from '@/lib/season';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { workingSeason } = useSeason();
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);

  const s = createStyles(colors);

  const handleCategoryPress = (category: ReportCategory) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
  };

  const handleReportPress = (report: ReportDefinition) => {
    router.push({
      pathname: '/report-viewer',
      params: {
        reportId: report.id,
        reportName: report.name,
      },
    });
  };

  const getVisualizationIcon = (viz: string): string => {
    switch (viz) {
      case 'table': return 'grid-outline';
      case 'bar': return 'bar-chart-outline';
      case 'pie': return 'pie-chart-outline';
      case 'calendar': return 'calendar-outline';
      case 'cards': return 'albums-outline';
      default: return 'document-outline';
    }
  };

  const filteredReports = selectedCategory 
    ? getReportsByCategory(selectedCategory)
    : [];

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Reports</Text>
        <Text style={s.subtitle}>
          {workingSeason?.name || 'All Seasons'}
        </Text>
      </View>

      <AdminContextBar />

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Category Grid */}
        <View style={s.categoryGrid}>
          {REPORT_CATEGORIES.map(category => {
            const isSelected = selectedCategory === category.id;
            const reportCount = getReportsByCategory(category.id).length;
            
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  s.categoryCard,
                  isSelected && { borderColor: category.color, borderWidth: 2 },
                ]}
                onPress={() => handleCategoryPress(category.id)}
                activeOpacity={0.7}
              >
                <View style={[s.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Ionicons name={category.icon as any} size={24} color={category.color} />
                </View>
                <Text style={s.categoryName}>{category.name}</Text>
                <Text style={s.categoryCount}>{reportCount} reports</Text>
                {isSelected && (
                  <View style={[s.selectedIndicator, { backgroundColor: category.color }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Report List */}
        {selectedCategory && (
          <View style={s.reportSection}>
            <View style={s.reportSectionHeader}>
              <Text style={s.reportSectionTitle}>
                {REPORT_CATEGORIES.find(c => c.id === selectedCategory)?.name} Reports
              </Text>
              <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {filteredReports.map(report => (
              <TouchableOpacity
                key={report.id}
                style={s.reportCard}
                onPress={() => handleReportPress(report)}
                activeOpacity={0.7}
              >
                <View style={s.reportIconWrap}>
                  <Ionicons 
                    name={getVisualizationIcon(report.visualization) as any} 
                    size={20} 
                    color={colors.primary} 
                  />
                </View>
                <View style={s.reportInfo}>
                  <Text style={s.reportName}>{report.name}</Text>
                  <Text style={s.reportDesc}>{report.description}</Text>
                  <View style={s.reportFilters}>
                    {report.filters.slice(0, 3).map(filter => (
                      <View key={filter} style={s.filterBadge}>
                        <Text style={s.filterBadgeText}>{formatFilterName(filter)}</Text>
                      </View>
                    ))}
                    {report.filters.length > 3 && (
                      <Text style={s.moreFilters}>+{report.filters.length - 3} more</Text>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* All Reports (when no category selected) */}
        {!selectedCategory && (
          <View style={s.allReportsSection}>
            <Text style={s.allReportsTitle}>Select a category above to view reports</Text>
            <Text style={s.allReportsSubtitle}>
              {REPORTS.length} reports available across {REPORT_CATEGORIES.length} categories
            </Text>

            {/* Quick access to popular reports */}
            <Text style={s.popularTitle}>Popular Reports</Text>
            {['registration_list', 'outstanding_balances', 'team_roster', 'uniform_order', 'master_schedule'].map(reportId => {
              const report = REPORTS.find(r => r.id === reportId);
              if (!report) return null;
              const category = REPORT_CATEGORIES.find(c => c.id === report.category);
              
              return (
                <TouchableOpacity
                  key={reportId}
                  style={s.popularReportCard}
                  onPress={() => handleReportPress(report)}
                  activeOpacity={0.7}
                >
                  <View style={[s.popularIcon, { backgroundColor: category?.color + '20' }]}>
                    <Ionicons name={category?.icon as any} size={18} color={category?.color} />
                  </View>
                  <View style={s.popularInfo}>
                    <Text style={s.popularName}>{report.name}</Text>
                    <Text style={s.popularCategory}>{category?.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function formatFilterName(filter: string): string {
  const names: Record<string, string> = {
    season: 'Season',
    sport: 'Sport',
    team: 'Team',
    ageGroup: 'Age',
    status: 'Status',
    dateRange: 'Dates',
  };
  return names[filter] || filter;
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.screenPadding,
    paddingTop: 60,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...displayTextStyle,
    fontSize: 28,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },

  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },

  // Report Section
  reportSection: {
    marginBottom: 24,
  },
  reportSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  reportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  reportDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  reportFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  filterBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  moreFilters: {
    fontSize: 10,
    color: colors.textMuted,
  },

  // All Reports Section
  allReportsSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  allReportsTitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  allReportsSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 24,
  },
  popularTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginTop: 8,
  },
  popularReportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    width: '100%',
  },
  popularIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  popularInfo: {
    flex: 1,
  },
  popularName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  popularCategory: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
