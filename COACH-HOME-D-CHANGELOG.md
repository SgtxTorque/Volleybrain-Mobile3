# COACH-HOME-D-CHANGELOG.md
# Coach Home Scroll — D System Redesign Changelog

---

## 1. FILES CREATED

| File | Purpose |
|------|---------|
| `theme/d-system.ts` | D System design tokens (colors, radii) extending BRAND tokens |
| `components/coach-scroll/DynamicMessageBar.tsx` | Contextual colored bar below greeting (info/urgent/payment variants) |
| `components/coach-scroll/GameDayHeroCard.tsx` | Dark navy hero card with integrated readiness pips, action buttons, bottom strip |
| `components/coach-scroll/MomentumCardsRow.tsx` | Horizontal scroll gradient stat cards (streak, record, attendance, kills) |
| `components/coach-scroll/SquadFacesRow.tsx` | Overlapping circular avatars with "YOUR SQUAD" header |
| `components/coach-scroll/SmartNudgeCard.tsx` | Warm-toned contextual suggestion card (shoutout, scouting, attendance) |
| `components/coach-scroll/ActionGrid2x2.tsx` | 2x2 pastel action grid (Blast, Shoutout, Stats, Challenge) |
| `components/coach-scroll/CoachPulseFeed.tsx` | D System styled activity feed (replaces TeamPulse + ActivityFeed in coach scroll) |
| `components/coach-scroll/CoachTrophyCase.tsx` | Fortnite-style dark navy badge grid with rarity dots, level badge, XP bar |
| `components/coach-scroll/AmbientCloser.tsx` | Quiet contextual italic closing message at scroll bottom |

---

## 2. FILES MODIFIED

| File | What Changed | Why |
|------|-------------|-----|
| `components/CoachHomeScroll.tsx` | Restructured entire scroll JSX, replaced imports, removed old sections, added D System components, changed page background to #FAFBFE, removed unused animated styles and variables | D System redesign — new emotional arc scroll order |

---

## 3. FILES REMOVED FROM RENDER

These components were removed from CoachHomeScroll's JSX but their **files were NOT deleted** (per NO DOMINOES rule):

| Component | File Location | Reason Removed |
|-----------|---------------|----------------|
| PrepChecklist | `components/coach-scroll/PrepChecklist.tsx` | Readiness data merged into GameDayHeroCard pips |
| GamePlanCard | `components/coach-scroll/GamePlanCard.tsx` | Replaced by GameDayHeroCard |
| ScoutingContext | `components/coach-scroll/ScoutingContext.tsx` | Data feeds into SmartNudgeCard |
| QuickActions | `components/coach-scroll/QuickActions.tsx` | Replaced by ActionGrid2x2 |
| EngagementSection | `components/coach-scroll/EngagementSection.tsx` | Replaced by SmartNudgeCard |
| SeasonLeaderboardCard | `components/coach-scroll/SeasonLeaderboardCard.tsx` | Replaced by MomentumCardsRow |
| ActionItems | `components/coach-scroll/ActionItems.tsx` | Action items now in DynamicMessageBar + nudge |
| TeamHubPreviewCard | `components/coach-scroll/TeamHubPreviewCard.tsx` | Replaced by CoachPulseFeed |
| ActivityFeed | `components/coach-scroll/ActivityFeed.tsx` | Replaced by CoachPulseFeed |
| TeamPulse (shared) | `components/TeamPulse.tsx` | Replaced by CoachPulseFeed (shared file untouched) |
| TrophyCaseWidget (shared) | `components/TrophyCaseWidget.tsx` | Replaced by CoachTrophyCase (shared file untouched) |
| ChallengeQuickCard | `components/coach-scroll/ChallengeQuickCard.tsx` | Challenge access via ActionGrid2x2 |
| SeasonSetupCard | `components/coach-scroll/SeasonSetupCard.tsx` | Removed per D System scroll order |
| TeamHealthCard | `components/coach-scroll/TeamHealthCard.tsx` | Was already unused in scroll |
| Roster card (inline) | `components/CoachHomeScroll.tsx` (inline JSX) | Replaced by SquadFacesRow |

---

## 4. IMPORTS CHANGED

### Added to CoachHomeScroll.tsx:
- `import { D_COLORS } from '@/theme/d-system'`
- `import DynamicMessageBar from './coach-scroll/DynamicMessageBar'`
- `import GameDayHeroCard from './coach-scroll/GameDayHeroCard'`
- `import MomentumCardsRow from './coach-scroll/MomentumCardsRow'`
- `import SquadFacesRow from './coach-scroll/SquadFacesRow'`
- `import SmartNudgeCard from './coach-scroll/SmartNudgeCard'`
- `import ActionGrid2x2 from './coach-scroll/ActionGrid2x2'`
- `import CoachPulseFeed from './coach-scroll/CoachPulseFeed'`
- `import CoachTrophyCase from './coach-scroll/CoachTrophyCase'`
- `import AmbientCloser from './coach-scroll/AmbientCloser'`

### Removed from CoachHomeScroll.tsx:
- `import PrepChecklist from './coach-scroll/PrepChecklist'`
- `import GamePlanCard from './coach-scroll/GamePlanCard'`
- `import ScoutingContext from './coach-scroll/ScoutingContext'`
- `import QuickActions from './coach-scroll/QuickActions'`
- `import EngagementSection from './coach-scroll/EngagementSection'`
- `import TeamHealthCard from './coach-scroll/TeamHealthCard'`
- `import SeasonLeaderboardCard from './coach-scroll/SeasonLeaderboardCard'`
- `import ActionItems from './coach-scroll/ActionItems'`
- `import TeamHubPreviewCard from './coach-scroll/TeamHubPreviewCard'`
- `import ActivityFeed from './coach-scroll/ActivityFeed'`
- `import SeasonSetupCard from './coach-scroll/SeasonSetupCard'`
- `import TeamPulse from './TeamPulse'`
- `import ChallengeQuickCard from './coach-scroll/ChallengeQuickCard'`
- `import TrophyCaseWidget from './TrophyCaseWidget'`
- `import { withRepeat, withSequence, withTiming } from 'react-native-reanimated'` (unused after mascot float removal)

### Unchanged:
- All auth, navigation, theme, and utility imports remain identical
- `RoleSelector`, `GiveShoutoutModal`, `AchievementCelebrationModal` unchanged

---

## 5. NAVIGATION PRESERVED

All navigation destinations are identical to before:

| Action | Destination | Component |
|--------|-------------|-----------|
| Bell icon tap | `/notification` | Compact header |
| Start Game Day | `/game-day-command?eventId=X&teamId=X&opponent=X` | GameDayHeroCard |
| Roster action button | `/(tabs)/coach-roster` | GameDayHeroCard |
| Lineup action button | `/lineup-builder?eventId=X` | GameDayHeroCard |
| Stats action button | `/game-results?eventId=X` | GameDayHeroCard |
| Attend action button | `/attendance?eventId=X` | GameDayHeroCard |
| Empty state button | `/(tabs)/coach-schedule` | GameDayHeroCard |
| View All squad | `/roster?teamId=X` | SquadFacesRow |
| Send Blast | `/(tabs)/chats` | ActionGrid2x2 |
| Give Shoutout | Opens GiveShoutoutModal | ActionGrid2x2 + SmartNudgeCard |
| Review Stats | `/game-results` | ActionGrid2x2 |
| Create Challenge | `/create-challenge` | ActionGrid2x2 |
| See All pulse | `/(tabs)/connect` | CoachPulseFeed |
| Trophy case tap | `/achievements` | CoachTrophyCase |
| View All trophies | `/achievements` | AchievementCelebrationModal |
| Message bar tap | Various (game-day-command, coach-schedule, game-results) | DynamicMessageBar |

---

## 6. DATA HOOKS PRESERVED

- `useCoachHomeData` hook: **UNCHANGED** — not modified in any phase
- All Supabase queries: **UNCHANGED**
- Data flow: All new components consume the same data from `useCoachHomeData` that was previously fed to old components
- New components `CoachPulseFeed` and `CoachTrophyCase` have their own internal Supabase queries (same pattern as the shared `TeamPulse` and `TrophyCaseWidget` they replace)

---

## 7. TOKENS ADDED

### New file: `theme/d-system.ts`

| Token | Value | Purpose |
|-------|-------|---------|
| `D_COLORS.pageBg` | `#FAFBFE` | Page background |
| `D_COLORS.textAmbient` | `rgba(11,22,40,0.2)` | Ambient closer text |
| `D_COLORS.blastBg` | `#FFF0F0` | Action grid blast cell bg |
| `D_COLORS.blastIcon` | `#FFD4D4` | Action grid blast icon bg |
| `D_COLORS.shoutBg` | `#FFF8E1` | Action grid shoutout cell bg |
| `D_COLORS.shoutIcon` | `#FFE8A0` | Action grid shoutout icon bg |
| `D_COLORS.statsBg` | `#E8F8F5` | Action grid stats cell bg |
| `D_COLORS.statsIcon` | `#B2F5EA` | Action grid stats icon bg |
| `D_COLORS.challengeBg` | `#F0EDFF` | Action grid challenge cell bg |
| `D_COLORS.challengeIcon` | `#DDD6FE` | Action grid challenge icon bg |
| `D_COLORS.nudgeBgStart` | `#FFF8E1` | Smart nudge gradient start |
| `D_COLORS.nudgeBgEnd` | `#FFF0DB` | Smart nudge gradient end |
| `D_COLORS.streakStart/End` | `#FF6B6B / #e55039` | Momentum card gradient |
| `D_COLORS.recordStart/End` | `#22C55E / #0ea371` | Momentum card gradient |
| `D_COLORS.attendStart/End` | `#8B5CF6 / #6c2bd9` | Momentum card gradient |
| `D_COLORS.killsStart/End` | `#4BB9EC / #2980b9` | Momentum card gradient |
| `D_COLORS.mascotBgStart/End` | `#FFF3D6 / #FFE8A0` | Mascot avatar gradient |
| `D_COLORS.barInfo` | `#4BB9EC` | Message bar info border |
| `D_COLORS.barUrgent` | `#E76F51` | Message bar urgent border |
| `D_COLORS.barPayment` | `#F59E0B` | Message bar payment border |
| `D_RADII.hero` | `22` | Hero card border radius |
| `D_RADII.card` | `18` | Standard card radius |
| `D_RADII.cardSmall` | `14` | Small card radius |
| `D_RADII.actionCell` | `16` | Action grid cell radius |
| `D_RADII.pill` | `20` | Pill border radius |
| `D_RADII.badge` | `14` | Badge cell radius |
| `D_RADII.momentum` | `16` | Momentum card radius |

No existing tokens in `theme/colors.ts`, `theme/spacing.ts`, or `lib/design-tokens.ts` were modified.

---

## 8. KNOWN ISSUES

1. **Outfit font not available**: The spec references "Outfit 17px weight 800" but Outfit is not loaded in the app. Used `PlusJakartaSans_800ExtraBold` as substitute throughout. Visually very close.

2. **SquadFacesRow limited data**: The component can only show initials from `topPerformers` (max 3 names from the hook). Remaining avatar circles show `?` initial. A future enhancement could add a roster query, but this would require touching `useCoachHomeData` (MUST NOT MODIFY).

3. **Win Streak calculation**: MomentumCardsRow uses `seasonRecord.wins` as the "streak" value, which is actually total season wins, not consecutive wins. The hook doesn't provide a streak count. This is a display approximation.

4. **SeasonSetupCard removed**: The spec said "keep if it handles pre-season state." It does handle pre-season, but was removed per the final D System scroll order which doesn't include it. The file is untouched and can be re-added if needed.

5. **In-scroll team pills removed**: The compact greeting has a team-cycling pill for multi-team coaches, plus the sticky header has team pills. The separate in-scroll team pills row was removed as redundant. Coaches with 1 team won't see any pill (correct behavior).

6. **No grayscale filter on locked badges**: The spec asks for "grayscale emoji at 25% opacity" on locked badges in CoachTrophyCase. React Native doesn't natively support grayscale filters on Text. Used opacity 0.25 instead, which achieves a similar visual muted effect.

---

## 9. SCREENSHOTS NEEDED

Manual testing should verify these states:

- [ ] **Game day** — Hero card shows with readiness pips, START GAME DAY button, message bar urgent
- [ ] **Non-game day with upcoming event** — Hero card shows next event, no readiness pips, message bar info
- [ ] **No events at all** — Hero card shows empty state with "Create one?" CTA
- [ ] **Multiple teams** — Team pill in greeting cycles between teams; sticky header pills work
- [ ] **Single team** — No team pill shown in greeting
- [ ] **No organization** — NoOrgState renders correctly
- [ ] **No teams** — NoTeamState renders correctly
- [ ] **Strong season record** — Momentum cards show streak + record, ambient closer shows season message
- [ ] **No stats/games** — Momentum cards hidden, trophy case shows empty/locked badges
- [ ] **Player with standout stats** — SmartNudgeCard shows shoutout suggestion
- [ ] **Pull to refresh** — RefreshControl works, data reloads
- [ ] **Scroll animations** — Greeting fades, hero card scales, compact header appears
- [ ] **Action grid** — All 4 cells navigate correctly
- [ ] **Team Pulse feed** — Shows recent activity items with timestamps
- [ ] **Trophy case** — Badge grid, rarity dots, XP bar, level badge all render
- [ ] **Ambient closer** — Shows contextual italic message at bottom
- [ ] **Tablet layout** — Responsive max-width and padding apply correctly
