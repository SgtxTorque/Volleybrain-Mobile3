# CLAUDE-UX-NAVIGATION-MAP.md
## Lynx Mobile — Navigation Architecture Audit
### Audit Date: 2026-03-11

---

## Provider Hierarchy

```
GestureHandlerRootView
  AuthProvider              (lib/auth.tsx)
    ThemeProvider            (lib/theme.tsx)
      SportProvider          (lib/sport.tsx)
        SeasonProvider       (lib/season.tsx)
          PermissionsProvider (lib/permissions-context.tsx)
            ParentScrollProvider
              DrawerProvider
                RootLayoutNav + GestureDrawer
```

**File:** `app/_layout.tsx:194-211`

---

## Auth Flow (Pre-Dashboard)

| Condition | Route | File |
|-----------|-------|------|
| No session | `/(auth)/welcome` | `app/(auth)/welcome.tsx` |
| Pending approval | `/(auth)/pending-approval` | `app/(auth)/pending-approval.tsx` |
| Orphan records | `/claim-account` | `app/claim-account.tsx` |
| Needs onboarding | Determined by `determineOnboardingPath()` | `lib/onboarding-router.ts` |
| Normal session | `/(tabs)` | `app/(tabs)/index.tsx` |

**Evidence:** `app/_layout.tsx:34-77`

---

## Tab Navigation

### Visible Tabs (4 slots, role-conditional)

| Slot | Admin | Coach/Player | Parent-only | File |
|------|-------|-------------|-------------|------|
| 1 | Home | Home | Home | `app/(tabs)/index.tsx` |
| 2 | Manage | Game Day | Schedule | `manage.tsx` / `gameday.tsx` / `parent-schedule.tsx` |
| 3 | Chats | Chats | Chats | `app/(tabs)/chats.tsx` |
| 4 | More (drawer) | More (drawer) | More (drawer) | `menu-placeholder.tsx` |

**Evidence:** `app/(tabs)/_layout.tsx:226-330`

### Hidden Tabs (25 routes, `href: null`)

| Route | Purpose | Reachable Via |
|-------|---------|---------------|
| `connect` | Team Wall | Drawer: Quick Access |
| `me` | Settings (generic) | **UNCLEAR — no drawer link found** |
| `parent-chat` | Parent chat list | Drawer? |
| `parent-team-hub` | Parent team hub | Drawer |
| `parent-my-stuff` | Parent settings | Drawer |
| `coach-schedule` | Coach schedule + event creation | Drawer |
| `coach-chat` | Coach chat list | Drawer |
| `coach-team-hub` | Coach team hub | Drawer |
| `coach-my-stuff` | Coach settings | Drawer |
| `admin-schedule` | Admin schedule | Drawer |
| `admin-chat` | Admin chat (re-exports coach-chat) | Drawer |
| `admin-teams` | Admin team management | Drawer |
| `admin-my-stuff` | Admin settings | Drawer |
| `schedule` | Generic schedule | Drawer: Quick Access |
| `messages` | Announcements/blasts | Drawer: Quick Access |
| `coach-roster` | Coach roster (re-exports players) | Drawer |
| `players` | Player directory | Drawer |
| `teams` | Teams directory | **UNCLEAR — no drawer link found** |
| `coaches` | Coach directory | **UNCLEAR — no drawer link found** |
| `payments` | Payment management | Drawer: Admin Tools |
| `reports-tab` | Reports viewer | Drawer: Admin Tools |
| `settings` | App settings | Drawer: Settings |
| `my-teams` | User's teams | Drawer: Coaching / Player |
| `jersey-management` | Jersey admin | Drawer: Admin Tools |

**Evidence:** `app/(tabs)/_layout.tsx:289-313`

---

## Gesture Drawer Sections

### Section Architecture

| # | Section | Role Gate | Items | Default State |
|---|---------|-----------|-------|---------------|
| 1 | Quick Access | None | 5 | Open |
| 2 | Admin Tools | `admin` | 17 | Open |
| 3 | Game Day | `admin_coach` | 6 | Closed |
| 4 | Coaching Tools | `admin_coach` | 10 | Closed |
| 5 | My Family | `parent` | 8 | Open |
| 6 | My Stuff | `player` | 9 | Open |
| 7 | League & Community | None | 5 | Closed |
| 8 | Settings & Privacy | None | 6 | Closed |
| 9 | Help & Support | None | 3 | Closed |

**Evidence:** `components/GestureDrawer.tsx:71-232`

### Drawer Header Elements

1. **Profile header** — avatar, name, organization
2. **Role pills** — tappable role switcher (`handleRoleSwitch`, line 275)
3. **Season selector** — dropdown with status badges
4. **Context selector** — horizontal scroll: children (parent), teams (coach), teams (player)

**Evidence:** `components/GestureDrawer.tsx:602-844`

---

## Notification Deep Links

| Notification Type | Route | Params | Evidence |
|-------------------|-------|--------|----------|
| `chat` | `/chat/{channelId}` or `/(tabs)/chats` | channelId | `_layout.tsx:91` |
| `schedule` | `/(tabs)/schedule` | None | `_layout.tsx:94` |
| `payment` | `/(tabs)/payments` | None | `_layout.tsx:97` |
| `blast` | `/(tabs)/messages` | None | `_layout.tsx:100` |
| `registration` | `/registration-hub` | None | `_layout.tsx:103` |
| `game` | `/game-prep` | **MISSING eventId** | `_layout.tsx:106` |
| `challenge_*` | `/challenge-cta?challengeId=X` | challengeId | `_layout.tsx:114-118` |
| default | `/(tabs)` | None | `_layout.tsx:121` |

---

## Full Route Inventory

### Auth Routes (5)
```
/(auth)/welcome
/(auth)/login
/(auth)/signup
/(auth)/redeem-code
/(auth)/pending-approval
```

### Stack Routes — Challenges (8)
```
/achievements
/challenges
/challenge-cta?challengeId=X
/challenge-detail?challengeId=X
/challenge-library
/coach-challenge-dashboard
/create-challenge?templateId=X
/challenge-celebration?challengeId=X&playerId=Y
```

### Stack Routes — Game Day (7)
```
/game-day-command?eventId=X&teamId=Y
/game-prep?eventId=X&teamId=Y
/game-prep-wizard?eventId=X
/game-results?eventId=X
/game-recap?eventId=X
/lineup-builder?eventId=X&teamId=Y
/attendance?eventId=X&teamId=Y
```

### Stack Routes — Coach/Admin Tools (16)
```
/coach-availability
/coach-background-checks
/coach-directory
/coach-profile?coachId=X
/evaluation-session?teamId=X
/player-evaluations?teamId=X&playerId=Y
/player-goals
/admin-search
/bulk-event-create
/org-directory
/org-settings
/payment-reminders
/registration-hub
/season-archives
/season-settings
/season-setup-wizard
```

### Stack Routes — Family/Parent (7)
```
/child-detail?childId=X
/family-gallery
/family-payments
/my-kids
/my-stats?playerId=X
/my-waivers
/invite-friends
```

### Stack Routes — Teams/Roster (5)
```
/team-gallery?teamId=X
/team-management
/team-roster?teamId=X
/team-wall?teamId=X
/roster?teamId=X
```

### Stack Routes — Other (14)
```
/blast-composer
/blast-history
/player-card?playerId=X
/player-evaluation?playerId=X&teamId=Y
/season-progress
/standings
/profile
/notification
/notification-preferences
/web-features?featureName=X
/data-rights
/help
/privacy-policy
/terms-of-service
```

### Dynamic Routes (2)
```
/chat/[id]
/register/[seasonId]
```

### Onboarding Routes (4)
```
/claim-account
/complete-profile?playerId=X&seasonId=Y
/registration-start
/parent-registration-hub
```

**Total: 122+ routes**

---

## Critical Navigation Findings

### Duplicate Navigation Paths

| Destination | Paths | Risk |
|-------------|-------|------|
| Standings | Drawer (parent + player + community) | Same screen from 3+ entry points |
| Achievements | Drawer (parent + player + community) | Same screen from 3+ entry points |
| Blast Composer | Drawer (admin tools + coaching) | Accessible from 2 sections |
| Schedule | `/(tabs)/schedule` + `/(tabs)/coach-schedule` + `/(tabs)/admin-schedule` + `/(tabs)/parent-schedule` | 4 schedule screens |
| Roster | `/(tabs)/players` + `/(tabs)/coach-roster` + `/roster` + `/team-roster` | 4 roster screens |

### Unreachable/Orphan Routes

| Route | Issue | Evidence |
|-------|-------|----------|
| `/(tabs)/me` | Hidden tab with no drawer link | Not in MENU_SECTIONS |
| `/(tabs)/coaches` | Hidden tab with no drawer link | Not in MENU_SECTIONS |
| `/(tabs)/teams` | Hidden tab with no drawer link | Not in MENU_SECTIONS |
| `/registration-start` | Exists but no navigation TO it | No `router.push` found |
| `/notification` | Route exists, navigated to from bell icon, but purpose unclear | ParentHomeScroll:345,419 |
| `/report-viewer` | Exists but no navigation found | Not in MENU_SECTIONS |

### Naming Inconsistencies

| Pattern | Examples |
|---------|----------|
| Role-prefixed tabs | `coach-chat`, `parent-chat`, `admin-chat` vs generic `chats` |
| Hyphenated vs camelCase | `game-prep` vs `gameday` |
| Route vs tab duplication | `/team-management` (stack) vs `/(tabs)/admin-teams` (tab) — same purpose |
| `/game-recap` vs `/game-results` | Two routes for post-game stats |
