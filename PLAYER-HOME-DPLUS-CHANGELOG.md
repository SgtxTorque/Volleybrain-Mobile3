# Player Home D+ Redesign Changelog

Branch: `navigation-cleanup-complete`
Spec: `CC-PLAYER-HOME-DPLUS-REDESIGN.md`

---

## 1. FILES CREATED

| File | Purpose |
|------|---------|
| `components/player-scroll/PlayerLynxGreetings.ts` | Context-aware hype-coach greeting system with priority waterfall (game day, after win, streak, badge, challenge, time-of-day) |
| `components/player-scroll/PlayerIdentityHero.tsx` | Compact hero card: dynamic greeting (main text), streak fire pill, player photo, name/team/position, level badge + animated XP bar, breathing mascot |
| `components/player-scroll/PlayerDailyQuests.tsx` | "TODAY'S QUESTS" — 3 quests from existing data (Open Lynx, event/challenge/stats, props/badge/leaderboard). DISPLAY ONLY, no actual XP awards yet. |
| `components/player-scroll/PlayerLeaderboardPreview.tsx` | "TEAM RANKINGS" — shows player's best rank with stagger slide-in row. Tappable to full leaderboard. |
| `components/player-scroll/PlayerPropsSection.tsx` | "PROPS FROM THE TEAM" — recent shoutouts with avatar, text, timestamp. Empty state links to give props. |
| `components/player-scroll/PlayerContinueTraining.tsx` | Purple gradient teaser card for future Journey Path. Shimmer sweep every 5s. Shows toast "Coming soon!" on tap. |
| `components/player-scroll/PlayerMomentumRow.tsx` | Horizontal scroll gradient stat cards: Kills (coral), Streak (amber), Level (purple), Games (green). Count-up number animation + stagger entrance. |
| `components/player-scroll/PlayerTrophyCase.tsx` | Fortnite-style badge grid (4x2) with rarity dots, pop-in spring animation, level badge + animated XP bar. Locked badges show aspirational placeholders. |
| `components/player-scroll/PlayerTeamActivity.tsx` | "TEAM ACTIVITY" feed — shoutouts, badge earns, game results. Stagger-fade entrance per item. Max 3 items. |
| `components/player-scroll/PlayerAmbientCloser.tsx` | Mascot with gentle sway rotation, dynamic closing message referencing XP-to-next, streak, or badge count. |

---

## 2. FILES MODIFIED

| File | What Changed | Why |
|------|-------------|-----|
| `components/PlayerHomeScroll.tsx` | Replaced scroll JSX with D+ components, new imports, new final scroll order (11 sections). Removed old sections from render. Updated file comment. | D+ redesign — action center emotional arc |
| `components/player-scroll/NextUpCard.tsx` | Added +XP chip on RSVP button, improved empty state text | +XP treatment per spec |
| `components/player-scroll/LastGameStats.tsx` | Added stat-specific colors (kills=coral, assists=sky, aces=green, digs=amber), PLAYER_THEME tokens, D_RADII | D System restyle |
| `theme/d-system.ts` | Added Player D+ tokens: questBgActive, questBgDone, questBorderActive, questBorderDone, leaderboardGold/Silver/Bronze, trainingCardStart/End | New design tokens |
| `theme/player-theme.ts` | Added: questCard, questDone, streakFire, xpGold | New player tokens |

---

## 3. FILES REMOVED FROM RENDER (not deleted)

These components were removed from PlayerHomeScroll's JSX but their **files were NOT deleted**:

| Component | File Location | Reason Removed |
|-----------|---------------|----------------|
| HeroIdentityCard | `components/player-scroll/HeroIdentityCard.tsx` | Replaced by PlayerIdentityHero |
| StreakBanner | `components/player-scroll/StreakBanner.tsx` | Streak counter moved into PlayerIdentityHero fire pill |
| TheDrop | `components/player-scroll/TheDrop.tsx` | Content now in daily quests and hero greeting |
| PhotoStrip | `components/player-scroll/PhotoStrip.tsx` | Photos live in team hub/gallery |
| ChatPeek | `components/player-scroll/ChatPeek.tsx` | Chat accessible from tab bar |
| QuickPropsRow | `components/player-scroll/QuickPropsRow.tsx` | Replaced by PlayerPropsSection |
| EvaluationCard | `components/player-scroll/EvaluationCard.tsx` | Accessible from drawer/more |
| TrophyCaseWidget (shared) | `components/TrophyCaseWidget.tsx` | Replaced by PlayerTrophyCase (shared file untouched) |
| TeamPulse (shared) | `components/TeamPulse.tsx` | Replaced by PlayerTeamActivity (shared file untouched) |
| ClosingMascot | `components/player-scroll/ClosingMascot.tsx` | Replaced by PlayerAmbientCloser |
| My Team card (inline) | `components/PlayerHomeScroll.tsx` (inline JSX) | Removed from scroll (accessible via Team tab) |
| Leaderboard links (inline) | `components/PlayerHomeScroll.tsx` (inline JSX) | Replaced by PlayerLeaderboardPreview |

---

## 4. IMPORTS CHANGED

### Added to PlayerHomeScroll.tsx:
- `import PlayerIdentityHero from './player-scroll/PlayerIdentityHero'`
- `import PlayerDailyQuests from './player-scroll/PlayerDailyQuests'`
- `import PlayerLeaderboardPreview from './player-scroll/PlayerLeaderboardPreview'`
- `import PlayerPropsSection from './player-scroll/PlayerPropsSection'`
- `import PlayerContinueTraining from './player-scroll/PlayerContinueTraining'`
- `import PlayerMomentumRow from './player-scroll/PlayerMomentumRow'`
- `import PlayerTrophyCase from './player-scroll/PlayerTrophyCase'`
- `import PlayerTeamActivity from './player-scroll/PlayerTeamActivity'`
- `import PlayerAmbientCloser from './player-scroll/PlayerAmbientCloser'`

### Kept but no longer rendered:
- `import HeroIdentityCard` — kept for backward compat, not rendered
- `import StreakBanner` — kept, not rendered
- `import TheDrop` — kept, not rendered
- `import PhotoStrip` — kept, not rendered
- `import ChatPeek` — kept, not rendered
- `import QuickPropsRow` — kept, not rendered
- `import ActiveChallengeCard` — still rendered (active challenges)
- `import EvaluationCard` — kept, not rendered
- `import ClosingMascot` — kept, not rendered

### Unchanged:
- All auth, navigation, theme, modal imports remain identical
- `RoleSelector`, `GiveShoutoutModal`, `LevelUpCelebrationModal`, `StreakMilestoneCelebrationModal`, `ChallengeArrivalModal` unchanged

---

## 5. NAVIGATION PRESERVED

| Action | Destination | Component |
|--------|-------------|-----------|
| Leaderboard preview tap | `/standings` | PlayerLeaderboardPreview |
| Give props (empty state) | Opens GiveShoutoutModal | PlayerPropsSection |
| Continue Training tap | Alert toast "Coming soon!" | PlayerContinueTraining |
| NextUpCard RSVP | `sendRsvp()` toggle | NextUpCard |
| Momentum kills card | `/my-stats` | PlayerMomentumRow |
| Momentum games card | `/my-stats` | PlayerMomentumRow |
| Momentum streak card | `/standings` | PlayerMomentumRow |
| Momentum level card | `/achievements` | PlayerMomentumRow |
| Trophy case tap | `/achievements` | PlayerTrophyCase |
| Team activity "See All" | `/(tabs)/connect` | PlayerTeamActivity |
| ActiveChallengeCard | Challenge routes | ActiveChallengeCard |
| RoleSelector | Role switch | RoleSelector (compact header + in-scroll) |

---

## 6. DATA HOOKS PRESERVED

- `usePlayerHomeData` hook: **UNCHANGED** — not modified
- All Supabase queries: **UNCHANGED**
- All new components consume existing data from `usePlayerHomeData`
- No new backend queries added

---

## 7. TOKENS ADDED

### theme/d-system.ts (D_COLORS):

| Token | Value | Purpose |
|-------|-------|---------|
| `questBgActive` | `rgba(75,185,236,0.08)` | Active quest card background |
| `questBgDone` | `rgba(34,197,94,0.08)` | Completed quest card background |
| `questBorderActive` | `rgba(75,185,236,0.15)` | Active quest card border |
| `questBorderDone` | `rgba(34,197,94,0.15)` | Completed quest card border |
| `leaderboardGold` | `#FFD700` | Rank 1 color |
| `leaderboardSilver` | `#C0C0C0` | Rank 2 color |
| `leaderboardBronze` | `#CD7F32` | Rank 3 color |
| `trainingCardStart` | `#8B5CF6` | Training card gradient start |
| `trainingCardEnd` | `#6c2bd9` | Training card gradient end |

### theme/player-theme.ts (PLAYER_THEME):

| Token | Value | Purpose |
|-------|-------|---------|
| `questCard` | `rgba(75,185,236,0.06)` | Quest card base |
| `questDone` | `rgba(34,197,94,0.06)` | Quest done base |
| `streakFire` | `#FF6B6B` | Streak fire pill color |
| `xpGold` | `#FFD700` | XP bar fill, level badge |

---

## 8. HOOKS PLACEMENT — all above early returns

All hooks (useState, useEffect, useSharedValue, useAnimatedStyle, useMemo, useDerivedValue) are placed ABOVE all early returns in every file. Per-item animation hooks are isolated in sub-components:
- `QuestCard` (PlayerDailyQuests)
- `LeaderboardRow` (PlayerLeaderboardPreview)
- `AnimatedCard` (PlayerMomentumRow)
- `PopBadge` (PlayerTrophyCase)
- `FeedRow` (PlayerTeamActivity)
- `StatBox` (LastGameStats)

---

## 9. SHARED COMPONENTS — NOT MODIFIED

Confirmed untouched:
- `components/TrophyCaseWidget.tsx`
- `components/TeamPulse.tsx`
- `components/PlayerTradingCard.tsx`
- `components/PlayerCard.tsx`
- `components/PlayerCardExpanded.tsx`
- `hooks/usePlayerHomeData.ts`
- All coach-scroll, parent-scroll, admin-scroll files
- All `app/` route files

---

## 10. PLAYER_THEME RE-EXPORT — confirmed still works

```typescript
// In PlayerHomeScroll.tsx:
import { PLAYER_THEME } from '@/theme/player-theme';
export { PLAYER_THEME } from '@/theme/player-theme';
```

---

## 11. CELEBRATION MODALS — level-up and streak milestones still work

- `LevelUpCelebrationModal` — fires when level increases (AsyncStorage comparison)
- `StreakMilestoneCelebrationModal` — fires when streak crosses milestone tier
- `ChallengeArrivalModal` — fires for unseen active challenges
- `GiveShoutoutModal` — opens from PlayerPropsSection and PlayerDailyQuests
- All four modals render OUTSIDE the ScrollView, unaffected by scroll restructuring

---

## 12. DAILY QUESTS — DISPLAY ONLY

The daily quests are DISPLAY ONLY:
- Quest 1 ("Open Lynx today") auto-completes on render
- Quest 2 and 3 show as active with visible XP rewards
- **NO actual XP is awarded** — the XP engine doesn't support quest completion yet
- The future engagement system will wire real quest completion + XP awards
- The `+XP` values on quest cards and the "+25 XP bonus" bar are visual motivators only

---

## 13. CONTINUE TRAINING — TEASER

The "Continue Training" card is a TEASER:
- Shows purple gradient card with shimmer sweep
- Tapping shows an Alert: "Training modules coming soon!"
- Does NOT navigate to any real training module
- The future Journey Path / Skill Library will replace this card's onPress handler

---

## 14. ANIMATIONS ADDED

| Animation | File | Type |
|-----------|------|------|
| Mascot breathing (scale 1.0-1.03, 4s loop) | PlayerIdentityHero | Loop |
| Streak fire pill pulse (scale 1.0-1.1, 2s loop) | PlayerIdentityHero | Loop |
| XP bar fill (0 to actual, 800ms) | PlayerIdentityHero | Entrance (once) |
| Greeting fade-in (opacity 0-1, 400ms) | PlayerIdentityHero | Entrance (once) |
| Card scroll parallax (scale + opacity) | PlayerIdentityHero | Scroll-driven |
| Quest card spring pop (stagger 80ms) | PlayerDailyQuests (QuestCard) | Entrance (once) |
| Leaderboard row slide-in (50ms stagger) | PlayerLeaderboardPreview (LeaderboardRow) | Entrance (once) |
| Continue Training shimmer sweep (5s cycle) | PlayerContinueTraining | Loop |
| Next Up dot pulse (opacity, 1s loop) | NextUpCard | Loop |
| Momentum stagger entrance + count-up | PlayerMomentumRow (AnimatedCard) | Entrance (once) |
| Stat box fade-in (400ms) | LastGameStats (StatBox) | Entrance (once) |
| Trophy badge pop-in spring (50ms stagger) | PlayerTrophyCase (PopBadge) | Entrance (once) |
| Trophy XP bar fill (0 to actual, 800ms) | PlayerTrophyCase | Entrance (once) |
| Team activity stagger-fade (60ms apart) | PlayerTeamActivity (FeedRow) | Entrance (once) |
| Ambient closer mascot sway (-2deg to 2deg, 4s loop) | PlayerAmbientCloser | Loop |

### Loop animations — cancelAnimation cleanup:

| File | Shared Value | Cleanup |
|------|-------------|---------|
| PlayerIdentityHero | `mascotScale`, `streakPulse` | `cancelAnimation()` in useEffect return |
| PlayerContinueTraining | `shimmerX` | `cancelAnimation()` in useEffect return |
| PlayerAmbientCloser | `swayRotation` | `cancelAnimation()` in useEffect return |
| PlayerTrophyCase (PopBadge) | `scale` | `cancelAnimation()` in useEffect return |

---

## 15. KNOWN ISSUES

1. **Outfit font not available**: The spec references "Outfit/ExtraBold 15px" but Outfit is not loaded. Used `PlusJakartaSans_800ExtraBold` (FONTS.bodyExtraBold) throughout. Visually close.

2. **bestRank limited display**: PlayerLeaderboardPreview shows only the current player's best rank, not a full top-3 list. The hook provides `bestRank` (single stat with rank), not full leaderboard data. Would need a new query in usePlayerHomeData to show top-3 players.

3. **Daily quests not persistent**: Quest completion state (except "Open Lynx") is derived from live data (RSVP status, shoutout count) and isn't persisted. Refreshing the page recalculates quest state.

4. **Shoutouts giverName**: The hook sets `giverName` to 'Coach' for all shoutouts since the shoutouts table doesn't join to the sender's profile name. Future enhancement could resolve sender names.

5. **winStreak vs lastGame**: The greeting checks `lastGame` to determine "after a win" but doesn't distinguish between recent wins and old wins. The last game data could be from weeks ago.

6. **No SleepLynx/HiLynx assets**: The spec mentions SleepLynx or HiLynx mascot variants. Only `lynx-mascot.png` is available. Used that for both hero and ambient closer.

7. **My Team card removed**: The inline My Team card was removed from the scroll per the final scroll order spec. Team is accessible via the Team tab.

---

## 16. SCREENSHOTS NEEDED

Test states:
- [ ] Game day — hero greeting shows "GAME DAY, {name}!" with fire streak pill
- [ ] After a win — greeting shows kills callout or win message
- [ ] On a streak (3+) — greeting shows streak count
- [ ] Default morning/afternoon/evening — appropriate time-based greeting
- [ ] Daily quests — "Open Lynx" auto-completed, 2 active quests with XP
- [ ] Leaderboard preview — rank shown with "You" label highlighted
- [ ] No rank data — "Play games to get ranked!" empty state
- [ ] Props from the team — shoutout cards with timestamps
- [ ] No props — "No props yet. Be the first!" link
- [ ] Continue Training — purple card with shimmer, toast on tap
- [ ] Next event — card with +XP chip on RSVP button
- [ ] No events — "No events coming up" with cat emoji
- [ ] Momentum cards — horizontal scroll with count-up numbers
- [ ] Last game stats — colored stat numbers (coral, sky, green, amber)
- [ ] Trophy case — badge grid with earned glow, locked dim
- [ ] No badges — locked placeholders showing what's possible
- [ ] Team activity — feed items with stagger-fade
- [ ] Ambient closer — mascot sway with data-driven message
- [ ] Pull to refresh — data reloads
- [ ] Compact header — appears on scroll, streak pill + level pill
- [ ] Level-up celebration — modal fires on level increase
- [ ] Streak milestone celebration — modal fires on milestone cross
- [ ] Tablet layout — responsive max-width and padding
