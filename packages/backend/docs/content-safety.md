# Content safety

## Donor controls

Organisation profiles, updates and food needs have Report and Block organisation actions. Reports require a reason and 5–1000 characters of details; one donor can report a target once. The API derives its organisation and saves a content snapshot, so a client cannot substitute another publisher. Reports are private to content moderators. The authenticated endpoint limits reports to 20 per hour per account.

Blocking applies to the organisation as the publisher identity shown in the donor app. There are no donor comments or private chats. A block hides the organisation, food needs and updates across paginated feeds and direct browsing links for that donor. The API enforces the filters, including new pledges. Profile → Blocked organisations lists persisted blocks and permits removal. Existing pledges/history and their operational notifications remain accessible and are not cancelled. Blocking does not suspend the organisation for everyone; the operator can take that action after reviewing a report. Abusive individual staff accounts can be suspended through existing admin user management.

Browsing queries are cleared when an account changes and after blocking. This prevents cached content from reappearing or crossing accounts. Authenticated public responses use private/no-store caching. An unsigned visitor can still see public approved content; blocks are account-specific browsing preferences, not access-control restrictions on otherwise public content.

## Before publication

Food needs created or edited by an active member of an approved organisation publish immediately. They are not sent to the publication review queue. They remain subject to donor reporting, organisation blocks, and admin removal. A safety-hidden food need cannot be made visible again by editing it.

Submitted updates still have moderationStatus=PENDING and cannot appear publicly until approved by a content moderator. Draft updates are not submitted until the author chooses Submit for review. Update edits invalidate approval. The safety migration sets existing updates to PENDING; review old updates before expecting them to reappear.

Admin → Content → Content awaiting publication shows submitted update text and image links. Open and inspect images as well as text before approving. Decisions need review notes and compare the exact updatedAt version, rejecting stale or concurrent reviews. Rejecting an update returns it to draft; its author can edit and resubmit. Public NGO profile text/images trigger the existing NGO application re-review flow on change.

Update filtering uses manual review for initial low volume. Food needs use the approved-organisation publication model selected by the operator, with post-publication safety controls. Assess the remaining App Store filtering requirements during the permissions/privacy and release-readiness audit; reporting and verification alone do not establish App Store compliance.

## Report handling

Admin → Content → Donor safety reports shows oldest open reports first with 25 per page and resolved/dismissed history. Review the saved content and context. Hide content flags an update or safety-hides/closes a food need. For organisation reports it suspends the organisation and requires NGO approval permission in addition to content moderation permission. Existing pledges remain manageable. Resolve records an action taken separately, for example an individual account suspension; Dismiss records why no action was needed. Decisions are transactional and audited, and a concurrent reviewer cannot overwrite them. This does not send email or notifications to any party.

Review the queues daily and respond to concerns promptly. support@givhive.com must be created and monitored before launch. The admin dashboard is the source of truth; there is no automatic email alert for incoming reports in this release.

Reports and blocks cascade away when the reporting donor's account is deleted. Content snapshots and private review details are not exposed to NGOs. General audit logs contain the content reference and moderation action, without reporter details or the report text.

## Deployment and verification

Deploy migrations 20261014020000_safety_reports and 20261014030000_food_needs_publish_immediately and regenerate Prisma before the matching backend/mobile/web release. Do not release the mobile controls against an unmigrated backend. Railway was not modified during implementation.

`npm test --workspace=backend` and the opt-in integration suite cover existing account/NGO rules, actual foreign keys, report idempotency, publisher spoofing, authentication/permissions, block isolation, direct-link filtering, stale publication review, content removal, concurrent report decisions and deletion cascades. Integration tests require TEST_DATABASE_URL pointing to a disposable migrated PostgreSQL database. Firebase/email are mocked.

Before submission, test on iPhone/TestFlight against the online backend: submit a report from each content type, confirm it in the admin queue, hide its content, block from each content screen, refresh/restart/switch accounts, unblock and confirm visibility returns. Check that existing pledges can still be managed. Verify updates stay hidden until approved and after edits, and that new/edited food needs publish immediately for approved organisations while safety removals remain hidden, and test the public support address. No real report or user account was moderated during automated testing.

Reference: https://developer.apple.com/app-store/review/guidelines/#user-generated-content
