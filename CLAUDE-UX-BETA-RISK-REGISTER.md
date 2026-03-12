# CLAUDE-UX-BETA-RISK-REGISTER.md
## Lynx Mobile — UX & Data Risk Register for Beta Launch
### Audit Date: 2026-03-11

---

## Risk Scoring

- **Likelihood:** 1 (Rare) — 5 (Almost Certain)
- **Impact:** 1 (Negligible) — 5 (Critical)
- **Risk Score:** Likelihood x Impact (1–25)

---

## P0 — CRITICAL RISKS (Score 15+, must fix before beta)

### RISK-01: No Permission Validation on Player Data Access
**Score: 20** (Likelihood: 4, Impact: 5)

`usePlayerHomeData(playerId)` accepts any player ID without verifying the requesting user has permission to view that player's data.

**Attack Vector:**
- Parent A discovers Parent B's child's `playerId` (via shared link, app logs, or URL guessing)
- Parent A navigates to `/child-detail?playerId={PARENT_B_CHILD_ID}`
- `usePlayerHomeData` loads all of Parent B's child's stats, achievements, and personal data

**Evidence:**
- `hooks/usePlayerHomeData.ts` — no ownership check
- `app/child-detail.tsx` — no permission guard
- Supabase RLS may mitigate at DB level, but client-side hook has no validation

**Mitigation:** Add ownership verification before data fetch:
```tsx
// Verify parent owns this player
const { data: ownership } = await supabase
  .from('players')
  .select('id')
  .eq('id', playerId)
  .or(`parent_account_id.eq.${user.id},id.in(${guardianIds})`)
  .maybeSingle();
if (!ownership) return; // Unauthorized
```

---

### RISK-02: No Permission Validation on Challenge Detail
**Score: 16** (Likelihood: 4, Impact: 4)

`challenge-detail.tsx` accepts `challengeId` from URL params without verifying the user can access that challenge.

**Attack Vector:**
- User navigates to `/challenge-detail?challengeId={OTHER_TEAM_CHALLENGE}`
- Challenge data for another team loaded and displayed

**Evidence:**
- `app/challenge-detail.tsx` — no null check, no access control
- `ChallengeVerifyCard.tsx` passes `challengeId` but not `childId`

**Mitigation:** Verify challenge belongs to user's team/org before rendering.

---

### RISK-03: Game Data Loss During Live Scoring
**Score: 15** (Likelihood: 3, Impact: 5)

All stats during live scoring are stored in-memory only. If the app crashes mid-game, all stats are lost with no recovery.

**Evidence:**
- `app/game-day-command.tsx` — stats in component state
- No periodic server sync
- No offline cache / auto-save
- No crash recovery mechanism

**Impact:** Coach loses entire game's stats (30+ minutes of data entry) on app crash.

**Mitigation:** Implement periodic server sync (every 30 seconds) and local AsyncStorage backup.

---

### RISK-04: AsyncStorage Keys Not Cleared on Logout
**Score: 15** (Likelihood: 3, Impact: 5)

When `signOut()` is called (`lib/auth.tsx`), the following AsyncStorage keys persist:

| Key | Risk |
|-----|------|
| `vb_admin_last_season_id` | Next user sees previous user's season context |
| `vb_player_last_child_id` | Next user sees previous user's child selection |
| `activeSportId` | Next user sees previous user's sport selection |
| `lynx_daily_achievement_check` | Minor — skips daily check |

**Evidence:** `lib/auth.tsx` — `signOut()` function does not call `AsyncStorage.multiRemove()`.

**Impact:** On shared family devices, User B may see User A's stale dashboard context, potentially exposing User A's child selection or org data on first load.

**Mitigation:** Clear all `vb_*` and `lynx_*` keys in `signOut()`.

---

## P1 — HIGH RISKS (Score 10–14, fix before public launch)

### RISK-05: Notification Deep Link Missing eventId for Games
**Score: 12** (Likelihood: 4, Impact: 3)

Game notifications push to `/game-prep` without passing `eventId`. Screen loads with no game selected.

**Evidence:** `app/_layout.tsx:106` — `router.push('/game-prep')` — no params.

**Impact:** Coach taps game notification → empty/wrong game shown. Trust in notification system eroded.

**Mitigation:** Pass `eventId` from notification payload: `router.push(\`/game-prep?eventId=\${data.eventId}\`)`.

---

### RISK-06: Coach team_staff Query Missing is_active Filter
**Score: 12** (Likelihood: 3, Impact: 4)

`useCoachTeam.ts` fetches from `team_staff` without filtering `is_active=true` (line 35–39). Coaches removed from teams still see those teams until app restart.

**Evidence:**
```tsx
// hooks/useCoachTeam.ts:35-39
const { data: staffTeams } = await supabase
  .from('team_staff')
  .select('team_id, teams ( ... )')
  .eq('user_id', user.id);  // NO is_active filter
```

**Impact:** Removed coach accesses team they shouldn't. May view/modify roster or enter stats for wrong team.

**Mitigation:** Add `.eq('is_active', true)` to query.

---

### RISK-07: Season Persistence Without Recovery
**Score: 10** (Likelihood: 2, Impact: 5)

If a persisted season is deleted/archived while the user is away, `workingSeason` becomes null on next load. DashboardRouter can't load → app shows loading spinner indefinitely.

**Evidence:** `lib/season.tsx:79` — `currentStillValid` check finds no match, sets `workingSeason = null`. No fallback to prompt user to select a new season.

**Mitigation:** If persisted season is invalid, show season picker instead of null/spinner.

---

### RISK-08: N+1 Query Pattern in Tab Layout
**Score: 10** (Likelihood: 5, Impact: 2)

Tab layout fetches unread chat counts with a per-channel sequential loop:
```tsx
for (const m of memberships) {
  const { count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', m.channel_id)
    .gt('created_at', m.last_read_at || '1970-01-01');
  totalUnread += (count || 0);
}
```

20 channels = 20 sequential queries on every tab mount + every real-time event.

**Evidence:** `app/(tabs)/_layout.tsx:91–98`.

**Impact:** Performance degradation as users join more channels. Each real-time event (message insert) triggers full re-fetch.

**Mitigation:** Batch into single query with `channel_id.in()` or use a server-side function.

---

### RISK-09: N+1 in Parent Chat Channel Fetching
**Score: 10** (Likelihood: 4, Impact: 2.5)

`parent-chat.tsx` fetches last message and unread count per-channel sequentially (lines 172–209):
```tsx
for (const mc of memberChannels) {
  const { data: lastMsg } = await supabase...  // Sequential
  const { count } = await supabase...           // Sequential
}
```

This is already fixed (batched) in `coach-chat.tsx` but not back-ported to parent-chat.

**Evidence:** `app/(tabs)/parent-chat.tsx:172–209`.

---

### RISK-10: Multi-Child RSVP Confusion
**Score: 10** (Likelihood: 2, Impact: 5)

Parent with 2+ children may RSVP the wrong child because Billboard Hero cycles all children's events without prominent child name attribution.

**Evidence:** `EventHeroCard.tsx` passes `event.childId` correctly, but child name not prominently displayed.

**Impact:** Wrong child RSVPed → coach builds incorrect roster → child doesn't show up to game.

---

## P2 — MEDIUM RISKS (Score 5–9)

### RISK-11: Silent Error Handling on 15+ Screens
**Score: 9** (Likelihood: 3, Impact: 3)

Pattern: `if (error && __DEV__) console.error(...)` — errors logged only in dev mode. Production users see blank screens on network failure.

**Evidence:** Found in `team-roster.tsx:73–77`, `gameday.tsx`, `players.tsx`, `roster.tsx`, `standings.tsx`, `parent-chat.tsx`, and 10+ more screens.

---

### RISK-12: Role Override Not Persisted
**Score: 6** (Likelihood: 3, Impact: 2)

`viewAs` state in permissions context lives in React component only. Resets on app restart. Admin who switched to "coach view" must re-select on every launch.

**Evidence:** `lib/permissions-context.tsx:48` — state not saved to AsyncStorage.

---

### RISK-13: Organization Loaded from First Role Only
**Score: 6** (Likelihood: 2, Impact: 3)

Auth context loads organization from first active user_role's org_id (line 236). Users with roles in multiple organizations see only the first org's data.

**Evidence:** `lib/auth.tsx:236`.

---

### RISK-14: Admin Org Derived from Season (Not Auth)
**Score: 6** (Likelihood: 2, Impact: 3)

`useAdminHomeData` derives `orgId` from `workingSeason.organization_id` instead of from Auth context:
```tsx
const orgId = (workingSeason as any).organization_id || (organization as any)?.id;
```

If `workingSeason` has corrupted org data, admin sees wrong org's data.

**Evidence:** `hooks/useAdminHomeData.ts:140`.

---

### RISK-15: ChallengeVerifyCard Missing childId in Navigation
**Score: 6** (Likelihood: 2, Impact: 3)

`ChallengeVerifyCard` navigates to `/challenge-detail?challengeId=X` but doesn't pass `childId`. If same challenge exists across teams, wrong child may see it.

**Evidence:** `components/parent-scroll/ChallengeVerifyCard.tsx:100+`.

---

## P3 — LOW RISKS (Score 1–4)

### RISK-16: Stale `console.log` Statements
**Score: 3** (Likelihood: 3, Impact: 1)

Multiple debug `console.log` statements remain in production code paths. Minor performance impact and information leakage in device logs.

---

### RISK-17: Game-Prep-Wizard Missing Permission Check
**Score: 4** (Likelihood: 1, Impact: 4)

`game-prep-wizard.tsx` accepts `eventId` and `teamId` from URL params without verifying the coach owns the team or has access to the event.

**Evidence:** `app/game-prep-wizard.tsx:80`.

---

### RISK-18: Orphaned Routes (Dead Code)
**Score: 2** (Likelihood: 2, Impact: 1)

6 routes with no discovered navigation path: `/(tabs)/me`, `/(tabs)/coaches`, `/(tabs)/teams`, `/registration-start`, `/notification`, `/report-viewer`.

**Impact:** Dead code maintenance burden only.

---

## Risk Summary by Priority

| Priority | Count | Description |
|----------|-------|-------------|
| **P0 (Critical)** | 4 | Permission validation, data loss, session leakage |
| **P1 (High)** | 6 | Deep links, query patterns, context failures |
| **P2 (Medium)** | 5 | Silent errors, role persistence, org scoping |
| **P3 (Low)** | 3 | Debug logs, dead code, minor permission gaps |
| **Total** | **18** | |

---

## Pre-Beta Checklist

- [ ] RISK-01: Add permission validation to `usePlayerHomeData`
- [ ] RISK-02: Add access control to `challenge-detail.tsx`
- [ ] RISK-03: Implement periodic auto-save in game-day-command
- [ ] RISK-04: Clear AsyncStorage on signOut()
- [ ] RISK-05: Pass eventId in game notification deep link
- [ ] RISK-06: Add `is_active=true` filter to useCoachTeam
- [ ] RISK-07: Add season recovery fallback in season provider
- [ ] RISK-08: Batch unread count query in tab layout
- [ ] RISK-09: Back-port batched chat query to parent-chat
- [ ] RISK-10: Display child name prominently on Billboard Hero
