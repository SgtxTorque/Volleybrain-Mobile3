# LYNX MOBILE — SCREEN & FILE GLOSSARY
## Audit Date: 2026-03-12
## Scope: Every screen file in app/, app/(tabs)/, app/(auth)/, app/chat/, app/register/, and significant component-screens

---

## How To Read This Document

This glossary is organized by directory, then alphabetically by file path. Each entry describes what the screen does, what route params it expects, what role(s) it serves, and any related/overlapping screens. Use this alongside the role journey documents (AUDIT-PARENT-JOURNEYS.md, AUDIT-COACH-JOURNEYS.md, AUDIT-ADMIN-JOURNEYS.md, AUDIT-PLAYER-JOURNEYS.md) to understand what each screen in a path actually is.

### Field Definitions

| Field | Description |
|-------|-------------|
| **Screen name shown to user** | The title/header text the user actually sees on screen |
| **Route** | The exact route string used to navigate here |
| **Purpose** | 1-2 sentences describing what this screen does |
| **Required params** | Route params that MUST be present for the screen to function |
| **Optional params** | Route params that change behavior but aren't required |
| **Role visibility** | Which roles can/should see this screen |
| **Key navigation outbound** | Every `router.push()`, `router.replace()`, or `Link` from this screen |
| **Supabase tables touched** | Every table this screen READS from and WRITES to |
| **Overlapping/related screens** | Other screens that do similar or overlapping things |
| **Identity notes** | Naming confusion, duplicate purpose, or version context |
| **Lines of code** | Total line count of the file |

---

## Navigation Architecture Overview

### Tab Bar Structure (from `app/(tabs)/_layout.tsx`)

| Tab Position | Name | Visible To | Route | Screen File | Notes |
|-------------|------|------------|-------|-------------|-------|
| 1 | Home | All roles | `/(tabs)` | `index.tsx` → `DashboardRouter.tsx` | Routes to role-specific home scroll |
| 2a | Manage | Admin only | `/(tabs)/manage` | `manage.tsx` | Admin management hub |
| 2b | Game Day | Coach / Player (not admin, not parent-only) | `/(tabs)/gameday` | `gameday.tsx` | Game day hub |
| 2c | Schedule | Parent-only (not admin, not coach) | `/(tabs)/parent-schedule` | `parent-schedule.tsx` | Parent schedule view |
| 3 | Chat | All roles | `/(tabs)/chats` | `chats.tsx` | Generic chat list with unread badge |
| 4 | More | All roles | — | `menu-placeholder.tsx` | Opens GestureDrawer (not a real screen) |

### Hidden Tabs (accessible via drawer / deep links only)
`connect`, `me`, `parent-chat`, `parent-team-hub`, `parent-my-stuff`, `coach-schedule`, `coach-chat`, `coach-team-hub`, `coach-my-stuff`, `admin-schedule`, `admin-chat`, `admin-teams`, `admin-my-stuff`, `schedule`, `messages`, `coach-roster`, `players`, `teams`, `coaches`, `payments`, `reports-tab`, `settings`, `my-teams`, `jersey-management`

### Drawer Menu Sections (from `components/GestureDrawer.tsx`)

| Section | Role Gate | Items |
|---------|-----------|-------|
| Quick Access | All roles | Home, Schedule, Chats, Announcements, Team Wall |
| Admin Tools | Admin only | Registration Hub, User Management, Payment Admin, Payment Reminders, Team Management, Jersey Management, Coach Directory, Season Management, Season Setup Wizard, Reports & Analytics, Admin Search, Org Directory, Season Archives, Blast Composer, Blast History, Venue Manager, Background Checks, Volunteer Assignment, Form Builder (web), Waiver Editor (web), Payment Gateway (web), Bulk Event Create, Org Settings |
| Game Day | Admin + Coach | Game Day Command, Game Prep, Lineup Builder, Attendance, Game Results, Game Recap |
| Coaching Tools | Admin + Coach | Player Evaluations, Challenges, Challenge Library, Player Goals, Blast Composer, Blast History, Coach Availability, Coach Profile, My Teams, Roster |
| My Family | Parent only | My Children, Registration, Payments, Waivers, Evaluations, Standings, Achievements, Invite Friends |
| My Stuff | Player only | My Teams, My Stats, My Evaluations, My Player Card, Challenges, Achievements, Season Progress, Standings, Schedule |
| League & Community | All roles | Team Wall, Standings, Achievements, Coach Directory, Find Organizations |
| Settings & Privacy | All roles | My Profile, Settings, Notifications, Season History, Privacy Policy, Terms of Service |
| Help & Support | All roles | Help Center, Web Features, Data Rights |

### Dashboard Router (from `components/DashboardRouter.tsx`)

| Condition | Dashboard Component |
|-----------|-------------------|
| Admin (or devViewAs=league_admin) | `AdminHomeScroll` |
| Coach with no kids (or devViewAs=head_coach/assistant_coach without kids) | `CoachHomeScroll` |
| Coach with kids | `CoachHomeScroll` (coach_parent type) |
| Parent (or devViewAs=parent) | `ParentHomeScroll` |
| Player (or devViewAs=player) | `PlayerHomeScroll` (with child picker if multiple children) |
| Default fallback | `ParentHomeScroll` |

### Notification Deep Links (from `app/_layout.tsx`, lines 89-125)

| Notification Type | Destination | Params |
|-------------------|-------------|--------|
| `chat` | `/chat/{channelId}` or `/(tabs)/chats` | channelId (if present) |
| `schedule` | `/(tabs)/schedule` | — |
| `payment` | `/(tabs)/payments` | — |
| `blast` | `/(tabs)/messages` | — |
| `registration` | `/registration-hub` | — |
| `game` / `game_reminder` | `/game-prep?eventId={eid}` or `/game-prep` | eventId (if present) |
| `challenge_*` (new/joined/progress/completed/winner/verify) | `/challenge-cta?challengeId={id}` or `/challenges` | challengeId (if present) |
| Default | `/(tabs)` | — |

---

## Screen Entries

<!-- SECTION: app/(auth)/ -->
### AUTH SCREENS

---

#### `app/(auth)/_layout.tsx`
- **Screen name shown to user:** (not visible — layout file)
- **Route:** `/(auth)/*`
- **Purpose:** Stack navigator container for all auth screens. Defines screen order: welcome, login, signup, redeem-code, pending-approval.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Unauthenticated users
- **Key navigation outbound:** None (layout only)
- **Supabase tables touched:** None
- **Overlapping/related screens:** `app/_layout.tsx` (root layout — routes into this stack)
- **Identity notes:** Minimal layout file — just a Stack with headerShown: false.
- **Lines of code:** 15

---

#### `app/(auth)/login.tsx`
- **Screen name shown to user:** "Welcome Back"
- **Route:** `/(auth)/login`
- **Purpose:** Email/password login with forgot-password modal. Dev quick-login helpers available in __DEV__ mode.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Unauthenticated users
- **Key navigation outbound:**
  - Link to signup → `/(auth)/signup` (line 187)
  - Dev quick-login helpers (line 94)
- **Supabase tables touched:**
  - WRITES: `auth.signInWithPassword` (login), `auth.resetPasswordForEmail` (line 68 — password reset)
- **Overlapping/related screens:** `welcome.tsx` (landing), `signup.tsx` (registration)
- **Identity notes:** Standard auth login. Dev mode includes hardcoded quick-login credentials for testing.
- **Lines of code:** 416

---

#### `app/(auth)/pending-approval.tsx`
- **Screen name shown to user:** "Almost There!"
- **Route:** `/(auth)/pending-approval`
- **Purpose:** Waiting screen for users whose accounts need org admin approval. Polls every 30s for approval status, auto-redirects on approval.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Users with `pending_approval = true`
- **Key navigation outbound:**
  - On approval → `/(tabs)` (line 43 — router.replace)
  - Sign out → `/(auth)/welcome` (line 54 — router.replace)
- **Supabase tables touched:**
  - READS: `profiles` (line 34 — polls `pending_approval` column by user.id every 30s)
- **Overlapping/related screens:** `users.tsx` (admin approves from there)
- **Identity notes:** Pulsing sleeping mascot animation while waiting. Displays user name, email, and org name.
- **Lines of code:** 151

---

#### `app/(auth)/redeem-code.tsx`
- **Screen name shown to user:** "Enter Code" / "Confirm"
- **Route:** `/(auth)/redeem-code`
- **Purpose:** Two-step invite code redemption: enter code → confirm org/team match → route to signup with org context. Validates against both `invitations` and `team_invite_codes` tables.
- **Required params:** None
- **Optional params:** `code` (string — deep link pre-fill)
- **Role visibility:** Unauthenticated users
- **Key navigation outbound:**
  - On confirm → `/(auth)/signup` with `orgCode`, `orgName`, `organizationId` params (line 138)
  - No code → `/(auth)/signup` (line 190)
  - Back → `router.back()` (line 152)
- **Supabase tables touched:**
  - READS: `invitations` (line 64 — with nested `organizations(name)`, filtered by invite_code + status=pending)
  - READS: `team_invite_codes` (line 92 — with nested `teams(id, name, organization_id, seasons(organization_id, organizations(name)))`, filtered by code + is_active=true)
- **Overlapping/related screens:** `signup.tsx` (destination after code validation), `parent-registration-hub.tsx` (also accepts invite codes)
- **Identity notes:** Validates expiry dates and max_uses. Shake animation on invalid codes.
- **Lines of code:** 274

---

#### `app/(auth)/signup.tsx`
- **Screen name shown to user:** "Your Info" / "I Am A..." / "Connect"
- **Route:** `/(auth)/signup`
- **Purpose:** Three-step registration wizard: Step 1 = personal info (name, email, password with strength indicator), Step 2 = role selection (parent/coach/admin/player), Step 3 = join org via code or create new org.
- **Required params:** None
- **Optional params:** `orgCode`, `orgName`, `organizationId` (from redeem-code flow)
- **Role visibility:** Unauthenticated users
- **Key navigation outbound:**
  - Back → `router.back()` (line 92)
  - After org creation → `refreshProfile()` triggers auth state redirect to `/(tabs)` (line 457)
- **Supabase tables touched:**
  - READS: `invitations` (line 114 — validates codes), `team_invite_codes` (line 128 — validates team codes)
  - WRITES: `auth.signUp` (creates account), `organizations` (line 174 — insert new org), `organization_sports` (line 204 — insert), `user_roles` (line 188-256 — insert/upsert), `profiles` (line 253-261 — update onboarding_completed + current_organization_id)
- **Overlapping/related screens:** `login.tsx` (existing user), `redeem-code.tsx` (pre-fills org context)
- **Identity notes:** 3-pane horizontal sliding UI with animated step indicator. Creates org inline (with auto-generated org code) or joins existing via invite code. Password strength meter.
- **Lines of code:** 500+

---

#### `app/(auth)/welcome.tsx`
- **Screen name shown to user:** (splash/landing — no title bar)
- **Route:** `/(auth)/welcome`
- **Purpose:** Onboarding splash screen with animated Lynx mascot and CTA buttons for signup, login, and code redemption.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Unauthenticated users
- **Key navigation outbound:**
  - Sign up → `/(auth)/signup` (line 115)
  - Log in → `/(auth)/login` (line 127)
  - Privacy policy → `/privacy-policy` (line 138)
  - Terms of service → `/terms-of-service` (line 142)
- **Supabase tables touched:** None
- **Overlapping/related screens:** `login.tsx`, `signup.tsx` — all auth entry points
- **Identity notes:** First screen users see. Animated mascot entrance.
- **Lines of code:** 227

<!-- SECTION: app/(tabs)/ -->
### TAB SCREENS

---

#### `app/(tabs)/admin-chat.tsx`
- **Screen name shown to user:** (hidden tab — no visible title)
- **Route:** `/(tabs)/admin-chat`
- **Purpose:** Admin Phase 1 wrapper — currently re-exports `coach-chat.tsx`. Phase 2 planned to add org-wide blast functionality.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only (hidden tab)
- **Key navigation outbound:** None (re-export)
- **Supabase tables touched:** None directly (delegated to coach-chat.tsx)
- **Overlapping/related screens:** `coach-chat.tsx` (source of re-export), `chats.tsx` (generic chat), `parent-chat.tsx` (parent chat)
- **Identity notes:** 2-line re-export of coach-chat. Admin chat and coach chat are currently identical.
- **Lines of code:** 3

---

#### `app/(tabs)/admin-my-stuff.tsx`
- **Screen name shown to user:** "MY STUFF"
- **Route:** `/(tabs)/admin-my-stuff`
- **Purpose:** Admin settings hub — org management, season info, waiver compliance, financials, pending invites, and profile management.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only (hidden tab)
- **Key navigation outbound:**
  - Dynamic menu rows → `org-directory`, `invite-friends`, `registration-hub`, `notification-preferences`, `data-rights`, `privacy-policy`, `terms-of-service`, `help` (line 296)
  - Season settings → `/season-settings` (line 314)
  - Profile → `/profile` (line 368)
  - Payment Admin → `/(tabs)/payments` (line 584)
- **Supabase tables touched:**
  - READS: `seasons` (line 96), `invitations` (line 98), `players` (line 106), `payments` (line 107), `waiver_templates` (line 129), `waiver_signatures` (line 138)
  - WRITES: `seasons` (line 192 — update registration_open), `invitations` (line 203 — resend, line 220 — revoke), `organizations` (line 268 — update banner_url via storage upload at line 261)
- **Overlapping/related screens:** `coach-my-stuff.tsx`, `parent-my-stuff.tsx`, `me.tsx` — all "My Stuff" variants per role
- **Identity notes:** Admin version has features the other variants lack (season management, invite management, waiver compliance stats).
- **Lines of code:** 874

---

#### `app/(tabs)/admin-schedule.tsx`
- **Screen name shown to user:** (hidden tab — no visible title)
- **Route:** `/(tabs)/admin-schedule`
- **Purpose:** Admin Phase 1 wrapper — currently re-exports `coach-schedule.tsx`. Phase 2 planned to add org-wide filtering.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only (hidden tab)
- **Key navigation outbound:** None (re-export)
- **Supabase tables touched:** None directly (delegated to coach-schedule.tsx)
- **Overlapping/related screens:** `coach-schedule.tsx` (source), `schedule.tsx` (another schedule variant), `parent-schedule.tsx` (parent variant)
- **Identity notes:** 2-line re-export. There are 4 schedule screens total — admin, coach, parent, and generic.
- **Lines of code:** 3

---

#### `app/(tabs)/admin-teams.tsx`
- **Screen name shown to user:** "TEAMS"
- **Route:** `/(tabs)/admin-teams`
- **Purpose:** Admin team management — create teams, assign players, view rosters, waiver compliance, head coach assignments, win-loss records.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only (hidden tab)
- **Key navigation outbound:**
  - View all players → `/(tabs)/players` (line 357)
  - Team wall → `/team-wall?teamId={id}` (line 435)
- **Supabase tables touched:**
  - READS: `teams` (line 112), `age_groups` (line 113), `players` (line 114), `coaches` (line 115), `team_players` (line 116), `team_coaches` (line 117 — with nested coaches), `schedule_events` (lines 118-119 — game results + upcoming), `waiver_templates` (line 176), `waiver_signatures` (line 188)
  - WRITES: `teams` (line 288 — insert), `team_coaches` (line 302 — insert), `team_players` (line 332 — insert), `players` (line 336 — update status)
- **Overlapping/related screens:** `teams.tsx` (another team management screen), `coaches.tsx` (coach assignments)
- **Identity notes:** This is the primary admin team management screen. `teams.tsx` is a simpler version with chat sync. Both exist — potential consolidation target.
- **Lines of code:** 824

---

#### `app/(tabs)/chats.tsx`
- **Screen name shown to user:** "Chats"
- **Route:** `/(tabs)/chats`
- **Purpose:** Generic chat channel list for all roles. Shows channels the user is a member of, with unread counts, typing indicators, pinning, DM creation, and channel creation.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All roles (visible tab bar item — Tab 3)
- **Key navigation outbound:**
  - Open existing DM → `/chat/[id]` (line 324)
  - Open new channel → `/chat/[id]` (line 370)
  - Tap channel row → `/chat/[id]` (line 504)
- **Supabase tables touched:**
  - READS: `channel_members` (lines 94, 289, 308 — membership, existing DM check, member count), `chat_messages` (lines 124, 137 — last message, unread count), `profiles` (lines 255, 273 — user search, channel members), `chat_channels` (line 298 — DM channel lookup), `typing_indicators` (line 223)
  - WRITES: `chat_channels` (lines 330, 377 — create DM, create channel), `channel_members` (lines 347, 412 — add members)
  - SUBSCRIBES: `chat_messages` INSERT (line 200 — real-time)
- **Overlapping/related screens:** `coach-chat.tsx` (coach-specific with FAB + blast), `parent-chat.tsx` (parent-specific), `admin-chat.tsx` (re-export of coach-chat)
- **Identity notes:** This is the GENERIC chat visible in the tab bar. The role-specific versions (`coach-chat`, `parent-chat`, `admin-chat`) are hidden tabs with expanded features. Users always land on this generic version via tab bar tap.
- **Lines of code:** 777

---

#### `app/(tabs)/coach-chat.tsx`
- **Screen name shown to user:** "CHAT"
- **Route:** `/(tabs)/coach-chat`
- **Purpose:** Coach/admin chat hub with channels, DMs, team-specific messaging, typing indicators, and FAB menu (blast, new channel, new message).
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach / Admin (hidden tab — also re-exported as admin-chat.tsx)
- **Key navigation outbound:**
  - Open existing DM → `/chat/[id]` (line 420)
  - Open new DM → `/chat/[id]` (line 445)
  - Open new channel → `/chat/[id]` (line 501)
  - Tap channel → `/chat/[id]` (line 519)
  - Blast composer → `/blast-composer` (line 754)
- **Supabase tables touched:**
  - READS: `chat_channels` (line 167 — admin path), `channel_members` (lines 175, 245, 386, 404 — membership), `chat_messages` (lines 187, 207, 261, 278 — messages + unread), `profiles` (lines 350, 366, 456 — org members + search), `typing_indicators` (line 548)
  - WRITES: `chat_channels` (lines 425, 473 — create DM, create channel), `channel_members` (lines 436, 492, 509 — add members, admin auto-join)
  - SUBSCRIBES: `chat_messages` INSERT (line 533 — real-time)
- **Overlapping/related screens:** `chats.tsx` (generic version — less features), `parent-chat.tsx` (parent version), `admin-chat.tsx` (re-export of this file)
- **Identity notes:** Has features the generic `chats.tsx` lacks: FAB with blast shortcut, admin channel browsing (all org channels vs just membership). The admin version is identical (re-export).
- **Lines of code:** 1100

---

#### `app/(tabs)/coach-my-stuff.tsx`
- **Screen name shown to user:** "MY STUFF"
- **Route:** `/(tabs)/coach-my-stuff`
- **Purpose:** Coach profile hub — team management shortcuts, certifications, org directory, settings (theme, notifications, privacy).
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach only (hidden tab)
- **Key navigation outbound:**
  - Dynamic menu → `coach-availability`, `blast-history`, `org-directory`, `invite-friends`, `notification-preferences`, `data-rights`, `privacy-policy`, `terms-of-service`, `help` (line 187)
  - Profile → `/profile` (line 240)
  - Team roster → `/team-roster?teamId={id}` (line 278)
- **Supabase tables touched:**
  - READS: `team_staff` (line 91 — teams via staff), `team_players` (line 104 — player counts), `coaches` (line 131 — certifications/background check status)
- **Overlapping/related screens:** `admin-my-stuff.tsx`, `parent-my-stuff.tsx`, `me.tsx` — all "My Stuff" variants
- **Identity notes:** Coach version shows team cards with roster counts and certification badges. Simpler than admin variant.
- **Lines of code:** 715

---

#### `app/(tabs)/coach-roster.tsx`
- **Screen name shown to user:** (no visible title — re-export)
- **Route:** `/(tabs)/coach-roster`
- **Purpose:** Alias/redirect — re-exports `players.tsx`. Exists to resolve references from coach-scroll components that navigate to `coach-roster`.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach / Admin (hidden tab)
- **Key navigation outbound:** None (re-export)
- **Supabase tables touched:** None directly (delegated to players.tsx)
- **Overlapping/related screens:** `players.tsx` (source), `roster.tsx` (another roster screen), `team-roster.tsx` (team-specific roster)
- **Identity notes:** There are multiple roster-related screens: `coach-roster` (re-export of `players`), `players` (grid/list roster), `roster` (standalone), `team-roster` (team-specific). Confusing overlap.
- **Lines of code:** 7

---

#### `app/(tabs)/coach-schedule.tsx`
- **Screen name shown to user:** "SCHEDULE"
- **Route:** `/(tabs)/coach-schedule`
- **Purpose:** Coach event scheduling with week/month views, team filtering, event creation, RSVP tracking, volunteer assignments, directions, calendar integration.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach / Admin (hidden tab — also re-exported as admin-schedule.tsx)
- **Key navigation outbound:**
  - Game prep wizard → `/game-prep-wizard?eventId={id}&teamId={id}` (line 768)
  - Game prep wizard (from modal) → `/game-prep-wizard?eventId={id}&teamId={id}` (line 916)
- **Supabase tables touched:**
  - READS: `teams` (lines 167, 206 — admin vs coach path), `team_staff` (line 182 — coach teams), `team_coaches` (line 187 — coach teams), `coaches` (line 203 — fallback), `schedule_events` (line 248), `event_rsvps` (line 273 — batch), `team_players` (line 277 — batch), `event_volunteers` (line 281 — batch with profiles)
  - WRITES: `schedule_events` (line 438 — insert new event)
- **Overlapping/related screens:** `admin-schedule.tsx` (re-export of this), `schedule.tsx` (another schedule variant), `parent-schedule.tsx` (parent variant)
- **Identity notes:** One of 4 schedule screens. This is the coach's primary schedule. Admin gets it via re-export. `schedule.tsx` is yet another variant with different features (bulk create). Consolidation candidate.
- **Lines of code:** 1324

---

#### `app/(tabs)/coach-team-hub.tsx`
- **Screen name shown to user:** "MY TEAM"
- **Route:** `/(tabs)/coach-team-hub`
- **Purpose:** Coach entry point to team hub. Multi-team selector pills + shared `TeamHubScreen` component for roster, stats, attendance, game prep.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach only (hidden tab)
- **Key navigation outbound:** None directly (delegated to TeamHubScreen component)
- **Supabase tables touched:**
  - READS: `team_staff` (line 53), `team_coaches` (line 60), `coaches` (line 78 — fallback), `teams` (line 84 — fallback)
- **Overlapping/related screens:** `connect.tsx` (all-role team hub), `parent-team-hub.tsx` (parent variant), `TeamHubScreen` component (shared)
- **Identity notes:** Coach sees team selector pills then TeamHubScreen. `connect.tsx` does the same thing for all roles. These are parallel implementations of the same pattern.
- **Lines of code:** 243

---

#### `app/(tabs)/coaches.tsx`
- **Screen name shown to user:** "Coaches"
- **Route:** `/(tabs)/coaches`
- **Purpose:** Admin coach management dashboard — list coaches, create new coaches, assign to teams (head/assistant), view team assignments, delete coaches.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only (hidden tab)
- **Key navigation outbound:** None (internal modals only)
- **Supabase tables touched:**
  - READS: `coaches` (line 36), `teams` (line 37), `team_coaches` (line 38)
  - WRITES: `coaches` (lines 52, 68 — insert, delete), `team_coaches` (lines 67, 86, 88, 95 — delete, update role, insert, delete from team)
- **Overlapping/related screens:** `admin-teams.tsx` (also manages team_coaches), `coach-directory.tsx` (read-only directory)
- **Identity notes:** This is the admin write interface for coaches. `coach-directory.tsx` is the read-only directory for all roles.
- **Lines of code:** 283

---

#### `app/(tabs)/connect.tsx`
- **Screen name shown to user:** (no explicit title — team selector)
- **Route:** `/(tabs)/connect`
- **Purpose:** All-role team connection hub. Multi-role team resolver (admin/coach/parent/player) with team selector pills + shared `TeamHubScreen` component.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All roles (hidden tab — Drawer "Team Wall" item routes here)
- **Key navigation outbound:** None directly (delegated to TeamHubScreen)
- **Supabase tables touched:**
  - READS: `teams` (lines 60, 159 — admin + fallback), `team_staff` (line 70 — coach), `team_coaches` (line 81 — coach), `profiles` (line 93 — parent email), `player_guardians` (lines 96, 132 — parent + player), `players` (lines 99, 103, 109, 126 — parent + player paths), `team_players` (line 140 — player teams)
- **Overlapping/related screens:** `coach-team-hub.tsx` (coach-specific), `parent-team-hub.tsx` (parent-specific), `team-wall.tsx` (standalone team wall)
- **Identity notes:** This is the unified "Team Wall" entry from the drawer. It resolves teams based on the current user's role using 4 different code paths (admin/coach/parent/player). The role-specific team hubs do similar resolution with less branching.
- **Lines of code:** 307

---

#### `app/(tabs)/gameday.tsx`
- **Screen name shown to user:** "GAME DAY"
- **Route:** `/(tabs)/gameday`
- **Purpose:** Game day command center — hero card with next event, weekly schedule, season progress, standings, upcoming events, recent results, coach tools (add event, attendance, lineup, game prep, recap).
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach / Player (Tab 2b — visible when not admin and not parent-only)
- **Key navigation outbound:**
  - Live game → `/game-day-command?matchId={id}` (line 387)
  - Standings → `/standings` (line 639)
  - Season archives → `/season-archives` (line 645)
  - Schedule tab → `/(tabs)/schedule` (lines 662, 705)
  - Game results → `/game-results?eventId={id}` (line 741)
  - Coach tools → dynamic routes (line 797)
- **Supabase tables touched:**
  - READS: `teams` (line 149), `schedule_events` (line 156), `event_rsvps` (line 172 — batch), `team_players` (line 177 — batch)
- **Overlapping/related screens:** `manage.tsx` (admin equivalent of Tab 2), `coach-schedule.tsx` (schedule features)
- **Identity notes:** This is the coach/player Tab 2. Admin gets `manage.tsx` instead. Parent gets `parent-schedule.tsx`. Three different screens compete for the Tab 2 slot.
- **Lines of code:** 1178

---

#### `app/(tabs)/index.tsx`
- **Screen name shown to user:** "Home" (tab bar title)
- **Route:** `/(tabs)`
- **Purpose:** Landing page that delegates to `DashboardRouter` component for role-based home screen routing. Wraps `FirstTimeTour` for onboarding.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All roles (Tab 1 — always visible)
- **Key navigation outbound:** None directly (delegated to DashboardRouter → role-specific HomeScroll)
- **Supabase tables touched:** None directly (delegated)
- **Overlapping/related screens:** `DashboardRouter.tsx` (routing logic), `AdminHomeScroll`, `CoachHomeScroll`, `ParentHomeScroll`, `PlayerHomeScroll` (actual content)
- **Identity notes:** This is just a thin wrapper. The real home screen logic lives in `DashboardRouter.tsx` which selects one of 4 HomeScroll components based on role.
- **Lines of code:** 17

---

#### `app/(tabs)/jersey-management.tsx`
- **Screen name shown to user:** "Jersey Numbers"
- **Route:** `/(tabs)/jersey-management`
- **Purpose:** Jersey assignment management — team selector, grid/list view toggle, assign jerseys to players, track preferences, mark as ordered.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only (hidden tab)
- **Key navigation outbound:** None (internal navigation only)
- **Supabase tables touched:**
  - READS: `teams` (line 89), `v_jersey_status` (line 112 — view), `v_jersey_alerts` (line 130 — view)
  - WRITES: `assign_jersey` RPC (line 171 — stored procedure), `jersey_assignments` (line 195 — update ordered_at)
- **Overlapping/related screens:** `admin-teams.tsx` (team management context)
- **Identity notes:** Uses Supabase views (`v_jersey_status`, `v_jersey_alerts`) and an RPC — unusual pattern in this codebase.
- **Lines of code:** 563

---

#### `app/(tabs)/manage.tsx`
- **Screen name shown to user:** "Command Center"
- **Route:** `/(tabs)/manage`
- **Purpose:** Admin control center dashboard — attention cards (pending regs, unpaid balances, unrostered, approvals), action grid (people, teams/seasons, money, communication, data), org snapshot, recent activity feed.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only (Tab 2a — visible only for admin)
- **Key navigation outbound:**
  - Attention cards → dynamic routes (line 347 — `/registration-hub`, `/users`, etc.)
  - Action tiles → dynamic routes (line 372 — `/users`, `/team-management`, `/season-settings`, etc.)
  - View all activity → `/(tabs)/reports-tab` (line 445)
- **Supabase tables touched:**
  - READS: `registrations` (lines 107, 113, 134, 135, 157 — pending count, unrostered count, total, approved, activity), `payments` (lines 110, 133, 163 — unpaid count, total amount, activity), `profiles` (line 116 — pending approval count), `players` (line 130 — total count), `teams` (line 131 — total count), `coaches` (line 132 — total count)
- **Overlapping/related screens:** `gameday.tsx` (coach Tab 2 equivalent), `AdminHomeScroll` (home dashboard — different view of similar data)
- **Identity notes:** This is the admin's Tab 2. Coaches see `gameday` instead. Both are "command center" style dashboards but with different focuses.
- **Lines of code:** 691

---

#### `app/(tabs)/me.tsx`
- **Screen name shown to user:** "Profile / Settings Menu"
- **Route:** `/(tabs)/me`
- **Purpose:** User profile hub with role-specific shortcuts, theme customization, and player dashboard settings. Displays user info, role badges, and role-specific menu items.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All roles (hidden tab)
- **Key navigation outbound:**
  - Personal items → `/profile`, `/notification-preferences`, `/data-rights`, `/privacy-policy`, `/terms-of-service`, `/help` (line 211)
  - Role-specific items (line 211):
    - Admin: `/season-settings`, `/(tabs)/reports-tab`, `/users`, `/registration-hub`, `/blast-composer`, `/(tabs)/payments`, `/org-directory`, `/season-archives`
    - Coach: `/(tabs)/my-teams`, `/(tabs)/players`, `/(tabs)/gameday`, `/coach-availability`
    - Parent: `/my-kids`, `/parent-registration-hub`, `/family-payments`, `/my-waivers`
    - Player: `/my-stats`, `/(tabs)/my-teams`, `/achievements`
- **Supabase tables touched:** None
- **Overlapping/related screens:** `admin-my-stuff.tsx`, `coach-my-stuff.tsx`, `parent-my-stuff.tsx` — role-specific "My Stuff" tabs. `settings.tsx` — settings screen.
- **Identity notes:** This is a unified profile/menu screen that adapts per role. The role-specific `*-my-stuff.tsx` tabs provide richer, dedicated experiences. Player customization (themes, accent colors, layout) stored in AsyncStorage.
- **Lines of code:** 803

---

#### `app/(tabs)/menu-placeholder.tsx`
- **Screen name shown to user:** "More" (tab bar title)
- **Route:** `/(tabs)/menu-placeholder`
- **Purpose:** Placeholder file to prevent Expo Router errors. The actual "More" tab opens the GestureDrawer instead of navigating to a screen.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All roles (Tab 4 — but tapping it opens the drawer, not this screen)
- **Key navigation outbound:** None
- **Supabase tables touched:** None
- **Overlapping/related screens:** `GestureDrawer.tsx` (the actual drawer that opens)
- **Identity notes:** Users never actually see this screen. The tab bar button is intercepted via `tabBarButton` prop in `_layout.tsx` (line 324) to call `openDrawer()` instead.
- **Lines of code:** 7

---

#### `app/(tabs)/messages.tsx`
- **Screen name shown to user:** "Messages"
- **Route:** `/(tabs)/messages`
- **Purpose:** Admin/coach broadcast message tool with 3-step wizard. Create and send announcements, schedule changes, payment reminders to all, specific teams, or specific roles.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin / Coach (hidden tab — Drawer "Announcements" routes here)
- **Key navigation outbound:** None
- **Supabase tables touched:**
  - READS: `messages` (line 36 — by season), `teams` (line 37)
  - WRITES: `messages` (line 53 — insert new message)
- **Overlapping/related screens:** `blast-composer.tsx` (another broadcast tool with richer targeting)
- **Identity notes:** This is the "Announcements" entry from the drawer Quick Access. `blast-composer.tsx` is a more feature-rich broadcast tool in Admin Tools / Coaching Tools sections. Two overlapping broadcast mechanisms.
- **Lines of code:** 301

---

#### `app/(tabs)/my-teams.tsx`
- **Screen name shown to user:** "My Teams"
- **Route:** `/(tabs)/my-teams`
- **Purpose:** Parent view of child's team rosters, coaches, and contacts. Expandable team cards showing teammates, coaches, and parent contact info.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Parent (hidden tab — Drawer routes here for parent and player)
- **Key navigation outbound:**
  - Back → `router.back()` (line 335)
- **Supabase tables touched:**
  - READS: `player_guardians` (line 92 — parent-child links), `players` (lines 101, 111, 129 — by parent_account_id, by email, child details), `team_players` (lines 136, 175 — team assignments, roster with nested data), `sports` (line 158), `team_coaches` (line 216 — with nested profiles)
- **Overlapping/related screens:** `parent-team-hub.tsx` (wrapper), `teams.tsx` (admin version), `team-roster.tsx` (team-specific roster)
- **Identity notes:** Despite being in the drawer under both "parent" and "player" sections, this is a parent-focused screen. Shows "my child" indicator on player cards. Contact modal with call/text/email.
- **Lines of code:** 817

---

#### `app/(tabs)/parent-chat.tsx`
- **Screen name shown to user:** "Chat"
- **Route:** `/(tabs)/parent-chat`
- **Purpose:** Parent/coach chat hub. Channels (team chat, DMs, announcements) with real-time typing indicators, pinning, and DM creation.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Parent / Coach / Admin (hidden tab)
- **Key navigation outbound:**
  - Open existing DM → `/chat/[id]` (line 313)
  - Open new DM → `/chat/[id]` (line 358)
  - Tap channel → `/chat/[id]` (line 491)
- **Supabase tables touched:**
  - READS: `channel_members` (lines 152, 279, 297 — membership, existing DM check, member count), `chat_messages` (lines 177, 190 — last message, unread count), `profiles` (line 261 — user search), `chat_channels` (line 288 — DM lookup), `typing_indicators` (line 397)
  - WRITES: `chat_channels` (line 319 — create DM), `channel_members` (line 335 — add members)
  - SUBSCRIBES: `chat_messages` INSERT (line 376 — real-time)
- **Overlapping/related screens:** `chats.tsx` (generic — Tab 3), `coach-chat.tsx` (coach version with FAB + blast)
- **Identity notes:** Similar to `chats.tsx` but with different styling/layout. Pinning stored in AsyncStorage. Has N+1 query pattern noted in memory — per-channel unread count queries.
- **Lines of code:** 930

---

#### `app/(tabs)/parent-my-stuff.tsx`
- **Screen name shown to user:** "My Stuff"
- **Route:** `/(tabs)/parent-my-stuff`
- **Purpose:** Parent dashboard with children cards, payment status, registrations, waivers, org info, and settings.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Parent only (hidden tab)
- **Key navigation outbound:**
  - Edit profile → `/profile` (line 333)
  - Register player → `/parent-registration-hub` (lines 358, 364, 469)
  - Child detail → `/child-detail?playerId={id}` (line 383)
  - Pay now / payment history → `/family-payments` (lines 435, 445)
  - View waivers → `/my-waivers` (line 496)
  - Org directory → `/org-directory` (line 525)
  - Invite friends → `/invite-friends` (line 526)
- **Supabase tables touched:**
  - READS: `player_guardians` (line 115), `players` (lines 121, 128, 147 — 3 resolution paths + details with team_players/teams), `payments` (line 173 — unpaid amounts), `registrations` (line 183 — with seasons), `waiver_signatures` (line 205), `waiver_templates` (line 225)
- **Overlapping/related screens:** `admin-my-stuff.tsx`, `coach-my-stuff.tsx`, `me.tsx` — all "My Stuff" variants
- **Identity notes:** Resolves children from 3 sources (guardians, direct links, email match). Shows both signed and required-but-unsigned waivers.
- **Lines of code:** 930

---

#### `app/(tabs)/parent-schedule.tsx`
- **Screen name shown to user:** "Schedule"
- **Route:** `/(tabs)/parent-schedule`
- **Purpose:** Parent views child's game/practice schedule with expandable week/month calendar, inline RSVP buttons, and event detail modal with directions/calendar integration.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Parent-only (Tab 2c — visible only when not admin, not coach)
- **Key navigation outbound:** None
- **Supabase tables touched:**
  - READS: `player_guardians` (line 151), `players` (lines 157, 164, 178 — 3 resolution paths + team assignments), `schedule_events` (line 222), `event_rsvps` (lines 264, 304 — batch + existing check)
  - WRITES: `event_rsvps` (lines 312, 317 — update or insert RSVP)
- **Overlapping/related screens:** `schedule.tsx` (coach/admin version), `coach-schedule.tsx` (coach version with create)
- **Identity notes:** This is the parent's Tab 2. Only visible for pure parents (not admin, not coach). Uses optimistic UI for RSVP then persists. Child filter tabs based on unique teams.
- **Lines of code:** 1025

---

#### `app/(tabs)/parent-team-hub.tsx`
- **Screen name shown to user:** "My Team"
- **Route:** `/(tabs)/parent-team-hub`
- **Purpose:** Parent entry point to team hub. Resolves parent's child teams, shows team selector pills, renders shared `TeamHubScreen` component.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Parent only (hidden tab)
- **Key navigation outbound:** None directly (delegated to TeamHubScreen)
- **Supabase tables touched:**
  - READS: `player_guardians` (line 50), `players` (lines 56, 63, 73 — 3 resolution paths + team assignments with nested teams)
- **Overlapping/related screens:** `coach-team-hub.tsx` (coach variant), `connect.tsx` (all-role variant), `my-teams.tsx` (parent roster detail)
- **Identity notes:** Wrapper that resolves teams then delegates to TeamHubScreen. All 3 team hub variants (parent, coach, connect) follow the same pattern: resolve teams → show selector → render TeamHubScreen.
- **Lines of code:** 229

---

#### `app/(tabs)/payments.tsx`
- **Screen name shown to user:** "Payments"
- **Route:** `/(tabs)/payments`
- **Purpose:** Admin payment management with verification queue, family/player grouping, payment plans, bulk operations. Tracks unpaid/pending/verified fees.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin (primary), Parent (read-only variant)
- **Key navigation outbound:** None (internal modals only)
- **Supabase tables touched:**
  - READS: `players` (lines 160, 424), `season_fees` (lines 196, 447), `payments` (lines 203, 434), `sports` (line 209), `families` (line 341), `payment_installments` (line 965)
  - WRITES: `payments` (lines 479, 668, 730, 774, 840 — batch insert, verify, reject, record, single verify)
- **Overlapping/related screens:** `family-payments.tsx` (parent payment view), `payment-reminders.tsx` (admin reminder tool)
- **Identity notes:** Large file (1500+ lines) with multiple tabs (Verification, All, Plans). Supports bulk verification/rejection and payment plan creation. `family-payments.tsx` is the parent-facing counterpart.
- **Lines of code:** ~1500+

---

#### `app/(tabs)/players.tsx`
- **Screen name shown to user:** "Players"
- **Route:** `/(tabs)/players`
- **Purpose:** Coach/admin roster view with grid/lineup/list views, team filter, search, and expanded player detail modal via `PlayerCardExpanded`.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach / Admin (hidden tab — Drawer "Roster" routes here)
- **Key navigation outbound:** None (modals only — `PlayerCardExpanded`)
- **Supabase tables touched:**
  - READS: `teams` (line 69), `players` (line 86), `team_players` (line 99)
- **Overlapping/related screens:** `coach-roster.tsx` (re-export of this file), `roster.tsx` (standalone), `team-roster.tsx` (team-specific)
- **Identity notes:** Three view modes: grid (3-column), lineup (by team), list (ESPN-style stat bar). This is the main roster screen, re-exported as `coach-roster` for backward compat.
- **Lines of code:** 494

---

#### `app/(tabs)/reports-tab.tsx`
- **Screen name shown to user:** "Reports"
- **Route:** `/(tabs)/reports-tab`
- **Purpose:** Reports dashboard wrapper. Delegates to `ReportsScreen` component.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only (hidden tab)
- **Key navigation outbound:** None (delegated to ReportsScreen)
- **Supabase tables touched:** None directly (delegated to ReportsScreen component)
- **Overlapping/related screens:** `season-reports.tsx` (standalone reports), `ReportsScreen` component (actual content), `ReportViewerScreen` component (individual report)
- **Identity notes:** 3-line wrapper. All logic lives in `ReportsScreen` component.
- **Lines of code:** 3

---

#### `app/(tabs)/schedule.tsx`
- **Screen name shown to user:** "Schedule"
- **Route:** `/(tabs)/schedule`
- **Purpose:** Coach/admin schedule management with event creation (single + bulk/recurring), list/week/month views, volunteer assignments, RSVP counts.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach / Admin (hidden tab — Drawer "Schedule" routes here)
- **Key navigation outbound:**
  - Game prep → `/game-prep` (line 520)
- **Supabase tables touched:**
  - READS: `venues` (line 160), `teams` (line 183), `schedule_events` (line 197), `event_rsvps` (line 230 — batch), `team_players` (line 235 — batch), `event_volunteers` (line 240 — with profiles)
  - WRITES: `schedule_events` (lines 429, 488 — insert single, bulk), `schedule_events` (line 524 — delete)
- **Overlapping/related screens:** `coach-schedule.tsx` (coach version), `admin-schedule.tsx` (re-export of coach), `parent-schedule.tsx` (parent version)
- **Identity notes:** Yet another schedule screen. Has bulk creation with recurring practices and game series — a feature `coach-schedule.tsx` lacks. 4 schedule screens exist total. Major consolidation candidate.
- **Lines of code:** 1084

---

#### `app/(tabs)/settings.tsx`
- **Screen name shown to user:** "Settings"
- **Route:** `/(tabs)/settings`
- **Purpose:** User settings with theme selection, dev mode role switcher, org info (admin), and user management (admin).
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All roles (hidden tab — Drawer "Settings" routes here)
- **Key navigation outbound:**
  - Privacy policy → `/privacy-policy` (line 369)
  - Terms of service → `/terms-of-service` (line 376)
- **Supabase tables touched:**
  - READS: `organizations` (line 53), `profiles` (line 64 — org profiles), `user_roles` (line 71)
  - WRITES: `user_roles` (lines 102, 109 — revoke role, grant role via upsert)
- **Overlapping/related screens:** `me.tsx` (profile hub), `org-settings.tsx` (admin org settings)
- **Identity notes:** Dev mode role switcher visible when enabled — allows switching between roles for testing. Cannot revoke own admin role. User management shows first 10 users.
- **Lines of code:** 544

---

#### `app/(tabs)/teams.tsx`
- **Screen name shown to user:** "Teams"
- **Route:** `/(tabs)/teams`
- **Purpose:** Admin/coach team management — create teams, assign players/coaches, manage rosters. Auto-creates team chat channels and syncs members.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin / Coach (hidden tab)
- **Key navigation outbound:** None (modals only)
- **Supabase tables touched:**
  - READS: `teams` (line 44), `age_groups` (line 45), `players` (line 46), `coaches` (line 47), `team_players` (line 48), `team_coaches` (line 49), `chat_channels` (line 104)
  - WRITES: `teams` (line 69 — insert), `channel_members` (line 106 — delete), `chat_channels` (line 108 — delete), `team_players` (lines 109, 173 — delete, insert), `team_coaches` (lines 109, 216, 226, 264 — delete, delete, insert, delete), `teams` (line 111 — delete), `players` (line 181 — update status)
- **Overlapping/related screens:** `admin-teams.tsx` (admin-specific team management — richer features), `team-management.tsx` (standalone team management)
- **Identity notes:** Overlaps heavily with `admin-teams.tsx`. This version auto-syncs team chat channels on player/coach assignment. `admin-teams.tsx` has waiver compliance and win-loss tracking that this version lacks. Two screens doing similar things.
- **Lines of code:** 521

<!-- SECTION: app/ (root screens) -->
### APP ROOT SCREENS

---

#### `app/achievements.tsx`
- **Screen name shown to user:** "Trophy Case"
- **Route:** `/achievements`
- **Purpose:** Player/coach/parent/admin achievements and badges with progress tracking, challenges tab, XP progression, and tracked achievement management.
- **Required params:** None
- **Optional params:** `playerId` (string — parents viewing child's achievements)
- **Role visibility:** All roles (role-specific category maps)
- **Key navigation outbound:**
  - Back → `router.back()` (lines 645, 1409)
- **Supabase tables touched:**
  - READS: `players` (line 234 — parent linkage), `player_guardians` (line 243), `achievements` (line 273 — active achievements), `player_achievements` (lines 286, 331 — earned + count), `player_tracked_achievements` (line 300), `player_season_stats` (line 310), `team_players` (line 351)
  - WRITES: `player_tracked_achievements` (line 487 — delete/untrack, line 503 — insert/track)
- **Overlapping/related screens:** `child-detail.tsx` (achievements tab), `challenge-detail.tsx`
- **Identity notes:** Large file with full achievement system UI. Resolves player ID from multiple sources (direct, parent_account_id, player_guardians).
- **Lines of code:** 2355

---

#### `app/admin-search.tsx`
- **Screen name shown to user:** "Search"
- **Route:** `/admin-search`
- **Purpose:** Full-text search across players, teams, events, and users for admin management.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only
- **Key navigation outbound:**
  - Back → `router.back()` (line 223)
  - Result tap → `router.push(result.route)` (line 195 — dynamic route per result type)
- **Supabase tables touched:**
  - READS: `players` (line 97 — ilike first/last name), `teams` (line 119 — ilike name), `schedule_events` (line 141 — ilike title), `profiles` (line 164 — ilike full_name/email)
- **Overlapping/related screens:** `team-management.tsx`, `users.tsx`
- **Identity notes:** Unified search across 4 entity types. Results build dynamic routes.
- **Lines of code:** 451

---

#### `app/attendance.tsx`
- **Screen name shown to user:** "Attendance"
- **Route:** `/attendance`
- **Purpose:** Coach/staff marks player attendance (present/absent/late) for specific events. Event selector then roster view with RSVP cross-reference.
- **Required params:** None
- **Optional params:** `eventId` (string — auto-select event)
- **Role visibility:** Coach / Admin
- **Key navigation outbound:**
  - Back → `router.back()` (line 381)
- **Supabase tables touched:**
  - READS: `schedule_events` (lines 112, 127 — upcoming events + single event), `team_players` (line 145 — roster), `event_rsvps` (lines 145, 303 — RSVPs + refresh)
  - WRITES: `event_rsvps` (lines 219-252 — delete/update/insert attendance status, lines 282-298 — batch mark all present)
- **Overlapping/related screens:** `schedule.tsx`, `gameday.tsx`, `game-prep-wizard.tsx`
- **Identity notes:** Two-phase UI: select event, then mark attendance. Supports batch "all present" action.
- **Lines of code:** 978

---

#### `app/blast-composer.tsx`
- **Screen name shown to user:** "New Announcement"
- **Route:** `/blast-composer`
- **Purpose:** Compose and send broadcast announcements (blasts) to all parents or specific team parents.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach / Admin
- **Key navigation outbound:**
  - Back → `router.back()` (line 287)
  - View sent → `/blast-history` (line 258)
- **Supabase tables touched:**
  - READS: `teams` (line 89), `players` (lines 110, 198-209 — count + recipients)
  - WRITES: `messages` (line 177 — insert), `message_recipients` (line 236 — insert batch)
- **Overlapping/related screens:** `blast-history.tsx`, `messages.tsx` (another broadcast tool)
- **Identity notes:** Two overlapping broadcast mechanisms exist: this (richer targeting) and `messages.tsx` (simpler).
- **Lines of code:** 792

---

#### `app/blast-history.tsx`
- **Screen name shown to user:** "Blast History"
- **Route:** `/blast-history`
- **Purpose:** View history of sent announcements with read rates, recipient details, and resend-to-unread functionality.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach / Admin
- **Key navigation outbound:**
  - Back → `router.back()` (line 501)
- **Supabase tables touched:**
  - READS: `messages` (line 115 — by season), `teams` (line 136 — team name lookup), `message_recipients` (line 184 — per-message recipients)
  - WRITES: `messages` (line 233 — insert resend), `message_recipients` (line 262 — insert resend recipients)
- **Overlapping/related screens:** `blast-composer.tsx`
- **Identity notes:** Expandable message cards showing acknowledged vs unacknowledged recipients.
- **Lines of code:** 736

---

#### `app/bulk-event-create.tsx`
- **Screen name shown to user:** "Bulk Create"
- **Route:** `/bulk-event-create`
- **Purpose:** Create recurring practice/game/tournament events in batch with 4-step wizard (Type, Recurrence, Location, Preview).
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach / Admin
- **Key navigation outbound:**
  - Back → `router.back()` (lines 287, 301)
- **Supabase tables touched:**
  - READS: `teams` (line 101), `venues` (line 124)
  - WRITES: `schedule_events` (line 276 — batch insert)
- **Overlapping/related screens:** `schedule.tsx` (also has bulk create), `coach-schedule.tsx`
- **Identity notes:** Standalone bulk creation wizard. `schedule.tsx` has inline bulk create with similar but different features.
- **Lines of code:** 875

---

#### `app/challenge-celebration.tsx`
- **Screen name shown to user:** "Challenge Complete!"
- **Route:** `/challenge-celebration`
- **Purpose:** Full-screen celebration animation shown when player completes a challenge — animated XP count-up and confetti.
- **Required params:** `challengeId`, `challengeTitle`, `xpEarned` (numeric string)
- **Optional params:** `isWinner` ("true"/"false")
- **Role visibility:** Players
- **Key navigation outbound:**
  - Continue → `/challenges` (line 167 — router.replace)
- **Supabase tables touched:** None (display-only modal)
- **Overlapping/related screens:** `challenge-cta.tsx`, `challenge-detail.tsx`
- **Identity notes:** Ephemeral celebration screen — navigated to after challenge completion, then replaces itself with challenges list.
- **Lines of code:** 425

---

#### `app/challenge-cta.tsx`
- **Screen name shown to user:** (immersive full-screen — no title bar)
- **Route:** `/challenge-cta`
- **Purpose:** Immersive full-screen CTA for players to accept/join a challenge — difficulty badge, rewards preview, participant avatars.
- **Required params:** `challengeId` (string)
- **Optional params:** None
- **Role visibility:** Players
- **Key navigation outbound:**
  - View leaderboard → `/challenge-detail?challengeId=${id}` (line 171)
  - Back → `router.back()` (lines 199, 244, 374)
- **Supabase tables touched:** None directly (uses `useChallengeDetail` hook + `optInToChallenge`, `updateChallengeProgress` lib functions)
- **Overlapping/related screens:** `challenge-detail.tsx`, `challenges.tsx`
- **Identity notes:** Notification deep link target for `challenge_*` notification types.
- **Lines of code:** 811

---

#### `app/challenge-detail.tsx`
- **Screen name shown to user:** "Challenge Detail"
- **Route:** `/challenge-detail`
- **Purpose:** View challenge details, leaderboard, and submit progress; coach can verify/reject submissions and adjust values.
- **Required params:** `challengeId` (string)
- **Optional params:** None
- **Role visibility:** Players (submit progress), Coaches/Admins (verify submissions)
- **Key navigation outbound:**
  - Back → `router.back()` (lines 425, 442, 461, 734)
- **Supabase tables touched:**
  - READS: `players` (line 256 — access verification), `player_guardians` (line 264), `team_players` (line 277 — access gate)
  - WRITES: `challenge_participants` (lines 351, 377, 406 — verify/adjust/reject submissions)
- **Overlapping/related screens:** `challenge-cta.tsx`, `challenges.tsx`, `coach-challenge-dashboard.tsx`
- **Identity notes:** Dual-role screen: player submits progress, coach verifies. Access gated by team membership.
- **Lines of code:** 1412

---

#### `app/challenge-library.tsx`
- **Screen name shown to user:** "Challenge Library"
- **Route:** `/challenge-library`
- **Purpose:** Browse challenge templates by category; create custom challenges from templates.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach / Admin
- **Key navigation outbound:**
  - Create from template → `/create-challenge?templateId={id}` (line 77)
  - Create blank → `/create-challenge` (line 86)
  - Back → `router.back()` (line 194)
- **Supabase tables touched:** None (uses local CHALLENGE_TEMPLATES data)
- **Overlapping/related screens:** `challenges.tsx`, `create-challenge.tsx`, `coach-challenge-dashboard.tsx`
- **Identity notes:** Templates are hardcoded in the component, not fetched from DB.
- **Lines of code:** 383

---

#### `app/challenges.tsx`
- **Screen name shown to user:** "Challenges"
- **Route:** `/challenges`
- **Purpose:** List active/completed/expired challenges with role-aware actions (coach creates, player joins, parent views).
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All roles (coach/player/parent — different UIs)
- **Key navigation outbound:**
  - Back → `router.back()` (line 333)
- **Supabase tables touched:**
  - READS: `players` (lines 100, 123 — player/parent resolution), `team_players` (lines 108, 144 — team lookup), `player_guardians` (line 137), `coach_challenges` (lines 175, 185 — active + expired challenges)
- **Overlapping/related screens:** `challenge-cta.tsx`, `challenge-detail.tsx`, `challenge-library.tsx`, `coach-challenge-dashboard.tsx`
- **Identity notes:** Complex team resolution via 4 different paths (player profile_id, parent_account_id, player_guardians, team_players).
- **Lines of code:** 663

---

#### `app/child-detail.tsx`
- **Screen name shown to user:** (player name as title)
- **Route:** `/child-detail`
- **Purpose:** Comprehensive player profile with photo, stats, schedule, achievements, and shoutouts. Parents can upload photos.
- **Required params:** `playerId` (string)
- **Optional params:** None
- **Role visibility:** Parents (linked children), Coaches, Admins
- **Key navigation outbound:**
  - Back → `router.back()` (line 411)
  - Goals → `/player-goals?playerId=${id}` (line 554)
  - Achievements → `/achievements` (line 810)
- **Supabase tables touched:**
  - READS: `players` (line 132), `player_guardians` (line 148 — access check), `sports` (line 165), `registrations` (line 174), `team_players` (line 183), `player_season_stats` (line 196), `player_achievements` (line 215), `achievements` (line 230 — total count), `schedule_events` (lines 241, 253 — upcoming + recent games), `team_standings` (line 265)
  - WRITES: `players` (line 330 — update photo_url), `storage.player-photos` (line 320 — upload)
- **Overlapping/related screens:** `achievements.tsx`, `player-goals.tsx`, `player-card.tsx`
- **Identity notes:** Heavy data aggregation — 11 separate Supabase reads. Shows upcoming schedule, recent game results, win-loss record, and achievement progress.
- **Lines of code:** 1555

---

#### `app/claim-account.tsx`
- **Screen name shown to user:** "We found your family!"
- **Route:** `/claim-account`
- **Purpose:** Link orphaned player records (previously registered without parent account) to current user's account.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Parents (with orphan player records detected by auth)
- **Key navigation outbound:**
  - Link success → `/(tabs)` (line 58 — router.replace)
  - Skip → `/(tabs)` (line 68 — router.replace)
- **Supabase tables touched:**
  - WRITES: `players` (line 34 — update parent_account_id), `families` (line 40 — update account_id), `player_parents` (line 47 — upsert per player, N+1 loop)
- **Overlapping/related screens:** Auth flow — triggered by `hasOrphanRecords` flag in `_layout.tsx`
- **Identity notes:** N+1 pattern: loops through playerIds calling upsert individually. Also, uses `player_parents` table (not `player_guardians`) — different linking mechanism.
- **Lines of code:** 155

---

#### `app/coach-availability.tsx`
- **Screen name shown to user:** "My Availability"
- **Route:** `/coach-availability`
- **Purpose:** Coaches mark themselves unavailable for specific dates with reasons (vacation, work, injury). Interactive calendar interface with modal-based entry.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach
- **Key navigation outbound:**
  - Back → `router.back()` (line 254)
- **Supabase tables touched:**
  - READS: `coaches` (line 69 — get coach ID by profile_id), `coach_availability` (line 84 — date range)
  - WRITES: `coach_availability` (line 166 — delete, lines 186-215 — upsert/insert)
- **Overlapping/related screens:** `coach-profile.tsx`, `game-prep-wizard.tsx` (references availability)
- **Identity notes:** Calendar-based UI. Uses upsert with `coach_id,date` conflict key.
- **Lines of code:** 520

---

#### `app/coach-background-checks.tsx`
- **Screen name shown to user:** "Background Checks"
- **Route:** `/coach-background-checks`
- **Purpose:** Admin view of all coaches with background check status (valid/expiring/expired/not submitted). Summary bar and detailed modal.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin
- **Key navigation outbound:**
  - Back → `router.back()` (line 289)
- **Supabase tables touched:**
  - READS: `teams` (line 109 — season teams), `team_coaches` (line 123 — batch by team_ids), `coaches` (line 137 — batch by coach_ids with background check fields)
- **Overlapping/related screens:** `coach-directory.tsx`, `coach-profile.tsx`
- **Identity notes:** Color-coded status badges. Batched queries avoid N+1.
- **Lines of code:** 653

---

#### `app/coach-challenge-dashboard.tsx`
- **Screen name shown to user:** "Challenge HQ"
- **Route:** `/coach-challenge-dashboard`
- **Purpose:** Coach dashboard for managing team challenges — stats bar, verification queue, active challenges with progress bars and mini-leaderboards, completed challenges, FAB to create new.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach
- **Key navigation outbound:**
  - Back → `router.back()` (line 131)
  - Challenge detail → `/challenge-detail?challengeId=${id}` (line 223)
  - Create challenge → `/create-challenge` (line 313)
  - Challenge library → `/challenge-library` (line 328)
- **Supabase tables touched:**
  - WRITES: `challenge_participants` (line 80 — verify, line 95 — reject)
- **Overlapping/related screens:** `challenges.tsx`, `challenge-detail.tsx`, `create-challenge.tsx`
- **Identity notes:** Uses `useCoachTeam` hook for team resolution. Data primarily from hook, direct DB writes for verify/reject only.
- **Lines of code:** 742

---

#### `app/coach-directory.tsx`
- **Screen name shown to user:** "Coach Directory"
- **Route:** `/coach-directory`
- **Purpose:** List all coaches for the season with search, filter (all/active/unassigned), and detailed modal per coach. Shows contact info, background check status, certifications, team assignments. Allows role assignment changes.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin
- **Key navigation outbound:**
  - Back → `router.back()` (line 196)
- **Supabase tables touched:**
  - READS: `coaches` (line 79 — full details by season), `teams` (line 82), `team_coaches` (line 83 — all records)
  - WRITES: `team_coaches` (line 133 — update role, line 135 — insert assignment, line 145 — delete assignment)
- **Overlapping/related screens:** `coaches.tsx` (admin CRUD), `coach-profile.tsx` (coach self-view), `coach-background-checks.tsx`
- **Identity notes:** Read-only directory with inline team assignment management.
- **Lines of code:** 616

---

#### `app/coach-profile.tsx`
- **Screen name shown to user:** "My Profile"
- **Route:** `/coach-profile`
- **Purpose:** Coach views/edits own profile — personal info, specialties, experience level, compliance status (background check, waiver, code of conduct), assigned teams.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach
- **Key navigation outbound:**
  - Back → `router.back()` (lines 164, 185)
- **Supabase tables touched:**
  - READS: `coaches` (line 73 — with nested team_coaches/teams, by profile_id + season)
  - WRITES: `coaches` (line 105 — update profile fields)
- **Overlapping/related screens:** `coach-directory.tsx` (admin view of same data), `profile.tsx` (generic profile)
- **Identity notes:** Coach-specific profile view. Different from `profile.tsx` which is the generic user profile.
- **Lines of code:** 596

---

#### `app/complete-profile.tsx`
- **Screen name shown to user:** "Complete Profile"
- **Route:** `/complete-profile`
- **Purpose:** Mini-form for parents to fill in missing player registration fields. Shows only missing fields, pre-populated with existing data.
- **Required params:** `playerId`, `seasonId`
- **Optional params:** None
- **Role visibility:** Parent
- **Key navigation outbound:**
  - Back → `router.back()` (lines 157, 184, 212)
- **Supabase tables touched:**
  - WRITES: `players` (line 149 — update per FIELD_TO_COLUMN mapping)
- **Overlapping/related screens:** `register/[seasonId].tsx` (full registration)
- **Identity notes:** Targeted field completion — only shows fields that are missing, not the full registration form.
- **Lines of code:** 406

---

#### `app/create-challenge.tsx`
- **Screen name shown to user:** "Create Challenge"
- **Route:** `/create-challenge`
- **Purpose:** Form for coaches to create or customize challenges from templates. Sections: Challenge (title, description, category), Rules (type, tracking, stat, target, duration), Rewards (XP, prize). Preview card with mascot.
- **Required params:** None
- **Optional params:** `templateId` (string — pre-fill from template)
- **Role visibility:** Coach
- **Key navigation outbound:**
  - Back → `router.back()` (lines 210, 248)
- **Supabase tables touched:** None directly (calls `createChallenge` service function)
- **Overlapping/related screens:** `challenge-library.tsx` (template source), `coach-challenge-dashboard.tsx`
- **Identity notes:** Validates challenge configuration before submission. Uses useCoachTeam hook for team context.
- **Lines of code:** 964

---

#### `app/data-rights.tsx`
- **Screen name shown to user:** "Data Rights"
- **Route:** `/data-rights`
- **Purpose:** GDPR/privacy compliance — parents review children's data, request exports, request per-child deletions, or revoke consent entirely.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Parent
- **Key navigation outbound:**
  - Back → `router.back()` (lines 275, 292)
- **Supabase tables touched:**
  - READS: `player_guardians` (line 61), `players` (lines 70, 81, 100 — 3 resolution paths + details with nested teams), `player_game_stats` (line 120 — count)
  - WRITES: `profiles` (line 173 — update data_export_requested), `players` (lines 207, 247 — update deletion_requested per child)
- **Overlapping/related screens:** `privacy-policy.tsx`, `profile.tsx` (links here)
- **Identity notes:** Triple child resolution (guardians, parent_account_id, parent_email). Shows expandable detail per child including medical info.
- **Lines of code:** 712

---

#### `app/evaluation-session.tsx`
- **Screen name shown to user:** "Evaluation Session"
- **Route:** `/evaluation-session`
- **Purpose:** Coaches set up player evaluation sessions — select type (regular/mid-season/end-season/tryout), select players, see evaluation status (due dates, last evaluated). Launches player-evaluations.
- **Required params:** None
- **Optional params:** `teamId`
- **Role visibility:** Coach
- **Key navigation outbound:**
  - Back → `router.back()` (line 168)
  - Start evaluation → `/player-evaluations?teamId=${id}&type=${type}&playerIds=...` (lines 125, 134)
- **Supabase tables touched:** None directly (uses `getTeamEvaluationStatus` service)
- **Overlapping/related screens:** `player-evaluations.tsx` (evaluation form), `player-evaluation.tsx` (single player eval)
- **Identity notes:** Session setup screen — orchestrates multi-player evaluation workflow.
- **Lines of code:** 573

---

#### `app/family-gallery.tsx`
- **Screen name shown to user:** (delegated to component)
- **Route:** `/family-gallery`
- **Purpose:** Wrapper that renders `FamilyGallery` component — full-screen swipeable gallery of parent's children.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Parent
- **Key navigation outbound:** None (delegated)
- **Supabase tables touched:** None (delegated to component)
- **Overlapping/related screens:** `child-detail.tsx`, `my-kids.tsx`
- **Identity notes:** Thin wrapper — 10 lines. All logic in component.
- **Lines of code:** 10

---

#### `app/family-payments.tsx`
- **Screen name shown to user:** (delegated to component)
- **Route:** `/family-payments`
- **Purpose:** Wrapper that renders `ParentPaymentsScreen` component for parent payment management.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Parent
- **Key navigation outbound:** None (delegated)
- **Supabase tables touched:** None (delegated to component)
- **Overlapping/related screens:** `payments.tsx` (admin payment management)
- **Identity notes:** Thin wrapper — 6 lines. All logic in `components/payments-parent`.
- **Lines of code:** 6

---

#### `app/game-day-command.tsx`
- **Screen name shown to user:** "Game Day Command Center"
- **Route:** `/game-day-command`
- **Purpose:** 4-page live match workflow: Page 0 = Game Prep/Lineup, Page 1 = Live Match, Page 2 = End Set/End Match, Page 3 = Post-Game Summary. Header with page dots, sync indicator. Wraps MatchProvider.
- **Required params:** `eventId` + `teamId` + `opponent` (OR `matchId` for resume)
- **Optional params:** See required — alternative paths
- **Role visibility:** Coach
- **Key navigation outbound:**
  - Back → `router.back()` (line 73)
- **Supabase tables touched:** None directly (delegated to page components and MatchProvider)
- **Overlapping/related screens:** `game-prep.tsx` (older live scoring), `game-prep-wizard.tsx` (pre-match), `game-results.tsx` (post-game)
- **Identity notes:** Newer live match management — Phase B feature. Distinct from `game-prep.tsx` which has its own inline live scoring.
- **Lines of code:** 223

---

#### `app/game-prep-wizard.tsx`
- **Screen name shown to user:** "GAME PREP"
- **Route:** `/game-prep-wizard`
- **Purpose:** 3-step pre-match wizard: Step 1 = Review RSVPs (with reminder button), Step 2 = Mark attendance, Step 3 = Build lineup. Progress bar. Stores attendance and launches lineup-builder.
- **Required params:** None
- **Optional params:** `eventId`, `teamId`
- **Role visibility:** Coach
- **Key navigation outbound:**
  - Lineup builder → `/lineup-builder?eventId=${id}&teamId=${id}` (line 500)
  - Back → `router.back()` (lines 515, 536, 1046)
- **Supabase tables touched:**
  - READS: `team_staff` (line 134), `coaches` (line 143), `teams` (line 150), `schedule_events` (lines 164, 189 — next game + by ID), `team_players` (line 211), `event_rsvps` (line 211), `event_attendance` (line 211), `game_lineups` (lines 211, 331), `schedule_events` (line 289 — recent for patterns), `event_attendance` (line 303 — past attendance patterns), `player_guardians` (line 373 — for reminders)
  - WRITES: `notifications` (line 395 — RSVP reminders), `event_attendance` (lines 458, 470 — delete + insert batch)
- **Overlapping/related screens:** `game-day-command.tsx` (live match), `lineup-builder.tsx`, `attendance.tsx`
- **Identity notes:** Complex wizard with attendance pattern insights from previous events. Heavy data loading — 12+ Supabase reads.
- **Lines of code:** 1597

---

#### `app/game-prep.tsx`
- **Screen name shown to user:** "Game Prep" / live scoring views
- **Route:** `/game-prep`
- **Purpose:** Multi-mode game management: list (upcoming games), live scoring (with court visualization, undo stack, set tracking), stats entry. Emergency contacts, shoutouts, scoring formats.
- **Required params:** None
- **Optional params:** `startLive` (string — jump to live mode)
- **Role visibility:** Coach
- **Key navigation outbound:**
  - Game results → `/game-results?eventId=${id}&teamId=${id}` (lines 819, 1264)
  - Lineup builder → `/lineup-builder?eventId=${id}&teamId=${id}` (line 1333)
- **Supabase tables touched:**
  - WRITES: `team_posts` (line 713 — shoutout), `game_player_stats` (lines 781-782, 992-993 — delete + insert stats), `schedule_events` (line 997 — update game record)
- **Overlapping/related screens:** `game-day-command.tsx` (newer live match), `game-results.tsx`, `lineup-builder.tsx`
- **Identity notes:** Massive file. Older live scoring system that predates `game-day-command.tsx`. Both exist — consolidation candidate.
- **Lines of code:** 2600+ (partial read — styles truncated)

---

#### `app/game-recap.tsx`
- **Screen name shown to user:** "GAME RECAP"
- **Route:** `/game-recap`
- **Purpose:** Comprehensive game statistics — MVP highlights, set scores, attendance summary, and personal performance stats for individual players.
- **Required params:** `eventId` (string)
- **Optional params:** `playerId` (string — shows that player's performance; otherwise resolves from parent account)
- **Role visibility:** Parent / Player
- **Key navigation outbound:**
  - Back → `router.back()` (lines 290, 309, 323, 341)
- **Supabase tables touched:**
  - READS: `schedule_events` (line 130), `game_player_stats` (line 135), `event_attendance` (line 139), `teams` (line 150), `players` (lines 163, 179 — roster + parent resolution)
- **Overlapping/related screens:** `game-results.tsx` (similar concept, different layout), `my-stats.tsx`
- **Identity notes:** Two similar game recap screens exist: this one and `game-results.tsx`. Different layouts, overlapping data.
- **Lines of code:** 975

---

#### `app/game-results.tsx`
- **Screen name shown to user:** "Game Recap"
- **Route:** `/game-results`
- **Purpose:** Game result summary with team scores, set-by-set breakdown, and sport-aware player statistics.
- **Required params:** `eventId` (string)
- **Optional params:** None
- **Role visibility:** Parent / Player / Coach
- **Key navigation outbound:**
  - Back → `router.back()` (lines 276, 297)
- **Supabase tables touched:**
  - READS: `schedule_events` (line 90 — with nested teams), `seasons` (line 107 — sport lookup), `player_guardians` (line 119), `players` (lines 125, 132 — parent resolution via 3 paths), `game_player_stats` (line 152)
- **Overlapping/related screens:** `game-recap.tsx` (overlapping — different layout), `my-stats.tsx`
- **Identity notes:** Sport-aware stat display (volleyball-specific columns). Triple child resolution pattern.
- **Lines of code:** 673

---

#### `app/help.tsx`
- **Screen name shown to user:** "Help & Support"
- **Route:** `/help`
- **Purpose:** FAQ section with app version display and contact support information.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All roles
- **Key navigation outbound:**
  - Back → `router.back()` (line 71)
- **Supabase tables touched:** None
- **Overlapping/related screens:** `web-features.tsx` (links to web portal)
- **Identity notes:** Static content — no dynamic data.
- **Lines of code:** 268

---

#### `app/invite-friends.tsx`
- **Screen name shown to user:** "Invite Friends"
- **Route:** `/invite-friends`
- **Purpose:** Share organization's registration link via multiple channels (SMS, WhatsApp, Email, clipboard).
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All authenticated roles
- **Key navigation outbound:**
  - Back → `router.back()` (line 98)
- **Supabase tables touched:** None (uses organization from auth context)
- **Overlapping/related screens:** None
- **Identity notes:** Uses native Share API with formatted invite message.
- **Lines of code:** 435

---

#### `app/lineup-builder.tsx`
- **Screen name shown to user:** "LINEUP BUILDER"
- **Route:** `/lineup-builder`
- **Purpose:** Sport-aware lineup builder — assign players to court positions, manage substitutions, preview rotations (volleyball-specific), save per-set lineup configurations.
- **Required params:** None (auto-resolves team; shows game selector if no eventId)
- **Optional params:** `eventId`, `teamId`
- **Role visibility:** Coach / Admin
- **Key navigation outbound:**
  - Back → `router.back()` (lines 290, 837, 961)
- **Supabase tables touched:**
  - READS: `team_staff` (line 232), `coaches` (line 248 — fallback), `teams` (line 255 — fallback), `schedule_events` (line 284 — upcoming games), `team_players` (line 306 — roster with nested players), `game_lineups` (line 344 — existing lineup), `event_rsvps` (line 414 — confirmed RSVPs)
  - WRITES: `game_lineups` (line 656 — delete existing, line 711 — insert all lineup records)
- **Overlapping/related screens:** `game-prep-wizard.tsx` (launches this), `game-day-command.tsx`
- **Identity notes:** Volleyball court visualization with drag-drop player placement. 2,476 lines — one of the largest screens.
- **Lines of code:** 2476

---

#### `app/my-kids.tsx`
- **Screen name shown to user:** "My Kids"
- **Route:** `/my-kids`
- **Purpose:** Parent dashboard showing registered children, team assignments, payment status, outstanding balances, next events, and quick action buttons.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Parent
- **Key navigation outbound:**
  - Back → `router.back()` (line 223)
  - Pay → `/family-payments` (lines 242, 377)
  - Schedule → `/(tabs)/schedule` (line 360)
  - Chat → `/(tabs)/chats` (line 368)
- **Supabase tables touched:**
  - READS: `players` (line 89 — with nested team_players/teams), `payments` (line 125 — unpaid), `schedule_events` (line 137 — next 5 events)
- **Overlapping/related screens:** `parent-my-stuff.tsx` (richer parent dashboard), `child-detail.tsx`
- **Identity notes:** Quick-action cards with payment status prominently displayed.
- **Lines of code:** 798

---

#### `app/my-stats.tsx`
- **Screen name shown to user:** "MY STATS"
- **Route:** `/my-stats`
- **Purpose:** ESPN-style personal statistics dashboard — season summary, personal bests, game-by-game history, skill ratings, drill-down modal, evaluation timeline.
- **Required params:** None
- **Optional params:** `playerId` (string), `highlightStat` (string — auto-open drill-down)
- **Role visibility:** Player / Parent
- **Key navigation outbound:**
  - Game detail → `/game-results?eventId=${id}` (line 593)
  - Back → `router.back()` (lines 815, 833, 852)
- **Supabase tables touched:**
  - READS: `players` (lines 151, 168, 190 — multiple resolution paths), `player_guardians` (line 183), `seasons` (line 219 — sport), `team_players` (line 232), `player_season_stats` (lines 245, 273 — personal + league-wide for ranking), `game_player_stats` (line 253 — game-by-game), `schedule_events` (line 262 — conditional, game results), `player_skill_ratings` (line 279), `player_skills` (line 287)
- **Overlapping/related screens:** `game-results.tsx`, `game-recap.tsx`, `player-card.tsx`
- **Identity notes:** 12 separate Supabase reads. Sport-aware stat columns. League-wide ranking calculation.
- **Lines of code:** 1503

---

#### `app/my-waivers.tsx`
- **Screen name shown to user:** "My Waivers"
- **Route:** `/my-waivers`
- **Purpose:** Display signed waivers and legal documents for all children. Sources from both `waiver_signatures` (newer) and `registrations` (legacy).
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Parent
- **Key navigation outbound:**
  - Back → `router.back()` (line 287)
- **Supabase tables touched:**
  - READS: `players` (lines 74, 109 — by parent_account_id + by email), `player_guardians` (line 84 — with nested players), `waiver_signatures` (line 137 — with nested waiver_template), `registrations` (line 160 — legacy waivers)
- **Overlapping/related screens:** `parent-my-stuff.tsx` (shows waiver summary)
- **Identity notes:** Triple child resolution. Shows both modern (waiver_signatures) and legacy (registrations.waivers_accepted) waivers.
- **Lines of code:** 622

---

#### `app/notification-preferences.tsx`
- **Screen name shown to user:** "Notification Preferences"
- **Route:** `/notification-preferences`
- **Purpose:** Toggle notification types (chat, schedule, payments, announcements, games, volunteers). Dual persistence: AsyncStorage + Supabase profiles.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All roles
- **Key navigation outbound:**
  - Back → `router.back()` (line 142)
- **Supabase tables touched:**
  - WRITES: `profiles` (line 128 — update notification_preferences JSON column)
- **Overlapping/related screens:** `notification.tsx` (notification list), `settings.tsx`
- **Identity notes:** Dual persistence — AsyncStorage for local quick-read, Supabase for server-side push notification filtering.
- **Lines of code:** 285

---

#### `app/notification.tsx`
- **Screen name shown to user:** "Notifications"
- **Route:** `/notification`
- **Purpose:** Notification feed displaying all notifications with type-specific icons, timestamps, read status, mark-all-read.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All roles
- **Key navigation outbound:**
  - Back → `router.back()` (line 110)
- **Supabase tables touched:** None directly (uses `fetchNotifications`, `markNotificationRead`, `markAllNotificationsRead` from `@/lib/notifications`)
- **Overlapping/related screens:** `notification-preferences.tsx`
- **Identity notes:** Helper functions in `@/lib/notifications` handle all Supabase calls.
- **Lines of code:** 220

---

#### `app/org-directory.tsx`
- **Screen name shown to user:** "Find Organizations"
- **Route:** `/org-directory`
- **Purpose:** Browse and search available organizations by name, city, or state. Displays logos, contact info, and detailed modal.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All roles
- **Key navigation outbound:**
  - Back → `router.back()` (line 153)
- **Supabase tables touched:**
  - READS: `organizations` (line 68 — active orgs ordered by name)
- **Overlapping/related screens:** `org-settings.tsx` (admin edit version)
- **Identity notes:** Public-facing org browser.
- **Lines of code:** 258

---

#### `app/org-settings.tsx`
- **Screen name shown to user:** "Org Settings"
- **Route:** `/org-settings`
- **Purpose:** Edit organization profile (name, contact email, phone, description).
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin (uses profile.current_organization_id)
- **Key navigation outbound:**
  - Back → `router.back()` (line 100)
  - External → `Linking.openURL('https://thelynxapp.com')` (line 142)
- **Supabase tables touched:**
  - READS: `organizations` (line 47 — by current_organization_id)
  - WRITES: `organizations` (line 66 — update name/email/phone/description)
- **Overlapping/related screens:** `org-directory.tsx` (browse), `settings.tsx` (general settings)
- **Identity notes:** Minimal settings screen — 4 editable fields.
- **Lines of code:** 196

---

#### `app/parent-registration-hub.tsx`
- **Screen name shown to user:** "Registration Hub"
- **Route:** `/parent-registration-hub`
- **Purpose:** Parents manage player registrations — open registrations tab, "My Registrations" tab, invite code joining (both org invitations and team codes).
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Parent
- **Key navigation outbound:**
  - Back → `router.back()` (line 367)
  - Register → `/register/${season.id}` (line 453)
- **Supabase tables touched:**
  - READS: `user_roles` (line 96), `seasons` (lines 106, 196), `organizations` (lines 115, 204), `sports` (line 124), `player_guardians` (line 155), `players` (lines 161, 169), `registrations` (line 179)
  - WRITES: `user_roles` (lines 264, 304 — upsert), `invitations` (line 272 — update status), `team_invite_codes` (line 312 — update current_uses)
- **Overlapping/related screens:** `registration-hub.tsx` (admin version), `registration-start.tsx` (simpler season selector)
- **Identity notes:** Handles both org-level invitations and team-level invite codes. Different from admin `registration-hub.tsx`.
- **Lines of code:** 836

---

#### `app/payment-reminders.tsx`
- **Screen name shown to user:** "Payment Reminders"
- **Route:** `/payment-reminders`
- **Purpose:** Admin sends bulk payment reminder notifications to families with outstanding balances. Two-step wizard: select families → preview & send.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only (isAdmin guard)
- **Key navigation outbound:**
  - Back → `router.back()` (lines 248, 273, 350)
- **Supabase tables touched:**
  - READS: `players` (line 79 — by season), `payments` (line 87 — unpaid by season)
- **Overlapping/related screens:** `payments.tsx` (payment management), `family-payments.tsx` (parent view)
- **Identity notes:** Read-only data load then notification send. Does not create payment records.
- **Lines of code:** 541

---

#### `app/player-card.tsx`
- **Screen name shown to user:** "MY PLAYER CARD"
- **Route:** `/player-card`
- **Purpose:** Full-screen FIFA-style trading card with player stats, OVR rating, XP level, and skill bars. Auto-resolves player if none provided.
- **Required params:** None (auto-resolves)
- **Optional params:** `playerId`, `childId`
- **Role visibility:** Player / Parent
- **Key navigation outbound:**
  - Back → `router.back()` (line 197)
  - Stats → `/my-stats?playerId=${id}` (line 223)
- **Supabase tables touched:**
  - READS: `team_players` (lines 73, 122 — player lookup + team), `players` (lines 82, 113 — by parent_account_id + by ID), `player_guardians` (line 91), `player_season_stats` (line 133), `player_achievements` (line 145 — count)
- **Overlapping/related screens:** `my-stats.tsx`, `roster.tsx`, `child-detail.tsx`
- **Identity notes:** Trading card visual — gamified player identity. Multiple resolution paths for finding the player.
- **Lines of code:** 267

---

#### `app/player-evaluation.tsx`
- **Screen name shown to user:** "Select a Player" (step 1) / skill rating cards (step 2)
- **Route:** `/player-evaluation`
- **Purpose:** Coach rates individual player on 9 skills (1-10 scale) with per-skill notes and overall summary. Saves to player_skill_ratings and player_evaluations.
- **Required params:** None
- **Optional params:** `playerId`, `teamId`
- **Role visibility:** Coach (via team_staff query)
- **Key navigation outbound:**
  - Back → `router.back()` (line 251)
- **Supabase tables touched:**
  - READS: `team_staff` (line 116 — active staff), `players` (lines 128, 139 — roster + pre-selected), `player_skill_ratings` (line 157 — last rating)
  - WRITES: `player_skill_ratings` (line 225 — upsert), `player_evaluations` (line 230 — insert)
- **Overlapping/related screens:** `player-evaluations.tsx` (multi-player swipe), `evaluation-session.tsx` (session setup)
- **Identity notes:** Single-player evaluation. `player-evaluations.tsx` is the multi-player swipe-through version.
- **Lines of code:** 860

---

#### `app/player-evaluations.tsx`
- **Screen name shown to user:** "Player Evaluations"
- **Route:** `/player-evaluations`
- **Purpose:** Coach swipe-through roster evaluation with 1-5 UI blocks per skill. Auto-saves on navigation with progress tracking. Tablet landscape split-panel support.
- **Required params:** None (resolves team from team_staff)
- **Optional params:** `teamId`, `playerId` (jump to), `type` (eval type), `playerIds` (filter roster — comma-separated)
- **Role visibility:** Coach (via team_staff query)
- **Key navigation outbound:**
  - Back → `router.back()` (lines 327, 379, 396)
- **Supabase tables touched:**
  - READS: `team_staff` (line 108), `players` (line 125 — with optional .in() filter), `player_skill_ratings` (line 144 — existing ratings batch)
- **Overlapping/related screens:** `player-evaluation.tsx` (single player), `evaluation-session.tsx` (setup)
- **Identity notes:** Multi-player version — swipe between players with progress indicator. Different from single-player `player-evaluation.tsx`.
- **Lines of code:** 1040

---

#### `app/player-goals.tsx`
- **Screen name shown to user:** "Development"
- **Route:** `/player-goals`
- **Purpose:** Track player development with goals (target value, deadline, status) and session notes (tagged by skill area). Coaches add/manage goals and notes per player per season.
- **Required params:** `playerId` (string)
- **Optional params:** None
- **Role visibility:** Coach
- **Key navigation outbound:**
  - Back → `router.back()` (line 254)
- **Supabase tables touched:**
  - READS: `players` (line 109), `team_players` (line 117 — with nested teams), `player_goals` (line 131 — by player + season), `player_coach_notes` (line 141)
  - WRITES: `player_goals` (line 172 — insert), `player_coach_notes` (line 196 — insert)
- **Overlapping/related screens:** `child-detail.tsx` (links here), `player-evaluations.tsx`
- **Identity notes:** Goal tracking with category tags. Coach notes can be private.
- **Lines of code:** 657

---

#### `app/privacy-policy.tsx`
- **Screen name shown to user:** "Privacy Policy"
- **Route:** `/privacy-policy`
- **Purpose:** Display privacy policy with 8 sections. Shows "I Understand" button when accessed from signup flow.
- **Required params:** None
- **Optional params:** `fromSignup` (boolean — shows confirmation button)
- **Role visibility:** All (including unauthenticated)
- **Key navigation outbound:**
  - Back → `router.back()` (lines 125, 162)
- **Supabase tables touched:** None
- **Overlapping/related screens:** `terms-of-service.tsx`, `data-rights.tsx`
- **Identity notes:** Static legal content. Dual mode: standalone view or modal-like with confirmation.
- **Lines of code:** 279

---

#### `app/profile.tsx`
- **Screen name shown to user:** "My Profile"
- **Route:** `/profile`
- **Purpose:** User profile management — avatar upload, full name, phone, emergency contact, password change, data rights link, account deletion.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All authenticated roles
- **Key navigation outbound:**
  - Back → `router.back()` (line 258)
  - Data rights → `/data-rights` (line 414)
- **Supabase tables touched:**
  - READS: `profiles` (line 64 — emergency contact fields)
  - WRITES: `storage.media` (line 109 — avatar upload), `profiles` (lines 126, 154, 172, 229 — avatar_url, name/phone, emergency contact, deletion_requested), `auth.updateUser` (line 201 — password change)
- **Overlapping/related screens:** `coach-profile.tsx` (coach-specific), `me.tsx` (profile hub)
- **Identity notes:** Generic profile for all roles. Coach-specific profile is separate at `coach-profile.tsx`.
- **Lines of code:** 498

---

#### `app/registration-hub.tsx`
- **Screen name shown to user:** "Registration Hub"
- **Route:** `/registration-hub`
- **Purpose:** Admin dashboard for managing season registrations — bulk approve/deny/waitlist, assign to teams, filtering, searching, sorting, waiver compliance tracking.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only (isAdmin guard)
- **Key navigation outbound:**
  - Back → `router.back()` (line 184)
- **Supabase tables touched:**
  - READS: `sports` (line 230), `seasons` (line 238), `players` (lines 248, 318), `registrations` (line 292 — with nested players), `payments` (line 346 — per registration), `team_players` (lines 355, 418 — assignment + count), `waiver_templates` (line 431), `waiver_signatures` (line 444), `teams` (line 410), `schedule_events` (line 671 — future events for RSVP creation)
  - WRITES: `registrations` (lines 493, 523, 620, 635 — insert/update status), `payments` (line 587 — insert fees), `team_players` (line 604 — upsert assignment), `event_rsvps` (line 685 — upsert for future events)
- **Overlapping/related screens:** `parent-registration-hub.tsx` (parent version), `registration-start.tsx` (season selector)
- **Identity notes:** Very large screen (1500+ lines). Full registration workflow with team assignment + automatic fee generation + RSVP creation. N+1 patterns in detail expansion.
- **Lines of code:** 1500+

---

#### `app/registration-start.tsx`
- **Screen name shown to user:** "Register Your Child"
- **Route:** `/registration-start`
- **Purpose:** Season selector for parent registration. Shows open season cards with deadline, fees, age groups. Single season auto-redirects.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Parent
- **Key navigation outbound:**
  - Auto-redirect (single season) → `/register/${id}` (line 107 — router.replace)
  - Select season → `/register/${season.id}` (line 222)
  - Back → `router.back()` (line 172)
- **Supabase tables touched:**
  - READS: `user_roles` (line 81), `seasons` (line 94 — open registration), `organizations` (line 113), `age_groups` (line 121)
- **Overlapping/related screens:** `parent-registration-hub.tsx` (richer hub with My Registrations tab), `registration-hub.tsx` (admin)
- **Identity notes:** Simpler than `parent-registration-hub.tsx` — just a season picker that routes to registration form.
- **Lines of code:** 474

---

#### `app/report-viewer.tsx`
- **Screen name shown to user:** (not visible — wrapper)
- **Route:** `/report-viewer`
- **Purpose:** Wrapper that renders `ReportViewerScreen` component.
- **Required params:** `reportId`, `reportName` (from route params)
- **Optional params:** None
- **Role visibility:** Admin
- **Key navigation outbound:** None (delegated)
- **Supabase tables touched:** None (delegated)
- **Overlapping/related screens:** `ReportViewerScreen` component, `ReportsScreen`, `reports-tab.tsx`
- **Identity notes:** 3-line re-export wrapper.
- **Lines of code:** 3

---

#### `app/roster.tsx`
- **Screen name shown to user:** "TEAM ROSTER"
- **Route:** `/roster`
- **Purpose:** Full-screen carousel roster view with trading card style. Multi-team selector for coaches/admins. Auto-resolves teams from user roles.
- **Required params:** None (auto-resolves)
- **Optional params:** `teamId`
- **Role visibility:** Coach / Parent / Player (multi-path resolution)
- **Key navigation outbound:**
  - Back → `router.back()` (line 285)
- **Supabase tables touched:**
  - READS: `team_staff` (line 76), `coaches` (line 90 — with nested team_coaches/teams), `players` (lines 109, 139 — parent resolution), `player_guardians` (line 114), `team_players` (line 125 — parent's child teams), `teams` (lines 157, 177 — by ID), `team_players` (line 188 — roster with nested players), `player_season_stats` (line 204 — batch stats)
- **Overlapping/related screens:** `players.tsx` (grid/list), `coach-roster.tsx` (re-export of players), `team-roster.tsx` (simpler flat list)
- **Identity notes:** 4 different code paths for team resolution (staff, coaches, parent, player). Trading card visual different from `players.tsx` grid view.
- **Lines of code:** 424

---

#### `app/season-archives.tsx`
- **Screen name shown to user:** "Season Archives"
- **Route:** `/season-archives`
- **Purpose:** Completed/inactive seasons with summary stats (teams, players, games, revenue) and expandable detail sections.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin
- **Key navigation outbound:**
  - Back → `router.back()` (line 235)
- **Supabase tables touched:**
  - READS: `seasons` (line 64 — completed/closed/inactive), `teams` (lines 76, 149 — by season batch + per-season detail), `team_players` (lines 92, 158 — batch counts), `payments` (line 102), `schedule_events` (lines 108, 173 — game count + game details)
- **Overlapping/related screens:** `season-settings.tsx`, `season-reports.tsx`
- **Identity notes:** Historical view — only shows non-active seasons.
- **Lines of code:** 423

---

#### `app/season-progress.tsx`
- **Screen name shown to user:** "Season Journey"
- **Route:** `/season-progress`
- **Purpose:** Timeline view of player's season milestones — games played, badges earned, automatic achievements.
- **Required params:** None
- **Optional params:** `playerId`
- **Role visibility:** Player / Parent
- **Key navigation outbound:**
  - Back → `router.back()` (line 268)
- **Supabase tables touched:**
  - READS: `player_guardians` (line 76), `players` (line 85 — parent resolution), `team_players` (line 102), `schedule_events` (line 113 — completed games), `player_badges` (line 151)
- **Overlapping/related screens:** `standings.tsx`, `player-card.tsx`, `achievements.tsx`
- **Identity notes:** Visual timeline with milestone markers. Combines game results with badge awards chronologically.
- **Lines of code:** 408

---

#### `app/season-reports.tsx`
- **Screen name shown to user:** "SEASON REPORTS"
- **Route:** `/season-reports`
- **Purpose:** Multi-card admin dashboard — games, financials, players, registrations, waiver compliance, roster fill, upcoming events.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin
- **Key navigation outbound:**
  - Schedule → `/(tabs)/admin-schedule` (lines 201, 300)
  - Payments → `/(tabs)/payments` (line 216)
  - Teams → `/(tabs)/admin-teams` (lines 231, 260, 276)
  - Registration hub → `/registration-hub` (line 246)
- **Supabase tables touched:**
  - READS: `players` (lines 67, 70 — count + IDs), `teams` (lines 68, 135 — count + details), `schedule_events` (lines 69, 163 — completed games + upcoming), `payments` (line 71), `registrations` (lines 72-74 — by status), `team_players` (lines 86, 146 — roster counts), `waiver_templates` (line 102), `waiver_signatures` (line 110)
- **Overlapping/related screens:** `reports-tab.tsx`, `ReportsScreen` component, `manage.tsx` (admin dashboard)
- **Identity notes:** Overview dashboard with links to detailed management screens. Different from `ReportsScreen` which is the detailed report viewer.
- **Lines of code:** 384

---

#### `app/season-settings.tsx`
- **Screen name shown to user:** "SEASON SETTINGS"
- **Route:** `/season-settings`
- **Purpose:** Complete season configuration — basic info, fees, team rosters, age groups, team management.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only (isAdmin guard)
- **Key navigation outbound:**
  - Back → `router.back()` (lines 398-455)
  - Teams → `/(tabs)/teams` (lines 609, 645)
- **Supabase tables touched:**
  - READS: `seasons` (line 136), `sports` (line 140), `age_groups` (line 145), `teams` (line 148), `team_players` (line 154 — batch counts)
  - WRITES: `seasons` (line 186 — update fields), `age_groups` (lines 319, 341 — insert/delete)
- **Overlapping/related screens:** `season-setup-wizard.tsx` (creation), `season-archives.tsx` (historical), `team-management.tsx`
- **Identity notes:** Edit mode for existing season. `season-setup-wizard.tsx` is creation mode.
- **Lines of code:** 936

---

#### `app/season-setup-wizard.tsx`
- **Screen name shown to user:** "New Season"
- **Route:** `/season-setup-wizard`
- **Purpose:** 5-step guided season creation wizard: Basics → Teams → Registration → Schedule → Review.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin
- **Key navigation outbound:**
  - Back → `router.back()` (lines 214, 262)
- **Supabase tables touched:**
  - READS: `teams` (line 89 — existing org teams for cloning)
  - WRITES: `seasons` (line 174 — insert), `teams` (line 197 — insert batch)
- **Overlapping/related screens:** `season-settings.tsx` (edit mode)
- **Identity notes:** Creation wizard — `season-settings.tsx` is the edit counterpart.
- **Lines of code:** 993

---

#### `app/standings.tsx`
- **Screen name shown to user:** "STANDINGS"
- **Route:** `/standings`
- **Purpose:** Dual-tab view: Team Standings (W-L record, point differential) and Player Leaderboards. Highlights current user's team/children.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All roles (with contextual highlighting)
- **Key navigation outbound:**
  - Player card → `/player-card?playerId=${id}` (line 279)
  - Back → `router.back()` (line 411)
- **Supabase tables touched:**
  - READS: `teams` (line 91), `seasons` (line 99 — sport), `schedule_events` (line 118 — completed games for W-L calc), `players` (lines 197, 216 — parent children for highlighting), `player_guardians` (line 210), `team_staff` (line 232 — coach team for highlighting)
- **Overlapping/related screens:** `season-progress.tsx`, `player-card.tsx`, `LeaderboardScreen` component
- **Identity notes:** Calculates standings from schedule_events game results rather than using a standings table. Real-time computation.
- **Lines of code:** 682

---

#### `app/team-gallery.tsx`
- **Screen name shown to user:** "Gallery"
- **Route:** `/team-gallery`
- **Purpose:** Filterable photo/video grid from team wall posts with full-screen viewer.
- **Required params:** `teamId`, `teamName`
- **Optional params:** None
- **Role visibility:** Team members (coach/parent/player)
- **Key navigation outbound:**
  - Back → `router.back()` (lines 234, 252, 288)
- **Supabase tables touched:**
  - READS: `team_posts` (line 96 — with nested profiles, filtered by team_id + is_published + has media)
- **Overlapping/related screens:** `team-wall.tsx`
- **Identity notes:** Photo-only view extracted from team wall posts.
- **Lines of code:** 367

---

#### `app/team-management.tsx`
- **Screen name shown to user:** "TEAM MANAGEMENT"
- **Route:** `/team-management`
- **Purpose:** Complete team CRUD with player roster management, coach assignment, waiver tracking, jersey management, and chat sync.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only (isAdmin guard)
- **Key navigation outbound:**
  - Back → `router.back()` (line 499)
  - Teams → `/(tabs)/teams` (lines 609, 645)
  - Jersey management → `/(tabs)/jersey-management` (line 692)
- **Supabase tables touched:**
  - READS: `teams` (line 120), `age_groups` (line 121), `players` (line 122), `coaches` (line 123), `team_players` (line 124), `team_coaches` (line 125), `schedule_events` (line 126), `waiver_templates` (line 147), `waiver_signatures` (line 164)
  - WRITES: `teams` (lines 255, 289 — insert/update), `chat_channels` + `channel_members` + `team_players` + `team_coaches` + `teams` (lines 309-316 — cascading delete), `team_players` + `players` (lines 340-344 — assignment), `team_coaches` (lines 406-415 — insert/delete)
- **Overlapping/related screens:** `admin-teams.tsx` (simpler version), `teams.tsx` (another team screen), `season-settings.tsx`
- **Identity notes:** Third team management screen. Overlaps with `admin-teams.tsx` and `teams.tsx`. Major consolidation candidate.
- **Lines of code:** 937

---

#### `app/team-roster.tsx`
- **Screen name shown to user:** "{teamName} Roster"
- **Route:** `/team-roster`
- **Purpose:** Simple flat list of team players with photos, positions, jersey numbers.
- **Required params:** `teamId`
- **Optional params:** None
- **Role visibility:** Team members
- **Key navigation outbound:**
  - Player detail → `/child-detail?playerId=${id}` (line 87)
  - Back → `router.back()` (lines 130, 139)
- **Supabase tables touched:**
  - READS: `teams` (line 45 — name), `team_players` (line 52 — with nested players)
- **Overlapping/related screens:** `roster.tsx` (carousel view), `players.tsx` (grid/list), `coach-roster.tsx` (re-export)
- **Identity notes:** Simplest of 4+ roster screens. Flat list with player photos.
- **Lines of code:** 265

---

#### `app/team-wall.tsx`
- **Screen name shown to user:** "Team Wall"
- **Route:** `/team-wall`
- **Purpose:** Team feed with Achievements and Stats tabs.
- **Required params:** `teamId`
- **Optional params:** None
- **Role visibility:** Team members
- **Key navigation outbound:** None directly
- **Supabase tables touched:**
  - READS: `player_badges` (line 18 — by team), `team_players` (line 59), `player_stats` (line 67 — by player IDs)
- **Overlapping/related screens:** `team-gallery.tsx` (media subset), `connect.tsx` (team hub with wall)
- **Identity notes:** Lightweight team feed. Uses `player_badges` and `player_stats` tables.
- **Lines of code:** 125

---

#### `app/terms-of-service.tsx`
- **Screen name shown to user:** "Terms of Service"
- **Route:** `/terms-of-service`
- **Purpose:** Legal document display with 10 sections. Shows "I Understand" button when accessed from signup.
- **Required params:** None
- **Optional params:** `fromSignup` (boolean — shows confirmation button)
- **Role visibility:** All (including unauthenticated)
- **Key navigation outbound:**
  - Back → `router.back()` (lines 131, 163)
- **Supabase tables touched:** None
- **Overlapping/related screens:** `privacy-policy.tsx`, `welcome.tsx` (links here)
- **Identity notes:** Static legal content. Mirrors `privacy-policy.tsx` dual-mode pattern.
- **Lines of code:** 273

---

#### `app/users.tsx`
- **Screen name shown to user:** "User Management"
- **Route:** `/users`
- **Purpose:** Admin panel for approving pending users, managing roles, suspending accounts with filtering.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only (isAdmin guard)
- **Key navigation outbound:**
  - Back → `router.back()` (line 454)
- **Supabase tables touched:**
  - READS: `profiles` (line 86 — all org users), `user_roles` (line 103 — by org)
  - WRITES: `profiles` (lines 151, 312-337 — approve/suspend), `user_roles` (lines 158, 249, 255 — activate/toggle/insert), `players` (line 165 — update status), `coaches` (line 172 — update status), multiple DELETE ops (lines 202-224 — user removal cascade)
- **Overlapping/related screens:** `settings.tsx` (has basic user management), `pending-approval.tsx` (user side)
- **Identity notes:** Full CRUD user management. Cascading delete removes user_roles, players, coaches, and profiles.
- **Lines of code:** 850

---

#### `app/venue-manager.tsx`
- **Screen name shown to user:** "Venue Manager"
- **Route:** `/venue-manager`
- **Purpose:** Coming-soon placeholder directing users to web dashboard.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin
- **Key navigation outbound:**
  - Back → `router.back()` (line 18)
- **Supabase tables touched:** None
- **Overlapping/related screens:** None
- **Identity notes:** Placeholder — 73 lines. Functionality only on web.
- **Lines of code:** 73

---

#### `app/volunteer-assignment.tsx`
- **Screen name shown to user:** "Volunteer Assignment"
- **Route:** `/volunteer-assignment`
- **Purpose:** 3-step workflow: Select Event → Assign Volunteer Roles (scorekeeper, line judge, snack parent) → Confirm & Notify.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Coach / Admin
- **Key navigation outbound:**
  - Back → `router.back()` (lines 273, 670)
- **Supabase tables touched:**
  - READS: `team_staff` (line 154 — coach teams), `schedule_events` (line 169 — future events), `profiles` (line 204 — parent profiles), `event_volunteers` (line 210 — existing assignments)
  - WRITES: `event_volunteers` (line 334 — delete, line 360 — insert)
- **Overlapping/related screens:** `schedule.tsx` (inline volunteer info), `coach-schedule.tsx`
- **Identity notes:** Replaces old inline volunteer management. Standalone wizard.
- **Lines of code:** 1319

---

#### `app/web-features.tsx`
- **Screen name shown to user:** Dynamic (from `featureName` param)
- **Route:** `/web-features`
- **Purpose:** Placeholder card directing to web portal for features not yet available on mobile.
- **Required params:** `featureName`, `description`, `webUrl`
- **Optional params:** None
- **Role visibility:** Admin / Coach
- **Key navigation outbound:**
  - Back → `router.back()` (lines 50, 95)
  - External → `Linking.openURL(webUrl)` (line 41)
- **Supabase tables touched:** None
- **Overlapping/related screens:** `venue-manager.tsx` (another placeholder)
- **Identity notes:** Generic "not on mobile yet" screen. Drawer items for Form Builder, Waiver Editor, Payment Gateway route here.
- **Lines of code:** 229

<!-- SECTION: app/chat/ -->
### CHAT SCREENS

---

#### `app/chat/_layout.tsx`
- **Screen name shown to user:** (not visible — layout file)
- **Route:** `/chat/*`
- **Purpose:** Stack navigator container for chat screens. Transparent background, no headers.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All authenticated roles
- **Key navigation outbound:** None (layout only)
- **Supabase tables touched:** None
- **Overlapping/related screens:** `chats.tsx` (channel list), `coach-chat.tsx`, `parent-chat.tsx`
- **Identity notes:** Minimal layout — 15 lines.
- **Lines of code:** 15

---

#### `app/chat/[id].tsx`
- **Screen name shown to user:** Channel name (from channel data)
- **Route:** `/chat/[id]`
- **Purpose:** Full-featured chat room — real-time messaging, replies, reactions (7 emoji types), media attachments (photo/video/GIF), voice messages (record + playback), emoji picker, typing indicators, read receipts, member management (add/remove), channel info modal, message deletion, pinning. DM creation from member profiles.
- **Required params:** `id` (channel ID)
- **Optional params:** None
- **Role visibility:** All authenticated roles (membership-gated)
- **Key navigation outbound:**
  - Back → `router.back()` (line 971)
  - DM from profile → `/chat/[id]` (lines 719, 737 — create or open existing DM)
- **Supabase tables touched:**
  - READS: `chat_channels` (line 128 — channel info), `message_reactions` (line 160 — batch by message_ids), `message_attachments` (line 161 — batch by message_ids), `channel_members` (line 209 — update last_read)
  - WRITES: `channel_members` (lines 209, 248, 668, 733, 745 — update last_read, add members, leave channel), `typing_indicators` (lines 321-333 — insert/delete typing), `chat_messages` (lines 406, 533, 617, 676 — insert message, soft delete, forward, system message), `notifications` (line 426 — insert push notifications), `message_attachments` (lines 431, 621 — insert attachment), `message_reactions` (lines 522-523 — toggle reaction)
  - SUBSCRIBES: Real-time subscription on `chat_messages` (line 290)
- **Overlapping/related screens:** `chats.tsx` (channel list), `coach-chat.tsx`, `parent-chat.tsx` — all route here for actual messaging
- **Identity notes:** Feature-rich chat — voice messages using expo-audio, GIF picker, emoji-only detection for large rendering, moderation (delete, remove member). 1440 lines. All chat list screens route to this single message view.
- **Lines of code:** 1440

<!-- SECTION: app/register/ -->
### REGISTRATION SCREENS

---

#### `app/register/[seasonId].tsx`
- **Screen name shown to user:** "Registration Wizard"
- **Route:** `/register/[seasonId]`
- **Purpose:** 6-step player registration wizard: Step 1 = Children selection (returning children auto-detected), Step 2 = Player info, Step 3 = Parent/Guardian info, Step 4 = Emergency/Medical, Step 5 = Waivers (digital signature), Step 6 = Review & Submit.
- **Required params:** `seasonId` (from URL segment)
- **Optional params:** None
- **Role visibility:** Parent / Guardian
- **Key navigation outbound:**
  - Back/step navigation (internal step management)
  - Success → `/(tabs)` (on completion)
- **Supabase tables touched:**
  - READS: `player_parents` (line 287 — detect returning children), `families` (line 324 — pre-fill shared info), `invitations` (line 114 — validate codes), `team_invite_codes` (line 128 — validate team codes)
  - WRITES: `players` (insert/update), `families` (insert/update), `registrations` (insert), `waiver_signatures` (insert), various other tables for complete registration flow
- **Overlapping/related screens:** `registration-start.tsx` (season selector routes here), `parent-registration-hub.tsx` (parent hub), `registration-hub.tsx` (admin management)
- **Identity notes:** Largest file in the codebase (27,000+ lines). Handles returning family detection, digital waiver signatures, fee preview, and multi-child registration. Uses stepped wizard with slide animation.
- **Lines of code:** 27,804+

<!-- SECTION: components/ (screen-level) -->
### COMPONENT SCREENS

These are components that function as full screens but live in `components/` rather than `app/`. They are rendered by thin wrappers or by `DashboardRouter`.

---

#### `components/AdminHomeScroll.tsx`
- **Screen name shown to user:** "lynx" (compact header brand)
- **Route:** Rendered by `DashboardRouter` when role = admin
- **Purpose:** Admin dashboard — Smart Queue (urgent tasks), team health overview, payment snapshots, season management, achievement celebrations.
- **Required params:** None (uses `useAuth`, `useAdminHomeData` hooks)
- **Optional params:** None
- **Role visibility:** Admin only
- **Key navigation outbound:**
  - Players → `/(tabs)/players` (line 196)
  - Registration hub → `/registration-hub` (line 215)
  - Season wizard → `/season-setup-wizard` (line 263)
  - Achievements → `/achievements` (line 325)
- **Supabase tables touched:** None directly (data via `useAdminHomeData` hook + `getUnseenRoleAchievements`/`markAchievementsSeen` from achievement-engine)
- **Overlapping/related screens:** `manage.tsx` (admin Tab 2 — similar overview data), `season-reports.tsx`
- **Identity notes:** Smart Queue shows actionable items (pending registrations, unpaid fees, etc.). Data entirely via hooks.
- **Lines of code:** 547

---

#### `components/CoachHomeScroll.tsx`
- **Screen name shown to user:** "LYNX" (compact header)
- **Route:** Rendered by `DashboardRouter` when role = coach or coach_parent
- **Purpose:** Coach dashboard — event hero card, team health, RSVP summary, season leaderboard, action items, team engagement, achievement celebrations.
- **Required params:** None (uses `useAuth`, `useCoachHomeData` hooks)
- **Optional params:** None
- **Role visibility:** Coach only (also used for coach_parent)
- **Key navigation outbound:**
  - Notifications → `/notification` (lines 343, 435)
  - Roster → `/roster?teamId=${id}` (line 538)
  - Achievements → `/achievements` (line 646)
- **Supabase tables touched:** None directly (data via `useCoachHomeData` hook)
- **Overlapping/related screens:** `gameday.tsx` (Tab 2 — game-focused), `AdminHomeScroll` (admin version)
- **Identity notes:** Coach_parent users also see this (not ParentHomeScroll). Data via hooks.
- **Lines of code:** 902

---

#### `components/ParentHomeScroll.tsx`
- **Screen name shown to user:** "LYNX" (compact header)
- **Route:** Rendered by `DashboardRouter` when role = parent
- **Purpose:** Parent dashboard — dynamic contextual messages (RSVP/payment/chat alerts), family roster overview, event billboard, team hub preview, child performance metrics. Multi-child aware with family panel drawer.
- **Required params:** None (uses `useAuth`, `useParentHomeData` hooks)
- **Optional params:** None
- **Role visibility:** Parent only (also default fallback)
- **Key navigation outbound:**
  - Notifications → `/notification` (lines 345, 419)
  - Dynamic route → based on context (line 440 — RSVP/payment/chat)
  - Schedule → `/(tabs)/parent-schedule` (line 516)
  - Family gallery → `/family-gallery` (lines 525, 552)
  - Achievements → `/achievements` (line 700)
- **Supabase tables touched:** None directly (data via `useParentHomeData` hook)
- **Overlapping/related screens:** `parent-my-stuff.tsx` (parent hub), `my-kids.tsx`
- **Identity notes:** Complex dynamic message system (RSVP due, payment due, unread chats). Multi-child and multi-sport aware.
- **Lines of code:** 1002

---

#### `components/PlayerHomeScroll.tsx`
- **Screen name shown to user:** "lynx" (compact header)
- **Route:** Rendered by `DashboardRouter` when role = player (after child picker if multiple children)
- **Purpose:** Dark-themed player dashboard — hero identity card, streak tracking, performance drops, photo strip, RSVP, chat peek, challenges, last game stats.
- **Required params:** None
- **Optional params:** `playerId` (string | null), `playerName` (string | null), `onSwitchChild` (callback)
- **Role visibility:** Player only
- **Key navigation outbound:**
  - Roster → `/roster?teamId=${id}` (line 318)
  - Standings → `/standings` (line 381)
  - Achievements → `/achievements` (line 397)
- **Supabase tables touched:** None directly (data via hooks + AsyncStorage for streaks/milestones)
- **Overlapping/related screens:** `player-card.tsx`, `my-stats.tsx`
- **Identity notes:** Uses AsyncStorage for level-up and streak milestone tracking. Challenge arrival modal.
- **Lines of code:** 615

---

#### `components/ChildPickerScreen.tsx`
- **Screen name shown to user:** "Who's Playing?"
- **Route:** Rendered by `DashboardRouter` when player role has multiple children and none selected
- **Purpose:** Child picker for parents to select which child's player dashboard to view. Shows photo, position, team, jersey number.
- **Required params:** `onSelectChild` (callback — required)
- **Optional params:** None
- **Role visibility:** Parent (internal component, not directly routed)
- **Key navigation outbound:** None (callback-based — calls `onSelectChild`)
- **Supabase tables touched:**
  - READS: `players` (lines 72, 87, 103 — by parent_account_id, by guardian IDs, full player data batch), `player_guardians` (line 80), `team_players` (line 115 — with nested teams)
- **Overlapping/related screens:** `DashboardRouter.tsx` (parent component)
- **Identity notes:** Resolves children from 3 sources (parent_account_id, player_guardians, then batch details). Shows before PlayerHomeScroll when multiple children exist.
- **Lines of code:** 317

---

#### `components/LeaderboardScreen.tsx`
- **Screen name shown to user:** "Leaderboards" with "Overview" / "Full List" tabs
- **Route:** Rendered as embedded component (used by CoachHomeScroll and others)
- **Purpose:** Dual-view leaderboard — grid overview (top 3 per category + MVPs) and full ranked list with team/per-game filters. Role-aware highlighting.
- **Required params:** `seasonId` (string)
- **Optional params:** `sport` (string), `highlightPlayerId`, `highlightTeamId`, `highlightPlayerIds` (string[]), `onPlayerTap` (callback), `refreshTrigger` (number), `onRefreshDone` (callback)
- **Role visibility:** All roles
- **Key navigation outbound:** None (uses `onPlayerTap` callback)
- **Supabase tables touched:** None directly (data via `useLeaderboardData` hook)
- **Overlapping/related screens:** `standings.tsx` (standalone standings page)
- **Identity notes:** Reusable component with extensive prop interface. Embedded in home scrolls.
- **Lines of code:** 927

---

#### `components/ReportsScreen.tsx`
- **Screen name shown to user:** "Reports"
- **Route:** Rendered by `reports-tab.tsx` wrapper
- **Purpose:** Admin reports hub — category grid (Registration, Payments, Rosters, Uniforms, Schedules, Waivers) and filtered report list. Access to 25+ report types.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** Admin only
- **Key navigation outbound:**
  - Report viewer → `/report-viewer?reportId=${id}&reportName=${name}` (line 35)
- **Supabase tables touched:** None directly (report catalog is hardcoded)
- **Overlapping/related screens:** `ReportViewerScreen` (individual report), `season-reports.tsx` (dashboard overview), `reports-tab.tsx` (wrapper)
- **Identity notes:** Report catalog defined locally. 25+ report types with category filtering.
- **Lines of code:** 394

---

#### `components/ReportViewerScreen.tsx`
- **Screen name shown to user:** Dynamic (from `reportName` param — e.g., "Registration List", "Outstanding Balances")
- **Route:** Rendered by `report-viewer.tsx` wrapper
- **Purpose:** Dynamic report viewer supporting multiple visualizations (table, pie chart, bar chart, calendar, cards). Filter modal (season, sport, team, age group) and CSV export.
- **Required params:** `reportId`, `reportName` (from route params)
- **Optional params:** None
- **Role visibility:** Admin only
- **Key navigation outbound:** None
- **Supabase tables touched:**
  - READS: `teams` (line 79), `age_groups` (line 87), `sports` (line 98)
  - All report data via service functions in `@/lib/reports`
- **Overlapping/related screens:** `ReportsScreen` (report list), `season-reports.tsx` (dashboard)
- **Identity notes:** Generic report renderer — adapts to report type (table/chart/calendar). CSV export via Sharing API.
- **Lines of code:** 1277
