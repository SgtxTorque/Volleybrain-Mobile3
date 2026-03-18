# CC-TEAM-MANAGER-SIGNUP-INVESTIGATION
# Targeted Investigation: Signup and Onboarding Flow for Team Manager
# Mode: INVESTIGATION ONLY. Do NOT write any code.

---

## STANDING RULES

1. **READ-ONLY.** Do not create, modify, or delete any files.
2. **Branch:** `navigation-cleanup-complete`

---

## CONTEXT

We are adding Team Manager as a signup option. A volunteer parent-coach or team operations person should be able to download Lynx, sign up, and select "Team Manager" as their role. We need to understand the full signup-to-first-home-screen flow.

---

## QUESTIONS

### Signup Flow

1. **Show the complete signup screen file** (`app/(auth)/signup.tsx` or equivalent). What role selection UI exists? Is it cards, buttons, a stepper? Show the JSX for the role selection step.

2. **What are the current role options on the signup screen?** List each option with its label, description, and what `role` value it maps to. Show the `roleMap` or equivalent at line 238.

3. **What happens after role selection?** Walk the flow step by step:
   - Step 1: Enter name/email/password?
   - Step 2: Pick role?
   - Step 3: Role-specific onboarding?
   - What order are these steps in?

4. **After signup completes, what database writes happen?** Does it:
   - Create a `profiles` row? With what `primary_role` value?
   - Create a `user_roles` row? With what `role` value?
   - Create any other rows (team_staff, organization, etc.)?

5. **Is there a role-specific onboarding flow after signup?** For example:
   - Coach: "Create a team" or "Join an organization"?
   - Parent: "Enter invite code" or "Find your child's team"?
   - Admin: "Create an organization"?
   Show each role's post-signup flow with file paths.

6. **Is there a `needsOnboarding` flag?** The auth investigation mentioned this. Where is it checked? What determines when onboarding is "complete"?

### Team Manager Onboarding Needs

7. **What would a Team Manager need to do after signup?** The most likely flows:
   - Option A: Enter an invite code from an org admin (join existing org + team)
   - Option B: Create a new team (solo manager, no org)
   - Option C: Get assigned by an admin (admin adds them as team_staff)
   
   Which of these flows already exist for other roles? Can they be reused?

8. **Does the invite code system exist?** Is there a `team_invite_codes` or `organization_invite_codes` table? How does a coach currently join an organization? Show the flow.

9. **Can a Team Manager exist without an organization?** Or must they always be under an org? Check if `user_roles.organization_id` is required.

10. **What about the "connect to team" flow?** Find `app/(tabs)/connect.tsx` or equivalent. How does a new coach connect to their first team? Can TM use the same flow?

### Visual Design

11. **What do the existing signup role cards look like?** Describe or show the styling: card size, colors, icons, descriptions. We need to add a TM card that matches.

12. **Is there a signup illustration or mascot for each role?** Or is it text-only?

---

## REPORT FORMAT

```
## SIGNUP/ONBOARDING INVESTIGATION

### Current Signup Flow:
[Step-by-step with file paths]

### Role Selection UI:
[Description + current options]

### Post-Signup Database Writes:
[What gets created for each role]

### Role-Specific Onboarding:
[Each role's post-signup flow]

### Existing Flows Reusable for TM:
[Which existing onboarding pieces can TM reuse]

### Recommended TM Signup Flow:
[CC's recommendation based on what exists]

### Files That Need Changes:
[List for signup/onboarding only]
```

**Do not proceed to writing any code. Stop here and report back.**
