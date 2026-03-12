# CODEX UX FRICTION REGISTER

## High Friction

### Hidden Context Friction

- User opens a route successfully but still lacks the team/player/season context the screen expects.
- Typical screens:
  - `/lineup-builder`
  - `/attendance`
  - `/game-recap`
  - `/team-gallery`
  - `/team-wall`

### Role-Switch Friction

- User changes role view and sees a different shell, but stale team or season state may remain.
- Typical screens:
  - team hub
  - roster
  - dashboard

### Duplicate-Surface Friction

- Same task has multiple screens:
  - team management
  - team hub
  - schedule
- This increases discoverability confusion and inconsistent outcomes.

## Medium Friction

### Empty-State Friction

- Many screens have valid empty states, but those states may mask missing context or broken linkage rather than true emptiness.
- Examples:
  - `No Teams Yet`
  - `No Open Registrations`
  - `No Notifications`
  - `No Players Found`

### Placeholder Friction

- Drawer labels suggest complete features, but some routes are placeholders:
  - Form Builder
  - Waiver Editor
  - Payment Gateway

### Synthetic-Data Friction

- Registration admin can show synthetic player-derived rows instead of real registration rows.
- That changes user trust in the screen’s mental model.

## Low Friction

### Back-Only Screens

- Many detail screens rely on `router.back()`.
- If entered from an unusual path, recovery can be weaker than explicit home navigation.
