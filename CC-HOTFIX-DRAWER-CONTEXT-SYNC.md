# CC-HOTFIX-DRAWER-CONTEXT-SYNC.md
# Lynx Mobile — Hotfix: Drawer Context Sync on Role Switch
# EXECUTION SPEC — Targeted fix, single file

---

## PROBLEM

When a user switches roles (e.g., parent → player via role pills), the drawer's `activeContextId` does not reset. It retains the previous role's context (e.g., a child ID from parent mode) instead of updating to match the new role's context (e.g., the player's team ID in player mode).

This causes: when a player taps "My Stats" or "My Evaluations" in the drawer, the `activeContextId` still holds the wrong child's ID from parent mode, so my-stats loads the wrong player's data.

## ROOT CAUSE

Two independent issues:

1. `fetchContextItems()` only runs when `isOpen` changes (line 397-401). When the user switches roles via `handleRoleSwitch`, the drawer closes and navigates home. The next time the drawer opens, `fetchContextItems` runs — but the `!activeContextId` guard at lines 332, 356, 387 prevents overwriting the stale value because `activeContextId` is already set from the previous role.

2. `handleRoleSwitch` (line 272-276) calls `setDevViewAs` and navigates but does NOT clear `activeContextId` or `contextItems`.

## FIX

**File:** `components/GestureDrawer.tsx`

**Change 1:** In `handleRoleSwitch` (line 272-276), clear the context state when switching roles:

```typescript
const handleRoleSwitch = (roleKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDevViewAs(roleKey as any);
    // Clear stale context from previous role
    setActiveContextId(null);
    setContextItems([]);
    closeDrawer();
    setTimeout(() => router.push('/(tabs)' as never), 150);
};
```

Add `setActiveContextId(null)` and `setContextItems([])` BEFORE `closeDrawer()`.

**Change 2:** In `fetchContextItems`, remove the `!activeContextId` guard from all three role branches so context always refreshes when the drawer opens. Change:

```typescript
// Line ~332 (parent branch):
if (items.length > 0 && !activeContextId) setActiveContextId(items[0].id);

// Line ~356 (coach branch):
if (items.length > 0 && !activeContextId) setActiveContextId(items[0].id);

// Line ~387 (player branch):
if (items.length > 0 && !activeContextId) setActiveContextId(items[0].id);
```

To:

```typescript
// All three branches — always set to first item if items exist:
if (items.length > 0) setActiveContextId(items[0].id);
```

This ensures: when the drawer opens after a role switch, `fetchContextItems` runs (because `isOpen` changed), context was cleared by the role switch, and the fresh fetch always sets the first contextually-relevant item as active.

**Change 3:** The `fetchContextItems` useCallback dependency array (line ~396) uses `isParent, isCoach, isPlayer`. These values change when `devViewAs` changes, which means `fetchContextItems` gets a new identity on role switch. The useEffect at line 397 depends on `fetchContextItems`, so it will re-run. However, the useEffect only fires when `isOpen` is true. Since the drawer closes during role switch, the refetch happens on the NEXT open. This is correct — no change needed to the dependency array.

---

## RULES

- Modify ONLY `components/GestureDrawer.tsx`
- Change ONLY the three areas described above
- Do NOT change any other logic in the file
- Do NOT touch MENU_SECTIONS, handleMenuItemPress, resolveRoute, or any rendering logic

## REPORT

After completing, report:
1. Exact lines changed
2. Confirm only GestureDrawer.tsx was modified
3. Run `npx tsc --noEmit` and report result
