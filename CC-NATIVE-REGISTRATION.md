# CC-NATIVE-REGISTRATION.md
# Lynx Mobile — Native In-App Registration: The Full Experience

**Priority:** H2-04 — The front door for new families  
**Estimated time:** 8-10 hours (8 phases, commit after each)  
**Risk level:** HIGH — replacing existing registration flow, touching payment/waiver data

---

## WHAT THIS IS

The current registration is an old basic modal (first name, last name, DOB, age group) that pops up as a bottom sheet. No multi-child support, no waivers, no pre-populated data, no config-driven fields. It needs to be replaced with a full-screen, swipe-based registration experience that reads from the same `registration_config` the web form uses.

This is the FIRST thing a new family experiences in Lynx. It must look premium, feel effortless, and handle the complexity of multi-child, multi-sport registration without making parents feel overwhelmed.

---

## CRITICAL: KILL THE OLD REGISTRATION CARDS

The parent homepage has TWO ugly registration cards that have been flagged multiple times:
- "8 Open Registrations" (gray card with blue clipboard icon — looks like a system alert, not Lynx)
- "Summer 2026 Registration Open!" (slightly better but still generic)

**These must be REPLACED with a single, beautiful, on-brand registration entry point.** Options:
- A single branded card: "Register for Summer 2026" with team color accent, season dates, teal CTA button. If multiple seasons are open, show the most relevant one with "See all open seasons" link.
- OR: Remove both cards entirely and put registration access in the gesture drawer + a contextual prompt in the welcome area ("New season starting! Register [child name] →")

**The old `RegisterChildModal` (the bottom sheet popup) must be DELETED** after the new full-screen flow is built. Don't leave it around.

---

## REFERENCE FILES

1. `reference/supabase_schema.md` — Check `seasons.registration_config` JSONB structure, `registrations` table, `players` table, `player_parents` table, `waiver_signatures` table
2. `reference/design-references/brandbook/LynxBrandBook.html` — Brand system
3. `components/ParentHomeScroll.tsx` — Find and remove/replace the old registration cards
4. The web registration form (in volleybrain-admin repo or `reference/`) — Understand what `registration_config` contains and how the web renders it. The mobile form must render the SAME config.
5. `app/register/[seasonId].tsx` — Check if this file exists and what state it's in
6. Any existing `RegisterChildModal` or registration modal components — these get deleted after the new flow is built

---

## FORM UX — THE BEST POSSIBLE INPUT EXPERIENCE

This section applies to EVERY form field in the registration flow. The goal: a parent should be able to fill out the entire form with minimal tapping, no fighting the keyboard, and no confusion about formatting.

### Keyboard Behavior

**1. Auto-advance between fields:**
- When a parent finishes typing in First Name and taps "Next" on the keyboard, focus AUTOMATICALLY moves to Last Name. No dismiss → scroll → tap cycle.
- Use `returnKeyType="next"` on every text input except the last one in a group
- Use `onSubmitEditing` to programmatically focus the next input via refs
- The last field in each step uses `returnKeyType="done"` which dismisses the keyboard

```typescript
// Example: chain of refs for auto-advance
const lastNameRef = useRef<TextInput>(null);
const emailRef = useRef<TextInput>(null);

<TextInput
  placeholder="First name"
  returnKeyType="next"
  onSubmitEditing={() => lastNameRef.current?.focus()}
  blurOnSubmit={false}  // Don't dismiss keyboard between fields
/>
<TextInput
  ref={lastNameRef}
  placeholder="Last name"
  returnKeyType="next"
  onSubmitEditing={() => emailRef.current?.focus()}
  blurOnSubmit={false}
/>
```

**2. Keyboard avoidance:**
- Wrap each form step in `<KeyboardAvoidingView>` with `behavior="padding"` (iOS) or `behavior="height"` (Android)
- Better: use `react-native-keyboard-aware-scroll-view` which auto-scrolls the active field into view above the keyboard
- The active field should always be visible with at least 20px of breathing room above the keyboard
- The step indicator and any fixed headers should NOT scroll — only the form content scrolls

```typescript
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

<KeyboardAwareScrollView
  enableOnAndroid={true}
  extraScrollHeight={20}
  keyboardShouldPersistTaps="handled"
>
  {/* form fields */}
</KeyboardAwareScrollView>
```

**3. `keyboardShouldPersistTaps="handled"`** — This is CRITICAL. Without it, tapping a button while the keyboard is open requires TWO taps (first tap dismisses keyboard, second tap actually taps the button). With `"handled"`, buttons work on the first tap even when the keyboard is open.

### Smart Input Types

**Every field should use the appropriate keyboard type:**

| Field | `keyboardType` | `autoCapitalize` | `autoComplete` | `textContentType` |
|-------|---------------|-----------------|----------------|-------------------|
| First Name | `default` | `words` | `given-name` | `givenName` |
| Last Name | `default` | `words` | `family-name` | `familyName` |
| Email | `email-address` | `none` | `email` | `emailAddress` |
| Phone | `phone-pad` | `none` | `tel` | `telephoneNumber` |
| Address | `default` | `words` | `street-address` | `streetAddressLine1` |
| City | `default` | `words` | `address-level2` | `addressCity` |
| State | `default` | `characters` | `address-level1` | `addressState` |
| Zip | `number-pad` | `none` | `postal-code` | `postalCode` |

The `autoComplete` and `textContentType` props enable the OS keyboard to offer autofill suggestions from the device's saved data. A parent who has their info saved in their phone can autofill name + email + phone + address with ONE tap on the keyboard suggestion bar.

### Auto-Formatting

**Phone numbers** — format as the user types:
```typescript
function formatPhone(text: string): string {
  const cleaned = text.replace(/\D/g, '').slice(0, 10);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0,3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
}

// Usage:
<TextInput
  value={phone}
  onChangeText={(text) => setPhone(formatPhone(text))}
  keyboardType="phone-pad"
  placeholder="(555) 123-4567"
  maxLength={14}
/>
```

**Date of birth** — DO NOT use a text input with "MM/DD/YYYY" placeholder. Use a native date picker:
```typescript
import DateTimePicker from '@react-native-community/datetimepicker';

// Show a tappable field that opens the native date picker
<Pressable onPress={() => setShowDatePicker(true)}>
  <View style={styles.dateField}>
    <Text>{dob ? formatDate(dob) : 'Tap to select birthday'}</Text>
  </View>
</Pressable>

{showDatePicker && (
  <DateTimePicker
    value={dob || new Date(2012, 0, 1)} // Default to a reasonable year for youth sports
    mode="date"
    maximumDate={new Date()} // Can't be born in the future
    minimumDate={new Date(2005, 0, 1)} // Reasonable minimum for youth sports
    onChange={(event, date) => {
      setShowDatePicker(false);
      if (date) setDob(date);
    }}
  />
)}
```

The native date picker is:
- Scroll wheels on iOS (month/day/year wheels — familiar, fast)
- Calendar popup on Android (tap the year, then month, then day)
- Zero formatting errors — impossible to enter "13/32/2026"
- After selecting: display as "March 15, 2012" (human-readable, not MM/DD/YYYY)

**Zip code** — numeric keyboard, max 5 digits:
```typescript
<TextInput
  keyboardType="number-pad"
  maxLength={5}
  placeholder="75034"
/>
```

### Smart Defaults + Pre-fill

**Auto-detect age group from DOB:**
When the parent enters the child's birthday, auto-calculate and pre-select the appropriate age group. Show: "Based on [child]'s birthday (age 13), we recommend 14U."

**Address auto-complete (stretch goal):**
If you want to go the extra mile, use a places autocomplete (Google Places API or similar) for the address field. Parent starts typing their street → suggestions appear → tap to auto-fill street, city, state, zip. This eliminates 4 fields of typing.

**Pre-fill from device contacts (stretch goal):**
For emergency contact, offer "Choose from Contacts" → opens the device contact picker → auto-fills name + phone. Much faster than typing.

### Picker Fields (Dropdowns)

DO NOT use the default React Native `<Picker>`. It looks different on iOS vs Android and feels janky on both.

Instead, use tappable fields that open a bottom sheet with options:

```typescript
// Tappable field
<Pressable onPress={() => setShowGradePicker(true)}>
  <View style={styles.pickerField}>
    <Text style={grade ? styles.pickerValue : styles.pickerPlaceholder}>
      {grade || 'Select grade'}
    </Text>
    <ChevronDown size={16} />
  </View>
</Pressable>

// Bottom sheet picker
<BottomSheet visible={showGradePicker}>
  <FlatList
    data={['6th', '7th', '8th', '9th', '10th', '11th', '12th']}
    renderItem={({ item }) => (
      <Pressable onPress={() => { setGrade(item); setShowGradePicker(false); }}>
        <Text style={[styles.option, grade === item && styles.optionSelected]}>
          {item}
          {grade === item && <Check size={16} color={BRAND.teal} />}
        </Text>
      </Pressable>
    )}
  />
</BottomSheet>
```

For fields with few options (2-4 choices like Gender, Jersey Size), use pill selectors instead of dropdowns — they're faster (one tap vs tap to open + tap to select + tap to close).

### Validation

**Validate as the user leaves each field, not on submit:**
- Show a red border + error message immediately when the user tabs away from a required field that's empty
- Show a green checkmark when a field is valid
- Email: validate format on blur (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Phone: validate 10 digits on blur
- DOB: validate the child is between 5-18 years old

**Don't show errors before the user has had a chance to fill the field.** The field starts neutral (brand border), turns red only after they've focused and left it empty or with invalid data, turns green/teal after valid input.

### Swipe Between Steps

The swipe between registration steps should:
- Animate smoothly (300ms slide)
- Validate the current step before allowing advance
- If validation fails: shake the invalid fields, scroll to the first error
- "Back" swipe always works (no validation needed to go backwards)
- Keyboard dismisses on step transition
- Progress indicator updates in sync with the swipe animation

---

## DYNAMIC CONFIG + INCOMPLETE PROFILE DETECTION

### How Config Sync Works

The registration form reads `seasons.registration_config` from Supabase LIVE on every load. There is no cached copy. When an admin changes the config on the web (adds a field, removes a field, adds a waiver), the mobile form renders the updated version immediately on next open.

This means: admin adds "jersey number" to registration at 2pm, parent opens the app at 3pm, the form includes jersey number. Zero deployment needed.

### The Mid-Season Problem

When an admin adds a new required field after families have already registered, those existing registrations are missing that data. This creates an "incomplete profile" state that needs to be handled.

### Incomplete Profile Detection System

Build `lib/profile-completeness.ts`:

```typescript
interface CompletenessResult {
  isComplete: boolean;
  missingFields: { fieldKey: string; fieldLabel: string; required: boolean }[];
  completionPercentage: number;
}

async function checkProfileCompleteness(
  playerId: string,
  seasonId: string
): Promise<CompletenessResult> {
  // 1. Fetch the current registration_config for this season
  // 2. Fetch the player's existing data (from players table + registration_data JSONB)
  // 3. Compare: for every enabled+required field in the config,
  //    check if the player has a value
  // 4. Return the missing fields list and completion percentage
}
```

### Parent Notification for Missing Fields

When the completeness check finds missing required fields:

**On the Parent Home Scroll:**
- Show an "Incomplete Registration" card (Tier 1, coral accent — needs attention)
- "[Child name]'s profile is missing some info"
- "Jersey number, medical notes needed"
- "Complete Profile →" button
- Tap → opens a SHORT form showing ONLY the missing fields (not the entire registration again)

**Push notification (if admin triggers it):**
- Admin goes to Registration Hub → sees "12 players missing jersey number"
- "Send Reminder" button → pushes notification to affected parents
- Notification: "Coach needs your child's jersey size! Tap to update."

**The "Complete Profile" mini-form:**
- NOT the full registration flow again — just the missing fields
- Pre-populated with everything already on file
- "Update" button saves to the player record and registration_data
- Success: "Profile updated!" with green checkmark
- The home scroll card disappears once all required fields are filled

### Admin View: Missing Data Dashboard

In the admin Registration Hub or a new section:
- "Profile Completeness" card showing:
  - "15/17 players complete (88%)"
  - "2 players missing: jersey number"
  - List of players with missing fields
  - "Send Reminder to All" button → batch push notification
  - "Send Reminder" per player

### When Fields Are REMOVED from Config

If an admin removes a field (e.g., removes "school" from required fields):
- Existing data stays in the database (never delete data)
- The field just stops appearing on the registration form
- The completeness check ignores removed fields
- No notification needed — nothing is "missing"

### When Waivers Are Added Mid-Season

If an admin adds a new waiver after families registered:
- The completeness check flags it: "New waiver requires signature"
- Parent sees: "A new waiver has been added. Please review and sign."
- Tap → shows ONLY the new waiver (not all waivers again)
- After signing → stored in waiver_signatures → complete

---

The `seasons.registration_config` is a JSONB column set by admins on the web. It typically includes:

```typescript
interface RegistrationConfig {
  // Which fields to show
  fields: {
    player_info: {
      first_name: { enabled: true, required: true };
      last_name: { enabled: true, required: true };
      date_of_birth: { enabled: true, required: true };
      gender: { enabled: boolean, required: boolean };
      grade: { enabled: boolean, required: boolean };
      school: { enabled: boolean, required: boolean };
      position: { enabled: boolean, required: boolean };
      experience_years: { enabled: boolean, required: boolean };
      jersey_size: { enabled: boolean, required: boolean };
      medical_notes: { enabled: boolean, required: boolean };
    };
    parent_info: {
      name: { enabled: true, required: true };
      email: { enabled: true, required: true };
      phone: { enabled: true, required: true };
      address: { enabled: boolean, required: boolean };
    };
    emergency_contact: {
      name: { enabled: boolean, required: boolean };
      phone: { enabled: boolean, required: boolean };
      relationship: { enabled: boolean, required: boolean };
    };
  };
  // Waivers to sign
  waivers: {
    liability: { enabled: boolean, text: string };
    photo_release: { enabled: boolean, text: string };
    medical: { enabled: boolean, text: string };
    custom: { enabled: boolean, title: string, text: string }[];
  };
  // Custom questions
  custom_questions: {
    id: string;
    question: string;
    type: 'text' | 'select' | 'checkbox';
    options?: string[];
    required: boolean;
  }[];
  // Fees
  fees: {
    registration_fee: number;
    uniform_fee?: number;
    monthly_dues?: number;
    months_in_season?: number;
  };
  // Age groups available
  age_groups: string[]; // ['11U', '12U', '13U', '14U']
}
```

**If `registration_config` is null:** Fall back to a default config with basic fields (name, DOB, age group, parent contact).

---

## PHASE 1: AUDIT + CLEANUP

### 1A. Check what exists

```bash
# Does the new registration screen exist?
ls -la app/register/[seasonId].tsx 2>/dev/null
wc -l app/register/\[seasonId\].tsx 2>/dev/null

# Does it use registration_config?
grep -n "registration_config\|registrationConfig" app/register/\[seasonId\].tsx 2>/dev/null

# Find the old registration modal
grep -rn "RegisterChild\|registerChild\|Register.*Modal\|registration.*modal" --include="*.tsx" app/ components/ | grep -v "node_modules" | grep -v "reference/"

# Find the ugly homepage cards
grep -rn "Open Registration\|Registration Open\|RegistrationBanner\|RegistrationCard" --include="*.tsx" components/ParentHomeScroll.tsx components/ app/ | grep -v "node_modules" | grep -v "reference/"
```

### 1B. Document findings

Report what exists before changing anything. If `app/register/[seasonId].tsx` already has some implementation, document how far it got.

### 1C. Read the registration_config

```bash
# Check the schema for the config structure
grep -A 20 "registration_config" reference/supabase_schema.md 2>/dev/null
```

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 1: registration audit - document existing state"
git push
```

---

## PHASE 2: BUILD THE SEASON SELECTOR

Before the registration form, the parent needs to choose WHAT to register for.

### 2A. Create `app/registration-start.tsx`

**Route:** `/registration-start`

**This replaces tapping either of the old homepage cards.**

**Full-screen, branded layout:**

- Back button (top-left)
- Lynx mascot (`Meet-Lynx.png`, 100px) centered at top
- "Register Your Child" title (large, bold)
- "Choose a season to get started" subtitle

**Season cards (scrollable):**
For each open season (where `registration_open = true` and `registration_close_date` hasn't passed):

Each card:
- Season name (bold): "Summer 2026"
- Sport icon + sport name
- Date range: "May 1 - Aug 15, 2026"
- Registration deadline: "Closes Apr 15" (coral if < 7 days)
- Fee preview: "Starting at $150/player"
- Age groups available: pill badges "11U 12U 13U 14U"
- Team spots remaining (if tracked): "8 spots left in 14U"
- "Register →" teal CTA button

If only ONE season is open: skip this screen entirely, go straight to the registration form.

If NO seasons are open: Lynx mascot (`SleepLynx.png`) + "No open registrations right now. Check back soon!"

**Tap a season card →** navigates to `/register/${seasonId}`

### 2B. Replace homepage cards

In `components/ParentHomeScroll.tsx`:

**DELETE** the "8 Open Registrations" card and the "Summer 2026 Registration Open!" card.

**REPLACE with a single branded card** (only shows when open registrations exist):
- Teal left border accent
- Season icon + "Summer 2026 Registration"
- "Register [child name] →" if parent has existing children
- OR "Register your child →" if new parent
- Tap → `/registration-start`
- If 0 open seasons: card doesn't render (nothing, not an empty state)

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 2: season selector screen, replace ugly homepage registration cards"
git push
```

---

## PHASE 3: THE REGISTRATION FORM — SWIPE STEPS

### 3A. Create/rebuild `app/register/[seasonId].tsx`

**Route:** `/register/${seasonId}`

**Full-screen, swipe-based, step indicator at top.**

The form reads `registration_config` from the selected season and dynamically renders steps based on what's enabled.

**Step indicator:** Dots or a progress bar showing current step / total steps. Steps vary based on config (if waivers are disabled, that step is skipped).

### Step 1: PLAYER INFO

**Pre-populated if parent has existing children:**
- "Register a new child" OR "Register [existing child name] for this season"
- If registering an existing child: SKIP this step entirely (data already known), go to Step 2
- If new child: show the form fields

**Form fields (rendered dynamically from config):**
- First Name * (text input)
- Last Name * (text input)
- Date of Birth * (date picker — NOT a text input with MM/DD/YYYY placeholder)
- Gender (if enabled in config)
- Grade (if enabled — dropdown)
- School (if enabled — text input)
- Position preference (if enabled — dropdown with sport-specific positions)
- Experience (if enabled — "years played" stepper)
- Jersey size (if enabled — dropdown S/M/L/XL)
- Medical notes (if enabled — text area)

**Multi-child:** "Add Another Child" button at the bottom of this step. Adds a second child form (collapsible). Shared parent info entered once in Step 2.

### Step 2: PARENT & EMERGENCY INFO

**Pre-populated from the logged-in parent's profile:**
- Parent name (pre-filled, editable)
- Email (pre-filled, editable)
- Phone (pre-filled, editable)
- Address (if enabled — pre-filled if on file)
- Emergency contact name (if enabled)
- Emergency contact phone (if enabled)
- Emergency contact relationship (if enabled — dropdown: Grandparent, Aunt/Uncle, Neighbor, Other)

**The parent should see their info pre-filled and just confirm it.** "Looks right? Swipe to continue." Most parents won't need to change anything.

### Step 3: AGE GROUP SELECTION

- Available age groups from config as large tappable cards (not pills — cards with descriptions)
- Each card: "14U" + "Ages 13-14" + spots remaining if tracked
- If the child's DOB auto-determines the age group, pre-select it and show "Based on [child]'s birthday"
- Coach assignment (if visible): "Coach: Carlos F." on the age group card

### Step 4: CUSTOM QUESTIONS (if any in config)

- Rendered dynamically from `registration_config.custom_questions`
- Text questions → text input
- Select questions → dropdown or pill selector
- Checkbox questions → toggle
- Skip this step entirely if no custom questions configured

### Step 5: WAIVERS (if any enabled in config)

- Each waiver: scrollable text content + signature area at bottom
- Signature: canvas drawing pad (finger signature) OR typed name checkbox ("I, [Name], agree to the above")
- Each waiver must be individually signed
- "Liability Waiver" → sign → "Photo Release" → sign → etc.
- Waiver text scrolls within a fixed-height container
- "I have read and agree" checkbox before signature becomes active
- Skip this step if no waivers enabled

### Step 6: FEE SUMMARY + CONFIRM

- Itemized fee breakdown:
  - Registration fee: $150
  - Uniform fee: $50 (if applicable)
  - Monthly dues: $75 x 4 months = $300 (if applicable)
  - **Total: $500**
- If multi-child: show per-child breakdown + combined total
- Payment method: "Pay Now" (if Stripe is connected) or "Pay Later" (invoice)
- If "Pay Later": registration submitted, payment status = pending
- If "Pay Now": integrate with existing Stripe payment flow

**Confirmation:**
- "Submit Registration" button (teal, large)
- On submit: create records in `registrations`, `players` (if new), `player_parents`, `waiver_signatures`
- Loading state while submitting

### Step 7: SUCCESS

- Full-screen celebration
- `celebrate.png` mascot centered
- "You're registered!" title
- "[Child name] is signed up for Summer 2026!"
- If multi-child: "[Child 1] and [Child 2] are signed up!"
- Summary: season, age group, payment status
- "What's next" guidance:
  - "You'll receive a confirmation email"
  - "Team assignments coming soon"
  - "Complete any outstanding payments" (if pay later)
- "Go Home" button

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 3: full registration form - 7 swipe steps, config-driven, pre-populated, multi-child"
git push
```

---

## PHASE 4: MULTI-CHILD EXPERIENCE

### 4A. Adding siblings

On Step 1, after entering the first child's info:
- "Add Another Child" button (outlined, with + icon)
- Tap → a second child form appears (collapsed by default, tap to expand)
- Each child has their own: name, DOB, gender, grade, position, age group
- Shared across children: parent info, emergency contact, address
- Can add up to 5 children in one registration
- "Remove" button on each additional child (not the first one)
- Child tabs or accordion at the top to switch between children

### 4B. Returning family detection

On form load, check if the logged-in parent has existing children:

```typescript
const existingChildren = await supabase
  .from('player_parents')
  .select('player_id, players(first_name, last_name, date_of_birth, ...)')
  .eq('parent_id', userId);
```

If existing children found:
- Show them as cards: "[Child name] — already registered for Spring 2026"
- "Register [Child name] for Summer 2026" button → pre-fills ALL their info, skips Step 1
- "Register a new child" option below

### 4C. Fee calculation for multi-child

- Show running total as children are added
- If the org has sibling discounts (check config): apply and show "Sibling discount: -$25"
- Fee summary on Step 6 shows per-child breakdown

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 4: multi-child registration, returning family detection, sibling fees"
git push
```

---

## PHASE 5: WAIVER SIGNING WITH TOUCH SIGNATURE

### 5A. Signature component

Create `components/SignaturePad.tsx`:
- Canvas-based drawing area (react-native-signature-canvas or similar)
- "Clear" button to reset
- The signature captures as a base64 PNG
- Stored in `waiver_signatures.signature_data`
- Fallback: if signature canvas doesn't work (some devices), offer "Type your full name to sign" checkbox

### 5B. Waiver flow

Each waiver enabled in the config:
- Waiver title (bold)
- Waiver text (scrollable, max-height container)
- Scroll indicator: "Scroll to read the full waiver"
- After scrolling to bottom: "I have read and agree" checkbox activates
- After checking: signature pad appears
- After signing: green checkmark + "Signed" badge
- "Next Waiver" button (or auto-advance)

### 5C. Store signatures

```typescript
await supabase.from('waiver_signatures').insert({
  player_id: childId,
  season_id: seasonId,
  waiver_type: 'liability', // or 'photo_release', 'medical', 'custom'
  signed_by: parentId,
  signature_data: base64Signature,
  signed_at: new Date().toISOString(),
});
```

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 5: waiver signing with touch signature pad, per-waiver flow"
git push
```

---

## PHASE 6: DATA SUBMISSION + ADMIN HUB ENRICHMENT

### 6A. Submit registration data

On "Submit Registration":

```typescript
// For each child:
// 1. Create or update player record
// 2. Create player_parents link
// 3. Create registration record with full registration_data JSONB
// 4. Create waiver_signatures for each signed waiver
// 5. Create payment record (pending or paid)
// 6. If team auto-assignment is configured: assign to team
```

The `registration_data` JSONB should store EVERYTHING:
- All form field values
- Custom question answers
- Waiver signatures (references)
- Fee breakdown
- Source: 'mobile_native'
- Submitted at timestamp
- Device info (optional)

### 6B. Admin registration hub enrichment

In `app/registration-hub.tsx` (admin view):
- Show the full `registration_data` when viewing a registration
- Custom answers visible in the detail view
- Waiver status: signed/unsigned per waiver type
- Source badge: "Mobile" or "Web" so admin knows where it came from
- Sibling grouping: registrations from the same family shown together with a family badge

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 6: registration data submission, admin hub enrichment with full JSONB display"
git push
```

---

## PHASE 7: DELETE OLD REGISTRATION + WIRE NAVIGATION

### 7A. Delete the old registration modal

```bash
# Find and delete the old modal
grep -rn "RegisterChild\|registerChild\|Register.*Modal" --include="*.tsx" components/ app/ | grep -v "node_modules" | grep -v "reference/"
```

Delete the old component file(s). Remove any imports that reference it. Any button that opened the old modal should now navigate to `/registration-start`.

### 7B. Wire all navigation entry points

| From | Action | Destination |
|------|--------|-------------|
| Parent Home Scroll | Registration card tap | `/registration-start` |
| Parent Home Scroll | "Register [child]" in welcome area | `/registration-start` |
| Gesture Drawer (Parent) | "Registration" | `/registration-start` |
| Season banner / notification | "Register now" | `/register/${seasonId}` (direct to form) |
| Admin sends registration link | Deep link | `/register/${seasonId}` |

### 7C. Verify old modal is gone

```bash
# Should return 0 results
grep -rn "RegisterChildModal\|registerChildModal\|RegisterModal" --include="*.tsx" app/ components/ | grep -v "node_modules" | grep -v "reference/" | wc -l
```

```bash
npx tsc --noEmit
git add -A
git commit -m "Phase 7: delete old registration modal, wire all navigation to new flow"
git push
```

---

## PHASE 8: VISUAL POLISH + VERIFY

### 8A. Brand pass on all registration screens

- Registration start (season selector): brand cards, mascot, proper spacing
- Each form step: brand input styling, brand buttons, brand section headers
- Step indicator: matches brand pill/dot pattern
- Success screen: celebrate.png mascot, confetti feel, teal accents
- All text: FONTS tokens
- All colors: BRAND tokens
- Large tap targets on all form elements (≥44px)

### 8B. Test scenarios

1. New parent, one child, basic config → form should be short (3-4 steps)
2. Returning parent, existing child → data pre-filled, minimal input needed
3. Multi-child registration → 2 children, shared parent info, combined fees
4. Full config (all fields, waivers, custom questions) → all steps render
5. No open seasons → proper empty state
6. Single open season → skip season selector, go straight to form

### 8C. Verify

```bash
# 1. TypeScript clean
npx tsc --noEmit 2>&1 | grep -v "reference\|design-reference" | tail -10

# 2. New screens exist
ls -la app/registration-start.tsx
ls -la app/register/\[seasonId\].tsx

# 3. Old modal deleted
grep -rn "RegisterChildModal" --include="*.tsx" app/ components/ | grep -v "node_modules" | wc -l
# Expected: 0

# 4. Old homepage cards gone
grep -rn "8 Open Registration\|Registration Open!" --include="*.tsx" components/ParentHomeScroll.tsx | wc -l
# Expected: 0

# 5. Config-driven
grep -n "registration_config\|registrationConfig" app/register/\[seasonId\].tsx | head -5
# Expected: reads and renders from config

# 6. Pre-populated data
grep -n "pre.*fill\|prefill\|existing.*child\|player_parents" app/register/\[seasonId\].tsx | head -5
# Expected: queries existing data

# 7. Waiver signing
grep -n "signature\|SignaturePad\|waiver_signatures" app/register/\[seasonId\].tsx components/SignaturePad.tsx | head -5
# Expected: signature component used

git add -A
git commit -m "Phase 8: registration visual polish and verification"
git push
```

---

## PHASE 9: INCOMPLETE PROFILE DETECTION + NOTIFICATIONS

### 9A. Build `lib/profile-completeness.ts`

The completeness checker that compares current registration_config against existing player data. Returns missing fields, completion percentage, and whether new waivers need signing.

### 9B. Build the "Complete Profile" mini-form

`app/complete-profile.tsx` — Route: `/complete-profile?playerId=X&seasonId=Y`

Shows ONLY the missing fields, not the entire registration. Pre-populated with everything already on file. Same smart form UX (auto-advance, auto-format, native pickers). "Update" button saves and dismisses.

### 9C. Parent Home Scroll integration

Add an "Incomplete Registration" card to ParentHomeScroll when missing required fields are detected. Coral accent, "needs attention" energy. Tap → `/complete-profile`.

Run the completeness check on home scroll mount (debounced, not on every render).

### 9D. Admin "Missing Data" view

In the admin Registration Hub, add a "Profile Completeness" section:
- Percentage complete across all players
- List of players with missing fields
- "Send Reminder" per player or batch
- "Send Reminder" triggers a push notification to the parent

### 9E. Verify

```bash
ls -la lib/profile-completeness.ts
ls -la app/complete-profile.tsx
grep -n "completeness\|missingFields\|incomplete" components/ParentHomeScroll.tsx | head -5

npx tsc --noEmit
git add -A
git commit -m "Phase 9: incomplete profile detection, mini-form for missing fields, admin missing data view"
git push
```

---

## EXPECTED RESULTS

1. **Old registration modal DELETED** — the bottom sheet popup is gone forever
2. **Old homepage cards KILLED** — replaced with a single branded registration card
3. **Season Selector** — beautiful full-screen with season cards, sport icons, fee previews, spots remaining
4. **7-Step Swipe Form** — config-driven, dynamically renders based on admin web config
5. **Best-in-class form UX** — keyboard auto-advance, auto-formatting (phone, dates), native pickers, inline validation, OS autofill support
6. **Pre-populated Data** — logged-in parent's info auto-filled, existing children detected for re-enrollment
7. **Multi-Child** — add siblings in one flow, shared parent info, combined fee summary with sibling discounts
8. **Touch Signature Waivers** — scroll to read, checkbox to agree, finger-draw signature
9. **Fee Summary** — itemized per-child breakdown with total, pay now or pay later
10. **Success Celebration** — celebrate.png mascot, next steps guidance
11. **Dynamic Config Sync** — admin changes config on web, mobile form updates immediately
12. **Incomplete Profile Detection** — admin adds fields mid-season, existing parents get notified to fill in missing info via a mini-form (not the full registration again)
13. **Admin Missing Data Dashboard** — see which players are missing data, send batch reminders
14. **New waiver handling** — admin adds waiver mid-season, parents get prompted to sign only the new one
15. **9 commits** — one per phase, each pushed
