# Beta Launch Blockers

## 1. Broken player team hub navigation

- Classification: `CONFIRMED`
- Evidence: `components/player-scroll/PlayerTeamHubCard.tsx`
- Reason: pushes `/team-hub` with no route file present

## 2. Conflicting notification products

- Classification: `CONFIRMED`
- Evidence: `app/notification.tsx`, `app/notification-inbox.tsx`, `components/GestureDrawer.tsx`
- Reason: users are routed to different inbox paradigms with no clear canonical destination

## 3. Duplicate team management surfaces

- Classification: `CONFIRMED`
- Evidence: `app/team-management.tsx`, `app/(tabs)/teams.tsx`
- Reason: admin/team operations can diverge by entry point

## 4. Parameter-sensitive operational screens reachable generically

- Classification: `PARTIAL`
- Evidence: drawer routes to `/game-prep`, `/attendance`, `/lineup-builder` without guaranteed event/team context
- Reason: likely empty or incorrect operational context

## 5. Parent-child linkage inconsistency

- Classification: `PARTIAL`
- Evidence: parent screens use guardian links, direct parent account ids, and email matching
- Reason: family UX can change by screen when records are imperfect
