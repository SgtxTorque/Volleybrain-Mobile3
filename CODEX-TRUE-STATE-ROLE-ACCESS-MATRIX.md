# CODEX TRUE-STATE ROLE ACCESS MATRIX

## Admin / League Admin

- Visible screens:
  - `/(tabs)/manage`, `/registration-hub`, `/users`, `/team-management`, `/season-settings`, `/season-setup-wizard`, `/(tabs)/payments`, reports, org tools
- Access enforcement:
  - tab visibility
  - drawer section gating
  - occasional screen-level checks
- Direct route entry:
  - many standalone admin screens do not show explicit route guards
- Leak risk:
  - medium to high
- Classification: `PARTIALLY CONFIRMED`

## Coach / Head Coach / Assistant Coach

- Visible screens:
  - coach home, coach schedule/chat/team hub/my-stuff, roster, evaluations, game-day, challenges
- Access enforcement:
  - tab visibility
  - drawer gating
  - query filtering by team linkage
- Drift:
  - coach team linkage is resolved differently in multiple screens
- Classification: `CONFIRMED`

## Parent

- Visible screens:
  - parent dashboard, parent schedule/chat/team hub/my-stuff, child detail, waivers, family payments, registration hub
- Access enforcement:
  - tab visibility
  - dashboard routing
  - query filtering via multiple parent-child lookup methods
- Leak/confusion risk:
  - high for mixed-linkage families
- Classification: `CONFIRMED`

## Player

- Visible screens:
  - player dashboard, stats, challenges, achievements, standings, schedule, team hub
- Access enforcement:
  - dashboard routing
  - drawer role sections
  - player lookup queries
- Drift:
  - player identity uses `parent_account_id` in many places but `profile_id` in at least one active screen
- Classification: `CONFIRMED`

## Multi-Role Users / viewAs

- Visible menu sections:
  - yes, based on current `viewAs`
- Landing home screen:
  - yes, dashboard router reacts to `viewAs`
- Season context:
  - not explicitly reset on role switch
- Sport context:
  - not explicitly reset on role switch
- Selected team:
  - not explicitly reset on role switch; stored independently in AsyncStorage
- Downstream queries:
  - partially role-reactive, partially context-stale
- Classification: `CONFIRMED`

## Sensitive Screen Guard Summary

- `/users`
  - Menu restriction: yes
  - Route guard in screen: not evident
  - Leak risk: high
  - Classification: `CONFIRMED`

- `/registration-hub`
  - Menu restriction: yes
  - Route guard in screen: not evident
  - Classification: `PARTIALLY CONFIRMED`

- `/team-management`
  - Menu restriction: yes
  - Route guard in screen: not evident
  - Classification: `PARTIALLY CONFIRMED`

- `/season-settings`
  - Menu restriction: yes
  - Route guard in screen: not evident
  - Classification: `PARTIALLY CONFIRMED`

- `/payment-reminders`
  - Menu restriction: yes
  - Route guard in screen: not evident
  - Classification: `PARTIALLY CONFIRMED`

## Negative Finding

- Claim: “Sensitive admin screens are fully protected by route guards.”
  - Evidence from app code does not support that claim.
  - Classification: `NOT CONFIRMED`

## Backend Caveat

- Supabase RLS may still prevent some direct-route abuse.
- That cannot be proven from the mobile code alone.
- Classification: `UNVERIFIED`
