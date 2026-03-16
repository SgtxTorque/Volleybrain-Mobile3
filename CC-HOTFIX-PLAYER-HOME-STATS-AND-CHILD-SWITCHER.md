# CC-HOTFIX-PLAYER-HOME-STATS-AND-CHILD-SWITCHER.md
# Lynx Mobile — Hotfix: Player Name → My Stats + Child Switcher Pill
# EXECUTION SPEC

---

## PURPOSE

Two changes to the player home dashboard:

1. **Make the player name tappable → My Stats** (for all players — quick access to stats)
2. **Add a child switcher pill** (for parents viewing as player with multiple children — shows "Ava ▼", tap to switch)

---

## BEFORE YOU START

Read `CC-PROJECT-CONTEXT.md` and `CC-SHARED-SCREEN-ARCHITECTURE.md` for context.

---

## RULES

- Modify ONLY the files listed below
- Do NOT change data fetching, hooks, or queries
- Do NOT change the drawer (GestureDrawer.tsx)
- Do NOT change DashboardRouter.tsx logic (only its JSX where it renders PlayerHomeScroll)
- Keep the dark PLAYER_THEME aesthetic for all new UI elements

---

## CHANGE 1: Make Player Name Tappable → My Stats

**File:** `components/player-scroll/HeroIdentityCard.tsx`

**Current behavior:** The player name ("AVA TEST") is rendered as static `<Text>` elements (lines 116-117). The OVR badge is already tappable → `/my-stats`. The "View My Card" button (from Phase 2) goes to `/player-card`.

**Change:** Wrap the name block (PLAYER label + first name + last name) in a `TouchableOpacity` that navigates to `/my-stats` with the player context.

**Implementation:**

1. Add `playerId` to the Props type:
```typescript
type Props = {
  firstName: string;
  lastName: string;
  teamName: string;
  position: string | null;
  jerseyNumber: string | null;
  ovr: number;
  level: number;
  xpProgress: number;
  xpCurrent: number;
  xpMax: number;
  scrollY: SharedValue<number>;
  playerId?: string | null;  // ADD THIS
};
```

2. Add `playerId` to the destructured props:
```typescript
export default function HeroIdentityCard({
  firstName,
  lastName,
  // ... existing props ...
  playerId,  // ADD THIS
}: Props) {
```

3. Wrap the name block in a TouchableOpacity. Find the `nameBlock` View (around lines 113-118):

```typescript
// BEFORE:
<View style={styles.nameBlock}>
  <Text style={styles.playerLabel}>PLAYER</Text>
  <Text style={styles.nameFirst}>{firstName.toUpperCase()}</Text>
  <Text style={styles.nameLast}>{lastName.toUpperCase()}</Text>
</View>

// AFTER:
<TouchableOpacity
  style={styles.nameBlock}
  activeOpacity={0.8}
  onPress={() => router.push(playerId ? `/my-stats?playerId=${playerId}` as any : '/my-stats' as any)}
>
  <Text style={styles.playerLabel}>PLAYER</Text>
  <Text style={styles.nameFirst}>{firstName.toUpperCase()}</Text>
  <Text style={styles.nameLast}>{lastName.toUpperCase()}</Text>
</TouchableOpacity>
```

The `nameBlock` style already exists. Just change `<View>` to `<TouchableOpacity>`. No style changes needed.

**Now update PlayerHomeScroll to pass playerId:**

**File:** `components/PlayerHomeScroll.tsx`

Find where HeroIdentityCard is rendered (around line 299-311). Add `playerId`:

```typescript
<HeroIdentityCard
  firstName={data.firstName}
  lastName={data.lastName}
  teamName={data.primaryTeam?.name || ''}
  position={data.position}
  jerseyNumber={data.jerseyNumber}
  ovr={data.ovr}
  level={data.level}
  xpProgress={data.xpProgress}
  xpCurrent={data.xp}
  xpMax={(data.level) * 1000}
  scrollY={scrollY}
  playerId={playerId}
/>
```

`playerId` is already available in PlayerHomeScroll as a prop (line 99).

---

## CHANGE 2: Add Child Switcher Pill for Multi-Child Parents

**File:** `components/PlayerHomeScroll.tsx`

**Current behavior:** `onSwitchChild` is received as a prop (line 96, 99) but is NEVER rendered in the UI. It's a callback from DashboardRouter that clears the selected child, returning to ChildPickerScreen.

**Change:** When `onSwitchChild` exists (meaning multiple children), show a pill below the HeroIdentityCard that displays the current player's name with a dropdown arrow. Tapping it calls `onSwitchChild()` which returns to the child picker.

**Implementation:**

Find right after the HeroIdentityCard closing tag (after line ~311, before the MY TEAM card). Add:

```typescript
{/* ─── CHILD SWITCHER (multi-child parents only) ─── */}
{onSwitchChild && (
  <TouchableOpacity
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: 'rgba(75,185,236,0.12)',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(75,185,236,0.25)',
      marginBottom: 12,
    }}
    activeOpacity={0.7}
    onPress={onSwitchChild}
  >
    <Ionicons name="swap-horizontal-outline" size={14} color={PLAYER_THEME.accent} />
    <Text style={{
      fontSize: 13,
      fontWeight: '600',
      color: PLAYER_THEME.accent,
      fontFamily: FONTS?.bodySemiBold || undefined,
    }}>
      {displayName}
    </Text>
    <Ionicons name="chevron-down" size={12} color={PLAYER_THEME.accent} />
  </TouchableOpacity>
)}
```

**Check imports:** `Ionicons` and `FONTS` should already be imported in PlayerHomeScroll. `PLAYER_THEME` is defined at the top of the file. `displayName` is already computed (line 181). If `Ionicons` is not imported, add it.

**Behavior:** Tapping the pill calls `onSwitchChild()` → DashboardRouter clears `selectedChildId` → ChildPickerScreen renders → user picks a different child → PlayerHomeScroll re-renders with new playerId.

The pill only appears when `onSwitchChild` is defined, which only happens when there are multiple children (DashboardRouter line 219-220: `playerChildren.length > 1`). Single-child players and actual player accounts (not parent-viewing-as-player) will NOT see the pill.

---

## VERIFICATION

After both changes:
1. Run `npx tsc --noEmit` and report result
2. List files modified
3. Confirm the name tap navigates with playerId
4. Confirm the child switcher pill only renders when onSwitchChild exists

---

## MANUAL QA

| # | Test | Expected |
|---|------|----------|
| 1 | As player (Ava), tap the name "AVA TEST" on hero card | Navigates to My Stats showing Ava's stats |
| 2 | As parent viewing as player with multiple kids | See child switcher pill with name + ▼ below hero card |
| 3 | Tap the child switcher pill | Returns to "Who's Playing?" child picker |
| 4 | Pick a different child | Dashboard refreshes with new child's data |
| 5 | As single-child player | No switcher pill visible |
| 6 | OVR badge still tappable → My Stats | Still works (unchanged) |
| 7 | "View My Card" button still works | Still navigates to player-card (unchanged) |
