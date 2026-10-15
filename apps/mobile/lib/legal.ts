import { Alert, Linking } from "react-native";
import { openBrowserAsync } from "expo-web-browser";

// Public page: reachable before registration and without a signed-in session.
export const SUPPORT_EMAIL = "support@givhive.com";

export const PRIVACY_POLICY_URL = "https://givhive.com/privacy";

export const TERMS_URL = "https://givhive.com/terms";
export const SUPPORT_URL = "https://givhive.com/support";

let openingInformationPage = false;

async function openInformationPage(url: string, title: string): Promise<void> {
  if (openingInformationPage) return;
  openingInformationPage = true;
  try {
    await openBrowserAsync(url);
  } catch {
    Alert.alert(
      `Could not open ${title}`,
      `Please try again, or visit ${url} in your browser.`,
    );
  } finally {
    openingInformationPage = false;
  }
}

export const openPrivacyPolicy = () => openInformationPage(PRIVACY_POLICY_URL, "the privacy policy");
export const openTerms = () => openInformationPage(TERMS_URL, "the terms of service");
export const openSupportPage = () => openInformationPage(SUPPORT_URL, "support");

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
