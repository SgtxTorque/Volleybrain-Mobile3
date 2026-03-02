# Team Hub — Phase 4: Quick Fixes

## RULES STILL APPLY
Read existing code before changing it. Do NOT break any role's experience. `npx tsc --noEmit` after all changes.

---

## FIX 1: Team Selector Not Responsive — Hit Box Too Small
**Problem:** The team selector pills are extremely hard to tap. It takes 10+ taps before a different team registers. The hit box / touchable area is too small or something is intercepting the taps.
**Fix:**
- Find the team selector / pill tabs component used in the team hub
- Increase the touchable area on each pill — ensure each pill has a minimum height of 44px (iOS recommended touch target) and generous horizontal padding (at least 16px on each side)
- Check if there's a scroll view or gesture handler UNDERNEATH the team selector that's stealing the touch events. This is a common issue when a sticky/absolute-positioned element sits over a scroll view — the scroll view's pan gesture can eat taps.
- If the team selector is positioned with `position: absolute` or `zIndex`, make sure it has `pointerEvents="box-none"` on any wrapper containers that don't need to capture touches
- Check if the team selector is inside a `ScrollView` with `scrollEnabled` — horizontal scroll detection on the pill row might be interfering with tap detection
- Test: after fix, each pill should register on the FIRST tap, every time

---

## FIX 2: Comments Still Showing Inline at 2+ Comments
**Problem:** The comment section is still showing all comments inline when there are 2 or more. Per the spec: only 1 comment shows inline. At 2+ comments, ALL inline comments should be hidden — the "Comment (X)" button in the engagement row is the only indicator, and tapping it expands to show all comments.
**Fix:**
- Find the comment rendering logic in the team hub post component
- Change the threshold: if `commentCount >= 2`, do NOT render any inline comments. Only show the engagement row with "Comment (X)" count. Tapping "Comment (X)" toggles the full comment list open.
- If `commentCount === 1`, show that single comment inline below the post with the "Write a comment..." input.
- If `commentCount === 0`, show nothing. Just "Comment" in the engagement row with no count.
- The current code likely checks `commentCount > 2` or `commentCount >= 3` — change it to `commentCount >= 2`

---

## FIX 3: Yellow Text Color on Engagement Row — Hard to Read
**Problem:** The "Like", "Comment", and "Share" text in the engagement row uses yellow/gold color which is hard to read against the white/light background.
**Fix:** Change the engagement row text color:
- **Default state (not engaged):** Gray text (#64748B or similar muted gray)
- **Active/engaged state (user has liked):** Use the app's primary teal (#14B8A6) or a clear red/pink for the Like heart. NOT yellow.
- **Comment count active:** Same teal or a clear dark color — NOT yellow
- The yellow/gold accent color should NOT be used for text on light backgrounds. It fails contrast accessibility standards. Reserve yellow/gold for badges, borders, or dark backgrounds only.

---

## FIX 4: Keyboard Avoidance When Commenting
**Problem:** When tapping "Write a comment..." the keyboard opens but covers the comment input field. The user can't see what they're typing.
**Fix:** Wrap the team hub screen (or the relevant scroll area) with `KeyboardAvoidingView` if not already done:
```
<KeyboardAvoidingView 
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
```
- When the comment input is focused, the scroll view should automatically scroll up so the input field is visible above the keyboard
- Also add `scrollToEnd` or `scrollToOffset` when the comment input focuses — programmatically scroll the post's comment section into view
- Test on Android specifically since that's what you're using — Android's `height` behavior works differently than iOS `padding`
- If the team hub already uses `KeyboardAvoidingView`, check that the comment input's position isn't being clipped by a parent container with fixed height

---

## VERIFICATION CHECKLIST
- [ ] Team selector pills respond on first tap, every time
- [ ] 0 comments: no inline comments, "Comment" with no count
- [ ] 1 comment: shows inline with input field
- [ ] 2+ comments: no inline comments, "Comment (X)" count only, tap to expand
- [ ] No yellow text on engagement row — gray default, teal or pink for active states
- [ ] Keyboard doesn't cover comment input — view scrolls up when typing
- [ ] Works for all roles
- [ ] `npx tsc --noEmit` — zero new errors

Show me your plan, then fix all 4 items.
