# CODEX SECOND-OPINION TRUE-STATE AUDIT SPEC — Lynx Mobile

## Purpose

This is a **second-opinion forensic audit** of the Lynx Mobile app.

This audit exists to independently validate, challenge, or expand upon a prior audit done by another model.

This is **diagnosis-only**. It is not a fix spec.

The goal is to produce a true-state picture of the app before TestFlight / beta distribution:

- what each route actually opens
- what each CTA/button actually does
- what data each screen reads and writes
- which role(s) can see each screen
- which season/team/sport context each screen depends on
- where multiple sources of truth exist
- where UI says one thing but code/database says another
- which issues are cosmetic, functional, security, or release-blocking

This audit must behave like a **forensic systems review**, not a cleanup sprint.

---

## Independence Rules

1. Do **not** rely on any prior generated audit conclusions unless explicitly asked to compare later.
2. Treat this as an independent review of the codebase.
3. If prior audit files exist, ignore them unless specifically instructed to compare.
4. Every finding must be based on code evidence.
5. If something cannot be proven, mark it **UNVERIFIED**.
6. Do not try to be polite or agreeable with prior findings. Confirm only what can be supported.
7. For each major finding, classify it as:
   - **CONFIRMED**
   - **PARTIALLY CONFIRMED**
   - **NOT CONFIRMED**
   - **NEW FINDING**

---

## Non-Negotiable Rules

1. **Do not change code.**
2. **Do not create commits.**
3. **Do not delete files.**
4. **Do not refactor.**
5. **Do not produce “looks connected / good” summaries.**
6. **Every finding must include evidence: file, route, hook, query, handler, or state source.**
7. **Follow the user journey all the way through.**
8. Separate **facts vs assumptions**.
9. This is a **release-readiness audit**, not a feature brainstorm.
10. Do not create fix files or implementation plans unless specifically requested later.

---

## Required Output Files

Create these files in the repo root:

1. `CODEX-TRUE-STATE-EXECUTIVE-SUMMARY.md`
2. `CODEX-TRUE-STATE-ROUTE-MATRIX.md`
3. `CODEX-TRUE-STATE-DATA-FLOW-MATRIX.md`
4. `CODEX-TRUE-STATE-ROLE-ACCESS-MATRIX.md`
5. `CODEX-TRUE-STATE-CONTEXT-STATE-MATRIX.md`
6. `CODEX-TRUE-STATE-DRIFT-REGISTER.md`
7. `CODEX-TRUE-STATE-BETA-RISK-REGISTER.md`
8. `CODEX-TRUE-STATE-AUDIT-FINAL.md`

---

## Phase 1 — Route + Screen Inventory

Build a full inventory of screens and routes.

For every route:

- route path
- file path
- screen purpose
- primary user roles
- entry points (what can navigate here)
- params expected
- data sources read
- writes/mutations performed
- empty state behavior
- fallback navigation behavior

Classify each route domain:

- auth
- role switching
- registration
- team management
- roster
- evaluations
- team hub
- schedule
- payments
- admin
- profile
- media
- challenges
- achievements

Flag:

- duplicate screens
- redirect wrappers
- unreachable routes
- placeholder screens
- routes that silently redirect to other pages

---

## Phase 2 — Interaction Wiring Audit

Trace major interactions end-to-end.

Examples:

- buttons
- cards
- quick actions
- list row taps
- notification taps
- hero CTAs
- tab switches
- floating action buttons
- action sheets

For each interaction document:

- source screen
- UI label
- handler file
- handler function
- navigation call
- destination route
- destination file
- params passed
- data expected on destination
- role assumptions
- season/team/sport assumptions
- whether the destination actually matches the likely user expectation

Do not say:
- “connected”
- “good”
- “works”

Say things like:
- “CoachHomeScroll ‘2 games need stats’ routes to `/game-recap` without `eventId`; destination expects `eventId`; likely result is `Game not found`.”
- “Team Hub preview shows feed data from query X, but CTA routes to screen Y which expects team context Z.”

---

## Phase 3 — Data Flow Audit

Trace the real data flow for these domains:

- Auth bootstrap
- Profile loading
- Organization loading
- Role switching
- Season selection
- Sport selection
- Team resolution
- Parent-child linkage
- Coach-team linkage
- Registration
- Team creation/editing
- Evaluations
- Team hub feed
- Schedule / game day
- Stats / game recap
- Payments
- Notifications
- Media upload

For each feature record:

- source trigger
- hook used
- service/helper used
- direct Supabase query locations
- tables touched
- columns used
- filters applied
- role checks
- drift risks
- alternate logic paths elsewhere

Explicitly search for drift such as:
- one screen resolves coach team via `team_staff`
- another via `team_coaches`
- another via cached context
- one screen uses `player_guardians`
- another uses `parent_account_id`
- another uses `parent_email`

Document every conflict.

---

## Phase 4 — Role Access Audit

Build a role-to-screen and role-to-action matrix.

Roles:

- admin
- league_admin
- coach
- head_coach
- assistant_coach
- parent
- player
- multi-role users switching via “viewAs”

For each screen/action answer:

- should this role see it?
- can this role currently see it?
- how is access enforced?
  - menu restriction
  - tab visibility
  - route guard
  - screen guard
  - query filtering
  - not enforced
- what happens if route is entered directly?
- is there a leak risk?

Special requirement:
For multi-role users, document whether role switching affects:

- visible menu sections
- landing home screen
- season context
- sport context
- selected team
- downstream queries

---

## Phase 5 — Context State Audit

Map sources of truth for:

- current role
- current organization
- current season
- current sport
- current team
- current player
- parent-child context

For each state concept document:

- where it lives
- who writes it
- who reads it
- persistence layer
  - React state
  - Context
  - AsyncStorage
  - params
  - derived query
- reset behavior
- cross-role leakage risk
- impacted screens if stale

Explicit task:
Find screens using:
- global selected season
- local season state
- team-derived season
- org default season

without coordination.

---

## Phase 6 — Vocabulary + Domain Drift Audit

Perform narrow vocabulary audits like the prior `team_type` issue, but independently.

Audit at minimum:

- role names
- season status values
- team type values
- event type values
- registration status values
- payment status values
- attendance status values
- evaluation status values
- notification type values
- parent/guardian/family terminology

For each domain document:

- DB truth if visible in code
- values written
- values read
- values displayed
- conditional logic depending on values
- stale or conflicting variants
- risk level

---

## Phase 7 — Beta Risk Register

Classify findings into:

### Severity
- P0 — Release blocker
- P1 — High risk
- P2 — Medium
- P3 — Low

### Type
- security / permission leak
- wrong-user-data
- wrong-screen / wrong-route
- empty state / false empty state
- stale context / cross-role leakage
- data drift / vocabulary drift
- schema mismatch
- visual inconsistency
- placeholder / dead-end
- backend / infra dependency
- performance
- likely false positive / needs manual proof

For every issue include:

- title
- symptom
- root cause hypothesis
- evidence
- impacted roles
- impacted screens
- release risk
- recommended next action
- “fix before beta” vs “defer” recommendation
- classification:
  - CONFIRMED
  - PARTIALLY CONFIRMED
  - NOT CONFIRMED
  - NEW FINDING

---

## Phase 8 — Executive Summary

Produce a leadership summary that answers:

1. Is the app ready for beta?
2. What works well?
3. What are the release blockers?
4. What are the top trust-damaging bugs?
5. What are the top security / permission risks?
6. What are the top multi-role / season-context risks?
7. What can wait until after beta?
8. What is the recommended order of attack?

Also include:

- confidence rating for the audit
- what was proven vs inferred
- what still requires manual QA
- where this audit agrees or disagrees with a typical prior audit, if inferable from code patterns alone

---

## Deliverable Format Guidance

### `CODEX-TRUE-STATE-EXECUTIVE-SUMMARY.md`
Leadership-friendly, concise, readable.

### `CODEX-TRUE-STATE-ROUTE-MATRIX.md`
One section per route:
- route
- file
- entry points
- params
- actual destination behavior
- notes

### `CODEX-TRUE-STATE-DATA-FLOW-MATRIX.md`
One section per feature:
- trigger
- hook/service/query path
- tables/fields
- writes
- drift points
- failure points

### `CODEX-TRUE-STATE-ROLE-ACCESS-MATRIX.md`
One section per role:
- visible screens
- sensitive screens
- route guard status
- leak/confusion risk

### `CODEX-TRUE-STATE-CONTEXT-STATE-MATRIX.md`
One section per state concept:
- source of truth
- writers
- readers
- persistence
- reset behavior
- leakage risk

### `CODEX-TRUE-STATE-DRIFT-REGISTER.md`
Grouped by domain:
- canonical value set
- stale values
- affected files
- risk

### `CODEX-TRUE-STATE-BETA-RISK-REGISTER.md`
Prioritized risk list:
- severity
- type
- evidence
- recommendation
- confidence

### `CODEX-TRUE-STATE-AUDIT-FINAL.md`
Master rollup:
- top 25 findings
- most important disagreements or new findings
- proposed attack order
- unresolved unknowns

---

## Allowed Methods

You may:
- search the repo
- trace imports
- trace router.push / href / navigation.navigate / redirects
- inspect hooks, contexts, and helper utilities
- inspect direct Supabase queries in screens and hooks
- grep duplicated vocabulary
- grep route handlers
- inspect fallback navigation patterns

You may NOT:
- change production code
- delete files
- auto-fix
- silently assume a route is correct because a file exists

---

## Final Instruction to the Auditing Model

Act like a principal engineer, QA lead, and product systems analyst performing an independent second-opinion audit.

Do not produce a shallow summary.
Do not default to agreeing with prior work.
Do not turn this into a cleanup plan.
Do not fix anything.

Your job is to produce an evidence-based true-state map of the system so leadership can decide:

- what is release-ready
- what is risky
- what is drift
- what must be fixed first
- what prior findings should be trusted

This is an audit, not a repair.