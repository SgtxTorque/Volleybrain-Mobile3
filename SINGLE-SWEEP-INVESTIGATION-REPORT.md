# SINGLE-SWEEP-INVESTIGATION-REPORT.md
# `.single()` MEDIUM Priority Sweep — Surgical Plan

**Date:** 2026-03-17
**Branch:** navigation-cleanup-complete
**Scope:** All remaining `.single()` callsites in lib/, app/, components/, hooks/
**Excludes:** Callsites already fixed in commits 4e0c61d and e7825d7

---

## ALREADY FIXED (Skip List — confirmed absent from grep results)

These callsites were changed to `.maybeSingle()` in the launch blocker execution:

| File | Original Line | Status |
|------|---------------|--------|
| lib/permissions.ts | ~20 | FIXED |
| lib/profile-completeness.ts | ~83 | FIXED |
| lib/profile-completeness.ts | ~103 | FIXED |
| lib/chat-utils.ts | ~45 | FIXED |
| lib/chat-utils.ts | ~389 | FIXED |
| lib/challenge-service.ts | ~458 | FIXED |
| app/chat/[id].tsx | ~520 | FIXED |
| components/PlayerCardExpanded.tsx | ~132 | FIXED |
| components/PlayerCardExpanded.tsx | ~143 | FIXED |
| components/PlayerCardExpanded.tsx | ~158 | FIXED |

---

## SAFE — INSERT+.select().single() with error handling

These are INSERT/UPSERT patterns where the row is created by the statement itself. All have adequate error handling.

| # | File | Line | Table | Pattern |
|---|------|------|-------|---------|
| 1 | lib/auth.tsx | 196 | profiles | INSERT + if (insertError) + race condition fallback |
| 2 | lib/challenge-service.ts | 82 | team_posts | INSERT + if (postError) return error |
| 3 | lib/challenge-service.ts | 111 | coach_challenges | INSERT + if (challengeError) return error |
| 4 | lib/chat-utils.ts | 75 | chat_channels | INSERT + if (teamError) return null |
| 5 | lib/chat-utils.ts | 96 | chat_channels | INSERT + if (playerError) return null |
| 6 | lib/chat-utils.ts | 403 | chat_channels | INSERT + if (error) return null |
| 7 | lib/payment-plans.ts | 120 | payment_plans | INSERT + if (error) throw |
| 8 | lib/shoutout-service.ts | 75 | team_posts | INSERT + if (postError) return error |
| 9 | lib/shoutout-service.ts | 99 | shoutouts | INSERT + if (shoutoutError) log |
| 10 | lib/streak-engine.ts | 239 | streak_data | INSERT + if (createError) return null |
| 11 | lib/quest-engine.ts | 481 | daily_quests | UPDATE + if (updateError) return error obj |
| 12 | lib/quest-engine.ts | 886 | weekly_quests | UPDATE + if (updateError) return error obj |
| 13 | app/(auth)/signup.tsx | 188 | organizations | INSERT + if (orgError) throw (in try/catch) |
| 14 | app/blast-history.tsx | 248 | messages | INSERT + if (msgError) throw (in try/catch) |
| 15 | app/(tabs)/admin-teams.tsx | 297 | teams | INSERT + if (error) Alert.alert |
| 16 | app/(tabs)/chats.tsx | 432 | chat_channels | INSERT + if (error \|\| !newChannel) return |
| 17 | app/(tabs)/chats.tsx | 481 | chat_channels | INSERT + if (error \|\| !newChannel) return |
| 18 | app/blast-composer.tsx | 190 | messages | INSERT + if (messageError) throw (in try/catch) |
| 19 | app/(tabs)/teams.tsx | 76 | teams | INSERT + if (error) Alert.alert |
| 20 | app/attendance.tsx | 252 | event_rsvps | INSERT + if (data) check (in try/catch) |
| 21 | app/registration-hub.tsx | 504 | registrations | INSERT + if (insertError) throw |
| 22 | app/registration-hub.tsx | 631 | registrations | INSERT + if (newReg) check |
| 23 | app/register/[seasonId].tsx | 532 | families | INSERT + newFamily?.id fallback |
| 24 | app/register/[seasonId].tsx | 599 | players | INSERT + if (playerError) throw with message |
| 25 | app/register/[seasonId].tsx | 635 | registrations | INSERT + if (regError) throw |
| 26 | app/team-management.tsx | 262 | teams | INSERT + if (error) Alert.alert |
| 27 | app/season-setup-wizard.tsx | 187 | seasons | INSERT + if (seasonErr) Alert.alert |
| 28 | app/team-manager-setup.tsx | 102 | organizations | INSERT + if (orgError) throw |
| 29 | app/team-manager-setup.tsx | 132 | seasons | INSERT + if (seasonError) throw |
| 30 | app/team-manager-setup.tsx | 146 | teams | INSERT + if (teamError) throw |
| 31 | app/coach-availability.tsx | 190 | coach_availability | UPSERT + if (error) throw (in try/catch) |
| 32 | app/coach-availability.tsx | 215 | coach_availability | INSERT + if (data) check (in try/catch) |
| 33 | app/chat/[id].tsx | 413 | chat_messages | INSERT + if (error) Alert.alert |
| 34 | app/chat/[id].tsx | 619 | chat_messages | INSERT + if (newMessage) check (in try/catch) |
| 35 | app/chat/[id].tsx | 730 | chat_channels | INSERT + if (!newDM) return |
| 36 | components/TeamWall.tsx | 912 | team_post_comments | INSERT + if (error) throw (in try/catch+Alert) |
| 37 | components/TeamWall.tsx | 1091 | team_posts | INSERT + if (error) throw (in try/catch+Alert) |

**Action:** None required for any of the above.

---

## SAFE — SELECT inside try/catch with user feedback

These SELECT `.single()` callsites are inside try/catch blocks that either show Alerts, set error state, or return explicit error objects to callers.

| # | File | Line | Table | Error Handling |
|---|------|------|-------|----------------|
| 1 | lib/challenge-service.ts | 180 | coach_challenges | try/catch + `if (!challenge) return;` |
| 2 | lib/challenge-service.ts | 230 | coach_challenges | try/catch + `return { success: false, error: 'Challenge not found' }` |
| 3 | lib/challenge-service.ts | 362 | coach_challenges | try/catch + `if (!challenge) return null` |
| 4 | lib/challenge-service.ts | 432 | coach_challenges | try/catch + `return { success: false, completedCount: 0 }` |
| 5 | lib/achievement-engine.ts | 552 | profiles | try/catch + catch returns `{ totalXp: 0, level: 1, ... }` |
| 6 | lib/achievement-engine.ts | 579 | profiles | try/catch + catch returns `{ totalXp: 0, level: 1, ... }` |
| 7 | lib/payment-plans.ts | 141 | payment_plans | `if (planError) throw planError; if (!plan) throw new Error(...)` |
| 8 | lib/registration-config.ts | 125 | seasons | `if (seasonError \|\| !season) throw new Error('Season not found')` |
| 9 | app/(tabs)/connect.tsx | 163 | teams | try/catch + `if (fallback)` null guard |
| 10 | app/player-evaluations.tsx | 114 | team_staff | try/catch/finally + `staff?.team_id \|\| ''` |
| 11 | app/player-evaluation.tsx | 143 | players | try/catch + `if (player)` null guard |
| 12 | app/season-settings.tsx | 136 | seasons | try/catch + `if (seasonData)` null guard |
| 13 | app/season-settings.tsx | 140 | sports | try/catch + inside `if (seasonData.sport_id)` guard |
| 14 | app/standings.tsx | 104 | seasons | try/catch + `if (seasonData?.sport)` guard |
| 15 | app/child-detail.tsx | 136 | players | try/catch + `setError('Could not load player data.')` |
| 16 | components/TeamWall.tsx | 546 | teams | try/catch + `if (teamData)` null guard |
| 17 | components/TeamWall.tsx | 556 | seasons | try/catch + `?.sport \|\| null` null guard |

**Action:** None required for any of the above.

---

## NEEDS FIX — SELECT .single() that should be .maybeSingle()

These are the callsites where `.single()` is used on a SELECT query that could legitimately return zero rows, and the error handling is insufficient (no try/catch with user feedback, or no error check at all).

---

### lib/challenge-service.ts — line 242

**Current code:**
```typescript
const { data: existing } = await supabase
  .from('challenge_participants')
  .select('completed')
  .eq('challenge_id', challengeId)
  .eq('player_id', playerId)
  .single();

const wasAlreadyCompleted = existing?.completed;
```

**Table:** `challenge_participants`
**Filter:** `challenge_id = challengeId AND player_id = playerId`
**Zero rows scenario:** Player has not joined the challenge yet
**Error handling:** Inside function-level try/catch but no explicit null/error check
**Downstream impact:** `existing` is null, optional chaining prevents crash, but `.single()` error is silently swallowed

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — optional chaining already handles null data

---

### lib/challenge-service.ts — line 515

**Current code:**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('total_xp')
  .eq('id', pid)
  .single();

const currentXP = profile?.total_xp || 0;
```

**Table:** `profiles`
**Filter:** `id = pid` (pid from challenge_participants loop)
**Zero rows scenario:** Profile deleted or orphaned participant record
**Error handling:** Inside function-level try/catch, optional chaining only
**Downstream impact:** In a loop — error in one iteration could skip XP update for remaining participants

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — optional chaining already handles null data

---

### lib/challenge-service.ts — line 656

**Current code:**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name')
  .eq('id', participant.player_id)
  .single();

await updateChallengeProgress(
  participant.challenge_id,
  participant.player_id,
  newValue,
  profile?.full_name || undefined,
);
```

**Table:** `profiles`
**Filter:** `id = participant.player_id`
**Zero rows scenario:** Player's profile deleted or orphaned participant record
**Error handling:** Inside function-level try/catch, optional chaining only
**Downstream impact:** In a loop — error in one iteration could crash the entire batch stat update

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
          .maybeSingle();
```

**Risk:** LOW — optional chaining already handles null data

---

### lib/achievement-engine.ts — line 415

**Current code:**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('total_xp')
  .eq('id', profileId)
  .single();

const currentXP = profile?.total_xp || 0;
const newXP = currentXP + xp;
```

**Table:** `profiles`
**Filter:** `id = profileId`
**Zero rows scenario:** Profile deleted or invalid profileId passed
**Error handling:** None — no try/catch, only `if (!profileId) return;` guard before this
**Downstream impact:** Unhandled `.single()` error, XP update fails silently

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
    .maybeSingle();
```

**Risk:** LOW — optional chaining handles null; subsequent `.update()` on non-existent profile is a no-op

---

### lib/achievement-engine.ts — line 1169

**Current code:**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('total_xp')
  .eq('id', userId)
  .single();

const currentXP = profile?.total_xp || 0;
const newXP = currentXP + xp;
```

**Table:** `profiles`
**Filter:** `id = userId`
**Zero rows scenario:** User profile deleted or invalid userId
**Error handling:** None — no try/catch
**Downstream impact:** Unhandled `.single()` error, XP update fails silently

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
    .maybeSingle();
```

**Risk:** LOW — same pattern as line 415

---

### lib/evaluations.ts — line 297

**Current code:**
```typescript
const { data } = await supabase
  .from('player_skill_ratings')
  .select('*')
  .eq('player_id', playerId)
  .eq('team_id', teamId)
  .order('rated_at', { ascending: false })
  .limit(1)
  .single();

if (!data) return null;
```

**Table:** `player_skill_ratings`
**Filter:** `player_id = playerId AND team_id = teamId` (ORDER BY rated_at DESC LIMIT 1)
**Zero rows scenario:** Player has never been evaluated — common for new players
**Error handling:** `if (!data) return null` guard, but no try/catch
**Downstream impact:** `.single()` error when zero rows; null guard catches null data but error is unhandled

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
    .maybeSingle();
```

**Risk:** LOW — null guard already handles the zero-rows case functionally

---

### lib/notifications.ts — line 390

**Current code:**
```typescript
const { data: gameData } = await supabase
  .from('schedule_events')
  .select('team_id, event_date')
  .eq('id', game.eventId)
  .single();

if (!gameData) continue;
```

**Table:** `schedule_events`
**Filter:** `id = game.eventId`
**Zero rows scenario:** Event deleted between volunteer check and blast send
**Error handling:** Inside try/catch (line 381), `if (!gameData) continue;` guard
**Downstream impact:** `.single()` sets error unnecessarily; functionally handled by null guard + continue

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
        .maybeSingle();
```

**Risk:** LOW — inside try/catch with null guard; fix is semantic improvement

---

### lib/notifications.ts — line 485

**Current code:**
```typescript
const { data: event } = await supabase
  .from('schedule_events')
  .select('title, event_date')
  .eq('id', eventId)
  .single();

if (event) {
```

**Table:** `schedule_events`
**Filter:** `id = eventId`
**Zero rows scenario:** Event deleted between volunteer promotion and notification send
**Error handling:** Inside try/catch (line 437), `if (event)` guard
**Downstream impact:** `.single()` sets error unnecessarily; functionally handled by null guard

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — inside try/catch with null guard; fix is semantic improvement

---

### lib/registration-config.ts — line 148

**Current code:**
```typescript
const { data: template } = await supabase
  .from('registration_templates')
  .select('player_fields, parent_fields, emergency_fields, medical_fields, waivers, custom_questions')
  .eq('id', season.registration_template_id)
  .single();

if (template) {
  config = mergeWithDefaults({...});
} else {
  config = DEFAULT_REGISTRATION_CONFIG;
}
```

**Table:** `registration_templates`
**Filter:** `id = season.registration_template_id`
**Zero rows scenario:** Template deleted after being assigned to season; stale FK
**Error handling:** `if (template)` / `else` fallback to defaults — no try/catch
**Downstream impact:** `.single()` error when template missing; else branch handles null data, but error is unhandled

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — else branch already provides fallback

---

### lib/shoutout-service.ts — line 177

**Current code:**
```typescript
const { data: prof } = await supabase
  .from('profiles')
  .select('total_xp')
  .eq('id', profId)
  .single();

const currentXP = prof?.total_xp || 0;
```

**Table:** `profiles`
**Filter:** `id = profId` (resolved via resolveProfileId)
**Zero rows scenario:** Profile deleted after ID resolution
**Error handling:** None — no try/catch; `profId` validated non-null on line 171 but profile could be deleted
**Downstream impact:** `.single()` error, XP update fails; in a loop, could affect subsequent users

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — optional chaining handles null data

---

### app/(tabs)/connect.tsx — line 93

**Current code:**
```typescript
const profile = (await supabase.from('profiles').select('email').eq('id', user.id).single()).data;
```

**Table:** `profiles`
**Filter:** `id = user.id`
**Zero rows scenario:** Logged-in user with no profile row (unlikely but possible during account setup race condition)
**Error handling:** Inside function-level try/catch (line 55); chains `.data` directly
**Downstream impact:** `profile` is null, used as `profile?.email` (line 102) — null-safe

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
const profile = (await supabase.from('profiles').select('email').eq('id', user.id).maybeSingle()).data;
```

**Risk:** LOW — optional chaining on usage handles null

---

### app/(tabs)/settings.tsx — line 57

**Current code:**
```typescript
const { data } = await supabase
  .from('organizations')
  .select('*')
  .eq('id', context.organizationId)
  .single();
setOrganization(data);
```

**Table:** `organizations`
**Filter:** `id = context.organizationId`
**Zero rows scenario:** Organization deleted or ID mismatch in context
**Error handling:** None — no try/catch, no error check, sets state directly
**Downstream impact:** `setOrganization(null)` — UI shows empty org; `.single()` error unhandled

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — setting null is acceptable fallback

---

### app/game-results.tsx — line 206

**Current code:**
```typescript
const { data: gameData, error: gameError } = await supabase
  .from('schedule_events')
  .select('*, teams!schedule_events_team_id_fkey(name, color, season_id)')
  .eq('id', eventId)
  .single();

if (gameError) {
  if (__DEV__) console.error('Error fetching game:', gameError);
  setLoading(false);
  return;
}
```

**Table:** `schedule_events`
**Filter:** `id = eventId`
**Zero rows scenario:** Event deleted, navigated with stale eventId
**Error handling:** Inside try/catch (line 200); error IS checked, returns early — but no user feedback (no Alert/error state)
**Downstream impact:** User sees blank loading state with no explanation

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — error already checked and handled

---

### app/game-results.tsx — line 224

**Current code:**
```typescript
const { data: seasonData } = await supabase
  .from('seasons')
  .select('sport')
  .eq('id', seasonId)
  .single();
setSportName((seasonData as any)?.sport || null);
```

**Table:** `seasons`
**Filter:** `id = seasonId`
**Zero rows scenario:** Season deleted after game creation
**Error handling:** Inside try block (line 200), no error check on this specific query
**Downstream impact:** `.single()` error caught by outer try/catch; sport defaults to null

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
          .maybeSingle();
```

**Risk:** LOW — optional chaining handles null

---

### app/my-stats.tsx — line 226

**Current code:**
```typescript
const { data: seasonData } = await supabase
  .from('seasons')
  .select('sport')
  .eq('id', effectiveSeasonId)
  .single();
const sport = (seasonData as any)?.sport || 'volleyball';
```

**Table:** `seasons`
**Filter:** `id = effectiveSeasonId`
**Zero rows scenario:** Season deleted or invalid ID
**Error handling:** Inside try/catch, no error check on this query
**Downstream impact:** `.single()` error caught by outer try/catch; sport defaults to 'volleyball'

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — default fallback handles null

---

### app/profile.tsx — line 68

**Current code:**
```typescript
const { data } = await supabase
  .from('profiles')
  .select('avatar_url, emergency_contact_name, emergency_contact_phone, emergency_contact_relation')
  .eq('id', user.id)
  .single();

if (data) {
  setAvatarUrl(data.avatar_url);
  ...
}
```

**Table:** `profiles`
**Filter:** `id = user.id`
**Zero rows scenario:** Logged-in user without a profile row (edge case during onboarding)
**Error handling:** None — no try/catch, no error check; `if (data)` guard on usage
**Downstream impact:** `.single()` error unhandled; UI shows no avatar or emergency contacts

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — null guard handles the no-data case

---

### app/org-settings.tsx — line 55

**Current code:**
```typescript
const { data } = await supabase
  .from('organizations')
  .select('name, contact_email, contact_phone, description')
  .eq('id', profile.current_organization_id)
  .single();

if (data) {
  setOrgName(data.name || '');
  ...
}
setLoading(false);
```

**Table:** `organizations`
**Filter:** `id = profile.current_organization_id`
**Zero rows scenario:** Organization deleted or profile has stale org ID
**Error handling:** None — no try/catch, no error check; `if (data)` guard
**Downstream impact:** `.single()` error unhandled; form shows empty fields

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — null guard handles no-data case

---

### app/player-goals.tsx — line 122

**Current code:**
```typescript
const { data: tp } = await supabase
  .from('team_players')
  .select('teams(name)')
  .eq('player_id', playerId)
  .limit(1)
  .single();

setPlayer({
  ...playerData,
  team_name: (tp?.teams as any)?.name || null,
});
```

**Table:** `team_players`
**Filter:** `player_id = playerId` (LIMIT 1)
**Zero rows scenario:** Player not assigned to any team
**Error handling:** Inside function-level try/catch; optional chaining on usage
**Downstream impact:** `.single()` error caught by try/catch; team_name defaults to null

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — optional chaining handles null

---

### app/season-progress.tsx — line 107

**Current code:**
```typescript
const { data: tp } = await supabase
  .from('team_players')
  .select('team_id')
  .eq('player_id', targetPlayerId)
  .limit(1)
  .single();
teamId = tp?.team_id || null;
```

**Table:** `team_players`
**Filter:** `player_id = targetPlayerId` (LIMIT 1)
**Zero rows scenario:** Player not assigned to any team
**Error handling:** Inside try/catch (line 70); optional chaining on usage
**Downstream impact:** `.single()` error caught by try/catch; teamId defaults to null

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
          .maybeSingle();
```

**Risk:** LOW — optional chaining handles null

---

### app/player-evaluation.tsx — line 164

**Current code:**
```typescript
const { data } = await supabase
  .from('player_skill_ratings')
  .select('*')
  .eq('player_id', pid)
  .eq('team_id', tid)
  .order('rated_at', { ascending: false })
  .limit(1)
  .single();

if (data) {
  const prev: Partial<Ratings> = {};
  ...
}
```

**Table:** `player_skill_ratings`
**Filter:** `player_id = pid AND team_id = tid` (ORDER BY rated_at DESC LIMIT 1)
**Zero rows scenario:** Player has never been evaluated — very common
**Error handling:** None — `loadPreviousRatings` is a standalone function with no try/catch; `if (data)` guard
**Downstream impact:** `.single()` error unhandled; previous ratings stay empty (acceptable)

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — null guard handles no-data case

---

### app/game-prep-wizard.tsx — line 193

**Current code:**
```typescript
const { data: eventData } = await supabase
  .from('schedule_events')
  .select('id, title, opponent_name, event_date, start_time, team_id, location')
  .eq('id', eventId)
  .single();

if (!eventData) {
  setLoading(false);
  return;
}
```

**Table:** `schedule_events`
**Filter:** `id = eventId`
**Zero rows scenario:** Event deleted, navigated with stale ID
**Error handling:** None — no try/catch; `if (!eventData)` early return
**Downstream impact:** `.single()` error unhandled; returns early, user sees loading stop

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — early return handles no-data case

---

### app/attendance.tsx — line 131

**Current code:**
```typescript
const { data } = await supabase
  .from('schedule_events')
  .select('*, teams!schedule_events_team_id_fkey(id, name, color)')
  .eq('id', eventId)
  .single();

if (data) {
  selectEvent(data as any);
}
```

**Table:** `schedule_events`
**Filter:** `id = eventId`
**Zero rows scenario:** Event deleted, navigated with stale ID
**Error handling:** None — no try/catch; `if (data)` guard
**Downstream impact:** `.single()` error unhandled; event not selected (UI stays on list)

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — null guard handles no-data case

---

### app/chat/[id].tsx — line 128

**Current code:**
```typescript
const { data } = await supabase.from('chat_channels').select('id, name, channel_type, avatar_url, season_id').eq('id', id).single();
setChannel(data);
```

**Table:** `chat_channels`
**Filter:** `id = id` (route param)
**Zero rows scenario:** Channel deleted, navigated with stale deep link
**Error handling:** None — no try/catch, no error check, sets state directly
**Downstream impact:** `setChannel(null)` — chat UI renders with null channel data

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
const { data } = await supabase.from('chat_channels').select('id, name, channel_type, avatar_url, season_id').eq('id', id).maybeSingle();
```

**Risk:** LOW — setting null is handled by downstream UI guards

---

### app/chat/[id].tsx — line 218

**Current code:**
```typescript
const { data } = await supabase
  .from('chat_messages')
  .select('*, sender:profiles!sender_id (id, full_name, avatar_url)')
  .eq('id', messageId)
  .single();
if (!data || data.is_deleted) return;
```

**Table:** `chat_messages`
**Filter:** `id = messageId` (from realtime event)
**Zero rows scenario:** Message deleted between realtime event and fetch
**Error handling:** None — no try/catch; `if (!data || data.is_deleted) return;` guard
**Downstream impact:** `.single()` error unhandled; null guard catches the null data case

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — null guard handles no-data case

---

### components/TeamWall.tsx — line 456

**Current code:**
```typescript
const { data: authorProfile } = await supabase
  .from('profiles')
  .select('id, full_name, avatar_url')
  .eq('id', newPost.author_id)
  .single();
const postWithProfile: Post = {
  ...newPost,
  profiles: authorProfile || null,
  ...
};
```

**Table:** `profiles`
**Filter:** `id = newPost.author_id`
**Zero rows scenario:** Author profile deleted after posting
**Error handling:** None — inside Postgres realtime callback, no try/catch; `authorProfile || null` fallback
**Downstream impact:** `.single()` error unhandled; post shown without author profile (anonymous)

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
                .maybeSingle();
```

**Risk:** LOW — `|| null` fallback handles no-data case

---

### components/player-scroll/ChatPeek.tsx — line 60

**Current code:**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name')
  .eq('id', msg.sender_id)
  .single();
setSenderName(profile?.full_name?.split(' ')[0] || null);
```

**Table:** `profiles`
**Filter:** `id = msg.sender_id`
**Zero rows scenario:** Sender profile deleted after message was sent
**Error handling:** None — inside async IIFE, no try/catch; optional chaining on usage
**Downstream impact:** `.single()` error unhandled; sender name defaults to null

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
          .maybeSingle();
```

**Risk:** LOW — optional chaining handles null

---

### components/team-hub/TeamHubScreen.tsx — line 103

**Current code:**
```typescript
const { data: teamData } = await supabase
  .from('teams')
  .select('id, name, color, banner_url, logo_url, motto, season_id')
  .eq('id', teamId)
  .single();

if (teamData) setTeam(teamData as TeamData);
```

**Table:** `teams`
**Filter:** `id = teamId`
**Zero rows scenario:** Team deleted, navigated with stale team reference
**Error handling:** None — no try/catch; `if (teamData)` guard
**Downstream impact:** `.single()` error unhandled; team data stays null, UI shows empty hub

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
```typescript
      .maybeSingle();
```

**Risk:** LOW — null guard handles no-data case

---

## SUMMARY TABLE

| # | File | Line | Table | Filter | Classification | Action |
|---|------|------|-------|--------|----------------|--------|
| 1 | lib/challenge-service.ts | 242 | challenge_participants | challenge_id + player_id | NEEDS FIX | .maybeSingle() |
| 2 | lib/challenge-service.ts | 515 | profiles | id (in loop) | NEEDS FIX | .maybeSingle() |
| 3 | lib/challenge-service.ts | 656 | profiles | id (in loop) | NEEDS FIX | .maybeSingle() |
| 4 | lib/achievement-engine.ts | 415 | profiles | id | NEEDS FIX | .maybeSingle() |
| 5 | lib/achievement-engine.ts | 1169 | profiles | id | NEEDS FIX | .maybeSingle() |
| 6 | lib/evaluations.ts | 297 | player_skill_ratings | player_id + team_id | NEEDS FIX | .maybeSingle() |
| 7 | lib/notifications.ts | 390 | schedule_events | id | NEEDS FIX | .maybeSingle() |
| 8 | lib/notifications.ts | 485 | schedule_events | id | NEEDS FIX | .maybeSingle() |
| 9 | lib/registration-config.ts | 148 | registration_templates | id | NEEDS FIX | .maybeSingle() |
| 10 | lib/shoutout-service.ts | 177 | profiles | id (in loop) | NEEDS FIX | .maybeSingle() |
| 11 | app/(tabs)/connect.tsx | 93 | profiles | id | NEEDS FIX | .maybeSingle() |
| 12 | app/(tabs)/settings.tsx | 57 | organizations | id | NEEDS FIX | .maybeSingle() |
| 13 | app/game-results.tsx | 206 | schedule_events | id | NEEDS FIX | .maybeSingle() |
| 14 | app/game-results.tsx | 224 | seasons | id | NEEDS FIX | .maybeSingle() |
| 15 | app/my-stats.tsx | 226 | seasons | id | NEEDS FIX | .maybeSingle() |
| 16 | app/profile.tsx | 68 | profiles | id | NEEDS FIX | .maybeSingle() |
| 17 | app/org-settings.tsx | 55 | organizations | id | NEEDS FIX | .maybeSingle() |
| 18 | app/player-goals.tsx | 122 | team_players | player_id | NEEDS FIX | .maybeSingle() |
| 19 | app/season-progress.tsx | 107 | team_players | player_id | NEEDS FIX | .maybeSingle() |
| 20 | app/player-evaluation.tsx | 164 | player_skill_ratings | player_id + team_id | NEEDS FIX | .maybeSingle() |
| 21 | app/game-prep-wizard.tsx | 193 | schedule_events | id | NEEDS FIX | .maybeSingle() |
| 22 | app/attendance.tsx | 131 | schedule_events | id | NEEDS FIX | .maybeSingle() |
| 23 | app/chat/[id].tsx | 128 | chat_channels | id | NEEDS FIX | .maybeSingle() |
| 24 | app/chat/[id].tsx | 218 | chat_messages | id | NEEDS FIX | .maybeSingle() |
| 25 | components/TeamWall.tsx | 456 | profiles | id | NEEDS FIX | .maybeSingle() |
| 26 | components/player-scroll/ChatPeek.tsx | 60 | profiles | id | NEEDS FIX | .maybeSingle() |
| 27 | components/team-hub/TeamHubScreen.tsx | 103 | teams | id | NEEDS FIX | .maybeSingle() |

**Totals:** 10 ALREADY FIXED | 37 SAFE (INSERT/UPSERT) | 17 SAFE (TRY-CATCH) | **27 NEEDS FIX**

---

## EXECUTION PLAN — Grouped by File

### lib/challenge-service.ts (3 changes)
- Line 242: `.single()` → `.maybeSingle()`
- Line 515: `.single()` → `.maybeSingle()`
- Line 656: `.single()` → `.maybeSingle()`

### lib/achievement-engine.ts (2 changes)
- Line 415: `.single()` → `.maybeSingle()`
- Line 1169: `.single()` → `.maybeSingle()`

### lib/evaluations.ts (1 change)
- Line 297: `.single()` → `.maybeSingle()`

### lib/notifications.ts (2 changes)
- Line 390: `.single()` → `.maybeSingle()`
- Line 485: `.single()` → `.maybeSingle()`

### lib/registration-config.ts (1 change)
- Line 148: `.single()` → `.maybeSingle()`

### lib/shoutout-service.ts (1 change)
- Line 177: `.single()` → `.maybeSingle()`

### app/(tabs)/connect.tsx (1 change)
- Line 93: `.single()` → `.maybeSingle()`

### app/(tabs)/settings.tsx (1 change)
- Line 57: `.single()` → `.maybeSingle()`

### app/game-results.tsx (2 changes)
- Line 206: `.single()` → `.maybeSingle()`
- Line 224: `.single()` → `.maybeSingle()`

### app/my-stats.tsx (1 change)
- Line 226: `.single()` → `.maybeSingle()`

### app/profile.tsx (1 change)
- Line 68: `.single()` → `.maybeSingle()`

### app/org-settings.tsx (1 change)
- Line 55: `.single()` → `.maybeSingle()`

### app/player-goals.tsx (1 change)
- Line 122: `.single()` → `.maybeSingle()`

### app/season-progress.tsx (1 change)
- Line 107: `.single()` → `.maybeSingle()`

### app/player-evaluation.tsx (1 change)
- Line 164: `.single()` → `.maybeSingle()`

### app/game-prep-wizard.tsx (1 change)
- Line 193: `.single()` → `.maybeSingle()`

### app/attendance.tsx (1 change)
- Line 131: `.single()` → `.maybeSingle()`

### app/chat/[id].tsx (2 changes)
- Line 128: `.single()` → `.maybeSingle()`
- Line 218: `.single()` → `.maybeSingle()`

### components/TeamWall.tsx (1 change)
- Line 456: `.single()` → `.maybeSingle()`

### components/player-scroll/ChatPeek.tsx (1 change)
- Line 60: `.single()` → `.maybeSingle()`

### components/team-hub/TeamHubScreen.tsx (1 change)
- Line 103: `.single()` → `.maybeSingle()`

---

**Total: 27 changes across 21 files. All changes are identical: `.single()` → `.maybeSingle()`. No logic changes required.**
