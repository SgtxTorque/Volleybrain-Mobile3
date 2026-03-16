# CC-ENGAGEMENT-PHASE4-SOCIAL-LOCKIN
# Lynx Player Engagement System — Phase 4: Social + Lock-In Systems
# Status: READY FOR CC EXECUTION
# Depends on: All Phase 1-3 complete, Chapters 1-8 content seeded

---

## STANDING RULES

1. **Read these files first, in order:**
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
   - `SCHEMA_REFERENCE.csv` in repo root
   - `LYNX-REFERENCE-GUIDE.md` in repo root
2. **Do NOT modify any existing screens, hooks, or services EXCEPT the files explicitly listed in this spec.**
3. **Commit after each phase.** Commit message format: `[engagement-social] Phase X: description`
4. **If something is unclear, STOP and report back.**
5. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Builds four social/lock-in systems:
1. **Leaderboard league system** — weekly XP rankings within teams, promotion/demotion between tiers, podium visual
2. **Team quests** — auto-generated + coach-created shared goals, age-appropriate visibility
3. **Notification engine** — decision engine + in-app notifications (no push delivery yet)
4. **XP boost events** — automatic Game Day/Practice Day boosts, coach custom boosts, Weekend Warrior, Early Bird RSVP

---

## PHASE 1: Investigation — Read before writing

Before writing any code, investigate and report:

1. **Does the `players` table have a `date_of_birth` or `birthdate` column?** Check SCHEMA_REFERENCE.csv. Also check if there's a `grade_level` column. Note the exact column names and types.

2. **How does the existing RSVP system work?** Find how `event_rsvps` (or equivalent) stores RSVPs. What columns? How does `usePlayerHomeData` handle RSVP? What's the RSVP flow on the Player Home scroll (the "I'M READY" button)?

3. **Does the app have any existing in-app notification or badge system?** Look for notification icons, badge counts, bell icons, or an inbox/notification screen. Note what exists.

4. **How does `schedule_events` indicate game vs practice?** Confirm the `event_type` column values. Are there other event types besides 'game' and 'practice'?

5. **Where is the existing PlayerLeaderboardPreview component?** Find the file path and understand what data it currently shows and how.

6. **What's the team_players table structure?** We need to query all players on a team for leaderboard ranking. Confirm columns.

**Report findings, then proceed to Phase 2.** Do not wait for confirmation.

---

## PHASE 2: Database additions

Create a new migration:
```
supabase/migrations/20260316_engagement_phase4_social.sql
```

### 2A: Notification engine table

```sql
-- =============================================================================
-- LYNX ENGAGEMENT SYSTEM — PHASE 4: SOCIAL + LOCK-IN
-- Notification engine, team quests, leaderboard support
-- =============================================================================

-- ─── In-app notifications ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  mascot_image TEXT,
  mascot_tone TEXT NOT NULL DEFAULT 'positive',
  action_url TEXT,
  action_data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_player_notifications_player ON player_notifications(player_id, is_read, created_at DESC);
CREATE INDEX idx_player_notifications_type ON player_notifications(notification_type);

ALTER TABLE player_notifications ENABLE ROW LEVEL SECURITY;

-- Players read their own notifications
CREATE POLICY "notifications_player_select" ON player_notifications
  FOR SELECT TO authenticated
  USING (player_id = auth.uid());

-- Players can mark their own as read
CREATE POLICY "notifications_player_update" ON player_notifications
  FOR UPDATE TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- Service/system can insert
CREATE POLICY "notifications_service_insert" ON player_notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);
```

**Column notes:**
- `notification_type`: 'streak_reminder', 'streak_broken', 'streak_milestone', 'quest_reminder', 'quest_expiring', 'team_quest_progress', 'team_quest_complete', 'leaderboard_promotion', 'leaderboard_demotion', 'leaderboard_podium', 'xp_boost_active', 'early_bird', 'coach_challenge', 'badge_earned', 'level_up'
- `mascot_tone`: 'positive' (all ages), 'urgent' (13+ only). The app checks the player's age before displaying urgent-tone notifications.
- `mascot_image`: path to mascot illustration for this notification
- `action_url`: deep link within the app (e.g., 'journey', 'leaderboard', 'quests')
- `action_data`: JSONB for any extra context (e.g., `{"quest_id": "..."}`)
- `expires_at`: notifications auto-hide after this time (e.g., daily quest reminders expire at midnight)

### 2B: Team quests table

```sql
-- ─── Team quests ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  quest_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  xp_reward_per_player INTEGER NOT NULL,
  target_value INTEGER NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  week_start DATE NOT NULL,
  is_auto_generated BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_team_quests_team_week ON team_quests(team_id, week_start);
CREATE INDEX idx_team_quests_active ON team_quests(team_id, is_completed);

ALTER TABLE team_quests ENABLE ROW LEVEL SECURITY;

-- All team members can read their team's quests
CREATE POLICY "team_quests_member_select" ON team_quests
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT tp.team_id FROM team_players tp
      JOIN players p ON p.id = tp.player_id
      WHERE p.parent_account_id = auth.uid()
    )
    OR
    team_id IN (
      SELECT ts.team_id FROM team_staff ts
      WHERE ts.user_id = auth.uid() AND ts.is_active = true
    )
  );

-- Coaches can create team quests
CREATE POLICY "team_quests_coach_insert" ON team_quests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_staff ts
      JOIN user_roles ur ON ur.user_id = ts.user_id
      WHERE ts.user_id = auth.uid()
        AND ts.team_id = team_id
        AND ts.is_active = true
        AND ur.role IN ('head_coach', 'assistant_coach', 'league_admin')
        AND ur.is_active = true
    )
  );

-- Service can insert auto-generated quests and update progress
CREATE POLICY "team_quests_service_insert" ON team_quests
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "team_quests_service_update" ON team_quests
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
```

**Column notes:**
- `quest_type`: 'team_attendance', 'team_shoutouts', 'team_quests_completed', 'team_practice_streak', 'custom'
- `is_auto_generated`: true for system-generated, false for coach-created
- `created_by`: NULL for auto, coach's profile_id for coach-created
- `week_start`: Monday date. Auto-generated quests reset weekly.

### 2C: Team quest contributions tracking

```sql
-- ─── Team quest individual contributions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_quest_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_quest_id UUID NOT NULL REFERENCES team_quests(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contribution_value INTEGER NOT NULL DEFAULT 0,
  last_contributed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_quest_id, player_id)
);

CREATE INDEX idx_tq_contributions_quest ON team_quest_contributions(team_quest_id);
CREATE INDEX idx_tq_contributions_player ON team_quest_contributions(player_id);

ALTER TABLE team_quest_contributions ENABLE ROW LEVEL SECURITY;

-- Team members can read contributions
-- Under-13 check happens in app logic, not RLS
CREATE POLICY "tq_contributions_select" ON team_quest_contributions
  FOR SELECT TO authenticated
  USING (
    team_quest_id IN (
      SELECT tq.id FROM team_quests tq
      WHERE tq.team_id IN (
        SELECT tp.team_id FROM team_players tp
        JOIN players p ON p.id = tp.player_id
        WHERE p.parent_account_id = auth.uid()
      )
    )
    OR
    team_quest_id IN (
      SELECT tq.id FROM team_quests tq
      WHERE tq.team_id IN (
        SELECT ts.team_id FROM team_staff ts
        WHERE ts.user_id = auth.uid() AND ts.is_active = true
      )
    )
  );

-- Service can insert/update
CREATE POLICY "tq_contributions_service_insert" ON team_quest_contributions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "tq_contributions_service_update" ON team_quest_contributions
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
```

### 2D: Early Bird tracking

```sql
-- ─── Early Bird RSVP tracking ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS early_bird_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rsvp_order INTEGER NOT NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, player_id)
);

CREATE INDEX idx_early_bird_event ON early_bird_claims(event_id);

ALTER TABLE early_bird_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "early_bird_select" ON early_bird_claims
  FOR SELECT TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "early_bird_insert" ON early_bird_claims
  FOR INSERT TO authenticated
  WITH CHECK (true);
```

**Commit:** `[engagement-social] Phase 2: database tables for notifications, team quests, early bird`

---

## PHASE 3: Leaderboard Engine

Create a new file:
```
lib/leaderboard-engine.ts
```

This service handles weekly leaderboard calculation, promotion/demotion, and podium awards.

```typescript
import { supabase } from '@/lib/supabase';

// ─── Constants ───────────────────────────────────────────────────────────────

const LEAGUE_TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'] as const;
export type LeagueTier = typeof LEAGUE_TIERS[number];

const PODIUM_XP = { 1: 50, 2: 30, 3: 20 } as const;

// ─── Date Helper ─────────────────────────────────────────────────────────────

function localMondayOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

function previousMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) - 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

// ─── Get or Create Weekly Standings ──────────────────────────────────────────
// Called on app open. Creates this week's standings rows if they don't exist.
// Calculates weekly XP from xp_ledger for the current week.

export async function getOrCreateWeeklyStandings(
  profileId: string,
  teamId: string
): Promise<{
  standings: LeaderboardEntry[];
  myRank: number;
  myTier: LeagueTier;
  teamSize: number;
}> {
  const weekStart = localMondayOfWeek();

  // Check if this week's standings exist for this team
  const { data: existing } = await supabase
    .from('league_standings')
    .select('*')
    .eq('team_id', teamId)
    .eq('week_start', weekStart)
    .order('weekly_xp', { ascending: false });

  if (existing && existing.length > 0) {
    // Refresh the current player's weekly XP (it may have changed since last check)
    await refreshPlayerWeeklyXp(profileId, teamId, weekStart);

    // Re-fetch with updated XP
    const { data: refreshed } = await supabase
      .from('league_standings')
      .select('*, profile:player_id(full_name)')
      .eq('team_id', teamId)
      .eq('week_start', weekStart)
      .order('weekly_xp', { ascending: false });

    const standings = (refreshed || []).map((s: any, idx: number) => ({
      ...s,
      rank: idx + 1,
      playerName: s.profile?.full_name || 'Player',
    }));

    const myEntry = standings.find((s: any) => s.player_id === profileId);

    return {
      standings,
      myRank: myEntry?.rank || 0,
      myTier: (myEntry?.league_tier || 'Bronze') as LeagueTier,
      teamSize: standings.length,
    };
  }

  // Create this week's standings for all players on the team
  // First, get all players on the team
  const { data: teamPlayers } = await supabase
    .from('team_players')
    .select('player_id, players!inner(parent_account_id)')
    .eq('team_id', teamId);

  if (!teamPlayers || teamPlayers.length === 0) {
    return { standings: [], myRank: 0, myTier: 'Bronze', teamSize: 0 };
  }

  // Get each player's profile ID and their current tier from last week
  const playerProfileIds = teamPlayers
    .map((tp: any) => tp.players?.parent_account_id)
    .filter(Boolean);

  // Get last week's standings for tier carryover
  const lastWeek = previousMonday();
  const { data: lastWeekStandings } = await supabase
    .from('league_standings')
    .select('player_id, league_tier')
    .eq('team_id', teamId)
    .eq('week_start', lastWeek);

  const lastTierMap: Record<string, string> = {};
  if (lastWeekStandings) {
    lastWeekStandings.forEach((s: any) => {
      lastTierMap[s.player_id] = s.league_tier;
    });
  }

  // Calculate weekly XP for each player from xp_ledger
  const weekStartDate = new Date(weekStart + 'T00:00:00').toISOString();
  const rows = [];

  for (const pid of playerProfileIds) {
    const { data: xpData } = await supabase
      .from('xp_ledger')
      .select('xp_amount')
      .eq('player_id', pid)
      .gte('created_at', weekStartDate);

    const weeklyXp = (xpData || []).reduce((sum: number, row: any) => sum + (row.xp_amount || 0), 0);
    const tier = lastTierMap[pid] || 'Bronze';

    rows.push({
      player_id: pid,
      team_id: teamId,
      league_tier: tier,
      week_start: weekStart,
      weekly_xp: weeklyXp,
      rank_in_team: null,
      promotion_status: 'none',
    });
  }

  // Sort by XP and assign ranks
  rows.sort((a, b) => b.weekly_xp - a.weekly_xp);
  rows.forEach((row, idx) => { row.rank_in_team = idx + 1; });

  // Insert
  const { error: insertError } = await supabase
    .from('league_standings')
    .upsert(rows, { onConflict: 'player_id,team_id,week_start' });

  if (insertError) {
    console.error('[leaderboard-engine] Error creating standings:', insertError);
  }

  // Fetch with profile names
  const { data: final } = await supabase
    .from('league_standings')
    .select('*, profile:player_id(full_name)')
    .eq('team_id', teamId)
    .eq('week_start', weekStart)
    .order('weekly_xp', { ascending: false });

  const standings = (final || []).map((s: any, idx: number) => ({
    ...s,
    rank: idx + 1,
    playerName: s.profile?.full_name || 'Player',
  }));

  const myEntry = standings.find((s: any) => s.player_id === profileId);

  return {
    standings,
    myRank: myEntry?.rank || 0,
    myTier: (myEntry?.league_tier || 'Bronze') as LeagueTier,
    teamSize: standings.length,
  };
}

// ─── Refresh a single player's weekly XP ─────────────────────────────────────

async function refreshPlayerWeeklyXp(profileId: string, teamId: string, weekStart: string) {
  const weekStartDate = new Date(weekStart + 'T00:00:00').toISOString();

  const { data: xpData } = await supabase
    .from('xp_ledger')
    .select('xp_amount')
    .eq('player_id', profileId)
    .gte('created_at', weekStartDate);

  const weeklyXp = (xpData || []).reduce((sum: number, row: any) => sum + (row.xp_amount || 0), 0);

  await supabase
    .from('league_standings')
    .update({ weekly_xp: weeklyXp, updated_at: new Date().toISOString() })
    .eq('player_id', profileId)
    .eq('team_id', teamId)
    .eq('week_start', weekStart);
}

// ─── Process Weekly Reset (called on first Monday open) ──────────────────────
// Calculates promotion/demotion from LAST week's final standings.

export async function processWeeklyLeaderboardReset(
  teamId: string
): Promise<void> {
  const lastWeek = previousMonday();

  // Get last week's standings
  const { data: lastStandings } = await supabase
    .from('league_standings')
    .select('*')
    .eq('team_id', teamId)
    .eq('week_start', lastWeek)
    .order('weekly_xp', { ascending: false });

  if (!lastStandings || lastStandings.length === 0) return;

  // Check if promotion/demotion was already processed
  const alreadyProcessed = lastStandings.some((s: any) => s.promotion_status !== 'none');
  if (alreadyProcessed) return;

  const teamSize = lastStandings.length;

  // Determine promotion/demotion counts based on team size
  let promoteCount: number;
  let demoteCount: number;

  if (teamSize <= 5) {
    promoteCount = 2;
    demoteCount = 0; // No demotion for small teams
  } else if (teamSize <= 9) {
    promoteCount = 2;
    demoteCount = 2;
  } else {
    promoteCount = 3;
    demoteCount = 3;
  }

  // Assign ranks (already sorted by XP desc)
  for (let i = 0; i < lastStandings.length; i++) {
    const entry = lastStandings[i];
    const rank = i + 1;
    let status = 'maintained';

    // Check for 2+ consecutive weeks of 0 XP for demotion
    let shouldDemoteInactive = false;
    if (entry.weekly_xp === 0 && demoteCount > 0) {
      // Check the week before last
      const twoWeeksAgo = getTwoWeeksAgoMonday();
      const { data: prevWeek } = await supabase
        .from('league_standings')
        .select('weekly_xp')
        .eq('player_id', entry.player_id)
        .eq('team_id', teamId)
        .eq('week_start', twoWeeksAgo)
        .maybeSingle();

      if (prevWeek && prevWeek.weekly_xp === 0) {
        shouldDemoteInactive = true;
      }
    }

    if (rank <= promoteCount && entry.weekly_xp > 0) {
      // Promote (only if they earned XP)
      const currentTierIdx = LEAGUE_TIERS.indexOf(entry.league_tier as LeagueTier);
      if (currentTierIdx < LEAGUE_TIERS.length - 1) {
        status = 'promoted';
        const newTier = LEAGUE_TIERS[currentTierIdx + 1];

        // Update this week's standings with new tier
        await supabase
          .from('league_standings')
          .update({ league_tier: newTier })
          .eq('player_id', entry.player_id)
          .eq('team_id', teamId)
          .eq('week_start', localMondayOfWeek());
      }

      // Award podium XP
      const podiumXp = PODIUM_XP[rank as keyof typeof PODIUM_XP];
      if (podiumXp) {
        await supabase.from('xp_ledger').insert({
          player_id: entry.player_id,
          xp_amount: podiumXp,
          source_type: 'leaderboard_bonus',
          description: `Weekly leaderboard #${rank}: +${podiumXp} XP`,
          team_id: teamId,
        });
      }
    } else if (
      (rank > teamSize - demoteCount && demoteCount > 0 && entry.weekly_xp > 0) ||
      shouldDemoteInactive
    ) {
      // Demote
      const currentTierIdx = LEAGUE_TIERS.indexOf(entry.league_tier as LeagueTier);
      if (currentTierIdx > 0) {
        status = 'demoted';
        const newTier = LEAGUE_TIERS[currentTierIdx - 1];

        await supabase
          .from('league_standings')
          .update({ league_tier: newTier })
          .eq('player_id', entry.player_id)
          .eq('team_id', teamId)
          .eq('week_start', localMondayOfWeek());
      }
    }

    // Update last week's entry with final status and rank
    await supabase
      .from('league_standings')
      .update({
        rank_in_team: rank,
        promotion_status: status,
      })
      .eq('id', entry.id);
  }
}

function getTwoWeeksAgoMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) - 14;
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

export interface LeaderboardEntry {
  id: string;
  player_id: string;
  team_id: string;
  league_tier: LeagueTier;
  week_start: string;
  weekly_xp: number;
  rank_in_team: number;
  promotion_status: string;
  rank: number;
  playerName: string;
}
```

**Commit:** `[engagement-social] Phase 3: leaderboard engine`

---

## PHASE 4: Team Quest Engine

Create a new file:
```
lib/team-quest-engine.ts
```

```typescript
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TeamQuest {
  id: string;
  team_id: string;
  quest_type: string;
  title: string;
  description: string | null;
  xp_reward_per_player: number;
  target_value: number;
  current_value: number;
  is_completed: boolean;
  completed_at: string | null;
  week_start: string;
  is_auto_generated: boolean;
  contributions?: TeamQuestContribution[];
}

export interface TeamQuestContribution {
  player_id: string;
  player_name: string;
  contribution_value: number;
}

// ─── Date Helper ─────────────────────────────────────────────────────────────

function localMondayOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

// ─── Get or Create Weekly Team Quests ────────────────────────────────────────

export async function getOrCreateTeamQuests(teamId: string): Promise<TeamQuest[]> {
  const weekStart = localMondayOfWeek();

  // Check for existing
  const { data: existing } = await supabase
    .from('team_quests')
    .select('*')
    .eq('team_id', teamId)
    .eq('week_start', weekStart)
    .order('created_at', { ascending: true });

  if (existing && existing.length > 0) {
    return existing as TeamQuest[];
  }

  // Auto-generate 2 team quests for the week
  const quests = [];

  // Quest 1: Team attendance
  // Check how many events this week
  const sunday = sundayOfWeek();
  const { data: events } = await supabase
    .from('schedule_events')
    .select('id')
    .eq('team_id', teamId)
    .gte('event_date', weekStart)
    .lte('event_date', sunday);

  const eventCount = events?.length || 0;

  if (eventCount > 0) {
    // Get team size for target calculation
    const { data: teamPlayers } = await supabase
      .from('team_players')
      .select('id')
      .eq('team_id', teamId);

    const teamSize = teamPlayers?.length || 1;
    // Target: 80% of team attends at least 1 event
    const attendanceTarget = Math.max(Math.ceil(teamSize * 0.8), 2);

    quests.push({
      team_id: teamId,
      quest_type: 'team_attendance',
      title: `${attendanceTarget} players attend this week`,
      description: 'Show up as a squad.',
      xp_reward_per_player: 50,
      target_value: attendanceTarget,
      current_value: 0,
      is_completed: false,
      completed_at: null,
      week_start: weekStart,
      is_auto_generated: true,
      created_by: null,
    });
  }

  // Quest 2: Team shoutouts
  quests.push({
    team_id: teamId,
    quest_type: 'team_shoutouts',
    title: 'Team gives 15 shoutouts this week',
    description: 'Lift each other up. Every shoutout counts.',
    xp_reward_per_player: 30,
    target_value: 15,
    current_value: 0,
    is_completed: false,
    completed_at: null,
    week_start: weekStart,
    is_auto_generated: true,
    created_by: null,
  });

  // Insert
  const { data: inserted, error } = await supabase
    .from('team_quests')
    .insert(quests)
    .select('*');

  if (error) {
    console.error('[team-quest-engine] Error creating team quests:', error);
    return [];
  }

  return (inserted || []) as TeamQuest[];
}

function sundayOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  const sunday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
}

// ─── Update Team Quest Progress ──────────────────────────────────────────────

export async function updateTeamQuestProgress(
  teamId: string,
  questType: string,
  playerProfileId: string,
  incrementBy: number = 1
): Promise<{ questCompleted: boolean }> {
  const weekStart = localMondayOfWeek();

  const { data: quest } = await supabase
    .from('team_quests')
    .select('*')
    .eq('team_id', teamId)
    .eq('week_start', weekStart)
    .eq('quest_type', questType)
    .eq('is_completed', false)
    .maybeSingle();

  if (!quest) return { questCompleted: false };

  // Update individual contribution
  const { data: existingContrib } = await supabase
    .from('team_quest_contributions')
    .select('*')
    .eq('team_quest_id', quest.id)
    .eq('player_id', playerProfileId)
    .maybeSingle();

  if (existingContrib) {
    await supabase
      .from('team_quest_contributions')
      .update({
        contribution_value: existingContrib.contribution_value + incrementBy,
        last_contributed_at: new Date().toISOString(),
      })
      .eq('id', existingContrib.id);
  } else {
    await supabase
      .from('team_quest_contributions')
      .insert({
        team_quest_id: quest.id,
        player_id: playerProfileId,
        contribution_value: incrementBy,
      });
  }

  // Update team quest total
  const newValue = Math.min(quest.current_value + incrementBy, quest.target_value);
  const nowComplete = newValue >= quest.target_value;

  await supabase
    .from('team_quests')
    .update({
      current_value: newValue,
      ...(nowComplete ? { is_completed: true, completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', quest.id);

  // If completed, award XP to all team members
  if (nowComplete) {
    await awardTeamQuestXp(quest);
  }

  return { questCompleted: nowComplete };
}

// ─── Award XP to all team members ────────────────────────────────────────────

async function awardTeamQuestXp(quest: any) {
  const { data: teamPlayers } = await supabase
    .from('team_players')
    .select('players!inner(parent_account_id)')
    .eq('team_id', quest.team_id);

  if (!teamPlayers) return;

  const profileIds = teamPlayers
    .map((tp: any) => tp.players?.parent_account_id)
    .filter(Boolean);

  for (const pid of profileIds) {
    // Write XP ledger entry
    await supabase.from('xp_ledger').insert({
      player_id: pid,
      xp_amount: quest.xp_reward_per_player,
      source_type: 'team_quest',
      source_id: quest.id,
      description: `Team quest complete: ${quest.title}`,
      team_id: quest.team_id,
    });

    // Update profiles.total_xp
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_xp')
      .eq('id', pid)
      .single();

    if (profile) {
      const { calculateLevel } = require('@/lib/quest-engine');
      const newTotal = (profile.total_xp || 0) + quest.xp_reward_per_player;
      const { level, tier, xpToNext } = calculateLevel(newTotal);

      await supabase
        .from('profiles')
        .update({
          total_xp: newTotal,
          player_level: level,
          tier: tier,
          xp_to_next_level: xpToNext,
        })
        .eq('id', pid);
    }
  }
}

// ─── Get contributions with age-based visibility ─────────────────────────────

export async function getTeamQuestContributions(
  teamQuestId: string,
  viewerProfileId: string
): Promise<{
  contributions: TeamQuestContribution[];
  showIndividualNames: boolean;
}> {
  // Check viewer's age
  const { data: playerData } = await supabase
    .from('players')
    .select('date_of_birth')
    .eq('parent_account_id', viewerProfileId)
    .limit(1)
    .maybeSingle();

  let showNames = true;
  if (playerData?.date_of_birth) {
    const birthDate = new Date(playerData.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      showNames = age - 1 >= 13;
    } else {
      showNames = age >= 13;
    }
  }

  const { data: contributions } = await supabase
    .from('team_quest_contributions')
    .select('*, profile:player_id(full_name)')
    .eq('team_quest_id', teamQuestId)
    .order('contribution_value', { ascending: false });

  const mapped = (contributions || []).map((c: any) => ({
    player_id: c.player_id,
    player_name: showNames ? (c.profile?.full_name || 'Player') : 'Teammate',
    contribution_value: c.contribution_value,
  }));

  return { contributions: mapped, showIndividualNames: showNames };
}
```

**IMPORTANT:** The `date_of_birth` column name is based on the investigation in Phase 1. If the actual column name is different (e.g., `birthdate`, `dob`), adjust accordingly.

**Commit:** `[engagement-social] Phase 4: team quest engine`

---

## PHASE 5: Notification Engine

Create a new file:
```
lib/notification-engine.ts
```

```typescript
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlayerNotification {
  id: string;
  player_id: string;
  notification_type: string;
  title: string;
  body: string | null;
  mascot_image: string | null;
  mascot_tone: 'positive' | 'urgent';
  action_url: string | null;
  action_data: any;
  is_read: boolean;
  created_at: string;
}

// ─── Notification Templates ──────────────────────────────────────────────────
// Two tones per notification: positive (all ages) and urgent (13+ only)

const TEMPLATES: Record<string, { positive: { title: string; body: string }; urgent: { title: string; body: string }; mascot: string }> = {
  streak_reminder: {
    positive: { title: 'Keep it going!', body: 'Open Lynx today to keep your streak alive.' },
    urgent: { title: 'Your streak is on the line!', body: 'You haven\'t opened Lynx today. Don\'t let your streak end.' },
    mascot: 'assets/images/activitiesmascot/2DAYSTREAKNEXTLEVEL.png',
  },
  streak_broken: {
    positive: { title: 'New day, new streak!', body: 'Start a fresh streak today. Every champion starts at day 1.' },
    urgent: { title: 'Your streak ended.', body: 'Start a new one today. Come back stronger.' },
    mascot: 'assets/images/activitiesmascot/NOSTREAK.png',
  },
  streak_milestone: {
    positive: { title: 'Streak milestone!', body: 'Amazing consistency! You earned a streak freeze.' },
    urgent: { title: 'Streak milestone!', body: 'You earned a streak freeze. Keep the fire going.' },
    mascot: 'assets/images/activitiesmascot/7DAYSTREAK.png',
  },
  quest_reminder: {
    positive: { title: 'Quests are waiting!', body: 'You have daily quests ready. Quick XP up for grabs.' },
    urgent: { title: 'Don\'t miss today\'s quests!', body: 'Your daily quests reset at midnight. Get them done.' },
    mascot: 'assets/images/activitiesmascot/LYNXREADY.png',
  },
  quest_expiring: {
    positive: { title: 'Almost out of time!', body: 'Your weekly quests reset Monday. Finish strong.' },
    urgent: { title: 'Weekly quests expire tonight!', body: 'Sunday night. Last chance for your weekly bonus.' },
    mascot: 'assets/images/activitiesmascot/SURPRISED.png',
  },
  team_quest_progress: {
    positive: { title: 'Your team is making moves!', body: 'The team quest is getting closer. Keep contributing.' },
    urgent: { title: 'Team quest almost done!', body: 'Your team is close. A few more contributions and everyone earns XP.' },
    mascot: 'assets/images/activitiesmascot/TEAMHUDDLE.png',
  },
  team_quest_complete: {
    positive: { title: 'Team quest complete!', body: 'Your whole team earned XP. That\'s teamwork.' },
    urgent: { title: 'Team quest complete!', body: 'Squad goals. Everyone just earned bonus XP.' },
    mascot: 'assets/images/activitiesmascot/TEAMACHIEVEMENT.png',
  },
  leaderboard_promotion: {
    positive: { title: 'Moving up!', body: 'You got promoted to a new league tier. Keep climbing.' },
    urgent: { title: 'League promotion!', body: 'You moved up. The competition just got real.' },
    mascot: 'assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png',
  },
  leaderboard_podium: {
    positive: { title: 'Podium finish!', body: 'You finished in the top 3 this week. Bonus XP earned.' },
    urgent: { title: 'Top 3 this week!', body: 'Podium finish. The team sees you. Keep dominating.' },
    mascot: 'assets/images/activitiesmascot/onfire.png',
  },
  xp_boost_active: {
    positive: { title: 'XP boost active!', body: 'Earn bonus XP on everything today. Make it count.' },
    urgent: { title: '2x XP is live!', body: 'Game day boost. Everything you do earns double.' },
    mascot: 'assets/images/activitiesmascot/onfire.png',
  },
  level_up: {
    positive: { title: 'Level up!', body: 'You reached a new level. New content unlocked.' },
    urgent: { title: 'LEVEL UP!', body: 'You just leveled up. Go see what you unlocked.' },
    mascot: 'assets/images/activitiesmascot/EXCITEDACHIEVEMENT.png',
  },
};

// ─── Create Notification ─────────────────────────────────────────────────────

export async function createNotification(
  playerProfileId: string,
  notificationType: string,
  options?: {
    teamId?: string;
    actionUrl?: string;
    actionData?: any;
    expiresAt?: string;
    customTitle?: string;
    customBody?: string;
  }
): Promise<void> {
  const template = TEMPLATES[notificationType];
  if (!template && !options?.customTitle) {
    console.error('[notification-engine] Unknown notification type:', notificationType);
    return;
  }

  // Determine tone based on player age
  const tone = await getPlayerTone(playerProfileId);

  const toneTemplate = template ? template[tone] : null;
  const title = options?.customTitle || toneTemplate?.title || 'Notification';
  const body = options?.customBody || toneTemplate?.body || '';
  const mascotImage = template?.mascot || 'assets/images/activitiesmascot/LYNXREADY.png';

  // Check for duplicate (don't send same notification type twice in same hour)
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const { data: recent } = await supabase
    .from('player_notifications')
    .select('id')
    .eq('player_id', playerProfileId)
    .eq('notification_type', notificationType)
    .gte('created_at', oneHourAgo.toISOString())
    .maybeSingle();

  if (recent) return; // Already sent recently

  // Check daily limit (max 2 per day)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: todayCount } = await supabase
    .from('player_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerProfileId)
    .gte('created_at', todayStart.toISOString());

  if ((todayCount || 0) >= 2) return; // Daily limit reached

  await supabase.from('player_notifications').insert({
    player_id: playerProfileId,
    team_id: options?.teamId || null,
    notification_type: notificationType,
    title,
    body,
    mascot_image: mascotImage,
    mascot_tone: tone,
    action_url: options?.actionUrl || null,
    action_data: options?.actionData || null,
    expires_at: options?.expiresAt || null,
  });
}

// ─── Get Player Notifications ────────────────────────────────────────────────

export async function getPlayerNotifications(
  profileId: string,
  limit: number = 20
): Promise<PlayerNotification[]> {
  const { data } = await supabase
    .from('player_notifications')
    .select('*')
    .eq('player_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []) as PlayerNotification[];
}

// ─── Get Unread Count ────────────────────────────────────────────────────────

export async function getUnreadNotificationCount(profileId: string): Promise<number> {
  const { count } = await supabase
    .from('player_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', profileId)
    .eq('is_read', false);

  return count || 0;
}

// ─── Mark as Read ────────────────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from('player_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
}

export async function markAllNotificationsRead(profileId: string): Promise<void> {
  await supabase
    .from('player_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('player_id', profileId)
    .eq('is_read', false);
}

// ─── Helper: Determine tone by age ───────────────────────────────────────────

async function getPlayerTone(profileId: string): Promise<'positive' | 'urgent'> {
  const { data: playerData } = await supabase
    .from('players')
    .select('date_of_birth')
    .eq('parent_account_id', profileId)
    .limit(1)
    .maybeSingle();

  if (!playerData?.date_of_birth) return 'positive'; // Default to safe tone

  const birthDate = new Date(playerData.date_of_birth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 13 ? 'urgent' : 'positive';
}
```

**Commit:** `[engagement-social] Phase 5: notification engine`

---

## PHASE 6: XP Boost Engine

Create a new file:
```
lib/xp-boost-engine.ts
```

```typescript
import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notification-engine';

// ─── Check and Create Auto Boosts ───────────────────────────────────────────
// Called on app open. Checks schedule_events for today and creates boosts.

export async function checkAndCreateAutoBoosts(teamId: string): Promise<void> {
  const today = localToday();
  const now = new Date().toISOString();

  // Check if boost already exists for today
  const todayStart = new Date(today + 'T00:00:00').toISOString();
  const todayEnd = new Date(today + 'T23:59:59').toISOString();

  const { data: existingBoost } = await supabase
    .from('xp_boost_events')
    .select('id')
    .eq('team_id', teamId)
    .gte('starts_at', todayStart)
    .lte('starts_at', todayEnd)
    .maybeSingle();

  if (existingBoost) return; // Already created

  // Check for today's events
  const { data: todayEvents } = await supabase
    .from('schedule_events')
    .select('event_type')
    .eq('team_id', teamId)
    .eq('event_date', today);

  if (!todayEvents || todayEvents.length === 0) {
    // Check for Weekend Warrior (Saturday/Sunday)
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      await supabase.from('xp_boost_events').insert({
        team_id: null, // Global boost
        boost_type: 'weekend_warrior',
        multiplier: 1.00, // Weekend Warrior is a flat +25 XP bonus, not a multiplier
        starts_at: todayStart,
        ends_at: todayEnd,
        applicable_sources: ['skill_tip', 'skill_drill', 'skill_quiz', 'journey_node'],
      });
    }
    return;
  }

  const hasGame = todayEvents.some((e: any) => e.event_type === 'game');
  const hasPractice = todayEvents.some((e: any) => e.event_type === 'practice');

  if (hasGame) {
    await supabase.from('xp_boost_events').insert({
      team_id: teamId,
      boost_type: 'game_day',
      multiplier: 2.00,
      starts_at: todayStart,
      ends_at: todayEnd,
      applicable_sources: null, // All sources
    });

    // Notify team
    await notifyTeamOfBoost(teamId, 'Game day! 2x XP on everything today.');
  } else if (hasPractice) {
    await supabase.from('xp_boost_events').insert({
      team_id: teamId,
      boost_type: 'practice_day',
      multiplier: 1.50,
      starts_at: todayStart,
      ends_at: todayEnd,
      applicable_sources: ['skill_drill', 'quest_daily', 'skill_quiz'],
    });

    await notifyTeamOfBoost(teamId, 'Practice day! 1.5x XP on drills and quests.');
  }
}

// ─── Early Bird RSVP ─────────────────────────────────────────────────────────

export async function checkEarlyBird(
  eventId: string,
  playerProfileId: string
): Promise<{ isEarlyBird: boolean; rsvpOrder: number; xpAwarded: number }> {
  // Check if already claimed
  const { data: existing } = await supabase
    .from('early_bird_claims')
    .select('id')
    .eq('event_id', eventId)
    .eq('player_id', playerProfileId)
    .maybeSingle();

  if (existing) return { isEarlyBird: false, rsvpOrder: 0, xpAwarded: 0 };

  // Count how many have already claimed for this event
  const { count } = await supabase
    .from('early_bird_claims')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  const currentCount = count || 0;

  if (currentCount >= 5) return { isEarlyBird: false, rsvpOrder: 0, xpAwarded: 0 };

  // Claim Early Bird
  const rsvpOrder = currentCount + 1;
  const xpAmount = 10;

  await supabase.from('early_bird_claims').insert({
    event_id: eventId,
    player_id: playerProfileId,
    rsvp_order: rsvpOrder,
    xp_awarded: xpAmount,
  });

  // Award XP
  await supabase.from('xp_ledger').insert({
    player_id: playerProfileId,
    xp_amount: xpAmount,
    source_type: 'rsvp',
    source_id: eventId,
    description: `Early Bird #${rsvpOrder}: +${xpAmount} XP`,
  });

  // Update profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('id', playerProfileId)
    .single();

  if (profile) {
    const { calculateLevel } = require('@/lib/quest-engine');
    const newTotal = (profile.total_xp || 0) + xpAmount;
    const { level, tier, xpToNext } = calculateLevel(newTotal);

    await supabase
      .from('profiles')
      .update({ total_xp: newTotal, player_level: level, tier, xp_to_next_level: xpToNext })
      .eq('id', playerProfileId);
  }

  return { isEarlyBird: true, rsvpOrder, xpAwarded: xpAmount };
}

// ─── Helper: Notify all team players ─────────────────────────────────────────

async function notifyTeamOfBoost(teamId: string, message: string) {
  const { data: teamPlayers } = await supabase
    .from('team_players')
    .select('players!inner(parent_account_id)')
    .eq('team_id', teamId);

  if (!teamPlayers) return;

  const profileIds = teamPlayers
    .map((tp: any) => tp.players?.parent_account_id)
    .filter(Boolean);

  for (const pid of profileIds) {
    await createNotification(pid, 'xp_boost_active', {
      teamId,
      customBody: message,
      expiresAt: new Date(new Date().setHours(23, 59, 59)).toISOString(),
    });
  }
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
```

**Commit:** `[engagement-social] Phase 6: XP boost engine with Early Bird`

---

## PHASE 7: Create hooks

Create these three hook files:

### hooks/useLeaderboard.ts

```typescript
import { useState, useEffect, useCallback } from 'react';
import {
  getOrCreateWeeklyStandings,
  processWeeklyLeaderboardReset,
  LeaderboardEntry,
  LeagueTier,
} from '@/lib/leaderboard-engine';
import { supabase } from '@/lib/supabase';

export function useLeaderboard(teamId: string | null) {
  const [standings, setStandings] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [myTier, setMyTier] = useState<LeagueTier>('Bronze');
  const [teamSize, setTeamSize] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Process weekly reset if needed (handles promotion/demotion from last week)
      await processWeeklyLeaderboardReset(teamId);

      const result = await getOrCreateWeeklyStandings(user.id, teamId);
      setStandings(result.standings);
      setMyRank(result.myRank);
      setMyTier(result.myTier);
      setTeamSize(result.teamSize);
    } catch (err) {
      console.error('[useLeaderboard] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return { standings, myRank, myTier, teamSize, loading, refreshLeaderboard: loadLeaderboard };
}
```

### hooks/useTeamQuests.ts

```typescript
import { useState, useEffect, useCallback } from 'react';
import { getOrCreateTeamQuests, TeamQuest } from '@/lib/team-quest-engine';
import { supabase } from '@/lib/supabase';

export function useTeamQuests(teamId: string | null) {
  const [quests, setQuests] = useState<TeamQuest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQuests = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const teamQuests = await getOrCreateTeamQuests(teamId);
      setQuests(teamQuests);
    } catch (err) {
      console.error('[useTeamQuests] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  return { quests, loading, refreshQuests: loadQuests };
}
```

### hooks/useNotifications.ts

```typescript
import { useState, useEffect, useCallback } from 'react';
import {
  getPlayerNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  PlayerNotification,
} from '@/lib/notification-engine';
import { supabase } from '@/lib/supabase';

export function useNotifications() {
  const [notifications, setNotifications] = useState<PlayerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [notifs, count] = await Promise.all([
        getPlayerNotifications(user.id),
        getUnreadNotificationCount(user.id),
      ]);

      setNotifications(notifs);
      setUnreadCount(count);
    } catch (err) {
      console.error('[useNotifications] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await markAllNotificationsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, loading, refreshNotifications: loadNotifications, markRead, markAllRead };
}
```

**Commit:** `[engagement-social] Phase 7: hooks for leaderboard, team quests, notifications`

---

## PHASE 8: Wire Early Bird into RSVP flow

**File to modify:** Find the file that handles RSVP submission (likely in `usePlayerHomeData.ts` where `sendRsvp` is defined, or in the component that has the "I'M READY" button).

After the existing RSVP upsert, add the Early Bird check:

```typescript
import { checkEarlyBird } from '@/lib/xp-boost-engine';

// After the RSVP is saved:
const earlyBirdResult = await checkEarlyBird(eventId, user.id);
// earlyBirdResult.isEarlyBird, earlyBirdResult.rsvpOrder, earlyBirdResult.xpAwarded
// The UI can show a toast: "Early Bird #2! +10 XP"
```

**IMPORTANT:** Only add the Early Bird call. Do not change the existing RSVP logic.

**Commit:** `[engagement-social] Phase 8: wire Early Bird into RSVP`

---

## PHASE 9: Wire XP boost check into app open

**File to modify:** `hooks/usePlayerHomeData.ts`

Near the top of the data fetching logic (where team data is available), add:

```typescript
import { checkAndCreateAutoBoosts } from '@/lib/xp-boost-engine';

// After teamIds are determined:
if (primaryTeamId) {
  await checkAndCreateAutoBoosts(primaryTeamId);
}
```

This checks for Game Day / Practice Day / Weekend Warrior boosts on every app open. The boost engine handles deduplication internally.

**IMPORTANT:** Only add the boost check call. Do not change the existing data fetching logic.

**Commit:** `[engagement-social] Phase 9: wire auto XP boosts into app open`

---

## PHASE 10: Verification

### Verify:

1. **New tables created:** player_notifications, team_quests, team_quest_contributions, early_bird_claims (4 tables)
2. **RLS enabled** on all 4 new tables with appropriate policies
3. **Service files created:** leaderboard-engine.ts, team-quest-engine.ts, notification-engine.ts, xp-boost-engine.ts
4. **Hooks created:** useLeaderboard.ts, useTeamQuests.ts, useNotifications.ts
5. **Early Bird wired** into RSVP flow
6. **Auto boosts wired** into app open
7. **No TypeScript errors** (`npx tsc --noEmit`)
8. **Age check works:** notification-engine and team-quest-engine both check date_of_birth for under-13/13+ logic. Verify the column name matches the actual schema.

### Report back with:

```
## VERIFICATION REPORT: Phase 4

### Database:
- Tables created: [count]/4
- RLS policies: [count]
- Indexes: [count]

### Services Created:
- lib/leaderboard-engine.ts: [lines] lines
- lib/team-quest-engine.ts: [lines] lines
- lib/notification-engine.ts: [lines] lines
- lib/xp-boost-engine.ts: [lines] lines

### Hooks Created:
- hooks/useLeaderboard.ts: [lines] lines
- hooks/useTeamQuests.ts: [lines] lines
- hooks/useNotifications.ts: [lines] lines

### Integrations:
- Early Bird in RSVP: WIRED / NOT WIRED
- Auto boosts on app open: WIRED / NOT WIRED

### Age Check:
- date_of_birth column found: YES / NO (actual column name: [name])
- Under-13 logic in notification engine: YES / NO
- Under-13 logic in team quest contributions: YES / NO

### Type Check: PASS / FAIL

### Files Modified (existing):
[list with description]

### Errors: NONE / [list]
```
