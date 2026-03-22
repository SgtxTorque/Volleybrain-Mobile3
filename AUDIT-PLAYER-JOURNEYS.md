# LYNX MOBILE — PLAYER JOURNEY & TASK-PATH AUDIT
## Audit Date: 2026-03-12
## Role: Player

---

## How To Read This Document

Each task below shows every way a Player user can reach a destination or complete an action. Paths are listed from most natural/common to most obscure. Each step shows the screen, the action, the code file and line number, and the destination. Flags indicate friction, dead ends, wrong destinations, and missing paths.

Cross-reference screen names with AUDIT-GLOSSARY.md for detailed information about each screen.

---

## Navigation Entry Points Available to Player

### Tab Bar

| Tab | Visible? | Route | Screen File | Notes |
|-----|----------|-------|-------------|-------|
| 1 — Home | Yes | `/(tabs)` | `index.tsx` → `DashboardRouter.tsx` → `PlayerHomeScroll` | Role resolved at `DashboardRouter.tsx:144`. Dark PLAYER_THEME (#0D1B3E) applied. |
| 2b — Game Day | Yes (if not admin, not parent-only) | `/(tabs)/gameday` | `gameday.tsx` | Visible when `!showManageTab && !isParentOnly` (`_layout.tsx:244`). Pure player sees this. |
| 3 — Chat | Yes | `/(tabs)/chats` | `chats.tsx` | Generic chat list for all roles. |
| 4 — More | Yes | — | `menu-placeholder.tsx` | Opens GestureDrawer (`_layout.tsx:324-326`). Not a real screen. |

**Note on Tab 2b:** A pure player (no admin or coach roles) sees the Game Day tab. This is the same `gameday.tsx` screen coaches see — it includes coach-only tooling (Add Event, Attendance, Lineup, Game Prep, Recap) that is gated behind `isCoachOrAdmin` checks within the screen. Players see a subset: hero card (next event), this week's events, season progress, standings, and game results.

### Drawer Sections Visible to Player

A player user sees these sections when opening the GestureDrawer (`components/GestureDrawer.tsx`):

| Section | Role Gate | Items → Routes |
|---------|-----------|----------------|
| **Quick Access** | All roles | Home → `/(tabs)`, Schedule → `/(tabs)/schedule`, Chats → `/(tabs)/chats`, Announcements → `/(tabs)/messages`, Team Wall → `/(tabs)/connect` |
| **My Stuff** | `player` only | My Teams → `/(tabs)/my-teams`, My Stats → `/my-stats`, My Evaluations → `/my-stats?scrollToEvals=true`, My Player Card → `/player-card`, Challenges → `/challenges`, Achievements → `/achievements`, Season Progress → `/season-progress`, Standings → `/standings`, Schedule → `/(tabs)/schedule` |
| **League & Community** | All roles | Team Wall → `/(tabs)/connect`, Standings → `/standings`, Achievements → `/achievements`, Coach Directory → `/coach-directory`, Find Organizations → `/org-directory` |
| **Settings & Privacy** | All roles | My Profile → `/profile`, Settings → `/(tabs)/settings`, Notifications → `/notification-preferences`, Season History → `/season-archives`, Privacy Policy → `/privacy-policy`, Terms of Service → `/terms-of-service` |
| **Help & Support** | All roles | Help Center → `/help`, Web Features → `/web-features`, Data Rights → `/data-rights` |

**Key issues with drawer for players:**
1. **Quick Access → Schedule** routes to `/(tabs)/schedule` (line 81), which is a hidden tab containing the generic schedule screen (`schedule.tsx`). This screen has coach/admin event creation features gated by `isCoachOrAdmin`, but the multi-view layout (list/week/month) is available to all. Meanwhile, the **My Stuff → Schedule** item routes to the SAME `/(tabs)/schedule`. Duplicate drawer entries pointing to the same screen.
2. **Quick Access → Announcements** routes to `/(tabs)/messages` (line 83), which is an admin/coach broadcast tool for composing and viewing sent messages. Players land on a screen with a message creation wizard they likely cannot use. No read-only announcement inbox exists.
3. **My Stuff → My Evaluations** routes to `/my-stats?scrollToEvals=true` (line 184). The destination is the same screen as "My Stats" but with a query param. It is unclear whether `my-stats.tsx` actually reads and acts on the `scrollToEvals` param — requires runtime verification.
4. **League & Community → Achievements** and **My Stuff → Achievements** both route to `/achievements`. Duplicate paths to the same destination across two drawer sections.
5. **League & Community → Standings** and **My Stuff → Standings** both route to `/standings`. Same duplication issue.

### Home Dashboard Cards/Actions (PlayerHomeScroll)

The player home dashboard is built from multiple sub-components rendered in `components/PlayerHomeScroll.tsx`. Each can generate navigation actions:

| Card/Widget | Component | Action | Destination | Code Reference | Conditional? |
|-------------|-----------|--------|-------------|----------------|--------------|
| Hero Identity Card (OVR badge) | `HeroIdentityCard` | Tap OVR badge | `/my-stats` | `HeroIdentityCard.tsx:123` | Always visible |
| MY TEAM card | `PlayerHomeScroll` | Tap team card | `/roster?teamId={id}` | `PlayerHomeScroll.tsx:318` | If `data.primaryTeam` exists |
| Photo strip | `PhotoStrip` | Tap photo | `/team-gallery?teamId={id}` | `PhotoStrip.tsx:23` | If `photos.length > 0` |
| Chat peek | `ChatPeek` | Tap chat row | `/chat/{channelId}` or `/(tabs)/chats` | `ChatPeek.tsx:75,77` | Always visible (fallback to chats list) |
| Active challenge card | `ActiveChallengeCard` | Tap "View All" | `/challenges` | `ActiveChallengeCard.tsx:53` | If `available && challenges.length > 0` |
| Active challenge card | `ActiveChallengeCard` | Tap challenge | `/challenge-cta?challengeId={id}` | `ActiveChallengeCard.tsx:78` | If `available && challenges.length > 0` |
| Evaluation card | `EvaluationCard` | Tap card | `/my-stats` | `EvaluationCard.tsx:102` | If recent evaluation exists (within 7 days) |
| Leaderboard link | `PlayerHomeScroll` | Tap "See where you rank" | `/standings` | `PlayerHomeScroll.tsx:381` | Always visible |
| Trophy case widget | `TrophyCaseWidget` | Tap "View All" or badge | `/achievements` | `TrophyCaseWidget.tsx:76,91` | If `playerId` exists |
| "View Trophy Case" link | `PlayerHomeScroll` | Tap link | `/achievements` | `PlayerHomeScroll.tsx:397` | Always visible |

**Additional non-navigating interactive elements:**
- **Streak Banner** (`StreakBanner`): Display-only, no navigation. Visible if `attendanceStreak >= 2`.
- **The Drop** (`TheDrop`): Display-only news feed items. No navigation.
- **Next Up Card** (`NextUpCard`): RSVP buttons (yes/no) call `data.sendRsvp` callback. No navigation to another screen.
- **Quick Props Row** (`QuickPropsRow`): "Give Shoutout" opens `GiveShoutoutModal` in-place. No navigation.
- **Last Game Stats** (`LastGameStats`): Display-only stat line. No navigation.
- **Closing Mascot** (`ClosingMascot`): Display-only. No navigation.
- **Team Pulse** (`TeamPulse`): Read-only activity feed. No navigation.

**Modals triggered from PlayerHomeScroll (not navigation):**
- `LevelUpCelebrationModal` — auto-fires when player levels up (AsyncStorage comparison).
- `StreakMilestoneCelebrationModal` — auto-fires on streak milestone crossing.
- `ChallengeArrivalModal` — auto-fires when unseen active challenge detected. Accept → `optInToChallenge()`. Dismiss → AsyncStorage mark.
- `GiveShoutoutModal` — triggered from QuickPropsRow.

### Notification Deep Links (from `app/_layout.tsx`, lines 89-125)

| Notification Type | Destination | Params Passed | Code Reference |
|-------------------|-------------|---------------|----------------|
| `chat` | `/chat/{channelId}` or `/(tabs)/chats` | channelId (if present) | `_layout.tsx:90-91` |
| `schedule` | `/(tabs)/schedule` | — | `_layout.tsx:93-94` |
| `payment` | `/(tabs)/payments` | — | `_layout.tsx:96-97` |
| `blast` | `/(tabs)/messages` | — | `_layout.tsx:99-100` |
| `registration` | `/registration-hub` | — | `_layout.tsx:102-103` |
| `game` / `game_reminder` | `/game-prep?eventId={eid}` or `/game-prep` | eventId (if present) | `_layout.tsx:106-109` |
| `challenge_*` | `/challenge-cta?challengeId={id}` or `/challenges` | challengeId (if present) | `_layout.tsx:114-121` |
| Default | `/(tabs)` | — | `_layout.tsx:123-124` |

**Issues with notification deep links for players:**
1. **`schedule` notification** → `/(tabs)/schedule` — lands on the generic schedule, not a player-specific view. Functional but not optimized for the player experience.
2. **`payment` notification** → `/(tabs)/payments` — lands player on the admin payment management screen. Players have no reason to access payment admin. Should route to a player-relevant destination or be suppressed for this role.
3. **`blast` notification** → `/(tabs)/messages` — lands player on admin/coach announcement composer. No read-only announcement inbox for players.
4. **`registration` notification** → `/registration-hub` — lands player on ADMIN registration hub (approve/deny screen). Players cannot manage registrations.
5. **`game` / `game_reminder`** → `/game-prep` — lands player on coach game prep screen. Players have no use for game prep tools. Should route to schedule or game day.
6. **`challenge_*` notifications** → `/challenge-cta?challengeId={id}` or `/challenges` — ✅ Correct. These are player-appropriate destinations.
7. **`chat` notification** → ✅ Correct. Routes to the specific channel or chat list.

---

## Tasks

### TASK 1: View Home Dashboard
**What the user is trying to do:** See their personal player dashboard with stats, streaks, challenges, and upcoming events.
**Expected destination:** `PlayerHomeScroll` component (rendered inside `app/(tabs)/index.tsx`)

#### Path A: App launch → Home — 0 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | App opens | Root layout | `app/_layout.tsx` | 71 | Auth check → `/(tabs)` redirect |
| 2 | Lands on Home tab | `DashboardRouter` | `components/DashboardRouter.tsx` | 144 | `isPlayer` → `'player'` type |
| 3 | Children loaded | `DashboardRouter` | `components/DashboardRouter.tsx` | 195-232 | If 1 child → auto-select. If multiple → ChildPickerScreen. |
| 4 | Sees dashboard | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Dark theme (#0D1B3E), hero card, streaks, stats, challenges |

**Status:** ✅ Correct
**Notes:** Auto-resolves to player dashboard. If user also has parent/coach/admin roles, `DashboardRouter.tsx` priority is: admin > coach > parent > player. A multi-role user with player + parent would see `ParentHomeScroll`, not `PlayerHomeScroll`. Must use RoleSelector or drawer role switcher to reach player dashboard. If the player has multiple linked children (e.g., a parent viewing as player), a `ChildPickerScreen` is shown first (`DashboardRouter.tsx:206-215`).

#### Path B: Tab bar → Home tab — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap Home tab | Tab bar | `app/(tabs)/_layout.tsx` | 210-222 | Routes to `/(tabs)` → `index.tsx` |
| 3 | Sees dashboard | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Same flow as Path A |

**Status:** ✅ Correct

#### Path C: Drawer → Home — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer overlay |
| 3 | Tap "Home" under Quick Access | GestureDrawer | `components/GestureDrawer.tsx` | 80 | Routes to `/(tabs)` |
| 4 | Sees dashboard | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Same flow |

**Status:** ✅ Correct

---

### TASK 2: View My Stats
**What the user is trying to do:** See their personal season stats, game-by-game history, skill ratings, and stat rankings.
**Expected destination:** `app/my-stats.tsx` — "MY STATS" screen

#### Path A: Home → Hero card OVR badge — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | Tap OVR badge on hero card | `HeroIdentityCard` | `components/player-scroll/HeroIdentityCard.tsx` | 123 | `router.push('/my-stats')` |
| 3 | Lands on My Stats | `my-stats.tsx` | `app/my-stats.tsx` | — | ESPN-style stat dashboard with season summary, personal bests, game history |

**Status:** ✅ Correct
**Notes:** Most natural path. OVR badge is prominent on hero card.

#### Path B: Drawer → My Stuff → My Stats — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Expand "My Stuff" if collapsed | GestureDrawer | `components/GestureDrawer.tsx` | 176-191 | `defaultOpen: true`, so likely already open |
| 4 | Tap "My Stats" | GestureDrawer | `components/GestureDrawer.tsx` | 183 | Routes to `/my-stats` |
| 5 | Lands on My Stats | `my-stats.tsx` | `app/my-stats.tsx` | — | Same screen |

**Status:** ✅ Correct

#### Path C: Home → Evaluation card — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | Tap evaluation card | `EvaluationCard` | `components/player-scroll/EvaluationCard.tsx` | 102 | `router.push('/my-stats')` |
| 3 | Lands on My Stats | `my-stats.tsx` | `app/my-stats.tsx` | — | Same screen |

**Status:** ⚠️ Friction — Conditional
**Issue:** The evaluation card only appears if a recent evaluation exists (queried from `player_evaluations` within 7 days — `EvaluationCard.tsx:53-58`). If no recent evaluation, this path does not exist. Also, user taps expecting to see evaluations but lands on the general stats page — no auto-scroll to evaluation section.

---

### TASK 3: View My Player Card / Trading Card
**What the user is trying to do:** See their FIFA-style trading card with stats, OVR, position, and avatar.
**Expected destination:** `app/player-card.tsx`

#### Path A: Drawer → My Stuff → My Player Card — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Expand "My Stuff" if collapsed | GestureDrawer | `components/GestureDrawer.tsx` | 176-191 | `defaultOpen: true` |
| 4 | Tap "My Player Card" | GestureDrawer | `components/GestureDrawer.tsx` | 185 | Routes to `/player-card` |
| 5 | Lands on Player Card | `player-card.tsx` | `app/player-card.tsx` | — | Full-screen trading card with OVR, XP, level, stats bars |

**Status:** ✅ Correct
**Notes:** The player card auto-resolves the player via `team_players` → `parent_account_id` → `player_guardians` fallback chain (`player-card.tsx`). No `playerId` param needed for the player's own card.

#### Path B: My Stats → Player Card link — 2 taps from stats
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On My Stats screen | `my-stats.tsx` | `app/my-stats.tsx` | — | Entry point |
| 2 | Tap player card link | `my-stats.tsx` | `app/my-stats.tsx` | 223 | `router.push('/player-card?playerId=' + player.id)` |
| 3 | Lands on Player Card | `player-card.tsx` | `app/player-card.tsx` | — | With specific playerId param |

**Status:** ✅ Correct

#### Missing Paths:
- **No direct path from home dashboard to player card.** The hero identity card on the home dashboard shows the player's name, team, position, jersey, OVR, and level — but tapping the OVR badge goes to `/my-stats`, not `/player-card`. There is no tap target on the home dashboard that goes directly to the trading card. The only home-accessible path is OVR → my-stats → player-card (3 taps total from home). For a feature central to the player identity ("my trading card"), this is buried.
- **No deep link from notifications** to player card.

---

### TASK 4: View / Join Challenges
**What the user is trying to do:** See active challenges, join them, and track progress.
**Expected destination:** `app/challenges.tsx` (list) and `app/challenge-cta.tsx` (individual challenge)

#### Path A: Home → Active Challenge card — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | Tap challenge card | `ActiveChallengeCard` | `components/player-scroll/ActiveChallengeCard.tsx` | 78 | `router.push('/challenge-cta?challengeId={id}')` |
| 3 | Lands on Challenge CTA | `challenge-cta.tsx` | `app/challenge-cta.tsx` | — | Full-screen immersive CTA for join/progress |

**Status:** ⚠️ Friction — Conditional
**Issue:** The `ActiveChallengeCard` only renders if `available && challenges.length > 0` (`ActiveChallengeCard.tsx:46`). The `available` flag comes from `usePlayerHomeData.ts:462-472` which checks `coach_challenges` table for active challenges on the player's primary team. If no active challenges exist, this entire path is invisible.

#### Path B: Home → Active Challenge "View All" → Challenge list — 2 taps (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | Tap "View All" on challenge section | `ActiveChallengeCard` | `components/player-scroll/ActiveChallengeCard.tsx` | 53 | `router.push('/challenges')` |
| 3 | Lands on Challenges list | `challenges.tsx` | `app/challenges.tsx` | — | Active/completed/expired tabs |

**Status:** ⚠️ Friction — Conditional (same condition as Path A)

#### Path C: Drawer → My Stuff → Challenges — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Expand "My Stuff" if collapsed | GestureDrawer | `components/GestureDrawer.tsx` | 176-191 | Likely already open |
| 4 | Tap "Challenges" | GestureDrawer | `components/GestureDrawer.tsx` | 186 | Routes to `/challenges` |
| 5 | Lands on Challenges list | `challenges.tsx` | `app/challenges.tsx` | — | Active/completed/expired tabs |

**Status:** ✅ Correct
**Notes:** This is the guaranteed path regardless of whether active challenges exist. Always accessible.

#### Path D: Notification deep link → Challenge CTA — 0 taps (push notification)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Receive challenge notification | Push notification | `app/_layout.tsx` | 114-121 | `challenge_*` types |
| 2 | Tap notification | Deep link handler | `app/_layout.tsx` | 114-121 | Routes to `/challenge-cta?challengeId={id}` or `/challenges` |
| 3 | Lands on Challenge CTA or list | `challenge-cta.tsx` or `challenges.tsx` | — | — | Depends on whether challengeId is in payload |

**Status:** ✅ Correct

#### Path E: Challenge Arrival Modal (auto) — 0 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Player opens home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | 147-165 | Checks for unseen challenges via `fetchActiveChallenges` |
| 2 | Modal auto-appears | `ChallengeArrivalModal` | `components/PlayerHomeScroll.tsx` | 442-456 | Shows challenge details with Accept/Dismiss |
| 3 | Tap "Accept" | `ChallengeArrivalModal` | `components/PlayerHomeScroll.tsx` | 167-173 | Calls `optInToChallenge()`, refreshes data |

**Status:** ✅ Correct
**Notes:** Proactive engagement. Only fires once per challenge (AsyncStorage key `lynx_challenge_seen_{id}`). Does NOT navigate — opts in directly from the modal.

---

### TASK 5: View Achievements / Badges / Trophy Case
**What the user is trying to do:** See all earned badges, achievement progress, and trophy case.
**Expected destination:** `app/achievements.tsx`

#### Path A: Home → "View Trophy Case" link — 1 tap (scroll required)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | Scroll to bottom area | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | 395-403 | Below TrophyCaseWidget |
| 3 | Tap "View Trophy Case" | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | 397 | `router.push('/achievements')` |
| 4 | Lands on Achievements | `achievements.tsx` | `app/achievements.tsx` | — | Dark-mode trophy case with badges, challenges, progress, XP |

**Status:** ✅ Correct
**Notes:** Requires significant scroll to reach — the link is near the bottom of the home dashboard, after: hero card, MY TEAM, streak banner, the drop, photo strip, next up, chat peek, quick props, active challenge, evaluation card, team pulse, last game stats, leaderboard link, trophy case widget, and THEN the "View Trophy Case" link.

#### Path B: Home → TrophyCaseWidget "View All" — 1 tap (scroll required)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | Scroll to TrophyCaseWidget | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | 390-394 | Near bottom |
| 3 | Tap "View All" on widget | `TrophyCaseWidget` | `components/TrophyCaseWidget.tsx` | 76 | `router.push('/achievements')` |
| 4 | Lands on Achievements | `achievements.tsx` | `app/achievements.tsx` | — | Same screen |

**Status:** ✅ Correct

#### Path C: Drawer → My Stuff → Achievements — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Tap "Achievements" under My Stuff | GestureDrawer | `components/GestureDrawer.tsx` | 187 | Routes to `/achievements` |
| 4 | Lands on Achievements | `achievements.tsx` | `app/achievements.tsx` | — | Same screen |

**Status:** ✅ Correct

#### Path D: Drawer → League & Community → Achievements — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Expand "League & Community" | GestureDrawer | `components/GestureDrawer.tsx` | 194-205 | `defaultOpen: false`, requires expand |
| 4 | Tap "Achievements" | GestureDrawer | `components/GestureDrawer.tsx` | 202 | Routes to `/achievements` |
| 5 | Lands on Achievements | `achievements.tsx` | `app/achievements.tsx` | — | Same screen |

**Status:** ⚠️ Friction — Duplicate path
**Issue:** Same destination as Path C but in a different drawer section. Two drawer items ("My Stuff → Achievements" and "League & Community → Achievements") route to the same `/achievements` screen. Not broken, but redundant and potentially confusing.

---

### TASK 6: View Leaderboards / Standings
**What the user is trying to do:** See team standings and player stat leaderboards to understand where they rank.
**Expected destination:** `app/standings.tsx`

#### Path A: Home → "See where you rank" link — 1 tap (scroll required)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | Scroll past last game stats | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | 379-387 | Below LastGameStats section |
| 3 | Tap "See where you rank" | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | 381 | `router.push('/standings')` |
| 4 | Lands on Standings | `standings.tsx` | `app/standings.tsx` | — | Team standings + player leaderboards with self-highlight |

**Status:** ✅ Correct
**Notes:** Requires scroll past most of the dashboard to reach. The leaderboard auto-highlights the current player via `highlightPlayerId`.

#### Path B: Drawer → My Stuff → Standings — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Tap "Standings" under My Stuff | GestureDrawer | `components/GestureDrawer.tsx` | 189 | Routes to `/standings` |
| 4 | Lands on Standings | `standings.tsx` | `app/standings.tsx` | — | Same screen |

**Status:** ✅ Correct

#### Path C: Drawer → League & Community → Standings — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Expand "League & Community" | GestureDrawer | `components/GestureDrawer.tsx` | 194-205 | `defaultOpen: false` |
| 4 | Tap "Standings" | GestureDrawer | `components/GestureDrawer.tsx` | 201 | Routes to `/standings` |
| 5 | Lands on Standings | `standings.tsx` | `app/standings.tsx` | — | Same screen |

**Status:** ⚠️ Friction — Duplicate path (same as My Stuff → Standings)

#### Path D: Game Day tab → Standings card — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap Game Day tab | Tab bar | `app/(tabs)/_layout.tsx` | 241-254 | Routes to `/(tabs)/gameday` |
| 3 | Tap Standings card | `gameday.tsx` | `app/(tabs)/gameday.tsx` | 639 | `router.push('/standings')` |
| 4 | Lands on Standings | `standings.tsx` | `app/standings.tsx` | — | Same screen |

**Status:** ✅ Correct
**Notes:** The Game Day tab is visible to pure player users. Standings card is in the "Season Pulse" section.

---

### TASK 7: View Schedule
**What the user is trying to do:** See upcoming practices, games, and events.
**Expected destination:** `app/(tabs)/schedule.tsx` (generic schedule)

#### Path A: Drawer → Quick Access → Schedule — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Tap "Schedule" under Quick Access | GestureDrawer | `components/GestureDrawer.tsx` | 81 | Routes to `/(tabs)/schedule` |
| 4 | Lands on Schedule | `schedule.tsx` | `app/(tabs)/schedule.tsx` | — | Multi-view schedule with list/week/month views |

**Status:** ✅ Correct
**Notes:** The generic schedule (`schedule.tsx`) is role-aware: event creation FAB and bulk create are gated behind `isCoachOrAdmin`. Players see a read-only schedule with RSVP counts and event details. The schedule shows events for teams the player is on.

#### Path B: Drawer → My Stuff → Schedule — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Tap "Schedule" under My Stuff | GestureDrawer | `components/GestureDrawer.tsx` | 190 | Routes to `/(tabs)/schedule` |
| 4 | Lands on Schedule | `schedule.tsx` | `app/(tabs)/schedule.tsx` | — | Same screen |

**Status:** ⚠️ Friction — Duplicate path
**Issue:** Both "Quick Access → Schedule" and "My Stuff → Schedule" route to the exact same `/(tabs)/schedule`. Redundant.

#### Path C: Game Day tab → "Full Schedule" link — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap Game Day tab | Tab bar | `app/(tabs)/_layout.tsx` | 241-254 | Routes to `/(tabs)/gameday` |
| 3 | Tap "Full Schedule" or "See All" | `gameday.tsx` | `app/(tabs)/gameday.tsx` | 662 or 705 | `router.push('/(tabs)/schedule')` |
| 4 | Lands on Schedule | `schedule.tsx` | `app/(tabs)/schedule.tsx` | — | Same screen |

**Status:** ✅ Correct

#### Path D: Notification deep link → Schedule — 0 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Receive schedule notification | Push notification | `app/_layout.tsx` | 93-94 | `schedule` type |
| 2 | Tap notification | Deep link handler | `app/_layout.tsx` | 93-94 | Routes to `/(tabs)/schedule` |
| 3 | Lands on Schedule | `schedule.tsx` | `app/(tabs)/schedule.tsx` | — | Same generic schedule |

**Status:** ✅ Correct

#### Missing Paths:
- **No dedicated "Schedule" tab for players.** Parents get a `parent-schedule` tab (Tab 2c). Coaches get schedule via Game Day tab. Players see the Game Day tab (which shows upcoming events) but have no direct schedule tab. Must use drawer or Game Day links to reach the full schedule.

---

### TASK 8: RSVP to an Event
**What the user is trying to do:** Confirm or decline attendance for an upcoming practice or game.
**Expected destination:** In-place RSVP action (no separate screen)

#### Path A: Home → Next Up card → RSVP buttons — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | Scroll to Next Up card | `NextUpCard` | `components/player-scroll/NextUpCard.tsx` | — | Shows next event with RSVP buttons |
| 3 | Tap "I'm In" or "Can't Make It" | `NextUpCard` | `components/player-scroll/NextUpCard.tsx` | — | Calls `onRsvp` callback → `data.sendRsvp` |
| 4 | RSVP recorded | `usePlayerHomeData` | `hooks/usePlayerHomeData.ts` | 492-508 | Upserts to `event_rsvps` table |

**Status:** ✅ Correct
**Notes:** RSVP is handled in-place on the home dashboard — no navigation required. Only the NEXT event is shown. Cannot RSVP to events further in the future from the home screen. The `NextUpCard` shows event details (type, date, time, location, opponent) and renders an ambient fallback message if no upcoming event exists.

#### Path B: Game Day tab → Event → (no RSVP)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Game Day tab | Tab bar | `app/(tabs)/_layout.tsx` | 241-254 | Routes to gameday |
| 2 | View upcoming events | `gameday.tsx` | `app/(tabs)/gameday.tsx` | — | Shows this week's events |

**Status:** ⚠️ Friction
**Issue:** The Game Day tab shows upcoming events but does NOT provide RSVP buttons for players. RSVP is only available from the NextUpCard on the home dashboard, and only for the single next event. A player wanting to RSVP for an event that is not the very next one has no way to do so from the player experience.

#### Missing Paths:
- **No RSVP from full schedule screen.** The schedule screen (`schedule.tsx`) shows events with RSVP counts but does not provide player RSVP buttons — RSVP tracking there is coach-facing (aggregate counts).
- **No RSVP for events beyond the next one.** Only the immediately upcoming event gets RSVP buttons on the home dashboard.

---

### TASK 9: View My Evaluations
**What the user is trying to do:** See coach evaluations and skill ratings given to them.
**Expected destination:** `app/my-stats.tsx` (stats screen includes evaluations)

#### Path A: Drawer → My Stuff → My Evaluations — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Tap "My Evaluations" under My Stuff | GestureDrawer | `components/GestureDrawer.tsx` | 184 | Routes to `/my-stats?scrollToEvals=true` |
| 4 | Lands on My Stats | `my-stats.tsx` | `app/my-stats.tsx` | — | ESPN-style stat dashboard |

**Status:** ❌ Wrong destination behavior
**Issue:** The drawer item passes `?scrollToEvals=true` as a query param, but `my-stats.tsx` does NOT read or act on this param (confirmed: grep for `scrollToEvals` returns zero matches in `my-stats.tsx`). The player lands on the top of the stats page with no auto-scroll to the evaluations section. The user expects to see evaluations but sees season stats instead. They must manually scroll to find the evaluation section within the stats page.

#### Path B: Home → Evaluation card — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | Tap evaluation card | `EvaluationCard` | `components/player-scroll/EvaluationCard.tsx` | 102 | `router.push('/my-stats')` |
| 3 | Lands on My Stats | `my-stats.tsx` | `app/my-stats.tsx` | — | Same stats page, no scroll to eval |

**Status:** ⚠️ Friction — Conditional + naming mismatch
**Issue:** Only appears if evaluation exists within 7 days. Routes to stats page, not directly to evaluations. Evaluation card shows score preview but destination doesn't highlight evaluations.

#### Missing Paths:
- **No dedicated evaluations screen.** There is no standalone `my-evaluations.tsx` screen. Evaluations are embedded within `my-stats.tsx`. The drawer menu suggests they are a separate destination ("My Evaluations") but they are not.

---

### TASK 10: View My Teams
**What the user is trying to do:** See which teams they are on and explore team details.
**Expected destination:** `app/(tabs)/my-teams.tsx`

#### Path A: Home → MY TEAM card → Roster — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | Tap MY TEAM card | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | 318 | `router.push('/roster?teamId={id}')` |
| 3 | Lands on Roster | `roster.tsx` | `app/roster.tsx` | — | Carousel of player trading cards for the team |

**Status:** ⚠️ Friction — Different destination than expected
**Issue:** The MY TEAM card on the home dashboard routes to `/roster` (player trading card carousel), not to `/(tabs)/my-teams` (team hub with roster, stats, attendance, game prep). The roster screen is display-only with no outbound navigation — no way to explore team details, chat, gallery, or upcoming events from here.

#### Path B: Drawer → My Stuff → My Teams — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Tap "My Teams" under My Stuff | GestureDrawer | `components/GestureDrawer.tsx` | 182 | Routes to `/(tabs)/my-teams` |
| 4 | Lands on My Teams | `my-teams.tsx` | `app/(tabs)/my-teams.tsx` | — | Team hub selector with expandable cards |

**Status:** ✅ Correct
**Notes:** `my-teams.tsx` resolves the player's teams via `player_guardians` + `parent_account_id` + `parent_email` linkage to find team_players associations. The screen delegates to `TeamHubScreen` for the selected team, which provides roster, stats, attendance, game prep, gallery, and chat access.

#### Screen Name Confusion:
- Home dashboard has "MY TEAM" card → goes to `/roster` (trading card carousel)
- Drawer has "My Teams" → goes to `/(tabs)/my-teams` (full team hub)
- These are different destinations with different capabilities. A player who taps "MY TEAM" on home expects the same thing as "My Teams" in the drawer, but they get a read-only roster carousel instead of the full team hub.

---

### TASK 11: Access Team Hub / Team Wall
**What the user is trying to do:** See their team's social feed, roster, gallery, and upcoming events in one place.
**Expected destination:** `app/(tabs)/connect.tsx` (Team Wall / Team Hub)

#### Path A: Drawer → Quick Access → Team Wall — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Tap "Team Wall" under Quick Access | GestureDrawer | `components/GestureDrawer.tsx` | 84 | Routes to `/(tabs)/connect` |
| 4 | Lands on Team Hub | `connect.tsx` | `app/(tabs)/connect.tsx` | — | Team selector + TeamHubScreen |

**Status:** ✅ Correct
**Notes:** `connect.tsx` resolves teams for the player role using the same parent-child linkage path. Passes `role: 'player'` to TeamHubScreen. The TeamHubScreen includes: HeroBanner, TeamIdentityBar, TickerBanner, QuickActionPills (scroll-to-section), TeamWall (feedOnly), GalleryPreview, RosterSection, UpcomingSection. Chat pill navigates to `/(tabs)/chats` (`TeamHubScreen.tsx:188`).

#### Path B: Drawer → League & Community → Team Wall — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Expand "League & Community" | GestureDrawer | `components/GestureDrawer.tsx` | 194-205 | `defaultOpen: false` |
| 4 | Tap "Team Wall" | GestureDrawer | `components/GestureDrawer.tsx` | 200 | Routes to `/(tabs)/connect` |
| 5 | Lands on Team Hub | `connect.tsx` | `app/(tabs)/connect.tsx` | — | Same screen |

**Status:** ⚠️ Friction — Duplicate path (same as Quick Access → Team Wall)

#### Path C: Drawer → My Stuff → My Teams → Select team — 4 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Tap "My Teams" under My Stuff | GestureDrawer | `components/GestureDrawer.tsx` | 182 | Routes to `/(tabs)/my-teams` |
| 4 | Tap team card | `my-teams.tsx` | `app/(tabs)/my-teams.tsx` | — | Selects team, shows TeamHubScreen |
| 5 | Sees Team Hub | `TeamHubScreen` | `components/TeamHubScreen.tsx` | — | Same content as connect.tsx |

**Status:** ✅ Correct
**Notes:** Both `connect.tsx` and `my-teams.tsx` render `TeamHubScreen`. They are parallel implementations of the same pattern — `connect.tsx` is the Quick Access version, `my-teams.tsx` is the My Stuff version. Both resolve teams the same way and show the same hub content.

#### Missing Paths:
- **No direct home dashboard path to Team Hub.** The "MY TEAM" card goes to `/roster` (carousel), not to the team hub. Players must use the drawer to access the full team hub with social feed, gallery, and upcoming events.

---

### TASK 12: Open a Chat / Send a Message
**What the user is trying to do:** Chat with teammates, coaches, or team channels.
**Expected destination:** `app/(tabs)/chats.tsx` (chat list) or `app/chat/[id].tsx` (individual chat)

#### Path A: Tab bar → Chat — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap Chat tab | Tab bar | `app/(tabs)/_layout.tsx` | 273-287 | Routes to `/(tabs)/chats` with unread badge |
| 3 | Lands on Chats | `chats.tsx` | `app/(tabs)/chats.tsx` | — | Generic chat channel list |
| 4 | Tap a channel | `chats.tsx` | `app/(tabs)/chats.tsx` | 504 | `router.push('/chat/{id}')` |
| 5 | Lands on Chat | `chat/[id].tsx` | `app/chat/[id].tsx` | — | Individual chat thread |

**Status:** ✅ Correct
**Notes:** Players see the generic `chats.tsx` (Tab 3), not a player-specific chat screen. The generic chat supports DMs, group channels, typing indicators, and pinning. Players can create DMs and channels.

#### Path B: Home → Chat Peek — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | Tap chat peek row | `ChatPeek` | `components/player-scroll/ChatPeek.tsx` | 75 or 77 | If channelId → `/chat/{channelId}`, else `/(tabs)/chats` |
| 3 | Lands on Chat or Chats | `chat/[id].tsx` or `chats.tsx` | — | — | Depends on whether team channel was found |

**Status:** ✅ Correct
**Notes:** ChatPeek queries `chat_channels` for the team's channel (`ChatPeek.tsx:33-38`), then shows the latest message. If a channel exists, tapping goes directly to that chat thread. If not, falls back to the chats list.

#### Path C: Drawer → Quick Access → Chats — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Tap "Chats" under Quick Access | GestureDrawer | `components/GestureDrawer.tsx` | 82 | Routes to `/(tabs)/chats` |
| 4 | Lands on Chats | `chats.tsx` | `app/(tabs)/chats.tsx` | — | Same chat list |

**Status:** ✅ Correct

#### Path D: Team Hub → Chat pill — 3+ taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to Team Hub | `connect.tsx` or `my-teams.tsx` | — | — | Via drawer (2-3 taps to get here) |
| 2 | Tap "Chat" pill in QuickActionPills | `TeamHubScreen` | `components/TeamHubScreen.tsx` | 188 | `router.push('/(tabs)/chats')` |
| 3 | Lands on Chats | `chats.tsx` | `app/(tabs)/chats.tsx` | — | Generic chat list (not team-specific) |

**Status:** ⚠️ Friction
**Issue:** The Team Hub chat pill navigates to the generic chats list, not to the specific team channel. A player in the team hub context expects to land in their team's chat, not the full channel list.

#### Path E: Notification deep link → Chat — 0 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Receive chat notification | Push notification | `app/_layout.tsx` | 90-91 | `chat` type |
| 2 | Tap notification | Deep link handler | `app/_layout.tsx` | 90-91 | Routes to `/chat/{channelId}` or `/(tabs)/chats` |
| 3 | Lands on specific chat or list | — | — | — | Correct destination |

**Status:** ✅ Correct

---

### TASK 13: View Season Progress
**What the user is trying to do:** See a timeline of their season milestones, games played, badges earned, and overall season record.
**Expected destination:** `app/season-progress.tsx`

#### Path A: Drawer → My Stuff → Season Progress — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Tap "Season Progress" under My Stuff | GestureDrawer | `components/GestureDrawer.tsx` | 188 | Routes to `/season-progress` |
| 4 | Lands on Season Progress | `season-progress.tsx` | `app/season-progress.tsx` | — | Timeline of milestones with record summary |

**Status:** ✅ Correct
**Notes:** `season-progress.tsx` auto-resolves the player via `player_guardians` → `parent_account_id` chain. Shows W-L record, games played, badges earned, and a chronological timeline of season events. No outbound navigation — display-only screen (no `router.push` calls found).

#### Missing Paths:
- **Only reachable via drawer.** There is no home dashboard card, no Game Day tab link, and no other screen that links to season progress. Single entry point makes this feature fragile and easily overlooked by players.

---

### TASK 14: View Photos / Team Gallery
**What the user is trying to do:** Browse team photos and videos.
**Expected destination:** `app/team-gallery.tsx`

#### Path A: Home → Photo Strip — 1 tap (conditional)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | Tap photo in strip | `PhotoStrip` | `components/player-scroll/PhotoStrip.tsx` | 23 | `router.push('/team-gallery?teamId={id}')` |
| 3 | Lands on Team Gallery | `team-gallery.tsx` | `app/team-gallery.tsx` | — | 3-column grid with photos/videos, full-screen viewer |

**Status:** ⚠️ Friction — Conditional
**Issue:** The PhotoStrip only renders if `photos.length > 0` (`PhotoStrip.tsx:19`). Photos come from `team_posts` with `media_urls` (`usePlayerHomeData.ts:394-421`). If no team posts with media exist, the photo strip is invisible and there's no path from home to the gallery.

#### Path B: Team Hub → Gallery Preview — 3+ taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to Team Hub | `connect.tsx` or `my-teams.tsx` | — | — | Via drawer (2-3 taps) |
| 2 | Scroll to GalleryPreview section | `TeamHubScreen` | `components/TeamHubScreen.tsx` | — | Gallery preview within team hub |
| 3 | Tap gallery item | `TeamHubScreen` | `components/TeamHubScreen.tsx` | — | Routes to gallery or opens photo viewer |

**Status:** ✅ Correct (via team hub)

#### Missing Paths:
- **No dedicated drawer item for gallery.** The "My Stuff" section has no "Gallery" or "Photos" entry. The only guaranteed paths are through the team hub or the conditional photo strip on home.

---

### TASK 15: View Game Day / Upcoming Games
**What the user is trying to do:** See a game-day focused view with hero card, this week's events, and season progress.
**Expected destination:** `app/(tabs)/gameday.tsx`

#### Path A: Tab bar → Game Day — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap Game Day tab | Tab bar | `app/(tabs)/_layout.tsx` | 241-254 | Routes to `/(tabs)/gameday` |
| 3 | Lands on Game Day | `gameday.tsx` | `app/(tabs)/gameday.tsx` | — | Command center with hero card, events, standings, results |

**Status:** ✅ Correct
**Notes:** The Game Day tab is the player's Tab 2 (since players are not admin and not parent-only). The screen shows: next event hero card, this week's events, season pulse (standings + season archives), recent results, and coach tools section (hidden for players via `isCoachOrAdmin` gate at line 780). Players get a useful read-only game day view.

#### Path B: Drawer → Quick Access → Home → (no direct Game Day link)
**Status:** 🔇 Missing path
**Issue:** There is no drawer item that links directly to Game Day. The Game Day tab is only accessible from the tab bar. If a user navigates away and the tab bar is obscured, they must find the tab bar to return.

#### Missing Paths:
- **No home dashboard link to Game Day.** The player home dashboard shows the next event in `NextUpCard` but tapping it does not navigate to Game Day — it only offers RSVP buttons. No card or link bridges home → Game Day tab.

---

### TASK 16: View Game Results / Past Games
**What the user is trying to do:** See scores and stats from past games.
**Expected destination:** Various — `app/(tabs)/gameday.tsx` (recent results section) or `app/game-results.tsx` (detail)

#### Path A: Game Day tab → Recent results — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Tap Game Day tab | Tab bar | `app/(tabs)/_layout.tsx` | 241-254 | Routes to gameday |
| 2 | Scroll to "Recent Results" section | `gameday.tsx` | `app/(tabs)/gameday.tsx` | — | Shows recent game cards with W/L and scores |
| 3 | Tap a game result | `gameday.tsx` | `app/(tabs)/gameday.tsx` | 741 | `router.push('/game-results?eventId={id}')` |
| 4 | Lands on Game Results | `game-results.tsx` | `app/game-results.tsx` | — | Detailed game results screen |

**Status:** ✅ Correct

#### Path B: Home → Last Game Stats section (display only)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | Scroll to Last Game Stats | `LastGameStats` | `components/player-scroll/LastGameStats.tsx` | — | Shows kills, aces, digs, blocks, assists, points |

**Status:** ⚠️ Friction
**Issue:** The Last Game Stats section on the home dashboard is display-only — no `router.push` call, no tap action. Players can see their last game stat line but cannot tap through to the full game results. Dead end for exploration.

#### Path C: My Stats → Game history → Game results — 3+ taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Navigate to My Stats | `my-stats.tsx` | — | — | Via hero card OVR or drawer |
| 2 | Scroll to game-by-game history | `my-stats.tsx` | `app/my-stats.tsx` | — | List of past games with stats |
| 3 | Tap a game | `my-stats.tsx` | `app/my-stats.tsx` | 593 | `router.push('/game-results?eventId={eventId}')` |
| 4 | Lands on Game Results | `game-results.tsx` | `app/game-results.tsx` | — | Full game results |

**Status:** ✅ Correct

---

### TASK 17: Edit Profile
**What the user is trying to do:** Update their name, avatar, phone, emergency contact, or password.
**Expected destination:** `app/profile.tsx`

#### Path A: Drawer → Settings & Privacy → My Profile — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Expand "Settings & Privacy" | GestureDrawer | `components/GestureDrawer.tsx` | 207-221 | `defaultOpen: false`, requires expand |
| 4 | Tap "My Profile" | GestureDrawer | `components/GestureDrawer.tsx` | 214 | Routes to `/profile` |
| 5 | Lands on Profile | `profile.tsx` | `app/profile.tsx` | — | Avatar upload, name, phone, emergency contact, password, delete |

**Status:** ✅ Correct

#### Path B: Drawer header → Profile tap — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Tap profile avatar/name area in drawer header | GestureDrawer | `components/GestureDrawer.tsx` | 290 | `handleViewProfile()` → `router.push('/profile')` |
| 4 | Lands on Profile | `profile.tsx` | `app/profile.tsx` | — | Same screen |

**Status:** ✅ Correct
**Notes:** Fastest path — the drawer header shows the user's avatar and name, and tapping it navigates to profile.

#### Missing Paths:
- **No profile access from home dashboard.** The compact header shows the player's initials avatar but it is not tappable for profile navigation. The hero identity card shows name, team, position, jersey, OVR, and level but does not link to profile.

---

### TASK 18: Access Settings
**What the user is trying to do:** Change app theme, view role info, or sign out.
**Expected destination:** `app/(tabs)/settings.tsx`

#### Path A: Drawer → Settings & Privacy → Settings — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Expand "Settings & Privacy" | GestureDrawer | `components/GestureDrawer.tsx` | 207-221 | `defaultOpen: false`, requires expand |
| 4 | Tap "Settings" | GestureDrawer | `components/GestureDrawer.tsx` | 215 | Routes to `/(tabs)/settings` |
| 5 | Lands on Settings | `settings.tsx` | `app/(tabs)/settings.tsx` | — | Theme, roles, legal links, sign out |

**Status:** ✅ Correct
**Notes:** Settings screen includes appearance theme toggle (light/dark), role chips display, links to privacy policy (`settings.tsx:369`) and terms of service (`settings.tsx:376`), and sign out. Admin-only features (user management, organization info) are gated behind `isAdmin` check. Players see the basic settings subset.

---

### TASK 19: View Notifications / Notification Preferences
**What the user is trying to do:** Manage which push notifications they receive.
**Expected destination:** `app/notification-preferences.tsx`

#### Path A: Drawer → Settings & Privacy → Notifications — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Expand "Settings & Privacy" | GestureDrawer | `components/GestureDrawer.tsx` | 207-221 | `defaultOpen: false` |
| 4 | Tap "Notifications" | GestureDrawer | `components/GestureDrawer.tsx` | 216 | Routes to `/notification-preferences` |
| 5 | Lands on Notification Preferences | `notification-preferences.tsx` | `app/notification-preferences.tsx` | — | Toggle preferences for 6 notification types |

**Status:** ✅ Correct
**Notes:** Notification preferences screen allows toggling: chat, schedule, payments, announcements, game updates, volunteers. All notification types are shown regardless of role. Some may not be relevant to players (e.g., volunteers, payments).

#### Missing Paths:
- **No notification bell on player home.** The player home dashboard (`PlayerHomeScroll.tsx`) does NOT have a notification bell icon — unlike the parent home (`ParentHomeScroll.tsx:345,419`) which has two notification bell locations. Players have no home-accessible path to notifications or notification preferences.

---

### TASK 20: View Announcements / Blasts
**What the user is trying to do:** Read announcements or blasts sent by coaches/admins.
**Expected destination:** Read-only announcement inbox

#### Path A: Drawer → Quick Access → Announcements — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Tap "Announcements" under Quick Access | GestureDrawer | `components/GestureDrawer.tsx` | 83 | Routes to `/(tabs)/messages` |
| 4 | Lands on Messages | `messages.tsx` | `app/(tabs)/messages.tsx` | — | Sent messages history + 3-step compose wizard |

**Status:** ❌ Wrong destination
**Issue:** `/(tabs)/messages` is an admin/coach message COMPOSER screen (301 lines). It shows sent messages and a wizard for creating new messages (type → recipients → compose). This is NOT a read-only announcement inbox for players. Players land on a screen designed for coaches/admins to compose and send blasts. There is no read-only announcement inbox screen in the app. Players receive announcements via push notifications but have no in-app archive to review them.

#### Path B: Notification deep link → Announcements — 0 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Receive blast notification | Push notification | `app/_layout.tsx` | 99-100 | `blast` type |
| 2 | Tap notification | Deep link handler | `app/_layout.tsx` | 99-100 | Routes to `/(tabs)/messages` |
| 3 | Lands on Messages | `messages.tsx` | `app/(tabs)/messages.tsx` | — | Same coach/admin composer |

**Status:** ❌ Wrong destination (same issue as Path A)

---

### TASK 21: Give a Shoutout
**What the user is trying to do:** Send a compliment or recognition to a teammate.
**Expected destination:** In-place modal (no separate screen)

#### Path A: Home → Quick Props → Give Shoutout — 1 tap (scroll required)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | Scroll to Quick Props section | `QuickPropsRow` | `components/player-scroll/QuickPropsRow.tsx` | — | Row of action buttons |
| 3 | Tap "Give Shoutout" | `QuickPropsRow` | `components/player-scroll/QuickPropsRow.tsx` | — | Calls `onGiveShoutout` callback |
| 4 | Modal appears | `GiveShoutoutModal` | `components/GiveShoutoutModal.tsx` | — | Select teammate, category, message → submit |

**Status:** ✅ Correct
**Notes:** In-place modal, no navigation. The shoutout is tied to the player's primary team (`data.primaryTeam?.id`). After success, modal closes and data refreshes.

#### Missing Paths:
- **Only reachable from home dashboard.** There is no drawer item, no team hub option, and no other screen that offers shoutout functionality. If the player has scrolled past the Quick Props section, they must scroll back to find it.

---

### TASK 22: View Coach Directory
**What the user is trying to do:** Browse coaches in their league/organization.
**Expected destination:** `app/coach-directory.tsx`

#### Path A: Drawer → League & Community → Coach Directory — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Expand "League & Community" | GestureDrawer | `components/GestureDrawer.tsx` | 194-205 | `defaultOpen: false` |
| 4 | Tap "Coach Directory" | GestureDrawer | `components/GestureDrawer.tsx` | 203 | Routes to `/coach-directory` |
| 5 | Lands on Coach Directory | `coach-directory.tsx` | `app/coach-directory.tsx` | — | Coach list with search, detail modals, team assignments |

**Status:** ⚠️ Friction — Potentially wrong audience
**Issue:** `coach-directory.tsx` (616 lines) includes `AdminContextBar` and coach-to-team assignment functionality. It is designed as an admin tool with detailed coach management features (background checks, waivers, certifications, assign to teams). A player accessing this sees an admin-grade coach directory, not a simple "who are my coaches" view. The screen has no explicit role guard — any authenticated user can access it.

---

### TASK 23: Find Organizations
**What the user is trying to do:** Browse other volleyball organizations.
**Expected destination:** `app/org-directory.tsx`

#### Path A: Drawer → League & Community → Find Organizations — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Expand "League & Community" | GestureDrawer | `components/GestureDrawer.tsx` | 194-205 | `defaultOpen: false` |
| 4 | Tap "Find Organizations" | GestureDrawer | `components/GestureDrawer.tsx` | 204 | Routes to `/org-directory` |
| 5 | Lands on Org Directory | `org-directory.tsx` | `app/org-directory.tsx` | — | Browse orgs, search by name/city/state |

**Status:** ✅ Correct
**Notes:** Read-only directory. No role guards. Players can browse organizations and view details (logo, location, description, contact). No join or transfer functionality from this screen.

---

### TASK 24: XP / Level Up / Gamification
**What the user is trying to do:** Understand their XP, level, and how to level up.
**Expected destination:** Various — XP is surfaced across multiple locations

#### Path A: Home → Hero Identity Card (always visible)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | — | Entry point |
| 2 | View hero card | `HeroIdentityCard` | `components/player-scroll/HeroIdentityCard.tsx` | — | Shows OVR, level, XP progress bar, XP current/max |

**Status:** ✅ Correct — Display only
**Notes:** The hero card shows: OVR rating, level (LVL X), XP progress bar, and XP values. XP is computed in `usePlayerHomeData.ts:22-31` from season stats and badge count. Level = `Math.floor(xp / 1000) + 1`. Tapping OVR goes to `/my-stats` but does not show XP breakdown there.

#### Path B: Home → Compact header (after scroll)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home, scrolled down | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | 239-247 | Compact header appears after scrollY > 140 |
| 2 | View streak pill + level pill | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | 239-247 | Shows streak count + LVL number |

**Status:** ✅ Correct — Display only

#### Path C: Level-Up Celebration Modal (auto)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Player opens home after leveling up | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | 113-123 | AsyncStorage compares previous level to current |
| 2 | Modal auto-appears | `LevelUpCelebrationModal` | `components/LevelUpCelebrationModal.tsx` | — | Celebratory animation with new level |

**Status:** ✅ Correct
**Notes:** Fires once per level-up (AsyncStorage key `lynx_player_level_{playerId}`). The celebration is a one-time event per level transition.

#### Path D: Home → Closing Mascot (XP callback)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home, scrolled to bottom | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | 406-410 | After all content sections |
| 2 | View closing mascot | `ClosingMascot` | `components/player-scroll/ClosingMascot.tsx` | — | Shows XP to next level, current level, next event teaser |

**Status:** ✅ Correct — Display only

#### Missing Paths:
- **No dedicated XP breakdown screen.** There is no screen that explains how XP is calculated, what actions earn XP, or a detailed XP history. XP is visible on the hero card and closing mascot but the formula (game stats × weights + badge count × 50) is not exposed to the player.
- **No XP progress from My Stats.** The `/my-stats` screen (accessible from OVR badge) does not show XP or level information.

---

### TASK 25: View Streaks
**What the user is trying to do:** See their attendance streak and streak milestones.
**Expected destination:** In-place display on home dashboard

#### Path A: Home → Streak Banner — 0 taps (auto-visible if streak >= 2)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | 332 | Renders StreakBanner component |
| 2 | View streak banner | `StreakBanner` | `components/player-scroll/StreakBanner.tsx` | — | Shows streak count, tier badge, freeze indicator, progress to next tier |

**Status:** ✅ Correct — Display only
**Notes:** StreakBanner only renders if `streak >= 2` (`StreakBanner.tsx:41`). Shows: current streak number, tier name/icon, freeze indicator if used, progress bar to next tier, max tier message if reached. No navigation — display only.

#### Path B: Streak Milestone Celebration (auto)
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Player opens home after crossing milestone | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | 129-142 | AsyncStorage compares previous streak to current |
| 2 | Modal auto-appears | `StreakMilestoneCelebrationModal` | `components/StreakMilestoneCelebrationModal.tsx` | — | Tier-specific celebration with XP award |

**Status:** ✅ Correct
**Notes:** Fires once per milestone crossing. Awards XP via `awardStreakMilestoneXP()` (`streak-engine.ts`). AsyncStorage key `lynx_player_streak_{playerId}`.

#### Missing Paths:
- **No streak history.** There is no screen showing streak history over time or detailed attendance records.
- **No streak information outside home dashboard.** The streak is only visible on the home dashboard (banner + compact header pill). My Stats, Player Card, and Achievements do not show streak data.

---

### TASK 26: Invite Friends
**What the user is trying to do:** Share a registration link to invite friends to the organization.
**Expected destination:** `app/invite-friends.tsx`

#### Path A: Drawer → League & Community or Settings — 3 taps
The "Invite Friends" item does NOT appear in the player's "My Stuff" drawer section. It appears in the parent's "My Family" section (`GestureDrawer.tsx:171`), but the player section (`GestureDrawer.tsx:176-191`) does not include it.

**Status:** 🔇 Missing path
**Issue:** There is no drawer item in the player's "My Stuff" section for "Invite Friends". The screen (`invite-friends.tsx`) exists and has no role guard (accessible to all authenticated users), but there is no navigation path from the player's drawer to reach it. A player can technically reach it only by manually navigating (URL) or by switching to parent role if they have dual roles.

---

### TASK 27: View Help / Support
**What the user is trying to do:** Get help with the app, view FAQs, or contact support.
**Expected destination:** `app/help.tsx`

#### Path A: Drawer → Help & Support → Help Center — 3 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Expand "Help & Support" | GestureDrawer | `components/GestureDrawer.tsx` | 223-233 | `defaultOpen: false` |
| 4 | Tap "Help Center" | GestureDrawer | `components/GestureDrawer.tsx` | 229 | Routes to `/help` |
| 5 | Lands on Help | `help.tsx` | `app/help.tsx` | — | 6 collapsible FAQs + contact support email link |

**Status:** ✅ Correct

---

### TASK 28: Role Switching (Multi-Role Users)
**What the user is trying to do:** Switch between player role and other roles (parent, coach, etc.) if they have multiple.
**Expected destination:** Role switch action (no separate screen)

#### Path A: Home → RoleSelector pill — 1 tap
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | On player home | `PlayerHomeScroll` | `components/PlayerHomeScroll.tsx` | 280-285 | RoleSelector rendered in scroll |
| 2 | Tap role selector pill | `RoleSelector` | `components/RoleSelector.tsx` | — | Opens bottom sheet with role list |
| 3 | Tap desired role | `RoleSelector` | `components/RoleSelector.tsx` | 54-58 | Calls `setDevViewAs()` — triggers DashboardRouter re-render |

**Status:** ✅ Correct
**Notes:** RoleSelector is only visible if the user has > 1 role (`RoleSelector.tsx:28`). For pure player users, it is hidden. The bottom sheet shows all available roles with icons, colors, and checkmark on active. Switching is instant — no navigation. `setDevViewAs()` updates the permissions context which triggers `DashboardRouter.tsx` to re-evaluate and show the appropriate dashboard. The `RoleSelector` also appears in the compact header (`PlayerHomeScroll.tsx:249-251`) when scrolled.

#### Path B: Drawer → Role Switcher Pills — 2 taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | Starting anywhere | Any screen | — | — | — |
| 2 | Tap More tab (opens drawer) | GestureDrawer | `app/(tabs)/_layout.tsx` | 324-326 | Opens drawer |
| 3 | Tap role pill in drawer header | GestureDrawer | `components/GestureDrawer.tsx` | 256-277 | `handleRoleSwitch()` → `setDevViewAs()` + `router.push('/(tabs)')` |

**Status:** ✅ Correct
**Notes:** Drawer shows role pills filtered to the user's actual roles. Tapping a pill switches role, closes drawer, and navigates to home. 150ms delay on navigation to allow drawer close animation.

---

## Audit Summary

### Task Count: 28 tasks documented

### Status Breakdown
| Status | Count | Tasks |
|--------|-------|-------|
| ✅ Correct | 15 | 1, 2 (Paths A/B), 3 (Path A), 4 (Paths C/D/E), 5 (Paths A/B/C), 6, 7 (Paths A/C/D), 12 (Paths A/B/C/E), 15, 16 (Paths A/C), 17, 18, 19, 21, 23, 24, 25, 26 (screen exists), 27, 28 |
| ⚠️ Friction | 8 | 2 (Path C — conditional), 4 (Paths A/B — conditional), 5 (Path D — duplicate), 6 (Path C — duplicate), 7 (Path B — duplicate), 8 (Path B — no RSVP), 10 (Path A — wrong dest), 14 (Path A — conditional), 16 (Path B — display only), 22 |
| ❌ Wrong destination | 2 | 9 (scrollToEvals param ignored), 20 (announcement composer, not inbox) |
| 🔇 Missing path | 2 | 15 (no drawer link to Game Day), 26 (no invite friends in player drawer) |

### Critical Issues Found

1. **`scrollToEvals` param dead** (Task 9): The drawer "My Evaluations" passes `?scrollToEvals=true` to `/my-stats`, but `my-stats.tsx` never reads this param. No auto-scroll to evaluations occurs. The separate "My Evaluations" drawer entry is functionally identical to "My Stats".

2. **Announcements route to composer** (Task 20): Both the drawer "Announcements" item and the `blast` notification deep link route players to `/(tabs)/messages`, which is a coach/admin message composition screen. No read-only announcement inbox exists for players.

3. **Multiple notification deep links wrong for players** (Entry Points section): `payment` → admin payment screen, `registration` → admin registration hub, `game`/`game_reminder` → coach game prep, `blast` → coach message composer. Five of seven non-chat notification types route players to admin/coach screens.

4. **Player card buried** (Task 3): The player's trading card — a core identity feature — is only reachable via drawer (3 taps) or via My Stats → link (3+ taps from home). No direct home dashboard path exists.

5. **RSVP limited to one event** (Task 8): Players can only RSVP to the single next upcoming event from the home dashboard `NextUpCard`. No RSVP for future events, no RSVP from schedule or Game Day tab.

6. **MY TEAM card vs My Teams mismatch** (Task 10): Home "MY TEAM" card goes to `/roster` (display-only carousel), drawer "My Teams" goes to `/(tabs)/my-teams` (full team hub). Different destinations, same conceptual action.

7. **Invite Friends unreachable** (Task 26): The `invite-friends.tsx` screen exists and has no role guard, but there is no drawer item in the player's "My Stuff" section to reach it. Only parents have it in "My Family".

### Navigation Redundancies

| Destination | Duplicate Drawer Paths |
|-------------|----------------------|
| `/achievements` | My Stuff → Achievements + League & Community → Achievements |
| `/standings` | My Stuff → Standings + League & Community → Standings |
| `/(tabs)/schedule` | Quick Access → Schedule + My Stuff → Schedule |
| `/(tabs)/connect` | Quick Access → Team Wall + League & Community → Team Wall |

### Screens Reachable Only From One Entry Point

| Screen | Single Entry Point | Risk |
|--------|-------------------|------|
| `/season-progress` | Drawer → My Stuff only | Easily overlooked |
| `/team-gallery` | Home photo strip (conditional) or team hub | No guaranteed path |
| GiveShoutoutModal | Home Quick Props row only | Buried in scroll |

### Orphaned/Unreachable Screens for Players

- **`/(tabs)/payments`** — Routed to by `payment` notification but is admin screen. No intentional player path.
- **`/registration-hub`** — Routed to by `registration` notification but is admin screen. No intentional player path.
- **`/game-prep`** — Routed to by `game`/`game_reminder` notification but is coach screen. No intentional player path.
- **`/(tabs)/messages`** — Routed to by `blast` notification and drawer "Announcements" but is coach/admin composer. Wrong screen for player role.

