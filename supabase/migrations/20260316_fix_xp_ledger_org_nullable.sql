-- =============================================================================
-- FIX: Make xp_ledger.organization_id nullable
-- The original table (20250225000000_engagement_system.sql) declared
-- organization_id UUID NOT NULL, but all engagement-system inserts
-- (quest-engine, streak-engine, skill-module, leaderboard, xp-boost,
-- team-quest) either omit organization_id or pass NULL.
-- This would cause NOT NULL constraint violations at runtime.
-- =============================================================================

ALTER TABLE xp_ledger ALTER COLUMN organization_id DROP NOT NULL;
