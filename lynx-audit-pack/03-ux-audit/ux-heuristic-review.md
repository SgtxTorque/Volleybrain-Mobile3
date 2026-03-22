# UX Heuristic Review

## Overall assessment

The app presents as feature-rich and role-aware, but consistency is weaker than breadth. The strongest heuristic issues are navigation predictability, context continuity, and state explainability.

## Heuristic observations

### Visibility of system status

- Loading indicators are common.
- Empty-state handling exists in many screens.
- However, users are not always told whether missing content is due to:
  - no data
  - wrong role
  - missing params
  - missing team/season selection

Classification: `CONFIRMED`

### Match between system and task

- Parent, coach, and player roles broadly map to real tasks.
- Team manager role is less cohesive and sometimes borrows coach/admin workflows.

Classification: `CONFIRMED`

### User control and recovery

- Many screens rely on `router.back()` as the only recovery affordance.
- This is acceptable for linear flows, but weak for deep-linked or notification-launched screens.

Classification: `CONFIRMED`

### Consistency

- Notification products are inconsistent.
- Team management is inconsistent.
- Child/team context acquisition is inconsistent.

Classification: `CONFIRMED`

### Error prevention

- Several routes expect params but can also be reached generically.
- This creates avoidable wrong-state risk.

Classification: `CONFIRMED`
