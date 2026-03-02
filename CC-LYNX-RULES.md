# CC-LYNX-RULES.md
## Universal Rules for Claude Code — Lynx Mobile App

**These rules apply to EVERY phase, EVERY prompt, EVERY session. Read them FIRST before doing any work.**

---

## PROJECT IDENTITY

- **App Name:** Lynx (formerly VolleyBrain — code names may still reference "volleybrain" in file names, repo names, and database tables. Do NOT rename these.)
- **Project:** volleybrain-mobile3 (React Native / Expo)
- **Backend:** Supabase (project: uqpjvbiuokwpldjvxiby)
- **GitHub:** SgtxTorque/Volleybrain-Mobile3
- **Branding:** "Lynx" in all user-facing text. Domain: thelynxapp.com. Footer: "Lynx v1.0.0"

---

## THE 15 RULES

### 1. SCHEMA FIRST
Read `SCHEMA_REFERENCE.csv` AND `Supabase_schema.md` (project root) BEFORE writing or modifying ANY query. Verify every table name and column name against them. If a table or column doesn't exist, **flag it and ask** — do NOT guess or assume.

### 2. READ BEFORE YOU WRITE
Before modifying ANY file, read the ENTIRE file first. Understand what's already built and working. Do NOT break existing functionality. If you need to understand a pattern, read 2-3 similar files to see how the codebase does things.

### 3. WEB ADMIN IS SOURCE OF TRUTH
This mobile app shares a Supabase backend with the web admin portal at:
`C:\Users\fuent\Downloads\volleybrain-admin`

When you need to verify correct table names, column names, or query patterns, reference:
- `C:\Users\fuent\Downloads\volleybrain-admin\src\contexts\AuthContext.jsx` (auth patterns)
- `C:\Users\fuent\Downloads\volleybrain-admin\src\MainApp.jsx` (feature list / routing)
- `C:\Users\fuent\Downloads\volleybrain-admin\src\lib\supabase.js` (client config)
- Any page in `C:\Users\fuent\Downloads\volleybrain-admin\src\pages/` for query patterns
- The web app is the source of truth for database schema and query patterns. Make mobile queries match.

### 4. DO NOT BREAK OTHER ROLES
Every role (Admin, Coach, Parent, Player) has a completed UX redesign. Changes to one role MUST NOT break the others. Use role-based conditional rendering. When modifying shared files (navigation, components), **add** conditional logic — do NOT delete what other roles depend on.

### 5. FULL FILE REPLACEMENTS FOR NEW FILES ONLY
When creating new screens or components, write complete files. When modifying existing files, make surgical, targeted changes. Do NOT rewrite or refactor working code that isn't part of the current task.

### 6. VERIFY ALL QUERIES
Every Supabase query must reference real tables and columns from `SCHEMA_REFERENCE.csv` or `Supabase_schema.md`. Flag any mismatch, fix it. No query should reference a table or column that doesn't exist.

### 7. MATCH EXISTING VISUAL STYLE
Review existing screens to understand the current design patterns:
- Tappable cards (not hyperlinks)
- Smooth animations (Reanimated, LayoutAnimation)
- Trading card / hero visual style
- Role-specific theming (Player has dark PLAYER_THEME)
- Accent colors from the theme system
- Consistent spacing using design tokens from `lib/design-tokens.ts`

### 8. SHOW YOUR PLAN FIRST
For each phase, show your implementation plan before coding. List which files you'll create, which you'll modify, and what changes you'll make. Don't start coding without showing the approach.

### 9. COMMIT AFTER EACH PHASE
Complete each phase fully, commit with a descriptive message, then pause for testing before moving to the next phase. Commit format: `feat: [Feature] Phase [X] - [description]`

### 10. NO STRAY CONSOLE LOGS
No `console.log` statements in final code unless gated behind `__DEV__`. Remove all debug logging before committing.

### 11. USE EXISTING AUTH/PERMISSIONS PATTERN
The app uses `usePermissions()` from `lib/permissions-context.tsx` to determine roles:
- `isAdmin`, `isCoach`, `isParent`, `isPlayer` — boolean flags
- `actualRoles` — array of all roles the user has
- `primaryRole` — the main role string
Do NOT use `profile?.role` directly. Always use the established permissions hook.

### 12. CHECK PACKAGES BEFORE INSTALLING
Review `package.json` before adding new dependencies. These are already installed:
- `react-native-gesture-handler` ~2.28.0
- `react-native-reanimated` ~4.1.1
- `react-native-safe-area-context` ~5.6.0
- `expo-image` ~3.0.11
- `expo-haptics` ~15.0.8
- `@expo/vector-icons` (Ionicons)
- `@gorhom/bottom-sheet`
- `expo-router`
If a package is already there, use it. If you need something new, install it and note it in your commit message.

### 13. TYPESCRIPT VALIDATION
After ALL work in each phase, run `npx tsc --noEmit` to confirm zero new TypeScript errors. If pre-existing errors exist in `design-reference/`, ignore those. Report the result.

### 14. REVIEW AUDIT FILES
These files exist in the project root and provide context on what's built:
- `ADMIN_PARITY_AUDIT.md`
- `COACH_PARITY_AUDIT.md`
- `PARENT_PARITY_AUDIT.md`
- `PLAYER_PARITY_AUDIT.md`
- `PARITY_MANIFEST.MD`
- `AGENTS.md` (Codex rules — follow these too)

### 15. MULTI-SPORT AWARENESS
This app supports ALL sports — volleyball, basketball, soccer, baseball, football, hockey, etc. Reference `constants/sport-display.ts` for sport-aware logic. Never hardcode for a single sport.

---

## EXISTING ARCHITECTURE REFERENCE

### Tab Navigation (Bottom Bar)
Current visible tabs: **Home | Game Day | Team | Manage | More (☰)**

The "More" tab (hamburger icon) triggers the navigation drawer instead of navigating to a screen. It uses a `tabBarButton` override with `openDrawer()`.

Hidden tabs (accessible via routes but not visible in tab bar): schedule, chats, messages, players, teams, coaches, payments, reports-tab, settings, my-teams, jersey-management, me

### Key Context Providers (in order, from root _layout.tsx)
1. `GestureHandlerRootView` — wraps entire app
2. `ThemeProvider` — colors, dark/light mode, accent colors
3. `AuthProvider` — user, profile, organization, session, signOut
4. `SeasonProvider` — active season context
5. `PermissionsProvider` — role detection (isAdmin, isCoach, etc.)
6. `DrawerProvider` — drawer open/close state

### File Structure
```
app/
├── _layout.tsx          ← Root layout (providers, GestureDrawer render)
├── (auth)/              ← Login, signup screens
├── (tabs)/
│   ├── _layout.tsx      ← Tab navigator (visible + hidden tabs)
│   ├── index.tsx        ← Home (role-based dashboard)
│   ├── gameday.tsx       ← Game Day tab
│   ├── connect.tsx       ← Team tab
│   ├── manage.tsx        ← Manage tab (role-based menu)
│   ├── me.tsx            ← Me tab (settings, profile)
│   ├── menu-placeholder.tsx ← Empty screen for More tab
│   └── [hidden tabs]...
├── [standalone screens]  ← profile, achievements, game-prep, etc.
components/
├── AppDrawer.tsx         ← OLD drawer (Modal-based, deprecated)
├── GestureDrawer.tsx     ← NEW drawer (gesture-based, staged but uncommitted)
lib/
├── auth.tsx              ← Auth context
├── drawer-context.tsx    ← Drawer state (staged but uncommitted)
├── permissions-context.tsx ← Role permissions
├── theme.tsx             ← Theme system
├── design-tokens.ts      ← Spacing, radii, shadows, typography
├── supabase.ts           ← Supabase client
```

---

## WHAT'S ALREADY STAGED (UNCOMMITTED)
The following files have been modified/created but NOT committed:
- `components/GestureDrawer.tsx` — New gesture drawer (760 lines, full implementation)
- `lib/drawer-context.tsx` — Drawer state context (31 lines)
- `app/_layout.tsx` — Modified to wrap with GestureHandlerRootView + DrawerProvider
- `app/(tabs)/_layout.tsx` — Modified to replace Me tab with More (hamburger) tab

These files are the starting point for the drawer feature. They may need updates as we build through the phases.

---

## GIT WORKFLOW
```bash
# After each phase:
git add .
git commit -m "feat: [Feature] Phase [X] - [description]"
git push origin main

# Before starting new work:
git status  # Make sure working tree is clean
```
