GPT TRUE-STATE AUDIT SPEC — Lynx Mobile
Purpose

This audit is diagnosis-only. It is not a fix spec.

The goal is to produce a true-state picture of the app before TestFlight / beta distribution:

what each route actually opens

what each CTA/button actually does

what data each screen reads and writes

which role(s) can see each screen

which season/team/sport context each screen depends on

where multiple sources of truth exist

where UI says one thing but code/database says another

which issues are cosmetic, functional, security, or release-blocking

This audit must behave like a forensic systems review, not a cleanup sprint.

Non-Negotiable Rules

Do not change code.

Do not create commits.

Do not delete legacy files.

Do not refactor.

Do not produce “looks connected / good” summaries.

Every finding must include evidence: file, route, hook, query, or handler.

If something cannot be proven, mark it UNVERIFIED instead of guessing.

Follow the user journey all the way through.

Separate facts vs assumptions.

This is a release-readiness audit, not a feature brainstorming session.

What This Audit Must Produce

Create these files in the repo root:

TRUE-STATE-EXECUTIVE-SUMMARY.md
TRUE-STATE-ROUTE-MATRIX.md
TRUE-STATE-DATA-FLOW-MATRIX.md
TRUE-STATE-ROLE-ACCESS-MATRIX.md
TRUE-STATE-CONTEXT-STATE-MATRIX.md
TRUE-STATE-DRIFT-REGISTER.md
TRUE-STATE-BETA-RISK-REGISTER.md
TRUE-STATE-AUDIT-FINAL.md
Phase 1 — Route + Screen Inventory

Build a full inventory of screens and routes.

For every route:

route path

file path

screen purpose

primary user roles

entry points (what can navigate here)

params expected

data sources read

writes/mutations performed

empty state behavior

fallback navigation behavior

Also classify each route domain:

auth

role switching

registration

team management

roster

evaluations

team hub

schedule

payments

admin

profile

media

challenges

achievements

Flag:

duplicate screens

redirect wrappers

unreachable routes

placeholder screens

routes that silently redirect to other pages

Phase 2 — Interaction Wiring Audit

This is where most audits fail.

Trace every interaction.

Examples:

buttons

cards

quick actions

list row taps

notification taps

hero CTAs

tab switches

floating action buttons

action sheets

For each interaction document:

source screen

UI label

handler file

handler function

navigation call

destination route

destination file

params passed

data expected on the destination

role assumptions

season/team assumptions

Example of acceptable output:

Bad audit output:

"Stats button is connected"

Good audit output:

CoachHomeScroll → "2 games need stats"
Handler: openGameRecap()
Navigation: router.push('/game-recap')
Params: none
Destination file: app/game-recap.tsx
Required param: eventId

Result:
Game recap screen expects eventId.
None passed → likely shows "Game not found".
Phase 3 — Data Flow Audit

Trace the real data flow.

Audit these domains:

Auth bootstrap

Profile loading

Organization loading

Role switching

Season selection

Sport selection

Team resolution

Parent-child linkage

Coach-team linkage

Registration

Team creation/editing

Evaluations

Team hub feed

Schedule / game day

Stats / game recap

Payments

Notifications

Media upload

For each feature record:

source trigger

hook used

service/helper used

Supabase query

tables touched

columns used

filters applied

role checks

drift risks

alternate logic paths elsewhere

Example drift pattern to detect:

Screen A resolves coach team via team_staff
Screen B resolves coach team via team_coaches
Screen C resolves via cached context

Document every conflict.

Phase 4 — Role Access Audit

Build a role-to-screen matrix.

Roles:

admin

league_admin

coach

head_coach

assistant_coach

parent

player

multi-role switching

For each screen:

should role see it?

can role currently see it?

how is access enforced?

Types:

menu restriction

route guard

screen guard

query filtering

not enforced

Also test:

direct URL entry

deep links

multi-role switching effects

Especially check whether season context leaks across roles.

Phase 5 — Context State Audit

Map sources of truth for:

current role

organization

season

sport

team

player

parent-child context

For each state concept document:

where it lives

who writes to it

who reads it

persistence layer

Possible layers:

React state

Context provider

AsyncStorage

navigation params

derived query

Also record:

reset behavior

cross-role leakage risk

impacted screens

Explicit task:

Find screens using:

global selected season

local season state

team-derived season

org default season

without coordination.

Phase 6 — Vocabulary + Domain Drift Audit

Perform narrow vocabulary audits like the team_type fix.

Audit:

role names

season status values

team type values

event types

registration statuses

payment statuses

attendance statuses

evaluation statuses

notification types

parent/guardian terminology

For each domain document:

DB truth (if visible)

values written

values read

values displayed

conditional logic dependent on values

stale variants

Phase 7 — Beta Risk Register

Classify findings by severity.

Severity:

P0 – Release blocker
P1 – High risk
P2 – Medium
P3 – Low

Types:

permission leak

wrong-user data

wrong-route

empty state bug

stale context

vocabulary drift

schema mismatch

UI inconsistency

placeholder screen

backend dependency

For each issue document:

title

symptom

root cause hypothesis

evidence

impacted roles

impacted screens

risk level

recommended action

Phase 8 — Executive Summary

Produce a leadership summary answering:

Is the app ready for beta?

What works well?

What are the release blockers?

What bugs hurt trust most?

Any permission/security risks?

Multi-role context issues?

What can wait until after beta?

Recommended fix order

Include:

audit confidence rating

proven vs inferred issues

areas requiring manual QA

Deliverable Formats
TRUE-STATE-EXECUTIVE-SUMMARY.md

Leadership-friendly overview.

TRUE-STATE-ROUTE-MATRIX.md

All routes and entry points.

TRUE-STATE-DATA-FLOW-MATRIX.md

Feature data paths.

TRUE-STATE-ROLE-ACCESS-MATRIX.md

Role permissions.

TRUE-STATE-CONTEXT-STATE-MATRIX.md

Global state ownership.

TRUE-STATE-DRIFT-REGISTER.md

Vocabulary drift issues.

TRUE-STATE-BETA-RISK-REGISTER.md

Prioritized bug list.

TRUE-STATE-AUDIT-FINAL.md

Master report + fix order.

Commands the Model May Use

Allowed:

search repo

trace imports

trace router.push

inspect hooks and services

inspect Supabase queries

grep vocabulary

inspect navigation handlers

Not allowed:

change code

delete files

auto-fix

assume wiring is correct without proof

Final Instruction to the Auditing Model

Act as a principal engineer + QA lead + product systems analyst.

Do not produce shallow summaries.

Do not recommend refactors.

Do not fix anything.

Your job is to produce an evidence-based true-state map of the system so we can determine:

what is working

what is broken

what is risky

what must be fixed before release

This is an audit, not a repair.