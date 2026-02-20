# Admin Experience Parity Audit: Web Reference vs Expo App

## Design Philosophy

> "Stripe Dashboard meets tournament command center" — The admin mobile experience is NOT a 1:1 clone of the web portal. The web portal is the heavy-lifting configuration suite for desktop use. The mobile admin experience is a lightweight **operational command center** — things an admin needs to check or do quickly from their phone while at a tournament, in the car, or away from their computer.

The admin journey: open app → see what needs attention (pending registrations, outstanding payments, today's games, account approvals) → take action in 2-3 taps → drop into Coach or Parent view for team-specific work.

**Key principles:**
- **Aggregate view**: Admin sees across ALL teams, not just one
- **Action-oriented**: Every metric is tappable and leads to an action
- **Notification-driven**: Badge counts pull admin toward what needs attention
- **Quick operations**: Approve registration in 2 taps, send blast in 3, move player in 4
- **Role switching**: Admin can always drop into Coach/Parent/Player view
- **Clean & professional**: Less gaming aesthetic, more Stripe/Linear feel

---

## PHASE 1: Web Reference Admin Experience Inventory

### A. Admin-Facing Pages (reference/web-admin/src/pages/)

| Feature | Web File Path | Lines | Description |
|---------|---------------|-------|-------------|
| Admin Dashboard | `/dashboard/DashboardPage.jsx` | ~600 | KPI cards (registrations, revenue, roster), donut/line charts, quick actions, journey timeline, getting started guide |
| Registration Management | `/registrations/RegistrationsPage.jsx` | ~1200 | Table + analytics views, bulk approve/deny/waitlist, waiver status, CSV export, registration funnel, grade/gender distribution, revenue breakdown |
| Team Management | `/teams/TeamsPage.jsx` | ~800 | Team grid (list/cards/compact), create team (4-tab modal: info, classification, roster, settings), unrostered player alert, roster views, quick-add, CSV export |
| Coach Management | `/coaches/CoachesPage.jsx` | ~700 | Coach cards with certs/teams, detail/form/assign modals, background check tracking, search/filter, bulk actions |
| Schedule Management | `/schedule/SchedulePage.jsx` | ~500 | Month/week/list views, event creation, lineup builder (sport-aware), schedule poster, game day share |
| Attendance & Volunteers | `/attendance/AttendancePage.jsx` | ~600 | Event list with RSVP counts, roster with status toggles, volunteer assignment (line judge, scorekeeper), stat cards |
| Payment Management | `/payments/PaymentsPage.jsx` | ~500 | Player/family views, mark paid/unpaid, payment history, bulk fee generation, stats, CSV export |
| Blast/Announcements | `/blasts/BlastsPage.jsx` | ~400 | Stat cards (sent, read rate, pending), compose modal, detail modal with read receipts, filter by type/priority |
| Organization Settings | `/settings/OrganizationPage.jsx` | ~1500 | 15+ expandable sections: identity, contact, online presence, sports, legal, payment, fees, registration, custom questions, waivers, jersey, notifications, coach requirements, volunteers, branding |
| Season Management | `/settings/SeasonsPage.jsx` | ~500 | Season cards, create/edit (3 tabs: basic, registration, fees), clone, share registration link, template selection |
| Waiver Management | `/settings/WaiversPage.jsx` | ~600 | Template list with filters, editor (name, content, PDF upload, signature toggle), version tracking, edit history, send ad-hoc, signature stats |
| Registration Templates | `/settings/RegistrationTemplatesPage.jsx` | ~400 | Create/edit registration form templates, field customization per section |
| Payment Setup | `/settings/PaymentSetupPage.jsx` | ~300 | Stripe configuration, payment method toggles |
| Subscription Management | `/settings/SubscriptionPage.jsx` | ~200 | Plan tier, billing cycle, subscription status |
| Data Export | `/settings/DataExportPage.jsx` | ~200 | Export org data to CSV/PDF |
| Reports | `/reports/ReportsPage.jsx` | ~800 | 3 categories (People, Financial, Operations), 11 report types, dynamic columns, sort/filter, presets, CSV/PDF export |
| Registration Funnel | `/reports/RegistrationFunnelPage.jsx` | ~300 | Submitted→pending→approved→rostered conversion funnel |
| Achievement Catalog | `/achievements/AchievementsCatalogPage.jsx` | ~500 | Achievement cards with rarity, category/type/search filters, detail modal, admin preview mode |
| Jersey Management | `/jerseys/JerseysPage.jsx` | ~300 | Jersey design preview, number assignments, order tracking |
| Chat Management | `/chats/ChatsPage.jsx` | ~400 | Team/group channels, message moderation |
| Notification Settings | `/notifications/NotificationsPage.jsx` | ~200 | Configure notification preferences |
| Standings | `/standings/StandingsPage.jsx` | ~300 | Team standings with W-L records |
| Leaderboards | `/leaderboards/SeasonLeaderboardsPage.jsx` | ~300 | Player stat leaderboards |
| Coach Dashboard | `/roles/CoachDashboard.jsx` | ~400 | Coach-specific view (team header, roster, record, events, quick actions) |
| Parent Dashboard | `/roles/ParentDashboard.jsx` | ~400 | Parent-specific view |
| Player Dashboard | `/roles/PlayerDashboard.jsx` | ~300 | Player-specific view |
| Coach Availability | `/schedule/CoachAvailabilityPage.jsx` | ~200 | Track coach event availability |
| Game Prep / Command Center | `/gameprep/GamePrepPage.jsx`, `GameDayCommandCenter.jsx` | ~500 | Pre-game prep, live game management |
| Public Registration | `/public/PublicRegistrationPage.jsx` | ~400 | Public-facing registration form |
| Org Directory | `/public/OrgDirectoryPage.jsx` | ~200 | Public org listing |
| Platform Admin | `/platform/PlatformAdminPage.jsx` | ~300 | Super admin org management |
| Platform Analytics | `/platform/PlatformAnalyticsPage.jsx` | ~200 | Platform-wide analytics |
| Platform Subscriptions | `/platform/PlatformSubscriptionsPage.jsx` | ~200 | Manage all org subscriptions |

### B. Admin-Relevant Components (Web)

| Component | Purpose |
|-----------|---------|
| PlayerCardExpanded | Full player detail modal (stats, teams, waivers, medical) |
| RegistrationAnalytics | Donut charts, funnel, grade/gender distribution |
| PaymentCard | Collapsible player/family payment card with fee list |
| CoachCard | Coach profile card with certs, teams, actions |
| TeamCard | Team card with roster, color accent, actions |
| SeasonCard | Season card with stats, registration toggle, share |
| ReportTable | Dynamic sortable/filterable data table with export |
| SchedulePoster | Shareable game schedule graphic generator |
| WaiverEditor | Rich text waiver template editor |
| AchievementCard | Achievement display with rarity glow, progress |

### C. Key Data Tables (Admin-Specific)

| Table | Admin Reads | Admin Writes | Purpose |
|-------|-------------|--------------|---------|
| `organizations` | Yes | Yes | Org profile, settings, branding, Stripe config |
| `seasons` | Yes | Yes | Season CRUD, fee structure, registration config |
| `registrations` | Yes | Yes | Approve/deny, waitlist, admin notes |
| `payments` | Yes | Yes | Verify, record, track, reconcile |
| `season_fees` | Yes | Yes | Fee structure per season |
| `teams` | Yes | Yes | Create/edit teams, set roster limits |
| `team_players` | Yes | Yes | Assign/move players between teams |
| `team_staff` | Yes | Yes | Assign staff roles to teams |
| `team_coaches` | Yes | Yes | Assign coaches to teams |
| `coaches` | Yes | Yes | Coach profiles, certifications |
| `players` | Yes | Yes | Player profiles, medical, waivers |
| `user_roles` | Yes | Yes | Role assignment, grant/revoke |
| `waiver_templates` | Yes | Yes | Create/edit/version waiver templates |
| `waiver_signatures` | Yes | Read | Track waiver compliance |
| `achievements` | Yes | Yes | Create/edit achievement definitions |
| `player_achievements` | Yes | Yes | Verify achievements |
| `announcements` | Yes | Yes | Org-wide announcements |
| `messages` | Yes | Yes | Team blasts |
| `venues` | Yes | Yes | Venue CRUD |
| `invitations` | Yes | Yes | Send/track/revoke invites |
| `admin_notifications` | Yes | Yes | Admin-specific alerts |
| `stripe_payment_intents` | Yes | Read | Payment processing monitoring |
| `jersey_assignments` | Yes | Yes | Jersey number tracking |
| `schedule_events` | Yes | Yes | Event CRUD, results entry |
| `families` | Yes | Read | Family grouping for payments |
| `age_groups` | Yes | Yes | Season age group definitions |
| `sports` | Yes | Yes | Sport definitions, colors |

---

## PHASE 2: Expo App Admin Experience Inventory

### A. Tab Navigation (Admin View)

| Tab | File | Lines | Status | Purpose |
|-----|------|-------|--------|---------|
| Home | `app/(tabs)/index.tsx` | ~50 | Working | Routes to AdminDashboard when isAdmin |
| Game Day | `app/(tabs)/gameday.tsx` | ~700 | Working | Game prep (shared with coach) |
| Team | `app/(tabs)/connect.tsx` | ~30 | Working | Team Wall (shared with all roles) |
| Manage | `app/(tabs)/manage.tsx` | ~250 | Working | Admin tools section with 6 items |
| Me | `app/(tabs)/me.tsx` | ~530 | Working | Admin shortcuts + admin tools section |

### B. Full-Page Routes (Admin-Accessible)

| Route | File | Lines | Status | Purpose |
|-------|------|-------|--------|---------|
| `/registration-hub` | `app/registration-hub.tsx` | ~1237 | Working | Full registration management: approve/deny/waitlist/assign to team, payment tracking, medical flags |
| `/users` | `app/users.tsx` | ~619 | Working | User management: approve/reject accounts, assign/revoke roles, search/filter by role |
| `/(tabs)/payments` | `app/(tabs)/payments.tsx` | ~1297 | Working | Payment admin: verify/reject, record manual payments, stats, search/filter |
| `/season-settings` | `app/season-settings.tsx` | ~600+ | Working | Season CRUD, fee management, toggle registration, age groups |
| `/(tabs)/reports-tab` | `components/ReportsScreen.tsx` | ~150 | Working | Report categories, multiple viz types (table, bar, pie, calendar) |
| `/report-viewer` | `app/report-viewer.tsx` | ~300+ | Working | Individual report display with filters |
| `/org-directory` | `app/org-directory.tsx` | ~150 | Working | Browse organizations, search, view details |
| `/blast-composer` | `app/blast-composer.tsx` | ~500 | Working | Compose announcements: title, body, type, priority, target audience |
| `/season-archives` | `app/season-archives.tsx` | ~50 | Stub | Route exists, minimal implementation |
| `/game-prep` | `app/game-prep.tsx` | ~1600 | Working | Live game scoring (shared with coach) |
| `/lineup-builder` | `app/lineup-builder.tsx` | ~1200 | Working | Lineup management (shared with coach) |
| `/attendance` | `app/attendance.tsx` | ~640 | Working | Attendance tracking (shared with coach) |

### C. Key Components (Admin-Relevant)

| Component | File | Lines | Status | Purpose |
|-----------|------|-------|--------|---------|
| AdminDashboard | `components/AdminDashboard.tsx` | ~1292 | Working | Hero section (org name, season, counts), smart alerts (6 types), revenue pulse, quick actions (4), recent activity, org stats (6-stat grid), season management, invite management (6 options) |
| SeasonFeesManager | `components/SeasonFeesManager.tsx` | ~200+ | Working | Fee structure editor for season settings |
| ReportsScreen | `components/ReportsScreen.tsx` | ~150 | Working | Report category grid and report selection |

### D. Context/Hooks (Admin-Relevant)

| Hook/Context | File | Purpose |
|--------------|------|---------|
| `usePermissions()` | `lib/permissions-context.tsx` | `isAdmin` boolean from `user_roles` table where role = `'league_admin'` |
| `useSeason()` | `lib/season-context.tsx` | `workingSeason` for season-scoped queries |
| `useAuth()` | `lib/auth.tsx` | `user`, `profile`, `organization` |
| `useTeam()` | `lib/team-context.tsx` | Selected team context |

---

## PHASE 3: Complete Parity Matrix

### Legend
- **FULL** = Feature exists on mobile with equivalent functionality
- **PARTIAL** = Feature exists but missing key capabilities
- **STUB** = Route/component exists but minimal implementation
- **MISSING** = Not present on mobile at all
- **N/A** = Not applicable to mobile
- **MOBILE ESSENTIAL** = Must have on phone for on-the-go admin
- **NICE-TO-HAVE** = Useful but not critical on phone
- **WEB ONLY** = Complex configuration better done on desktop

### A. Dashboard & Overview

| Feature | Web | Mobile | Status | Mobile Priority | Gap Details |
|---------|-----|--------|--------|-----------------|-------------|
| Admin dashboard with KPIs | Yes | Yes | FULL | ESSENTIAL | AdminDashboard has hero, alerts, revenue, stats |
| Pending registration count | Yes | Yes | FULL | ESSENTIAL | Alert card with count + tap to registration hub |
| Outstanding payment amount | Yes | Yes | FULL | ESSENTIAL | Revenue pulse card with collected % |
| Quick actions (4 buttons) | Yes | Yes | FULL | ESSENTIAL | Registrations, Blast, Reports, Users |
| Recent activity feed | Yes | Yes | FULL | ESSENTIAL | Last 5 registrations/payments |
| Org stats grid (6 metrics) | Yes | Yes | FULL | ESSENTIAL | Teams, players, coaches, games, roster%, revenue% |
| Season management/picker | Yes | Yes | FULL | ESSENTIAL | Season selector, toggle registration, create season |
| Invite management | Yes | Yes | FULL | ESSENTIAL | 6 invite types, pending list, resend/revoke |
| Journey/onboarding timeline | Yes | No | MISSING | NICE-TO-HAVE | Web shows setup completion %; mobile has no onboarding progress |
| Getting started guide | Yes | No | MISSING | WEB ONLY | Only needed during initial setup |
| Registration donut chart | Yes | No | MISSING | NICE-TO-HAVE | Web shows pending/approved/rostered breakdown chart |
| Financial line chart (trends) | Yes | No | MISSING | NICE-TO-HAVE | Web shows monthly payment trends |
| Badge counts on Manage tab items | Yes | No | MISSING | ESSENTIAL | Manage tab items have no badge indicators for pending counts |
| Today's games section | Yes | No | MISSING | ESSENTIAL | Dashboard doesn't highlight today's games across all teams |

### B. Registration Management

| Feature | Web | Mobile | Status | Mobile Priority | Gap Details |
|---------|-----|--------|--------|-----------------|-------------|
| Registration list with search | Yes | Yes | FULL | ESSENTIAL | Search, status filters, card-based display |
| Approve registration | Yes | Yes | FULL | ESSENTIAL | Single tap approve with fee auto-generation |
| Deny with reason | Yes | Yes | FULL | ESSENTIAL | Prompt for denial reason |
| Waitlist management | Yes | Yes | FULL | ESSENTIAL | Waitlist status with position tracking |
| Assign to team | Yes | Yes | FULL | ESSENTIAL | Team picker + auto-create RSVPs for future events |
| Payment tracking per registration | Yes | Yes | FULL | ESSENTIAL | Shows paid/unpaid status inline |
| Medical flags | Yes | Yes | FULL | ESSENTIAL | Shows allergies, conditions, medications |
| Waiver status badges | Yes | No | MISSING | ESSENTIAL | Web shows ✓/✗ per waiver; mobile doesn't show waiver completion |
| Bulk approve/deny | Yes | No | MISSING | NICE-TO-HAVE | Web has checkbox + bulk actions; mobile is one-at-a-time |
| Registration analytics tab | Yes | No | MISSING | NICE-TO-HAVE | Funnel, grade/gender distribution, capacity bar, revenue breakdown |
| CSV export | Yes | No | MISSING | NICE-TO-HAVE | Web exports to CSV with custom columns |
| Edit player info from registration | Yes | Partial | PARTIAL | NICE-TO-HAVE | Mobile can view but limited inline editing |
| Custom registration answers | Yes | Partial | PARTIAL | NICE-TO-HAVE | Data stored but not prominently displayed |

### C. Team & Roster Management

| Feature | Web | Mobile | Status | Mobile Priority | Gap Details |
|---------|-----|--------|--------|-----------------|-------------|
| View all teams | Yes | Via Coach | PARTIAL | ESSENTIAL | Admin can see teams via coach role switch; no admin-level all-teams view |
| Create team | Yes | No | MISSING | ESSENTIAL | Web has 4-tab create modal; mobile has no team creation |
| Edit team (name, color, limits) | Yes | No | MISSING | ESSENTIAL | Web has inline edit; mobile has no team editing |
| Delete team | Yes | No | MISSING | WEB ONLY | Destructive action better on web |
| Move player between teams | Yes | No | MISSING | ESSENTIAL | Web has drag/drop or dropdown; mobile can't reassign players |
| Unrostered player alert | Yes | Partial | PARTIAL | ESSENTIAL | AdminDashboard alerts about "ready for teams" but no inline assign |
| Roster view per team | Yes | Via Coach | PARTIAL | ESSENTIAL | Coach view shows roster; no admin aggregate roster view |
| Assign jersey numbers | Yes | No | MISSING | NICE-TO-HAVE | Web has jersey assignment; mobile doesn't |
| Team color picker | Yes | No | MISSING | WEB ONLY | Better on web with color palette |
| Roster limits (min/max) | Yes | No | MISSING | WEB ONLY | Configuration better on web |
| Sync rostered status | Yes | Partial | PARTIAL | ESSENTIAL | Registration hub assigns to team but doesn't explicitly sync status |

### D. Coach Management

| Feature | Web | Mobile | Status | Mobile Priority | Gap Details |
|---------|-----|--------|--------|-----------------|-------------|
| View all coaches | Yes | No | MISSING | NICE-TO-HAVE | No coach directory on mobile |
| Add/edit coach | Yes | No | MISSING | WEB ONLY | Complex form better on web |
| Assign coach to team | Yes | No | MISSING | ESSENTIAL | Can't assign coaches from mobile |
| Background check tracking | Yes | No | MISSING | NICE-TO-HAVE | Web shows status, dates, expiry |
| Waiver/CoC status | Yes | No | MISSING | NICE-TO-HAVE | Web shows signed/unsigned per coach |
| Coach detail modal | Yes | No | MISSING | NICE-TO-HAVE | Full coach profile view |
| Coach certification tracking | Yes | No | MISSING | NICE-TO-HAVE | CPR, SafeSport, licenses |

### E. Payment Management

| Feature | Web | Mobile | Status | Mobile Priority | Gap Details |
|---------|-----|--------|--------|-----------------|-------------|
| View payments by player | Yes | Yes | FULL | ESSENTIAL | Grouped by player with fee breakdown |
| View payments by family | Yes | No | MISSING | NICE-TO-HAVE | Web groups by family; mobile shows by player only |
| Verify pending payments | Yes | Yes | FULL | ESSENTIAL | Bulk or individual verification |
| Reject payments | Yes | Yes | FULL | ESSENTIAL | Reset to unpaid status |
| Record manual payment | Yes | Yes | FULL | ESSENTIAL | Cash, check, Venmo, Zelle, CashApp with notes |
| Payment stats cards | Yes | Yes | FULL | ESSENTIAL | Unpaid/Pending/Paid amounts |
| Mark paid/unpaid per fee | Yes | Yes | FULL | ESSENTIAL | Toggle individual fee items |
| Payment history per player | Yes | Partial | PARTIAL | NICE-TO-HAVE | Mobile shows status but limited history view |
| Generate fees for existing players | Yes | No | MISSING | NICE-TO-HAVE | Web has backfill action |
| CSV export | Yes | No | MISSING | NICE-TO-HAVE | Web exports payment data |
| Stripe dashboard link | Yes | No | MISSING | WEB ONLY | External link to Stripe |
| Refund processing | Yes | No | MISSING | WEB ONLY | Complex financial action |

### F. Season & Settings

| Feature | Web | Mobile | Status | Mobile Priority | Gap Details |
|---------|-----|--------|--------|-----------------|-------------|
| Create season | Yes | Yes | FULL | ESSENTIAL | With default fees and age groups |
| Edit season (name, dates, status) | Yes | Partial | PARTIAL | ESSENTIAL | Mobile can toggle registration and status but limited field editing |
| Season fee management | Yes | Yes | FULL | ESSENTIAL | Via SeasonFeesManager component |
| Toggle registration open/close | Yes | Yes | FULL | ESSENTIAL | Single toggle |
| Clone season | Yes | No | MISSING | NICE-TO-HAVE | Web clones with new name |
| Share registration link | Yes | Yes | FULL | ESSENTIAL | Via invite management |
| Age group management | Yes | Yes | FULL | ESSENTIAL | Within season settings |
| Org settings (identity, contact) | Yes | No | MISSING | WEB ONLY | Complex config, 15+ sections |
| Org branding (colors, logo) | Yes | No | MISSING | WEB ONLY | Visual design better on desktop |
| Registration form builder | Yes | No | MISSING | WEB ONLY | Complex field configuration |
| Custom questions editor | Yes | No | MISSING | WEB ONLY | Drag/drop question builder |
| Payment gateway setup (Stripe) | Yes | No | MISSING | WEB ONLY | Stripe Connect onboarding |
| Notification settings | Yes | No | MISSING | WEB ONLY | Reminder timing config |
| Coach requirements config | Yes | No | MISSING | WEB ONLY | Background check rules |
| Volunteer settings | Yes | No | MISSING | WEB ONLY | Hours, buyout amount |

### G. Communications & Announcements

| Feature | Web | Mobile | Status | Mobile Priority | Gap Details |
|---------|-----|--------|--------|-----------------|-------------|
| Compose blast/announcement | Yes | Yes | FULL | ESSENTIAL | Title, body, type, priority, target |
| Send to all org | Yes | Yes | FULL | ESSENTIAL | target_type = 'all' |
| Send to specific team | Yes | Yes | FULL | ESSENTIAL | Team selector |
| Blast analytics (sent, read rate) | Yes | No | MISSING | NICE-TO-HAVE | Web shows stat cards with read rates |
| Read receipts per recipient | Yes | No | MISSING | NICE-TO-HAVE | Web shows who read vs unread |
| Blast history/archive | Yes | No | MISSING | NICE-TO-HAVE | Web lists all sent blasts with filters |
| Resend blast | Yes | No | MISSING | NICE-TO-HAVE | Web can resend to unread |
| Chat moderation | Yes | No | MISSING | NICE-TO-HAVE | Web can delete/moderate messages |

### H. Waiver Management

| Feature | Web | Mobile | Status | Mobile Priority | Gap Details |
|---------|-----|--------|--------|-----------------|-------------|
| View waiver templates | Yes | No | MISSING | NICE-TO-HAVE | Template list with filters |
| Create/edit waiver template | Yes | No | MISSING | WEB ONLY | Rich text editor, PDF upload |
| Waiver completion status | Yes | No | MISSING | ESSENTIAL | Which players have signed which waivers |
| Send ad-hoc waiver | Yes | No | MISSING | NICE-TO-HAVE | Send specific waiver to family |
| Signature tracking | Yes | No | MISSING | NICE-TO-HAVE | View signed waivers per player |
| Version history | Yes | No | MISSING | WEB ONLY | Edit history with diffs |

### I. Reporting & Analytics

| Feature | Web | Mobile | Status | Mobile Priority | Gap Details |
|---------|-----|--------|--------|-----------------|-------------|
| Report categories (People, Financial, Ops) | Yes | Yes | FULL | ESSENTIAL | Category grid with report selection |
| Player roster report | Yes | Yes | FULL | NICE-TO-HAVE | Table visualization |
| Team composition report | Yes | Yes | PARTIAL | NICE-TO-HAVE | Basic team data |
| Financial summary report | Yes | Partial | PARTIAL | ESSENTIAL | Mobile has stats but no detailed breakdown |
| Outstanding balances report | Yes | Partial | PARTIAL | ESSENTIAL | Payment admin shows balances but no dedicated report |
| Registration pipeline report | Yes | No | MISSING | NICE-TO-HAVE | Funnel visualization |
| Dynamic column selection | Yes | No | MISSING | WEB ONLY | Column toggle/reorder |
| Filter presets | Yes | No | MISSING | WEB ONLY | Save/load filter configurations |
| CSV/PDF export | Yes | No | MISSING | NICE-TO-HAVE | Export from reports |
| Coach directory report | Yes | No | MISSING | NICE-TO-HAVE | Coach listing with certs |

### J. Achievement & Badge Management

| Feature | Web | Mobile | Status | Mobile Priority | Gap Details |
|---------|-----|--------|--------|-----------------|-------------|
| View achievement catalog | Yes | No | MISSING | NICE-TO-HAVE | Admin view of all achievements |
| Create/edit achievements | Yes | No | MISSING | WEB ONLY | Complex form with thresholds, rarity, icons |
| Toggle achievement active/inactive | Yes | No | MISSING | NICE-TO-HAVE | Quick enable/disable |
| View earned achievements org-wide | Yes | No | MISSING | NICE-TO-HAVE | Who earned what |
| Admin preview mode | Yes | No | MISSING | WEB ONLY | Preview as specific player |

### K. Venue Management

| Feature | Web | Mobile | Status | Mobile Priority | Gap Details |
|---------|-----|--------|--------|-----------------|-------------|
| View venues | Yes | No | MISSING | NICE-TO-HAVE | Venue list with details |
| Create/edit venue | Yes | No | MISSING | NICE-TO-HAVE | Name, address, courts, parking |
| Venue directions/map | Yes | No | MISSING | ESSENTIAL | Quick access to venue directions on-the-go |
| Assign venue to events | Yes | Via schedule | PARTIAL | ESSENTIAL | Schedule has location field but no venue picker |

### L. User & Role Management

| Feature | Web | Mobile | Status | Mobile Priority | Gap Details |
|---------|-----|--------|--------|-----------------|-------------|
| View all users | Yes | Yes | FULL | ESSENTIAL | Search/filter user list |
| Approve pending accounts | Yes | Yes | FULL | ESSENTIAL | One-tap approve with role activation |
| Reject accounts | Yes | Yes | FULL | ESSENTIAL | Delete profile and related records |
| Assign/revoke roles | Yes | Yes | FULL | ESSENTIAL | Toggle roles, add new roles |
| Invite users (parent/coach/admin) | Yes | Yes | FULL | ESSENTIAL | Via invite management |
| Create team invite codes | Yes | Yes | FULL | ESSENTIAL | Generate shareable codes |
| View pending invites | Yes | Yes | FULL | ESSENTIAL | List with resend/revoke |
| Deactivate accounts | Yes | Partial | PARTIAL | NICE-TO-HAVE | Can revoke roles but no explicit deactivate toggle |

---

## PHASE 4: Prioritized Punch List

### P0: Critical Gaps (Admin can't do essential mobile tasks)

| # | Issue | Impact | Complexity | Fix Approach |
|---|-------|--------|------------|--------------|
| 1 | No badge counts on Manage tab items | Admin has no visual indicator of pending items without opening each screen | Low | Add badge props to MenuItem, fetch counts in manage.tsx |
| 2 | No "today's games" on admin dashboard | Admin at tournament can't quickly see which teams play today | Medium | Add "Today's Games" section to AdminDashboard querying schedule_events for today |
| 3 | No team creation from mobile | Admin can't create teams while planning at a venue | Medium | Add CreateTeamModal with basic fields (name, color, season, roster limits) |
| 4 | No move player between teams | Admin can't fix roster issues on-the-go | Medium | Add transfer action in registration hub or new roster management screen |
| 5 | No waiver completion status | Admin can't check if all players have signed waivers before a game | Medium | Add waiver compliance summary to registration hub or dashboard |
| 6 | No coach-to-team assignment | Admin can't assign a new coach to a team from phone | Medium | Add coach assignment in team management or a lightweight coach picker |
| 7 | Venue directions not easily accessible | Admin at tournament can't quickly share venue directions | Low | Add venue quick-access from dashboard "today's games" section |

### P1: Missing Parity Features (Admin experience incomplete)

| # | Issue | Impact | Complexity | Fix Approach |
|---|-------|--------|------------|--------------|
| 8 | No registration waiver badges | Can't see waiver status per registration at a glance | Low | Add waiver status indicators to registration hub cards |
| 9 | No bulk registration actions | Must approve one-at-a-time; slow for 20+ registrations | Medium | Add select-all + bulk approve/deny/waitlist buttons |
| 10 | No blast history/analytics | Can't see if parents read announcements | Medium | Add sent blasts list with read counts |
| 11 | No financial summary view | Can't see collected vs outstanding at a glance by team | Medium | Add financial summary card to dashboard or reports |
| 12 | No coach directory | Can't look up coach contact info quickly | Low | Add coach list screen with search |
| 13 | No registration analytics | Can't see funnel or demographic breakdowns | Medium | Add analytics tab to registration hub |
| 14 | Season archives stub | Route exists but not implemented | Low | Implement archived seasons list with basic stats |
| 15 | No family-grouped payment view | Can't see all payments for a family together | Low | Add family grouping toggle to payment admin |
| 16 | Edit team details from mobile | Can't update team name/color/limits | Low | Add edit modal to team management |
| 17 | No chat moderation | Can't moderate inappropriate messages | Medium | Add report/delete actions for admin in SquadComms |

### P2: Polish & UX Improvements

| # | Issue | Impact | Complexity | Fix Approach |
|---|-------|--------|------------|--------------|
| 18 | No onboarding progress indicator | New admin doesn't know setup completion | Low | Add progress bar to dashboard for new orgs |
| 19 | No CSV/PDF export from mobile | Can't share reports from phone | Medium | Add share/export action to report viewer |
| 20 | No achievement catalog admin | Can't toggle achievements active/inactive | Medium | Add admin view of achievements with toggle |
| 21 | No venue management CRUD | Can't add/edit venues | Medium | New venue management screen |
| 22 | No jersey management | Can't track jersey assignments | Low | Nice-to-have on mobile |
| 23 | No deactivate user toggle | Can only revoke roles, not explicitly deactivate | Low | Add deactivate toggle to user management |
| 24 | Dashboard financial chart | No visual trend of payments over time | Medium | Add mini sparkline to revenue pulse |
| 25 | Registration custom answers display | Data stored but not shown prominently | Low | Show custom Q&A in registration detail |

---

## PHASE 5: Incremental PR Plan

### PR #23: Admin Dashboard Enhancement — Badges, Today's Games, Venue Access (P0)

**Goal**: Make the admin dashboard immediately actionable with badge counts and today's game awareness.

**Scope**:
1. Add badge count props to Manage tab menu items (pending registrations, pending payments, pending approvals)
2. Add "Today's Games" section to AdminDashboard — shows all teams with games today, opponent, time, venue with directions link
3. Add venue quick-access (tap venue → open maps)
4. Fetch badge counts efficiently (single batched query)

**Files to modify**:
- `app/(tabs)/manage.tsx` — add badge rendering to MenuItem
- `components/AdminDashboard.tsx` — add Today's Games section, badge count queries
- `components/AdminDashboard.tsx` — venue directions link (Linking.openURL to maps)

**Acceptance Criteria**:
- ✅ Manage tab items show red badge with count for pending items
- ✅ Dashboard shows "Today's Games" card with all games across all teams
- ✅ Tapping venue opens native maps app
- ✅ Badge counts update on pull-to-refresh
- ✅ No new TypeScript errors

---

### PR #24: Team & Roster Management for Admin (P0)

**Goal**: Let admin create teams and move players between teams from mobile.

**Scope**:
1. New `app/team-management.tsx` screen — list all teams with player counts, team colors
2. Create Team modal — name, color picker (6 preset colors), season, max roster size
3. Move Player action — tap player → pick destination team → confirm transfer
4. Unrostered players section — show approved-but-unassigned players with quick-assign
5. Add "Team Management" to admin quick actions

**Files to create**:
- `app/team-management.tsx` — team list + create/edit modals + player transfer

**Files to modify**:
- `components/AdminDashboard.tsx` — add Team Management quick action
- `app/(tabs)/manage.tsx` — add Team Management route

**Acceptance Criteria**:
- ✅ Admin can view all teams with player count and team color
- ✅ Admin can create a new team with name, color, and roster limit
- ✅ Admin can move a player from one team to another in ≤4 taps
- ✅ Unrostered approved players shown with quick-assign dropdown
- ✅ No new TypeScript errors

---

### PR #25: Waiver Compliance & Coach Assignment (P0)

**Goal**: Admin can check waiver completion and assign coaches to teams on-the-go.

**Scope**:
1. Waiver compliance summary — which players have/haven't signed required waivers
2. Add waiver status badges to registration hub cards (✓/✗ per waiver)
3. Coach assignment — lightweight picker to assign coach to team
4. Coach directory — searchable list with contact info, team assignments, cert status

**Files to create**:
- `app/coach-directory.tsx` — coach list with search, contact info, team assignments, cert badges

**Files to modify**:
- `app/registration-hub.tsx` — add waiver status badges per registration
- `app/team-management.tsx` (from PR#24) — add coach assignment picker
- `components/AdminDashboard.tsx` — add waiver compliance alert card

**Acceptance Criteria**:
- ✅ Registration cards show waiver completion badges (✓/✗)
- ✅ Dashboard alert shows count of players missing waivers
- ✅ Admin can assign a coach to a team from team management
- ✅ Coach directory shows all coaches with search, contact, certs
- ✅ No new TypeScript errors

---

### PR #26: Bulk Registration Actions & Blast History (P1)

**Goal**: Speed up registration processing and add blast tracking.

**Scope**:
1. Bulk registration actions — select multiple → approve all / deny all / waitlist all
2. Registration analytics mini-cards — total, approval rate, capacity used
3. Blast history screen — list sent blasts with read counts, filter by type
4. Blast detail — view recipients with read/unread status

**Files to create**:
- `app/blast-history.tsx` — sent blasts list with read analytics

**Files to modify**:
- `app/registration-hub.tsx` — add checkbox selection + bulk action bar + analytics mini-cards
- `app/(tabs)/manage.tsx` — add Blast History route
- `app/blast-composer.tsx` — add "View Sent" link

**Acceptance Criteria**:
- ✅ Admin can select multiple registrations and bulk approve/deny
- ✅ Registration hub shows total/approved/capacity stats at top
- ✅ Blast history shows all sent blasts with read percentage
- ✅ Tapping a blast shows recipient list with read status
- ✅ No new TypeScript errors

---

### PR #27: Financial Summary & Family Payments (P1)

**Goal**: Give admin clear financial visibility across all families and teams.

**Scope**:
1. Financial summary dashboard card — collected vs outstanding, by team breakdown
2. Family-grouped payment view toggle — see all payments for a family together
3. Outstanding balances highlight — families with overdue amounts
4. Generate fees backfill — create missing fee records for existing players

**Files to modify**:
- `components/AdminDashboard.tsx` — add financial summary card with team breakdown
- `app/(tabs)/payments.tsx` — add family grouping toggle, outstanding balances filter, generate fees action

**Acceptance Criteria**:
- ✅ Dashboard shows financial summary (total due, collected, outstanding)
- ✅ Payment admin can toggle between player and family views
- ✅ Outstanding balances clearly highlighted with overdue indicators
- ✅ Admin can generate missing fees for existing players
- ✅ No new TypeScript errors

---

### PR #28: Season Archives & Admin Polish (P1/P2)

**Goal**: Complete stub features and polish the admin experience.

**Scope**:
1. Season archives — list completed seasons with team count, player count, final standings
2. Edit team details modal — update name, color, roster limits
3. Chat moderation — admin can delete messages in SquadComms
4. Deactivate user toggle in user management
5. Registration custom answers display

**Files to modify**:
- `app/season-archives.tsx` — implement full archives screen
- `app/team-management.tsx` (from PR#24) — add edit modal
- `components/SquadComms.tsx` — add admin delete action
- `app/users.tsx` — add deactivate toggle
- `app/registration-hub.tsx` — show custom Q&A in detail view

**Acceptance Criteria**:
- ✅ Season archives shows completed seasons with stats
- ✅ Admin can edit team name, color, and roster limits
- ✅ Admin can delete inappropriate chat messages
- ✅ Admin can deactivate/reactivate user accounts
- ✅ Custom registration answers visible in registration detail
- ✅ No new TypeScript errors

---

## Summary: PR Sequence

| PR | Title | Priority | Risk | Key Files |
|----|-------|----------|------|-----------|
| #23 | Admin Dashboard — Badges, Today's Games, Venue | P0 | Low | manage.tsx, AdminDashboard.tsx |
| #24 | Team & Roster Management | P0 | Medium | team-management.tsx (new), AdminDashboard.tsx, manage.tsx |
| #25 | Waiver Compliance & Coach Assignment | P0 | Medium | coach-directory.tsx (new), registration-hub.tsx, team-management.tsx |
| #26 | Bulk Registration & Blast History | P1 | Low | blast-history.tsx (new), registration-hub.tsx, manage.tsx |
| #27 | Financial Summary & Family Payments | P1 | Low | AdminDashboard.tsx, payments.tsx |
| #28 | Season Archives & Admin Polish | P1/P2 | Low | season-archives.tsx, team-management.tsx, SquadComms.tsx, users.tsx |

---

## Cross-Cutting Issues (Apply Across All PRs)

1. **No new dependencies**: All features use existing packages (react-native, expo-haptics, react-native-svg, etc.)
2. **Gate console.log behind `__DEV__`**: Every debug statement must be wrapped
3. **Sport-aware**: Use `getSportDisplay()` from `constants/sport-display.ts` where applicable
4. **Theme-aware**: Use `createStyles(colors)` pattern, respect dark/light mode
5. **Batch queries**: Use `.in('column', ids)` for multi-item lookups, never N+1
6. **Admin detection**: Use `usePermissions()` → `isAdmin`, never check `profile?.role`
7. **Do NOT modify**: CoachDashboard.tsx, ParentDashboard.tsx, PlayerDashboard.tsx — admin features go in AdminDashboard.tsx or new files
8. **Column names**: Always verify against SCHEMA_REFERENCE.csv — `event_id` not `schedule_event_id`, `opponent_score` not `their_score`

---

## Verification Checklist

1. AdminDashboard loads with correct counts and alerts
2. Manage tab items show badge counts for pending items
3. Today's games section shows all games across all teams
4. Team management allows create, edit, and player transfer
5. Coach directory shows all coaches with search and cert status
6. Registration hub shows waiver badges and supports bulk actions
7. Payment admin supports family grouping and outstanding balance filtering
8. Blast history shows sent blasts with read analytics
9. Season archives shows completed seasons
10. All screens respect dark/light theme
11. All console.log gated behind `__DEV__`
12. `npx tsc --noEmit` — zero new errors
13. Pull-to-refresh works on all admin screens
14. Role switcher still works — admin can drop into coach/parent/player views

---

## Database Tables Referenced (Admin-Complete)

| Table | Columns Used | Purpose |
|-------|-------------|---------|
| `organizations` | name, slug, logo_url, settings, stripe_*, payment_* | Org identity and config |
| `seasons` | name, status, registration_open, fee_*, start/end_date, capacity | Season lifecycle |
| `season_fees` | fee_type, fee_name, amount, due_date, required | Fee structure |
| `registrations` | status, submitted_at, approved_at, rostered_at, denial_reason, admin_notes | Registration pipeline |
| `payments` | status, amount, payment_method, payer_name, verified_by/at, fee_type | Payment tracking |
| `stripe_payment_intents` | stripe_payment_intent_id, amount, status, payment_ids | Stripe processing |
| `teams` | name, color, season_id, max_roster_size, roster_open | Team management |
| `team_players` | team_id, player_id, jersey_number, is_primary_team | Roster assignment |
| `team_staff` | team_id, user_id, staff_role, is_active | Staff management |
| `team_coaches` | team_id, coach_id, role | Coach assignment |
| `coaches` | first/last_name, email, phone, background_check_*, coaching_level | Coach profiles |
| `players` | All demographic, medical, waiver, photo, position fields | Player profiles |
| `families` | name, primary_email, contacts, account_id | Family grouping |
| `user_roles` | organization_id, user_id, role, is_active | Role management |
| `invitations` | email, invite_type, invite_code, status | Invite tracking |
| `waiver_templates` | name, content, type, is_required, is_active, version | Waiver definitions |
| `waiver_signatures` | waiver_template_id, player_id, signed_by_*, status | Waiver compliance |
| `achievements` | name, category, type, rarity, stat_key, threshold, is_active | Achievement catalog |
| `announcements` | title, body, priority, target_type, read_count | Org announcements |
| `messages` | title, body, message_type, priority, target_type | Team blasts |
| `message_recipients` | message_id, player_id, acknowledged, delivered | Delivery tracking |
| `venues` | name, address, google_maps_url, courts_available | Venue management |
| `schedule_events` | event_type, event_date, event_time, opponent, location, game_status | Event scheduling |
| `admin_notifications` | type, title, message, is_read, metadata | Admin alerts |
| `age_groups` | name, min_grade, max_grade, display_order | Season age groups |
| `sports` | name, code, icon, color_primary | Sport definitions |
