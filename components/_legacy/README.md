# Legacy Components

These components were archived on 2026-03-02 during the dead code cleanup.
They were replaced by the scroll-based home screens (*HomeScroll variants) and
are kept here for reference only. Do NOT import from this folder.

## Legacy Dashboards (replaced by *HomeScroll)
- AdminDashboard.tsx → AdminHomeScroll.tsx
- CoachDashboard.tsx → CoachHomeScroll.tsx
- ParentDashboard.tsx → ParentHomeScroll.tsx
- PlayerDashboard.tsx → PlayerHomeScroll.tsx
- CoachParentDashboard.tsx → CoachHomeScroll.tsx

## Replaced Coach-Scroll Components
- DevelopmentHint.tsx → ActionItems.tsx
- PendingStatsNudge.tsx → ActionItems.tsx
- SeasonScoreboard.tsx → SeasonLeaderboardCard.tsx
- TopPerformers.tsx → SeasonLeaderboardCard.tsx
- TeamPulse.tsx → TeamHealthCard.tsx
- RosterAlerts.tsx → TeamHealthCard.tsx

## Other Orphans
- AppDrawer.tsx → GestureDrawer.tsx
- SquadComms.tsx → only consumer was PlayerDashboard
- AnnouncementBanner.tsx → only consumer was ParentDashboard
- payments-admin.tsx → payments tab has own implementation
- game-day-parent.tsx → never referenced anywhere
