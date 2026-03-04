# CC-WAVE-8-NEW-SCREENS-AND-FINAL-SWEEP.md
# Lynx Mobile — Wave 8: New Screens, Final Sweep & Beta Readiness

**Priority:** Run after CC-WAVE-7-SETTINGS-AND-LEGAL completes  
**Estimated time:** 3–4 hours (5 phases, commit after each)  
**Risk level:** MEDIUM — new screens + comprehensive final audit

---

## WAVE CHECKLIST (update as completed)

- [ ] **Wave 0** — Archive dead code + wire admin stubs
- [ ] **Wave 1** — Kill ParentOnboardingModal + shared components brand pass
- [ ] **Wave 2** — Auth redesign + smart empty states
- [ ] **Wave 3** — Daily-use screens (Schedule, Chat, Team Hub)
- [ ] **Wave 4** — Player identity screens
- [ ] **Wave 5** — Coach tool screens
- [ ] **Wave 6** — Admin management screens
- [ ] **Wave 7** — Settings, legal, remaining screens
- [ ] **Wave 8** — New screens + final sweep ← THIS SPEC

---

## REFERENCE FILES — READ BEFORE WRITING ANY CODE

Read `LYNX-REFERENCE-GUIDE.md` for the full reference map.

### For this wave:

1. `reference/design-references/brandbook/LynxBrandBook.html` — Brand system
2. `reference/design-references/brandbook/lynx-screen-playbook-v2.html` — Read the **"Planned & Future"** section for new screen specs
3. `reference/design-references/player-mockups/s5-team-pulse.tsx` — Relevant for Season Progress screen
4. `reference/supabase_schema.md` — Schema for new features
5. All `assets/images/mascot/` images — various screens need mascots
6. `theme/colors.ts` and `lib/design-tokens.ts` — Design tokens

---

## DESIGN PHILOSOPHY

This is the polish wave. New screens should match the visual language established in Waves 1-7 perfectly. The final sweep catches anything that slipped through. When Wave 8 is done, the app should feel like one designer built every screen.

---

## PHASE 1: PLAYER GOALS & NOTES (NEW) + SEASON PROGRESS (NEW)

### 1A. Player Goals & Notes

Create `app/player-goals.tsx` — Per-player development tracking for coaches.

This turns Lynx from a management app into a **player development platform**. It's a differentiator.

**Navigation:** Accessed from child-detail (coach view) → "Development" tab or button. Also accessible from coach's player list → kebab menu → "Goals & Notes."

**Layout:**

**Player header (compact):**
- Avatar + name + jersey + team (one line, not a full hero — this is a tool screen)

**Active Goals section:**
- Each goal: card with goal description + target + current progress bar
- Example: "Improve serve accuracy" — Target: 85% — Current: 72% — Progress bar at 85%
- Goal status: On Track (teal), Behind (gold), At Risk (coral)
- "Add Goal" FAB or button

**Add/Edit Goal (bottom sheet):**
- Goal description (text input)
- Target metric (optional — text or number)
- Target date (date picker)
- Priority: High / Medium / Low (pill selector)
- "Save Goal" button

**Session Notes section (below goals):**
- Timeline of dated coach notes
- Each note: date header + note text + optional tags (e.g., "Serving", "Defense")
- "Add Note" button → text input + optional tag selector + save
- Notes are reverse chronological

**Empty state:** `Meet-Lynx.png` + "Start tracking [Player Name]'s development!"

### 1B. Season Progress / Journey

Create `app/season-progress.tsx` — Visual timeline of the season.

**Navigation:** Accessed from parent home scroll or My Stuff → "Season Journey"

This is the screen that makes parents feel like the season mattered. A visual story.

**Layout: Vertical scrollable timeline**

Each milestone is a node on the timeline:

- **Game results:** W/L badge + opponent + score + date
- **Badges earned:** badge icon + name + date
- **Stat improvements:** "New personal best! 8 kills in one match" + date
- **Shoutouts received:** sender name + message preview + date
- **Season milestones:** "First game!", "10 games played", "Half-way point"

**Visual treatment:**
- Left edge: vertical line connecting all nodes
- Each node: colored dot on the line (teal for positive, gold for neutral, coral for losses)
- Node card: extends right from the dot with details
- Most recent at top, season start at bottom
- Scrolling down = going back in time

**Summary card at top (before timeline starts):**
- Season name + date range
- Overall record: W-L-T
- Total badges earned
- Highlight stat (biggest improvement)

**Empty state:** If season just started with no data: `Meet-Lynx.png` + "Your season journey starts here! Milestones will appear as the season unfolds."

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: player goals & notes (new), season progress journey (new)"
git push
```

---

## PHASE 2: REMAINING NEW SCREENS

### 2A. Organization Settings (Simplified Mobile)

Create `app/org-settings.tsx` — Simplified version, full editor stays on web.

**Layout:**
- Org avatar / logo (tappable to change)
- Org name (editable)
- Contact email (editable)
- Phone (editable)
- Default venue (picker from venue list if venue-manager exists)
- Sport (dropdown)
- "Save Changes" button
- Divider
- "Full org management available on web" link with `laptoplynx.png` small icon → opens web URL

### 2B. Coach Background Checks

Create `app/coach-background-checks.tsx` — Status tracker per coach. Admin only.

**Simple list:**
- Each row: coach avatar + name + check status
- Status badges:
  - Valid: teal badge + checkmark + expiration date
  - Expiring Soon (< 30 days): gold badge + warning icon + expiration date
  - Expired: coral badge + alert icon
  - Not Submitted: gray badge + dash
- Tap row → bottom sheet with details (check type, provider, dates, notes)
- "Request Check" button if the check can be initiated from the app (otherwise just tracking)

### 2C. Volunteer Assignment

Create `app/volunteer-assignment.tsx` — Assign parents to event roles.

**3-step flow:**

**Step 1: Select Event**
- List of upcoming events (reuse EventCard compact)
- Tap to select

**Step 2: Assign Roles**
- Role cards for the selected event:
  - Scorekeeper (0/1 assigned)
  - Line Judge (0/2 assigned)
  - Snack Parent (0/1 assigned)
  - Custom roles if the DB supports them
- Each role card: tap to expand → shows available parents → tap parent to assign
- Assigned parents show as avatar + name + remove button

**Step 3: Notify**
- Preview of who's assigned to what
- "Send Notifications" button → notifies assigned parents
- Confirmation with `celebrate.png`

### 2D. Public Registration (Brand Pass)

`app/register/[seasonId].tsx` — The public-facing registration form. This is what new families see FIRST.

**This screen must look GREAT.** It represents Lynx to people who haven't signed up yet.

- Lynx logo at top
- Season name + org name prominently displayed
- "Welcome to [Org Name]!" with warm messaging
- Multi-step registration form (child info, waivers, payment)
- Brand inputs, brand step indicator
- `Meet-Lynx.png` mascot on the welcome/first step
- `celebrate.png` on the confirmation step
- Mobile-optimized: large tap targets, clear labels, no confusion

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: org settings, coach background checks, volunteer assignment, public registration brand pass"
git push
```

---

## PHASE 3: FINAL CONSISTENCY SWEEP

Go through EVERY screen in the app and verify visual consistency. This is the quality control pass.

### 3A. Color Audit

```bash
# Find any hardcoded colors that should be using brand tokens
grep -rn "#[0-9a-fA-F]\{6\}" --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/" | grep -v "theme/" | grep -v "design-tokens" > /tmp/color-audit.txt
wc -l /tmp/color-audit.txt
```

Review the output. Any colors that are NOT brand tokens should be replaced:
- Random blues → lynx-navy or lynx-sky
- Random greens → lynx-teal
- Random yellows → lynx-gold
- Random reds → lynx-coral
- Random grays → brand text/surface colors

Don't change colors inside SVG components or chart libraries unless they're visually wrong.

### 3B. Font Audit

```bash
# Find any hardcoded fontFamily that isn't the brand font
grep -rn "fontFamily" --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/" | grep -v "theme/"
```

Ensure all font references use the brand font constants, not hardcoded strings.

### 3C. Border Radius Audit

```bash
# Find hardcoded borderRadius that doesn't match brand tokens
grep -rn "borderRadius.*[0-9]" --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/" | grep -v "theme/" | head -30
```

Standard brand radii: 16px for cards, 12px for inputs, 8px for badges, 20px for pills, 999px for circles. Flag anything that's a random number.

### 3D. Empty State Audit

```bash
# Find screens that might show empty content without a proper empty state
grep -rn "\.length === 0\|\.length == 0\|no data\|no results\|empty" --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/"
```

Every empty condition should render a branded empty state with a mascot image (not just blank space or "No data").

### 3E. Navigation Audit

```bash
# Find any navigation that might be pointing to non-existent routes
grep -rn "router\.push\|router\.replace" --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/" > /tmp/nav-audit.txt

# Cross-reference with existing routes
ls app/*.tsx app/(tabs)/*.tsx app/(auth)/*.tsx app/chat/*.tsx app/register/*.tsx 2>/dev/null > /tmp/routes.txt

# Manual review: compare nav targets against actual routes
```

Fix any broken navigation links found.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: final consistency sweep - colors, fonts, radii, empty states, navigation"
git push
```

---

## PHASE 4: DEAD CODE + PERFORMANCE FINAL PASS

### 4A. Unused Import Sweep

```bash
# TypeScript should catch unused imports, but verify
npx tsc --noEmit 2>&1 | grep "declared but" | head -20
```

Remove any unused imports flagged.

### 4B. _legacy Inventory

```bash
# Count total archived files
find components/_legacy -name "*.tsx" -o -name "*.ts" | wc -l
echo "---"
find components/_legacy -name "*.tsx" -o -name "*.ts" | sort
```

Document the total count. Ensure no active code imports from `_legacy/`.

```bash
grep -rn "from.*_legacy" --include="*.tsx" --include="*.ts" app/ components/ lib/ | grep -v "node_modules"
# Expected: 0 results
```

### 4C. Console.log Cleanup

```bash
# Find console.log statements that should be removed for beta
grep -rn "console\.log" --include="*.tsx" --include="*.ts" app/ components/ lib/ | grep -v "node_modules" | grep -v "_legacy" | grep -v "reference/" | wc -l
```

Remove non-essential console.log statements. Keep:
- Error logging (`console.error`)
- Dev-only logs guarded by `__DEV__`

Remove:
- Debug logs ("OVERLAY TAP CAPTURED", etc.)
- Data-dump logs
- Feature-flag testing logs

### 4D. TypeScript Final Check

```bash
npx tsc --noEmit 2>&1 | tail -5
# Expected: 0 errors
```

If there are errors, fix them. This is the last pass — the app should compile clean.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: dead code cleanup, _legacy audit, console.log removal, final tsc pass"
git push
```

---

## PHASE 5: BETA READINESS REPORT

This is not a code phase — it's a documentation phase. Create a report of the app's state.

Create `BETA-READINESS-REPORT.md` in the repo root:

```markdown
# Lynx Mobile — Beta Readiness Report
Generated after Wave 8 completion.

## Build Status
- TypeScript: [0 errors / N errors]
- _legacy files: [N archived]
- Active imports from _legacy: [0 / N — list if any]
- Console.log statements: [N remaining — all guarded by __DEV__]

## Screen Inventory
- Total screens: [N]
- Fully branded: [N]
- Functional but needs polish: [N — list them]
- Stubbed/Coming Soon: [N — list them]
- Known broken: [N — list them with issue description]

## Role Coverage
- Admin: [list of accessible screens]
- Coach: [list of accessible screens]
- Parent: [list of accessible screens]
- Player: [list of accessible screens]

## New Screens Built (Wave 2-8)
- [list all new screens created across all waves]

## Known Issues for Beta
- [list any known bugs, rough edges, or missing features]

## Recommended Pre-Beta Fixes
- [list anything that should be fixed before real users touch the app]
```

```bash
git add -A
git commit -m "Phase 5: beta readiness report"
git push
```

---

## EXPECTED RESULTS

1. **Player Goals & Notes (NEW)** — Coach development tracking with goals + progress bars + session notes timeline. Differentiator feature.

2. **Season Progress / Journey (NEW)** — Vertical timeline of the season. Games, badges, stats, shoutouts as milestone nodes. Parents feel the season mattered.

3. **Organization Settings** — Simplified mobile form with web redirect for full management.

4. **Coach Background Checks** — Status tracker with expiration warnings.

5. **Volunteer Assignment** — 3-step: select event → assign roles → notify parents.

6. **Public Registration** — Premium brand treatment. This is Lynx's first impression on new families.

7. **Color/Font/Radius consistency** — Every screen uses brand tokens, not random hardcoded values.

8. **Empty states complete** — Every empty condition shows a mascot and guidance, not blank space.

9. **Navigation verified** — No broken links remaining.

10. **Dead code clean** — No _legacy imports, no stray console.logs, TypeScript compiles clean.

11. **Beta Readiness Report** — Complete inventory of app state, known issues, role coverage.

12. **5 commits** — one per phase, each pushed.

---

## WHAT HAPPENS AFTER WAVE 8

The 8-wave implementation is complete. The app is beta-ready. Next steps:

1. **Friends & Family Beta** — Real Black Hornets families use the app
2. **Feedback Collection** — What works, what's confusing, what's missing
3. **Bug Fix Sprint** — Address beta feedback
4. **Dashboard Customization** — The drag-and-drop widget system (Option B) that was deferred
5. **Push Notifications** — Full notification system with Expo
6. **App Store Prep** — Screenshots, store listing, TestFlight / Play Store beta track
7. **Multi-Org Testing** — Verify the app works for organizations beyond Black Hornets
8. **Launch**
