# Coach Experience Parity Audit: Web Reference vs Expo App

## Design Philosophy

> "Command center meets assistant coach" — frictionless, engagement hub, badge/achievement system, stat tracking, roster management, lineup builder, schedule management, parent communication, payment visibility. Edgy & modern.

The coach journey: **receiving new players** → **engaging before game** → **game prep** → **live game day** → **post game** → **rinse and repeat**.

---

## PHASE 1: Web Reference Coach Experience Inventory

### A. Coach-Facing Pages (reference/web-admin/src/pages/)

| Feature | Web File Path | Lines | Description |
|---------|---------------|-------|-------------|
| **Tactical Dashboard** | `roles/CoachDashboard.jsx` | 1053 | Dark esports "Tactical Command Center": multi-team selector, squad status, countdown timer, recent form (W/L dots), season record, Top Player Pulse (sortable stat categories), pending stats alert badge, Quick Ops grid, squad roster with avatars |
| **Legacy Dashboard** | `dashboard/CoachDashboard.jsx` | 773 | Light-theme fallback: TeamHeaderCard, RosterWidget, QuickActionsWidget, UpcomingWidget, TeamRecordWidget (win streak + point diff), TopPlayerWidget |
| **Game Prep** | `gameprep/GamePrepPage.jsx` | 1681 | Two-tab (Upcoming/Results), stats pending banner, GameCard with set scores + stats_entered badge, GameCompletionModal (4-step wizard: Format → Score → Attendance → Confirm), multi-sport scoring (7 sports, 13 formats), SetScoreInput (+/- stepper), PeriodScoreInput |
| **Game Day Command Center** | `gameprep/GameDayCommandCenter.jsx` | 1827 | Full-screen "Mission Control": PRE_GAME → LIVE → POST_GAME state machine, volleyball court grid (P1-P6), drag-and-drop players, real-time scoreboard (+1 tap targets), per-player stat picker (kill/ace/block/dig/assist/error with auto-point scoring), rotation indicator (R1-R6), undo last point, timeout, sub button, per-set tracking, PostGameSummary, QuickStatsPanel, RSVP-colored bench borders, libero pink badge |
| **Lineup Builder** | `components/games/AdvancedLineupBuilder.jsx` | 1258 | "War Room" modal: sport-aware formations (5-1/6-2/4-2/6-6 volleyball, 4-4-2 soccer, standard basketball), per-set tabs (Set 1-5), Copy to All Sets, rotation prev/next/reset, drag-drop court, libero selector, substitution panel (starter→bench mapping), auto-fill, PlayerStatsModal |
| **Attendance** | `attendance/AttendancePage.jsx` | 699 | Stats header (Total Events/Games/Practices/"Needs Volunteers"), team filter, view tabs (Upcoming/Past/All), per-player RSVP override, volunteer assignment (Line Judge + Scorekeeper with Primary/Backup1/Backup2 slots), parent selector dropdown |
| **Season Leaderboards** | `stats/SeasonLeaderboardsPage.jsx` | 636 | Stat category tabs (Points/Aces/Kills/Blocks/Digs/Assists), per-game average toggle, medal icons (gold/silver/bronze), podium display for top 3, full ranked list |
| **Player Stats** | `stats/PlayerStatsPage.jsx` | 715 | Individual player drill-down: Serving section (aces/serves/service_errors), Attacking section (kills/attacks/attack_errors), season aggregates vs per-game breakdown, game-by-game history table |
| **Blasts** | `blasts/BlastsPage.jsx` | 666 | Stats row (Total Sent/Avg Read Rate/Pending Reads/Urgent count), filter tabs (All/Urgent/Pending/Payment/Schedule/General), read progress bar per message, ComposeBlastModal (type/priority/target with live recipient count), BlastDetailModal (per-recipient read timestamps) |
| **Chat** | `chats/ChatsPage.jsx` | 1562 | Real-time team chat: channel list sidebar, message search, threads/reply-to, emoji reactions (8 types), emoji picker panel, GIF support (Tenor API), image attachments, read receipts (single/double check), message delete, typing indicator, sound effects |
| **Team Wall** | `teams/TeamWallPage.jsx` | 1413 | Team Hub: countdown to next game, team post feed with photo upload, like/cheer reactions, roster section, schedule preview, achievement display, coach management view, stats summary widget, announcements preview |
| **Coach Roster** | `coaches/CoachesPage.jsx` | 799 | Coach CRUD: search/filter, role labels (Head/Assistant/Manager/Volunteer), background check status tracking (not_started/pending/cleared/failed/expired), certification tracking (add/remove), photo upload, team assignment modal (multi-team), active/inactive toggle |
| **Schedule** | `schedule/SchedulePage.jsx` | 4203 | Full calendar (month/week/list), create/edit/delete events, bulk creation, game result inline entry, lineup builder integration, RSVP management, volunteer assignment, schedule poster modal (sharable image), game day share modal, sport-aware lineup via getSportConfig |
| **Coach Availability** | `schedule/CoachAvailabilityPage.jsx` | 1175 | Full month calendar grid, date-range drag-selection, reason picker (vacation/work/personal/injury/other), recurring block support, conflict detection with scheduled events, availability summary |
| **Standings** | `standings/TeamStandingsPage.jsx` | 556 | W-L-T record, win percentage, current streak counter, point differential, recent games with result badges, expandable game history, `team_standings` table query |

### B. Coach-Relevant Components

| Component | Lines | Purpose |
|-----------|-------|---------|
| `AdvancedLineupBuilder.jsx` | 1258 | Sport-aware formation builder (see above) |
| `GameDayCommandCenter.jsx` | 1827 | Live game scoreboard (see above) |
| `PlayerCardExpanded` | ~600 | Player drill-down with badge awarding, photo upload, OVR rating |
| `ClickableCoachName` | export | Coach name link used across schedule/attendance pages |

### C. Key Data Tables (Coach-Specific)

| Table | Coach Reads | Coach Writes | Purpose |
|-------|-------------|--------------|---------|
| `team_staff` | team assignments, role | — | Primary coach-team linkage |
| `team_coaches` | team assignments, role | — | Legacy coach-team linkage |
| `coaches` | profile, compliance | profile fields | Coach profile data |
| `coach_availability` | date/status/reason | upsert, delete | Blackout calendar |
| `coach_sports` | sport assignments | — | Multi-sport support |
| `schedule_events` | all event fields | game_status, scores, result | Game/practice data |
| `game_lineups` | lineup positions | delete + insert lineup | Lineup management |
| `game_player_stats` | per-player stats | insert stats | Post-game stats |
| `player_season_stats` | aggregated stats | — | Leaderboards |
| `event_rsvps` | player responses | override status | Attendance/RSVP |
| `event_attendance` | attendance records | mark attendance | Game completion |
| `event_volunteers` | volunteer assignments | assign/remove | Volunteer management |
| `messages` | sent blasts | insert new | Announcements |
| `message_recipients` | recipient list | insert recipients | Blast targeting |
| `team_posts` | team wall feed | insert posts | Social feed |
| `team_post_reactions` | reactions | insert/update/delete | Feed engagement |
| `player_badges` | earned badges | award badge | Recognition system |
| `announcements` | active alerts | — | System announcements |

---

## PHASE 2: Expo App Coach Experience Inventory

### A. Tab Navigation (Coach View)

| Tab | File | Lines | Status | Purpose |
|-----|------|-------|--------|---------|
| Home | `(tabs)/index.tsx` → `DashboardRouter` → `CoachDashboard` | 1171 | Working | Team selector pills, hero card (W/L), mission briefing, team health, top performers, quick actions, season progress |
| Game Day | `(tabs)/gameday.tsx` | 1297 | Working | Next event hero, this week events, season overview, W/L/Win%, upcoming 30 days, coach tools scroll, event detail modal |
| Team | `(tabs)/connect.tsx` → `TeamWall` | 2114 | Working | Real-time feed (Supabase channels), emoji reactions (5 types + haptics), skeleton loading, compose card, roster tab, schedule tab, pinned posts, team picker |
| Me | `(tabs)/me.tsx` | 577 | Working | Profile hero, role badges, collapsible sections, dark mode toggle, accent color picker, coach shortcuts (Teams/Roster/Schedule/Availability) |

### B. Full-Page Routes (Coach-Accessible)

| Route | File | Lines | Status | Purpose |
|-------|------|-------|--------|---------|
| `/game-prep` | `game-prep.tsx` | 1260 | Working | 3-mode: list (game browser), live (in-game scoring), stats-entry (post-game wizard). Set tracking (5 sets), per-player stat attribution, End Game modal, lineup badge, emergency contacts |
| `/lineup-builder` | `lineup-builder.tsx` | 2355 | Working | Visual volleyball court (P1-P6), formation presets (5-1/6-2/4-2/6-6), tap-to-assign, long-press libero, auto-fill (position + RSVP priority), rotation preview (6 rotations), substitution in metadata, bench display |
| `/attendance` | `attendance.tsx` | 971 | Working | Event selector with type icons, per-player present/absent/late toggles, Mark All Present, summary bar (counts + percentages) |
| `/coach-profile` | `coach-profile.tsx` | 605 | Working | Edit name/email/phone/specialties/experience, read-only compliance (background check/waiver/code of conduct), assigned teams from `team_coaches` |
| `/coach-availability` | `coach-availability.tsx` | 516 | Working | 6-week calendar grid, month nav, tap-to-mark unavailable, reason picker (vacation/work/personal/injury/other), upcoming unavailable list |
| `/blast-composer` | `blast-composer.tsx` | 756 | Working | Title + body (2000 char limit), type chips (announcement/schedule_change/payment_reminder/custom), priority toggle (normal/urgent), target audience (all/team), live recipient count |
| `/achievements` | `achievements.tsx` | 1325 | Working | Badge grid (3-col), category filter tabs, rarity system (common→legendary with glow), progress bars, "next to earn", detail modal with league-wide counts |
| `/game-results` | `game-results.tsx` | 736 | Partial | Parent-facing game recap: hero score card, set breakdown, child stat grid. No coach-specific version. |
| `/game-day-parent` | `game-day-parent.tsx` | 876 | Partial | Parent game day detail: team roster, RSVP status, score display. No coach equivalent. |
| `/standings` | `standings.tsx` | 1001 | Working | Two tabs: Team Standings (W/L/Win%/PF/PA/Diff with medals) and Player Leaderboards (category tabs with animated stat bars). Fallback aggregation from `game_player_stats`. |
| `/(tabs)/schedule` | `schedule.tsx` | 1056 | Working | List/week/month views, filter bar (type + team), add event modal, bulk add (recurring practices + game series), long-press delete, volunteer assignments |
| `/season-settings` | `season-settings.tsx` | 867 | Admin-only | Season management: registration toggle, dates, roster limits, age groups, teams overview, fee config |

### C. Key Components (Coach-Relevant)

| Component | File | Lines | Status | Purpose |
|-----------|------|-------|--------|---------|
| `CoachDashboard` | `components/CoachDashboard.tsx` | 1171 | Working | Main coach home (see tab section) |
| `CoachParentDashboard` | `components/CoachParentDashboard.tsx` | 1219 | Buggy | Dual-mode for coach+parent users. Coach Mode: team cards, event countdown, quick actions. Parent Mode: child cards, at-a-glance stats. **Has navigation bugs.** |
| `DashboardRouter` | `components/DashboardRouter.tsx` | 194 | Working | Routes to correct dashboard by role (admin/coach/coach_parent/parent/player). Checks `team_staff` → `coaches` → `players` → `player_guardians`. |
| `TeamWall` | `components/TeamWall.tsx` | 2114 | Working | Full social feed with real-time subscription, reactions, compose, roster/schedule tabs |
| `PlayerCardExpanded` | `components/PlayerCardExpanded.tsx` | 591 | Working | Full player modal: photo upload, OVR badge, earned badges + award new, Stats/Skills/Info tabs, emergency contacts |
| `AppDrawer` | `components/AppDrawer.tsx` | 393 | Working | Coach menu: Profile, Roster, My Teams, Schedule, Availability, Game Prep, Lineup Builder, Attendance, Send Announcement |

### D. Context/Hooks (Coach-Relevant)

| Hook/Context | File | Purpose |
|-------------|------|---------|
| `usePermissions()` | `lib/permissions-context.tsx` (211 lines) | Role detection: `isCoach`, `isAdmin`, `isPlayer`, `isParent`, `primaryRole`, `actualRoles`, `viewAs`, `can()` |
| `useAuth()` | `lib/auth.tsx` | User, profile, organization, season, signOut |
| `useSeason()` | `lib/season.tsx` | Active season context |
| `useTheme()` | `lib/theme.tsx` | Colors, dark mode |
| `useTeamContext()` | `lib/team-context.tsx` | Selected team ID (AsyncStorage-persisted) |

---

## PHASE 3: Complete Parity Matrix

### Legend
- **FULL**: Feature exists and matches web functionality
- **PARTIAL**: Feature exists but is missing key capabilities
- **STUB**: Route/screen exists but is incomplete or buggy
- **MISSING**: No equivalent in mobile app
- **N/A**: Not applicable to mobile platform

### A. Dashboard & Home

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Multi-team selector | Dropdown | Pill tabs | FULL | Both allow switching context |
| Squad status (player count) | Widget | Hero card count | FULL | |
| Next event countdown | Timer (d/h/m) | Mission Briefing card | FULL | |
| Recent form (W/L dots) | 5-game dot strip | Not present | MISSING | Web shows colored dots for last 5 results |
| Season record (W-L-T) | Header | Hero card | PARTIAL | Mobile shows W-L only, no ties |
| Top Player Pulse | Sortable stat list | Top 3 performers | PARTIAL | Web has sortable categories; mobile shows only top 3 by kills |
| Pending stats alert badge | Red badge count | Not present | MISSING | Web tracks `stats_entered=false` on game records |
| Quick Ops grid | 4-button grid | Quick Actions (4 cards) | FULL | |
| Squad roster grid | Avatar grid | Not on dashboard | MISSING | Web shows mini roster on dashboard |
| Win streak counter | Yes | Not present | MISSING | |
| Point differential | Yes | Not present | MISSING | |

### B. Game Prep & Live Game

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Upcoming games list | Tab view | List mode | FULL | |
| Game results list | Tab view | Not separate | PARTIAL | Mobile shows completed games inline in list |
| Stats pending banner | Alert bar | Not present | MISSING | |
| Game completion wizard | 4-step modal (Format→Score→Attendance→Confirm) | End Game modal (basic) | PARTIAL | Mobile has basic score entry; web has full wizard with format selection |
| Multi-sport scoring formats | 7 sports, 13 formats | Volleyball only (sets) | MISSING | Web supports basketball quarters, soccer halves, baseball innings, etc. |
| Set score input (+/- stepper) | Yes | Basic text input | PARTIAL | Web has tap +/- buttons; mobile uses number input |
| Period score input | Yes (quarters/halves/innings) | Not present | MISSING | |
| Live scoreboard (Mission Control) | Full-screen, drag-drop court | Live mode (button-based) | PARTIAL | Mobile has live scoring but no court grid, no drag-drop, no visual rotation |
| Per-player stat picker (live) | Tap player on court → stat menu | Button-based stat entry | PARTIAL | Mobile uses button grid per player; web has contextual court tap |
| Auto point scoring | Kill/ace/block → +1 auto | Manual score | MISSING | Web auto-increments score when stat is logged |
| Undo last point | Yes | Not present | MISSING | |
| Rotation indicator (R1-R6) | Visual badge | Not present | MISSING | |
| RSVP-colored bench borders | Green/red/grey | Not present | MISSING | |
| QuickStatsPanel (live totals) | Team totals + hot player leaders | Not present | MISSING | |
| PostGameSummary | Top performers per stat | Not present | MISSING | |
| Drag-and-drop court | Yes (DnD) | Not present | MISSING | Mobile uses tap-to-assign |
| Timeout tracking | Button | Not present | MISSING | |
| `stats_entered` flag tracking | Yes | Not present | MISSING | |

### C. Lineup Builder

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Visual court (P1-P6) | Grid layout | Grid layout | FULL | |
| Formation presets | 5-1/6-2/4-2/6-6 volleyball, 4-4-2 soccer, basketball | 5-1/6-2/4-2/6-6 volleyball | PARTIAL | Mobile is volleyball-only |
| Per-set lineup tabs (Set 1-5) | Tab UI | Not present | MISSING | Mobile saves one lineup per game |
| Copy to All Sets | Button | Not present | MISSING | |
| Rotation prev/next/reset | Chevron controls | Scrollable rotation preview | PARTIAL | Different UX but similar intent |
| Drag-and-drop to court | Yes | Tap-to-assign | PARTIAL | Mobile uses tap instead of drag |
| Libero selector | Pink badge | Long-press toggle | FULL | Different interaction, same result |
| Substitution panel | Starter→bench mapping UI | Metadata JSON | PARTIAL | Mobile stores subs in metadata but has no dedicated sub panel UI |
| Auto-fill by position | Yes | Yes | FULL | |
| Auto-fill by RSVP | Yes | Yes | FULL | |
| PlayerStatsModal (player drill-down) | Rating bars | Not present | MISSING | |

### D. Attendance & Volunteers

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Event selector list | With type icons | With type icons + today highlight | FULL | |
| Per-player attendance marking | RSVP override buttons | Present/Absent/Late toggles | FULL | |
| Mark All Present | Not explicit | Bulk action button | FULL | Mobile has it, web doesn't explicitly |
| Summary bar (counts + %) | Not present | Yes | FULL | Mobile has it, web doesn't |
| Stats header (Events/Games/Practices) | Yes | Not present | MISSING | |
| "Needs Volunteers" badge | Count badge | Not present | MISSING | |
| Volunteer assignment (Line Judge) | Primary + Backup1 + Backup2 | Not present | MISSING | |
| Volunteer assignment (Scorekeeper) | Primary + Backup1 + Backup2 | Not present | MISSING | |
| Parent selector for volunteer slots | Dropdown | Not present | MISSING | |
| Coach-override RSVP | Per-player buttons | Per-player toggles | FULL | Different labels but same capability |
| View tabs (Upcoming/Past/All) | Yes | Single list (no filter) | PARTIAL | Mobile shows all events without tab filtering |

### E. Stats & Leaderboards

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Team standings (W/L/Win%) | Yes | Yes | FULL | |
| Point differential column | Yes | Yes (PF/PA/Diff) | FULL | |
| Current streak counter | Yes | Not present | MISSING | |
| Player leaderboards | Stat tabs, podium, medals | Stat tabs, animated bars, medals | FULL | Both have category tabs and medal icons |
| Per-game average toggle | Yes | Not present | MISSING | |
| Podium display (top 3) | Visual podium | Not present | PARTIAL | Mobile shows medals but no podium layout |
| Individual player stats page | Serving + Attacking sections | Not present (standalone) | MISSING | Web has dedicated page; mobile only shows stats in PlayerCardExpanded modal |
| Game-by-game stat history | Yes | Not present | MISSING | |

### F. Announcements & Blasts

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Compose blast (title + body) | Yes | Yes | FULL | |
| Message type selector | 4 types | 4 types (chips) | FULL | |
| Priority toggle (normal/urgent) | Yes | Yes | FULL | |
| Target audience (all/team) | All/Team/Coaches Only | All/Team | PARTIAL | Mobile missing "Coaches Only" target |
| Live recipient count | Yes | Yes | FULL | |
| Stats row (Sent/Read Rate/Pending) | Yes | Not present | MISSING | |
| Filter tabs (Urgent/Pending/etc.) | 6 filter tabs | Not present | MISSING | |
| Read progress bar per message | Yes | Not present | MISSING | |
| BlastDetailModal (per-recipient reads) | Yes | Not present | MISSING | |
| Draft saving | Not confirmed | Not present | MISSING | |

### G. Chat & Messaging

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Channel list | Sidebar | Tab screen | PARTIAL | Mobile has basic channel list |
| Real-time messages | Yes | Assumed (Supabase channels) | PARTIAL | Needs verification |
| Message search | Yes | Not present | MISSING | |
| Threads / reply-to | Yes | Not present | MISSING | |
| Emoji reactions | 8 types | Not confirmed in chat | MISSING | TeamWall has 5 reaction types but chat may not |
| Emoji picker panel | Category-based | Not present | MISSING | |
| GIF support (Tenor API) | Yes | Not present | MISSING | |
| Image attachments | Yes | Not present | MISSING | |
| Read receipts (check/double-check) | Yes | Not present | MISSING | |
| Typing indicator | Yes | Not present | MISSING | |
| Sound effects | Yes | Not present | MISSING | N/A for mobile (use haptics instead) |
| Message delete | Yes | Not present | MISSING | |

### H. Team Wall / Social Feed

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Team post feed | Yes | Yes | FULL | |
| Real-time subscription | Implied | Yes (Supabase channel) | FULL | |
| Compose post (coach/admin) | Yes | Yes | FULL | |
| Emoji reactions | Heart/Cheer | 5 types + haptics | FULL | Mobile actually has more reaction types |
| Photo upload to post | Yes | Referenced but not implemented | MISSING | |
| Pinned posts | Not confirmed | Yes | FULL | |
| Post type badges | Not confirmed | Yes (6 types) | FULL | |
| Countdown to next game | Prominent | Not on wall | MISSING | |
| Roster tab | Yes | Yes | FULL | |
| Schedule tab | Yes | Yes | FULL | |
| Achievement display | Yes | Not on wall | MISSING | |
| Pagination | Not confirmed | Not present (loads all) | MISSING | Will be needed as data grows |

### I. Coach Profile & Availability

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Edit name/email/phone | Yes | Yes | FULL | |
| Specialties | Not confirmed | Yes | FULL | |
| Experience level | Not confirmed | Yes | FULL | |
| Background check tracking | Full status lifecycle | Read-only display | PARTIAL | Mobile shows status but can't update |
| Certification tracking | Add/remove array | Not present | MISSING | |
| Coach photo upload | Yes (media bucket) | Not present | MISSING | |
| Team assignments display | Yes | Yes (from team_coaches) | FULL | |
| Active/inactive toggle | Yes | Not present | MISSING | |
| Availability calendar | Full month, drag-select, recurring | 6-week grid, tap-to-mark | PARTIAL | Mobile is simpler but functional |
| Reason picker | Yes | Yes (5 reasons) | FULL | |
| Conflict detection with events | Yes | Not present | MISSING | |
| Recurring block support | Yes | Not present | MISSING | |

### J. Schedule Management

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| List view | Yes | Yes | FULL | |
| Week view | Yes | Yes | FULL | |
| Month calendar view | Yes | Yes | FULL | |
| Team/type filter | Yes | Yes | FULL | |
| Single event creation | Yes | Yes (modal) | FULL | |
| Bulk creation (recurring practices) | Yes | Yes | FULL | |
| Bulk creation (game series) | Yes | Yes | FULL | |
| Event delete | Yes | Yes (long-press) | FULL | |
| Inline game result entry | Yes | Not present | MISSING | Must go to game-prep to enter results |
| Volunteer assignment | Yes | Display only | PARTIAL | Mobile shows volunteers but can't assign from schedule |
| Schedule poster/share modal | Yes | Not present | MISSING | |
| Venue picker | Yes (organization_venues) | TODO placeholder | MISSING | `organization_venues` table not created |
| RSVP display per event | Yes | Yes (counts) | FULL | |

---

## PHASE 4: Prioritized Punch List

### P0: Critical Experience Gaps (Coach workflow breaks or feels broken)

| # | Issue | Impact | Complexity | Fix Approach |
|---|-------|--------|------------|--------------|
| 1 | **CoachParentDashboard navigation bugs** | "Lineup" → `/(tabs)/players` (wrong), "Game Prep" → `/(tabs)/schedule` (wrong) | Low | Fix route strings to `/lineup-builder` and `/game-prep` |
| 2 | **Column name inconsistency: `event_id` vs `schedule_event_id`** | game-prep live mode writes `event_id`, game-results reads `schedule_event_id` — stats silently missing | Medium | Audit all writes/reads, standardize on one column name |
| 3 | **`their_score` vs `opponent_score` column mismatch** | game-day-parent.tsx uses `their_score`, all others use `opponent_score` — score display breaks | Low | Standardize to `opponent_score` everywhere |
| 4 | **Schedule role check uses `profile?.role` instead of `usePermissions()`** | Coach features in schedule may not appear for some coaches (depends on profile.role being set) | Low | Replace string comparison with `usePermissions()` hook |
| 5 | **N+1 query patterns (6 screens)** | Slow load times as data grows: gameday, schedule, standings, season-settings, CoachParentDashboard | Medium | Batch queries or use `.in()` filters instead of per-item `Promise.all` |
| 6 | **No draft saving in blast-composer** | Coach loses a long announcement if they accidentally leave the screen | Medium | Auto-save draft to AsyncStorage |

### P1: Missing Parity Features (Coach experience incomplete)

| # | Issue | Impact | Complexity | Fix Approach |
|---|-------|--------|------------|--------------|
| 7 | **No live game Mission Control** | Web's flagship feature absent — no visual court, no drag-drop, no auto-scoring | High | Build simplified "Game Day Live" screen with court visualization, tap-to-stat, auto-score |
| 8 | **No multi-sport scoring formats** | Only volleyball sets supported; basketball/soccer/baseball coaches have no scoring format | High | Add sport-aware scoring format selector, period-based input for non-volleyball |
| 9 | **No per-set lineup management** | Can only save one lineup per game; web supports Set 1-5 with copy | Medium | Add set tabs to lineup-builder with save-per-set |
| 10 | **No game completion wizard** | End game is a basic modal; web has 4-step flow (Format→Score→Attendance→Confirm) | Medium | Build stepped modal after ending live game |
| 11 | **No volunteer assignment** | Coaches can't assign line judges or scorekeepers from mobile | Medium | Add volunteer section to attendance screen (games only) |
| 12 | **No read analytics for blasts** | Coach sends announcements but can't see who read them | Medium | Add blast history screen with read progress bars and per-recipient timestamps |
| 13 | **No coach photo upload** | Coach profile has no photo capability | Low | Copy pattern from PlayerCardExpanded photo upload to coach-profile |
| 14 | **No recent form display (W/L dots)** | Dashboard doesn't show win/loss trend at a glance | Low | Add 5-game dot strip to hero card or below record |
| 15 | **No pending stats alert** | Coach doesn't know which games are missing stats | Low | Query `stats_entered` flag, show badge on dashboard + game-prep |
| 16 | **No individual player stats page** | Can only see player stats in modal (PlayerCardExpanded); no dedicated page with game-by-game history | Medium | Create `/player-stats` route with Serving/Attacking sections + game history |
| 17 | **Chat missing core features** | No GIF picker, no threads, no reactions, no typing indicator, no image attachments, no read receipts | High | Iterative enhancement of chat (GIF + reactions first, threads later) |
| 18 | **No PostGameSummary screen** | After ending a game, coach has no top-performers summary | Medium | Show summary modal after game completion with stat leaders per category |
| 19 | **Substitution panel missing UI** | Lineup builder stores subs in metadata JSON but has no visual panel | Medium | Add sub panel showing starter→bench pairs with edit capability |

### P2: Polish & UX Improvements

| # | Issue | Impact | Complexity | Fix Approach |
|---|-------|--------|------------|--------------|
| 20 | **No undo last point (live game)** | Coach can't correct a misattributed stat during live game | Low | Add undo stack to game-prep live mode |
| 21 | **No timeout tracking** | Coach can't log timeouts during live game | Low | Add timeout counter to live mode |
| 22 | **No rotation indicator (R1-R6)** | Coach can't track current rotation during live game | Medium | Add rotation badge + rotation advance on set/rotation changes |
| 23 | **No conflict detection in availability** | Coach can mark themselves unavailable on game days without warning | Medium | Cross-reference `coach_availability` against `schedule_events` |
| 24 | **No recurring availability blocks** | Coach must mark each day individually for extended absence | Medium | Add "repeat weekly/bi-weekly/until date" option |
| 25 | **No per-game average toggle on leaderboards** | Leaderboards show totals only; per-game averages give better picture | Low | Add toggle to standings page, compute averages from `games_played` |
| 26 | **No photo upload on team wall posts** | Compose card exists but can't attach photos | Medium | Add image picker to compose flow, upload to Supabase storage |
| 27 | **No schedule poster/share** | Can't generate sharable schedule images | Medium | Build share card using `react-native-view-shot` or similar |
| 28 | **Alerts health card on dashboard always shows "All good"** | Misleading when there are issues | Low | Wire up real alert logic (pending stats, missing volunteers, etc.) |
| 29 | **No DashboardRouter loading skeleton** | Blank screen while role routing resolves | Low | Add skeleton/spinner during route detection |
| 30 | **`team_coaches` vs `team_staff` schema split** | coach-profile uses `team_coaches`; everything else uses `team_staff` | Medium | Audit and standardize on `team_staff` (the newer table) |

---

## PHASE 5: Incremental PR Plan

### PR #8: Bug Fixes & Data Integrity (P0 items — do first)

**Goal**: Fix navigation bugs, column inconsistencies, role detection, and N+1 query patterns.

**Scope**:
1. Fix CoachParentDashboard quick action routes (Lineup → `/lineup-builder`, Game Prep → `/game-prep`)
2. Standardize `event_id` vs `schedule_event_id` in `game_player_stats` writes/reads
3. Fix `their_score` → `opponent_score` in game-day-parent.tsx
4. Replace `profile?.role` string check in schedule.tsx with `usePermissions()`
5. Batch N+1 queries in gameday.tsx, schedule.tsx, standings.tsx, season-settings.tsx, CoachParentDashboard.tsx
6. Remove `console.log` debug statements left in production code
7. Wire up dashboard "Alerts" health card with real data (pending stats count, missing volunteers)

**Files**:
- `components/CoachParentDashboard.tsx` — route fixes + N+1 fix
- `app/game-prep.tsx` — column name standardization
- `app/game-results.tsx` — column name standardization
- `app/game-day-parent.tsx` — `their_score` fix
- `app/(tabs)/schedule.tsx` — role check fix + N+1 fix + debug log removal
- `app/(tabs)/gameday.tsx` — N+1 fix
- `app/standings.tsx` — N+1 fix
- `app/season-settings.tsx` — N+1 fix
- `components/CoachDashboard.tsx` — alerts health card

**Acceptance Criteria**:
- All quick action buttons navigate to correct screens
- `game_player_stats` reads/writes use same column name
- Score displays work on all screens
- Coach features visible in schedule for all coach role configurations
- Page load times don't degrade with 50+ events
- No `console.log` debug statements in production
- TypeScript: 0 new errors

---

### PR #9: Game Completion Wizard + Multi-Sport Scoring (P1 core)

**Goal**: Replace basic End Game modal with a proper game completion flow supporting multiple sports.

**Scope**:
1. Sport-aware scoring format selector (volleyball: best-of-3/best-of-5/2-sets; basketball: 4Q/2H; soccer: 2H; etc.)
2. SetScoreInput component with +/- stepper buttons
3. PeriodScoreInput component for non-volleyball sports
4. 4-step completion flow: Format → Score → Attendance → Confirm
5. Save `scoring_format`, `set_scores`/`period_scores`, `our_sets_won`, `opponent_sets_won`, `point_differential` to `schedule_events`
6. PostGameSummary screen showing top performer per stat category
7. Add `stats_entered` tracking — show pending stats badge on dashboard + game-prep

**Files**:
- `app/game-prep.tsx` — replace End Game modal with wizard, add stats_entered tracking
- `components/GameCompletionWizard.tsx` — NEW (4-step modal)
- `components/SetScoreInput.tsx` — NEW (+/- stepper)
- `components/PostGameSummary.tsx` — NEW (top performers)
- `components/CoachDashboard.tsx` — pending stats badge
- `constants/scoring-formats.ts` — NEW (sport → format configs)

**Acceptance Criteria**:
- Ending a game opens 4-step wizard (not basic modal)
- Volleyball coach sees set-based scoring; basketball coach sees quarter-based
- PostGameSummary shows stat leaders after completion
- Pending stats badge appears on dashboard for games without stats
- `point_differential`, `our_sets_won`, `opponent_sets_won` saved to DB

---

### PR #10: Live Game Day Experience (P1 flagship)

**Goal**: Build the mobile "Mission Control" — a visual court-based live game experience.

**Scope**:
1. Visual volleyball court overlay (P1-P6 grid, net, attack line)
2. Large-format scoreboard with tap +1 targets
3. Tap player on court → stat picker (Kill/Ace/Block/Dig/Assist/Error)
4. Auto point scoring: kill/ace/block → +1 our score; error → +1 opponent
5. Undo last point stack
6. Rotation indicator (R1-R6) with rotation advance
7. Per-set score tracking with set history
8. Timeout counter
9. Bench display with RSVP-colored borders (green/red/grey)
10. QuickStatsPanel: live team totals + hot player leaders

**Files**:
- `app/game-day-live.tsx` — NEW (full-screen live game)
- `components/VolleyballCourt.tsx` — NEW (court visualization)
- `components/LiveScoreboard.tsx` — NEW (large format scores)
- `components/StatPicker.tsx` — NEW (kill/ace/block/dig/assist/error menu)
- `components/QuickStatsPanel.tsx` — NEW (live totals)
- `app/game-prep.tsx` — wire "Go Live" button to new screen
- `app/_layout.tsx` — add route

**Acceptance Criteria**:
- Court shows 6 position slots with assigned players
- Tapping a player opens stat picker
- Logging a kill auto-increments our score by 1
- Undo reverses last stat + score change
- Rotation badge shows R1-R6, advances on set transitions
- Set scores tracked and displayed
- Bench shows unassigned players with RSVP color borders

---

### PR #11: Lineup Builder Per-Set + Substitution Panel (P1)

**Goal**: Match web's per-set lineup management and expose substitution UI.

**Scope**:
1. Set tabs (Set 1-5) in lineup-builder
2. "Copy to All Sets" button
3. Substitution panel: for each starter, pick a bench player as sub
4. Active substitution summary display
5. Multi-sport formation selector (add basketball + soccer formations)

**Files**:
- `app/lineup-builder.tsx` — add set tabs, sub panel, multi-sport formations
- `constants/formations.ts` — NEW (sport → formation configs)

**Acceptance Criteria**:
- Set 1-5 tabs visible with independent lineups per set
- Copy to All Sets copies current set's lineup to all others
- Sub panel shows starter→bench pairing for each position
- Basketball and soccer formations selectable (when sport context matches)

---

### PR #12: Volunteer Management (P1)

**Goal**: Let coaches assign line judges and scorekeepers from mobile.

**Scope**:
1. Volunteer section on attendance screen (visible for games only)
2. Three roles: Line Judge, Scorekeeper (Primary + Backup each)
3. Parent selector from team's parent list
4. "Needs Volunteers" badge on events missing assignments
5. Save to `event_volunteers` table

**Files**:
- `app/attendance.tsx` — add volunteer section below attendance
- `components/VolunteerAssignment.tsx` — NEW (role slots + parent picker)
- `app/(tabs)/gameday.tsx` — "Needs Volunteers" indicator on event cards

**Acceptance Criteria**:
- Volunteer section visible on game events only
- Coach can assign Primary + Backup for Line Judge and Scorekeeper
- Parent selector shows parents from the team's player roster
- "Needs Volunteers" indicator on gameday events missing assignments

---

### PR #13: Blast Analytics + Coach Photo + Dashboard Polish (P1/P2)

**Goal**: Add read tracking for announcements, coach photo upload, and dashboard refinements.

**Scope**:
1. Blast history screen (list of sent blasts with read progress bars)
2. Blast detail view with per-recipient read/unread timestamps
3. Coach photo upload on coach-profile.tsx
4. Recent form (W/L dots) on CoachDashboard hero
5. Auto-save draft in blast-composer (AsyncStorage)
6. DashboardRouter loading skeleton

**Files**:
- `app/blast-history.tsx` — NEW (sent blasts with read tracking)
- `app/blast-detail.tsx` — NEW (per-recipient read view)
- `app/coach-profile.tsx` — add photo upload
- `components/CoachDashboard.tsx` — W/L dots, skeleton
- `app/blast-composer.tsx` — draft auto-save
- `components/DashboardRouter.tsx` — loading skeleton
- `app/_layout.tsx` — add routes

**Acceptance Criteria**:
- Coach can see read % for each sent blast
- Coach can drill into per-recipient read/unread list
- Coach photo uploads and displays on profile
- Last 5 game W/L dots appear on dashboard
- Leaving blast-composer mid-draft and returning restores content
- DashboardRouter shows skeleton instead of blank during routing

---

### PR #14: Chat Enhancements (P1/P2 — iterative)

**Goal**: Bring mobile chat closer to web feature set.

**Scope** (Phase 1):
1. Emoji reactions on chat messages (5 types matching TeamWall)
2. Image attachment support (image picker → Supabase storage)
3. Message delete (own messages only)
4. Basic typing indicator

**Scope** (Phase 2, future PR):
- GIF picker (Tenor API)
- Threads / reply-to
- Read receipts
- Message search

**Files**:
- `app/(tabs)/chats.tsx` — reactions, attachments, delete, typing
- TBD based on existing chat component structure

**Acceptance Criteria** (Phase 1):
- Long-press message → reaction picker
- Attach image from camera/gallery
- Swipe or long-press own message → delete
- "Typing..." indicator when another user is composing

---

### PR #15: Schema Cleanup & Standardization (P0/P2)

**Goal**: Resolve `team_coaches` vs `team_staff` split and other schema inconsistencies.

**Scope**:
1. Audit all references to `team_coaches` and `team_staff` across codebase
2. Standardize on `team_staff` (the primary table used by DashboardRouter and most screens)
3. Update coach-profile.tsx to query `team_staff` instead of `team_coaches`
4. Verify `organization_venues` table TODO is tracked
5. Standardize `player_stats`/`player_skills` usage in PlayerCardExpanded

**Files**:
- `app/coach-profile.tsx` — switch from `team_coaches` to `team_staff`
- `components/PlayerCardExpanded.tsx` — verify `player_stats`/`player_skills` tables exist and are populated
- Other files as discovered during audit

**Acceptance Criteria**:
- Zero references to `team_coaches` remain (or documented as intentional)
- coach-profile shows correct team assignments
- No queries against non-existent or unpopulated tables

---

## Summary: PR Sequence

| PR | Title | Priority | Risk | Key Files |
|----|-------|----------|------|-----------|
| **#8** | Bug Fixes & Data Integrity | P0 | Low | 9 files — route fixes, column standardization, N+1 batching |
| **#9** | Game Completion Wizard + Multi-Sport | P1 | Medium | 6 files (3 new) — wizard, stepper, scoring formats |
| **#10** | Live Game Day Mission Control | P1 | High | 7 files (5 new) — court, scoreboard, stat picker, auto-score |
| **#11** | Lineup Per-Set + Substitutions | P1 | Medium | 2 files (1 new) — set tabs, sub panel, multi-sport formations |
| **#12** | Volunteer Management | P1 | Low | 3 files (1 new) — volunteer assignment, parent picker |
| **#13** | Blast Analytics + Coach Polish | P1/P2 | Low | 7 files (2 new) — read tracking, photo upload, W/L dots |
| **#14** | Chat Enhancements | P1/P2 | Medium | TBD — reactions, images, delete, typing indicator |
| **#15** | Schema Cleanup | P0/P2 | Medium | 2+ files — table standardization |

**Recommended execution order**: PR #8 → #15 → #9 → #10 → #11 → #12 → #13 → #14

Fix bugs and schema first (#8, #15), then build the flagship game-day experience (#9, #10), then fill in lineup and volunteer gaps (#11, #12), then polish (#13, #14).

---

## Cross-Cutting Issues (Apply Across All PRs)

1. **N+1 Query Pattern**: 6 screens use `Promise.all` with per-item queries. Refactor to batch `.in()` queries.
2. **Column Name Inconsistency**: `event_id` vs `schedule_event_id`, `their_score` vs `opponent_score`. Standardize before adding new features.
3. **Role Detection**: `permissions-context.tsx` is the standard. Any `profile?.role` string checks must be replaced.
4. **`team_coaches` vs `team_staff`**: Two tables for the same purpose. Standardize on `team_staff`.
5. **Debug Logs**: Remove all `console.log` statements with `[ScheduleScreen]`, `EVENTS_` prefixes from production code.
6. **Real-Time Subscriptions**: TeamWall has Supabase channel subscriptions. Extend pattern to chat and live game scores.
