import DashboardRouter from '@/components/DashboardRouter';
import { useTheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { colors } = useTheme();
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <DashboardRouter />
    </SafeAreaView>
  );
}