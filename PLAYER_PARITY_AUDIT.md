# Player Experience Parity Audit: Web Reference vs Expo App

## Design Philosophy

> "ESPN meets video game progression" — the player is the HERO. Every screen should feel like opening a player card in a video game: animated, exciting, personal. Stats are power bars, achievements are trophies, games are battles. Dark aesthetic with neon glows, team-colored accents, hexagonal badges, and cinematic hero sections. This is THE MOST IMPORTANT EXPERIENCE IN THE APP.

The player journey: **join team** → **see my stats** → **track achievements** → **check schedule** → **play games** → **review performance** → **climb leaderboards** → **earn more badges** → **repeat**.

---

## PHASE 1: Web Reference Player Experience Inventory

### A. Player-Facing Pages (reference/web-admin/src/pages/)

| Feature | Web File Path | Lines | Description |
|---------|---------------|-------|-------------|
| **Player Dashboard** | `roles/PlayerDashboard.jsx` | 1,314 | Cinematic hero section (photo, name, level badge, OVR diamond, position, team), XP progress bar with level tracking, hex badges (Games/Trophies/Points), STAT HUD (6 power bars with per-game averages + rank badges), Hit%/Serve%/Games cards, Trophy Case (horizontal scroll, rarity glow), Upcoming Battles (countdown timer), Battle Log (recent game K/A/D/B), Squad Comms feed, Quick Actions grid. Admin preview mode with player selector. |
| **Achievements Catalog** | `achievements/AchievementsCatalogPage.jsx` | 486 | Category filter pills (Offensive/Defensive/Playmaker/Heart/Elite), type filter (Badges/Emblems/Calling Cards), search bar, achievement grid with rarity-based glow, earned/in-progress/locked status, track/untrack toggle, progress bars from live stats, detail modal with threshold visualization, stats summary header (Earned/In Progress/Total) |
| **Season Leaderboards** | `leaderboards/SeasonLeaderboardsPage.jsx` | 649 | 8 stat categories (Points/Aces/Kills/Blocks/Digs/Assists/Hit%/Serve%), grid & full-list views, team filter, medal badges (gold/silver/bronze), per-game averages, Season MVP highlights (most points/aces/kills), minimum sample filtering for percentages, player photos |
| **Player Card (Parent View)** | `parent/ParentPlayerCardPage.jsx` | 736 | Multi-sport display config (volleyball/basketball/soccer/baseball/football/hockey), sport-specific position definitions with colors (OH=orange, S=teal, MB=blue, etc.), primary stats grid per sport, skill definitions (6 volleyball skills), detail sections (Attacking/Passing/Defense), trend tracking over games |
| **Team Wall** | `teams/TeamWallPage.jsx` | 1,413 | Team post feed, countdown to next game, photo upload, like/cheer reactions, roster section, schedule preview, achievement display, announcements |
| **Team Standings** | `standings/TeamStandingsPage.jsx` | 556 | W-L-T record, win percentage, current streak counter, point differential, recent games with result badges |
| **Chat** | `chats/ChatsPage.jsx` | 1,562 | Channel list, real-time messages, message search, threads/reply-to, emoji reactions (8 types), GIF support, image attachments, read receipts, typing indicator |
| **Schedule** | `schedule/SchedulePage.jsx` | 4,203 | Month/week/list views, filters, RSVP management, event details, game day share |

### B. Player-Specific Components (Web)

| Component | Purpose |
|-----------|---------|
| `PlayerCardExpanded` | Full player drill-down: photo upload, OVR badge, earned badges + award new, Stats/Skills/Info tabs, emergency contacts |
| Stat HUD Power Bars | Animated bars with rank badges showing player's league ranking per stat |
| Trophy Case | Horizontal scroll with rarity glow (Legendary=gold, Epic=purple, Rare=blue, Common=grey) |
| XP/Level System | `level = floor((games_played*10 + total_points) / 100) + 1`, visible progress bar |
| OVR Diamond | `50 + (kills*0.3) + (aces*0.5) + (blocks*0.3) + (digs*0.2) + (assists*0.2)`, capped at 99 |
| Squad Comms | Aggregated timeline of achievements, game results, and upcoming events |

### C. Key Data Tables (Player-Specific)

| Table | Player Reads | Player Writes | Purpose |
|-------|-------------|---------------|---------|
| `players` | profile, jersey, position, photo | — | Core player record |
| `team_players` | team assignment, jersey_number | — | Team membership |
| `player_season_stats` | all aggregated stats | — | Season stat display |
| `game_player_stats` | per-game stats | — | Game-by-game history |
| `player_achievements` | earned achievements | — | Trophy case |
| `player_achievement_progress` | current progress values | — | Progress tracking |
| `player_tracked_achievements` | tracked achievements | insert/delete | Track/untrack |
| `player_badges` | coach-awarded badges | — | Recognition badges |
| `player_skills` | skill ratings (6 categories) | — | Skill spider chart |
| `player_skill_ratings` | detailed coach ratings | — | Detailed evaluation |
| `player_positions` | position assignments | — | Multi-position support |
| `player_goals` | goal tracking | — | Goal progress |
| `player_highlights` | video highlights | — | Highlight reel |
| `achievements` | achievement catalog | — | All available badges |
| `schedule_events` | upcoming games/practices | — | Schedule display |
| `event_rsvps` | RSVP status | insert/update | RSVP response |
| `game_lineups` | lineup positions | — | View lineup |
| `game_results` | game outcomes, MVP | — | Game recap |
| `team_standings` | W/L/win% | — | Standings |
| `team_posts` | team wall feed | — | Social content (read-only) |
| `team_post_reactions` | reactions | insert/delete | React to posts |

---

## PHASE 2: Expo App Player Experience Inventory

### A. Tab Navigation (Player View)

| Tab | File | Lines | Status | Purpose |
|-----|------|-------|--------|---------|
| Home | `(tabs)/index.tsx` → `DashboardRouter` → `PlayerDashboard` | 1,532 | Working | Hero profile, OVR/level/XP, stat HUD (6 stats), trophy case, battle log, upcoming battles, quick actions |
| Game Day | `(tabs)/gameday.tsx` | 1,312 | Working | Next game hero with countdown, this week events, season overview, season progress bar, upcoming 30-day events |
| Team | `(tabs)/connect.tsx` → `TeamWall` | 2,114 | Working | Team post feed, roster tab, schedule tab, reactions, compose (coach-only) |
| Manage | `(tabs)/manage.tsx` | 250 | Working | Player menu: My Stats, My Teams, My Achievements |
| Me | `(tabs)/me.tsx` | 502 | Working | Profile hero, dark mode toggle, accent color, personal settings |

### B. Full-Page Routes (Player-Accessible)

| Route | File | Lines | Status | Purpose |
|-------|------|-------|--------|---------|
| `/achievements` | `achievements.tsx` | 1,325 | Working | Badge grid (3-col), category filter tabs (5 categories), rarity system with glow, progress bars, detail modal with league-wide stats, "next to earn" |
| `/standings` | `standings.tsx` | 1,005 | Working | Two tabs: Team Standings (W/L/Win%/PF/PA/Diff with medals) and Player Leaderboards (5 stat categories with animated bars) |
| `/game-results` | `game-results.tsx` | 736 | Parent-Only | Game recap with hero score card, set breakdown, child stat grid. **Not accessible to players directly.** |
| `/game-prep` | `game-prep.tsx` | 1,666 | Coach-Only | Game list visible to players but all actions coach-gated |
| `/(tabs)/schedule` | `schedule.tsx` | 1,056 | Working | List/week/month views, filter bar, event detail modal |
| `/(tabs)/my-teams` | `my-teams.tsx` | ~496 | Working | Team list with team cards |
| `/profile` | `profile.tsx` | ~495 | Working | Profile editor, emergency contacts |

### C. Key Components (Player-Relevant)

| Component | File | Lines | Status | Purpose |
|-----------|------|-------|--------|---------|
| `PlayerDashboard` | `components/PlayerDashboard.tsx` | 1,532 | Working | Main player home: hero (photo/initials, jersey, position, team), OVR rating (ROOKIE/RISING/ELITE tiers), Level + XP bar, mini counters (Games/Trophies/Points), Stat HUD (6 stats with per-game averages), Hit%/Serve%/Games cards, Trophy Case (horizontal scroll with earned dates), Battle Log (recent game results), Upcoming Battles (next 3 games with countdown), Quick Actions (Team Hub/Leaderboards/Trophies/Schedule) |
| `DashboardRouter` | `components/DashboardRouter.tsx` | 194 | Working | Routes to PlayerDashboard when user is player role (checks team_staff → coaches → players → player_guardians) |
| `PlayerCardExpanded` | `components/PlayerCardExpanded.tsx` | 591 | Working | Full player modal: photo upload, OVR badge, earned badges, Stats/Skills/Info tabs. Used by coaches to view players. |
| `TeamWall` | `components/TeamWall.tsx` | 2,114 | Working | Full social feed with real-time subscription, reactions, roster/schedule tabs. Players can react but not compose posts. |

### D. Context/Hooks (Player-Relevant)

| Hook/Context | File | Purpose |
|-------------|------|---------|
| `usePermissions()` | `lib/permissions-context.tsx` | Role detection: `isPlayer`, `actualRoles`, `primaryRole` |
| `useAuth()` | `lib/auth.tsx` | User, profile, organization, season |
| `useSeason()` | `lib/season.tsx` | Active season context |
| `useTheme()` | `lib/theme.tsx` | Colors, dark mode, accent |

---

## PHASE 3: Complete Parity Matrix

### Legend
- **FULL**: Feature exists and matches web functionality
- **PARTIAL**: Feature exists but is missing key capabilities
- **STUB**: Route/screen exists but is incomplete or buggy
- **MISSING**: No equivalent in mobile app
- **N/A**: Not applicable to mobile platform

### A. Dashboard & Hero Identity

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Cinematic hero section | Large photo, name, level, OVR diamond, team badge | Photo/initials, jersey, position, team, OVR | FULL | Mobile mirrors web hero layout |
| OVR rating diamond | Yes (50 + weighted stats, capped 99) | Yes (same formula) | FULL | |
| Level & XP progress bar | Yes (games*10 + points) / 100 | Yes (same formula) | FULL | |
| Tier labels (ROOKIE/RISING/ELITE) | Yes | Yes | FULL | |
| Hex badges (Games/Trophies/Points) | Yes (hexagonal shape) | Yes (mini counters) | PARTIAL | Mobile uses simple counters, not hex badges |
| Stat HUD (6 power bars) | Animated bars with rank badges + per-game avg | Stat cards with per-game averages | PARTIAL | Mobile shows stats as cards, not animated power bars. **No rank badges** showing player's league ranking. |
| Hit%/Serve%/Games cards | Yes (3 cards below HUD) | Yes (3 cards below stats) | FULL | |
| Admin preview mode | Player selector dropdown for admins | Not present | MISSING | Admins can't preview a player's dashboard on mobile |
| Squad Comms feed | Aggregated timeline (achievements + games + events) | Not present | MISSING | No aggregated activity feed on dashboard |
| Recent form (W/L dots) | Not explicit on player dash | Not present | MISSING | |

### B. Trophy Case & Achievements

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Trophy case on dashboard | Horizontal scroll with rarity glow | Horizontal scroll with earned dates | PARTIAL | Mobile lacks rarity-based glow effects (legendary=gold, epic=purple) |
| Achievement catalog page | Category filter, search, type filter, track/untrack | Category filter, detail modal, progress bars | PARTIAL | Mobile missing: **search**, **type filter** (Badges/Emblems/Calling Cards), **track/untrack** |
| Achievement tracking | Track up to 3 achievements for progress monitoring | Not present | MISSING | `player_tracked_achievements` table exists but mobile doesn't use it |
| Progress from live stats | Calculates current vs threshold from player_season_stats | Yes (calculates in detail modal) | FULL | |
| Rarity-based display | Legendary/Epic/Rare/Uncommon/Common with glow | Rarity dot indicator | PARTIAL | Mobile shows dot, web shows full glow effect |
| Achievement unlock notifications | Not confirmed | Not present | MISSING | No toast/modal when achievement unlocked during game |
| Achievement sharing | Not confirmed | Not present | MISSING | Can't share achievements to social media |
| Earned count (league-wide) | Not confirmed | Yes (detail modal shows how many earned it) | FULL | |
| Calling Cards system | Yes (equipped_calling_card_id on players table) | Not present | MISSING | DB column exists but no mobile UI |

### C. Stats & Leaderboards

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Team standings (W/L/Win%) | Yes | Yes (Tab 1 of standings) | FULL | |
| Point differential | Yes | Yes (PF/PA/Diff columns) | FULL | |
| Current streak counter | Yes | Not present | MISSING | |
| Player leaderboards | 8 categories (Points/Aces/Kills/Blocks/Digs/Assists/Hit%/Serve%) | 5 categories (Kills/Aces/Digs/Blocks/Assists) | PARTIAL | Mobile missing: **Points**, **Hit%**, **Serve%** categories |
| Grid vs full-list toggle | Yes | Not present (list only) | MISSING | |
| Medal badges (top 3) | Gold/silver/bronze icons | Trophy/medal icons + colored border | FULL | |
| Per-game average toggle | Yes | Not present (totals only) | MISSING | |
| Season MVP highlights | Most points, most aces, most kills | Not present | MISSING | |
| Team filter on leaderboards | Dropdown | Not present | MISSING | Can't filter leaderboard by team |
| Player photos on leaderboard | Yes | Jersey number/initial only | PARTIAL | |
| Individual player stats page | Dedicated page with Serving + Attacking sections, game-by-game history | Not present | MISSING | No `/player-stats` route; stats only visible on dashboard and leaderboards |
| Game-by-game stat history | Full table | Not present | MISSING | |
| Stat comparison to averages | Not confirmed | Not present | MISSING | |

### D. Schedule & Game Day

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Schedule calendar (month/week/list) | Yes | Yes (all 3 views) | FULL | |
| Next game hero card | Countdown timer | Countdown (TODAY/TOMORROW/IN X DAYS) | FULL | |
| Event type icons | Not explicit | Yes (Game/Practice/Event/Tournament with colors) | FULL | Mobile has this |
| RSVP functionality | Yes | Partial (parent-facing) | PARTIAL | **Players can't RSVP for themselves** — only parents via `event_rsvps` |
| Get directions button | Not explicit | Yes (links to maps) | FULL | |
| Season progress bar | Not explicit | Yes (completed games / total, win%) | FULL | Mobile has this |
| Upcoming battles on dashboard | 4 events with countdown | 3 events with countdown badges | FULL | |
| Battle log on dashboard | 5 recent games with K/A/D/B | Recent games with W/L, opponent, scores | PARTIAL | Mobile shows W/L + scores but **no individual stat summary** (K/A/D/B) |
| Game recap (player view) | Not confirmed | Only parent-facing (`game-results.tsx`) | MISSING | **Players can't view their own game recap** — only parents can via `/game-results` |
| Lineup viewer (pre-game) | View assigned lineup | Not present for players | MISSING | Players can't see their lineup position before a game |

### E. Team Social & Communication

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Team wall feed | Yes | Yes (connect tab) | FULL | |
| React to posts | Like/cheer | 5 reaction types + haptics | FULL | Mobile has more reaction types |
| Compose posts | Coach/admin only | Coach/admin only | FULL | Correctly restricted |
| Pinned posts | Not confirmed | Yes | FULL | |
| Team chat (channels) | Full chat with threads, reactions, GIFs | Basic channel list + messages | PARTIAL | Mobile missing: search, threads, GIF, reactions in chat, typing indicator |
| Player-to-player messaging | Not confirmed | Not present | MISSING | |
| Team countdown on wall | Yes (countdown to next game) | Not on team wall | MISSING | |
| Roster view | Yes (on team wall page) | Yes (roster tab in connect) | FULL | |
| Schedule tab on team wall | Not confirmed | Yes | FULL | |

### F. Player Profile & Identity

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Profile photo upload | Yes (PlayerCardExpanded) | Not from player's perspective | MISSING | Only coaches can upload via PlayerCardExpanded; **players can't set their own photo** |
| Jersey number display | Yes | Yes (dashboard hero) | FULL | |
| Position display | Yes (with position-specific colors) | Yes (text only) | PARTIAL | Mobile shows position text, **no position color coding** (OH=orange, S=teal, etc.) |
| OVR badge visible to others | Yes | Not present | MISSING | Other players/parents can't see a player's OVR |
| Show achievements publicly toggle | DB column exists (`show_achievements_publicly`) | Not present | MISSING | Toggle exists in schema but no UI |
| Calling card equipped | DB column exists (`equipped_calling_card_id`) | Not present | MISSING | |
| Skill ratings spider chart | Yes (PlayerCardExpanded: Stats/Skills tabs) | Not present for player self-view | MISSING | Coach sees skills via PlayerCardExpanded, but **player has no self-view of skill ratings** |
| Coach notes visibility | `player_coach_notes` (with `is_private` flag) | Not present | MISSING | Players can't see non-private coach notes |
| Player goals | `player_goals` table exists | Not present | MISSING | No goal setting or tracking UI |
| Player highlights | `player_highlights` table exists | Not present | MISSING | No video highlight uploads |

### G. Progression & Growth

| Feature | Web | Mobile | Status | Gap Details |
|---------|-----|--------|--------|-------------|
| Level system | Yes (formula-based) | Yes (same formula) | FULL | |
| XP progress bar | Yes | Yes | FULL | |
| Rank per stat category | Yes (shows "#X in league" per stat) | Not present | MISSING | Web shows player's league rank per stat; mobile doesn't |
| Season-over-season comparison | Not confirmed | Not present | MISSING | |
| Skill development tracking | `player_skill_ratings` has rated_at timestamps | Not present | MISSING | No skill improvement over time |
| Evaluation history | `player_evaluations` table exists | Not present | MISSING | No coach evaluation visibility |
| Personal bests / records | Not confirmed | Not present | MISSING | |

---

## PHASE 4: Prioritized Punch List

### P0: Critical Gaps (Player experience broken or severely lacking)

| # | Issue | Impact | Complexity | Fix Approach |
|---|-------|--------|------------|--------------|
| 1 | **Players can't view their own game recap** | After games, players can only see W/L on dashboard — no detailed stats for individual games | Medium | Create `/player-game-recap` route or make `game-results.tsx` work for player role (not just parents) |
| 2 | **Players can't RSVP for themselves** | `event_rsvps.responded_by` requires a user — player accounts should be able to RSVP directly | Medium | Add RSVP buttons to schedule event detail modal for player role; insert RSVP with player_id from current user |
| 3 | **No position color coding** | Position (OH/S/MB/L/DS etc.) shows as plain text instead of color-coded badge | Low | Add `POSITION_COLORS` config map; apply to dashboard hero and anywhere position appears |
| 4 | **No rank badges on stat HUD** | Web shows "#X in league" per stat; mobile only shows raw numbers | Medium | Query `player_season_stats` to compute player's rank per stat category; display as badge on each stat card |
| 5 | **No achievement tracking** | `player_tracked_achievements` table exists but no mobile UI | Medium | Add track/untrack toggle in achievement detail modal; show tracked achievements prominently on dashboard |
| 6 | **Player can't set their own photo** | Only coaches can upload photos via PlayerCardExpanded | Low | Add photo upload to player profile screen or manage tab |

### P1: Missing Parity Features (Player experience incomplete)

| # | Issue | Impact | Complexity | Fix Approach |
|---|-------|--------|------------|--------------|
| 7 | **No individual player stats page** | Players can't drill into their game-by-game stat history | High | Create `/my-stats` route with: season stats summary, per-game table, stat trends chart |
| 8 | **Leaderboards missing 3 categories** | Points, Hit%, Serve% not available (only 5 of 8) | Low | Add Points, Hit%, Serve% as stat category tabs in standings.tsx player leaderboards |
| 9 | **No per-game averages toggle on leaderboards** | Only totals shown; per-game gives fairer comparison | Low | Add toggle: "Totals" vs "Per Game" that divides by games_played |
| 10 | **No Season MVP highlights** | Web shows "Most Points/Aces/Kills" MVP section | Low | Add MVP section above leaderboard list |
| 11 | **Battle Log missing stat summary** | Dashboard shows W/L + score but not individual K/A/D/B per game | Medium | Query `game_player_stats` for player's stats per game; show mini stat bar on each battle log card |
| 12 | **No lineup viewer for players** | Players can't see their assigned position before a game | Medium | Query `game_lineups` for upcoming games; show "Your Position: P3 (OH)" card on gameday or dashboard |
| 13 | **No skill ratings self-view** | Coach sees skills in PlayerCardExpanded but player has no self-view | Medium | Add Skills tab/section on player dashboard or `/my-stats` showing radar chart of skill ratings |
| 14 | **Achievement search missing** | Web has search bar in achievements; mobile only has category filter | Low | Add search TextInput above category filter tabs |
| 15 | **No team filter on leaderboards** | Can't filter rankings by specific team | Low | Add team filter dropdown/pills above leaderboard list |
| 16 | **Trophy case missing rarity glow** | Dashboard shows earned achievements without visual rarity distinction | Low | Add rarity-based border/glow to trophy case items (gold/purple/blue/grey) |
| 17 | **No calling cards system** | `equipped_calling_card_id` exists but no UI | High | Build calling card selection UI + display on player profile visible to others |
| 18 | **No player goals** | `player_goals` table exists with title, description, target, progress | Medium | Create goal setting UI in manage tab or `/my-stats` |
| 19 | **No player highlights** | `player_highlights` table exists with video_url, thumbnail | High | Defer — requires video upload/storage infrastructure |

### P2: Polish & UX Improvements

| # | Issue | Impact | Complexity | Fix Approach |
|---|-------|--------|------------|--------------|
| 20 | **Stat HUD should use animated power bars** | Web has animated bars; mobile uses flat stat cards | Medium | Replace stat cards with animated `Animated.View` width-based bars with team color |
| 21 | **Hex badges instead of mini counters** | Web uses hexagonal badges for Games/Trophies/Points | Low | Create hexagonal SVG badge component for mini counters |
| 22 | **Squad Comms feed on dashboard** | Web has aggregated activity timeline | Medium | Query recent achievements + game results + upcoming events; display as timeline |
| 23 | **Achievement unlock celebration** | No notification when achievement earned during game | Medium | Add in-app toast/modal animation when new achievement detected on dashboard load |
| 24 | **Show achievements publicly toggle** | DB column exists but no toggle | Low | Add toggle in profile/settings to set `show_achievements_publicly` |
| 25 | **Admin preview mode** | Admins/coaches can't preview player dashboard | Medium | Add player selector in admin/coach view to render PlayerDashboard with selected player |
| 26 | **Team countdown on team wall** | Web shows countdown to next game on team wall | Low | Add countdown card above post feed when next game is upcoming |
| 27 | **Stat comparison to season averages** | No context for whether stats are good/bad relative to averages | Medium | Show league average alongside player's stat on dashboard/stats page |
| 28 | **Grid view toggle on leaderboards** | Web has grid (mini cards) vs full list views | Low | Add view toggle with compact grid layout |

---

## PHASE 5: Incremental PR Plan

### PR #16: Player Game Recap + RSVP (P0 — critical gaps)

**Goal**: Let players view their own game recaps with detailed stats and RSVP for events themselves.

**Scope**:
1. Make `game-results.tsx` work for player role (not just parents)
   - Detect if user is a player → fetch their own player record
   - Show "My Performance" section with their individual stats
   - Fall through to existing parent logic if user is a parent
2. Add RSVP buttons to schedule event detail modal for player role
   - Query existing RSVP status for player
   - Show Yes/No/Maybe buttons
   - Insert/update `event_rsvps` with player's player_id
3. Add "View Recap" button on PlayerDashboard battle log items for completed games
4. Wire dashboard upcoming battles to navigate to schedule event detail

**Files to modify**:
- `app/game-results.tsx` — add player role detection + self-stats view
- `app/(tabs)/schedule.tsx` — add RSVP buttons in EventDetailModal for players
- `components/PlayerDashboard.tsx` — add navigation on battle log items

**Acceptance Criteria**:
- Player taps completed game on dashboard → sees full recap with their K/A/D/B/Assists/Points
- Player taps event on schedule → can RSVP Yes/No/Maybe
- RSVP persists and updates count
- Parent experience unchanged
- TypeScript: 0 new errors

**Test Plan**:
1. Log in as player role
2. Navigate to completed game → verify personal stats display
3. Navigate to schedule → tap upcoming game → verify RSVP buttons appear
4. Submit RSVP → verify status persists on re-open

---

### PR #17: Position Colors + Rank Badges + Stat HUD Enhancement (P0/P1)

**Goal**: Add position color coding, league rank per stat, and enhanced stat visualization.

**Scope**:
1. Create `constants/position-colors.ts` with volleyball position → color mapping
   - OH (#FF6B35), S (#14B8A6), MB (#3B82F6), OPP (#EF4444), L (#EC4899), DS (#8B5CF6), RS (#F59E0B)
2. Apply position color badge on PlayerDashboard hero section
3. Compute player's league rank per stat category (query all `player_season_stats` for season)
4. Display rank badge on each stat card ("#3 in League")
5. Add Points, Hit%, Serve% to leaderboard categories (currently only 5 of 8)

**Files to modify**:
- `constants/position-colors.ts` — NEW
- `components/PlayerDashboard.tsx` — position badge color, rank computation + display
- `app/standings.tsx` — add 3 missing leaderboard categories

**Acceptance Criteria**:
- Position displays as colored badge (e.g., "OH" in orange pill)
- Each stat on dashboard shows rank ("Kills: 45 — #3 in League")
- Leaderboards show 8 categories: Kills, Aces, Digs, Blocks, Assists, Points, Hit%, Serve%
- Rank computed from current season data
- TypeScript: 0 new errors

---

### PR #18: My Stats Page + Game-by-Game History (P1 — core player feature)

**Goal**: Create dedicated player stats page with game-by-game breakdown.

**Scope**:
1. Create `/my-stats` route with:
   - Season stats summary card (all volleyball stats with per-game averages)
   - Game-by-game history table (date, opponent, result, K, A, D, B, Ast, Pts)
   - Hit%/Serve% trend line (optional — simple list if chart library not available)
   - Season selector for historical data
2. Add "My Stats" link in Manage tab (already exists → `/standings`, redirect to `/my-stats`)
3. Add skill ratings section if `player_skill_ratings` data exists

**Files to modify**:
- `app/my-stats.tsx` — NEW (~400 lines)
- `app/(tabs)/manage.tsx` — update "My Stats" route from `/standings` to `/my-stats`
- `app/_layout.tsx` — add route

**Acceptance Criteria**:
- Player navigates to My Stats → sees season summary + game history
- Each game row shows: date, opponent, W/L result, individual stat columns
- Tap game row → navigate to game recap
- If no stats yet, show encouraging empty state
- TypeScript: 0 new errors

---

### PR #19: Achievement Tracking + Search + Rarity Glow (P0/P1)

**Goal**: Match web achievement features — track/untrack, search, visual rarity.

**Scope**:
1. Add track/untrack toggle in achievement detail modal
   - Insert/delete `player_tracked_achievements` records
   - Max 3 tracked achievements
2. Show tracked achievements prominently on PlayerDashboard (above trophy case)
3. Add search TextInput above category filter
4. Add rarity-based glow/border to trophy case items and achievement grid
   - Legendary: gold glow (#FFD700)
   - Epic: purple glow (#A855F7)
   - Rare: blue glow (#3B82F6)
   - Uncommon: green glow (#10B981)
   - Common: grey border

**Files to modify**:
- `app/achievements.tsx` — search bar, track/untrack toggle in detail modal, rarity glow on grid
- `components/PlayerDashboard.tsx` — tracked achievements section, rarity glow on trophy case

**Acceptance Criteria**:
- Player can track up to 3 achievements (shows progress on dashboard)
- Search filters achievements by name/description
- Each achievement shows rarity-appropriate visual treatment
- Track/untrack persists via `player_tracked_achievements` table
- TypeScript: 0 new errors

---

### PR #20: Player Photo Upload + Profile Enhancement (P0/P1)

**Goal**: Let players set their own profile photo and enhance profile identity.

**Scope**:
1. Add photo upload on profile screen or PlayerDashboard
   - Camera + gallery picker
   - Upload to Supabase storage `player-photos` bucket
   - Update `players.photo_url`
2. Add "Show Achievements Publicly" toggle in profile settings
   - Update `players.show_achievements_publicly`
3. Add coach notes visibility (non-private notes from `player_coach_notes`)

**Files to modify**:
- `app/profile.tsx` — add photo upload section + achievements visibility toggle
- `components/PlayerDashboard.tsx` — use photo_url in hero section
- `app/_layout.tsx` — if new routes needed

**Acceptance Criteria**:
- Player taps avatar → camera/gallery picker → photo uploads and displays
- Photo persists across sessions
- "Show Achievements" toggle works
- TypeScript: 0 new errors

---

### PR #21: Lineup Viewer + Battle Log Stats + Dashboard Polish (P1/P2)

**Goal**: Show players their lineup position pre-game and add stat details to battle log.

**Scope**:
1. Query `game_lineups` for upcoming games → show "Your Position: P3 (OH)" on game day card
2. Add mini stat bar to battle log items (K/A/D/B per game from `game_player_stats`)
3. Add per-game average toggle to leaderboards
4. Add Season MVP highlights section to standings page
5. Add team filter dropdown to leaderboard

**Files to modify**:
- `components/PlayerDashboard.tsx` — lineup badge on upcoming battles, stat bar on battle log
- `app/standings.tsx` — MVP section, per-game toggle, team filter
- `app/(tabs)/gameday.tsx` — lineup position display

**Acceptance Criteria**:
- Upcoming game card shows "You: P3 (OH)" if lineup is set
- Each battle log game shows mini K/A/D/B stat bar
- Leaderboard has "Totals / Per Game" toggle
- MVP section shows top 3 (most points, most aces, most kills)
- Team filter works on leaderboard
- TypeScript: 0 new errors

---

### PR #22: Animated Stat Bars + Hex Badges + Achievement Celebration (P2 polish)

**Goal**: Visual polish to match web's video-game aesthetic.

**Scope**:
1. Replace flat stat cards with animated power bars (Animated.View width transition)
2. Create hexagonal SVG badge component for Games/Trophies/Points counters
3. Add achievement unlock celebration modal (triggered when new achievement detected)
4. Add Squad Comms timeline section on dashboard
5. Add team countdown on team wall

**Files to modify**:
- `components/PlayerDashboard.tsx` — animated bars, hex badges, squad comms, unlock celebration
- `components/HexBadge.tsx` — NEW (hexagonal badge component)
- `components/TeamWall.tsx` — countdown card

**Acceptance Criteria**:
- Stat bars animate on dashboard load
- Hex badges display with team-colored borders
- New achievement triggers celebration animation
- Squad Comms shows recent activity timeline
- TypeScript: 0 new errors

---

## Summary: PR Sequence

| PR | Title | Priority | Risk | Key Files |
|----|-------|----------|------|-----------|
| **#16** | Player Game Recap + RSVP | P0 | Low | `game-results.tsx`, `schedule.tsx`, `PlayerDashboard.tsx` |
| **#17** | Position Colors + Rank Badges | P0/P1 | Low | NEW `position-colors.ts`, `PlayerDashboard.tsx`, `standings.tsx` |
| **#18** | My Stats Page + Game History | P1 | Medium | NEW `my-stats.tsx`, `manage.tsx` |
| **#19** | Achievement Tracking + Search + Glow | P0/P1 | Medium | `achievements.tsx`, `PlayerDashboard.tsx` |
| **#20** | Player Photo Upload + Profile | P0/P1 | Low | `profile.tsx`, `PlayerDashboard.tsx` |
| **#21** | Lineup Viewer + Battle Log Stats | P1/P2 | Medium | `PlayerDashboard.tsx`, `standings.tsx`, `gameday.tsx` |
| **#22** | Animated Bars + Hex Badges + Celebrations | P2 | Medium | `PlayerDashboard.tsx`, NEW `HexBadge.tsx`, `TeamWall.tsx` |

**Recommended execution order**: PR #16 → #17 → #19 → #18 → #20 → #21 → #22

Fix critical game recap + RSVP first (#16), then visual identity (#17), then achievement engagement (#19), then deep stats (#18), then profile (#20), then polish (#21, #22).

---

## Cross-Cutting Issues (Apply Across All PRs)

1. **Player Identification**: Three fallback methods exist — direct player (`user_account_id`), child of parent (`parent_account_id`), guardian (`player_guardians`). All player screens must handle all three.
2. **Position Colors**: Once defined in `constants/position-colors.ts`, use consistently across all screens (dashboard, stats, leaderboard, team wall roster).
3. **OVR Formula**: `50 + (kills*0.3) + (aces*0.5) + (blocks*0.3) + (digs*0.2) + (assists*0.2)` — cap at 99. Keep consistent across dashboard and profile.
4. **Level Formula**: `Math.floor((games_played * 10 + total_points) / 100) + 1` — keep consistent.
5. **Stat Tables**: Primary source is `player_season_stats`. Fallback to aggregating `game_player_stats`. Both must be handled.
6. **Dark Aesthetic**: Player experience should lean into dark/edgy video-game feel. Use team colors as accents. Neon glow effects for rarity.
7. **Empty States**: All screens need encouraging empty states ("No battles yet — your first game awaits!" not "No data").

---

## Verification Checklist

1. `npx tsc --noEmit` — 0 new TypeScript errors per PR
2. Player dashboard loads with correct hero, stats, trophy case, battles
3. Game recap shows individual player stats for completed games
4. RSVP works from player perspective on schedule
5. Position shows with correct color (OH=orange, S=teal, etc.)
6. Rank badges appear on each stat ("#X in League")
7. Achievement tracking persists (track/untrack, max 3)
8. My Stats page shows game-by-game history with per-game stats
9. Leaderboards show all 8 categories with per-game toggle
10. Player can upload profile photo
11. Lineup position visible before game day
12. Battle log shows K/A/D/B mini stat bar per game
13. All screens handle empty state gracefully

---

## Database Tables Referenced (Player-Complete)

| Table | Columns Used | Purpose |
|-------|-------------|---------|
| `players` | id, first_name, last_name, jersey_number, position, photo_url, user_account_id, parent_account_id, equipped_calling_card_id, show_achievements_publicly | Core identity |
| `team_players` | team_id, player_id, jersey_number | Team membership |
| `teams` | id, name, color, season_id | Team info |
| `player_season_stats` | All stat columns + games_played, hitting_percentage, serve_percentage | Season aggregates |
| `game_player_stats` | All stat columns + event_id, player_id | Per-game stats |
| `player_achievements` | player_id, achievement_id, earned_at, stat_value_at_unlock | Earned trophies |
| `player_achievement_progress` | player_id, achievement_id, current_value, target_value | Progress tracking |
| `player_tracked_achievements` | player_id, achievement_id, display_order | Tracked achievements |
| `achievements` | id, name, description, category, rarity, icon, stat_key, threshold, how_to_earn | Achievement catalog |
| `player_badges` | player_id, badge_type, badge_name, awarded_by | Coach-awarded badges |
| `player_skills` | player_id, passing, serving, hitting, blocking, setting, defense | Skill ratings |
| `player_skill_ratings` | All rating columns + rated_by, coach_notes | Detailed evaluations |
| `player_positions` | primary_position, secondary_position, is_captain, skill_rating | Position data |
| `player_goals` | title, description, target_value, current_value, status | Goal tracking |
| `player_highlights` | title, video_url, thumbnail_url | Video highlights |
| `player_coach_notes` | content, note_type, is_private | Coach notes |
| `player_evaluations` | skills (jsonb), overall_score, notes | Evaluations |
| `schedule_events` | All columns | Schedule |
| `event_rsvps` | player_id, status, responded_by | RSVP |
| `game_lineups` | player_id, position, rotation_order, is_starter | Lineup position |
| `game_results` | event_id, result, sets_won, sets_lost, mvp_player_id | Game outcomes |
| `team_standings` / `v_season_standings` | wins, losses, win_percentage, point_differential | Standings |
| `team_posts` | team_id, content, media_urls, reaction_count | Social feed |
| `team_post_reactions` | post_id, user_id, reaction_type | Reactions |
