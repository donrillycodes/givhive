import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — GivHive",
  description:
    "How GivHive collects, uses, and protects your personal information. PIPEDA-compliant.",
};

const LAST_UPDATED =
  "Effective date: [Set on publish] · Last updated: [Set on publish]";

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
            GivHive
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
          {/* 1. Introduction */}
          <section>
            <p>
              GivHive (&ldquo;<strong>GivHive</strong>,&rdquo; &ldquo;
              <strong>we</strong>,&rdquo; &ldquo;<strong>us</strong>,&rdquo; or
              &ldquo;<strong>our</strong>&rdquo;) is a donation platform based
              in Winnipeg, Manitoba, Canada. We connect individual donors with
              verified non-governmental organisations (NGOs) so that food,
              supplies, and monetary donations can reach people in need.
            </p>
            <p className="mt-4">
              This Privacy Policy explains what personal information we collect,
              why we collect it, how we use and protect it, and the rights you
              have over your information. We follow Canada&apos;s{" "}
              <strong>
                Personal Information Protection and Electronic Documents Act
                (PIPEDA)
              </strong>{" "}
              and apply its ten principles across everything we do.
            </p>
            <p className="mt-4">
              By using GivHive — including our website at givhive.com, our
              mobile applications, or our other services (together, the &ldquo;
              <strong>Services</strong>&rdquo;) — you agree to the practices
              described in this policy. If you do not agree, please do not use
              the Services.
            </p>
          </section>

          {/* 2. Who we are */}
          <Section title="1. Who we are">
            <p>
              GivHive is operated from Winnipeg, Manitoba, Canada. Our
              designated <strong>Privacy Officer</strong> is responsible for
              compliance with this policy and with PIPEDA, and is your point of
              contact for any privacy questions, access requests, or complaints.
              You can reach the Privacy Officer using the contact details in the
              &ldquo;How to contact us&rdquo; section at the end of this policy.
            </p>
          </Section>

          {/* 3. Information we collect */}
          <Section title="2. Information we collect">
            <p>
              We only collect information that is necessary to operate the
              Services and fulfil our purposes. The information we collect
              depends on how you use GivHive.
            </p>

            <h3
              className="text-lg font-semibold mt-6 mb-2"
              style={{ color: "#1A4530" }}
            >
              If you register as a donor
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your name and email address</li>
              <li>
                Account password (handled by Firebase Authentication — see
                section 4)
              </li>
              <li>
                Donation history (amount, recipient NGO, date, and any optional
                message)
              </li>
              <li>
                Food pledge history (item, quantity, recipient NGO, status)
              </li>
              <li>Whether you chose to donate anonymously</li>
            </ul>

            <h3
              className="text-lg font-semibold mt-6 mb-2"
              style={{ color: "#1A4530" }}
            >
              If you register an NGO
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Organisation name, description, mission, and category</li>
              <li>Canadian Revenue Agency (CRA) charity registration number</li>
              <li>
                Organisation type (registered charity, non-profit, community
                group, etc.)
              </li>
              <li>
                Primary contact information (name, title, organisation email,
                phone, address)
              </li>
              <li>Logo and cover image URLs (if provided)</li>
              <li>
                Posted food needs, donation updates, and team-member records
              </li>
              <li>
                Stripe Connect account identifier (we never see or store your
                bank details — see section 4)
              </li>
            </ul>

            <h3
              className="text-lg font-semibold mt-6 mb-2"
              style={{ color: "#1A4530" }}
            >
              Information collected automatically
            </h3>
            <p>
              When you use the Services, certain information is collected
              automatically:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                Device information (operating system, app version, device model)
              </li>
              <li>Approximate IP address and general geographic region</li>
              <li>Log data (pages visited, actions taken, timestamps)</li>
              <li>
                Push-notification tokens (mobile only, used to send
                transactional notifications)
              </li>
              <li>
                Audit-log entries when sensitive actions are performed (such as
                approving an NGO or processing a donation), recording who did
                what and when
              </li>
            </ul>

            <p className="mt-4">
              We do <strong>not</strong> collect your credit card or bank
              account information. Payment details are entered directly on
              Stripe&apos;s secure payment pages and are never transmitted to or
              stored by GivHive.
            </p>
          </Section>

          {/* 4. Why we collect */}
          <Section title="3. Why we collect your information">
            <p>
              We collect your personal information for these specific purposes:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              <li>
                <strong>To provide the Services</strong> — create and manage
                your account, process donations and food pledges, deliver in-app
                and email notifications, and operate the dashboard you signed up
                for.
              </li>
              <li>
                <strong>To verify NGOs</strong> — confirm that organisations
                using GivHive are legitimate registered charities or recognised
                non-profits, protecting donors from misuse of the platform.
              </li>
              <li>
                <strong>To send transactional emails</strong> — donation
                receipts, pledge confirmations, account verification, NGO
                approval and rejection notices, and team invitations.
              </li>
              <li>
                <strong>To prevent abuse and fraud</strong> — detect suspicious
                activity, investigate misuse, and protect donors, NGOs, and the
                platform.
              </li>
              <li>
                <strong>To meet legal and regulatory obligations</strong> —
                including tax, payment-processing, and donation-reporting
                requirements.
              </li>
              <li>
                <strong>To improve the Services</strong> — understand how
                GivHive is used and identify ways to make it better.
              </li>
            </ul>
            <p className="mt-4">
              We will not use your personal information for any new purpose
              without first obtaining your consent or providing you reasonable
              notice.
            </p>
          </Section>

          {/* 5. Sharing */}
          <Section title="4. How we share your information">
            <p>
              We do <strong>not</strong> sell your personal information. We do
              not rent, trade, or otherwise commercialise your data. We share
              information only in the limited circumstances described below.
            </p>

            <h3
              className="text-lg font-semibold mt-6 mb-2"
              style={{ color: "#1A4530" }}
            >
              Service providers we use
            </h3>
            <p>
              GivHive uses a small number of trusted third-party service
              providers to operate. Each is bound by their own privacy policies
              and security standards, and each accesses only the information
              necessary to perform its function:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              <li>
                <strong>Firebase (Google LLC)</strong> — provides our
                authentication service, file storage, and push-notification
                delivery. Firebase stores your account credentials and
                authentication tokens. Privacy policy:{" "}
                <a
                  href="https://firebase.google.com/support/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                  style={{ color: "#1A7A4A" }}
                >
                  firebase.google.com/support/privacy
                </a>
                .
              </li>
              <li>
                <strong>Stripe, Inc.</strong> — processes all monetary donations
                through Stripe Checkout and Stripe Connect, and handles payouts
                to NGOs. Stripe collects and stores your payment-card details
                and the NGO&apos;s bank information directly; GivHive never sees
                this data. Privacy policy:{" "}
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                  style={{ color: "#1A7A4A" }}
                >
                  stripe.com/privacy
                </a>
                .
              </li>
              <li>
                <strong>Resend, Inc.</strong> — delivers our transactional
                emails (receipts, approval notices, password resets). Receives
                the recipient email address and the email content. Privacy
                policy:{" "}
                <a
                  href="https://resend.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                  style={{ color: "#1A7A4A" }}
                >
                  resend.com/legal/privacy-policy
                </a>
                .
              </li>
              <li>
                <strong>Railway Corp.</strong> — hosts our backend application
                and PostgreSQL database. Privacy policy:{" "}
                <a
                  href="https://railway.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                  style={{ color: "#1A7A4A" }}
                >
                  railway.com/legal/privacy
                </a>
                .
              </li>
              <li>
                <strong>Vercel Inc.</strong> — hosts our web dashboard and
                landing page. Privacy policy:{" "}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                  style={{ color: "#1A7A4A" }}
                >
                  vercel.com/legal/privacy-policy
                </a>
                .
              </li>
            </ul>

            <h3
              className="text-lg font-semibold mt-6 mb-2"
              style={{ color: "#1A4530" }}
            >
              Donations to NGOs
            </h3>
            <p>
              When you donate to an NGO, the receiving NGO will see the donation
              amount and the date, and, if you chose <em>not</em> to donate
              anonymously, your name and any optional message. If you select
              &ldquo;Donate anonymously,&rdquo; the NGO will
              <strong> not</strong> see your name or contact details — only the
              amount and date.
            </p>

            <h3
              className="text-lg font-semibold mt-6 mb-2"
              style={{ color: "#1A4530" }}
            >
              Legal disclosures
            </h3>
            <p>
              We may disclose your information if required to do so by law,
              including in response to a valid court order, subpoena, or other
              lawful request from a government authority; to comply with
              applicable tax or reporting requirements; or to protect the
              rights, property, or safety of GivHive, our users, or the public.
            </p>

            <h3
              className="text-lg font-semibold mt-6 mb-2"
              style={{ color: "#1A4530" }}
            >
              Business transfers
            </h3>
            <p>
              If GivHive is involved in a merger, acquisition, or sale of all or
              part of its assets, personal information may be transferred as
              part of that transaction. We will notify you (by email and a
              notice on the Services) before your information becomes subject to
              a different privacy policy.
            </p>
          </Section>

          {/* 6. Cross border */}
          <Section title="5. Where your information is stored">
            <p>
              GivHive&apos;s servers, databases, and the systems of the service
              providers listed above are primarily located in the{" "}
              <strong>United States</strong>. This means that, while you may be
              located in Canada or elsewhere, your information will be{" "}
              <strong>
                transferred to, stored in, and processed in countries outside of
                Canada
              </strong>
              , including the United States.
            </p>
            <p className="mt-4">
              Foreign service providers may be subject to the laws of the
              country where they operate. While we choose providers with strong
              privacy and security standards, you should be aware that
              information stored outside of Canada may, in certain
              circumstances, be accessed by foreign courts, law enforcement, or
              national- security authorities under the laws of those
              jurisdictions.
            </p>
            <p className="mt-4">
              By using the Services you consent to this cross-border transfer
              and processing of your personal information.
            </p>
          </Section>

          {/* 7. Safeguards */}
          <Section title="6. How we protect your information">
            <p>
              We use technical and organisational safeguards to protect your
              personal information against loss, theft, unauthorised access,
              disclosure, copying, use, or modification. These include:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              <li>Encryption of data in transit using HTTPS / TLS</li>
              <li>
                Secure password handling through Firebase Authentication;
                GivHive never stores or sees plaintext passwords
              </li>
              <li>
                Role-based access controls — every backend request is
                authenticated and permission-checked
              </li>
              <li>
                Payment information handled exclusively by Stripe, a PCI-DSS
                Level 1 certified provider; GivHive systems do not store or
                transmit raw card data
              </li>
              <li>Audit logs of sensitive administrative actions</li>
              <li>Rate limiting and basic abuse-prevention measures</li>
            </ul>
            <p className="mt-4">
              No system is perfectly secure, but we work continuously to
              maintain reasonable and appropriate safeguards.
            </p>
          </Section>

          {/* 8. Retention */}
          <Section title="7. How long we keep your information">
            <p>
              We retain personal information only as long as necessary to fulfil
              the purposes for which it was collected, to comply with our legal
              obligations, to resolve disputes, and to enforce our agreements.
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              <li>
                <strong>Active accounts</strong> — we keep your information for
                as long as your account is active.
              </li>
              <li>
                <strong>Donation and pledge records</strong> — kept for at least
                seven (7) years to meet Canadian tax and record-keeping
                requirements.
              </li>
              <li>
                <strong>Closed or deleted accounts</strong> — most personal data
                is removed within 90 days of account deletion, except where
                retention is required by law (such as donation receipts for tax
                purposes).
              </li>
              <li>
                <strong>Audit logs</strong> — retained for security and
                accountability for up to seven (7) years.
              </li>
              <li>
                <strong>Backups</strong> — encrypted backups may retain deleted
                information for a short period (typically up to 30 days) before
                being overwritten.
              </li>
            </ul>
          </Section>

          {/* 9. Your rights */}
          <Section title="8. Your rights">
            <p>Under PIPEDA, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              <li>
                <strong>Access</strong> your personal information that we hold,
                and request a copy
              </li>
              <li>
                <strong>Correct</strong> personal information that is
                inaccurate, incomplete, or out of date
              </li>
              <li>
                <strong>Withdraw consent</strong> for our continued collection,
                use, or disclosure of your information (subject to legal and
                contractual restrictions)
              </li>
              <li>
                <strong>Delete</strong> your account and request deletion of
                associated personal information, subject to the retention rules
                above
              </li>
              <li>
                <strong>Object</strong> to specific uses of your information,
                such as marketing communications
              </li>
              <li>
                <strong>File a complaint</strong> with our Privacy Officer or
                with the Office of the Privacy Commissioner of Canada
              </li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, contact our Privacy Officer using
              the details at the end of this policy. We will respond to your
              request within <strong>30 days</strong>, as required by PIPEDA. We
              may need to verify your identity before fulfilling a request, and
              certain limited exceptions to access may apply under the Act.
            </p>
          </Section>

          {/* 10. Children */}
          <Section title="9. Children's privacy">
            <p>
              GivHive is not intended for, or directed to, children under the
              age of <strong>16</strong>. We do not knowingly collect personal
              information from children. If you believe a child has provided us
              with personal information, please contact the Privacy Officer and
              we will take appropriate steps to delete that information from our
              systems.
            </p>
          </Section>

          {/* 11. Cookies */}
          <Section title="10. Cookies and similar technologies">
            <p>
              The GivHive web dashboard uses a small number of cookies and
              similar technologies to keep you signed in and to operate the
              Services. Specifically:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              <li>
                <strong>Authentication tokens</strong> — used to identify you
                while you are signed in. These are essential and cannot be
                disabled while using the Services.
              </li>
              <li>
                <strong>Session-state cookies</strong> — used to remember your
                preferences (such as which tab you last viewed).
              </li>
            </ul>
            <p className="mt-4">
              We do not currently use third-party advertising cookies,
              behavioural-tracking cookies, or marketing analytics platforms.
            </p>
            <p className="mt-4">
              You can disable cookies in your browser settings, but doing so may
              prevent you from signing in or using parts of the Services.
            </p>
          </Section>

          {/* 12. Changes */}
          <Section title="11. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time to reflect
              changes in our practices, the Services, or applicable law. When we
              make material changes, we will:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              <li>
                Update the &ldquo;Last updated&rdquo; date at the top of this
                policy
              </li>
              <li>Post a notice on the GivHive website</li>
              <li>
                Where appropriate, send a notice by email to registered users
                with substantive changes
              </li>
            </ul>
            <p className="mt-4">
              Your continued use of the Services after a change indicates your
              acceptance of the updated policy.
            </p>
          </Section>

          {/* 13. Contact */}
          <Section title="12. How to contact us">
            <p>
              If you have any questions, concerns, or requests regarding this
              Privacy Policy or your personal information, please contact our
              Privacy Officer:
            </p>
            <div
              className="mt-4 p-5 rounded-xl border"
              style={{ borderColor: "#D1EBDE", background: "#F0F9F4" }}
            >
              <p className="font-semibold" style={{ color: "#1A4530" }}>
                Privacy Officer, GivHive
              </p>
              <p className="mt-1">
                Email:{" "}
                <a
                  href="mailto:privacy@givhive.com"
                  className="underline hover:no-underline"
                  style={{ color: "#1A7A4A" }}
                >
                  privacy@givhive.com
                </a>
              </p>
              <p className="mt-1">Location: Winnipeg, Manitoba, Canada</p>
            </div>
            <p className="mt-6">
              You also have the right to file a complaint with the{" "}
              <strong>Office of the Privacy Commissioner of Canada</strong>:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Website: priv.gc.ca</li>
              <li>Telephone (toll-free in Canada): 1-800-282-1376</li>
              <li>Mail: 30 Victoria Street, Gatineau, Quebec, K1A 1H3</li>
            </ul>
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-[#E8E8E4] text-sm text-[#6B7280]">
          <p>
            <strong>GivHive</strong> · Winnipeg, Manitoba, Canada · This policy
            is governed by the laws of the Province of Manitoba and the
            applicable laws of Canada.
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
