-- Step 1: Drop the old unique constraint on (player_id, achievement_id)
-- First, find the constraint name
SELECT conname
FROM pg_constraint
WHERE conrelid = 'player_achievements'::regclass
  AND contype = 'u';

-- Drop it (replace 'constraint_name' with the actual name from above)
-- ALTER TABLE player_achievements DROP CONSTRAINT constraint_name;

-- Step 2: Add new unique constraint that includes season_id
-- This allows the same badge to be earned in different seasons
ALTER TABLE player_achievements
  ADD CONSTRAINT player_achievements_player_achievement_season_unique
  UNIQUE (player_id, achievement_id, season_id);

-- Step 3: For any existing rows with NULL season_id, set a default
-- so the constraint works (NULLs don't conflict in PostgreSQL unique constraints)
-- Use a sentinel UUID for "no season" / lifetime badges
-- Or better: backfill from the achievement's cadence
UPDATE player_achievements pa
SET season_id = (
  SELECT s.id FROM seasons s
  WHERE s.organization_id = (
    SELECT p.current_organization_id FROM profiles p WHERE p.id = pa.player_id
  )
  AND s.status = 'active'
  ORDER BY s.start_date DESC
  LIMIT 1
)
WHERE pa.season_id IS NULL;

-- Step 4: Same for user_achievements if it has a similar constraint
-- Check first:
SELECT conname FROM pg_constraint
WHERE conrelid = 'user_achievements'::regclass AND contype = 'u';

-- Verify
SELECT COUNT(*) as total, COUNT(season_id) as has_season, COUNT(*) - COUNT(season_id) as null_season
FROM player_achievements;
