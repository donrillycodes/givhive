# Reviewing an NGO application

GivHive's review confirms organisation identity, representative authority, and food receiving arrangements. It is a manual review, not a guarantee of food safety or approval by Apple, Stripe, or a government registry.

1. In **NGO Applications**, expand the pending application. Check the legal name, organisation type, contact person, address and receiving arrangements.
2. Independently find an official source. For a Canadian registered charity, check its full CRA number, legal name and current status in the [CRA charity listing](https://www.canada.ca/en/revenue-agency/services/charities-giving/charities/information-about-a-charity.html). For other incorporated nonprofits, check the relevant registry. For informal community groups, confirm their activities through an established partner or independent public source. Record the source and what matched. An applicant's screenshot or copied registration number alone is insufficient.
3. Find the organisation's phone or email independently, rather than relying solely on the application. Contact it and confirm the applicant is authorised to manage its GivHive profile. Record who confirmed this, how the contact details were sourced, and the date contacted. An organisation email domain can help, but small groups using personal email can still be reviewed.
4. Confirm the receiving address, hours, food accepted, storage arrangements and responsible contact. Put the outcome in the private review notes. Ask the applicant to correct incomplete application details before approval.
5. Tick all three checks, record sources, contact method/date and notes, then choose **Approve with review**. If details do not match, reject with a clear explanation the applicant can act on. Do not approve an application you submitted yourself.

Each approval saves a private review record with the reviewer, time, evidence and an application snapshot in one database transaction. Only admins with NGO approval permission can retrieve these records. Public listings and the NGO's own dashboard do not include private review evidence.

If an approved organisation changes identity, contact details or food receiving arrangements, it returns to pending review and is hidden from public NGO listings. Previous reviews remain available to admins. Description and branding edits alone do not reset approval. Suspended organisations remain suspended when edited.

If the application changes while being reviewed, reload and review the latest version before approving. Refreshed applications clear unsaved review checks.

## Deployment and testing

Apply the versioned Prisma migrations before running the new backend:

```sh
cd packages/backend
npx prisma migrate deploy
npx prisma generate
npm run build
```

The existing backend start script already runs `prisma migrate deploy`. Do not use `db push` as a substitute for the versioned migration in production. Deploy the backend and updated dashboard together because approval requests now require evidence and the application's current `updatedAt` value.

Run `npm test --workspace=backend` for the isolated validation and service tests. The tests use database and email doubles and do not access live accounts or send messages. Before rollout, exercise registration, rejection/resubmission, approval, and an identity change with a test organisation against the migrated test environment.

For the database integration test, set `TEST_DATABASE_URL` explicitly to a disposable, migrated PostgreSQL database and run `npm run test:integration --workspace=backend`. It creates and removes test users, an application and evidence, and temporarily installs a failing insert trigger to verify approval rollback. Never run it against a shared or production database.
