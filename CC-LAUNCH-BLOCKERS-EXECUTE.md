# CC-LAUNCH-BLOCKERS-EXECUTE.md
# LYNX — Launch Blocker Fixes (EXECUTION SPEC)
# Classification: EXECUTE — Follow exactly. No improvisation.

---

## EXECUTIVE DIRECTIVE

This spec contains **exact, reviewed, approved code changes** for 12 launch-blocking issues. Every change has been investigated, blast-radius checked, and approved by the product owner.

**You will change ONLY the files and lines listed below. Nothing else.**

---

## MANDATORY PRE-READ

Before touching any code, read:
- `CC-LYNX-RULES.md`
- `AGENTS.md`
- `LAUNCH-FIX-INVESTIGATION-REPORT.md`

---

## RULES

1. **Change ONLY the files explicitly listed in each task.** If a file is not listed, do not open it for editing.
2. **Do NOT refactor, rename, reorganize, or "improve" anything** beyond the exact changes specified.
3. **Do NOT add new dependencies** (no `npm install`). Issue 14 (expo-updates) is handled manually by Carlos.
4. **Do NOT create new components, screens, or hooks** unless explicitly specified.
5. **Do NOT touch any file in `_archive/`, `reference/`, or `node_modules/`.**
6. **Do NOT modify any Supabase queries** beyond the specific `.single()` → `.maybeSingle()` swaps listed.
7. **Commit after EACH task** with the exact commit message specified. This lets us catch problems one at a time.
8. **If anything is unclear or ambiguous, STOP and ask.** Do not guess.
9. **After all tasks, run a final verification** as described in the FINAL VERIFICATION section.

---

## TASK 1: Fix app.json — Package name, versionCode, permissions
**Commit message:** `fix: app.json — package name, versionCode, dedupe permissions`

### File: `app.json`

**Change 1a:** Find the line:
```json
"package": "com.anonymous.Lynx"
```
Replace with:
```json
"package": "com.thelynxapp.lynx"
```

**Change 1b:** In the `android` object, add `"versionCode": 1` immediately after `"predictiveBackGestureEnabled": false,`:
```json
"predictiveBackGestureEnabled": false,
"versionCode": 1,
"permissions": [
```

**Change 1c:** Replace the entire permissions array with the deduplicated version:
```json
"permissions": [
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS",
  "android.permission.READ_CALENDAR",
  "android.permission.WRITE_CALENDAR"
]
```
(Remove the 4 duplicate entries that currently exist.)

### DO NOT TOUCH:
- Any other field in `app.json`
- The `ios` section
- The `plugins` array
- The `experiments` section

### Commit this task before moving to Task 2.

---

## TASK 2: Create eas.json
**Commit message:** `fix: create eas.json with build profiles`

### Create new file: `eas.json` at project root

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

### DO NOT TOUCH:
- Any existing file. This is a new file only.

### Commit this task before moving to Task 3.

---

## TASK 3: Fix .env exposure
**Commit message:** `fix: remove .env from git tracking, add .env.example`

### File: `.gitignore`

Find the section that says:
```
# local env files
.env*.local
```

Replace with:
```
# local env files
.env
.env*.local
```

### Create new file: `.env.example`

```
# Supabase public client config (safe for client-side bundling)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Dev-only: auto-login (never works in production builds)
EXPO_PUBLIC_DEV_SKIP_AUTH=false
EXPO_PUBLIC_DEV_USER_EMAIL=
EXPO_PUBLIC_DEV_USER_PASSWORD=
```

### Then run:
```bash
git rm --cached .env
```

This removes `.env` from git tracking without deleting the local file.

### DO NOT TOUCH:
- The `.env` file itself (do not modify its contents)
- Any other entry in `.gitignore`

### Commit this task before moving to Task 4.

---

## TASK 4: Fix /team-hub missing route
**Commit message:** `fix: player team hub navigates to correct route`

### File: `components/player-scroll/PlayerTeamHubCard.tsx`

Find the line (around line 64):
```typescript
onPress={() => router.push(`/team-hub?teamId=${teamId}` as any)}
```

Replace with:
```typescript
onPress={() => router.push('/(tabs)/connect' as any)}
```

### DO NOT TOUCH:
- Any other file
- Any other line in PlayerTeamHubCard.tsx
- Do NOT create an `app/team-hub.tsx` file

### Commit this task before moving to Task 5.

---

## TASK 5: Fix PlayerCardExpanded .single() crashes
**Commit message:** `fix: PlayerCardExpanded .single() → .maybeSingle() for stats/skills/ratings`

### File: `components/PlayerCardExpanded.tsx`

**Change 5a:** Find the `player_stats` query (around line 128-132). Change `.single()` to `.maybeSingle()`:
```typescript
const { data: statsData } = await supabase
  .from('player_stats')
  .select('*')
  .eq('player_id', player.id)
  .maybeSingle();
```

**Change 5b:** Find the `player_skills` query (around line 139-143). Change `.single()` to `.maybeSingle()`:
```typescript
const { data: skillsData } = await supabase
  .from('player_skills')
  .select('*')
  .eq('player_id', player.id)
  .maybeSingle();
```

**Change 5c:** Find the `player_skill_ratings` query (around line 152-158). Change `.single()` to `.maybeSingle()`:
```typescript
const { data: evalData } = await supabase
  .from('player_skill_ratings')
  .select('serving_rating, passing_rating, setting_rating, attacking_rating, blocking_rating, defense_rating, hustle_rating, coachability_rating, teamwork_rating, overall_rating')
  .eq('player_id', player.id)
  .order('rated_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

### DO NOT TOUCH:
- The badge query (line ~167) — it correctly uses `.select()` without `.single()`
- Any null-check logic after the queries — it already handles null correctly
- Any other file

### Commit this task before moving to Task 6.

---

## TASK 6: Fix .single() crashes — CRITICAL and HIGH priority callsites
**Commit message:** `fix: .single() → .maybeSingle() for 7 critical/high callsites`

This task changes exactly 7 callsites across 5 files. For each one, change ONLY `.single()` to `.maybeSingle()` — do not modify anything else on the line or in the surrounding code.

### File 1: `lib/permissions.ts` (line ~20)
Find:
```typescript
.single();
```
(in the profile query with `.eq('id', userId)`)

Replace with:
```typescript
.maybeSingle();
```

### File 2: `lib/profile-completeness.ts` (2 callsites, lines ~83 and ~103)
Find both `.single()` calls (player lookup and season lookup) and replace each with `.maybeSingle()`.

### File 3: `lib/chat-utils.ts` (2 callsites, lines ~45 and ~389)

**Callsite 3a** — `getProfileByEmail` function (line ~45):
Find the `.single()` in the profiles query filtered by email. Replace with `.maybeSingle()`.

**Callsite 3b** — `createLeagueAnnouncementChannel` function (line ~389):
Find the `.single()` in the chat_channels existence check. Replace with `.maybeSingle()`.

### File 4: `lib/challenge-service.ts` (line ~458)
Find:
```typescript
? (await supabase.from('profiles').select('full_name').eq('id', winnerId).single()).data
```
Replace with:
```typescript
? (await supabase.from('profiles').select('full_name').eq('id', winnerId).maybeSingle()).data
```

### File 5: `app/chat/[id].tsx` (line ~520)
Find the `message_reactions` query that checks for existing reaction:
```typescript
.single();
```
(in the query with `.eq('message_id', messageId).eq('user_id', profile.id).eq('reaction_type', reactionType)`)

Replace with:
```typescript
.maybeSingle();
```

### DO NOT TOUCH:
- Any INSERT + `.select().single()` patterns (lines ~413, ~619, ~730 in chat/[id].tsx) — these are safe
- Any `.single()` calls that are already inside try/catch blocks with proper error handling
- Any other `.single()` calls in the codebase — the MEDIUM priority callsites are a separate future task
- The `app/(tabs)/admin-teams.tsx` callsite — it has error guards and is safe
- The `app/(tabs)/connect.tsx:93` callsite — it's inside try/catch and is safe for now

### Commit this task before moving to Task 7.

---

## TASK 7: Fix push token storage
**Commit message:** `fix: savePushToken writes to push_tokens table instead of non-existent profiles column`

### File: `lib/notifications.ts`

Find the `savePushToken` function (around lines 114-120):
```typescript
export async function savePushToken(userId: string, token: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);
  if (error) console.error('Error saving push token:', error);
}
```

Replace the entire function body with:
```typescript
export async function savePushToken(userId: string, token: string) {
  // Clear old tokens for this user, then insert fresh
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
  if (__DEV__ && error) console.error('Error saving push token:', error);
}
```

**Note:** `Platform` is already imported at the top of this file (line 6). The console.error is now gated behind `__DEV__` (also addresses Issue 13 for this line).

### DO NOT TOUCH:
- The function signature (keep `export async function savePushToken(userId: string, token: string)`)
- The caller in `lib/auth.tsx` — it already calls `savePushToken(session.user.id, token)` which is compatible
- Any other function in `notifications.ts`

### Commit this task before moving to Task 8.

---

## TASK 8: Add COPPA consent to parent signup
**Commit message:** `fix: add COPPA consent step for parents during signup`

### File: `app/(auth)/signup.tsx`

This task adds a COPPA consent checkbox that appears when the user selects "parent" as their role in Step 2.

**Step 8a:** Add a state variable near the other state declarations (around the top of the component, near `const [selectedRole, setSelectedRole] = useState<SelectedRole>(null);`):

Add this line after the selectedRole state:
```typescript
const [coppaConsent, setCoppaConsent] = useState(false);
```

**Step 8b:** In Step 2 (the role selection step), AFTER the role cards and BEFORE the "Continue" / "Next" button, add the COPPA consent UI. Find the area where the role cards end and the navigation buttons begin. Add this block, conditionally rendered when `selectedRole === 'parent'`:

```typescript
{selectedRole === 'parent' && (
  <View style={{ marginTop: 16, padding: 16, backgroundColor: colors?.card || '#F6F8FB', borderRadius: 14 }}>
    <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 14, color: colors?.text || BRAND.navy, marginBottom: 8 }}>
      Parent/Guardian Consent
    </Text>
    <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: colors?.textSecondary || BRAND.textMuted, marginBottom: 12, lineHeight: 18 }}>
      Lynx collects information about minor children (names, dates of birth, photos, sports performance data) to provide youth sports management services. By checking this box, you consent to the collection and use of your child's information as described in our Privacy Policy.
    </Text>
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center' }}
      onPress={() => setCoppaConsent(!coppaConsent)}
    >
      <Ionicons
        name={coppaConsent ? 'checkbox' : 'square-outline'}
        size={24}
        color={coppaConsent ? BRAND.sky || '#4BB9EC' : BRAND.textMuted}
      />
      <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: colors?.text || BRAND.navy, marginLeft: 8, flex: 1 }}>
        I am the parent or legal guardian and I consent to the collection of my child's information.
      </Text>
    </TouchableOpacity>
  </View>
)}
```

**Step 8c:** Find the "Continue" or "Next" button for Step 2 that advances to Step 3. Add `coppaConsent` to its disabled condition. The button should be disabled when `selectedRole === 'parent' && !coppaConsent`. Find the existing disabled logic and extend it:

If the current disabled condition is something like:
```typescript
disabled={!selectedRole}
```
Change to:
```typescript
disabled={!selectedRole || (selectedRole === 'parent' && !coppaConsent)}
```

**Step 8d:** After account creation succeeds, set the COPPA fields on the profile. Find where the profile is updated after signup (the investigation report noted lines ~255-258 in signup.tsx where a post-creation profile update happens). Add the COPPA fields to that update:

If the existing update looks like:
```typescript
await supabase.from('profiles').update({ ... }).eq('id', userId);
```
Add to the update object:
```typescript
coppa_consent_given: selectedRole === 'parent' ? true : null,
coppa_consent_date: selectedRole === 'parent' ? new Date().toISOString() : null,
```

**Step 8e:** Reset `coppaConsent` when role changes. Find where `setSelectedRole` is called (in the role card onPress handlers). After `setSelectedRole(role)`, add:
```typescript
setCoppaConsent(false);
```

### DO NOT TOUCH:
- The CoppaConsentModal component — it stays as a safety net for legacy parents
- The signup flow for non-parent roles — they should see no difference
- The Step 1 (name/email/password) or Step 3 (org code) UI
- Any other file

### Commit this task before moving to Task 9.

---

## TASK 9: Update account deletion confirmation message
**Commit message:** `fix: update account deletion message to set user expectations on timeline`

### File: `app/profile.tsx`

Find the Alert.alert in `handleDeleteAccount` (around line 220-221):
```typescript
'This action is irreversible. Your account will be flagged for deletion.',
```

Replace with:
```typescript
'Your account and all associated data will be permanently deleted within 30 days. This action cannot be undone.',
```

Also find the success alert (around line 236-237):
```typescript
'Your account has been flagged for deletion. You will be signed out.',
```

Replace with:
```typescript
'Your account deletion has been scheduled. Your data will be permanently removed within 30 days. You will now be signed out.',
```

### DO NOT TOUCH:
- The `handleDeleteAccount` function logic (the `deletion_requested: true` flag)
- Any other part of profile.tsx
- The actual deletion backend — that's a separate future spec

### Commit this task before moving to Task 10.

---

## TASK 10: Gate ungated console statements
**Commit message:** `fix: gate ~61 ungated console statements behind __DEV__`

For EACH file listed below, find every `console.log(`, `console.error(`, and `console.warn(` that is NOT already wrapped in `if (__DEV__)`. Wrap each one:

```typescript
// BEFORE:
console.error('Error message:', error);

// AFTER:
if (__DEV__) console.error('Error message:', error);
```

### Files to process (and approximate ungated count):

1. `lib/notifications.ts` (~10 console.error)
2. `lib/media-utils.ts` (~4 console.log + ~5 console.error)
3. `lib/auth.tsx` (~4 console.error + ~1 console.warn) — NOTE: the one on the `savePushToken` line was already fixed in Task 7
4. `lib/quest-engine.ts` (~6 console.error)
5. `lib/chat-utils.ts` (~3 console.error)
6. `lib/team-context.tsx` (~2 console.error)
7. `lib/streak-engine.ts` (~2 console.error)
8. `lib/sport.tsx` (~1 console.error)
9. `hooks/useJourneyPath.ts` (~1 console.error)
10. `hooks/useQuestEngine.ts` (~1 console.error)
11. `hooks/useSkillModule.ts` (~1 console.error)
12. `hooks/useWeeklyQuestEngine.ts` (~1 console.error)
13. `hooks/useStreakEngine.ts` (~1 console.error)

### RULES for this task:
- ONLY add `if (__DEV__)` before the console call
- Do NOT modify the console call itself
- Do NOT remove any console calls
- Do NOT change any surrounding logic
- If a console call is ALREADY wrapped in `if (__DEV__)`, leave it alone
- Do NOT touch `components/TapDebugger.tsx` — that's a separate cleanup task

### DO NOT TOUCH:
- Any console calls that are already gated
- Any file not listed above
- Any logic beyond adding the `if (__DEV__)` guard

### Commit this task before moving to Final Verification.

---

## TASK 11: Delete boilerplate assets
**Commit message:** `chore: remove React/Expo boilerplate assets`

Delete these files:
- `assets/images/react-logo.png`
- `assets/images/react-logo@2x.png`
- `assets/images/react-logo@3x.png`
- `assets/images/partial-react-logo.png`

**Before deleting:** Grep for `react-logo` and `partial-react-logo` across `app/`, `components/`, and `lib/` to confirm no source file imports them. If any source file DOES import them, do NOT delete that specific image and note it in the commit message.

### DO NOT TOUCH:
- Any other asset file
- Any Lynx-branded images

### Commit this task.

---

## FINAL VERIFICATION

After all tasks are committed, run these checks:

1. **Grep check:** `grep -rn "com.anonymous" app.json` — should return 0 results
2. **Grep check:** `grep -rn "\.single()" lib/permissions.ts` — should return 0 results
3. **Grep check:** `grep -rn "\.single()" components/PlayerCardExpanded.tsx` — should return 0 (for the 3 fixed queries; badge query doesn't use .single())
4. **Grep check:** `grep -rn "profiles.*push_token\|push_token.*profiles" lib/notifications.ts` — should return 0 results
5. **Grep check:** `grep -rn "com.anonymous" .` — should only appear in markdown audit files, not in any source file
6. **File check:** `ls eas.json` — should exist
7. **File check:** `ls .env.example` — should exist
8. **File check:** `cat .gitignore | grep "^\.env$"` — should show `.env`
9. **Git check:** `git ls-files .env` — should return empty (no longer tracked)
10. **Count check:** Count remaining ungated console statements: `grep -rn "console\.\(log\|error\|warn\)" lib/ hooks/ --include="*.ts" --include="*.tsx" | grep -v "__DEV__" | grep -v "node_modules" | grep -v "_archive" | wc -l` — should be 0 or very close to 0

Write the verification results to `LAUNCH-FIX-VERIFICATION.md` and commit with message: `verify: launch blocker fixes verification complete`

---

## TOTAL CHANGES SUMMARY

| Task | Files Changed | Type |
|------|--------------|------|
| 1 | `app.json` | Config fix |
| 2 | `eas.json` (new) | Config add |
| 3 | `.gitignore`, `.env.example` (new) | Security fix |
| 4 | `components/player-scroll/PlayerTeamHubCard.tsx` | Nav fix |
| 5 | `components/PlayerCardExpanded.tsx` | Crash fix |
| 6 | 5 files (permissions, profile-completeness, chat-utils, challenge-service, chat/[id]) | Crash fix |
| 7 | `lib/notifications.ts` | Data fix |
| 8 | `app/(auth)/signup.tsx` | Legal compliance |
| 9 | `app/profile.tsx` | UX copy |
| 10 | 13 files in lib/ and hooks/ | Production hygiene |
| 11 | 4 asset files deleted | Cleanup |

**Total files modified:** ~22
**Total files created:** 2 (eas.json, .env.example)
**Total files deleted:** 4 (boilerplate images) + .env from tracking
**New components:** 0
**New screens:** 0
**New dependencies:** 0
