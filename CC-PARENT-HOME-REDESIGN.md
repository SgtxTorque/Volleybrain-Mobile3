# CC-PARENT-HOME-REDESIGN.md
# Lynx Mobile — Parent Home Redesign: The Family Command Center

**Priority:** HIGH — the parent homepage is the most-visited screen in the app  
**Estimated time:** 8-10 hours (8 phases, commit after each)  
**Risk level:** MEDIUM — rebuilding the primary parent screen, must preserve all existing data connections

---

## WHY THIS EXISTS

The current parent homepage was designed for a single child playing a single sport in a single organization. Real families don't work like that. Twins play volleyball AND basketball. Sisters are in Black Hornets AND Dallas Strikers. A kid plays school ball AND club ball. The parent homepage needs to handle ALL of this without feeling overwhelming for the simple case (1 kid, 1 sport).

The redesign introduces three new concepts:
1. **Billboard Hero** — auto-cycling event cards showing ALL upcoming events across ALL children, ALL sports, ALL orgs
2. **Family Quick View Panel** — right-swipe gesture panel showing the entire family at a glance
3. **Multi-org Player Cards** — each child shows all their sport/team affiliations

---

## REFERENCE FILES

1. `reference/design-references/brandbook/LynxBrandBook.html` — Brand system
2. `components/ParentHomeScroll.tsx` — Current parent home (what we're rebuilding)
3. `hooks/useParentHomeData.ts` — Current data hook (needs to expand for multi-org)
4. `components/parent-scroll/*.tsx` — All child components of the parent home
5. `components/GestureDrawer.tsx` — Left swipe gesture (right swipe panel must coexist)
6. The approved HTML mockup: `lynx-parent-multiorg-mockup.html` — VISUAL TARGET for the complex state

---

## DESIGN PRINCIPLES

### Progressive Disclosure
- **1 child, 1 sport:** Short, clean homepage. No context switcher, no family panel. One hero card, one player card, quick glance. Feels like a dedicated team app.
- **Multiple children OR multiple sports:** Billboard hero cycles events, player cards show sport pills, family panel available on right-swipe. Feels like a family sports hub.
- **Multiple orgs:** Same as above, but with org labels on events and player cards. The app feels unified — one login manages everything.

### The Homepage Shows EVERYTHING, Context Filters the Rest
- The hero billboard, "Also" strip, player cards, and attention items are ALWAYS family-wide (all children, all sports, all orgs). The parent's first question: "What's going on for my family?"
- Deeper screens (team hub, chat, schedule, standings, roster) filter to ONE context (one child + one sport + one team). The parent drills in to manage specifics.
- A context indicator shows what you're viewing. The Family Quick View panel lets you switch context.

### Never Break the Simple Case
- Every multi-org feature is CONDITIONAL. If there's only one child in one sport, none of the multi-org UI renders. No empty switchers, no unnecessary panels, no complexity tax.

---

## DATA ARCHITECTURE

### Expand `useParentHomeData` hook

The current hook fetches data for a single org/season context. It needs to fetch across ALL orgs and ALL children.

```typescript
interface ParentHomeData {
  // Family-wide (all children, all orgs)
  allChildren: {
    playerId: string;
    playerName: string;
    photo?: string;
    teams: {
      teamId: string;
      teamName: string;
      orgId: string;
      orgName: string;
      sport: string;        // 'volleyball', 'basketball', 'soccer'
      sportIcon: string;    // '🏐', '🏀', '⚽'
      seasonId: string;
      seasonName: string;
      jerseyNumber?: string;
      position?: string;
      level?: number;
      xp?: number;
      record?: string;      // '6-1'
    }[];
  }[];

  // All upcoming events across all children, all sports, all orgs
  allUpcomingEvents: {
    eventId: string;
    eventType: string;
    title: string;
    date: string;
    time: string;
    location?: string;
    teamName: string;
    orgName: string;
    sport: string;
    sportIcon: string;
    childName: string;     // which child this event is for
    childId: string;
    rsvpStatus?: string;
    heroBackground?: string; // sport-themed gradient
  }[];

  // Attention items across all contexts
  attentionItems: {
    id: string;
    type: 'rsvp' | 'payment' | 'registration' | 'photo' | 'evaluation' | 'waiver';
    title: string;
    description: string;
    childName?: string;
    route: string;         // where to navigate
    severity: 'urgent' | 'normal';
  }[];

  // Aggregated stats
  totalBalanceDue: number;
  unreadMessages: number;

  // Context state
  isMultiChild: boolean;   // > 1 child
  isMultiSport: boolean;   // any child has > 1 team
  isMultiOrg: boolean;     // teams span > 1 org

  // Selected context (for filtered views)
  selectedContext: {
    childId: string;
    teamId: string;
  } | null;

  setSelectedContext: (context: { childId: string; teamId: string }) => void;
}
```

### Data fetching strategy

```typescript
// 1. Get all children linked to this parent
const children = await supabase
  .from('player_parents')
  .select('player_id, players(id, first_name, last_name, photo_url, ...)')
  .eq('parent_id', userId);

// 2. For each child, get their team memberships (may span multiple orgs)
const teams = await supabase
  .from('team_players')
  .select('team_id, jersey_number, position, teams(id, name, sport, org_id, season_id, organizations(name), seasons(name))')
  .in('player_id', childIds);

// 3. Get upcoming events for ALL teams
const events = await supabase
  .from('schedule_events')
  .select('*')
  .in('team_id', teamIds)
  .gte('event_date', today)
  .order('event_date')
  .limit(20);

// 4. Get RSVP statuses for all events
const rsvps = await supabase
  .from('event_rsvps')
  .select('event_id, player_id, status')
  .in('event_id', eventIds)
  .in('player_id', childIds);
```

---

## PHASE 1: EXPAND DATA HOOK

### 1A. Rewrite `hooks/useParentHomeData.ts`

Implement the `ParentHomeData` interface above. Fetch ALL children, ALL teams (across orgs), ALL upcoming events, ALL attention items. Compute `isMultiChild`, `isMultiSport`, `isMultiOrg` flags.

### 1B. Keep backward compatibility

The existing ParentHomeScroll uses the current hook shape. Don't break it — extend the hook to return both the old shape AND the new expanded shape during transition. Old properties can be derived from the new data.

### 1C. Attention items aggregator

Build a function that scans across all children and all contexts to find things that need parent attention:
- Upcoming event with no RSVP → type: 'rsvp'
- Balance due → type: 'payment'
- Pending registration → type: 'registration'
- Missing player photo → type: 'photo'
- New evaluation available → type: 'evaluation'
- Unsigned waiver → type: 'waiver'

Each item includes the `route` to navigate to and the `childName` it's for.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: expanded parent home data hook - multi-child, multi-sport, multi-org"
git push
```

---

## PHASE 2: BILLBOARD HERO CARD

The hero area shows ALL upcoming events across ALL children, ALL sports, ALL orgs. It auto-cycles like a digital billboard.

### 2A. Create `components/parent-scroll/BillboardHero.tsx`

**Props:**
```typescript
interface BillboardHeroProps {
  events: ParentHomeData['allUpcomingEvents'];
  onRsvp: (eventId: string, childId: string, status: string) => void;
}
```

**Layout:**

Single event card (full width, rounded 16px, 190px tall):
- Sport-themed gradient background:
  - Volleyball: navy-to-teal
  - Basketball: warm brown-to-orange
  - Soccer: green-to-dark green
  - Default: navy gradient
- Sport icon badge (top-left): "🏐" or "🏀" in a frosted pill
- Child name + team label (top-right or below icon): "Sister 1 · Black Hornets Elite"
- Event time: "● TODAY · 10:00 AM" (teal if today, white if future)
- Event type: "GAME DAY" or "PRACTICE" or "TOURNAMENT" (large, bold, white)
- Detail: "vs Frisco Flyers · Frisco Fieldhouse"
- Two buttons bottom:
  - RSVP button: cycles Going (teal) → Not Sure (gold) → Not Going (coral) → Going. Shows current status. If no RSVP yet: blue "RSVP" label.
  - Directions button (outlined): "↗ Directions" → opens maps

**Auto-cycling:**
- Cycles every 5 seconds
- Dot indicators at bottom-right (one per event, max 5-6 visible)
- Manual swipe to advance
- Pauses cycling when user interacts (swipes or taps RSVP)
- Resumes after 10 seconds of no interaction

**If only 1 event upcoming:** No cycling, no dots. Just a single static hero card.

**If 0 events:** Show a friendly empty state. Lynx mascot + "No upcoming events. Enjoy the downtime!" Don't show an empty carousel.

**Sort order:** Events sorted by date/time. Today's events first, then tomorrow, then this week.

### 2B. Replace the current EventHeroCard

Remove the old `EventHeroCard` from `ParentHomeScroll.tsx` and replace with `BillboardHero`.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: billboard hero - auto-cycling events across all children/sports/orgs"
git push
```

---

## PHASE 3: "ALSO TODAY / THIS WEEK" STRIP

### 3A. Create `components/parent-scroll/AlsoStrip.tsx`

Horizontal scrollable strip of compact event chips below the billboard hero.

**Each chip:**
- Sport-colored dot (teal for volleyball, coral for basketball, green for soccer)
- Sport emoji + brief text: "🏀 Game 2pm today" or "🏐 Practice Mon 6pm"
- If multi-child: prefix with child initial: "S1 🏐 Game Sat"
- Tappable → scrolls the billboard to that event OR navigates to event detail

**Rules:**
- Shows events NOT currently displayed in the billboard hero
- Max ~6 chips visible (scrolls for more)
- If ≤ 1 total event: strip doesn't render (hero already shows it)
- Sorted by chronological proximity

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: also today/this week event strip"
git push
```

---

## PHASE 4: ATTENTION ITEMS — EXPANDABLE CARD

### 4A. Rebuild the attention card as an expandable accordion

Replace the current "3 things need your attention" card that goes nowhere.

**Collapsed state:**
- Coral-bordered card with ⚠️ icon
- "4 things need your attention" (tappable)
- Chevron indicating expandable

**Expanded state (tap to toggle):**
- Card expands to show each attention item as a row:
- Each row:
  - Icon based on type (💳 payment, 📸 photo, 📋 RSVP, 📝 registration, ⭐ evaluation, 📜 waiver)
  - Description: "Sister 1's volleyball RSVP for Saturday"
  - Child name badge (if multi-child)
  - Chevron →
  - Tappable → `router.push(item.route)`
- Items sorted by severity (urgent first)

**If 0 attention items:** Card doesn't render.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: expandable attention items card with per-item navigation"
git push
```

---

## PHASE 5: MULTI-ORG PLAYER CARDS

### 5A. Redesign the player card component

Replace the current yellow-circle list cards with proper branded player cards.

**Create `components/parent-scroll/AthleteCard.tsx`**

**Each card shows ONE child with ALL their sports:**

```
┌─────────────────────────────────────────┐
│  [Photo]  Sister 1              LVL 8   │
│           🏐 BH Elite · #7 · OH         │
│           🏀 BH Hoops · #7              │
│           Next: 🏐 Game today 10am      │
└─────────────────────────────────────────┘
```

- Player photo (48px circle) or initials with gradient background
- Player name (bold)
- Sport pills: one per team, each with sport emoji + team name + jersey number + position
  - Sport pills are color-coded: volleyball=teal background, basketball=coral, soccer=green
  - If team is from a different org: add org name: "⚽ Dallas Strikers U14"
  - Tapping a sport pill → sets context to that child+team, navigates to team hub or child detail
- Next event across any sport (muted text below)
- Level badge (right side)
- Tapping the card itself → navigates to child detail (overview of all sports)

**Multi-child layout:**
- Cards stack vertically with 8px gap
- If > 3 children: show first 2 with "Show all (5)" expandable link
- Each card is the same height regardless of how many sports

### 5B. Context switching from sport pills

When a parent taps a sport pill (e.g., "🏀 BH Hoops"):
- `setSelectedContext({ childId: child.id, teamId: team.id })`
- The rest of the page updates: Quick Glance shows that team's stats, Team Hub preview shows that team's feed
- The context bar at the top updates to show the selected child + sport
- Tapping the pill again deselects (back to family-wide view)

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: multi-org player cards with sport pills and context switching"
git push
```

---

## PHASE 6: CONTEXT BAR + QUICK GLANCE

### 6A. Context Bar

When a specific context is selected (via sport pill, family panel, or any drill-in):

Show a thin bar below the day strip:

```
[Photo] Sister 1 · 🏐 Volleyball · BH Elite    [Switch ▸]
```

- Child photo mini (24px) + name + sport + team
- "Switch ▸" tappable → opens the Family Quick View panel
- This bar only appears when a context is selected
- When no context selected (family-wide view): bar doesn't render

### 6B. Quick Glance — Context-Aware

The Quick Glance grid changes based on whether a context is selected:

**Family-wide (no context):**
- Combined record (most active team, or "6-1 best")
- Total balance due (all children, all sports)
- Level (highest child's level)
- Unread messages (total across all team chats)

**Context selected (specific child + sport):**
- That team's record
- That child's balance for that sport
- That child's level
- That team's chat

Each card is still tappable → navigates to the relevant screen.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 6: context bar with switch, context-aware quick glance"
git push
```

---

## PHASE 7: FAMILY QUICK VIEW PANEL (Right Swipe)

### 7A. Create `components/FamilyPanel.tsx`

A panel that slides in from the RIGHT side of the screen when the user swipes right-to-left, or taps "Switch ▸" on the context bar.

**Must coexist with the GestureDrawer (left swipe = nav drawer, right swipe = family panel).**

**Implementation:**
- Use a `PanGestureHandler` or Reanimated gesture that detects right-to-left swipes on the home screen
- The panel slides in from the right edge, width ~85% of screen
- Dark overlay behind it (tap overlay to close)
- Swipe right to close

**Panel contents:**

**Header (dark navy):**
- "FAMILY OVERVIEW" title
- ✕ close button

**For each child:**
- Child photo + name (section header)
- Under each child, a row per sport/team:
  - Sport-colored dot + sport emoji + team name + org name (if different org)
  - Next event for that team: "Game today 10am"
  - RSVP status: "✓ Going" (teal) or "○ No RSVP" (coral)
  - Tappable → sets context to this child+team, closes panel, homepage updates

**Payments section:**
- Divider
- "PAYMENTS DUE" header
- Per-sport breakdown: "🏐 Volleyball (S1 + S2): $420"
- Total at bottom

**Quick actions at bottom:**
- "View All Registrations" → registration hub
- "View All Payments" → family payments

### 7B. Gesture coexistence with GestureDrawer

The left swipe (GestureDrawer) and right swipe (FamilyPanel) must not conflict:
- Left-to-right swipe on the left edge → opens GestureDrawer (existing behavior)
- Right-to-left swipe anywhere on the home scroll → opens FamilyPanel (new)
- Both cannot be open at the same time
- Opening one closes the other

If gesture coexistence is too complex, an alternative: the FamilyPanel is ONLY opened via the "Switch ▸" button on the context bar (no swipe gesture). This is simpler and avoids gesture conflicts. The swipe gesture can be added later.

### 7C. Conditional rendering

- **1 child, 1 sport:** FamilyPanel doesn't exist. No "Switch ▸" button. No right-swipe gesture.
- **Multi-child or multi-sport:** FamilyPanel is available. "Switch ▸" appears on context bar.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 7: family quick view panel with child/sport rows, payments, context switching"
git push
```

---

## PHASE 8: WIRE EVERYTHING + CLEAN UP + VERIFY

### 8A. Assemble the new ParentHomeScroll

The final scroll order:

1. **Day strip** (existing, unchanged)
2. **Context bar** (only if context selected, conditional)
3. **Billboard Hero** (auto-cycling, all children/sports/orgs)
4. **Also Strip** (horizontal event chips, conditional on > 1 event)
5. **Attention Items** (expandable, conditional on > 0 items)
6. **My Athletes** section header + AthleteCards (multi-sport pills)
7. **Evaluation Card** (if new evaluation available, conditional)
8. **Quick Glance** (context-aware grid)
9. **Team Hub Preview** (context-filtered)
10. **Recent Badges / Shoutouts** (context-filtered)

### 8B. Remove old components

Delete or archive:
- Old `EventHeroCard` (replaced by BillboardHero)
- Old yellow-circle player cards (replaced by AthleteCard)
- Old "8 Open Registrations" card (already killed by registration spec, verify)
- Old "Summer 2026 Registration Open!" card (same)
- Old static attention banner (replaced by expandable)

### 8C. Ensure the ScrollView stays mounted

**CRITICAL:** Do not put any early returns before the ScrollView. The touch-blocking bug we just fixed was caused by unmounting the ScrollView during loading. Keep the ScrollView always mounted. Show loading indicators INSIDE the scroll, not as a replacement.

### 8D. Verify

```bash
# 1. TypeScript
npx tsc --noEmit 2>&1 | grep -v "reference\|design-reference" | tail -10

# 2. New components exist
ls -la components/parent-scroll/BillboardHero.tsx
ls -la components/parent-scroll/AlsoStrip.tsx
ls -la components/parent-scroll/AthleteCard.tsx
ls -la components/FamilyPanel.tsx

# 3. Old components removed/unused
grep -rn "EventHeroCard" components/ParentHomeScroll.tsx | wc -l
# Expected: 0

# 4. Multi-org data fetching
grep -n "allChildren\|allUpcomingEvents\|isMultiChild\|isMultiOrg" hooks/useParentHomeData.ts | head -5

# 5. Billboard cycles events
grep -n "setInterval\|autoAdvance\|cycling\|billboard" components/parent-scroll/BillboardHero.tsx | head -3

# 6. Context switching works
grep -n "selectedContext\|setSelectedContext" hooks/useParentHomeData.ts components/ParentHomeScroll.tsx | head -5

# 7. ScrollView always mounted (no early return before it)
grep -n "return.*Loading\|return.*Spinner\|return.*ActivityIndicator" components/ParentHomeScroll.tsx | head -3
# Expected: 0 (loading states should be INSIDE the scroll, not replacing it)

# 8. Touch handlers on all cards
grep -rn "onPress.*router\|onPress.*push" components/parent-scroll/*.tsx | wc -l
# Expected: many (every card has a working onPress)

git add -A
git commit -m "Phase 8: assemble new parent home, remove old components, verify"
git push
```

---

## EXPECTED RESULTS

1. **Billboard Hero** — auto-cycling event cards across ALL children, ALL sports, ALL orgs. Sport-themed gradient backgrounds. RSVP button cycles statuses. 5-second auto-advance with manual swipe override. Single event = static card. Zero events = friendly empty state.

2. **"Also" Strip** — horizontal scrollable event chips below the hero. Sport-colored dots. Child initials if multi-child. Tappable to jump to that event.

3. **Expandable Attention Items** — tap to expand, see each item with icon + description + child name. Each item tappable → navigates to the right screen. No more "goes to schedule" catch-all.

4. **Multi-Org Player Cards** — each child shows all their sport pills (volleyball + basketball + soccer). Sport pills are color-coded and tappable (sets context). Different orgs labeled. Level badge. Next event across any sport.

5. **Context Bar** — appears when a specific child+sport is selected. Shows who/what you're viewing. "Switch ▸" opens Family Panel.

6. **Context-Aware Quick Glance** — family-wide stats when no context, specific team stats when context selected.

7. **Family Quick View Panel** — slides from right. Shows every child with every sport, RSVP statuses, payment totals, quick actions. Tap any sport row → switch context.

8. **Progressive Disclosure** — 1 child, 1 sport = clean simple page. Multi-child/sport = billboard + context switching. Multi-org = org labels on cards. Simple case never pays the complexity tax.

9. **ScrollView always mounted** — never replaced by a loading screen. Touch handling works on first load.

10. **All card taps verified** — every card has a working onPress with router.push. No visual-only tap animations.

11. **8 commits** — one per phase, each pushed
