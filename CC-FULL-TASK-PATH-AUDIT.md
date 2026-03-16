# CC-FULL-TASK-PATH-AUDIT.md
# Lynx Mobile — Complete Navigation, Task-Path & Screen Glossary Audit
## DISCOVERY AND DOCUMENTATION ONLY — NO CODE CHANGES

---

## PURPOSE

This spec produces a complete forensic audit of every screen, every task, and every navigation path in the Lynx mobile app. The output is a set of reference documents that map how the app actually behaves today — not how it should behave, not how a spec says it behaves, but what the code actually does when a user taps through it.

This is the foundation for a future cleanup, consolidation, and friction-reduction effort. That effort is NOT part of this spec.

---

## ABSOLUTE RULES — READ BEFORE DOING ANYTHING

### YOU MUST NOT:

1. **Modify any production code.** No `.tsx`, `.ts`, `.js`, `.jsx`, `.json`, or config files. Zero changes. Not even whitespace. Not even comments. If you feel the urge to "fix something while you're in there" — stop. That is not your job right now.

2. **Rename, move, delete, or reorganize any files.** The file structure stays exactly as it is. You are an observer, not an editor.

3. **Create or modify any CC spec files.** Do not write fix specs, consolidation plans, or refactor proposals. Those come later, from a human, after reading your audit.

4. **Suggest code changes inside the audit documents.** You may flag issues, note friction, and describe what's wrong — but you must NOT include code snippets, patches, or "here's how to fix it" suggestions. The audit says WHAT is broken, not HOW to fix it.

5. **Run any build, lint, or test commands.** No `tsc`, no `expo`, no `npm`. Read-only access to the codebase. You are reading files, tracing imports, and following `router.push()` calls — nothing else.

6. **Change the drawer, navigation, routes, or any app behavior.** This cannot be stated enough. DISCOVERY ONLY.

7. **Create any files outside of the audit output documents.** Your only output is the markdown documents described below. No helper scripts, no temp files, no "quick utils."

### YOU MUST:

1. **Read CC-LYNX-RULES.md and AGENTS.md first** before beginning any work.

2. **Read SCHEMA_REFERENCE.csv** to understand the database schema context.

3. **Trace actual code paths.** Do not guess. Do not assume. Open the file, find the `router.push()` or `router.replace()` call, read the line number, follow it to the destination screen. Verify the route string matches an actual file in `app/`. If a route passes params, verify the destination screen reads those params.

4. **Document every finding with file path and line number.** Every claim must be verifiable by a human opening that file and going to that line.

5. **Be honest about what you cannot determine.** If a path depends on runtime state you can't trace statically (e.g., "this only fires if the user has 2+ children"), say so. Do not fabricate certainty.

6. **Complete every role, every task, every screen.** Do not stop early. Do not skip screens that seem unimportant. Do not summarize groups of screens as "similar." Each screen gets its own entry.

---

## PREPARATION — DO THIS FIRST

Before writing any audit content, build your mental model:

1. Read `components/GestureDrawer.tsx` — specifically the `MENU_SECTIONS` array. This is the master navigation menu. Map every item, its route, and its `roleGate`.

2. Read `app/(tabs)/_layout.tsx` — understand the tab bar structure, which tabs are visible vs hidden (`href: null`), and any role-conditional tab rendering.

3. Read `components/DashboardRouter.tsx` — understand how the home screen resolves per role.

4. Read the four home scroll components to understand what cards/links each role's home dashboard offers:
   - `components/PlayerHomeScroll.tsx`
   - `components/ParentHomeScroll.tsx`
   - `components/coach-scroll/` (all files)
   - `components/admin-scroll/` (all files)

5. Read `app/_layout.tsx` — understand notification deep link routing.

6. Skim every file in `app/` and `app/(tabs)/` to build a complete screen inventory.

---

## OUTPUT DOCUMENTS

You will create exactly **5 markdown documents** in the repo root. Do not create them anywhere else.

### Document 1: `AUDIT-GLOSSARY.md`
### Document 2: `AUDIT-PARENT-JOURNEYS.md`
### Document 3: `AUDIT-COACH-JOURNEYS.md`
### Document 4: `AUDIT-ADMIN-JOURNEYS.md`
### Document 5: `AUDIT-PLAYER-JOURNEYS.md`

---

## DOCUMENT 1: AUDIT-GLOSSARY.md — Screen & File Glossary

This is the reference companion to the four journey documents. When a journey document says "lands on `app/game-results.tsx`", a human should be able to look up that file in the glossary and understand exactly what that screen is, what it does, what params it expects, and what other screens do similar things.

### Structure

```markdown
# LYNX MOBILE — SCREEN & FILE GLOSSARY
## Audit Date: [date]
## Scope: Every screen file in app/, app/(tabs)/, and significant components

---

## How To Read This Document

This glossary is organized alphabetically by file path. Each entry describes what the screen does, what route params it expects, what role(s) it serves, and any related/overlapping screens. Use this alongside the role journey documents (AUDIT-PARENT-JOURNEYS.md, etc.) to understand what each screen in a path actually is.

---

## Screen Entries

### `app/(tabs)/chats.tsx`
- **Screen name shown to user:** "Chat" (tab bar title)
- **Route:** `/(tabs)/chats`
- **Purpose:** Generic chat channel list. Shows all channels the user is a member of. Allows creating DMs and group channels.
- **Required params:** None
- **Optional params:** None
- **Role visibility:** All roles (this is the tab bar chat — every role lands here)
- **Key navigation outbound:**
  - Tap channel row → `/chat/[id]` (line 504)
  - Create DM → `/chat/[id]` (line 324)
  - Create channel → `/chat/[id]` (line 370)
- **Overlapping/related screens:**
  - `app/(tabs)/coach-chat.tsx` — Coach-specific chat list with expanded FAB (Blast, Channel, DM). 1,100 lines. Has features this screen lacks.
  - `app/(tabs)/parent-chat.tsx` — Parent-specific chat list. 931 lines. Has N+1 query bug not present in coach version.
  - `app/(tabs)/admin-chat.tsx` — 2-line re-export of coach-chat.tsx.
- **Supabase tables touched:**
  - READS: `chat_channels` (channel list), `chat_channel_members` (membership filter), `chat_messages` (last message preview + unread count), `profiles` (sender names, user search for DM creation)
  - WRITES: `chat_channels` (create new channel), `chat_channel_members` (add members on channel/DM creation)
  - Note which queries use `.eq()` filters for team/org scoping vs fetching broadly
- **Identity notes:** This is the GENERIC chat list. The role-specific versions exist as hidden tabs but may not be reachable via normal navigation. See journey documents for entry-point analysis.
- **Lines of code:** 767

### `app/(tabs)/coach-chat.tsx`
- **Screen name shown to user:** (hidden tab — no visible title unless navigated to)
- **Route:** `/(tabs)/coach-chat`
... [continue for every screen file]
```

### What to include for each screen:

| Field | Description |
|-------|-------------|
| **Screen name shown to user** | The title/header text the user actually sees on screen. If none, say "No visible title" or "Inherits from tab bar." |
| **Route** | The exact route string used to navigate here |
| **Purpose** | 1-2 sentences. What does this screen DO? What task does it serve? |
| **Required params** | Route params that MUST be present for the screen to function. Note what happens if they're missing (spinner? crash? empty state? fallback?) |
| **Optional params** | Route params that change behavior but aren't required |
| **Role visibility** | Which roles can/should see this screen. Note if it's menu-hidden vs route-guarded. |
| **Key navigation outbound** | Every `router.push()`, `router.replace()`, or `Link` from this screen, with destination and line number |
| **Supabase tables touched** | Every table this screen READS from and WRITES to. List them separately (READS vs WRITES). Include the purpose of each query (e.g., "channel list", "membership check"). Note which column is used for scoping/filtering (e.g., `.eq('team_id', X)` vs `.eq('organization_id', X)` vs no filter). Flag any screen that fetches broadly without org/team scoping. Cross-reference SCHEMA_REFERENCE.csv for column accuracy. |
| **Overlapping/related screens** | Other screens that do similar or overlapping things. This is critical for identifying consolidation candidates later. |
| **Identity notes** | Any naming confusion, duplicate purpose, or "this is the X version vs the Y version" context. |
| **Lines of code** | Total line count of the file |

### Important glossary rules:

- **Include EVERY file in `app/` and `app/(tabs)/`.** Even 2-line re-exports. Even placeholder screens. Even screens you think are dead. Document them all.

- **Include significant component screens** that function as full-page views but live in `components/` (e.g., `TeamHubScreen.tsx`, `ParentHomeScroll.tsx`, `CoachHomeScroll`, etc.). These are effectively screens that get rendered inside tab containers.

- **Group related/overlapping screens together** with cross-references. When you encounter a cluster of screens that do similar things (the 4 chat screens, the 5 schedule screens, the 4 roster screens, etc.), make sure each entry points to the others.

- **Note the "what users call it vs what the file is called" problem.** If parents think of "player cards" but the screen is `child-detail.tsx`, say that. If coaches say "game recap" but there are two screens (`game-results.tsx` and `game-recap.tsx`), explain the difference.

- **Be thorough on Supabase table documentation.** This is how we catch data drift — when two screens show the same conceptual data but pull from different tables or use different join paths. For example, if `child-detail.tsx` resolves the parent-child link via `player_guardians` but `player-card.tsx` resolves it via `players.parent_account_id`, that's a drift finding. Document every `supabase.from('table_name')` call you find, what `.select()` columns it pulls, and what `.eq()` / `.in()` filters scope it. If a hook (e.g., `useParentHomeData.ts`) does the fetching instead of the screen itself, document the tables in the hook AND note in the screen entry "Data fetched via `useParentHomeData.ts` — see hook for table details."

---

## DOCUMENTS 2-5: Role Journey Audits

Each role gets its own document. The structure is identical across all four.

### Structure

```markdown
# LYNX MOBILE — [ROLE] JOURNEY & TASK-PATH AUDIT
## Audit Date: [date]
## Role: [Parent / Coach / Admin / Player]

---

## How To Read This Document

Each task below shows every way a [role] user can reach a destination or complete an action. Paths are listed from most natural/common to most obscure. Each step shows the screen, the action, the code file and line number, and the destination. Flags indicate friction, dead ends, wrong destinations, and missing paths.

Cross-reference screen names with AUDIT-GLOSSARY.md for detailed information about each screen.

---

## Navigation Entry Points Available to [Role]

Before diving into tasks, here is every navigation surface available:

### Tab Bar
| Tab | Visible? | Route | Screen File |
|-----|----------|-------|-------------|
| Home | Yes | `/(tabs)` | DashboardRouter.tsx → [role]HomeScroll |
| Schedule | Yes | `/(tabs)/schedule` | schedule.tsx |
| Chat | Yes | `/(tabs)/chats` | chats.tsx |
| ... | ... | ... | ... |

### Drawer Sections
| Section | Items | Routes |
|---------|-------|--------|
| Quick Access | Home, Schedule, Chats, Announcements, Team Wall | /(tabs), /(tabs)/schedule, ... |
| [Role-specific section] | ... | ... |
| League & Community | ... | ... |
| Settings & Privacy | ... | ... |

### Home Dashboard Cards/Actions
| Card/Widget | Action | Destination | Code Reference |
|-------------|--------|-------------|----------------|
| ... | ... | ... | ... |

### Notification Deep Links
| Notification Type | Destination | Params Passed | Code Reference |
|-------------------|-------------|---------------|----------------|
| chat | `/chat/{channelId}` or `/(tabs)/chats` | channelId (if present) | `_layout.tsx:90-91` |
| ... | ... | ... | ... |

---

## Tasks

### TASK [N]: [Task Name in Plain English]
**What the user is trying to do:** [1 sentence description from the user's perspective]
**Expected destination:** [Screen name + file path]

#### Path A: [Entry point] → [Destination] — [N] taps
| Step | Action | Screen/Component | Code File | Line | Notes |
|------|--------|-----------------|-----------|------|-------|
| 1 | [Starting point] | [Screen name] | [file.tsx] | — | [Entry point] |
| 2 | [Tap/swipe action] | [Button/card/link] | [file.tsx] | [line#] | [What fires] |
| 3 | [Arrives at] | [Destination screen] | [file.tsx] | — | [What they see] |

**Status:** ✅ Correct / ⚠️ Friction / ❌ Wrong destination / 🚫 Dead end / 🔇 Missing path
**Issue (if any):** [Description of what's wrong, confusing, or missing]

#### Path B: [Entry point] → [Destination] — [N] taps
... [same format]

#### Missing Paths (paths that SHOULD exist but don't):
- [Description of expected path and why it should exist]

#### Screen Name Confusion:
- [If applicable — e.g., "User expects 'Player Card' but lands on 'Child Detail' which shows different data"]

---
```

### Task inventory guidance

For each role, you must trace tasks in these categories at minimum. This is NOT an exhaustive list — if you find tasks that don't fit these categories, add them. The goal is COMPLETE coverage.

#### Parent Tasks (minimum):
- View home dashboard
- RSVP to an event
- Check upcoming schedule
- View child's stats / evaluations
- View child's player card / trading card
- Pay fees / view payment status
- View family gallery / photos
- Access team wall
- Open a chat / send a message
- View notifications
- Register a child for a season
- View achievements / badges
- View leaderboards / standings
- Switch between multiple children
- View waivers
- Edit profile
- Access settings
- Invite friends
- View team hub

#### Coach Tasks (minimum):
- View home dashboard
- Create a practice event
- Create a game event
- Run live game (Game Day Command Center)
- Enter/review post-game stats
- View roster
- View a player's card / detail
- Run player evaluations
- Manage challenges (create, review)
- View leaderboards / standings
- Access team hub
- Send a chat message / blast
- View schedule
- Take attendance
- Build a lineup
- View game prep
- Access coach profile
- Set availability
- View reports / analytics
- Manage volunteers

#### Admin Tasks (minimum):
- View home dashboard
- Manage registrations (review, approve, deny)
- Review payments / send reminders
- Manage teams (create, edit, assign players)
- Manage users (approve, roles, permissions)
- Manage schedule (create, edit, bulk create)
- Manage seasons (create, configure, archive)
- Manage jerseys
- View coach directory
- Manage background checks
- Manage volunteers
- Send blasts / announcements
- Access reports / analytics
- Run season setup wizard
- Search (admin search)
- Manage org settings
- Manage venue
- View org directory
- All coach tasks (admins can do everything coaches can)
- All parent tasks applicable to admin view

#### Player Tasks (minimum):
- View home dashboard
- View my stats
- View my player card / trading card
- View / join challenges
- View achievements / badges
- View leaderboards / standings
- View schedule
- Access team hub / team wall
- Open a chat / send a message
- View evaluations
- View season progress
- View my teams
- Edit profile

---

## TASK DOCUMENTATION RULES

1. **Every path must be traceable.** File name + line number for every navigation action. If you say "tapping the action card navigates to game-results," you must cite the exact line where `router.push('/game-results...')` is called.

2. **Test every path endpoint.** When a route is pushed, verify the destination file exists in `app/`. If the route is `/(tabs)/coach-chat`, verify that `app/(tabs)/coach-chat.tsx` exists and is a real screen (not a 2-line re-export — if it IS a re-export, note what it re-exports).

3. **Check param contracts.** If a screen expects `?playerId=X` but a navigation path doesn't pass it, flag it. Note what the screen does when that param is missing (auto-resolves? shows empty? crashes?).

4. **Document the "same task, different screens" problem.** When two screens serve overlapping purposes (game-results vs game-recap, child-detail vs player-card, etc.), document both and explain what each actually does vs what the user probably expects.

5. **Flag dead-end screens.** If a screen has no outbound navigation (no "back to X" or "next" actions), note it.

6. **Flag orphaned screens.** If a screen file exists but you cannot find ANY navigation path that leads to it (no drawer item, no tab, no `router.push`, no deep link), flag it as potentially orphaned.

7. **Flag screens reachable only from one entry point.** A screen with only one way to reach it is fragile. Note it.

8. **Flag inconsistent role access.** If a parent can technically reach an admin screen via URL but shouldn't be able to, note it. If a screen is menu-hidden but not route-guarded, note it.

9. **Count taps honestly.** "Open drawer" = 1 tap. "Tap menu item" = 1 tap. "Scroll to find something" = 0 taps but note the scroll. "Tap tab bar" = 1 tap. Don't inflate or deflate.

10. **Note when paths are conditional.** If a card only appears on the home dashboard when the user has pending items, note that the path is conditional. A user with no pending games can't use the "Enter stats" action card path.

---

## EXECUTION ORDER

1. Read all preparation files listed above.
2. Build the complete screen inventory (every file in `app/` and `app/(tabs)/`).
3. Write `AUDIT-GLOSSARY.md` first — you need this reference to write the journeys.
4. Write `AUDIT-PARENT-JOURNEYS.md`.
5. Write `AUDIT-COACH-JOURNEYS.md`.
6. Write `AUDIT-ADMIN-JOURNEYS.md`.
7. Write `AUDIT-PLAYER-JOURNEYS.md`.

After each document, STOP. Report:
- Document name completed
- Count of screens/tasks documented
- Any screens you could not resolve (file exists but purpose unclear)
- Any navigation paths you could not trace statically

Then continue to the next document.

---

## FINAL REMINDER

**You are a forensic auditor. You are documenting the scene. You are not cleaning it up, rearranging the furniture, or suggesting renovations. Document what IS, not what SHOULD BE. If something is broken, say it's broken. If something is missing, say it's missing. If something is confusing, say it's confusing. Then move on to the next item.**

The humans will decide what to do about it after they read your reports.
