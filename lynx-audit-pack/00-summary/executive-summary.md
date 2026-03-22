# Lynx Mobile Audit Executive Summary

This audit reviews the mobile app as it exists in code on 2026-03-17 and focuses on actual implied user experience, route reachability, role access behavior, data dependencies, and beta risk.

## Product true state

Lynx Mobile is an Expo Router React Native app backed by Supabase. The app is role-shaped rather than feature-shaped: admin, coach, team manager, parent, and player users each see a different blend of tabs, drawer tools, and deep-link destinations. The product is broad in surface area and includes registration, payments, teams, schedule, chat, evaluations, challenges, engagement/journey, notifications, search, and organization management.

The app feels like a fast-moving multi-phase product rather than a fully normalized system. Core user flows exist, but many are assembled from overlapping route groups, drawer shortcuts, per-screen Supabase queries, and context plus AsyncStorage state. That leads to a real UX where users can often reach a screen, but whether they see the right data depends on a mix of role state, working season, team selection, route params, and historical storage keys.

## Strongest confirmed themes

- Navigation is rich but fragmented. The app uses root auth redirects, tab redirects, drawer shortcuts, search-driven navigation, notification-tap routing, and in-screen pushes.
- The same domain concepts are resolved in multiple ways. Team, season, player, and role context are not sourced consistently.
- The app contains both production-ready surfaces and partial/placeholder surfaces. Some drawer items intentionally route to a generic `web-features` placeholder.
- The route tree is larger than the stable user journey set. There are duplicate or overlapping screens for teams, notifications, chats, and "my stuff" areas.
- Supabase access is mostly direct from screens and hooks, which makes behavior easy to ship but hard to guarantee consistently.

## Most material user-facing risks

1. Broken route target likely exists: `components/player-scroll/PlayerTeamHubCard.tsx` pushes `/team-hub?teamId=...`, but no `app/team-hub.tsx` route exists.
2. Notification UX is split across two different screens and two different notification models: `app/notification.tsx` and `app/notification-inbox.tsx`.
3. Parameter-sensitive screens are reachable from generic menu surfaces without required params, increasing empty-state and wrong-state risk.
4. Parent-child linkage and player ownership logic are still resolved through multiple patterns (`player_guardians`, `parent_account_id`, email matching), which can change what parents see across screens.
5. Role-based access is partly UI-gated and partly data-gated, but not obviously centralized. Some "who can see what" decisions live in layout, some in drawer config, some in screen queries.
6. Empty-state quality is uneven. Some screens handle missing data gracefully; others likely degrade into blank or confusing states when season, team, or params are absent.

## Audit stance

- This pack is diagnosis only.
- No code changes were made.
- Prior audit artifacts were ignored as source of truth.
- Where a behavior cannot be proven from code alone, it is marked `UNVERIFIED`.
