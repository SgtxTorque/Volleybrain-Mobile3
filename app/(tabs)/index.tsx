import DashboardRouter from '@/components/DashboardRouter';
import FirstTimeTour from '@/components/FirstTimeTour';
import { useTheme } from '@/lib/theme';
import { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { colors } = useTheme();
  const handleTourDismiss = useCallback(() => {}, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <DashboardRouter />
      <FirstTimeTour onDismiss={handleTourDismiss} />
    </SafeAreaView>
  );
}