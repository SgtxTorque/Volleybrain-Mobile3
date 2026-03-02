# CC-LYNX-REBRAND.md
## Lynx Mobile App — Brand Transition Plan
### For Claude Code Execution

**Prerequisite:** Read `CC-LYNX-RULES.md` in the project root. All 15 rules apply.

**IMPORTANT:** This rebrand does NOT touch fonts. Leave all font families, sizes, and weights exactly as they are. Carlos is still dialing in typography separately.

---

## WHAT'S CHANGING

| Area | Before (VolleyBrain) | After (Lynx) |
|------|---------------------|--------------|
| App Name | "VolleyBrain" | "Lynx" |
| Tagline | "Youth Volleyball Management" | "Youth Sports Management" |
| Logo | 🏐 volleyball emoji | Lynx icon logo (actual image) |
| App Icon | Generic icon.png | Lynx face icon (lynx-icon-logo.png) |
| Splash Screen | Generic splash-icon.png | Lynx icon on brand background |
| Primary Color | Steelblue `#2C5F7C` | Lynx Sky `#4BB9EC` |
| Dark Mode BG | Current dark grays | Lynx Midnight `#0A1B33` |
| Email/URLs | volleybrain.com | thelynxapp.com |
| Share Messages | "...on VolleyBrain!" | "...on Lynx!" |
| Version Text | "VolleyBrain v1.0.0" | "Lynx v1.0.0" |
| Mascot | None | Lynx cub (for empty states, onboarding) |

## WHAT'S NOT CHANGING
- **Fonts** — leave all typography completely alone
- **Layout** — no structural changes to any screen
- **Functionality** — zero feature changes
- **Database** — no schema changes (tables still named volleybrain internally)
- **Repo name** — stays `Volleybrain-Mobile3` (renaming repos causes too many issues)
- **Internal code references** — file names, variable names, import paths stay as-is
- **Player PLAYER_THEME** — the dark player theme stays, just gets Lynx colors

---

## OFFICIAL LYNX BRAND PALETTE

### Light Mode Surfaces
| Token | Hex | Usage |
|-------|-----|-------|
| Cloud | `#F5F7FA` | Page background |
| White | `#FFFFFF` | Card background |
| Frost | `#F0F3F7` | Inner panels, secondary surfaces |
| Silver | `#DFE4EA` | Borders, dividers |
| Ice Blue | `#E8F4FD` | Highlights, selected states |

### Dark Mode Surfaces
| Token | Hex | Usage |
|-------|-----|-------|
| Midnight | `#0A1B33` | Page background |
| Charcoal | `#1A2332` | Card background |
| Graphite | `#232F3E` | Inner panels |
| Border Dark | `#2A3545` | Borders, dividers |

### Brand Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Navy | `#10284C` | Headers, primary text, nav bar |
| Sky Blue | `#4BB9EC` | ALL interactive elements (buttons, links, active states) |
| Deep Sky | `#2A9BD4` | Hover/pressed states |
| Slate | `#5A6B7F` | Secondary text, labels |

### Semantic Colors (keep existing)
| Token | Hex | Usage |
|-------|-----|-------|
| Success | `#10B981` | Green — confirmations |
| Warning | `#F59E0B` | Amber — caution |
| Danger | `#EF4444` | Red — errors, destructive |
| Info | `#4BB9EC` | = Sky Blue (same as brand accent) |

---

## PHASES

### PHASE 1: Brand Assets — Logo, Icon, Splash
**Goal:** Replace the volleyball emoji and generic icons with the real Lynx assets.

**Brand assets are on the local machine at:** `C:\Users\fuent\Desktop\DIGIJOY\Lynx\`

**Tasks:**

1. **Copy logo files into the repo from the local Lynx folder:**
   - Copy `C:\Users\fuent\Desktop\DIGIJOY\Lynx\lynx-icon-logo.png` → `assets/images/lynx-icon.png` (the face icon — used for in-app logo, splash, app icon)
   - Copy `C:\Users\fuent\Desktop\DIGIJOY\Lynx\lynx-logo.png` → `assets/images/lynx-logo.png` (the full horizontal logo — icon + "lynx" text)
   - Copy `C:\Users\fuent\Desktop\DIGIJOY\Lynx\Meet-Lynx.png` → `assets/images/lynx-mascot.png` (single mascot pose — for empty states, onboarding, welcome screen)

2. **Generate app icons from lynx-icon-logo.png:**
   - `assets/images/icon.png` — Replace with Lynx icon, 1024x1024, on `#0A1B33` (Midnight) background
   - `assets/images/favicon.png` — Lynx icon, 48x48
   - `assets/images/splash-icon.png` — Lynx icon, 1024x1024, transparent or on brand bg
   - `assets/images/android-icon-foreground.png` — Lynx icon face centered (with safe zone padding for adaptive icons)
   - `assets/images/android-icon-background.png` — Solid `#0A1B33` background
   - `assets/images/android-icon-monochrome.png` — White silhouette version of the Lynx icon on transparent bg

3. **Update `app.json`:**
   ```json
   "name": "Lynx",
   "slug": "Lynx",
   "scheme": "lynx",
   ```
   Keep icon paths the same (they point to `assets/images/icon.png` etc.)

4. **Update splash screen config in `app.json`:**
   ```json
   "backgroundColor": "#0A1B33",
   "dark": {
     "backgroundColor": "#0A1B33"
   }
   ```

**Commit:**
```bash
git commit -m "feat: Lynx Rebrand Phase 1 - app icon, splash screen, logo assets"
```

---

### PHASE 2: Color System — Theme Palette Update
**Goal:** Update the theme system to use the official Lynx brand palette. NO FONT CHANGES.

**File:** `lib/theme.tsx`

**Tasks:**

1. **Add a `lynx` accent color** to the `accentColors` record (and make it the default):
   ```typescript
   lynx: { primary: '#4BB9EC', light: '#E8F4FD', dark: '#2A9BD4', glow: 'rgba(75, 185, 236, 0.15)' },
   ```

2. **Update the `AccentColor` type** to include `'lynx'` as an option.

3. **Update light theme colors:**
   - `background` → `#F5F7FA` (Cloud)
   - `card` → `#FFFFFF` (White)
   - `primary` → `#4BB9EC` (Sky Blue)
   - `info` → `#4BB9EC` (Sky Blue, same as primary)
   - `border` → `#DFE4EA` (Silver)
   - `text` → `#10284C` (Navy) — or keep existing if it already works well
   - `textSecondary` → `#5A6B7F` (Slate)
   - Verify contrast ratios are acceptable before changing text colors

4. **Update dark theme colors:**
   - `background` → `#0A1B33` (Midnight)
   - `card` → `#1A2332` (Charcoal)
   - `primary` → `#4BB9EC` (Sky Blue — same in both modes)
   - `info` → `#4BB9EC`
   - `border` → `#2A3545` (Border Dark)
   - `glassCard` → adjust to use Charcoal with opacity

5. **Set default accent to `lynx`** instead of `steelblue`. Keep all other accent options available (users can still pick orange, purple, etc. in settings).

6. **DO NOT change:**
   - Any font family, size, or weight
   - The AccentColor picker UI (just add `lynx` as a new option)
   - The Player PLAYER_THEME structure (just update its default colors to use Lynx palette)
   - `success`, `warning`, `danger` semantic colors (keep existing values)

**Commit:**
```bash
git commit -m "feat: Lynx Rebrand Phase 2 - brand color palette, Sky Blue primary, Midnight dark mode"
```

---

### PHASE 3: Auth Screens — Login, Signup, Welcome
**Goal:** Replace VolleyBrain text and volleyball emoji with Lynx branding on all auth screens.

**Files:** `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `app/(auth)/welcome.tsx`, `app/(auth)/parent-register.tsx`

**Tasks:**

1. **Login screen (`login.tsx`):**
   - Replace `🏐` emoji with actual Lynx logo image: `<Image source={require('@/assets/images/lynx-logo.png')} />` (the horizontal logo with icon + "lynx" text)
   - Remove the `logoEmoji` text element entirely
   - Replace `"VolleyBrain"` text → not needed if using the logo image (the logo image already contains "lynx" text)
   - Replace `"Youth Volleyball Management"` → `"Youth Sports Management"`
   - Also apply the keyboard avoidance fix: change the inner `<View style={s.content}>` to a `<ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>`. The `<Modal>` for forgot password stays OUTSIDE the ScrollView.
   - Style the logo image: ~200px wide, resizeMode `contain`, centered

2. **Signup screen (`signup.tsx`):**
   - Same logo swap as login (replace 🏐 + "VolleyBrain" with Lynx logo image)
   - Replace any "VolleyBrain" text → "Lynx"

3. **Welcome screen (`welcome.tsx`):**
   - Replace "VolleyBrain" → "Lynx"
   - Replace volleyball emoji with Lynx mascot image (the single-pose cub from `assets/images/lynx-mascot.png`) — perfect spot for the mascot to greet new users
   - Update tagline to "Youth Sports Management"

4. **Parent registration (`parent-register.tsx`):**
   - Replace `"This will be your login for VolleyBrain"` → `"This will be your login for Lynx"`

**Commit:**
```bash
git commit -m "feat: Lynx Rebrand Phase 3 - auth screens with Lynx logo, mascot, and branding"
```

---

### PHASE 4: In-App Text Sweep — Find & Replace All "VolleyBrain"
**Goal:** Replace every remaining "VolleyBrain" string in the codebase with "Lynx".

**Tasks:**

1. **Run a full grep** across the codebase to find every "VolleyBrain" or "volleybrain" string:
   ```bash
   grep -rn "VolleyBrain\|volleybrain" app/ components/ lib/ constants/ --include="*.tsx" --include="*.ts"
   ```

2. **Replace user-facing strings ONLY.** Here's the known list:

   | File | Old | New |
   |------|-----|-----|
   | `app/(tabs)/me.tsx` | "VolleyBrain v1.0.0" | "Lynx v1.0.0" |
   | `app/help.tsx` | "support@volleybrain.com" | "support@thelynxapp.com" |
   | `app/help.tsx` | "VolleyBrain v{version}" | "Lynx v{version}" |
   | `app/invite-friends.tsx` | "app.volleybrain.com" | "app.thelynxapp.com" |
   | `app/invite-friends.tsx` | "on VolleyBrain!" | "on Lynx!" |
   | `app/privacy-policy.tsx` | "VolleyBrain collects..." | "Lynx collects..." |
   | `app/privacy-policy.tsx` | "privacy@volleybrain.com" | "privacy@thelynxapp.com" |
   | `app/terms-of-service.tsx` | all "VolleyBrain" → "Lynx" |
   | `components/AchievementCelebrationModal.tsx` | "#VolleyBrain" | "#Lynx #LynxSports" |
   | `components/AdminDashboard.tsx` | "on VolleyBrain" | "on Lynx" |
   | `components/AdminDashboard.tsx` | "VolleyBrain" in invite messages | "Lynx" |
   | `components/AppDrawer.tsx` | "VolleyBrain v1.0.0" | "Lynx v1.0.0" |
   | `components/PlayerDashboard.tsx` | "Welcome to VolleyBrain!" | "Welcome to Lynx!" |
   | `components/ShareRegistrationModal.tsx` | "app.volleybrain.com" | "app.thelynxapp.com" |
   | `components/payments-admin.tsx` | "VolleyBrain app" | "Lynx app" |

3. **DO NOT rename:**
   - File names or import paths (keep `volleybrain-mobile3`, file names, etc.)
   - Supabase table names or column names
   - Git repo name
   - Internal comments (code comments can stay, but update if they're user-visible)

4. **Verify after replacement** that no "VolleyBrain" remains in user-facing strings:
   ```bash
   grep -rn "VolleyBrain" app/ components/ --include="*.tsx" --include="*.ts" | grep -v "// " | grep -v "import"
   ```

**Commit:**
```bash
git commit -m "feat: Lynx Rebrand Phase 4 - replace all VolleyBrain text with Lynx across app"
```

---

### PHASE 5: Drawer, Navigation & Chrome
**Goal:** Update the navigation drawer, tab bar, and app-wide chrome with Lynx branding.

**Tasks:**

1. **GestureDrawer.tsx:**
   - Verify footer already says "Lynx v1.0.0" (it should from the drawer build)
   - If the drawer profile header has any "VolleyBrain" fallback text, replace with "Lynx Sports"
   - The org name fallback should be "Lynx Sports" not "VolleyBrain"

2. **Tab bar accent:**
   - The active tab icon tint should use `colors.primary` which is now Sky Blue `#4BB9EC`
   - Verify this looks good in both light and dark mode
   - If `tabBarActiveTintColor` is hardcoded anywhere, replace with the theme color

3. **App header bar (if one exists globally):**
   - Any "VolleyBrain" text → "Lynx"
   - Any volleyball emoji → Lynx icon

4. **Empty states across the app:**
   - Where you see `🏐` used as a placeholder icon in empty states, replace with the Lynx mascot image (`assets/images/lynx-mascot.png`) — this is the single-pose cub, perfect for friendly empty states
   - Key empty states to update: no teams, no chats, no schedule events, no players, welcome/onboarding
   - Size the mascot at ~120-150px width, centered, with a friendly message below
   - This gives the app personality and makes empty states feel intentional rather than broken

**Commit:**
```bash
git commit -m "feat: Lynx Rebrand Phase 5 - drawer, navigation chrome, empty state mascots"
```

---

### PHASE 6: Verification & Cleanup
**Goal:** Final sweep to confirm the rebrand is complete and nothing is broken.

**Tasks:**

1. **Run `npx tsc --noEmit`** — fix any TypeScript errors from the changes

2. **Visual grep for stragglers:**
   ```bash
   grep -rn "VolleyBrain\|volleybrain\|Volley Brain" app/ components/ lib/ constants/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".git"
   ```
   The only remaining references should be in comments, internal file paths, or the repo name itself.

3. **Verify `app.json`** says "Lynx" for name and slug

4. **Smoke test per role:**
   - Login screen → should show Lynx logo, not 🏐
   - Admin dashboard → no "VolleyBrain" visible
   - Coach dashboard → no "VolleyBrain" visible
   - Parent dashboard → no "VolleyBrain" visible
   - Player dashboard → no "VolleyBrain" visible
   - Drawer → "Lynx v1.0.0" in footer
   - Me/Settings → "Lynx v1.0.0"
   - Help screen → "support@thelynxapp.com"
   - Invite flow → "thelynxapp.com" URLs, "Join ... on Lynx!"
   - Privacy/Terms → "Lynx" throughout

5. **Color spot check:**
   - Primary accent should be Sky Blue (#4BB9EC) by default
   - Dark mode backgrounds should be navy-tinted (Midnight #0A1B33), not pure gray/black
   - Light mode should feel cleaner with Cloud (#F5F7FA) backgrounds
   - Buttons, links, active states all use Sky Blue

**Commit:**
```bash
git commit -m "feat: Lynx Rebrand Phase 6 - verification, cleanup, final polish"
```

---

## SUMMARY: FILE CHANGES BY PHASE

| Phase | Scope | Key Files |
|-------|-------|-----------|
| 1 | Assets | `assets/images/*`, `app.json` |
| 2 | Colors | `lib/theme.tsx` |
| 3 | Auth | `app/(auth)/login.tsx`, `signup.tsx`, `welcome.tsx`, `parent-register.tsx` |
| 4 | Text | 15+ files across `app/` and `components/` |
| 5 | Chrome | `components/GestureDrawer.tsx`, `app/(tabs)/_layout.tsx`, empty states |
| 6 | Verify | Grep + smoke test |

## FILES NOT TO TOUCH
- `lib/theme.tsx` font-related properties (fontFamily, fontSize, fontWeight, letterSpacing)
- Database schema, Supabase config
- Any layout or structural code
- Package.json (no new deps needed)
- Repo name, git remote URL
