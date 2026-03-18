# CC-ENGAGEMENT-PHASE5-UI
# Lynx Player Engagement System — Phase 5: Engagement UI
# Status: READY FOR CC EXECUTION
# Depends on: All Phases 1-4 complete

---

## STANDING RULES

1. **Read these files first, in order:**
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
   - `SCHEMA_REFERENCE.csv` in repo root
   - `LYNX-REFERENCE-GUIDE.md` in repo root
   - `MASCOT-ASSET-MAP.md` in repo root
2. **Read the existing player scroll components to match design tokens exactly:**
   - `components/player-scroll/PlayerDailyQuests.tsx` (card patterns)
   - `components/player-scroll/PlayerWeeklyQuests.tsx` (progress bar patterns)
   - `components/player-scroll/PlayerIdentityHero.tsx` (dark navy hero patterns)
   - `components/player-scroll/PlayerLeaderboardPreview.tsx` (existing leaderboard component)
   - `components/player-scroll/PlayerContinueTraining.tsx` (entry point to Journey)
   - Any theme/constants file for `D_COLORS`, `PLAYER_THEME`, `D_RADII`, font families
3. **Do NOT modify any engine files (lib/*.ts) or database migrations.**
4. **Commit after each phase.** Commit message format: `[engagement-ui] Phase X: description`
5. **If something is unclear, STOP and report back.**
6. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Builds the remaining player-facing UI for the engagement system:
1. **LeaderboardScreen** — Full leaderboard with podium, tiers, weekly rankings
2. **PlayerTeamQuests** — Team quest cards on the home scroll
3. **NotificationInbox** — Screen/overlay showing mascot-illustrated notifications
4. **Notification badge** — Unread count indicator in header/tab bar
5. **PlayerContinueTraining update** — Show real Journey Path progress
6. **PlayerLeaderboardPreview update** — Wire to real leaderboard data

---

## PHASE 1: Investigation — Read before writing

Before writing any code, read and report:

1. **PlayerLeaderboardPreview.tsx** — What data does it currently show? How does it get data? What does each row look like? Is there an `onPress` that navigates to a full leaderboard screen?

2. **PlayerContinueTraining.tsx** — What does it currently display? Is it a static teaser or does it show any real data? What happens on tap?

3. **Does a LeaderboardScreen or full leaderboard view already exist?** Search for any screen with "leaderboard" in the name.

4. **Where does the notification bell / indicator currently live?** Is there a bell icon in the header or tab bar? Is there an existing notification screen?

5. **What's the header pattern for the Player Home scroll?** Is there a sticky header with icons? Where would a notification bell naturally fit?

6. **How does PlayerHomeScroll pass team data to child components?** Does it pass `teamId` or `primaryTeam` as props? How do existing components get team context?

7. **What icon library does the app use?** Ionicons? MaterialIcons? Expo vector icons? Lucide? Check imports across a few components.

**Report findings, then proceed to Phase 2.** Do not wait for confirmation.

---

## PHASE 2: LeaderboardScreen

Create a new file:
```
screens/LeaderboardScreen.tsx
```

### Design requirements:

**Background:** Dark navy gradient (same as JourneyPathScreen and PlayerIdentityHero)

**Header:**
- Back arrow (navigates back)
- "Leaderboard" title (Outfit, 16px, weight 800, white)
- Current week label: "This week" (small, muted)

**My League Tier Card (top section):**
- Full-width card with the player's current tier
- Tier name large (Outfit, 24px, weight 900, white)
- Tier icon/badge: use colored treatment per tier
  - Bronze: warm amber/brown gradient accent
  - Silver: cool gray/silver accent
  - Gold: gold/amber accent
  - Platinum: sky blue/teal accent
  - Diamond: purple/violet accent
- "Week of [date]" subtitle
- "Resets Monday" label

**Podium Section (top 3):**
- Three podium positions laid out visually (2nd | 1st | 3rd, with 1st elevated)
- Each position shows:
  - Rank number (1, 2, 3)
  - Player avatar circle (initials if no photo, from `full_name`)
  - Player name (truncated if long)
  - Weekly XP amount
  - XP bonus earned (+50, +30, +20)
- Color treatment:
  - 1st: Gold accent (lynx-gold #FFD700 at 15% opacity bg, gold border)
  - 2nd: Silver accent (white/gray at 10% opacity)
  - 3rd: Bronze accent (amber/coral at 10% opacity)
- If fewer than 3 players on the team, show only the positions that exist

**Rankings List (below podium):**
- 4th place and below in a clean list
- Each row: rank number, avatar circle, player name, weekly XP, tier badge (small pill)
- Highlight "You" row with a subtle sky blue left border or background tint
- Show promotion/demotion status from last week if applicable:
  - Promoted: small green up arrow + "Promoted" text
  - Demoted: small red down arrow + "Demoted" text
  - Maintained: no indicator

**Empty state:** If no standings data yet (start of first week), show mascot (LYNXREADY.png) with "Leaderboard starts this Monday. Earn XP to claim your spot!"

### Data source:

```typescript
import { useLeaderboard } from '@/hooks/useLeaderboard';

const { standings, myRank, myTier, teamSize, loading, refreshLeaderboard } = useLeaderboard(teamId);
```

**Commit:** `[engagement-ui] Phase 2: LeaderboardScreen`

---

## PHASE 3: Update PlayerLeaderboardPreview

**File to modify:** `components/player-scroll/PlayerLeaderboardPreview.tsx`

### What to change:

Replace the current data source with `useLeaderboard`. The preview on the home scroll should show:
- Top 3 players (compact: rank + name + XP)
- "You" highlighted with an accent treatment
- Player's current tier as a small badge
- "View full leaderboard" tappable that navigates to LeaderboardScreen

### How to wire:

```typescript
import { useLeaderboard } from '@/hooks/useLeaderboard';

// Inside the component:
const { standings, myRank, myTier, loading } = useLeaderboard(teamId);

// Show top 5 from standings
// Highlight the row where player_id matches current user
```

**Navigation:** On "View full leaderboard" tap:
```typescript
navigation.navigate('Leaderboard', { teamId });
```

Register `LeaderboardScreen` in the navigation config if not already done.

**IMPORTANT:** Match the existing visual style of the component. Do not redesign it. Only change the data source and add the tier badge + navigation.

**Commit:** `[engagement-ui] Phase 3: wire PlayerLeaderboardPreview to real data`

---

## PHASE 4: PlayerTeamQuests component

Create a new file:
```
components/player-scroll/PlayerTeamQuests.tsx
```

### Design requirements:

**Match the visual pattern of PlayerWeeklyQuests exactly** (same card style, same spacing, same font sizes). The differences:

**Section header:** "Team quests" with a small team icon and "Resets Monday" label

**Quest cards:** Each team quest shows:
- Team quest title (e.g., "8 players attend this week")
- Group progress bar (filled portion = current_value / target_value)
- Progress label: "6 / 8 players" or "12 / 15 shoutouts"
- XP reward: "+50 XP per player"
- If completed: green checkmark, "Complete! +50 XP earned"
- **No individual tap-to-complete.** Team quests complete automatically when the target is reached.

**Contributor visibility (age-based):**
- Below each quest, show a contributors section
- Under-13 players: show only the group count ("6 teammates contributed")
- 13+ players: show individual names of contributors ("Ava, Marcus, and 4 others contributed")
- Use `getTeamQuestContributions` from `lib/team-quest-engine.ts` for this data

### Data source:

```typescript
import { useTeamQuests } from '@/hooks/useTeamQuests';

const { quests, loading, refreshQuests } = useTeamQuests(teamId);
```

### Placement on scroll:

This component goes AFTER PlayerWeeklyQuests and BEFORE PlayerChallengeCard (or wherever coach challenges currently sit). The order should be: Daily Quests > Weekly Quests > Team Quests > Coach Challenges.

**Commit:** `[engagement-ui] Phase 4: PlayerTeamQuests component`

---

## PHASE 5: Wire PlayerTeamQuests into home scroll

**File to modify:** `components/PlayerHomeScroll.tsx` (or whatever the parent scroll is)

1. Import `PlayerTeamQuests`
2. Place it after `PlayerWeeklyQuests` in the scroll order
3. Pass `teamId` as a prop (from the data already available in the scroll)

**IMPORTANT:** Do not change the position of any other component. Insert only.

**Commit:** `[engagement-ui] Phase 5: wire team quests into home scroll`

---

## PHASE 6: NotificationInbox screen

Create a new file:
```
screens/NotificationInboxScreen.tsx
```

### Design requirements:

**Background:** Light background (match the app's standard screen background, not dark navy)

**Header:**
- Back arrow
- "Notifications" title
- "Mark all read" button (text button, right side, uses `markAllRead`)

**Notification list:**
- Use `FlatList` (notifications could grow long)
- Each notification card:
  - Left: mascot image (48px circle, from `mascot_image` field, with transparent bg)
  - Middle: title (14px, weight 700) + body (12px, muted) + timestamp ("2h ago", "Yesterday")
  - Right: unread dot (small sky blue circle, 8px) if `is_read === false`
  - Tappable: marks as read on tap, navigates to `action_url` if present
- Unread notifications have a very subtle sky blue tint on the background
- Read notifications are plain

**Empty state:** Mascot (LYNXREADY.png) with "No notifications yet. Keep playing and the Lynx cub will check in."

**Swipe to dismiss (optional):** If the app uses a swipe gesture library, allow swipe-right to mark as read. Otherwise, tap handles it.

### Data source:

```typescript
import { useNotifications } from '@/hooks/useNotifications';

const { notifications, unreadCount, loading, markRead, markAllRead, refreshNotifications } = useNotifications();
```

### Timestamp formatting:

Create a small helper or use inline logic:
- Less than 1 hour ago: "Just now"
- Less than 24 hours: "Xh ago"
- Yesterday: "Yesterday"
- This week: day name ("Tuesday")
- Older: date ("Mar 10")

**Commit:** `[engagement-ui] Phase 6: NotificationInboxScreen`

---

## PHASE 7: Notification badge

Add an unread notification count badge to the player experience. There are two possible locations depending on the app's current structure:

**Option A (preferred): Header bell icon**
If the Player Home scroll has a header bar, add a bell icon with an unread count badge.

**Option B: Tab bar badge**
If there's no good header location, add an unread count badge to the "More" tab or wherever notifications would naturally live.

### Implementation:

Find the appropriate header or navigation component for the Player role. Add:

```typescript
import { useNotifications } from '@/hooks/useNotifications';

const { unreadCount } = useNotifications();

// In the header/nav JSX:
<TouchableOpacity onPress={() => navigation.navigate('NotificationInbox')}>
  <BellIcon size={22} color="white" />  {/* Use the app's icon library */}
  {unreadCount > 0 && (
    <View style={{
      position: 'absolute', top: -4, right: -4,
      backgroundColor: '#E24B4A',  // or the app's red/danger color
      borderRadius: 8, minWidth: 16, height: 16,
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 4,
    }}>
      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
        {unreadCount > 9 ? '9+' : unreadCount}
      </Text>
    </View>
  )}
</TouchableOpacity>
```

### Register NotificationInboxScreen in navigation:

Add `NotificationInboxScreen` as a stack screen accessible from anywhere.

**Commit:** `[engagement-ui] Phase 7: notification badge + navigation`

---

## PHASE 8: Update PlayerContinueTraining

**File to modify:** `components/player-scroll/PlayerContinueTraining.tsx`

### What to change:

The "Continue Training" card currently shows a static teaser ("Skill drills, tips & challenges — coming soon"). Replace with real Journey Path data.

Add the hook:

```typescript
import { useJourneyPath } from '@/hooks/useJourneyPath';

const { chapters, loading, currentChapterIndex } = useJourneyPath();
```

### Updated card content:

**If loading or no data:** Keep the existing teaser design but change text to "Loading your journey..."

**If journey data exists:**
- Chapter indicator: "Chapter X: [title]" (e.g., "Chapter 1: First Touch")
- Next node: "Next up: [node title]" (the first node with status 'available')
- Progress bar: filled based on `completedNodes / totalNodes` for the current chapter
- Progress label: "X of Y complete"
- XP available: "+[total XP of remaining nodes] XP ahead"

**If all chapters complete:**
- Show celebration state: "Journey complete! All 8 chapters mastered."
- Mascot: EXCITEDACHIEVEMENT.png or 100DAYSTREAKLEGENDARY.png

### Keep existing behavior:
- onPress still navigates to JourneyPathScreen
- Same card dimensions, same gradient background, same border radius
- Just change the content inside the card

**Commit:** `[engagement-ui] Phase 8: wire Continue Training to real Journey data`

---

## PHASE 9: Register new screens in navigation

Ensure all new screens are registered in the app's navigation:

1. `LeaderboardScreen` — accessible from PlayerLeaderboardPreview and potentially from tab bar
2. `NotificationInboxScreen` — accessible from the notification bell icon

Check if these were already registered in Phase 3 (Journey Path) or Phase 4. If not, add them now.

**Params for LeaderboardScreen:**
```typescript
{ teamId: string }
```

**Params for NotificationInboxScreen:**
None needed (loads for the current authenticated user).

**Commit:** `[engagement-ui] Phase 9: register screens in navigation`

---

## PHASE 10: Verification

### Verify:

1. **LeaderboardScreen renders** with podium visual for top 3, tier badge, full rankings list
2. **PlayerLeaderboardPreview** shows real data from useLeaderboard with tier badge and navigation
3. **PlayerTeamQuests** shows team quests with group progress bar and contributor section
4. **Team quests appear on home scroll** after weekly quests
5. **NotificationInboxScreen** renders notification list with mascot images, read/unread states
6. **Notification badge** shows unread count on bell icon
7. **Continue Training card** shows real chapter/node progress
8. **All navigation works:** home > leaderboard, home > notifications, leaderboard preview > full leaderboard
9. **No TypeScript errors** (`npx tsc --noEmit`)
10. **No engine files modified** (lib/*.ts untouched)
11. **Visual consistency** — new components match existing design tokens

### Files created:
- `screens/LeaderboardScreen.tsx`
- `screens/NotificationInboxScreen.tsx`
- `components/player-scroll/PlayerTeamQuests.tsx`

### Files modified:
- `components/player-scroll/PlayerLeaderboardPreview.tsx` (rewired to useLeaderboard)
- `components/player-scroll/PlayerContinueTraining.tsx` (shows real Journey data)
- `components/PlayerHomeScroll.tsx` (added PlayerTeamQuests)
- Navigation config (registered LeaderboardScreen, NotificationInboxScreen)
- Header/nav component (added notification bell + badge)

### Report back with:

```
## VERIFICATION REPORT: Phase 5 — Engagement UI

### Files Created: [count]
[list each with line count]

### Files Modified: [count]
[list each with description of changes]

### Screens:
- LeaderboardScreen: RENDERS / BROKEN
- NotificationInboxScreen: RENDERS / BROKEN

### Components:
- PlayerTeamQuests: RENDERS / BROKEN
- PlayerLeaderboardPreview (updated): RENDERS / BROKEN
- PlayerContinueTraining (updated): RENDERS / BROKEN
- Notification badge: VISIBLE / NOT VISIBLE

### Navigation:
- Home > Leaderboard preview > Full leaderboard: WORKS / BROKEN
- Home > Bell icon > Notification inbox: WORKS / BROKEN
- Home > Continue Training > JourneyPathScreen: WORKS / BROKEN (should still work from Phase 3)

### Home Scroll Order (confirm):
1. PlayerIdentityHero
2. [list actual order through the scroll]
N. PlayerAmbientCloser

### Data Integration:
- Leaderboard reads from league_standings: YES / NO
- Team quests read from team_quests: YES / NO
- Notifications read from player_notifications: YES / NO
- Continue Training reads from journey_chapters/nodes: YES / NO

### Type Check: PASS / FAIL

### Errors: NONE / [list]
```

---

## WHAT COMES NEXT (NOT IN THIS SPEC)

After Phase 5, the engagement system UI is feature-complete:
- **Phase 6 (Polish):** Wire all 48 mascot images throughout the app (identity hero, ambient closer, streak momentum cards, quest illustrations, celebration moments, error states)
- **Coach/Admin views:** Coaches see engagement metrics for their players. Admin sees org-wide engagement data.
- **Push notification delivery:** Wire Expo Push to the notification engine
- **Cross-team leaderboards:** Club-level competition across multiple teams
