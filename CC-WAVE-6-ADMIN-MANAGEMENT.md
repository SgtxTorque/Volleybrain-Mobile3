# CC-WAVE-6-ADMIN-MANAGEMENT.md
# Lynx Mobile — Wave 6: Admin Management Screens

**Priority:** Run after CC-WAVE-5-COACH-TOOLS completes  
**Estimated time:** 4–6 hours (7 phases, commit after each)  
**Risk level:** LOW — mostly list/form/CRUD brand passes. Two new simple screens.

---

## WAVE CHECKLIST (update as completed)

- [ ] **Wave 0** — Archive dead code + wire admin stubs
- [ ] **Wave 1** — Kill ParentOnboardingModal + shared components brand pass
- [ ] **Wave 2** — Auth redesign + smart empty states
- [ ] **Wave 3** — Daily-use screens (Schedule, Chat, Team Hub)
- [ ] **Wave 4** — Player identity screens
- [ ] **Wave 5** — Coach tool screens
- [ ] **Wave 6** — Admin management screens ← THIS SPEC
- [ ] Wave 7 — Settings, legal, remaining screens
- [ ] Wave 8 — New/planned screens

---

## REFERENCE FILES — READ BEFORE WRITING ANY CODE

Read `LYNX-REFERENCE-GUIDE.md` in the repo root for the full reference map.

### For this wave:

1. `reference/design-references/brandbook/LynxBrandBook.html` — Brand system
2. `reference/design-references/brandbook/lynx-screen-playbook-v2.html` — Open and read the **"Admin Management"** section in the `screens` array. Every screen in this wave has vision and layout specs there.
3. `reference/design-references/v0-mockups/components/` — Check for any admin/dashboard components to reference
4. `reference/supabase_schema.md` — Tables for registrations, payments, seasons, teams, users, venues
5. `theme/colors.ts` and `lib/design-tokens.ts` — Updated design tokens
6. `assets/images/mascot/SleepLynx.png` — Empty states
7. `assets/images/mascot/celebrate.png` — Success confirmations

---

## DESIGN PHILOSOPHY FOR THIS WAVE

Admin screens are **power tools**. The playbook says "Efficient, not fancy." Admins are busy people managing registrations, payments, and teams. They need:

- **Information density** — show more data per screen than parent/player screens
- **Clear status indicators** — badges, color-coded pills, progress rings
- **Batch actions** — select multiple, approve all, send all reminders
- **Search-first** — large search bars, auto-focus, instant filter

These screens should feel like a well-organized back office, not a video game. Clean, professional, functional. Brand colors and typography apply, but the priority is utility over emotion.

---

## PHASE 1: MANAGE HUB + ADMIN SEARCH (NEW)

### 1A. Manage Hub

`app/(tabs)/manage.tsx` — Admin's visible tab. The tool belt.

**Layout: Action grid grouped into sections**

Each section has a header label and icon tiles below it:

**People**
- Players → `/(tabs)/players`
- Coaches → `/(tabs)/coaches`
- Users → `/users`
- Directory → `/org-directory`

**Teams & Seasons**
- Teams → `/team-management`
- Seasons → `/season-settings`
- Archives → `/season-archives`
- Setup Wizard → `/season-setup-wizard` (if built by CC-NEXT-FIVE)

**Money**
- Payments → `/(tabs)/payments`
- Registration → `/registration-hub`
- Reminders → `/payment-reminders` (NEW — built in Phase 3)

**Communication**
- Blasts → `/blast-composer`
- Blast History → `/blast-history`

**Data**
- Reports → `/(tabs)/reports-tab`
- Jerseys → `/(tabs)/jersey-management`
- Search → `/admin-search` (NEW — built in Phase 1B)

**Tile styling:**
- 3-column grid within each section
- Each tile: brand PressableCard, icon centered (use Ionicons), label below
- Icon size: 28-32px
- Card size: roughly square, ~100x100px
- Section headers: SectionHeader component (uppercase, letter-spaced, secondary text)
- Subtle section separators between groups

### 1B. Admin Search (NEW SCREEN)

Create `app/admin-search.tsx` — Global search across the entire org.

**Layout:**

**Search bar (auto-focused on mount):**
- Large input, full width
- Search icon left, clear button right (appears when text is entered)
- Placeholder: "Search players, teams, events, payments..."
- `autoFocus={true}` — keyboard opens immediately

**Results (grouped by type):**

As the user types, show results grouped under section headers:

- **Players** — avatar + name + team + jersey number. Tap → `child-detail` or player detail
- **Teams** — team color dot + team name + player count. Tap → `team-management` or team detail
- **Events** — type badge + event name + date. Tap → event detail bottom sheet
- **Payments** — family name + amount + status badge. Tap → `/(tabs)/payments` filtered
- **Users** — avatar + name + role badge + email. Tap → user detail

**Search behavior:**
- Debounce 300ms before querying
- Search across: players.first_name, players.last_name, teams.name, events.title, profiles.full_name, profiles.email
- Show "No results" with `SleepLynx.png` if nothing matches
- Show recent searches (last 5) when input is empty (store in AsyncStorage)

**Keep it simple:** This is a utility search, not a discovery feature. Fast, accurate, functional.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: manage hub action grid + admin search (new screen)"
git push
```

---

## PHASE 2: REGISTRATION HUB + USERS/DIRECTORY

### 2A. Registration Hub (Admin)

`app/registration-hub.tsx` — Approve/deny new families. Inbox with actions.

**Stats bar at top:**
- Three pills or mini-cards side by side:
  - Pending: count with gold/amber background
  - Approved: count with teal background
  - Denied: count with coral background
- Tapping a pill filters the list below to that status

**Registration cards (list below stats):**

Each card:
- Parent name (bold) + email
- Child name + age/grade
- Team requested (if specified during registration)
- Payment status: "Paid" (teal badge), "Pending" (gold badge), "Waived" (gray badge)
- Waiver status: "Signed" (teal) or "Not Signed" (coral)
- Timestamp: "Applied 2 days ago"
- Two action buttons:
  - **Approve** (teal, filled) — assigns player to team, triggers welcome notification
  - **Deny** (coral, outlined) — shows confirmation dialog first

**Swipe actions (if feasible):** Swipe right to approve, swipe left to deny. If complex, skip — the buttons are sufficient.

**Batch actions:** "Approve All Pending" button at top (only visible when pending > 0). Confirmation dialog before executing.

### 2B. Users / Org Directory

`app/users.tsx` — Member management.

**Search-first design:**
- Large search bar at top (auto-focused is optional here, unlike admin-search)
- Filter pills below search: "All" | "Admin" | "Coach" | "Parent" | "Player"

**Member list:**
- Each row: avatar + full name + role badge (color-coded) + email in secondary text
- Tap → user profile detail or bottom sheet with actions
- Quick actions (kebab menu or swipe):
  - "Message" → opens DM or chat
  - "View Profile" → profile detail
  - Admin-only: "Change Role" → role picker
  - Admin-only: "Deactivate" → confirmation dialog

**Org Directory variant:**
`app/org-directory.tsx` — If this is a separate screen from users.tsx, check if it renders the same data differently. If so, make it a read-only version of users (no admin actions, just search + view). If it's redundant, redirect it to users.tsx.

### 2C. Coach Directory

`app/coach-directory.tsx` — Coaches list.

Simple brand pass:
- Same list pattern as users but filtered to coaches only
- Each row: avatar + name + teams assigned + availability status (if coach-availability data exists)
- Tap → coach-profile

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: registration hub inbox, users/directory search-first, coach directory"
git push
```

---

## PHASE 3: PAYMENTS (ALL VIEWS) + PAYMENT REMINDERS (NEW)

### 3A. Payments Dashboard (Admin)

`app/(tabs)/payments.tsx` — Answer fast: who hasn't paid?

**Summary card at top (Tier 1):**
- Circular progress ring: collected / total expected
- Dollar amounts: "$4,200 of $5,800 collected"
- Percentage: "72%"
- Ring color: teal fill, gray remainder

**Filter pills below summary:**
- "All" | "Outstanding" | "Paid" | "Partial" | "Waived"

**Family payment rows:**
- Each row: family name + child name + amount + status badge
- Status badges:
  - **Paid:** teal badge, checkmark icon
  - **Partial:** gold badge, partial circle icon, amount remaining shown
  - **Outstanding:** coral badge, alert icon
  - **Waived:** gray badge, dash icon
- Tap row → expands to show payment details (dates, methods, notes) or navigates to detail view
- Amounts: right-aligned, bold, properly formatted ($X,XXX.XX)

**Sort options:** By name, by amount, by status, by date

### 3B. Family Payments (Parent View)

`app/family-payments.tsx` — What do I owe?

**Balance card at top (Tier 1):**
- If balance owed: amount large and prominent, due date, "Pay Now" CTA (teal button)
- If all paid: teal "All Paid!" card with checkmark, `celebrate.png` mascot small in corner

**Transaction history below (Tier 2 flat rows):**
- Each row: date + description + amount + status
- Paid items: teal text or strikethrough
- Pending items: bold with gold status
- Sort: reverse chronological

**Payment methods (if Stripe is integrated):**
- "Pay Now" opens payment flow
- If no online payment: show instructions ("Pay via Venmo/CashApp/Zelle to...")

### 3C. Payment Reminders (NEW SCREEN)

Create `app/payment-reminders.tsx` — 2-step select-and-send flow.

**Step 1: Select Families**
- List of families with outstanding balances
- Each row: checkbox + family name + child name + amount outstanding
- "Select All" toggle at top
- Running total at bottom: "Reminding 8 families · $2,400 total outstanding"
- "Next: Preview Message →" button

**Step 2: Preview & Send**
- Default reminder message (editable text area):
  - "Hi [Family Name], this is a friendly reminder that your registration balance of $[Amount] for [Season Name] is outstanding. Please make your payment at your earliest convenience. Thank you!"
- Preview of how it will look as a notification/message
- "Send Reminders" button (teal, full width)
- Confirmation: "Reminders sent to 8 families" with `celebrate.png` mascot
- Navigates back to payments dashboard

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: payments dashboard, family payments, payment reminders (new)"
git push
```

---

## PHASE 4: TEAMS & SEASONS

### 4A. Team Management

`app/team-management.tsx` — CRUD list of all teams.

**Team cards:**
- Team name (bold) + team color indicator (small circle or left accent bar)
- Age group badge
- Player count: "12 players"
- Coach name
- Season: current season name
- Actions: "Edit" → inline expansion or bottom sheet with edit form. "Archive" → confirmation.

**Create Team FAB:**
- Teal FAB bottom-right
- Opens a bottom sheet or modal: team name, age group, select coach, select season, team color picker
- "Create Team" button

### 4B. Season Settings

`app/season-settings.tsx` — Configuration for active season.

**iOS Settings style — grouped form fields:**

**Section: Basics**
- Season name (text input)
- Start date (date picker)
- End date (date picker)
- Status toggle: Active / Inactive
- Sport selector (dropdown, default Volleyball)

**Section: Registration**
- Registration open date
- Registration close date
- Fees per player (currency input)
- Require waivers toggle
- Auto-approve toggle

**Section: Danger Zone**
- "Archive Season" → confirmation dialog
- Red text/button treatment for destructive actions

**All fields auto-save or have a "Save Changes" button at bottom.**

### 4C. Season Archives

`app/season-archives.tsx` — Past seasons.

- Card per season: name, date range, team count, player count, total revenue
- Tap → season summary detail (could be a bottom sheet with key stats)
- "Duplicate for New Season" action on each card → pre-fills season setup wizard with this season's settings
- Chronological sort, most recent first

### 4D. CC-NEXT-FIVE Verification (Season Setup Wizard + Bulk Event)

If `app/season-setup-wizard.tsx` exists (CC-NEXT-FIVE Feature 4):
- Verify brand tokens, step indicator, form styling consistent with Wave 1
- Verify it follows the 5-step flow from the playbook

If `app/bulk-event-create.tsx` exists (CC-NEXT-FIVE Feature 5):
- Verify brand pass
- Verify it works and navigates back correctly

If either doesn't exist: skip, don't build.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: team management CRUD, season settings form, season archives, CC-NEXT-FIVE verify"
git push
```

---

## PHASE 5: REPORTS + JERSEY MANAGEMENT

### 5A. Season Reports

`app/season-reports.tsx` — Analytics dashboard for admins.

**Key metric cards at top (2x2 grid):**
- Total Registrations (number + trend arrow)
- Revenue Collected (dollar amount + % of total)
- Attendance Rate (percentage + trend)
- Season Record (W-L-T)

**Charts below (if chart library is available — recharts, victory-native, or similar):**
- Registration trend: line chart over time
- Revenue breakdown: bar chart or pie (collected vs outstanding)
- Attendance by event: bar chart

**Chart colors:** Use brand palette — teal for positive metrics, coral for negative/outstanding, sky for neutral, gold for highlights.

**Filter:** Team selector pills at top to filter all data by team or show whole org.

If no chart library is installed and adding one is too complex: use simple stat cards with large numbers instead of charts. The numbers are more important than the visualization for now.

### 5B. Report Viewer

`app/report-viewer.tsx` — Drill-down from season reports.

- Table or detailed list view of specific data
- Column headers with sort toggles
- Date range filter if applicable
- "Export" button (if export exists, great. If not, show "Export available on web" with `laptoplynx.png`)

### 5C. Jersey Management

`app/(tabs)/jersey-management.tsx` — Simple data table.

**Table layout:**
- Columns: Player Name, Jersey #, Size
- Editable inline: tap a cell to edit the jersey number or size
- Sort by: player name (default), jersey number, size
- Brand table styling: alternating row backgrounds (subtle), brand header row
- "Add Jersey" for unassigned players

**Keep it simple.** This is a utility screen. Clean data table with brand colors.

### 5D. Team Roster

`app/team-roster.tsx` — Player list for a specific team.

- Uses PlayerCard compact mode (styled in Wave 1)
- Sort by: jersey number, name, position
- Search/filter at top
- Coach view: shows additional info (attendance %, stat summary)
- Tap → child-detail or player detail

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: season reports with charts, report viewer, jersey management, team roster"
git push
```

---

## PHASE 6: PARENT REGISTRATION HUB + REMAINING ADMIN SCREENS

### 6A. Parent Registration Hub

`app/parent-registration-hub.tsx` — The parent side of registration (not admin approval).

This is the flow a parent goes through when registering a child. Multi-step form.

**Brand pass:**
- Step indicator at top (consistent with other multi-step flows)
- Form inputs: brand styling (rounded, subtle border, teal focus ring)
- Child info fields: name, date of birth, grade, jersey size, medical notes
- Waiver section: digital signature area, checkbox acknowledgment
- Payment section: balance display, payment method (if Stripe) or payment instructions
- Confirmation: success card with `celebrate.png`, "Welcome to [Team Name]!"

### 6B. Venue Manager (NEW — if time allows)

Create `app/venue-manager.tsx` — CRUD list of practice/game venues.

**Simple list:**
- Each card: venue name, address (1 line), notes
- Tap → edit bottom sheet: name, address, notes, capacity
- Create FAB → same bottom sheet but empty
- Used by event creation — venue picker pulls from this list

**If this is too much for the wave, skip it.** It's LOW priority. Just ensure the route exists as a stub with a `laptoplynx.png` "Coming soon on web" message.

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 6: parent registration hub brand pass, venue manager"
git push
```

---

## PHASE 7: VERIFY EVERYTHING

```bash
# 1. Type check
npx tsc --noEmit

# 2. Verify new screens created
ls app/admin-search.tsx app/payment-reminders.tsx
# Expected: both exist

# 3. Verify manage hub tiles navigate correctly
grep -rn "router.push" --include="*.tsx" app/\(tabs\)/manage.tsx | wc -l
# Expected: 12+ navigation targets

# 4. Verify payment status badges use brand colors
grep -rn "Paid\|Outstanding\|Partial\|Waived" --include="*.tsx" app/\(tabs\)/payments.tsx | head -10
# Expected: status badges with brand color references

# 5. Verify mascot usage
grep -rn "SleepLynx\|celebrate\|laptoplynx" --include="*.tsx" app/admin-search.tsx app/payment-reminders.tsx app/family-payments.tsx
# Expected: at least 3 results

# 6. Files changed
git diff --stat HEAD~6

# 7. Final commit
git add -A
git commit -m "Phase 7: Wave 6 verification and cleanup"
git push
```

---

## EXPECTED RESULTS

1. **Manage Hub** — Clean 3-column action grid grouped by function (People, Teams, Money, Comms, Data). Every tile navigates to a real screen.

2. **Admin Search (NEW)** — Auto-focused search bar, results grouped by type (Players, Teams, Events, Payments, Users), debounced query, recent searches.

3. **Registration Hub** — Inbox pattern with stats bar (Pending/Approved/Denied), registration cards with approve/deny buttons, batch approve.

4. **Users / Org Directory** — Search-first with role filter pills, member rows with role badges, admin actions (change role, deactivate).

5. **Payments Dashboard** — Circular progress ring (collected/total), filter by status, family rows with color-coded status badges.

6. **Family Payments** — Balance card with Pay Now CTA, transaction history, "All Paid!" celebration state.

7. **Payment Reminders (NEW)** — 2-step: select families with checkboxes + running total → preview message + send. Confirmation with mascot.

8. **Team Management** — CRUD cards with team color indicators, create FAB, edit via bottom sheet.

9. **Season Settings** — iOS Settings style grouped form. Auto-save or save button.

10. **Season Archives** — Past season cards with duplicate-for-new-season action.

11. **Season Reports** — Metric cards + charts (or large number cards if no chart library).

12. **Jersey Management** — Clean editable data table. Sort by name/number/size.

13. **Team Roster** — PlayerCard compact list with search and sort.

14. **Parent Registration Hub** — Branded multi-step form with step indicator.

15. **7 commits** — one per phase, each pushed.
