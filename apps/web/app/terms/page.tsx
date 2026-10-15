import type { Metadata } from "next";
import Link from "next/link";
import { PublicInfoPage, InfoSection } from "@/components/shared/PublicInfoPage";

export const metadata: Metadata = {
  title: "Terms of Service — GivHive",
  description: "Terms for GivHive accounts, food pledges, organisation profiles, and community content.",
};

export default function TermsPage() {
  return (
    <PublicInfoPage title="Terms of Service">
      <p className="text-sm text-[#6B7280]">Last updated: October 14, 2026</p>
      <p>
        These terms cover the GivHive mobile app and givhive.com, including the
        organisation and administrator dashboards. GivHive is operated by an
        individual based in Winnipeg, Manitoba, Canada. By creating an account
        or using the service, you agree to these terms. Contact the operator at
        <a href="mailto:support@givhive.com" className="underline"> support@givhive.com</a> with questions.
      </p>
      <InfoSection title="1. What GivHive provides">
        <p>
          GivHive helps donors find food needs published by reviewed community
          organisations and coordinate food pledges. Organisations receive and
          distribute the donations. GivHive does not itself collect, store,
          transport, inspect, or distribute the food through this service.
        </p>
        <p>
          Cash donations and bank-account onboarding are paused in this release.
          Do not use pledge notes or posts to solicit card details, bank credentials,
          or payments. Food pledges do not automatically produce charitable tax receipts.
        </p>
      </InfoSection>
      <InfoSection title="2. Accounts and representatives">
        <p>
          Provide accurate information, keep your sign-in details private, and
          contact us if you suspect unauthorised access. You must be legally able
          to agree to these terms. Organisation representatives must have authority
          to act for the organisation and invite team members.
        </p>
        <p>
          Organisation applications require review before publication. A review
          checks submitted information and supporting evidence; approval is not
          government certification, a guarantee of charitable registration, or a
          guarantee of an organisation&apos;s conduct. Organisations must keep their
          identity, public business contact details, and food receiving arrangements
          accurate. Changes may require another review.
        </p>
      </InfoSection>
      <InfoSection title="3. Making and receiving food pledges">
        <p>
          Pledge only items and quantities you can reasonably provide. Follow the
          recipient&apos;s item requirements, receiving hours, and drop-off instructions.
          Coordinate changes with the organisation and update or cancel the pledge
          through the app where available. A pledge records an intention to donate;
          it does not guarantee that delivery or acceptance will occur.
        </p>
        <p>
          Donors are responsible for accurately describing their food and handling
          and transporting it safely. Organisations are responsible for communicating
          acceptance requirements, checking donations, and safely storing and
          distributing what they accept. Both must follow applicable food safety
          requirements. Do not donate food you know or suspect is unsafe. The
          recipient may refuse unsuitable items.
        </p>
      </InfoSection>
      <InfoSection title="4. Community rules and content">
        <p>
          Do not post or send fraudulent, threatening, hateful, sexually explicit,
          exploitative, discriminatory, or harassing content. Impersonation, spam,
          scams, unsafe donation requests, unauthorised disclosure of personal
          information, and attempts to bypass security or misuse accounts are prohibited.
        </p>
        <p>
          Only submit text, images, and other content that you are entitled to
          share, including permission from people whose personal information or
          identifiable images you submit. You retain ownership of your content.
          You give GivHive permission to host, display, and process it as needed
          to operate the features you use and moderate the service, subject to
          the Privacy Policy and any records that must be retained by law.
        </p>
        <p>
          Report concerning content or conduct using the instructions on our
          <Link href="/support" className="underline"> support page</Link>.
          We may review reports, remove content, restrict access, or suspend
          accounts that violate these terms. Contact support if you believe a
          moderation decision was made in error. Do not submit passwords or
          unnecessary personal information in a report.
        </p>
      </InfoSection>
      <InfoSection title="5. Privacy and communication">
        <p>
          Our <Link href="/privacy" className="underline">Privacy Policy</Link> explains
          information collection, sharing, retention, and deletion. When you pledge,
          the receiving organisation can access the information needed to coordinate
          it, including your name, contact details, and pledge notes. Approved
          organisation profiles and their public contact details are visible to visitors.
        </p>
        <p>
          We use your contact information for account, pledge, support, and other
          service communications as described in that policy. These terms do not
          replace any separate consent required for a new use of personal information.
        </p>
      </InfoSection>
      <InfoSection title="6. Availability and responsibility">
        <p>
          We aim to keep GivHive useful and accurate, but service interruptions,
          errors, missed notifications, and outdated listings can occur. Confirm
          time-sensitive delivery arrangements directly with the recipient.
          Organisations are responsible for their own statements and operations.
          GivHive does not guarantee donation availability, acceptance, or outcomes.
        </p>
        <p>
          To the extent permitted by applicable law, the service is provided as
          available without additional warranties. Nothing in these terms excludes
          or limits rights, remedies, warranties, or responsibilities that cannot
          legally be excluded or limited.
        </p>
      </InfoSection>
      <InfoSection title="7. Ending use and deleting an account">
        <p>
          You may stop using the service at any time. Donors can request account
          deletion in the app under Profile → Settings → Delete account. Organisation
          and administrator accounts require support review to address ownership
          and team responsibilities. See the Privacy Policy for what is removed,
          what is retained, and how provider cleanup is handled.
        </p>
        <p>
          We may restrict access to address misuse, security concerns, legal
          obligations, or violations of these terms. Contact support about a
          restriction or to arrange outstanding organisation responsibilities.
        </p>
      </InfoSection>
      <InfoSection title="8. Changes and questions">
        <p>
          We may update these terms as the service changes. We will revise the date
          above and provide an appropriate notice for material changes, requesting
          renewed agreement where required. Changes will not remove rights that
          applicable law gives you. These terms are subject to applicable Canadian
          and Manitoba law, including any mandatory protections that apply where you live.
        </p>
        <p>
          For questions, complaints, or assistance, email
          <a href="mailto:support@givhive.com" className="underline"> support@givhive.com</a>.
        </p>
      </InfoSection>
    </PublicInfoPage>
  );
}
