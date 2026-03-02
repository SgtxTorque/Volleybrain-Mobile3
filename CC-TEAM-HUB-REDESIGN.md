# Team Hub Redesign — Facebook Groups Style

## RULES STILL APPLY
Read CC-ADMIN-UX-REDESIGN.md (or CC-COACH-UX-REDESIGN.md) in the project root for the full spec and rules. Read SCHEMA_REFERENCE.csv before writing ANY query. Read existing code before changing it. `npx tsc --noEmit` after all changes.

## SCOPE
This redesign applies to the Team Hub / Team Wall screen accessed from ALL roles — Admin, Coach, Parent, and Player. Every role that can view a team's hub should see this new layout. The same component is used everywhere. Do NOT create separate team hub versions per role — one shared component with role-based permissions on actions (e.g., only coaches/admins can pin posts).

---

## DESIGN REFERENCE: FACEBOOK GROUPS

The team hub should look and feel like a Facebook Group page. The user uploaded screenshots of the "Club Volleyball in North Texas" Facebook group as the reference. Study those patterns carefully. Here is exactly what to replicate:

---

## SECTION 1: HERO HEADER

**Full-width hero cover photo at the top of the screen.**
- Edge-to-edge, no padding, no rounded corners — the photo bleeds to both sides of the screen
- If the team has a cover photo uploaded, display it. If not, show a default gradient with the team's accent color
- Height: approximately 35-40% of screen height (similar to Facebook group cover photo proportion)
- The photo should be the first thing you see when entering the team hub

**Team name directly below the hero photo:**
- Large, bold text — left-aligned
- Below the team name: player count and coach count on one line (e.g., "12 Players · 2 Coaches")
- NO "Public group" or member count like Facebook — just players and coaches
- NO rounded card wrapping the team name — it sits directly below the hero photo with standard horizontal padding

**No "Joined" or "Invite" buttons** — skip those. Instead, add a compact row of two small action buttons:
- "📷 Gallery" — opens team photo gallery (all photos from posts)
- A second contextual button that makes sense:
  - For Coaches/Admins: "📊 Stats" or "⚙️ Manage"
  - For Parents/Players: "📅 Schedule" or "🏆 Achievements"
- These buttons should be small and compact — NOT the large Facebook-style buttons. Think pill-sized.

---

## SECTION 2: SCROLLABLE TAB NAVIGATION

**Horizontal scrollable tab bar** (same concept as Facebook's "You | Photos | Events | Files | Albums" row):
- Tabs: **Feed** | **Roster** | **Schedule** | **Achievements** | **Stats**
- Horizontally scrollable if they overflow the screen width
- Active tab has an underline indicator (like current implementation)
- Tabs stick/pin to the top of the screen when scrolling past them (sticky header behavior)
- Style: text tabs with icons, same as the Facebook group navigation pills

---

## SECTION 3: POST COMPOSER

**"What's on your mind?" composer row** (same as Facebook):
- User's avatar on the left (actual profile photo, NOT initials — fix this if showing initials)
- "What's on your mind?" placeholder text input in the center
- Camera/photo icon on the right to attach media
- Tap the input area → opens the full post composer (same functionality as current "What's on your mind?" but styled to match Facebook)
- Below the composer: optional quick-action pills for post types if relevant (e.g., "📷 Photo" | "🏆 Shoutout" | "📊 Poll"). These are optional — only add if they already exist in the codebase.

---

## SECTION 4: POST CARDS — FULL-WIDTH, NO ROUNDED CORNERS

**THIS IS THE BIGGEST CHANGE.** Remove all rounded card styling from posts. Posts should be full-width, edge-to-edge, separated by thin gray divider lines — exactly like Facebook.

**Each post layout (top to bottom):**

**Post Header Row:**
- Author avatar (profile photo, not initials) — left aligned, circular
- Author name (bold) + timestamp ("1d ago", "3h ago") — next to avatar
- Post type badge if applicable ("Shoutout", "Announcement", "Photo") — small pill, same as current
- Three-dot menu (⋯) — right aligned. Menu options:
  - For post author: Edit, Delete
  - For Coaches/Admins: Pin to Top, Delete
  - For ALL roles: Share (NEW — see Share section below)
  - Copy Text

**Post Body:**
- Text content — full width, standard padding left and right
- No card background, no rounded corners, no shadow — just text on the screen background

**Post Media:**
- Photos: FULL WIDTH edge-to-edge, no padding, no rounded corners
- Single photo: fills the full width
- Multiple photos: grid layout similar to Facebook (2 photos side by side, 3+ shows grid with "+X more" overlay on the last image)
- Videos: full-width player with play button overlay

**Link Previews (NEW):**
- When a post contains a URL, show a link preview card below the text:
  - Preview image (full width)
  - Website domain in small gray text
  - Page title in bold
  - Like Facebook's link preview cards
- This requires fetching Open Graph metadata from the URL when the post is created. If this is too complex for now, skip it and add it as a future feature — but structure the post card to accommodate it later.

**Reaction Row:**
- Keep the existing emoji reaction buttons (🔥 ❤️ 👏 💪 🏐 +)
- Display below the media/text
- Show reaction counts if any exist (e.g., "🔥 3 ❤️ 5")

**Engagement Row (NEW — Facebook-style):**
- Below the reactions, add a thin divider line
- Three buttons in a row, evenly spaced: **Like/React** | **Comment** | **Share**
- Like/React: tap to add default reaction, long-press to pick from emoji set
- Comment: tap to open comments (if comment system exists, otherwise skip for now)
- Share: tap to open share sheet (see Share section below)
- These buttons use icons + text labels, gray color, same style as Facebook

---

## SECTION 5: SHARE FUNCTIONALITY (NEW)

When a user taps "Share" on a post or uses the three-dot menu → Share:
- Open the native share sheet (React Native's `Share.share()` API)
- Share content includes: post text + team name + "Shared from VolleyBrain"
- If the post has a photo, include it if the share API supports it
- Share targets: text message, social media (Facebook, Instagram, etc.), copy link, email — whatever the device's native share sheet supports
- This is simple to implement — just use the built-in `Share` API from React Native

---

## SECTION 6: STICKY SCROLL HEADER

**When the user scrolls past the hero photo and tab bar, show a compact sticky header at the top of the screen:**
- Small version of the team cover photo (tiny thumbnail, ~30px) on the left
- Team name next to it in bold
- This stays visible as you scroll through the feed, so you always know which team you're viewing
- Same pattern as Facebook Groups — when you scroll past the header, a mini version pins to the top
- Implementation: use `onScroll` event to detect when the hero is scrolled off screen, then show/hide the compact header with a smooth fade-in animation

---

## CARD SEPARATION

- NO rounded corners on post cards
- NO card shadows
- NO card background color (posts sit on the same background as the screen)
- Thin gray divider line (1px, light gray like `#E5E5E5`) between each post
- Standard horizontal padding (16px) for text content
- ZERO horizontal padding for media (photos/videos go edge-to-edge)

---

## PROFILE PHOTOS — FIX EVERYWHERE

**Every place that shows a user avatar in the team hub MUST show the actual profile photo, not initials.**
- Post author avatar → profile photo
- Comment author avatar → profile photo
- Post composer "What's on your mind?" → current user's profile photo
- Fall back to initials ONLY if the user has no uploaded photo
- Check the query that fetches post data — make sure it includes the author's avatar/photo URL from the profiles table
- This was a bug in the coach team hub — fix it here for all roles

---

## WHAT TO KEEP FROM CURRENT IMPLEMENTATION
- Post creation functionality (text + photo upload)
- Post type badges (Shoutout, Announcement, Photo, etc.)
- Emoji reactions (keep the current set and behavior)
- Three-dot menu (Pin, Delete) — extend with Share
- Feed/Roster/Schedule/Achievements tab content and queries
- Role-based permissions (who can post, who can pin, who can delete)

## WHAT TO REMOVE
- Rounded card wrappers around posts
- Card shadows on posts
- The old team info card at the top (the one with yellow border that showed "Black Hornets Elite / 12 Players / 0 Coaches" in a rounded card)
- The "TEAM WALL" header text at the top — replace with the hero photo + team name pattern
- Any initials-only avatar rendering where a profile photo exists

---

## IMPLEMENTATION NOTES

- This is a SHARED COMPONENT used by all roles. Find the team hub / team wall component and redesign it in place.
- Test as Admin, Coach, Parent, and Player after changes — all should see the new layout.
- The hero cover photo upload should be a coach/admin-only action. Parents and players see the photo but can't change it.
- Store cover photos in Supabase storage, URL in the teams table. Check SCHEMA_REFERENCE.csv for a `cover_image_url`, `banner_url`, or similar column on the teams table. If none exists, flag it — you may need an ALTER TABLE (provide the SQL, do NOT run it yourself).
- The sticky scroll header requires careful scroll event handling. Use `Animated` or `react-native-reanimated` for smooth performance.

---

## VERIFICATION CHECKLIST
After all changes:
- [ ] Hero cover photo displays full-width at top
- [ ] Team name and player/coach count below hero (no rounded card)
- [ ] Gallery button and second contextual button present
- [ ] Tab bar scrolls horizontally and sticks when scrolling
- [ ] Post composer shows real profile photo (not initials)
- [ ] Posts are full-width with no rounded corners, no shadows
- [ ] Posts separated by thin gray divider lines
- [ ] Photos in posts are edge-to-edge (no padding)
- [ ] Multi-photo grid layout works (2, 3+ photos)
- [ ] Three-dot menu includes Share option
- [ ] Share uses native share sheet
- [ ] Like/Comment/Share engagement row below each post
- [ ] Sticky scroll header appears when scrolling past hero
- [ ] Profile photos shown everywhere (not initials)
- [ ] Works for Admin role
- [ ] Works for Coach role
- [ ] Works for Parent role
- [ ] Works for Player role
- [ ] `npx tsc --noEmit` — zero new errors

Show me your plan, then build it.
