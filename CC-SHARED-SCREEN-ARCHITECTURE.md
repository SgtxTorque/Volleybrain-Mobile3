# CC-SHARED-SCREEN-ARCHITECTURE.md
## Lynx Mobile — Shared Screen Architecture Reference
## Date: March 13, 2026
## Status: REFERENCE DOCUMENT — Do not execute directly

---

## Purpose

This document defines the target architecture for shared screens in Lynx Mobile. It replaces the current pattern of duplicate role-specific screen files with a single-screen, role-layered approach.

**This is a reference document, not an execution spec.** CC should read this to understand the intended architecture before executing any consolidation spec. Individual CC specs will reference this document and instruct which specific changes to make.

**This architecture is an intentional design decision.** It supersedes the duplicate-screen pattern found in the navigation audit (AUDIT-GLOSSARY.md, March 2026). Consolidation to shared screens is planned evolution, not drift. It does not conflict with the principles in CC-PROJECT-CONTEXT.md — it refines them.

---

## The Three-Layer Rule

Every shared screen in Lynx follows three role-aware layers. The screen template is one file. The behavior adapts by role.

### Layer 1 — What You See (Data Query)

The Supabase query filters data by the user's role and relationships.

Example: Chat screen. A parent sees channels for their child's teams. A coach sees channels for their coached teams plus coach-only channels. An admin sees all org channels.

The screen layout is identical. The data is scoped.

### Layer 2 — What You Can Do (Action Permissions)

Action buttons, FABs, and interactive elements are conditionally rendered based on role.

Example: Chat screen. A parent sees "New DM." A coach sees "New DM, New Channel, Send Blast." An admin sees all options plus "Browse All Channels."

The UI elements show/hide based on `usePermissions()`.

### Layer 3 — How Deep You Can Go (Navigation Permissions)

Outbound navigation links are role-gated. Same screen, different destinations available.

Example: Roster screen. A coach taps a player → navigates to Player Detail. A player taps a teammate → navigates to Player Card (public view). A parent taps their child → Player Detail. A parent taps someone else's child → Player Card.

The tap target exists for everyone. The destination varies by role + relationship.

---

## Screen Consolidation Map

Below is the target state for every screen cluster identified in the audit. Each entry defines: what the single screen is, what each role sees/does/navigates to, which current files merge into it, and which files get deleted.

---

### 1. CHAT

**Target: 1 screen — `app/(tabs)/chats.tsx`**

| Layer | Parent | Coach | Admin | Player |
|-------|--------|-------|-------|--------|
| **Sees** | Channels for child's teams + DMs | Channels for coached teams + coach channels + DMs | All org channels + DMs | Channels for their team + DMs |
| **Can do** | New DM | New DM, New Channel, Send Blast | New DM, New Channel, Send Blast, Browse All | New DM |
| **Navigates to** | `/chat/[id]` | `/chat/[id]`, `/blast-composer` (from FAB) | `/chat/[id]`, `/blast-composer` | `/chat/[id]` |

**Merge into `chats.tsx`:**
- FAB logic from `coach-chat.tsx` (expanded FAB with Blast, Channel, DM options)
- Backport the N+1 query fix from `coach-chat.tsx` (batched channel member loading)
- Role check: `const { isAdmin, isCoach } = usePermissions()` controls FAB options

**Delete after merge:**
- `app/(tabs)/coach-chat.tsx` (1,100 lines)
- `app/(tabs)/parent-chat.tsx` (931 lines)
- `app/(tabs)/admin-chat.tsx` (2 lines — re-export)

**Conversation screen unchanged:** `app/chat/[id].tsx` stays as-is. Everyone uses the same conversation view.

**Query scoping approach:** Filter `chat_channels` by membership. The existing `chat_channel_members` table already scopes channels to users. No new query logic needed — just ensure all role-specific query variations use the same membership-based filter pattern.

---

### 2. SCHEDULE

**Target: 2 screens — read/RSVP schedule + manage/create schedule**

Schedule is the one exception where 1 screen would be too cluttered. RSVP and event creation are fundamentally different interaction models.

#### Screen A: Read & RSVP Schedule
**Base file:** `app/(tabs)/parent-schedule.tsx` (rename to `app/(tabs)/schedule-view.tsx` or keep as-is)

| Layer | Parent | Player |
|-------|--------|--------|
| **Sees** | Events for child's teams, filtered by child | Events for their team |
| **Can do** | RSVP per child (Yes/No/Maybe) | RSVP for self |
| **Navigates to** | Event detail | Event detail |

#### Screen B: Manage & Create Schedule
**Base file:** `app/(tabs)/coach-schedule.tsx` (rename to `app/(tabs)/schedule-manage.tsx` or keep as-is)

| Layer | Coach | Admin |
|-------|-------|-------|
| **Sees** | Events for coached teams with team filter | All org events with team filter |
| **Can do** | Create event, edit event, bulk create | Create event, edit event, bulk create, delete |
| **Navigates to** | Event detail, game-prep-wizard | Event detail, game-prep-wizard |

**Delete after consolidation:**
- `app/(tabs)/schedule.tsx` (generic — replaced by the two above)
- `app/(tabs)/admin-schedule.tsx` (3 lines — re-export of coach-schedule)

**Drawer routing:** Schedule item routes by role:
- Parent → schedule-view (RSVP screen)
- Player → schedule-view (RSVP screen)
- Coach → schedule-manage (creation screen)
- Admin → schedule-manage (creation screen)

---

### 3. ROSTER

**Target: 1 screen — `app/(tabs)/players.tsx`**

| Layer | Coach | Admin | Parent | Player |
|-------|-------|-------|--------|--------|
| **Sees** | Players on coached teams (team filter) | All players in org (team filter) | Players on child's team | Players on their team |
| **Can do** | View roster, filter by team | View roster, filter by team, manage roster | View roster | View roster |
| **Navigates to** | Tap player → `/child-detail?playerId={id}` | Tap player → `/child-detail?playerId={id}` | Tap own child → `/child-detail?playerId={id}`, Tap other player → `/player-card?playerId={id}` | Tap self → `/player-card`, Tap teammate → `/player-card?playerId={id}` |

**Merge into `players.tsx`:**
- Add `onPress` handler to player items (currently missing — this is the dead-end fix)
- Add view mode toggle: grid / list (from existing `roster.tsx` carousel concept)
- Role-based navigation logic in the `onPress` handler
- Team filter from `team-roster.tsx`

**Delete after merge:**
- `app/roster.tsx` (264 lines — standalone, no outbound nav)
- `app/(tabs)/coach-roster.tsx` (7 lines — re-export)
- `app/team-roster.tsx` (150 lines — features merged in)

---

### 4. PLAYER CARD vs PLAYER DETAIL

These are intentionally TWO separate screens with different purposes. They are NOT consolidated into one.

#### Player Card — `app/player-card.tsx`
**Purpose:** The public, fun, shareable view. Like a baseball card or FIFA Ultimate Team card.

| Attribute | Detail |
|-----------|--------|
| **Who sees it** | Everyone on the team. Coaches, players, parents, admins. |
| **Content** | Photo, name, jersey number, position, team, OVR rating, level/XP, top 3 stats, recent badges. |
| **Feeling** | Pride, celebration, identity. The Momentum Engine surface. |
| **Interaction** | View only. No editing. Optional share button. |
| **Navigation inbound** | Roster tap (for non-stakeholders), standings leaderboard tap, drawer "My Player Card" (player only), PlayerHomeScroll link (to be added). |

#### Player Detail — `app/child-detail.tsx`
**Purpose:** The operational, private view. The full record.

| Attribute | Detail |
|-----------|--------|
| **Who sees it** | Parents of the player, coaches of the player's team, admins. NOT other players or other parents. |
| **Content** | Season stats table, game-by-game breakdown, coach evaluations (skill ratings, written notes), attendance %, registration status, payment status, waivers signed, emergency contacts, medical notes. |
| **Feeling** | Informed, in control. The Mission Control surface. |
| **Interaction** | View for parents. View + evaluate for coaches. View + manage for admins. |
| **Navigation inbound** | Roster tap (for stakeholders), parent home athlete card tap, my-kids child tap (to be added), coach-my-stuff team-roster tap. |

**The bridge between them:** Player Detail should have a "View Player Card" button that navigates to `/player-card?playerId={id}`. Player Card does NOT link to Player Detail (non-stakeholders shouldn't be able to reach it).

**Navigation permission rule for roster tap:**
```
if (viewer is coach/admin of this team) → Player Detail
else if (viewer is parent of this player) → Player Detail
else → Player Card
```

---

### 5. TEAM HUB

**Target: 1 screen — `app/(tabs)/connect.tsx`**

| Layer | Coach | Admin | Parent | Player |
|-------|-------|-------|--------|--------|
| **Sees** | Team wall posts, roster preview, photos, schedule preview for coached teams | All team content, all teams | Team content for child's team | Team content for their team |
| **Can do** | Post announcement, upload photo, give shoutout | All coach actions + moderate, delete | View, react, upload photo | View, react, upload photo, give shoutout |
| **Navigates to** | Post detail, roster, schedule, player profiles | Post detail, roster, schedule, management | Post detail, schedule, player cards | Post detail, roster, player cards |

**Delete after consolidation:**
- `app/(tabs)/coach-team-hub.tsx` (243 lines — orphaned)
- `app/(tabs)/parent-team-hub.tsx` (if exists as separate file — merge features)

**Team selection:** The screen already has team selection via `connect.tsx`. Keep this pattern — user picks their team, hub content filters accordingly.

---

### 6. GAME RESULTS & RECAP

**Target: 1 screen — `app/game-results.tsx` with tabs**

| Layer | Coach | Admin | Parent | Player |
|-------|-------|-------|--------|--------|
| **Sees** | Full stats + recap | Full stats + recap | Read-only stats + recap | Personal stats highlighted + recap |
| **Can do** | Enter/edit stats, generate recap | Enter/edit stats | View only | View only |
| **Navigates to** | Player detail from stats rows | Player detail from stats rows | Player card from stats rows | Player card from stats rows |

**Structure:** Two internal tabs within one screen:
- **Stats tab** — stat entry (coach/admin) or stat viewing (parent/player)
- **Recap tab** — shareable summary view with score, highlights, photos

**Delete after merge:**
- `app/game-recap.tsx` (features merged into recap tab)

---

### 7. GAME PREP

**Target: 1 screen — `app/game-prep-wizard.tsx` (rename to `app/game-prep.tsx`)**

| Layer | Coach | Admin |
|-------|-------|-------|
| **Sees** | Game prep wizard for their teams | Game prep wizard for all teams |
| **Can do** | Set lineup, review opponent, manage availability | Same as coach |

**Delete after consolidation:**
- `app/game-prep.tsx` (legacy, 1,924 lines — replaced by wizard)

**Rename:** `game-prep-wizard.tsx` → `game-prep.tsx` (takes over the route)

**All routes** currently pointing to `/game-prep` will automatically resolve to the new file. Routes pointing to `/game-prep-wizard` need updating to `/game-prep`.

---

### 8. PAYMENTS

**Target: 2 screens — these stay separate**

Payments is NOT consolidated into one screen. The parent payment experience (pay fees, view balances) and the admin payment experience (manage all payments, verify, send reminders) are fundamentally different workflows.

- **Parent payments:** `app/family-payments.tsx` → `components/payments-parent.tsx` (keep as-is)
- **Admin payments:** `app/(tabs)/payments.tsx` (keep as-is)

**The fix is routing, not consolidation.** Notification deep links and drawer items must route parents to `family-payments` and admins to `payments`. Currently both route to the admin screen.

---

### 9. REGISTRATION

**Target: 2 screens — these stay separate**

Same logic as payments. Parent registration (view status, start registration) and admin registration (approve, deny, manage) are different workflows.

- **Parent registration:** `app/parent-registration-hub.tsx` (keep as-is)
- **Admin registration:** `app/registration-hub.tsx` (keep as-is)

**The fix is routing.** Notification deep links must route parents to `parent-registration-hub`.

---

### 10. PROFILE / MY STUFF

**Target: Decision pending — options below**

The three `-my-stuff` screens (`parent-my-stuff.tsx`, `coach-my-stuff.tsx`, `admin-my-stuff.tsx`) are all orphaned. They contain useful features but no navigation reaches them.

**Option A — Wire them up:** Add drawer items for each role's -my-stuff screen. Pros: least code change. Cons: three separate screens to maintain.

**Option B — Consolidate into one:** Create a single `my-stuff.tsx` with role-conditional sections. Pros: one file, consistent pattern. Cons: larger refactor, the screens are quite different from each other.

**Option C — Redistribute features and delete:** Move each screen's unique features into existing accessible screens (home dashboards, profile, settings) and delete the orphans. Pros: no new screens to maintain. Cons: spreads features across more files.

**Decision: Option C — Redistribute and delete.** These screens contain valuable features (coach certifications, admin season management, parent waiver status) that should be accessible from existing screens. The -my-stuff pattern was an experiment that didn't get wired up — redistributing the features is cleaner than maintaining three more screens.

**Redistribution targets (to be defined in consolidation specs):**
- `parent-my-stuff.tsx` features → child cards to `my-kids.tsx`, payment summary to `family-payments.tsx`, waiver status to `my-waivers.tsx`
- `coach-my-stuff.tsx` features → team cards to team hub, certifications to `coach-profile.tsx`, team-roster navigation to unified roster
- `admin-my-stuff.tsx` features → season management to `season-settings.tsx`, financial overview to `manage.tsx`, invitation management to `registration-hub.tsx`

**After redistribution, delete:**
- `app/(tabs)/parent-my-stuff.tsx` (~400 lines)
- `app/(tabs)/coach-my-stuff.tsx` (715 lines)
- `app/(tabs)/admin-my-stuff.tsx` (873 lines)

---

### 11. DRAWER (GestureDrawer.tsx)

The drawer is not a screen to consolidate, but it IS the single file where most routing fixes live.

**Current state:** 8 sections, 50+ items, role gates on some sections.

**Target state after consolidation:**

| Section | Visible To | Items |
|---------|-----------|-------|
| **Quick Access** | All | Home, Schedule (role-routed), Chat, Team Hub |
| **Game Day** | Coach, Admin | Game Day Command, Lineup Builder, Attendance, Game Results |
| **Coaching Tools** | Coach, Admin | Player Evaluations, Challenges, Challenge Library, Blast Composer |
| **Admin Tools** | Admin | Registration Hub, User Management, Payments, Team Management, Season Management, Reports, Org Settings |
| **My Family** | Parent | My Children, Registration, Payments, Waivers, Evaluations |
| **My Stuff** | Player | My Stats, My Player Card, Challenges, Achievements, Season Progress |
| **Settings** | All | Profile, Settings, Notification Inbox, Privacy, Terms |

**Key changes from current:**
- "Schedule" in Quick Access becomes role-conditional (routes to correct schedule per role)
- "Announcements" removed from Quick Access (merged into chat or team hub)
- "Notifications" routes to `/notification` (inbox), not `/notification-preferences` (settings)
- Duplicate entries removed (Team Wall, Standings, Achievements appeared in multiple sections)
- "League & Community" section removed (items redistributed — Standings goes into relevant role sections, Coach Directory goes into admin/coaching sections)
- "Help & Support" collapsed into Settings
- Game Day items that require params should either pass context or route to an event picker

---

## Screens Deleted After Full Consolidation

| File | Lines | Reason |
|------|-------|--------|
| `app/(tabs)/coach-chat.tsx` | 1,100 | Merged into `chats.tsx` |
| `app/(tabs)/parent-chat.tsx` | 931 | Merged into `chats.tsx` |
| `app/(tabs)/admin-chat.tsx` | 2 | Re-export, deleted |
| `app/(tabs)/schedule.tsx` | ~800 | Replaced by schedule-view + schedule-manage |
| `app/(tabs)/admin-schedule.tsx` | 3 | Re-export, deleted |
| `app/roster.tsx` | 264 | Merged into `players.tsx` |
| `app/(tabs)/coach-roster.tsx` | 7 | Re-export, deleted |
| `app/team-roster.tsx` | 150 | Merged into `players.tsx` |
| `app/(tabs)/coach-team-hub.tsx` | 243 | Merged into `connect.tsx` |
| `app/game-recap.tsx` | ~400 | Merged into `game-results.tsx` |
| `app/game-prep.tsx` (legacy) | 1,924 | Replaced by wizard |
| `app/(tabs)/parent-my-stuff.tsx` | ~400 | Features redistributed, deleted |
| `app/(tabs)/coach-my-stuff.tsx` | 715 | Features redistributed, deleted |
| `app/(tabs)/admin-my-stuff.tsx` | 873 | Features redistributed, deleted |
| **Total deleted** | **~7,812** | |

---

## Screens NOT Consolidated (Intentionally Separate)

These screens remain as separate files because their workflows are fundamentally different across roles:

- `parent-schedule.tsx` and `coach-schedule.tsx` — RSVP vs event creation
- `family-payments.tsx` and `payments.tsx` — pay fees vs manage all payments
- `parent-registration-hub.tsx` and `registration-hub.tsx` — view status vs approve/deny
- `player-card.tsx` and `child-detail.tsx` — public fun view vs private operational view

The fix for these is **routing** (send the right role to the right screen), not consolidation.

---

## Rules for CC When Executing Consolidation Specs

1. **Read this document before any consolidation work.** Understand the target state.
2. **Execute only what the current spec says.** Do not consolidate screens that the current spec doesn't address.
3. **When merging screens, preserve all unique features from every source file.** Do not drop functionality during consolidation.
4. **Use `usePermissions()` for role checks.** Do not create new permission patterns.
5. **Use `resolveLinkedPlayerIds()` for parent-child resolution.** Do not create new identity resolution logic.
6. **Test the three layers after every merge.** Verify that each role sees the right data, has the right actions, and can navigate to the right destinations.
7. **Update GestureDrawer.tsx routes** when a consolidated screen replaces a deleted screen's route.
8. **Update `app/_layout.tsx` notification handler** when a consolidated screen replaces a deleted screen's route.
9. **Do not rename routes unless the spec explicitly says to.** Route changes propagate to many files and must be coordinated.
10. **After completing a consolidation, list every deleted file and every route that changed** so the next spec can account for them.
