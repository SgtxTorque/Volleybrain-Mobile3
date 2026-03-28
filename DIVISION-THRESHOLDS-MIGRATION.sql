-- Create division_thresholds table
CREATE TABLE IF NOT EXISTS division_thresholds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  division text NOT NULL,
  threshold_override integer NOT NULL,
  max_rarity text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(achievement_id, division)
);

-- RLS
ALTER TABLE division_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "division_thresholds_read" ON division_thresholds FOR SELECT TO authenticated USING (true);

-- Seed: Generate 10u and 12u overrides for all stat/season badges
-- 10u = 0.25x base threshold (min 1), max_rarity = 'rare'
-- 12u = 0.50x base threshold (min 1), max_rarity = 'epic'
INSERT INTO division_thresholds (achievement_id, division, threshold_override, max_rarity)
SELECT id, '10u', GREATEST(1, ROUND(threshold * 0.25)), 'rare'
FROM achievements
WHERE engagement_category = 'stat'
  AND cadence = 'season'
  AND threshold IS NOT NULL
  AND threshold > 1
ON CONFLICT (achievement_id, division) DO NOTHING;

INSERT INTO division_thresholds (achievement_id, division, threshold_override, max_rarity)
SELECT id, '12u', GREATEST(1, ROUND(threshold * 0.50)), 'epic'
FROM achievements
WHERE engagement_category = 'stat'
  AND cadence = 'season'
  AND threshold IS NOT NULL
  AND threshold > 1
ON CONFLICT (achievement_id, division) DO NOTHING;

-- Verify
SELECT division, COUNT(*) as overrides, MIN(threshold_override) as min_threshold, MAX(threshold_override) as max_threshold
FROM division_thresholds
GROUP BY division
ORDER BY division;
