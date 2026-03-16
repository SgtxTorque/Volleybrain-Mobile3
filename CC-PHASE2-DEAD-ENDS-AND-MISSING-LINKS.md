# CC-PHASE2-DEAD-ENDS-AND-MISSING-LINKS.md
# Lynx Mobile — Phase 2: Dead Ends & Missing Links
# EXECUTION SPEC — Run this with Claude Code

---

## PURPOSE

Add navigation to screens that currently trap users (dead ends) and connect screens that should link to each other but don't (missing links). These are additive changes — adding onPress handlers, router.push calls, and small UI elements to existing screens. No screen redesigns, no consolidation.

This is Phase 2 of 4. Phase 1 (critical wiring fixes) must be completed first.

---

## BEFORE YOU START — READ THESE FILES

1. `CC-LYNX-RULES.md`
2. `CC-PROJECT-CONTEXT.md`
3. `CC-SHARED-SCREEN-ARCHITECTURE.md` (reference only — do NOT execute consolidation)

---

## ABSOLUTE RULES

1. **Do NOT consolidate screens.** No merging files. That is Phase 3-4 work.
2. **Do NOT redesign any screen's layout.** Add tap handlers and small link elements only.
3. **Do NOT change data fetching logic, queries, or hooks.**
4. **Do NOT modify GestureDrawer.tsx or _layout.tsx.** Those were handled in Phase 1.
5. **Do NOT touch home scroll components** (ParentHomeScroll, CoachHomeScroll, AdminHomeScroll) except for Fix 5 (PlayerHomeScroll only, as specified).
6. **Execute one fix at a time.** Complete it, verify it, report it, then move to the next.

---

## DO NOT TOUCH LIST

- `app/_layout.tsx` (Phase 1 complete)
- `components/GestureDrawer.tsx` (Phase 1 complete)
- `components/ParentHomeScroll.tsx`
- `components/CoachHomeScroll.tsx` (and all files in `components/coach-scroll/`)
- `components/admin-scroll/` (all files)
- `components/parent-scroll/` (all files)
- `components/DashboardRouter.tsx`
- Any file in `lib/` or `hooks/`
- Any `.sql` or migration file
- `package.json`, `app.json`, `tsconfig.json`

---

## FIX 1: Add Player Tap Navigation to Roster Carousel

**File:** `components/RosterCarousel.tsx`

**Current behavior:** `RosterCarousel` already has an `onPress` that navigates to `/player-card?playerId={id}` (line 193). This works. However, `app/roster.tsx` renders `RosterCarousel` at line 343 — confirm the `onPress` prop is properly wired through. The audit flagged `roster.tsx` as a dead end.

**Investigation task:** Read `app/roster.tsx` lines 340-350. Check if `RosterCarousel` is rendered with all required props including the `onPress`/navigation callback. If `RosterCarousel` handles navigation internally (which it appears to — line 193 uses its own `router.push`), then `roster.tsx` may not be a dead end after all — the audit may have missed the internal navigation.

**If roster.tsx IS already wired (RosterCarousel handles navigation internally):**
- Report that roster.tsx is NOT a dead end — RosterCarousel navigates to player-card internally at line 193.
- No changes needed to this file.
- Move to the next part of Fix 1.

**If roster.tsx IS a dead end (RosterCarousel does not navigate):**
- Add the navigation callback. This should pass `onPlayerTap` or similar prop that RosterCarousel accepts, routing to `/player-card?playerId={id}`.

---

**File:** `app/(tabs)/players.tsx`

**Current behavior:** Tapping a player calls `setSelectedPlayer(item)` (line 184) which opens `PlayerCardExpanded` as a modal (line 408-411). This is NOT a dead end — it shows an expanded card view. However, the expanded card (`PlayerCardExpanded.tsx`, 611 lines) has NO outbound navigation to `/player-card` or `/child-detail`. The user sees the expanded card but can't go deeper.

**Change required:** Add a "View Full Profile" button to `PlayerCardExpanded.tsx` that navigates to the appropriate destination based on role.

**File to modify:** `components/PlayerCardExpanded.tsx`

**Implementation:**

1. Add imports at the top of the file:
```typescript
import { useRouter } from 'expo-router';
import { usePermissions } from '@/lib/permissions-context';
```

2. Inside the component function, add:
```typescript
const router = useRouter();
const { isAdmin, isCoach } = usePermissions();
```

3. Find the bottom of the expanded card content (before the close button or at the bottom of the modal content area). Add a "View Full Profile" button:
```typescript
<TouchableOpacity
  style={{
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#4BB9EC',
    borderRadius: 12,
    alignItems: 'center',
  }}
  onPress={() => {
    // Close the modal first
    if (onClose) onClose();
    // Navigate based on role
    if (isAdmin || isCoach) {
      router.push(`/child-detail?playerId=${player.id}` as any);
    } else {
      router.push(`/player-card?playerId=${player.id}` as any);
    }
  }}
>
  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
    {isAdmin || isCoach ? 'View Player Detail' : 'View Player Card'}
  </Text>
</TouchableOpacity>
```

**Important:** Check what props `PlayerCardExpanded` receives. It likely has an `onClose` or `visible` control prop. Call `onClose()` before navigating so the modal dismisses cleanly.

**After completing Fix 1, STOP and report:**
- Whether roster.tsx was actually a dead end or not
- Changes made to PlayerCardExpanded.tsx
- The exact navigation logic added (which role goes where)

---

## FIX 2: Add "View Player Card" Button to Child Detail

**File:** `app/child-detail.tsx`

**Current behavior:** Child detail shows player stats, achievements, schedule, and evaluations. It has a "View All Achievements" button (line 810) that navigates to `/achievements` WITHOUT passing `playerId`. There is no link to the player trading card (`player-card.tsx`). Recent game results are displayed but not tappable.

**Three changes in this file:**

### Change 2A: Add "View Player Card" button

Find the player header area (near the top of the screen where the player's name, photo, jersey number are displayed). Add a button that navigates to the trading card:

```typescript
<TouchableOpacity
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: BRAND.navy + '10',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND.navy + '20',
  }}
  onPress={() => router.push(`/player-card?playerId=${playerId}` as any)}
>
  <Ionicons name="id-card-outline" size={16} color={BRAND.navy} />
  <Text style={{ fontSize: 13, fontWeight: '600', color: BRAND.navy }}>View Player Card</Text>
</TouchableOpacity>
```

Place this near the existing action buttons in the header area. Look for the player name section and add it below or alongside existing buttons.

### Change 2B: Fix achievements navigation to pass playerId

Find line 810 (the "View All Achievements" button):

```typescript
// BEFORE:
onPress={() => router.push('/achievements' as any)}

// AFTER:
onPress={() => router.push(`/achievements?playerId=${playerId}` as any)}
```

This ensures multi-child parents see the correct child's achievements.

### Change 2C: Make recent game results tappable

Find the recent games rendering section (around lines 733-762). The games are currently rendered inside a `<View>` element. Change the wrapper from `<View>` to `<TouchableOpacity>` with navigation to game results:

```typescript
// BEFORE (line ~734-735):
<View
  key={game.id}
  style={[s.glassCard, s.recentGameCard, ...]}
>

// AFTER:
<TouchableOpacity
  key={game.id}
  style={[s.glassCard, s.recentGameCard, ...]}
  activeOpacity={0.7}
  onPress={() => router.push(`/game-results?eventId=${game.id}` as any)}
>
```

And change the corresponding closing `</View>` to `</TouchableOpacity>` for each game card. The closing tag is around line ~762.

**Important:** The `game.id` here is the event ID — verify by checking the query that populates `recentGames` (around lines 253-260). It should be fetching from `events` or `scheduled_events` table and `id` is the event ID.

**After completing Fix 2, STOP and report:**
- Location where "View Player Card" button was placed
- Line number of achievements fix (before and after)
- Lines changed for tappable game results
- Confirm the game ID used in navigation matches the event ID

---

## FIX 3: Make My Kids Children Tappable

**File:** `app/my-kids.tsx`

**Current behavior:** Each child is rendered as a `<View>` card (line ~285: `<View key={child.id} style={s.childCard}>`). The card shows the child's name, jersey, teams, next event, and payments — but the entire card is NOT tappable. The only action buttons are Schedule (fixed in Phase 1), Chat, and Pay Now (lines 360-377).

**Change required:** Wrap the child card header (avatar + name + jersey) in a `TouchableOpacity` that navigates to `/child-detail?playerId={child.id}`.

**Implementation:**

Find the child header section (around lines 287-302). Currently structured as:

```typescript
<View style={s.childHeader}>
  <View style={s.childAvatar}>...</View>
  <View style={s.childHeaderInfo}>
    <Text style={s.childName}>...</Text>
    ...
  </View>
  {/* Payment badge */}
</View>
```

Wrap the avatar + name portion (NOT the payment badge) in a `TouchableOpacity`:

```typescript
<View style={s.childHeader}>
  <TouchableOpacity
    style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}
    activeOpacity={0.7}
    onPress={() => router.push(`/child-detail?playerId=${child.id}` as any)}
  >
    <View style={s.childAvatar}>...</View>
    <View style={s.childHeaderInfo}>
      <Text style={s.childName}>...</Text>
      ...
    </View>
  </TouchableOpacity>
  {/* Payment badge stays outside the tap target */}
</View>
```

Also add a "View Profile" quick action alongside the existing Schedule/Chat/Pay buttons (around lines 355-380):

```typescript
<TouchableOpacity
  style={s.quickAction}
  onPress={() => router.push(`/child-detail?playerId=${child.id}` as any)}
>
  <Ionicons name="person-outline" size={18} color={colors.primary} />
  <Text style={s.quickActionText}>Profile</Text>
</TouchableOpacity>
```

Place this as the first quick action in the row.

**After completing Fix 3, STOP and report:**
- How the tap target was implemented
- Where the "Profile" quick action was placed
- Confirm the payment badge is NOT inside the tap target

---

## FIX 4: Fix scrollToEvals Param in My Stats

**File:** `app/my-stats.tsx`

**Current behavior:** `useLocalSearchParams` at line 114 reads `highlightStat` and `playerId` but does NOT read `scrollToEvals`. The drawer "My Evaluations" item passes `?scrollToEvals=true` but the screen ignores it.

**Change required:** Read the `scrollToEvals` param and auto-scroll to the evaluation section when it's present.

**Implementation:**

### Step 1: Add scrollToEvals to the params destructuring

Find line 114:
```typescript
// BEFORE:
const { highlightStat, playerId: paramPlayerId } = useLocalSearchParams<{ highlightStat?: string; playerId?: string }>();

// AFTER:
const { highlightStat, playerId: paramPlayerId, scrollToEvals } = useLocalSearchParams<{ highlightStat?: string; playerId?: string; scrollToEvals?: string }>();
```

### Step 2: Add a ref to the ScrollView

Find the main ScrollView (around line 460 or 862 — there may be multiple, find the outermost one that wraps the full content). Add a ref:

```typescript
const scrollRef = useRef<ScrollView>(null);
```

And attach it to the ScrollView:
```typescript
<ScrollView ref={scrollRef} ...>
```

### Step 3: Add a ref to the evaluation section

Find the "SKILL RATINGS" section (rendered by `renderSkillsSection()` called around line 889) or the "EVALUATION HISTORY" section (around line 891). Wrap it with a `View` that has an `onLayout` callback:

```typescript
const evalSectionY = useRef<number>(0);

// Around the evaluation section:
<View onLayout={(e) => { evalSectionY.current = e.nativeEvent.layout.y; }}>
  {renderSkillsSection()}
  {/* Evaluation History Timeline */}
  {evalHistory.length > 0 && (
    ...
  )}
</View>
```

### Step 4: Add the auto-scroll effect

After the data loading is complete (find where `setLoading(false)` is called), add a scroll effect:

```typescript
useEffect(() => {
  if (scrollToEvals === 'true' && !loading && evalSectionY.current > 0) {
    // Small delay to ensure layout is measured
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: evalSectionY.current, animated: true });
    }, 300);
  }
}, [scrollToEvals, loading]);
```

**Important:** `useRef` is already imported (line 17). `ScrollView` is already imported (line 23). No new imports needed for refs.

**After completing Fix 4, STOP and report:**
- How the param was added to useLocalSearchParams
- Which ScrollView got the ref (line number)
- Where the eval section onLayout wrapper was placed
- The scroll trigger logic

---

## FIX 5: Add Player Card Link to PlayerHomeScroll

**File:** `components/PlayerHomeScroll.tsx`

**Note:** This is the ONE exception to the "do not touch home scroll components" rule. This specific change is adding a single tap target.

**Current behavior:** PlayerHomeScroll has a `HeroIdentityCard` component that shows the player's OVR rating. Tapping the OVR badge navigates to `/my-stats` (HeroIdentityCard.tsx line 123). There is no path to the player trading card from the home dashboard.

**File to modify:** `components/player-scroll/HeroIdentityCard.tsx`

**Change required:** Add a "View My Card" tap target to the hero identity card.

**Implementation:**

Find the area around line 123 where the OVR badge onPress is defined. Nearby, add a second tappable element:

```typescript
<TouchableOpacity
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    marginTop: 8,
  }}
  onPress={() => router.push('/player-card' as any)}
>
  <Ionicons name="id-card-outline" size={14} color="#FFD700" />
  <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFD700' }}>View My Card</Text>
</TouchableOpacity>
```

**Important:** Use the gold color (#FFD700) to match the PLAYER_THEME dark design. Check what colors/tokens the file already uses and match the pattern. `router` and `Ionicons` should already be imported in this file — verify before adding imports.

**After completing Fix 5, STOP and report:**
- Where the button was placed relative to existing content
- What colors/styling was used
- Confirm it navigates to `/player-card` (no params — the screen auto-resolves for the current player)

---

## FIX 6: Add Game Results Outbound to child-detail for Parent Game Drill-Down

**NOTE:** This was already handled as Change 2C in Fix 2. If Fix 2 was completed correctly, this is already done.

**Verification only:** Confirm that the recent games section in `child-detail.tsx` now uses `TouchableOpacity` and navigates to `/game-results?eventId={game.id}`.

If already done, report "Already completed in Fix 2C" and move to verification.

---

## VERIFICATION AFTER ALL FIXES

After completing all fixes:

1. **Run `npx tsc --noEmit`** and report the result.
2. **List every file that was modified** across all fixes.
3. **Confirm no files outside the scope were modified.**
4. **For each fix, describe the before/after behavior in one sentence.**

---

## MANUAL QA CHECKLIST (for Carlos to test)

| # | Test | Expected Result |
|---|------|----------------|
| 1 | As coach, go to roster (home card or drawer), tap a player in carousel | Navigates to player-card |
| 2 | As coach, go to Coaching Tools → Roster (players.tsx), tap a player, see expanded card | Expanded card has "View Player Detail" button |
| 3 | Tap "View Player Detail" on expanded card as coach | Navigates to child-detail |
| 4 | As player, tap a teammate on expanded card | Navigates to player-card (not child-detail) |
| 5 | As parent, open child-detail for your child | See "View Player Card" button in header area |
| 6 | Tap "View Player Card" on child-detail | Navigates to player-card with correct player |
| 7 | On child-detail, tap "View All Achievements" | Navigates to achievements WITH playerId in URL |
| 8 | On child-detail, tap a recent game result | Navigates to game-results with eventId |
| 9 | As parent, open My Kids, tap a child's name/avatar | Navigates to child-detail for that child |
| 10 | My Kids shows "Profile" quick action button | Visible alongside Schedule, Chat, Pay buttons |
| 11 | As player, open drawer → My Stuff → My Evaluations | Lands on my-stats and auto-scrolls to evaluation section |
| 12 | As player, open home dashboard | See "View My Card" button on hero identity card |
| 13 | Tap "View My Card" on player home | Navigates to player-card |
