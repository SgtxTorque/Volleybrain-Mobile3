# TRUE-STATE-DRIFT-REGISTER.md
## Lynx Mobile — Vocabulary & Domain Drift Audit
### Audit Date: 2026-03-11

---

## 1. Role Names

### DB Truth (user_roles.role)
Values written during signup: `'league_admin'`, `'admin'`, `'coach'`, `'parent'`
**File:** `app/(auth)/signup.tsx:188,246`

### Code References

| Value | Usage | Files |
|-------|-------|-------|
| `'league_admin'` | Admin detection | `lib/auth.tsx:233` |
| `'admin'` | Admin detection, chat roles | `lib/auth.tsx:233`, `chats.tsx:352`, `coach-chat.tsx:438` |
| `'coach'` | Role detection, chat roles | `permissions-context.tsx`, `chat-utils.ts:196,207` |
| `'parent'` | Role detection, chat fallback | `permissions-context.tsx`, `chats.tsx:350` (fallback) |
| `'player'` | Role detection | `permissions-context.tsx` |
| `'head_coach'` | Coach sub-role | UNVERIFIED in DB — used in `team_coaches.role` |
| `'assistant_coach'` | Coach sub-role | UNVERIFIED in DB — used in `team_coaches.role` |

### Drift Found
| Issue | Evidence |
|-------|----------|
| `account_type` vs `user_roles.role` | Chat system reads `profiles.account_type` (`chats.tsx:35,247,350`) while permissions reads `user_roles.role`. These may diverge. |
| `member_role` fallback | `chats.tsx:350,397` — defaults to `'parent'` if `account_type` is null |

---

## 2. Season Status Values

### DB Truth
Values observed in queries: `'active'`, `'upcoming'`, `'archived'`, `'completed'`

### Code References

| Value | Read/Filter | Display | File |
|-------|-------------|---------|------|
| `'active'` | `.eq('status', 'active')` | "Active" | `lib/season.tsx:82`, `season-settings.tsx`, `admin-my-stuff.tsx` |
| `'upcoming'` | Filter logic | "Upcoming" | `season-settings.tsx` |
| `'archived'` | Filter logic, SeasonSelector | "Archived" | `components/SeasonSelector.tsx` |
| `'completed'` | Filter logic, SeasonSelector | "Completed" | `components/SeasonSelector.tsx` |
| `'draft'` | UNVERIFIED | UNVERIFIED | Not found in mobile code |

### Drift Found
| Issue | Evidence |
|-------|----------|
| No explicit archived filter in season query | `lib/season.tsx:55-71` — returns ALL seasons without status filter. SeasonSelector filters in UI but provider doesn't |

---

## 3. Team Type Values

### DB Truth (CHECK constraint)
`'competitive'`, `'recreational'` — enforced by `teams_team_type_check`

### Code References (RECENTLY FIXED)

| File | Value Written | Status |
|------|---------------|--------|
| `team-management.tsx` | `'competitive'` / `'recreational'` | CORRECT |
| `(tabs)/teams.tsx` | `'competitive'` / `'recreational'` | CORRECT |
| `(tabs)/admin-teams.tsx` | `'competitive'` / `'recreational'` | CORRECT |
| `season-setup-wizard.tsx` | `'recreational'` (default) | CORRECT |

### Drift: RESOLVED
Previous values `'elite'`/`'development'` were replaced in the team_type fix session.

---

## 4. Event Types (schedule_events.event_type)

### Values Found

| Value | Written | Read/Filtered | Displayed | Files |
|-------|---------|---------------|-----------|-------|
| `'game'` | `coach-schedule.tsx:438` | `achievement-engine.ts:802,814,826,929`, `notifications.ts:329,524` | "Game" | Multiple |
| `'practice'` | `coach-schedule.tsx:438` | `notifications.ts:524` | "Practice" | Multiple |
| `'event'` | UNVERIFIED | — | — | May exist in DB |
| `'tournament'` | UNVERIFIED | — | — | May exist in DB |
| `'meeting'` | UNVERIFIED | — | — | May exist in DB |

### Drift Found
| Issue | Evidence |
|-------|----------|
| Only `'game'` and `'practice'` used in code | `notifications.ts:524` — `.in('event_type', ['game', 'practice'])`. Other types UNVERIFIED |

---

## 5. Game Status Values (schedule_events.game_status)

### Values Found

| Value | Usage | Files |
|-------|-------|-------|
| `'completed'` | Filter for completed games | `achievement-engine.ts:804` |
| `'final'` | Filter for completed games | `achievement-engine.ts:804` |
| `null` | Not started | `.not('game_status', 'is', null)` |

### Drift Found
| Issue | Evidence |
|-------|----------|
| `'completed'` vs `'final'` | Both used as terminal states: `.in('game_status', ['completed', 'final'])` — `achievement-engine.ts:804,816`. Are both valid? UNVERIFIED against DB constraints |

---

## 6. Registration Status Values

### Values Found

| Value | Usage | Files |
|-------|-------|-------|
| `'pending'` | Default on creation | `register/[seasonId].tsx` |
| `'approved'` | After admin approval | `registration-hub.tsx` |
| `'assigned'` | After team assignment | `admin-teams.tsx:336` — `players.update({ status: 'assigned' })` |
| `'denied'` | Admin rejection | UNVERIFIED |
| `'waitlisted'` | Waitlist | UNVERIFIED |

### Drift Found
| Issue | Evidence |
|-------|----------|
| `players.status = 'assigned'` set on team assignment | `admin-teams.tsx:336` — This writes to `players.status`, not a registration table. Registration status and player status may be conflated |

---

## 7. Payment Status Values

### Values Found
Payment logic appears primarily in admin dashboard and family payments screens. Specific status string literals are UNVERIFIED — payment screens use computed states (overdue by date, partial by amount) rather than explicit status enums.

---

## 8. Attendance Status Values

### Values Found

| Value | Usage | Files |
|-------|-------|-------|
| `'present'` | Attendance marking | `attendance.tsx`, `game-prep-wizard.tsx:470` |
| `'absent'` | Attendance marking | `attendance.tsx` |
| `'late'` | UNVERIFIED | — |
| `'excused'` | UNVERIFIED | — |

### Drift: UNVERIFIED — needs manual QA of attendance marking flow

---

## 9. Background Check Status Values

### Values Found

| Value | Usage | Files |
|-------|-------|-------|
| `'cleared'` | Valid check | `coach-my-stuff.tsx:321` |
| `null` | No check on file | `coach-background-checks.tsx:45` |
| Other values | Displayed via capitalize | `coach-background-checks.tsx:437-439` |

### No drift detected — all files consistently read from `coaches.background_check_status`

---

## 10. Channel Type Values (chat_channels.channel_type)

### Values Found

| Value | Written | Files |
|-------|---------|-------|
| `'dm'` | DM creation | `chats.tsx:322`, `coach-chat.tsx:427`, `chat/[id].tsx:729` |
| `'team'` | Team channel | `lib/chat-utils.ts` |
| `'announcement'` | Announcement channel | `lib/chat-utils.ts` |
| Custom (user-entered) | Channel creation | `coach-chat.tsx:475` — uses `newChannelType` state |

---

## 11. Member Role Values (channel_members.member_role)

### Values Found

| Value | Source | Files |
|-------|--------|-------|
| `'parent'` | `profiles.account_type` or fallback | `chats.tsx:350,397`, `chat-utils.ts:145,164` |
| `'coach'` | `profiles.account_type` | `chat-utils.ts:196,207` |
| `'admin'` | `profiles.account_type` | `chat-utils.ts:234,245` |

### DRIFT: `member_role` is written from `profiles.account_type`, NOT from `usePermissions()`. See Role Names section #1.

---

## 12. Staff Role Values (team_staff.staff_role)

### Values Found

| Value | Usage | Files |
|-------|-------|-------|
| Read via `team_staff.staff_role` | Team resolution | `lib/permissions.ts:35,49` |
| Specific values | UNVERIFIED | Not found as string literals in mobile code |

### Drift: Staff role values are read but never written by mobile app. Values come from web admin. Mobile reads whatever is in DB.

---

## 13. Parent/Guardian Terminology

| Term | Usage | Files |
|------|-------|-------|
| "parent" | Primary term in UI | Throughout |
| "guardian" | DB column name (`player_guardians.guardian_id`) | `permissions-context.tsx` |
| "family" | Family grouping concept | `family-payments.tsx`, `FamilyPanel.tsx`, `FamilyGallery.tsx` |
| "caregiver" | Not found | — |

### Minor drift: UI says "parent" but DB table is `player_guardians`. No functional impact.

---

## 14. Invitation Status Values

| Value | Usage | Files |
|-------|-------|-------|
| `'revoked'` | Admin revoke | `admin-my-stuff.tsx:220` |
| `'pending'` | Default | UNVERIFIED |
| `'accepted'` | After use | UNVERIFIED |

---

## Summary of Active Drift Issues

| # | Domain | Issue | Severity |
|---|--------|-------|----------|
| 1 | Role names | `profiles.account_type` vs `user_roles.role` used in different contexts | P1 |
| 2 | Game status | `'completed'` AND `'final'` both used as terminal states | P3 |
| 3 | Registration/Player status | `players.status = 'assigned'` conflated with registration status | P2 |
| 4 | Season status | No archived filter in season provider query | P2 |
| 5 | Chat member_role | Derived from `account_type`, not permissions | P2 |
| 6 | team_type | RESOLVED — previously `'elite'`/`'development'`, now `'competitive'`/`'recreational'` | Fixed |
