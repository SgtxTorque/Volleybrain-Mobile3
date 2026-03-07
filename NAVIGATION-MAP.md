# Lynx Navigation Map

Last updated: 2026-03-07

## Screens by Role Access

### All Roles
| Screen | File | Reachable From | Status |
|--------|------|----------------|--------|
| Home | `(tabs)/index.tsx` | Tab bar, Drawer | ✅ |
| Schedule | `(tabs)/schedule.tsx` | Drawer | ⚠️ 1 |
| Chats | `(tabs)/chats.tsx` | Tab bar, Drawer, Notifications | ✅ |
| Announcements | `(tabs)/messages.tsx` | Drawer, Notifications | ✅ |
| Team Wall | `(tabs)/connect.tsx` | Drawer (×2) | ✅ |
| Settings | `(tabs)/settings.tsx` | Drawer | ⚠️ 1 |
| Profile | `profile.tsx` | Drawer header, Drawer settings | ✅ |
| Standings | `standings.tsx` | Drawer, MetricGrid, SeasonLeaderboardCard, GameDay tab, PlayerHomeScroll, TeamWall | ✅ |
| Achievements | `achievements.tsx` | Drawer (×2), MetricGrid (×2), RecentBadges (×2) | ✅ |
| Notification Prefs | `notification-preferences.tsx` | Drawer | ⚠️ 1 |
| Privacy Policy | `privacy-policy.tsx` | Drawer | ⚠️ 1 |
| Terms of Service | `terms-of-service.tsx` | Drawer | ⚠️ 1 |
| Data Rights | `data-rights.tsx` | Drawer (×2) | ✅ |
| Help | `help.tsx` | Drawer | ⚠️ 1 |
| Web Features | `web-features.tsx` | Drawer (×4) | ✅ |
| Invite Friends | `invite-friends.tsx` | Drawer | ⚠️ 1 |

### Admin Only
| Screen | File | Reachable From | Status |
|--------|------|----------------|--------|
| Manage Tab | `(tabs)/manage.tsx` | Tab bar | ⚠️ 1 |
| Admin Schedule | `(tabs)/admin-schedule.tsx` | UpcomingEvents (×2) | ✅ |
| Admin Chat | `(tabs)/admin-chat.tsx` | — | ❌ 0 |
| Admin Teams | `(tabs)/admin-teams.tsx` | — | ❌ 0 |
| Admin My Stuff | `(tabs)/admin-my-stuff.tsx` | — | ❌ 0 |
| Registration Hub | `registration-hub.tsx` | Drawer (×2), Manage tab, Notifications | ✅ |
| User Management | `users.tsx` | Drawer, Manage tab | ✅ |
| Team Management | `team-management.tsx` | Drawer, Manage tab | ✅ |
| Jersey Mgmt | `(tabs)/jersey-management.tsx` | Drawer, Manage tab | ✅ |
| Season Settings | `season-settings.tsx` | Drawer, Manage tab | ✅ |
| Season Archives | `season-archives.tsx` | Drawer (×2), Manage tab | ✅ |
| Season Setup Wizard | `season-setup-wizard.tsx` | AdminHomeScroll, Manage tab | ✅ |
| Season Reports | `season-reports.tsx` | QuickActionsGrid | ⚠️ 1 |
| Payments | `(tabs)/payments.tsx` | Drawer, Manage tab, Notifications | ✅ |
| Payment Reminders | `payment-reminders.tsx` | PaymentSnapshot, QuickActionsGrid, Manage tab | ✅ |
| Reports Tab | `(tabs)/reports-tab.tsx` | Drawer, Manage tab | ✅ |
| Blast Composer | `blast-composer.tsx` | Drawer (×2), CoachSection, Manage tab | ✅ |
| Blast History | `blast-history.tsx` | Drawer, Manage tab | ✅ |
| Org Directory | `org-directory.tsx` | Drawer, Manage tab | ✅ |
| Coach Directory | `coach-directory.tsx` | Drawer (×2), Manage tab | ✅ |
| Bulk Event Create | `bulk-event-create.tsx` | QuickActionsGrid | ⚠️ 1 |
| Admin Search | `admin-search.tsx` | Manage tab | ⚠️ 1 |
| Org Settings | `org-settings.tsx` | — (Drawer sends to web-features) | ❌ 0 |
| Venue Manager | `venue-manager.tsx` | — (stub) | ❌ 0 |
| Coach BG Checks | `coach-background-checks.tsx` | — | ❌ 0 |
| Volunteer Assign | `volunteer-assignment.tsx` | — | ❌ 0 |
| Report Viewer | `report-viewer.tsx` | Component import only | ❌ 0 |

### Coach Only (or Coach + Admin)
| Screen | File | Reachable From | Status |
|--------|------|----------------|--------|
| Game Day Tab | `(tabs)/gameday.tsx` | Tab bar | ⚠️ 1 |
| Coach Schedule | `(tabs)/coach-schedule.tsx` | ActivityFeed, PrepChecklist, SeasonSetupCard, ScoutingContext | ✅ |
| Coach Chat | `(tabs)/coach-chat.tsx` | GamePlanCard, TeamHubPreviewCard | ✅ |
| Coach Team Hub | `(tabs)/coach-team-hub.tsx` | — | ❌ 0 |
| Coach My Stuff | `(tabs)/coach-my-stuff.tsx` | — | ❌ 0 |
| Coach Roster | `(tabs)/coach-roster.tsx` | ActivityFeed (×2), TeamHealthCard | ✅ |
| My Teams | `(tabs)/my-teams.tsx` | Drawer (×2) | ✅ |
| Players | `(tabs)/players.tsx` | Drawer | ⚠️ 1 |
| Game Day Command | `game-day-command.tsx` | GamePlanCard, GameDay tab (×2) | ✅ |
| Game Prep | `game-prep.tsx` | Drawer (×2) | ✅ |
| Game Prep Wizard | `game-prep-wizard.tsx` | Coach Schedule (×2), GameDay tab | ✅ |
| Lineup Builder | `lineup-builder.tsx` | Drawer (×2) | ✅ |
| Attendance | `attendance.tsx` | Drawer | ⚠️ 1 |
| Game Results | `game-results.tsx` | Drawer, ActionItems | ✅ |
| Evaluation Session | `evaluation-session.tsx` | Drawer, ActionItems | ✅ |
| Player Evaluations | `player-evaluations.tsx` | SummaryPage | ⚠️ 1 |
| Coach Challenge Dash | `coach-challenge-dashboard.tsx` | Drawer, ChallengeQuickCard | ✅ |
| Challenge Library | `challenge-library.tsx` | ChallengeQuickCard | ⚠️ 1 |
| Create Challenge | `create-challenge.tsx` | coach-challenge-dashboard, challenge-library (×2) | ✅ |
| Coach Availability | `coach-availability.tsx` | Drawer | ⚠️ 1 |
| Coach Profile | `coach-profile.tsx` | Drawer | ⚠️ 1 |
| Team Roster | `team-roster.tsx` | TeamHealthTiles, coach-my-stuff | ✅ |
| Roster | `roster.tsx` | CoachHomeScroll, PlayerHomeScroll, RosterSection | ✅ |
| Team Gallery | `team-gallery.tsx` | PhotoStrip, GalleryPreview, TeamWall | ✅ |
| Team Wall | `team-wall.tsx` | — (drawer links to connect tab) | ❌ 0 |

### Parent Only
| Screen | File | Reachable From | Status |
|--------|------|----------------|--------|
| Parent Schedule | `(tabs)/parent-schedule.tsx` | Tab bar, DayStripCalendar, SeasonSnapshot, SecondaryEvents | ✅ |
| Parent Chat | `(tabs)/parent-chat.tsx` | FlatChatPreview, MetricGrid | ✅ |
| Parent Team Hub | `(tabs)/parent-team-hub.tsx` | TeamHubPreview (×2) | ✅ |
| Parent My Stuff | `(tabs)/parent-my-stuff.tsx` | — | ❌ 0 |
| My Kids | `my-kids.tsx` | Drawer (×2) | ✅ |
| Child Detail | `child-detail.tsx` | AthleteCard (×2), parent EvaluationCard | ✅ |
| Family Payments | `family-payments.tsx` | Drawer (×2), MetricGrid | ✅ |
| My Waivers | `my-waivers.tsx` | Drawer | ⚠️ 1 |
| Parent Reg Hub | `parent-registration-hub.tsx` | Drawer, RegistrationBanner, parent-my-stuff (×4) | ✅ |

### Player Only
| Screen | File | Reachable From | Status |
|--------|------|----------------|--------|
| My Stats | `my-stats.tsx` | Drawer (×2), EvaluationCard, HeroIdentityCard | ✅ |
| Player Card | `player-card.tsx` | standings, RosterCarousel, RosterSection | ✅ |
| Challenges | `challenges.tsx` | Drawer, _layout, QuickActions, ChallengeVerifyCard, ActiveChallengeCard | ✅ |
| Challenge CTA | `challenge-cta.tsx` | _layout notification, ActiveChallengeCard, TeamWall | ✅ |
| Challenge Detail | `challenge-detail.tsx` | coach-challenge-dashboard, challenge-cta | ✅ |

### Auth Flow
| Screen | File | Reachable From | Status |
|--------|------|----------------|--------|
| Welcome | `(auth)/welcome.tsx` | _layout auth guard | ✅ |
| Login | `(auth)/login.tsx` | Welcome screen | ✅ |
| Signup | `(auth)/signup.tsx` | Welcome screen | ✅ |
| Redeem Code | `(auth)/redeem-code.tsx` | Login screen | ✅ |
| Pending Approval | `(auth)/pending-approval.tsx` | _layout guard (×2) | ✅ |
| Claim Account | `claim-account.tsx` | _layout orphan handler | ✅ (auto) |

### Orphaned Screens (❌ 0 entry points)
| Screen | File | Notes |
|--------|------|-------|
| Game Recap | `game-recap.tsx` | Built but never linked |
| Season Progress | `season-progress.tsx` | Built but never linked |
| Player Goals | `player-goals.tsx` | Built but never linked |
| Player Stats | `player-stats.tsx` | Separate from my-stats, never linked |
| Venue Manager | `venue-manager.tsx` | Stub "Coming Soon" |
| Coach BG Checks | `coach-background-checks.tsx` | Built but never linked |
| Volunteer Assign | `volunteer-assignment.tsx` | Built but never linked |
| Notification | `notification.tsx` | Not notification-preferences |
| Challenge Celebration | `challenge-celebration.tsx` | Victory screen, never navigated to |
| Org Settings | `org-settings.tsx` | Drawer routes to web-features instead |
| Report Viewer | `report-viewer.tsx` | Used as component import only |
| Team Wall | `team-wall.tsx` | Drawer links to (tabs)/connect instead |
| Admin Chat | `(tabs)/admin-chat.tsx` | Hidden tab, no navigation to it |
| Admin Teams | `(tabs)/admin-teams.tsx` | Hidden tab, no navigation to it |
| Admin My Stuff | `(tabs)/admin-my-stuff.tsx` | Hidden tab, no navigation to it |
| Coach Team Hub | `(tabs)/coach-team-hub.tsx` | Hidden tab, no navigation to it |
| Coach My Stuff | `(tabs)/coach-my-stuff.tsx` | Hidden tab, no navigation to it |
| Parent My Stuff | `(tabs)/parent-my-stuff.tsx` | Hidden tab, no navigation to it (but has internal links) |
| Me | `(tabs)/me.tsx` | Hidden tab, no navigation to it |

### Single Entry Point Screens (⚠️ — need drawer link)
| Screen | File | Current Entry |
|--------|------|---------------|
| Schedule tab | `(tabs)/schedule.tsx` | Drawer only |
| Settings tab | `(tabs)/settings.tsx` | Drawer only |
| Manage tab | `(tabs)/manage.tsx` | Tab bar only |
| Game Day tab | `(tabs)/gameday.tsx` | Tab bar only |
| Players tab | `(tabs)/players.tsx` | Drawer only |
| Attendance | `attendance.tsx` | Drawer only |
| Player Evaluations | `player-evaluations.tsx` | SummaryPage only |
| Challenge Library | `challenge-library.tsx` | ChallengeQuickCard only |
| Coach Availability | `coach-availability.tsx` | Drawer only |
| Coach Profile | `coach-profile.tsx` | Drawer only |
| Season Reports | `season-reports.tsx` | QuickActionsGrid only |
| Bulk Event Create | `bulk-event-create.tsx` | QuickActionsGrid only |
| Admin Search | `admin-search.tsx` | Manage tab only |
| My Waivers | `my-waivers.tsx` | Drawer only |
| Invite Friends | `invite-friends.tsx` | Drawer only |
| Notification Prefs | `notification-preferences.tsx` | Drawer only |
| Privacy Policy | `privacy-policy.tsx` | Drawer only |
| Terms of Service | `terms-of-service.tsx` | Drawer only |
| Help | `help.tsx` | Drawer only |

---

## Totals (Pre-Fix)

| Category | Count |
|----------|-------|
| Total screen files | 90 |
| ✅ 2+ entry points | 52 |
| ⚠️ 1 entry point | 19 |
| ❌ 0 entry points (orphaned) | 19 |

---

## Completeness Summary (Post-Fix)

### Screens with 2+ entry points: 71
All major feature screens now have at least drawer + natural screen entry.

### Screens with 1 entry point: 15
Mostly settings/legal pages where a single drawer entry is sufficient:
- `notification-preferences`, `privacy-policy`, `terms-of-service`, `help`, `invite-friends`
- `coach-availability`, `coach-profile` (drawer only)
- `bulk-event-create`, `season-reports` (manage tab only)
- `venue-manager`, `coach-background-checks`, `volunteer-assignment` (drawer only — stubs)
- `my-waivers` (drawer only)
- `(tabs)/manage`, `(tabs)/gameday` (tab bar only)

### Screens with 0 entry points (true orphans): 4
Intentionally not wired — flow/system/redundant screens:
- `challenge-celebration` — programmatic navigation after challenge completion
- `notification` — system screen, triggered by notification bell
- `report-viewer` — 3-line stub wrapper
- `team-wall` — redundant with `(tabs)/connect`

### Gesture Drawer Coverage

| Role | Sections Visible | Feature Items | Coverage |
|------|-----------------|---------------|----------|
| Admin | 7 (Quick, Admin, Game Day, Coaching, Community, Settings, Help) | 47 | Complete |
| Coach | 6 (Quick, Game Day, Coaching, Community, Settings, Help) | 30 | Complete |
| Parent | 5 (Quick, Family, Community, Settings, Help) | 22 | Complete |
| Player | 5 (Quick, My Stuff, Community, Settings, Help) | 23 | Complete |

### Button Verification Results (Phase 4)
- **Screens verified**: Coach Home Scroll, Parent Home Scroll, Game Day Tab
- **Total buttons checked**: 75+
- **Correct**: 73
- **Fixed**: 2
  - `parent-scroll/EvaluationCard.tsx`: `?childId=` → `?playerId=` (param mismatch)
  - `coach-scroll/QuickActions.tsx`: Create Challenge route `null` → `/create-challenge`
- **Still broken**: 0
