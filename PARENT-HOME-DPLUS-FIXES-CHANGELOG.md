# Parent Home D+ Fixes Changelog

Branch: `navigation-cleanup-complete`
Commits: `6a3f529` through `bcd3d9e` (10 fixes)
Spec: `CC-PARENT-HOME-DPLUS-FIXES.md`

---

## 1. FILES CREATED

| File | Purpose |
|------|---------|
| `components/parent-scroll/LynxGreetings.ts` | Dynamic context-aware greeting system — priority waterfall with daily-consistent random picks |
| `components/parent-scroll/ParentTeamHubCard.tsx` | Team Hub preview cards with pulse notification, shimmer sweep, and entrance animations |

## 2. FILES MODIFIED

| File | Changes |
|------|---------|
| `components/parent-scroll/FamilyHeroCard.tsx` | Fix 1: Dynamic greeting via `getParentGreeting()`. Fix 2: Mascot repositioned to flex row, 85px. Fix 3: XP bar + level inside hero with animated fill. Fix 8A: Greeting text fade-in (300ms). |
| `components/parent-scroll/ParentPaymentNudge.tsx` | Fix 4: Full amber-tinted bg replacing side-border. Fix 8B: Slide-in from left (translateX -20→0, opacity 0→1, 300ms). |
| `components/parent-scroll/ParentAttentionStrip.tsx` | Fix 4: Full coral-tinted bg replacing side-border. Fix 8C: LayoutAnimation expand/collapse + stagger-fade items via `StaggerItem` sub-component. |
| `components/parent-scroll/FamilyKidCard.tsx` | Fix 5: Handles both single-child (60px avatar full card) and multi-child (56px overlapping circles with `PopAvatar` stagger pop-in). Deduplicates by playerId. |
| `components/parent-scroll/ParentMomentumRow.tsx` | Fix 7: Added `paddingVertical: 8` to `scrollContent` for card shadow clipping. |
| `components/parent-scroll/ParentEventHero.tsx` | Fix 8D: Card entrance (slide up 15px + fade), XP chip pulse (scale 1.0→1.1→1.0, 3s loop). All hooks above early return. |
| `components/parent-scroll/FamilyPulseFeed.tsx` | Fix 8E: Staggered fade-in per item (60ms apart, first 5 items) via `PulseItem` sub-component. |
| `components/parent-scroll/ParentTrophyBar.tsx` | Fix 8F: Badge pop-in spring (staggered 50ms) via `PopBadge` sub-component. XP bar fill 0%→actual over 800ms. |
| `components/parent-scroll/ParentAmbientCloser.tsx` | Fix 8G: Mascot gentle sway rotation (-2deg↔2deg, 4-second loop) with `cancelAnimation` cleanup. |
| `components/ParentHomeScroll.tsx` | Fix 3: Removed standalone `<ParentXPBar>` from render. Fix 5: Single `<FamilyKidCard>` call with kids/nextEvents/onOpenFamilyPanel props. Fix 6: Added `<ParentTeamHubCard>` between FamilyPulseFeed and ParentTrophyBar. Fix 9: Derived `isGameDay`, `isPracticeDay`, `winStreak` from real event data. |

## 3. ISSUES FIXED

| Fix | Problem | Solution |
|-----|---------|----------|
| Fix 1 | Static "Good morning/The Family" greeting | Dynamic Lynx-tone greetings with context-aware priority waterfall |
| Fix 2 | Mascot too small (44px), absolute-positioned in corner | Flexbox row layout, mascot 85px, vertically centered on right |
| Fix 3 | XP bar was a standalone component below hero | XP bar + level moved inside hero card with animated gold gradient fill |
| Fix 4 | Side-border accent on nudge/strip felt outdated | Full card tinted backgrounds with subtle borders, borderRadius 14 |
| Fix 5 | Individual full cards per child took too much space | Single-child: full card (60px avatar). Multi-child: compact circle avatars with stagger pop-in |
| Fix 6 | No Team Hub preview on parent home | Premium cards with entrance animation, shimmer sweep, and pulsing notification pill |
| Fix 7 | Momentum row card shadows clipped by ScrollView | Added `paddingVertical: 8` to `contentContainerStyle` |
| Fix 8 | Static, flat components lacked life | Micro-animations across 7 components: fade-ins, slide-ins, pop-ins, pulses, sway |
| Fix 9 | Hero greeting always showed time-of-day defaults | Derives `isGameDay`, `isPracticeDay`, `winStreak` from actual event data |
| Fix 10 | No documentation of changes | This changelog |

## 4. NAVIGATION PRESERVED

All tap targets verified in code:
- FamilyHeroCard → no navigation (info only)
- PaymentNudge → `/family-payments`
- AttentionStrip items → `item.route` (dynamic per item)
- FamilyKidCard single → `/family-gallery`
- FamilyKidCard multi → opens FamilyPanel
- ParentEventHero → RSVP toggle + `/directions` (maps)
- FamilyPulseFeed → `/(tabs)/connect`, `/(tabs)/chats`, `/standings`
- ParentTeamHubCard → `/(tabs)/parent-team-hub`
- ParentTrophyBar → `/achievements`
- ParentAmbientCloser → no navigation (closing message)

## 5. ANIMATIONS ADDED

| Animation | File | Type |
|-----------|------|------|
| Greeting fade-in (opacity 0→1, 300ms) | FamilyHeroCard | Entrance (once) |
| Mascot breathing (scale 1.0↔1.03, 4s loop) | FamilyHeroCard | Loop |
| XP bar fill (0%→actual, 800ms easeOut, 200ms delay) | FamilyHeroCard | Entrance (once) |
| Slide-in from left (translateX -20→0, 300ms) | ParentPaymentNudge | Entrance (once) |
| LayoutAnimation expand/collapse | ParentAttentionStrip | Interactive |
| Stagger-fade items (60ms apart) | ParentAttentionStrip | Entrance (on expand) |
| Stagger pop-in circles (scale 0.8→1.0, 50ms stagger) | FamilyKidCard (PopAvatar) | Entrance (once) |
| Card entrance (slide up 15px + fade) | ParentEventHero | Entrance (once) |
| XP chip pulse (scale 1.0→1.1→1.0, 3s loop) | ParentEventHero | Loop |
| Stagger fade-in items (60ms apart) | FamilyPulseFeed (PulseItem) | Entrance (once) |
| Badge pop-in spring (50ms stagger) | ParentTrophyBar (PopBadge) | Entrance (once) |
| XP bar fill (0%→actual, 800ms easeOut, 300ms delay) | ParentTrophyBar | Entrance (once) |
| Mascot sway rotation (-2deg↔2deg, 4s loop) | ParentAmbientCloser | Loop |
| Card entrance (slide up 20px + fade, spring) | ParentTeamHubCard (HubCard) | Entrance (once) |
| Notification pill pulse (scale 1.0→1.2→1.0, 2s loop) | ParentTeamHubCard (HubCard) | Loop |
| Shimmer sweep (translateX, 4s loop) | ParentTeamHubCard (HubCard) | Loop (conditional) |

## 6. LOOP ANIMATIONS — cancelAnimation CLEANUP

| File | Hook | Cleanup |
|------|------|---------|
| FamilyHeroCard | `mascotScale` breathing | `cancelAnimation(mascotScale)` in useEffect return |
| ParentEventHero | `xpChipScale` pulse | `cancelAnimation(xpChipScale)` in useEffect return |
| ParentAmbientCloser | `swayRotation` sway | `cancelAnimation(swayRotation)` in useEffect return |
| ParentTeamHubCard (HubCard) | `pillScale`, `shimmerX`, `translateY`, `cardOpacity` | All four `cancelAnimation()` in useEffect return |

## 7. HOOKS PLACEMENT

All hooks (useState, useEffect, useSharedValue, useAnimatedStyle, useMemo, useDerivedValue) are placed ABOVE all early returns in every modified file. Per-item animation hooks are isolated in sub-components:
- `PopAvatar` (FamilyKidCard)
- `PopBadge` (ParentTrophyBar)
- `PulseItem` (FamilyPulseFeed)
- `StaggerItem` (ParentAttentionStrip)
- `HubCard` (ParentTeamHubCard)

## 8. SHARED COMPONENTS — NOT MODIFIED

Confirmed untouched:
- `components/TrophyCaseWidget.tsx`
- `components/TeamPulse.tsx`
- `components/parent-scroll/DayStripCalendar.tsx`
- `hooks/useParentHomeData.ts`
- All coach-scroll, player-scroll, admin files
- All `app/` route files

## 9. KNOWN ISSUES

1. **`childXp` naming**: The hook returns `childXp` but it's actually the parent's XP data. Used as `parentXp` prop in FamilyHeroCard.
2. **justWon/justLost**: Always `false` — no individual game result data available in `useParentHomeData`. Falls through to time-of-day greetings unless game day or practice day.
3. **winStreak**: Uses `seasonRecord.wins` as a proxy, not actual consecutive streak. Greeting requires ≥3 to trigger streak message.
4. **Team Hub "New" pill**: Based on `latestPost` age (within 7 days). No per-team unread count available — all team cards show "New" if any post is recent.

## 10. SCREENSHOTS NEEDED

Test states:
- [ ] Single child — full card with 60px avatar, team, event pill, level
- [ ] Multi-child (2+ kids) — compact circle avatars with names, "Tap to see your family" link
- [ ] Game day — hero greeting shows game day message
- [ ] Practice day — hero greeting shows practice day message
- [ ] No events — ambient closer + event hero empty state
- [ ] Payment due — amber nudge bar, greeting references balance
- [ ] No payment — nudge bar hidden
- [ ] Multi-team — horizontal scrolling Team Hub cards with "TEAM HUBS" header
- [ ] Single team — one prominent Team Hub card
- [ ] Recent post — "New" pill pulsing on Team Hub card
- [ ] Attention items — expandable strip with stagger-fade items
- [ ] Trophy bar — badge pop-in + XP bar fill animation
- [ ] Momentum row — no shadow clipping on card edges
