import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SearchEntityType = 'player' | 'parent' | 'team' | 'staff' | 'event' | 'payment';

export interface SearchResult {
  id: string;
  entityType: SearchEntityType;
  title: string;
  subtitle: string;
  meta?: string;
  navigateTo: string;
  navigateParams?: Record<string, string>;
}

export interface SearchResults {
  players: SearchResult[];
  parents: SearchResult[];
  teams: SearchResult[];
  staff: SearchResult[];
  events: SearchResult[];
  payments: SearchResult[];
  totalCount: number;
}

const EMPTY_RESULTS: SearchResults = {
  players: [],
  parents: [],
  teams: [],
  staff: [],
  events: [],
  payments: [],
  totalCount: 0,
};

export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [previewResults, setPreviewResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orgIdRef = useRef<string | null>(null);

  const getOrgId = async (): Promise<string | null> => {
    if (orgIdRef.current) return orgIdRef.current;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .maybeSingle();

    orgIdRef.current = profile?.current_organization_id || null;
    return orgIdRef.current;
  };

  // ─── Preview Search (debounced, runs as user types) ──────────────────────

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (text.trim().length < 2) {
      setPreviewResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const orgId = await getOrgId();
        if (!orgId) return;

        const preview = await searchPreview(text.trim(), orgId);
        setPreviewResults(preview);
      } catch (err) {
        if (__DEV__) console.error('[useGlobalSearch] Preview error:', err);
      }
    }, 300);
  }, []);

  // ─── Full Search (runs on enter / "See all") ────────────────────────────

  const executeFullSearch = useCallback(async (overrideQuery?: string) => {
    const trimmed = (overrideQuery ?? query).trim();
    if (trimmed.length < 2) return;

    if (overrideQuery) setQuery(overrideQuery);

    try {
      setLoading(true);
      setHasSearched(true);

      const orgId = await getOrgId();
      if (!orgId) return;

      const fullResults = await searchAll(trimmed, orgId);
      setResults(fullResults);
    } catch (err) {
      if (__DEV__) console.error('[useGlobalSearch] Full search error:', err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(EMPTY_RESULTS);
    setPreviewResults([]);
    setHasSearched(false);
  }, []);

  return {
    query,
    results,
    previewResults,
    loading,
    hasSearched,
    handleQueryChange,
    executeFullSearch,
    clearSearch,
    setPreviewResults,
  };
}

// ─── Preview: Quick search, max 5 results total ─────────────────────────────

async function searchPreview(query: string, orgId: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const searchPattern = `%${query}%`;

  // Players (max 2)
  const { data: players } = await supabase
    .from('players')
    .select('id, first_name, last_name, team_players(team_id, teams(name))')
    .or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`)
    .limit(2);

  (players || []).forEach((p: any) => {
    const teamName = p.team_players?.[0]?.teams?.name || '';
    results.push({
      id: p.id,
      entityType: 'player',
      title: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      subtitle: teamName,
      navigateTo: '/player-card',
      navigateParams: { playerId: p.id },
    });
  });

  // Parents (max 1)
  const { data: parents } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('current_organization_id', orgId)
    .or(`full_name.ilike.${searchPattern},email.ilike.${searchPattern}`)
    .in('primary_role', ['parent'])
    .limit(1);

  (parents || []).forEach((p: any) => {
    results.push({
      id: p.id,
      entityType: 'parent',
      title: p.full_name || 'Parent',
      subtitle: p.email || '',
      navigateTo: '',
    });
  });

  // Teams (max 1)
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .ilike('name', searchPattern)
    .limit(1);

  (teams || []).forEach((t: any) => {
    results.push({
      id: t.id,
      entityType: 'team',
      title: t.name,
      subtitle: 'Team',
      navigateTo: '/(tabs)/players',
      navigateParams: { teamId: t.id, teamName: t.name },
    });
  });

  // Staff (max 1)
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('current_organization_id', orgId)
    .ilike('full_name', searchPattern)
    .in('primary_role', ['head_coach', 'assistant_coach', 'league_admin', 'team_manager'])
    .limit(1);

  (staff || []).forEach((s: any) => {
    results.push({
      id: s.id,
      entityType: 'staff',
      title: s.full_name || 'Staff',
      subtitle: s.email || '',
      navigateTo: '',
    });
  });

  return results.slice(0, 5);
}

// ─── Full Search: All entity types, higher limits ────────────────────────────

async function searchAll(query: string, orgId: string): Promise<SearchResults> {
  const searchPattern = `%${query}%`;
  const results: SearchResults = {
    players: [],
    parents: [],
    teams: [],
    staff: [],
    events: [],
    payments: [],
    totalCount: 0,
  };

  // Players (max 20)
  const { data: players } = await supabase
    .from('players')
    .select('id, first_name, last_name, jersey_number, position, team_players(team_id, teams(name))')
    .or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`)
    .limit(20);

  results.players = (players || []).map((p: any) => ({
    id: p.id,
    entityType: 'player' as SearchEntityType,
    title: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    subtitle: p.team_players?.[0]?.teams?.name || 'No team',
    meta: [p.position, p.jersey_number ? `#${p.jersey_number}` : ''].filter(Boolean).join(' | '),
    navigateTo: '/player-card',
    navigateParams: { playerId: p.id },
  }));

  // Parents (max 20)
  const { data: parents } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('current_organization_id', orgId)
    .or(`full_name.ilike.${searchPattern},email.ilike.${searchPattern}`)
    .in('primary_role', ['parent'])
    .limit(20);

  results.parents = (parents || []).map((p: any) => ({
    id: p.id,
    entityType: 'parent' as SearchEntityType,
    title: p.full_name || 'Parent',
    subtitle: p.email || '',
    meta: p.phone || '',
    navigateTo: '',
  }));

  // Teams (max 10)
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, team_players(count)')
    .ilike('name', searchPattern)
    .limit(10);

  results.teams = (teams || []).map((t: any) => ({
    id: t.id,
    entityType: 'team' as SearchEntityType,
    title: t.name,
    subtitle: 'Team',
    meta: t.team_players?.[0]?.count ? `${t.team_players[0].count} players` : '',
    navigateTo: '/(tabs)/players',
    navigateParams: { teamId: t.id, teamName: t.name },
  }));

  // Staff (max 10)
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, email, primary_role')
    .eq('current_organization_id', orgId)
    .ilike('full_name', searchPattern)
    .in('primary_role', ['head_coach', 'assistant_coach', 'league_admin', 'team_manager'])
    .limit(10);

  results.staff = (staff || []).map((s: any) => ({
    id: s.id,
    entityType: 'staff' as SearchEntityType,
    title: s.full_name || 'Staff',
    subtitle: s.email || '',
    meta: formatRole(s.primary_role),
    navigateTo: '',
  }));

  // Events (max 10)
  const { data: events } = await supabase
    .from('schedule_events')
    .select('id, title, event_type, event_date, start_time, team_id, teams(name)')
    .or(`title.ilike.${searchPattern}`)
    .order('event_date', { ascending: false })
    .limit(10);

  results.events = (events || []).map((e: any) => ({
    id: e.id,
    entityType: 'event' as SearchEntityType,
    title: e.title || formatEventType(e.event_type),
    subtitle: `${e.event_date || ''}${e.teams?.name ? ' | ' + e.teams.name : ''}`,
    meta: formatEventType(e.event_type),
    navigateTo: '',
  }));

  // Payments (max 10) — search by payer_name or fee_name
  try {
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, status, fee_name, payer_name, player_id, players(first_name, last_name)')
      .or(`payer_name.ilike.${searchPattern},fee_name.ilike.${searchPattern}`)
      .order('created_at', { ascending: false })
      .limit(10);

    results.payments = (payments || []).map((p: any) => {
      const playerName = p.players
        ? `${p.players.first_name || ''} ${p.players.last_name || ''}`.trim()
        : '';
      return {
        id: p.id,
        entityType: 'payment' as SearchEntityType,
        title: p.payer_name || playerName || 'Payment',
        subtitle: p.fee_name || '',
        meta: [
          p.amount != null ? `$${Number(p.amount).toFixed(2)}` : '',
          p.status || '',
        ].filter(Boolean).join(' | '),
        navigateTo: '/(tabs)/payments',
      };
    });
  } catch {
    results.payments = [];
  }

  results.totalCount =
    results.players.length +
    results.parents.length +
    results.teams.length +
    results.staff.length +
    results.events.length +
    results.payments.length;

  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRole(role: string): string {
  switch (role) {
    case 'head_coach': return 'Head Coach';
    case 'assistant_coach': return 'Assistant Coach';
    case 'league_admin': return 'Admin';
    default: return role || '';
  }
}

function formatEventType(type: string): string {
  switch (type) {
    case 'game': return 'Game';
    case 'practice': return 'Practice';
    case 'tournament': return 'Tournament';
    case 'meeting': return 'Meeting';
    default: return type || 'Event';
  }
}
