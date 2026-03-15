# Player Home D+ Fixes — Changelog

## FILES CREATED
| File | Purpose |
|------|---------|
| `components/player-scroll/CompetitiveNudge.tsx` | Dynamic competitive bar below hero — priority-based messages driving action |
| `components/player-scroll/PlayerChallengeCard.tsx` | Active challenge progress card with animated bar fill + XP pulse |
| `components/player-scroll/PlayerQuickLinks.tsx` | Horizontal pill buttons: My Card, Teammates, My Stats with spring press |
| `components/player-scroll/PlayerTeamHubCard.tsx` | Team Hub entry point with notification pill pulse animation |

## FILES MODIFIED
| File | Changes |
|------|---------|
| `components/player-scroll/PlayerIdentityHero.tsx` | Mascot moved to top-right; added XP bar gold shimmer, XP count-up with bounce, level badge scale bounce |
| `components/player-scroll/PlayerMomentumRow.tsx` | Streak card added as first card; scroll-triggered stagger entrance; number bounce after count-up |
| `components/player-scroll/PlayerTrophyCase.tsx` | Scroll-triggered badge pop-in; gold flash overlay for earned badges; 80ms stagger |
| `components/player-scroll/PlayerLeaderboardPreview.tsx` | Rows slide from right (was left); "You" row highlight glow; 80ms stagger |
| `components/player-scroll/PlayerChallengeCard.tsx` | Scroll-triggered fade+scale; animated progress bar fill; "+XP" gold pulse |
| `components/player-scroll/PlayerContinueTraining.tsx` | Press scale spring (0.97); arrow right-nudge loop animation |
| `components/player-scroll/LastGameStats.tsx` | Scroll-triggered count-up per stat; label fades in after count finishes |
| `components/player-scroll/PlayerTeamActivity.tsx` | Scroll-triggered slide from right (was left); 60ms stagger |
| `components/PlayerHomeScroll.tsx` | Added 4 new sections to scroll; passes scrollY to 6 components; updated header/section comments to 15-section order |

## NEW SECTIONS ADDED (4)
1. **CompetitiveNudge** — Dynamic action-driving bar between hero and quick links
2. **PlayerQuickLinks** — My Card, Teammates, My Stats pill navigation
3. **PlayerChallengeCard** — Active challenge progress with animated bar
4. **PlayerTeamHubCard** — Team Hub entry with pulsing notification pill

## ANIMATIONS

### Scroll-Triggered (animate when scrolled into view)
| Component | Animation | Trigger |
|-----------|-----------|---------|
| CompetitiveNudge | Slide from left (translateX -30 → 0) | scrollY + screenHeight > componentY |
| PlayerChallengeCard | Fade in + scale 0.95 → 1.0 | scrollY + screenHeight > componentY |
| PlayerMomentumRow | Cards stagger slide-up + fade, 100ms stagger | scrollY + screenHeight > componentY |
| PlayerTrophyCase | Badges spring pop-in, 80ms stagger + gold flash | scrollY + screenHeight > componentY |
| LastGameStats | Per-stat count-up 600ms + label fade-in after | scrollY + screenHeight > componentY |
| PlayerTeamActivity | Feed rows slide from right, 60ms stagger | scrollY + screenHeight > componentY |

### Always-On (run immediately, not scroll-triggered)
| Component | Animation |
|-----------|-----------|
| Hero mascot | Breathing: scale 1.0 ↔ 1.03, 4s loop |
| Hero streak pill | Pulse: scale 1.0 ↔ 1.1, 2s loop |
| Hero XP bar | Fill 0% → actual over 800ms + gold shimmer sweep at 900ms |
| Hero XP text | Count-up 0 → actual, bounce (1.05 → 1.0) at end |
| Hero level badge | Scale bounce: 0 → 1.0 with spring overshoot |
| Continue Training | Shimmer sweep every 5s; arrow nudge loop (0 → 4 → 0, 2s) |
| Team Hub pill | Pulse: scale 1.0 ↔ 1.2, 2s loop |
| Quick Link pills | Press scale 0.93 with bouncy spring (damping 6, stiffness 200) |

### Tap-Triggered
| Component | Animation |
|-----------|-----------|
| Quick Link pills | Scale 0.93 + haptic feedback |
| Continue Training | Scale 0.97 with spring back |
| Daily quest checkbox | Spring animation on tap |

## SCROLL ANIMATION SYSTEM
Each scroll-triggered component uses this pattern:
```typescript
const componentY = useSharedValue(0);
const entered = useSharedValue(0);

// Capture position within scroll content
const onLayoutCapture = useCallback((e) => {
  componentY.value = e.nativeEvent.layout.y;
}, []);

// Trigger when component scrolls into viewport
useDerivedValue(() => {
  if (entered.value === 0 && componentY.value > 0 &&
      scrollY.value + SCREEN_HEIGHT > componentY.value - 50) {
    entered.value = 1;
  }
});

// Sub-items react to parent's entered value
useAnimatedReaction(
  () => entered.value,
  (val, prev) => {
    if (val === 1 && (prev === null || prev === 0)) {
      // trigger entrance animations with stagger
    }
  },
);
```

## NAVIGATION ROUTES
| Tap Target | Route |
|------------|-------|
| CompetitiveNudge | `/standings` |
| Quick Link: My Card | `/player-card?playerId={id}` |
| Quick Link: Teammates | `/roster?teamId={id}` |
| Quick Link: My Stats | `/my-stats?playerId={id}` |
| PlayerChallengeCard | `/challenge-cta?challengeId={id}` |
| PlayerLeaderboardPreview | `/standings` |
| PlayerTeamHubCard | `/team-hub?teamId={id}` |
| PlayerContinueTraining | Alert (coming soon teaser) |
| Momentum: Streak | `/standings` |
| Momentum: Kills/Games | `/my-stats` |
| Momentum: Level | `/achievements` |
| PlayerTrophyCase | `/achievements` |
| PlayerTeamActivity: See All | `/(tabs)/connect` |

## DATA SOURCES
| Component | Data from usePlayerHomeData |
|-----------|---------------------------|
| CompetitiveNudge | bestRank, personalBest, xpToNext, level, challengesAvailable |
| PlayerQuickLinks | playerId (prop), primaryTeam.id |
| PlayerChallengeCard | challengesAvailable, primaryTeam.id; fetches own data via fetchActiveChallenges |
| PlayerTeamHubCard | primaryTeam.name, primaryTeam.color, primaryTeam.id |

## HOOKS PLACEMENT
All hooks are above early returns in every component:
- `LastGameStats`: scroll hooks above `if (!lastGame) return null`
- `PlayerChallengeCard`: scroll hooks + bar animation hooks above `if (!available || !challenge) return null`
- `PlayerTeamActivity`: scroll hooks above `if (feed.length === 0) return null`
- `PlayerMomentumRow`: scroll hooks above `if (cards.length === 0) return null`
- `PlayerTeamHubCard`: hooks above `if (!teamId) return null`

## KNOWN ISSUES
- Daily quest XP is DISPLAY ONLY — no actual XP awards
- Continue Training is a TEASER — taps show an Alert, no real training content
- PlayerTeamHubCard "New" pill is always shown (no real unread detection yet)
- CompetitiveNudge proximity messages are based on bestRank data — doesn't show "X more to pass" without proximity data from the hook

## SCREENSHOTS NEEDED
- [ ] Hero with XP shimmer and level bounce
- [ ] Competitive nudge with different message states
- [ ] Quick links pill row
- [ ] Active challenge card with progress bar fill
- [ ] Team Hub card with pulsing notification pill
- [ ] Momentum cards stagger entrance on scroll
- [ ] Trophy case gold flash on earned badges
- [ ] Last game stats count-up with colored numbers
- [ ] Continue Training arrow nudge animation
- [ ] Full scroll from top to bottom
