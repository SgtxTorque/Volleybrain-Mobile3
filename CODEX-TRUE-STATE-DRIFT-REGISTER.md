# CODEX TRUE-STATE DRIFT REGISTER

## Identity / Family Linkage

- Active structures:
  - `player_guardians.guardian_id`
  - `player_parents.parent_id`
  - `players.parent_account_id`
  - `players.parent_email`
  - `players.profile_id`
- Affected files:
  - `lib/onboarding-router.ts`
  - `lib/permissions-context.tsx`
  - `components/DashboardRouter.tsx`
  - `components/GestureDrawer.tsx`
  - `app/(tabs)/connect.tsx`
  - `hooks/useParentHomeData.ts`
  - `app/register/[seasonId].tsx`
- Risk: `P0`
- Classification: `CONFIRMED`

## Role Names

- Values used:
  - `league_admin`
  - `head_coach`
  - `assistant_coach`
  - `parent`
  - `player`
  - `admin`
  - `coach`
- Risk: `P2`
- Classification: `CONFIRMED`

## Season Status Values

- Values read:
  - `active`
  - `upcoming`
  - `completed`
  - `archived`
  - `draft`
- Drift:
  - `archived` and `completed` are both treated as archive-like in some UI
- Risk: `P2`
- Classification: `CONFIRMED`

## Team Type Values

- Values written/read:
  - `recreational`
  - freeform `team_type`
- Canonical set: `UNVERIFIED`
- Risk: `P2`
- Classification: `PARTIALLY CONFIRMED`

## Event Type Values

- Values used:
  - `game`
  - `practice`
  - `event`
  - `match`
  - `tournament`
- Drift:
  - team hub includes `match` and `tournament`; core schedule flows mostly assume `game/practice/event`
- Risk: `P1`
- Classification: `CONFIRMED`

## Registration Status Values

- Values used:
  - `new`
  - `submitted`
  - `approved`
  - `active`
  - `rostered`
  - `waitlisted`
  - `denied`
  - `withdrawn`
  - `pending`
- Drift:
  - parent-facing and admin-facing flows do not use the same set consistently
- Risk: `P1`
- Classification: `CONFIRMED`

## Payment Status Values

- Values used:
  - `unpaid`
  - `pending`
  - `verified`
  - boolean `paid`
- Drift:
  - some screens rely on `status`; some update `paid`
- Risk: `P1`
- Classification: `CONFIRMED`

## Attendance / RSVP Status Values

- RSVP values:
  - `yes`
  - `no`
  - `maybe`
  - `confirmed`
- Attendance values:
  - `present`
  - `absent`
  - `late`
- Drift:
  - some code treats `confirmed` as equivalent to `yes`
- Risk: `P1`
- Classification: `CONFIRMED`

## Notification Type Values

- Values written:
  - `volunteer_needed`
  - `rsvp_reminder`
  - `event_update`
  - `backup_promoted`
  - `challenge_new`
  - `challenge_joined`
  - `challenge_progress`
  - `challenge_completed`
  - `challenge_winner`
  - `challenge_verify`
  - `general`
- Inbox explicit support:
  - `volunteer_needed`
  - `rsvp_reminder`
  - `event_update`
  - `backup_promoted`
  - fallback default icon for others
- Risk: `P1`
- Classification: `CONFIRMED`

## Parent / Guardian / Family Terminology

- Terms active in code:
  - parent
  - guardian
  - family
  - child
  - parent1 / parent2
- Risk: `P2`
- Classification: `CONFIRMED`

## Compile / Tooling Boundary Drift

- Active TS scope includes:
  - production app
  - `design-reference/**`
  - `reference/**`
- Risk: `P1`
- Classification: `CONFIRMED`
