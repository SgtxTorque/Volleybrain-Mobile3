# VolleyBrain Mobile - Feature Inventory & Onboarding Blueprint

> Generated 2026-03-30 | Based on full codebase analysis

---

## Table of Contents

1. [Major User-Facing Features by Role](#1-major-user-facing-features-by-role)
2. [Feature-Role Matrix](#2-feature-role-matrix)
3. [Minimum Onboarding Steps per Role](#3-minimum-onboarding-steps-per-role)
4. [First-Session Activation Paths ("Aha Moment")](#4-first-session-activation-paths)
5. [Recommended Onboarding Cards/Screens](#5-recommended-onboarding-cardsscreens)

---

## 1. Major User-Facing Features by Role

### Admin (league_admin)

| # | Feature | Screen/File | Status |
|---|---------|-------------|--------|
| 1 | **Mission Control Dashboard** | `AdminHomeScroll.tsx` | Complete |
| 2 | **Manage Tab** (attention cards + action grid) | `manage.tsx` | Complete |
| 3 | **Global Search** (players, families, teams) | `admin-search-results.tsx` | Complete |
| 4 | **Registration Hub** (review/approve registrations) | `registration-hub.tsx` | Complete |
| 5 | **Season Setup Wizard** (5-step guided flow) | `season-setup-wizard.tsx` | Complete |
| 6 | **Season Settings** (fees, status, finalization) | `season-settings.tsx` | Complete |
| 7 | **Season Archives** | `season-archives.tsx` | Complete |
| 8 | **Team Management** (create/edit teams, assign rosters) | `team-management.tsx`, `admin-teams.tsx` | Complete |
| 9 | **Coach Directory** (listing, background checks, roles) | `coach-directory.tsx` | Complete |
| 10 | **Coach Background Checks** | `coach-background-checks.tsx` | Complete |
| 11 | **Payment Admin** (collection, reminders, tracking) | `payments.tsx`, `payment-reminders.tsx` | Complete |
| 12 | **Blast Composer** (org-wide announcements) | `blast-composer.tsx` | Complete |
| 13 | **Blast History** | `blast-history.tsx` | Complete |
| 14 | **Jersey Management** | `jersey-management.tsx` | Complete |
| 15 | **Bulk Event Creation** | `bulk-event-create.tsx` | Complete |
| 16 | **Reports & Analytics** | `reports-tab.tsx`, `season-reports.tsx` | Complete |
| 17 | **Org Settings** | `org-settings.tsx` | Complete |
| 18 | **User Approval Queue** | via `manage.tsx` attention cards | Complete |
| 19 | **Financial Dashboard** (collected vs expected, overdue) | `AdminFinancialChart.tsx` | Complete |
| 20 | **Org Pulse Feed** (activity timeline) | `OrgPulseFeed.tsx` | Complete |
| 21 | **Admin Game Day Overview** (today's games, live tracking) | `AdminGameDay.tsx` | Complete |
| 22 | **Admin Achievements** (role-specific badges) | `achievements.tsx` | Complete |

### Coach (head_coach / assistant_coach)

| # | Feature | Screen/File | Status |
|---|---------|-------------|--------|
| 1 | **Coach Dashboard** (hero card, action grid, pulse feed) | `CoachHomeScroll.tsx` | Complete |
| 2 | **Game Day Command Center** (4-page live tracking) | `game-day-command.tsx` | Complete |
| 3 | **Game Prep Wizard** (3-step pre-game flow) | `game-prep-wizard.tsx` | Complete |
| 4 | **Lineup Builder** (court visualization, rotations) | `lineup-builder.tsx` | Complete |
| 5 | **Live Stat Tracking** (in-game stat entry) | via Game Day Command | Complete |
| 6 | **Game Recap / Results** | `game-recap.tsx`, `game-results.tsx` | Complete |
| 7 | **Player Evaluations** (swipe-through 9-skill rating) | `player-evaluations.tsx` | Complete |
| 8 | **Player Goals** (goal setting & tracking) | `player-goals.tsx` | Complete |
| 9 | **Player Card** (trading card + expanded stats) | `player-card.tsx`, `PlayerCardExpanded.tsx` | Complete |
| 10 | **Coach Award System** (direct badge awarding) | `CoachAwardModal.tsx`, `coach-award-service.ts` | Complete |
| 11 | **Roster Management** (grid/list, search, filter) | `players.tsx` | Complete |
| 12 | **Team Schedule** (calendar, event creation, RSVP) | `coach-schedule.tsx` | Complete |
| 13 | **Attendance Tracking** | `attendance.tsx` | Complete |
| 14 | **Coach Engagement Dashboard** (team analytics) | `coach-engagement.tsx` | Complete |
| 15 | **Challenge Dashboard** (create, verify, manage) | `coach-challenge-dashboard.tsx` | Complete |
| 16 | **Challenge Library** (templates) | `challenge-library.tsx` | Complete |
| 17 | **Volunteer Assignment** (3-step flow) | `volunteer-assignment.tsx` | Complete |
| 18 | **Blast Composer** (team announcements) | `blast-composer.tsx` | Complete |
| 19 | **Team Hub** (wall, gallery, roster, events) | `coach-team-hub.tsx` | Complete |
| 20 | **Coach Profile** (specialties, experience, certs) | `coach-profile.tsx` | Complete |
| 21 | **Coach Availability** (calendar, unavailable dates) | `coach-availability.tsx` | Complete |
| 22 | **Shoutout System** (give props to players) | `GiveShoutoutModal.tsx` | Complete |
| 23 | **Chat / Messaging** (team channels, DMs) | `chats.tsx` | Complete |
| 24 | **Invite Parents** (code generation & sharing) | `invite-parents.tsx` | Complete |
| 25 | **Standings** | `standings.tsx` | Complete |
| 26 | **Coach Achievements** (role-specific badges) | `achievements.tsx` | Complete |

### Parent

| # | Feature | Screen/File | Status |
|---|---------|-------------|--------|
| 1 | **Parent Dashboard** (hero, momentum, pulse feed) | `ParentHomeScroll.tsx` | Complete |
| 2 | **My Kids** (multi-child overview, medical, teams) | `my-kids.tsx` | Complete |
| 3 | **Family Gallery** (swipeable child profiles) | `family-gallery.tsx` | Complete |
| 4 | **Parent Schedule** (week/month calendar, inline RSVP) | `parent-schedule.tsx` | Complete |
| 5 | **RSVP Management** (per-child, per-event) | integrated in schedule | Complete |
| 6 | **Family Payments** (multi-method: card, Venmo, Zelle, Cash App) | `family-payments.tsx` | Complete |
| 7 | **My Waivers** (view & track consent forms) | `my-waivers.tsx` | Complete |
| 8 | **Parent Registration Hub** (browse seasons, register children) | `parent-registration-hub.tsx` | Complete |
| 9 | **Child Evaluations** (view coach evaluations, OVR, trends) | `EvaluationCard.tsx` | Complete |
| 10 | **Child Achievements** (badges earned by children) | `RecentBadges.tsx` | Complete |
| 11 | **Challenge Verification** (verify child challenge completions) | `ChallengeVerifyCard.tsx` | Complete |
| 12 | **Parent Team Hub** (team wall, roster, events) | `parent-team-hub.tsx` | Complete |
| 13 | **Payment Nudge** (outstanding balance alerts) | `ParentPaymentNudge.tsx` | Complete |
| 14 | **Attention Strip** (RSVP reminders, payment alerts) | `ParentAttentionStrip.tsx` | Complete |
| 15 | **Family Pulse Feed** (activity feed, team updates) | `FamilyPulseFeed.tsx` | Complete |
| 16 | **Season Snapshot** (games, record, streak) | `SeasonSnapshot.tsx` | Complete |
| 17 | **Parent Trophy Bar** (parent-role achievements & XP) | `ParentTrophyBar.tsx` | Complete |
| 18 | **Family Hero Card** (greeting, level, XP, mascot) | `FamilyHeroCard.tsx` | Complete |
| 19 | **Momentum Row** (record, balance, level, streak) | `ParentMomentumRow.tsx` | Complete |
| 20 | **Chat / Messaging** (team channels, coach DMs) | `chats.tsx` | Complete |
| 21 | **Shoutout System** (give props) | `GiveShoutoutModal.tsx` | Complete |
| 22 | **Invite Friends** (referral) | `invite-friends.tsx` | Complete |
| 23 | **Parent Achievements** (role-specific badges) | `achievements.tsx` | Complete |

### Player

| # | Feature | Screen/File | Status |
|---|---------|-------------|--------|
| 1 | **Player Dashboard** (identity hero, momentum, quests) | `PlayerHomeScroll.tsx` | Complete |
| 2 | **Player Card** (FIFA-style trading card, OVR, stats) | `PlayerTradingCard.tsx`, `player-card.tsx` | Complete |
| 3 | **My Stats** (season stats, personal bests, game history) | `my-stats.tsx` | Complete |
| 4 | **Skill Ratings** (6 skills, coach evaluations, trends) | via `my-stats.tsx` | Complete |
| 5 | **Achievements / Trophy Case** (badge grid, rarity, progress) | `achievements.tsx` | Complete |
| 6 | **XP & Level System** (30 levels, 7 tiers) | `engagement-constants.ts` | Complete |
| 7 | **Season Rank** (Bronze-Diamond tier progression) | `season-rank-engine.ts` | Complete |
| 8 | **Weekly Leaderboard** (podium, promotions/demotions) | `engagement-leaderboard.tsx` | Complete |
| 9 | **Daily Quests** (app check-in, drills, social) | `quest-engine.ts` | Complete |
| 10 | **Weekly Quests** (attendance, skill modules, performance) | `team-quest-engine.ts` | Complete |
| 11 | **Challenges** (coach-created team challenges) | `challenges.tsx`, `challenge-detail.tsx` | Complete |
| 12 | **Streaks** (engagement streak with freeze mechanic) | `streak-engine.ts` | Complete |
| 13 | **Shoutouts** (give & receive props, 10 categories) | `GiveShoutoutModal.tsx`, `ShoutoutReceivedModal.tsx` | Complete |
| 14 | **Competitive Nudge** ("3 more aces to rank #7") | `CompetitiveNudge.tsx` | Complete |
| 15 | **Team Hub** (team wall, activity feed) | `PlayerTeamHubCard.tsx` | Complete |
| 16 | **Continue Training** (skill journey path) | `PlayerContinueTraining.tsx` | Complete |
| 17 | **Last Game Stats** (animated count-up performance) | `LastGameStats.tsx` | Complete |
| 18 | **Chat / Messaging** (team channels) | `chats.tsx` | Complete |
| 19 | **Coach Award Celebrations** (modal when badge received) | `CoachAwardModal.tsx` | Complete |
| 20 | **Streak Milestone Celebrations** | `StreakMilestoneCelebrationModal.tsx` | Complete |
| 21 | **Season Rank-Up Celebrations** | `SeasonRankUpModal.tsx` | Complete |

### Team Manager

| # | Feature | Screen/File | Status |
|---|---------|-------------|--------|
| 1 | **Team Manager Dashboard** (greeting, cards, quick actions) | `TeamManagerHomeScroll.tsx` | Complete |
| 2 | **Team Manager Setup Wizard** (4-step team creation) | `team-manager-setup.tsx` | Complete |
| 3 | **Attendance Tracking** | `attendance.tsx` | Complete |
| 4 | **Volunteer Assignment** (3-step flow) | `volunteer-assignment.tsx` | Complete |
| 5 | **Team Schedule** | `coach-schedule.tsx` | Complete |
| 6 | **Payments Management** | `payments.tsx` | Complete |
| 7 | **Invite Parents** (code generation & sharing) | via invite modal | Complete |
| 8 | **Blast Composer** (team announcements) | `blast-composer.tsx` | Complete |
| 9 | **Roster View** | `players.tsx` | Complete |
| 10 | **Chat / Messaging** | `chats.tsx` | Complete |
| 11 | **Team Manager Achievements** | `achievements.tsx` | Complete |

---

## 2. Feature-Role Matrix

| Feature Area | Admin | Coach | Parent | Player | Team Mgr |
|---|:---:|:---:|:---:|:---:|:---:|
| **Dashboard** | Mission Control | Coach Home | Family Home | Player Home | TM Home |
| **Schedule** | Org-wide | Team calendar | Family calendar | View only | Team calendar |
| **Game Day** | Overview | Full command | -- | View stats | -- |
| **Lineup / Rotation** | -- | Full control | -- | -- | -- |
| **Live Stats** | -- | Entry + tracking | -- | View own | -- |
| **Evaluations** | -- | Create + review | View child's | View own | -- |
| **Player Goals** | -- | Create + track | -- | View own | -- |
| **Player Card** | View all | View + award | View child's | View own | View roster |
| **Achievements** | Admin badges | Coach badges | Parent badges | Player badges | TM badges |
| **XP / Levels** | Earn XP | Earn XP | Earn XP | Earn XP | Earn XP |
| **Leaderboard** | -- | View team | -- | Compete | -- |
| **Quests** | -- | -- | -- | Daily + weekly | -- |
| **Challenges** | -- | Create + verify | Verify child | Participate | -- |
| **Streaks** | -- | View team | View child's | Maintain own | -- |
| **Shoutouts** | Give | Give + receive | Give | Give + receive | Give |
| **Coach Awards** | -- | Award badges | -- | Receive | -- |
| **Payments** | Org-wide admin | -- | Family payments | -- | Team payments |
| **Registration** | Approve + manage | -- | Register child | -- | -- |
| **Roster** | Org-wide | Team roster | View | View | Team roster |
| **Team Hub** | All teams | Team wall | Team view | Team view | Team view |
| **Chat** | All channels | Team + DMs | Team + DMs | Team | Team + DMs |
| **Blasts** | Org-wide | Team | -- | -- | Team |
| **Volunteers** | -- | Assign | Sign up | -- | Assign |
| **Waivers** | Manage | -- | Sign + view | -- | -- |
| **Season Management** | Full control | -- | -- | -- | Own season |
| **Reports** | Org analytics | Team analytics | -- | Personal stats | -- |
| **Search** | Global | Team | -- | -- | -- |
| **Invite System** | Org codes | Team codes | Referral | -- | Team codes |
| **Settings** | Org + profile | Profile | Profile | Profile | Profile |

---

## 3. Minimum Onboarding Steps per Role

### Admin (league_admin)

| Step | Screen | Action Required | Can Skip? |
|------|--------|-----------------|-----------|
| 1 | Welcome Carousel | View 4 slides or skip | Yes (skip) |
| 2 | Signup | Name, email, password | No |
| 3 | Role Selection | Select "Coach" (admins are typically promoted) | No |
| 4 | Connect | Enter org invite code OR create new org | No |
| 5 | Season Setup Wizard | Create first season (name, dates, teams) | Deferrable |

**Minimum critical path: 4 steps** (signup + org connection)
**Time estimate: 2-3 minutes**

### Coach (head_coach / assistant_coach)

| Step | Screen | Action Required | Can Skip? |
|------|--------|-----------------|-----------|
| 1 | Welcome Carousel | View 4 slides or skip | Yes (skip) |
| 2 | Signup | Name, email, password | No |
| 3 | Role Selection | Select "Coach" | No |
| 4 | Connect | Enter org invite code OR create new org | No |

**Minimum critical path: 3 steps** (signup + code entry)
**Time estimate: 1-2 minutes**

### Team Manager

| Step | Screen | Action Required | Can Skip? |
|------|--------|-----------------|-----------|
| 1 | Welcome Carousel | View 4 slides or skip | Yes (skip) |
| 2 | Signup | Name, email, password | No |
| 3 | Role Selection | Select "I Run a Team" | No |
| 4 | TM Setup Step 1 | Team name, sport, age group | No |
| 5 | TM Setup Step 2 | Season name, dates | No |
| 6 | TM Setup Step 3 | Share invite code with players | Yes (do later) |
| 7 | TM Setup Step 4 | View next-step nudges | Auto |

**Minimum critical path: 5 steps** (signup + team + season)
**Time estimate: 3-4 minutes**

### Parent

| Step | Screen | Action Required | Can Skip? |
|------|--------|-----------------|-----------|
| 1 | Welcome Carousel | View 4 slides or skip | Yes (skip) |
| 2 | Signup | Name, email, password + COPPA consent | No |
| 3 | Role Selection | Select "Parent" | No |
| 4 | Connect | Enter invite code OR skip | Yes (skip) |
| 5 | Registration Hub | Browse open seasons, register child | Deferrable |

**Minimum critical path: 3 steps** (signup + code entry)
**Time estimate: 1-2 minutes** (with invite code)

### Player

| Step | Screen | Action Required | Can Skip? |
|------|--------|-----------------|-----------|
| 1 | Welcome Carousel | View 4 slides or skip | Yes (skip) |
| 2 | Signup | Name, email, password | No |
| 3 | Role Selection | Select "Player" | No |
| 4 | Connect | Enter invite code OR skip | Yes |

**Minimum critical path: 3 steps** (signup + code entry)
**Time estimate: 1-2 minutes**

### Existing User (Claim Account)

| Step | Screen | Action Required | Can Skip? |
|------|--------|-----------------|-----------|
| 1 | Login or Signup | Authenticate | No |
| 2 | Claim Account | Confirm linked children | No |

**Minimum critical path: 2 steps**
**Time estimate: 30 seconds**

---

## 4. First-Session Activation Paths

The "aha moment" differs by role. Each path below shows the shortest route from first login to that role's core value realization.

### Admin: "I can see and manage my entire organization"

```
Login → Mission Control Dashboard (see stats) → Manage Tab (see attention cards)
         ↓ Aha: animated team/player/coach counts + financial overview
```

**Activation sequence:**
1. See Mission Control Hero with animated counts (teams, players, coaches, revenue)
2. See attention cards (pending registrations, unpaid balances)
3. Tap one attention card to resolve an item
4. **Aha moment**: "I have full visibility and control over my org from one screen"

**Key metric**: Admin taps at least 1 action from the Manage tab in session 1

---

### Coach: "I can run my entire game day from my phone"

```
Login → Coach Dashboard → Tap "Game Day" tab → Game Prep Wizard → Lineup Builder
         ↓ Aha: see roster, mark attendance, build lineup, start tracking
```

**Activation sequence:**
1. See Coach Dashboard with next-game hero card
2. Open Game Prep Wizard (review event, check RSVPs, mark attendance)
3. Open Lineup Builder (drag players to court positions)
4. **Aha moment**: "I can prepare and run a game entirely from my phone"

**Alternative first-session aha** (no upcoming game):
1. View roster with player cards
2. Run first player evaluation (swipe-through 9-skill rating)
3. Award a shoutout to a player
4. **Aha moment**: "I can track and develop my players digitally"

**Key metric**: Coach completes at least 1 game prep OR 1 evaluation in session 1

---

### Parent: "I can see everything about my child's season in one place"

```
Login → Parent Dashboard → See child card + next event → RSVP → View payments
         ↓ Aha: schedule, RSVP, payments, evaluations all in one app
```

**Activation sequence:**
1. See Family Hero Card with child's name and team
2. See next event with RSVP button (+XP reward)
3. Tap RSVP (instant, per-child, with haptic feedback)
4. See momentum row (record, balance, level)
5. **Aha moment**: "Everything I need for my child's season is right here"

**Key metric**: Parent RSVPs to at least 1 event in session 1

---

### Player: "I have my own stats, level, and achievements like a video game"

```
Login → Player Dashboard → See identity hero (level, XP, streak) → View Player Card → Check Achievements
         ↓ Aha: I have a trading card, levels, and badges to earn
```

**Activation sequence:**
1. See Player Identity Hero (name, level, XP bar, streak pill)
2. Tap "My Card" to see FIFA-style trading card with OVR rating
3. See daily quest card (first quest: check in = +2 XP)
4. View Trophy Case (locked badges with "how to earn" descriptions)
5. **Aha moment**: "This is like a video game for my sport"

**Key metric**: Player views their card AND completes 1 daily quest in session 1

---

### Team Manager: "I can set up and manage my team in minutes"

```
Login → TM Setup Wizard → Create team + season → Get invite code → Share with parents
         ↓ Aha: team created, code ready to share, dashboard populated
```

**Activation sequence:**
1. Complete 4-step setup wizard (team name, season, invite code)
2. Share invite code with first parent
3. See TM Dashboard with quick actions (schedule, attendance, payments)
4. **Aha moment**: "My team is set up and I can manage everything from here"

**Key metric**: TM completes setup wizard AND shares invite code in session 1

---

## 5. Recommended Onboarding Cards/Screens

### 5A. Pre-Auth Welcome Carousel (Existing - 4 slides)

Currently implemented in `/(auth)/welcome.tsx`. Recommended refinements:

| Slide | Current | Recommended Enhancement |
|-------|---------|------------------------|
| 1 | Meet Lynx mascot | Add: "Your team's digital home" tagline |
| 2 | Built for Players, Parents, Coaches | Add: role-specific value prop bullets |
| 3 | Earn Badges | Add: sample badge grid preview |
| 4 | Ready to Earn | Keep: "Get Started" CTA |

---

### 5B. Role-Specific First-Session Onboarding Cards

These cards should appear on the home dashboard during the first session, guiding users to their aha moment. They dismiss permanently after completion.

#### Coach First-Session Cards

| Card # | Title | Description | CTA | Dismisses When |
|--------|-------|-------------|-----|----------------|
| 1 | "Meet Your Roster" | Your team is ready. Tap to see your players. | "View Roster" → `players.tsx` | Roster screen opened |
| 2 | "Run Your First Eval" | Rate your players on 9 skills in under 5 minutes. | "Start Evaluation" → `player-evaluations.tsx` | 1 evaluation completed |
| 3 | "Prep for Game Day" | Set your lineup and track stats live. | "Game Prep" → `game-prep-wizard.tsx` | 1 game prep completed |
| 4 | "Recognize a Player" | Give a shoutout or award a badge. | "Give Shoutout" → `GiveShoutoutModal` | 1 shoutout or award given |
| 5 | "Invite Parents" | Share your team code so parents can join. | "Get Code" → `invite-parents.tsx` | Code copied or shared |

#### Parent First-Session Cards

| Card # | Title | Description | CTA | Dismisses When |
|--------|-------|-------------|-----|----------------|
| 1 | "RSVP to Next Event" | Let the coach know you're coming. Earn +5 XP! | "RSVP Now" → inline RSVP | 1 RSVP submitted |
| 2 | "Check the Schedule" | See all upcoming games and practices. | "View Schedule" → `parent-schedule.tsx` | Schedule opened |
| 3 | "View Your Payments" | See what's due and pay right from the app. | "View Payments" → `family-payments.tsx` | Payments screen opened |
| 4 | "Meet the Team" | See your child's teammates and coaches. | "Team Hub" → `parent-team-hub.tsx` | Team hub opened |

#### Player First-Session Cards

| Card # | Title | Description | CTA | Dismisses When |
|--------|-------|-------------|-----|----------------|
| 1 | "Check Out Your Card" | You have a player trading card. See your OVR! | "My Card" → `player-card.tsx` | Card viewed |
| 2 | "Complete Your First Quest" | Check in daily to earn XP and level up. | "View Quests" → `quests.tsx` | 1 quest completed |
| 3 | "See What You Can Earn" | Browse 100+ badges. Some are legendary. | "Trophy Case" → `achievements.tsx` | Achievements opened |
| 4 | "Give a Shoutout" | Recognize a teammate for being awesome. | "Give Props" → `GiveShoutoutModal` | 1 shoutout given |
| 5 | "Check the Leaderboard" | See where you rank on your team this week. | "Leaderboard" → `engagement-leaderboard.tsx` | Leaderboard opened |

#### Admin First-Session Cards

| Card # | Title | Description | CTA | Dismisses When |
|--------|-------|-------------|-----|----------------|
| 1 | "Set Up Your Season" | Create your first season to get started. | "Season Wizard" → `season-setup-wizard.tsx` | 1 season created |
| 2 | "Add Your Teams" | Build your team structure. | "Manage Teams" → `admin-teams.tsx` | 1 team created |
| 3 | "Invite Your Coaches" | Generate invite codes and bring coaches onboard. | "Coach Directory" → `coach-directory.tsx` | 1 invite sent |
| 4 | "Open Registration" | Let parents register their players. | "Registration" → `registration-hub.tsx` | Registration opened |

#### Team Manager First-Session Cards

| Card # | Title | Description | CTA | Dismisses When |
|--------|-------|-------------|-----|----------------|
| 1 | "Add Your First Practice" | Set up your practice schedule. | "Schedule" → `coach-schedule.tsx` | 1 event created |
| 2 | "Share Your Team Code" | Invite parents and players to join. | "Get Code" → invite modal | Code shared |
| 3 | "Set Up Payments" | Track team fees and collect payments. | "Payments" → `payments.tsx` | Payments screen opened |

---

### 5C. Contextual Empty States (Already Partially Implemented)

These screens appear when a section has no data yet, guiding the user to populate it.

| Screen | Empty State Message | CTA |
|--------|-------------------|-----|
| Roster (coach) | "No players yet. Invite parents to register." | "Invite Parents" |
| Schedule (any) | "No events scheduled. Create your first event." | "Create Event" |
| Evaluations (coach) | "No evaluations yet. Rate your players." | "Start Evaluating" |
| Achievements (player) | "Your trophy case is empty. Start earning!" | "View Available Badges" |
| Payments (parent) | "All caught up! No payments due." | -- (celebration state) |
| Chat (any) | "No messages yet. Start a conversation." | "New Message" |
| Leaderboard (player) | "No rankings yet. Play a game to get started." | -- (informational) |
| My Kids (parent) | "No children linked. Register for a season." | "Browse Seasons" |
| TM Dashboard (tm) | "Let's set up your team!" | "Set Up My Team" |

---

### 5D. Progressive Disclosure Checklist

A persistent but collapsible "Getting Started" checklist on the home dashboard that tracks completion of key activation steps. Disappears after all items are done.

#### Coach Checklist
- [ ] View your roster
- [ ] Complete 1 player evaluation
- [ ] Create a practice event
- [ ] Give your first shoutout
- [ ] Share your team invite code

#### Parent Checklist
- [ ] RSVP to an event
- [ ] View the schedule
- [ ] Check your payments
- [ ] Visit the team hub

#### Player Checklist
- [ ] View your player card
- [ ] Complete a daily quest
- [ ] Browse the trophy case
- [ ] Give a teammate a shoutout
- [ ] Check the leaderboard

#### Admin Checklist
- [ ] Create a season
- [ ] Add a team
- [ ] Invite a coach
- [ ] Open registration

#### Team Manager Checklist
- [ ] Create a practice event
- [ ] Share your invite code
- [ ] Review your roster

---

### 5E. Celebration Moments (First-Time Triggers)

These celebration modals should fire once per user to reinforce key moments.

| Trigger | Celebration | XP Bonus |
|---------|-------------|----------|
| First login | "Welcome to VolleyBrain!" + mascot animation | +10 XP |
| First RSVP (parent) | "Thanks for letting us know!" + confetti | +5 XP |
| First evaluation (coach) | "Your first player rated!" + badge unlock | +20 XP |
| First shoutout given | "Way to be a great teammate!" + animation | +10 XP |
| First quest completed (player) | "Quest complete!" + XP popup | Quest XP |
| First badge earned | Achievement celebration modal (existing) | Badge XP |
| First game prepped (coach) | "Game day ready!" + checklist complete | +15 XP |
| Invite code shared | "Growing the team!" + referral badge | +10 XP |
| First payment made (parent) | "You're all set!" + checkmark | +15 XP |
| Streak reaches 3 days | Streak fire animation (existing) | +5 XP |

---

### 5F. Recommended Onboarding Screen Flow (New)

A guided tour that overlays the actual app screens on first visit. Uses a spotlight/tooltip pattern.

#### Coach Tour (5 stops)
1. **Dashboard**: "This is your home base. You'll see your team's status here."
2. **Game Day tab**: "Tap here on game day for live stat tracking."
3. **Chat tab**: "Message your team and parents here."
4. **Drawer (More)**: "Swipe to access evaluations, challenges, and more."
5. **Action Grid**: "Quick actions to manage your team."

#### Parent Tour (4 stops)
1. **Dashboard**: "See your family's schedule, payments, and updates at a glance."
2. **Event Card**: "RSVP right from the home screen. Tap Yes to confirm."
3. **Schedule tab**: "Your full family calendar with all teams."
4. **Drawer (More)**: "Access payments, waivers, team hub, and settings."

#### Player Tour (4 stops)
1. **Identity Hero**: "This is you! Level up by playing, completing quests, and earning badges."
2. **Quest Card**: "Complete daily quests to earn XP."
3. **Leaderboard Preview**: "See where you rank against teammates."
4. **Trophy Case link**: "Browse 100+ badges you can earn."

---

## Appendix: Entry Points & Deep Links

| Entry Method | Destination | Roles |
|---|---|---|
| Cold download (no context) | Welcome → Signup → Registration Hub | All |
| Invite code (text/verbal) | Signup Step 3 or Redeem Code | All |
| Deep link with season ID | `/register/{seasonId}` | Parent |
| Existing web user (orphan records) | `/claim-account` | Parent |
| Pending approval | `/(auth)/pending-approval` (polls every 30s) | All |
| Push notification | Context-specific screen (chat, schedule, game, etc.) | All |
| Role switch (multi-role user) | Dashboard re-renders for selected role | Multi-role |

---

## Appendix: Engagement System Quick Reference

| Mechanic | Player | Coach | Parent | Admin | TM |
|---|:---:|:---:|:---:|:---:|:---:|
| XP earning | Yes | Yes | Yes | Yes | Yes |
| Levels (1-30) | Yes | Yes | Yes | Yes | Yes |
| Tiers (7) | Yes | Yes | Yes | Yes | Yes |
| Achievements | Player-specific | Coach-specific | Parent-specific | Admin-specific | TM-specific |
| Season Rank | Yes | -- | -- | -- | -- |
| Weekly Leaderboard | Yes | View | -- | -- | -- |
| Daily/Weekly Quests | Yes | -- | -- | -- | -- |
| Challenges | Participate | Create | Verify | -- | -- |
| Streaks | Yes | View | View | -- | -- |
| Shoutouts (give) | Yes | Yes | Yes | Yes | Yes |
| Shoutouts (receive) | Yes | Yes | Yes | Yes | Yes |
| Coach Awards | Receive | Award | -- | -- | -- |

---

*End of report. Generated from full codebase analysis of VolleyBrain Mobile (Expo/React Native).*
