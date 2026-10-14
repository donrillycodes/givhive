import { Redirect } from "expo-router";
import { CASH_DONATIONS_ENABLED } from "../../lib/features";
import DonationScreen from "../../features/donations/DonationScreen";

export default function DonationRoute() {
  if (!CASH_DONATIONS_ENABLED) return <Redirect href="/(tabs)/discover" />;
  return <DonationScreen />;
}
