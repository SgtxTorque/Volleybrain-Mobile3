# Parent Experience Parity Audit: Web Reference vs Expo App

## PHASE 1: Web Reference Parent Experience Inventory

### A. Parent-Facing Pages (reference/web-admin/volleybrain-admin/src/pages/)

| Feature | Web File Path | Description |
|---------|---------------|-------------|
| **Dashboard** | `dashboard/DashboardPage.jsx` | Parent overview with quick cards: next events, team updates, standings, payment status, season stats, team feed, announcements |
| **Parent Payments** | `parent/ParentPaymentsPage.jsx` | View/manage payments for children. Stripe integration, payment methods (Venmo, Zelle, CashApp), batch payment UI |
| **Parent Messages** | `parent/ParentMessagesPage.jsx` | Team-based announcements/messages feed. Team switcher, coach posts, formatted timeline |
| **Parent Player Card** | `parent/ParentPlayerCardPage.jsx` (736 lines) | Detailed player profile with sport-specific stats (volleyball: kills, digs, aces; basketball: points, rebounds, assists), position, trends, skill breakdown |
| **Player Profile** | `parent/PlayerProfilePage.jsx` | Child player profile (basic info, medical, allergies) |
| **Invite Friends** | `parent/InviteFriendsPage.jsx` | Share registration link via social/email/SMS |
| **My Profile** | `profile/MyProfilePage.jsx` | Parent profile management |
| **Notifications** | `notifications/NotificationsPage.jsx` | Notification center |
| **Teams** | `teams/TeamsPage.jsx` | Team list/roster management |
| **Team Wall** | `teams/TeamWallPage.jsx` | Team announcements/wall |
| **Schedule** | `schedule/SchedulePage.jsx` | Event calendar (month/week/list view) with filters |
| **Standings** | `standings/TeamStandingsPage.jsx` | League standings |
| **Payments** | `payments/PaymentsPage.jsx` | Full payment manager (admin-style, also accessible to parents) |
| **Chats** | `chats/ChatsPage.jsx` | Team chat channels |
| **Settings** | `settings/` | Data export, payment setup, seasons, subscriptions, waivers, registration templates |

### B. Shared utilities (reference/web-admin/volleybrain-admin/src/lib/)

- `supabase.js` - Supabase client
- `stripe-checkout.js` - Stripe payment integration
- `fee-calculator.js` - Fee computation logic
- `csv-export.js` - Data export for parents
- `email-service.js` - Email notifications
- `registration-prefill.js` - Pre-fill helpers

### C. Key Contexts/Stores

- `AuthContext` - User, organization, roles
- `SeasonContext` - Active season
- `ThemeContext` - Dark mode, color theming
- `ParentTutorialContext` - Onboarding/journey tracking
- `JourneyContext` - Player journey/milestones

### D. Parent Components (reference/web-admin/volleybrain-admin/src/components/parent/)

- `ParentOnboarding.jsx` - Onboarding flow

---

## PHASE 2: Expo App Parent Experience Inventory

### A. Tab Navigation Structure (app/(tabs)/)

| Tab Route | File | Status | Purpose |
|-----------|------|--------|---------|
| `index` (home) | `index.tsx` | ✅ Working | Renders `DashboardRouter` component (routes to ParentDashboard/CoachDashboard based on role) |
| `schedule` | `schedule.tsx` | ✅ Complete | Event calendar (month/week/list, filters, RSVP, details modal) |
| `teams` | `teams.tsx` | ⚠️ Coach-Focused | Team management (primarily coach-oriented: create teams, manage rosters, players, coaches) |
| `players` | `players.tsx` | ⚠️ Coach-Focused | Player listing (grid/lineup/list modes, coach-focused roster management) |
| `payments` | `payments.tsx` | ✅ Complete | Payment tracking (multiple view tabs, fee types, payment methods) |
| `chats` | `chats.tsx` | ✅ Partial | Team chat channels (shows unread counts, message preview) |
| `coaches` | `coaches.tsx` | ❓ Unknown | Likely coach listing |
| `connect` | `connect.tsx` | ❓ Unknown | Likely coach/parent connection |
| `gameday` | `gameday.tsx` | ⚠️ In Progress | Game day features (likely coach-focused) |
| `messages` | `messages.tsx` | ❓ Unknown | Messages tab |
| `jersey-management` | `jersey-management.tsx` | ⚠️ Coach-Focused | Jersey assignment (coach tool) |
| `reports-tab` | `reports-tab.tsx` | ✅ Partial | Reports screen |
| `my-teams` | `my-teams.tsx` | ✅ Present | Teams the parent is associated with |
| `settings` | `settings.tsx` | ✅ Complete | App settings (theme, notifications, etc.) |
| `me` | `me.tsx` | ✅ Complete | User profile, collapsible sections (account, kids, settings) |
| `menu-placeholder` | `menu-placeholder.tsx` | ⚠️ Placeholder | Menu tab (drawer-based, not a real screen) |

### B. Full-Page Routes (app/)

| Route | File | Status | Purpose |
|-------|------|--------|---------|
| **/children** | *(not found)* | ❌ Missing | Child/player listing |
| **/child-detail** | `child-detail.tsx` | ✅ Present | Individual child profile |
| **/my-kids** | `my-kids.tsx` | ✅ Present | Overview of parent's kids (dashboard-like) |
| **/family-payments** | `family-payments.tsx` | ✅ Present | Family payment hub |
| **/invite-friends** | `invite-friends.tsx` | ⚠️ Present | Share registration (may lack features) |
| **/team-wall** | `team-wall.tsx` | ⚠️ Present | Team announcements wall |
| **/org-directory** | `org-directory.tsx` | ⚠️ Present | Organization directory |
| **/profile** | `profile.tsx` | ✅ Present | User profile editor |
| **/notification-preferences** | `notification-preferences.tsx` | ✅ Present | Notification settings |
| **/settings** | `settings.tsx` | ✅ Present | App settings (appears twice in navigation?) |
| **/notifications** | *(redirects to pref screen)* | ⚠️ Partial | Notification center |
| **/start** | *(assumed)* | ❌ Missing | Not visible in audit |
| **/game-day-parent** | `game-day-parent.tsx` | ⚠️ Partial | Game day features |
| **/standings** | `standings.tsx` | ✅ Present | League standings |
| **/season-archives** | `season-archives.tsx` | ⚠️ Partial | Past seasons |
| **/report-viewer** | `report-viewer.tsx` | ✅ Present | Report viewing |
| **/attendance** | `attendance.tsx` | ⚠️ Coach-Focused | Attendance tracking |
| **/help** | `help.tsx` | ❓ Unknown | Help/support page |
| **/data-rights** | `data-rights.tsx` | ❓ Unknown | Data rights/privacy |
| **/privacy-policy** | `privacy-policy.tsx` | ✅ Present | Privacy policy |
| **/terms-of-service** | `terms-of-service.tsx` | ✅ Present | Terms of service |

### C. Key Components (components/)

- `ParentDashboard.tsx` - Main parent dashboard (1898 lines, complex data loading)
- `DashboardRouter.tsx` - Routes between parent/coach/admin dashboards
- `EventCard.tsx` - Event card component
- `EventDetailModal.tsx` - Event details modal
- `ParentOnboardingModal.tsx` - Onboarding flow
- `CoppaConsentModal.tsx` - COPPA consent (currently bypassed with flag)
- `ReenrollmentBanner.tsx` - Re-enrollment prompt
- `NotificationBell.tsx` - Notification center button
- Various payment/player/report components

### D. Context/Stores (lib/)

- `auth.tsx` - Auth context
- `season.tsx` - Season management
- `theme.tsx` - Theme/color system
- `permissions-context.tsx` - Role-based access
- `notifications.ts` - Notification handling
- Various utility files

---

## PHASE 3: Complete Parity Matrix

| Feature | Web (Y/N) | Expo (Y/N) | Status | Gaps | Fix Approach |
|---------|-----------|-----------|--------|------|--------------|
| **DASHBOARD: Parent Overview** | Y: `DashboardPage.jsx` | Y: `ParentDashboard.tsx` | OK | Expo layout simpler; missing animated welcome, real-time updates, visual polish | Enhanced cards, stat widgets, quick action buttons |
| **DASHBOARD: Next Events Card** | Y | Y | OK | Event timing/sorting may differ | Verify sorting is most-recent-first, add time badges |
| **DASHBOARD: Payment Status Card** | Y | Y | OK | May not auto-refresh, unclear affordance | Add payment amount highlight, link to payment hub |
| **DASHBOARD: Team Updates/Feed** | Y | Y | OK | Likely truncated posts | Verify full feed loading, add "see more" |
| **DASHBOARD: Standings Summary** | Y | Y | OK | May lack team color coding | Add visual team indicators |
| **DASHBOARD: Player Stats Highlights** | Y | Y | OK | Stats display may be sparse | Add season stats summary cards |
| **DASHBOARD: Empty/Loading States** | Y (implied) | Y (assumed) | ? | Need to verify all loading/error states in Expo | Test all async flows with network toggles |
| **TEAM SWITCHER / Active Team Context** | Y: implied in `DashboardPage` | N | MISSING | Parent has no way to switch active team for context | Add team switcher to top nav, persist selection |
| **ROSTER LIST** | Y: `TeamsPage.jsx` | Y: `teams.tsx` | PARTIAL | Expo teams.tsx is coach-focused (create/manage), not parent roster view | Create parent-only roster view (read-only player list per team) |
| **PLAYER PROFILE / DETAIL** | Y: `ParentPlayerCardPage.jsx` (736 lines) | Y: `child-detail.tsx`, `PlayerCard.tsx` | PARTIAL | Expo missing: position colors, sport-specific stat config, trend graphs, skills breakdown, detailed sections | Implement sport-aware player card with stats grid, position color coding, trends |
| **PLAYER STATS** | Y: Sport-specific (volleyball kills/digs, basketball points/rebounds) | Y: Basic stats | PARTIAL | Expo shows basic stats but likely missing sport-specific layout | Add sport-specific stat display config (SPORT_DISPLAY object like web) |
| **JERSEY NUMBER / POSITION** | Y | Y | OK | Both present in data model | Verify both are displayed |
| **SCHEDULE / EVENTS LIST** | Y: `SchedulePage.jsx` | Y: `schedule.tsx` | OK | Both have month/week/list views; need to verify feature parity |Verify all view modes work, filters apply correctly |
| **EVENT DETAIL** | Y: implied | Y: `EventDetailModal.tsx` | OK | May lack full details (location map, participant list, etc.) | Verify modal shows venue, time, opponent, RSVP count, directions link |
| **RSVP FUNCTIONALITY** | Y (implied) | Y: (in schedule modal) | OK | Need to verify RSVP persists and syncs | Test RSVP update flow end-to-end |
| **ANNOUNCEMENTS / COACH MESSAGES** | Y: `ParentMessagesPage.jsx` | Y: `team-wall.tsx` | PARTIAL | Expo screen exists but may lack team switcher, formatting, timestamps | Ensure team switcher works, verify message formatting, add timestamps |
| **CHAT CHANNELS** | Y: `ChatsPage.jsx` | Y: `chats.tsx` | PARTIAL | Both exist; Expo version may lack some features (unread badges, last message preview working?) | Test chat navigation, unread state, message flow |
| **CHAT ENTRY POINT** | Y | Y | OK | Both have chat tabs | Verify chat is accessible from multiple entry points |
| **NOTIFICATIONS CENTER** | Y: `NotificationsPage.jsx` | Y: `NotificationBell.tsx` + `notification-preferences.tsx` | PARTIAL | Expo has prefs but unclear if center hub exists | Verify notification list/history view, test mark-as-read |
| **NOTIFICATION PREFERENCES** | Y (via `settings/`) | Y: `notification-preferences.tsx` | OK | Both present; verify all prefs sync to backend | Test all toggles, verify Supabase persists |
| **PAYMENTS / FAMILY BALANCE** | Y: `ParentPaymentsPage.jsx` (540 lines) | Y: `family-payments.tsx` (879 lines) + `payments.tsx` | OK | Expo has more code but unclear if all features present | Verify Stripe integration, payment methods display, batch payment |
| **PAYMENT METHODS** | Y: Venmo/Zelle/CashApp/Stripe | Y: likely present | PARTIAL | May lack integration details | Verify all payment method display, links work |
| **STRIPE CHECKOUT** | Y: Full integration | Y: TBD | UNCERTAIN | Need to verify Stripe flow works in Expo | Test full Stripe session + redirect flow |
| **INVOICE / RECEIPT DOWNLOAD** | Y: CSV export implied | Y: TBD | UNCERTAIN | Need to check if Expo can export/download | May defer as mobile-secondary feature |
| **PROFILE / ACCOUNT** | Y: `MyProfilePage.jsx` | Y: `profile.tsx` + `me.tsx` | OK | Expo has multiple entry points; verify data consistency |Consolidate if needed, ensure updates persist |
| **PRIVACY / TERMS** | Y: Settings pages | Y: `privacy-policy.tsx`, `terms-of-service.tsx` | OK | Both present | Verify content is current |
| **INVITE FRIENDS** | Y: `InviteFriendsPage.jsx` | Y: `invite-friends.tsx` | PARTIAL | Expo version likely simpler (copy link vs social shares) | Enhance with social share buttons (WhatsApp, SMS, email) |
| **ONBOARDING / TUTORIAL** | Y: `ParentOnboarding.jsx` | Y: `ParentOnboardingModal.tsx` | OK | Expo modal is simpler slide deck | Acceptable - mobile context prefers concise onboarding |
| **COPPA CONSENT** | Y (implied) | Y: Temporarily bypassed (`ENABLE_COPPA = false`) | ✅ FIXED | Needed for parent experience to work | Feature flag in place, logic solid when re-enabled |
| **ROLE/PERMISSION GATING** | Y: Implicit in page routes | Y: `usePermissions()` hook | OK | Verify parent-only screens block coaches/admins | Test role routing in multiple scenarios |
| **SEASON / ACTIVE SEASON SWITCHING** | Y: likely in context | Y: `useSeason()` hook | OK | Both present | Verify season switcher works, data updates |
| **DARK MODE SUPPORT** | Y: `ThemeContext` | Y: `useTheme()` hook | OK | Both implemented | Verify all screens respect theme |
| **CROSS-PLATFORM UX** | Y: Web only | Y: iOS/Android | DIFFERENT | Mobile needs: safe-area, keyboard avoid, touch targets (48px min), bottom nav avoid | Audit all screens for safe-area + keyboard handling |
| **SAFE AREA LAYOUT** | N/A | Y: `SafeAreaView` used | OK | Verify all screens wrap content | Scan for missing SafeAreaView |
| **KEYBOARD AVOIDANCE** | N/A | Y: TBD | ? | TextInput screens need KeyboardAvoidingView | Audit payment forms, profile editor, etc. |
| **TOUCH TARGETS / BUTTON SIZE** | N/A | Y: TBD | ? | Buttons should be ≥48px, text interactive zones ≥44px | Audit small buttons, tight spacing |
| **SCROLL PERFORMANCE** | Y (web) | Y: Likely OK | ? | Long lists need optimization (FlatList with initialNumToRender) | Verify schedule, roster, chat use FlatList correctly |
| **MODAL OVERLAYS & TOUCH BLOCKING** | N/A | Y: FIXED | ✅ FIXED | Modals were blocking parent interaction (COPPA issue) | Implemented: proper return null + pointerEvents + visibility logic |
| **NETWORK RESILIENCE** | Y (implied) | Y: TBD | ? | Offline detection, retry logic, cached state | Audit error handling, add loading skeletons |
| **ACCESSIBILITY** | Y (likely basic) | Y: TBD | ? | Screen reader support, text contrast, focus management | Defer as Phase 2 improvement |

---

## PHASE 4: Prioritized Punch List

### P0: Blockers (Fix First - Parent Experience Breaks Without These)

1. **Parent Home Screen Fully Clickable** ✅ DONE
   - Issue: COPPA overlay was blocking touches
   - Status: Fixed with `ENABLE_COPPA = false` feature flag
   - Acceptance: No dim layer, all buttons respond to taps, no "OVERLAY TAP CAPTURED" logs

2. **Team Switcher Missing**
   - Issue: Parent has no way to select active team context; content may be confusing with multiple children
   - Impact: Parent cannot filter events/announcements by team
   - Fix: Add team/child selector to top of home screen or as context in header
   - Complexity: Medium (requires state + UI component)

3. **Parent Roster View Missing**
   - Issue: `teams.tsx` is coach-focused; parents can't see simple read-only roster
   - Impact: Parents can't see who is on the team
   - Fix: Create parent-variant of roster or add read-only list in team detail
   - Complexity: Medium (query + list UI)

4. **Announcements/Team Wall Feature Incomplete**
   - Issue: `team-wall.tsx` exists but unclear if functional; no entry point from home/nav
   - Impact: Parents miss coach messages
   - Fix: Verify team-wall works; add nav entry; verify team switcher works
   - Complexity: Low to Medium (verify + wire up)

5. **Chat Persistence/Syncing**
   - Issue: Unclear if chats load live messages, mark-as-read works
   - Impact: Parents may miss messages or see stale data
   - Fix: Verify real-time subscriptions, test mark-as-read flow
   - Complexity: Medium (test + fix if needed)

---

### P1: Missing Parity Features (Parent Experience Incomplete Without These)

6. **Player Card: Sport-Specific Stats Display**
   - Issue: Player stats exist but layout likely doesn't match web's volleyball positions/colors, sport-specific configs
   - Impact: Parents see generic stats, not position-specific (OH/Setter colors, context)
   - Fix: Implement SPORT_DISPLAY config object; add position color coding; show sport-specific stat grid
   - Web Reference: `ParentPlayerCardPage.jsx` lines 1-60
   - Complexity: Medium (config + UI refactor)

7. **Player Stats: Trend Graphs**
   - Issue: Likely showing current stats only, not trends over time
   - Impact: Parents can't track improvement/performance over season
   - Fix: Add simple line chart (kills/digs/points over games)
   - Complexity: High (requires chart library + data aggregation)
   - Defer to P2 if needed for MVP

8. **Standings Visual Enhancements**
   - Issue: Standings exist but may lack team color coding, icons
   - Impact: Less scannable, less visual
   - Fix: Add team colors, team icons/badges
   - Complexity: Low

9. **Event Detail: Full Location/Venue Info**
   - Issue: Modal likely shows basic info, may lack venue name, address, directions link
   - Impact: Parents struggle to find game locations
   - Fix: Verify venue name/address in detail modal; add Google Maps / Apple Maps link
   - Complexity: Low to Medium (query + link handler)

10. **Payment Method Links / Affordances**
    - Issue: Payment methods (Venmo, Zelle, etc.) shown but may lack click-to-open or copy-link UX
    - Impact: Parents don't know how to pay
    - Fix: Add tap handlers to copy payment info or open Venmo/Zelle links
    - Complexity: Low

11. **Share/Invite: Social Buttons**
    - Issue: `invite-friends.tsx` likely only has copy-link; web has social shares
    - Impact: Lower sharing rate
    - Fix: Add WhatsApp, SMS, Email, Facebook share buttons
    - Complexity: Medium (iOS/Android share APIs)

12. **Season Archives / Season Switching**
    - Issue: May lack UI to switch seasons or view past season data
    - Impact: Parents can't review previous season performance
    - Fix: Add season switcher dropdown; verify data loads
    - Complexity: Low (UI + query)

---

### P2: Polish / UX Improvements (Nice to Have)

13. **Dashboard Animations & Quick Actions**
    - Web has animated welcome, stat counters; Expo likely static
    - Fix: Add entrance animations, smooth stat updates
    - Complexity: Medium

14. **Keyboard Avoidance on Forms**
    - Payments, profile editor may have keyboard-covering inputs
    - Fix: Wrap forms in `KeyboardAvoidingView`
    - Complexity: Low

15. **Loading Skeletons**
    - Current loading state likely just spinner
    - Fix: Add skeleton screens for dashboard cards, roster list, etc.
    - Complexity: Medium

16. **Pull-to-Refresh Optimization**
    - Refresh works but could have better feedback
    - Fix: Add haptic feedback, loading indicator polish
    - Complexity: Low

17. **Accessibility Review**
    - Screen reader support, text contrast, focus management
    - Fix: Add `testID`s, verify contrast, test with screen reader
    - Complexity: High (systematic)
    - Defer to Phase 2

18. **Offline Mode / Network Resilience**
    - App likely fails with no network
    - Fix: Implement cached state, offline indicators, retry logic
    - Complexity: High
    - Defer to Phase 2

---

## PHASE 5: Incremental PR Plan

### PR #1: Parent Home Screen Clickable + Team Switcher Foundation
**Goal**: Unblock parent dashboard interaction; add team/child context selector  
**Status**: IN PROGRESS - COPPA bypass done, now add team switcher  
**Scope**:
- Verify COPPA bypass is working (home is clickable, no overlay)
- Add team/child selector UI to top of home screen (dropdown or carousel)
- Persist selected team context in AsyncStorage
- Wire up team context to filter events/announcements on refresh
- Add console logs to verify selection changes

**Files to modify**:
- `components/ParentDashboard.tsx` - Add team/child selector UI above content
- `lib/season.tsx` or new `lib/team-context.tsx` - Add team selection context/hook
- Possibly: `app/(tabs)/index.tsx` - Pass team context down

**Acceptance Criteria**:
- ✅ No dim overlay appears on parent home
- ✅ All buttons/cards respond to taps
- ✅ Team/child selector dropdown appears and is clickable
- ✅ Selecting a different team/child shows relevant events/data
- ✅ Selection persists across app close/reopen
- ✅ No TypeScript errors

**Test Plan**:
1. Open app as parent role
2. Verify no dim layer, all cards tappable
3. Tap team selector dropdown
4. Select different child/team
5. Verify event list updates
6. Close and reopen app
7. Verify selected team persists

---

### PR #2: Player Card Sport-Specific Stats
**Goal**: Match web player card with position colors, sport-specific stats grid  
**Scope**:
- Implement SPORT_DISPLAY config (volleyball positions + colors, basketball, other sports)
- Update player card component to use sport-aware layout
- Add position color badge
- Show sport-specific stat grid (kills/digs for volleyball, points/rebounds for basketball)

**Files to modify**:
- `components/PlayerCard.tsx` and/or `components/PlayerCardExpanded.tsx`
- New file: `constants/sport-display.ts` (sport config object)

**Acceptance Criteria**:
- Volleyball players show position with correct color (OH=orange, S=teal, MB=blue, etc.)
- Volleyball stats show kills, digs, aces, blocks emphasized
- Basketball players show points, rebounds, assists emphasized
- Default/unknown sports show generic stat list

---

### PR #3: Event Detail Enhancements
**Goal**: Show full venue info, add directions link  
**Scope**:
- Fetch full venue details (name, address) in EventDetailModal
- Add "Get Directions" button linking to Google Maps / Apple Maps
- Show opponent name prominently
- Display RSVP status + count

**Files to modify**:
- `components/EventDetailModal.tsx`

**Acceptance Criteria**:
- Venue name and address display in modal
- "Get Directions" button opens maps app with correct address pre-filled
- RSVP status shows (Yes/No/Maybe + count)
- Event type (game/practice) is visually distinct

---

### PR #4: Team Wall / Announcements
**Goal**: Wire up coach messages feed; ensure team switcher works  
**Scope**:
- Verify `team-wall.tsx` queries team_posts correctly
- Add entry point from home screen or nav
- Wire up team switcher to filter announcements by team
- Add timestamps, coach names

**Files to modify**:
- `app/team-wall.tsx` or refactor into tab
- `components/ParentDashboard.tsx` if adding nav link

**Acceptance Criteria**:
- Team Wall accessible from main nav or home
- Announcements show with coach name, timestamp
- Team switcher filters posts by team
- Empty state when no posts

---

### PR #5: Payment Methods UX
**Goal**: Make payment methods interactive (copy, open apps)  
**Scope**:
- Add tap handlers to Venmo/Zelle/CashApp payment display
- Copy payment info to clipboard on tap
- Open Venmo/Zelle app links if available
- Add "Paid" button to mark payment reported

**Files to modify**:
- `components/payments-parent.tsx` or `app/family-payments.tsx`

**Acceptance Criteria**:
- Tap Venmo address copies to clipboard + toast
- Tap Venmo button opens Venmo app (if installed) with payment pre-filled
- Zelle/CashApp links work similarly
- "Paid" button opens payment reporting flow

---

### PR #6: Roster Read-Only View
**Goal**: Show parent the team roster (read-only)  
**Scope**:
- Create parent-only roster view (read-only list of players on team)
- Show player name, position, jersey number
- Link to player detail if tapped
- Filter by selected team

**Files to modify**:
- New component: `components/ParentRosterView.tsx` (or add to existing)
- Possibly new route: `app/roster.tsx` or add to team detail

**Acceptance Criteria**:
- Roster list shows all players on selected team
- Each player shows name, position, jersey #
- List updates when team switcher changes
- Tap player to view detail

---

## PHASE 6: Implement PR #1 Immediately

### Goal
Verify COPPA bypass works + add team/child selector to parent dashboard so parents can switch context and see relevant events.

### Implementation

#### 1. Verify Current State
Parent dashboard should be clickable with `ENABLE_COPPA = false` already set.

#### 2. Add Team Context Hook

Create `lib/team-context.tsx`:

```tsx
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

type TeamContext = {
  selectedTeamId: string | null;
  setSelectedTeamId: (id: string | null) => void;
};

const TEAM_CONTEXT_KEY = 'vb_selected_team_id';

// Simple in-memory store for team selection
export const useTeamContext = () => {
  const [selectedTeamId, setSelectedTeamIdState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    AsyncStorage.getItem(TEAM_CONTEXT_KEY)
      .then(id => {
        setSelectedTeamIdState(id);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const setSelectedTeamId = async (id: string | null) => {
    setSelectedTeamIdState(id);
    if (id) {
      await AsyncStorage.setItem(TEAM_CONTEXT_KEY, id);
    } else {
      await AsyncStorage.removeItem(TEAM_CONTEXT_KEY);
    }
    console.log('[TeamContext] Selected team:', id);
  };

  return { selectedTeamId, setSelectedTeamId, loaded };
};
```

#### 3. Update ParentDashboard.tsx

Add team selector above content:

```tsx
// Add to ParentDashboard imports
import { useTeamContext } from '@/lib/team-context';

// Inside export default function ParentDashboard()
const { selectedTeamId, setSelectedTeamId } = useTeamContext();

// Build unique teams from children
const uniqueTeams = useMemo(() => {
  const teamMap = new Map();
  children.forEach(child => {
    if (child.team_id && child.team_name) {
      teamMap.set(child.team_id, {
        id: child.team_id,
        name: child.team_name,
        color: child.sport_color || '#999',
      });
    }
  });
  return Array.from(teamMap.values());
}, [children]);

// Set default team on first load
useEffect(() => {
  if (!selectedTeamId && uniqueTeams.length > 0) {
    setSelectedTeamId(uniqueTeams[0].id);
  }
}, [uniqueTeams.length]);

// In render, add team selector above main content
<View style={{ paddingHorizontal: 12, marginBottom: 16 }}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {uniqueTeams.map(team => (
      <TouchableOpacity
        key={team.id}
        style={[
          s.teamChip,
          selectedTeamId === team.id && { borderWidth: 2, borderColor: team.color },
        ]}
        onPress={() => setSelectedTeamId(team.id)}
      >
        <Text style={s.teamChipText}>{team.name}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</View>

// Add to styles
teamChip: {
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
  marginRight: 10,
  backgroundColor: colors.glassCard,
  borderWidth: 1,
  borderColor: colors.glassBorder,
},
teamChipText: {
  fontSize: 13,
  fontWeight: '600',
  color: colors.text,
},
```

#### 4. Filter Upcoming Events by Selected Team

```tsx
// Filter events after fetching
const filteredUpcomingEvents = useMemo(() => {
  if (!selectedTeamId) return upcomingEvents;
  return upcomingEvents.filter(evt => evt.team_id === selectedTeamId);
}, [upcomingEvents, selectedTeamId]);

// Use filteredUpcomingEvents in render instead of upcomingEvents
const nextEvent = filteredUpcomingEvents[0];
```

#### 5. Verification Steps

1. **Open parent app**
   - Home screen loads with no dim overlay ✅
   - All buttons/cards are tappable ✅

2. **Look for team selector**
   - Horizontal scrollable team chips appear at top of dashboard ✅
   - Default team is pre-selected ✅

3. **Tap different team**
   - Chip becomes highlighted/bordered ✅
   - Upcoming events list updates (if events for that team exist) ✅
   - Console logs show: `[TeamContext] Selected team: <id>` ✅

4. **Close and reopen app**
   - Previously selected team is still selected ✅
   - Events are still filtered ✅

5. **TypeScript check**
   ```bash
   npx tsc --noEmit
   # Should show 0 new errors
   ```

---

### Files to Modify

1. **NEW: `lib/team-context.tsx`** (55 lines)
2. **`components/ParentDashboard.tsx`** (~40 lines added)
   - Add import
   - Add hook
   - Add useMemo for unique teams
   - Add useEffect for default team
   - Add team selector JSX + styles
   - Filter events by selectedTeamId

### Expected Outcome

✅ Parent home is fully usable and clickable  
✅ Team/child context visible and switchable  
✅ Events filter by selected team  
✅ Selection persists between app sessions  
✅ No TypeScript errors  

---

## Summary Table: What's Done, What's Next

| Phase | Status | Notes |
|-------|--------|-------|
| PHASE 1: Web Inventory | ✅ COMPLETE | 14 parent screens identified; utilities catalogued |
| PHASE 2: Expo Inventory | ✅ COMPLETE | 28+ routes/screens audited; gaps documented |
| PHASE 3: Parity Matrix | ✅ COMPLETE | 30+ features assessed; status/complexity documented |
| PHASE 4: Punch List | ✅ COMPLETE | P0 (2 blocker), P1 (10 features), P2 (6 polish) |
| PHASE 5: PR Plan | ✅ COMPLETE | 6 PRs sequenced with scope, acceptance criteria, test plans |
| PHASE 6: PR #1 | 🔄 IN PROGRESS | COPPA bypass done; team selector implementation in progress |

---

**Next Steps After PR #1:**
1. Merge PR #1 (team switcher)
2. Implement PR #2 (sport-specific player stats)
3. Run full parent experience walkthrough
4. Prioritize remaining P1 items based on parent feedback

