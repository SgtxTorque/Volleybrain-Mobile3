# LYNX Mobile Redesign — Design Handoff Document
## Parent Home Dashboard · Scroll-Driven Interaction Model
### Session Date: March 2, 2026

---

## 1. PROJECT CONTEXT

**App:** Lynx (formerly VolleyBrain) — dual-platform youth sports club management  
**Stack:** React Native / Expo (mobile) + React / Vite (web admin) + Supabase backend  
**GitHub:** SgtxTorque repos (`volleybrain-admin`, `volleybrain-mobile`)  
**Brand Book:** https://lynxbrandbookv12.vercel.app/  
**Domain:** thelynxapp.com  
**Social:** @thelynxapp (Twitter, TikTok, Facebook), @lynxsportsapp (Instagram)

**This document covers:** The Parent Home Dashboard redesign for the mobile app. This is the first screen parents see when opening Lynx. It is the highest-traffic screen and sets the tone for the entire mobile experience.

---

## 2. DESIGN PROBLEM

### Current State (What Exists)
The current Lynx mobile app has a functional parent dashboard that works but lacks visual personality. Key issues identified through screenshot analysis:

- **Cards are crammed edge-to-edge** with minimal horizontal margin and almost no breathing room between sections
- **Typography hierarchy is flat** — section headers like "TROPHY CASE," "SHOUTOUTS," "SEASON SNAPSHOT" all compete at the same visual weight
- **Color palette does too much** — teal links, orange badges, green progress bars, red notifications, yellow attention circles, blue chat bubbles all on screen simultaneously
- **Player dashboard (dark mode)** has gaming-HUD aesthetic with glowing rings and neon accents that feels dated
- **No photo/imagery fallbacks** — empty player cards show blank gradients instead of meaningful placeholders
- **Static information display** — every card is the same all the time regardless of context or urgency

### Parent dashboard currently contains:
- Hero event card (practice/game with RSVP + Directions)
- "X things need attention" banner
- Team Hub social feed preview
- My Players horizontal scroll (player hero cards)
- Player Progress (Level/XP)
- My Engagement section
- Chat preview
- Season Snapshot (latest game + record)
- Outstanding Balance with Pay Now
- Bottom navigation: Home, Schedule, Chat, More

### What the current app does well:
- Content architecture is solid — right sections in the right order for each role
- Bottom nav is clean with 4 contextual tabs per role
- Event hero cards have the right information (type, date, time, location, RSVP)
- Season record visualization works

---

## 3. INSPIRATION ANALYSIS

Nine inspiration screenshots were analyzed. The key visual qualities extracted:

### From invite.png (airy, illustration-forward)
- Massive whitespace above and below content
- Friendly, approachable illustration as the emotional anchor
- Content centered, breathing, feels like opening a letter from a friend
- **Application:** Welcome/onboarding state, registration flows, referral features

### From subscription.png (playful mascot + clean choices)
- Playful character (broccoli mascot) dominating the center of the screen
- Clean white cards with simple choices below
- Single-focus layout with generous padding
- Bold CTA button
- **Application:** Lynx cub as UI companion in choice moments, role selection, volunteer prompts

### From dont_know.png (rich photo grid + bold overlapping type)
- Dark surfaces with gorgeous photography creating contrast
- Bold confident typography without crowding
- Grid layout: one big card + two smaller cards below (magazine-style asymmetric grid)
- Intentional negative space
- **Application:** My Athletes grid, photo-forward player cards, content hierarchy

### From event_scrolling.png (hero image cards with layered text)
- Hero-image-forward card with bold overlapping typography
- Event details layered on atmospheric photo
- Visual stories approach to schedule (not boring calendar list)
- Quick action (RSVP) accessible without drilling in
- **Application:** Event hero cards, practice/game/tournament cards

### From game_recap_scroll.png (flight ticket stacked cards)
- Flight ticket / boarding pass card metaphor
- Big bold typography for scores/destinations
- Stacked scrollable cards with subtle depth
- Team-to-team directional flow
- **Application:** Game recap cards, season history, match results

### From daughters_favorite.png (badges, achievements, mascot energy)
- Carlos's daughter (target demographic) responded to this
- Game Day Journey progress bar, badges, shoutouts, streak/XP
- Lynx cub appears contextually throughout
- Things happening — energy, not just information
- **Application:** Player dashboard, achievement system, engagement loops

### Key Synthesis Principles:
1. **Light mode as foundation** — not abandoning richness, but flipping from 90% dark to 80% light with dark moments that hit harder because of contrast
2. **Hero photography drives emotion** — information layered behind beautiful entry points, not data density
3. **Lynx cub as real UI companion** — appears in empty states, celebrations, onboarding, context-appropriate throughout (like Duolingo's owl)
4. **Scroll-based discovery** — cards you flip through, not grids you stare at
5. **Whitespace is not wasted space** — every element needs room to breathe

---

## 4. COMPETITIVE EXPLORATION

### Vercel v0 Generated 5 Variants
- All went dark mode (not requested)
- No photos/imagery (missed brief)
- V1 "Airy Welcome" and V3 "Dashboard Cards" were strongest
- V1: Centered mascot welcome, clean stacked cards below
- V3: Day-strip calendar at top, compact 2x2 metric grid, atmospheric event card
- V4: Strong athlete hero with jersey number, game score ticket-style

### Google Stitch Generated Variants
- Closely replicated current app from reference screenshots
- Less useful for reimagining — better as a replication tool

### Key takeaways from competition:
- V1's welcome screen energy + V3's calendar strip and metric grid = the foundation
- Both tools failed to capture the inspiration screenshots' spatial quality
- Neither produced scroll-driven interactions — that's the differentiator

---

## 5. CHOSEN DIRECTION: SCROLL-DRIVEN PARENT HOME

### The Big Idea
The parent home is NOT a static dashboard. It is a **single continuous scroll experience** — one living feed where the UI responds to how you're moving through it. Welcome → Calendar → Events → Athletes → Stats → Social — and the interface reacts to your attention and scroll behavior.

### Interaction Model (Industry Terms)

| Behavior | Industry Term | Example Reference |
|----------|---------------|-------------------|
| Welcome collapses into compact header on scroll | **Sticky header morphing** | Instagram Stories bar, iOS contacts |
| Day-strip calendar slides in as welcome disappears | **Scroll-linked transition** | Apple product pages |
| Event card background image fades in on scroll approach | **Parallax reveal** | iOS App Store "Today" cards |
| Cards expand with detail on slow scroll, stay compact on fast scroll | **Velocity-sensitive progressive disclosure** | Rare/premium pattern |
| Bottom nav slides away while scrolling, returns when stopped | **Auto-hiding navigation** | Uber, Chrome mobile |
| Contextual messages cycle under welcome with mascot animation changes | **Ambient notification / companion UI** | Duolingo owl states |

### Full Scroll Journey (Top to Bottom)

**INITIAL STATE (no scroll):**
- Full-screen welcome section
- Lynx cub mascot centered, animated (float/wiggle/bounce depending on alert type)
- "Welcome back, Sarah Johnson"
- Speech bubble card below name with cycling contextual messages:
  - "Coach needs a headcount. Is Ava playing Saturday?" (mascot: curious/wiggle)
  - "Final buzzer for registration fees is April 12th. Secure Ava's spot!" (mascot: urgent/bounce)
  - "Ava earned a new badge yesterday! She's on a roll 🔥" (mascot: excited/float)
- Messages cycle every 5 seconds with fade transition + dot indicators
- Top of the event hero card JUST VISIBLE above the bottom nav bar as a teaser
- Notification bell visible in top-right with badge count
- Bottom nav visible: Home (active), Schedule, Chat (7), More (12)

**SCROLL BEGINS (0-140px):**
- Welcome section smoothly collapses (mascot shrinks, greeting fades)
- Compact header fades in: Lynx icon + "LYNX" + bell + avatar
- Day-strip calendar slides DOWN from under the compact header
- Calendar should be FULLY VISIBLE by the time the event card reaches the calendar's vertical position
- Saturday also has an event dot (future game)
- Bottom nav slides away

**EVENT HERO CARD (main viewport):**
- Dark navy card with atmospheric sky/cloud gradient that REVEALS as the card scrolls toward top
- Volleyball silhouette fades in
- Green pulse dot + "TODAY · 6:00 PM"
- "PRACTICE" in large Bebas Neue
- "📍 Frisco Fieldhouse"
- "Black Hornets Elite"
- Two buttons: RSVP (solid sky blue) + Directions (glass/outlined)
- Card has depth shadow, 22px border radius

**ATTENTION BANNER:**
- Warm cream/amber background
- Rounded orange circle with number "2"
- "2 things need attention" with chevron
- Tappable — leads to attention items list

**MY ATHLETE CARD (velocity-sensitive):**
- Compact state: Red/crimson avatar square with jersey "13", "MY ATHLETE" label, "Ava", "Black Hornets Elite · Setter · #1", "LVL 4" badge
- **Slow scroll expansion:** Stats row slides out below — OVR 56, HIT% 100%, SERVE 100%, ASSISTS 22
- **Fast scroll:** Stays compact
- **Scroll away:** Stats collapse back
- Card slightly scales up (1.015x) during slow-scroll focus
- Entire card tappable → goes to full player profile

**METRIC GRID (2x2):**
Each cell is tappable to drill into detail.

| Record | Balance |
|--------|---------|
| 🏆 6-1, Won 50-12 | 💳 $210, Due Apr 12 |
| **Slow-scroll expand:** Ava stats + opponent | **Dynamic:** Shows due date context, or "All caught up!" if $0 |

| Progress | Chat |
|----------|------|
| ⭐ 750/800 XP + gradient bar | 💬 Team Chat, 1 unread |
| | **Slow-scroll expand:** Preview of last message |

- Balance card disappears entirely if balance is $0 (grid becomes 2+1 layout)
- Record card expands on slow scroll to show brief game detail text

**TEAM HUB:**
- Section header "TEAM HUB" + "View All" link
- Latest post card: avatar + "Coach Carlos gave Ava a 🎯 Clutch Player shoutout!" + timestamp
- **Slow-scroll expand:** Second post appears ("New photos from last practice")
- Tappable → goes to full Team Hub feed

**SEASON SNAPSHOT:**
- Large Bebas Neue numbers: 6 Wins (green) | 1 Loss (red)
- "Latest Game: WON 50-12"
- Horizontal win-rate bar

**RECENT BADGES:**
- Horizontal chip/pill layout
- "🎺 Hype Machine", "📣 First Shoutout", "⚔️ First Blood"
- Tappable → goes to trophy case

**END OF SCROLL:**
- Lynx cub mascot at 35% opacity
- "That's everything for now!"
- Generous bottom padding so last content clears nav bar

**SCROLL STOPS (800-900ms idle):**
- Bottom nav slides back up smoothly

---

## 6. BRAND SYSTEM FOR MOBILE

### Colors
```
Navy Deep:     #0D1B3E  (dark backgrounds, event cards)
Navy:          #10284C  (headers, text primary, dark elements)
Sky Blue:      #4BB9EC  (primary accent, links, active states, CTAs)
Sky Light:     #6AC4EE  (hover states, secondary accent)
Gold:          #FFD700  (achievements, level badges, premium moments)
Gold Warm:     #D9994A  (mascot-related, amber warmth)
White:         #FFFFFF  (card backgrounds)
Off-White:     #F6F8FB  (page background, light mode)
Warm Gray:     #F0F2F5  (secondary backgrounds)
Border:        #E8ECF2  (card borders, dividers)
Border Light:  #F0F2F5  (subtle borders)
Text Primary:  #10284C  (same as Navy)
Text Muted:    rgba(16,40,76,0.4)
Text Faint:    rgba(16,40,76,0.25)
Success:       #22C55E  (wins, positive actions)
Error:         #EF4444  (losses, badges, urgent items)
Teal:          #14B8A6  (position badges, secondary success)
```

### Typography
```
Display/Headlines: Bebas Neue (scores, event names, section heroes — large, uppercase)
Body/UI:          Plus Jakarta Sans (or Outfit per brand book) — weights 400-800
Section Headers:  11px, weight 700, letter-spacing 0.1em, uppercase, color: Text Faint
Card Titles:      15-22px, weight 700-800, color: Text Primary
Body Text:        12-14px, weight 500-600, generous line-height (1.4-1.5)
Big Numbers:      28-36px, weight 800, Bebas Neue
```

### Spacing
```
Page padding:     20-24px horizontal
Card padding:     16-20px internal
Card border-radius: 16-22px
Card gap:         10-16px between cards
Section gap:      16-20px between sections
Card shadow:      0 2px 12px rgba(16,40,76,0.04) (light cards)
                  0 4px 24px rgba(16,40,76,0.15) (hero cards)
```

### Bottom Navigation
```
Height: 78px (includes safe area padding)
Background: rgba(255,255,255,0.95) with backdrop-blur(20px)
Border-top: 1px solid #E8ECF2
Tabs: Home (active), Schedule, Chat (badge), More (badge)
Active color: Sky Blue (#4BB9EC)
Inactive: 35% opacity
Badge: Error red, 9px font, min-width 16px
Auto-hide: translateY(100px) on scroll, returns after 800-900ms idle
Transition: 0.45s cubic-bezier(0.16, 1, 0.3, 1)
```

---

## 7. TECHNICAL IMPLEMENTATION NOTES

### Required React Native Libraries
- `react-native-reanimated` — scroll-linked animations, shared values, interpolation
- `react-native-gesture-handler` — velocity detection, gesture composition
- `react-native-safe-area-context` — dynamic island / notch handling
- `@react-navigation/bottom-tabs` — existing nav (modify for auto-hide)

### Scroll Animation Architecture
```
useAnimatedScrollHandler → tracks scrollY + velocity
useAnimatedStyle → drives transforms per component based on scrollY thresholds
interpolate() from reanimated → maps scroll ranges to visual properties
```

### Key Thresholds (MUST be tuned on device, not desktop)
These values are starting points — they MUST be tested on an actual phone because scroll behavior differs dramatically between mouse wheel and touch:

```
Welcome collapse:    0 → 140px (welcome height shrinks to 0)
Calendar appearance: 30 → 110px (slides in from under header)  
Event image reveal:  150 → 270px (sky gradient opacity 0→1)
Athlete card expand: When card is in center 40% of viewport AND velocity < 350px/s
Record expand:       Same velocity logic, different scroll position
Chat expand:         Same velocity logic, different scroll position
Team Hub expand:     Same velocity logic, different scroll position
Nav hide:            Any scroll movement > 2px
Nav show:            800-900ms of scroll idle
```

### Velocity Detection
```javascript
// Average over last 6 scroll events to smooth out jitter
// "Slow" threshold: < 350 pixels/second
// This determines whether progressive disclosure cards expand
```

### Dynamic Content Rules
- Balance card: Query Supabase for outstanding balance. If $0, render "All caught up!" chip or hide entirely
- Contextual messages: Query for pending actions (unconfirmed RSVPs, unpaid balances, coach messages needing response) and generate mascot messages dynamically
- Mascot animation state: Map to message type (question → wiggle, deadline → bounce, celebration → float)
- Event card: Show most imminent upcoming event. If no events today, show next scheduled event with different styling

---

## 8. WHAT THIS DOCUMENT DOES NOT COVER (FUTURE WORK)

- Coach Home Dashboard redesign
- Player Home Dashboard redesign  
- Admin Home Dashboard redesign
- App drawer / gesture navigation (already built, may replace bottom tabs later)
- Full event detail screen
- Full player profile screen
- Game Day mode
- Registration / onboarding flow with mascot
- Dark mode toggle (currently only parent is light mode)
- Actual Lynx cub mascot illustrations (currently using 🐱 emoji as placeholder)

---

## 9. PROTOTYPE ARTIFACTS

Two interactive React JSX prototypes were built during this session:

1. **lynx-scroll-prototype.jsx** — v1, initial scroll-driven concept
2. **lynx-scroll-v2.jsx** — v2, updated with feedback (cycling messages, mascot animations, card expansions, dynamic balance, better spacing)

Both render in Claude artifacts as interactive phone mockups. They demonstrate the interaction model but have scroll threshold issues when used with mouse (designed for touch). The thresholds documented in Section 7 are the corrected targets.

Additionally, v0 generated 5 static mockup variants available in the zip file with TSX source code. V1 (Airy Welcome) and V3 (Dashboard Cards) were the strongest references.

---

## 10. SUMMARY OF KEY DESIGN DECISIONS

1. ✅ Light mode as default for parent mobile (dark moments for event cards and chat)
2. ✅ Single continuous scroll — no tabs or sub-navigation on home
3. ✅ Mascot as animated UI companion with context-sensitive states
4. ✅ Cycling contextual messages that speak directly to the parent about actionable items
5. ✅ Day-strip calendar in sticky header (appears on scroll)
6. ✅ Velocity-sensitive progressive disclosure on cards
7. ✅ Auto-hiding bottom navigation
8. ✅ Event hero card with parallax image reveal
9. ✅ Dynamic balance card (disappears when caught up)
10. ✅ No photos in initial implementation — imagery via gradients, icons, and mascot
11. ✅ V1 welcome energy fused with V3 information architecture
12. ✅ All cards tappable — home is a launchpad, not the destination

---

*Document generated from Lynx Mobile Redesign Vision session, March 2, 2026*
*Brand Book: https://lynxbrandbookv12.vercel.app/*
*Prototype files: lynx-scroll-v2.jsx (primary), lynx-scroll-prototype.jsx (v1)*
