import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="parent-register" />
      <Stack.Screen name="coach-register" />
      <Stack.Screen name="redeem-code" />
      <Stack.Screen name="pending-approval" />
    </Stack>
  );
}