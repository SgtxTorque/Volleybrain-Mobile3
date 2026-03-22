# Broken Or Partial Features

## Confirmed

### Broken route target

- `components/player-scroll/PlayerTeamHubCard.tsx` pushes `/team-hub?teamId=...`
- No matching `app/team-hub.tsx` route exists
- Classification: `CONFIRMED`
- User impact: tap leads to navigation failure or unresolved route

### Drawer placeholder tools

- `Form Builder`
- `Waiver Editor`
- `Payment Gateway`
- All route to `/web-features`
- Classification: `CONFIRMED`
- User impact: surface appears present but is not implemented as native feature

### Notification inbox split

- `app/notification.tsx` uses `lib/notifications`
- `app/notification-inbox.tsx` uses `hooks/useNotifications` and `lib/notification-engine`
- Drawer label "Notification Inbox" routes to `/notification`, not `/notification-inbox`
- Classification: `CONFIRMED`
- User impact: different users may experience different notification products

## Partial

### Param-sensitive game day routes

- `/game-prep`, `/game-prep-wizard`, `/lineup-builder`, `/attendance`, `/game-recap`
- Some callers pass event/team params, some generic menu routes do not
- Classification: `PARTIAL`
- User impact: likely empty or context-light screens when reached from generic shortcuts

### Team surfaces overlap

- `/team-management`
- `/(tabs)/teams`
- `/team-roster`
- `/roster`
- Classification: `PARTIAL`
- User impact: same task may produce different outcomes depending on entry route

### Child-linked parent views

- Parent views resolve children through multiple link methods
- Classification: `PARTIAL`
- User impact: parent may see different team lists or schedules across screens if records are incomplete
