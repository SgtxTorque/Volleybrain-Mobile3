# CC-WAVE-3-DAILY-USE-SCREENS.md
# Lynx Mobile — Wave 3: Schedule, Chat & Team Hub

**Priority:** Run after CC-WAVE-2-AUTH-REDESIGN completes  
**Estimated time:** 4–6 hours (7 phases, commit after each)  
**Risk level:** MEDIUM — brand pass on functional screens + EventDetailModal redesign  

---

## WAVE CHECKLIST (update as completed)

- [ ] **Wave 0** — Archive dead code + wire admin stubs
- [ ] **Wave 1** — Kill ParentOnboardingModal + shared components brand pass
- [ ] **Wave 2** — Auth redesign + smart empty states
- [ ] **Wave 3** — Daily-use screens (Schedule, Chat, Team Hub) ← THIS SPEC
- [ ] Wave 4 — Player identity screens (Child Detail, My Stats, Achievements)
- [ ] Wave 5 — Coach tool screens (Attendance, Game Results, Lineup Builder)
- [ ] Wave 6 — Admin management screens
- [ ] Wave 7 — Settings, legal, remaining screens
- [ ] Wave 8 — New/planned screens

---

## REFERENCE FILES — READ BEFORE WRITING ANY CODE

Read `LYNX-REFERENCE-GUIDE.md` in the repo root for the full reference map. For this wave specifically, read these in order:

### Brand & Design System
1. `reference/design-references/brandbook/LynxBrandBook.html` — Brand colors, fonts, card patterns, component specs
2. `reference/design-references/brandbook/lynx-screen-playbook-v2.html` — Open and read the JavaScript `screens` array. Find and read:
   - **"Schedule & Events"** section — Schedule (All Roles), Event Detail (Bottom Sheet), Bulk Event Creation
   - **"Chat & Communication"** section — Chat List, Chat Thread, Blast Composer, Blast History
   - **"Team Hub & Social"** section — Team Hub, Post Composer, Team Gallery, Team Wall, Shoutout Flow

### V0 Design Mockups (read for visual patterns, translate to React Native)
3. `reference/design-references/v0-mockups/components/` — Scan for any schedule, chat, or team-related styled components. Use the Tailwind classes to understand the intended spacing, colors, radius.
4. `reference/design-references/player-mockups/s5-team-pulse.tsx` — Team activity pulse design (relevant for Team Hub)

### Mascot Images (use real assets, not placeholders)
5. `reference/design-references/images/SleepLynx.png` — USE for "no events today" and other empty states
6. `reference/design-references/images/volleyball-game.jpg` — Available for game event hero images
7. `reference/design-references/images/volleyball-practice.jpg` — Available for practice event images

**IMPORTANT:** If mascot/brand images need to be imported in the app, copy them to `assets/images/mascot/` and `assets/images/brand/` first. Do not import directly from the reference folder at runtime.

### Database Schema
8. `reference/supabase_schema.md` or `SCHEMA_REFERENCE.csv` — Table structures for events, chat_channels, chat_messages, team_wall_posts, rsvps

### Design Tokens (updated in Wave 1)
9. `theme/colors.ts` — Brand color constants
10. `lib/design-tokens.ts` — Spacing, radius, shadows

---

## KEY INSIGHT: SHARED COMPONENTS

Many tab files re-export the same core component. Style the core once, all variants inherit:

| Core Component | Tab Files That Use It |
|----------------|----------------------|
| Schedule screen | `parent-schedule`, `coach-schedule`, `admin-schedule`, `schedule` |
| Chat list | `chats`, `parent-chat`, `coach-chat`, `admin-chat` |
| Team hub | `parent-team-hub`, `coach-team-hub` |
| Team wall | `team-wall` (standalone stack screen) |

**Strategy:** Style the core. Verify each tab wrapper renders the styled version correctly.

---

## PHASE 0: WIRE admin-chat + COPY MASCOT ASSETS

### 0A. Wire admin-chat.tsx

`app/(tabs)/admin-chat.tsx` is unreachable — no navigation points to it.

1. Open it — check if it already re-exports coach-chat
2. If not, make it re-export:
```typescript
export { default } from './coach-chat';
```
3. Wire navigation: ensure GestureDrawer "Chat" menu item for admin role navigates to `/(tabs)/admin-chat`

### 0B. Copy Mascot Assets to App Assets

Copy the mascot images from the reference folder into the app's runtime assets folder so they can be imported in components:

```bash
mkdir -p assets/images/mascot
mkdir -p assets/images/brand
cp reference/design-references/images/celebrate.png assets/images/mascot/
cp reference/design-references/images/HiLynx.png assets/images/mascot/
cp reference/design-references/images/SleepLynx.png assets/images/mascot/
cp reference/design-references/images/Meet-Lynx.png assets/images/mascot/
cp reference/design-references/images/laptoplynx.png assets/images/mascot/
cp reference/design-references/images/lynx-logo.png assets/images/brand/
cp reference/design-references/images/lynx-icon-logo.png assets/images/brand/
cp reference/design-references/images/volleyball-game.jpg assets/images/brand/
cp reference/design-references/images/volleyball-practice.jpg assets/images/brand/
```

If `assets/images/mascot/` already exists with some of these, skip duplicates.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 0: wire admin-chat, copy mascot assets to app assets"
git push
```

---

## PHASE 1: SCHEDULE SCREEN BRAND PASS

The schedule is the #1 screen parents open after the home scroll. Speed and clarity are everything.

### 1A. Day Strip Calendar

Find the day strip component (likely `DayStripCalendar.tsx` in parent-scroll/ or embedded in the schedule screen).

**Restyle:**
- Background: white/off-white (light context)
- Week header: "Mar 3–9, 2026" with left/right chevron arrows
- Day cells: abbreviated day (M T W T F S S) above the date number
- Current day: teal filled circle behind date, white text
- Days with events: small dot below the date (teal for practice, coral for game)
- Selected day (if different from today): teal ring outline, no fill
- Inactive/past days: lighter text
- Swipe: snap to week boundaries
- Tap a day: filter event list below

### 1B. Event List

EventCard was styled in Wave 1. Verify it renders correctly in schedule context. Each card should show:
- Type badge (PRACTICE=teal, GAME=coral, TOURNAMENT=gold, MEETING=sky)
- Time: bold, left-aligned
- Location: secondary text with pin icon
- Team name: small pill (useful for multi-team parents)
- **Inline RSVP chips** directly on the card: "Going" (teal fill when active) | "Can't" (coral) | "Maybe" (gold). Tap to toggle. No modal. Haptic feedback on tap.

**For coaches:** Show RSVP counts ("8/12 Going") and a FAB at bottom-right: teal circle, "+" icon → navigates to bulk-event-create or event creation.

### 1C. Multi-Child Filter (Parents Only)

If parent has 2+ children, show filter pills below the day strip:
- "All" | "[Child 1 Name]" | "[Child 2 Name]"
- Active: teal fill, white text. Inactive: outlined.
- Filters event list by that child's team
- Single-child parents: don't render this

### 1D. Schedule Empty State

No events on selected day:
- `SleepLynx.png` mascot image (from `assets/images/mascot/`)
- "Free day! No events scheduled."
- Friendly tone, not an error

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: schedule brand pass - day strip, inline RSVP, multi-child filter, empty state"
git push
```

---

## PHASE 2: EVENT DETAIL BOTTOM SHEET REDESIGN

The current EventDetailModal is a full-screen modal with tabs (Details, RSVPs, Volunteers, Matchup). This is overengineered for a peek experience. Redesign it as a **bottom sheet** that keeps the schedule visible behind it.

### 2A. Convert to Bottom Sheet

Replace the full-screen Modal with a bottom sheet:
- Use `@gorhom/bottom-sheet` if installed, otherwise a custom Animated.View sliding up from bottom with a drag handle
- Snap point 1: ~60% screen height (default open)
- Snap point 2: ~90% (drag up for more)
- Drag down to dismiss
- Background: schedule dimmed but visible behind
- Drag handle: small rounded bar (4px height, 40px width, centered, subtle gray)

### 2B. Single Scrollable View (Replace Tabs)

Remove the tab navigation (Details/RSVPs/Volunteers/Matchup). Replace with one scrollable view:

**1. Event Hero**
- Type badge (GAME/PRACTICE/etc.) top-left with color
- Date: display font — "Saturday, Mar 8"
- Time: "9:00 AM — 11:00 AM"
- If GAME: opponent name large — "vs North Texas Elite" with Home/Away badge

**2. Location**
- Pin icon + venue name (tappable → opens native maps via `Linking.openURL`)
- Address in secondary text below

**3. Your RSVP**
- Section label: "YOUR RSVP"
- Three buttons: Going (teal) | Can't Make It (coral) | Maybe (gold)
- Selected = filled, others = outlined
- Haptic on change, auto-saves immediately (no submit button)

**4. Who's Going**
- Section label: "WHO'S GOING"
- Avatar row: first 5 avatars in a horizontal strip + "+N more"
- Count summary: "8 Going · 2 Can't · 3 Maybe"

**5. Actions**
- Two side-by-side buttons:
  - "Directions" → native maps
  - "Add to Calendar" → expo-calendar or Linking.openURL fallback

**6. Coach/Admin Extras (conditional)**
Only render if role is coach or admin:
- "Edit Event" button → navigates to event editor
- "Take Attendance" → navigates to attendance screen with event pre-selected
- Notes field (expandable)

**7. Game Extras (conditional)**
Only render if event type is GAME and opponent data exists:
- Show last matchup result if historical data exists: "Last time: W 25-21, 25-18"
- If no history, skip this section entirely — don't show an empty section

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: EventDetailModal → bottom sheet, single view, no tabs"
git push
```

---

## PHASE 3: CHAT LIST BRAND PASS

`app/(tabs)/chats.tsx` — the channel list. This is the primary chat entry point for all roles.

### 3A. Search Bar

Sticky at top:
- Rounded input, search icon left, placeholder "Search chats"
- Real-time filter as you type (filters by channel name and participant names)
- Brand: subtle border, brand surface background, teal focus ring

### 3B. Channel List

Sorted by most recent message. Each row:

**Left:** Avatar
- Team channels: team color accent border on avatar circle
- DMs: user avatar photo
- Announcements: megaphone icon on sky background circle

**Center:**
- Channel name: **bold if unread**, normal weight if read
- Last message preview: single line, ellipsized, secondary text color
- Sender prefix in group chats: "Coach: Great game today!"

**Right:**
- Timestamp: relative format — "2m", "1h", "Yesterday", "Mar 3"
- Unread badge: coral circle with white number, only shows if unread > 0

**Pull-to-refresh** on the list.

### 3C. FAB (Coaches/Admins Only)

Bottom-right floating action button:
- Teal circle, compose/pencil icon
- Only visible for coach and admin roles
- Tap opens a small action menu:
  - "New Blast" → navigates to `blast-composer`
  - "New Team Message" → navigates to relevant team chat
- Animation: FAB rotates 45° when menu opens (the "+" becomes "×")

### 3D. Empty State

No chat channels:
- `SleepLynx.png` mascot
- "No chats yet! Your team conversations will appear here once you're connected."

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: chat list brand pass - search, channel rows, unread badges, FAB, empty state"
git push
```

## PHASE 4: CHAT THREAD BRAND PASS

`app/chat/[id].tsx` — the actual conversation screen. Performance matters most here.

### 4A. Message Bubbles

**My messages (right-aligned):**
- Background: `rgba(42, 157, 143, 0.15)` (teal tint)
- Border radius: 16px top-left, 16px top-right, 4px bottom-right, 16px bottom-left
- Text: primary text color
- Timestamp: small, right-aligned below bubble, tertiary text

**Other messages (left-aligned):**
- Background: brand surface card color
- Border radius: 4px top-left, 16px top-right, 16px bottom-right, 16px bottom-left
- Sender name: bold, colored by role (coach=teal, parent=sky, admin=coral, player=gold) — only in group chats
- Avatar: small circle left of first message in a sequence, placeholder for consecutive messages from same sender

**System messages (centered):**
- Small text, centered, tertiary color
- No bubble — just text with slight background pill
- "Coach Carlos created this chat" or "Ava joined the team"

### 4B. Input Bar

Bottom of screen, above keyboard:
- Background: brand surface
- Text input: rounded, brand border, auto-grow up to 4 lines
- Send button: teal circle with arrow icon, only visible when input has text
- Attachment button (camera/image icon) left of input — opens image picker
- GIF button if GifPicker component exists
- Emoji button if EmojiPicker component exists

### 4C. Media Messages

If images are sent:
- Render as rounded image bubble (same alignment rules as text)
- Tap to open lightbox (ImagePreviewModal or PhotoViewer)
- If PhotoViewer exists, use it. If not, simple full-screen overlay with pinch-to-zoom.

### 4D. Chat Header

Top of screen:
- Back arrow (left)
- Channel name or participant name (center)
- Avatar or team color indicator
- If team channel: member count ("12 members")
- Tap header to see channel info (if a channel detail screen exists)

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: chat thread brand pass - bubbles, input bar, media, header"
git push
```

---

## PHASE 5: BLAST COMPOSER + BLAST HISTORY BRAND PASS

Coach and admin communication tools.

### 5A. Blast Composer

`app/blast-composer.tsx` — Send announcements to one or more teams.

**Layout:**
- Step 1: Select recipients — team pills (multi-select), "All Teams" toggle
- Step 2: Compose message — large text input, subject line optional
- Send button: prominent teal, full width at bottom
- Preview: optional "Preview" toggle that shows how the blast will appear to parents

**Restyle:**
- Brand card for recipient selector
- Brand input styling for compose area
- Teal send button with loading state
- Step indicator if it's a multi-step flow (dots or "1 of 2")

### 5B. Blast History

`app/blast-history.tsx` — Past announcements.

**Layout:**
- Reverse chronological list of past blasts
- Each card: subject (if any), message preview, recipient badges (team names), timestamp, read count if available
- Brand card styling, secondary text for metadata

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: blast composer and blast history brand pass"
git push
```

---

## PHASE 6: TEAM HUB + TEAM WALL + GALLERY BRAND PASS

The team social experience. This is where parents feel connected and coaches build culture.

### 6A. Team Hub Shell

`app/(tabs)/parent-team-hub.tsx` and `app/(tabs)/coach-team-hub.tsx`

The playbook calls for a **swipeable team hub** — if a user has multiple teams (coach with 3 teams, parent with 2 kids on different teams), they can swipe horizontally between team contexts. Each swipe changes the entire hub content.

**If multi-team swipe is too complex for this wave:** Use PillTabs at the top to switch between teams (team name pills). Content below updates when a different team is selected. This is simpler and achieves the same goal.

**Team Hub header:**
- Team name + team color accent bar
- Season record if available (W-L-T)
- Member count

**Below header — tabbed content or scrollable sections:**
- **Wall** (default) — the social feed (TeamWall component)
- **Gallery** — photo grid
- **Roster** — quick team roster view (PlayerCard compact mode)

Use PillTabs to switch between Wall / Gallery / Roster within the hub.

### 6B. Team Wall

`app/team-wall.tsx` and `components/TeamWall.tsx`

The social feed. Posts, photos, comments, reactions.

**Post card:**
- Author avatar + name + role badge + timestamp
- Post text content
- Photo grid (if photos attached): 1 photo = full width, 2 = side by side, 3+ = grid with "+N more" overlay. Tap opens lightbox.
- Reaction bar: emoji reactions with counts (tappable to add/remove)
- Comment count: "4 comments" — tappable to expand
- Expanded comments: nested below post, indented, smaller text

**Post composer (top of wall or FAB):**
- Avatar + "What's happening?" tappable input
- Tap opens full composer: text input + photo picker + optional tag people
- Post button (teal)

**Shoutout digest card (if ShoutoutCard/ShoutoutProfileSection exist):**
- Integrated into the wall feed as a special card type
- "3 shoutouts this week!" with avatars of recipients
- Tappable to see full shoutout details

### 6C. Team Gallery

`app/team-gallery.tsx`

- Photo grid: 3-column, square thumbnails, 2px gap
- Tap any photo: opens lightbox with swipe-through navigation
- Pull-to-refresh
- Empty state: `SleepLynx.png` + "No photos yet! Photos from team posts will appear here."

### 6D. Team Hub Empty State

If team has no posts, no photos, no activity:
- `Meet-Lynx.png` mascot
- "Your team's activity will show up here. Post something to get started!"
- Coach/admin: prominent "Create First Post" button

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 6: team hub, team wall, gallery, post composer brand pass"
git push
```

---

## PHASE 7: VERIFY EVERYTHING

```bash
# 1. Type check
npx tsc --noEmit

# 2. Verify admin-chat is wired
grep -rn "admin-chat" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules"

# 3. Verify mascot assets copied
ls assets/images/mascot/
# Expected: celebrate.png, HiLynx.png, SleepLynx.png, Meet-Lynx.png, laptoplynx.png

# 4. Verify empty states use real mascot images (not placeholder Views)
grep -rn "SleepLynx\|HiLynx\|Meet-Lynx\|celebrate\|laptoplynx" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/"
# Expected: several results in schedule, chat, team hub empty states

# 5. Verify EventDetailModal is now a bottom sheet (no more full-screen Modal)
grep -rn "presentationStyle.*pageSheet\|animationType.*slide" --include="*.tsx" components/EventDetailModal.tsx
# Expected: 0 results (the old Modal pattern should be gone)

# 6. Count files changed
git diff --stat HEAD~7

# 7. Final commit
git add -A
git commit -m "Phase 7: Wave 3 verification and cleanup"
git push
```

---

## EXPECTED RESULTS

1. **Schedule screen** — Clean day strip, branded EventCards with inline RSVP, multi-child filter for parents, coach FAB, SleepLynx empty state
2. **Event Detail** — Bottom sheet (not full-screen modal), single scrollable view, no tabs, compact and contextual, auto-save RSVP
3. **Chat List** — Search bar, branded channel rows, unread badges (coral), relative timestamps, coach/admin FAB for new blasts
4. **Chat Thread** — Teal-tinted user bubbles, role-colored sender names, auto-grow input bar, media support
5. **Blast Composer** — Branded recipient selector, compose area, send confirmation
6. **Blast History** — Clean card list of past announcements
7. **Team Hub** — Team switcher (pills or swipe), Wall/Gallery/Roster tabs, branded post cards
8. **Team Wall** — Post composer, photo grids, reactions, comments, shoutout digest
9. **Team Gallery** — 3-column grid, lightbox, empty state with mascot
10. **All empty states use real mascot images** from `assets/images/mascot/` — not placeholder Views
11. **admin-chat wired** — admins can access chat from their drawer
12. **7 commits** — one per phase, each pushed
