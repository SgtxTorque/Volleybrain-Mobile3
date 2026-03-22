# AUDIT REPORT 01 -- Play Store Blockers

**Auditor:** Claude Opus 4.6
**Date:** 2026-03-17
**Branch:** `navigation-cleanup-complete`
**Scope:** Build infrastructure, legal/policy compliance, security

---

## Severity Legend

| Severity | Definition |
|----------|-----------|
| **P0 -- BLOCKER** | App will be rejected by Google, will crash, will expose user data, or violates law. Cannot ship. |
| **P1 -- CRITICAL** | Core user flow is broken or unusable. Will lose users immediately. |
| **P2 -- MAJOR** | Feature doesn't work correctly but has workaround. |
| **P3 -- MINOR** | Cosmetic issues, rough edges. |
| **P4 -- NICE-TO-HAVE** | Polish items. |

---

## 1A. Build & Submission Infrastructure

### FINDING 1A-01: Android package is `com.anonymous.Lynx` [P0 -- BLOCKER]

**File:** `app.json`, line 33
**Value:** `"package": "com.anonymous.Lynx"`

Google Play will reject any submission using the `com.anonymous.*` namespace. This is the Expo default placeholder and signals an unconfigured project. Once published, this cannot be changed -- the package name is permanent.

**Fix:** Change to a proper reverse-domain name, e.g.:
```json
"package": "com.thelynxapp.lynx"
```

---

### FINDING 1A-02: No `eas.json` file exists [P0 -- BLOCKER]

**File:** `eas.json` -- MISSING

Without `eas.json`, you cannot run `eas build` or `eas submit`. No production build can be generated. No APK/AAB can be submitted to Google Play.

**Fix:** Create `eas.json` at the project root:
```json
{
  "cli": { "version": ">= 15.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
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

---

### FINDING 1A-03: No EAS project ID or owner configured [P0 -- BLOCKER]

**File:** `app.json` -- missing `extra.eas.projectId` and `owner` fields

The `app.json` has no `extra.eas.projectId` and no `owner` field. EAS Build requires a linked project. Push notifications (`expo-notifications`) also need the project ID to generate Expo push tokens -- see `lib/notifications.ts`, line 84:
```ts
const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
```
Without this value, `projectId` is `undefined` and `getExpoPushTokenAsync()` will fail silently in production.

**Fix:** Run `eas init` to link the project, which will populate:
```json
{
  "expo": {
    "owner": "your-expo-username",
    "extra": {
      "eas": {
        "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
      }
    }
  }
}
```

---

### FINDING 1A-04: `expo-updates` not installed [P2 -- MAJOR]

**File:** `package.json` -- `expo-updates` absent from dependencies

Without `expo-updates`, there is no over-the-air (OTA) update capability. Every bug fix requires a full native build and Play Store review cycle (potentially 1-7 days). This is not a Play Store blocker, but it is a serious operational risk for a v1 launch.

**Fix:** `npx expo install expo-updates`, then configure `updates` in `app.json`.

---

### FINDING 1A-05: Versioning is at 1.0.0 with no `android.versionCode` [P1 -- CRITICAL]

**File:** `app.json`, line 5
**Value:** `"version": "1.0.0"` -- no `android.versionCode` set

Google Play requires `versionCode` to be a monotonically increasing integer. Without it explicitly set, EAS defaults to 1, but subsequent submissions require manual incrementing or `autoIncrement` in `eas.json`. If forgotten, the Play Store will reject the upload.

**Fix:** Add explicitly:
```json
"android": {
  "versionCode": 1,
  ...
}
```
And add `"autoIncrement": true` in `eas.json` build profile (see 1A-02 fix).

---

### FINDING 1A-06: Duplicate Android permissions [P3 -- MINOR]

**File:** `app.json`, lines 23-31
**Value:** RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, READ_CALENDAR, WRITE_CALENDAR each listed twice

The permissions array contains exact duplicates:
```json
"permissions": [
  "android.permission.RECORD_AUDIO",        // line 24
  "android.permission.MODIFY_AUDIO_SETTINGS", // line 25
  "android.permission.READ_CALENDAR",        // line 26
  "android.permission.WRITE_CALENDAR",       // line 27
  "android.permission.RECORD_AUDIO",        // line 28 -- DUPLICATE
  "android.permission.MODIFY_AUDIO_SETTINGS", // line 29 -- DUPLICATE
  "android.permission.READ_CALENDAR",        // line 30 -- DUPLICATE
  "android.permission.WRITE_CALENDAR"        // line 31 -- DUPLICATE
]
```

This won't cause a rejection but is sloppy and could confuse future maintainers.

**Fix:** Remove lines 28-31 (the duplicate set).

---

### FINDING 1A-07: Leftover React/Expo boilerplate assets [P3 -- MINOR]

**Files:**
- `assets/images/react-logo.png`
- `assets/images/react-logo@2x.png`
- `assets/images/react-logo@3x.png`
- `assets/images/partial-react-logo.png`

These default Expo template images ship in the bundle, wasting space and looking unprofessional if ever surfaced. Google reviewers may interpret them as a placeholder/sample app.

**Fix:** Delete all four files. Verify no import references them first.

---

### FINDING 1A-08: Splash icon `imageWidth: 200` is very small [P3 -- MINOR]

**File:** `app.json`, line 45
**Value:** `"imageWidth": 200`

200 logical pixels is small for high-DPI Android screens (e.g., Pixel 9 at 420 DPI). The splash icon may appear as a tiny dot.

**Fix:** Increase to 400-600 and verify the source image is at least 1024x1024.

---

### FINDING 1A-09: `predictiveBackGestureEnabled: false` [P4 -- NICE-TO-HAVE]

**File:** `app.json`, line 22

Predictive back gesture is a standard Android 14+ UX feature. Disabling it is intentional (likely due to Expo Router conflicts), but Google Play reviewers flagged predictive back as a best practice starting in late 2025.

**Fix:** No action needed now. Re-evaluate after Expo Router stabilizes predictive back support.

---

### FINDING 1A-10: `experiments.reactCompiler: true` enabled [P3 -- MINOR]

**File:** `app.json`, line 59

The React Compiler (babel-plugin-react-compiler v1.0.0 per `package-lock.json`) is enabled. With Expo SDK 54 and React 19.1.0 this is generally stable, but the compiler can break components that have non-idempotent side effects in render. No known crash-level issues at SDK 54, but it is worth testing thoroughly.

**Fix:** If any unexplained rendering bugs appear in production builds, this is the first thing to toggle off.

---

### FINDING 1A-11: `__DEV__` gated features are safe [P4 -- INFORMATIONAL]

Across the codebase, `__DEV__` is used in 100+ locations. All uses fall into safe categories:
1. **Logging:** `if (__DEV__) console.error(...)` -- suppressed in prod. Safe.
2. **Dev login bypass** (`lib/auth.tsx`, lines 126-142): Triple-gated by `__DEV__`, `EXPO_PUBLIC_DEV_SKIP_AUTH === 'true'`, AND valid credentials. Safe.
3. **Dev tools on login screen** (`app/(auth)/login.tsx`, line 197): `{__DEV__ && (...)}` -- stripped from prod. Safe.

**No action needed.** All `__DEV__` usage is properly gated.

---

### FINDING 1A-12: `EXPO_PUBLIC_DEV_SKIP_AUTH=false` in `.env` [P4 -- INFORMATIONAL]

**File:** `.env`, line 5

Currently set to `false` with empty email/password. Even if it were `true`, the code double-checks `__DEV__` (see 1A-11). Safe for production.

**No action needed.**

---

### FINDING 1A-13: Adaptive icon and splash assets exist [P4 -- INFORMATIONAL]

All required assets are present:
- `assets/images/android-icon-foreground.png` -- exists
- `assets/images/android-icon-background.png` -- exists
- `assets/images/android-icon-monochrome.png` -- exists
- `assets/images/splash-icon.png` -- exists

**No action needed.**

---

## 1B. Legal & Policy Compliance

### FINDING 1B-01: No web-hosted Privacy Policy URL [P0 -- BLOCKER]

**Evidence:** Google Play Console requires a Privacy Policy URL during store listing setup. The policy exists in-app (`app/privacy-policy.tsx`) but there is no web-hosted version. `app.json` has no `privacyPolicyUrl` field. The domain `thelynxapp.com` is referenced but no privacy policy page was found there.

Google Play will reject the submission without a public URL.

**Fix:** Host the privacy policy at `https://thelynxapp.com/privacy-policy` and add the URL to the Play Store listing. Optionally add to `app.json`:
```json
"android": {
  "privacyPolicyUrl": "https://thelynxapp.com/privacy-policy"
}
```

---

### FINDING 1B-02: No web-hosted Terms of Service URL [P2 -- MAJOR]

**Evidence:** Same as above. Terms exist in-app (`app/terms-of-service.tsx`) but have no web-hosted counterpart.

**Fix:** Host at `https://thelynxapp.com/terms-of-service`.

---

### FINDING 1B-03: Account deletion flags but does not delete [P0 -- BLOCKER]

**File:** `app/profile.tsx`, lines 213-248

The `handleDeleteAccount` function only sets `deletion_requested: true` on the profiles table:
```ts
const { error } = await supabase
  .from('profiles')
  .update({ deletion_requested: true })
  .eq('id', user!.id);
```

Google Play requires that account deletion must be **actually completed** -- not just requested -- within a reasonable timeframe. The current implementation:
1. Sets a flag on the `profiles` table
2. Signs the user out
3. **Nothing actually processes the deletion.** There is no backend function, cron job, or edge function that reads `deletion_requested` and executes the deletion.

The user's data (profile, players, game stats, chat messages, photos, medical info) all remain in the database indefinitely.

**Fix:** Implement one of:
- A Supabase Edge Function that runs on a schedule, finds `deletion_requested = true` profiles older than X days, and cascade-deletes all associated data
- A database trigger that immediately anonymizes/deletes upon the flag being set
- A Supabase `pg_cron` job

Per Google Play policy (effective since April 2024), the deletion must be completed within 60 days maximum.

---

### FINDING 1B-04: COPPA consent is retroactive-only -- not collected at signup [P1 -- CRITICAL]

**File:** `components/CoppaConsentModal.tsx` -- shown only to existing parents who registered before COPPA was added
**File:** `app/(auth)/signup.tsx` -- NO age gate, NO COPPA consent checkbox

The signup flow (`app/(auth)/signup.tsx`) collects: name, email, password, role selection, org code. There is **no** COPPA consent step. No age verification. No checkbox. The `CoppaConsentModal` component (lines 32-58) only fires for parents who:
1. Already have an account
2. Have `coppa_consent_given !== true` on their profile
3. Have children linked via `player_guardians`

A brand-new parent signing up and adding a child will never see a COPPA consent screen. This means child data is collected before parental consent -- a COPPA violation.

**Fix:** Add a COPPA consent step to the signup flow when the selected role is `parent`. The consent must be collected before any child data is stored. Alternatively, collect consent at the point where a parent first adds a child to a roster.

---

### FINDING 1B-05: Privacy Policy claims "email verification" as parental consent method [P2 -- MAJOR]

**File:** `app/privacy-policy.tsx`, line 68
**Value:** `"We use email verification as our parental consent method"`

Under the FTC's COPPA Rule, email-based consent (the "email plus" method) requires a confirmation email followed by a delayed second step. Simply verifying an email address is not sufficient. If the app is using standard Supabase email verification, that does not constitute valid verifiable parental consent.

**Fix:** Either:
1. Implement the FTC's "email plus" method properly (consent email + delayed confirmation + parental follow-up after a waiting period)
2. Use a different method (e.g., signed consent form, payment verification, video call)
3. Update the privacy policy to accurately describe whatever method is actually implemented

---

### FINDING 1B-06: Data export is a flag, not an actual export [P2 -- MAJOR]

**File:** `app/data-rights.tsx`, lines 170-192

The "Request Data Export" button sets `data_export_requested: true` on the profile:
```ts
const { error } = await supabase
  .from('profiles')
  .update({
    data_export_requested: true,
    data_export_requested_at: new Date().toISOString(),
  })
  .eq('id', user!.id);
```

There is no backend processing that actually generates and delivers the export. The user gets an alert saying "You will be notified when the export is ready" but that notification will never come.

**Fix:** Implement an Edge Function or backend process that:
1. Watches for `data_export_requested = true`
2. Gathers all user + child data from relevant tables
3. Generates a JSON/CSV download
4. Notifies the user with a download link

---

### FINDING 1B-07: Data deletion for children is a flag, not executed [P2 -- MAJOR]

**File:** `app/data-rights.tsx`, lines 195-231

The child data deletion and consent revocation features set `deletion_requested: true` on the `players` table. Like 1B-03, there is no backend process that actually deletes the data.

**Fix:** Same as 1B-03 -- implement a backend process.

---

### FINDING 1B-08: No content moderation system for UGC [P2 -- MAJOR]

**Evidence from code:**
- Chat system: `app/(tabs)/chats.tsx`, `app/chat/[id].tsx` -- users can send messages, photos, voice notes
- Team Wall: `components/TeamWall.tsx` -- users can post content, photos, and comments
- Permissions: `lib/permissions.ts` lines 134-136 -- `moderateChat` exists for coaches/admins but only supports message deletion

The app collects user-generated content (chat, photos, team wall posts) involving minors. There is:
- No automated content moderation or image scanning
- No abuse/inappropriate content reporting button visible to users
- No content moderation queue for admins
- No image review before photos are visible

Google Play's Families Policy and User-Generated Content policy require a UGC reporting mechanism and content moderation for apps involving children.

**Fix:**
1. Add a "Report" button on chat messages and team wall posts
2. Build an admin content moderation queue
3. Consider implementing image moderation for uploaded photos (Cloud Vision API or similar)

---

### FINDING 1B-09: Privacy Policy and Terms of Service are accessible from key locations [P4 -- INFORMATIONAL]

**Evidence:**
- Welcome screen: `app/(auth)/welcome.tsx`, lines 181-185
- Settings tab: `app/(tabs)/settings.tsx`, lines 372-379
- Me tab: `app/(tabs)/me.tsx`, lines 150-151

Both documents are accessible pre-signup and post-signup. Good.

**No action needed.**

---

### FINDING 1B-10: No Google Play content rating questionnaire preparation [P3 -- MINOR]

The app handles: minor children's data, medical information, team communications, payment tracking, and photos of minors. The content rating questionnaire needs to be answered carefully. In particular:
- The app does NOT contain violence, gambling, or sexual content
- The app DOES contain user-generated content (chat, photos)
- The app IS directed at children (or at least includes children)

**Fix:** Before submission, complete the IARC content rating questionnaire honestly. The app will likely be rated "Everyone" but must declare UGC.

---

## 1C. Security Audit

### FINDING 1C-01: `.env` file is committed to git with Supabase anon key [P1 -- CRITICAL]

**File:** `.env` (tracked in git)
**Git history:** 2 commits touching `.env` (hashes `4f32439`, `2d3f249`)
**.gitignore:** Only `.env*.local` is ignored (line 34), NOT `.env` itself

The Supabase anon key (`eyJhbGciOi...`) is committed to the repository. While the anon key is designed to be public (it is embedded in the client bundle anyway), committing `.env` to git is a bad practice because:
1. If a service role key is ever added to this file, it would be committed too
2. The file also contains `EXPO_PUBLIC_DEV_USER_EMAIL` and `EXPO_PUBLIC_DEV_USER_PASSWORD` fields -- if these are ever populated and committed, real credentials would leak
3. Git history is permanent -- even if removed now, the key remains in history

**Fix:**
1. Add `.env` to `.gitignore`
2. Run `git rm --cached .env` to untrack it
3. Provide a `.env.example` with placeholder values
4. Rotate the Supabase anon key if the repo is public or shared with untrusted parties

---

### FINDING 1C-02: No `supabase.auth.admin` calls found [P4 -- INFORMATIONAL]

No client-side code uses `supabase.auth.admin`. Good -- admin APIs should only be called from server-side functions.

**No action needed.**

---

### FINDING 1C-03: 110+ `.select('*')` queries across the codebase [P2 -- MAJOR]

**Counts:**
- `app/` directory: 48 occurrences across 26 files
- `lib/` directory: 46 occurrences across 16 files
- `components/` directory: 9 occurrences across 5 files
- `hooks/` directory: 7 occurrences across 4 files
- **Total: 110 occurrences across 51 files**

`.select('*')` fetches every column from the table. This has two concerns:
1. **Over-fetching:** Sends unnecessary data over the network (e.g., full medical notes when only a player name is needed)
2. **Data leakage potential:** If RLS policies have gaps, a `select('*')` could expose sensitive columns (medical info, internal flags, etc.) that a scoped select would not

This is not a blocking issue because Supabase RLS should be the primary access control, but it increases the blast radius of any RLS misconfiguration.

**Fix (not urgent for launch):** Prioritize scoping selects on sensitive tables first:
- `players` (contains medical_notes, allergies, medications, parent_email)
- `profiles` (contains push_token, emergency contacts, deletion flags)
- `payment_plans`, `payments` tables (financial data)

---

### FINDING 1C-04: Unguarded `console.log/warn/error` calls in production code [P3 -- MINOR]

**File:** `lib/supabase.js`, line 17 -- Logs Supabase URL and anon key prefix on EVERY app startup:
```js
if (__DEV__) {
  console.log('[SUPABASE_ENV]', {
    url: supabaseUrl,
    anonKeyPrefix: supabaseAnonKey?.slice(0, 8),
  });
}
```
This one IS gated by `__DEV__`. Safe.

**File:** `lib/auth.tsx` -- Multiple `console.warn` and `console.error` calls that are NOT gated by `__DEV__`:
- Line 169: `console.warn('[Auth] Profile query failed, retrying in 1s:', profError.message);`
- Line 180: `console.error('[Auth] Profile query failed after retry:', retryError?.message);`
- Line 208: `console.error('[Auth] Profile insert failed and re-fetch failed:', insertError.message);`
- Line 267: `console.error('Push token registration error:', pushErr);`
- Line 290: `console.error('Auth init error:', err);`

**File:** `lib/media-utils.ts` -- Lines 176, 188, 192, 207 contain `console.log` calls that run in production, logging upload details.

**File:** `lib/notifications.ts` -- Multiple `console.error` calls without `__DEV__` guards.

These won't cause crashes but will clutter device logs. In a production build, `console.error` calls can also be picked up by crash reporting tools and create noise.

**Fix:** Wrap all non-critical log statements with `if (__DEV__)` or remove them. For genuinely useful production errors, use a structured error reporting service (Sentry, Bugsnag).

---

### FINDING 1C-05: Chat access control relies on membership but admin sees all channels [P3 -- MINOR]

**File:** `app/(tabs)/chats.tsx`, lines 168-244

Admins (`isAdmin === true`) can see ALL channels in the season:
```ts
if (isAdmin) {
  const { data: allChannels } = await supabase
    .from('chat_channels')
    .select('...')
    .eq('season_id', workingSeason.id);
}
```

Non-admins only see channels they are a member of (via `channel_members` table). This is by design but should be documented. The main concern is whether RLS on `chat_messages` also enforces this -- if RLS is row-level on `channel_members` for reads, then the admin bypass above could fail silently if RLS doesn't account for admin role.

**Fix:** Verify that Supabase RLS policies on `chat_channels` and `chat_messages` allow admin reads. If RLS is purely membership-based, the admin query will return empty results in production despite the client code expecting data.

---

### FINDING 1C-06: Push tokens stored directly on profiles table [P3 -- MINOR]

**File:** `lib/notifications.ts`, lines 114-119
```ts
export async function savePushToken(userId: string, token: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);
}
```

The push token is stored as a plain column on the `profiles` table. If any query uses `.select('*')` on profiles (and it does -- `lib/auth.tsx` line 163), the push token could be read by client-side code. Push tokens are not secrets per se, but:
1. They could be used to send unsolicited notifications if leaked
2. The reference web admin uses a separate `push_tokens` table (per `reference/web-admin/.../push/index.ts`, line 67)

**Fix:** Consider migrating to the separate `push_tokens` table for consistency with the web admin, and scope profile selects to exclude `push_token`.

---

### FINDING 1C-07: Cross-family data isolation depends entirely on RLS [P2 -- MAJOR]

**Evidence from code review:**

The client-side code does NOT implement additional isolation checks. Examples:
- `app/child-detail.tsx`, line 198: `.select('*')` on `players` table, filtered only by player ID
- `app/my-kids.tsx`, lines 127-139: Queries `players` by `parent_account_id` or `parent_email`
- Team wall, chat, game results: all rely on team membership or RLS

If a parent somehow obtains another family's player ID (e.g., from a URL, shared link, or API inspection), the only thing preventing data access is Supabase RLS policies.

This is the correct architecture (RLS is the security boundary, not client-side checks), BUT it means the RLS policies MUST be comprehensive and tested. **No RLS audit has been performed as part of this code-level review.**

**Fix:** Conduct a dedicated RLS policy audit (separate from this code audit). Key tables to verify:
- `players` -- can a parent only read their own children?
- `player_guardians` -- properly scoped?
- `profiles` -- can users read other users' medical/emergency info?
- `chat_messages` -- scoped to channel membership?
- `team_wall_posts` -- scoped to team membership?
- Storage buckets (`media`, `chat-media`, `photos`) -- scoped policies?

---

### FINDING 1C-08: Multiple storage buckets used, unclear policy configuration [P2 -- MAJOR]

**Evidence from code:**
- `media` bucket: profile photos (`app/profile.tsx`, line 110), org banners (`app/org-settings.tsx`, line 117)
- `chat-media` bucket: chat photos/voice notes (`lib/media-utils.ts`, line 173)
- `photos` bucket: team banners (`components/team-hub/HeroBanner.tsx`, line 176)
- Child photos uploaded to unspecified bucket (`app/child-detail.tsx`, line 322)

All uploads use `getPublicUrl()`, meaning files are publicly accessible to anyone with the URL. For a youth sports app:
- Child photos should NOT be publicly accessible URLs
- Medical documents (if any) should be private
- Chat media (voice notes, photos shared in private channels) should not be world-readable

**Fix:**
1. Audit Supabase storage bucket policies
2. For sensitive content (child photos, chat media), use `createSignedUrl()` instead of `getPublicUrl()`
3. Configure storage RLS to restrict downloads to authorized users

---

### FINDING 1C-09: Session handling is properly configured [P4 -- INFORMATIONAL]

**File:** `lib/supabase.js`, lines 8-13
```js
auth: {
  storage: AsyncStorage,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
}
```

- `autoRefreshToken: true` -- tokens auto-refresh before expiry. Good.
- `persistSession: true` -- session persists across app restarts. Good.
- `detectSessionInUrl: false` -- appropriate for React Native (no URL-based session). Good.

**File:** `lib/auth.tsx`, lines 363-376: Sign-out clears all persisted context keys to prevent cross-user leakage. Good.

**No action needed.**

---

### FINDING 1C-10: OAuth tokens passed via URL hash fragment [P3 -- MINOR]

**File:** `lib/auth.tsx`, lines 329-358

The OAuth flow extracts access and refresh tokens from the URL hash:
```ts
const params = new URLSearchParams(url.hash.substring(1));
const accessToken = params.get('access_token');
const refreshToken = params.get('refresh_token');
```

This is standard Supabase OAuth flow for React Native and is not inherently insecure. However, URL fragments can appear in logs. The `WebBrowser.openAuthSessionAsync` does not persist history, so this is acceptable.

**No action needed.**

---

## Summary

### P0 -- BLOCKERS (4 findings, must fix before submission)

| ID | Finding | Effort |
|----|---------|--------|
| 1A-01 | Android package `com.anonymous.Lynx` | 5 min |
| 1A-02 | No `eas.json` | 15 min |
| 1A-03 | No EAS project ID / owner | 5 min (run `eas init`) |
| 1B-01 | No web-hosted Privacy Policy URL | 1-2 hrs |
| 1B-03 | Account deletion only flags, never executes | 4-8 hrs |

### P1 -- CRITICAL (3 findings)

| ID | Finding | Effort |
|----|---------|--------|
| 1A-05 | No `android.versionCode` | 5 min |
| 1B-04 | COPPA consent missing from signup flow | 4-8 hrs |
| 1C-01 | `.env` committed to git | 15 min |

### P2 -- MAJOR (7 findings)

| ID | Finding | Effort |
|----|---------|--------|
| 1A-04 | `expo-updates` not installed | 30 min |
| 1B-02 | No web-hosted Terms of Service URL | 1 hr |
| 1B-05 | COPPA consent method inadequate | 2-4 hrs |
| 1B-06 | Data export is a flag, not implemented | 4-8 hrs |
| 1B-07 | Data deletion for children not implemented | included in 1B-03 |
| 1B-08 | No UGC content moderation system | 8-16 hrs |
| 1C-03 | 110+ `.select('*')` queries | 4-8 hrs (incremental) |
| 1C-07 | Cross-family isolation untested (needs RLS audit) | 4-8 hrs |
| 1C-08 | Storage buckets publicly accessible | 4-8 hrs |

### P3 -- MINOR (6 findings)

| ID | Finding | Effort |
|----|---------|--------|
| 1A-06 | Duplicate Android permissions | 5 min |
| 1A-07 | Leftover React boilerplate assets | 5 min |
| 1A-08 | Splash icon too small | 15 min |
| 1A-10 | React Compiler experimental | monitor |
| 1B-10 | Content rating questionnaire prep | 30 min |
| 1C-04 | Unguarded console.log in production | 1-2 hrs |
| 1C-05 | Admin chat access vs RLS alignment | 1 hr |
| 1C-06 | Push tokens on profiles table | 2 hrs |
| 1C-10 | OAuth tokens in URL hash | no action |

### P4 -- NICE-TO-HAVE / INFORMATIONAL (5 findings)

| ID | Finding |
|----|---------|
| 1A-09 | Predictive back gesture disabled |
| 1A-11 | `__DEV__` usage is safe |
| 1A-12 | Dev skip auth is safe |
| 1A-13 | All icon/splash assets exist |
| 1B-09 | Privacy/Terms accessible from key screens |
| 1C-02 | No admin API calls in client |
| 1C-09 | Session handling is correct |

---

## Recommended Fix Order

1. **1A-01 + 1A-02 + 1A-03 + 1A-05** -- Build infrastructure (30 min total, unlocks all testing)
2. **1C-01** -- Remove `.env` from git tracking (15 min, prevents further exposure)
3. **1B-01** -- Host Privacy Policy on web (1-2 hrs, required for Play Store listing)
4. **1B-03 + 1B-07** -- Implement account/data deletion backend (4-8 hrs, hard Google Play requirement)
5. **1B-04 + 1B-05** -- COPPA consent in signup flow (4-8 hrs, legal requirement)
6. **1C-08** -- Audit and secure storage buckets (4-8 hrs, children's photos at risk)
7. **1C-07** -- RLS policy audit (4-8 hrs, data isolation)
8. **1B-08** -- UGC content moderation (8-16 hrs, Google Families Policy)
9. Everything else -- in severity order
