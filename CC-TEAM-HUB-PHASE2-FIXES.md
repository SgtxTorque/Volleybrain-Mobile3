# Team Hub Redesign — Phase 2: Polish Fixes

## RULES STILL APPLY
Read SCHEMA_REFERENCE.csv before writing ANY query. Read existing code before changing it. Do NOT break any role's experience. `npx tsc --noEmit` after all changes.

---

## FIX 1: Tab Navigation Spacing — Uneven Between "Schedule" and "Achievements"
**Problem:** The spacing between "Schedule" and "Achievements" in the horizontal tab bar looks tighter than the spacing between other tabs.
**Fix:** Ensure all tabs in the horizontal scrollable tab bar have EQUAL spacing. Each tab should have the same horizontal padding/margin. Check if the icon before "Achievements" (the trophy icon) is eating into the gap. Apply a consistent `marginRight` or `paddingHorizontal` to every tab item. Visually verify all gaps are identical.

---

## FIX 2: Scroll Behavior — Only Mini Header Should Stick
**Problem:** When scrolling past the hero header, BOTH the tab navigation bar AND the mini header stay pinned at the top. The tab bar should NOT stick — only the mini compact header (tiny cover photo + team name) should remain.
**Fix:**
- When the user scrolls past the hero photo: show the compact mini header (small cover photo thumbnail + team name) pinned at top
- The tab navigation bar (Feed | Roster | Schedule | Achievements) should scroll AWAY with the content — it should NOT be sticky
- The team selector pills at the very top should ALSO scroll away / hide when past the hero
- When the user scrolls back up to the top, the team selector, hero photo, team name, and tab bar all reappear normally
- Implementation: only the mini header has `position: sticky` or is rendered as an overlay. The tab bar and team selector are part of the normal scroll content.
- The mini header should fade in smoothly when the hero scrolls off screen, and fade out when scrolling back up

---

## FIX 3: Post Card Spacing — More Separation Between Posts
**Problem:** Post cards are bleeding together — not enough vertical space between each post.
**Fix:** Add more vertical spacing between posts. The thin gray divider line should have padding above and below it. Increase the space to approximately 12-16px of blank space between the bottom of one post's engagement row and the top of the next post's author header. The divider line sits in the middle of that gap. This gives each post breathing room without being excessive.

---

## FIX 4: Reactions — Add Counter Display and "Who Reacted" View
**Problem:** When users tap emoji reactions, there's no visible counter showing how many reactions a post has, and no way to see who reacted with what.
**Fix:** Implement the Facebook-style reaction system:

**Reaction Summary Row (below post content, above the engagement buttons):**
- Show the top 3 most-used emoji reactions as small icons in a row, followed by a total count
- Example: "🔥❤️👏 12" — meaning 12 total reactions using those 3 most popular emojis
- If no reactions yet, this row is hidden
- This row is tappable — tapping it opens the "Who Reacted" sheet

**"Who Reacted" Bottom Sheet:**
- Opens when tapping the reaction summary row
- Tab bar at top showing each emoji that was used, plus an "All" tab
- Below: scrollable list of users who reacted, each showing: avatar, name, and the emoji they used
- Example:
  - All (12) | 🔥 (5) | ❤️ (4) | 👏 (3)
  - [avatar] Carlos test — 🔥
  - [avatar] Jennifer Dillard — ❤️
- Check SCHEMA_REFERENCE.csv for the reactions table — verify it stores user_id, post_id, and reaction_type/emoji

**Reaction Picker Behavior (match Facebook):**
- The current emoji row (🔥❤️👏💪🏐+) should work as follows:
- Quick tap any emoji → adds that reaction immediately (toggles on/off)
- If user already reacted, tapping a different emoji switches their reaction
- The "Like" button in the engagement row should be the quick-react — tap to toggle the default reaction (❤️ or 👍), long-press to open the full emoji picker
- When a user reacts, their reaction should appear with a brief scale-up animation

---

## FIX 5: Comment System — Facebook-Style Inline Comments
**Problem:** The "Comment" button in the engagement row doesn't work. Tapping it does nothing.
**Fix:** Implement inline comments matching the Facebook pattern:

**Tap "Comment" button behavior:**
- Tapping "Comment" on a post expands the post inline to show:
  1. A comment count summary if comments exist: "View all X comments" (tappable to expand full list)
  2. The 1-2 most recent comments shown as previews (avatar + name + comment text + timestamp)
  3. A text input row at the bottom: [avatar] [text input: "Write a comment..."] [Send button]
- The comment input should auto-focus the keyboard when "Comment" is tapped
- This expansion happens inline — no navigation to a new screen, no modal. The post simply grows to show comments below it.

**Comment Display:**
- Each comment: avatar (left) + author name (bold) + comment text + timestamp
- Comments are compact — no cards, just text with avatar
- Newest comments at the bottom (chronological)
- If more than 2 comments, show "View all X comments" link that expands to show all

**Comment Counter:**
- Next to the "Comment" button in the engagement row, show the count: "Comment (3)" or "💬 3"
- If no comments, just show "Comment" with no count

**Database:**
- Check SCHEMA_REFERENCE.csv for a comments table (likely `post_comments` or `team_wall_comments`)
- If no comments table exists, flag it and provide the CREATE TABLE SQL:
  - id (uuid, primary key)
  - post_id (references the team wall post)
  - author_id (references profiles)
  - content (text)
  - created_at (timestamp)
- Do NOT run the migration yourself — provide the SQL for me to run

---

## FIX 6: Share Counter
**Problem:** The Share button exists but there's no counter showing how many times a post has been shared.
**Fix:** Add a share count next to the Share button if shares exist: "Share (2)". If no shares, just show "Share". This is cosmetic for now — tracking actual share counts requires logging when `Share.share()` is called. Increment a `share_count` field on the post record each time the native share sheet is opened. Check SCHEMA_REFERENCE.csv for a share_count column on the team wall posts table. If it doesn't exist, add it to the post data model.

---

## VERIFICATION CHECKLIST
After all fixes:
- [ ] Tab spacing is even across all tabs
- [ ] Only mini header sticks when scrolling — tab bar and team selector scroll away
- [ ] Mini header fades in/out smoothly
- [ ] More space between post cards (12-16px gap)
- [ ] Reaction summary row shows top 3 emojis + total count
- [ ] Tapping reaction summary opens "Who Reacted" bottom sheet with user list
- [ ] Reaction picker works: tap to toggle, tap different emoji to switch
- [ ] Like button: tap for default reaction, long-press for picker
- [ ] Comment button expands post inline with comment input
- [ ] Comments display: avatar + name + text + timestamp
- [ ] Comment count shows next to Comment button
- [ ] "View all X comments" link when more than 2 comments
- [ ] Share count shows next to Share button
- [ ] Works for Admin, Coach, Parent, and Player roles
- [ ] `npx tsc --noEmit` — zero new errors

Show me your plan, then fix all 6 items.
