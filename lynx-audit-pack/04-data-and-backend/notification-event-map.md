# Notification Event Map

## Root notification-tap router

Defined in `app/_layout.tsx`.

### Types observed

- `chat`
- `schedule`
- `payment`
- `blast`
- `registration`
- `game`
- `game_reminder`
- `challenge_new`
- `challenge_joined`
- `challenge_progress`
- `challenge_completed`
- `challenge_winner`
- `challenge_verify`

### Destinations

- chat -> `/chat/:channelId` or `/(tabs)/chats`
- schedule -> role-specific schedule tab
- payment -> `/(tabs)/payments` or `/family-payments`
- blast -> `/(tabs)/chats`
- registration -> `/registration-hub` or `/parent-registration-hub`
- game -> `/game-prep?eventId=...` or `/(tabs)/gameday`
- challenge types -> `/coach-challenge-dashboard` or `/challenge-cta` or `/challenges`

## Inbox product split

### General inbox

- File: `app/notification.tsx`
- Reads from: `lib/notifications`
- Display model: generic app notifications

### Player engagement inbox

- File: `app/notification-inbox.tsx`
- Reads from: `hooks/useNotifications`
- Display model: mascot/media-rich player notifications with `action_url`

## UX implication

Notifications are not one unified product in the current codebase.
