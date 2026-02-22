# VolleyBrain Design Reference

This folder contains the design system and reference components for the VolleyBrain mobile app UI refactor.

## ⚠️ DO NOT MODIFY THESE FILES
These are **read-only reference files**. They are NOT part of the app's runtime code. They exist solely as a design guide for refactoring the mobile app's UI.

## 📁 Contents

### `DESIGN-SYSTEM.md`
**Read this FIRST.** Contains:
- Complete color palette with exact hex codes
- Typography scale (font sizes, weights, letter-spacing)
- Shadow values (iOS + Android)
- Spacing and border-radius tokens
- 9 shared component specifications (Card, Badge, SectionHeader, PillTabs, BottomNav, Avatar, StatBox, MatchCard, TopBar)
- Screen-by-screen refactoring plan with safety rules
- Refactoring sequence for each individual screen

### `v0-globals.css`
The CSS custom properties from the winning v0 design. Contains all color variables, dark mode variants, and theme tokens. Use these values as the source of truth for colors.

### `v0-components/`
Reference component implementations from the v0 prototype. These are **React/Next.js (web)** components using Tailwind CSS. They must be **translated to React Native** (View, Text, StyleSheet, ScrollView, TouchableOpacity, etc.) — do NOT copy-paste them directly.

| File | What it shows |
|------|--------------|
| `pill-tabs.tsx` | Tab selector with pill container + active fill |
| `bottom-nav.tsx` | Bottom navigation bar with active indicators |
| `match-card.tsx` | Match/game card with team vs team layout |
| `section-header.tsx` | Section title + action link pattern |
| `parent-dashboard.tsx` | Full parent home screen layout (the primary reference) |
| `team-wall.tsx` | Social feed with post cards, reactions, match results |
| `full-schedule.tsx` | Calendar/schedule view with event type badges |

## 🎯 How to use this folder

1. Read `DESIGN-SYSTEM.md` for the complete refactoring plan and component specs
2. Reference `v0-globals.css` for exact color values
3. Look at `v0-components/` files to understand layout patterns and visual hierarchy
4. Translate everything to React Native equivalents
5. Follow the phased refactoring plan in DESIGN-SYSTEM.md
