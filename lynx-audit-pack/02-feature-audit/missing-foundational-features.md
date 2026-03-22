# Missing Foundational Features

This file records foundational product capabilities that are not clearly centralized in the current code, not proposed solutions.

## Confirmed absences or weakly expressed foundations

### Canonical route guard layer

There is no single visible route guard system covering every root screen. Access is split across:

- root auth redirect logic
- tab `href` gating
- drawer role gates
- per-screen data assumptions

Classification: `CONFIRMED`

### Canonical team and player context contract

Screens obtain team/player context from route params, context, local state, AsyncStorage, or query inference. A single contract is not evident.

Classification: `CONFIRMED`

### Unified notification product model

Two different inbox implementations and notification type vocabularies are present.

Classification: `CONFIRMED`

### Unified error/loading contract

Many screens handle loading and empty states locally with inconsistent copy and recovery affordances.

Classification: `CONFIRMED`

### Proven backend authorization map

Client code does not prove a clear RLS matrix for who can read/write each domain table.

Classification: `UNVERIFIED`
