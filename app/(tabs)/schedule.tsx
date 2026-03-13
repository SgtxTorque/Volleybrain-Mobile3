/**
 * schedule.tsx — Generic schedule screen.
 * Consolidated: parent → parent-schedule, coach/admin → coach-schedule.
 * This file redirects for route compatibility.
 */
import { Redirect } from 'expo-router';
import { usePermissions } from '@/lib/permissions-context';

export default function ScheduleRedirect() {
  const { isParent, isCoach, isAdmin } = usePermissions();

  if (isParent && !isCoach && !isAdmin) {
    return <Redirect href={'/(tabs)/parent-schedule' as any} />;
  }
  return <Redirect href={'/(tabs)/coach-schedule' as any} />;
}
