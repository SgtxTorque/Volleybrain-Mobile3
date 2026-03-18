# CC-LAUNCH-FIX-INVESTIGATION.md
# LYNX — Launch Fix Investigation Spec (READ-ONLY, NO CODE CHANGES)
# Classification: INVESTIGATION ONLY — Do NOT modify any files.

---

## EXECUTIVE DIRECTIVE

This is a **read-only investigation**. You will NOT modify, create, or delete any files. You will NOT run any installs, builds, or migrations. Your only job is to read the codebase, understand the current state of each issue, and produce a detailed surgical plan that a human will review before any execution begins.

**Output file:** `LAUNCH-FIX-INVESTIGATION-REPORT.md`

This report will contain, for each issue:
1. The exact file(s) and line number(s) involved
2. The current code (copy the relevant lines verbatim)
3. The proposed fix (exact code that would replace it)
4. Every other file that imports, calls, or depends on the changed code
5. What could break if the fix is done wrong
6. How to verify the fix works (what to test, what to look for)

---

## MANDATORY PRE-READ

Read these files completely before investigating anything:
- `CC-LYNX-RULES.md`
- `AGENTS.md`
- `LYNX-REFERENCE-GUIDE.md`
- `SCHEMA_REFERENCE.csv`
- `SUPABASE_SCHEMA.md`
- `app.json`
- `package.json`
- `.env`
- `.gitignore`

---

## RULES

1. **Do NOT modify any files.** This is investigation only.
2. **Do NOT run npm install, eas init, or any CLI commands.** Just read and plan.
3. **Copy exact code snippets** — no paraphrasing, no "something like this." Show the real lines.
4. **For every fix, list the blast radius** — what other files reference or depend on the thing being changed.
5. **If a fix has risk or ambiguity, say so.** Flag anything where you're not 100% sure.
6. **Organize the report exactly as the issues are listed below.** Do not reorder or skip.

---

## ISSUES TO INVESTIGATE

---

### ISSUE 1: Android package name is `com.anonymous.Lynx`

**Source:** AUDIT-REPORT-01, Finding 1A-01 (P0 BLOCKER)
**File to read:** `app.json`

**Investigate:**
- Find the exact line with `"package": "com.anonymous.Lynx"`
- Check if the package name appears anywhere else in the codebase (grep for `com.anonymous`)
- Check if any deep link config, notification config, or OAuth callback references the package name
- Proposed replacement: `com.thelynxapp.lynx`
- Document: Is there anything in the codebase that would need to change alongside the package name?

---

### ISSUE 2: No `eas.json` exists

**Source:** AUDIT-REPORT-01, Finding 1A-02 (P0 BLOCKER)

**Investigate:**
- Confirm `eas.json` does not exist at the project root
- Check if there's an `app.config.js` or `app.config.ts` that might contain EAS config
- Check `app.json` for any `extra.eas` or `owner` fields
- Draft the exact `eas.json` content that should be created, including:
  - `development` profile (with `developmentClient: true`, `distribution: "internal"`)
  - `preview` profile (for internal testing builds, `distribution: "internal"`)
  - `production` profile (with `autoIncrement: true`)
- Document: What environment variables need to be configured in EAS Secrets for production?

---

### ISSUE 3: No EAS project ID or owner in app.json

**Source:** AUDIT-REPORT-01, Finding 1A-03 (P0 BLOCKER)
**File to read:** `app.json`

**Investigate:**
- Confirm `extra.eas.projectId` is absent from `app.json`
- Confirm `owner` field is absent
- Check `lib/notifications.ts` — find the exact line where `projectId` is read (should be around line 84). Copy it. Show what happens when `projectId` is undefined.
- Document: This requires running `eas init` interactively (Carlos will do this). The investigation should document exactly what fields will be added to `app.json` after `eas init` runs.

---

### ISSUE 4: `.env` committed to git

**Source:** AUDIT-REPORT-09, Finding INFRA-19 (P0 BLOCKER)
**Files to read:** `.env`, `.gitignore`

**Investigate:**
- Read `.gitignore` — confirm `.env` is NOT listed (only `.env*.local` is)
- Read `.env` — list every variable and assess which are truly secret vs. public
- Check if any file reads from env vars that are NOT prefixed with `EXPO_PUBLIC_` (those would not be bundled in client)
- Check if `EXPO_PUBLIC_DEV_USER_EMAIL` or `EXPO_PUBLIC_DEV_USER_PASSWORD` have values set
- Draft the exact `.gitignore` additions needed
- Draft the exact `.env.example` file content (with placeholder values)
- Document: The `EXPO_PUBLIC_SUPABASE_ANON_KEY` is a public key by design. The real risk is the pattern of committing `.env`, not the specific key value. Note whether key rotation is recommended.

---

### ISSUE 5: No `android.versionCode` set

**Source:** AUDIT-REPORT-01, Finding 1A-05 (P1 CRITICAL)
**File to read:** `app.json`

**Investigate:**
- Find the `android` section in `app.json`
- Confirm `versionCode` is absent
- Document the exact line where `"versionCode": 1` should be added
- Check if the proposed `eas.json` (from Issue 2) has `autoIncrement: true` which handles subsequent builds

---

### ISSUE 6: Duplicate Android permissions

**Source:** AUDIT-REPORT-01, Finding 1A-06 (P3)
**File to read:** `app.json`

**Investigate:**
- Find the permissions array
- List all entries with line numbers
- Identify the exact duplicates to remove
- Document the cleaned permissions array

---

### ISSUE 7: Missing `/team-hub` route (player tap crashes)

**Source:** AUDIT-REPORT-05, Finding NAV-01 (P0 BLOCKER)
**Files to read:**
- `components/player-scroll/PlayerTeamHubCard.tsx` (find the `router.push` call)
- `app/(tabs)/connect.tsx` (this is where the player's team hub content lives)
- `app/(tabs)/coach-team-hub.tsx` (coach's team hub)
- `app/(tabs)/parent-team-hub.tsx` (parent's team hub)

**Investigate:**
- Find the exact line in `PlayerTeamHubCard.tsx` that pushes to `/team-hub`
- Understand what params it passes (teamId?)
- Understand what `connect.tsx` expects — does it accept a teamId param?
- Decide: Should we (a) create `app/team-hub.tsx` as a redirect to `/(tabs)/connect`, or (b) change the push in PlayerTeamHubCard to go directly to `/(tabs)/connect`?
- For whichever approach: write the exact code
- Check if any other file in the codebase references `/team-hub` (grep for `team-hub`)
- Document: What does the player see when they tap "Team Hub" today vs. after the fix?

---

### ISSUE 8: `.single()` crash on PlayerCardExpanded (3 callsites)

**Source:** AUDIT-REPORT-07, Finding 7A-02 (P0 BLOCKER)
**File to read:** `components/PlayerCardExpanded.tsx`

**Investigate:**
- Find lines 132, 143, and 158 (or nearby — line numbers may have shifted)
- Copy the exact query code for each of the three `.single()` calls
- For each one: What table is it querying? What filter? What happens if zero rows exist?
- For each one: Show the exact replacement code (`.maybeSingle()` + null guard)
- Check: Is there any code AFTER each query that assumes `data` is non-null? If so, what needs a null check?
- Document: What does a new player with no stats/skills/ratings see before vs. after the fix?

---

### ISSUE 9: `.single()` crashes across codebase (priority callsites)

**Source:** AUDIT-REPORT-07, Finding 7A-01 (P0 BLOCKER)
**Files to read:** (each of these specific locations)

**For each callsite below, provide:**
- Exact current code (copy the lines)
- What happens when zero rows are returned
- Whether there's a try/catch around it
- The exact replacement code
- What else in the file depends on the result

**Priority callsites to investigate:**

1. `lib/permissions.ts` — line ~20 (profile lookup, P1 CRITICAL — crashes all role detection for new users)
2. `lib/profile-completeness.ts` — lines ~83, ~103 (called from home screen hooks)
3. `lib/registration-config.ts` — line ~125 and ~148
4. `lib/challenge-service.ts` — line ~458 (inline .single() on profiles for winnerId)
5. `app/(tabs)/connect.tsx` — line ~93 (inline destructured .single())
6. `app/chat/[id].tsx` — lines ~413, ~619, ~730 (insert + .single() without error guard)
7. `app/(tabs)/admin-teams.tsx` — line ~297 (insert + .single())
8. `lib/chat-utils.ts` — line ~45 (getProfileByEmail, crashes on duplicate/missing email)
9. `lib/chat-utils.ts` — line ~389 (createLeagueAnnouncementChannel existence check)

**Also:** Run a global search for `.single()` across the codebase (excluding `_archive/`, `reference/`, `node_modules/`). Report the total count and flag any additional callsites that have NO error handling and are in code paths reachable by normal user actions.

---

### ISSUE 10: Push token writes to non-existent column

**Source:** AUDIT-REPORT-04, Finding 4A-01 (P1 CRITICAL)
**Files to read:**
- `lib/notifications.ts` (find `savePushToken` function, around line 114-119)
- `SCHEMA_REFERENCE.csv` (search for `push_tokens` table and `profiles` table)

**Investigate:**
- Copy the exact current `savePushToken` function code
- Verify that `profiles` table does NOT have a `push_token` column (check schema)
- Verify that `push_tokens` table EXISTS and document its columns
- Write the exact replacement function using upsert to `push_tokens`
- Find every place `savePushToken` is called (grep for `savePushToken`)
- Check: Does the `push_tokens` table have a unique constraint on `user_id`? On `token`? This matters for the upsert conflict target.
- Document: What is the current behavior (silently fails?) vs. after fix (tokens actually stored)?

---

### ISSUE 11: COPPA consent not collected at signup

**Source:** AUDIT-REPORT-01, Finding 1B-04 (P1 CRITICAL)
**Files to read:**
- `app/(auth)/signup.tsx` (the full signup flow)
- `components/CoppaConsentModal.tsx` (the existing COPPA modal)
- `lib/auth.tsx` (where profile creation happens)

**Investigate:**
- Read the signup flow step by step. At what point is child data first collected?
- Read CoppaConsentModal — when does it trigger? Only for existing parents? What's the condition?
- Is there a `coppa_consent_given` column on the `profiles` table? (Check schema)
- Document: Where in the signup flow should COPPA consent be added? Before role selection? After selecting "parent"? At first child-add?
- What is the minimum viable approach? (Show the consent step, set `coppa_consent_given: true` on profile, block child data collection until consent is given)
- What files would need to change?
- Document the exact insertion point in the signup flow

---

### ISSUE 12: Account deletion only flags, never executes

**Source:** AUDIT-REPORT-01, Finding 1B-03 (P0 BLOCKER)
**Files to read:**
- `app/profile.tsx` (find `handleDeleteAccount`, around line 213-248)
- `SCHEMA_REFERENCE.csv` (check for `deletion_requested` column on profiles)

**Investigate:**
- Copy the exact `handleDeleteAccount` function
- Confirm it only sets `deletion_requested: true` and signs the user out
- Check: Is there ANY backend process (Edge Function, pg_cron, trigger) that processes deletion requests? Search for `deletion_requested` across the entire codebase.
- List every table that contains user data that would need to be deleted or anonymized:
  - `profiles`
  - `players` (linked via `parent_account_id`)
  - `player_guardians`
  - `registrations`
  - `waiver_signatures`
  - `chat_messages` (authored by this user)
  - `push_tokens`
  - `user_roles`
  - `team_staff`
  - Any others found in schema
- Document: This likely requires a Supabase Edge Function or database function. Outline what it should do. This is the most complex fix — it needs Carlos's review on what data to hard-delete vs. anonymize vs. retain.
- Document: Google's requirement — data must be deleted within a "reasonable period" (generally interpreted as 30-60 days). A flagging + scheduled job approach is acceptable IF the job actually runs.

---

### ISSUE 13: Console statements ungated in production (~60)

**Source:** AUDIT-REPORT-09, Finding INFRA-11 (P1 CRITICAL)

**Investigate:**
- Run a grep for `console.log`, `console.error`, `console.warn` across `lib/`, `app/`, `components/`, `hooks/` (excluding `_archive/`, `reference/`, `node_modules/`)
- For each hit: Is it wrapped in `if (__DEV__)`? If yes, it's fine. If no, flag it.
- Group the ungated ones by file
- For each file, show the count and list the line numbers
- Special attention to:
  - `lib/media-utils.ts` (logs URIs and blob sizes)
  - `lib/auth.tsx` (logs email addresses)
  - `lib/notifications.ts` (11 ungated calls)
- Propose: Wrap each in `if (__DEV__)` or create a shared `logger.ts` utility that no-ops in production?
- Document: Which approach is simpler and less risky for the number of files involved?

---

### ISSUE 14: `expo-updates` not installed

**Source:** AUDIT-REPORT-01, Finding 1A-04 (P1 CRITICAL)

**Investigate:**
- Confirm `expo-updates` is NOT in `package.json` dependencies
- Check `app.json` for any existing `updates` configuration
- Document: What needs to happen:
  1. `npx expo install expo-updates`
  2. Add `updates` config to `app.json`
  3. This requires the EAS project ID (Issue 3) to be set first
- Document the exact `app.json` additions needed for the `updates` section
- Note: This is an install + config task that Carlos will do after `eas init`. The investigation just documents what the config should look like.

---

## REPORT FORMAT

For each issue above, structure the investigation as:

```
## ISSUE [N]: [Title]

### Current State
[Exact file, line numbers, and code as it exists today]

### Blast Radius
[Every file that imports/calls/depends on the changed code]

### Proposed Fix
[Exact replacement code — copy-paste ready]

### Risk Assessment
[What could go wrong. What else could break. Any ambiguity.]

### Verification
[How to test that the fix works. What to look for in the app.]

### Dependencies
[Does this fix depend on another fix being done first?]
```

---

## COMMIT PROTOCOL

**Do NOT commit anything.** This is a read-only investigation.
Write the entire report to `LAUNCH-FIX-INVESTIGATION-REPORT.md` and commit only that file.
Commit message: `investigation: Launch fix surgical plan for review`
