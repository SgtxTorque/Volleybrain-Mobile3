# CC-TEAM-HUB-REDESIGN.md
# Lynx Mobile — Team Hub Redesign: The Social Center

**Priority:** HIGH — this is the community heart of the app and currently looks like an afterthought  
**Estimated time:** 6–8 hours (7 phases, commit after each)  
**Risk level:** MEDIUM — rebuilding an existing tab screen, preserving data connections

---

## WHY THIS EXISTS

The Team Hub is supposed to be where team pride, community, and social engagement live. Facebook Groups meets esports team page. Instead, it currently looks like a generic list with a photo on top and some unstyled rows. Parents don't want to come back to it. Coaches don't feel proud showing it. It doesn't feel like Lynx.

The web admin already has a polished TeamWall with photo grids, lightbox, shoutout digest. The mobile Team Hub needs to match that energy, adapted for the scroll-driven mobile experience.

---

## REFERENCE FILES — READ BEFORE WRITING ANY CODE

### Design References (study the VISION):
1. **`reference/design-references/v0-mockups/components/screens/s5-team-pulse.tsx`** — Team pulse/activity feed mockup
2. **`reference/design-references/v0-mockups/components/screens/s1-player-home.tsx`** — Player home shows how team content integrates into scrolling views
3. **`reference/design-references/brandbook/LynxBrandBook.html`** — Brand system
4. **`reference/design-references/brandbook/lynx-screen-playbook-v2.html`** — Read the "Team Hub" and "Schedule & Events" sections

### Already-Built Components (USE THESE — don't rebuild):
5. **`components/TeamPulse.tsx`** — Activity feed component from CC-PLAYER-EXPERIENCE-BUILD. Shows game results, shoutouts, badges, posts in a chronological feed. Embed this in the hub.
6. **`components/RosterCarousel.tsx`** — Swipeable player cards from CC-PLAYER-EXPERIENCE-BUILD. Use this for the roster section.
7. **`components/PlayerTradingCard.tsx`** — Full trading card. Tapping a player in roster should navigate to this.
8. **`components/TeamWall.tsx`** — Existing post feed component. Already has post cards, composer, reactions. Restyle it, don't rewrite it.
9. **`components/EventCard.tsx`** — Branded event cards. Use for the upcoming events section.

### Current Code (what we're replacing):
10. **`app/(tabs)/parent-team-hub.tsx`** — Current parent team hub
11. **`app/(tabs)/coach-team-hub.tsx`** — Current coach team hub
12. **`components/TeamWall.tsx`** — The existing wall component (restyle, don't rewrite)

### Web Admin Reference (for feature parity):
13. The web admin TeamWall page has: Facebook-style posts with multi-photo grids, lightbox, shoutout card integration, comment threads, reactions. The mobile hub should have the same features.

---

## DESIGN PHILOSOPHY

The Team Hub should feel like opening your team's private Instagram/Facebook Group. It's the place you check to see what's happening, feel connected, and feel proud. Every role sees the same hub but with different capabilities:

- **Coach/Admin:** Can post, edit banner, manage roster, create challenges, send shoutouts
- **Parent:** Can post, react, comment, view roster, RSVP from schedule, share content
- **Player:** Can view, react, see their teammates' cards, view challenges and badges

**Multi-team handling:** If a user has multiple teams (parent with 2 kids, coach with 3 teams), show team selector pills at the very top. Tapping switches the entire hub content. If only one team, no selector — just show the hub.

---

## PHASE 1: HERO BANNER SYSTEM

The hero banner is the first thing you see. It sets the tone for the entire hub.

### 1A. Banner Carousel (Facebook Groups / LinkedIn hybrid)

`components/team-hub/HeroBanner.tsx` — New component.

**3-slide auto-advancing carousel** (7-second interval, manual swipe):

**Slide 1: Team Photo**
- Full-width image, edge-to-edge, 200px tall on phone
- Coach can upload/change this photo (camera icon top-right, coach/admin only)
- Dark gradient overlay at bottom for text readability
- If no photo uploaded: default to a branded placeholder with team color gradient

**Slide 2: Next Game Countdown (dynamic)**
- Team color gradient background
- "NEXT MATCH" or "GAME DAY" label
- "vs [Opponent]" with team names
- Countdown: DAYS | HRS | MINS | SECS in large bold numbers
- Venue and time info below
- If no upcoming game: skip this slide (carousel becomes 2 slides or 1)

**Slide 3: Season Pulse (auto-generated)**
- Team color gradient background
- Season record: "8-2" large
- Current streak: "W3" or "L1"
- Top performer highlight: "Kills Leader: Ava (67)"
- Active player count

**Dot indicators at bottom of carousel for navigation.**

### 1B. Team Identity Bar

Below the banner, overlapping slightly (like LinkedIn profile photo):

- **Team logo** (60px circle, offset left, overlapping the bottom edge of the banner)
  - Coach/admin: camera icon to change logo
- **Team name** (large, bold, brand display font)
- **Record · Streak · Seed** (compact secondary text)
  - "8-2 · W3 · #2 Seed"

### 1C. Ticker Banner

Below the identity bar:

- **Editable text banner** — coaches set a team motto, quote, or announcement
- Max 150 characters
- If text overflows: auto-scrolling marquee animation
- Coach/admin: pencil icon to edit inline
- Default: "Welcome to [Team Name]!" if not set

### 1D. Quick Action Pills

Horizontal scrollable row below the ticker:

- **Feed** (default selected, scrolls to feed section)
- **Roster** (scrolls to roster section)
- **Schedule** (scrolls to schedule section)
- **Gallery** (scrolls to gallery section)
- **Chat** (navigates to the team's chat channel)

These are scroll-to anchors, not tabs that replace content. The hub is ONE scrollable page with sections.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: Team Hub hero banner carousel, identity bar, ticker, quick action pills"
git push
```

---

## PHASE 2: POST FEED (RESTYLE TeamWall)

The feed is the centerpiece. Don't rewrite `TeamWall.tsx` — restyle it to match the brand and add missing social features.

### 2A. Post Composer (top of feed)

- User avatar (left) + "What's on your mind?" input (right) — tappable
- Tap opens full compose modal:
  - Text area (auto-grow)
  - Photo picker (multi-select, up to 10 photos)
  - Tag players (@ mention)
  - Post type selector (if coach): Normal / Announcement / Shoutout
- "Post" button (teal, disabled until content entered)
- Coach/Admin only: can post. Parents can post if the team allows it (configurable).

### 2B. Post Card Styles

Three distinct visual treatments:

**Regular posts:**
- Author avatar + name + role badge + timestamp + kebab menu
- Text content
- Photo grid: 1 photo = full width, 2 = side by side, 3 = 1 large + 2 small, 4+ = grid with "+N" overlay
- Tap any photo → full-screen lightbox with swipe navigation
- Reaction bar: emoji row with counts (tappable to add/remove)
- Comment count: "4 comments" tappable to expand inline

**Announcements (coach/admin):**
- Bold border-left accent (teal)
- "ANNOUNCEMENT" badge at top
- Text in slightly larger font
- Stands out from regular posts

**Shoutout posts (auto-generated or manual):**
- Gold/warm gradient background card
- Shoutout emoji + "gave [Player] a [Category] shoutout!"
- Player mini trading card preview
- Celebration feel — this is a Tier 3 ambient card

**Auto-generated posts:**
- Game reminders: "Game tomorrow vs [Opponent] at [Time]" with RSVP chip
- Badge awards: "[Player] earned the [Badge Name] badge!" with badge icon
- Game results: "We won! 25-18, 25-21 vs [Opponent]" with link to recap
- These have a subtle system-post styling — lighter background, smaller text, no author avatar (system/Lynx mascot)

### 2C. Reactions

- Tap reaction bar → animated emoji picker (5-6 options: 🏐 🔥 💪 🏆 ❤️ 👍)
- Each reaction shows count and who reacted (first 2-3 names + "+N more")
- Tapping an already-selected reaction removes it

### 2D. Comments

- Tap comment count → expand inline comment thread below the post
- Each comment: avatar + name + text + timestamp + like button
- Reply to comments (nested, indented)
- "Add a comment..." input at bottom of expanded thread
- Collapse by tapping comment count again

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: post feed restyle - post cards, announcements, shoutouts, reactions, comments"
git push
```

---

## PHASE 3: GALLERY SECTION

Below the feed (or accessible via the Gallery quick action pill).

### 3A. Gallery Preview

- Section header: "GALLERY" + "View All →" link
- 3×2 grid of recent photo thumbnails (square crops)
- Tap any photo → full-screen lightbox with swipe navigation through all team photos
- Photos are pulled from post attachments (any photo posted in the feed appears in the gallery)

### 3B. Full Gallery View

When "View All" is tapped:
- Full-screen gallery grid: 3 columns, square thumbnails, 2px gap
- Pull to refresh
- Infinite scroll / pagination
- Tap → lightbox with swipe + reactions + comments
- Empty state: `SleepLynx.png` + "No photos yet! Share moments from games and practices."

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: gallery section with preview grid and full gallery view"
git push
```

---

## PHASE 4: ROSTER SECTION

Below the gallery.

### 4A. Roster Preview

- Section header: "ROSTER" + "View All →"
- Use the `RosterCarousel.tsx` component from CC-PLAYER-EXPERIENCE-BUILD
- Shows swipeable player cards with mini stats
- Tap a card → navigates to full `PlayerTradingCard` view (`/player-card?playerId=X`)

### 4B. Roster List View (when "View All" tapped)

- Full roster list using compact `PlayerCard.tsx` components
- Each row: photo, jersey number, name, position badge, mini OVR badge
- Tap → full trading card
- Coach/admin: long-press a player for quick actions (message parent, view profile, give shoutout)
- Sort: by jersey number (default), by name, by position

### 4C. Team Badges Section

Below roster:
- Section header: "TEAM ACHIEVEMENTS"
- 4×2 grid of team-level badges (not individual player badges)
- Earned badges: full color with glow
- Locked: grayscale
- Examples: "10-Win Season", "Undefeated Streak", "100% Attendance", "Tournament Champions"

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: roster section with carousel, list view, team badges"
git push
```

---

## PHASE 5: SCHEDULE + UPCOMING SECTION

Below the roster.

### 5A. Upcoming Events

- Section header: "UPCOMING" + "Full Schedule →"
- Next 3 events using `EventCard.tsx` (branded, with type badges)
- Inline RSVP chip on each card (for parents)
- "Full Schedule →" navigates to the schedule tab

### 5B. Coach Quick Links

Below upcoming events (coach/admin only):

- "Create Challenge" → `/challenges` or challenge creation flow
- "Send Blast" → `/blast-composer`
- "View Attendance" → `/attendance`
- These are compact action rows with icons, not big cards

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: upcoming events section, coach quick links"
git push
```

---

## PHASE 6: WIRE BOTH ROLE HUBS + TEAM SELECTOR

### 6A. Shared TeamHub Component

Create `components/team-hub/TeamHubScreen.tsx` — the main hub component that all roles share:

```typescript
interface TeamHubScreenProps {
  teamId: string;
  teamName: string;
  role: 'admin' | 'coach' | 'parent' | 'player';
}
```

The component renders all sections (banner, feed, gallery, roster, schedule) and conditionally shows/hides features based on role:
- Coach/Admin: can post, edit banner, edit ticker, see coach quick links
- Parent: can post (if allowed), react, comment, RSVP
- Player: can view, react

### 6B. Team Selector (Multi-Team Users)

If a user has multiple teams:
- Team selector pills at the very top of the screen (above the banner)
- Horizontal scrollable: "[Team 1] [Team 2] [Team 3]"
- Active team: teal filled pill. Inactive: outlined.
- Tapping switches the entire hub content

If only one team: no selector shows, banner starts immediately.

### 6C. Wire the Tab Screens

Update both:
- `app/(tabs)/parent-team-hub.tsx` → renders `TeamHubScreen` with role='parent'
- `app/(tabs)/coach-team-hub.tsx` → renders `TeamHubScreen` with role='coach'

Both should use the SAME component with role-based conditional rendering. No more separate implementations that drift apart.

Also check:
- Player team hub (if it exists) → wire to same component with role='player'
- Admin team hub → wire to same component with role='admin'

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 6: shared TeamHubScreen component, team selector, wire all role hubs"
git push
```

---

## PHASE 7: VERIFY EVERYTHING

```bash
# 1. TypeScript clean
npx tsc --noEmit 2>&1 | grep -v "reference\|design-reference" | tail -10

# 2. New components exist
ls -la components/team-hub/
# Expected: HeroBanner.tsx, TeamHubScreen.tsx

# 3. All role hubs use the shared component
grep -n "TeamHubScreen" app/\(tabs\)/parent-team-hub.tsx app/\(tabs\)/coach-team-hub.tsx
# Expected: both import and render TeamHubScreen

# 4. RosterCarousel is used in the hub
grep -n "RosterCarousel" components/team-hub/TeamHubScreen.tsx
# Expected: imported and rendered in roster section

# 5. TeamPulse NOT duplicated (it should be a separate component, not rebuilt inline)
grep -rn "TeamPulse" components/team-hub/ app/
# Expected: imported from components/TeamPulse.tsx

# 6. EventCard used for upcoming events
grep -n "EventCard" components/team-hub/TeamHubScreen.tsx
# Expected: imported and used

# 7. No old-style unstyled team hub code remaining
grep -rn "old.*team\|legacy.*hub" app/\(tabs\)/parent-team-hub.tsx app/\(tabs\)/coach-team-hub.tsx
# Expected: 0 results

git add -A
git commit -m "Phase 7: Team Hub redesign verification"
git push
```

---

## EXPECTED RESULTS

1. **Hero Banner Carousel** — 3-slide (team photo, next game countdown, season pulse) with auto-advance, dot nav, coach-editable photo and logo

2. **Team Identity** — Logo offset like LinkedIn, team name prominent, record/streak/seed, editable ticker banner

3. **Quick Action Pills** — Scroll-to-section navigation: Feed, Roster, Schedule, Gallery, Chat

4. **Social Feed** — Restyled post cards with three visual treatments (regular, announcement, shoutout), photo grids with lightbox, emoji reactions with picker, inline expandable comments, auto-generated system posts (game reminders, badge awards, results)

5. **Gallery** — Preview grid + full gallery with lightbox, photos pulled from post attachments

6. **Roster** — RosterCarousel with swipeable player trading cards, full list view, team badges grid

7. **Upcoming Events** — Next 3 events using branded EventCard, RSVP chips, link to full schedule

8. **Shared Component** — One `TeamHubScreen` component used by ALL roles (parent, coach, player, admin) with conditional features

9. **Multi-Team Selector** — Pill bar at top for users with multiple teams, switches entire hub content

10. **7 commits** — one per phase, each pushed
