import {
    REPORTS,
    ReportFilter,
    fetchJerseyNumberConflicts,
    fetchMasterSchedule,
    fetchNewVsReturning,
    fetchOutstandingBalances,
    fetchPlayerHistory,
    fetchRegistrationByAge,
    fetchRegistrationList,
    fetchRegistrationSummary,
    fetchTeamRoster,
    fetchTeamSizeSummary,
    fetchUnassignedPlayers,
    fetchUniformOrderReport,
    fetchUniformSizes,
    fetchWaiverStatus,
    shareCSV,
} from '@/lib/reports';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ReportViewerScreen() {
  const { colors } = useTheme();
  const { workingSeason, allSeasons } = useSeason();
  const router = useRouter();
  const { reportId, reportName } = useLocalSearchParams<{ reportId: string; reportName: string }>();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(workingSeason?.id);
  const [selectedSportId, setSelectedSportId] = useState<string | undefined>();
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();
  const [selectedAgeGroupId, setSelectedAgeGroupId] = useState<string | undefined>();

  // Filter options
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [ageGroups, setAgeGroups] = useState<{ id: string; name: string }[]>([]);
  const [sports, setSports] = useState<{ id: string; name: string }[]>([]);

  const report = REPORTS.find(r => r.id === reportId);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    if (report) {
      loadReportData();
    }
  }, [reportId, selectedSeasonId, selectedSportId, selectedTeamId, selectedAgeGroupId]);

  const loadFilterOptions = async () => {
    // Load teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name')
      .order('name');
    setTeams(teamsData || []);

    // Load age groups (if table exists)
    try {
      const { data: ageData } = await supabase
        .from('age_groups')
        .select('id, name')
        .order('name');
      setAgeGroups(ageData || []);
    } catch (e) {
      // age_groups table may not exist
      setAgeGroups([]);
    }

    // Load sports
    const { data: sportsData } = await supabase
      .from('sports')
      .select('id, name')
      .order('name');
    setSports(sportsData || []);
  };

  const loadReportData = async () => {
    if (!report) return;

    setLoading(true);
    setError(null);

    const filters: ReportFilter = {
      seasonId: selectedSeasonId,
      sportId: selectedSportId,
      teamId: selectedTeamId,
      ageGroupId: selectedAgeGroupId,
    };

    try {
      let result: any;

      switch (reportId) {
        case 'registration_summary':
          result = await fetchRegistrationSummary(filters);
          break;
        case 'registration_by_age':
          result = await fetchRegistrationByAge(filters);
          break;
        case 'registration_list':
        case 'pending_approvals':
          result = await fetchRegistrationList(filters);
          if (reportId === 'pending_approvals') {
            result = result.filter((r: any) => r.status === 'new');
          }
          break;
        case 'new_vs_returning':
          result = await fetchNewVsReturning(filters);
          break;
        case 'outstanding_balances':
        case 'payment_summary':
          result = await fetchOutstandingBalances(filters);
          break;
        case 'team_roster':
        case 'emergency_contacts':
          result = await fetchTeamRoster(filters);
          break;
        case 'unassigned_players':
          result = await fetchUnassignedPlayers(filters);
          break;
        case 'team_size_summary':
          result = await fetchTeamSizeSummary(filters);
          break;
        case 'uniform_sizes':
          result = await fetchUniformSizes(filters);
          break;
        case 'uniform_order':
        case 'uniform_payment_status':
          result = await fetchUniformOrderReport(filters);
          break;
        case 'jersey_number_conflicts':
          result = await fetchJerseyNumberConflicts(filters);
          break;
        case 'master_schedule':
        case 'team_schedule':
          result = await fetchMasterSchedule(filters);
          break;
        case 'player_history':
        case 'veteran_players':
          result = await fetchPlayerHistory(filters);
          if (reportId === 'veteran_players') {
            result = result.filter((r: any) => r.seasonCount >= 2);
          }
          break;
        case 'waiver_status':
        case 'missing_documents':
          result = await fetchWaiverStatus(filters);
          if (reportId === 'missing_documents') {
            result = result.filter((r: any) => !r.complete);
          }
          break;
        default:
          result = [];
      }

      setData(result);
    } catch (err: any) {
      if (__DEV__) console.error('Error loading report:', err);
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      Alert.alert('No Data', 'There is no data to export');
      return;
    }

    setExporting(true);
    try {
      const exportData = Array.isArray(data) ? data : 
        // Handle special case for uniform sizes
        data.jersey ? [...data.jersey.map((j: any) => ({ type: 'Jersey', ...j })), 
                      ...data.shorts.map((s: any) => ({ type: 'Shorts', ...s }))] : [data];
      
      await shareCSV(exportData, reportName || 'Report');
    } catch (err: any) {
      Alert.alert('Export Failed', err.message);
    } finally {
      setExporting(false);
    }
  };

  const s = createStyles(colors);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading report...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={s.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.danger} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadReportData}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return (
        <View style={s.emptyContainer}>
          <Ionicons name="document-outline" size={48} color={colors.textMuted} />
          <Text style={s.emptyText}>No data found</Text>
          <Text style={s.emptySubtext}>Try adjusting your filters</Text>
        </View>
      );
    }

    switch (report?.visualization) {
      case 'pie':
        return renderPieChart();
      case 'bar':
        return renderBarChart();
      case 'calendar':
        return renderCalendar();
      case 'cards':
        return renderCards();
      case 'table':
      default:
        return renderTable();
    }
  };

  const renderPieChart = () => {
    const total = data.reduce((sum: number, item: any) => sum + item.value, 0);
    const pieColors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#5AC8FA', '#8E8E93'];

    return (
      <View style={s.chartContainer}>
        {/* Simple visual representation */}
        <View style={s.pieVisual}>
          {data.map((item: any, index: number) => {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            return (
              <View key={index} style={s.pieItem}>
                <View style={[s.pieColor, { backgroundColor: pieColors[index % pieColors.length] }]} />
                <View style={s.pieInfo}>
                  <Text style={s.pieLabel}>{item.label}</Text>
                  <Text style={s.pieValue}>{item.value} ({percentage}%)</Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalValue}>{total}</Text>
        </View>
      </View>
    );
  };

  const renderBarChart = () => {
    // Handle uniform sizes special case
    if (data.jersey) {
      return (
        <View style={s.chartContainer}>
          <Text style={s.chartSectionTitle}>Jersey Sizes</Text>
          {renderBarItems(data.jersey, 'size', 'count')}
          <Text style={[s.chartSectionTitle, { marginTop: 24 }]}>Short Sizes</Text>
          {renderBarItems(data.shorts, 'size', 'count')}
        </View>
      );
    }

    // Regular bar chart
    const labelKey = data[0]?.name ? 'name' : data[0]?.label ? 'label' : 'size';
    const valueKey = data[0]?.count !== undefined ? 'count' : 'value';
    return (
      <View style={s.chartContainer}>
        {renderBarItems(data, labelKey, valueKey)}
      </View>
    );
  };

  const renderBarItems = (items: any[], labelKey: string, valueKey: string) => {
    const maxValue = Math.max(...items.map((item: any) => item[valueKey] || 0));
    
    return items.map((item: any, index: number) => {
      const value = item[valueKey] || 0;
      const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;
      
      return (
        <View key={index} style={s.barItem}>
          <View style={s.barLabelRow}>
            <Text style={s.barLabel}>{item[labelKey]}</Text>
            <Text style={s.barValue}>{value}</Text>
          </View>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${barWidth}%` }]} />
          </View>
        </View>
      );
    });
  };

  const renderCalendar = () => {
    // Group events by date
    const eventsByDate: Record<string, any[]> = {};
    (data as any[]).forEach(event => {
      if (!eventsByDate[event.date]) {
        eventsByDate[event.date] = [];
      }
      eventsByDate[event.date].push(event);
    });

    const sortedDates = Object.keys(eventsByDate).sort();

    return (
      <View style={s.calendarContainer}>
        {sortedDates.map(date => (
          <View key={date} style={s.calendarDay}>
            <View style={s.calendarDateHeader}>
              <Text style={s.calendarDate}>
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={s.calendarEventCount}>
                {eventsByDate[date].length} event{eventsByDate[date].length !== 1 ? 's' : ''}
              </Text>
            </View>
            {eventsByDate[date].map((event, idx) => (
              <View 
                key={idx} 
                style={[
                  s.calendarEvent, 
                  { borderLeftColor: event.type === 'game' ? colors.danger : colors.info }
                ]}
              >
                <View style={s.calendarEventHeader}>
                  <Text style={s.calendarEventTitle}>
                    {event.type === 'game' && event.opponent ? `vs ${event.opponent}` : event.title}
                  </Text>
                  <View style={[
                    s.eventTypeBadge, 
                    { backgroundColor: event.type === 'game' ? colors.danger + '20' : colors.info + '20' }
                  ]}>
                    <Text style={[
                      s.eventTypeBadgeText, 
                      { color: event.type === 'game' ? colors.danger : colors.info }
                    ]}>
                      {event.type === 'game' ? 'Game' : 'Practice'}
                    </Text>
                  </View>
                </View>
                <Text style={s.calendarEventTeam}>{event.team}</Text>
                <View style={s.calendarEventDetails}>
                  {event.time && (
                    <View style={s.eventDetail}>
                      <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                      <Text style={s.eventDetailText}>{formatTime(event.time)}</Text>
                    </View>
                  )}
                  {event.location && (
                    <View style={s.eventDetail}>
                      <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                      <Text style={s.eventDetailText}>{event.location}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderCards = () => {
    return (
      <View style={s.cardsContainer}>
        {(data as any[]).map((item, index) => (
          <View key={index} style={[s.conflictCard, { borderLeftColor: colors.danger }]}>
            <View style={s.conflictHeader}>
              <Ionicons name="warning" size={20} color={colors.danger} />
              <Text style={s.conflictTitle}>Jersey #{item.jerseyNumber}</Text>
            </View>
            <Text style={s.conflictTeam}>{item.team}</Text>
            <Text style={s.conflictPlayers}>
              {item.name} & {item.conflictWith}
            </Text>
            <Text style={s.conflictAction}>Contact parents for alternate numbers</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTable = () => {
    if (!Array.isArray(data) || data.length === 0) return null;

    const columns = Object.keys(data[0]).filter(key => 
      key !== 'id' && key !== 'hasConflict' && !key.startsWith('_')
    );

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={s.table}>
          {/* Header */}
          <View style={s.tableHeader}>
            {columns.map(col => (
              <View key={col} style={[s.tableHeaderCell, { width: getColumnWidth(col) }]}>
                <Text style={s.tableHeaderText}>{formatColumnName(col)}</Text>
              </View>
            ))}
          </View>

          {/* Rows */}
          {data.map((row: any, rowIndex: number) => (
            <View 
              key={rowIndex} 
              style={[
                s.tableRow, 
                rowIndex % 2 === 1 && s.tableRowAlt,
                row.hasConflict && s.tableRowConflict,
              ]}
            >
              {columns.map(col => (
                <View key={col} style={[s.tableCell, { width: getColumnWidth(col) }]}>
                  <Text 
                    style={[
                      s.tableCellText,
                      col === 'balance' && row[col] > 0 && { color: colors.danger, fontWeight: '600' },
                      col === 'complete' && { color: row[col] ? colors.success : colors.danger },
                      row.hasConflict && col === 'jerseyNumber' && { color: colors.danger, fontWeight: '600' },
                    ]}
                    numberOfLines={2}
                  >
                    {formatCellValue(col, row[col])}
                  </Text>
                  {row.hasConflict && col === 'jerseyNumber' && (
                    <Ionicons name="warning" size={12} color={colors.danger} style={{ marginLeft: 4 }} />
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const getColumnWidth = (col: string): number => {
    const widths: Record<string, number> = {
      name: 150,
      parent: 140,
      email: 180,
      phone: 120,
      team: 120,
      status: 100,
      balance: 80,
      owed: 80,
      paid: 80,
      grade: 80,
      ageGroup: 80,
      jerseyNumber: 70,
      jerseySize: 80,
      shortSize: 80,
      conflictWith: 150,
      seasonsPlayed: 200,
      seasonCount: 70,
      liability: 60,
      photo: 60,
      conduct: 60,
      pref1: 60,
      pref2: 60,
      pref3: 60,
      signedBy: 120,
      returning: 70,
      registeredAt: 100,
    };
    return widths[col] || 100;
  };

  const formatColumnName = (col: string): string => {
    const names: Record<string, string> = {
      name: 'Name',
      parent: 'Parent',
      email: 'Email',
      phone: 'Phone',
      team: 'Team',
      status: 'Status',
      balance: 'Balance',
      owed: 'Owed',
      paid: 'Paid',
      grade: 'Grade',
      ageGroup: 'Age Group',
      season: 'Season',
      sport: 'Sport',
      registeredAt: 'Registered',
      jerseyNumber: 'Jersey #',
      jerseySize: 'Jersey Size',
      shortSize: 'Short Size',
      conflictWith: 'Conflicts With',
      seasonsPlayed: 'Seasons Played',
      seasonCount: '# Seasons',
      liability: 'Liability',
      photo: 'Photo',
      conduct: 'Conduct',
      complete: 'Complete',
      position: 'Position',
      pref1: 'Pref 1',
      pref2: 'Pref 2',
      pref3: 'Pref 3',
      signedBy: 'Signed By',
      returning: 'Returning',
    };
    return names[col] || col.charAt(0).toUpperCase() + col.slice(1);
  };

  const formatCellValue = (col: string, value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (col === 'balance' || col === 'owed' || col === 'paid') {
      return `$${value}`;
    }
    if (col === 'status') {
      const statusNames: Record<string, string> = {
        new: 'Pending',
        approved: 'Approved',
        active: 'Paid',
        rostered: 'On Team',
        waitlisted: 'Waitlisted',
        denied: 'Denied',
      };
      return statusNames[value] || value;
    }
    return String(value);
  };

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: reportName || 'Report',
          headerRight: () => (
            <View style={s.headerActions}>
              <TouchableOpacity 
                style={s.headerBtn} 
                onPress={() => setShowFilters(true)}
              >
                <Ionicons name="filter" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={s.headerBtn} 
                onPress={handleExportCSV}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="share-outline" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Active Filters Display */}
      {(selectedSeasonId || selectedSportId || selectedTeamId || selectedAgeGroupId) && (
        <View style={s.activeFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedSeasonId && (
              <View style={s.activeFilterChip}>
                <Text style={s.activeFilterText}>
                  {allSeasons?.find(s => s.id === selectedSeasonId)?.name || 'Season'}
                </Text>
                <TouchableOpacity onPress={() => setSelectedSeasonId(undefined)}>
                  <Ionicons name="close" size={14} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
            {selectedSportId && (
              <View style={s.activeFilterChip}>
                <Text style={s.activeFilterText}>
                  {sports.find(s => s.id === selectedSportId)?.name || 'Sport'}
                </Text>
                <TouchableOpacity onPress={() => setSelectedSportId(undefined)}>
                  <Ionicons name="close" size={14} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
            {selectedTeamId && (
              <View style={s.activeFilterChip}>
                <Text style={s.activeFilterText}>
                  {teams.find(t => t.id === selectedTeamId)?.name || 'Team'}
                </Text>
                <TouchableOpacity onPress={() => setSelectedTeamId(undefined)}>
                  <Ionicons name="close" size={14} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {renderContent()}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Summary Footer */}
      {Array.isArray(data) && data.length > 0 && (
        <View style={s.footer}>
          <Text style={s.footerText}>
            {data.length} {data.length === 1 ? 'record' : 'records'}
          </Text>
          <TouchableOpacity style={s.exportBtn} onPress={handleExportCSV}>
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={s.exportBtnText}>Export CSV</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.filterModal}>
            <View style={s.filterHeader}>
              <Text style={s.filterTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.filterContent}>
              {/* Season Filter */}
              {report?.filters.includes('season') && (
                <View style={s.filterSection}>
                  <Text style={s.filterLabel}>Season</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                      style={[s.filterOption, !selectedSeasonId && s.filterOptionActive]}
                      onPress={() => setSelectedSeasonId(undefined)}
                    >
                      <Text style={[s.filterOptionText, !selectedSeasonId && s.filterOptionTextActive]}>
                        All
                      </Text>
                    </TouchableOpacity>
                    {allSeasons?.map(season => (
                      <TouchableOpacity
                        key={season.id}
                        style={[s.filterOption, selectedSeasonId === season.id && s.filterOptionActive]}
                        onPress={() => setSelectedSeasonId(season.id)}
                      >
                        <Text style={[s.filterOptionText, selectedSeasonId === season.id && s.filterOptionTextActive]}>
                          {season.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Sport Filter */}
              {report?.filters.includes('sport') && (
                <View style={s.filterSection}>
                  <Text style={s.filterLabel}>Sport</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                      style={[s.filterOption, !selectedSportId && s.filterOptionActive]}
                      onPress={() => setSelectedSportId(undefined)}
                    >
                      <Text style={[s.filterOptionText, !selectedSportId && s.filterOptionTextActive]}>
                        All
                      </Text>
                    </TouchableOpacity>
                    {sports.map(sport => (
                      <TouchableOpacity
                        key={sport.id}
                        style={[s.filterOption, selectedSportId === sport.id && s.filterOptionActive]}
                        onPress={() => setSelectedSportId(sport.id)}
                      >
                        <Text style={[s.filterOptionText, selectedSportId === sport.id && s.filterOptionTextActive]}>
                          {sport.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Team Filter */}
              {report?.filters.includes('team') && (
                <View style={s.filterSection}>
                  <Text style={s.filterLabel}>Team</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                      style={[s.filterOption, !selectedTeamId && s.filterOptionActive]}
                      onPress={() => setSelectedTeamId(undefined)}
                    >
                      <Text style={[s.filterOptionText, !selectedTeamId && s.filterOptionTextActive]}>
                        All
                      </Text>
                    </TouchableOpacity>
                    {teams.map(team => (
                      <TouchableOpacity
                        key={team.id}
                        style={[s.filterOption, selectedTeamId === team.id && s.filterOptionActive]}
                        onPress={() => setSelectedTeamId(team.id)}
                      >
                        <Text style={[s.filterOptionText, selectedTeamId === team.id && s.filterOptionTextActive]}>
                          {team.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Age Group Filter */}
              {report?.filters.includes('ageGroup') && (
                <View style={s.filterSection}>
                  <Text style={s.filterLabel}>Age Group</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                      style={[s.filterOption, !selectedAgeGroupId && s.filterOptionActive]}
                      onPress={() => setSelectedAgeGroupId(undefined)}
                    >
                      <Text style={[s.filterOptionText, !selectedAgeGroupId && s.filterOptionTextActive]}>
                        All
                      </Text>
                    </TouchableOpacity>
                    {ageGroups.map(ag => (
                      <TouchableOpacity
                        key={ag.id}
                        style={[s.filterOption, selectedAgeGroupId === ag.id && s.filterOptionActive]}
                        onPress={() => setSelectedAgeGroupId(ag.id)}
                      >
                        <Text style={[s.filterOptionText, selectedAgeGroupId === ag.id && s.filterOptionTextActive]}>
                          {ag.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            <View style={s.filterActions}>
              <TouchableOpacity 
                style={s.clearFiltersBtn}
                onPress={() => {
                  setSelectedSeasonId(undefined);
                  setSelectedSportId(undefined);
                  setSelectedTeamId(undefined);
                  setSelectedAgeGroupId(undefined);
                }}
              >
                <Text style={s.clearFiltersBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={s.applyFiltersBtn}
                onPress={() => setShowFilters(false)}
              >
                <Text style={s.applyFiltersBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    padding: 4,
  },
  activeFilters: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },

  // Loading / Error / Empty states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#000',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textMuted,
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
  },

  // Chart styles
  chartContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  chartSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  pieVisual: {
    gap: 12,
  },
  pieItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pieColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 12,
  },
  pieInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pieLabel: {
    fontSize: 14,
    color: colors.text,
  },
  pieValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  barItem: {
    marginBottom: 16,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barLabel: {
    fontSize: 13,
    color: colors.text,
  },
  barValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  barFill: {
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },

  // Calendar styles
  calendarContainer: {
    gap: 16,
  },
  calendarDay: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  calendarDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  calendarDate: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  calendarEventCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  calendarEvent: {
    padding: 12,
    borderLeftWidth: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  calendarEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarEventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  eventTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  calendarEventTeam: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  calendarEventDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDetailText: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // Cards styles (conflicts)
  cardsContainer: {
    gap: 12,
  },
  conflictCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  conflictTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
  conflictTeam: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  conflictPlayers: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
  },
  conflictAction: {
    fontSize: 12,
    color: colors.warning,
    fontStyle: 'italic',
  },

  // Table styles
  table: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    padding: 12,
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowAlt: {
    backgroundColor: colors.background + '50',
  },
  tableRowConflict: {
    backgroundColor: colors.danger + '10',
  },
  tableCell: {
    padding: 12,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableCellText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  exportBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  filterContent: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 13,
    color: colors.text,
  },
  filterOptionTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearFiltersBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  clearFiltersBtnText: {
    fontSize: 15,
    color: colors.text,
  },
  applyFiltersBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  applyFiltersBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
});
