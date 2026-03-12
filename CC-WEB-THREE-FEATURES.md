# CC-WEB-THREE-FEATURES.md
# Three Features Build — Web Admin
# March 8, 2026

## ⚠️ MANDATORY RULES

1. **Read every file fully** before modifying. Do not skim.
2. **Do NOT refactor, rename, or reorganize** anything not listed.
3. **Do NOT change any working feature.** If it works, don't touch it.
4. **Match existing code style** — same class patterns, same component patterns, same Tailwind usage.
5. **Test your mental model** before writing code: state what you're changing, why, and what the result should be.

---

## FEATURE 1: Billing Day of Month for Monthly Fees

### What exists now
- `src/pages/settings/SeasonsPage.jsx` — season form state has `fee_monthly` and `months_in_season` but NO `billing_day_of_month`
- `src/pages/settings/SeasonFormModal.jsx` — FeesTab renders monthly fee and months inputs but no billing day selector
- `src/lib/fee-calculator.js` line ~170 — hardcodes due date to 1st of month: `new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)`
- The `seasons` table in Supabase needs a `billing_day_of_month` column (integer, default 1)

### What to build

**Step 1: Add column to Supabase (document the SQL, don't run it)**

Create this SQL for Carlos to run:
```sql
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS billing_day_of_month integer DEFAULT 1;
COMMENT ON COLUMN seasons.billing_day_of_month IS 'Day of month (1-28) when monthly fees are due';
```

**Step 2: Add to form state in `src/pages/settings/SeasonsPage.jsx`**

In the default form state (line ~32), add:
```js
billing_day_of_month: 1,
```

In `openNew()` (line ~69), add the same default.

In `openEdit()` (line ~84), load from season:
```js
billing_day_of_month: season.billing_day_of_month || 1,
```

The `handleSave()` function already spreads `...form` into the data object, so the new field will automatically be saved to Supabase.

**Step 3: Add UI in `src/pages/settings/SeasonFormModal.jsx` FeesTab**

After the monthly fee and months_in_season grid (around line 380, after the closing `</div>` of that grid), add:

```jsx
{/* Billing Day */}
{(parseFloat(form.fee_monthly) || 0) > 0 && (
  <div className="mt-3">
    <label className={`block text-sm ${tc.textMuted} mb-2`}>Monthly Due Date (day of month)</label>
    <select
      value={form.billing_day_of_month || 1}
      onChange={e => setForm({...form, billing_day_of_month: parseInt(e.target.value)})}
      className={`w-full ${tc.input} rounded-[14px] px-4 py-3`}
    >
      {Array.from({length: 28}, (_, i) => i + 1).map(d => (
        <option key={d} value={d}>
          {d === 1 ? '1st' : d === 2 ? '2nd' : d === 3 ? '3rd' : `${d}th`} of each month
        </option>
      ))}
    </select>
    <p className={`text-xs ${tc.textMuted} mt-1`}>Fees will be due on this day each month. Capped at 28 to avoid month-length issues.</p>
  </div>
)}
```

Only show this field when monthly fee is greater than 0.

**Step 4: Update fee calculator in `src/lib/fee-calculator.js`**

At line ~170, change:
```js
const dueDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
```
to:
```js
const billingDay = Math.min(season.billing_day_of_month || 1, 28)
const dueDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), billingDay)
```

This reads the billing day from the season record and caps at 28.

---

## FEATURE 2: Three Jersey Preference Fields in Registration

### What exists now
- `src/pages/public/registrationConstants.jsx` — FIELD_ORDER has `preferred_number` (single field)
- `src/pages/public/RegistrationFormSteps.jsx` — `renderField()` dynamically renders fields based on config
- The `players` table already has `jersey_pref_1`, `jersey_pref_2`, `jersey_pref_3` columns
- The field mapping (line ~69) maps `preferred_number` → `preferred_number` (not to jersey_pref columns)
- The Jersey Management page (`src/pages/jerseys/JerseysPage.jsx`) already reads `jersey_pref_1/2/3`
- The Parent Player Profile (`src/pages/parent/PlayerProfilePage.jsx`) already edits `jersey_pref_1/2/3`

### What to build

**Step 1: Update field order in `src/pages/public/registrationConstants.jsx`**

Replace `preferred_number` in the FIELD_ORDER.player_fields array with three fields:
```js
'jersey_pref_1', 'jersey_pref_2', 'jersey_pref_3',
```

So the full array becomes:
```js
player_fields: [
  'first_name', 'last_name', 'birth_date', 'gender', 'grade', 'school',
  'shirt_size', 'jersey_size', 'shorts_size',
  'jersey_pref_1', 'jersey_pref_2', 'jersey_pref_3',
  'position_preference', 'experience_level', 'previous_teams', 'height', 'weight'
],
```

Update the FIELD_TO_DB_MAP (around line ~65) — remove the `preferred_number` mapping and add:
```js
'jersey_pref_1': 'jersey_pref_1',
'jersey_pref_2': 'jersey_pref_2',
'jersey_pref_3': 'jersey_pref_3',
```

**Step 2: Add default field configs in DEFAULT_CONFIG**

Find the DEFAULT_CONFIG object and add inside the `player_fields` section (wherever the other field configs like `first_name`, `grade`, etc. are defined):
```js
jersey_pref_1: { enabled: true, required: false, label: '1st Jersey Preference', type: 'number' },
jersey_pref_2: { enabled: true, required: false, label: '2nd Jersey Preference', type: 'number' },
jersey_pref_3: { enabled: true, required: false, label: '3rd Jersey Preference', type: 'number' },
```

Remove the old `preferred_number` config if it exists.

**Step 3: Add special rendering in `src/pages/public/RegistrationFormSteps.jsx`**

In the `renderField()` function, add a special case for jersey preferences (before the generic input fallback, around line 115):

```jsx
if (key === 'jersey_pref_1' || key === 'jersey_pref_2' || key === 'jersey_pref_3') {
  const prefNum = key === 'jersey_pref_1' ? '1st' : key === 'jersey_pref_2' ? '2nd' : '3rd'
  return (
    <div key={key}>
      <label className={LABEL_CLASSES}>
        {prefNum} Choice {isRequired && <span className="text-red-500">*</span>}
      </label>
      <input
        type="number"
        min="0"
        max="99"
        value={formState[key] || ''}
        onChange={e => setFormState({ ...formState, [key]: e.target.value })}
        onFocus={trackFormStart}
        placeholder={`#`}
        className={INPUT_CLASSES}
      />
    </div>
  )
}
```

**BUT BETTER:** Group all three into one visual row. Add this INSTEAD as a grouped renderer:

```jsx
if (key === 'jersey_pref_1') {
  // Render all 3 prefs as a group
  const pref1Config = fields?.jersey_pref_1
  const pref2Config = fields?.jersey_pref_2
  const pref3Config = fields?.jersey_pref_3
  if (!pref1Config?.enabled) return null
  return (
    <div key="jersey-prefs" className="col-span-2">
      <label className={LABEL_CLASSES}>
        Jersey Number Preferences
      </label>
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'jersey_pref_1', label: '1st Choice' },
          { key: 'jersey_pref_2', label: '2nd Choice' },
          { key: 'jersey_pref_3', label: '3rd Choice' },
        ].map(p => (
          <div key={p.key}>
            <p className="text-xs text-slate-400 mb-1">{p.label}</p>
            <input
              type="number"
              min="0"
              max="99"
              value={formState[p.key] || ''}
              onChange={e => setFormState({ ...formState, [p.key]: e.target.value })}
              onFocus={trackFormStart}
              placeholder="#"
              className={INPUT_CLASSES}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
// Skip jersey_pref_2 and jersey_pref_3 since they're rendered by the group above
if (key === 'jersey_pref_2' || key === 'jersey_pref_3') return null
```

**Step 4: Update registration data save**

Find where registration data is saved to the `players` table after form submission (likely in `src/pages/public/RegistrationScreens.jsx` or the registration save handler). Make sure `jersey_pref_1`, `jersey_pref_2`, `jersey_pref_3` are included in the player insert/update and cast to integers:

```js
jersey_pref_1: parseInt(childData.jersey_pref_1) || null,
jersey_pref_2: parseInt(childData.jersey_pref_2) || null,
jersey_pref_3: parseInt(childData.jersey_pref_3) || null,
```

Search for `preferred_number` in the save logic and replace it with the three fields above. If `preferred_number` was being mapped to a single column, remove that mapping.

---

## FEATURE 3: Email Template Editor

### What exists now
- `src/lib/email-service.js` — queues emails to `email_notifications` table with type, recipient, data
- `supabase/functions/send-payment-reminder/index.ts` — Edge Function with hardcoded HTML templates for: `registration_confirmation`, `registration_approved`, `payment_reminder`, `waitlist`
- `src/pages/settings/OrganizationPage.jsx` — has `email_header_color` and `email_header_logo` fields for basic branding
- NO UI exists for editing email body text, subject lines, or tone
- The `organizations` table has a `settings` JSONB column that could store custom templates

### What to build

**Step 1: Create `src/pages/settings/EmailTemplatesPage.jsx`**

Build a new page that shows all 4 email types as editable cards. Each card has:
- The email type name and description
- An editable **Subject Line** field
- An editable **Email Body** text area (plain text, not rich text — keep it simple)
- A **Preview** toggle to see how it looks
- A **Reset to Default** button

Pre-populate every field with Lynx-toned defaults:

```js
const DEFAULT_TEMPLATES = {
  registration_confirmation: {
    subject: "You're in! Registration received for {player_name}",
    heading: "Registration Received!",
    body: "Thanks for registering {player_name} for {season_name} with {organization_name}! We're pumped to have your family on board.\n\nWe'll review your registration and get back to you soon. In the meantime, if you have any questions, just reply to this email.\n\nSee you on the court! 🏐",
    cta_text: "",
    cta_url: "",
  },
  registration_approved: {
    subject: "Welcome to the team! {player_name} is approved 🎉",
    heading: "You're Approved!",
    body: "Great news — {player_name} has been approved for {season_name}!\n\nHere's what's next:\n• Check your payment balance and get fees squared away\n• Download the Lynx app to stay connected with your team\n• Keep an eye out for schedule updates and announcements\n\nLet's have an amazing season!",
    cta_text: "View Your Dashboard",
    cta_url: "{app_url}",
  },
  payment_reminder: {
    subject: "Friendly reminder: {amount} due for {player_name}",
    heading: "Payment Reminder",
    body: "Hey there! Just a quick heads up that {player_name} has an outstanding balance of {amount} for {season_name}.\n\n{fee_details}\n\nYou can pay via the app or use the payment methods your club has set up. If you've already sent payment, you can ignore this — it may take a day to update.\n\nQuestions? Reach out to your club admin.",
    cta_text: "Pay Now",
    cta_url: "{payment_url}",
  },
  waitlist: {
    subject: "{player_name} is on the waitlist for {season_name}",
    heading: "You're on the Waitlist",
    body: "{player_name} has been added to the waitlist for {season_name}. We'll let you know as soon as a spot opens up.\n\n{waitlist_position}\n\nHang tight — we'll reach out the moment something changes!",
    cta_text: "",
    cta_url: "",
  },
}
```

Available merge variables (show these as a reference on the page):
`{player_name}`, `{season_name}`, `{organization_name}`, `{amount}`, `{fee_details}`, `{app_url}`, `{payment_url}`, `{waitlist_position}`, `{due_date}`

**Step 2: Storage — save to `organizations.settings.email_templates`**

Store the custom templates in the organization's settings JSONB:
```js
const { error } = await supabase
  .from('organizations')
  .update({
    settings: {
      ...organization.settings,
      email_templates: templates
    }
  })
  .eq('id', organization.id)
```

Load on mount:
```js
const saved = organization?.settings?.email_templates || {}
const merged = {}
Object.keys(DEFAULT_TEMPLATES).forEach(key => {
  merged[key] = { ...DEFAULT_TEMPLATES[key], ...saved[key] }
})
```

**Step 3: Add route in `src/MainApp.jsx`**

After the existing settings routes (around line 850), add:
```jsx
<Route path="/settings/email-templates" element={
  <RouteGuard allow={['admin']} activeView={activeView}>
    <EmailTemplatesPage showToast={showToast} />
  </RouteGuard>
} />
```

Import at the top with the other settings pages.

**Step 4: Add to sidebar navigation**

In the `adminNavGroups` array in `src/MainApp.jsx` (around line 1006), in the `setup` section items array, add after `paymentsetup`:
```js
{ id: 'email-templates', label: 'Email Templates', icon: 'mail' },
```

Add the page ID → path mapping in the `getPathForPage` function:
```js
case 'email-templates': return '/settings/email-templates'
```

**Step 5: Update Edge Function to read custom templates**

In `supabase/functions/send-payment-reminder/index.ts`, before rendering the template (around line 261), fetch the org's custom templates:

```ts
// Fetch org settings for custom email templates
let customTemplates: Record<string, any> = {}
if (email.organization_id) {
  const { data: org } = await supabase
    .from('organizations')
    .select('settings, name')
    .eq('id', email.organization_id)
    .single()
  customTemplates = org?.settings?.email_templates || {}
}

// Use custom template if available, fall back to defaults
const customTemplate = customTemplates[email.type]
if (customTemplate) {
  // Replace merge variables in custom body
  let body = customTemplate.body || ''
  let subject = customTemplate.subject || ''
  const replacements: Record<string, string> = {
    '{player_name}': email.data?.player_name || '',
    '{season_name}': email.data?.season_name || '',
    '{organization_name}': email.data?.organization_name || org?.name || '',
    '{amount}': email.data?.amount ? `$${email.data.amount}` : '',
    '{due_date}': email.data?.due_date || '',
    '{waitlist_position}': email.data?.waitlist_position ? `Position: #${email.data.waitlist_position}` : '',
    '{fee_details}': email.data?.fee_details || '',
    '{app_url}': email.data?.app_url || 'https://thelynxapp.com',
    '{payment_url}': email.data?.payment_url || 'https://thelynxapp.com',
  }
  Object.entries(replacements).forEach(([key, val]) => {
    body = body.replaceAll(key, val)
    subject = subject.replaceAll(key, val)
  })
  
  // Wrap in HTML email structure
  const heading = customTemplate.heading || ''
  emailSubject = subject
  emailHtml = buildEmailHtml(heading, body.replace(/\n/g, '<br>'), org)
} else {
  // Fall back to hardcoded templates
  const template = templates[email.type]
  // ... existing logic
}
```

Create a `buildEmailHtml` helper that wraps content in the same HTML structure as the existing templates, using org branding (header color, logo) if available.

**Step 6: Preview component**

In the EmailTemplatesPage, add a preview panel that renders the email with merge variables replaced by sample data:
```js
const SAMPLE_DATA = {
  player_name: 'Ava Rodriguez',
  season_name: 'Spring 2026',
  organization_name: organization?.name || 'Your Club',
  amount: '$150.00',
  due_date: 'April 1, 2026',
  waitlist_position: '#3',
  fee_details: 'Registration Fee: $100\nMonthly (March): $50',
}
```

---

## VERIFICATION CHECKLIST

| # | Check | Status |
|---|-------|--------|
| 1 | Season form shows billing day dropdown when monthly fee > 0 | |
| 2 | Billing day saves to database and loads on edit | |
| 3 | Fee calculator uses billing_day_of_month for due dates | |
| 4 | Registration form shows 3 jersey preference fields in a row | |
| 5 | Jersey prefs save to players table as jersey_pref_1/2/3 | |
| 6 | Jersey Management page still reads prefs correctly | |
| 7 | Email Templates page loads at /settings/email-templates | |
| 8 | All 4 email types show with editable subject/body | |
| 9 | Default templates pre-populate with Lynx tone | |
| 10 | Custom templates save to organization settings | |
| 11 | Reset to Default works for each template | |
| 12 | Preview shows email with sample data | |
| 13 | Sidebar shows "Email Templates" in Setup section | |
| 14 | No existing features broken | |

---

## SQL FOR CARLOS TO RUN

```sql
-- Run this in Supabase SQL Editor before deploying
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS billing_day_of_month integer DEFAULT 1;
COMMENT ON COLUMN seasons.billing_day_of_month IS 'Day of month (1-28) when monthly fees are due';
```

## OUTPUT REQUIRED

1. List of every file modified with one-line description
2. The completed verification checklist
3. The SQL statement above (remind Carlos to run it)
4. Any additional issues discovered (document, don't fix)
