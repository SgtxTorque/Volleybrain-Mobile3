# Critical Task Flows

## Parent checks child schedule

- Screens: 2 to 3
- Typical path: home or drawer -> `/(tabs)/parent-schedule`
- Dependencies:
  - auth profile
  - linked child resolution
  - team inference
  - event RSVP data
- Friction risk: high when child linkage is incomplete

## Coach prepares for game

- Screens: 2 to 5
- Typical path:
  - `/(tabs)/coach-schedule` -> `/game-prep-wizard?eventId=...&teamId=...`
  - or drawer -> `/game-prep`
- Dependencies:
  - working season
  - team context
  - event param
  - roster/event attendance
- Friction risk: medium to high when entered without params

## Admin processes registration

- Screens: 2 to 4
- Typical path:
  - `/(tabs)/manage` or drawer -> `/registration-hub`
  - related jumps to users/payments/team assignment
- Dependencies:
  - org and season context
  - registration state
- Friction risk: medium due to broad toolset and split management surfaces

## Player continues journey

- Screens: 2 to 4
- Typical path:
  - home/player-scroll -> `/(tabs)/journey`
  - node tap -> `/skill-module?...`
  - optional quest/leaderboard surfaces
- Dependencies:
  - player identity
  - journey content data
  - progression rows
- Friction risk: medium, mostly data-driven rather than routing-driven

## Parent handles family payments

- Screens: 1 to 3
- Typical path:
  - drawer or notification -> `/family-payments`
- Dependencies:
  - linked child and season fees
  - payment/installment rows
- Friction risk: medium due to family/team/season aggregation complexity
