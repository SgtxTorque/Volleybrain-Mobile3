# CC-WAVE-7-SETTINGS-AND-LEGAL.md
# Lynx Mobile — Wave 7: Settings, Profile, Legal & Utility Screens

**Priority:** Run after CC-WAVE-6-ADMIN-MANAGEMENT completes  
**Estimated time:** 2–3 hours (5 phases, commit after each)  
**Risk level:** LOW — these are mostly simple form/list screens with a brand pass. One has broken nav links to fix.

---

## WAVE CHECKLIST (update as completed)

- [ ] **Wave 0** — Archive dead code + wire admin stubs
- [ ] **Wave 1** — Kill ParentOnboardingModal + shared components brand pass
- [ ] **Wave 2** — Auth redesign + smart empty states
- [ ] **Wave 3** — Daily-use screens (Schedule, Chat, Team Hub)
- [ ] **Wave 4** — Player identity screens
- [ ] **Wave 5** — Coach tool screens
- [ ] **Wave 6** — Admin management screens
- [ ] **Wave 7** — Settings, legal, remaining screens ← THIS SPEC
- [ ] Wave 8 — New/planned screens

---

## REFERENCE FILES — READ BEFORE WRITING ANY CODE

Read `LYNX-REFERENCE-GUIDE.md` for the full reference map.

### For this wave:

1. `reference/design-references/brandbook/LynxBrandBook.html` — Brand system
2. `reference/design-references/brandbook/lynx-screen-playbook-v2.html` — Read the **"Settings & Profile"** and **"Static & Legal"** sections
3. `theme/colors.ts` and `lib/design-tokens.ts` — Design tokens
4. `assets/images/mascot/HiLynx.png` — Help screen welcome
5. `assets/images/mascot/laptoplynx.png` — Web Features redirect
6. `assets/images/mascot/Meet-Lynx.png` — Invite friends

---

## DESIGN PHILOSOPHY

Settings and profile screens follow the **iOS Settings paradigm**: grouped rows, clean separators, toggle switches, no unnecessary decoration. Legal screens need brand typography but are otherwise plain reading experiences. These screens should feel organized, trustworthy, and professional.

---

## PHASE 1: MY STUFF SCREENS (ALL 4 ROLES)

There are 4 role-specific My Stuff screens that likely share the same structure with role-specific sections. Brand pass all of them.

### 1A. Shared My Stuff Pattern

All four screens (`parent-my-stuff.tsx`, `coach-my-stuff.tsx`, `admin-my-stuff.tsx`, and the player equivalent if it exists — may be in settings or me.tsx):

**Profile card at top:**
- User avatar (large circle, 80px, tappable → profile editor)
- Full name in display font
- Role badge (color-coded pill)
- Email below in secondary text
- Subtle card background with brand border

**Below profile: grouped settings rows**

Each row: icon (left) + label (center) + chevron or value (right). Tappable.

iOS Settings style:
- Grouped sections with section headers (SectionHeader component)
- Subtle separator lines between rows within a group
- 12-16px gap between groups
- Row height: 48-52px
- Icon: tinted with brand color or role color, 24px

### 1B. Parent My Stuff

`app/(tabs)/parent-my-stuff.tsx`

**Section: My Family**
- My Kids → `/my-kids`
- My Waivers → `/my-waivers`
- Payments → `/family-payments`

**Section: Communication**
- Notification Preferences → `/notification-preferences`

**Section: Account**
- Edit Profile → `/profile`
- Help → `/help`
- Invite Friends → `/invite-friends`

**Section: Legal**
- Privacy Policy → `/privacy-policy`
- Terms of Service → `/terms-of-service`
- Data Rights → `/data-rights`

**Bottom:**
- Sign Out button (coral text, not filled — destructive but not primary)
- App version: tiny text centered below sign out

### 1C. Coach My Stuff

`app/(tabs)/coach-my-stuff.tsx`

**Section: Coaching**
- My Teams → `/my-teams`
- Availability → `/coach-availability`
- Coach Profile → `/coach-profile`

**Section: Communication**
- Notification Preferences → `/notification-preferences`

**Section: Account** — same as parent
**Section: Legal** — same as parent
**Bottom** — same as parent

### 1D. Admin My Stuff

`app/(tabs)/admin-my-stuff.tsx`

**Section: Organization**
- Org Settings → `/org-settings` (if exists, else `web-features`)
- Users → `/users`

**Section: Account** — same as parent
**Section: Communication** — same as parent
**Section: Legal** — same as parent
**Bottom** — same as parent

### 1E. Connect Tab

`app/(tabs)/connect.tsx` — Review what this currently does. If it overlaps with team hub (social/team wall), it's redundant. Options:
- If redundant: redirect to team hub or make it a stub
- If it serves a unique purpose (finding other teams, discovering events): brand pass it
- Document what you find for future cleanup

### 1F. Profile / Me Tab

`app/(tabs)/me.tsx` — If this is the profile screen, it may overlap with My Stuff or Profile Editor. Check what it renders:
- If it's a profile view: brand pass (avatar, name, stats, role)
- If it's a duplicate of My Stuff: redirect to the role-specific My Stuff screen
- If it's the settings hub: treat it as the canonical settings screen

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: My Stuff screens (all 4 roles) - iOS settings pattern, grouped rows"
git push
```

---

## PHASE 2: PROFILE, MY KIDS, MY WAIVERS, COACH PROFILE

### 2A. Profile Editor

`app/profile.tsx` — Edit your account info.

**Layout:**
- Avatar at top: large circle (100px), tap to change
  - On tap: action sheet "Take Photo" / "Choose from Library" / "Cancel"
  - After selection: crossfade animation to new avatar
- Form fields below (brand input styling — rounded, subtle border, teal focus):
  - First Name
  - Last Name
  - Email (read-only or editable depending on auth setup)
  - Phone Number
  - Bio (optional, text area)
- "Save Changes" button (teal, full width, disabled until changes made)
- Real-time validation: red border + error message for invalid fields

### 2B. My Kids

`app/my-kids.tsx` — **HAS 3 BROKEN NAV LINKS.** Fix first, then brand pass.

**Fix broken navigation:**
The audit notes 3 broken links pointing to `/chats`, `/schedule`, `/players` without the `(tabs)` prefix. Find and fix:
```
/chats       → /(tabs)/chats  OR /(tabs)/parent-chat
/schedule    → /(tabs)/parent-schedule
/players     → /(tabs)/players
```

**Brand pass:**
- Child cards: photo + name + team + age. Tap → child-detail
- Each card: brand PressableCard with team color accent
- "Add Child" button or FAB → navigates to registration flow or add-child form
- If no children registered: `Meet-Lynx.png` + "Add your first child to get started!"

### 2C. My Waivers

`app/my-waivers.tsx` — Per-child waiver list.

**Layout:**
- Grouped by child (if multiple children)
- Each waiver row: waiver name + status badge
  - Signed: teal badge with checkmark + signed date
  - Unsigned: coral badge with warning icon
- Tap unsigned waiver → opens waiver content + signature field at bottom
- Signature: either a canvas drawing pad or a typed-name confirmation checkbox
- "Sign Waiver" button (teal) after signature
- After signing: badge updates to Signed immediately

### 2D. Coach Profile

`app/coach-profile.tsx` — Coach bio and info.

**Layout:**
- Hero section: avatar + name + role badge
- Bio section: text content
- Teams section: list of assigned teams with team color indicators
- Qualifications / Certifications: if data exists, list them
- Contact: email, phone (if visible to the viewer's role)
- If viewing your own profile: "Edit" button → profile editor

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: profile editor, my-kids (fix broken nav), my-waivers, coach profile"
git push
```

---

## PHASE 3: NOTIFICATION PREFERENCES + HELP + INVITE FRIENDS

### 3A. Notification Preferences

`app/notification-preferences.tsx` — Toggle groups.

**iOS Settings toggle list:**

**Section: Games**
- Game reminders (toggle, teal when on)
- Score updates (toggle)

**Section: Practices**
- Practice reminders (toggle)
- Schedule changes (toggle)

**Section: Chat**
- Team messages (toggle)
- Direct messages (toggle)

**Section: Announcements**
- Coach/Admin blasts (toggle)

**Section: Payments**
- Payment reminders (toggle)
- Payment confirmations (toggle)

**Section: Achievements**
- Badge unlocks (toggle)
- Shoutouts received (toggle)

Each toggle: standard Switch component, teal track when on, gray when off. Auto-save on every toggle change.

### 3B. Help / FAQ

`app/help.tsx` — Search-first + mascot.

**Layout:**
- `HiLynx.png` mascot at top with "How can we help?"
- Search bar below mascot
- Accordion FAQ sections by category:
  - Getting Started
  - Schedule & Events
  - Payments
  - Chat & Communication
  - Account & Privacy
- Each accordion: tap section header to expand/collapse, smooth animation
- FAQ items within: question (bold) + answer (secondary text)
- **Contact Us section at bottom:**
  - Email support: tappable link
  - "Report a Bug" button
  - App version info

### 3C. Invite Friends

`app/invite-friends.tsx` — Share Lynx.

**Layout:**
- `Meet-Lynx.png` mascot with "Spread the word!"
- "Your invite code: **[CODE]**" (if org codes exist — pull user's org code)
- "Copy Code" button
- "Share via..." button → opens native share sheet with pre-formatted message:
  - "Join our team on Lynx! Download the app and use code [CODE] to get started. [app store link]"
- Share method icons if you want to show specific platforms (iMessage, WhatsApp, etc.)

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: notification preferences, help/FAQ with mascot, invite friends"
git push
```

---

## PHASE 4: LEGAL + UTILITY SCREENS

### 4A. Privacy Policy

`app/privacy-policy.tsx` — Brand the basics.

- Brand header: "Privacy Policy" in display font + Lynx logo small
- Last updated date
- Table of contents with jump links (tap to scroll to section)
- Body text: comfortable reading — 16px font, 1.6 line height, max-width for readability
- Section headers: bold, slightly larger
- No need to redesign the content — just make it comfortable to read with brand typography

### 4B. Terms of Service

`app/terms-of-service.tsx` — Same treatment as Privacy Policy.

- Brand header + last updated
- TOC with jump links
- Comfortable reading typography
- Same layout pattern

### 4C. Data Rights

`app/data-rights.tsx` — GDPR / data request options.

**Layout:**
- Brief explanation: "You have the right to access and manage your personal data."
- Two clear action cards:
  - **"Download My Data"** — brand card with download icon. Tap → confirmation dialog explaining what will be downloaded → "Request Download" button → success message "We'll email your data within 48 hours"
  - **"Delete My Account"** — coral-outlined card (danger zone). Tap → multi-step confirmation:
    - Step 1: "This will permanently delete your account and all data"
    - Step 2: Type "DELETE" to confirm
    - Step 3: Final confirmation button (coral filled)
- These actions should work via Supabase or send a request email to admin

### 4D. Web Features

`app/web-features.tsx` — Redirect to web for features not on mobile.

**This should NOT feel like an error page.** It should feel like a helpful guide.

- `laptoplynx.png` mascot (with laptop) centered
- "Some features work best on the big screen!"
- List of web-only features (brief):
  - Advanced reporting & data export
  - Organization settings
  - Bulk data management
  - Stripe payment configuration
- "Open Web Dashboard" button → `Linking.openURL('https://thelynxapp.com')`
- Warm, helpful tone — not a dead end

### 4E. My Teams

`app/(tabs)/my-teams.tsx` — Team list for current user.

Simple list:
- Cards per team: team name + team color + role in that team + player count
- Tap → team hub or team detail
- If no teams: empty state with guidance to join a team

### 4F. Admin Teams Tab

`app/(tabs)/admin-teams.tsx` — Admin's team list tab.

- May re-export team-management or render a similar list
- Verify it navigates correctly and uses brand styling
- If redundant with team-management, make it re-export

### 4G. Players Tab

`app/(tabs)/players.tsx` — Admin/Coach player roster.

This should already be partially styled from Wave 1 (PlayerCard brand pass). Verify:
- Search bar at top
- PlayerCard compact mode for each player
- Filter by team (pill tabs)
- Sort by name, jersey number, position

### 4H. Messages Tab

`app/(tabs)/messages.tsx` — If this is separate from chats.tsx, check what it does:
- If same as chats: redirect or re-export
- If different (e.g., announcements-only): brand pass

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: legal pages, web features with mascot, my-teams, admin-teams, players, messages"
git push
```

---

## PHASE 5: VERIFY EVERYTHING

```bash
# 1. Type check
npx tsc --noEmit

# 2. Verify my-kids broken nav links are fixed
grep -rn "router.push.*'/chats'\|router.push.*'/schedule'\|router.push.*'/players'" --include="*.tsx" app/my-kids.tsx
# Expected: 0 results (old broken paths should be gone)

grep -rn "router.push.*/\(tabs\)" --include="*.tsx" app/my-kids.tsx
# Expected: 3 results with correct (tabs) prefix

# 3. Verify mascot images in utility screens
grep -rn "HiLynx\|laptoplynx\|Meet-Lynx" --include="*.tsx" app/help.tsx app/web-features.tsx app/invite-friends.tsx
# Expected: 3 results

# 4. Verify sign out button exists on all My Stuff screens
grep -rn "Sign Out\|signOut\|logout" --include="*.tsx" app/\(tabs\)/parent-my-stuff.tsx app/\(tabs\)/coach-my-stuff.tsx app/\(tabs\)/admin-my-stuff.tsx
# Expected: results in all 3

# 5. Verify notification prefs have toggles
grep -rn "Switch\|toggle\|Toggle" --include="*.tsx" app/notification-preferences.tsx
# Expected: multiple toggle references

# 6. Files changed
git diff --stat HEAD~4

# 7. Final commit
git add -A
git commit -m "Phase 5: Wave 7 verification and cleanup"
git push
```

---

## EXPECTED RESULTS

1. **My Stuff (all 4 roles)** — iOS Settings paradigm. Profile card at top, grouped rows below, role-specific sections, sign out at bottom, app version.

2. **Profile Editor** — Avatar with crossfade upload, form fields with brand styling, real-time validation, save button.

3. **My Kids** — **3 broken nav links FIXED.** Child cards with team color accents, add child option, empty state with mascot.

4. **My Waivers** — Per-child waiver list, signed/unsigned status badges, tap-to-sign flow with signature capture.

5. **Coach Profile** — Hero section, bio, teams, qualifications.

6. **Notification Preferences** — Toggle groups by category, auto-save, teal when on.

7. **Help / FAQ** — HiLynx mascot, search bar, accordion FAQ sections, contact us at bottom.

8. **Invite Friends** — Meet-Lynx mascot, invite code display, copy + share via native sheet.

9. **Privacy Policy / Terms** — Brand typography, TOC with jump links, comfortable reading.

10. **Data Rights** — Download + Delete actions with proper confirmation flows.

11. **Web Features** — laptoplynx mascot, helpful tone, link to web dashboard. NOT an error page.

12. **My Teams, Admin Teams, Players, Messages** — Verified and brand-consistent, redirects set for duplicates.

13. **5 commits** — one per phase, each pushed.
