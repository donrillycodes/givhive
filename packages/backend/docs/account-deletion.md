# Donor account deletion

The donor-only mobile app offers **Profile → Settings → Delete account**. The user enters their current password, sees what is removed or retained, and confirms the destructive action. Firebase reauthentication happens on the client; the password never reaches the GivHive API. The API requires a Firebase `auth_time` within the preceding five minutes, checks token revocation, and uses the authenticated account identity rather than an ID from the request body.

Organisation and administrator accounts are outside this mobile flow. The backend rejects deletion of those accounts and donors with remaining organisation responsibilities, rather than accidentally deleting an organisation's records or ownership. Their ownership-transfer/deletion flow must be handled separately before offering self-service deletion in the web dashboard.

## What happens

One serializable PostgreSQL transaction locks the donor and their pledges, then:

- Releases quantities reserved by pending/confirmed pledges. Delivered quantities stay counted; closed/expired food needs stay closed. A previously fulfilled need is reopened only when appropriate.
- Deletes the donor's pledge history and notes, preferences, notifications, memberships and invitations addressed to them. Related pledge/payment notifications that could contain their details are also removed.
- Removes donor-linked database audit events. A new minimal deletion event uses an unrelated request ID, without email, Firebase UID, IP address, user agent or profile snapshots.
- Unlinks historical payments from the donor and removes messages/refund notes. Amounts, dates, status and provider references remain. The nullable donor relation allows historical payment processing without recreating a profile.
- Creates a durable cleanup outbox entry, then **hard-deletes the User row**.

After commit, Firebase Admin `deleteUser` removes the sign-in. A successful immediate cleanup returns HTTP 200 with `status: completed`. If Firebase or cleanup storage is unavailable, the API returns HTTP 202 with `status: pending`; the application account is already removed and old tokens cannot access it. The client clears private query data and signs out for either accepted response. Errors and timeouts before acceptance are not presented as successful deletion.

Cleanup retries at backend startup and every five minutes. A missing Firebase user is an idempotent success. After delayed Firebase cleanup, the worker sends a deletion-completion email and removes the outbox entry. The temporary email address is retained only for that cleanup/confirmation; email retries stop seven days after the request once sign-in deletion has succeeded. Firebase cleanup itself continues until it succeeds. Stale Firebase jobs older than 24 hours generate an operator error log with an opaque request ID.

The queue orders by least recent attempt so failed mail does not starve newer cleanup. Mail uses an idempotency key. Running multiple backend replicas can still perform overlapping idempotent cleanup work, so occasional duplicate confirmation delivery remains possible outside the provider's idempotency window.

## Deployment and operations

Apply migration `20261014010000_account_deletion` and regenerate Prisma before deploying the backend/mobile release. The normal backend startup script already runs `prisma migrate deploy`. Keep Firebase Admin deletion permission and Resend credentials working; scheduled retries require a running backend. Monitor stale cleanup errors and queue age.

This flow erases active application records. Existing backups and previously sent emails are not rewritten or recalled. Confirm actual backup/log retention as part of the privacy-policy rollout, and ensure restores do not reinstate previously deleted donor data. No donor file-upload storage is currently implemented; if that is added, extend deletion to those stored objects. Historical payment-provider records remain subject to the provider's retention obligations.

## Verification

- `npm test --workspace=backend` covers recent authentication, identity/role restrictions, erasure decisions, Firebase outages, retries, missing Firebase identities and bounded completion-email retention.
- Set `TEST_DATABASE_URL` to a **disposable, migrated database**, then run `npm run test:integration --workspace=backend`. Firebase and email are mocked. The suite exercises hard deletion, real foreign keys, food quantities, payment unlinking, notifications, transaction rollback and restart recovery. It temporarily installs a failing-delete trigger and must never run against a shared or production database.
- Before submission, use a disposable donor account on an iPhone/TestFlight build to check wrong password, cancellation, accepted deletion, local sign-out, subsequent sign-in failure and delayed confirmation against the online backend. No real account was deleted by the automated tests.

Reference: [Apple account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/).
