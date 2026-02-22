# VolleyBrain — Full Screen Redesign Sprint

## MISSION
Apply the v0 "alive" design treatment to EVERY remaining screen. Same energy as the Parent and Coach dashboards: photo hero cards where appropriate, Oswald-Bold typography, elevated white cards, teal/steel blue accents, sports broadcast feel.

## RULES (same as always)
- Do NOT touch Supabase queries, auth, navigation, or data fetching
- Keep all existing data bindings, onPress handlers, navigation calls
- Keep all hooks and state management unchanged
- Only restructure JSX rendering and styles
- Commit after EACH batch with a clear message
- Test `npx tsc --noEmit` after each batch

## SCREENS TO SKIP (for now)
- Player experience / player-specific dashboard
- Achievements / trophies / badges screens
- Any screen that doesn't exist yet

---

## GLOBAL FIXES (do these FIRST before any screen work)

### Fix 1: PillTabs Overflow
The PillTabs component breaks when team names are long (e.g., "BLACK HORNETS ELITE" overlaps). Fix:
- Make PillTabs horizontally scrollable when content overflows
- Wrap the tab container in a horizontal ScrollView with `showsHorizontalScrollIndicator={false}`
- Each tab gets `paddingHorizontal: 16`, no flex: 1 — tabs should be natural width
- If only 2-3 short tabs, they can still center. But if 4+ or long names, they scroll.
- Alternatively: truncate team names with `numberOfLines={1}` and max width per tab

### Fix 2: Shared AppHeaderBar Component
If not already extracted, create a shared `<AppHeaderBar>` component used by Parent, Coach, Admin, and any screen that needs the steel blue header with VOLLEYBRAIN logo, bell, and avatar. Props:
- `showLogo?: boolean` (default true)
- `title?: string` (alternative to logo, for sub-screens like "SCHEDULE", "TEAM WALL")
- `leftIcon?: ReactNode` (back arrow for sub-screens)
- `rightIcon?: ReactNode` (custom right side)
- `showNotificationBell?: boolean` (default true)
- `showAvatar?: boolean` (default true)

### Fix 3: MY PLAYERS Cards (Parent Dashboard)
The player mini cards are showing yellow-green gradients instead of player photos. Fix:
- Check if player profile photos are being passed to the ImageBackground
- If player has a `photo_url` → use it as the card background
- If no photo → use a gradient background (#2C5F7C → #14B8A6) with large initials centered
- The navy gradient overlay at the bottom should ALWAYS be present (for text readability)

---

## BATCH 1: Game Day Screen

### File: app/(tabs)/gameday.tsx + components/AdminGameDay.tsx

The Game Day screen is where coaches and parents go on game day. It should feel ELECTRIC — this is the most exciting moment in the app.

### Coach/Parent Game Day Layout:

```
┌──────────────────────────────────────────┐
│  VOLLEYBRAIN header (or "Game Day" title)│
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ (PHOTO background + gradient overlay)    │
│                              [HOME] pill │
│                                          │
│  TODAY (teal, extrabold)                 │
│  GAME DAY (white, 28px, Oswald-Bold)    │
│  IN 2 DAYS (teal, 22px, Oswald-Bold)    │
│  vs Banks                                │
│  📅 Tuesday, Feb 24, 2026               │
│  🕐 6:00 PM - 8:00 PM                   │
│  📍 Frisco Fieldhouse                    │
│                                          │
│  [Prep Lineup]  [Get Directions]         │
└──────────────────────────────────────────┘

THIS WEEK
┌──────────────────────────────────────────┐
│ ▎🏆 vs Long Stockings         [AWAY]    │
│ ▎   Thu, Feb 26 • 8:30 PM               │
│ ▎   1 going  11 pending                 │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ ▎💚 Practice                             │
│ ▎   Sat, Feb 28 • 6:00 PM               │
└──────────────────────────────────────────┘
```

**Key changes:**
- The hero card MUST have a photo background + gradient overlay (same as Parent/Coach hero cards). Use team photo, player photo, or default volleyball image.
- "GAME DAY" in massive Oswald-Bold white text
- Countdown "IN 2 DAYS" in large teal Oswald-Bold
- HOME/AWAY badge in top-right
- "Prep Lineup" button: steel blue background, white text, rounded-full
- "Get Directions" button: white/15% opacity background with border, white text, rounded-full
- Event cards below use Card component with left accent borders (coral for games, teal for practice, orange for tournaments)
- RSVP counts ("1 going, 11 pending") with colored text

### Admin Game Day Layout:
- Similar structure but showing ALL teams' games for the day
- Each team's game in its own Card with team name and status
- Overview stats at top: "3 games today", "2 venues", etc.

---

## BATCH 2: Schedule Screen

### File: app/(tabs)/schedule.tsx + components/EventCard.tsx

Reference: `design-reference/v0-components/full-schedule.tsx`

### Layout:

```
┌──────────────────────────────────────────┐
│  ←  SCHEDULE  ⚙️                         │
│  (white bg or steel blue header)         │
└──────────────────────────────────────────┘

[ HORNETS 14U ] [ HORNETS 16U ] [ ALL TEAMS ]  ← PillTabs

        ◀  MARCH 2026  ▶                      ← Month nav

┌──────────────────────────────────────────┐
│ ▎ 1   PRACTICE        9:00 AM — 11:00AM │
│ ▎SAT  Fieldhouse USA, Frisco TX      ✅  │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ ▎ 8   TOURNAMENT      8:00 AM — 6:00 PM │
│ ▎SAT  Dallas Convention Center       🕐  │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ ▎15   MATCH           2:00 PM — 4:00 PM │
│ ▎SAT  vs North Dallas • Home Court   🕐  │
└──────────────────────────────────────────┘

     [ RSVP ALL PENDING ]  ← teal button
```

**Key patterns from v0:**
- Each schedule card has: large day number (24px, extrabold, navy) + day-of-week (9px, uppercase) on the LEFT
- Event type badge: PRACTICE (teal), TOURNAMENT (orange), MATCH (navy) — pill badges
- Time range: bold, 14px
- Venue + opponent: 10px, muted gray
- RSVP status icon on the RIGHT: green check (confirmed), orange clock (pending), red X (declined) — in a 28px colored circle
- Left accent border matches event type color
- Month navigation: centered, Oswald-Bold, with chevron arrows
- Bottom CTA: "RSVP ALL PENDING" — full-width teal button, rounded-full, bold uppercase

**EventCard component** should be updated to match this ScheduleCard pattern from the v0.

---

## BATCH 3: Admin Dashboard

### File: components/AdminDashboard.tsx

The Admin manages the entire club. Their dashboard should feel like a control tower — clean, data-rich, but still visually premium.

### Layout:

```
┌──────────────────────────────────────────┐
│  VOLLEYBRAIN header           🔔  AD     │
└──────────────────────────────────────────┘

CLUB OVERVIEW
Black Hornets Volleyball Club

┌──────────────────────────────────────────┐
│ (hero card with gradient — club photo    │
│  or volleyball stock image)              │
│                                          │
│  BLACK HORNETS ATHLETICS (Oswald, white) │
│  Spring 2026  [ACTIVE] badge             │
│  17 Players • 4 Teams • 5 Coaches        │
└──────────────────────────────────────────┘

NEEDS ATTENTION
┌──────────────────────────────────────────┐
│ ▎⚠️ 3 Pending Registrations             │
│ ▎   Awaiting payment & waivers       ›  │
└──────────────────────────────────────────┘
(more alert cards with colored left accents)

REVENUE — SPRING 2026                Reports
┌────────┐ ┌────────┐ ┌────────┐
│ $14.2K │ │ $3.8K  │ │  $18K  │
│Collected│ │Outstndg│ │ Total  │
│ (green) │ │(orange)│ │(steel) │
└────────┘ └────────┘ └────────┘

┌──────────────────────────────────────────┐
│ ▎Payment Collection              79%     │
│ ▎████████████████░░░░░░░░               │
│ ▎38 of 48 families    10 overdue         │
└──────────────────────────────────────────┘

TEAMS                              Manage
(team cards with player/coach counts + status badges)

RECENT ACTIVITY                    See All
(activity feed cards with icons + timestamps)
```

**Key changes:**
- Hero card gets the photo + gradient treatment (use club logo/photo or default)
- "NEEDS ATTENTION" alert cards with colored left accent borders (coral for urgent, orange for warning, teal for info)
- Revenue stat boxes using `<StatBox>`
- Payment progress bar in a `<Card>`
- Team overview cards with badges
- Activity feed with icon + text + timestamp

---

## BATCH 4: Team Management + Registration

### Files: app/team-management.tsx, app/registration-hub.tsx

### Team Management:
- AppHeaderBar with "TEAM MANAGEMENT" title
- Team cards with: team name (Oswald-Bold), player count, coach count, season, status badge
- Each team card tappable → navigates to team detail
- Player list within team: avatar + name + position badge + jersey number
- Use `<Card>`, `<Badge>`, `<Avatar>`, `<SectionHeader>` throughout

### Registration Hub:
- AppHeaderBar with "REGISTRATION" title
- Season selector PillTabs
- Registration stats: StatBox row (Total, Approved, Pending, Waitlist)
- Registration list: Cards with player name, parent name, status badge, payment status
- Status badges: Approved (green), Pending (orange), Waitlisted (gray), Declined (coral)
- Each card has left accent border matching status color

---

## BATCH 5: Payments Screens

### Files: app/(tabs)/payments.tsx, app/payments-parent.tsx (if exists)

### Coach/Admin Payments:
- AppHeaderBar with "PAYMENTS" title
- Summary stat boxes: Total Due, Collected, Outstanding, Overdue
- Payment progress bar (same pattern as Admin dashboard)
- Family payment list: Cards with family name, amount, status badge, due date
- Status: Paid (green), Partial (orange), Overdue (coral), Pending (gray)
- Left accent borders matching status

### Parent Payments:
- Balance summary card (what they owe)
- Payment history list
- Upcoming payments
- "Make Payment" CTA button (teal, full-width, rounded-full)

---

## BATCH 6: Manage Tab + Settings

### Files: app/(tabs)/manage.tsx, app/(tabs)/me.tsx, app/season-settings.tsx

### Manage Tab:
- Grid or list of management options
- Each option: Card with icon + title + description
- Icons in colored circles (teal, steel blue, orange)
- Options: Teams, Registration, Payments, Reports, Season Settings, Waivers, etc.
- Clean 2-column grid layout

### Me / Profile:
- Profile header: large avatar (80px) + name (Oswald-Bold) + role badge
- Settings list: grouped into sections
- Each setting row: icon + label + chevron right
- Section headers using `<SectionHeader>`
- Cards grouping related settings
- "Sign Out" button at bottom: outlined style, coral text

### Season Settings:
- AppHeaderBar with "SEASON SETTINGS" title
- Season info card: name, dates, status badge
- Settings organized in Card groups
- Toggle switches for features
- Clean form-like layout

---

## BATCH 7: Chat / Team Wall

### Files: Any chat-related screens

Reference: `design-reference/v0-components/team-wall.tsx`

### Team Wall / Chat:
- AppHeaderBar with "TEAM WALL" title + compose icon (right)
- PillTabs for team selection (or channel selection: General, Coaches, Game Day, Carpool)
- Team identity banner: volleyball icon + team name (Oswald-Bold) + season + sub-tabs (Feed, Media, Files)
- Post cards (each post is a Card with left accent border):
  - Author row: Avatar (32px) + name (bold) + role badge ("Coach") + timestamp
  - Content text
  - Optional: embedded photo (full-width, rounded corners, inside card)
  - Optional: embedded mini-scoreboard (for match result posts)
  - Reactions row: emoji chips with counts (e.g., "👏 12", "💬 3")
  - "Like" and "Comment" action links (steel blue, right-aligned)
- Floating Action Button (FAB): teal circle (56px) with "+" icon, bottom-right, above nav
- Post type color coding: Coach posts = steel blue border, Match results = teal border, Parent posts = orange border, Pinned = navy border

---

## BATCH 8: Remaining Misc Screens

### Any screen not covered above:
- Apply consistent patterns:
  - AppHeaderBar for the top
  - SectionHeaders for sections
  - Cards for content blocks
  - Badges for status indicators
  - Design tokens for all colors, radii, shadows, spacing
  - Oswald-Bold for display text
  - borderRadius: 12 (not 20)
  - shadows from design tokens (not inline Platform.select)
  - #C8D3DC background

---

## EXECUTION ORDER

1. **Global Fixes** (PillTabs, AppHeaderBar, MY PLAYERS photos)
2. **Batch 1: Game Day** (highest visibility, most exciting)
3. **Batch 2: Schedule** (clean v0 reference to match exactly)
4. **Batch 3: Admin Dashboard** (hero + data)
5. **Batch 4: Team Management + Registration**
6. **Batch 5: Payments**
7. **Batch 6: Manage + Me + Settings**
8. **Batch 7: Chat / Team Wall**
9. **Batch 8: Remaining**

**After each batch:** run `npx tsc --noEmit`, commit with message like:
```
refactor: Batch 1 — Game Day v0 redesign
refactor: Batch 2 — Schedule v0 redesign
```

---

## DESIGN ENERGY CHECKLIST

Every screen should pass these tests:
- [ ] Hero/featured cards have photo backgrounds with gradient overlays (where appropriate)
- [ ] Oswald-Bold on all display text (section headers, big numbers, titles)
- [ ] White elevated cards with 12px radius and subtle shadows
- [ ] Left accent borders on cards that need status/type indication
- [ ] Status badges using Badge component (green/orange/coral/teal pills)
- [ ] StatBox for number displays with colored top borders
- [ ] Consistent spacing (16px screen padding, 12px card gaps)
- [ ] #C8D3DC background everywhere
- [ ] Steel blue (#2C5F7C) header bar with VOLLEYBRAIN or screen title
- [ ] No flat, lifeless white screens — everything should feel like a premium sports app
- [ ] All existing functionality still works
