import type { Metadata } from "next";
import Link from "next/link";
import { PublicInfoPage, InfoSection } from "@/components/shared/PublicInfoPage";

export const metadata: Metadata = {
  title: "Help & Support — GivHive",
  description: "Get help with GivHive accounts, food pledges, organisation applications, privacy, or concerning content.",
};

export default function SupportPage() {
  return (
    <PublicInfoPage title="Help & Support">
      <p>
        Questions about GivHive? The app&apos;s operator handles support directly.
        Email us about account access, food pledges, organisation applications,
        technical problems, privacy requests, or concerning content.
      </p>
      <a href="mailto:support@givhive.com" className="inline-block rounded-xl bg-[#1A7A4A] px-6 py-3 font-semibold text-white hover:bg-[#1A4530]">
        Email support@givhive.com
      </a>
      <p className="text-sm text-[#6B7280]">
        If the button does not open an email app, copy support@givhive.com into
        your preferred email service. Include a short description and the account
        email or pledge reference where relevant. Never send your password, card
        details, or unnecessary personal information.
      </p>
      <InfoSection title="I cannot sign in">
        <p>
          On the mobile sign-in screen, enter your account email and tap Forgot
          Password. Follow the reset link and check your spam folder if it does
          not arrive. If you still cannot sign in, email support with your account
          email and the error message. We will never ask for your password.
        </p>
        <p>
          The mobile app is for donors. Organisation and administrator accounts
          use the <Link href="/login" className="underline text-[#1A7A4A]">web dashboard</Link>.
        </p>
      </InfoSection>
      <InfoSection title="I need to change or cancel a food pledge">
        <p>
          Open Activity in the app and select the pledge. Use the available status
          or cancellation actions. For changed drop-off times, item requirements,
          or acceptance questions, contact the receiving organisation using its
          published profile details. If a pledge is stuck or an action fails,
          contact support with the pledge reference.
        </p>
      </InfoSection>
      <InfoSection title="My organisation application is awaiting review">
        <p>
          Sign in to the dashboard to check the application and any feedback.
          Make sure the organisation identity, representative details, and food
          receiving arrangements are complete. Email support with the organisation
          name and account email if you need help. Approval follows a manual review;
          it is not automatic.
        </p>
      </InfoSection>
      <InfoSection title="Report content, an organisation, or abusive behaviour">
        <p>
          In the mobile app, open an organisation profile, update, or food need
          and choose Report. Select a reason, describe your concern, and send it
          privately to GivHive. You can also choose Block organisation to hide its
          browsing content. Manage blocks from Profile → Blocked organisations.
          Existing pledges stay in Activity so you can manage them.
        </p>
        <p>
          You can also email support with the subject “Content or safety report”. Include the
          organisation or post name, a link or reference if available, what happened,
          and when. Share only the information needed to investigate. You can also
          report suspected fraud, impersonation, harassment, or an unsafe donation
          request. The operator reviews reports and can remove content or restrict
          accounts under the <Link href="/terms" className="underline text-[#1A7A4A]">Terms of Service</Link>.
        </p>
      </InfoSection>
      <InfoSection title="Delete an account or make a privacy request">
        <p>
          Donors can request deletion in the app under Profile → Settings → Delete
          account, with a password check and final confirmation. If you cannot access
          your account, email support. Organisation and administrator accounts need
          support review to address ownership and team responsibilities first.
        </p>
        <p>
          You can also request access to or correction of your information. We may
          need to verify your identity before acting. Our
          <Link href="/privacy" className="underline text-[#1A7A4A]"> Privacy Policy</Link> explains
          deletion, retention, and your choices.
        </p>
      </InfoSection>
      <InfoSection title="Cash donations">
        <p>
          New cash donations and bank-account onboarding are paused. The current
          release supports food pledges. For a question about a previous payment,
          email support with its reference and date; do not send card or bank credentials.
        </p>
      </InfoSection>
    </PublicInfoPage>
  );
}
