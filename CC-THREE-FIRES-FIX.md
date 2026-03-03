# LYNX — Three Fires Fix
## For Claude Code Execution

**Project:** volleybrain-mobile3 (React Native / Expo)
**Backend:** Supabase (project: uqpjvbiuokwpldjvxiby)
**Reference:** `MOBILE-APP-AUDIT.md` in project root (the audit that found these issues)

---

## CONTEXT

The `MOBILE-APP-AUDIT.md` identified three categories of broken/stubbed functionality across the mobile app. This spec fixes all three in one pass. Every fix in this spec connects existing screens to existing buttons — we are NOT building new features, we are WIRING what already exists.

---

## RULES (READ FIRST — APPLY TO ALL PHASES)

1. **Read SCHEMA_REFERENCE.csv FIRST** before writing or modifying ANY Supabase query. Verify every table name and column name against it. If a table or column doesn't exist, STOP and flag it — do NOT guess.

2. **Read the existing code before changing it.** Before modifying any file, read the ENTIRE file first. Understand what's built and working. Do NOT break existing functionality.

3. **This mobile app shares a Supabase backend with the web admin portal at `C:\Users\fuent\Downloads\volleybrain-admin\`.** When verifying query patterns, read the web app's source files as the source of truth — specifically `src/pages/` for query patterns.

4. **Surgical changes ONLY.** Every fix in this spec is a routing/wiring change — replacing `Alert.alert("Coming Soon")` with `router.push('/existing-screen')`. Do NOT rewrite components, redesign layouts, or add new features. If a button said "Coming Soon" and the target screen exists, wire it. If the target screen genuinely doesn't exist, leave the stub and note it.

5. **After each phase, run `npx tsc --noEmit`** and report zero new errors.

6. **Commit AND push after each phase.** Format: `git add -A && git commit -m "Three Fires Phase [X]: [description]" && git push`

7. **Test all four roles after each phase.** Admin, Coach, Parent, Player must still boot and render correctly.

8. **No console.log without `__DEV__` gating.**

9. **Read MOBILE-APP-AUDIT.md** in the project root before starting. Sections 5 and 6 have the exact file paths, line numbers, and broken references you need to fix.

---

## PHASE 1: COACH-ROSTER ROUTE FIX (13 broken references)

**Problem:** 13 components navigate to `/(tabs)/coach-roster` but that route doesn't exist. No file `app/(tabs)/coach-roster.tsx` exists.

**Fix:** Create `app/(tabs)/coach-roster.tsx` as a hidden tab that re-exports the existing `players.tsx` screen content.

### Step 1A: Read these files first
- `app/(tabs)/players.tsx` — understand what it renders and how
- `app/(tabs)/_layout.tsx` — understand how hidden tabs are registered (look at how `coach-schedule`, `coach-chat`, `coach-team-hub`, `coach-my-stuff` are set up with `href: null`)

### Step 1B: Create `app/(tabs)/coach-roster.tsx`
- This should be a hidden tab (like the other coach- prefixed tabs)
- It should render the same content as `players.tsx` — either re-export the component or import and render the same screen
- Make sure it receives any necessary props/context

### Step 1C: Register the tab in `app/(tabs)/_layout.tsx`
- Add the `coach-roster` tab with `href: null` (hidden, not in bottom nav)
- Place it near the other coach tabs
- Match the pattern of existing hidden tabs exactly

### Step 1D: Verify all 13 references now work
Read each of these files and verify `/(tabs)/coach-roster` will resolve:

1. `components/coach-scroll/DevelopmentHint.tsx` line ~67
2. `components/coach-scroll/ActivityFeed.tsx` lines ~126, ~137
3. `components/coach-scroll/ActionItems.tsx` line ~66
4. `components/coach-scroll/TopPerformers.tsx` line ~41
5. `components/coach-scroll/RosterAlerts.tsx` line ~118
6. `components/coach-scroll/TeamHealthCard.tsx` line ~188
7. `components/coach-scroll/SeasonLeaderboardCard.tsx` line ~246
8. `components/coach-scroll/QuickActions.tsx` lines ~22, ~25
9. `components/coach-scroll/GamePlanCard.tsx` lines ~47, ~48, ~53

### Step 1E: Fix the other broken routes while here

**`/team-hub` — 2 references in legacy dashboards:**
- `components/CoachDashboard.tsx` ~line 1131 — change `router.push('/team-hub' as any)` to `router.push('/(tabs)/coach-team-hub')`
- `components/ParentDashboard.tsx` ~line 1811 — change `router.push('/team-hub' as any)` to `router.push('/(tabs)/parent-team-hub')`

**Missing `/(tabs)/` prefix — 3 references:**
- `app/my-kids.tsx` ~line 368 — change `router.push('/chats' as any)` to `router.push('/(tabs)/chats')`
- `app/my-kids.tsx` ~line 360 — change `router.push('/schedule' as any)` to `router.push('/(tabs)/schedule')`
- `components/AdminDashboard.tsx` ~line 1258 — change `router.push('/players')` to `router.push('/(tabs)/players')`

**Verification:**
- Coach home: tap every section that previously went to coach-roster — all should now navigate to the roster/players screen
- Parent home: no changes expected
- Player home: no changes expected
- Admin home: no changes expected
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Three Fires Phase 1: Create coach-roster tab + fix 18 broken nav references" && git push`

---

## PHASE 2: ADMIN HOME — WIRE ALL STUBS TO EXISTING SCREENS

**Problem:** The admin home (`AdminHomeScroll.tsx`) has ~18 tap targets that all show `Alert.alert("Coming Soon")`. The screens they SHOULD navigate to already exist in the app.

**IMPORTANT:** Read `AdminHomeScroll.tsx` and ALL admin-scroll components first. For each stub, find the `Alert.alert` call and replace it with the correct `router.push()`.

### Step 2A: Read all admin-scroll component files
- `components/AdminHomeScroll.tsx`
- `components/admin-scroll/SmartQueueCard.tsx`
- `components/admin-scroll/QuickActionsGrid.tsx`
- `components/admin-scroll/PaymentSnapshot.tsx`
- `components/admin-scroll/CoachSection.tsx`
- `components/admin-scroll/UpcomingEvents.tsx`
- `components/admin-scroll/TeamHealthTiles.tsx`

### Step 2B: Wire the Smart Queue action buttons

The Smart Queue cards show urgency-ordered items (pending registrations, overdue payments, unsigned waivers, missing schedules). Each card has action buttons that are currently stubs.

Map each queue card TYPE to the correct navigation target:
- **Registration queue items** (pending regs, approve/deny) → `router.push('/registration-hub')`
- **Payment queue items** (overdue, send reminders) → `router.push('/(tabs)/payments')`
- **Waiver queue items** (unsigned waivers) → `router.push('/registration-hub')` (waivers are managed there)
- **Schedule queue items** (no practice set, missing events) → `router.push('/(tabs)/admin-schedule')`
- **Jersey/size queue items** → `router.push('/(tabs)/jersey-management')`

Read the `SmartQueueCard.tsx` component to understand the card structure. Replace every `Alert.alert("Coming Soon", ...)` with the appropriate `router.push()` based on the queue item type. If the card type is passed as a prop, use a switch or mapping object.

### Step 2C: Wire the Quick Actions Grid (6 tiles)

Read `QuickActionsGrid.tsx` to find the 6 action tiles. Map each to its target:

| Action | Navigate To |
|--------|------------|
| Create Event | `router.push('/(tabs)/admin-schedule')` |
| Quick Schedule | `router.push('/(tabs)/admin-schedule')` |
| Send Reminder | `router.push('/blast-composer')` |
| Blast All | `router.push('/blast-composer')` |
| Add Player | `router.push('/registration-hub')` |
| Season Report | `router.push('/season-reports')` |

NOTE: Read the actual component to verify the exact action labels — they may differ slightly from the audit. Match by intent, not exact string.

### Step 2D: Wire the Payment Snapshot buttons

Read `PaymentSnapshot.tsx`:
- "Send All Reminders" → `router.push('/blast-composer')` (blast composer can send payment reminders)
- "View Details" → `router.push('/(tabs)/payments')`

### Step 2E: Wire the Upcoming Events buttons

Read `UpcomingEvents.tsx`:
- "View Calendar" → `router.push('/(tabs)/admin-schedule')`
- "Create Event" → `router.push('/(tabs)/admin-schedule')` (the schedule screen has event creation built in)

### Step 2F: Wire the Coach Section

Read `CoachSection.tsx`:
- "Assign Task" → `router.push('/blast-composer')` (closest existing screen for sending a coach a message/task — not perfect but functional)

### Step 2G: Wire Team Health Tiles

Read `TeamHealthTiles.tsx`:
- Each team tile should be tappable → `router.push('/team-roster?teamId=${tile.teamId}')` OR `router.push('/(tabs)/admin-teams')` depending on what makes more sense. Read the component to see if team ID is available.

### Step 2H: Wire remaining AdminHomeScroll stubs

Read `AdminHomeScroll.tsx` for:
- Search bar → For now, keep as stub but change the alert message to: `Alert.alert("Search", "Universal search is coming in the next update. For now, use the Manage tab to find what you need.")` — this is honest and redirects them.
- "Start Setup" (season) → `router.push('/season-settings')`
- "View more" (queue) → `router.push('/registration-hub')` (since most queue items are registration-related)

### Step 2I: Verify the import

Make sure `useRouter` from `expo-router` is imported in every file you modify. Many of these admin-scroll components may not have router imported yet since they were only using Alert.

**Verification:**
- Admin home: tap EVERY button — each should navigate to a real screen (no more "Coming Soon" alerts except Search)
- Coach home: unchanged
- Parent home: unchanged
- Player home: unchanged
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Three Fires Phase 2: Wire all admin home stubs to existing screens" && git push`

---

## PHASE 3: PLAYER HOME — WIRE DEAD SECTIONS

**Problem:** The player home (`PlayerHomeScroll.tsx`) has 4 sections that are stubs or no-ops: Chat Peek, Quick Props, Photo Strip taps, and OVR badge tap.

### Step 3A: Read player-scroll components
- `components/player-scroll/ChatPeek.tsx`
- `components/player-scroll/QuickPropsRow.tsx`
- `components/player-scroll/PhotoStrip.tsx`
- `components/player-scroll/HeroIdentityCard.tsx`
- `components/player-scroll/ActiveChallengeCard.tsx`
- `components/PlayerHomeScroll.tsx`

### Step 3B: Wire Chat Peek

Read `ChatPeek.tsx`. Currently shows "Chat coming soon" with no onPress.

- Find the player's team chat channel. Read how `usePlayerHomeData` works — does it already fetch team info? If so, use the team ID to construct the chat route.
- Read `app/chat/[id].tsx` to understand what params it expects.
- Read `lib/chat-utils.ts` to understand how chat channel IDs work.
- If the player has a team with a chat channel: make the ChatPeek row tappable → `router.push('/chat/${channelId}')`
- If no chat channel exists yet: show "No team chat yet" (not "Coming Soon")
- If the data hook doesn't fetch chat info, add a simple query to get the team's chat channel ID. Verify the table/column against SCHEMA_REFERENCE.csv.

### Step 3C: Wire Quick Props Row

Read `QuickPropsRow.tsx`. Currently shows "Coming Soon" alert.

- Read `components/GiveShoutoutModal.tsx` — this modal already exists and is complete.
- Check if `GiveShoutoutModal` is already imported in `PlayerHomeScroll.tsx` or if it needs to be added.
- Replace the Alert.alert with opening the GiveShoutoutModal.
- The modal needs to know which team/player context to operate in. Read how the coach version triggers it for reference.
- If the modal requires tables that don't exist in SCHEMA_REFERENCE.csv, note this and instead navigate to the team wall: `router.push('/team-wall?teamId=${teamId}')` — this gives the player a social outlet even if shoutouts aren't fully wired.

### Step 3D: Wire Photo Strip taps

Read `PhotoStrip.tsx`. Photos render but taps do nothing.

- Read `components/PhotoViewer.tsx` — this exists.
- Make each photo thumbnail tappable → open `PhotoViewer` or `ImagePreviewModal` with the photo URL.
- Read how `ImagePreviewModal` or `PhotoViewer` is triggered elsewhere in the app (e.g., team-gallery, team-wall) and match that pattern.

### Step 3E: Wire OVR badge tap

Read `HeroIdentityCard.tsx`. OVR badge shows "Full profile coming soon!" alert.

- The player's stats screen exists: `app/my-stats.tsx`
- Replace the alert with: `router.push('/my-stats')`
- This gives the player a natural place to see their full stat breakdown when tapping their OVR score.

### Step 3F: Handle Active Challenge Card

Read `ActiveChallengeCard.tsx`. Currently always returns null because challenge tables don't exist.

- Check SCHEMA_REFERENCE.csv for `coach_challenges` and `challenge_participants` tables.
- If the tables DON'T exist: leave the component as-is (returning null is correct behavior). Do NOT create tables.
- If the tables DO exist but are empty: the component should already handle empty state. Verify it does.

**Verification:**
- Player home: Chat Peek tappable (navigates to chat or shows "No team chat"), Quick Props opens shoutout modal or team wall, Photo thumbnails open photo viewer, OVR badge goes to my-stats
- Coach home: unchanged
- Parent home: unchanged
- Admin home: unchanged (Phase 2 changes still working)
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Three Fires Phase 3: Wire player home dead sections (chat, props, photos, OVR)" && git push`

---

## PHASE 4: VERIFICATION + PATH PREFIX CLEANUP

**Problem:** The audit found 3 navigation calls with incorrect path prefixes that may cause silent failures on some devices.

### Step 4A: Verify and fix path prefixes

These were identified in the audit but may overlap with Phase 1 fixes. Verify each one is fixed:

1. `app/my-kids.tsx` ~line 368 — should be `/(tabs)/chats` not `/chats`
2. `app/my-kids.tsx` ~line 360 — should be `/(tabs)/schedule` not `/schedule`
3. `components/AdminDashboard.tsx` ~line 1258 — should be `/(tabs)/players` not `/players`

### Step 4B: Scan for any OTHER broken navigation paths

Run this scan and review results:
```bash
grep -rn "router\.push\|router\.replace" --include="*.tsx" --include="*.ts" components/ app/ | grep -v node_modules | grep -v "/(tabs)/" | grep -v "/chat/" | grep -v "/register/" | grep -v "/(auth)/"
```

Any `router.push('/something')` that doesn't start with `/(tabs)/`, `/chat/`, `/register/`, or `/(auth)/` AND doesn't match a root-level route file in `app/` is potentially broken. Cross-reference against the route files listed in `MOBILE-APP-AUDIT.md` Section 2.

Fix any newly discovered broken paths.

### Step 4C: Full smoke test

Boot the app and verify:
- **Admin:** Home loads, all buttons navigate (not "Coming Soon"), manage tab works, drawer works
- **Coach:** Home loads, roster/lineup/leaderboard buttons navigate to coach-roster tab, schedule works, chat works
- **Parent:** Home loads, all cards navigate, schedule works, payments work
- **Player:** Home loads, chat peek works, photo strip works, OVR goes to stats, RSVP works
- **Role switching:** Switch between all roles — each home renders correctly

### Step 4D: Report

List:
1. Every file you modified (with what changed)
2. Every stub that REMAINS (things you couldn't wire because the target genuinely doesn't exist)
3. Any new issues discovered during the scan
4. TSC result

**Commit:** `git add -A && git commit -m "Three Fires Phase 4: Path prefix cleanup + full verification" && git push`

---

## EXECUTION ORDER

```
Phase 1: Coach-roster route fix (13 broken refs + 5 path fixes)
Phase 2: Admin home — wire all stubs to existing screens
Phase 3: Player home — wire dead sections
Phase 4: Verification + path prefix scan + smoke test
```

Execute all phases autonomously. Do not stop between phases. Commit after each phase.

---

*Reference: MOBILE-APP-AUDIT.md Sections 5 and 6 for exact file paths, line numbers, and broken references.*
