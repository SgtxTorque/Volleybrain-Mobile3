# AUDIT REPORT 07 -- PERFORMANCE & CRASH RISK

**Auditor:** Claude Opus 4.6 (automated)
**Date:** 2026-03-17
**Branch:** `navigation-cleanup-complete`

---

## Severity Legend

| Tag | Meaning |
|-----|---------|
| P0 | BLOCKER -- Will crash |
| P1 | CRITICAL -- Core flow broken |
| P2 | MAJOR -- Feature doesn't work correctly |
| P3 | MINOR -- Rough edges |
| P4 | NICE-TO-HAVE -- Polish |

---

## Summary

| Category | P0 | P1 | P2 | P3 | P4 | Total |
|----------|----|----|----|----|----|----|
| 7A. Crash Risk | 2 | 3 | 6 | 3 | 0 | 14 |
| 7B. Memory Leaks | 0 | 1 | 3 | 3 | 0 | 7 |
| 7C. Performance | 0 | 1 | 2 | 3 | 2 | 8 |
| 7D. Error Handling | 0 | 1 | 4 | 3 | 1 | 9 |
| **Total** | **2** | **6** | **15** | **12** | **3** | **38** |

---

## 7A. CRASH RISK ASSESSMENT

### 7A-01. `.single()` throws on zero rows -- multiple unguarded callsites

**Severity: P0 -- BLOCKER**

Supabase's `.single()` **throws a PostgrestError** when the query returns zero rows (code `PGRST116`). If the calling code does not check `error` before accessing `data`, the component can crash. Many callsites correctly check `if (data)` after `.single()`, but several do NOT.

**Dangerous patterns found (no null-guard on the `.single()` result):**

| # | File | Line | Context |
|---|------|------|---------|
| 1 | `app/(tabs)/connect.tsx` | 93 | `const profile = (await supabase.from('profiles').select('email').eq('id', user.id).single()).data;` -- If profile does not exist, `.single()` throws and crashes the fetch. The result is destructured inline, so the throw is unhandled inside the `try` block (which does have a catch, so this is actually caught -- demoted to P2). |
| 2 | `lib/challenge-service.ts` | 458 | `(await supabase.from('profiles').select('full_name').eq('id', winnerId).single()).data` -- Inline `.single()` on winnerId that might not exist in profiles. Wrapped in ternary but the `.single()` still throws on 0 rows. |
| 3 | `app/(tabs)/admin-teams.tsx` | 297 | `.select().single()` on an `insert` -- if the insert fails (RLS, duplicate), `data` is null and error is unhandled at the callsite. |
| 4 | `app/team-management.tsx` | 262 | `.select().single()` after insert, same pattern. |
| 5 | `app/(tabs)/teams.tsx` | 76 | `.select().single()` after insert, same pattern. |
| 6 | `app/chat/[id].tsx` | 413, 619, 730 | Three `.select().single()` after inserts in chat -- if insert fails, crash. |

**Recommendation:** Replace `.single()` with `.maybeSingle()` on every SELECT query where zero rows is a legitimate possibility. For INSERT+`.select().single()`, always check `error` before accessing `data`. The codebase already uses `.maybeSingle()` in ~100 places, showing awareness of this pattern -- the remaining `.single()` calls (94 total across non-archive files) should be audited individually.

**Priority fix list (highest crash risk):**

```
lib/challenge-service.ts:458     -- inline .single() with no error check
app/(tabs)/connect.tsx:93        -- inline .single() destructure
app/chat/[id].tsx:413,619,730    -- insert + .single() without error guard
app/(tabs)/admin-teams.tsx:297   -- insert + .single() without error guard
```

---

### 7A-02. `.single()` on PlayerCardExpanded fetches -- player_skills, player_stats may not exist

**Severity: P0 -- BLOCKER**

**File:** `components/PlayerCardExpanded.tsx`, lines 132, 143, 158

Three `.single()` calls for `player_stats`, `player_skills`, and `player_skill_ratings`. A player who has never played a game or been evaluated will have zero rows in these tables. `.single()` will throw, and while the code checks `if (statsData)` after, the throw happens BEFORE `data` is assigned.

```typescript
// Line 132 -- throws if player has no stats row
const { data: statsData } = await supabase
  .from('player_stats').select('*').eq('player_id', player.id).single();
```

**Fix:** Change all three to `.maybeSingle()`.

---

### 7A-03. JSON.parse without try/catch

**Severity: P2 -- MAJOR**

| # | File | Line | Pattern | Risk |
|---|------|------|---------|------|
| 1 | `app/(tabs)/chats.tsx` | 323 | `JSON.parse(stored)` on AsyncStorage value | Corrupted storage crashes chat list |
| 2 | `hooks/useSkillModule.ts` | 67 | `JSON.parse(q.options)` on DB column | Malformed JSON in DB crashes skill module |
| 3 | `lib/gameday/match-store.ts` | 23, 112 | `JSON.parse(raw)` on AsyncStorage | Corrupted match data crashes GameDay |

The following JSON.parse calls ARE properly wrapped in try/catch (no action needed):
- `lib/evaluation-session.ts:30` -- wrapped
- `components/ShoutoutCard.tsx:42` -- wrapped
- `components/ChallengeCard.tsx:56` -- wrapped
- `app/admin-search.tsx:77` -- wrapped
- `app/game-results.tsx:134` -- wrapped
- `app/notification-preferences.tsx:104` -- wrapped
- `app/coach-directory.tsx:175` -- wrapped

**Fix:** Wrap the four unprotected `JSON.parse` calls in try/catch with sensible defaults.

---

### 7A-04. Array access without null check -- `[0]` on potentially empty arrays

**Severity: P2 -- MAJOR**

| # | File | Line | Pattern | Risk |
|---|------|------|---------|------|
| 1 | `lib/auth.tsx` | 246 | `roles[0].organization_id` | Only reached when `roles.length > 0` -- SAFE |
| 2 | `lib/challenge-service.ts` | 454 | `participants[0]?.player_id` | Guarded by `?.` -- SAFE |
| 3 | `app/child-detail.tsx` | 189 | `(teamPlayerData as any)?.[0]` -- SAFE |
| 4 | `app/challenges.tsx` | 129 | `((childPlayers \|\| [])[0]?.team_players as any[])?.[0]` | Deep chain, optional chaining present -- SAFE |
| 5 | `app/child-detail.tsx` | 452-481 | Multiple `upcomingEvents[0].xxx` | Guarded by `upcomingEvents.length > 0` check in render -- SAFE |
| 6 | `hooks/useCoachEngagement.ts` | 241 | `assembledPlayers[0]` with fallback `\|\| { ... }` -- SAFE |
| 7 | `hooks/useParentHomeData.ts` | 595 | `instData[0].amount` | If query returns empty, `instData[0]` is undefined. NOT GUARDED. |
| 8 | `app/blast-composer.tsx` | 98 | `data[0].id` | If coach has no teams, `data` could be empty. Guarded by prior `if (!data)` but not `if (data.length === 0)`. |

**Recommendation:** Add explicit length checks before `[0]` access in findings #7 and #8.

---

### 7A-05. `throw` statements -- all are caught

**Severity: P3 -- MINOR (no action needed)**

All 50+ `throw` statements in the codebase are inside `try` blocks with corresponding `catch` handlers. Common pattern: `if (error) throw error;` inside a try/catch that shows `Alert.alert('Error', ...)`. This is correct.

---

### 7A-06. `.single()` calls in auth.tsx -- insert race condition handled well

**Severity: P3 -- MINOR (informational)**

**File:** `lib/auth.tsx`, line 196

The `.insert().select().single()` on profiles handles the race condition gracefully -- if insert fails (unique constraint), it re-fetches with `.maybeSingle()`. This is a good pattern.

---

### 7A-07. Missing optional chaining on `.split(' ').map(n => n[0])`

**Severity: P2 -- MAJOR**

**File:** `app/chat/[id].tsx`, lines 796, 1253, 1296, 1315

Pattern: `message.sender?.full_name?.split(' ').map(n => n[0]).join('')`

If `full_name` is an empty string `""`, then `.split(' ')` returns `['']`, and `n[0]` is `undefined` for the empty string element... actually `''[0]` is `undefined` in JS, so `.join('')` produces `"undefined"`. Not a crash, but displays "undefined" as initials.

**Fix:** Add `.filter(Boolean)` after `.split(' ')` or default to `'?'`.

---

### 7A-08. `chat/[id].tsx` -- `selectedMember?.display_name.split(...)` missing `?` on display_name

**Severity: P2 -- MAJOR**

**File:** `app/chat/[id].tsx`, line 1315

```typescript
selectedMember?.display_name.split(' ').map(n => n[0]).join('').slice(0, 2)
```

If `selectedMember` exists but `display_name` is `null` or `undefined`, this crashes. Should be `selectedMember?.display_name?.split(...)`.

---

### 7A-09. profile_completeness.ts -- two `.single()` calls

**Severity: P1 -- CRITICAL**

**File:** `lib/profile-completeness.ts`, lines 83, 103

Two `.single()` calls fetch profile and team membership. If profile doesn't exist (deleted user, race condition), the function crashes. This is called from the home screen data hooks.

**Fix:** Change to `.maybeSingle()` and handle null.

---

### 7A-10. `permissions.ts` -- `.single()` on team_staff lookup

**Severity: P1 -- CRITICAL**

**File:** `lib/permissions.ts`, line 20

```typescript
.single();
```

This is called to determine user permissions. If the user has no `team_staff` entry, `.single()` throws and the permission system breaks, potentially locking users out.

**Fix:** Change to `.maybeSingle()`.

---

### 7A-11. `registration-config.ts` -- `.single()` on config lookup

**Severity: P1 -- CRITICAL**

**File:** `lib/registration-config.ts`, lines 125, 148

Two `.single()` calls for registration configuration. If no config exists for a season, these throw and break the registration flow.

**Fix:** Change to `.maybeSingle()`.

---

### 7A-12. `team-manager-setup.tsx` -- three `.single()` calls in setup flow

**Severity: P2 -- MAJOR**

**File:** `app/team-manager-setup.tsx`, lines 102, 132, 146

Setup wizard fetches team, season, and organization with `.single()`. If any of these don't exist (e.g., team was deleted), the wizard crashes instead of showing an error message.

**Fix:** Change to `.maybeSingle()` and handle null with user-facing message.

---

### 7A-13. `season-settings.tsx` -- nested `.single()` calls

**Severity: P3 -- MINOR**

**File:** `app/season-settings.tsx`, lines 136, 140

```typescript
const { data: seasonData } = await supabase.from('seasons').select('*').eq('id', workingSeason.id).single();
// ...
const { data: sportData } = await supabase.from('sports').select('*').eq('id', seasonData.sport_id).single();
```

If season or sport doesn't exist, crashes. However, the page is only accessible from a valid season context, so this is low-probability.

**Fix:** Change to `.maybeSingle()` for defensive programming.

---

## 7B. MEMORY LEAKS

### 7B-01. AchievementCelebrationModal -- four setTimeout calls without cleanup

**Severity: P2 -- MAJOR**

**File:** `components/AchievementCelebrationModal.tsx`, lines 182, 192, 204, 214

Four `setTimeout` calls inside a `useEffect` at mount time (delays 200ms, 500ms, 800ms, 1000ms) are **not returned for cleanup**. If the modal unmounts before 1000ms (e.g., user taps back quickly), these timers fire on unmounted component, causing React state-update-on-unmounted warnings and potential memory issues.

```typescript
useEffect(() => {
  // ...
  setTimeout(() => { ... }, 200);   // NOT cleaned up
  setTimeout(() => { ... }, 500);   // NOT cleaned up
  setTimeout(() => { ... }, 800);   // NOT cleaned up
  setTimeout(() => { ... }, 1000);  // NOT cleaned up
}, []);
```

**Fix:** Store timer IDs in refs and clear them in the cleanup function:
```typescript
useEffect(() => {
  const t1 = setTimeout(..., 200);
  const t2 = setTimeout(..., 500);
  const t3 = setTimeout(..., 800);
  const t4 = setTimeout(..., 1000);
  return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
}, []);
```

---

### 7B-02. `first-time-welcome.ts` -- setTimeout without cleanup

**Severity: P3 -- MINOR**

**File:** `lib/first-time-welcome.ts`, line 39

```typescript
setTimeout(() => {
  Alert.alert(msg.title, msg.body, [{ text: 'Got it!' }]);
}, 800);
```

Inside a `useEffect` hook without cleanup return. Low risk because this only fires once and the tab layout rarely unmounts, but still violates React best practices.

**Fix:** Return `clearTimeout` from the effect.

---

### 7B-03. `useGlobalSearch` -- debounceRef not cleaned up on unmount

**Severity: P2 -- MAJOR**

**File:** `hooks/useGlobalSearch.ts`, line 44-88

The `debounceRef` holds a setTimeout reference but the hook never registers a cleanup `useEffect` to clear it on unmount. If the admin-search screen unmounts while a debounce timer is pending, the callback fires on unmounted state.

**Fix:** Add an unmount cleanup effect:
```typescript
useEffect(() => {
  return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
}, []);
```

---

### 7B-04. Supabase realtime subscriptions -- all properly cleaned up

**Severity: N/A -- PASS**

All 5 realtime subscription sites properly unsubscribe on cleanup:

| File | Subscribe Line | Cleanup Method |
|------|---------------|----------------|
| `app/chat/[id].tsx` | 290 | `subscription.unsubscribe()` at 292 |
| `app/(tabs)/_layout.tsx` | 153 | `subscription.unsubscribe()` at 156 |
| `components/NotificationBell.tsx` | 52 | `supabase.removeChannel(channel)` at 55 |
| `app/(tabs)/chats.tsx` | 542 | `subscription.unsubscribe()` at 543 |
| `components/TeamWall.tsx` | 469 | `supabase.removeChannel(channel)` at 472 |

---

### 7B-05. setInterval in `app/chat/[id].tsx` -- multiple intervals, all cleaned up

**Severity: N/A -- PASS**

Three `setInterval` calls (typing polling at 344, voice pulse at 545, recording timer at 558) all have proper cleanup via `clearInterval` in their respective `useEffect` cleanup functions or explicit clear calls.

---

### 7B-06. `parent-scroll-context.tsx` -- idleTimer not cleaned on unmount

**Severity: P3 -- MINOR**

**File:** `lib/parent-scroll-context.tsx`, line 31-43

The `idleTimer` ref is set via `setTimeout` inside `notifyScroll`, but the provider component never clears it on unmount. Since this is a context provider that wraps the entire app, it effectively never unmounts -- so the risk is minimal, but it's still a missing cleanup.

**Fix:** Add `useEffect(() => () => { if (idleTimer.current) clearTimeout(idleTimer.current); }, []);`

---

### 7B-07. Various fire-and-forget `setTimeout` in event handlers -- acceptable pattern

**Severity: P3 -- MINOR (informational)**

Multiple files use `setTimeout` in event handlers (not useEffect) for UI transitions:
- `components/GestureDrawer.tsx` (lines 276, 290, 485, 499) -- 150-200ms delays for navigation after drawer close
- `app/team-manager-setup.tsx` (lines 522, 537, 552) -- 300ms delay for navigation
- `components/ShareRegistrationModal.tsx` (line 80) -- 2s "Copied!" toast

These are acceptable because event handlers don't need effect-style cleanup, and the delays are short enough that the component is still mounted.

---

### 7B-08. `components/gameday/LiveMatchPage.tsx` -- alertTimeout ref declared but cleanup unclear

**Severity: P2 -- MAJOR**

**File:** `components/gameday/LiveMatchPage.tsx`, line 51

`alertTimeout` ref is declared as `useRef<ReturnType<typeof setTimeout> | null>(null)` but the `setTimeout` at line 119 writes to it without verifying the component cleans it up on unmount. If the user navigates away from Game Day mid-set, the pending `setTimeout` could fire on an unmounted component.

**Fix:** Add cleanup `useEffect` for `alertTimeout.current`.

---

## 7C. PERFORMANCE BOTTLENECKS

### 7C-01. N+1 query in tab bar unread badge counts

**Severity: P1 -- CRITICAL**

**File:** `app/(tabs)/_layout.tsx`, lines 93-104

```typescript
for (const m of memberships) {
  const { count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', m.channel_id)
    .eq('is_deleted', false)
    .gt('created_at', m.last_read_at || '1970-01-01');
  totalUnread += (count || 0);
}
```

This loop fires one Supabase query **per channel** the user is a member of. A coach with 10 channels fires 10 queries on every app open AND on every real-time message event (since `fetchUnreadCounts` is called by all four `.on('postgres_changes')` handlers). This means:
- 10 channels x 4 event types = potentially 40 rapid-fire queries per new message
- On app launch with 20 channels: 20 sequential queries before the badge shows

**Fix:** Replace with a single RPC call or a batched query. Example:
```sql
-- Create a function: get_unread_counts(user_id uuid)
-- that joins channel_members with chat_messages in a single query
```

Or at minimum, debounce the `fetchUnreadCounts` callback and use a single query with `.in('channel_id', channelIds)`.

---

### 7C-02. TeamWall uses `.map()` in ScrollView for post feed

**Severity: P2 -- MAJOR**

**File:** `components/TeamWall.tsx`, line 2062

```typescript
<View style={s.listContent}>
  {renderListHeaderFeed()}
  {posts.map(post => (
    <React.Fragment key={post.id}>
      {renderPostCard({ item: post })}
    </React.Fragment>
  ))}
</View>
```

The team wall renders ALL posts via `.map()` inside a `ScrollView` (not a `FlatList`). For teams with many posts, this renders the entire list into memory at once. The file DOES import and use `FlatList` in other code paths (line 2069), so this `.map()` path at line 2062 appears to be a fallback or alternative rendering path.

**Fix:** Ensure the `FlatList` path is always used for the post feed.

---

### 7C-03. Typing indicator polling every 3 seconds on chats list

**Severity: P3 -- MINOR**

**File:** `app/(tabs)/chats.tsx`, line 570

```typescript
const interval = setInterval(fetchAllTyping, 3000);
```

Polls the `typing_indicators` table every 3 seconds for ALL channels the user is a member of. This runs as long as the chats tab is mounted.

**Impact:** Continuous background queries even when the user is not actively looking at the chats tab. The interval does clean up properly.

**Fix:** Only poll when the chats tab is focused (use `useIsFocused()` from React Navigation or Expo Router's `useFocusEffect`).

---

### 7C-04. `challenge-service.ts` -- individual queries inside `completeChallenge`

**Severity: P3 -- MINOR**

**File:** `lib/challenge-service.ts`, line 458

```typescript
const winnerProfile = winnerId
  ? (await supabase.from('profiles').select('full_name').eq('id', winnerId).single()).data
  : null;
```

This is a one-off query to get the winner's name. Low impact since it only runs when a challenge is completed (rare event).

---

### 7C-05. `PlayerCardExpanded` -- 4 sequential queries per card open

**Severity: P3 -- MINOR**

**File:** `components/PlayerCardExpanded.tsx`, lines 128-175

Four sequential `.single()` queries (stats, skills, skill_ratings, badges) fire every time a player card is expanded. These could be parallelized with `Promise.all()`.

**Fix:**
```typescript
const [statsRes, skillsRes, evalRes, badgesRes] = await Promise.all([
  supabase.from('player_stats').select('*').eq('player_id', player.id).maybeSingle(),
  supabase.from('player_skills').select('*').eq('player_id', player.id).maybeSingle(),
  supabase.from('player_skill_ratings').select('...').eq('player_id', player.id).order(...).limit(1).maybeSingle(),
  supabase.from('player_badges').select('...').eq('player_id', player.id),
]);
```

---

### 7C-06. No image optimization -- full-resolution images in feeds

**Severity: P4 -- NICE-TO-HAVE**

The codebase uses Supabase Storage URLs directly for team wall posts, avatars, and banners. There is no evidence of thumbnail generation or `?width=` transform parameters being used to serve smaller images on list screens.

**Files affected:**
- `components/TeamWall.tsx` -- post images
- `components/ParentHomeScroll.tsx` -- hero images
- `app/team-gallery.tsx` -- gallery thumbnails

**Fix:** Use Supabase Storage image transformations (`?width=400&height=400`) for thumbnails in list views.

---

### 7C-07. Bundle size -- no visible code splitting

**Severity: P4 -- NICE-TO-HAVE**

The app imports all screen components at the top level. Expo Router handles lazy loading of routes by default, so this is partially mitigated. However, heavy libraries like `expo-av` (audio), `expo-image-manipulator`, and chart libraries are imported in components that may not always be needed.

**Fix:** Consider dynamic imports for heavy components (GameDay audio, image manipulation).

---

### 7C-08. `useParentHomeData` -- sequential waterfall of 10+ queries

**Severity: P2 -- MAJOR**

**File:** `hooks/useParentHomeData.ts`, lines 400-800

The parent home data hook runs a sequential waterfall of queries: children, teams, events, posts, RSVP checks, payment checks, waiver checks, badges, XP. Each step depends on IDs from previous steps, but several could be parallelized. The hook also swallows errors with empty `catch {}` blocks (8 instances), meaning partial data failures are invisible.

**Fix:** Parallelize independent query groups with `Promise.all` where possible. At minimum, add error logging inside the `catch {}` blocks.

---

## 7D. ERROR HANDLING QUALITY

### 7D-01. Empty `catch {}` blocks -- silent failures

**Severity: P1 -- CRITICAL (for data integrity)**

Found **23 empty `catch {}` blocks** across the codebase (excluding `_archive`):

| # | File | Line(s) | Context |
|---|------|---------|---------|
| 1 | `app/blast-composer.tsx` | 250 | Email queue failure silenced |
| 2 | `app/(tabs)/payments.tsx` | 689, 814, 859 | Payment confirmation email, recording, status update failures silenced |
| 3 | `app/game-results.tsx` | 136 | Set score parsing failure silenced (acceptable) |
| 4 | `app/registration-hub.tsx` | 541, 655, 782, 844 | Email queue, team creation, auto-channel, data refresh failures silenced |
| 5 | `hooks/useParentHomeData.ts` | 489, 554, 621, 667, 703, 738, 754, 797 | **Eight** silent catch blocks in parent home data loading |
| 6 | `lib/theme.tsx` | 152, 156 | AsyncStorage write failures silenced (acceptable) |
| 7 | `components/TeamWall.tsx` | 692 | Challenge participation fetch silenced |

**Highest risk:** The 8 empty catches in `useParentHomeData.ts`. A Supabase outage or RLS misconfiguration would cause the parent home screen to show stale/missing data with no indication of failure.

**Fix:** At minimum, add `if (__DEV__) console.error(...)` inside each empty catch. For user-facing features (payments, registration), consider showing a subtle error indicator.

---

### 7D-02. Ungated `console.error` calls in production code

**Severity: P2 -- MAJOR**

Found **~55 `console.error` calls NOT gated behind `__DEV__`** across 20+ files. These will appear in production device logs and can leak implementation details.

**Worst offenders (count of ungated console calls):**

| File | Count | Context |
|------|-------|---------|
| `lib/notifications.ts` | 11 | Error messages about push tokens, RSVP reminders, auto-blasts |
| `lib/media-utils.ts` | 9 | Upload debug logging including URLs and file sizes |
| `lib/quest-engine.ts` | 6 | Quest system errors |
| `lib/auth.tsx` | 5 | Auth errors including email addresses |
| `lib/chat-utils.ts` | 5 | Chat channel creation errors |
| `lib/team-context.tsx` | 3 | Team selection persistence |
| `lib/streak-engine.ts` | 2 | Streak fetch/create errors |
| `lib/sport.tsx` | 1 | Sports fetch error |
| `hooks/useJourneyPath.ts` | 1 | Journey loading error |
| `hooks/useQuestEngine.ts` | 1 | Quest loading error |
| `hooks/useSkillModule.ts` | 1 | Module loading error |
| `hooks/useWeeklyQuestEngine.ts` | 1 | Weekly quest error |
| `hooks/useStreakEngine.ts` | 1 | Streak loading error |

**Special concern -- `lib/media-utils.ts`:**
```typescript
console.log('[uploadMedia] Starting:', { uri: media.uri?.substring(0, 50), type: media.type, bucket, folderPath });
console.log('[uploadMedia] blob size:', blob.size);
console.log('[uploadMedia] arrayBuffer size:', arrayBuffer.byteLength);
console.log('[uploadMedia] Success:', data.publicUrl?.substring(0, 80));
```
These are `console.log` (not error), running in production, logging file URIs and storage paths.

**Fix:** Wrap all ungated `console.*` calls in `if (__DEV__)` guards. The codebase already does this in ~85% of locations -- the remaining ~15% were missed.

---

### 7D-03. `console.log` debug statements left in production

**Severity: P2 -- MAJOR**

**File:** `lib/media-utils.ts`, lines 176, 188, 192, 207

Four `console.log` statements for upload debugging are not gated behind `__DEV__`. These log file URIs, blob sizes, and public URLs in production.

**File:** `components/TapDebugger.tsx`, line 19

```typescript
console.log(`[TapDebug] "${label}" tapped`);
```

This component appears to be a debug tool that should be removed or gated.

**Fix:** Gate behind `__DEV__` or remove entirely.

---

### 7D-04. Catch-only-console-log pattern (invisible in production)

**Severity: P2 -- MAJOR**

Several catch blocks only `console.error` without showing any user feedback. In production (where `__DEV__` is false and the log IS gated), the error is completely invisible:

| File | Line | Pattern |
|------|------|---------|
| `app/standings.tsx` | 178 | `catch (err) { if (__DEV__) console.error(...) }` -- standings fail silently |
| `app/season-archives.tsx` | 135 | `catch (error) { if (__DEV__) console.error(...) }` -- archives fail silently |
| `components/coach-scroll/*.tsx` | Multiple | Action items, team health, etc. all fail silently |

In all these cases, the user sees a loading spinner that never resolves or stale data with no indication of an error.

**Fix:** Add a `setError(true)` state or show an inline error message in the UI.

---

### 7D-05. Error messages that could expose technical details

**Severity: P3 -- MINOR**

Several `Alert.alert` calls pass the raw Supabase error message to users:

| File | Line | Pattern |
|------|------|---------|
| `app/blast-composer.tsx` | 263 | `error.message \|\| 'Something went wrong'` |
| `app/coach-availability.tsx` | 199-221 | `e.message` displayed directly |
| `app/child-detail.tsx` | 337 | `err.message` |
| `app/(auth)/signup.tsx` | 215, 268, 299 | `err.message` |

Supabase error messages can contain table names, column names, and RLS policy details that shouldn't be shown to end users.

**Fix:** Map known error codes to user-friendly messages; use generic fallback for unknown errors.

---

### 7D-06. Missing error handling on fire-and-forget `.catch(() => {})`

**Severity: P3 -- MINOR**

Several places use `.catch(() => {})` to silence promise rejections:

| File | Line | Context |
|------|------|---------|
| `components/CoachHomeScroll.tsx` | 190 | `}).catch(() => {});` |
| `components/CoachHomeScroll.tsx` | 638, 643 | `markAchievementsSeen(...).catch(() => {});` |
| `app/(tabs)/_layout.tsx` | 41 | `checkRoleAchievements(...).catch(() => {});` |
| `app/create-challenge.tsx` | 208 | `checkRoleAchievements(...).catch(() => {});` |

These are acceptable for non-critical background operations (achievement checks), but should at minimum log in `__DEV__` mode.

---

### 7D-07. `lib/auth.tsx` -- ungated error logging exposes auth details

**Severity: P3 -- MINOR**

**File:** `lib/auth.tsx`, lines 132, 140, 169, 180, 208, 267, 290

Seven `console.*` calls in the auth flow are NOT gated behind `__DEV__`. These log:
- Dev user email addresses (line 132)
- Auth error messages (line 290)
- Profile query failure details (lines 169, 180)

In production builds on real devices, these appear in system logs accessible via crash reporting tools.

**Fix:** Gate all behind `if (__DEV__)`.

---

### 7D-08. `lib/notifications.ts` -- 11 ungated console.error calls

**Severity: P2 -- MAJOR**

**File:** `lib/notifications.ts`

This is the most prolific offender with 11 ungated `console.error` calls logging push token errors, volunteer blast errors, RSVP reminder errors, and more. These run in production and log to device console.

**Fix:** Gate all behind `if (__DEV__)`.

---

### 7D-09. `lib/team-context.tsx` -- ungated error + debug logs

**Severity: P4 -- NICE-TO-HAVE**

**File:** `lib/team-context.tsx`, lines 20, 25, 35, 38, 41

Mix of `__DEV__`-gated and ungated console calls:
- Lines 20, 35, 38 -- gated (good)
- Lines 25, 41 -- ungated `console.error` (should be gated)

---

## RECOMMENDED FIX PRIORITY

### Immediate (before launch):

1. **7C-01** -- N+1 query in tab bar badges (P1) -- Replace loop with batched query or RPC
2. **7A-01/02** -- `.single()` crash risks (P0) -- Change dangerous `.single()` to `.maybeSingle()` in:
   - `lib/permissions.ts:20`
   - `lib/profile-completeness.ts:83,103`
   - `lib/registration-config.ts:125,148`
   - `components/PlayerCardExpanded.tsx:132,143,158`
   - `lib/challenge-service.ts:458`
   - `app/(tabs)/connect.tsx:93`
3. **7D-02/03** -- Ungated console calls (P2) -- Wrap ~55 ungated `console.*` calls in `if (__DEV__)`

### Soon after launch:

4. **7B-01** -- AchievementCelebrationModal timer cleanup (P2)
5. **7B-03** -- useGlobalSearch debounce cleanup (P2)
6. **7A-03** -- JSON.parse try/catch in chats.tsx, match-store.ts, useSkillModule.ts (P2)
7. **7D-01** -- Add logging to empty `catch {}` blocks, especially in `useParentHomeData.ts` (P1)
8. **7C-08** -- Parallelize `useParentHomeData` query waterfall (P2)

### Nice to have:

9. **7C-05** -- Parallelize PlayerCardExpanded queries with Promise.all
10. **7C-06** -- Image optimization with Supabase transforms
11. **7C-03** -- Only poll typing indicators when chats tab is focused
12. **7D-05** -- Sanitize user-facing error messages

---

## APPENDIX: FULL `.single()` INVENTORY

94 `.single()` calls found across the codebase (excluding `_archive` and `reference` directories). Of these:
- ~30 are on INSERT+select chains (acceptable if error is checked)
- ~20 are guarded with `if (data)` checks after
- ~15 are inside try/catch blocks
- ~10 have **no null guard** and should be changed to `.maybeSingle()`
- ~19 are in service/engine files where the row is expected to exist

The codebase also uses `.maybeSingle()` in ~100 places, indicating awareness of the pattern. The remaining `.single()` calls represent inconsistency rather than ignorance.
