# CC-HOTFIX-CONTEXT-SYNC-V2.md
# Lynx Mobile — Hotfix: Clear Drawer Context on Any Role Change
# EXECUTION SPEC — Single file, single change

---

## PROBLEM

The previous hotfix clears drawer context only when roles are switched via the drawer's own role pills (`handleRoleSwitch`). But roles can also be switched from `RoleSelector.tsx` on the home screen, which calls `setDevViewAs` directly without clearing the drawer's stale `activeContextId`. Result: drawer still holds the wrong child/team context after switching roles from the home screen.

## FIX

**File:** `components/GestureDrawer.tsx`

**Add one useEffect** that watches `currentRoleKey` and clears context whenever the role changes, regardless of how the switch happened.

Place this immediately AFTER the existing `useEffect` that triggers `fetchContextItems` (around line 397-401):

```typescript
// Clear stale context when role changes from ANY source (drawer pills, home RoleSelector, etc.)
useEffect(() => {
  setActiveContextId(null);
  setContextItems([]);
}, [currentRoleKey]);
```

That's it. When `currentRoleKey` changes (because `devViewAs` changed from any source), context resets. The next drawer open triggers `fetchContextItems` which loads fresh context for the new role.

**The `handleRoleSwitch` clearing from the previous hotfix can stay.** It provides immediate clearing when switching from inside the drawer (before the useEffect would fire). The useEffect is the safety net for all other switch paths. Having both is fine — clearing null/empty state that's already null/empty is a no-op.

## RULES

- Modify ONLY `components/GestureDrawer.tsx`
- Add ONLY the useEffect described above
- Do NOT change anything else

## REPORT

After completing:
1. Exact line where useEffect was added
2. Confirm only GestureDrawer.tsx was modified
3. Run `npx tsc --noEmit` and report result
