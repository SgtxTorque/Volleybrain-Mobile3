# LYNX — Dead Code Cleanup + Orphan Wiring
## For Claude Code Execution

**Project:** volleybrain-mobile3 (React Native / Expo)
**Backend:** Supabase (project: uqpjvbiuokwpldjvxiby)
**Reference:** `MOBILE-APP-AUDIT.md` in project root (Section 6C for orphaned files)

---

## CONTEXT

The `MOBILE-APP-AUDIT.md` identified ~5000+ lines of dead code from legacy dashboards that were replaced by the new scroll-based homes, 6 replaced coach-scroll components, and 5 fully-built components that are complete but orphaned — never imported, never mounted, never triggered. This spec cleans the dead weight and wires the orphans.

---

## RULES (READ FIRST — APPLY TO ALL PHASES)

1. **Read SCHEMA_REFERENCE.csv FIRST** before writing or modifying ANY Supabase query.
2. **Read the existing code before changing it.** Read entire files first. Do NOT break existing functionality.
3. **Web admin source of truth:** `C:\Users\fuent\Downloads\volleybrain-admin\src\pages\` for query patterns.
4. **After each phase, run `npx tsc --noEmit`** — zero new errors.
5. **Commit AND push after each phase.** Format: `git add -A && git commit -m "Cleanup Phase [X]: [description]" && git push`
6. **Test all four roles after each phase.** Admin, Coach, Parent, Player must still boot and render correctly.
7. **No console.log without `__DEV__` gating.**

---

## PHASE 1: ARCHIVE LEGACY DASHBOARDS

**Problem:** `DashboardRouter.tsx` imports 5 legacy dashboard components but its switch statement exclusively renders `*HomeScroll` variants. These legacy files total ~5000+ lines of dead code that will never execute.

### Step 1A: Read `DashboardRouter.tsx`

Read the entire file. Confirm:
- It imports `AdminDashboard`, `CoachDashboard`, `ParentDashboard`, `PlayerDashboard`, `CoachParentDashboard`
- Its rendering logic exclusively uses `AdminHomeScroll`, `CoachHomeScroll`, `ParentHomeScroll`, `PlayerHomeScroll`
- The legacy imports are never referenced in the JSX

### Step 1B: Create `_legacy/` folder

```bash
mkdir -p components/_legacy
```

### Step 1C: Move legacy dashboards

Move these files into `_legacy/`:
- `components/AdminDashboard.tsx` → `components/_legacy/AdminDashboard.tsx`
- `components/CoachDashboard.tsx` → `components/_legacy/CoachDashboard.tsx`
- `components/ParentDashboard.tsx` → `components/_legacy/ParentDashboard.tsx`
- `components/PlayerDashboard.tsx` → `components/_legacy/PlayerDashboard.tsx`
- `components/CoachParentDashboard.tsx` → `components/_legacy/CoachParentDashboard.tsx`

### Step 1D: Remove legacy imports from DashboardRouter.tsx

Remove the import lines for all 5 legacy dashboards. Do NOT touch anything else in the file. The scroll-based imports and rendering logic stay exactly as they are.

### Step 1E: Move replaced coach-scroll components

These were replaced during the coach visual overhaul and are no longer imported by `CoachHomeScroll.tsx`:
- `components/coach-scroll/DevelopmentHint.tsx` → `components/_legacy/coach-scroll/DevelopmentHint.tsx`
- `components/coach-scroll/PendingStatsNudge.tsx` → `components/_legacy/coach-scroll/PendingStatsNudge.tsx`
- `components/coach-scroll/SeasonScoreboard.tsx` → `components/_legacy/coach-scroll/SeasonScoreboard.tsx`
- `components/coach-scroll/TopPerformers.tsx` → `components/_legacy/coach-scroll/TopPerformers.tsx`
- `components/coach-scroll/TeamPulse.tsx` → `components/_legacy/coach-scroll/TeamPulse.tsx`
- `components/coach-scroll/RosterAlerts.tsx` → `components/_legacy/coach-scroll/RosterAlerts.tsx`

**BEFORE moving each file**, verify it is NOT imported by `CoachHomeScroll.tsx` or any other active component. Run:
```bash
grep -rn "DevelopmentHint\|PendingStatsNudge\|SeasonScoreboard\|TopPerformers\|TeamPulse\|RosterAlerts" --include="*.tsx" --include="*.ts" components/ app/ | grep -v _legacy | grep -v node_modules
```
If ANY of these are still imported by an active file, do NOT move that component — fix the import first or leave it in place and note it.

### Step 1F: Move other orphaned files

- `components/AppDrawer.tsx` → `components/_legacy/AppDrawer.tsx` (superseded by GestureDrawer)
- `components/SquadComms.tsx` → `components/_legacy/SquadComms.tsx` (only consumer was PlayerDashboard)
- `components/AnnouncementBanner.tsx` → `components/_legacy/AnnouncementBanner.tsx` (only consumer was ParentDashboard)
- `components/payments-admin.tsx` → `components/_legacy/payments-admin.tsx` (never imported)
- `app/game-day-parent.tsx` → `components/_legacy/game-day-parent.tsx` (fully orphaned, never referenced)

**BEFORE moving each file**, verify it is truly orphaned:
```bash
grep -rn "AppDrawer\|SquadComms\|AnnouncementBanner\|payments-admin\|game-day-parent" --include="*.tsx" --include="*.ts" components/ app/ | grep -v _legacy | grep -v node_modules
```

### Step 1G: Add a README to _legacy

Create `components/_legacy/README.md`:
```markdown
# Legacy Components

These components were archived on [today's date] during the dead code cleanup.
They were replaced by the scroll-based home screens (*HomeScroll variants) and
are kept here for reference only. Do NOT import from this folder.

## Legacy Dashboards (replaced by *HomeScroll)
- AdminDashboard.tsx → AdminHomeScroll.tsx
- CoachDashboard.tsx → CoachHomeScroll.tsx
- ParentDashboard.tsx → ParentHomeScroll.tsx
- PlayerDashboard.tsx → PlayerHomeScroll.tsx
- CoachParentDashboard.tsx → CoachHomeScroll.tsx

## Replaced Coach-Scroll Components
- DevelopmentHint.tsx → ActionItems.tsx
- PendingStatsNudge.tsx → ActionItems.tsx
- SeasonScoreboard.tsx → SeasonLeaderboardCard.tsx
- TopPerformers.tsx → SeasonLeaderboardCard.tsx
- TeamPulse.tsx → TeamHealthCard.tsx
- RosterAlerts.tsx → TeamHealthCard.tsx

## Other Orphans
- AppDrawer.tsx → GestureDrawer.tsx
- SquadComms.tsx → only consumer was PlayerDashboard
- AnnouncementBanner.tsx → only consumer was ParentDashboard
- payments-admin.tsx → payments tab has own implementation
- game-day-parent.tsx → never referenced anywhere
```

**Verification:**
- All four roles boot and render correctly
- No import errors (all moved files were truly dead code)
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Cleanup Phase 1: Archive 17 legacy/orphaned components to _legacy/" && git push`

---

## PHASE 2: WIRE PARENTONBOARDINGMODAL (First-time parent welcome)

**Problem:** `ParentOnboardingModal.tsx` is a complete 5-slide welcome walkthrough for new parents. It exists, it works, but nothing imports or mounts it.

### Step 2A: Read the component
Read `components/ParentOnboardingModal.tsx` entirely. Understand:
- What props it expects (visible, onClose, etc.)
- What it renders (slides, animations, CTAs)
- Whether it reads any data from Supabase or context

### Step 2B: Read how first-time detection works
Read `lib/first-time-welcome.ts`. Understand:
- How it determines if a user is first-time
- What flag/storage it checks
- How it marks the onboarding as completed

### Step 2C: Mount in ParentHomeScroll

Read `components/ParentHomeScroll.tsx`. Add:
1. Import `ParentOnboardingModal`
2. Import the first-time detection hook/utility from `lib/first-time-welcome.ts`
3. Add state: `const [showOnboarding, setShowOnboarding] = useState(false)`
4. On mount, check if this is a first-time parent. If yes, set `showOnboarding = true`
5. Render the modal at the bottom of the JSX (outside the ScrollView):
```tsx
<ParentOnboardingModal
  visible={showOnboarding}
  onClose={() => {
    setShowOnboarding(false);
    // Mark onboarding as complete using the first-time utility
  }}
/>
```
6. When the modal is closed/completed, mark the onboarding as done so it doesn't show again.

If `first-time-welcome.ts` doesn't have a parent-specific check, use AsyncStorage directly:
```tsx
const ONBOARDING_KEY = 'lynx_parent_onboarding_complete';
// Check on mount
const done = await AsyncStorage.getItem(ONBOARDING_KEY);
if (!done) setShowOnboarding(true);
// On close
await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
```

**Verification:**
- Clear AsyncStorage (or use a fresh login) — parent home should show the onboarding modal
- Complete the modal — it should not show again on next app open
- Other roles unaffected
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Cleanup Phase 2: Wire ParentOnboardingModal for first-time parents" && git push`

---

## PHASE 3: WIRE LEVELUPCELEBRATIONMODAL (XP level-up trigger)

**Problem:** `LevelUpCelebrationModal.tsx` is a complete full-screen celebration animation. Nothing triggers it.

### Step 3A: Read the component
Read `components/LevelUpCelebrationModal.tsx`. Understand:
- What props it expects (visible, level, onClose, etc.)
- What it renders (animation, confetti, message)

### Step 3B: Find where XP is computed

The XP/level system computes levels on the player home. Read:
- `hooks/usePlayerHomeData.ts` — does it compute XP/level?
- `components/player-scroll/HeroIdentityCard.tsx` — does it display level?
- `components/player-scroll/ClosingMascot.tsx` — does it show XP to next level?

The formula (from web admin `PlayerDashboard.jsx`):
```
xp = (games_played * 100) + (kills * 10) + (aces * 25) + (digs * 5) + (blocks * 15) + (assists * 10) + (badges * 50)
level = floor(xp / 1000) + 1
```

### Step 3C: Add level-up detection to PlayerHomeScroll

Read `components/PlayerHomeScroll.tsx`. Add:
1. Import `LevelUpCelebrationModal`
2. Track previous level in AsyncStorage:
```tsx
const LEVEL_KEY = `lynx_player_level_${playerId}`;
```
3. On data load, compare current level to stored level:
   - If current level > stored level → show celebration modal
   - Update stored level to current level
4. Render the modal:
```tsx
<LevelUpCelebrationModal
  visible={showLevelUp}
  level={currentLevel}
  onClose={() => {
    setShowLevelUp(false);
    AsyncStorage.setItem(LEVEL_KEY, String(currentLevel));
  }}
/>
```

### Step 3D: Also wire for parent view

Parents should see when their child levels up. Read `components/ParentHomeScroll.tsx`:
- The parent home has `useParentHomeData` which fetches child data including XP/level
- Add the same level-up detection per child
- Use key: `lynx_parent_child_level_${childId}`
- Show the celebration with the child's name in context

**Verification:**
- Player home: if level changed since last open, celebration modal shows
- Parent home: if child's level changed, celebration shows
- Modal only shows once per level-up (not on every app open)
- Other roles unaffected
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Cleanup Phase 3: Wire LevelUpCelebrationModal with XP tracking" && git push`

---

## PHASE 4: WIRE SHAREREGISTRATIONMODAL + REGISTRATIONBANNER + REENROLLMENTBANNER

**Problem:** Three complete registration-related components exist but are never imported:
1. `ShareRegistrationModal.tsx` — QR code + copy link + share sheet for registration links
2. `RegistrationBanner.tsx` — CTA banner when registration is open
3. `ReenrollmentBanner.tsx` — 720-line self-contained re-enrollment flow

### Step 4A: Read all three components
Read each one fully. Understand props, data requirements, and trigger conditions.

### Step 4B: Wire ShareRegistrationModal

This should be accessible from the admin's registration hub and manage tab.

Read `app/registration-hub.tsx` — find a logical place to add a "Share Registration Link" button. If a share button already exists that does nothing, wire it to open this modal. If not, add a small share icon button in the header or action bar.

Also read `app/(tabs)/manage.tsx` — if there's a registration section, add a share button there too.

### Step 4C: Wire RegistrationBanner

This should show on the parent home when a season has open registration and the parent hasn't registered all their children.

Read `components/ParentHomeScroll.tsx`:
- Check if `useParentHomeData` fetches active season registration status
- If a season has open registration AND the parent has unregistered children → show `RegistrationBanner` at the top of the scroll (below the welcome, above the event hero)
- The banner should be dismissible (but come back next session)
- If no open registration or all children registered → don't render

### Step 4D: Wire ReenrollmentBanner

Read `components/ReenrollmentBanner.tsx` — the audit says it's self-contained and self-triggering (720 lines). Understand:
- Does it check for re-enrollment eligibility internally?
- Does it just need to be mounted?

If it's truly self-contained:
- Mount it in `ParentHomeScroll.tsx` alongside the RegistrationBanner
- It should handle its own visibility logic
- Place it below RegistrationBanner if both could show simultaneously (unlikely but handle gracefully)

If it needs external data:
- Wire the data it needs from `useParentHomeData` or add a query

**Verification:**
- Admin: Share Registration button works in registration-hub (opens QR + share sheet)
- Parent (with open registration): Registration banner shows if children unregistered
- Parent (returning): Re-enrollment banner shows if eligible
- Parent (all registered): Neither banner shows
- Other roles: unaffected
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Cleanup Phase 4: Wire ShareRegistration, RegistrationBanner, ReenrollmentBanner" && git push`

---

## PHASE 5: FINAL SWEEP

### Step 5A: Verify all orphans are resolved

Run the orphan detection from the audit:
```bash
for f in $(find components/ -maxdepth 1 -name "*.tsx" | grep -v _legacy | sort); do
  basename=$(basename "$f" .tsx)
  imports=$(grep -rn "$basename" --include="*.tsx" --include="*.ts" components/ app/ hooks/ lib/ | grep -v _legacy | grep -v "$f" | wc -l)
  if [ "$imports" -eq 0 ]; then
    echo "ORPHANED: $f"
  fi
done
```

If any new orphans are found, assess:
- Is it a utility/UI component used implicitly? (leave it)
- Is it truly dead? (move to `_legacy/`)

### Step 5B: Verify _legacy/ folder is clean

Nothing in `_legacy/` should be imported by active code:
```bash
grep -rn "_legacy" --include="*.tsx" --include="*.ts" components/ app/ hooks/ lib/ | grep -v _legacy | grep -v node_modules
```

If anything imports from `_legacy/`, that import needs to be removed or the file shouldn't have been moved.

### Step 5C: Full report

List:
1. Total files moved to `_legacy/` (count + names)
2. Total lines of dead code archived (approximate)
3. Components wired (ParentOnboarding, LevelUp, ShareRegistration, RegistrationBanner, Reenrollment)
4. Any orphans that remain and why
5. TSC result
6. All four roles confirmed working

**Commit:** `git add -A && git commit -m "Cleanup Phase 5: Final orphan sweep + verification" && git push`

---

## EXECUTION ORDER

```
Phase 1: Archive 17 legacy/orphaned files to _legacy/
Phase 2: Wire ParentOnboardingModal
Phase 3: Wire LevelUpCelebrationModal
Phase 4: Wire ShareRegistration + RegistrationBanner + ReenrollmentBanner
Phase 5: Final orphan sweep + verification
```

Execute all phases autonomously. Do not stop between phases. Commit after each phase.

---

*Reference: MOBILE-APP-AUDIT.md Section 6C for orphaned file inventory.*
