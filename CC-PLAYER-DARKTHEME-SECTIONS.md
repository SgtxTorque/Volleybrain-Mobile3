# LYNX — Player Experience: Dark Theme Fix + Missing Sections
## For Claude Code Execution

---

## CONTEXT

The Player Home MVP landed. The hero card, Drop, photo strip, Next Up, last game stats, and closing are all working. But two issues need fixing:

1. **Dark theme is bleeding** — light-colored nav bar, light safe area strips, and light status bar break the dark mode immersion. The player experience should be FULLY dark, edge to edge, no light elements anywhere.

2. **Missing scroll sections** — Several sections from the spec were not implemented: streak banner, active challenge card, and personal best callout on the stats grid.

---

## RULES

1. Read existing code before changing it
2. PLAYER-ROLE ONLY — do NOT touch Parent, Coach, or Admin
3. Read SCHEMA_REFERENCE.csv before any new queries
4. Run `npx tsc --noEmit` after all fixes
5. AUTONOMOUS EXECUTION MODE — run all fix groups (A through C) without stopping
6. Commit and push after each group

---

## FIX GROUP A: FULL DARK THEME — Edge to Edge (Critical)

**Problem:** The player home has a dark navy (#0D1B3E) scroll area, but:
- The bottom nav bar has a light/white background (same as parent/coach)
- There is a light-colored strip between the scroll content and the nav bar
- The safe area (top and bottom) may have light backgrounds
- The status bar icons may be dark-on-light instead of light-on-dark
- This happens on ALL screens when viewing as player role, not just the home

**Diagnosis (do all of these):**

A1. Find the main app shell / navigation container:
```bash
grep -rn "SafeAreaView\|SafeAreaProvider\|NavigationContainer\|StatusBar\|barStyle\|backgroundColor.*safe" --include="*.tsx" --include="*.ts" -rl | head -20
```

A2. Find the bottom tab navigator:
```bash
grep -rn "Tab.Navigator\|BottomTab\|tabBar\|TabBar\|createBottomTab\|bottomNav\|BottomNav" --include="*.tsx" --include="*.ts" -rl | head -20
```
Read the file(s) found. Check:
- Is there a `tabBarStyle` or `tabBarBackground` prop?
- Is the background color hardcoded to white/light?
- Is there a way to make it role-aware?

A3. Find the DashboardRouter or main screen wrapper:
```bash
grep -rn "DashboardRouter\|MainApp\|AppNavigator\|RootNavigator" --include="*.tsx" --include="*.ts" -rl | head -10
```
Read it. Check:
- Does the outer container have `backgroundColor: '#FFFFFF'` or similar?
- Is there a `SafeAreaView` with a light background wrapping all screens?

A4. Read the PlayerHomeScroll to check its container setup:
```bash
grep -rn "PlayerHomeScroll\|playerHome" --include="*.tsx" --include="*.ts" -rl
```

**Fixes:**

A5. **Status bar:** In the PlayerHomeScroll (or wherever the player screens are rendered), set:
```tsx
<StatusBar barStyle="light-content" backgroundColor="#0D1B3E" translucent={false} />
```
This must be set EVERY time a player screen mounts. If the app uses React Navigation, use `useFocusEffect` to set it when the player screen gains focus, and reset it when it loses focus:
```tsx
useFocusEffect(
  useCallback(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#0D1B3E');
    return () => {
      // Reset to default for other screens
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor('#FFFFFF');
    };
  }, [])
);
```

A6. **Safe area background:** The SafeAreaView wrapping the player screen must have `backgroundColor: '#0D1B3E'`. If there's a global SafeAreaView wrapping all screens, make it role-aware:
```tsx
const bgColor = activeRole === 'player' ? '#0D1B3E' : '#FFFFFF'; // or COLORS.background
<SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
```
If the SafeAreaView is in a file you shouldn't modify (like a navigation library wrapper), then wrap the PlayerHomeScroll in its own SafeAreaView with the dark background INSIDE the existing one, and set the outer one's background to dark when on the player screen.

A7. **Bottom nav bar:** The tab bar needs to be dark when the player role is active:
- Find where the tab bar style is defined
- Make it role-aware. When the active role is `player`:
  ```
  backgroundColor: 'rgba(13, 27, 62, 0.95)'  // #0D1B3E at 95%
  borderTopColor: 'rgba(255, 255, 255, 0.05)'
  ```
  Active tab icon/label: `#4BB9EC`
  Inactive tab icon/label: `rgba(255, 255, 255, 0.20)`
- When the active role is NOT player:
  Keep current light theme (whatever it is now)

A8. **The light strip between content and nav:** This is likely caused by one of:
- A gap in the flex layout (the scroll content doesn't extend to the bottom)
- A container View between the scroll and the tab bar with a light background
- The scroll's `contentContainerStyle` not having `flexGrow: 1`
Fix: Ensure the PlayerHomeScroll's outermost container has:
```tsx
<View style={{ flex: 1, backgroundColor: '#0D1B3E' }}>
```
And the ScrollView has:
```tsx
contentContainerStyle={{ flexGrow: 1 }}
```
And there's enough bottom padding in the scroll to clear the tab bar (at least 100px).

A9. **Other player screens:** The dark theme fix must apply to ALL screens when the player role is active, not just the home scroll. Check:
- Game Day tab → should be dark
- Chat tab → follow existing chat theme (may be fine)
- More tab → should be dark
If any of these screens have light backgrounds, add `backgroundColor: '#0D1B3E'` to their root container when the active role is player.

**Verify:**
- [ ] Status bar: white icons on dark background
- [ ] No light strips visible anywhere — fully dark edge to edge
- [ ] Bottom nav: dark background, skyBlue active tab, dim inactive tabs
- [ ] Safe areas (top notch, bottom home indicator): dark background
- [ ] Switching from player to parent/coach: light theme returns correctly
- [ ] Switching from parent/coach to player: dark theme applies correctly

**Commit:** `git add -A && git commit -m "Fix A: Full dark theme edge-to-edge for player experience" && git push`

---

## FIX GROUP B: MISSING PLAYER SECTIONS

### B1. Streak Banner

**Missing from current implementation.** Should appear between the Hero Card and The Drop.

**Check if attendance streak data is being computed in the data hook:**
```bash
grep -rn "streak\|consecutive\|attendance.*count" hooks/usePlayerHomeData.ts --include="*.ts"
```

If the streak is NOT being computed, add it to the data hook:
```typescript
// Compute attendance streak
// Get the player's events sorted by date descending
// Count consecutive events where they RSVP'd 'confirmed' or attendance was recorded
// Stop counting at the first miss

const { data: recentEvents } = await supabase
  .from('schedule_events')
  .select('id, event_date, event_rsvps!inner(status)')
  .in('team_id', teamIds)
  .eq('event_rsvps.player_id', playerId)
  .lte('event_date', today)
  .order('event_date', { ascending: false })
  .limit(20);

let streak = 0;
if (recentEvents) {
  for (const event of recentEvents) {
    const rsvp = event.event_rsvps?.[0];
    if (rsvp?.status === 'confirmed' || rsvp?.status === 'attended') {
      streak++;
    } else {
      break;
    }
  }
}
```

**If the query fails or the join doesn't work**, try a simpler approach:
```typescript
const { data: rsvps } = await supabase
  .from('event_rsvps')
  .select('status, event:event_id(event_date)')
  .eq('player_id', playerId)
  .order('created_at', { ascending: false })
  .limit(20);

let streak = 0;
if (rsvps) {
  for (const rsvp of rsvps) {
    if (rsvp.status === 'confirmed' || rsvp.status === 'attended') {
      streak++;
    } else {
      break;
    }
  }
}
```

**Render the streak banner** (only if streak >= 2):

```tsx
{streak >= 2 && (
  <Animated.View style={[streakBannerStyle, {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
    // Gradient background: use LinearGradient from expo-linear-gradient
    // from: rgba(255,215,0,0.10) → via: rgba(255,215,0,0.05) → to: transparent
  }]}>
    <Text style={{ fontSize: 20 }}>🔥</Text>
    <View>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFD700' }}>
        {streak}-Day Streak
      </Text>
      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>
        Keep it going — you're locked in
      </Text>
    </View>
  </Animated.View>
)}
```

**Pulse animation:** The banner opacity oscillates 1.0 → 0.7 → 1.0 in a 1.5s loop using reanimated:
```typescript
const streakOpacity = useSharedValue(1);
useEffect(() => {
  if (streak >= 2) {
    streakOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 750 }),
        withTiming(1, { duration: 750 })
      ),
      -1, // infinite
      false
    );
  }
}, [streak]);

const streakBannerStyle = useAnimatedStyle(() => ({
  opacity: streakOpacity.value,
}));
```

### B2. Active Challenge Card

**Check if challenge data is being fetched in the hook:**
```bash
grep -rn "challenge\|coach_challenges\|challenge_participants" hooks/usePlayerHomeData.ts --include="*.ts"
```

If challenges are NOT being fetched, add to the data hook:
```typescript
// Active challenges for player's teams
let activeChallenges = [];
try {
  const { data } = await supabase
    .from('coach_challenges')
    .select('*, challenge_participants(player_id, current_value)')
    .in('team_id', teamIds)
    .gte('end_date', today);
  
  if (data) {
    activeChallenges = data.map(challenge => {
      const participation = challenge.challenge_participants?.find(
        p => p.player_id === playerId
      );
      return {
        ...challenge,
        currentValue: participation?.current_value || 0,
      };
    });
  }
} catch (err) {
  // Table might not exist
  if (__DEV__) console.log('[Challenges] Table may not exist:', err.message);
}
```

**Render the challenge card** (only if active challenges exist):

```tsx
{activeChallenges.length > 0 && (
  <View style={{
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.10)',
    padding: 16,
    backgroundColor: '#10284C', // with gold gradient tint if possible
  }}>
    {/* Header */}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <Text style={{ fontSize: 14 }}>⚡</Text>
      <Text style={{
        fontSize: 10, fontWeight: '700', color: '#FFD700',
        letterSpacing: 1.2, textTransform: 'uppercase',
      }}>
        Active Challenge
      </Text>
    </View>
    
    {/* Title */}
    <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 }}>
      {activeChallenges[0].title}
    </Text>
    
    {/* Progress bar */}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
        <View style={{
          height: '100%',
          borderRadius: 3,
          backgroundColor: '#FFD700',
          width: `${Math.min(100, (activeChallenges[0].currentValue / activeChallenges[0].target_value) * 100)}%`,
        }} />
      </View>
      <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.30)' }}>
        {activeChallenges[0].currentValue}/{activeChallenges[0].target_value}
      </Text>
    </View>
    
    {/* XP reward */}
    <Text style={{ fontSize: 10, color: 'rgba(255,215,0,0.40)' }}>
      +{activeChallenges[0].xp_reward} XP reward
    </Text>
  </View>
)}
```

If the `coach_challenges` table doesn't exist, this section simply won't render.

### B3. Personal Best Callout on Stats Grid

**Check the last game stats component:**
```bash
grep -rn "LAST GAME\|lastGame\|game.*highlight\|game.*stats" components/PlayerHomeScroll.tsx components/player-scroll/ --include="*.tsx" -l
```

Read the component that renders the 4-column stat grid.

**Add personal best detection:**

In the data hook, compare each stat from the last game to the player's previous games:
```typescript
// Compute personal bests
let personalBest: string | null = null;
if (lastGame && gameStats && gameStats.length > 1) {
  const previousGames = gameStats.slice(1); // exclude the most recent
  
  const statFields = [
    { key: 'kills', label: 'kills' },
    { key: 'aces', label: 'aces' },
    { key: 'digs', label: 'digs' },
    { key: 'blocks', label: 'blocks' },
    { key: 'assists', label: 'assists' },
  ];
  
  for (const field of statFields) {
    const lastValue = lastGame[field.key] || 0;
    const previousMax = Math.max(...previousGames.map(g => g[field.key] || 0), 0);
    if (lastValue > previousMax && lastValue > 0) {
      personalBest = field.label;
      break; // Show the first personal best found
    }
  }
}
```

**Render the callout** below the stat grid:
```tsx
{personalBest && (
  <Text style={{
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 12,
  }}>
    Personal best in {personalBest}! 🔥
  </Text>
)}
```

If no personal best was set, nothing renders — clean.

**Commit:** `git add -A && git commit -m "Fix B: Add streak banner, challenge card, personal best callout" && git push`

---

## FIX GROUP C: SCROLL ORDER + SPACING PASS

After adding the new sections, ensure the final scroll order is correct:

```
1.  Hero Identity Card (always)
     ↕ 12px
2.  Streak Banner (if streak ≥ 2)  ← NEW
     ↕ 12px
3.  The Drop (1-3 items or contextual message)
     ↕ 16px
4.  Photo Strip (if photos exist)
     ↕ 16px
5.  Next Up — event + RSVP (if event exists)
     ↕ 12px
6.  Chat Peek (flat row)
     ↕ 16px
7.  Quick Props row
     ↕ 12px
8.  Active Challenge (if exists)  ← NEW
     ↕ 16px
9.  Last Game Stats (if game stats exist) + Personal Best  ← ENHANCED
     ↕ 24px
10. Closing Mascot + XP callback
     ↕ 100px bottom padding (nav clearance)
```

**Verify scroll order matches this.** Move sections if they're in the wrong position.

**Spacing check:** Ensure consistent gaps between sections. No double-gaps, no touching sections.

**Bottom padding:** Set to at least 100px to clear the bottom nav. If the dark theme fix in Group A changed the nav height, adjust accordingly.

**Verify:**
- [ ] Streak banner appears between hero and Drop (when streak ≥ 2)
- [ ] Challenge card appears between Quick Props and Last Game Stats
- [ ] Personal best text appears below stat grid when applicable
- [ ] Scroll order matches the spec above
- [ ] No orphaned empty space between sections
- [ ] All sections still conditionally hide when data is missing

**Commit:** `git add -A && git commit -m "Fix C: Scroll order, spacing, bottom padding" && git push`

---

## FINAL VERIFICATION

- [ ] Fully dark edge-to-edge: no light nav bar, no light strips, no light safe areas
- [ ] Status bar: light-content (white icons)
- [ ] Bottom nav: dark when player, light when parent/coach
- [ ] Streak banner renders with pulse animation when streak ≥ 2
- [ ] Challenge card renders with progress bar when active challenge exists
- [ ] Personal best callout shows on last game stats when stat is season-high
- [ ] Switching roles: dark theme comes and goes correctly
- [ ] Parent home: unchanged
- [ ] Coach home: unchanged
- [ ] `npx tsc --noEmit` — zero new errors

**Final commit if any cleanup:** `git add -A && git commit -m "Player dark theme + missing sections complete" && git push`
