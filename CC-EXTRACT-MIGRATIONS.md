# CC-EXTRACT-MIGRATIONS
# Extract all engagement system migrations into a single SQL file
# Mode: READ ONLY from migrations. CREATE one output file.

---

## WHAT TO DO

1. Read ALL migration files from `supabase/migrations/` that are related to the engagement system. They should include files with these patterns in their names:
   - `engagement_phase1_schema`
   - `engagement_rls_fix`
   - `engagement_phase2_content`
   - `engagement_chapters_3_8`
   - `engagement_phase4_social`

2. Concatenate them IN ORDER (by filename timestamp) into a single file at:
```
supabase/APPLY-TO-SUPABASE.sql
```

3. Add a header comment at the top:
```sql
-- =============================================================================
-- LYNX ENGAGEMENT SYSTEM — COMBINED MIGRATIONS
-- Paste this entire file into Supabase Dashboard > SQL Editor > Run
-- Created: 2026-03-16
-- Order: Phase 1 Schema > RLS Fix > Phase 2 Content > Chapters 3-8 > Phase 4 Social
-- =============================================================================
```

4. Between each migration file, add a separator comment:
```sql
-- =============================================================================
-- MIGRATION: [filename]
-- =============================================================================
```

5. Do NOT modify any SQL. Copy it exactly as it exists in each migration file.

6. Report back with:
   - Total line count of the combined file
   - List of migration files included (in order)
   - Any migration files found that were NOT included (and why)

**Commit:** `[migrations] combined SQL for manual Supabase application`
