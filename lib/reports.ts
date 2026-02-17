import { Share } from 'react-native';
import { supabase } from './supabase';

// ============================================
// TYPES
// ============================================

export type ReportCategory = 
  | 'registration'
  | 'financial'
  | 'roster'
  | 'uniform'
  | 'schedule'
  | 'player_history'
  | 'compliance';

export type ReportFormat = 'view' | 'pdf' | 'csv';

export type ReportFilter = {
  seasonId?: string;
  sportId?: string;
  teamId?: string;
  ageGroupId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ReportDefinition = {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  visualization: 'table' | 'bar' | 'pie' | 'calendar' | 'cards';
  filters: ('season' | 'sport' | 'team' | 'ageGroup' | 'status' | 'dateRange')[];
};

// ============================================
// REPORT DEFINITIONS
// ============================================

export const REPORTS: ReportDefinition[] = [
  // REGISTRATION
  {
    id: 'registration_summary',
    name: 'Registration Summary',
    description: 'Overview of registrations by status',
    category: 'registration',
    visualization: 'pie',
    filters: ['season', 'sport'],
  },
  {
    id: 'registration_by_age',
    name: 'Registration by Age Group',
    description: 'Player count per age group',
    category: 'registration',
    visualization: 'bar',
    filters: ['season', 'sport'],
  },
  {
    id: 'registration_list',
    name: 'Registration Details',
    description: 'Full list of all registrations',
    category: 'registration',
    visualization: 'table',
    filters: ['season', 'sport', 'ageGroup', 'status'],
  },
  {
    id: 'new_vs_returning',
    name: 'New vs Returning Players',
    description: 'Breakdown of first-time vs returning players',
    category: 'registration',
    visualization: 'pie',
    filters: ['season', 'sport'],
  },
  {
    id: 'pending_approvals',
    name: 'Pending Approvals',
    description: 'Registrations awaiting admin approval',
    category: 'registration',
    visualization: 'table',
    filters: ['season', 'sport'],
  },

  // FINANCIAL
  {
    id: 'payment_summary',
    name: 'Payment Summary',
    description: 'Revenue collected vs outstanding',
    category: 'financial',
    visualization: 'pie',
    filters: ['season', 'sport'],
  },
  {
    id: 'outstanding_balances',
    name: 'Outstanding Balances',
    description: 'Families with unpaid balances',
    category: 'financial',
    visualization: 'table',
    filters: ['season', 'sport', 'team'],
  },
  {
    id: 'payment_transactions',
    name: 'Payment History',
    description: 'All payment transactions',
    category: 'financial',
    visualization: 'table',
    filters: ['season', 'dateRange'],
  },
  {
    id: 'revenue_by_season',
    name: 'Revenue by Season',
    description: 'Total revenue per season',
    category: 'financial',
    visualization: 'bar',
    filters: ['sport'],
  },

  // ROSTER
  {
    id: 'team_roster',
    name: 'Team Roster',
    description: 'Full roster with contact info',
    category: 'roster',
    visualization: 'table',
    filters: ['season', 'team'],
  },
  {
    id: 'unassigned_players',
    name: 'Unassigned Players',
    description: 'Players not yet placed on teams',
    category: 'roster',
    visualization: 'table',
    filters: ['season', 'sport', 'ageGroup'],
  },
  {
    id: 'team_size_summary',
    name: 'Team Size Summary',
    description: 'Player count per team',
    category: 'roster',
    visualization: 'bar',
    filters: ['season', 'sport'],
  },
  {
    id: 'coach_directory',
    name: 'Coach & Staff Directory',
    description: 'All coaches and staff with contact info',
    category: 'roster',
    visualization: 'table',
    filters: ['season', 'sport'],
  },
  {
    id: 'emergency_contacts',
    name: 'Emergency Contacts',
    description: 'Player emergency contact information',
    category: 'roster',
    visualization: 'table',
    filters: ['season', 'team'],
  },

  // UNIFORM
  {
    id: 'uniform_sizes',
    name: 'Uniform Size Distribution',
    description: 'Size breakdown for ordering',
    category: 'uniform',
    visualization: 'bar',
    filters: ['season', 'sport', 'team'],
  },
  {
    id: 'uniform_order',
    name: 'Uniform Order Report',
    description: 'Full order list with sizes, numbers & conflicts',
    category: 'uniform',
    visualization: 'table',
    filters: ['season', 'sport', 'team'],
  },
  {
    id: 'uniform_payment_status',
    name: 'Uniform Payment Status',
    description: 'Who has paid for uniforms',
    category: 'uniform',
    visualization: 'table',
    filters: ['season', 'sport', 'team'],
  },
  {
    id: 'jersey_number_conflicts',
    name: 'Jersey Number Conflicts',
    description: 'Same number requested on same team',
    category: 'uniform',
    visualization: 'cards',
    filters: ['season', 'sport'],
  },

  // SCHEDULE
  {
    id: 'master_schedule',
    name: 'Master Schedule',
    description: 'All games and practices calendar view',
    category: 'schedule',
    visualization: 'calendar',
    filters: ['season', 'sport', 'team', 'dateRange'],
  },
  {
    id: 'team_schedule',
    name: 'Team Schedule',
    description: 'Schedule for a specific team',
    category: 'schedule',
    visualization: 'table',
    filters: ['season', 'team'],
  },
  {
    id: 'facility_usage',
    name: 'Facility Usage',
    description: 'Events by location',
    category: 'schedule',
    visualization: 'table',
    filters: ['season', 'dateRange'],
  },

  // PLAYER HISTORY
  {
    id: 'player_history',
    name: 'Player Season History',
    description: 'Seasons played per player',
    category: 'player_history',
    visualization: 'table',
    filters: ['sport'],
  },
  {
    id: 'veteran_players',
    name: 'Veteran Players',
    description: 'Players with 2+ seasons',
    category: 'player_history',
    visualization: 'table',
    filters: ['sport'],
  },

  // COMPLIANCE
  {
    id: 'waiver_status',
    name: 'Waiver Status',
    description: 'Signed vs pending waivers',
    category: 'compliance',
    visualization: 'table',
    filters: ['season', 'sport', 'team'],
  },
  {
    id: 'missing_documents',
    name: 'Missing Documents',
    description: 'Players with incomplete paperwork',
    category: 'compliance',
    visualization: 'table',
    filters: ['season', 'sport'],
  },
  {
    id: 'player_card_status',
    name: 'Player Card Status',
    description: 'Photo and card completion status',
    category: 'compliance',
    visualization: 'table',
    filters: ['season', 'team'],
  },
];

export const REPORT_CATEGORIES: { id: ReportCategory; name: string; icon: string; color: string }[] = [
  { id: 'registration', name: 'Registration', icon: 'person-add', color: '#007AFF' },
  { id: 'financial', name: 'Financial', icon: 'cash', color: '#34C759' },
  { id: 'roster', name: 'Roster', icon: 'people', color: '#AF52DE' },
  { id: 'uniform', name: 'Uniform', icon: 'shirt', color: '#FF9500' },
  { id: 'schedule', name: 'Schedule', icon: 'calendar', color: '#FF3B30' },
  { id: 'player_history', name: 'Player History', icon: 'time', color: '#5AC8FA' },
  { id: 'compliance', name: 'Compliance', icon: 'checkmark-shield', color: '#8E8E93' },
];

// ============================================
// DATA FETCHING FUNCTIONS
// ============================================

export async function fetchRegistrationSummary(filters: ReportFilter) {
  let query = supabase
    .from('players')
    .select('status');

  if (filters.seasonId) {
    query = query.eq('season_id', filters.seasonId);
  }
  if (filters.sportId) {
    query = query.eq('sport_id', filters.sportId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Group by status
  const summary: Record<string, number> = {};
  (data || []).forEach(player => {
    const status = player.status || 'new';
    summary[status] = (summary[status] || 0) + 1;
  });

  return Object.entries(summary).map(([status, count]) => ({
    label: formatStatus(status),
    value: count,
    status,
  }));
}

export async function fetchRegistrationByAge(filters: ReportFilter) {
  let query = supabase
    .from('players')
    .select('grade, birth_date');

  if (filters.seasonId) {
    query = query.eq('season_id', filters.seasonId);
  }
  if (filters.sportId) {
    query = query.eq('sport_id', filters.sportId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Group by grade
  const byGrade: Record<string, number> = {};
  (data || []).forEach(player => {
    const grade = player.grade ? `Grade ${player.grade}` : 'Unassigned';
    byGrade[grade] = (byGrade[grade] || 0) + 1;
  });

  return Object.entries(byGrade)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      // Sort numerically by grade
      const aNum = parseInt(a.name.replace('Grade ', '')) || 999;
      const bNum = parseInt(b.name.replace('Grade ', '')) || 999;
      return aNum - bNum;
    });
}

export async function fetchNewVsReturning(filters: ReportFilter) {
  let query = supabase
    .from('players')
    .select('returning_player');

  if (filters.seasonId) {
    query = query.eq('season_id', filters.seasonId);
  }
  if (filters.sportId) {
    query = query.eq('sport_id', filters.sportId);
  }

  const { data, error } = await query;
  if (error) throw error;

  let newPlayers = 0;
  let returningPlayers = 0;

  (data || []).forEach(player => {
    if (player.returning_player) {
      returningPlayers++;
    } else {
      newPlayers++;
    }
  });

  return [
    { label: 'New Players', value: newPlayers },
    { label: 'Returning Players', value: returningPlayers },
  ];
}

export async function fetchTeamSizeSummary(filters: ReportFilter) {
  let query = supabase
    .from('teams')
    .select(`
      id,
      name,
      team_players(count)
    `);

  if (filters.seasonId) {
    query = query.eq('season_id', filters.seasonId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(team => ({
    name: team.name,
    count: (team.team_players as any)?.[0]?.count || 0,
  })).sort((a, b) => b.count - a.count);
}

export async function fetchRegistrationList(filters: ReportFilter) {
  let query = supabase
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      parent_name,
      parent_email,
      parent_phone,
      grade,
      status,
      registration_date,
      returning_player,
      seasons(name),
      sports(name),
      team_players(teams(name))
    `)
    .order('last_name', { ascending: true });

  if (filters.seasonId) {
    query = query.eq('season_id', filters.seasonId);
  }
  if (filters.sportId) {
    query = query.eq('sport_id', filters.sportId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(player => {
    const team = (player.team_players as any)?.[0]?.teams;
    return {
      id: player.id,
      name: `${player.first_name} ${player.last_name}`,
      parent: player.parent_name,
      email: player.parent_email,
      phone: player.parent_phone,
      grade: player.grade ? `Grade ${player.grade}` : '—',
      season: (player.seasons as any)?.name || '—',
      sport: (player.sports as any)?.name || '—',
      team: team?.name || 'Unassigned',
      status: player.status || 'new',
      returning: player.returning_player ? 'Yes' : 'No',
      registeredAt: player.registration_date ? new Date(player.registration_date).toLocaleDateString() : '—',
    };
  });
}

export async function fetchOutstandingBalances(filters: ReportFilter) {
  let query = supabase
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      parent_name,
      parent_email,
      parent_phone,
      season_id,
      seasons(name),
      team_players(teams(name)),
      payments(amount, paid)
    `);

  if (filters.seasonId) {
    query = query.eq('season_id', filters.seasonId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const results: any[] = [];

  (data || []).forEach(player => {
    const payments = player.payments as any[] || [];
    const totalOwed = 335; // Base registration fee
    const totalPaid = payments.filter(p => p.paid).reduce((sum, p) => sum + (p.amount || 0), 0);
    const balance = totalOwed - totalPaid;

    if (balance > 0) {
      const team = (player.team_players as any)?.[0]?.teams;
      results.push({
        id: player.id,
        name: `${player.first_name} ${player.last_name}`,
        parent: player.parent_name,
        email: player.parent_email,
        phone: player.parent_phone,
        team: team?.name || 'Unassigned',
        season: (player.seasons as any)?.name || '—',
        owed: totalOwed,
        paid: totalPaid,
        balance,
      });
    }
  });

  return results.sort((a, b) => b.balance - a.balance);
}

export async function fetchTeamRoster(filters: ReportFilter) {
  if (!filters.teamId) {
    return [];
  }

  const { data, error } = await supabase
    .from('team_players')
    .select(`
      jersey_number,
      position,
      players(
        id,
        first_name,
        last_name,
        parent_name,
        parent_email,
        parent_phone,
        grade,
        uniform_size_jersey,
        uniform_size_shorts,
        jersey_pref_1,
        jersey_pref_2,
        jersey_pref_3
      )
    `)
    .eq('team_id', filters.teamId)
    .order('jersey_number', { ascending: true });

  if (error) throw error;

  return (data || []).map(tp => {
    const player = tp.players as any;
    return {
      jerseyNumber: tp.jersey_number || player?.jersey_pref_1 || '—',
      name: `${player.first_name} ${player.last_name}`,
      grade: player.grade,
      parent: player.parent_name,
      email: player.parent_email,
      phone: player.parent_phone,
      jerseySize: player.uniform_size_jersey || '—',
      shortSize: player.uniform_size_shorts || '—',
      position: tp.position || '—',
    };
  });
}

export async function fetchUnassignedPlayers(filters: ReportFilter) {
  // Get all player IDs that are on teams
  const { data: teamPlayers } = await supabase
    .from('team_players')
    .select('player_id');

  const assignedIds = (teamPlayers || []).map(tp => tp.player_id);

  let query = supabase
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      parent_name,
      parent_email,
      grade,
      status
    `);

  if (filters.seasonId) {
    query = query.eq('season_id', filters.seasonId);
  }
  if (filters.sportId) {
    query = query.eq('sport_id', filters.sportId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || [])
    .filter(player => !assignedIds.includes(player.id))
    .map(player => {
      return {
        id: player.id,
        name: `${player.first_name} ${player.last_name}`,
        parent: player.parent_name,
        email: player.parent_email,
        grade: player.grade ? `Grade ${player.grade}` : '—',
        status: player.status || 'new',
      };
    });
}

export async function fetchUniformSizes(filters: ReportFilter) {
  let query = supabase
    .from('players')
    .select('uniform_size_jersey, uniform_size_shorts, team_players(team_id)');

  if (filters.seasonId) {
    query = query.eq('season_id', filters.seasonId);
  }
  if (filters.sportId) {
    query = query.eq('sport_id', filters.sportId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Filter by team if specified
  let players = data || [];
  if (filters.teamId) {
    players = players.filter(p => {
      const tp = p.team_players as any[];
      return tp?.some(t => t.team_id === filters.teamId);
    });
  }

  // Count jersey sizes
  const jerseySizes: Record<string, number> = {};
  const shortSizes: Record<string, number> = {};

  players.forEach(player => {
    const js = player.uniform_size_jersey || 'Not Specified';
    const ss = player.uniform_size_shorts || 'Not Specified';
    jerseySizes[js] = (jerseySizes[js] || 0) + 1;
    shortSizes[ss] = (shortSizes[ss] || 0) + 1;
  });

  return {
    jersey: Object.entries(jerseySizes).map(([size, count]) => ({ size, count })),
    shorts: Object.entries(shortSizes).map(([size, count]) => ({ size, count })),
  };
}

export async function fetchUniformOrderReport(filters: ReportFilter) {
  let query = supabase
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      uniform_size_jersey,
      uniform_size_shorts,
      jersey_pref_1,
      jersey_pref_2,
      jersey_pref_3,
      team_players(team_id, jersey_number, teams(name))
    `);

  if (filters.seasonId) {
    query = query.eq('season_id', filters.seasonId);
  }
  if (filters.sportId) {
    query = query.eq('sport_id', filters.sportId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Build result with conflict detection
  const teamJerseyNumbers: Record<string, Record<number, string[]>> = {};
  const results: any[] = [];

  // First pass: collect all jersey numbers per team (use assigned or preference)
  (data || []).forEach(player => {
    const tp = (player.team_players as any)?.[0];
    const jerseyNum = tp?.jersey_number || player.jersey_pref_1;
    if (tp?.team_id && jerseyNum) {
      if (!teamJerseyNumbers[tp.team_id]) {
        teamJerseyNumbers[tp.team_id] = {};
      }
      if (!teamJerseyNumbers[tp.team_id][jerseyNum]) {
        teamJerseyNumbers[tp.team_id][jerseyNum] = [];
      }
      teamJerseyNumbers[tp.team_id][jerseyNum].push(`${player.first_name} ${player.last_name}`);
    }
  });

  // Second pass: build results with conflict flag
  (data || []).forEach(player => {
    const tp = (player.team_players as any)?.[0];
    const team = tp?.teams;
    const jerseyNum = tp?.jersey_number || player.jersey_pref_1;

    let hasConflict = false;
    let conflictWith: string[] = [];

    if (tp?.team_id && jerseyNum) {
      const playersWithNumber = teamJerseyNumbers[tp.team_id]?.[jerseyNum] || [];
      if (playersWithNumber.length > 1) {
        hasConflict = true;
        conflictWith = playersWithNumber.filter(name => name !== `${player.first_name} ${player.last_name}`);
      }
    }

    results.push({
      id: player.id,
      name: `${player.first_name} ${player.last_name}`,
      team: team?.name || 'Unassigned',
      jerseyNumber: jerseyNum || '—',
      pref1: player.jersey_pref_1 || '—',
      pref2: player.jersey_pref_2 || '—',
      pref3: player.jersey_pref_3 || '—',
      jerseySize: player.uniform_size_jersey || 'Not Specified',
      shortSize: player.uniform_size_shorts || 'Not Specified',
      hasConflict,
      conflictWith: conflictWith.join(', '),
    });
  });

  // Sort: conflicts first, then by team
  return results.sort((a, b) => {
    if (a.hasConflict && !b.hasConflict) return -1;
    if (!a.hasConflict && b.hasConflict) return 1;
    return a.team.localeCompare(b.team);
  });
}

export async function fetchJerseyNumberConflicts(filters: ReportFilter) {
  const orderReport = await fetchUniformOrderReport(filters);
  return orderReport.filter(item => item.hasConflict);
}

export async function fetchMasterSchedule(filters: ReportFilter) {
  let query = supabase
    .from('schedule_events')
    .select(`
      id,
      title,
      event_type,
      event_date,
      start_time,
      end_time,
      location,
      opponent,
      team_id,
      teams(name, sports(name, color_primary))
    `)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (filters.teamId) {
    query = query.eq('team_id', filters.teamId);
  }
  if (filters.dateFrom) {
    query = query.gte('event_date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('event_date', filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Filter by season's teams if specified
  let events = data || [];

  // Filter by sport if specified (via team's sport)
  if (filters.sportId) {
    events = events.filter(e => {
      const sport = (e.teams as any)?.sports;
      return sport?.id === filters.sportId;
    });
  }

  return events.map(event => {
    const team = event.teams as any;
    const sport = team?.sports;
    return {
      id: event.id,
      date: event.event_date,
      time: event.start_time,
      endTime: event.end_time,
      type: event.event_type,
      title: event.title,
      location: event.location,
      opponent: event.opponent,
      team: team?.name || '—',
      sport: sport?.name || '—',
      sportColor: sport?.color_primary || '#007AFF',
    };
  });
}

export async function fetchPlayerHistory(filters: ReportFilter) {
  const { data, error } = await supabase
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      parent_name,
      parent_email,
      seasons(id, name, start_date),
      sports(name),
      team_players(teams(name))
    `)
    .order('last_name', { ascending: true });

  if (error) throw error;

  // Group by player (by parent_email + name for uniqueness)
  const playerMap: Record<string, {
    name: string;
    parent: string;
    email: string;
    seasons: { name: string; team: string; year: string }[];
  }> = {};

  (data || []).forEach(player => {
    const key = `${player.parent_email}-${player.first_name}-${player.last_name}`;
    const season = player.seasons as any;
    const team = (player.team_players as any)?.[0]?.teams;
    const sport = player.sports as any;

    if (!playerMap[key]) {
      playerMap[key] = {
        name: `${player.first_name} ${player.last_name}`,
        parent: player.parent_name || '—',
        email: player.parent_email || '—',
        seasons: [],
      };
    }

    if (season) {
      const year = season.start_date ? new Date(season.start_date).getFullYear().toString() : '—';
      // Filter by sport if specified
      if (!filters.sportId || sport?.id === filters.sportId) {
        playerMap[key].seasons.push({
          name: season.name,
          team: team?.name || 'Unassigned',
          year,
        });
      }
    }
  });

  // Convert to array and sort by season count
  return Object.values(playerMap)
    .filter(p => p.seasons.length > 0)
    .map(p => ({
      ...p,
      seasonCount: p.seasons.length,
      seasonsPlayed: p.seasons.map(s => s.name).join(', '),
    }))
    .sort((a, b) => b.seasonCount - a.seasonCount);
}

export async function fetchWaiverStatus(filters: ReportFilter) {
  let query = supabase
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      parent_name,
      parent_email,
      waiver_liability,
      waiver_photo,
      waiver_conduct,
      waiver_signed_by,
      waiver_signed_date,
      team_players(teams(name))
    `);

  if (filters.seasonId) {
    query = query.eq('season_id', filters.seasonId);
  }
  if (filters.sportId) {
    query = query.eq('sport_id', filters.sportId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(player => {
    const team = (player.team_players as any)?.[0]?.teams;
    const allSigned = player.waiver_liability && 
                      player.waiver_photo && 
                      player.waiver_conduct;
    return {
      id: player.id,
      name: `${player.first_name} ${player.last_name}`,
      parent: player.parent_name,
      email: player.parent_email,
      team: team?.name || 'Unassigned',
      liability: player.waiver_liability ? '✓' : '✗',
      photo: player.waiver_photo ? '✓' : '✗',
      conduct: player.waiver_conduct ? '✓' : '✗',
      signedBy: player.waiver_signed_by || '—',
      complete: allSigned,
    };
  }).sort((a, b) => {
    // Incomplete first
    if (!a.complete && b.complete) return -1;
    if (a.complete && !b.complete) return 1;
    return a.name.localeCompare(b.name);
  });
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

export function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from first row
  const headers = Object.keys(data[0]).filter(key => 
    key !== 'id' && key !== 'hasConflict' && !key.startsWith('_')
  );
  
  // Build CSV content
  const csvRows: string[] = [];
  csvRows.push(headers.join(','));
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      const strValue = String(value ?? '').replace(/"/g, '""');
      return strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')
        ? `"${strValue}"`
        : strValue;
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

export async function shareCSV(data: any[], reportName: string) {
  const csvContent = convertToCSV(data);
  
  try {
    await Share.share({
      message: csvContent,
      title: `${reportName} Report`,
    });
  } catch (error: any) {
    throw new Error(`Failed to share: ${error.message}`);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    new: 'Pending Review',
    approved: 'Approved',
    active: 'Paid',
    rostered: 'On Team',
    waitlisted: 'Waitlisted',
    denied: 'Not Approved',
  };
  return statusMap[status] || status;
}

export function getReportsByCategory(category: ReportCategory): ReportDefinition[] {
  return REPORTS.filter(r => r.category === category);
}
