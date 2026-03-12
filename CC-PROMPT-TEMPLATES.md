# CC-PROMPT-TEMPLATES.md
## Claude Code Prompt Templates

These templates enforce the Claude Code Operating Manual and prevent drift, refactors, and unintended architecture changes.

Use them whenever interacting with Claude Code for development tasks.

---

## 1. Bug Diagnosis Template

Use this when something is broken and you do not yet know the cause.

```
Do not change code.

We are in DIAGNOSIS MODE only.

Bug description:
[describe the bug clearly]

Observed behavior:
[what is happening]

Expected behavior:
[what should happen]

Tasks:
1. Identify the most likely root cause
2. List the exact file(s) involved
3. Explain the smallest possible fix
4. List what files or systems should NOT be touched
5. Describe risks if the diagnosis is incorrect

Rules:
- No code changes
- No refactors
- No speculative fixes

Stop after reporting.
```

---

## 2. Targeted Bug Fix Template

Use this after diagnosis has been confirmed.

```
Implement the smallest fix identified.

Scope:
Modify only these files:
[file list]

Rules:
- Do not refactor unrelated code
- Do not rename routes or components
- Do not redesign systems
- Do not fix adjacent issues

After implementation, stop and report:

1. Files changed
2. Exact logic changed
3. What was deliberately NOT touched
4. Validation results (tsc --noEmit)
5. Manual QA checklist
```

---

## 3. Regression Verification Template

Use this after a fix to ensure nothing else broke.

```
Do not change code.

Verify the previous fix.

Tasks:
1. Confirm the original bug is resolved
2. Verify all call sites remain compatible
3. Confirm tsc --noEmit passes
4. Check whether unrelated files were modified
5. Identify any remaining risks

Stop after reporting.
```

---

## 4. Runtime Safety Audit Template

Use when checking for crash risks or unsafe async behavior.

```
Do not modify code.

Run a runtime safety audit.

Search for these patterns:

1. Supabase queries where { data } is used without checking { error }
2. Async useEffect without cancellation guards
3. useEffect hooks missing dependencies
4. useLocalSearchParams used without null guards
5. Context values accessed without null checks
6. JSON.parse without try/catch
7. await calls without try/catch protection

For each issue report:
- file
- line
- severity (High / Medium / Low)
- explanation
- minimal recommended fix

Return a structured summary including:
- total issues
- high severity count
- most common pattern

Stop after reporting.
```

---

## 5. Targeted Fix Pass Template

Use after an audit to fix only the highest severity items.

```
Implement fixes for HIGH severity items only.

Scope:
[list files identified]

Rules:
- Do not refactor
- Do not redesign systems
- Do not fix medium or low issues
- Limit blast radius to minimum files

Return report with:

1. Files changed
2. Exact logic corrected
3. Validation results
4. Remaining risks
5. Manual QA checklist
```

---

## 6. Phase Execution Template

Use when running structured multi-phase improvements.

```
Execute Phase [X] only.

Phase description:
[describe phase goal]

Rules:
- Modify only files required for this phase
- Do not continue beyond Phase [X]
- Do not refactor unrelated systems
- Do not redesign architecture

After completion report:

1. Files changed
2. Logic modified
3. Systems deliberately not touched
4. Validation results
5. Manual QA checklist

Stop after Phase [X].
```

---

## 7. Architecture Impact Check Template

Use before major changes.

```
Do not change code.

Evaluate the proposed change.

Change proposal:
[describe idea]

Report:

1. Files affected
2. Systems impacted
3. Backward compatibility risk
4. Migration complexity
5. Safer alternative approach

Stop after reporting.
```

---

## 8. Data Flow Inspection Template

Useful when debugging state or database flow problems.

```
Do not change code.

Trace the full data flow for this feature.

Feature:
[feature name]

Report:

1. Entry point
2. Functions involved
3. Supabase queries executed
4. State mutations
5. UI render points
6. Potential failure points

Stop after reporting.
```

---

## 9. Performance Investigation Template

Use when the app feels slow or laggy.

```
Do not modify code.

Investigate potential performance issues.

Focus areas:

1. N+1 database queries
2. Repeated Supabase calls
3. Expensive useEffect loops
4. Excessive re-renders
5. Large AsyncStorage reads

Report:

- file
- performance risk
- severity
- minimal fix suggestion

Stop after reporting.
```

---

## 10. Pre-Release Safety Audit Template

Run before beta or release.

```
Do not modify code.

Run a release safety audit.

Check for:

1. Unhandled promise rejections
2. Missing router param guards
3. Permission guard gaps
4. Infinite loading states
5. Supabase error swallowing
6. Async state updates after unmount
7. Console errors or warnings

Return summary including:

- critical risks
- recommended fixes
- systems requiring manual QA

Stop after reporting.
```

---

## 11. Manual QA Checklist Generator

Use after implementing features.

```
Generate a manual QA checklist for this feature.

Feature:
[describe]

Checklist must include:

1. Happy path test
2. Error case test
3. Edge case test
4. Navigation behavior
5. Regression check

Return 6–10 clear test steps.
```

---

## 12. Safe Refactor Template

Use only when you intentionally want a controlled refactor.

```
Plan a safe refactor.

System:
[describe system]

Report:

1. Files involved
2. Refactor strategy
3. Migration order
4. Backward compatibility plan
5. Testing approach

Do not implement yet.
Stop after reporting.
```

---

## Recommended Workflow

**When debugging:**
```
Diagnosis → Fix → Verification → Manual QA
```

**When stabilizing a system:**
```
Audit → Phase plan → Phase execution → Verification → QA
```
