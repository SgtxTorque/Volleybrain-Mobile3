# CC-REGISTRATION-UX-FIXES.md
# Lynx Mobile — Registration UX Fixes + Post-Registration Experience

**Priority:** Run immediately after CC-NATIVE-REGISTRATION completes  
**Estimated time:** 3-4 hours (5 phases, commit after each)  
**Risk level:** LOW-MEDIUM — UX improvements to existing registration flow + new post-registration states

---

## PHASE 1: FULL-SCREEN LANDSCAPE SIGNATURE

### The Problem
Drawing a signature inside a small box on a scrolling form causes scroll interference. The user tries to sign but the page scrolls instead.

### The Fix
When the parent taps "Sign" on a waiver step, the app transitions to a FULL-SCREEN LANDSCAPE signature experience:

1. Parent taps "Sign Waiver" button
2. Screen locks to landscape orientation
3. Full-screen dark overlay with:
   - White signature canvas filling ~80% of the screen (large drawing area)
   - Waiver title at top: "Liability Waiver — Sign Below"
   - "Clear" button (left) — resets the canvas
   - "Confirm Signature" button (right, teal, large) — saves and returns
   - "Cancel" text button (small) — returns without signing
4. Touch gestures on the canvas are captured ONLY by the canvas (no scroll interference)
5. On confirm: signature saves as base64, screen rotates back to portrait, registration form shows green checkmark on that waiver

**Implementation:**

```typescript
// Lock to landscape when signature opens
import * as ScreenOrientation from 'expo-screen-orientation';

const openSignature = async () => {
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  setShowSignature(true);
};

const confirmSignature = async (base64: string) => {
  setSignatureData(base64);
  setShowSignature(false);
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
};
```

The signature screen should be a modal that renders ABOVE the registration form (not a new route), so the form state is preserved underneath.

Use `react-native-signature-canvas` or `expo-draw` for the canvas. Ensure `pointerEvents` on the canvas prevent scroll bleed-through.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: full-screen landscape signature - no scroll interference"
git push
```

---

## PHASE 2: FULL-SCREEN WAIVER DOCUMENT VIEWER

### The Problem
If an admin uploads a PDF waiver (not just inline text), parents need to actually read the document before confirming. A tiny text box isn't enough. And we need proof they at least had the document open.

### The Fix
Waiver viewing becomes a full-screen experience with a gated confirm button.

**Flow:**

1. On the waiver step, each waiver shows:
   - Waiver title
   - "Read & Sign" button (teal)

2. Tap "Read & Sign" → full-screen document viewer opens:

   **If the waiver is TEXT (stored in registration_config):**
   - Full-screen scrollable text view
   - Brand typography, comfortable reading (16px, 1.6 line height)
   - Scroll indicator on the right
   - "I Have Read and Agree" button at the BOTTOM — BUT it's disabled/grayed out until the user has scrolled to the bottom of the document
   - Once scrolled to bottom: button activates (teal, full width)
   - Tap → closes document → opens signature flow

   **If the waiver is a PDF (uploaded by admin):**
   - Full-screen PDF viewer (use `react-native-pdf` or `expo-web-browser` or render in a WebView)
   - Pinch to zoom
   - Page indicator: "Page 2 of 4"
   - Same gated button: disabled until they've scrolled through all pages (or been on the screen for a reasonable time, like 10 seconds per page)
   - "I Have Read and Agree" button activates → closes → signature flow

3. After confirming from the document screen:
   - Registration form shows a green checkmark ✓ next to that waiver
   - If they cancel (tap back without confirming): waiver stays unchecked, no signature captured

**The gate logic:**

```typescript
const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

// For text waivers:
const handleScroll = (event) => {
  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
  const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;
  if (isAtBottom) setHasScrolledToBottom(true);
};

// For PDF waivers:
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const hasViewedAllPages = currentPage >= totalPages;
```

### Fix the shadow on confirm buttons

While in the waiver/signature screens, verify all buttons use brand shadow values (subtle, not heavy). Check:
```bash
grep -rn "shadowOpacity" app/register/ components/SignaturePad.tsx | head -10
```
Normalize any heavy shadows to brand standard (0.08-0.12).

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: full-screen waiver viewer with scroll-gated confirm, fix button shadows"
git push
```

---

## PHASE 3: POST-REGISTRATION REDIRECT + HOMEPAGE STATE

### The Problem
After registration, tapping "View My Registrations" goes to the registration hub. But it should go HOME — where the parent sees the status of their registration, action items, and (if new) gets guided through the app.

### The Fix

After registration success screen, TWO buttons:
- "Go Home" (teal, primary) → navigates to home tab
- "Register Another Child" (outlined, secondary) → back to registration start

NO "View My Registrations" button. The homepage IS their registration status.

### Homepage Registration Status

On `ParentHomeScroll.tsx`, when a parent has a PENDING registration (submitted but not yet approved):

**New "Registration Status" card (replaces the old ugly cards):**

```
┌──────────────────────────────────────┐
│  🕐 REGISTRATION PENDING             │
│                                      │
│  [Child Name] — Summer 2026          │
│  Submitted Mar 7 · Awaiting approval │
│                                      │
│  What happens next:                  │
│  ✓ Registration submitted            │
│  ○ Admin reviews your registration   │
│  ○ Team assignment                   │
│  ○ Payment confirmation              │
│                                      │
│  You'll be notified when approved!   │
└──────────────────────────────────────┘
```

- Brand card with gold left border (pending = gold/warning color)
- Progress steps showing where they are in the process
- When approved: card updates to teal border, "APPROVED ✓", shows team assignment
- When payment is due: card shows payment CTA
- When fully complete: card eventually disappears (or becomes a subtle "All set!" confirmation)

**If multiple children registered:** Show a card per child, or a combined card with status per child.

**If registering for UPCOMING season while IN a current season:**
- The registration status card appears BELOW the current season content (events, games, schedule)
- It does NOT push the current season content down or replace it
- Subtle section divider: "UPCOMING: Summer 2026" above the registration status card
- The player card carousel still shows current season player cards
- When the new season starts, the cards transition naturally

### Player Card Status Indicator

On the player card (in the parent's carousel or trading card):
- If registration pending: small gold clock icon badge on the card corner
- If registration approved but payment pending: small coral $ badge
- If fully registered and paid: small teal checkmark badge
- If not registered for an upcoming open season: subtle "Register →" link below the card

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: post-registration homepage state with status tracking, player card badges"
git push
```

---

## PHASE 4: FIRST-TIME USER EXPERIENCES (4 ENTRY PATHS)

Different users arrive at Lynx differently. Each path needs its own first experience.

### Path 1: Cold Download (Organic)
**Scenario:** Parent downloads Lynx from the app store cold. No invite, no registration link, no code.

**Flow:**
1. Welcome screen with `Meet-Lynx.png` mascot
2. Sign up (create account)
3. After sign up: "How did you hear about Lynx?"
   - "My coach told me to download it" → "Enter your invite code or look up your organization" → org search by name → find org → see open seasons → register
   - "I found it on my own" → "Are you a coach/admin or a parent?" → role picker
     - Parent: "Look up your organization" → org search → register. OR "My org isn't on Lynx yet" → waitlist/interest form
     - Coach/Admin: "Create your organization" → org setup wizard (simplified)
4. After finding their org + registering: land on homepage with registration pending status

### Path 2: Registration Link (Facebook, email, text)
**Scenario:** Parent taps a registration link shared by the coach on social media.

**Flow:**
1. Smart landing page (web) detects: has the app? → deep link. Doesn't have it? → app store with deferred deep link
2. After installing + opening: welcome screen, but with context: "You've been invited to register for [Org Name]!"
3. Sign up (or log in if they already have an account)
4. After auth: skip the "find your org" step → go straight to the registration form for the linked season
5. After registering: homepage with pending status

### Path 3: Invite Code
**Scenario:** Coach says "Download Lynx, use code BH2026 to join us."

**Flow:**
1. Welcome screen → Sign up
2. "Enter invite code" field on the sign-up flow (or immediately after)
3. Code resolves to the org → shows org name + logo for confirmation: "Join Black Hornets?"
4. After confirming: see open seasons → register (or skip if the code auto-assigns them)
5. Homepage with pending status (or populated if auto-approved)

### Path 4: Pre-Added by Admin
**Scenario:** Admin added the parent/player from the web admin. Parent downloads the app and claims their account.

**Flow:**
1. Welcome screen → Sign up with the SAME email the admin used
2. App detects: "We found an account for you! It looks like [Org Name] already added you."
3. "Claim Your Account" → verifies email → links the profile
4. Homepage is ALREADY populated (team, schedule, roster visible) — no registration needed
5. If any profile info is missing: "Complete your profile" mini-form (from the incomplete profile system in Phase 9 of registration spec)

### Implementation

These paths share the same auth screens (welcome, login, signup) but DIVERGE after authentication based on:
- Did they arrive via a deep link? (Path 2)
- Did they enter an invite code? (Path 3)
- Does their email match an existing profile? (Path 4)
- None of the above? (Path 1)

**Create `lib/onboarding-router.ts`:**

```typescript
async function determineOnboardingPath(userId: string, context?: {
  deepLinkSeasonId?: string;
  inviteCode?: string;
}): Promise<'cold' | 'registration_link' | 'invite_code' | 'claim_account' | 'already_set_up'> {
  
  // Check if user has existing player_parents links (Path 4 or returning user)
  const existingLinks = await checkExistingLinks(userId);
  if (existingLinks.length > 0) return 'already_set_up';
  
  // Check if email matches an unclaimed profile (Path 4)
  const unclaimedProfile = await checkUnclaimedProfile(userEmail);
  if (unclaimedProfile) return 'claim_account';
  
  // Check context
  if (context?.deepLinkSeasonId) return 'registration_link';
  if (context?.inviteCode) return 'invite_code';
  
  return 'cold';
}
```

**Post-auth routing:**

```typescript
const path = await determineOnboardingPath(user.id, context);

switch (path) {
  case 'already_set_up':
    router.replace('/(tabs)/home');  // Go straight home
    break;
  case 'claim_account':
    router.replace('/claim-account');  // Claim flow
    break;
  case 'registration_link':
    router.replace(`/register/${context.deepLinkSeasonId}`);  // Straight to form
    break;
  case 'invite_code':
    router.replace('/join-org');  // Org confirmation + registration
    break;
  case 'cold':
    router.replace('/find-org');  // Org search
    break;
}
```

### First-Time App Tour (for Paths 1, 2, 3 after registration)

After a new user completes registration for the first time:
- Optional 3-screen swipeable tour (skippable):
  1. `Meet-Lynx.png` — "Welcome to Lynx! Your team's home base."
  2. Schedule screenshot — "Never miss a game. RSVPs, directions, countdowns."
  3. Player card screenshot — "Watch your player grow. Stats, badges, challenges."
- "Get Started" button → homepage
- Tour only shows ONCE (flag in AsyncStorage: `hasSeenTour: true`)

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: four entry paths with onboarding router, first-time tour, claim account flow"
git push
```

---

## PHASE 5: SEASON TRANSITION HANDLING + VERIFY

### The Problem
A parent is IN a current season (Spring 2026) and registers for an UPCOMING season (Summer 2026). The app needs to handle both gracefully without breaking the current experience.

### The Fix

**Season context stays on CURRENT season:**
- The home scroll, schedule, chat, team hub all show the CURRENT active season
- The registration status for the upcoming season appears as a SEPARATE card below the current season content
- Player card carousel shows current season cards (not upcoming season cards — they don't exist yet)

**Season switcher (if it exists):**
- Shows: "Spring 2026 (Active)" and "Summer 2026 (Upcoming)"
- Switching to upcoming season shows limited content: registration status, team assignment (if any), fee status
- Most screens (schedule, chat, game day) are empty for the upcoming season: "Season starts May 1"

**When the new season starts:**
- The season context automatically switches to the new active season
- Previous season moves to "Past" / archives
- Player cards update to the new season's data
- Registration status card disappears (they're fully registered)

**Player card badge system for registration:**

On each player card in the parent's carousel:
- Pending registration: 🕐 gold clock badge (top-right corner)
- Approved, payment pending: 💲 coral badge
- Fully registered + paid: ✅ teal checkmark badge (brief, then disappears after a few days)
- Open season, not registered: subtle "Register for Summer 2026 →" link below the card

### Verify

```bash
# 1. TypeScript
npx tsc --noEmit 2>&1 | grep -v "reference\|design-reference" | tail -10

# 2. Signature is full-screen landscape
grep -n "LANDSCAPE\|lockAsync\|SignaturePad\|signature.*full" app/register/ components/ --include="*.tsx" -r | head -5

# 3. Waiver viewer has scroll gate
grep -n "hasScrolledToBottom\|scroll.*gate\|viewed.*all" app/register/ components/ --include="*.tsx" -r | head -5

# 4. Post-registration goes to home
grep -n "Go Home\|router.*home\|tabs.*home" app/register/ --include="*.tsx" -r | head -5

# 5. Registration status card on home scroll
grep -n "REGISTRATION.*PENDING\|registration.*status\|pending.*registration" components/ParentHomeScroll.tsx | head -5

# 6. Onboarding router exists
ls -la lib/onboarding-router.ts

# 7. Player card registration badges
grep -n "registration.*badge\|pending.*icon\|clock.*badge" components/PlayerCard.tsx components/PlayerTradingCard.tsx 2>/dev/null | head -5

git add -A
git commit -m "Phase 5: season transition handling, player card registration badges, verification"
git push
```

---

## EXPECTED RESULTS

1. **Full-screen landscape signature** — no scroll interference, app rotates to landscape, large canvas, clear/confirm buttons, rotates back after signing
2. **Full-screen waiver viewer** — scroll-gated confirm (must scroll to bottom before button activates), works for both text waivers and PDF uploads
3. **Button shadows fixed** — no more heavy shadows on waiver/registration confirm buttons
4. **Post-registration goes HOME** — not registration hub. Homepage shows registration status card with progress steps (submitted → reviewed → assigned → paid)
5. **Player card registration badges** — gold clock (pending), coral $ (payment due), teal check (complete)
6. **Season transition** — registering for upcoming season doesn't break current season experience. Upcoming season content appears below current.
7. **Four entry paths handled** — cold download, registration link, invite code, pre-added by admin. Each gets the right first experience.
8. **Onboarding router** — determines which path after auth and routes accordingly
9. **First-time tour** — 3-screen skippable intro for new users
10. **Account claiming** — pre-added users match by email and claim their profile
11. **5 commits** — one per phase, each pushed
