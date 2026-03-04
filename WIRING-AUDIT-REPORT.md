# Wiring Audit Report

## Legacy Deletion
- Files deleted: **21** (.tsx) + 1 (README.md)
- Files that had NO replacement (orphaned, never imported): AnnouncementBanner.tsx, ParentOnboardingModal.tsx, SquadComms.tsx, ShoutoutProfileSection.tsx
- Imports rerouted: **0** (no production code imported from _legacy/)

## Routes Fixed

### Coach GamePlanCard (hero card quick actions)
| Button | Old Target | New Target |
|--------|-----------|------------|
| Lineup | `/(tabs)/coach-roster` | `/lineup-builder?eventId=${event.id}` |
| Stats | `/(tabs)/coach-schedule` | `/game-results?eventId=${event.id}` |
| Attend. | `/(tabs)/coach-schedule` | `/attendance?eventId=${event.id}` |

### Coach QuickActions Panel
| Button | Old Target | New Target |
|--------|-----------|------------|
| Build a Lineup | `/(tabs)/coach-roster` | `/lineup-builder` |
| Review Stats | `/(tabs)/coach-schedule` | `/game-results` |

### Coach ActionItems
| Button | Old Target | New Target |
|--------|-----------|------------|
| "X games need stats entered" | `/(tabs)/coach-schedule` | `/game-results` |

### Admin QuickActionsGrid
| Button | Old Target | New Target |
|--------|-----------|------------|
| Send Reminder | `/blast-composer` | `/payment-reminders` |
| Add Player (relabeled) | `/registration-hub` | `/registration-hub` (label: "Register Player") |

### Admin PaymentSnapshot
| Button | Old Target | New Target |
|--------|-----------|------------|
| Send All Reminders | `/blast-composer` | `/payment-reminders` |

### Parent MetricGrid
| Button | Old Target | New Target |
|--------|-----------|------------|
| Team Record | `/(tabs)/parent-schedule` | `/standings` |

**Calendar catch-all routes eliminated: 6**

## Role Permission Fixes
- **Season Settings** removed from ungated "Settings & Privacy" section in GestureDrawer (was accessible to all roles, now only in admin-gated "Admin Tools" section as "Season Management")
- DashboardRouter: verified proper role detection via `usePermissions()`
- My Stuff screens: verified no cross-role content leaks
- Home scroll dashboards: verified no admin/coach sections leak to parents

## Old Components Replaced
- Old gold player cards found and replaced: **No** — not found outside deleted _legacy/
- Old pink trophy event cards found and replaced: **No** — not found outside deleted _legacy/
- Old pastel quick action tiles found and replaced: **No** — not found outside deleted _legacy/
- All screens properly use branded PlayerCard and EventCard components

## Data Query Fixes
- "No players found" on evaluations: **Not applicable** — query properly resolves teamId from params or user's team_staff, handles empty state gracefully
- "No teams found" on game results: **Not applicable** — query uses eventId correctly, has proper null/error handling
- Achievement errors: **Not applicable** — has proper loading states and null checks

## Readability Fixes
- Lineup builder team selector: unselected tab text changed from `BRAND.textMuted` (dark, invisible on dark surface) to `rgba(255,255,255,0.5)` (readable on #0A0E1A background)
- Gameday event/location type colors: hardcoded hex values → BRAND tokens
- Coach QuickActions roster badge: `#F59E0B` → `BRAND.goldBrand`

## Remaining Issues
- None — all spec items addressed

## Commits
1. `8a35bee` — Phase 1: legacy inventory and replacement safety map
2. `3c576ce` — Phase 2: delete entire _legacy folder (21 files)
3. `6fc8aca` — Phase 3: fix all broken routes
4. (Phase 4: verification only, main fix in Phase 3)
5. `5a22683` — Phase 5-6: old component audit + data/readability fixes
6. This commit — Wiring Audit Report
