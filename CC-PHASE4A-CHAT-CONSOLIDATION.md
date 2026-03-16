# CC-PHASE4A-CHAT-CONSOLIDATION.md
# Lynx Mobile — Phase 4A: Chat Screen Consolidation
# EXECUTION SPEC

---

## PURPOSE

Merge 4 chat list screens into 1 role-aware chat screen. This is the first of 4 Phase 4 consolidation specs.

**Current state:** 4 files, 2,807 total lines
- `app/(tabs)/chats.tsx` — 776 lines, generic chat for all roles
- `app/(tabs)/coach-chat.tsx` — 1,099 lines, expanded FAB (Blast, Channel, DM)
- `app/(tabs)/parent-chat.tsx` — 930 lines, DM-only creation, has N+1 query bug
- `app/(tabs)/admin-chat.tsx` — 2 lines, re-export of coach-chat

**Target state:** 1 file, ~900-1000 lines
- `app/(tabs)/chats.tsx` — enhanced with role-conditional FAB from coach-chat, N+1 fix from coach-chat's batched loading

---

## BEFORE YOU START

1. Read `CC-LYNX-RULES.md` and `CC-PROJECT-CONTEXT.md`
2. Read `CC-SHARED-SCREEN-ARCHITECTURE.md` — specifically Section 1 (CHAT)
3. Read ALL FOUR chat files completely before making any changes. Understand what each one does differently.

---

## RULES

1. **Modify only the files listed in this spec.** No other files.
2. **Do NOT change `app/chat/[id].tsx`** — the conversation screen stays as-is.
3. **Do NOT change any home scroll components.** References from home scrolls to `/(tabs)/parent-chat` or `/(tabs)/coach-chat` will be updated in a SEPARATE step at the end.
4. **Preserve ALL unique features** from every source file during the merge. Do not drop functionality.
5. **Execute sequentially. Produce one report at the end.**

---

## STEP 1: Study the Differences

Before writing any code, read all 4 files and document the differences. Key things to identify:

**From `coach-chat.tsx` (1,099 lines) — features to merge into chats.tsx:**
- Expanded FAB with 3 options: Blast, Channel, DM (instead of simple "New Chat" FAB)
- Channel browsing/creation modal
- Batched channel member loading (the N+1 fix that parent-chat lacks)
- Real-time subscription named `'coach-chat-updates'`

**From `parent-chat.tsx` (930 lines) — features to merge into chats.tsx:**
- DM-only creation flow (simpler than coach version)
- Channel list filtered to channels where the user is a member
- Real-time subscription named `'parent-chat-updates'`
- NOTE: Has N+1 sequential query pattern (lines 172-209) — do NOT bring this pattern over. Use the coach-chat batched pattern instead.

**From `chats.tsx` (776 lines) — the base to enhance:**
- Generic chat list with search, pull-to-refresh
- Pinning system (AsyncStorage)
- DM and channel creation
- Real-time subscription named `'chat-updates'`

**From `admin-chat.tsx` (2 lines):**
- Just re-exports coach-chat. Nothing unique.

---

## STEP 2: Enhance chats.tsx

**File:** `app/(tabs)/chats.tsx`

Make the following changes to the EXISTING `chats.tsx`:

### 2A: Add role-aware imports

Add at the top of the file:
```typescript
import { usePermissions } from '@/lib/permissions-context';
```

Inside the component function, add:
```typescript
const { isAdmin, isCoach } = usePermissions();
```

### 2B: Upgrade the FAB to role-conditional

Find the existing FAB or "New Chat" button in `chats.tsx`. Replace it with a role-conditional FAB:

**For coach/admin users (`isCoach || isAdmin`):**
Show an expandable FAB with 3 options:
- Send Blast → navigate to `/blast-composer`
- New Channel → open channel creation modal
- New DM → open DM creation modal

**For parent/player users (default):**
Show a simple FAB with 1 option:
- New Message → open DM creation modal

Copy the FAB implementation from `coach-chat.tsx`. It has the expanded FAB with the three options. Wrap it in a role check:

```typescript
{(isCoach || isAdmin) ? (
  // Expanded FAB from coach-chat.tsx (Blast, Channel, DM)
  // ... copy the FAB JSX and state from coach-chat.tsx ...
) : (
  // Simple FAB — DM only
  // ... keep the existing simple new-chat button from chats.tsx ...
)}
```

### 2C: Fix the N+1 query pattern

Check how `chats.tsx` currently loads channel members and unread counts. If it uses sequential queries (loading member data one channel at a time), replace it with the batched approach from `coach-chat.tsx`.

The batched pattern typically:
1. Fetches all channels in one query
2. Fetches all members for those channels in one query using `.in('channel_id', channelIds)`
3. Fetches unread counts in one batched query

If `chats.tsx` already uses a batched approach, leave it as-is. If it has the same N+1 pattern as `parent-chat.tsx`, fix it.

### 2D: Channel creation modal

If `chats.tsx` doesn't already have a channel creation modal (for coaches to create team channels), copy it from `coach-chat.tsx`. Wrap it in a role check:

```typescript
{(isCoach || isAdmin) && (
  <Modal visible={showNewChannel} ...>
    {/* Channel creation UI from coach-chat.tsx */}
  </Modal>
)}
```

### 2E: Real-time subscription

`chats.tsx` should have one real-time subscription channel name. Keep the existing `'chat-updates'` name. Do NOT create separate subscription names per role.

### 2F: Review and trim

After merging features in, review the final file. Remove any dead code, unused state variables, or duplicate logic that resulted from the merge. The goal is a clean, well-organized file — not a pile of copy-pasted code.

**Target: ~900-1000 lines.** If the file is significantly larger, you've duplicated logic that should be shared.

---

## STEP 3: Update the Tab Layout

**File:** `app/(tabs)/_layout.tsx`

The hidden tab declarations for coach-chat, parent-chat, and admin-chat need to remain temporarily so Expo Router doesn't break if any stale references exist. But they should now just re-export chats:

**DO NOT delete the tab screen entries yet.** Leave them as hidden tabs. In Step 5 we'll handle references.

---

## STEP 4: Create Redirect Files

Replace the contents of the three deleted chat files with simple re-exports to prevent broken references:

**File:** `app/(tabs)/coach-chat.tsx`
Replace entire contents with:
```typescript
// Consolidated into chats.tsx — this file exists for route compatibility
export { default } from './chats';
```

**File:** `app/(tabs)/parent-chat.tsx`
Replace entire contents with:
```typescript
// Consolidated into chats.tsx — this file exists for route compatibility
export { default } from './chats';
```

**File:** `app/(tabs)/admin-chat.tsx`
Replace entire contents with:
```typescript
// Consolidated into chats.tsx — this file exists for route compatibility
export { default } from './chats';
```

This means any existing references to `/(tabs)/coach-chat`, `/(tabs)/parent-chat`, or `/(tabs)/admin-chat` will still work — they'll just render the unified chats screen. This is safer than deleting the files outright.

---

## STEP 5: Update External References

These files currently reference the role-specific chat screens. Update them to point to the unified `/(tabs)/chats`:

**File:** `components/coach-scroll/GamePlanCard.tsx` — line 119
```typescript
// BEFORE:
router.push('/(tabs)/coach-chat' as any);
// AFTER:
router.push('/(tabs)/chats' as any);
```

**File:** `components/coach-scroll/QuickActions.tsx` — line 21
```typescript
// BEFORE:
{ icon: '📣', label: 'Send a Blast', route: '/(tabs)/coach-chat' },
// AFTER:
{ icon: '📣', label: 'Send a Blast', route: '/(tabs)/chats' },
```

**File:** `components/ParentHomeScroll.tsx` — line 143
```typescript
// BEFORE:
route: '/(tabs)/parent-chat',
// AFTER:
route: '/(tabs)/chats',
```

**File:** `components/parent-scroll/FlatChatPreview.tsx` — line 23
```typescript
// BEFORE:
onPress={() => router.push('/(tabs)/parent-chat' as any))
// AFTER:
onPress={() => router.push('/(tabs)/chats' as any))
```

**File:** `components/parent-scroll/MetricGrid.tsx` — line 124
```typescript
// BEFORE:
onPress={() => router.push('/(tabs)/parent-chat' as any))
// AFTER:
onPress={() => router.push('/(tabs)/chats' as any))
```

**Important:** These are route string changes ONLY. Do not modify any other logic in these files.

---

## VERIFICATION

After all steps:

1. **Run `npx tsc --noEmit`** — report result
2. **List every file modified** with what was changed
3. **Confirm chats.tsx line count** — should be ~900-1000 lines
4. **Confirm the three redirect files** each contain only the re-export
5. **Confirm all 5 external references** were updated
6. **List the role-conditional behaviors:**
   - What does a parent see in the FAB?
   - What does a coach see in the FAB?
   - What does an admin see?
   - What does a player see?

---

## MANUAL QA

| # | Test | Expected |
|---|------|----------|
| 1 | As parent, tap Chat tab | See channel list, simple "New Message" FAB |
| 2 | As coach, tap Chat tab | See channel list, expanded FAB (Blast, Channel, DM) |
| 3 | As admin, tap Chat tab | Same as coach (expanded FAB) |
| 4 | As player, tap Chat tab | Simple FAB (New Message only) |
| 5 | As coach, tap Blast in FAB | Navigates to blast-composer |
| 6 | Navigate to `/(tabs)/coach-chat` directly | Renders the same unified chat screen |
| 7 | Navigate to `/(tabs)/parent-chat` directly | Renders the same unified chat screen |
| 8 | Parent home → chat preview tap | Goes to `/(tabs)/chats` (not parent-chat) |
| 9 | Coach home → Quick Actions → Send a Blast | Goes to `/(tabs)/chats` |
