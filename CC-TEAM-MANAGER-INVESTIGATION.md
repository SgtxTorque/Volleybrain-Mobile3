# CC-TEAM-MANAGER-INVESTIGATION
# Lynx Team Manager Role — Deep Investigation
# Mode: INVESTIGATION ONLY. Do NOT write any code. Do NOT modify any files.
# Report back with findings and a proposed implementation plan.

---

## STANDING RULES

1. **This is a READ-ONLY investigation.** Do not create, modify, or delete any files.
2. **Do not write any code, SQL, migrations, or make any changes.**
3. **Read these files first:** `CC-LYNX-RULES.md`, `AGENTS.md`, `SCHEMA_REFERENCE.csv`, `LYNX-REFERENCE-GUIDE.md`
4. **Branch:** `navigation-cleanup-complete`
5. **Be exhaustive.** The goal is to find EVERY place in the codebase that would need to change to add a 'team_manager' role, so the execution spec can be surgical and safe.

---

## CONTEXT

We are adding a 5th role: Team Manager. This role:
- Handles operations for one team: roster, parent comms, payments, scheduling, availability
- Fills the gap between Coach (sport-focused) and Org Admin (multi-team oversight)
- Most common user: volunteer parent-coach managing 10-12 players
- A user CAN hold both Coach + Team Manager simultaneously
- Team Manager sees the Coach Home scroll with additional operational cards
- Team Manager tab bar: Home | Roster | Schedule | Chat | More
- Team Manager CAN: view/edit roster, view/manage payments, create/edit events, parent comms, attendance, challenges, engagement dashboard, registration
- Team Manager CANNOT: create lineups, enter game stats, start game day

---

## SECTION A: ROLE SYSTEM ARCHITECTURE

Answer every question with exact file paths, line numbers, and code snippets.

### A1. Where are roles defined?

1. What are ALL valid role strings used anywhere in the app? Search the entire codebase for every occurrence of role string literals: 'head_coach', 'assistant_coach', 'league_admin', 'parent', 'player', and any others. List each unique role string found and where it appears.

2. Is there a TypeScript type or enum for roles? (e.g., `type UserRole = '...' | '...'`) Show the full definition and file path.

3. Is there a constants file with role arrays? (e.g., `const COACH_ROLES = [...]`) Show all role-related constants.

4. Does `user_roles.role` have a CHECK constraint in the database? Check migration files for any constraint on this column.

5. Does `profiles.primary_role` have a CHECK constraint? 

6. Does `team_staff.staff_role` have a CHECK constraint? What values are currently valid?

### A2. How is the current user's role determined?

7. Walk the complete code path from app launch to "user sees their role-specific home screen." Show every file involved, every function called, and every conditional that checks role.

8. Is there an AuthContext or UserContext that provides role information? Show the provider and what it exposes.

9. How does `usePlayerHomeData` know it's rendering for a player? How does `useCoachHomeData` (or equivalent) know it's for a coach? What is the role-switching mechanism?

10. Where is the role stored in client state? AsyncStorage? Context? Both?

### A3. How does role switching work?

11. If a user has multiple roles (parent + coach), how do they switch? Show the role selector component and its logic.

12. When the role switches, what changes? Tab bar? Home scroll? Navigation stack? Show the cascade.

13. Where does the selected/active role get stored? How is it persisted between app sessions?

---

## SECTION B: NAVIGATION AND TAB BARS

### B1. Tab bar configuration

14. Where is the tab bar defined for each role? Show the exact file(s) and the conditional logic that determines which tabs appear.

15. Show the COMPLETE tab configuration for each existing role:
    - Player: which tabs, which screens, which icons
    - Coach: which tabs, which screens, which icons
    - Parent: which tabs, which screens, which icons
    - Admin: which tabs, which screens, which icons

16. Is the tab bar defined in Expo Router file structure (app/(tabs)/) or in a custom TabNavigator? Show the architecture.

17. If using Expo Router file-based tabs, how would we add a different tab set for Team Manager? Can the same (tabs) layout conditionally show different tabs based on role?

### B2. Home scroll routing

18. Where is the conditional that determines which home scroll renders? Show the exact code.

19. Does each role have its own tab layout in Expo Router (e.g., `app/(coach-tabs)/`, `app/(parent-tabs)/`) or do they share one `app/(tabs)/` with conditional content?

### B3. Existing screens that Team Manager needs

20. Does a Roster screen already exist? What file? What does it show? Can it be reused for Team Manager?

21. Does a Schedule screen already exist? What file? What does it show? Can it be reused?

22. Does a Payments screen exist that shows team-level payment data (not parent-level)? What file?

23. Does a Registration management screen exist? What file?

---

## SECTION C: RLS POLICIES — COMPLETE AUDIT

### C1. Every policy that checks roles

24. List EVERY RLS policy across ALL tables that references role strings ('head_coach', 'assistant_coach', 'league_admin'). For each, show:
    - Table name
    - Policy name
    - Operation (SELECT/INSERT/UPDATE/DELETE)
    - The exact USING or WITH CHECK clause
    - Whether team_manager should be added (YES/NO with reason)

Format as a table:
```
| Table | Policy | Operation | Role Check | Add team_manager? | Reason |
```

### C2. Policies that should NOT include team_manager

25. Are there any policies where team_manager should explicitly be EXCLUDED? (e.g., lineup-related tables, game stat entry)

---

## SECTION D: FEATURE GUARDS IN CODE

### D1. Every code-level role check

26. Search the ENTIRE codebase (all .ts, .tsx files) for any conditional that checks role strings or role-related booleans. For each occurrence, show:
    - File path and line number
    - The exact conditional code
    - What feature it guards
    - Whether team_manager should pass this guard (YES/NO with reason)

Format as a table:
```
| File | Line | Code | Feature | Add team_manager? | Reason |
```

---

## SECTION E: RISK ASSESSMENT

27. Based on everything you found, what are the HIGHEST RISK changes? (Changes most likely to break something if done incorrectly.)

28. What files are touched by the MOST role-related checks? (These are the riskiest files to modify.)

29. Are there any circular dependencies or cascading effects we should watch for? (e.g., changing the tab bar triggers re-renders that read role from context that reads from AsyncStorage...)

30. Is there any role-checking logic that uses negation? (e.g., `if (role !== 'parent')` which would automatically include team_manager without us adding it.) These are dangerous because they silently include new roles.

---

## SECTION F: PROPOSED IMPLEMENTATION PLAN

Based on everything you found, propose the EXACT changes needed. Organize them by risk level:

### Low Risk (isolated changes, no cascading effects):
List each change with: file, what to change, expected impact.

### Medium Risk (affects navigation or data flow):
List each change with: file, what to change, what could go wrong, mitigation.

### High Risk (touches auth, role detection, or tab routing):
List each change with: file, what to change, what could go wrong, mitigation, suggested testing.

### Migration SQL:
Show the exact SQL needed. List every policy to update.

### Files that need NO changes:
List files you checked that are safe to leave alone. This is important for confidence.

---

## REPORT FORMAT

```
## TEAM MANAGER ROLE — INVESTIGATION REPORT

### A. Role System Architecture
[answers to A1-A3, questions 1-13]

### B. Navigation and Tab Bars
[answers to B1-B3, questions 14-23]

### C. RLS Policies Audit
[table from C1, answer to C2]
Count: X policies need team_manager added, Y policies should exclude it

### D. Feature Guards in Code
[table from D1]
Count: X code locations need updating

### E. Risk Assessment
[answers to 27-30]

### F. Proposed Implementation Plan
[Low/Medium/High risk changes organized]

### SUMMARY
- Total RLS policies to update: [count]
- Total code files to modify: [count]
- Total lines of code to change: [estimated count]
- Highest risk area: [description]
- Recommended execution order: [list]
- Estimated spec phases: [count]

### READY TO PROCEED?
[YES with plan, or NO with blockers]
```

**Do not proceed to writing any code or making any changes. Stop here and report back.**
