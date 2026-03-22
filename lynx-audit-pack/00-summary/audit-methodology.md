# Audit Methodology

## Scope

This audit examined the mobile application codebase only. It did not rely on prior generated audits as source evidence. The goal was to infer real product behavior from:

- route files in `app/`
- navigation calls in `app/`, `components/`, `hooks/`, and `lib/`
- providers and contexts in `lib/`
- Supabase queries in screens, hooks, and service files
- menu composition in `components/GestureDrawer.tsx`
- auth and onboarding orchestration in `app/_layout.tsx`, `lib/auth.tsx`, and `lib/onboarding-router.ts`

## Methods used

1. Built a route inventory from `app/`.
2. Grepped for navigation surfaces:
   - `router.push`
   - `router.replace`
   - `router.back`
   - `href`
   - `navigation.navigate`
3. Grepped for route param usage via `useLocalSearchParams`.
4. Grepped for context and persistence dependencies:
   - `createContext`
   - `AsyncStorage`
5. Grepped for Supabase reads/writes via `.from('table')`.
6. Read key orchestration files directly:
   - `app/_layout.tsx`
   - `app/(tabs)/_layout.tsx`
   - `components/GestureDrawer.tsx`
   - `lib/auth.tsx`
   - `lib/onboarding-router.ts`
   - representative high-risk route files

## Classification rules

- `CONFIRMED`: directly supported by code.
- `PARTIAL`: pattern is present, but impact or complete coverage is not fully provable.
- `UNVERIFIED`: plausible concern, but code does not prove it fully.

## Limits

- No live runtime session was executed.
- No screenshots were captured.
- RLS policies cannot be proven from client code alone; those items are marked `UNVERIFIED` unless a client-side assumption is explicit.
- Some route behavior depends on remote data state in Supabase, which cannot be fully simulated here.
