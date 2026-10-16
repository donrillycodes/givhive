# Profile editing and Cloudinary photos

Donors edit their first/last names and optionally choose, replace, or remove a
profile photo under Account → Edit profile. Email remains read-only. The API
rejects email changes and takes the user ID from the authenticated session.

## Setup

Create a free Cloudinary Image and Video API account. In the Cloudinary Console,
open the product environment's API Keys page. Add these variables to the Railway
**backend service**, then deploy the code:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

For local backend development put the same variables in the ignored backend
`.env` file. Never use `EXPO_PUBLIC_` or `NEXT_PUBLIC_` for the secret. No unsigned
upload preset is needed. Cloudinary settings and credentials are not returned
to the mobile app. Missing credentials leave name editing available; photo
changes return an availability message.

Deploy the website privacy disclosure with the feature. Migration
`20261015000000_profile_photo_cleanup` adds a nullable asset identifier to the
existing deletion queue. Railway's normal start script applies it. Users'
photo URLs use the existing `User.avatarUrl` field.

## Data flow

The system photo picker lets the user crop a photo. Expo Image Manipulator
resizes it to 512 pixels and re-encodes it as a JPEG. Nothing uploads until
Save changes is tapped. The authenticated backend accepts only bounded JPEG
data (1 MB maximum), performs a signed Cloudinary upload using server-controlled
transformations, and saves the provider's HTTPS URL. It does not accept remote
URLs, asset IDs, or upload signatures from the client.

Each account uses one asset ID derived from a hash of its Firebase ID. Replacing
a photo overwrites that asset and invalidates cached copies rather than growing
an unlimited gallery. There is a per-account limit of ten photo changes per hour.
The stored URLs are publicly retrievable; photo URLs can be displayed to the
account holder and authorised organisations handling their pledges.

Photo changes acquire the same database row lock as account deletion. A failed
upload does not save name or URL changes. If storage succeeds but a database
commit fails, retry the save; the fixed asset ID prevents duplicate stored assets.
An existing photo may already have been replaced or removed in storage in that
case. The initials fallback covers unavailable images.

Account deletion queues the derived asset ID before removing the user row.
Cloudinary deletion and CDN invalidation are retried by the existing deletion
worker; provider failures do not discard cleanup work. CDN invalidation can take
a few seconds or minutes to propagate. Name-only profiles work without Cloudinary.

## Validation before release

- Run backend unit and integration tests against a disposable migrated database.
- Run mobile TypeScript, Expo dependency checks, and an iOS production JS export.
- With configured credentials, use a test account to save a photo, relaunch,
  replace it, remove it, and verify email is unchanged.
- Delete a disposable test account and verify its Cloudinary asset is removed.
- Make a new native build after adding the image-manipulator native dependency.

Unit/provider and database tests use mocked Cloudinary/Firebase calls. They do
not prove that the live Cloudinary account is configured correctly.
