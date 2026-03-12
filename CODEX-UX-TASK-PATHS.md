# CODEX UX TASK PATHS

## 1. Parent Registers A Child

- Likely entry:
  - home -> drawer -> `/parent-registration-hub`
  - or parent my-stuff -> registration CTA
- Screen count:
  - 2 to 4
- Navigation events:
  - `parent-registration-hub` -> `/register/[seasonId]` -> success -> `/(tabs)`
- Context dependencies:
  - user role
  - org membership
  - open season data
  - family/child linkage model
- UX complexity:
  - high
- Main friction:
  - invite code and org membership influence what seasons even appear

## 2. Admin Reviews Registration

- Likely entry:
  - admin home/manage -> `/registration-hub`
- Screen count:
  - 1 to 3
- Navigation events:
  - registration hub -> modal detail -> optional team assignment
- Context dependencies:
  - org
  - open seasons
  - registration record or synthetic orphan-player record
- UX complexity:
  - high
- Main friction:
  - admin is reviewing a mixed dataset, not a clean single-table queue

## 3. Admin Manages Teams

- Likely entry:
  - drawer -> `/team-management`
  - or hidden tab `/(tabs)/teams`
- Screen count:
  - 1 to 2
- Navigation events:
  - route choice itself is ambiguous because two screens exist
- Context dependencies:
  - current season
- UX complexity:
  - medium
- Main friction:
  - duplicate surfaces imply different user journeys for the same job

## 4. Coach Runs Game Prep

- Likely entry:
  - coach home quick action
  - coach schedule event action
  - gameday card
- Screen count:
  - 2 to 4
- Navigation events:
  - home/schedule -> `/game-prep-wizard?eventId=&teamId=` -> `/lineup-builder?eventId=&teamId=` -> `/game-results?eventId=`
- Context dependencies:
  - selected team
  - event id
  - team id
  - current season
- UX complexity:
  - high
- Main friction:
  - some entry points send full params, some send generic routes

## 5. Parent Responds To RSVP

- Likely entry:
  - parent home banner
  - parent schedule
  - event detail modal
- Screen count:
  - 1 to 3
- Navigation events:
  - sometimes none; RSVP can happen inline
- Context dependencies:
  - child linkage
  - team linkage
  - event id
- UX complexity:
  - medium
- Main friction:
  - child identity is derived differently in different parent flows

## 6. Player Enters Challenges

- Likely entry:
  - player home challenge card
  - drawer -> `/challenges`
  - notification -> `/challenge-cta`
- Screen count:
  - 2 to 4
- Navigation events:
  - `/challenges` -> `/challenge-cta?challengeId=` -> `/challenge-detail?challengeId=`
- Context dependencies:
  - effective role
  - team association
  - player linkage
- UX complexity:
  - medium
- Main friction:
  - challenge role behavior depends heavily on `viewAs`

## 7. Parent Opens Team Hub

- Likely entry:
  - home preview
  - tab `/(tabs)/connect`
  - `/(tabs)/parent-team-hub`
- Screen count:
  - 1 to 3
- Context dependencies:
  - selected team
  - selected child
  - current role
- UX complexity:
  - high
- Main friction:
  - there are multiple team-hub entry routes that resolve team context differently

## 8. Admin Reviews Users

- Likely entry:
  - admin manage -> `/users`
- Screen count:
  - 1 to 2
- Context dependencies:
  - current org
- UX complexity:
  - medium
- Main friction:
  - current code can present a user list broader than the current org

## Complexity Summary

- Highest-complexity tasks:
  - registration
  - game prep/game day
  - team hub navigation for multi-role users

- Highest hidden-context dependency:
  - team hub
  - roster
  - player dashboards
  - schedule variants
