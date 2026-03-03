# LYNX Mobile App — Full Screen & Navigation Audit

**Date:** 2026-03-02
**Branch:** `feat/native-registration`
**Commit:** `848543b` (Parent Home Scroll Phase 7)

---

## 1. Executive Summary

| Metric | Count |
|--------|-------|
| Total route files | 82 |
| Visible tabs | 5 (Home, Manage/GameDay/Schedule, Chat, More) |
| Hidden tabs (drawer-accessible) | 19 |
| Stack screens | 42 |
| Auth screens | 7 |
| Component files | 110+ |
| Hooks | 9 |
| Lib/context files | 25 |
| DB tables (SCHEMA_REFERENCE) | 80+ |
| **Broken navigation targets** | **5 (18 total references)** |
| **Orphaned route files** | **1 (game-day-parent.tsx)** |
| **"Coming Soon" stubs** | **18** |
| **Web-only features (no mobile equiv)** | **15+** |

**What's working:** All four role-based home scrolls (Admin, Coach, Parent, Player) render correctly with live Supabase data. Chat, schedule, payments, achievements, registration hub, team wall, game results, standings, lineup builder, and most settings screens are functional. The GestureDrawer provides access to hidden tabs.

**What's broken:** 13 coach-scroll components navigate to `/(tabs)/coach-roster` which doesn't exist. `/team-hub` is referenced from old dashboards but has no route file. 3 navigation calls use incorrect path prefixes. The admin home has ~10 stub actions (Alert.alert "Coming Soon"). Player chat/shoutouts/challenges are entirely stubbed.

---

## 2. File Tree

### Route Files (`app/`)

```
app/
├── _layout.tsx                     # Root layout (provider tree + auth routing)
├── (auth)/
│   ├── _layout.tsx                 # Auth stack layout
│   ├── welcome.tsx                 # Landing / splash
│   ├── login.tsx                   # Email + password login
│   ├── signup.tsx                  # Create account
│   ├── league-setup.tsx            # Admin org onboarding
│   ├── parent-register.tsx         # Parent onboarding
│   ├── coach-register.tsx          # Coach onboarding
│   ├── redeem-code.tsx             # Invite code redemption
│   └── pending-approval.tsx        # Waiting for admin approval
├── (tabs)/
│   ├── _layout.tsx                 # Tab navigator (5 visible + 19 hidden)
│   ├── index.tsx                   # Home tab → DashboardRouter
│   ├── manage.tsx                  # Admin manage tab
│   ├── gameday.tsx                 # Coach/Player game day tab
│   ├── parent-schedule.tsx         # Parent schedule tab
│   ├── chats.tsx                   # Chat list (visible tab)
│   ├── menu-placeholder.tsx        # "More" tab → opens drawer
│   ├── connect.tsx                 # Hidden: social connect
│   ├── me.tsx                      # Hidden: profile
│   ├── parent-chat.tsx             # Hidden: parent chat view
│   ├── parent-team-hub.tsx         # Hidden: parent team hub
│   ├── parent-my-stuff.tsx         # Hidden: parent settings
│   ├── coach-schedule.tsx          # Hidden: coach schedule
│   ├── coach-chat.tsx              # Hidden: coach chat
│   ├── coach-team-hub.tsx          # Hidden: coach team hub
│   ├── coach-my-stuff.tsx          # Hidden: coach settings
│   ├── admin-schedule.tsx          # Hidden: admin schedule (re-exports coach-schedule)
│   ├── admin-chat.tsx              # Hidden: admin chat (re-exports coach-chat)
│   ├── admin-teams.tsx             # Hidden: admin teams
│   ├── admin-my-stuff.tsx          # Hidden: admin settings
│   ├── schedule.tsx                # Hidden: generic schedule
│   ├── messages.tsx                # Hidden: messages
│   ├── players.tsx                 # Hidden: player roster
│   ├── teams.tsx                   # Hidden: teams list
│   ├── coaches.tsx                 # Hidden: coaches list
│   ├── payments.tsx                # Hidden: payments
│   ├── reports-tab.tsx             # Hidden: reports
│   ├── settings.tsx                # Hidden: settings
│   ├── my-teams.tsx                # Hidden: my teams
│   └── jersey-management.tsx       # Hidden: jersey management
├── chat/
│   ├── _layout.tsx                 # Chat stack layout
│   └── [id].tsx                    # Individual chat thread
├── register/
│   └── [seasonId].tsx              # Public registration form
├── notification.tsx                # Notification center
├── family-payments.tsx             # Parent payment view
├── attendance.tsx                  # Attendance tracking
├── coach-availability.tsx          # Coach availability
├── game-day-parent.tsx             # ORPHANED — never referenced
├── child-detail.tsx                # Parent → child detail
├── coach-profile.tsx               # Coach profile view
├── notification-preferences.tsx    # Notification settings
├── my-waivers.tsx                  # Waiver signing
├── profile.tsx                     # User profile editor
├── org-directory.tsx               # Organization directory
├── lineup-builder.tsx              # Lineup builder tool
├── my-kids.tsx                     # Parent → kids overview
├── my-stats.tsx                    # Player stats view
├── standings.tsx                   # Standings + leaderboards
├── web-features.tsx                # "Available on web" info screen
├── blast-history.tsx               # Announcement history
├── team-management.tsx             # Team management
├── season-settings.tsx             # Season configuration
├── coach-directory.tsx             # Coach directory
├── users.tsx                       # User management
├── season-archives.tsx             # Archived seasons
├── blast-composer.tsx              # Compose announcements
├── team-roster.tsx                 # Team roster viewer
├── game-results.tsx                # Game results entry
├── game-prep-wizard.tsx            # Game prep wizard
├── game-prep.tsx                   # Game prep screen
├── team-wall.tsx                   # Team social wall
├── season-reports.tsx              # Season reports
├── team-gallery.tsx                # Team photo gallery
├── achievements.tsx                # Achievement catalog
├── help.tsx                        # Help screen
├── invite-friends.tsx              # Share/invite
├── privacy-policy.tsx              # Privacy policy
├── terms-of-service.tsx            # Terms of service
├── parent-registration-hub.tsx     # Parent registration flow
├── registration-hub.tsx            # Admin registration hub
├── claim-account.tsx               # Account claiming
├── report-viewer.tsx               # Report detail viewer
└── data-rights.tsx                 # Data rights / GDPR
```

### Components

```
components/
├── DashboardRouter.tsx             # Role-based home screen router
├── AdminHomeScroll.tsx             # Admin scrollable home
├── CoachHomeScroll.tsx             # Coach scrollable home
├── ParentHomeScroll.tsx            # Parent scrollable home
├── PlayerHomeScroll.tsx            # Player scrollable home (dark theme)
├── AdminDashboard.tsx              # Admin legacy dashboard (still imported)
├── CoachDashboard.tsx              # Coach legacy dashboard (still imported)
├── CoachParentDashboard.tsx        # Coach-parent dual dashboard
├── ParentDashboard.tsx             # Parent legacy dashboard (still imported)
├── PlayerDashboard.tsx             # Player legacy dashboard (still imported)
├── GestureDrawer.tsx               # Swipe drawer navigation
├── AppDrawer.tsx                   # Fallback drawer
├── RoleSelector.tsx                # Role switch component
├── TeamWall.tsx                    # Team social feed
├── GameCompletionWizard.tsx        # Multi-step game completion
├── VolleyballCourt.tsx             # Court visualization
├── EventDetailModal.tsx            # Event detail modal
├── EventCard.tsx                   # Event list card
├── PlayerCard.tsx                  # Player card (compact)
├── PlayerCardExpanded.tsx          # Player card (expanded w/ stats)
├── ChildPickerScreen.tsx           # Multi-child picker
├── GiveShoutoutModal.tsx           # Shoutout creation
├── ShoutoutCard.tsx                # Shoutout display
├── ShoutoutProfileSection.tsx      # Profile shoutout section
├── CreateChallengeModal.tsx        # Challenge creation
├── ChallengeCard.tsx               # Challenge display
├── ChallengeDetailModal.tsx        # Challenge detail
├── LevelUpCelebrationModal.tsx     # Level up animation
├── AchievementCelebrationModal.tsx # Achievement earned animation
├── LevelBadge.tsx                  # Level badge display
├── HexBadge.tsx                    # Hex badge display
├── RarityGlow.tsx                  # Rarity glow effect
├── ShareRegistrationModal.tsx      # Registration link sharing
├── CoppaConsentModal.tsx           # COPPA consent
├── ParentOnboardingModal.tsx       # Parent welcome modal
├── NotificationBell.tsx            # Notification icon + badge
├── EmergencyContactModal.tsx       # Emergency contact view
├── AnnouncementBanner.tsx          # Announcement banner
├── RegistrationBanner.tsx          # Registration CTA banner
├── ReenrollmentBanner.tsx          # Re-enrollment banner
├── ReportsScreen.tsx               # Reports screen component
├── ReportViewerScreen.tsx          # Report detail viewer
├── SeasonFeesManager.tsx           # Season fee configuration
├── SquadComms.tsx                  # Squad communication
├── PhotoViewer.tsx                 # Photo viewer
├── GifPicker.tsx                   # GIF picker
├── EmojiPicker.tsx                 # Emoji picker
├── AdminContextBar.tsx             # Admin context bar
├── AdminGameDay.tsx                # Admin game day view
├── payments-admin.tsx              # Admin payments (ORPHANED — never imported)
├── payments-parent.tsx             # Parent payments component
├── AnimatedStatBar.tsx             # Animated stat bar
├── AnimatedNumber.tsx              # Animated number counter
├── CircularProgress.tsx            # Circular progress ring
├── PressableCard.tsx               # Pressable card wrapper
├── PlayerStatBar.tsx               # Player stat bar
├── admin-scroll/
│   ├── WelcomeBriefing.tsx         # Parallax greeting + urgency counters
│   ├── SmartQueueCard.tsx          # Priority action cards (all stubs)
│   ├── TeamHealthTiles.tsx         # Horizontal team tiles
│   ├── PaymentSnapshot.tsx         # Payment summary (stubs)
│   ├── QuickActionsGrid.tsx        # 3x2 action grid (all stubs)
│   ├── CoachSection.tsx            # Coach list + task assignment (stub)
│   ├── UpcomingEvents.tsx          # Event list (stubs)
│   └── ClosingMotivation.tsx       # Motivational closing
├── coach-scroll/
│   ├── PrepChecklist.tsx           # Game-day prep checklist
│   ├── GamePlanCard.tsx            # Event hero card
│   ├── ScoutingContext.tsx         # Previous matchup context
│   ├── QuickActions.tsx            # Action panel (2 stubs)
│   ├── EngagementSection.tsx       # Shoutout nudge (stub)
│   ├── TeamHealthCard.tsx          # Player dots + progress bars
│   ├── SeasonLeaderboardCard.tsx   # W-L + bar chart leaderboard
│   ├── TeamHubPreviewCard.tsx      # Team wall preview
│   ├── ActionItems.tsx             # Eval hints + pending stats
│   ├── ActivityFeed.tsx            # Recent achievement feed
│   ├── SeasonSetupCard.tsx         # Early-season setup progress
│   ├── DevelopmentHint.tsx         # UNUSED — replaced by ActionItems
│   ├── PendingStatsNudge.tsx       # UNUSED — replaced by ActionItems
│   ├── SeasonScoreboard.tsx        # UNUSED — replaced by SeasonLeaderboardCard
│   ├── TopPerformers.tsx           # UNUSED — replaced by SeasonLeaderboardCard
│   ├── TeamPulse.tsx               # UNUSED — replaced by TeamHealthCard
│   └── RosterAlerts.tsx            # UNUSED — replaced by TeamHealthCard
├── parent-scroll/
│   ├── DayStripCalendar.tsx        # 7-day strip (taps do nothing)
│   ├── AttentionBanner.tsx         # Urgency nudge banner
│   ├── EventHeroCard.tsx           # Event hero + RSVP + Directions
│   ├── AthleteCard.tsx             # Child player card
│   ├── AmbientCelebration.tsx      # Recent achievement text
│   ├── MetricGrid.tsx              # 2x2 stats grid
│   ├── TeamHubPreview.tsx          # Team wall preview
│   ├── SeasonSnapshot.tsx          # W-L record bar
│   ├── FlatChatPreview.tsx         # Chat preview row
│   ├── RecentBadges.tsx            # Badge pills
│   └── SecondaryEvents.tsx         # "+N more events" hint
├── player-scroll/
│   ├── HeroIdentityCard.tsx        # Player identity + OVR badge
│   ├── StreakBanner.tsx            # Attendance streak
│   ├── TheDrop.tsx                 # "Since you were last here"
│   ├── PhotoStrip.tsx              # Photo thumbnails (taps do nothing)
│   ├── NextUpCard.tsx              # Next event + RSVP
│   ├── ChatPeek.tsx                # Chat stub ("coming soon")
│   ├── QuickPropsRow.tsx           # Shoutout stub
│   ├── ActiveChallengeCard.tsx     # Challenge stub (always null)
│   ├── LastGameStats.tsx           # Last game stat grid
│   └── ClosingMascot.tsx           # XP + closing line
└── ui/
    ├── RoleSelector.tsx
    ├── SportSelector.tsx
    ├── SectionHeader.tsx
    ├── Badge.tsx
    ├── Avatar.tsx
    ├── StatBox.tsx
    ├── Card.tsx
    ├── MatchCard.tsx
    ├── PillTabs.tsx
    ├── CarouselDots.tsx
    ├── ImagePreviewModal.tsx
    ├── AppHeaderBar.tsx
    ├── collapsible.tsx
    └── icon-symbol.tsx / icon-symbol.ios.tsx
```

### Hooks

```
hooks/
├── useAdminHomeData.ts      # Admin home scroll data
├── useCoachHomeData.ts      # Coach home scroll data
├── useParentHomeData.ts     # Parent home scroll data
├── usePlayerHomeData.ts     # Player home scroll data
├── useDrawerBadges.ts       # Drawer badge counts
├── useScrollAnimations.ts   # Scroll animation utilities
├── use-color-scheme.ts      # Color scheme detection
├── use-color-scheme.web.ts  # Web color scheme
└── use-theme-color.ts       # Theme color hook
```

### Lib / Contexts

```
lib/
├── auth.tsx                 # AuthProvider + useAuth
├── theme.tsx                # ThemeProvider + useTheme
├── season.tsx               # SeasonProvider + useSeason
├── sport.tsx                # SportProvider + useSport
├── permissions-context.tsx  # PermissionsProvider + usePermissions
├── team-context.tsx         # TeamProvider + useTeam
├── drawer-context.tsx       # DrawerProvider + useDrawer
├── parent-scroll-context.tsx # ParentScrollProvider
├── supabase.ts              # Supabase client init
├── permissions.ts           # Permission utilities
├── chat-utils.ts            # Chat helpers
├── notifications.ts         # Push notification setup
├── reports.ts               # Report generation
├── media-utils.ts           # Image/media helpers
├── design-tokens.ts         # Design system tokens
├── default-images.ts        # Default image assets
├── email-queue.ts           # Email queue service
├── registration-config.ts   # Registration form config
├── first-time-welcome.ts    # First-time user flow
├── engagement-types.ts      # Engagement type definitions
├── engagement-constants.ts  # Engagement constants
├── engagement-events.ts     # Engagement event types
├── challenge-service.ts     # Challenge service
├── shoutout-service.ts      # Shoutout service
├── achievement-types.ts     # Achievement type definitions
└── achievement-engine.ts    # Achievement engine
```

### Theme

```
theme/
├── colors.ts       # BRAND color constants
├── fonts.ts        # FONTS constants (Plus Jakarta Sans, Bebas Neue)
└── spacing.ts      # Spacing scale
```

---

## 3. Route Map

### Auth Routes (7 screens)

| Route | File | Type | Status |
|-------|------|------|--------|
| `/(auth)/welcome` | `app/(auth)/welcome.tsx` | stack | Functional |
| `/(auth)/login` | `app/(auth)/login.tsx` | stack | Functional |
| `/(auth)/signup` | `app/(auth)/signup.tsx` | stack | Functional |
| `/(auth)/league-setup` | `app/(auth)/league-setup.tsx` | stack | Functional |
| `/(auth)/parent-register` | `app/(auth)/parent-register.tsx` | stack | Functional |
| `/(auth)/coach-register` | `app/(auth)/coach-register.tsx` | stack | Functional |
| `/(auth)/redeem-code` | `app/(auth)/redeem-code.tsx` | stack | Functional |
| `/(auth)/pending-approval` | `app/(auth)/pending-approval.tsx` | stack | Functional |

### Visible Tab Routes (5 tabs)

| Route | File | Tab Label | Accessible By | Status |
|-------|------|-----------|---------------|--------|
| `/(tabs)/` (index) | `app/(tabs)/index.tsx` | Home | All roles | Functional — DashboardRouter |
| `/(tabs)/manage` | `app/(tabs)/manage.tsx` | Manage | Admin only | Functional |
| `/(tabs)/gameday` | `app/(tabs)/gameday.tsx` | Game Day | Coach, Player | Functional |
| `/(tabs)/parent-schedule` | `app/(tabs)/parent-schedule.tsx` | Schedule | Parent only | Functional |
| `/(tabs)/chats` | `app/(tabs)/chats.tsx` | Chat | All roles | Functional — real-time unread badge |
| `/(tabs)/menu-placeholder` | `app/(tabs)/menu-placeholder.tsx` | More | All roles | Opens GestureDrawer (not a real screen) |

### Hidden Tab Routes (19 tabs, `href: null`)

| Route | File | Accessible Via | Status |
|-------|------|----------------|--------|
| `/(tabs)/connect` | `app/(tabs)/connect.tsx` | Drawer | Functional |
| `/(tabs)/me` | `app/(tabs)/me.tsx` | Drawer | Functional |
| `/(tabs)/parent-chat` | `app/(tabs)/parent-chat.tsx` | Drawer, ParentHomeScroll | Functional |
| `/(tabs)/parent-team-hub` | `app/(tabs)/parent-team-hub.tsx` | Drawer, ParentHomeScroll | Functional |
| `/(tabs)/parent-my-stuff` | `app/(tabs)/parent-my-stuff.tsx` | Drawer | Functional |
| `/(tabs)/coach-schedule` | `app/(tabs)/coach-schedule.tsx` | Drawer, CoachHomeScroll | Functional |
| `/(tabs)/coach-chat` | `app/(tabs)/coach-chat.tsx` | Drawer, CoachHomeScroll | Functional |
| `/(tabs)/coach-team-hub` | `app/(tabs)/coach-team-hub.tsx` | Drawer | Functional |
| `/(tabs)/coach-my-stuff` | `app/(tabs)/coach-my-stuff.tsx` | Drawer | Functional |
| `/(tabs)/admin-schedule` | `app/(tabs)/admin-schedule.tsx` | Drawer | Functional (re-exports coach-schedule) |
| `/(tabs)/admin-chat` | `app/(tabs)/admin-chat.tsx` | Drawer | Unreachable (no nav references) |
| `/(tabs)/admin-teams` | `app/(tabs)/admin-teams.tsx` | Drawer | Functional |
| `/(tabs)/admin-my-stuff` | `app/(tabs)/admin-my-stuff.tsx` | Drawer | Functional |
| `/(tabs)/schedule` | `app/(tabs)/schedule.tsx` | Drawer | Functional |
| `/(tabs)/messages` | `app/(tabs)/messages.tsx` | Drawer | Functional |
| `/(tabs)/players` | `app/(tabs)/players.tsx` | Drawer, AdminDashboard | Functional |
| `/(tabs)/teams` | `app/(tabs)/teams.tsx` | Drawer | Functional |
| `/(tabs)/coaches` | `app/(tabs)/coaches.tsx` | Drawer | Functional |
| `/(tabs)/payments` | `app/(tabs)/payments.tsx` | Drawer | Functional |
| `/(tabs)/reports-tab` | `app/(tabs)/reports-tab.tsx` | Drawer | Functional |
| `/(tabs)/settings` | `app/(tabs)/settings.tsx` | Drawer | Functional |
| `/(tabs)/my-teams` | `app/(tabs)/my-teams.tsx` | Drawer | Functional |
| `/(tabs)/jersey-management` | `app/(tabs)/jersey-management.tsx` | Drawer | Functional |

### Stack Screens (42 screens)

| Route | File | Accessible Via | Status |
|-------|------|----------------|--------|
| `/notification` | `app/notification.tsx` | Bell icon (all homes) | Functional |
| `/family-payments` | `app/family-payments.tsx` | Parent MetricGrid, my-stuff | Functional |
| `/attendance` | `app/attendance.tsx` | Schedule → event | Functional |
| `/coach-availability` | `app/coach-availability.tsx` | Drawer, coach-my-stuff | Functional |
| `/game-day-parent` | `app/game-day-parent.tsx` | **ORPHANED** — never referenced | Dead code |
| `/child-detail` | `app/child-detail.tsx` | Parent AthleteCard | Functional |
| `/coach-profile` | `app/coach-profile.tsx` | Drawer, AppDrawer | Functional |
| `/notification-preferences` | `app/notification-preferences.tsx` | All my-stuff screens | Functional |
| `/my-waivers` | `app/my-waivers.tsx` | Parent my-stuff | Functional |
| `/profile` | `app/profile.tsx` | All my-stuff screens | Functional |
| `/org-directory` | `app/org-directory.tsx` | Drawer | Functional |
| `/lineup-builder` | `app/lineup-builder.tsx` | Game prep | Functional |
| `/my-kids` | `app/my-kids.tsx` | Parent my-stuff | Functional (3 broken nav links) |
| `/my-stats` | `app/my-stats.tsx` | Player my-stuff | Functional |
| `/standings` | `app/standings.tsx` | Multiple sources | Functional (leaderboards stub) |
| `/web-features` | `app/web-features.tsx` | Drawer | Functional |
| `/blast-history` | `app/blast-history.tsx` | Drawer, coach chat | Functional |
| `/team-management` | `app/team-management.tsx` | Admin manage tab | Functional |
| `/season-settings` | `app/season-settings.tsx` | Admin manage tab | Functional |
| `/coach-directory` | `app/coach-directory.tsx` | Drawer | Functional |
| `/users` | `app/users.tsx` | Admin manage tab | Functional |
| `/season-archives` | `app/season-archives.tsx` | Drawer | Functional |
| `/blast-composer` | `app/blast-composer.tsx` | Drawer | Functional |
| `/team-roster` | `app/team-roster.tsx` | Multiple sources | Functional |
| `/game-results` | `app/game-results.tsx` | Schedule → game | Functional |
| `/game-prep-wizard` | `app/game-prep-wizard.tsx` | Coach game day | Functional |
| `/game-prep` | `app/game-prep.tsx` | Game prep wizard | Functional |
| `/team-wall` | `app/team-wall.tsx` | Team hub | Functional |
| `/season-reports` | `app/season-reports.tsx` | Drawer, admin | Functional |
| `/team-gallery` | `app/team-gallery.tsx` | Team wall | Functional |
| `/achievements` | `app/achievements.tsx` | Multiple sources | Functional |
| `/help` | `app/help.tsx` | All my-stuff screens | Functional |
| `/invite-friends` | `app/invite-friends.tsx` | All my-stuff screens | Functional |
| `/privacy-policy` | `app/privacy-policy.tsx` | My-stuff, auth | Functional |
| `/terms-of-service` | `app/terms-of-service.tsx` | My-stuff, auth | Functional |
| `/parent-registration-hub` | `app/parent-registration-hub.tsx` | Parent my-stuff | Functional |
| `/registration-hub` | `app/registration-hub.tsx` | Admin manage tab | Functional |
| `/claim-account` | `app/claim-account.tsx` | Auth flow | Functional |
| `/report-viewer` | `app/report-viewer.tsx` | ReportsScreen | Functional |
| `/data-rights` | `app/data-rights.tsx` | Drawer, profile | Functional |
| `/register/[seasonId]` | `app/register/[seasonId].tsx` | Public registration link | Functional |
| `/chat/[id]` | `app/chat/[id].tsx` | Chat list → thread | Functional |

---

## 4. Screen Inventory (Per Role)

### 4A. Parent Home — `ParentHomeScroll.tsx`

**Scroll Architecture:** Animated.ScrollView with velocity-sensitive sections and auto-hiding tab bar.

**Section Order:**
1. Day-Strip Calendar (7-day horizontal strip with event dots)
2. Attention Banner (urgency nudge, tappable → parent-schedule)
3. Event Hero Card (next event with RSVP + Directions buttons)
4. Secondary Events (+N more events hint)
5. Athlete Card(s) (per child, velocity-sensitive expanded stats)
6. Ambient Celebration (recent badge earned — last 7 days)
7. Metric Grid (2x2: Record, Balance, Progress, Chat)
8. Team Hub Preview (latest wall post)
9. Season Snapshot (W-L with bar)
10. Flat Chat Preview (latest message)
11. Recent Badges (horizontal badge pills)

**Data:** `useParentHomeData()` — fetches children, events, RSVP, stats, payments, chat, badges via Supabase.

### 4B. Coach Home — `CoachHomeScroll.tsx`

**Scroll Architecture:** Animated.ScrollView with team selector pills and compact header.

**Section Order:**
1. Welcome Section (mascot, greeting, briefing)
2. Team Selector Pills (multi-team filter)
3. Prep Checklist (lineup/RSVP/stats readiness — event days only)
4. Game Plan Card (event hero — within 48 hours only)
5. Scouting Context (previous matchup line)
6. Quick Actions (6 action items, 2 are stubs)
7. Engagement Section (shoutout nudge — stub)
8. Team Health Card (player dots + progress bars)
9. Season Leaderboard Card (W-L + bar chart)
10. Action Items (eval hints + pending stats)
11. Team Hub Preview Card (last 2 posts)
12. Activity Feed (recent achievements — last 14 days)
13. Season Setup Card (early-season progress — conditional)
14. Closing (contextual sign-off)

**Data:** `useCoachHomeData()` — fetches events, roster, stats, RSVP, attendance, evaluations via Supabase.

### 4C. Player Home — `PlayerHomeScroll.tsx`

**Scroll Architecture:** Animated.ScrollView with dark theme (`PLAYER_THEME`).

**Section Order:**
1. Hero Identity Card (name, team, OVR badge, XP bar)
2. Streak Banner (attendance streak ≥ 2)
3. The Drop ("Since you were last here" — badges + stats from last 7 days)
4. Photo Strip (horizontal photos — taps do nothing)
5. Next Up Card (next event + inline RSVP)
6. Chat Peek ("Chat coming soon" — stub)
7. Quick Props Row (shoutout — stub)
8. Active Challenge Card (always null — tables don't exist)
9. Last Game Stats (top 4 stats grid)
10. Closing Mascot (XP to next level)

**Data:** `usePlayerHomeData(playerId)` — fetches player profile, events, stats, achievements, XP via Supabase.

### 4D. Admin Home — `AdminHomeScroll.tsx`

**Scroll Architecture:** ScrollView (not Animated).

**Section Order:**
1. Welcome Briefing (parallax mascot, greeting, urgency counters)
2. Search Bar (stub — Alert.alert "Coming Soon")
3. Smart Queue (up to 4 action cards — all action buttons are stubs)
4. Team Health Tiles (horizontal tiles — taps do nothing)
5. Payment Snapshot (collected vs expected — action buttons are stubs)
6. Quick Actions Grid (3x2 — all 6 are stubs)
7. Coach Section (coach list — "Assign Task" is stub)
8. Upcoming Events (event list — "View Calendar" and "Create Event" are stubs)
9. Closing Motivation (sign-off with fade-in)

**Data:** `useAdminHomeData()` — fetches teams, players, coaches, events, payments, queue items via Supabase.

### 4E. Tab Screens

| Tab | Render | Data | Actions |
|-----|--------|------|---------|
| `manage` (Admin) | Registration hub, team management, season settings, user management tiles | Static menu | Navigate to respective screens |
| `gameday` (Coach) | Game prep wizard, attendance, game results | Events, RSVP | Start game prep, take attendance, enter results |
| `parent-schedule` | Calendar + event list | Events, RSVP | View events, RSVP |
| `chats` | Chat thread list with unread badges | Real-time Supabase subscription | Open thread, create new chat |
| `coach-schedule` | Calendar + event list | Events, teams | Create/view events |
| `players` | Player roster with search | Team players | View player cards |
| `teams` | Team list | Teams | View team details |
| `coaches` | Coach list | Coaches | View coach profiles |
| `payments` | Payment ledger | Season fees, payments | View payment details |

### 4F. Key Full-Screen Experiences

| Screen | What It Does | Working? |
|--------|-------------|----------|
| `registration-hub` | Admin: review/approve/deny registrations, form builder | Yes |
| `parent-registration-hub` | Parent: register child for season | Yes |
| `register/[seasonId]` | Public registration form from link | Yes |
| `game-prep-wizard` | Coach: multi-step game preparation | Yes |
| `game-results` | Enter game scores and set results | Yes |
| `lineup-builder` | Drag players into rotation positions | Yes |
| `team-wall` | Team social feed with posts/photos/comments | Yes |
| `team-gallery` | Team photo gallery | Yes |
| `achievements` | Achievement catalog with categories | Yes |
| `blast-composer` | Compose and send announcements | Yes |
| `standings` | Team standings + leaderboard (leaderboard is "Coming Soon") | Partial |
| `child-detail` | Parent: detailed child view | Yes |
| `season-reports` | Season analytics with charts | Yes |
| `family-payments` | Parent: payment overview | Yes |

### 4G. Modals & Bottom Sheets

| Modal | Trigger | Actions |
|-------|---------|---------|
| `EventDetailModal` | Tap event in schedule | View event details, RSVP |
| `GameCompletionWizard` | Complete game in schedule | Enter set scores, complete game |
| `GiveShoutoutModal` | Shoutout action (coach) | Select player, category, message |
| `CreateChallengeModal` | Create challenge action (coach) | Set target, category, deadline |
| `ChallengeDetailModal` | Tap challenge card | View progress, opt in |
| `LevelUpCelebrationModal` | Level up event | Celebration animation |
| `AchievementCelebrationModal` | Achievement earned | Celebration animation |
| `CoppaConsentModal` | Minor registration | COPPA compliance |
| `ParentOnboardingModal` | First-time parent | Welcome walkthrough |
| `ShareRegistrationModal` | Share registration link | Copy link, QR code |
| `EmergencyContactModal` | Tap emergency contact | View contact info |
| `ImagePreviewModal` | Tap image | Full-screen image view |

---

## 5. Feature Matrix — Web Admin vs Mobile

| Feature | Web Admin | Mobile | Notes |
|---------|-----------|--------|-------|
| **Season Management** | | | |
| Create/edit season | ✅ Full (multi-tab modal) | ✅ `season-settings.tsx` | Mobile is simpler |
| Season archive/browse | ✅ Full yearbook | ✅ `season-archives.tsx` | Mobile functional |
| Multi-season view | ✅ Season selector | ✅ `useSeason()` context | Both work |
| Fee configuration | ✅ Full (sibling discounts, early bird) | ✅ `SeasonFeesManager` | Mobile functional |
| **Registration** | | | |
| Registration review (approve/deny) | ✅ Full table + modal | ✅ `registration-hub.tsx` | Both functional |
| Registration form builder | ✅ Full drag-reorder | ⚠️ `web-features.tsx` | **Web only** — mobile shows "Available on web" |
| Public registration form | ✅ Full form | ✅ `register/[seasonId].tsx` | Both functional |
| Parent registration flow | ✅ Multi-child | ✅ `parent-registration-hub.tsx` | Both functional |
| Registration funnel analytics | ✅ Conversion charts | ❌ None | **Web only** |
| **Team Management** | | | |
| Create/edit teams | ✅ Full | ✅ `team-management.tsx` | Both functional |
| Roster management | ✅ Drag-drop | ✅ `team-roster.tsx` | Both functional |
| Team detail / wall | ✅ Full social feed | ✅ `team-wall.tsx` | Both functional |
| Coach assignment | ✅ Full CRUD | ⚠️ Partial in admin | Mobile simpler |
| **Player Management** | | | |
| Player profile view | ✅ Sidebar + expanded card | ✅ `PlayerCardExpanded` | Both functional |
| Player stats view | ✅ Per-category | ✅ `my-stats.tsx` | Both functional |
| Skill ratings / spider chart | ✅ Full radar chart | ⚠️ View only | Mobile doesn't have eval entry |
| Player evaluation form | ✅ 9-skill rating | ❌ None | **Web only** |
| Player goals & notes | ✅ CRUD with dates | ❌ None | **Web only** |
| Player search | ✅ Search + filter | ✅ Search in `players.tsx` | Both functional |
| **Schedule & Events** | | | |
| Calendar views (month/week/day) | ✅ 4 view modes | ✅ Month + list | Mobile has 2 views |
| Create event | ✅ Full modal | ✅ In schedule screen | Both functional |
| Edit event | ✅ Modal | ✅ In schedule screen | Both functional |
| Event detail | ✅ Modal | ✅ `EventDetailModal` | Both functional |
| RSVP (send/receive) | ✅ Full | ✅ Full (inline + modal) | Both functional |
| Bulk practice/game creation | ✅ Bulk modals | ❌ None | **Web only** |
| Venue manager | ✅ CRUD | ❌ None | **Web only** |
| Schedule poster / share card | ✅ Generate graphics | ❌ None | **Web only** |
| **Attendance** | | | |
| Attendance tracking | ✅ Per-event | ✅ `attendance.tsx` | Both functional |
| Volunteer assignment | ✅ Full | ❌ None | **Web only** |
| Attendance trends | ✅ Line chart widget | ⚠️ Data only | Mobile shows numbers, no chart |
| **Payments** | | | |
| Payment tracking | ✅ Full ledger | ✅ `payments.tsx` | Both functional |
| Fee calculator / backfill | ✅ Auto-generate | ⚠️ Partial | Mobile has `SeasonFeesManager` |
| Payment reminders | ✅ Email/text | ❌ Stub | Mobile has "Coming Soon" alert |
| Stripe integration | ✅ Full | ❌ None | **Web only** |
| Manual payment methods (Venmo/Zelle) | ✅ Full setup | ❌ None | **Web only** (payment gateway setup) |
| Parent payment view | ✅ Full | ✅ `family-payments.tsx` | Both functional |
| **Stats & Performance** | | | |
| Game stats entry | ✅ Per-player stepper | ✅ `game-results.tsx` | Both functional |
| Season stats aggregation | ✅ Per-category | ✅ `my-stats.tsx` | Both functional |
| Leaderboards | ✅ Full rankings | ⚠️ "Coming Soon" in standings | Mobile stub |
| Standings | ✅ W-L, streaks | ✅ `standings.tsx` | Both functional |
| **Communication** | | | |
| Team chat | ✅ Real-time threads | ✅ Real-time `chat/[id]` | Both functional |
| Blasts / announcements | ✅ Full with ack tracking | ✅ `blast-composer.tsx` | Both functional |
| Push notifications admin | ✅ Full dashboard | ❌ None (send-side) | **Web only** — mobile receives only |
| Notification preferences | N/A | ✅ `notification-preferences.tsx` | Mobile only |
| **Engagement & Gamification** | | | |
| Achievement catalog | ✅ Full with categories | ✅ `achievements.tsx` | Both functional |
| Achievement celebrations | ✅ Modal animation | ✅ `AchievementCelebrationModal` | Both functional |
| Shoutouts (give/receive) | ✅ Full | ⚠️ Stub (modal exists, not wired) | Mobile has components but all "Coming Soon" |
| Challenges (create/participate) | ✅ Full CRUD | ⚠️ Stub (modal exists, tables don't exist) | Mobile has components but not functional |
| XP / Level system | ✅ Journey timeline | ✅ Level badges, XP bars | Both functional |
| **Team Hub / Social** | | | |
| Team wall posts | ✅ Full feed | ✅ `team-wall.tsx` | Both functional |
| Photo gallery | ✅ Full with lightbox | ✅ `team-gallery.tsx` | Both functional |
| Comments / reactions | ✅ Full | ✅ In team wall | Both functional |
| **Waivers** | | | |
| Create waiver templates | ✅ Full CRUD | ⚠️ `web-features.tsx` | **Web only** — mobile shows "Available on web" |
| Sign waivers | ✅ Embedded | ✅ `my-waivers.tsx` | Both functional |
| Track completion | ✅ Dashboard | ⚠️ Partial | Mobile shows in registration |
| **Jersey / Equipment** | | | |
| Jersey management | ✅ Full (number + size) | ✅ `jersey-management.tsx` | Both functional |
| Size distribution | ✅ Analytics | ❌ None | **Web only** |
| **Coach Tools** | | | |
| Game prep | ✅ Checkpoint journey | ✅ `game-prep-wizard.tsx` | Both functional |
| Lineup builder | ✅ Drag-drop | ✅ `lineup-builder.tsx` | Both functional |
| Quick attendance | ✅ Modal | ✅ In attendance screen | Both functional |
| Quick score | ✅ Modal | ✅ In game results | Both functional |
| Advanced lineup | ✅ Extended features | ❌ None | **Web only** |
| Practice planner | ❌ None | ❌ None | Neither |
| **Admin Tools** | | | |
| Organization settings | ✅ Full (profile, venues, admins) | ⚠️ `web-features.tsx` | **Web only** |
| Coach management with bg checks | ✅ Full | ⚠️ Basic `coaches.tsx` | Mobile lacks background check tracking |
| Reports & analytics | ✅ Multi-category | ✅ `season-reports.tsx` | Mobile simpler |
| Data export | ✅ Full backup | ❌ None | **Web only** |
| Subscription management | ✅ Plan tiers | ❌ None | **Web only** |
| **Account & Settings** | | | |
| Profile editing | ✅ Full + photo | ✅ `profile.tsx` | Both functional |
| Role switching | N/A | ✅ `RoleSelector` | Mobile only (web auto-detects) |
| Theme/dark mode | ✅ Full | ✅ `useTheme()` | Both functional |
| Invite friends | ✅ Invite page | ✅ `invite-friends.tsx` | Both functional |

### Summary: Web-Only Features (No Mobile Equivalent)

1. Registration form builder / template editor
2. Registration funnel analytics
3. Player evaluation form (9-skill rating entry)
4. Player goals & notes CRUD
5. Bulk event creation (practices + games)
6. Venue manager CRUD
7. Schedule poster / game day share card
8. Volunteer assignment
9. Stripe payment integration / gateway setup
10. Push notification admin dashboard
11. Advanced lineup builder
12. Organization settings (profile, venues, admin users)
13. Data export / full backup
14. Subscription management
15. Coach background check tracking

---

## 6. Tap Target Map

### 6A. Parent Home — `ParentHomeScroll`

| Tap Target | Component | Navigates To | Working? |
|------------|-----------|-------------|----------|
| Day cell (calendar strip) | `DayStripCalendar` | Nowhere — no onPress | No |
| Attention banner | `AttentionBanner` | `/(tabs)/parent-schedule` | Yes |
| Event hero card body | `EventHeroCard` | `/(tabs)/parent-schedule` | Yes |
| RSVP button on hero | `EventHeroCard` | Calls `data.rsvpHeroEvent('yes')` | Yes |
| Directions button on hero | `EventHeroCard` | Native maps via `Linking.openURL` | Yes |
| Secondary events text | `SecondaryEvents` | `/(tabs)/parent-schedule` | Yes |
| Athlete card (per child) | `AthleteCard` | `/child-detail?playerId=${id}` | Yes |
| Record card (metric grid) | `MetricGrid` | `/(tabs)/parent-schedule` | Yes |
| Balance card (metric grid) | `MetricGrid` | `/family-payments` | Yes |
| Progress card (metric grid) | `MetricGrid` | `/achievements` | Yes |
| Chat card (metric grid) | `MetricGrid` | `/(tabs)/parent-chat` | Yes |
| "View All" (team hub) | `TeamHubPreview` | `/(tabs)/parent-team-hub` | Yes |
| Post row (team hub) | `TeamHubPreview` | `/(tabs)/parent-team-hub` | Yes |
| Last game result (snapshot) | `SeasonSnapshot` | `/(tabs)/parent-schedule` | Yes |
| Chat preview row | `FlatChatPreview` | `/(tabs)/parent-chat` | Yes |
| "See All" badges | `RecentBadges` | `/achievements` | Yes |
| Each badge pill | `RecentBadges` | `/achievements` | Yes |

### 6B. Coach Home — `CoachHomeScroll`

| Tap Target | Component | Navigates To | Working? |
|------------|-----------|-------------|----------|
| Bell icon | Header | `/notification` | Yes |
| RoleSelector | Header | Role switch | Yes |
| Team pills | Team selector | `data.selectTeam()` (filter) | Yes |
| Checklist container | `PrepChecklist` | `/(tabs)/coach-schedule` | Yes |
| "Roster" pill | `GamePlanCard` | `/(tabs)/coach-roster` | **BROKEN** — route doesn't exist |
| "Lineup" pill | `GamePlanCard` | `/(tabs)/coach-roster` | **BROKEN** |
| "Stats" pill | `GamePlanCard` | `/(tabs)/coach-schedule` | Yes |
| "Attend." pill | `GamePlanCard` | `/(tabs)/coach-schedule` | Yes |
| Missing RSVP names | `GamePlanCard` | `/(tabs)/coach-chat` | Yes |
| "START GAME DAY MODE" | `GamePlanCard` | Alert "Coming Soon" | Stub |
| Scouting context | `ScoutingContext` | `/(tabs)/coach-schedule` | Yes |
| "Send a Blast" | `QuickActions` | `/(tabs)/coach-chat` | Yes |
| "Build a Lineup" | `QuickActions` | `/(tabs)/coach-roster` | **BROKEN** |
| "Give a Shoutout" | `QuickActions` | Alert "Coming Soon" | Stub |
| "Review Stats" | `QuickActions` | `/(tabs)/coach-schedule` | Yes |
| "Manage Roster" | `QuickActions` | `/(tabs)/coach-roster` | **BROKEN** |
| "Create a Challenge" | `QuickActions` | Alert "Coming Soon" | Stub |
| Shoutout nudge | `EngagementSection` | Alert "Coming Soon" | Stub |
| Team health card | `TeamHealthCard` | `/(tabs)/coach-roster` | **BROKEN** |
| "View Leaderboard" | `SeasonLeaderboardCard` | `/(tabs)/coach-roster` | **BROKEN** |
| Evaluation item | `ActionItems` | `/(tabs)/coach-roster` | **BROKEN** |
| Pending stats item | `ActionItems` | `/(tabs)/coach-schedule` | Yes |
| "View All" (team hub) | `TeamHubPreviewCard` | `/(tabs)/coach-chat` | Yes |
| Each post row | `TeamHubPreviewCard` | `/(tabs)/coach-chat` | Yes |
| Each feed item | `ActivityFeed` | `/(tabs)/coach-roster` | **BROKEN** |
| "View all" (feed) | `ActivityFeed` | `/(tabs)/coach-roster` | **BROKEN** |
| "Continue Setup" | `SeasonSetupCard` | `/(tabs)/coach-schedule` | Yes |

### 6C. Player Home — `PlayerHomeScroll`

| Tap Target | Component | Navigates To | Working? |
|------------|-----------|-------------|----------|
| OVR badge | `HeroIdentityCard` | Alert "Full profile coming soon!" | Stub |
| Photo thumbnails | `PhotoStrip` | Nowhere — no onPress | No |
| RSVP button | `NextUpCard` | `data.sendRsvp('yes'/'no')` | Yes |
| Chat peek row | `ChatPeek` | Nowhere — no onPress | No (stub) |
| "Give props" row | `QuickPropsRow` | Alert "Coming Soon" | Stub |

### 6D. Admin Home — `AdminHomeScroll`

| Tap Target | Component | Navigates To | Working? |
|------------|-----------|-------------|----------|
| Search bar | `AdminHomeScroll` | Alert "Coming Soon" | Stub |
| Queue action buttons | `SmartQueueCard` | Alert "Coming Soon" (all) | Stub |
| Team health tiles | `TeamHealthTiles` | Nowhere — no onPress | No |
| "Send All Reminders" | `PaymentSnapshot` | Alert "Coming Soon" | Stub |
| "View Details" (payments) | `PaymentSnapshot` | Alert "Coming Soon" | Stub |
| All 6 quick actions | `QuickActionsGrid` | Alert "Coming Soon" (all) | Stub |
| "Assign Task" | `CoachSection` | Alert "Coming Soon" | Stub |
| "View Calendar" | `UpcomingEvents` | Alert "Coming Soon" | Stub |
| "Create Event" | `UpcomingEvents` | Alert "Coming Soon" | Stub |
| "Start Setup" (season) | `AdminHomeScroll` | Alert "Coming Soon" | Stub |
| "View more" (queue) | `AdminHomeScroll` | Nowhere — no onPress | No |

---

## 7. Broken / Missing / Orphaned Connections

### 7A. CRITICAL — Non-Existent Route Targets

**`/(tabs)/coach-roster` — DOES NOT EXIST (13 references)**

There is no file `app/(tabs)/coach-roster.tsx` and no tab registered with that name.

| File | Line | Context |
|------|------|---------|
| `components/coach-scroll/DevelopmentHint.tsx` | 67 | Navigation target |
| `components/coach-scroll/ActivityFeed.tsx` | 126 | Feed item navigation |
| `components/coach-scroll/ActivityFeed.tsx` | 137 | "View all" link |
| `components/coach-scroll/ActionItems.tsx` | 66 | Evaluation item |
| `components/coach-scroll/TopPerformers.tsx` | 41 | Performer row |
| `components/coach-scroll/RosterAlerts.tsx` | 118 | Alert navigation |
| `components/coach-scroll/TeamHealthCard.tsx` | 188 | Card + attention row |
| `components/coach-scroll/SeasonLeaderboardCard.tsx` | 246 | "View Leaderboard" |
| `components/coach-scroll/QuickActions.tsx` | 22, 25 | "Build a Lineup", "Manage Roster" |
| `components/coach-scroll/GamePlanCard.tsx` | 47, 48, 53 | "Roster", "Lineup" pills |

**Fix:** Create `app/(tabs)/coach-roster.tsx` (could re-export `players.tsx`) OR change all references to `/(tabs)/players`.

---

**`/team-hub` — DOES NOT EXIST (2 references)**

| File | Line | Context |
|------|------|---------|
| `components/CoachDashboard.tsx` | 1131 | `router.push('/team-hub' as any)` |
| `components/ParentDashboard.tsx` | 1811 | `router.push('/team-hub' as any)` |

**Fix:** Change to `/(tabs)/coach-team-hub` for coach and `/(tabs)/parent-team-hub` for parent.

### 7B. HIGH — Incorrect Path Prefixes

**`/chats` missing `/(tabs)/` prefix**
- `app/my-kids.tsx:368` — `router.push('/chats' as any)`
- No `app/chats.tsx` exists at root. Fix: `/(tabs)/chats`.

**`/schedule` missing `/(tabs)/` prefix**
- `app/my-kids.tsx:360` — `router.push('/schedule' as any)`
- No `app/schedule.tsx` at root. Fix: `/(tabs)/schedule`.

**`/players` missing `/(tabs)/` prefix**
- `components/AdminDashboard.tsx:1258` — `router.push('/players')`
- No `app/players.tsx` at root. Fix: `/(tabs)/players`.

### 7C. Orphaned Files

| File | Issue |
|------|-------|
| `app/game-day-parent.tsx` | **Fully orphaned** — no references anywhere in codebase |
| `components/payments-admin.tsx` | **Never imported** — dead component |
| `components/coach-scroll/DevelopmentHint.tsx` | Replaced by `ActionItems.tsx` — still in codebase but not used |
| `components/coach-scroll/PendingStatsNudge.tsx` | Replaced by `ActionItems.tsx` |
| `components/coach-scroll/SeasonScoreboard.tsx` | Replaced by `SeasonLeaderboardCard.tsx` |
| `components/coach-scroll/TopPerformers.tsx` | Replaced by `SeasonLeaderboardCard.tsx` |
| `components/coach-scroll/TeamPulse.tsx` | Replaced by `TeamHealthCard.tsx` |
| `components/coach-scroll/RosterAlerts.tsx` | Replaced by `TeamHealthCard.tsx` |

### 7D. "Coming Soon" Stubs (18 total)

| Component | What's Stubbed |
|-----------|---------------|
| `admin-scroll/UpcomingEvents.tsx` | "View Calendar", "Create Event" |
| `admin-scroll/SmartQueueCard.tsx` | All action buttons (dynamic routes) |
| `admin-scroll/QuickActionsGrid.tsx` | All 6 action tiles |
| `admin-scroll/PaymentSnapshot.tsx` | "Send All Reminders", "View Details" |
| `admin-scroll/CoachSection.tsx` | "Assign Task" |
| `AdminHomeScroll.tsx` | Search bar, "Start Setup" |
| `coach-scroll/QuickActions.tsx` | "Give a Shoutout", "Create a Challenge" |
| `coach-scroll/EngagementSection.tsx` | Shoutout nudge |
| `coach-scroll/GamePlanCard.tsx` | "START GAME DAY MODE" |
| `player-scroll/QuickPropsRow.tsx` | "Give props" |
| `player-scroll/ActiveChallengeCard.tsx` | Entire card (always null) |
| `player-scroll/ChatPeek.tsx` | "Chat coming soon" |
| `player-scroll/HeroIdentityCard.tsx` | OVR badge tap |
| `standings.tsx` | "Leaderboards Coming Soon" |

### 7E. Empty / No-Op Handlers

| File | Line | Type |
|------|------|------|
| `components/EmergencyContactModal.tsx` | 61 | Card touch sink (intentional) |
| `components/GameCompletionWizard.tsx` | 484 | Card touch sink (intentional) |
| `app/registration-hub.tsx` | 1816 | Modal backdrop blocker (intentional) |
| `components/parent-scroll/DayStripCalendar.tsx` | — | Day cells have TouchableOpacity but no onPress |
| `components/player-scroll/PhotoStrip.tsx` | — | Photo thumbnails have TouchableOpacity but no onPress |
| `components/player-scroll/ChatPeek.tsx` | — | Row has TouchableOpacity but no onPress |

### 7F. TODO / FIXME Items

| File | Line | Comment |
|------|------|---------|
| `components/coach-scroll/GamePlanCard.tsx` | 118 | `// TODO: Navigate to chat/DM with missing player's parent when built` |
| `components/coach-scroll/GamePlanCard.tsx` | 134 | `// TODO: Navigate to Game Day Command Center when built` |
| `app/(tabs)/schedule.tsx` | 152 | `// TODO: Implement when organization_venues table is created` |

### 7G. Drawer-Only Routes (Valid but Less Discoverable)

These screens are reachable only through the GestureDrawer menu — not from any home screen tap target:

- `/coach-availability` — also in coach-my-stuff
- `/coach-profile` — drawer + AppDrawer
- `/web-features` — drawer (4 webOnly items + 1 general)
- `/coach-directory` — drawer only
- `/(tabs)/admin-chat` — hidden tab, never navigated to from anywhere

---

## 8. Full-Screen Experience Recommendations

### CRITICAL Priority

| Screen | Purpose | Roles | Current State | Complexity |
|--------|---------|-------|---------------|------------|
| Coach Roster Tab | View/manage roster, evaluations, player details | Coach | **DOES NOT EXIST** — 13 broken refs | Simple (can re-export `players.tsx`) |
| Admin Quick Actions | Create Event, Send Reminder, Blast All, etc. | Admin | All 6 are stubs | Multi-step per action |
| Admin Smart Queue Actions | Navigate to registration, payments, waivers | Admin | All action buttons are stubs | Routing fix |

### HIGH Priority

| Screen | Purpose | Roles | Current State | Complexity |
|--------|---------|-------|---------------|------------|
| Game Day Command Center | Live coaching during games | Coach | TODO + stub | Heavy interaction |
| Admin Calendar/Schedule | View and manage events across all teams | Admin | "Coming Soon" stub | Medium (can wire to existing schedule) |
| Admin Payment Management | Send reminders, view details | Admin | "Coming Soon" stubs | Medium |
| Player Chat | Player access to team chat | Player | "Coming Soon" stub | Simple (can wire to existing chat) |
| Shoutout Flow | Give/receive shoutouts | Coach, Player | Components exist, not wired | Medium (needs DB tables) |
| Leaderboards | Season leaderboards by stat category | Coach, Player | "Coming Soon" in standings | Medium |

### MEDIUM Priority

| Screen | Purpose | Roles | Current State | Complexity |
|--------|---------|-------|---------------|------------|
| Challenge System | Create and participate in challenges | Coach, Player | Components exist, tables don't | Heavy (needs DB + engine) |
| Player Evaluations | Coach rates player skills | Coach | Web only | Multi-step form |
| Admin Season Setup Wizard | Guided setup for new seasons | Admin | "Coming Soon" | Multi-step wizard |
| Bulk Event Creation | Create recurring practices/games | Coach, Admin | Web only | Multi-step form |
| Payment Reminders | Send payment reminders | Admin | "Coming Soon" | Simple |
| Admin Search | Search across all entities | Admin | "Coming Soon" | Medium |
| DayStrip Calendar Taps | Navigate to day's events on tap | Parent | No handler | Simple fix |
| Photo Strip Taps | Open photo viewer on tap | Player | No handler | Simple fix |

### LOW Priority

| Screen | Purpose | Roles | Current State | Complexity |
|--------|---------|-------|---------------|------------|
| Venue Manager | CRUD for venues | Admin | Web only | Simple CRUD |
| Player Goals & Notes | Track development | Coach | Web only | Medium |
| Volunteer Assignment | Assign parents to roles | Admin, Coach | Web only | Medium |
| Schedule Poster | Generate shareable graphics | Coach | Web only | Heavy (graphics) |
| Stripe Integration | Online payments | Admin, Parent | Web only | Heavy (payment flow) |
| Push Notification Admin | Send/manage push notifications | Admin | Web only | Medium |
| Data Export | Full backup | Admin | Web only | Medium |
| Organization Settings | Org profile, venues, admins | Admin | Redirects to web | Medium |
| Registration Form Builder | Template editor | Admin | Redirects to web | Heavy (form builder) |
| Advanced Lineup Builder | Extended lineup features | Coach | Web only | Heavy |
| Coach Background Checks | Track clearance status | Admin | Web only | Simple CRUD |

---

*This audit is the foundation for every build decision going forward. Generated 2026-03-02.*
