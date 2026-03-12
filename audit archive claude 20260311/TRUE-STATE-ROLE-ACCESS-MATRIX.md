# TRUE-STATE-ROLE-ACCESS-MATRIX.md
## Lynx Mobile — Role Access Audit
### Audit Date: 2026-03-11

---

## Role Detection Architecture

**Primary source:** `lib/permissions-context.tsx` → `usePermissions()` hook

| Flag | Detection Method | Source |
|------|-----------------|--------|
| `isAdmin` | `user_roles.role IN ('league_admin', 'admin')` | `lib/auth.tsx:233` |
| `isPlatformAdmin` | `profiles.is_platform_admin` | `lib/auth.tsx:214` |
| `isCoach` | `coaches.profile_id = user.id` | `permissions-context.tsx` |
| `isParent` | `player_guardians.guardian_id = user.id` OR `players.parent_account_id = user.id` OR `players.parent_email ilike email` | `permissions-context.tsx` |
| `isPlayer` | `players.parent_account_id = user.id` | `permissions-context.tsx` |
| `viewAs` | Overridable state for role previewing | `permissions-context.tsx:48` |

---

## Access Enforcement Methods

| Method | Description | Strength |
|--------|-------------|----------|
| **Tab visibility** | `_layout.tsx` conditionally shows tabs based on role flags | Medium — hidden tabs still accessible via `router.push` |
| **Menu restriction** | `GestureDrawer.tsx` role-gates menu sections | Medium — drawer items filtered but routes still navigable |
| **Screen guard** | Screen checks role on mount, redirects if unauthorized | Strong |
| **Query filtering** | Screen loads data scoped to role (e.g., "my teams") | Weak — doesn't prevent access, just shows empty data |
| **Not enforced** | No role check at screen level | None |

---

## Role-to-Screen Matrix

### Legend
- **Y** = Should see, CAN see
- **N** = Should NOT see, cannot see
- **!** = Should NOT see but CAN access (via direct navigation)
- **~** = Can access but sees empty/filtered data
- **?** = UNVERIFIED

### Auth Screens
| Screen | Admin | Coach | Parent | Player | Enforcement |
|--------|-------|-------|--------|--------|-------------|
| Welcome | N | N | N | N | Auth guard (unauthenticated only) |
| Login | N | N | N | N | Auth guard |
| Signup | N | N | N | N | Auth guard |
| Redeem Code | N | N | N | N | Auth guard |
| Pending Approval | N | N | N | N | Auth guard + approval check |

### Dashboard (Home Tab)
| Screen | Admin | Coach | Parent | Player | Enforcement |
|--------|-------|-------|--------|--------|-------------|
| Home (index) | Y | Y | Y | Y | DashboardRouter renders role-specific scroll |
| AdminHomeScroll | Y | N | N | N | DashboardRouter conditional |
| CoachHomeScroll | N | Y | N | N | DashboardRouter conditional |
| CoachParentDashboard | N | Y (if also parent) | N | N | DashboardRouter conditional |
| ParentHomeScroll | N | N | Y | N | DashboardRouter conditional |
| PlayerHomeScroll | N | N | N | Y | DashboardRouter conditional |

### Tab 2 (Manage/GameDay/Schedule)
| Screen | Admin | Coach | Parent | Player | Enforcement |
|--------|-------|-------|--------|--------|-------------|
| Manage | Y | N | N | N | Tab visibility (`isAdmin`) |
| Game Day | N | Y | N | Y | Tab visibility (`!isAdmin && !isParentOnly`) |
| Parent Schedule | N | N | Y | N | Tab visibility (`isParentOnly`) |

### Chat
| Screen | Admin | Coach | Parent | Player | Enforcement |
|--------|-------|-------|--------|--------|-------------|
| Chats (tab) | Y | Y | Y | Y | Tab always visible |
| Admin Chat | Y | ! | ! | ! | Menu restriction only |
| Coach Chat | ! | Y | ! | ! | Menu restriction only |
| Parent Chat | ! | ! | Y | ! | Menu restriction only |
| Chat/[id] | Y | Y | Y | Y | No guard — channel membership enforced by query |

### Schedule
| Screen | Admin | Coach | Parent | Player | Enforcement |
|--------|-------|-------|--------|--------|-------------|
| Admin Schedule | Y | ! | ! | ! | Menu restriction |
| Coach Schedule | ! | Y | ! | ! | Menu restriction |
| Schedule (generic) | Y | Y | Y | Y | No guard |
| Game Prep | ~ | Y | ~ | ~ | Query filtering (needs team) |
| Game Day Command | ~ | Y | ~ | ~ | Query filtering |
| Game Results | Y | Y | Y | Y | No guard |
| Lineup Builder | ~ | Y | ~ | ~ | Query filtering |

### Challenges
| Screen | Admin | Coach | Parent | Player | Enforcement |
|--------|-------|-------|--------|--------|-------------|
| Challenges | Y | Y | Y | Y | No guard — role affects UI (coach sees FAB) |
| Challenge Library | ! | Y | ! | ! | No guard |
| Create Challenge | ! | Y | ! | ! | No guard — **RISK** |
| Challenge Detail | Y | Y | Y | Y | No guard |
| Challenge CTA | ! | ! | ! | Y | No guard |
| Coach Challenge Dashboard | ! | Y | ! | ! | No guard — uses useCoachTeam |

### Evaluations
| Screen | Admin | Coach | Parent | Player | Enforcement |
|--------|-------|-------|--------|--------|-------------|
| Evaluation Session | ~ | Y | ~ | ~ | Query filtering (teamId) |
| Player Evaluation | ~ | Y | ~ | ~ | Query filtering |
| Player Evaluations | ~ | Y | Y | ~ | Query filtering |

### Admin Screens
| Screen | Admin | Coach | Parent | Player | Enforcement |
|--------|-------|-------|--------|--------|-------------|
| Admin Teams | Y | ! | ! | ! | Menu restriction only |
| Team Management | Y | ! | ! | ! | No guard — **RISK** |
| Season Settings | Y | ! | ! | ! | No guard |
| Registration Hub | Y | ! | ! | ! | No guard |
| Season Setup Wizard | Y | ! | ! | ! | No guard |
| Admin Search | Y | ! | ! | ! | No guard |
| Org Settings | Y | ! | ! | ! | No guard |
| Users | Y | ! | ! | ! | No guard |
| Coach Background Checks | Y | ! | ! | ! | No guard |
| Payment Reminders | Y | ! | ! | ! | No guard |

### Profile & Account
| Screen | Admin | Coach | Parent | Player | Enforcement |
|--------|-------|-------|--------|--------|-------------|
| Profile | Y | Y | Y | Y | No guard (self-edit only) |
| Coach Profile | Y | Y | ~ | ~ | No guard — query needs coachId |
| Coach Availability | ~ | Y | ~ | ~ | Query filtering |
| My Stats | ~ | ~ | Y | Y | Query filtering (playerId) |
| Player Card | Y | Y | Y | Y | No guard |
| Achievements | Y | Y | Y | Y | No guard |

### Family / Parent
| Screen | Admin | Coach | Parent | Player | Enforcement |
|--------|-------|-------|--------|--------|-------------|
| My Kids | ! | ! | Y | ! | No guard — **RISK** |
| Child Detail | ! | ! | Y | ! | No guard |
| Family Payments | ! | ! | Y | ! | No guard |
| Parent Reg Hub | ! | ! | Y | ! | No guard |

---

## Critical Findings

### 1. No Route-Level Guards
**Severity:** P1 — High Risk

Most screens rely on menu restriction (GestureDrawer) or tab visibility to prevent unauthorized access. However, if a user navigates directly via `router.push()` (e.g., from a notification deep link or URL), there are no screen-level guards.

**Evidence:**
- `team-management.tsx` — No role check, any authenticated user can navigate here
- `create-challenge.tsx` — No role check, parent could create a challenge
- `season-settings.tsx` — No role check
- `registration-hub.tsx` — No role check
- `org-settings.tsx` — No role check

**Mitigation:** Data queries are scoped (e.g., useCoachTeam returns nothing for non-coaches), so unauthorized users would see empty/error states rather than other users' data. But the screens are still accessible.

### 2. Role Switching Does Not Clear AsyncStorage
**Severity:** P2 — Medium

When switching roles via `viewAs`, AsyncStorage keys like `vb_admin_last_season_id`, `vb_selected_team_id`, `vb_player_last_child_id` persist. This could cause stale context when switching from admin to coach role preview.

**Evidence:**
- `lib/season.tsx` — reads `vb_admin_last_season_id`
- `lib/team-context.tsx` — reads `vb_selected_team_id`
- `components/DashboardRouter.tsx` — reads `vb_player_last_child_id`

### 3. `account_type` Column Used for Chat Roles
**Severity:** P2 — Medium

Chat member roles are derived from `profiles.account_type` rather than the permissions system. A user whose `account_type` is stale or doesn't match their actual permissions would have incorrect chat permissions.

**Evidence:**
- `chats.tsx:350` — `member_role: user.account_type || 'parent'`
- `coach-chat.tsx:438` — `member_role: user.account_type || 'parent'`
- `coach-chat.tsx:352` — `can_moderate: user.account_type === 'admin'`

### 4. Multi-Role Users
**Severity:** P2 — Medium

A user who is both admin and coach will see the admin dashboard by default (admin takes priority in DashboardRouter). The `viewAs` switcher allows previewing other roles but doesn't change the actual permissions context for data queries.

**Evidence:** `_layout.tsx:28` — `const primaryRole = isCoach ? 'coach' : isParent ? 'parent' : null`
`DashboardRouter.tsx` — admin path checked first
