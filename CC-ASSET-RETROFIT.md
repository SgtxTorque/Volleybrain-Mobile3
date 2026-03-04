# CC-ASSET-RETROFIT.md
# Lynx Mobile — Asset Retrofit: Real Mascots, Empty States & Visual Polish

**Priority:** Run anytime — standalone cleanup pass  
**Estimated time:** 1–2 hours (4 phases, commit after each)  
**Risk level:** LOW — replacing placeholders and adding images, no structural changes

---

## PURPOSE

Waves 0-8 have been completed, but some screens were built before the mascot images and brand assets were properly connected. This spec:
1. Ensures mascot/brand images are in `assets/images/` and importable
2. Replaces any placeholder mascot Views with real PNG assets
3. Adds mascot images to empty states that are missing them
4. Does a visual pattern check against the brand book (NOT the v0 mockups)

---

## IMPORTANT: BRAND BOOK IS THE SOURCE OF TRUTH

The files in `reference/design-references/v0-mockups/` and `reference/design-references/player-mockups/` are **inspiration only**. They were generated from Vercel v0 based on the brand book, but they may have drifted or interpreted things differently.

**DO NOT override brand book decisions with v0 mockup patterns.**

The hierarchy is:
1. **`reference/design-references/brandbook/LynxBrandBook.html`** — FINAL AUTHORITY on colors, fonts, gradients, spacing, component patterns
2. **`reference/design-references/brandbook/lynx-screen-playbook-v2.html`** — FINAL AUTHORITY on screen layouts, animation, empty states, wireframes
3. **`reference/design-references/v0-mockups/`** — Inspiration only. If a v0 component contradicts the brand book, the brand book wins.
4. **`reference/design-references/player-mockups/`** — Inspiration only. Same rule.

When reviewing screens in this spec, compare them against the **brand book** first. Only reference v0 mockups if you need inspiration for HOW to implement something the brand book describes but doesn't show code for.

---

## PHASE 1: ENSURE MASCOT & BRAND ASSETS ARE IN PLACE

### 1A. Check if assets already exist

```bash
ls assets/images/mascot/ 2>/dev/null && echo "mascot folder exists" || echo "MISSING - need to create"
ls assets/images/brand/ 2>/dev/null && echo "brand folder exists" || echo "MISSING - need to create"
```

### 1B. Copy any missing assets

If the folders don't exist or are incomplete, copy from reference:

```bash
mkdir -p assets/images/mascot
mkdir -p assets/images/brand

# Mascot images
cp -n reference/design-references/images/celebrate.png assets/images/mascot/
cp -n reference/design-references/images/HiLynx.png assets/images/mascot/
cp -n reference/design-references/images/SleepLynx.png assets/images/mascot/
cp -n reference/design-references/images/Meet-Lynx.png assets/images/mascot/
cp -n reference/design-references/images/laptoplynx.png assets/images/mascot/

# Brand images
cp -n reference/design-references/images/lynx-logo.png assets/images/brand/
cp -n reference/design-references/images/lynx-icon-logo.png assets/images/brand/
cp -n reference/design-references/images/volleyball-game.jpg assets/images/brand/
cp -n reference/design-references/images/volleyball-practice.jpg assets/images/brand/
```

The `-n` flag skips files that already exist. No overwrites.

### 1C. Verify all 9 assets are present

```bash
echo "=== Mascot ==="
ls -la assets/images/mascot/
echo "=== Brand ==="
ls -la assets/images/brand/
```

Expected: 5 mascot files (celebrate, HiLynx, SleepLynx, Meet-Lynx, laptoplynx) + 4 brand files (lynx-logo, lynx-icon-logo, volleyball-game, volleyball-practice).

```bash
npx tsc --noEmit
git add -A
git commit -m "Asset retrofit: ensure mascot and brand images in assets/"
git push
```

---

## PHASE 2: REPLACE PLACEHOLDER MASCOTS WITH REAL IMAGES

Search for placeholder mascot implementations and replace with real images.

### 2A. Find placeholders

```bash
# Find any teal circles, placeholder boxes, or emoji mascots used as stand-ins
grep -rn "teal.*circle\|placeholder.*mascot\|mascot.*placeholder\|🐱\|🦁\|mascot.*View\|MascotPlaceholder\|mascotPlaceholder" \
  --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/"
```

```bash
# Find any inline mascot styling that looks like a colored circle/box placeholder
grep -rn "width.*120.*height.*120\|borderRadius.*60\|backgroundColor.*teal.*width" \
  --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/"
```

```bash
# Find components that SHOULD have mascots but might not (empty states, welcome, tour)
grep -rn "empty.*state\|EmptyState\|noData\|NoData\|no.*results\|nothing.*here\|no.*events\|no.*chats\|free.*day\|waiting.*for\|not.*connected\|get.*started" \
  --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/"
```

### 2B. Replace each placeholder

For every placeholder found, replace with the appropriate real image:

| Context | Use This Image | Import |
|---------|---------------|--------|
| Welcome / greeting / waving | `HiLynx.png` | `require('../../assets/images/mascot/HiLynx.png')` |
| First-time experience / intro / onboarding | `Meet-Lynx.png` | `require('../../assets/images/mascot/Meet-Lynx.png')` |
| Success / achievement / celebration / approval | `celebrate.png` | `require('../../assets/images/mascot/celebrate.png')` |
| Empty state / nothing here / free day / waiting | `SleepLynx.png` | `require('../../assets/images/mascot/SleepLynx.png')` |
| Web redirect / "available on web" / loading setup | `laptoplynx.png` | `require('../../assets/images/mascot/laptoplynx.png')` |
| Auth headers / login logo | `lynx-icon-logo.png` | `require('../../assets/images/brand/lynx-icon-logo.png')` |
| Auth branding / welcome screen logo | `lynx-logo.png` | `require('../../assets/images/brand/lynx-logo.png')` |

**Standard mascot image style:**
```typescript
<Image
  source={require('../../assets/images/mascot/SleepLynx.png')}
  style={{ width: 120, height: 120, alignSelf: 'center', marginBottom: 16 }}
  resizeMode="contain"
/>
```

Adjust the `require()` path depth based on the file's location in the project. For files in `app/`, it's likely `../assets/...`. For files in `components/`, it's likely `../assets/...` or `../../assets/...`.

### 2C. Check auth screens specifically

The auth screens (welcome, login, signup, pending-approval, first-launch tour) were built in Wave 2 when assets might not have been connected. Check each:

```bash
# Check if auth screens use real images or placeholders
grep -rn "Image\|require.*mascot\|require.*brand\|placeholder\|teal.*circle" \
  --include="*.tsx" app/\(auth\)/ components/FirstLaunchTour.tsx components/empty-states/ 2>/dev/null
```

For each auth screen, verify:
- `welcome.tsx` → uses `HiLynx.png` (not a colored circle)
- `login.tsx` → uses `lynx-icon-logo.png` (not text-only)
- `pending-approval.tsx` → uses `SleepLynx.png` for waiting, `celebrate.png` for approved
- `FirstLaunchTour.tsx` → uses `Meet-Lynx.png` on intro screen
- Empty state components → use `SleepLynx.png`, `HiLynx.png`, or `Meet-Lynx.png`

```bash
npx tsc --noEmit
git add -A
git commit -m "Asset retrofit: replace placeholder mascots with real PNG assets"
git push
```

---

## PHASE 3: EMPTY STATE AUDIT — EVERY SCREEN NEEDS A MASCOT

Go through every screen that can show an empty/no-data condition and make sure it has a real mascot image — not just text, not just blank space.

### 3A. Catalog all empty states

```bash
# Find all conditional empty renders
grep -rn "length === 0\|\.length == 0\|!.*data\|isEmpty\|no.*items\|emptyState\|EmptyState\|empty-state" \
  --include="*.tsx" app/ components/ | grep -v "_legacy" | grep -v "node_modules" | grep -v "reference/" | sort
```

### 3B. Required empty states checklist

Verify each of these has a branded empty state with a mascot image and friendly text:

**Schedule screens:**
- [ ] No events today → `SleepLynx.png` + "Free day! No events scheduled."

**Chat screens:**
- [ ] No chat channels → `SleepLynx.png` + "Your team chats will appear here once you're connected."
- [ ] No messages in thread → (this is fine without a mascot — just show the empty thread)

**Team Hub / Team Wall:**
- [ ] No posts → `Meet-Lynx.png` + "Your team's activity will show up here."
- [ ] No photos in gallery → `SleepLynx.png` + "No photos yet!"

**Home scroll empty states:**
- [ ] NoOrgState → `HiLynx.png` + guidance to connect
- [ ] PendingApprovalState → `SleepLynx.png` + waiting message
- [ ] NoTeamState → `SleepLynx.png` + "Waiting for team assignment"
- [ ] EmptySeasonState → `SleepLynx.png` + "Season hasn't started yet"

**Player screens:**
- [ ] My Stats with no data → `SleepLynx.png` + "Stats appear after your first game."
- [ ] Achievements with no badges → `Meet-Lynx.png` + "Keep playing!"
- [ ] Child Detail with no stats → `SleepLynx.png`

**Coach screens:**
- [ ] Attendance with no event selected → text guidance (mascot optional)
- [ ] Game Results with no games → `SleepLynx.png`
- [ ] Lineup Builder with no players → `SleepLynx.png`

**Admin screens:**
- [ ] Registration Hub with no pending → `celebrate.png` + "All caught up!"
- [ ] Payments with all paid → `celebrate.png` + "Everyone's paid!"
- [ ] Admin Search with no results → `SleepLynx.png` + "No results found."
- [ ] Season Reports with no data → `SleepLynx.png`

**Settings / Utility:**
- [ ] My Kids with no children → `Meet-Lynx.png` + "Add your first child!"
- [ ] Help screen header → `HiLynx.png` + "How can we help?"
- [ ] Web Features → `laptoplynx.png` + "Some features work best on the big screen!"
- [ ] Invite Friends → `Meet-Lynx.png` + "Spread the word!"

For any that are MISSING the mascot image, add it using the standard pattern from Phase 2B.

```bash
npx tsc --noEmit
git add -A
git commit -m "Asset retrofit: complete empty state audit - mascot images on all empty conditions"
git push
```

---

## PHASE 4: BRAND BOOK VISUAL SPOT-CHECK

**Read `reference/design-references/brandbook/LynxBrandBook.html` now.** Open the HTML file and extract the exact values for the checks below.

This is NOT a full restyle — Waves 1-8 already did that. This is a spot-check to catch anything that drifted.

### 4A. Verify core brand colors are used correctly

Read the brand book and confirm these exact hex values appear in `theme/colors.ts`:

```bash
grep -n "10284C\|4BB9EC\|2A9D8F\|E9C46A\|E76F51" theme/colors.ts
```

If any are missing or wrong, fix them.

### 4B. Spot-check 5 high-traffic screens

Open these 5 files and visually verify they match the brand book's component patterns (card radius, shadow, font weight, section header style):

1. `components/ParentHomeScroll.tsx` — home scroll cards match brand book card spec?
2. `components/CoachHomeScroll.tsx` — same check
3. `app/(tabs)/parent-schedule.tsx` or schedule component — day strip and event cards match?
4. `app/(tabs)/chats.tsx` — channel rows, unread badges match?
5. `app/(auth)/welcome.tsx` — does the welcome screen match the brand book's auth spec?

For each, check:
- Card `borderRadius` = 16 (brand standard)?
- Card shadows use brand shadow tokens (subtle, not heavy)?
- Section headers are uppercase, letter-spaced, secondary text color?
- Primary actions are lynx-teal?
- Danger/destructive actions are lynx-coral?
- Status badges use the correct brand colors (teal=success, coral=danger, gold=warning)?

If anything is off, make the minimal fix. Do NOT refactor entire files — just correct the specific value.

### 4C. Verify v0 mockups didn't override brand book

If any screen looks like it's using colors, spacing, or patterns from the v0 mockups that DON'T match the brand book, correct them to match the brand book. Common drift:
- v0 may have used slightly different blues or grays
- v0 spacing may differ from brand book spacing scale
- v0 card shadows may be heavier than the brand book specifies

The brand book wins in every case.

```bash
npx tsc --noEmit
git add -A
git commit -m "Asset retrofit: brand book visual spot-check on high-traffic screens"
git push
```

---

## EXPECTED RESULTS

1. **All 9 mascot/brand images** confirmed in `assets/images/` and importable
2. **Zero placeholder mascots** remaining — every teal circle, empty View, or emoji stand-in replaced with a real PNG
3. **Every empty state has a mascot** — no screen shows blank space when there's no data
4. **Auth screens use real assets** — welcome has HiLynx, login has the logo, pending has SleepLynx, approval has celebrate
5. **Brand book is the authority** — any v0 drift corrected back to brand book values
6. **4 commits** — one per phase, each pushed
