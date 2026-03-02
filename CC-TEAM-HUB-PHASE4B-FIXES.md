# Team Hub — Phase 4b: Targeted Fixes

## RULES STILL APPLY
Read existing code before changing it. Do NOT break any role's experience. `npx tsc --noEmit` after all changes.

---

## FIX 1: Comment Counter Not Showing on Engagement Row
**Problem:** The Like button shows its count correctly as "Like (1)", but the Comment button does NOT show the count in the same format. It should show "Comment (2)" when there are 2 comments, but it just shows "Comment".
**Fix:** Find the engagement row rendering in the post component. The Like button correctly displays its count inline. Apply the EXACT same pattern to the Comment button:
- 0 comments → "Comment" (no count, gray)
- 1+ comments → "Comment (X)" with the count in parentheses, same style as Like
- Also apply to Share: 0 shares → "Share", 1+ shares → "Share (X)"
- All three buttons should use the identical count display pattern. If Like works, copy that logic for Comment and Share.

---

## FIX 2: Team Selector — Hit Box Is the Text, Not the Pill
**Problem:** The team selector pills only register taps when you press directly on the TEXT inside the pill, not anywhere on the pill itself. The touchable area is limited to the text label, not the full pill background. This makes it feel broken because users tap the pill and nothing happens unless they hit the exact text.
**Fix:** The `TouchableOpacity` (or `Pressable`) wrapper must cover the ENTIRE pill area — the full background, padding, and all. Do NOT put the touchable only around the `Text` component. The structure should be:
```
<TouchableOpacity style={pillStyle}> ← THIS is the touchable, wrapping the whole pill
  <Text>{teamName}</Text>
</TouchableOpacity>
```
NOT:
```
<View style={pillStyle}>
  <TouchableOpacity> ← WRONG: touchable only wraps the text
    <Text>{teamName}</Text>
  </TouchableOpacity>
</View>
```
Check the current code and ensure the touchable wrapper covers the full pill including all padding and background. The entire colored pill area should be tappable.

---

## FIX 3: Team Selector Position — Sits Too Low
**Problem:** The team selector pills were moved lower on the screen after the Phase 3/4 fixes. They used to sit right below the app header bar, but now there's too much gap between the header and the pills.
**Fix:** Reduce the top margin/padding above the team selector pills. They should sit snugly below the "VOLLEYBRAIN MY TEAM" header bar with minimal gap (8-12px max). Check if extra padding or margin was added during the scroll behavior fixes and remove it. Compare the vertical position to the old layout and match it.

---

## VERIFICATION CHECKLIST
- [ ] Comment button shows "Comment (X)" with count, same format as Like
- [ ] Share button shows "Share (X)" with count when shares exist
- [ ] Team selector pills respond to taps ANYWHERE on the pill, not just the text
- [ ] Team selector sits close to the header bar (8-12px gap, not more)
- [ ] All roles still work
- [ ] `npx tsc --noEmit` — zero new errors

Fix all 3 items.
