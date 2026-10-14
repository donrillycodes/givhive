import { redirect } from "next/navigation";
import { CASH_DONATIONS_ENABLED } from "@/lib/features";
import StripeConnectPanel from "@/components/ngo/StripeConnectPanel";

export default function StripePage() {
  if (!CASH_DONATIONS_ENABLED) redirect("/ngo");
  return <StripeConnectPanel />;
}
