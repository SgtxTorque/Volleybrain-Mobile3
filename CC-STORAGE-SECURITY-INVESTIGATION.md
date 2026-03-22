# CC-STORAGE-SECURITY-INVESTIGATION.md
# LYNX — Storage Bucket Security Audit (INVESTIGATION ONLY)
# Classification: INVESTIGATION ONLY — Do NOT modify any files.

---

## EXECUTIVE DIRECTIVE

The launch audit (AUDIT-REPORT-01, Finding 1C-08) identified that all media uploads use `getPublicUrl()`, meaning files are publicly accessible to anyone with the URL. For a youth sports app handling photos of minors, this is a significant privacy and safety concern.

**Your job is to read every file that touches Supabase Storage, map every upload and download path, and produce a security plan.**

**You will NOT modify any files.**

**Output file:** `STORAGE-SECURITY-INVESTIGATION-REPORT.md`

---

## MANDATORY PRE-READ

- `CC-LYNX-RULES.md`
- `AGENTS.md`
- `SCHEMA_REFERENCE.csv`
- `lib/media-utils.ts` (the main media utility file)
- `lib/supabase.js` (client config)

---

## RULES

1. **Do NOT modify any files.** Investigation only.
2. **Copy exact code snippets** with file paths and line numbers.
3. **Be thorough** — miss nothing. Every `getPublicUrl`, `upload`, `createSignedUrl`, `from('bucket')` call matters.

---

## INVESTIGATION TASKS

### Task 1: Map every storage bucket used in the codebase

Search the entire active codebase (exclude `_archive/`, `reference/`, `node_modules/`) for:

```
grep -rn "\.storage\.\|getPublicUrl\|createSignedUrl\|from('media')\|from('photos')\|from('chat-media')\|from('avatars')\|from('badges')\|bucket" lib/ app/ components/ hooks/ --include="*.ts" --include="*.tsx"
```

For each bucket found, document:

| Bucket Name | What's Stored | Who Uploads | Who Downloads | Sensitivity |
|-------------|---------------|-------------|---------------|-------------|

Sensitivity levels:
- **HIGH** — Photos of minors, medical documents, anything identifying a child
- **MEDIUM** — Team photos, org banners, coach profiles
- **LOW** — App assets, badges, generic media

### Task 2: Map every upload path

For every file that uploads to Supabase Storage, document:

```
### [File path] — line [N]

**Bucket:** [name]
**What's uploaded:** [description — profile photo, child photo, team banner, chat image, voice note, etc.]
**Who can trigger this upload:** [which role — admin, coach, parent, player, any authenticated user]
**Upload path/key pattern:** [e.g., `profile-photos/${userId}_${timestamp}.jpg`]
**Current access method after upload:** [getPublicUrl / createSignedUrl / stored URL in DB]
```

### Task 3: Map every download/display path

For every file that reads from Supabase Storage URLs (displaying images, playing audio, etc.), document:

```
### [File path] — line [N]

**How the URL is obtained:** [getPublicUrl() call / URL stored in database column / hardcoded]
**What's displayed:** [avatar, child photo, team banner, chat attachment, etc.]
**Who can see it:** [any user in the org / team members only / the uploader only / anyone with URL]
```

### Task 4: Identify what MUST be private

For each bucket/upload path, classify:

**MUST BE PRIVATE (signed URLs required):**
- Child photos (any photo of a minor)
- Medical documents (if any)
- Chat media in private channels (voice notes, photos shared between specific users)
- Family gallery photos

**CAN REMAIN PUBLIC:**
- Org logos and banners (promotional, meant to be visible)
- App assets and badges
- Team banners/logos (generally public info)
- Coach profile photos (public-facing)

**AMBIGUOUS (needs Carlos's decision):**
- Parent profile photos
- Team wall photos (shared within team but contains children)
- Game day photos

### Task 5: Audit current Supabase RLS on storage

Check if there are any storage policies defined in the codebase:
```
grep -rn "storage\|bucket\|policy" supabase/ migrations/ --include="*.sql"
```

Also check `supabase/` directory for any storage policy migrations or configurations.

Document what policies exist (if any) and what's missing.

### Task 6: Proposed fix plan

For each bucket that needs to change from public to private:

1. **What Supabase dashboard change is needed** (bucket privacy setting, RLS policies)
2. **What code changes are needed** (replace `getPublicUrl()` with `createSignedUrl()`)
3. **What files are affected** (list every file that would need to change)
4. **What the signed URL pattern should look like** (expiry time, who can generate it)
5. **Migration strategy** (what happens to existing public URLs stored in database columns like `avatar_url`, `banner_url`, `photo_url`)

### Task 7: Risk assessment

Document:
- What happens if we make a bucket private but don't update all the code that reads public URLs? (Images break)
- What's the migration path for URLs already stored in database records?
- Are there any URLs shared externally (e.g., in push notifications, emails) that would break?
- What's the performance impact of signed URLs vs public URLs? (Signed URLs require an API call to generate)

---

## REPORT FORMAT

Structure the report as:

1. **Bucket Inventory** (table of all buckets with sensitivity)
2. **Upload Path Map** (every upload, who does it, where it goes)
3. **Download/Display Map** (every place URLs are consumed)
4. **Privacy Classification** (what must be private vs. can stay public)
5. **Current Storage Policies** (what exists in Supabase)
6. **Proposed Fix Plan** (exact changes per bucket)
7. **Risk Assessment** (what could break, migration concerns)
8. **Execution Priority** (what to fix first based on sensitivity)

---

## COMMIT PROTOCOL

Write the report to `STORAGE-SECURITY-INVESTIGATION-REPORT.md` and commit with message: `investigation: storage bucket security audit`

Do NOT modify any other file.
