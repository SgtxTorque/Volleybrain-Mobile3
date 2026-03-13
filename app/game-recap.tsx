/**
 * game-recap.tsx — Consolidated into game-results.tsx as the "Recap" tab.
 * This file redirects for route compatibility.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function GameRecapRedirect() {
  const { eventId, playerId } = useLocalSearchParams<{ eventId?: string; playerId?: string }>();

  const params = new URLSearchParams();
  if (eventId) params.set('eventId', eventId);
  if (playerId) params.set('playerId', playerId);
  params.set('view', 'recap');
  const qs = params.toString();

  return <Redirect href={`/game-results${qs ? `?${qs}` : ''}` as any} />;
}
