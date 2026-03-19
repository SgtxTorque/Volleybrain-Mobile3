# USER-JOURNEY-GAPS-REPORT.md
# Lynx Mobile — User Journey Gaps & Org Discovery Funnel Audit

**Date:** 2026-03-19
**Classification:** INVESTIGATION ONLY — no files were modified.

---

## Part 1: Empty State Audit

### 1.1 `components/empty-states/NoOrgState.tsx` (198 lines)

**When it renders:** User has no organization (`!organization` in HomeScroll detection). Rendered inside the ScrollView, never as an early return.

**Which roles see it:** All roles (admin, coach, TM, parent, player). Used by `AdminHomeScroll.tsx:201`, `CoachHomeScroll.tsx:450`, `ParentHomeScroll.tsx:426`, `PlayerHomeScroll.tsx:340`, `TeamManagerHomeScroll.tsx:327`.

**What the user sees:**
- Lynx mascot image (MEET_LYNX)
- Title: **"You're not connected to an organization yet"**
- Subtitle: *"Join your team's organization to see schedules, stats, and more."*
- Primary CTA: **"Enter an invite code"** (teal button with ticket icon)
  - Expands to show a text input (auto-focus, all-caps, max 12 chars) + "Join" button + "Cancel" link
  - Code submit checks `invitations` table then `team_invite_codes` table
  - On match: routes to `/(auth)/signup` with `orgCode` and `organizationId` params
- Info card: *"Waiting for an invite? Your coach or admin will send you one. You'll be notified when it arrives."*
- Secondary CTA: **"Create an organization"** (outlined teal button)
  - Routes to `/(auth)/signup` with `createOrg=true`

**CTAs available:**
1. "Enter an invite code" → inline code input → validates → routes to signup
2. "Create an organization" → routes to signup with createOrg flag

**What's MISSING:**
- **No "Browse Organizations" button.** The `org-directory.tsx` screen exists and is accessible from the drawer, but there is NO link to it from this empty state.
- **No "Find my team" or discovery flow.** A parent who downloads the app cold and doesn't have a code is stuck. They can only wait or create their own org.
- **No way to contact their admin/coach from here.** The info text says "You'll be notified when it arrives" but there's no way to request an invite or provide their email to be found.

**User's likely reaction:** A parent who downloads the app because their kid's team uses it will see this screen, tap around looking for a way to find their team, and eventually uninstall. The only actionable paths require either having a code (which many parents won't have yet) or creating an entire organization (which is irrelevant for a parent).

---

### 1.2 `components/empty-states/NoTeamState.tsx` (65 lines)

**When it renders:** User has an organization but no team assignment. Used when `data.selectedTeamId` is null/empty after org is loaded.

**Which roles see it:** All roles with role-specific messages. Used by `AdminHomeScroll.tsx:203`, `CoachHomeScroll.tsx:452`, `PlayerHomeScroll.tsx:342`, `TeamManagerHomeScroll.tsx:329`. ParentHomeScroll renders it for 'no-children' case at line 428-429.

**What the user sees:**
- Lynx mascot image (MEET_LYNX)
- Title: **"No Team Yet"**
- Role-specific body text:
  - **Admin:** *"No teams have been created yet. Head to the web dashboard to set up your first season and teams."*
  - **Coach:** *"You haven't been assigned to a team yet. Your admin will set this up."*
  - **Parent:** *"Your child hasn't been assigned to a team yet. Your coach or admin will add them soon."*
  - **Player:** *"Waiting for your coach to add you to a team. Hang tight!"*
  - **Team Manager:** *"Your admin will assign you to a team. Once assigned, your team dashboard will appear here."*

**CTAs available:** **NONE.** Zero buttons. Zero links. Zero actions.

**What's MISSING:**
- **No CTAs at all.** This is a complete dead end for every role.
- Admin message says "Head to the web dashboard" but there's no link, no URL, no QR code, nothing.
- Coach/parent/player/TM have no way to check status, contact anyone, or take any action.
- No "Contact your admin" link, no "Refresh" button, no "Browse organizations" option.
- No pull-to-refresh hint (the parent ScrollView has it, but this component doesn't indicate it).

**User's likely reaction:** This is the worst empty state in the app. The user sees a wall of passive text telling them to wait. There is literally nothing they can do. For admins, being told to go to a web dashboard with no link is frustrating. For everyone else, "hang tight" with no timeline and no action is an uninstall trigger.

---

### 1.3 `components/empty-states/PendingApprovalState.tsx` (81 lines)

**When it renders:** User's profile exists but their org membership is pending approval (status check in auth/profile layer).

**Which roles see it:** Primarily parents/players awaiting org admin approval.

**What the user sees:**
- Pulsing animated mascot (BABY_SISTER, opacity pulses 0.6↔1.0)
- Title: **"Almost There!"**
- Subtitle: *"Waiting for {orgName} to confirm your spot."*
- Info card: *"You'll be automatically redirected once approved. This usually takes 1-2 business days."*

**CTAs available:** **NONE.**

**What's MISSING:**
- **No "Check Status" button.** User can't see where they are in the approval queue.
- **No "Contact Admin" link.** If it's been 3 days and they're still pending, they have no recourse.
- **No estimated timeline.** "1-2 business days" is generic and may not be accurate.
- **No way to cancel or modify** their request.
- **No push notification guarantee.** Text says "automatically redirected" but doesn't mention push notifications.

**User's likely reaction:** Mild anxiety. The pulsing animation is a nice touch, but after 2 days of seeing this screen, users will wonder if anyone is reviewing their request. Without a way to check status or contact someone, they'll text the coach directly or give up.

---

### 1.4 `components/empty-states/EmptySeasonState.tsx` (70 lines)

**When it renders:** Organization exists, team may exist, but no active season is configured. Detected when season data is empty.

**Which roles see it:** Admin, coach, parent, player (type accepts these four, not TM).

**What the user sees:**
- Mascot image (LITTLE_BROTHER)
- Title: **"Nothing Happening Yet"**
- Subtitle (role-dependent):
  - **Admin/Coach:** *"The season hasn't kicked off yet. Set up your season to get started."*
  - **Parent/Player:** *"The season hasn't kicked off yet. Check back soon for schedules and events."*
- CTA (admin/coach only): **"Set Up Season"** → routes to `/season-settings`

**CTAs available:**
- Admin/Coach: "Set Up Season" button (teal, with calendar icon)
- Parent/Player: **NONE**

**What's MISSING:**
- **Parents and players have no CTA.** They see passive text with nothing to do.
- **No "Notify me when season starts" option.**
- **No link to registration** (parent might need to register for the upcoming season).
- **No estimated start date** shown, even if the season has one configured.
- **Team Manager role not handled** (type only accepts admin/coach/parent/player).

**User's likely reaction:** For admin/coach, this is functional. For parents/players, it's another "check back later" dead end that provides no engagement and no reason to keep the app installed.

---

### 1.5 `components/empty-states/TeamManagerSetupPrompt.tsx` (102 lines)

**When it renders:** Team Manager has no teams assigned/created yet. Used in the TM-specific flow.

**Which roles see it:** Team Manager only.

**What the user sees:**
- Mascot image (LYNXREADY)
- Title: **"Let's set up your team!"**
- Subtitle: *"Create your team, invite your players, and start managing."*
- Primary CTA: **"Set up my team"** (sky blue button with add-circle icon) → routes to `/team-manager-setup`
- Secondary CTA: **"I have an invite code"** (text link, sky blue) → routes to `/(auth)/redeem-code`

**CTAs available:**
1. "Set up my team" → `/team-manager-setup`
2. "I have an invite code" → `/(auth)/redeem-code`

**What's MISSING:**
- This is actually the **best-designed** empty state in the app. It provides clear, actionable paths.
- Minor: No "Browse Organizations" option if they want to join an existing org.
- Minor: No visual indication of what `team-manager-setup` will involve (multi-step wizard? single form?).

**User's likely reaction:** Positive. Clear direction, two relevant options, friendly tone. This is the gold standard the other empty states should aspire to.

---

### 1.6 Inline Empty States (Home Scroll Components)

**`TeamManagerHomeScroll.tsx:423-425`** — Upcoming events section:
```
"No upcoming events. Tap Schedule to create one."
```
Includes a calendar icon. Functional but could link directly to the schedule screen.

**`ParentHomeScroll.tsx:428-429`** — When parent has org but no children linked:
```jsx
<NoTeamState role="parent" />
```
Renders the generic "No Team Yet" dead end. Same issues as NoTeamState above.

**All HomeScroll components** use the same pattern for empty state detection:
```
const emptyState: 'loading' | 'no-org' | 'no-teams' | null = ...
```
And render `<NoOrgState />` for 'no-org' and `<NoTeamState role={role} />` for 'no-teams'.

---

## Part 2: Org Directory Deep Dive

### 2A. `app/org-directory.tsx` (257 lines)

**1. How does a user get here?**
- **Drawer → Admin Tools:** `GestureDrawer.tsx:107` — "Org Directory" item, admin-only section
- **Drawer → League & Community:** `GestureDrawer.tsx:224` — "Find Organizations" item, all-roles section
- **Manage tab:** `app/(tabs)/manage.tsx:261` — "Directory" tile in admin grid
- **Me tab:** `app/(tabs)/me.tsx:208` — "Org Directory" menu row
- **NOT from any empty state component.** No empty state links here.

**2. What data is fetched?**
```typescript
supabase.from('organizations')
  .select('id, name, slug, logo_url, is_active, settings')
  .eq('is_active', true)
  .order('name')
```
Fetches from `organizations` table: id, name, slug, logo_url, is_active, settings (JSON with city, state, contact_email, description).

**3. What does each org card show?**
- Logo (or initials placeholder if no logo)
- Organization name
- Location (city, state) if available
- Chevron-forward icon indicating tappable

**4. What happens when you tap an org?**
Sets `selectedOrg` state to show an **inline detail view** (same screen, no navigation). Detail view shows:
- Large logo (80x80) or initials placeholder
- Org name
- Location (city, state)
- Description (if available)
- Contact email (if available)
- Slug
- **That's it.** No seasons. No sports. No registration. No "Join" button. No "Request to Join."

**5. Is there search or filtering?**
- **Search:** Yes, by name, city, or state (client-side filter)
- **Filtering by sport:** No
- **Filtering by registration status:** No

**6. What does the screen look like with zero orgs?**
```
[business-outline icon, 64px]
"No Organizations"
"No organizations found"
```
For search with no results:
```
"No Results"
"Try a different search term"
```
Both are purely informational — no CTAs.

**7. Is registration status shown?** No.

**8. Quality assessment:**
257 lines, clean code, uses the design system (`createStyles(colors)`, `glassCard`, `glassBorder`). Well-structured but feature-incomplete. It's essentially a read-only directory with no actionable next steps.

---

### 2B. Org Detail / Registration Flow

**After tapping an org in the directory:**

1. **Is there an org detail/profile screen?** No separate screen. The detail is rendered inline within `org-directory.tsx` (lines 86-146) using `selectedOrg` state.

2. **Can the user see available seasons?** **No.** The detail view shows name, location, description, email, slug — but NO seasons data is fetched or displayed.

3. **Can the user see which sports the org offers?** **No.** No sports data is fetched. The `organizations` table doesn't have a sports array; sports are linked via `seasons.sport_id` or `seasons.sport`.

4. **Is there a "Register" button?** **No.** The detail view is purely informational. There is no way to initiate registration, join, or even request an invite from this screen.

5. **Is there a "Join with code" option?** **No.** No code entry on this screen.

6. **What happens if registration is closed?** Registration status is not shown at all, so this question is moot — the user can't even tell if registration exists.

---

### 2C. Multi-Sport Org Handling

1. **Does the org directory show what sports each org offers?** No. The query only fetches `id, name, slug, logo_url, is_active, settings`. No sports data.

2. **Multi-sport display?** Not handled. An org like "Kings and Queens" offering basketball, volleyball, and flag football would show as a single card with no sport information.

3. **Sports data model:** The `organizations` table does NOT have a sports array. Sports are linked via `seasons` → `sport_id` (FK to `sports` table) or `seasons.sport` (text field). To show sports per org, you'd need to join through seasons.

4. **Browse seasons grouped by sport?** No. The org directory doesn't show seasons at all.

---

## Part 3: Registration Funnel Trace

### 3A. `app/registration-start.tsx` (288 lines)

**1. What is this screen?**
Season selector for parent registration. Shows open seasons across the parent's organizations as tappable cards.

**2. When is it shown?**
When a parent navigates to register and there are multiple open seasons. If there's only one open season, it auto-redirects to `/register/{seasonId}` (line 106-108).

**3. What data does it display?**
- Per season: name, org name, sport badge, date range, registration deadline (with urgency coloring), fee, age groups
- Empty state: SleepLynx mascot + "No Open Registrations" + "Check back soon!"

**4. Where does it route?**
Each season card routes to `/register/{season.id}`.

**5. Key limitation:** Like `parent-registration-hub.tsx`, this only shows seasons from orgs the user already belongs to. It queries `user_roles` for the user's org IDs, then fetches seasons from those orgs.

---

### 3B. `app/parent-registration-hub.tsx` (836 lines)

**1. What does this screen show?**
- **"JOIN NEW ORGANIZATION" section** — invite code entry at the top with "Have an invite code?" label. Validates against both `invitations` and `team_invite_codes` tables. On success: creates `user_role`, marks invitation accepted, refreshes data.
- **Tab pills:** "Open" (shows open seasons) | "My Registrations" (shows submitted registrations)

**2. Can they browse open seasons/orgs?**
Only seasons from orgs they already belong to. The query (lines 96-110):
```typescript
const { data: roles } = await supabase
  .from('user_roles')
  .select('organization_id')
  .eq('user_id', user.id)
  .eq('is_active', true);
// Then: .in('organization_id', orgIds).eq('registration_open', true)
```

**3. Can they see existing registrations?**
Yes — "My Registrations" tab shows all registrations with status badges: Pending Review (orange), Submitted (blue), Approved (blue), Paid (green), On Team (purple), Waitlisted (gray), Not Approved (red).

**4. "Register for a new season" CTA?**
Each open season card is tappable and navigates to `/register/{season.id}`. There's no explicit "Register for a new season" button, but the open seasons tab serves this purpose.

**5. What if no registrations yet?**
- Open tab empty: *"No Open Registrations. When your organizations open registration for a new season, it will appear here."*
- My Registrations tab empty: *"No Registrations Yet. When you register a child for a season, their registration will appear here."*

**KEY ISSUE:** For a cold download user with no org membership, both tabs will be empty. The only actionable thing is the invite code entry at the top.

---

### 3C. `app/register/[seasonId].tsx` (800+ lines)

**1. How does a user arrive here?**
- From `parent-registration-hub.tsx` — tapping an open season card → `/register/{season.id}`
- From `registration-start.tsx` — tapping a season card (or auto-redirect if single season)
- From `onboarding-router.ts` — `registration_link` path → `/register/{deepLinkSeasonId}`
- From `org-directory.tsx` — **NOT POSSIBLE** (no registration link exists)

**2. What does the registration form collect?**
Multi-step wizard using `loadRegistrationConfig()` for dynamic fields:
- Player info: first name, last name, birth date, grade, gender
- Contact: parent emails, parent phones, emergency contact
- Uniform: jersey size, shorts size, preferred number
- Experience: experience level, position, school
- Medical/waivers: medical info, signature pad, waiver viewer
- All field visibility/required status is configurable per season via `registration_config`

**3. What happens after submission?**
Creates a registration record in the `registrations` table. User presumably lands back on `parent-registration-hub.tsx` where they can see their registration status in the "My Registrations" tab.

**4. Can it be reached from org directory?** No.

**5. Is `seasonId` always available?**
It's a required route param (`[seasonId]`). If missing, the screen would fail to load season data. There are no guards for an undefined/null seasonId.

---

### 3D. Deep Link Registration

**1. Does `lib/onboarding-router.ts` handle registration links?**
Yes. The `determineOnboardingPath` function checks for `context?.deepLinkSeasonId` and returns `'registration_link'`, which maps to `/register/${context.deepLinkSeasonId}`.

**2. Deep link scenarios:**
- **Logged in user with app:** If `deepLinkSeasonId` is passed through the auth flow, they'd reach `/register/{seasonId}`. However, the actual deep link handler that captures the URL and passes it as context is not clearly wired (would need to check Expo's linking config).
- **Has app, NOT logged in:** Would need to authenticate first, then the onboarding router would check for the deep link context.
- **New user without app:** Play Store redirect → install → open → would need the deep link to survive the install flow (deferred deep linking). Not implemented — standard Expo deep linking does NOT survive app install.

**3. `app/(auth)/redeem-code.tsx` (274 lines):**
Two-step flow:
1. **Enter step:** Code input (auto-caps, max 12 chars) with "Join" button. Also has "Don't have a code? Sign up without one" link.
2. **Confirm step:** Shows "Welcome to {orgName}!" with role and team name details, then "Continue to Sign Up" button → routes to `/(auth)/signup` with org context.

Validates against both `invitations` (with expiry check) and `team_invite_codes` (with expiry + max uses check). Supports deep link pre-fill via `code` search param.

---

## Part 4: Post-Registration Experience

### 4A. After Registration Submission

**1. Where do they land?**
After submitting the registration form, the user returns to the previous screen (likely `parent-registration-hub.tsx`).

**2. What do they see on their home screen?**
If they now have linked children via registration, the `ParentHomeScroll` would render the full parent dashboard (FamilyHeroCard, child cards, events, etc.). If the registration hasn't been processed yet to create a player record, they may still see the empty state.

**3. Is registration status visible?**
Yes — in `parent-registration-hub.tsx`'s "My Registrations" tab. Status badges show:
- Pending Review (orange, clock icon)
- Submitted (blue, paper-plane icon)
- Approved (blue, checkmark icon)
- Paid (green, wallet icon)
- On Team (purple, people icon)
- Waitlisted (gray, hourglass icon)
- Not Approved (red, close-circle icon)

**4. Can they see what they submitted?**
No. The registration cards in "My Registrations" show player name, season name, org name, status badge, and registration date. They cannot view or edit their submitted form data.

**5. Are they notified when approved?**
Not explicitly implemented in the mobile app code reviewed. The `PendingApprovalState` says "You'll be automatically redirected once approved" but this relies on profile/auth state changes being detected, not push notifications.

---

### 4B. Gap Between "Approved" and "Rostered"

**1. Is there a gap?**
Yes. Registration status goes from `approved` → `active` (paid) → `rostered` (on team). Between `approved` and `rostered`, the child exists as a registered player but isn't assigned to a specific team.

**2. What does the parent see during this gap?**
In `parent-registration-hub.tsx`, the status badge would show "Approved" (blue) or "Paid" (green). On the home screen, if the player record isn't linked to the parent account yet, the parent could see the `NoTeamState` empty state.

**3. How does the admin assign registrations to teams?**
Via the `registration-hub.tsx` (admin side) and the web dashboard. The admin reviews registrations, approves them, and eventually assigns players to teams (which changes status to `rostered`).

---

## Part 5: Gap Analysis & Recommendations

### GAP 1: NoOrgState Has No "Browse Organizations" CTA

**Current state:** NoOrgState offers "Enter invite code" and "Create organization" but has no link to `org-directory.tsx`, which already exists and is accessible from the drawer.

**Impact:** Every new user who downloads the app without a code hits this dead end. The org directory exists but is hidden behind the navigation drawer where new users won't find it. HIGH impact — this is the first screen cold users see.

**Proposed fix:** Add a "Browse Organizations" button between the info card and the "Create organization" button. Route to `/org-directory`.

**Complexity:** S

**Files involved:** `components/empty-states/NoOrgState.tsx`

**Can ship without this?** NO — cold download users have no discovery path.

**Priority:** P0 (must fix for launch)

---

### GAP 2: NoTeamState Is a Complete Dead End

**Current state:** NoTeamState renders role-specific text with ZERO CTAs. No buttons, no links, no actions. Just passive text saying "wait."

**Impact:** Every user who joins an org but hasn't been assigned to a team sees this. Coaches, parents, players, TMs — all stuck. HIGH impact — affects all roles at a critical funnel step.

**Proposed fix:**
- **Admin:** Add "Open Web Dashboard" link or "Set Up Season" CTA → `/season-settings`
- **Coach:** Add "Contact Your Admin" info or link to org contact email
- **Parent:** Add "View Registrations" CTA → `/parent-registration-hub` and/or "Browse Organizations" → `/org-directory`
- **Player:** Add "Check back later" with a pull-to-refresh hint, or "Contact Coach" link
- **Team Manager:** Add "Set Up My Team" CTA → `/team-manager-setup`

**Complexity:** M

**Files involved:** `components/empty-states/NoTeamState.tsx`

**Can ship without this?** NO — users at this stage have joined an org but are stranded with no next step.

**Priority:** P0 (must fix for launch)

---

### GAP 3: Org Directory Has No Registration Connection

**Current state:** `org-directory.tsx` shows org name, location, description, email, and slug. No seasons, no sports, no registration status, no "Join" or "Register" button.

**Impact:** The org directory is essentially a phone book with no action items. A user can find an org but can't do anything with it. MEDIUM impact — the screen exists but doesn't complete the journey.

**Proposed fix:** On the org detail view, add:
1. A "Request to Join" or "Join with Code" CTA
2. A list of open seasons (fetched from `seasons` table where `registration_open = true`)
3. Each season card links to `/register/{seasonId}` (after creating a user_role)
4. Sport badges on org cards and detail view

**Complexity:** L

**Files involved:** `app/org-directory.tsx`, potentially new components

**Can ship without this?** YES — the invite code flow works as the primary path. But this significantly limits organic discovery.

**Priority:** P1 (should fix soon after launch)

---

### GAP 4: Cold Download Funnel Is Broken (Chicken-and-Egg Problem)

**Current state:** `onboarding-router.ts` sends cold downloads to `parent-registration-hub.tsx`. That screen only shows seasons from orgs the user already belongs to. A cold user belongs to zero orgs, so they see empty tabs and an invite code input.

**Impact:** A parent who downloads the app after hearing about it (but without a code) sees: invite code entry + empty "Open" tab + empty "My Registrations" tab. No way to browse or discover. CRITICAL impact — breaks the entire cold acquisition funnel.

**Proposed fix:** In `parent-registration-hub.tsx`, when the user has zero org memberships:
1. Show a prominent "Browse Organizations" CTA → `/org-directory`
2. OR add a "Find Your Organization" search inline
3. Consider showing featured/local organizations (future)

**Complexity:** S (for adding browse link) / L (for inline search)

**Files involved:** `app/parent-registration-hub.tsx`, possibly `lib/onboarding-router.ts`

**Can ship without this?** NO — cold downloads need a path to discover their org.

**Priority:** P0 (must fix for launch)

---

### GAP 5: PendingApprovalState Has No Status Check or Contact

**Current state:** User sees animated mascot + "Almost There!" + "usually takes 1-2 business days." No action items.

**Impact:** LOW-MEDIUM. Users in pending state are already in the funnel. But lack of status checking and contact info creates anxiety and support burden.

**Proposed fix:**
1. Add "Contact Organization" button showing the org's contact email
2. Add a timestamp showing when they joined ("You joined on Mar 15")
3. Optional: Add "Check Status" that queries their approval status and shows an updated message

**Complexity:** S

**Files involved:** `components/empty-states/PendingApprovalState.tsx`

**Can ship without this?** YES — users can still get approved, but the wait is anxious.

**Priority:** P1 (should fix soon)

---

### GAP 6: EmptySeasonState Gives Parents/Players Nothing

**Current state:** Admin/coach get a "Set Up Season" CTA. Parents/players see only "Check back soon for schedules and events."

**Impact:** LOW. This state is relatively rare — orgs usually have at least one season configured before parents join.

**Proposed fix:**
- Parents: Add "View Registrations" CTA → `/parent-registration-hub`
- Players: Add "Check your team" link or just a "Pull to refresh" hint
- Add TM role support (currently type only accepts admin/coach/parent/player)

**Complexity:** S

**Files involved:** `components/empty-states/EmptySeasonState.tsx`

**Can ship without this?** YES — edge case, low frequency.

**Priority:** P2 (can wait)

---

### GAP 7: No "Browse Orgs" in Registration Path

**Current state:** Parent registration hub has invite code entry and shows open seasons for existing orgs. But there's no "Browse Organizations" link anywhere in the registration flow.

**Impact:** HIGH — part of the cold download funnel problem (see GAP 4).

**Proposed fix:** Add a "Don't have a code? Browse organizations" link in `parent-registration-hub.tsx` below the invite code section.

**Complexity:** S

**Files involved:** `app/parent-registration-hub.tsx`

**Can ship without this?** Covered by GAP 4 fix.

**Priority:** P0 (bundled with GAP 4)

---

### GAP 8: Deep Linking Doesn't Survive App Install

**Current state:** `onboarding-router.ts` handles `registration_link` path with `deepLinkSeasonId`. But standard Expo deep linking does NOT survive: Play Store → install → open. The context is lost.

**Impact:** MEDIUM. Reduces conversion from shared registration links for new users.

**Proposed fix:** Implement deferred deep linking via a service like Branch.io or Firebase Dynamic Links. Or use Expo's built-in `expo-linking` with a web redirect that stores context.

**Complexity:** XL

**Files involved:** Deep link infrastructure, `app.json`, `lib/onboarding-router.ts`, web redirect page

**Can ship without this?** YES — existing users can use direct links. New installs use invite code flow.

**Priority:** P2 (can wait)

---

### GAP 9: No "Notify Me" for Closed Registration

**Current state:** If registration is closed, there's no way for a parent to express interest or get notified when registration reopens.

**Impact:** LOW. Nice-to-have feature for off-season engagement.

**Proposed fix:** Add a "Notify Me" button on closed season cards that stores the user's interest in a `registration_interests` table. Trigger push notification when registration opens.

**Complexity:** L (requires new DB table + notification infrastructure)

**Files involved:** New table, `app/org-directory.tsx` (if org detail shows seasons), notification system

**Can ship without this?** YES — orgs can notify parents through other channels.

**Priority:** P2 (can wait)

---

### GAP 10: No Admin Notification When New User Joins

**Current state:** When a parent uses an invite code and joins an org, the admin is not notified. The `user_roles` record is created silently.

**Impact:** LOW-MEDIUM. Admins need to manually check for new members.

**Proposed fix:** Send a push notification to org admins when a new user joins via invite code. "New member: Jane Doe has joined your organization."

**Complexity:** M (requires notification system wiring)

**Files involved:** `app/parent-registration-hub.tsx` (after successful join), notification system

**Can ship without this?** YES — admins can check periodically.

**Priority:** P2 (can wait)

---

## Part 6: Build Now vs. Later

### BUILD NOW (Pre-Launch)

These fixes address dead-end empty states and complete broken funnels:

| # | Fix | Complexity | Files | Impact |
|---|-----|-----------|-------|--------|
| 1 | **Add "Browse Organizations" CTA to NoOrgState** | S | `NoOrgState.tsx` | Unlocks cold discovery |
| 2 | **Add role-specific CTAs to NoTeamState** | M | `NoTeamState.tsx` | Eliminates dead-end for all roles |
| 3 | **Add "Browse Organizations" link to parent-registration-hub when user has 0 orgs** | S | `parent-registration-hub.tsx` | Fixes cold download funnel |
| 4 | **Add TM role to EmptySeasonState type** | S | `EmptySeasonState.tsx` | Prevents type error |

**Estimated effort:** 1-2 days
**Impact:** Eliminates the two worst dead ends (NoOrgState, NoTeamState) and fixes the cold download funnel.

---

### BUILD SPRINT 1 (First 2 Weeks Post-Launch)

| # | Fix | Complexity | Files | Impact |
|---|-----|-----------|-------|--------|
| 5 | **Add "Contact Organization" to PendingApprovalState** | S | `PendingApprovalState.tsx` | Reduces support burden |
| 6 | **Org directory: add open seasons list + Register button on detail view** | L | `org-directory.tsx` | Enables browse→register flow |
| 7 | **Show sport badges on org directory cards** | M | `org-directory.tsx` | Better discovery for multi-sport orgs |
| 8 | **Parent/player CTAs in EmptySeasonState** | S | `EmptySeasonState.tsx` | Eliminates minor dead end |
| 9 | **Admin notification on new member join** | M | `parent-registration-hub.tsx`, notifications | Keeps admins informed |

---

### TABLE FOR LATER

| # | Feature | Complexity | Why Wait |
|---|---------|-----------|----------|
| 10 | Deferred deep linking (survives app install) | XL | Requires third-party service or custom infrastructure |
| 11 | "Notify me" for closed registration | L | Requires new DB table + notification plumbing |
| 12 | Location-based org search | L | Requires geo permissions + location data |
| 13 | Org recommendation engine | XL | Requires usage data + algorithm |
| 14 | View/edit submitted registration data | M | Lower priority; parents can contact admin |
| 15 | Push notifications for approval status changes | M | Requires notification system maturity |

---

## Summary

The Lynx mobile app has **two critical funnel breaks** that must be fixed before launch:

1. **Cold download dead end:** Users who download without a code see NoOrgState with no discovery path, or land on parent-registration-hub with empty tabs. The org directory exists but is hidden in the drawer and has no registration connection.

2. **NoTeamState dead end:** Users who successfully join an org but haven't been assigned a team see a wall of passive text with zero actions. This is the worst UX in the app.

The fixes for these two issues are small (S-M complexity) and high-impact. The org directory → registration connection is a larger Sprint 1 project but isn't strictly needed for launch if the invite code flow works well.

The `TeamManagerSetupPrompt` is the gold standard for empty states — clear title, actionable CTAs, two relevant paths. All other empty states should be brought up to this quality level.
