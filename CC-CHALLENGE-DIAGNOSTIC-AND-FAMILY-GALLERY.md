# CC-CHALLENGE-DIAGNOSTIC-AND-FAMILY-GALLERY

## Priority: CRITICAL — Two issues requiring different approaches

---

## WORKFLOW

This spec has TWO separate workflows. Read carefully.

- **BUG 1 (Challenge):** DIAGNOSTIC ONLY. Do NOT write any fix. Output logs and raw data, then print `DIAGNOSTIC COMPLETE — WAITING FOR CARLOS` and STOP.
- **BUG 2 (Family View):** Full redesign. Execute after completing Bug 1 diagnostic output.

---

## BUG 1: Challenge Creation — DIAGNOSTIC ONLY

### Context

The previous fix attempt (CC-CHALLENGE-AND-PARENT-HOME-FIX) rewrote the team/org resolution in `app/create-challenge.tsx` with a 3-path approach. It did NOT work. The screen still shows "No team found for your account" and the ISSUE CHALLENGE button remains disabled/grayed out.

The user (Carlos) is confirmed as Head Coach on "Black Hornets Elite" — visible in the team management modal. His auth user ID is the same one used across all roles (Admin, Coach, Parent, Player).

### What To Do — DIAGNOSTIC STEPS

**Step 1: Add temporary console.logs to `app/create-challenge.tsx`**

Inside the `useEffect` that resolves team/org (the block you just rewrote in the prior fix), add detailed logging at EVERY decision point. The logs must capture:

```
[ChallengeTeamResolve] Starting resolution for user.id: <value>
[ChallengeTeamResolve] workingSeason.id: <value>

[ChallengeTeamResolve] Path 1 — team_staff query result:
  - raw data: <JSON.stringify the full result including error>
  - row count: <number>
  - filtered active rows: <number>
  - current season match: <yes/no>
  - selected teamId: <value or null>
  - selected orgId: <value or null>

[ChallengeTeamResolve] Path 2 — coaches query result:
  - raw data: <JSON.stringify the full result including error>
  - coachRecord found: <yes/no>
  - team_coaches entries: <count>
  - current season match: <yes/no>
  - selected teamId: <value or null>
  - selected orgId: <value or null>

[ChallengeTeamResolve] Path 3 — season teams fallback:
  - raw data: <JSON.stringify the full result including error>
  - selected teamId: <value or null>
  - selected orgId: <value or null>

[ChallengeTeamResolve] FINAL RESULT: teamId=<value>, orgId=<value>
```

**Step 2: Also log what useCoachHomeData finds (for comparison)**

In `hooks/useCoachHomeData.ts`, add a temporary log right after the merge/dedup block where it has the final list of teams:

```
[CoachHomeTeams] Resolved teams: <JSON.stringify the team list with ids and names>
[CoachHomeTeams] user.id: <value>, workingSeason.id: <value>
```

**Step 3: Run a direct Supabase query check**

Create a temporary file `scripts/check-team-data.ts` (or add to an existing debug script) that runs these raw queries and logs results. If you can't run a standalone script, add these queries as a one-time `useEffect` in `create-challenge.tsx` that fires on mount:

```typescript
// Query A: What's in team_staff for this user?
const { data: tsData, error: tsErr } = await supabase
  .from('team_staff')
  .select('*')
  .eq('user_id', user.id);
console.log('[DEBUG] team_staff rows:', JSON.stringify(tsData), 'error:', tsErr);

// Query B: What's in coaches for this user?
const { data: cData, error: cErr } = await supabase
  .from('coaches')
  .select('*, team_coaches(*)')
  .eq('profile_id', user.id);
console.log('[DEBUG] coaches rows:', JSON.stringify(cData), 'error:', cErr);

// Query C: What teams exist for the current season?
const { data: tData, error: tErr } = await supabase
  .from('teams')
  .select('id, name, organization_id, season_id')
  .eq('season_id', workingSeason?.id);
console.log('[DEBUG] season teams:', JSON.stringify(tData), 'error:', tErr);

// Query D: What does the profile say about roles?
const { data: pData } = await supabase
  .from('profiles')
  .select('id, role, full_name')
  .eq('id', user.id)
  .single();
console.log('[DEBUG] profile:', JSON.stringify(pData));
```

**Step 4: Report**

After adding the logs, tell Carlos to:
1. Open the app
2. Navigate to Coach role
3. Go to Create Challenge
4. Screenshot or copy the console/terminal output

Then print:

```
DIAGNOSTIC COMPLETE — WAITING FOR CARLOS
```

**DO NOT attempt to fix the challenge bug. DO NOT modify the resolution logic. ONLY add logging.**

---

## BUG 2: Parent Home — Family Gallery Redesign

### What Was Wrong With The Previous Fix

The previous fix replaced individual AthleteCardV2 cards with a single long "Family Summary Card" that listed all 11 children in a scrollable list on the home page. This is NOT what was intended. The card was too large and the FamilyPanel (side drawer) is not the right UX pattern.

### Design Intent — Two States

**State A: Single Child**
If the parent has exactly ONE child, show a single compact **player card** on the home page:
- Child photo (or initial avatar)
- Child name
- Jersey number
- Team name
- One line — like a contact card or list item, not a big expanded card

**State B: Multiple Children**
If the parent has MORE than one child, show a **horizontal row of avatar circles** on the home page:
- Each circle = child's photo (or initial if no photo)
- Tapping any avatar (or the row itself) opens the full-screen Family Gallery

### Full-Screen Family Gallery (new screen)

This is a **new full-screen view** that opens when the parent taps the avatar row (or the single-child card). It is NOT the existing FamilyPanel side drawer.

**Layout:**
- Full screen, slides up or pushes from right (standard navigation)
- **Top: Tab indicators** — one dot/tab per child, showing which child is currently visible. If child has a photo, use the photo as the tab indicator. If no photo, use initial circle. Active tab is highlighted/enlarged.
- **Center: Horizontal swipe area** — one "page" per child, swipe left/right like a photo gallery
- **Each child's page shows:**
  - Large photo/avatar at top
  - Name, jersey number, position
  - Team(s) with sport icons
  - Next upcoming event + RSVP status
  - Payment status for this child
  - Recent stats summary (if available)
  - Recent achievements/badges
  - Quick action buttons: "View Schedule", "View Payments", "View Evaluations"
- **Bottom: Close button or swipe down to dismiss**

### Implementation Approach

**Step 1: Create new file `components/FamilyGallery.tsx`**

This is a new full-screen component. Use React Native's `FlatList` with `horizontal={true}`, `pagingEnabled={true}`, and `snapToAlignment="center"` to get the swipe-through-photos behavior.

```
Structure:
- Header: "Family" title + close button
- Tab indicator row (scrollable if many children)
- Horizontal FlatList (pagingEnabled)
  - Each page = one child's detail card
- The FlatList onScroll updates the active tab indicator
```

Use `Dimensions.get('window').width` for each page width so each child takes exactly one screen width.

**Step 2: Create route for the gallery**

Add `app/family-gallery.tsx` as a modal screen that renders `<FamilyGallery />`. It should receive no props — it gets data from `useParentHomeData()` directly.

In `app/_layout.tsx` (or wherever modal routes are defined), register this as a modal/presentation route if the app uses that pattern. If not, a standard push route is fine.

**Step 3: Update `components/ParentHomeScroll.tsx`**

Replace the current "MY ATHLETES" section (which was changed to the Family Summary Card in the last fix) with the new compact entry point:

```tsx
{/* ─── FAMILY ENTRY POINT ─────────────────────────────── */}
{data.allChildren.length === 1 ? (
  // Single child: compact player card
  <TouchableOpacity
    style={styles.singleChildCard}
    activeOpacity={0.7}
    onPress={() => router.push('/family-gallery' as any)}
  >
    {/* Photo or initial */}
    {data.allChildren[0].photoUrl ? (
      <Image source={{ uri: data.allChildren[0].photoUrl }} style={styles.singleChildPhoto} />
    ) : (
      <View style={[styles.singleChildInitial, { backgroundColor: data.allChildren[0].teams[0]?.sportColor || BRAND.skyBlue }]}>
        <Text style={styles.singleChildInitialText}>{data.allChildren[0].firstName[0]}</Text>
      </View>
    )}
    {/* Info */}
    <View style={styles.singleChildInfo}>
      <Text style={styles.singleChildName}>{data.allChildren[0].firstName} {data.allChildren[0].lastName}</Text>
      <Text style={styles.singleChildMeta}>
        {[
          data.allChildren[0].teams[0]?.jerseyNumber ? `#${data.allChildren[0].teams[0].jerseyNumber}` : null,
          data.allChildren[0].teams[0]?.teamName,
        ].filter(Boolean).join(' · ')}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={BRAND.textFaint} />
  </TouchableOpacity>
) : data.allChildren.length > 1 ? (
  // Multiple children: avatar row
  <TouchableOpacity
    style={styles.multiChildRow}
    activeOpacity={0.7}
    onPress={() => router.push('/family-gallery' as any)}
  >
    <View style={styles.avatarRow}>
      {data.allChildren.slice(0, 6).map((child) => (
        child.photoUrl ? (
          <Image key={child.playerId} source={{ uri: child.photoUrl }} style={styles.avatarCircle} />
        ) : (
          <View key={child.playerId} style={[styles.avatarCircleFallback, { backgroundColor: child.teams[0]?.sportColor || BRAND.skyBlue }]}>
            <Text style={styles.avatarCircleText}>{child.firstName[0]}</Text>
          </View>
        )
      ))}
      {data.allChildren.length > 6 && (
        <View style={styles.avatarOverflow}>
          <Text style={styles.avatarOverflowText}>+{data.allChildren.length - 6}</Text>
        </View>
      )}
    </View>
    <View style={styles.multiChildLabel}>
      <Text style={styles.multiChildText}>{data.allChildren.length} Athletes</Text>
      <Ionicons name="chevron-forward" size={16} color={BRAND.textFaint} />
    </View>
  </TouchableOpacity>
) : null}
```

**Step 4: Remove the old Family Summary Card code**

Remove the entire `familySummaryCard` block and its 11 associated styles that were added in the previous fix. The `AthleteCardV2` import can stay (it's used elsewhere).

**Step 5: Keep FamilyPanel as-is**

The existing `FamilyPanel` side drawer stays in the codebase and in the JSX. It's a different UX for a different context (quick glance). The new Family Gallery is the deep-dive view.

### Styles to Add in ParentHomeScroll.tsx

```typescript
// Single child compact card
singleChildCard: {
  flexDirection: 'row',
  alignItems: 'center',
  marginHorizontal: SPACING.pagePadding,
  marginBottom: 12,
  backgroundColor: BRAND.cardBg || BRAND.white,
  borderRadius: 14,
  padding: 12,
  borderWidth: 1,
  borderColor: BRAND.border,
  gap: 12,
},
singleChildPhoto: {
  width: 44,
  height: 44,
  borderRadius: 22,
},
singleChildInitial: {
  width: 44,
  height: 44,
  borderRadius: 22,
  justifyContent: 'center',
  alignItems: 'center',
},
singleChildInitialText: {
  fontFamily: FONTS.bodyBold,
  fontSize: 18,
  color: BRAND.white,
},
singleChildInfo: {
  flex: 1,
},
singleChildName: {
  fontFamily: FONTS.bodyBold,
  fontSize: 15,
  color: BRAND.textPrimary,
},
singleChildMeta: {
  fontFamily: FONTS.bodyMedium,
  fontSize: 12,
  color: BRAND.textMuted,
  marginTop: 2,
},

// Multi-child avatar row
multiChildRow: {
  marginHorizontal: SPACING.pagePadding,
  marginBottom: 12,
  backgroundColor: BRAND.cardBg || BRAND.white,
  borderRadius: 14,
  padding: 12,
  borderWidth: 1,
  borderColor: BRAND.border,
},
avatarRow: {
  flexDirection: 'row',
  gap: 8,
  marginBottom: 8,
},
avatarCircle: {
  width: 40,
  height: 40,
  borderRadius: 20,
},
avatarCircleFallback: {
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: 'center',
  alignItems: 'center',
},
avatarCircleText: {
  fontFamily: FONTS.bodyBold,
  fontSize: 16,
  color: BRAND.white,
},
avatarOverflow: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: BRAND.warmGray || '#F1F5F9',
  justifyContent: 'center',
  alignItems: 'center',
},
avatarOverflowText: {
  fontFamily: FONTS.bodySemiBold,
  fontSize: 12,
  color: BRAND.textMuted,
},
multiChildLabel: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
multiChildText: {
  fontFamily: FONTS.bodySemiBold,
  fontSize: 13,
  color: BRAND.textMuted,
},
```

### Data Concerns — Duplicate "Sister" Entries

The screenshots show 8 entries all named "Sister" with 0 teams. This is a DATA issue, not a UI issue. The deduplication in `useParentHomeData` was changed from name-based to ID-based (which is correct — different children CAN have the same name). But these look like test data duplicates in the database. The UI should handle this gracefully (the gallery will just show 8 pages for "Sister"). Carlos may want to clean up test data separately.

### Files Modified
- `components/ParentHomeScroll.tsx` — replace athlete section with compact entry point
- `components/FamilyGallery.tsx` — NEW FILE (full-screen swipe gallery)
- `app/family-gallery.tsx` — NEW FILE (route/screen wrapper)

### Files NOT Modified
- `components/FamilyPanel.tsx` — keep as-is
- `components/parent-scroll/AthleteCardV2.tsx` — keep as-is (may be used in gallery)
- `hooks/useParentHomeData.ts` — no changes needed, data layer is correct

---

## VERIFICATION CHECKLIST

### Bug 1 (Challenge) — Diagnostic Only
- [ ] Console logs added to `create-challenge.tsx` showing all 3 resolution paths
- [ ] Console logs added to `useCoachHomeData.ts` showing resolved teams
- [ ] Raw Supabase queries added (team_staff, coaches, teams, profiles)
- [ ] Printed `DIAGNOSTIC COMPLETE — WAITING FOR CARLOS` and stopped
- [ ] **DID NOT modify the team resolution logic**

### Bug 2 (Family Gallery)
- [ ] Single child → compact player card on home page (photo, name, number, team)
- [ ] Multiple children → avatar circle row on home page
- [ ] Tapping either opens full-screen Family Gallery
- [ ] Gallery has tab indicators at top (photos or initials)
- [ ] Gallery swipes horizontally (one child per page, like photo gallery)
- [ ] Each gallery page shows: photo, name, teams, next event, RSVP, payments, stats, badges, quick actions
- [ ] Swipe updates the active tab indicator
- [ ] Close/back button returns to parent home
- [ ] Old Family Summary Card code and styles removed
- [ ] FamilyPanel side drawer still works independently
- [ ] No TypeScript errors
