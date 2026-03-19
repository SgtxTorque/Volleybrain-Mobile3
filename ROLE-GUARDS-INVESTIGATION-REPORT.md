# ROLE-GUARDS-INVESTIGATION-REPORT.md
# Role Guards Audit for Unguarded Screens

**Investigator:** Claude Opus 4.6
**Date:** 2026-03-18
**Branch:** `navigation-cleanup-complete`
**Source:** AUDIT-REPORT-05, Finding NAV-04

---

## 1. EXISTING GUARD PATTERNS

Five distinct guard patterns exist in the codebase today. All check `isAdmin` only (no coach/TM guards exist yet).

### Pattern A — Early Guard with Themed Fallback UI (PREFERRED)

Used by: `users.tsx`, `team-management.tsx`, `season-settings.tsx`, `payment-reminders.tsx`, `registration-hub.tsx`

```typescript
// app/users.tsx:49-66
const { isAdmin } = usePermissions();
const router = useRouter();

if (!isAdmin) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 }}>
      <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
      <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 18, color: colors.text }}>Access Restricted</Text>
      <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
        Admin permissions required.
      </Text>
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
        <Text style={{ fontFamily: FONTS.bodySemiBold, color: '#0EA5E9', fontSize: 15 }}>Go Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
```

**Characteristics:**
- Guard is placed BEFORE `useState` declarations (early return)
- Uses themed `colors.*` or `BRAND.*` constants
- Shows lock icon + "Access Restricted" message + "Go Back" button
- `router.back()` for navigation

### Pattern B — Late Guard with Plain Fallback

Used by: `org-settings.tsx`, `admin-search.tsx`, `season-setup-wizard.tsx`, `bulk-event-create.tsx`, `coach-background-checks.tsx`, `season-reports.tsx`, `(tabs)/admin-teams.tsx`, `(tabs)/jersey-management.tsx`

```typescript
// app/org-settings.tsx:136-145
if (!isAdmin) {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 16, color: '#666' }}>Access restricted to administrators.</Text>
      <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
        <Text style={{ fontSize: 14, color: '#4BB9EC', marginTop: 12 }}>Go Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
```

**Characteristics:**
- Guard is placed AFTER `useState` declarations and helper functions (late return)
- Uses hardcoded colors (`#666`, `#4BB9EC`)
- Plain text, no lock icon
- `router.replace('/(tabs)')` instead of `router.back()`

### Pattern C — Tab Guard with Lock Icon

Used by: `(tabs)/manage.tsx`

```typescript
// app/(tabs)/manage.tsx:310-319
if (!isAdmin) {
  return (
    <SafeAreaView style={s.container}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Ionicons name="lock-closed" size={48} color={colors.textMuted} />
        <Text style={[s.sectionTitle, { textAlign: 'center', marginTop: 16 }]}>Admin access required</Text>
      </View>
    </SafeAreaView>
  );
}
```

**Characteristics:**
- Uses stylesheet-based styling (`s.container`, `s.sectionTitle`)
- Lock icon (filled, not outline) with "Admin access required"
- No navigation button (user stays on the tab and can switch tabs)

### RECOMMENDED PATTERN FOR NEW GUARDS

Use **Pattern A** with the following modifications:
- Make the message role-aware (e.g., "Coach or admin access required" instead of always "Admin permissions required")
- Always place the guard EARLY (before `useState`)
- Use `router.replace('/(tabs)')` for auto-redirect (preferred over showing a static fallback for deep-link scenarios)

```typescript
import { usePermissions } from '@/lib/permissions-context';
import { useRouter } from 'expo-router';

export default function SomeScreen() {
  const { isAdmin, isCoach, loading } = usePermissions();
  const router = useRouter();
  const { colors } = useTheme();

  if (loading) return null;

  if (!isAdmin && !isCoach) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 }}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 18, color: colors.text }}>Access Restricted</Text>
        <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
          Coach or admin permissions required.
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: FONTS.bodySemiBold, color: '#0EA5E9', fontSize: 15 }}>Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ... rest of screen
}
```

---

## 2. SCREEN-BY-SCREEN ANALYSIS

### 2.1 — Original NAV-04 List (Screens 1–23)

---

### 1. `app/game-day-command.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full Game Day Command Center renders — 4-page workflow (Game Prep, Live Match, End Set, Summary). Parent/player would see lineup management, live scoring controls, and all game data.
**Required role(s):** Coach + Admin
**Guard needed?** YES
**Priority:** HIGH — exposes full game management controls
**Recommended guard pattern:** `if (!isAdmin && !isCoach) { router.replace('/(tabs)'); return null; }`
**Push notification routed?** YES — `game`/`game_reminder` notifications route to `/game-prep` which redirects here for coach/admin. The notification handler already role-gates (only coaches/admins get routed here), but the screen itself has no guard.

---

### 2. `app/lineup-builder.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full lineup builder renders — shows roster, formation picker, drag-and-drop court positions. Parent/player sees all player positions and lineup strategy.
**Required role(s):** Coach + Admin
**Guard needed?** YES
**Priority:** HIGH — exposes team strategy and player positioning
**Recommended guard pattern:** `if (!isAdmin && !isCoach) { ... }`

---

### 3. `app/evaluation-session.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full evaluation session setup renders — pick evaluation type, select players, launch evaluation. Parent/player could initiate and submit player evaluations.
**Required role(s):** Coach + Admin
**Guard needed?** YES
**Priority:** HIGH — allows creating/modifying player evaluations
**Recommended guard pattern:** `if (!isAdmin && !isCoach) { ... }`

---

### 4. `app/blast-composer.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full blast message composer renders — type, title, body, audience selector, send button. Parent/player could compose and send organization-wide blast messages.
**Required role(s):** Coach + Admin + Team Manager
**Guard needed?** YES
**Priority:** HIGH — allows sending mass communications on behalf of the org
**Recommended guard pattern:** `if (!isAdmin && !isCoach && !isTeamManager) { ... }`

---

### 5. `app/blast-history.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full blast history renders — shows all sent blasts, recipient details (names, emails), read/acknowledge status. Parent/player can see all recipients' contact info.
**Required role(s):** Coach + Admin + Team Manager
**Guard needed?** YES
**Priority:** HIGH — exposes recipient contact information and communication history
**Recommended guard pattern:** `if (!isAdmin && !isCoach && !isTeamManager) { ... }`

---

### 6. `app/registration-hub.tsx`

**Imports usePermissions?** YES
**Checks role flags?** YES — `isAdmin` at line 176
**Current behavior for unauthorized user:** Shows "Access Restricted" fallback with lock icon and "Go Back" button.
**Required role(s):** Admin
**Guard needed?** NO — already guarded
**Guard pattern:** Pattern A (early guard, themed fallback)

---

### 7. `app/payment-reminders.tsx`

**Imports usePermissions?** YES
**Checks role flags?** YES — `isAdmin` at line 51
**Current behavior for unauthorized user:** Shows "Access Restricted" fallback with lock icon and "Go Back" button.
**Required role(s):** Admin
**Guard needed?** NO — already guarded
**Guard pattern:** Pattern A (early guard, themed fallback)

---

### 8. `app/team-management.tsx`

**Imports usePermissions?** YES
**Checks role flags?** YES — `isAdmin` at line 63
**Current behavior for unauthorized user:** Shows "Access Restricted" fallback with lock icon and "Go Back" button.
**Required role(s):** Admin
**Guard needed?** NO — already guarded
**Guard pattern:** Pattern A (early guard, themed fallback)

---

### 9. `app/season-settings.tsx`

**Imports usePermissions?** YES
**Checks role flags?** YES — `isAdmin` at line 86
**Current behavior for unauthorized user:** Shows "Access Restricted" fallback with lock icon and "Go Back" button.
**Required role(s):** Admin
**Guard needed?** NO — already guarded
**Guard pattern:** Pattern A (early guard, themed fallback)

---

### 10. `app/season-setup-wizard.tsx`

**Imports usePermissions?** YES
**Checks role flags?** YES — `isAdmin` at line 260
**Current behavior for unauthorized user:** Shows plain "Access restricted to administrators" text with "Go Home" link.
**Required role(s):** Admin
**Guard needed?** NO — already guarded
**Guard pattern:** Pattern B (late guard, plain fallback)

---

### 11. `app/coach-challenge-dashboard.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full coach challenge dashboard renders — challenge stats, verification queue, active/completed challenges. Parent/player can see pending verifications, approve/reject challenge completions.
**Required role(s):** Coach + Admin
**Guard needed?** YES
**Priority:** HIGH — allows verifying/rejecting challenge completions
**Recommended guard pattern:** `if (!isAdmin && !isCoach) { ... }`
**Push notification routed?** YES — `challenge_*` notifications route here for coach/admin. Notification handler role-gates, but screen has no guard.

---

### 12. `app/challenge-library.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full challenge template library renders — browse templates, filter by category, launch challenge creation. Parent/player could select a template and navigate to `/create-challenge`.
**Required role(s):** Coach + Admin
**Guard needed?** YES
**Priority:** MEDIUM — browsing templates is low risk but links to unguarded create flow
**Recommended guard pattern:** `if (!isAdmin && !isCoach) { ... }`

---

### 13. `app/coach-availability.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Coach availability calendar renders. Uses `useAuth()` to find the current user's coach record. A parent/player would see loading then an empty/error state because they have no coach record in the `coaches` table. **However**, the screen does not explicitly handle this case — it could show a broken UI.
**Required role(s):** Coach
**Guard needed?** YES
**Priority:** LOW — data is self-scoped (only the current user's availability), but UX is broken for non-coaches
**Recommended guard pattern:** `if (!isAdmin && !isCoach) { ... }`

---

### 14. `app/coach-profile.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Coach profile editor renders. Uses `useAuth()` to find the current user's coach record. A parent/player with no coach record would see loading then empty state.
**Required role(s):** Coach (+ Admin for viewing other coaches)
**Guard needed?** YES
**Priority:** LOW — data is self-scoped, but UX is broken for non-coaches
**Recommended guard pattern:** `if (!isAdmin && !isCoach) { ... }`

---

### 15. `app/coach-directory.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full coach directory renders — all coaches with names, email, phone, experience, specialties, status, background check status. Parent/player sees all coach contact information.
**Required role(s):** Admin
**Guard needed?** YES
**Priority:** HIGH — exposes all coaches' personal contact information (PII)
**Recommended guard pattern:** `if (!isAdmin) { ... }`

---

### 16. `app/coach-background-checks.tsx`

**Imports usePermissions?** YES
**Checks role flags?** YES — `isAdmin` at line 287
**Current behavior for unauthorized user:** Shows plain "Access restricted to administrators" text with "Go Home" link.
**Required role(s):** Admin
**Guard needed?** NO — already guarded
**Guard pattern:** Pattern B (late guard, plain fallback)

---

### 17. `app/venue-manager.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** "Coming Soon" placeholder renders — shows mascot image, "Coming Soon" title, message about web dashboard. No sensitive data exposed.
**Required role(s):** Admin
**Guard needed?** YES (but LOW priority — no data exposure)
**Priority:** LOW — placeholder only, no sensitive data
**Recommended guard pattern:** `if (!isAdmin) { ... }`

---

### 18. `app/org-settings.tsx`

**Imports usePermissions?** YES
**Checks role flags?** YES — `isAdmin` at line 136
**Current behavior for unauthorized user:** Shows "Access restricted to administrators" with "Go Home" link.
**Required role(s):** Admin
**Guard needed?** NO — already guarded
**Guard pattern:** Pattern B (late guard, plain fallback)

---

### 19. `app/admin-search.tsx`

**Imports usePermissions?** YES
**Checks role flags?** YES — `isAdmin` at line 221
**Current behavior for unauthorized user:** Shows "Access restricted to administrators" with "Go Home" link.
**Required role(s):** Admin
**Guard needed?** NO — already guarded
**Guard pattern:** Pattern B (late guard, plain fallback)

---

### 20. `app/bulk-event-create.tsx`

**Imports usePermissions?** YES
**Checks role flags?** YES — `isAdmin` at line 299
**Current behavior for unauthorized user:** Shows "Access restricted to administrators" with "Go Home" link.
**Required role(s):** Admin
**Guard needed?** NO — already guarded
**Guard pattern:** Pattern B (late guard, plain fallback)

---

### 21. `app/volunteer-assignment.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full 3-step volunteer assignment flow renders — event selection, role assignment, confirmation + notification. Parent/player could assign volunteer roles to other parents.
**Required role(s):** Coach + Admin + Team Manager
**Guard needed?** YES
**Priority:** MEDIUM — allows modifying volunteer assignments
**Recommended guard pattern:** `if (!isAdmin && !isCoach && !isTeamManager) { ... }`

---

### 22. `app/game-prep-wizard.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full 3-step game prep wizard renders — game selection, RSVP review, lineup management. Parent/player sees game prep controls and player RSVP statuses.
**Required role(s):** Coach + Admin
**Guard needed?** YES
**Priority:** HIGH — exposes RSVP data and game management controls
**Recommended guard pattern:** `if (!isAdmin && !isCoach) { ... }`
**Push notification routed?** YES — `/game-prep` redirects here for coach/admin on `game`/`game_reminder` notifications.

---

### 23. `app/attendance.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full attendance tracking screen renders — event picker, player roster with attendance toggles. Parent/player could view and modify attendance records.
**Required role(s):** Coach + Admin (+ Team Manager per drawer config)
**Guard needed?** YES
**Priority:** HIGH — allows modifying attendance records
**Recommended guard pattern:** `if (!isAdmin && !isCoach && !isTeamManager) { ... }`

---

### 2.2 — Additional Screens (Screens 24–35)

---

### 24. `app/(tabs)/coaches.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full coach management screen renders — lists all coaches with email, phone, experience, specialties. Includes "Create Coach" form with name, email, phone fields. Parent/player can see all coach PII and could create coach records.
**Required role(s):** Admin
**Guard needed?** YES
**Priority:** CRITICAL — exposes all coach PII and allows creating coach records
**Recommended guard pattern:** `if (!isAdmin) { ... }`

---

### 25. `app/users.tsx`

**Imports usePermissions?** YES
**Checks role flags?** YES — `isAdmin` at line 53
**Current behavior for unauthorized user:** Shows "Access Restricted" fallback with lock icon and "Go Back" button.
**Required role(s):** Admin
**Guard needed?** NO — already guarded
**Guard pattern:** Pattern A (early guard, themed fallback)

---

### 26. `app/game-results.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full game results screen renders — scores, set scores, player stats, share functionality. Has both coach view (editing) and parent view (read-only), but without permission checks the view is determined by which components load, not by role. A parent could theoretically see admin-level game data.
**Required role(s):** Any authenticated (read), Coach + Admin (edit)
**Guard needed?** PARTIAL — needs role-aware rendering, not a full block. The screen should import `usePermissions` to conditionally show/hide edit controls.
**Priority:** MEDIUM — read access is generally OK, but edit controls should be hidden
**Recommended guard pattern:** Import `usePermissions`, hide edit controls for non-coach/admin

---

### 27. `app/player-evaluations.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full swipe-through player evaluation screen renders — 9-skill rating form (1-5 blocks), per-player notes, submit to DB. Parent/player could rate and submit evaluations for any player.
**Required role(s):** Coach + Admin
**Guard needed?** YES
**Priority:** CRITICAL — allows submitting official player skill evaluations to the database
**Recommended guard pattern:** `if (!isAdmin && !isCoach) { ... }`

---

### 28. `app/player-evaluation.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full courtside skill rating screen renders — 9-skill form (1-10 scale), per-skill notes, summary + submit. Writes to `player_skill_ratings` table. Parent/player could modify any player's skill ratings.
**Required role(s):** Coach + Admin
**Guard needed?** YES
**Priority:** CRITICAL — allows modifying player skill ratings in the database
**Recommended guard pattern:** `if (!isAdmin && !isCoach) { ... }`

---

### 29. `app/player-goals.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full player goals management screen renders — create, edit, delete goals for any player. Shows coach notes (including private notes). Parent/player could create/modify goals and see private coach notes.
**Required role(s):** Coach + Admin
**Guard needed?** YES
**Priority:** CRITICAL — exposes private coach notes and allows modifying player goals
**Recommended guard pattern:** `if (!isAdmin && !isCoach) { ... }`

---

### 30. `app/season-archives.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Season archives screen renders — shows past seasons with stats (team count, player count, game count, revenue collected/total). Expandable detail view shows teams, games, standings.
**Required role(s):** Any authenticated — listed in "Settings & Privacy" section of drawer for ALL roles
**Guard needed?** NO — intentionally accessible to all roles per drawer configuration. Revenue data could be considered sensitive, but this is a design decision, not a security gap.

---

### 31. `app/season-reports.tsx`

**Imports usePermissions?** YES
**Checks role flags?** YES — `isAdmin` at line 182
**Current behavior for unauthorized user:** Shows "Access restricted to administrators" with "Go Home" link.
**Required role(s):** Admin
**Guard needed?** NO — already guarded
**Guard pattern:** Pattern B (late guard, plain fallback)

---

### 32. `app/(tabs)/jersey-management.tsx`

**Imports usePermissions?** YES
**Checks role flags?** YES — `isAdmin` at line 326
**Current behavior for unauthorized user:** Shows "Access restricted to administrators" with "Go Home" link.
**Required role(s):** Admin
**Guard needed?** NO — already guarded
**Guard pattern:** Pattern B (late guard, plain fallback)

---

### 33. `app/web-features.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Placeholder "Coming Soon" screen renders — shows mascot, feature list, "Open Web Portal" link. No sensitive data. Listed under Admin Tools in drawer but the screen itself has no guard.
**Required role(s):** Admin (per drawer placement)
**Guard needed?** YES (LOW priority)
**Priority:** LOW — no sensitive data, purely informational placeholder
**Recommended guard pattern:** `if (!isAdmin) { ... }`

---

### 34. `app/report-viewer.tsx`

**Imports usePermissions?** NO (re-exports `components/ReportViewerScreen.tsx` which also has no guard)
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full report viewer renders — fetches and displays report data from Supabase (registration lists, outstanding balances, jersey conflicts, team rosters, etc.). Parent/player can view all admin-level reports.
**Required role(s):** Admin
**Guard needed?** YES
**Priority:** HIGH — exposes admin-level report data including financial and roster information
**Recommended guard pattern:** `if (!isAdmin) { ... }` — add guard in `components/ReportViewerScreen.tsx`

---

### 35. `app/season-progress.tsx`

**Imports usePermissions?** NO
**Checks role flags?** NO
**Current behavior for unauthorized user:** Season progress timeline renders — shows milestones, badges, game history for a player. Uses `playerId` param or falls back to current user.
**Required role(s):** Any authenticated — listed in "My Stuff" section for players
**Guard needed?** NO — player-facing feature, data is scoped to the specified player. Accessible to all roles by design.

---

### ADDITIONAL SCREENS FOUND (not in original list)

### `app/(tabs)/reports-tab.tsx`

**Imports usePermissions?** NO (re-exports `components/ReportsScreen.tsx` which also has no guard)
**Checks role flags?** NO
**Current behavior for unauthorized user:** Full reports landing page renders — shows report categories and links to individual reports via `/report-viewer`.
**Required role(s):** Admin
**Guard needed?** YES
**Priority:** HIGH — gateway to all admin reports
**Recommended guard pattern:** Add guard in `components/ReportsScreen.tsx`

---

### `app/(tabs)/admin-schedule.tsx`

**Imports usePermissions?** NO (re-exports `./coach-schedule.tsx`)
**Checks role flags?** NO — `coach-schedule.tsx` imports `usePermissions` but uses it for conditional rendering only, not as a guard
**Current behavior for unauthorized user:** Full schedule management screen renders — event list, create/edit/delete events.
**Required role(s):** Admin
**Guard needed?** DEBATABLE — the tab is `href: null` and only accessible via drawer (admin section). The underlying `coach-schedule` is shared with coaches and TMs. Adding an admin-only guard here would break coach access to the same underlying component. No guard needed at this route.

---

### `app/(tabs)/coach-roster.tsx`

**Imports usePermissions?** NO (re-exports `./players.tsx`)
**Checks role flags?** NO — `players.tsx` imports `usePermissions` but uses it for conditional rendering only, not as a guard
**Current behavior for unauthorized user:** Full roster management screen renders — player list with jersey numbers, positions, photos.
**Required role(s):** Coach + Admin
**Guard needed?** DEBATABLE — the tab is `href: null` and only accessible via drawer. The underlying `players.tsx` is accessible to coaches and admins via other routes. The data shown (player roster) is generally visible in other areas of the app (gameday, etc.). Low risk.

---

## 3. SUMMARY TABLE

| # | Screen | Has Guard? | Required Role | Priority | Notes |
|---|--------|-----------|---------------|----------|-------|
| 1 | `app/game-day-command.tsx` | NO | Coach+Admin | HIGH | Full game mgmt controls |
| 2 | `app/lineup-builder.tsx` | NO | Coach+Admin | HIGH | Exposes team strategy |
| 3 | `app/evaluation-session.tsx` | NO | Coach+Admin | HIGH | Can initiate evaluations |
| 4 | `app/blast-composer.tsx` | NO | Coach+Admin+TM | HIGH | Can send mass comms |
| 5 | `app/blast-history.tsx` | NO | Coach+Admin+TM | HIGH | Exposes recipient PII |
| 6 | `app/registration-hub.tsx` | YES | Admin | — | Already guarded |
| 7 | `app/payment-reminders.tsx` | YES | Admin | — | Already guarded |
| 8 | `app/team-management.tsx` | YES | Admin | — | Already guarded |
| 9 | `app/season-settings.tsx` | YES | Admin | — | Already guarded |
| 10 | `app/season-setup-wizard.tsx` | YES | Admin | — | Already guarded |
| 11 | `app/coach-challenge-dashboard.tsx` | NO | Coach+Admin | HIGH | Can verify/reject challenges |
| 12 | `app/challenge-library.tsx` | NO | Coach+Admin | MEDIUM | Template browsing, links to create |
| 13 | `app/coach-availability.tsx` | NO | Coach | LOW | Self-scoped, broken UX for non-coaches |
| 14 | `app/coach-profile.tsx` | NO | Coach | LOW | Self-scoped, broken UX for non-coaches |
| 15 | `app/coach-directory.tsx` | NO | Admin | HIGH | Exposes all coach PII |
| 16 | `app/coach-background-checks.tsx` | YES | Admin | — | Already guarded |
| 17 | `app/venue-manager.tsx` | NO | Admin | LOW | Placeholder only |
| 18 | `app/org-settings.tsx` | YES | Admin | — | Already guarded |
| 19 | `app/admin-search.tsx` | YES | Admin | — | Already guarded |
| 20 | `app/bulk-event-create.tsx` | YES | Admin | — | Already guarded |
| 21 | `app/volunteer-assignment.tsx` | NO | Coach+Admin+TM | MEDIUM | Can modify volunteer roles |
| 22 | `app/game-prep-wizard.tsx` | NO | Coach+Admin | HIGH | RSVP data + game controls |
| 23 | `app/attendance.tsx` | NO | Coach+Admin+TM | HIGH | Can modify attendance |
| 24 | `app/(tabs)/coaches.tsx` | NO | Admin | **CRITICAL** | Coach PII + create form |
| 25 | `app/users.tsx` | YES | Admin | — | Already guarded |
| 26 | `app/game-results.tsx` | NO | Any (read) / Coach+Admin (edit) | MEDIUM | Needs role-aware rendering |
| 27 | `app/player-evaluations.tsx` | NO | Coach+Admin | **CRITICAL** | Can submit evaluations |
| 28 | `app/player-evaluation.tsx` | NO | Coach+Admin | **CRITICAL** | Can modify skill ratings |
| 29 | `app/player-goals.tsx` | NO | Coach+Admin | **CRITICAL** | Private notes + goal CRUD |
| 30 | `app/season-archives.tsx` | NO | Any | — | Intentionally open (all roles) |
| 31 | `app/season-reports.tsx` | YES | Admin | — | Already guarded |
| 32 | `app/(tabs)/jersey-management.tsx` | YES | Admin | — | Already guarded |
| 33 | `app/web-features.tsx` | NO | Admin | LOW | Placeholder, no data |
| 34 | `app/report-viewer.tsx` | NO | Admin | HIGH | Admin report data |
| 35 | `app/season-progress.tsx` | NO | Any | — | Player feature, intentionally open |
| — | `app/(tabs)/reports-tab.tsx` | NO | Admin | HIGH | Gateway to all reports |
| — | `app/(tabs)/admin-schedule.tsx` | NO | — | — | Re-export, no guard needed |
| — | `app/(tabs)/coach-roster.tsx` | NO | — | — | Re-export, low risk |

### Totals

| Status | Count |
|--------|-------|
| Already guarded | 14 |
| Guard needed — CRITICAL | 4 |
| Guard needed — HIGH | 10 |
| Guard needed — MEDIUM | 4 |
| Guard needed — LOW | 3 |
| No guard needed (role-agnostic) | 2 |
| No guard needed (re-export / shared) | 2 |
| **TOTAL SCREENS AUDITED** | **39** |
| **TOTAL NEEDING GUARDS** | **21** |

---

## 4. EXECUTION PLAN

### Wave 1 — CRITICAL (4 screens, PII + data writes)

These screens allow unauthorized data modification or expose PII. Fix immediately.

| Screen | Guard | Message |
|--------|-------|---------|
| `app/(tabs)/coaches.tsx` | `!isAdmin` | "Admin permissions required." |
| `app/player-evaluations.tsx` | `!isAdmin && !isCoach` | "Coach or admin permissions required." |
| `app/player-evaluation.tsx` | `!isAdmin && !isCoach` | "Coach or admin permissions required." |
| `app/player-goals.tsx` | `!isAdmin && !isCoach` | "Coach or admin permissions required." |

**Imports needed:** `usePermissions` from `@/lib/permissions-context`, `useTheme` from `@/lib/theme`, `SafeAreaView`, `Ionicons`, `FONTS`

---

### Wave 2 — HIGH (10 screens, operational controls + data exposure)

These screens expose sensitive operational data or allow modifications.

| Screen | Guard | Message |
|--------|-------|---------|
| `app/game-day-command.tsx` | `!isAdmin && !isCoach` | "Coach or admin permissions required." |
| `app/lineup-builder.tsx` | `!isAdmin && !isCoach` | "Coach or admin permissions required." |
| `app/evaluation-session.tsx` | `!isAdmin && !isCoach` | "Coach or admin permissions required." |
| `app/blast-composer.tsx` | `!isAdmin && !isCoach && !isTeamManager` | "Staff permissions required." |
| `app/blast-history.tsx` | `!isAdmin && !isCoach && !isTeamManager` | "Staff permissions required." |
| `app/coach-challenge-dashboard.tsx` | `!isAdmin && !isCoach` | "Coach or admin permissions required." |
| `app/game-prep-wizard.tsx` | `!isAdmin && !isCoach` | "Coach or admin permissions required." |
| `app/attendance.tsx` | `!isAdmin && !isCoach && !isTeamManager` | "Staff permissions required." |
| `app/coach-directory.tsx` | `!isAdmin` | "Admin permissions required." |
| `app/report-viewer.tsx` | `!isAdmin` | "Admin permissions required." (in `components/ReportViewerScreen.tsx`) |
| `app/(tabs)/reports-tab.tsx` | `!isAdmin` | "Admin permissions required." (in `components/ReportsScreen.tsx`) |

**Note:** `report-viewer.tsx` and `reports-tab.tsx` are thin re-export wrappers. The guard must be added to `components/ReportViewerScreen.tsx` and `components/ReportsScreen.tsx` respectively.

---

### Wave 3 — MEDIUM (4 screens, lower-risk operational)

| Screen | Guard | Message |
|--------|-------|---------|
| `app/challenge-library.tsx` | `!isAdmin && !isCoach` | "Coach or admin permissions required." |
| `app/volunteer-assignment.tsx` | `!isAdmin && !isCoach && !isTeamManager` | "Staff permissions required." |
| `app/game-results.tsx` | No block — add `usePermissions` + conditionally hide edit controls for `!isAdmin && !isCoach` | — |

**Note:** `game-results.tsx` should NOT fully block parents/players — they may legitimately view game scores. Instead, import `usePermissions` and conditionally hide editing controls.

---

### Wave 4 — LOW (3 screens, cosmetic / self-scoped)

| Screen | Guard | Message |
|--------|-------|---------|
| `app/coach-availability.tsx` | `!isAdmin && !isCoach` | "Coach or admin permissions required." |
| `app/coach-profile.tsx` | `!isAdmin && !isCoach` | "Coach or admin permissions required." |
| `app/venue-manager.tsx` | `!isAdmin` | "Admin permissions required." |
| `app/web-features.tsx` | `!isAdmin` | "Admin permissions required." |

---

### NO ACTION NEEDED

| Screen | Reason |
|--------|--------|
| `app/season-archives.tsx` | Intentionally accessible to all roles (drawer: "Settings & Privacy") |
| `app/season-progress.tsx` | Player feature, intentionally accessible to all roles |
| `app/(tabs)/admin-schedule.tsx` | Re-exports `coach-schedule.tsx`, shared component for admin+coach+TM |
| `app/(tabs)/coach-roster.tsx` | Re-exports `players.tsx`, shared component for admin+coach |

---

## 5. ADDITIONAL FINDINGS

### 5A. Drawer-Only Gating (Deep Link Bypass Vulnerable)

The `GestureDrawer.tsx` component role-gates menu items by section (Admin Tools, Game Day, Coaching Tools, etc.). However, this is a **UI-only gate** — the menu items are hidden but the screen routes are still accessible via:
- Deep links: `lynx://game-day-command`, `lynx://blast-composer`, etc.
- Browser URL on web
- Push notification routing (for some screens)

**Every screen listed as "Guard needed" above is vulnerable to deep link bypass.**

### 5B. Push Notification Routes to Unguarded Screens

From `app/_layout.tsx` lines 96-163:

| Notification Type | Routes To (Coach/Admin) | Guarded? |
|------------------|------------------------|----------|
| `game` / `game_reminder` | `/game-prep` → `/game-prep-wizard` | NO |
| `challenge_*` | `/coach-challenge-dashboard` | NO |
| `registration` | `/registration-hub` | YES |

The notification handler does role-check before routing (e.g., only coaches/admins get `/game-prep`), but this is an **insufficient guard** because:
1. A future code change could break the notification routing role check
2. The screen itself should be self-defending regardless of how it's navigated to

### 5C. Inconsistent Guard Placement

Of the 14 already-guarded screens:
- **5 screens** use Pattern A (early guard, before `useState`) — `users`, `team-management`, `season-settings`, `payment-reminders`, `registration-hub`
- **9 screens** use Pattern B (late guard, after `useState` and helper functions) — `org-settings`, `admin-search`, `season-setup-wizard`, `bulk-event-create`, `coach-background-checks`, `season-reports`, `admin-teams`, `jersey-management`, `manage`

Pattern B screens still call `useState` and define functions before the guard check. While this doesn't cause a security issue (the component still returns the fallback), it does unnecessary work for unauthorized users. **Recommendation:** Standardize all guards to Pattern A (early return) during the guard implementation PR.

### 5D. No Loading State in Guards

None of the existing guards check `loading` from `usePermissions()`. The `loading` state is briefly `true` while permissions are being fetched. During this window:
- The component renders without role flags set (all `false`)
- The guard triggers immediately, showing "Access Restricted" to ALL users briefly
- Once loading completes, the component re-renders with correct role flags

This creates a flash of "Access Restricted" for legitimate admin/coach users. **Recommendation:** Add `if (loading) return null;` before the role check in all guards.

---

## COMMIT PROTOCOL

This file: `ROLE-GUARDS-INVESTIGATION-REPORT.md`
Commit message: `investigation: role guards audit for unguarded screens`
No other files modified.
