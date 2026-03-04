# LYNX-REFERENCE-GUIDE.md
# Design Reference Map — Include In Every CC Spec

**Location:** All reference assets live in `reference/design-references/`

Read the relevant sections before writing any code. These files contain the brand system, mascot assets, v0 mockup components, and screen-level design direction that should inform every visual decision.

---

## FOLDER MAP

```
reference/design-references/
├── brandbook/
│   ├── LynxBrandBook.html              ← MASTER BRAND SYSTEM
│   └── lynx-screen-playbook-v2.html    ← SCREEN-BY-SCREEN DESIGN SPECS
├── handoff/                             ← Design handoff specs
├── images/                              ← MASCOT & BRAND ASSETS (PNG/JPG)
│   ├── celebrate.png                    ← Mascot celebrating (use: achievements, success states)
│   ├── HiLynx.png                      ← Mascot waving (use: welcome screen, onboarding)
│   ├── laptoplynx.png                  ← Mascot with laptop (use: web redirect screen, loading)
│   ├── lynx-icon-logo.png              ← App icon (use: login header, splash)
│   ├── lynx-logo.png                   ← Logo wordmark (use: auth screens, headers)
│   ├── Meet-Lynx.png                   ← Mascot intro pose (use: first-launch tour, about)
│   ├── SleepLynx.png                   ← Mascot sleeping (use: empty states, "nothing here yet")
│   ├── volleyball-game.jpg             ← Action photo (use: game-related screens, hero images)
│   └── volleyball-practice.jpg         ← Practice photo (use: schedule, practice events)
├── player-mockups/                      ← V0-GENERATED PLAYER SCREEN MOCKUPS
│   ├── globals.css                      ← Shared styles for mockups
│   ├── m1-roster-carousel.tsx           ← Roster carousel design (use: team roster, coach views)
│   ├── m2-player-card.tsx               ← Player card design (use: child detail, player profile)
│   ├── s1-player-home.tsx               ← Player home screen design (use: PlayerHomeScroll ref)
│   ├── s2-badges-challenges.tsx         ← Badges & challenges design (use: achievements, challenges)
│   ├── s4-game-recap.tsx                ← Game recap screen design (use: game recap feature)
│   └── s5-team-pulse.tsx                ← Team pulse/activity design (use: team hub, coach dash)
├── prototypes/                          ← Prototype files (check contents)
└── v0-mockups/                          ← FULL NEXT.JS PROJECT FROM VERCEL V0
    ├── app/                             ← Page-level mockup routes
    ├── components/                      ← Styled React components (web — translate to RN)
    ├── hooks/                           ← Custom hooks from mockups
    ├── lib/                             ← Utilities
    ├── public/                          ← Static assets
    ├── styles/                          ← CSS/Tailwind styles
    └── package.json                     ← Dependencies list (shows what libraries v0 used)
```

---

## WHAT TO READ PER WAVE

### Wave 0 (Cleanup)
- Nothing needed — this is file archival, not visual work

### Wave 1 (Shared Components Brand Pass)
- `brandbook/LynxBrandBook.html` — Extract exact color values, font names, spacing, card radius, shadow definitions
- `brandbook/lynx-screen-playbook-v2.html` — General design philosophy section
- `v0-mockups/components/` — See how cards, badges, pills, avatars are styled in the v0 versions. Translate patterns to React Native.

### Wave 2 (Auth Redesign)
- `brandbook/LynxBrandBook.html` — Auth screen design tokens
- `brandbook/lynx-screen-playbook-v2.html` — Read the "Auth & Onboarding" section
- `images/HiLynx.png` — USE THIS for the welcome screen mascot (not a placeholder)
- `images/lynx-logo.png` — USE THIS for auth screen headers
- `images/lynx-icon-logo.png` — USE THIS for the login screen logo
- `images/Meet-Lynx.png` — USE THIS for the first-launch tour intro
- `images/SleepLynx.png` — USE THIS for the pending approval / waiting state
- `images/celebrate.png` — USE THIS for the "You're in!" approval celebration

### Wave 3 (Schedule, Chat, Team Hub)
- `brandbook/LynxBrandBook.html` — Component patterns
- `brandbook/lynx-screen-playbook-v2.html` — Read "Schedule & Events", "Chat & Communication", "Team Hub & Social" sections
- `v0-mockups/components/` — Look for schedule, chat, or team components to reference
- `images/volleyball-game.jpg` — Could be used as a game event hero image
- `images/volleyball-practice.jpg` — Could be used as a practice event image
- `images/SleepLynx.png` — USE THIS for "no events today" empty state

### Wave 4 (Player Identity)
- `player-mockups/m2-player-card.tsx` — READ THIS FIRST. This is the design-approved player card treatment.
- `player-mockups/m1-roster-carousel.tsx` — Roster carousel pattern
- `player-mockups/s1-player-home.tsx` — Player home screen reference
- `player-mockups/s2-badges-challenges.tsx` — Badges and challenges layout
- `player-mockups/s4-game-recap.tsx` — Game recap screen design
- `player-mockups/s5-team-pulse.tsx` — Team activity pulse
- `brandbook/lynx-screen-playbook-v2.html` — Read "Player Identity & Gamification" section

### Wave 5 (Coach Tools)
- `brandbook/lynx-screen-playbook-v2.html` — Read "Coach Tools" section
- `v0-mockups/components/` — Any coach-related components

### Wave 6-8
- `brandbook/` — Always reference for brand consistency
- `lynx-screen-playbook-v2.html` — Always reference for the specific screen being worked on

---

## HOW TO USE MASCOT IMAGES

The mascot images are PNGs with transparent backgrounds. To use them in React Native:

```typescript
// Copy images to assets/ folder if not already there, or reference from design-references
import { Image } from 'react-native';

// Example: Welcome screen
<Image 
  source={require('../../reference/design-references/images/HiLynx.png')} 
  style={{ width: 120, height: 120 }} 
  resizeMode="contain" 
/>
```

**IMPORTANT:** If importing from `reference/` causes build issues, copy the needed images to `assets/images/mascot/` first and import from there. The reference folder is for CC to READ the designs — the actual app should import from `assets/`.

**Mascot usage guide:**
| Image | Emotion/State | Use For |
|-------|--------------|---------|
| `HiLynx.png` | Happy, waving | Welcome, greetings, good news |
| `Meet-Lynx.png` | Friendly, intro | First-time experiences, onboarding |
| `celebrate.png` | Excited, jumping | Achievements, approvals, milestones |
| `SleepLynx.png` | Relaxed, sleepy | Empty states, "nothing here yet", free days |
| `laptoplynx.png` | Working, focused | Web redirect, loading, "setting things up" |
| `lynx-logo.png` | — | Auth headers, branding |
| `lynx-icon-logo.png` | — | App icon, compact branding |

---

## HOW TO USE V0 MOCKUPS

The files in `v0-mockups/` and `player-mockups/` are **React/Next.js web components** (JSX + Tailwind CSS). They are NOT directly usable in React Native. Use them as **visual design reference only:**

1. Read the component's JSX structure to understand the layout
2. Read the Tailwind classes to understand colors, spacing, fonts, radius
3. Translate the visual patterns to React Native StyleSheet equivalents
4. Match the visual result, not the code implementation

Example translation:
```
Web (Tailwind):  className="bg-slate-900 rounded-2xl p-4 border border-sky-500/20"
RN equivalent:   { backgroundColor: '#0A1628', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(75,185,236,0.2)' }
```
