# CC-ADMIN-GLOBAL-SEARCH
# Lynx Admin Global Search
# Status: READY FOR CC EXECUTION

---

## STANDING RULES

1. **Read these files first, in order:**
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
   - `SCHEMA_REFERENCE.csv` in repo root
   - `LYNX-REFERENCE-GUIDE.md` in repo root
2. **Read the existing Admin Home scroll** to understand the current search bar placeholder and design tokens.
3. **Do NOT modify any database tables, RLS policies, or migration files.**
4. **Do NOT modify any player or coach components.**
5. **Commit after each phase.** Commit message format: `[admin-search] Phase X: description`
6. **If something is unclear, STOP and report back.**
7. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Builds a global search system for the Admin role that searches across 6 entity types: Players, Parents/Families, Teams, Coaches/Staff, Events, and Payments. The search bar on the Admin Home provides instant preview results as the admin types, and tapping enter or "See all results" navigates to a dedicated search results screen with categorized results.

Creates:
1. **useGlobalSearch hook** — debounced search across 6 tables
2. **SearchPreviewDropdown** — instant results overlay below the search bar
3. **AdminSearchResultsScreen** — full results screen with categorized sections
4. **Search bar wiring** — connects the existing Admin Home search bar to real search

---

## PHASE 1: Investigation — Read before writing

Before writing any code, read and report:

1. **Where is the Admin Home scroll?** Find the exact file path. List the components it renders.

2. **Where is the search bar?** Find the existing search bar component or placeholder on the Admin Home. What file is it in? Is it a standalone component or inline JSX? Does it have an `onChangeText` handler? Does it currently do anything on input?

3. **What tables store each entity type?** Verify exact table and column names from SCHEMA_REFERENCE.csv:
   - Players: `players` table — what are the name columns? (`first_name`, `last_name`? `full_name`?)
   - Parents: `profiles` table with role = 'parent'? Or a separate parents table? How are parents linked to players?
   - Teams: `teams` table — name column?
   - Coaches/Staff: `team_staff` joined with `profiles`? Or `user_roles` with coach roles?
   - Events: `schedule_events` — title, event_date, event_type columns?
   - Payments: what table stores payments? `payments`? `payment_records`? What columns link to families?

4. **How does the admin scope data?** Is it scoped to their organization via `current_organization_id` on profiles? Or do they see everything? Find how other admin queries scope data (e.g., how the admin home dashboard queries teams).

5. **What navigation pattern does the admin use?** File-based routing (`app/` directory)? Stack navigator? How do existing admin screens navigate to detail views (e.g., tapping a team goes to team detail)?

6. **Do detail screens exist for each entity type?** Find navigation routes for:
   - Player detail screen
   - Parent/family detail screen
   - Team detail screen
   - Coach/staff detail screen
   - Event detail screen
   - Payment detail screen
   List the route names and any required params.

7. **What icon library does the admin side use?** Same as player side? Check imports in admin components.

**Report findings, then proceed to Phase 2.** Do not wait for confirmation.

---

## PHASE 2: Create useGlobalSearch hook

Create a new file:
```
hooks/useGlobalSearch.ts
```

```typescript
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SearchEntityType = 'player' | 'parent' | 'team' | 'staff' | 'event' | 'payment';

export interface SearchResult {
  id: string;
  entityType: SearchEntityType;
  title: string;           // Primary display text (name, team name, event title)
  subtitle: string;        // Secondary text (team name for player, email for parent, date for event)
  meta?: string;           // Tertiary text (position, role, amount)
  navigateTo: string;      // Route to navigate to on tap
  navigateParams?: Record<string, string>;  // Route params
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

  // Get the admin's organization ID (cached after first call)
  const getOrgId = async (): Promise<string | null> => {
    if (orgIdRef.current) return orgIdRef.current;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

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
        console.error('[useGlobalSearch] Preview error:', err);
      }
    }, 300); // 300ms debounce
  }, []);

  // ─── Full Search (runs on enter / "See all") ────────────────────────────

  const executeFullSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    try {
      setLoading(true);
      setHasSearched(true);

      const orgId = await getOrgId();
      if (!orgId) return;

      const fullResults = await searchAll(trimmed, orgId);
      setResults(fullResults);
    } catch (err) {
      console.error('[useGlobalSearch] Full search error:', err);
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
      navigateTo: 'player-detail',
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
      navigateTo: 'parent-detail',
      navigateParams: { profileId: p.id },
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
      navigateTo: 'team-detail',
      navigateParams: { teamId: t.id },
    });
  });

  // Staff (max 1)
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('current_organization_id', orgId)
    .ilike('full_name', searchPattern)
    .in('primary_role', ['head_coach', 'assistant_coach', 'league_admin'])
    .limit(1);

  (staff || []).forEach((s: any) => {
    results.push({
      id: s.id,
      entityType: 'staff',
      title: s.full_name || 'Staff',
      subtitle: s.email || '',
      navigateTo: 'staff-detail',
      navigateParams: { profileId: s.id },
    });
  });

  return results.slice(0, 5);
}

// ─── Full Search: All entity types, higher limits ────────────────────────────

async function searchAll(query: string, orgId: string): Promise<SearchResults> {
  const searchPattern = `%${query}%`;
  const results: SearchResults = { ...EMPTY_RESULTS };

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
    navigateTo: 'player-detail',
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
    navigateTo: 'parent-detail',
    navigateParams: { profileId: p.id },
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
    navigateTo: 'team-detail',
    navigateParams: { teamId: t.id },
  }));

  // Staff (max 10)
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, email, primary_role')
    .eq('current_organization_id', orgId)
    .ilike('full_name', searchPattern)
    .in('primary_role', ['head_coach', 'assistant_coach', 'league_admin'])
    .limit(10);

  results.staff = (staff || []).map((s: any) => ({
    id: s.id,
    entityType: 'staff' as SearchEntityType,
    title: s.full_name || 'Staff',
    subtitle: s.email || '',
    meta: formatRole(s.primary_role),
    navigateTo: 'staff-detail',
    navigateParams: { profileId: s.id },
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
    title: e.title || `${formatEventType(e.event_type)}`,
    subtitle: `${e.event_date || ''} ${e.teams?.name ? '| ' + e.teams.name : ''}`,
    meta: formatEventType(e.event_type),
    navigateTo: 'event-detail',
    navigateParams: { eventId: e.id },
  }));

  // Payments (max 10) — search by family name
  // Investigation must confirm the payment table name and columns.
  // This is a placeholder query — adjust table/column names based on investigation.
  try {
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, status, due_date, profile:player_id(full_name)')
      .or(`description.ilike.${searchPattern}`)
      .order('due_date', { ascending: false })
      .limit(10);

    results.payments = (payments || []).map((p: any) => ({
      id: p.id,
      entityType: 'payment' as SearchEntityType,
      title: (p.profile as any)?.full_name || 'Payment',
      subtitle: p.status || '',
      meta: p.amount ? `$${(p.amount / 100).toFixed(2)}` : '',
      navigateTo: 'payment-detail',
      navigateParams: { paymentId: p.id },
    }));
  } catch {
    // If payments table doesn't exist or query fails, skip silently
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
```

**IMPORTANT:** The payment query is a best-guess. The investigation step must confirm the actual payments table name and columns. If the table is named differently (e.g., `payment_records`, `invoices`, `family_payments`), adjust the query. If searching payments by family name requires a different join path, adjust accordingly. If no payments table exists, skip the payments search and remove it from the results.

**Commit:** `[admin-search] Phase 2: useGlobalSearch hook`

---

## PHASE 3: Create SearchPreviewDropdown

Create a new file:
```
components/admin/SearchPreviewDropdown.tsx
```

### Design requirements:

This component renders below the search bar as the admin types. It shows up to 5 instant results.

**Appearance:**
- White/light background card with subtle shadow or border (match the admin card style)
- Appears when `previewResults.length > 0` and search query has 2+ characters
- Disappears when query is cleared or search bar loses focus

**Each result row:**
- Left: entity type icon (small, color-coded)
  - Player: person icon, sky blue
  - Parent: family icon, teal
  - Team: shield/group icon, purple
  - Staff: whistle/clipboard icon, amber
  - Event: calendar icon, coral
  - Payment: dollar icon, green
- Middle: title (14px, weight 600) + subtitle (12px, muted)
- Right: entity type label pill (tiny, color-matched, e.g., "Player", "Team")
- Tappable: navigates to the entity detail screen

**Bottom row:** "See all results" link (tappable, navigates to full search results screen with current query)

**Dismissal:** Tapping outside the dropdown closes it. Tapping a result navigates and closes it.

### Props:

```typescript
interface Props {
  results: SearchResult[];
  query: string;
  visible: boolean;
  onResultTap: (result: SearchResult) => void;
  onSeeAll: () => void;
  onDismiss: () => void;
}
```

**Commit:** `[admin-search] Phase 3: SearchPreviewDropdown`

---

## PHASE 4: Create AdminSearchResultsScreen

Create a new file using the app's routing pattern:
```
app/admin-search-results.tsx
```
Or:
```
screens/AdminSearchResultsScreen.tsx
```
Use whichever pattern matches existing admin screens.

### Design requirements:

**Header:**
- Search bar at top (pre-filled with the query, editable)
- Typing in this search bar re-runs the search
- Back arrow to return to Admin Home

**Results organized by category tabs or sections:**

**Option A (preferred): Scrollable sections with headers**
All results in a single ScrollView, organized by entity type. Each section:
- Section header: entity type name + result count (e.g., "Players (4)")
- Section only appears if results > 0
- Each result row: same layout as preview (icon + title + subtitle + meta)
- Tappable: navigates to detail screen

**Section order:** Players > Parents > Teams > Staff > Events > Payments

**Empty state:** If no results for query: mascot (CONFUSED.png) + "No results for '[query]'. Try a different search."

**Loading state:** Subtle activity indicator below the search bar while results load. Do not block the UI.

**Result count:** Total at top: "X results for '[query]'"

### Data source:

Receive the query as a route param or read it from a shared state/context. The screen should call `executeFullSearch` on mount and when the query changes.

```typescript
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

const { query, results, loading, hasSearched, handleQueryChange, executeFullSearch } = useGlobalSearch();
```

**If the query comes as a route param,** initialize the hook with that query and trigger a search on mount.

### Navigation from results:

Each result has `navigateTo` and `navigateParams`. Use these to navigate:

```typescript
// On result tap:
router.push(`/${result.navigateTo}?${new URLSearchParams(result.navigateParams || {}).toString()}`);
// OR
navigation.navigate(result.navigateTo, result.navigateParams);
```

**IMPORTANT:** The `navigateTo` values ('player-detail', 'team-detail', etc.) must match actual route names in the app. The investigation step identifies the real route names. If they're different (e.g., 'player/[id]' instead of 'player-detail'), adjust the values in the search hook.

**Commit:** `[admin-search] Phase 4: AdminSearchResultsScreen`

---

## PHASE 5: Wire search into Admin Home

**File to modify:** The Admin Home scroll component (find in Phase 1 investigation)

### What to change:

Find the existing search bar placeholder. It likely looks like:

```typescript
<TextInput placeholder="Search players, families, teams..." />
```

Or it might be a custom component. Wire it to the global search:

**A. Add imports:**
```typescript
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import SearchPreviewDropdown from '@/components/admin/SearchPreviewDropdown';
```

**B. Initialize the hook:**
```typescript
const {
  query,
  previewResults,
  handleQueryChange,
  executeFullSearch,
  clearSearch,
} = useGlobalSearch();
```

**C. Wire the search bar:**
```typescript
<TextInput
  value={query}
  onChangeText={handleQueryChange}
  onSubmitEditing={executeFullSearch}  // Enter key triggers full search
  placeholder="Search players, families, teams..."
  returnKeyType="search"
/>
```

**D. Add the preview dropdown:**
Position the `SearchPreviewDropdown` directly below the search bar. It needs to overlay other content (use `position: absolute` or `zIndex`).

```typescript
{previewResults.length > 0 && query.length >= 2 && (
  <SearchPreviewDropdown
    results={previewResults}
    query={query}
    visible={true}
    onResultTap={(result) => {
      clearSearch();
      // Navigate to result detail
      router.push(`/${result.navigateTo}?${new URLSearchParams(result.navigateParams || {}).toString()}`);
    }}
    onSeeAll={() => {
      // Navigate to full results screen
      router.push(`/admin-search-results?q=${encodeURIComponent(query)}`);
    }}
    onDismiss={() => {
      // Clear preview but keep query
      setPreviewResults([]);
    }}
  />
)}
```

**E. Add a clear button to the search bar** (X icon) that calls `clearSearch()` when query is non-empty.

**IMPORTANT:** The preview dropdown must render ABOVE other scroll content. Use `zIndex` or place it in a container with `position: relative` that is higher in the z-stack than the scroll content below.

**Commit:** `[admin-search] Phase 5: wire search into Admin Home`

---

## PHASE 6: Register search results screen in navigation

Ensure `AdminSearchResultsScreen` is registered and accessible.

Route: `/admin-search-results?q={query}` or equivalent.

The screen should read the `q` param and use it to initialize the search.

**Commit:** `[admin-search] Phase 6: register search results screen`

---

## PHASE 7: Verification

### Verify:

1. `hooks/useGlobalSearch.ts` exists and exports `useGlobalSearch`
2. `components/admin/SearchPreviewDropdown.tsx` exists and renders preview results
3. `AdminSearchResultsScreen` exists and renders categorized results
4. **Typing in the Admin Home search bar** shows preview results after 2+ characters (300ms debounce)
5. **Preview shows max 5 results** with entity type icons and labels
6. **Tapping a preview result** navigates to the correct detail screen
7. **Tapping "See all results"** navigates to the full results screen
8. **Pressing enter** on the search bar navigates to the full results screen
9. **Full results screen** shows results organized by entity type with counts
10. **Tapping a result** on the full screen navigates to the detail screen
11. **Empty state** shows mascot when no results found
12. **Payments search** works OR was correctly skipped if table doesn't exist
13. **No TypeScript errors**
14. **No player, coach, or engine files modified**

### Report back with:

```
## VERIFICATION REPORT: Admin Global Search

### Files Created: [count]
[list each with line count]

### Files Modified: [count]
[list each with description]

### Search Behavior:
- Preview on type (2+ chars, 300ms debounce): WORKS / BROKEN
- Max 5 preview results: YES / NO
- Full search on enter: WORKS / BROKEN
- Full search on "See all": WORKS / BROKEN

### Entity Types Searchable:
- Players (by name): YES / NO
- Parents (by name, email): YES / NO
- Teams (by name): YES / NO
- Staff (by name): YES / NO
- Events (by title): YES / NO
- Payments (by family name): YES / NO / SKIPPED [reason]

### Navigation:
- Preview result tap > detail screen: WORKS / BROKEN
- Full result tap > detail screen: WORKS / BROKEN
- Route names mapped correctly: YES / NO [list any mismatches]

### Investigation Adjustments:
[List any table/column name changes or route name changes made based on investigation findings]

### Type Check: PASS / FAIL

### Errors: NONE / [list]
```
