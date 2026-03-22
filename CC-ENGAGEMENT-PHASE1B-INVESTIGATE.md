# CC-ENGAGEMENT-PHASE1B-INVESTIGATE
# Investigation Prompt — Quest Generation Engine
# Mode: INVESTIGATION ONLY. Do NOT write any code. Do NOT create any files. REPORT BACK ONLY.

---

## STANDING RULES

1. **This is a READ-ONLY investigation.** Do not create, modify, or delete any files.
2. **Do not write any SQL, functions, Edge Functions, or code of any kind.**
3. **Read these files first, in order:**
   - `SCHEMA_REFERENCE.csv` (or `.md`) in repo root
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
4. **Branch:** `navigation-cleanup-complete`
5. **Report format:** Answer every question below with specific file paths, table names, column names, and code snippets where relevant.

---

## CONTEXT

Phase 1 schema is complete. These tables now exist:
- `daily_quests` (player_id, team_id, quest_date, quest_type, title, description, xp_reward, verification_type, target_value, current_value, is_completed, completed_at, sort_order)
- `weekly_quests` (same structure but with week_start instead of quest_date)
- `quest_bonus_tracking` (player_id, bonus_type, period_date, xp_awarded)
- `xp_ledger` (now has team_id + multiplier columns)
- `profiles` (now has tier + xp_to_next_level columns, plus existing total_xp + player_level)
- `streak_data` (player_id, current_streak, longest_streak, last_active_date, streak_freezes_available, streak_freeze_used_date)

The goal: Build a quest generation function that creates 3 daily quests per player each day, and 3-5 weekly quests per player each Monday.

---

## QUESTIONS TO ANSWER

### Section A: Existing Edge Functions / Database Functions

1. **Does the repo have any existing Supabase Edge Functions?** Check for a `supabase/functions/` directory. List any functions found with their names and what they do (read the index.ts or main file of each).

2. **Does the repo have any existing Supabase database functions (PL/pgSQL)?** Search migration files for `CREATE FUNCTION` or `CREATE OR REPLACE FUNCTION`. List each with its name, parameters, and purpose.

3. **Does the repo use any cron jobs or scheduled tasks?** Search for `pg_cron`, `cron.schedule`, or any reference to scheduled execution in migration files or config.

4. **Is there a `supabase/config.toml`?** If not, is there any other Supabase CLI config? What about `.env` files that reference Supabase URLs or keys?

### Section B: Player Data Access Patterns

5. **How does the app determine which players belong to which team?** Find the table/join that links a player (profiles.id) to a team (teams.id). Show the exact table name, column names, and any relevant FK relationships. Is it `user_roles`? `team_players`? Something else?

6. **How does the app determine a player's current/active team?** Is there a concept of "primary team" or "active team"? Show the logic or column used.

7. **List every player who exists in the database right now.** Query approach: what tables would you join to get a list of all players with their profile id, name, team(s), and role? Show the query pattern (don't execute it, just show what it would look like).

### Section C: Existing Data That Quests Can Reference

8. **How does the app check if a player has an upcoming event today?** Find how `schedule_events` is queried. What columns indicate event date/time? What column indicates event type (game vs practice)? Show the query pattern from `usePlayerHomeData` or any hook that fetches next event.

9. **How does the app check attendance?** Find `event_attendance` table structure. What columns exist? How is attendance marked (boolean? status enum?)? Who marks it (coach? auto?)?

10. **How does the app check if a player has given a shoutout recently?** Find the shoutouts query pattern. What's the FK column for the giver? How would you check "has this player given a shoutout in the last 24 hours"?

11. **How does the app check active coach challenges?** Find how `coach_challenges` and `challenge_participants` are queried. What columns indicate a challenge is active vs completed? How is a player linked to a challenge?

12. **Does player_stats or game_player_stats exist?** Find the table(s) that store individual player game stats (kills, aces, digs, etc.). Show columns. How would you check "did this player play in a game this week"?

13. **How does the app check badges?** Find the `player_badges` query pattern. How would you check "did this player earn a badge in the last 7 days"?

### Section D: PlayerDailyQuests Component Deep Dive

14. **Show the complete `buildQuests()` function** from `components/player-scroll/PlayerDailyQuests.tsx`. Copy the full function body so we can understand every quest type it currently generates.

15. **What props does PlayerDailyQuests receive?** List every prop with its type. Which of these come from `usePlayerHomeData`?

16. **How does the component render quests?** Does it use a FlatList, ScrollView, map()? What does each quest card look like (what elements: icon, title, XP badge, progress bar, checkbox)?

### Section E: Supabase Client Pattern

17. **How does the app import and use the Supabase client?** Find the Supabase client initialization file. Show the import path and how queries are typically made (e.g., `supabase.from('table').select(...)` pattern). Show 2-3 examples from existing hooks.

18. **Does the app use Supabase realtime subscriptions anywhere?** If so, show an example.

19. **Does the app have any existing pattern for calling Supabase Edge Functions from the client?** Search for `supabase.functions.invoke` or similar. If not found, note that.

### Section F: Timezone and Date Handling

20. **What timezone does the app use for date calculations?** Search for timezone references, `dayjs`, `moment`, or `new Date()` patterns. How does usePlayerHomeData determine "today"? Is there any timezone normalization?

21. **How does the app determine "midnight" for resets?** Is it UTC midnight? Player's local midnight? Device timezone?

---

## REPORT FORMAT

Structure your report exactly like this:

```
## INVESTIGATION REPORT: Phase 1B — Quest Generation

### A. Existing Functions
[answers to 1-4]

### B. Player Data Access
[answers to 5-7]

### C. Quest Data Sources
[answers to 8-13]

### D. PlayerDailyQuests Component
[answers to 14-16]

### E. Supabase Client Pattern
[answers to 17-19]

### F. Timezone / Date Handling
[answers to 20-21]

### RECOMMENDED APPROACH
[Based on what you found, recommend:
- Database function (PL/pgSQL) vs Edge Function vs client-side generation
- How to determine which quests to generate for each player
- Any concerns about the approach]

### READY TO PROCEED?
[YES or NO, with explanation if NO]
```

**Do not proceed to writing any code. Stop here and report back.**
