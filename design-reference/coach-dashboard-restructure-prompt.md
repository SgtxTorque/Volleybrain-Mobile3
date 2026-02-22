# Coach Dashboard — Layout Restructure to Match v0 Design

## THE GOAL

The Coach Dashboard should feel JUST AS ALIVE as the Parent Dashboard. Same premium sports broadcast energy: hero card with photo and gradient, real data visualization, Oswald-Bold typography, and that "I'm in the zone" coaching feel. The coach is the field general — their dashboard should feel like a command center that's also exciting to look at.

## CRITICAL RULES (unchanged)
- Do NOT touch Supabase queries, auth, navigation, or data fetching
- Keep all existing data bindings — just render them in new positions
- Keep all onPress handlers and navigation calls
- The screen must still work with real data from Supabase

---

## V0 COACH DASHBOARD — EXACT LAYOUT (top to bottom)

### 1. HEADER BAR (same as Parent)

```
┌──────────────────────────────────────────┐
│  🏐 VOLLEYBRAIN          🔔(red dot)  CC │
│  (steel blue background #2C5F7C)         │
└──────────────────────────────────────────┘
```

- Identical to the Parent Dashboard header bar
- Same steel blue (#2C5F7C) background
- LEFT: Volleyball icon circle + "VOLLEYBRAIN" text
- RIGHT: Bell with notification dot + Coach avatar (initials)
- Consider extracting a shared `<AppHeaderBar>` component if not done already, so both Parent and Coach use the same one.

### 2. TEAM SELECTOR (PillTabs)

```
┌──────────────────────────────────────────┐
│  [ 13U ] [ BH Stingers ] [ BH Elite ]   │
│  (steel blue active, light gray inactive)│
└──────────────────────────────────────────┘
```

- Use `<PillTabs>` component
- Shows all teams the coach manages
- Active tab: steel blue (#2C5F7C) background, white text
- Inactive: transparent, muted gray text
- Background container: #E8F0F5
- Switching tabs changes ALL content below to that team's data
- This already exists — just make sure it uses the shared PillTabs component

### 3. HERO CARD — NEXT EVENT (with photo, just like Parent)

This is the KEY change. The coach gets a hero card just like the parent — with a photo background and gradient overlay. The content is coach-specific though.

```
┌──────────────────────────────────────────┐
│                              [PRACTICE]  │
│  (background: team photo, action shot,   │
│   or player photo from the team)         │
│                                          │
│  TODAY (teal, 12px, extrabold, uppercase) │
│  PRACTICE (white, 22px, Oswald-Bold)     │
│  Black Hornets 14U                       │
│  🕐 3:00 PM  📍 Court 3                 │
│  Fieldhouse USA, Frisco TX               │
│                                          │
│  ┌─────────────────────┐                 │
│  │ RSVP        9/12    │ ← gradient pill │
│  │ Confirmed           │                 │
│  └─────────────────────┘                 │
│                                          │
│  ● ● ● ● ● ● ● ● ● ○ ○ ? ← attendance │
└──────────────────────────────────────────┘
```

- Container: rounded 12, overflow hidden, shadow-lg, height ~260px (slightly taller than parent to fit attendance)
- Margin: 16px horizontal, 12px vertical
- BACKGROUND IMAGE: Use one of these (in priority order):
  1. Team photo from team profile/media
  2. A player action photo from any player on the team
  3. A default volleyball action stock image
  4. Fallback: gradient background (#2C5F7C → #1B2838)
  - Use React Native `ImageBackground` with `resizeMode="cover"`
- GRADIENT OVERLAY: Same as parent — linear gradient from transparent (top) → rgba(27,40,56,0.5) (middle) → rgba(27,40,56,0.95) (bottom)
- TOP-RIGHT BADGE: Event type pill
  - "PRACTICE": teal (#14B8A6) background
  - "GAME DAY": coral (#D94F4F) background  
  - "TOURNAMENT": orange (#E8913A) background
  - Font: 9px, bold, uppercase, rounded-full, white text
  - Position: absolute, top 12px, right 12px
- BOTTOM CONTENT (absolute positioned, bottom 0, left/right 0, padding 16px):
  - Relative date: "TODAY" or "TOMORROW" or "IN 3 DAYS" — teal (#14B8A6), 12px, extrabold, uppercase, tracking-widest
  - Event title: "PRACTICE" or "GAME DAY" or "TOURNAMENT" — white, 22px, Oswald-Bold, uppercase
  - Team name: white at 80% opacity, 13px
  - Time + Court: row with clock emoji + time, map pin emoji + court — white at 70%, 11px
  - Venue: white at 60%, 10px
  - RSVP BLOCK (positioned bottom-right of the content area):
    - Small card/pill with gradient background (steel blue → teal)
    - "RSVP" label: 9px, white at 80%
    - Count: "9/12" in 22px, Oswald-Bold, white
    - "Confirmed" label: 9px, white at 70%
    - Border-radius: 10
    - Padding: 8px 12px
  - ATTENDANCE DOTS ROW (below text, above bottom edge):
    - Row of small circles (18-20px each)
    - Green (#22C55E): confirmed ✓
    - Gray light (#D9E2E9): declined ✗
    - Orange (#E8913A): pending ?
    - Each dot: circle with 8px white text icon inside
    - Flex row, gap 3px
    - This is a signature coach feature — shows at-a-glance who's coming

**Data mapping:**
- Next upcoming event from the selected team's schedule
- Event type → title and badge color
- RSVP count from event attendees
- Attendance dots from individual RSVP responses
- Team name from selected team
- Time/venue from event data

**If no upcoming event:** Show an "All Clear" card with a subtle background (no photo), calendar icon, "No upcoming events" text, "All Clear" in Oswald-Bold. Still use the card structure but with a solid gradient background instead of a photo.

### 4. MISSION BRIEFING (Next Event Details — if different from hero)

If the hero shows a practice but there's also an upcoming GAME, show a secondary briefing card:

```
MISSION BRIEFING
┌──────────────────────────────────────────┐
│ ▎  ⚡ GAME                              │
│ ▎                                        │
│ ▎  vs North Dallas Spike                 │
│ ▎  Saturday, Feb 22 • 2:00 PM            │
│ ▎  Frisco Fieldhouse                     │
│ ▎                                        │
│ ▎  IN 2 DAYS  (countdown, Oswald-Bold)   │
└──────────────────────────────────────────┘
```

- `<SectionHeader title="Mission Briefing" />`
- `<Card accentColor={eventTypeColor}>` with left accent border
- Event type badge at top: `<Badge label="GAME" color={colors.danger} />`
- Opponent name: bold, 15px
- Date/time/venue: secondary text
- Countdown: Oswald-Bold, teal, e.g. "IN 2 DAYS" or "TOMORROW" or "IN 5 HOURS"

### 5. TEAM HEALTH ROW (3 stat cards)

```
TEAM HEALTH
┌──────────┐ ┌──────────┐ ┌──────────┐
│    ✅    │ │    🖐    │ │    🏅    │
│   100%   │ │    --    │ │    0     │
│Attendance│ │Available │ │  Badges  │
└──────────┘ └──────────┘ └──────────┘
```

- `<SectionHeader title="Team Health" />`
- Row of 3 cards, each with:
  - Icon at top (emoji or custom icon): 24px
  - Value: Oswald-Bold, 24px, colored by status (green if good, orange if warning, coral if bad)
  - Label: 10px, uppercase, muted gray
  - Background: white card, rounded 12, shadow
  - Colored top border (3px): green for good, orange for warning, etc.
- This pattern is similar to `<StatBox>` but with an icon above — use StatBox with custom wrapper, or keep as custom cards with design tokens applied
- Flex row, gap 8-10px, each card flex: 1

### 6. SEASON STATS ROW (4 stat boxes)

```
SEASON OVERVIEW                    Details
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│   8    │ │   3    │ │  12    │ │  .727  │
│  Wins  │ │ Losses │ │Players │ │ Win %  │
│ (green)│ │ (coral)│ │(steel) │ │ (teal) │
└────────┘ └────────┘ └────────┘ └────────┘
```

- `<SectionHeader title="Season Overview" action="Details" onAction={navigateToStats} />`
- Row of 4 `<StatBox>` components
- Each StatBox: colored 3px top border, Oswald-Bold number, uppercase label
- Colors: Wins=green, Losses=coral, Players=steel blue, Win%=teal
- Flex row, gap 8px, each flex: 1

### 7. TOP PERFORMERS

```
TOP PERFORMERS
┌────┐ ┌────┐ ┌────┐
│ ED │ │ SM │ │ AJ │  ← Avatar circles
│Emma│ │Soph│ │Ava │
│ 12a│ │ 8k │ │ 6d │  ← stat under name
└────┘ └────┘ └────┘
    ← horizontally scrollable →
```

- `<SectionHeader title="Top Performers" />`
- Horizontal scroll of performer mini-cards
- Each card:
  - `<Avatar>` circle (44px) with player initials, colored by accent
  - Player name below: 11px, bold
  - Stat highlight: 10px, muted gray (e.g., "12 aces", "8 kills")
  - Background: white card, rounded 12, shadow, padding 12px
  - Width: ~90px, center-aligned content
- If player has a photo, use photo in circle instead of initials

### 8. UPCOMING MATCHES (same MatchCard pattern as Parent)

```
UPCOMING MATCHES                Full Schedule
┌──────────────────────────────────────────┐
│ ▎🏐 B. HORNETS   2:00 PM   N. DALLAS 🏐│
│ ▎                 22 FEB                 │
│ ▎     Frisco Fieldhouse • Away           │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ ▎🏐 B. HORNETS   8:00 AM   TOURNAMENT🏆│
│ ▎                  8 MAR                 │
│ ▎     Dallas Convention Center           │
└──────────────────────────────────────────┘
```

- `<SectionHeader title="Upcoming Matches" action="Full Schedule" onAction={navigateToSchedule} />`
- 2-3 `<MatchCard>` components
- Same pattern as Parent Dashboard match cards
- Left accent: steel blue for regular, orange for tournaments

### 9. RECENT RESULTS

```
RECENT RESULTS                      See All
┌──────────────────────────────────────────┐
│ ▎  B. HORNETS    25  vs  21    N. DALLAS │
│ ▎            WIN • FINAL                 │
└──────────────────────────────────────────┘
```

- `<SectionHeader title="Recent Results" action="See All" />`
- Card with green left accent border (for wins) or coral (for losses)
- Score display: team names on sides, scores in Oswald-Bold, "vs" in muted gray center
- Result badge: `<Badge label="WIN • FINAL" color={colors.success} />`

### 10. QUICK ACTIONS (bottom of scroll)

```
QUICK ACTIONS
┌────────────┐ ┌────────────┐
│  📋        │ │  📊        │
│ Take       │ │ Enter      │
│ Attendance │ │ Stats      │
└────────────┘ └────────────┘
┌────────────┐ ┌────────────┐
│  📝        │ │  💬        │
│ Plan       │ │ Team       │
│ Practice   │ │ Chat       │
└────────────┘ └────────────┘
```

- `<SectionHeader title="Quick Actions" />`
- 2x2 grid of action cards
- Each card: white, rounded 12, shadow, padding 16px
- Icon at top (24px emoji or custom icon)
- Label below: 12px, bold, navy
- Tappable — each navigates to the relevant screen
- Grid: 2 columns, gap 10px

### 11. SEASON PROGRESS (optional, if data available)

```
SEASON PROGRESS
┌──────────────────────────────────────────┐
│ ▎ Record: 8-3  │  Games Played: 11/20   │
│ ▎ ████████░░░░░░░░░░░░  55%             │
└──────────────────────────────────────────┘
```

- `<Card>` with progress bar
- Record in Oswald-Bold
- Progress bar: teal fill on light gray track, rounded
- Games played count

---

## WHAT TO CHANGE FROM CURRENT LAYOUT

The current Coach Dashboard has:
1. PillTabs team selector ✅ (keep)
2. Hero card with team name + record — but NO PHOTO, no gradient, no "alive" feel → **REPLACE with photo hero card**
3. "Mission Briefing" section → **KEEP but restyle as Card with accent border**
4. Team Health row → **KEEP but update styling with design tokens**
5. Top Performers → **KEEP but update with Avatar component**
6. Quick Actions → **KEEP but update radii/shadows**
7. Season Progress → **KEEP but update styling**

**The BIG change is #2 — the hero card needs the SAME photo + gradient + overlay treatment as the Parent Dashboard's Game Day hero.** This is what makes it feel alive.

---

## PHOTO STRATEGY FOR HERO CARD

Since coaches may not always have team action photos uploaded yet, here's the fallback chain:

1. **Team profile photo** (if the team has one uploaded) → best option
2. **Most recent player photo** from any player on the selected team → good fallback
3. **Event photo** if the event has an associated image → decent fallback
4. **Default volleyball action image** → use a bundled asset (a volleyball court, players in action, etc.)
5. **Solid gradient** (#2C5F7C → #1B2838) → last resort, still looks premium

To implement, check if the team/players have photos in the existing data. If not, bundle 2-3 stock volleyball images as local assets that can be used as defaults. This ensures the hero card ALWAYS has visual impact even before users upload their own photos.

For the default images:
- Create/add a default hero image at `assets/images/default-hero.jpg` (or similar)
- Use `require('../assets/images/default-hero.jpg')` as the fallback in ImageBackground

---

## IMPLEMENTATION ORDER

1. Create the shared `<AppHeaderBar>` component if not already done (shared between Parent and Coach)
2. Restructure the hero card section to use ImageBackground + gradient overlay + absolute-positioned content
3. Add RSVP block and attendance dots to the hero card
4. Update Mission Briefing to use Card with accent border
5. Confirm Team Health, Season Stats, Top Performers, Quick Actions all use design tokens
6. Add MatchCards for upcoming matches
7. Add Recent Results section
8. Test with real data — switch between teams, verify all data loads

---

## VISUAL ENERGY CHECKLIST

After the restructure, the Coach Dashboard should pass these "alive" tests:

- [ ] Hero card has a PHOTO with dark gradient — not a flat white card
- [ ] "TODAY" or relative date is in teal, creating visual excitement
- [ ] Event type is in big bold Oswald uppercase — PRACTICE / GAME DAY / TOURNAMENT
- [ ] RSVP count is visible at a glance in the gradient pill
- [ ] Attendance dots give instant visual feedback on who's coming
- [ ] Season stats have colored top borders with bold numbers
- [ ] Section headers are Oswald-Bold uppercase with tracking
- [ ] Match cards show team vs team with bold times
- [ ] Everything sits on #C8D3DC dusty blue-gray background
- [ ] Cards are white, rounded 12, with subtle shadows
- [ ] The screen feels like opening a sports app, not a spreadsheet
