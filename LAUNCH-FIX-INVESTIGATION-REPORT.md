# LAUNCH-FIX-INVESTIGATION-REPORT.md
# Lynx — Surgical Launch Fix Plan (Review Before Executing)

**Generated:** 2026-03-17
**Branch:** `navigation-cleanup-complete`
**Status:** INVESTIGATION COMPLETE — Awaiting Carlos's review before any code changes.

---

## TABLE OF CONTENTS

1. [Android package name `com.anonymous.Lynx`](#issue-1)
2. [No `eas.json` exists](#issue-2)
3. [No EAS project ID or owner in app.json](#issue-3)
4. [`.env` committed to git](#issue-4)
5. [No `android.versionCode` set](#issue-5)
6. [Duplicate Android permissions](#issue-6)
7. [Missing `/team-hub` route](#issue-7)
8. [`.single()` crash on PlayerCardExpanded](#issue-8)
9. [`.single()` crashes across codebase](#issue-9)
10. [Push token writes to non-existent column](#issue-10)
11. [COPPA consent not collected at signup](#issue-11)
12. [Account deletion only flags, never executes](#issue-12)
13. [Console statements ungated in production](#issue-13)
14. [`expo-updates` not installed](#issue-14)

---

<a id="issue-1"></a>
## ISSUE 1: Android package name is `com.anonymous.Lynx`

### Current State

**File:** `app.json`, line 33
```json
"package": "com.anonymous.Lynx"
```

The package name `com.anonymous.Lynx` is the Expo default placeholder. Google Play **will reject** any submission using the `com.anonymous.*` namespace. Once published, the package name is permanent — it cannot be changed without creating a new app listing.

**Grep results:** `com.anonymous.Lynx` appears only in `app.json:33` within actual source code. All other hits are in audit report markdown files. No deep link config, notification config, or OAuth callback references this package name anywhere in `lib/`, `app/`, or `components/`.

### Blast Radius

- Only `app.json` needs to change.
- No other source file references this package name.
- The `scheme: "lynx"` (app.json:8) is separate and unaffected.

### Proposed Fix

Replace line 33 in `app.json`:
```json
"package": "com.thelynxapp.lynx"
```

### Risk Assessment

- **Risk: ZERO** if done before first store submission. The package name has never been published.
- Once published to Google Play, this becomes immutable. Choose carefully.

### Verification

1. Run `npx expo config` — confirm `android.package` shows the new value.
2. Run `npx expo prebuild --platform android` — confirm the generated `android/app/build.gradle` uses the new package name.

### Dependencies

- Must be done **before** first `eas build` for production.
- Issue 2 (`eas.json`) and Issue 3 (`eas init`) should be done in the same batch.

---

<a id="issue-2"></a>
## ISSUE 2: No `eas.json` exists

### Current State

**Confirmed:** No `eas.json` file exists at the project root. No `app.config.js` or `app.config.ts` exists either. The `app.json` has no `extra.eas` or `owner` fields.

### Blast Radius

Without `eas.json`, EAS Build cannot be configured. No builds can be submitted to stores. No OTA updates can be published.

### Proposed Fix

Create `eas.json` at the project root with the following content:

```json
{
  "cli": {
    "version": ">= 15.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### Risk Assessment

- **Risk: NONE.** This is a new file, not modifying existing behavior.
- The `autoIncrement: true` on the production profile handles `versionCode` bumping automatically for subsequent builds (addresses Issue 5).

### Verification

1. Run `eas build:configure` — should recognize the new `eas.json`.
2. Run `eas build --profile preview --platform android` — should produce a build.

### Dependencies

- Issue 3 (`eas init`) must be done first to get the project ID.
- The `google-service-account.json` path in `submit` will need to be configured by Carlos with actual Google Play credentials.

**Environment variables needed in EAS Secrets for production:**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- (Dev-only vars should NOT be set in EAS: `EXPO_PUBLIC_DEV_SKIP_AUTH`, `EXPO_PUBLIC_DEV_USER_EMAIL`, `EXPO_PUBLIC_DEV_USER_PASSWORD`)

---

<a id="issue-3"></a>
## ISSUE 3: No EAS project ID or owner in app.json

### Current State

**Confirmed:** `app.json` has no `extra.eas.projectId` field and no `owner` field.

The `projectId` is read at `lib/notifications.ts:84`:
```typescript
const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
const tokenData = await Notifications.getExpoPushTokenAsync({
  projectId,
});
```

When `projectId` is `undefined`, `getExpoPushTokenAsync` will fail on standalone builds (works in Expo Go only because Expo Go injects its own project ID). This means **push notifications cannot be registered** on any production/preview build.

### Blast Radius

- `app.json` — needs `extra.eas.projectId` and `owner` added.
- `lib/notifications.ts:84` — already reads the correct path, no change needed.
- Push token registration silently fails without the project ID.

### Proposed Fix

Carlos must run interactively:
```bash
eas init
```

This will add to `app.json`:
```json
{
  "expo": {
    ...existing config...,
    "owner": "carlos-expo-account-name",
    "extra": {
      "eas": {
        "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
      }
    }
  }
}
```

### Risk Assessment

- **Risk: NONE.** Additive config only.
- Cannot be done by CI — requires interactive Expo account login.

### Verification

1. After `eas init`, run `npx expo config` — confirm `extra.eas.projectId` is present.
2. Run `eas whoami` — confirm the correct account is linked.
3. Build a preview and test push notification registration.

### Dependencies

- Must be done before Issue 14 (`expo-updates`) since OTA updates require the project ID.
- Must be done before any `eas build`.

---

<a id="issue-4"></a>
## ISSUE 4: `.env` committed to git

### Current State

**`.gitignore`** (line 34): Only `.env*.local` is ignored. The base `.env` file is NOT gitignored.

**`.env` contents:**
```
EXPO_PUBLIC_SUPABASE_URL=https://uqpjvbiuokwpldjvxiby.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
EXPO_PUBLIC_DEV_SKIP_AUTH=false
EXPO_PUBLIC_DEV_USER_EMAIL=
EXPO_PUBLIC_DEV_USER_PASSWORD=
```

**Assessment of each variable:**
| Variable | Secret? | Notes |
|----------|---------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | No | Public project URL, visible in client JS anyway |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | No | Public anon key by design (RLS enforces security) |
| `EXPO_PUBLIC_DEV_SKIP_AUTH` | No | Set to `false` — not a risk |
| `EXPO_PUBLIC_DEV_USER_EMAIL` | Potentially | Empty now, but could be set to real email |
| `EXPO_PUBLIC_DEV_USER_PASSWORD` | Potentially | Empty now, but could be set to real password |

**No files** read from env vars that are NOT prefixed with `EXPO_PUBLIC_` — all are client-side bundled vars.

### Blast Radius

- `.gitignore` — needs `.env` added.
- `.env.example` — new file with placeholder values.
- Git history still contains the `.env` file.

### Proposed Fix

**1. Add to `.gitignore`:**
```
# env files
.env
.env*.local
```

**2. Create `.env.example`:**
```
# Supabase public client config (safe for client-side bundling)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Dev-only: auto-login (never works in production builds)
EXPO_PUBLIC_DEV_SKIP_AUTH=false
EXPO_PUBLIC_DEV_USER_EMAIL=
EXPO_PUBLIC_DEV_USER_PASSWORD=
```

**3. Remove from git tracking (without deleting the file):**
```bash
git rm --cached .env
```

### Risk Assessment

- **Risk: LOW.** The `EXPO_PUBLIC_SUPABASE_ANON_KEY` is a public key by design — it is safe to have in git history. RLS policies enforce security, not key secrecy.
- **Key rotation is NOT recommended** unless the dev credentials were ever populated with real values. The anon key is designed to be public.
- The real risk is the **pattern** of committing `.env` — future devs might add real secrets there.

### Verification

1. After `git rm --cached .env`, run `git status` — `.env` should show as deleted (staged) but file still exists locally.
2. Confirm `.env.example` has the correct placeholder structure.

### Dependencies

- None. Can be done independently.

---

<a id="issue-5"></a>
## ISSUE 5: No `android.versionCode` set

### Current State

**File:** `app.json`, `android` section (lines 14-34)

The `android` object contains `adaptiveIcon`, `edgeToEdgeEnabled`, `predictiveBackGestureEnabled`, `permissions`, and `package`. There is **no `versionCode` property**.

Google Play requires `versionCode` to be a monotonically increasing integer. Without it, EAS defaults to 1, but subsequent submissions require either manual incrementing or `autoIncrement` in `eas.json`.

### Blast Radius

- Only `app.json` needs to change.

### Proposed Fix

Add `versionCode` to the `android` section in `app.json`, after line 21 (`"predictiveBackGestureEnabled": false,`):

```json
"android": {
  "adaptiveIcon": { ... },
  "edgeToEdgeEnabled": true,
  "predictiveBackGestureEnabled": false,
  "versionCode": 1,
  "permissions": [ ... ],
  "package": "com.thelynxapp.lynx"
}
```

Combined with `"autoIncrement": true` in the `eas.json` production profile (Issue 2), subsequent builds will auto-increment the version code.

### Risk Assessment

- **Risk: ZERO.** Additive change, no behavior impact until a build is submitted.

### Verification

1. Run `npx expo config` — confirm `android.versionCode` is `1`.
2. After first `eas build`, confirm `eas build:list` shows `versionCode: 1`. After second build, confirm `versionCode: 2`.

### Dependencies

- Issue 2 (`eas.json` with `autoIncrement: true`) should be done alongside to ensure automatic version bumping.

---

<a id="issue-6"></a>
## ISSUE 6: Duplicate Android permissions

### Current State

**File:** `app.json`, lines 23-32:
```json
"permissions": [
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS",
  "android.permission.READ_CALENDAR",
  "android.permission.WRITE_CALENDAR",
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS",
  "android.permission.READ_CALENDAR",
  "android.permission.WRITE_CALENDAR"
]
```

The 4 permissions are listed **twice each**. The array has 8 entries but only 4 unique permissions.

### Blast Radius

- Only `app.json` needs to change.
- No functional impact (Android deduplicates at build time), but it's confusing and signals an uncleaned config.

### Proposed Fix

Replace the permissions array with deduplicated version:
```json
"permissions": [
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS",
  "android.permission.READ_CALENDAR",
  "android.permission.WRITE_CALENDAR"
]
```

### Risk Assessment

- **Risk: ZERO.** Android ignores duplicates. Removing them has no functional change.

### Verification

1. Visual inspection of `app.json`.
2. Run `npx expo prebuild --platform android` — confirm `AndroidManifest.xml` has each permission exactly once.

### Dependencies

- None. Can be done independently.

---

<a id="issue-7"></a>
## ISSUE 7: Missing `/team-hub` route (player tap crashes)

### Current State

**File:** `components/player-scroll/PlayerTeamHubCard.tsx`, line 64:
```typescript
onPress={() => router.push(`/team-hub?teamId=${teamId}` as any)}
```

**No `/team-hub` route exists.** There is no `app/team-hub.tsx` file. When a player taps the "Team Hub" card, Expo Router cannot resolve the route, causing an unhandled navigation error.

**What does exist:**
- `app/(tabs)/connect.tsx` — the player's Team Hub screen (uses `useTeamContext()` for selectedTeamId, does NOT accept route params)
- `app/(tabs)/coach-team-hub.tsx` — the coach's Team Hub
- `app/(tabs)/parent-team-hub.tsx` — the parent's Team Hub

**Grep for `team-hub` across codebase:** Only appears in `PlayerTeamHubCard.tsx:64` and audit report files.

**`PlayerTeamHubCard` is rendered from:** `components/PlayerHomeScroll.tsx:447`:
```tsx
<PlayerTeamHubCard
  teamName={teamName}
  teamColor={teamColor}
  teamId={selectedTeamId}
/>
```

The `connect.tsx` screen already reads the team from `useTeamContext()`, which is the same `selectedTeamId` passed to PlayerTeamHubCard. So the `teamId` query param is unnecessary.

### Blast Radius

- 1 file to change: `components/player-scroll/PlayerTeamHubCard.tsx`
- `connect.tsx` does NOT need changes — it already reads team context.
- No other file references `/team-hub`.

### Proposed Fix

**Option B (recommended): Change the push to use the existing tab route.**

Replace line 64 in `components/player-scroll/PlayerTeamHubCard.tsx`:
```typescript
// BEFORE:
onPress={() => router.push(`/team-hub?teamId=${teamId}` as any)}

// AFTER:
onPress={() => router.push('/(tabs)/connect' as any)}
```

**Why Option B over creating a redirect file:** Creating `app/team-hub.tsx` adds a file that only exists to redirect. Simpler to fix the source. The `teamId` param is unused by `connect.tsx` anyway.

### Risk Assessment

- **Risk: LOW.** Single line change. The target route already exists and works.
- **Before fix:** Player taps "Team Hub" → navigation error / crash / blank screen.
- **After fix:** Player taps "Team Hub" → navigates to the Connect tab (their Team Hub).

### Verification

1. Log in as a player with a team assignment.
2. Scroll to the "Team Hub" card on the home screen.
3. Tap it — should navigate to the Connect tab showing the team hub content.

### Dependencies

- None. Can be done independently.

---

<a id="issue-8"></a>
## ISSUE 8: `.single()` crash on PlayerCardExpanded (3 callsites)

### Current State

**File:** `components/PlayerCardExpanded.tsx`

**Callsite 1 — `player_stats` (lines 128-132):**
```typescript
const { data: statsData } = await supabase
  .from('player_stats')
  .select('*')
  .eq('player_id', player.id)
  .single();
```
- **Table:** `player_stats`
- **Filter:** `player_id = player.id`
- **Zero rows:** New player with no stats → `PGRST116` error thrown
- **Code after:** Lines 134-136 check `if (statsData)` — but the throw prevents reaching this check.

**Callsite 2 — `player_skills` (lines 139-143):**
```typescript
const { data: skillsData } = await supabase
  .from('player_skills')
  .select('*')
  .eq('player_id', player.id)
  .single();
```
- **Table:** `player_skills`
- **Filter:** `player_id = player.id`
- **Zero rows:** New player with no skills → `PGRST116` thrown
- **Code after:** Lines 145-149 handle both non-null and null cases — but the throw prevents reaching either.

**Callsite 3 — `player_skill_ratings` (lines 152-158):**
```typescript
const { data: evalData } = await supabase
  .from('player_skill_ratings')
  .select('serving_rating, passing_rating, setting_rating, attacking_rating, blocking_rating, defense_rating, hustle_rating, coachability_rating, teamwork_rating, overall_rating')
  .eq('player_id', player.id)
  .order('rated_at', { ascending: false })
  .limit(1)
  .single();
```
- **Table:** `player_skill_ratings`
- **Filter:** `player_id = player.id`, ordered by most recent, limit 1
- **Zero rows:** Unevaluated player → `PGRST116` thrown
- **Code after:** Lines 160-164 handle both cases — but the throw prevents reaching them.

**Note:** The 4th query (badges, lines 167-171) correctly uses `.select()` without `.single()` (returns an array). No fix needed there.

### Blast Radius

- 1 file: `components/PlayerCardExpanded.tsx`
- This component is used whenever a coach or admin taps on a player card to expand it. Any player without stats/skills/ratings causes the expanded card to crash.
- **Before fix:** New player → tap card → crash (unhandled PGRST116).
- **After fix:** New player → tap card → card shows with empty/default stat sections.

### Proposed Fix

**Line 132:** Change `.single()` to `.maybeSingle()`:
```typescript
const { data: statsData } = await supabase
  .from('player_stats')
  .select('*')
  .eq('player_id', player.id)
  .maybeSingle();
```

**Line 143:** Change `.single()` to `.maybeSingle()`:
```typescript
const { data: skillsData } = await supabase
  .from('player_skills')
  .select('*')
  .eq('player_id', player.id)
  .maybeSingle();
```

**Line 158:** Change `.single()` to `.maybeSingle()`:
```typescript
const { data: evalData } = await supabase
  .from('player_skill_ratings')
  .select('serving_rating, passing_rating, setting_rating, attacking_rating, blocking_rating, defense_rating, hustle_rating, coachability_rating, teamwork_rating, overall_rating')
  .eq('player_id', player.id)
  .order('rated_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

No other changes needed — the existing null-check code on lines 134, 145, and 160 already handles `null` data correctly.

### Risk Assessment

- **Risk: ZERO.** `.maybeSingle()` returns `null` instead of throwing when zero rows exist. The existing null guards already handle this case.

### Verification

1. Open the app as a coach.
2. Navigate to the roster and tap on a player who has NO stats, NO skills, and NO evaluations.
3. The expanded card should render without crashing, showing empty/default values.
4. Tap on a player who HAS data — should render normally with stats displayed.

### Dependencies

- None. Can be done independently.

---

<a id="issue-9"></a>
## ISSUE 9: `.single()` crashes across codebase (priority callsites)

### Global Count

**93 total `.single()` callsites** in active code (excluding `_archive/`, `reference/`, `node_modules/`).

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 2 | Blocks all users or always fails for common actions |
| **HIGH** | 5 | Crashes key user flows (registration, chat sync, announcements) |
| **MEDIUM** | ~30 | SELECT by ID that could be stale/deleted |
| **LOW** | ~56 | INSERT+`.select().single()` patterns (inherently safe) or inside try/catch |

### Priority Callsite 1: `lib/permissions.ts` — line 20 (P1 CRITICAL)

#### Current State
```typescript
// lib/permissions.ts:16-20
const { data: profile } = await supabase
  .from('profiles')
  .select('id, current_organization_id')
  .eq('id', userId)
  .single();
```
- **Zero rows:** Throws `PGRST116`. No try/catch. **Kills all role detection for new users** with a valid auth session but no profile row yet (race condition during signup).
- **Downstream:** `usePermissions()` context fails to load → every screen that checks `isAdmin`, `isCoach`, `isParent` breaks.

#### Proposed Fix
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('id, current_organization_id')
  .eq('id', userId)
  .maybeSingle();
```
The existing null check on line 22 (`if (!profile || !profile.current_organization_id) return null;`) already handles the null path.

#### Risk: CRITICAL — blocks every user on app load during profile creation race condition.

---

### Priority Callsite 2: `lib/profile-completeness.ts` — lines 83 and 103

#### Current State
```typescript
// Line 79-83: player lookup
const { data: player } = await supabase
  .from('players')
  .select('*')
  .eq('id', playerId)
  .single();

// Line 99-103: season lookup
const { data: season } = await supabase
  .from('seasons')
  .select('registration_config')
  .eq('id', seasonId)
  .single();
```
- Both have downstream null guards but `.single()` throws before reaching them.
- No try/catch.

#### Proposed Fix
Change both to `.maybeSingle()`. Existing null handling on lines 85 and 105 already covers the null case.

#### Risk: HIGH — crashes registration flow for deleted/stale player or season IDs.

---

### Priority Callsite 3: `lib/registration-config.ts` — lines 125 and 148

#### Current State
```typescript
// Line 117-125: season fetch with joins
const { data: season, error: seasonError } = await supabase
  .from('seasons')
  .select(`*, organizations (id, name, slug, logo_url, primary_color), sports (id, name, code, icon, color_primary)`)
  .eq('id', seasonId)
  .single();

// Line 144-148: template fetch
const { data: template } = await supabase
  .from('registration_templates')
  .select('player_fields, parent_fields, emergency_fields, medical_fields, waivers, custom_questions')
  .eq('id', season.registration_template_id)
  .single();
```

#### Proposed Fix
Change both to `.maybeSingle()`. Both have existing downstream null handling.

#### Risk: HIGH — invalid season link crashes registration form.

---

### Priority Callsite 4: `lib/challenge-service.ts` — line 458

#### Current State
```typescript
const winnerProfile = winnerId
  ? (await supabase.from('profiles').select('full_name').eq('id', winnerId).single()).data
  : null;
```
- Inside a try/catch, so won't crash the app, but causes entire challenge completion to silently fail.

#### Proposed Fix
```typescript
const winnerProfile = winnerId
  ? (await supabase.from('profiles').select('full_name').eq('id', winnerId).maybeSingle()).data
  : null;
```

#### Risk: MEDIUM — silent failure means no XP, no wall post, no notifications for challenge completion.

---

### Priority Callsite 5: `app/(tabs)/connect.tsx` — line 93

#### Current State
```typescript
const profile = (await supabase.from('profiles').select('email').eq('id', user.id).single()).data;
```
- Inside try/catch. If this fails, parent sees no teams.

#### Proposed Fix
```typescript
const profile = (await supabase.from('profiles').select('email').eq('id', user.id).maybeSingle()).data;
```

#### Risk: MEDIUM — parent's main team hub fails to load.

---

### Priority Callsite 6: `app/chat/[id].tsx` — line 520 (CRITICAL)

#### Current State
```typescript
// Line 514-520: check if user already reacted
const { data: existing } = await supabase
  .from('message_reactions')
  .select('id')
  .eq('message_id', messageId)
  .eq('user_id', profile.id)
  .eq('reaction_type', reactionType)
  .single();
```
- **Zero rows is the COMMON CASE** — user hasn't reacted yet. `.single()` throws for every first-time reaction attempt.
- No try/catch.

#### Proposed Fix
```typescript
const { data: existing } = await supabase
  .from('message_reactions')
  .select('id')
  .eq('message_id', messageId)
  .eq('user_id', profile.id)
  .eq('reaction_type', reactionType)
  .maybeSingle();
```

#### Risk: CRITICAL — every first-time reaction tap triggers an unhandled error. Most common chat interaction is broken.

**Other `.single()` calls in `app/chat/[id].tsx`:**
- Line 128: channel fetch → change to `.maybeSingle()` (MEDIUM)
- Line 218: single message fetch in realtime handler → change to `.maybeSingle()` (MEDIUM)
- Lines 413, 619: insert+select patterns → safe, leave as-is
- Line 730: DM channel creation insert+select → optionally change to `.maybeSingle()` (LOW)

---

### Priority Callsite 7: `app/(tabs)/admin-teams.tsx` — line 297

Insert + `.select().single()` pattern with error guard. **Safe.** Optionally change to `.maybeSingle()` for consistency.

---

### Priority Callsite 8: `lib/chat-utils.ts` — line 45

#### Current State
```typescript
// getProfileByEmail function
const { data: existing } = await supabase
  .from('profiles')
  .select('id, full_name')
  .eq('email', email.toLowerCase())
  .single();
```
- **Purpose is explicitly to check if a profile exists.** Zero rows is the expected "not found" case.
- Also crashes on duplicate emails (returns 2+ rows).
- No try/catch. Called in a loop during `syncTeamChats`.

#### Proposed Fix
```typescript
const { data: existing } = await supabase
  .from('profiles')
  .select('id, full_name')
  .eq('email', email.toLowerCase())
  .maybeSingle();
```

#### Risk: HIGH — a single person without an account crashes the entire team chat sync.

---

### Priority Callsite 9: `lib/chat-utils.ts` — line 389

#### Current State
```typescript
// createLeagueAnnouncementChannel - existence check
const { data: existing } = await supabase
  .from('chat_channels')
  .select('id')
  .eq('season_id', seasonId)
  .eq('channel_type', 'league_announcement')
  .single();
```
- **Zero rows = the common case for a new season.** The function is supposed to create the channel if it doesn't exist, but `.single()` throws first.

#### Proposed Fix
```typescript
const { data: existing } = await supabase
  .from('chat_channels')
  .select('id')
  .eq('season_id', seasonId)
  .eq('channel_type', 'league_announcement')
  .maybeSingle();
```

#### Risk: HIGH — league announcement channels can never be created for new seasons.

---

### Fix Strategy for All `.single()` Calls

1. **IMMEDIATE (before launch):** Fix the 2 CRITICAL + 5 HIGH callsites (7 changes across 5 files).
2. **NEXT PASS:** Fix all ~30 MEDIUM callsites (SELECT by ID without try/catch).
3. **LEAVE AS-IS:** ~56 LOW callsites (insert+select patterns, already in try/catch).
4. **Rule:** All SELECT queries using `.single()` → `.maybeSingle()` unless mathematically guaranteed exactly one row.

---

<a id="issue-10"></a>
## ISSUE 10: Push token writes to non-existent column

### Current State

**File:** `lib/notifications.ts`, lines 114-120:
```typescript
export async function savePushToken(userId: string, token: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);
  if (error) console.error('Error saving push token:', error);
}
```

The `profiles` table has **no `push_token` column** (confirmed via SCHEMA_REFERENCE.csv).

A separate `push_tokens` table EXISTS with columns:
- `id` (uuid)
- `user_id` (uuid)
- `token` (text)
- `device_type` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Current behavior:** The Supabase PostgREST API returns an error for updates to non-existent columns. The error is console-logged and silently ignored. **No push token is ever persisted for any user. Push notifications are completely non-functional.**

**Callers:** Only 1 — `lib/auth.tsx:264`:
```typescript
const token = await registerForPushNotificationsAsync();
if (token && session.user.id) {
  await savePushToken(session.user.id, token);
}
```

### Blast Radius

- 1 file: `lib/notifications.ts` (function body change only, same signature)
- 0 caller changes needed
- Push notification delivery via the web admin's Edge Function finds zero rows in `push_tokens` and marks everything as `skipped`.

### Proposed Fix

Replace the `savePushToken` function (lines 114-120) with:

```typescript
export async function savePushToken(userId: string, token: string) {
  // Remove old tokens for this user, then insert fresh
  await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId);

  const { error } = await supabase
    .from('push_tokens')
    .insert({
      user_id: userId,
      token,
      device_type: Platform.OS,
      updated_at: new Date().toISOString(),
    });
  if (error) console.error('Error saving push token:', error);
}
```

**Note:** `Platform` is already imported at line 6 of the file. The delete-then-insert approach is safe regardless of unique constraint configuration on the `push_tokens` table.

**Alternative (if unique constraint on `user_id,token` exists):**
```typescript
export async function savePushToken(userId: string, token: string) {
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, device_type: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' }
    );
  if (error) console.error('Error saving push token:', error);
}
```

### Risk Assessment

- **Severity: HIGH** — push notifications are 100% broken today.
- **Fix risk: LOW** — single function, same signature, one caller.
- **Schema concern:** The web admin's push Edge Function references `expo_push_token` and `is_active` columns that don't appear in the mobile schema CSV. Verify production table schema via Supabase dashboard before deploying.

### Verification

1. Sign in on a device. Check `push_tokens` table in Supabase dashboard — a row should appear.
2. Trigger a notification via the web admin — confirm the device receives the push.

### Dependencies

- Verify production `push_tokens` table columns match the CSV schema before deploying.
- No migration needed (table already exists).

---

<a id="issue-11"></a>
## ISSUE 11: COPPA consent not collected at signup

### Current State

**Signup flow** (`app/(auth)/signup.tsx`):
1. Step 1: Name, email, password
2. Step 2: Role selection (coach / team_manager / parent / player)
3. Step 3: Organization code entry
4. Account creation → profile insert
5. **Zero COPPA consent collection.** No checkbox, no modal, no age verification.

**CoppaConsentModal** (`components/CoppaConsentModal.tsx`):
- Rendered globally in `_layout.tsx` (line 189)
- Trigger conditions (ALL must be true):
  1. User is logged in
  2. Profile exists
  3. User is a parent (`isParent` from permissions)
  4. `profile.coppa_consent_given !== true`
  5. User has at least one child in `player_guardians`
- **Gap:** New parents have no children linked yet, so the modal never triggers at signup. Consent is only requested AFTER child data has already been collected — a COPPA violation.

**Schema:** `profiles` table already has `coppa_consent_given` (boolean) and `coppa_consent_date` (timestamptz) columns.

**Profile creation** (`lib/auth.tsx` lines 187-194): Only sets `id`, `email`, `full_name`, `onboarding_completed: false`. COPPA fields are never set during signup.

### Blast Radius

- `app/(auth)/signup.tsx` — add consent UI for parents
- Optionally `lib/auth.tsx` — set `coppa_consent_given` during profile creation
- `CoppaConsentModal` remains as a safety net for legacy parents

### Proposed Fix

**Minimum viable approach (recommended):**

1. In `app/(auth)/signup.tsx`: When `selectedRole === 'parent'`, add a consent checkbox/toggle between role selection and account creation. Use the same consent text from `CoppaConsentModal`.
2. Block the "Create Account" button until consent is checked.
3. After profile creation, update the profile with `coppa_consent_given: true` and `coppa_consent_date: new Date().toISOString()`.

Files to change:
- `app/(auth)/signup.tsx` — add consent UI
- Optionally update the post-creation profile update (already happens at lines 255-258 in signup.tsx) to include COPPA fields.

### Risk Assessment

- **Severity: MEDIUM-HIGH** — COPPA compliance issue (FTC enforcement risk).
- **Fix risk: LOW** — additive UI change for parents only. Non-parent roles unaffected.
- **UX impact:** One additional consent checkbox for parents.

### Verification

1. Create a new parent account — consent step should appear.
2. Check `profiles` table — `coppa_consent_given = true`, `coppa_consent_date` is set.
3. Verify `CoppaConsentModal` still works for legacy parents.
4. Verify non-parent roles don't see the consent step.

### Dependencies

- None. Schema columns already exist. Consent text already exists in CoppaConsentModal.

---

<a id="issue-12"></a>
## ISSUE 12: Account deletion only flags, never executes

### Current State

**File:** `app/profile.tsx`, lines 213-248:
```typescript
const handleDeleteAccount = async () => {
  if (deleteConfirm !== 'DELETE') {
    Alert.alert('Confirmation Required', 'Please type DELETE to confirm.');
    return;
  }
  Alert.alert(
    'Delete Account',
    'This action is irreversible. Your account will be flagged for deletion.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete My Account',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            const { error } = await supabase
              .from('profiles')
              .update({ deletion_requested: true })
              .eq('id', user!.id);

            if (error) throw error;
            Alert.alert(
              'Account Deletion Requested',
              'Your account has been flagged for deletion. You will be signed out.',
              [{ text: 'OK', onPress: () => signOut() }]
            );
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to request deletion.');
            setDeleting(false);
          }
        },
      },
    ]
  );
};
```

This **only sets `deletion_requested: true`** on `profiles` and signs the user out. **Nothing processes that flag.**

**Grep for `deletion_requested`:**
1. `app/profile.tsx:231` — sets flag (account deletion)
2. `app/data-rights.tsx:210-211` — sets flag on individual `players` records
3. `app/data-rights.tsx:250-251` — sets flag for revoke consent
4. `reference/web-admin/.../MyProfilePage.jsx:983` — web admin does the same (flag only)
5. **NO Edge Function, pg_cron, database trigger, or backend process exists to read this flag.**

### Blast Radius

**Tables with user data requiring deletion/anonymization (30+):**

| Category | Tables |
|----------|--------|
| **Core identity** | `profiles`, `auth.users` |
| **Roles & context** | `user_roles`, `user_active_contexts`, `user_dashboard_layouts` |
| **Children** | `players` (via `parent_account_id`), `player_guardians`, `player_parents` |
| **Communication** | `push_tokens`, `notifications`, `notification_preferences`, `chat_messages`, `channel_members` |
| **Team assignments** | `team_staff`, `team_posts`, `team_post_comments`, `team_post_reactions` |
| **Social** | `shoutouts`, `user_blocks`, `message_reports` |
| **Achievements** | `user_achievements`, `xp_ledger` |
| **Coaching** | `coaches` (via `profile_id`) |
| **Storage** | Avatar photos in `media` bucket |

### Proposed Fix

**Requires a Supabase Edge Function** — this is the most complex fix and needs Carlos's review.

**Outline for `process-account-deletions` Edge Function:**

1. **Schedule:** Run daily via pg_cron (or external cron).
2. **Query:** `SELECT * FROM profiles WHERE deletion_requested = true`.
3. **For each flagged profile:**

   **a. Anonymize** (preserve referential integrity):
   - `profiles`: set `full_name = 'Deleted User'`, `email = 'deleted-{uuid}@deleted.local'`, `phone = null`, `avatar_url = null`, `is_suspended = true`
   - `players` (where `parent_account_id = user_id`): null out `parent_name`, `parent_email`, `parent_phone`, `medical_notes`, `allergies`, `medications`

   **b. Hard-delete** (user-scoped only):
   - `push_tokens`, `notification_preferences`, `notifications`, `user_active_contexts`, `user_dashboard_layouts`, `user_blocks`, `channel_members`

   **c. Soft-delete** (shared content):
   - `chat_messages`: set `content = '[deleted]'`, `is_deleted = true`
   - `team_posts`: set `is_published = false`
   - `team_post_comments`: set `is_deleted = true`

   **d. Deactivate:**
   - `user_roles`: `is_active = false`
   - `team_staff`: `is_active = false`

   **e. Delete storage:** Remove `profile-photos/{user_id}_*` from `media` bucket.

   **f. Delete auth user:** `supabase.auth.admin.deleteUser(userId)` (requires service role key).

   **g. Log:** Insert into `platform_admin_actions`.

4. **Also process child deletions** from `data-rights.tsx` (players with `deletion_requested = true`).

### Risk Assessment

- **Severity: HIGH** — Google Play policy violation (data deletion required within 30-60 days since April 2024). App could be removed.
- **Fix complexity: HIGH** — new Edge Function, cascade logic, extensive testing.
- **Missing column:** `profiles` table lacks `deletion_requested_at` timestamp. Without it, the grace period cannot be enforced. Recommend adding this column, or using `updated_at` as proxy.

### Verification

1. Set `deletion_requested = true` on a test profile.
2. Run the Edge Function manually.
3. Verify: profile anonymized, auth user deleted, push tokens removed, chat messages show `[deleted]`, storage files removed.
4. Verify: team data (game stats, standings) still has referential integrity.

### Dependencies

- Requires `SUPABASE_SERVICE_ROLE_KEY` secret.
- Needs a cron trigger (pg_cron or external).
- Consider adding `deletion_requested_at` column to `profiles`.
- This is Carlos's decision: what to hard-delete vs. anonymize vs. retain.

---

<a id="issue-13"></a>
## ISSUE 13: Console statements ungated in production (~60)

### Current State

**Total ungated console statements: ~61** across `lib/`, `app/`, `components/`, `hooks/`.

| Type | Ungated | Gated | Total |
|------|---------|-------|-------|
| `console.log` | ~5 | ~17 | ~22 |
| `console.error` | ~55 | ~115 | ~170 |
| `console.warn` | ~1 | ~1 | ~2 |

**Highest-risk files:**

| File | Ungated Count | Risk |
|------|---------------|------|
| `lib/notifications.ts` | 10 console.error | Leaks error details |
| `lib/media-utils.ts` | 4 log + 5 error = 9 | **Leaks file URIs and blob sizes** |
| `lib/auth.tsx` | 4 error + 1 warn = 5 | **Leaks email-related errors** |
| `lib/quest-engine.ts` | 6 error | Leaks quest system errors |
| `lib/chat-utils.ts` | 3 error | Leaks chat sync errors |
| `lib/team-context.tsx` | 2 error | Leaks team context errors |
| Various hooks | 5 error | Leaks hook errors |
| `components/TapDebugger.tsx` | 1 log | **Debug component — should be removed entirely** |

### Blast Radius

- **Security:** `lib/media-utils.ts` logs file URIs and Supabase error JSON. `lib/auth.tsx` logs error messages that could contain user identifiers.
- **Performance:** Marginal — console calls are fast but unnecessary in production.
- **No user-facing impact:** Console statements don't affect UI.

### Proposed Fix

**Recommendation: Wrap each in `if (__DEV__)` (NOT a shared logger utility).**

**Why `if (__DEV__)` is better:**
1. **Tree-shaking:** Metro strips `if (__DEV__)` blocks entirely from production bundles. A `logger.ts` wrapper still incurs function call overhead and string argument evaluation.
2. **Smaller diff:** One-line change per callsite vs. creating a new module + importing in 20+ files.
3. **Pattern consistency:** The codebase already uses `if (__DEV__) console.X(...)` in ~115+ locations.
4. **Zero regression risk:** Adding `if (__DEV__)` cannot change behavior.

**The fix is mechanical:** For each ungated call, change:
```typescript
// BEFORE:
console.error('Error message:', error);

// AFTER:
if (__DEV__) console.error('Error message:', error);
```

**For `components/TapDebugger.tsx`:** Delete the file or gate the entire export behind `if (__DEV__)`.

### Risk Assessment

- **Risk: ZERO.** Purely additive guard. No logic changes.
- Only risk is accidentally wrapping a console call inside a multi-line if block — review each to confirm standalone statement.

### Verification

1. Grep for ungated `console\.(log|error|warn)` — count should be 0.
2. On a production build, confirm no console output in `adb logcat`.

### Dependencies

- None. Fully independent.

---

<a id="issue-14"></a>
## ISSUE 14: `expo-updates` not installed

### Current State

**Confirmed:** `expo-updates` is NOT in `package.json`. No `updates` config exists in `app.json`. No `runtimeVersion` is defined.

Without OTA updates, every bug fix requires:
1. Building a new binary
2. Submitting to App Store / Google Play
3. Waiting 1-3 days for review
4. Waiting for users to update

**Post-launch critical bugs cannot be hotfixed.**

### Blast Radius

- `package.json` — new dependency
- `app.json` — new `updates` and `runtimeVersion` sections
- `plugins` array — add `expo-updates`
- Requires native rebuild

### Proposed Fix

**Step 1:** Install
```bash
npx expo install expo-updates
```

**Step 2:** Add to `app.json` (inside `"expo"` key):
```json
"updates": {
  "url": "https://u.expo.dev/<EAS_PROJECT_ID>",
  "enabled": true,
  "checkAutomatically": "ON_LOAD",
  "fallbackToCacheTimeout": 3000
},
"runtimeVersion": {
  "policy": "appVersion"
}
```

**Step 3:** Add to plugins array:
```json
"plugins": [
  "expo-router",
  ["expo-splash-screen", { ... }],
  "@react-native-community/datetimepicker",
  "expo-audio",
  "expo-calendar",
  "expo-updates"
]
```

**Step 4:** Rebuild native projects:
```bash
npx expo prebuild --clean
```

### Risk Assessment

- **Risk: LOW** for install. Does not change existing behavior until an OTA update is published.
- `checkAutomatically: "ON_LOAD"` adds a small network request per app launch (falls back gracefully).
- `fallbackToCacheTimeout: 3000` = worst case 3s extra splash screen on slow connection.

### Verification

1. `npx expo config` — verify `updates` section.
2. Build preview, make a JS change, publish with `eas update`, confirm update applies.

### Dependencies

- **Blocked by Issue 3** (`eas init` for project ID — required for `updates.url`).
- **Blocked by Issue 1** (package name must be finalized first).
- Carlos does this after `eas init` as part of the EAS setup batch.

---

## EXECUTION ORDER

| Phase | Issues | Effort | Blocker? |
|-------|--------|--------|----------|
| **1. Carlos manual** | 1, 2, 3, 5, 6 | 15 min | Must be done first (eas init is interactive) |
| **2. Code fixes** | 4, 7, 8, 10 | 30 min | Quick wins, independent |
| **3. .single() sweep** | 9 (CRITICAL+HIGH) | 30 min | 7 callsites across 5 files |
| **4. Console cleanup** | 13 | 45 min | Mechanical, low risk |
| **5. COPPA consent** | 11 | 1-2 hrs | UI addition to signup flow |
| **6. OTA updates** | 14 | 15 min | After Phase 1 completes |
| **7. Deletion backend** | 12 | 4-8 hrs | Edge Function — most complex, needs Carlos's decisions |

**CRITICAL PATH:** Phases 1-3 must be done before first store submission. Phase 7 must be done within 30 days of launch per Google policy.
