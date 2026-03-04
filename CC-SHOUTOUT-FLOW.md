# LYNX — Shoutout Flow Build
## For Claude Code Execution

**Project:** volleybrain-mobile3 (React Native / Expo)
**Backend:** Supabase (project: uqpjvbiuokwpldjvxiby)
**Web Reference:** `C:\Users\fuent\Downloads\volleybrain-admin\src\`

---

## CONTEXT

The shoutout system is the core engagement loop: coaches recognize players → players see recognition → parents see their kid got noticed → XP is awarded → achievements unlock. The web admin has a complete implementation. The mobile app has the UI components built (GiveShoutoutModal, ShoutoutCard, ShoutoutProfileSection) but they're not wired to data or triggered from anywhere. Multiple stubs on coach home ("Give a Shoutout", EngagementSection) and player home (QuickPropsRow, TheDrop) are waiting for this.

**Tables involved (verify all against SCHEMA_REFERENCE.csv):**
- `shoutouts` — the main record (giver, receiver, category, message, team, org)
- `shoutout_categories` — predefined categories (MVP, Hustle, Team Player, etc.)
- `team_posts` — shoutouts create a post of type "shoutout" on the team wall
- `xp_ledger` — XP entries for giver (+10) and receiver (+15)
- `profiles` — total_xp and player_level get updated
- `team_players` — for loading recipients (players on a team)
- `team_coaches` — for loading recipients (coaches on a team)
- `player_achievements` — checked after shoutout for badge unlocks
- `player_achievement_progress` — progress tracking updated

---

## RULES (READ FIRST)

1. **Read SCHEMA_REFERENCE.csv FIRST.** Verify EVERY table and column name listed above exists. If any are missing, STOP and report which tables/columns don't exist — do NOT create tables, do NOT guess column names.

2. **Read the web admin implementation FIRST — these are your primary references:**
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\lib\shoutout-service.js` — the complete shoutout service (create shoutout, award XP, check achievements)
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\lib\engagement-constants.js` — XP values and level thresholds
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\components\engagement\GiveShoutoutModal.jsx` — the desktop modal (3-step flow: pick recipient → pick category → write message → send)
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\components\engagement\ShoutoutCard.jsx` — how shoutouts display

3. **Read the mobile components that already exist:**
   - `components/GiveShoutoutModal.tsx` — the mobile modal (may be complete or partial)
   - `components/ShoutoutCard.tsx` — mobile display card
   - `components/ShoutoutProfileSection.tsx` — profile section for shoutout stats
   - `lib/shoutout-service.ts` — mobile shoutout service (may exist, may be partial)
   - `lib/engagement-constants.ts` — mobile engagement constants
   - `lib/engagement-events.ts` — mobile engagement event types

4. **Use existing mobile code FIRST.** If the mobile versions of these files are complete and match the web, use them as-is. Only port from web if the mobile versions are stubs or missing.

5. **After each phase, run `npx tsc --noEmit`** — zero new errors.
6. **Commit AND push after each phase.**
7. **Test all four roles after each phase.**
8. **No console.log without `__DEV__` gating.**

---

## PHASE 1: VERIFY DATA LAYER

### Step 1A: Schema verification

Read `SCHEMA_REFERENCE.csv`. Verify these tables exist with these columns:

**`shoutouts` table:**
- id, giver_id, giver_role, receiver_id, receiver_role, team_id, organization_id
- category_id, category (text), message
- show_on_team_wall, post_id
- created_at

**`shoutout_categories` table:**
- id, name, emoji, color, description
- is_default, is_active, organization_id

**`xp_ledger` table:**
- id, player_id, organization_id, xp_amount
- source_type, source_id, description, created_at

**`team_posts` table:**
- id, team_id, author_id, post_type, title, content
- is_pinned, is_published, created_at

**`profiles` table:**
- id, total_xp, player_level

If ANY table or column is MISSING:
- Report exactly what's missing
- Do NOT create tables or columns
- STOP this phase and wait for instructions

If ALL tables exist, proceed to Step 1B.

### Step 1B: Read existing mobile shoutout service

Read `lib/shoutout-service.ts` (if it exists). Compare to the web version at `C:\Users\fuent\Downloads\volleybrain-admin\src\lib\shoutout-service.js`.

Does the mobile version have:
- `giveShoutout()` function? (creates team_post + shoutout record + XP + achievement check)
- `fetchShoutoutCategories()` function?
- `fetchShoutoutStats()` function?

If complete → use as-is.
If partial → complete it by porting the missing functions from the web version.
If missing → create it by porting from the web version, adapting imports for mobile (`../lib/supabase` → correct mobile path).

### Step 1C: Read existing mobile engagement constants

Read `lib/engagement-constants.ts` (if it exists). Verify it has:
- `XP_LEVELS` array (20 levels)
- `XP_BY_SOURCE` object with `shoutout_given: 10` and `shoutout_received: 15`
- `getLevelFromXP()` function

If missing or incomplete, port from web: `C:\Users\fuent\Downloads\volleybrain-admin\src\lib\engagement-constants.js`

**Verification:** All tables exist in schema, shoutout service is complete, engagement constants are complete.

**Commit:** `git add -A && git commit -m "Shoutout Phase 1: Verify and complete data layer (service + constants)" && git push`

---

## PHASE 2: WIRE GIVESHOUTOUTMODAL

### Step 2A: Read the existing mobile modal

Read `components/GiveShoutoutModal.tsx` entirely. Understand:
- What props it expects
- What steps/flow it implements
- Whether it calls `giveShoutout()` from the service
- Whether it loads categories from `fetchShoutoutCategories()`
- Whether it loads team members

Compare to the web version at `C:\Users\fuent\Downloads\volleybrain-admin\src\components\engagement\GiveShoutoutModal.jsx`.

### Step 2B: Complete the modal if needed

The modal should have a 3-step flow:

**Step 1 — Pick Recipient:**
- Load team members (players + coaches) from `team_players` and `team_coaches`
- Search bar to filter
- List with photo, name, role badge
- Tapping a member → next step

**Step 2 — Pick Category:**
- Load categories from `fetchShoutoutCategories(organizationId)`
- Grid of category cards: emoji + name + color
- Categories like: MVP ⭐, Hustle 🔥, Team Player 🤝, Most Improved 📈, Leadership 👑, Sportsmanship 🏅
- Tapping a category → next step

**Step 3 — Message + Send:**
- Show selected recipient and category at top
- Optional message text input
- "Send Shoutout" button
- Calls `giveShoutout()` from the service
- On success: close modal, show success toast/animation, call onSuccess callback

If the mobile modal is already complete and functional → no changes needed, skip to Step 2C.
If it's a stub → complete it following the web pattern.

### Step 2C: Wire from Coach Home — EngagementSection

Read `components/coach-scroll/EngagementSection.tsx`. It's currently a stub that shows "Coming Soon" when the shoutout nudge is tapped.

Replace the Alert.alert with opening the GiveShoutoutModal:
- The coach home needs to manage modal state: `const [showShoutout, setShowShoutout] = useState(false)`
- Pass the state and setter down to EngagementSection, OR manage it in CoachHomeScroll and pass the trigger down

Read `components/CoachHomeScroll.tsx`:
1. Import GiveShoutoutModal
2. Add state: `showShoutoutModal` / `setShowShoutoutModal`
3. Also add: `shoutoutRecipient` state (for pre-selecting a player)
4. Pass `onGiveShoutout={() => setShowShoutoutModal(true)}` to EngagementSection
5. Render the modal:
```tsx
<GiveShoutoutModal
  visible={showShoutoutModal}
  teamId={selectedTeamId}
  onClose={() => { setShowShoutoutModal(false); setShoutoutRecipient(null); }}
  onSuccess={() => {
    setShowShoutoutModal(false);
    setShoutoutRecipient(null);
    // Optionally refresh data
  }}
  preselectedRecipient={shoutoutRecipient}
/>
```

### Step 2D: Wire from Coach Home — QuickActions "Give a Shoutout"

Read `components/coach-scroll/QuickActions.tsx`. The "Give a Shoutout" action is currently a stub.

Replace with: call the same `onGiveShoutout` callback passed from CoachHomeScroll.

### Step 2E: Wire from Coach Home — QuickActions "Create a Challenge"

Leave as stub for now. The challenge system needs DB tables. Just change the alert message to be honest: `Alert.alert("Challenges", "The challenge system is coming in the next update.")`

### Step 2F: Wire from Player Home — QuickPropsRow

Read `components/player-scroll/QuickPropsRow.tsx`. Currently shows "Coming Soon" alert.

Read `components/PlayerHomeScroll.tsx`:
1. Import GiveShoutoutModal
2. Add state: `showShoutoutModal` / `setShowShoutoutModal`
3. Pass `onGiveShoutout={() => setShowShoutoutModal(true)}` to QuickPropsRow
4. Render the modal with the player's team ID

Players can give shoutouts to teammates too — that's the "props" concept. They pick a teammate and a category.

**Verification:**
- Coach home: "Give a Shoutout" (QuickActions) opens the modal → pick player → pick category → send → success
- Coach home: EngagementSection shoutout nudge opens the modal
- Player home: QuickPropsRow "Give props" opens the modal
- Shoutout creates a record in `shoutouts` table
- Shoutout creates a `team_posts` record of type "shoutout"
- XP is awarded to giver and receiver
- All four roles still boot
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Shoutout Phase 2: Wire GiveShoutoutModal to coach + player homes" && git push`

---

## PHASE 3: DISPLAY SHOUTOUTS

### Step 3A: Wire ShoutoutCard into Team Wall

Read `components/ShoutoutCard.tsx`. This should render a shoutout post with:
- Giver name + photo
- Category emoji + name (colored)
- Receiver name + photo
- Optional message
- Timestamp

Read `app/team-wall.tsx` and `components/TeamWall.tsx`. The team wall fetches `team_posts` — shoutout posts (post_type === 'shoutout') should render using ShoutoutCard instead of a regular post card.

Check if the team wall already handles `post_type === 'shoutout'`:
- If yes → verify it renders ShoutoutCard correctly
- If no → add a conditional: when rendering posts, if `post.post_type === 'shoutout'`, render `<ShoutoutCard>` instead of the default post component. Parse the metadata from `post.title` (which contains the JSON metadata) to get receiver info, category, etc.

### Step 3B: Wire shoutouts into Player Home — TheDrop

Read `components/player-scroll/TheDrop.tsx`. This shows "Since you were last here" items — badges and stats from the last 7 days.

Add recent shoutouts RECEIVED by this player to TheDrop:
- Query: `shoutouts` where `receiver_id = playerId` and `created_at > 7 days ago`
- Join with `shoutout_categories` for emoji/color
- Display format: "🔥 Coach gave you a Hustle shoutout!" or "⭐ [name] gave you props: MVP"

Read `hooks/usePlayerHomeData.ts` to see if it already fetches shoutout data. If not, add a query for recent shoutouts received.

### Step 3C: Wire ShoutoutProfileSection into player profile

Read `components/ShoutoutProfileSection.tsx`. This shows a player's shoutout stats (total received, total given, category breakdown).

Read `app/my-stats.tsx` or `app/child-detail.tsx` (the player profile screens). Add `ShoutoutProfileSection` to the appropriate profile screen:
- Shows: "12 shoutouts received, 5 given"
- Category breakdown: "MVP ⭐ x4, Hustle 🔥 x3, Team Player 🤝 x5"

Use `fetchShoutoutStats(profileId)` from the shoutout service.

### Step 3D: Wire shoutouts into Parent Home — AmbientCelebration

Read `components/parent-scroll/AmbientCelebration.tsx`. Currently shows recent badge earned.

Extend it to also show recent shoutouts their child received:
- "🔥 [Child] got a Hustle shoutout from Coach!"
- Alternate between badge celebrations and shoutout celebrations
- Priority: most recent first

Read `hooks/useParentHomeData.ts` to see if it fetches child shoutout data. If not, add a query.

**Verification:**
- Team wall: shoutout posts render with ShoutoutCard (category emoji, names, message)
- Player home TheDrop: recent shoutouts received show in the "since you were last here" section
- Player profile/stats: ShoutoutProfileSection shows shoutout stats
- Parent home: AmbientCelebration can show child's recent shoutouts
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Shoutout Phase 3: Display shoutouts in team wall, player home, parent home, profiles" && git push`

---

## PHASE 4: COACH HOME SHOUTOUT NUDGE INTELLIGENCE

### Step 4A: Make EngagementSection smart

Read `components/coach-scroll/EngagementSection.tsx`. Currently it's a generic "give a shoutout" nudge.

Make it contextual — it should suggest a SPECIFIC player to shout out based on recent performance:
1. Read `hooks/useCoachHomeData.ts` — does it already identify standout performers?
2. If not, add a lightweight query: from `game_stats` for the most recent game, find the player with the most kills/aces/digs and suggest them:
   - "🔥 [Player Name] had 8 kills last game — give them a shoutout?"
   - Show the player's photo and a "Shout Out" button
3. When the button is tapped, open GiveShoutoutModal with `preselectedRecipient` set to that player
4. If no recent game data → fall back to generic "Recognize a player on your team"

### Step 4B: Post-game shoutout prompt

Read `components/GameCompletionWizard.tsx`. After a coach completes a game (enters scores), this wizard runs.

Add an optional final step or modal after game completion:
- "Game complete! Want to shout out a standout player?"
- Show top 3 stat performers from the game just completed
- One-tap to open GiveShoutoutModal with that player preselected
- "Skip" to dismiss

This creates a natural moment for coaches to give shoutouts — right after the game when performance is fresh.

**Verification:**
- Coach home: EngagementSection shows a specific player suggestion based on recent stats
- Game completion: after finishing a game, coach is prompted to shout out a standout player
- All four roles still work
- `npx tsc --noEmit` — zero new errors

**Commit:** `git add -A && git commit -m "Shoutout Phase 4: Smart shoutout nudges + post-game prompt" && git push`

---

## PHASE 5: VERIFICATION + EDGE CASES

### Step 5A: Test the full loop

Walk through the entire flow:
1. Coach opens home → sees shoutout nudge with player suggestion
2. Coach taps "Give a Shoutout" → modal opens → picks recipient → picks category → adds message → sends
3. Verify in Supabase: `shoutouts` row created, `team_posts` row created (type: shoutout), `xp_ledger` has 2 entries (+10 giver, +15 receiver)
4. Player opens home → TheDrop shows the shoutout they received
5. Team wall → shoutout post visible with ShoutoutCard rendering
6. Player profile → ShoutoutProfileSection shows updated count
7. Parent home → AmbientCelebration shows child's shoutout

### Step 5B: Edge cases

Handle these:
- **No team selected (coach with multiple teams):** Modal should show team picker first, or use the currently selected team from CoachHomeScroll's team selector pills
- **Player gives shoutout to self:** Prevent — filter out the current user from the recipient list
- **Empty categories:** If `shoutout_categories` table is empty (no default categories seeded), show a fallback set of hardcoded defaults OR show a message "Shoutout categories haven't been set up yet"
- **No team members:** If team roster is empty, show "No teammates to shout out yet"
- **Offline/error:** If the insert fails, show a toast error and don't close the modal

### Step 5C: Report

List:
1. Every file modified (with what changed)
2. Whether all shoutout-related tables existed in schema
3. Whether the mobile shoutout service was complete or needed porting
4. Whether the mobile GiveShoutoutModal was complete or needed completion
5. Any remaining stubs or limitations
6. TSC result

**Commit:** `git add -A && git commit -m "Shoutout Phase 5: Edge cases + full loop verification" && git push`

---

## EXECUTION ORDER

```
Phase 1: Verify data layer (schema + service + constants)
Phase 2: Wire GiveShoutoutModal to coach + player homes
Phase 3: Display shoutouts (team wall, TheDrop, profiles, parent home)
Phase 4: Smart nudges + post-game prompt
Phase 5: Verification + edge cases
```

Execute all phases autonomously. Do not stop between phases. Commit after each phase.

**CRITICAL:** If Phase 1 discovers missing tables, STOP and report. Do not proceed to Phase 2 without confirmed schema.

---

*Reference: Web admin shoutout-service.js for exact query patterns. engagement-constants.js for XP values. GiveShoutoutModal.jsx for UI flow.*
