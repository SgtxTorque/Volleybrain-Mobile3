# Information Architecture Review

## IA shape in practice

The app is organized around role-specific operating modes rather than one clean universal nav model.

### Primary containers

- Auth flow
- Tabs flow
- Drawer super-navigation
- Search-driven jumps
- Notification-driven jumps

### IA strengths

- Role-specific access is visible in tabs and drawer
- Legal/settings/profile utilities are grouped reasonably
- Player engagement area has a coherent cluster: journey, quests, achievements, stats

### IA weaknesses

- Teams, roster, and team hubs are distributed across too many surfaces
- Notifications are not one product
- Schedule/game day surfaces overlap and differ by role and entry path
- Parent utility surfaces and player utility surfaces do not share one obvious mental model

## Confirmed IA contradictions

- "Notification Inbox" label does not open `notification-inbox`
- team hub concept exists in player components without a matching route
- admin can reach both `/team-management` and `/(tabs)/teams` for related work
