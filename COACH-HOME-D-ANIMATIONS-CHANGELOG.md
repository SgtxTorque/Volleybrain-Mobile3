# COACH-HOME-D-ANIMATIONS-CHANGELOG.md
# Coach Home D System — Micro-Animations Changelog

---

## 1. ANIMATIONS ADDED

| # | Animation | File | Description |
|---|-----------|------|-------------|
| 1 | Mascot Breathing | `CoachHomeScroll.tsx` | Mascot image gently scales 1.0→1.03→1.0 on continuous 4s loop |
| 2 | Message Bar Slide-In | `DynamicMessageBar.tsx` | Bar slides in from left (translateX -20→0) and fades in (opacity 0→1) over 300ms on mount |
| 3A | Readiness Pip Pulse | `GameDayHeroCard.tsx` | Incomplete (coral) pips pulse opacity 0.5→1.0 on 2s loop, staggered 300ms apart. Done (green) pips stay solid |
| 3B | Volleyball Rotation | `GameDayHeroCard.tsx` | Volleyball emoji rotates one full turn every 20s, continuous |
| 4A | Momentum Stagger Entrance | `MomentumCardsRow.tsx` | Each card fades in + springs up (translateY 20→0), staggered 100ms apart |
| 4B | Momentum Count-Up | `MomentumCardsRow.tsx` | Big numbers count from 0 to actual value over 600ms with ease-out. Record "X-Y" animates wins only |
| 5 | Squad Faces Pop-In | `SquadFacesRow.tsx` | Each avatar scales 0.8→1.0 with spring overshoot + fade-in, staggered 50ms apart |
| 6 | Smart Nudge Shake | `SmartNudgeCard.tsx` | Brief horizontal shake (±3px × 2) after 500ms delay on mount. Fires once only |
| 7 | Action Grid Press Spring | `ActionGrid2x2.tsx` | Each cell scales to 0.95 on press-in, springs back to 1.0 on press-out with slight overshoot |
| 8 | Pulse Feed Slide-In | `CoachPulseFeed.tsx` | Each item slides in from right (translateX 20→0) + fades in, staggered 80ms. Limited to first 5 items |
| 9A | XP Bar Fill | `CoachTrophyCase.tsx` | XP progress bar fills from 0% to actual percentage over 800ms with ease-out, 200ms delay |
| 9B | Earned Badge Shimmer | `CoachTrophyCase.tsx` | Earned badges pulse scale 1.0→1.05→1.0 every ~4s, staggered by 500ms. Locked badges stay static |
| 10 | Stats Bar Fill | `TeamStatsChart.tsx` | Each stat bar fills from 0% to actual width over 600ms, staggered 100ms apart |
| 11 | Mascot Sway | `AmbientCloser.tsx` | Mascot image sways ±2deg rotation on 4s loop (different from top mascot's breathing scale) |

---

## 2. ANIMATION LIBRARY USED

All animations use `react-native-reanimated` (~4.1.1):
- `useSharedValue`, `useAnimatedStyle` for all animated values
- `withTiming` for linear/eased transitions
- `withSpring` for spring physics (squad pop-in, action grid press)
- `withRepeat` + `withSequence` for loops
- `withDelay` for staggered entrances
- `cancelAnimation` for loop cleanup
- `Easing` for custom curves
- `useAnimatedReaction` + `runOnJS` only for momentum count-up display (unavoidable — no ReText available)

No basic React Native `Animated` API was used anywhere.

---

## 3. LOOP ANIMATIONS (require cleanup)

| Animation | Shared Value | Cleanup |
|-----------|-------------|---------|
| Mascot Breathing | `mascotScale` | `cancelAnimation(mascotScale)` in useEffect return |
| Pip Pulse (per pip) | `pipOpacity` | `cancelAnimation(pipOpacity)` in useEffect return |
| Volleyball Rotation | `vballRotation` | `cancelAnimation(vballRotation)` in useEffect return |
| Earned Badge Shimmer (per badge) | `scale` | `cancelAnimation(scale)` in useEffect return |
| Mascot Sway | `swayRotation` | `cancelAnimation(swayRotation)` in useEffect return |

All loop animations have cleanup. All one-shot animations (shake, stagger entrances, bar fills, count-up) do NOT loop and do NOT need cleanup.

---

## 4. PERFORMANCE NOTES

- **Stagger limits respected**: Momentum max 4×100ms = 400ms, Squad max 8×50ms = 400ms, Pulse max 5×80ms = 400ms, Stats max 5×100ms = 500ms — all under the 500ms ceiling
- **Count-up uses runOnJS**: The momentum card count-up animation requires `useAnimatedReaction` + `runOnJS(setDisplayNum)` to display animated numbers in `<Text>`. This fires during the 600ms animation (~36 frames) then stops. Acceptable one-time cost.
- **All animated styles use transform/opacity only**: No layout properties (width, height, padding, margin) are animated via useAnimatedStyle, except XP bar and stat bars which animate `width` percentage (necessary for bar fill effect)
- **Per-component shared values**: Sub-components (PulsingPip, AnimatedCard, PopFace, SpringCell, SlideItem, AnimatedBadge, AnimatedBar) each own their shared values, preventing array management complexity
- **React.memo preserved**: All parent components retain `React.memo` wrapping

---

## 5. REMAINING IDEAS

- **True gradient shimmer on badges**: Would require `react-native-masked-view` or animated translateX on a LinearGradient overlay. Opted for Option A (scale pulse) since MaskedView isn't in the dependency tree
- **Scroll-triggered entrance animations**: Currently all entrances fire on mount. Could be upgraded to fire when the section enters the viewport using `useAnimatedScrollHandler` intersection detection, but this adds complexity with minimal visual benefit since sections are close together in the scroll
- **Parallax on momentum cards**: Horizontal scroll parallax on the gradient cards — subtle but would require an inner AnimatedScrollView handler
- **Trophy level badge glow pulse**: The gold circle level indicator could have a subtle shadow pulse, but animating `shadowOpacity` causes performance issues on Android
