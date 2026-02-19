import TeamWall from '@/components/TeamWall';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function TeamWallScreen() {
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();
  return <TeamWall teamId={teamId || null} />;
}
