# CC-ENGAGEMENT-PHASE7-COACH-DASHBOARD
# Lynx Player Engagement System — Phase 7: Coach Engagement Dashboard
# Status: READY FOR CC EXECUTION
# Depends on: All Phases 1-6 complete

---

## STANDING RULES

1. **Read these files first, in order:**
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
   - `SCHEMA_REFERENCE.csv` in repo root
   - `LYNX-REFERENCE-GUIDE.md` in repo root
   - `MASCOT-ASSET-MAP.md` in repo root
2. **Read the existing Coach Home scroll components to match design tokens:**
   - Find the Coach Home scroll component (likely `components/coach-scroll/` or `components/CoachHomeScroll.tsx`)
   - Read the coach theme/color tokens, card patterns, and layout structure
   - Read how coach components access team data (team_staff, team_players joins)
3. **Do NOT modify any engine files (lib/*.ts), player components, or database migrations.**
4. **Commit after each phase.** Commit message format: `[coach-engagement] Phase X: description`
5. **If something is unclear, STOP and report back.**
6. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Builds the coach-facing engagement dashboard:
1. **useCoachEngagement hook** — fetches all engagement metrics for a team's players
2. **CoachEngagementCard** — compact card on the Coach Home scroll showing team engagement highlights
3. **CoachEngagementScreen** — full screen with player-by-player table, team stats, streak leaderboard, journey progress, quest rates, and inactive player flags

---

## PHASE 1: Investigation — Read before writing

Before writing any code, read and report:

1. **Where is the Coach Home scroll?** Find the exact file path. Is it `components/CoachHomeScroll.tsx`, `components/coach-scroll/CoachHomeScroll.tsx`, or something else? List the components it renders in order.

2. **How does the coach access their team?** Find how `teamId` is determined for coach views. Is it from `useCoachHomeData`, `team_staff`, or a team selector? Show the pattern.

3. **How does the coach access the player roster?** Find the query pattern that gets all players on the coach's team. Show the join path (team_staff > team_players > players > profiles).

4. **What design tokens does the coach scroll use?** Same D_COLORS / PLAYER_THEME as player scroll, or different? Check for COACH_THEME or similar. Note: font families, card colors, section header styles.

5. **What's the existing card pattern on the Coach Home scroll?** Show one example card component — its dimensions, styling approach, how it handles loading state.

6. **Does a "Smart Nudge" card exist on the Coach Home?** The D system describes contextual nudge cards. Find if there's an existing component for data-driven coach suggestions (e.g., "Ava had 20 kills — give her a shoutout?").

7. **How does the existing CoachHomeScroll add new sections?** Is it a flat list of components, a ScrollView with direct children, or a config-driven layout?

**Report findings, then proceed to Phase 2.** Do not wait for confirmation.

---

## PHASE 2: Create useCoachEngagement hook

Create a new file:
```
hooks/useCoachEngagement.ts
```

This hook fetches all engagement data for the coach's team.

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlayerEngagementData {
  profileId: string;
  playerId: string;
  playerName: string;
  // XP
  totalXp: number;
  weeklyXp: number;
  level: number;
  tier: string;
  // Streak
  currentStreak: number;
  longestStreak: number;
  // Quests
  dailyQuestsCompletedToday: number;
  dailyQuestsTotalToday: number;
  weeklyQuestsCompletedThisWeek: number;
  weeklyQuestsTotalThisWeek: number;
  // Journey
  journeyNodesCompleted: number;
  journeyNodesTotal: number;
  currentChapter: string | null;
  // Activity
  lastActiveDate: string | null;
  daysSinceActive: number;
  isInactive: boolean; // 3+ days without activity
}

export interface TeamEngagementSummary {
  totalPlayers: number;
  activePlayers: number;        // active in last 3 days
  activePercent: number;
  avgWeeklyXp: number;
  avgStreak: number;
  longestTeamStreak: number;
  longestStreakPlayerName: string;
  questCompletionRate: number;  // % of daily quests completed today across team
  inactivePlayers: PlayerEngagementData[];  // 3+ days without activity
  topEngaged: PlayerEngagementData[];       // top 3 by weekly XP
}

export function useCoachEngagement(teamId: string | null) {
  const [players, setPlayers] = useState<PlayerEngagementData[]>([]);
  const [summary, setSummary] = useState<TeamEngagementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'weeklyXp' | 'currentStreak' | 'journeyNodesCompleted' | 'daysSinceActive'>('weeklyXp');
  const [sortAsc, setSortAsc] = useState(false);

  const loadEngagement = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);

      // Step 1: Get all players on this team
      const { data: teamPlayers } = await supabase
        .from('team_players')
        .select('player_id, players!inner(id, first_name, last_name, parent_account_id)')
        .eq('team_id', teamId);

      if (!teamPlayers || teamPlayers.length === 0) {
        setPlayers([]);
        setSummary(null);
        return;
      }

      const today = localToday();
      const mondayStr = localMondayOfWeek();
      const threeDaysAgo = daysAgoStr(3);

      // Build profile ID list
      const playerEntries = teamPlayers.map((tp: any) => ({
        playerId: tp.players.id,
        profileId: tp.players.parent_account_id,
        playerName: `${tp.players.first_name || ''} ${tp.players.last_name || ''}`.trim() || 'Player',
      })).filter((p: any) => p.profileId);

      const profileIds = playerEntries.map((p: any) => p.profileId);

      // Step 2: Batch fetch all engagement data

      // Profiles (XP, level, tier)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, total_xp, player_level, tier')
        .in('id', profileIds);

      const profileMap = Object.fromEntries(
        (profiles || []).map((p: any) => [p.id, p])
      );

      // Streak data
      const { data: streaks } = await supabase
        .from('streak_data')
        .select('player_id, current_streak, longest_streak, last_active_date')
        .in('player_id', profileIds);

      const streakMap = Object.fromEntries(
        (streaks || []).map((s: any) => [s.player_id, s])
      );

      // Weekly XP from league_standings
      const { data: standings } = await supabase
        .from('league_standings')
        .select('player_id, weekly_xp')
        .eq('team_id', teamId)
        .eq('week_start', mondayStr);

      const weeklyXpMap = Object.fromEntries(
        (standings || []).map((s: any) => [s.player_id, s.weekly_xp || 0])
      );

      // Daily quests today
      const { data: dailyQuests } = await supabase
        .from('daily_quests')
        .select('player_id, is_completed')
        .in('player_id', profileIds)
        .eq('quest_date', today);

      const dailyQuestMap: Record<string, { completed: number; total: number }> = {};
      (dailyQuests || []).forEach((q: any) => {
        if (!dailyQuestMap[q.player_id]) {
          dailyQuestMap[q.player_id] = { completed: 0, total: 0 };
        }
        dailyQuestMap[q.player_id].total++;
        if (q.is_completed) dailyQuestMap[q.player_id].completed++;
      });

      // Weekly quests
      const { data: weeklyQuests } = await supabase
        .from('weekly_quests')
        .select('player_id, is_completed')
        .in('player_id', profileIds)
        .eq('week_start', mondayStr);

      const weeklyQuestMap: Record<string, { completed: number; total: number }> = {};
      (weeklyQuests || []).forEach((q: any) => {
        if (!weeklyQuestMap[q.player_id]) {
          weeklyQuestMap[q.player_id] = { completed: 0, total: 0 };
        }
        weeklyQuestMap[q.player_id].total++;
        if (q.is_completed) weeklyQuestMap[q.player_id].completed++;
      });

      // Journey progress
      const { data: journeyProgress } = await supabase
        .from('journey_progress')
        .select('player_id, status')
        .in('player_id', profileIds);

      const journeyMap: Record<string, { completed: number; total: number }> = {};
      (journeyProgress || []).forEach((jp: any) => {
        if (!journeyMap[jp.player_id]) {
          journeyMap[jp.player_id] = { completed: 0, total: 0 };
        }
        journeyMap[jp.player_id].total++;
        if (jp.status === 'completed') journeyMap[jp.player_id].completed++;
      });

      // Total journey nodes (same for everyone)
      const { count: totalNodes } = await supabase
        .from('journey_nodes')
        .select('id', { count: 'exact', head: true });

      // Current chapter per player (find the highest non-complete chapter)
      const { data: chapters } = await supabase
        .from('journey_chapters')
        .select('id, title, chapter_number')
        .eq('sport', 'volleyball')
        .order('chapter_number', { ascending: true });

      // Step 3: Assemble per-player data
      const assembledPlayers: PlayerEngagementData[] = playerEntries.map((entry: any) => {
        const pid = entry.profileId;
        const profile = profileMap[pid] || {};
        const streak = streakMap[pid] || {};
        const daily = dailyQuestMap[pid] || { completed: 0, total: 0 };
        const weekly = weeklyQuestMap[pid] || { completed: 0, total: 0 };
        const journey = journeyMap[pid] || { completed: 0, total: 0 };

        const lastActive = streak.last_active_date || null;
        const daysSince = lastActive ? daysBetween(lastActive, today) : 999;

        // Determine current chapter
        let currentChapter: string | null = null;
        if (chapters && chapters.length > 0) {
          const completedNodeCount = journey.completed;
          // Rough approximation: figure out which chapter based on completed nodes
          let nodesAccumulated = 0;
          for (const ch of chapters) {
            const chapterNodeCount = (ch as any).node_count || 6;
            if (completedNodeCount < nodesAccumulated + chapterNodeCount) {
              currentChapter = (ch as any).title;
              break;
            }
            nodesAccumulated += chapterNodeCount;
          }
          if (!currentChapter && chapters.length > 0) {
            currentChapter = 'Complete';
          }
        }

        return {
          profileId: pid,
          playerId: entry.playerId,
          playerName: entry.playerName,
          totalXp: profile.total_xp || 0,
          weeklyXp: weeklyXpMap[pid] || 0,
          level: profile.player_level || 1,
          tier: profile.tier || 'Rookie',
          currentStreak: streak.current_streak || 0,
          longestStreak: streak.longest_streak || 0,
          dailyQuestsCompletedToday: daily.completed,
          dailyQuestsTotalToday: daily.total,
          weeklyQuestsCompletedThisWeek: weekly.completed,
          weeklyQuestsTotalThisWeek: weekly.total,
          journeyNodesCompleted: journey.completed,
          journeyNodesTotal: totalNodes || 53,
          currentChapter,
          lastActiveDate: lastActive,
          daysSinceActive: daysSince,
          isInactive: daysSince >= 3,
        };
      });

      // Step 4: Compute team summary
      const activePlayers = assembledPlayers.filter(p => p.daysSinceActive < 3);
      const totalDailyQuests = assembledPlayers.reduce((sum, p) => sum + p.dailyQuestsTotalToday, 0);
      const completedDailyQuests = assembledPlayers.reduce((sum, p) => sum + p.dailyQuestsCompletedToday, 0);

      const longestStreakPlayer = assembledPlayers.reduce(
        (best, p) => p.currentStreak > best.currentStreak ? p : best,
        assembledPlayers[0] || { currentStreak: 0, playerName: 'None' }
      );

      const teamSummary: TeamEngagementSummary = {
        totalPlayers: assembledPlayers.length,
        activePlayers: activePlayers.length,
        activePercent: assembledPlayers.length > 0
          ? Math.round((activePlayers.length / assembledPlayers.length) * 100)
          : 0,
        avgWeeklyXp: assembledPlayers.length > 0
          ? Math.round(assembledPlayers.reduce((sum, p) => sum + p.weeklyXp, 0) / assembledPlayers.length)
          : 0,
        avgStreak: assembledPlayers.length > 0
          ? Math.round(assembledPlayers.reduce((sum, p) => sum + p.currentStreak, 0) / assembledPlayers.length * 10) / 10
          : 0,
        longestTeamStreak: longestStreakPlayer?.currentStreak || 0,
        longestStreakPlayerName: longestStreakPlayer?.playerName || 'None',
        questCompletionRate: totalDailyQuests > 0
          ? Math.round((completedDailyQuests / totalDailyQuests) * 100)
          : 0,
        inactivePlayers: assembledPlayers.filter(p => p.isInactive).sort((a, b) => b.daysSinceActive - a.daysSinceActive),
        topEngaged: [...assembledPlayers].sort((a, b) => b.weeklyXp - a.weeklyXp).slice(0, 3),
      };

      setPlayers(assembledPlayers);
      setSummary(teamSummary);
    } catch (err) {
      console.error('[useCoachEngagement] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadEngagement();
  }, [loadEngagement]);

  // Sorting
  const sortedPlayers = [...players].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return {
    players: sortedPlayers,
    summary,
    loading,
    sortField,
    sortAsc,
    toggleSort,
    refreshEngagement: loadEngagement,
  };
}

// ─── Date Helpers ────────────────────────────────────────────────────────────

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localMondayOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + 'T00:00:00');
  const d2 = new Date(dateStr2 + 'T00:00:00');
  return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}
```

**Commit:** `[coach-engagement] Phase 2: useCoachEngagement hook`

---

## PHASE 3: Create CoachEngagementCard (compact home scroll card)

Create a new file:
```
components/coach-scroll/CoachEngagementCard.tsx
```

### Design requirements:

**Match the existing Coach Home scroll card style exactly.** Read the existing card components for patterns.

**Card content (compact):**

**Header row:** "Team engagement" title (left) + "This week" label (right, muted)

**Three metric pills/circles in a row:**
- Active: `[X]%` with a label "active" (green tint if > 70%, amber if 40-70%, red if < 40%)
- Avg XP: `[X]` with label "avg XP" (neutral)
- Quests: `[X]%` with label "quests done" (same color treatment as active)

**Top 3 engaged players (compact):**
- Three small rows: rank (1/2/3) + player name + weekly XP
- Same style as the PlayerLeaderboardPreview but without tier badges

**Inactive alert (if any):**
- If `inactivePlayers.length > 0`: red-tinted bar at bottom of card
- Text: "[X] players haven't opened Lynx in 3+ days"
- Tappable: navigates to the full engagement screen

**"View details" link at bottom:** navigates to CoachEngagementScreen

### Data source:

```typescript
import { useCoachEngagement } from '@/hooks/useCoachEngagement';
const { summary, loading } = useCoachEngagement(teamId);
```

**Commit:** `[coach-engagement] Phase 3: CoachEngagementCard`

---

## PHASE 4: Create CoachEngagementScreen (full dashboard)

Create a new file:
```
screens/CoachEngagementScreen.tsx
```

Or if the app uses file-based routing:
```
app/coach-engagement.tsx
```

Use whichever pattern matches how LeaderboardScreen and NotificationInboxScreen were created in Phase 5.

### Design requirements:

**Background:** Match the coach screen background (check if coach screens use dark navy or light background)

**Header:**
- Back arrow
- "Team engagement" title
- "This week" subtitle (muted)
- Pull-to-refresh

### Section 1: Team Summary Stats

**Four metric cards in a 2x2 grid:**

| Active players | Avg weekly XP |
|---|---|
| `X/Y (Z%)` | `X XP` |
| color-coded | neutral |

| Quest completion | Avg streak |
|---|---|
| `X% today` | `X.X days` |
| color-coded | neutral |

Color coding: green (good: >70% active, >60% quests), amber (moderate: 40-70%, 30-60%), red (needs attention: <40%, <30%)

### Section 2: Inactive Players Alert

**Only visible if there are inactive players (3+ days).**

Red/amber tinted card:
- Header: "Needs attention" with a warning icon
- List each inactive player: name + "Last active X days ago"
- Each row has a "Send nudge" button that creates a notification:
  ```typescript
  import { createNotification } from '@/lib/notification-engine';
  // On tap:
  await createNotification(player.profileId, 'quest_reminder', {
    teamId,
    customTitle: 'Your coach is thinking about you',
    customBody: 'Open Lynx and get back on track. Your team needs you.',
  });
  ```
- After sending, the button changes to "Nudge sent" (disabled state)

### Section 3: Player-by-Player Table

**Sortable table with columns:**
- Player name (always visible)
- Weekly XP (sortable, default sort descending)
- Streak (sortable, shows fire icon + count)
- Journey (shows "Ch X" or progress fraction like "12/53")
- Quests (shows "2/3" for daily, "1/4" for weekly)
- Status indicator: green dot (active today), amber dot (active 1-2 days ago), red dot (3+ days inactive)

**Sorting:** Tapping a column header sorts by that column. Tapping again reverses. Use `toggleSort` from the hook. Show a small arrow indicator on the active sort column.

**Player row tap:** Navigates to a player detail view OR shows an expanded row with:
- Full stats: total XP, level, tier, longest streak, journey chapter name
- Action buttons: "Send shoutout", "Send nudge"
- Do whichever is simpler to implement. An expanded row (accordion) is easier than a new screen.

### Section 4: Streak Leaderboard

**Dark navy card with streak rankings:**
- Ranked list of all players by current streak (descending)
- Each row: rank + name + fire icon + streak count + streak mascot image (small, 24px, from `getStreakMascot`)
- Top streak gets a "Longest streak" crown icon or label
- Players with 0 streak shown at bottom in muted text

```typescript
import { getStreakMascot } from '@/lib/mascot-images';
```

### Section 5: Journey Progress Overview

**Visual overview of where each player is on the Journey Path:**
- Compact bar chart or progress bars showing each player's journey completion
- Each row: player name + horizontal progress bar (filled = completed nodes / total nodes) + "Ch X" label
- Sorted by most progress first
- Players who haven't started show "Not started" in muted text

### Section 6: Quest Completion Rates

**Two mini-sections:**

**Daily quests (today):**
- Team completion bar: "X/Y quests completed today" (all players combined)
- Per-player breakdown: small rows with name + "2/3" or "0/3" + checkmark icons for completed

**Weekly quests (this week):**
- Same format but for weekly quest progress
- Shows "X/Y" for each player

**Commit:** `[coach-engagement] Phase 4: CoachEngagementScreen`

---

## PHASE 5: Wire CoachEngagementCard into Coach Home scroll

**File to modify:** The Coach Home scroll component (find the exact file in Phase 1 investigation)

### What to change:

1. Import `CoachEngagementCard`
2. Place it in the Coach Home scroll. Recommended position: AFTER the smart nudge card (if it exists) or after the squad face circles. The engagement card should feel like an operational tool, not buried at the bottom.
3. Pass `teamId` as a prop

**IMPORTANT:** Do not change the position of any other component. Insert only.

**Commit:** `[coach-engagement] Phase 5: wire engagement card into Coach Home`

---

## PHASE 6: Register CoachEngagementScreen in navigation

Add the screen to the navigation config so the coach can navigate to it from the engagement card.

```typescript
// Navigation from CoachEngagementCard:
router.push('/coach-engagement?teamId=...');
// or
navigation.navigate('CoachEngagement', { teamId });
```

Use whichever pattern matches the existing app.

**Commit:** `[coach-engagement] Phase 6: register screen in navigation`

---

## PHASE 7: Verification

### Verify:

1. `hooks/useCoachEngagement.ts` exists and returns `players`, `summary`, sorting functions
2. `CoachEngagementCard` renders on Coach Home scroll with 3 metrics, top 3 players, inactive alert
3. `CoachEngagementScreen` renders with all 6 sections: summary stats, inactive alert, player table, streak leaderboard, journey progress, quest rates
4. Player table is sortable by weekly XP, streak, journey, days since active
5. "Send nudge" creates a notification in `player_notifications`
6. Streak leaderboard shows mascot images via `getStreakMascot`
7. Navigation: Coach Home > engagement card > full screen works
8. No TypeScript errors
9. No player-facing or engine files modified

### Report back with:

```
## VERIFICATION REPORT: Phase 7 — Coach Engagement Dashboard

### Files Created: [count]
[list each with line count]

### Files Modified: [count]
[list each with description]

### Coach Home Scroll:
- CoachEngagementCard position: [where in the scroll]
- Metrics shown: [list]
- Inactive alert: VISIBLE when inactive players exist / NOT TESTED

### Full Dashboard Sections:
- Team summary stats (2x2): RENDERS / BROKEN
- Inactive players alert: RENDERS / BROKEN
- Player table (sortable): RENDERS / BROKEN
- Streak leaderboard: RENDERS / BROKEN
- Journey progress: RENDERS / BROKEN
- Quest completion rates: RENDERS / BROKEN

### Interactions:
- Sort by weekly XP: WORKS / BROKEN
- Sort by streak: WORKS / BROKEN
- Send nudge: WORKS / BROKEN
- Navigate to full screen: WORKS / BROKEN

### Data Integration:
- Reads from profiles (XP, level, tier): YES / NO
- Reads from streak_data: YES / NO
- Reads from league_standings (weekly XP): YES / NO
- Reads from daily_quests / weekly_quests: YES / NO
- Reads from journey_progress: YES / NO
- Creates notifications via notification-engine: YES / NO

### Type Check: PASS / FAIL

### Errors: NONE / [list]
```
