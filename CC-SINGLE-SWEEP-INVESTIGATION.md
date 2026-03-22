# CC-SINGLE-SWEEP-INVESTIGATION.md
# LYNX — .single() MEDIUM Priority Sweep (INVESTIGATION ONLY)
# Classification: INVESTIGATION ONLY — Do NOT modify any files.

---

## EXECUTIVE DIRECTIVE

The CRITICAL and HIGH priority `.single()` callsites have been fixed (commit e7825d7). This investigation covers the remaining ~30 MEDIUM priority callsites — SELECT queries using `.single()` that could crash if a row has been deleted, is stale, or doesn't exist.

**You will NOT modify any files. Your only job is to read and produce a surgical plan.**

**Output file:** `SINGLE-SWEEP-INVESTIGATION-REPORT.md`

---

## MANDATORY PRE-READ

- `CC-LYNX-RULES.md`
- `AGENTS.md`
- `LAUNCH-FIX-INVESTIGATION-REPORT.md` (Issue 9 section — to see what was already fixed)

---

## RULES

1. **Do NOT modify any files.** Investigation only.
2. **Do NOT run any commands** that change files.
3. **Copy exact code snippets** — real lines, not paraphrased.
4. **Skip any `.single()` that was already fixed** in the launch blocker execution (commits 4e0c61d and e7825d7). The following callsites are ALREADY FIXED — do not include them:
   - `lib/permissions.ts` line ~20
   - `lib/profile-completeness.ts` lines ~83, ~103
   - `lib/chat-utils.ts` lines ~45, ~389
   - `lib/challenge-service.ts` line ~458
   - `app/chat/[id].tsx` line ~520
   - `components/PlayerCardExpanded.tsx` lines ~132, ~143, ~158
5. **Skip INSERT + .select().single() patterns** — these are safe because the insert creates the row that .single() reads. Only flag them if there is NO error handling (no try/catch, no `if (error)` check).
6. **Organize by file** for easy execution later.

---

## INVESTIGATION TASK

### Step 1: Find all remaining `.single()` callsites

Run a search across the active codebase (exclude `_archive/`, `reference/`, `node_modules/`, `*.md` files):

```
grep -rn "\.single()" lib/ app/ components/ hooks/ --include="*.ts" --include="*.tsx"
```

### Step 2: For each callsite, classify it

For EVERY `.single()` result, classify it as one of:

**A. ALREADY FIXED** — Listed in the skip list above. Note it and move on.

**B. SAFE — INSERT+.select().single() with error handling** — The pattern is:
```typescript
const { data, error } = await supabase.from('table').insert({...}).select().single();
if (error) { /* handled */ }
```
This is safe because the insert creates the row. Note it as SAFE and move on.

**C. SAFE — Inside try/catch with user feedback** — The `.single()` is inside a try/catch that shows an Alert or sets an error state. Note as SAFE.

**D. NEEDS FIX — SELECT .single() that could return zero rows** — This is what we're looking for. For these, provide:

```
### [File path] — line [N]

**Current code:**
[copy exact lines]

**Table:** [table name]
**Filter:** [what it's filtering by]
**Zero rows scenario:** [when/why zero rows could happen]
**Error handling:** [none / try-catch / if-check]
**Downstream impact:** [what breaks if it throws]

**Proposed fix:**
Change `.single()` to `.maybeSingle()`
[copy the fixed line]

**Risk:** [LOW/MEDIUM — what could go wrong]
```

**E. AMBIGUOUS — Not sure if safe** — Flag it for manual review.

### Step 3: Summary table

At the end of the report, provide a summary table:

| # | File | Line | Classification | Action |
|---|------|------|----------------|--------|
| 1 | lib/example.ts | 45 | NEEDS FIX | .maybeSingle() |
| 2 | app/screen.tsx | 120 | SAFE (insert) | None |
| ... | ... | ... | ... | ... |

### Step 4: Execution plan

Group all NEEDS FIX callsites by file. For each file, list every line that needs changing. This will be used to write the guardrailed execution spec.

---

## COMMIT PROTOCOL

Write the report to `SINGLE-SWEEP-INVESTIGATION-REPORT.md` and commit with message: `investigation: .single() MEDIUM sweep surgical plan`

Do NOT modify any other file.
