# CODEX UX RISK REGISTER

## P0

### Wrong Child / Wrong Team Context

- Symptom: a valid screen can show the wrong child set or wrong team set
- Root cause: mixed linkage models and context sources
- UX impact: severe trust damage

### Route Opens But Task Cannot Complete

- Symptom: destination route is reachable without required params or upstream context
- Examples:
  - `/attendance`
  - `/game-recap`
  - `/lineup-builder`
  - `/team-wall`

## P1

### Cross-Role Stale Context

- Symptom: shell changes faster than downstream team/season selection
- Impact: wrong data after `viewAs`

### Duplicate Task Surfaces

- Symptom: same business task has multiple screens with overlapping responsibilities
- Impact: inconsistent user expectations and inconsistent admin workflows

### Admin User List Mental Model Break

- Symptom: user list can include profiles beyond current org role context
- Impact: admin confusion and mistrust

### Placeholder Features Presented As Real

- Symptom: drawer advertises web-only tools inside mobile navigation
- Impact: tester confidence drop

## P2

### Empty But Not Truly Empty

- Symptom: “No Teams Yet” or similar empty states may represent missing context or linkage drift, not a true empty product state

### High Navigation Indirection

- Symptom: same destination is reachable from many cards and hubs with different param quality

### Back-Only Recovery

- Symptom: many detail flows rely solely on `router.back()`

## P3

### Discoverability Fragmentation

- Symptom: drawer, hidden tabs, home cards, and role-specific hubs all compete as navigation systems
