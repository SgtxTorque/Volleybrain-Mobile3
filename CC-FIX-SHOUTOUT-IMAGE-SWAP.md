# CC-FIX-SHOUTOUT-IMAGE-SWAP.md
# Fix: Shoutout Images Are Reversed + Update Feed Posts

---

## THE PROBLEM

The mascot illustrations and emoji/icons are SWAPPED in the shoutout system. Currently:
- Coach SELECTION grid shows the big mascot cub illustrations (WRONG — these should be small emojis/icons)
- Player RECEIVED modal shows emojis/icons (WRONG — these should be the big mascot illustrations)
- Team Hub FEED posts show emojis/icons (WRONG — these should show mascot illustration thumbnails)

## THE FIX

Swap them. The flow should be:

1. **Coach selects a shoutout type:** Small emoji/icon as the selection thumbnail. Quick, scannable, tappable. The mascot illustrations are too detailed for a selection grid. Keep the 2-column grid layout but use the ORIGINAL emoji/icon that was there before the dress-up spec. The card can still have the visual card treatment (rounded corners, border, label below) but the IMAGE inside should be the emoji/icon, NOT the cub illustration.

2. **Player RECEIVES the shoutout (modal):** The BIG mascot cub illustration is the HERO. 220px, centered, top 40% of the modal. This is the emotional payoff. The player sees a beautiful custom illustration celebrating what they were recognized for. Use `getShoutoutImage(shoutoutType)` from `mascot-images.ts` to get the correct illustration.

3. **Team Hub FEED post:** The mascot cub illustration appears as the 80px thumbnail on the shoutout card in the feed. NOT the emoji. The illustration makes shoutout posts visually distinct from other posts.

## RULES

- Read CC-LYNX-RULES.md before making changes.
- Read EVERY file you modify COMPLETELY before editing.
- Do NOT break the existing shoutout creation flow. Only change which IMAGE is shown where.
- Do NOT change the data model, the shoutout types, or any Supabase queries.
- Do NOT remove the mascot-images.ts helpers or the processed images. They stay. We're just moving WHERE each image type is used.

---

## PHASE 1: Fix the Coach Selection Grid

Find the shoutout type selection screen (the 2-column grid from Phase 3 of the dress-up spec).

**What to change:**
- The image source in each selection card should revert to whatever emoji/icon was used BEFORE the dress-up spec. Check the git history for the previous version if needed: `git diff HEAD~3 -- <filename>` or look for the original shoutout type icon/emoji mapping.
- If the original was a text emoji (like "⭐" or "💪"), use that in a Text component centered in the card at 40-48px font size.
- If the original was an icon component, restore that.
- Keep the 2-column card grid layout, the card styling (rounded corners, border, label below), and the tap/selection behavior. Only swap the image source back.

**What NOT to change:**
- Do NOT change the card layout, spacing, or interaction behavior.
- Do NOT remove the SHOUTOUT_IMAGES imports — they're still needed for the received modal and feed cards.

## PHASE 2: Fix the Shoutout Received Modal

Find the ShoutoutReceivedModal component (created in Phase 3 of the dress-up spec).

**Verify that the modal hero image is using the mascot illustration from SHOUTOUT_IMAGES.** If it's currently showing an emoji/icon instead, swap it:
- The hero image at the top of the modal MUST be the mascot cub illustration from `getShoutoutImage(shoutoutType)`
- Size: 220px width, centered, `MascotImage` component with `size="large"` or explicit 220px styling
- This is the big emotional moment. The cub illustration IS the celebration.

If it's already correct, leave it alone. If it's showing the emoji, swap it to the cub illustration.

## PHASE 3: Fix the Feed Card Thumbnail

Find the ShoutoutCard component that renders in the Team Hub feed.

**Verify that the thumbnail image (80px, left side of the card) is using the mascot illustration.** If it's currently showing an emoji/icon instead, swap it:
- The thumbnail MUST be the mascot cub illustration from `getShoutoutImage(shoutoutType)`
- Size: 80px, rounded 10px corners
- This makes shoutout posts visually distinct in the feed

If it's already correct, leave it alone.

## PHASE 4: Update Existing Shoutout Posts in the Feed

This is about ensuring that shoutout posts that were ALREADY created (before this fix) render correctly with the new image treatment.

**Investigation:**
1. Read the shoutout data model. How are shoutouts stored? What fields exist? Is the shoutout type stored as a string key (like "great_effort") or an enum?
2. Read how the Team Hub feed renders shoutout posts. Does it read the shoutout type from the database and map it to an image at render time? Or does it store the image reference in the post itself?

**If the feed renders images dynamically based on shoutout type (most likely):**
- No database changes needed. The existing posts already have a shoutout type stored. The feed card component just needs to call `getShoutoutImage(post.shoutout_type)` at render time. As long as Phase 3 is correct, ALL existing posts (past and future) will automatically show the mascot illustration.
- Verify this by checking: does the ShoutoutCard component receive the shoutout type and look up the image dynamically? If yes, existing posts are already fixed.

**If the feed stores a static image reference in each post record:**
- This is harder. You would need to update existing records. BUT do NOT run any UPDATE queries without confirming the approach first. Just add a comment in the code: `// TODO: Existing posts with static image refs may need migration — discuss with Carlos`
- For NEW posts going forward, make sure the component uses the dynamic lookup.

**Most likely scenario:** The feed renders dynamically based on shoutout type, so fixing the component (Phase 3) automatically fixes all existing and future posts. Verify and confirm.

---

## COMMIT

Single commit after all 4 phases: `"Fix shoutout image swap: emojis for selection, mascot illustrations for celebration/feed"`

---

## VERIFICATION CHECKLIST

After the fix, the flow should be:

1. ✅ Coach opens "Give Shoutout" → sees a grid of EMOJI/ICON cards (small, quick to scan)
2. ✅ Coach taps "Great Effort" emoji card → proceeds to select player and send
3. ✅ Player opens app → ShoutoutReceivedModal slides up → BIG mascot cub illustration (220px) at the top → "SHOUTOUT!" → "Great Effort" → "From: Coach Carlos"
4. ✅ Team Hub feed → shoutout post has mascot cub illustration THUMBNAIL (80px) on the left → "Coach Carlos gave Ava a shoutout!" → "Great Effort" pill badge
5. ✅ Old/existing shoutout posts in the feed also show the mascot thumbnail (because images are looked up dynamically by type)
