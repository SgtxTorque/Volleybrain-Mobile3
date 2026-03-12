# CLAUDE-UX-TASK-FLOWS.md
## Lynx Mobile — Task Flow Analysis
### Audit Date: 2026-03-11

---

## Methodology

Each critical task is analyzed for:
- **Navigation chain** — screens touched from start to completion
- **Tap count** — expected vs actual
- **Code evidence** — file paths and line numbers
- **Friction points** — where flow breaks or confuses
- **Dead ends** — where users get stuck

---

## Parent Tasks

### TASK 1: RSVP to an Event

**Goal:** Parent confirms child's attendance for an upcoming game/practice
**Expected Taps:** 1–2 | **Actual: 1 tap**

**Navigation Chain:**
```
ParentHomeScroll (home)
  → Billboard Hero card (auto-cycling events with RSVP buttons)
  → Tap RSVP button → cycles: yes → maybe → no → yes
```

**Code Evidence:**
- `components/parent-scroll/BillboardHero.tsx` — RSVP button with 3-state cycle
- `components/parent-scroll/EventHeroCard.tsx:74–85` — `getRsvpDisplay()` maps status to label/color
- `ParentHomeScroll.tsx:497–505` — Billboard Hero rendered with `onRsvp` callback

**Assessment:** EXCELLENT — single-tap RSVP directly on home screen. No navigation required.

**Friction Points:**
- No confirmation toast after RSVP (user unsure if action registered)
- Multi-child families: Billboard cycles ALL children's events — parent may RSVP wrong child if not reading carefully. `event.childId` is passed correctly (EventHeroCard), but child name not prominently displayed.

---

### TASK 2: Check Upcoming Schedule

**Goal:** Parent sees when next game/practice is
**Expected Taps:** 0–1 | **Actual: 0 taps**

**Navigation Chain:**
```
ParentHomeScroll (home)
  → Billboard Hero (auto-displays next event)
  → Also Today/This Week strip (secondary events)
```

**Code Evidence:**
- `ParentHomeScroll.tsx:497–508` — Billboard + secondary strip
- `hooks/useParentHomeData.ts` — fetches events via `schedule_events` with team/child join

**Assessment:** EXCELLENT — zero-tap visibility of next event on home screen.

---

### TASK 3: View Child's Stats

**Goal:** Parent checks child's performance (kills, aces, etc.)
**Expected Taps:** 2–3 | **Actual: 4 taps**

**Navigation Chain:**
```
ParentHomeScroll (home)
  → Tap child card (single child) or avatar row (multi-child)
  → /family-gallery (no child filter, shows all children)
  → Swipe to correct child
  → /child-detail?playerId=xxx
  → Tab to "Stats"
```

**Friction Points:**
- **Context loss on multi-child:** Parent taps from home (showing Emma's card) → `/family-gallery` shows ALL children → must manually find Emma again
- **No direct stats shortcut:** No "View Stats" button on home screen child card
- `child-detail` loads via `usePlayerHomeData(playerId)` which has **no permission validation** (see CLAUDE-UX-BETA-RISK-REGISTER.md)

---

### TASK 4: Pay Fees

**Goal:** Parent submits payment for registration/uniform/monthly fees
**Expected Taps:** 3–4 | **Actual: 5 taps**

**Navigation Chain:**
```
ParentHomeScroll (home)
  → Attention Banner (if unpaid balance) → tap
  → /family-payments
  → Select child/payment
  → Payment detail modal
  → Tap "Submit Payment"
```

**Code Evidence:**
- `ParentHomeScroll.tsx:510–517` — Attention Banner with payment nudge
- Drawer → My Family → "Payments" → `/family-payments` (badge: `unpaidPaymentsParent`)

**Friction Points:**
- Attention Banner only appears if unpaid balance exists; otherwise payment flow requires 4+ taps via drawer
- No payment method integration (Stripe) on mobile — cash/check/Venmo only, admin must manually verify
- Payment status after submission: "Pending" with no estimated verification time

---

## Coach Tasks

### TASK 5: Create a Practice Event

**Goal:** Coach schedules a new practice
**Expected Taps:** 4–6 | **Actual: 6–7 taps**

**Navigation Chain:**
```
CoachHomeScroll (home)
  → Tap "Schedule" or "Quick Actions" → "Add Event"
  → /(tabs)/coach-schedule
  → Tap "+" FAB
  → Event creation modal:
    → Select event type (practice/game/tournament)
    → Set date + time (DateTimePicker)
    → Set location (text or map picker)
    → Set team (if multi-team coach)
    → Tap "Save"
```

**Code Evidence:**
- `app/(tabs)/coach-schedule.tsx` — full event creation wizard with DateTimePicker, location picker
- `CoachHomeScroll.tsx:515` — QuickActions card with shortcuts

**Friction Points:**
- No event templates ("recurring practice at 5 PM every Tuesday")
- Coach must fill all fields from scratch each time
- No bulk creation on mobile (available on web via `/bulk-event-create`)
- No schedule conflict checking — can create two events for same team at same time

---

### TASK 6: Run a Live Game (Game Day Command)

**Goal:** Coach manages a live match (lineup → scoring → results)
**Expected Taps:** 12+ | **Actual: 12+ taps across 4 pages**

**Navigation Chain:**
```
CoachHomeScroll (home)
  → GamePlanCard or QuickActions → "Start Game"
  → /game-day-command?eventId=X&teamId=Y
  → Page 0: Game Prep (set 6 starters)
  → Page 1: Live Match (point-by-point tracking)
  → Page 2: End Set (confirm set score)
  → Page 3: Summary (post-game recap)
```

**Code Evidence:**
- `app/game-day-command.tsx:50–63` — 4-page `renderCurrentPage()` switch
- Navigation gating: Can't advance to Live until 6 starters selected (line 85–91)

**Critical Issues:**

1. **No substitution tracking:** Live match page shows starting lineup; no UI to log substitutions mid-game. Stat tracking assumes same 6 players the whole game.

2. **No undo/correction:** If coach taps wrong stat, must scroll back through rally history to delete. No "undo last action" button.

3. **Stat attribution ambiguity:** Tapping court zones logs stats, but unclear which player performed stat. If coach forgets to select player, stat attributed to wrong player.

4. **No auto-save:** All stats stored in-memory during game. If app crashes mid-game, **all stats are lost** — no periodic server sync.

5. **Page gating unclear:** Disabled page dots don't explain why they're disabled (e.g., "Lineup must be ready before starting live match").

---

### TASK 7: Submit/View Post-Game Stats

**Goal:** Coach enters or reviews game statistics
**Expected Taps:** 3–5 | **Actual: 4–6 taps**

**Navigation Chain:**
```
CoachHomeScroll (home)
  → "Recent Games" or Schedule
  → /(tabs)/coach-schedule
  → Tap completed game
  → /game-recap?eventId=xxx  OR  /game-results?eventId=xxx
  → Enter stats per player → Save
```

**Friction Points:**
- **Two redundant routes:** `/game-recap` and `/game-results` serve identical purpose — coach doesn't know which to use
- Manual stat entry is tedious: must enter kills, aces, digs, blocks, assists, errors per player individually
- No validation: coach can enter kills > total attempts (logically impossible)
- Game recap shows full roster, even substitutes who didn't play — should show only lineup players
- No stat locking: once submitted, anyone can edit with no audit trail

---

### TASK 8: View Roster

**Goal:** Coach checks team roster and player info
**Expected Taps:** 2–3 | **Actual: 2 taps (but 4 redundant routes)**

**Navigation Chain:**
```
CoachHomeScroll (home)
  → Tap "View Roster" or navigate via drawer
  → /(tabs)/players  OR  /(tabs)/coach-roster  OR  /roster?teamId=X  OR  /team-roster?teamId=X
  → See all players
  → Tap player → /child-detail?playerId=X  OR  /player-card?playerId=X
```

**Critical Finding: 4 Roster Screens**
- `/(tabs)/players` — grid/list of all players (full implementation)
- `/(tabs)/coach-roster` — 7-line re-export of `players.tsx`
- `/roster?teamId=X` — separate carousel implementation
- `/team-roster?teamId=X` — separate list implementation

**Code Evidence:**
```tsx
// app/(tabs)/coach-roster.tsx
export { default } from './players'; // 7-line alias

// app/roster.tsx — separate carousel implementation
// app/team-roster.tsx — separate list implementation
```

**Impact:** Coach doesn't know which roster to use; code duplication; bug fixes applied to one may miss others.

---

## Admin Tasks

### TASK 9: Manage Registrations

**Goal:** Admin approves/denies player registrations
**Expected Taps:** 3–5 | **Actual: 4–7 taps**

**Navigation Chain:**
```
AdminHomeScroll (home)
  → Smart Queue card (shows pending count)
  → /registration-hub?status=pending
  → Tap registration
  → Registration detail modal (player info, waivers, fees)
  → Approve / Deny / Waitlist
  → Confirm
```

**Code Evidence:**
- `components/admin-scroll/SmartQueueCard.tsx` — front-loaded in admin home
- `app/registration-hub.tsx:201–250` — approval action handler

**Friction Points:**
- **No batch approval:** Admin must tap each registration individually. For 50 pending registrations, 50+ taps required.
- **Approval doesn't auto-assign to team:** Admin must go to separate "Team Roster" screen to add player after approval.
- **No conflict detection:** Doesn't check if player is already registered for another team same season.
- **No standardized denial reasons:** Freetext "reason" field leads to inconsistent parent feedback.

---

### TASK 10: Review Payments

**Goal:** Admin verifies and tracks payment collection
**Expected Taps:** 3–5 | **Actual: 4–6 taps**

**Navigation Chain:**
```
AdminHomeScroll (home)
  → Payment Snapshot card or Quick Actions → "Process Payments"
  → /(tabs)/payments
  → Filter by status (pending/verified/unpaid)
  → Tap payment
  → Verify / Record / Create Plan
```

**Friction Points:**
- No Stripe integration on mobile — only verifies self-reported payments (cash, check, Venmo)
- No bulk payment recording — coach collects 10 checks, admin must record each individually
- No preset payment plan templates — admin manually defines installments
- No automated payment reminders — manual send via `/payment-reminders`

---

### TASK 11: Create/Publish Schedule

**Goal:** Admin creates and publishes season schedule
**Expected Taps:** 5–9 | **Actual: 5–8 taps**

**Navigation Chain:**
```
AdminHomeScroll (home)
  → "Schedule" quick action or drawer
  → /(tabs)/admin-schedule (aliases to coach-schedule)
  → Tap "+" to create event OR
  → /bulk-event-create (bulk creation)
  → Fill event details → Save
```

**Friction Points:**
- `/(tabs)/admin-schedule` is an alias for `coach-schedule` — no admin-specific bulk operations
- No schedule conflict checking (can double-book venues/teams)
- No draft vs published distinction — unclear when events become visible to coaches/parents
- Opponent assignment is manual string entry — no linking to actual opponent team

---

## Cross-Cutting Flow Issues

### Issue 1: Redundant Detail Screens

| Data Type | Routes | Count |
|-----------|--------|-------|
| Player Detail | `/child-detail`, `/player-card`, `/roster`, `/team-roster` | 4 |
| Player Stats | `/my-stats`, `/player-card`, `/child-detail?tab=stats` | 3 |
| Game Recap | `/game-recap`, `/game-results` | 2 |
| Roster | `/(tabs)/players`, `/(tabs)/coach-roster`, `/roster`, `/team-roster` | 4 |

**Impact:** Code duplication (OVR calculation duplicated in `player-card.tsx`, `roster.tsx`, `usePlayerHomeData.ts`), navigation confusion, maintenance burden.

### Issue 2: Context Loss on Deep Navigation

**Example — Parent checking stats:**
```
ParentHomeScroll (showing Emma)
  → Tap "View Stats"
  → /family-gallery (shows ALL children, no filter)
  → Must manually swipe to Emma
  → /child-detail?playerId=xxx
```

Multi-child parents confused about whose data they're viewing. No child name in screen header, no breadcrumbs.

### Issue 3: No Action Feedback

| Action | Current Feedback | Expected |
|--------|-----------------|----------|
| RSVP submit | UI color change only | + Toast: "Marked as attending" |
| Payment submit | Status change | + Toast: "Payment submitted for review" |
| Registration approve | Page refresh | + Toast: "Approved [Name]" |
| Game stat save | Modal closes | + Toast: "Stats saved" |

### Issue 4: Multi-Child RSVP Confusion

**Risk:** Parent RSVPs child 1 for child 2's game.

**Code Evidence:** `EventHeroCard` passes `event.childId` correctly to `onRsvp` callback, but child name is not prominently displayed on the hero card. Billboard cycles events for ALL children without clear child attribution.

### Issue 5: Offline Capability Missing

All DB operations are real-time with no offline queue:
- Coach live scoring — stats lost on network drop
- Parent RSVP — fails silently if offline
- Coach event creation — no auto-save

---

## Task Flow Complexity Summary

| Task | Role | Taps | Screens | Verdict |
|------|------|------|---------|---------|
| RSVP to event | Parent | 1 | 1 | Optimal |
| Check schedule | Parent | 0 | 1 | Optimal |
| View child stats | Parent | 4 | 4 | **Needs shortcut** |
| Pay fees | Parent | 5 | 2 | **Needs shortcut** |
| Create practice | Coach | 6–7 | 2 | **Needs templates** |
| Run live game | Coach | 12+ | 4+ | Complex but appropriate |
| Submit stats | Coach | 4–6 | 3 | **Redundant routes** |
| View roster | Coach | 2 | 1 | **4 redundant screens** |
| Manage registrations | Admin | 4–7 | 3 | **Needs batch actions** |
| Review payments | Admin | 4–6 | 2 | Acceptable |
| Publish schedule | Admin | 5–8 | 2 | **Needs conflict check** |

**Average: 4.75 taps per task** (could be reduced to ~3.5 with shortcuts and consolidation)
