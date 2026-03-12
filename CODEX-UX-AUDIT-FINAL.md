# CODEX UX AUDIT FINAL

## Final UX Position

The code implies a product that is rich in features but unstable in mental model. The main UX issue is not missing screens. It is that the app asks the user to carry hidden context from route to route while the code itself resolves that context differently in different places.

## Most Important UX Conclusions

1. Home is role-dependent and heuristic-dependent, not deterministic from routing alone.
2. Team, season, sport, and player context are gathered from multiple incompatible sources.
3. Many task flows are only smooth when upstream screens passed the right params and the right context was already warm.
4. Empty states are common and often ambiguous: true empty state versus missing linkage versus stale context.
5. The product currently behaves like several connected apps rather than one coherent app.

## Highest-Risk User Journeys

- parent with multiple children across seasons or orgs
- multi-role user switching between coach and parent views
- admin reviewing registrations and users
- coach entering game-day flows from different entry points

## What QA Should Expect

- “It opened, but it wasn’t the right thing”
- “This screen is empty, but I know data exists”
- “I got to the feature, but it needed extra context that wasn’t passed”
- “Changing roles changed the menu, but not the actual working context”

## Product Systems Interpretation

The app’s UX architecture is currently **context-driven more than route-driven**. That is workable only when context sources are singular and stable. In Lynx Mobile they are not singular and not stable, which means UX risk is structural rather than cosmetic.
