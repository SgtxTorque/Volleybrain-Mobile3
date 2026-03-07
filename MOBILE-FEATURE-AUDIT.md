# Lynx Mobile App — Feature Audit

## Date: 2026-03-07
## Total Screens: 72
## Branch: feat/next-five-build

---

## SCREENS BY ROLE

### AUTHENTICATION SCREENS (Public — No Session Required)

| # | Screen | File Path | Description |
|---|--------|-----------|-------------|
| 1 | Welcome | `app/(auth)/welcome.tsx` | Splash screen with sign-in/sign-up CTAs |
| 2 | Login | `app/(auth)/login.tsx` | Email/password authentication |
| 3 | Sign Up | `app/(auth)/signup.tsx` | Account creation with role selection (Coach/Parent/Player) |
| 4 | Redeem Code | `app/(auth)/redeem-code.tsx` | Voucher/promo code entry for registration |
| 5 | Pending Approval | `app/(auth)/pending-approval.tsx` | Holding screen when profile awaits admin approval |

---

### ADMIN SCREENS

| # | Screen | File Path | Description | Key Actions |
|---|--------|-----------|-------------|-------------|
| 1 | Admin Dashboard | `components/AdminHomeScroll.tsx` | Org-wide metrics: smart queue, team health, payment snapshot, coach directory | Search, view queue, switch season/role, refresh |
| 2 | Manage Tab | `app/(tabs)/manage.tsx` | Admin control panel (Tab 2 for admins) | Navigate to admin tools |
| 3 | Admin Schedule | `app/(tabs)/admin-schedule.tsx` | Org-wide event calendar | View/filter events across all teams |
| 4 | Admin Chat | `app/(tabs)/admin-chat.tsx` | Admin messaging interface | Send/receive messages |
| 5 | Admin Teams | `app/(tabs)/admin-teams.tsx` | Team directory and management | View/manage all teams |
| 6 | Admin My Stuff | `app/(tabs)/admin-my-stuff.tsx` | Admin profile/settings | Edit profile, preferences |
| 7 | Registration Hub | `app/registration-hub.tsx` | Approve/deny registrations, assign teams, add notes | Approve, deny, assign team, email notifications |
| 8 | User Management | `app/users.tsx` | User accounts and role management | Approve users, assign roles |
| 9 | Org Directory | `app/org-directory.tsx` | Organization member directory | Search members, view roles |
| 10 | Org Settings | `app/org-settings.tsx` | Organization-level configuration | Edit org settings |
| 11 | Team Management | `app/team-management.tsx` | Create/edit teams, assign players and coaches | Create team, color select, assign players/coaches, move players |
| 12 | Jersey Management | `app/(tabs)/jersey-management.tsx` | Jersey number assignment and preferences | Assign jerseys, track preferences |
| 13 | Season Setup Wizard | `app/season-setup-wizard.tsx` | 5-step guided season creation (Basics → Teams → Registration → Schedule → Review) | Create season, set fees, configure waivers, set schedule templates |
| 14 | Season Settings | `app/season-settings.tsx` | Configure active season parameters | Edit season dates, fees, settings |
| 15 | Season Archives | `app/season-archives.tsx` | Historical season data browser | View past seasons |
| 16 | Season Reports | `app/season-reports.tsx` | Seasonal analytics: games, wins, roster %, financials | View collection rate, outstanding balances, per-family breakdown |
| 17 | Report Viewer | `app/report-viewer.tsx` | Detailed report viewing | Drill into specific reports |
| 18 | Reports Tab | `app/(tabs)/reports-tab.tsx` | Reporting interface | Navigate to reports |
| 19 | Payments Tab | `app/(tabs)/payments.tsx` | Payment items by player/family with status tracking | View unpaid/pending/verified, record payments |
| 20 | Payment Reminders | `app/payment-reminders.tsx` | Send payment reminder notifications | Schedule/send reminders |
| 21 | Blast Composer | `app/blast-composer.tsx` | Create broadcast messages (announcement, schedule change, payment reminder, custom) | Select type, priority, teams; send blast |
| 22 | Blast History | `app/blast-history.tsx` | View sent broadcast messages | Review past blasts |
| 23 | Bulk Event Create | `app/bulk-event-create.tsx` | 4-step wizard for recurring event batch creation | Select days, recurrence, locations; preview and confirm |
| 24 | Venue Manager | `app/venue-manager.tsx` | Venue/location management | Add/edit venues |
| 25 | Coach Background Checks | `app/coach-background-checks.tsx` | Background check status tracking | Track/update check status |
| 26 | Volunteer Assignment | `app/volunteer-assignment.tsx` | 3-step workflow: Select Event → Assign Roles → Confirm & Notify | Assign volunteers, set capacities, notify |
| 27 | Admin Search | `app/admin-search.tsx` | Search users, teams, players | Find any entity |
| 28 | Web Features | `app/web-features.tsx` | Shows features only available on web admin (Form Builder, Waiver Editor, Payment Gateway) | Informational only |

---

### COACH SCREENS

| # | Screen | File Path | Description | Key Actions |
|---|--------|-----------|-------------|-------------|
| 1 | Coach Dashboard | `components/CoachHomeScroll.tsx` | Team-focused home: event hero, prep checklist, team health, roster, leaderboard, shoutouts | Switch teams, RSVP, give shoutout, view roster, refresh |
| 2 | Game Day Tab | `app/(tabs)/gameday.tsx` | Active/upcoming games with in-progress match display (Tab 2 for coaches) | Start game day workflow |
| 3 | Coach Schedule | `app/(tabs)/coach-schedule.tsx` | Coach's team schedule view | View/filter team events |
| 4 | Coach Chat | `app/(tabs)/coach-chat.tsx` | Coach messaging interface | Send/receive messages |
| 5 | Coach Team Hub | `app/(tabs)/coach-team-hub.tsx` | Coach's team management view | View team info, posts |
| 6 | Coach My Stuff | `app/(tabs)/coach-my-stuff.tsx` | Coach profile/settings | Edit profile, preferences |
| 7 | Coach Roster | `app/(tabs)/coach-roster.tsx` | Team roster with search, carousel, action buttons | View players, search, navigate to player details |
| 8 | Game Day Command | `app/game-day-command.tsx` | 4-page workflow: Prep → Live Match → End Set → Post-Game | Set lineup, track live stats, end sets, record scores |
| 9 | Game Prep | `app/game-prep.tsx` | Pre-game preparation with court lineup visualization | Set starting lineup, review opponent |
| 10 | Game Results | `app/game-results.tsx` | Post-game summary and stat recording | Enter final stats, review scores |
| 11 | Game Recap | `app/game-recap.tsx` | Final game recap with highlights | View scores, per-player stats |
| 12 | Lineup Builder | `app/lineup-builder.tsx` | Court visualization with formation selector and drag-drop | Select formation, assign positions, preview lineup |
| 13 | Attendance | `app/attendance.tsx` | Mark player attendance per event | Select event, mark present/absent/late, bulk save |
| 14 | Player Evaluation | `app/player-evaluation.tsx` | 9-skill swipe cards (serving, passing, setting, attacking, blocking, defense, hustle, coachability, teamwork) | Rate 1-10, add per-skill notes |
| 15 | Evaluation Session | `app/evaluation-session.tsx` | Live evaluation session management | Run evaluation for multiple players |
| 16 | Player Evaluations | `app/player-evaluations.tsx` | Evaluation management dashboard | View/manage all evaluations |
| 17 | Coach Challenge Dashboard | `app/coach-challenge-dashboard.tsx` | Challenge management for coaches | View active challenges, track participation |
| 18 | Create Challenge | `app/create-challenge.tsx` | Challenge creation form | Set challenge type, rules, duration |
| 19 | Challenge Library | `app/challenge-library.tsx` | Browse all available challenges | View, assign challenges |
| 20 | Coach Availability | `app/coach-availability.tsx` | Coach scheduling preferences | Set availability |
| 21 | Coach Profile | `app/coach-profile.tsx` | Coach-specific profile info | Edit coach details |
| 22 | Player Goals | `app/player-goals.tsx` | Set/track player development goals | Create goals, track progress |

**Note:** Coaches also have access to Blast Composer, Blast History, Standings, Team Wall, and Team Gallery.

---

### PARENT SCREENS

| # | Screen | File Path | Description | Key Actions |
|---|--------|-----------|-------------|-------------|
| 1 | Parent Dashboard | `components/ParentHomeScroll.tsx` | Family-focused home: day-strip calendar, event hero, RSVP nudges, child metrics, payment status | RSVP, switch child, view payments, view team hub |
| 2 | Parent Schedule | `app/(tabs)/parent-schedule.tsx` | Parent view of child team schedules (Tab 2 for parents) | View events, RSVP |
| 3 | Parent Chat | `app/(tabs)/parent-chat.tsx` | Parent messaging interface | Send/receive messages |
| 4 | Parent Team Hub | `app/(tabs)/parent-team-hub.tsx` | Parent team view | View team info, posts |
| 5 | Parent My Stuff | `app/(tabs)/parent-my-stuff.tsx` | Parent settings/profile | Edit profile, preferences |
| 6 | Parent Registration Hub | `app/parent-registration-hub.tsx` | Family registration & waiver flow with open season discovery | Register children, sign waivers, submit payments |
| 7 | My Kids | `app/my-kids.tsx` | View and manage children | View child details, navigate to player card |
| 8 | My Waivers | `app/my-waivers.tsx` | Waiver status and signing | View/sign pending waivers |
| 9 | Family Payments | `app/family-payments.tsx` | Family payment history and status | View balances, payment history |
| 10 | Claim Account | `app/claim-account.tsx` | Orphan account resolution | Claim existing player profile |
| 11 | Invite Friends | `app/invite-friends.tsx` | Share app with others | Share invite link |

**Note:** Parents also have access to Standings, Achievements, Challenges (view), Team Wall, and Team Gallery.

---

### PLAYER SCREENS

| # | Screen | File Path | Description | Key Actions |
|---|--------|-----------|-------------|-------------|
| 1 | Player Dashboard | `components/PlayerHomeScroll.tsx` | Dark-themed game-menu home: hero identity card, streak banner, next event, game stats, challenges | RSVP, view roster, give shoutout, view stats |
| 2 | Player Card | `app/player-card.tsx` | FIFA-style trading card: XP/OVR, skill breakdown, badges, photo, rarity glow | View card, share |
| 3 | My Stats | `app/my-stats.tsx` | Personal statistics: season selector, summary cards, personal bests, game-by-game history | View stats, skill ratings |
| 4 | Achievements | `app/achievements.tsx` | Player achievement/badge system with rarity tiers | View earned/available badges |
| 5 | Challenges | `app/challenges.tsx` | Challenge library with join/progress UI, time-remaining countdown | Join challenges, track progress |
| 6 | Challenge Detail | `app/challenge-detail.tsx` | Individual challenge details and progress | View requirements, track completion |
| 7 | Challenge Celebration | `app/challenge-celebration.tsx` | Victory celebration modal | Celebrate completed challenge |
| 8 | Challenge CTA | `app/challenge-cta.tsx` | Challenge call-to-action from notifications | Accept/view challenge |
| 9 | Season Progress | `app/season-progress.tsx` | Track season progress metrics | View progress |

**Note:** Players also have access to Standings, Team Wall, Team Gallery, and Chat.

---

### SHARED SCREENS (All Authenticated Roles)

| # | Screen | File Path | Description | Key Actions |
|---|--------|-----------|-------------|-------------|
| 1 | Home | `app/(tabs)/index.tsx` | Routes to role-specific dashboard via DashboardRouter | Role-dependent |
| 2 | Chats | `app/(tabs)/chats.tsx` | Channel list: team_chat, player_chat, DM, group_dm, league_announcement | View channels, unread counts |
| 3 | Chat Detail | `app/chat/[id].tsx` | Individual channel conversation | Send messages, view typing indicators |
| 4 | Schedule | `app/(tabs)/schedule.tsx` | Generic schedule (month/week/list views) | View events, filter by type |
| 5 | Messages | `app/(tabs)/messages.tsx` | Blast messages/alerts feed | Read announcements |
| 6 | Connect / Team Wall | `app/(tabs)/connect.tsx` | Team activity feed/social | View posts, engage |
| 7 | Team Wall | `app/team-wall.tsx` | Team posts, achievements, stats tabs | Post, react, view stats |
| 8 | Team Gallery | `app/team-gallery.tsx` | Photo grid (3 columns), upload, reactions | Upload photos, react |
| 9 | Standings | `app/standings.tsx` | League standings and rankings | View team/league standings |
| 10 | Profile | `app/profile.tsx` | User profile editing (name, photo, email) | Edit personal info |
| 11 | Settings | `app/(tabs)/settings.tsx` | App settings (dark mode toggle, preferences) | Toggle dark mode, edit preferences |
| 12 | Notification Preferences | `app/notification-preferences.tsx` | Configure push notification settings | Toggle notification types |
| 13 | Notification | `app/notification.tsx` | Notification detail view | View/dismiss notifications |
| 14 | My Teams | `app/(tabs)/my-teams.tsx` | User's teams | View team memberships |
| 15 | Help | `app/help.tsx` | FAQ/support documentation | Browse help topics |
| 16 | Privacy Policy | `app/privacy-policy.tsx` | Privacy terms | Read policy |
| 17 | Terms of Service | `app/terms-of-service.tsx` | User agreement | Read terms |
| 18 | Data Rights | `app/data-rights.tsx` | GDPR/data rights info | View/exercise data rights |

---

## DASHBOARD DETAILS BY ROLE

### Admin Dashboard (`AdminHomeScroll`)
- **Compact header** with urgency badge, season selector, role selector
- **Welcome briefing** with team/player counts and queue summary
- **Search bar** for players, families, teams
- **Smart Queue** (top 4 pending registrations/approvals)
- **Season & Team Tiles** with health indicators
- **Payment Snapshot** (collected vs expected, overdue count)
- **Quick Actions Grid** (admin tool shortcuts)
- **Coach Section** (coaches with action items)
- **Upcoming Events**

### Coach Dashboard (`CoachHomeScroll`)
- **Team pills bar** (switch between coached teams)
- **Welcome section** with time-based greeting and contextual briefing
- **Prep Checklist** (event-day specific)
- **Event Hero Card** (next game with RSVP summary)
- **Quick Actions** (mark stats, manage roster, give shoutout)
- **Challenge Quick Card**
- **Team Health Card** (attendance rate, RSVP, roster size)
- **Roster Access Card**
- **Season & Leaderboard** (record, top performers, last game)
- **Team Hub Preview** (social feed snapshot)
- **Recent Activity** and **Team Pulse**

### Parent Dashboard (`ParentHomeScroll`)
- **Day-Strip Calendar** (horizontal date picker with event dots)
- **Welcome section** with rotating contextual messages (RSVP, payment, chat, all-clear)
- **Registration/Profile cards** (conditional prompts)
- **Event Hero Card** with RSVP button
- **MY ATHLETE section** (child card, stats snapshot, XP bar)
- **Challenges and Evaluations cards**
- **Metric Grid** (record, payment status, XP/level, unread chats)
- **Team Hub Preview** and **Chat Preview**
- **Season Snapshot** and **Recent Badges**

### Player Dashboard (`PlayerHomeScroll`)
- **Dark themed** (#0D1B3E game-menu feel)
- **Streak/Level pills** in header
- **Hero Identity Card** (name, team, jersey, position, OVR, XP bar)
- **MY TEAM card** (one-tap to roster)
- **Streak Banner** (if streak >= 2)
- **The Drop** (recent badges, last game stats, shoutouts)
- **Next Up Card** (next event with RSVP + haptic feedback)
- **Chat Peek** (latest team message)
- **Quick Props Row** (give shoutout)
- **Active Challenge** and **Evaluation cards**
- **Last Game Stats** with personal best indicators
- **Leaderboard link**

---

## GESTURE DRAWER MENU (All Roles)

### Profile Header
- Avatar, full name, role badges, org name, "View Profile" button

### Shortcut Row (role-dependent)
- **All:** Home, Schedule, Chats, Blasts
- **Admin:** + Registration, Reports
- **Coach:** + Game Prep, Lineup
- **Parent:** + My Kids, Payments
- **Player:** + My Stats, Achievements

### Menu Sections
| Section | Visible To | Items |
|---------|-----------|-------|
| Quick Access | All | Home, Schedule, Chats, Announcements, Team Wall |
| Admin Tools | Admin | Registration Hub, Users, Payments, Teams, Jerseys, Coaches, Seasons, Reports, Search, Org Directory, Archives, Blasts, Venues, Background Checks, Volunteers, Bulk Events, Org Settings (21 items) |
| Game Day | Admin + Coach | Game Day Command, Game Prep, Lineup Builder, Attendance, Game Results, Game Recap |
| Coaching Tools | Admin + Coach | Evaluations, Challenges, Challenge Library, Player Goals, Blasts, Coach Availability, Coach Profile, My Teams, Roster |
| My Family | Parent | My Children, Registration, Payments, Waivers, Standings, Achievements, Invite Friends |
| My Stuff | Player | My Teams, My Stats, My Player Card, Challenges, Achievements, Season Progress, Standings, Schedule |
| League & Community | All | Team Wall, Standings, Achievements, Coach Directory, Find Orgs |
| Settings & Privacy | All | Profile, Settings, Notifications, Season History, Privacy Policy, Terms |
| Help & Support | All | Help Center, Web Features, Data Rights |

### Badge System (real-time counts)
- `pendingRegistrations`, `pendingApprovals`, `unpaidPaymentsAdmin`, `unpaidPaymentsParent`, `unsignedWaivers`, `unrosteredPlayers`, `unreadChats`

---

## DATA CRUD BY ROLE

### Admin
| Action | Capabilities |
|--------|-------------|
| **View** | All teams, all players, all families, registrations, payments, coaches, schedules, reports, org settings, season archives, background checks, volunteers, venues |
| **Create** | Teams, seasons, events (single + bulk), venues, blast messages, payment reminders, volunteer assignments, challenges (via coaching tools) |
| **Edit** | Team settings (name, color, max players), season settings, org settings, user roles, registration status (approve/deny), payment status, event details |
| **Delete** | Teams (move/remove players), events, venues |

### Coach
| Action | Capabilities |
|--------|-------------|
| **View** | Own team roster, player details, player stats, team schedule, team health, RSVP counts, leaderboard, evaluations, challenges, team wall |
| **Create** | Events (single), lineup, player evaluations, challenges, shoutouts, blast messages, game stats, attendance records |
| **Edit** | Lineup, attendance, game scores/stats, player positions, evaluation ratings, challenge status, coach availability, coach profile |
| **Delete** | N/A (no destructive actions surfaced in coach screens) |

### Parent
| Action | Capabilities |
|--------|-------------|
| **View** | Child schedule, child stats, child player card, child achievements/badges, team wall, team gallery, family payments, waivers, standings, evaluations |
| **Create** | RSVP responses, registration submissions, waiver signatures, chat messages, shoutouts |
| **Edit** | RSVP status, profile info, notification preferences |
| **Delete** | N/A (no destructive actions surfaced in parent screens) |

### Player
| Action | Capabilities |
|--------|-------------|
| **View** | Own stats, player card, achievements, challenges, team roster, team wall, team gallery, standings, leaderboard, next event, streaks |
| **Create** | RSVP responses, chat messages, shoutouts, challenge participation |
| **Edit** | RSVP status, profile info, notification preferences |
| **Delete** | N/A (no destructive actions surfaced in player screens) |

---

## FEATURE CHECKLIST

### Registration & Onboarding

| Feature | Status | Notes |
|---------|--------|-------|
| Player registration flow (parent registers child) | YES | Full multi-step flow in `parent-registration-hub.tsx` and `register/[seasonId]` with family info, player details, waivers, payment |
| Multi-child registration | YES | Child-switching UI, profile completion tracking, incomplete profile detection with mini-form |
| Returning family detection | YES | Detects returning families and shows returning family cards for faster re-registration |
| Waiver signing (electronic) | YES | Touch signature pad (react-native-signature-canvas) with finger-drawn signatures, fallback to typed name, per-waiver scroll-to-accept |
| Payment during registration | YES | Fee breakdown (registration + uniform), email queue for payment confirmation |
| Registration approval workflow | YES | Admin approve/deny with status badges, notes, team assignment, email notifications |
| Open registration detection | YES | Auto-detects `registration_open=true` seasons with deadline countdown, early bird discounts, capacity/waitlist info |

### Schedule & Events

| Feature | Status | Notes |
|---------|--------|-------|
| Calendar view (month/week/day/list) | YES | Month, week, and list view modes with date picker and current date highlighting |
| Event creation (single) | YES | Modal with event type, date/time pickers, location, opponent, arrival time, duration |
| Bulk event creation (recurring) | YES | 4-step wizard: day selection → recurrence → location → preview & confirm |
| RSVP system | YES | Yes/no/maybe with tracking in `event_rsvps` table, counts on event cards |
| RSVP management (admin/coach views RSVPs) | YES | RSVP summary counts on event hero cards, attendance screen shows RSVP preview |
| Event detail modal/page | YES | `EventDetailModal` with full event info, opponent, location, map link, RSVP status, role-aware actions |
| Game Day mode/workflow | YES | 4-page command center: Prep → Live Match → End Set → Post-Game with MatchProvider context |
| Attendance tracking | YES | Per-event roster with present/absent/late marking and bulk save |

### Roster & Players

| Feature | Status | Notes |
|---------|--------|-------|
| Roster view (coach sees their team) | YES | Coach roster screen with team filter, player search, scrollable carousel, action buttons |
| Player profile view | YES | Full details in `PlayerCardExpanded`: name, jersey, position, grade, school, contact, medical/allergy data |
| Player evaluation/scoring | YES | 9-skill swipe cards (serving, passing, setting, attacking, blocking, defense, hustle, coachability, teamwork) rated 1-10 with notes |
| Position assignment | YES | Position field in players table, assignment during roster management, display in player cards and lineup builder |
| Jersey number assignment | YES | `jersey-management.tsx` with jersey preferences (pref 1/2/3), assignment tracking, conflict alerts |
| Jersey size management | PARTIAL | Jersey management exists but size field not clearly surfaced in UI |
| Player trading card view | YES | FIFA-style full-screen card: XP/OVR ratings, skill breakdown, badges, photo, rarity glow effects |
| Scouting report / skill bars | YES | Animated stat bars (`AnimatedStatBar`, `PlayerStatBar`) showing passing, serving, hitting, blocking, setting, defense with color coding |

### Communication

| Feature | Status | Notes |
|---------|--------|-------|
| Team chat (real-time messaging) | YES | Full chat system with team_chat, player_chat, DM, group_dm, league_announcement channels; typing indicators, unread counts |
| COPPA-compliant chat permissions | YES | `CoppaConsentModal` for parental consent on children's data, tracks `coppa_consent_given` flag |
| Shoutouts / kudos system | YES | Give/receive shoutouts with category emoji, message text, `team_posts` integration, XP rewards |
| Blast messaging (admin/coach to all parents) | YES | BlastComposer with message types (announcement, schedule_change, payment_reminder, custom), priority levels, team targeting |
| Push notifications | YES | expo-notifications integration with user preference controls, scheduled reminder checks |
| In-app notifications feed | YES | Notification screen with dismiss/action options, NotificationBell with unread badge |

### Payments

| Feature | Status | Notes |
|---------|--------|-------|
| View balance / invoices | YES | Payments tab grouped by player/family with status (unpaid/pending/verified), fee breakdown by type |
| Make payment (Stripe) | PARTIAL | Payment recording exists on mobile; Stripe checkout integration visible only in web admin reference (`stripe-checkout.js`) |
| Payment plans | NO | No installment/plan scheduling system found |
| Payment reminders | YES | Dedicated screen with reminder scheduling, sent via blast system with `due_date` tracking |
| Payment history | YES | Status-verified payments with `verified_at` timestamp, payment method (cash/check/venmo/zelle/cashapp/other), payer name |
| Admin financial overview | YES | `season-reports.tsx`: total collected vs expected, collection rate %, outstanding balance, per-family breakdown |

### Gamification

| Feature | Status | Notes |
|---------|--------|-------|
| XP system | YES | `XP_BY_SOURCE` constants, earned from games, stats, shoutouts, achievements; services in `giveShoutout`, `achievement-engine.ts` |
| Levels / tiers | YES | `getLevelFromXP`, `getLevelTier` functions, level badges on profile, `LevelUpCelebrationModal` for milestones |
| Badges / achievements | YES | Comprehensive system: `achievement-types.ts`, `achievement-engine.ts`, rarity tiers, seasonal + role-specific achievements, celebration modals |
| Leaderboards | YES | LeaderboardScreen with grid and full list views, top 3 per category, Season MVPs, role-aware highlighting |
| Daily challenges | YES | Challenge system with active/completed/expired filters, time-remaining countdown, participation tracking, per-player join |
| Streaks | PARTIAL | Attendance streak tracked and displayed in Player Dashboard (streak >= 2 shows banner), but no dedicated streak management system |
| Player trading card aesthetic | YES | Rarity colors, animated stat bars, XP/OVR display, badges, gradient effects on card backgrounds |

### Team Management (Admin)

| Feature | Status | Notes |
|---------|--------|-------|
| Create/edit teams | YES | `team-management.tsx`: create modal, color selection, max players, age group assignment, edit workflows |
| Assign players to teams | YES | Player assignment with jersey number, status tracking, move-between-teams modal |
| Assign coaches to teams | YES | Coach assignment with role selection via `team_coaches` table, remove functionality |
| Season setup wizard | YES | 5-step wizard: Basics → Teams → Registration → Schedule → Review |
| Season management | YES | Season creation, team assignment, registration settings, schedule templates, status (draft/active) toggle |
| Organization settings | YES | `org-settings.tsx` for org-level configuration, user role management |

### Reports & Analytics

| Feature | Status | Notes |
|---------|--------|-------|
| Player stats | YES | `my-stats.tsx`: season selector, summary cards, personal bests, game-by-game history, skill ratings modal |
| Team stats | YES | Team Wall stats tab with kill leaders, assist leaders aggregated by team |
| Game recaps | YES | `game-recap.tsx`: score, opponent, date, time, location, per-player stats snapshot |
| Season summaries | YES | `season-reports.tsx`: games played, wins/losses, player count, roster fill %, waiver compliance, event counts |
| Financial reports | YES | Collection rate %, outstanding balance, total collected vs expected, per-family breakdown |
| Attendance reports | YES | Per-event attendance with present/absent/late status, coach review and bulk marking |

### Other

| Feature | Status | Notes |
|---------|--------|-------|
| Dark mode | YES | Theme system with `useTheme` hook, mode toggle in settings, context-aware light/dark palettes |
| Role switcher | YES | `RoleSelector` component + `devViewAs` in usePermissions, admin can switch to coach/parent view |
| Profile management | YES | `profile.tsx` with name, photo, email editing; `complete-profile.tsx` for missing required fields |
| Volunteer management | YES | `volunteer-assignment.tsx`: 3-step workflow (Select Event → Assign Roles → Confirm & Notify), role capacities |
| Team wall / social feed | YES | `team-wall.tsx` with posts, achievements tab, stats tab; photo/reaction support |
| Photo sharing | YES | `team-gallery.tsx`: 3-column grid, upload, reactions, permission-based uploads |
| Lineup builder | YES | `lineup-builder.tsx`: court visualization, formation selector (sport-specific), position drag-drop |
| Score entry | YES | `game-day-command.tsx` LiveMatchPage: set score tracking, live stat entry (kills, aces, digs, blocks, assists), end-set workflow |

---

## FEATURE SUMMARY

| Category | Total | YES | PARTIAL | NO |
|----------|-------|-----|---------|-----|
| Registration & Onboarding | 7 | 7 | 0 | 0 |
| Schedule & Events | 8 | 8 | 0 | 0 |
| Roster & Players | 8 | 7 | 1 | 0 |
| Communication | 6 | 6 | 0 | 0 |
| Payments | 6 | 4 | 1 | 1 |
| Gamification | 7 | 5 | 1 | 1 |
| Team Management (Admin) | 6 | 6 | 0 | 0 |
| Reports & Analytics | 6 | 6 | 0 | 0 |
| Other | 8 | 8 | 0 | 0 |
| **TOTAL** | **62** | **57** | **3** | **2** |

**Coverage: 92% fully implemented, 5% partial, 3% missing**

### Missing / Partial Items
| Feature | Status | Gap Description |
|---------|--------|----------------|
| Payment plans | NO | No installment scheduling. Parents pay full amount or admin records manual payments. |
| Streaks | PARTIAL | Attendance streak counter exists in Player Dashboard but no dedicated streak management, streak rewards, or streak recovery. |
| Stripe mobile payment | PARTIAL | Payment recording on mobile; actual Stripe checkout only in web admin. Mobile tracks cash/check/venmo/zelle/cashapp/other. |
| Jersey size management | PARTIAL | Jersey management screen exists with number assignment but size field not clearly surfaced in mobile UI. |

---

## SUPABASE TABLES

### Tables (56 total)

| # | Table Name | Primary Usage |
|---|-----------|---------------|
| 1 | `achievements` | Achievement definitions (types, rarity, criteria) |
| 2 | `age_groups` | Age group definitions for team organization |
| 3 | `channel_members` | Chat channel membership |
| 4 | `challenge_participants` | Player participation in challenges |
| 5 | `chat_channels` | Chat channel definitions (team_chat, DM, etc.) |
| 6 | `chat_messages` | Individual chat messages |
| 7 | `coach_availability` | Coach scheduling preferences |
| 8 | `coach_challenges` | Coach-created challenges |
| 9 | `coaches` | Coach profiles and credentials |
| 10 | `event_attendance` | Per-event attendance records (present/absent/late) |
| 11 | `event_rsvps` | RSVP responses for events |
| 12 | `event_volunteers` | Volunteer assignments per event |
| 13 | `families` | Family group definitions |
| 14 | `game_lineups` | Game lineup configurations |
| 15 | `game_player_stats` | Per-game player statistics (uses `event_id` FK) |
| 16 | `invitations` | Invitation codes for registration |
| 17 | `message_attachments` | Chat message file attachments |
| 18 | `message_reactions` | Emoji reactions on messages |
| 19 | `message_recipients` | Blast message recipient tracking |
| 20 | `messages` | Blast/announcement messages |
| 21 | `notifications` | In-app notification records |
| 22 | `organization_sports` | Sports offered by organization |
| 23 | `organizations` | Organization profiles |
| 24 | `payment_settings` | Payment configuration per season |
| 25 | `payments` | Payment records and status |
| 26 | `player_achievements` | Player-earned achievements |
| 27 | `player_badges` | Player badge inventory |
| 28 | `player_coach_notes` | Coach notes on individual players |
| 29 | `player_evaluations` | Formal evaluation records |
| 30 | `player_game_stats` | Aggregated game statistics |
| 31 | `player_goals` | Player development goal tracking |
| 32 | `player_guardians` | Guardian-player relationships |
| 33 | `player_parents` | Parent-player relationships |
| 34 | `player_season_stats` | Season-aggregated statistics |
| 35 | `player_skill_ratings` | Skill evaluation ratings (1-10) |
| 36 | `player_skills` | Player skill definitions |
| 37 | `player_stats` | Core player statistics |
| 38 | `player_tracked_achievements` | Achievement progress tracking |
| 39 | `players` | Player profiles (name, position, jersey, medical) |
| 40 | `profiles` | User profiles (auth-linked) |
| 41 | `registrations` | Season registration records |
| 42 | `schedule_events` | Calendar events (games, practices, events) |
| 43 | `season_fees` | Fee structure per season |
| 44 | `seasons` | Season definitions |
| 45 | `shoutouts` | Shoutout/kudos records |
| 46 | `sports` | Sport definitions |
| 47 | `team_coaches` | Coach-team assignments (coach_id, role) |
| 48 | `team_invite_codes` | Team-specific invite codes |
| 49 | `team_players` | Player-team roster assignments |
| 50 | `team_posts` | Team wall social posts |
| 51 | `team_staff` | Staff-team assignments (user_id, staff_role) |
| 52 | `team_standings` | Team win/loss/rankings |
| 53 | `teams` | Team definitions |
| 54 | `typing_indicators` | Real-time chat typing status |
| 55 | `user_roles` | User role assignments |
| 56 | `waiver_signatures` | Electronic waiver signature records |

### RPC Functions (11 total)

| # | Function | Purpose |
|---|----------|---------|
| 1 | `assign_jersey` | Assign jersey number to player |
| 2 | `check_game_reminders` | 24-hour game reminder check |
| 3 | `check_game_reminders_2hr` | 2-hour game reminder check |
| 4 | `check_payment_reminders` | Payment reminder schedule check |
| 5 | `check_rsvp_reminders` | RSVP reminder check |
| 6 | `get_pending_emails` | Retrieve pending notification emails |
| 7 | `get_team_parent_ids` | Get parent user IDs for a team |
| 8 | `mark_email_failed` | Mark email notification as failed |
| 9 | `mark_email_sent` | Mark email notification as sent |
| 10 | `queue_notification` | Queue a single notification |
| 11 | `queue_team_notification` | Queue a team-wide notification |

### Storage Buckets (4 total)

| # | Bucket | Purpose |
|---|--------|---------|
| 1 | `media` | Profile photos and general media uploads |
| 2 | `photos` | Team/event photos |
| 3 | `player-photos` | Player profile photos |
| 4 | `waivers` | Waiver PDF documents |

---

## WEB-ONLY FEATURES (Referenced but not implemented on mobile)

These features are surfaced in the `web-features.tsx` screen as "Available on Web Admin":
- **Form Builder** — Custom registration form creation
- **Waiver Editor** — Create/edit waiver templates
- **Payment Gateway** — Stripe checkout integration for online payments

---

*Generated by automated codebase audit on 2026-03-07*
