# Permissions And RLS Review

## What can be proven

Client code proves that the app assumes role-sensitive access, but it does not prove that backend RLS is complete.

## Confirmed client-side access assumptions

- `app/_layout.tsx` uses auth state, pending approval, orphan records, and onboarding state to decide entry routes.
- `components/GestureDrawer.tsx` uses role gates to show or hide menu sections.
- `app/(tabs)/_layout.tsx` uses role state to show or hide tab routes.
- Many screens query shared tables directly and assume the current user can read scoped rows.

## Unverified backend protections

The following remain `UNVERIFIED` from client code alone:

- whether a parent can only read their own children
- whether a coach can only read teams they staff
- whether admin-only tables are enforced server-side
- whether notification and payment rows are org-scoped safely

## Practical conclusion

UI gating is definitely present.
Backend authorization may also be present, but it cannot be confirmed from this code-only audit.
