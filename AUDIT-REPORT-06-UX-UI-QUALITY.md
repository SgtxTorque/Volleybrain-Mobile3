# AUDIT REPORT 06 -- UX/UI QUALITY

**Auditor:** Claude Opus 4.6 (automated code audit)
**Date:** 2026-03-17
**Branch:** navigation-cleanup-complete
**Scope:** First-time user experience, core task flows, visual consistency, accessibility

---

## EXECUTIVE SUMMARY

The Lynx mobile app has a well-structured multi-role architecture with thoughtful empty states and a polished onboarding carousel. The codebase demonstrates consistent use of brand tokens (`BRAND`, `FONTS`, `PLAYER_THEME`, `D_COLORS`) across the four HomeScroll dashboards. However, the audit identified **3 P1 issues**, **8 P2 issues**, **12 P3 issues**, and **6 P4 issues** related to accessibility gaps, hardcoded colors bypassing the design system, an N+1 query in the tab layout, inconsistent notification routing, and missing `accessibilityLabel` on most `<Image>` components.

| Severity | Count |
|----------|-------|
| P0 -- BLOCKER | 0 |
| P1 -- CRITICAL | 3 |
| P2 -- MAJOR | 8 |
| P3 -- MINOR | 12 |
| P4 -- NICE-TO-HAVE | 6 |

---

## 6A. FIRST-TIME USER EXPERIENCE (FTUE)

### 6A-1. New Admin Flow

**Path:** Welcome carousel -> Signup (Step 1: Info, Step 2: Role, Step 3: Connect) -> Create Organization inline

**What works well:**
- 4-screen onboarding carousel with mascot illustrations, page dots, skip button, and legal links (privacy policy + TOS routes exist)
- 3-step signup wizard with animated slide transitions and step indicator
- Role selection is clear with Coach, Team Manager, Parent, Player cards
- Org creation inline for coaches (generates org code, shows confirmation)
- After org creation, refreshProfile triggers navigation to `/(tabs)`

**Findings:**

| ID | Severity | Finding |
|----|----------|---------|
| 6A-1a | **P2** | **Admin role not available during signup.** The `ROLE_CARDS` array in `signup.tsx` only includes Coach, Team Manager, Parent, and Player. There is no "Admin" or "League Admin" role card. A new admin must sign up as "Coach" and then create an organization (which auto-assigns `league_admin` role). This is workable but confusing -- the user selected "Coach" but becomes an Admin. The role mismatch may confuse users reviewing their profile. |
| 6A-1b | **P3** | **Org creation generates a code that is never persisted.** In `handleCreateOrg`, the generated code (`slug.substring(0,4).toUpperCase() + random4digits`) is shown to the user on the confirmation screen but is never inserted into any database table (e.g., `invitations` or `team_invite_codes`). The code is cosmetic only -- sharing it would not work. |
| 6A-1c | **P3** | **"Continue to Home" after org creation calls `refreshProfile()` but does not navigate.** The button's `onPress` is `() => refreshProfile()`. Navigation depends on the auth state listener picking up the profile change and routing to `/(tabs)`. This may work, but there is no explicit `router.replace('/(tabs)')` fallback if the auth listener does not fire. |
| 6A-1d | **P3** | **Sport field is a free-text input.** In the "Create Organization" form, `orgSport` defaults to "Volleyball" but is a plain `TextInput`, allowing arbitrary input (e.g., "asdf"). A picker or validated list would be more appropriate. |

### 6A-2. New Coach Flow

**Path:** Welcome -> Signup -> Select "Coach" -> Enter invite code OR Create org -> Home (CoachHomeScroll)

**What works well:**
- Coach who enters a valid invite code is joined to the org with `head_coach` role
- Coach who creates an org is set as `league_admin`
- CoachHomeScroll has proper empty states: NoOrgState (with code entry), NoTeamState ("You haven't been assigned to a team yet")
- Empty states include actionable CTAs

**Findings:**

| ID | Severity | Finding |
|----|----------|---------|
| 6A-2a | **P2** | **Coach with invite code but no team assignment sees a dead-end.** After signing up with a valid code, the coach lands on CoachHomeScroll. If the admin has not assigned them to a team, they see `NoTeamState` which says "You haven't been assigned to a team yet. Your admin will set this up." There is no way for the coach to self-remedy. This is acceptable for the MVP but could frustrate users. |
| 6A-2b | **P3** | **Skip flow creates an account with no org.** If a coach taps "Skip for now", `createAccount()` is called without an `organizationId`. The profile gets `onboarding_completed: true` but no `current_organization_id`. They will land on `NoOrgState` empty state in the dashboard, which lets them enter a code or create an org. This works but the two-step process (signup then re-enter code) is friction. |

### 6A-3. New Parent Flow

**Path:** Welcome -> Signup -> Select "Parent" -> Enter invite code or skip -> Home (ParentHomeScroll)

**What works well:**
- Parent role card has clear "My child plays" subtitle
- Step 3 contextual subtitle: "Have an invite code?"
- ParentHomeScroll empty states: NoOrgState (code entry), NoTeamState ("Your child hasn't been assigned to a team yet")
- `onboarding-router.ts` handles multiple entry paths (cold download, registration link, invite code, claim account, already set up)

**Findings:**

| ID | Severity | Finding |
|----|----------|---------|
| 6A-3a | **P2** | **No child registration flow in the mobile app.** After signup, a parent with an invite code is joined to the org but has no children linked. `ParentHomeScroll` shows `NoTeamState` (role="parent") which says "Your child hasn't been assigned to a team yet. Your coach or admin will add them soon." There is no in-app child registration form on the Home screen. The `RegistrationCard` component exists in the scroll but only appears when `data.children.length > 0`. The parent-registration-hub route exists but is not surfaced from the NoTeamState empty state. |
| 6A-3b | **P3** | **`onboarding-router.ts` `getOnboardingRoute` for 'cold' and 'invite_code' both route to `/parent-registration-hub`.** This is correct for parents but would be wrong for coaches/players who end up on these paths (the router does not account for role). |

### 6A-4. New Player Flow

**Path:** Welcome -> Signup -> Select "Player" -> Enter invite code or skip -> Home (PlayerHomeScroll)

**What works well:**
- Player dark theme dashboard (`#0D1B3E` background) with game-menu aesthetic
- 15-section scroll with identity hero, quests, challenges, leaderboard, trophy case
- PlayerHomeScroll has proper empty states: NoOrgState, NoTeamState ("Waiting for your coach to add you to a team. Hang tight!")

**Findings:**

| ID | Severity | Finding |
|----|----------|---------|
| 6A-4a | **P3** | **Player "Skip" flow results in a permanently orphaned account.** If a player skips the code entry, they get `onboarding_completed: true` but no org, no team, no linked player record. They see NoOrgState with code entry. However, players typically do not have invite codes -- they are added by coaches. The "Skip for now" option may strand them. |

### 6A-5. FirstTimeTour

| ID | Severity | Finding |
|----|----------|---------|
| 6A-5a | **P3** | **FirstTimeTour is role-agnostic.** The 3-slide tour (Welcome, Never Miss a Game, Watch Them Grow) is the same for all roles. For admins and coaches, "Watch Them Grow" (about badges and player cards) is less relevant. The tour mentions nothing about managing teams, creating events, or admin tools. |
| 6A-5b | **P4** | **FirstTimeTour images use direct `require` paths** (e.g., `@/assets/images/Meet-Lynx.png`) that differ from the `FAMILY_IMAGES`/`ACHIEVEMENT_IMAGES` constants used elsewhere. If images are reorganized, these would break independently. |

---

## 6B. CORE TASK FLOWS

### Admin Flows

| ID | Severity | Flow | Finding |
|----|----------|------|---------|
| 6B-A1 | OK | Create org | Works via signup Step 3 inline form. |
| 6B-A2 | OK | Set up season | Route `/season-settings` exists, accessible from drawer. Season Setup Wizard at `/season-setup-wizard` also available. |
| 6B-A3 | OK | Create teams | Route `/team-management` exists in drawer. Admin dashboard has `AdminTeamHealthCards`. |
| 6B-A4 | OK | Assign coaches | Route `/coach-directory` exists. |
| 6B-A5 | OK | Open registration | Route `/registration-hub` exists in drawer with badge for pending registrations. |
| 6B-A6 | OK | Approve registrations | Badge key `pendingApprovals` on User Management drawer item. |
| 6B-A7 | OK | Send blasts | Route `/blast-composer` exists in both Admin Tools and Coaching Tools sections. |
| 6B-A8 | OK | View payments | Route `/(tabs)/payments` exists with badge for `unpaidPaymentsAdmin`. |
| 6B-A9 | OK | Generate reports | Route `/(tabs)/reports-tab` exists. |
| 6B-A10 | OK | Manage roles | User Management route covers this. |

### Coach Flows

| ID | Severity | Flow | Finding |
|----|----------|------|---------|
| 6B-C1 | OK | View roster | Route `/(tabs)/players` in drawer. |
| 6B-C2 | OK | Create events | Route `/(tabs)/coach-schedule` in drawer. Bulk create at `/bulk-event-create`. |
| 6B-C3 | OK | Run game day | Route `/game-day-command` in drawer. Game Day tab visible for coaches. |
| 6B-C4 | OK | Send shoutouts | `GiveShoutoutModal` available from CoachHomeScroll via SmartNudgeCard and ActionGrid2x2. |
| 6B-C5 | OK | Create challenges | Route `/coach-challenge-dashboard` and `/challenge-library` in drawer. |
| 6B-C6 | OK | View evaluations | Route `/evaluation-session` in drawer. |
| 6B-C7 | OK | Chat with parents | Chat tab visible for all roles. |

### Parent Flows

| ID | Severity | Flow | Finding |
|----|----------|------|---------|
| 6B-P1 | **P2** | Register child | Parent drawer has "Registration" -> `/parent-registration-hub`. However, this route is not linked from the NoTeamState empty state (parent's first landing). See 6A-3a. |
| 6B-P2 | OK | Sign waivers | Route `/my-waivers` in drawer with `unsignedWaivers` badge. |
| 6B-P3 | OK | Make payment | Route `/family-payments` in drawer with `unpaidPaymentsParent` badge. |
| 6B-P4 | OK | View schedule | Parent-only schedule tab `parent-schedule` visible. |
| 6B-P5 | OK | RSVP | `ParentEventHero` component has RSVP buttons with haptic feedback. |
| 6B-P6 | OK | View child stats | Route `/my-stats` in drawer under "Evaluations". |
| 6B-P7 | OK | Chat with coach | Chat tab available. |
| 6B-P8 | OK | View gallery | No explicit gallery route found in drawer sections, but `team-gallery` route exists. |

### Player Flows

| ID | Severity | Flow | Finding |
|----|----------|------|---------|
| 6B-PL1 | OK | View stats | Route `/my-stats` in drawer. |
| 6B-PL2 | OK | Complete challenges | Route `/challenges` in drawer. `PlayerChallengeCard` on home. |
| 6B-PL3 | OK | View events | `NextUpCard` on home. Schedule accessible via drawer. |
| 6B-PL4 | OK | Team chat | Chat tab available. |
| 6B-PL5 | OK | Leaderboards | `PlayerLeaderboardPreview` on home. |
| 6B-PL6 | OK | Player card | Route `/player-card` in drawer. |
| 6B-PL7 | OK | Trophy case | `PlayerTrophyCase` on home. Route `/achievements` in drawer. |

### Cross-Cutting Flow Issues

| ID | Severity | Finding |
|----|----------|---------|
| 6B-X1 | **P1** | **N+1 query in tab layout unread count.** `_layout.tsx` lines 93-103 iterate over all `channel_members` and issue a separate `supabase.from('chat_messages').select(count)` query per membership. A user in 20 channels triggers 20 individual count queries on every mount and on every realtime event. This is a performance and rate-limit risk. Should be batched into a single query with `.in('channel_id', channelIds)` or a server-side function. |
| 6B-X2 | **P2** | **Inconsistent notification routing.** Coach/Parent compact headers navigate to `/notification` (general notification screen), while the Player compact header navigates to `/notification-inbox` (player-specific notification inbox). Both routes exist but serve different audiences. A user who is both a coach and parent would see `/notification` which may not include player-engagement notifications. |
| 6B-X3 | **P2** | **Team Manager sees CoachHomeScroll.** In `DashboardRouter.tsx` line 216, `case 'team_manager': return <CoachHomeScroll />`. While the CoachHomeScroll does render manager-specific cards (`ManagerPaymentCard`, `ManagerAvailabilityCard`, `ManagerRosterCard`) when `isTeamManager` is true, the greeting says "Hey Coach!" and the overall framing is coach-centric. This could confuse team managers who are not coaches. |
| 6B-X4 | **P3** | **Drawer "web-only" items have no route.** Items with `webOnly: true` (Form Builder, Waiver Editor, Payment Gateway) route to `/web-features`, but no `/web-features.tsx` screen file was found during glob search -- wait, it was found. However, these items silently route to a generic "available on web" placeholder, which may confuse users expecting functionality. |

---

## 6C. VISUAL CONSISTENCY

### 6C-1. Design Token Usage

The app uses three token systems that partially overlap:
- `theme/colors.ts` (`BRAND` object) -- primary color tokens
- `theme/d-system.ts` (`D_COLORS`) -- extends BRAND with D System surfaces and gradient tokens
- `theme/player-theme.ts` (`PLAYER_THEME`) -- player dark theme tokens
- `lib/design-tokens.ts` -- legacy tokens (fonts, spacing, radii, shadows) -- partially superseded
- `theme/spacing.ts` (`SPACING`, `SHADOWS`) -- newer spacing system
- `lib/theme.tsx` -- ThemeContext with light/dark mode and accent colors

| ID | Severity | Finding |
|----|----------|---------|
| 6C-1a | **P1** | **511+ hardcoded hex color values across 50+ `.tsx` files.** Grep found 511 occurrences of hardcoded hex colors (e.g., `'#0A0F1A'`, `'#111827'`, `'#CBD5E1'`, `'#64748B'`). Most egregious: `AchievementCelebrationModal` receives hardcoded `themeColors` objects in AdminHomeScroll, CoachHomeScroll, and ParentHomeScroll -- all with identical values `{ bg: '#0A0F1A', card: '#111827', ... }` duplicated 3 times. These should be extracted to a shared constant. |
| 6C-1b | **P2** | **225+ uses of `fontWeight:` instead of `fontFamily: FONTS.x`.** Components like `GameCompletionWizard` (30 occurrences), `LeaderboardScreen` (24), `payments-parent` (33 archived), `SeasonFeesManager` (12), and `GiveShoutoutModal` (10) use numeric `fontWeight` instead of the Plus Jakarta Sans font family weight variants. On devices without the font loaded, this falls back to system font. |
| 6C-1c | **P3** | **Two overlapping token systems for spacing/radii.** `lib/design-tokens.ts` defines `radii.card: 16` while `theme/d-system.ts` defines `D_RADII.card: 18` and `D_RADII.cardSmall: 14`. `theme/spacing.ts` defines `SPACING.cardRadius: 16`. Three different card radius tokens exist. The auth screens use `borderRadius: 20` for card, `12` for inputs, and `14` for buttons -- none of which match any token. |

### 6C-2. Dark Theme Consistency

| ID | Severity | Finding |
|----|----------|---------|
| 6C-2a | **P1** | **Dark mode (ThemeContext) is largely unused.** While `lib/theme.tsx` defines a full dark color palette and `useTheme()` is imported in ~20 files, the four HomeScroll dashboards and most screens use direct `BRAND`, `D_COLORS`, or `PLAYER_THEME` imports rather than `colors` from `useTheme()`. The dark mode toggle in the drawer (`toggleTheme`) would change the ThemeContext colors, but the HomeScroll backgrounds are hardcoded to `D_COLORS.pageBg` (light) or `PLAYER_THEME.bg` (dark). **Toggling dark mode would create a visual mismatch** where the tab bar changes but the screen content does not. This is a broken feature that should either be fully wired or removed from the UI. |
| 6C-2b | **P3** | **Player mode tab bar uses hardcoded color strings.** In `_layout.tsx`, player mode tab bar colors are hardcoded: `'rgba(13, 27, 62, 0.95)'`, `'rgba(255, 255, 255, 0.05)'`, `'#4BB9EC'`, `'rgba(255, 255, 255, 0.20)'`. These duplicate `PLAYER_THEME` tokens but are not imported from them. |

### 6C-3. Border Radius Consistency

The design system target is `14px` per the design spec, but actual usage varies:

| Location | borderRadius | Notes |
|----------|-------------|-------|
| Welcome CTA button | 14 | Correct |
| Login card | 20 | Non-standard |
| Login input | 12 | Non-standard |
| Login button | 12 | Non-standard |
| Signup role card | 16 | Non-standard |
| Signup input | 12 | Non-standard |
| NoOrgState CTA | 14 | Correct |
| NoOrgState info card | 14 | Correct |
| D System hero | 22 | Uses D_RADII.hero |
| D System card | 18 | Uses D_RADII.card |
| Compact header avatar | 16 | Circle (correct) |
| Search bar | 16 | Non-standard |

| ID | Severity | Finding |
|----|----------|---------|
| 6C-3a | **P3** | **Border radius values range from 8 to 22 across the app.** No single "card" radius is consistently applied. The three token systems define different defaults (14, 16, 18). The login screen uses 20 for cards and 12 for buttons, while most other screens use 14-16. |

### 6C-4. Font Consistency

| ID | Severity | Finding |
|----|----------|---------|
| 6C-4a | **P3** | **Two files use platform `monospace` font** instead of brand fonts: `login.tsx` (line 394, for DEV tools label) and `team-manager-setup.tsx` (line 734, for code display). The DEV usage is acceptable, but the team manager setup code display should use `FONTS.bodyBold` with letter spacing. |
| 6C-4b | **P3** | **`lib/design-tokens.ts` defines `fonts.body` as `PlusJakartaSans_500Medium`** while `theme/fonts.ts` has the full weight range. The design-tokens file is a legacy artifact that could cause confusion if imported instead of `FONTS`. |

---

## 6D. ACCESSIBILITY

### 6D-1. Images Without accessibilityLabel

| ID | Severity | Finding |
|----|----------|---------|
| 6D-1a | **P2** | **Only 31 `accessibilityLabel`/`accessibilityRole`/`accessible`/`accessibilityHint` attributes found across 19 files, but 48+ `<Image>` components exist across 30+ files.** At minimum, ~17 Image components lack accessibility labels. Key offenders: `FirstTimeTour.tsx` slide images (3 images, no labels), `TeamManagerSetupPrompt.tsx` mascot image (no label), `CoachHomeScroll.tsx` mascot images (no labels), `ParentHomeScroll.tsx` mascot images (no labels), `PlayerHomeScroll.tsx` (no image tags in main file but child components unknown). |

### 6D-2. Interactive Elements Without Screen Reader Annotations

| ID | Severity | Finding |
|----|----------|---------|
| 6D-2a | **P2** | **TouchableOpacity buttons throughout the app lack `accessibilityRole="button"` and `accessibilityLabel`.** Key examples: the "Skip" button in welcome.tsx, all role cards in signup.tsx, the "Next" and "Get Started" buttons. None of the HomeScroll action cards (`ActionGrid2x2`, `AdminActionPills`, etc.) were verified to have accessibility roles. |
| 6D-2b | **P3** | **Drawer menu items lack accessibility grouping.** The `GestureDrawer` renders menu sections with collapsible headers, but there are no `accessibilityRole="header"` annotations on section titles or `accessibilityState={{ expanded }}` on collapsible sections. |

### 6D-3. Font Scaling

| ID | Severity | Finding |
|----|----------|---------|
| 6D-3a | **P2** | **Zero uses of `allowFontScaling` found.** The app does not explicitly opt in or out of system font scaling. React Native's default is `allowFontScaling={true}` for `<Text>`, which means all text will scale with system accessibility settings. This is generally correct, but the app uses many hardcoded `fontSize` values (566+ occurrences across 30+ files) with fixed-height containers. Large font scaling could cause text truncation or layout overflow in compact headers, pills, and badges. |
| 6D-3b | **P4** | **Compact header heights are hardcoded.** For example, `CoachHomeScroll` uses `height: 56 + insets.top`, `PlayerHomeScroll` uses `height: 32 + insets.top`. With system font scaling, the tab bar labels and header text could overflow these fixed heights. |

### 6D-4. Color Contrast

| ID | Severity | Finding |
|----|----------|---------|
| 6D-4a | **P3** | **Several text colors may fail WCAG AA contrast.** `BRAND.textMuted` is `rgba(16,40,76,0.4)` -- on a `#F6F8FB` background this yields roughly 3.2:1 contrast, below the 4.5:1 WCAG AA minimum for normal text. This muted color is used extensively for subtitles, hints, and placeholder text. Similarly, `BRAND.textFaint` at `rgba(16,40,76,0.25)` is used for search placeholders and likely fails contrast requirements. |
| 6D-4b | **P4** | **Player theme muted text may fail contrast.** `PLAYER_THEME.textMuted` is `rgba(255,255,255,0.30)` on `#0D1B3E` background, yielding approximately 2.5:1 contrast. `PLAYER_THEME.textFaint` at `rgba(255,255,255,0.15)` is even lower. |

---

## ADDITIONAL FINDINGS

### Performance

| ID | Severity | Finding |
|----|----------|---------|
| 6-PERF-1 | **P3** | **Realtime subscription in `_layout.tsx` re-fetches ALL unread counts on ANY chat message insert.** Lines 122-153: the subscription listens for `INSERT` on `chat_messages` and `message_recipients` globally (no filter). Any message in any channel triggers a full re-count. Combined with the N+1 query (6B-X1), this could cause frequent expensive query bursts in active organizations. |

### Code Quality

| ID | Severity | Finding |
|----|----------|---------|
| 6-CQ-1 | **P4** | **AchievementCelebrationModal themeColors duplicated 3 times.** AdminHomeScroll (line 342-350), CoachHomeScroll (line 646-654), and ParentHomeScroll (line 542-550) all pass identical hardcoded theme color objects. Extract to a shared constant. |
| 6-CQ-2 | **P4** | **Pending approval screen polls every 30s.** `pending-approval.tsx` uses `setInterval(checkApproval, 30000)` which keeps running even if the app is backgrounded. Should use `AppState` listener to pause polling when backgrounded. |
| 6-CQ-3 | **P4** | **Carousel `viewabilityConfig` ref in welcome.tsx** uses `useRef` correctly but the FlatList `onViewableItemsChanged` is wrapped in `useCallback` with empty deps, which is correct. No issue, but FirstTimeTour uses a different pattern (`useRef(({ viewableItems }) => {...}).current`) which works but is less idiomatic. |

---

## SUMMARY OF FINDINGS BY SEVERITY

### P1 -- CRITICAL (3)

1. **6B-X1:** N+1 query in tab layout for unread chat badge -- issues one DB query per channel membership on every mount and every realtime event.
2. **6C-1a:** 511+ hardcoded hex colors across 50+ files bypassing the design token system.
3. **6C-2a:** Dark mode toggle is exposed in the drawer but the HomeScroll dashboards ignore ThemeContext -- toggling dark mode creates visual mismatch.

### P2 -- MAJOR (8)

1. **6A-1a:** No "Admin" role during signup -- admins must select "Coach" and create org.
2. **6A-2a:** Coach with invite code but no team assignment hits a dead-end empty state.
3. **6A-3a:** No child registration flow surfaced from parent's first-landing empty state.
4. **6B-X2:** Inconsistent notification routing (`/notification` vs `/notification-inbox`) across roles.
5. **6B-X3:** Team Managers see "Hey Coach!" greeting because they share CoachHomeScroll.
6. **6C-1b:** 225+ uses of `fontWeight:` instead of `fontFamily: FONTS.x` -- falls back to system font without brand fonts loaded.
7. **6D-1a:** ~17+ Image components lack `accessibilityLabel`.
8. **6D-2a:** Interactive elements (buttons, cards) lack `accessibilityRole` and `accessibilityLabel` annotations.

### P3 -- MINOR (12)

1. **6A-1b:** Org creation generates a display-only code that is never persisted to the database.
2. **6A-1c:** "Continue to Home" relies on auth listener instead of explicit navigation.
3. **6A-1d:** Sport field is free-text instead of a validated picker.
4. **6A-2b:** Coach "Skip" flow creates an org-less account requiring a second code entry.
5. **6A-3b:** Onboarding router routes cold/invite paths to parent-registration-hub regardless of role.
6. **6A-4a:** Player "Skip" flow creates a permanently orphaned account.
7. **6A-5a:** FirstTimeTour is role-agnostic (same content for all roles).
8. **6B-X4:** Drawer "web-only" items route to a placeholder screen without clear messaging.
9. **6C-1c:** Three overlapping spacing/radii token systems with conflicting values.
10. **6C-3a:** Border radius varies from 8 to 22 with no consistent standard.
11. **6D-2b:** Drawer menu sections lack accessibility annotations (header role, expanded state).
12. **6D-4a:** `BRAND.textMuted` (rgba 0.4) fails WCAG AA contrast on light backgrounds.

### P4 -- NICE-TO-HAVE (6)

1. **6A-5b:** FirstTimeTour uses direct require paths instead of shared image constants.
2. **6C-2b:** Player mode tab bar hardcodes color strings instead of importing PLAYER_THEME.
3. **6C-4a:** Two files use platform monospace font instead of brand fonts (one is DEV-only).
4. **6C-4b:** Legacy `lib/design-tokens.ts` font definition could cause confusion.
5. **6D-3b:** Compact header heights are hardcoded and may overflow with system font scaling.
6. **6D-4b:** Player theme muted text colors likely fail WCAG AA contrast.

---

## RECOMMENDED PRIORITY ORDER

1. **Fix the N+1 unread chat query** (6B-X1) -- batch channel IDs into a single query or use a database function. This is a performance blocker for orgs with active chat.
2. **Decide on dark mode** (6C-2a) -- either wire ThemeContext into all HomeScroll dashboards or remove the dark mode toggle from the drawer to avoid a broken feature.
3. **Add accessibility labels to all Image and interactive elements** (6D-1a, 6D-2a) -- required for app store compliance on both platforms.
4. **Surface parent-registration-hub from NoTeamState** (6A-3a) -- parents with no children should see a registration CTA, not just "Your coach will add them."
5. **Fix Team Manager greeting** (6B-X3) -- detect TM role in CoachHomeScroll and adjust the greeting text.
6. **Unify notification routing** (6B-X2) -- all roles should use the same notification screen or have explicit role-based routing.
7. **Extract hardcoded colors to tokens** (6C-1a) -- audit the 511 occurrences and migrate the most common ones to BRAND/D_COLORS/PLAYER_THEME.
8. **Replace fontWeight with fontFamily** (6C-1b) -- systematic replacement in the 30 affected files.

---

*End of Audit Report 06 -- UX/UI Quality*
