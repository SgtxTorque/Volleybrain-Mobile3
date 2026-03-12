# CODEX UX DEAD-END ROUTES

## Explicit Placeholder Dead Ends

- `/web-features`
  - Used by drawer entries:
    - Form Builder
    - Waiver Editor
    - Payment Gateway
    - generic Web Features
  - UX result:
    - user reaches a screen that admits the feature is web-only or not available in mobile

## Functional Dead-End Risks

- `/attendance` without `eventId`
  - route opens, but task intent depends on event context

- `/game-recap` without `eventId`
  - route exists, but recap UX is event-specific

- `/lineup-builder` without `eventId` and `teamId`
  - meaningful workflow context may be absent

- `/team-gallery` without `teamId`
  - gallery intent becomes ambiguous

- `/team-wall` without `teamId`
  - team-hub/feed intent becomes ambiguous

## Low-Entry / Peripheral Routes

- `/(tabs)/admin-chat`
- `/(tabs)/admin-schedule`
- `report-viewer`

These are not proven dead, but they appear peripheral or dependent on non-obvious entry points.

## Back-Navigation Dead Ends

Many secondary/detail screens only expose `router.back()` and no explicit fallback to a stable hub. If entered by deep link or unusual route chain, the user experience can degrade into “back until something sensible appears”.
