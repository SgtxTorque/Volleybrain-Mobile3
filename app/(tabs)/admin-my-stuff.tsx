// Features redistributed to manage tab, season-settings, org-settings
import { Redirect } from 'expo-router';
export default function AdminMyStuffRedirect() {
  return <Redirect href={'/(tabs)/manage' as any} />;
}
