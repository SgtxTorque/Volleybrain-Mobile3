# VOLLEYBRAIN MOBILE APP — Session Handoff (Feb 25, 2026)

## What I'm Building
VolleyBrain — a dual-platform youth sports management app (React Native/Expo mobile + React/Vite web admin) with Supabase backend.
GitHub: SgtxTorque/volleybrain-mobile3

---

## COMPLETED PREVIOUSLY (all committed)
- ✅ All role dashboards (Parent, Coach, Admin, Player)
- ✅ Admin Phase 1-3 (registration hub, bulk actions, blast history, financials, season archives)
- ✅ Coach Experience Phase A-D (game day, lineup builder, stats, team management)
- ✅ Player Experience Phase 1-4 (game recap, customization, stats, achievements)
- ✅ Sprint 1-3 beta prep (onboarding, push notifications, COPPA, 93-item E2E audit)
- ✅ Stripe payments (full flow — card, Apple Pay, Google Pay, Venmo, Zelle, CashApp)
- ✅ Email notifications (Resend + Edge Functions + cron job)
- ✅ Chat UX upgrade (emoji picker, voice messages, members, mentions, pins, camera)
- ✅ Supabase cron functions (game reminders, RSVP reminders, payment reminders)
- ✅ Parent UX Redesign Phase 1-6 (new 5-tab nav, home redesign, schedule tab, chat tab, team hub, my stuff)
- ✅ Phase 7 fixes (structural audit, hero carousel restoration, spacing, team hub text links, roster screen, schedule default load, compact filter pills)
- ✅ Hero event carousel image positioning fix

---

## CURRENT SESSION: Team Hub Fixes + Parent/Player Parity

There are 6 issues to fix in this session. Read each one carefully before starting.

### RULES (same as always)
- Read SCHEMA_REFERENCE.csv before any queries
- Do NOT break any existing working functionality
- No console.log without `__DEV__`
- Run `npx tsc --noEmit` when done with all fixes
- Test each fix individually before moving to the next

---

## FIX 0: PhotoViewer Hooks Error — CRITICAL (Crashes Gallery)

**The Problem:**
Opening the Team Gallery screen (`app/team-gallery.tsx`) triggers a React hooks ordering violation in `components/PhotoViewer.tsx`. The app throws:

```
Error: Rendered more hooks than during the previous render.
React has detected a change in the order of Hooks called by PhotoViewer.
Previous render: useContext, useState, useState, useState, useState, useRef, undefined
Next render:     useContext, useState, useState, useState, useState, useRef, useCallback
```

A `useCallback` hook is being called on re-render that wasn't called on the initial render. This means there's a conditional hook call — a `useCallback` (or other hook) is inside an `if` block, after an early return, or otherwise conditionally executed. React requires ALL hooks to be called in the same order on every render.

**What to fix:**
1. Open `components/PhotoViewer.tsx`
2. Find the `useCallback` that's being conditionally called — it's likely after an early return statement or inside a conditional block
3. Move ALL hooks (useState, useRef, useCallback, useMemo, useEffect, etc.) to the TOP of the component, BEFORE any early returns or conditional logic
4. If the component has an early return like `if (!visible) return null;` — all hooks must be declared BEFORE that return

**Common pattern that causes this:**
```typescript
// ❌ BROKEN — hook after early return
const PhotoViewer = ({ visible, photos }) => {
  const [index, setIndex] = useState(0);
  // ... other hooks ...
  
  if (!visible) return null;  // Early return
  
  const handleSomething = useCallback(() => { ... }, []);  // 💥 This hook doesn't run when !visible
  
  return <View>...</View>;
};

// ✅ FIXED — all hooks before any returns
const PhotoViewer = ({ visible, photos }) => {
  const [index, setIndex] = useState(0);
  // ... other hooks ...
  const handleSomething = useCallback(() => { ... }, []);  // ✅ Always runs
  
  if (!visible) return null;  // Early return AFTER all hooks
  
  return <View>...</View>;
};
```

**Acceptance criteria:**
- No "Rendered more hooks" error when opening Team Gallery
- No "change in the order of Hooks" warning in console
- PhotoViewer renders correctly with all existing functionality intact
- Gallery works for ALL roles (coach, admin, parent, player)

---

## FIX 1: Team Hub Page Alignment — Some Team Pages Are Off-Center

**The Problem:**
For coaches (and admins) who have multiple teams, the Team Hub uses a horizontal swipe/carousel to switch between teams. Currently, some team pages are properly centered on screen while others are aligned to the RIGHT — pushed off-center. In testing with a coach who has 4 teams, 2 teams render correctly centered and 2 are misaligned to the right.

**Specific behavior observed:**
- Coach has 4 teams. Teams at index 0 and 2 (1st and 3rd) render perfectly centered. Teams at index 1 and 3 (2nd and 4th) are shifted to the RIGHT.
- This is a pattern: EVEN indices are fine, ODD indices are offset. This points to a snap interval, item width, or separator/gap calculation issue in the horizontal FlatList/ScrollView.

**What to investigate:**
- Find the Team Hub screen component for coach/admin roles. Look in `app/(tabs)/` for the team tab file, or search for `TeamHub`, `ConnectScreen`, or similar.
- The horizontal swipe between teams likely uses a `FlatList`, `ScrollView`, or `PagerView` with `pagingEnabled` or snap behavior.
- **Most likely cause:** The `snapToInterval` or `snapToOffsets` value doesn't exactly match the item width + any gap/separator. Or `getItemLayout` returns incorrect offsets for odd indices. Check for `ItemSeparatorComponent` or `gap` styles that add space between items but aren't accounted for in the snap calculation.
- Check if the team page width is set to `Dimensions.get('window').width` exactly — any rounding or extra padding accumulates across indices, making odd pages drift further right.
- Another common cause: `contentContainerStyle` has horizontal padding that shifts all items but the snap points don't account for it.
- ALL team pages must be identically sized and centered. The content (hero header, nav tabs, feed) should be centered within each page.

**Acceptance criteria:**
- Every team page in the horizontal swipe renders centered on screen — test with 4 teams
- Content is identically positioned regardless of which team index is being viewed
- Dot indicators still work and align to the correct page
- No drift on odd-indexed pages

---

## FIX 2: Move "Achievements" from Nav Bar into Hero Header

**The Problem:**
The Team Hub currently has a horizontal tab/nav bar below the hero header with tabs like: Feed, Roster, Schedule, Achievements. Because "Achievements" is the last tab, it gets cut off and requires horizontal scrolling to reach. This is bad UX — important content shouldn't be hidden behind a scroll.

**The Solution:**
Move "Achievements" OUT of the tab nav bar and INTO the hero header area, alongside the existing "Gallery" and "Stats" buttons. These are the frosted/glass-style pill buttons that sit on top of the hero image.

**Implementation:**
1. Find the hero header section of the Team Hub. It already has "Gallery" and "Stats" as pill buttons overlaid on the team photo/banner.
2. Add an "Achievements" pill button in the same row, styled identically to Gallery and Stats (same frosted glass / semi-transparent background, same icon + text format).
3. Use a trophy icon (🏆) or similar for the Achievements button.
4. Tapping "Achievements" should navigate to the same achievements screen it currently links to from the nav bar.
5. Remove "Achievements" from the horizontal tab nav bar.
6. The tab nav bar should now contain ONLY: **Feed | Roster | Schedule**
7. With only 3 items, the nav bar should fit comfortably without any horizontal scrolling. Verify there is NO horizontal scroll behavior remaining on the nav bar — it should be a fixed, non-scrollable row.

**Acceptance criteria:**
- Hero header shows 3 pill buttons: Gallery, Stats, Achievements (all same style)
- Tab nav bar shows exactly 3 tabs: Feed, Roster, Schedule
- No horizontal scrolling on the tab nav bar
- Achievements button navigates to the correct screen
- This applies to ALL roles that see the Team Hub (coach, admin, parent, player)

---

## FIX 3: Parent Team Hub Must Match Coach/Admin Team Hub Design

**The Problem:**
The Parent view of the Team Hub is still using the OLD design — the one from before the recent Team Hub redesign. It looks completely different from what coaches and admins see. The parent Team Hub is missing the new hero header with team photo, team name overlay, record badge, Gallery/Stats buttons, and the redesigned nav bar with Feed/Roster/Schedule tabs.

Instead, parents see the old-style layout with:
- A card at the top showing team name, child's name, and record badge (e.g., "BLACK HORNETS ELITE / Ava Test / 4-1")
- Text links for "Schedule · Roster · Standings"
- "TEAM FEED" header
- The team wall below

**The Solution:**
The parent Team Hub screen needs to be updated to use the SAME Team Hub design as the coach/admin experience. This means:

1. **Find the parent Team Hub screen.** It's likely a separate component or a role-conditional branch within the Team Hub. The parent version may be in a different file or behind an `if (role === 'parent')` check.

2. **The parent Team Hub should render identically to the coach/admin Team Hub**, with these elements:
   - **Hero Header:** Full-width team photo/banner with team name overlaid in bold white text, player/coach count below the name, and the frosted glass pill buttons (Gallery, Stats, Achievements) at the bottom of the hero area. The camera icon for changing the team photo should only appear for coaches/admins, NOT parents.
   - **Team Selector:** If the parent has children on multiple teams, show the dot indicators (carousel dots) at the top for swiping between teams. If single team, no dots needed.
   - **Record Badge:** The season record (e.g., "4-1") should be displayed prominently — either in the hero header or as part of the team identity area.
   - **Tab Nav Bar:** Feed | Roster | Schedule (same 3 tabs, same styling)
   - **Feed Tab Content:** "What's on your mind?" post composer + team wall posts
   - **Roster Tab Content:** Player roster with tap-to-view-profile behavior (permission-scoped — parents can't see other children's private info like registration, emergency contacts)
   - **Schedule Tab Content:** Team schedule filtered to this team

3. **Parent-specific differences (subtle, not layout-breaking):**
   - Parents CANNOT change the team photo (hide the camera icon on the hero)
   - Parents CANNOT access admin/coach-only actions
   - Roster profile views are permission-scoped (can see full profile of their own child, limited profile of other players)
   - Everything else should look and feel identical

4. **Multi-child parents:** Should see dot indicators and be able to swipe between their children's teams, just like multi-team coaches swipe between their teams.

**Acceptance criteria:**
- Parent Team Hub is visually identical to coach/admin Team Hub (hero header, nav tabs, feed layout)
- Camera icon on hero is hidden for parents
- Roster permission scoping is maintained
- Multi-child parents can swipe between teams
- Single-child parents see their team directly (no selector)
- The old-style parent Team Hub layout (card with text links) is completely replaced

---

## FIX 4: Player Team Hub Must Also Match the New Design

**The Problem:**
The Player experience likely also uses the old Team Hub design, just like the parent view. Players need the same updated Team Hub.

**The Solution:**
Apply the same Team Hub design to the player role. The player Team Hub should be identical to the parent Team Hub with these player-specific considerations:

1. Players CANNOT change the team photo (hide camera icon)
2. Players CANNOT post on the team wall (hide the "What's on your mind?" composer) — they are read-only on the wall
3. Players CAN view the roster and tap into player profiles
4. Players CAN view the schedule
5. Players CAN view achievements
6. Players typically only have one team, so team switching is usually not needed — but handle it gracefully if a player is on multiple teams

**Implementation approach:**
- The fix for this may be as simple as ensuring the player role goes through the same Team Hub component as coach/admin/parent, with role-based permission checks for actions (post, edit photo, etc.)
- If the player has a completely separate Team Hub screen, update it to match or replace it with the shared component.

**Acceptance criteria:**
- Player Team Hub matches the new design (hero header, nav tabs, feed)
- Post composer is hidden for players (read-only wall)
- Camera icon is hidden for players
- Player can navigate to roster, schedule, achievements
- All visual elements match what coaches and parents see

---

## ORDER OF OPERATIONS

1. **Fix 0 FIRST:** Open `components/PhotoViewer.tsx`, fix the hooks ordering violation. This is a crash bug.
2. Read the Team Hub component files — find ALL files involved in rendering the Team Hub for each role
3. Fix 1: Alignment issue (fix the horizontal paging/centering)
4. Fix 2: Move Achievements to hero header (affects all roles)
5. Fix 3: Parent Team Hub parity
6. Fix 4: Player Team Hub parity
7. Fix 5: Photo viewer full screen + landscape
8. Run `npx tsc --noEmit` to verify no type errors
9. Commit with message: `"PhotoViewer fixes, Team Hub fixes - alignment, achievements in hero, parent+player parity, fullscreen photos"`

---

## FIX 5: Photo Viewer — True Full Screen + Landscape Support

**The Problem (two issues):**

**Issue A — Not truly full screen:**
When tapping a photo (from a team wall post or the gallery), the photo viewer opens but the image doesn't fill the screen. There's excessive black space above and below the image. The image should expand to fill the available width/height while maintaining aspect ratio — like Instagram or any modern photo viewer.

**Issue B — Gallery button showing screenshot instead of photos:**
When tapping the Gallery button from the Team Hub hero header, and then tapping a photo to view it full screen, one of the images appears to be a SCREENSHOT of the entire Team Hub screen (showing the status bar, header, team card, nav bar, bottom tabs — the whole app screen shrunk down inside the photo viewer). This means the gallery is incorrectly capturing or passing a screenshot/URI instead of the actual uploaded photo URL. The gallery should ONLY display actual uploaded team photos from the database, never screenshots or screen captures.

**What to investigate for Issue B:**
- Check how gallery photos are fetched and passed to the PhotoViewer
- The image source being passed is likely a local screen capture URI or a wrong reference
- Verify the gallery queries the correct table for team photos (check SCHEMA_REFERENCE.csv for team_photos, gallery, media, or similar tables)
- Ensure each photo's `uri` or `url` property points to the actual Supabase storage URL, not a local file path

**Issue C — No landscape rotation:**
When viewing a photo full screen and rotating the phone to landscape, the photo viewer should rotate with the device to show the image in landscape orientation. Currently it stays locked in portrait.

**Implementation for landscape support:**
- Use `expo-screen-orientation` to temporarily unlock orientation when the photo viewer is open
- When PhotoViewer mounts/becomes visible: unlock to `ALL` orientations
- When PhotoViewer closes/unmounts: lock back to `PORTRAIT_UP`
- The image should smoothly scale to fill the new dimensions when rotating
- Example:
  ```
  import * as ScreenOrientation from 'expo-screen-orientation';
  
  // On open:
  await ScreenOrientation.unlockAsync();
  
  // On close:
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  ```
- If `expo-screen-orientation` is not installed: `npx expo install expo-screen-orientation`

**Acceptance criteria:**
- Photos fill the screen properly (minimal black bars, image scaled to fit/fill)
- Gallery only shows actual uploaded photos, never screenshots
- Landscape rotation works when viewing photos full screen
- Orientation locks back to portrait when closing the photo viewer
- Pinch-to-zoom still works if already implemented
- Works for photos from team wall posts AND from the gallery screen

---

## REFERENCE: Team Hub Design Spec (from planning sessions)

The Team Hub layout (all roles) should be:

```
┌─────────────────────────────────┐
│  Hero Header (team photo/banner)│
│  ┌───────────────────────────┐  │
│  │ Team Name (bold, white)   │  │
│  │ 12 Players · 2 Coaches   │  │
│  │                           │  │
│  │ [Gallery] [Stats] [Achiev]│  │  ← frosted glass pills
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  Feed    Roster    Schedule     │  ← tab nav (NO scroll)
├─────────────────────────────────┤
│  [avatar] What's on your mind?  │  ← post composer (coach/admin/parent only)
├─────────────────────────────────┤
│  Team Wall Posts...             │  ← scrollable feed content
│  ...                            │
└─────────────────────────────────┘
```

**Role-based visibility:**

| Element | Admin | Coach | Parent | Player |
|---------|-------|-------|--------|--------|
| Hero header | ✅ | ✅ | ✅ | ✅ |
| Camera icon (change photo) | ✅ | ✅ | ❌ | ❌ |
| Gallery button | ✅ | ✅ | ✅ | ✅ |
| Stats button | ✅ | ✅ | ✅ | ✅ |
| Achievements button | ✅ | ✅ | ✅ | ✅ |
| Feed / Roster / Schedule tabs | ✅ | ✅ | ✅ | ✅ |
| Post composer | ✅ | ✅ | ✅ | ❌ |
| Team wall (read) | ✅ | ✅ | ✅ | ✅ |
| Roster (view profiles) | ✅ | ✅ | ✅ (scoped) | ✅ |
| Multi-team swipe | ✅ | ✅ | ✅ (multi-child) | Rare |

---

## INFRASTRUCTURE REFERENCE
- Supabase project: uqpjvbiuokwpldjvxiby
- GitHub: SgtxTorque/volleybrain-mobile3
- Read SCHEMA_REFERENCE.csv for all database tables and columns
