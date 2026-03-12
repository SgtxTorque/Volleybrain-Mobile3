# LYNX MOBILE — STABILIZATION EXECUTION PLAN
## Pre-TestFlight System Cleanup
## Diagnosis-backed execution plan for Claude Code
## Date: 2026-03-11

---

## Purpose

This document defines the exact stabilization sequence for Lynx Mobile before private beta / TestFlight.

This is NOT a broad refactor.
This is NOT a redesign sprint.
This is NOT a “fix whatever you notice” prompt.

This is a controlled engineering stabilization pass based on:
- true-state system audits
- second-opinion system audits
- UX audits
- route/context/drift/risk reports

Goal:
1. Make the app deterministic
2. Remove the highest-risk beta blockers
3. Reduce the chance that one fix breaks unrelated areas
4. Improve confidence in role, team, season, and player resolution

---

## Core Principle

Do NOT execute all phases blindly in one uninterrupted pass.

You must execute:
- one phase at a time
- verify that phase
- report changed files
- report residual risk
- STOP and wait for the next instruction unless explicitly told to continue

No broad opportunistic cleanup.
No “while I was there” refactors.
No unrelated style changes.

---

## Mandatory Guardrails

1. Do not change more files than required for the current phase.
2. Do not rename routes unless the current phase explicitly requires it.
3. Do not consolidate duplicate screens yet unless the phase explicitly requires it.
4. Do not change visual styling except where needed for state/error/guard handling.
5. Every phase must end with:
   - files changed
   - root cause fixed
   - what was deliberately not touched
   - verification steps run
   - remaining risks
6. If a phase reveals a larger structural issue than expected, STOP and explain before proceeding.

---

## Source Findings This Plan Is Based On

High-confidence findings already established:
- Parent/player linkage is resolved through multiple active models (`player_guardians`, `player_parents`, `players.parent_account_id`, `players.parent_email`, `players.profile_id`)
- Team/season/player context comes from multiple sources: provider state, AsyncStorage, route params, local state, and derived queries
- Several sensitive/admin screens are menu-hidden more than route-guarded
- Multiple routes can open without required params/context
- AsyncStorage keys are not fully cleared on logout
- Player data access and challenge detail access need explicit permission validation
- Notification deep links and game-day routes have missing parameter problems
- `tsc --noEmit` is not trustworthy until production scope is isolated and the live `lib/email-queue.ts` type error is fixed

This plan exists to address those issues first.

---

## PHASE ORDER

### Phase 0 — Build Trust + Safety Rails
### Phase 1 — Session / Context Hygiene
### Phase 2 — Permission and Route Guards
### Phase 3 — Navigation Parameter Contracts
### Phase 4 — Identity / Linkage Compatibility Layer
### Phase 5 — Beta UX Safety States
### Phase 6 — Deferred / Post-Beta Cleanup Parking Lot

Do NOT skip order.

---

# PHASE 0 — BUILD TRUST + SAFETY RAILS

## Objective
Make the codebase’s validation tools trustworthy before deeper fixes.

## Required targets
- `tsconfig.json`
- any root config controlling typecheck scope
- `lib/email-queue.ts`

## Tasks
1. Narrow TypeScript scope so production app code is type-checked without contamination from:
   - `reference/**`
   - `design-reference/**`
   - `_archive/**`
   - other non-production trees
2. Fix the confirmed live-app TypeScript error in `lib/email-queue.ts`
3. Re-run typecheck against the real mobile app scope
4. Report final typecheck result

## Explicit non-goals
- Do not reorganize the repo
- Do not delete archive/reference content
- Do not clean up unrelated TS warnings

## Stop gate
STOP after Phase 0 and report:
- files changed
- exact TS scope change
- exact `email-queue` fix
- final `tsc --noEmit` result

---

# PHASE 1 — SESSION / CONTEXT HYGIENE

## Objective
Remove stale cross-user and cross-role context leaks.

## Required targets
- `lib/auth.tsx`
- `lib/season.tsx`
- `lib/team-context.tsx`
- `components/DashboardRouter.tsx`
- `lib/sport.tsx` (if active AsyncStorage persistence is confirmed)

## Tasks
1. Clear all relevant AsyncStorage keys on logout, including at minimum:
   - `vb_admin_last_season_id`
   - `vb_selected_team_id`
   - `vb_player_last_child_id`
   - `activeSportId`
   - `lynx_daily_achievement_check`
   - any additional `vb_*` / `lynx_*` keys actually used by mobile
2. Ensure logout also resets in-memory context cleanly where applicable
3. Add recovery behavior for invalid persisted season:
   - if saved season no longer exists, do not hang on spinner
   - fall back to a valid season selection path or first valid season
4. Do NOT redesign season/team selection yet
5. Do NOT rewrite provider hierarchy

## Explicit non-goals
- no multi-org redesign
- no role model rewrite
- no screen consolidation

## Stop gate
STOP after Phase 1 and report:
- keys cleared
- invalid season recovery path
- files changed
- remaining context leakage risks

---

# PHASE 2 — PERMISSION AND ROUTE GUARDS

## Objective
Protect sensitive data/detail screens and sensitive admin routes at the screen level.

## Required targets
### Player / family access
- `hooks/usePlayerHomeData.ts`
- `app/child-detail.tsx`
- any other player-detail/stat screen that accepts `playerId` from params

### Challenge access
- `app/challenge-detail.tsx`
- relevant challenge navigation source(s) if child/team validation is needed

### Sensitive admin screens
- `app/users.tsx`
- `app/team-management.tsx`
- `app/season-settings.tsx`
- `app/registration-hub.tsx`
- `app/payment-reminders.tsx`
- other clearly admin-only standalone screens actually lacking screen guards

## Tasks
1. Add explicit client-side ownership/permission validation for player data screens
   - a user must not be able to load arbitrary player data by passing `playerId`
2. Add explicit access validation for challenge detail
   - verify user can access the challenge via team/org/role before render
3. Add screen-level role guards to sensitive admin screens
   - menu hiding is not enough
4. Guard behavior must be deterministic:
   - redirect to safe fallback route OR
   - render explicit unauthorized state
   - never fail silently

## Explicit non-goals
- no backend RLS rewrite
- no broad role architecture rewrite
- no route renaming

## Stop gate
STOP after Phase 2 and report:
- screens guarded
- data hooks guarded
- exact fallback behavior for unauthorized access
- manual test cases suggested

---

# PHASE 3 — NAVIGATION PARAMETER CONTRACTS

## Objective
Make parameter-dependent routes deterministic and prevent empty / wrong screens from weak entry points.

## Required targets
- `app/_layout.tsx` (notification deep links)
- `app/game-prep.tsx`
- `app/game-prep-wizard.tsx`
- `app/lineup-builder.tsx`
- `app/game-recap.tsx`
- `app/attendance.tsx`
- `app/team-gallery.tsx`
- `app/team-wall.tsx`
- any other route confirmed to require params/context but currently opens generically

## Tasks
1. Define required route contracts for all param-dependent screens:
   - what params are required
   - what fallback behavior is allowed
2. Fix notification/deep-link navigation so required params are passed where available
3. Replace “silent fallback to first game/team” behavior where it is dangerous
4. Where params are missing:
   - show explicit missing-context state OR
   - redirect to a stable chooser/list screen
5. Do NOT leave screens hanging on endless spinners
6. Do NOT allow generic route opens that imply the wrong event/team

## Explicit known examples to fix
- game notification opens `/game-prep` without `eventId`
- schedule/payment/registration notifications open generic destinations without specific context
- `team-roster` / `roster` / `lineup-builder` / `attendance` / `game-recap` may be entered without required params

## Stop gate
STOP after Phase 3 and report:
- param contracts enforced
- deep links fixed
- routes still dependent on upstream warm context
- unresolved ambiguous route cases

---

# PHASE 4 — IDENTITY / LINKAGE COMPATIBILITY LAYER

## Objective
Stabilize parent/player linkage for beta WITHOUT doing a dangerous full schema migration in one pass.

## Important
Do NOT attempt a destructive database model rewrite in this phase.

Instead:
Create a compatibility layer / canonical resolver in app code so all major parent/player resolution paths use one shared interpretation for beta.

## Required targets
- `lib/permissions-context.tsx`
- `hooks/useParentHomeData.ts`
- `components/DashboardRouter.tsx`
- `components/GestureDrawer.tsx`
- `app/register/[seasonId].tsx`
- `lib/onboarding-router.ts`
- any shared utility/helper files needed for a canonical parent/player resolution helper

## Tasks
1. Identify one canonical application-level resolution order for beta
2. Centralize parent/player lookup into shared helper(s)
3. Make major parent/player entry screens consume the shared helper(s) instead of each rolling their own logic
4. Minimize surface-level behavior changes
5. Preserve backward compatibility with existing data where possible
6. Clearly document:
   - canonical path
   - legacy fallback path(s)
   - screens still not migrated

## Explicit non-goals
- no destructive schema migration
- no dropping tables/columns
- no mass data migration
- no cross-repo changes unless absolutely required

## Stop gate
STOP after Phase 4 and report:
- canonical resolver introduced
- screens migrated to it
- remaining legacy identity paths
- whether a future DB migration is still recommended after beta

---

# PHASE 5 — BETA UX SAFETY STATES

## Objective
Remove the “blank screen / maybe broken” feeling from the most important data-driven routes.

## Required targets (highest-priority screens first)
- `app/(tabs)/gameday.tsx`
- `app/team-roster.tsx`
- `app/roster.tsx`
- `app/players.tsx`
- `app/standings.tsx`
- `app/payment-reminders.tsx`
- `app/my-stats.tsx`
- `app/(tabs)/parent-schedule.tsx` if needed
- `app/(tabs)/coach-schedule.tsx` if needed
- `app/player-evaluations.tsx` if needed

## Tasks
1. Add explicit state handling where currently ambiguous:
   - loading
   - no data
   - missing context
   - unauthorized
   - error
2. Do not redesign visuals — use existing Lynx patterns/components where possible
3. Prioritize screens identified as dead-end/blank-state risks in UX audits
4. Add user feedback for high-value actions where trivial and safe:
   - RSVP
   - payment submission
   - approval
   - stat save
   - challenge join
   Only if this can be done without risky broad UI plumbing

## Explicit non-goals
- no full design-system pass
- no dashboard redesign
- no global toast architecture unless isolated and low-risk

## Stop gate
STOP after Phase 5 and report:
- screens improved
- states added
- screens still ambiguous
- any candidate for later full design pass

---

# PHASE 6 — DEFERRED / POST-BETA PARKING LOT

These are real issues but NOT part of the pre-beta stabilization pass unless explicitly instructed later:

- full duplicate screen consolidation
- chat screen unification
- schedule screen unification
- roster screen consolidation
- team-management consolidation
- route renaming cleanup
- visual consistency cleanup
- dashboard philosophy redesign
- full multi-org architecture cleanup
- destructive identity schema cleanup

Do not touch these during stabilization unless explicitly requested.

---

## Verification Requirements After Every Phase

After each phase, do ALL of the following:

1. List changed files
2. Explain exact root cause addressed
3. Explain what was deliberately not touched
4. Run relevant validation
   - typecheck if applicable
   - grep/search for remaining stale patterns if applicable
5. Propose manual QA checklist for that phase only

---

## Success Definition For Pre-Beta Stabilization

The stabilization pass is considered successful when:

1. Build validation is trustworthy
2. Logout clears stale context
3. Sensitive routes and sensitive data hooks are guarded
4. Parameter-dependent screens no longer open “empty but technically loaded”
5. Parent/player linkage behaves consistently across main parent flows
6. Highest-risk blank/ambiguous screens have explicit safety states

That is sufficient for a controlled private beta.

It is NOT the same thing as full product cleanup.