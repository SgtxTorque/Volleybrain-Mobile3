// Features redistributed to my-kids, family-payments, my-waivers
import { Redirect } from 'expo-router';
export default function ParentMyStuffRedirect() {
  return <Redirect href={'/my-kids' as any} />;
}
