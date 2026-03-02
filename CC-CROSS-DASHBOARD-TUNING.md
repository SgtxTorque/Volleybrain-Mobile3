# LYNX — Cross-Dashboard Tuning: Visual Density, Role Selector, Event Display
## For Claude Code Execution

---

## CONTEXT

The Parent Home (Phases 0-9) and Coach Home (Phases 0-7 + hotfix) are built and functional. Data is loading. This prompt fixes specific issues and tunes the coach experience to reduce word density.

**The main feedback on the Coach Home:** "There are a ton of words and sentences. It feels like I clicked on a recent activity log and am scrolling through it." The information is correct but the presentation is too uniform — everything is 14-16px left-aligned text with arrows. There's no visual variety, no landmarks, no rhythm. The parent dashboard feels better because it has visual breaks (navy event card, colored athlete cards, metric grid). The coach scroll is a wall of text.

---

## RULES
1. Read SCHEMA_REFERENCE.csv before modifying any queries
2. Read existing code before changing it
3. Surgical fixes only — no refactoring, no reorganizing, no renaming
4. DO NOT touch Admin or Player dashboards
5. Run `npx tsc --noEmit` after all fixes
6. AUTONOMOUS EXECUTION MODE — run all fix groups (A through E) without stopping. Commit and push after each.

---

## FIX GROUP A: ROLE SELECTOR (Critical — Both Dashboards)

**Problem:** The role selector pill/dropdown visible in the compact header on both Parent and Coach home screens does not respond to taps. Users cannot switch roles without logging out.

**Diagnosis (do all of these first):**

A1. Find the role selector component:
```bash
grep -rn "role.*selector\|RoleSelector\|role.*switch\|switchRole\|setActiveRole\|roleSelect\|RolePicker\|rolePicker" --include="*.tsx" --include="*.ts" -rl
```

A2. Read the DashboardRouter to understand how roles are managed:
```bash
cat components/DashboardRouter.tsx
```

A3. Check if the role selector is wrapped in a touchable/pressable:
```bash
grep -rn "TouchableOpacity\|Pressable\|onPress" components/ParentHomeScroll.tsx components/CoachHomeScroll.tsx components/parent-scroll/ components/coach-scroll/ | grep -i role
```

A4. Check git history for how the OLD dashboards handled role switching:
```bash
git log --oneline -40
```
Find the pre-redesign commit and check the old role switching pattern.

A5. The role selector shows "Coach ∨" with a dropdown chevron. Check if:
- The onPress handler exists but calls a function that's undefined or no-op
- A modal/dropdown is supposed to open but the state isn't being toggled
- The touchable area has a z-index issue (something invisible overlapping it)
- The Animated header components might be intercepting touches

**Fix:** Make the role selector fully functional:
- Tap → dropdown/modal shows available roles for this user
- Select a role → dashboard switches immediately
- Works in BOTH the welcome section (unscrolled) AND compact header (scrolled)
- Works on BOTH Parent and Coach home screens

**Verify:**
- [ ] From Coach: tap selector → choose Parent → Parent home loads
- [ ] From Parent: tap selector → choose Coach → Coach home loads
- [ ] Can switch to Admin and Player if those roles are assigned
- [ ] Works after scrolling (compact header version)
- [ ] Works before scrolling (welcome section version)

**Commit:** `git add -A && git commit -m "Fix A: Restore role selector functionality on both dashboards" && git push`

---

## FIX GROUP B: PARENT HOME — LIMIT UPCOMING EVENTS

**Problem:** The parent home is showing a long list of upcoming events below the hero card. The parent has a calendar strip at the top that shows event dots — they don't need a list too. The hero card should show the NEXT event only.

**Fix:**

B1. Find where upcoming events are rendered on the parent home:
```bash
grep -rn "upcoming\|secondary.*event\|ALSO\|also.*week\|flatEvent\|EventList\|eventList" components/ParentHomeScroll.tsx components/parent-scroll/ --include="*.tsx" -l
```

B2. Read the component that renders the event list.

B3. Change the logic:
- The **hero event card** shows the NEXT upcoming event only (this is already correct — don't change it)
- Below the hero card, show AT MOST 1 secondary event as a single flat text line:
  ```
  Also this week: Saturday · Game vs Rangers →
  ```
  Style: `FONTS.bodyMedium`, 13px, `COLORS.textMuted`, paddingHorizontal 24, tappable
- If there are 2+ additional events beyond the hero, just show:
  ```
  +3 more events this week →
  ```
  Tapping navigates to the Schedule tab.
- If there's only the hero event and nothing else, show nothing below it.
- **Delete or hide any full event list rendering.** The calendar strip handles the "what's coming up" overview — the home screen just needs the next event prominently and a hint that more exist.

B4. Verify the calendar strip dots still correspond to actual events.

**Commit:** `git add -A && git commit -m "Fix B: Limit parent home to 1 hero event + 1 secondary line max" && git push`

---

## FIX GROUP C: COACH HOME — REDUCE WORD DENSITY (Main Design Fix)

**Problem:** The coach home reads like a text log. Every section is flat text at the same size with the same weight. There's no visual variety, no landmarks, no rhythm breaks. The information is right but the presentation needs tightening.

**Changes (go through each one):**

### C1. Recent Activity Feed — Cap at 2 items, compact format

**Current:** 5 items, each with full text line + timestamp on separate line. Reads like a changelog.

**New:** Maximum 2 items. More compact single-line format:

```
  RECENT

  🎺 Ava Test earned Hype Machine · Yesterday
  📣 Ava Test earned First Shoutout · 2d ago
                                    View all →
```

Changes:
- Badge emoji INLINE at the start of the line (not on its own)
- Achievement name in regular weight (not bold)
- Timestamp on the SAME LINE after a " · " separator, in `COLORS.textMuted`
- Max 2 items displayed. If more exist, show "View all →" in `COLORS.skyBlue` at 12px
- If only badge earnings exist (no variety), show just 1 and an ambient line instead:
  ```
  🎺 Ava Test earned Hype Machine · Yesterday
  Your team earned 5 badges this week.
  ```
- Reduce font size from whatever it is now to 13px for the activity items

### C2. Roster Alerts — Collapse to summary line

**Current:** 3 separate lightweight cards each saying "No RSVP for next event / Missed last 5 events." Repetitive.

**New:** When 2+ players have issues, collapse into a single summary line instead of individual cards:

```
  ROSTER · 12 PLAYERS

  🔴 3 players need attention →
  Chloe Test, Test Ava, Player New — No RSVP, attendance gaps
```

- First line: red dot + count + tappable arrow. `FONTS.bodySemiBold`, 15px, `COLORS.textPrimary`
- Second line: names + brief summary. `FONTS.bodyMedium`, 12px, `COLORS.textMuted`
- Tapping navigates to roster management where they can see full details per player
- If only 1 player has issues, show ONE lightweight card for that player (current behavior is fine for single players)
- If 0 players have issues, show the "All 12 confirmed and current. ✓" ambient text (this already works)

### C3. Player Development + Pending Stats — Merge into Action Items

**Current:** Two separate text blocks:
```
  PLAYER DEVELOPMENT
  10 players due for evaluation this month →

  ⚠️ 2 games need stats entered →
```

This is two sections that each say one thing. Wasteful vertical space.

**New:** Merge into a single "ACTION ITEMS" section with compact list:

```
  ACTION ITEMS

  📋 10 players due for evaluation →
  📊 2 games need stats entered →
```

- Section header: "ACTION ITEMS" in standard section header style
- Each item: emoji + short text + arrow on one line
- Font: `FONTS.bodyMedium`, 14px, `COLORS.textPrimary`
- Items have subtle separator between them (1px `COLORS.borderLight`)
- If the pending stats count is 0, that line doesn't render
- If the evaluation count is 0, that line doesn't render
- If BOTH are 0, the entire section doesn't render
- Future: other action items can be added to this section (missing waivers, incomplete registrations, etc.)

### C4. Engagement Section — Tighten the ambient messages

**Current:** Two separate ambient messages stacked:
```
  No active challenges. Your team could use one. →
  Who's been putting in work? Recognize someone. →
```

Two full sentences that both nudge the coach to do something. Together they feel naggy.

**New:** Show only ONE nudge at a time. Priority order:
1. If 0 shoutouts this week AND 0 active challenges: show the shoutout nudge only
   ```
   Who's been putting in work? Give a shoutout. →
   ```
2. If 0 active challenges but shoutouts given: show the challenge nudge only
   ```
   No active challenges running. Start one? →
   ```
3. If both exist (challenge active + shoutouts given): show neither. The coach is engaged, no nudge needed.

Keep it to ONE short sentence. Not two. The arrow makes it tappable.

### C5. Quick Actions — Add subtle visual weight

**Current:** 4 flat text rows that look identical to every other flat text row on the page.

**New:** Add lightweight visual distinction so the quick actions feel like tools, not just more text:

- Add a very subtle background fill to the quick actions area: `backgroundColor: COLORS.offWhite` with `borderRadius: 16`, `marginHorizontal: 20`, `paddingVertical: 4`
- This creates a soft container that visually groups the actions without being a heavy card
- The emoji icons should be slightly larger: 22px instead of 16px
- The action text stays `FONTS.bodySemiBold`, 15px
- Separator lines between actions stay

This gives the quick actions area a slight "panel" feel that breaks up the flat text monotony without being a card.

### C6. Season Scoreboard — Add "Last game" context line

The big 4|1 numbers are a good visual landmark. Enhance with one line of context:

```
  SEASON

        4    |    1
       wins      losses

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░
                80% win rate

  Last game: Won vs Wildcats 25-18, 25-22
```

The "Last game" line adds texture and makes the section feel more alive. Query the most recent completed game for the selected team. If no completed games exist, skip the line.

### C7. Top Performers — More visual with stat pills

**Current:** 3 text rows that look like the activity feed.

**New:** Give each performer a mini stat pill layout:

```
  TOP PERFORMERS

  ⚡ Test Ava          20 kills · 13 aces →
  🛡️ Chloe Test       15 kills · 7 aces  →
  🎯 Sarah Johnson     9 kills · 6 aces  →
```

Changes:
- Player name in `FONTS.bodySemiBold`, 14px
- Stats in `FONTS.bodyMedium`, 12px, `COLORS.textMuted` — right-aligned or after a tab
- The emoji gives each row a color anchor
- Add a subtle row background alternation: odd rows get `COLORS.offWhite`, even rows get transparent. This creates visual rhythm.

### C8. Team Pulse data rows — Add number emphasis

**Current:** "Attendance" and "100% →" at the same font weight. The label and value compete.

**New:**
- Label ("Attendance"): `FONTS.bodyMedium`, 15px, `COLORS.textPrimary`
- Value ("100%"): `FONTS.bodyBold`, 18px, `COLORS.skyBlue` (or `COLORS.success` for high values)
- Subtitle ("Average over last 3 events"): keep as-is, 12px muted
- Arrow: `COLORS.textFaint`

This makes the NUMBERS pop visually so the coach can scan: 100%... 0/12... 0. Three numbers tell the whole story without reading the labels.

### C9. Spacing adjustments

After all the above changes, do a spacing pass:
- Between the engagement nudge and Team Pulse: add 28px gap (section break)
- Between Team Pulse and Roster: add 24px gap
- Between Action Items and Recent: add 24px gap
- Between Recent and Season: add 28px gap
- The game plan card (navy card) should have 20px margin below it before quick actions
- Quick actions panel should have 16px margin below before engagement nudge
- Reduce overall paddingVertical on flat text rows from whatever they are to 12px (tighter)

**Commit:** `git add -A && git commit -m "Fix C: Coach home visual density reduction — tighter copy, merged sections, visual rhythm" && git push`

---

## FIX GROUP D: DATA SYNC — NEW EVENTS NOT SHOWING

**Problem:** Events added via the web admin portal are not appearing on the mobile parent or coach views.

**Diagnosis:**

D1. Check how events are queried on both dashboards:
```bash
grep -rn "schedule_events" hooks/useCoachHomeData.ts components/ParentHomeScroll.tsx components/parent-scroll/ --include="*.tsx" --include="*.ts"
```

D2. Check if there's a season filter that's excluding new events:
- Events might be filtered by `season_id` — if new events were added without a season association, they won't show
- Events might be filtered by `team_id` — verify the team IDs match

D3. Check the date filter:
- Events are likely filtered with `.gte('event_date', today)` — verify `today` is computed correctly (timezone issues are common)
- The date might be in UTC but events are in local time, causing events "today" to not match

D4. Check if there's a `.limit()` on the query that's too low.

D5. Add `__DEV__` logging to the event queries on both dashboards:
```typescript
if (__DEV__) console.log('[Events Query]', { teamId, today, seasonId, resultCount: events?.length })
```

**Fix:** Once you identify why new events aren't showing:
- Fix the query filter (most likely a season_id mismatch, timezone issue, or limit)
- Ensure both Parent and Coach event queries use the same correct filter
- New events added via web admin should appear on mobile after a pull-to-refresh or app reload

**Verify:**
- [ ] Events added on web admin appear on coach home (game plan card, prep checklist)
- [ ] Events added on web admin appear on parent home (hero card, calendar strip dots)
- [ ] Future events (next week, next month) are accessible via calendar strip and schedule tab

**Commit:** `git add -A && git commit -m "Fix D: Event query sync — ensure web-added events appear on mobile" && git push`

---

## FIX GROUP E: COACH HOME — TEAM PILL DISPLAY

**Problem:** Only one team pill ("Black Hornets Elite") is visible in the screenshots. The coach has 3 teams (13U, BH Stingers, Black Hornets Elite) as shown in the old dashboard's team selector.

**Diagnosis:**

E1. Check how team pills are rendered:
```bash
grep -rn "team.*pill\|TeamPill\|teamSelector\|team.*selector" components/CoachHomeScroll.tsx components/coach-scroll/ --include="*.tsx"
```

E2. Check the team loading query:
```bash
grep -rn "teams\|team_coaches\|coachTeam" hooks/useCoachHomeData.ts --include="*.ts"
```

E3. Possible issues:
- Query only returns teams for the current season (some teams might be in different seasons)
- The horizontal scroll container might not be wide enough to show all pills
- The pill rendering might work but the other 2 teams are off-screen to the left

**Fix:**
- Ensure all teams assigned to this coach are loaded and displayed as pills
- The horizontal scroll should show all pills, with the active one visible
- If 3+ teams, the pills should be scrollable horizontally
- Default to the team with the soonest upcoming event

**Verify:**
- [ ] All 3 teams show as pills (13U, BH Stingers, Black Hornets Elite)
- [ ] Tapping a different team pill switches all data below
- [ ] Active pill is visually distinct (filled vs outlined)

**Commit:** `git add -A && git commit -m "Fix E: Show all coach team pills" && git push`

---

## FINAL VERIFICATION

After all fix groups:

- [ ] Role selector works on both dashboards
- [ ] Parent home: 1 hero event + max 1 secondary line
- [ ] Coach home: less text-heavy, visual variety improved
- [ ] Coach home: action items merged, activity capped, roster collapsed
- [ ] New events from web admin appear on mobile
- [ ] All 3 coach teams show as pills
- [ ] Admin and Player dashboards unchanged
- [ ] `npx tsc --noEmit` — zero new errors

**Final commit if any cleanup:** `git add -A && git commit -m "Cross-dashboard tuning complete" && git push`
