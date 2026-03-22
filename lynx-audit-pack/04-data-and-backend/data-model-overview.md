# Data Model Overview

## Core identity entities

- `profiles`
- `user_roles`
- `organizations`
- `players`
- `coaches`

## Team and season entities

- `teams`
- `team_players`
- `team_coaches`
- `team_staff`
- `seasons`
- `sports`
- `age_groups`

## Operations entities

- `schedule_events`
- `event_rsvps`
- `event_volunteers`
- `game_lineups`
- `payments`
- `payment_installments`
- `season_fees`
- `registrations`
- `waivers`
- `waiver_signatures`
- `waiver_sends`

## Messaging and notification entities

- `chat_channels`
- `channel_members`
- `chat_messages`
- `messages`
- `message_recipients`
- `notification_preferences`
- `email_notifications`

## Engagement entities

- `coach_challenges`
- `challenge_participants`
- `team_posts`
- `team_post_reactions`
- `achievements`
- `player_achievements`
- `user_achievements`
- `xp_ledger`
- `league_standings`
- `journey_chapters`
- `journey_nodes`
- `journey_progress`
- `daily_quests`
- `weekly_quests`

## Data model reality

The app implies a rich relational model, but user linkage is still resolved through multiple patterns:

- `player_guardians`
- `players.parent_account_id`
- email matching on `players.parent_email` and `players.parent1_email`

That means user-visible truth can change from screen to screen depending on which linkage method the screen uses.
