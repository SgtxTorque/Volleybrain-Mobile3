# PARENT-HOME-DPLUS-CHANGELOG.md
# Parent Home Scroll — D+ System Redesign Changelog

---

## 1. FILES CREATED

| File | Purpose |
|------|---------|
| `components/parent-scroll/FamilyHeroCard.tsx` | Dark navy family identity hero card with "The [LastName] Family", mascot breathing animation |
| `components/parent-scroll/ParentPaymentNudge.tsx` | Amber payment nudge bar — tappable, only renders when balance due |
| `components/parent-scroll/ParentAttentionStrip.tsx` | Expandable attention strip with urgency dots and item list |
| `components/parent-scroll/FamilyKidCard.tsx` | Rich per-child card with avatar, sport badge, team, next event, level |
| `components/parent-scroll/ParentXPBar.tsx` | Compact parent XP progress bar with amber gradient fill |
| `components/parent-scroll/ParentEventHero.tsx` | Dark navy event hero card with +XP chip on RSVP button, directions |
| `components/parent-scroll/ParentMomentumRow.tsx` | Horizontal scroll gradient stat cards (Record, Balance, Level, Streak) |
| `components/parent-scroll/FamilyPulseFeed.tsx` | Activity feed combining team hub posts, chat messages, season records |
| `components/parent-scroll/ParentTrophyBar.tsx` | Compact dark navy trophy bar with badge circles and XP progress |
| `components/parent-scroll/ParentAmbientCloser.tsx` | Contextual closing message with SleepLynx mascot, references children and events |

---

## 2. FILES MODIFIED

| File | What Changed | Why |
|------|-------------|-----|
| `components/ParentHomeScroll.tsx` | Replaced welcome section with FamilyHeroCard, removed old sections, added all new D+ components, changed page background to D_COLORS.pageBg, added `useSeason` and `D_COLORS` imports, extracted `lastName`, removed DayStripCalendar sticky overlay | D+ System redesign — family-first emotional arc scroll order |
| `theme/d-system.ts` | Added 16 new parent-specific D+ tokens | Parent D+ components need dedicated color tokens |

---

## 3. FILES REMOVED FROM RENDER

These components were removed from ParentHomeScroll's JSX but their **files were NOT deleted** (per NO DOMINOES rule):

| Component | File Location | Reason Removed |
|-----------|---------------|----------------|
| Welcome section (inline) | `components/ParentHomeScroll.tsx` (inline JSX) | Replaced by FamilyHeroCard |
| DayStripCalendar (sticky) | `components/parent-scroll/DayStripCalendar.tsx` | Removed from parent home — lives in Schedule tab |
| BillboardHero | `components/parent-scroll/BillboardHero.tsx` | Replaced by ParentEventHero |
| AlsoStrip | `components/parent-scroll/AlsoStrip.tsx` | Secondary events live in Schedule tab |
| AttentionBanner | `components/parent-scroll/AttentionBanner.tsx` | Replaced by ParentAttentionStrip |
| Single child card (inline) | `components/ParentHomeScroll.tsx` (inline JSX) | Replaced by FamilyKidCard |
| Multi child avatar row (inline) | `components/ParentHomeScroll.tsx` (inline JSX) | Replaced by FamilyKidCard |
| AmbientCelebration | `components/parent-scroll/AmbientCelebration.tsx` | Data moved to FamilyPulseFeed |
| ChallengeVerifyCard | `components/parent-scroll/ChallengeVerifyCard.tsx` | Can live in More/drawer |
| ParentEvaluationCard | `components/parent-scroll/EvaluationCard.tsx` | Can live in More/drawer |
| MetricGrid | `components/parent-scroll/MetricGrid.tsx` | Replaced by ParentMomentumRow |
| TeamHubPreview | `components/parent-scroll/TeamHubPreview.tsx` | Replaced by FamilyPulseFeed |
| FlatChatPreview | `components/parent-scroll/FlatChatPreview.tsx` | Replaced by FamilyPulseFeed |
| SeasonSnapshot | `components/parent-scroll/SeasonSnapshot.tsx` | Replaced by ParentMomentumRow |
| RecentBadges | `components/parent-scroll/RecentBadges.tsx` | Data moved to FamilyPulseFeed |
| TrophyCaseWidget (shared) | `components/TrophyCaseWidget.tsx` | Replaced by ParentTrophyBar (shared file untouched) |
| RegistrationStatusCard | `components/parent-scroll/RegistrationStatusCard.tsx` | Moved to attention strip items |
| RegistrationCard (top) | `components/parent-scroll/RegistrationCard.tsx` | Top instance removed; bottom variant kept |
| IncompleteProfileCard | `components/parent-scroll/IncompleteProfileCard.tsx` | Moved to attention strip items |
| ContextBar | `components/parent-scroll/ContextBar.tsx` | Child switching handled by kid cards |

---

## 4. IMPORTS CHANGED

### Added to ParentHomeScroll.tsx:
- `import { useSeason } from '@/lib/season'`
- `import { D_COLORS } from '@/theme/d-system'`
- `import FamilyHeroCard from './parent-scroll/FamilyHeroCard'`
- `import ParentPaymentNudge from './parent-scroll/ParentPaymentNudge'`
- `import ParentAttentionStrip from './parent-scroll/ParentAttentionStrip'`
- `import FamilyKidCard from './parent-scroll/FamilyKidCard'`
- `import ParentXPBar from './parent-scroll/ParentXPBar'`
- `import ParentEventHero from './parent-scroll/ParentEventHero'`
- `import ParentMomentumRow from './parent-scroll/ParentMomentumRow'`
- `import FamilyPulseFeed from './parent-scroll/FamilyPulseFeed'`
- `import ParentTrophyBar from './parent-scroll/ParentTrophyBar'`
- `import ParentAmbientCloser from './parent-scroll/ParentAmbientCloser'`

### Still imported but no longer used in render:
- `DayStripCalendar` — import kept for backward compat, not rendered
- `BillboardHero` — import kept, not rendered
- `AttentionBanner` — import kept, not rendered
- `MetricGrid` — import kept, not rendered
- `ContextBar` — import kept, not rendered
- `TeamHubPreview` — import kept, not rendered
- `SeasonSnapshot` — import kept, not rendered
- `RecentBadges` — import kept, not rendered
- `AlsoStrip` — import kept, not rendered
- `AmbientCelebration` — import kept, not rendered
- `FlatChatPreview` — import kept, not rendered
- `ChallengeVerifyCard` — import kept, not rendered
- `ParentEvaluationCard` — import kept, not rendered
- `RegistrationStatusCard` — import kept, not rendered
- `IncompleteProfileCard` — import kept, not rendered
- `TrophyCaseWidget` — import kept, not rendered (still used by achievement celebration modal theme)

### Unchanged:
- All auth, navigation, theme, and utility imports remain
- `RoleSelector`, `LevelUpCelebrationModal`, `AchievementCelebrationModal`, `FamilyPanel` unchanged

---

## 5. NAVIGATION PRESERVED

All navigation destinations are identical to before:

| Action | Destination | Component |
|--------|-------------|-----------|
| Bell icon tap | `/notification` | Compact header |
| Payment nudge tap | `/family-payments` | ParentPaymentNudge |
| Attention item tap | Various (parent-schedule, family-payments, child-detail, my-waivers) | ParentAttentionStrip |
| Kid card tap | `/family-gallery` | FamilyKidCard |
| RSVP button tap | `data.rsvpEvent()` callback | ParentEventHero |
| Directions button tap | Maps/Google Maps deep link | ParentEventHero |
| Momentum Record card | `/standings` | ParentMomentumRow |
| Momentum Balance card | `/family-payments` | ParentMomentumRow |
| Momentum Level card | `/achievements` | ParentMomentumRow |
| Momentum Streak card | `/standings` | ParentMomentumRow |
| Pulse feed post item | `/(tabs)/connect` | FamilyPulseFeed |
| Pulse feed chat item | `/(tabs)/chats` | FamilyPulseFeed |
| Pulse feed season item | `/standings` | FamilyPulseFeed |
| Trophy bar tap | `/achievements` | ParentTrophyBar |
| View All trophies | `/achievements` | AchievementCelebrationModal |

---

## 6. DATA HOOKS PRESERVED

- `useParentHomeData` hook: **UNCHANGED** — not modified in any phase
- `useScrollAnimations` hook: **UNCHANGED**
- All Supabase queries: **UNCHANGED**
- Data flow: All new components consume the same data from `useParentHomeData` that was previously fed to old components
- New components `ParentTrophyBar` has its own internal Supabase queries (same pattern as the shared `TrophyCaseWidget` it replaces)

---

## 7. TOKENS ADDED

### In `theme/d-system.ts` (16 new tokens):

| Token | Value | Purpose |
|-------|-------|---------|
| `D_COLORS.familyHeroBgStart` | `#0B1628` | Family hero card gradient start |
| `D_COLORS.familyHeroBgEnd` | `#162d50` | Family hero card gradient end |
| `D_COLORS.paymentNudgeBg` | `rgba(245,158,11,0.06)` | Payment nudge bar background |
| `D_COLORS.paymentNudgeBorder` | `#F59E0B` | Payment nudge left border |
| `D_COLORS.attentionBg` | `#FFF5F5` | Attention strip background |
| `D_COLORS.attentionBorder` | `#FF6B6B` | Attention strip left border |
| `D_COLORS.kidCardBorder` | `rgba(75,185,236,0.25)` | Kid card border (available for future use) |
| `D_COLORS.kidCardActiveBg` | `rgba(75,185,236,0.05)` | Kid card active background (available for future use) |
| `D_COLORS.xpBarBg` | `rgba(245,158,11,0.12)` | XP bar background |
| `D_COLORS.xpBarFill` | `#F59E0B` | XP bar fill color / XP value text |
| `D_COLORS.eventHeroBgStart` | `#0B1628` | Event hero card gradient start |
| `D_COLORS.eventHeroBgEnd` | `#162d50` | Event hero card gradient end |
| `D_COLORS.rsvpButtonBg` | `#4BB9EC` | RSVP button default background |
| `D_COLORS.balanceStart` | `#FF6B6B` | Balance momentum card gradient start |
| `D_COLORS.balanceEnd` | `#e55039` | Balance momentum card gradient end |
| `D_COLORS.levelStart` | `#8B5CF6` | Level momentum card gradient start |
| `D_COLORS.levelEnd` | `#6c2bd9` | Level momentum card gradient end |

No existing tokens in `theme/colors.ts`, `theme/spacing.ts`, `theme/fonts.ts`, or existing `theme/d-system.ts` tokens were modified.

---

## 8. HOOKS PLACEMENT

All hooks are placed ABOVE all early returns in every component:

| Component | Hooks | Early Return | Status |
|-----------|-------|-------------|--------|
| FamilyHeroCard | useSharedValue, useEffect, useAnimatedStyle | None | ✅ |
| ParentPaymentNudge | useRouter | `if (balance <= 0) return null` — after hook | ✅ |
| ParentAttentionStrip | useState, useRouter | `if (count <= 0) return null` — after hooks | ✅ |
| FamilyKidCard | useRouter | None | ✅ |
| ParentXPBar | None (no hooks) | `if (totalXp <= 0) return null` | ✅ |
| ParentEventHero | None (no hooks in render) | `if (!event)` renders empty state (no early null return) | ✅ |
| ParentMomentumRow | useRouter | `if (cards.length === 0) return null` — after hook | ✅ |
| FamilyPulseFeed | useRouter | `if (items.length === 0) return null` — after hook | ✅ |
| ParentTrophyBar | useRouter, useState ×3, useEffect | `if (loading) return null` — after ALL hooks | ✅ |
| ParentAmbientCloser | None (no hooks) | None | ✅ |

---

## 9. SHARED COMPONENTS

- **TrophyCaseWidget.tsx**: NOT MODIFIED. Replaced in parent render by ParentTrophyBar. File untouched.
- **DayStripCalendar.tsx**: NOT MODIFIED. Removed from parent render (lives in Schedule tab). File untouched.
- **TeamPulse.tsx**: NOT MODIFIED. Not used by parent scroll.
- **FamilyPanel.tsx**: NOT MODIFIED. Still rendered outside the scroll.

---

## 10. KNOWN ISSUES

1. **Outfit font not available**: The spec references "Outfit" font but it's not loaded in the app. Used `PlusJakartaSans_800ExtraBold` as substitute throughout (same as coach redesign).

2. **Win streak approximation**: ParentMomentumRow uses `seasonRecord.wins` as "Win Streak" value, which is total season wins, not consecutive wins. The hook doesn't provide a streak count.

3. **Parent XP uses child XP data**: The `ParentXPBar` currently uses `data.childXp` from the first child since `useParentHomeData` doesn't expose separate parent-specific XP. The `ParentTrophyBar` has its own `fetchUserXP` call for the parent's actual XP.

4. **Unused imports remain**: Several old component imports remain in ParentHomeScroll.tsx (DayStripCalendar, BillboardHero, AttentionBanner, etc.) even though they're no longer rendered. These are intentionally kept to avoid breaking the import graph and can be cleaned up in a future pass.

5. **Old message cycling still runs**: The `buildDynamicMessages` function, message cycling useEffect, and related animated values (messageFade, mascotFloat) still execute even though the cycling message UI was removed from the render. These are harmless (no visual effect) but could be cleaned up.

6. **FamilyPulseFeed limited data**: The pulse feed currently combines team hub post, chat preview, and season record. It doesn't yet surface individual badge/game/shoutout activity per child since that data isn't available from `useParentHomeData` without query changes.

---

## 11. SCREENSHOTS NEEDED

Manual testing should verify these states:

- [ ] **Multi-child family** — Multiple FamilyKidCards render, each with correct child data
- [ ] **Single child** — Single FamilyKidCard with sport badge, team name, next event, level
- [ ] **No children** — NoTeamState empty state renders correctly
- [ ] **No organization** — NoOrgState renders correctly
- [ ] **Payment due** — ParentPaymentNudge shows amber bar with balance amount
- [ ] **No payment due** — ParentPaymentNudge hidden
- [ ] **Attention items** — ParentAttentionStrip shows count, expands to reveal items
- [ ] **No attention items** — ParentAttentionStrip hidden
- [ ] **Game day** — ParentEventHero shows game with RSVP button and +XP chip
- [ ] **Practice day** — ParentEventHero shows practice with RSVP button
- [ ] **No events** — ParentEventHero shows empty state with SleepLynx
- [ ] **RSVP cycle** — Tapping RSVP cycles through yes/maybe/no states
- [ ] **Directions button** — Opens Maps with venue address
- [ ] **Momentum cards** — Record, Balance, Level cards render with correct data
- [ ] **No season data** — Momentum cards section hidden
- [ ] **Family Pulse feed** — Shows team post, chat message, season record
- [ ] **Trophy bar** — Dark navy bar with badge circles and XP progress
- [ ] **Ambient closer** — Contextual message at bottom with SleepLynx mascot
- [ ] **Family hero card** — Dark navy with last name, child/team counts, mascot breathing
- [ ] **Page background** — Light #FAFBFE background throughout
- [ ] **Pull to refresh** — RefreshControl works, data reloads
- [ ] **Compact header** — Appears on scroll up with bell icon and role selector
- [ ] **Tablet layout** — Responsive max-width and padding apply correctly
