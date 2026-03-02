# LYNX — Player Home: MVP Scroll Redesign
## For Claude Code Execution

**Project:** volleybrain-mobile3 (React Native / Expo)  
**GitHub:** SgtxTorque/volleybrain-mobile3  
**Web Admin (SOURCE OF TRUTH):** `C:\Users\fuent\Downloads\volleybrain-admin\`  
**Mockup Reference:** `reference/design-references/player-mockups/components/screens/`  
**Brand Book:** `reference/design-references/brandbook/LynxBrandBook.html`

---

## CONTEXT

The Player experience is the soul of Lynx. This is a 13-year-old opening the app after school. She has 47 minutes before practice. TikTok is calling. The player home needs to give her something no other app can: **validation in the thing she cares about.** TikTok tells her she's funny. Instagram tells her she's pretty. Lynx tells her she's a BALLER.

**Three dopamine loops:**
1. **"Did anything happen?"** — shoutouts, badges, stats posted → reason to OPEN the app
2. **"Where do I stand?"** — level, OVR, leaderboard rank → reason to SCROLL
3. **"What's next?"** — XP to next level, closest badge, active challenge → reason to COME BACK

**The player home is the gateway, not the destination.** Keep it tight: 5-7 sections max. Every card taps into a rich full-screen experience. Don't cram everything on the dashboard — make the dashboard the hook.

**CRITICAL: The player experience uses DARK MODE.** Navy background `#0D1B3E` everywhere. This is non-negotiable — it separates the player world from parent (light/warm) and coach (light/operational). When a kid opens this, it should feel like a game menu, not a sports admin tool.

---

## RULES

1. **Read SCHEMA_REFERENCE.csv** before any queries.
2. **Read existing mobile player code** before changing anything:
   - Find the current PlayerDashboard in `components/` or wherever DashboardRouter sends player role
   - Read all of it before modifying
3. **Read the web admin player dashboard** for query patterns:
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\pages\roles\PlayerDashboard.jsx` — XP formula, OVR formula, data loading
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\components\player\PlayerProfileSidebar.jsx` — sidebar data display
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\components\player\PlayerCenterFeed.jsx` — feed layout, game stats
   - `C:\Users\fuent\Downloads\volleybrain-admin\src\components\player\PlayerSocialPanel.jsx` — social features
4. **Read the Vercel mockup screens** for design DNA:
   - `reference/design-references/player-mockups/components/screens/s1-player-home.tsx` — home scroll layout
   - `reference/design-references/player-mockups/components/screens/m2-player-card.tsx` — OVR badge, power bars
   - `reference/design-references/player-mockups/components/screens/s2-badges-challenges.tsx` — trophy case
   - `reference/design-references/player-mockups/components/screens/s4-game-recap.tsx` — XP breakdown style
   - `reference/design-references/player-mockups/components/screens/s5-team-pulse.tsx` — leaderboard podium
   - `reference/design-references/player-mockups/styles/globals.css` — animation keyframes (xp-shimmer, badge-glow, streak-pulse)
5. **PLAYER-ROLE ONLY.** Do NOT touch Parent, Coach, or Admin dashboards.
6. **All animations use `react-native-reanimated`** (UI thread, 60fps).
7. **Check package.json** before installing anything.
8. **No console.log without `__DEV__` gating.**
9. **Run `npx tsc --noEmit` after every phase.**
10. **Commit AND push after every phase.**
11. **AUTONOMOUS EXECUTION MODE.** Run ALL phases (0-7) without stopping.

---

## DESIGN SYSTEM — PLAYER DARK THEME

The player experience has its own color system. Reference `s1-player-home.tsx` and the web admin `PlayerDashboard.jsx` PLAYER_THEMES.

```typescript
// Player Dark Theme — used ONLY on player screens
const PLAYER_THEME = {
  // Backgrounds
  bg: '#0D1B3E',              // Main background
  cardBg: '#10284C',          // Card backgrounds
  cardBgHover: '#162848',     // Slightly lighter card state
  cardBgSubtle: 'rgba(255,255,255,0.03)', // Very subtle card fill

  // Brand colors
  accent: '#4BB9EC',          // Lynx sky blue — primary action color
  gold: '#FFD700',            // XP, levels, rewards, OVR badge
  goldGlow: 'rgba(255,215,0,0.3)',
  success: '#22C55E',         // Wins, positive trends, improvements
  error: '#EF4444',           // Losses, warnings
  purple: '#A855F7',          // Epic rarity, special badges

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.60)',
  textMuted: 'rgba(255,255,255,0.30)',
  textFaint: 'rgba(255,255,255,0.15)',

  // Borders
  border: 'rgba(255,255,255,0.06)',
  borderAccent: 'rgba(75,185,236,0.15)',
  borderGold: 'rgba(255,215,0,0.20)',
};

// Card styles
const PLAYER_CARDS = {
  hero: {
    borderRadius: 22,
    backgroundColor: PLAYER_THEME.cardBg,
    borderWidth: 1,
    borderColor: PLAYER_THEME.borderAccent,
    overflow: 'hidden',
  },
  standard: {
    borderRadius: 18,
    backgroundColor: PLAYER_THEME.cardBg,
    borderWidth: 1,
    borderColor: PLAYER_THEME.border,
    padding: 16,
  },
  accent: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PLAYER_THEME.borderGold,
    padding: 16,
  },
};
```

### Animation Reference (from mockup CSS → React Native Reanimated equivalents):

**XP Shimmer:** The XP progress bar has a moving gradient shimmer. In RN, use `useAnimatedStyle` with a looping `translateX` on a LinearGradient overlay inside the bar. 3s loop, linear timing.

**Badge Glow:** Most recently earned badge pulses with a subtle glow. Use `useAnimatedStyle` with looping shadow opacity: 0.3 → 0.6 → 0.3, 2.5s, ease-in-out.

**Streak Pulse:** The streak banner pulses opacity: 1 → 0.7 → 1, 1.5s, ease-in-out.

---

## XP AND OVR FORMULAS

**Copy these EXACTLY from the web admin** (`PlayerDashboard.jsx` lines 266-296):

### XP Formula:
```typescript
const computeXP = (seasonStats, badgeCount) => {
  const gp = seasonStats?.games_played || 0;
  const k = seasonStats?.total_kills || 0;
  const a = seasonStats?.total_aces || 0;
  const d = seasonStats?.total_digs || 0;
  const bl = seasonStats?.total_blocks || 0;
  const as = seasonStats?.total_assists || 0;
  return (gp * 100) + (k * 10) + (a * 25) + (d * 5) + (bl * 15) + (as * 10) + (badgeCount * 50);
};

const level = Math.floor(xp / 1000) + 1;
const xpProgress = xp > 0 ? ((xp % 1000) / 1000) * 100 : 0;
const xpToNext = 1000 - (xp % 1000);
```

### OVR (Overall Rating) Formula:
```typescript
const computeOVR = (seasonStats) => {
  if (!seasonStats) return 0;
  const gp = seasonStats.games_played || 0;
  if (gp === 0) return 0;
  const hitPct = seasonStats.hit_percentage || 0;
  const servePct = seasonStats.serve_percentage || 0;
  const killsPg = (seasonStats.total_kills || 0) / gp;
  const acesPg = (seasonStats.total_aces || 0) / gp;
  const digsPg = (seasonStats.total_digs || 0) / gp;
  const blocksPg = (seasonStats.total_blocks || 0) / gp;
  const assistsPg = (seasonStats.total_assists || 0) / gp;
  const raw = (hitPct * 100 * 0.25) + (servePct * 100 * 0.15) +
    (killsPg * 4) + (acesPg * 6) + (digsPg * 2.5) + (blocksPg * 5) + (assistsPg * 3) +
    Math.min(gp * 1.5, 15);
  return Math.min(99, Math.max(40, Math.round(raw + 35)));
};
```

---

## PHASE 0: PRE-FLIGHT AUDIT

0A. Find and read the current mobile player dashboard:
```bash
grep -rn "player.*dashboard\|PlayerDashboard\|role.*player" components/ --include="*.tsx" --include="*.ts" -l
```
Read the DashboardRouter to see how it routes to the player view.

0B. Read the web admin PlayerDashboard.jsx (403 lines) — especially:
- `loadPlayerDashboard()` function (line 208) — all Supabase queries
- `loadRankings()` function (line 243) — leaderboard rankings
- XP computation (line 266)
- OVR computation (line 281)

0C. Read the mockup screens:
- `reference/design-references/player-mockups/components/screens/s1-player-home.tsx`
- `reference/design-references/player-mockups/components/screens/m2-player-card.tsx`

0D. Verify tables exist in SCHEMA_REFERENCE.csv:
- `players` — id, first_name, last_name, jersey_number, photo_url, position
- `team_players` — player_id, team_id
- `teams` — id, name, color, season_id
- `player_season_stats` — player_id, season_id, games_played, total_kills, total_aces, total_digs, total_blocks, total_assists, hit_percentage, serve_percentage, total_points
- `game_player_stats` — player_id, event_id, kills, aces, digs, blocks, assists (per-game stats)
- `player_achievements` — player_id, achievement_id, awarded_at
- `achievements` — id, name, icon, rarity, color_primary, description, criteria_type, criteria_value
- `schedule_events` — id, team_id, event_type, event_date, start_time, location, opponent_name
- `event_rsvps` — event_id, player_id, status
- `shoutouts` — id, from_user_id, to_player_id, shoutout_type, message, created_at
- `coach_challenges` — id, team_id, title, description, target_value, xp_reward, start_date, end_date
- `challenge_participants` — challenge_id, player_id, current_value
- `team_wall_posts` — id, team_id, author_id, content, post_type, created_at (for photos/highlights)

Flag any tables that DON'T exist. For missing tables, use placeholder data with "Coming soon" behavior.

0E. Check what `roleContext` provides for the player role — specifically `roleContext.playerInfo`.

**Commit:** `git add -A && git commit -m "Player Phase 0: Pre-flight audit complete" && git push`

---

## PHASE 1: DATA HOOK + DARK SCAFFOLD

### 1A. Create `hooks/usePlayerHomeData.ts`

This hook loads ALL data the player home needs. Mirror the web admin's `loadPlayerDashboard()` pattern.

**Queries (reference web admin PlayerDashboard.jsx lines 208-241):**

```typescript
// 1. Player info + teams
const { data: teamData } = await supabase
  .from('team_players')
  .select('*, teams(*)')
  .eq('player_id', playerId);

// 2. Season stats
const { data: seasonStats } = await supabase
  .from('player_season_stats')
  .select('*')
  .eq('player_id', playerId)
  .eq('season_id', seasonId)
  .maybeSingle();

// 3. Last game stats (most recent game)
const { data: lastGame } = await supabase
  .from('game_player_stats')
  .select('*, event:event_id(event_type, event_date, opponent_name, our_score, opponent_score)')
  .eq('player_id', playerId)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

// 4. Badges earned
const { data: badges } = await supabase
  .from('player_achievements')
  .select('*, achievement:achievement_id(id, name, icon, rarity, color_primary, description)')
  .eq('player_id', playerId)
  .order('awarded_at', { ascending: false });

// 5. All achievements (for locked/unlocked trophy case)
const { data: allAchievements } = await supabase
  .from('achievements')
  .select('*');

// 6. Next upcoming event
const today = new Date().toISOString().split('T')[0];
const { data: nextEvent } = await supabase
  .from('schedule_events')
  .select('*, teams(*)')
  .in('team_id', teamIds)
  .gte('event_date', today)
  .order('event_date', { ascending: true })
  .order('start_time', { ascending: true })
  .limit(1)
  .maybeSingle();

// 7. RSVP status for next event
if (nextEvent) {
  const { data: rsvp } = await supabase
    .from('event_rsvps')
    .select('*')
    .eq('event_id', nextEvent.id)
    .eq('player_id', playerId)
    .maybeSingle();
}

// 8. Recent shoutouts TO this player
const { data: shoutouts } = await supabase
  .from('shoutouts')
  .select('*, from_user:from_user_id(id, full_name)')
  .eq('to_player_id', playerId)
  .order('created_at', { ascending: false })
  .limit(3);

// 9. Active challenges for player's teams
const { data: challenges } = await supabase
  .from('coach_challenges')
  .select('*, challenge_participants!inner(player_id, current_value)')
  .in('team_id', teamIds)
  .eq('challenge_participants.player_id', playerId)
  .gte('end_date', today);

// 10. Rankings (same pattern as web admin loadRankings)
const { data: allTeamStats } = await supabase
  .from('player_season_stats')
  .select('player_id, total_kills, total_aces, total_digs, total_blocks, total_assists, total_points')
  .eq('season_id', seasonId);

// 11. Recent team photos/highlights (team wall posts with images)
const { data: recentPhotos } = await supabase
  .from('team_wall_posts')
  .select('id, content, media_url, post_type, created_at, author:author_id(full_name)')
  .in('team_id', teamIds)
  .not('media_url', 'is', null)
  .order('created_at', { ascending: false })
  .limit(8);

// 12. Latest chat message (for chat preview)
// Check if there's a messages/chats table. If not, skip.

// 13. Attendance streak
// Count consecutive events where this player's RSVP = 'confirmed' or attendance = true
// Going backwards from most recent event
```

**IMPORTANT:** For tables that don't exist (shoutouts, coach_challenges, challenge_participants, team_wall_posts), wrap each query in try/catch. If the table doesn't exist, return empty arrays and set a flag like `shoutoutsAvailable: false`. Do NOT crash.

**Computed values (in the hook):**
```typescript
const xp = computeXP(seasonStats, badges?.length || 0);
const level = Math.floor(xp / 1000) + 1;
const xpProgress = xp > 0 ? ((xp % 1000) / 1000) * 100 : 0;
const xpToNext = 1000 - (xp % 1000);
const ovr = computeOVR(seasonStats);
const bestRank = findBestRank(rankings); // { stat: 'kills', rank: 1, value: 20 }
```

### 1B. Create `components/PlayerHomeScroll.tsx` — dark scaffold

The entire player home is wrapped in the dark theme background. Structure:

```tsx
<View style={{ flex: 1, backgroundColor: PLAYER_THEME.bg }}>
  <StatusBar barStyle="light-content" />
  {/* Compact header */}
  <Animated.View style={[compactHeaderStyle]}>
    <Text style={{ color: PLAYER_THEME.accent, fontWeight: '800', fontSize: 20 }}>lynx</Text>
    {/* Streak pill + avatar */}
  </Animated.View>

  <Animated.ScrollView
    onScroll={scrollHandler}
    scrollEventThrottle={16}
    showsVerticalScrollIndicator={false}
    style={{ flex: 1 }}
  >
    {/* Sections render here */}
    {/* Bottom padding for nav */}
    <View style={{ height: 140 }} />
  </Animated.ScrollView>
</View>
```

### 1C. Wire into DashboardRouter

Replace the old player dashboard with `PlayerHomeScroll`. Pass `roleContext` properly — especially `roleContext.playerInfo` which contains the player's ID, name, jersey, etc.

**Commit:** `git add -A && git commit -m "Player Phase 1: Data hook + dark scaffold + router wiring" && git push`

---

## PHASE 2: HERO IDENTITY CARD

**Reference:** `s1-player-home.tsx` lines 22-57

This is the player's identity. The first thing she sees. It stays at the top always.

### Layout:
```
┌──────────────────────────────────────────────┐
│  gradient: from-[#10284C] via-[#162848]      │
│  subtle dot pattern overlay (opacity 0.03)   │
│                                              │
│  PLAYER               ┌──────────┐          │
│  AVA                   │    56    │          │
│  WILLIAMS              │   OVR    │          │
│                        └──────────┘          │
│  Black Hornets Elite · Setter · #1           │
│                                              │
│  [LVL 4]  ━━━━━━━━━━━━━━━━━━━━━░░  750/800  │
│                                              │
└──────────────────────────────────────────────┘
```

### Implementation:

2A. **Card background:** Gradient from `#10284C` via `#162848` to `#10284C` (use `expo-linear-gradient`). Subtle radial dot pattern overlay at 3% opacity — use a repeating View pattern or skip if too complex for MVP.

2B. **Player label:** "PLAYER" in 11px, bold, tracking 0.15em, uppercase, `PLAYER_THEME.accent` at 60% opacity.

2C. **Name:** Large serif/bold text. Reference mockup uses 42px with leading 0.9. In RN, use Bebas Neue or similar bold condensed font at 38px. First name on line 1, last name on line 2. Color: white.

2D. **OVR Badge:** Square/rounded container (64×64), top-right aligned. Gold-tinted background (`#FFD700` at 10% opacity), gold border (40% opacity).
- OVR number: Bebas Neue 28px, color `#FFD700`
- "OVR" label: 8px bold, `#FFD700` at 60%
- **Glow animation:** Subtle pulsing shadow (reference badge-glow CSS). Use `useAnimatedStyle` with looping shadowOpacity.
- **Tappable:** Tapping OVR badge → navigates to full player profile (S3 screen — future build)

2E. **Info row:** "Black Hornets Elite · Setter · #1" — 11px, semibold, `textMuted`. Dots as separators.

2F. **Level + XP bar:**
- Level pill: "LVL 4" in 10px bold, `#FFD700`, inside a pill with gold-tinted background and border
- XP progress bar: height 8px, borderRadius 4px, track: `rgba(255,255,255,0.05)`
- **Fill: animated shimmer gradient** — skyBlue → gold → skyBlue, backgroundSize 200%, sliding left to right in a 3s loop. This is the hero animation — it catches the eye every time she opens the app.
- XP text: "750/800" in 10px, semibold, `textMuted`, right-aligned

2G. **Scroll behavior:** As the user scrolls, the hero card should:
- Stay visible until scrolled ~60% offscreen
- The name shrinks slightly (scale 1.0 → 0.95)
- Opacity fades slightly (1.0 → 0.8)
- The compact header simultaneously fades in with: "lynx" text + level pill + avatar circle

**Commit:** `git add -A && git commit -m "Player Phase 2: Hero identity card with OVR badge, XP shimmer bar" && git push`

---

## PHASE 3: THE DROP + STREAK BANNER

### 3A. Streak Banner

**Reference:** `s1-player-home.tsx` lines 59-68

If the player has attended 2+ events in a row, show a streak banner:

```
┌──────────────────────────────────────────────┐
│  🔥  3-Day Streak                            │
│      Keep it going — you're locked in        │
└──────────────────────────────────────────────┘
```

- Gold-tinted gradient background: `from #FFD700/10 via #FFD700/05 to transparent`
- Gold border at 15% opacity
- Flame icon (use emoji 🔥 or Lucide `Flame` equivalent)
- "3-Day Streak" in 13px bold, `#FFD700`
- Subtitle in 10px, `textMuted`
- **Pulse animation:** Opacity oscillates 1.0 → 0.7 → 1.0, 1.5s loop (streak-pulse)
- If streak is 0 or 1: DO NOT RENDER this section

### 3B. The Drop — "Since you were last here"

This shows what happened since the player's last app open. It's the reason to open the app.

**Content priority (show first 2-3 that apply, max 3):**

1. **Shoutout received** (highest priority — social validation)
```
  🎯 Coach gave you a Clutch Player shoutout!
     "Ava's serving was unreal today" · 2h ago
```
   - Accent-tinted gradient background (skyBlue/10 → cardBg)
   - Shoutout type emoji + "Coach gave you a [type] shoutout!"
   - Coach's message quoted in 13px, semibold, `textSecondary`
   - Timestamp in 10px, `textFaint`
   - Reference: `s1-player-home.tsx` lines 93-106

2. **Badge earned**
```
  🏅 You earned "Iron Will" badge
     Attend 10 practices in a row · Yesterday
```
   - Standard card bg with badge's rarity color tint
   - Badge icon + name
   - Achievement criteria description
   - Timestamp

3. **Stats posted from a game**
```
  📊 Your stats are in from Saturday's game
     12 kills · 3 aces · 8 digs
     Tap to see full breakdown →
```
   - Standard card bg
   - Summary of key stats
   - Tappable → future game recap screen

4. **Level up** (if XP crossed a 1000 threshold since last visit — check if we can detect this)
```
  ⚡ You leveled up to Level 5!
     +250 XP from Saturday's game
```

**If nothing happened since last visit:**
Show a contextual forward-looking message instead (NOT "no new notifications"):
```
  Practice tonight at 6 PM.
  Time to add to that streak. 🔥
```
Or if no event today:
```
  Game on Saturday vs Rangers.
  Last time you had 8 kills. Beat that.
```
Ambient text, centered, `textMuted`, with mascot emoji.

### 3C. Drop reveal animation:
Each Drop item slides in from the bottom with a stagger:
- Item 1: immediate, translateY 20→0, opacity 0→1, 400ms, easeOut
- Item 2: +200ms delay
- Item 3: +400ms delay
- Like cards being dealt

**Commit:** `git add -A && git commit -m "Player Phase 3: The Drop section + streak banner with animations" && git push`

---

## PHASE 4: PHOTO STRIP + NEXT UP + CHAT PEEK

### 4A. Photo Strip — Horizontal thumbnail scroll

Recent photos from the team hub (team_wall_posts with media_url).

```
  [photo] [photo] [photo] [photo] [photo] →
```

- Horizontal FlatList, height 80px
- Each thumbnail: 72×72, borderRadius 12, object-fit cover
- 8px gap between thumbnails
- If a photo is OF this player (tagged or from their game), show it first with a subtle gold border (2px, `#FFD700` at 30%)
- Tapping a photo → opens in lightbox or navigates to the team hub post
- If no photos exist: DO NOT render this section
- Section has no header — just the thumbnails floating in the scroll. Clean.
- Subtle left padding 20px, right side fades to transparent (masked edge)

**Query:** From step 11 in the data hook. Use `team_wall_posts` where `media_url IS NOT NULL`. If the table doesn't exist, hide this entire section.

### 4B. Next Up — Event + Inline RSVP

**Reference:** `s1-player-home.tsx` lines 70-91

```
┌──────────────────────────────────────────────┐
│  ● Next Up                                   │
│                                              │
│  Practice            [ I'M READY ]           │
│  Today at 6:00 PM                            │
│  📍 Frisco Fieldhouse                        │
│                                              │
│  🔥 Practice streak: 8 in a row             │
└──────────────────────────────────────────────┘
```

- Card: `PLAYER_CARDS.standard` with `borderAccent`
- Green pulsing dot (2px, animate-pulse) + "NEXT UP" label, 10px, bold, accent, uppercase
- Event title: 20px, extrabold, white
- Date/time: 13px, `textMuted`
- Location: 11px, `textFaint`, with 📍 icon
- **"I'M READY" button:** pill shape, `PLAYER_THEME.accent` bg, dark text, 11px bold uppercase. Tapping sends RSVP = 'confirmed' for this event.
  - If already RSVP'd: button says "✓ GOING" in green bg
  - If declined: button says "CAN'T MAKE IT" in muted style
  - Long-press or second tap toggles between states
- **Streak line (conditional):** If attendance streak ≥ 2, show "🔥 Practice streak: X in a row" below location

**If no upcoming event:** Show ambient text: "No events scheduled. Enjoy the off day. 😎"

### 4C. Chat Peek — Latest message

```
  💬 Mia J: nobody stopping us Saturday 🔥 · 5m ago    →
```

- Single flat row, not a card
- Avatar circle (32px, accent tinted) with initials, OR emoji if it's a team chat
- Sender name bold, message preview truncated to 1 line, timestamp muted
- Right arrow for navigation
- Tapping → navigates to chat tab
- Show the most recent unread message across player chat and team chat. If both have unreads, show player chat (more personal).
- If no unread messages: "💬 Team chat · all caught up" in muted text
- **If the chat/messages table doesn't exist:** Show "💬 Chat coming soon" as ambient text

**Commit:** `git add -A && git commit -m "Player Phase 4: Photo strip, Next Up with RSVP, chat peek" && git push`

---

## PHASE 5: QUICK PROPS + ACTIVE CHALLENGE

### 5A. Quick Props — "Who balled out?"

This is the social engine. Kids giving each other shoutouts generates XP, fills the Drop, feeds the leaderboard. One row, prominent placement.

```
  🌟 Who balled out today? Give props →
```

- Gold-tinted row: background `#FFD700` at 8% opacity, border `#FFD700` at 15%
- Star icon left
- Text: 12px, bold, `textSecondary`
- Tapping → navigates to shoutout creation flow (or shows "Coming soon" toast if shoutout creation screen doesn't exist on mobile yet)
- Below the text: "0 shoutouts given this week" in 10px, `textFaint`
- **If shoutouts table doesn't exist:** Still show the row, but tapping shows "Coming soon" toast

### 5B. Active Challenge Card

**Reference:** `s1-player-home.tsx` lines 156-172

If there's an active team challenge, show it:

```
┌──────────────────────────────────────────────┐
│  ⚡ DAILY CHALLENGE                           │
│  Complete 20 serves at practice              │
│  ━━━━━━━━━━━━━━━━━━░░░░░░░░  0/20            │
│  +25 XP reward                               │
└──────────────────────────────────────────────┘
```

- Card with gold-tinted gradient: `from #FFD700/08 to cardBg`
- Zap icon + "DAILY CHALLENGE" header in 10px, bold, gold, uppercase
- Challenge title: 14px, bold, white
- Progress bar: height 6px, gold fill, track `rgba(255,255,255,0.05)`
- Progress text: "0/20" in 10px, bold, `textMuted`
- XP reward: 10px, `#FFD700` at 40%
- **If no active challenge:** DO NOT render this section (hide completely)
- **If challenge_participants table doesn't exist:** Hide this section

**Commit:** `git add -A && git commit -m "Player Phase 5: Quick props shoutout row + active challenge card" && git push`

---

## PHASE 6: LAST GAME STATS + CLOSING

### 6A. Last Game Stats — Compact 4-column grid

**Reference:** `s1-player-home.tsx` lines 123-140

If the player has game stats, show a compact summary of their most recent game:

```
┌──────────────────────────────────────────────┐
│  LAST GAME HIGHLIGHTS                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  │  22  │ │ 100  │ │ 100  │ │   0  │       │
│  │Assts │ │Hit % │ │Srv % │ │Blocks│       │
│  └──────┘ └──────┘ └──────┘ └──────┘       │
│                                              │
│  Personal best in assists! 🔥               │
└──────────────────────────────────────────────┘
```

- Card: standard dark card
- "LAST GAME HIGHLIGHTS" header: 10px, bold, `textFaint`, uppercase
- 4-column grid of stat boxes:
  - Each box: `rgba(255,255,255,0.03)` bg, borderRadius 12, centered
  - Value: Bebas Neue (or bold serif) 22px, white
  - Label: 9px, `textFaint`, semibold
- Show the 4 most relevant stats based on position (setter → assists first, hitter → kills first)
- **Personal best callout:** Compare each stat to the player's previous games. If any stat is their season high, show "Personal best in [stat]! 🔥" below the grid. Color: gold. This is an automatic micro-dopamine hit.
- If no game stats: DO NOT render. The Drop section handles the "no data yet" messaging.

### 6B. Closing Mascot + XP Callback

```
      🐱

  50 XP to Level 5.
  One great practice and you're there.
```

- Lynx mascot emoji, centered, 36px
- XP callback: "X XP to Level Y" — mirrors the opening XP bar. The scroll starts and ends with aspiration.
- Contextual second line based on what would earn the most XP:
  - If a game is coming: "A win on Saturday is worth 100 XP."
  - If practice tonight: "One great practice and you're there."
  - If nothing soon: "Keep showing up. The grind pays off."
- Font: 13px, `textMuted`, centered
- Bottom padding: 140px (for bottom nav clearance)

**Commit:** `git add -A && git commit -m "Player Phase 6: Last game stats grid, personal best callout, closing mascot" && git push`

---

## PHASE 7: SCROLL ANIMATIONS + FINAL POLISH

### 7A. Scroll animations:

- **Hero card:** Parallax at 0.3x scroll speed on the dot pattern overlay. Scale 1.0→0.95 and opacity 1.0→0.8 as it scrolls up.
- **Compact header:** Fades in (opacity 0→1) when hero card is 60% scrolled offscreen. Shows "lynx" text + LVL pill + avatar circle.
- **The Drop items:** Stagger reveal already implemented in Phase 3.
- **Photo strip:** Slight parallax — scrolls horizontally at 0.1x the vertical scroll speed, creating depth.
- **Challenge card:** Subtle scale 0.97→1.0 breathing as it enters viewport center.
- **Stat boxes:** Fade in simultaneously (not staggered) when the card enters viewport. Numbers count up from 0 to their value over 400ms. Use `withTiming` on interpolated value.

### 7B. Bottom nav treatment:
- The bottom nav should use the dark theme: `PLAYER_THEME.bg` at 95% opacity with backdrop blur
- Active tab: `PLAYER_THEME.accent` color
- Inactive: `textFaint`
- Auto-hide on active scroll, slide back after 850ms idle

### 7C. Full scroll section order:
```
1.  Hero Identity Card (always)
     ↕ 12px
2.  Streak Banner (if streak ≥ 2)
     ↕ 12px
3.  The Drop (1-3 items or contextual message)
     ↕ 16px
4.  Photo Strip (if photos exist)
     ↕ 16px
5.  Next Up — event + RSVP (if event exists)
     ↕ 12px
6.  Chat Peek (flat row)
     ↕ 16px
7.  Quick Props row
     ↕ 12px
8.  Active Challenge (if exists)
     ↕ 16px
9.  Last Game Stats (if game stats exist)
     ↕ 24px
10. Closing Mascot + XP callback
     ↕ 140px bottom padding
```

**On a quiet day with no events, no new badges, no challenge:**
1 → 3 (contextual message) → 6 (all caught up) → 7 → 9 (if stats) → 10

That's 4-5 sections. Fast, tight, still dopamine-oriented because the XP bar and OVR badge are always at the top.

**On a busy game day:**
1 → 2 (streak) → 3 (shoutout + badge + stats) → 4 (photos) → 5 (game) → 6 → 7 → 8 (challenge) → 9 → 10

Full rich scroll — every section earns its space.

### 7D. Conditional section rendering:
- EVERY section that depends on data: if no data, DO NOT RENDER. No empty state cards, no "nothing here yet" messages inside cards. Sections just don't exist.
- The only exception is The Drop — if nothing happened, it shows a contextual forward-looking message instead. It never shows "no notifications."

### 7E. Other roles smoke test:
- [ ] Parent home: unchanged
- [ ] Coach home: unchanged (or coach visual overhaul if it landed)
- [ ] Admin dashboard: unchanged

### 7F. TypeScript:
```bash
npx tsc --noEmit
```

**Commit:** `git add -A && git commit -m "Player Phase 7: Scroll animations, section ordering, final polish" && git push`

---

## VERIFICATION CHECKLIST

**Visual:**
- [ ] Entire player home is dark mode (#0D1B3E background)
- [ ] Hero card shows player name, team, position, jersey number from real data
- [ ] OVR badge shows computed rating with glow animation
- [ ] XP bar shows correct level/progress with shimmer animation
- [ ] Streak banner appears when streak ≥ 2, pulses
- [ ] The Drop shows real shoutouts/badges/stats (or contextual message if none)
- [ ] Photo strip shows real team photos (or hides if none)
- [ ] Next Up shows real next event with working RSVP button
- [ ] Challenge shows real challenge progress (or hides if none/table missing)
- [ ] Last game stats show real per-game numbers (or hides if none)
- [ ] Personal best callout appears when stat is season high
- [ ] Closing shows correct XP-to-next-level

**Data:**
- [ ] XP formula matches web admin exactly
- [ ] OVR formula matches web admin exactly
- [ ] Rankings compute correctly
- [ ] RSVP button actually creates/updates event_rsvps record
- [ ] Missing tables (shoutouts, challenges, etc.) handled gracefully — no crashes

**Navigation:**
- [ ] Tapping OVR badge → future profile screen (or toast "Coming soon")
- [ ] Tapping Drop items → relevant screen (or toast)
- [ ] Tapping photo → lightbox or team hub
- [ ] Tapping Next Up card → event detail
- [ ] Tapping chat peek → chat tab
- [ ] Tapping quick props → shoutout creation (or toast)
- [ ] Tapping challenge → challenge detail (or toast)
- [ ] Tapping last game stats → game recap (or toast)
- [ ] Role selector works (if visible on player home)

**Performance:**
- [ ] All animations 60fps — no jank
- [ ] Scroll is smooth
- [ ] Data loads without blocking render (show skeleton/loading state)

---

*This transforms the player from a "my coach makes me use this" experience into a "I need to check this before TikTok" experience. The XP bar, OVR badge, streak counter, and personal bests create a constant feedback loop of validation. Every number on this screen comes from showing up and working hard. That's more powerful than any algorithm.*
