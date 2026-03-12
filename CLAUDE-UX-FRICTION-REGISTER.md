# CLAUDE-UX-FRICTION-REGISTER.md
## Lynx Mobile — UX Friction Points & Cognitive Load Register
### Audit Date: 2026-03-11

---

## Friction Scoring

Each friction point is scored on:
- **Frequency:** How often users encounter this (1–5)
- **Severity:** How much it disrupts the task (1–5)
- **Friction Score:** Frequency x Severity (1–25)

---

## HIGH FRICTION (Score 15–25)

### F-01: No Action Feedback After RSVP/Payment/Approval
**Score: 20** (Frequency: 5, Severity: 4)

| Action | Current Feedback | Expected |
|--------|-----------------|----------|
| RSVP submit | UI color change only | Toast: "Marked as attending" |
| Payment submit | Status change | Toast: "Payment submitted for review" |
| Registration approve | Page refresh | Toast: "Approved [Name]" |
| Game stat save | Modal closes | Toast: "Stats saved" |
| Challenge join | Card updates | Toast: "Joined challenge" |

**Evidence:** No toast/snackbar system implemented across the app. All actions provide visual-only feedback (color changes, page refreshes).
**Impact:** Users uncertain if actions registered. Parents may tap RSVP multiple times.

---

### F-02: Multi-Child RSVP Attribution Confusion
**Score: 20** (Frequency: 4, Severity: 5)

**Scenario:** Parent with children Alice (team A) and Bob (team B). Billboard Hero auto-cycles events for BOTH children. Parent taps RSVP thinking it's Alice's game — it's actually Bob's.

**Evidence:** `EventHeroCard.tsx` passes `event.childId` correctly to `onRsvp`, but child name is not prominently displayed on the hero card. No "This is [child]'s event" label.

**Impact:** Wrong child RSVPed → coach builds roster incorrectly → child doesn't show up.

---

### F-03: Coach Game Prep Fragmentation
**Score: 16** (Frequency: 4, Severity: 4)

The answer to "Is my game prep done?" is split across 3 separate cards:
1. **PrepChecklist** — setup status (CoachHomeScroll line 487)
2. **GamePlanCard** — next event details (line 496)
3. **QuickActions** — immediate actions (line 515)

Coach must read all three cards, scrolling through ~2 screen heights, to understand their readiness state.

**Impact:** Cognitive overhead on every app open. 5-second test borderline (~5 sec vs target 3 sec).

---

### F-04: Missing Empty States (~40% of screens)
**Score: 15** (Frequency: 5, Severity: 3)

12+ screens show blank content when data is absent, with no explanation or CTA:
- `gameday.tsx` — blank white screen
- `team-roster.tsx` — empty FlatList
- `players.tsx` — empty FlatList
- `standings.tsx` — empty table
- `my-stats.tsx` — empty grid
- `payment-reminders.tsx` — silent empty

**Evidence:** See CLAUDE-UX-DEAD-END-SCREENS.md for full list.
**Impact:** Users can't distinguish "loading" from "no data" from "error."

---

### F-05: 4 Redundant Roster Screens
**Score: 15** (Frequency: 3, Severity: 5)

Coach doesn't know which roster to use:
- `/(tabs)/players` — grid/list
- `/(tabs)/coach-roster` — alias of players
- `/roster?teamId=X` — carousel
- `/team-roster?teamId=X` — list

**Evidence:** See CLAUDE-UX-REDUNDANCY-REPORT.md.
**Impact:** Navigation confusion + bug fixes may not propagate across all implementations.

---

## MEDIUM FRICTION (Score 8–14)

### F-06: View Child Stats Requires 4 Taps (Should Be 2)
**Score: 12** (Frequency: 4, Severity: 3)

**Current flow:** Home → child card → `/family-gallery` (shows ALL children) → swipe to correct child → `/child-detail` → "Stats" tab.
**Expected:** Home → "View Stats" shortcut on child card → Stats screen.

**Evidence:** No direct stats navigation from ParentHomeScroll child card.

---

### F-07: Pay Fees Requires 5 Taps via Drawer (No Shortcut)
**Score: 12** (Frequency: 3, Severity: 4)

If Attention Banner is not showing (no unpaid balance visible), payment flow requires: Home → Drawer → My Family → Payments → `/family-payments` → select child → payment detail.

**Evidence:** Attention Banner only renders when `unpaidBalance > 0`. Historical payments (already paid) require full drawer navigation.

---

### F-08: No Event Templates for Coaches
**Score: 12** (Frequency: 4, Severity: 3)

Coach creating a weekly practice must fill all fields from scratch every time:
- Event type, date, time, location, team
- No "recurring" option
- No "copy from last week"
- No templates

**Evidence:** `app/(tabs)/coach-schedule.tsx` — event creation is fully manual.

---

### F-09: Registration Hub Filter Matrix (21 Views)
**Score: 10** (Frequency: 3, Severity: 3.3)

7 status filters x 3 sort modes = 21 possible views. Admin loses context when switching filters. No "remember last filter" or "saved views."

**Evidence:** `app/registration-hub.tsx:181–183` — filter definitions.

---

### F-10: Manage Screen Cognitive Overload (Score 9/10)
**Score: 10** (Frequency: 5, Severity: 2)

4 attention cards + org snapshot (6 numbers) + activity feed (10 items) + action grid = 20+ distinct UI elements on one screen. Color fatigue from red/green status indicators.

**Evidence:** `app/(tabs)/manage.tsx:216–245` — attention cards, `127–149` — org snapshot.

---

### F-11: No Batch Registration Approval
**Score: 10** (Frequency: 2, Severity: 5)

Admin must tap each registration individually. For 50 pending registrations at season start, that's 50+ taps. No "select multiple" or "approve all" option.

**Evidence:** `app/registration-hub.tsx` — individual approval only.

---

### F-12: Game Day Command — No Undo
**Score: 9** (Frequency: 3, Severity: 3)

If coach taps wrong stat during live scoring, must scroll back through rally history to find and delete. No "undo last action" button.

**Evidence:** `app/game-day-command.tsx` — no undo stack implementation.

---

### F-13: N+1 Unread Count Query in Tab Layout
**Score: 9** (Frequency: 5, Severity: 1.8)

Tab layout fetches unread counts with per-channel loop:
```tsx
for (const m of memberships) {
  const { count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', m.channel_id)
    ...
}
```

If user is in 20 channels, that's 20 sequential DB queries on every tab mount.

**Evidence:** `app/(tabs)/_layout.tsx:91–98`.

---

### F-14: Context Loss — Multi-Child Navigation
**Score: 8** (Frequency: 3, Severity: 2.7)

Parent viewing Emma's data on home → taps to navigate deeper → arrives at `/family-gallery` showing ALL children → must manually locate Emma again. No child context preserved in navigation params.

---

## LOW FRICTION (Score 1–7)

### F-15: Game Day Command Page Gating Unclear
**Score: 6** (Frequency: 2, Severity: 3)

Disabled page dots in game-day-command don't explain why they're disabled (e.g., "Lineup must be ready before starting live match").

**Evidence:** `app/game-day-command.tsx:85–91`.

---

### F-16: Two Game Post-Mortem Routes
**Score: 6** (Frequency: 2, Severity: 3)

`/game-recap` and `/game-results` serve identical purpose. Coach doesn't know which to use.

---

### F-17: Season Selector Shows Archived Seasons
**Score: 4** (Frequency: 2, Severity: 2)

Season selector in drawer shows ALL seasons including archived ones. No filter to hide archived. User may accidentally switch to an archived season.

**Evidence:** `lib/season.tsx:55–71` — no archived season filter.

---

### F-18: Stat Entry Shows Full Roster
**Score: 4** (Frequency: 2, Severity: 2)

Game recap stat entry shows full team roster, including substitutes who didn't play. Coach must skip non-playing players manually.

---

### F-19: No Offline Capability
**Score: 4** (Frequency: 1, Severity: 4)

All DB operations require network connectivity. Coach live scoring during game loses all data on network drop. Parent RSVP fails silently if offline.

---

## Friction by Role

### Parent Friction Summary
| ID | Issue | Score |
|----|-------|-------|
| F-01 | No action feedback | 20 |
| F-02 | Multi-child RSVP confusion | 20 |
| F-04 | Missing empty states | 15 |
| F-06 | Stats requires 4 taps | 12 |
| F-07 | Payment requires 5 taps | 12 |
| F-14 | Context loss on navigation | 8 |
| **Total** | | **87** |

### Coach Friction Summary
| ID | Issue | Score |
|----|-------|-------|
| F-01 | No action feedback | 20 |
| F-03 | Game prep fragmentation | 16 |
| F-04 | Missing empty states | 15 |
| F-05 | 4 roster screens | 15 |
| F-08 | No event templates | 12 |
| F-12 | No undo in live scoring | 9 |
| F-15 | Page gating unclear | 6 |
| F-16 | Two game post-mortem routes | 6 |
| F-18 | Full roster in stat entry | 4 |
| F-19 | No offline capability | 4 |
| **Total** | | **107** |

### Admin Friction Summary
| ID | Issue | Score |
|----|-------|-------|
| F-01 | No action feedback | 20 |
| F-04 | Missing empty states | 15 |
| F-09 | Registration filter matrix | 10 |
| F-10 | Manage screen overload | 10 |
| F-11 | No batch approval | 10 |
| F-17 | Archived seasons visible | 4 |
| **Total** | | **69** |

**Coach has the highest total friction (107), followed by Parent (87), then Admin (69).**
