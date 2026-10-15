# Privacy and support release checks

The public website is https://givhive.com and the privacy policy is /privacy.
The owner has selected support@givhive.com for support and privacy enquiries.
This address is configured in the UI but has not yet been provisioned or tested.
Do not treat the contact channel as operational until the following are complete.

Before publishing this policy or submitting the mobile app:

- Create support@givhive.com and verify incoming mail and replies from an external account. The owner also plans emmanuel@givhive.com; it is not a public support contact.
- Configure the mail provider's required MX, SPF, DKIM, and DMARC records. Preserve existing website and transactional-email records; combine SPF senders in one SPF policy per hostname if needed.
- Verify the live public /privacy page loads without authentication and contains the selected contact address.
- On a real iPhone/TestFlight build, open Privacy Policy from sign-in, sign-up, and Profile, return to the app, and check sign-up input is preserved. Test the support link and its no-mail-app fallback.
- Confirm actual backend and provider log/backup retention and hosting locations. Ensure database restores do not reinstate deleted donor information.
- Review provider privacy terms and the App Store privacy disclosures against the final shipped SDKs and services. This policy update alone does not complete those disclosures.
- Complete Terms of Service and a public support page in the next release-preparation step. The previous nonfunctional Terms link was removed from mobile registration until that page exists.

No database migration is introduced by the privacy/support changes. Earlier account-deletion and NGO-review migrations still need deployment. The policy date reflects this source revision, not confirmation of a live deployment.
