# LYNX — Parent Home: Design Evolution (Three-Tier Visual System)
## Phase 9 — For Claude Code Execution

**Project:** volleybrain-mobile3 (React Native / Expo)  
**GitHub:** SgtxTorque/volleybrain-mobile3  
**Brand Book:** `reference/design-references/brandbook/LynxBrandBook.html`  
**Fonts:** Bebas Neue (display), Plus Jakarta Sans (body/UI)

---

## CONTEXT

The Parent Home Scroll Redesign (Phases 0-8) is complete and functional. The scroll infrastructure, data wiring, role selector, and tap targets are all in place. This phase is a **visual and emotional evolution** — we are NOT rebuilding the scroll architecture or data layer. We are reskinning and restructuring the content within the existing scroll.

**The Problem:** Everything is currently a card. White background, border radius, shadow, padding — repeated 10+ times down the scroll. It creates visual fatigue. Nothing feels special because everything has the same weight.

**The Solution:** A three-tier visual system:
- **Tier 1 — Cards:** Elevated, contained, interactive. Reserved for your most important, actionable content. Shadows, radius, clear boundaries.
- **Tier 1.5 — Lightweight Cards:** Subtle containers. No shadow or very faint shadow. Slight background fill or thin border. For data that needs spatial grouping but not full card treatment.
- **Tier 2 — Flat Content:** Text directly on the page background. Tappable but ambient. Icons, text, subtle arrows. Feels like the app talking to you, not presenting a report.
- **Tier 3 — Ambient Moments:** Personality text that comes and goes based on context. Non-interactive (or subtly tappable). The soul of the app. Appears when relevant, disappears when not.

---

## RULES (SAME AS ALWAYS)

1. **Read SCHEMA_REFERENCE.csv FIRST** before writing or modifying ANY Supabase query.
2. **Read the existing code before changing it.** This phase modifies existing components — understand them fully before touching them.
3. **Cross-reference the web admin portal** at `C:\Users\fuent\Downloads\volleybrain-admin\src\pages/` for query patterns.
4. **PARENT-ROLE ONLY.** Do NOT modify Admin, Coach, or Player.
5. **Use existing auth/permissions and navigation patterns.**
6. **Check package.json BEFORE installing anything.**
7. **Surgical changes.** You are reskinning existing components, not rebuilding them. Keep all data fetching, navigation wiring, scroll animation hooks, and reanimated infrastructure exactly as-is. Change only the JSX structure and StyleSheet.
8. **No console.log without `__DEV__` gating.**
9. **Run `npx tsc --noEmit` after every task group.**
10. **AUTONOMOUS EXECUTION MODE.** Run ALL task groups (A through F) without stopping. Commit and push after each. Do not ask questions. Make judgment calls and document in code comments.

---

## DESIGN TOKENS (Reference)

```typescript
// Colors
const COLORS = {
  navyDeep: '#0D1B3E',
  navy: '#10284C',
  skyBlue: '#4BB9EC',
  skyLight: '#6AC4EE',
  gold: '#FFD700',
  goldWarm: '#D9994A',
  white: '#FFFFFF',
  offWhite: '#F6F8FB',
  warmGray: '#F0F2F5',
  border: '#E8ECF2',
  borderLight: '#F0F2F5',
  textPrimary: '#10284C',
  textMuted: 'rgba(16,40,76,0.4)',
  textFaint: 'rgba(16,40,76,0.25)',
  textAmbient: 'rgba(16,40,76,0.35)',
  success: '#22C55E',
  error: '#EF4444',
  teal: '#14B8A6',
  amberWarm: '#F59E0B',
  amberLight: '#FEF3C7',
};

// Ambient text style (reuse everywhere for Tier 3)
const ambientText = {
  fontFamily: FONTS.bodySemiBold,  // Plus Jakarta Sans 600
  fontSize: 14,
  color: COLORS.textAmbient,
  textAlign: 'center',
  lineHeight: 22,
  paddingHorizontal: 40,
};

// Flat section style (reuse for Tier 2)
const flatSection = {
  paddingHorizontal: 24,
  paddingVertical: 14,
};

// Lightweight card style (Tier 1.5)
const lightCard = {
  backgroundColor: COLORS.offWhite,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: COLORS.borderLight,
  padding: 16,
  // NO shadow — or at most: shadowOpacity: 0.02
};

// Full card style (Tier 1) — already exists, keep as-is
const fullCard = {
  backgroundColor: COLORS.white,
  borderRadius: 18,
  padding: 18,
  shadowColor: COLORS.navy,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 3,
};
```

---

## TASK GROUP A: WELCOME SECTION → TIER 3 (Ambient)

**Current state:** Mascot + name + speech bubble card with cycling messages.  
**Target state:** Mascot + name + flat cycling text. No speech bubble card.

**Changes to make:**

A1. **Remove the speech bubble card wrapper** from the contextual messages. The message text should sit directly on the Off-White page background. Style:
```
fontSize: 17
fontFamily: FONTS.bodySemiBold (Plus Jakarta Sans 600)
color: COLORS.textPrimary
textAlign: 'center'
lineHeight: 26
paddingHorizontal: 32
marginTop: 8
```

A2. **The cycling dot indicators** stay but become more subtle — use `COLORS.textFaint` for inactive dots, `COLORS.skyBlue` for active dot. Dots should be 6px diameter, 8px gap.

A3. **Mascot animation states should influence the text color subtly:**
- Question/RSVP messages → text stays Navy (default)
- Deadline/payment messages → text shifts slightly warm: `COLORS.amberWarm` 
- Celebration messages → text gets a touch of `COLORS.skyBlue`
This is subtle — don't make it garish. Just a slight color shift to match the emotional tone.

A4. **Make the contextual messages smarter.** Read the existing message generation logic and enhance it. The messages should reference the child's ACTUAL NAME (not "Sister" if their name is something else). The messages should feel like a person wrote them, not a template:

**RSVP needed:**
- "Coach is building the roster for Saturday. Is [Child] in?"
- "[Child] hasn't been marked for Thursday's practice yet."
- "Quick RSVP check — [Child] playing this weekend?"

**Payment due:**
- "$[amount] for [season/registration] is due [date]. Tap to handle it."
- "Registration deadline is [date]. [Child]'s spot isn't locked in yet."
- "Heads up — $[amount] is due in [X] days."

**Celebration:**
- "[Child] earned [badge name] yesterday. She's been putting in work."
- "Level [X] unlocked. [Child] is in the top [X]% of the club."
- "[X]-practice streak for [Child]. Consistency shows."

**All clear:**
- "Everyone's set for the week. You're on top of it."
- "No action items right now. Enjoy the calm before game day."
- "All RSVPs confirmed, payments current. Coach's dream parent."

**Tapping a contextual message should navigate to the relevant screen:** RSVP message → event detail, payment message → payment screen, celebration → player profile/achievements. Wrap the message text in a TouchableOpacity. Add a subtle "Tap to [action]" hint below in `COLORS.textFaint` at 11px — e.g., "Tap to RSVP →" or "Tap to pay →" or "Tap to see achievements →". For all-clear messages, tapping does nothing (or just scrolls down slightly as a playful interaction).

A5. **Keep the notification bell exactly where it is.** Keep the role selector from Phase 8A exactly where it is. Only the message area changes.

**Commit:** `git add -A && git commit -m "Phase 9A: Welcome section — ambient flat messages, smarter contextual copy, tappable messages" && git push`

**Immediately proceed to Task Group B.**

---

## TASK GROUP B: NUDGE + EVENT SECTION → TIER 2 / TIER 1

**Current state:** Attention banner is a cream-colored card. Event hero is a navy card. Both are cards.  
**Target state:** Nudge becomes flat text. Event hero stays a card. Secondary events become flat.

**Changes to make:**

B1. **Attention banner → flat nudge line.** Replace the cream card + orange circle with a single tappable line:
```
  ⚠️  4 things need your attention                    →
```
Style:
```
Container: no background, no border, no shadow
  paddingHorizontal: 24
  paddingVertical: 12
  flexDirection: 'row'
  alignItems: 'center'

Warning emoji: fontSize 16

Text: 
  fontFamily: FONTS.bodySemiBold
  fontSize: 14
  color: COLORS.amberWarm  (warm amber — not red, not aggressive)
  flex: 1
  marginLeft: 8

Arrow: 
  color: COLORS.amberWarm
  fontSize: 16
```
When count is 0: this entire element renders `null`. Gone. No empty state.

Color shifts based on urgency:
- 1-2 items: `COLORS.textMuted` (subtle, not alarming)
- 3-4 items: `COLORS.amberWarm` (warm attention)  
- 5+ items: `COLORS.error` (things are stacking up)

Tapping navigates to the attention/notifications screen (keep existing navigation from Phase 8B).

B2. **Event hero card — keep as Tier 1 but polish.**
- Keep the dark navy gradient, Bebas Neue "PRACTICE", RSVP + Directions buttons
- The green pulse dot should animate (if it doesn't already): opacity loops between 0.4 and 1.0 on a 2-second cycle
- Add a subtle inner glow at the top of the card (a very faint lighter navy gradient at the top 20% of the card, creating atmospheric depth)
- Ensure the volleyball icon/silhouette in the top-right is at 15% opacity — a watermark, not a feature
- Keep all tap targets wired from Phase 8B

B3. **Secondary upcoming events → flat lines below the hero card.** If there are additional events beyond the hero event (tomorrow, this week), render them as flat text:
```
  ALSO THIS WEEK

  Sat Mar 7 · 10:00 AM                          →
  Game vs Rangers · Frisco Fieldhouse

  Thu Mar 12 · 5:30 PM                           →
  Practice · Memorial Gym
```
Style:
```
Section header "ALSO THIS WEEK":
  fontFamily: FONTS.bodyBold
  fontSize: 11
  letterSpacing: 1
  textTransform: 'uppercase'
  color: COLORS.textFaint
  marginTop: 16
  marginBottom: 8
  paddingHorizontal: 24

Each event line:
  paddingHorizontal: 24
  paddingVertical: 12
  borderBottomWidth: 1
  borderBottomColor: COLORS.borderLight

Date/time line:
  fontFamily: FONTS.bodySemiBold
  fontSize: 13
  color: COLORS.textPrimary

Detail line:
  fontFamily: FONTS.bodyMedium
  fontSize: 12
  color: COLORS.textMuted
  marginTop: 2

Arrow: color: COLORS.textFaint, aligned right
```
Tap each event → navigate to event detail screen. Pass event ID.

Query: fetch next 3-5 upcoming events for the parent's teams. The first one becomes the hero card. The rest become flat lines. If there's only one upcoming event, this "ALSO THIS WEEK" section doesn't render.

**Commit:** `git add -A && git commit -m "Phase 9B: Flat nudge line, polished event hero, flat secondary events" && git push`

**Immediately proceed to Task Group C.**

---

## TASK GROUP C: MY ATHLETES → TIER 1 / TIER 1.5 + AMBIENT MOMENTS

**Current state:** All athlete cards are full cards with equal treatment.  
**Target state:** Athletes with photos get Tier 1 cards. Athletes without photos get Tier 1.5 lightweight cards. Ambient celebration moments appear between/after cards.

**Changes to make:**

C1. **Athlete cards WITH profile photos → keep as Tier 1 cards.** These are already working well (like Ava Test in the screenshots). Polish:
- Photo should fill the left side as a rounded square (like a sports trading card thumbnail)
- Name in Plus Jakarta Sans 700, 17px
- Team · Position · #Jersey in 12px, `COLORS.textMuted`
- LVL badge stays gold pill on the right
- Keep the velocity-sensitive stat expansion if it's working. If it's not working smoothly, remove it for now and just show the compact card. Stability over features.
- Entire card tappable → player profile

C2. **Athlete cards WITHOUT profile photos → Tier 1.5 lightweight cards.** These get a lighter treatment:
```
  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
  │  🟡  Sister 2                  LVL 4  │
  │      BH Stingers                       │
  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
```
Style: `lightCard` from the design tokens above. Dashed border is illustrative — use solid but very subtle:
```
backgroundColor: COLORS.offWhite  (NOT white — slightly warm)
borderRadius: 14
borderWidth: 1
borderColor: COLORS.borderLight
padding: 14
shadowOpacity: 0  (NO shadow)
```

The **initial circle** should use the **team's primary color** if available from the database. If not available, use `COLORS.skyBlue` as default (not yellow/gold — gold is reserved for achievements). Check the teams table in SCHEMA_REFERENCE.csv for a color column.

No stat expansion on lightweight cards — keep them simple. Name, team, level. Tappable → player profile.

C3. **Ambient celebration moments after athlete cards.** After ALL athlete cards have rendered, check for recent achievements or streaks and render ONE ambient message (pick the most impressive):

```typescript
// Priority order for ambient athlete message:
// 1. Badge earned in last 48 hours
// 2. Level up in last 7 days  
// 3. Practice/attendance streak of 3+
// 4. Stat improvement (if stats exist)
// 5. Nothing notable → don't render this section at all
```

The message renders as centered Tier 3 ambient text:
```
  [Child] earned "Iron Will" yesterday.
  That badge takes real commitment.
```

Style: `ambientText` from design tokens. Add a `marginVertical: 16` to give it breathing room from the cards above and the section below.

**If the parent has multiple children and multiple have achievements**, still only show ONE message — the most recent or most impressive. Keep the scroll tight. The parent can see all achievements on each kid's profile.

**Commit:** `git add -A && git commit -m "Phase 9C: Tiered athlete cards, team-colored initials, ambient celebrations" && git push`

**Immediately proceed to Task Group D.**

---

## TASK GROUP D: QUICK GLANCE → TIER 1.5 LIGHTWEIGHT GRID + AMBIENT BALANCE

**Current state:** 2x2 metric grid with full white cards.  
**Target state:** Lightweight card grid with contextual coloring. Balance paid state becomes ambient text.

**Changes to make:**

D1. **Section header update:**
```
  QUICK GLANCE
```
Same 11px uppercase style as other section headers. Remove any "View All" link from this section — each card navigates individually.

D2. **Metric grid cards → Tier 1.5 lightweight cards.** Replace the full card styles with:
```
backgroundColor: COLORS.offWhite
borderRadius: 14
borderWidth: 1
borderColor: COLORS.borderLight
padding: 14
shadowOpacity: 0
```

Keep the 2-column grid layout. Each cell:

**Record card:**
```
  🏆
  6–1
  7 games played
```
- Trophy emoji: 20px
- Record number: Bebas Neue, 28px, `COLORS.textPrimary`
- Subtitle: Plus Jakarta Sans 500, 12px, `COLORS.textMuted`
- Tap → season record / game history screen

**Balance card (money owed):**
```
  💳
  $210
  Due Apr 12
```
- Credit card emoji: 20px
- Amount: Bebas Neue, 28px, color changes based on urgency:
  - Due in 30+ days: `COLORS.textPrimary`
  - Due in 14 days: `COLORS.amberWarm`
  - Overdue: `COLORS.error`
- Due date: Plus Jakarta Sans 500, 12px, `COLORS.textMuted`
- Tap → payment screen

**Balance card ($0 owed) → disappears, replaced by ambient:**

*Tier 3 — Ambient (replaces the balance card slot)*
```
  ✓ All payments current
```
Style: Plus Jakarta Sans 600, 13px, `COLORS.success`, centered within the card slot area. Or if we want to keep the grid symmetrical, render a lightweight card with:
```
  ✓
  Paid up
  All current
```
With the check in `COLORS.success`. Either approach works — pick whichever keeps the grid looking clean.

**Progress card:**
```
  ⭐
  Level 4
  750/800 XP
  [━━━━━━━━━━━━━━━━━━━━━░░░]
```
- Star emoji: 20px
- Level: Bebas Neue, 28px, `COLORS.textPrimary`
- XP text: Plus Jakarta Sans 500, 12px, `COLORS.textMuted`
- Progress bar: 4px height, `COLORS.skyBlue` fill, `COLORS.warmGray` track, rounded ends
- Tap → achievements / player progress screen

**Chat card:**
```
  💬
  Team Chat
  3 unread
```
- Chat emoji: 20px
- Title: Plus Jakarta Sans 700, 15px, `COLORS.textPrimary`
- Unread: Plus Jakarta Sans 500, 12px, `COLORS.skyBlue` (highlight color for actionable items)
- Tap → Chat tab (switch tab, not push screen)

D3. **Remove velocity-sensitive expansion from the metric grid.** The cards are already small and information-dense. Expansion adds complexity without value here. Keep them static and tappable. If the expansion code exists, remove it from these specific cards (keep it on athlete cards if it's working there).

**Commit:** `git add -A && git commit -m "Phase 9D: Lightweight metric grid, contextual balance coloring, static cards" && git push`

**Immediately proceed to Task Group E.**

---

## TASK GROUP E: TEAM HUB + CHAT + SEASON → TIER 2 FLAT CONTENT

**Current state:** Team Hub preview is a card. Season Snapshot is a card with large numbers.  
**Target state:** Both become flat content on the page background.

**Changes to make:**

E1. **Team Hub preview → flat social feed.** Remove the card wrapper. Content sits directly on the page background:

```
  TEAM HUB                              View All →

  ┌── avatar ──┐
  │     C      │  Coach Carlos gave Ava a 🎯
  └────────────┘  Clutch Player shoutout!
                  1d ago

                  New photos from Saturday's game
                  2d ago
```

Style:
```
Section header row:
  flexDirection: 'row'
  justifyContent: 'space-between'
  paddingHorizontal: 24
  marginBottom: 12

"TEAM HUB": standard section header style (11px uppercase, textFaint)
"View All →": fontFamily FONTS.bodySemiBold, 12px, COLORS.skyBlue, tappable

Each post:
  flexDirection: 'row'
  paddingHorizontal: 24
  paddingVertical: 10
  borderBottomWidth: 1
  borderBottomColor: COLORS.borderLight (very subtle separator)

Avatar circle: 36px, COLORS.skyBlue background, white initial text, 13px
Post text: FONTS.bodyMedium, 13px, COLORS.textPrimary, flex: 1, marginLeft: 12
Timestamp: FONTS.bodyLight, 11px, COLORS.textMuted, marginTop: 2
```

Each post tappable → Team Hub tab. "View All" → Team Hub tab.

If no recent posts: don't show this section at all. No empty state card.

E2. **Ambient community nudge (conditional).** After Team Hub, if the parent hasn't posted on the team wall in 14+ days (check SCHEMA_REFERENCE.csv for how to determine this — look for posts by this user):

*Tier 3:*
```
  The team wall's been busy this week.
  Parents who cheer online cheer louder in person. 💬
```

If the parent posted recently, or if this data isn't queryable, skip this section entirely.

E3. **Chat preview → flat.** Remove any card wrapper. Render as a flat section:

```
  TEAM CHAT                          7 unread →

  Coach Carlos: Don't forget kneepads
  tomorrow. Double session.
  4h ago
```

Style matches the Team Hub posts above. One message preview only — the latest. Tap anywhere → Chat tab.

If no unread messages, simplify to just:
```
  TEAM CHAT                               →
  All caught up
```
In `COLORS.textMuted`. Tapping still goes to Chat tab.

E4. **Season Snapshot → flat with big numbers.** Remove card wrapper. Content on page background:

```
  SEASON

        6    |    1
       wins      losses

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░
                86% win rate
  
  Last game: Won 50–12 vs Rangers
```

Style:
```
"SEASON": standard section header

Big numbers: Bebas Neue, 44px
  Wins: COLORS.success
  Divider "|": COLORS.textFaint, 32px
  Losses: COLORS.error

Labels "wins" / "losses": 
  FONTS.bodyMedium, 11px, COLORS.textMuted, uppercase

Win rate bar:
  height: 6
  borderRadius: 3
  backgroundColor: COLORS.warmGray (track)
  Filled portion: COLORS.success
  marginTop: 12

"86% win rate":
  FONTS.bodySemiBold, 12px, COLORS.textMuted, textAlign: 'center'
  marginTop: 6

"Last game" line:
  FONTS.bodyMedium, 13px, COLORS.textPrimary
  marginTop: 12
  Tappable → game detail or schedule
```

This section is informational and proud — the big numbers should feel like a scoreboard. No card needed because the numbers themselves create visual weight.

**Commit:** `git add -A && git commit -m "Phase 9E: Flat Team Hub feed, flat chat preview, flat season scoreboard" && git push`

**Immediately proceed to Task Group F.**

---

## TASK GROUP F: BADGES + CLOSING + FINAL SPACING PASS

**Changes to make:**

F1. **Badges section — keep pills, remove any card wrapper.**
```
  RECENT BADGES                      See All →

  [🎺 Hype Machine] [📣 First Shoutout] [⚔️ First Blood]
```

The badge pills themselves are fine — they give badges tactile "thing" quality. But the section should have no card container around it. Pills scroll horizontally on the page background.

Pill style:
```
backgroundColor: COLORS.white
borderRadius: 20
borderWidth: 1
borderColor: COLORS.border
paddingHorizontal: 14
paddingVertical: 8
marginRight: 10
flexDirection: 'row'
alignItems: 'center'

Emoji: fontSize 14, marginRight: 6
Text: FONTS.bodySemiBold, 12px, COLORS.textPrimary
```

Each pill tappable → trophy case / achievements screen.

"See All →" tappable → same destination.

F2. **Ambient badge proximity (conditional).** After the badges, if any child is close to earning a new badge (check achievements table — look for badges where progress is 70%+ but not yet earned):

*Tier 3:*
```
  [Child] is 2 practices away from
  earning "Iron Will" 🏅
```

If no one is close to a badge, skip this section.

F3. **End of scroll — contextual closing.**

Replace the static "That's everything for now!" with context-aware closing messages:

```typescript
// Pick ONE based on priority:
// 1. Event today → "See you at [event type] tonight at [time]. 🏐"
// 2. Event tomorrow → "[Event type] tomorrow at [time]. Get some rest."
// 3. Event this week → "Next up: [day]'s [event type]. [Child] is ready."
// 4. Nothing this week → "Quiet week ahead. Enjoy the downtime."
// 5. End of season → "What a season. Awards night is [date]."
// 6. Fallback → "That's everything for now. Go be great."
```

Style:
```
Container:
  alignItems: 'center'
  paddingTop: 24
  paddingBottom: 140  (generous — clears bottom nav completely)

Mascot: 🐱 at 40px, opacity: 0.3

Message:
  fontFamily: FONTS.bodyMedium
  fontSize: 14
  color: COLORS.textFaint
  textAlign: 'center'
  marginTop: 8
  paddingHorizontal: 40
```

F4. **FINAL SPACING PASS — critical.** Go through the entire scroll and verify the rhythm between sections. The spacing should create a breathing pattern:

```
Greeting (Tier 3)
  ↕ 4px  (tight — nudge is related)
Nudge (Tier 2) — or gone if no items
  ↕ 16px
Event Hero (Tier 1)
  ↕ 8px
Secondary Events (Tier 2) — or gone if none
  ↕ 20px  (section break)
MY ATHLETES header
  ↕ 10px
Athlete cards (Tier 1 / 1.5)
  ↕ 10px between cards
  ↕ 12px after last card
Ambient celebration (Tier 3) — or gone
  ↕ 24px  (breathing room before data)
QUICK GLANCE header
  ↕ 10px
Metric grid (Tier 1.5)
  ↕ 24px (section break)
TEAM HUB header
  ↕ 8px
Team Hub posts (Tier 2)
  ↕ 12px
Community nudge (Tier 3) — or gone
  ↕ 20px
TEAM CHAT header
  ↕ 8px
Chat preview (Tier 2)
  ↕ 24px
SEASON header
  ↕ 12px
Season numbers (Tier 2)
  ↕ 24px
RECENT BADGES header
  ↕ 10px
Badge pills (Tier 2)
  ↕ 12px
Badge proximity (Tier 3) — or gone
  ↕ 24px
Closing mascot + message (Tier 3)
  ↕ 140px bottom padding
```

The pattern is: **small gaps within sections, medium gaps between related sections, large gaps between major topic changes.** The ambient moments (Tier 3) create natural pauses — like paragraph breaks in a letter.

F5. **Ensure all section headers are consistent.** Every section header should use the exact same style:
```
fontFamily: FONTS.bodyBold
fontSize: 11
letterSpacing: 1.1
textTransform: 'uppercase'
color: COLORS.textFaint
paddingHorizontal: 24
```

Inconsistent headers will make the scroll feel disorganized. Audit every one.

F6. **Scrollbar.** Hide the scrollbar indicator for a cleaner look:
```
showsVerticalScrollIndicator={false}
```

**Commit:** `git add -A && git commit -m "Phase 9F: Badges, contextual closing, spacing rhythm, header consistency" && git push`

---

## VERIFICATION CHECKLIST

After all task groups, verify:

**Tier System:**
- [ ] Welcome message is flat text, no speech bubble card
- [ ] Nudge is a single tappable line, no card
- [ ] Event hero is the ONLY full card above the athlete section
- [ ] Athlete cards with photos: full card treatment
- [ ] Athlete cards without photos: lightweight card (subtle bg, no shadow)
- [ ] Initial circles use team color, not yellow
- [ ] Metric grid uses lightweight cards
- [ ] Team Hub is flat feed, no card wrapper
- [ ] Chat preview is flat, no card wrapper
- [ ] Season is flat with big Bebas Neue numbers
- [ ] Badge pills have no card wrapper around the section

**Ambient Moments (Tier 3):**
- [ ] Contextual messages are dynamic (not hardcoded)
- [ ] Messages reference child's actual name
- [ ] Tapping a message navigates to relevant screen
- [ ] Celebration ambient appears when kid has recent achievement
- [ ] Balance paid ambient appears when $0 owed
- [ ] Community nudge appears conditionally
- [ ] Badge proximity appears conditionally
- [ ] Closing message is context-aware (references today's event, etc.)
- [ ] Ambient sections DISAPPEAR when not relevant (no empty states)

**Spacing & Consistency:**
- [ ] All section headers identical style
- [ ] Breathing room between sections feels intentional
- [ ] No two cards right next to each other without a gap
- [ ] Scroll indicator hidden
- [ ] Bottom padding clears nav bar fully

**Everything Still Works:**
- [ ] All tap targets from Phase 8B still functional
- [ ] Role selector still works
- [ ] All data still loading correctly
- [ ] Admin/Coach/Player dashboards unchanged
- [ ] `npx tsc --noEmit` — zero new errors

**Final commit:** `git add -A && git commit -m "Phase 9: Design evolution complete — three-tier visual system" && git push`

---

## WHAT'S NEXT (Not for CC — for reference only)

After Phase 9 is stable and tested:
- Phase 10: Coach dashboard redesign using the same three-tier system
- Phase 11: Player dashboard redesign (heavier on Tier 3 ambient — kids love personality)
- Phase 12: Admin dashboard redesign
- Future: Real Lynx cub mascot illustrations to replace 🐱 emoji

---

*This spec transforms the Parent Home from an information dashboard into a conversation. Cards for action, flat for information, ambient for personality. The scroll should feel like opening a note from someone who knows your family and cares about your kid's season.*
