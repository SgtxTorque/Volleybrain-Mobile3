# CLAUDE-UX-REDUNDANCY-REPORT.md
## Lynx Mobile — Screen Redundancy Analysis
### Audit Date: 2026-03-11

---

## Overview

The Lynx app contains **122+ routes** but only approximately **40–50 unique data screens**. This yields a **duplication factor of ~2.5x**, meaning nearly half the routes are redundant implementations of the same functionality.

---

## Redundancy Category 1: Chat Screens (4 implementations)

### Files:
| File | Lines | Role | Unique Feature |
|------|-------|------|----------------|
| `app/(tabs)/chats.tsx` | 767 | Generic | Simple FAB (no menu) |
| `app/(tabs)/coach-chat.tsx` | 1100 | Coach/Admin | Expanded FAB (Blast, Channel, DM) |
| `app/(tabs)/parent-chat.tsx` | 931 | Parent | DM-only creation |
| `app/(tabs)/admin-chat.tsx` | 2 | Admin | Re-exports `coach-chat.tsx` |

### Shared Code (~750 lines duplicated):
- Channel list fetching logic (~400 lines)
- Pinning system (AsyncStorage `pinned_chats_{userId}`)
- DM creation flow (~200 lines)
- Typing indicators
- Search + pull-to-refresh controls
- Real-time subscriptions (named differently per file: `'chat-updates'`, `'coach-chat-updates'`, `'parent-chat-updates'`)

### Genuine Differences:
- **coach-chat.tsx** has expanded FAB with 3 options (Blast, Channel, DM)
- **parent-chat.tsx** has DM-only creation + N+1 sequential query pattern (lines 172–209)
- **admin-chat.tsx** is a 2-line re-export — admin experience is NOT distinct from coach

### Impact:
- Bug fixes applied to one chat screen may not propagate to others
- N+1 query in `parent-chat.tsx` is fixed in `coach-chat.tsx` (batched) but not back-ported
- 3 separate real-time subscription channels for identical event types

### Consolidation Opportunity:
**Could be 1 component** with role-conditional FAB and fetch scope injection.

---

## Redundancy Category 2: Schedule Screens (4+ implementations)

### Files:
| File | Role | Unique Feature |
|------|------|----------------|
| `app/(tabs)/schedule.tsx` | Generic | List/month/week views, no creation |
| `app/(tabs)/coach-schedule.tsx` | Coach | Full event creation wizard |
| `app/(tabs)/admin-schedule.tsx` | Admin | Aliases `coach-schedule.tsx` |
| `app/(tabs)/parent-schedule.tsx` | Parent | Read-only, child-filtered |
| `app/(tabs)/gameday.tsx` | Coach/Player | Live upcoming games view |

### Shared Code:
- Calendar rendering logic
- Event card components
- Date formatting utilities (5+ formatting functions duplicated)

### Genuine Differences:
- **coach-schedule.tsx** includes DateTimePicker, location picker, bulk event modal
- **parent-schedule.tsx** filters by child's team, read-only
- **gameday.tsx** focuses on chronological hero → this week → upcoming

### Impact:
- Event creation should be a modal launched from any schedule, not a separate screen variant
- Date formatting utilities duplicated across all schedule files

### Consolidation Opportunity:
**Could be 2 screens:** Generic schedule (with role-conditional creation button) + Game Day (distinct enough to warrant separate screen).

---

## Redundancy Category 3: Profile/Settings Screens (5 implementations)

### Files:
| File | Role | Lines | Unique Content |
|------|------|-------|----------------|
| `app/(tabs)/me.tsx` | Generic | 100+ | **No drawer link — appears orphaned** |
| `app/(tabs)/coach-my-stuff.tsx` | Coach | 250+ | Teams list, background checks, coaching license |
| `app/(tabs)/parent-my-stuff.tsx` | Parent | 300+ | Children list, waiver status, registration status |
| `app/(tabs)/admin-my-stuff.tsx` | Admin | 300+ | Pending invites, seasonal overview, financial summary |
| `app/profile.tsx` | All | — | Profile editing (separate stack screen) |

### Shared Code (~80% overlap):
- Theme toggle (identical in all 4 tab screens)
- Accent color picker (identical)
- User profile display section (identical)
- Logout flow (identical)
- Screen infrastructure (SafeAreaView, ScrollView, AppHeaderBar)

### Impact:
- Theme toggle fix must be applied to 4 files
- `me.tsx` appears to be an unused generic placeholder with no drawer navigation link

### Consolidation Opportunity:
**Could be 1 screen** with role-conditional sections. `me.tsx` should be removed or redirected.

---

## Redundancy Category 4: Team Management (3 implementations)

### Files:
| File | Lines | Scope |
|------|-------|-------|
| `app/team-management.tsx` | 500+ | Full management (create, edit, move players) |
| `app/(tabs)/admin-teams.tsx` | 400+ | Admin tab version (+ filter tabs, next event, unrostered) |
| `app/(tabs)/teams.tsx` | 200+ | Simplified team creation only |

### Code Evidence (team-management.tsx lines 54–100):
```tsx
const [teams, setTeams] = useState<Team[]>([]);
const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
const [players, setPlayers] = useState<Player[]>([]);
const [coaches, setCoaches] = useState<Coach[]>([]);
// ... team creation modal, move modal, etc.
```

### Code Evidence (admin-teams.tsx lines 65–100):
```tsx
const [teams, setTeams] = useState<Team[]>([]);
const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
const [coaches, setCoaches] = useState<Coach[]>([]);
const [players, setPlayers] = useState<Player[]>([]);
// ... PLUS: filter tabs, next event tracking, unrostered players
```

### Impact:
- ~80% code overlap between `team-management.tsx` and `admin-teams.tsx`
- 5+ modal types across both files (create team, edit team, team detail, move player, bulk move)
- `teams.tsx` is likely never navigated to (no drawer link found)

### Consolidation Opportunity:
**Could be 1 screen** with conditional rendering based on entry point.

---

## Redundancy Category 5: Roster Screens (4 implementations)

### Files:
| File | Lines | View Type |
|------|-------|-----------|
| `app/(tabs)/players.tsx` | 200+ | Grid/list of all players |
| `app/(tabs)/coach-roster.tsx` | 7 | Re-export of `players.tsx` |
| `app/roster.tsx` | 300+ | Swipeable carousel |
| `app/team-roster.tsx` | 150+ | Single team FlatList |

### Code Evidence:
```tsx
// app/(tabs)/coach-roster.tsx — entire file:
export { default } from './players';
```

### Shared Logic:
- All four fetch from `team_players` → `players` join
- All display player name, photo, jersey, position
- All navigate to player detail on tap

### Genuine Differences:
- `players.tsx` — team selector + grid layout
- `roster.tsx` — carousel with inline stats
- `team-roster.tsx` — focused single-team list

### Impact:
- Coach with multiple entry points doesn't know which roster to use
- Bug in player data fetching must be fixed in 3 places
- `coach-roster.tsx` exists only as a 7-line alias

### Consolidation Opportunity:
**Could be 1 screen** with view mode toggle (grid/carousel/list) + team selector.

---

## Redundancy Category 6: Player Detail / Stats (3 entry points)

### Files:
| Route | Purpose |
|-------|---------|
| `/child-detail?playerId=X` | Full player detail with tabs |
| `/player-card?playerId=X` | FIFA-style trading card (XP/OVR) |
| `/my-stats?playerId=X` | Stats-focused view |

### Shared Data:
- All fetch from `game_player_stats`, `player_season_stats`, `player_skills`
- OVR calculation duplicated in `player-card.tsx`, `roster.tsx`, `usePlayerHomeData.ts`

### Impact:
- Three UIs showing overlapping data with different calculations
- OVR formula changes must be applied to 3 files

---

## Redundancy Category 7: Game Post-Mortem (2 implementations)

### Files:
| Route | Purpose |
|-------|---------|
| `/game-recap?eventId=X` | Post-game recap with stat entry |
| `/game-results?eventId=X` | Game results view |

### Both serve the same purpose: reviewing/entering post-game statistics. Navigation confusion for coaches.

---

## Redundancy Heatmap

| Category | Files | Estimated Shared Lines | Severity |
|----------|-------|----------------------|----------|
| Chat | 4 | ~750 | **HIGH** |
| Schedule | 5 | ~400 | **HIGH** |
| Profile/Settings | 5 | ~600 | **HIGH** |
| Team Management | 3 | ~500 | **HIGH** |
| Roster | 4 | ~300 | **MEDIUM** |
| Player Detail | 3 | ~200 | **MEDIUM** |
| Game Post-Mortem | 2 | ~150 | **LOW** |

**Total estimated duplicated code: ~2,900 lines across 26 files.**

---

## Consolidation Roadmap

### Phase 1 — Quick Wins (7 files → 2)
1. Delete `admin-chat.tsx` re-export, make `coach-chat.tsx` accept admin role via props
2. Delete `coach-roster.tsx` re-export, ensure drawer links to `players.tsx`
3. Remove or redirect `me.tsx` (orphaned)
4. Remove or redirect `teams.tsx` (no navigation path)

### Phase 2 — Chat Unification (3 files → 1)
1. Extract shared channel fetching into `useChatChannels()` hook
2. Create single `ChatScreen` with role-conditional FAB
3. Fix N+1 in parent chat path during consolidation

### Phase 3 — Settings Unification (4 files → 1)
1. Extract shared settings sections into components
2. Create single `MyStuffScreen` with role-conditional sections
3. Inject role-specific content (teams/children/invites) via conditional rendering

### Phase 4 — Team Management Unification (3 files → 1)
1. Merge `team-management.tsx` and `admin-teams.tsx`
2. Add admin-specific features (filter tabs, unrostered) as conditional rendering

### Phase 5 — Roster Consolidation (3 files → 1)
1. Extract data fetching into `useRosterData()` hook
2. Create single roster screen with view mode toggle
3. Keep carousel and list as view options within same screen

### Phase 6 — Route Cleanup
1. Consolidate `/game-recap` and `/game-results` into single `/game-stats?eventId=X`
2. Unify `/child-detail` and `/player-card` into single `/player-detail?playerId=X`
3. Document all query parameter contracts
