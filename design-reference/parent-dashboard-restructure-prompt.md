# Parent Dashboard — Layout Restructure to Match v0 Design

## THE PROBLEM

The Phase 3 Batch 1 work swapped colors, radii, and shadows — but it kept the EXISTING screen layout. The v0 design has a fundamentally DIFFERENT layout, information hierarchy, and visual structure. We need to restructure the ParentDashboard to match the v0 reference exactly.

## CRITICAL RULES (unchanged)
- Do NOT touch Supabase queries, auth, navigation, or data fetching
- Keep all existing data bindings — just render them in new positions
- Keep all onPress handlers and navigation calls
- The screen must still work with real data from Supabase

---

## V0 PARENT DASHBOARD — EXACT LAYOUT (top to bottom)

Look at `design-reference/v0-components/parent-dashboard.tsx` for the source code. Here is what the screen looks like, element by element:

### 1. HEADER BAR (sticky top)

```
┌──────────────────────────────────────────┐
│  🏐 VOLLEYBRAIN          🔔(red dot)  JD │
│  (steel blue background #2C5F7C)         │
└──────────────────────────────────────────┘
```

- Full-width bar, background: `#2C5F7C` (steel blue)
- LEFT: Volleyball icon (20x20 circle, white stroke) inside a 28px circle (white/20% opacity) + "VOLLEYBRAIN" text (12px, extrabold, uppercase, tracking-widest, white)
- RIGHT: Bell icon (18px, white, strokeWidth 1.5) with red notification dot (10px circle, #D94F4F, positioned top-right of bell, with steel-blue border) + User avatar circle (32px, white/20% opacity background, initials in 11px bold white)
- Height: ~48px, padding: 8px vertical, 16px horizontal

**Data mapping:** Use the user's initials from the current auth context. Bell notification count from existing notification data.

### 2. "UPCOMING" FLOATING BADGE

```
         ┌──────────┐
         │ UPCOMING │  (overlaps between header and hero card)
         └──────────┘
```

- Centered horizontally
- Positioned so it overlaps: sits BELOW the header bar but ABOVE the hero card (use negative margin or absolute positioning)
- Background: `#14B8A6` (teal), text: white
- Font: 10px, bold, uppercase, tracking-widest
- Padding: 4px vertical, 16px horizontal
- Border-radius: full round (20+)
- Shadow: small drop shadow
- z-index above the hero card

### 3. GAME DAY HERO CARD

This is the centerpiece. It shows the NEXT upcoming event (game/practice/tournament).

```
┌──────────────────────────────────────────┐
│                                   [AWAY] │
│  (background: event photo or             │
│   volleyball action image)               │
│                                          │
│  TODAY (teal, 12px, extrabold, uppercase) │
│  GAME DAY (white, 22px, extrabold, upper)│
│  vs North Dallas Spike (white/90%, 12px) │
│  Saturday, Feb 21 • 2:00 PM (white/70%)  │
│  Frisco Fieldhouse (white/60%, 10px)     │
│  ┌─────────────┐                         │
│  │📍Get Directions│                       │
│  └─────────────┘                         │
└──────────────────────────────────────────┘
```

- Container: rounded 12, overflow hidden, shadow-lg, height ~220px
- Margin: 16px horizontal, ~20px top (to accommodate the UPCOMING badge overlap), 8px bottom
- BACKGROUND: Full-bleed image. Use an event photo if available, or a default volleyball action image. Use React Native `ImageBackground` or `Image` with absolute positioning.
- GRADIENT OVERLAY: Linear gradient from transparent (top) → #1B2838 at 50% opacity (middle) → #1B2838 solid (bottom). This makes text readable over any photo.
- TOP-RIGHT BADGE: "AWAY" or "HOME" pill badge
  - AWAY: background #E8913A (orange), white text
  - HOME: background #14B8A6 (teal), white text  
  - Font: 9px, bold, uppercase, rounded-full
  - Position: absolute, top 12px, right 12px
- BOTTOM CONTENT (positioned absolute, bottom 0, left 0, right 0, padding 16px):
  - "TODAY" or relative date: teal (#14B8A6), 12px, extrabold, uppercase, tracking-widest
  - "GAME DAY" (or "PRACTICE" or "TOURNAMENT"): white, ~22px, extrabold, uppercase, tracking-wide, Oswald-Bold
  - "vs [Opponent Name]": white at 90% opacity, 12px, medium weight
  - "[Date] • [Time]": white at 70% opacity, 10px
  - "[Venue]": white at 60% opacity, 10px
  - "Get Directions" button: flex row with MapPin icon (10px) + text
    - Background: white at 15% opacity, backdrop-blur
    - Border: 1px white at 20% opacity
    - Text: white, 10px, semibold
    - Padding: 6px vertical, 12px horizontal
    - Border-radius: full round
    - margin-top: 8px
    - Links to maps (use existing navigation/linking logic)

**Data mapping:**
- Use the NEXT upcoming event from the parent's schedule data
- Event type determines the big title: "GAME DAY" / "PRACTICE" / "TOURNAMENT"
- Opponent from the event's opponent field
- Date/time from the event's scheduled_at
- Venue from the event's location
- Home/Away from the event's home_away field (if available)
- "Get Directions" can use Linking.openURL with the venue address
- If NO upcoming event exists, show a fallback card: "No upcoming events" with a subtle background instead of a photo

### 4. "UPCOMING" SECTION with MatchCards

```
UPCOMING                              See All
┌──────────────────────────────────────────┐
│ ▎🏐 B. HORNETS   9:00 AM   EAGLES 🏐   │
│ ▎                 22 FEB                 │
│ ▎     Fieldhouse USA, Frisco TX          │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ ▎🏐 B. HORNETS   2:00 PM   SPARK 🏐    │
│ ▎                 28 FEB                 │
│ ▎     North Dallas Sports Center         │
└──────────────────────────────────────────┘
```

- `<SectionHeader title="Upcoming" action="See All" onAction={navigateToSchedule} />`
- Show 2-3 upcoming matches/events using the `<MatchCard>` component
- Each MatchCard: white card, teal left accent border (4px), rounded 12, shadow
- Layout: [Team icon + name] — [Time (large, bold) + Date (small)] — [Opponent + icon]
- Team icons: 28px circle, #E8F0F5 background, volleyball SVG inside
- Team names: 12px, bold, uppercase, tracking-wide
- Time: 18px, extrabold, steel blue, Oswald-Bold
- Date: 10px, muted gray
- Venue: 10px, muted gray, centered below the row
- Margin between cards: 12px

**Data mapping:** Use existing upcoming events data. Filter to next 2-3 events. Map team names, times, venues from event data.

### 5. "MY PLAYERS" HORIZONTAL SCROLL

```
MY PLAYERS                            See All
┌─────────┐ ┌─────────┐ ┌─────────┐
│ (photo) │ │ (photo) │ │ (photo) │
│         │ │         │ │         │
│ ▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓ │ ← gradient overlay
│ Emma D. │ │ Maya C. │ │ Sophia  │
│ BH 14U  │ │ BH 14U  │ │ BH 14U  │
│ #7  S   │ │ #12 OH  │ │ #4  L   │
└─────────┘ └─────────┘ └─────────┘
     ← horizontally scrollable →
```

- `<SectionHeader title="My Players" action="See All" onAction={navigateToPlayers} />`
- Horizontal `ScrollView` (or FlatList horizontal), snap-to-item
- Each player card:
  - Width: 150px, Height: 210px
  - Border-radius: 12, overflow hidden
  - Shadow: large (shadow-lg)
  - BACKGROUND: Player photo (if available) filling entire card, object-fit cover. If no photo, use a gradient background (#2C5F7C → #14B8A6) with large initials centered.
  - TOP-RIGHT: Small volleyball icon in semi-transparent white circle (24px, white/80% opacity + backdrop-blur)
  - BOTTOM GRADIENT: Linear gradient from transparent (top) → #1B2838 at 80% → #1B2838 solid (bottom). Tall enough to cover the text area (~48% of card height from bottom).
  - BOTTOM TEXT (positioned absolute over gradient):
    - Player name: white, 14px, bold, leading-tight
    - Team name: white at 70% opacity, 10px, medium
    - Row of pills: [Jersey number] + [Position]
      - Number pill: white/20% background, white text, 9px, bold, rounded-full, padding 2px 6px
      - Position pill: teal/30% background, teal text, 9px, bold, rounded-full, padding 2px 6px
- Gap between cards: 12px
- Container padding: 16px horizontal
- Hide scrollbar

**Data mapping:** Use the parent's children/players from existing data. Show player photo (from player profile if available), name, team assignment, jersey number, position.

### 6. "ANNOUNCEMENTS" SECTION (Team Feed Preview)

```
ANNOUNCEMENTS
┌──────────────────────────────────────────┐
│ ▎🏆  Emma's team won! Great game!       │
│ ▎    2 hours ago                         │
└──────────────────────────────────────────┘
```

- `<SectionHeader title="Announcements" />`
- Card with teal left accent border
- Icon (trophy, megaphone, etc.) + text content + timestamp
- This is a PREVIEW of the team feed — show 1-2 recent announcements
- Tapping navigates to the full Team Wall

**Data mapping:** Use existing team feed/announcement data. Show most recent 1-2 items.

---

## WHAT TO REMOVE / RESTRUCTURE FROM CURRENT LAYOUT

The CURRENT ParentDashboard has these elements that need to change:

1. **"Summer 2026 Registration Open!" banner** → REMOVE from the main dashboard flow. This can be a small inline card or notification, NOT a hero-level element. OR move it below Announcements as a subtle card.

2. **"8 Open Registrations" gray card** → REMOVE from hero position. This is secondary info — move to a small badge or notification dot, or put in the "Manage" tab.

3. **Player Trading Card carousel** (the big photo card of Ava Test) → This becomes the "MY PLAYERS" horizontal scroll with SMALLER cards (150x210). The current implementation takes up too much vertical space and doesn't match the v0. The big card concept is great for the PLAYER's own view — not the parent dashboard.

4. **"LATEST" section** → Becomes "ANNOUNCEMENTS" section with the v0's card-with-left-accent-border pattern.

5. **Missing: Game Day Hero Card** → This is the BIGGEST addition. The parent dashboard NEEDS the big hero card with the next game/event info, photo background, gradient, and "Get Directions" button.

6. **Missing: Header Bar** → Need to add the steel blue (#2C5F7C) header bar with VOLLEYBRAIN logo, bell, and avatar.

7. **Missing: "UPCOMING" MatchCards** → Need to add 2-3 match cards between the hero and players section.

---

## IMPLEMENTATION APPROACH

1. **Do NOT delete the existing ParentDashboard.** Instead, restructure its render method to follow the v0 layout order.

2. **Keep all hooks, data fetching, and state** at the top of the component — unchanged.

3. **Restructure the JSX return** to follow this order:
   ```
   <ScrollView>
     <HeaderBar />
     <UpcomingBadge />
     <GameDayHeroCard />
     <SectionHeader title="Upcoming" />
     <MatchCards />
     <SectionHeader title="My Players" />
     <PlayerCardsScroll />
     <SectionHeader title="Announcements" />
     <AnnouncementCards />
     {/* Registration info can go here as a subtle card if needed */}
   </ScrollView>
   ```

4. **Create helper sub-components** within the file (or extract to separate files):
   - `ParentHeaderBar` — the steel blue header
   - `GameDayHeroCard` — the photo + gradient hero card
   - `PlayerMiniCard` — the 150x210 player photo cards

5. **For the Game Day hero card image:**
   - If the event has an associated image → use it
   - If the player has a profile photo → use it as a fallback
   - Otherwise → use a default volleyball stock image or a solid gradient background (#2C5F7C → #1B2838) with the event details overlaid

6. **Test with real data** — make sure the hero card populates from real upcoming events, match cards show real schedule data, player cards show real children, and announcements show real feed data.

---

## VISUAL REFERENCE

The v0 screenshot (Image 4 the user provided, also in design-reference/v0-components/parent-dashboard.tsx) shows:

1. Steel blue header bar with "VOLLEYBRAIN" + bell + avatar → takes up ~48px at top
2. Teal "UPCOMING" pill badge → floats between header and hero
3. Game Day hero card with volleyball photo, dark gradient, "TODAY" label, "GAME DAY" title, opponent, date/time/venue, "Get Directions" button → ~220px tall
4. "UPCOMING" section header with "See All" → then 2 MatchCards with teal left borders
5. "MY PLAYERS" section header with "See All" → then horizontal scroll of 150x210 player photo cards
6. Everything sits on the #C8D3DC dusty blue-gray background
7. Bottom nav at the bottom

The overall feel is: sports broadcast meets social app. Information-dense but not cluttered. The hero card creates drama and excitement. The match cards are clean and scannable. The player cards feel like collecting cards.
