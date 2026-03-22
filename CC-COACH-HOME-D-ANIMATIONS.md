# CC-COACH-HOME-D-ANIMATIONS.md
# Lynx Mobile — Coach Home D System: Micro-Animations
# Targeted animation pass. No layout changes. No data changes. Animations only.

**Priority:** MEDIUM — Polish pass after layout fixes are confirmed working
**Estimated time:** 2-3 hours (9 animation targets, commit after all)
**Risk level:** LOW — Adding animations to existing components, no structural changes

---

## PREREQUISITE

1. Read CC-LYNX-RULES.md
2. Read AGENTS.md — "Keep edits minimal and localized"
3. Confirm the Coach Home D layout fixes (CC-COACH-HOME-D-FIXES) are merged and working
4. Read the existing `hooks/useScrollAnimations.ts` to understand what scroll animation utilities already exist
5. Check `package.json` — confirm `react-native-reanimated` is installed (it is: ~4.1.1)

---

## FILE SCOPE

### FILES YOU MAY MODIFY:
- `components/CoachHomeScroll.tsx` — Only to pass scroll position to child components or add scroll handler
- `components/coach-scroll/GameDayHeroCard.tsx` — Add pip pulse and volleyball rotation
- `components/coach-scroll/MomentumCardsRow.tsx` — Add stagger entrance and count-up
- `components/coach-scroll/SquadFacesRow.tsx` — Add stagger pop-in
- `components/coach-scroll/SmartNudgeCard.tsx` — Add attention shake
- `components/coach-scroll/ActionGrid2x2.tsx` — Add press spring animation
- `components/coach-scroll/CoachPulseFeed.tsx` — Add slide-in stagger
- `components/coach-scroll/CoachTrophyCase.tsx` — Add badge shimmer and XP bar fill
- `components/coach-scroll/TeamStatsChart.tsx` — Add bar fill animation
- `components/coach-scroll/AmbientCloser.tsx` — Add mascot sway
- `components/coach-scroll/DynamicMessageBar.tsx` — Add slide-in entrance

### FILES YOU MUST NOT MODIFY:
- Everything on the original MUST NOT MODIFY list
- All hooks, data files, theme files, navigation files, other role files
- Do NOT change layout, spacing, colors, fonts, or content in any component
- ONLY add animation code

### ANIMATION RULES:
1. ALL animations use `react-native-reanimated` (useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withSequence, withDelay)
2. NO animations using the basic React Native `Animated` API
3. ALL animations run on the UI thread — no `runOnJS` unless absolutely necessary
4. Scroll-triggered animations use the scroll position from `useAnimatedScrollHandler` or the existing `useScrollAnimations` hook
5. Entrance animations fire ONCE on first appearance, not every time the user scrolls past
6. Loop animations (breathing, rotation, pulse) must use `cancelAnimation` on unmount to prevent memory leaks
7. Every animation must be interruptible — no blocking the UI
8. If a component already has animations from the previous build phases, preserve them and add to them, don't replace

---

## ANIMATION 1: MASCOT BREATHING

**File:** The mascot image in the greeting section of `CoachHomeScroll.tsx`

**What:** The mascot image gently scales between 1.0 and 1.03 on a continuous loop.

**Implementation:**
```typescript
const mascotScale = useSharedValue(1);

useEffect(() => {
  mascotScale.value = withRepeat(
    withSequence(
      withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
    ),
    -1, // infinite repeat
    false // don't reverse, the sequence handles it
  );
  return () => cancelAnimation(mascotScale);
}, []);

const mascotAnimStyle = useAnimatedStyle(() => ({
  transform: [{ scale: mascotScale.value }],
}));
```

**Wrap** the mascot Image in an `Animated.View` with `mascotAnimStyle`.

---

## ANIMATION 2: DYNAMIC MESSAGE BAR SLIDE-IN

**File:** `components/coach-scroll/DynamicMessageBar.tsx`

**What:** On mount, the bar slides in from the left (translateX -20 → 0) and fades in (opacity 0 → 1) over 300ms.

**Implementation:**
```typescript
const translateX = useSharedValue(-20);
const opacity = useSharedValue(0);

useEffect(() => {
  translateX.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
  opacity.value = withTiming(1, { duration: 300 });
}, []);

const animStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: translateX.value }],
  opacity: opacity.value,
}));
```

**Fire once on mount only.** Wrap the entire bar component in an `Animated.View`.

---

## ANIMATION 3: HERO CARD — READINESS PIP PULSE + VOLLEYBALL ROTATION

**File:** `components/coach-scroll/GameDayHeroCard.tsx`

**3A. Readiness pip pulse:**
Incomplete (red/coral) readiness pips pulse their opacity between 0.5 and 1.0 on a slow loop (2 seconds per cycle). Each pip is staggered by 300ms so they don't pulse in sync.

```typescript
// For each incomplete pip at index i:
const pipOpacity = useSharedValue(0.5);

useEffect(() => {
  pipOpacity.value = withDelay(
    i * 300, // stagger
    withRepeat(
      withSequence(
        withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    )
  );
  return () => cancelAnimation(pipOpacity);
}, []);
```

Completed (green) pips do NOT pulse. They stay solid.

**3B. Volleyball rotation:**
The volleyball emoji/icon in the top-right corner rotates very slowly — one full rotation every 20 seconds.

```typescript
const rotation = useSharedValue(0);

useEffect(() => {
  rotation.value = withRepeat(
    withTiming(360, { duration: 20000, easing: Easing.linear }),
    -1,
    false
  );
  return () => cancelAnimation(rotation);
}, []);

const vballStyle = useAnimatedStyle(() => ({
  transform: [{ rotate: `${rotation.value}deg` }],
}));
```

---

## ANIMATION 4: MOMENTUM CARDS — STAGGER ENTRANCE + COUNT-UP

**File:** `components/coach-scroll/MomentumCardsRow.tsx`

**4A. Stagger entrance:**
On first mount, each card fades in and slides up, staggered 100ms apart.

```typescript
// For each card at index i:
const cardTranslateY = useSharedValue(20);
const cardOpacity = useSharedValue(0);

useEffect(() => {
  cardTranslateY.value = withDelay(i * 100, withSpring(0, { damping: 12, stiffness: 100 }));
  cardOpacity.value = withDelay(i * 100, withTiming(1, { duration: 300 }));
}, []);
```

**4B. Count-up numbers:**
The big number in each card counts up from 0 to its actual value over 600ms on first mount.

Use a shared value that animates from 0 to the target number, and display `Math.round()` of the current value in the UI.

```typescript
const displayValue = useSharedValue(0);

useEffect(() => {
  displayValue.value = withDelay(i * 100, withTiming(actualValue, { duration: 600, easing: Easing.out(Easing.ease) }));
}, []);
```

For the record display (e.g., "4-1"), count up the wins only: 0 → 4. The losses stay static.

Use `useDerivedValue` + `useAnimatedProps` or a `ReText` component if available. If `ReText` is not installed, use `runOnJS` to update a state variable — but minimize JS thread calls.

---

## ANIMATION 5: SQUAD FACES — STAGGER POP-IN

**File:** `components/coach-scroll/SquadFacesRow.tsx`

**What:** Each face circle pops in with a spring animation, 50ms apart. Scale from 0.8 to 1.0 with spring overshoot.

```typescript
// For each face at index i:
const faceScale = useSharedValue(0.8);
const faceOpacity = useSharedValue(0);

useEffect(() => {
  faceScale.value = withDelay(i * 50, withSpring(1.0, { damping: 8, stiffness: 150 }));
  faceOpacity.value = withDelay(i * 50, withTiming(1, { duration: 200 }));
}, []);
```

Limit to first 8 faces + the "+N" circle. The "+N" circle animates last.

---

## ANIMATION 6: SMART NUDGE — ATTENTION SHAKE

**File:** `components/coach-scroll/SmartNudgeCard.tsx`

**What:** On first mount, a brief horizontal shake — translateX oscillates ±3px twice, then settles. Fires ONCE only.

```typescript
const shakeX = useSharedValue(0);

useEffect(() => {
  shakeX.value = withDelay(
    500, // slight delay so it doesn't fire during scroll
    withSequence(
      withTiming(3, { duration: 60 }),
      withTiming(-3, { duration: 60 }),
      withTiming(3, { duration: 60 }),
      withTiming(-3, { duration: 60 }),
      withTiming(0, { duration: 60 })
    )
  );
}, []);
```

Do NOT loop this. One shake, then done.

---

## ANIMATION 7: ACTION GRID — PRESS SPRING

**File:** `components/coach-scroll/ActionGrid2x2.tsx`

**What:** On press, each cell scales to 0.95 then springs back to 1.0 with slight overshoot (1.02 → 1.0).

```typescript
const cellScale = useSharedValue(1);

const onPressIn = () => {
  cellScale.value = withTiming(0.95, { duration: 100 });
};
const onPressOut = () => {
  cellScale.value = withSpring(1.0, { damping: 10, stiffness: 200 });
};
```

Use `Pressable` with `onPressIn` and `onPressOut` instead of `TouchableOpacity` for better animation control. Or if TouchableOpacity is already used, add `onPressIn`/`onPressOut` handlers.

This is a per-cell animation — each cell needs its own shared value.

---

## ANIMATION 8: PULSE FEED — SLIDE-IN STAGGER

**File:** `components/coach-scroll/CoachPulseFeed.tsx`

**What:** Each feed item slides in from the right (translateX 20 → 0) and fades in (opacity 0 → 1), staggered 80ms apart. On first mount only.

```typescript
// For each item at index i:
const itemX = useSharedValue(20);
const itemOpacity = useSharedValue(0);

useEffect(() => {
  itemX.value = withDelay(i * 80, withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) }));
  itemOpacity.value = withDelay(i * 80, withTiming(1, { duration: 250 }));
}, []);
```

Limit stagger to first 5 items. Any items beyond 5 appear instantly.

---

## ANIMATION 9: TROPHY CASE — BADGE SHIMMER + XP BAR FILL

**File:** `components/coach-scroll/CoachTrophyCase.tsx`

**9A. XP bar fill:**
The XP progress bar fills from width 0% to its actual percentage over 800ms with an ease-out curve, on first mount.

```typescript
const xpWidth = useSharedValue(0);

useEffect(() => {
  xpWidth.value = withDelay(200, withTiming(actualPercentage, { duration: 800, easing: Easing.out(Easing.ease) }));
}, []);

// Use xpWidth.value as the width percentage in the animated style
```

**9B. Earned badge shimmer:**
Each earned badge has a subtle golden shimmer — a linear gradient highlight that sweeps across from left to right on a slow loop (every 5 seconds).

This is harder to implement in React Native. Two options:

**Option A (simpler):** A brief scale pulse when the badge first appears. Scale 1.0 → 1.05 → 1.0 with a subtle gold shadow increase. Loop every 5 seconds.

```typescript
const badgeScale = useSharedValue(1.0);

useEffect(() => {
  badgeScale.value = withRepeat(
    withSequence(
      withDelay(i * 500, withTiming(1.0, { duration: 3000 })), // wait
      withTiming(1.05, { duration: 400, easing: Easing.inOut(Easing.ease) }),
      withTiming(1.0, { duration: 400, easing: Easing.inOut(Easing.ease) })
    ),
    -1,
    false
  );
  return () => cancelAnimation(badgeScale);
}, []);
```

**Option B (actual shimmer — use if MaskedView or LinearGradient is available):** An animated translateX on an overlay gradient. Only attempt this if `expo-linear-gradient` or `react-native-masked-view` is in package.json. If not, go with Option A.

Locked badges have NO animation. Static only.

---

## ANIMATION 10: TEAM STATS BARS — FILL ANIMATION

**File:** `components/coach-scroll/TeamStatsChart.tsx`

**What:** Each stat bar fills from 0 to its actual width over 600ms, staggered 100ms apart, on first mount.

```typescript
// For each bar at index i:
const barWidth = useSharedValue(0);

useEffect(() => {
  barWidth.value = withDelay(i * 100, withTiming(actualWidth, { duration: 600, easing: Easing.out(Easing.ease) }));
}, []);
```

---

## ANIMATION 11: AMBIENT CLOSER — MASCOT SWAY

**File:** `components/coach-scroll/AmbientCloser.tsx`

**What:** The mascot at the bottom gently sways side to side — rotate between -2deg and 2deg on a 4-second loop.

```typescript
const rotation = useSharedValue(0);

useEffect(() => {
  rotation.value = withRepeat(
    withSequence(
      withTiming(2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      withTiming(-2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
    ),
    -1,
    false
  );
  return () => cancelAnimation(rotation);
}, []);

const swayStyle = useAnimatedStyle(() => ({
  transform: [{ rotate: `${rotation.value}deg` }],
}));
```

This should be a DIFFERENT motion than the breathing at the top — sway vs scale. Two different personalities of the same mascot.

---

## WHAT NOT TO ANIMATE

Do NOT add animations to:
- Section headers ("YOUR SQUAD", "TEAM PULSE", etc.)
- Text labels, timestamps, or metadata
- The notification bell or role pill in the header
- The team selector pill
- Card borders or shadows
- The tab bar
- Background colors

These stay rock solid and static. Animations work because they contrast with stillness.

---

## PERFORMANCE CHECKLIST

Before committing, verify:
- [ ] No jank on scroll — animations don't cause frame drops
- [ ] Loop animations have `cancelAnimation` in cleanup (useEffect return)
- [ ] Entrance animations use `useEffect` with empty deps `[]` — fire once only
- [ ] No `setState` calls inside animation callbacks (use `runOnJS` only if absolutely necessary)
- [ ] Stagger delays don't exceed 500ms total for any section (users shouldn't wait)
- [ ] All `useAnimatedStyle` hooks return transform/opacity only — no layout properties animated

---

## COMMIT

After implementing ALL animations:

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: Coach Home D micro-animations — breathing mascot, pip pulse, momentum count-up, squad pop-in, nudge shake, badge shimmer, bar reveals, closer sway"
git push
```

Then generate `COACH-HOME-D-ANIMATIONS-CHANGELOG.md`:
1. ANIMATIONS ADDED — list each animation with the file it was added to
2. ANIMATION LIBRARY USED — confirm all use react-native-reanimated
3. LOOP ANIMATIONS — list every animation that loops infinitely and confirm cleanup
4. PERFORMANCE NOTES — any concerns about scroll performance
5. REMAINING IDEAS — anything that was too complex to implement (like true gradient shimmer)
