# Feature Audit By Role

## Admin

Admins have the broadest surface area and the highest configuration power. They can reach management, payments, registration, teams, reports, search, venue, season, and org settings from the drawer and tab shell.

Observed reality:

- Admin UX is powerful but spread across many destinations.
- Admin search is a meaningful navigation accelerator.
- Team management appears in both `/team-management` and `/(tabs)/teams`.
- Some admin tools are placeholders routed to `/web-features`.

## Coach

Coaches are routed into roster, schedule, game prep, evaluations, challenges, blast composer, coach availability, and team-related surfaces.

Observed reality:

- Coach flows are relatively complete for day-to-day use.
- Coach schedule is a central operational screen and feeds other game-day routes.
- Coach challenge and engagement systems are active.
- Some coach tasks still depend on optional route params, which can weaken deep-link reliability.

## Team Manager

Team managers are treated as an operational role with roster, schedule, payments, attendance, volunteers, blast, and engagement access.

Observed reality:

- Team manager setup has a dedicated route.
- Team manager access is partly treated like coach-lite and partly like admin-lite.
- Several team manager tools reuse coach or admin screens instead of a dedicated manager workflow.

## Parent

Parents are routed into child-linked data: schedule, registration, payments, waivers, evaluations, achievements, and invite friends.

Observed reality:

- Parent UX depends heavily on linked-child resolution.
- Parent schedule and team hub screens infer children through guardian links, direct account links, and email matching.
- When child linkage is incomplete, parent UX likely degrades into "no teams", "no registrations", or empty result states.

## Player

Players have newer engagement-oriented UX: journey path, quests, challenges, achievements, stats, season progress, and player card.

Observed reality:

- Player UX appears stylistically distinct and more gamified.
- Newer player surfaces coexist with older stats/evaluation surfaces.
- There is at least one likely broken player navigation path to `/team-hub`.
