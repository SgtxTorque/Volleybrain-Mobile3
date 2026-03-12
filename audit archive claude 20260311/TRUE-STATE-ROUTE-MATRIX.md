# TRUE-STATE-ROUTE-MATRIX.md
## Lynx Mobile — Route & Screen Inventory
### Audit Date: 2026-03-11

---

## Summary
- **Total route files**: 68
- **Auth routes**: 5
- **Tab routes**: 24 (4 visible, 20+ hidden)
- **Top-level routes**: 39
- **Dynamic routes**: 2 (`/chat/[id]`, `/register/[seasonId]`)
- **Placeholder screens**: 1 (`menu-placeholder.tsx`)
- **Redirect wrappers**: 2 (`report-viewer.tsx`, `family-gallery.tsx`)

---

## Auth Group — `app/(auth)/`

| Route | File | Purpose | Roles | Params | Domain |
|-------|------|---------|-------|--------|--------|
| `/(auth)/welcome` | `welcome.tsx` | Landing page with Login/Signup CTAs | unauthenticated | none | auth |
| `/(auth)/login` | `login.tsx` | Email/password login + forgot password | unauthenticated | none | auth |
| `/(auth)/signup` | `signup.tsx` | Multi-step registration (role selection, profile) | unauthenticated | `createOrg?`, `orgCode?`, `organizationId?` | auth, registration |
| `/(auth)/redeem-code` | `redeem-code.tsx` | Enter invite/team codes | unauthenticated | `code?` (deep link) | auth, registration |
| `/(auth)/pending-approval` | `pending-approval.tsx` | Waiting for admin approval (polls 30s) | authenticated, unapproved | none | auth |

---

## Tabs Group — `app/(tabs)/`

### Visible Tabs (Tab Bar)

| Tab | Route | File | Purpose | Roles | Domain |
|-----|-------|------|---------|-------|--------|
| 1 - Home | `/(tabs)/` | `index.tsx` | DashboardRouter: renders role-specific scroll | all | dashboard |
| 2a - Manage | `/(tabs)/manage` | `manage.tsx` | Admin dashboard (attention cards, activity feed) | admin only | admin |
| 2b - Game Day | `/(tabs)/gameday` | `gameday.tsx` | Upcoming games, countdowns, coach tools | coach, player (not parent-only) | schedule |
| 2c - Schedule | `/(tabs)/parent-schedule` | `parent-schedule.tsx` | Parent schedule view | parent-only (not admin, not coach) | schedule |
| 3 - Chats | `/(tabs)/chats` | `chats.tsx` | Chat channels list, DM creation | all authenticated | chat |
| 4 - More | `/(tabs)/menu-placeholder` | `menu-placeholder.tsx` | **PLACEHOLDER** — renders empty View, opens GestureDrawer | all | navigation |

### Hidden Tabs (via drawer/deep links, `href: null`)

| Route | File | Purpose | Roles | Domain |
|-------|------|---------|-------|--------|
| `/(tabs)/connect` | `connect.tsx` | Team hub (role-aware feed) | all | team-hub |
| `/(tabs)/me` | `me.tsx` | Personal profile | all | profile |
| `/(tabs)/coach-schedule` | `coach-schedule.tsx` | Coach schedule + event creation | coach | schedule |
| `/(tabs)/coach-chat` | `coach-chat.tsx` | Coach chat channels | coach | chat |
| `/(tabs)/coach-team-hub` | `coach-team-hub.tsx` | Team hub for coaches | coach | team-hub |
| `/(tabs)/coach-my-stuff` | `coach-my-stuff.tsx` | Coach dashboard/certifications | coach | profile |
| `/(tabs)/coach-roster` | `coach-roster.tsx` | Team roster management | coach | roster |
| `/(tabs)/parent-chat` | `parent-chat.tsx` | Parent chat channels | parent | chat |
| `/(tabs)/parent-team-hub` | `parent-team-hub.tsx` | Team hub for parents | parent | team-hub |
| `/(tabs)/parent-my-stuff` | `parent-my-stuff.tsx` | Parent dashboard | parent | profile |
| `/(tabs)/admin-schedule` | `admin-schedule.tsx` | Admin schedule management | admin | schedule |
| `/(tabs)/admin-chat` | `admin-chat.tsx` | Admin chat channels | admin | chat |
| `/(tabs)/admin-teams` | `admin-teams.tsx` | Team management (create, assign) | admin | team-management |
| `/(tabs)/admin-my-stuff` | `admin-my-stuff.tsx` | Admin dashboard, settings, org config | admin | admin |
| `/(tabs)/schedule` | `schedule.tsx` | Generic schedule (fallback) | all | schedule |
| `/(tabs)/messages` | `messages.tsx` | Blast messages | admin, coach | communications |
| `/(tabs)/players` | `players.tsx` | Player directory | admin | roster |
| `/(tabs)/teams` | `teams.tsx` | Teams directory + create | admin | team-management |
| `/(tabs)/coaches` | `coaches.tsx` | Coach directory + add | admin | team-management |
| `/(tabs)/payments` | `payments.tsx` | Payment management | admin | payments |
| `/(tabs)/settings` | `settings.tsx` | App settings | all | profile |
| `/(tabs)/my-teams` | `my-teams.tsx` | Team selector | coach | team-management |
| `/(tabs)/jersey-management` | `jersey-management.tsx` | Jersey number management | coach, admin | roster |
| `/(tabs)/reports-tab` | `reports-tab.tsx` | Reports viewer | admin | admin |

---

## Top-Level Screens — `app/`

### Challenges

| Route | File | Purpose | Params | Roles | Domain |
|-------|------|---------|--------|-------|--------|
| `/challenges` | `challenges.tsx` | Challenge list (Active/Completed/Expired) | none | all | challenges |
| `/challenge-library` | `challenge-library.tsx` | Browse challenge templates | none | coach | challenges |
| `/challenge-detail` | `challenge-detail.tsx` | Leaderboard + progress submission | `challengeId` | all | challenges |
| `/challenge-cta` | `challenge-cta.tsx` | Immersive join/track CTA | `challengeId` | player | challenges |
| `/create-challenge` | `create-challenge.tsx` | Create/customize challenge | `templateId?` | coach | challenges |
| `/challenge-celebration` | `challenge-celebration.tsx` | Post-completion celebration | `challengeId`, `playerId` | player | challenges |
| `/coach-challenge-dashboard` | `coach-challenge-dashboard.tsx` | Manage, verify, leaderboards | none | coach | challenges |

### Game Management

| Route | File | Purpose | Params | Roles | Domain |
|-------|------|---------|--------|-------|--------|
| `/game-prep` | `game-prep.tsx` | Pre-game checklist, court view, lineup | `eventId`, `teamId`, `opponent?` | coach | schedule |
| `/game-day-command` | `game-day-command.tsx` | 4-page workflow (Prep→Live→EndSet→Summary) | `eventId`+`teamId` OR `matchId` | coach | schedule |
| `/game-prep-wizard` | `game-prep-wizard.tsx` | Shorter game completion flow | `eventId` | coach | schedule |
| `/game-results` | `game-results.tsx` | Game stats view | `eventId` | all | schedule |
| `/game-recap` | `game-recap.tsx` | Post-game summary + stats entry | `eventId` | coach | schedule |
| `/lineup-builder` | `lineup-builder.tsx` | Interactive court lineup setup | `eventId`, `teamId` | coach | roster |
| `/attendance` | `attendance.tsx` | Event attendance marking | `eventId`, `teamId?` | coach | schedule |
| `/standings` | `standings.tsx` | Team standings + player leaderboards | none | all | team-hub |

### Evaluations & Stats

| Route | File | Purpose | Params | Roles | Domain |
|-------|------|---------|--------|-------|--------|
| `/player-evaluation` | `player-evaluation.tsx` | 9-skill rating form | `playerId`, `teamId` | coach | evaluations |
| `/player-evaluations` | `player-evaluations.tsx` | Evaluation history | `teamId`, `playerId?`, `type?`, `playerIds?` | coach | evaluations |
| `/evaluation-session` | `evaluation-session.tsx` | Setup eval session (pick type, players) | `teamId` | coach | evaluations |
| `/my-stats` | `my-stats.tsx` | Personal ESPN-style stats | `playerId?` | player, parent | profile |
| `/player-goals` | `player-goals.tsx` | Goal tracking | `playerId?` | player, parent | profile |
| `/player-card` | `player-card.tsx` | FIFA-style trading card | `playerId?`, `childId?` | all | roster |

### Registration & Season

| Route | File | Purpose | Params | Roles | Domain |
|-------|------|---------|--------|-------|--------|
| `/registration-hub` | `registration-hub.tsx` | Admin registration management | none | admin | registration |
| `/parent-registration-hub` | `parent-registration-hub.tsx` | Parent registration view | none | parent | registration |
| `/registration-start` | `registration-start.tsx` | Select season to register | none | parent | registration |
| `/register/[seasonId]` | `register/[seasonId].tsx` | Multi-step player registration | `seasonId` (dynamic) | parent | registration |
| `/complete-profile` | `complete-profile.tsx` | Missing field completion | `playerId`, `seasonId` | parent | registration |
| `/season-settings` | `season-settings.tsx` | Season configuration (dates, fees) | none | admin | admin |
| `/season-progress` | `season-progress.tsx` | Season progress tracking | none | admin | admin |
| `/season-reports` | `season-reports.tsx` | Season analytics | none | admin | admin |
| `/season-archives` | `season-archives.tsx` | Past seasons | none | admin | admin |
| `/season-setup-wizard` | `season-setup-wizard.tsx` | New season guided setup | none | admin | admin |

### Teams & Roster

| Route | File | Purpose | Params | Roles | Domain |
|-------|------|---------|--------|-------|--------|
| `/team-management` | `team-management.tsx` | Team CRUD, player/coach assignment | none | admin | team-management |
| `/team-roster` | `team-roster.tsx` | Roster by jersey number | `teamId` | all | roster |
| `/roster` | `roster.tsx` | Full-screen roster carousel | `teamId?` | coach | roster |
| `/team-gallery` | `team-gallery.tsx` | Team photo gallery | `teamId` | all | media |
| `/team-wall` | `team-wall.tsx` | Team feed | `teamId` | all | team-hub |

### Family & Parent

| Route | File | Purpose | Params | Roles | Domain |
|-------|------|---------|--------|-------|--------|
| `/my-kids` | `my-kids.tsx` | Parent dashboard: children, payments, events | none | parent | family |
| `/child-detail` | `child-detail.tsx` | Single child detail view | `childId` | parent | family |
| `/family-gallery` | `family-gallery.tsx` | Swipeable children gallery (wrapper) | none | parent | media |
| `/family-payments` | `family-payments.tsx` | Family payment management | none | parent | payments |

### Communications

| Route | File | Purpose | Params | Roles | Domain |
|-------|------|---------|--------|-------|--------|
| `/chat/[id]` | `chat/[id].tsx` | Full chat (messages, voice, GIF, reactions) | `id` (dynamic) | all | chat |
| `/blast-composer` | `blast-composer.tsx` | Create/send blast messages | none | admin, coach | communications |
| `/blast-history` | `blast-history.tsx` | View sent blasts | none | admin, coach | communications |
| `/notification` | `notification.tsx` | Notification detail | none | all | communications |
| `/notification-preferences` | `notification-preferences.tsx` | Notification settings | none | all | profile |

### Directory & Profile

| Route | File | Purpose | Params | Roles | Domain |
|-------|------|---------|--------|-------|--------|
| `/profile` | `profile.tsx` | Edit profile (name, phone, avatar, password) | none | all | profile |
| `/coach-directory` | `coach-directory.tsx` | Browse org coaches | none | admin | directory |
| `/org-directory` | `org-directory.tsx` | Browse org members | none | all | directory |
| `/admin-search` | `admin-search.tsx` | Admin search (users, teams, players) | none | admin | admin |
| `/coach-profile` | `coach-profile.tsx` | Coach profile/credentials | `coachId` | admin, coach | profile |
| `/coach-availability` | `coach-availability.tsx` | Coach availability calendar | none | coach | profile |
| `/coach-background-checks` | `coach-background-checks.tsx` | Background check status | none | admin | team-management |

### Other

| Route | File | Purpose | Params | Roles | Domain |
|-------|------|---------|--------|-------|--------|
| `/achievements` | `achievements.tsx` | Achievements with XP/level/rarity | none | all | achievements |
| `/claim-account` | `claim-account.tsx` | Link orphan player records | none | parent | auth |
| `/payment-reminders` | `payment-reminders.tsx` | Payment reminder management | none | admin | payments |
| `/volunteer-assignment` | `volunteer-assignment.tsx` | Volunteer management | none | admin | team-management |
| `/venue-manager` | `venue-manager.tsx` | Venue management | none | admin | team-management |
| `/web-features` | `web-features.tsx` | Redirect to web portal features | `featureName`, `description`, `webUrl` | all | navigation |
| `/org-settings` | `org-settings.tsx` | Organization configuration | none | admin | admin |
| `/users` | `users.tsx` | User management | none | admin | admin |
| `/report-viewer` | `report-viewer.tsx` | Full-screen report (wrapper) | none | admin | admin |
| `/bulk-event-create` | `bulk-event-create.tsx` | Bulk schedule creation | none | admin | team-management |
| `/invite-friends` | `invite-friends.tsx` | Share registration links | none | all | growth |
| `/help` | `help.tsx` | FAQ/help content | none | all | support |
| `/data-rights` | `data-rights.tsx` | Data rights/consent | none | all | compliance |
| `/privacy-policy` | `privacy-policy.tsx` | Privacy policy display | none | unauthenticated | compliance |
| `/terms-of-service` | `terms-of-service.tsx` | ToS display | none | unauthenticated | compliance |
| `/my-waivers` | `my-waivers.tsx` | Waiver status for family | none | parent | compliance |

---

## Flags

### Placeholder Screens
| File | Evidence |
|------|----------|
| `app/(tabs)/menu-placeholder.tsx` | Returns empty `<View />` — tab bar button opens GestureDrawer instead |

### Redirect Wrappers
| File | Evidence |
|------|----------|
| `app/report-viewer.tsx` | Line 3: `export default ReportViewerScreen` — re-exports component |
| `app/family-gallery.tsx` | Minimal wrapper rendering `FamilyGallery` component |

### Duplicate Functionality
| Screen A | Screen B | Overlap |
|----------|----------|---------|
| `(tabs)/teams.tsx` | `team-management.tsx` | Both create teams; teams.tsx is simpler, team-management.tsx has full CRUD |
| `(tabs)/admin-teams.tsx` | `team-management.tsx` | Both manage teams; admin-teams in tab, team-management is standalone |
| `(tabs)/chats.tsx` | `(tabs)/coach-chat.tsx` / `(tabs)/parent-chat.tsx` | Three chat list screens with similar but role-filtered logic |

### Unreachable/Rarely-Used Routes
| Route | Evidence |
|-------|----------|
| `/report-viewer` | No `router.push('/report-viewer')` found in codebase |
| `/users` | Limited navigation paths |
| `/bulk-event-create` | Admin niche feature, limited entry points |
