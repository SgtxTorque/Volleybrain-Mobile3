# CC-ENGAGEMENT-PHASE1-INVESTIGATE
# Investigation Prompt — Run BEFORE executing the schema spec
# Mode: INVESTIGATION ONLY. Do NOT write any code. Do NOT create any files. REPORT BACK ONLY.

---

## STANDING RULES

1. **This is a READ-ONLY investigation.** Do not create, modify, or delete any files.
2. **Do not write any SQL, migrations, or code.**
3. **Read these files first, in order:**
   - `SCHEMA_REFERENCE.csv` (or `.md`) in repo root
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
4. **Branch:** `navigation-cleanup-complete`
5. **Report format:** Answer every question below with specific file paths, table names, and code snippets where relevant.

---

## QUESTIONS TO ANSWER

### Section A: Existing Schema Verification

1. **What is the exact name of the profiles/users table?** Is it `profiles`, `users`, or something else? What is the primary key column name and type?

2. **What is the exact name of the teams table?** Primary key column name and type?

3. **Do these tables already exist? If so, what columns do they have?**
   - `player_badges`
   - `player_achievements`
   - `challenges`
   - `challenge_completions`
   - `attendance`
   - `events`
   - `shoutouts` (or equivalent)
   - Any table with "leaderboard" in the name
   - Any table with "xp" or "experience" in the name
   - Any table with "streak" in the name
   - Any table with "quest" in the name
   - Any table with "skill" in the name
   - Any table with "journey" in the name

4. **Is there already an XP column on profiles or any other table?** If so, where is it and what type?

5. **Is there already a level column on profiles or any other table?** If so, where is it and what type?

### Section B: Existing RLS Pattern

6. **Pick 2-3 existing tables that have RLS policies** (preferably `challenges`, `player_badges`, or `attendance`). For each, show:
   - The exact RLS policy SQL (SELECT, INSERT, UPDATE, DELETE)
   - How they reference the authenticated user (auth.uid(), auth.jwt(), etc.)
   - How they handle coach/admin access to player data

### Section C: Migration File Pattern

7. **Where do migration files live?** Show the path and list any existing migration files (just filenames).

8. **What format do migration filenames use?** Timestamp prefix format?

9. **Are there any existing seed files?** Where do they live?

### Section D: Foreign Key Targets

10. **What is the exact FK reference for a player?** Is it `profiles(id)`, `users(id)`, something else? Show an example from an existing table that references a player.

11. **What is the exact FK reference for a team?** Show an example from an existing table that references a team.

### Section E: Potential Conflicts

12. **Will any of these table names conflict with existing tables?**
    - xp_transactions
    - player_levels
    - daily_quests
    - weekly_quests
    - quest_bonus_tracking
    - streak_data
    - streak_milestones
    - skill_categories
    - skill_content
    - skill_quizzes
    - skill_progress
    - journey_chapters
    - journey_nodes
    - journey_progress
    - league_standings
    - xp_boost_events

13. **Are there any existing indexes that might conflict** with the index names we plan to create?

### Section F: Supabase Config

14. **Is there a `supabase/` directory in the repo?** What's inside it?

15. **Is there a `supabase/config.toml`?** If so, show the project_id to confirm it matches `uqpjvbiuokwpldjvxiby`.

### Section G: Existing Player Home Data

16. **Find the file `usePlayerHomeData`** (or whatever hook feeds the Player Home scroll). What file path is it at? What data does it currently return? Does it have any hardcoded/placeholder quest data?

17. **Find the PlayerDailyQuests component.** What file path? How does it currently get its quest data?

---

## REPORT FORMAT

Structure your report exactly like this:

```
## INVESTIGATION REPORT: Engagement System Phase 1

### A. Existing Schema
[answers to 1-5]

### B. RLS Pattern
[answers to 6]

### C. Migration Pattern
[answers to 7-9]

### D. Foreign Key Targets
[answers to 10-11]

### E. Conflict Check
[answers to 12-13]

### F. Supabase Config
[answers to 14-15]

### G. Player Home Data Layer
[answers to 16-17]

### RECOMMENDED ADJUSTMENTS
[If anything in the schema spec needs to change based on what you found, list it here. 
For example: "profiles table PK is `user_id` not `id`, so all FK references need to change."]

### READY TO PROCEED?
[YES or NO, with explanation if NO]
```

**Do not proceed to the execution spec. Stop here and report back.**
