# CC-CHALLENGE-AND-PARENT-HOME-FIX

## Priority: CRITICAL — Two bugs blocking beta testing

---

## WORKFLOW — READ THIS FIRST

This spec uses a **diagnose-then-execute** workflow. Do NOT write any code until Step 1 is complete and Carlos confirms your diagnosis.

### Step 1: DIAGNOSE ONLY (no code changes)

Read every file listed in both bugs below. For each bug, report back to Carlos:

1. What you believe the root cause is
2. Which exact lines are responsible
3. What your proposed fix will do
4. Which files you will modify

**Do not touch any files until Carlos says "execute."**

### Step 2: EXECUTE (only after Carlos confirms diagnosis)

Apply the fixes described. Test by running the app and confirming both issues resolve.

### Step 3: COMMIT

Stage all changes and commit with message:
```
Fix challenge team resolution + replace athlete cards with Family Summary Card
```

---

## RULES

- **Read every file referenced before modifying anything.** No exceptions.
- **Do not create new files** unless explicitly stated. These are edits to existing files.
- **Do not refactor, rename, or reorganize** anything outside the scope of these two bugs.
- **Do not remove or break** any existing working functionality.
- **Preserve all existing imports, types, and exports** — other components depend on them.
- **Also commit the existing uncommitted changes** (see Appendix A) — those are valid fixes from a prior session that were never committed.

---

## BUG 1: Challenge Creation — "No team found for your account"

### Symptom
When a coach (who is also an admin) navigates to Create Challenge and tries to issue a challenge, the button is disabled and shows "No team found for your account." This happens despite the same user's Coach Home page loading teams correctly.

### Files to Read
1. `app/create-challenge.tsx` — the broken screen (focus on the `useEffect` at ~line 107)
2. `hooks/useCoachHomeData.ts` — the working team resolution (focus on the team_staff + coaches query block, ~line 50-100)
3. `SCHEMA_REFERENCE.csv` — confirm `team_staff` and `team_coaches` table schemas

### Root Cause Analysis

The team resolution logic in `create-challenge.tsx` (lines 107-130) has THREE problems that `useCoachHomeData.ts` does not have:

**Problem A: `.maybeSingle()` fails on multiple rows**
```typescript
const { data: staffRow } = await supabase
  .from('team_staff')
  .select('team_id, teams(organization_id)')
  .eq('user_id', user.id)
  .limit(1)
  .maybeSingle();
```
If the user has multiple `team_staff` rows (common — coaches assigned to multiple teams, or someone who is both admin and coach), `.maybeSingle()` returns `null` when there's more than one match despite `limit(1)`. The `.limit(1)` should handle it, but the interaction between `.limit()` and `.maybeSingle()` in Supabase JS can be unreliable. `useCoachHomeData` does NOT use `.maybeSingle()` — it fetches ALL rows and picks from them.

**Problem B: No `is_active` awareness**
The `team_staff` table has an `is_active` boolean column and a `removed_at` timestamp. The query doesn't filter for active staff, so it might pick up an old/deactivated row that has no valid team.

**Problem C: Missing last-resort fallback**
`useCoachHomeData` has a fallback that loads ALL teams for the current season if neither `team_staff` nor `coaches → team_coaches` returns results. `create-challenge.tsx` has no such fallback.

### Fix Instructions

Replace the entire `useEffect` block for team/org resolution in `app/create-challenge.tsx` (~lines 107-130) with logic that mirrors `useCoachHomeData`:

```typescript
useEffect(() => {
  if (!user?.id) return;
  (async () => {
    setResolving(true);

    // Path 1: team_staff (primary — matches useCoachHomeData)
    const { data: staffRows } = await supabase
      .from('team_staff')
      .select('team_id, is_active, teams(id, organization_id, season_id)')
      .eq('user_id', user.id);

    // Filter to active staff, prefer current season
    const activeStaff = (staffRows || []).filter((r: any) => r.is_active !== false);
    const currentSeasonStaff = activeStaff.find((r: any) => (r.teams as any)?.season_id === workingSeason?.id);
    const bestStaff = currentSeasonStaff || activeStaff[0];

    if (bestStaff) {
      setTeamId(bestStaff.team_id);
      setOrgId((bestStaff.teams as any)?.organization_id || null);
      setResolving(false);
      return;
    }

    // Path 2: coaches → team_coaches (secondary)
    const { data: coachRecord } = await supabase
      .from('coaches')
      .select('id, team_coaches ( team_id, teams ( id, organization_id, season_id ) )')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (coachRecord) {
      const tcEntries = (coachRecord.team_coaches as any[]) || [];
      // Prefer current season team
      const currentSeasonTC = tcEntries.find((tc: any) => (tc.teams as any)?.season_id === workingSeason?.id);
      const bestTC = currentSeasonTC || tcEntries.find((tc: any) => tc.teams);
      if (bestTC) {
        setTeamId(bestTC.team_id);
        setOrgId((bestTC.teams as any)?.organization_id || null);
        setResolving(false);
        return;
      }
    }

    // Path 3: Last resort — if user is admin/coach of the org, pick first team in current season
    if (workingSeason?.id) {
      const { data: seasonTeams } = await supabase
        .from('teams')
        .select('id, organization_id')
        .eq('season_id', workingSeason.id)
        .limit(1)
        .maybeSingle();

      if (seasonTeams) {
        setTeamId(seasonTeams.id);
        setOrgId(seasonTeams.organization_id || null);
      }
    }

    setResolving(false);
  })();
}, [user?.id, workingSeason?.id]);
```

**Important:** Add `workingSeason?.id` to the dependency array of this useEffect (it's currently only `[user?.id]`). The `useSeason` hook is already imported and `workingSeason` is already destructured.

---

## BUG 2: Parent Home — Individual Player Cards Should Be a Single Family Summary Card

### Symptom
The parent home page shows individual `AthleteCardV2` cards for each child in the "MY ATHLETES" section. The intended design is a **single summary card** that gives a family overview and signals swiping/tapping to open the full FamilyPanel. The FamilyPanel already exists and works — it's just not being surfaced properly.

### Files to Read
1. `components/ParentHomeScroll.tsx` — the parent home (focus on the "MY ATHLETES" section, ~line 380-420)
2. `components/parent-scroll/AthleteCardV2.tsx` — the current per-child card (understand its props)
3. `components/FamilyPanel.tsx` — the existing family detail panel (already built and functional)

### Design Intent

Replace the entire "MY ATHLETES" section (which currently maps over `data.allChildren` rendering individual `AthleteCardV2` cards) with a **single Family Summary Card** that:

1. Shows a compact overview: number of children, their names/initials in a row of small avatar circles
2. For each child, shows ONE line: name + team count + next event summary (if any)
3. Has a clear CTA: "Tap for Family View →" or a right-arrow chevron
4. Tapping the card opens the FamilyPanel (`setFamilyPanelOpen(true)`)
5. If there is only ONE child with ONE team, the card should still exist but be simpler — show the child's name, team, and next event, with the same tap-to-open behavior

### Fix Instructions

**In `components/ParentHomeScroll.tsx`**, replace the "MY ATHLETES" section (~lines 380-420) that currently looks like:

```tsx
{data.allChildren.length > 0 && (
  <View style={styles.athleteSection}>
    <View style={styles.athleteSectionHeader}>
      <Text style={styles.sectionHeader}>
        {data.allChildren.length === 1 ? 'MY ATHLETE' : 'MY ATHLETES'}
      </Text>
      <TouchableOpacity ...>
        <Text style={styles.familyBtnText}>Family View</Text>
      </TouchableOpacity>
    </View>
    {data.allChildren.map((child) => (
      <View key={child.playerId} style={{ marginBottom: 8 }}>
        <AthleteCardV2 ... />
      </View>
    ))}
  </View>
)}
```

Replace with a **single tappable Family Summary Card**:

```tsx
{data.allChildren.length > 0 && (
  <View style={styles.athleteSection}>
    <TouchableOpacity
      style={styles.familySummaryCard}
      activeOpacity={0.7}
      onPress={() => setFamilyPanelOpen(true)}
    >
      {/* Avatar row */}
      <View style={styles.familyAvatarRow}>
        {data.allChildren.slice(0, 5).map((child) => {
          const color = child.teams[0]?.teamColor || child.teams[0]?.sportColor || BRAND.skyBlue;
          return child.photoUrl ? (
            <Image
              key={child.playerId}
              source={{ uri: child.photoUrl }}
              style={[styles.familyMiniAvatar, { borderColor: color }]}
            />
          ) : (
            <View key={child.playerId} style={[styles.familyMiniAvatarFallback, { backgroundColor: color }]}>
              <Text style={styles.familyMiniAvatarText}>{child.firstName[0]}</Text>
            </View>
          );
        })}
        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={20} color={BRAND.textFaint} />
      </View>

      {/* Title */}
      <Text style={styles.familySummaryTitle}>
        {data.allChildren.length === 1
          ? `${data.allChildren[0].firstName}'s Overview`
          : `Family Overview · ${data.allChildren.length} Athletes`}
      </Text>

      {/* Per-child one-liners */}
      {data.allChildren.map((child) => {
        const teamCount = child.teams.length;
        const nextEvt = data.allUpcomingEvents.find(e => e.childId === child.playerId);
        const evtLabel = nextEvt
          ? `${(nextEvt.eventType || 'Event').charAt(0).toUpperCase() + (nextEvt.eventType || 'Event').slice(1)} ${(() => {
              const today = new Date().toDateString();
              const evtDate = new Date(nextEvt.date + 'T00:00:00');
              if (evtDate.toDateString() === today) return 'today';
              const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1);
              if (evtDate.toDateString() === tmrw.toDateString()) return 'tomorrow';
              try { return evtDate.toLocaleDateString('en-US', { weekday: 'short' }); } catch { return ''; }
            })()}`
          : 'No upcoming events';

        return (
          <View key={child.playerId} style={styles.familyChildRow}>
            <Text style={styles.familyChildName}>{child.firstName}</Text>
            <Text style={styles.familyChildMeta}>
              {teamCount} {teamCount === 1 ? 'team' : 'teams'} · {evtLabel}
            </Text>
          </View>
        );
      })}

      {/* CTA hint */}
      <Text style={styles.familySummaryCta}>Tap for full family view</Text>
    </TouchableOpacity>
  </View>
)}
```

**Add these styles** to the `styles` StyleSheet in the same file:

```typescript
familySummaryCard: {
  backgroundColor: BRAND.cardBg || BRAND.white,
  borderRadius: 16,
  padding: 16,
  borderWidth: 1,
  borderColor: BRAND.border,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 2,
},
familyAvatarRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: 12,
},
familyMiniAvatar: {
  width: 36,
  height: 36,
  borderRadius: 18,
  borderWidth: 2,
},
familyMiniAvatarFallback: {
  width: 36,
  height: 36,
  borderRadius: 18,
  justifyContent: 'center',
  alignItems: 'center',
},
familyMiniAvatarText: {
  fontFamily: FONTS.bodyBold,
  fontSize: 14,
  color: BRAND.white,
},
familySummaryTitle: {
  fontFamily: FONTS.bodyBold,
  fontSize: 16,
  color: BRAND.textPrimary,
  marginBottom: 10,
},
familyChildRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 6,
  borderTopWidth: 1,
  borderTopColor: BRAND.border,
},
familyChildName: {
  fontFamily: FONTS.bodySemiBold,
  fontSize: 14,
  color: BRAND.textPrimary,
},
familyChildMeta: {
  fontFamily: FONTS.bodyMedium,
  fontSize: 12,
  color: BRAND.textMuted,
},
familySummaryCta: {
  fontFamily: FONTS.bodySemiBold,
  fontSize: 11,
  color: BRAND.skyBlue,
  textAlign: 'center',
  marginTop: 10,
  letterSpacing: 0.3,
},
```

**Do NOT remove the `AthleteCardV2` import or component file** — it may be used elsewhere. Just stop rendering it in this section.

**Do NOT remove the `FamilyPanel` component** at the bottom of the JSX — it stays exactly where it is. The new card just opens it.

---

## APPENDIX A: Uncommitted Changes to Also Commit

The following files have valid uncommitted changes from a prior session. **Include these in the same commit.** Do not revert them.

### `hooks/useParentHomeData.ts`
- Deduplication changed from name-based to ID-based (line ~342-368) — this is correct, commit it
- Waiver route changed from `/registration-hub` to `/my-waivers` (line ~685) — this is correct, commit it

### `components/FamilyPanel.tsx`
- Route changed from `/registration-hub` to `/parent-registration-hub` (line ~201) — this is correct, commit it

### `hooks/useAdminHomeData.ts`
- Added `eventDates` state and population logic for admin calendar strip — this is correct, commit it

### `components/AdminHomeScroll.tsx`
- Added DayStripCalendar import and render for admin home — this is correct, commit it

### `lib/media-utils.ts`
- Added try/catch HEIC fallback for `pickImage` and `takePhoto` — this is correct, commit it
- Added detailed logging to `uploadMedia` — this is correct, commit it

---

## VERIFICATION CHECKLIST

After executing fixes, confirm:

- [ ] Coach can navigate to Create Challenge and the "ISSUE CHALLENGE" button is enabled
- [ ] `teamId` and `orgId` resolve correctly (add a temporary `console.log` if needed, remove before commit)
- [ ] Challenge can be created and saved successfully
- [ ] Parent home shows a SINGLE Family Summary Card, not individual player cards
- [ ] Tapping the Family Summary Card opens the FamilyPanel
- [ ] FamilyPanel still shows all children, teams, events, payments, and quick actions
- [ ] All four role home pages still load without errors (admin, coach, parent, player)
- [ ] No TypeScript errors introduced
