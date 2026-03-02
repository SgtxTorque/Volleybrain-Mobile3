# Quick Fix: Login Screen Keyboard Avoidance

**File:** `app/(auth)/login.tsx`

**Problem:** The login screen has `KeyboardAvoidingView` but the inner content is in a plain `View` with `justifyContent: 'center'` and no scrolling. When the keyboard opens, the password field gets pushed off screen and requires manual scrolling.

**Fix:** Wrap the content inside a `ScrollView` so the form scrolls naturally when the keyboard appears. This is a SURGICAL fix — do not change any styles, layout, functionality, or other files.

**Steps:**

1. `ScrollView` is already imported (verify — if not, add it to the react-native import)

2. In the return JSX, change the `<View style={s.content}>` wrapper to a `ScrollView`:

```tsx
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={s.container}
>
  <ScrollView
    contentContainerStyle={s.content}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
    bounces={false}
  >
    {/* Logo */}
    ...existing logo and form JSX stays exactly the same...
  </ScrollView>

  {/* Forgot Password Modal stays OUTSIDE the ScrollView */}
  <Modal ...>
    ...
  </Modal>
</KeyboardAvoidingView>
```

3. That's it. No other changes. Run `npx tsc --noEmit` to verify.

**Commit:**
```bash
git add .
git commit -m "fix: Login screen keyboard avoidance - wrap form in ScrollView"
git push origin main
```
