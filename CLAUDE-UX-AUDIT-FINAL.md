# CLAUDE-UX-AUDIT-FINAL.md
## Lynx Mobile — Full Product System UX Audit: Master Report
### Audit Date: 2026-03-11

---

## Audit Scope

This audit evaluates every screen, flow, and interaction in the Lynx (VolleyBrain) mobile application against world-class consumer software standards (Apple Fitness, Duolingo, Airbnb). Every claim references code evidence by file path and line number.

### Deliverable Files
| File | Phase | Content |
|------|-------|---------|
| `CLAUDE-UX-NAVIGATION-MAP.md` | Phase 1 | Full navigation architecture (122+ routes) |
| `CLAUDE-UX-DASHBOARD-AUDIT.md` | Phase 2 + 7 | Dashboard philosophy + cognitive load analysis |
| `CLAUDE-UX-TASK-FLOWS.md` | Phase 3 | Task flow analysis for all roles |
| `CLAUDE-UX-REDUNDANCY-REPORT.md` | Phase 6 | Screen redundancy analysis |
| `CLAUDE-UX-DEAD-END-SCREENS.md` | Phase 8 | Dead ends, empty states, loading failures |
| `CLAUDE-UX-FRICTION-REGISTER.md` | Phase 7 | Cognitive load + friction points |
| `CLAUDE-UX-BETA-RISK-REGISTER.md` | Phase 9 | Risk register with severity scoring |
| `CLAUDE-UX-EXECUTIVE-SUMMARY.md` | — | Leadership overview |
| `CLAUDE-UX-AUDIT-FINAL.md` | — | This master report |

---

## System Architecture Summary

### Provider Hierarchy
```
GestureHandlerRootView
  AuthProvider              (lib/auth.tsx)
    ThemeProvider            (lib/theme.tsx)
      SportProvider          (lib/sport.tsx)
        SeasonProvider       (lib/season.tsx)
          PermissionsProvider (lib/permissions-context.tsx)
            ParentScrollProvider
              DrawerProvider
                RootLayoutNav + GestureDrawer
```
**Evidence:** `app/_layout.tsx:194–211`

### Role System
- 5 roles: Admin, Coach, CoachParent (dual), Parent, Player
- Detection via `usePermissions()` from `lib/permissions-context.tsx`
- Role override via `viewAs` — production feature (line 171)
- Auto-detection via 5 DB queries: user_roles, player_guardians, players, coaches, team_coaches

### Navigation System
- **Expo Router** with `/(tabs)` layout
- 4 visible tabs (Home, Slot 2 [role-dependent], Chats, More)
- 25 hidden tabs (drawer access only)
- 73+ stack routes
- **GestureDrawer** with 9 role-gated menu sections

---

## Phase 1: Navigation Architecture

**Full details:** `CLAUDE-UX-NAVIGATION-MAP.md`

### Key Metrics
| Metric | Value |
|--------|-------|
| Total routes | 122+ |
| Auth routes | 5 |
| Visible tabs | 4 (role-conditional) |
| Hidden tabs | 25 |
| Stack routes | 73+ |
| Dynamic routes | 2 (`/chat/[id]`, `/register/[seasonId]`) |
| Orphaned routes | 6 (no navigation path found) |
| Duplicate entry points | 10+ (same screen accessible from multiple sections) |

### Critical Findings
1. **Orphaned routes:** `/(tabs)/me`, `/(tabs)/coaches`, `/(tabs)/teams`, `/registration-start`, `/notification`, `/report-viewer` — no navigation path found
2. **Naming inconsistencies:** Role-prefixed tabs (`coach-chat`, `parent-chat`) vs generic (`chats`); hyphenated (`game-prep`) vs merged (`gameday`)
3. **Route purpose overlap:** `/game-recap` vs `/game-results` (same purpose); `/team-management` vs `/(tabs)/admin-teams` (same purpose)

---

## Phase 2: Dashboard Philosophy

**Full details:** `CLAUDE-UX-DASHBOARD-AUDIT.md`

### Dashboard Inventory
| Dashboard | File | Sections | Cognitive Load |
|-----------|------|----------|---------------|
| Admin | `AdminHomeScroll.tsx` | 13 | 7/10 |
| Coach | `CoachHomeScroll.tsx` | 14 | 8/10 |
| CoachParent | **MISSING** | — | — |
| Parent | `ParentHomeScroll.tsx` | 18 | 6/10 |
| Player | `PlayerHomeScroll.tsx` | 11 | 5/10 |

### Critical Finding: CoachParentHomeScroll Missing
- Referenced at `DashboardRouter.tsx:257` but component doesn't exist
- Falls back to `CoachHomeScroll` — parents who are coaches lose family actions (RSVP, payments, family gallery)

### 5-Second Test Results
| Role | Question | Passes? | Time |
|------|----------|---------|------|
| Admin | "What's urgent?" | Yes (Smart Queue) | ~3 sec |
| Coach | "Is game prep done?" | Borderline | ~5 sec |
| Parent | "What needs attention?" | Yes (Dynamic mascot) | ~2 sec |
| Player | "Did I level up?" | Yes (Hero card) | ~2 sec |

### Innovation Highlight
**Parent Dashboard Dynamic Mascot Messages** (`ParentHomeScroll.tsx:84–165`): Context-aware rotating messages that cycle every 5 seconds based on live state (unconfirmed RSVP, unpaid balance, unread chat, all-clear). Eliminates generic "Welcome back" — always shows actionable insight.

---

## Phase 3: Task Flow Analysis

**Full details:** `CLAUDE-UX-TASK-FLOWS.md`

### Task Complexity Summary
| Task | Role | Taps | Verdict |
|------|------|------|---------|
| RSVP to event | Parent | 1 | **Optimal** |
| Check schedule | Parent | 0 | **Optimal** |
| View child stats | Parent | 4 | Needs shortcut |
| Pay fees | Parent | 5 | Needs shortcut |
| Create practice | Coach | 6–7 | Needs templates |
| Run live game | Coach | 12+ | Complex but appropriate |
| Submit stats | Coach | 4–6 | Redundant routes |
| View roster | Coach | 2 | **4 redundant screens** |
| Manage registrations | Admin | 4–7 | Needs batch actions |
| Review payments | Admin | 4–6 | Acceptable |

**Average: 4.75 taps per task** — could be reduced to ~3.5 with shortcuts and consolidation.

---

## Phase 4+5: Context Awareness & Interaction Wiring

### Context Layer Findings

| Layer | File | Status | Risk |
|-------|------|--------|------|
| Auth | `lib/auth.tsx` | Functional | Multi-org users see only first org |
| Season | `lib/season.tsx` | Good + AsyncStorage persistence | Invalid season → app hangs |
| Sport | `lib/sport.tsx` | Functional | Silent fallback if deleted |
| Permissions | `lib/permissions-context.tsx` | Excellent design | `viewAs` not persisted |
| Team (coach) | `hooks/useCoachTeam.ts` | 3-path fallback | Missing `is_active` filter |
| Team (parent) | `lib/team-context.tsx` | Simple hook | Minimal risk |

### Interaction Wiring Gaps

| Route | Missing | Evidence | Risk |
|-------|---------|----------|------|
| `/game-prep` (notification) | `eventId` | `_layout.tsx:106` | Screen loads empty |
| `/challenge-detail` | `childId` validation | `ChallengeVerifyCard:100+` | Wrong child sees challenge |
| `/child-detail` | Permission check | `child-detail.tsx:9` | Any user accesses any child |
| `/game-prep-wizard` | Permission check | `game-prep-wizard.tsx:80` | Any coach accesses any game |

### Permission Validation Gap (CRITICAL)
`usePlayerHomeData(playerId)` accepts any player ID without ownership verification. Any user knowing a player's ID can access their full stats, achievements, and personal data.

**Evidence:** `hooks/usePlayerHomeData.ts` — no ownership check before data fetch.

---

## Phase 6: Screen Redundancy

**Full details:** `CLAUDE-UX-REDUNDANCY-REPORT.md`

### Redundancy Heatmap

| Category | Files | Shared Lines | Severity |
|----------|-------|-------------|----------|
| Chat | 4 | ~750 | **HIGH** |
| Schedule | 5 | ~400 | **HIGH** |
| Profile/Settings | 5 | ~600 | **HIGH** |
| Team Management | 3 | ~500 | **HIGH** |
| Roster | 4 | ~300 | **MEDIUM** |
| Player Detail | 3 | ~200 | **MEDIUM** |
| Game Post-Mortem | 2 | ~150 | **LOW** |

**Total estimated duplicated code: ~2,900 lines across 26 files.**

Key examples:
- **4 chat screens** (3 full implementations + 1 re-export), ~750 lines duplicated
- **4 roster screens** (coach doesn't know which to use)
- **3 team management screens** with ~80% code overlap

---

## Phase 7: Cognitive Load & Friction

**Full details:** `CLAUDE-UX-FRICTION-REGISTER.md`

### Top 5 Friction Points

| Rank | Issue | Score | Affected Roles |
|------|-------|-------|---------------|
| 1 | No action feedback (RSVP, payment, approval) | 20 | All |
| 2 | Multi-child RSVP attribution confusion | 20 | Parent |
| 3 | Coach game prep fragmentation (3 cards) | 16 | Coach |
| 4 | Missing empty states (~40% of screens) | 15 | All |
| 5 | 4 redundant roster screens | 15 | Coach |

### Friction by Role
| Role | Total Friction Score | Primary Pain |
|------|---------------------|-------------|
| Coach | 107 | Fragmented game prep + redundant routes |
| Parent | 87 | RSVP confusion + stats access friction |
| Admin | 69 | Cognitive overload + no batch actions |

---

## Phase 8: Dead Ends & Empty States

**Full details:** `CLAUDE-UX-DEAD-END-SCREENS.md`

### Severity Summary

| Category | Count | Severity |
|----------|-------|----------|
| Missing empty states | 12+ screens | CRITICAL |
| Deep-link param failures | 6+ screens | CRITICAL |
| Notification missing params | 4/8 types | HIGH |
| Silent error handling | 15+ screens | HIGH |
| Missing loading states | 5+ screens | MEDIUM |
| Orphaned routes | 6 routes | LOW |
| AsyncStorage leakage | 4 keys | MEDIUM |

---

## Phase 9: Risk Register

**Full details:** `CLAUDE-UX-BETA-RISK-REGISTER.md`

### Risk Summary

| Priority | Count | Top Risk |
|----------|-------|----------|
| **P0 (Critical)** | 4 | No permission validation on player data access |
| **P1 (High)** | 6 | Notification deep links missing params |
| **P2 (Medium)** | 5 | Silent error handling, role persistence |
| **P3 (Low)** | 3 | Debug logs, dead code |
| **Total** | **18** | |

---

## What's Working Well

### Architectural Strengths
1. **Parent Dashboard** — Context-aware mascot messages are innovative. Dynamic rotation of actionable insights eliminates generic welcome screens. (`ParentHomeScroll.tsx:84–165`)
2. **Player Dashboard** — Dark theme gamification (XP, streaks, challenges) creates engagement appropriate for younger users. (`PlayerHomeScroll.tsx:72–90`)
3. **Smart Queue** — Admin's front-loaded urgent items with badge counts. "See what matters, act, watch counter drop." (`AdminHomeScroll.tsx:207–229`)
4. **Role Detection** — 5-query layered detection with auto-detection from DB tables is robust and handles edge cases. (`lib/permissions-context.tsx`)
5. **Gesture Drawer** — Smooth edge-swipe with spring physics and 9 role-gated sections. (`GestureDrawer.tsx:493–551`)
6. **Parent RSVP** — Single-tap from home screen is best-in-class. (`ParentHomeScroll.tsx:497–505`)
7. **Provider Hierarchy** — Clean nested context architecture ensures data flows correctly. (`app/_layout.tsx:194–211`)

### UX Patterns to Preserve
- Billboard Hero with auto-cycling events
- Three-tier visual hierarchy (bright → neutral → muted)
- Glass morphism card design
- Scroll-driven sticky headers with fade animation
- Context-aware farewell messages

---

## What Needs Improvement

### Top 10 Action Items (Prioritized)

| # | Action | Phase | Risk | Effort |
|---|--------|-------|------|--------|
| 1 | Add permission validation to player data hooks | P0 | RISK-01 | Small |
| 2 | Clear AsyncStorage on logout | P0 | RISK-04 | Small |
| 3 | Fix notification game deep link (pass eventId) | P1 | RISK-05 | Small |
| 4 | Add is_active filter to useCoachTeam | P1 | RISK-06 | Small |
| 5 | Implement auto-save in game-day-command | P0 | RISK-03 | Medium |
| 6 | Add empty states to 12+ screens | P1 | F-04 | Medium |
| 7 | Add toast notification system for action feedback | P1 | F-01 | Medium |
| 8 | Display child name on Billboard Hero events | P1 | RISK-10 | Small |
| 9 | Batch N+1 unread count query in tab layout | P1 | RISK-08 | Small |
| 10 | Consolidate 4 chat screens into 1 | P2 | — | Large |

---

## Scoring Against Consumer Standards

### Apple Fitness Comparison
| Criteria | Apple Fitness | Lynx | Gap |
|----------|--------------|------|-----|
| Zero-tap info on home | Daily rings visible | Billboard Hero visible | **Match** |
| Action feedback | Haptic + toast | Color change only | **Gap: No toasts** |
| Empty states | Illustrated + CTA | ~40% missing | **Gap: Incomplete** |
| Offline support | Full offline | None | **Gap: Missing** |
| Data privacy | Strict permission model | Missing validation | **Gap: Critical** |

### Duolingo Comparison
| Criteria | Duolingo | Lynx | Gap |
|----------|----------|------|-----|
| Gamification | Streaks, XP, levels | Streaks, XP, levels | **Match** (Player dashboard) |
| Single primary action | "Start Lesson" button | RSVP button (Parent) | **Match** |
| Cognitive load | Low (~4/10) | 5–9/10 depending on role | **Gap: Coach/Admin too heavy** |
| Redundancy | Zero duplicate screens | 4x roster, 4x chat | **Gap: Significant** |

### Airbnb Comparison
| Criteria | Airbnb | Lynx | Gap |
|----------|--------|------|-----|
| Search → Book flow | 3 taps | RSVP: 1 tap, Stats: 4 taps | **Mixed** |
| Error handling | Illustrated + retry | Silent blank screens | **Gap: No error UI** |
| Loading states | Skeleton screens | ActivityIndicator on some | **Gap: Inconsistent** |
| Navigation clarity | Single canonical path | 4 paths to roster | **Gap: Redundant** |

---

## Overall Assessment

**The Lynx app is a capable product with strong foundational architecture that is held back by execution gaps in three areas:**

1. **Data Protection** (P0) — Permission validation missing on player data access. Must fix before beta.
2. **User Confidence** (P1) — Missing empty states, action feedback, and error handling erode trust. Users can't tell if actions worked or why screens are blank.
3. **Maintenance Burden** (P2) — ~2,900 lines of duplicated code across 26 files. Bug fixes applied to one screen may not reach its redundant counterparts.

**The product's strengths are real and differentiated:** Parent context-aware mascot, player gamification, admin smart queue, and single-tap RSVP are genuinely excellent UX patterns. The path to world-class is not a rewrite — it's closing the gaps identified in this audit.
