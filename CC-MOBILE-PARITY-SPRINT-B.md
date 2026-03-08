# CC-MOBILE-PARITY-SPRINT-B.md
## Lynx Mobile -- Close Cross-Platform Gaps (Payment Plans + Streak System)
### For Claude Code Execution

**Repo:** Volleybrain-Mobile3
**Branch:** feat/next-five-build
**Backend:** Supabase (project: uqpjvbiuokwpldjvxiby)
**Date:** March 7, 2026

---

## RULES (READ FIRST -- APPLY TO ALL PHASES)

1. **Read CC-LYNX-RULES.md** in the project root if it exists. All rules there apply.
2. **Read SCHEMA_REFERENCE.csv** in the project root for column names and table structures.
3. **Read each file FULLY before modifying it.** These are large files. Understand every import, hook, and render block before touching anything.
4. **Archive before replace** -- copy any file being replaced to `_archive/parity-sprint-b/` first.
5. **Preserve all existing Supabase queries.** Never replace working queries with mock data.
6. **Do NOT touch:** `lib/auth.ts`, `lib/supabase.ts`, `lib/theme.ts`, `lib/design-tokens.ts`.
7. **Use the existing theme system.** `useTheme()` hook, `colors` object, BRAND constants from `@/theme/colors`.
8. **Font:** Use FONTS from `@/theme/fonts` (Bebas Neue for display, Plus Jakarta Sans for body).
9. **Brand tokens:** offWhite=#F6F8FB, navy=#0D1B3E, skyBlue=#4BB9EC, teal=#2DD4BF, border=#E8ECF2.
10. **Commit after each phase** with the message format shown.
11. **Run `npx tsc --noEmit`** after each phase. Fix any new errors before committing.
12. **Test all four roles** render without crashes after each phase.
13. **No em dashes** in any user-facing text.

---

## CONTEXT

Both platforms are at ~95% coverage. Two cross-platform gaps remain that exist on NEITHER platform:
1. **Payment plans / installment scheduling** -- parents can only pay full amount or admin records manual partial payments.
2. **Streak rewards and recovery** -- both platforms show streak counts but have no reward tiers, milestones, or recovery mechanics.

This spec builds both on mobile. The web spec (CC-WEB-PARITY-SPRINT-A) is running in parallel on the other repo.

---

## PHASE 1: Payment Plan Schema + Service

**Goal:** Create the data layer for installment-based payment plans.

### New Supabase table: `payment_plans`

Run this SQL in Supabase SQL Editor before starting:

```sql
-- Payment plans table
CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  total_amount NUMERIC(10,2) NOT NULL,
  installment_count INTEGER NOT NULL DEFAULT 2,
  installment_amount NUMERIC(10,2) NOT NULL,
  frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'monthly')) DEFAULT 'monthly',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Installment schedule per player
CREATE TABLE IF NOT EXISTS payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id UUID REFERENCES payment_plans(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES profiles(id),
  installment_number INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view payment plans"
  ON payment_plans FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Admins can manage payment plans"
  ON payment_plans FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid() AND role = 'league_admin' AND is_active = true
  ));

CREATE POLICY "Parents see own installments"
  ON payment_installments FOR SELECT
  USING (parent_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'league_admin' AND is_active = true
  ));

CREATE POLICY "Admins manage installments"
  ON payment_installments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN payment_plans pp ON pp.organization_id = ur.organization_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'league_admin' AND ur.is_active = true
    AND pp.id = payment_installments.payment_plan_id
  ));
```

### Create service file:

Create `lib/payment-plans.ts`:
- `getPlansForSeason(seasonId)` -- fetch payment plans
- `getInstallmentsForParent(parentId)` -- fetch all installments for a parent
- `getInstallmentsForPlayer(playerId)` -- fetch installments for specific player
- `createPlan(plan)` -- admin creates a plan
- `generateInstallments(planId, playerId, parentId, startDate)` -- creates installment records based on plan frequency
- `markInstallmentPaid(installmentId, method, notes)` -- mark paid with timestamp
- `getOverdueInstallments(orgId)` -- admin view of all overdue

**Commit:** `"Parity Phase 1: payment_plans + payment_installments schema, RLS, and service layer"`

---

## PHASE 2: Admin Payment Plan Management

**Goal:** Let admins create and manage payment plans from the existing payments screen.

### Implementation:

1. Open `app/(tabs)/payments.tsx` and read it fully.
2. Add a new tab or section: "Payment Plans" alongside the existing payment tracking.
3. **Create Plan UI:**
   - Plan name (e.g., "3-Month Installment Plan")
   - Total amount (pulled from season_fees or manually entered)
   - Number of installments (2, 3, 4, 6)
   - Frequency: monthly (default), biweekly, weekly
   - Auto-calculate installment amount (total / count)
   - Set as default plan for season (checkbox)
   - [Create Plan] button
4. **Assign Plan to Player:**
   - From the existing player payment list, add a "Set Up Plan" action
   - Opens modal: select plan, confirm start date
   - Calls `generateInstallments()` to create the schedule
   - Shows preview of installment dates and amounts before confirming
5. **View Installments:**
   - When viewing a player's payment, if they have installments, show the schedule:
     - Installment # | Amount | Due Date | Status (Paid/Due/Overdue)
     - Overdue items highlighted in red
     - [Mark Paid] button per installment (same flow as existing payment recording)
6. **Overdue Alert:**
   - Add overdue installment count to the admin dashboard's payment snapshot
   - Query: `payment_installments WHERE paid = false AND due_date < NOW()`

**Commit:** `"Parity Phase 2: admin payment plan creation, assignment, and installment tracking"`

---

## PHASE 3: Parent Payment Plan View

**Goal:** Parents see their installment schedule and can track what's due.

### Implementation:

1. Open `app/family-payments.tsx` and read it fully.
2. If a player has installments, show an "Installment Plan" section above or alongside the existing payment view:
   - Plan name and total
   - Progress bar: X of Y installments paid
   - List of installments with status badges:
     - Paid (green checkmark, paid date)
     - Due (amber, due date)
     - Overdue (red, days overdue)
   - Next payment due: prominent card with amount and date
3. Also update `components/ParentDashboard.tsx` (ParentHomeScroll):
   - In the payment status section, if installments exist, show "Next installment: $X due [date]" instead of the full balance.
4. Link the "Pay Now" action to the existing payment methods (Stripe, Venmo, Zelle, CashApp, etc.).

**Commit:** `"Parity Phase 3: parent installment view with progress tracking and next-due card"`

---

## PHASE 4: Streak Rewards and Recovery System

**Goal:** Enhance the existing streak counter with reward tiers, milestone celebrations, and streak recovery.

### Current state:
- `components/PlayerHomeScroll.tsx` shows streak banner when `attendanceStreak >= 2`
- `components/player-scroll/StreakBanner.tsx` renders the fire emoji + count
- Streak is calculated from `event_attendance` records

### New features to add:

#### 4a. Streak Reward Tiers

Create `lib/streak-engine.ts`:

```typescript
export const STREAK_TIERS = [
  { min: 3, name: 'Getting Started', emoji: '\u{1F525}', color: '#F59E0B', xp: 5 },
  { min: 5, name: 'On Fire', emoji: '\u{1F525}\u{1F525}', color: '#EF4444', xp: 15 },
  { min: 10, name: 'Unstoppable', emoji: '\u{2B50}', color: '#8B5CF6', xp: 30 },
  { min: 20, name: 'Legendary', emoji: '\u{1F451}', color: '#FFD700', xp: 50 },
  { min: 50, name: 'GOAT', emoji: '\u{1F410}', color: '#22D3EE', xp: 100 },
];

export function getStreakTier(streak: number) { ... }
export function getNextMilestone(streak: number) { ... }
export function calculateStreakXP(streak: number) { ... }
```

#### 4b. Enhanced Streak Banner

Update `components/player-scroll/StreakBanner.tsx`:
- Show tier name and color (not just fire emoji + number)
- Progress bar to next tier milestone
- "X more to reach [next tier name]!" text
- Tier-appropriate background gradient

#### 4c. Streak Milestone Celebration

When a player hits a new tier threshold (3, 5, 10, 20, 50):
- Show a celebration modal (reuse `AchievementCelebrationModal` pattern)
- Award XP from the tier definition
- Log to `xp_ledger` with source `streak_milestone`

#### 4d. Streak Recovery (Freeze)

Add streak protection:
- Create a simple `streak_freezes` concept in the player's profile or a new lightweight table
- If a player misses ONE event but had a streak >= 5, they get an automatic "streak freeze" -- their streak is preserved but marked with a shield icon
- Only one freeze per streak. If they miss again, streak resets.
- Show on the banner: "Streak saved! (1 freeze used)" with a shield icon
- Implementation: in the streak calculation logic, when computing consecutive attendance, allow one gap if `streak >= 5` and no freeze has been used for the current streak.

**Commit:** `"Parity Phase 4: streak reward tiers, milestone celebrations, XP awards, and streak freeze recovery"`

---

## PHASE 5: Verification Pass

1. Switch between all 4 roles and verify:
   - No crashes on any dashboard
   - Admin can create a payment plan and assign it to a player
   - Parent can see their installment schedule
   - Player streak banner shows tier name and progress to next milestone
   - Streak freeze works (verify logic with console.log if needed)
2. Run `npx tsc --noEmit` -- zero new TypeScript errors.
3. Report any issues found.

**Commit:** `"Parity Phase 5: verification pass -- cross-platform gaps closed"`

---

## DONE

After all 5 phases, both cross-platform gaps are resolved. Payment plans work for admin creation and parent viewing. Streak system has reward tiers, celebrations, XP, and recovery. These features will also need to be built on web, but the data layer (Supabase tables) is shared, so the web implementation can query the same tables.
