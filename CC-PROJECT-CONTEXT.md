# CC-PROJECT-CONTEXT.md
## Claude Code — Project Context

This document provides system architecture context so Claude Code can reason about the project correctly.

Claude should consult this document before performing:

- Debugging
- Architectural changes
- Database queries
- Permission changes
- Routing changes
- Feature implementations

This prevents incorrect assumptions about the system.

---

## Application Overview

This application is a mobile-first youth sports management platform built with:

- React Native (Expo)
- Supabase (Postgres + Auth + Realtime)
- TypeScript

Primary domains:

- Teams
- Players
- Parents
- Coaches
- Schedules
- Evaluations
- Challenges
- Messaging / Chat
- Notifications

The system supports multiple user roles and identity relationships.

---

## Primary Architecture Principles

The app follows these rules:

**1. Read compatibility first**
When evolving data models, read paths must remain compatible. Compatibility layers are preferred over destructive migrations.

**2. Minimal blast radius changes**
Bug fixes should modify the fewest files possible.

**3. Defensive UI states**
Every screen should support: loading, empty, error, missing context. Infinite loading states must be avoided.

**4. Runtime safety**
All async code should guard against: component unmount, Supabase errors, null parameters.

---

## Role System

Users may have multiple roles.

| Role | Description |
|------|-------------|
| Admin | Organization administrator |
| Coach | Team coach |
| Parent | Parent monitoring players |
| Player | Player profile owner |

A user may be both coach + parent. Permissions must be evaluated accordingly.

---

## Identity Model

Players may be linked to parents through multiple mechanisms due to historical schema evolution.

Current resolver checks four sources:

1. `player_guardians`
2. `players.parent_account_id`
3. `player_parents`
4. `players.parent_email`

These are merged and deduplicated.

**Resolver file:** `lib/resolve-linked-players.ts`

This file is the canonical source for parent/player linkage. Other parts of the code should avoid recreating custom logic.

---

## Player Ownership Rules

A parent can access a player if **any** of the following are true:

- Guardian relationship exists
- `parent_account_id` matches
- `player_parents` relationship exists
- `parent_email` matches an unclaimed player

Access control checks must confirm actual ownership, not just role.

---

## Team Membership Model

Players participate in teams. Access to team-related data must confirm:

- The player is on the team, **or**
- The parent is linked to that player, **or**
- The user is the team's coach, **or**
- The user is an admin

Do not grant access based on global role alone.

---

## Challenge System

Challenges belong to a team.

**Challenge access rules — allowed if:**

- Admin
- Team coach
- Player on the team
- Parent linked to a player on the team

Players should not see challenges from unrelated teams.

---

## Notifications System

Notifications are stored in a `notifications` table.

| Column | Purpose |
|--------|---------|
| `type` | Notification type |
| `data` | JSON payload |
| `event_id` | Optional event reference |

Some push notifications originate from database cron RPCs, some from client-side inserts.

Push edge function forwards: `notification.data`, `notification.type`, `notification_id`

The push system should ideally also include: `event_id`

---

## Chat System

Team chat channels connect players, parents, and coaches.

**Chat setup utilities:** `lib/chat-utils.ts`

Key constraints:
- Avoid duplicate channel inserts
- Protect insert operations with error handling
- Avoid N+1 query patterns when loading channels

---

## Evaluation System

Coaches evaluate players.

**File:** `lib/evaluations.ts`

Evaluations include: skill ratings, evaluation history, derived player skill summaries.

Mutation operations must:
- Check Supabase errors
- Avoid silently losing data

Evaluation saves return: `{ success: boolean, error?: string }`

Callers must verify success.

---

## Async Safety Rules

Async operations must protect against:

**1. Component unmount — use cancellation guards:**
```ts
let cancelled = false
// ...
if (cancelled) return
```

**2. Supabase errors — always destructure and check:**
```ts
const { data, error } = await supabase.from('table').select('*')
if (error) {
  console.error(error)
  return fallback
}
```

**3. Router params — always type as optional and guard:**
```ts
const { id } = useLocalSearchParams<{ id?: string }>()
if (!id) return <MissingParamState />
```

---

## Navigation Model

The app uses Expo Router.

Key routes include:
- `/(tabs)`
- `/auth`
- `/game-prep`
- `/player-evaluations`
- `/chat/[id]`
- `/child-detail`

Route parameters must always be typed as optional: `{ id?: string }`

Screens must guard against missing parameters.

---

## UX Safety Rules

Every screen should support:

| State | Requirement |
|-------|-------------|
| Loading | Spinner or skeleton |
| Empty | Friendly empty state |
| Error | Retry option |
| Missing context | Explanation and exit option |

Never trap the user in an infinite spinner.

---

## Supabase Usage Rules

**Correct pattern:**
```ts
const { data, error } = await supabase
  .from('table')
  .select('*')

if (error) {
  console.error(error)
  return fallback
}
```

**Avoid:**
```ts
const { data } = await supabase... // without checking error
```

---

## AsyncStorage Rules

Values retrieved from AsyncStorage must be protected:

```ts
try {
  const value = JSON.parse(raw)
} catch {
  value = null
}
```

Never trust stored JSON.

---

## Performance Considerations

**Avoid:**
- N+1 Supabase queries
- Repeated database calls inside loops
- Heavy effects triggered on every render

**Prefer:**
- Batched queries
- Caching where appropriate
- Stable dependency arrays

---

## Stabilization Phases Completed

The project has undergone structured stabilization phases:

| Phase | Focus |
|-------|-------|
| 0 | Tooling — TypeScript config cleanup |
| 1 | Session hygiene — AsyncStorage cleared on logout |
| 2 | Permission guards on sensitive screens |
| 3 | Navigation parameter safety |
| 3.1 | Notification routing fixes |
| 4 | Identity compatibility layer (`resolve-linked-players.ts`) |
| 4.1 | Email linkage verification |
| 5 | UX safety states on 6+ screens |
| 6 | Runtime safety hardening |
| 6.1 | High-severity runtime fixes (try/catch, unmount guards) |

Future work should respect these systems and not revert or bypass these patterns.

---

## Schema Note

`teams.organization_id` does **not** exist.

The correct path to an organization from a team is: `teams → seasons → organization_id`

This is a known footgun. Do not query `teams.organization_id` directly.

---

## Final Guidance for Claude Code

When making changes:

1. Identify the smallest fix
2. Limit the blast radius
3. Preserve compatibility
4. Avoid architectural drift
5. Stop after completing the requested phase

Claude should always follow `CC-LYNX-RULES.md` and `CC-PROMPT-TEMPLATES.md` included in this repository.
