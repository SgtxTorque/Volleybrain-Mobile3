# CC-MEGA-QA-FIX-SPEC

## 10 Items — Bugs, Schema Fixes, and UX Polish

---

## PREREQUISITE READING — DO THIS FIRST

Before touching ANY code, read these files in order:

1. `CC-LYNX-RULES.md` — All 15 universal rules apply to this spec
2. `AGENTS.md` — Codex rules (minimal edits, one priority at a time, explain why)
3. `SCHEMA_REFERENCE.csv` — Verify EVERY table/column referenced in this spec. The `organization_id` bug happened because this step was skipped.
4. `LYNX-REFERENCE-GUIDE.md` — Design reference map (tells you exactly which mockup files to read per feature area)

For Items 5-8 (visual/UX work), ALSO read before coding:
5. `reference/design-references/brandbook/LynxBrandBook.html` — Master brand system (colors, fonts, spacing, card radius, shadows)
6. `reference/design-references/brandbook/lynx-screen-playbook-v2.html` — Screen-by-screen design specs, especially "Player Identity & Gamification" section
7. `reference/design-references/player-mockups/m2-player-card.tsx` — Design-approved player card treatment
8. `reference/design-references/player-mockups/s2-badges-challenges.tsx` — Badges and challenges layout reference
9. `theme/colors.ts`, `theme/fonts.ts`, `theme/spacing.ts` — Current token system

## RULES

1. **Schema First (Rule 1):** Verify every Supabase query in this spec against `SCHEMA_REFERENCE.csv` before writing it. If a column doesn't exist, flag it — do NOT guess. The `teams.organization_id` bug that caused 3 cascading failures happened because this rule was not followed.
2. **Read Before Write (Rule 2):** Read the ENTIRE file before modifying it. Understand existing patterns.
3. **Do NOT break other roles (Rule 4).** Test Admin, Coach, Parent, Player after changes.
4. **Surgical edits only (Rule 5 / AGENTS.md).** Do not refactor or rename anything outside scope. Explain why you touched each file.
5. **Match existing visual style (Rule 7).** Reference the brand book, v0 mockups, and existing screen patterns. Use `PLAYER_THEME` for player screens. Use `BRAND` tokens for shared/parent/coach screens. Use mascot assets from `assets/images/mascot/` per the usage guide in LYNX-REFERENCE-GUIDE.md.
6. **No stray console.logs (Rule 10).** Remove any remaining debug logs from prior specs. All logging must be gated behind `__DEV__`.
7. **TypeScript validation (Rule 13).** After ALL changes, run `npx tsc --noEmit`. Report result. Zero new errors required.
8. **Multi-sport awareness (Rule 15).** Reference `constants/sport-display.ts` for any sport-specific logic. Never hardcode volleyball.
9. **Use existing auth/permissions (Rule 11).** Use `usePermissions()` hook, not `profile?.role`.
10. If any item is unclear, skip it and note what was unclear — do not guess.
11. Commit after completing ALL items with message: `QA mega-fix: challenges schema, player card, stats routing, trading card polish, player UX, challenge CTA`

---

## ITEM 1: Challenges "View All" screen hangs on loading spinner

### Root Cause
`app/challenges.tsx` lines 82-99 have the SAME broken schema as the old create-challenge bug. The `resolveTeam` function queries `teams(organization_id)` — but `organization_id` does NOT exist on the `teams` table. It's on `seasons`.

### Fix
In `app/challenges.tsx`, replace the `resolveTeam` function (~lines 82-110) with:

```typescript
const resolveTeam = async () => {
  if (!user?.id) return;

  // Path 1: team_staff → teams → seasons (for org_id)
  try {
    const { data: staffRows } = await supabase
      .from('team_staff')
      .select('team_id, is_active, teams(id, season_id, seasons(organization_id))')
      .eq('user_id', user.id);

    const active = (staffRows || []).filter((r: any) => r.is_active !== false);
    const best = active[0];
    if (best?.team_id) {
      setTeamId(best.team_id);
      setOrgId((best.teams as any)?.seasons?.organization_id || null);
      return;
    }
  } catch {}

  // Path 2: coaches → team_coaches → teams
  try {
    const { data: coachRecord } = await supabase
      .from('coaches')
      .select('id, team_coaches(team_id, teams(id, season_id, seasons(organization_id)))')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (coachRecord) {
      const tcEntries = Array.isArray(coachRecord.team_coaches)
        ? coachRecord.team_coaches
        : coachRecord.team_coaches ? [coachRecord.team_coaches] : [];
      const best = tcEntries.find((tc: any) => tc.teams);
      if (best?.team_id) {
        setTeamId(best.team_id);
        setOrgId((best.teams as any)?.seasons?.organization_id || null);
        return;
      }
    }
  } catch {}

  // Path 3: team_players (player role)
  try {
    const { data: tpRows } = await supabase
      .from('team_players')
      .select('team_id, teams(id, season_id, seasons(organization_id))')
      .eq('player_id', user.id)
      .limit(1);

    // Also try finding player record by parent linkage
    const { data: playerRows } = await supabase
      .from('players')
      .select('id, team_players(team_id, teams(id, season_id, seasons(organization_id)))')
      .eq('parent_account_id', user.id)
      .limit(1);

    const tp = (tpRows || [])[0];
    if (tp?.team_id) {
      setTeamId(tp.team_id);
      setOrgId((tp.teams as any)?.seasons?.organization_id || null);
      return;
    }

    const playerTp = ((playerRows || [])[0]?.team_players as any[])?.[0];
    if (playerTp?.team_id) {
      setTeamId(playerTp.team_id);
      setOrgId((playerTp.teams as any)?.seasons?.organization_id || null);
      return;
    }
  } catch {}
};
```

Also: the player role may look up team via `players → team_players`, since `players.user_id` may not be the auth user id. Check how `usePlayerHomeData` resolves the team and mirror that pattern if the above doesn't work for players.

---

## ITEM 2: Challenges don't show in Trophy Case

### Root Cause
The Trophy Case "Challenges" tab likely queries challenges using a `teamId` that's resolved the same broken way. It may also just be filtering by `challenge_participants` where the player hasn't opted in yet.

### Fix
Check `app/achievements.tsx` or whichever file renders the Trophy Case "Challenges" tab. If it resolves teamId using `teams(organization_id)`, apply the same `seasons` path fix. If it's correctly resolving but showing empty because the player hasn't joined the challenge, that's expected behavior — the "No Challenges Yet" message is correct until a player taps "Join Challenge."

Verify: does the challenge show up after a player taps "Join Challenge" on the Team Wall? If yes, this is working as designed. If no, there's a separate bug to investigate.

---

## ITEM 3: Player Card from gesture menu shows "PLAYER NOT FOUND"

### Root Cause
The Gesture Drawer menu links to `/player-card` with NO `playerId` param:
```
{ icon: 'id-card-outline', label: 'My Player Card', route: '/player-card' }
```
The `player-card.tsx` screen does `resolvedId = playerId || childId || null` — both are undefined, so it gets `null` and shows "PLAYER NOT FOUND."

### Fix
**File: `components/GestureDrawer.tsx`**

The gesture drawer doesn't have access to the player's `players.id` directly. Two options:

**Option A (preferred):** Change `app/player-card.tsx` to auto-resolve the current user's player record when no `playerId` is provided. Add a fallback BEFORE the existing `fetchPlayer` function:

```typescript
// After: const resolvedId = playerId || childId || null;
// Add auto-resolve for "My Player Card" (no params)
const [autoResolvedId, setAutoResolvedId] = useState<string | null>(null);

useEffect(() => {
  if (resolvedId || !user?.id) return;
  // No playerId passed — resolve current user's player record
  (async () => {
    // Try team_players first
    const { data: tpRow } = await supabase
      .from('team_players')
      .select('player_id')
      .eq('player_id', user.id)
      .limit(1)
      .maybeSingle();
    if (tpRow) { setAutoResolvedId(tpRow.player_id); return; }

    // Try players table by parent_account_id
    const { data: playerRow } = await supabase
      .from('players')
      .select('id')
      .eq('parent_account_id', user.id)
      .limit(1)
      .maybeSingle();
    if (playerRow) { setAutoResolvedId(playerRow.id); return; }

    // Try player_guardians
    const { data: guardianRow } = await supabase
      .from('player_guardians')
      .select('player_id')
      .eq('guardian_id', user.id)
      .limit(1)
      .maybeSingle();
    if (guardianRow) { setAutoResolvedId(guardianRow.player_id); return; }

    setAutoResolvedId(null);
  })();
}, [resolvedId, user?.id]);

const effectivePlayerId = resolvedId || autoResolvedId;
```

Then change `fetchPlayer` to use `effectivePlayerId` instead of `resolvedId`.

Import `useAuth` at the top: `import { useAuth } from '@/lib/auth';` and add `const { user } = useAuth();`.

---

## ITEM 4: Team Roster → tapping teammate shows YOUR stats, not theirs

### Root Cause
`app/my-stats.tsx` reads URL params but ONLY extracts `highlightStat`:
```typescript
const { highlightStat } = useLocalSearchParams<{ highlightStat?: string }>();
```
It ignores the `playerId` param that `player-card.tsx` passes via `/my-stats?playerId=${player.id}`.

The `resolvePlayer` function always resolves to the logged-in user's child.

### Fix
**File: `app/my-stats.tsx`**

1. Update the `useLocalSearchParams` to include `playerId`:
```typescript
const { highlightStat, playerId: paramPlayerId } = useLocalSearchParams<{ highlightStat?: string; playerId?: string }>();
```

2. In the `resolvePlayer` function, add a check at the very top BEFORE the parent_account_id lookup:
```typescript
const resolvePlayer = useCallback(async () => {
  // If playerId was passed as a param, use it directly
  if (paramPlayerId) {
    const { data: pData } = await supabase
      .from('players')
      .select('id, first_name, last_name')
      .eq('id', paramPlayerId)
      .maybeSingle();
    if (pData) {
      setPlayerId(pData.id);
      setPlayerName(`${pData.first_name} ${pData.last_name}`);
      return;
    }
  }

  if (!user?.id || !effectiveSeasonId) return;
  // ... rest of existing resolution logic
```

3. Add `paramPlayerId` to the useCallback dependency array.

---

## ITEM 5: Trading card photos cropped inconsistently

### Design Reference
Before modifying, read: `reference/design-references/player-mockups/m2-player-card.tsx` — this is the design-approved player card treatment. Match its photo positioning approach.

### Root Cause
In `components/PlayerTradingCard.tsx`, `heroPhoto` uses:
```css
position: 'absolute', bottom: 8, left: 0, right: 0, height: 220, resizeMode: 'contain'
```
But the `Image` component uses `resizeMode="cover"` as a prop (line 226), which overrides the style. With `cover`, the image fills the area and crops from the center — but since player photos have varying head positions, some get their heads cut off by the `overflow: hidden` on `photoArea` (height: 280).

### Fix
**File: `components/PlayerTradingCard.tsx`**

Change the `heroPhoto` style to position from the TOP instead of bottom, so heads are always visible:

```typescript
heroPhoto: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '100%',
  resizeMode: 'cover',
},
```

And on the `<Image>` component (line ~226), change to `resizeMode="cover"` with a style override that anchors to top. OR, use `expo-image` with `contentPosition="top"` if available. If using react-native `Image`, the simplest fix is to make the photo taller than the container and position from top:

```typescript
heroPhoto: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: -40,
},
```

This lets `overflow: hidden` on `photoArea` clip from the bottom (feet) rather than the top (head).

---

## ITEM 6: Trading card stat labels too small, should be full words

### Root Cause
`powerBarLabel` style has `fontSize: 7` and the stat labels use abbreviations (K, D, A, B, AST).

### Fix
**File: `components/PlayerTradingCard.tsx`**

1. Change `powerBarLabel` font size:
```typescript
powerBarLabel: {
  fontSize: 9,
  fontFamily: FONTS.bodyBold,
  color: 'rgba(255,255,255,0.50)',  // bump from 0.35 to 0.50 for readability
  letterSpacing: 0.8,
  textTransform: 'uppercase',
},
```

2. Where stats are passed to `PowerBar`, the labels come from `player.stats[].label`. These are set in `app/player-card.tsx` when building the player object. Find where stats are constructed (search for `label: 'K'` or similar) and change to full words:

The labels are likely set like:
```typescript
stats: [
  { label: 'K', value: kills },
  { label: 'D', value: digs },
  ...
]
```

Change to:
```typescript
stats: [
  { label: 'Kills', value: kills },
  { label: 'Digs', value: digs },
  { label: 'Aces', value: aces },
  { label: 'Blocks', value: blocks },
  { label: 'Assists', value: assists },
]
```

Also check `components/RosterCarousel.tsx` and `app/roster.tsx` since they also render trading cards — update stat labels there too.

If `powerBarRow` width becomes tight with full words, adjust the width calculation or allow the label to truncate with `numberOfLines={1}`.

---

## ITEM 7: Player experience headers too dark on dark background

### Design Reference
Before modifying, read: `reference/design-references/player-mockups/s1-player-home.tsx` for player home header patterns, and the Trophy Case screen in `app/achievements.tsx` for the gold/display font treatment that works well on dark backgrounds. Also reference `PLAYER_THEME` in `components/PlayerHomeScroll.tsx` for the correct color tokens.

### Root Cause
Section headers in the player experience use colors like `PLAYER_THEME.accent` with `opacity: 0.6`, or `PLAYER_THEME.textMuted` which is `rgba(255,255,255,0.30)`. Combined with `fontSize: 10`, they're nearly invisible.

### Fix
**File: `components/PlayerHomeScroll.tsx`**

Apply the Trophy Case treatment to section headers. The Trophy Case uses `FONTS.display` with gold/white colors at larger sizes. Update these section header styles:

1. `myTeamLabel` — change from:
```typescript
myTeamLabel: { fontFamily: FONTS.bodyBold, fontSize: 10, color: PLAYER_THEME.accent, letterSpacing: 1.5, opacity: 0.6 }
```
to:
```typescript
myTeamLabel: { fontFamily: FONTS.display, fontSize: 12, color: PLAYER_THEME.accent, letterSpacing: 1.5, opacity: 1.0 }
```

2. Find ALL section header/label styles in the player home (search for `letterSpacing: 1` with small font sizes) and apply the same pattern:
   - `fontFamily: FONTS.display` (or `FONTS.bodyExtraBold`)
   - `fontSize: 12` minimum (up from 10)
   - `opacity: 1.0` (remove the 0.6 dimming)
   - `color: PLAYER_THEME.accent` or `PLAYER_THEME.gold` for key sections

3. Check `app/(tabs)/me.tsx` (My Teams page) headers too — the screenshot showed dark headers on dark background there as well. Apply same treatment.

---

## ITEM 8: Challenge UX feels flat — needs CTA pop

### Design Reference
Before building, read: `reference/design-references/player-mockups/s2-badges-challenges.tsx` — this is the design-approved badges and challenges layout. Also read `reference/design-references/brandbook/lynx-screen-playbook-v2.html` "Player Identity & Gamification" section. Use mascot assets from `assets/images/mascot/` — specifically `celebrate.png` for the excited state, per the mascot usage guide in `LYNX-REFERENCE-GUIDE.md`.

### Context
Currently when a coach issues a challenge, it shows as a passive card on the player dashboard. It should feel like an EVENT — something that demands engagement.

### Fix — Two parts:

**Part A: Challenge Arrival Modal**

Create `components/ChallengeArrivalModal.tsx` — a full-screen modal that pops when a player opens the app and has a NEW challenge they haven't seen yet.

Design:
- Dark overlay with Lynx mascot (use excited/bounce variant)
- Challenge title in large `FONTS.display`
- "Your coach just dropped a challenge!" subtitle
- Challenge details: target, XP reward, duration
- Two buttons: "Accept Challenge" (teal, prominent) and "Maybe Later" (ghost/outline)
- "Accept" → calls `optInToChallenge` and dismisses
- "Maybe Later" → dismisses but marks as seen (use AsyncStorage key `lynx_challenge_seen_${challengeId}`)

**Part B: Better dashboard card**

In `components/PlayerHomeScroll.tsx`, the existing challenge section should be more prominent:
- Add a pulsing glow border (gold or teal) around active challenge cards
- Use `FONTS.display` for the challenge title
- Add a progress ring or animated progress bar instead of the flat line
- If the player hasn't joined yet, show "JOIN NOW" in a bold CTA button style instead of just listing it

Wire the modal into `components/PlayerHomeScroll.tsx` — check for new unseen challenges on mount, show the modal if found.

---

## ITEM 9: Parent clicking challenge card goes to Team Hub (wrong destination)

### Root Cause
`components/parent-scroll/ChallengeVerifyCard.tsx` routes to `/challenges` on press (lines 133, 143, 184). The `/challenges` route (`app/challenges.tsx`) has the same broken team resolution (Item 1). When it can't resolve a team, it may be falling through to a default or redirecting.

### Fix
Item 1's fix to `app/challenges.tsx` should resolve this. After applying Item 1, the challenges screen should load properly for all roles.

However, also verify: does the parent role need a different team resolution path? Parents find teams through `players → team_players → teams`. Make sure the `resolveTeam` function in `app/challenges.tsx` (after Item 1 fix) includes the parent path. The Item 1 fix above includes a Path 3 that queries `team_players` and `players.parent_account_id` — this should cover parents.

---

## ITEM 10: Player evaluations not visible to players/parents/admins

### Current State
- Coach gesture drawer has "Player Evaluations" → `/evaluation-session` (this is the COACH tool to CREATE evaluations)
- Player gesture drawer has "My Stats" → `/my-stats` which includes evaluation history at the bottom (via `usePlayerEvaluationHistory`)
- Parent gesture drawer has NO evaluation access
- There is no dedicated "My Evaluations" screen for players or "Child Evaluations" for parents

### Fix

**Part A: Add to Player gesture drawer**
In `components/GestureDrawer.tsx`, in the player `'My Stuff'` section, add:
```typescript
{ icon: 'school-outline', label: 'My Evaluations', route: '/my-stats?scrollToEvals=true' },
```
This reuses the existing my-stats page which already shows eval history. If you want to pass a scroll hint, the `my-stats` page can read this param and auto-scroll to the evaluation section.

**Part B: Add to Parent gesture drawer**
In the parent section, add:
```typescript
{ icon: 'school-outline', label: 'Evaluations', route: '/my-stats' },
```
The `my-stats` page already resolves the parent's child — so this should show the child's evaluations. However, verify that the eval section actually renders for parent role (it may be gated behind a role check).

**Part C: Make evaluations more prominent on player home**
In `components/PlayerHomeScroll.tsx`, if there are recent evaluations (last 30 days), add a card that shows:
- "New Evaluation from Coach" with date
- OVR rating change (if applicable)
- Tappable to navigate to full eval detail

Check if `hooks/usePlayerHomeData.ts` already fetches recent evaluations. If not, add a query for the latest evaluation and expose it.

---

## FILES MODIFIED (summary)

| File | Items |
|------|-------|
| `app/challenges.tsx` | 1, 9 |
| `app/player-card.tsx` | 3 |
| `app/my-stats.tsx` | 4 |
| `components/PlayerTradingCard.tsx` | 5, 6 |
| `components/PlayerHomeScroll.tsx` | 7, 8 |
| `components/GestureDrawer.tsx` | 10 |
| `components/ChallengeArrivalModal.tsx` | 8 (NEW FILE) |
| `app/roster.tsx` or `components/RosterCarousel.tsx` | 6 (stat labels) |

## FILES NOT MODIFIED
- `app/create-challenge.tsx` — already fixed in prior spec
- `components/ParentHomeScroll.tsx` — already fixed (family gallery)
- `hooks/useParentHomeData.ts` — no changes needed
- `components/FamilyPanel.tsx` — no changes needed

---

## COMMIT

**Before committing, run:**
```bash
npx tsc --noEmit
```
Report the result. Zero new TypeScript errors required. Pre-existing errors in `design-reference/` can be ignored.

**Remove ALL debug console.logs** — no `[ChallengeTeamResolve]`, `[DEBUG]`, `[CoachHomeTeams]` or any other unguarded logs. All logging must be `if (__DEV__) console.log(...)`.

```
QA mega-fix: challenges schema, player card resolution, stats routing, trading card polish, player UX headers, challenge CTA modal, evaluation access
```
