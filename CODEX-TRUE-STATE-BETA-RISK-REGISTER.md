# CODEX TRUE-STATE BETA RISK REGISTER

## P0

### Parent / Player Identity Model Drift

- Type: `wrong-user-data`, `schema mismatch`, `data drift`
- Symptom: different screens can resolve different children/teams for the same account
- Evidence: `lib/onboarding-router.ts`, `lib/permissions-context.tsx`, `components/DashboardRouter.tsx`, `components/GestureDrawer.tsx`, `app/register/[seasonId].tsx`
- Impacted roles: parent, player, coach-parent, multi-role
- Release risk: release blocker
- Recommended next action: prove and enforce one canonical linkage model
- Recommendation: `fix before beta`
- Classification: `CONFIRMED`

### TypeScript Scope Includes Non-Production Trees

- Type: `backend / infra dependency`
- Symptom: `tsc --noEmit` fails for reference/design/admin artifacts
- Evidence: `tsconfig.json`, `cmd /c npx tsc --noEmit`
- Release risk: release blocker
- Recommendation: `fix before beta`
- Classification: `CONFIRMED`

### Live-App Type Error In `lib/email-queue.ts`

- Type: `schema mismatch`
- Symptom: confirmed production TS error
- Evidence: `lib/email-queue.ts`, `tsc` output
- Release risk: release blocker
- Recommendation: `fix before beta`
- Classification: `CONFIRMED`

## P1

### Admin User Listing Can Show Non-Org Profiles

- Type: `wrong-user-data`
- Evidence: `app/users.tsx`
- Recommendation: `fix before beta`
- Classification: `CONFIRMED`

### Sensitive Screens Are Hidden More Than Route-Guarded

- Type: `security / permission leak`
- Evidence: `components/GestureDrawer.tsx`, `app/(tabs)/_layout.tsx`, standalone admin screens
- Recommendation: `fix before beta`
- Classification: `PARTIALLY CONFIRMED`
- Manual proof still needed: direct route entry with restricted role and real backend policies

### Registration Wizard Writes Different Link Model Than Parent Screens Read

- Type: `data drift`, `schema mismatch`
- Evidence: `app/register/[seasonId].tsx`, `hooks/useParentHomeData.ts`
- Recommendation: `fix before beta`
- Classification: `CONFIRMED`

### Duplicate Team Management Implementations

- Type: `wrong-screen / wrong-route`, `data drift`
- Evidence: `app/team-management.tsx`, `app/(tabs)/teams.tsx`
- Recommendation: `fix before beta`
- Classification: `CONFIRMED`

### Notification Type Producer / Consumer Drift

- Type: `wrong-screen / wrong-route`, `visual inconsistency`
- Evidence: `lib/notifications.ts`, `app/notification.tsx`, `app/_layout.tsx`
- Recommendation: `fix before beta`
- Classification: `CONFIRMED`

### Complete Profile Writes Different Birth-Date Column

- Type: `schema mismatch`
- Evidence: `app/complete-profile.tsx`
- Recommendation: `fix before beta`
- Classification: `CONFIRMED`

### Team / Role Context Can Stay Stale Across Role Switches

- Type: `stale context / cross-role leakage`
- Evidence: `lib/permissions-context.tsx`, `lib/team-context.tsx`, `components/DashboardRouter.tsx`
- Recommendation: `fix before beta`
- Classification: `CONFIRMED`

### Registration Admin Uses Synthetic Registrations For Orphan Players

- Type: `wrong-screen / wrong-route`, `data drift`
- Evidence: `app/registration-hub.tsx`
- Recommendation: `fix before beta`
- Classification: `NEW FINDING`

## P2

### Invite Code Logic Uses Conflicting Field Names

- Type: `schema mismatch`
- Evidence: `app/parent-registration-hub.tsx`, `app/(auth)/signup.tsx`, `app/(auth)/redeem-code.tsx`
- Recommendation: `fix before beta`
- Classification: `CONFIRMED`

### Client-Side Unread Badge Counting Is N+1 Heavy

- Type: `performance`
- Evidence: `app/(tabs)/_layout.tsx`
- Recommendation: `defer only if beta scale is small`
- Classification: `CONFIRMED`

### Schedule Auto-Checks Also Run For Parents

- Type: `performance`, `backend / infra dependency`
- Evidence: `app/(tabs)/schedule.tsx`
- Recommendation: `fix before beta`
- Classification: `NEW FINDING`

### Placeholder Drawer Features Route To Generic Web Screen

- Type: `placeholder / dead-end`
- Evidence: `components/GestureDrawer.tsx`, `app/web-features.tsx`
- Recommendation: `fix before beta` if visible to testers
- Classification: `CONFIRMED`

### `app.json` Has Duplicate Permissions And Placeholder Package

- Type: `backend / infra dependency`
- Evidence: `app.json`
- Recommendation: `fix before beta`
- Classification: `CONFIRMED`

### Push Registration Depends On EAS Project ID Discovery

- Type: `backend / infra dependency`
- Evidence: `lib/notifications.ts`, `app.json`
- Recommendation: `fix before beta`
- Classification: `PARTIALLY CONFIRMED`

### Reject Flow Leaves Auth Cleanup Ambiguous

- Type: `data drift`
- Evidence: `app/users.tsx`
- Recommendation: `fix before beta`
- Classification: `PARTIALLY CONFIRMED`
- Auth deletion semantics: `UNVERIFIED`

### Coach-Team Resolution Uses Incompatible Join Paths

- Type: `wrong-user-data`
- Evidence: `hooks/useCoachHomeData.ts`, `hooks/useCoachTeam.ts`, `app/(tabs)/connect.tsx`
- Recommendation: `fix before beta`
- Classification: `CONFIRMED`

## P3

### Duplicate Role Selector Components

- Type: `visual inconsistency`
- Evidence: `components/RoleSelector.tsx`, `components/ui/RoleSelector.tsx`
- Recommendation: `defer`
- Classification: `CONFIRMED`

### Reference / Design / Archive Content Mixed Into Root Repo

- Type: `placeholder / dead-end`
- Evidence: `reference/`, `design-reference/`, `_archive/`
- Recommendation: `defer`, unless tooling still includes them
- Classification: `CONFIRMED`
