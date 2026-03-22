# CC-FINAL-LAUNCH-AUDIT.md
# LYNX MOBILE — DEFINITIVE LAUNCH READINESS AUDIT
# Classification: SHIP-OR-DON'T — Nothing gets missed.

---

## EXECUTIVE DIRECTIVE

This is not a routine code review. This is a full-spectrum audit of every layer of the Lynx mobile application. The output of this audit will determine whether Lynx can be released — even as a Beta — onto the Google Play Store.

**The standard is simple: if a real parent, coach, admin, or player downloads this app tomorrow, what breaks? What confuses them? What exposes their data? What makes them uninstall?**

Every finding must include: the file path, the line number(s), a severity rating, and a recommended fix. No hand-waving. No "this should be fine." If you're not sure, flag it.

---

## MANDATORY PRE-READ (Do not skip)

Before executing any phase, read and internalize:
- `CC-LYNX-RULES.md`
- `AGENTS.md`  
- `LYNX-REFERENCE-GUIDE.md`
- `SCHEMA_REFERENCE.csv`
- `SUPABASE_SCHEMA.md`
- `app.json`
- `package.json`
- `.env`
- `.gitignore`
- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `lib/auth.tsx`
- `lib/permissions.ts`
- `lib/permissions-context.tsx`
- `lib/supabase.js`

---

## PHASE 1: GOOGLE PLAY STORE HARD BLOCKERS
**Output: `AUDIT-REPORT-01-PLAY-STORE-BLOCKERS.md`**

Google will reject the app or remove it post-launch if any of these fail. Check every one.

### 1A. Build & Submission Infrastructure
- Does `app.json` → `android.package` use a real package name (not `com.anonymous.*`)?
- Does `eas.json` exist? If not, this is a hard blocker — you cannot build for Play Store without it.
- Is there an EAS project ID linked? Check `app.json` → `extra.eas.projectId` and `owner` field.
- Is `expo-updates` or EAS Update configured? Without it, Carlos cannot push OTA updates (the #1 advantage of Expo).
- Is there a versioning strategy? `version` in app.json, `android.versionCode` — Play Store rejects uploads with duplicate version codes.
- Are there any `__DEV__` gated features that would break in production? Scan every file.
- Is `EXPO_PUBLIC_DEV_SKIP_AUTH` in `.env` safe? Would it ever be `true` in a production build?
- Does the splash screen use Lynx branding or React/Expo defaults? Check `assets/images/splash-icon.png`.
- Are all adaptive icon assets present and correctly sized? (`android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`)
- Are there any leftover React/Expo boilerplate assets? (`react-logo.png`, `partial-react-logo.png`, etc.)
- Are Android permissions in `app.json` correct and minimal? Flag any that are duplicated or unnecessary. Currently: `RECORD_AUDIO` (x2 duplicate), `MODIFY_AUDIO_SETTINGS` (x2 duplicate), `READ_CALENDAR`, `WRITE_CALENDAR`.
- Is `predictiveBackGestureEnabled: false` intentional or an oversight?
- Does `experiments.reactCompiler: true` cause any known issues with Expo SDK 54?

### 1B. Legal & Policy Compliance (Google Play will reject without these)
- Privacy Policy: Does it exist in-app? Is there a publicly accessible URL for it? Google requires BOTH.
  - Read `app/privacy-policy.tsx` end to end. Is it legally sound for a youth sports app handling minors' data?
  - Does it mention: data collection, data sharing, data retention, third parties, Supabase, push notifications, photos/media, location (if any)?
  - Is there a web-hosted version at thelynxapp.com/privacy or similar? Play Store listing requires a URL.
- Terms of Service: Same checks as above.
- Account Deletion: Google REQUIRES a working account deletion flow.
  - Trace the entire flow from `app/profile.tsx` → `handleDeleteAccount` → Supabase.
  - Does it actually delete data or just flag it? If flagged, is there a backend process that completes deletion within the Google-required timeframe (varies, but generally expected within reasonable time)?
  - What happens to the user's children's data? Team associations? Chat messages? Payment records?
  - Can the user still use the app after requesting deletion? Are they properly signed out?
- COPPA Compliance (CRITICAL — this app handles children under 13):
  - Read `components/CoppaConsentModal.tsx` end to end.
  - Is parental consent collected BEFORE any child data is stored?
  - What happens during signup if someone selects "player" role? Is age verified?
  - Are there any analytics, tracking, or advertising SDKs that would violate COPPA?
  - Does the privacy policy specifically address children's data?
  - Is there a mechanism for parents to review/delete their child's data? (Check `app/data-rights.tsx`)
- Data Rights: Read `app/data-rights.tsx` end to end. Does it actually work? Can parents export data? Delete child data?
- Content Rating: Does the app content match a "Everyone" rating? Any user-generated content risks? (Chat, photos, team wall, shoutouts)

### 1C. Security Audit
- Is the Supabase anon key exposed in `.env`? (Anon keys are designed to be public, but verify RLS is enforced)
- Is `.env` in `.gitignore`? (Currently `.env*.local` is ignored but `.env` itself is NOT — this means the key is committed to GitHub. Flag severity.)
- Are there any API keys, secrets, or tokens hardcoded anywhere in the codebase?
- Check every Supabase query in the app — are any using `.select('*')` without RLS protection?
- Is there any place where a parent could see another family's data?
- Is there any place where a player could see admin-level data?
- Is there any place where an unauthenticated user could access protected data?
- Check the chat system — can users access channels they're not members of?
- Check photo/media uploads — are bucket permissions correct?
- Are push notification tokens stored securely?
- Is session handling correct? Token refresh? Expired session behavior?
- Search for any `supabase.auth.admin` calls that shouldn't be in client code.

---

## PHASE 2: EVERY SCREEN — FULL TRAVERSAL
**Output: `AUDIT-REPORT-02-SCREEN-BY-SCREEN.md`**

Open and read EVERY `.tsx` file in `app/` and `app/(tabs)/` and `app/(auth)/` and `app/chat/`. For each screen, document:

### For Each Screen File:
1. **Screen name and file path**
2. **Which role(s) can access it** (admin, coach, parent, player, any, unauthenticated)
3. **How the user gets there** (tab bar, drawer, deep link, push notification, button from another screen)
4. **Data dependencies** — what Supabase queries does it make? What happens if they return empty? What happens if they error?
5. **Loading states** — is there a loading indicator? Or does the screen flash empty then populate?
6. **Empty states** — if there's no data (new user, no teams, no events, no payments), what does the user see? Is it helpful or is it a dead end?
7. **Error states** — if a network call fails, what happens? White screen? Crash? Helpful message?
8. **Navigation completeness** — can the user get BACK from this screen? Are there any dead ends where the only option is to force-close the app?
9. **Scroll behavior** — if content exceeds the screen, does it scroll? Is the ScrollView always mounted (per CC-LYNX-RULES)?
10. **Safe area handling** — does content get hidden behind notches, status bars, or home indicators?
11. **Keyboard handling** — if there are text inputs, does the keyboard push content correctly? Can the user dismiss the keyboard?
12. **Touch targets** — are all buttons/touchables at least 44x44pt?
13. **Visual completeness** — are there any placeholder texts, "Lorem ipsum", "TODO", or "[placeholder]" visible to the user?
14. **Brand compliance** — is it using Lynx brand tokens (lynx-navy, lynx-sky, lynx-gold) or hardcoded colors? Is it using Plus Jakarta Sans or a wrong font?
15. **Any references to "VolleyBrain" or old branding?**

### Auth Screens (app/(auth)/)
Walk through every screen: welcome, login, signup, pending-approval, redeem-code. Trace the complete new-user journey from first app open to landing on a home dashboard.

### Tab Screens (app/(tabs)/)
For each tab, document which roles see it and what content changes per role. Verify the tab bar shows the correct tabs per role.

### Modal Screens / Stack Screens (app/*.tsx)
Every non-tab screen. Many of these are pushed via `router.push()` — verify they all have working back navigation.

### Chat Screens (app/chat/)
Test the chat layout and individual channel screen. Can users send messages? Are reactions working? Voice messages? Image sharing?

---

## PHASE 3: EVERY COMPONENT — FULL TRAVERSAL
**Output: `AUDIT-REPORT-03-COMPONENT-AUDIT.md`**

Read every file in `components/` and all subdirectories. For each component:

1. **Component name and file path**
2. **Where is it used?** (grep for imports — if it's imported nowhere, flag it as dead code)
3. **Props** — are there required props that could be undefined at runtime? TypeScript `any` types?
4. **Data fetching** — does the component fetch its own data? If so, does it handle loading/empty/error?
5. **Reanimated / Gesture Handler usage** — any potential crash points with animations?
6. **Image loading** — are images using `expo-image` with proper fallbacks? What happens if an image URL is broken?
7. **Performance concerns** — any components re-rendering excessively? Inline functions in `map()` that should be extracted? Missing `useCallback`/`useMemo` where needed?

### Specific Component Deep Dives:
- `DashboardRouter.tsx` — this routes to role-specific home screens. Verify every role path works.
- `GestureDrawer.tsx` — the main navigation drawer. Verify every menu item navigates correctly and is role-gated.
- `AdminHomeScroll.tsx`, `CoachHomeScroll.tsx`, `ParentHomeScroll.tsx`, `PlayerHomeScroll.tsx` — the four home dashboards. Each is complex. Verify data loading, empty states, and all interactive elements.
- All `*Modal.tsx` components — verify they can be opened AND closed. Verify they don't block the UI.
- `FirstLaunchTour.tsx` / `FirstTimeTour.tsx` — are both needed? Is there duplication? Does the tour actually work for new users?

---

## PHASE 4: DATA LAYER & BACKEND WIRING
**Output: `AUDIT-REPORT-04-DATA-LAYER.md`**

### 4A. Supabase Query Audit
- Read every file in `lib/` and `hooks/`.
- For every Supabase query (`.from('table').select(...)`, `.insert(...)`, `.update(...)`, `.delete(...)`):
  - Does the table exist in `SCHEMA_REFERENCE.csv`?
  - Are the column names correct?
  - Is RLS going to allow this query for the intended user role?
  - Is `.single()` used where the query could return 0 or multiple rows? (This causes crashes)
  - Are there any N+1 query patterns? (Looping over results to make individual queries)
  - Are there any unhandled promise rejections?

### 4B. Realtime Subscriptions
- Find every `supabase.channel(...)` or `.on('postgres_changes', ...)` call.
- Are subscriptions properly cleaned up on unmount? (Memory leak risk)
- Are there any subscriptions that fire on every INSERT across an entire table? (Performance bomb in production with many users)

### 4C. Authentication Flow
- Trace the complete auth flow: `lib/auth.tsx`
  - Sign up → profile creation → onboarding → home
  - Sign in → session restore → home
  - Sign out → clear AsyncStorage keys → welcome screen
  - Session expiry → token refresh → or graceful re-auth
  - Google OAuth → callback → profile
  - Apple OAuth → callback → profile
  - Password reset flow
- Are there any race conditions in the auth state machine?
- What happens if the user is mid-onboarding and the app is killed and restarted?

### 4D. Offline Behavior
- What happens when the user has no internet?
- Is there any offline caching? Or does every screen require a live connection?
- Are there any operations that silently fail without network?

### 4E. Context Providers
- Map every context provider in `app/_layout.tsx` and what it provides.
- Are there any circular dependencies between contexts?
- What happens if a context value is accessed before the provider has loaded?

---

## PHASE 5: NAVIGATION ARCHITECTURE
**Output: `AUDIT-REPORT-05-NAVIGATION.md`**

### 5A. Complete Navigation Map
Build a complete map of every possible navigation path in the app:
- Tab bar → which tabs per role
- Drawer menu → every menu item per role → where it navigates
- Push notification tap → where each notification type routes (check `app/_layout.tsx` notification handler)
- Deep links → what's the URL scheme? What routes are registered?
- `router.push()` / `router.replace()` — find every call in the codebase, verify the destination exists
- `router.back()` — find every call, verify there's always a screen to go back to

### 5B. Dead Ends
- Identify every screen where the user has NO way to navigate away except the system back gesture or killing the app.
- Identify every screen that pushes to a route that doesn't exist (will crash or show blank).

### 5C. Role Guards
- For each screen that should be restricted to certain roles, verify the guard exists.
- Can a parent navigate to admin-only screens by crafting a deep link?
- Can a player access coach tools?
- What happens if a user's role changes mid-session? (e.g., admin removes their coach role)

### 5D. Navigation Params
- Find every screen that reads `useLocalSearchParams()` or `useSearchParams()`.
- What happens if the expected params are missing? Does it crash or gracefully handle it?

---

## PHASE 6: UX / UI QUALITY AUDIT
**Output: `AUDIT-REPORT-06-UX-UI-QUALITY.md`**

### 6A. First-Time User Experience (FTUE)
Walk through the app as each role type with ZERO data:
1. **New Admin** — Signs up, creates/joins org. What do they see? Can they set up a season, create teams, add coaches?
2. **New Coach** — Gets invited, signs up. What do they see? Can they find their team?
3. **New Parent** — Signs up to register their child. What's the registration flow? Is it completeable?
4. **New Player** — Signs up (or is added by parent). What do they see?

For each: document every friction point, confusing step, missing instruction, or dead end.

### 6B. Core Task Flows — Can Users Actually Do These Things?
Test each flow end to end by reading the code path:

**Admin flows:**
- Create an organization
- Set up a season
- Create teams
- Assign coaches to teams
- Open registration
- View/approve registrations
- Send a blast message
- View payment status
- Generate reports
- Manage user roles

**Coach flows:**
- View their team roster
- Create a practice event
- Create a game event
- Run game day (lineup, scoring, stats)
- Send shoutouts to players
- Create a challenge
- View player evaluations
- Communicate with parents (chat)

**Parent flows:**
- Register a child for a season
- Sign waivers
- Make a payment (or see payment status)
- View their child's schedule
- RSVP to events
- View their child's stats/achievements
- Communicate with coach (chat)
- View team gallery

**Player flows:**
- View their stats and achievements
- Accept/complete challenges
- View upcoming events
- Chat with team
- View leaderboards
- See their player card

For each flow: does the code path exist? Are there any steps that dead-end? Are there any steps that require data that doesn't exist yet?

### 6C. Visual Consistency
- Are all screens using the design token system (`lib/design-tokens.ts`)?
- Are there hardcoded colors anywhere? (grep for hex codes like `#` in StyleSheet objects)
- Is the dark theme applied consistently? Are there any screens that are light-on-dark in some places and dark-on-light in others?
- Card border radius — is it consistently `14px` per design system?
- Font usage — is it consistently Plus Jakarta Sans? Any remnants of system font or other fonts?
- Are there any screens that look visually unfinished? (Missing padding, overlapping elements, cut-off text)

### 6D. Accessibility (Play Store won't reject for this, but users will)
- Are there any images without alt text / accessibility labels?
- Are interactive elements announced correctly for screen readers?
- Is text resizable? Are there any hardcoded font sizes that would break with system font scaling?
- Color contrast — are there any text/background combinations that are hard to read?

---

## PHASE 7: PERFORMANCE & STABILITY
**Output: `AUDIT-REPORT-07-PERFORMANCE.md`**

### 7A. Crash Risk Assessment
- Find every `throw` statement. Are they all caught?
- Find every `.single()` Supabase call. What happens if it returns null?
- Find every array access (`[0]`, `.find()`, etc.) — is there null checking?
- Find every JSON.parse — is it in a try/catch?
- Are there any `require()` calls that could fail?
- Check for any `undefined is not an object` risks — optional chaining (`?.`) missing anywhere?

### 7B. Memory Leaks
- Are all `useEffect` cleanup functions properly returning unsubscribe/cleanup?
- Are there any event listeners that aren't removed on unmount?
- Supabase realtime subscriptions — all properly unsubscribed?
- Timers (`setTimeout`, `setInterval`) — all cleared on unmount?

### 7C. Performance Bottlenecks
- The N+1 query in tab bar for unread counts — each channel membership makes a separate count query. How many queries fire on app load for a user with 5 channels?
- Any `useEffect` without proper dependency arrays? (Infinite re-render risk)
- Any large lists without `FlatList`? (Using `map()` inside `ScrollView` for potentially large datasets)
- Image optimization — are large images being loaded at full resolution where thumbnails would suffice?
- Bundle size concerns — any unnecessarily large dependencies?

### 7D. Error Handling Quality
- Find every empty `catch {}` block. These are silent failures that will be invisible in production.
- Find every `catch` that only console.logs. In production, users will see nothing when things fail.
- Are there any user-facing error messages that expose technical details? (SQL errors, stack traces)

---

## PHASE 8: FEATURE COMPLETENESS vs. BETA VIABILITY
**Output: `AUDIT-REPORT-08-FEATURE-COMPLETENESS.md`**

For every feature area, classify it as:
- 🟢 **SHIP** — Works end to end, no major bugs
- 🟡 **SHIP WITH KNOWN LIMITS** — Core works, some edges rough, acceptable for Beta with a note
- 🔴 **DO NOT SHIP** — Broken, incomplete, or will confuse/harm users. Must be fixed or hidden before launch.
- ⬛ **HIDE FOR BETA** — Not ready but not needed for Beta. Should be removed from UI entirely so users can't stumble into it.

Feature areas to evaluate:
1. Authentication (signup, login, logout, password reset, OAuth)
2. Onboarding (first-time user experience, profile completion)
3. Organization setup
4. Season management
5. Team management
6. Roster management
7. Registration system (admin side + parent side)
8. Waiver system
9. Payment tracking (admin view + parent view)
10. Event/schedule system
11. Chat/messaging
12. Blast messages
13. Game Day command center
14. Lineup builder
15. Player evaluations
16. Challenge system
17. Achievement/badge system
18. Leaderboards
19. Shoutouts
20. Player card / trading card
21. Team hub
22. Team gallery / family gallery
23. Reports
24. Push notifications
25. Settings / profile management
26. Help center
27. Data rights / privacy controls
28. Admin search
29. Coach directory
30. Volunteer management
31. Season archives
32. Standing/rankings
33. Jersey management
34. Invite friends
35. QR code features
36. Venue manager
37. Season setup wizard
38. Bulk event creation
39. Payment reminders
40. Coach availability
41. Coach background checks
42. Notification preferences
43. Role switching (view as different role)
44. Tablet responsiveness
45. Web features placeholder

---

## PHASE 9: DEPENDENCY & INFRASTRUCTURE HEALTH
**Output: `AUDIT-REPORT-09-INFRASTRUCTURE.md`**

### 9A. Dependency Audit
- List every dependency in `package.json`.
- Flag any that are deprecated, unmaintained, or have known vulnerabilities.
- Flag any that are pinned to very old versions.
- Is `react-native-web` needed? The app is mobile-only for now.
- Check Expo SDK 54 compatibility with all dependencies.

### 9B. TypeScript Health
- Are there any `@ts-ignore` or `@ts-nocheck` directives?
- How many `any` types are there? (Each one is a potential runtime crash)
- Run a conceptual type-check — identify files that would likely fail `tsc --noEmit`.
- Check `tsconfig.json` — is it configured correctly for Expo SDK 54?

### 9C. Code Hygiene
- Count of unguarded `console.log` / `console.error` / `console.warn` statements (not wrapped in `__DEV__`).
- Count of `TODO` / `FIXME` / `HACK` comments.
- Dead code — components or screens that are imported nowhere.
- Duplicate code — components that do nearly the same thing.
- Files in root that are development artifacts and shouldn't ship (old audit reports, spec files, etc.)
  - Note: These don't ship in the binary, but they clutter the repo.

### 9D. Crash Reporting & Analytics
- Is there ANY crash reporting SDK? (Sentry, Bugsnag, Crashlytics)
  - If no: this is a critical gap. In production, crashes will be invisible. You'll get 1-star reviews with no way to diagnose why.
- Is there any analytics? (How will you know if users are actually using features?)

### 9E. Environment & Secrets
- Is `.env` committed to git? (Check git history too — if it was ever committed, the key is exposed forever)
- Is the Supabase anon key the only secret? Or are there others?
- What's the strategy for production vs development environment variables?

---

## PHASE 10: FINAL VERDICT & LAUNCH CHECKLIST
**Output: `AUDIT-REPORT-10-FINAL-VERDICT.md`**

Synthesize everything from Phases 1-9 into:

### Section A: HARD BLOCKERS (Cannot submit to Play Store until fixed)
Numbered list. Each item includes: what's wrong, where it is, what to do, estimated complexity (S/M/L/XL).

### Section B: MUST FIX BEFORE BETA USERS (Won't get rejected, but will lose users day 1)
Same format.

### Section C: SHOULD FIX FOR QUALITY (Can ship Beta without, but impacts perception)
Same format.

### Section D: HIDE FOR BETA (Features to remove from UI — they're not ready)
List each feature/screen that should be hidden and how (remove drawer item, remove tab, guard route).

### Section E: POST-BETA ROADMAP (Known gaps that are acceptable for Beta)
What users might ask about that you can say "coming soon" to.

### Section F: THE LAUNCH CHECKLIST
A step-by-step, numbered, sequential checklist of everything that must happen between now and hitting "Publish" on Play Store. Include:
1. Code fixes (in priority order)
2. `eas.json` creation and EAS project setup
3. Build configuration (production profile)
4. App signing (keystore generation)
5. Play Store developer account setup ($25 one-time fee)
6. Store listing content (screenshots, description, feature graphic, etc.)
7. Content rating questionnaire answers
8. Privacy policy URL
9. Beta track setup (internal testing → closed testing → open testing → production)
10. First build submission
11. Review timeline expectations
12. OTA update strategy for post-launch fixes

### Section G: RISK REGISTER
Top 10 risks that could cause problems post-launch, even if everything above is addressed. (Example: "A parent registers, can't find their child's team, and leaves a 1-star review before we can help them.")

---

## EXECUTION NOTES FOR CC

1. **Use agents/subagents** to parallelize where possible. Phases 2 and 3 are the heaviest — they require reading every file.
2. **Be specific.** "The chat system has some issues" is worthless. "In `app/chat/[id].tsx` line 320, `supabase.from('message_reactions').delete()` has no error handling and will silently fail, causing the reaction UI to show stale state" is useful.
3. **Include file paths and line numbers for every finding.**
4. **Do not soften findings.** If something is broken, say it's broken. If it'll crash, say it'll crash. Carlos needs the truth.
5. **Distinguish between "this will crash" vs "this is ugly" vs "this is missing."** Severity matters.
6. **Each AUDIT-REPORT file should be self-contained** — someone reading just that file should understand the findings without needing to read the others.
7. **The Phase 10 final verdict is the most important output.** Everything else feeds into it. Make it airtight.

---

## SEVERITY DEFINITIONS

Use these consistently across all reports:

- **P0 — BLOCKER**: App will be rejected by Google, will crash, will expose user data, or violates law. Cannot ship.
- **P1 — CRITICAL**: Core user flow is broken or unusable. Will lose users immediately. Must fix before any external user touches the app.
- **P2 — MAJOR**: Feature doesn't work correctly but has a workaround, or UX is significantly confusing. Should fix for Beta quality.
- **P3 — MINOR**: Cosmetic issues, rough edges, non-critical missing features. Can ship Beta with these.
- **P4 — NICE-TO-HAVE**: Polish items. Address post-Beta based on user feedback.

---

## COMMIT PROTOCOL

- Create each AUDIT-REPORT file as you complete each phase.
- Commit after each phase with message: `audit: Phase N — [phase title]`
- Do NOT modify any application code. This is an audit only.
- Final commit after Phase 10: `audit: Final launch verdict and checklist complete`
