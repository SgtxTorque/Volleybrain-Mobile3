# STORAGE-SECURITY-INVESTIGATION-REPORT.md
# Lynx — Storage Bucket Security Audit

**Date:** 2026-03-17
**Branch:** navigation-cleanup-complete
**Scope:** All Supabase Storage interactions across lib/, app/, components/, hooks/

---

## 1. BUCKET INVENTORY

| Bucket Name | What's Stored | Who Uploads | Who Downloads | Sensitivity |
|-------------|---------------|-------------|---------------|-------------|
| `media` | Profile photos, org banners, team wall covers, team wall post photos | Any authenticated user (profile); Admin (org); Coach/Admin (team wall) | Any authenticated user with URL | **HIGH** — profile photos may include parents/minors |
| `player-photos` | Player/child profile photos | Coach, Admin | Any authenticated user with URL | **HIGH** — photos of minors |
| `photos` | Team banners, team logos | Coach, Admin (with edit permission) | Any authenticated user with URL | **MEDIUM** — team branding, may contain children in group shots |
| `chat-media` | Chat images, videos, voice messages, GIFs | Chat members with `can_post` permission | Any authenticated user with URL | **HIGH** — private DM media, voice messages, photos shared in private channels |

**Critical finding:** All 4 buckets appear to be public. Every upload uses `getPublicUrl()`. **Zero** `createSignedUrl()` calls exist in the entire codebase.

---

## 2. UPLOAD PATH MAP

### app/profile.tsx — line 110

**Bucket:** `media`
**What's uploaded:** User profile avatar photo
**Who can trigger:** Any authenticated user (from their own profile screen)
**Upload path pattern:** `profile-photos/${user.id}_${timestamp}.${ext}`
**Access method after upload:** `getPublicUrl()` → stored in `profiles.avatar_url` + `profiles.photo_url`

---

### app/org-settings.tsx — line 116

**Bucket:** `media`
**What's uploaded:** Organization banner/logo image
**Who can trigger:** Admin users only (gated by isAdmin check)
**Upload path pattern:** `org-banners/${orgId}_${timestamp}.${ext}`
**Access method after upload:** `getPublicUrl()` → stored in `organizations.settings.banner_url`

---

### app/child-detail.tsx — line 321

**Bucket:** `player-photos`
**What's uploaded:** Child/player profile photo
**Who can trigger:** Coach and Admin only (camera button gated by `isAdmin || isCoach`)
**Upload path pattern:** `player_${player.id}_${timestamp}.${ext}`
**Access method after upload:** `getPublicUrl()` → stored in `players.photo_url`

---

### components/PlayerCardExpanded.tsx — line 209

**Bucket:** `player-photos`
**What's uploaded:** Player profile photo (from expanded card modal)
**Who can trigger:** Coach and Admin only
**Upload path pattern:** `player_${player.id}_${timestamp}.${ext}`
**Access method after upload:** `getPublicUrl()` → stored in `players.photo_url`

---

### components/team-hub/HeroBanner.tsx — line 175

**Bucket:** `photos`
**What's uploaded:** Team hero banner image
**Who can trigger:** Users with edit permission (`canEdit` prop)
**Upload path pattern:** `team-banners/${team.id}/${timestamp}.${ext}`
**Access method after upload:** `getPublicUrl()` → stored in `teams.banner_url`

---

### app/chat/[id].tsx — line 487

**Bucket:** `chat-media` (default via `uploadMedia()`)
**What's uploaded:** Chat image or video attachment
**Who can trigger:** Chat members with `can_post` permission
**Upload path pattern:** `${channelId}/${timestamp}.${jpg|mp4}`
**Access method after upload:** `getPublicUrl()` → stored in `message_attachments.file_url`

---

### app/chat/[id].tsx — line 611

**Bucket:** `chat-media` (default via `uploadMedia()`)
**What's uploaded:** Voice message audio recording
**Who can trigger:** Chat members with `can_post` permission
**Upload path pattern:** `${channelId}/${timestamp}.m4a`
**Access method after upload:** `getPublicUrl()` → stored in `message_attachments.file_url`

---

### components/TeamWall.tsx — line 968

**Bucket:** `media` (explicit third arg to `uploadMedia()`)
**What's uploaded:** Team wall cover/banner photo
**Who can trigger:** Team admin/managers
**Upload path pattern:** `team-banners/${teamId}/${timestamp}.jpg`
**Access method after upload:** `getPublicUrl()` → stored in `teams.banner_url`

---

### components/TeamWall.tsx — line 985

**Bucket:** `media` (explicit third arg to `uploadMedia()`)
**What's uploaded:** Team wall post photo
**Who can trigger:** Team members with post permission
**Upload path pattern:** `team-wall/${teamId}/${timestamp}.jpg`
**Access method after upload:** `getPublicUrl()` → inline in post content

---

### lib/media-utils.ts — line 194 (centralized upload utility)

**Bucket:** Parameterized — default `chat-media`, callers pass `'media'`
**What's uploaded:** Any media (image/video/audio)
**Upload path pattern:** `${folderPath}/${timestamp}.${ext}`
**Access method after upload:** `getPublicUrl()` — line 206

---

**Total upload points: 9 (across 6 files + 1 utility)**

---

## 3. DOWNLOAD/DISPLAY MAP

### avatar_url — Profile Photos (14+ display locations)

**How URL is obtained:** Stored in `profiles.avatar_url` database column
**Storage origin:** `media` bucket, `profile-photos/` folder

| File | Context | Who Can See |
|------|---------|-------------|
| app/profile.tsx:128 | User's own profile | Self only |
| app/coach-profile.tsx:198 | Coach profile display | Coach/Admin/Parent |
| app/chat/[id].tsx:823 | Chat message sender avatar | Channel members |
| app/(tabs)/chats.tsx:654 | Chat channel list avatar | All authenticated users |
| app/challenge-detail.tsx:557,680 | Challenge leaderboard | All authenticated users |
| app/coach-challenge-dashboard.tsx:273 | Challenge leaderboard | Coach/Admin |
| app/volunteer-assignment.tsx:617 | Volunteer parent avatar | Admin/Coach |
| components/TeamWall.tsx:1388,1608,1627,1915,2252 | Post author, comments, reactions | Team members |
| components/GiveShoutoutModal.tsx:98 | Shoutout recipient | Team members (coaches) |

---

### photo_url — Player/Child Photos (20+ display locations)

**How URL is obtained:** Stored in `players.photo_url` database column
**Storage origin:** `player-photos` bucket

| File | Context | Who Can See |
|------|---------|-------------|
| app/attendance.tsx:569 | Attendance tracking | Coach/Admin |
| app/game-prep-wizard.tsx:745,836,947 | Game prep roster/lineup | Coach/Admin |
| app/game-results.tsx:766,804 | Game recap performers | Parent/Coach/Player (team) |
| app/lineup-builder.tsx:1380,1470 | Lineup builder | Coach/Admin |
| app/player-evaluations.tsx:437,469 | Evaluation session | Coach/Admin |
| components/PlayerCard.tsx:104 | Player card | Parent/Coach/Player |
| components/PlayerCardExpanded.tsx:307 | Expanded player card | Parent/Coach/Player |
| components/PlayerStatBar.tsx:85 | Stat bar | Parent/Coach/Player |
| components/parent-scroll/AthleteCard.tsx:124 | Parent's child card | Parent (own child) |
| components/ChildPickerScreen.tsx:172 | Child picker | Authenticated users |
| components/coach-scroll/SquadFacesRow.tsx:140 | Roster faces | Coach/Admin |
| components/TeamWall.tsx:1694 | Shoutout player | Team members |
| components/VolleyballCourt.tsx:89 | Court view | Coach/Admin |

---

### banner_url — Team Banners (3 display locations)

**How URL is obtained:** Stored in `teams.banner_url` database column
**Storage origin:** `photos` bucket (HeroBanner) / `media` bucket (TeamWall)

| File | Context | Who Can See |
|------|---------|-------------|
| components/team-hub/HeroBanner.tsx:202 | Team hub hero banner | Team members |
| components/TeamWall.tsx:1783 | Team wall cover | Team members |
| components/TeamWall.tsx:2184 | Compact header | Team members |

---

### logo_url — Organization/Team Logos (4 display locations)

**How URL is obtained:** Stored in `organizations.logo_url` or `teams.logo_url`
**Storage origin:** `photos` bucket

| File | Context | Who Can See |
|------|---------|-------------|
| components/team-hub/TeamIdentityBar.tsx:35 | Team identity | Team members |
| app/org-directory.tsx:100,202 | Org directory | All authenticated users |
| app/register/[seasonId].tsx:912 | Registration flow | **Public (unauthenticated)** |

---

### file_url — Chat Attachments (2 display locations)

**How URL is obtained:** Stored in `message_attachments.file_url` database column
**Storage origin:** `chat-media` bucket

| File | Context | Who Can See |
|------|---------|-------------|
| app/chat/[id].tsx:873 | Chat image attachment | Channel members |
| app/chat/[id].tsx:879 | Chat GIF attachment | Channel members |

---

### media_urls — Team Wall Post Images (1 display location)

**How URL is obtained:** Array stored inline in `team_posts.media_urls`
**Storage origin:** `media` bucket, `team-wall/` folder

| File | Context | Who Can See |
|------|---------|-------------|
| components/team-hub/GalleryPreview.tsx:122 | Team gallery grid | Team members |

---

**Total display points: ~44 across 25+ files**

---

## 4. PRIVACY CLASSIFICATION

### MUST BE PRIVATE (signed URLs required)

| Content | Bucket | Reason |
|---------|--------|--------|
| Player/child profile photos | `player-photos` | Photos of minors — COPPA, GDPR-K, child safety |
| Chat images in DM channels | `chat-media` | Private conversations — expectation of privacy |
| Chat voice messages | `chat-media` | Audio recordings of potentially minors — high sensitivity |
| Team wall post photos | `media` (team-wall/) | May contain photos of children at games/practice |

### CAN REMAIN PUBLIC

| Content | Bucket | Reason |
|---------|--------|--------|
| Organization logos | `photos` | Promotional/branding — meant to be visible |
| Organization banners | `media` (org-banners/) | Public marketing material |
| Team logos | `photos` | Public team identity |

### AMBIGUOUS (needs Carlos's decision)

| Content | Bucket | Reason |
|---------|--------|--------|
| User profile avatars | `media` (profile-photos/) | Adults' photos are less sensitive, but parents may prefer privacy |
| Team banners | `photos` (team-banners/) | Group photos at games may include children |
| Team wall cover photos | `media` (team-banners/) | Often team group shots with children |

---

## 5. CURRENT STORAGE POLICIES

### Supabase Migrations Audit

Searched all 15 migration files in `supabase/migrations/` and `supabase/APPLY-TO-SUPABASE.sql`:

**Result: ZERO storage bucket policies found.**

No migration file contains:
- `CREATE POLICY ... ON storage.objects`
- `storage.buckets`
- `storage.foldername`
- Any storage-related RLS configuration

### What This Means

All 4 buckets (`media`, `player-photos`, `photos`, `chat-media`) are likely configured as **public buckets** in the Supabase dashboard with no RLS policies restricting access. Anyone with the URL can access any file. The URLs are predictable (containing entity IDs and timestamps) and could be enumerated.

---

## 6. PROPOSED FIX PLAN

### Phase 1: Immediate — Make `player-photos` private (HIGH priority)

**Why first:** Contains photos of minors. Highest legal and ethical risk.

**Supabase Dashboard:**
1. Change `player-photos` bucket from public to private
2. Add RLS policy: allow authenticated users to SELECT (read) files
3. Add RLS policy: allow INSERT for users with coach/admin role in the player's team

**Code changes needed (4 files):**

| File | Line | Current | Change To |
|------|------|---------|-----------|
| app/child-detail.tsx | 327-328 | `.getPublicUrl(fileName)` | `.createSignedUrl(fileName, 3600)` |
| components/PlayerCardExpanded.tsx | 215-216 | `.getPublicUrl(fileName)` | `.createSignedUrl(fileName, 3600)` |

**Display changes (20+ files):**
All files displaying `players.photo_url` currently use the stored public URL directly in `<Image source={{ uri }}>`. After switching to signed URLs:
- **Option A (simpler):** Continue storing the signed URL in `players.photo_url`, but signed URLs expire. Would need a background job to refresh URLs periodically. **Not recommended.**
- **Option B (recommended):** Store the **storage path** (e.g., `player_123_1710000000.jpg`) in `players.photo_url` instead of the full URL. Add a utility function `getPlayerPhotoUrl(path)` that calls `createSignedUrl()` at display time with a 1-hour expiry. Update all 20+ display locations to use this utility.

**Signed URL pattern:**
```typescript
const { data } = await supabase.storage
  .from('player-photos')
  .createSignedUrl(storagePath, 3600); // 1 hour expiry
return data?.signedUrl || null;
```

---

### Phase 2: Make `chat-media` private (HIGH priority)

**Why second:** Contains private DM media and voice recordings, potentially of minors.

**Supabase Dashboard:**
1. Change `chat-media` bucket from public to private
2. Add RLS policy: allow authenticated users who are members of the channel to SELECT
3. Add RLS policy: allow INSERT for channel members with `can_post = true`

**Code changes needed (1 file):**

| File | Line | Current | Change To |
|------|------|---------|-----------|
| lib/media-utils.ts | 206 | `.getPublicUrl(filePath)` | `.createSignedUrl(filePath, 3600)` |

**Display changes (2 files):**
- `app/chat/[id].tsx:873,879` — chat attachments. The `file_url` column in `message_attachments` stores the full public URL. Same migration strategy as player-photos: store path, generate signed URL at display time.

**Signed URL pattern:**
```typescript
// In a new utility: lib/storage-utils.ts
export async function getChatMediaUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('chat-media')
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl || null;
}
```

---

### Phase 3: Evaluate `media` bucket (MEDIUM priority)

The `media` bucket stores mixed content:
- `profile-photos/` — user avatars (ambiguous)
- `org-banners/` — org logos (can stay public)
- `team-banners/` — team banners (ambiguous)
- `team-wall/` — post photos (may contain children)

**Two approaches:**

**Option A: Split bucket** — Move `profile-photos/` and `team-wall/` into a new private bucket, keep `org-banners/` public.

**Option B: Private bucket with public folder exceptions** — Make the entire `media` bucket private, then add an RLS policy that allows public read for `org-banners/` folder specifically.

**Recommendation:** Option A for cleaner separation.

---

### Phase 4: Evaluate `photos` bucket (LOW priority)

Contains team banners and logos. Team banners may show children in group shots. Logos are meant to be public.

**Recommendation:** Leave public for now. Team banners showing children is a lower-priority concern (group shots, not individual identification). Can revisit post-launch.

---

## 7. RISK ASSESSMENT

### What breaks if we make a bucket private without updating code?

**Immediate breakage:** Every `<Image>` component using a stored public URL from that bucket will show a broken image (403 Forbidden). This affects:
- `player-photos` → 20+ display locations across the app
- `chat-media` → 2 display locations + audio playback
- `media` → 14+ avatar displays + 4+ team wall/post displays

**Severity:** App becomes unusable for any screen that shows player photos or chat media.

### Migration path for URLs already stored in database records

**Problem:** Database columns (`players.photo_url`, `profiles.avatar_url`, `message_attachments.file_url`) currently store **full public URLs** like:
```
https://uqpjvbiuokwpldjvxiby.supabase.co/storage/v1/object/public/player-photos/player_abc_123.jpg
```

When the bucket becomes private, these URLs return 403.

**Migration strategy:**
1. Extract the **storage path** from each full URL (strip the bucket prefix)
2. Store the path in a new column (e.g., `photo_path`) or update existing column
3. Update all display code to use `createSignedUrl(path)` at render time
4. **Or:** Keep full URLs but add a middleware/utility that detects the old format and generates a signed URL on the fly

**SQL migration example:**
```sql
-- Add path column
ALTER TABLE players ADD COLUMN photo_storage_path TEXT;

-- Extract path from existing URLs
UPDATE players
SET photo_storage_path = REPLACE(photo_url, 'https://uqpjvbiuokwpldjvxiby.supabase.co/storage/v1/object/public/player-photos/', '')
WHERE photo_url IS NOT NULL AND photo_url LIKE '%/player-photos/%';
```

### Are there URLs shared externally that would break?

- **Push notifications:** Notifications do not include image URLs — they use text only. **No breakage.**
- **Emails:** No email system in the mobile app. **No breakage.**
- **QR codes:** QR codes link to app routes, not storage URLs. **No breakage.**
- **Deep links:** Route-based, not media-based. **No breakage.**
- **Web admin portal:** The web admin at `volleybrain-admin/` shares the same Supabase project. If it reads from `player-photos` or `chat-media`, those URLs would also break. **Must coordinate with web admin.**

### Performance impact of signed URLs vs public URLs

| Aspect | Public URL | Signed URL |
|--------|-----------|------------|
| CDN caching | Full CDN cache | Limited — signed URLs are unique per request |
| Generation cost | Instant (no API call) | Requires async Supabase call |
| Expiry | Never | Configurable (recommended: 1 hour) |
| Re-renders | No impact | Must refresh URL when expired |
| Offline | Cached images work | Cached images work until expiry |

**Mitigation:**
- Cache signed URLs in React state for the session (don't regenerate on every render)
- Use `useMemo` or a custom hook like `useSignedUrl(bucket, path)` that caches results
- Set expiry to 3600s (1 hour) to balance security and performance
- For list views (roster, attendance), batch-generate signed URLs for all players at load time

---

## 8. EXECUTION PRIORITY

| Priority | Action | Risk If Skipped | Effort |
|----------|--------|-----------------|--------|
| **P0 — Pre-launch** | Make `player-photos` private + update code | Photos of minors publicly accessible | HIGH (20+ files) |
| **P0 — Pre-launch** | Make `chat-media` private + update code | Private DMs publicly accessible | MEDIUM (3 files) |
| **P1 — Sprint 1** | Split `media` bucket or add RLS | Team wall photos of children exposed | HIGH (14+ files) |
| **P2 — Sprint 2** | Evaluate `photos` bucket | Team banners with group shots exposed | LOW (3 files) |
| **P2 — Sprint 2** | Add storage cleanup (delete old files on replace) | Orphaned files accumulate | LOW |
| **P3 — Backlog** | URL migration for existing records | Old URLs break after bucket change | MEDIUM |

---

## SUMMARY

| Finding | Status |
|---------|--------|
| Total storage buckets | 4 (`media`, `player-photos`, `photos`, `chat-media`) |
| Total upload paths | 9 across 6 files + 1 utility |
| Total display locations | ~44 across 25+ files |
| `createSignedUrl()` usage | **ZERO** — not used anywhere |
| Storage RLS policies | **ZERO** — none defined in migrations |
| HIGH sensitivity content in public buckets | **YES** — player photos, chat media |
| Needs pre-launch fix | **YES** — `player-photos` and `chat-media` buckets |
