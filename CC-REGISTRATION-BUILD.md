# CC-REGISTRATION-BUILD.md
## Lynx Mobile — Native Registration + Priority Gaps Build
### Autonomous Build Plan — Run Start to Finish

**BEFORE ANYTHING ELSE:** Read `CC-LYNX-RULES.md` in the project root. All 15 rules apply. Read `SCHEMA_REFERENCE.csv` for table/column verification. Read existing files before modifying them.

**Branch:** Create a new branch for this work:
```bash
git checkout -b feat/native-registration
```

---

## OVERVIEW

This build delivers 5 priorities in one autonomous run:

| Priority | What | Phases |
|----------|------|--------|
| P1 | Native in-app registration form (config-driven, multi-child, waivers) | 1–7 |
| P2 | Admin hub enrichment (show full registration_data, custom answers, signatures) | 8 |
| P3 | Family/sibling grouping in admin hub | 8 |
| P4 | Account creation bridge (web reg success → app account) | 9 |
| P5 | Returning family pre-fill | Built into P1 phases |

**Total: 10 phases, each committed and pushed.**

---

## DESIGN PRINCIPLES

### Parent Experience — "Stupidly Easy"
- If a parent has registered before, their info pre-fills. They just verify and submit.
- If registering a second child, shared info (parent, emergency, medical) carries over. They only enter child-specific fields.
- If registering for a new sport/season, all family info carries over. Only sport-specific fields need attention.
- The form reads dynamic config from the database — shows exactly what the admin configured, nothing more.
- Fee breakdown is always visible. No surprises.

### Branding — Dual Layer
- **Organization branding first:** Use `organizations.logo_url`, `organizations.primary_color`, and `organizations.name` to brand the registration header. The parent should feel like they're registering with Black Hornets (or whatever org), not with "a generic app."
- **Subtle Lynx branding:** Small "Powered by Lynx" footer with the lynx icon at the bottom of the form. The mascot appears on the success screen. This is marketing — every parent sees the Lynx name.
- **Sport-aware theming:** Use `sports.color_primary` as an accent tint for the progress bar and section headers during registration. If the sport is volleyball, the accent might be one color; basketball another.

### Data Architecture
- The form writes to the SAME tables and columns as the web form
- `registrations.registration_source = 'mobile'` to distinguish from web
- `registrations.registration_data` JSONB stores the complete form snapshot (identical structure to web)
- `families` table links siblings
- `player_parents` links children to the logged-in parent's profile
- ALL queries must be verified against `SCHEMA_REFERENCE.csv`

---

## DATABASE TABLES REFERENCE

**Read from:**
- `seasons` — `registration_config` (JSONB), fee columns, registration_open, sport_id, organization_id
- `season_fees` — fee templates (fee_type, fee_name, amount, due_date)
- `organizations` — name, logo_url, primary_color, slug
- `sports` — name, icon, code, color_primary
- `families` — for returning family lookup (by account_id or primary_email)
- `players` — for returning player detection (by family_id or parent_email)
- `player_parents` — to find logged-in parent's existing children
- `registration_templates` — fallback if season doesn't have registration_config but has registration_template_id
- `profiles` — logged-in user's name, email, phone for pre-fill

**Write to:**
- `players` — one record per child
- `registrations` — one record per child (status: 'new')
- `families` — one record per family (created or reused)
- `player_parents` — link each child to logged-in parent

---

## DEFAULT_CONFIG

If `seasons.registration_config` is null AND `seasons.registration_template_id` is null, use this default:

```typescript
export const DEFAULT_REGISTRATION_CONFIG = {
  player_fields: {
    first_name: { enabled: true, required: true, label: 'First Name' },
    last_name: { enabled: true, required: true, label: 'Last Name' },
    birth_date: { enabled: true, required: true, label: 'Date of Birth' },
    gender: { enabled: true, required: false, label: 'Gender' },
    grade: { enabled: true, required: false, label: 'Grade' },
    school: { enabled: true, required: false, label: 'School' },
  },
  parent_fields: {
    parent1_name: { enabled: true, required: true, label: 'Parent/Guardian Name' },
    parent1_email: { enabled: true, required: true, label: 'Email' },
    parent1_phone: { enabled: true, required: true, label: 'Phone' },
  },
  emergency_fields: {
    emergency_name: { enabled: true, required: true, label: 'Emergency Contact Name' },
    emergency_phone: { enabled: true, required: true, label: 'Emergency Phone' },
    emergency_relation: { enabled: true, required: false, label: 'Relationship' },
  },
  medical_fields: {
    medical_conditions: { enabled: true, required: false, label: 'Medical Conditions/Allergies' },
  },
  waivers: {
    liability: { enabled: true, required: true, title: 'Liability Waiver', text: 'I understand and accept the risks associated with participation in athletic activities.' },
    photo_release: { enabled: true, required: false, title: 'Photo/Video Release', text: 'I consent to photos and videos being taken and used for promotional purposes.' },
    code_of_conduct: { enabled: true, required: false, title: 'Code of Conduct', text: 'I agree to follow the organization\'s code of conduct and sportsmanship guidelines.' },
  },
  custom_questions: []
};
```

**Config loading priority:**
1. `season.registration_config` (JSONB directly on the season)
2. If null, check `season.registration_template_id` → load from `registration_templates` table
3. If both null, use `DEFAULT_REGISTRATION_CONFIG`

---

## FIELD_ORDER

Controls the display order of dynamic fields (matches the web form exactly):

```typescript
const FIELD_ORDER = {
  player_fields: [
    'first_name', 'last_name', 'birth_date', 'gender', 'grade', 'school',
    'shirt_size', 'jersey_size', 'shorts_size', 'preferred_number',
    'position_preference', 'experience_level', 'previous_teams', 'height', 'weight'
  ],
  parent_fields: [
    'parent1_name', 'parent1_email', 'parent1_phone',
    'parent2_name', 'parent2_email', 'parent2_phone',
    'address', 'city', 'state', 'zip'
  ],
  emergency_fields: [
    'emergency_name', 'emergency_phone', 'emergency_relation',
    'emergency2_name', 'emergency2_phone'
  ],
  medical_fields: [
    'medical_conditions', 'allergies', 'medications',
    'doctor_name', 'doctor_phone', 'insurance_provider', 'insurance_policy'
  ]
};
```

---

## PLAYER TABLE COLUMN MAPPING

When inserting a player, map form fields to these `players` table columns. Verify EVERY column name against `SCHEMA_REFERENCE.csv` before using:

```typescript
// Player-specific fields (per child)
first_name, last_name, birth_date, grade, gender, school,
position, experience_level, experience_details, goals,
uniform_size_jersey, uniform_size_shorts, jersey_pref_1, jersey_pref_2, jersey_pref_3,
player_type, returning_player, sport_id, season_id, family_id,
photo_url, city, state, zip,

// Parent info (from shared info, stored on each player record too)
parent_name, parent_email, parent_phone,
parent_2_name, parent_2_email, parent_2_phone,
// NOTE: players table has BOTH parent_2_* and parent2_* columns. Use parent_2_* (with underscore) as that's what the web form uses.

// Emergency (from shared info)
emergency_contact_name, emergency_contact_phone, emergency_contact_relation,

// Medical (from shared info)
medical_conditions, allergies, medications,

// Waiver flags
waiver_liability, waiver_photo, waiver_conduct,
waiver_signed_by, waiver_signed_date,

// Meta
registration_source: 'mobile',
registration_date: new Date().toISOString(),
status: 'new',
```

---

## PHASES

### PHASE 1: File Structure + Config Loading + Helpers
**Goal:** Create the registration screen, load config, build the reusable field renderer.

**New files:**
- `app/register/[seasonId].tsx` — The main registration wizard screen
- `lib/registration-config.ts` — DEFAULT_CONFIG, FIELD_ORDER, config loading helper, field renderer types

**`lib/registration-config.ts` contents:**
1. Export `DEFAULT_REGISTRATION_CONFIG` (from above)
2. Export `FIELD_ORDER` (from above)
3. Export types:
   ```typescript
   type FieldConfig = { enabled: boolean; required: boolean; label: string };
   type WaiverConfig = { enabled: boolean; required: boolean; title: string; text: string };
   type CustomQuestion = { question: string; required: boolean };
   type RegistrationConfig = {
     player_fields: Record<string, FieldConfig>;
     parent_fields: Record<string, FieldConfig>;
     emergency_fields: Record<string, FieldConfig>;
     medical_fields: Record<string, FieldConfig>;
     waivers: Record<string, WaiverConfig>;
     custom_questions: CustomQuestion[];
   };
   ```
4. Export `loadRegistrationConfig(seasonId: string)` async function:
   - Fetches season with org, sport, season_fees
   - Resolves config (season.registration_config → template → default)
   - Returns `{ season, organization, sport, config, fees }`

**`app/register/[seasonId].tsx` skeleton:**
1. Use `useLocalSearchParams()` to get `seasonId`
2. On mount, call `loadRegistrationConfig(seasonId)`
3. State: `currentStep` (0–5), `loading`, `error`, `children[]`, `sharedInfo{}`, `waiverState{}`, `customAnswers{}`, `signature`
4. Render: Header with org branding → Step indicator → Step content → Footer with Back/Next
5. Steps array — dynamically skip steps that have no enabled fields:
   ```typescript
   const steps = [
     { key: 'children', label: 'Your Children' },
     { key: 'player', label: 'Player Info' },
     { key: 'parent', label: 'Parent/Guardian' },
     { key: 'emergency', label: 'Emergency & Medical' },
     { key: 'waivers', label: 'Waivers' },
     { key: 'review', label: 'Review & Submit' },
   ].filter(step => {
     // Skip steps with no enabled fields
     if (step.key === 'waivers') return Object.values(config.waivers).some(w => w.enabled);
     if (step.key === 'emergency') return Object.values(config.emergency_fields).some(f => f.enabled) || Object.values(config.medical_fields).some(f => f.enabled);
     return true;
   });
   ```

**Header design (org-branded):**
```
┌─────────────────────────────────────┐
│ [←]                                 │
│                                     │
│   [Org Logo]                        │
│   Organization Name                 │
│   🏐 Spring 2026 Volleyball        │
│                                     │
│   ════════════○═══════════════      │  ← Progress bar using sport color
│   Step 1 of 6                       │
├─────────────────────────────────────┤
```

- Org logo: Use `<Image source={{ uri: organization.logo_url }} />` with fallback to first letter of org name in a colored circle using `organization.primary_color`
- Sport icon + season name
- Progress bar tinted with `sport.color_primary` or `organization.primary_color` as fallback
- Step label below the progress bar

**Footer design:**
```
├─────────────────────────────────────┤
│  [← Back]              [Next →]    │
│                                     │
│        Powered by 🐱 Lynx          │  ← Subtle branding, small text
└─────────────────────────────────────┘
```

**Commit:**
```bash
git add -A && git commit -m "feat: Registration Phase 1 - wizard shell, config loading, types, org-branded header" && git push origin feat/native-registration
```

---

### PHASE 2: Step 1 — Child Management + Returning Family Detection
**Goal:** Let parents add children. Pre-fill from previous registrations.

**On step mount, detect returning family:**
```typescript
// 1. Check player_parents for this user's existing children
const { data: linkedPlayers } = await supabase
  .from('player_parents')
  .select('player_id, players(id, first_name, last_name, grade, birth_date, gender, school, family_id, uniform_size_jersey, uniform_size_shorts, jersey_pref_1, sport_id)')
  .eq('parent_id', profile.id);

// 2. Check families table by account_id
const { data: family } = await supabase
  .from('families')
  .select('*')
  .eq('account_id', user.id)
  .limit(1)
  .maybeSingle();

// 3. If family found, pre-fill shared info from family record
if (family) {
  setSharedInfo({
    parent1_name: family.primary_contact_name || profile.full_name,
    parent1_email: family.primary_contact_email || user.email,
    parent1_phone: family.primary_contact_phone || profile.phone,
    parent2_name: family.secondary_contact_name || '',
    parent2_email: family.secondary_contact_email || '',
    parent2_phone: family.secondary_contact_phone || '',
    address: family.address || '',
    emergency_name: family.emergency_contact_name || profile.emergency_contact_name || '',
    emergency_phone: family.emergency_contact_phone || profile.emergency_contact_phone || '',
    emergency_relation: family.emergency_contact_relation || profile.emergency_contact_relation || '',
  });
  setExistingFamilyId(family.id);
}

// 4. If no family but profile has data, pre-fill from profile
if (!family) {
  setSharedInfo({
    parent1_name: profile.full_name || '',
    parent1_email: user.email || '',
    parent1_phone: profile.phone || '',
    emergency_name: profile.emergency_contact_name || '',
    emergency_phone: profile.emergency_contact_phone || '',
    emergency_relation: profile.emergency_contact_relation || '',
  });
}
```

**Returning children UI:**
```
┌─────────────────────────────────────┐
│  YOUR CHILDREN                      │
│                                     │
│  Returning Players                  │
│  ┌─────────────────────────────┐    │
│  │ ☐ Sofia Fuentez             │    │
│  │   Grade 7 · Volleyball      │    │
│  │   Previously: Fall 2025     │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ ☐ Marcus Fuentez            │    │
│  │   Grade 5 · Volleyball      │    │
│  │   Previously: Fall 2025     │    │
│  └─────────────────────────────┘    │
│                                     │
│  [ + Register a New Child ]         │
│                                     │
│  ─────────────────────────────────  │
│  Selected: 2 children               │
│  Est. fees: $335 × 2 = $670        │
└─────────────────────────────────────┘
```

- Returning players: Checkbox to select. Pre-fills their player_fields from previous data. Badge shows "Returning".
- "Register a New Child" — Adds a blank child to the list. Opens Step 2 for that child.
- Fee preview: Calculate from `season_fees` table. Show per-child and total.
- Store `selectedReturningIds[]` and `newChildren[]` separately.
- When a returning child is selected, deep-copy their data so the parent can edit (e.g., grade changed, new jersey size).
- Minimum 1 child selected or added to proceed.

**Commit:**
```bash
git add -A && git commit -m "feat: Registration Phase 2 - child management, returning family detection, fee preview" && git push origin feat/native-registration
```

---

### PHASE 3: Step 2 — Player Info (Config-Driven Dynamic Form)
**Goal:** Render the per-child player fields from config.

**Dynamic field renderer function:**
Build a reusable `renderDynamicField(key, fieldConfig, value, onChange)` that returns the correct input:

| Field Key | Input Type | Notes |
|-----------|-----------|-------|
| `first_name`, `last_name`, `school`, `previous_teams` | TextInput | Standard text |
| `birth_date` | DateTimePicker | `@react-native-community/datetimepicker` — show a button that opens the picker, display formatted date |
| `grade` | Picker/Modal | Options: K, 1–12. Use a bottom sheet or Modal with a list |
| `gender` | Picker/Modal | Options: Male, Female |
| `shirt_size`, `jersey_size`, `shorts_size` | Picker/Modal | Options: YS, YM, YL, AS, AM, AL, AXL, AXXL |
| `preferred_number` | TextInput numeric | `keyboardType="number-pad"`, max 2 digits |
| `position_preference` | TextInput or Picker | Depends on sport. For volleyball: Setter, Libero, Outside, Middle, etc. |
| `experience_level` | Picker/Modal | Options: Beginner, Intermediate, Advanced, Elite |
| `height`, `weight` | TextInput numeric | |

**Field rendering rules:**
1. Only render fields where `config.player_fields[key]?.enabled === true`
2. Use `FIELD_ORDER.player_fields` to determine display order
3. Show red asterisk `*` next to label if `fieldConfig.required`
4. Show label from `fieldConfig.label`
5. Validation: On "Next", check all required fields are filled

**If multiple children:**
- Show a horizontal tab/pill bar at the top: `[Sofia] [Marcus] [+ New]`
- Switching tabs loads that child's player data
- "Save & Next Child" button instead of "Next" if there are more children to fill out
- After all children have player info, "Next" advances to Step 3

**Styling:**
- Use `colors` from `useTheme()` for all text, backgrounds, borders
- Use `spacing`, `radii`, `shadows` from `@/lib/design-tokens`
- Inputs: `backgroundColor: colors.card`, `borderColor: colors.border`, `borderRadius: radii.card`, `padding: 14`
- Required field indicator: `color: colors.danger`
- Section dividers between field groups

**Commit:**
```bash
git add -A && git commit -m "feat: Registration Phase 3 - dynamic player info form, field renderer, multi-child tabs" && git push origin feat/native-registration
```

---

### PHASE 4: Step 3 + 4 — Parent Info + Emergency/Medical (Shared)
**Goal:** Shared info forms. Pre-filled from returning family or profile. Entered once for all children.

**Step 3 — Parent/Guardian:**
- Render `config.parent_fields` using `FIELD_ORDER.parent_fields`
- Group visually: Parent 1 (name, email, phone) → Parent 2 (if enabled) → Address (if enabled)
- Pre-filled from returning family detection (Phase 2)
- `parent1_email` should default to the logged-in user's email
- All standard TextInput fields

**Step 4 — Emergency & Medical:**
- Render `config.emergency_fields` using `FIELD_ORDER.emergency_fields`
- Then render `config.medical_fields` using `FIELD_ORDER.medical_fields`
- Medical toggle: "Does your child have any medical conditions, allergies, or take medications?" → Yes/No switch
  - If No: Skip medical fields (set all to empty string)
  - If Yes: Show medical fields
- Pre-filled from returning family data

**Custom Questions (at end of Step 4):**
- If `config.custom_questions` has items, render them after medical fields
- Each custom question: `{ question: string, required: boolean }`
- Render as: Label (the question text) + TextInput (multiline)
- Store answers in `customAnswers` object keyed by question index

**All steps use `KeyboardAvoidingView` + `ScrollView` with `keyboardShouldPersistTaps="handled"`**

**Commit:**
```bash
git add -A && git commit -m "feat: Registration Phase 4 - parent info, emergency/medical with toggle, custom questions" && git push origin feat/native-registration
```

---

### PHASE 5: Step 5 — Waivers & Signature
**Goal:** Present waivers from config and capture digital signature.

**Layout:**
- Render each waiver from `config.waivers` where `enabled === true`
- Each waiver card:
  ```
  ┌─────────────────────────────────┐
  │ ☐ Liability Waiver *            │
  │                                 │
  │ I understand and accept the     │
  │ risks associated with...        │
  │ [Read Full Text ▾]              │
  └─────────────────────────────────┘
  ```
- Checkbox toggle per waiver (use a custom checkbox, not Switch)
- Waiver text: Show first ~100 chars, "Read Full Text" expands to show all
- Required waivers marked with `*`

**Signature section:**
- Below waivers
- Label: "By typing your full name below, you agree to the terms above."
- TextInput pre-filled with `sharedInfo.parent1_name`
- Capture timestamp: `const signatureDate = new Date().toISOString()`
- Style the signature input to feel like a signature field: slightly larger font, bottom border instead of full border

**Validation:**
- All required waivers must be checked
- Signature field must not be empty

**Commit:**
```bash
git add -A && git commit -m "feat: Registration Phase 5 - dynamic waivers, digital signature, expandable waiver text" && git push origin feat/native-registration
```

---

### PHASE 6: Step 6 — Review & Submit
**Goal:** Summary of all data → Submit button → Database writes → Success screen.

**Review Layout:**
```
CHILDREN (2)
  Sofia Fuentez — Grade 7, Volleyball
  Marcus Fuentez — Grade 5, Volleyball

PARENT/GUARDIAN
  Carlos Fuentez
  carlos@email.com · (214) 555-1234

EMERGENCY CONTACT
  Maria Fuentez · (214) 555-5678 · Spouse

MEDICAL
  No medical conditions reported

WAIVERS
  ✓ Liability · ✓ Photo Release · ✓ Code of Conduct
  Signed by: Carlos Fuentez

FEES
  Registration Fee:    $150 × 2 = $300
  Uniform Fee:         $35 × 2 = $70
  Monthly Fee (×3):    $50 × 2 × 3 = $300
  ──────────────────────────────────
  Total Due:           $670

[Edit] links on each section → jump to that step
```

**Submit Flow:**

```typescript
async function handleSubmit() {
  setSubmitting(true);
  const createdPlayerIds: string[] = [];
  const createdRegistrationIds: string[] = [];

  try {
    // 1. Get or create family
    let familyId = existingFamilyId;
    if (!familyId) {
      const { data: newFamily } = await supabase.from('families').insert({
        primary_contact_name: sharedInfo.parent1_name,
        primary_contact_email: sharedInfo.parent1_email,
        primary_contact_phone: sharedInfo.parent1_phone,
        primary_email: sharedInfo.parent1_email,
        primary_phone: sharedInfo.parent1_phone,
        secondary_contact_name: sharedInfo.parent2_name || null,
        secondary_contact_email: sharedInfo.parent2_email || null,
        secondary_contact_phone: sharedInfo.parent2_phone || null,
        emergency_contact_name: sharedInfo.emergency_name || null,
        emergency_contact_phone: sharedInfo.emergency_phone || null,
        emergency_contact_relation: sharedInfo.emergency_relation || null,
        address: [sharedInfo.address, sharedInfo.city, sharedInfo.state, sharedInfo.zip].filter(Boolean).join(', ') || null,
        account_id: user.id,
      }).select().single();
      familyId = newFamily?.id;
    } else {
      // Update existing family with latest info
      await supabase.from('families').update({
        primary_contact_name: sharedInfo.parent1_name,
        primary_contact_email: sharedInfo.parent1_email,
        primary_contact_phone: sharedInfo.parent1_phone,
        secondary_contact_name: sharedInfo.parent2_name || null,
        secondary_contact_email: sharedInfo.parent2_email || null,
        secondary_contact_phone: sharedInfo.parent2_phone || null,
        emergency_contact_name: sharedInfo.emergency_name || null,
        emergency_contact_phone: sharedInfo.emergency_phone || null,
        emergency_contact_relation: sharedInfo.emergency_relation || null,
        address: [sharedInfo.address, sharedInfo.city, sharedInfo.state, sharedInfo.zip].filter(Boolean).join(', ') || null,
        updated_at: new Date().toISOString(),
      }).eq('id', familyId);
    }

    // 2. For each child, create player + registration + player_parents
    for (const child of allChildren) {
      const gradeValue = child.grade ? (child.grade === 'K' ? 0 : parseInt(child.grade)) : null;

      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          first_name: child.first_name,
          last_name: child.last_name,
          birth_date: child.birth_date || null,
          grade: gradeValue,
          gender: child.gender || null,
          school: child.school || null,
          position: child.position_preference || null,
          experience_level: child.experience_level || null,
          experience_details: child.previous_teams || null,
          uniform_size_jersey: child.jersey_size || child.shirt_size || null,
          uniform_size_shorts: child.shorts_size || null,
          jersey_pref_1: child.preferred_number ? parseInt(child.preferred_number) : null,
          parent_name: sharedInfo.parent1_name || null,
          parent_email: sharedInfo.parent1_email || null,
          parent_phone: sharedInfo.parent1_phone || null,
          parent_2_name: sharedInfo.parent2_name || null,
          parent_2_email: sharedInfo.parent2_email || null,
          parent_2_phone: sharedInfo.parent2_phone || null,
          emergency_contact_name: sharedInfo.emergency_name || null,
          emergency_contact_phone: sharedInfo.emergency_phone || null,
          emergency_contact_relation: sharedInfo.emergency_relation || null,
          medical_conditions: sharedInfo.medical_conditions || null,
          allergies: sharedInfo.allergies || null,
          medications: sharedInfo.medications || null,
          address: sharedInfo.address || null,
          city: sharedInfo.city || null,
          state: sharedInfo.state || null,
          zip: sharedInfo.zip || null,
          waiver_liability: waiverState.liability || false,
          waiver_photo: waiverState.photo_release || false,
          waiver_conduct: waiverState.code_of_conduct || false,
          waiver_signed_by: signature || null,
          waiver_signed_date: signatureDate || null,
          family_id: familyId || null,
          season_id: seasonId,
          sport_id: season.sport_id || null,
          status: 'new',
          registration_source: 'mobile',
          registration_date: new Date().toISOString(),
          returning_player: child._isReturning || false,
          prefilled_from_player_id: child._returningPlayerId || null,
          parent_account_id: user.id,
        }).select().single();

      if (playerError) {
        if (playerError.code === '23505') {
          throw new Error(`${child.first_name} ${child.last_name} may already be registered.`);
        }
        throw new Error(`Failed to register ${child.first_name}: ${playerError.message}`);
      }
      createdPlayerIds.push(player.id);

      // Create registration record
      const { data: registration, error: regError } = await supabase
        .from('registrations')
        .insert({
          player_id: player.id,
          season_id: seasonId,
          family_id: familyId || null,
          status: 'new',
          submitted_at: new Date().toISOString(),
          registration_source: 'mobile',
          waivers_accepted: waiverState,
          custom_answers: Object.keys(customAnswers).length > 0 ? customAnswers : null,
          signature_name: signature || null,
          signature_date: signatureDate || null,
          registration_data: {
            player: child,
            shared: sharedInfo,
            waivers: waiverState,
            custom_questions: customAnswers,
            signature: { name: signature, date: signatureDate },
            source: 'mobile_app',
            app_version: '1.0.0',
            submitted_by_user_id: user.id,
          },
        }).select().single();

      if (regError && regError.code !== '23505') {
        throw new Error(`Failed to create registration for ${child.first_name}`);
      }
      if (registration) createdRegistrationIds.push(registration.id);

      // Link player to parent
      await supabase.from('player_parents').upsert({
        player_id: player.id,
        parent_id: profile.id,
        relationship: 'parent',
        is_primary: true,
        can_pickup: true,
        receives_notifications: true,
      }, { onConflict: 'player_id,parent_id' });
    }

    // Success!
    setSubmitted(true);
  } catch (error: any) {
    // ROLLBACK
    if (createdRegistrationIds.length > 0) {
      await supabase.from('registrations').delete().in('id', createdRegistrationIds);
    }
    if (createdPlayerIds.length > 0) {
      await supabase.from('players').delete().in('id', createdPlayerIds);
    }
    Alert.alert('Registration Failed', error.message || 'Please try again.');
  } finally {
    setSubmitting(false);
  }
}
```

**Success Screen:**
```
┌─────────────────────────────────────┐
│                                     │
│         🐱 [Lynx Mascot]           │
│                                     │
│    Registration Submitted! 🎉      │
│                                     │
│    2 children registered for        │
│    Spring 2026 Volleyball           │
│    at Black Hornets                 │
│                                     │
│    The admin will review your       │
│    registration shortly.            │
│                                     │
│    [ View My Registrations ]        │
│    [ Back to Home ]                 │
│                                     │
│    ─────────────────────────────    │
│    Powered by 🐱 Lynx              │
│    thelynxapp.com                   │
└─────────────────────────────────────┘
```

- Use `assets/images/lynx-mascot.png` for the mascot image
- "View My Registrations" → `router.replace('/parent-registration-hub')`
- "Back to Home" → `router.replace('/(tabs)')`

**Commit:**
```bash
git add -A && git commit -m "feat: Registration Phase 6 - review summary, submit with rollback, success screen with mascot" && git push origin feat/native-registration
```

---

### PHASE 7: Wire Up Navigation + Parent Hub Integration
**Goal:** Connect the form to the parent experience so it's accessible from everywhere.

**Tasks:**

1. **`app/parent-registration-hub.tsx`** — Change the open season card `onPress` from:
   ```typescript
   // OLD: Goes to auth onboarding (WRONG)
   onPress={() => router.push(`/(auth)/parent-register?seasonId=${season.id}` as any)}
   ```
   To:
   ```typescript
   // NEW: Goes to native registration form
   onPress={() => router.push(`/register/${season.id}` as any)}
   ```

2. **`components/ParentDashboard.tsx`** — Update the empty state "Register a Child" button:
   ```typescript
   // OLD
   onPress={() => router.push('/(auth)/parent-register')}
   // NEW — Navigate to parent-registration-hub which shows open seasons
   onPress={() => router.push('/parent-registration-hub' as any)}
   ```

3. **`components/RegistrationBanner.tsx`** — Already navigates to `/parent-registration-hub` ✓ (no change needed)

4. **`components/ReenrollmentBanner.tsx`** — Update to navigate to the registration form with pre-selected children. When a parent taps "Re-enroll", navigate to `/register/${seasonId}?reenroll=true`. The registration form (Phase 2) will detect this and auto-select returning children.

5. **GestureDrawer.tsx** — Verify "Registration Hub" shortcut in the Parent section correctly routes to `/parent-registration-hub`. If it routes elsewhere, fix it.

6. **Verify expo-router** — The dynamic route `app/register/[seasonId].tsx` should automatically work with expo-router. No additional config needed. Test that the route resolves.

**Commit:**
```bash
git add -A && git commit -m "feat: Registration Phase 7 - navigation wiring, parent hub integration, reenrollment links" && git push origin feat/native-registration
```

---

### PHASE 8: Admin Hub Enrichment (P2 + P3)
**Goal:** Show full registration_data in admin hub + sibling grouping.

**File:** `app/registration-hub.tsx` (admin)

**Tasks:**

1. **Detail modal enrichment** — When admin taps a registration to view details, show:
   - **Registration source badge:** "📱 Mobile" or "🌐 Web" based on `registration.registration_source`
   - **Custom answers:** If `registration.custom_answers` has data, render each Q&A pair
   - **Waiver details:** Show which waivers were accepted from `registration.waivers_accepted` with checkmarks
   - **Signature:** Show `registration.signature_name` + formatted `registration.signature_date`
   - **Full medical info:** Pull from `registration.registration_data.shared` if available (may have more detail than player columns)
   - All of this in a collapsible "Registration Details" section below the existing player info

2. **Sibling grouping** — In the registration list:
   - Group registrations with the same `family_id` together
   - Show a "👨‍👧‍👦 Family" badge and family name (from `families.primary_contact_name`)
   - Visual grouping: Slightly indent sibling entries or show them in a shared card with a vertical accent line on the left
   - Show count: "2 siblings" next to the family badge

3. **Registration data is already fetched** in the existing query — just need to add `registration_data, custom_answers, waivers_accepted, signature_name, signature_date` to the select if not already there.

**Commit:**
```bash
git add -A && git commit -m "feat: Registration Phase 8 - admin hub enrichment, full registration data, sibling grouping" && git push origin feat/native-registration
```

---

### PHASE 9: Account Creation Bridge (P4)
**Goal:** When a parent registers via web and doesn't have an account, make it easy to create one.

This phase creates a simple "claim your account" flow in the mobile app.

**New file:** `app/claim-account.tsx`

**How it works:**
1. Parent registers via web form → `registrations.registration_data.shared.parent1_email` stores their email
2. Parent downloads the app → creates account with THAT email
3. On first login, the app checks: "Are there registrations or players with this email that aren't linked to an account?"
4. If found: Show a "We found your family!" screen that links the existing player/registration records to the new account

**Tasks:**

1. **`app/claim-account.tsx`** — New screen shown after first login when orphan records are detected:
   ```
   ┌─────────────────────────────────────┐
   │  We found your family! 🐱           │
   │                                     │
   │  It looks like you previously       │
   │  registered these children:         │
   │                                     │
   │  ✓ Sofia Fuentez — Spring 2026     │
   │  ✓ Marcus Fuentez — Spring 2026    │
   │                                     │
   │  [ Link to My Account ]             │
   │  [ This isn't me ]                  │
   └─────────────────────────────────────┘
   ```

2. **Detection query** (run after login, in `lib/auth.tsx` or `app/_layout.tsx`):
   ```typescript
   const { data: orphanPlayers } = await supabase
     .from('players')
     .select('id, first_name, last_name, season_id, family_id')
     .eq('parent_email', user.email)
     .is('parent_account_id', null)
     .limit(10);
   ```

3. **Link action:** When parent confirms, update:
   - `players.parent_account_id = user.id` for each matched player
   - `families.account_id = user.id` for matched family
   - Create `player_parents` links for each player
   - Navigate to the parent dashboard (family is now connected)

4. **`lib/auth.tsx` integration** — After successful login/signup, check for orphan records. If found, set a flag that `app/_layout.tsx` can use to redirect to the claim screen before showing the main app.

**Commit:**
```bash
git add -A && git commit -m "feat: Registration Phase 9 - account claiming, orphan record detection, family linking" && git push origin feat/native-registration
```

---

### PHASE 10: Testing & Stability
**Goal:** End-to-end verification.

**Tasks:**

1. **`npx tsc --noEmit`** — Fix all TypeScript errors

2. **Test: New parent, first registration:**
   - Create new account → go to Registration Hub → see open season → tap Register
   - Add 1 child → fill player info → parent info (pre-filled from profile) → emergency → waivers → review → submit
   - Verify: player created, registration created (status: 'new'), family created, player_parents linked
   - Switch to admin account → verify registration appears in admin Registration Hub
   - Approve → assign team → verify payments + RSVPs auto-created

3. **Test: Multi-child registration:**
   - Same flow but add 2 children
   - Verify both get separate player + registration records
   - Same family_id on both
   - Fees calculated correctly (2x)

4. **Test: Returning family:**
   - Register once (test above)
   - Start new registration for different season
   - Verify: returning children shown with checkboxes, shared info pre-filled
   - Select returning child → verify their data pre-fills, parent just confirms

5. **Test: Config variations:**
   - Season with minimal config → only required fields shown
   - Season with all fields enabled → full form
   - Season with custom questions → questions render and save to custom_answers

6. **Test: Account claiming (P4):**
   - Register via web form with email X
   - Create app account with email X
   - Verify claim screen appears
   - Link account → verify family connected

7. **Test: Admin enrichment (P2/P3):**
   - View a mobile registration in admin hub → verify custom answers, waivers, signature shown
   - View siblings → verify family grouping with badge

8. **Test: Edge cases:**
   - No open seasons → friendly empty state
   - Registration closed → error message
   - Network failure during submit → rollback works
   - Duplicate attempt → graceful error

9. **Verify no VolleyBrain references leaked into new code** — grep for "VolleyBrain" in all new/modified files

**Commit:**
```bash
git add -A && git commit -m "feat: Registration Phase 10 - testing, stability, TypeScript verification" && git push origin feat/native-registration
```

---

## AFTER ALL PHASES

Merge the branch:
```bash
git checkout main
git merge feat/native-registration
git push origin main
```

---

## VISUAL STYLE REFERENCE

All new UI should match existing app patterns:

- **Imports:** `import { spacing, radii, shadows } from '@/lib/design-tokens'`
- **Colors:** `const { colors } = useTheme()`
- **Cards:** `backgroundColor: colors.card`, `borderRadius: radii.card`, `borderWidth: 1`, `borderColor: colors.border`, spread `shadows.card`
- **Inputs:** `backgroundColor: colors.background`, `borderRadius: 12`, `borderWidth: 1`, `borderColor: colors.border`, `paddingHorizontal: 16`, `paddingVertical: 14`, `fontSize: 16`, `color: colors.text`
- **Buttons (primary):** `backgroundColor: colors.primary`, `borderRadius: 12`, `paddingVertical: 16`, `alignItems: 'center'`
- **Button text:** `fontSize: 18`, `fontWeight: 'bold'`, `color: '#000'` (dark text on Sky Blue button)
- **Section headers:** All caps, `fontSize: 11`, `fontWeight: '700'`, `letterSpacing: 1`, `color: colors.textMuted`
- **Safe area:** Use `SafeAreaView` from `react-native-safe-area-context`
- **Scroll views:** Always `showsVerticalScrollIndicator={false}`, include `keyboardShouldPersistTaps="handled"` on form screens
- **Modals/pickers:** Use existing pattern from the app — `Modal` + `FlatList` for select fields, or a simple bottom sheet

## BRANDING REFERENCE

- **Org logo fallback:** If `organization.logo_url` is null, render a circle with the first letter of org name, background = `organization.primary_color || colors.primary`
- **Sport accent:** Use `sport.color_primary` to tint the progress bar. Fallback to `organization.primary_color`. Fallback to `colors.primary`.
- **"Powered by Lynx" footer:** On every step. Small text, `fontSize: 11`, `color: colors.textMuted`. Include tiny lynx icon from `assets/images/lynx-icon.png` (12×12). Text: "Powered by Lynx"
- **Success screen mascot:** `assets/images/lynx-mascot.png`, width ~150px, centered. Below: "Powered by Lynx · thelynxapp.com"

## CRITICAL REMINDERS

1. **SCHEMA_REFERENCE.csv is the source of truth** for all table/column names. Verify before EVERY query.
2. **Do NOT modify `app/(auth)/parent-register.tsx`** — that's the auth onboarding, not season registration.
3. **Do NOT touch font families, sizes, or weights** — Carlos is tuning fonts separately.
4. **All `console.log` statements MUST be wrapped in `if (__DEV__)`**
5. **Use `usePermissions()` not `profile?.role` for role checks**
6. **Run `npx tsc --noEmit` after each phase**
7. **Commit and push after every phase** using the commit messages specified above
8. **The `players` table has duplicate columns** (e.g., `parent_2_name` AND `parent2_name`). Use `parent_2_name` (with underscore) — that's what the web form uses.
9. **Test the form with both light and dark mode** to ensure colors work in both
10. **The form must work when `registration_config` is null** — always fall back to DEFAULT_REGISTRATION_CONFIG
