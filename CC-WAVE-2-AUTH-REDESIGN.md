# CC-WAVE-2-AUTH-REDESIGN.md
# Lynx Mobile — Wave 2: Auth Flow Redesign + Smart Empty States

**Priority:** Run after CC-WAVE-1-SHARED-COMPONENTS completes  
**Estimated time:** 4–6 hours (6 phases, commit after each)  
**Risk level:** HIGH — restructuring auth flow, touching navigation tree  

---

## WAVE CHECKLIST (update as completed)

- [ ] **Wave 0** — Archive dead code + wire admin stubs
- [ ] **Wave 1** — Kill ParentOnboardingModal + shared components brand pass
- [ ] **Wave 2** — Auth redesign + smart empty states ← THIS SPEC
- [ ] Wave 3 — Daily-use screens (Schedule, Chat, Team Hub)
- [ ] Wave 4 — Player identity screens (Child Detail, My Stats, Achievements)
- [ ] Wave 5 — Coach tool screens (Attendance, Game Results, Lineup Builder)
- [ ] Wave 6 — Admin management screens
- [ ] Wave 7 — Settings, legal, remaining screens
- [ ] Wave 8 — New/planned screens

---

## REFERENCE FILES — READ THESE FIRST

1. `reference/design-references/brandbook/LynxBrandBook.html` — Brand system (colors, fonts, gradients, components)
2. `reference/design-references/brandbook/lynx-screen-playbook-v2.html` — Open this file and find the "Auth & Onboarding" section in the JavaScript `screens` array. Read the design vision, layout, animation, and wireframes for: Welcome/Splash, Login, Signup (Unified 3-Step), Public Registration, Pending Approval, Redeem Invite Code, Claim Account.
3. `reference/supabase_schema.md` — Database schema. You will need this for org lookup, invite codes, and user creation.
4. `theme/colors.ts` and `theme/fonts.ts` — Design tokens (should be updated from Wave 1).

---

## IMPORTANT: THREE ENTRY PATHS

The old auth assumed everyone had an org code and knew their role. The new auth supports three real-world paths:

### Path 1: Invite Code / Registration Link
Someone got a code from their coach or tapped a registration link.  
**Flow:** Welcome → Signup (3-step) → Step 3 has code pre-filled or entered → Register child/self → Payment if required → Home (populated)

### Path 2: Coach/Admin Verbal Invite  
"Download Lynx, I'll add you from my end."  
**Flow:** Welcome → Signup (3-step) → Step 3: skip org code → Land on Home with smart empty state → Admin adds them from their side → Push notification: "Coach Carlos invited you to Black Hornets 14U" → Accept → Home populates

### Path 3: Organic / Exploring  
Downloaded cold, no code, no invite.  
**Flow:** Welcome → Signup (3-step) → Step 3: "Join an Org" (enter code) OR "Create an Org" (admin path) OR "Skip for now" → First-launch tour (3-4 swipeable screens, skippable) → Home with smart empty states guiding next steps

All three paths share the same Welcome and Signup screens. They diverge at Step 3 and after.

---

## PHASE 0: DEV BYPASS + ROLE SHORTCUT

Add a developer-only fast lane so you don't have to log in every reload during beta.

### 0A. Dev Auth Bypass

In `lib/auth.tsx` (or wherever the auth provider lives):

1. Check for an environment variable: `DEV_SKIP_AUTH` (from `.env` or `app.config.js` extra)
2. If `DEV_SKIP_AUTH=true` AND `__DEV__` is true (Expo dev mode):
   - Skip the auth gate entirely
   - Auto-authenticate as the test user (use a hardcoded profile ID or email from .env: `DEV_USER_EMAIL`)
   - Log to console: `[DEV] Auth bypassed — logged in as ${email}`
3. If `DEV_SKIP_AUTH` is not set or is false, normal auth flow runs
4. This should NEVER work in production builds — guard with `__DEV__` check

### 0B. Dev Role Switcher on Login Screen

On the login screen (`(auth)/login.tsx`), add a dev-only section at the bottom (only visible when `__DEV__` is true):

```
─── DEV TOOLS ───────────────
[Admin] [Coach] [Parent] [Player]
```

Four tappable buttons. Each one:
- Auto-fills the login credentials for the test user
- Sets a flag in the auth context for which role to switch to after login
- Submits the login form automatically
- After login completes, auto-switches to the selected role

This saves you from: login → home → drawer → switch role every single time.

**Styling:** Subtle, small text, muted colors. Clearly labeled as dev-only. Don't make it pretty — make it functional.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 0: dev auth bypass + role shortcut on login screen"
git push
```

---

## PHASE 1: ARCHIVE OLD AUTH SCREENS + BUILD UNIFIED SIGNUP

### 1A. Archive Old Screens

Move these to `components/_legacy/auth/`:

| File | Reason |
|------|--------|
| `app/(auth)/parent-register.tsx` | Replaced by unified signup Step 2 role picker |
| `app/(auth)/coach-register.tsx` | Replaced by unified signup Step 2 role picker |
| `app/(auth)/league-setup.tsx` | Replaced by "Create Org" mini-flow in Step 3 |

After moving, search and remove any navigation references to these routes:
```bash
grep -rn "parent-register\|coach-register\|league-setup" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules"
```

Update any `router.push` or `<Link>` that pointed to these routes to point to the new unified signup instead.

### 1B. Redesign Welcome Screen

`app/(auth)/welcome.tsx` — The front door of Lynx.

**From the playbook:**
- Immersive, full-screen gradient (lynx-navy to lynx-sky)
- Lynx logo centered in upper third
- Mascot illustration centered (use a placeholder View with the mascot's colors/shape if no asset exists yet — a teal circle with eyes, 120x120)
- Two CTAs at bottom:
  - Primary (filled teal): **"Get Started"** → navigates to signup
  - Secondary (outlined): **"I Already Have an Account"** → navigates to login
- Optional: floating particle effect or subtle gradient animation (only if easy with RN Animated — skip if complex)

**Animation on mount:** Logo fades in (300ms) → mascot slides up with spring (400ms) → CTAs stagger in from bottom (100ms apart). Use `Animated` from react-native, not a library.

### 1C. Redesign Login Screen

`app/(auth)/login.tsx` — Zero friction.

- Light background (white or off-white `#F8FAFC`)
- Lynx logo small at top (centered, 48px height)
- Email field (auto-focus on mount, `keyboardType="email-address"`, `autoCapitalize="none"`)
- Password field (secureTextEntry with show/hide toggle)
- **"Sign In"** button (filled teal, full width, disabled until both fields have content)
- "Forgot Password?" link below button (teal text, smaller)
- "Don't have an account? **Sign Up**" at bottom (teal bold on the "Sign Up" part)
- **Shake animation on wrong password** — use `Animated.sequence` with 3 rapid translateX shifts (like iOS wrong passcode)
- Loading spinner overlay on submit
- Dev tools section at bottom (from Phase 0B) — only when `__DEV__`

### 1D. Build Unified Signup (3-Step)

`app/(auth)/signup.tsx` — Replace the current signup with the 3-step flow.

**Step indicator at top:** Three dots connected by a line. Current step = teal filled. Future = gray outline. Completed = teal filled with checkmark. Persistent across all 3 steps.

**Step 1: Your Info**
- First Name field
- Last Name field  
- Email field
- Password field (with strength indicator: weak/medium/strong as colored bar)
- "Next →" button (disabled until all fields valid)

**Step 2: I Am A... (Role Picker)**
- Large tappable cards, stacked vertically, one per role:
  - **Coach** — whistle icon, "I coach a team" subtitle
  - **Parent** — family icon, "My child plays" subtitle  
  - **Player** — volleyball icon, "I'm a player" subtitle
- Tap a card → teal border appears + subtle scale pulse → **auto-advances to Step 3 after 500ms**
- Cards should feel like character selection in a video game
- No "Next" button on this step — selection IS the action

**Step 3: Connect (varies by role)**

This step adapts based on the role selected in Step 2:

**If Coach or Parent:**
- "Have an invite code?" input field
- "Enter Code" button
- Divider: "— or —"
- "Skip for now — I'll connect later" link (text button, not prominent)
- If code is entered and valid: show org name confirmation → "Join [Org Name]" button → creates account + joins org → navigates to home (or pending approval if org requires it)
- If code is invalid: shake the input, show error message below

**If Player:**
- Same as Coach/Parent but with friendlier language: "Your coach may have given you a code"
- "Skip" option more prominent since players are often added by coaches

**If Coach AND they want to create an org:**
- Below the code input, add: "Or, **create a new organization**" link
- Tapping opens a simplified inline form (not a new screen):
  - Organization Name
  - Sport (dropdown, default Volleyball)
  - "Create Organization" button
- On success: show a confirmation card:
  - "✓ [Org Name] created!"
  - "Your org code is: **[CODE]**"  
  - "Share this code with your coaches and parents"
  - "For full setup (seasons, teams, fees, waivers), head to the web dashboard at thelynxapp.com"
  - "Continue to Home →" button
- This is intentionally lightweight — the real org setup happens on web

**Transitions between steps:** Horizontal slide animation (step slides left, new step slides in from right). Back arrow in header to go to previous step.

**Account creation happens after Step 3 completes** (or after "Skip for now"). Create the Supabase auth user + profile record. Set the role. If an org code was entered, create the org membership.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: archive old auth, redesign welcome + login, build unified 3-step signup"
git push
```

---

## PHASE 2: REDEEM CODE + PENDING APPROVAL + CLAIM ACCOUNT

These supporting screens handle the edges of the auth flow.

### 2A. Redeem Code Screen

`app/(auth)/redeem-code.tsx` — This screen still has value as a deep-link target. When someone taps a registration link, the app can route here with the code pre-filled.

- Simple centered card on light background
- "Enter your invite code" heading
- Large code input (uppercase, monospace font, letter-spaced — like entering a gift card)
- "Join" button (teal, full width)
- On valid code: show org name → "Welcome to [Org Name]!" → route to signup with org pre-filled
- On invalid code: shake input, "Code not found" error
- "Don't have a code? **Sign up without one**" link at bottom → routes to signup

### 2B. Pending Approval Screen  

`app/(auth)/pending-approval.tsx` — Waiting room.

- Centered layout, light background
- Mascot placeholder (sitting, patient pose — use a styled View if no asset)
- Clock or hourglass subtle animation (pulsing opacity)
- "We just need [Org Name] to confirm your spot"
- Detail card showing: Role, Team (if known), Child Name (if parent)
- "Contact Admin" button (opens email or in-app message if available)
- **Poll for approval in background:** Check every 30 seconds if the user's org membership status changed from 'pending' to 'approved'. When approved:
  - Mascot placeholder changes to happy pose
  - "You're in!" text appears
  - Confetti-like animation (use simple colored circles animating outward)
  - Auto-navigate to home after 2 seconds

### 2C. Claim Account Screen

`app/claim-account.tsx` — Pre-registered users claiming their account.

- Centered card
- "Claim Your Account" heading
- Shows the org name and team they're being connected to (from the claim token/code)
- Email verification (confirm the email matches what admin entered)
- Set Password fields
- "Claim Account" button
- On success: auto-login → home

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: redeem code, pending approval with polling, claim account screens"
git push
```

---

## PHASE 3: FIRST-LAUNCH TOUR

For Path 3 users (organic/no code). Shows once, on first login, when the user has no org connection.

### 3A. Tour Implementation

Create a new component: `components/FirstLaunchTour.tsx`

**Trigger condition:** User just signed up AND has no org membership AND has not seen the tour before (check AsyncStorage key `lynx_tour_completed`).

**Renders as:** Full-screen overlay on top of the home screen (so the home is loading behind it).

**3-4 swipeable screens (horizontal pager):**

**Screen 1: "Welcome to Lynx"**
- Mascot waving
- "Lynx helps you manage your youth sports team — schedules, communication, stats, and more."
- Subtle animation: mascot bounces

**Screen 2: "Stay Connected"**  
- Chat bubble / calendar icon illustration
- "See your schedule, RSVP to events, chat with your team — all in one place."

**Screen 3: "Track Progress"**
- Trophy / badge icon illustration
- "Earn badges, track stats, and celebrate achievements together."

**Screen 4: "Get Started"**
- Three clear CTAs stacked:
  - "I have an invite code" → navigates to the org code entry (could reuse redeem-code or show an inline input)
  - "My coach will add me" → dismisses tour, sets AsyncStorage flag, user lands on home with empty states
  - "I'm starting a new organization" → navigates to the create-org mini-flow from Step 3

**Navigation:** Dot indicators at bottom. Swipe between screens. "Skip" link in top-right on all screens. Tapping Skip = same as "My coach will add me" (dismisses tour).

**On dismiss:** Set `lynx_tour_completed = 'true'` in AsyncStorage. Tour never shows again.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: first-launch tour for organic users (3-4 swipeable screens)"
git push
```

---

## PHASE 4: SMART EMPTY STATES

When a user has an account but no org, no team, or no data — the home screen should guide them, not show a broken dashboard.

### 4A. Determine Empty State Conditions

In each HomeScroll component (AdminHomeScroll, CoachHomeScroll, ParentHomeScroll, PlayerHomeScroll), check these conditions:

| Condition | Meaning |
|-----------|---------|
| No org membership | User signed up but hasn't joined an org |
| Org membership but pending | Waiting for admin approval |
| Org membership but no team | Approved but not assigned to a team yet |
| Team assigned but no events | Team exists but season hasn't started |
| Team + events but no data | Normal early-season state |

### 4B. Empty State Components

Create `components/empty-states/` folder with these components:

**`NoOrgState.tsx`** — User has no organization
- Mascot looking around (placeholder View)
- "You're not connected to an organization yet"
- Three options (same as tour Screen 4):
  - "Enter an invite code" → inline code input
  - "Waiting for an invite" → explains that their coach/admin will send one
  - "Create an organization" → mini create-org flow
- Warm, encouraging tone. Not an error page.

**`PendingApprovalState.tsx`** — Waiting for admin
- Mascot waiting (reuse from pending-approval screen)
- "Waiting for [Org Name] to confirm you"
- Show role and team if known
- "Contact Admin" button

**`NoTeamState.tsx`** — In an org but no team assignment
- Mascot with clipboard
- For Parents: "Your child hasn't been assigned to a team yet. Your coach or admin will add them soon."
- For Coaches: "You haven't been assigned to a team yet. Your admin will set this up."
- For Players: "Waiting for your coach to add you to a team."

**`EmptySeasonState.tsx`** — Team exists but nothing happening yet
- Mascot relaxing
- "The season hasn't kicked off yet. Check back soon for schedules and events."
- For Admins/Coaches: "Set up your season to get started" → link to season setup

### 4C. Wire into HomeScrolls

In each HomeScroll component, add a check at the top of the render:

```typescript
// Pseudocode — adapt to actual data hooks
const { orgMembership, teams, events } = useHomeData();

if (!orgMembership) return <NoOrgState />;
if (orgMembership.status === 'pending') return <PendingApprovalState org={orgMembership.org} />;
if (!teams || teams.length === 0) return <NoTeamState role={currentRole} />;
if (!events || events.length === 0) return <EmptySeasonState role={currentRole} />;

// Normal home scroll content follows...
```

**IMPORTANT:** The existing home scroll content should NOT be touched. These empty states only render INSTEAD OF the home scroll when the conditions are met. Once the user has org + team + events, the normal scroll renders exactly as it does today.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: smart empty states for no-org, pending, no-team, empty-season conditions"
git push
```

---

## PHASE 5: NAVIGATION WIRING + ROUTE CLEANUP

Make sure the whole auth flow actually connects.

### 5A. Auth Navigation Flow

Verify the auth layout (`app/(auth)/_layout.tsx`) supports this navigation:

```
welcome → login (existing user)
welcome → signup (new user)
signup step 3 → redeem-code (if entering code separately)
signup step 3 → pending-approval (if org requires approval)
signup step 3 → home (if skip or auto-approved)
signup step 3 create-org → home (for new admins)
redeem-code → signup (with org pre-filled)
claim-account → home (after setting password)
```

### 5B. Deep Link Support

If someone taps a registration link (e.g., `thelynxapp.com/register/SEASON_ID`):
- App opens to `register/[seasonId].tsx` (the public registration form)
- This screen should work for both logged-in and logged-out users
- If logged out: redirect to signup first, then back to registration after account creation
- If logged in: go straight to registration form

If someone taps an invite link with a code:
- Route to redeem-code with the code pre-filled
- Or route to signup with the code passed as a query param

### 5C. Update Auth Gate

In the root layout (`app/_layout.tsx`) or auth provider, update the auth gate logic:

```
If not authenticated → show auth stack (welcome/login/signup)
If authenticated but no profile → show profile setup (minimal — just name if missing)
If authenticated + profile → show main tab navigator
  → HomeScroll handles empty states internally
```

The key change: **do NOT block entry to the main app based on org membership.** Let them in. The smart empty states handle the guidance.

### 5D. Remove Old Auth References

Search for and remove/update any remaining references to the archived screens:
```bash
grep -rn "parent-register\|coach-register\|league-setup" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules"
```

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: wire auth navigation, deep link support, update auth gate, remove old references"
git push
```

---

## PHASE 6: VERIFY EVERYTHING

```bash
# 1. Type check
npx tsc --noEmit

# 2. Verify old auth screens are archived
ls components/_legacy/auth/
# Expected: parent-register.tsx, coach-register.tsx, league-setup.tsx

# 3. Verify no references to archived files
grep -rn "parent-register\|coach-register\|league-setup" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "_legacy" | grep -v "node_modules"
# Expected: 0 results

# 4. Verify dev bypass exists
grep -rn "DEV_SKIP_AUTH" --include="*.tsx" --include="*.ts" app/ components/ lib/
# Expected: references in auth provider and .env

# 5. Verify smart empty states exist
ls components/empty-states/
# Expected: NoOrgState.tsx, PendingApprovalState.tsx, NoTeamState.tsx, EmptySeasonState.tsx

# 6. Verify tour exists
ls components/FirstLaunchTour.tsx

# 7. Count remaining "Coming Soon" in auth flow
grep -rn "Coming Soon" --include="*.tsx" --include="*.ts" app/\(auth\)/ | grep -v "node_modules"
# Expected: 0

# 8. Final commit
git add -A
git commit -m "Phase 6: Wave 2 verification and cleanup"
git push
```

---

## EXPECTED RESULTS

1. **Dev bypass works** — set `DEV_SKIP_AUTH=true` in .env, app auto-logs in on reload
2. **Dev role switcher on login** — tap Admin/Coach/Parent/Player to quick-login as that role
3. **Welcome screen is premium** — mascot, gradient, two clear CTAs, entrance animation
4. **Login is fast** — auto-focus, shake on wrong password, clean design
5. **Signup is 3 steps** — Info → Role Picker (auto-advance) → Connect (code, create org, or skip)
6. **Create Org flow is lightweight** — name + sport → confirmation with web instructions → home
7. **Three entry paths all work:**
   - Invite code → signup → enter code → join org → home (populated)
   - Verbal invite → signup → skip code → home (empty state: "waiting for invite")
   - Organic → signup → skip → tour → home (empty state: guidance to connect)
8. **First-launch tour** — 3-4 swipeable screens, skippable, shows once
9. **Smart empty states** — every home scroll gracefully handles no-org, pending, no-team, empty-season
10. **Old auth screens archived** — parent-register, coach-register, league-setup in `_legacy/auth/`
11. **6 commits** — one per phase, each pushed, easy to revert individually

---

## WHAT THIS DOES NOT COVER (future waves)

- The public registration form (`register/[seasonId].tsx`) brand pass — that's Wave 7
- Push notifications for invite acceptance — future feature
- The actual admin-side "invite a parent/coach" flow — that's existing manage functionality
- Email verification — currently handled by Supabase auth defaults
- Social login (Google, Apple) — future enhancement
