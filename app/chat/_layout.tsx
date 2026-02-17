import { useTheme } from '@/lib/theme';
import { Stack } from 'expo-router';

export default function ChatLayout() {
  const { colors } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}