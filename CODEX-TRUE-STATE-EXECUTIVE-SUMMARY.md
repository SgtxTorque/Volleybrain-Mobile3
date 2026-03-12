# CODEX TRUE-STATE EXECUTIVE SUMMARY

## Audit Scope

Independent forensic audit of the mobile app only. No production code was modified. Prior audit outputs were ignored. Findings below are based on code evidence in `app/`, `components/`, `hooks/`, `lib/`, and config files.

## Beta Readiness

Verdict: **not ready for broad beta without targeted stabilization**.

This app has real mobile feature coverage: auth, onboarding, registration, schedule, chat, team hub, payments, notifications, admin, and challenges are all implemented. The strongest problem is not a missing feature; it is **drift**:

- identity drift between parent, guardian, player-self, and coach linkage
- route/access drift between menu visibility and actual screen protection
- context drift between role, season, sport, team, and route-param state
- tooling drift between production app code and reference/design/admin artifacts

## Confirmed Release Blockers

1. `cmd /c npx tsc --noEmit` fails because `tsconfig.json` includes non-production trees and one live-app TS error remains in `lib/email-queue.ts`.
   - Classification: **CONFIRMED**

2. Parent/player identity resolution is inconsistent across active code paths.
   - `player_guardians`
   - `player_parents`
   - `players.parent_account_id`
   - `players.parent_email`
   - `players.profile_id`
   - Classification: **CONFIRMED**

3. Sensitive admin routes are menu-hidden, but not consistently route-guarded at screen level.
   - Classification: **PARTIALLY CONFIRMED**
   - Backend RLS protection: **UNVERIFIED**

4. `app/users.tsx` fetches all profiles before applying org role data.
   - Classification: **CONFIRMED**

5. Registration and user admin flows perform multi-table mutations without transaction semantics.
   - Classification: **CONFIRMED**

## Top Trust-Damaging Bugs

- Notification types emitted by `lib/notifications.ts` exceed what `app/notification.tsx` explicitly renders.
  - Classification: **CONFIRMED**

- Duplicate team-management screens exist:
  - `app/team-management.tsx`
  - `app/(tabs)/teams.tsx`
  - Classification: **CONFIRMED**

- Several drawer items route to generic `/web-features` placeholders rather than mobile implementations.
  - Classification: **CONFIRMED**

- `app/complete-profile.tsx` maps `birth_date` to `date_of_birth`, unlike the wider registration flow.
  - Classification: **CONFIRMED**

## Security / Permission Risks

- In-app route protection is weaker than menu-level role gating suggests.
  - Classification: **PARTIALLY CONFIRMED**

- Organization leakage risk exists in the user admin list.
  - Classification: **CONFIRMED**

- Whether Supabase RLS fully prevents direct-route misuse cannot be proven from this code review.
  - Classification: **UNVERIFIED**

## Multi-Role / Season / Team Context Risks

- `viewAs` changes visible menus, tabs, and dashboard, but does not clearly reset season or team state.
  - Classification: **CONFIRMED**

- Team selection persists in AsyncStorage independently of role and season.
  - Classification: **CONFIRMED**

- Season state is provider-based, but multiple screens also use local season state, route params, or all-open-season queries.
  - Classification: **CONFIRMED**

## What Can Wait Until After Beta

- duplicate UI component cleanup
- archive/reference repo cleanup, once tooling no longer includes those trees
- visual consistency improvements

## Confidence

- Primary findings: **high**
- Route/access conclusions: **medium**
- Backend security conclusions: **low to medium**

## Manual QA Still Required

- Direct deep-link entry into admin screens as non-admin
- Multi-role switching across season changes
- Parent with multiple children across orgs/seasons
- Player-self account behavior
- Invite-code behavior across all entry points
- Partial-failure registration rollback
