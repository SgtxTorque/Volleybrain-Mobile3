# CC-SPEC-3-ADMIN-EXPERIENCE.md
# Spec 3 of 3: Admin Experience Fixes

> **Run AFTER CC-SPEC-1-FOUNDATION and CC-SPEC-2-COACH-PLAYER-EXPERIENCE are complete.**  
> **Depends on:** Spec 1 (auth, team_players schema fix), Spec 2 (challenge fixes)  
> **Rule:** Read every file mentioned BEFORE writing code. Do NOT invent table names. Do NOT break fixes from Specs 1 and 2.

---

## CONTEXT

Specs 1 and 2 fixed the auth foundation, navigation, team resolution, and coach/player experience. This spec fixes admin-specific issues: registration preview safety, payment context, coach directory, and the admin home layout.

### Standing Rules:
- ScrollViews ALWAYS mounted
- Brand tokens everywhere
- Gold/yellow text only on dark backgrounds
- Read existing working pages before writing queries
- Never expose raw UUIDs, internal IDs, or debug info to users in production

---

## FIX 14: Registration Preview Creates Real Player Records

### Problem:
The web portal's registration form preview (accessed via "Preview" button on a season card in Season Management) actually creates real player records, registration entries, and parent linkages in Supabase. Previews should be READ-ONLY and never write to the database.

### Investigation:
This is likely a web admin issue (`volleybrain-admin` repo), not a mobile issue. But since the data propagates to mobile (Carlos saw new registrations to review in the app), it affects the mobile experience.

### What to check:
1. In the web admin, find the registration preview route/component
2. Check if preview mode sets a flag (e.g., `isPreview: true`) that should prevent form submission
3. The form submission endpoint may not check for this flag

### Fix approach (web admin):
- Add a `preview` mode flag to the registration form component
- When in preview mode, the submit button should show "This is a preview" and be disabled, OR show a mock confirmation without calling Supabase
- If a preview flag already exists but isn't being checked at submission time, add the guard

### Fix approach (mobile — damage control):
For now, this is a web admin fix. On mobile, the registration-hub already handles unexpected registrations correctly (they show up, can be reviewed, approved, or deleted). No mobile code change needed here, but note this for the web admin spec.

**Tag this as: WEB ADMIN FIX NEEDED — not in mobile scope. Create a separate note for the web admin repo.**

---

## FIX 15: Payment Card Lacks Context — No Indication of What the Numbers Mean

### File: The payment card component on the Admin home scroll

### Problem:
The payment summary card on the admin dashboard shows $3,325 Unpaid / $410 Pending / $285 Paid but gives no indication of WHICH team, season, or context these numbers relate to. It also only shows data for the currently selected season/sport filter, with no way to see an org-wide view.

### Investigation:
1. Find the payment summary component in `components/AdminHomeScroll.tsx` or its sub-components
2. Check what query generates these numbers — is it filtered by season? By team?

### Fix:
1. Add a subtitle to the payment card showing the filter context: e.g., "Spring 2026 · Volleyball" so the admin knows what they're looking at
2. Add a text link "View All Seasons ›" that navigates to the payment admin page with no season filter applied (or a special "all" mode)

### Regarding the "all org" view:
This is a feature enhancement, not a bugfix. For THIS pass, adding the context label is sufficient. A full org-wide financial dashboard should be a separate spec (CC-PAYMENT-DASHBOARD or similar). Note it as a future item.

---

## FIX 16: Coaches List on Admin Home Should Be a Stat Card

### File: `components/AdminHomeScroll.tsx` and its sub-components

### Problem:
The admin home shows a raw list of coaches with their names and team assignments: "Coach — Black Hornets Elite, BH Stingers" repeated multiple times. This is ugly and takes up too much space. All entries show "Coach" as the name (not their real names), and one shows "Carlos test."

### Investigation:
1. Find where the coaches list renders in `AdminHomeScroll.tsx`
2. Check the query — it's likely joining `coaches` or `team_coaches` but not pulling `profiles.full_name`
3. The "Coach" display name means the query isn't resolving the coach's actual name from the profiles table

### Fix:
**Option A (preferred): Replace with a stat card:**
Instead of listing individual coaches, show a compact card:
```
COACHES        5 Active
[View Coach Directory →]
```
Tapping navigates to `/coach-directory`. Remove the individual coach list entirely.

**Option B (if keeping the list): Fix the names:**
Join through `coaches.profile_id` → `profiles.full_name` to get actual names. Show: "Carlos Fuentes — Black Hornets Elite, BH Stingers" instead of "Coach — Black Hornets Elite, BH Stingers".

**Recommendation: Go with Option A.** It's cleaner, takes less space, and the coach directory already exists for details.

---

## FIX 17: Bulk Event Creation Can't Find Teams

### File: `app/bulk-event-create.tsx`, lines ~96-107

### Root cause:
The team loading depends on `organization?.id` from auth context:
```typescript
const loadTeams = async () => {
  if (!organization?.id) { setLoadingTeams(false); return; }  // ← early return when org is null
  const { data } = await supabase
    .from('teams')
    .select('id, name')
    .eq('organization_id', organization.id)
    .order('name');
  setTeams(data || []);
};
```

After Spec 1's auth fix, `organization` should no longer be null for established users. However, the `loadTeams` effect runs on mount (`useEffect(() => { loadTeams(); }, [])`), which may fire before the auth context has finished loading.

### Fix:
Add `organization?.id` to the dependency array so it re-runs when org becomes available:
```typescript
useEffect(() => {
  loadTeams();
}, [organization?.id]);  // ← re-run when org loads
```

Also add season filtering — currently the query returns ALL teams across ALL seasons for the org. Add a season filter:
```typescript
const { data } = await supabase
  .from('teams')
  .select('id, name, season_id')
  .eq('organization_id', organization.id)
  .eq('season_id', workingSeason?.id)  // ← only current season teams
  .order('name');
```

---

## FIX 18: Event Detail Shows "No Players Linked" with Raw UID for Coach/Admin

### File: `components/EventDetailModal.tsx` (or wherever the event detail renders)

### Problem:
When a coach/admin views an event detail, it shows: "No players linked to your account on this team (uid: 8e9894f6-..., team: )". This message:
1. Exposes a raw UUID to the user — never acceptable
2. Is irrelevant for coach/admin roles — this check is for parents (linking their children to the event)
3. Shows an empty `team:` value indicating the team context is missing

### Fix:
1. Find the "No players linked" render in the event detail component
2. Gate it behind a parent role check: only show this section when the user's current role is `parent`
3. For coach/admin, this section should not render at all — coaches manage the event, they're not "linked" as players
4. Remove the raw UID debug text entirely. If debug info is needed, put it behind `__DEV__` check:
```typescript
if (__DEV__) console.log('Player linkage debug:', { uid, teamId });
```

---

## FIX 19: Season Selector Shows Test/Duplicate Seasons

### Problem:
The season selector dropdown shows: "Spring 2 2026", "Test Payment Season", "Spring 2026", "Summer 2026". Test seasons and duplicates create confusion.

### This is a DATA issue, not a code issue.
The test/duplicate seasons exist in Supabase and are legitimately created during development testing.

### Fix approach:
1. Do NOT filter seasons in code — the admin needs to see all seasons to manage them
2. Add an "Archive Season" option in Season Management that sets a `status = 'archived'` flag
3. The season selector should filter: show only `status = 'active'` or `status = 'upcoming'` seasons
4. Archived seasons are still accessible via Season Archives but don't clutter the main selector

**For THIS pass:** If seasons don't have a status field, this is a schema change and should be deferred. Just note it. If they DO have a status field, add the filter to the season selector query.

---

## VERIFICATION CHECKLIST
- [ ] Note created for web admin team re: registration preview creating real data
- [ ] Payment card on admin home shows context label (season + sport name)
- [ ] Coach list on admin home replaced with compact stat card + "View Directory" link
- [ ] Bulk Event Creation loads teams for current season
- [ ] Event detail for coach/admin does NOT show "No players linked" or raw UUIDs
- [ ] Season selector is clean and usable (or noted as data cleanup task)

---

## POST-SPEC NOTES FOR CARLOS

### Things that need separate specs (do NOT attempt in these bugfix passes):
1. **CC-ROSTER-REDESIGN** — Replace the old gold/navy grid cards with modern player cards including developmental tabs, engagement metrics, and coach challenge integration
2. **CC-PAYMENT-DASHBOARD** — Org-wide financial view, cross-season/sport aggregate, exportable reports
3. **CC-REGISTRATION-PREVIEW-FIX** — Web admin fix to prevent previews from creating real data
4. **CC-GAME-RECAP-NARRATIVE** — AI-generated match write-ups (companion to Voice Stat Entry)
5. **CC-PARENT-HOME-REDESIGN** — Already specced, waiting in queue

### Data cleanup tasks (manual, not code):
- Delete test seasons ("Spring 2 2026", "Test Payment Season") if no longer needed
- Delete test player records created by registration preview
- Verify all user profiles have correct `onboarding_completed` values (run the audit query from Spec 1)
