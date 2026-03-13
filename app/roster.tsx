// Consolidated into (tabs)/players.tsx — this file exists for route compatibility
// Redirects /roster?teamId=X to /(tabs)/players?teamId=X
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function RosterRedirect() {
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();
  return <Redirect href={teamId ? `/(tabs)/players?teamId=${teamId}` as any : '/(tabs)/players' as any} />;
}
