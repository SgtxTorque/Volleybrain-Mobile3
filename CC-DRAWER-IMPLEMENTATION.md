# CC-DRAWER-IMPLEMENTATION.md
## Lynx Mobile — Facebook-Style Gesture Navigation Drawer
### Complete Implementation Plan for Claude Code

**Feature:** Replace the old Modal-based AppDrawer with a gesture-driven navigation drawer
**Scope:** App-wide navigation overhaul — this drawer becomes the single hub for ALL secondary navigation

---

## PREREQUISITE

Read `CC-LYNX-RULES.md` in the project root FIRST. All 15 rules apply to every phase below.

---

## WHAT WE'RE BUILDING

A Facebook-style left-edge navigation drawer that:
- Opens via left edge swipe gesture (25px activation zone)
- Opens via "More" hamburger tab in bottom navigation
- Uses spring physics for natural feel (react-native-reanimated)
- Contains ALL navigation items organized by role
- Has a rich profile header with avatar, roles, and org info
- Features collapsible accordion sections
- Includes horizontal shortcut rows for quick access
- Shows live badge counts for actionable items
- Supports haptic feedback on open/close
- Replaces both the Manage tab content and Me tab content

---

## PHASE 0: FOUNDATION — Clean Up & Commit What Exists
**Goal:** Get the staged drawer files committed and stable as the foundation.

### Tasks:
1. **Audit the 4 staged files** — Read `components/GestureDrawer.tsx`, `lib/drawer-context.tsx`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx` in their current modified state
2. **Verify gesture handler setup** — Confirm `GestureHandlerRootView` wraps the entire app in `app/_layout.tsx`
3. **Verify DrawerProvider** — Confirm it's inside `PermissionsProvider` so role data is available
4. **Verify the More tab** — Confirm `menu-placeholder` tab calls `openDrawer()` on press
5. **Test basic open/close** — The drawer should open via hamburger tap and close via scrim tap or swipe left
6. **Fix any TypeScript errors** — Run `npx tsc --noEmit`, fix any issues in the 4 files
7. **Remove the old AppDrawer import** — If `AppDrawer.tsx` is still imported anywhere, remove the import (keep the file for reference but don't use it)

### Commit:
```bash
git add .
git commit -m "feat: Gesture Drawer Phase 0 - foundation, gesture handler setup, drawer context, More tab wiring"
git push origin main
```

---

## PHASE 1: PROFILE HEADER — Identity & Organization
**Goal:** Build a premium profile header that anchors the drawer.

### Profile Header Layout:
```
┌─────────────────────────────────────────┐
│  ┌─────┐                          [✕]  │
│  │ 📷  │  Carlos Fuentez               │
│  │     │  Admin · Head Coach · Parent   │
│  └─────┘  Black Hornets Athletics       │
│                                         │
│  [ View Profile → ]                     │
├─────────────────────────────────────────┤
```

### Tasks:
1. **Avatar** — Circular, 56x56. Use `profile.avatar_url || profile.photo_url`. Fallback: gradient circle with first initial. Use `expo-image` (already installed) with `contentFit="cover"`.
2. **Name** — `profile.full_name || user.email.split('@')[0] || 'User'`. Bold, 18-20px.
3. **Role Badges** — Use `actualRoles` from `usePermissions()`. Map to display names: `league_admin → Admin`, `head_coach → Head Coach`, `assistant_coach → Asst. Coach`, `parent → Parent`, `player → Player`. Show as "Admin · Head Coach · Parent" format. Each role badge can optionally be a small colored pill.
4. **Organization Name** — `organization?.name || 'Lynx Sports'`. Muted text below role badges.
5. **View Profile Link** — Tappable text that navigates to `/profile` route and closes drawer.
6. **Close Button** — `✕` icon in top-right corner, calls `closeDrawer()`.
7. **Background** — Subtle gradient or accent-tinted header area that respects dark/light mode.

### Commit:
```bash
git commit -m "feat: Gesture Drawer Phase 1 - profile header with avatar, roles, org name"
```

---

## PHASE 2: SHORTCUT ROW — Horizontal Quick Access
**Goal:** Add a Facebook-style horizontal scrolling shortcuts row below the profile header.

### Shortcut Row Layout:
```
┌─────────────────────────────────────────┐
│  [ 🏠 Home ] [ 📅 Schedule ] [ 💬 Chat ] [ 📢 Blasts ] [ 🏐 Teams ]  │
│  ← scrollable →                                                        │
└─────────────────────────────────────────┘
```

### Tasks:
1. **Horizontal ScrollView** — `horizontal`, `showsHorizontalScrollIndicator={false}`, bounces
2. **Shortcut Pills** — Rounded rectangles (60-70px wide, icon + label stacked vertically). Tappable → navigate + close drawer.
3. **Role-Aware Content:**
   - **Always visible:** Home, Schedule, Chats, Announcements
   - **Admin adds:** Registration Hub (with badge count if pending), Reports
   - **Coach adds:** Game Prep, Roster, Lineup Builder
   - **Parent adds:** My Kids, Payments
   - **Player adds:** My Stats, Achievements
4. **Badge Dots** — Small red dot on shortcuts that need attention (unread chats, pending registrations, unpaid fees). Query these counts on drawer open from Supabase:
   - Pending registrations: `registrations` table where `status = 'new'`
   - Unread messages: existing unread count from chat system
   - Unpaid fees: `payment_items` where `status != 'paid'`
   - Verify all column names against SCHEMA_REFERENCE.csv before writing queries
5. **Haptic Feedback** — Use `expo-haptics` (already installed). Light impact on tap.

### Commit:
```bash
git commit -m "feat: Gesture Drawer Phase 2 - horizontal shortcut row with role-aware pills and badge counts"
```

---

## PHASE 3: MENU SECTIONS — Complete Role-Based Navigation
**Goal:** Build the full menu with all navigation items organized into role-aware sections.

### Menu Architecture:

**Section 1: Quick Access (always visible, always expanded)**
| Item | Icon | Route | Notes |
|------|------|-------|-------|
| Home | home | /(tabs) | |
| Schedule | calendar | /(tabs)/gameday | |
| Chats | chatbubbles | /(tabs)/chats | Badge: unread count |
| Announcements | megaphone-outline | /(tabs)/messages | |
| Team Wall | people | /(tabs)/connect | |

**Section 2: Admin Tools (Admin only, collapsible, default OPEN)**
| Item | Icon | Route | Badge |
|------|------|-------|-------|
| Registration Hub | person-add | /registration-hub | Pending count |
| User Management | people-circle | /users | Pending approvals |
| Payment Admin | card | /(tabs)/payments | Outstanding balance |
| Team Management | shirt | /team-management | Unrostered count |
| Jersey Management | shirt-outline | /(tabs)/jersey-management | |
| Coach Directory | clipboard | /coach-directory | |
| Season Management | calendar | /season-settings | |
| Reports & Analytics | bar-chart | /(tabs)/reports-tab | |
| Org Directory | business | /org-directory | |
| Season Archives | archive | /season-archives | |
| Blast Composer | megaphone | /blast-composer | |
| Blast History | time | /blast-history | |
| Form Builder | document-text | /web-features | (web only indicator) |
| Waiver Editor | shield-checkmark | /web-features | (web only indicator) |
| Payment Gateway | card-outline | /web-features | (web only indicator) |
| Org Settings | settings-outline | /web-features | (web only indicator) |

**Section 3: Coaching Tools (Admin + Coach, collapsible, default closed)**
| Item | Icon | Route |
|------|------|-------|
| Game Prep | analytics | /game-prep |
| Lineup Builder | grid | /lineup-builder |
| Attendance | checkmark-circle | /attendance |
| Game Results | stats-chart | /game-results |
| Coach Availability | calendar-outline | /coach-availability |
| Coach Profile | person-circle | /coach-profile |
| My Teams | shirt | /(tabs)/my-teams |
| Roster | people | /(tabs)/players |

**Section 4: My Family (Parent only, collapsible, default open)**
| Item | Icon | Route | Badge |
|------|------|-------|-------|
| My Children | people | /my-kids | |
| Registration Hub | clipboard | /parent-registration-hub | |
| Payments | wallet | /family-payments | Unpaid count |
| Waivers | document-text | /my-waivers | Unsigned count |
| Invite Friends | share-social | /invite-friends | |
| Data Rights | lock-closed | /data-rights | |

**Section 5: My Stuff (Player only, collapsible, default open)**
| Item | Icon | Route |
|------|------|-------|
| My Teams | shirt | /(tabs)/my-teams |
| My Stats | stats-chart | /my-stats |
| Achievements | ribbon | /achievements |
| Schedule | calendar | /(tabs)/gameday |

**Section 6: League & Community (always visible, collapsible, default closed)**
| Item | Icon | Route |
|------|------|-------|
| Team Wall | people | /(tabs)/connect |
| Standings | trophy | /standings |
| Achievements | ribbon | /achievements |
| Coach Directory | school | /coach-directory |
| Find Organizations | business | /org-directory |

**Section 7: Settings & Privacy (always visible, collapsible, default closed)**
| Item | Icon | Route |
|------|------|-------|
| My Profile | person-circle | /profile |
| Settings | settings | /(tabs)/settings |
| Notifications | notifications-outline | /notification-preferences |
| Season Settings | calendar | /season-settings |
| Season History | archive | /season-archives |
| Privacy Policy | shield-checkmark | /privacy-policy |
| Terms of Service | document | /terms-of-service |

**Section 8: Help & Support (always visible, collapsible, default closed)**
| Item | Icon | Route |
|------|------|-------|
| Help Center | help-circle | /help |
| Web Features | globe | /web-features |
| Data Rights | lock-closed | /data-rights |

### Tasks:
1. **Build complete section data** — Each section: id, title, items[], collapsible, defaultOpen, roleGate
2. **Menu item component** — Icon (36x36 rounded square bg), label, optional badge, chevron-forward
3. **Collapsible accordion** — Using LayoutAnimation + Animated rotation for chevron. Toggle on header tap.
4. **Web-only indicators** — Items that route to `/web-features` should show a small "Web" badge to indicate they open a "use web portal" screen
5. **Section dividers** — Subtle hairline between sections, using `colors.border`
6. **Active item highlighting** — If the current route matches the item's route, highlight with accent color background

### Commit:
```bash
git commit -m "feat: Gesture Drawer Phase 3 - complete role-based menu sections with collapsible accordions"
```

---

## PHASE 4: LIVE BADGE COUNTS & DATA
**Goal:** Make the drawer feel alive with real-time badge counts.

### Tasks:
1. **Create `hooks/useDrawerBadges.ts`** — A custom hook that fetches badge counts when the drawer opens:
   - `pendingRegistrations` — Admin: `registrations` where `status = 'new'` for active season
   - `pendingApprovals` — Admin: `profiles` or `user_roles` where approval is pending
   - `unpaidPayments` — Admin: unpaid `payment_items` count. Parent: unpaid items for their family
   - `unrosteredPlayers` — Admin: `registrations` with `status = 'active'` not assigned to a team
   - `unsignedWaivers` — Parent: `waivers` not yet signed for their children
   - `unreadChats` — All roles: unread message count from chat system
   - **CRITICAL:** Read SCHEMA_REFERENCE.csv for exact table/column names before writing ANY query
2. **Badge rendering** — Red circle with white count text. Position: right-aligned in menu item row. If count > 99, show "99+".
3. **Refresh on drawer open** — When `isOpen` changes to true, refetch all counts. Use `useEffect` watching `isOpen`.
4. **Loading state** — Show skeleton pulse on badge positions while counts load. Don't block the menu.
5. **Error handling** — If a query fails, don't show a badge (fail silent). Gate errors behind `__DEV__`.

### Commit:
```bash
git commit -m "feat: Gesture Drawer Phase 4 - live badge counts for registrations, payments, waivers, chats"
```

---

## PHASE 5: SIGN OUT, VERSION FOOTER & POLISH
**Goal:** Complete the drawer with sign out, version info, and visual polish.

### Footer Layout:
```
┌─────────────────────────────────────────┐
│  ─────────────────────────────────────  │
│  [ 🚪 Sign Out ]                       │
│                                         │
│  Lynx v1.0.0                            │
└─────────────────────────────────────────┘
```

### Tasks:
1. **Sign Out Button** — Full-width, separated by a hairline divider above. Red/danger color text and icon. On press: show `Alert.alert` confirmation → if confirmed, close drawer then call `signOut()` from auth context.
2. **Version Text** — "Lynx v1.0.0" centered, small muted text below sign out. Hardcoded for now (can later pull from `app.json`).
3. **Safe Area Handling** — `paddingTop: insets.top` on drawer container. `paddingBottom: insets.bottom` on footer.
4. **Scroll Behavior** — `ScrollView` for the menu body with `showsVerticalScrollIndicator={false}`, `bounces={true}`. Footer stays pinned at bottom (outside ScrollView).
5. **Platform Shadows** — iOS: `shadowColor/shadowOffset/shadowOpacity/shadowRadius`. Android: `elevation: 16`.
6. **Haptic Feedback** — `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` when drawer opens. `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` on menu item tap.
7. **Scrim** — Semi-transparent black overlay behind drawer (opacity 0.55). Tappable to close.
8. **Edge polish** — Rounded top-right and bottom-right corners on the drawer panel (borderTopRightRadius: 20, borderBottomRightRadius: 20).

### Commit:
```bash
git commit -m "feat: Gesture Drawer Phase 5 - sign out, version footer, haptics, visual polish"
```

---

## PHASE 6: TAB BAR CLEANUP & NAVIGATION CONSOLIDATION
**Goal:** Now that the drawer has everything, simplify the tab bar and clean up dead navigation.

### Tab Bar Changes:
**Before:** Home | Game Day | Team | Manage | More
**After:** Home | Game Day | Team | Chat | More (☰)

### Tasks:
1. **Replace Manage tab with Chat tab** — The Manage tab's content now lives entirely in the drawer. Replace it with a Chat tab that navigates to `/(tabs)/chats`. Use `chatbubbles` / `chatbubbles-outline` icon. Show unread badge count.
2. **Keep the More tab** — Still opens the drawer via `openDrawer()`.
3. **Hide `manage` screen** — Add `manage` to hidden tabs with `href: null`. Keep the file for fallback but it's no longer a visible tab.
4. **Hide `me` screen** — Already hidden. Confirm `me` has `href: null`. All its content is now in the drawer (Settings & Privacy section + profile header).
5. **Update "More" tab badge** — Show a combined badge count on the More tab icon if there are any actionable items in the drawer (pending registrations + unpaid payments + unsigned waivers). Use the `useDrawerBadges` hook.
6. **Verify all hidden tab routes still work** — Items in the drawer that route to `/(tabs)/players`, `/(tabs)/payments`, etc. must still navigate correctly even though those tabs are hidden. Test by navigating from drawer.
7. **Remove any references to old AppDrawer** — If `AppDrawer.tsx` is still imported or rendered anywhere, remove those references. Keep the file as legacy reference.

### Commit:
```bash
git commit -m "feat: Gesture Drawer Phase 6 - tab bar cleanup, Manage → Chat, navigation consolidation"
```

---

## PHASE 7: TESTING & STABILITY
**Goal:** Verify nothing is broken across all 4 roles.

### Tasks:
1. **Run `npx tsc --noEmit`** — Fix any TypeScript errors.
2. **Role-by-role smoke test audit:**
   - **Admin:** Open drawer → verify all Admin Tools items navigate correctly. Verify badge counts show. Verify Coaching Tools section appears. Verify League section. Verify sign out works.
   - **Coach (non-admin):** Open drawer → verify My Teams section appears (not Admin Tools). Verify coaching tools (Game Prep, Lineup, Attendance). Verify no admin items leak through.
   - **Parent:** Open drawer → verify My Family section appears. Verify My Children, Payments, Waivers navigate. Verify no admin/coach items appear.
   - **Player:** Open drawer → verify My Stuff section appears (My Teams, Stats, Achievements). Verify minimal clean menu.
   - **Multi-role (Admin+Coach+Parent):** Open drawer → verify ALL relevant sections appear. No duplicates. All items work.
3. **Gesture testing:**
   - Edge swipe from left opens drawer
   - Swipe left on drawer closes it
   - Tap scrim closes drawer
   - Hamburger tab opens drawer
   - Quick swipe (velocity > 500) snaps open/closed
   - Vertical scroll inside drawer doesn't trigger close gesture
4. **Report results** — List any broken items. Fix surgically.

### Commit:
```bash
git commit -m "feat: Gesture Drawer Phase 7 - stability testing, role verification, gesture polish"
```

---

## SUMMARY: FILE CHANGES BY PHASE

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 0 | — | Commit existing staged files |
| 1 | — | `components/GestureDrawer.tsx` (profile header) |
| 2 | — | `components/GestureDrawer.tsx` (shortcut row) |
| 3 | — | `components/GestureDrawer.tsx` (menu sections) |
| 4 | `hooks/useDrawerBadges.ts` | `components/GestureDrawer.tsx` (badge integration) |
| 5 | — | `components/GestureDrawer.tsx` (footer, haptics, polish) |
| 6 | — | `app/(tabs)/_layout.tsx` (Manage → Chat swap) |
| 7 | — | Any files needing TypeScript fixes |

### Files NOT to touch:
- `components/AppDrawer.tsx` — Legacy, keep for reference
- Any dashboard file (AdminDashboard, CoachDashboard, ParentDashboard, PlayerDashboard)
- Any existing screen that isn't part of this feature
- Auth flow, Supabase config, theme system

---

## DESIGN TOKENS REFERENCE

Use these from `lib/design-tokens.ts` and `lib/theme.tsx`:

```typescript
// From theme
colors.primary      // Main accent
colors.background   // Screen background
colors.card         // Card/surface background
colors.text         // Primary text
colors.textSecondary // Secondary text
colors.textMuted    // Muted text
colors.border       // Dividers
colors.danger       // Red / destructive
colors.success      // Green
colors.warning      // Yellow/orange
colors.info         // Blue
colors.glassCard    // Glassmorphism card bg
isDark              // Boolean for dark mode

// From design-tokens
spacing.xs (4), spacing.sm (8), spacing.md (16), spacing.lg (24), spacing.xl (32)
radii.sm (8), radii.md (12), radii.lg (16), radii.xl (20), radii.full (9999)
shadows.card, shadows.elevated
```

---

## GESTURE CONFIGURATION REFERENCE

These values are already defined in the staged `GestureDrawer.tsx`. Keep them consistent:

```typescript
DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340)  // 82% of screen, max 340px
EDGE_SWIPE_ZONE = 25        // px from left edge to activate
VELOCITY_THRESHOLD = 500    // px/s for snap decisions
SNAP_THRESHOLD = DRAWER_WIDTH * 0.35  // 35% of drawer width
SPRING_CONFIG = { damping: 22, stiffness: 200, mass: 0.8 }
```
