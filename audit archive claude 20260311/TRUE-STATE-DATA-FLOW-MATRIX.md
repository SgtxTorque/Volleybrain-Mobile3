# TRUE-STATE-DATA-FLOW-MATRIX.md
## Lynx Mobile — Data Flow Audit
### Audit Date: 2026-03-11

---

## 1. Auth Bootstrap

**File:** `lib/auth.tsx`
**Trigger:** App mount → `AuthProvider` useEffect → `init()` (line 86)

| Step | Query | Table | Columns | Filters |
|------|-------|-------|---------|---------|
| 1. Session | `supabase.auth.getSession()` | auth.sessions | - | current session |
| 2. Profile load | `.from('profiles').select('*').eq('id', user.id).maybeSingle()` | profiles | all | `id = auth.user.id` |
| 3. Profile create (if missing) | `.from('profiles').insert({...}).select().single()` | profiles | id, email, full_name, onboarding_completed | insert only |
| 4. Roles load | `.from('user_roles').select('role, organization_id').eq('user_id', user.id).eq('is_active', true)` | user_roles | role, organization_id | `user_id`, `is_active=true` |
| 5. Org load | `.from('organizations').select('*').eq('id', orgId).maybeSingle()` | organizations | all | first role's `organization_id` |
| 6. Push token | `registerForPushNotificationsAsync()` + `savePushToken()` | push_tokens | user_id, token | - |
| 7. Orphan check | `.from('players').select('id, first_name, last_name, season_id, family_id').eq('parent_email', email).is('parent_account_id', null).limit(10)` | players | id, first_name, last_name, season_id, family_id | `parent_email`, `parent_account_id IS NULL` |

**Context set:** `session`, `user`, `profile`, `organization`, `isAdmin`, `isPlatformAdmin`, `needsOnboarding`, `hasOrphanRecords`, `orphanPlayers`

**Retry logic:** Line 160 — retries profile query once after 1s on network failure.

---

## 2. Role Detection (usePermissions)

**File:** `lib/permissions-context.tsx`
**Trigger:** `user?.id` or `profile?.current_organization_id` changes

| Check | Query | Table | Filter | Purpose |
|-------|-------|-------|--------|---------|
| Parent (guardians) | `.from('player_guardians').select('id').eq('guardian_id', user.id).limit(1)` | player_guardians | `guardian_id = user.id` | Direct guardian link |
| Parent (account) | `.from('players').select('id').eq('parent_account_id', user.id).limit(1)` | players | `parent_account_id = user.id` | Account-linked parent |
| Parent (email) | `.from('players').select('id').ilike('parent_email', email).limit(1)` | players | `parent_email ilike email` | Legacy email match |
| Coach | `.from('coaches').select('id').eq('profile_id', user.id).limit(1)` | coaches | `profile_id = user.id` | Coach self-check |
| Player | `.from('players').select('id').eq('parent_account_id', user.id).limit(1)` | players | `parent_account_id = user.id` | Player self-check |

**Role switching:** `viewAs` state (line 48) — production feature allowing role override via `setViewAs()`.

**DRIFT RISK:** Role detection queries in `permissions-context.tsx` are independent of `user_roles` table. A user could have `admin` in `user_roles` AND be auto-detected as parent via `player_guardians`. Both flags would be true simultaneously.

---

## 3. Season Selection

**File:** `lib/season.tsx`
**Trigger:** `activeSport?.id` or `organization?.id` changes

**Query (lines 55-71):**
```
.from('seasons')
.select('*')
.eq('organization_id', org.id)
.eq('sport_id', sport.id)  // if sport selected
.order('end_date', { ascending: false })
.order('created_at', { ascending: false })
```

**Working season selection priority (lines 76-93):**
1. Current `workingSeason` if still in filtered list
2. Restore from AsyncStorage (`vb_admin_last_season_id`)
3. First season with `status = 'active'`
4. First season in list

**FINDING:** No explicit filter excludes archived/completed seasons from the query. All seasons are returned. SeasonSelector component may filter in UI, but the underlying data includes all statuses.

---

## 4. Team Resolution — CRITICAL DRIFT

### Path A: `useCoachTeam` hook
**File:** `hooks/useCoachTeam.ts`

| Priority | Query | Table | Filter |
|----------|-------|-------|--------|
| 1 (Primary) | `.from('team_staff').select('team_id, teams(...)').eq('user_id', user.id)` | team_staff → teams → seasons | `user_id` (NO `is_active` filter) |
| 2 (Secondary) | `.from('coaches').select('id, team_coaches(...)').eq('profile_id', user.id)` | coaches → team_coaches → teams → seasons | `profile_id` |
| 3 (Fallback) | `.from('teams').select('id, name, season_id').eq('season_id', workingSeason.id)` | teams | `season_id` |

**Selection:** Prefers team in current season. Falls back to first team.

### Path B: `useCoachHomeData` hook
**File:** `hooks/useCoachHomeData.ts` (lines 96-143)

Same 3-path resolution as `useCoachTeam`, but returns **all teams** (not just one).

### Path C: `useAdminHomeData` hook
**File:** `hooks/useAdminHomeData.ts` (lines 144-154)

```
.from('teams').select('id, name, season_id').eq('season_id', workingSeason.id)
```

**No coach linkage** — direct teams query by season only.

### DRIFT IDENTIFIED
| Consumer | Resolution Method | Fallback Behavior |
|----------|-------------------|-------------------|
| useCoachTeam | team_staff → coaches/team_coaches → ALL teams | Coach sees unrelated teams if no assignment |
| useCoachHomeData | Same 3-path | Returns all teams |
| useAdminHomeData | Direct season query | No coach linkage |
| Admin schedule | Direct season query | No coach linkage |
| Challenge system | `team_id` from useCoachTeam | Depends on hook |

---

## 5. Parent-Child Linkage — THREE SOURCES

**Files:** `lib/permissions-context.tsx`, `hooks/useParentHomeData.ts`

| Method | Query | Table | Filter |
|--------|-------|-------|--------|
| 1. Guardians | `.from('player_guardians').select('player_id').eq('guardian_id', user.id)` | player_guardians | `guardian_id` |
| 2. Account link | `.from('players').select('*').eq('parent_account_id', user.id)` | players | `parent_account_id` |
| 3. Email match | `.from('players').select('*').ilike('parent_email', email)` | players | `parent_email` |

**Merge strategy:** All three queried independently, results unioned and deduplicated.

**DRIFT RISK:** If a child is linked via multiple methods (e.g., both `player_guardians` AND `parent_account_id`), they may appear duplicated before dedup. Also, email match is case-insensitive (`ilike`) while other methods are exact.

---

## 6. Coach-Team Linkage — TWO TABLES

| Table | Join Pattern | Purpose |
|-------|-------------|---------|
| `team_staff` | `user_id = auth.user.id` → `team_id` | Generic staff-team link (coaches, volunteers) |
| `team_coaches` | `coach_id` → `coaches.id` where `coaches.profile_id = auth.user.id` | Coach-specific link |

**FINDING:** `useCoachTeam` intentionally omits `is_active` filter on `team_staff` (per line 4 comment). This means inactive staff assignments are still returned.

---

## 7. Schedule / Game Day

**File:** `app/(tabs)/gameday.tsx`, `hooks/useCoachHomeData.ts`

| Context | Query Pattern | Filters |
|---------|--------------|---------|
| Coach upcoming | `.from('schedule_events').select('*').eq('season_id', ws.id).gte('event_date', today)` | season, date >= today |
| Coach game results | `.eq('event_type', 'game').not('game_result', 'is', null)` | completed games only |
| Parent events | `.from('schedule_events').gte('event_date', today)` | date >= today |
| Admin events | `.from('schedule_events').eq('season_id', ws.id)` | season only |

**DRIFT:** Coach filters by season end date range, parent filters by today only, admin has no date filter.

---

## 8. Stats / Game Recap

| Table | Purpose | Key Join |
|-------|---------|----------|
| `game_player_stats` | Individual player stats per game | `event_id` (NOT `schedule_event_id`) |
| `player_season_stats` | Aggregated season stats | `player_id + season_id` |
| `player_skill_ratings` | Evaluation ratings | `player_id + team_id + season_id` |

**CONFIRMED:** `game_player_stats` uses `event_id` column consistently across hooks. Previous `schedule_event_id` references were fixed in Phase A.

---

## 9. Evaluations

**File:** `lib/evaluations.ts`

| Operation | Query | Tables |
|-----------|-------|--------|
| Get roster | `.from('team_players').select('player_id')` | team_players |
| Get ratings | `.from('player_skill_ratings').select('*').in('player_id', ids).eq('team_id', tid)` | player_skill_ratings |
| Save evaluation | Upsert to `player_skill_ratings` + insert to `player_evaluations` | both |
| Due check | `rated_at` > 30 days ago | player_skill_ratings |

**9 skills rated:** Serving, Passing, Setting, Attacking, Blocking, Defense, Hustle, Coachability, Teamwork

---

## 10. Challenges

**File:** `lib/challenge-service.ts`

| Table | Purpose |
|-------|---------|
| `coach_challenges` | Challenge config (title, type, target, xp, dates) |
| `challenge_participants` | Player opt-ins + progress |
| `team_posts` | Challenge announcement (post_type: 'challenge') |
| `game_player_stats` | Stat-based metric resolution |

**Team resolution:** Challenges use `team_id` directly from `useCoachTeam` hook.

**Metric types:** `stat_based` (reads game_player_stats), `coach_verified` (manual), `self_report` (player-reported).

---

## 11. Chat System

| Table | Purpose |
|-------|---------|
| `chat_channels` | Channel metadata (season_id, channel_type, created_by) |
| `channel_members` | Membership (user_id, member_role, last_read_at, left_at) |
| `chat_messages` | Messages (sender_id, content, message_type, is_deleted) |
| `message_attachments` | File/image attachments |
| `message_reactions` | Emoji reactions |
| `typing_indicators` | Typing status |

**DRIFT RISK:** `member_role` is set from `profiles.account_type` (e.g., `user.account_type || 'parent'`). This uses a `profiles` column rather than the role detection from `usePermissions()`. See `chats.tsx:350`, `coach-chat.tsx:438`, `parent-chat.tsx:348`.

---

## 12. N+1 Query Pattern (Tab Layout)

**File:** `app/(tabs)/_layout.tsx` (lines 76-100)

```typescript
for (const m of memberships) {
  const { count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', m.channel_id)
    ...
}
```

**FINDING:** Unread chat count in tab layout uses per-channel loop query (N+1 pattern). With many channels, this creates N+1 Supabase calls on every tab layout render.

---

## Critical Drift Summary

| # | Drift Pattern | Impact | Evidence |
|---|---------------|--------|----------|
| 1 | Team resolution: 3 different paths | Coach may see different teams across screens | `useCoachTeam.ts`, `useCoachHomeData.ts`, `useAdminHomeData.ts` |
| 2 | Parent-child: 3 link methods merged | Potential duplicates | `permissions-context.tsx`, `useParentHomeData.ts` |
| 3 | Chat member_role from `account_type` | Role in chat differs from permissions system | `chats.tsx:350`, `coach-chat.tsx:438` |
| 4 | Season filtering inconsistent | Archived seasons may appear in some contexts | `lib/season.tsx` — no status filter |
| 5 | Coach team_staff: no `is_active` filter | Inactive assignments still returned | `useCoachTeam.ts:4` (intentional per comment) |
| 6 | N+1 unread count | Performance degradation with many channels | `_layout.tsx:91-98` |
