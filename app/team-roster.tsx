// Consolidated into (tabs)/players.tsx — this file exists for route compatibility
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function TeamRosterRedirect() {
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();
  return <Redirect href={teamId ? `/(tabs)/players?teamId=${teamId}` as any : '/(tabs)/players' as any} />;
}
