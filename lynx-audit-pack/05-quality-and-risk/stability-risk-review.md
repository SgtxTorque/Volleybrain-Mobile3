# Stability Risk Review

## Confirmed stability risks

### Navigation stability

- Broken target route exists for player team hub.
- Many flows depend on `router.back()` for recovery.

### State stability

- Screens rely on a mix of route params, context, local state, and AsyncStorage.
- `lib/auth.tsx` clears selected storage keys on logout, which helps, but does not remove broader distributed-state complexity.

### Data stability

- Screens frequently query Supabase directly rather than through one normalized service contract.
- When domain assumptions drift, UX drift follows.

## Partial stability risks

### Seasonal context drift

- Many admin and operational screens depend on working season.
- When season is unset or stale, behavior is likely screen-specific rather than uniformly handled.

### Team context drift

- Team-affiliated screens do not all source team context the same way.

## Net assessment

The app can support a beta if users stay within the main paved paths, but edge navigation and cross-role data consistency remain meaningful risk areas.
