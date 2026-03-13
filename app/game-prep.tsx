/**
 * game-prep.tsx — Legacy game prep screen.
 * Consolidated: pre-game prep now lives in game-prep-wizard.tsx.
 * Live game operations live in game-day-command.tsx.
 * This file redirects to the wizard for route compatibility.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function GamePrepRedirect() {
  const { eventId, teamId, startLive } = useLocalSearchParams<{
    eventId?: string;
    teamId?: string;
    startLive?: string;
  }>();

  // If startLive was requested, redirect to game-day-command instead of wizard
  if (startLive) {
    return (
      <Redirect
        href={`/game-day-command?eventId=${startLive}&teamId=${teamId || ''}` as any}
      />
    );
  }

  // Otherwise redirect to the prep wizard
  const params = new URLSearchParams();
  if (eventId) params.set('eventId', eventId);
  if (teamId) params.set('teamId', teamId);
  const qs = params.toString();

  return <Redirect href={`/game-prep-wizard${qs ? `?${qs}` : ''}` as any} />;
}
