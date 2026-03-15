// Features redistributed to coach-profile, players screen
import { Redirect } from 'expo-router';
export default function CoachMyStuffRedirect() {
  return <Redirect href={'/coach-profile' as any} />;
}
