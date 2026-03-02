# Team Hub Redesign — Phase 3: Critical Fixes

## RULES STILL APPLY
Read SCHEMA_REFERENCE.csv before writing ANY query. Read existing code before changing it. Do NOT break any role's experience. `npx tsc --noEmit` after all changes.

---

## CRITICAL BUG FIXES (do these first)

### BUG 1: Team Hub Not Changing with Team Selector
**Problem:** The team selector shows "BLACK HORNETS ..." selected, but the team hub content still shows 13U. Switching teams in the selector does not update the team hub content.
**Fix:** The team hub component is not re-querying when the selected team changes. Find where the team hub fetches its data (posts, team info, cover photo, player count, etc.) and verify it uses the selected team ID from the team selector. When the team selector value changes, ALL team hub data must re-fetch for the newly selected team. Debug by logging the selected team ID and the team ID being used in queries — they likely don't match.

### BUG 2: Cover Photo Same for All Teams
**Problem:** The hero cover photo uploaded for one team shows on ALL teams. Each team should have its own unique cover photo.
**Fix:** The cover photo is being stored or fetched without filtering by team ID. Check:
- When uploading a cover photo, is the `cover_image_url` being saved to the correct team's row in the `teams` table? Or is it being saved somewhere global?
- When displaying the cover photo, is the query filtering by the selected team's ID?
- Each team's `cover_image_url` in the `teams` table should be independent. Upload and fetch must both use the specific team ID.

### BUG 3: Comments Not Persisting
**Problem:** Comments are submitted and appear temporarily, but when the app is closed and reopened, the comments are gone. They are not being saved to the database.
**Fix:** Check the comment submission handler:
- Is it actually calling `supabase.from('team_post_comments').insert(...)` ?
- Is the insert succeeding? Add error logging to catch any insert failures.
- After insert, is the comment being added to local state only (optimistic update) without confirming the database write?
- Check if the `team_post_comments` table exists and has the correct columns (run the migration SQL if not already done)
- Check RLS policies — the insert policy requires `auth.uid() = author_id`. Make sure the `author_id` being passed matches the authenticated user's ID.
- When loading posts, verify the query includes a join or subquery to fetch comments from `team_post_comments`

### BUG 4: Team Selector Still Visible After Scrolling Past Header
**Problem:** The team selector pills remain visible when scrolling past the hero header. Per the Phase 2 spec, the team selector should scroll away with the hero — only the compact mini header should stick.
**Fix:** The team selector must be INSIDE the scrollable content area, not in a fixed header. When the user scrolls past the hero photo and tab bar, only the mini compact header (tiny cover photo + team name) should remain pinned. The team selector pills must scroll away with everything else. Move the team selector component into the scroll view if it's currently outside it.

---

## UI FIXES

### FIX 5: Remove Emoji Preview Row — Use Facebook-Style Like Button Instead
**Problem:** The emoji reaction row (🔥❤️👏💪🏐+) still sits below every post taking up space. It's chunky and cluttered.
**Fix:** Remove the persistent emoji row entirely. Replace with the Facebook approach:

**Like button behavior:**
- Default state: "♡ Like" (gray, outline heart)
- Tap once: toggles the default reaction (❤️). The "Like" text turns colored (red/pink) and shows "❤️ Like". Tap again to un-like.
- Press and HOLD (long-press): a small floating bubble pops up above the Like button showing the emoji options (🔥❤️👏💪🏐) in a compact horizontal row. User slides finger to select, or taps one. The bubble dismisses after selection.
- This is exactly how Facebook/Instagram handle reactions — no persistent emoji bar cluttering every post.

**Counters on engagement row:**
- "❤️ Like (3)" — shows count when reactions exist, with the most-used emoji as the icon
- "💬 Comment (2)" — shows comment count
- "↗ Share (1)" — shows share count
- When counts are zero, just show the label with no number

### FIX 6: Comments Display — Hide When 2 or More
**Problem:** When a post has multiple comments, they all hang below the post making it cluttered.
**Fix:** 
- **0 comments:** No comment section visible. Engagement row shows "Comment" with no count.
- **1 comment:** Show it inline below the post (avatar + name + text + timestamp). Show "Write a comment..." input below it.
- **2+ comments:** Hide ALL inline comment previews. The engagement row shows "💬 Comment (X)" with the count. Tapping "Comment (X)" expands the post to show all comments + the input field. There is NO separate "View all comments" link — the Comment button in the engagement row IS the link. This is exactly how Facebook handles it.
- This keeps the feed clean. The counter tells you there's engagement, the button opens it.

### FIX 7: Remove Standalone Like Counter
**Problem:** There's both a standalone like/reaction counter AND a counter next to the "Like" button in the engagement row. This is redundant.
**Fix:** Remove the standalone reaction counter row (the one that shows "❤️ 1" or similar above the engagement buttons). The count now lives next to the Like button itself: "❤️ Like (3)". One location for the count, not two. If the user wants to see WHO reacted, they can long-press the count or tap it to open the "Who Reacted" bottom sheet.

---

## VERIFICATION CHECKLIST
After all fixes:
- [ ] Switching teams in selector updates ALL team hub content (posts, cover photo, team name, counts)
- [ ] Each team has its own independent cover photo
- [ ] Comments persist after closing and reopening the app
- [ ] Comments load correctly when returning to a post
- [ ] Team selector scrolls away with hero — only mini header sticks
- [ ] No persistent emoji row below posts — replaced with long-press Like bubble
- [ ] Like button: tap to toggle default reaction, long-press for emoji picker bubble
- [ ] Engagement row shows counters: Like (X), Comment (X), Share (X)
- [ ] 2+ comments hidden — Comment (X) button is the only way to expand them
- [ ] No duplicate like/reaction counters
- [ ] Works for Admin, Coach, Parent, Player
- [ ] `npx tsc --noEmit` — zero new errors

Show me your plan, then fix all 7 items. Start with the 4 critical bugs.
