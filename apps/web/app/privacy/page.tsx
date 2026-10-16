import { BrandLogo } from "@/components/shared/BrandLogo";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — GivHive",
  description:
    "How GivHive handles account information, food pledges, organisation reviews, and privacy requests.",
};

const LAST_UPDATED =
  "Last updated: October 15, 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#1C1C1C]">
      {/* Top bar */}
      <header className="border-b border-[#E8E8E4] bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight"
            style={{ color: "#1A7A4A" }}
          >
            <BrandLogo width={180} />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-[#6B7280] hover:text-[#1A7A4A] transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <p
          className="text-xs uppercase tracking-[0.12em] font-semibold mb-3"
          style={{ color: "#E8793A" }}
        >
          Legal
        </p>
        <h1
          className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
          style={{ color: "#1A4530" }}
        >
          Privacy Policy
        </h1>
        <p className="text-sm text-[#6B7280] mb-12">{LAST_UPDATED}</p>

        <div className="prose-content space-y-10 text-[15px] leading-[1.75]">
          <section>
            <p>
              GivHive connects food donors with community organisations in Winnipeg,
              Manitoba, Canada. This policy covers our mobile app and website,
              including the organisation and administrator dashboards. Cash donations
              and bank-account onboarding are paused in this release.
            </p>
            <p className="mt-4">
              GivHive is operated by an individual, who handles support and privacy
              enquiries directly. This page explains what information the service
              handles, why it is needed, who receives it, and how to request access, correction, or
              deletion. Please read it before creating an account or making a pledge.
            </p>
          </section>

          <Section title="1. Information you provide">
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong>Accounts:</strong> your name, email address, account role,
                Firebase account identifier, and an optional profile photo and its URL.
                Selected profile photos are resized and uploaded only when you save.
                When you register through our API, your password is passed to Firebase
                Authentication to create your account. We do not store passwords in
                our application database. Sign-in, password resets, and the password
                check before account deletion use Firebase Authentication.
              </li>
              <li>
                <strong>Food pledges:</strong> the recipient organisation, food item,
                quantity, planned drop-off date, notes, status, cancellation reason,
                and relevant dates. If you report content, we store the reason,
                details, content reference and a copy of the reported content for
                authorised moderators, together with their review decision. Reports
                are not shared with the reported organisation. We store organisations
                you block to hide their browsing content. We also store notification records and the
                preferences you save, such as causes and notification choices.
              </li>
              <li>
                <strong>Organisations:</strong> organisation name, description,
                mission, type, category, registration or charity number, website,
                address, email, phone number, primary contact name and title, image
                URLs, food donation arrangements, and team memberships. Administrators
                record verification checks, evidence references, review notes,
                decisions, and a snapshot of the application being reviewed.
              </li>
              <li>
                <strong>Organisation activity:</strong> food needs, updates, photos
                or image links, fulfilment records, invitations, and staff actions.
                Support enquiries contain the information you choose to send us.
              </li>
              <li>
                <strong>Previous cash donations:</strong> if you previously donated,
                records can include the amount, currency, recipient, payment status,
                Stripe references, message, and anonymity choice. Stripe handles
                payment credentials; our database does not store full card numbers
                or bank-account credentials. No new cash donations are accepted in
                this release.
              </li>
            </ul>
            <p>
              Please do not include sensitive information about yourself or other
              people in pledge notes, public posts, or verification evidence unless
              it is necessary for the purpose of that submission.
            </p>
          </Section>

          <Section title="2. Technical information and local storage">
            <p>
              Our service and hosting providers process request information such as
              IP addresses, browser or client details, request times, errors, and
              security events. Audit records may associate account actions with an
              account identifier, IP address, and user agent. We use these records
              to operate the service, investigate failures, and prevent misuse.
            </p>
            <p>
              Firebase and our app use authentication tokens and local browser or
              device storage to support sign-in. You can sign out to end your local
              session. Clearing browser storage can also remove saved sign-in state.
              The mobile app does not request your precise GPS location or access
              your contacts for the current food-pledge workflow.
            </p>
            <p>
              Our home and privacy pages include Vercel Web Analytics to understand
              visits and improve the site. We exclude account and dashboard page
              events and remove query strings and fragments from analytics page URLs. It processes page paths, referrers, visit times,
              approximate region, and browser, operating system, and device type
              information. Vercel describes this as cookie-free analytics using a
              short-lived visitor hash rather than a persistent cross-site identifier.
              See <a className="underline" href="https://vercel.com/docs/analytics/privacy-policy">Vercel&apos;s analytics privacy documentation</a>.
              This website analytics integration is not included in the mobile app.
            </p>
          </Section>

          <Section title="3. How we use information">
            <ul className="list-disc pl-6 space-y-2">
              <li>Create accounts, authenticate users, and apply role and team permissions.</li>
              <li>Review organisations and publish approved profiles and food needs.</li>
              <li>Coordinate food pledges, drop-offs, fulfilment, and service notifications.</li>
              <li>Send account and service emails and respond to support or privacy requests.</li>
              <li>Maintain security, investigate misuse, fix errors, and understand website usage.</li>
              <li>Maintain historical payment records and handle related accounting, refunds, or disputes.</li>
            </ul>
            <p>
              We do not sell personal information or use it for targeted advertising.
              Required account and pledge information is used to provide the features
              you request. You can choose whether to provide optional information.
              If we introduce a new purpose that requires consent, we will request
              that consent separately.
            </p>
          </Section>

          <Section title="4. What others can see">
            <p>
              <strong>Receiving organisations:</strong> when you pledge food, the
              organisation&apos;s authorised team can see your name, relevant contact
              details such as your email, pledge quantities, notes, planned drop-off
              date, and status so they can coordinate and confirm delivery.
            </p>
            <p>
              <strong>Public visitors:</strong> approved organisation profiles show
              their description, mission, registration details where displayed,
              website, location, business contact details, primary contact name and
              title, images, food needs, and published updates. Submit business
              contact details intended for public use. Private verification review
              notes and evidence are restricted to authorised review staff.
            </p>
            <p>
              <strong>Administrators and service providers:</strong> authorised staff
              access information to review applications, support users, and administer
              the service. Providers process information to deliver the functions
              listed below. We may also disclose information when required by law,
              to respond to a valid legal request, or to protect users and the service.
            </p>
          </Section>

          <Section title="5. Providers and processing locations">
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google Firebase:</strong> account authentication and password-reset messages.</li>
              <li><strong>Railway:</strong> backend application and PostgreSQL database hosting.</li>
              <li><strong>Cloudinary:</strong> storage, resizing, and delivery of optional profile photos. Photo URLs can be retrieved by anyone who has the URL.</li>
              <li><strong>Vercel:</strong> website delivery and website analytics.</li>
              <li><strong>Resend:</strong> transactional emails, including pledge and account-deletion notices.</li>
              <li><strong>Stripe:</strong> historical payment processing and related payment records while new payments are paused.</li>
            </ul>
            <p>
              These providers may process information outside Canada, including in
              the United States, depending on the service and hosting configuration.
              Information may be subject to the laws and lawful access requirements
              of those locations. Contact us if you need more information about
              processing arrangements before using the service.
            </p>
          </Section>

          <Section title="6. Keeping and protecting information">
            <p>
              Account and operational records are kept while needed to provide the
              service. We restrict protected account and dashboard functions through
              authentication and role or team checks. No service can guarantee that
              information will never be lost or accessed without authorisation.
            </p>
            <p>
              Historical payment amounts, dates, statuses, and provider references
              may be retained for accounting, refunds, disputes, and legal obligations.
              Security logs and provider backups follow their configured retention
              schedules. Backup copies may remain until those copies expire; they
              are not part of the active account after deletion. Contact us about
              the retention of a particular record or a legal restriction on deletion.
            </p>
          </Section>

          <Section title="7. Deleting your account">
            <p>
              Donors can request deletion in the mobile app under
              <strong> Profile → Settings → Delete account</strong>. You must enter
              your password again and confirm the request. You can also contact us
              about deletion or other privacy requests.
            </p>
            <p>
              Once accepted, deletion removes your GivHive account, personal pledge
              history and notes, saved preferences, notifications, safety reports,
              organisation blocks, and linked account
              audit entries. Outstanding pledges are cancelled and their reserved
              quantities released where the need remains open. Aggregate quantities
              already delivered remain in the organisation&apos;s food need totals.
            </p>
            <p>
              Historical cash donations are unlinked from your profile, marked
              anonymous, and stripped of personal messages and refund-reason text.
              Payment providers may retain their own transaction records. A minimal
              deletion audit event is kept without your account identifier.
            </p>
            <p>
              Profile-photo and Firebase account removal are attempted immediately
              and retried in the background if a provider is unavailable. We temporarily
              retain the photo asset identifier, Firebase identifier and email address
              until that removal succeeds. Cached photo copies may take a short time
              to clear after removal.
              After removal, completion-email delivery is retried only within seven
              days of the original request; the address is cleared when delivery
              succeeds or that retry period has expired. You are signed out when
              your deletion request is accepted.
            </p>
            <p>
              Organisation and administrator accounts require a support review so
              ownership, team responsibilities, and any records that must be retained
              can be addressed. Contact us for that process. Copies previously
              received by an organisation, for example email notifications, may
              remain with that organisation under its own retention practices.
            </p>
          </Section>

          <Section title="8. Your choices and requests">
            <p>
              You can request access to your personal information, ask us to correct
              an error, withdraw consent where applicable, or raise a privacy concern
              using the contact details below. We may need to verify your identity
              before acting. Some records must be retained for legal obligations,
              and withdrawing information needed to provide a feature may prevent us
              from continuing to provide that feature. We will explain applicable
              restrictions and respond within the deadlines required by applicable law.
            </p>
            <p>
              If your concern is not resolved, you can contact the
              <a className="underline" href="https://www.priv.gc.ca/en/report-a-concern/"> Office of the Privacy Commissioner of Canada</a>.
            </p>
          </Section>

          <Section title="9. Changes to this policy">
            <p>
              We will update the revision date when this policy changes. Material
              changes will be explained through the website or an appropriate service
              notice, with any additional consent requested where required.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              For privacy questions, access, correction, or deletion requests, contact GivHive:
            </p>
            <div className="mt-4 p-5 rounded-xl border border-[#D1EBDE] bg-[#F0F9F4]">
              <p className="font-semibold text-[#1A4530]">GivHive</p>
              <p className="mt-1">
                Email: <a href="mailto:support@givhive.com" className="underline text-[#1A7A4A]">support@givhive.com</a>
              </p>
              <p className="mt-1">Winnipeg, Manitoba, Canada</p>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-[#E8E8E4] text-sm text-[#6B7280]">
          <nav aria-label="Information pages" className="flex flex-wrap gap-6 mb-6 text-[#1A7A4A]">
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/support" className="hover:underline">Help & Support</Link>
          </nav>
          <p>
            <strong>GivHive</strong> · Winnipeg, Manitoba, Canada
          </p>
        </div>
      </article>
    </main>
  );
}

// ---------- Helpers ----------
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className="text-2xl font-bold tracking-tight mb-4"
        style={{ color: "#1A4530" }}
      >
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
