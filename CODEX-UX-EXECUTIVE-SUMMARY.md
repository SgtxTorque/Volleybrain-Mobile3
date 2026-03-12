# CODEX UX EXECUTIVE SUMMARY

## What The Product Actually Feels Like In Code

Lynx Mobile behaves like a multi-role sports operations app with four overlapping UX modes:

- admin operations
- coach operations
- parent/family operations
- player/achievement/challenge operations

The app does not behave like a single coherent flow. It behaves like several parallel products sharing one route tree and one Supabase backend. The code implies a real product, but the UX is shaped by **state drift**, **role drift**, and **navigation drift** more than by visual design.

## Core UX Truths

- Home is not one home. `components/DashboardRouter.tsx` chooses a dashboard based on role flags and extra database heuristics.
- Navigation is not purely route-driven. It depends on role override state, season state, team state, selected child state, and sometimes AsyncStorage.
- The same conceptual object is often resolved differently in different screens:
  - child/player
  - current team
  - current season
  - current role
- The user can reach some screens that make sense only when params or context already exist.

## Best Parts Of The Current UX

- The app has strong feature coverage.
- The parent and coach surfaces have enough screens and query depth to feel like a functioning product.
- Registration, schedule, chat, team hub, notifications, and payments are all wired end-to-end.
- The drawer creates a broad app-navigation surface for multi-role users.

## Primary UX Problems

1. **Too many invisible dependencies**
   - Screens often need team, season, player, or role context that is not obvious from the route.

2. **Same task can start from multiple places but land in slightly different logic**
   - Team management
   - Team hub
   - Schedule
   - Registration

3. **Role switching changes the shell faster than it changes downstream context**
   - Tabs and dashboard switch immediately
   - team/season/child context does not clearly reset with the role

4. **Many screens are technically reachable but ergonomically fragile**
   - missing params
   - stale context
   - empty states that are structurally correct but confusing

## Highest UX Risks

- wrong team shown after role or season changes
- wrong child or incomplete child list depending on linkage method
- route opens but lacks required params
- admin sees misleading cross-org user data
- placeholder screens exposed as if they are real features

## UX Readiness Verdict

The app is **not UX-stable enough for a wide beta**. It is functionally rich, but the implied user experience is highly context-sensitive and likely to generate “it opened, but it wasn’t the right thing” feedback rather than clean product feedback.
