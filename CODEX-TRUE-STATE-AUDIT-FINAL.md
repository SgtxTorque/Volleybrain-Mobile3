# CODEX TRUE-STATE AUDIT FINAL

## Top 25 Findings

1. Parent/player identity resolution is internally inconsistent across the app. `CONFIRMED`
2. Root TypeScript scope includes non-production reference/design/admin code and fails typecheck. `CONFIRMED`
3. One live-app TS error exists in `lib/email-queue.ts`. `CONFIRMED`
4. Admin `users` screen fetches all profiles, not just current-org profiles. `CONFIRMED`
5. Admin-sensitive screens are not consistently route-guarded at screen level. `PARTIALLY CONFIRMED`
6. Registration wizard writes `player_parents`; parent flows mostly read `player_guardians`/`parent_account_id`/`parent_email`. `CONFIRMED`
7. `components/DashboardRouter.tsx` uses `parent_account_id` as player-self signal. `CONFIRMED`
8. `components/GestureDrawer.tsx` player context uses `players.profile_id`, a different identity model again. `CONFIRMED`
9. Team management exists in two overlapping screens. `CONFIRMED`
10. Registration admin mixes true registration rows with synthetic orphan-player rows. `NEW FINDING`
11. Invite code handling uses conflicting field names across flows. `CONFIRMED`
12. `complete-profile` writes `date_of_birth` while the wider app uses `birth_date`. `CONFIRMED`
13. Notification producers and inbox UI are out of sync on notification types. `CONFIRMED`
14. Team selection is persisted independently of role/season and is not reset on role switch. `CONFIRMED`
15. Season, sport, team, and route params are multiple active sources of truth. `CONFIRMED`
16. Client-side unread counting in tab layout is N+1 and realtime-triggered. `CONFIRMED`
17. Placeholder web-only drawer items are exposed like real mobile features. `CONFIRMED`
18. Payment state uses both `status` and boolean `paid`. `CONFIRMED`
19. Event vocab uses `game/practice/event` in most places and `match/tournament` elsewhere. `CONFIRMED`
20. `app/(tabs)/schedule.tsx` runs scheduled notification checks for parents too. `NEW FINDING`
21. `app.json` has duplicate permissions and placeholder Android package id. `CONFIRMED`
22. Push registration depends on runtime EAS project ID discovery. `PARTIALLY CONFIRMED`
23. Rejection flow likely leaves auth/user cleanup ambiguity. `PARTIALLY CONFIRMED`
24. Duplicate role-selector components remain in the codebase. `CONFIRMED`
25. Reference and design folders still contaminate production tooling boundaries. `CONFIRMED`

## Most Important New Findings

- The dominant issue is identity and relationship drift, not just repo clutter.
- The registration admin screen is not a pure registration-table interface; it fabricates registration-like rows from orphan `players`.
- Role switching is broader than the settings page suggests because the drawer role pills also change effective role behavior.
- Sensitive-screen exposure risk cannot be dismissed by menu gating alone.

## Proposed Attack Order

1. Prove and enforce one canonical identity/linkage model.
2. Restore trustworthy validation/build state.
3. Add consistent screen/route-level access enforcement.
4. Consolidate duplicate management surfaces.
5. Normalize season/team/role context reset behavior.
6. Normalize vocabulary and status models.

## Unresolved Unknowns

- Is `player_guardians` or `player_parents` the intended production model?
- Is `players.profile_id` a real active production column or stale assumption?
- Is `players.parent_account_id` meant for parent ownership, player-self ownership, or both?
- Are backend RLS policies strong enough to compensate for weak in-app route guarding?
- Are placeholder `/web-features` entries intentionally shipping in beta?

## Final Release Position

The app is feature-rich but structurally drifted. It is not in a state where beta feedback will cleanly reflect UX alone; testers are likely to hit wrong-role, wrong-child, wrong-team, or inconsistent admin flows. It needs identity-model stabilization and route/context tightening before wider beta distribution.
