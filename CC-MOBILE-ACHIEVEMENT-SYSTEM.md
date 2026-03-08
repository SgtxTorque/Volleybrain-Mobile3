# CC-MOBILE-ACHIEVEMENT-SYSTEM.md
## Lynx Mobile -- Full Achievement & Badge System Build-Out
### For Claude Code Execution (Overnight Run)

**Repo:** Volleybrain-Mobile3
**Branch:** feat/next-five-build
**Backend:** Supabase (project: uqpjvbiuokwpldjvxiby)
**Date:** March 8, 2026

---

## RULES (READ FIRST)

1. **Read CC-LYNX-RULES.md** in the project root if it exists. All rules apply.
2. **Read SCHEMA_REFERENCE.csv** for column names and table structures.
3. **Read `lib/achievement-engine.ts` FULLY** before any changes. This is the core engine. It already has: `checkRoleAchievements()`, `gatherCoachStats()`, `gatherParentStats()`, `gatherAdminStats()`, `awardRoleXP()`, `getRoleAchievements()`, `getUnseenRoleAchievements()`, and `fetchUserXP()`. DO NOT rewrite these. Extend them.
4. **Read `lib/engagement-constants.ts` FULLY.** Contains XP levels, XP sources, level tiers, shoutout categories, achievement categories.
5. **Read `app/achievements.tsx` FULLY.** It ALREADY handles all 4 roles via `usePermissions()`. It calls `getRoleAchievements()` and `checkRoleAchievements()` for non-player roles. DO NOT rebuild this screen. Enhance it.
6. **Archive before replace** -- `_archive/achievement-buildout/`.
7. **Do NOT touch:** `lib/auth.ts`, `lib/supabase.ts`, `lib/theme.ts`, `lib/design-tokens.ts`.
8. **Commit after each phase.**
9. **Run `npx tsc --noEmit`** after each phase. Zero new errors.
10. **Test all 4 roles** render without crashes after each phase.

---

## CONTEXT

The achievement system is 80% built. The engine supports all roles. The achievements screen handles all roles. What is missing:

1. **Only ~17 achievements are seeded** in the DB. We need ~270 for launch (volleyball + basketball players, coaches, parents, admins, universal).
2. **No `min_level` column** on the achievements table for level-gating.
3. **No `stacks_into` column** for progression chain linking.
4. **Coach and Admin dashboards have no trophy case widget.** Parent dashboard has `RecentBadges` but it only shows player (child) badges, not parent badges.
5. **`checkRoleAchievements()` is only called from the achievements screen.** It needs to be called at trigger points (after game, after RSVP, after payment, etc.).
6. **XP_BY_SOURCE only covers player actions.** Needs expansion for coach/parent/admin actions.
7. **Badge images are not wired yet** (they will be uploaded to Supabase storage separately -- for now use emoji icons from the seed data).

---

## PHASE 1: Schema Updates

Run this SQL. If the columns already exist, the IF NOT EXISTS handles it safely.

### 1a. Add min_level and stacks_into columns to achievements table:

```sql
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS min_level INTEGER DEFAULT 1;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS stacks_into TEXT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS flavor_text TEXT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS cadence TEXT DEFAULT 'lifetime';
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 25;
```

### 1b. Verify user_achievements table exists (from phase 2 migration):

Check if `user_achievements` table exists. If not, create it:
```sql
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  stat_value_at_unlock INTEGER,
  season_id UUID,
  UNIQUE(user_id, achievement_id)
);
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
```

### 1c. Add new XP source columns to profiles if missing:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS player_level INTEGER DEFAULT 1;
```

Create the SQL file at `supabase/migrations/20260308_achievement_expansion.sql` and include ALL of the above.

**Commit:** `"Achievement Phase 1: schema updates -- min_level, stacks_into, flavor_text, cadence columns"`

---

## PHASE 2: Seed 250 Launch Badges

A pre-generated SQL file exists at `LYNX-BADGE-SEED-250.sql` in the project root. This file contains 250 INSERT statements generated directly from the badge library spreadsheet.

### Steps:
1. Read `LYNX-BADGE-SEED-250.sql` in the project root.
2. Copy it to `supabase/migrations/20260308_achievement_seed_launch.sql`.
3. Verify it is syntactically correct SQL.
4. The file uses `ON CONFLICT DO NOTHING` on every INSERT, so it is safe to re-run.
5. **Do NOT modify the badge data.** It was generated from the approved badge library spreadsheet.

The file seeds:
- 80 Volleyball Player badges (display_order 1-80)
- 70 Basketball Player badges (display_order 100-170)
- 50 Coach badges (display_order 200-250)
- 50 Parent badges (display_order 300-350)

**Commit:** `"Achievement Phase 2: seed 250 launch badges from LYNX-BADGE-SEED-250.sql"`

---

## PHASE 3: Expand XP Sources + Engagement Constants

### 3a. Update `lib/engagement-constants.ts`:

Add new XP sources to `XP_BY_SOURCE`:
```typescript
export const XP_BY_SOURCE: Record<string, number> = {
  // Existing (keep these)
  shoutout_given: 10,
  shoutout_received: 15,
  challenge_completed: 50,
  challenge_won: 100,
  game_played: 10,
  practice_attended: 5,
  // NEW -- Coach actions
  game_stats_entered: 15,
  evaluation_completed: 20,
  challenge_created: 15,
  game_won: 25,
  blast_sent: 10,
  // NEW -- Parent actions
  rsvp_submitted: 5,
  payment_on_time: 15,
  volunteer_signup: 20,
  photo_uploaded: 5,
  referral_completed: 50,
  // NEW -- Admin actions
  registration_processed: 5,
  season_completed: 100,
  // NEW -- Universal
  team_wall_post: 10,
  daily_login: 2,
};
```

### 3b. Add new achievement categories to `ACHIEVEMENT_CATEGORIES`:
```typescript
export const ACHIEVEMENT_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  // Existing
  Offensive: { label: 'Offensive', icon: 'flash', color: '#FF3B3B' },
  Defensive: { label: 'Defensive', icon: 'shield', color: '#3B82F6' },
  Playmaker: { label: 'Playmaker', icon: 'people', color: '#10B981' },
  Heart: { label: 'Heart', icon: 'heart', color: '#EC4899' },
  Community: { label: 'Community', icon: 'megaphone', color: '#F59E0B' },
  Elite: { label: 'Elite', icon: 'diamond', color: '#FFD700' },
  // NEW
  Coaching: { label: 'Coaching', icon: 'clipboard', color: '#6366F1' },
  Management: { label: 'Management', icon: 'settings', color: '#64748B' },
  Development: { label: 'Development', icon: 'trending-up', color: '#10B981' },
  Winning: { label: 'Winning', icon: 'trophy', color: '#F59E0B' },
  Engagement: { label: 'Engagement', icon: 'chatbubbles', color: '#EC4899' },
  Communication: { label: 'Communication', icon: 'megaphone', color: '#3B82F6' },
  Career: { label: 'Career', icon: 'ribbon', color: '#8B5CF6' },
  Reliability: { label: 'Reliability', icon: 'checkmark-circle', color: '#22C55E' },
  Financial: { label: 'Financial', icon: 'wallet', color: '#10B981' },
  Volunteer: { label: 'Volunteer', icon: 'hand-left', color: '#F97316' },
  Social: { label: 'Social', icon: 'share-social', color: '#EC4899' },
  Referral: { label: 'Referral', icon: 'gift', color: '#8B5CF6' },
  Loyalty: { label: 'Loyalty', icon: 'heart-circle', color: '#EF4444' },
  Streaks: { label: 'Streaks', icon: 'flame', color: '#F59E0B' },
  Challenges: { label: 'Challenges', icon: 'flag', color: '#6366F1' },
  Levels: { label: 'Levels', icon: 'star', color: '#FFD700' },
  Meta: { label: 'Meta', icon: 'infinite', color: '#64748B' },
  Fun: { label: 'Fun', icon: 'happy', color: '#F472B6' },
  Scoring: { label: 'Scoring', icon: 'basketball', color: '#EF4444' },
  Rebounding: { label: 'Rebounding', icon: 'arrow-up', color: '#F59E0B' },
  Playmaking: { label: 'Playmaking', icon: 'git-branch', color: '#10B981' },
  Defense: { label: 'Defense', icon: 'shield-checkmark', color: '#3B82F6' },
  Volleyball: { label: 'Volleyball', icon: 'basketball', color: '#4BB9EC' },
  Basketball: { label: 'Basketball', icon: 'basketball', color: '#F97316' },
  Season: { label: 'Season', icon: 'calendar', color: '#6366F1' },
  Onboarding: { label: 'Onboarding', icon: 'log-in', color: '#22C55E' },
  Growth: { label: 'Growth', icon: 'trending-up', color: '#10B981' },
  Operations: { label: 'Operations', icon: 'construct', color: '#64748B' },
  Setup: { label: 'Setup', icon: 'build', color: '#6366F1' },
};
```

**Commit:** `"Achievement Phase 3: expanded XP sources and achievement categories for all roles"`

---

## PHASE 4: Wire Trigger Points

Add `checkRoleAchievements()` calls at key moments in the app. Each trigger is a 3-5 line addition.

**IMPORTANT:** Import at the top of each file:
```typescript
import { checkRoleAchievements, checkAllAchievements } from '@/lib/achievement-engine';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
```

### 4a. After game completion -- Coach + Player achievements
**File:** `components/gameday/SummaryPage.tsx` (or wherever game completion saves)
After scores/stats are saved successfully, add:
```typescript
// Check coach achievements
if (user?.id) {
  checkRoleAchievements(user.id, 'coach', seasonId).catch(() => {});
}
// Player achievements are already checked via checkAndUnlockAchievements in the engine
```

### 4b. After RSVP submitted -- Parent achievements
**File:** `components/EventDetailModal.tsx` or wherever RSVP is submitted
After successful RSVP insert/update:
```typescript
if (user?.id && isParent) {
  checkRoleAchievements(user.id, 'parent', workingSeason?.id).catch(() => {});
}
```

### 4c. After payment recorded -- Parent + Admin achievements
**File:** `app/(tabs)/payments.tsx`
After successful payment insert:
```typescript
if (user?.id) {
  if (isParent) checkRoleAchievements(user.id, 'parent', workingSeason?.id).catch(() => {});
  if (isAdmin) checkRoleAchievements(user.id, 'admin', workingSeason?.id).catch(() => {});
}
```

### 4d. After volunteer signup -- Parent achievements
**File:** `app/volunteer-assignment.tsx`
After successful volunteer assignment:
```typescript
if (user?.id) {
  checkRoleAchievements(user.id, 'parent', workingSeason?.id).catch(() => {});
}
```

### 4e. After evaluation saved -- Coach achievements
**File:** `app/player-evaluation.tsx`
After evaluation is submitted:
```typescript
if (user?.id) {
  checkRoleAchievements(user.id, 'coach', workingSeason?.id).catch(() => {});
}
```

### 4f. After registration processed -- Admin achievements
**File:** `app/registration-hub.tsx`
After admin approves/processes a registration:
```typescript
if (user?.id) {
  checkRoleAchievements(user.id, 'admin', workingSeason?.id).catch(() => {});
}
```

### 4g. After challenge created -- Coach achievements
**File:** `app/create-challenge.tsx`
After challenge is saved:
```typescript
if (user?.id) {
  checkRoleAchievements(user.id, 'coach', workingSeason?.id).catch(() => {});
}
```

### 4h. After team wall post -- All roles
**File:** `app/team-wall.tsx`
After post is created:
```typescript
if (user?.id) {
  const role = isAdmin ? 'admin' : isCoach ? 'coach' : isParent ? 'parent' : 'player';
  if (role !== 'player') {
    checkRoleAchievements(user.id, role, workingSeason?.id).catch(() => {});
  }
}
```

### 4i. Daily check on app open -- All roles (throttled)
**File:** `app/_layout.tsx`
After auth is confirmed and profile is loaded, add a throttled daily check:
```typescript
useEffect(() => {
  if (!user?.id || !profile) return;
  const lastCheck = AsyncStorage.getItem('lynx_daily_achievement_check');
  const today = new Date().toDateString();
  lastCheck.then(val => {
    if (val === today) return; // Already checked today
    AsyncStorage.setItem('lynx_daily_achievement_check', today);
    const role = isAdmin ? 'admin' : isCoach ? 'coach' : isParent ? 'parent' : null;
    if (role) {
      checkRoleAchievements(user.id, role, workingSeason?.id).catch(() => {});
    }
  });
}, [user?.id, profile]);
```

**Commit:** `"Achievement Phase 4: wire trigger points -- 9 trigger locations across all roles"`

---

## PHASE 5: Trophy Case Widgets for Coach + Admin Dashboards

### 5a. Create shared TrophyCaseWidget component

**File:** `components/TrophyCaseWidget.tsx`

This widget shows the user's recent 4-6 earned badges with rarity glow effects. It links to the achievements screen.

```
+--------------------------------------------------+
|  TROPHY CASE                    [View All →]     |
|  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           |
|  │ 🔥   │ │ ⚡   │ │ 🎯   │ │ 💪   │           |
|  │ On   │ │ First│ │ Data │ │ Moti │           |
|  │ Fire │ │Whstl │ │Drivn │ │vator │           |
|  └──────┘ └──────┘ └──────┘ └──────┘           |
|  Level 7 (Silver) ████████░░ 2,300 / 3,000 XP  |
+--------------------------------------------------+
```

Props: `userId: string`, `userRole: 'coach' | 'parent' | 'admin'`

Implementation:
- Call `getRoleAchievements(userId, userRole)` to get earned badges
- Sort by `earned_at` descending, take first 6
- Render each as a mini badge with `RarityGlow` component (already exists)
- Show XP bar using `fetchUserXP(userId)` (already exists)
- Show level + tier using `getLevelFromXP()` and `getLevelTier()` (already exist)
- "View All" navigates to `/achievements`

Style: Match the existing card patterns in the dashboard. Use BRAND colors, FONTS tokens, dark theme support.

### 5b. Add TrophyCaseWidget to CoachDashboard

**File:** `components/CoachDashboard.tsx` (or `CoachHomeScroll.tsx`)
Add `<TrophyCaseWidget userId={user.id} userRole="coach" />` in the dashboard scroll, after the existing sections (Roster, Leaderboard, etc.).

### 5c. Add TrophyCaseWidget to AdminDashboard

**File:** `components/AdminDashboard.tsx` (or `AdminHomeScroll.tsx`)
Add `<TrophyCaseWidget userId={user.id} userRole="admin" />` in the admin dashboard scroll.

### 5d. Update ParentDashboard RecentBadges

The parent dashboard already has `<RecentBadges>` but it shows PLAYER (child) badges. Add a separate `<TrophyCaseWidget userId={user.id} userRole="parent" />` BELOW the child's badges, labeled "Your Achievements" to differentiate from the child's badge section.

**Commit:** `"Achievement Phase 5: TrophyCaseWidget on Coach, Admin, and Parent dashboards"`

---

## PHASE 6: Level-Gating in Achievements Screen

### 6a. Update `app/achievements.tsx` to handle `min_level`:

When rendering the achievements grid, badges where `min_level > currentUserLevel` should:
- Show grayed out / desaturated (opacity 0.4)
- Display a lock icon overlay
- Show text: "Unlocks at Level {min_level}"
- NOT show progress bar (since they can't be earned yet)
- Still be visible in the library (so users can see what they're working toward)

When the user levels up, any newly unlockable badges should get a "NEW" pill indicator.

### 6b. Add level-gate check to the engine

In `lib/achievement-engine.ts`, update `checkRoleAchievements()`:
Before checking if a threshold is met, also check:
```typescript
// Skip if user hasn't reached the required level
if (ach.min_level && currentLevel < ach.min_level) continue;
```

Get `currentLevel` from `fetchUserXP(userId)` at the start of the function (it's already called for XP purposes, just extract the level).

**Commit:** `"Achievement Phase 6: level-gating in achievements screen and engine"`

---

## PHASE 7: Unseen Celebration Trigger for Non-Player Roles

### 7a. Wire unseen badge celebrations on dashboard load

Currently `getUnseenRoleAchievements()` exists but is only called from `achievements.tsx`. Add celebration triggers to the dashboard:

**File:** `components/CoachDashboard.tsx`:
```typescript
const [unseenBadges, setUnseenBadges] = useState([]);
useEffect(() => {
  if (user?.id) {
    getUnseenRoleAchievements(user.id).then(unseen => {
      if (unseen.length > 0) setUnseenBadges(unseen);
    });
  }
}, [user?.id]);

// Render celebration modal if unseen badges exist
{unseenBadges.length > 0 && (
  <AchievementCelebrationModal
    achievement={unseenBadges[0].achievements}
    onDismiss={() => {
      markAchievementsSeen(user.id);
      setUnseenBadges(prev => prev.slice(1));
    }}
  />
)}
```

Do the same for `AdminDashboard.tsx` and `ParentDashboard.tsx`.

**Commit:** `"Achievement Phase 7: unseen badge celebrations on Coach, Admin, Parent dashboards"`

---

## PHASE 8: Verification Pass

1. Switch between all 4 roles and verify:
   - Achievements screen loads for every role
   - Role-specific badges appear (coach sees coaching badges, parent sees parent badges, etc.)
   - Level-gated badges show as locked when user level is below min_level
   - Trophy Case widget appears on Coach, Admin, and Parent dashboards
   - XP bar shows on Trophy Case widget
   - No console errors or crashes on any screen
2. Run `npx tsc --noEmit` -- zero new errors.
3. Verify the SQL migration file is syntactically correct.
4. Report any issues found.

**Commit:** `"Achievement Phase 8: full verification pass -- achievement system build-out complete"`

---

## SUMMARY

| Phase | What | Files |
|---|---|---|
| 1 | Schema updates (min_level, stacks_into, etc.) | 1 SQL migration |
| 2 | Seed 270 launch badges | 1 SQL migration (large) |
| 3 | Expand XP sources + categories | engagement-constants.ts |
| 4 | Wire 9 trigger points | 9 existing files (small additions) |
| 5 | Trophy Case widget on 3 dashboards | 1 new component + 3 dashboard files |
| 6 | Level-gating in screen + engine | achievements.tsx + achievement-engine.ts |
| 7 | Celebration triggers on 3 dashboards | 3 dashboard files |
| 8 | Verification | -- |

**Total:** 8 phases, ~15 files touched, 2 new files created, 2 SQL migrations.

## WHAT THIS DOES NOT COVER (next sprint):
- Processing and uploading badge art images (separate task when images are ready)
- Web parity (achievements UI for web admin)
- The remaining 230 badges (admin 100, team manager 100, more basketball/volleyball)
- Composite badge logic (Coach of the Year, Parent of the Year) -- these need custom resolvers
