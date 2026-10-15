import { Alert, Linking } from "react-native";
import { openBrowserAsync } from "expo-web-browser";

// Public page: reachable before registration and without a signed-in session.
export const SUPPORT_EMAIL = "support@givhive.com";

export const PRIVACY_POLICY_URL = "https://givhive.com/privacy";

let openingPrivacyPolicy = false;

export async function openPrivacyPolicy(): Promise<void> {
  if (openingPrivacyPolicy) return;
  openingPrivacyPolicy = true;
  try {
    await openBrowserAsync(PRIVACY_POLICY_URL);
  } catch {
    Alert.alert(
      "Could not open the privacy policy",
      `Please try again, or visit ${PRIVACY_POLICY_URL} in your browser.`,
    );
  } finally {
    openingPrivacyPolicy = false;
  }
}

export async function openSupportEmail(): Promise<void> {
  try {
    await Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  } catch {
    Alert.alert(
      "Email support",
      `Please email ${SUPPORT_EMAIL} from your preferred email app.`,
    );
  }
}
